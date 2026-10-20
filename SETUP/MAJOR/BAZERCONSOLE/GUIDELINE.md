# GUIDELINE — BAZERCONSOLE

```
BAZERCONSOLE/
├─ 01MAIN/                  แกนทั้งหมด (แอป + สัญญา + แม่แบบ)
│  ├─ PASSIVE/              ข้อมูล/สัญญา (ห้ามมีโค้ด — R1)
│  ├─ ACTIVE/               โค้ดที่รันจริง (SERVER + UI + var)
│  └─ CONFIGTEMPLATEFORAPPLY/  แม่แบบไฟล์ระบบ
├─ 02SHORTCUT/              ตัวสร้าง shortcut (ไม่ใช่ตัวแอป)
├─ 03WINDOWS/               ตัวเปิดสำหรับ Windows (ตอนนี้รองรับตัวเดียว)
├─ 04MACOS/                 ว่างไว้ — ทำเมื่อมีเครื่องจริง
└─ 05LINUX/                 ว่างไว้ — ทำเมื่อมีเครื่องจริง
```

## กฎ

1. **PASSIVE = สัญญา, ACTIVE = โปรแกรม** — ห้ามย้ายของข้ามกันเพื่อความสะดวก
2. แอปต้องรันได้ด้วย **Node built-ins เท่านั้น** (ห้าม dependency ภายนอก) เพื่อให้ "clone แล้วเปิดได้"
3. ทุกที่ที่ต้องรู้ path ปลายทาง → อ่านจาก `PASSIVE/01MANIFEST` (R2)
4. ทุกปุ่ม → มาจาก `PASSIVE/01MANIFEST/actions.json` + handler ใน `ACTIVE/SERVER/actions.mjs` (R3)
5. สำรองข้อมูล → `ACTIVE/var/backups/` เท่านั้น (R4)
6. ก่อนบอกว่างานเสร็จ: รัน `node ACTIVE/SERVER/tools/selftest.mjs` และกด `ตรวจทุกอย่าง` ใน UI

## การแยกตาม OS

- ตัวที่ทำงานจริงอยู่ `01MAIN/ACTIVE` (ใช้ได้ทุก OS)
- โฟลเดอร์ราย OS เก็บ **ตัวเปิด/ทางลัด** เท่านั้น — ห้ามลอจิกอยู่ที่นั่น
- macOS/Linux: เขียนใหม่เมื่อมีเครื่องจริง (ตามที่ผู้ใช้กำหนด) อย่าเดา path
