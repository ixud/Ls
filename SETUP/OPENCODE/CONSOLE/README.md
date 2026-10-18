# BAZER Console

ศูนย์ควบคุม config ของ OpenCode — กดเดียวจัดการทุกอย่างที่ปกติต้องเปิดไฟล์แก้เอง ทำงานในเครื่องคุณเท่านั้น (127.0.0.1) เป็นแอปหน้าจอเล็ก ๆ ที่เปิดผ่านเบราว์เซอร์

**วิธีเปิด:** ดับเบิลคลิก **`BAZER Console.vbs`** ในโฟลเดอร์นี้

- ครั้งแรก: แอปจะสตาร์ทเองเบื้องหลัง (ซ่อนหน้าต่าง) แล้วเด้งเบราว์เซอร์ให้
- เปิดซ้ำ: ถ้าแอปเปิดอยู่แล้ว จะเด้งเบราว์เซอร์ไปหน้าเดิมทันที (ไม่สตาร์ทซ้ำ)
- ปิดแอป: ปิด `node.exe` ที่รัน `console.mjs` ใน Task Manager หรือรีสตาร์ทเครื่อง

**สิ่งที่ต้องมี:** Windows 10/11 + Node.js 22.5 ขึ้นไป (มีอยู่แล้วถ้าเครื่องนี้ใช้ OpenCode) — ไม่ต้องติดตั้งอะไรเพิ่ม แอปใช้เฉพาะของที่มากับ Node เอง


**ครั้งแรกที่ใช้ — ติดตั้งอัตโนมัติ:**

เปิดแอป → แท็บ "ภาพรวม" → การ์ด "🚀 ติดตั้งเสร็จสรรพ" → กดปุ่ม "ติดตั้งเสร็จสรรพ - ทั้งหมด"

ระบบติดตั้งให้ครบในคลิกเดียว: config, skills (ชุด pStack ~54 ตัว), agents (Bazer, arena, Snack, poteto-mode และอื่น ๆ), commands, ปลั๊กอิน (Plannotator + bazer-fire 🔥), ไฟล์ล็อก + ตัวเปิด server 4096, AGENTS.md และ pstack-models.md — ทุกการเขียนมีการสำรองก่อนเสมอ กดซ้ำได้ปลอดภัย


**แท็บต่าง ๆ ทำอะไร:**

| แท็บ | ทำอะไร |
|---|---|
| **ภาพรวม** | ไฟสถานะทุกอย่าง + ปุ่ม "ตรวจความครบ" (Verify) + การ์ด "ติดตั้งเสร็จสรรพ" สำหรับเครื่องใหม่ |
| **ล็อก & โมเดล** | สลับโหมดล็อก server 3 แบบ (ล็อกแน่น / provider เดียว / ปลดล็อก) พร้อมรีสตาร์ท server ให้, แก้ blacklist, ตั้งโมเดล + effort พร้อมซิงค์ `model.json` |
| **Server & Cline** | ตรวจสุขภาพ/รีสตาร์ท server 4096, เปิด-ปิด autostart ตอนเปิดเครื่อง, ค่าที่ใส่ใน Cline, แก้ `cli.json` |
| **pStack** | Apply ชุด build, **🧩 ชุดโมเดล (sets) → เลือก function ที่ชุดดูแล + Quick Select**, จัดการ skills/agents/commands (แก้ prompt ในตัวได้), อัปเดตผ่าน npx skills |
| **โหมดผู้ช่วย (กลุ่ม)** | หนึ่งแท็บต่อโหมด — สถานะติดตั้ง, "ของที่โหมดนี้ต้องมี", แก้ prompt, สวิตช์เปิด/ปิด: **Bazer** (ลงมือทำแบบจำกัดไฟล์) · **Buddha** (วางแผน + Arena + สร้าง — มีการ์ด Arena session และปุ่ม "อัพเดต mirror") · **Arena** (มี Arena session config) · **Snack** · **Poteto** · **Advisor** |
| **Subagent (กลุ่ม)** | **Comment Sicko** (ตัวตรวจคอมเมนต์) · **Poteto Agent** (ลูกมือของ poteto-mode) — สถานะ วิธีถูกเรียก เปิด/ปิด และแก้ prompt |
| **โปรเจกต์** | สแกนว่าเครื่องเคยใช้ OpenCode ที่โฟลเดอร์ไหน + จัดการ agent รายโปรเจกต์ |
| **Plannotator** | เปิด-ปิดปลั๊กอิน, แก้ `config.json`, จัดการคำสั่ง, เปิดคลังแผน |
| **ประวัติ & สำรอง** | ทุกการแก้ถูกเก็บเป็นประวัติ + สำรองไฟล์เดิม กู้คืนได้รายชุด (เก็บ 30 ชุดล่าสุด) |


**โหมด และ mirror (BAZERs-EXTENSION-*):** โหมดหนึ่ง "เรียก" โหมดหลักอื่นได้ด้วยการโหลด skill mirror ใน `%USERPROFILE%\.agents\skills\` (เช่น Buddha เรียก Arena ผ่าน `BAZERs-EXTENSION-Arena`) — mirror ถูกซ่อนจากการ auto-invoke แต่โหลดด้วย ID ได้ · ต้นทางคือ `bundle/agents` — แก้ prompt แล้วกด "อัพเดต mirror" ในแท็บ Buddha (หรือขั้นตอน "ติดตั้งเสร็จสรรพ" จัดการให้ อัตโนมัติ)

การ์ด **Arena session** (แท็บ Arena และ Buddha อ่านค่าเดียวกัน) เขียนบรรทัด `arena runners` + `arena cross-judge pool` ใน `~/.agents/pstack-models.md` — ไฟล์เก่าที่มีบรรทัด `bazer arena runners` จะมีปุ่มย้ายค่าให้ในแท็บ Buddha · จัดทั้งไฟล์เป็น **ชุดโมเดล (sets)** ได้ที่แท็บ pStack → การ์ด "🧩 ชุดโมเดล & Functions"


**ไฟล์ในโฟลเดอร์นี้:**

| ไฟล์ | หน้าที่ |
|---|---|
| `BAZER Console.vbs` | ปุ่มเปิดแอป (ดับเบิลคลิก) |
| `console.mjs` | ตัวแอป (backend + API) |
| `console.html` | หน้าจอ UI — แก้แล้วรีเฟรชเบราว์เซอร์เห็นทันที ไม่ต้องปิดแอป |
| `console.config.json` | ค่าตั้งของแอป (พอร์ต, โฟลเดอร์ launch/build) — สร้างอัตโนมัติครั้งแรก |
| `console.runtime.json` | token/พอร์ตของรอบที่เปิดอยู่ (แอปเขียนเอง อย่าแก้) |
| `history.tsv` | ประวัติการเปลี่ยนแปลงทั้งหมด |
| `backups/` | ชุดสำรองอัตโนมัติ (เก็บ 30 ชุดล่าสุด) |
| `launch-template/` | ไฟล์ต้นแบบสำหรับติดตั้ง: ตัวเปิด server 4096 + สคริปต์สลับโหมดล็อก |
| `bundle/` | ชุดติดตั้ง: skills + agents + commands + config template + ปลั๊กอิน bazer-fire |


**โฟลเดอร์ที่แอปติดตั้งให้ (ตำแหน่งมาตรฐานของ OpenCode):**

- `%USERPROFILE%\.config\opencode\` — agents, commands, `AGENTS.md`, `opencode.jsonc`, `serve-restricted.jsonc`, `plugins\bazer-fire`
- `%USERPROFILE%\.agents\skills\` — skills จาก bundle
- `%USERPROFILE%\.agents\pstack-models.md` — โมเดลต่อ role ของ pStack
- `%USERPROFILE%\opencode-launch\` — ไฟล์ launch (ตัวเปิด server 4096) — สร้างครั้งแรกที่กดติดตั้ง (หรือเปลี่ยนที่ใน `console.config.json`)


**ถ้าย้ายโฟลเดอร์:** ปกติไม่ต้องตั้งอะไร — ครั้งแรกที่เปิด แอปหา `bundle` (ในโฟลเดอร์แอป) และ `launchDir` ให้เอง ถ้าย้ายที่แล้วหาไม่เจอ ให้เปิด `console.config.json` ใส่ path เต็มของเครื่องคุณ (แล้วปิด-เปิดแอปใหม่):

```json
{
  "port": 4310,
  "launchDir": "<โฟลเดอร์ที่เก็บไฟล์ launch — มี opencode-serve.vbs>",
  "buildDir": "<โฟลเดอร์ build (ค่าเริ่มต้น = bundle ข้างแอป)>",
  "projectConfigs": ["<path opencode.json ของโปรเจกต์ที่อยากให้ตรวจสถานะ plugin — ไม่บังคับ>"]
}
```


**ความปลอดภัย:**

- เปิดเฉพาะ 127.0.0.1 — เครื่องอื่นในวง LAN เข้าไม่ได้
- ทุกคำสั่ง API ต้องมี token (สุ่มทุกครั้งที่เปิดแอป) — เว็บแปลกปลอมในเครื่องยิงเข้ามาไม่ได้
- เขียนไฟล์ได้เฉพาะ path ที่อยู่ใน allowlist (config, skills, agents, commands, launch, state, plannotator) — ไม่แตะที่อื่น
- ทุกการเขียนผ่านการ backup ก่อน + log ทุกครั้ง


**แก้ปัญหาที่พบบ่อย:**

| อาการ | ทางแก้ |
|---|---|
| ดับเบิลคลิกแล้วขึ้น MsgBox ไม่สำเร็จ | ติดตั้ง Node.js ถ้ายังไม่มี หรือเปิด PowerShell ในโฟลเดอร์นี้แล้วรัน `node console.mjs` เพื่อดู error |
| เบราว์เซอร์เปิดแต่หน้าโหลดไม่ขึ้น | ปิด node.exe ที่ค้างใน Task Manager แล้วเปิดใหม่ |
| ดาวน์โหลดมาเป็น zip แล้ว Windows บล็อกไฟล์ | คลิกขวาที่ไฟล์ zip → Properties → ติ๊ก "Unblock" → OK |
| Firefox ขึ้น "This address is restricted" | พอร์ตนั้นอยู่ในบัญชีห้ามของเบราว์เซอร์ (เช่น 4190) — แก้ `port` ใน `console.config.json` เป็นค่าอื่น เช่น 4311 แล้วเปิดใหม่ |
| อยากใช้พอร์ตอื่น | แก้ `port` ใน `console.config.json` — เลือกพอร์ตที่ไม่ถูกบล็อก (เลี่ยงช่วง 1-1023 และ 4190, 6000, 6665-6669, 10080) |
| ปุ่มในหน้าเว็บกดไม่ได้ | กด Ctrl+F5 รีเฟรช (token อาจเป็นของรอบเก่า) |
