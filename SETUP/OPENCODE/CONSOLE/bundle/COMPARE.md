# pstack: Cursor ต้นฉบับ vs OpenCode build

ไฟล์นี้สรุปความต่างระหว่าง pstack ที่ Cursor ใช้ กับชุดที่เราดัดแปลงสำหรับ OpenCode (เขียน 16 ตุลาคม 2026)

- ต้นฉบับ (Cursor): pstack เวอร์ชัน 0.15.25 จากชุด `cursor/plugins` — โฟลเดอร์จริงเป็นค่าเฉพาะเครื่อง (ไม่อ้าง path เต็มในเอกสารนี้)
- ชุดที่ดัดแปลง: โฟลเดอร์นี้ (`LM.SETUP\OPENCODE\pStack`) — ยังไม่ apply เข้าเครื่อง ณ วันที่เขียน


## จุดสำคัญ

เราไม่ได้เขียน pstack ใหม่ เรา "แปลกลไก" ของ Cursor ให้เป็นของ OpenCode เนื้อวิธีคิด (playbook, principles, กฎการเขียน, ปรัชญาการ verify) ยกมาทั้งดุ้น ต่างกันแค่ "ข้อต่อ" ที่ hook กับเครื่องมือของแต่ละเจ้า


## เทียบทีละด้าน

| ด้าน | Cursor (ต้นฉบับ) | OpenCode build |
|---|---|---|
| **ทางเรียกใช้** | `/poteto-mode` จาก skill menu + Custom Mode (Alt+Enter ให้ติดทุก turn) | command `/poteto-mode` + primary agent `poteto-mode` (เลือกจาก picker) + พิมพ์ `@ชื่อ-skill` |
| **คนงาน (subagents)** | `Task` tool + `poteto-agent` / `comment-sicko` แนบมากับ plugin พร้อม `model`, `readonly`, `run_in_background`, cloud VM | `task` tool + agent 2 ตัวที่เราสร้างเองใน `~/.config/opencode/agents` — พารามิเตอร์ที่ไม่มี (model/cloud/readonly) เขียนลง brief แทน |
| **โมเดลต่อ role** | เขียน rule `~/.cursor/rules/pstack-models.mdc` — บังคับได้จริงต่อการ spawn แต่ละครั้ง | เขียน `~/.agents/pstack-models.md` — เป็นคำแนะนำ เพราะ task tool ตั้ง model ต่อครั้งไม่ได้ delegate ใช้ตาม agent definition |
| **ประวัติแชท** | `agent-transcripts/` ใต้ `~/.cursor/projects/<slug>/` | `~/.local/share/opencode/storage/` (ใช้โดย recall / reflect / show-me-your-work) |
| **`/loop`** | built-in ของ Cursor | ไม่มี → poll ด้วยคำสั่ง shell ตั้งเวลา หรือ watcher subagent |
| **ถามคำถามผู้ใช้** | `AskQuestion` | `question` tool |
| **ชุดเครื่องมือ `cursor-team-kit`** | `deslop` (ล้าง slop ก่อน commit), `control-ui` / `control-cli` (ขับ UI/CLI จริง) | ไม่มี → reread diff เอง, ขับแอปด้วย Playwright / CDP / PTY |
| **สร้าง skill ใหม่** | `create-skill` built-in | playbook **Authoring a skill** ในตัว |
| **Babysit / Bugbot** | Cursor skill built-in + bot ของ Cursor | playbook Babysit ของ pstack เอง + triage bot GitHub ทั่วไป |
| **ติดตั้ง / อัปเดต** | `/add-plugin pstack` (marketplace + version 0.15.25) | copy ไฟล์เข้าเครื่อง (skills → `~/.agents/skills`, agents/commands → `~/.config/opencode`) — อัปเดตเองด้วยการทับ/เทียบ |
| **frontmatter** | ยืดหยุ่น (name มีช่องว่างได้, `disable-model-invocation`, icon/color) | ปรับตามกติกา OpenCode: name kebab-case ตรงโฟลเดอร์, ถอด `disable-model-invocation` (V2 ซ่อน skill ถ้ามี), agents ใช้ hex color + permissions array |


## ที่เหมือนกัน (แกนคุณค่าส่วนใหญ่)

- **54 skills ครบ**: playbooks 23 ตัว, principles 24 ข้อ, skills งานเฉพาะ (how, why, unslop, tdd...) — เนื้อหาต้นฉบับ

- **กระบวนการทำงาน**: จับคู่งาน → เปิด todo ตาม step → spawn คนงาน → verify กับของจริง → reply ตามสัญญา (ไม่มี long dash, อ้างหลักฐาน, ภาษาไทยได้)

- **Harness section**: ตารางแปลคำ Cursor → OpenCode อยู่ใน `poteto-mode/SKILL.md` ให้ agent อ่านเองอัตโนมัติ


## ข้อจำกัดที่ยังต่างจาก Cursor

1. **บังคับโมเดลต่อ role ไม่ได้** — OpenCode `task` รับแค่ description/prompt/subagent_type; ถ้าต้องการจริงต้องสร้าง agent แยกหลายตัวต่อโมเดล

2. **ไม่มี cloud agent** — ทุกอย่างรันเครื่องนี้ (ข้อดี: อ่าน local store/ไฟล์ได้หมด) ต้องระวังงานขนานกันใช้ worktree แยก

3. **scripts ช่วยงาน** (orch, watch-pr, check-plan) ต้องมี Bun; worktree-audit ต้อง shell แบบ POSIX

4. **automations/benny** (ระบบ triage บน cloud ของ Cursor) ไม่มีคู่ — ไม่ได้พอร์ตมา


## สรุปหนึ่งบรรทัด

Cursor ใช้ pstack ผ่าน plugin ที่ hook ลึกกับ Task/โมเดล/cloud — ของเราเหมือนย้ายบ้านโดยเก็บเฟอร์นิเจอร์เดิมทั้งหมด แต่เปลี่ยนระบบไฟ/ประปาเป็นของ OpenCode แทน (บางจุดต้องขันมือแทนอัตโนมัติ)


## เอกสารที่เกี่ยวข้อง

- [`README-OPENCODE.md`](./README-OPENCODE.md) — คู่มือใช้งานชุดนี้
- [`MANIFEST.md`](./MANIFEST.md) — รายการไฟล์ที่แก้ทั้งหมด + แผน apply (ขั้นตอนที่ 2)
- [`DISCOVER.md`](./DISCOVER.md) — ชุดเก่าบนเครื่องทำงานได้แค่ไหน + ไทม์ไลน์หลังอัปเดต V2
