const SITE_ORIGIN = "https://parthsuresh.com";

export const API_CATALOG_PATH = "/.well-known/api-catalog";
export const OPENAPI_PATH = "/openapi.json";

export const API_CATALOG_CONTENT_TYPE = 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"';

export const API_CATALOG = {
  linkset: [
    {
      anchor: `${SITE_ORIGIN}/`,
      "service-desc": [
        {
          href: `${SITE_ORIGIN}/openapi.json`,
          type: "application/json",
        },
      ],
      "service-doc": [
        {
          href: `${SITE_ORIGIN}/llms.txt`,
          type: "text/plain",
        },
      ],
    },
  ],
};

export const HOMEPAGE_LINK_VALUES = [
  `</.well-known/api-catalog>; rel="api-catalog"`,
  `</openapi.json>; rel="service-desc"; type="application/json"`,
  `</llms.txt>; rel="service-doc"; type="text/plain"`,
  `</index.md>; rel="describedby"; type="text/markdown"`,
];

export function isHomepagePath(pathname) {
  return pathname === "/" || pathname === "/index.html";
}

export function isApiCatalogPath(pathname) {
  return pathname === API_CATALOG_PATH;
}

export function isOpenApiPath(pathname) {
  return pathname === OPENAPI_PATH;
}

export function isMarkdownDocumentPath(pathname) {
  return /\.md$/i.test(pathname);
}

export function applyHomepageLinkHeaders(response, pathname) {
  if (!isHomepagePath(pathname)) {
    return response;
  }
  const headers = new Headers(response.headers);
  for (const value of HOMEPAGE_LINK_VALUES) {
    headers.append("Link", value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function apiCatalogResponse(method = "GET") {
  const headers = {
    "content-type": API_CATALOG_CONTENT_TYPE,
    "cache-control": "public, max-age=300",
    Link: `<${API_CATALOG_PATH}>; rel="api-catalog"`,
  };
  const body = method === "HEAD" ? null : `${JSON.stringify(API_CATALOG, null, 2)}\n`;
  return new Response(body, {
    status: 200,
    headers,
  });
}
