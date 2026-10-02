---
applyTo: '**'
---

## Development Commands

```bash
# Sync AI skills from .agents/skills to .claude/skills
pnpm run skills:sync:llm

# Generate AGENTS.md and CLAUDE.md from .ruler/ templates
pnpm run ruler:apply

# Run unit tests for the profile refresh script
pnpm test

# Run the profile refresh script locally (requires GITHUB_TOKEN)
GITHUB_TOKEN=<token> node scripts/select-recent-repos.mjs
```

## Local Validation Flow

1. Verify `scripts/select-recent-repos.mjs` runs without errors (may need `GITHUB_TOKEN`).
2. Run `pnpm test`.
3. Confirm `README.md` markers (`RECENT_REPOS`, `PROFILE_STATS`, `SKILL_OF_WEEK`, `SHIPPED_THIS_WEEK`, `LATEST_TIL` START/END pairs) are intact after changes.
4. Confirm `data/profile.projects.json` is valid JSON.
5. Run `pnpm run ruler:apply` after editing `.ruler/*.md` templates.
