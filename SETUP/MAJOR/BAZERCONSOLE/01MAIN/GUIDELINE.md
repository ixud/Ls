# GUIDELINE — 01MAIN

`01MAIN` = ทั้งแอปและสัญญา ถ้าไฟล์ไม่อยู่ที่นี่ แปลว่าไม่ใช่ของ Console

| โฟลเดอร์ | เก็บอะไร | ห้ามอะไร |
|---|---|---|
| `PASSIVE/01MANIFEST` | สัญญา 6 เรื่อง (manifest/policies/settings/actions/probes/law/env) | ห้ามมีโค้ด |
| `PASSIVE/02INSTALLER` | ขั้นตอน/คำสั่งติดตั้งเครื่องมือ | ห้ามเดา path ผู้ใช้ |
| `PASSIVE/03SLASHCOMMAND` | ไฟล์ command (ถ้าจะมี) | ดูหมายเหตุด้านล่าง |
| `PASSIVE/04PLANNOTATOR` | ค่าที่ Console ใช้แพตช์ปุ่มอนุมัติ | ห้ามแพตช์ผิดไฟล์ (ต้อง probe ก่อน) |
| `ACTIVE/SERVER` | โค้ดเซิร์ฟเวอร์ | ห้าม hardcode path ปลายทาง (R2) |
| `ACTIVE/UI` | HTML/CSS/JS ล้วน (ไม่มี build step) | ห้ามมีปุ่มเขียนมือ (R3) |
| `ACTIVE/var` | state/backup/history/token (ไม่ขึ้น git) | ห้าม commit |
| `CONFIGTEMPLATEFORAPPLY` | แม่แบบไฟล์ระบบ | ห้ามมีสคริปต์ (R1) |

## หมายเหตุ `03SLASHCOMMAND`

ยัง **ไม่มี command โดยเจตนา** — การสลับโหมดใช้ `Shift+Tab`
ถ้าจะเพิ่มภายหลัง ต้องตอบให้ได้ว่า "ทำไมปุ่มใน Console ทำแทนไม่ได้" และห้ามมี command ที่ทำลายข้อตกลงของ manifest
