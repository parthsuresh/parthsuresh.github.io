#!/usr/bin/env bash
set -euo pipefail

base="${VERIFY_BASE_URL:-http://127.0.0.1:4000}"

code="$(curl -fsS -o /tmp/parthsuresh-verify-doctor-home.html -w '%{http_code}' "${base}/")"
if [ "${code}" != "200" ]; then
  echo "doctor: ${base}/ returned ${code}" >&2
  exit 1
fi
if ! grep -q 'nav-link" href="/">about' /tmp/parthsuresh-verify-doctor-home.html; then
  echo "doctor: homepage navbar label is not about" >&2
  exit 1
fi

for path in /publications/ /news/; do
  path_code="$(curl -fsS -o /dev/null -w '%{http_code}' "${base}${path}")"
  if [ "${path_code}" != "200" ]; then
    echo "doctor: ${base}${path} returned ${path_code}" >&2
    exit 1
  fi
done

echo "doctor ok ${base}"
