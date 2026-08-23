import { decide, fromHtml, isPlainTextPath, markdownHeaders, markdownNotFound, siblingPath } from "./negotiate.js";
import { isRobotsPath, robotsResponse } from "./robots-body.js";

function originRequest(request, url) {
  const headers = new Headers(request.headers);
  headers.set("Accept", "text/html");
  headers.delete("Accept-Encoding");
  return new Request(url.toString(), {
    method: "GET",
    headers,
    redirect: "follow",
  });
}

function withVaryAccept(response) {
  const headers = new Headers(response.headers);
  const vary = headers.get("vary");
  if (!vary) {
    headers.set("vary", "Accept");
  } else if (!/\baccept\b/i.test(vary)) {
    headers.set("vary", `${vary}, Accept`);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function markdownResponse(status, body) {
  return new Response(body, {
    status,
    headers: markdownHeaders(body),
  });
}

export default {
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return fetch(request);
    }

    const url = new URL(request.url);
    if (isRobotsPath(url.pathname)) {
      const robots = robotsResponse();
      return new Response(request.method === "HEAD" ? null : robots.body, {
        status: robots.status,
        headers: robots.headers,
      });
    }

    if (decide(request.headers.get("Accept")) === "html") {
      return withVaryAccept(await fetch(request));
    }
    if (isPlainTextPath(url.pathname)) {
      const res = await fetch(originRequest(request, url));
      const body = await res.text();
      if (!res.ok) {
        const missing = markdownNotFound();
        return markdownResponse(missing.status, missing.body);
      }
      return markdownResponse(res.status, body);
    }

    const sibling = new URL(url.toString());
    sibling.pathname = siblingPath(url.pathname);
    const siblingRes = await fetch(originRequest(request, sibling));
    if (siblingRes.ok) {
      return markdownResponse(200, await siblingRes.text());
    }

    const htmlRes = await fetch(originRequest(request, url));
    if (!htmlRes.ok) {
      const missing = markdownNotFound();
      return markdownResponse(missing.status, missing.body);
    }
    const converted = fromHtml(await htmlRes.text());
    return markdownResponse(converted.status, converted.body);
  },
};
