# MANIFEST — pstack OpenCode build

ทะเบียนการดัดแปลง: แก้อะไรจากต้นฉบับ, เพิ่มอะไรใหม่, และแผน apply เข้าเครื่อง (ขั้นตอนที่ 2)

ที่มา: pstack v0.15.25 (cursor/plugins) — โฟลเดอร์ต้นฉบับเป็นค่าเฉพาะเครื่อง (ไม่อ้าง path เต็มในเอกสารนี้)


## ไฟล์ที่ตัดออกจากชุดนี้

| ไฟล์/โฟลเดอร์ | เหตุผล |
|---|---|
| `.cursor-plugin/` | manifest ของ Cursor plugin marketplace |
| `plugin.json` | manifest ของ Cursor plugin (บันทึกเวอร์ชันไว้ 0.15.25) |
| `automations/benny/` | automation รันบน cloud ของ Cursor เท่านั้น |


## ไฟล์ที่แก้ (รายไฟล์)

### Skills หลัก

| ไฟล์ | แก้อะไร |
|---|---|
| `skills/poteto-mode/SKILL.md` | frontmatter name เป็น `poteto-mode`; เพิ่มหัวข้อ **Harness (OpenCode)**; เขียน Subagents + "Defaults for every delegate spawn" ใหม่ให้ตรง `task` tool; เปลี่ยนคำ: create-skill→playbook, deslop/control skills→fallback, AskQuestion→question |
| `skills/setup-pstack/SKILL.md` | เขียน `~/.agents/pstack-models.md` แทน `.mdc`; ใช้ `question` tool; line ในไฟล์ shape ไม่มี Task `model` แล้ว; วิธี detect models ของ OpenCode |
| `skills/how/SKILL.md` | spawn ผ่าน `poteto-agent`/`general`; ไม่มี `readonly` (เขียนใน brief); model ≥ `~/.agents/pstack-models.md` เป็น advisory |
| `skills/why/SKILL.md` | ค้น MCP จาก session/config ของ OpenCode; spawn params; model lines |
| `skills/swarm/SKILL.md` | worker เป็น local subagent; ตัด `environment: cloud`/`run_in_background`/`cloud_base_branch`; model file ใหม่ |
| `skills/arena/SKILL.md` | runners + cross-judge อ่านไฟล์ใหม่; spawn ผ่าน `task`; judge เป็น no-writes |
| `skills/interrogate/SKILL.md` | spawn ผ่าน `task`; ตัด slug-rejection ของ Task; model advisory |
| `skills/reflect/SKILL.md` | transcript ย้ายไป OpenCode storage; task spawn; งานสร้าง skill ใช้ playbook แทน create-skill |
| `skills/reflect/references/` (divergent, judgment, tooling, synthesizer) | path ของ skill folder เป็น `.opencode/skills/` + `~/.agents/skills/`; ตัด create-skill tokens |
| `skills/recall/SKILL.md` | transcript เป็น OpenCode storage; ตัด `ls -t` |
| `skills/automate-me/SKILL.md` | โฟลเดอร์ mode skill เป็น `.opencode/skills/`; `question` tool; transcript path; authoring ผ่าน playbook |
| `skills/poteto-help/SKILL.md` | ขั้นติดตั้งแบบ OpenCode; กลไก mode/agent; ตาราง "Not in pstack"; ตาราง fix a run |
| `skills/show-me-your-work/SKILL.md` | transcript เป็น OpenCode storage |
| `skills/create-verification-skill/SKILL.md` | output เป็น `.opencode/skills/verify-<app>/` |
| `skills/maintain-verification-skill/SKILL.md` | ค้นหา verify skill ที่ `.opencode/skills/` |
| `skills/make-bot-ui/SKILL.md` | frontmatter name เป็น `make-bot-ui` (URL `api2.cursor.sh` คงไว้ เพราะเป็น endpoint จริงของ Grok Bot) |

### Playbooks (`skills/poteto-mode/playbooks/`)

| ไฟล์ | แก้อะไร |
|---|---|
| `eval.md` | transcript เป็น OpenCode storage |
| `session-pickup.md` | transcript เป็น OpenCode storage; ตัดระดับความละเอียดของ model |
| `autonomous-run.md` | `/loop` → watcher/timed poll; AskQuestion → question |
| `bug-fix.md` | `/loop` → timed poll |
| `orchestrate.md` | workers เป็น local + worktree; ตัด cloud/environment; drain/ledger/liveness ปรับคำ; restart เป็นของ OpenCode |
| `shipping.md` | verifier เป็น local subagent + driver แทน control skills; `/loop` → timed poll |
| `multi-phase-plan.md` | path pstack เปลี่ยนเป็น `~/.agents/skills/`; control skill → Playwright/CDP/PTY; `/loop` → timed wake; `/deslop` → reread diff; scratch dir ไม่ผูก `/tmp` |
| `autopilot-full.md` | owner เป็น local subagent; deslop fallback; control skills → driver; `/loop` → timed audit |
| `babysit.md` | ตัดคำ "Cursor's built-in"; `/loop` → timed poll |
| `opening-a-pr.md` | `Task` → `task`; deslop fallback |
| `worktree-cleanup.md` | ตัวอย่าง path กลาง ๆ; disk item เป็น opencode storage |
| `authoring-a-skill.md` | เขียน SKILL.md ตรง ๆ แทน create-skill |
| `visual-parity.md` | `/loop` → poll |

### Agents / scripts / เอกสาร

| ไฟล์ | แก้อะไร |
|---|---|
| `agents/poteto-agent.md` | แปลงเป็น OpenCode agent (`mode: subagent`); fallback path `~/.agents/skills/poteto-mode/SKILL.md`; ตัด `~/.cursor/plugins` search |
| `agents/comment-sicko.md` | แปลงเป็น OpenCode agent + `permission: edit: deny` (read-only) |
| `skills/poteto-mode/scripts/worktree-audit.sh` | transcript dir เป็น `~/.local/share/opencode/storage` |
| `skills/poteto-mode/scripts/package.json` | เปลี่ยนชื่อ package เป็น `@pstack/poteto-mode-tools` |
| `README.md` | เพิ่มหมายเหตุชี้มาที่ README-OPENCODE.md |
| `docs/guide/README.md` | เพิ่มหมายเหตุว่าเอกสารชุดนี้ยังอ้าง Cursor |


## ไฟล์ใหม่

| ไฟล์ | หน้าที่ |
|---|---|
| `README-OPENCODE.md` | คู่มือหลักของชุดนี้ (อ่านก่อน) |
| `MANIFEST.md` | ไฟล์นี้ |
| `COMPARE.md` | เทียบ Cursor ต้นฉบับ vs OpenCode build (กลไก/ข้อจำกัด) |
| `DISCOVER.md` | สถานะชุดเก่าบนเครื่อง + ไทม์ไลน์หลังอัปเดต V2 |
| `agents/poteto-mode.md` | primary agent ทางเข้าหลัก (แบบเดียวกับ arena.md ที่มีอยู่) |
| `commands/poteto-mode.md` | slash command `/poteto-mode` |
| `config/pstack-models.template.md` | template ของ `~/.agents/pstack-models.md` |


## อัปเดตสำหรับ OpenCode V2 (16 ต.ค. 2026)

เครื่องนี้อยู่ใน OpenCode V2 (v2.0.30) ซึ่งเปลี่ยนพฤติกรรม 2 จุดที่กระทบชุดนี้ โดย build ได้ปรับตามแล้ว

- **V2 เคารพ `disable-model-invocation: true`** (เทียบเท่า `metadata.opencode/autoinvoke: false`): skill ที่มีฟิลด์นี้จะถูกซ่อนจาก model ไม่ auto-trigger (โหลดได้แค่ explicit ID / `@mention`) → ชุดนี้ถอดฟิลด์ออกจาก SKILL.md ทั้งหมด (53 ไฟล์) ให้ skill ถูกโฆษณาเหมือนพฤติกรรม V1

- **V2 บังคับ agent `color` เป็น hex 6 หลัก**: ค่าอื่นทำให้ agent ถูกทิ้งทั้งไฟล์ (เจอจริงกับ `arena.md` ของเครื่องนี้ที่เคยใช้ `color: accent`) → `agents/poteto-mode.md` ใช้ `color: "#f5c542"`

- `agents/comment-sicko.md` ใช้รูป V2-native: `permissions: - action: edit, resource: "*", effect: deny` (แทน `permission.edit` แบบ V1)

- ตัด `name` ออกจาก frontmatter ของ agent ไฟล์ (V2 ใช้ชื่อไฟล์เป็น ID; `name` เป็นฟิลด์ V1)

- CLI: V2 ไม่มี `--agent` ที่ top-level แล้ว ใช้ `opencode run --agent <name> "<message>"` หรือเลือก agent ใน TUI

- `automate-me` ปรับคำแนะนำการตั้ง frontmatter ของ mode skill ให้ตรง V2 (`metadata: opencode/autoinvoke: false` เมื่อต้องการซ่อน)


## แผน apply (ขั้นตอนที่ 2)

| ต้นทาง (ชุดนี้) | ปลายทาง |
|---|---|
| `skills/*` | `~/.agents/skills/*` (merge ทับชื่อเดียวกัน) |
| `agents/poteto-mode.md`, `agents/poteto-agent.md`, `agents/comment-sicko.md` | `~/.config/opencode/agents/` |
| `commands/poteto-mode.md` | `~/.config/opencode/commands/` |
| `config/pstack-models.template.md` | `~/.agents/pstack-models.md` (แก้โมเดลให้ตรง provider) |
| — | ลบไฟล์ค้าง `~/.agents/skills/pstack-models.md` (ถ้ามี) |

หมายเหตุตอน apply: เครื่องนี้มี pstack เวอร์ชันก่อนอยู่ที่ `~/.agents/skills/` (ติดตั้ง 13 ต.ค. จาก backnotprop/pstack ผ่าน skills CLI) สถานะที่ตรวจล่าสุด 15 ต.ค.:

- 52 skills ของ pstack (principles 24 + playbooks ของ poteto-mode ครบ) + skills อื่นที่ไม่เกี่ยวกับ pstack (`find-skills` 1 ตัว, `plannotator-*` 7 ตัว) — ของ pstack จะถูกทับด้วยชุดใหม่

- ขาด 2 skills: `in-your-own-words`, `sharpen` (ชุดใหม่มี)

- ไม่มี subagent `poteto-agent` / `comment-sicko` และไม่มี command/agent `poteto-mode` — มีแค่ `~/.config/opencode/agents/arena.md` ที่ทำมือไว้

- `~/.agents/skills/pstack-models.md` มีอยู่แต่ "ว่างเปล่า" และอยู่ผิดที่ (skills อ่านจาก `~/.agents/pstack-models.md` ซึ่งไม่มี) → ตั้งค่าโมเดลไม่เคยถูกใช้

- `~/.agents/.skill-lock.json` เก็บประวัติการติดตั้งเดิม (ใช้ uninstall/update ผ่าน skills CLI ได้)

ก่อน apply ควรสำรอง `~/.agents/skills/` และ `~/.config/opencode/` ไว้ก่อน แล้ว diff ดูว่าไฟล์ไหนหายไปจากของเดิม


## ตรวจรับหลัง apply

- ปิด/เปิด OpenCode ใหม่ แล้วเช็คว่า skills โหลดครบ (poteto-mode, poteto-help, principle-* 24 ตัว และ skills ที่เพิ่ม)

- `/setup-pstack` เขียน `~/.agents/pstack-models.md` ถูกที่และไม่ว่าง

- `/poteto-mode` กับงานทดสอบเล็ก ๆ: เปิด todo ตาม playbook และ spawn `poteto-agent` ได้

- `agents/` ทั้ง 3 ตัวโผล่ในรายการ agent ของ OpenCode — บน V2 ยืนยันด้วย `opencode debug agents` (agent ที่ frontmatter ผิด เช่น `color` ไม่ใช่ hex จะถูกทิ้งทั้งไฟล์)

- V2: model ต้องเห็น pstack skills ในลิสต์ (ถ้าเห็นแค่ `setup-pstack` แปลว่ายังมี `disable-model-invocation` หลงเหลือ)

- `question` tool ถูกเรียกใช้เมื่อ skill ถามคำถาม (ทดสอบผ่าน setup-pstack)
