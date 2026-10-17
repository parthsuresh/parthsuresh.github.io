#!/usr/bin/env bash
set -euo pipefail

pid_file="/tmp/parthsuresh-verify-evidence/jekyll.pid"
if [ ! -f "${pid_file}" ]; then
  echo "no recorded jekyll pid. Nothing to stop."
  exit 0
fi

pid="$(cat "${pid_file}")"
if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
  kill "${pid}"
  echo "stopped pid ${pid}"
else
  echo "pid ${pid} was not running"
fi
rm -f "${pid_file}"
echo "evidence remains in /tmp/parthsuresh-verify-evidence"
