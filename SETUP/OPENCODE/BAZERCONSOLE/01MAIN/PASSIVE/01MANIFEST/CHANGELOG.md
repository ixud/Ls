# CHANGELOG — MANIFEST

รูปแบบ: [Keep a Changelog](https://keepachangelog.com/) · เวอร์ชันของ **สัญญา** (ไม่ใช่เวอร์ชันแอป)
กฎ: ทุกครั้งที่แก้ไฟล์ในโฟลเดอร์นี้ ต้องเพิ่มบรรทัดใน `[Unreleased]` ก่อน commit
และห้ามลบประวัติเก่า — ถ้าเปลี่ยนความหมายของ field ให้ขึ้น Minor และเขียนหมายเหตุ migration

## [Unreleased]

### Changed — 2026-10-21
- เปลี่ยนชื่อขั้นที่ 2 ของบันไดเหมาเข่ง: **ปลดกำ → ปลดแอก** (แก้ที่ `policies.json` เท่านั้น — `id`/`permission` ไม่เปลี่ยน ไม่ต้อง migration)

### Added — 2026-10-20 (00.00.10 · บันได BAZER + ตรวจขั้นจาก config)
- **`bazer-ladder`**: policy ใหม่ (`mode: bazer`) ใช้ระดับชุดเดียวกับ BUDDHA ผ่าน `inherit` (ขยายใน `manifest.mjs`) — แยกสถานะ/ปุ่มจาก BUDDHA
- **`cfg.bazer-default`** entry + `agent.bazer` มี `ladderPolicy`/`ladderAgent`
- **`detectPolicyLevel(home, policy)`**: อ่าน `agent.<buddha|bazer>.permission` จาก config แล้วเทียบกับแต่ละขั้น → `1`–`5` / `custom` / `null`; `/api/state` ส่ง `policyDetected`
- **`state.policies[policyId]`**: เก็บขั้นแยกต่อบันได (mirror `state.policy` เฉพาะ buddha)
- **actions**: `policy-set` / `policy-undo` รับ `params.policy`

### Fixed — 2026-10-20 (00.00.10)
- **apply ทับขั้นบันได**: `writeEntry` ฉีด permission ด้วย defaultLevel เสมอ → กด apply ทีเดียวขั้นเหมาเข่งหาย; แก้ให้ใช้ขั้นจาก `state.policies` และเขียนลง `agents/buddha.md` · `agents/bazer.md`
- **`diffFor`** ใช้ขั้นที่ตรวจได้ (ไม่ใช่ default) เพื่อโชว์ after ให้ตรง
- **`undoPolicy(home, policyId, store)`** — signature เปลี่ยน (เดิมรับ store เป็น arg 2)

### Fixed — 2026-10-20 (00.00.09 · ตัวเลข "ต้องอัปเดต" ที่ทำให้ apply เขียน 0)
- **ถอด manifest entry `cfg.retire-old-flow`** — `retireOldFlow(home, name)` สร้างค่าเอง (ไม่ให้ entry "ถอด" ปนกับ entry "ติดตั้ง")
- **`computePlan.summary`** เพิ่ม `actionable` · `manualOnly` · `locked` และข้อความ `plan` แยก 3 จำนวน
- **UI ภาพรวม** pill "ติดตั้งได้ / ต้องสั่งเอง" + การ์ด "ต้องสั่งเอง N รายการ" พร้อมปุ่มติดตั้งรายตัว + hint เรื่องไฟล์ locked

### Removed — 2026-10-20 (ตัดปุ่มผี Plannotator · 00.00.08)
- action `plannotator-patch` + handler + `data-patch` ใน UI + `SERVER/plannotator.mjs` + manifest entry `patch.plannotator` — ไม่มีไฟล์ให้แพตช์ และ "กลับโหมด" เป็นค่าของหน้า review UI

### Added — 2026-10-20 (00.00.08)
- probe `plannotator-version` (kind `exe-version`) — เรียก exe `--version` จาก path ใน env
- `open-target which=plannotator` + ปุ่มเปิดโฟลเดอร์ `${PLANNOTATOR}`

### Changed — 2026-10-20 (Plannotator · ข้อสรุปที่ถูกต้อง)
- **"อนุมัติแล้วกลับโหมดไหน" คือค่าที่เลือกในหน้า review UI** (ปลั๊กอินเรียก `session.switchAgent`) — ไม่ใช่ไฟล์ที่แพตช์ได้ และไม่อยู่ใน `~/.plannotator/config.json`
- **`plannotator-config`**: รับ `workflow` (`plan-agent`/`user-managed`/`all-agents`/`manual`) · `runtime` (`cli`) · `planningAgents` และรองรับ `@plannotator/opencode@x.y.z`
- **UI ระบบ**: การ์ด Plannotator มี select workflow/runtime/planningAgents + ปุ่มบันทึกเดียว
- **ข้อความ CLI-only**: ชี้ "ตั้งในหน้า review UI" + `--result-file` แทนคำว่า "แพตช์ไม่ได้"
- **`PLANNOTATOR.md`**: ระบุว่า host ที่ไม่รองรับ `switchAgent` งานเราไม่พัง (gate ล็อกเซสชันอยู่แล้ว)
- **selftest +1**: สัญญา `plannotator-config` (workflow 4 ค่า · runtime · startsWith)

### Changed — 2026-10-20 (Plannotator CLI-only · 00.00.06)
- **`PLANNOTATOR.md`**: `--result-file` เป็นสัญญาหลัก (สถานะ `approved`/`feedback`/`pending`/`error` อ่านจากไฟล์ผล ไม่ใช่ปุ่ม) + ผู้เรียกเป็นเจ้าของการตัดสินใจกลับโหมด + ห้ามแพตช์ exe
- **`actions.mjs` / `plannotator.mjs` / `UI/app.js`**: ข้อความ CLI-only ชี้ `--require-approval --result-file` แทนข้อความลอย
- **selftest +2**: สัญญา `PLANNOTATOR.md` และข้อความ CLI-only ต้องชี้ `--result-file`

### Added — 2026-10-20 (Wave A/B: plugin pipeline · arena · system tab)
- **`manifest: plugin.bazer-flow`**: status `ready` · `copy-tree` · `prune: true` · `auto: false` — ต้นทาง `AGENT/04PLUGIN/bazer-flow` (Console ติดตั้ง/อัปเดตได้เอง)
- **`SERVER/frontmatter.mjs`**: `setFrontmatterPermission` / `getFrontmatterPermission` / `stripFrontmatterPermission` (YAML-lite คง key อื่น/BOM/CRLF)
- **`jsonc.appendArrayItem()`**: เพิ่มสมาชิก array คู่กับ `removeArrayItem` (คงคอมเมนต์)
- **actions ใหม่ 6 ตัว**: `plugin-register` (3) · `plugin-list` (1) · `plugin-update` (3) · `plannotator-config` (2) · `backup-list` (1) · `backup-restore` (3)
- **probes ใหม่**: `plugin-registered` (jsonc-array-contains) — kind ใหม่ `jsonc-array-contains`
- **settings**: `arena.runners` / `arena.judge` เก็บ **`model#effort`** ต่อที่นั่ง (แหล่งความจริงเดียว) — ลบบรรทัด `arena * efforts:` รุ่นเก่าเมื่อบันทึก · UI ตัวแก้ไข Arena ใหม่
- **env**: `${LOCALAPP}` (kind `env` → LOCALAPPDATA, fallback `${HOME}/AppData/Local`) · `${CACHE}` = `${HOME}/.cache/opencode`
- **manifest fields ใหม่** (schema อัพเดตแล้ว): `ladderPolicy` · `ladderAgent` · `prune` · `policyOverrides`
- **UI**: แท็บ **ระบบ** (ปลั๊กอิน/เครื่องมือ/Plannotator/backup/เซิร์ฟเวอร์) · ตัวแก้ไข Arena (ชิป + panel ค้นหา + กล่อง effort 7 ระดับ) · dropdown โมเดลแบบ single-select

### Changed — 2026-10-20 (Wave A/B)
- **`models.mjs`**: กรองเหลือ `opencode` + `opencode-go` (คืน `excluded` เป็นตัวเลข) — `parseModelsOutput(text, { allowAll: true })` สำหรับตรวจว่าซ่อนเท่าไร
- **`plan.mjs` copy-tree**: นับไฟล์ "เกิน" (ซาก) → `stale` ไม่ใช่ `ok`; `stateOf` ของ agent ที่ผูกบันไดเทียบโดยไม่นับบล็อก permission; `diff` แสดง after ที่ฉีด permission แล้ว
- **`apply.mjs`**: prune ไฟล์เกินเข้า `backups/<stamp>/pruned/` · เขียน permission ลง frontmatter ของ agent · `restoreBackupFile` สำรองของปัจจุบันก่อนคืน
- **`plannotator.mjs`**: แพตช์ 3 token (switchTo/label/localStorage key) + ค้น 7 root + คืน `kind: files|cli-only|none`
- **`probe.mjs`**: `plannotatorLocate` รายงาน `kind`/`scanned`; `verifyProofs(home, probeResult)` ใช้ผลเดิม
- **`index.mjs`**: `state.app` เพิ่ม `pid` · `port` (พอร์ตจริง) · `startedAt`
- **`law.json` R1**: except `AGENT/04PLUGIN/**` (แก้ความขัดแย้งกับ GUIDELINE)
- **เอกสาร**: `DOCS/REQUIREMENTS.md` (ใหม่) · `DOCS/GUIDE.md` (แท็บ ระบบ + Arena) · `AGENT/04PLUGIN/GUIDELINE.md` (เขียนใหม่) · `DOCS/DEMAND.md` ชี้มา REQUIREMENTS

### Verified — 2026-10-20 (Wave A/B)
- `selftest.mjs` → **68 passed** (+6: appendArrayItem · frontmatter 2 เคส · strip · stateOf บันได · gate logic)
- `apitest.mjs` → **73 passed** (+11: plugin-register/ซ้ำ · ติดตั้งปลั๊กอิน · prune · backup-list/restore ×3 · plannotator-config · บันไดลง frontmatter · ไม่ขึ้น stale)
- harness UC → **100 passed · 0 failed**

### Fixed — 2026-10-20 (ULTRA 3 LOOPS · 14 บั๊กจาก UC 120 ข้อ)
- **jsonc merge ลึก 2 ชั้น**: `mergeInto()` เรียกตัวเองแล้วทิ้งค่าที่คืน → merge ชั้นในหายเงียบ (ทำให้ `builtin-toggle on` = ปุ่มตาย) — แก้เป็น `text = mergeInto(...)`
- **พอร์ตชนแล้วเปิด URL ผิดตัว**: `listening` ถูกผูกใหม่ทุก retry + `link` ใช้พอร์ตที่ขอ → ผูกครั้งเดียวนอก `listen()` และใช้ `server.address().port`; พิมพ์บรรทัดเดียว บอกพอร์ตที่เลื่อนมา
- **lock/drift ตายทั้งฟีเจอร์**: `saveSettings()` ถ่าย snapshot ทุกครั้งที่บันทึก → snapshot = ค่าที่เพิ่งเปลี่ยน; เปลี่ยนเป็นถ่ายเฉพาะตอนสลับ lock ปิด→เปิด (หรือยังไม่มี snapshot) + `snapshotHome` กัน snapshot ข้าม home
- **BOM หาย**: `readText()` ตัด BOM ก่อนเขียนกลับ — เพิ่ม `readTextRaw()` ใช้กับ path ที่เขียนกลับ (jsonc-merge / remove / writeJsonc / writeFullSettings)
- **probe รันซ้ำ**: `verifyProofs(home, probeResult)` ใช้ผลที่รันแล้ว (เดิมเรียก `runProbes()` ใหม่ทุก entry ที่มี proof)
- **installer**: เพิ่ม `check.probe` ใน `install.json` (node/opencode ตรวจ ≥ min จริง ไม่ใช่แค่ exit code) + แยก `need` (required) จาก `advisory` (optional)
- **`open-target`**: ไม่มีโฟลเดอร์ → `warn` + `opened:false` (เดิมรายงานสำเร็จแล้วเด้ง Explorer เปล่า)
- **`manifest.json`**: เติม `why` ให้ `plugin.bazer-fire` → `validate()` สะอาด

### Changed — 2026-10-20 (UI: ปุ่มที่ประกาศไว้ต้องกดได้จริง)
- เพิ่มปุ่ม `history-list` (แท็บประวัติ) · `open-target` 4 ปลายทาง (แท็บไฟล์) · `plannotator-patch` (การ์ด Plannotator · risk 3) · `install-tools` เข้าแถบปุ่มหลัก · `law-check` (หัวข้อกฎ 4 ข้อ)
- `entryRow`: entry `auto:false` ไม่โชว์ปุ่มติดตั้งรายแถว (แสดง "สั่งเอง") — กันถอดปลั๊กอินเก่าออกจาก config โดยไม่มีการเตือนระดับ 3
- เลิก `DRAFTS = {}` ทั้งก้อนใน `load()`/สลับ sub-tab → ค่าที่พิมพ์ค้างไม่หาย; เพิ่ม `FULL_DRAFT` ให้ textarea ฉบับเต็ม; ล้างเฉพาะช่องที่บันทึกสำเร็จจริง
- `ADVISOR.md`: ชี้ให้สลับเป็น **SNACK MODE** (เดิมชี้ BUDDHA / สลับไป Advisor เอง / ห้ามแนะนำให้สลับ) ตามข้อกำหนด 4.4
- เพิ่ม `DOCS/USECASES.md` (ทะเบียน 120 UC) + `DOCS/USECASE-STATUS.md` (ผลตรวจรายข้อ)

### Verified — 2026-10-20 (ULTRA 3 LOOPS)
- `selftest.mjs` → **62 passed** (เพิ่ม 11 เคส: merge 2 ชั้น · BOM · verifyProofs · install min · validate · ADVISOR · UI wiring · drafts · listening)
- `apitest.mjs` → **62 passed** (เพิ่ม 10 เคส: builtin-toggle on/off · lock→drift→restore · snapshot ข้าม home · need/advisory · open-target warn · พอร์ตชน)
- harness UC ภายนอก `%TEMP%\bazer\ultra\uc.mjs` → **100 ผ่าน · 0 ตก**
- ตัวเลขจริงของสัญญา: actions **22** · entries **23** · probes **11** (LOGS รุ่นก่อนเขียน 24/13 — แก้แล้วในหัวข้อ 00.00.04)

### Added — 2026-10-20 (model picker + 4 primary modes)
- **model picker**: `SERVER/models.mjs` + `GET /api/models` อ่านรายชื่อจริงจาก `opencode models` (cache 60 วินาที · `?fresh=1` ข้าม cache) — UI สร้าง `<datalist id="bazer-models">` ให้ทุกช่อง MODEL (Quick Access · ARENA · PSTACK 15 roles · preset A/B) พิมพ์เองได้เมื่อ CLI ใช้ไม่ได้
- **Shift+Tab 4 โหมด**: `cfg.builtin-off` เพิ่ม `agent.poteto-mode = { mode: subagent, hidden: true }`; `poteto-mode.md` ในเครื่องเปลี่ยนเป็น `mode: subagent`; probe `modes-present` ใช้ `exact` (visible primary ต้องมีแค่ 4) และ `agents-hidden` ครอบ `poteto-mode`

### Fixed — 2026-10-20 (ULTRA 3 LOOPS)
- **R1**: เพิ่ม exception `AGENT/03SKILLS/**/scripts/**` — สคริปต์ของ skill เป็นส่วนหนึ่งของ skill ไม่ใช่โค้ดในโฟลเดอร์ข้อมูล; ปลดล็อก apply โดยไม่ลดขอบเขต R1 ของโหมด/agent
- **markers**: เพิ่ม `<!-- BAZER-MODE: ... v1 -->` ใน BAZER/SNACK/ADVISOR — กัน probe `modes-present` ถอยหลังหลัง apply
- **agent frontmatter**: SNACK/ADVISOR เลิกใช้ alias `bash`/`task` และย้ายคอมเมนต์ออกจากค่า permission — ผ่านสคีมาและเขียนชื่อจริงตาม GUIDELINE
- **Plannotator**: ตรวจ CLI (`plannotator.exe`) นอกเหนือจากไฟล์ปลั๊กอิน; patch ที่ไม่มีไฟล์คืน `warn` แทน `ok` หลอก ๆ; UI/เอกสารชี้ทาง CLI gate (`PLANNOTATOR`)
- **Plannotator OpenCode plugin**: เพิ่ม probe `plannotator-plugin` + ขั้นติดตั้ง `opencode plugin add @plannotator/opencode` — ปิด deadlock ของ bazer-flow ที่ต้องมี `submit_plan` แต่มีแค่ CLI
- **probe**: retry cold start ของ `opencode debug agents` (built-in-only) + รายงาน stderr/spawn error
- **token**: ออก token ใหม่ทุกครั้งที่เปิด และแยกไฟล์ตาม port (`var/token-<port>`) — หลาย instance ไม่ทับกัน
- **GUIDELINE**: แก้คำอธิบาย SNACK/ADVISOR ให้ตรงกับ permission จริง

### Verified — 2026-10-20 (ULTRA 3 LOOPS)
- `selftest.mjs` → **38 passed** (จาก 36 passed / 2 failed)
- `apitest.mjs` → **52 passed** (จาก 27 passed / 7 failed / 1 exception)
- ตรวจ Plannotator บนเครื่องจริง → เจอ CLI `C:\Users\Bazer\AppData\Local\plannotator\plannotator.exe`; ไม่มีไฟล์ปลั๊กอิน (`hits:0`) จึงใช้ CLI gate
- หมายเหตุ: การเขียนทับโปรเจกต์จริงยังถูก gate บล็อก (ไม่มี `submit_plan`) — แพตช์นี้ยืนยันในสำเนาที่ `%TEMP%\bazer\ultra\repo`

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
