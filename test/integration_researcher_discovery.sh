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

if ! python3 - "${index_html}" <<'PY'
import json
import re
import sys
from pathlib import Path

html = Path(sys.argv[1]).read_text(encoding="utf-8")
found = False
for raw in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, flags=re.I | re.S):
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = json.loads(raw, strict=False)
    if data.get("@type") != "Person":
        continue
    same_as = data.get("sameAs") or []
    if (
        data.get("name") == "Parth Suresh"
        and data.get("jobTitle")
        and same_as
        and "email" not in data
        and "telephone" not in data
        and "contactPoint" not in data
    ):
        found = True
if not found:
    raise SystemExit(1)
PY
then
  echo "homepage Person JSON-LD must include name, jobTitle, and sameAs without email or telephone" >&2
  exit 1
fi

if ! grep -q 'property="og:type"' "${index_html}"; then
  echo "homepage is missing og:type" >&2
  exit 1
fi

if ! grep -q 'property="og:image"' "${index_html}"; then
  echo "homepage is missing og:image" >&2
  exit 1
fi

if ! grep -q 'prof_pic.jpg' "${index_html}"; then
  echo "og:image should point at the profile photo" >&2
  exit 1
fi

if ! grep -q '## When to use this' "${llms_txt}"; then
  echo "llms.txt must include a When to use this section" >&2
  exit 1
fi

if ! grep -q 'Distinguish this Parth Suresh' "${llms_txt}"; then
  echo "llms.txt when-to-use guidance must name a concrete job" >&2
  exit 1
fi

if ! grep -q '/.well-known/api-catalog' "${llms_txt}"; then
  echo "llms.txt must mention the discovery catalog" >&2
  exit 1
fi

if ! grep -q '/openapi.json' "${llms_txt}"; then
  echo "llms.txt must mention the OpenAPI document" >&2
  exit 1
fi

if ! grep -q 'still not a product, RPC, or write API' "${llms_txt}"; then
  echo "llms.txt must say this host is still not a product API" >&2
  exit 1
fi

if ! grep -q 'no MCP server, inbox, or phone number' "${llms_txt}"; then
  echo "llms.txt must keep saying there is no MCP, inbox, or phone" >&2
  exit 1
fi

auth_md="${site_dir}/auth.md"
if [ ! -f "${auth_md}" ]; then
  echo "missing built file: ${auth_md}" >&2
  exit 1
fi

if ! grep -q '^# auth.md' "${auth_md}"; then
  echo "auth.md H1 must contain auth.md" >&2
  exit 1
fi

if ! grep -q 'no registration or provisioning endpoint' "${auth_md}"; then
  echo "auth.md must say there is no registration endpoint" >&2
  exit 1
fi

if ! grep -q 'Anonymous public GET only' "${auth_md}"; then
  echo "auth.md must say access is anonymous public GET" >&2
  exit 1
fi

openapi_json="${site_dir}/openapi.json"
if [ ! -f "${openapi_json}" ]; then
  echo "missing built file: ${openapi_json}" >&2
  exit 1
fi

if ! python3 - "${openapi_json}" <<'PY'
import json
import sys
from pathlib import Path

spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
if not str(spec.get("openapi", "")).startswith("3.1"):
    raise SystemExit("openapi version must be 3.1.x")
if any(methods.keys() - {"get", "head", "options", "parameters"} for methods in spec.get("paths", {}).values()):
    raise SystemExit("openapi must not advertise write methods")
if spec.get("components", {}).get("securitySchemes"):
    raise SystemExit("openapi must not invent security schemes")
if "/.well-known/api-catalog" not in spec.get("paths", {}):
    raise SystemExit("openapi must document the api-catalog")
if "/auth.md" not in spec.get("paths", {}):
    raise SystemExit("openapi must document /auth.md")
PY
then
  echo "openapi.json must be an honest OpenAPI 3.1 GET-only document" >&2
  exit 1
fi

for page_name in about contact privacy; do
  page_html="${site_dir}/${page_name}/index.html"
  if [ ! -f "${page_html}" ]; then
    echo "missing trust page: ${page_html}" >&2
    exit 1
  fi
  page_chars="$(python3 - "${page_html}" <<'PY'
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
  if [ "${page_chars}" -lt 500 ]; then
    echo "${page_name} page raw text is ${page_chars} chars; expected at least 500" >&2
    exit 1
  fi
done

if ! grep -qx '# About' "${site_dir}/about.md"; then
  echo "about.md must keep the H1 on its own line" >&2
  exit 1
fi

if ! grep -qx '# Contact' "${site_dir}/contact.md"; then
  echo "contact.md must keep the H1 on its own line" >&2
  exit 1
fi

if ! grep -qx '# Privacy' "${site_dir}/privacy.md"; then
  echo "privacy.md must keep the H1 on its own line" >&2
  exit 1
fi

if ! grep -q 'no public email address' "${site_dir}/contact/index.html"; then
  echo "contact page must say there is no public inbox" >&2
  exit 1
fi

if grep -qiE 'parthsuresh\.work@gmail\.com|mailto:|telephone' "${site_dir}/contact/index.html" "${site_dir}/privacy/index.html" "${site_dir}/about/index.html"; then
  echo "trust pages must not publish email, mailto, or telephone" >&2
  exit 1
fi

echo "researcher discovery integration checks passed"
