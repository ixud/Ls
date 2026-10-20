---
name: bazer-mode-rules
description: กฎของ BAZER Stack ที่โหลดเมื่อเข้าเงื่อนไข — ใช้เมื่อกำลังเขียน/แก้ไฟล์ .md (กฎเว้นบรรทัด), เมื่อผู้ใช้สั่งทำ guide/คู่มือ/เอกสารสำหรับคนไม่รู้เรื่อง, เมื่อทำงานในโหมด Buddha/Bazer (ขอบเขตไฟล์), หรือเมื่อจะแตะ config/agent/model.json (mode lock)
---

# BAZER Mode Rules

กฎของ stack นี้ย้ายออกมาจาก `AGENTS.md` เพราะ `AGENTS.md` ถูกโหลดทุก session ทุกโฟลเดอร์ ทำให้กฎรั่วไปงานที่ไม่เกี่ยว ที่นี่โหลดเมื่อ "เข้าเงื่อนไข" เท่านั้น

## วิธีใช้

1. ตรวจว่าตัวเองเข้าเงื่อนไขข้อไหนในตารางล่าง
2. อ่าน reference ของข้อนั้น (1 ไฟล์) แล้วทำตาม
3. ถ้าเข้าเงื่อนไขหลายข้อ อ่านทีละไฟล์ เฉพาะที่เกี่ยวกับงานตรงหน้า

## ตารางทริกเกอร์

| เงื่อนไข | โหลด | กฎย่อ |
|---|---|---|
| กำลังเขียน/แก้ไฟล์ `.md` | `references/blank-line.md` | block เดียวกันเว้น 1 บรรทัดว่าง · H2/H3/H4 เว้น 2 · H1 เว้น 3 |
| prompt มีคำว่า guide / คู่มือ / อธิบายให้คนอื่น / สอน | `references/guide-non-code.md` | เขียนแบบ comprehensive guide สำหรับคนไม่รู้เรื่องนี้มาก่อน |
| อยู่ในโหมด `buddha` หรือ `bazer` | `references/file-scope.md` | แตะเฉพาะพาธที่ผู้ใช้ระบุใน prompt |
| กำลังจะแก้ `opencode.jsonc` / `model.json` / `agents/*.md` / `cli.json` | `references/mode-lock.md` | ห้ามแก้เอง — สั่งผ่าน BAZER Console และรันตัวตรวจหลังแก้ |

## กฎที่ยังอยู่ที่ `AGENTS.md` (ระดับเครื่อง — ห้ามย้าย)

- Max Effort: ไม่คิดวน ไม่คิดซ้ำ คิดเท่าที่จำเป็นต่องาน
- Plannotator gate: ก่อนแก้ไฟล์ใน Plan Mode ต้อง `submit_plan` แล้วรออนุมัติ

สองข้อนี้ต้องมีผลกับ **ทุก** agent รวมถึง `plan` และ `build` ที่เป็น built-in (มองไม่เห็น skill นี้) จึงต้องอยู่ใน `AGENTS.md` ต่อไป

## ตรวจว่ากฎชุดนี้ยังติดตั้งอยู่

```powershell
node "C:\BCS\00.02 LLM Slavery\SETUP\OPENCODE\CONSOLE\mode-lock.mjs"
```

ต้องเห็น `PASS R7` (skill ติดตั้ง + frontmatter ครบ) และ `PASS R6` (AGENTS.md เหลือ 2 กฎ + marker)
