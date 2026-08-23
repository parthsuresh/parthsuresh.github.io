import { prefersMarkdown } from "./accept.js";
import { htmlToMarkdown, tokenCount } from "./html-to-markdown.js";

const MARKDOWN_TYPE = "text/markdown; charset=utf-8";

export function siblingPath(pathname) {
  if (!pathname || pathname === "/") {
    return "/index.md";
  }
  if (pathname.endsWith(".md") || pathname.endsWith(".txt") || pathname.endsWith(".xml")) {
    return pathname;
  }
  if (pathname.endsWith(".html")) {
    return pathname.replace(/\.html$/i, ".md");
  }
  const trimmed = pathname.replace(/\/$/, "");
  return `${trimmed}.md`;
}

export function isPlainTextPath(pathname) {
  return /\.(md|txt|xml)$/i.test(pathname);
}

export function markdownHeaders(markdown, extra = {}) {
  return {
    "content-type": MARKDOWN_TYPE,
    vary: "Accept",
    "x-markdown-tokens": String(tokenCount(markdown)),
    ...extra,
  };
}

export function markdownNotFound() {
  const body = [
    "# Page not found",
    "",
    "Nothing exists at this path.",
    "",
    "Try [llms.txt](/llms.txt), the [homepage](/), [publications](/publications/), or the [sitemap](/sitemap.xml).",
    "",
  ].join("\n");
  return {
    status: 404,
    headers: markdownHeaders(body),
    body,
  };
}

export function decide(acceptHeader) {
  return prefersMarkdown(acceptHeader) ? "markdown" : "html";
}

export function fromHtml(html) {
  const body = htmlToMarkdown(html);
  return {
    status: 200,
    headers: markdownHeaders(body),
    body,
  };
}

export { prefersMarkdown, htmlToMarkdown, tokenCount };
