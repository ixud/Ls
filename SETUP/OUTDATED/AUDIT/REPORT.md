# REPORT — ปิดรอยรั่ว BAZER Stack (A–E)

วันที่ 2026-10-18 · OpenCode 2.0.30 · Console v1.4.0 · branch `air` (uncommitted)


## 1. สรุปสถานะ

| งาน | สถานะ | หลักฐาน | ยังค้าง |
|---|---|---|---|
| **A — mode lock** | ✅ ปิด | `node mode-lock.mjs` → `สรุป: ล็อกอยู่ (22 PASS)` · `opencode debug config` แสดง `settings.reasoningEffort:"max"` + `variants[]` 3 ตัว · จำลอง `Ctrl+T` → `FAIL R4` แล้วกู้กลับได้ | ผู้ใช้ยังกด `Ctrl+T` ทับได้ (จับได้แต่กันไม่ได้) |
| **B — Buddha + mode lock** | ✅ ปิด | 6 โหมดมี marker + `permission:` · `PASS R9:*` / `PASS R10:*` 12 ข้อ · `# Snack` → `# Poteto Mode` · `BAZER-FLOW v1` ไม่แตะ (R8 = PASS) | การเรียกโหมดผ่าน mirror ยังเป็นข้อความ ไม่ใช่สิทธิ์ |
| **C — poteto playbooks** | ✅ ปิด | 23/23 ไฟล์ · index อ้างครบ 23 · bundle = installed (Compare-Object ว่าง) · `principle-*` 24 ตัว | คำอธิบาย "~60 skills" ในโหมด (ของจริง 69) — ไม่กระทบการทำงาน |
| **D — AGENTS.md → skill** | ✅ ปิด | `AGENTS.md` 38 → 19 บรรทัด + marker · skill `bazer-mode-rules` ติดตั้ง (5 ไฟล์) · `PASS R6` + `PASS R7` · verify `fail 0` | กฎ 2 ข้อ (Max Effort, gate) ยังต้องอยู่ระดับเครื่องโดยเจตนา |
| **E — Console audit** | ⚠️ ปิดบางส่วน | E1 `tui.json` แก้แล้ว · E2 sandbox `diff 0/new 0` `fail 0` · E3 ทดสอบ 4 เคสครบ · E4 เจอบั๊ก 2 ตัวแก้แล้ว · E5 เทียบเอกสารแล้ว | ปุ่มที่ไม่ได้รัน 8 ตัว (ระบุเหตุใน E4) · เครื่องไม่มี Node ยังไม่ทดสอบ |


## 2. สิ่งที่เปลี่ยนบนเครื่อง (ทุกไฟล์มี backup)

| ไฟล์ | การเปลี่ยน |
|---|---|
| `CONSOLE\mode-lock.mjs` | ใหม่ — ตัวตรวจ 22 กฎ |
| `CONSOLE\console.mjs` | `gatherModel` รับ 2 schema · verify 5/5b/5c · action `set-mode-lock`, `check-mode-lock`, `migrate-tui` · แก้ `agent-toggle`/`command-toggle` · `P.tuiJson` · `DEFAULTS.modeLock` |
| `CONSOLE\console.html` | ปุ่มล็อก/ตรวจ/ย้าย tui + case + `after` list |
| `CONSOLE\console.config.json` | เพิ่ม `modeLock { on:true, effort:"max" }` (gitignored) |
| `CONSOLE\bundle\agents\*.md` (6 ไฟล์) | marker + permission · แก้ `# Snack` · section mode lock |
| `CONSOLE\bundle\config\AGENTS.md.template` | ฉบับย่อ + marker |
| `CONSOLE\bundle\skills\bazer-mode-rules\**` | ใหม่ 5 ไฟล์ |
| `~/.config/opencode/AGENTS.md` | 38 → 19 บรรทัด |
| `~/.config/opencode/opencode.jsonc` + `~/.local/state/opencode/model.json` | เขียนผ่าน Console (มี `backups/<stamp>/manifest.json`) |
| `~/.config/opencode/tui.json` | ใหม่ (จาก `cli.json`) |
| `~/opencode-launch\*` | 5 ไฟล์ (ติดตั้งผ่าน `setup-apply`) |
| `SETUP\OPENCODE\AUDIT\*.md` | 6 ไฟล์ (รายงานชุดนี้) |

`.bak` ที่สร้างรอบนี้: `console.mjs.bak-20261018-150809`, `console.html.bak-20261018-150809`, `console.config.json.bak-20261018-150809`, `AGENTS.md.bak-20261018-150957`, `AGENTS.md.template.bak-20261018-150957`


## 3. ผล Arena (บันทึกไว้เพื่อตรวจย้อนหลัง)

| | C1 config-layer | C2 distribution-layer | C3 verification-layer |
|---|---|---|---|
| คะแนน cross-judge (`beam-free`) | 81.15 | 79.65 | **85.05** |
| คะแนนผม | 82 | 80 | **86** |

**ฐานที่เลือก: C3** — เป็นตัวเดียวที่รันจนแดงจริงและจับจุดที่อันตราย (schema, `model.json`, name-case)

**Grafts ที่รับเข้ามา**

| จาก | graft | เหตุผล |
|---|---|---|
| C1 | ตรวจ project config (`opencode.json` ที่โหลดทีหลัง global) | `opencode debug config` พิสูจน์ว่ามีชั้นนี้จริง |
| C1 | สวิตช์แบบ profile + เขียน atomic | rollback = เปลี่ยนสวิตช์ ไม่ใช่ไล่หา `.bak` |
| C2 | ซอง `permission:` + marker ต่อโหมด | `debug agents` ยืนยันว่า 3 โหมดไม่มี `permission:` เลย |
| C2 | แก้ `# Snack` | ต้นทางผิด (ไม่ใช่สำเนา) |
| ผม (Phase F) | คงรูปเขียน V1 เดิม + แก้ `gatherModel` ให้อ่านได้ทั้งสองรูป | ทดสอบแล้วว่า OpenCode normalize ให้ — และ C3 สรุปผิดข้อนี้ |

**ที่ทิ้ง:** `instructions:` เป็นที่เก็บกฎ (ยัง ambient) · ตัด `snack` ออกจาก `planningAgents` (เป็นการตัดสินใจเชิง product) · `capabilities.reasoning` (เสี่ยงสร้าง variant `none` โดยไม่จำเป็น)


## 4. บั๊กที่พบระหว่างตรวจและแก้แล้ว

| # | อาการ | ต้นเหตุ | หลักฐาน |
|---|---|---|---|
| 1 | `restart-server` throw | ขาด `opencode-serve.vbs` + `launchDir` ว่าง | หลังติดตั้ง launch 5 ไฟล์ → ทำงานได้ · verify `fail 0` |
| 2 | `agent-toggle` เปิดคืนไม่ได้ | หา `advisor.md` แต่ไฟล์จริงคือ `advisor.md.disabled` | error `ไม่พบไฟล์: advisor.md` → แก้แล้วทดสอบผ่าน |
| 3 | `command-toggle` เปิดคืนไม่ได้ | เหมือนข้อ 2 | เหมือนข้อ 2 |
| 4 | `list-models` fail | server 2.0 ตอบ HTML ที่ `/provider` (route เปลี่ยน) | `ดึง /provider ไม่ได้ JSON` |
| 5 | ปุ่ม "cli.json" เขียนไฟล์ที่ TUI ไม่อ่าน | OpenCode 2 ใช้ `tui.json` | docs 2026-10-17 + grep `tui.json` = 0 hit |
| 6 | verify ขึ้น "effort ตรงกัน" ทั้งที่ไม่ล็อก | เทียบ `effort` กับ `modelJsonVariant` กันเอง และไม่ดู `variants` | `state.model` = `{effort:"default", variants:{}, mismatch:false}` |


## 5. ยังค้าง (พร้อมเหตุผล)

| ข้อ | ทำไมยังค้าง |
|---|---|
| พิสูจน์ว่า Plannotator สลับเป็น `build` ได้/ไม่ได้ | server API 2.0 (`/api/agent`) ต้องมี key → 401 · หลักฐานเชิงโครงสร้างชี้ว่า `agent.name === "build"` พลาดเพราะ name จริงคือ `Build` แต่ยังไม่ใช่การรันจริง |
| ทดสอบเครื่องที่ไม่มี Node (MsgBox ของ VBS) | ต้องใช้ VM/เครื่องแยก ไม่มีในเครื่องนี้ |
| ปุ่ม 8 ตัวที่ยังไม่รัน | เขียนข้อมูลส่วนตัว (`pm-role-save`, `project-*`), เรียกเครือข่าย (`npx-skills`), รีสตาร์ทตัวเอง (`restart-service`), เปลี่ยนพฤติกรรมบูต (`autostart`), หรือเสี่ยงทับ config ที่เพิ่งล็อก (`build-apply`) |
| CHECKS ข้อ 1 (โฟลว์ Buddha 1 เคสเต็ม) | ต้องมีคนกดอนุมัติใน Plannotator จริง — ผมทำได้แค่ฝั่ง config/ตัวตรวจ |
| CHECKS ข้อ 3 (push) | การเปลี่ยนแปลงยัง uncommitted — ควรให้ผู้ใช้ตรวจ diff ก่อน commit |
| `.bak-*` ใน repo | ควรเพิ่ม `*.bak-*` ใน `.gitignore` หรือย้ายออก — ยังไม่แก้เพราะเป็นนโยบาย repo |


## 6. คำสั่งตรวจซ้ำ (3 คำสั่ง)

```powershell
# 1) ล็อกอยู่ไหม
node "C:\BCS\00.02 LLM Slavery\SETUP\OPENCODE\CONSOLE\mode-lock.mjs"

# 2) Console เห็นอะไร
$t=(Get-Content "C:\BCS\00.02 LLM Slavery\SETUP\OPENCODE\CONSOLE\console.runtime.json"|ConvertFrom-Json).token
(Invoke-RestMethod "http://127.0.0.1:4310/api/verify?t=$t").summary

# 3) OpenCode เห็นค่าอะไรจริง (เว้น 2 วิหลังแก้ไฟล์)
opencode debug config
```
