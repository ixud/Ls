# GUIDELINE — ACTIVE

โค้ดที่รันจริง — **ไม่มี build step, ไม่มี dependency** (Node built-ins เท่านั้น)

```
SERVER/
├─ index.mjs     HTTP + SSE + token
├─ env.mjs       ตัวแปร ${...}
├─ jsonc.mjs     แก้ JSONC แบบคงคอมเมนต์
├─ manifest.mjs  โหลด/ตรวจสัญญา
├─ plan.mjs      5 สถานะ + diff
├─ apply.mjs     backup → atomic → hash → history (rollback ได้)
├─ probe.mjs     พิสูจน์กับ OpenCode จริง
├─ law.mjs       R1–R4
├─ actions.mjs   registry ของปุ่ม (ต้องตรง actions.json)
├─ tools/selftest.mjs
UI/
├─ index.html · app.js · style.css · motion.css
var/           (gitignore) state · backups · history · token
```

## กฎ

1. **ห้าม hardcode path ของผู้ใช้** — ใช้ `${VAR}` จาก `env.json` (R2)
2. **ห้ามเพิ่มปุ่มใน HTML** — ปุ่มมาจาก `actions.json`; UI เฉพาะทาง (เช่น บันได) ต้องอ่านจาก `policies.json`
3. ทุก handler คืน `{ ok, summary, ... }` รูปเดียว
4. ทุกการเขียนไฟล์ต้องผ่าน `apply.mjs` (backup + atomic + history) — ห้าม `writeFileSync` ตรง ๆ ใน action
5. เขียนผลลัพธ์ที่ผู้ใช้อ่านเป็นไทย แต่ log/error ภายในเป็นอังกฤษได้
6. ก่อน commit: `node --check` ทุกไฟล์ + `node tools/selftest.mjs`

## การเพิ่ม action ใหม่

1. เพิ่ม object ใน `PASSIVE/01MANIFEST/actions.json` (id, group, title, kind, risk, confirm)
2. เพิ่ม handler ใน `actions.mjs` (id ต้องตรงกัน)
3. ถ้าเขียนไฟล์ → ใช้ `apply.mjs` (backup/atomic/history)
4. อัพเดต `CHANGELOG.md` + รัน selftest (R3 จะจับถ้าลืมข้อ 2)
