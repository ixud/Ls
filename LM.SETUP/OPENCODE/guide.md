# คู่มือ OpenCode — ไฟล์ตั้งค่าทั้งหมดที่ต้องรู้

คู่มือนี้เขียนสำหรับคนที่ไม่เคยรู้จัก OpenCode มาก่อน อ่านจบแล้วจะสร้างและแก้ไฟล์ตั้งค่าเองได้ทั้งหมด โดยไม่ต้องเขียนโปรแกรมเป็น

ครั้งแรกแนะนำให้อ่านหัวข้อ "ทำความรู้จัก" และ "หลักการ 3 ข้อ" ให้จบก่อน จากนั้นใช้ตารางไฟล์เป็นคู่มืออ้างอิงได้เลย


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


## 🗄️ ไฟล์ข้อมูล — ห้ามแก้ด้วยมือ

ไฟล์กลุ่มนี้โปรแกรมสร้างและดูแลเองทั้งหมด เปิดดูได้ แต่ไม่ควรแก้ เพราะอาจทำให้ข้อมูลหาย

| ตำแหน่ง | ข้างในคือ |
|---|---|
| `~/.local/share/opencode/` (Windows: `C:\Users\<ชื่อผู้ใช้>\.local\share\opencode\`) | ฐานข้อมูล session, log, ประวัติ, ไฟล์ชั่วคราว, ข้อมูลล็อกอิน (`auth.json` ถ้ามี) |
| `~/.cache/opencode/` (Windows: `C:\Users\<ชื่อผู้ใช้>\.cache\opencode\`) | แคชแพ็กเกจ plugin ที่ติดตั้งจาก npm |
| `~/.plannotator/` (Windows: `C:\Users\<ชื่อผู้ใช้>\.plannotator\`) | ข้อมูลของ Plannotator (แผนที่เคยรีวิว, ตั้งค่า `config.json`) |


## ✅ สูตรสำเร็จ 4 แบบ (ทำตามได้เลย)


### 1) ตั้งโมเดล/ความละเอียดการคิด ให้ทุกโปรเจกต์

เปิดไฟล์ `opencode.json` (หรือ `opencode.jsonc`) ในโฟลเดอร์ Global — `~/.config/opencode/` — แล้วเพิ่ม (หรือรวมกับของเดิม):

```json
{
  "$schema": "https://opencode.ai/config.json",
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

ถ้าอยากให้มีผลเฉพาะโปรเจกต์เดียว วางบล็อกเดียวกันนี้ใน `opencode.json` ที่รากโปรเจกต์นั้น


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

ถ้าสงสัยว่าทำไมค่าที่ตั้งไม่เห็นผล: ไฟล์โหลดครั้งเดียวตอนเปิด → ให้ปิด-เปิดโปรแกรมใหม่ก่อนเสมอ


## 🧰 เช็คลิสต์หลังแก้ไฟล์ทุกครั้ง

1. ก๊อปไฟล์เดิมเก็บไว้ก่อนแก้ (เช่น เติม `.bak` ต่อท้ายชื่อ) — กันพลาด
2. ตรวจว่าไฟล์ `.json` ยังถูกรูปแบบ: วงเล็บปีกกาครบคู่ และไม่มีจุลภาคเกินท้ายรายการสุดท้าย
3. ปิด OpenCode แล้วเปิดใหม่
4. ทดสอบของจริงหนึ่งครั้ง เช่น พิมพ์คำสั่งลัดที่เพิ่งสร้าง หรือสั่งงานที่ควรโดนกฎใหม่

ถ้าเปิดโปรแกรมไม่ขึ้นหลังแก้ config — เกือบทุกครั้งคือไฟล์ `opencode.json` ผิดรูปแบบ ให้ย้อนไฟล์สำรองกลับ


## 📍 ภาคผนวก ก — แผนที่ตำแหน่งไฟล์ (Windows / macOS)

| ไฟล์ | Windows | macOS |
|---|---|---|
| Global config | `C:\Users\<ชื่อผู้ใช้>\.config\opencode\opencode.json` | `~/.config/opencode/opencode.json` |
| Global ปุ่มลัด/ธีม | `C:\Users\<ชื่อผู้ใช้>\.config\opencode\tui.json` | `~/.config/opencode/tui.json` |
| Global กฎ AI | `C:\Users\<ชื่อผู้ใช้>\.config\opencode\AGENTS.md` | `~/.config/opencode/AGENTS.md` |
| Project config | `<โปรเจกต์>\opencode.json` | `<project>/opencode.json` |
| Project กฎ AI | `<โปรเจกต์>\AGENTS.md` | `<project>/AGENTS.md` |
| ข้อมูลระบบ (อย่าแก้) | `C:\Users\<ชื่อผู้ใช้>\.local\share\opencode\` | `~/.local/share/opencode/` |


## 🕵️ ภาคผนวก ข — ข้อสังเกตจากเวอร์ชัน 1.18.35

- เวอร์ชันนี้ **ไม่อ่านไฟล์ `cli.json`** ในโฟลเดอร์ config (แม้หน้าตาจะคล้ายไฟล์ปุ่มลัด) — ไฟล์ที่ถูกอ่านจริงคือ `tui.json` ถ้าต้องการปุ่มลัด ให้ใช้ค่าตามตัวอย่างหัวข้อ `tui.json` ข้างบน
- โฟลเดอร์ `commands/` ถูกใช้งานจริงโดยปลั๊กอิน Plannotator (คำสั่ง `/plannotator-...`) — เป็นตัวอย่างว่าวางไฟล์ `.md` ไว้ในโฟลเดอร์นี้แล้วได้คำสั่งลัดจริง
