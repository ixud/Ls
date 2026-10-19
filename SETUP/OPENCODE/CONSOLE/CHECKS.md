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


## รอบ 7 — แท็บ "ตั้งค่า OpenCode" (tui-settings) · base Candidate B + graft A/C (รันจริงรอบนี้ · Console v1.4.0)

เครื่อง: Windows · Node v24.16.0 · repo `C:\BCS\00.02 LLM Slavery` HEAD `919a8bf` · โฟลเดอร์งาน: `SETUP/OPENCODE/CONSOLE/`


### ของที่เพิ่ม/แก้

- สร้างใหม่: `tui-settings/` (`shared/` · `src/{patches,validate,mirror,form-model,save,api}.mjs` · `client/renderer.mjs` · `schema/*.json` · `tools/{gen-opencode-facts,gen-model,build-client,verify}.mjs` · `tests/{run,e2e}.mjs` · `README.md`)

- แก้: `console.mjs` (import `createSettingsApi` · spread action `tui-*` · `gatherState` เพิ่ม `s.tui` · `runVerify` ต่อท้าย 4 ข้อ `TUI · …`) · `console.html` (nav + titles + dispatch + `vTui`/`mountTui` + inline renderer + CSS + handler `tui-save`/`tui-reset`/`tui-import`/`tui-refresh` + `after`)

- แตะเพียง `console.mjs` · `console.html` · `tui-settings/**` — ไม่แตะ `bundle/`


### ผลตรวจ (คำสั่งจริง)

| ตรวจ | คำสั่ง | ผล |

|---|---|---|

| syntax backend | `node --check console.mjs` | exit 0 |

| syntax ทุกโมดูล | `node --check` ทุก `.mjs` ใน `tui-settings/` (ไม่รวม `.cache`) | 13/13 ผ่าน |

| parse สคริปต์ในหน้า | ดึงระหว่าง `<script>…</script>` แล้ว `new Function(code)` | PARSE OK (119,929 chars) |

| inline renderer ตรงต้นทาง | `node tui-settings/tools/build-client.mjs --check` | `OK console.html tui renderer in sync` |

| allowlist ตรงสคีมา | `node tui-settings/tools/gen-model.mjs --check --tui-schema=<grounding>/tui.schema.json` | `OK tui keybind allowlist in sync (184 names)` |

| unit + integration | `node tui-settings/tests/run.mjs` | **84 passed, 0 failed** |

| e2e (คัดลอก console.mjs + USERPROFILE ปลอม) | `node tui-settings/tests/e2e.mjs` | all end-to-end checks passed (22 checks) |

| ครบในคำสั่งเดียว | `node tui-settings/tools/verify.mjs` | everything verified |


### sandbox round-trip (ตามวิธี CHECKS รอบ 6 — `%TEMP%\bazer\verify-tui` + `USERPROFILE` ปลอม)

สคริปต์: `%TEMP%\bazer\verify-tui-run.mjs` (คัดลอกแอปไป sandbox · spawn `console.mjs --port=4321` · ยิง HTTP ด้วย token)

| ตรวจ | ผลจริง |

|---|---|

| POST `tui-form` | **19 groups · 242 keybinds · 299 fields** |

| POST `tui-save` patches `[{keybinds/app.exit,set,ctrl+alt+q},{diffs/wrap,set,none}]` | applied 2 · backup 2 ไฟล์ · wrote 2 |

| `cli.json` | `keybinds = {"leader":"ctrl+x","app.exit":"ctrl+alt+q"}` → **flat** ไม่ใช่ `{app:{exit}}` (`keybinds.app = undefined`) |

| `tui.json` | `keybinds.app_exit = "ctrl+alt+q"` · `attention.enabled=true` **คงอยู่** · `prompt.max_height=12` **คงอยู่** |

| keybind ชื่อนอก allowlist ใน `tui.json` | **0** |

| patch ผิดสคีมา (`theme/mode = neon`) | ปฏิเสธ (`ค่าไม่ผ่านสคีมา (1 จุด)`) · `cli.json 1cb3276e6d5b2226 → 1cb3276e6d5b2226` **BYTE-IDENTICAL** · `tui.json 7d591ef476a945e5 → 7d591ef476a945e5` **BYTE-IDENTICAL** |

| `/api/verify` | `ok cli.json อ่านได้` · `ok tui.json mirror ตรง` · `warn คีย์นอก catalog (hand.written.key — คงไว้)` · `ok ค่า keybind ถูกต้อง (2 ค่า)` · `ok defaults 242 ตัว` |


### graft ที่ใส่เข้า base B

| จาก | ทำจริงที่ไหน |

|---|---|

| A — three-way reset | renderer มี mode `ปิด (none)` / `ปิด (false)` / `คืนค่า default` (unset) แยกกัน · ปุ่ม `×` = unset (`clearDraft` → op `unset`) |

| C — deep merge | `save.mjs` `repairMirror` เปลี่ยน `{...prev,...tui}` เป็น `deepMerge(prev, tuiRest)` · เทสต์ prove `attention.enabled`/`prompt.max_height` รอด |

| C — validate-before-write | มีอยู่แล้ว (`save`) · เพิ่มเทสต์ byte-identical ทั้ง 2 ไฟล์ |

| B เอง — allowlist | `cliToTui(cli, translate, allowlist)` กรองชื่อ · allowlist จาก `tui.schema.json` (`gen-model.mjs`) · เทสต์ prove 0 ชื่อนอก allowlist |


### deviation จาก brief (บอกตรง)

- `schema/tui.schema.json` (1.15 MB) **ไม่ commit** ตามที่ brief เปิดทาง — commit เฉพาะ `schema/tui-keybind-names.json` (184 ชื่อ) ที่ derive มา · `gen-model.mjs` จึงต้องรับ `--tui-schema=<path>` ตอน regenerate (ไม่ใช่ zero-arg) และ `verify.mjs` จะข้ามข้อนี้พร้อม note ถ้าไม่มี schema — ระบุใน `tui-settings/README.md` แล้ว

- `tests/e2e.mjs` ตัวเดิมของ Candidate B สตาร์ท `src/server.mjs` ของ candidate (ไม่มีในโปรเจกต์นี้) — เขียนใหม่ให้สตาร์ท **`console.mjs` จริง** ใน sandbox แทน จึงตรงกับวิธีตรวจของโปรเจกต์

- ตัววาด `client/renderer.mjs` คงเป็น ES module (เทสต์ import ได้) แล้ว inline เข้า `console.html` ด้วย `tools/build-client.mjs` (ตัด import/export + ครอบ IIFE กันชื่อ `esc` ชน) — brief สั่ง "inline"; การมี source เดียว + build check กัน drift สองชุด


## รอบ 6 — BAZER FLOW v2 (Buddha one-session + Plan Mode builder)

วันที่: 18 ต.ค. 2026 · Console v1.5.0 · งานนี้แก้ `bundle/agents/buddha.md` → marker v2, เพิ่ม `bazer-flow` plugin + `builder` agent + Console action

### Loop 1 — static / logic

| ตรวจ | ผล |
|---|---|
| `node --check console.mjs` · `mode-lock.mjs` · `flow-check.mjs` · `bundle/plugins/bazer-flow/logic.mjs` | ผ่านทุกไฟล์ |
| parse `<script>` ใน `console.html` ด้วย `new Function` | ผ่าน (1 script · 122,013 chars) |
| `node flow-check.mjs` | PASS 18 · FAIL 0 · WARN 1 (ยังไม่ติดตั้งในเครื่อง) |
| แก้ bug ที่เจอ | regex `Plan approved!foo` เคย false-positive → เติม `(?=\s|$)` · เทสต์ badge เรียก `agentFromMessages` ทั้งที่ fixture ไม่มี agent → เปลี่ยนเป็น `phaseFor('plan', ...)` |

### Loop 2 — sandbox install (`BAZER_CONSOLE_HOME=%TEMP%\bazer-console-v2`)

| ตรวจ | ผล |
|---|---|
| `flow-apply` | ok — plugin · builder · register · AGENTS gate · mirror |
| flowkit | pluginFile/registered/builder/mode all/gateMarker = true ครบ |
| apply ซ้ำ | ไม่เพิ่ม registration และไม่เพิ่ม gate marker (idempotent) |
| `flow-toggle off` | ถอด registration + `builder.md.disabled` |
| `flow-toggle on` | คืน builder + registration |
| `/api/verify` | `BAZER FLOW v2 · kernel` ok · `builder (mode all)` ok · `AGENTS gate` ok |
| `/api/state.flowkit` | populated |

### Loop 3 — adversarial (pure gate)

| เคส | ผล |
|---|---|
| `plan` เขียน `C:\BCS\x.ts` ก่อนอนุมัติ | deny |
| `plan` เขียน `%TEMP%\bazer\x.ts` ก่อนอนุมัติ | allow |
| `task(builder)` ก่อนอนุมัติ | deny |
| `task(general)` ก่อนอนุมัติ (plan) | deny · (buddha) allow |
| `plan` เขียนเองหลังอนุมัติ | deny (ต้องใช้ builder) |
| `buddha` เขียนเองหลังอนุมัติ | allow |
| bash `Set-Content` ก่อนอนุมัติ | deny · ถ้าอยู่ใน temp allow |
| agent `build`/`builder`/ไม่รู้จัก | pass-through |
| badge: plan 1 approval → BUILD · buddha 1 → ARENA · buddha 2 → BUILD · user prompt ใหม่ → reset | ผ่าน |
| hook `throw` ไม่ abort tool call | **ยังไม่ยืนยันบน 2.0.30** — ต้องทดสอบ live; ถ้าไม่ abort จะรายงานว่า gate ไม่ทำงาน |

### หมายเหตุ

- **แก้หลังรายงาน error `Plugin must export a default definition...`**: ปลั๊กอินเดิมเขียนเป็น V1 hook map — เขียนใหม่เป็น V2 API จริง (`Plugin.define` + `ctx.agent.transform` + `ctx.tool.hook` + `ctx.permission.hook` + `ctx.session.hook`) และเปลี่ยน action `task` → `subagent` ตาม agent จริงของ 2.0.30
- **Live gate proof**: `opencode run --agent buddha --auto` สั่งเขียน `blocked.txt` → `Write ... failed · bazer-flow: no approved plan...` และไฟล์ไม่ถูกสร้าง
- **Live agent proof**: `/api/agent` แสดง `plan`: `edit * deny`, `subagent * deny → explore/builder allow`; `builder`: `mode=all`, `submit_plan deny`
- badge TUI ใช้ `prompt.footer.status` (slot จริงของ 2.0.30) อ่านไฟล์ state ที่ server เขียน เพราะ TUI ไม่เห็น message parts
- เพิ่มภายหลังตามคำสั่งผู้ใช้: **แผน GATE 1 ต้องเขียนด้วยกระบวนการ Poteto Mode** (โหลด `BAZERs-EXTENSION-Poteto` ในเซสชันเดิม ไม่ใช่สลับ agent) — แก้ `buddha.md` + reminder ใน plugin + UI/FLOW + static check; เป็นคำสั่งระดับ prompt ไม่ใช่ hard gate
- ติดตั้งจริงในเครื่องนี้ผ่าน Console API แล้ว (ถ้าแอปเปิดอยู่) — ต้องปิด-เปิด OpenCode เพื่อโหลด plugin/agent ใหม่


## รอบ 7 — bug scan & fix 3 loops (หลังแก้ V2 plugin API)

วันที่: 18 ต.ค. 2026 · Console v1.5.0 · เป้าหมาย: ปิด bug ที่ทำให้ plugin failed + ตรวจ gate จริง

### Loop 1 — static / contract

| ตรวจ | ผล |
|---|---|
| `node --check` (`console.mjs`, `index.ts` copied to .mjs, `flow-check.mjs`, `logic.mjs`) | ผ่าน |
| parse `<script>` ใน `console.html` | ผ่าน |
| `node flow-check.mjs` | PASS 23 · FAIL 0 |
| เจอ/แก้ 1 | `verify` + `flowCard` ขึ้นเขียว `builder` แม้ `builder.md` ถูกปิด → ต้อง require `builder && mode all` |
| เจอ/แก้ 2 | V2 ใช้ action `subagent` ไม่ใช่ `task` → เพิ่ม rule + normalize tool name `subagent`→`task` ใน hook |
| เจอ/แก้ 3 | หลัง plugin hot-reload approval ใน memory หาย → อ่าน state file กลับมา (`approvalFor`) |
| เจอ/แก้ 4 | `writePhase` เขียนไฟล์ทุก model call → throttle ด้วย key `agent\|approved\|count` |
| เจอ/แก้ 5 | ลบ import ที่ไม่ใช้ (`PLANNING_AGENTS` ใน flow-check) |

### Loop 2 — sandbox + verify จริง

| ตรวจ | ผล |
|---|---|
| sandbox `flow-apply` → apply ซ้ำ → off → on | PASS 20 |
| verify หลังปิด builder | `warn builder — ปิดอยู่` (ไม่หลอกว่า ok) |
| verify kernel ใหม่ | เรียก `opencode plugin list` และยืนยัน `bazer.flow` โหลดจริง |
| `opencode plugin list` | `bazer.flow local .../bazer-flow/index.ts` (ไม่มีตัวซ้ำหลังลบ backup ใน `plugins/`) |
| log | ไม่มี `LoadError` / `failed to load` |

### Loop 3 — live adversarial

| เคส | ผล |
|---|---|
| `opencode run --agent buddha --auto` สั่ง `write blocked.txt` | `Write failed · bazer-flow: no approved plan...` · ไฟล์ไม่เกิด |
| `opencode run --agent plan --auto` สั่ง `write p.txt` | `Write failed · bazer-flow: no approved plan...` · ไฟล์ไม่เกิด |
| `task(builder)` ก่อนอนุมัติ | เดิม CLI ไม่มี tool `task` — รอบนี้พิสูจน์เส้นทางจริงแล้ว: Plan เรียก tool `subagent` (ชื่อ V2) หลังอนุมัติ และ builder ทำงาน |
| **E2E จริง (CLI): Plan → submit_plan → approve → builder** | `submit_plan` เปิด review, POST `/api/approve` สำเร็จ, state เป็น `approved:true,count:1`, Plan เรียก `subagent` → builder สร้าง `real.txt` = `ok` (2 bytes) |
| หลังอนุมัติ: Plan เขียนเอง | ถูกบล็อก `approved Plan Mode must delegate writes to the builder subagent` · `direct.txt` ไม่เกิด |
| state file | `{"agent":"buddha","approved":false,...}` / `{"agent":"plan","approved":true,"count":1}` ถูกสร้าง/อัปเดต |
| `/api/agent` | `plan`: `edit * deny`, `subagent * deny → explore/builder allow` · `builder`: `mode=all`, `submit_plan/subagent deny` |

**สรุป:** ปิด bug จาก error `Plugin must export a default definition...` แล้ว และพิสูจน์ด้วยการรันจริงว่า gate บล็อกการเขียนไฟล์ก่อนอนุมัติ

- `workflow` ยังเป็น `plan-agent` ตามเดิม (ไม่แตะ mode-lock R1)
- `builder` เป็น `mode: all` ตามคำขอของรอบนั้น (เห็นใน Main Agents) — **อัปเดต 19 ต.ค. 2026:** เปลี่ยนเป็น `mode: subagent` แล้ว ไม่โชว์ใน Main Agents (ดูรอบ 9)


## รอบ 8 — default keybind + shortcut (bug scan & fix 3 loops)

วันที่: 18 ต.ค. 2026 · Console v1.5.0 · เป้าหมาย: clone แล้ว "ติดตั้งเสร็จสรรพ" ได้ค่า default ครบ และ shortcut ไม่พังเมื่อย้ายเครื่อง

### Loop 1 — static / sandbox action

| ตรวจ | ผล |
|---|---|
| `node --check console.mjs` | ผ่าน |
| sandbox `tui-defaults` | PASS 11 (สร้าง tui.json, เขียน `messages_copy`, รันซ้ำไม่ทับ) |
| sandbox `shortcut-apply` | สร้าง `.lnk` ชี้ `BAZER CONSOLE - WINDOW.vbs` ถูกต้อง |
| verify | `keybind copy latest` ok · `shortcut BAZER CONSOLE` ok |

### Loop 2 — edge cases

| เคส | ผล |
|---|---|
| tui.json มีค่าผู้ใช้แก้เอง (`ctrl+x`) | ไม่ทับ · ค่าอื่นคงอยู่ |
| tui.json พัง (JSON ไม่ถูกต้อง) | **ไม่เขียนทับ** — คืน error `tui.json parse ไม่ได้` |
| `.lnk` target/working dir | ชี้ launcher + `SETUP/OPENCODE` ถูกต้อง |
| `*.lnk` ถูก gitignore | ใช่ — เครื่องอื่นสร้างใหม่ตอน setup |
| portable launcher หลังย้ายโฟลเดอร์ | clone-sim: คัดลอก `.vbs` + `CONSOLE\BAZER Console.vbs` ไป temp แล้วรัน → marker ถูกสร้าง (`ok`) |

### Loop 3 — setup integration

| ตรวจ | ผล |
|---|---|
| `setup-preview` | มีขั้น `tui-defaults` และ `shortcut` |
| `setup-apply` (steps: dirs, tui-defaults, shortcut) | PASS 7 — tui.json ถูกสร้าง, keybind ถูกเขียน, `.lnk` ถูกสร้าง |
| verify หลัง setup | keybind ok · shortcut ok |
| ไฟล์ที่ commit | `BAZER CONSOLE - WINDOW.vbs` (portable) + root `.gitignore`; `.lnk` ไม่ขึ้น git |

**สรุป:** clone → ติดตั้งเสร็จสรรพ → ได้ keybind `ctrl+alt+m, ctrl+alt+o` และ shortcut `BAZER CONSOLE - WINDOW` โดยไม่ฝัง path ของเครื่องใดเครื่องหนึ่ง




## รอบ 9 — builder เป็น subagent + ปุ่มอนุมัติ Plannotator ชี้ builder

วันที่: 19 ต.ค. 2026 · Console v1.5.0 · โจทย์: (1) เปลี่ยน `builder` จาก Primary → Sub Agent + ซ่อมไฟล์ที่ได้รับผลกระทบ (2) ปุ่ม approve ของ Plannotator (ฝังใน Plan Mode) เปลี่ยนจาก `build` → subagent `builder` (label "Builder")

ผลคัดเลือกจาก Arena (3 candidates + cross-judge): base = C3 "single source of truth" (คะแนน 24) + graft จาก C2 (patch ทุก copy + post-write verify/rollback/backup ไม่ซ้ำชื่อ) และ C1 (UTF-8 round-trip guard + exit code 2)

### Loop 1 — patch mechanics (ทดสอบกับสำเนาเท่านั้น)

| ตรวจ | ผล |
|---|---|
| `patch-plannotator.mjs --dry-run` ใส่ไฟล์จริง | `applied=8` (2 ไฟล์ × 4 จุด) · ไม่เขียน · hash live ไม่ขยับ · ไม่มี `.bak` เกิด |
| apply บนสำเนา | `applied=4` sha256 = `715a572f…f32726` (ตรงกับที่ Arena พิสูจน์) |
| รันซ้ำ (idempotent) | `applied=0 skipped=4` · ไม่มี backup เพิ่ม |
| fixture patch ครึ่ง (2/4) | รันแล้วจบครบ 4 — sha256 เท่ากับไฟล์ที่แพตช์เต็มเป๊ะ |
| fixture UTF-8 พัง | abort `UTF-8 round-trip ไม่ตรง` · ไม่เขียนไฟล์ |
| syntax A/B | สกัด `<script type="module">` ก่อน/หลัง → `node --check` exit 0 ทั้งคู่ (+69 chars = 4 จุด) |

### Loop 2 — apply จริง + กลไก mode

| ตรวจ | ผล |
|---|---|
| patch ไฟล์จริง | 2 ไฟล์ (0.28.22 live + 0.28.8 ใน `packages/`) · `.bak-20261019-093126/093127` อยู่ข้างไฟล์ |
| counts บนไฟล์จริง | `{switchTo:"builder"}`=1 · `{switchTo:"build"}`=0 · key ใหม่=1 · key เก่า=0 · menu Builder=1 · wrapper=1 |
| `opencode debug agent` (ผ่าน `debug agents`) | `builder: name=builder mode=subagent` |
| กลไก override ของปลั๊กอิน | ทดลอง 2 รอบ: ตั้ง `draft.mode='all'` และ `'primary'` → runtime ยังเป็น `subagent` (frontmatter ชนะ) · probe เขียนไฟล์ใน transform ไม่เกิด → callback ไม่ถูกเรียกในพาธนี้ |
| ทางแก้ | ลบบรรทัด `draft.mode` ออกทั้ง 2 ไฟล์ (bundle + installed, hash `55a83bb2…` เท่ากัน) — mode เหลือแหล่งเดียวคือ `agents/builder.md` |
| `task(builder)` หลังเปลี่ยน mode | PASS — spawn subagent `builder` งาน read-only: รายงาน `mode: subagent`, 34 บรรทัด, `submit_plan: deny` มีจริง |

### Loop 3 — ตัวตรวจ + Console + เอกสาร

| ตรวจ | ผล |
|---|---|
| `node flow-check.mjs` | PASS 26 · FAIL 0 · WARN 0 — เทสต์ใหม่: single-source ของ builder (bundle + installed) และตัวเฝ้า Plannotator (2/2 ไฟล์ชี้ builder) |
| `node mode-lock.mjs` | FAIL 1 = R4 (`model.json` variant = `low` จากการกด `Ctrl+T` เมื่อ 06:47 — มีมาก่อนงานนี้ แก้ผ่าน Console เท่านั้น) · ที่เหลือ PASS |
| `node --check console.mjs` | exit 0 |
| parse `<script>` ใน `console.html` | inline 1 บล็อก (122,681 chars) exit 0 |
| Console ใหม่ | แถว `builder (subagent)` + แถว `Plannotator: ปุ่มอนุมัติ` ใน flowCard · `AGENT_META.builder.sub=true` · ย้าย `builder.md` จาก `MODE_ORDER` → `SUB_ORDER` |
| เอกสาร | `FLOW.md` (Plan Mode + ตัวตรวจ §5) · `bundle/README-OPENCODE.md:22` · `CHECKS.md` (รอบนี้) · `mode-lock.mjs` R11 ปรับข้อความให้ตรงสถานะปัจจุบัน |

### ข้อควรระวัง

- ปุ่มอนุมัติตัวเดียวกันถูกใช้ทุก planning agent (`plan`, `buddha`, `arena`, `snack`, `poteto-mode`) — ตั้งเป้า `builder` แล้วจึงเหมาะกับ Plan Mode; ใน Buddha ถ้าโฮสต์รองรับ `switchAgent` session จะถูกสลับเป็น `builder` (ขัดกติกา "Buddha ไม่สลับ agent") → เลือก **Disabled** ในเมนู "After approval" ก่อนใช้ Buddha (บันทึกไว้ใน `GUIDE.md` แล้ว)

### สิ่งที่ยังพิสูจน์ไม่ได้ในรอบนี้

- กดปุ่ม `Approve → Builder` จริงในเบราว์เซอร์ (ต้องมีคนกด) — ตรวจผลด้วย `Select-String -LiteralPath "$env:USERPROFILE\.local\share\opencode\log\opencode.log" -Pattern "not available|does not expose|Could not switch"` (ไม่เจอ = สลับสำเร็จ)
- การสลับ agent ในเซสชันจริง (`ctx.session.switchAgent` ของโฮสต์) — ยืนยันได้เฉพาะตอนกดอนุมัติ
- transform ของปลั๊กอินในเซสชันจริง (พิสูจน์แล้วว่าไม่ถูกเรียกในพาธ `debug agents`; ถ้าถูกเรียกในเซสชัน ผลลัพธ์ mode ยังเป็น subagent เพราะไม่มีบรรทัด override แล้ว)
- Console ต้องปิด-เปิดแอปถึงเห็นแถวใหม่ (แอปอ่านโค้ดตอนเปิด)


## รอบ 10 — ผูก patch ปุ่มอนุมัติเข้ากับการติดตั้ง/อัพเดตของ Console

วันที่: 19 ต.ค. 2026 · Console v1.5.0 · โจทย์: clone ใหม่ต้องได้ค่าตั้งนี้จากการติดตั้ง และ "ทั้งสองปุ่ม" (การ์ด BAZER FLOW v2 ที่ขึ้นทั้งแท็บ Buddha และแท็บ Plannotator) ต้อง apply ให้

| จุดที่ผูก | ทำอะไร |
|---|---|
| action `plannotator-patch` | เรียก `applyAll()` จาก `patch-plannotator.mjs` (import ตรง ไม่ spawn) — idempotent, dry-run ได้, ไม่ throw เมื่อไม่มี Plannotator |
| `flow-apply` (ปุ่มการ์ด ทั้ง 2 แท็บ) | แพตช์ต่อท้ายหลัง mirror (เฉพาะตอน enable) — log ขึ้น `plannotator patch` |
| `update-apply` (อัพเดตทั้งหมด) | แพตช์ต่อท้าย `extra` — เห็นในข้อความสรุปเมื่อมีการแพตช์จริง |
| `sync-all` (ซิงค์ทั้งหมด) | ได้ผ่านการเรียก `update-apply` + การซ่อม flow |
| `setup-apply` (ติดตั้งเสร็จสรรพ) | ขั้นใหม่ `plannotator-patch` (checkbox ในพรีวิว, `will` ตามสถานะจริง) |
| flowCard | ปุ่ม "แพตช์ปุ่มอนุมัติ → builder" + แถวสถานะ `Plannotator: ปุ่มอนุมัติ` |

### หลักฐาน (รันจริงทั้งหมด)

| ตรวจ | ผล |
|---|---|
| `node --check` (`console.mjs`, `patch-plannotator.mjs`) | exit 0 ทั้งคู่ |
| API test (`applyAll`, sandbox HOME) | apply 4/4 + sha `715a572f…` ตรงเป้า · รันซ้ำ applied=0 · เครื่องใหม่ targets=0 ไม่ error · dry-run ไม่เขียนไฟล์ |
| e2e ผ่าน HTTP (สำเนา Console ใน %TEMP% + `BAZER_CONSOLE_HOME` sandbox + port 4312) | state ok · `setup-preview` มีขั้นใหม่ (will=true) · ปุ่ม dry-run ไม่เขียน · ปุ่มจริง applied=4 sha ตรง + `.bak` 1 ไฟล์ · รันซ้ำ applied=0 · `update-apply` ขึ้น "plannotator patch 4" · `flow-apply` log มี plannotator patch · `setup-apply` ขั้นเดียวแพตช์สำเร็จ |
| บั๊กที่เจอจากการทดสอบ | `applyAll()` เคยใช้ `os.homedir()` แทน `HOME` ของ Console → ใน sandbox แพตช์ผิดเครื่อง; แก้เป็น `{ home: HOME }` แล้ว e2e ผ่าน |
| ไฟล์จริงบนเครื่อง | ไม่ถูกแตะระหว่าง e2e (ทดสอบในสำเนาเท่านั้น) · `node flow-check.mjs` ยัง PASS 26 · WARN 0 |
| ปิด flow (`flow-apply { enable:false }`) | **ไม่แตะ html** (sha ยังเป็นไฟล์ต้นฉบับ · backups = 0) · เปิดกลับ (`enable:true`) แพตช์ให้ทันที (sha `715a572f…` · backups = 1) — หลักฐาน `S11-disable-evidence.txt` |

### หมายเหตุการใช้งาน

- ปุ่มใหม่จะทำงานหลัง **ปิด-เปิด BAZER Console** (แอปโหลดโค้ดตอนเปิด) — ถ้ายังไม่รีสตาร์ทแล้วกด จะขึ้นข้อความ "แอปที่เปิดอยู่ยังเป็นโค้ดเก่า" (มีอยู่เดิมใน `act()`)
- เครื่องใหม่ที่ยังไม่เคยเปิด OpenCode: cache ของ Plannotator ยังไม่มี → ขั้นนี้จะ `will=false` และจะแพตช์ให้อัตโนมัติเมื่อกดอัพเดต/ซิงค์หลังเปิด OpenCode ครั้งแรก
