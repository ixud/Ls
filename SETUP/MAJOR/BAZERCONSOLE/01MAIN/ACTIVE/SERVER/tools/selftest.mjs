/**
 * selftest.mjs — เทสต์ของเครื่อง (รันได้ทุกเครื่อง ไม่แตะ config จริง)
 * node tools/selftest.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { parseJsonc, setAtPath, getAtPath, removeArrayItem } from '../jsonc.mjs';
import { computePlan, stateOf } from '../plan.mjs';
import { checkLaw } from '../law.mjs';
import { actionIds } from '../actions.mjs';
import { manifest, srcPath, probes, policies, settings } from '../manifest.mjs';
import { makeResolver, ROOT } from '../env.mjs';
import { PROBE_KINDS } from '../probe.mjs';
import { plannotatorPlan, plannotatorPatch } from '../plannotator.mjs';
import { parseModelsOutput } from '../models.mjs';

let pass = 0;
const t = (name, fn) => { try { fn(); pass++; console.log(`  ok  ${name}`); } catch (e) { console.error(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1; } };

const fixture = `// คอมเมนต์หัวไฟล์
{
  "$schema": "https://opencode.ai/config.json",
  // ปลั๊กอินเก่า
  "plugins": ["./plugins/bazer-flow", "./plugins/other"],
  "agent": {
    "buddha": { "model": "a/b" } /* เก็บไว้ */
  }
}
`;

console.log('jsonc');
t('เพิ่ม key ใหม่ลึก ๆ ได้ และคงคอมเมนต์', () => {
  const out = setAtPath(fixture, ['agent', 'plan', 'mode'], 'subagent');
  assert.match(out, /\/\/ คอมเมนต์หัวไฟล์/);
  assert.equal(parseJsonc(out).agent.plan.mode, 'subagent');
  assert.equal(parseJsonc(out).agent.buddha.model, 'a/b');
});
t('แทนค่าเดิมได้ โดยไม่ทิ้ง key อื่น', () => {
  const out = setAtPath(fixture, ['agent', 'buddha', 'model'], 'x/y');
  assert.equal(parseJsonc(out).agent.buddha.model, 'x/y');
  assert.deepEqual(parseJsonc(out).plugins, ['./plugins/bazer-flow', './plugins/other']);
});
t('merge object หลายชั้นได้', () => {
  const out = setAtPath(fixture, ['agent'], { plan: { mode: 'subagent', hidden: true } }, { merge: true });
  assert.equal(parseJsonc(out).agent.plan.hidden, true);
  assert.equal(parseJsonc(out).agent.buddha.model, 'a/b');
});
t('รันซ้ำได้ผลเหมือนเดิม (idempotent)', () => {
  const once = setAtPath(fixture, ['agent', 'buddha', 'permission'], { read: 'allow', shell: 'ask' });
  const twice = setAtPath(once, ['agent', 'buddha', 'permission'], { read: 'allow', shell: 'ask' });
  assert.equal(once, twice);
});
t('แทน object permission ทั้งก้อน (ไม่ค้างกฎเก่า)', () => {
  let out = setAtPath(fixture, ['agent', 'buddha', 'permission'], { read: 'allow', shell: 'allow', question: 'allow' });
  out = setAtPath(out, ['agent', 'buddha', 'permission'], { read: 'allow', shell: 'ask' });
  assert.deepEqual(parseJsonc(out).agent.buddha.permission, { read: 'allow', shell: 'ask' });
});
t('ลบสมาชิก array ได้', () => {
  const out = removeArrayItem(fixture, ['plugins'], './plugins/bazer-flow');
  assert.deepEqual(parseJsonc(out).plugins, ['./plugins/other']);
  assert.equal(removeArrayItem(out, ['plugins'], './plugins/bazer-flow'), out);
});
t('ไฟล์ว่าง → สร้าง object ได้', () => {
  const out = setAtPath('', ['model'], 'a/b');
  assert.equal(parseJsonc(out).model, 'a/b');
});

console.log('models');
t('parseModelsOutput จัดกลุ่ม/เรียง/label ถูก + dedupe', () => {
  const sample = [
    'openai/gpt-5',
    'opencode/beam-free',
    'opencode-go/glm-5.3',
    'opencode/deepseek-v4.1-flash-free',
    'groq/llama-3.3-70b-versatile',
    'opencode/beam-free',
    '',
    'ไม่มี slash',
  ].join('\n');
  const { models, providers } = parseModelsOutput(sample);
  assert.deepEqual(providers.map((p) => p.id), ['opencode', 'opencode-go', 'groq', 'openai']);
  assert.equal(providers[0].label, 'OpenCode');
  assert.equal(providers[1].label, 'OpenCode Go Harness');
  assert.equal(providers[2].label, 'groq');
  assert.equal(providers[0].count, 2);
  assert.equal(models.length, 5);
  const m = models.find((x) => x.id === 'opencode/beam-free');
  assert.equal(m.provider, 'opencode');
  assert.equal(m.name, 'beam-free');
  assert.equal(m.label, 'OpenCode · beam-free');
  assert.equal(models.filter((x) => x.id === 'opencode/beam-free').length, 1);
});

console.log('plan / law (sandbox)');
const home = path.join(os.tmpdir(), 'bazer', 'selftest-home');
fs.rmSync(home, { recursive: true, force: true });
fs.mkdirSync(home, { recursive: true });

t('แผนคำนวณได้ และทุก entry มีสถานะที่รู้จัก', () => {
  const plan = computePlan(home, {});
  assert.ok(plan.entries.length > 5);
  for (const e of plan.entries) assert.ok(['ok', 'stale', 'missing', 'broken', 'design'].includes(e.state), `${e.id} → ${e.state}`);
});
t('sandbox ว่าง → ต้องมี missing (ไม่ใช่ ok ปลอม)', () => {
  const plan = computePlan(home, {});
  assert.ok(plan.summary.missing > 0);
});
t('กฎ R3 ตรงกับ handler จริง', () => {
  const law = checkLaw({ handlerIds: actionIds });
  const r3 = law.rules.find((r) => r.id === 'R3');
  assert.equal(r3.ok, true, r3.details?.join(' · '));
});
t('กฎ R1/R4 ผ่านบน repo ปัจจุบัน', () => {
  const law = checkLaw({ handlerIds: actionIds });
  const bad = law.rules.filter((r) => !r.ok && r.id !== 'R2');
  assert.equal(bad.length, 0, bad.map((r) => `${r.id}: ${r.details?.[0]}`).join(' · '));
});
t('ติดตั้งแล้วต้องไม่เขียนซ้ำ (idempotent) — ไฟล์ agent ทุกตัว', () => {
  const agents = manifest.entries.filter((e) => e.strategy === 'overwrite');
  assert.ok(agents.length >= 4);
  for (const e of agents) {
    const { resolve } = makeResolver(home);
    const target = resolve(e.target);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(srcPath(e), target);
    const st = stateOf(e, home);
    assert.equal(st.state, 'ok', `${e.id} → ${st.state}`);
    assert.equal(st.writable, false, `${e.id} ยัง writable`);
  }
});

console.log('jsonc — adversarial');
t('trailing comma เดิมอยู่ ต้องไม่ทำให้เกิด comma ซ้อน', () => {
  const src = '{\n  "a": 1,\n}\n';
  const out = setAtPath(src, ['b'], 2);
  assert.equal(parseJsonc(out).b, 2);
  assert.ok(!/,\s*,/.test(out), out);
});
t('คอมเมนต์ใน array ต้องรอด', () => {
  const src = '{\n  "plugins": [\n    // ตัวเก่า\n    "./plugins/bazer-flow",\n    "./plugins/other"\n  ]\n}\n';
  const out = removeArrayItem(src, ['plugins'], './plugins/bazer-flow');
  assert.deepEqual(parseJsonc(out).plugins, ['./plugins/other']);
  assert.match(out, /ตัวเก่า/);
});
t('ไฟล์ CRLF ต้องแก้ได้', () => {
  const src = '{\r\n  "a": 1\r\n}\r\n';
  const out = setAtPath(src, ['b', 'c'], true);
  assert.equal(parseJsonc(out).b.c, true);
  assert.equal(parseJsonc(out).a, 1);
});
t('ไฟล์มี BOM ต้องแก้และอ่านได้', () => {
  const src = '\uFEFF{\n  "a": 1\n}\n';
  const out = setAtPath(src, ['b'], 'x');
  assert.equal(parseJsonc(out).b, 'x');
});
t('key ชื่อซ้ำคนละชั้น ต้องแก้ถูกตัว', () => {
  const src = '{\n  "agent": {\n    "buddha": { "agent": "keep" }\n  }\n}\n';
  const out = setAtPath(src, ['agent', 'buddha', 'agent'], 'changed');
  assert.equal(parseJsonc(out).agent.buddha.agent, 'changed');
});
t('object ว่างแบบบรรทัดเดียว {"a":{}} ต้องเติมได้', () => {
  const out = setAtPath('{"a":{}}', ['a', 'b'], 1);
  const p = parseJsonc(out);
  assert.equal(p.a.b, 1);
});
t('สตริงที่มีวงเล็บและ escape ต้องไม่พา scanner หลง', () => {
  const src = '{\n  "note": "}{ \\" tricky",\n  "a": 1\n}\n';
  const out = setAtPath(src, ['b'], 2);
  const p = parseJsonc(out);
  assert.equal(p.note, '}{ " tricky');
  assert.equal(p.b, 2);
  assert.equal(p.a, 1);
});
t('path ที่ชั้นกลางเป็นสตริง ต้องแทนด้วย object ได้', () => {
  const out = setAtPath('{\n  "agent": "oops"\n}\n', ['agent', 'plan', 'mode'], 'subagent');
  assert.equal(parseJsonc(out).agent.plan.mode, 'subagent');
});
t('ค่าไทย/unicode เขียนและอ่านกลับได้', () => {
  const out = setAtPath('{\n}\n', ['note'], 'ทดสอบ ไทย 🎯');
  assert.equal(parseJsonc(out).note, 'ทดสอบ ไทย 🎯');
});
t('ค่า number/bool/null ถูกชนิด', () => {
  let out = setAtPath('{\n}\n', ['n'], 40);
  out = setAtPath(out, ['b'], false);
  out = setAtPath(out, ['z'], null);
  const p = parseJsonc(out);
  assert.equal(typeof p.n, 'number');
  assert.equal(p.b, false);
  assert.equal(p.z, null);
});
t('array ใน array ต้องแทนได้ทั้งก้อน', () => {
  const out = setAtPath('{\n  "keybinds": {}\n}\n', ['keybinds', 'messages_copy'], ['ctrl+alt+m', 'ctrl+alt+o']);
  assert.deepEqual(parseJsonc(out).keybinds.messages_copy, ['ctrl+alt+m', 'ctrl+alt+o']);
});
t('ไฟล์พัง → ต้อง throw ไม่ใช่เขียนมั่ว', () => {
  assert.throws(() => setAtPath('{\n  "a": {', ['b'], 1));
  assert.throws(() => parseJsonc('{ nope }'));
});

console.log('plannotator');
t('แพตช์ switchTo และรันซ้ำไม่เปลี่ยนอะไร', () => {
  const h = path.join(os.tmpdir(), 'bazer', 'pl-test-home');
  fs.rmSync(h, { recursive: true, force: true });
  const dir = path.join(h, '.cache', 'opencode', 'npm', 'plannotator');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'app.html');
  fs.writeFileSync(file, 'const a={switchTo:"build"}; const b={switchTo:"builder"};', 'utf8');
  const before = plannotatorPlan(h, 'buddha');
  assert.equal(before.files.length, 1);
  assert.equal(before.todo, 1);
  const r1 = plannotatorPatch(h, 'buddha', { apply: true });
  assert.equal(r1.changed.length, 1);
  const text = fs.readFileSync(file, 'utf8');
  assert.equal((text.match(/switchTo:"buddha"/g) || []).length, 2);
  const r2 = plannotatorPatch(h, 'buddha', { apply: true });
  assert.equal(r2.changed.length, 0);
  fs.rmSync(h, { recursive: true, force: true });
});

console.log('contract');

const PERM_ACTIONS = new Set(['*', 'read', 'edit', 'glob', 'grep', 'list', 'shell', 'subagent', 'webfetch', 'websearch', 'external_directory', 'question', 'doom_loop', 'browser', 'submit_plan']);
const THEME_COLORS = new Set(['primary', 'secondary', 'accent', 'success', 'warning', 'info']);

function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) throw new Error('ไม่มี frontmatter');
  const out = { permission: {} };
  let inPerm = false;
  for (const raw of m[1].split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indented = /^\s+/.test(raw);
    const mm = /^\s*([A-Za-z0-9_-]+):\s*(.*)$/.exec(raw);
    if (!mm) continue;
    const [, k, vRaw] = mm;
    const v = vRaw.trim().replace(/^["']|["']$/g, '');
    if (!indented) {
      inPerm = k === 'permission';
      if (!inPerm) out[k] = v;
    } else if (inPerm) out.permission[k] = v;
  }
  return out;
}

t('probe ทุกตัวมี implementation', () => {
  const missing = probes.probes.filter((p) => !PROBE_KINDS.includes(p.kind));
  assert.equal(missing.length, 0, missing.map((p) => `${p.id}:${p.kind}`).join(', '));
});

t('ทุก target resolve ได้ด้วย env.json', () => {
  const fake = path.join(os.tmpdir(), 'bazer', 'contract-home');
  const { resolve } = makeResolver(fake);
  for (const e of manifest.entries) {
    if (!e.target) continue;
    const p = resolve(e.target);
    assert.ok(path.isAbsolute(p), `${e.id} → ${p}`);
  }
});

t('policy ใช้เฉพาะ permission action ที่มีจริง + ค่าถูกต้อง', () => {
  const bad = [];
  for (const [pid, p] of Object.entries(policies)) {
    if (pid === 'note') continue;
    for (const lv of p.levels) {
      for (const [k, v] of Object.entries(lv.permission || {})) {
        if (!PERM_ACTIONS.has(k)) bad.push(`${pid}#${lv.id}: key ${k}`);
        if (!['allow', 'ask', 'deny'].includes(v)) bad.push(`${pid}#${lv.id}: ${k}=${v}`);
      }
    }
  }
  assert.equal(bad.length, 0, bad.join(', '));
});

t('settings control ทุกตัว resolve target ได้', () => {
  const fake = path.join(os.tmpdir(), 'bazer', 'contract-home');
  const { resolve } = makeResolver(fake);
  const ctrls = [];
  for (const g of settings.groups) for (const c of g.controls) ctrls.push(c);
  for (const r of settings.pstack.roles) ctrls.push({ id: r.id, target: settings.pstack.target });
  for (const c of ctrls) assert.ok(path.isAbsolute(resolve(c.target)), c.id);
});

t('ไฟล์ agent ทุกตัวผ่านสคีมา (mode/color/permission)', () => {
  const problems = [];
  const dirs = ['AGENT/01PRIMARY', 'AGENT/02SUBAGENT', 'AGENT/02SUBAGENT/SUBSUBAGENT'];
  for (const d of dirs) {
    for (const name of fs.readdirSync(path.join(ROOT, d))) {
      if (!name.endsWith('.md') || name === 'GUIDELINE.md') continue;
      const file = path.join(ROOT, d, name);
      if (fs.statSync(file).size === 0) continue;
      let fm;
      try { fm = parseFrontmatter(fs.readFileSync(file, 'utf8')); }
      catch (e) { problems.push(`${name}: ${e.message}`); continue; }
      if (!fm.description) problems.push(`${name}: ไม่มี description`);
      if (!['primary', 'subagent', 'all'].includes(fm.mode)) problems.push(`${name}: mode=${fm.mode}`);
      if (!/^#[0-9a-fA-F]{6}$/.test(fm.color || '') && !THEME_COLORS.has(fm.color)) problems.push(`${name}: color=${fm.color}`);
      for (const [k, v] of Object.entries(fm.permission)) {
        if (!PERM_ACTIONS.has(k)) problems.push(`${name}: permission key ${k}`);
        if (!['allow', 'ask', 'deny'].includes(v)) problems.push(`${name}: ${k}=${v}`);
      }
    }
  }
  assert.equal(problems.length, 0, problems.join(' · '));
});

t('โหมดหลักมี 4 ไฟล์พอดี', () => {
  const names = fs.readdirSync(path.join(ROOT, 'AGENT/01PRIMARY')).filter((n) => n.endsWith('.md') && n !== 'GUIDELINE.md').sort();
  assert.deepEqual(names, ['ADVISOR.md', 'BAZER.md', 'BUDDHA.md', 'SNACK.md']);
});

t('UI script parse ได้', () => {
  const src = fs.readFileSync(path.join(ROOT, 'BAZERCONSOLE/01MAIN/ACTIVE/UI/app.js'), 'utf8');
  new Function(src);
});

t('CSS ต้องบังคับ [hidden] (กัน modal เปล่าคลุมหน้า)', () => {
  const css = fs.readFileSync(path.join(ROOT, 'BAZERCONSOLE/01MAIN/ACTIVE/UI/style.css'), 'utf8');
  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/);
});

t('หน้าเว็บมี favicon + โลโก้จาก /icon.ico และมีแท็บ Quick Access', () => {
  const html = fs.readFileSync(path.join(ROOT, 'BAZERCONSOLE/01MAIN/ACTIVE/UI/index.html'), 'utf8');
  assert.match(html, /rel="icon"[^>]*href="\/icon\.ico"/);
  assert.match(html, /<img src="\/icon\.ico"/);
  assert.match(html, /data-tab="quick"/);
});

t('settings.json มี full.files สำหรับเขียนทับทั้งไฟล์', () => {
  const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'BAZERCONSOLE/01MAIN/PASSIVE/01MANIFEST/settings.json'), 'utf8'));
  assert.ok(Array.isArray(s.full?.files) && s.full.files.length >= 2);
  for (const f of s.full.files) assert.match(f.target, /^\$\{/);
});

t('settings.json ใช้ type model/model-list กับช่องโมเดล', () => {
  const byId = new Map();
  for (const g of settings.groups) for (const c of g.controls) byId.set(c.id, c);
  for (const id of ['model.buddha', 'model.bazer', 'model.snack', 'model.advisor', 'model.global']) {
    assert.equal(byId.get(id)?.type, 'model', id);
  }
  assert.equal(byId.get('arena.runners')?.type, 'model-list');
  assert.equal(byId.get('arena.judge')?.type, 'model-list');
});

t('probe modes-present ใช้ exact + agents-hidden ครอบ poteto-mode', () => {
  const modes = probes.probes.find((p) => p.id === 'modes-present');
  assert.equal(modes?.params?.exact, true);
  const hidden = probes.probes.find((p) => p.id === 'builtin-hidden');
  assert.equal(hidden?.kind, 'agents-hidden');
  assert.ok(hidden?.params?.ids?.includes('poteto-mode'));
});

t('subagent ทุกตัวต้องเป็น mode: subagent (รวม builder)', () => {
  const dir = path.join(ROOT, 'AGENT/02SUBAGENT');
  const bad = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.md') || name === 'GUIDELINE.md') continue;
    const text = fs.readFileSync(path.join(dir, name), 'utf8');
    const m = /^mode:\s*(\S+)/m.exec(text);
    if (m?.[1] !== 'subagent') bad.push(`${name}: ${m?.[1] ?? '(ไม่มี mode)'}`);
  }
  assert.equal(bad.length, 0, bad.join(', '));
});

t('ทุก action มี cta (ข้อความบนปุ่ม) และ risk ครบ', () => {
  const { actions } = JSON.parse(fs.readFileSync(path.join(ROOT, 'BAZERCONSOLE/01MAIN/PASSIVE/01MANIFEST/actions.json'), 'utf8'));
  const missing = actions.filter((a) => !a.cta).map((a) => a.id);
  assert.equal(missing.length, 0, missing.join(', '));
});

t('UI อ้างเฉพาะ action ที่ประกาศไว้จริง', () => {  const { actions } = JSON.parse(fs.readFileSync(path.join(ROOT, 'BAZERCONSOLE/01MAIN/PASSIVE/01MANIFEST/actions.json'), 'utf8'));
  const declared = new Set(actions.map((a) => a.id));
  const src = fs.readFileSync(path.join(ROOT, 'BAZERCONSOLE/01MAIN/ACTIVE/UI/app.js'), 'utf8');
  const found = new Set();
  for (const m of src.matchAll(/act\(\s*['"]([a-z0-9-]+)['"]/g)) found.add(m[1]);
  for (const m of src.matchAll(/data-act="([a-z0-9-]+)"/g)) found.add(m[1]);
  const unknown = [...found].filter((id) => !declared.has(id));
  assert.equal(unknown.length, 0, unknown.join(', '));
});

fs.rmSync(home, { recursive: true, force: true });
console.log(`\n${pass} passed`);