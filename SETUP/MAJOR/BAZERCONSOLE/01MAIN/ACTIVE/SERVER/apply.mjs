/**
 * apply.mjs — เขียนไฟล์จริงแบบมีหลักประกัน
 * ลำดับ: backup → atomic write → อ่านกลับเทียบ hash → history
 * ล้มกลางทาง = หยุด + rollback รอบนั้น
 */
import fs from 'node:fs';
import path from 'node:path';
import { BACKUP_DIR, HISTORY_FILE, STATE_FILE, VAR_DIR, ensureVarDir, makeResolver } from './env.mjs';
import { manifest, settings, policies, sha256File, sha256, srcPath, treeFiles } from './manifest.mjs';
import { stateOf, policyLevel as policyLevelOf } from './plan.mjs';
import { setAtPath, removeArrayItem, getAtPath } from './jsonc.mjs';

const now = () => new Date().toISOString();
const readText = (p) => fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
const exists = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };

export function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${String(d.getMilliseconds()).padStart(3, '0')}`;
}

export function readState() {
  try { return JSON.parse(readText(STATE_FILE)); } catch { return { entries: {}, policy: null, locks: {} }; }
}
export function writeState(s) {
  ensureVarDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2), 'utf8');
}

function safeRel(target) {
  // ต้องไม่ชนกัน: ใช้ hash ของพาธเต็มนำหน้า แล้วต่อท้ายด้วยชื่อไฟล์ (อ่านง่าย)
  const h = sha256(Buffer.from(target.toLowerCase(), 'utf8')).slice(0, 12);
  return `${h}_${path.basename(target)}`;
}

const looksBinary = (buf) => buf.includes(0);

export function backupFile(st, target) {
  const existed = exists(target);
  const hashBefore = existed ? sha256File(target) : null;
  if (existed) {
    const dst = path.join(BACKUP_DIR, st, 'files', safeRel(target));
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(target, dst);
  }
  return { target, existed, hashBefore };
}

export function record(st, items) {
  ensureVarDir();
  const dir = path.join(BACKUP_DIR, st);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'manifest.json');
  let doc = { stamp: st, at: now(), items: [] };
  if (fs.existsSync(file)) { try { doc = JSON.parse(readText(file)); } catch { /* เขียนใหม่ */ } }
  const seen = new Set(doc.items.map((i) => i.target));
  for (const it of items) if (!seen.has(it.target)) doc.items.push(it);
  fs.writeFileSync(file, JSON.stringify(doc, null, 2), 'utf8');
}

export function history(row) {
  ensureVarDir();
  const line = [row.at || now(), row.stamp, row.entry || '-', row.action || 'write', row.target, row.hashBefore || '-', row.hashAfter || '-', row.result || 'ok'].join('\t');
  fs.appendFileSync(HISTORY_FILE, line + '\n', 'utf8');
}

export function writeTextAtomic(target, text) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.bazer-tmp-${process.pid}`;
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, target);
  return sha256File(target);
}

/** เขียนหนึ่ง entry — เรียกหลัง stateOf บอกว่า writable (export เพื่อใช้ทดสอบ) */
export function writeEntry(entry, home, st) {
  const { resolve } = makeResolver(home);
  const target = resolve(entry.target);
  const written = [];
  const push = (t, text) => {
    const b = backupFile(st, t);
    const h = writeTextAtomic(t, text);
    record(st, [{ ...b, hashAfter: h }]);
    written.push({ ...b, hashAfter: h });
    history({ stamp: st, entry: entry.id, action: 'write', target: t, hashBefore: b.hashBefore, hashAfter: h });
  };
  const pushFile = (t, srcAbs) => {
    const b = backupFile(st, t);
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.copyFileSync(srcAbs, t);
    const h = sha256File(t);
    record(st, [{ ...b, hashAfter: h }]);
    written.push({ ...b, hashAfter: h });
    history({ stamp: st, entry: entry.id, action: 'copy', target: t, hashBefore: b.hashBefore, hashAfter: h });
  };

  switch (entry.strategy) {
    case 'overwrite':
    case 'create-only':
    case 'template-once': {
      if (entry.strategy !== 'overwrite' && exists(target)) return { skipped: 'มีอยู่แล้ว (ไม่ทับ)' };
      push(target, readText(srcPath(entry)));
      break;
    }
    case 'jsonc-merge': {
      const cur = exists(target) ? readText(target) : '{\n}\n';
      const desired = entry.fromPolicy ? policyLevelOf(entry.fromPolicy).permission : entry.value;
      const next = setAtPath(cur, entry.valuePath.split('.'), desired, { merge: true });
      if (next !== cur) push(target, next);
      break;
    }
    case 'jsonc-remove-array-item': {
      const cur = readText(target);
      const next = removeArrayItem(cur, entry.valuePath.split('.'), entry.remove);
      if (next !== cur) push(target, next);
      break;
    }
    case 'copy-tree': {
      for (const f of treeFiles(entry)) {
        const dst = path.join(target, f.rel);
        const srcHash = sha256File(f.abs);
        if (exists(dst) && sha256File(dst) === srcHash) continue;
        const buf = fs.readFileSync(f.abs);
        // ไฟล์ไบนารี (มี NUL) ห้ามอ่านเป็นข้อความ — จะพัง
        if (looksBinary(buf)) pushFile(dst, f.abs);
        else push(dst, buf.toString('utf8'));
      }
      break;
    }
    case 'line': {
      const cur = exists(target) ? readText(target) : null;
      if (cur === null) throw new Error(`ไม่พบไฟล์ ${target} — ติดตั้ง template ก่อน`);
      const next = setLineText(cur, entry.line, entry.value);
      if (next !== cur) push(target, next);
      break;
    }
    default:
      throw new Error(`strategy "${entry.strategy}" ยังไม่พร้อม`);
  }
  return { written };
}

export function setLineText(text, prefix, value) {
  const lines = text.split(/\r?\n/);
  const want = `${prefix} ${value}`.trimEnd();
  let hit = false;
  const out = lines.map((l) => {
    if (!l.trim().startsWith(prefix)) return l;
    hit = true;
    return want;
  });
  if (!hit) out.push(want);
  return out.join('\n');
}

export function applyEntries(home, ids) {
  ensureVarDir();
  const st = stamp();
  const state = readState();
  const applied = [], skipped = [], errors = [];
  const targets = ids && ids.length ? manifest.entries.filter((e) => ids.includes(e.id)) : manifest.entries;

  for (const entry of targets) {
    if (entry.status === 'design') { skipped.push({ id: entry.id, why: 'status=design' }); continue; }
    if (entry.strategy === 'patch') { skipped.push({ id: entry.id, why: 'strategy patch ยังไม่พร้อม' }); continue; }
    if (!entry.auto && !(ids && ids.includes(entry.id))) { skipped.push({ id: entry.id, why: 'auto=false (ต้องสั่งเอง)' }); continue; }
    if (entry.owner === 'user' && exists((makeResolver(home).resolve(entry.target)))) {
      skipped.push({ id: entry.id, why: 'owner=user (ไม่ทับ)' }); continue;
    }
    let stt;
    try { stt = stateOf(entry, home); } catch (e) { errors.push({ id: entry.id, why: e.message }); continue; }
    if (!stt.writable) { skipped.push({ id: entry.id, why: stt.note || stt.state }); continue; }
    try {
      const r = writeEntry(entry, home, st);
      applied.push({ id: entry.id, files: r.written?.length || 0 });
      state.entries[entry.id] = { at: now(), hash: r.written?.[0]?.hashAfter || null };
    } catch (e) {
      errors.push({ id: entry.id, why: e.message });
      break; // หยุดทั้งชุด
    }
  }
  state.lastApply = { at: now(), stamp: st, applied: applied.length, skipped: skipped.length, errors: errors.length, rolledBack: null };
  writeState(state);

  // ล้มกลางทาง = หยุดทั้งชุด + คืนไฟล์จาก backup ของรอบนี้ (สัญญาใน README §4)
  let rolledBack = null;
  if (errors.length) {
    try {
      rolledBack = rollback(home, st);
      state.lastApply.rolledBack = rolledBack;
      state.lastApply.errorsDetail = errors;
      writeState(state);
    } catch (e) {
      rolledBack = { error: e.message };
      state.lastApply.rolledBack = rolledBack;
      writeState(state);
    }
  }
  return { stamp: st, applied, skipped, errors, rolledBack, ok: errors.length === 0 };
}

/** เขียนค่า config เดียว (ใช้โดย settings-save / policy-set / toggle) */
export function writeJsonc(home, targetTemplate, keys, value, { merge = false, entry = 'settings', st = stamp() } = {}) {
  const { resolve } = makeResolver(home);
  const target = resolve(targetTemplate);
  const cur = exists(target) ? readText(target) : '{\n}\n';
  const next = setAtPath(cur, keys, value, { merge });
  if (next === cur) return { changed: false, target, stamp: st };
  const b = backupFile(st, target);
  const h = writeTextAtomic(target, next);
  record(st, [{ ...b, hashAfter: h }]);
  history({ stamp: st, entry, action: 'write', target, hashBefore: b.hashBefore, hashAfter: h });
  return { changed: true, target, stamp: st, hashAfter: h };
}

export function setPolicy(home, policyId, levelId) {
  const level = policyLevelOf(policyId, levelId);
  const entry = manifest.entries.find((e) => e.fromPolicy === policyId);
  if (!entry) throw new Error(`ไม่มี entry ที่ผูกกับ policy ${policyId}`);
  const state = readState();
  const prev = state.policy && state.policy.policyId === policyId
    ? state.policy.level
    : String(policies[policyId]?.defaultLevel ?? policyLevelOf(policyId).id);
  const r = writeJsonc(home, entry.target, entry.valuePath.split('.'), level.permission, { entry: `policy.${policyId}` });
  state.policy = { policyId, level: String(level.id), at: now(), prev };
  writeState(state);
  return { ...r, level: level.id, name: level.name, prev };
}

export function undoPolicy(home) {
  const state = readState();
  if (!state.policy || !state.policy.prev) throw new Error('ยังไม่มีการเปลี่ยนระดับให้ย้อน');
  const p = state.policy;
  const level = policyLevelOf(p.policyId, p.prev);
  const entry = manifest.entries.find((e) => e.fromPolicy === p.policyId);
  const r = writeJsonc(home, entry.target, entry.valuePath.split('.'), level.permission, { entry: `policy.${p.policyId}` });
  state.policy = { policyId: p.policyId, level: String(level.id), at: now(), prev: p.level };
  writeState(state);
  return { ...r, level: level.id, name: level.name };
}

export function setBuiltin(home, mode) {
  const state = mode === 'off'
    ? { plan: { mode: 'subagent', hidden: true }, build: { mode: 'subagent', hidden: true } }
    : { plan: { mode: 'primary', hidden: false }, build: { mode: 'primary', hidden: false } };
  return writeJsonc(home, '${CONFIG}/opencode.jsonc', ['agent'], state, { merge: true, entry: 'builtin-toggle' });
}

export function retireOldFlow(home) {
  const entry = manifest.entries.find((e) => e.id === 'cfg.retire-old-flow');
  const { resolve } = makeResolver(home);
  const target = resolve(entry.target);
  if (!exists(target)) return { changed: false, note: 'ไม่มี opencode.jsonc' };
  const cur = readText(target);
  const next = removeArrayItem(cur, entry.valuePath.split('.'), entry.remove);
  if (next === cur) return { changed: false, note: 'ไม่มีของค้างอยู่แล้ว' };
  const st = stamp();
  const b = backupFile(st, target);
  const h = writeTextAtomic(target, next);
  record(st, [{ ...b, hashAfter: h }]);
  history({ stamp: st, entry: 'retire-old-flow', action: 'write', target, hashBefore: b.hashBefore, hashAfter: h });
  return { changed: true, target, stamp: st };
}

export function rollback(home, st) {
  const dir = path.join(BACKUP_DIR, st);
  const file = path.join(dir, 'manifest.json');
  if (!fs.existsSync(file)) throw new Error(`ไม่พบ backup รอบ ${st}`);
  const doc = JSON.parse(readText(file));
  const out = { stamp: st, restored: 0, deleted: 0 };
  for (const item of doc.items) {
    const bak = path.join(dir, 'files', safeRel(item.target));
    if (item.existed) {
      if (!fs.existsSync(bak)) throw new Error(`backup หาย: ${bak}`);
      fs.mkdirSync(path.dirname(item.target), { recursive: true });
      fs.copyFileSync(bak, item.target);
      out.restored++;
    } else if (fs.existsSync(item.target)) {
      fs.rmSync(item.target, { force: true });
      out.deleted++;
    }
    history({ stamp: st, entry: 'rollback', action: 'restore', target: item.target, result: item.existed ? 'restored' : 'deleted' });
  }
  return out;
}

export function readHistory(limit = 80) {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  const lines = readText(HISTORY_FILE).split(/\r?\n/).filter(Boolean).slice(-limit);
  return lines.map((l) => {
    const [at, st, entry, action, target, hashBefore, hashAfter, result] = l.split('\t');
    return { at, stamp: st, entry, action, target, hashBefore, hashAfter, result };
  }).reverse();
}

/* -------------------- template reset -------------------- */

export function resetTemplate(home, id) {
  const entry = manifest.entries.find((e) => e.id === id);
  if (!entry) throw new Error(`ไม่พบ entry: ${id}`);
  if (entry.strategy !== 'template-once') throw new Error(`รีเซ็ตได้เฉพาะ template-once (${id} = ${entry.strategy})`);
  const { resolve } = makeResolver(home);
  const target = resolve(entry.target);
  const st = stamp();
  const text = readText(srcPath(entry));
  const b = backupFile(st, target);
  const h = writeTextAtomic(target, text);
  record(st, [{ ...b, hashAfter: h }]);
  history({ stamp: st, entry: `reset.${entry.id}`, action: 'reset', target, hashBefore: b.hashBefore, hashAfter: h });
  return { id: entry.id, target, stamp: st, created: !b.existed };
}

/* -------------------- cleanup (ของเก่า → quarantine) -------------------- */

export function cleanupPlan(home) {
  const { resolve } = makeResolver(home);
  const agentsDir = resolve('${CONFIG}/agents');
  const skillsDir = resolve('${SKILLS}');
  const pluginsDir = resolve('${CONFIG}/plugins');
  const cfgFile = resolve('${CONFIG}/opencode.jsonc');

  const oursAgents = new Set(
    manifest.entries.filter((e) => e.target && /\/agents\//.test(e.target)).map((e) => path.basename(resolve(e.target)).toLowerCase()),
  );
  const pstack = manifest.entries.find((e) => e.id === 'skills.pstack');
  const oursSkills = pstack ? new Set(treeFiles(pstack).map((f) => f.rel.split(/[\\/]/)[0])) : new Set();
  const listDir = (dir) => { try { return fs.readdirSync(dir); } catch { return []; } };
  const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };

  const agentItems = listDir(agentsDir)
    .filter((n) => {
      const low = n.toLowerCase();
      const isAgentFile = low.endsWith('.md') || low.endsWith('.md.disabled');
      return isAgentFile && !oursAgents.has(low);
    })
    .map((n) => ({ name: n, abs: path.join(agentsDir, n) }));

  const skillNames = listDir(skillsDir).filter((n) => isDir(path.join(skillsDir, n)));
  const mirrors = skillNames.filter((n) => /^BAZERs-EXTENSION/i.test(n));
  const others = skillNames.filter((n) => !oursSkills.has(n) && !mirrors.includes(n));

  let pluginValues = [];
  if (fs.existsSync(cfgFile)) {
    try {
      const arr = getAtPath(readText(cfgFile), ['plugins']);
      if (Array.isArray(arr)) pluginValues = arr;
    } catch { /* config พัง = ไม่มีอะไรให้ลบ */ }
  }
  const oursPlugins = new Set(manifest.entries.filter((e) => e.kind === 'plugin' && e.status === 'ready').map((e) => path.basename(resolve(e.target))));
  const foreignPlugins = pluginValues.filter((p) => ![...oursPlugins].some((o) => String(p).includes(o)));
  const pluginDirs = listDir(pluginsDir).filter((n) => isDir(path.join(pluginsDir, n)) && !oursPlugins.has(n));

  const groups = [
    { id: 'agents', title: 'agent เก่า (ไม่ใช่ของ MAJOR)', hint: 'ย้ายออกจากโฟลเดอร์ agents — เก็บสำเนาไว้กู้คืนได้', items: agentItems },
    { id: 'mirrors', title: 'mirror เก่า (BAZERs-EXTENSION-*)', hint: 'ดีไซน์ใหม่ไม่ใช้ mirror แล้ว', items: mirrors.map((n) => ({ name: n, abs: path.join(skillsDir, n) })) },
    { id: 'skills-other', title: 'skill อื่นที่ไม่ใช่ PSTACK', hint: 'อาจเป็น skill ที่คุณเขียนเอง — อ่านรายการก่อนเลือก', items: others.map((n) => ({ name: n, abs: path.join(skillsDir, n) })) },
    { id: 'plugins', title: 'ปลั๊กอินใน config ที่ไม่ใช่ของ MAJOR', hint: 'ถอดออกจาก opencode.jsonc', items: foreignPlugins.map((p) => ({ name: String(p), abs: null, value: p })) },
    { id: 'plugin-dirs', title: 'โฟลเดอร์ปลั๊กอินเก่า', hint: 'ย้ายโฟลเดอร์ใน .config/opencode/plugins', items: pluginDirs.map((n) => ({ name: n, abs: path.join(pluginsDir, n) })) },
  ];
  return { at: new Date().toISOString(), groups: groups.map((g) => ({ ...g, count: g.items.length })) };
}

export function cleanupOld(home, { apply = false, groups = ['agents', 'mirrors', 'plugins', 'plugin-dirs'] } = {}) {
  const plan = cleanupPlan(home);
  const chosen = plan.groups.filter((g) => groups.includes(g.id));
  const items = chosen.flatMap((g) => g.items.map((i) => ({ ...i, group: g.id })));
  if (!apply) return { apply: false, count: items.length, groups: chosen.map((g) => ({ id: g.id, count: g.count })), items: items.map((i) => ({ group: i.group, name: i.name })) };

  const st = stamp();
  let qdir = path.join(VAR_DIR, 'quarantine', st);
  for (let i = 2; fs.existsSync(qdir); i++) qdir = path.join(VAR_DIR, 'quarantine', `${st}-${i}`);
  const moved = [];
  for (const it of items) {
    if (it.group === 'plugins' || !it.abs) continue;
    if (!fs.existsSync(it.abs)) continue;
    const dest = path.join(qdir, it.group, it.name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    try { fs.renameSync(it.abs, dest); }
    catch { fs.cpSync(it.abs, dest, { recursive: true }); fs.rmSync(it.abs, { recursive: true, force: true }); }
    moved.push({ group: it.group, from: it.abs, to: dest });
    history({ stamp: st, entry: `cleanup.${it.group}`, action: 'quarantine', target: it.abs, result: 'moved' });
  }

  const cfgGroup = chosen.find((g) => g.id === 'plugins');
  if (cfgGroup && cfgGroup.items.length) {
    const { resolve } = makeResolver(home);
    const cfgFile = resolve('${CONFIG}/opencode.jsonc');
    if (fs.existsSync(cfgFile)) {
      const arr = getAtPath(readText(cfgFile), ['plugins']) || [];
      const drop = new Set(cfgGroup.items.map((i) => i.value));
      const keep = arr.filter((p) => !drop.has(p));
      const r = writeJsonc(home, '${CONFIG}/opencode.jsonc', ['plugins'], keep, { entry: 'cleanup.plugins' });
      moved.push({ group: 'plugins', from: cfgFile, removed: [...drop], changed: r.changed });
    }
  }

  fs.mkdirSync(qdir, { recursive: true });
  fs.writeFileSync(path.join(qdir, 'quarantine.json'), JSON.stringify({ stamp: st, at: now(), moved }, null, 2), 'utf8');
  return { apply: true, stamp: st, quarantine: qdir, count: items.length, moved };
}

/* -------------------- full settings (overwrite ทั้งไฟล์) -------------------- */

export function writeFullSettings(home, fileId, content) {
  const spec = (settings.full?.files || []).find((f) => f.id === fileId);
  if (!spec) throw new Error(`ไม่รู้จักไฟล์ตั้งค่า: ${fileId}`);
  if (typeof content !== 'string' || !content.trim()) throw new Error('เนื้อหาว่าง');
  const text = content.replace(/^\uFEFF/, '');
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) { throw new Error(`JSON ไม่ถูกต้อง: ${e.message}`); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('ต้องเป็น JSON object');

  const { resolve } = makeResolver(home);
  const target = resolve(spec.target);
  const st = stamp();
  const b = backupFile(st, target);
  const out = text.endsWith('\n') ? text : `${text}\n`;
  const h = writeTextAtomic(target, out);
  record(st, [{ ...b, hashAfter: h }]);
  history({ stamp: st, entry: `full.${fileId}`, action: 'overwrite', target, hashBefore: b.hashBefore, hashAfter: h });
  // อ่านกลับและ parse อีกครั้ง — ไฟล์เสีย = คืนทันที
  try { JSON.parse(readText(target)); }
  catch (e) {
    if (b.existed) fs.copyFileSync(path.join(BACKUP_DIR, st, 'files', safeRel(target)), target);
    else fs.rmSync(target, { force: true });
    throw new Error(`เขียนแล้วอ่านกลับไม่ได้ (คืนไฟล์เดิมแล้ว): ${e.message}`);
  }
  return { file: fileId, label: spec.label, target, bytes: Buffer.byteLength(out), stamp: st };
}

/* -------------------- settings -------------------- */

export function allControls() {
  const out = [];
  for (const g of settings.groups) for (const c of g.controls) out.push(c);
  for (const r of settings.pstack.roles) out.push({ id: `pstack.${r.id}`, label: r.line, type: 'text', target: settings.pstack.target, strategy: 'line', line: r.line });
  out.push({ id: settings.pstack.budget.id, label: 'budget', type: 'text', target: settings.pstack.target, strategy: 'line', line: settings.pstack.budget.line });
  return out;
}

export function saveSettings(home, patches) {
  const controls = allControls();
  const results = [];
  const st = stamp();
  for (const patch of patches || []) {
    const c = controls.find((x) => x.id === patch.id);
    if (!c) { results.push({ id: patch.id, ok: false, why: 'ไม่พบ control' }); continue; }
    try {
      if (c.strategy === 'jsonc-set') {
        const value = c.type === 'number' ? Number(patch.value) : patch.value;
        const r = writeJsonc(home, c.target, c.path.split('.'), value, { entry: `settings.${c.id}`, st });
        results.push({ id: c.id, ok: true, changed: r.changed });
      } else if (c.strategy === 'line') {
        const { resolve } = makeResolver(home);
        const target = resolve(c.target);
        if (!exists(target)) throw new Error('ยังไม่มีไฟล์ — ติดตั้ง template ก่อน');
        const cur = readText(target);
        const next = setLineText(cur, c.line, patch.value);
        if (next !== cur) {
          const b = backupFile(st, target);
          const h = writeTextAtomic(target, next);
          record(st, [{ ...b, hashAfter: h }]);
          history({ stamp: st, entry: `settings.${c.id}`, action: 'write', target, hashBefore: b.hashBefore, hashAfter: h });
        }
        results.push({ id: c.id, ok: true, changed: next !== cur });
      } else if (c.strategy === 'internal') {
        const state = readState();
        state.locks = state.locks || {};
        state.locks[c.path] = !!patch.value;
        writeState(state);
        results.push({ id: c.id, ok: true, changed: true });
      } else {
        throw new Error(`strategy ${c.strategy} ไม่รองรับ`);
      }
    } catch (e) {
      results.push({ id: c.id, ok: false, why: e.message });
    }
  }
  const out = readState();
  if (out.locks?.models) snapshotModels(home);
  return { stamp: st, results, ok: results.every((r) => r.ok) };
}

/** บันทึกค่าปัจจุบันของโมเดล/effort ไว้เทียบ (ใช้ตอนเปิด lock) */
export function snapshotModels(home) {
  const paths = ['buddha', 'bazer', 'snack', 'advisor'];
  const state = readState();
  state.modelsSnapshot = {};
  const { resolve } = makeResolver(home);
  const file = resolve('${CONFIG}/opencode.jsonc');
  if (!exists(file)) return [];
  const text = readText(file);
  for (const m of paths) {
    state.modelsSnapshot[m] = {
      model: getAtPath(text, ['agent', m, 'model']) ?? null,
      variant: getAtPath(text, ['agent', m, 'variant']) ?? null,
    };
  }
  writeState(state);
  return paths;
}

/** คืนค่า model/effort จาก snapshot ที่บันทึกไว้ (ใช้เมื่อเปิด lock) */
export function restoreLockedModels(home) {
  const state = readState();
  const snap = state.modelsSnapshot;
  if (!snap || !Object.keys(snap).length) throw new Error('ยังไม่มี snapshot — เปิด lock.models แล้วกดบันทึกค่าก่อน');
  const st = stamp();
  const changed = [];
  const skipped = [];
  for (const [mode, v] of Object.entries(snap)) {
    for (const key of ['model', 'variant']) {
      if (v[key] == null || v[key] === '') { skipped.push(`${mode}.${key}`); continue; }
      const r = writeJsonc(home, '${CONFIG}/opencode.jsonc', ['agent', mode, key], v[key], { entry: `lock.${mode}.${key}`, st });
      if (r.changed) changed.push(`${mode}.${key}`);
    }
  }
  return { stamp: st, changed, skipped };
}

export function pstackPreset(home, mode, modelA, modelB) {
  if (!modelA) throw new Error('ต้องระบุโมเดลอย่างน้อยหนึ่งตัว');
  const coding = new Set(['feature', 'bugfix', 'perf', 'hillclimb', 'how-explorer', 'why-investigators', 'reflect-tooling', 'swarm']);
  const patches = [];
  for (const r of settings.pstack.roles) {
    const model = mode === 'split' ? (coding.has(r.id) ? modelA : (modelB || modelA)) : modelA;
    patches.push({ id: `pstack.${r.id}`, value: model });
  }
  return saveSettings(home, patches);
}
