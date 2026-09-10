const NEWS_PATH = "/news/";

function isLegacyBlogPath(pathname) {
  return pathname === "/blog" || pathname.startsWith("/blog/");
}

function isLegacyPostsPath(pathname) {
  return pathname === "/posts" || pathname === "/posts/";
}

export function legacyPathRedirectLocation(url) {
  if (!isLegacyBlogPath(url.pathname) && !isLegacyPostsPath(url.pathname)) {
    return null;
  }
  const target = new URL(url.href);
  target.pathname = NEWS_PATH;
  return target.href;
}
