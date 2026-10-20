# ADAPT-OPENCODE — บันทึกการดัดแปลง PSTACK

สถานะ: **raw** (คัดลอกมาตรงจาก repo pStack ยังไม่ดัดแปลง)

## ที่มา
- ต้นฉบับ: `C:\BCS\00.00 BCS Launch\00.03 pStack\pstack\skills`
- คัดลอกเมื่อ: 2026-10-19 · 53 skill (ตัด `arena` ออก เพราะย้ายไป `AGENT/02SUBAGENT/ARENA.md`)

## สิ่งที่ยังต้องตัดสิน/แก้ (ห้ามทำเงียบ ๆ)

| # | เรื่อง | สถานะ | หมายเหตุ |
|---|---|---|---|
| 1 | `disable-model-invocation: true` ใน 53 ไฟล์ | ยังไม่แก้ | V2 จะซ่อน skill จาก model (โหลดได้ด้วยชื่อเท่านั้น) — ผลคือ skill ไม่ auto-invoke แต่ POTETO โหลดด้วยชื่อได้ |
| 2 | อ้าง `.cursor/rules/pstack-models.mdc` | ยังไม่แก้ | ต้องชี้เป็น `~/.agents/pstack-models.md` |
| 3 | อ้าง `Task` tool / `run_in_background` | ยังไม่แก้ | OpenCode ใช้ `subagent` (และ `background: true`) |
| 4 | อ้าง cloud agents / worktrees ของ Cursor | ยังไม่แก้ | ต้องแปลงเป็นโฟลเดอร์ local ใต้ `%TEMP%\bazer\` |
| 5 | `arena` skill | **ตัดออกแล้ว** | ใช้ `AGENT/02SUBAGENT/ARENA.md` แทน |

## วิธีทำ adaptation (เมื่อพร้อม)

1. เขียนสคริปต์แปลงที่ `BAZERCONSOLE/01MAIN/ACTIVE/SERVER/tools/` (ไม่ใช่ในโฟลเดอร์นี้ — R1)
2. รันกับ **สำเนา** ก่อน แล้วออกรายงาน diff ให้คนตรวจ
3. ตรวจว่าไม่มีไฟล์ไหนเสีย (frontmatter ยังถูก, ลิงก์ภายในยังชี้ถูก)
4. อัพเดตตารางนี้ + `MANIFEST/CHANGELOG.md` แล้วเปลี่ยนสถานะเป็น `adapted`
5. ห้ามแก้ด้วยมือทีละไฟล์ 53 ครั้ง — จะตรวจย้อนหลังไม่ได้
