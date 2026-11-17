#!/usr/bin/env bash
# Usage: .maestro/run-screenshots.sh <simulator-or-emulator-id> <name>   e.g. ... 5CE0... ios-iphone
# Needs .maestro/.env.local with PERMANA_EMAIL / PERMANA_PASSWORD. Output: store-assets/<name>/
set -euo pipefail
cd "$(dirname "$0")/.."
DEVICE="$1"; NAME="$2"
set -a; source .maestro/.env.local; set +a
# Store-style status bar on iOS simulators (ignored for Android emulators).
xcrun simctl status_bar "$DEVICE" override --time 9:41 --batteryState charged --batteryLevel 100 \
  --cellularMode active --cellularBars 4 --wifiBars 3 >/dev/null 2>&1 || true
trap 'xcrun simctl status_bar "$DEVICE" clear >/dev/null 2>&1 || true' EXIT
RUN_DIR="$(mktemp -d)"
rm -rf "store-assets/$NAME"; mkdir -p "store-assets/$NAME"
maestro --device "$DEVICE" test --test-output-dir "$RUN_DIR" \
  -e PERMANA_EMAIL="$PERMANA_EMAIL" -e PERMANA_PASSWORD="$PERMANA_PASSWORD" -e OUT=shots \
  .maestro/store-screenshots.yaml
find "$RUN_DIR" -path '*takeScreenshot*' -name '*.png' -exec cp {} "store-assets/$NAME/" \;
ls -l "store-assets/$NAME"
