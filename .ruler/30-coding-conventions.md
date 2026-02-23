---
applyTo: '**'
---

## Coding Conventions

- Scripts use ESM (`import`/`export`). No CommonJS (`require`).
- `.mjs` for pure JavaScript scripts, `.ts` for TypeScript scripts (run via `--experimental-strip-types`).
- Use `node:` prefix for Node.js built-in modules (e.g., `node:fs/promises`).
- Prefer `const` over `let`; avoid `var`.
- Use descriptive UPPER_SNAKE_CASE for configuration constants.
- Keep environment variable handling at the top of scripts.
- GitHub API calls should include proper error handling and rate-limit awareness.
- Never commit secrets or tokens — use environment variables and GitHub Secrets.
- Keep `README.md` marker blocks (`<!-- ... -->`) intact; scripts depend on them for content injection.
