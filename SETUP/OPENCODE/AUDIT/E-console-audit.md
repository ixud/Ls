# E — Audit BAZER Console

วันที่ 2026-10-18 · Console v1.4.0 · port 4310


## E1 — Console apply ค่า config จริงไหม และ `cli.json` หรือ `tui.json`

### คำตอบ

OpenCode 2.0.30 อ่าน TUI settings จาก **`tui.json`** ไม่ใช่ `cli.json`

หลักฐานจากเอกสารทางการ (อัปเดต 2026-10-17):

- "For TUI-specific settings, use `~/.config/opencode/tui.json`."
- "Legacy `theme`, `keybinds`, and `tui` keys in `opencode.json` are deprecated and automatically migrated when possible."
- TUI ใช้ schema `https://opencode.ai/tui.json` และ env `OPENCODE_TUI_CONFIG`

หลักฐานฝั่งเครื่อง: ไม่มี `tui.json` เลยตอนเริ่ม (มีแต่ `cli.json` 359 ไบต์) และ grep `tui.json` ใน `console.mjs` = 0 hit ⇒ ปุ่ม "cli.json" เขียนไฟล์ที่ TUI 2.0 ไม่อ่าน

### แก้แล้วในรอบนี้

| เปลี่ยน | ที่ |
|---|---|
| เพิ่ม path `P.tuiJson` | `console.mjs:44` (ถัดจาก `cliJson`) |
| action `migrate-tui` (สำรอง + เขียน `tui.json` พร้อม `$schema`) | `console.mjs` (ก่อน `save-text`) |
| `save-text` target `cli` เขียน `tui.json` เป็นหลัก + `cli.json` เป็น legacy | `console.mjs` `save-text` |
| verify ข้อ `5c` เตือนเมื่อมี `cli.json` แต่ไม่มี `tui.json` | `console.mjs` หลังบล็อก 5b |
| ปุ่ม "ย้าย cli.json → tui.json" | `console.html` (การ์ดโมเดล & effort) |

ผลรัน:

```
migrate-tui => ok=True :: เขียน C:\Users\Bazer\.config\opencode\tui.json แล้ว (จาก cli.json 4 คีย์) - cli.json เก็บไว้เป็น legacy
```

```json
{ "$schema": "https://opencode.ai/tui.json", "keybinds": { "messages.copy": "ctrl+m" }, "leader": { "timeout": 1500 }, "animations": true, "session": { ... } }
```

### ตาราง action ที่เขียน config (ตามที่ตรวจในโค้ด)

| action | เขียนไฟล์ | ค่าที่เขียน |
|---|---|---|
| `set-lock` | `serve-restricted.jsonc` | `enabled_providers` + `blacklist` |
| `update-blacklist` | `serve-restricted.jsonc` | blacklist |
| `set-model-effort` | `opencode.jsonc` + `model.json` | `model`, `options.reasoningEffort`, `variants` (3 ตัวชี้ค่าเดียว), `variant` |
| **`set-mode-lock` (ใหม่)** | `opencode.jsonc` + `model.json` + `console.config.json` | ชุดเดียวกับข้างบน + `modeLock` + ตรวจซ้ำทันที |
| **`migrate-tui` (ใหม่)** | `tui.json` (+ สำรอง `cli.json`) | คัดลอกค่า + `$schema` |
| `refresh-config` | `opencode.jsonc` | `workflow` + `planningAgents` |
| `plannotator-toggle` | `opencode.jsonc` | ลงทะเบียน/ถอดปลั๊กอิน |
| `save-text` | `tui.json` + `cli.json` / `AGENTS.md` / `pstack-models.md` | ข้อความดิบ |
| `save-plannotator-config` / `-prefs` | `~/.plannotator/config.json`, `install-prefs` | `semanticDiff`, `callFlow` |

ช่องที่ยังไม่ครอบคลุม (grep แล้ว 0 ครั้ง): `theme`, `permission`, `mcp`, `instructions`, `small_model`, `disabled_providers`, auth/API key, per-agent model


## E2 — clone สะอาด กด install ได้ไหม (sandbox)

วิธี: คัดลอก `CONSOLE` → `%TEMP%\bazer\clone\CONSOLE` · ตั้ง `USERPROFILE`/`HOME` = `%TEMP%\bazer\clone\home` (ว่างเปล่า) · ลบ `console.config.json` เพื่อจำลองเครื่องใหม่ · รัน Console พอร์ต 4320

| ขั้น | ผล |
|---|---|
| `setup-preview` | 11 ขั้น · `will=true` ทั้ง 11 (รวม `launch` ที่ชี้ `...\clone\home\opencode-launch`) |
| `setup-apply` (11 ขั้น) | ok — ติดตั้ง skills 61 โฟลเดอร์ · agents 8 · launch 5 ไฟล์ · mirror 6 |
| `update-check` | `new 0 · diff 0 · same 70` |
| `verify` | `ok 10 · warn 3 · fail 0` (warn = server ไม่ได้รันใน sandbox, effort default) |

เคสพิเศษที่บรีฟระบุ:

| เคส | ผล |
|---|---|
| ไม่มี `~/.agents` / `~/.config/opencode` เลย | ✅ `setup-preview` เสนอสร้าง dirs ทั้ง 4 และ apply สร้างให้ |
| ไม่มี `~/opencode-launch` | ✅ ไม่ error — สร้าง `home\opencode-launch` + 5 ไฟล์ (`+5`) |
| ไม่มี Node | ⚠️ **ยังไม่ได้รัน** — ต้องทดสอบ VBS บนเครื่องที่ไม่มี Node (ต้องใช้ VM/sandbox แยก) |


## E3 — `git pull` แล้วกดอัปเดต ได้ผลจริงไหม ทิ้ง conflict ไหม

| คำถาม | คำตอบจากโค้ด | ผลรันจริง |
|---|---|---|
| ทิ้ง `.orig`/`.rej` ไหม | ไม่ทิ้ง (copy ทับ ไม่ merge) | ✅ นับไฟล์ `.orig/.rej` = **0** |
| ไฟล์ที่ผู้ใช้แก้เองหายไหม | หาย แต่มีสำรอง | ✅ แก้ `commands/poteto-mode.md` → หลัง `update-apply` marker หาย · backup set `2026-10-18T08-14-12-d78a` มี `manifest.json` + `file_0.bak` · `restore-backup` กู้ marker กลับมาได้ (นับได้ 1) |
| ไฟล์ที่ลบจาก bundle ถูกลบไหม | ไม่ (ไม่มี logic ลบ) | ✅ สร้าง `skills/zzz-test-orphan/SKILL.md` → ยังอยู่หลัง update (แล้วลบทิ้งในการทดสอบ) |
| agent ที่ `.disabled` | ยังปิดอยู่ | ✅ rename `advisor.md → advisor.md.disabled` → หลัง `update-apply` ยัง `.disabled` และไม่สร้าง `advisor.md` ใหม่ |
| 3 ปุ่มต่างกันอย่างไร | `update-check` (อ่าน) · `update-apply` (copy+mirror) · `sync-all` (+refresh-config+runVerify) | ✅ ทั้งสามรันผ่าน · `sync-all` รายงาน `applied 1 + mirror + refresh-config` |

ข้อสังเกต: การอัปเดต **ไม่รัน `git pull`** — ต้อง pull เองก่อนกด (ตรงกับที่ README/`FLOW.md` เขียนไว้)


## E4 — ปุ่มอื่น ๆ

| ปุ่ม / action | ผล | หลักฐาน |
|---|---|---|
| `update-check` | ✅ | `new 0 · diff 0 · same 70` |
| `build-preview` | ✅ | `diff 0 · new 0 · same 64` |
| `scan-projects` | ✅ | เจอ 7 โปรเจกต์ |
| `list-avail-models` | ✅ | 517 โมเดล |
| `list-models` | ❌ **fail** | `ดึง /provider ไม่ได้ JSON` — server 2.0 ตอบ HTML ที่ `/provider` (route เปลี่ยน) ⇒ ปุ่มนี้ใช้กับ 2.0 ไม่ได้ |
| `health-check` | ✅ | `server 4096 ทำงาน · v? · CLI v2.0.30` |
| `restart-server` | ✅ | ทำงานได้หลังติดตั้ง launch 5 ไฟล์ (ก่อนหน้านี้ throw) |
| `set-lock` (deepseek-only / provider-only) | ✅ | เขียน `serve-restricted.jsonc` + สำรอง · สลับไป-กลับได้ |
| `set-mode-lock` (ใหม่) | ✅ | `ล็อก ... effort max + ซิงค์ model.json — ล็อกอยู่ (22 PASS)` |
| `check-mode-lock` (ใหม่) | ✅ | `mode lock: ล็อกอยู่ (22 PASS)` |
| `migrate-tui` (ใหม่) | ✅ | เขียน `tui.json` 4 คีย์ |
| `skill-hide` / `skill-show` | ✅ | ซ่อน/แสดง `bro` ได้ |
| `agent-toggle` | ⚠️ **เจอบั๊ก → แก้แล้ว** | ปิดได้ แต่เปิดคืนไม่ได้ (`ไม่พบไฟล์: advisor.md`) เพราะหาไฟล์ `.disabled` ไม่เจอ · แก้ที่ `console.mjs` `agent-toggle` แล้วทดสอบเปิดคืน = ok |
| `command-toggle` | ⚠️ **เจอบั๊กเดียวกัน → แก้แล้ว** | เช่นเดียวกัน · ทดสอบเปิดคืน = ok |
| `refresh-config` | ✅ | `planningAgents: plan, buddha, arena, snack, poteto-mode` |
| `reset-template` | ✅ | `คืน AGENTS.md จาก template แล้ว` |
| `plannotator-toggle` (enable) | ✅ | ลงทะเบียนปลั๊กอินซ้ำได้ ไม่พัง |
| `mirror-agents` | ✅ | `อัพเดต mirror แล้ว 0 ตัว` |
| `restore-backup` | ✅ | กู้ 1 ไฟล์จาก set ที่ระบุ |
| `sync-all` | ✅ | `applied 1 + mirror + refresh-config` |
| `build-apply` | ⏭️ ไม่ได้รัน | เสี่ยงทับ config ที่เพิ่งล็อก — ใช้ `update-apply` แทนซึ่งพิสูจน์แล้ว |
| `install-agent` | ⏭️ ไม่ได้รัน | ต้องระบุไฟล์เดียว ไม่มีของใหม่ให้ติดตั้ง |
| `npx-skills` | ⏭️ ไม่ได้รัน | เรียกเครือข่ายภายนอก |
| `pm-role-save` / `pm-legacy-*` | ⏭️ ไม่ได้รัน | เขียน `pstack-models.md` ส่วนตัวของผู้ใช้ |
| `project-init` / `project-agent-*` | ⏭️ ไม่ได้รัน | เขียนในโปรเจกต์อื่น (นอกขอบเขต) |
| `open-folder` | ⏭️ ไม่ได้รัน | เปิด Explorer (ผลข้างเคียงกับหน้าจอผู้ใช้) |
| `restart-service` | ⏭️ ไม่ได้รัน | จะรีสตาร์ท Console ตัวเองกลางงาน |
| `autostart` | ⏭️ ไม่ได้รัน | สร้าง/ลบ shortcut ตอนบูต — ควรเป็นการตัดสินใจของผู้ใช้ |

### กับดัก launch ที่บรีฟระบุ — ยืนยันแล้ว

ก่อนติดตั้ง launch: `restart-server` throw เพราะ `opencode-serve.vbs` ไม่มี (`state.launch.items[*].exists=false` ทั้ง 5)
หลัง `setup-apply { steps:['launch'] }`: ไฟล์ 5/5 · `restart-server` ทำงาน · `/api/verify` เปลี่ยนจาก `fail 1` (Server 4096) เป็น `fail 0`


## E5 — เอกสาร

| เอกสาร | สถานะ |
|---|---|
| `README.md` อ้าง `../FLOW.md` | ✅ มีจริง 16,521 ไบต์ |
| `README.md` อ้าง `../GUIDE.md` | ✅ มีจริง 103,681 ไบต์ |
| `README.md` เขียน "skills (ชุด pStack ~54 ตัว)" | ⚠️ **คลาดเคลื่อน** — bundle 55 โฟลเดอร์ · ติดตั้ง 69 (รวม mirror 6 + plannotator 4 + ที่เพิ่มรอบนี้) |
| `README.md` อธิบายว่า "อัปเดต = pull + 3 ขั้น" | ✅ ตรงกับโค้ด (ไม่มี `git pull` ในตัว) |
| `CHECKS.md` ข้อค้าง 1: ทดสอบโฟลว์ Buddha 1 เคส | ⏳ **ยังค้าง** — รอบนี้ทดสอบได้แค่ส่วน config; flow เต็มต้องมีคนกดอนุมัติจริงใน Plannotator |
| `CHECKS.md` ข้อค้าง 2: รันรอบ 4/5 บนเครื่องจริง | ✅ **ปิดได้บางส่วน** — รอบนี้รัน verify/update/setup/lock บนเครื่องจริงแล้ว (`fail 0`) แต่ยังไม่ครบทุกปุ่มตามตาราง E4 |
| `CHECKS.md` ข้อค้าง 3: branch ยังไม่ push | ⏳ **ยังค้าง** — repo อยู่ที่ `C:\BCS\00.02 LLM Slavery` branch `air` HEAD `02db1c3` · การเปลี่ยนแปลงรอบนี้ยัง uncommitted/ไม่ push |
