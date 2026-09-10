const ICON_REDIRECTS = {
  "/favicon.ico": "/assets/img/favicon.png",
  "/apple-touch-icon.png": "/assets/img/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png": "/assets/img/apple-touch-icon.png",
};

export function iconRedirectLocation(url) {
  const targetPath = ICON_REDIRECTS[url.pathname];
  if (!targetPath) {
    return null;
  }
  const target = new URL(url.href);
  target.pathname = targetPath;
  return target.href;
}
