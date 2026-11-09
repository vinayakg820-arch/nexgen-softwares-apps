#!/usr/bin/env bash
# Builds the single website ZIP for EdgeOne from website/ (name uses "site" in website/versions.json)
set -euo pipefail
cd "$(dirname "$0")/../website"
V=$(python3 -c "import json;print(json.load(open('versions.json'))['site'])")
OUT="${1:-$(pwd)/..}/NexGen-Softwares-Site-v$V.zip"
rm -f "$OUT"
zip -qr -X "$OUT" . -x "*.DS_Store"
echo "$OUT"
