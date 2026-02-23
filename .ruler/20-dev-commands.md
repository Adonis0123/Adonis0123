---
applyTo: '**'
---

## Development Commands

```bash
# Sync AI skills from .agents/skills to .claude/skills
pnpm run skills:sync:llm

# Generate AGENTS.md and CLAUDE.md from .ruler/ templates
pnpm run ruler:apply

# Run the profile refresh script locally (requires GITHUB_TOKEN)
GITHUB_TOKEN=<token> node scripts/select-recent-repos.mjs
```

## Local Validation Flow

1. Verify `scripts/select-recent-repos.mjs` runs without errors (may need `GITHUB_TOKEN`).
2. Confirm `README.md` markers (`<!-- RECENT_REPOS:START/END -->`) are intact after changes.
3. Confirm `data/profile.projects.json` is valid JSON.
4. Run `pnpm run ruler:apply` after editing `.ruler/*.md` templates.
