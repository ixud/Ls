#!/bin/bash
# สลับโหมดล็อกเป็น deepseek-only (macOS) — port of lock-deepseek-only.vbs
# คัดลอก lock-deepseek-only.jsonc ไปเป็น serve-restricted.jsonc แล้วรีสตาร์ท server 4096
set -euo pipefail

chmod +x "$0" 2>/dev/null || true

FOLDER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CFG="$HOME/.config/opencode/serve-restricted.jsonc"

mkdir -p "$(dirname "$CFG")"
cp -f "$FOLDER/lock-deepseek-only.jsonc" "$CFG"

pids="$(lsof -ti tcp:4096 2>/dev/null || true)"
if [ -n "$pids" ]; then kill -9 $pids 2>/dev/null || true; fi
sleep 2.5

exec /bin/bash "$FOLDER/opencode-serve.command"
