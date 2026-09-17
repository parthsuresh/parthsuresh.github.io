const ICON_REDIRECTS = {
  "/favicon.ico": "/assets/img/favicon.png",
  "/apple-touch-icon.png": "/assets/img/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png": "/assets/img/apple-touch-icon.png",
};

const SIZED_APPLE_TOUCH_ICON_RE = /^\/apple-touch-icon-\d+x\d+(?:-precomposed)?\.png$/;
const APPLE_TOUCH_ICON_ASSET = "/assets/img/apple-touch-icon.png";

function iconTargetPath(pathname) {
  return ICON_REDIRECTS[pathname] || (SIZED_APPLE_TOUCH_ICON_RE.test(pathname) ? APPLE_TOUCH_ICON_ASSET : null);
}

export function iconRedirectLocation(url) {
  const targetPath = iconTargetPath(url.pathname);
  if (!targetPath) {
    return null;
  }
  const target = new URL(url.href);
  target.pathname = targetPath;
  return target.href;
}
