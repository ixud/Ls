/**
 * plan.mjs — คำนวณสถานะของทุก entry โดยไม่เขียนอะไรเลย (dry-run)
 * 5 สถานะ: ok · stale · missing · foreign · broken(+design/raw)
 */
import fs from 'node:fs';
import path from 'node:path';
import { makeResolver } from './env.mjs';
import { manifest, policies, sha256File, sha256, srcPath, treeFiles, mustExist } from './manifest.mjs';
import { parseJsonc, getAtPath, setAtPath } from './jsonc.mjs';

const exists = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const readText = (p) => fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');

export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (typeof a === 'object') {
    const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
    if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

/** ค่าที่ต้องการเป็น "ส่วนหนึ่ง" ของค่าจริงหรือไม่ (ใช้กับ jsonc-merge ที่ merge ลึก) */
export function subsetMatch(cur, want) {
  if (want && typeof want === 'object' && !Array.isArray(want)) {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return false;
    return Object.entries(want).every(([k, v]) => subsetMatch(cur[k], v));
  }
  return deepEqual(cur, want);
}

export function policyLevel(policyId, levelId) {
  const p = policies[policyId];
  if (!p) throw new Error(`ไม่พบ policy: ${policyId}`);
  const id = String(levelId ?? p.defaultLevel);
  const lv = p.levels.find((l) => String(l.id) === id);
  if (!lv) throw new Error(`ไม่พบระดับ ${id} ใน ${policyId}`);
  return lv;
}

/**
 * permission ที่ต้องเขียนลง config = ค่าของระดับ + override ของ entry
 * (บันไดเดียวครอบได้หลาย agent — เช่น ARENA-RUNNER/JUDGE ที่บังคับห้าม spawn)
 */
export function policyPermission(entry, level) {
  const lv = level || policyLevel(entry.fromPolicy);
  return { ...lv.permission, ...(entry.policyOverrides || {}) };
}

function desiredConfigValue(entry, home) {
  if (entry.fromPolicy) {
    return policyPermission(entry, policyLevel(entry.fromPolicy));
  }
  return entry.value;
}

function entryTarget(entry, resolve) {
  return entry.target ? resolve(entry.target) : null;
}

/** สถานะของ entry เดียว */
export function stateOf(entry, home) {
  const { resolve } = makeResolver(home);
  const target = entryTarget(entry, resolve);
  const base = { id: entry.id, kind: entry.kind, title: entry.title, target, status: entry.status, strategy: entry.strategy, auto: entry.auto !== false };
  if (entry.status === 'design') return { ...base, state: 'design', note: entry.why || 'ยังไม่พร้อม', writable: false };
  if (!mustExist(entry)) return { ...base, state: 'missing', note: `ไม่พบต้นทาง: ${entry.source}`, writable: false, blocker: true };

  const strat = entry.strategy;
  if (strat === 'overwrite') {
    if (!exists(target)) return { ...base, state: 'missing', writable: true };
    const same = sha256File(target) === sha256File(srcPath(entry));
    return { ...base, state: same ? 'ok' : 'stale', writable: !same };
  }
  if (strat === 'create-only') {
    return exists(target) ? { ...base, state: 'ok', note: 'มีอยู่แล้ว (ไม่ทับ)', writable: false } : { ...base, state: 'missing', writable: true };
  }
  if (strat === 'template-once') {
    if (!exists(target)) return { ...base, state: 'missing', writable: true };
    const same = sha256File(target) === sha256File(srcPath(entry));
    return { ...base, state: same ? 'ok' : 'stale', note: same ? '' : 'template ต่างจากไฟล์ในเครื่อง (owner: user — ไม่ทับอัตโนมัติ)', writable: false, locked: true };
  }
  if (strat === 'jsonc-merge') {
    const desired = desiredConfigValue(entry, home);
    if (!exists(target)) return { ...base, state: 'missing', writable: true, note: `ค่าเป้าหมาย: ${entry.valuePath}` };
    let parsed;
    try { parsed = parseJsonc(readText(target)); } catch (e) { return { ...base, state: 'broken', note: `อ่าน jsonc ไม่ได้: ${e.message}`, writable: false, blocker: true }; }
    const cur = getAtPath(readText(target), entry.valuePath.split('.'));
    if (entry.onlyIfMissing && cur !== undefined) return { ...base, state: 'ok', note: 'คงค่าที่มีอยู่แล้ว', writable: false };
    const equal = subsetMatch(cur, desired);
    return { ...base, state: equal ? 'ok' : 'stale', writable: !equal, note: `${entry.valuePath} = ${JSON.stringify(desired)}` };
  }
  if (strat === 'jsonc-remove-array-item') {
    if (!exists(target)) return { ...base, state: 'ok', note: 'ไม่มีไฟล์ = ไม่มีของค้าง', writable: false };
    const cur = getAtPath(readText(target), entry.valuePath.split('.'));
    const has = Array.isArray(cur) && cur.includes(entry.remove);
    return { ...base, state: has ? 'stale' : 'ok', writable: has, note: has ? `พบ ${entry.remove} ใน ${entry.valuePath}` : 'ไม่มีอยู่แล้ว' };
  }
  if (strat === 'copy-tree') {
    const files = treeFiles(entry);
    if (!isDir(target)) return { ...base, state: 'missing', note: `${files.length} ไฟล์`, writable: true };
    let same = 0, diff = 0, miss = 0;
    for (const f of files) {
      const dst = path.join(target, f.rel);
      if (!exists(dst)) miss++;
      else if (sha256File(dst) !== sha256File(f.abs)) diff++;
      else same++;
    }
    const state = miss ? 'missing' : diff ? 'stale' : 'ok';
    return { ...base, state, note: `${files.length} ไฟล์ · ตรง ${same} · ต่าง ${diff} · ยังไม่มี ${miss}`, writable: miss + diff > 0, counts: { same, diff, miss, total: files.length } };
  }
  if (strat === 'line') {
    const line = entry.line;
    if (!exists(target)) return { ...base, state: 'missing', note: `ไม่พบไฟล์ ${target}`, writable: false };
    const hit = readText(target).split(/\r?\n/).find((l) => l.trim().startsWith(line));
    const want = `${line} ${entry.value ?? ''}`.trim();
    return { ...base, state: hit && hit.trim() === want ? 'ok' : 'stale', writable: true, note: want };
  }
  if (strat === 'patch') {
    return { ...base, state: 'design', note: 'ยังไม่ implement strategy patch', writable: false };
  }
  return { ...base, state: 'broken', note: `strategy ไม่รู้จัก: ${strat}`, writable: false, blocker: true };
}

function scanForeign(home) {
  const { resolve } = makeResolver(home);
  const out = [];
  const agentsDir = resolve('${CONFIG}/agents');
  const ours = new Set(manifest.entries.filter((e) => e.target && e.target.includes('/agents/')).map((e) => path.basename(resolve(e.target)).toLowerCase()));
  if (isDir(agentsDir)) {
    for (const f of fs.readdirSync(agentsDir)) {
      if (!f.toLowerCase().endsWith('.md')) continue;
      if (!ours.has(f.toLowerCase())) out.push({ area: 'agents', name: f, abs: path.join(agentsDir, f) });
    }
  }
  const skillsDir = resolve('${SKILLS}');
  const pstack = manifest.entries.find((e) => e.id === 'skills.pstack');
  const oursSkills = pstack ? new Set(treeFiles(pstack).map((f) => f.rel.split(/[\\/]/)[0])) : new Set();
  if (isDir(skillsDir)) {
    for (const d of fs.readdirSync(skillsDir)) {
      const p = path.join(skillsDir, d);
      if (!isDir(p)) continue;
      if (!oursSkills.has(d)) out.push({ area: 'skills', name: d, abs: p });
    }
  }
  return out;
}

export function computePlan(home, { lawResult } = {}) {
  const entries = manifest.entries.map((e) => {
    try { return stateOf(e, home); }
    catch (err) { return { id: e.id, kind: e.kind, title: e.title, state: 'broken', note: err.message, writable: false, blocker: true }; }
  });
  const summary = entries.reduce((acc, e) => { acc[e.state] = (acc[e.state] || 0) + 1; return acc; }, { ok: 0, stale: 0, missing: 0, broken: 0, design: 0 });
  const foreign = scanForeign(home);
  const blockers = [];
  for (const e of entries) if (e.blocker) blockers.push(`${e.id}: ${e.note}`);
  if (lawResult && lawResult.failed) blockers.push(...lawResult.rules.filter((r) => !r.ok).map((r) => `${r.id}: ${r.title}`));
  return { at: new Date().toISOString(), home, entries, summary, foreign, foreignTotal: foreign.length, blockers, applicable: entries.filter((e) => e.auto && e.writable).length };
}

/** ข้อความ before/after สำหรับแสดง diff (ตัดที่ 24k ตัวอักษร) */
export function diffFor(entryId, home) {
  const entry = manifest.entries.find((e) => e.id === entryId);
  if (!entry) throw new Error(`ไม่พบ entry: ${entryId}`);
  const { resolve } = makeResolver(home);
  const target = entry.target ? resolve(entry.target) : null;
  const clip = (s) => (s.length > 24000 ? s.slice(0, 24000) + '\n… (ตัด)' : s);
  const before = target && exists(target) ? readText(target) : '';
  if (entry.strategy === 'overwrite' || entry.strategy === 'create-only' || entry.strategy === 'template-once') {
    return { id: entry.id, target, before: clip(before), after: clip(readText(srcPath(entry))) };
  }
  if (entry.strategy === 'jsonc-merge') {
    const desired = desiredConfigValue(entry, home);
    const next = setAtPath(before || '{\n}\n', entry.valuePath.split('.'), desired, { merge: true });
    return { id: entry.id, target, before: clip(before), after: clip(next) };
  }
  if (entry.strategy === 'jsonc-remove-array-item') {
    const parsed = before ? parseJsonc(before) : {};
    const cur = entry.valuePath.split('.').reduce((o, k) => (o == null ? o : o[k]), parsed);
    const next = { ...parsed, [entry.valuePath.split('.')[0]]: Array.isArray(cur) ? cur.filter((x) => x !== entry.remove) : cur };
    return { id: entry.id, target, before: clip(before), after: clip(JSON.stringify(next, null, 2)) };
  }
  if (entry.strategy === 'copy-tree') {
    const files = treeFiles(entry).map((f) => {
      const dst = path.join(target, f.rel);
      return { rel: f.rel.replace(/\\/g, '/'), state: !exists(dst) ? 'new' : sha256File(dst) === sha256File(f.abs) ? 'same' : 'diff' };
    });
    return { id: entry.id, target, files };
  }
  return { id: entry.id, target, before: clip(before), after: '', note: 'strategy นี้ยังไม่แสดง diff' };
}

export { sha256 };
