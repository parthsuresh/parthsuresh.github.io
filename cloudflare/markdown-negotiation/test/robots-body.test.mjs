import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RESEARCHER_ROBOTS, isRobotsPath, robotsResponse } from "../src/robots-body.js";

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
