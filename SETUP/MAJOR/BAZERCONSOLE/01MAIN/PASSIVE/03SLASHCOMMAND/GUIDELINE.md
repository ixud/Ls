# GUIDELINE — 03SLASHCOMMAND

**ว่างโดยเจตนา** — การสลับโหมดใช้ `Shift+Tab` (ไม่ต้องมี command)

จะเพิ่ม command เมื่อตอบได้ทั้ง 3 ข้อ:
1. command นี้ทำอะไรที่ **ปุ่มใน Console ทำไม่ได้**
2. มันไม่ทำให้เกิด "สองทางที่ต้อง sync กัน" (เช่น command หนึ่งบอก A อีกปุ่มบอก B)
3. ถ้าลบ command ทิ้ง ผู้ใช้ยังทำงานได้ครบ

ถ้าจะเพิ่มจริง: วางไฟล์ `.md` ที่นี่ + เพิ่ม entry ใน `MANIFEST` (kind: `command`) + `CHANGELOG`
