<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:1a73e8,100:00c4b4&height=200&section=header&text=Adonis&fontSize=60&fontColor=ffffff&fontAlignY=35&desc=Frontend+engineer+building+skills,+plugins+and+workflows+for+coding+agents&descSize=16&descAlignY=55&descColor=ffffff" alt="Header banner" />

<p align="center">
  Frontend engineer (React · TypeScript) turned coding-agent toolsmith.<br />
  I package the habits that make agents reliable — review loops, workflow gates, permission gates — into things you can install in one line.
</p>

<!-- PROFILE_STATS:START -->
<p align="center">
  <b>44</b> published skills · runs in Claude Code · Codex · Cursor · Hermes · pi · <b>333</b> public commits in the last 30 days
</p>
<!-- PROFILE_STATS:END -->

## Featured Projects

### [sideby](https://github.com/Adonis0123/sideby)

<a href="https://www.npmjs.com/package/sideby"><img src="./assets/badges/sideby-npm.svg" alt="npm version" /></a> <a href="https://github.com/Adonis0123/sideby/stargazers"><img src="./assets/badges/sideby-stars.svg" alt="Stars" /></a> <a href="https://github.com/Adonis0123/sideby/commits"><img src="./assets/badges/sideby-last-commit.svg" alt="Last commit" /></a>

Run work, personal and API-key accounts at the same time, without their configs drifting apart: Claude Code, Codex, Grok Build and pi, plus quota for Antigravity. Each account gets its own directory and terminal, while skills, hooks and settings stay linked to your main account; `sideby doctor --fix` repairs drift. One local panel and a macOS menu bar show every account's 5-hour and weekly quota, and `sideby next` starts the account with the most left. It never reads, prints or sends a credential value.

```bash
npm i -g sideby && sideby new claude work && sideby ui --background
```

<p>
<a href="https://github.com/Adonis0123/sideby">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Adonis0123/sideby/main/docs/assets/panel-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/Adonis0123/sideby/main/docs/assets/panel.png" />
    <img width="640" src="https://raw.githubusercontent.com/Adonis0123/sideby/main/docs/assets/panel.png" alt="sideby panel: every account's 5h and 7d quota, 7-day token usage and health in one page" />
  </picture>
</a>
</p>

### [agent-env](https://github.com/Adonis0123/agent-env)

<a href="https://github.com/Adonis0123/agent-env/stargazers"><img src="./assets/badges/agent-env-stars.svg" alt="Stars" /></a> <a href="https://github.com/Adonis0123/agent-env/commits"><img src="./assets/badges/agent-env-last-commit.svg" alt="Last commit" /></a>

One manifest for the rules and skills of every AI agent I run: Claude Code, Codex, Grok, pi, Cursor, Hermes and cloud chat bots. It ships them as plugins with a visibility (public, personal, company or local), scans public and personal ones for home paths, emails and secrets before they are written, and `bin/agent-env doctor` checks every machine against the manifest. It also builds [agent-plugin-public](https://github.com/Adonis0123/agent-plugin-public), the plugin of shared rules and general skills you can install directly.

```bash
git clone https://github.com/Adonis0123/agent-env.git && cd agent-env
bin/agent-env check --manifest examples/demo/manifest/habits.toml
```

How my skill, plugin and pi projects fit together:

```mermaid
flowchart LR
  SRC["My private rules, skills<br/>& plugin source"] --> GATE{"Allowlist export<br/>+ privacy scan"}
  GATE --> SK["adonis-skills"]
  GATE --> HK["hermes-kit"]
  SRC --> AE{"agent-env<br/>manifest + privacy scan"}
  AE --> PUB["agent-plugin-public"]
  SK --> HOSTS["Claude Code · Codex<br/>Grok Build · Cursor<br/>Hermes"]
  HK --> HOSTS
  PUB --> HOSTS
  PI["adonis-pi"] --> P["pi"]
```

### [adonis-skills](https://github.com/Adonis0123/adonis-skills)

<a href="https://github.com/Adonis0123/adonis-skills/stargazers"><img src="./assets/badges/adonis-skills-stars.svg" alt="Stars" /></a> <a href="https://github.com/Adonis0123/adonis-skills/commits"><img src="./assets/badges/adonis-skills-last-commit.svg" alt="Last commit" /></a>

Agent-agnostic skills for coding agents: review loops, workflow gates, MCP setup, Git delivery and local environment audits. Works in Claude Code, Codex, Cursor, Hermes or any agent that reads `SKILL.md`. · [Live site](https://adonis-skills.vercel.app/)

```bash
npx skills add adonis0123/adonis-skills --list
```

### [hermes-kit](https://github.com/Adonis0123/hermes-kit)

<a href="https://github.com/Adonis0123/hermes-kit/stargazers"><img src="./assets/badges/hermes-kit-stars.svg" alt="Stars" /></a> <a href="https://github.com/Adonis0123/hermes-kit/commits"><img src="./assets/badges/hermes-kit-last-commit.svg" alt="Last commit" /></a>

Plugins, skills and field notes for running [Hermes Agent](https://github.com/NousResearch/hermes-agent) day to day, plus docs for a patched Hermes fork. The skills also install into Claude Code and Codex.

```bash
hermes skills tap add Adonis0123/hermes-kit
```

### [adonis-pi](https://github.com/Adonis0123/adonis-pi)

<a href="https://github.com/Adonis0123/adonis-pi/stargazers"><img src="./assets/badges/adonis-pi-stars.svg" alt="Stars" /></a> <a href="https://github.com/Adonis0123/adonis-pi/commits"><img src="./assets/badges/adonis-pi-last-commit.svg" alt="Last commit" /></a>

A Pi Package that brings my Claude Code habits to [pi](https://github.com/earendil-works/pi) without forking it: a permission gate, attention notifications, a Claude Code–compatible `AskUserQuestion` tool and the `pin` multi-account launcher.

```bash
git clone https://github.com/Adonis0123/adonis-pi && export PATH="$PWD/adonis-pi/bin:$PATH"
pin setup 1
```

### [gemini-chrome-autoinstall](https://github.com/Adonis0123/gemini-chrome-autoinstall)

<a href="https://github.com/Adonis0123/gemini-chrome-autoinstall/stargazers"><img src="./assets/badges/gemini-chrome-autoinstall-stars.svg" alt="Stars" /></a> <a href="https://github.com/Adonis0123/gemini-chrome-autoinstall/commits"><img src="./assets/badges/gemini-chrome-autoinstall-last-commit.svg" alt="Last commit" /></a> <a href="https://github.com/Adonis0123/gemini-chrome-autoinstall/releases"><img src="./assets/badges/gemini-chrome-autoinstall-release.svg" alt="Latest release" /></a>

A self-healing wrapper that keeps [Gemini-in-Chrome](https://github.com/appsail/Gemini-in-Chrome) working after Chrome updates: it watches for version changes and repairs `Local State` only when it is safe to write. macOS and Windows.

```bash
curl -fsSL https://raw.githubusercontent.com/Adonis0123/gemini-chrome-autoinstall/master/install.sh | bash
```

## Skill of the Week

A different skill from [adonis-skills](https://github.com/Adonis0123/adonis-skills) every week.

<!-- SKILL_OF_WEEK:START -->
**[review-prompt-composer](https://github.com/Adonis0123/adonis-skills/tree/HEAD/skills/review-prompt-composer)** — Compose one repository-local, copy-ready Markdown prompt for another team or AI agent to review Git changes in the same working tree.

```bash
npx skills add adonis0123/adonis-skills --skill review-prompt-composer
```
<!-- SKILL_OF_WEEK:END -->

## Shipped This Week

My latest public commits, refreshed weekly.

<!-- SHIPPED_THIS_WEEK:START -->
- `npm-release-guide` [📝 docs(trusted-publishing): drop the in-verification banner after a real end-to-end release](https://github.com/Adonis0123/npm-release-guide/commit/c46df44b3fe65a6092dcaff6117a1d66976a394c) · 2026-11-24
- `npm-release-guide` [🎨 style(readme): trim empty space below the publishing flowchart](https://github.com/Adonis0123/npm-release-guide/commit/607d530af98e3093f493b028860dc8295b1ec653) · 2026-11-24
- `npm-release-guide` [📝 docs(readme): add publishing flowchart in light and dark themes](https://github.com/Adonis0123/npm-release-guide/commit/3f931ccdbf6e32857c4b488df941440b4bde8168) · 2026-11-24
- `adonis-skills` [⚡ perf(agentic-review-handoff): run codex re-reviews at high reasoning effort from round 2](https://github.com/Adonis0123/adonis-skills/commit/2154e5bc6c7610d48c19da990d7a584610fecce9) · 2026-11-24
- `agent-plugin-public` [✨ feat: update the adonis-public plugin generated by agent-env](https://github.com/Adonis0123/agent-plugin-public/commit/a9656b26f2cf95f6c4d524f6586efb348f9ff99e) · 2026-11-24
<!-- SHIPPED_THIS_WEEK:END -->

## More Projects

Auto-selected every week from my most recently pushed public repositories.

<!-- RECENT_REPOS:START -->
- **[npm-release-guide](https://github.com/Adonis0123/npm-release-guide)** - Publish npm packages without getting stuck on two-factor prompts: an agent skill and a plain-language guide (EN/中文) (Last update: 2026-11-24)
- **[network-portal](https://github.com/Adonis0123/network-portal)** - Offline network diagnosis and an embeddable bilingual Network portal (Last update: 2026-11-24)
<!-- RECENT_REPOS:END -->

## Latest Releases

The newest release of each featured project, refreshed weekly.

<!-- LATEST_RELEASES:START -->
- **[sideby](https://github.com/Adonis0123/sideby)** [v0.45.0](https://github.com/Adonis0123/sideby/releases/tag/v0.45.0) · 2026-11-24
- **[gemini-chrome-autoinstall](https://github.com/Adonis0123/gemini-chrome-autoinstall)** [v0.6.9](https://github.com/Adonis0123/gemini-chrome-autoinstall/releases/tag/v0.6.9) · 2026-11-23
- **[agent-env](https://github.com/Adonis0123/agent-env)** [v0.1.0](https://github.com/Adonis0123/agent-env/releases/tag/v0.1.0) · 2026-11-10
<!-- LATEST_RELEASES:END -->

## About Me

- Frontend engineer based in Shenzhen, China, working mostly in React and TypeScript.
- These days I spend most of my time building tooling for coding agents: Claude Code, Codex, Grok Build, Cursor, Hermes and pi.
- Everything I publish is exported through an allowlist and a privacy scan before it leaves my machine.

## Tech Stack

<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=ts,react,nextjs,tailwind,nodejs,vite,electron,githubactions,docker,vercel&theme=light" alt="TypeScript, React, Next.js, Tailwind CSS, Node.js, Vite, Electron, GitHub Actions, Docker, Vercel" />
  </a>
</p>

<details>
<summary>Full tech stack details</summary>

### AI Agent Tooling

- Claude Code, Codex, Cursor, Grok Build, Hermes Agent, pi
- Agent skills (`SKILL.md`), plugins, MCP servers

### Languages & Markup

- HTML, CSS, JavaScript, TypeScript
- Sass, Markdown, SVG, Regex

### Frameworks & Build

- React, Next.js, Astro, Tailwind CSS
- Electron, Vite, Webpack, Express

### Runtime & Tools

- Node.js, Git, VSCode, Figma
- Python, GitHub, Cloudflare Workers, CodePen, Stack Overflow

### Infra & DevOps

- PostgreSQL, Docker, GitHub Actions
- Nginx, Cloudflare, Vercel, Linux, Jenkins

</details>

## GitHub Stats

<p align="center">
  <a href="https://github.com/Adonis0123">
    <img height="170" src="./assets/cards/stats.svg" alt="GitHub stats for Adonis0123" />
  </a>
  <a href="https://github.com/Adonis0123">
    <img height="170" src="./assets/cards/top-langs.svg" alt="Top languages used by Adonis0123" />
  </a>
</p>

## Contact

<p align="left">
  <a href="https://github.com/Adonis0123">
    <img src="https://img.shields.io/badge/GitHub-Adonis0123-181717?style=for-the-badge&logo=github" alt="GitHub" />
  </a>
  <a href="mailto:adonis20210809@gmail.com">
    <img src="https://img.shields.io/badge/Email-adonis20210809@gmail.com-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Email" />
  </a>
</p>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Adonis0123/Adonis0123/output/github-snake-dark.svg" />
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/Adonis0123/Adonis0123/output/github-snake.svg" />
  <img alt="GitHub contribution snake animation" src="https://raw.githubusercontent.com/Adonis0123/Adonis0123/output/github-snake.svg" />
</picture>

<p align="center">
  <sub>This profile is refreshed weekly by <a href="https://github.com/Adonis0123/Adonis0123/blob/main/.github/workflows/profile-refresh.yml">GitHub Actions</a> — and edited by coding agents.</sub>
</p>

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:1a73e8,100:00c4b4&height=120&section=footer" alt="Footer wave" />
