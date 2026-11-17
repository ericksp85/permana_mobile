#!/usr/bin/env bash
# Usage: .maestro/run-screenshots.sh <simulator-or-emulator-id> <name>   e.g. ... 5CE0... ios-iphone
# Needs .maestro/.env.local with PERMANA_EMAIL / PERMANA_PASSWORD. Output: store-assets/<name>/
set -euo pipefail
cd "$(dirname "$0")/.."
DEVICE="$1"; NAME="$2"
set -a; source .maestro/.env.local; set +a
# Store-style status bar: iOS simulators via simctl, Android emulators via SystemUI demo mode.
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
if [[ "$DEVICE" == emulator-* ]]; then
  "$ADB" -s "$DEVICE" shell settings put global sysui_demo_allowed 1
  for c in "-e command enter" "-e command clock -e hhmm 0941" "-e command battery -e level 100 -e plugged false" \
           "-e command network -e wifi show -e level 4 -e mobile show -e datatype none -e level 4" "-e command notifications -e visible false"; do
    "$ADB" -s "$DEVICE" shell am broadcast -a com.android.systemui.demo $c >/dev/null
  done
fi
xcrun simctl status_bar "$DEVICE" override --time 9:41 --batteryState charged --batteryLevel 100 \
  --cellularMode active --cellularBars 4 --wifiBars 3 >/dev/null 2>&1 || true
cleanup() {
  xcrun simctl status_bar "$DEVICE" clear >/dev/null 2>&1 || true
  if [[ "$DEVICE" == emulator-* ]]; then
    "$ADB" -s "$DEVICE" shell am broadcast -a com.android.systemui.demo -e command exit >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT
FLOW=.maestro/store-screenshots.yaml
case "$NAME" in android*) FLOW=.maestro/store-screenshots-android.yaml ;; esac
RUN_DIR="$(mktemp -d)"
rm -rf "store-assets/$NAME"; mkdir -p "store-assets/$NAME"
maestro --device "$DEVICE" test --test-output-dir "$RUN_DIR" \
  -e PERMANA_EMAIL="$PERMANA_EMAIL" -e PERMANA_PASSWORD="$PERMANA_PASSWORD" -e OUT=shots \
  "$FLOW"
find "$RUN_DIR" -path '*takeScreenshot*' -name '*.png' -exec cp {} "store-assets/$NAME/" \;
ls -l "store-assets/$NAME"
