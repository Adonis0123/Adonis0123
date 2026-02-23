#!/usr/bin/env node

/**
 * select-recent-repos.mjs
 *
 * Fetches public repositories from GitHub API, filters for quality candidates,
 * and updates both `data/profile.projects.json` and `README.md` with the most
 * recently active repos. Designed to run in GitHub Actions on a weekly cron.
 */

import { readFile, writeFile } from "node:fs/promises";

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

const PROFILE_USERNAME = process.env.PROFILE_USERNAME || "Adonis0123";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const OUTPUT_JSON = "data/profile.projects.json";
const README_PATH = "README.md";
const COUNT = Number(process.env.RECENT_REPO_COUNT || "3");

const FIXED_FEATURED_REPOS = new Set(
  (process.env.FIXED_FEATURED_REPOS ||
    `${PROFILE_USERNAME}/adonis-kit,${PROFILE_USERNAME}/adonis-skills`)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
);

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
function isQualityCandidate(repo) {
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
function toProject(repo, fallbackSummary) {
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
function renderRecentReposMarkdown(projects) {
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
 * Replaces content between `<!-- RECENT_REPOS:START/END -->` markers in README.md.
 * @param {string} markdown - Rendered markdown to inject
 * @returns {Promise<void>}
 */
async function updateReadmeBlock(markdown) {
  const startMarker = "<!-- RECENT_REPOS:START -->";
  const endMarker = "<!-- RECENT_REPOS:END -->";
  const readme = await readFile(README_PATH, "utf8");
  const regex = new RegExp(
    `(${startMarker})([\\s\\S]*?)(${endMarker})`,
    "m",
  );

  if (!regex.test(readme)) {
    throw new Error("README markers for recent repositories were not found.");
  }

  const replaced = readme.replace(
    regex,
    `${startMarker}\n${markdown}\n${endMarker}`,
  );

  await writeFile(README_PATH, replaced, "utf8");
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

  await writeFile(OUTPUT_JSON, `${JSON.stringify(finalProjects, null, 2)}\n`, "utf8");
  await updateReadmeBlock(renderRecentReposMarkdown(finalProjects));

  console.log(
    `Updated ${OUTPUT_JSON} and README recent repositories block for ${PROFILE_USERNAME}.`,
  );
}

await main();
