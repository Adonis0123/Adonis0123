import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCommitSearchQuery,
  collectDocsPages,
  countPublishedSkills,
  isQualityCandidate,
  parseFrontmatter,
  pickWeeklyItem,
  renderLatestTilMarkdown,
  renderShippedMarkdown,
  renderSkillOfWeekMarkdown,
  renderStatsMarkdown,
  replaceMarkerBlock,
  selectLatestTil,
  selectShippedCommits,
  summarizeDescription,
} from "./select-recent-repos.mjs";

describe("isQualityCandidate", () => {
  const repo = (name) => ({
    name,
    full_name: `Adonis0123/${name}`,
    fork: false,
    archived: false,
    disabled: false,
  });

  it("excludes every default featured repo", () => {
    for (const name of [
      "adonis-skills",
      "hermes-kit",
      "adonis-pi",
      "gemini-chrome-autoinstall",
    ]) {
      assert.equal(isQualityCandidate(repo(name)), false, name);
    }
  });

  it("keeps a regular repo that is not featured", () => {
    assert.equal(isQualityCandidate(repo("nookmark")), true);
  });
});

describe("replaceMarkerBlock", () => {
  it("replaces only the named block", () => {
    const readme = [
      "<!-- A:START -->",
      "old a",
      "<!-- A:END -->",
      "<!-- B:START -->",
      "old b",
      "<!-- B:END -->",
    ].join("\n");

    const result = replaceMarkerBlock(readme, "A", "new $& a");

    assert.match(result, /<!-- A:START -->\nnew \$& a\n<!-- A:END -->/);
    assert.match(result, /old b/);
  });

  it("throws when markers are missing", () => {
    assert.throws(() => replaceMarkerBlock("no markers", "A", "x"), /A were not found/);
  });
});

describe("countPublishedSkills", () => {
  it("counts only top-level skills/<name>/SKILL.md", () => {
    const paths = [
      "skills/workflow-gate/SKILL.md",
      "skills/goal-gate/SKILL.md",
      "skills/goal-gate/references/notes.md",
      ".agents/skills/commit/SKILL.md",
      "skills/nested/deeper/SKILL.md",
      "README.md",
    ];

    assert.equal(countPublishedSkills(paths), 2);
  });
});

describe("buildCommitSearchQuery", () => {
  it("limits the search to public commits", () => {
    assert.equal(
      buildCommitSearchQuery("Adonis0123", "2026-09-02"),
      "author:Adonis0123 author-date:>=2026-09-02 is:public",
    );
  });
});

describe("renderStatsMarkdown", () => {
  it("renders counts and agent hosts on one centered line", () => {
    const markdown = renderStatsMarkdown({ skillCount: 35, commitCount: 341 });

    assert.match(markdown, /^<p align="center">/);
    assert.match(markdown, /<b>35<\/b> published skills/);
    assert.match(markdown, /Claude Code · Codex · Cursor · Hermes · pi/);
    assert.match(markdown, /<b>341<\/b> public commits in the last 30 days/);
  });
});

describe("collectDocsPages", () => {
  it("flattens tabs, groups and pages in order", () => {
    const navigation = {
      tabs: [
        {
          tab: "Articles",
          pages: [
            "introduction",
            { group: "AI", pages: ["ai/a", "ai/b"] },
            { group: "Tools", pages: ["tools/c"] },
          ],
        },
      ],
    };

    assert.deepEqual(collectDocsPages(navigation), [
      "introduction",
      "ai/a",
      "ai/b",
      "tools/c",
    ]);
  });
});

describe("parseFrontmatter", () => {
  it("reads quoted and plain scalars and skips folded values", () => {
    const text = [
      "---",
      "title: 给 Claude Code 装上工程纪律",
      "description: >-",
      "  multi-line text",
      "date: '2026-04-22'",
      'updated: "2026-05-01"',
      "---",
      "body",
    ].join("\n");

    const fields = parseFrontmatter(text);

    assert.equal(fields.title, "给 Claude Code 装上工程纪律");
    assert.equal(fields.date, "2026-04-22");
    assert.equal(fields.updated, "2026-05-01");
  });

  it("returns an empty object without frontmatter", () => {
    assert.deepEqual(parseFrontmatter("# Title"), {});
  });
});

describe("selectLatestTil", () => {
  it("sorts by date descending, drops undated posts and limits the count", () => {
    const posts = [
      { title: "old", url: "u1", date: "2026-01-01" },
      { title: "undated", url: "u2", date: "soon" },
      { title: "new", url: "u3", date: "2026-07-14" },
      { title: "mid", url: "u4", date: "2026-04-22" },
    ];

    assert.deepEqual(
      selectLatestTil(posts, 2).map((post) => post.title),
      ["new", "mid"],
    );
  });
});

describe("renderLatestTilMarkdown", () => {
  it("renders linked bullets and escapes brackets in titles", () => {
    const markdown = renderLatestTilMarkdown([
      { title: "Use [skills]", url: "https://til.example/ai/a", date: "2026-04-22" },
    ]);

    assert.equal(markdown, "- [Use \\[skills\\]](https://til.example/ai/a) · 2026-04-22");
  });
});

describe("selectShippedCommits", () => {
  const commit = (repo, subject, date) => ({
    repo: `Adonis0123/${repo}`,
    subject,
    url: `https://github.com/Adonis0123/${repo}/commit/x`,
    date,
  });

  it("drops sync, profile-refresh, merge and blocked-repo commits, newest first", () => {
    const commits = [
      commit("adonis-skills", "🔄 chore(sync): export latest private changes", "2026-10-02T10:00:00Z"),
      commit("Adonis0123", "✨ feat(profile): redesign README", "2026-10-02T09:00:00Z"),
      commit("adonis-pi", "chore(profile): refresh profile data", "2026-10-02T08:00:00Z"),
      commit("nookmark", "Merge branch 'main' of github.com:x", "2026-10-02T07:00:00Z"),
      commit("adonis-skills", "🐛 fix(commit-push): recover once", "2026-09-30T00:00:00Z"),
      commit("adonis-pi", "✨ feat(mcp): switch to the built-in client", "2026-10-01T00:00:00Z"),
      commit("hermes-kit", "📝 docs: update install guide", "2026-09-29T00:00:00Z"),
    ];

    assert.deepEqual(
      selectShippedCommits(commits, 2).map((item) => item.subject),
      ["✨ feat(mcp): switch to the built-in client", "🐛 fix(commit-push): recover once"],
    );
  });
});

describe("renderShippedMarkdown", () => {
  it("renders repo name, linked subject and date", () => {
    const markdown = renderShippedMarkdown([
      {
        repo: "Adonis0123/adonis-pi",
        subject: "✨ feat(mcp): use [builtin] client",
        url: "https://github.com/Adonis0123/adonis-pi/commit/abc",
        date: "2026-10-01T12:00:00Z",
      },
    ]);

    assert.equal(
      markdown,
      "- `adonis-pi` [✨ feat(mcp): use \\[builtin\\] client](https://github.com/Adonis0123/adonis-pi/commit/abc) · 2026-10-01",
    );
  });

  it("says so when nothing shipped", () => {
    assert.match(renderShippedMarkdown([]), /quiet week/);
  });
});

describe("pickWeeklyItem", () => {
  const WEEK = 7 * 24 * 60 * 60 * 1000;

  it("stays the same within a week and rotates to the next item a week later", () => {
    const items = ["a", "b", "c"];
    const start = 10 * WEEK;

    assert.equal(pickWeeklyItem(items, start), "b");
    assert.equal(pickWeeklyItem(items, start + WEEK - 1), "b");
    assert.equal(pickWeeklyItem(items, start + WEEK), "c");
  });

  it("returns undefined for an empty list", () => {
    assert.equal(pickWeeklyItem([], 0), undefined);
  });
});

describe("summarizeDescription", () => {
  it("keeps only the first sentence", () => {
    assert.equal(
      summarizeDescription("Create focused commits. Use when the user asks to commit."),
      "Create focused commits.",
    );
  });

  it("cuts a long sentence at a word boundary with an ellipsis", () => {
    const summary = summarizeDescription("alpha beta, gamma delta epsilon", 18);

    assert.equal(summary, "alpha beta, gamma…");
  });
});

describe("renderSkillOfWeekMarkdown", () => {
  it("links the skill and shows its install command", () => {
    const markdown = renderSkillOfWeekMarkdown({
      name: "workflow-gate",
      summary: "Route work to the right workflow.",
      repo: "Adonis0123/adonis-skills",
    });

    assert.match(
      markdown,
      /^\*\*\[workflow-gate\]\(https:\/\/github\.com\/Adonis0123\/adonis-skills\/tree\/HEAD\/skills\/workflow-gate\)\*\* — Route work/,
    );
    assert.match(markdown, /npx skills add adonis0123\/adonis-skills --skill workflow-gate/);
  });
});
