# CHECKS — บันทึกผลตรวจ (bug scan 3 รอบ)

วันที่: 18 ต.ค. 2026 · เครื่อง: Windows / OpenCode V2 · โฟลเดอร์: `SETUP/OPENCODE/CONSOLE`
วิธีรัน: ทดสอบใน sandbox (`%TEMP%\bazer-console-test`) โดยตั้ง `USERPROFILE` ปลอม เพื่อไม่แตะ config จริงของเครื่อง
คำสั่งหลัก: `node --check console.mjs` · เรียก API ของแอปที่รันใน sandbox (`/api/state`, `/api/verify`, `/api/action`)


## รอบ 1 — static

| ตรวจ | ผล |
|---|---|
| `node --check console.mjs` | ผ่าน (exit 0) |
| สคริปต์ใน `console.html` parse ได้ (`new Function`) | ผ่าน (81,652 chars) |
| marker `BAZER-FLOW` ใน `bundle/agents/buddha.md` | พบครบคู่ (บรรทัด 11 และ 32) |
| `git status` | ไม่มีไฟล์แปลกปลอม ถูก gitignore ครบ (`console.runtime.json`, `backups/`, `history.tsv`, `console.config.json`) |


## รอบ 2 — เครื่องใหม่ (fresh install)

คำสั่ง: `setup-preview` → `setup-apply` (ทุกขั้นที่ `will`) → `update-check` → `verify`

| ตรวจ | ผล |
|---|---|
| setup-preview | 11 ขั้นตอน พร้อมติดตั้งทั้งหมด |
| setup-apply | สำเร็จ (skills +63 · agents +8 · commands +1 · AGENTS.md · pstack-models.md · bazer-fire · serve-restricted · launch +5 · mirror) |
| update-check หลังติดตั้ง | ต่าง 0 · ใหม่ 0 · เหมือน 69 |
| templates | `AGENTS.md=present` · `pstack-models.md=present` |
| `state.flow` | `{bundle:"1", installed:"1", ok:true}` |
| mirror | ตรงครบ 6/6 |
| verify | `planningAgents` ok · mirror ok · `BAZER FLOW v1` ok (fail 1 รายการ = Server 4096 ซึ่งไม่มีใน sandbox) |


## รอบ 3 — เครื่องเก่า (git pull แล้วค่า planningAgents ยังเก่า)

จำลองโดยแก้ `planningAgents` ใน sandbox ให้เหลือ `["plan","bazer"]` แล้วรันชุดซ่อม

| ตรวจ | ผล |
|---|---|
| update-check (ก่อนซ่อม) | `configOk=false` · `missing=buddha,arena,snack,poteto-mode` (มองเห็นทันที ไม่ต้องเดา) |
| `refresh-config` | สำเร็จ |
| update-check (หลังซ่อม) | `configOk=true` · `plan, buddha, arena, snack, poteto-mode` |
| `mirror-agents` | สำเร็จ — marker ใน mirror ของ Buddha มี 2 บรรทัด (เปิด 1 + ปิด 1) ไม่ซ้ำ |
| `sync-all` | สำเร็จ — เรียก update → refresh-config → mirror แล้วรัน verify ให้ |
| verify หลังซ่อม | `planningAgents` ok · mirror ok · `BAZER FLOW v1` ok |


## บั๊กที่เจอระหว่างสแกนและแก้แล้ว

| อาการ | ต้นเหตุ | แก้ |
|---|---|---|
| `git pull` แล้วกด "ติดตั้งเสร็จสรรพ" โหมดเดิมไม่อัพเดต | `setup-quick` ไม่ส่ง `overwrite` และ `setup-apply` ข้ามไฟล์ที่มีอยู่ | ใช้เส้นทาง `update-apply` (มีอยู่แล้ว) + เพิ่มปุ่ม **ซิงค์ทั้งหมด** ให้เรียกเส้นทางที่ถูกอัตโนมัติ |
| `planningAgents` เก่าค้าง — ผู้ใช้ต้องไปกดแท็บ Plannotator เอง | ไม่มีตัวเขียนกลับ + hardcode รายชื่อ 4 จุด | รวมเป็น `PLAN_AGENTS` ตัวเดียว + action `refresh-config` + `update-apply` เรียกให้เองเมื่อพบว่าไม่ตรง + verify เตือน |
| อัพเดตแล้ว mirror ยังเก่า (ต้องกดเองอีกปุ่ม) | `update-apply` ไม่รัน mirror | `update-apply` รัน `mirror-agents` ต่อท้ายอัตโนมัติ |
| `launch` ถูกข้ามถ้า `launchDir` ว่าง | เงื่อนไขเดิมบังคับต้องตั้ง `launchDir` | ใช้ค่าเริ่มต้น `~/opencode-launch` เมื่อโฟลเดอร์นั้นมีอยู่ |
| ไม่มีที่ให้เห็นว่า flow ของ Buddha ตรงกับ bundle ไหม | flow เป็นคำบรรยายกระจาย | marker `BAZER-FLOW: v1` + ตัวตรวจใน verify + badge ในแท็บ Buddha |
| mirror มี marker ซ้ำ 2 บรรทัด | generator เติม marker เพิ่มจากที่มีใน body | ถอดการเติมออก — ใช้ marker ที่อยู่ในเนื้อหาโดยตรง |


## ยังค้าง (ต้องทำต่อ)

- รัน verify บนเครื่องจริงหลังรีสตาร์ท BAZER Console (sandbox ไม่มี server 4096 จึงมี fail ที่คาดไว้)
- ทดสอบโฟลว์จริง 1 เคสใน Buddha Mode: ด่าน 1 → อนุมัติ → Arena ในเซสชัน → ด่าน 2 → อนุมัติ → สร้าง
- สืบที่มาของ `%USERPROFILE%\.config\opencode-profiles\default\**` (ยังไม่มีอะไรควบคุม — ต้องรู้ก่อนว่าใครเขียน)
