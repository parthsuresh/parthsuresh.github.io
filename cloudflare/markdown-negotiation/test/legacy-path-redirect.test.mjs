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
      "/assets/img/favicon.png",
      "/robots.txt",
      "/llms.txt",
      "/.well-known/api-catalog",
      "/openapi.json",
      "/auth.md",
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

  it("still 301s trailing-slash canonicals", async () => {
    assert.equal(iconRedirectLocation(pageUrl("/news")), null);
    assert.equal(legacyPathRedirectLocation(pageUrl("/news")), null);
    assert.equal(canonicalRedirectLocation(pageUrl("/news")), `${ORIGIN}${NEWS}`);
    const response = await worker.fetch(request("/news"));
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), `${ORIGIN}${NEWS}`);
  });

  it("still serves the API catalog without redirecting", async () => {
    const response = await worker.fetch(request("/.well-known/api-catalog"));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") || "", /application\/linkset\+json/i);
  });
});
