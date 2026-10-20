# GUIDELINE — 02SHORTCUT

ตัวช่วยสร้างทางลัด + ไอคอน — **ไม่ใช่ตัวแอป** และไม่ถูกติดตั้งอัตโนมัติ

## ไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `BAZERCONSOLE.ico` | ไอคอนที่ใช้ทั้งทางลัดและโฟลเดอร์ (rename ได้ — script จะหยิบ `.ico` ตัวแรกถ้าหาชื่อนี้ไม่เจอ) |
| `create-desktop-shortcut.ps1` | สร้าง `.lnk` บน Desktop + เขียน `BAZERCONSOLE/desktop.ini` + ตั้ง attribute โฟลเดอร์ |

```powershell
powershell -ExecutionPolicy Bypass -File ".\create-desktop-shortcut.ps1"
```

## กฎ

1. **ไฟล์ `.ps1` ในโฟลเดอร์นี้ต้องเป็น ASCII เท่านั้น** — Windows PowerShell 5.1 อ่านไฟล์ที่ไม่มี BOM เป็น ANSI ข้อความไทยจะเพี้ยนก่อนรัน (เจอจริงมาแล้ว)
2. รันซ้ำได้ตลอด (idempotent) — script จะถอด attribute `+r +s` ของ `desktop.ini` ก่อนเขียนใหม่
3. `desktop.ini` ผูกพาธแบบ absolute → **ย้าย repo แล้วต้องรัน script ใหม่** (ไฟล์นี้ถูก gitignore)
4. ทางลัดฝัง path แบบ absolute (ธรรมชาติของ `.lnk`) → ถ้าย้าย repo ต้องสร้างใหม่
5. ห้ามให้ตัวสร้างทางลัดไปแตะ config ของ OpenCode
