# GUIDELINE — 03WINDOWS

ตัวเปิดสำหรับ Windows — **ไม่มีลอจิกของแอป** แค่หา `MAJOR` จากตำแหน่งตัวเองแล้วสั่ง `node` รัน `01MAIN/ACTIVE/SERVER/index.mjs`

## กฎ

1. ห้ามฝัง path เต็มของเครื่องใคร — ใช้ `WScript.ScriptFullName` แล้วไล่ขึ้น 2 ชั้นเป็น `MAJOR`
2. ห้ามย้ายไฟล์นี้ออกจาก `MAJOR` ไปที่อื่นโดยไม่แก้วิธีหา root (จะหา server ไม่เจอ)
3. ข้อความในไฟล์ `.vbs` ให้เป็น ASCII — ไฟล์ VBS อ่าน encoding ตาม codepage ของเครื่อง ถ้าใส่ไทยอาจเพี้ยน
4. ถ้าจะเพิ่มตัวเปิดแบบใหม่ (เช่น `.bat`) ให้เพิ่มใน `MANIFEST` + `CHANGELOG` ไม่ใช่ทิ้งไฟล์ลอย
