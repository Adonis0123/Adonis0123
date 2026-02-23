---
applyTo: '**'
---

## Project Context

- Purpose: GitHub Profile README automation — auto-refreshes featured/recent repositories weekly via GitHub Actions.
- Runtime: Node.js 20+ (uses `--experimental-strip-types` for TypeScript)
- Package manager: pnpm
- CI/CD: GitHub Actions (`profile-refresh.yml` weekly cron Monday 03:15 UTC, `snake-animation.yml` weekly cron Monday 04:00 UTC, both support manual dispatch)

## Key Directories

- `scripts/` — Automation scripts (`select-recent-repos.mjs`, `sync-llm-skills.ts`)
- `data/` — Generated JSON data (`profile.projects.json`)
- `.agents/skills/` — Source of truth for AI skills (synced to `.claude/skills/`)
- `.github/workflows/` — GitHub Actions workflow definitions
- `.ruler/` — Ruler rule templates (generates root `AGENTS.md` and `CLAUDE.md`)

## Architecture: Two Automation Pipelines

### 1. Profile Refresh Pipeline

`GitHub Actions (weekly cron)` → `select-recent-repos.mjs` → `GitHub API` → `data/profile.projects.json` + `README.md`

- Script fetches public repos via GitHub API, sorted by `pushed_at`.
- Quality filter: excludes forks, archived, disabled, repos matching demo/tutorial/sandbox pattern, and repos without a README.
- Fixed featured repos (`adonis-kit`, `adonis-skills`) and blocked repos are excluded from recent selection.
- Outputs top N repos to `data/profile.projects.json` and injects markdown into `README.md` between `<!-- RECENT_REPOS:START/END -->` markers.
- Falls back to `FALLBACK_REPOS` or placeholder entries if GitHub API is unreachable.

### 2. Snake Animation Pipeline

`GitHub Actions (weekly cron)` → `Platane/snk` → `output` branch → `github-snake.svg` + `github-snake-dark.svg`

- Generates contribution graph snake animation SVGs (light + dark mode).
- Uses `Platane/snk/svg-only@v3` action to render SVGs from GitHub contribution data.
- Pushes output to the `output` branch via `crazy-max/ghaction-github-pages@v4`.
- README references SVGs from `raw.githubusercontent.com/.../output/` with `<picture>` for theme switching.
- Runs every Monday at 04:00 UTC (45 minutes after profile-refresh).

### 3. Skill Sync Pipeline

`.agents/skills/` → `sync-llm-skills.ts` → `.claude/skills/` (atomic swap)

- `.agents/skills/` is the source of truth for AI skills (checked into git).
- `sync-llm-skills.ts` performs an atomic directory swap: copies to temp → renames old → renames temp → cleans up backup.
- `.claude/skills/` is gitignored (derived output).
- Runs automatically via `postinstall` hook (skipped in CI via `is-ci`).

## Environment Variables (`select-recent-repos.mjs`)

| Variable | Default | Description |
|---|---|---|
| `GITHUB_TOKEN` | (empty) | GitHub API token for authenticated requests |
| `PROFILE_USERNAME` | `Adonis0123` | GitHub username to fetch repos for |
| `RECENT_REPO_COUNT` | `3` | Number of recent repos to display |
| `FIXED_FEATURED_REPOS` | `Adonis0123/adonis-kit,Adonis0123/adonis-skills` | Repos excluded from recent (already featured) |
| `BLOCKED_REPOS` | `Adonis0123/Adonis0123` | Repos always excluded |
| `FALLBACK_REPOS` | (empty) | Comma-separated fallback repos when API fails |
