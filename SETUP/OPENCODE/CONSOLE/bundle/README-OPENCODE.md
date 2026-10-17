# pstack สำหรับ OpenCode

คู่มือนี้เขียนไว้ให้คนที่ยังไม่รู้จัก pstack มาก่อน อ่านแล้วทำตามได้เลย โดยไม่ต้องเขียนโค้ด

ชุดนี้คือสำเนาของ pstack เวอร์ชัน 0.15.25 (จาก cursor/plugins) ที่ดัดแปลงให้รันบน OpenCode เต็มรูปแบบ ยังมี features ครบเท่าต้นฉบับ ต่างกันแค่กลไกบางอย่างของ Cursor ถูกแทนด้วยกลไกของ OpenCode


## ชุดนี้คืออะไร

pstack คือชุด "ทักษะ" (skills) ที่สอน AI agent ทำงานอย่างมีวินัยแบบวิศวกรจริง เช่น บังคับให้รีโปรดักส์บั๊กก่อนแก้, แยก subagent ไปทำงานขนานกัน, และตรวจงานกับของจริงก่อนบอกว่าเสร็จ

เดิมมันเป็น plugin ของ Cursor ไฟล์ทั้งหมดเป็น markdown ล้วน ไม่มีโค้ดที่ต้องคอมไพล์ ทำให้ย้ายค่ายได้ เพียงแต่ข้อความข้างในอ้างเครื่องมือของ Cursor (เช่น `Task`, `AskQuestion`, `/loop`) ชุดนี้แก้คำอ้างเหล่านั้นให้ตรงกับ OpenCode แล้ว


## โครงสร้างโฟลเดอร์

| โฟลเดอร์ | มีอะไร | ปลายทางตอนติดตั้ง |
|---|---|---|
| `skills/` | 54 skills รวม playbooks ของ poteto-mode | `~/.agents/skills/` |
| `agents/` | agent 3 ตัวของ OpenCode (poteto-mode, poteto-agent, comment-sicko) | `~/.config/opencode/agents/` |
| `commands/` | slash command `/poteto-mode` | `~/.config/opencode/commands/` |
| `config/` | template ไฟล์ตั้งค่าโมเดล | `~/.agents/pstack-models.md` |
| `docs/`, `README.md` | เอกสารต้นฉบับของ pstack (ยังอ้าง Cursor — ดูหมายเหตุ) | ไม่ต้องติดตั้ง |
| `MANIFEST.md` | ทะเบียนว่าแก้อะไรไปบ้าง และแผน apply | ไม่ต้องติดตั้ง |
| `COMPARE.md` | เทียบ Cursor ต้นฉบับ vs OpenCode build (กลไก/ข้อจำกัด) | ไม่ต้องติดตั้ง |
| `DISCOVER.md` | สถานะชุดเก่าบนเครื่อง + ไทม์ไลน์หลังอัปเดต V2 | ไม่ต้องติดตั้ง |


## สิ่งที่แก้จากต้นฉบับ

- เพิ่มส่วน **Harness (OpenCode)** ใน `skills/poteto-mode/SKILL.md` เป็นตารางแปลงคำสั่ง Cursor เป็น OpenCode ทั้งหมด

- ไฟล์ที่ระบบตั้งค่าโมเดลเปลี่ยนจาก `~/.cursor/rules/pstack-models.mdc` เป็น `~/.agents/pstack-models.md` ทุกจุด (รวม `setup-pstack` ที่เขียนไฟล์นี้)

- `Task` เปลี่ยนเป็น `task` tool, `AskQuestion` เปลี่ยนเป็น `question` tool, transcript เปลี่ยนจาก `agent-transcripts/` เป็น session storage ของ OpenCode ที่ `~/.local/share/opencode/storage/`

- cloud agent และ `/loop` (ของเฉพาะ Cursor) ถูกแทนด้วย subagent ท้องถิ่น + worktree แยก และการ poll ด้วยคำสั่ง shell ตั้งเวลา

- skill ที่อ้างเครื่องมือของ Cursor ที่ไม่มีในนี้ (`deslop`, `control-cli`, `control-ui`, `create-skill`) ได้วิธีทำงานแทนแบบระบุชัด เช่น reread diff ก่อน commit, ขับแอปด้วย Playwright/CDP หรือ PTY, เขียน skill ผ่าน playbook Authoring a skill

- skill folder ของโปรเจกต์เปลี่ยนจาก `.cursor/skills/` เป็น `.opencode/skills/` (ใช้กับ `verify-*` และ mode skill ส่วนตัว)

- `agents/` ถูกแปลงเป็น format ของ OpenCode (`mode: subagent`, สิทธิ์ `edit: deny` ให้ comment-sicko ซึ่งเป็น read-only reviewer)

- เพิ่ม `agents/poteto-mode.md` และ `commands/poteto-mode.md` เป็นทางเข้าใช้งาน และ `config/pstack-models.template.md`

- แก้ frontmatter `name` ให้เป็น kebab-case ตรงชื่อโฟลเดอร์ตามกติกา OpenCode (`Poteto Mode` เป็น `poteto-mode`, `Make Bot UI` เป็น `make-bot-ui`)
- ไฟล์ที่ไม่เกี่ยวกับ OpenCode ถูกตัดออกทั้งหมด: `.cursor-plugin/`, `plugin.json`, `automations/benny/` (เป็นระบบ automation บน cloud ของ Cursor)


## วิธีติดตั้ง (ขั้นตอนที่ 2)

ยังไม่ต้องทำตอนนี้ รอจนกว่าจะตรวจของเดิมในเครื่องก่อนว่าไม่มีอะไรพัง

1. คัดลอกโฟลเดอร์ `skills/` ลง `~/.agents/skills/` แบบ merge (ทับไฟล์ชื่อเดียวกัน) ถ้าโฟลเดอร์ปลายทางมี pstack เวอร์ชันเก่าอยู่แล้ว ให้สำรองไว้ก่อน

2. คัดลอก `agents/` ทั้ง 3 ไฟล์ลง `~/.config/opencode/agents/`

3. คัดลอก `commands/` ลง `~/.config/opencode/commands/`

4. คัดลอก `config/pstack-models.template.md` เป็น `~/.agents/pstack-models.md` แล้วแก้ชื่อโมเดลให้ตรงกับ provider ที่ใช้จริง หรือจะรัน `/setup-pstack` ให้มันจดให้ก็ได้

5. ถ้ามีไฟล์ค้างที่ `~/.agents/skills/pstack-models.md` (ตำแหน่งผิด) ให้ลบทิ้ง

6. ปิดแล้วเปิด OpenCode ใหม่ (config โหลดตอนเริ่มโปรแกรมเท่านั้น)


## เริ่มใช้งาน

พิมพ์ `/poteto-mode` ตามด้วยงานที่ต้องการ หรือเลือก agent ชื่อ `poteto-mode` จากรายการ agent เพื่อให้ติดทุก turn

ครั้งแรกให้รัน `/setup-pstack` เพื่อเลือกโมเดลต่อ role และ budget หลังจากนั้นใช้ `/poteto-help` ถ้าหลงว่าควรใช้ skill ไหน


## ตารางแปลง Cursor เป็น OpenCode

| Cursor | ชุดนี้ (OpenCode) |
|---|---|
| `Task` tool + `subagent_type` | `task` tool (`subagent_type: poteto-agent` หรือ `general`) |
| ส่ง `model` ต่อ subagent | ส่งไม่ได้ — ระบุชื่อโมเดลใน brief และบันทึกว่าใช้จริงตัวไหน |
| `AskQuestion` | `question` tool |
| `~/.cursor/rules/pstack-models.mdc` | `~/.agents/pstack-models.md` |
| `agent-transcripts/` | `~/.local/share/opencode/storage/` |
| cloud agent (`environment: "cloud"`) | subagent ท้องถิ่น แยก worktree |
| `/loop` | poll ด้วยคำสั่ง shell ตั้งเวลา |
| `.cursor/skills/` | `.opencode/skills/` (โปรเจกต์) และ `~/.agents/skills/` (ผู้ใช้) |
| `deslop`, `control-ui`, `control-cli`, `create-skill` | ไม่มี — ใช้วิธีแทนตามที่ระบุใน Harness section |


## ข้อจำกัดที่รู้อยู่

- โมเดลต่อ role เป็น "คำแนะนำ" ไม่ enforced เพราะ `task` tool ของ OpenCode ไม่รับ `model` ต่อครั้ง — delegate ใช้โมเดลตาม agent definition ถ้าต้องการบังคับจริงค่อยสร้าง agent หลายตัวแยกโมเดล

- เอกสารใน `docs/guide/` เป็นของต้นฉบับ ยังอ้างเมนูและฟีเจอร์ของ Cursor ให้อ่านเพื่อเข้าใจแนวคิด แล้วใช้ตารางแปลงด้านบนแทน

- script ช่วยงาน (`skills/poteto-mode/scripts/`) ต้องมี Bun; ตัว `worktree-audit.sh` ต้องรันใน shell แบบ POSIX (Git Bash/WSL) และใช้ `rg`

- `bugbot-triage.md` ใช้ได้กับ bot รีวิวของ GitHub ทั่วไป แต่ตัวที่ชื่อ "bugbot" คือ bot ของ Cursor โดยตรง

- หลังติดตั้ง ต้อง restart OpenCode หนึ่งครั้ง ไม่งั้น skills ใหม่จะยังไม่โหลด


## OpenCode V2 (อัปเดต 16 ต.ค. 2026)

ชุดนี้ทำมาสำหรับ OpenCode V2 โดยตรง จุดที่ต่างจาก V1

- V2 เคารพ `disable-model-invocation` — ชุดนี้ถอดฟิลด์ออกจากทุก skill แล้ว เพื่อให้ model เห็นและเรียกใช้ได้เหมือนเดิม ถ้าต้องการซ่อน skill ไหนจาก model ให้ใส่ `metadata: opencode/autoinvoke: false` แทน

- agent file ใน V2 ต้องใช้ `color` เป็น hex 6 หลัก (`"#f5c542"`) ค่าอื่นจะทำให้ agent ถูกทิ้งทั้งไฟล์

- หลังติดตั้ง ให้ใช้ทางเข้าแบบ V2: `/poteto-mode` command, เลือก `poteto-mode` agent จาก picker, หรือพิมพ์ `@ชื่อ-skill` ในพรอมป์เพื่อโหลด skill ตรง ๆ

- CLI: `opencode run --agent <name> "<message>"` (ไม่มี `--agent` ที่คำสั่ง top-level แล้ว)

- ถ้า Config ยังใช้คีย์แบบ V1 (`plugin`, `command`, `agent`) V2 อ่านได้ปกติ การแปลงเป็นรูปแบบ V2-native เป็นทางเลือก


## ที่มา

- ต้นฉบับ: pstack v0.15.25, github.com/cursor/plugins (MIT license, Lauren Tan)
- ดัดแปลงเมื่อ: 15 ตุลาคม 2026
- รายละเอียดไฟล์ที่แก้ทั้งหมด: ดู [MANIFEST.md](./MANIFEST.md)
