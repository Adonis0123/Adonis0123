#!/usr/bin/env node

/**
 * select-recent-repos.mjs
 *
 * Fetches public repositories from GitHub API, filters for quality candidates,
 * and updates both `data/profile.projects.json` and `README.md` with the most
 * recently active repos. Also refreshes the profile stats line and the latest
 * TIL Garden posts. Designed to run in GitHub Actions on a weekly cron.
 */

import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

/**
 * @typedef {Object} GitHubRepo
 * @property {string} name
 * @property {string} full_name
 * @property {string|null} description
 * @property {string[]} [topics]
 * @property {boolean} fork
 * @property {boolean} archived
 * @property {boolean} disabled
 * @property {string|null} pushed_at
 */

/**
 * @typedef {Object} Project
 * @property {string} name
 * @property {string|null} repo
 * @property {string|null} demo
 * @property {string} summary
 * @property {string[]} tech
 * @property {string|null} updatedAt
 */

/**
 * @typedef {Object} TilPost
 * @property {string} title
 * @property {string} url
 * @property {string} date
 */

const PROFILE_USERNAME = process.env.PROFILE_USERNAME || "Adonis0123";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const OUTPUT_JSON = "data/profile.projects.json";
const README_PATH = "README.md";
const COUNT = Number(process.env.RECENT_REPO_COUNT || "3");
const LATEST_TIL_COUNT = Number(process.env.LATEST_TIL_COUNT || "3");
const STATS_WINDOW_DAYS = 30;
const SHIPPED_WINDOW_DAYS = 7;
const SHIPPED_COUNT = Number(process.env.SHIPPED_COUNT || "5");
const DAY_MS = 24 * 60 * 60 * 1000;

const FIXED_FEATURED_REPOS = new Set(
  (process.env.FIXED_FEATURED_REPOS ||
    [
      "sideby",
      "adonis-skills",
      "hermes-kit",
      "adonis-pi",
      "gemini-chrome-autoinstall",
    ]
      .map((name) => `${PROFILE_USERNAME}/${name}`)
      .join(","))
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
);

const SKILL_REPOS = (process.env.SKILL_REPOS ||
  `${PROFILE_USERNAME}/adonis-skills,${PROFILE_USERNAME}/hermes-kit`)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const SKILL_OF_WEEK_REPO =
  process.env.SKILL_OF_WEEK_REPO || `${PROFILE_USERNAME}/adonis-skills`;

const TIL_REPO = process.env.TIL_REPO || `${PROFILE_USERNAME}/til-garden`;
const TIL_SITE_URL = (
  process.env.TIL_SITE_URL || "https://adonis-til.mintlify.app"
).replace(/\/+$/, "");

const AGENT_HOSTS = ["Claude Code", "Codex", "Cursor", "Hermes", "pi"];

// Only `skills/<name>/SKILL.md` counts as a published skill; copies under
// `.agents/` or `.claude/` are repo-internal tooling.
const PUBLISHED_SKILL_PATH = /^skills\/[^/]+\/SKILL\.md$/;

// Sync exports, profile refreshes and merges say nothing about shipped work.
const NOISE_COMMIT = /(^|\s)chore\((sync|profile)\):|^Merge /;

const FALLBACK_REPOS = (process.env.FALLBACK_REPOS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const BLOCKED_REPOS = new Set(
  (process.env.BLOCKED_REPOS ||
    `${PROFILE_USERNAME}/adonis-github-profile,${PROFILE_USERNAME}/${PROFILE_USERNAME}`)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
);

const EXCLUDE_PATTERN =
  /(practice|tutorial|learn|sandbox|playground|notes?|examples?)/i;

/**
 * Converts a date-like value to ISO 8601 string.
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
function toIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Formats an ISO date string to `YYYY-MM-DD` for markdown display.
 * @param {string|null|undefined} value
 * @returns {string}
 */
function toMarkdownDate(value) {
  if (!value) return "unknown";
  return value.slice(0, 10);
}

/**
 * Builds HTTP headers for GitHub API requests with optional auth token.
 * @returns {Record<string, string>}
 */
function buildHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "profile-refresh-script",
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return headers;
}

/**
 * Fetches JSON from the GitHub API.
 * @param {string} pathname - API path (e.g. `/users/foo/repos`)
 * @returns {Promise<any>}
 * @throws {Error} On non-OK responses
 */
async function ghFetch(pathname) {
  const url = `https://api.github.com${pathname}`;
  const response = await fetch(url, { headers: buildHeaders() });

  if (!response.ok) {
    const body = await response.text();
    const message = `GitHub API request failed (${response.status}) for ${pathname}: ${body}`;
    throw new Error(message);
  }

  return response.json();
}

/**
 * Fetches a repository file as raw text via the contents API.
 * @param {string} fullName - Repository full name (e.g. `owner/repo`)
 * @param {string} filePath - Path inside the repository
 * @returns {Promise<string|null>} `null` when the file does not exist
 * @throws {Error} On non-OK responses other than 404
 */
async function ghFetchText(fullName, filePath) {
  const pathname = `/repos/${fullName}/contents/${filePath}`;
  const response = await fetch(`https://api.github.com${pathname}`, {
    headers: { ...buildHeaders(), Accept: "application/vnd.github.raw+json" },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API request failed (${response.status}) for ${pathname}: ${body}`);
  }

  return response.text();
}

/**
 * Checks whether a repository has a README file via the GitHub API.
 * @param {string} fullName - Repository full name (e.g. `owner/repo`)
 * @returns {Promise<boolean>}
 */
async function hasReadme(fullName) {
  const response = await fetch(`https://api.github.com/repos/${fullName}/readme`, {
    headers: buildHeaders(),
  });

  if (response.status === 404) return false;
  return response.ok;
}

/**
 * Lists all public repositories for a given GitHub user (paginated).
 * @param {string} username
 * @returns {Promise<GitHubRepo[]>}
 */
async function listPublicRepos(username) {
  const repos = [];
  const perPage = 100;

  for (let page = 1; page <= 5; page += 1) {
    const chunk = await ghFetch(
      `/users/${username}/repos?per_page=${perPage}&page=${page}&type=public&sort=updated`,
    );

    if (!Array.isArray(chunk) || chunk.length === 0) break;
    repos.push(...chunk);
    if (chunk.length < perPage) break;
  }

  return repos;
}

/**
 * Determines if a repo meets quality criteria for display.
 * Excludes forks, archived, disabled, pattern-matched, featured, and blocked repos.
 * @param {GitHubRepo} repo
 * @returns {boolean}
 */
export function isQualityCandidate(repo) {
  if (!repo || !repo.full_name) return false;
  if (repo.fork || repo.archived || repo.disabled) return false;
  if (EXCLUDE_PATTERN.test(repo.name || "")) return false;
  if (FIXED_FEATURED_REPOS.has(String(repo.full_name).toLowerCase())) return false;
  if (BLOCKED_REPOS.has(String(repo.full_name).toLowerCase())) return false;

  return true;
}

/**
 * Converts a GitHub repo object into a normalized Project structure.
 * @param {GitHubRepo} repo
 * @param {string} [fallbackSummary]
 * @returns {Project}
 */
export function toProject(repo, fallbackSummary) {
  const topics = Array.isArray(repo.topics)
    ? repo.topics.filter(Boolean).slice(0, 5)
    : [];

  return {
    name: repo.name,
    repo: repo.full_name,
    demo: null,
    summary:
      (repo.description || "").trim() ||
      fallbackSummary ||
      "Open-source repository maintained by Adonis0123.",
    tech: topics,
    updatedAt: toIsoDate(repo.pushed_at),
  };
}

/**
 * Renders an array of projects as a markdown bullet list for README injection.
 * @param {Project[]} projects
 * @returns {string}
 */
export function renderRecentReposMarkdown(projects) {
  const lines = projects.map((project) => {
    const hasTech = project.tech && project.tech.length > 0;
    const techPart = hasTech
      ? `Tech: ${project.tech.map((item) => `\`${item}\``).join(", ")} | `
      : "";
    const updatedText = toMarkdownDate(project.updatedAt);
    const title = project.repo
      ? `**[${project.name}](https://github.com/${project.repo})**`
      : `**${project.name}**`;
    return `- ${title} - ${project.summary} (${techPart}Last update: ${updatedText})`;
  });

  return lines.join("\n");
}

/**
 * Replaces content between `<!-- NAME:START -->` and `<!-- NAME:END -->` markers.
 * @param {string} readme - Full README content
 * @param {string} name - Marker name (e.g. `RECENT_REPOS`)
 * @param {string} markdown - Rendered markdown to inject
 * @returns {string}
 * @throws {Error} When the marker pair is missing
 */
export function replaceMarkerBlock(readme, name, markdown) {
  const startMarker = `<!-- ${name}:START -->`;
  const endMarker = `<!-- ${name}:END -->`;
  const regex = new RegExp(`(${startMarker})([\\s\\S]*?)(${endMarker})`, "m");

  if (!regex.test(readme)) {
    throw new Error(`README markers for ${name} were not found.`);
  }

  return readme.replace(regex, () => `${startMarker}\n${markdown}\n${endMarker}`);
}

/**
 * Counts published skills (`skills/<name>/SKILL.md`) in a git tree path list.
 * @param {string[]} paths
 * @returns {number}
 */
export function countPublishedSkills(paths) {
  return paths.filter((path) => PUBLISHED_SKILL_PATH.test(path)).length;
}

/**
 * Renders the one-line profile stats block.
 * @param {{ skillCount: number, commitCount: number }} stats
 * @returns {string}
 */
export function renderStatsMarkdown({ skillCount, commitCount }) {
  return [
    `<p align="center">`,
    `  <b>${skillCount}</b> published skills · runs in ${AGENT_HOSTS.join(" · ")} · <b>${commitCount}</b> public commits in the last ${STATS_WINDOW_DAYS} days`,
    `</p>`,
  ].join("\n");
}

/**
 * Collects page slugs from a Mintlify `docs.json` navigation tree, in order.
 * @param {unknown} node - `navigation` object or any nested tab/group/page
 * @returns {string[]}
 */
export function collectDocsPages(node) {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(collectDocsPages);
  if (!node || typeof node !== "object") return [];

  return ["tabs", "groups", "pages"].flatMap((key) =>
    key in node ? collectDocsPages(node[key]) : [],
  );
}

/**
 * Reads flat `key: value` pairs from a markdown frontmatter block.
 * Multi-line YAML values are ignored; only simple scalars are needed here.
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) return {};

  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z_][\w-]*):\s*(.+)$/.exec(line);
    if (!pair) continue;
    fields[pair[1]] = pair[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return fields;
}

/**
 * Picks the newest posts by publish date (`YYYY-MM-DD`), skipping undated ones.
 * @param {TilPost[]} posts
 * @param {number} count
 * @returns {TilPost[]}
 */
export function selectLatestTil(posts, count) {
  return posts
    .filter((post) => /^\d{4}-\d{2}-\d{2}/.test(post.date))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, count);
}

/**
 * Renders TIL posts as a markdown bullet list.
 * @param {TilPost[]} posts
 * @returns {string}
 */
export function renderLatestTilMarkdown(posts) {
  return posts
    .map((post) => {
      const title = post.title.replace(/[[\]]/g, "\\$&");
      return `- [${title}](${post.url}) · ${post.date.slice(0, 10)}`;
    })
    .join("\n");
}

/**
 * Builds the commit search query. `is:public` keeps a personal token with
 * private-repo access from inflating the "public commits" number.
 * @param {string} username
 * @param {string} since - `YYYY-MM-DD`
 * @returns {string}
 */
export function buildCommitSearchQuery(username, since) {
  return `author:${username} author-date:>=${since} is:public`;
}

/**
 * Fetches profile stats: published skill count and recent public commits.
 * @returns {Promise<{ skillCount: number, commitCount: number }>}
 */
async function fetchProfileStats() {
  let skillCount = 0;
  for (const repo of SKILL_REPOS) {
    const tree = await ghFetch(`/repos/${repo}/git/trees/HEAD?recursive=1`);
    skillCount += countPublishedSkills(tree.tree.map((entry) => entry.path));
  }

  const since = daysAgo(STATS_WINDOW_DAYS);
  const search = await ghFetch(
    `/search/commits?q=${encodeURIComponent(buildCommitSearchQuery(PROFILE_USERNAME, since))}&per_page=1`,
  );

  return { skillCount, commitCount: search.total_count };
}

/**
 * Fetches TIL Garden posts listed in `docs.json` with their frontmatter.
 * @returns {Promise<TilPost[]>}
 */
async function fetchTilPosts() {
  const docsJson = await ghFetchText(TIL_REPO, "docs.json");
  if (!docsJson) throw new Error(`docs.json not found in ${TIL_REPO}.`);

  const pages = collectDocsPages(JSON.parse(docsJson).navigation).filter(
    (page) => page !== "introduction",
  );

  const posts = [];
  // Sequential on purpose, same as the README gate: avoids API bursts.
  for (const page of pages) {
    const text =
      (await ghFetchText(TIL_REPO, `${page}.mdx`)) ??
      (await ghFetchText(TIL_REPO, `${page}.md`));
    if (!text) continue;

    const { title, date } = parseFrontmatter(text);
    if (!title || !date) continue;
    posts.push({ title, url: `${TIL_SITE_URL}/${page}`, date });
  }

  return posts;
}

/**
 * Returns the `YYYY-MM-DD` date `days` days before now.
 * @param {number} days
 * @returns {string}
 */
function daysAgo(days) {
  return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * @typedef {Object} ShippedCommit
 * @property {string} repo - Repository full name
 * @property {string} subject - First line of the commit message
 * @property {string} url
 * @property {string} date - ISO 8601
 */

/**
 * Picks the newest meaningful commits, dropping noise and blocked repos.
 * @param {ShippedCommit[]} commits
 * @param {number} count
 * @returns {ShippedCommit[]}
 */
export function selectShippedCommits(commits, count) {
  return commits
    .filter((commit) => !NOISE_COMMIT.test(commit.subject))
    .filter((commit) => !BLOCKED_REPOS.has(commit.repo.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, count);
}

/**
 * Renders shipped commits as a markdown bullet list.
 * @param {ShippedCommit[]} commits
 * @returns {string}
 */
export function renderShippedMarkdown(commits) {
  if (commits.length === 0) return "_A quiet week — nothing public shipped._";

  return commits
    .map((commit) => {
      const name = commit.repo.split("/").pop();
      const subject = commit.subject.replace(/[[\]]/g, "\\$&");
      return `- \`${name}\` [${subject}](${commit.url}) · ${commit.date.slice(0, 10)}`;
    })
    .join("\n");
}

/**
 * Picks one item per calendar week (weeks counted from the Unix epoch), so the
 * choice rotates weekly and is stable within a week.
 * @template T
 * @param {T[]} items
 * @param {number} nowMs
 * @returns {T|undefined}
 */
export function pickWeeklyItem(items, nowMs) {
  if (items.length === 0) return undefined;
  const week = Math.floor(nowMs / (7 * DAY_MS));
  return items[week % items.length];
}

/**
 * Shortens a skill description to its first sentence, capped at `max` chars.
 * @param {string} text
 * @param {number} [max]
 * @returns {string}
 */
export function summarizeDescription(text, max = 160) {
  const firstSentence = text.trim().split(/(?<=[.!?])\s/)[0];
  if (firstSentence.length <= max) return firstSentence;

  const cut = firstSentence.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "")}…`;
}

/**
 * Renders the Skill of the Week block.
 * @param {{ name: string, summary: string, repo: string }} skill
 * @returns {string}
 */
export function renderSkillOfWeekMarkdown({ name, summary, repo }) {
  return [
    `**[${name}](https://github.com/${repo}/tree/HEAD/skills/${name})** — ${summary}`,
    "",
    "```bash",
    `npx skills add ${repo.toLowerCase()} --skill ${name}`,
    "```",
  ].join("\n");
}

/**
 * Fetches public commits from the last week via the commit search API.
 * @returns {Promise<ShippedCommit[]>}
 */
async function fetchShippedCommits() {
  const query = buildCommitSearchQuery(PROFILE_USERNAME, daysAgo(SHIPPED_WINDOW_DAYS));
  const search = await ghFetch(
    `/search/commits?q=${encodeURIComponent(query)}&sort=author-date&order=desc&per_page=50`,
  );

  return search.items.map((item) => ({
    repo: item.repository.full_name,
    subject: item.commit.message.split("\n")[0],
    url: item.html_url,
    date: item.commit.author.date,
  }));
}

/**
 * Fetches this week's skill: name from the published skill list, summary from
 * its `SKILL.md` frontmatter.
 * @returns {Promise<{ name: string, summary: string, repo: string }>}
 */
async function fetchSkillOfWeek() {
  const tree = await ghFetch(`/repos/${SKILL_OF_WEEK_REPO}/git/trees/HEAD?recursive=1`);
  const names = tree.tree
    .map((entry) => entry.path)
    .filter((path) => PUBLISHED_SKILL_PATH.test(path))
    .map((path) => path.split("/")[1])
    .sort();

  const name = pickWeeklyItem(names, Date.now());
  if (!name) throw new Error(`No published skills found in ${SKILL_OF_WEEK_REPO}.`);

  const text = await ghFetchText(SKILL_OF_WEEK_REPO, `skills/${name}/SKILL.md`);
  const { description } = parseFrontmatter(text || "");
  if (!description) throw new Error(`skills/${name}/SKILL.md has no description.`);

  return { name, summary: summarizeDescription(description), repo: SKILL_OF_WEEK_REPO };
}

/**
 * Runs a block loader; logs and returns `null` on failure so the README keeps
 * its previous content for that block instead of losing it.
 * @template T
 * @param {string} label
 * @param {() => Promise<T>} load
 * @returns {Promise<T|null>}
 */
async function tryLoad(label, load) {
  try {
    return await load();
  } catch (error) {
    console.warn(`Skipping ${label} refresh: ${String(error)}`);
    return null;
  }
}

/**
 * Builds fallback project entries from FALLBACK_REPOS env when API is unavailable.
 * @returns {Promise<Project[]>}
 */
async function buildFallbackProjects() {
  const projects = [];

  for (const repo of FALLBACK_REPOS) {
    const [owner, name] = repo.split("/");
    if (!owner || !name) continue;
    if (FIXED_FEATURED_REPOS.has(repo.toLowerCase())) continue;
    if (BLOCKED_REPOS.has(repo.toLowerCase())) continue;
    projects.push({
      name,
      repo,
      demo: null,
      summary: "Seed fallback entry. It will be replaced by auto-selected active repositories.",
      tech: [],
      updatedAt: null,
    });
    if (projects.length === COUNT) break;
  }

  return projects;
}

/**
 * Main entry point. Fetches repos, selects top candidates, writes JSON and README.
 * @returns {Promise<void>}
 */
async function main() {
  let repos = [];

  try {
    repos = await listPublicRepos(PROFILE_USERNAME);
  } catch (error) {
    console.warn(String(error));
    console.warn("Falling back to manual seed repositories.");
  }

  const sorted = repos
    .filter(isQualityCandidate)
    .sort(
      (a, b) =>
        new Date(b.pushed_at || 0).getTime() - new Date(a.pushed_at || 0).getTime(),
    );

  const selected = [];
  for (const repo of sorted) {
    // README presence gate avoids showcasing low-quality/incomplete repositories.
    // Kept sequential intentionally to reduce API burst and improve stability.
    const readmeExists = await hasReadme(repo.full_name).catch(() => false);
    if (!readmeExists) continue;

    selected.push(toProject(repo));
    if (selected.length >= COUNT) break;
  }

  if (selected.length < COUNT) {
    const fallback = await buildFallbackProjects();
    for (const item of fallback) {
      if (selected.find((project) => project.repo === item.repo)) continue;
      selected.push(item);
      if (selected.length >= COUNT) break;
    }
  }

  while (selected.length < COUNT) {
    selected.push({
      name: `Pending auto-refresh #${selected.length + 1}`,
      repo: null,
      demo: null,
      summary:
        "Automatic selection will run in GitHub Actions when GitHub API is reachable.",
      tech: [],
      updatedAt: null,
    });
  }

  const finalProjects = selected.slice(0, COUNT);

  const stats = await tryLoad("profile stats", fetchProfileStats);
  const tilPosts = await tryLoad("latest TIL", fetchTilPosts);
  const latestTil = tilPosts ? selectLatestTil(tilPosts, LATEST_TIL_COUNT) : [];
  const shipped = await tryLoad("shipped this week", fetchShippedCommits);
  const skillOfWeek = await tryLoad("skill of the week", fetchSkillOfWeek);

  let readme = await readFile(README_PATH, "utf8");
  readme = replaceMarkerBlock(readme, "RECENT_REPOS", renderRecentReposMarkdown(finalProjects));
  if (stats) readme = replaceMarkerBlock(readme, "PROFILE_STATS", renderStatsMarkdown(stats));
  if (shipped) {
    readme = replaceMarkerBlock(
      readme,
      "SHIPPED_THIS_WEEK",
      renderShippedMarkdown(selectShippedCommits(shipped, SHIPPED_COUNT)),
    );
  }
  if (skillOfWeek) {
    readme = replaceMarkerBlock(readme, "SKILL_OF_WEEK", renderSkillOfWeekMarkdown(skillOfWeek));
  }
  if (latestTil.length > 0) {
    readme = replaceMarkerBlock(readme, "LATEST_TIL", renderLatestTilMarkdown(latestTil));
  }

  await writeFile(OUTPUT_JSON, `${JSON.stringify(finalProjects, null, 2)}\n`, "utf8");
  await writeFile(README_PATH, readme, "utf8");

  console.log(`Updated ${OUTPUT_JSON} and README blocks for ${PROFILE_USERNAME}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
