import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  API_CATALOG,
  API_CATALOG_CONTENT_TYPE,
  HOMEPAGE_LINK_VALUES,
  applyHomepageLinkHeaders,
  isApiCatalogPath,
  isHomepagePath,
  isMarkdownDocumentPath,
} from "../src/discovery.js";
import worker from "../src/worker.js";

const AUTH_MD = ["# auth.md", "", "This host is public and unauthenticated.", ""].join("\n");
const HOME_HTML = "<html><body><h1>Parth Suresh</h1><p>Works on synthetic data.</p></body></html>";

function linkHeader(response) {
  return response.headers.get("link") || "";
}

function hasRel(header, rel, href) {
  const escapedRel = rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`<${escapedHref}>[^,]*rel="${escapedRel}"`, "i").test(header);
}

function originResponse(request) {
  const url = new URL(typeof request === "string" ? request : request.url);
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return new Response(HOME_HTML, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", vary: "Accept-Encoding" },
    });
  }
  if (url.pathname === "/auth.md") {
    return new Response(AUTH_MD, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  if (url.pathname === "/index.md") {
    return new Response("# Parth Suresh\n", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  if (url.pathname === "/openapi.json") {
    return new Response('{"openapi":"3.1.0"}\n', {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  if (url.pathname === "/about" || url.pathname === "/about.html") {
    return new Response(null, {
      status: 301,
      headers: { location: "https://parthsuresh.com/about/" },
    });
  }
  if (url.pathname === "/news" || url.pathname === "/news.html") {
    return new Response(null, {
      status: 301,
      headers: { location: "https://parthsuresh.com/news/" },
    });
  }
  return new Response("<h1>missing</h1>", {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

describe("discovery helpers", () => {
  it("matches homepage and catalog paths only", () => {
    assert.equal(isHomepagePath("/"), true);
    assert.equal(isHomepagePath("/index.html"), true);
    assert.equal(isHomepagePath("/about/"), false);
    assert.equal(isApiCatalogPath("/.well-known/api-catalog"), true);
    assert.equal(isApiCatalogPath("/.well-known/api-catalog/"), false);
    assert.equal(isMarkdownDocumentPath("/auth.md"), true);
    assert.equal(isMarkdownDocumentPath("/llms.txt"), false);
  });

  it("appends registered Link rels without dropping existing headers", () => {
    const response = applyHomepageLinkHeaders(
      new Response("ok", {
        headers: { vary: "Accept", "x-existing": "keep" },
      }),
      "/"
    );
    const header = linkHeader(response);
    assert.equal(response.headers.get("x-existing"), "keep");
    assert.equal(response.headers.get("vary"), "Accept");
    for (const value of HOMEPAGE_LINK_VALUES) {
      assert.match(header, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });

  it("uses RFC 9727 relation keys rather than a links array", () => {
    assert.ok(Array.isArray(API_CATALOG.linkset));
    assert.equal(API_CATALOG.linkset[0].links, undefined);
    assert.ok(Array.isArray(API_CATALOG.linkset[0]["service-desc"]));
    assert.ok(Array.isArray(API_CATALOG.linkset[0]["service-doc"]));
  });
});

describe("discovery worker", () => {
  let previousFetch;

  beforeEach(() => {
    previousFetch = globalThis.fetch;
    globalThis.fetch = async (input) => originResponse(input);
  });

  afterEach(() => {
    globalThis.fetch = previousFetch;
  });

  it("adds homepage Link headers on GET / HTML and preserves Vary: Accept", async () => {
    const response = await worker.fetch(
      new Request("https://parthsuresh.com/", {
        headers: { Accept: "text/html" },
      })
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/i);
    assert.match(response.headers.get("vary"), /\bAccept\b/i);
    const header = linkHeader(response);
    assert.equal(hasRel(header, "api-catalog", "/.well-known/api-catalog"), true);
    assert.equal(hasRel(header, "service-desc", "/openapi.json"), true);
    assert.equal(hasRel(header, "service-doc", "/llms.txt"), true);
    assert.equal(hasRel(header, "describedby", "/index.md"), true);
  });

  it("adds the same Link headers on HEAD / and GET /index.html", async () => {
    const head = await worker.fetch(new Request("https://parthsuresh.com/", { method: "HEAD" }));
    const indexHtml = await worker.fetch(new Request("https://parthsuresh.com/index.html"));
    for (const response of [head, indexHtml]) {
      const header = linkHeader(response);
      assert.equal(hasRel(header, "api-catalog", "/.well-known/api-catalog"), true);
      assert.equal(hasRel(header, "service-desc", "/openapi.json"), true);
    }
  });

  it("does not add homepage Link headers on other HTML routes", async () => {
    const response = await worker.fetch(new Request("https://parthsuresh.com/about/"));
    assert.equal(hasRel(linkHeader(response), "api-catalog", "/.well-known/api-catalog"), false);
  });

  it("serves GET /.well-known/api-catalog as RFC 9727 linkset JSON", async () => {
    const response = await worker.fetch(new Request("https://parthsuresh.com/.well-known/api-catalog"));
    assert.equal(response.status, 200);
    const contentType = response.headers.get("content-type");
    assert.equal(contentType, API_CATALOG_CONTENT_TYPE);
    assert.match(contentType, /application\/linkset\+json/);
    assert.doesNotMatch(contentType, /^application\/json(?:;|$)/);
    const body = await response.json();
    assert.ok(Array.isArray(body.linkset));
    assert.equal(body.linkset[0].anchor, "https://parthsuresh.com/");
    assert.equal(body.linkset[0]["service-desc"][0].href, "https://parthsuresh.com/openapi.json");
    assert.equal(body.linkset[0]["service-doc"][0].href, "https://parthsuresh.com/llms.txt");
  });

  it("includes rel=api-catalog on HEAD /.well-known/api-catalog", async () => {
    const response = await worker.fetch(new Request("https://parthsuresh.com/.well-known/api-catalog", { method: "HEAD" }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), API_CATALOG_CONTENT_TYPE);
    assert.equal(hasRel(linkHeader(response), "api-catalog", "/.well-known/api-catalog"), true);
    assert.equal(await response.text(), "");
  });

  it("serves GET /auth.md as markdown whose first heading contains auth.md", async () => {
    const response = await worker.fetch(
      new Request("https://parthsuresh.com/auth.md", {
        headers: { Accept: "text/html" },
      })
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/markdown/i);
    const body = await response.text();
    const heading = body.split(/\r?\n/).find((line) => /^#\s+/.test(line));
    assert.match(heading, /auth\.md/i);
  });

  it("keeps canonical 301s for HTML page aliases", async () => {
    const about = await worker.fetch(new Request("https://parthsuresh.com/about"));
    const newsHtml = await worker.fetch(new Request("https://parthsuresh.com/news.html"));
    assert.equal(about.status, 301);
    assert.equal(about.headers.get("location"), "https://parthsuresh.com/about/");
    assert.equal(newsHtml.status, 301);
    assert.equal(newsHtml.headers.get("location"), "https://parthsuresh.com/news/");
  });

  it("passes GET /openapi.json through as JSON", async () => {
    const response = await worker.fetch(
      new Request("https://parthsuresh.com/openapi.json", {
        headers: { Accept: "text/markdown" },
      })
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/json/);
    const body = await response.json();
    assert.equal(body.openapi, "3.1.0");
  });

  it("still negotiates homepage markdown and custom-serves robots.txt", async () => {
    const markdown = await worker.fetch(
      new Request("https://parthsuresh.com/", {
        headers: { Accept: "text/markdown" },
      })
    );
    assert.equal(markdown.status, 200);
    assert.match(markdown.headers.get("content-type"), /text\/markdown/i);
    assert.match(await markdown.text(), /^# Parth Suresh/m);

    const robots = await worker.fetch(new Request("https://parthsuresh.com/robots.txt"));
    assert.equal(robots.status, 200);
    assert.match(robots.headers.get("content-type"), /text\/plain/);
    assert.match(await robots.text(), /User-agent: GPTBot/);
  });
});
