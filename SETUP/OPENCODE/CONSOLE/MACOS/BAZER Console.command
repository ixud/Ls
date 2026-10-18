#!/bin/bash
# BAZER Console (macOS) — faithful port of CONSOLE/BAZER Console.vbs
# ดับเบิลคลิกไฟล์นี้เพื่อเปิด GUI จัดการ config
# ถ้าแอปเปิดอยู่แล้ว จะเปิดเบราว์เซอร์ให้เลย ถ้ายังไม่เปิด จะสตาร์ท node (ซ่อนหน้าต่าง) แล้วเปิดเบราว์เซอร์ให้
# หมายเหตุ: ถ้าพอร์ตหลัก (เช่น 4310) ถูกโปรแกรมอื่นใช้อยู่ จะเลือกพอร์ตว่างถัดไปให้อัตโนมัติ — กดแล้วเปิดได้เสมอ
# bash 3.2 compatible. ต้องมี: bash + node (curl, open, osascript มากับ macOS อยู่แล้ว)
set -euo pipefail

chmod +x "$0" 2>/dev/null || true

DEF_PORT=4310

# ---- resolve own folder (follow symlinks) -----------------------------------
SRC="${BASH_SOURCE[0]}"
while [ -L "$SRC" ]; do
  D="$(cd "$(dirname "$SRC")" && pwd)"
  SRC="$(readlink "$SRC")"
  case "$SRC" in /*) ;; *) SRC="$D/$SRC" ;; esac
done
HERE="$(cd "$(dirname "$SRC")" && pwd)"
FOLDER="$(cd "$HERE/.." && pwd)"   # โฟลเดอร์ที่มี console.mjs (CONSOLE/) — ตัวเปิดอยู่ใน MACOS/

RTP="$FOLDER/console.runtime.json"
CFGP="$FOLDER/console.config.json"

PORT=$DEF_PORT
TOKEN=""
U=""
PING=""

# ---- JSON value reader (node, no jq) ----------------------------------------
jsonval() { # jsonval <file> <key> -> value or ""
  [ -f "$1" ] || { printf ''; return 0; }
  node -e '
    const fs = require("fs");
    let t = fs.readFileSync(process.argv[1], "utf8").replace(/^\uFEFF/, "");
    let o = {}; try { o = JSON.parse(t); } catch (e) {}
    const v = o[process.argv[2]];
    process.stdout.write(v == null ? "" : String(v));
  ' "$1" "$2" 2>/dev/null || printf ''
}

read_runtime() {
  PORT=$DEF_PORT
  TOKEN=""
  if [ -f "$RTP" ]; then
    local p t
    p="$(jsonval "$RTP" port)"
    t="$(jsonval "$RTP" token)"
    case "$p" in ''|*[!0-9]*) ;; *) PORT=$p ;; esac
    TOKEN="$t"
  elif [ -f "$CFGP" ]; then
    local p
    p="$(jsonval "$CFGP" port)"
    case "$p" in ''|*[!0-9]*) ;; *) PORT=$p ;; esac
  fi
}

build_urls() {
  U="http://127.0.0.1:${PORT}/?t=${TOKEN}"
  PING="http://127.0.0.1:${PORT}/api/ping?t=${TOKEN}"
}

# ---- HTTP probes (curl ships with macOS) ------------------------------------
# ping = HTTP 200 เท่านั้น (curl -f จะ fail เมื่อเจอ 401/404/5xx) — ตรงกับ VBS ที่เช็ค status = 200
ping()      { curl -fsS -o /dev/null --max-time 1 "$PING" 2>/dev/null; }
# port_busy = มีอะไรตอบ HTTP บนพอร์ตนั้น (ไม่เช็คสถานะ) — ตรงกับ VBS PortBusy
port_busy() { curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$1/" 2>/dev/null; }

pick_port() {
  local p="$1" i
  if ! port_busy "$p"; then printf '%s' "$p"; return 0; fi
  i=$((p + 1))
  while [ "$i" -le $((p + 30)) ]; do
    if ! port_busy "$i"; then printf '%s' "$i"; return 0; fi
    i=$((i + 1))
  done
  printf '%s' "$p"
}

dialog() { # MsgBox analogue
  osascript -e "display dialog \"$1\" with title \"BAZER Console\" buttons {\"OK\"} default button \"OK\" with icon stop" >/dev/null 2>&1 || true
}

# ---- main -------------------------------------------------------------------
read_runtime
build_urls

if ! ping; then
  if ! command -v node >/dev/null 2>&1; then
    dialog "ไม่พบคำสั่ง node ในเครื่อง — ติดตั้ง Node.js ก่อน"
    exit 1
  fi
  USE_PORT="$(pick_port "$PORT")"
  cd "$FOLDER"
  # detached + hidden == VBS: sh.Run "node ...", 0, False
  nohup node "$FOLDER/console.mjs" --port="$USE_PORT" >/dev/null 2>&1 &
  disown 2>/dev/null || true

  i=1
  while [ "$i" -le 40 ]; do          # 40 * 0.5s = 20s
    sleep 0.5
    read_runtime
    build_urls
    if ping; then break; fi
    i=$((i + 1))
  done
fi

if ping; then
  open "$U"                            # VBS: sh.Run url, 1, False
else
  dialog "เปิด BAZER Console ไม่สำเร็จ

สาเหตุที่พบบ่อย: พอร์ตถูกใช้อยู่ หรือ Node.js มีปัญหา
ดู error ได้จาก Terminal ในโฟลเดอร์นี้:
  node console.mjs

$FOLDER"
  exit 1
fi
