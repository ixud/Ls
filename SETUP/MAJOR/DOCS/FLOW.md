# FLOW — dependency และเส้นทางของไฟล์

> **EN summary:** MAJOR is the single source of truth; BAZERCONSOLE applies it to the machine (backup → atomic write → verify → history). Modes: BUDDHA (plan → gate → arena → gate → builder inline → commit), BAZER (single plan → gate → builder inline → commit). Old files are quarantined, not deleted. Gates are enforced by prompt rules + Plannotator (the hardware gate plugin is deferred).

## 1) อะไรคุมอะไร

```
MAJOR (แหล่งความจริง)
   │  MANIFEST + AGENT + CONFIGTEMPLATEFORAPPLY
   ▼
BAZERCONSOLE (ตัวจัดการ)
   │  plan → apply (backup + atomic + history)
   ▼
ไฟล์ระบบของ OpenCode
   %USERPROFILE%\.config\opencode\...      agents · opencode.jsonc · tui.json · AGENTS.md
   %USERPROFILE%\.agents\skills\...        skills
   %USERPROFILE%\.agents\pstack-models.md  โมเดลของ PSTACK
   ▼
OpenCode (อ่านตอนเปิดเซสชัน)
```

**กติกา:** แก้ที่ MAJOR เท่านั้น → กด `ติดตั้ง / อัพเดตทั้งหมด` → เปิด OpenCode ใหม่
ห้ามแก้ไฟล์ปลายทางด้วยมือ (Console จะมองว่าเป็น `stale` และทับเมื่อสั่ง)

## 2) เส้นทางไฟล์ (จาก `manifest.json`)

| ของ | ต้นทาง | ปลายทาง |
|---|---|---|
| โหมด 4 ตัว | `AGENT/01PRIMARY/*.md` | `${CONFIG}/agents/*.md` |
| subagent 4 + 2 | `AGENT/02SUBAGENT/**` | `${CONFIG}/agents/*.md` |
| skills | `AGENT/03SKILLS/PSTACK/**` | `${SKILLS}/**` |
| กฎระดับเครื่อง | `CONFIGTEMPLATEFORAPPLY/AGENTS.md.template` | `${CONFIG}/AGENTS.md` (ครั้งเดียว) |
| โมเดล PSTACK | `CONFIGTEMPLATEFORAPPLY/pstack-models.md.template` | `${HOME}/.agents/pstack-models.md` (ครั้งเดียว) |
| config | (Console เขียน) | `${CONFIG}/opencode.jsonc` |
| คีย์ลัด | (Console เขียน) | `${CONFIG}/tui.json` |

## 3) โฟลว์ของแต่ละโหมด

**BUDDHA** (ทุกเฟสในเซสชันเดียว — ไม่สลับ agent)

```
P0 อ่านโจทย์
 → P1 poteto: แผน Arena  (# GATE 1 — ARENA PLAN)
 → P2 plannotator: ยื่น    → ผู้ใช้อนุมัติ / feedback
 → P3 arena: runners (background) + judge → base + grafts
 → P4 poteto: แผนแก้โค้ด  (# GATE 2 — BUILD PLAN)
 → P5 plannotator: ยื่น   → ผู้ใช้อนุมัติ / feedback
 → P6 builder (inline) ลงมือแก้ → Buddha ตรวจ/พิสูจน์ → bug scan 3 รอบ → สรุป → commit
```

**BAZER** (แผนเดียว)

```
B1 อ่านเฉพาะไฟล์ที่ระบุพาธ
 → B2 เขียนแผน (# BAZER — PLAN)
 → B3 plannotator → อนุมัติ / feedback
 → B4 builder (inline) ลงมือแก้ → Bazer ตรวจ/พิสูจน์ → B5 bug scan 3 รอบ → สรุป → commit
```

**SNACK** — ตอบสั้น อ่าน/แก้ได้เฉพาะพาธที่ระบุ ไม่ค้นหา ไม่รันคำสั่ง
**ADVISOR** — อ่านได้เฉพาะพาธที่ระบุ แก้ไม่ได้ ถ้าต้องแก้ให้บอกผู้ใช้สลับไป SNACK

## 4) ด่าน (gate) ถูกบังคับด้วยอะไร

| ด่าน | กลไก | สถานะ |
|---|---|---|
| ก่อนอนุมัติ ห้ามเขียนไฟล์โปรเจกต์ | กฎในไฟล์โหมด + งานชั่วคราวลง `%TEMP%\bazer\` | มี (ระดับ prompt) |
| ระดับสิทธิ์ของ BUDDHA | `agent.buddha.permission` ใน config — เขียนโดย Console | มี (บังคับจริง) |
| อนุมัติแผน | Plannotator (`submit_plan` หรือ CLI) | มี (ต้องติดตั้ง Plannotator) |
| บังคับด้วยปลั๊กอิน | `bazer-flow` รุ่นใหม่ | **ยังไม่ทำ** (design) |

> ข้อจำกัดที่รู้ตัว: ด่าน "ห้ามเขียนก่อนอนุมัติ" ยังไม่มีตัวบังคับระดับฮาร์ดแวร์ใน v0.1 — ถ้าต้องการ ให้เขียนปลั๊กอินใหม่หลัง probe พิสูจน์ว่าจำเป็น (ดู `AGENT/04PLUGIN/GUIDELINE.md`)

## 5) Builder เป็น subagent (inline) — เพิ่มภายหลัง

- `BUILDER.md` = `mode: subagent` — **ไม่โผล่ใน Shift+Tab** และไม่ใช่ primary agent
- BAZER (B4) และ BUDDHA (P6) เรียกด้วยชื่อ `builder` แบบ inline
- รับ **เนื้อหาแผนที่อนุมัติแล้ว** (ไม่ใช่พาธ) → แก้เฉพาะไฟล์ในแผน
- ตรวจ/พิสูจน์/สรุป/commit เป็นงานของโหมดหลัก
- `selftest` บังคับว่าไฟล์ subagent ทุกตัวต้องเป็น `mode: subagent` (รวม builder)

## 6) ปุ่มในหน้าเว็บใช้ `cta`

- ทุก action ใน `actions.json` มี `cta` = ข้อความบนปุ่ม (เช่น "ติดตั้ง / อัพเดตทั้งหมด")
- หน้า ภาพรวม มีแถบปุ่มหลัก 3 ปุ่ม (ตรวจทุกอย่าง · ตรวจว่ามีอะไรใหม่ · ติดตั้ง) แยกจากการ์ดเครื่องมืออื่น
- เพิ่ม action ใหม่ = ต้องมี `cta` (selftest ตรวจ) + handler (R3 ตรวจ)

## 6) ลำดับหลังติดตั้ง/อัพเดต

1. `ตรวจกฎ` → ต้องผ่านทั้ง 4 ข้อ
2. `ตรวจว่ามีอะไรใหม่` → ดูว่าจะเขียนอะไร
3. `ติดตั้ง / อัพเดตทั้งหมด`
4. `ตรวจของจริง` (probe) → `builtin-hidden`, `modes-present`, `permission-level` ต้องผ่าน
5. ปิด-เปิด OpenCode → เปิดเซสชันใหม่

## 7) ตัวตรวจ

| ตรวจ | ทำอะไร |
|---|---|
| `node ACTIVE/SERVER/tools/selftest.mjs` | jsonc · plan · law · idempotency · contract (frontmatter/permission/policy) |
| `node ACTIVE/SERVER/tools/apitest.mjs` | integration: สตาร์ทเซิร์ฟเวอร์เอง แล้วยิง HTTP (token · error path · rollback · traversal) |
| `law.json` | R1–R4 |
| `probes.json` | `opencode debug agents` ของจริง |
| `history.tsv` | ทุกครั้งที่เขียนไฟล์ + ย้อนได้ |

## 8) สิ่งที่ยังไม่ทำ (อย่าคิดว่ามี)

- แพตช์ปุ่มอนุมัติ Plannotator (`status: design`)
- ปลั๊กอิน gate / badge (`status: design`)
- macOS / Linux launcher
- adapt PSTACK skills เป็น OpenCode (`status: raw`)
