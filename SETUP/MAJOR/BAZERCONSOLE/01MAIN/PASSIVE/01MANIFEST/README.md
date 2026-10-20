# MANIFEST — สัญญากลางของ BAZERCONSOLE

> **อ่านไฟล์นี้ก่อนแก้โฟลเดอร์นี้ทุกครั้ง**
> ถ้าคุณเป็น LLM ที่ถูกสั่งให้ "เพิ่มปุ่ม" "เพิ่มไฟล์ติดตั้ง" "เพิ่มโหมด" หรือ "แก้ที่อยู่ไฟล์" — คำตอบเกือบทุกครั้งอยู่ในโฟลเดอร์นี้ **ไม่ใช่ในโค้ด**

## 0) หลักคิดเดียวของโฟลเดอร์นี้

> **"อะไรก็ตามที่ Console ทำได้ ต้องประกาศไว้ที่นี่ก่อน"**

ของเก่าพังเพราะความจริงกระจาย: ชื่อโหมดซ้ำ 3 ที่ · path ฝังในโค้ด · ปุ่มเขียนมือใน HTML · ไม่มีใครรู้ว่าติดตั้งอะไรไปแล้ว
โฟลเดอร์นี้แก้ด้วยการเป็น **เจ้าของความจริง 6 เรื่อง** และให้ `ACTIVE/SERVER` อ่านไปใช้ (ห้ามเขียนซ้ำ — R2)

## 1) แผนที่ไฟล์

| ไฟล์ | เป็นเจ้าของเรื่อง | ใครอ่าน |
|---|---|---|
| `manifest.json` | **ของทุกชิ้น** + ที่อยู่ปลายทาง + วิธีติดตั้ง + สถานะ | `SERVER/plan.mjs`, `apply.mjs` |
| `policies.json` | **บันไดเหมาเข่ง** (5 ระดับ) + สิทธิ์ของแต่ละระดับ | `actions.mjs` (`policy-set`), UI |
| `settings.json` | **คอนโทรลหน้า ตั้งค่า** (Quick Access / ARENA / อื่น ๆ / PSTACK) | UI + `actions.mjs` |
| `actions.json` | **ปุ่มทุกปุ่ม** + ระดับความเสี่ยง + ต้องยืนยันไหม | UI + `law.mjs` (R3) |
| `probes.json` | **ข้อพิสูจน์กับของจริง** (broken state) | `probe.mjs` |
| `law.json` | **กฎ R1–R4** ในรูปข้อมูล | `law.mjs` |
| `env.json` | **ตัวแปรที่อยู่** (`${CONFIG}` ฯลฯ) | `env.mjs` |
| `schema.json` | รูปร่างของทุกไฟล์ข้างบน (ตรวจก่อนรัน) | `manifest.mjs` |
| `CHANGELOG.md` | ประวัติการแก้ + เหตุผล | มนุษย์ |

## 2) entry ใน `manifest.json`

```jsonc
{
  "id": "agent.buddha",              // ไม่ซ้ำ · ใช้เป็น key ของ state/history
  "kind": "agent|subagent|subsubagent|skill|plugin|command|config|template|launcher|patch",
  "title": "ชื่อที่ผู้ใช้อ่าน",
  "source": "AGENT/01PRIMARY/BUDDHA.md",   // relative จากราก MAJOR (ยกเว้น config)
  "target": "${CONFIG}/agents/buddha.md",  // ต้องเป็น ${VAR} เท่านั้น
  "strategy": "overwrite|create-only|template-once|jsonc-merge|jsonc-remove-array-item|copy-tree|patch|line",
  "owner": "ours|user|pstack",       // ours = ทับได้ · user = ห้ามทับเอง
  "status": "ready|raw|design",      // design = ยังไม่พร้อมติดตั้ง (UI ต้องบอกตรง ๆ)
  "auto": true,                       // false = ไม่ถูกรวมใน "ติดตั้ง/อัพเดตทั้งหมด"
  "exclude": ["GUIDELINE.md"],        // เฉพาะ copy-tree
  "value"/"valuePath"/"fromPolicy":   // เฉพาะ config
  "onlyIfMissing": true,              // เฉพาะ config: ห้ามทับค่าที่ผู้ใช้ตั้งแล้ว
  "proof": "builtin-hidden",          // probe ที่ต้องผ่านหลังติดตั้ง
  "why": "เหตุผลที่ของชิ้นนี้มีอยู่"    // บังคับสำหรับ status=design
}
```

### ความหมายของ `strategy` (มีเท่านี้ ห้ามเพิ่มเองโดยไม่อัพเดต README + schema)

| strategy | ทำอะไร | ใช้กับ |
|---|---|---|
| `overwrite` | เขียนทับถ้าเนื้อหาต่าง (hash) | ไฟล์ของเรา (`owner: ours`) |
| `create-only` | สร้างถ้ายังไม่มี | launcher, ไฟล์ที่ผู้ใช้อาจแก้ |
| `template-once` | สร้างครั้งเดียวจาก template, ไม่ทับ | `AGENTS.md`, `pstack-models.md` |
| `jsonc-merge` | ใส่/รวมค่าที่ `valuePath` โดย **คงคอมเมนต์เดิม** | `opencode.jsonc`, `tui.json` |
| `jsonc-remove-array-item` | ลบสมาชิกออกจาก array (เช่น `plugins`) | ถอดของเก่า |
| `copy-tree` | คัดลอกทั้งโฟลเดอร์ (มี exclude) | skills, plugins |
| `patch` | แพตช์ไฟล์ของเครื่องมืออื่น (ต้องมี hash ต้นฉบับ) | Plannotator |
| `line` | แทนทั้งบรรทัดที่ขึ้นต้นด้วย `line` | `pstack-models.md` |

## 3) สถานะที่ Console รายงาน (5 + 2)

| สถานะ | ความหมาย | สิ่งที่ผู้ใช้เห็น |
|---|---|---|
| `ok` | ตรงกับต้นทาง | เขียว |
| `stale` | มีอยู่แต่เนื้อหาต่าง | เหลือง + ปุ่มอัพเดต |
| `missing` | ยังไม่มี | แดง + ปุ่มติดตั้ง |
| `foreign` | มีในระบบแต่ไม่อยู่ใน manifest | เทา (ไม่แตะ) |
| `broken` | ของครบแต่ **probe ไม่ผ่าน** | แดงกระพริบ + บอก probe ที่ตก |
| `design` | ประกาศไว้แต่ยังไม่พร้อม | ฟ้า (ไม่ใช่ error) |
| `raw` | ติดตั้งได้แต่ยังไม่ adapt (skills) | เหลืองอ่อน + หมายเหตุ |

> **"มีไฟล์" ≠ "ทำงาน"** — สถานะ `broken` คือช่องที่ระบบเก่ามองไม่เห็น (ตั้ง config แล้ว OpenCode ไม่รับคีย์ → เขียวทั้งกระดานแต่ใช้ไม่ได้)

## 4) สัญญาของ `plan` และ `apply`

**`plan` (dry-run)** — ไม่เขียนอะไรเลย:
1. ตรวจกฎ R1–R4 (`law.mjs`)
2. ต่อ entry: หา target → เทียบ hash/ค่า → ออกสถานะ + `willWrite` + `diff`
3. สแกน `foreign` ในโฟลเดอร์ปลายทาง (`agents/`, `skills/`)
4. คืน `{entries[], summary{ok,stale,missing,broken,design,foreign}, law, blockers[]}`
   `blockers` = สิ่งที่ทำให้กด apply ไม่ได้ (เช่น law แดง, Node ต่ำกว่าเกณฑ์)

**`apply`** — ทำตามลำดับชั้นนี้เสมอ:
```
config → agents → subagents → skills → templates → launcher → patch → probe
```
ต่อ entry:
1. **backup** → `ACTIVE/var/backups/<stamp>/files/<target path>` + `manifest.json` (รายการ + hash เดิม)
2. **เขียน atomic** → temp ไฟล์ข้าง ๆ แล้ว `rename`
3. **อ่านกลับ** → hash ตรงกับที่เขียน (ไม่ตรง = throw)
4. **history** → `ACTIVE/var/history.tsv` (เวลา, entry, target, action, hash ก่อน/หลัง, stamp)
5. ล้มข้อใดข้อหนึ่ง → **หยุดทั้งชุด + rollback จาก backup ของรอบนั้น** (ไม่ไปต่อ)

รันซ้ำ: ต้องได้ `applied 0` (idempotent) — ถ้าไม่ หมายถึง strategy เขียนไม่นิ่ง ให้แก้ที่ strategy ไม่ใช่กดซ้ำ ๆ

## 5) `policies.json` — บันไดเหมาเข่ง

- เขียนที่ `agent.buddha.permission` ใน `opencode.jsonc` (ไม่แตะ `BUDDHA.md`)
- **แต่ละระดับส่ง permission ครบชุด** ไม่ใช่ส่วนต่าง → ตอนสลับระดับ ค่าเก่าถูกแทนทั้งก้อน (ไม่ค้างกฎเก่ามาชนะ)
- พิสูจน์แล้ว (v2.0.32): permission จาก config **ต่อท้าย** กฎในไฟล์และมีผลจริง
- ขั้น 1 = "ไม่น้อยกว่า BUDDHA รุ่นเก่า" ตามที่ผู้ใช้กำหนด
- ปุ่ม `policy-set` เขียนทันที **ไม่ต้องกดอัพเดตอีกที** (ต่างจากปุ่มอื่น) — เป็นข้อยกเว้นเดียวที่ตั้งใจ
- ทุกครั้งที่เปลี่ยน: backup + เก็บระดับก่อนหน้าไว้ให้ `policy-undo`

## 6) `settings.json` — ทำไมไม่มี "gang model"

ของเก่าใช้แนวคิด "จัด gang models" แล้วผูก gang เข้ากับ PSTACK — เราไม่ทำ เพราะ:
1. เพิ่มชั้นนามธรรมที่ต้องจำ (gang ไหนคุม role อะไร) โดยไม่ได้ลดงานที่ต้องทำจริง
2. เวลางานผิดพลาด จะไม่มีใครรู้ว่าผิดที่ gang หรือที่ role
3. ชุดนี้มี 15 role — น้อยพอที่จะเห็นทั้งหมดในหน้าเดียว

แทนที่ด้วย:
- **Quick Access** = 4 โหมด × (model + effort) + คีย์ + lock
- **ARENA** = 2 บรรทัด (runners / judge) แสดงในหน้า BUDDHA
- **PSTACK roles** = 15 บรรทัด + **preset 3 แบบ**: `ใช้ตัวเดียวทั้งชุด` · `แยกงานเขียน/งานตัดสิน` · `กำหนดเอง`
- ค่าที่บันทึกจะถูก **เฝ้า (lock)** ถ้าเปิด toggle: Console ตรวจตอนเปิดแอปและขึ้นแบนเนอร์ "มีคนเปลี่ยนค่า — กดล็อกคืน"

## 7) `actions.json` · `probes.json` · `law.json`

- **actions**: ทุก id ต้องมี handler ใน `ACTIVE/SERVER/actions.mjs` (R3 ตรวจให้) · `kind: read|write` · `risk.level 1|2|3` + `why` (ข้อความนี้ถูกแสดงบนปุ่มจริง) · `confirm: none|popup`
  - ระดับความเสี่ยง 3 ขั้นที่ UI ใช้: `1 ปลอดภัยมาก กดได้เลย` · `2 ดูเหมือนปลอดภัย แต่ตั้งสติดี ๆ` · `3 ไม่ปลอดภัย (กดได้ แต่เตือนแล้ว)`
- **probes**: `kind` ต้องมี implementation ใน `probe.mjs` · ใช้พิสูจน์ `broken` · ห้าม probe ที่ "อ่านไฟล์ของเราเองแล้วบอกว่าผ่าน"
- **law**: กฎเป็นข้อมูล — เพิ่มกฎ = เพิ่ม object + เพิ่ม implementation kind ใน `law.mjs` + อัพเดต README

## 8) วิธีเพิ่มของ 1 อย่าง (ทำตามลำดับ ห้ามข้าม)

1. วางไฟล์จริงในที่ของมัน (`AGENT/...` หรือ `CONFIGTEMPLATEFORAPPLY/...`) — **ห้ามวางในโฟลเดอร์นี้**
2. เพิ่ม entry ใน `manifest.json` (id, source, target, strategy, status, why ถ้า design)
3. ถ้าเป็น config → ระบุ `valuePath` + `value`/`fromPolicy` + `onlyIfMissing`
4. ถ้าต้องมีปุ่ม → เพิ่มใน `actions.json` + handler ใน `actions.mjs`
5. ถ้าต้องมีคอนโทรล → เพิ่มใน `settings.json`
6. เขียนบรรทัดใน `CHANGELOG.md` (Added/Changed/Fixed/Verified) แล้วรัน `ตรวจกฎ` + `ตรวจความครบ`

## 9) กับดักที่ **พิสูจน์แล้ว** บน OpenCode v2.0.32

| กับดัก | ความจริง |
|---|---|
| `permission: { skill: allow, lsp: allow }` | **คีย์ไม่มีจริง** → บรรทัดตาย ไม่ error ไม่เตือน |
| `bash:` / `task:` | ใช้ได้ (alias ไป `shell` / `subagent`) แต่ให้เขียนชื่อจริง |
| `color: accent` | ต้องเป็น hex 6 หลัก หรือชื่อ theme — ผิดแล้ว agent ถูกทิ้งทั้งไฟล์ |
| `permission` จาก config | **ต่อท้าย** กฎในไฟล์ (ไม่แทน) → ต้องส่งชุดเต็มทุกครั้ง |
| `hidden: true` | ใช้กับ primary ได้ (แม้ doc จะบอกว่าเฉพาะ subagent) |
| `permissions:` (ลิสต์) | ยังอ่านได้ แต่เป็นรูปแบบเก่า — ใช้ `permission:` แผนที่ |
| `plan` / `build` | ซ่อนได้ด้วย config (`mode: subagent` + `hidden: true`) ไม่ต้องลบไฟล์ |
| `tui.json` | คีย์ลัดอยู่ที่ `keybinds.*` (ยืนยันจากไฟล์จริง) |

## 10) เมื่อ OpenCode อัปเดต — protocol

1. **ห้ามเดา** — รัน `probe` ทั้งชุดก่อน
2. ถ้า probe ใหม่ที่ยังไม่มี → เพิ่มใน `probes.json` + implement kind ก่อนแก้ของเดิม
3. ถ้าผลเปลี่ยนจากที่บันทึกใน §9 → แก้ §9 + `CHANGELOG.md` **ใน commit เดียวกับที่แก้โค้ด**
4. ห้ามแก้ `AGENT/**` เพื่อ "กลบ" พฤติกรรมใหม่ของ OpenCode — แก้ที่ manifest/config ก่อน

## 11) สิ่งที่ยังเป็น design (อย่าคิดว่ามีแล้ว)

- `patch.plannotator` — ยังไม่แพตช์จริง; ต้องรัน `plannotator-locate` ให้เจอไฟล์ก่อน
- `plugin.bazer-flow` / `plugin.bazer-fire` — ยังไม่เขียนใหม่ (ดู `AGENT/04PLUGIN/GUIDELINE.md`)
- slash command — **ยังไม่มีโดยเจตนา** (สลับโหมดด้วย `Shift+Tab`) ถ้าจะเพิ่ม ต้องมีเหตุผลว่าดีกว่าปุ่มใน Console

## 12) ห้ามทำ (สรุปสั้น)

- ห้าม hardcode path ใน `ACTIVE/**` → ใช้ `${VAR}`
- ห้ามเพิ่ม `strategy` ใหม่โดยไม่แก้ schema + README + `apply.mjs`
- ห้ามให้ `owner: user` ถูกทับอัตโนมัติ
- ห้ามลบ entry ที่ `status: design` เพื่อ "ให้เขียว" — ต้องทำให้เสร็จหรือปิดด้วยเหตุผลใน CHANGELOG
- ห้ามเขียน `.bak` ข้างไฟล์จริง (R4)
