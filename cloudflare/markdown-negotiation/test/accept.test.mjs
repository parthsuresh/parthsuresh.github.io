import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prefersMarkdown } from "../src/accept.js";

describe("prefersMarkdown", () => {
  it("returns markdown for Accept: text/markdown", () => {
    assert.equal(prefersMarkdown("text/markdown"), true);
  });

  it("returns markdown when markdown outranks html", () => {
    assert.equal(prefersMarkdown("text/markdown, text/html;q=0.9"), true);
  });

  it("returns markdown for text/*", () => {
    assert.equal(prefersMarkdown("text/*"), true);
  });

  it("returns HTML for */*", () => {
    assert.equal(prefersMarkdown("*/*"), false);
  });

  it("returns HTML for a typical browser Accept", () => {
    assert.equal(prefersMarkdown("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"), false);
  });

  it("returns HTML when html outranks markdown", () => {
    assert.equal(prefersMarkdown("text/html, text/markdown;q=0.5"), false);
  });

  it("returns HTML when markdown is q=0", () => {
    assert.equal(prefersMarkdown("text/markdown;q=0, text/html"), false);
  });

  it("returns HTML when Accept is missing", () => {
    assert.equal(prefersMarkdown(""), false);
    assert.equal(prefersMarkdown(null), false);
  });
});
