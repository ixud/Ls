# B — BUDDHA MODE + mode lock ในตัวโหมด

วันที่ 2026-10-18


## 1. "แต่ละ Mode แสดงผลไม่เหมือนเดิม" หมายถึงอะไรเชิงเทคนิค

ค่าที่กำหนดพฤติกรรมของเทิร์นหนึ่ง ๆ มาจาก 3 ชั้น เรียงตามการชนะ:

| ชั้น | อะไร | หลักฐาน |
|---|---|---|
| 1 | **agent ของข้อความล่าสุด** (`msg.info.agent`) | `dist/index.js:16517-16518`, `:16332-16342` |
| 2 | **body ของ agent นั้น** (กฎที่โมเดลอ่านจริง) | `opencode debug agents` → `system` คือ body ของไฟล์ตรง ๆ |
| 3 | **permission ใน frontmatter** + ที่ปลั๊กอินฉีดเพิ่ม | `dist/index.js:12822-12834` |

agent ตอนเปิดโปรแกรมมาจาก `default_agent` (ไม่ตั้ง = `build`) และ **แพ้ชั้นที่ 1 ทันทีที่ผู้ใช้กด `Tab`** — นี่คือจุดที่ทำให้ "โหมดที่เห็น" เปลี่ยนไปจากที่ตั้งใจ โดยไม่มีข้อความเตือน

สรุป: "mode lock" ที่ถูกต้องไม่ใช่การล็อกชื่อโหมดตอนเปิด แต่คือ (ก) ล็อก **ค่าที่โมเดลได้รับ** (effort/variant) (ข) ทำให้ **ตัวตนของโหมดตรวจได้** (marker + permission) (ค) มีตัวตรวจที่บอกได้ว่าหลุดตอนไหน


## 2. สิ่งที่เปลี่ยนในตัวโหมด (bundle เท่านั้น แล้วให้ Console คัดลอก)

| ไฟล์ | เปลี่ยน |
|---|---|
| `bundle/agents/buddha.md` | เพิ่ม marker `<!-- BAZER-MODE: buddha v1 -->` · เพิ่ม `permission:` ครบ (read/edit/glob/grep/list allow · bash ask · **task allow** เพราะ Arena ต้อง fan out) · เพิ่ม section "Mode lock" (ตารางช่อง, ห้ามแก้ config เอง, คำสั่งตรวจ) |
| `bundle/agents/bazer.md` | marker + section "Mode lock" (ย่อ) · คง `task: deny` และ permission เดิม |
| `bundle/agents/poteto-mode.md` | `# Snack` → `# Poteto Mode` · `%TEMP%\snack` → `%TEMP%\bazer` · เพิ่ม `permission:` · คงกฎ "โหมดนี้ไม่ใช้ Arena" |
| `bundle/agents/arena.md`, `advisor.md`, `snack.md` | เพิ่ม marker + `permission:` (advisor/snack มีอยู่แล้ว) |

**ไม่แตะ** `<!-- BAZER-FLOW: v1 -->` — `FLOW_MARKER_RE` (`console.mjs:82`) และ state `flow` ยังเขียว (`BAZER FLOW v1` = ok)


## 3. ตัวตรวจที่ผูกกับโหมด

`mode-lock.mjs` ตรวจ 6 โหมด (`advisor, arena, bazer, buddha, poteto-mode, snack`):

- `R9:<mode>` — มี marker + `permission:`
- `R10:<mode>` — หัวข้อแรกตรงชื่อไฟล์ (จับเคส `# Snack` ใน `poteto-mode.md` ได้จริง ก่อนแก้เป็น `FAIL`)

ผลหลังแก้: `PASS R9:*` และ `PASS R10:*` ครบ 12 ข้อ


## 4. สิ่งที่ยังเป็นข้อจำกัดของโหมด

1. mirror (`BAZERs-EXTENSION-*`) เป็น **ข้อความ** ไม่ใช่สิทธิ์ — สิทธิ์จริงเป็นของ agent ที่รันอยู่ (`console.mjs` เขียนเตือนไว้เอง)
2. การเรียกโหมดอื่นผ่าน mirror ยังพึ่ง "โมเดลอ่านคำสั่งแล้วทำตาม" ไม่มีการบังคับเชิงโครงสร้าง
3. `Tab` เปลี่ยน agent ได้เสมอ — ตัวตรวจจับได้แค่ว่า marker/permission ของโหมดยังตรง ไม่ได้ห้ามสลับ
