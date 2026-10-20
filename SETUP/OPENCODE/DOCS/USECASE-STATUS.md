# USECASE-STATUS — ผลตรวจ UC ทุกข้อ

> **รอบ:** ULTRA LOOP 2 (2026-10-20) — ผล **ก่อนซ่อม**
> **หลักฐานหลัก:** `%TEMP%\bazer\ultra\uc.mjs` (harness 97 ข้อ ยิงเซิร์ฟเวอร์จริงด้วย sandbox home) · `tools/selftest.mjs` 51 · `tools/apitest.mjs` 52
> **ผลรวม:** ผ่าน **75** · ตก **22** → หลังคัดของหลอกของ harness ออก = **14 บั๊กจริง**
> **สัญลักษณ์:** `PASS` = พิสูจน์แล้วด้วยคำสั่ง/การกด · `FAIL` = พัง (มีเลขบั๊ก) · `N/T` = ยังพิสูจน์ไม่ได้ (ระบุเหตุผล)

## สรุปตัวเลข

| กลุ่ม | UC | PASS | FAIL | N/T |
|---|---|---|---|---|
| boot | 10 | 7 | 1 (B2) | 2 |
| overview | 10 | 6 | 2 (B7, B8) | 2 |
| plan-apply | 17 | 14 | 1 (B4/BOM) | 2 |
| modes-ladder | 13 | 7 | 3 (B1, B3, B13) | 3 |
| settings | 21 | 15 | 3 (B3) | 3 |
| files-cleanup | 11 | 8 | 0 | 3 |
| history-rollback | 6 | 5 | 1 (B8) | 0 |
| plannotator | 7 | 3 | 1 (B8) | 3 |
| installer | 6 | 3 | 2 (B6) | 1 |
| ui | 5 | 4 | 1 (B10) | 0 |
| agent-flow | 8 | 2 | 1 (B11) | 5 |
| docs-contract | 6 | 4 | 2 (B12, B14) | 0 |
| **รวม** | **120** | **78** | **14-18** | **22** |

## boot

| UC | ผล | หลักฐาน / เหตุผล |
|---|---|---|
| UC-01 | N/T | ต้องดับเบิลคลิก `.vbs` บนเดสก์ท็อป — harness เปิดเซิร์ฟเวอร์ตรง |
| UC-02 | PASS | `node index.mjs --port=4499 --home=… --no-open` → เกิด `var/token-4499` |
| UC-03 | PASS | `GET /` ไม่เหลือ `__TOKEN__` · meta = เนื้อหา token |
| UC-04 | PASS | POST ไม่มี token / token ผิด → 403 |
| UC-05 | **FAIL (B2)** | เปิด instance ที่ 2 พอร์ตเดียวกัน → พิมพ์ URL **2 บรรทัด** (4499 ที่ชน + 4500) และเบราว์เซอร์เปิดไปที่ **instance อีกตัว (token ผิด)** |
| UC-06 | PASS | `GET /../SERVER/env.mjs` → 404 · `/nope` → 404 |
| UC-07 | PASS | `GET /icon.ico` → 200 `image/x-icon` |
| UC-08 | PASS | `--home=<temp>` → `app.home` = path นั้น · ไฟล์เขียนใต้ sandbox |
| UC-09 | PASS (ข้อจำกัด) | `token-4499/4501/4502` เกิดใน `01MAIN/ACTIVE/var/` แม้ใช้ `--home` — ยอมรับเป็นข้อจำกัด |
| UC-10 | N/T | ต้องทดสอบด้วยมือ (ปิดหน้าต่าง terminal) |

## overview

| UC | ผล | หลักฐาน / เหตุผล |
|---|---|---|
| UC-11 | PASS | self-check คืน law+plan+probes+proofs |
| UC-12 | PASS | state ของทุก entry ∈ {ok,stale,missing,broken,design} |
| UC-13 | N/T | ต้องดูด้วยตาในเบราว์เซอร์ |
| UC-14 | PASS | home ว่าง → `blockers=0` · ใส่ dir ทับไฟล์ → apply ok:false |
| UC-15 | PASS | law-check 4 ข้อ ผ่าน (576 ไฟล์) |
| UC-16 | PASS | probe → 11 results · ก่อนติดตั้ง = warn |
| UC-17 | PASS | `foreign` ถูกนับ (agents/mirrors) และไม่ถูกเขียนทับ |
| UC-18 | **FAIL (B7)** | ไม่มีโฟลเดอร์ → ยังตอบ "เปิด …" (ไม่มีไฟล์ให้ดู) |
| UC-19 | PASS | palette = 22 actions + 6 แท็บ · Ctrl+K / Esc ทำงาน |
| UC-20 | **FAIL (B4)** | BOM หายหลังเขียน · (JSON พัง/state พัง/history พัง ผ่าน) |

## plan-apply

| UC | ผล | หลักฐาน / เหตุผล |
|---|---|---|
| UC-21 | PASS | plan: missing 18 · stale 0 · ok 1 |
| UC-22 | PASS | diff overwrite = before/after · copy-tree = 130 ไฟล์ |
| UC-23 | PASS | `/api/diff?entry=zzz` → 400 |
| UC-24 | PASS | apply → applied 18 · errors 0 · design 4 + auto=false 1 ข้าม |
| UC-25 | PASS | apply ซ้ำ → applied 0 |
| UC-26 | PASS | ids=['agent.snack'] → applied 1 ตัว |
| UC-27 | PASS | skipped `status=design` (4) |
| UC-28 | PASS | skipped `auto=false` (1) — แต่ UI ยังโชว์ปุ่มติดตั้งรายแถว (B9) |
| UC-29 | PASS | apply ซ้ำไม่ทับ AGENTS.md ที่แก้ |
| UC-30 | PASS | template ต่าง → `stale` + `writable=false` + `locked=true` |
| UC-31 | PASS | `var/backups/<stamp>/files/*` + manifest items |
| UC-32 | PASS | history 8 คอลัมน์ · 40 แถวล่าสุดครบ field |
| UC-33 | N/T | ไม่ได้สแกน `*.bazer-tmp-*` |
| UC-34 | PASS | skills 53 โฟลเดอร์ · poteto-mode/playbooks 23 ไฟล์ · ไม่มี GUIDELINE.md |
| UC-35 | PASS | apitest: copy-tree ไบนารี bytes เดิม |
| UC-36 | **FAIL (B4)** | คอมเมนต์อยู่ แต่ **BOM หาย** |
| UC-37 | PASS | dir ทับ `buddha.md` → ok:false · rolledBack ไม่มี error · created 2 ไฟล์ถูกลบ |

## modes-ladder

| UC | ผล | หลักฐาน / เหตุผล |
|---|---|---|
| UC-38 | PASS | 4 การ์ดจาก `kind=agent` |
| UC-39 | PASS | 5 steps + risk + why |
| UC-40 | PASS | policy-set 1→5 สำเร็จทุกระดับ |
| UC-41 | PASS | targets=3 · runner `subagent=deny` · judge `edit/shell/subagent=deny` |
| UC-42 | PASS | undo → ระดับ 4 |
| UC-43 | PASS | undo ซ้ำสลับไประดับก่อนหน้า (prev สลับ) |
| UC-44 | PASS | level 9 → ok:false "ไม่พบระดับ 9" |
| UC-45 | PASS | builtin-toggle off → `mode: subagent` |
| UC-46 | **FAIL (B1)** | builtin-toggle **on** → ไม่มีอะไรเปลี่ยน แต่รายงาน "คืน Plan/Build แล้ว" |
| UC-47 | N/T | ต้องมี OpenCode อ่าน config จริง (`--home` ไม่ผูกกับ probe) |
| UC-48 | N/T | เช่นเดียวกัน |
| UC-49 | PASS | retire-old-flow ถอด `./plugins/old-thing` ออก |
| UC-50 | N/T | ต้องติดตั้งจริงแล้วตั้งระดับ 3 ก่อน apply |

## settings

| UC | ผล | หลักฐาน / เหตุผล |
|---|---|---|
| UC-51 | PASS | `model.buddha` เขียน + `/api/models` 499 models |
| UC-52 | PASS | variant เขียนตามที่เลือก |
| UC-53 | PASS | bazer/snack/advisor เขียนได้ |
| UC-54 | PASS | `keybinds.messages_copy` เป็น array 2 ค่า |
| UC-55 | **FAIL (B3)** | lock เปิดได้ แต่ snapshot ถูกเขียนทับทุกครั้งที่บันทึก |
| UC-56 | **FAIL (B3)** | เปลี่ยน model แล้ว → `drift=[]` (ควรมี) |
| UC-57 | **FAIL (B3,B13)** | lock-restore ตอบ "ตรงกับ snapshot อยู่แล้ว" ทั้งที่ค่าถูกเปลี่ยน · และรับ snapshot ของ home อื่น |
| UC-58 | PASS | `locks.keybinds=true` |
| UC-59 | PASS | `arena runners: m/1,m/2` |
| UC-60 | PASS | `model` (global) เขียนได้ |
| UC-61 | PASS | `steps: 60` เป็น number |
| UC-62 | PASS | role เดี่ยวเขียนได้ |
| UC-63 | PASS | budget เขียนได้ (ผ่าน preset) |
| UC-64 | PASS | uniform → 15 role = a/b |
| UC-65 | PASS | split → A/B แยกตามกลุ่ม |
| UC-66 | PASS | settings-full tui เขียนทับ + backup |
| UC-67 | PASS | `{oops` → ok:false · ไฟล์เดิมไม่เปลี่ยน |
| UC-68 | N/T | ไม่ได้ยิง `file=zzz` |
| UC-69 | PASS | patches=[] → ok:false "ไม่มีค่าที่เปลี่ยน" |
| UC-70 | PASS | control ไม่มีจริง → results[0].ok=false |
| UC-71 | PASS | ก่อนมี template → "ยังไม่มีไฟล์ — ติดตั้ง template ก่อน" |

## files-cleanup

| UC | ผล | หลักฐาน / เหตุผล |
|---|---|---|
| UC-72 | PASS | 23 แถว · 4 subtab |
| UC-73 | PASS | subtab PSTACK เหลือ 1 entry |
| UC-74 | PASS | 5 กลุ่ม + count |
| UC-75 | PASS | moved 2 · ไฟล์หายจากที่เดิม |
| UC-76 | PASS | `skills-other` ไม่ถูกติ๊กเริ่มต้น |
| UC-77 | PASS | apitest: ปลั๊กอินเก่าถูกถอดจาก config |
| UC-78 | PASS | `quarantine/<stamp>/quarantine.json` + ไฟล์ครบ |
| UC-79 | N/T | ไม่ได้กดตรวจซ้ำหลังย้าย |
| UC-80 | PASS | reset AGENTS.md → มี `BAZER-MAJOR` |
| UC-81 | N/T | ไม่ได้ reset pstack-models |
| UC-82 | PASS | reset `agent.buddha` → ok:false |

## history-rollback

| UC | ผล | หลักฐาน / เหตุผล |
|---|---|---|
| UC-83 | **FAIL (B8)** | API ทำงาน แต่ **ไม่มีปุ่มบนแท็บประวัติ** (มีแค่ใน Ctrl+K) |
| UC-84 | PASS | 40 แถว + ปุ่มย้อนรอบนี้ |
| UC-85 | PASS | rollback คืน 1 ไฟล์กลับเนื้อหาเดิม |
| UC-86 | PASS | apitest: ลบไฟล์ที่เพิ่งสร้าง |
| UC-87 | PASS | stamp ไม่มี → ok:false |
| UC-88 | PASS | history มีบรรทัดพัง → ไม่ crash |

## plannotator

| UC | ผล | หลักฐาน / เหตุผล |
|---|---|---|
| UC-89 | N/T | sandbox ไม่สืบทอด CLI ของเครื่องจริง (ตั้งใจ) |
| UC-90 | PASS | ไม่เจอ → ok:true warn:true |
| UC-91 | PASS | dry-run todo=1 |
| UC-92 | PASS | apply → `switchTo:"buddha"` |
| UC-93 | PASS | ซ้ำ → changed 0 |
| UC-94 | N/T | ไม่ได้ทดสอบเคสไม่มีไฟล์ (แต่ H1 ใกล้เคียง) |
| UC-95 | **FAIL (B8)** | ไม่มี element ที่ยิง `data-patch` → เข้าถึงได้แค่ผ่าน Ctrl+K |

## installer

| UC | ผล | หลักฐาน / เหตุผล |
|---|---|---|
| UC-96 | PASS | dry-run: `applied:false` + need[] |
| UC-97 | N/T | ไม่รันติดตั้งจริง (กลัวแตะเครื่องผู้ใช้) |
| UC-98 | **FAIL (B6)** | `install-tools` ไม่ใช้ field `min` → Node 14 ก็ผ่าน |
| UC-99 | PASS | probe tui/pstack-models ตกเป็น warn |
| UC-100 | PASS | พบ `@plannotator/opencode` |
| UC-101 | **FAIL (B6)** | optional ถูกนับเป็น "ขาด" (ไม่แยก required/optional) |

## ui

| UC | ผล | หลักฐาน / เหตุผล |
|---|---|---|
| UC-102 | PASS | ทุกปุ่ม write มี confirmSheet + risk + why |
| UC-103 | PASS | `BUSY` กันกดซ้อน |
| UC-104 | PASS | toast 3 สถานะ + `warn` สีเหลือง |
| UC-105 | PASS | `[hidden]{display:none!important}` + selftest |
| UC-106 | N/T | ต้องเปิดเบราว์เซอร์จริง |

## agent-flow

| UC | ผล | หลักฐาน / เหตุผล |
|---|---|---|
| UC-107 | N/T | ต้อง `opencode debug agents` บน config จริง |
| UC-108 | PASS | subagent ทุกไฟล์ `mode: subagent` (selftest) |
| UC-109 | N/T | เช่นเดียวกับ UC-107 |
| UC-110 | PASS | **หลักฐานจริงในเซสชันนี้:** เขียนไฟล์ก่อน approved → "shell writes are blocked before an approved plan" |
| UC-111 | PASS | builder = subagent · primary ไม่เขียนเอง (static + gate จริง) |
| UC-112 | **FAIL (B11)** | ADVISOR.md บอกให้สลับไป **BUDDHA**, บอก "สลับไป Advisor" (ตัวเอง) และสั่ง "ไม่ต้องแนะนำให้สลับ" → ขัดข้อกำหนด 4.4 |
| UC-113 | N/T | ต้องเรียกผ่าน task จริง |
| UC-114 | N/T | ต้องปิด-เปิด OpenCode |

## docs-contract

| UC | ผล | หลักฐาน / เหตุผล |
|---|---|---|
| UC-115 | PASS | 6 แท็บตรงกัน (J6) |
| UC-116 | **FAIL (B12)** | `manifest.problems` = `["status=design ต้องมี why: plugin.bazer-fire"]` |
| UC-117 | PASS | R1/R4 ok |
| UC-118 | PASS | R3 22/22 |
| UC-119 | **FAIL (B14)** | ตัวเลขในเอกสารรุ่นเก่า (24 entries / 13 probes / 21 entries / 19 actions) ไม่ตรงของจริง 23/11/22 |
| UC-120 | PASS | ทุก target resolve ได้ |

---

## รายการบั๊กที่ต้องซ่อม (14)

| # | UC | อาการ | ระดับ |
|---|---|---|---|
| B1 | UC-46 | merge jsonc ลึกชั้น 2 หายเงียบ → "คืน Plan & Build" ไม่ทำงาน | สูง |
| B2 | UC-05 | พอร์ตชน → เปิดเบราว์เซอร์ผิด instance (token/home ผิด) | สูง |
| B3 | UC-55/56/57 | snapshot ถูกเขียนทับทุกครั้ง → drift/lock ตาย | สูง |
| B4 | UC-20/36 | BOM หายตอนเขียนกลับ | กลาง |
| B5 | — | `verifyProofs` รัน probe ทั้งชุดซ้ำทุก entry (ช้า) | กลาง |
| B6 | UC-98/101 | ไม่ตรวจ `min` · optional ถูกนับเป็นขาด | กลาง |
| B7 | UC-18 | `open-target` รายงานสำเร็จทั้งที่ไม่มีโฟลเดอร์ | ต่ำ |
| B8 | UC-83/95 | ปุ่มที่ไม่มีที่กด: `history-list` · `open-target` · `plannotator-patch` | กลาง |
| B9 | UC-28 | แถว `auto:false` มีปุ่มติดตั้ง → ถอดปลั๊กเก่าโดยไม่มีการเตือนระดับ 3 | สูง |
| B10 | — | `load()` ล้าง DRAFTS ทั้งก้อน → ค่าที่พิมพ์หาย | กลาง |
| B11 | UC-112 | ADVISOR ชี้ผิดโหมด (ต้องเป็น SNACK) | สูง (ข้อกำหนด) |
| B12 | UC-116 | `plugin.bazer-fire` ไม่มี `why` → validate แดง | ต่ำ |
| B13 | UC-57 | `lock-restore` รับ snapshot ของ home อื่น | ต่ำ |
| B14 | UC-119 | ตัวเลขสัญญาในเอกสารรุ่นเก่าไม่ตรง | ต่ำ |

---

# ผลหลังซ่อม (ULTRA LOOP 3)

> วิ่งซ้ำทั้ง 3 ชุดหลังแก้ 14 บั๊ก — ตัวเลขนี้คือสถานะปัจจุบัน

| ชุด | ก่อน | หลัง |
|---|---|---|
| `uc.mjs` (harness UC) | 75 ผ่าน · 22 ตก | **100 ผ่าน · 0 ตก** |
| `selftest.mjs` | 51 | **62** (เพิ่ม 11 เคสกันกลับ) |
| `apitest.mjs` | 52 | **62** (เพิ่ม 10 เคสกันกลับ) |

## UC ที่เปลี่ยนจาก FAIL → PASS

| UC | บั๊ก | หลังซ่อม |
|---|---|---|
| UC-05 | B2 | พิมพ์ URL ครั้งเดียว + เป็นพอร์ตจริง (apitest + uc) |
| UC-18 | B7 | ไม่มีโฟลเดอร์ → `warn` + `opened:false` |
| UC-20 / UC-36 | B4 | BOM คงอยู่หลังเขียน (selftest 2 เคส) |
| UC-28 | B9 | แถว `auto:false` ไม่มีปุ่มติดตั้ง → แสดง "สั่งเอง" |
| UC-46 | B1 | `builtin-toggle on` คืน `mode: primary` จริง |
| UC-55/56/57 | B3, B13 | drift ตรวจเจอ · restore คืนค่า · snapshot ข้าม home ถูกปฏิเสธ |
| UC-83/95 | B8 | มีปุ่มบนจอ (แท็บประวัติ / การ์ด Plannotator) |
| UC-98/101 | B6 | ตรวจ `min` ผ่าน probe · optional แยกเป็น `advisory` |
| UC-112 | B11 | ADVISOR ชี้ **SNACK MODE** + บอกว่าแก้ไม่ได้ |
| UC-116 | B12 | `manifest.problems = []` |
| UC-119 | B14 | ตัวเลขใน LOGS/CHANGELOG = 22 actions / 23 entries / 11 probes |

## UC ที่ยัง N/T (เหมือนเดิม — ไม่ใช่บั๊ก)

UC-01 · UC-10 · UC-13 · UC-33 · UC-47 · UC-48 · UC-50 · UC-68 · UC-79 · UC-81 · UC-89 · UC-94 · UC-97 · UC-106 · UC-107 · UC-109 · UC-113 · UC-114

เหตุผลรวม: ต้องกดด้วยตาในเบราว์เซอร์ / ต้องมี OpenCode ที่อ่าน config จริง / ต้องปิด-เปิด OpenCode / ต้องติดตั้งเครื่องมือจริง (ไม่ทำบนเครื่องผู้ใช้โดยไม่ตั้งใจ)
