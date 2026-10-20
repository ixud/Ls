# REQUIREMENTS — สรุปข้อกำหนดเดียวของระบบ (DEMAND ⊕ LOGS)

> **กฎการรวม (ตามที่ผู้ใช้สั่ง 2026-10-20):** เมื่อ `DOCS/DEMAND.md` ขัดกับ `BAZERCONSOLE/LOGS.md` → **LOGS ชนะ**
> และอะไรที่ LOGS ไม่มีแต่ DEMAND มี → **ยกเข้ามาเป็นข้อกำหนด** (ไม่ทิ้ง)
> ไฟล์นี้คือผลลัพธ์ของการเทียบ — ถ้าจะเปลี่ยนพฤติกรรมของระบบ ให้แก้ที่นี่ก่อน แล้วจึงแก้โค้ด

## 1) ข้อขัดแย้งที่ตัดสินแล้ว (LOGS ชนะ)

| เรื่อง | DEMAND พูดว่า | LOGS/ของจริง | ผู้ชนะ | เหตุผล |
|---|---|---|---|---|
| ADVISOR อ่านไฟล์ | ตาราง 4.5: ADVISOR **อ่าน path ที่ระบุได้** | LOGS §8.5: อ่านได้เฉพาะพาธที่ระบุ (เท่ากัน) แต่เนื้อหาไฟล์เดิมห้ามอ่านอะไรเลย | **LOGS** | ADVISOR ต้องอ่านไฟล์ที่ผู้ใช้ชี้ได้ ไม่งั้นตอบไม่ได้ — แต่ห้ามแก้ (edit: deny) และต้องบอกให้สลับเป็น SNACK |
| ADVISOR แก้ไฟล์ | ตาราง: ❌ | LOGS: ❌ + ต้องบอกผู้ใช้ให้สลับโหมด | **LOGS** | เพิ่มข้อ "ต้องบอกให้สลับเป็น SNACK" (แก้แล้วใน 00.00.04) |
| mirror (`BAZERs-EXTENSION-*`) | DEMAND ไม่ได้สั่ง | LOGS §17: **ตัดทิ้ง** และห้ามสร้างไฟล์สำเนาโหมด | **LOGS** | subagent จริงมีให้ใช้แล้ว — mirror ทำให้ต้อง sync ตลอด |
| จำนวน primary mode | DEMAND: 4 (BUDDHA/BAZER/SNACK/ADVISOR) | LOGS: 4 เดียวกัน + ซ่อน plan/build/poteto-mode | **เท่ากัน** | ใช้ `mode: subagent + hidden: true` ไม่ลบไฟล์ |
| Plannotator กลับโหมดต้นทาง | DEMAND 4.5: เรียกจาก BUDDHA → กลับ BUDDHA อัตโนมัติ | LOGS §11: รุ่น CLI เก็บ `switchTo` ใน localStorage (global) → แพตช์ไม่ได้; ใช้ CLI gate | **LOGS** | ของจริงบนเครื่องเป็น CLI-only (ไม่มีไฟล์เว็บ) — Console รายงานตรงและมี action `plannotator-config` แทน |
| จำนวน action/entry/probe | DEMAND ไม่ระบุ | LOGS §00.00.04: actions 22 · entries 23 · probes 11 (ก่อนเวฟ A/B) | **LOGS** | ตัวเลขนับจากไฟล์จริง |
| slash command | DEMAND ไม่ได้ขอ | LOGS §13.5: ไม่มีโดยเจตนา + เกณฑ์ก่อนเพิ่ม 3 ข้อ | **LOGS** | ใช้ `Shift+Tab` / palette |
| ปลั๊กอิน gate (bazer-flow) | DEMAND ไม่ได้ขอ | LOGS 00.00.04: instrument บังคับด้วย permission + Plannotator ก่อน | **LOGS → เปลี่ยนแล้ว** | เวฟ A/B: ปลั๊กอินกลายเป็น **ของที่ Console ติดตั้ง/อัปเดตได้** (`AGENT/04PLUGIN/bazer-flow`) |

## 2) ข้อกำหนดที่ DEMAND มีแต่ LOGS ไม่มี → ยกเข้ามา (สถานะ)

| # | ข้อกำหนดจาก DEMAND | สถานะ | ที่อยู่จริง |
|---|---|---|---|
| D1 | Console ต้อง **ติดตั้ง OpenCode / Plannotator ตั้งแต่ต้น** ให้คนไม่เขียนโค้ด | ✅ มี | action `install-tools` + แท็บ **ระบบ** |
| D2 | Console เช็คว่า "ไฟล์ระบบตั้งอะไรไว้ / มีหรือไม่มี" | ✅ มี | `plan` (5 สถานะ) + `probe` + แท็บ ไฟล์ & สกิล |
| D3 | BUDDHA toggle ระหว่าง DEFAULT กับ "เหมาเข่ง" + ยืนยันความเสี่ยง | ✅ มี | `policies.json` 5 ระดับ + `policy-set` |
| D4 | SNACK/ADVISOR สลับกันได้ — บางช่วงแก้ไฟล์ได้ บางช่วงไม่ได้ | ✅ มี | `SNACK.md` (edit allow) / `ADVISOR.md` (edit deny + บอกให้สลับ) |
| D5 | BUDDHA/BAZER **สมบูรณ์ในตัวเอง** (ไม่สลับ mode กลางแชท) | ✅ มี | BUDDHA P0–P6 · BAZER B1–B5 |
| D6 | Git commit format `[วลีสั้น] <emoji>: [วลีอธิบาย]` | ✅ มี | AGENTS.md + ทุกโหมด |
| D7 | เอกสาร `.md` สองภาษา (เนื้อหาหลักไทย) | ⚠️ บางส่วน | README/FLOW/GUIDE มี EN summary; ไฟล์ใหม่ในเวฟนี้ยังไทยล้วน |
| D8 | Windows ก่อน, macOS/Linux เมื่อมีเครื่องจริง | ✅ มี | `03WINDOWS` + `04MACOS`/`05LINUX` ว่างโดยเจตนา |
| D9 | ทิ้ง GUIDELINE ไว้ทุกโฟลเดอร์ | ✅ มี | 18+ ไฟล์ |
| D10 | POTETO เรียก skill ใน PSTACK ยกเว้น ARENA | ✅ มี | `POTETO.md` + `03SKILLS/PSTACK` (53) |
| D11 | ARENA มี sub-subagent ตามสเปก | ✅ มี | `arena-runner` / `arena-judge` |
| D12 | Plannotator: feedback → วนกลับ POTETO, approve → ขั้นถัดไป | ✅ มี | BUDDHA P2/P5 |
| D13 | Console ต้อง "ล้ำ" โดยไม่ต้องติดตั้ง dependency | ✅ มี | Node built-ins ล้วน |

## 3) ข้อกำหนดใหม่ที่เพิ่มในเวฟ A/B (2026-10-20)

| # | ข้อกำหนด | ที่อยู่ |
|---|---|---|
| N1 | Console ติดตั้ง/อัปเดต `bazer-flow` ได้เอง — **detect 2 ชั้น** (config `plugins[]` + ไฟล์ในเครื่อง) และ **prune ซากรุ่นเก่าเข้า backup** | manifest `plugin.bazer-flow` + `plugin-register` + probe `plugin-registered` |
| N2 | Arena ยืดหยุ่น: runner/judge **กี่ตัวก็ได้ ซ้ำได้** และ **effort รายตัว** — เก็บเป็น `model#effort` ต่อที่นั่ง (แหล่งความจริงเดียว) | `settings.json` `arena.*` + ตัวแก้ไขในแท็บ โหมด & สิทธิ์ |
| N3 | Model dropdown เหลือเฉพาะ **OpenCode Harness / OpenCode Go Harness** | `models.mjs` (filter + `excluded`) |
| N4 | บันไดเหมาเข่งเขียนลง **ทั้ง config และ frontmatter ของ agent** | `setPolicy` + `frontmatter.mjs` |
| N5 | "อนุมัติแล้วกลับโหมดไหน" = **ค่าที่เลือกในหน้า review UI** (ปลั๊กอินเรียก `session.switchAgent`) ไม่ใช่ไฟล์ที่แพตช์ได้ — Console ตั้งได้เฉพาะ `workflow`/`planningAgents`/`runtime` · ผลอนุมัติกลับผ่าน `--require-approval --result-file` | `plannotator.mjs` + `PLANNOTATOR.md` + `plannotator-config` |
| N6 | ฟีเจอร์จาก Console เก่าที่ "ไม่ผี": update/ปลั๊กอิน/backup รายไฟล์ | `plugin-list` · `plugin-update` · `backup-list` · `backup-restore` |

## 4) ยังไม่ทำ (บันทึกไว้ ไม่ใช่ลืม)

| เรื่อง | เหตุผล |
|---|---|
| `autostart` / ติดตั้งเป็น service | ต้องเขียน registry/scheduled task — ยังไม่มี probe ที่พิสูจน์ผลได้จริง |
| `mirror-run`, `bl-*` (blacklist), `role-add/del`, `agent-save/del` ของ Console เก่า | ขัดปรัชญาใหม่ (manifest เป็นเจ้าของ) หรือไม่มีของให้จัดการแล้ว |
| cross-judge ของ Arena | `experimental.subagent_depth` = 1 → spawn จากใน Arena ไม่ได้ |
| ปุ่ม Plannotator per-agent จริง | ขึ้นกับปลั๊กอินต้นทาง (ของเราเป็น CLI-only) |
