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
- `assets/badges/` — Generated badge SVGs for the featured repos (written by `select-recent-repos.mjs`)
- `assets/cards/` — Generated GitHub stats and top-languages card SVGs (written by the workflow)
- `.agents/skills/` — Source of truth for AI skills (synced to `.claude/skills/`)
- `.github/workflows/` — GitHub Actions workflow definitions
- `.ruler/` — Ruler rule templates (generates root `AGENTS.md` and `CLAUDE.md`)

## Architecture: Two Automation Pipelines

### 1. Profile Refresh Pipeline

`GitHub Actions (weekly cron)` → `select-recent-repos.mjs` → `GitHub API` → `data/profile.projects.json` + `README.md` + `assets/badges/*.svg`; then `github-readme-stats-action` → `assets/cards/*.svg`

- Script fetches public repos via GitHub API, sorted by `pushed_at`.
- Quality filter: excludes forks, archived, disabled, repos matching demo/tutorial/sandbox pattern, and repos without a README.
- Fixed featured repos (`sideby`, `agent-env`, `adonis-skills`, `hermes-kit`, `adonis-pi`, `gemini-chrome-autoinstall`) and blocked repos are excluded from recent selection.
- Outputs top N repos to `data/profile.projects.json` and injects markdown into `README.md` between `<!-- RECENT_REPOS:START/END -->` markers (the "More Projects" section).
- Falls back to `FALLBACK_REPOS` or placeholder entries if GitHub API is unreachable.
- Also refreshes `<!-- PROFILE_STATS:START/END -->` (published skill count from `SKILL_REPOS` + public commits in the last 30 days via the commit search API) and `<!-- LATEST_RELEASES:START/END -->` (the latest published release of each fixed featured repo, newest first; repos without a release are skipped).
- Also refreshes `<!-- SHIPPED_THIS_WEEK:START/END -->` (latest public commits from the last 7 days, dropping `chore(sync)`, `chore(profile)`, merges and blocked repos) and `<!-- SKILL_OF_WEEK:START/END -->` (one skill from `SKILL_OF_WEEK_REPO`, rotated by week number since the Unix epoch).
- If any of these fetches fails, that block keeps its previous content.
- Also writes badge SVGs with `badge-maker` into `assets/badges/`: `<repo>-stars.svg` and `<repo>-last-commit.svg` (default-branch commit date as `YYYY-MM-DD`) for every featured repo, `<repo>-release.svg` for `RELEASE_BADGE_REPOS`, and `<package>-npm.svg` for `NPM_BADGE_PACKAGES` (npm registry, fetched without the GitHub token). Each badge loads on its own; a failed fetch keeps that badge's previous SVG.
- The workflow then runs `stats-organization/github-readme-stats-action@v2.1.0` twice to write `assets/cards/stats.svg` and `assets/cards/top-langs.svg`, with `fail_on_error` + `continue-on-error` so a failed card keeps the committed one.
- README references badges and cards by relative path, so GitHub serves them directly instead of through its ~4s camo image proxy, which dynamic shields.io badges and the Vercel-hosted stats cards often missed.
- The commit step stages `README.md`, `data/profile.projects.json` and `assets/`, and commits only when something is staged.

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
| `FIXED_FEATURED_REPOS` | `Adonis0123/sideby,Adonis0123/agent-env,Adonis0123/adonis-skills,Adonis0123/hermes-kit,Adonis0123/adonis-pi,Adonis0123/gemini-chrome-autoinstall` | Repos excluded from recent (already featured) |
| `SKILL_REPOS` | `Adonis0123/adonis-skills,Adonis0123/hermes-kit` | Repos whose `skills/<name>/SKILL.md` files are counted in the stats line |
| `LATEST_RELEASES_COUNT` | `5` | Number of releases in Latest Releases |
| `SHIPPED_COUNT` | `5` | Number of commits in Shipped This Week |
| `SKILL_OF_WEEK_REPO` | `Adonis0123/adonis-skills` | Repo whose `skills/<name>/SKILL.md` entries rotate in Skill of the Week |
| `BLOCKED_REPOS` | `Adonis0123/Adonis0123` | Repos always excluded |
| `FALLBACK_REPOS` | (empty) | Comma-separated fallback repos when API fails |
