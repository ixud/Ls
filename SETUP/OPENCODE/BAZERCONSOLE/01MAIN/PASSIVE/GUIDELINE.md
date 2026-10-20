# GUIDELINE — PASSIVE

โฟลเดอร์นี้เป็น **สัญญา** ไม่ใช่โปรแกรม — ทุกไฟล์เป็นข้อมูลที่ `ACTIVE/SERVER` อ่านไปใช้
ถ้าคุณกำลังจะใส่ logic ลงที่นี่ **หยุด** แล้วย้ายไป `ACTIVE/SERVER`

## ลำดับการอ่านของระบบ (ห้ามสลับ)

```
env.json → manifest.json → policies.json → settings.json → actions.json → probes.json → law.json
```

- `env.json` ให้ตัวแปร `${...}` — ถ้าเพิ่มตัวแปรใหม่ ต้องเพิ่ม kind ที่ `env.mjs` ด้วย
- `manifest.json` คือรายการของทั้งหมด — เพิ่มของ = เพิ่ม entry (ห้ามแก้โค้ดก่อน)
- `policies.json` = บันไดความแรง (เฉพาะ BUDDHA)
- `settings.json` = คอนโทรลหน้า ตั้งค่า (Quick Access / ARENA / อื่น ๆ / PSTACK)
- `actions.json` = ปุ่ม + ระดับความเสี่ยง (ต้องตรงกับ handler — R3)
- `probes.json` = ข้อพิสูจน์กับของจริง (ใช้ตัดสิน `broken`)
- `law.json` = กฎ R1–R4 ในรูปข้อมูล

## ข้อห้าม

1. ห้ามมี `.mjs/.js/.ps1` ในโฟลเดอร์นี้ (ยกเว้น `02INSTALLER` ที่เป็นคำสั่งติดตั้ง)
2. ห้ามลบ entry ที่ `status: design` เพื่อให้สถานะเขียว — ต้องทำให้เสร็จหรือปิดพร้อมเหตุผลใน CHANGELOG
3. ห้ามเปลี่ยนความหมาย field เดิม — ถ้าจำเป็นให้ขึ้น Minor + เขียน migration ใน CHANGELOG
4. ก่อน commit: ตรวจ JSON ทุกไฟล์ + รัน `selftest.mjs`
