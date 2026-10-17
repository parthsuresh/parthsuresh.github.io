#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../../.." && pwd)"
evidence="/tmp/parthsuresh-verify-evidence"
mkdir -p "${evidence}"
pid_file="${evidence}/jekyll.pid"
log="${evidence}/jekyll.log"

if curl -fsS -o /dev/null "http://127.0.0.1:4000/" 2>/dev/null; then
  echo "port 4000 is already open. Refusing to start a second server." >&2
  exit 1
fi

cd "${root}"
bundle exec jekyll serve --host 127.0.0.1 --port 4000 --detach >>"${log}" 2>&1

for _ in $(seq 1 90); do
  if curl -fsS -o /dev/null "http://127.0.0.1:4000/" 2>/dev/null; then
    break
  fi
  sleep 1
done

if ! curl -fsS -o /dev/null "http://127.0.0.1:4000/"; then
  echo "server did not become ready. See ${log}" >&2
  exit 1
fi

pid="$(lsof -nP -iTCP:4000 -sTCP:LISTEN -t | head -1 || true)"
if [ -z "${pid}" ]; then
  echo "server answered but no listener pid was recorded" >&2
  exit 1
fi
echo "${pid}" >"${pid_file}"
echo "ready http://127.0.0.1:4000/ pid ${pid}"
