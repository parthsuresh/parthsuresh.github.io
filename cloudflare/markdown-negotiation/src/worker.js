import { canonicalRedirectLocation } from "./canonical-redirect.js";
import { applyHomepageLinkHeaders, apiCatalogResponse, isApiCatalogPath, isMarkdownDocumentPath, isOpenApiPath } from "./discovery.js";
import { decide, fromHtml, isPlainTextPath, markdownHeaders, markdownNotFound, siblingPath } from "./negotiate.js";
import { isRobotsPath, robotsResponse } from "./robots-body.js";
import { stripHarvestableContact } from "./strip-contact.js";

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

function markdownResponse(status, body, method = "GET") {
  return new Response(method === "HEAD" ? null : body, {
    status,
    headers: markdownHeaders(body),
  });
}

function methodBody(method, response) {
  if (method === "HEAD") {
    return new Response(null, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
  return response;
}

async function htmlFromOrigin(request) {
  const url = new URL(request.url);
  const response = await fetch(request);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return applyHomepageLinkHeaders(withVaryAccept(response), url.pathname);
  }
  const body = stripHarvestableContact(await response.text());
  return applyHomepageLinkHeaders(
    withVaryAccept(
      new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    ),
    url.pathname
  );
}

async function markdownFromOrigin(request, url) {
  const res = await fetch(originRequest(request, url));
  const body = await res.text();
  if (!res.ok) {
    const missing = markdownNotFound();
    return markdownResponse(missing.status, missing.body, request.method);
  }
  return markdownResponse(res.status, body, request.method);
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

    if (isApiCatalogPath(url.pathname)) {
      return apiCatalogResponse(request.method);
    }

    const canonical = canonicalRedirectLocation(url);
    if (canonical) {
      return Response.redirect(canonical, 301);
    }

    if (isOpenApiPath(url.pathname)) {
      return methodBody(request.method, await htmlFromOrigin(request));
    }

    if (isMarkdownDocumentPath(url.pathname)) {
      return markdownFromOrigin(request, url);
    }

    if (decide(request.headers.get("Accept")) === "html") {
      return htmlFromOrigin(request);
    }
    if (isPlainTextPath(url.pathname)) {
      return markdownFromOrigin(request, url);
    }

    const sibling = new URL(url.toString());
    sibling.pathname = siblingPath(url.pathname);
    const siblingRes = await fetch(originRequest(request, sibling));
    if (siblingRes.ok) {
      return markdownResponse(200, await siblingRes.text(), request.method);
    }

    const htmlRes = await fetch(originRequest(request, url));
    if (!htmlRes.ok) {
      const missing = markdownNotFound();
      return markdownResponse(missing.status, missing.body, request.method);
    }
    const converted = fromHtml(stripHarvestableContact(await htmlRes.text()));
    return markdownResponse(converted.status, converted.body, request.method);
  },
};
