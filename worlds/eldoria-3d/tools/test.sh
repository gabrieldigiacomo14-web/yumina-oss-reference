#!/usr/bin/env bash
# Rebuild the world and the local browser harness. Usage: tools/test.sh <harness-dir> <path-to-three.min.js>
set -eo pipefail; cd "$(dirname "$0")/.."
node tools/check.mjs && node tools/build.mjs | head -3 && node tools/build-harness-page.mjs "$1" "$2"
