# 00.00.03 - Tuesday 20th October 2026 - Missing Features · 5-Round Bug Scan

> ต่อจาก `00.00.02` — ทบทวนแชทว่ามีอะไร "ตัดสินใจแล้วแต่ยังไม่มี" → เติมให้ครบ แล้วสแกน 5 รอบ
> **ข้อจำกัดของรอบนี้:** environment ไม่มีเครื่องมือรันคำสั่ง (shell) → เป็น static scan + เพิ่มเทสต์ไว้รอ; การยืนยันจริงทำผ่านปุ่มใน Console

## 1) ฟีเจอร์ที่ตัดสินใจไว้แล้วแต่ยังไม่มี → เติมแล้ว

| # | สิ่งที่เคยตัดสินใจ | สถานะก่อนหน้า | ที่ทำในรอบนี้ |
|---|---|---|---|
| M1 | **Plannotator: อนุมัติแล้วกลับโหมดต้นทาง (BUDDHA/BAZER)** — "ให้ BAZERCONSOLE ไปแก้ Plannotator ในไฟล์ระบบ" | `design` ไม่มีโค้ด | เพิ่ม `SERVER/plannotator.mjs`: หาไฟล์ → แพตช์ token `switchTo:"build|builder|buddha|bazer"` → backup/history → ตรวจซ้ำ; action `plannotator-patch` + การ์ดในหน้าโหมด |
| M2 | **"override and lock"** — ล็อกค่า model/effort ไม่ให้ session ใหม่หลุด | มี snapshot + banner แต่กดคืนไม่ได้ | `restoreLockedModels()` + action `lock-restore` + ปุ่มในแบนเนอร์ drift |
| M3 | **เอกสารสองภาษา** | ไทยล้วน | เพิ่ม EN summary ใน README / FLOW / GUIDE (เนื้อหาหลักยังไทย) |
| M4 | **ปุ่มติดตั้งหาไม่เจอ (ปุ่มทุกใบเขียนว่า "ทำ")** | ปุ่ม generic | `cta` ทุก action + แถบปุ่มหลัก 3 ปุ่มบนหน้าแรก + `selftest` บังคับ `cta` |

**ข้อจำกัดที่ยังเหลือ (บอกตรง):** ปุ่มอนุมัติของ Plannotator เป็นปุ่มเดียว (global) → แพตช์ได้ว่า "กลับโหมดไหน" แต่สลับตามผู้เรียกอัตโนมัติไม่ได้จนกว่าปลั๊กอินจะรองรับ per-agent; `PLANNOTATOR` ต้องรายงานถ้าปุ่มชี้ผิดโหมด

## 2) Bug scan 5 รอบ (static)

### รอบ 1 — contract: actions ↔ handlers ↔ UI ↔ probes
- 22 action / 22 handler ตรงกัน
- UI อ้างเฉพาะ id ที่ประกาศ (`data-act` + `act('…')`)
- เพิ่มเทสต์: ทุก action ต้องมี `cta`; ไฟล์ `02SUBAGENT/*` ต้อง `mode: subagent`

### รอบ 2 — apply / plan / settings
- **แก้:** `${VAR}` ไม่ถูกประกาศใน `env.mjs` → `open-target` (backups) โยน error
- **แก้:** `install-tools` ตอบ "ยังขาด" ทั้งที่ `apply=true` เมื่อเครื่องมือที่ขาดไม่มี `why`
- **แก้:** `allControls()` ถูกเขียนซ้ำ 2 ที่ (index/apply) → รวมเป็นตัวเดียว (export จาก apply)
- **แก้:** `stamp()` ละเอียดถึงวินาที → งานสองรอบในวินาทีเดียวแชร์ backup dir; เพิ่ม milliseconds
- **แก้:** `quarantine/<stamp>` ชนกันได้ → เติม `-2`, `-3` ถ้ามีอยู่แล้ว

### รอบ 3 — UI
- ตรวจ template/ตัวแปรใน `renderOverview` / `renderModes` / `renderSettings` / `renderQuick` ว่าวงเล็บ/backtick ครบ
- ปุ่ม Plannotator ใช้ `data-patch` + confirm risk 3
- ปุ่ม `lock-restore` แสดงเฉพาะเมื่อมี drift
- ลดปุ่มซ้ำ: `wired` set รวม action ที่มีปุ่มเฉพาะที่แล้ว (settings-full, cleanup, reset, patch, lock, probe)

### รอบ 4 — docs / law / contract
- `law.json` R1–R4 ไม่ขัดกับไฟล์ใหม่ (plannotator.mjs อยู่ใน ACTIVE)
- เพิ่ม EN summary 3 ไฟล์
- อัพเดต `04PLANNOTATOR/targets.json` + GUIDELINE (mechanism/limitation)
- อัพเดต manifest entry `patch.plannotator` ให้ชี้ว่าการ์ดคือทางทำจริง

### รอบ 5 — use case walkthrough
| UC | สถานะ (static) | หมายเหตุ |
|---|---|---|
| fresh install → apply → probe | ผ่านตามตรรกะ | ต้องกดจริง |
| แก้ไฟล์ต้นทาง → stale → apply | ผ่าน | hash เทียบ |
| บันได 1→5→undo | ผ่าน | permission ชุดเต็มแทนที่ |
| Quick Access (partial) | ผ่าน | jsonc-set เฉพาะ key |
| Full settings (overwrite/invalid) | ผ่าน | parse ก่อนเขียน + read-back |
| full JSON พัง | ผ่าน | reject ไม่แตะไฟล์ |
| cleanup dry-run/apply | ผ่าน | quarantine + manifest |
| reset template | ผ่าน | backup + history |
| rollback | ผ่าน | คืนทั้งรอบ |
| apply ล้มกลางทาง | ผ่าน | rollback อัตโนมัติ |
| builtin toggle / retire flow | ผ่าน | config only |
| install-tools dry-run | ผ่าน | ไม่รันคำสั่ง |
| open-target | ผ่าน | **แก้ `${VAR}`** |
| icon route | ผ่าน | เลือก `BAZERCONSOLE.ico` ก่อน |
| plannotator patch (fixture) | ผ่านตามเทสต์ที่เพิ่ม | ไม่มีไฟล์จริงบนเครื่อง |
| lock restore | ผ่านตามตรรกะ | ต้องมี snapshot |
| probe ก่อนติดตั้ง | ผ่าน | warn ไม่ใช่ fail |
| token / traversal / 404 | ผ่าน | apitest เดิม |
| BUDDHA/BAZER เรียก builder inline | ผ่านเชิงเอกสาร | ต้องทดสอบใน OpenCode จริง |

## 3) หลักฐาน

- เทสต์ที่เพิ่ม: plannotator patch (selftest 1 ยูนิต + apitest 3 ข้อ)
- **ยังไม่ได้รัน** `selftest`/`apitest` ในรอบนี้เพราะไม่มี shell → รันด้วยคำสั่งเดิมเมื่อมี terminal:
  ```powershell
  node BAZERCONSOLE\01MAIN\ACTIVE\SERVER\tools\selftest.mjs
  node BAZERCONSOLE\01MAIN\ACTIVE\SERVER\tools\apitest.mjs
  ```
- หลังรีสตาร์ท Console: ภาพรวม → `ตรวจทุกอย่าง`

## 4) ไฟล์ที่แก้ในรอบนี้

`SERVER/env.mjs` · `actions.mjs` · `apply.mjs` · `index.mjs` · `plannotator.mjs` (ใหม่) · `probe.mjs` · `UI/app.js` · `MANIFEST/actions.json` · `manifest.json` · `04PLANNOTATOR/targets.json` + `GUIDELINE.md` · `tools/selftest.mjs` · `tools/apitest.mjs` · `README.md` · `DOCS/FLOW.md` · `DOCS/GUIDE.md`

---

# 00.00.02 - Tuesday 20th October 2026 - Quick Access Tab · Full Settings · Icon · Probe UX

> ต่อจาก `00.00.01` — บันทึกเฉพาะสิ่งที่เปลี่ยนในรอบนี้ (คำขอ 4 ข้อ + bug ที่ผู้ใช้เจอจาก log)

## สรุปการเปลี่ยนแปลง

| # | สิ่งที่ขอ/เจอ | ทำอะไร | ผล |
|---|---|---|---|
| 1 | Quick Access ควรเป็นแท็บของตัวเอง | ย้ายออกจากหน้า ตั้งค่า → แท็บใหม่ลำดับที่ 2 (ถัดจาก ภาพรวม) | แท็บ: ภาพรวม · **Quick Access** · โหมด & สิทธิ์ · ไฟล์ & สกิล · ตั้งค่า · ประวัติ |
| 2 | "การตั้งค่าฉบับเต็ม" แยกหมวด + apply แล้ว overwrite | เพิ่ม sub-tab `การตั้งค่าฉบับเต็ม` ในหน้า ตั้งค่า พร้อม editor ของ `tui.json` / `cli.json` → บันทึก = เขียนทับทั้งไฟล์ | Quick Access ยังแก้เฉพาะคีย์; ฉบับเต็มเขียนทับทั้งไฟล์ |
| 3 | เอา `.ico` เป็นโลโก้เว็บ + favicon | route `/icon.ico` + `<link rel="icon">` + โลโก้ `<img>` | โลโก้และแท็บเบราว์เซอร์ใช้ไอคอนเดียวกัน |
| 4 | `probe` ขึ้น "ไม่สำเร็จ" ทั้งที่ยังไม่ได้ติดตั้ง | แยก `warn` (ยังไม่ติดตั้ง/ไม่มี Plannotator) ออกจาก `fail` จริง | ขึ้น "ยังไม่พร้อม/เตือน" สีเหลือง พร้อมบอกว่าต้องติดตั้งก่อน |

---

## 1) Quick Access แยกเป็นแท็บของตัวเอง

**เดิม:** อยู่ในหน้า `ตั้งค่า` เป็น sub-tab แรก
**ใหม่:** เป็นแท็บหลักลำดับที่ 2 (ถัดจาก ภาพรวม) — `index.html` เพิ่ม `data-tab="quick"` + `#view-quick`, `app.js` เพิ่ม `renderQuick()`

เนื้อหายังเหมือนเดิม (มาจาก `settings.json` กลุ่ม `quick`):
- โมเดล + effort ของ 4 โหมด (BUDDHA/BAZER/SNACK/ADVISOR)
- คีย์ `messages_copy`
- toggle lock (models / keybinds)

**พฤติกรรมการเขียน:** `settings-save` → แก้ **เฉพาะคีย์ที่เปลี่ยน** (`jsonc-set` per key) ไม่แตะค่าอื่นในไฟล์

---

## 2) การตั้งค่าฉบับเต็ม (overwrite ทั้งไฟล์)

### 2.1 โครง UI

หน้า `ตั้งค่า` มี 3 sub-tab:
1. **การตั้งค่าฉบับเต็ม** (ใหม่)
2. **PSTACK roles**
3. **ตั้งค่าอื่น ๆ**

ใน "ฉบับเต็ม" มี editor แยกไฟล์เป็นหมวด:

| ไฟล์ | หมายเหตุ |
|---|---|
| `tui.json` | ไฟล์ที่ OpenCode 2 ใช้จริง (ธีม/คีย์ลัด/หน้าตา) |
| `cli.json` | ไฟล์รุ่นเก่า — เก็บไว้เพื่อความเข้ากันได้ |

แต่ละไฟล์มี textarea + ปุ่ม `ตรวจ JSON` + `เขียนทับทั้งไฟล์`

### 2.2 กลไกการเขียน (action `settings-full`)

```
อ่าน state.rawSettings → แก้ใน textarea → ตรวจ JSON ฝั่ง client
→ confirm (risk 3) → server: JSON.parse + ต้องเป็น object
→ backup → writeFile atomic → อ่านกลับ + parse อีกครั้ง
→ ถ้า parse ไม่ได้ = คืนไฟล์เดิมทันที (rollback ในฟังก์ชัน)
→ history: full.<file>
```

**ต่างจาก Quick Access ตรงไหน**

| | Quick Access | ฉบับเต็ม |
|---|---|---|
| วิธีเขียน | `jsonc-set` เฉพาะ key ที่แก้ | เขียนทับ **ทั้งไฟล์** |
| ค่าที่ไม่ได้แก้ | อยู่ครบ | **หาย** ถ้าไม่ได้อยู่ในเนื้อหาที่แก้ |
| ระดับความเสี่ยง | 2 | 3 (confirm + backup) |
| ใช้กับ | ปรับเร็ว ๆ ทุกวัน | ตั้งค่าลึก/คัดลอก config ทั้งก้อน |

> `settings.json` เพิ่มบล็อก `full.files` (id/label/target/note) — UI และ server อ่านจากที่เดียว ไม่ hardcode ชื่อไฟล์

---

## 3) ไอคอน: โลโก้เว็บ + favicon

- เพิ่ม route `GET /icon.ico` (และ `/favicon.ico`) → หาไฟล์ `.ico` ตัวแรกใน `BAZERCONSOLE/02SHORTCUT/` แล้วเสิร์ฟเป็น `image/x-icon`
  - เลือกตัวแรกแบบเรียงชื่อ → ถ้าผู้ใช้ rename ไอคอนอีกก็ยังใช้ได้
  - cache 5 นาที
- `index.html`:
  - `<link rel="icon" href="/icon.ico">` + `shortcut icon` + `apple-touch-icon`
  - โลโก้ header เปลี่ยนจากตัวอักษร `B` เป็น `<img src="/icon.ico">` (มี `B` เป็น fallback ถ้าโหลดรูปไม่ได้)
- CSS: รูปครอบ `.logo` แบบ `object-fit: cover` + `border-radius` เดิม

---

## 4) Probe UX — แยก "ยังไม่ได้ติดตั้ง" ออกจาก "พังจริง"

### อาการที่ผู้ใช้เห็นใน log

```
10:24:11 · ไม่สำเร็จ: probe — ตก 2 ข้อ
10:23:46 · ไม่สำเร็จ: plannotator-locate — ไม่เจอใน ...
10:23:40 · ไม่สำเร็จ: self-check — กฎ ผ่าน · ความครบ 16 รายการต้องทำ · probe 2 ตก
```

ความจริงคือ **ยังไม่ได้ติดตั้ง MAJOR ลงเครื่อง** (`state.json` ไม่มี, config ยังไม่มี `agent.plan/build` ที่ซ่อน) — ไม่ใช่ระบบพัง

### แก้

1. **`PREINSTALL_PROBES`** = `builtin-hidden` · `permission-level` · `modes-present`
   ถ้า probe ที่ตกอยู่ในชุดนี้ **ทั้งหมด** และยังมีรายการต้องติดตั้ง → คืน `warn` (ok:true + warn:true) แทน `bad`
   ข้อความ: `ยังไม่ได้ติดตั้ง N รายการ — probe X ข้อจะผ่านหลังติดตั้ง`
2. **`self-check`** ใช้ตรรกะเดียวกัน → ขึ้น "ยังไม่พร้อม" สีเหลือง ไม่ใช่ "ไม่สำเร็จ"
3. **`plannotator-locate`** ไม่เจอไฟล์ = `warn` (ปกติถ้ายังไม่เคยเปิด/ติดตั้ง Plannotator)
4. **`agents-present`** เพิ่มการตรวจ marker `<!-- BAZER-MODE:` ใน system prompt → จับเคส "ชื่อไฟล์เดียวกันแต่เป็นไฟล์รุ่นเก่า"
5. **UI/log**: เพิ่มระดับ `warn`
   - toast สีเหลือง หัวข้อ "ยังไม่พร้อม"
   - logbar บรรทัด `warn` สีเหลือง, ป้าย "เตือน"
   - SSE ส่ง `type: warn`

> หลังกด `ติดตั้ง / อัพเดตทั้งหมด` แล้ว probe 2 ข้อนั้นจะผ่านจริง (builtin-hidden ตรวจจาก `opencode debug agents`; permission-level ตรวจว่ามีคีย์ใน config จริง)

---

## 5) ปรับเพิ่มในวันเดียวกัน

### 5.1 Builder เป็น subagent (inline) — ไม่ใช่ primary

- `BUILDER.md`: `mode: all` → **`mode: subagent`** (ไม่โผล่ใน Shift+Tab)
- **BUDDHA P6** และ **BAZER B4** เรียก `builder` แบบ inline หลังแผนอนุมัติ
- builder รับ **เนื้อหาแผน** (ไม่ใช่พาธ) → แก้เฉพาะไฟล์ในแผน → ห้ามเรียก subagent ต่อ / ห้าม `submit_plan`
- การตรวจ/พิสูจน์/สรุป/commit ยังเป็นของโหมดหลัก (ผู้เรียก)
- `selftest` เพิ่มกฎ: ไฟล์ทุกตัวใน `02SUBAGENT/` ต้องเป็น `mode: subagent` (กันหลุดกลับไปเป็น `all`)

### 5.2 ปุ่มมีชื่อของตัวเอง (`cta`)

- เพิ่ม `cta` ให้ทุก action ใน `actions.json` — เช่น `apply` → "ติดตั้ง / อัพเดตทั้งหมด"
- หน้า **ภาพรวม** มีแถบปุ่มหลัก 3 ปุ่ม (ตรวจทุกอย่าง · ตรวจว่ามีอะไรใหม่ · ติดตั้ง) แยกจากการ์ด "เครื่องมืออื่น"
- `selftest` บังคับว่าทุก action ต้องมี `cta`

## ไฟล์ที่แก้ในรอบนี้

| ไฟล์ | เปลี่ยน |
|---|---|
| `UI/index.html` | favicon 3 แบบ · โลโก้ `<img>` · แท็บ Quick Access · `#view-quick` |
| `UI/style.css` | `.logo img/span` · `textarea.code` · `.toast.warn` · `.logbar-body .warn` |
| `UI/app.js` | `renderQuick()` · `renderSettings()` ใหม่ (full/pstack/other) · handler `data-validate` / `data-fullsave` · toast warn · palette เพิ่ม Quick Access |
| `SERVER/index.mjs` | `rawSettings` ใน state · route `/icon.ico` · SSE label/kind ของ warn |
| `SERVER/apply.mjs` | `writeFullSettings()` (validate → backup → atomic → read-back → rollback) |
| `SERVER/actions.mjs` | handler `settings-full` · `probe`/`self-check` คืน warn · `plannotator-locate` คืน warn · `PREINSTALL_PROBES` |
| `SERVER/probe.mjs` | `agents-present` ตรวจ marker |
| `MANIFEST/settings.json` | บล็อก `full.files` (tui/cli) |
| `MANIFEST/actions.json` | action `settings-full` (risk 3) |
| `MANIFEST/probes.json` | `agents-present` เพิ่ม `marker` |
| `tools/selftest.mjs` | +3 เทสต์ (favicon/โลโก้/แท็บ · full.files · CSS guard เดิม) |
| `tools/apitest.mjs` | +6 เทสต์ (probe warn · locate warn · self-check warn · full overwrite · JSON พังไม่เขียน · icon) |
| `AGENT/02SUBAGENT/BUILDER.md` | `mode: all` → `subagent` + คำอธิบายใหม่ |
| `AGENT/01PRIMARY/BUDDHA.md` · `BAZER.md` | P6/B4 เรียก `builder` inline |
| `AGENT/02SUBAGENT/GUIDELINE.md` | กฎ: subagent ทุกตัวต้อง `mode: subagent` |
| `DOCS/FLOW.md` | เพิ่ม §5 builder + §6 cta |
| `MANIFEST/actions.json` | `cta` ทุกปุ่ม |

---

## หลักฐาน

```
selftest.mjs → 35 passed
apitest.mjs  → 49 passed   (รวม probe warn / settings-full / icon)
state: rawSettings = cli,tui · settings.full.files = tui,cli · actions = 20
GET /icon.ico → 200 · image/x-icon · 4,286 bytes
probe → ok=true warn=true : "ยังไม่ได้ติดตั้ง 16 รายการ — probe 2 ข้อจะผ่านหลังติดตั้ง"
```

---

## ข้อจำกัด / หมายเหตุ

- `cli.json` เป็นไฟล์รุ่นเก่า — OpenCode 2 อ่าน `tui.json` เป็นหลัก; ที่เก็บไว้เพื่อความเข้ากันได้
- การเขียนทับทั้งไฟล์จะลบคีย์ที่ไม่ได้อยู่ในเนื้อหา (ตั้งใจ) — จึงเป็น risk 3 + confirm + backup ทุกครั้ง
- probe ที่ต้องรอติดตั้งยังรายงาน "ตก" ในตารางรายละเอียด (เพื่อความโปร่งใส) แต่ภาพรวมเป็น `warn`
- ยังไม่ได้ทดสอบ UI ในเบราว์เซอร์จริง (ตรวจได้แค่ parse + API + HTML ที่เสิร์ฟ)

---

# 00.00.01 - Monday 19th October 2026 - Redesign All From Scratch

> **LOGS — บันทึกการออกแบบและพัฒนา MAJOR**
> **ขอบเขต:** สรุปทุกอย่างที่คุย/ตัดสินใจ/ลงมือทำในแชทนี้ (2026-10-19 → 2026-10-20)
> **ผู้อ่าน:** คนที่กลับมาดูภายหลัง, LLM รุ่นถัดไปที่ต้องแก้ระบบนี้, และตัวเราเองในอีก 3 เดือน
> **หลักการเขียน:** บอกทั้ง "ทำอะไร" และ "ทำไม" — ถ้าไม่รู้เหตุผล ให้ถือว่ายังไม่จบ

---

## สารบัญ

1. [บริบท: ของเก่าทำงานยังไง และพังเพราะอะไร](#1-บริบท-ของเก่าทำงานยังไง-และพังเพราะอะไร)
2. [โจทย์ของรอบนี้ (ข้อกำหนดจากผู้ใช้)](#2-โจทย์ของรอบนี้-ข้อกำหนดจากผู้ใช้)
3. [หลักการที่ใช้ตัดสินใจ](#3-หลักการที่ใช้ตัดสินใจ)
4. [โครงสร้างโฟลเดอร์จริง](#4-โครงสร้างโฟลเดอร์จริง)
5. [กฎ R1–R4 และสถานที่เก็บ](#5-กฎ-r1r4-และสถานที่เก็บ)
6. [สถาปัตยกรรม BAZERCONSOLE](#6-สถาปัตยกรรม-bazerconsole)
7. [MANIFEST — สัญญากลาง](#7-manifest--สัญญากลาง)
8. [โหมดหลัก 4 ตัว](#8-โหมดหลัก-4-ตัว)
9. [Subagents](#9-subagents)
10. [บันไดเหมาเข่ง](#10-บันไดเหมาเข่ง)
11. [Plannotator](#11-plannotator)
12. [Settings — model & effort](#12-settings--model--effort)
13. [UX/UI ของ Console](#13-uxui-ของ-console)
14. [ข้อเท็จจริงที่พิสูจน์กับ OpenCode v2.0.32](#14-ข้อเท็จจริงที่พิสูจน์กับ-opencode-v2032)
15. [Bug scan 5 รอบ](#15-bug-scan-5-รอบ)
16. [บั๊กหลังเปิดใช้: modal ว่าง + ปุ่มกดไม่ได้](#16-บั๊กหลังเปิดใช้-modal-ว่าง--ปุ่มกดไม่ได้)
17. [เคลียร์ของเก่าให้เหลือแต่ของใหม่](#17-เคลียร์ของเก่าให้เหลือแต่ของใหม่)
18. [หลักฐานการทดสอบ](#18-หลักฐานการทดสอบ)
19. [สิ่งที่ยังไม่ทำ / ความเสี่ยงที่รู้ตัว](#19-สิ่งที่ยังไม่ทำ--ความเสี่ยงที่รู้ตัว)
20. [บทเรียนที่ฝังไว้ในระบบ](#20-บทเรียนที่ฝังไว้ในระบบ)
21. [คู่มือใช้งานเร็ว](#21-คู่มือใช้งานเร็ว)
22. [ลำดับเหตุการณ์ (chronology)](#22-ลำดับเหตุการณ์-chronology)
23. [ดัชนีไฟล์สำคัญ](#23-ดัชนีไฟล์สำคัญ)

---

## 1. บริบท: ของเก่าทำงานยังไง และพังเพราะอะไร

### 1.1 ของเก่า (`SETUP/OPENCODE`)

- เป็น repo เดียวที่รวมแอป + ข้อมูล: `CONSOLE/` (แอป), `CONSOLE/bundle/` (ต้นทาง agents/skills/commands/plugins/config), `FLOW.md`, `GUIDE.md`, `AUDIT/`, `CHECKS.md`
- **แอป** = HTTP server local (`127.0.0.1:4310` + token) เสิร์ฟ `console.html` หน้าเดียว → กดปุ่ม → `/api/action` → เขียนไฟล์จริงของ OpenCode (`~/.config/opencode`, `~/.agents/skills`, `~/.local/state/opencode`, `~/.plannotator`) พร้อม backup + `/api/verify` ตรวจ 20+ ข้อ
- มีสคริปต์ข้างเคียง: `mode-lock.mjs`, `flow-check.mjs`, `patch-plannotator.mjs`, `tui-settings/**` (13 ไฟล์), platform adapter 3 ชุด (Windows/macOS/Linux), launcher 4 แบบ
- มีกลไก **mirror** (`BAZERs-EXTENSION-*`): สร้าง skill สำเนาจาก primary agent เพื่อให้โหมดหนึ่ง "เรียกโหมดอื่น" ได้
- มีปลั๊กอิน `bazer-flow` บังคับ gate ว่า "ยังไม่อนุมัติแผน = ห้ามเขียนไฟล์"

### 1.2 ทำไมพัง (ตามที่ผู้ใช้สรุป + ที่ตรวจพบ)

| อาการ | ต้นเหตุเชิงโครงสร้าง |
|---|---|
| สคริปต์กระจัดกระจาย | ตรรกะกองใน `console.mjs` ไฟล์เดียว + สคริปต์แยกอีก 4 ชุด ต่างคนต่างรู้ path เอง |
| Console ควบคุมไม่ได้จริง | ไม่มีความจริงกลางว่า "ไฟล์อะไรควรอยู่ที่ไหน" — `planningAgents` ถูก hardcode ซ้ำ 3 ที่ |
| แก้แล้วพังเงียบ | ไม่มีสัญญา/สคีมา ไม่มี probe กับของจริง → "เขียวทั้งกระดานแต่ใช้ไม่ได้" |
| repo เกลื่อน | `.bak-*` วางข้างไฟล์จริงทุกโฟลเดอร์ |
| ติดตั้ง/อัปเดตไม่นิ่ง | "ติดตั้ง" ผูกกับโค้ด ไม่ได้มาจากรายการข้อมูล |
| mirror ทำให้ซับซ้อน | ต้อง generate สำเนาโหมดและ sync ตลอด — เกิดจากข้อจำกัดที่ตอนนี้ไม่มีแล้ว (subagent จริงมีให้ใช้) |

**บทสรุป:** ของเก่าไม่ได้พังเพราะเขียนโค้ดผิด — มันพังเพราะ **ไม่มีการแยก "ข้อมูล" ออกจาก "โปรแกรม"** และไม่มีสัญญากลาง

---

## 2. โจทย์ของรอบนี้ (ข้อกำหนดจากผู้ใช้)

### 2.1 ข้อกำหนดแข็ง

1. **ห้ามก๊อปโค้ดเก่ามาทั้งดุ้น** — เริ่มใหม่ที่ `SETUP/MAJOR` ไม่อยากให้โค้ดเก่าชี้นำดีไซน์
2. แยกที่เก็บ **primary mode · subagent · skills · plugin** ออกจากกัน และแยกโฟลเดอร์ให้ชัด
3. Console ต้องทำ 2 หน้าที่: **(ก) เช็คว่าไฟล์ระบบตั้งอะไรไว้ / มีหรือไม่มี (ข) apply สิ่งที่อยู่ใน MAJOR ลงไฟล์ระบบ** + มีปุ่มติดตั้งทุกอย่างที่จำเป็นตั้งแต่ต้น (OpenCode, Plannotator) เพื่อให้ non-code user ใช้ได้
4. **เขย่า primary mode ใหม่หมด** — เอา Plan/Build ที่มากับ OpenCode ออก เหลือ **BUDDHA · BAZER · SNACK · ADVISOR**
5. **BUDDHA** มี toggle ระหว่าง "DEFAULT ALLOW LIST" กับ "เหมาเข่ง ALLOW LIST" โดยเหมาเข่งต้องมีการยืนยันความเสี่ยง
6. **Plannotator**: เรียกจาก BUDDHA → กลับ BUDDHA · เรียกจาก BAZER → กลับ BAZER
7. **SNACK / ADVISOR** สลับกันได้: SNACK แก้ไฟล์ได้, ADVISOR แก้ไม่ได้ → `ADVISOR.md` ต้องบอกผู้ใช้ให้สลับไป SNACK
8. **BUDDHA/BAZER สมบูรณ์ในตัวเอง** — ไม่สลับ mode กลางแชท
9. **Git commit format:** `[Very Brief Phrase] [Rare emoji ที่ตรงกับงาน]: [Less Brief Phrase]`
10. **MAJOR เป็น repo เดิม** — ถ้าทดสอบแล้วดี sẽ overwrite `/OPENCODE`
11. **Console ต้องล้ำโดยไม่ต้องติดตั้งอะไรเพิ่ม**
12. **เอกสาร .md สองภาษา** แต่ **ไฟล์ที่ Agent ใช้งานจริงใช้ภาษาไทยเป็นหลัก**
13. **Windows ก่อน** — macOS/Linux ทำเมื่อมีเครื่องจริง
14. **ทิ้ง guideline ไว้ในแต่ละโฟลเดอร์** เพื่อกัน LLM รุ่นถัดไปทำโค้ดพันกัน

### 2.2 ของที่ผู้ใช้ให้读/ให้ยึด

- สเปก POTETO / ARENA / PSTACK จาก `C:\BCS\00.00 BCS Launch\00.03 pStack`
- ชุดไฟล์ agent ที่ Claude ปรับความแม่นยำไว้ (ใช้เป็น **วิธีคิด** ไม่ใช่คัดลอก)
- ตารางสิทธิ์:

| | Max Efficiency on Max Effort | No Loops Think | EXTREMELY OBVIOUS FILE/FOLDER PATH | Read that PATH | Edit that PATH |
|---|---|---|---|---|---|
| SNACK | ✅ | ✅ | ✅ | ✅ | ✅ |
| ADVISOR | ✅ | ✅ | ✅ | ✅ | ❌ |

> หมายเหตุ: ตารางนี้ **ต่างจากของเก่า** (ของเก่า ADVISOR ห้ามอ่านไฟล์) — ผู้ใช้ยืนยันให้ใช้ตารางใหม่

### 2.3 Workflow ที่ผู้ใช้ร่าง

**BUDDHA**
```
Plain BUDDHA
→ POTETO (In Line): WRITE AN ARENA MODE's PLAN
→ PLANNOTATOR (In Line): SUBMIT A PLAN
→ (USER) feedback → วนกลับ POTETO | approve → NEXT
→ Plain BUDDHA
→ ARENA (In Line): Main ARENA Workflow
→ ARENA (BACKGROUND): loop ภายใน subagent ของ Arena
→ ARENA (In Line): DONE
→ Plain BUDDHA
→ POTETO (In Line): WRITE AN `ACTUAL CODEBASE EDIT` PLAN
→ PLANNOTATOR (In Line): SUBMIT A PLAN
→ (USER) feedback → วนกลับ POTETO | approve → NEXT
→ BUDDHA: EDIT AN ACTUAL CODEBASE
→ BUDDHA: WRITE A CONCLUSION AND GIT COMMIT
```

**BAZER**
```
Plain BAZER (no loop think, no unnecessary think, even in max effort)
→ Write a plan
→ PLANNOTATOR (In Line): SUBMIT A PLAN
→ (USER) feedback → วนกลับ | approve → NEXT
→ BAZER: EDIT ACTUAL CODEBASE
→ BAZER: WRITE A CONCLUSION AND GIT COMMIT
```

**Subagents:** POTETO (เรียก skills ใน PSTACK ยกเว้น ARENA) · PLANNOTATOR (เรียก plugin Plannotator) · ARENA (มี sub-subagent ตามสเปก)

---

## 3. หลักการที่ใช้ตัดสินใจ

1. **ข้อมูล ≠ โปรแกรม** — `AGENT/**` และ `PASSIVE/**` เป็นข้อมูลล้วน; โค้ดอยู่ `ACTIVE/**` ที่เดียว
2. **เจ้าของความจริงคนเดียว** — ไฟล์อะไรอยู่ที่ไหน = `manifest.json`; ชื่อโหมด/สิทธิ์ = `policies.json`; ปุ่ม = `actions.json`
3. **สัญญาแทนความจำ** — ทุกอย่างที่ Console ทำได้ต้องประกาศใน MANIFEST ก่อน
4. **พิสูจน์กับของจริง** — ไม่เชื่อว่าตั้งค่าแล้วได้ผล ต้องรัน `opencode debug agents` แล้วอ่านผล
5. **ของเก่าไม่ถูกลบ** — backup ก่อนเขียนทุกครั้ง; ของที่ไม่ต้องการย้ายไป `quarantine`
6. **ซื่อตรงเรื่องสถานะ** — ยังไม่ทำ = `design` ไม่ใช่เขียวหลอก
7. **ลดของ ไม่เพิ่มของ** — ตัด mirror, gang model, slash command ที่ไม่จำเป็น

---

## 4. โครงสร้างโฟลเดอร์จริง

### 4.1 บนดิสก์ (ยึดตามที่ผู้ใช้สร้างจริง)

```
SETUP/MAJOR/
├─ GUIDELINE.md                    กฎแม่ R1–R4 + ตัวอย่าง "ทำแบบนี้พังแน่"
├─ README.md                       ทางเข้า + แผนที่ + สถานะ v0.1
├─ .gitignore                      var/ · desktop.ini · *.lnk · *.bazer-tmp-*
├─ AGENT/
│  ├─ GUIDELINE.md
│  ├─ 01PRIMARY/                   BUDDHA.md · BAZER.md · SNACK.md · ADVISOR.md (+GUIDELINE)
│  ├─ 02SUBAGENT/                  POTETO.md · PLANNOTATOR.md · ARENA.md · BUILDER.md (+GUIDELINE)
│  │  └─ SUBSUBAGENT/              ARENA-RUNNER.md · ARENA-JUDGE.md
│  ├─ 03SKILLS/
│  │  ├─ GUIDELINE.md
│  │  ├─ PSTACK/                   53 skill (ยกเว้น arena) + ADAPT-OPENCODE.md
│  │  └─ BAZER/                    ว่างโดยเจตนา
│  └─ 04PLUGIN/GUIDELINE.md        ที่เดียวที่เป็นโค้ดได้ (ยังไม่เขียนใหม่)
├─ BAZERCONSOLE/
│  ├─ GUIDELINE.md
│  ├─ LOGS.md                      ไฟล์นี้
│  ├─ desktop.ini                  ไอคอนโฟลเดอร์ (machine-specific, gitignore)
│  ├─ 01MAIN/
│  │  ├─ GUIDELINE.md
│  │  ├─ PASSIVE/
│  │  │  ├─ GUIDELINE.md
│  │  │  ├─ 01MANIFEST/            README · CHANGELOG · schema · manifest · policies
│  │  │  │                         settings · actions · probes · law · env
│  │  │  ├─ 02INSTALLER/           install.json + GUIDELINE
│  │  │  ├─ 03SLASHCOMMAND/        ว่างโดยเจตนา + GUIDELINE
│  │  │  └─ 04PLANNOTATOR/         targets.json + GUIDELINE
│  │  ├─ ACTIVE/
│  │  │  ├─ GUIDELINE.md
│  │  │  ├─ SERVER/                9 โมดูล + tools/{selftest,apitest}
│  │  │  ├─ UI/                    index.html · app.js · style.css · motion.css
│  │  │  └─ var/                   runtime (state/backups/history/token/quarantine)
│  │  └─ CONFIGTEMPLATEFORAPPLY/   AGENTS.md · pstack-models.md (+GUIDELINE)
│  ├─ 02SHORTCUT/                  create-desktop-shortcut.ps1 + BAZERCONSOLE.ico
│  ├─ 03WINDOWS/                   BAZER CONSOLE.vbs (portable)
│  ├─ 04MACOS/ · 05LINUX/          ว่าง + GUIDELINE
└─ DOCS/                           FLOW.md · GUIDE.md
```

### 4.2 เทียบกับที่ผู้ใช้ร่างในแชท

| ที่ผู้ใช้ร่าง | ที่ทำจริง | เหตุผล |
|---|---|---|
| `AGENT/04MISCELLANEOUS/{PLUGIN,DOCS}` | `AGENT/04PLUGIN` + `MAJOR/DOCS` | ผู้ใช้สร้าง `04PLUGIN` ไว้บนดิสก์แล้ว; DOCS แยกออกมาไม่ให้ปนกับ agent |
| `BAZERCONSOLE/PASSIVE` + `ACTIVE` | ซ้อนไว้ใต้ `01MAIN/` (ตามที่ผู้ใช้สร้าง `01MAIN`) | ยึดของจริงบนดิสก์เป็นหลัก แต่คงชื่อ PASSIVE/ACTIVE ตามที่ร่าง |
| `02SUBAGENT/ARENA (folder)` | `02SUBAGENT/SUBSUBAGENT/` | ผู้ใช้สร้าง `SUBSUBAGENT` ไว้บนดิสก์แล้ว (มีไฟล์ตัวอย่าง `ARENA-LOOP1`) |
| `CONFIGTEMPLATEFORAPPLY` | คงชื่อเดิม | เป็นชื่อที่ผู้ใช้ตั้งเอง |

> ไฟล์ตัวอย่าง `SUBSUBAGENT/ARENA-LOOP1 (Example Name).md` (0 byte) **ไม่ถูกลบ** — เป็นของผู้ใช้

### 4.3 ไอคอนและทางลัด (Windows)

| ของ | รายละเอียด |
|---|---|
| ไอคอน | `02SHORTCUT/BAZERCONSOLE.ico` (เดิมชื่อ `Firefly_RemoveBackground.ico` — ผู้ใช้เปลี่ยนชื่อภายหลัง) |
| โฟลเดอร์ | `BAZERCONSOLE/desktop.ini` → `IconResource=<abs path>,0` + ตั้ง `+r +s` ให้ไฟล์ และ `+r` ให้โฟลเดอร์ (Explorer จึงใช้ไอคอน) |
| ทางลัด Desktop | `create-desktop-shortcut.ps1` → `.lnk` ชี้ `wscript.exe "03WINDOWS\BAZER CONSOLE.vbs"` + `IconLocation=<ico>,0` |
| ตัวเปิด | `03WINDOWS/BAZER CONSOLE.vbs` — หา `MAJOR` จากตำแหน่งตัวเอง (ย้าย repo ได้) แล้วรัน `SERVER/index.mjs --port=4310` |

**บทเรียนที่เจอจริง:** ไฟล์ `.ps1` ที่ไม่มี BOM ถูก Windows PowerShell 5.1 อ่านเป็น ANSI → ข้อความไทยเพี้ยนก่อนรัน จึงบังคับให้ script ใน `02SHORTCUT` เป็น **ASCII ล้วน** และเขียนกฎนี้ใน `02SHORTCUT/GUIDELINE.md`
`desktop.ini` ถูก gitignore (ผูกพาธ absolute) — ย้าย repo แล้วรัน script ใหม่

---

## 5. กฎ R1–R4 และสถานที่เก็บ

### 5.1 กฎ

| # | กฎ | ผิดเมื่อไหร่ | ตัวบังคับ |
|---|---|---|---|
| **R1** | ต้นทางเป็นข้อมูล — `AGENT/**`, `CONFIGTEMPLATEFORAPPLY/**`, `PASSIVE/**` ห้ามมีโค้ด | เจอ `.mjs/.js/.ps1/.cmd/.vbs` (ยกเว้น `02INSTALLER`) | `law.mjs` |
| **R2** | Console ห้าม hardcode ที่อยู่ปลายทาง | เจอ path ผู้ใช้ใน `ACTIVE/**` | `law.mjs` |
| **R3** | ปุ่มทุกปุ่มมาจาก `actions.json` + ต้องมี handler ตรงกัน | id ไม่ตรงกัน | `law.mjs` (เทียบกับ registry จริง) |
| **R4** | ห้าม `.bak` ข้างไฟล์จริง | เจอ `*.bak*` นอก `var/` | `law.mjs` |

**R5 (บทลงโทษ):** งานที่ทำจะไม่ถูกติดตั้ง — `ตรวจกฎ` เป็นขั้นแรกของ `ติดตั้งทั้งหมด`; แดง = หยุด

### 5.2 เก็บที่ไหน (คำถามของผู้ใช้: "กฎ 4 ข้อใส่ที่ไหน")

1. **`MAJOR/GUIDELINE.md`** — กฎแม่ + ตัวอย่าง "ถ้าเพิ่มแบบนี้ อีก 3 เดือนพังแน่"
2. **`GUIDELINE.md` ในทุกโฟลเดอร์** — กฎเดียวกันแต่แคบลงตามบริบท (17 ไฟล์)
3. **`MANIFEST/law.json` + `SERVER/law.mjs`** — บังคับด้วยเครื่องจริง (กฎที่ไม่มีตัวบังคับ = ไม่มีกฎ)

---

## 6. สถาปัตยกรรม BAZERCONSOLE

### 6.1 ชั้นข้อมูล (`PASSIVE/01MANIFEST`)

| ไฟล์ | เป็นเจ้าของเรื่อง |
|---|---|
| `manifest.json` | ของทุกชิ้น + ที่อยู่ปลายทาง + วิธีติดตั้ง + สถานะ (21 entry) |
| `policies.json` | บันไดเหมาเข่ง 5 ระดับ |
| `settings.json` | คอนโทรลหน้า ตั้งค่า (Quick Access / ARENA / อื่น ๆ / PSTACK) |
| `actions.json` | ปุ่มทุกปุ่ม + ระดับความเสี่ยง (19 ปุ่ม) |
| `probes.json` | ข้อพิสูจน์กับของจริง 8 ข้อ |
| `law.json` | กฎ R1–R4 ในรูปข้อมูล |
| `env.json` | ตัวแปร `${HOME} ${CONFIG} ${SKILLS} ${STATE} ${PLANNOTATOR} ${LAUNCH} ${TEMP}` |
| `schema.json` | รูปร่างของทุกไฟล์ข้างบน |
| `README.md` | สัญญาเต็ม + กับดักที่พิสูจน์แล้ว + วิธีเพิ่มของ 6 ขั้น |
| `CHANGELOG.md` | ประวัติการแก้ (บังคับอัพเดตทุกครั้งที่แก้โฟลเดอร์นี้) |

### 6.2 ชั้นโปรแกรม (`ACTIVE`)

```
SERVER/
├─ index.mjs     HTTP 127.0.0.1 + token + SSE + static (กัน path traversal)
├─ env.mjs       resolve ${VAR}
├─ jsonc.mjs     JSONC editor ที่คงคอมเมนต์ + BOM + CRLF + array removal
├─ manifest.mjs  load/validate/hash/tree
├─ plan.mjs      5(+2) สถานะ + diff
├─ apply.mjs     backup → atomic write → hash → history → rollback/quarantine
├─ probe.mjs     พิสูจน์กับ OpenCode จริง (spawn ผ่าน shell บน Windows)
├─ law.mjs       R1–R4
├─ actions.mjs   registry 19 handlers (ต้องตรง actions.json)
└─ tools/
   ├─ selftest.mjs  33 checks (jsonc/plan/law/contract)
   └─ apitest.mjs   43 checks (integration: สตาร์ทเซิร์ฟเวอร์เอง ยิง HTTP)
UI/
├─ index.html    shell + token meta + modal/palette/logbar
├─ app.js        render จาก state (ไม่ผูกปุ่มตายตัว)
├─ style.css     dark theme + `[hidden] { display:none !important }`
└─ motion.css    animation ทั้งหมด + prefers-reduced-motion
```

### 6.3 หลักการของเซิร์ฟเวอร์

- **ไม่มี dependency** — Node built-ins เท่านั้น → clone แล้วเปิดได้
- **token ต่อการเปิดหนึ่งครั้ง** เก็บที่ `var/token`; POST ทุกตัวต้องมี header `x-bazer-token` (กัน CSRF)
- **read vs write ชัดเจน** — `kind: read` ไม่แตะไฟล์; `kind: write` ต้องยืนยัน (ยกเว้นปุ่มที่ dry-run ได้)
- **ผลลัพธ์รูปเดียว** `{ ok, summary, ...payload }` → UI แสดงแบบเดียวกันทุกปุ่ม

---

## 7. MANIFEST — สัญญากลาง

### 7.1 entry (ตัวอย่าง)

```jsonc
{
  "id": "agent.buddha",
  "kind": "agent|subagent|subsubagent|skill|plugin|command|config|template|launcher|patch",
  "title": "โหมด BUDDHA",
  "source": "AGENT/01PRIMARY/BUDDHA.md",
  "target": "${CONFIG}/agents/buddha.md",
  "strategy": "overwrite",
  "owner": "ours|user|pstack",
  "status": "ready|raw|design",
  "auto": true,
  "proof": "modes-present",
  "why": "บังคับเมื่อ status=design"
}
```

### 7.2 strategy (8 แบบ — มีเท่านี้)

| strategy | ทำอะไร | ใช้กับ |
|---|---|---|
| `overwrite` | เขียนทับถ้า hash ต่าง | ไฟล์ของเรา |
| `create-only` | สร้างถ้ายังไม่มี | launcher, ไฟล์ที่ผู้ใช้อาจแก้ |
| `template-once` | สร้างครั้งเดียว ไม่ทับ | `AGENTS.md`, `pstack-models.md` |
| `jsonc-merge` | ใส่/รวมค่าที่ `valuePath` คงคอมเมนต์ | `opencode.jsonc`, `tui.json` |
| `jsonc-remove-array-item` | ลบสมาชิก array (คงคอมเมนต์) | ถอดปลั๊กอินเก่า |
| `copy-tree` | คัดลอกทั้งโฟลเดอร์ (มี exclude + binary-safe) | skills, plugins |
| `patch` | แพตช์ไฟล์เครื่องมืออื่น (ยัง design) | Plannotator |
| `line` | แทนทั้งบรรทัดที่ขึ้นต้นด้วย prefix | `pstack-models.md` |

### 7.3 สถานะ (5 + 2)

| สถานะ | ความหมาย | UI |
|---|---|---|
| `ok` | ตรงกับต้นทาง | เขียว |
| `stale` | มีแต่เนื้อหาต่าง | เหลือง + ปุ่มอัปเดต |
| `missing` | ยังไม่มี | แดง + ปุ่มติดตั้ง |
| `foreign` | มีในระบบแต่ไม่อยู่ใน manifest | เทา ("ของเก่า" tab) |
| `broken` | ของครบแต่ probe ไม่ผ่าน | แดงกระพริบ |
| `design` | ประกาศไว้แต่ยังไม่พร้อม | ฟ้า (ไม่ใช่ error) |
| `raw` | ติดตั้งได้แต่ยังไม่ adapt | เหลืองอ่อน |

### 7.4 plan → apply

**`plan` (dry-run)** — ไม่เขียนอะไรเลย:
1. ตรวจกฎ R1–R4
2. ต่อ entry: เทียบ hash / ค่า → `state` + `willWrite` + `diff`
3. สแกน `foreign` ในโฟลเดอร์ปลายทาง
4. คืน `{entries[], summary, foreign, blockers[]}`

**`apply`** — ลำดับตายตัว:
```
config → agents → subagents → skills → templates → launcher → patch → probe
```
ต่อ entry: **backup → atomic write → อ่านกลับเทียบ hash → history**
ล้มกลางทาง = **หยุด + rollback อัตโนมัติ** (คืนไฟล์ที่เขียนไปแล้ว + ลบไฟล์ที่เพิ่งสร้าง)
รันซ้ำ = `applied 0` (idempotent)

### 7.5 backup / history / rollback / quarantine

| ของ | ที่อยู่ | หมายเหตุ |
|---|---|---|
| backup | `ACTIVE/var/backups/<stamp>/files/<hash>_<name>` | ใช้ hash ของพาธเต็มกันชนกัน |
| history | `ACTIVE/var/history.tsv` | เวลา · stamp · entry · target · hash ก่อน/หลัง |
| rollback | คืนทั้งรอบจาก `backups/<stamp>/manifest.json` | ปุ่ม risk 3 |
| quarantine | `ACTIVE/var/quarantine/<stamp>/<group>/` | ของเก่า (ไม่ลบถาวร) + `quarantine.json` |
| state | `ACTIVE/var/state.json` | สถานะติดตั้ง/ระดับเหมาเข่ง/lock/snapshot |

---

## 8. โหมดหลัก 4 ตัว

### 8.1 ตารางสรุป

| ไฟล์ | mode | color | หน้าที่ | permission หลัก |
|---|---|---|---|---|
| `BUDDHA.md` | primary | `#EB895B` | Poteto plan → Gate 1 → Arena → Poteto plan → Gate 2 → ลงมือแก้เอง → commit | read/edit/glob/grep/list allow · shell **ask** · subagent allow |
| `BAZER.md` | primary | `#D9480F` | แผนเดียว → Gate → แก้เฉพาะไฟล์ที่ระบุพาธ → commit | read/edit allow · glob/grep/list **ask** · shell ask · subagent allow (เฉพาะ plannotator) |
| `SNACK.md` | primary | `#40E0D0` | ถามเร็วตอบเร็ว อ่าน/แก้ได้เฉพาะพาธที่ระบุ | read/edit allow · glob/grep/list/shell/subagent **deny** |
| `ADVISOR.md` | primary | `#B26BFF` | ที่ปรึกษา อ่านได้เฉพาะพาธที่ระบุ **แก้ไม่ได้** | read allow · edit/glob/grep/list/shell/subagent **deny** |

> **สี:** BAZER คงของเดิม (`#D9480F`) · BUDDHA/SNACK คงของเดิม · ADVISOR ปรับม่วงให้อ่านชัดบน dark theme (`#9B30FF` → `#B26BFF`) แต่ยังสด
> **visual effect ใน TUI** ทำได้แค่ `color` (ไม่มี API ให้ทำ animation) — effect อื่นต้องเป็นปลั๊กอิน (ยังไม่ทำ)

### 8.2 BUDDHA — ลำดับตายตัว

| เฟส | ทำอะไร | เรียกใคร | ทางออก |
|---|---|---|---|
| P0 | อ่านโจทย์ + สำรวจบริบท (read-only) | — | P1 |
| P1 | แผน Arena ขึ้นต้น `# GATE 1 — ARENA PLAN` | `poteto` | P2 |
| P2 | ยื่นแผน | `plannotator` | approve → P3 · feedback → P1 |
| P3 | Arena ในเซสชัน (candidate ลง temp) | `arena` | P4 |
| P4 | แผนแก้โค้ด ขึ้นต้น `# GATE 2 — BUILD PLAN` | `poteto` | P5 |
| P5 | ยื่นแผน | `plannotator` | approve → P6 · feedback → P4 |
| P6 | แก้โค้ดเอง + พิสูจน์ + bug scan 3 รอบ + สรุป + commit | `builder` เฉพาะเมื่อสั่ง | จบ |
> **อัพเดต 00.00.02 §5.1:** P6 เปลี่ยนเป็นเรียก `builder` inline แล้ว (builder เป็น subagent ไม่ใช่ primary)

**กฎเหล็ก 5 ข้อ:** ห้ามสลับ agent · ก่อนอนุมัติแผนสร้างห้ามแตะโปรเจกต์ (เขียนได้แค่ `%TEMP%\bazer\`) · ห้ามข้าม gate · ห้ามแต่งผล Arena · ทุกข้อสรุปต้องมีหลักฐาน

### 8.3 BAZER — แผนเดียว

| เฟส | ทำอะไร |
|---|---|
| B1 | อ่านโจทย์ + ไฟล์ที่อนุญาต + ตรวจสภาพจริง |
| B2 | แผนขึ้นต้น `# BAZER — PLAN` |
| B3 | ยื่นด้วย `plannotator` |
| B4 | แก้ + พิสูจน์ |
| B5 | bug scan 3 รอบ → รายงาน → commit |

**ขอบเขตไฟล์:** "ไฟล์ที่ได้รับอนุญาต = พาธที่ผู้ใช้เขียนในข้อความของตัวเอง" — ห้ามอ่านไฟล์อื่นแม้เพื่อดูบริบท, ห้ามอ่านทางอ้อม (subagent/glob/shell), ถูกปฏิเสธ = คำตอบสุดท้าย

### 8.4 SNACK

- ประโยคแรกคือคำตอบ, 1–3 ประโยค, ไม่มีหัวข้อ/ตารางประดับ
- อ่าน/แก้ได้เฉพาะพาธที่ผู้ใช้ระบุ — ไม่มี glob/grep/list/shell/subagent
- ถ้างานเกินขอบเขต → บอก 1 บรรทัดให้ไป BAZER/BUDDHA

### 8.5 ADVISOR

- อ่านได้เฉพาะพาธที่ผู้ใช้ระบุ, **แก้ไม่ได้** (permission edit: deny)
- ถ้าคำตอบที่ดีที่สุดคือ "ต้องแก้ไฟล์" → ต้องบอกว่า **"ผมแก้ในโหมดนี้ไม่ได้ — สลับเป็น SNACK MODE"** พร้อมคำสั่งแก้ที่พร้อมใช้
- เกินความสามารถ → บอก "ไม่รู้" ห้ามเดา

### 8.6 วิธีเขียนให้ "แม่น" (ยืมวิธีจากชุดที่ Claude ปรับ — ใช้ครบ 10 ข้อ)

1. นิยามขอบเขตให้เป็นสมการ
2. แยกจังหวะเวลา (ก่อน/หลังอนุมัติ)
3. ปิดช่องทางอ้อม
4. ข้อยกเว้นต้องมีชื่อและมีจำนวน
5. self-check ก่อนเรียกเครื่องมือ
6. ถูกปฏิเสธ = คำตอบสุดท้าย
7. ห้าม improvise (โหลด skill ไม่ได้ → หยุด)
8. สัญญารายงานตายตัว
9. ข้อความที่เครื่องอ่านได้ (`# GATE 1 — ARENA PLAN`, marker)
10. ภาษา: เนื้อหาหลักไทย · ค่า/คีย์/ชื่อเครื่องมืออังกฤษ

---

## 9. Subagents

| ไฟล์ | id ที่เรียก | งาน | permission |
|---|---|---|---|
| `POTETO.md` | `poteto` | เขียนแผนด้วยกระบวนการ poteto (โหลด skill `poteto-mode`) คืนแผนเป็นข้อความ | read/edit (temp เท่านั้น) |
| `PLANNOTATOR.md` | `plannotator` | ยื่นแผน + คืนผล approved/feedback | read/edit (temp) · shell allow (เฉพาะ plannotator CLI) |
| `ARENA.md` | `arena` | เดิน Arena 6 เฟส | read/edit (temp) · shell · subagent allow |
| `BUILDER.md` | `builder` | รับแผนอนุมัติแล้วลงมือ (สำหรับ Plan Mode เดิม) | `mode: all` · edit allow · subagent/submit_plan deny |
| `SUBSUBAGENT/ARENA-RUNNER.md` | `arena-runner` | ผู้แข่ง 1 ที่นั่ง | edit เฉพาะโฟลเดอร์ตัวเอง |
| `SUBSUBAGENT/ARENA-JUDGE.md` | `arena-judge` | กรรมการให้คะแนน | read-only |

**In-line vs background:** OpenCode แสดง subagent เดี่ยวแบบ inline; ถ้ารันหลายตัวพร้อมกันจะถูกซ่อนและสรุปกลับ — ARENA จึง spawn `arena-runner` 2–3 ตัวพร้อมกันแบบ `background: true` แล้วรวมผล

**สัญญารายงานกลับ (ทุก subagent):** ทำอะไร · ไฟล์/พาธที่แตะ · หลักฐาน (คำสั่ง + ผลจริง) · สิ่งที่ยังพิสูจน์ไม่ได้

---

## 10. บันไดเหมาเข่ง

### 10.1 ห้าระดับ

| ขั้น | ชื่อ | tagline | เปิดอะไรเพิ่ม | risk |
|---|---|---|---|---|
| 1 | **สุภาพ** | เท่าที่ BUDDHA รุ่นเก่าทำได้ | read/edit/glob/grep/list allow · shell **ask** · subagent allow | 1 |
| 2 | **ปลดกำ** | shell ไม่ถามก่อนรัน | shell allow | 2 |
| 3 | **ออกนอกบ้าน** | ออกนอกโปรเจกต์ + เรียกเว็บได้ | webfetch/websearch/external_directory allow | 2 |
| 4 | **ไม่ถามใคร** | ไม่หยุดถาม + วนซ่อมตัวเอง | question/doom_loop allow | 3 |
| 5 | **เหมาเข่ง** | ทุกอย่างจริง ๆ | ทุก action รวม browser | 3 |

### 10.2 กลไก

- เขียนที่ **`agent.buddha.permission`** ใน `opencode.jsonc` — **ไม่แตะ `BUDDHA.md`**
- พิสูจน์แล้วว่า permission จาก config **ต่อท้าย** กฎในไฟล์และมีผลจริง (ทดสอบ: `read: deny` จาก config ชนะ `read: allow` ในไฟล์)
- แต่ละระดับส่ง permission **ครบชุด** (ไม่ใช่ส่วนต่าง) → สลับระดับแล้วไม่ค้างกฎเก่า
- กดขั้น → popup ยืนยัน **1 จังหวะ** (ไม่ต้องพิมพ์คำ) → **เขียนทันที ไม่ต้องกดอัปเดตอีกที** (ข้อยกเว้นเดียวของระบบ)
- มีปุ่ม **ย้อนระดับก่อนหน้า** (`policy-undo`)
- มีผลกับ **session ใหม่** (ต้องเปิด OpenCode ใหม่)

---

## 11. Plannotator

### 11.1 พฤติกรรมที่ต้องการ

- เรียกจาก **BUDDHA** → ปุ่มอนุมัติกลับ **BUDDHA**
- เรียกจาก **BAZER** → ปุ่มอนุมัติกลับ **BAZER**
- `PLANNOTATOR.md` ต้องรายงานว่า "ปุ่มชี้ผิดโหมด" ถ้าผลลัพธ์ไม่ตรงกับโหมดต้นทาง

### 11.2 สถานะจริงของงานนี้

- `PASSIVE/04PLANNOTATOR/targets.json` เก็บค่าที่ต้องการ + กติกาการตรวจ
- **ยังไม่แพตช์** (`manifest: patch.plannotator = design`) เพราะต้องรัน probe `plannotator-locate` ให้เจอไฟล์จริงก่อน — ห้ามเดาไฟล์
- ถ้าแพตช์ไม่ได้ → ถอยไปใช้ `submit_plan` ตามปกติและรายงานตรง ๆ
- เมื่อแพตช์: เก็บ hash ต้นฉบับ → ปลั๊กอินอัปเดตแล้ว hash เปลี่ยน = `broken` ให้แพตช์ใหม่

---

## 12. Settings — model & effort

### 12.1 สามที่ (ตามที่ผู้ใช้ขอ)

| ที่ | อยู่หน้าไหน | เขียนลง |
|---|---|---|
| **Quick Access** | แท็บ ตั้งค่า | `agent.<mode>.model` / `.variant`, `tui.json` (คีย์), lock |
| **ARENA** | แถบในหน้า **โหมด & สิทธิ์** (BUDDHA) | `~/.agents/pstack-models.md` (`arena runners`, `cross-judge pool`) |
| **PSTACK roles** | แท็บซ่อนในหน้า ตั้งค่า | `pstack-models.md` 15 role + budget |

### 12.2 ไม่มี "gang model" — เหตุผล

ของเก่าจัด model เป็น "gang" แล้วผูก gang เข้ากับ role ของ PSTACK เราไม่ทำ เพราะ:
1. เพิ่มชั้นนามธรรมที่ต้องจำ (gang ไหนคุม role อะไร) โดยไม่ได้ลดงาน
2. เวลาผิด จะไม่รู้ว่าผิดที่ gang หรือที่ role
3. 15 role น้อยพอที่จะเห็นทั้งหมดในหน้าเดียว

แทนที่ด้วย **preset 3 แบบ**: `ใช้ตัวเดียวทั้งชุด` · `แยกงานเขียน/งานตัดสิน` · `กำหนดเอง`

### 12.3 Lock / drift

- เปิด toggle `lock.models` → เก็บ snapshot ของ model/effort 4 โหมด
- ตอนเปิด Console: ถ้าค่าปัจจุบันต่างจาก snapshot → ขึ้นแบนเนอร์ **"ค่าถูกเปลี่ยนหลังล็อก"** (เตือน ไม่บล็อก)
- `lock.keybinds` เก็บ flag ไว้ (การเตือนคีย์ยังไม่ทำ)

---

## 13. UX/UI ของ Console

### 13.1 ห้าแท็บ

1. **ภาพรวม** — การ์ดสรุป (missing/stale/broken/foreign) · ปุ่มหลัก · กฎ 4 ข้อ · probe
2. **โหมด & สิทธิ์** — การ์ด 4 โหมด · **บันไดเหมาเข่ง** · แถบ ARENA · ซ่อน/คืน Plan & Build · ถอด bazer-flow เก่า
3. **ไฟล์ & สกิล** — ทุก entry + diff + ติดตั้งรายตัว + **ของเก่า (cleanup)** + รีเซ็ต template
4. **ตั้งค่า** — Quick Access / ตั้งค่าอื่น ๆ / PSTACK roles
5. **ประวัติ** — history + ย้อนรอบ

### 13.2 ระดับความเสี่ยง 3 ขั้น

| ระดับ | ข้อความ | ใช้กับ |
|---|---|---|
| 1 | **ปลอดภัยมาก กดได้เลย** | อ่านอย่างเดียว |
| 2 | **ดูเหมือนปลอดภัย แต่ตั้งสติดี ๆ** | เขียนไฟล์ของเรา / เปลี่ยนค่าที่มีผล |
| 3 | **ไม่ปลอดภัย (กดได้ แต่เตือนแล้ว)** | ทับของเดิม/ถอดของ/ติดตั้งโปรแกรม |

ทุกปุ่ม/ทุกช่องมี **ประโยคอธิบายว่าเสี่ยงยังไง** (ไม่ใช่แค่สี) และทุกปุ่มเขียนไฟล์มี **diff ก่อน-หลัง**

### 13.3 สัญญาของปุ่ม

1. ปุ่มมาจาก `actions.json` (UI กับ backend อ่านไฟล์เดียวกัน)
2. ผลลัพธ์รูปเดียว `{ ok, summary, changed[], skipped[], errors[] }`
3. ปุ่มเขียนทุกตัวมี dry-run/diff
4. ทำไม่ได้ = **disabled + เหตุผลบนจอ**
5. กดเสร็จ state รีเฟรชเอง + ลง history + rollback ได้
6. stale detection: แอปเก่ากว่า manifest → เตือนให้ปิด-เปิดใหม่

### 13.4 Motion (ไม่มี dependency / ไม่มี build step)

- orbs เคลื่อนไหวฉากหลัง · การ์ด stagger ตอนเปลี่ยนแท็บ · ปุ่มมี sheen + แสงตามเมาส์
- modal/toast slide · logbar มี flash เมื่อมี event · แถบขั้นที่เลือกมี glow
- command palette `Ctrl+K` · เคารพ `prefers-reduced-motion`
- ไฟล์แยก `style.css` / `motion.css` (ไม่ inline ไม่ generate → ไม่มีปัญหาไฟล์สองชุดตีกัน)

### 13.5 ทำไมไม่มี slash command

`PASSIVE/03SLASHCOMMAND` ว่างโดยเจตนา — สลับโหมดใช้ `Shift+Tab`
เกณฑ์ก่อนจะเพิ่ม command ในอนาคต (ต้องตอบได้ทั้ง 3 ข้อ):
1. command ทำอะไรที่ **ปุ่มใน Console ทำไม่ได้**
2. ไม่สร้าง "สองทางที่ต้อง sync กัน" (command บอก A · ปุ่มบอก B)
3. ถ้าลบ command ทิ้ง ผู้ใช้ยังทำงานได้ครบ

---

## 14. ข้อเท็จจริงที่พิสูจน์กับ OpenCode v2.0.32

> ทุกข้อในตารางนี้ **รันจริงบนเครื่อง** ไม่ใช่การอ่าน docs

| เรื่อง | ผลจริง |
|---|---|
| permission action ที่มีจริง | `read` `edit` `glob` `grep` `list` `shell` `subagent` `webfetch` `websearch` `external_directory` `question` `doom_loop` `browser` (+ `submit_plan` จาก Plannotator) |
| alias | `bash` → `shell` · `task` → `subagent` **ใช้ได้จริง** (ไฟล์เขียน `bash: ask` → runtime เป็น `shell: ask`) |
| **คีย์ตาย** | `skill`, `lsp` **ไม่มีในสคีมา** → ใส่แล้วเงียบ ไม่ error (ต้นเหตุ "บรรทัดตาย") |
| `browser` | OpenCode ใส่ `deny` ให้เองทุก agent |
| ฟอร์มของ permission | `permission:` แผนที่ (canonical) · `permissions:` แบบลิสต์ยังอ่านได้ (deprecated) |
| `color` | ต้องเป็น hex 6 หลัก หรือชื่อ theme — ผิดแล้ว agent ถูกทิ้งทั้งไฟล์ |
| `mode` | `primary` · `subagent` · `all` |
| `hidden` | ใช้กับ primary ได้ (แม้ doc บอกว่าเฉพาะ subagent) |
| ซ่อน Plan/Build | `agent.plan/build = { mode:"subagent", hidden:true }` ใน config → ออกจาก primary จริง **ไม่ต้องลบไฟล์** |
| permission จาก config | **ต่อท้าย** กฎในไฟล์ (ไม่แทน) → ต้องส่งชุดเต็มทุกครั้ง; กฎท้ายสุดชนะ |
| `tui.json` | คีย์ลัดอยู่ที่ `keybinds.*` (ยืนยันจากไฟล์จริง) |
| `opencode debug agents` | คืน JSON array ของ agent พร้อม `mode`/`hidden`/`permissions` (ใช้เป็นแหล่งพิสูจน์) |
| Windows shim | `opencode` เป็น `.cmd/.ps1` → spawn ตรง ๆ ได้ ENOENT ต้องผ่าน shell |

---

## 15. Bug scan 5 รอบ

> รวม **13 จุด** (รายงานรอบแรกนับรวมบางจุดเป็น 12)

### รอบ 1 — static / contract (2)

| บั๊ก | อาการ | แก้ |
|---|---|---|
| `probe.mjs` spawn `opencode` ตรง ๆ | ENOENT บน Windows → probe ทั้งชุดใช้ไม่ได้ | รันผ่าน shell + retry 1 ครั้งถ้าลิสต์ว่าง + throw แทนรายงานผิด |
| `permission-level` ผ่านหลอก | ขึ้น PASS ทั้งที่ยังไม่เขียนค่าลง config | เช็คว่า key มีจริงใน `opencode.jsonc` ด้วย |

เพิ่มเทสต์สัญญา 6 ข้อ: probe kind มี impl · target resolve ได้ · policy ใช้เฉพาะ action จริง · settings resolve ได้ · frontmatter agent ผ่านสคีมา · โหมดหลักมี 4 ไฟล์

### รอบ 2 — jsonc adversarial (2)

| บั๊ก | อาการ | แก้ |
|---|---|---|
| `removeArrayItem` เขียน array ใหม่ทั้งก้อน | คอมเมนต์ใน array หาย | ตัดเฉพาะช่วงของสมาชิก คงคอมเมนต์ |
| ไฟล์มี BOM | `setAtPath` โยน error | รองรับ BOM และคงไว้ตอนเขียนกลับ |

เพิ่มเทสต์ 12 เคส: trailing comma · CRLF · BOM · key ซ้ำคนละชั้น · `{}` บรรทัดเดียว · สตริงที่มี `}{` · ชั้นกลางเป็นสตริง · ไทย/emoji · number/bool/null · array ซ้อน · ไฟล์พังต้อง throw

### รอบ 3 — API / security (2)

- path traversal เช็คด้วย `startsWith` → เปลี่ยนเป็น `path.relative`
- ปุ่ม dry-run ถูกบังคับยืนยัน → เพิ่ม `confirmUnlessParam` ใน `actions.json`
- เพิ่ม `tools/apitest.mjs` (integration test)

### รอบ 4 — UI (4)

- คีย์ลัดถูกเขียนเป็น **สตริง** → `tui.json` เสียรูป → แปลงเป็น array
- ปุ่ม `open-target` / `plannotator-locate` ไม่มีที่ให้กด → หน้าแรกแสดงปุ่มที่ยังไม่มีเจ้าภาพครบ
- ตัวกรอง "BAZER" จับผิด + `policies[0]` เปราะ → แก้ให้กรองจาก source / หา policy ตาม `mode`
- โค้ดตายใน palette + ป้าย `⌘ K` บน Windows → `Ctrl K`

### รอบ 5 — real-world (3)

- **README สัญญาว่า rollback แต่โค้ดแค่หยุด** → implement rollback จริง (ทดสอบด้วยการวางโฟลเดอร์ทับไฟล์ปลายทาง)
- `copy-tree` อ่านไฟล์เป็นข้อความ → **ไบนารีพัง** → ตรวจ NUL แล้ว copy แบบ byte
- ชื่อ backup ชนกัน → ใช้ hash ของพาธเต็มนำหน้า
- เพิ่มเทสต์: state.json พัง · history.tsv พัง · บันทึกก่อนติดตั้งต้องล้มอย่างสุภาพ

---

## 16. บั๊กหลังเปิดใช้: modal ว่าง + ปุ่มกดไม่ได้

### อาการที่ผู้ใช้เจอ
1. เข้า Console แล้วมี popup ว่าง ปิดไม่ได้
2. ปุ่มด้านในเหมือนใช้ไม่ได้

### ต้นเหตุ (บั๊กเดียว)
```css
/* ของเดิม */
.modal-root { display: grid; z-index: 60; ... }
```
`display: grid` ของ author CSS **ชนะ `[hidden]` ของเบราว์เซอร์** → modal ที่ยังไม่เปิดแสดงเป็นกล่องเปล่าเต็มจอ ทับทุกอย่าง → คลิกไปโดนแผ่นใส ไม่โดนปุ่ม; กดปิดก็ไม่หายเพราะ `hidden` ไม่มีผล

### แก้
```css
[hidden] { display: none !important; }
```
+ เทสต์กันกลับมา (selftest ตรวจว่ามี rule นี้)
+ `load()` ตรวจว่ามี `plan` จริง, `render()` ครอบ try/catch → แจ้ง toast แทนปล่อยหน้าจอค้าง
+ **ต้อง hard refresh (Ctrl+Shift+R) หนึ่งครั้ง** หลังอัปเดต

---

## 17. เคลียร์ของเก่าให้เหลือแต่ของใหม่

### 17.1 กลไก

| กลไก | ทำอะไร |
|---|---|
| `cleanup-plan` (read) | ดูว่าจะย้ายอะไร (dry-run) |
| `cleanup-old` (write, risk 3) | ย้ายของเก่าไป `var/quarantine/<stamp>/` + เขียน `quarantine.json`; ถอดปลั๊กอินเก่าออกจาก `opencode.jsonc` |
| `reset-template` (write, risk 3) | เขียนทับ `AGENTS.md` / `pstack-models.md` ด้วยแม่แบบใหม่ (backup ก่อน) |

### 17.2 ห้ากลุ่ม

| กลุ่ม | ค่าเริ่มต้น | หมายเหตุ |
|---|---|---|
| `agents` | ติ๊ก | agent ที่ไม่ใช่ของ MAJOR |
| `mirrors` | ติ๊ก | `BAZERs-EXTENSION-*` (ดีไซน์ใหม่ไม่ใช้ mirror) |
| `skills-other` | **ไม่ติ๊ก** | อาจเป็น skill ที่ผู้ใช้เขียนเอง — ต้องดูรายการก่อน |
| `plugins` | ติ๊ก | ปลั๊กอินใน config ที่ไม่ใช่ของ MAJOR |
| `plugin-dirs` | ติ๊ก | โฟลเดอร์ใน `.config/opencode/plugins` |

### 17.3 ลำดับที่แนะนำ

```
1. ติดตั้ง / อัพเดตทั้งหมด
2. ไฟล์ & สกิล → ของเก่า → ย้ายของเก่าไป quarantine
3. แถว AGENTS.md → รีเซ็ต (ถ้ายังมีกฎ BAZER-FLOW เก่า)
4. ตรวจของจริง → เปิด OpenCode ใหม่
```

### 17.4 สถานะเครื่องจริงตอนตรวจ (2026-10-20, ยังไม่ติดตั้ง)

```
agents 3   : comment-sicko.md · poteto-agent.md · poteto-mode.md
mirrors 6  : BAZERs-EXTENSION-{Advisor,Arena,Bazer,Buddha,Poteto,Snack}
skills-other 2
plugins 1  : ./plugins/bazer-flow
plugin-dirs 2
plan       : ok 1 · stale 11 · missing 5 · design 4 · foreign 11 · blockers 0
```

---

## 18. หลักฐานการทดสอบ

| ตรวจ | ผล |
|---|---|
| `node tools/selftest.mjs` | **33 passed** (jsonc 19 · plan/law 4 · idempotency 1 · contract 9) |
| `node tools/apitest.mjs` | **43 passed** (integration: token · error path · rollback · traversal · cleanup · reset) |
| ติดตั้งลง sandbox | **applied 16 · errors 0** · รันซ้ำ **applied 0** · `ok 17 · design 4 · blockers 0` |
| ล้มกลางทาง | apply fail → rollback อัตโนมัติ → ไฟล์ที่เพิ่งสร้างถูกลบจริง |
| binary | copy-tree รักษา byte เดิม |
| cleanup | 4 กลุ่มถูกย้าย · config ถอดปลั๊กอิน · quarantine มี manifest |
| reset template | เขียนทับ `AGENTS.md` จนกฎเก่าหาย · ปฏิเสธ entry ที่ไม่ใช่ template |
| law | R1–R4 ผ่านบน repo จริง |
| probe บนเครื่องจริง | `builtin-hidden` + `permission-level` ยังไม่ผ่าน (เพราะยังไม่ติดตั้ง) — **รายงานตรง** |

---

## 19. สิ่งที่ยังไม่ทำ / ความเสี่ยงที่รู้ตัว

| เรื่อง | สถานะ | หมายเหตุ |
|---|---|---|
| แพตช์ปุ่มอนุมัติ Plannotator | `design` | ต้องรัน `plannotator-locate` เจอไฟล์จริงก่อน |
| ปลั๊กอิน `bazer-flow` (gate) / `bazer-fire` (badge) | `design` | ดีไซน์ใหม่ใช้ permission + Plannotator ก่อน; เขียนเมื่อ probe พิสูจน์ว่ามีช่องรั่ว |
| PSTACK skills adapt เป็น OpenCode | `raw` | 53 ไฟล์ยังเป็นต้นฉบับ Cursor; มี `ADAPT-OPENCODE.md` ระบุ 5 จุด |
| macOS / Linux | ว่าง | ผู้ใช้กำหนดให้ทำเมื่อมีเครื่องจริง |
| lock.keybinds | เก็บ flag เท่านั้น | การเตือนคีย์ยังไม่ทำ |
| ด่าน "ห้ามเขียนก่อนอนุมัติ" | ระดับ prompt | ยังไม่มีตัวบังคับฮาร์ดแวร์ (เดิมเป็นปลั๊กอิน) |
| ทดสอบ UI ในเบราว์เซอร์จริง | ยังไม่ได้เห็นภาพ | ตรวจได้แค่ parse + action id + API ทุกเส้น |
| `install-tools` โหมดติดตั้งจริง | ไม่ได้รัน | กลัวไปติดตั้งของในเครื่องผู้ใช้ |
| slash command | ไม่มีโดยเจตนา | ใช้ `Shift+Tab`; เกณฑ์ก่อนเพิ่มอยู่ใน §13.5 |

---

## 20. บทเรียนที่ฝังไว้ในระบบ

| บทเรียน | ฝังที่ |
|---|---|
| กฎที่ไม่มีตัวบังคับ = ไม่มีกฎ | `law.json` + `law.mjs` + ปุ่มตรวจกฎ |
| คีย์ที่ไม่มีจริงจะเงียบ ไม่ error | `selftest` ตรวจ policy/agent กับ whitelist action |
| "มีไฟล์" ≠ "ทำงาน" | สถานะ `broken` + probes |
| เอกสารโกหกโมเดลได้ | GUIDELINE: ทุก path/ปุ่มที่อ้างต้องมีจริง + เทสต์ UI↔actions |
| `.bak` เกลื่อน = ไม่มีใครกล้าลบ | R4 + backup ไป `var/backups` |
| mirror ทำให้ต้อง sync ตลอด | ตัดทิ้ง ใช้ subagent จริง |
| `display` ทับ `[hidden]` | `[hidden]{display:none!important}` + เทสต์ CSS |
| PowerShell 5.1 อ่าน .ps1 ไม่มี BOM เป็น ANSI | script ใน `02SHORTCUT` เป็น ASCII ล้วน |
| ไฟล์ระบบของผู้ใช้ไม่ควรถูกจัดการแบบคาดเดา | ทุกอย่าง backup + quarantine + rollback |

---

## 21. คู่มือใช้งานเร็ว

### เปิด Console
```
ดับเบิลคลิก SETUP\MAJOR\BAZERCONSOLE\03WINDOWS\BAZER CONSOLE.vbs
```
หรือสร้างทางลัด:
```powershell
powershell -ExecutionPolicy Bypass -File ".\02SHORTCUT\create-desktop-shortcut.ps1"
```

### ตรวจเครื่อง
```powershell
node "BAZERCONSOLE\01MAIN\ACTIVE\SERVER\tools\selftest.mjs"
node "BAZERCONSOLE\01MAIN\ACTIVE\SERVER\tools\apitest.mjs"
```

### เปลี่ยนระดับเหมาเข่ง
`โหมด & สิทธิ์` → กดขั้น → ยืนยัน → เปิด OpenCode ใหม่

### เปลี่ยน model/effort
`ตั้งค่า → Quick Access` (4 โหมด) · `โหมด & สิทธิ์` (ARENA) · `ตั้งค่า → PSTACK roles` (15 role + preset)

### ย้อน
`ประวัติ` → ย้อนรอบนี้ · หรือ `ย้อนระดับก่อนหน้า` ที่บันได

### Commit format
```
<วลีสั้นมาก> <emoji>: <วลีอธิบายยาวขึ้น>
```

---

## 22. ลำดับเหตุการณ์ (chronology)

| ลำดับ | สิ่งที่เกิดขึ้น | ผลลัพธ์ |
|---|---|---|
| 1 | อ่านบริบทของเก่า (`SETUP/OPENCODE`) + สเปก pStack | สรุปว่าของเก่าพังเพราะไม่แยกข้อมูล/โปรแกรม |
| 2 | ตอบคำถาม 3 ข้อ (ไฟล์/โฟลเดอร์, กลไก Console, UX/UI) | ดีไซน์ตั้งต้น + คำถามค้าง |
| 3 | ตรวจของจริง (permission schema, hidden, config merge) | 5 ข้อเท็จจริงที่เปลี่ยนดีไซน์ |
| 4 | ผู้ใช้อนุมัติ + กำหนดโครงจากดิสก์ | เริ่มสร้างจริง |
| 5 | สร้าง GUIDELINE ทุกโฟลเดอร์ + MANIFEST + SERVER + UI | ระบบรันได้ใน sandbox |
| 6 | เขียนไฟล์โหมด 4 + subagent 4 + subsubagent 2 | ครบ 10 ไฟล์ agent |
| 7 | คัดลอก PSTACK 53 skill + บันทึก ADAPT | `status: raw` |
| 8 | ตั้งไอคอน (`BAZERCONSOLE.ico`) ทั้งโฟลเดอร์และทางลัด | ทางลัด Desktop + `desktop.ini` |
| 9 | bug scan 5 รอบ | แก้ 13 จุด + เทสต์ 76 ข้อ |
| 10 | ผู้ใช้เจอ modal ว่าง + ปุ่มไม่ทำงาน | แก้ CSS `[hidden]` (บั๊กเดียวกับปุ่ม) |
| 11 | เพิ่ม cleanup / reset template | เคลียร์ของเก่าได้โดยไม่ลบถาวร |
| 12 | เขียน LOGS.md (ไฟล์นี้) | บันทึกครบทั้งแชท |

---

## 23. ดัชนีไฟล์สำคัญ

| อยากรู้เรื่อง | ไปที่ |
|---|---|
| กฎแม่ + "ทำแบบนี้พังแน่" | `MAJOR/GUIDELINE.md` |
| สัญญาของ MANIFEST (ลึก) | `BAZERCONSOLE/01MAIN/PASSIVE/01MANIFEST/README.md` |
| ประวัติการแก้ | `.../01MANIFEST/CHANGELOG.md` |
| ที่อยู่ไฟล์ทั้งหมด | `.../01MANIFEST/manifest.json` |
| บันไดเหมาเข่ง | `.../01MANIFEST/policies.json` |
| ปุ่ม + ความเสี่ยง | `.../01MANIFEST/actions.json` |
| ข้อพิสูจน์ | `.../01MANIFEST/probes.json` |
| กฎ R1–R4 | `.../01MANIFEST/law.json` |
| บทบาท/โฟลว์ | `AGENT/01PRIMARY/*.md` |
| dependency + flow | `DOCS/FLOW.md` |
| ใช้แบบ non-code | `DOCS/GUIDE.md` |
| โค้ด Console | `BAZERCONSOLE/01MAIN/ACTIVE/SERVER/*.mjs` |
| หน้าจอ | `BAZERCONSOLE/01MAIN/ACTIVE/UI/*` |

---

## ภาคผนวก A — สรุปคำตอบของ "OUR SPEC FOR APPLYING REAL SYSTEM FILE"

1. **เรียกยังไง:** `manifest.json` = รายการเดียวของทุกอย่าง; Console อ่าน → คำนวณ `plan` → `apply`
2. **เช็คของครบ/ไม่ครบยังไง:** 5 สถานะ (`ok` `stale` `missing` `foreign` `broken`) + `design`/`raw`; ตรวจ hash จริง + probe กับ OpenCode จริง
3. **APPLY จริงยังไง:** backup → atomic write → อ่านกลับเทียบ hash → history; พัง = rollback ทั้งรอบ; รันซ้ำ = ไม่เขียนอะไร
4. **ของเก่าทำไมต้องมีที่ไป:** `quarantine` (ย้าย ไม่ลบ) + `quarantine.json` + `reset-template`

## ภาคผนวก B — ตัวเลขสรุป

| ตัวเลข | ค่า |
|---|---|
| ไฟล์ใน MAJOR | ~200 ไฟล์ / ~960 KB |
| primary modes | 4 |
| subagents (+sub-sub) | 4 + 2 |
| skills (PSTACK) | 53 |
| manifest entries | 21 |
| actions | 19 |
| probes | 8 |
| law rules | 4 |
| ladder levels | 5 |
| tests (selftest + apitest) | 33 + 43 = 76 |
| bugs found in 5 loops | 13 |
| ไฟล์ agent ที่เขียนใหม่ | 10 + 18 GUIDELINE |
