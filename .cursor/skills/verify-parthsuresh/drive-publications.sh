#!/usr/bin/env bash
set -euo pipefail

base="${VERIFY_BASE_URL:-http://127.0.0.1:4000}"
run_id="${VERIFY_RUN_ID:-manual}"
out="/tmp/parthsuresh-verify-evidence/${run_id}"
mkdir -p "${out}"

"$(cd "$(dirname "$0")" && pwd)/doctor.sh"

curl -fsS -D "${out}/publications.headers" -o "${out}/publications.html" "${base}/publications/"
{
  echo "GET ${base}/publications/"
  echo "exit 0"
} >"${out}/publications.command"

require() {
  local needle="$1"
  if ! grep -q "${needle}" "${out}/publications.html"; then
    echo "publications page missing: ${needle}" >&2
    exit 1
  fi
}

require "Plan, Watch, Recover: A Benchmark and Architectures for Proactive Procedural Assistance"
require "CRAG-MM: Multi-modal Multi-turn Comprehensive RAG Benchmark"
require "Improving Code Reviewer Recommendation: Accuracy, Latency, Workload, and Bystanders"
require "Balancing Cost and Effectiveness of Synthetic Data Generation Strategies for LLMs"
require "Modeling the Centrality of Developer Output with Software Supply Chains"
require "Accurate brain age prediction using recurrent slice-based networks"
require "Subband Weighting for Binaural Speech Source Localization"
require "16th International Symposium on Medical Information Processing and Analysis"
require 'src="/assets/img/publication_preview/brainage_arch.png"'

if grep -q "NeurIPS 2024, 2024" "${out}/publications.html"; then
  echo "publications page repeats 2024 on the FITML venue line" >&2
  exit 1
fi
if grep -q "17th International Symposium" "${out}/publications.html"; then
  echo "publications page still shows the 17th symposium venue" >&2
  exit 1
fi

echo "publications ok evidence ${out}"
