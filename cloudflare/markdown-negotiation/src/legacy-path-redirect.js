const NEWS_PATH = "/news/";

// Exact leftover template URLs. Other /al-folio/* paths stay untouched.
const AL_FOLIO_REDIRECTS = {
  "/al-folio/publications": "/publications/",
  "/al-folio/publications/": "/publications/",
  "/al-folio": "/",
  "/al-folio/": "/",
};

function isLegacyBlogPath(pathname) {
  return pathname === "/blog" || pathname.startsWith("/blog/");
}

function isLegacyPostsPath(pathname) {
  return pathname === "/posts" || pathname === "/posts/";
}

function legacyTargetPath(pathname) {
  if (isLegacyBlogPath(pathname) || isLegacyPostsPath(pathname)) {
    return NEWS_PATH;
  }
  return AL_FOLIO_REDIRECTS[pathname] || null;
}

export function legacyPathRedirectLocation(url) {
  const pathname = legacyTargetPath(url.pathname);
  if (!pathname) {
    return null;
  }
  const target = new URL(url.href);
  target.pathname = pathname;
  return target.href;
}
