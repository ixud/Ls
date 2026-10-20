# BAZER Console

ศูนย์ควบคุม config ของ OpenCode — กดเดียวจัดการทุกอย่างที่ปกติต้องเปิดไฟล์แก้เอง ทำงานในเครื่องคุณเท่านั้น (127.0.0.1) เป็นแอปหน้าจอเล็ก ๆ ที่เปิดผ่านเบราว์เซอร์

สเปคของโหมด/โฟลว์/การติดตั้ง (ต้นทาง → ปลายทาง, BAZER FLOW v2) อยู่ที่ **`../FLOW.md`** — README นี้ไม่คัดลอกตารางเหล่านั้นมา เพื่อไม่ให้ไม่ตรงกัน

**วิธีเปิด:** ดับเบิลคลิก **`BAZER Console.vbs`** (Windows) · **`CONSOLE/MACOS/BAZER Console.command`** (macOS) · **`CONSOLE/LINUX/BAZER Console.sh`** (Linux) ในโฟลเดอร์นี้

- ครั้งแรก: แอปจะสตาร์ทเองเบื้องหลัง (ซ่อนหน้าต่าง) แล้วเด้งเบราว์เซอร์ให้
- เปิดซ้ำ: ถ้าแอปเปิดอยู่แล้ว จะเด้งเบราว์เซอร์ไปหน้าเดิมทันที (ไม่สตาร์ทซ้ำ)
- ปิดแอป: ปิด `node.exe` ที่รัน `console.mjs` ใน Task Manager หรือรีสตาร์ทเครื่อง

**สิ่งที่ต้องมี:** Windows 10/11 · macOS · หรือ Linux + Node.js 22.5 ขึ้นไป (มีอยู่แล้วถ้าเครื่องนี้ใช้ OpenCode) — ไม่ต้องติดตั้งอะไรเพิ่ม แอปใช้เฉพาะของที่มากับ Node เอง (ฝั่ง macOS/Linux ดูรายละเอียดที่ `MACOS/README.md` และ `LINUX/README.md`)


**ครั้งแรกที่ใช้ — ติดตั้งอัตโนมัติ:**

เปิดแอป → แท็บ "ภาพรวม" → การ์ด "🚀 ติดตั้งเสร็จสรรพ" → กดปุ่ม "ติดตั้งเสร็จสรรพ - ทั้งหมด"

ระบบติดตั้งให้ครบในคลิกเดียว: config, skills (ชุด pStack ~54 ตัว), agents (Bazer, Buddha, builder, arena, Snack, poteto-mode และอื่น ๆ), commands, ปลั๊กอิน (Plannotator + bazer-fire 🔥 + bazer-flow), ไฟล์ล็อก + ตัวเปิด server 4096, AGENTS.md และ pstack-models.md — ทุกการเขียนมีการสำรองก่อนเสมอ กดซ้ำได้ปลอดภัย


**แท็บต่าง ๆ ทำอะไร:**

| แท็บ | ทำอะไร |
|---|---|
| **ภาพรวม** | ไฟสถานะทุกอย่าง + ปุ่ม "ตรวจความครบ" (Verify) + การ์ด "ติดตั้งเสร็จสรรพ" สำหรับเครื่องใหม่ + การ์ด "อัพเดตเวอร์ชัน" (ปุ่ม "ตรวจว่ามีอะไรใหม่" · "อัพเดตทั้งหมด" · **"🔄 ซิงค์ทั้งหมด"** = อัพเดต + planningAgents + mirror) + การ์ด "ไฟล์ส่วนตัวจาก template" (รีเซ็ต AGENTS.md / pstack-models.md จาก template) |
| **ล็อก & โมเดล** | สลับโหมดล็อก server 3 แบบ (ล็อกแน่น / provider เดียว / ปลดล็อก) พร้อมรีสตาร์ท server ให้, แก้ blacklist, ตั้งโมเดล + effort พร้อมซิงค์ `model.json` |
| **Server & Cline** | ตรวจสุขภาพ/รีสตาร์ท server 4096, เปิด-ปิด autostart ตอนเปิดเครื่อง, ค่าที่ใส่ใน Cline, แก้ `cli.json` |
| **pStack** | Apply ชุด build, **🧩 ชุดโมเดล (sets) → เลือก function ที่ชุดดูแล + Quick Select**, จัดการ skills/agents/commands (แก้ prompt ในตัวได้), อัปเดตผ่าน npx skills |
| **โหมดผู้ช่วย (กลุ่ม)** | หนึ่งแท็บต่อโหมด — สถานะติดตั้ง, "ของที่โหมดนี้ต้องมี", แก้ prompt, สวิตช์เปิด/ปิด: **Bazer** (ลงมือทำแบบจำกัดไฟล์) · **Buddha** (BAZER FLOW v2 — ทุกเฟสในเซสชันเดียว ไม่สลับ agent, การ์ด Arena session, ป้าย **BAZER FLOW v2** ที่เทียบ marker กับ bundle, การ์ด **BAZER FLOW v2 · Plan gate + builder**, และปุ่ม "อัพเดต mirror ทั้งหมด") · **Builder** (subagent ตัวเดียวสำหรับ Plan Mode) · **Arena** (มี Arena session config) · **Snack** · **Poteto** · **Advisor** |
| **Subagent (กลุ่ม)** | **Builder** (subagent ที่ Buddha และ Plan Mode เรียกใช้ — ไม่โชว์ใน Main Agents) · **Comment Sicko** (ตัวตรวจคอมเมนต์) · **Poteto Agent** (ลูกมือของ poteto-mode) — สถานะ วิธีถูกเรียก เปิด/ปิด และแก้ prompt |
| **โปรเจกต์** | สแกนว่าเครื่องเคยใช้ OpenCode ที่โฟลเดอร์ไหน + จัดการ agent รายโปรเจกต์ |
| **Plannotator** | เปิด-ปิดปลั๊กอิน, แก้ `config.json`, จัดการคำสั่ง, เปิดคลังแผน |
| **ประวัติ & สำรอง** | ทุกการแก้ถูกเก็บเป็นประวัติ + สำรองไฟล์เดิม กู้คืนได้รายชุด (เก็บ 30 ชุดล่าสุด) |


**ปุ่ม "ซิงค์ทั้งหมด" (แท็บภาพรวม):** ทำ 3 อย่างเรียงกันในคลิกเดียว — อัพเดตไฟล์ที่ต่างจาก bundle (มีสำรองก่อนเขียน) → แก้ `planningAgents` ให้ตรงโหมดจริง → อัพเดต mirror — แล้วรัน "ตรวจความครบ" ให้ทันที ใช้หลัง `git pull` แทนการกด 3 ปุ่มเอง (ลำดับเต็มอยู่ที่ `../FLOW.md` §4)


**โหมด และ mirror (BAZERs-EXTENSION-*):** โหมดหนึ่ง "เรียก" โหมดหลักอื่นได้ด้วยการโหลด skill mirror ใน `%USERPROFILE%\.agents\skills\` (เช่น Buddha เรียก Arena ผ่าน `BAZERs-EXTENSION-Arena`) — mirror ถูกซ่อนจากการ auto-invoke แต่โหลดด้วย ID ได้ · ต้นทางคือ `bundle/agents` — แก้ prompt แล้วกด "อัพเดต mirror ทั้งหมด" ในแท็บ Buddha (หรือขั้นตอน "ติดตั้งเสร็จสรรพ" / "อัพเดตทั้งหมด" / "ซิงค์ทั้งหมด" จัดการให้อัตโนมัติ)

**ห้ามแก้ไฟล์ mirror ด้วยมือ** — ไฟล์ `BAZERs-EXTENSION-*\SKILL.md` ถูก generate จาก agent ตัวจริงในเครื่อง (ถ้ายังไม่ติดตั้ง ใช้จาก bundle) และจะถูกทับทุกครั้งที่อัพเดต

**BAZER FLOW v2 (โฟลว์บังคับของ Buddha Mode + Plan Mode):** Buddha เดินทุกเฟสในเซสชันและ agent เดียว — B1 GATE 1 (แผน Arena) → B2 Arena inside → B3 GATE 2 (แผนสร้าง) → B4 Built inside (เรียก `builder` เป็น subagent inline) — ไม่มีการสลับ agent · Plan Mode ใช้ `builder` subagent หลังอนุมัติ (Plan ไม่เขียนไฟล์เอง) · **ปุ่มอนุมัติของ Plannotator อ่าน `Approve → Buddha` แล้ว (ไม่มีเครื่องหมาย `(?)`)** — ค่าเริ่มต้นสลับเป็น `buddha` และ Buddha เรียก `builder` เป็น subagent inline (Buddha ไม่สลับ agent ต่อ) · ค่าเก่าในเบราว์เซอร์ถูกกันด้วย key `plannotator-approve-target-v2` · ตัวแพตช์แตะ 5 จุด ตรวจได้ด้วย `node patch-plannotator.mjs --check` — console อัพเดตให้อัตโนมัติทุกครั้งที่กด ติดตั้ง/ซ่อม BAZER FLOW v2 · อัพเดตทั้งหมด · ซิงค์ทั้งหมด · ติดตั้งเสร็จสรรพ และมีปุ่ม **"อัพเดต config ปุ่มอนุมัติ → Buddha (ไม่มี "(?)")"** ในการ์ด BAZER FLOW v2 สั่งเองได้ · กติกาถูกบังคับจริงด้วยปลั๊กอิน `bazer-flow` (ก่อนอนุมัติเขียนไฟล์นอก `%TEMP%\bazer\` ไม่ได้, `task(builder)` ไม่ได้) — ติดตั้ง/ซ่อม/ปิดได้จากปุ่มในการ์ด BAZER FLOW v2 (แท็บ Buddha หรือ Plannotator) · สเปคทั้งหมดอยู่ที่ `../FLOW.md` §3 · marker `<!-- BAZER-FLOW: v2 -->` ใน `bundle/agents/buddha.md` ถูกเทียบกับไฟล์ที่ติดตั้ง · ตรวจ logic ของ gate ด้วย `node flow-check.mjs`

**ค่าเริ่มต้นหลังติดตั้ง:** `tui.json` ได้ `keybinds.messages_copy = ["ctrl+alt+m","ctrl+alt+o"]` (เฉพาะเมื่อยังไม่มีค่า — ค่าที่ผู้ใช้แก้เองไม่ถูกทับ) และมี shortcut **BAZER CONSOLE - WINDOW** ที่ `SETUP/OPENCODE` — ตั้งชื่อตาม OS ของตัวเอง: `BAZER CONSOLE - WINDOW (Windows).lnk` (ชี้ portable launcher `BAZER CONSOLE - WINDOW (Windows).vbs` · `.lnk` ถูกสร้างใหม่ต่อเครื่องและไม่ขึ้น git) · `BAZER CONSOLE - WINDOW (macOS).command` · `BAZER CONSOLE - WINDOW (Linux).desktop`

การ์ด **Arena session** (แท็บ Arena และ Buddha อ่านค่าเดียวกัน) เขียนบรรทัด `arena runners` + `arena cross-judge pool` ใน `~/.agents/pstack-models.md` — ไฟล์เก่าที่มีบรรทัด `bazer arena runners` จะมีปุ่มย้ายค่าให้ในแท็บ Buddha · จัดทั้งไฟล์เป็น **ชุดโมเดล (sets)** ได้ที่แท็บ pStack → การ์ด "🧩 ชุดโมเดล & Functions"


**ไฟล์ในโฟลเดอร์นี้:**

| ไฟล์ | หน้าที่ |
|---|---|
| `BAZER Console.vbs` | ปุ่มเปิดแอป Windows (ดับเบิลคลิก) — macOS/Linux ใช้ `MACOS/BAZER Console.command` · `LINUX/BAZER Console.sh` |
| `console.mjs` | ตัวแอป (backend + API) |
| `console.html` | หน้าจอ UI — แก้แล้วรีเฟรชเบราว์เซอร์เห็นทันที ไม่ต้องปิดแอป |
| `console.config.json` | ค่าตั้งของแอป (พอร์ต, โฟลเดอร์ launch/build) — สร้างอัตโนมัติครั้งแรก |
| `console.runtime.json` | token/พอร์ตของรอบที่เปิดอยู่ (แอปเขียนเอง อย่าแก้) |
| `history.tsv` | ประวัติการเปลี่ยนแปลงทั้งหมด |
| `backups/` | ชุดสำรองอัตโนมัติ (เก็บ 30 ชุดล่าสุด) |
| `launch-template/` | ไฟล์ต้นแบบสำหรับติดตั้ง: ตัวเปิด server 4096 + สคริปต์สลับโหมดล็อก |
| `bundle/` | ชุดติดตั้ง: skills + agents + commands + config template + ปลั๊กอิน bazer-fire + คู่มือใน `bundle/docs/guide/` |
| `patch-plannotator.mjs` | patch ปุ่มอนุมัติของ Plannotator → **`buddha`** 5 จุด — ค่าเริ่มต้น `{switchTo:"buddha"}` · เมนู Settings · label (ปุ่มอ่าน `Approve → Buddha`) · ลบ span `(?)` · key `plannotator-approve-target-v2` (ทับค่าเก่าในเบราว์เซอร์) — idempotent · `--dry-run` · `--list` · `--check` (exit 1 = ยังไม่ครบจุด) · patch ทุก copy; รันอัตโนมัติจากปุ่ม ติดตั้ง/ซ่อม BAZER FLOW v2 · อัพเดตทั้งหมด · ซิงค์ทั้งหมด · ติดตั้งเสร็จสรรพ (และมีปุ่ม **อัพเดต config ปุ่มอนุมัติ → Buddha (ไม่มี "(?)")** ใน flowCard) · ตัวเฝ้าอยู่ใน `flow-check.mjs` |
| `CHECKS.md` | บันทึกผลตรวจของตัวแอปเอง (static / เครื่องใหม่ / เครื่องเก่า) + บั๊กที่เจอและแก้แล้ว + เรื่องที่ยังค้าง |
| `console.config.json` → `modelSets` | ชุดโมเดล (sets) ที่ตั้งไว้ในแท็บ pStack — เก็บในไฟล์ config ไม่ใช่ในโค้ด |


**เอกสารที่เกี่ยวข้อง (อ่านคู่กับโฟลเดอร์นี้):**

| ไฟล์ | อ่านเมื่อไหร่ |
|---|---|
| `../FLOW.md` | อยากรู้ว่า "อะไรคุมอะไร" — ต้นทาง → ปลายทาง, ใครเขียนไฟล์ไหน, BAZER FLOW v2, และลำดับที่ต้องทำหลัง git pull |
| `../GUIDE.md` | คู่มือแบบไม่ต้องเขียนโค้ด — ตำแหน่งไฟล์ทั้งหมดของ OpenCode และวิธีใช้ทุกโหมด |
| `CHECKS.md` | ผลตรวจล่าสุดของตัวแอป + บั๊กที่แก้แล้ว |


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
| ดับเบิลคลิกแล้วขึ้น MsgBox ไม่สำเร็จ | ติดตั้ง Node.js ถ้ายังไม่มี หรือเปิด PowerShell/Terminal ในโฟลเดอร์นี้แล้วรัน `node console.mjs` เพื่อดู error |
| เบราว์เซอร์เปิดแต่หน้าโหลดไม่ขึ้น | ปิด node.exe ที่ค้างใน Task Manager แล้วเปิดใหม่ |
| ดาวน์โหลดมาเป็น zip แล้ว Windows บล็อกไฟล์ | คลิกขวาที่ไฟล์ zip → Properties → ติ๊ก "Unblock" → OK |
| macOS/Linux: ดับเบิลคลิก `.command`/`.sh`/`.desktop` แล้วไม่รัน | exec bit หายตอนคัดลอกข้ามระบบ — `chmod +x "BAZER Console.command" "../BAZER CONSOLE - WINDOW (macOS).command"` (หรือ `.sh`/`(Linux).desktop`) ครั้งเดียว |
| Firefox ขึ้น "This address is restricted" | พอร์ตนั้นอยู่ในบัญชีห้ามของเบราว์เซอร์ (เช่น 4190) — แก้ `port` ใน `console.config.json` เป็นค่าอื่น เช่น 4311 แล้วเปิดใหม่ |
| อยากใช้พอร์ตอื่น | แก้ `port` ใน `console.config.json` — เลือกพอร์ตที่ไม่ถูกบล็อก (เลี่ยงช่วง 1-1023 และ 4190, 6000, 6665-6669, 10080) |
| ปุ่มในหน้าเว็บกดไม่ได้ | กด Ctrl+F5 รีเฟรช (token อาจเป็นของรอบเก่า) |
| "ตรวจความครบ" ขึ้นว่า **ไฟล์ launch บางตัวหาย** | ข้อความจะบอกชื่อไฟล์จริงและโฟลเดอร์ที่ตรวจ — ปกติคือ `%USERPROFILE%\opencode-launch` (ค่าตั้ง `launchDir` ใน `console.config.json` ถ้าเว้นว่างจะใช้โฟลเดอร์นี้) กด "ติดตั้งเสร็จสรรพ - ทั้งหมด" ที่แท็บภาพรวมเพื่อสร้างไฟล์ชุดนี้จาก `launch-template/` |
| "ตรวจความครบ" ขึ้น `info` ว่า **template ส่วนตัวถูกแก้เอง** | ไม่ใช่ error — `AGENTS.md` / `pstack-models.md` เป็นไฟล์ส่วนตัว ระบบไม่ทับให้เอง ถ้าต้องการกลับไปค่าเริ่มต้นจาก bundle กด "รีเซ็ตจาก template" ในการ์ด "ไฟล์ส่วนตัวจาก template" (แท็บภาพรวม) |
