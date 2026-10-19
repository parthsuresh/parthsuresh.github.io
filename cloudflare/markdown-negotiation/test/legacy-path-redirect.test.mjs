import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { canonicalRedirectLocation } from "../src/canonical-redirect.js";
import { iconRedirectLocation } from "../src/icon-redirect.js";
import { legacyPathRedirectLocation } from "../src/legacy-path-redirect.js";
import worker from "../src/worker.js";

const ORIGIN = "https://parthsuresh.com";
const BROWSER_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
const NEWS = "/news/";

const LEGACY_PATHS = ["/blog", "/blog/", "/blog/2021/distill/", "/blog/2024/some-post", "/posts", "/posts/"];

const AL_FOLIO_PATHS = [
  ["/al-folio", "/"],
  ["/al-folio/", "/"],
  ["/al-folio/publications", "/publications/"],
  ["/al-folio/publications/", "/publications/"],
];

function pageUrl(path) {
  return new URL(path, ORIGIN);
}

function request(path, { method = "GET", accept = BROWSER_ACCEPT } = {}) {
  return new Request(pageUrl(path), {
    method,
    headers: { Accept: accept },
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

describe("legacyPathRedirectLocation", () => {
  for (const from of LEGACY_PATHS) {
    it(`maps ${from} to ${NEWS}`, () => {
      assert.equal(legacyPathRedirectLocation(pageUrl(from)), `${ORIGIN}${NEWS}`);
    });
  }

  it("preserves the query string", () => {
    assert.equal(legacyPathRedirectLocation(pageUrl("/blog?utm_source=ga")), `${ORIGIN}${NEWS}?utm_source=ga`);
    assert.equal(legacyPathRedirectLocation(pageUrl("/posts/?ref=1")), `${ORIGIN}${NEWS}?ref=1`);
  });

  for (const [from, to] of AL_FOLIO_PATHS) {
    it(`maps ${from} to ${to}`, () => {
      assert.equal(legacyPathRedirectLocation(pageUrl(from)), `${ORIGIN}${to}`);
    });
  }

  it("preserves the query string on al-folio paths", () => {
    assert.equal(legacyPathRedirectLocation(pageUrl("/al-folio?utm_source=ga")), `${ORIGIN}/?utm_source=ga`);
    assert.equal(legacyPathRedirectLocation(pageUrl("/al-folio/?ref=1")), `${ORIGIN}/?ref=1`);
    assert.equal(legacyPathRedirectLocation(pageUrl("/al-folio/publications?utm_source=ga")), `${ORIGIN}/publications/?utm_source=ga`);
    assert.equal(legacyPathRedirectLocation(pageUrl("/al-folio/publications/?ref=1")), `${ORIGIN}/publications/?ref=1`);
  });

  it("does not redirect live pages, icons, or discovery files", () => {
    for (const path of [
      "/",
      "/about",
      "/about/",
      "/news",
      "/news/",
      "/contact/",
      "/publications/",
      "/blogging",
      "/blog.html",
      "/post",
      "/posts.html",
      "/favicon.ico",
      "/apple-touch-icon.png",
      "/apple-touch-icon-precomposed.png",
      "/apple-touch-icon-180x180.png",
      "/apple-touch-icon-60x60.png",
      "/assets/img/favicon.png",
      "/robots.txt",
      "/llms.txt",
      "/.well-known/api-catalog",
      "/openapi.json",
      "/auth.md",
      "/al-folio/about",
      "/al-folio/news/",
      "/al-folio/publications/index.html",
      "/al-folio.html",
      "/alfolio",
    ]) {
      assert.equal(legacyPathRedirectLocation(pageUrl(path)), null, path);
    }
  });
});

describe("worker legacy path redirects", () => {
  for (const from of LEGACY_PATHS) {
    it(`301s HTML GET ${from} to ${NEWS} and is not an HTML 404`, async () => {
      const response = await worker.fetch(request(from));
      assert.equal(response.status, 301);
      assert.equal(response.headers.get("location"), `${ORIGIN}${NEWS}`);
      assert.notEqual(response.status, 404);
      const contentType = response.headers.get("content-type") || "";
      assert.doesNotMatch(contentType, /text\/html/i);
    });

    it(`301s HTML GET ${from} without fetching origin`, async () => {
      let fetched = false;
      mockFetch(async () => {
        fetched = true;
        return new Response("<title>Page not found | Parth Suresh</title>", {
          status: 404,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      });
      const response = await worker.fetch(request(from));
      assert.equal(response.status, 301);
      assert.equal(response.headers.get("location"), `${ORIGIN}${NEWS}`);
      assert.equal(fetched, false);
    });
  }

  it("301s HEAD /blog and keeps the query string", async () => {
    const response = await worker.fetch(request("/blog?utm_source=ga", { method: "HEAD" }));
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), `${ORIGIN}${NEWS}?utm_source=ga`);
  });

  it("301s markdown GET /blog so agents follow the same news URL", async () => {
    const response = await worker.fetch(request("/blog", { accept: "text/markdown" }));
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), `${ORIGIN}${NEWS}`);
  });

  for (const [from, to] of AL_FOLIO_PATHS) {
    it(`301s HTML GET ${from} to ${to} and is not an HTML 404`, async () => {
      const response = await worker.fetch(request(from));
      assert.equal(response.status, 301);
      assert.equal(response.headers.get("location"), `${ORIGIN}${to}`);
      assert.notEqual(response.status, 404);
      const contentType = response.headers.get("content-type") || "";
      assert.doesNotMatch(contentType, /text\/html/i);
    });

    it(`301s HTML GET ${from} without fetching origin`, async () => {
      let fetched = false;
      mockFetch(async () => {
        fetched = true;
        return new Response("<title>Page not found | Parth Suresh</title>", {
          status: 404,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      });
      const response = await worker.fetch(request(from));
      assert.equal(response.status, 301);
      assert.equal(response.headers.get("location"), `${ORIGIN}${to}`);
      assert.equal(fetched, false);
    });
  }

  it("301s HEAD /al-folio and /al-folio/publications/ and keeps the query string", async () => {
    const home = await worker.fetch(request("/al-folio?utm_source=ga", { method: "HEAD" }));
    assert.equal(home.status, 301);
    assert.equal(home.headers.get("location"), `${ORIGIN}/?utm_source=ga`);

    const publications = await worker.fetch(request("/al-folio/publications/?ref=1", { method: "HEAD" }));
    assert.equal(publications.status, 301);
    assert.equal(publications.headers.get("location"), `${ORIGIN}/publications/?ref=1`);
  });

  it("301s markdown GET /al-folio so agents follow the same URLs", async () => {
    const home = await worker.fetch(request("/al-folio/", { accept: "text/markdown" }));
    assert.equal(home.status, 301);
    assert.equal(home.headers.get("location"), `${ORIGIN}/`);

    const publications = await worker.fetch(request("/al-folio/publications", { accept: "text/markdown" }));
    assert.equal(publications.status, 301);
    assert.equal(publications.headers.get("location"), `${ORIGIN}/publications/`);
  });

  it("does not serve the HTML 404 layout when origin would 404 /blog", async () => {
    mockFetch(async () => {
      return new Response("<!DOCTYPE html><title>Page not found | Parth Suresh</title>", {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    });
    const response = await worker.fetch(request("/blog"));
    assert.equal(response.status, 301);
    assert.notEqual(response.status, 404);
    assert.doesNotMatch(response.headers.get("content-type") || "", /text\/html/i);
    assert.equal(await response.text(), "");
  });
});

describe("legacy redirects leave existing worker routes intact", () => {
  it("still 301s root favicon probes", async () => {
    const response = await worker.fetch(request("/favicon.ico"));
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), `${ORIGIN}/assets/img/favicon.png`);
  });

  it("still 301s sized apple-touch-icon probes", async () => {
    const response = await worker.fetch(request("/apple-touch-icon-180x180.png"));
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), `${ORIGIN}/assets/img/apple-touch-icon.png`);
  });

  it("still 301s trailing-slash canonicals", async () => {
    assert.equal(iconRedirectLocation(pageUrl("/news")), null);
    assert.equal(legacyPathRedirectLocation(pageUrl("/news")), null);
    assert.equal(canonicalRedirectLocation(pageUrl("/news")), `${ORIGIN}${NEWS}`);
    const response = await worker.fetch(request("/news"));
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), `${ORIGIN}${NEWS}`);
  });

  it("still 301s /blog and /posts to /news/", async () => {
    for (const from of ["/blog", "/blog/2021/distill/", "/posts", "/posts/"]) {
      assert.equal(legacyPathRedirectLocation(pageUrl(from)), `${ORIGIN}${NEWS}`);
      const response = await worker.fetch(request(from));
      assert.equal(response.status, 301);
      assert.equal(response.headers.get("location"), `${ORIGIN}${NEWS}`);
    }
  });

  it("still 301s /publications through the canonical redirect", async () => {
    assert.equal(legacyPathRedirectLocation(pageUrl("/publications")), null);
    assert.equal(iconRedirectLocation(pageUrl("/publications")), null);
    assert.equal(canonicalRedirectLocation(pageUrl("/publications")), `${ORIGIN}/publications/`);
    const response = await worker.fetch(request("/publications"));
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), `${ORIGIN}/publications/`);
  });

  it("does not let icon or canonical redirects claim al-folio paths", () => {
    for (const [from] of AL_FOLIO_PATHS) {
      assert.equal(iconRedirectLocation(pageUrl(from)), null, from);
      assert.equal(canonicalRedirectLocation(pageUrl(from)), null, from);
    }
  });

  it("still serves the API catalog without redirecting", async () => {
    const response = await worker.fetch(request("/.well-known/api-catalog"));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") || "", /application\/linkset\+json/i);
  });
});
