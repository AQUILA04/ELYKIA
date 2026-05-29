#!/usr/bin/env bash
# Merge status-bar items into Capacitor styles.xml instead of replacing the whole file.
set -euo pipefail

STYLES_FILE="${1:?styles.xml path required}"

python3 - "$STYLES_FILE" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
if not path.exists():
    raise SystemExit(f"Missing {path}")

text = path.read_text()
items = {
    "AppTheme": [
        '<item name="android:statusBarColor">#FFFFFF</item>',
        '<item name="android:windowLightStatusBar">true</item>',
        '<item name="android:windowDrawsSystemBarBackgrounds">true</item>',
    ],
    "AppTheme.NoActionBar": [
        '<item name="android:statusBarColor">#FFFFFF</item>',
        '<item name="android:windowLightStatusBar">true</item>',
        '<item name="android:windowDrawsSystemBarBackgrounds">true</item>',
        '<item name="android:fitsSystemWindows">true</item>',
    ],
    "AppTheme.NoActionBarLaunch": [
        '<item name="android:statusBarColor">#FFFFFF</item>',
        '<item name="android:windowLightStatusBar">true</item>',
        '<item name="android:windowDrawsSystemBarBackgrounds">true</item>',
        '<item name="android:fitsSystemWindows">true</item>',
    ],
}

for style, lines in items.items():
    marker = f'<style name="{style}"'
    if marker not in text:
        continue
    start = text.index(marker)
    end = text.index("</style>", start)
    block = text[start:end]
    for line in lines:
        if line not in block:
            block = block.rstrip() + "\n        " + line + "\n"
    text = text[:start] + block + text[end:]

path.write_text(text)
print(f"Patched status bar styles in {path}")
PY
