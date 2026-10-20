# GUIDELINE — กฎแม่ของ MAJOR

> ไฟล์นี้ตอบคำถามเดียว: **"ถ้าฉันเป็น LLM ที่เข้ามาเพิ่มของใน MAJOR ฉันต้องไม่ทำอะไร"**
> อ่านก่อนเขียนไฟล์ทุกครั้ง · กฎ 4 ข้อนี้เป็น *คำสัญญา* ไม่ใช่คำแนะนำ

## กฎ 4 ข้อ (R1–R4)

| # | กฎ | ผิดเมื่อไหร่ | ตัวบังคับ |
|---|---|---|---|
| **R1** | ต้นทางเป็น **ข้อมูล** — `AGENT/**` และ `CONFIGTEMPLATEFORAPPLY/**` มีแต่ไฟล์ข้อมูล (`.md`, `.json`, `.template`) ห้ามมีตรรกะ ห้ามมีสคริปต์ | มีไฟล์ `.mjs/.js/.ps1/.cmd/.vbs` โผล่ในโฟลเดอร์ข้อมูล | `SERVER/../law.mjs` R1 |
| **R2** | **Console ห้าม hardcode ที่อยู่ปลายทาง** — ชื่อไฟล์/โฟลเดอร์ปลายทางต้องมาจาก `PASSIVE/01MANIFEST` เท่านั้น (โหมดเก่าเจ๊งเพราะ `planningAgents` ถูกเขียนซ้ำ 3 ที่) | เจอ path ปลายทางเป็นข้อความใน `ACTIVE/**` | `law.mjs` R2 |
| **R3** | **ปุ่มทุกปุ่มเกิดจาก `actions.json`** — UI ห้ามมีปุ่มที่เขียนมือ และ server ต้องมี handler ตรงกับ id ทุกตัว | `actions.json` มี id ที่ไม่มี handler (หรือกลับกัน) | `law.mjs` R3 |
| **R4** | **ไม่มี `.bak` ข้างไฟล์จริง** — สำรองทุกอย่างไปที่ `ACTIVE/var/backups/<เวลา>/` พร้อม `manifest.json` | เจอ `*.bak*` ใน MAJOR (ยกเว้น `ACTIVE/var/`) | `law.mjs` R4 |

**R5 (บทลงโทษเมื่อ R1–R4 พัง):** งานที่ทำจะไม่ถูกติดตั้ง — `ตรวจกฎ` เป็นขั้นแรกของ `ติดตั้งทั้งหมด` เสมอ ถ้าแดง = หยุด

## วิธีใช้กฎนี้ (สำหรับ LLM รุ่นถัดไป)

1. อ่าน `GUIDELINE.md` ของโฟลเดอร์ที่คุณกำลังจะแก้ **ก่อน** เปิดไฟล์อื่น
2. ถ้าสิ่งที่คุณจะเพิ่มต้องทำผิดกฎข้อไหน → **นั่นคือสัญญาณว่างานนั้นต้องย้ายที่** ไม่ใช่ยกเว้นกฎ
   - อยากเพิ่ม script ให้ console? → `BAZERCONSOLE/01MAIN/ACTIVE/SERVER/`
   - อยากเพิ่มข้อมูลของโหมด? → `AGENT/01PRIMARY/` + เพิ่ม entry ใน `MANIFEST/manifest.json`
   - อยากเพิ่มปุ่ม? → `MANIFEST/actions.json` (+ handler ใน SERVER) — **ห้ามแตะ HTML**
3. แก้เสร็จ ต้องรัน `ตรวจกฎ` + `ตรวจความครบ` ให้ผ่าน แล้วบันทึกลง `MANIFEST/CHANGELOG.md`

## ตัวอย่าง "ถ้าเพิ่มแบบนี้ อีก 3 เดือนพังแน่"

| อย่าทำ | เพราะ |
|---|---|
| เขียน path `C:\Users\...\.config\opencode\agents\buddha.md` ลงใน SERVER | R2 — เครื่องอื่น path ต่างกัน, ย้าย config ไม่ได้ |
| เพิ่ม `<button id="btn-fix">` ใน UI | R3 — ปุ่มจะไม่ผูกกับ manifest; ลบ handler แล้วปุ่มค้าง |
| ก็อปโหมดเก่าเป็น `BAZERs-EXTENSION-*` | ดีไซน์ใหม่เรียกโหมดผ่าน subagent จริง ไม่ต้องมีสำเนา (mirror = ต้นเหตุความพังของเก่า) |
| วาง `.bak-20261019` ข้างไฟล์ที่แก้ | R4 — เกลื่อน repo และไม่มีใครกล้าลบ |
| ใส่ `permission: { skill: allow, lsp: allow }` | คีย์นี้ไม่มีจริงใน v2.0.32 → บรรทัดตายที่ไม่มีใครรู้ (ดู `01PRIMARY/GUIDELINE.md`) |

## Guideline ย่อย (อ่านตามโฟลเดอร์)

| โฟลเดอร์ | ไฟล์ |
|---|---|
| `AGENT/` | `AGENT/GUIDELINE.md` |
| `AGENT/01PRIMARY/` | วิธีเขียนไฟล์โหมด + สัญญา permission |
| `AGENT/02SUBAGENT/` | subagent / sub-subagent + สัญญารายงาน |
| `AGENT/03SKILLS/` | PSTACK vs BAZER + การ adapt เป็น OpenCode |
| `AGENT/04PLUGIN/` | plugin = โค้ดที่ต้องมีเทสต์ |
| `BAZERCONSOLE/` | `01MAIN/GUIDELINE.md` · `PASSIVE/GUIDELINE.md` · `ACTIVE/GUIDELINE.md` · `CONFIGTEMPLATEFORAPPLY/GUIDELINE.md` |

## เจ้าของความจริง (single source)

| เรื่อง | ไฟล์เจ้าของ |
|---|---|
| ไฟล์อะไรไปอยู่ที่ไหน | `BAZERCONSOLE/01MAIN/PASSIVE/01MANIFEST/manifest.json` |
| ลำดับความแรงของ "เหมาเข่ง" | `.../01MANIFEST/policies.json` |
| ปุ่มทั้งหมด + ระดับความเสี่ยง | `.../01MANIFEST/actions.json` |
| ข้อพิสูจน์กับของจริง | `.../01MANIFEST/probes.json` |
| กฎ R1–R4 แบบเครื่องอ่านได้ | `.../01MANIFEST/law.json` |
| ประวัติการแก้ | `.../01MANIFEST/CHANGELOG.md` |
