import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { iconRedirectLocation } from "../src/icon-redirect.js";
import worker from "../src/worker.js";

const ORIGIN = "https://parthsuresh.com";
const BROWSER_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
const FAVICON_ACCEPT = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";

const ICON_PATHS = [
  ["/favicon.ico", "/assets/img/favicon.png"],
  ["/apple-touch-icon.png", "/assets/img/apple-touch-icon.png"],
  ["/apple-touch-icon-precomposed.png", "/assets/img/apple-touch-icon.png"],
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

describe("iconRedirectLocation", () => {
  for (const [from, to] of ICON_PATHS) {
    it(`maps ${from} to ${to}`, () => {
      assert.equal(iconRedirectLocation(pageUrl(from)), `${ORIGIN}${to}`);
    });
  }

  it("preserves the query string", () => {
    assert.equal(iconRedirectLocation(pageUrl("/favicon.ico?v=2")), `${ORIGIN}/assets/img/favicon.png?v=2`);
  });

  it("does not redirect canonical icons, pages, or discovery files", () => {
    for (const path of [
      "/",
      "/about",
      "/news/",
      "/favicon.png",
      "/assets/img/favicon.png",
      "/assets/img/apple-touch-icon.png",
      "/robots.txt",
      "/llms.txt",
      "/.well-known/api-catalog",
      "/openapi.json",
      "/auth.md",
      "/blog",
    ]) {
      assert.equal(iconRedirectLocation(pageUrl(path)), null, path);
    }
  });
});

describe("worker icon redirects", () => {
  for (const [from, to] of ICON_PATHS) {
    it(`301s HTML GET ${from} to ${to} and is not an HTML 404`, async () => {
      const response = await worker.fetch(request(from));
      assert.equal(response.status, 301);
      assert.equal(response.headers.get("location"), `${ORIGIN}${to}`);
      assert.notEqual(response.status, 404);
      const contentType = response.headers.get("content-type") || "";
      assert.doesNotMatch(contentType, /text\/html/i);
    });

    it(`301s favicon-style GET ${from} without fetching origin`, async () => {
      let fetched = false;
      mockFetch(async () => {
        fetched = true;
        return new Response("<title>Page not found | Parth Suresh</title>", {
          status: 404,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      });
      const response = await worker.fetch(request(from, { accept: FAVICON_ACCEPT }));
      assert.equal(response.status, 301);
      assert.equal(response.headers.get("location"), `${ORIGIN}${to}`);
      assert.equal(fetched, false);
    });
  }

  it("301s HEAD /favicon.ico and keeps the query string", async () => {
    const response = await worker.fetch(request("/favicon.ico?v=2", { method: "HEAD" }));
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), `${ORIGIN}/assets/img/favicon.png?v=2`);
  });

  it("301s markdown GET /favicon.ico so agents follow the same asset URL", async () => {
    const response = await worker.fetch(request("/favicon.ico", { accept: "text/markdown" }));
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), `${ORIGIN}/assets/img/favicon.png`);
  });

  it("does not serve the HTML 404 layout when origin would 404 the icon", async () => {
    mockFetch(async () => {
      return new Response("<!DOCTYPE html><title>Page not found | Parth Suresh</title>", {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    });
    const response = await worker.fetch(request("/favicon.ico", { accept: FAVICON_ACCEPT }));
    assert.equal(response.status, 301);
    assert.notEqual(response.status, 404);
    assert.doesNotMatch(response.headers.get("content-type") || "", /text\/html/i);
    assert.equal(await response.text(), "");
  });
});
