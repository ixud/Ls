/* bazer-flow — guard tests (plain node, no deps)
   รัน: node guard.test.mjs
   ครอบเฉพาะ approval propagation (เฟส A): record flags, gate ต่อ agent, count mirror, decide เดิม */

import assert from 'node:assert/strict';
import {
  countOf,
  markApproved,
  gateSatisfied,
  decide,
  phaseFor,
  approvalsFromMessages,
  approvalOf,
} from './logic.mjs';

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (err) {
    failures.push({ name, err });
    console.log(`not ok - ${name}`);
    console.log(String(err?.message || err).split('\n').map((l) => '    ' + l).join('\n'));
  }
}

/* ---------------------------------------------------------------- markApproved */
test('markApproved ไม่ mutate ของเดิม', () => {
  const before = { gate1: false, gate2: false, any: false, count: 0, at: 1 };
  const snapshot = JSON.stringify(before);
  const after = markApproved(before, 'gate1');
  assert.equal(JSON.stringify(before), snapshot, 'record เดิมต้องไม่ถูกแก้');
  assert.notEqual(after, before, 'ต้องคืน object ใหม่');
  assert.equal(after.gate1, true);
  assert.equal(after.gate2, false);
});

test('markApproved(gate2) ตั้ง Gate 2 และคง Gate 1', () => {
  const r = markApproved({ gate1: true, gate2: false, any: false }, 'gate2');
  assert.equal(r.gate1, true);
  assert.equal(r.gate2, true);
  assert.equal(countOf(r), 2);
});

test("markApproved('unknown') ตั้ง any เท่านั้น", () => {
  const r = markApproved({ gate1: false, gate2: false, any: false }, 'unknown');
  assert.deepEqual([r.gate1, r.gate2, r.any], [false, false, true]);
  assert.equal(countOf(r), 1);
});

/* ---------------------------------------------------------------- gateSatisfied */
test("gateSatisfied('buddha',{gate1:true}) === false", () => {
  assert.equal(gateSatisfied('buddha', { gate1: true, gate2: false }), false);
});

test("gateSatisfied('buddha',{gate1,gate2}) === true", () => {
  assert.equal(gateSatisfied('buddha', { gate1: true, gate2: true }), true);
});

test("gateSatisfied('bazer',{any:true}) === true", () => {
  assert.equal(gateSatisfied('bazer', { any: true }), true);
  assert.equal(gateSatisfied('plan', { any: true }), true);
  assert.equal(gateSatisfied('bazer', { any: false }), false);
});

test('gateSatisfied: arena/poteto/poteto-mode/advisor ไม่ต้องอนุมัติ', () => {
  for (const a of ['arena', 'poteto', 'poteto-mode', 'advisor', 'snack', 'build']) {
    assert.equal(gateSatisfied(a, {}), true, a);
  }
});

test('gateSatisfied: record ว่าง/รุ่นเก่า fallback ตาม count', () => {
  assert.equal(gateSatisfied('bazer', {}), false);
  assert.equal(gateSatisfied('bazer', { count: 1 }), true);
  assert.equal(gateSatisfied('buddha', { count: 1 }), false);
  assert.equal(gateSatisfied('buddha', { count: 2 }), true);
});

/* ---------------------------------------------------------------- countOf */
test('countOf นับตาม flag', () => {
  assert.equal(countOf({}), 0);
  assert.equal(countOf(null), 0);
  assert.equal(countOf({ gate1: false }), 0);
  assert.equal(countOf({ gate1: true }), 1);
  assert.equal(countOf({ gate2: true }), 1);
  assert.equal(countOf({ gate1: true, gate2: true }), 2);
  assert.equal(countOf({ any: true }), 1);
  assert.equal(countOf({ count: 2 }), 2, 'floor จาก phase file รุ่นเก่า');
});

/* ---------------------------------------------------------------- decide (ของเดิม) */
test('decide: plan count 0 → deny', () => {
  const d = decide({ agent: 'plan', tool: 'task', args: { subagent_type: 'builder' }, count: 0 });
  assert.equal(d.allow, false);
  assert.match(d.reason, /builder is only callable after 1 approved plan/);
});

test('decide: plan count 1 → allow', () => {
  const d = decide({ agent: 'plan', tool: 'task', args: { subagent_type: 'builder' }, count: 1 });
  assert.equal(d.allow, true);
});

test('decide: buddha count 1 ยังบล็อก builder, count 2 ผ่าน', () => {
  assert.equal(decide({ agent: 'buddha', tool: 'task', args: { subagent_type: 'builder' }, count: 1 }).allow, false);
  assert.equal(decide({ agent: 'buddha', tool: 'task', args: { subagent_type: 'builder' }, count: 2 }).allow, true);
});

test('decide: snack ไม่ถูก gate', () => {
  assert.equal(decide({ agent: 'snack', tool: 'edit', args: { filePath: 'C:/BCS/x.ts' }, count: 0 }).allow, true);
});

test('decide: approved flag เดิมยังใช้ได้', () => {
  assert.equal(decide({ agent: 'bazer', tool: 'edit', args: { filePath: 'C:/BCS/x.ts' }, approved: true }).allow, true);
});

/* ---------------------------------------------------------------- regression อื่น */
test('phaseFor ยังทำงานเหมือนเดิม', () => {
  assert.equal(phaseFor('buddha', 1), 'ARENA');
  assert.equal(phaseFor('buddha', 2), 'BUILD');
  assert.equal(phaseFor('bazer', 0), 'PLAN');
  assert.equal(phaseFor('snack', 0), '');
});

test('approvalsFromMessages ยังนับเฉพาะที่ approved', () => {
  const msg = (out) => ({
    role: 'assistant',
    parts: [{ type: 'tool', tool: 'submit_plan', state: { output: out } }],
  });
  const messages = [{ role: 'user', parts: [{ type: 'text', text: 'go' }] }, msg('Plan approved!'), msg('nope')];
  assert.equal(approvalsFromMessages(messages), 1);
});

/* ---------------------------------------------------------------- approvalOf (แหล่งอนุมัติจาก task result) */
test('approvalOf: decision=approved เดี่ยว ๆ → unknown (ไม่แต่ง gate)', () => {
  assert.equal(approvalOf({ result: '{"decision":"approved"}' }), 'unknown');
});

test('approvalOf: decision=approved + input มีหัวแผน GATE 1 → gate1', () => {
  assert.equal(approvalOf({ result: '{"decision":"approved"}', input: '# GATE 1 — ARENA PLAN' }), 'gate1');
});

test('approvalOf: GATE 2 ในผลลัพธ์ → gate2', () => {
  assert.equal(approvalOf({ result: 'Plan approved!\n# GATE 2 — BUILD PLAN', input: 'x' }), 'gate2');
});

test('approvalOf: annotated / changes requested → null', () => {
  assert.equal(approvalOf({ result: '{"decision":"annotated"} ... Plan changes requested' }), null);
});

test('approvalOf: pending → null', () => {
  assert.equal(approvalOf({ result: '{"decision":"pending"}' }), null);
});

test('approvalOf: "Plan approved!" → unknown', () => {
  assert.equal(approvalOf({ result: 'Plan approved!' }), 'unknown');
});

test('approvalOf: input ว่าง/ไม่ใช่ string → null และไม่ throw', () => {
  assert.equal(approvalOf({}), null);
  assert.equal(approvalOf({ result: 123 }), null);
});

test('approvalOf: input ที่ไม่เกี่ยวกับแผน + approved → unknown', () => {
  assert.equal(approvalOf({ result: '{"decision":"approved"}', input: 'ไม่เกี่ยวกับแผน' }), 'unknown');
});

/* ---------------------------------------------------------------- summary */
if (failures.length) {
  console.log(`\n${passed} passed, ${failures.length} failed`);
  process.exit(1);
}
console.log(`\n${passed} passed`);
