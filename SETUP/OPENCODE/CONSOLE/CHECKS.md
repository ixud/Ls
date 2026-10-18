# CHECKS — บันทึกผลตรวจ (bug scan 3 รอบ · รอบ 4/5 งานเอกสาร)

วันที่: 18 ต.ค. 2026 · เครื่อง: Windows / OpenCode V2 · โฟลเดอร์: `SETUP/OPENCODE/CONSOLE` · ครอบถึง commit **889fad3** (Console v1.3.0) + รอบ 4/5 ของงาน BAZER FLOW v1
วิธีรัน: ทดสอบใน sandbox (`%TEMP%\bazer-console-test`) โดยตั้ง `USERPROFILE` ปลอม เพื่อไม่แตะ config จริงของเครื่อง
คำสั่งหลัก: `node --check console.mjs` · เรียก API ของแอปที่รันใน sandbox (`/api/state`, `/api/verify`, `/api/action`)
กติกา: ทุกครั้งที่รันชุดตรวจ ให้ `git rev-parse --short HEAD` แล้วเขียน hash ลงบรรทัดวันที่ — ถ้า hash ไม่ตรงกับ HEAD ปัจจุบัน ให้ถือว่าผลในไฟล์นี้ยังไม่ครอบโค้ดรุ่นใหม่


## รอบ 1 — static

| ตรวจ | ผล |
|---|---|
| `node --check console.mjs` | ผ่าน (exit 0) |
| สคริปต์ใน `console.html` parse ได้ (`new Function`) | ผ่าน (81,652 chars) |
| marker `BAZER-FLOW` ใน `bundle/agents/buddha.md` | พบครบคู่ (บรรทัด 11 และ 32) |
| `git status` | ไม่มีไฟล์แปลกปลอม ถูก gitignore ครบ (`console.runtime.json`, `backups/`, `history.tsv`, `console.config.json`) |


## รอบ 2 — เครื่องใหม่ (fresh install)

คำสั่ง: `setup-preview` → `setup-apply` (ทุกขั้นที่ `will`) → `update-check` → `verify`

| ตรวจ | ผล |
|---|---|
| setup-preview | 11 ขั้นตอน พร้อมติดตั้งทั้งหมด |
| setup-apply | สำเร็จ (skills +63 · agents +8 · commands +1 · AGENTS.md · pstack-models.md · bazer-fire · serve-restricted · launch +5 · mirror) |
| update-check หลังติดตั้ง | ต่าง 0 · ใหม่ 0 · เหมือน 69 |
| templates | `AGENTS.md=present` · `pstack-models.md=present` |
| `state.flow` | `{bundle:"1", installed:"1", ok:true}` |
| mirror | ตรงครบ 6/6 |
| verify | `planningAgents` ok · mirror ok · `BAZER FLOW v1` ok (fail 1 รายการ = Server 4096 ซึ่งไม่มีใน sandbox) |


## รอบ 3 — เครื่องเก่า (git pull แล้วค่า planningAgents ยังเก่า)

จำลองโดยแก้ `planningAgents` ใน sandbox ให้เหลือ `["plan","bazer"]` แล้วรันชุดซ่อม

| ตรวจ | ผล |
|---|---|
| update-check (ก่อนซ่อม) | `configOk=false` · `missing=buddha,arena,snack,poteto-mode` (มองเห็นทันที ไม่ต้องเดา) |
| `refresh-config` | สำเร็จ |
| update-check (หลังซ่อม) | `configOk=true` · `plan, buddha, arena, snack, poteto-mode` |
| `mirror-agents` | สำเร็จ — marker ใน mirror ของ Buddha มี 2 บรรทัด (เปิด 1 + ปิด 1) ไม่ซ้ำ |
| `sync-all` | สำเร็จ — เรียก update → refresh-config → mirror แล้วรัน verify ให้ |
| verify หลังซ่อม | `planningAgents` ok · mirror ok · `BAZER FLOW v1` ok |


## รอบ 4 — งานเอกสาร BAZER FLOW v1 (static · รันจริงรอบนี้)

เครื่อง: Windows · Node v24.16.0 · repo `C:\BCS\00.02 LLM Slavery` branch `air` HEAD `889fad3` · สคริปต์ตรวจอยู่ในโฟลเดอร์งานของ arena (`%TEMP%\bazer\buddha-flow-gap\docs-verify\`)

| ตรวจ | คำสั่ง | ผล |
|---|---|---|
| บล็อก "ก่อน" ของ GUIDE ทั้ง 6 ช่วง ปรากฏครั้งเดียวในไฟล์จริง | `node "%TEMP%\bazer\buddha-flow-gap\docs-verify\check-anchors.cjs"` | 5/6 ตรงครั้งเดียว · อีก 1 (ท้ายช่วง R1 = `EOF` + ปิดเฟนซ์) ปรากฏ 8 ครั้ง จึงไม่ใช้เป็น anchor — แทนที่ **ทั้งช่วง 482–521** ในครั้งเดียวแทน |
| ชื่อปุ่ม/ป้ายที่เอกสารอ้างมีจริงใน UI | `node "%TEMP%\bazer\buddha-flow-gap\docs-verify\check-labels.cjs"` | 24/24 พบ (`⚡ ตรวจความครบ` · `ติดตั้งเสร็จสรรพ - ทั้งหมด` · `ตรวจว่ามีอะไรใหม่` · `อัพเดตทั้งหมด` · `🔄 ซิงค์ทั้งหมด` · `ไฟล์ส่วนตัวจาก template` · `รีเซ็ตจาก template` · `อัพเดต mirror ทั้งหมด` · `ย้ายค่าไป arena runners` · `BAZER FLOW v` · `ข้าม arena` …) |
| path ที่เอกสารอ้างมีจริง | `Test-Path` ทุกพาธที่อ้างในเอกสารที่แก้ | ผ่านทุกพาธ · และ `SETUP\OPENCODE\CONSOLE\bundle\..\FLOW.md` = **False** → ยืนยันว่าจาก `CONSOLE/bundle/` ต้องเป็น `../../FLOW.md` ไม่ใช่ `../FLOW.md` |
| code fence สมดุลทุกไฟล์ที่แก้ | `node "%TEMP%\bazer\buddha-flow-gap\docs-verify\check-fences.cjs"` | 5/5 balanced |
| `console.config.json` มีคีย์ `modelSets` จริง | `Select-String -Path "SETUP\OPENCODE\CONSOLE\console.config.json" -Pattern modelSets` | พบ 2 ชุด · โค้ดอ่านที่ `console.mjs:1302` (เขียน) และ `console.mjs:1828` (state) |


## รอบ 5 — ข้ออ้างของเอกสารกับไฟล์จริง (ยังไม่ได้รัน)

- ตัวตรวจเอกสาร ↔ ตัวจริง ยังไม่มีในแอป: ถ้า GUIDE/README/FLOW ถูกแก้ทีหลังจนประโยคที่อ้างถึงโหมด/ปุ่มหายไป ระบบจะไม่เตือน
- ยังต้องรันบนเครื่องจริง: เปิดแอปใหม่ → กด "ตรวจความครบ" → ข้อ template ส่วนตัว ต้องเป็น `ok`/`info` และข้อไฟล์ launch ต้องเป็น `ok` หลังกดติดตั้ง (รอบนี้ยังไม่ได้รันบนเครื่องจริง)


## รอบ 6 — เครื่องจริง + clone ใหม่ + เดินโฟลว์ Buddha จริง (รันจริงรอบนี้ · Console v1.4.0)

เครื่อง: Windows · Node v24.16.0 · repo `C:\BCS\00.02 LLM Slavery` branch `air` HEAD `c90c358` (Console v1.4.0)

| ตรวจ | คำสั่ง | ผล |
|---|---|---|
| ไวยากรณ์หลัง merge แพตช์ 3 ชุด (base B + graft A + graft C) | `node --check console.mjs` | exit 0 · สคริปต์ใน `console.html` parse ผ่าน |
| sandbox ฉากปกติ / ไฟล์หาย / สคริปต์ล็อกขาดคู่ | รันแอปใน `%TEMP%\bazer\verify-mine2` ด้วย `USERPROFILE` ปลอม แล้ว `GET /api/verify` | ไฟล์ launch ครบ = `ok ไฟล์ launch ครบและอยู่ในเทมเพลต 5 ไฟล์ · เทมเพลต 5 ไฟล์` · ไฟล์หาย = `warn` ระบุชื่อไฟล์ · สคริปต์ล็อกขาด `.jsonc` = `warn` · **ไม่มี** คำเตือน "เขียนผิดไฟล์" เมื่อไฟล์ยังไม่มี (แก้ false positive รอบนี้) |
| ตัวตรวจ template เทียบเนื้อหา | ลบหัวข้อ `# AGENTS — Plannotator Gate` ออกจากสำเนา AGENTS.md ใน sandbox | `warn template ใน bundle ใหม่กว่าไฟล์ในเครื่อง 1 ตัว · AGENTS.md ยังขาด: AGENTS - Plannotator Gate` · `state.templates` = `status:stale, missing:[...], tplHash:51371db1` |
| ขอบเขต allowlist (โฟลเดอร์ข้างเคียง) | วาง `pwn.txt` ใน `.config\opencode-studio\` แล้ว `POST {id:'restore-backup',set:'zz-boundary'}` | `กู้คืนแล้ว 0 รายการ (ข้าม 1 นอก allowlist)` · เนื้อหาไฟล์ยังเป็น `PWNED-ORIGINAL` (ก่อนแก้: กู้คืนได้ = เขียนทับโฟลเดอร์ข้างเคียงได้) |
| `restart-server` / `autostart` เมื่อ `launchDir` ว่าง | POST ทั้งสอง action ใน sandbox | ไม่ throw แล้ว — ข้อความบอกโฟลเดอร์จริง `...\opencode-launch` และชี้ปุ่มถัดไป |
| **เครื่องใหม่ clone จริง** (Step 03) | `git clone <repo> %TEMP%\bazer\clone-test\repo` → รันแอปจากสำเนา (USERPROFILE ปลอม) → `setup-preview` → `setup-apply` (11 ขั้น) → `update-check` → `state` + `verify` | ติดตั้ง +63 skills · mirror **6/6 synced** · `flow {bundle:1,installed:1,ok:true}` · planningAgents ครบ · template `same` ทั้งคู่ · launch 5/5 · `update-check` = ต่าง 0 / ใหม่ 0 / เหมือน 69 · verify `ok 10 / warn 2 / fail 1` (fail = server 4096 ไม่ได้เปิด) |
| **เครื่องจริง** หลังปิด-เปิดแอปใหม่ (v1.4.0 · pid 37748) | เปิดผ่าน `BAZER Console.vbs` → `GET /api/verify` | `ok 8 / warn 3 / fail 1` · มี `info config root เป็นลิงก์ (junction)` ใหม่ · `paths.configReal` = `...\opencode-profiles\default` · template = `custom` ทั้งคู่ (ไม่ขึ้น "ยังไม่มี" แล้ว) · launch warn บอกโฟลเดอร์จริง `C:\Users\Bazer\opencode-launch` |
| **เดินโฟลว์ Buddha จริง 1 เคส** (ในเซสชันเดียวกัน) | ด่าน 1 `submit_plan` → อนุมัติ → Arena 3 candidates + กรรมการ 3 → ด่าน 2 | ครบ 7 เฟส · คะแนน candidate A 55 / B 64 / C 44 → base = B + graft จาก A และ C → ด่าน 2 อนุมัติ → สร้าง + commit `c90c358` |

**บั๊กที่โฟลว์จริงเปิดออก (แก้แล้วรอบนี้):** หลังอนุมัติด่าน 1 เครื่องมือ `submit_plan` **หายไปจากเซสชัน** (ออกจาก plan mode) → สเปคเดิมที่บอกให้ยื่นด่าน 2 ด้วย `submit_plan` ใช้ไม่ได้จริง · แก้ที่ `bundle/agents/buddha.md` + `FLOW.md` §3 ให้ยื่นด่าน 2 ด้วย Plannotator CLI (`plannotator annotate <plan.md> --gate --json --require-approval --result-file <result.json>`) เมื่อไม่มีปุ่มในแชท และย้ำว่าห้ามข้ามด่าน · อัปเดตไฟล์ที่ติดตั้ง + mirror ผ่าน `update-apply` แล้ว (ตรวจแล้วว่าทั้งสองไฟล์มีบรรทัดใหม่)

**หมายเหตุบนเครื่องจริงที่ยังไม่ปิด:** `warn effort ไม่ตรงกัน — config: default · model.json: max` (OpenCode เขียน `~/.local/state/opencode/model.json` เองตอนใช้งาน ไม่เกี่ยวกับงานนี้ — กดซิงค์ได้ที่แท็บ "ล็อก & โมเดล") และไฟล์ launch ยังไม่ถูกติดตั้งบนเครื่องนี้ (กด "ติดตั้งเสร็จสรรพ" เมื่อต้องการ)


## บั๊กที่เจอระหว่างสแกนและแก้แล้ว

| อาการ | ต้นเหตุ | แก้ |
|---|---|---|
| `git pull` แล้วกด "ติดตั้งเสร็จสรรพ" โหมดเดิมไม่อัพเดต | `setup-quick` ไม่ส่ง `overwrite` และ `setup-apply` ข้ามไฟล์ที่มีอยู่ | ใช้เส้นทาง `update-apply` (มีอยู่แล้ว) + เพิ่มปุ่ม **ซิงค์ทั้งหมด** ให้เรียกเส้นทางที่ถูกอัตโนมัติ |
| `planningAgents` เก่าค้าง — ผู้ใช้ต้องไปกดแท็บ Plannotator เอง | ไม่มีตัวเขียนกลับ + hardcode รายชื่อ 4 จุด | รวมเป็น `PLAN_AGENTS` ตัวเดียว + action `refresh-config` + `update-apply` เรียกให้เองเมื่อพบว่าไม่ตรง + verify เตือน |
| อัพเดตแล้ว mirror ยังเก่า (ต้องกดเองอีกปุ่ม) | `update-apply` ไม่รัน mirror | `update-apply` รัน `mirror-agents` ต่อท้ายอัตโนมัติ |
| `launch` ถูกข้ามถ้า `launchDir` ว่าง | เงื่อนไขเดิมบังคับต้องตั้ง `launchDir` | ใช้ค่าเริ่มต้น `~/opencode-launch` เมื่อโฟลเดอร์นั้นมีอยู่ |
| ไม่มีที่ให้เห็นว่า flow ของ Buddha ตรงกับ bundle ไหม | flow เป็นคำบรรยายกระจาย | marker `BAZER-FLOW: v1` + ตัวตรวจใน verify + badge ในแท็บ Buddha |
| mirror มี marker ซ้ำ 2 บรรทัด | generator เติม marker เพิ่มจากที่มีใน body | ถอดการเติมออก — ใช้ marker ที่อยู่ในเนื้อหาโดยตรง |


### คำอ้างเดิมในไฟล์นี้ที่ไม่ตรงกับโค้ด (แก้บันทึก)

ตารางข้างบนเขียนว่า `planningAgents` ถูก "รวมเป็น `PLAN_AGENTS` ตัวเดียว" — ตรวจซ้ำที่ HEAD `889fad3` ด้วยคำสั่งนี้

```powershell
git show 889fad3:SETUP/OPENCODE/CONSOLE/console.mjs | Select-String -Pattern "planningAgents: \['plan'","plan, buddha, arena"
```

ผลจริง: โค้ด **ยัง hardcode รายชื่อซ้ำอีก 2 ที่** — `console.mjs:1156` (ข้อความตอบกลับ) และ `console.mjs:1480` (`planningAgents: ['plan','buddha','arena','snack','poteto-mode']`) — นอกเหนือจากต้นทางเดียว `PLAN_AGENTS` ที่บรรทัด 73 คำอ้าง "ตัวเดียว" จึงยังไม่จริง ต้องรอการแก้โค้ดในรอบนี้


## ยังค้าง (ต้องทำต่อ)

- **ปิดแล้ว (18 ต.ค. 2026):** ที่มาของ `%USERPROFILE%\.config\opencode-profiles\default\**` — `%USERPROFILE%\.config\opencode` เป็น **junction** ชี้ไปที่โฟลเดอร์นั้น (reparse tag `0xa0000003` · สร้าง 16/10/2026 13:38 · ไฟล์ `AGENTS.md` ทั้งสองทางมี File ID เดียวกัน) — เป็นโฟลเดอร์เดียวกันจริง ไม่ใช่สำเนา จึงไม่มีอะไรต้องควบคุมเพิ่ม
- **ปิดแล้ว (18 ต.ค. 2026):** ทดสอบโฟลว์จริง 1 เคสใน Buddha Mode — ครบ 7 เฟส (ด่าน 1 → อนุมัติ → Arena ในเซสชัน 3 candidates + กรรมการ 3 → ด่าน 2 → อนุมัติ → สร้าง) ดู "รอบ 6" · พร้อมแก้สเปคจุดที่ใช้ไม่ได้จริง (ด่าน 2 ผ่าน Plannotator CLI เมื่อไม่มี `submit_plan`)
- **ปิดแล้ว (18 ต.ค. 2026):** รันบนเครื่องจริงหลังปิด-เปิดแอปใหม่ (v1.4.0) + ทดสอบ clone ใหม่จริง (Step 03) — ดู "รอบ 6"
- ยังค้าง: งานยังไม่ขึ้น remote — branch `air` นำหน้า `fire/air` (ยังไม่ push) เครื่องอื่นจึงยังไม่ได้ของ (ดู `FLOW.md` §4)
- ยังค้าง: ตัวตรวจ "เอกสาร ↔ ตัวจริง" ยังไม่มีในแอป (ถ้า GUIDE/README/FLOW ถูกแก้ทีหลังจนประโยคที่อ้างถึงโหมด/ปุ่มหายไป ระบบจะไม่เตือน) — รอบนี้ใช้สคริปต์ใน `%TEMP%\bazer\buddha-flow-gap\docs-verify\` ตรวจแทน ถ้าต้องการให้ตรวจได้ทุกเครื่อง ควรย้ายสคริปต์ชุดนี้เข้า repo แล้วเรียกจากปุ่มในแท็บภาพรวม
