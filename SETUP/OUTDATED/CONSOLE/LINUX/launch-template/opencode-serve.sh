#!/bin/bash
# OpenCode background server (Linux) — port of opencode-serve.vbs
# เปิด (ซ่อนหน้าต่าง) — ถ้า server ทำงานอยู่แล้วจะไม่เปิดซ้ำ
# หาโปรแกรม opencode อัตโนมัติตามลำดับ: (1) ไฟล์ปักหมุดข้างไฟล์นี้ opencode-server-v1/opencode-v1.19.2 (โหมด bridge V1)
#                                        (2) โปรแกรมที่ติดตั้งผ่าน npm (@opencode/cli แล้วค่อย opencode-ai) บน PATH
# ตัวแปร OPENCODE_CONFIG ชี้ไปที่ไฟล์ล็อก ~/.config/opencode/serve-restricted.jsonc (ถ้ามี)
set -euo pipefail

chmod +x "$0" 2>/dev/null || true

BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

server_up() {
  curl -fsS --max-time 1.5 "http://127.0.0.1:4096/health" >/dev/null 2>&1 && return 0
  curl -fsS --max-time 1.5 "http://127.0.0.1:4096/global/health" >/dev/null 2>&1 && return 0
  return 1
}

if server_up; then exit 0; fi

EXE=""
if [ -f "$BASE/opencode-server-v1/opencode-v1.19.2" ]; then
  EXE="$BASE/opencode-server-v1/opencode-v1.19.2"
elif command -v opencode >/dev/null 2>&1; then
  EXE="$(command -v opencode)"
fi
if [ -z "$EXE" ]; then
  printf '%s\n' "ไม่พบโปรแกรม opencode ในเครื่อง" "" \
    "ติดตั้งก่อนด้วยคำสั่ง:" "  npm install -g @opencode/cli" "" \
    "หรือวางโฟลเดอร์ opencode-server-v1 (มีไฟล์ opencode-v1.19.2) ไว้ข้างไฟล์นี้" >&2
  exit 1
fi

CFG="$HOME/.config/opencode/serve-restricted.jsonc"
if [ -f "$CFG" ]; then export OPENCODE_CONFIG="$CFG"; fi

exec "$EXE" serve --hostname 127.0.0.1 --port 4096
