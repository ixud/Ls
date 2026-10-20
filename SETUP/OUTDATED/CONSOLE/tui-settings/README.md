# tui-settings — ตั้งค่า OpenCode (sidebar tab)

โมดูลของแท็บ **"ตั้งค่า OpenCode"** ใน BAZER Console — แก้ setting ทั้งหมดของ opencode V2 CLI (`cli.json`, 19 กลุ่ม + 242 keybind) ผ่านฟอร์มที่สร้างจากสคีมา แล้ว mirror ไป `tui.json` ตามนโยบาย cli = ต้นทาง

node builtins เท่านั้น · ไม่มี dependency ภายนอก


## ไฟล์ในโฟลเดอร์

| ไฟล์ | หน้าที่ |

|---|---|

| `shared/paths.mjs` | ที่อยู่ของคีย์บน wire — ตัวคั่น `/` และ escape `~0`/`~1` (keybind ID มีจุด จึงใช้จุดเป็นตัวคั่นไม่ได้) |

| `src/patches.mjs` | patch เฉพาะ path ที่เปลี่ยน · unset แล้ว prune parent ที่ว่าง |

| `src/validate.mjs` | validate เทียบ `cli.schema.json` ที่ขอบเขตเขียน + ตรวจรูป keybind |

| `src/mirror.mjs` | แปลง cli ↔ tui · กรองชื่อ keybind ด้วย allowlist · รายงานสิ่งที่แปลไม่ได้ |

| `src/form-model.mjs` | เดินสคีมา → form model (group → field → {type, enum, path, default, defaultSource}) |

| `src/save.mjs` | ลำดับการเขียน: อ่านไฟล์จริง → merge patch → validate → backup → เขียน atomic → mirror (deep merge) |

| `src/api.mjs` | action `tui-*` ที่ console.mjs เรียกผ่าน `POST /api/action` |

| `client/renderer.mjs` | ตัววาด control ทั่วไป (ทดสอบได้) — inline เข้า console.html ด้วย `tools/build-client.mjs` |

| `schema/*.json` | ข้อมูลที่ commit ไว้ (ดูหัวข้อล่าง) |

| `tools/*.mjs` | ตัวงัด (generator/verifier) |

| `tests/*.mjs` | unit + e2e |


## ข้อมูลที่ commit (รันแล้วอ่าน)

| ไฟล์ | ที่มา |

|---|---|

| `schema/cli.schema.json` | สำเนาสคีมาของ opencode V2 (ใช้ validate ตอนรัน) |

| `schema/keybind-defaults.json` | default + คำอธิบาย 242 keybind ดึงจากไบนารีที่ติดตั้ง |

| `schema/setting-defaults.json` | default ของ setting ที่ไม่ใช่ keybind ดึงจากไบนารี |

| `schema/translate-keybinds.json` | ตารางชื่อ tui ↔ cli (binary/`tuiToCli`) |

| `schema/tui-keybind-names.json` | allowlist 184 ชื่อที่ `tui.schema.json` รู้จัก (สร้างโดย `tools/gen-model.mjs`) |

`tui.schema.json` ตัวจริง (1.15 MB) **ไม่ commit** — commit เฉพาะ allowlist ที่ derive มา


## ทดสอบ / ตรวจ

```powershell
node tui-settings/tests/run.mjs         # unit + integration
node tui-settings/tests/e2e.mjs         # over real HTTP (sandbox, USERPROFILE ปลอม)
node tui-settings/tools/verify.mjs      # ครบทุกอย่างในคำสั่งเดียว
```


## regenerate ตอน opencode อัปเดต

1. **ตาราง default + ตารางแปลชื่อ** — ดึงจากไบนารี opencode ที่ติดตั้ง (throw พร้อมชื่อ anchor ถ้าหาไม่เจอ anchor):

```powershell
node tui-settings/tools/gen-opencode-facts.mjs            # เขียน schema/*.json
node tui-settings/tools/gen-opencode-facts.mjs --check    # ตรวจว่าตรงกับที่ commit
```

2. **allowlist ของ tui** — สร้างจาก `tui.schema.json` (ต้องส่ง schema เข้ามา เพราะไม่ commit):

```powershell
node tui-settings/tools/gen-model.mjs --tui-schema=<path-to-tui.schema.json>
node tui-settings/tools/gen-model.mjs --check --tui-schema=<path>
```

`tui.schema.json` เอามาจากหน้า docs ของ opencode หรือจากโฟลเดอร์ grounding ของงาน Arena


## หลังแก้ `client/renderer.mjs`

ตัววาดถูก inline เข้า `console.html` ระหว่าง marker `TUI-SETTINGS-RENDERER:BEGIN/END` — ต้องรัน

```powershell
node tui-settings/tools/build-client.mjs          # เขียนใหม่
node tui-settings/tools/build-client.mjs --check  # ตรวจว่าตรง
```

ห้ามแก้บล็อกใน `console.html` ด้วยมือ


## นโยบาย mirror (cli = ต้นทาง)

1. เขียน `cli.json` เป็นจริง (nested + keybind ID มีจุด) — atomic, backup ก่อนทุกครั้ง

2. แปลเป็นรูป tui ผ่านตารางจากไบนารี

3. **กรองชื่อที่ `tui.schema.json` ไม่รู้จักออก** ก่อนเขียน (22 ชื่อ) — รายงานใน `blockedKeybinds`

4. **deep merge** ลง `tui.json` เดิม → คีย์ tui-only (`attention.enabled`, `prompt.max_height`) คงอยู่

5. รายงาน `skippedSettings` / `unmappedKeybinds` ให้ผู้ใช้เห็น — ไม่เดา

6. `tui.json` ถูกสร้างเมื่อสั่งบันทึก (mirror) เท่านั้น


## ขอบเขตที่การันตี

- patch แตะเฉพาะ leaf ที่ระบุ — คีย์นอก catalog และคีย์ที่ sibling ยังอยู่

- ค่าที่ผิดสคีมา → **ไม่แตะไฟล์เลย** (พิสูจน์ byte-identical ในเทสต์)

- keybind เก็บแบบ flat (`keybinds["app.exit"]`) ไม่ซ้อนชั้น

- mirror เขียนเฉพาะชื่อ keybind ที่อยู่ใน allowlist (`tui-keybind-names.json`)
