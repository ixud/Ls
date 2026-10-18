# Mode lock — ล็อก effort ไม่ให้หลุดเงียบ ๆ

ใช้เมื่อจะแตะ `opencode.jsonc`, `model.json`, `agents/*.md`, `cli.json` หรือ `console.config.json`

## กลไกจริง (ตรวจแล้วบน OpenCode 2.0.30)

| ลำดับ | ช่อง | ไฟล์ | ชนะ/แพ้ |
|---|---|---|---|
| 1 | `variant["<provider/model>"]` | `~/.local/state/opencode/model.json` | **ชนะทุกช่อง** (TUI เขียนตอนกด `Ctrl+T`) |
| 2 | `providers.<p>.models.<m>.{settings,options}.reasoningEffort` + `variants` | `~/.config/opencode/opencode.jsonc` | แพ้ `model.json` |
| 3 | `plugins[].options.{workflow,planningAgents}` | เดียวกัน | คุมว่าใครได้ `submit_plan` |
| 4 | project config (`./opencode.json` ขึ้นไปหา root) | โฟลเดอร์โปรเจกต์ | โหลดทีหลัง global → ทับได้ |
| 5 | `AGENTS.md` (ระดับเครื่อง) | `~/.config/opencode/AGENTS.md` | โหลดทุก session |

OpenCode 2 normalize คีย์ V1 (`provider` + `options.reasoningEffort` + variants แบบ object) เป็น `providers` + `settings` + `variants[]` ให้เอง — พิสูจน์ด้วย `opencode debug config`

## กฎ

1. **ห้ามแก้มือ** — สั่งผ่าน BAZER Console (action `set-mode-lock`) เพราะมี backup + ตรวจซ้ำให้
2. ถ้าจำเป็นต้องแก้มือจริง ๆ: `.bak` ก่อนทุกครั้ง แล้วรัน `opencode debug config` ยืนยัน (ระวัง cache ระดับวินาที — เว้น 2 วินาทีก่อนอ่าน)
3. หลังแก้ทุกครั้งรัน:
   ```powershell
   node "C:\BCS\00.02 LLM Slavery\SETUP\OPENCODE\CONSOLE\mode-lock.mjs"
   ```
   ต้องได้ `สรุป: ล็อกอยู่`
4. `FAIL R4` = `model.json` ถูกกด `Ctrl+T` ทับ → กด "ล็อกเลย" ใน Console ห้ามแก้ไฟล์เอง
5. `FAIL R5` = มี project config ทับคีย์ล็อก → แจ้งผู้ใช้ ไม่ลบไฟล์เขาเอง

## สิ่งที่ล็อกไม่ได้

- ผู้ใช้กด `Ctrl+T` กลาง session — ทำได้แค่ให้ทุก variant ชี้ค่าเดียวกัน + ตรวจเจอ
- variant ของ session ที่เปิดอยู่แล้ว — มีผลกับ session ใหม่เท่านั้น
- การสลับ agent ของ Plannotator หลังอนุมัติ (ขึ้นกับ `ctx.session.switchAgent` ของ host และการเทียบ `agent.name` ของปลั๊กอิน)
