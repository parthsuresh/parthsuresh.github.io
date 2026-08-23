#!/usr/bin/env bash
# Traditional search / social-preview checks. Agent-facing files are covered by
# integration_researcher_discovery.sh and integration_markdown_negotiation.sh.
set -euo pipefail

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "${tmp_dir}"
}
trap cleanup EXIT

site_dir="${tmp_dir}/_site"
JEKYLL_ENV=production bundle exec jekyll build -d "${site_dir}" >/dev/null

index_html="${site_dir}/index.html"
pubs_html="${site_dir}/publications/index.html"
news_html="${site_dir}/news/index.html"
sitemap="${site_dir}/sitemap.xml"
og_image="${site_dir}/assets/img/og-image.png"

for required in "${index_html}" "${pubs_html}" "${news_html}" "${sitemap}" "${og_image}" \
  "${site_dir}/robots.txt" "${site_dir}/llms.txt" "${site_dir}/index.md"; do
  if [ ! -f "${required}" ]; then
    echo "missing built file: ${required}" >&2
    exit 1
  fi
done

require_meta() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if ! grep -q "${pattern}" "${file}"; then
    echo "${label} missing from ${file#"${site_dir}"/}" >&2
    exit 1
  fi
}

require_meta "${index_html}" 'property="og:title"' "og:title"
require_meta "${index_html}" 'property="og:description"' "og:description"
require_meta "${index_html}" 'property="og:image"' "og:image"
require_meta "${index_html}" 'property="og:url"' "og:url"
require_meta "${index_html}" 'name="twitter:card"' "twitter:card"
require_meta "${index_html}" 'name="twitter:site" content="@parthsur"' "twitter:site"
require_meta "${index_html}" 'https://parthsuresh.com/assets/img/og-image.png' "absolute og:image URL"
require_meta "${index_html}" 'synthetic data generation for web-scale and long-context models' "homepage description"
require_meta "${index_html}" '"@type": "Person"' "Person JSON-LD"

if grep -q 'nav-link" href="/">Member of Technical Staff' "${index_html}"; then
  echo "homepage navbar must not use the job title as the about link" >&2
  exit 1
fi
if ! grep -q 'nav-link" href="/">about' "${index_html}"; then
  echo "homepage navbar about link should stay 'about'" >&2
  exit 1
fi
require_meta "${index_html}" 'googletagmanager.com/gtag/js?id=G-V0VBJMMHXD' "Google Analytics gtag"
require_meta "${index_html}" 'G-V0VBJMMHXD' "Google Analytics measurement ID"

require_meta "${pubs_html}" 'Papers by Parth Suresh on synthetic data' "publications description"
require_meta "${news_html}" 'Updates from Parth Suresh on papers, awards, and roles' "news description"

if [ -e "${site_dir}/blog/index.html" ]; then
  echo "empty blog index should not be published while _posts/ is excluded" >&2
  exit 1
fi

if ! grep -q '<loc>https://parthsuresh.com/</loc>' "${sitemap}"; then
  echo "sitemap must include the homepage" >&2
  exit 1
fi
if ! grep -q '<loc>https://parthsuresh.com/publications/</loc>' "${sitemap}"; then
  echo "sitemap must include /publications/" >&2
  exit 1
fi
if ! grep -q '<loc>https://parthsuresh.com/news/</loc>' "${sitemap}"; then
  echo "sitemap must include /news/" >&2
  exit 1
fi
if grep -q '/blog/' "${sitemap}"; then
  echo "sitemap must not include the unpublished blog" >&2
  exit 1
fi
if grep -qE '/news/announcement_' "${sitemap}"; then
  echo "sitemap must not include thin individual news permalinks" >&2
  exit 1
fi
if grep -q '/404.html' "${sitemap}"; then
  echo "sitemap must not include the 404 page" >&2
  exit 1
fi

echo "SEO integration checks passed"
