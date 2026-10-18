# BAZER Console บน macOS

พอร์ตของ `CONSOLE/BAZER Console.vbs` และไฟล์ที่ผูก Windows ทั้งชุด ให้ทำงานบน macOS (bash + node เท่านั้น — ใช้ `curl`, `open`, `osascript`, `launchctl`, `lsof` ซึ่งมากับ macOS อยู่แล้ว)

## เปิดแอป

- ดับเบิลคลิก **`../BAZER CONSOLE - WINDOW (macOS).command`** (ไฟล์ที่ repo root) — เทียบเท่า `BAZER CONSOLE - WINDOW (Windows).lnk` + `.vbs` บน Windows
- หรือดับเบิลคลิก **`BAZER Console.command`** ในโฟลเดอร์นี้โดยตรง
- ครั้งแรก Finder อาจไม่รันให้ (exec bit หายตอนคัดลอกข้ามระบบ) — เปิด Terminal แล้วพิมพ์
  `chmod +x "BAZER Console.command" "../BAZER CONSOLE - WINDOW (macOS).command"` ครั้งเดียว

## ไฟล์ในโฟลเดอร์นี้

| ไฟล์ | เทียบเท่าฝั่ง Windows | หน้าที่ |
|---|---|---|
| `platform.mjs` | (โค้ด Windows ในตัว `console.mjs`) | adapter ของ macOS: shell, autostart, shortcut, เปิดโฟลเดอร์, kill port |
| `BAZER Console.command` | `BAZER Console.vbs` | ปุ่มเปิดแอป: อ่านพอร์ต/token → ping → สตาร์ท node → เปิดเบราว์เซอร์ |
| `launch-template/opencode-serve.command` | `opencode-serve.vbs` | เปิด server 4096 เบื้องหลัง |
| `launch-template/lock-deepseek-only.command` | `lock-deepseek-only.vbs` | สลับโหมดล็อกเป็น deepseek-only + รีสตาร์ท server |
| `launch-template/lock-provider-only.command` | `lock-provider-only.vbs` | สลับโหมดล็อกเป็น provider-only + รีสตาร์ท server |
| `launch-template/lock-*.jsonc` | เหมือนกัน | ข้อมูลโหมดล็อก (คัดลอกตรงจาก Windows) |

## สิ่งที่ต่างจาก Windows

- **autostart** ไม่มีโฟลเดอร์ Startup — ใช้ **LaunchAgent** `~/Library/LaunchAgents/dev.bazer.opencode-server.plist` (`launchctl bootstrap`/`bootout`) เปิด-ปิดได้จากแท็บ Server
- **shortcut** คือไฟล์ `.command` ที่ดับเบิลคลิกได้เอง (macOS ไม่ต้องมีไฟล์ `.lnk` แยก) ถ้าต้องการ alias บน Desktop ให้คลิกขวาไฟล์ → **Make Alias** แล้วลากไปวาง
- **เปิดโฟลเดอร์** ใช้ `open` แทน `explorer.exe`
- **kill server** ใช้ `lsof -ti tcp:4096 | kill -9` แทน `Get-NetTCPConnection`/`Stop-Process`
- **ปลั๊กอิน Plannotator** หา CLI ด้วย `command -v plannotator` แทน `where.exe`

## ข้อจำกัด

โค้ดชุดนี้ถูกตรวจด้วย `node --check` + `bash -n` + parity test บนเครื่อง Windows เท่านั้น **ยังไม่ได้รันบน macOS จริง** — หากเจอปัญหาในการรันครั้งแรก ให้รันใน Terminal เพื่อดู error:

```
node ../console.mjs                    # ตัวแอป
bash "BAZER Console.command"           # ตัวเปิด
```
