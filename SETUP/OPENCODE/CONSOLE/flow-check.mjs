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

/** ตัวเฝ้า vendor: Plannotator อัปเดต/ติดตั้งใหม่เมื่อไร patch ปุ่ม approve จะหลุด — เตือน (WARN) ไม่ทำให้ FAIL */
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

{
  const copies = plannotatorHtmlCopies();
  if (!copies.length) {
    add('PASS', 'plannotator: approve button', 'ยังไม่ติดตั้ง Plannotator — ข้าม');
  } else {
    const stale = copies.filter((f) => (readText(f) || '').includes('{switchTo:"build"}'));
    const patched = copies.filter((f) => (readText(f) || '').includes('{switchTo:"builder"}'));
    if (stale.length) {
      add('WARN', 'plannotator: approve button', `${stale.length}/${copies.length} ไฟล์ยังชี้ build — รัน "node patch-plannotator.mjs" แล้วรีสตาร์ท OpenCode`);
    } else if (patched.length) {
      add('PASS', 'plannotator: approve button', `${patched.length}/${copies.length} ไฟล์ชี้ builder แล้ว`);
    } else {
      add('WARN', 'plannotator: approve button', 'ไม่พบเครื่องหมายของ patch — Plannotator อาจเปลี่ยนโครง html');
    }
  }
}

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
