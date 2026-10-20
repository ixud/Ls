/**
 * probe.mjs — พิสูจน์กับของจริง (ไม่ใช่ "อ่านไฟล์ของเราเองแล้วบอกว่าผ่าน")
 * kind ทั้งหมดต้องมาจาก probes.json — ถ้าเพิ่ม kind ใหม่ ต้องเพิ่มใน README + CHANGELOG
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { makeResolver } from './env.mjs';
import { probes, manifest } from './manifest.mjs';
import { policyLevel } from './plan.mjs';
import { getAtPath } from './jsonc.mjs';
import { readState } from './apply.mjs';

const run = (cmd, args = [], timeout = 20000) => {
  // Windows: `opencode` เป็น shim (.cmd/.ps1) — spawn ตรง ๆ จะ ENOENT ต้องผ่าน shell
  const line = [cmd, ...args].map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)).join(' ');
  const r = spawnSync(line, { shell: true, encoding: 'utf8', timeout, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status ?? -1, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
};

let agentCache = { at: 0, data: null };
export function opencodeAgents({ fresh = false } = {}) {
  if (!fresh && agentCache.data && Date.now() - agentCache.at < 8000) return agentCache.data;
  let data = null;
  let lastErr = '';
  for (let attempt = 0; attempt < 2 && !data; attempt++) {
    const r = run('opencode', ['debug', 'agents']);
    if (r.code !== 0 || !r.out.startsWith('[')) {
      lastErr = `opencode debug agents ล้มเหลว: ${(r.err || r.out).slice(0, 300)}`;
      continue;
    }
    let parsed;
    try { parsed = JSON.parse(r.out); } catch (e) { lastErr = `อ่านผลไม่ได้: ${e.message}`; continue; }
    if (!Array.isArray(parsed)) { lastErr = 'ผลของ opencode debug agents ไม่ใช่ array'; continue; }
    // ลิสต์ว่างเคยเจอแบบไม่สม่ำเสมอ — ลองใหม่หนึ่งครั้งก่อนสรุป (กันรายงานผิดว่า "ไม่มี agent")
    if (parsed.length === 0) { lastErr = 'opencode debug agents ตอบลิสต์ว่าง'; continue; }
    data = parsed;
  }
  if (!data) throw new Error(lastErr || 'opencode debug agents ล้มเหลว');
  agentCache = { at: Date.now(), data };
  return data;
}

const cmpVersion = (a, b) => {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
};

export function plannotatorLocate(home) {
  const { resolve } = makeResolver(home);
  const roots = [resolve('${HOME}/.cache/opencode/npm'), resolve('${HOME}/.plannotator'), resolve('${HOME}/.local/share/opencode')].filter((p) => fs.existsSync(p));
  const hits = [];
  let visited = 0;
  const deadline = Date.now() + 5000;
  const walk = (dir) => {
    if (Date.now() > deadline || visited > 6000 || hits.length > 20) return;
    let names = [];
    try { names = fs.readdirSync(dir); } catch { return; }
    for (const n of names) {
      const p = path.join(dir, n);
      let st; try { st = fs.statSync(p); } catch { continue; }
      if (st.isDirectory()) { walk(p); continue; }
      visited++;
      if (!/\.(html|js|mjs|cjs)$/i.test(n) || st.size > 8 * 1024 * 1024) continue;
      try {
        const text = fs.readFileSync(p, 'utf8');
        if (text.includes('switchTo')) hits.push({ file: p, marker: 'switchTo', hasBuild: text.includes('"build"') || text.includes("'build'") });
      } catch { /* ข้ามไฟล์อ่านไม่ได้ */ }
    }
  };
  for (const r of roots) walk(r);
  return { roots, hits, scanned: visited };
}

const impl = {
  'node-version': (p) => {
    const v = process.versions.node;
    return { ok: cmpVersion(v, p.min) >= 0, detail: `node ${v} (ต้องการ ≥ ${p.min})` };
  },
  'cmd-version': (p) => {
    const r = run(p.cmd, ['--version']);
    if (r.code !== 0) return { ok: false, detail: `เรียก ${p.cmd} ไม่ได้: ${(r.err || r.out).slice(0, 200)}` };
    const m = /(\d+\.\d+\.\d+)/.exec(r.out);
    const v = m ? m[1] : r.out.slice(0, 40);
    return { ok: m ? cmpVersion(v, p.min) >= 0 : false, detail: `${p.cmd} ${v} (ต้องการ ≥ ${p.min})` };
  },
  'agents-hidden': (p, home) => {
    const data = opencodeAgents();
    const bad = [];
    for (const id of p.ids) {
      const a = data.find((x) => x.id === id);
      if (!a) { bad.push(`${id}: ไม่พบ`); continue; }
      if (a.hidden !== true || a.mode !== 'subagent') bad.push(`${id}: mode=${a.mode} hidden=${a.hidden}`);
    }
    return { ok: bad.length === 0, detail: bad.length ? bad.join(' · ') : `ซ่อนแล้ว: ${p.ids.join(', ')}` };
  },
  'agents-present': (p) => {
    const data = opencodeAgents();
    const badList = [];
    for (const id of p.ids) {
      const a = data.find((x) => x.id === id);
      if (!a) { badList.push(`${id}: ไม่พบ`); continue; }
      if (a.mode !== p.mode) { badList.push(`${id}: mode=${a.mode}`); continue; }
      if (p.marker && !String(a.system || '').includes(p.marker)) badList.push(`${id}: ไฟล์รุ่นเก่า (ไม่มี marker)`);
    }
    return { ok: badList.length === 0, detail: badList.length ? badList.join(' · ') : `โหลดครบ ${p.ids.length} ตัว (ไฟล์ใหม่)` };
  },
  'permission-level': (p, home) => {
    const state = readState();
    const levelId = state.policy?.policyId === p.policy ? state.policy.level : undefined;
    const level = policyLevel(p.policy, levelId);
    // ต้องมีค่าอยู่ใน config จริงด้วย ไม่งั้น permission ที่เห็นอาจมาจากไฟล์โหมดเอง (false positive)
    const { resolve } = makeResolver(home);
    const cfgFile = resolve('${CONFIG}/opencode.jsonc');
    let cfgValue;
    if (fs.existsSync(cfgFile)) {
      try { cfgValue = getAtPath(fs.readFileSync(cfgFile, 'utf8'), ['agent', p.agent, 'permission']); } catch { cfgValue = undefined; }
    }
    const data = opencodeAgents();
    const agent = data.find((x) => x.id === p.agent);
    if (!agent) return { ok: false, detail: `ไม่พบ agent ${p.agent}` };
    const resolved = {};
    for (const r of agent.permissions || []) {
      if (r.resource !== '*') continue;
      if (r.action === '*') continue;
      resolved[r.action] = r.effect; // กฎที่อยู่ท้ายสุดชนะ (config ต่อท้ายไฟล์)
    }
    const wrong = [];
    for (const [action, effect] of Object.entries(level.permission)) {
      if (resolved[action] !== effect) wrong.push(`${action}: คาด ${effect} แต่ได้ ${resolved[action] ?? '(ไม่มี)'}`);
    }
    return {
      ok: wrong.length === 0 && cfgValue !== undefined,
      detail: cfgValue === undefined
        ? 'ยังไม่ได้เขียนระดับนี้ลง config — ค่าที่เห็นอาจมาจากไฟล์โหมดเอง'
        : wrong.length ? wrong.join(' · ') : `ระดับ ${level.id} ${level.name} มีผลจริง`,
      extra: { level: level.id, resolved, inConfig: cfgValue !== undefined },
    };
  },
  'json-file': (p, home) => {
    const { resolve } = makeResolver(home);
    const f = resolve(p.target);
    if (!fs.existsSync(f)) return { ok: false, detail: `ไม่พบ ${f}` };
    try { JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '')); return { ok: true, detail: 'อ่านได้' }; }
    catch (e) { return { ok: false, detail: `parse ไม่ได้: ${e.message}` }; }
  },
  'file-exists': (p, home) => {
    const { resolve } = makeResolver(home);
    const f = resolve(p.target);
    return { ok: fs.existsSync(f), detail: fs.existsSync(f) ? 'มีอยู่' : `ไม่พบ ${f}` };
  },
  'plannotator-locate': (p, home) => {
    const r = plannotatorLocate(home);
    return { ok: r.hits.length > 0, detail: r.hits.length ? `เจอ ${r.hits.length} ไฟล์` : `ไม่เจอใน ${r.roots.join(' · ')}`, extra: r };
  },
};

export const PROBE_KINDS = Object.keys(impl);

export function runProbes(home) {  const results = [];
  for (const p of probes.probes) {
    const fn = impl[p.kind];
    if (!fn) { results.push({ id: p.id, title: p.title, ok: false, severity: p.severity, detail: `kind "${p.kind}" ไม่มี implementation` }); continue; }
    try {
      const r = fn(p.params || {}, home);
      results.push({ id: p.id, title: p.title, severity: p.severity, ...r });
    } catch (e) {
      results.push({ id: p.id, title: p.title, ok: false, severity: p.severity, detail: e.message });
    }
  }
  const failed = results.filter((r) => !r.ok && r.severity === 'fail');
  return { at: new Date().toISOString(), results, ok: failed.length === 0, failed: failed.length, warn: results.filter((r) => !r.ok && r.severity === 'warn').length };
}

export function verifyProofs(home) {
  const out = [];
  for (const e of manifest.entries) {
    if (!e.proof) continue;
    const r = runProbes(home).results.find((x) => x.id === e.proof);
    out.push({ entry: e.id, probe: e.proof, ok: !!r?.ok, detail: r?.detail });
  }
  return out;
}
