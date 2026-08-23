#!/usr/bin/env bash
# Origin-side checks for researcher indexing without a harvestable inbox.
set -euo pipefail

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "${tmp_dir}"
}
trap cleanup EXIT

site_dir="${tmp_dir}/_site"
JEKYLL_ENV=production bundle exec jekyll build -d "${site_dir}" >/dev/null

index_html="${site_dir}/index.html"
robots_txt="${site_dir}/robots.txt"
llms_txt="${site_dir}/llms.txt"
index_md="${site_dir}/index.md"

for required in "${index_html}" "${robots_txt}" "${llms_txt}" "${index_md}"; do
  if [ ! -f "${required}" ]; then
    echo "missing built file: ${required}" >&2
    exit 1
  fi
done

if find "${site_dir}" -type f \( -name '*.html' -o -name '*.xml' -o -name '*.txt' -o -name '*.md' -o -name '*.json' \) \
  -print0 | xargs -0 grep -F -- "parthsuresh.work@gmail.com" >/dev/null; then
  echo "harvestable email address leaked into the built site" >&2
  exit 1
fi

if find "${site_dir}" -type f \( -name '*.html' -o -name '*.xml' -o -name '*.txt' -o -name '*.md' -o -name '*.json' \) \
  -print0 | xargs -0 grep -E -- "mailto:[^\"']*parthsuresh" >/dev/null; then
  echo "harvestable mailto: link leaked into the built site" >&2
  exit 1
fi

if ! grep -q 'class="al-email-protect"' "${index_html}"; then
  echo "expected protected email control on the homepage" >&2
  exit 1
fi

if ! grep -q '<h1' "${index_html}"; then
  echo "homepage is missing an H1" >&2
  exit 1
fi

text_chars="$(python3 - "${index_html}" <<'PY'
import re
import sys
from pathlib import Path

html = Path(sys.argv[1]).read_text(encoding="utf-8")
html = re.sub(r"<script\b[^>]*>.*?</script>", " ", html, flags=re.I | re.S)
html = re.sub(r"<style\b[^>]*>.*?</style>", " ", html, flags=re.I | re.S)
text = re.sub(r"<[^>]+>", " ", html)
text = re.sub(r"\s+", " ", text).strip()
print(len(text))
PY
)"

if [ "${text_chars}" -lt 500 ]; then
  echo "homepage raw text is ${text_chars} chars; expected at least 500" >&2
  exit 1
fi

for bot in GPTBot ChatGPT-User OAI-SearchBot ClaudeBot Claude-User Claude-SearchBot Google-Extended Applebot-Extended PerplexityBot Perplexity-User; do
  if ! awk -v bot="${bot}" '
    $0 ~ "^User-agent:[[:space:]]*" bot "$" { in_group = 1; next }
    $0 ~ /^User-agent:/ { in_group = 0 }
    in_group && $0 ~ /^Allow:[[:space:]]*\/[[:space:]]*$/ { found = 1 }
    END { exit found ? 0 : 1 }
  ' "${robots_txt}"; then
    echo "robots.txt must Allow: / for ${bot}" >&2
    exit 1
  fi
done

for bot in Bytespider CCBot Amazonbot; do
  if ! awk -v bot="${bot}" '
    $0 ~ "^User-agent:[[:space:]]*" bot "$" { in_group = 1; next }
    $0 ~ /^User-agent:/ { in_group = 0 }
    in_group && $0 ~ /^Disallow:[[:space:]]*\/[[:space:]]*$/ { found = 1 }
    END { exit found ? 0 : 1 }
  ' "${robots_txt}"; then
    echo "robots.txt must Disallow: / for ${bot}" >&2
    exit 1
  fi
done

if ! grep -q 'Content-Signal: search=yes, ai-input=yes, ai-train=yes' "${robots_txt}"; then
  echo "robots.txt is missing the researcher Content-Signal" >&2
  exit 1
fi

if ! grep -q '^# Parth Suresh' "${llms_txt}"; then
  echo "llms.txt must start with the site H1" >&2
  exit 1
fi

if ! grep -qx '# Parth Suresh' "${index_md}"; then
  echo "index.md must keep the H1 on its own line (production minifier must not collapse it)" >&2
  exit 1
fi

if ! grep -q '/publications/' "${llms_txt}"; then
  echo "llms.txt must link to publications" >&2
  exit 1
fi

if grep -qiE 'parthsuresh\.work@gmail\.com|@[0-9]{7,}' "${llms_txt}" "${index_md}"; then
  echo "machine-readable researcher files must not include email or phone" >&2
  exit 1
fi

if ! grep -q '"@type": "Person"' "${index_html}"; then
  echo "homepage is missing Person JSON-LD" >&2
  exit 1
fi

echo "researcher discovery integration checks passed"
