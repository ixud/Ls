# คู่มือ OpenCode — ไฟล์ตั้งค่าทั้งหมดที่ต้องรู้

คู่มือนี้เขียนสำหรับคนที่ไม่เคยรู้จัก OpenCode มาก่อน อ่านจบแล้วจะสร้างและแก้ไฟล์ตั้งค่าเองได้ทั้งหมด รวมถึงติดตั้ง Skill ชุดสำเร็จด้วยคำสั่งบรรทัดเดียว โดยไม่ต้องเขียนโปรแกรมเป็น

ครั้งแรกแนะนำให้อ่านหัวข้อ "ทำความรู้จัก" และ "หลักการ 3 ข้อ" ให้จบก่อน จากนั้นใช้ตารางไฟล์เป็นคู่มืออ้างอิงได้เลย


## 📑 สารบัญ

- [🤖 ทำความรู้จัก OpenCode (อ่าน 1 นาที)](#-ทำความรู้จัก-opencode-อ่าน-1-นาที)
- [🧭 หลักการ 3 ข้อ (เข้าใจก่อนลงมือ)](#-หลักการ-3-ข้อ-เข้าใจก่อนลงมือ)
- [📖 ศัพท์สั้น ๆ ที่จะเจอในตาราง](#-ศัพท์สั้น-ๆ-ที่จะเจอในตาราง)
- [🌍 Global (root) — ไฟล์ที่ใช้กับทุกโปรเจกต์](#-global-root--ไฟล์ที่ใช้กับทุกโปรเจกต์)
- [🏠 Project — ไฟล์ที่ใช้เฉพาะโปรเจกต์](#-project--ไฟล์ที่ใช้เฉพาะโปรเจกต์)
- [🔗 ไฟล์ที่ระบบหยิบมาใช้เองจากที่อื่น (ไม่ต้องย้าย)](#-ไฟล์ที่ระบบหยิบมาใช้เองจากที่อื่น-ไม่ต้องย้าย)
- [🧩 ติดตั้งชุด Skill สำเร็จรูปด้วย `npx skills`](#-ติดตั้งชุด-skill-สำเร็จรูปด้วย-npx-skills)
- [🖥️ เปิด OpenCode Server ให้ Cline ใช้ (รันเองอัตโนมัติตอนเปิดเครื่อง)](#️-เปิด-opencode-server-ให้-cline-ใช้-รันเองอัตโนมัติตอนเปิดเครื่อง)
- [🎭 เปิดโหมด Arena / โหมด Plan ด้วย CLI](#-เปิดโหมด-arena--โหมด-plan-ด้วย-cli)
- [🗄️ ไฟล์ข้อมูล — ห้ามแก้ด้วยมือ](#️-ไฟล์ข้อมูล--ห้ามแก้ด้วยมือ)
- [✅ สูตรสำเร็จ 4 แบบ (ทำตามได้เลย)](#-สูตรสำเร็จ-4-แบบ-ทำตามได้เลย)
- [🚀 สร้างไฟล์ด้วยคำสั่ง CLI (Windows / macOS)](#-สร้างไฟล์ด้วยคำสั่ง-cli-windows--macos)
- [⚖️ ใครทับใคร (ลำดับความสำคัญ)](#️-ใครทับใคร-ลำดับความสำคัญ)
- [🎚️ ตั้ง Max Effort แล้วไม่ติด — เพราะ variant ใน TUI ทับ config](#️-ตั้ง-max-effort-แล้วไม่ติด--เพราะ-variant-ใน-tui-ทับ-config)
- [🧰 เช็คลิสต์หลังแก้ไฟล์ทุกครั้ง](#-เช็คลิสต์หลังแก้ไฟล์ทุกครั้ง)
- [📍 ภาคผนวก ก — แผนที่ตำแหน่งไฟล์ (Windows / macOS)](#-ภาคผนวก-ก--แผนที่ตำแหน่งไฟล์-windows--macos)
- [🕵️ ภาคผนวก ข — ข้อสังเกตจากเวอร์ชัน 1.18.35](#️-ภาคผนวก-ข--ข้อสังเกตจากเวอร์ชัน-11835)


## 🤖 ทำความรู้จัก OpenCode (อ่าน 1 นาที)

OpenCode คือโปรแกรมผู้ช่วยทำงานบนหน้าต่าง terminal — คุณพิมพ์สั่งเป็นภาษาไทยหรืออังกฤษ มันจะเรียก AI มาช่วยอ่านไฟล์ แก้ไฟล์ และรันคำสั่งให้

ตัวโปรแกรมมีพฤติกรรมเริ่มต้นในตัวอยู่แล้ว แต่ถ้าอยากให้มันรู้จักเรา รู้จักโปรเจกต์ของเรา หรือทำงานพิเศษเฉพาะเครื่อง เราต้องบอกผ่าน "ไฟล์ตั้งค่า" ซึ่งเป็นไฟล์ข้อความธรรมดา (`.json` หรือ `.md`) เปิดแก้ด้วย Notepad หรือ VS Code ได้เลย

จุดสำคัญที่สุด: OpenCode ไม่มีหน้า Settings แบบโปรแกรมทั่วไป — ทุกอย่างคือไฟล์ที่วางไว้ในโฟลเดอร์ที่กำหนด รู้ตำแหน่งไฟล์ = ตั้งค่าได้


## 🧭 หลักการ 3 ข้อ (เข้าใจก่อนลงมือ)

1. **มี 2 ระดับ: Global กับ Project** — Global อยู่ที่ `~/.config/opencode/` ใช้กับทุกโปรเจกต์ในเครื่อง; Project อยู่ที่รากของโปรเจกต์นั้น ๆ ใช้เฉพาะโปรเจกต์นั้น
2. **ค่าซ้อนกันแบบ merge** — ถ้าตั้งคีย์เดียวกันทั้งสองระดับ ค่าฝั่ง Project จะทับ Global เฉพาะคีย์นั้น ไม่ใช่แทนทั้งไฟล์
3. **แก้ไฟล์แล้วต้องปิด-เปิดโปรแกรมใหม่** — โปรแกรมอ่าน config ครั้งเดียวตอนเปิด ถ้าแก้ระหว่างใช้งาน ต้องออกแล้วเข้าใหม่ การเปลี่ยนแปลงจึงมีผล

หมายเหตุสำหรับ Windows: สัญลักษณ์ `~` หมายถึงโฟลเดอร์ผู้ใช้ของคุณ เช่น `C:\Users\<ชื่อผู้ใช้>` — ดังนั้น Global config บน Windows จะอยู่ที่ `C:\Users\<ชื่อผู้ใช้>\.config\opencode\`


## 📖 ศัพท์สั้น ๆ ที่จะเจอในตาราง

| คำ | ความหมายแบบบ้าน ๆ |
|---|---|
| Config | ไฟล์ตั้งค่าหลักของ OpenCode (`.json` / `.jsonc`) |
| Agent | "โหมดผู้ช่วย" เช่น โหมดวางแผน (plan) และโหมดลงมือ (build) |
| Tool | เครื่องมือที่ AI เรียกใช้ได้ เช่น อ่านไฟล์ เขียนไฟล์ รันคำสั่ง |
| Plugin | ส่วนเสริมที่ติดตั้งเพิ่ม (เช่น Plannotator) |
| Command | คำสั่งลัดที่พิมพ์ขึ้นต้นด้วย `/` |
| Skill | คู่มือความรู้ชุดเล็ก ๆ ที่ AI หยิบไปอ่านเมื่อจำเป็น |
| `npx skills` | เครื่องมือติดตั้งชุด Skill สำเร็จรูปจาก GitHub ให้อัตโนมัติ (ดูหัวข้อ "ติดตั้งชุด Skill สำเร็จรูป") |
| Theme | ชุดสีของหน้าจอ |
| Keybind | ปุ่มลัดบนคีย์บอร์ด |
| MCP | ช่องทางเชื่อมต่อเครื่องมือภายนอก |


## 🌍 Global (root) — ไฟล์ที่ใช้กับทุกโปรเจกต์

ที่อยู่: `~/.config/opencode/` — บน Windows คือ `C:\Users\<ชื่อผู้ใช้>\.config\opencode\`

| ไฟล์ / โฟลเดอร์ | ใช้ทำอะไร | จะสร้าง/แก้เมื่อไหร่ |
|---|---|---|
| `opencode.json` หรือ `opencode.jsonc` | ตั้งค่าหลัก: โมเดล, plugin, สิทธิ์การใช้งาน, agent, MCP | อยากตั้งค่าที่ใช้ทุกโปรเจกต์ |
| `tui.json` | ปุ่มลัด (`keybinds`), ธีมสี (`theme`), ค่า `leader_timeout` | อยากเปลี่ยนคีย์ลัดหรือสีหน้าจอ |
| `AGENTS.md` | กฎ/คำสั่งให้ AI จำไปใช้ทุก session | อยากให้ AI ทำตามนิสัยเราตลอด |
| `plugins/` | plugin ที่โหลดอัตโนมัติทุกครั้งที่เปิด (`*.js`, `*.ts`) | อยากเพิ่มความสามารถพิเศษ |
| `commands/` | คำสั่ง `/...` ที่เราสร้างเอง (`*.md`) | อยากมีคำสั่งลัดประจำตัว |
| `agents/` | นิยามโหมดผู้ช่วยเพิ่มเติม (`*.md`) | อยากมีโหมดผู้ช่วยเฉพาะทาง |
| `skills/<ชื่อ>/SKILL.md` | ชุดความรู้ให้ AI หยิบไปใช้เป็นครั้งคราว | อยากสอนวิธีทำงานเฉพาะเรื่อง |
| `tools/*.ts` | เครื่องมือใหม่ให้ AI เรียกใช้ | ขั้นสูง — ต้องเขียน TypeScript/JavaScript |
| `themes/*.json` | ธีมสีที่ทำเอง | อยากได้ชุดสีเฉพาะตัว |
| `package.json` | รายชื่อไลบรารีที่ plugin/tools ต้องใช้ | โปรแกรมติดตั้งให้อัตโนมัติตอนเปิด |

หมายเหตุ: บางโฟลเดอร์มีชื่อเอกพจน์ใช้ได้เหมือนกัน (`plugin/`, `command/`, `agent/`) — ถ้าไม่แน่ใจให้ใช้พหูพจน์ตามตาราง


### 📄 `opencode.json` — ไฟล์ตั้งค่าหลัก

คือศูนย์กลางของทุกอย่าง ใส่ได้ทั้งโมเดลที่ใช้ รายชื่อ plugin โหมดผู้ช่วย สิทธิ์การใช้งาน และ MCP

ตัวอย่าง (ไม่ต้องใส่ทุกคีย์ — ใส่เท่าที่ใช้):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@plannotator/opencode@latest"]
}
```

- บรรทัด `$schema` ไม่มีผลกับการทำงาน แต่ช่วยให้โปรแกรมแก้ไขไฟล์เตือนเราตอนพิมพ์ผิด
- ถ้าไฟล์ผิดรูปแบบ (เช่น ลืมหรือเกินจุลภาค) โปรแกรมจะเปิดไม่ขึ้น — แก้ให้ถูกก่อนเปิด


### ⌨️ `tui.json` — ปุ่มลัดและธีม

ไฟล์นี้คุมหน้าจอ: ปุ่มลัด ธีมสี และเวลารอของปุ่ม leader

ตัวอย่างย้ายปุ่ม "คัดลอกข้อความ" ไปเป็น `Ctrl+M`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "leader_timeout": 1500,
  "keybinds": { "messages_copy": "ctrl+m" }
}
```

- ชื่อคีย์ลัดใช้ขีดล่าง เช่น `messages_copy` ไม่ใช่จุด
- ค่า `"none"` = ปิดปุ่มนั้น
- เลือกธีมได้ในไฟล์นี้ด้วยคีย์ `theme`


### 👩‍⚖️ `AGENTS.md` — กฎที่ AI ต้องทำตาม

ไฟล์นี้คือ "คู่มือพนักงาน" ของ AI — เขียนเป็นภาษาคนปกติได้เลย เช่น "ตอบเป็นไทย", "ก่อนแก้ไฟล์ให้บอกก่อน", "ห้ามแตะโฟลเดอร์ความลับ"

- Global ที่ `~/.config/opencode/AGENTS.md` = มีผลทุกโปรเจกต์
- Project ที่รากโปรเจกต์ = มีผลเฉพาะโปรเจกต์นั้น
- ถ้าโปรเจกต์มีทั้ง `AGENTS.md` และ `CLAUDE.md` ระบบจะเลือก `AGENTS.md` ก่อน


### 📂 โฟลเดอร์ที่ "โหลดเองอัตโนมัติ"

โฟลเดอร์ `plugins/`, `commands/`, `agents/`, `skills/`, `tools/`, `themes/` — วางไฟล์ไว้ข้างใน แล้วเปิดโปรแกรมใหม่ โปรแกรมจะเก็บไปใช้เอง ไม่ต้องไปลงทะเบียนที่ `opencode.json`


## 🏠 Project — ไฟล์ที่ใช้เฉพาะโปรเจกต์

ที่อยู่: รากโปรเจกต์ของคุณ เช่น `C:\Projects\my-app` (Windows) หรือ `~/projects/my-app` (macOS) — และโฟลเดอร์ `.opencode/` ที่อยู่ภายในรากนั้น

| ไฟล์ / โฟลเดอร์ | ใช้ทำอะไร |
|---|---|
| `opencode.json` / `opencode.jsonc` / `.opencode/opencode.json` | ตั้งค่าเฉพาะโปรเจกต์ (ทับค่า Global เฉพาะคีย์ที่ตั้ง) |
| `AGENTS.md` (รากโปรเจกต์) | กฎเฉพาะโปรเจกต์นี้ |
| `.opencode/plugins/` | plugin เฉพาะโปรเจกต์ |
| `.opencode/commands/` | คำสั่ง `/...` เฉพาะโปรเจกต์ |
| `.opencode/agents/` | โหมดผู้ช่วยเฉพาะโปรเจกต์ |
| `.opencode/skills/<ชื่อ>/SKILL.md` | ความรู้เฉพาะโปรเจกต์ |
| `.opencode/tools/` | เครื่องมือเฉพาะโปรเจกต์ |
| `.opencode/themes/` | ธีมเฉพาะโปรเจกต์ |
| `.opencode/package.json` | ไลบรารีที่ plugin/tools ของโปรเจกต์ต้องใช้ |

เคล็ดลับ 2 ข้อ:

- ไฟล์ฝั่ง Project ปกติควร commit เข้า git เพื่อให้เพื่อนร่วมทีมได้ค่าด้วย ส่วน Global ไม่ต้อง commit
- ถ้าอยากได้พฤติกรรมบางอย่างกับ "ทุกโปรเจกต์" ให้ย้ายไฟล์ไปฝั่ง Global แทน — และถ้าตั้งซ้ำสองฝั่งด้วยค่าเดียวกัน มันไม่พัง แต่ไม่มีประโยชน์ (Project ชนะอยู่ดี)


## 🔗 ไฟล์ที่ระบบหยิบมาใช้เองจากที่อื่น (ไม่ต้องย้าย)

| ตำแหน่ง | ระบบใช้เป็น | เงื่อนไข |
|---|---|---|
| `~/.claude/CLAUDE.md` | กฎ global สำรอง | ใช้เมื่อไม่มี `~/.config/opencode/AGENTS.md` |
| `~/.claude/skills/` | Skill | โหลดอัตโนมัติ |
| `~/.agents/skills/` | Skill | โหลดอัตโนมัติ |

ถ้าไม่อยากให้ระบบอ่านโฟลเดอร์ `.claude` เลย มีสวิตช์ปิดผ่านตัวแปรสภาพแวดล้อม (สำหรับผู้ใช้ขั้นสูง) — ถ้าไม่แน่ใจ ปล่อยไว้ตามเดิมได้


## 🧩 ติดตั้งชุด Skill สำเร็จรูปด้วย `npx skills`

เราไม่จำเป็นต้องเขียน Skill เองทีละไฟล์ — มีเครื่องมือชื่อ `npx skills` ช่วยโหลด "ชุด Skill สำเร็จรูป" จาก GitHub มาวางไว้ที่ `~/.agents/skills/` ให้อัตโนมัติ ซึ่งเป็นโฟลเดอร์ที่ OpenCode อ่านอยู่แล้ว (ดูหัวข้อ "ไฟล์ที่ระบบหยิบมาใช้เองจากอื่น" ด้านบน)

ตัวอย่างจริงที่ใช้ในเครื่องนี้: ชุด pstack ของ backnotprop — รวม Skill 52 ตัวสำหรับงานวางแผน ตรวจงาน เขียนโค้ด และอื่น ๆ

ติดตั้งแบบคลีน (รันจบในคำสั่งเดียว ไม่ต้องตอบคำถาม):

```powershell
npx skills add backnotprop/pstack -g -y -a opencode
```

ความหมายของแต่ละท่อน:

| ท่อน | ความหมาย |
|---|---|
| `add backnotprop/pstack` | ชื่อชุด Skill บน GitHub (เจ้าของ/ชื่อชุด) |
| `-g` | ติดตั้งระดับ Global — ใช้ได้ทุกโปรเจกต์ (ไม่ใส่ = เฉพาะโปรเจกต์ปัจจุบัน) |
| `-y` | ข้ามคำถามยืนยันทั้งหมด |
| `-a opencode` | ติดตั้งให้ OpenCode เท่านั้น (ใช้ `*` = ทุกโปรแกรมที่รองรับ) |
| `-s ชื่อ1 ชื่อ2` | เลือกติดตั้งเฉพาะบาง Skill จากทั้งชุด |

คำสั่งอื่นที่ควรรู้:

| อยากทำอะไร | คำสั่ง |
|---|---|
| ดูก่อนว่าชุดหนึ่งมี Skill อะไรบ้าง (ยังไม่ติดตั้ง) | `npx skills add backnotprop/pstack -l` |
| ดู Skill ที่ติดตั้งไว้แล้วในเครื่อง | `npx skills list -g` |
| อัปเดต Skill ทั้งหมดเป็นเวอร์ชันล่าสุด | `npx skills update -g` |
| ลบ Skill ที่ไม่ใช้ | `npx skills remove -g ชื่อ-skill` |

หลังติดตั้ง ไฟล์จะไปอยู่ที่:

- Windows: `C:\Users\<ชื่อผู้ใช้>\.agents\skills\<ชื่อ-skill>\SKILL.md`
- macOS: `~/.agents/skills/<ชื่อ-skill>/SKILL.md`

พร้อมไฟล์ทะเบียน `.skill-lock.json` อยู่ในโฟลเดอร์ `.agents` — เครื่องมือสร้างและดูแลเอง อย่าแก้ด้วยมือ (มันจำว่าติดตั้ง Skill อะไร มาจากไหน ไว้ให้คำสั่ง `update` / `remove` ทำงานถูกตัว)

จากนั้นปิด-เปิด OpenCode ใหม่ — Skill ชุดใหม่พร้อมใช้ทันที ไม่ต้องแก้ `opencode.json` แม้แต่บรรทัดเดียว เรียกใช้ได้ด้วยการบอก AI ตรง ๆ เช่น "ใช้ poteto-mode ทำงานนี้" หรือเรียกด้วยชื่อ Skill ที่ต้องการ

ข้อควรระวัง:

- ถ้าเครื่องมี Skill ชื่อซ้ำอยู่ก่อน การติดตั้งจะเขียนทับ — เปลี่ยนชื่อของเดิมเก็บไว้ก่อนถ้าไม่อยากเสีย
- ครั้งแรกที่รัน `npx` ในเครื่อง โปรแกรมอาจถามขอติดตั้งตัวช่วย `skills` ก่อน — พิมพ์ `y` แล้ว Enter ได้เลย (ครั้งต่อไปจะไม่ถามอีก)
- อยากรันแบบมีหน้าให้เลือก Skill เองทีละตัว ให้รันแบบไม่มี `-y` ในหน้าต่าง terminal ที่กดเลือกได้ตามปกติ

หมายเหตุสำหรับชุด pstack: มี Skill ชื่อ `setup-pstack` ไว้ตั้งโมเดลที่ใช้ต่อบทบาทงาน (จะเขียนไฟล์ `~/.agents/pstack-models.md` ให้) — เรียกด้วยการบอก AI ว่า "setup-pstack" ได้เหมือน Skill อื่น


## 🖥️ เปิด OpenCode Server ให้ Cline ใช้ (รันเองอัตโนมัติตอนเปิดเครื่อง)

OpenCode มีโหมด "server" — รันค้างอยู่เบื้องหลังโดยไม่ต้องเปิดหน้าจอ แล้วโปรแกรมอื่นอย่าง Cline (ส่วนเสริมใน VS Code) เชื่อมต่อเข้ามาใช้โมเดลได้ผ่านพอร์ตที่กำหนด

ในเครื่องนี้ตั้งไว้เรียบร้อยแล้ว:

- เปิดเองอัตโนมัติทุกครั้งที่ล็อกอิน Windows — แบบซ่อนหน้าต่างสนิท เหมือนไม่มีอะไรเกิดขึ้น
- พอร์ตคงที่ **4096** → ที่อยู่ (base URL) เดิมเสมอ: `http://127.0.0.1:4096`
- โมเดลค่าเริ่มต้นของ OpenCode คือ `opencode-go/deepseek-v4.1-flash` ที่ความละเอียดการคิด `max` (ตั้งไว้ในไฟล์ `~/.config/opencode/opencode.jsonc` แล้ว)
- ล็อกฝั่ง server 2 ชั้น — ชั้น 1: ใช้ได้เฉพาะ provider `opencode-go`; ชั้น 2 (ค่าเริ่มต้น): เหลือโมเดลเดียว `deepseek-v4.1-flash` — ถ้า Cline เผลอส่งชื่ออื่น จะได้ error ทันที ไม่ยิงไปหาที่อื่น (กันเครดิตหาย)

ทำไมต้องยุ่งถึงขนาดนี้: บัญชี OpenCode Go กับ Zen เป็นบัญชีรวมกัน (console เดียวกัน) แต่คิดเงินคนละแบบ — เราตั้งใจใช้แค่ OpenCode Go Harness จึงเลือก**ไม่ขอและไม่ใช้ API key จาก OpenCode Console** เลย เพื่อตัดเส้นทางที่อาจหลุดไปยิง Zen แบบ pay-as-you-go

เหตุผลที่ต้องล็อกพอร์ต: เครื่องมืออื่นจะจำที่อยู่ไว้ครั้งเดียว ถ้าพอร์ตเปลี่ยนทุกครั้งที่เปิดเครื่องก็ต้องตั้งค่าใหม่ทุกครั้ง — โหมด server นี้ล็อกพอร์ตไว้ให้ ตั้งครั้งเดียวจบ

ที่อยู่นี้ทำงานเฉพาะในเครื่องตัวเอง (127.0.0.1) ไม่เปิดออกอินเทอร์เน็ต


### ⚙️ ค่าที่ต้องใส่ใน Cline (ใส่ครั้งเดียว ใช้ได้ตลอด)

| ช่องใน Cline | ใส่ค่า |
|---|---|
| API Provider | `OpenCode` — ตัวที่เป็นโหมดรันในเครื่อง (ระวังตัวที่ชื่อคล้ายกันอย่าง `OpenCode Go` ที่เป็นบริการออนไลน์) |
| Base URL | `http://127.0.0.1:4096` |
| OpenAI Compatible API Key | ใส่ค่าใดก็ได้ เช่น `local` — ช่องนี้ Cline ตั้งชื่อกลาง ๆ ว่า "OpenAI Compatible API Key"; server ในเครื่องไม่ได้ตรวจ key |
| Model ID | `opencode-go/deepseek-v4.1-flash` — พิมพ์เองในช่อง (รายการดรอปดาวน์ว่าง เพราะ server ไม่มี endpoint แบบ OpenAI ให้ดึง) |
| Custom Headers | ไม่ต้องแตะ |

ความละเอียดการคิด: ไม่ต้องตั้งใน Cline — ฝั่ง server ล็อก `max` ไว้ให้แล้ว

หลังตั้งค่าแล้ว เปิด VS Code ครั้งต่อไปไม่ต้องตั้งอะไรอีก — เจอโค้ดมีปัญหา คลุมข้อความไว้ คลิกขวา สั่งให้ Cline แก้ แล้วจบได้เลย

ฝั่ง OpenCode ตั้งค่าโมเดลเริ่มต้นเป็น `opencode-go/deepseek-v4.1-flash` ไว้แล้ว เผื่อกรณีที่ฝั่ง Cline เลือกชื่อโมเดลไม่ติด — ดูวิธีแก้เองได้ในหัวข้อ "สูตรสำเร็จ ข้อ 1" (ตั้งโมเดล/ความละเอียดการคิด) ด้านล่าง


### 📂 ไฟล์ที่สร้างไว้จริงในเครื่อง

| ไฟล์ | หน้าที่ |
|---|---|
| `<โฟลเดอร์ของคุณ>\opencode-serve.vbs` | ตัวเปิด server จริง — ซ่อนหน้าต่าง และถ้า server เปิดอยู่แล้วจะไม่เปิดซ้ำ |
| `C:\Users\<ชื่อผู้ใช้>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\OpenCode Server.lnk` | ทางลัดในโฟลเดอร์ Startup ของ Windows — ทำให้ VBS ข้างบนรันเองทุกครั้งที่ล็อกอิน |
| `<โฟลเดอร์ของคุณ>\lock-deepseek-only.jsonc` | เนื้อหาโหมดล็อก "เหลือ deepseek ตัวเดียว" (ค่าเริ่มต้น) |
| `<โฟลเดอร์ของคุณ>\lock-provider-only.jsonc` | เนื้อหาโหมดล็อก "provider เดียว แต่เปิดทุกโมเดลของ opencode-go" |
| `<โฟลเดอร์ของคุณ>\lock-deepseek-only.vbs` | สลับเป็นโหมด deepseek ตัวเดียว — ดับเบิลคลิกครั้งเดียว (คัดลอก config + รีสตาร์ท server ให้เอง) |
| `<โฟลเดอร์ของคุณ>\lock-provider-only.vbs` | สลับเป็นโหมด provider เดียว — ดับเบิลคลิกครั้งเดียว |
| `C:\Users\<ชื่อผู้ใช้>\.config\opencode\serve-restricted.jsonc` | ไฟล์ล็อกที่ server ใช้จริง — สลับด้วยสคริปต์ข้างบน (ไม่ต้องแก้เอง) |

ล็อกมี 2 ระดับ และสลับได้ด้วยการดับเบิลคลิกไฟล์เดียว — ไม่ต้องทำเองทุกครั้งที่เปิดเครื่อง เพราะไฟล์จำสถานะไว้ และ server เปิดอัตโนมัติพร้อมค่าในไฟล์ล่าสุดเสมอ:

| ดับเบิลคลิกไฟล์นี้ | ผล |
|---|---|
| `lock-deepseek-only.vbs` | ล็อกเหลือ provider เดียว + โมเดลเดียว (`deepseek-v4.1-flash`) — ค่าเริ่มต้น |
| `lock-provider-only.vbs` | ล็อก provider เดียว แต่เลือกได้ทุกโมเดลของ opencode-go |

ทั้งสองสคริปต์คัดลอก config ให้เอง + รีสตาร์ท server (ซ่อนหน้าต่าง) ใช้เวลาราว 15 วินาที

ข้อจำกัด: โมเดลใหม่ที่ opencode-go เพิ่มในอนาคตจะยังไม่ถูกบล็อกอัตโนมัติ — ถ้าอยากบล็อกเพิ่ม ให้เปิด `lock-deepseek-only.jsonc` เติมชื่อในรายการ `blacklist` แล้วดับเบิลคลิก `lock-deepseek-only.vbs` อีกครั้ง (ล็อกนี้มีผลเฉพาะ server — TUI ปกติยังใช้ provider อื่น/โมเดลฟรีได้ตามเดิม)


### ❓ Q&A — โมเดล การล็อก และเครดิต

**Q1: ชื่อโมเดลที่ใส่ใน Cline คืออะไร?**

`opencode-go/deepseek-v4.1-flash` — รูปแบบ "ผู้ให้บริการ/ชื่อโมเดล" ตามมาตรฐานของ OpenCode (พิมพ์ในช่อง Model ID)

**Q1.1: ทำไมต้องเลือก API Provider = `OpenCode` — เป็นชื่อที่ฝั่ง localhost ของเรากำหนดไว้ หรือเป็นค่าเริ่มต้นของ Cline? แล้วคนที่ใช้ OpenCode Zen (pay as you go) ด้วย จะเลือกอะไร?**

- `OpenCode` เป็น**ชื่อ provider ที่มีมาให้ในตัว Cline อยู่แล้ว** — ไม่ใช่ค่าที่เซิร์ฟเวอร์หรือไฟล์ของเรากำหนด สิ่งที่ฝั่งเรากำหนดคือ "ปลายทางที่ตัวนี้ต่อ" (ค่าเริ่มต้นคือ `127.0.0.1:4096`)
- จุดสังเกตว่าเลือกถูกตัว: **ตัวที่ไม่ต้องใส่ API key และต่อ localhost** = ตัวของเรา; ตัวที่ให้ใส่ API key หรือ Base URL ของบริการออนไลน์ = คนละเส้นทางคิดเงิน (เช่น `OpenCode Go` สำหรับแพ็กเกจ Go) — ของเราตั้งใจไม่ใช้เส้นทางออนไลน์ (ดูกรอบ "ทำไมต้องยุ่งถึงขนาดนี้" ด้านบน)
- ชื่อ/รายการ provider ใน Cline อาจต่างกันตามเวอร์ชัน — ยึดหลักข้อ 2 เป็นเกณฑ์

**Q2: เซิร์ฟเวอร์รับชื่อนี้จริงไหม หรือเราตั้งไว้ให้รับแต่ชื่อนี้?**

ตามธรรมชาติ เซิร์ฟเวอร์รับ "ทุกโมเดลที่โหลดอยู่" — แต่ตอนนี้เราล็อกไว้ 2 ชั้น ทำให้รับจริง ๆ ชื่อเดียว:

1. ล็อก provider — เหลือ `opencode-go` อย่างเดียว (โมเดลของค่ายอื่นใช้ไม่ได้สักตัว)
2. ล็อกโมเดล — ตัดทุกโมเดลของ opencode-go ออกหมด เหลือ `deepseek-v4.1-flash`

**Q3: ถ้าใส่ชื่ออื่นใน Cline มันจะยิงไปไหน และล็อกยังไง?**

- ชื่อที่ยังไม่ถูกบล็อก → ยิงไปโมเดลนั้นจริง (ตอนนี้ไม่มีเหลือ)
- ชื่อที่ถูกบล็อกหรือสะกดผิด → **error ทันที ไม่มีคำขอวิ่งไปถึงที่ไหน** (ทดสอบแล้ว) — นี่คือหัวใจของการกันเครดิตหาย

**3.1 ล็อกอะไรได้บ้าง?**

| ล็อกอะไร | ทำที่ไหน | ไฟล์ / วิธี |
|---|---|---|
| provider (ห้าม OpenAI/OpenRouter/Zen ฯลฯ) | ฝั่ง server | `serve-restricted.jsonc` → `enabled_providers` |
| โมเดล (ห้ามทุกตัวยกเว้น deepseek) | ฝั่ง server | `serve-restricted.jsonc` → `blacklist` |
| โมเดลเริ่มต้นของ session ใหม่ | ทั้งเครื่อง | `opencode.jsonc` → คีย์ `"model"` |
| ความละเอียดการคิด (effort) | ทั้งเครื่อง | `variants` override (ดูหัวข้อ Max Effort) |
| ข้อความที่จะส่ง | ฝั่ง Cline | ไม่มีกลไกล็อก — ตั้ง Model ID ให้ถูก; ฝั่ง server จะ fail-closed ให้ |

**3.2 ไฟล์ config อยู่หลายที่ไหม ทับซ้อนกันไหม?**

อยู่หลายที่ และ **merge กัน** (ไม่ใช่ตัวใดแทนตัวอื่น) — ค่าที่ชนกันใช้ตัวหลังสุดตามลำดับนี้:

remote (องค์กร) → global (`~/.config/opencode/`) → custom (`OPENCODE_CONFIG` = ไฟล์ล็อกของเรา) → project (`opencode.json` ในโปรเจกต์) → โฟลเดอร์ `.opencode/` → inline → managed (ต้องสิทธิ์แอดมิน)

**3.3 ไฟล์ config ที่โปรเจกต์โฟลเดอร์ล่ะ อ่านอันไหนก่อน?**

โปรเจกต์อ่าน**ทีหลังกว่า** global/custom → ถ้าโปรเจกต์ไหนมีคีย์เดียวกัน (เช่นเขียน `enabled_providers` ทับเอง) มันจะทับไฟล์ล็อกของเราได้ — ปกติโปรเจกต์ไม่ได้ตั้งคีย์นี้จึงไม่กระทบ; ตัวที่ทับได้ทุกอย่างคือ managed config (โฟลเดอร์ `%ProgramData%\opencode` — ต้องสิทธิ์แอดมิน)

**3.4 ยิงผ่าน Cline แล้วถือว่ารันที่ root ไหน?**

เซิร์ฟเวอร์ทำงานตาม**โฟลเดอร์ที่ Cline แนบมา** (โฟลเดอร์ที่เปิดใน VS Code) — session นั้นจึงได้ config เฉพาะโปรเจกต์ + `AGENTS.md` ของโฟลเดอร์นั้นด้วย ส่วนไฟล์ล็อกของเราและ global config มีผลกับทุกโฟลเดอร์เหมือนกัน

**Q4: ควรป้องกันอะไรอีก ไม่ให้ monthly credit หายเร็ว?**

- อย่าเพิ่ม API key ของค่ายที่คิดเงินตามใช้ (OpenAI / OpenRouter / Groq) หรือคีย์ Zen เข้าเครื่อง — ถ้าจำเป็น ให้ปิดด้วย `disabled_providers` ใน global config
- ใน Console: อย่าเปิดตัวเลือก "Use balance" — เพื่อไม่ให้หักเงินจริงเมื่อชนเพดานแพ็กเกจ Go
- ระวังการกดเปลี่ยน variant/โมเดลใน TUI (ดูหัวข้อ "ตั้ง Max Effort แล้วไม่ติด" และ "เข้าโหมด Plan ทางไหนก็เหมือนกัน")
- อย่าเปิดเซิร์ฟเวอร์ออกวง LAN — ตอนนี้ล็อก 127.0.0.1 อยู่แล้ว
- เช็คเป็นระยะ: เปิด `http://127.0.0.1:4096/provider` → ต้องเหลือ `opencode-go` และ (โหมดล็อก) เหลือโมเดล `deepseek-v4.1-flash` ตัวเดียว

**Q5: เปลี่ยน effort และ model มีกี่ทาง ต่างกันยังไง?**

| เปลี่ยน | ทาง | ผลกับ |
|---|---|---|
| โมเดล | config `"model"` (ไฟล์) | session ใหม่ทุกครั้ง |
| โมเดล | config โปรเจกต์ (`opencode.json`) | เฉพาะโปรเจกต์นั้น |
| โมเดล | เลือกใน TUI (`/models`, ปุ่มลัด) | TUI ปัจจุบัน — จำใน `model.json`; เปิดใหม่ใช้ค่าจาก config ก่อน |
| โมเดล | ส่งมากับคำขอ (Cline Model ID / API) | เฉพาะคำขอนั้น ๆ |
| โมเดล | ตั้งราย agent (`agent.<ชื่อ>.model`) ขั้นสูง | เฉพาะ agent นั้น |
| Effort | config `options.reasoningEffort` | session ที่ไม่มีการเลือก variant |
| Effort | config `variants` (ที่เราล็อกไว้) | ทุก session — ทับค่าอื่นทั้งหมด |
| Effort | กด cycle variant ใน TUI (`Ctrl+T`) | จำต่อโมเดลใน `model.json` |

ของที่เราล็อกไว้จะบังคับทุกทางให้ลงเอยที่ deepseek + max เสมอ


### 🔍 เช็คสถานะ / หยุด / เปิดใหม่

- เช็คว่าทำงานอยู่: เปิดเบราว์เซอร์ไปที่ `http://127.0.0.1:4096/global/health` ต้องเห็นข้อความ `{"healthy":true,...}`
- หยุดชั่วคราว: เปิด Task Manager → แท็บ Details → หา `opencode.exe` ตัวที่มีคำว่า `serve` → End task (หรือรีสตาร์ทเครื่อง)
- เปิดใหม่: ดับเบิลคลิกไฟล์ `opencode-serve.vbs` — ถ้าเปิดอยู่แล้วจะไม่ทำอะไรซ้ำ


### 🧰 เทมเพลตคำสั่งสร้างไฟล์ (คัดลอกวางใน PowerShell)

บล็อกนี้สร้างครบชุด: ไฟล์เปิด server (VBS), ไฟล์ล็อก 2 โหมด, สคริปต์สลับโหมด และทางลัดเปิดอัตโนมัติ — ใช้เมื่อย้ายเครื่อง หรือไฟล์หาย

```powershell
$dir = "C:\MyLaunch"   # ← เปลี่ยนตรงนี้เป็นโฟลเดอร์ที่คุณเก็บไฟล์ launch
New-Item -ItemType Directory -Force -Path $dir | Out-Null

# 1) เนื้อหาโหมดล็อก "deepseek ตัวเดียว" (ค่าเริ่มต้น)
$deepseekOnly = @'
// ไฟล์ล็อกของเซิร์ฟเวอร์ — สลับโหมดด้วยสคริปต์ lock-deepseek-only.vbs / lock-provider-only.vbs ในโฟลเดอร์ launch (ไม่ต้องแก้ไฟล์นี้ด้วยมือ)
{
  "$schema": "https://opencode.ai/config.json",
  "enabled_providers": ["opencode-go"],
  "provider": {
    "opencode-go": {
      "blacklist": [
        "mimo-v2.6-pro",
        "mimo-v2.5",
        "grok-4.7",
        "longcat-2.5-preview-free",
        "glm-5.3-flash",
        "qwen3.8-max",
        "kimi-k3",
        "deepseek-v4-flash-vision-exp",
        "longcat-2.0",
        "space-bunny",
        "minimax-m2.7",
        "mimo-v2.5-pro",
        "mimo-v2.6-flash",
        "minimax-m3",
        "gpt-5.6-luna",
        "qwen3.8-flash",
        "glm-5.2",
        "hy3",
        "muse-spark-1.2-contributor",
        "claude-haiku-5-5",
        "gpt-6-luna",
        "deepseek-v4-pro",
        "hy4-preview",
        "muse-spark-1.3-contributor",
        "step-5-preview-free",
        "glm-5.3",
        "kimi-k2.7-code",
        "grok-4.6",
        "qwen3.7-plus",
        "deepseek-v4-flash"
      ]
    }
  }
}
'@
[System.IO.File]::WriteAllText("$dir\lock-deepseek-only.jsonc", $deepseekOnly)

# 2) เนื้อหาโหมดล็อก "provider เดียว"
$providerOnly = @'
// ไฟล์ล็อกของเซิร์ฟเวอร์ — โหมดล็อก provider อย่างเดียว (เปิดทุกโมเดลของ opencode-go)
{
  "$schema": "https://opencode.ai/config.json",
  "enabled_providers": ["opencode-go"]
}
'@
[System.IO.File]::WriteAllText("$dir\lock-provider-only.jsonc", $providerOnly)

# 3) สคริปต์สลับโหมด (เขียนครั้งเดียว ใช้ซ้ำทั้งสองโหมด — คัดลอก config + รีสตาร์ท server ให้เอง)
$toggle = @'
Option Explicit
Dim sh, fso, folder, cfg
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
cfg = sh.ExpandEnvironmentStrings("%USERPROFILE%") & "\.config\opencode\serve-restricted.jsonc"
fso.CopyFile folder & "\__LOCKFILE__", cfg, True
sh.Run "powershell -NoProfile -WindowStyle Hidden -Command ""Get-NetTCPConnection -LocalPort 4096 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }""", 0, True
WScript.Sleep 2500
sh.Run "wscript.exe """ & folder & "\opencode-serve.vbs""", 0, False
'@
[System.IO.File]::WriteAllText("$dir\lock-deepseek-only.vbs", $toggle.Replace("__LOCKFILE__", "lock-deepseek-only.jsonc"))
[System.IO.File]::WriteAllText("$dir\lock-provider-only.vbs", $toggle.Replace("__LOCKFILE__", "lock-provider-only.jsonc"))

# 4) ตั้งโหมดเริ่มต้น = deepseek ตัวเดียว
[System.IO.File]::WriteAllText("$env:USERPROFILE\.config\opencode\serve-restricted.jsonc", $deepseekOnly)

# 5) ไฟล์เปิด server (ซ่อนหน้าต่าง)
$vbs = @'
Option Explicit

Const HEALTH_URL = "http://127.0.0.1:4096/health"

Function ServerIsUp()
  Dim http
  ServerIsUp = False
  On Error Resume Next
  Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  http.setTimeouts 1500, 1500, 1500, 1500
  http.open "GET", HEALTH_URL, False
  http.send
  If Err.Number = 0 Then
    If http.status = 200 Then ServerIsUp = True
  End If
  On Error GoTo 0
End Function

Dim shell, exePath, cfgPath, procEnv
If ServerIsUp() Then WScript.Quit 0
Set shell = CreateObject("WScript.Shell")
exePath = shell.ExpandEnvironmentStrings("%APPDATA%") & "\npm\node_modules\opencode-ai\bin\opencode.exe"
cfgPath = shell.ExpandEnvironmentStrings("%USERPROFILE%") & "\.config\opencode\serve-restricted.jsonc"
Set procEnv = shell.Environment("PROCESS")
procEnv("OPENCODE_CONFIG") = cfgPath
shell.Run """" & exePath & """ serve --hostname 127.0.0.1 --port 4096", 0, False
'@
[System.IO.File]::WriteAllText("$dir\opencode-serve.vbs", $vbs)

# 6) ทางลัดเปิดอัตโนมัติตอนล็อกอิน
$startup = [Environment]::GetFolderPath('Startup')
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut("$startup\OpenCode Server.lnk")
$sc.TargetPath = "$env:WINDIR\System32\wscript.exe"
$sc.Arguments = '"' + $dir + '\opencode-serve.vbs"'
$sc.WorkingDirectory = $dir
$sc.Description = "OpenCode background server (http://127.0.0.1:4096) for Cline"
$sc.Save()
```


### 🍎 สาย macOS — ใช้ LaunchAgent เปิดเองตอนล็อกอิน

เครื่อง Mac ไม่ต้องใช้ไฟล์ VBS หรือโฟลเดอร์ Startup — macOS มีระบบเปิดโปรแกรมอัตโนมัติในตัวชื่อ LaunchAgent (ทำงานตอนล็อกอิน ซ่อนอยู่เบื้องหลังเหมือนกัน) ใช้ไฟล์ `.plist` แค่ไฟล์เดียว

ขั้นตอน — คัดลอกวางใน Terminal:

**1) หาที่อยู่ของโปรแกรม opencode:**

```bash
which opencode
```

จำค่าที่ได้ไว้ (เช่น `/usr/local/bin/opencode` หรือ `/opt/homebrew/bin/opencode`) — เอาไปแทน `/path/to/opencode` ในข้อ 2

**2) สร้างไฟล์เปิดอัตโนมัติ:**

```bash
mkdir -p ~/Library/LaunchAgents
cat > ~/Library/LaunchAgents/com.opencode.serve.plist <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.opencode.serve</string>
  <key>ProgramArguments</key>
  <array>
    <string>/path/to/opencode</string>
    <string>serve</string>
    <string>--hostname</string>
    <string>127.0.0.1</string>
    <string>--port</string>
    <string>4096</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>OPENCODE_CONFIG</key>
    <string>/Users/<ชื่อผู้ใช้>/.config/opencode/serve-restricted.jsonc</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
EOF
```

หมายเหตุ: ก่อนใช้ให้แก้ 2 จุด — (1) ในไฟล์ plist เปลี่ยน `/Users/<ชื่อผู้ใช้>/` เป็นโฟลเดอร์บ้านจริงของคุณ (2) สร้างไฟล์ `~/.config/opencode/serve-restricted.jsonc` — เนื้อหาจะใช้แบบ provider เดียว (`{ "enabled_providers": ["opencode-go"] }`) หรือแบบล็อกเหลือ deepseek ตัวเดียว (ดูตัวอย่างจากหัวข้อไฟล์ล็อกฝั่ง Windows ด้านบน) ก็ได้; การสลับโหมดบน Mac = แก้ไฟล์นี้แล้วรีสตาร์ท service ตามคำสั่งจัดการด้านล่าง

**3) เปิดใช้งานทันที (ไม่ต้องรอรีสตาร์ทเครื่อง):**

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.opencode.serve.plist
```

**4) เช็คว่าทำงาน:**

```bash
curl http://127.0.0.1:4096/global/health
```

ต้องเห็นข้อความ `{"healthy":true,...}`

คำสั่งจัดการ:

- เปิดใหม่ (หลังแก้ไฟล์): `launchctl bootout gui/$(id -u)/com.opencode.serve; launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.opencode.serve.plist`
- หยุดชั่วคราว: `launchctl bootout gui/$(id -u)/com.opencode.serve`
- ลบถาวร: รันคำสั่งหยุด แล้วลบไฟล์ `~/Library/LaunchAgents/com.opencode.serve.plist` ทิ้ง

ฝั่ง Cline ใส่ค่าเหมือน Windows ทุกช่อง (Provider `OpenCode`, Base URL `http://127.0.0.1:4096`, Model `opencode-go/deepseek-v4.1-flash`)


## 🎭 เปิดโหมด Arena / โหมด Plan ด้วย CLI

OpenCode เปิดได้หลายโหมด (agent) — เลือกโหมดได้ตั้งแต่ตอนเปิดจาก CLI สองโหมดที่ใช้บ่อยคือ Arena กับ Plan

**โหมด Arena (Debate Arena)** — แข่งหลาย candidate บนโจทย์เดียว เลือก base ที่ดีที่สุด แล้วรวมจุดเด่นของตัวแพ้มารวมไว้ (โหลด skill `arena` ให้อัตโนมัติ):

```powershell
opencode --agent arena
```

**โหมด Plan** — โหมดวางแผนของ OpenCode เอง: ห้ามแก้ไฟล์โดยตรง ทุกอย่างต้องวางแผนและขออนุมัติก่อน:

```powershell
opencode --agent plan
```

แบบสั่งครั้งเดียวจบ ไม่ต้องเปิดหน้าจอค้าง (ใช้ได้ทั้งสองโหมด):

```powershell
opencode run --agent arena "โจทย์ของคุณ"
opencode run --agent plan "ช่วยวางแผนเรื่อง..."
```

ข้อควรรู้:

- หนึ่งหน้าต่างทำงานได้ทีละโหมด — แต่สลับโหมดกลางคันได้ด้วยปุ่ม Tab ในหน้าจอ ข้อความถัดไปจะทำงานใต้โหมดใหม่ทันที (ถ้าอยากได้สองโหมดแยกกันจริง ๆ ก็เปิดคนละหน้าต่าง)
- เข้าโหมด Plan แล้ว Arena จะทำไม่ได้ (Plan ห้ามแก้ไฟล์ และห้ามเรียก subagent ทั่วไป ซึ่ง Arena ต้องใช้ทั้งสองอย่าง) และกลับกัน เข้าโหมด Arena แล้วระบบจะไม่นับเป็น Plan mode — ขั้นตอนขออนุมัติของ Plan จะไม่ทำงาน
- ไฟล์นิยามของโหมด Arena อยู่ที่ `~/.config/opencode/agents/arena.md` — แก้ข้อความข้างในได้ตามใจ ส่วน Plan เป็นโหมดที่มีมาให้ในตัว ไม่ต้องสร้างไฟล์
- ถ้าพิมพ์ชื่อโหมดผิดหรือไม่มีอยู่จริง ระบบจะขึ้นเตือนแล้วเปิดด้วยโหมดเริ่มต้น (build) ให้แทน — เช็ครายชื่อโหมดที่มีได้ด้วย `opencode agent list`


### 🧪 เข้าโหมด Plan ทางไหนก็เหมือนกัน — ข้อสรุป + วิธีเช็คเอง

**ข้อสรุป:** ไม่ต่าง — เปิด `opencode --agent plan` ตรง ๆ หรือเปิด `opencode --agent arena` แล้วกด Tab ไป plan ให้ผลเหมือนกันทุกอย่าง (สิทธิ์การใช้งาน, Plannotator, กฎขออนุมัติใน AGENTS.md) เพราะระบบผูกโหมดเป็น**รายข้อความ** — ทุกครั้งที่ส่งข้อความ ระบบบันทึกว่าใช้โหมดไหน และกติกาทุกอย่างใช้ตาม "โหมดที่ทำงานอยู่ตอนนั้น" ไม่ใช่ "โหมดตอนเปิดโปรแกรม"

จุดเดียวที่ต่างกัน: โหมดเริ่มต้นของหน้าต่าง — ถ้าเปิดด้วย arena ข้อความช่วงแรกจะตอบแบบ arena พอสลับเป็น plan ข้อความถัดไปเป็น plan ทันที

**วิธีเช็คเอง (3 ระดับ):**

**1) ดูเครื่องมือ/สิทธิ์ของแต่ละโหมด** — จุดสังเกต: `submit_plan` คือเครื่องมือที่ส่งแผนให้ Plannotator รีวิว:

```powershell
opencode debug agent plan
opencode debug agent arena
```

จะเห็น `"submit_plan": true` ในโหมด plan และ `"submit_plan": false` ในโหมด arena (ทดสอบแล้วจริงบนเครื่องนี้)

**2) ทดสอบสลับโหมดกลาง session ผ่าน server** — ใช้ server ที่รันค้างอยู่ ไม่ต้องเปิดโปรแกรมใหม่ (ข้อความจะถูกบันทึกชื่อโหมดแยกกันจริง):

```powershell
$h = @{ "x-opencode-directory" = "C:\<โฟลเดอร์โปรเจกต์ของคุณ>" }   # ← เปลี่ยนตรงนี้
$s = Invoke-RestMethod -Method POST "http://127.0.0.1:4096/session" -Headers $h -ContentType "application/json" -Body '{"title":"agent-switch-test"}'
Invoke-RestMethod -Method POST "http://127.0.0.1:4096/session/$($s.id)/message" -Headers $h -ContentType "application/json" -Body '{"agent":"arena","noReply":true,"parts":[{"type":"text","text":"test"}]}' | Out-Null
Invoke-RestMethod -Method POST "http://127.0.0.1:4096/session/$($s.id)/message" -Headers $h -ContentType "application/json" -Body '{"agent":"plan","noReply":true,"parts":[{"type":"text","text":"test"}]}' | Out-Null
(Invoke-RestMethod "http://127.0.0.1:4096/session/$($s.id)/message" -Headers $h) | ForEach-Object { $_.info.agent }
Invoke-RestMethod -Method DELETE "http://127.0.0.1:4096/session/$($s.id)" -Headers $h | Out-Null   # ลบ session ทดสอบทิ้ง
```

ผลลัพธ์ที่ควรเห็น: `arena` ตามด้วย `plan` — ยืนยันว่าคนละโหมดอยู่ใน session เดียวกันได้จริง (ทดสอบแล้วจริงบนเครื่องนี้)

**3) หลักฐานชั้นลึก — ตัวปลั๊กอิน Plannotator** — เปิดอ่านซอร์สที่ติดตั้งในเครื่อง (`~/.cache/opencode/packages/@plannotator/`) จะเห็นว่าทุกครั้งก่อนทำงาน มันเช็คโหมดของข้อความล่าสุด แล้วเปิด/ปิด `submit_plan` ตามโหมดนั้น (ค่าเริ่มต้น: เปิดเฉพาะโหมด plan) — ไม่ได้ดูว่าเปิดโปรแกรมมาด้วยโหมดอะไร

อยากเห็นกับตาสุดท้าย: เปิด `opencode --agent arena` → กด Tab ไป plan → สั่งวางแผนเรื่องง่าย ๆ แล้วดูว่า Plannotator เปิดหน้าจอรีวิวแผนไหม


### 🧰 เทมเพลตสร้างโหมด Arena ใหม่ (ถ้าไฟล์หาย)

ไฟล์นิยามของโหมด Arena อยู่ที่ `~/.config/opencode/agents/arena.md` — ถ้าหายหรือย้ายเครื่อง สร้างใหม่ได้ด้วยบล็อกด้านล่าง (อยากสร้างโหมดใหม่แบบให้ระบบถามทีละขั้น มีคำสั่งสำเร็จชื่อ `opencode agent create`)

**Windows (PowerShell):**

```powershell
$dir = "$env:USERPROFILE\.config\opencode\agents"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$content = @'
---
description: Debate Arena — แข่งหลาย candidate บนโจทย์เดียว เลือก base ที่ดีที่สุด แล้วรวมจุดเด่นของตัวแพ้เข้ามา (skill arena ของ pstack)
mode: primary
color: accent
---

# Debate Arena

You run one process: pstack's `arena` skill. Load it before anything else.

## Startup

- First action of every session: load the `arena` skill with the skill tool and read it in full.
- Follow its phases in order: Frame, Fan out, Cross-judge, Pick a base, Graft, Verify. Open the todolist it asks for before launching candidates.
- If the skill fails to load, say so and stop. Do not improvise an arena from memory.

## OpenCode harness mappings

- Candidates and judges run as subagents: use the `task` tool with `subagent_type: "general"`.
- Drop parameters your `task` tool does not support (for example a per-seat `model`); those seats run on this agent's model. Say which seats ran on which model in the output.
- pstack per-role model settings live in `~/.agents/pstack-models.md`. If the file is missing, use the defaults the skill names and note that.
- The skill's Cursor-only instructions (cloud agents, worktrees) translate to local equivalents: give each candidate its own output folder, under the project or a temp directory.

## Report

- Keep the synthesis note the skill asks for: base and why, cross-judge verdict, each graft with its source, what was rejected and why, convergence or dropouts, and the verification result.
- Write in the user's language (Thai when they write Thai).
'@
[System.IO.File]::WriteAllText("$dir\arena.md", $content)
```

**macOS (Terminal):**

```bash
mkdir -p ~/.config/opencode/agents
cat > ~/.config/opencode/agents/arena.md <<'EOF'
---
description: Debate Arena — แข่งหลาย candidate บนโจทย์เดียว เลือก base ที่ดีที่สุด แล้วรวมจุดเด่นของตัวแพ้เข้ามา (skill arena ของ pstack)
mode: primary
color: accent
---

# Debate Arena

You run one process: pstack's `arena` skill. Load it before anything else.

## Startup

- First action of every session: load the `arena` skill with the skill tool and read it in full.
- Follow its phases in order: Frame, Fan out, Cross-judge, Pick a base, Graft, Verify. Open the todolist it asks for before launching candidates.
- If the skill fails to load, say so and stop. Do not improvise an arena from memory.

## OpenCode harness mappings

- Candidates and judges run as subagents: use the `task` tool with `subagent_type: "general"`.
- Drop parameters your `task` tool does not support (for example a per-seat `model`); those seats run on this agent's model. Say which seats ran on which model in the output.
- pstack per-role model settings live in `~/.agents/pstack-models.md`. If the file is missing, use the defaults the skill names and note that.
- The skill's Cursor-only instructions (cloud agents, worktrees) translate to local equivalents: give each candidate its own output folder, under the project or a temp directory.

## Report

- Keep the synthesis note the skill asks for: base and why, cross-judge verdict, each graft with its source, what was rejected and why, convergence or dropouts, and the verification result.
- Write in the user's language (Thai when they write Thai).
EOF
```


## 🗄️ ไฟล์ข้อมูล — ห้ามแก้ด้วยมือ

ไฟล์กลุ่มนี้โปรแกรมสร้างและดูแลเองทั้งหมด เปิดดูได้ แต่ไม่ควรแก้ เพราะอาจทำให้ข้อมูลหาย

| ตำแหน่ง | ข้างในคือ |
|---|---|
| `~/.local/share/opencode/` (Windows: `C:\Users\<ชื่อผู้ใช้>\.local\share\opencode\`) | ฐานข้อมูล session, log, ประวัติ, ไฟล์ชั่วคราว, ข้อมูลล็อกอิน (`auth.json` ถ้ามี) |
| `~/.local/state/opencode/` (Windows: `C:\Users\<ชื่อผู้ใช้>\.local\state\opencode\`) | ความจำของหน้าจอ TUI: โมเดลที่เพิ่งใช้ และ variant/effort ที่เลือกไว้ (`model.json`) |
| `~/.cache/opencode/` (Windows: `C:\Users\<ชื่อผู้ใช้>\.cache\opencode\`) | แคชแพ็กเกจ plugin ที่ติดตั้งจาก npm |
| `~/.agents/.skill-lock.json` (Windows: `C:\Users\<ชื่อผู้ใช้>\.agents\.skill-lock.json`) | ทะเบียน Skill ที่ติดตั้งผ่าน `npx skills` (ที่มา เวอร์ชัน วันที่ติดตั้ง) |
| `~/.plannotator/` (Windows: `C:\Users\<ชื่อผู้ใช้>\.plannotator\`) | ข้อมูลของ Plannotator (แผนที่เคยรีวิว, ตั้งค่า `config.json`) |


## ✅ สูตรสำเร็จ 4 แบบ (ทำตามได้เลย)


### 1) ตั้งโมเดล/ความละเอียดการคิด ให้ทุกโปรเจกต์

เปิดไฟล์ `opencode.json` (หรือ `opencode.jsonc`) ในโฟลเดอร์ Global — `~/.config/opencode/` — แล้วเพิ่ม (หรือรวมกับของเดิม):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "ผู้ให้บริการของคุณ/ชื่อโมเดลของคุณ",
  "provider": {
    "ผู้ให้บริการของคุณ": {
      "models": {
        "ชื่อโมเดลของคุณ": {
          "options": { "reasoningEffort": "max" }
        }
      }
    }
  }
}
```

หมายเหตุ: ชื่อผู้ให้บริการ/โมเดลให้ใช้ค่าจริงของแต่ละคน (ดูได้จากที่ตั้งไว้ในโปรแกรม) — ที่สำคัญคือคีย์ `options` ด้านใน

แถว `"model"` = ตั้งโมเดลเริ่มต้นให้ทุก session ใหม่ (รูปแบบ "ผู้ให้บริการ/ชื่อโมเดล") — เครื่องนี้ตั้งเป็น `opencode-go/deepseek-v4.1-flash` ไว้แล้ว

ถ้าอยากให้มีผลเฉพาะโปรเจกต์เดียว วางบล็อกเดียวกันนี้ใน `opencode.json` ที่รากโปรเจกต์นั้น

ข้อควรระวัง: ถ้าเคยเลือก variant ของโมเดลนั้นไว้ในหน้าจอ TUI ค่านั้นจะทับค่าที่ตั้งตรงนี้ — ดูวิธีแก้ในหัวข้อ "ตั้ง Max Effort แล้วไม่ติด"


### 2) สอนนิสัย AI ด้วย `AGENTS.md`

สร้างหรือเปิดไฟล์ `AGENTS.md` ที่รากโปรเจกต์ของคุณ แล้วเขียนเป็นภาษาคน เช่น:

```
# กฎของโปรเจกต์นี้

- ตอบเป็นภาษาไทยเป็นหลัก
- ก่อนแก้ไฟล์ทุกครั้ง ให้บอกก่อนว่าจะแก้อะไร
```

จากนั้นปิด-เปิดโปรแกรมใหม่ — AI จะเห็นกฎนี้อัตโนมัติ


### 3) สร้างคำสั่งลัดของตัวเอง

สร้างไฟล์ `~/.config/opencode/commands/summarize.md` เนื้อหา:

```markdown
---
description: สรุปงานที่ทำไปแล้วใน session นี้
---

ช่วยสรุปงานที่ทำใน session นี้เป็นหัวข้อสั้น ๆ 5 บรรทัด
```

ปิด-เปิดโปรแกรมใหม่ จะพิมพ์ `/summarize` ใช้ได้ทันที — ส่วนบนสุด (ใต้ `---`) คือคำอธิบาย ส่วนเนื้อหาด้านล่างคือคำสั่งที่จะส่งให้ AI


### 4) เพิ่มความสามารถด้วย Plugin

หา plugin ที่ต้องการ แล้วใส่ชื่อในคีย์ `plugin` ของ `opencode.json` — โปรแกรมจะติดตั้งให้อัตโนมัติตอนเปิด หรือถ้าเป็น plugin ที่เขียนเอง วางไฟล์ `.js` / `.ts` ไว้ในโฟลเดอร์ `plugins/` แล้วปิด-เปิดโปรแกรมใหม่


## 🚀 สร้างไฟล์ด้วยคำสั่ง CLI (Windows / macOS)

ส่วนนี้รวมคำสั่ง "สร้างไฟล์พร้อมเนื้อหา" ณ ตำแหน่งที่ถูกต้อง — คัดลอกไปรันได้เลย เลือกเฉพาะไฟล์ที่ต้องการ (เนื้อหาตรงกับตัวอย่างในหัวข้อ "สูตรสำเร็จ" ด้านบน)

คำเตือน 2 ข้อ:

- ถ้ามีไฟล์อยู่แล้ว คำสั่งจะ **เขียนทับ** — แนะนำสำรองก่อน (เปลี่ยนชื่อเดิมเติม `.bak`) หรือเปิดดูก่อนว่ามีอะไรอยู่
- หลังสร้าง/แก้ไฟล์ทุกครั้ง ต้อง **ปิด-เปิดโปรแกรมใหม่** ค่าจึงมีผล


### 🪟 Windows (PowerShell)

เปิด PowerShell แล้วรันบล็อกเหล่านี้ (รันเฉพาะที่ต้องการ)

**1) Global config — `opencode.json`**

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.config\opencode" | Out-Null
$content = @'
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@plannotator/opencode@latest"]
}
'@
[System.IO.File]::WriteAllText("$env:USERPROFILE\.config\opencode\opencode.json", $content)
```

**2) Global ปุ่มลัด/ธีม — `tui.json`**

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.config\opencode" | Out-Null
$content = @'
{
  "$schema": "https://opencode.ai/tui.json",
  "leader_timeout": 1500,
  "keybinds": { "messages_copy": "ctrl+m" }
}
'@
[System.IO.File]::WriteAllText("$env:USERPROFILE\.config\opencode\tui.json", $content)
```

**3) Global กฎ AI — `AGENTS.md`**

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.config\opencode" | Out-Null
$content = @'
# กฎส่วนตัวของฉัน

- ตอบเป็นภาษาไทยเป็นหลัก
- ก่อนแก้ไฟล์ทุกครั้ง ให้บอกก่อนว่าจะแก้อะไร
'@
[System.IO.File]::WriteAllText("$env:USERPROFILE\.config\opencode\AGENTS.md", $content)
```

**4) Global คำสั่งลัด — `commands\summarize.md`**

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.config\opencode\commands" | Out-Null
$content = @'
---
description: สรุปงานที่ทำไปแล้วใน session นี้
---

ช่วยสรุปงานที่ทำใน session นี้เป็นหัวข้อสั้น ๆ 5 บรรทัด
'@
[System.IO.File]::WriteAllText("$env:USERPROFILE\.config\opencode\commands\summarize.md", $content)
```


### 🍎 macOS (Terminal / zsh)

เปิด Terminal แล้วรันบล็อกเหล่านี้ (รันเฉพาะที่ต้องการ)

**1) Global config — `opencode.json`**

```bash
mkdir -p ~/.config/opencode
cat > ~/.config/opencode/opencode.json <<'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@plannotator/opencode@latest"]
}
EOF
```

**2) Global ปุ่มลัด/ธีม — `tui.json`**

```bash
mkdir -p ~/.config/opencode
cat > ~/.config/opencode/tui.json <<'EOF'
{
  "$schema": "https://opencode.ai/tui.json",
  "leader_timeout": 1500,
  "keybinds": { "messages_copy": "ctrl+m" }
}
EOF
```

**3) Global กฎ AI — `AGENTS.md`**

```bash
mkdir -p ~/.config/opencode
cat > ~/.config/opencode/AGENTS.md <<'EOF'
# กฎส่วนตัวของฉัน

- ตอบเป็นภาษาไทยเป็นหลัก
- ก่อนแก้ไฟล์ทุกครั้ง ให้บอกก่อนว่าจะแก้อะไร
EOF
```

**4) Global คำสั่งลัด — `commands/summarize.md`**

```bash
mkdir -p ~/.config/opencode/commands
cat > ~/.config/opencode/commands/summarize.md <<'EOF'
---
description: สรุปงานที่ทำไปแล้วใน session นี้
---

ช่วยสรุปงานที่ทำใน session นี้เป็นหัวข้อสั้น ๆ 5 บรรทัด
EOF
```

หมายเหตุ: เครื่องที่ใช้ bash อยู่แล้ว (Git Bash / WSL) ใช้ชุดคำสั่ง macOS ได้เหมือนกัน


### 📁 ไฟล์ฝั่ง Project (คัดลอกไปเปลี่ยน path)

คำสั่งชุดนี้ใช้ตัวแปร `$proj` (Windows) / `$PROJECT` (macOS) เป็นที่ว่าง — **แก้ค่าตรง `← เปลี่ยนตรงนี้` เป็น path โปรเจกต์ของคุณก่อนรัน** เช่น `C:\Projects\my-app` บน Windows หรือ `~/projects/my-app` บน macOS

**Windows (PowerShell):**

```powershell
$proj = "C:\Projects\my-app"   # ← เปลี่ยนตรงนี้เป็น path โปรเจกต์ของคุณ
New-Item -ItemType Directory -Force -Path $proj | Out-Null
$content = @'
{
  "$schema": "https://opencode.ai/config.json"
}
'@
[System.IO.File]::WriteAllText("$proj\opencode.json", $content)
```

```powershell
$proj = "C:\Projects\my-app"   # ← เปลี่ยนตรงนี้เป็น path โปรเจกต์ของคุณ
$content = @'
# กฎของโปรเจกต์นี้

- ตอบเป็นภาษาไทยเป็นหลัก
- ก่อนแก้ไฟล์ทุกครั้ง ให้บอกก่อนว่าจะแก้อะไร
'@
[System.IO.File]::WriteAllText("$proj\AGENTS.md", $content)
```

**macOS (Terminal / zsh):**

```bash
PROJECT="$HOME/projects/my-app"   # ← เปลี่ยนตรงนี้เป็น path โปรเจกต์ของคุณ
mkdir -p "$PROJECT"
cat > "$PROJECT/opencode.json" <<'EOF'
{
  "$schema": "https://opencode.ai/config.json"
}
EOF
```

```bash
PROJECT="$HOME/projects/my-app"   # ← เปลี่ยนตรงนี้เป็น path โปรเจกต์ของคุณ
cat > "$PROJECT/AGENTS.md" <<'EOF'
# กฎของโปรเจกต์นี้

- ตอบเป็นภาษาไทยเป็นหลัก
- ก่อนแก้ไฟล์ทุกครั้ง ให้บอกก่อนว่าจะแก้อะไร
EOF
```

หมายเหตุ: เนื้อหาในไฟล์เป็นเพียงแม่แบบ — เพิ่มคีย์หรือกฎตามต้องการได้ ดูตัวอย่างจริงในหัวข้อ "สูตรสำเร็จ" ด้านบน


## ⚖️ ใครทับใคร (ลำดับความสำคัญ)

| เรื่อง | ลำดับ |
|---|---|
| ค่าตั้งทั่วไป | Project ทับ Global เฉพาะคีย์ที่ตั้ง |
| กฎ AI (`AGENTS.md`) | Project ก่อน → Global → `~/.claude/CLAUDE.md` |
| ธีมสี | ในตัวโปรแกรม → โฟลเดอร์ Global → รากโปรเจกต์ → โฟลเดอร์ทำงาน |
| ความละเอียดการคิด (Reasoning Effort) | variant ที่เลือกใน TUI ทับ `options.reasoningEffort` ในไฟล์ config — ดูหัวข้อ "ตั้ง Max Effort แล้วไม่ติด" |

ถ้าสงสัยว่าทำไมค่าที่ตั้งไม่เห็นผล: ไฟล์โหลดครั้งเดียวตอนเปิด → ให้ปิด-เปิดโปรแกรมใหม่ก่อนเสมอ


## 🎚️ ตั้ง Max Effort แล้วไม่ติด — เพราะ variant ใน TUI ทับ config

ถ้าตั้ง `reasoningEffort` (ความละเอียดการคิด) ไว้ในไฟล์ config แล้ว แต่ใช้งานจริงไม่ได้ผลตามที่ตั้งไว้ สาเหตุอันดับหนึ่งคือ:

**ทุกครั้งที่กดเลือก variant ในหน้าจอ TUI ระบบจะจำค่านั้นไว้ และค่าที่จำไว้จะทับค่าที่ตั้งในไฟล์ config เสมอ** — ทับแบบเงียบ ๆ ไม่มีข้อความเตือนใด ๆ

สาเหตุคือ OpenCode เก็บค่าความละเอียดการคิดไว้ 2 ที่ และมีลำดับการชนะกันดังนี้:

| ที่เก็บ | ใครเป็นคนเขียน | ผล |
|---|---|---|
| คีย์ `options` ในไฟล์ `opencode.json` / `opencode.jsonc` | เราพิมพ์เอง | แพ้ |
| คีย์ `"variant"` ในไฟล์ `model.json` | โปรแกรมเขียนตามที่เรากดเลือกใน TUI | ชนะ |

ค่า `"default"` ใน `model.json` แปลว่า "ใช้ค่ามาตรฐานของโมเดล" (ซึ่งมักไม่ใช่ `max`) — อาการที่พบบ่อยคือ config เขียน `"max"` ไว้ แต่ `model.json` เก็บ `"default"` ทำให้ได้ค่ามาตรฐานแทน

ไฟล์ `model.json` อยู่ที่:

- Windows: `C:\Users\<ชื่อผู้ใช้>\.local\state\opencode\model.json`
- macOS: `~/.local/state/opencode/model.json`

วิธีแก้ มี 2 ทาง เลือกอย่างใดอย่างหนึ่ง:

1. **แก้ผ่านหน้าจอ (แนะนำ)** — เลือกโมเดลนั้นใน TUI แล้วกดปุ่ม cycle variant (ค่าเริ่มต้นคือ `Ctrl+T`) ไล่ไปจนเจอ `max` โปรแกรมจะจำและเขียนลง `model.json` ให้เอง
2. **แก้ไฟล์ `model.json` ตรง ๆ** — ปิด OpenCode ก่อน เปิดไฟล์แล้วหาส่วน `"variant"` ซึ่งมีรูปแบบ `"ผู้ให้บริการ/ชื่อโมเดล": "ค่า"` จากนั้นเปลี่ยนค่าเฉพาะตัวที่ต้องการให้เป็น `"max"` เช่น:

```json
"variant": {
  "opencode-go/deepseek-v4.1-flash": "max"
}
```

ข้อควรระวังของไฟล์ `model.json`:

- แก้เฉพาะค่าด้านใน `"variant"` — ส่วนอื่น (`recent`, `favorite`) ปล่อยไว้ตามเดิม
- ต้องปิด OpenCode ให้สนิทก่อนแก้ ไม่อย่างนั้นโปรแกรมอาจเขียนทับตอนปิด
- ค่า variant นี้ใช้กับทุก agent และทุกโปรเจกต์ที่เรียกโมเดลนั้น

ถ้าไม่อยากแก้ไฟล์ด้วยมือ ใช้คำสั่งสำเร็จรูปด้านล่างได้เลย — คัดลอกวางทั้งบล็อก คำสั่งจะสำรองไฟล์เดิมเป็น `model.json.bak` ให้อัตโนมัติ และจะไม่ยอมทำงานถ้ายังเปิด OpenCode อยู่

**Windows (PowerShell):**

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$model = "opencode-go/deepseek-v4.1-flash"   # ← เปลี่ยนตรงนี้เป็น "ผู้ให้บริการ/ชื่อโมเดล" ของคุณ
$p = "$env:USERPROFILE\.local\state\opencode\model.json"
if (-not (Test-Path $p)) {
  Write-Host "ไม่พบไฟล์ $p — เปิด OpenCode แล้วใช้โมเดลก่อนอย่างน้อยหนึ่งครั้ง แล้วค่อยรันคำสั่งนี้"
} elseif (Get-Process -Name opencode -ErrorAction SilentlyContinue) {
  Write-Host "ยังปิด OpenCode ไม่สนิท — ปิดให้หมดก่อน แล้วรันคำสั่งนี้อีกครั้ง"
} else {
  Copy-Item $p "$p.bak" -Force
  $j = Get-Content $p -Raw | ConvertFrom-Json
  if (-not $j.variant) { $j | Add-Member -NotePropertyName variant -NotePropertyValue ([PSCustomObject]@{}) -Force }
  $j.variant | Add-Member -Force -NotePropertyName $model -NotePropertyValue "max"
  [System.IO.File]::WriteAllText($p, ($j | ConvertTo-Json -Depth 10 -Compress))
  Write-Host "สำเร็จ: ตั้ง variant ของ $model เป็น max แล้ว — เปิด OpenCode ใหม่ได้เลย"
  Get-Content $p -Raw
}
```

**macOS (Terminal / zsh):**

```bash
model="opencode-go/deepseek-v4.1-flash"   # ← เปลี่ยนตรงนี้เป็น "ผู้ให้บริการ/ชื่อโมเดล" ของคุณ
p="$HOME/.local/state/opencode/model.json"
if [ ! -f "$p" ]; then
  echo "ไม่พบไฟล์ $p — เปิด OpenCode แล้วใช้โมเดลก่อนอย่างน้อยหนึ่งครั้ง แล้วค่อยรันคำสั่งนี้"
elif pgrep -x opencode > /dev/null; then
  echo "ยังปิด OpenCode ไม่สนิท — ปิดให้หมดก่อน แล้วรันคำสั่งนี้อีกครั้ง"
else
  cp "$p" "$p.bak"
  python3 - "$p" "$model" <<'PY'
import json, sys
path, model = sys.argv[1], sys.argv[2]
d = json.load(open(path))
v = d.get("variant")
if not isinstance(v, dict): v = {}
v[model] = "max"
d["variant"] = v
json.dump(d, open(path, "w"), separators=(",", ":"), ensure_ascii=False)
PY
  echo "สำเร็จ: ตั้ง variant ของ $model เป็น max แล้ว — เปิด OpenCode ใหม่ได้เลย"
  cat "$p"
fi
```

หลังรันเสร็จ คำสั่งจะโชว์เนื้อหาไฟล์ให้ตรวจ — มองหาส่วน `"variant"` แล้วเช็คว่าโมเดลของคุณเป็น `"max"` จริง

หมายเหตุสำหรับโมเดลตระกูล DeepSeek: ความละเอียดการคิดถูกอ่านเฉพาะ **ข้อความแรกของ session** เท่านั้น — เปลี่ยนกลางบทสนทนาจะไม่มีผล ต้องเริ่ม session ใหม่


## 🧰 เช็คลิสต์หลังแก้ไฟล์ทุกครั้ง

1. ก๊อปไฟล์เดิมเก็บไว้ก่อนแก้ (เช่น เติม `.bak` ต่อท้ายชื่อ) — กันพลาด
2. ตรวจว่าไฟล์ `.json` ยังถูกรูปแบบ: วงเล็บปีกกาครบคู่ และไม่มีจุลภาคเกินท้ายรายการสุดท้าย
3. ปิด OpenCode แล้วเปิดใหม่
4. ทดสอบของจริงหนึ่งครั้ง เช่น พิมพ์คำสั่งลัดที่เพิ่งสร้าง หรือสั่งงานที่ควรโดนกฎใหม่

ถ้าเปิดโปรแกรมไม่ขึ้นหลังแก้ config — เกือบทุกครั้งคือไฟล์ `opencode.json` ผิดรูปแบบ ให้ย้อนไฟล์สำรองกลับ

คำสั่งช่วยตรวจสอบ (พิมพ์ใน terminal ได้เลย):

| อยากรู้ | คำสั่ง |
|---|---|
| มีโหมด (agent) อะไรบ้าง | `opencode agent list` |
| รายละเอียดของโหมดหนึ่ง | `opencode debug agent ชื่อโหมด` |
| config รวมที่โปรแกรมอ่านจริง | `opencode debug config` |
| โมเดลที่ใช้ได้ทั้งหมด | `opencode models` |
| Skill ที่โปรแกรมมองเห็น | `opencode debug skill` |
| Skill ที่ติดตั้งผ่าน npx | `npx skills list -g` |


## 📍 ภาคผนวก ก — แผนที่ตำแหน่งไฟล์ (Windows / macOS)

| ไฟล์ | Windows | macOS |
|---|---|---|
| Global config | `C:\Users\<ชื่อผู้ใช้>\.config\opencode\opencode.json` | `~/.config/opencode/opencode.json` |
| Global ปุ่มลัด/ธีม | `C:\Users\<ชื่อผู้ใช้>\.config\opencode\tui.json` | `~/.config/opencode/tui.json` |
| Global กฎ AI | `C:\Users\<ชื่อผู้ใช้>\.config\opencode\AGENTS.md` | `~/.config/opencode/AGENTS.md` |
| โหมด Arena ที่สร้างเอง | `C:\Users\<ชื่อผู้ใช้>\.config\opencode\agents\arena.md` | `~/.config/opencode/agents/arena.md` |
| Project config | `<โปรเจกต์>\opencode.json` | `<project>/opencode.json` |
| Project กฎ AI | `<โปรเจกต์>\AGENTS.md` | `<project>/AGENTS.md` |
| ข้อมูลระบบ (อย่าแก้) | `C:\Users\<ชื่อผู้ใช้>\.local\share\opencode\` | `~/.local/share/opencode/` |
| ความจำ TUI (variant ที่เลือก) | `C:\Users\<ชื่อผู้ใช้>\.local\state\opencode\model.json` | `~/.local/state/opencode/model.json` |
| Global Skill (ชุดสำเร็จรูป) | `C:\Users\<ชื่อผู้ใช้>\.agents\skills\` | `~/.agents/skills/` |
| ทะเบียน Skill (อย่าแก้) | `C:\Users\<ชื่อผู้ใช้>\.agents\.skill-lock.json` | `~/.agents/.skill-lock.json` |
| ตัวเปิด OpenCode Server อัตโนมัติ | `C:\<โฟลเดอร์ของคุณ>\opencode-serve.vbs` | `~/Library/LaunchAgents/com.opencode.serve.plist` |
| ไฟล์ล็อกที่ Server ใช้จริง (สลับด้วยสคริปต์) | `C:\Users\<ชื่อผู้ใช้>\.config\opencode\serve-restricted.jsonc` | `~/.config/opencode/serve-restricted.jsonc` |
| สลับโหมดล็อก (ดับเบิลคลิก) | `C:\<โฟลเดอร์ของคุณ>\lock-deepseek-only.vbs` / `lock-provider-only.vbs` | แก้ไฟล์ + รีสตาร์ท service |
| ทางลัด/รายการที่รันตอนล็อกอิน | `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\OpenCode Server.lnk` | ไฟล์ plist ด้านบนทำหน้าที่นี้ในตัว (ไม่ต้องมีทางลัด) |
| ที่อยู่ OpenCode Server สำหรับ Cline | `http://127.0.0.1:4096` | เหมือนกัน |


## 🕵️ ภาคผนวก ข — ข้อสังเกตจากเวอร์ชัน 1.18.35

- เวอร์ชันนี้ **ไม่อ่านไฟล์ `cli.json`** ในโฟลเดอร์ config (แม้หน้าตาจะคล้ายไฟล์ปุ่มลัด) — ไฟล์ที่ถูกอ่านจริงคือ `tui.json` ถ้าต้องการปุ่มลัด ให้ใช้ค่าตามตัวอย่างหัวข้อ `tui.json` ข้างบน
- โฟลเดอร์ `commands/` ถูกใช้งานจริงโดยปลั๊กอิน Plannotator (คำสั่ง `/plannotator-...`) — เป็นตัวอย่างว่าวางไฟล์ `.md` ไว้ในโฟลเดอร์นี้แล้วได้คำสั่งลัดจริง
- ชุด Skill ที่ติดตั้งผ่าน `npx skills` ลงที่ `~/.agents/skills/` แล้ว OpenCode มองเห็นทันทีโดยไม่ต้องตั้งค่าเพิ่ม — ต่างจาก Skill ฝั่ง Global config ที่ต้องวางใน `~/.config/opencode/skills/` เอง (ทดสอบกับชุด pstack 52 Skill: ใช้ได้จริง)
- `opencode serve` เป็น server แบบไม่มีหน้าจอ (headless) — ล็อกพอร์ตด้วย `--hostname 127.0.0.1 --port 4096` ได้ ที่อยู่จึงคงที่ทุกครั้ง; Cline เวอร์ชัน 4.1.23 บนเครื่องนี้มี provider ชื่อ `OpenCode` ที่เชื่อมกับ local server ที่ 127.0.0.1:4096 เป็นค่าเริ่มต้นอยู่แล้ว — หน้าตั้งค่าเป็นช่องแบบ generic (Base URL, OpenAI Compatible API Key, Model ID) (ทดสอบยิงข้อความผ่าน server นี้ด้วยโมเดล `opencode-go/deepseek-v4.1-flash` แล้ว ได้คำตอบกลับปกติ และ auth ไม่ต้องพึ่งตัวแปรสภาพแวดล้อมพิเศษ)
- ตัว server รับ config เพิ่มได้ผ่านตัวแปรสภาพแวดล้อม `OPENCODE_CONFIG` (โหลดทับ global เฉพาะ process นั้น) — ใช้ล็อกเฉพาะ server ได้โดยไม่กระทบ TUI; ทดสอบแล้ว: `enabled_providers: ["opencode-go"]` ทำให้ server เห็น provider เดียว, ยิงโมเดลอื่นโดนบล็อกทันที; และ `blacklist` ใน provider ปิดโมเดลรายตัวได้ — ล็อกเหลือ `deepseek-v4.1-flash` ตัวเดียวสำเร็จ (ทดสอบยิงชื่ออื่นได้ error ไม่มีคำขอออกไป); หมายเหตุ: `whitelist` และ wildcard `*` ไม่มีผลในเวอร์ชันนี้
