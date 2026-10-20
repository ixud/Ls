# D — ย้ายกฎออกจาก `AGENTS.md` เข้า skill

วันที่ 2026-10-18


## 1. ตัดสิน: 2 ชั้น (ไม่ย้ายทั้งก้อน)

| ชั้น | อยู่ที่ | กฎ | เหตุผล |
|---|---|---|---|
| A — ระดับเครื่อง | `~/.config/opencode/AGENTS.md` (19 บรรทัด) | Max Effort · Plannotator gate | `plan`/`build` เป็น agent built-in ที่ **มองไม่เห็น skill ของ BAZER** และ gate ถูกบังคับจริงด้วย permission ของปลั๊กอิน ไม่ใช่ข้อความ (`dist/index.js:12822-12833`) |
| B — เข้าเงื่อนไข | `~/.agents/skills/bazer-mode-rules/` | ขอบเขตไฟล์ · กฎเว้นบรรทัด · guide non-code · mode lock | โหลดเมื่อเข้าเงื่อนไขเท่านั้น — ตอบโจทย์ "ไม่ให้กฎ stack รั่วไปงานอื่น" |

เทียบทางเลือก:

| ทาง | ผล |
|---|---|
| ย้ายทั้งหมดเข้า skill | **แพ้** — `plan`/`build` ไม่เห็น skill ทำให้ gate และ Max Effort หายจากสองโหมดที่ใช้บ่อยที่สุด |
| `instructions:` ใน config | **แพ้** — ยังโหลดทุก session (ambient) ไม่ลดการรั่ว เพิ่มแหล่งความจริงที่สอง |
| ฝังใน agent `.md` ทั้ง 8 ไฟล์ | **แพ้** — สำเนา 8 ชุด และเกิดบั๊กจริงแล้ว (`# Snack` ใน `poteto-mode.md`) |


## 2. Skill ที่ติดตั้ง (ข้อความเต็ม)

ไฟล์: `CONSOLE\bundle\skills\bazer-mode-rules\SKILL.md` + `references/` 4 ไฟล์

| ไฟล์ | เนื้อหา |
|---|---|
| `SKILL.md` | ตารางทริกเกอร์ + กฎที่ยังอยู่ AGENTS.md + คำสั่งตรวจ |
| `references/blank-line.md` | block เดียวกันเว้น 1 · H2/H3/H4 เว้น 2 · H1 เว้น 3 · ห้ามยุบ |
| `references/guide-non-code.md` | comprehensive guide สำหรับคนไม่รู้เรื่องนี้มาก่อน + โครง 6 ส่วน |
| `references/file-scope.md` | ขอบเขตไฟล์ของ Buddha/Bazer + ห้ามอ่านทางอ้อม |
| `references/mode-lock.md` | ลำดับช่องที่ชนะ · ห้ามแก้มือ · คำสั่งตรวจ · สิ่งที่ล็อกไม่ได้ |

หลักฐานว่าติดตั้งและโหลดได้: หลัง `update-apply` ระบบขึ้น skill ใหม่ในรายการที่ใช้ได้ (`bazer-mode-rules`) และตัวตรวจตอบ `PASS R7`


## 3. ตารางทริกเกอร์

| เงื่อนไข | โหลด | กฎ |
|---|---|---|
| กำลังเขียน/แก้ `*.md` | `references/blank-line.md` | เว้นบรรทัด 1/2/3 |
| prompt มี guide / คู่มือ / อธิบายให้คนอื่น / สอน | `references/guide-non-code.md` | เขียนแบบ comprehensive guide |
| อยู่ในโหมด `buddha` / `bazer` | `references/file-scope.md` | แตะเฉพาะพาธที่ผู้ใช้ระบุ |
| จะแก้ `opencode.jsonc` / `model.json` / `agents/*.md` / `cli.json` | `references/mode-lock.md` | สั่งผ่าน Console + รันตัวตรวจ |


## 4. ลำดับการย้ายที่ทำจริง (ปลอดภัย)

1. เขียน skill ใน bundle (ยังไม่กระทบเครื่อง)
2. `.bak` ของ `AGENTS.md` เดิม → `AGENTS.md.bak-20261018-150957`
3. แก้ `bundle/config/AGENTS.md.template` ให้เป็นฉบับย่อ (กัน `reset-template` กู้ตัวเก่า)
4. `update-apply` → skill ถูกติดตั้ง
5. เขียน `AGENTS.md` ฉบับย่อ (19 บรรทัด + marker)
6. รัน `mode-lock.mjs` → `PASS R6` + `PASS R7` · `/api/verify` = `fail 0`
7. ระบบโหลดกฎชุดใหม่ทันที (ยืนยันจาก system prompt ของ session ถัดไปที่เปลี่ยนเป็นฉบับย่อ)


## 5. อะไรห้ามย้าย

- **Plannotator gate** — ต้องมีผลกับ `plan` (built-in) ด้วย และด่านจริงคือ permission ของปลั๊กอิน (`submit_plan` ถูก deny ให้ build/primary อื่นที่ `dist/index.js:12809-12820`)
- **Max Effort** — เป็นนโยบายระดับเครื่อง ไม่ผูกกับโหมดใดโหมดหนึ่ง
- ข้อความในโหมดอื่นที่อ้างถึงกฎ: `bazer.md` ประกาศขอบเขตไฟล์ในตัวเองอยู่แล้ว (ไม่พึ่ง skill) — คงไว้เป็น defense in depth


## 6. ข้อเสนอที่ต้องแก้ใน Console (ยังไม่แก้)

| # | ไฟล์:บรรทัด | เสนอ |
|---|---|---|
| 1 | `console.mjs` `DEFAULTS` (~บรรทัด 19-24) | เพิ่ม `modeLock` (ทำแล้วในรอบนี้) — ถ้าต้องการให้เครื่องใหม่ล็อกทันที ให้ default `on:true` (ตอนนี้ `on:false`) |
| 2 | `console.mjs` `PLAN_AGENTS` (~บรรทัด 80) | ยัง hardcode 5 ตัว — ควรอ่านจาก `bundle/config/mode-lock.json` ถ้าจะขยายโหมดในอนาคต |
| 3 | `console.html` (`vLocker`, ~บรรทัด 446) | ควรเพิ่มช่องแก้ `effort` แยกจาก select เดิม (ตอนนี้ใช้ `mEffort` ร่วม) |
