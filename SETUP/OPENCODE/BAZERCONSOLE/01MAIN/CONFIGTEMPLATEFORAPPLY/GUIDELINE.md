# GUIDELINE — CONFIGTEMPLATEFORAPPLY

ไฟล์ในโฟลเดอร์นี้คือ **แม่แบบของไฟล์ระบบ** ที่ BAZERCONSOLE เอาไปวางในเครื่องผู้ใช้

| ไฟล์ | ปลายทาง | วิธีเขียน |
|---|---|---|
| `AGENTS.md.template` | `${CONFIG}/AGENTS.md` | `template-once` — สร้างครั้งเดียว ไม่ทับ |
| `pstack-models.md.template` | `${HOME}/.agents/pstack-models.md` | `template-once` |

## กฎ

1. **R1 ใช้เต็มที่** — ห้ามมีสคริปต์ในโฟลเดอร์นี้ มีแต่ `.md` / `.template`
2. **ห้ามฝัง path ของเครื่องใคร** — ใช้ `~` หรือ `${VAR}` ในเนื้อหา และให้ MANIFEST เป็นคนกำหนดปลายทาง
3. **template-once = สัญญากับผู้ใช้** ว่าเราจะไม่ทับค่าที่เขาแก้ — ถ้าเปลี่ยน template แล้วอยากให้ถึงเครื่อง ต้องบอกใน CHANGELOG ว่าต้องกด "รีเซ็ตจาก template"
4. ทุกครั้งที่แก้ ให้เพิ่มบรรทัดใน `MANIFEST/CHANGELOG.md` (Changed) และบอกผลกระทบกับเครื่องที่ติดตั้งแล้ว
5. ค่าที่ผู้ใช้แก้บ่อย (โมเดล/effort) **ไม่ควรอยู่ใน template** — ควรอยู่ใน `settings.json` เพื่อให้แก้ผ่าน UI ได้
