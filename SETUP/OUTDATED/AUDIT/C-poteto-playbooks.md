# C — Poteto Mode เรียก playbook 23 ตัวจริงหรือไม่

วันที่ 2026-10-18


## 1. วิธีวัดที่ถูกต้อง

`SKILL.md:133` ระบุกลไก: จับคู่ "หัวข้อ playbook" แล้วเปิดไฟล์ที่ `playbooks/<title>.md` โดย **title เป็น kebab-case, ขีดกลางคงไว้, ตัดเครื่องหมายอื่นออก** และบางรายการระบุ `File:` ตรง ๆ

ดังนั้นการเทียบสตริงชื่อไฟล์ตรง ๆ (ทำรอบแรก) ได้ผลลวง — ต้องแปลงหัวข้อ → kebab ก่อน


## 2. ตาราง 23 playbook

| playbook | มีไฟล์ | index อ้างตรง | เรียกได้จริง |
|---|---|---|---|
| authoring-a-skill | ✓ | ✓ (`File:` ระบุตรง บรรทัด 147) | ✓ |
| autonomous-run | ✓ | ✓ (หัวข้อ "Autonomous run" บรรทัด 151) | ✓ |
| autopilot-full | ✓ | ✓ (บรรทัด 153) | ✓ |
| autopilot-stack | ✓ | ✓ (บรรทัด 154) | ✓ |
| babysit | ✓ | ✓ (บรรทัด 149) | ✓ |
| bug-fix | ✓ | ✓ (บรรทัด 138) | ✓ |
| eval | ✓ | ✓ (บรรทัด 148) | ✓ |
| feature | ✓ | ✓ (บรรทัด 143) | ✓ |
| hillclimb | ✓ | ✓ (บรรทัด 140) | ✓ |
| investigation | ✓ | ✓ (บรรทัด 137) | ✓ |
| multi-phase-plan | ✓ | ✓ (`File:` ระบุตรง บรรทัด 157) | ✓ |
| opening-a-pr | ✓ | ✓ (บรรทัด 159) | ✓ |
| orchestrate | ✓ | ✓ (บรรทัด 152) | ✓ |
| pause-safely | ✓ | ✓ (บรรทัด 156) | ✓ |
| perf-issue | ✓ | ✓ (บรรทัด 139) | ✓ |
| prototype | ✓ | ✓ (บรรทัด 145) | ✓ |
| refactoring | ✓ | ✓ (บรรทัด 144) | ✓ |
| runtime-forensics | ✓ | ✓ (บรรทัด 141) | ✓ |
| session-pickup | ✓ | ✓ (บรรทัด 155) | ✓ |
| shipping | ✓ | ✓ (บรรทัด 150) | ✓ |
| trace-forensics | ✓ | ✓ (บรรทัด 142) | ✓ |
| visual-parity | ✓ | ✓ (บรรทัด 146) | ✓ |
| worktree-cleanup | ✓ | ✓ (`File:` ระบุตรง บรรทัด 158) | ✓ |

สรุป: **23/23 มีไฟล์ · 23/23 ถูกอ้างใน index · 0 ไฟล์ที่ไม่มีใน index**


## 3. หลักฐานดิบ

```powershell
(Get-ChildItem "$env:USERPROFILE\.agents\skills\poteto-mode\playbooks" -Filter *.md).Count
# 23
(Get-ChildItem "C:\BCS\00.02 LLM Slavery\SETUP\OPENCODE\CONSOLE\bundle\skills\poteto-mode\playbooks" -Filter *.md).Count
# 23
Compare-Object (installed names) (bundle names)
# (ว่าง) — ชุดเดียวกันทุกไฟล์
```

`principle-*` ติดตั้งจริง **24 ตัว** และ `SKILL.md:39` ใช้กลไกเดียวกัน ("leaf is the **principle-<title>** skill, title in kebab case") ⇒ คำว่า "principle 24 ข้อ" ใน `poteto-mode.md` **ถูกต้อง**


## 4. สิ่งที่ต้องแก้ (สรุป)

| # | จุด | สถานะ |
|---|---|---|
| 1 | `bundle/agents/poteto-mode.md:8` หัวข้อ `# Snack` (mirror สืบทอดไปด้วย) | **แก้แล้ว** → `# Poteto Mode` · ตัวตรวจ `R10:poteto-mode` จับได้ |
| 2 | `bundle/agents/poteto-mode.md:14` temp path `%TEMP%\snack` | **แก้แล้ว** → `%TEMP%\bazer` |
| 3 | playbook / index / principle | ไม่ต้องแก้ (23/23 และ 24/24) |
| 4 | `poteto-mode.md` อ้าง "poteto's skills (~60)" — ของจริง 69 (รวม mirror 6 + plannotator 4) | ข้อสังเกต ยังไม่แก้ (ข้อความ marketing ไม่กระทบการทำงาน) |

จำนวนจุดที่ต้องแก้จริง: **2** (แก้ครบแล้ว)
