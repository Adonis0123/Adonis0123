import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collectDocsPages,
  countPublishedSkills,
  isQualityCandidate,
  parseFrontmatter,
  renderLatestTilMarkdown,
  renderStatsMarkdown,
  replaceMarkerBlock,
  selectLatestTil,
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
