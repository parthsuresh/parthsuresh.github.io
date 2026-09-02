const CANONICAL_PAGE_RE = /^\/(about|news|contact|publications|privacy)(\.html)?$/;

export function canonicalRedirectLocation(url) {
  const match = url.pathname.match(CANONICAL_PAGE_RE);
  if (!match) {
    return null;
  }
  const target = new URL(url.href);
  target.pathname = `/${match[1]}/`;
  return target.href;
}
