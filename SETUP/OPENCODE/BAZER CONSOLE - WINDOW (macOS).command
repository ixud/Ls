#!/bin/bash
# Portable launcher + shortcut for BAZER Console (macOS) — the macOS counterpart of
# "BAZER CONSOLE - WINDOW (Windows).vbs" + "BAZER CONSOLE - WINDOW (Windows).lnk".
# It resolves its own folder, so double-clicking it in Finder keeps working after the
# repository is cloned or moved to another machine.
set -euo pipefail

chmod +x "$0" 2>/dev/null || true

SRC="${BASH_SOURCE[0]}"
while [ -L "$SRC" ]; do
  D="$(cd "$(dirname "$SRC")" && pwd)"
  SRC="$(readlink "$SRC")"
  case "$SRC" in /*) ;; *) SRC="$D/$SRC" ;; esac
done
HERE="$(cd "$(dirname "$SRC")" && pwd)"

TARGET="$HERE/CONSOLE/MACOS/BAZER Console.command"

if [ ! -f "$TARGET" ]; then
  osascript -e "display alert \"BAZER Console not found\" message \"$TARGET\" as critical" >/dev/null 2>&1 \
    || printf 'BAZER Console not found:\n%s\n' "$TARGET" >&2
  exit 1
fi

chmod +x "$TARGET" 2>/dev/null || true
exec /bin/bash "$TARGET"
