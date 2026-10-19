#!/usr/bin/env node
/* BAZER FLOW v2 checker — pure logic tests + install surface checks.
   Run: node flow-check.mjs
   Exit 0 = all PASS (WARN allowed), 1 = at least one FAIL. */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import {
  INVARIANTS,
  PATCHES,
  assertNeedlesDisjoint,
  check as plannotatorCheck,
  count as plannotatorCount,
  deleteHintSpan as removeHintSpan,
  plan as plannotatorPlan,
  syntaxBad as plannotatorSyntaxBad,
  syntaxOf as plannotatorSyntax,
} from './patch-plannotator.mjs';
import {
  approvalsFromMessages,
  builderTarget,
  decide,
  isApprovedOutput,
  isDeniedOutput,
  isHandoffText,
  isTempPath,
  looksLikeWrite,
  phaseFor,
} from './bundle/plugins/bazer-flow/logic.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.BAZER_CONSOLE_HOME || os.homedir();
const TEMP = path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'bazer').replace(/\\/g, '/');
const roots = [TEMP];
const results = [];
const add = (status, rule, detail) => results.push({ status, rule, detail });

function test(rule, fn) {
  try {
    fn();
    add('PASS', rule, '');
  } catch (error) {
    add('FAIL', rule, String(error.message || error));
  }
}

/* ---------------------------- pure logic tests ---------------------------- */

test('approval strings', () => {
  assert.equal(isApprovedOutput('Plan approved!'), true);
  assert.equal(isApprovedOutput('Plan approved! Saved to: C:\\x.md'), true);
  assert.equal(isApprovedOutput('Plan approved with notes!\n\nnotes'), true);
  assert.equal(isApprovedOutput('YOUR PLAN WAS NOT APPROVED.'), false);
  assert.equal(isApprovedOutput('Plan approved!foo'), false);
  assert.equal(isDeniedOutput('YOUR PLAN WAS NOT APPROVED.'), true);
});

test('handoff text', () => {
  assert.equal(isHandoffText('Plan approved. Plan mode remains active; no implementation has been requested.'), true);
  assert.equal(isHandoffText('please continue'), false);
});

test('temp path allowlist', () => {
  assert.equal(isTempPath(`${TEMP}/slug/cand-a/design.ts`, roots), true);
  assert.equal(isTempPath(`${TEMP}/slug/../../project/x.ts`, roots), false);
  assert.equal(isTempPath('C:\\BCS\\project\\x.ts', roots), false);
  assert.equal(isTempPath('', roots), false);
});

test('builder target extraction', () => {
  assert.equal(builderTarget({ subagent_type: 'builder' }), 'builder');
  assert.equal(builderTarget({ agent: 'Builder' }), 'builder');
  assert.equal(builderTarget({ subagent: 'general' }), 'general');
  assert.equal(builderTarget({}), '');
});

test('bash write heuristic', () => {
  assert.equal(looksLikeWrite('git status'), false);
  assert.equal(looksLikeWrite('rg "x" src'), false);
  assert.equal(looksLikeWrite('echo x > out.txt'), true);
  assert.equal(looksLikeWrite('Set-Content out.txt x'), true);
  assert.equal(looksLikeWrite('npm install'), true);
  assert.equal(looksLikeWrite('git apply patch.diff'), true);
});

test('gate: plan before approval', () => {
  assert.equal(decide({ agent: 'plan', tool: 'write', args: { filePath: 'C:\\BCS\\x.ts' }, approved: false, tempRoots: roots }).allow, false);
  assert.equal(decide({ agent: 'plan', tool: 'write', args: { filePath: `${TEMP}/x.ts` }, approved: false, tempRoots: roots }).allow, true);
  assert.equal(decide({ agent: 'plan', tool: 'task', args: { subagent_type: 'builder' }, approved: false, tempRoots: roots }).allow, false);
  assert.equal(decide({ agent: 'plan', tool: 'task', args: { subagent_type: 'general' }, approved: false, tempRoots: roots }).allow, false);
  assert.equal(decide({ agent: 'plan', tool: 'task', args: { subagent_type: 'explore' }, approved: false, tempRoots: roots }).allow, true);
});

test('gate: plan after approval', () => {
  assert.equal(decide({ agent: 'plan', tool: 'write', args: { filePath: 'C:\\BCS\\x.ts' }, approved: true, tempRoots: roots }).allow, false);
  assert.equal(decide({ agent: 'plan', tool: 'task', args: { subagent_type: 'builder' }, approved: true, tempRoots: roots }).allow, true);
  assert.equal(decide({ agent: 'plan', tool: 'task', args: { subagent_type: 'general' }, approved: true, tempRoots: roots }).allow, false);
});

test('gate: buddha before/after approval', () => {
  assert.equal(decide({ agent: 'buddha', tool: 'edit', args: { filePath: 'C:\\BCS\\x.ts' }, approved: false, tempRoots: roots }).allow, false);
  assert.equal(decide({ agent: 'buddha', tool: 'edit', args: { filePath: 'C:\\BCS\\x.ts' }, approved: true, tempRoots: roots }).allow, true);
  assert.equal(decide({ agent: 'buddha', tool: 'task', args: { subagent_type: 'general' }, approved: false, tempRoots: roots }).allow, true);
  assert.equal(decide({ agent: 'buddha', tool: 'task', args: { subagent_type: 'builder' }, approved: false, tempRoots: roots }).allow, false);
});

test('gate: bash writes', () => {
  assert.equal(decide({ agent: 'buddha', tool: 'bash', args: { command: 'git status' }, approved: false, tempRoots: roots }).allow, true);
  assert.equal(decide({ agent: 'buddha', tool: 'bash', args: { command: 'Set-Content C:\\BCS\\x.ts x' }, approved: false, tempRoots: roots }).allow, false);
  assert.equal(decide({ agent: 'buddha', tool: 'bash', args: { command: `Set-Content ${TEMP}/x.ts x` }, approved: false, tempRoots: roots }).allow, true);
});

test('gate: non-planning agents pass', () => {
  for (const agent of ['build', 'builder', '', 'general']) {
    assert.equal(decide({ agent, tool: 'write', args: { filePath: 'C:\\BCS\\x.ts' }, approved: false, tempRoots: roots }).allow, true);
  }
});

test('phase badge', () => {
  assert.equal(phaseFor('plan', 0), 'PLAN');
  assert.equal(phaseFor('plan', 1), 'BUILD');
  assert.equal(phaseFor('buddha', 0), 'PLAN');
  assert.equal(phaseFor('buddha', 1), 'ARENA');
  assert.equal(phaseFor('buddha', 2), 'BUILD');
  assert.equal(phaseFor('build', 3), '');
});

function msg(role, text, extra = {}) {
  return { role, parts: [{ type: 'text', text }], ...extra };
}
function toolPart(output, tool = 'submit_plan') {
  return { type: 'tool', tool, state: { status: 'completed', output } };
}

test('approvals from messages (handoff ignored)', () => {
  const messages = [
    msg('user', 'make a plan'),
    { role: 'assistant', parts: [toolPart('Plan approved!')] },
    msg('user', 'Plan approved. Plan mode remains active; no implementation has been requested.'),
  ];
  assert.equal(approvalsFromMessages(messages), 1);
  assert.equal(phaseFor('plan', approvalsFromMessages(messages)), 'BUILD');
});

test('two buddha gates', () => {
  const messages = [
    msg('user', 'buddha task'),
    { role: 'assistant', parts: [toolPart('Plan approved!')] },
    msg('user', 'Plan approved. Plan mode remains active; no implementation has been requested.'),
    { role: 'assistant', parts: [toolPart('Plan approved with notes!')] },
  ];
  assert.equal(phaseFor('buddha', approvalsFromMessages(messages)), 'BUILD');
});

test('new user prompt resets the badge', () => {
  const messages = [
    msg('user', 'old task'),
    { role: 'assistant', parts: [toolPart('Plan approved!')] },
    msg('user', 'new task'),
  ];
  assert.equal(approvalsFromMessages(messages), 0);
});

/* --------------------------- install surface --------------------------- */

function readText(file) {
  try { return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''); } catch { return null; }
}
function exists(rel) { return fs.existsSync(path.join(DIR, rel)); }
function frontmatter(text) {
  return (String(text || '').match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
}

test('bundle: flow marker v2', () => {
  const md = readText(path.join(DIR, 'bundle', 'agents', 'buddha.md')) || '';
  const version = (md.match(/<!--\s*BAZER-FLOW:\s*v(\d+)\s*-->/) || [])[1];
  assert.equal(version, '2');
});

test('bundle: GATE 1 plan authored via Poteto', () => {
  const md = readText(path.join(DIR, 'bundle', 'agents', 'buddha.md')) || '';
  assert.match(md, /BAZERs-EXTENSION-Poteto/);
  assert.match(md, /GATE 1 — ARENA PLAN/);
});

test('bundle: plugin files', () => {
  for (const f of ['index.ts', 'logic.mjs', 'tui.tsx', 'package.json']) {
    assert.equal(exists(path.join('bundle', 'plugins', 'bazer-flow', f)), true, f);
  }
});

test('bundle: builder agent', () => {
  const md = readText(path.join(DIR, 'bundle', 'agents', 'builder.md')) || '';
  const fm = frontmatter(md);
  assert.match(fm, /^mode:\s*subagent$/m);
  assert.match(fm, /submit_plan:\s*deny/);
  assert.match(fm, /edit:\s*allow/);
});

/** builder ต้องเป็น subagent จาก "ไฟล์" เท่านั้น — ห้ามมีใครไปเซ็ต mode ในโค้ดปลั๊กอินอีก (คนละแหล่งความจริง) */
test('bundle: builder mode has a single source (agent file, not plugin)', () => {
  const plugin = readText(path.join(DIR, 'bundle', 'plugins', 'bazer-flow', 'index.ts')) || '';
  assert.doesNotMatch(plugin, /draft\.mode\s*=\s*['"](all|primary|subagent)['"]/, 'ปลั๊กอินยังเซ็ต draft.mode อยู่ — mode ต้องมาจาก agents/builder.md เท่านั้น');
});

/** สัญญา approve-to-Buddha: buddha.md ต้องสั่งให้เรียก builder เป็น subagent inline ในขั้น B4 */
test('bundle: buddha declares approve-to-buddha → builder inline', () => {
  const md = readText(path.join(DIR, 'bundle', 'agents', 'buddha.md')) || '';
  assert.match(md, /Approve to Buddha/);
  assert.match(md, /builder`?\s*เป็น subagent/);
  assert.match(md, /GATE 2[\s\S]{0,400}builder/);
});

/** ตัวเฝ้า vendor: Plannotator อัปเดต/ติดตั้งใหม่เมื่อไร patch ปุ่ม approve จะหลุด — เตือน (WARN) ไม่ทำให้ FAIL
 *  เกณฑ์ "แพตช์ครบ" ยืมจาก patch-plannotator เอง (แหล่งความจริงเดียวกับ --check · ไม่ hardcode สตริงซ้ำ) */
function plannotatorHtmlCopies() {
  const home = HOME;
  const roots2 = [
    path.join(home, '.cache', 'opencode', 'npm', '@plannotator'),
    path.join(home, '.cache', 'opencode', 'packages', '@plannotator'),
  ];
  const found = [];
  const walk = (dir, depth = 0) => {
    if (depth > 6) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (e.name === 'plannotator.html') found.push(p);
    }
  };
  for (const r of roots2) walk(r);
  return found;
}

/* สตริงที่ต้องเฝ้า มาจาก patch-plannotator (ไม่ประกาศซ้ำที่นี่) */
const plKeyPatch = PATCHES.find((p) => p.id === 'localstorage-key');
const plHintNeedle = INVARIANTS.find((i) => i.id === 'hint/child-gone').needle;
const plFixCmd = 'node patch-plannotator.mjs';
const plCheckCmd = 'node patch-plannotator.mjs --check';

/** เกณฑ์ "ถึงปลายทาง" บนข้อความจริง — ยืม invariant required จาก patch-plannotator ตรง ๆ (แหล่งเดียวกับ --check และ Console)
 *  เดิมนับเองแค่ "(?)" + key + syntax: ไฟล์ที่ "5 จุด applied แต่โครงปุ่มพัง" (span ชื่อ agent หาย / array ไม่ปิด)
 *  จึงถูกนับว่าถึงปลายทางทั้งที่ `--check` ไม่ผ่าน
 *  หมายเหตุ: ฟังก์ชันนี้ throw ได้ (plan/check throw เมื่อเจอรูปแบบเดิมซ้ำ เช่น span "(?)" 2 ก้อน ตามสัญญาของแพตเชอร์) — ผู้เรียกต้องดัก */
function plannotatorPatchProblems(text) {
  const problems = [];
  const states = plannotatorPlan(text);
  const todo = states.filter((s) => s.state === 'todo');
  const na = states.filter((s) => s.state === 'na');
  if (todo.length) problems.push(`ยังไม่แพตช์ ${todo.length} จุด (${todo.map((s) => s.patch.id).join(', ')})`);
  for (const s of na) problems.push(`จุด ${s.patch.id} ไม่มีในเวอร์ชันนี้`);
  const inv = plannotatorCheck(text);
  for (const f of inv.failed) problems.push(`invariant ${f.id} ไม่ผ่าน (${f.subject} = ${f.actual} · ต้องเป็น ${f.expected})`);
  const syntax = plannotatorSyntax(text);
  if (inv.recognised && plannotatorSyntaxBad(syntax)) problems.push(`syntax = ${syntax} (ต้อง ok)`);
  return { problems, todo, na };
}

{
  const copies = plannotatorHtmlCopies();
  if (!copies.length) {
    add('PASS', 'plannotator: approve button', 'ยังไม่ติดตั้ง Plannotator — ข้าม');
  } else {
    const done = [];
    const todoFiles = [];   // ยังไม่แพตช์ (มีจุด todo) = เรื่องปกติ → WARN + คำสั่งแก้
    const naIds = new Set(); // จุดที่ไม่มีในเวอร์ชันนี้
    const other = [];        // แพตช์ไม่ครบแบบอื่น (syntax พัง / โครงเปลี่ยน) — รายละเอียดรายไฟล์
    for (const f of copies) {
      /* กันไฟล์ที่ประเมินไม่ได้ (plan/check throw ตามสัญญา) ไม่ให้ทำ flow-check พังทั้งตัว —
         ต้องออกมาเป็น WARN รายไฟล์ ไม่ใช่ stack trace */
      let verdict;
      try { verdict = plannotatorPatchProblems(readText(f) || ''); }
      catch (error) {
        other.push(`${f} → ประเมินไม่ได้: ${error.message}`);
        continue;
      }
      const { problems, todo, na } = verdict;
      for (const s of na) naIds.add(s.patch.id);
      if (!problems.length) done.push(f);
      else if (todo.length) todoFiles.push(f);
      else other.push(`${f} → ${problems.join(' · ')}`);
    }
    if (done.length === copies.length) {
      add('PASS', 'plannotator: approve button', `${done.length}/${copies.length} ไฟล์ถึงปลายทาง (5 จุดครบ · ไม่มี "(?)" · key ${plKeyPatch.to} · syntax ok)`);
    } else {
      const bits = [];
      if (todoFiles.length) bits.push(`${todoFiles.length}/${copies.length} ไฟล์ยังไม่แพตช์ — รัน "${plFixCmd}" แล้วรีสตาร์ท OpenCode`);
      if (naIds.size) bits.push(`มีจุดที่ไม่มีในเวอร์ชันนี้`);
      bits.push(`ตรวจซ้ำ "${plCheckCmd}"`);
      add('WARN', 'plannotator: approve button', bits.join(' · '));
      if (naIds.size) add('WARN', 'plannotator: จุดที่ไม่มีในเวอร์ชันนี้', `จุด ${[...naIds].join(', ')} ไม่มีในเวอร์ชันนี้`);
      for (const line of other) add('WARN', 'plannotator: แพตช์ไม่ครบ (รายไฟล์)', line);
    }
  }
}

/* ---- เทสต์ในหน่วยความจำ: กลไกของ patch-plannotator ที่ Console/flow-check พึ่งพา ---- */

/** snippet จิ๋วที่ "รู้จัก" จุดหนึ่ง (default-approve-target) กันไม่ให้จุดโครงปุ่มถูกข้ามเพราะไฟล์ไม่รู้จัก
 *  โครงปุ่มจริงจาก vendor: `...{className:"max-w-[120px] truncate",children:<X>.name})` แล้วปิด array */
const plMini = (tail) => `{switchTo:"build"}zzz${tail}`
const plButtonTodo = (names) =>
  plMini(`className:"max-w-[120px] truncate",children:XX.name}),` +
  `${names[0]}&&${names[1]}.jsx("span",{className:"opacity-60 text-[10px]",children:"(?)"})]}):"Approve"`)
const plButtonDone = () => plMini(`className:"max-w-[120px] truncate",children:XX.name})]}):"Approve"`)
const plan1 = (text, point) => plannotatorPlan(text).find((s) => s.patch.id === point).state

test('plannotator: regex ลบ span "(?)" ยังทำงานเมื่อชื่อ minified เปลี่ยน', () => {
  const html = plButtonTodo(['Qq7', 'Zz_9$']); // ชื่อคนละชุดกับ vendor (A/I)
  assert.equal(plannotatorCount(html, plHintNeedle), 1, 'snippet ตั้งต้นต้องมี span "(?)" 1 ครั้ง');
  assert.equal(plan1(html, 'button-hint-span'), 'todo', 'ต้องมองว่า span นี้ยังต้องลบ (ไม่ผูกชื่อตัวแปร)');
  const fixed = removeHintSpan(html);
  assert.equal(plannotatorCount(fixed, plHintNeedle), 0, 'หลังลบต้องไม่เหลือ "(?)"');
  assert.equal(plan1(fixed, 'button-hint-span'), 'applied', 'จุดนั้นต้องเป็น applied หลังลบ');
  assert.equal(plan1(fixed, 'default-approve-target'), 'todo', 'จุดอื่นต้องไม่ถูกแตะ');
});

test('plannotator: needle ไม่ทับกัน (assertNeedlesDisjoint)', () => {
  assert.equal(assertNeedlesDisjoint(), true, 'ชุด invariant จริงต้องไม่ทับกัน');
  assert.throws(() => assertNeedlesDisjoint([
    { id: 'a/to', needle: 'plannotator-approve-buddha-v2' },
    { id: 'b/from', needle: 'plannotator-approve-buddha' },
  ]), /substring/, 'needle ที่เป็น substring กันต้อง throw (กับดัก count())');
  assert.throws(() => assertNeedlesDisjoint([
    { id: 'a/to', needle: 'same' },
    { id: 'b/from', needle: 'same' },
  ]), /นับซ้ำ/, 'needle ซ้ำต้อง throw');
});

test('plannotator: เจอ "(?)" 2 ครั้งต้อง throw (ไม่เดา ไม่แตะไฟล์)', () => {
  const two = plButtonTodo(['A', 'I']).replace(']}):"Approve"', ',A&&I.jsx("span",{className:"opacity-60 text-[10px]",children:"(?)"})]}):"Approve"');
  assert.equal(plannotatorCount(two, plHintNeedle), 2, 'snippet ต้องมี "(?)" 2 ครั้ง');
  assert.throws(() => plannotatorPlan(two), /2 ครั้ง/, 'plan() ต้อง throw เมื่อรูปแบบเดิมซ้ำ');
  assert.throws(() => removeHintSpan(two), /พอดี 1 ก้อน/, 'ตัวลบต้อง throw เมื่อเจอ 2 ก้อน');
});

test('plannotator: โครงปุ่มพังต้องถูกจับ (button/label-structure-intact)', () => {
  const word = 'button/label-structure-intact';
  const good = plButtonDone();
  assert.ok(!plannotatorCheck(good).failed.map((f) => f.id).includes(word), 'รูปที่ถูกต้องต้องไม่ถูกจับ');
  const broken = good.replace('})]}):"Approve"', '})}):"Approve"'); // array ไม่ปิด
  assert.notEqual(broken, good, 'ต้องแก้ snippet ได้จริง (ไม่งั้นเทสต์นี้ไม่ได้ทดสอบอะไร)');
  assert.ok(plannotatorCheck(broken).failed.map((f) => f.id).includes(word), 'array ไม่ปิด = ต้อง fail');
  const noSpan = plMini('className:"opacity-60",children:"→"');
  assert.ok(plannotatorCheck(noSpan).failed.map((f) => f.id).includes(word), 'span ชื่อ agent หาย = ต้อง fail');
});

test('plannotator: ค่า to ผิดนับต้องไม่ถูกกลืน (needle ฝั่งปลายทางยังอยู่ในไฟล์)', () => {
  /* กับดักที่แก้ใน U9: คีย์ใหม่โผล่ 2 ครั้ง (ไบต์มีจริง แต่ไม่ใช่รูปแบบ "ก่อนแพตช์") → state ออกมาเป็น na
     ถ้า survey() ตัดสิน "รู้จักจุดนี้" จาก state อย่างเดียว invariant ที่ fail จะถูกกลืน → --check/Console/flow-check ผ่านผิด */
  const KEY = '"plannotator-approve-target-v2"';
  const one = `${plButtonTodo(['A', 'I'])}${KEY}`;
  const two = `${plButtonTodo(['A', 'I'])}${KEY}||${KEY}`;
  assert.equal(plannotatorCount(one, KEY), 1, 'snippet แรกต้องมีคีย์ 1 ครั้ง');
  assert.equal(plannotatorCount(two, KEY), 2, 'snippet ที่สองต้องมีคีย์ 2 ครั้ง');
  assert.ok(!plannotatorCheck(one).failed.map((f) => f.id).includes('localstorage-key/to'), 'คีย์ 1 ครั้งต้องไม่ถูกฟ้อง');
  assert.ok(plannotatorCheck(two).failed.map((f) => f.id).includes('localstorage-key/to'), 'คีย์ 2 ครั้งต้องถูกฟ้อง (ไม่ถูกกลืน)');
  assert.equal(plan1(two, 'localstorage-key'), 'na', 'state ยังเป็น na ตามเดิม (ไม่ใช่รูปร่างที่รู้จัก — แต่ต้องถูกตัดสิน)');
});

test('bundle: plan gate code has deny default', () => {
  const src = readText(path.join(DIR, 'bundle', 'plugins', 'bazer-flow', 'index.ts')) || '';
  assert.match(src, /Plugin\.define/);
  assert.match(src, /ctx\.agent\.transform/);
  assert.match(src, /ctx\.tool\.hook\('execute\.before'/);
  assert.match(src, /ctx\.session\.hook\('context'/);
  assert.match(src, /resource:\s*'\*'/);
  assert.match(src, /effect:\s*'deny'/);
  assert.match(src, /action:\s*'subagent'/);
  assert.match(src, /builder/);
});

test('bundle: TUI uses a real slot', () => {
  const src = readText(path.join(DIR, 'bundle', 'plugins', 'bazer-flow', 'tui.tsx')) || '';
  assert.match(src, /prompt\.footer\.status/);
  assert.match(src, /phaseFor/);
});

{
  const plugin = path.join(HOME, '.config', 'opencode', 'plugins', 'bazer-flow', 'index.ts');
  const builder = path.join(HOME, '.config', 'opencode', 'agents', 'builder.md');
  const agentsMd = path.join(HOME, '.config', 'opencode', 'AGENTS.md');
  const installed = fs.existsSync(plugin) || fs.existsSync(builder);
  if (!installed) {
    add('WARN', 'installed flow kit', 'ยังไม่ติดตั้งในเครื่องนี้ — กด "ติดตั้ง BAZER FLOW v2" ใน Console');
  } else {
    test('installed: plugin', () => assert.equal(fs.existsSync(plugin), true, 'plugin ยังไม่ติดตั้ง'));
    test('installed: builder mode subagent', () => {
      assert.equal(fs.existsSync(builder), true, 'builder.md ยังไม่ติดตั้ง (หรือถูกปิด)');
      assert.match(frontmatter(readText(builder) || ''), /^mode:\s*subagent$/m);
    });
    test('installed: builder mode has a single source', () => {
      const src = readText(plugin) || '';
      assert.doesNotMatch(src, /draft\.mode\s*=\s*['"](all|primary|subagent)['"]/, 'ปลั๊กอินในเครื่องยังเซ็ต draft.mode อยู่');
      const bundleSrc = readText(path.join(DIR, 'bundle', 'plugins', 'bazer-flow', 'index.ts')) || '';
      assert.equal(src.replace(/\r\n/g, '\n'), bundleSrc.replace(/\r\n/g, '\n'), 'ปลั๊กอินในเครื่องไม่ตรงกับ bundle — กด "ติดตั้ง/ซ่อม BAZER FLOW v2"');
    });
    test('installed: AGENTS gate marker', () => {
      assert.match(readText(agentsMd) || '', /<!--\s*BAZER-FLOW-GATE:\s*v2\s*-->/);
    });
  }
}

/* -------------------------------- report -------------------------------- */

for (const r of results) {
  const detail = r.detail ? ' — ' + r.detail : '';
  console.log(`${r.status.padEnd(4)} ${r.rule}${detail}`);
}
const count = (s) => results.filter((r) => r.status === s).length;
const fail = count('FAIL');
console.log(`\nสรุป: ${fail ? `FAIL ${fail}` : 'PASS'} · PASS ${count('PASS')} · WARN ${count('WARN')}`);
process.exit(fail ? 1 : 0);
