import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { htmlToMarkdown, tokenCount } from "../src/html-to-markdown.js";
import { siblingPath } from "../src/negotiate.js";

describe("htmlToMarkdown", () => {
  it("strips chrome and keeps headings, links, and paragraphs", () => {
    const html = `
      <html><head><style>body{color:red}</style></head>
      <body>
        <nav><a href="/">Home</a></nav>
        <article>
          <h1>Parth Suresh</h1>
          <p>Works on <a href="https://www.datologyai.com/">synthetic data</a>.</p>
        </article>
        <footer>copyright</footer>
      </body></html>`;
    const markdown = htmlToMarkdown(html);
    assert.match(markdown, /^# Parth Suresh/m);
    assert.match(markdown, /\[synthetic data\]\(https:\/\/www\.datologyai\.com\/\)/);
    assert.doesNotMatch(markdown, /copyright/);
    assert.doesNotMatch(markdown, /<nav>/);
  });

  it("counts tokens for the markdown-tokens header", () => {
    assert.equal(tokenCount("abcd"), 1);
    assert.equal(tokenCount("abcdefgh"), 2);
  });
});

describe("siblingPath", () => {
  it("maps HTML routes to markdown siblings", () => {
    assert.equal(siblingPath("/"), "/index.md");
    assert.equal(siblingPath("/publications/"), "/publications.md");
    assert.equal(siblingPath("/news"), "/news.md");
    assert.equal(siblingPath("/404.html"), "/404.md");
  });
});
