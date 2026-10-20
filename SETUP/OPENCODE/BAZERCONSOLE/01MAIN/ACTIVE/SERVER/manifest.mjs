/**
 * manifest.mjs — โหลด + ตรวจสัญญา (อ่านไฟล์ JSON ทั้งหมดใน 01MANIFEST)
 * ไฟล์นี้ไม่รู้จัก path ปลายทางใด ๆ — ทุกอย่างมาจาก env.json / manifest.json
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { MANIFEST_DIR, ROOT } from './env.mjs';

const read = (name) => JSON.parse(fs.readFileSync(path.join(MANIFEST_DIR, name), 'utf8').replace(/^\uFEFF/, ''));

export const manifest = read('manifest.json');
export const policies = read('policies.json');

// policy ที่ declare "inherit" = ใช้ระดับชุดเดียวกับตัวต้นทาง (แต่แยกสถานะ/ปุ่มของตัวเอง)
for (const [id, p] of Object.entries(policies)) {
  if (!p || typeof p !== 'object' || !p.inherit) continue;
  const base = policies[p.inherit];
  if (!base) continue;
  p.levels = p.levels || base.levels;
  p.target = p.target || base.target;
}
export const settings = read('settings.json');
export const actions = read('actions.json');
export const probes = read('probes.json');
export const law = read('law.json');

export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
export const sha256File = (p) => sha256(fs.readFileSync(p));

export function srcPath(entry) {
  if (!entry.source) return null;
  return path.join(ROOT, entry.source.replace(/[\\/]+/g, path.sep));
}

export function mustExist(entry) {
  if (!entry.source) return true;
  return fs.existsSync(srcPath(entry));
}

export function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** รายการไฟล์ของ entry แบบ copy-tree → [{ rel, abs }] */
export function treeFiles(entry) {
  const root = srcPath(entry);
  const exclude = new Set(entry.exclude || []);
  return walk(root)
    .map((abs) => ({ abs, rel: path.relative(root, abs) }))
    .filter(({ rel, abs }) => !exclude.has(rel) && !exclude.has(path.basename(abs)));
}

export function validate() {
  const problems = [];
  const ids = new Set();
  for (const e of manifest.entries) {
    if (ids.has(e.id)) problems.push(`entry id ซ้ำ: ${e.id}`);
    ids.add(e.id);
    if (!e.id || !e.kind || !e.title || !e.strategy || !e.status) problems.push(`entry ไม่ครบ field บังคับ: ${e.id || '(ไม่มี id)'}`);
    if (e.target && !String(e.target).startsWith('${')) problems.push(`target ต้องเริ่มด้วย \${VAR}: ${e.id}`);
    if (e.status === 'design' && !e.why) problems.push(`status=design ต้องมี why: ${e.id}`);
    if (!fs.existsSync(path.join(MANIFEST_DIR, 'manifest.json'))) problems.push('ไม่พบ manifest.json');
  }
  const policyIds = new Set(Object.keys(policies).filter((k) => k !== 'note'));
  for (const e of manifest.entries) {
    if (e.fromPolicy && !policyIds.has(e.fromPolicy)) problems.push(`fromPolicy ไม่มีจริง: ${e.fromPolicy}`);
  }
  const probeIds = new Set(probes.probes.map((p) => p.id));
  for (const e of manifest.entries) {
    if (e.proof && !probeIds.has(e.proof)) problems.push(`proof ไม่มีจริง: ${e.proof} (${e.id})`);
  }
  const actionIds = new Set();
  for (const a of actions.actions) {
    if (actionIds.has(a.id)) problems.push(`action id ซ้ำ: ${a.id}`);
    actionIds.add(a.id);
    if (![1, 2, 3].includes(a.risk?.level)) problems.push(`action risk ไม่ถูกต้อง: ${a.id}`);
    if (!a.risk?.why) problems.push(`action ต้องมี risk.why: ${a.id}`);
  }
  return problems;
}
