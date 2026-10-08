---
applyTo: '**'
---

## Project Context

- Purpose: GitHub Profile README automation — auto-refreshes featured/recent repositories weekly via GitHub Actions.
- Runtime: Node.js 20+ (uses `--experimental-strip-types` for TypeScript)
- Package manager: pnpm
- CI/CD: GitHub Actions (`profile-refresh.yml` weekly cron Monday 03:15 UTC, `snake-animation.yml` daily cron 04:00 UTC, both support manual dispatch)

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
- Fixed featured repos (`sideby`, `adonis-skills`, `hermes-kit`, `adonis-pi`, `gemini-chrome-autoinstall`) and blocked repos are excluded from recent selection.
- Outputs top N repos to `data/profile.projects.json` and injects markdown into `README.md` between `<!-- RECENT_REPOS:START/END -->` markers (the "More Projects" section).
- Falls back to `FALLBACK_REPOS` or placeholder entries if GitHub API is unreachable.
- Also refreshes `<!-- PROFILE_STATS:START/END -->` (published skill count from `SKILL_REPOS` + public commits in the last 30 days via the commit search API) and `<!-- LATEST_TIL:START/END -->` (newest posts by frontmatter `date`, read from `TIL_REPO`'s `docs.json` navigation).
- Also refreshes `<!-- SHIPPED_THIS_WEEK:START/END -->` (latest public commits from the last 7 days, dropping `chore(sync)`, `chore(profile)`, merges and blocked repos) and `<!-- SKILL_OF_WEEK:START/END -->` (one skill from `SKILL_OF_WEEK_REPO`, rotated by week number since the Unix epoch).
- If any of these fetches fails, that block keeps its previous content.
- The animated terminal at the top of `README.md` is a static file, `assets/terminal.svg` (SMIL animation, no scripts).

### 2. Snake Animation Pipeline

`GitHub Actions (weekly cron)` → `Platane/snk` → `output` branch → `github-snake.svg` + `github-snake-dark.svg`

- Generates contribution graph snake animation SVGs (light + dark mode).
- Uses `Platane/snk/svg-only@v3` action to render SVGs from GitHub contribution data.
- Pushes output to the `output` branch via `crazy-max/ghaction-github-pages@v4`.
- README references SVGs from `raw.githubusercontent.com/.../output/` with `<picture>` for theme switching.
- Runs every day at 04:00 UTC. It pushes only to the `output` branch, so it adds no commits to `main`.

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
| `FIXED_FEATURED_REPOS` | `Adonis0123/sideby,Adonis0123/adonis-skills,Adonis0123/hermes-kit,Adonis0123/adonis-pi,Adonis0123/gemini-chrome-autoinstall` | Repos excluded from recent (already featured) |
| `SKILL_REPOS` | `Adonis0123/adonis-skills,Adonis0123/hermes-kit` | Repos whose `skills/<name>/SKILL.md` files are counted in the stats line |
| `TIL_REPO` | `Adonis0123/til-garden` | Mintlify repo used for the Latest TIL block |
| `TIL_SITE_URL` | `https://adonis-til.mintlify.app` | Base URL for TIL post links |
| `LATEST_TIL_COUNT` | `3` | Number of TIL posts to display |
| `SHIPPED_COUNT` | `5` | Number of commits in Shipped This Week |
| `SKILL_OF_WEEK_REPO` | `Adonis0123/adonis-skills` | Repo whose `skills/<name>/SKILL.md` entries rotate in Skill of the Week |
| `BLOCKED_REPOS` | `Adonis0123/Adonis0123` | Repos always excluded |
| `FALLBACK_REPOS` | (empty) | Comma-separated fallback repos when API fails |
