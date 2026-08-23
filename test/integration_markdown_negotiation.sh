#!/usr/bin/env bash
# Verifies Accept: text/markdown negotiation against a built site.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp_dir="$(mktemp -d)"
server_pid=""
cleanup() {
  if [ -n "${server_pid}" ] && kill -0 "${server_pid}" 2>/dev/null; then
    kill "${server_pid}"
    wait "${server_pid}" 2>/dev/null || true
  fi
  rm -rf "${tmp_dir}"
}
trap cleanup EXIT

if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  source "${HOME}/.nvm/nvm.sh"
fi

node --test "${repo_root}/cloudflare/markdown-negotiation/test/"*.test.mjs

site_dir="${tmp_dir}/_site"
JEKYLL_ENV=production bundle exec jekyll build -d "${site_dir}" >/dev/null

for required in "${site_dir}/index.md" "${site_dir}/publications.md" "${site_dir}/news.md" "${site_dir}/404.md"; do
  if [ ! -f "${required}" ]; then
    echo "missing markdown sibling: ${required}" >&2
    exit 1
  fi
done

if ! grep -qx '# Publications' "${site_dir}/publications.md"; then
  echo "publications.md must keep the H1 on its own line" >&2
  exit 1
fi

if ! grep -qx '# News' "${site_dir}/news.md"; then
  echo "news.md must keep the H1 on its own line" >&2
  exit 1
fi

node "${repo_root}/cloudflare/markdown-negotiation/scripts/dev-server.mjs" --root="${site_dir}" --port=4173 >"${tmp_dir}/server.log" &
server_pid=$!

ready=0
for _ in $(seq 1 50); do
  if curl -fsS "http://127.0.0.1:4173/" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 0.1
done
if [ "${ready}" -ne 1 ]; then
  echo "markdown negotiation server failed to start" >&2
  cat "${tmp_dir}/server.log" >&2
  exit 1
fi

html_type="$(curl -sI "http://127.0.0.1:4173/" | tr -d '\r' | awk 'tolower($1)=="content-type:" {print tolower($0)}')"
if ! grep -q 'text/html' <<<"${html_type}"; then
  echo "default homepage must remain HTML, got: ${html_type}" >&2
  exit 1
fi

md_headers="$(curl -sD - -o "${tmp_dir}/home.md" -H "Accept: text/markdown" "http://127.0.0.1:4173/")"
md_headers="${md_headers//$'\r'/}"
if ! grep -qi '^content-type: text/markdown' <<<"${md_headers}"; then
  echo "Accept: text/markdown must return text/markdown" >&2
  echo "${md_headers}" >&2
  exit 1
fi
if ! grep -qi '^vary:.*accept' <<<"${md_headers}"; then
  echo "markdown responses must Vary: Accept" >&2
  echo "${md_headers}" >&2
  exit 1
fi
if ! grep -qi '^x-markdown-tokens:' <<<"${md_headers}"; then
  echo "markdown responses must include x-markdown-tokens" >&2
  echo "${md_headers}" >&2
  exit 1
fi
if ! grep -q '^# Parth Suresh' "${tmp_dir}/home.md"; then
  echo "homepage markdown is missing the H1" >&2
  cat "${tmp_dir}/home.md" >&2
  exit 1
fi

pubs="$(curl -fsS -H "Accept: text/markdown" "http://127.0.0.1:4173/publications/")"
if ! grep -q '^# Publications' <<<"${pubs}"; then
  echo "publications markdown negotiation failed" >&2
  exit 1
fi

missing_status="$(curl -s -o "${tmp_dir}/missing.md" -w '%{http_code}' -H "Accept: text/markdown" "http://127.0.0.1:4173/this-path-does-not-exist")"
if [ "${missing_status}" != "404" ]; then
  echo "missing markdown path must be HTTP 404, got ${missing_status}" >&2
  exit 1
fi
if ! grep -q '^# Page not found' "${tmp_dir}/missing.md"; then
  echo "markdown 404 body is missing recovery text" >&2
  exit 1
fi

echo "markdown negotiation integration checks passed"
