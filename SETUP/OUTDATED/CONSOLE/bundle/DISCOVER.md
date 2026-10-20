# DISCOVER — ของเก่า (fork install) ทำงานได้แค่ไหน


## บทสรุปตัวเลข

**รวมประมาณ 70%** สำหรับ "ใช้งานจริงได้แบบไม่ต้องดัดแปลง" โดยแยกเป็นชั้น

| ชั้น | คะแนน | ความหมาย |
|---|---|---|
| โหลด/มองเห็น skills | **100%** | ทั้ง 52 ตัวโหลดในทุก agent รวม build และ arena |
| ใช้ skill เดี่ยวตาม description | **~90%** | เนื้อหาส่วนใหญ่ไม่ผูกกับ Cursor ใช้ได้ทันที |
| orchestration ผ่าน poteto-mode | **~60%** | playbook ครบ แต่ delegate/model มีสะดุด |
| config โมเดลต่อ role | **~0%** | ไฟล์ผิดที่ + ว่างเปล่า (แต่ผลกระทบจริงจำกัด) |

วิธีคิด: ประเมินจากโครงสร้างไฟล์ที่โหลดจริงใน OpenCode + ข้อความข้างใน ไม่ใช่การรันทดสอบทุกเคส ตัวเลขเป็นค่าประมาณเชิงวิศวกรรม มีหลักฐานประกอบในตารางถัดไป


## เคสการใช้งานทีละกรณี

| # | เคส | % | ของเก่าทำได้แค่ไหน |
|---|---|---|---|
| 1 | skill เดี่ยวที่ description ตรง (how, why, teach, unslop, tdd, bro, ketchup, correct, benchmark-checklist) | 100 | เรียกใช้เองได้เลย ไม่สะดุด |
| 2 | principles 24 ตัว | 100 | อ่านกฎได้ครบ ใช้กำกับการตัดสินใจได้ |
| 3 | skill ที่ต้อง spawn subagent (swarm, arena, architect, interrogate, reflect, how, why) | 60 | มี note "Other harnesses" ให้แปลงเป็น `task/general` แต่ body หลักยังสั่งแบบ Cursor (`generalPurpose`, `cloud`, `readonly`) — parent ต้องแปลเองทุกครั้ง |
| 4 | poteto-agent delegate ใน playbook | 50 | ไม่ได้ register เป็น subagent; เอกสารมี fallback (spawn `general` + preamble อ่าน SKILL.md) — ได้ผลถ้า parent ทำตามเป๊ะ |
| 5 | /no-comments + comment-sicko | 65 | มี fallback ชัดเจนในไฟล์: OpenCode ใช้ `task` + `subagent_type: general` + prompt จาก `references/comment-sicko.md` |
| 6 | /poteto-mode เป็น slash command | 0 | ไม่มีคำสั่ง — ต้องพิมพ์ชื่อในข้อความให้ model เรียก skill เอง |
| 7 | poteto-mode flow เต็ม (playbook + delegates + model) | 60 | skill + playbooks 23 ตัวครบ, มี Harness section ของ fork; แต่ตัว delegate ตามข้อ 3-4 และโมเดลไม่มีผล |
| 8 | โมเดลต่อ role (grok=code, opus=judgment) | 5 | ไฟล์ `pstack-models.md` หายจากที่ที่ skill อ่าน (มีแต่ไฟล์ว่างผิดที่) → ทุก delegate ใช้โมเดล parent |
| 9 | recall / reflect / automate-me (อ่าน transcript) | 70 | fork map path OpenCode storage (`~/.local/share/opencode/storage/`) ให้แล้วบางไฟล์ |
| 10 | show-me-your-work / eval / session-pickup | 50 | มี multi-harness list แต่รายการไม่มี OpenCode ชัด ๆ (มี Cursor/Claude Code/Pi/Codex) — agent ต้องหา storage เอง |
| 11 | shipping / babysit กับ PR จริง | 60 | flow GitHub (`gh`/origin) ทำงาน; แต่ยังบอกให้ verifier เป็น Cursor cloud agent — ต้องแปลงเป็น local subagent เอง |
| 12 | orchestrate (program ยาวหลายวัน) | 40 | store + CLI (`orch`) มี; แต่ทั้ง playbook อิง cloud/`environment` และต้องมี Bun |
| 13 | worktree-audit.sh | 20 | สคริปต์ยังชี้ `~/.cursor/projects/...` (transcript scan พัง) + ต้อง shell แบบ POSIX + `rg` |
| 14 | ความครบของ skills (54 ตัว) | 96 | 52/54 — ขาด `in-your-own-words`, `sharpen` |
| 15 | arena agent ที่ทำมือไว้ (`arena.md`) | 100 | ทำงานได้ แปลง mapping ให้แล้วในตัว |


## หลักฐานดิบ (จากเครื่อง ณ 15 ต.ค. 2026)

- `~/.agents/skills/` = 60 โฟลเดอร์ → pstack 52 + อื่น ๆ 8 (`find-skills` 1, `plannotator-*` 7); รวมไฟล์ .md ทั้งหมด 123 ไฟล์

- grep ทั้งชุด 123 ไฟล์: อ้าง `.cursor` 19 ไฟล์ (ส่วนใหญ่เป็นเอกสารแบบสองทาง "Cursor: ... / harness อื่น: ..."), `generalPurpose` 5 ไฟล์, พารามิเตอร์ cloud 3 ไฟล์, `run_in_background` 5, `readonly` 8, `agent-transcripts` 8

- 16 ไฟล์มี mapping หลาย-harness (OpenCode/Claude Code/Codex/Pi) หรือ Harness section

- `~/.agents/skills/pstack-models.md` = ไฟล์เปล่า 0 bytes (ตำแหน่งผิด) และ `~/.agents/pstack-models.md` ไม่มี → ตั้งค่าโมเดลไม่เคยถูกอ่าน

- `~/.config/opencode/agents/` มี `arena.md` ตัวเดียว; `~/.config/opencode/commands/` มีแต่ plannotator 3 ตัว; ไม่มี poteto-agent / comment-sicko / poteto-mode agent หรือ command

- ยืนยันสดใน session ปัจจุบัน (โหมด build): ทั้ง 52 skills อยู่ในลิสต์ที่โหลด


## สรุปข้อแตกต่างจากชุดใหม่ (step 2)

ของเก่าคือ upstream pstack + หมายเหตุหลาย-harness (บางไฟล์) — ทำงานได้ แต่ทุก delegate ที่ spawn ต้องพึ่ง "การแปลถูก" ของ parent model ทุกครั้ง

ชุดใหม่ที่ build ไว้แก้ตรงจุดนี้: body ถูกแก้ให้ตรง OpenCode ในไฟล์เอง (ไม่ต้องให้ model เดาแปล), มี agents 3 ตัว register จริง, command `/poteto-mode`, config template, แก้ path transcript/verify ครบ, เพิ่ม 2 skills ที่ขาด

ประมาณการหลัง apply: **~95%** — ที่เหลือไม่ครบ 100% คือ scripts ที่ต้องมี Bun, bot triage ของ Cursor, และ docs ต้นฉบับที่ยังอ้าง Cursor (ใช้ประกอบความเข้าใจเท่านั้น)



## ไทม์ไลน์: อัปเดตเป็น OpenCode V2 (16 ต.ค. 2026)

**เกิดอะไร.** เครื่องอัปเดต OpenCode เป็น V2 (v2.0.30) แล้วรู้สึกว่า plannotator กับ pstack หายไป

**ตรวจแล้วไฟล์ไม่หาย.** 60 skill dirs, agents, commands, plannotator CLI และ plugin cache อยู่ครบ — ปัญหาอยู่ที่พฤติกรรมของ V2 ที่เปลี่ยนไป 3 จุด

**สาเหตุที่ 1 — pstack skills ถูกซ่อนจาก model.** V2 เคารพ `disable-model-invocation: true` จริง (เทียบเท่า `metadata.opencode/autoinvoke: false`) ชุดเก่าติดฟิลด์นี้ 51 จาก 52 skills → model ไม่เห็น ไม่ auto-trigger ตัวเลข ~70% ข้างต้นจึงเป็นภาพบน V1; บน V2 ใช้ได้แค่ `@mention` หรือระบุ ID ตรง ๆ จนกว่าจะใช้ชุดใหม่

**สาเหตุที่ 2 — arena agent ถูกทิ้งทั้งไฟล์.** V2 บังคับ `color` ของ agent เป็น hex 6 หลัก ค่าเดิม `color: accent` เลยทำให้ agent ไม่โหลด — แก้เป็น `"#f5c542"` แล้ว และยืนยันด้วย `opencode debug agents` ว่า `arena` กลับมาในลิสต์ (เปิด session ใหม่จะเห็นใน picker)

**สาเหตุที่ 3 — CLI flag ย้าย.** `opencode --agent arena` แบบ top-level ไม่มีใน V2 ใช้ `opencode run --agent arena "<ข้อความ>"` หรือเลือก agent ใน TUI

**plannotator ไม่หาย.** plugin v0.28.22 มี V2 adapter ในตัว โหลดสำเร็จ; CLI, commands 3 ตัว และ skills 7 ตัวครบ เจอแค่ warning `duplicate skill name` 4 ตัว จากสำเนาซ้ำระหว่าง `~/.claude/skills` กับ `~/.agents/skills` (ไม่กระทบการใช้งาน)

**เรื่องประกอบใน log (คนละเคสแต่ควรรู้).** plugin `plan-gate.js` ของโปรเจกต์งานอื่นบนเครื่องนี้ พังบน V2 (plugin API เก่า — ยังไม่แก้ รอตัดสินใจพอร์ตเป็น V2 หรือเลิกใช้ เพราะ Plannotator มีกลไก planningAgents แทนได้บางส่วน) และมี error credential ของ provider `opencode-go` ครั้งเดียวช่วงเช้า

**แก้แล้ว.** `arena.md` (live); ชุด build ปรับเป็น V2-native ครบ (ถอด `disable-model-invocation` 53 ไฟล์, agents ใช้ hex color + permissions array + ไม่มี `name` field, อัปเดต docs)

**ยังค้าง.** step 2 apply — จนกว่าจะสั่ง pstack บนเครื่องยังใช้ได้แค่ระดับ skill เดี่ยวผ่าน `@mention`
