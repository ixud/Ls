# BAZER Console บน Linux

พอร์ตของ `CONSOLE/BAZER Console.vbs` และไฟล์ที่ผูก Windows ทั้งชุด ให้ทำงานบน Linux (bash + node เท่านั้น — ใช้ `curl`, `xdg-open`, `lsof`/`fuser`)

## เปิดแอป

- ดับเบิลคลิก **`../BAZER CONSOLE - WINDOW (Linux).desktop`** (ไฟล์ที่ repo root) — เทียบเท่า `BAZER CONSOLE - WINDOW (Windows).lnk` บน Windows
- หรือรัน **`BAZER Console.sh`** ในโฟลเดอร์นี้จาก Terminal
- ถ้า exec bit หายตอนคัดลอกข้ามระบบ ให้รัน
  `chmod +x "BAZER Console.sh" "../BAZER CONSOLE - WINDOW (Linux).desktop"` ครั้งเดียว
- `.desktop` ที่ repo root แบบ self-locating ใช้ `%k`; เมื่อกด "สร้าง shortcut" / "ติดตั้งเสร็จสรรพ" ในแอป ระบบจะเขียน `Exec=` เป็น path จริงให้เอง (แบบเดียวกับที่ Windows สร้าง `.lnk` ต่อเครื่อง)

## ไฟล์ในโฟลเดอร์นี้

| ไฟล์ | เทียบเท่าฝั่ง Windows | หน้าที่ |
|---|---|---|
| `platform.mjs` | (โค้ด Windows ในตัว `console.mjs`) | adapter ของ Linux: shell, autostart, shortcut, เปิดโฟลเดอร์, kill port |
| `BAZER Console.sh` | `BAZER Console.vbs` | ปุ่มเปิดแอป: อ่านพอร์ต/token → ping → สตาร์ท node → เปิดเบราว์เซอร์ |
| `launch-template/opencode-serve.sh` | `opencode-serve.vbs` | เปิด server 4096 เบื้องหลัง |
| `launch-template/lock-deepseek-only.sh` | `lock-deepseek-only.vbs` | สลับโหมดล็อกเป็น deepseek-only + รีสตาร์ท server |
| `launch-template/lock-provider-only.sh` | `lock-provider-only.vbs` | สลับโหมดล็อกเป็น provider-only + รีสตาร์ท server |
| `launch-template/lock-*.jsonc` | เหมือนกัน | ข้อมูลโหมดล็อก (คัดลอกตรงจาก Windows) |

## สิ่งที่ต่างจาก Windows

- **autostart** ใช้ **XDG autostart** `~/.config/autostart/bazer-opencode-server.desktop` (เปิด-ปิดจากแท็บ Server) — เทียบเท่าโฟลเดอร์ Startup ของ Windows
- **shortcut** คือไฟล์ `.desktop` ที่ดับเบิลคลิกในตัวจัดการไฟล์ได้ (บาง DE ต้องคลิกขวา → Allow Launching ครั้งเดียว)
- **เปิดโฟลเดอร์** ใช้ `xdg-open` (fallback `gio open`) แทน `explorer.exe`
- **kill server** ใช้ `lsof -ti tcp:4096` (fallback `fuser 4096/tcp`) แทน `Get-NetTCPConnection`/`Stop-Process`
- **ปลั๊กอิน Plannotator** หา CLI ด้วย `command -v plannotator` แทน `where.exe`
- **กล่องข้อความ** ใช้ `zenity` หรือ `notify-send` ถ้ามี ไม่งั้นพิมพ์ลง stderr

## ข้อจำกัด

โค้ดชุดนี้ถูกตรวจด้วย `node --check` + `bash -n` + parity test บนเครื่อง Windows เท่านั้น **ยังไม่ได้รันบน Linux จริง** — หากเจอปัญหาในการรันครั้งแรก ให้รันใน Terminal เพื่อดู error:

```
node ../console.mjs                    # ตัวแอป
bash "BAZER Console.sh"                # ตัวเปิด
```
