import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { canonicalRedirectLocation } from "../src/canonical-redirect.js";
import worker from "../src/worker.js";

const STEMS = ["about", "news", "contact", "publications", "privacy"];
const BROWSER_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
const ORIGIN = "https://parthsuresh.com";

function pageUrl(path) {
  return new URL(path, ORIGIN);
}

function htmlRequest(path, { method = "GET" } = {}) {
  return new Request(pageUrl(path), {
    method,
    headers: { Accept: BROWSER_ACCEPT },
  });
}

function markdownRequest(path) {
  return new Request(pageUrl(path), {
    headers: { Accept: "text/markdown" },
  });
}

const originalFetch = globalThis.fetch;

function mockFetch(handler) {
  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    return handler(request);
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("canonicalRedirectLocation", () => {
  for (const stem of STEMS) {
    it(`maps /${stem} and /${stem}.html to /${stem}/`, () => {
      assert.equal(canonicalRedirectLocation(pageUrl(`/${stem}`)), `${ORIGIN}/${stem}/`);
      assert.equal(canonicalRedirectLocation(pageUrl(`/${stem}.html`)), `${ORIGIN}/${stem}/`);
    });

    it(`leaves /${stem}/ and /${stem}.md alone`, () => {
      assert.equal(canonicalRedirectLocation(pageUrl(`/${stem}/`)), null);
      assert.equal(canonicalRedirectLocation(pageUrl(`/${stem}.md`)), null);
    });
  }

  it("preserves the query string", () => {
    assert.equal(canonicalRedirectLocation(pageUrl("/news?utm_source=google")), `${ORIGIN}/news/?utm_source=google`);
    assert.equal(canonicalRedirectLocation(pageUrl("/about.html?ref=1")), `${ORIGIN}/about/?ref=1`);
  });

  it("does not redirect the homepage, assets, or discovery files", () => {
    for (const path of [
      "/",
      "/index.html",
      "/sitemap.xml",
      "/robots.txt",
      "/llms.txt",
      "/auth.md",
      "/openapi.json",
      "/.well-known/api-catalog",
      "/assets/css/main.css",
      "/blog",
    ]) {
      assert.equal(canonicalRedirectLocation(pageUrl(path)), null, path);
    }
  });
});

describe("worker HTML redirects", () => {
  for (const stem of STEMS) {
    it(`301s HTML GET /${stem} to /${stem}/`, async () => {
      const response = await worker.fetch(htmlRequest(`/${stem}`));
      assert.equal(response.status, 301);
      assert.equal(response.headers.get("location"), `${ORIGIN}/${stem}/`);
    });

    it(`301s HTML GET /${stem}.html to /${stem}/`, async () => {
      const response = await worker.fetch(htmlRequest(`/${stem}.html`));
      assert.equal(response.status, 301);
      assert.equal(response.headers.get("location"), `${ORIGIN}/${stem}/`);
    });
  }

  it("301s HTML HEAD /news.html and keeps the query string", async () => {
    const response = await worker.fetch(htmlRequest("/news.html?q=1", { method: "HEAD" }));
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), `${ORIGIN}/news/?q=1`);
  });

  it("301s markdown GET /news so agents follow the same slash URL", async () => {
    const response = await worker.fetch(markdownRequest("/news"));
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), `${ORIGIN}/news/`);
  });

  it("does not fetch origin for a slash redirect", async () => {
    let fetched = false;
    mockFetch(async () => {
      fetched = true;
      return new Response("should not run", { status: 500 });
    });
    const response = await worker.fetch(htmlRequest("/news"));
    assert.equal(response.status, 301);
    assert.equal(fetched, false);
  });
});

describe("worker leaves slash, markdown siblings, and other paths alone", () => {
  it("does not redirect /news.md", async () => {
    mockFetch(async (request) => {
      assert.equal(new URL(request.url).pathname, "/news.md");
      return new Response("# News\n", {
        status: 200,
        headers: { "content-type": "text/markdown; charset=utf-8" },
      });
    });
    const response = await worker.fetch(markdownRequest("/news.md"));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/markdown/);
    assert.match(await response.text(), /^# News/m);
  });

  it("still negotiates markdown on /news/ after the slash redirect target", async () => {
    mockFetch(async (request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === "/news.md") {
        return new Response("# News\n", {
          status: 200,
          headers: { "content-type": "text/markdown; charset=utf-8" },
        });
      }
      return new Response("missing", { status: 404 });
    });
    const response = await worker.fetch(markdownRequest("/news/"));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/markdown/);
    assert.match(await response.text(), /^# News/m);
  });

  it("does not redirect HTML /news/", async () => {
    mockFetch(async (request) => {
      assert.equal(new URL(request.url).pathname, "/news/");
      return new Response("<html><body>news</body></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    });
    const response = await worker.fetch(htmlRequest("/news/"));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(await response.text(), /news/);
  });

  it("does not redirect /index.html, /sitemap.xml, or /llms.txt", async () => {
    const seen = [];
    mockFetch(async (request) => {
      seen.push(new URL(request.url).pathname);
      const pathname = new URL(request.url).pathname;
      const type = pathname.endsWith(".xml") ? "application/xml" : pathname.endsWith(".txt") ? "text/plain" : "text/html";
      return new Response("ok", { status: 200, headers: { "content-type": `${type}; charset=utf-8` } });
    });

    for (const path of ["/index.html", "/sitemap.xml", "/llms.txt"]) {
      const response = await worker.fetch(htmlRequest(path));
      assert.equal(response.status, 200, path);
    }
    assert.deepEqual(seen, ["/index.html", "/sitemap.xml", "/llms.txt"]);
  });
});
