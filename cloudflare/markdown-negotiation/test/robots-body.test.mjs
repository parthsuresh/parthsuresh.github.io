import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RESEARCHER_ROBOTS, isRobotsPath, robotsResponse } from "../src/robots-body.js";
import { stripHarvestableContact } from "../src/strip-contact.js";

describe("stripHarvestableContact", () => {
  it("removes obfuscated mailto handlers from HTML", () => {
    const html = 'window.open("mailto:%70%61%72%74%68%73%75%72%65%73%68.%77%6F%72%6B@%67%6D%61%69%6C.%63%6F%6D", "_blank");';
    const rewritten = stripHarvestableContact(html);
    assert.equal(rewritten.includes("mailto:"), false);
    assert.equal(rewritten.includes("@"), false);
  });

  it("keeps the published public address", () => {
    const html = '<a href="mailto:parth@parthsuresh.com">email</a>';
    assert.equal(stripHarvestableContact(html), html);
  });

  it("keeps a percent-encoded public address and still strips other mailtos", () => {
    const html = '<a href="mailto:%70%61%72%74%68@parthsuresh.com">ok</a><a href="mailto:other@example.com">no</a>';
    const rewritten = stripHarvestableContact(html);
    assert.match(rewritten, /mailto:%70%61%72%74%68@parthsuresh\.com/);
    assert.doesNotMatch(rewritten, /mailto:other@example\.com/);
    assert.match(rewritten, /href="#"/);
  });
});

describe("researcher robots body", () => {
  it("allows frontier lab crawlers and blocks bulk scrapers", () => {
    assert.match(RESEARCHER_ROBOTS, /User-agent: GPTBot\nAllow: \//);
    assert.match(RESEARCHER_ROBOTS, /User-agent: ClaudeBot\nAllow: \//);
    assert.match(RESEARCHER_ROBOTS, /User-agent: Google-Extended\nAllow: \//);
    assert.match(RESEARCHER_ROBOTS, /User-agent: Bytespider\nDisallow: \//);
    assert.match(RESEARCHER_ROBOTS, /Content-Signal: search=yes, ai-input=yes, ai-train=yes/);
    assert.doesNotMatch(RESEARCHER_ROBOTS, /Cloudflare Managed/i);
  });

  it("only matches the robots.txt path", () => {
    assert.equal(isRobotsPath("/robots.txt"), true);
    assert.equal(isRobotsPath("/llms.txt"), false);
    assert.equal(isRobotsPath("/"), false);
  });

  it("serves plain text", () => {
    const response = robotsResponse();
    assert.equal(response.status, 200);
    assert.equal(response.headers["content-type"], "text/plain; charset=utf-8");
    assert.equal(response.body, RESEARCHER_ROBOTS);
  });
});
