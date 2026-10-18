# A — Mode lock: กลไกจริง · ค่าที่ต้องเขียน · วิธีตรวจ · ข้อจำกัด

วันที่ 2026-10-18 · Windows · OpenCode CLI `2.0.30` · ตรวจด้วยการรันจริงทุกข้อ


## 1. กลไกจริง (ตอบ H1–H5)

| # | สมมติฐาน | ผล | หลักฐาน |
|---|---|---|---|
| H1 | `workflow: 'plan-agent'` คุม plan → approve → build | **จริงบางส่วน** — `workflow` คุมว่าใครได้ `submit_plan` และโหลด prompt ชุด plan ไหม แต่ **ไม่คุมการสลับ agent หลังอนุมัติ** | `dist/index.js:12706-12790`, `:12791-12834`, `:16518`, `:15231-15245` |
| H2 | `planningAgents` คุมว่าใครได้ `submit_plan` | **จริง** แต่สิทธิ์ถูกฉีดในหน่วยความจำตอนปลั๊กโหลด ไม่ได้เขียนลงไฟล์ | `dist/index.js:12822-12829` · `opencode debug agents` = 15 agent ไม่มี `submit_plan` สักตัว |
| H3 | agent ที่แสดง = agent ของ "ข้อความ" | **จริง** | `dist/index.js:16517-16518` (`lastUserAgent`), `:16332-16342` |
| H4 | `variants` ที่ถูกถอดทำให้ Max Effort เพี้ยน | **จริง** — แต่สาเหตุไม่ใช่ schema ผิด (ดู §1.1) | `console.mjs:993-1014` เขียนถูก · ของจริงคือไม่มีใครเรียกมัน |
| H5 | เกี่ยวพันกับ `serve-restricted.jsonc` | **ไม่เกี่ยว** — ไฟล์นั้นคุม provider/blacklist ของ server 4096 เท่านั้น | `serve-restricted.jsonc` มีแค่ `enabled_providers` + `blacklist` |

### 1.1 จุดที่ candidate ทุกตัวเข้าใจผิด และผมแก้ด้วยการทดสอบ

ทดสอบด้วย config ชั่วคราวในโฟลเดอร์ temp (cwd = โฟลเดอร์ที่มี `opencode.json`) แล้วรัน `opencode debug config`:

```powershell
# A: รูปที่ Console เขียน (V1)
'{"provider":{"opencode-go":{"models":{"deepseek-v4.1-flash":{"options":{"reasoningEffort":"max"},"variants":{"low":{"reasoningEffort":"max"},"high":{"reasoningEffort":"max"},"max":{"reasoningEffort":"max"}}}}}}}'
# B: รูปตามเอกสาร V2
'{"providers":{"opencode-go":{"models":{"deepseek-v4.1-flash":{"settings":{"reasoningEffort":"max"},"variants":[{"id":"low","settings":{"reasoningEffort":"max"}},...]}}}}}'
```

ผลของ **ทั้งสองรูป** ออกมาเหมือนกัน:

```json
{"providers":{"opencode-go":{"models":{"deepseek-v4.1-flash":{"settings":{"reasoningEffort":"max"},"variants":[{"id":"low","settings":{"reasoningEffort":"max"}},{"id":"high",...},{"id":"max",...}]}}}}}
```

⇒ OpenCode 2 normalize `provider` → `providers`, `options` → `settings`, object-map variants → `variants[]` ให้เอง **ตัวเขียนเดิมของ Console ใช้ได้** ที่หายไปคือ "ไม่มีใครกดปุ่ม"

ข้อควรระวังที่เจอจากการทดสอบ: `opencode debug config` **cache ตาม mtime ระดับวินาที** — เขียนแล้วอ่านทันทีในวินาทีเดียวได้ผลเก่า ต้องเว้น ~2 วินาที


## 2. ค่าที่ต้องเขียนให้ครบทุกช่อง + ลำดับการชนะ

| ลำดับ | ช่อง | ไฟล์ / คีย์ | ค่าที่ต้องเป็น |
|---|---|---|---|
| 1 (ชนะสุด) | variant ที่ผู้ใช้เลือก | `~/.local/state/opencode/model.json` → `variant["opencode-go/deepseek-v4.1-flash"]` | `"max"` |
| 2 | effort + variants ของโมเดล | `~/.config/opencode/opencode.jsonc` → `provider.opencode-go.models.deepseek-v4.1-flash.options.reasoningEffort` + `.variants.{low,high,max}` | `"max"` ทุกช่อง |
| 3 | ใครได้ `submit_plan` | เดียวกัน → `plugins[].options.workflow` + `.planningAgents` | `plan-agent` + 5 ตัว |
| 4 | project config | `<โปรเจกต์>/opencode.json` (ค้นขึ้นไปถึง root) | ต้องไม่มี `model`/`plugins`/`provider` |
| 5 | กฎระดับเครื่อง | `~/.config/opencode/AGENTS.md` | 2 กฎ + marker `BAZER-MODE-RULES` |

ของจริงหลังล็อก (ยืนยันด้วย `opencode debug config` หลัง sleep 2 วินาที):

```json
{"providers":{"opencode-go":{"models":{"deepseek-v4.1-flash":{"settings":{"reasoningEffort":"max"},"variants":[{"id":"low","settings":{"reasoningEffort":"max"}},{"id":"high","settings":{"reasoningEffort":"max"}},{"id":"max","settings":{"reasoningEffort":"max"}}]}}}}}
```


## 3. วิธีตรวจว่าล็อกอยู่ — คำสั่งเดียว

```powershell
node "C:\BCS\00.02 LLM Slavery\SETUP\OPENCODE\CONSOLE\mode-lock.mjs"
```

ผลจริงตอนนี้:

```
สรุป: ล็อกอยู่ (22 PASS)
สวิตช์: modeLock.on = true · ค่าที่ต้องเป็น: effort "max"
exit=0
```

พิสูจน์ว่าจับ drift ได้จริง: จำลองการกด `Ctrl+T` โดยแก้ `model.json` เป็น `default` → ตัวตรวจตอบ

```
FAIL R4   model.json variant = default — TUI ค่านี้ชนะ config ต้องเป็น "max"
exit=1
```

แล้วกด `set-mode-lock` ผ่าน Console กลับมา → `สรุป: ล็อกอยู่ (22 PASS)`

ตัวตรวจชุดเดียวกันถูกเรียกใน `/api/verify` เป็นข้อ `5b mode lock` (แสดง `ok · mode lock ครบ`)


## 4. ข้อจำกัดที่ล็อกไม่ได้

1. **ผู้ใช้กด `Ctrl+T` กลาง session** — ทำได้แค่ให้ทุก variant ชี้ค่าเดียวกัน + ตรวจเจอ (R4) · ปิดคีย์ได้ด้วย `tui.json` → `keybinds["variant.cycle"]="none"` แต่ยังไม่ได้เปิด (ต้องขออนุญาต)
2. **session ที่เปิดอยู่แล้ว** ถือ variant เดิมจนจบ — การล็อกมีผลกับ session ใหม่
3. **`/models`, `--model`, `model:` ใน frontmatter** เลือกโมเดลอื่นที่ไม่มี variant ที่ล็อกได้ — ต้องล็อกทุกโมเดลที่ใช้จริง (`console.config.json` → `modelSets`)
4. **ปุ่ม approve→สลับเป็น `build` ของ Plannotator** — ขึ้นกับ `ctx.session.switchAgent` ของ host และการเทียบ `agent.name === "build"` (`dist/index.js:14216`) ขณะที่ `opencode debug agents` คืน `id=build, name=Build` ⇒ เป็นไปได้สูงที่การเทียบพลาด แต่ **ยังยืนยันกับ server ไม่ได้** (API 2.0 ต้องมี key) — บันทึกเป็น R11 `INFO`
5. **`OPENCODE_CONFIG`** ที่ `opencode-serve.vbs` ใช้ชี้ `serve-restricted.jsonc` ทำให้ server 4096 เห็น config คนละชุดกับ TUI — ไม่ใช่ช่องของ mode lock แต่เป็นเหตุที่ server กับ TUI เห็นโมเดลไม่เหมือนกัน
