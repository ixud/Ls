/* bazer-flow runtime — one test per U-id. Run: node --test runtime.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRuntime, classifyPlanResult } from './runtime.mjs';
import { toChatMessage, toInboxUser, toAgentEvent, toToolEvent } from './adapter.mjs';
import { isProtectedPath, protectedInCommand, looksLikeWrite, isGateCliCommand, gateCliVerdict, shellScope } from './paths.mjs';
import { codeOf, bootEntry, introspect } from './diag.mjs';

const spec = JSON.parse(fs.readFileSync(new URL('./flow.spec.json', import.meta.url), 'utf8'));
const NOW = 1_700_000_000_000;
const PROJ = path.join('C:', 'proj', 'x.txt');
const TEMP = path.join(os.tmpdir(), 'bazer', 'x.txt');

const memStore = (seed = {}) => {
  const m = new Map(Object.entries(seed));
  return {
    get: (k) => (m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : undefined),
    set: (k, v) => { m.set(k, JSON.parse(JSON.stringify(v))); },
    del: (k) => { m.delete(k); },
    has: (k) => m.has(k),
    dump: () => [...m.keys()],
    snapshot: () => JSON.stringify([...m.entries()]),
  };
};
const boot = ({ store = memStore(), t = { v: NOW }, log, home, env } = {}) => {
  const rt = createRuntime({ spec, store, now: () => t.v, log, home, env });
  return { rt, store, t };
};
const WRITE = (p) => ({ tool: 'write', path: p });
const SHELL = (command) => ({ tool: 'shell', command });
const TASK = (subagent) => ({ tool: 'task', subagent });

function pathTo(flow, target) {
  const phases = spec.flows[flow].phases;
  const prev = new Map([[spec.flows[flow].start, null]]);
  const queue = [spec.flows[flow].start];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === target) break;
    for (const [key, to] of Object.entries(phases[cur].transitions)) {
      if (to === 'stay' || prev.has(to)) continue;
      prev.set(to, { from: cur, key });
      queue.push(to);
    }
  }
  const steps = [];
  let cur = target;
  while (prev.get(cur)) {
    const edge = prev.get(cur);
    steps.unshift(edge.key);
    cur = edge.from;
  }
  return steps;
}

function fire(rt, sid, key) {
  if (key === 'approved') return rt.userMessage(sid, { role: 'user', text: '>>approve' });
  if (key === 'skip') return rt.userMessage(sid, { role: 'user', text: '>>skip' });
  if (key === 'feedback') return rt.after(sid, { tool: 'submit_plan', output: '{"decision":"annotated"}' });
  const dot = key.lastIndexOf('.');
  const name = key.slice(0, dot);
  const kind = key.slice(dot + 1);
  if (kind === 'start') return rt.before(sid, TASK(name));
  if (kind === 'error') return rt.after(sid, { tool: 'task', subagent: name, error: true });
  return rt.after(sid, { tool: 'task', subagent: name });
}

function drive(rt, sid, flow, target) {
  for (const key of pathTo(flow, target)) fire(rt, sid, key);
  return rt;
}

test('U01 child->root walks up to 5 hops and survives a cycle', () => {
  const { rt } = boot();
  rt.linkSession('c1', 'r');
  rt.linkSession('c2', 'c1');
  rt.linkSession('c3', 'c2');
  rt.linkSession('c4', 'c3');
  rt.linkSession('c5', 'c4');
  assert.equal(rt.rootOf('c5'), 'r');
  assert.equal(rt.rootOf('r'), 'r');
  assert.equal(rt.rootOf('nobody'), 'nobody');
  rt.linkSession('a', 'b');
  rt.linkSession('b', 'a');
  assert.ok(['a', 'b'].includes(rt.rootOf('a')));
});

test('U02 non-flow agents are ungated and get no reminder', () => {
  const { rt } = boot();
  for (const agent of ['snack', 'advisor', 'ghost']) {
    const sid = 's-' + agent;
    rt.setAgent(sid, agent);
    assert.equal(rt.before(sid, WRITE(PROJ)).allow, true, agent);
    assert.equal(rt.before(sid, { tool: 'submit_plan' }).allow, true, agent);
    assert.equal(rt.remind(sid), null, agent);
    assert.equal(rt.after(sid, { tool: 'submit_plan', output: '{"decision":"approved"}' }), null, agent);
  }
});

test('U03 state is isolated per root and per flow', () => {
  const { rt } = boot();
  rt.setAgent('r1', 'buddha');
  rt.setAgent('r2', 'buddha');
  rt.setAgent('r3', 'bazer');
  drive(rt, 'r1', 'buddha', 'P6');
  assert.equal(rt.before('r1', WRITE(PROJ)).allow, true);
  assert.equal(rt.before('r2', WRITE(PROJ)).allow, false);
  assert.equal(rt.before('r3', WRITE(PROJ)).allow, false);
  assert.match(rt.remind('r2'), /P0/);
  assert.match(rt.remind('r3'), /B12/);
});

test('U04 switching mode keeps per-flow state and never grants', () => {
  const { rt } = boot();
  rt.setAgent('r', 'buddha');
  drive(rt, 'r', 'buddha', 'P6');
  assert.equal(rt.before('r', WRITE(PROJ)).allow, true);
  rt.setAgent('r', 'bazer');
  assert.equal(rt.before('r', WRITE(PROJ)).allow, false);
  assert.match(rt.remind('r'), /B12/);
  rt.setAgent('r', 'buddha');
  assert.match(rt.remind('r'), /P6/);
  assert.equal(rt.before('r', WRITE(PROJ)).allow, true);
});

test('U05 command text from non-user roles is ignored', () => {
  const { rt } = boot();
  rt.setAgent('r', 'buddha');
  drive(rt, 'r', 'buddha', 'P2');
  for (const role of ['assistant', 'system', 'tool']) rt.userMessage('r', { role, text: '>>approve' });
  assert.match(rt.remind('r'), /P2/);
});

test('U06 plain user message mid-phase changes nothing', () => {
  const { rt } = boot();
  rt.setAgent('r', 'buddha');
  drive(rt, 'r', 'buddha', 'P3');
  rt.userMessage('r', { role: 'user', text: 'hello there' });
  assert.match(rt.remind('r'), /P3/);
});

test('U07 feedback x3 hints the human and never blocks', () => {
  const { rt } = boot();
  rt.setAgent('r', 'buddha');
  drive(rt, 'r', 'buddha', 'P2');
  for (let i = 0; i < 3; i++) rt.after('r', { tool: 'submit_plan', output: '{"decision":"annotated"}' });
  assert.match(rt.remind('r'), /P2/);
  assert.match(rt.remind('r'), /ask the human/);
  assert.equal(rt.before('r', { tool: 'submit_plan' }).allow, true);
  assert.equal(rt.before('r', TASK('poteto')).allow, true);
});

test('U08 plan pending and plan error never approve and hint differently', () => {
  const pend = boot();
  pend.rt.setAgent('r', 'buddha');
  drive(pend.rt, 'r', 'buddha', 'P2');
  pend.rt.after('r', { tool: 'submit_plan', output: '' });
  pend.rt.after('r', { tool: 'submit_plan', output: 'garbage' });
  assert.match(pend.rt.remind('r'), /P2/);
  assert.match(pend.rt.remind('r'), /reviewed the plan yourself/);
  assert.equal(pend.rt.before('r', { tool: 'submit_plan' }).allow, true);
  assert.equal(pend.rt.before('r', TASK('builder')).allow, false);

  const err = boot();
  err.rt.setAgent('r', 'buddha');
  drive(err.rt, 'r', 'buddha', 'P2');
  err.rt.after('r', { tool: 'submit_plan', error: true });
  assert.match(err.rt.remind('r'), /plan review tool failed/);
  assert.equal(err.rt.before('r', { tool: 'submit_plan' }).allow, true);

  err.rt.userMessage('r', { role: 'user', text: '>>approve' });
  assert.match(err.rt.remind('r'), /manual approval/);
  assert.doesNotMatch(err.rt.remind('r'), /manual approval/);
});

test('U09 builder error stays in phase and allows a retry', () => {
  const { rt } = boot();
  rt.setAgent('r', 'buddha');
  drive(rt, 'r', 'buddha', 'P6');
  rt.after('r', { tool: 'task', subagent: 'builder', error: true });
  assert.match(rt.remind('r'), /P6/);
  assert.equal(rt.before('r', TASK('builder')).allow, true);
  assert.equal(rt.before('r', WRITE(PROJ)).allow, true);
});

test('U10 restart resumes phase+flags; corrupt store starts fresh closed', () => {
  const store = memStore();
  const first = createRuntime({ spec, store, now: () => NOW });
  first.setAgent('r', 'buddha');
  drive(first, 'r', 'buddha', 'P5');
  const again = createRuntime({ spec, store, now: () => NOW });
  again.remind('r');
  assert.match(again.remind('r'), /P5/);
  assert.equal(again.before('r', TASK('builder')).allow, false);
  assert.equal(again.before('r', WRITE(PROJ)).allow, false);
  const corrupt = createRuntime({ spec, store: memStore({ 'r.buddha': 'garbage' }), now: () => NOW });
  corrupt.setAgent('r', 'buddha');
  assert.match(corrupt.remind('r'), /P0/);
  assert.equal(corrupt.before('r', WRITE(PROJ)).allow, false);
});

test('U11 stall hint uses injected clock; >>skip proceeds', () => {
  const { rt, t } = boot();
  rt.setAgent('r', 'buddha');
  drive(rt, 'r', 'buddha', 'P3');
  assert.doesNotMatch(rt.remind('r'), /stalled/);
  t.v = NOW + spec.defaults.stallMs + 1;
  assert.match(rt.remind('r'), /stalled/);
  rt.userMessage('r', { role: 'user', text: '>>skip' });
  assert.match(rt.remind('r'), /P4/);
});

test('U12 out-of-order call is denied with a hint naming the next step', () => {
  const { rt } = boot();
  rt.setAgent('r', 'buddha');
  drive(rt, 'r', 'buddha', 'P4');
  const verdict = rt.before('r', TASK('builder'));
  assert.equal(verdict.allow, false);
  assert.match(verdict.hint, /next step/);
  assert.match(verdict.hint, /P4/);
});

test('U13 >>abort returns every phase to the start and closes writes', () => {
  for (const flow of Object.keys(spec.flows)) {
    for (const phase of Object.keys(spec.flows[flow].phases)) {
      const { rt } = boot();
      rt.setAgent('r', flow);
      drive(rt, 'r', flow, phase);
      rt.userMessage('r', { role: 'user', text: '>>abort' });
      assert.match(rt.remind('r'), new RegExp(spec.flows[flow].start), flow + ' ' + phase);
      assert.equal(rt.before('r', WRITE(PROJ)).allow, false, flow + ' ' + phase);
    }
  }
});

test('U14 write classification: project, temp, shell write and shell read', () => {
  const { rt } = boot();
  rt.setAgent('r', 'buddha');
  for (const phase of ['P0', 'P1', 'P2', 'P3', 'P4', 'P5']) {
    const fresh = boot();
    fresh.rt.setAgent('r', 'buddha');
    drive(fresh.rt, 'r', 'buddha', phase);
    assert.equal(fresh.rt.before('r', WRITE(PROJ)).allow, false, phase);
    assert.equal(fresh.rt.before('r', WRITE(TEMP)).allow, true, phase);
    assert.equal(fresh.rt.before('r', { tool: 'read' }).allow, true, phase);
  }
  assert.equal(rt.before('r', WRITE(PROJ)).allow, false);
  drive(rt, 'r', 'buddha', 'P6');
  assert.equal(rt.before('r', WRITE(PROJ)).allow, true);
  assert.equal(rt.before('r', WRITE(TEMP)).allow, true);

  const early = boot();
  early.rt.setAgent('r', 'buddha');
  drive(early.rt, 'r', 'buddha', 'P1');
  assert.equal(early.rt.before('r', SHELL('echo hi > out.txt')).allow, false);
  assert.equal(early.rt.before('r', SHELL('Set-Content out.txt hi')).allow, false);
  assert.equal(early.rt.before('r', SHELL('rm -rf build')).allow, false);
  assert.equal(early.rt.before('r', SHELL('ls -la')).allow, true);
  assert.equal(early.rt.before('r', SHELL('echo hi > "' + path.join(os.tmpdir(), 'bazer', 'out.txt') + '"')).allow, true);
  assert.equal(rt.before('r', SHELL('echo hi > out.txt')).allow, true);
});

test('U15 arena helpers are admitted only in the arena phase', () => {
  const { rt } = boot();
  rt.setAgent('r', 'buddha');
  drive(rt, 'r', 'buddha', 'P2');
  for (const name of ['arena-runner', 'arena-judge']) assert.equal(rt.before('r', TASK(name)).allow, false, name + ' @P2');
  drive(rt, 'r', 'buddha', 'P3');
  for (const name of ['arena-runner', 'arena-judge']) assert.equal(rt.before('r', TASK(name)).allow, true, name + ' @P3');
  drive(rt, 'r', 'buddha', 'P4');
  for (const name of ['arena-runner', 'arena-judge']) assert.equal(rt.before('r', TASK(name)).allow, false, name + ' @P4');
});

test('U16 classifyPlanResult matches every fixture string', () => {
  assert.equal(classifyPlanResult('{"decision":"approved"}'), 'approved');
  assert.equal(classifyPlanResult('Plan approved!'), 'approved');
  assert.equal(classifyPlanResult('Plan approved!\n# GATE 2 — BUILD PLAN'), 'approved');
  assert.equal(classifyPlanResult('approved: true'), 'approved');
  assert.equal(classifyPlanResult('{"decision":"annotated"}'), 'feedback');
  assert.equal(classifyPlanResult('{"decision":"annotated"} ... Plan changes requested'), 'feedback');
  assert.equal(classifyPlanResult('Plan changes requested'), 'feedback');
  assert.equal(classifyPlanResult('approved: false changes'), 'feedback');
  assert.equal(classifyPlanResult('{"decision":"pending"}'), 'pending');
  assert.equal(classifyPlanResult('Plan approved! Saved to: C:\\plans\\x.md'), 'approved');
  assert.equal(classifyPlanResult('Plan approved with notes!\n\n## Implementation Notes\n'), 'approved');
  assert.equal(classifyPlanResult('YOUR PLAN WAS NOT APPROVED.\n\nPlan changes requested'), 'feedback');
  assert.equal(classifyPlanResult('[Plannotator] Failed to open plan review: boom'), 'error');
  assert.equal(classifyPlanResult('Error: Plan content is empty after applying edits.'), 'error');
  assert.equal(classifyPlanResult('Plan changes requested\n\nnote: Plan approved! was early'), 'feedback');
  assert.equal(classifyPlanResult('YOUR PLAN WAS NOT APPROVED.\napproved: true'), 'feedback');
  assert.equal(classifyPlanResult(' \n\n Plan approved!'), 'approved');
  assert.equal(classifyPlanResult(' \n\tError: nope'), 'error');
  assert.equal(classifyPlanResult('Plan approved with notes!\n\n## Implementation Notes\n\nError: boom\nNOT APPROVED'), 'approved');
  assert.equal(classifyPlanResult('please check: Plan approved!'), 'pending');
  assert.equal(classifyPlanResult(''), 'pending');
  assert.equal(classifyPlanResult('   '), 'pending');
  assert.equal(classifyPlanResult(null), 'pending');
  assert.equal(classifyPlanResult(42), 'pending');
});

test('U17 orphan subagent session fails closed on project writes', () => {
  const { rt } = boot();
  rt.setAgent('child', 'builder');
  const denied = rt.before('child', WRITE(PROJ));
  assert.equal(denied.allow, false);
  assert.match(denied.hint, /Flow link missing/);
  assert.equal(rt.before('child', WRITE(TEMP)).allow, true);
  assert.equal(rt.before('child', { tool: 'read' }).allow, true);
});

test('U18 purge removes persisted state', () => {
  const store = memStore();
  const { rt } = boot({ store });
  rt.setAgent('r', 'buddha');
  drive(rt, 'r', 'buddha', 'P3');
  assert.ok(store.has('r.buddha'));
  rt.purge('r');
  assert.equal(store.has('r.buddha'), false);
  assert.equal(rt.remind('r'), null);
});

test('U20 many peeks leave store and log byte-identical', () => {
  const store = memStore();
  const entries = [];
  const rt = createRuntime({ spec, store, now: () => NOW, log: (e) => entries.push(e) });
  rt.setAgent('r', 'buddha');
  drive(rt, 'r', 'buddha', 'P2');
  const frozen = store.snapshot() + '|' + JSON.stringify(entries);
  for (let i = 0; i < 25; i++) {
    rt.peek('r', TASK('poteto'));
    rt.peek('r', TASK('builder'));
    rt.peek('r', WRITE(PROJ));
    rt.peek('r', { tool: 'submit_plan' });
    rt.peek('r', SHELL('echo hi > x'));
    rt.peek('r', WRITE(TEMP));
  }
  assert.equal(store.snapshot() + '|' + JSON.stringify(entries), frozen);
  assert.match(rt.remind('r'), /P2/);
});

test('U21 peek() and before() agree on every phase', () => {
  const reqs = [
    TASK('poteto'), TASK('builder'), TASK('arena'), WRITE(PROJ), WRITE(TEMP),
    SHELL('echo hi > x'), { tool: 'read' }, { tool: 'submit_plan' },
  ];
  for (const flow of Object.keys(spec.flows)) {
    for (const phase of Object.keys(spec.flows[flow].phases)) {
      const { rt } = boot();
      rt.setAgent('r', flow);
      drive(rt, 'r', flow, phase);
      for (const req of reqs) {
        const seen = rt.peek('r', req);
        assert.deepEqual(rt.before('r', req), seen, flow + ' ' + phase + ' ' + JSON.stringify(req));
      }
    }
  }
});

test('U22 logging never changes before()/peek() verdicts', () => {
  const make = (log) => {
    const { rt } = boot({ log });
    rt.setAgent('r', 'buddha');
    return rt;
  };
  const quiet = make(undefined);
  const loud = make(() => { throw new Error('log boom'); });
  const steps = [
    (rt) => rt.peek('r', TASK('builder')),
    (rt) => rt.before('r', TASK('poteto')),
    (rt) => rt.after('r', { tool: 'task', subagent: 'poteto' }),
    (rt) => rt.before('r', TASK('builder')),
    (rt) => rt.before('r', WRITE(PROJ)),
    (rt) => rt.after('r', { tool: 'submit_plan', output: '{"decision":"annotated"}' }),
    (rt) => rt.remind('r'),
    (rt) => rt.userMessage('r', { role: 'user', text: '>>approve' }),
    (rt) => rt.remind('r'),
    (rt) => rt.before('r', TASK('builder')),
    (rt) => rt.after('r', { tool: 'task', subagent: 'builder', error: true }),
    (rt) => rt.info('r'),
    (rt) => rt.before('r', WRITE(PROJ)),
    (rt) => rt.peek('r', WRITE(PROJ)),
  ];
  for (const step of steps) assert.deepEqual(step(loud), step(quiet));
});

test('U23 protected paths are denied in every phase; temp and project stay usable', () => {
  const HOME = 'C:\\Users\\Test User';
  const env = { HOME };
  const prot = HOME + '\\.config\\opencode\\opencode.jsonc';
  assert.equal(isProtectedPath(prot, env), true);
  assert.equal(isProtectedPath('C:/Users/Test User/.config/opencode/x.json', env), true);
  assert.equal(isProtectedPath(HOME + '\\.CONFIG\\OpenCode\\x.json', env), true);
  assert.equal(isProtectedPath(HOME + '\\.local\\state\\opencode\\bazer-flow\\v2\\meta.json', env), true);
  assert.equal(isProtectedPath(HOME + '\\.agents\\สกิล ไทย\\SKILL.md', env), true);
  assert.equal(isProtectedPath(HOME + '\\.plannotator\\plans\\a.md', env), true);
  assert.equal(isProtectedPath(HOME + '\\.config\\opencode\\a\\..\\b.json', env), true);
  assert.equal(isProtectedPath(HOME + '\\.config\\opencode\\..\\..\\other', env), false);
  assert.equal(isProtectedPath(path.join(os.tmpdir(), 'bazer', 'x.txt'), env), false);
  assert.equal(isProtectedPath(PROJ, env), false);
  assert.equal(protectedInCommand('rm "' + prot + '"', env), true);
  assert.equal(protectedInCommand('rm $HOME/.agents/x', env), true);
  assert.equal(protectedInCommand('echo x > %USERPROFILE%\\.config\\opencode\\x', env), true);

  for (const flow of Object.keys(spec.flows)) {
    for (const phase of Object.keys(spec.flows[flow].phases)) {
      const { rt } = boot({ home: HOME });
      rt.setAgent('r', flow);
      drive(rt, 'r', flow, phase);
      assert.equal(rt.peek('r', WRITE(prot)).allow, false, flow + ' ' + phase);
      assert.equal(rt.before('r', WRITE(prot)).allow, false, flow + ' ' + phase);
      assert.equal(rt.before('r', SHELL('rm "' + prot + '"')).allow, false, flow + ' ' + phase);
      assert.equal(rt.before('r', SHELL('cat "' + prot + '"')).allow, true, flow + ' ' + phase);
      assert.equal(rt.before('r', WRITE(path.join(os.tmpdir(), 'bazer', 'x.txt'))).allow, true, flow + ' ' + phase);
    }
  }

  const b = boot({ home: HOME });
  b.rt.setAgent('r', 'bazer');
  drive(b.rt, 'r', 'bazer', 'B4');
  assert.equal(b.rt.before('r', WRITE(PROJ)).allow, true);

  const c = boot({ home: HOME });
  c.rt.setAgent('r', 'bazer');
  c.rt.linkSession('kid', 'r');
  c.rt.setAgent('kid', 'builder');
  drive(c.rt, 'r', 'bazer', 'B4');
  assert.equal(c.rt.before('kid', WRITE(prot)).allow, false);
});

test('U24 every deny hint says STOP and carries a reason code', () => {
  const HOME = 'C:\\Users\\Test User';
  const prot = HOME + '\\.config\\opencode\\x.json';
  const { rt } = boot({ home: HOME });
  rt.setAgent('r', 'buddha');
  const phase1 = rt.peek('r', TASK('builder')).hint;
  drive(rt, 'r', 'buddha', 'P6');
  const phase2 = rt.peek('r', TASK('arena')).hint;
  const protHint = rt.peek('r', WRITE(prot)).hint;
  rt.setAgent('child', 'builder');
  const orphan = rt.before('child', WRITE(PROJ)).hint;
  for (const h of [phase1, phase2, protHint, orphan]) {
    assert.ok(h.length <= 200, h);
    assert.match(h, /STOP|Stop/);
  }
  assert.equal(codeOf(phase1), 'phase-order');
  assert.equal(codeOf(phase2), 'phase-order');
  assert.equal(codeOf(protHint), 'protected');
  assert.equal(codeOf(orphan), 'orphan');

  const snack = boot({ home: HOME });
  snack.rt.setAgent('snack-root', 'snack');
  assert.equal(snack.rt.before('snack-root', WRITE(prot)).allow, false);
  assert.equal(snack.rt.peek('snack-root', WRITE(prot)).allow, false);
  assert.equal(snack.rt.before('snack-root', SHELL('rm "' + prot + '"')).allow, false);
  assert.equal(snack.rt.before('snack-root', WRITE(PROJ)).allow, true);
  assert.equal(snack.rt.before('snack-root', WRITE(path.join(os.tmpdir(), 'bazer', 'x.txt'))).allow, true);
  assert.equal(snack.rt.before('snack-root', { tool: 'read' }).allow, true);
});

test('U25 callId links before() to after() when the after payload has no subagent', () => {
  const entries = [];
  const { rt } = boot({ log: (e) => entries.push(e) });
  rt.setAgent('r', 'buddha');
  assert.equal(rt.before('r', { tool: 'task', subagent: 'poteto', id: 'call-1' }).allow, true);
  rt.after('r', { tool: 'task', id: 'call-1' });
  assert.match(rt.remind('r'), /P2/);

  const quiet = rt.remind('r');
  rt.after('r', { tool: 'task', id: 'call-404' });
  assert.match(quiet, /P2/);
  assert.equal(entries.filter((e) => e.event === 'after-miss' && e.why === 'no subagent').length, 1);

  for (let i = 0; i < 51; i++) rt.before('r', { tool: 'task', subagent: 'poteto', id: 'k' + i });
  const missesBefore = entries.filter((e) => e.event === 'after-miss').length;
  rt.after('r', { tool: 'task', id: 'k0' });
  assert.equal(entries.filter((e) => e.event === 'after-miss').length, missesBefore + 1);
});

test('U27 child session chat command is ignored and state is unchanged', () => {
  const { rt } = boot();
  rt.setAgent('root', 'bazer');
  rt.linkSession('child', 'root');
  rt.setAgent('child', 'plannotator');
  drive(rt, 'root', 'bazer', 'B3');
  const before = rt.remind('root');
  const res = rt.userChat({ sid: 'child', agent: 'plannotator', messageId: 'm1', text: '>>approve' });
  assert.equal(res.applied, false);
  assert.equal(res.why, 'child');
  assert.equal(rt.remind('root'), before);
});

test('U28 root >>approve at a gate advances; same messageId applies once', () => {
  const { rt } = boot();
  rt.setAgent('root', 'buddha');
  drive(rt, 'root', 'buddha', 'P2');
  const first = rt.userChat({ sid: 'root', agent: 'buddha', messageId: 'm1', text: '>>approve' });
  assert.equal(first.applied, true);
  assert.match(rt.remind('root'), /manual approval/);
  const again = rt.userChat({ sid: 'root', agent: 'buddha', messageId: 'm1', text: '>>approve' });
  assert.equal(again.applied, false);
  assert.equal(again.why, 'duplicate');
  const wrongAgent = rt.userChat({ sid: 'root', agent: 'snack', messageId: 'm2', text: '>>approve' });
  assert.equal(wrongAgent.why, 'agent');
});

test('U29 multi-part text is trimmed and non-text parts are ignored', () => {
  const msg = toChatMessage({ sessionID: 'r' }, {
    message: { id: 'm9', agent: 'buddha' },
    parts: [{ type: 'text', text: '\n  >>approve  \n' }, { type: 'tool', tool: 'x' }, { type: 'text', text: '' }],
  });
  assert.equal(msg.text, '>>approve');
  const { rt } = boot();
  rt.setAgent('r', 'buddha');
  drive(rt, 'r', 'buddha', 'P2');
  assert.equal(rt.userChat(msg).applied, true);
  assert.match(rt.remind('r'), /manual approval/);
});

test('U30 boot entry carries build, hooks and spec hash (no ctxKeys)', () => {
  const entry = bootEntry({ build: '2i', hooks: ['chat.message'], spec: 'abc12345', dir: 'C:/plugins/bazer-flow', ctx: { session: { hook: () => {} } } });
  assert.equal(entry.event, 'boot');
  assert.equal(entry.build, '2i');
  assert.deepEqual(entry.hooks, ['chat.message']);
  assert.equal(entry.spec, 'abc12345');
  assert.equal(entry.dir, 'C:/plugins/bazer-flow');
  assert.equal(entry.ctxKeys, undefined);
  assert.ok(entry.ctxMethods.some((k) => k.startsWith('session.hook')));
});

test('U31 introspection survives cycles, throwing getters and proxies', () => {
  const cyc = { a: 1 };
  cyc.self = cyc;
  const withGetter = { get boom() { throw new Error('nope'); }, ok: 1 };
  const proxy = new Proxy({}, { ownKeys() { throw new Error('no keys'); } });
  assert.doesNotThrow(() => introspect(cyc));
  assert.doesNotThrow(() => introspect(withGetter));
  assert.doesNotThrow(() => introspect(proxy));
  const keys = introspect(cyc, 3, 200).ctxKeys;
  assert.ok(keys.length <= 200);
  assert.ok(keys.includes('self:object'));
  const { rt } = boot();
  rt.setAgent('r', 'buddha');
  const a = rt.peek('r', WRITE(PROJ));
  introspect(rt);
  assert.deepEqual(rt.peek('r', WRITE(PROJ)), a);
});

const GATE_CMD = 'plannotator annotate "C:\\Temp\\bazer\\plan-gate-single.md" --gate --json --require-approval --result-file "C:\\Temp\\bazer\\result.json"';
const GATE_NOISE = 'Resolved: C:\\Temp\\bazer\\result.json\nAt line:1 char:65\n+ ...NativeCommandError...\n';
const gateOut = (d) => GATE_NOISE + '{"decision":"' + d + '"}\nEXIT=0';

test('U32 real-shaped approved output at B3 opens the gate (reconstructed from user transcript)', () => {
  const { rt } = boot();
  rt.setAgent('root', 'bazer');
  rt.setAgent('child', 'plannotator');
  rt.linkSession('child', 'root');
  drive(rt, 'root', 'bazer', 'B3');
  assert.equal(rt.before('child', { tool: 'shell', command: GATE_CMD, id: 'g1' }).allow, true);
  rt.after('child', { tool: 'shell', id: 'g1', output: gateOut('approved') });
  assert.equal(rt.info('root').phase, 'B4');
  assert.equal(rt.before('root', TASK('builder')).allow, true);
});

test('U33 same approved output opens P2 and P5', () => {
  for (const [phase, next] of [['P2', 'P3'], ['P5', 'P6']]) {
    const { rt } = boot();
    rt.setAgent('root', 'buddha');
    rt.setAgent('child', 'plannotator');
    rt.linkSession('child', 'root');
    drive(rt, 'root', 'buddha', phase);
    rt.before('child', { tool: 'shell', command: GATE_CMD, id: 'g-' + phase });
    rt.after('child', { tool: 'shell', id: 'g-' + phase, output: gateOut('approved') });
    assert.equal(rt.info('root').phase, next, phase);
  }
});

test('U34 feedback decision stays at the gate and counts a round', () => {
  const { rt } = boot();
  rt.setAgent('root', 'bazer');
  rt.setAgent('child', 'plannotator');
  rt.linkSession('child', 'root');
  drive(rt, 'root', 'bazer', 'B3');
  rt.before('child', { tool: 'shell', command: GATE_CMD, id: 'g2' });
  rt.after('child', { tool: 'shell', id: 'g2', output: gateOut('annotated') });
  assert.equal(rt.info('root').phase, 'B3');
  assert.equal(rt.badge('root'), 'GATE r2');
  assert.equal(rt.before('root', { tool: 'submit_plan' }).allow, true);
});

test('U35 spoofed gate commands are ignored', () => {
  const { rt } = boot();
  rt.setAgent('root', 'bazer');
  rt.setAgent('child', 'plannotator');
  rt.linkSession('child', 'root');
  drive(rt, 'root', 'bazer', 'B3');
  for (const cmd of ['echo plannotator annotate --gate --json', 'plannotator annotate --gate --json --result-file "decision.json"', 'Get-ChildItem --gate']) {
    assert.equal(isGateCliCommand(cmd), false, cmd);
    rt.before('child', { tool: 'shell', command: cmd, id: 's1' });
    rt.after('child', { tool: 'shell', id: 's1', output: gateOut('approved') });
    assert.equal(rt.info('root').phase, 'B3', cmd);
  }
});

test('U36 wrong phase or wrong agent cannot open a gate', () => {
  const entries = [];
  const a = boot({ log: (e) => entries.push(e) });
  a.rt.setAgent('root', 'bazer');
  a.rt.setAgent('child', 'plannotator');
  a.rt.linkSession('child', 'root');
  drive(a.rt, 'root', 'bazer', 'B3');
  a.rt.before('child', { tool: 'shell', command: GATE_CMD, id: 'g3' });
  a.rt.after('child', { tool: 'shell', id: 'g3', output: gateOut('approved') });
  assert.equal(a.rt.info('root').phase, 'B4');
  a.rt.before('child', { tool: 'shell', command: GATE_CMD, id: 'g4' });
  a.rt.after('child', { tool: 'shell', id: 'g4', output: gateOut('approved') });
  assert.equal(a.rt.info('root').phase, 'B4');
  assert.equal(entries.filter((e) => e.event === 'gate-cli-after' && e.why === 'not-gate').length, 1);

  const b = boot();
  b.rt.setAgent('root', 'bazer');
  drive(b.rt, 'root', 'bazer', 'B3');
  b.rt.before('root', { tool: 'shell', command: GATE_CMD, id: 'g5' });
  b.rt.after('root', { tool: 'shell', id: 'g5', output: gateOut('approved') });
  assert.equal(b.rt.info('root').phase, 'B3');
});

test('U37 output without a JSON decision line stays pending', () => {
  const { rt } = boot();
  rt.setAgent('root', 'bazer');
  rt.setAgent('child', 'plannotator');
  rt.linkSession('child', 'root');
  drive(rt, 'root', 'bazer', 'B3');
  rt.before('child', { tool: 'shell', command: GATE_CMD, id: 'g6' });
  rt.after('child', { tool: 'shell', id: 'g6', output: 'EXIT=0\nno decision here' });
  assert.equal(rt.info('root').phase, 'B3');
  assert.equal(rt.badge('root'), 'GATE r1');
});

test('U38 prose output mentioning approval never opens a gate', () => {
  const { rt } = boot();
  rt.setAgent('root', 'bazer');
  rt.setAgent('child', 'plannotator');
  rt.linkSession('child', 'root');
  drive(rt, 'root', 'bazer', 'B3');
  rt.after('child', { tool: 'task', subagent: 'plannotator', id: 't1', output: '{"output":"The reviewer approved the plan"}' });
  assert.equal(rt.info('root').phase, 'B3');
  rt.after('child', { tool: 'submit_plan', id: 'p1', output: 'The reviewer approved the plan' });
  assert.equal(rt.info('root').phase, 'B3');
  assert.equal(classifyPlanResult('The reviewer approved the plan'), 'pending');
});

test('U39 two runtimes on one store agree immediately', () => {
  const store = memStore();
  const a = boot({ store }).rt;
  const b = boot({ store }).rt;
  a.setAgent('r', 'buddha');
  a.before('r', { tool: 'task', subagent: 'poteto', id: 'c1' });
  b.after('r', { tool: 'task', subagent: 'poteto', id: 'c1' });
  assert.equal(a.info('r').phase, 'P2');
  assert.equal(b.info('r').phase, 'P2');
  const frozen = store.snapshot();
  a.peek('r', WRITE(PROJ));
  b.peek('r', WRITE(PROJ));
  assert.equal(store.snapshot(), frozen);
});

test('U40 read-only PowerShell is not a write', () => {
  const cmds = [
    'echo "---TEST dir---"; Get-ChildItem "C:\\Users\\Bazer\\Desktop\\TEST" -Force | Select-Object Name,Length',
    'Get-ChildItem "C:\\Users\\Bazer\\Desktop\\TEST" -Force | Select-Object Name,Length',
    'Get-ChildItem -LiteralPath "C:\\Users\\Bazer\\Desktop\\TEST" | Measure-Object',
    'Get-Content "C:\\Users\\Bazer\\Desktop\\TEST\\a.txt" -TotalCount 5',
    'Get-ChildItem "C:\\Users\\Bazer\\Desktop\\TEST" -Force 2>$null',
  ];
  for (const c of cmds) assert.equal(looksLikeWrite(c), false, c);
  assert.equal(looksLikeWrite('echo hi > out.txt'), true);
  assert.equal(looksLikeWrite('rm -rf x'), true);
  const { rt } = boot();
  rt.setAgent('root', 'bazer');
  drive(rt, 'root', 'bazer', 'B3');
  assert.equal(rt.before('root', { tool: 'shell', command: cmds[0] }).allow, true);
});

test('U41 duplicate delivery across two instances applies once', () => {
  const store = memStore();
  const a = boot({ store }).rt;
  const b = boot({ store }).rt;
  a.setAgent('r', 'buddha');
  drive(a, 'r', 'buddha', 'P2');
  const res = { tool: 'submit_plan', id: 'plan-1', output: '{"decision":"annotated"}' };
  a.after('r', res);
  b.after('r', res);
  assert.equal(a.badge('r'), 'GATE r2');
  assert.equal(b.badge('r'), 'GATE r2');
  const msg = { sid: 'r', agent: 'buddha', messageId: 'm-1', text: '>>approve' };
  assert.equal(a.userChat(msg).applied, true);
  const dup = b.userChat(msg);
  assert.equal(dup.applied, false);
  assert.equal(dup.why, 'duplicate');
  assert.equal(b.info('r').phase, 'P3');
});

test('U42 one-shot notice is consumed once across instances', () => {
  const store = memStore();
  const a = boot({ store }).rt;
  const b = boot({ store }).rt;
  a.setAgent('r', 'buddha');
  drive(a, 'r', 'buddha', 'P2');
  a.userChat({ sid: 'r', agent: 'buddha', messageId: 'm1', text: '>>approve' });
  assert.match(b.remind('r'), /manual approval/);
  const second = a.remind('r');
  assert.doesNotMatch(second, /manual approval/);
  assert.match(second, /P3/);
});

test('U43 gate-cli output in five shapes opens B3, P2 and P5 (reconstructed from evidence)', () => {
  const forms = [
    gateOut('approved'),
    { output: gateOut('approved') },
    { output: { output: gateOut('approved') } },
    { stdout: gateOut('approved') },
    [{ type: 'text', text: gateOut('approved') }],
  ];
  const cases = [['bazer', 'B3', 'B4'], ['buddha', 'P2', 'P3'], ['buddha', 'P5', 'P6']];
  for (const [flow, phase, next] of cases) {
    for (const [i, output] of forms.entries()) {
      const { rt } = boot();
      rt.setAgent('root', flow);
      rt.setAgent('child', 'plannotator');
      rt.linkSession('child', 'root');
      drive(rt, 'root', flow, phase);
      rt.before('child', { tool: 'shell', command: GATE_CMD, id: 'g' + i });
      rt.after('child', { tool: 'shell', id: 'g' + i, output });
      assert.equal(rt.info('root').phase, next, flow + ' ' + phase + ' form ' + i);
    }
  }
});

test('U44 annotated decision stays at the gate and counts a round', () => {
  const { rt } = boot();
  rt.setAgent('root', 'bazer');
  rt.setAgent('child', 'plannotator');
  rt.linkSession('child', 'root');
  drive(rt, 'root', 'bazer', 'B3');
  rt.before('child', { tool: 'shell', command: GATE_CMD, id: 'gf' });
  rt.after('child', { tool: 'shell', id: 'gf', output: { output: gateOut('annotated') } });
  assert.equal(rt.info('root').phase, 'B3');
  assert.equal(rt.badge('root'), 'GATE r2');
});

test('U45 hook and event routes apply once; pending first does not starve a later approval', () => {
  const entries = [];
  const { rt } = boot({ log: (e) => entries.push(e) });
  rt.setAgent('root', 'bazer');
  rt.setAgent('child', 'plannotator');
  rt.linkSession('child', 'root');
  drive(rt, 'root', 'bazer', 'B3');
  rt.before('child', { tool: 'shell', command: GATE_CMD, id: 'gx' });
  rt.after('child', { tool: 'shell', id: 'gx', output: 'EXIT=0\nno json here' });
  assert.equal(rt.info('root').phase, 'B3');
  rt.gateEvent('child', 'gx', [gateOut('approved')]);
  assert.equal(rt.info('root').phase, 'B4');
  rt.gateEvent('child', 'gx', [gateOut('approved')]);
  rt.after('child', { tool: 'shell', id: 'gx', output: gateOut('approved') });
  assert.equal(rt.info('root').phase, 'B4');
  assert.ok(entries.some((e) => e.event === 'gate-cli-after' && e.via === 'event' && e.outcome === 'approved'));
  assert.ok(entries.some((e) => e.event === 'gate-cli-after' && e.why === 'dup'));
  assert.ok(entries.some((e) => e.event === 'after-seen' && e.tool === 'shell' && e.hasId === true));
});

test('U46 inbox event applies >>approve once per inboxID; child and near-miss ignored', () => {
  const entries = [];
  const { rt } = boot({ log: (e) => entries.push(e) });
  rt.setAgent('root', 'bazer');
  rt.setAgent('child', 'plannotator');
  rt.linkSession('child', 'root');
  drive(rt, 'root', 'bazer', 'B3');
  const evt = (sid, id, text) => toInboxUser({ type: 'session.inbox.enqueued', data: { sessionID: sid, inboxID: id, item: { type: 'user', payload: { text } } } });
  const first = evt('root', 'ib1', '>>approve');
  assert.deepEqual(first.leaves, ['>>approve']);
  assert.equal(rt.inboxUser(first).applied, true);
  assert.equal(rt.info('root').phase, 'B4');
  for (let i = 0; i < 4; i++) assert.equal(rt.inboxUser(first).applied, false);
  assert.equal(rt.info('root').phase, 'B4');
  const childEvt = evt('child', 'ib2', '>>abort');
  assert.equal(rt.inboxUser(childEvt).applied, false);
  assert.equal(rt.info('root').phase, 'B4');
  const near = evt('root', 'ib3', 'please >>approve');
  assert.equal(rt.inboxUser(near).applied, false);
  assert.ok(entries.some((e) => e.event === 'user' && e.cmd === 'plain' && e.itemType === 'user'));
});

test('U47 session.agent.selected maps to setAgent', () => {
  const { rt } = boot();
  rt.setAgent('r', 'snack');
  const sel = toAgentEvent({ type: 'session.agent.selected', data: { sessionID: 'r', agent: 'BAZER', previous: 'snack' } });
  assert.deepEqual(sel, { sid: 'r', agent: 'bazer' });
  rt.setAgent(sel.sid, sel.agent);
  assert.equal(rt.info('r').agent, 'bazer');
  assert.equal(rt.info('r').flow, 'bazer');
});

test('U48 gate-cli-after carries shape+tail and no message text is logged', () => {
  const entries = [];
  const { rt } = boot({ log: (e) => entries.push(e) });
  rt.setAgent('root', 'bazer');
  rt.setAgent('child', 'plannotator');
  rt.linkSession('child', 'root');
  drive(rt, 'root', 'bazer', 'B3');
  rt.before('child', { tool: 'shell', command: GATE_CMD, id: 'gt' });
  rt.after('child', { tool: 'shell', id: 'gt', output: gateOut('approved') });
  const gate = entries.find((e) => e.event === 'gate-cli-after');
  assert.ok(gate && typeof gate.shape === 'string' && gate.shape.length > 0);
  assert.ok(typeof gate.tail === 'string' && gate.tail.endsWith('EXIT=0'));
  assert.equal(gate.callId6, 'gt');
  rt.inboxUser(toInboxUser({ type: 'session.inbox.enqueued', data: { sessionID: 'root', inboxID: 'ib9', item: { type: 'user', payload: { text: 'secret message' } } } }));
  assert.equal(JSON.stringify(entries).includes('secret message'), false);
  assert.ok(entries.some((e) => e.event === 'user' && e.cmd === 'plain'));
});

const V1 = 'plannotator annotate "$d\\p.md" --gate --json --require-approval --result-file "$d\\r.json" 2>&1; echo "EXIT=$LASTEXITCODE"';
const V2 = V1.replace('echo', 'Write-Output');
const V3 = 'plannotator annotate "$d\\p.md" --gate --json --require-approval --result-file "$d\\r.json" 2>&1; "EXIT=$LASTEXITCODE"';
const V4 = 'plannotator.exe annotate --gate --json --require-approval --result-file "r.json"';
const V5 = 'cd "$d"; $env:X=1; plannotator annotate p.md --gate --json';

test('U49 gate-cli verdicts: exit-status echoes accepted, literal spoofs rejected', () => {
  for (const [name, cmd] of [['V1', V1], ['V2', V2], ['V3', V3], ['V4', V4], ['V5', V5]]) {
    assert.deepEqual(gateCliVerdict(cmd), { accepted: true, why: 'ok' }, name);
    assert.equal(isGateCliCommand(cmd), true, name);
  }
  const rejects = [
    ['echo \'{"decision":"approved"}\'', 'no-token'],
    ['echo \'{"decision":"approved"}\'; plannotator annotate x --gate --json', 'spoof-literal'],
    ['echo approved; plannotator annotate x --gate --json', 'spoof-literal'],
    ['Set-Content r.json \'{"decision":"approved"}\'', 'no-token'],
    ['plannotator annotate x --gate --json; Set-Content r.json hi', 'spoof-write'],
    ['Get-ChildItem --gate --json', 'no-token'],
    ['plannotator annotate x --gate', 'no-json'],
    ['plannotator annotate x --json', 'no-gate'],
    ['plannotator annotate x --gate --json; echo "hello"', 'spoof-echo'],
    ['plannotator annotate x --gate --json > out.txt', 'redirect'],
    ['plannotator annotate x --gate --json; printf hi', 'spoof-write'],
  ];
  for (const [cmd, why] of rejects) assert.deepEqual(gateCliVerdict(cmd), { accepted: false, why }, cmd);
});

test('U50 gate-cli-check is logged once per callId without command text', () => {
  const entries = [];
  const { rt } = boot({ log: (e) => entries.push(e) });
  rt.setAgent('root', 'bazer');
  drive(rt, 'root', 'bazer', 'B3');
  rt.before('root', { tool: 'shell', command: V1, id: 'chk1' });
  rt.before('root', { tool: 'shell', command: V1, id: 'chk1' });
  const checks = entries.filter((e) => e.event === 'gate-cli-check');
  assert.equal(checks.length, 1);
  assert.equal(checks[0].accepted, true);
  assert.equal(checks[0].why, 'ok');
  assert.equal(checks[0].callId6, 'chk1');
  assert.equal(JSON.stringify(entries).includes('annotate'), false);
});

test('U51 remembered gate callId lives in the store and is usable by another instance', () => {
  const store = memStore();
  const a = boot({ store }).rt;
  const b = boot({ store }).rt;
  a.setAgent('root', 'bazer');
  a.setAgent('child', 'plannotator');
  a.linkSession('child', 'root');
  b.setAgent('child', 'plannotator');
  b.linkSession('child', 'root');
  drive(a, 'root', 'bazer', 'B3');
  a.before('child', { tool: 'shell', command: V4, id: 'xg1' });
  b.gateEvent('child', 'xg1', [gateOut('approved')]);
  assert.equal(a.info('root').phase, 'B4');
  b.gateEvent('child', 'xg1', [gateOut('approved')]);
  assert.equal(b.info('root').phase, 'B4');
  assert.equal(store.get('gcli').includes('xg1'), false);
});

test('U52 shell write scope resolves same-command literals, fails closed otherwise', () => {
  const tempDir = path.join(os.tmpdir(), 'bazer', 'foo');
  const ok = '$dir="' + tempDir + '"; Remove-Item "$dir\\result.json" -ErrorAction SilentlyContinue';
  assert.equal(shellScope(ok), 'temp');
  assert.equal(shellScope('Remove-Item "$dir\\result.json" -ErrorAction SilentlyContinue'), 'project');
  assert.equal(shellScope('$dir="C:\\proj\\x"; Remove-Item "$dir\\r.json"'), 'project');
  assert.equal(shellScope("$dir='" + tempDir + "'; Remove-Item \"$dir\\r.json\""), 'temp');
  assert.equal(shellScope('Remove-Item "C:\\proj\\x"'), 'project');
  assert.equal(shellScope('Get-ChildItem .'), 'read');

  const { rt } = boot();
  rt.setAgent('root', 'bazer');
  drive(rt, 'root', 'bazer', 'B3');
  assert.equal(rt.before('root', { tool: 'shell', command: ok }).allow, true);
  assert.equal(rt.before('root', { tool: 'shell', command: 'Remove-Item "$dir\\result.json"' }).allow, false);
});

test('U53 inbox items apply only when item.type is user', () => {
  const entries = [];
  const { rt } = boot({ log: (e) => entries.push(e) });
  rt.setAgent('root', 'bazer');
  drive(rt, 'root', 'bazer', 'B3');
  const evt = (type, id) => toInboxUser({ type: 'session.inbox.enqueued', data: { sessionID: 'root', inboxID: id, item: { type, payload: { text: '>>approve' } } } });
  assert.equal(rt.inboxUser(evt('synthetic', 's1')).applied, false);
  assert.equal(rt.inboxUser(evt('compaction', 'c1')).applied, false);
  assert.equal(rt.info('root').phase, 'B3');
  assert.ok(entries.some((e) => e.event === 'user' && e.cmd === 'ignored' && e.why === 'item-type'));
  assert.equal(rt.inboxUser(evt('user', 'u1')).applied, true);
  assert.equal(rt.info('root').phase, 'B4');
});

test('U54 hook route parses a JSON-escaped output string (reconstructed from user log)', () => {
  const raw = 'Resolved: C:\\Temp\\x\\result.json\n{"decision":"approved"}\nEXIT=0\r\n';
  const escaped = JSON.stringify({ output: raw, metadata: { status: 'completed' } });
  const { rt } = boot();
  rt.setAgent('root', 'bazer');
  rt.setAgent('child', 'plannotator');
  rt.linkSession('child', 'root');
  drive(rt, 'root', 'bazer', 'B3');
  rt.before('child', { tool: 'shell', command: V4, id: 'esc1' });
  rt.after('child', { tool: 'shell', id: 'esc1', output: escaped });
  assert.equal(rt.info('root').phase, 'B4');
});

test('U55 shell reads are allowed; writes resolve env vars or fail closed', () => {
  const env = { TEMP: path.join(os.tmpdir()), TMP: path.join(os.tmpdir()), LOCALAPPDATA: path.join(os.tmpdir(), 'Local'), USERPROFILE: 'C:\\Users\\X' };
  const { rt } = boot({ env });
  rt.setAgent('root', 'bazer');
  drive(rt, 'root', 'bazer', 'B3');
  const a = '$raw=[System.IO.File]::ReadAllText("' + path.join(os.tmpdir(), 'bazer', 'x', 'result.json') + '",[Text.Encoding]::UTF8); $o=$raw|ConvertFrom-Json; Write-Output "decision=$($o.decision)"';
  const b = '$p="$env:TEMP\\bazer\\x\\plan.md"; $b=[IO.File]::ReadAllBytes($p); "bytes=$($b.Length)"; $t=[IO.File]::ReadAllText($p)';
  const c = '$exe=Join-Path $env:LOCALAPPDATA \'plannotator\\plannotator.exe\'; $plan=Join-Path $env:TEMP \'bazer\\x\\plan.md\'; $res=Join-Path $env:TEMP \'bazer\\x\\result.json\'; if (Test-Path $res) { Get-Content $res }';
  for (const cmd of [a, b, c]) assert.equal(rt.before('root', { tool: 'shell', command: cmd }).allow, true, cmd.slice(0, 40));

  const tempWrite = 'Set-Content "$env:TEMP\\bazer\\x\\a.txt" hi';
  assert.equal(rt.before('root', { tool: 'shell', command: tempWrite }).allow, true);

  const unresolved = rt.before('root', { tool: 'shell', command: 'Set-Content "$x\\a.txt" hi' });
  assert.equal(unresolved.allow, false);
  assert.equal(unresolved.detail, 'unresolved-var');

  const ioWrite = rt.before('root', { tool: 'shell', command: '[IO.File]::WriteAllText("C:\\proj\\a.txt","x")' });
  assert.equal(ioWrite.allow, false);
  assert.equal(ioWrite.detail, 'io-write');

  const prot = rt.before('root', { tool: 'shell', command: 'Set-Content "C:\\Users\\X\\.config\\opencode\\x.json" hi' });
  assert.equal(prot.allow, false);
  assert.equal(prot.detail, 'protected');
  assert.equal(rt.before('root', { tool: 'shell', command: 'Write-Output "hi"' }).allow, true);
});

test('U56 duplicate and no-call gate logs are deduped process-wide; plain inbox once', () => {
  const store = memStore();
  const ea = [];
  const eb = [];
  const a = boot({ store, log: (e) => ea.push(e) }).rt;
  const b = boot({ store, log: (e) => eb.push(e) }).rt;
  a.setAgent('root', 'bazer');
  a.setAgent('child', 'plannotator');
  a.linkSession('child', 'root');
  b.linkSession('child', 'root');
  drive(a, 'root', 'bazer', 'B3');
  b.gateEvent('child', 'gone1', [gateOut('approved')]);
  assert.equal([...ea, ...eb].filter((e) => e.event === 'gate-cli-after' && e.why === 'no-call').length, 0);
  a.before('child', { tool: 'shell', command: V4, id: 'dup1' });
  a.after('child', { tool: 'shell', id: 'dup1', output: gateOut('approved') });
  b.gateEvent('child', 'dup1', [gateOut('approved')]);
  assert.equal([...ea, ...eb].filter((e) => e.event === 'gate-cli-after' && e.why === 'dup').length, 1);
  const plainEvt = toInboxUser({ type: 'session.inbox.enqueued', data: { sessionID: 'root', inboxID: 'p1', item: { type: 'user', payload: { text: 'hello there' } } } });
  a.inboxUser(plainEvt);
  b.inboxUser(plainEvt);
  assert.equal([...ea, ...eb].filter((e) => e.event === 'user' && e.cmd === 'plain').length, 1);
});

test('U57 PLANNOTATOR.md canonical template is accepted by gateCliVerdict', () => {
  const md = fs.readFileSync(new URL('../../02SUBAGENT/PLANNOTATOR.md', import.meta.url), 'utf8');
  const m = /## Canonical gate command[\s\S]*?```\n([^\n]+)\n```/.exec(md);
  assert.ok(m, 'template found');
  const tpl = m[1].replace('<PLAN>', 'C:\\Temp\\bazer\\p.md').replace('<RESULT>', 'C:\\Temp\\bazer\\r.json');
  assert.deepEqual(gateCliVerdict(tpl), { accepted: true, why: 'ok' });
});

test('U58 builtin vars are not user vars; WSL paths map to drive paths', () => {
  const tmp = os.tmpdir();
  const { rt } = boot({ env: { TEMP: tmp, TMP: tmp } });
  rt.setAgent('root', 'buddha');
  drive(rt, 'root', 'buddha', 'P3');
  const candidate = path.join(tmp, 'bazer', 'x', 'candidate-3', 'hello7.txt');
  const six = 'Set-Content -Path "' + candidate + '" -Value \'hi\' -NoNewline -Encoding utf8; "exit: $LASTEXITCODE"';
  assert.equal(rt.before('root', { tool: 'shell', command: six }).allow, true, six);
  assert.equal(rt.before('root', { tool: 'shell', command: 'Set-Content "$nope\\a.txt" hi; "exit: $LASTEXITCODE"' }).detail, 'unresolved-var');

  const wslTemp = 'bash -c "echo hi > /mnt/c/Users/Bazer/AppData/Local/Temp/bazer/x/candidate-1/hello7.txt"';
  const mapped = rt.before('root', { tool: 'shell', command: wslTemp.replace('/mnt/c/Users/Bazer/AppData/Local/Temp', tmp.replace(/\\/g, '/').replace('C:', '/mnt/c')) });
  assert.equal(mapped.allow, true, 'wsl temp');
  assert.equal(rt.before('root', { tool: 'shell', command: 'bash -c "echo hi > /mnt/c/proj/x.txt"' }).allow, false);
  const home = os.homedir().replace(/\\/g, '/');
  const prot = rt.before('root', { tool: 'shell', command: 'bash -c "echo hi > ' + home.replace(/^([A-Za-z]):/, '/mnt/$1').toLowerCase() + '/.config/opencode/x.json"' });
  assert.equal(prot.allow, false);
  assert.equal(prot.detail, 'protected');
});

test('U59 inner -c scripts are classified with cd/workdir as base', () => {
  const tmp = os.tmpdir();
  const { rt } = boot({ env: { TEMP: tmp, TMP: tmp } });
  rt.setAgent('root', 'buddha');
  drive(rt, 'root', 'buddha', 'P3');
  const cd = 'bash -c "cd ' + tmp.replace(/\\/g, '/').replace('C:', '/mnt/c') + '/bazer/x/candidate-1 && printf hi > hello7.txt"';
  assert.equal(rt.before('root', { tool: 'shell', command: cd }).allow, true, 'bash cd temp');
  const cmd = 'cmd /c "cd /d ' + tmp + '\\bazer\\x\\candidate-1 && echo hi > hello7.txt"';
  assert.equal(rt.before('root', { tool: 'shell', command: cmd }).allow, true, 'cmd cd temp');
  assert.equal(rt.before('root', { tool: 'shell', command: 'bash -c "echo hi > out.txt"' }).allow, false);
  assert.equal(rt.before('root', { tool: 'shell', command: 'echo hi > out.txt', workdir: path.join(tmp, 'bazer', 'x') }).allow, true, 'workdir temp');
  assert.equal(rt.before('root', { tool: 'shell', command: 'bash -c "cd C:\\proj && echo hi > out.txt"' }).allow, false);
});

test('U60 interpreter writes denied and detail-specific hints', () => {
  const { rt } = boot();
  rt.setAgent('root', 'buddha');
  drive(rt, 'root', 'buddha', 'P3');
  const py = rt.before('root', { tool: 'shell', command: 'python -c "open(r\'C:\\x\',\'w\').write(1)"' });
  assert.equal(py.allow, false);
  assert.equal(py.detail, 'interpreter-write');
  assert.match(py.hint, /Use the write\/edit tool/);
  const uv = rt.before('root', { tool: 'shell', command: 'Set-Content "$x\\a.txt" hi' });
  assert.match(uv.hint, /^STOP\. Each shell call is a separate process/);
  const rd = rt.before('root', { tool: 'shell', command: 'echo hi > out.txt' });
  assert.match(rd.hint, /instead of shell redirects/);
  const prot = rt.before('root', { tool: 'shell', command: 'Set-Content "' + os.homedir() + '\\.config\\opencode\\x" hi' });
  assert.match(prot.hint, /^Protected path/);
  const phase = rt.before('root', TASK('builder'));
  assert.match(phase.hint, /^STOP\./);
});

test('U19 subagent session gets no reminder', () => {
  const { rt } = boot();
  rt.setAgent('root', 'buddha');
  rt.linkSession('child', 'root');
  drive(rt, 'root', 'buddha', 'P3');
  assert.equal(rt.remind('child'), null);
  assert.match(rt.remind('root'), /P3/);
});
