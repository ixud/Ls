# CHANGELOG — MANIFEST

รูปแบบ: [Keep a Changelog](https://keepachangelog.com/) · เวอร์ชันของ **สัญญา** (ไม่ใช่เวอร์ชันแอป)
กฎ: ทุกครั้งที่แก้ไฟล์ในโฟลเดอร์นี้ ต้องเพิ่มบรรทัดใน `[Unreleased]` ก่อน commit
และห้ามลบประวัติเก่า — ถ้าเปลี่ยนความหมายของ field ให้ขึ้น Minor และเขียนหมายเหตุ migration

## [Unreleased]

### Added — 2026-10-20 (รอบ 00.00.03)
- **`plannotator-patch`**: หาไฟล์ Plannotator → แพตช์ token `switchTo:"<...>"` เป็น `buddha`/`bazer` (dry-run ได้, backup, ตรวจซ้ำ, idempotent) — ปิดช่อง "ตัดสินใจแล้วแต่ยังไม่มี"
- **`lock-restore`**: คืน model/effort จาก snapshot ที่บันทึกตอนเปิด lock (ปุ่มในแบนเนอร์ drift)
- **`cta`** ทุก action + แถบปุ่มหลักบนหน้าแรก (แก้ปัญหา "หาปุ่มติดตั้งไม่เจอ")
- EN summary ใน `README.md`, `DOCS/FLOW.md`, `DOCS/GUIDE.md` (เอกสารสองภาษา)

### Fixed — 2026-10-20 (รอบ 00.00.03)
- `env.mjs` ไม่ประกาศ `${VAR}` → `open-target` (backups) พัง
- `install-tools` ไม่ยอมติดตั้งเมื่อเครื่องมือที่ขาดไม่มี `why`
- `allControls()` เขียนซ้ำ 2 ที่ (index/apply) → รวมเป็นแหล่งเดียว
- `stamp()` ละเอียดไม่พอ → งานสองรอบในวินาทีเดียวแชร์ backup/quarantine; เพิ่ม milliseconds + กันชื่อโฟลเดอร์ชน
- `/icon.ico` เลือกไฟล์ `.ico` ตัวแรกตามตัวอักษร → ให้เลือก `BAZERCONSOLE.ico` ก่อน

### Verified — 2026-10-20 (รอบ 00.00.03)
- เพิ่มเทสต์: plannotator patch (unit 1 · integration 3)
- **ยังไม่รันชุดเทสต์ในรอบนี้** (environment ไม่มี shell) — รันด้วย `tools/selftest.mjs` + `tools/apitest.mjs`


### Fixed — modal เปล่าคลุมทั้งหน้า + ปุ่มกดไม่ได้ (2026-10-20)
- **ต้นเหตุ:** `.modal-root { display: grid }` ใน CSS ชนะ `[hidden]` ของ browser → modal ที่ยังไม่เปิดแสดงเป็นกล่องเปล่าเต็มจอ `z-index: 60` ทับทุกปุ่ม (กดปิดไม่ได้เพราะ `hidden` ไม่มีผล)
- **แก้:** เพิ่ม `[hidden] { display: none !important }` ระดับ global + เทสต์กันกลับมา (`selftest`: CSS ต้องมี guard นี้)
- เพิ่ม guard เวลาโหลด/เรนเดอร์พลาด: `load()` ตรวจว่ามี `plan` จริง, `render()` ครอบ try/catch แล้วแจ้ง toast แทนการปล่อยหน้าจอค้าง

### Added — เคลียร์ของเก่า (2026-10-20)
- `cleanup-old` + `cleanup-plan`: ย้ายของเก่าออกจากโฟลเดอร์ระบบไป `ACTIVE/var/quarantine/<stamp>/` พร้อม `quarantine.json` (ไม่ลบถาวร) แยก 5 กลุ่ม: agent เก่า · mirror `BAZERs-EXTENSION-*` · skill อื่น · ปลั๊กอินใน config · โฟลเดอร์ปลั๊กอิน
- `reset-template`: เขียนทับ `AGENTS.md` / `pstack-models.md` ด้วยแม่แบบจาก MAJOR (backup + history) — ใช้เมื่อไฟล์รุ่นเก่ายังมีกฎค้าง
- UI: แท็บ `ไฟล์ & สกิล → ของเก่า` แสดงกลุ่ม + จำนวน + รายการ ให้ติ๊กเลือกเอง, ปุ่ม `รีเซ็ต` ที่แถว template
- เทสต์ใหม่: cleanup เห็นของเก่า 4 กลุ่ม · dry-run ไม่ย้าย · ย้ายจริงแล้วของหายจากที่เดิม + config ถอดปลั๊กอิน · quarantine มี manifest · reset-template เขียนทับและปฏิเสธ entry ที่ไม่ใช่ template

### Verified (2026-10-20)
- `selftest.mjs` → **33 passed** · `apitest.mjs` → **43 passed**
- เครื่องจริง (ยังไม่ติดตั้ง): cleanup เห็น `agents 3 · mirrors 6 · skills-other 2 · plugins 1 · plugin-dirs 2`


### Fixed — bug scan 5 รอบ (2026-10-19)

**รอบ 1 · static / contract**
- `probe.mjs` เรียก `opencode` ตรง ๆ → **ENOENT** บน Windows (shim เป็น .cmd/.ps1) ทำให้ probe ที่พึ่ง OpenCode ตกทั้งหมด → รันผ่าน shell + ลองใหม่ 1 ครั้งถ้าได้ลิสต์ว่าง + โยน error ชัดเจนแทนการรายงานผิดว่า "ไม่พบ agent"
- เพิ่มเทสต์สัญญา: probe kind ต้องมี implementation · target ทุกตัว resolve ได้ · policy ใช้เฉพาะ permission action ที่มีจริง · settings control resolve ได้ · frontmatter ของ agent ทุกไฟล์ · โหมดหลักต้องมี 4 ไฟล์

**รอบ 2 · jsonc adversarial**
- `removeArrayItem` เขียน array ใหม่ทั้งก้อน → **คอมเมนต์ใน array หาย** → เขียนใหม่แบบตัดเฉพาะช่วงของสมาชิก
- ไฟล์ที่มี **BOM** ทำให้ `setAtPath` โยน "ไฟล์ไม่ได้เริ่มด้วย object" → รองรับ BOM (คงไว้ตอนเขียนกลับ)
- เพิ่มเทสต์: trailing comma · CRLF · BOM · key ซ้ำคนละชั้น · object ว่างบรรทัดเดียว · สตริงที่มี `}{` และ escape · ชั้นกลางเป็นสตริง · ไทย/emoji · number/bool/null · array ซ้อน · ไฟล์พังต้อง throw

**รอบ 3 · API / security**
- static file: เช็ค path traversal แบบ `startsWith` → เปลี่ยนเป็น `path.relative`
- ปุ่มที่ dry-run ได้เคยถูกบังคับยืนยันก่อน → เพิ่ม `confirmUnlessParam` (ข้อมูลใน `actions.json`)
- เพิ่ม `tools/apitest.mjs` (integration test: token · JSON พัง · action ผี · needsConfirm · traversal · idempotency · path ที่มีช่องว่าง)

**รอบ 4 · UI**
- คีย์ลัด (`keybind-list`) ถูกเขียนเป็นสตริง → `tui.json` เสียรูป → แปลงเป็น array ก่อนเขียน
- ปุ่ม `open-target`, `plannotator-locate` ไม่มีที่ให้กด → หน้าแรกแสดงปุ่มที่ยังไม่มีเจ้าภาพครบทุกตัว
- ตัวกรอง "BAZER" จับผิด → กรองจาก `source` ของ entry · `renderHeader`/ladder หา policy ที่ `mode === 'buddha'`
- ตัดโค้ดตายใน palette · ป้าย `⌘ K` เป็น `Ctrl K` บน Windows
- เพิ่มเทสต์: `app.js` parse ได้ · UI อ้างเฉพาะ action ที่ประกาศจริง

**รอบ 5 · real-world**
- สัญญาใน README ว่า "ล้มกลางทาง = rollback" แต่โค้ดแค่หยุด → **implement rollback จริง**
- `copy-tree` อ่านทุกไฟล์เป็นข้อความ → **ไฟล์ไบนารีพัง** → ตรวจ NUL แล้วคัดลอกแบบ byte
- ชื่อไฟล์ backup อาจชนกัน → ใช้ hash ของพาธเต็มนำหน้า
- เพิ่มเทสต์: ล้มกลางทางแล้ว rollback · binary round-trip · state.json พัง · history.tsv พัง · บันทึกก่อนติดตั้งต้องล้มอย่างสุภาพ

### Verified on this build (2026-10-19, Windows, OpenCode v2.0.32)
- `tools/selftest.mjs` → **32 passed** · `tools/apitest.mjs` → **34 passed**
- ติดตั้งลง sandbox home: **applied 16 · errors 0** · รันซ้ำ **applied 0** · `ok 17 · design 4 · blockers 0`
- `law.json` → R1–R4 ผ่านทั้ง 4 ข้อบน repo จริง
- `settings-save` คงคอมเมนต์ใน `opencode.jsonc` · `policy-set` แทน permission ทั้งก้อน · rollback คืนไฟล์ได้

## [0.1.0] — 2026-10-19

### Added
- สร้าง `manifest.json` 21 entry: โหมด 4 · subagent 4 · sub-subagent 2 · skills tree 1 · templates 2 · config 4 · launcher 1 · patch 1 · plugin 2
- `policies.json` — บันไดเหมาเข่ง 5 ขั้น พร้อมชื่อไทย: **สุภาพ → ปลดกำ → ออกนอกบ้าน → ไม่ถามใคร → เหมาเข่ง**
- `settings.json` — Quick Access (model/effort 4 โหมด + คีย์ + lock) · ARENA (runners/judge) · อื่น ๆ · PSTACK 15 roles + budget
- `actions.json` — 16 ปุ่ม พร้อม `risk.level 1–3` และเหตุผลที่แสดงบนปุ่มจริง
- `probes.json` — 8 ข้อพิสูจน์ (Node, OpenCode, builtin-hidden, modes-present, permission-level, tui, pstack-models, plannotator-locate)
- `law.json` — R1–R4 ในรูปข้อมูล
- `env.json` — ตัวแปร `${HOME} ${CONFIG} ${SKILLS} ${STATE} ${PLANNOTATOR} ${LAUNCH} ${TEMP}`
- `README.md` — สัญญาเต็มของโฟลเดอร์นี้ + กับดักที่พิสูจน์แล้ว + วิธีเพิ่มของ
- `schema.json` — รูปร่างของทุกไฟล์ในโฟลเดอร์นี้

### Verified (บน OpenCode v2.0.32)
- permission action ที่มีจริง: `read edit glob grep list shell subagent webfetch websearch external_directory question doom_loop browser` (+ `submit_plan` จาก Plannotator)
- `bash` → `shell` และ `task` → `subagent` เป็น alias ที่ทำงานจริง
- `skill` และ `lsp` **ไม่มี**ในสคีมา → ตัดออกจากทุกที่
- `agent.plan/build = {mode:subagent, hidden:true}` ซ่อน Plan/Build ออกจาก primary ได้จริง
- permission ที่เขียนจาก config **ต่อท้าย** และมีผลจริง → บันไดเหมาเข่งเขียนจาก Console ได้โดยไม่แตะ `BUDDHA.md`
- `hidden: true` ใช้กับ primary ได้
- `tui.json` เก็บคีย์ลัดที่ `keybinds.*`

### Decided
- **ไม่มี mirror** (`BAZERs-EXTENSION-*`) — เรียกโหมดผ่าน subagent จริง
- **ไม่มี gang model** — ใช้ Quick Access + preset 3 แบบแทน (เหตุผลใน README §6)
- **ไม่มี slash command** ใน v0.1 — สลับโหมดด้วย `Shift+Tab`
- `patch.plannotator` และ plugin ทั้งสองตัว = `status: design` (ยังไม่ติดตั้ง และ UI ต้องบอกตรง ๆ)

### Pending
- implement `apply.mjs` ให้ครบทุก strategy + rollback (v0.1 ทำครบ: overwrite, create-only, template-once, jsonc-merge, jsonc-remove-array-item, copy-tree, line; `patch` ยัง design)
- adapt PSTACK skills เป็น OpenCode (`status: raw` → ต้องมี `ADAPT-OPENCODE.md`)
