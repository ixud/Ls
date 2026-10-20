/**
 * plannotator.mjs — หาและแพตช์ปุ่มอนุมัติของ Plannotator ในไฟล์ระบบ
 * หลักการ: แตะเฉพาะ token `switchTo:"<build|builder|buddha|bazer>"` เท่านั้น
 * - dry-run ได้
 * - backup + history ทุกไฟล์
 * - ตรวจซ้ำหลังเขียน (remaining ต้องเป็น 0)
 * - ไม่เจอไฟล์ = ไม่ทำอะไร (warn)
 */
import fs from 'node:fs';
import { plannotatorLocate } from './probe.mjs';
import { backupFile, record, history, writeTextAtomic, stamp } from './apply.mjs';

export const ALLOWED_TARGETS = ['buddha', 'bazer'];
const TARGET_RE = /switchTo\s*:\s*["'](build|builder|buddha|bazer)["']/g;

export function plannotatorPlan(home, target = 'buddha') {
  if (!ALLOWED_TARGETS.includes(target)) throw new Error(`target ต้องเป็น ${ALLOWED_TARGETS.join(' หรือ ')}`);
  const loc = plannotatorLocate(home);
  const files = [];
  for (const hit of loc.hits) {
    let text = '';
    try { text = fs.readFileSync(hit.file, 'utf8'); } catch { continue; }
    const matches = [...text.matchAll(TARGET_RE)];
    if (!matches.length) continue;
    const values = [...new Set(matches.map((m) => m[1]))];
    files.push({
      file: hit.file,
      count: matches.length,
      values,
      needsPatch: values.some((v) => v !== target),
    });
  }
  return {
    target,
    roots: loc.roots,
    scanned: loc.scanned,
    files,
    todo: files.filter((f) => f.needsPatch).length,
  };
}

export function plannotatorPatch(home, target = 'buddha', { apply = false } = {}) {
  const plan = plannotatorPlan(home, target);
  if (!apply) return { apply: false, ...plan };

  const todo = plan.files.filter((f) => f.needsPatch);
  if (!todo.length) {
    return { apply: true, ...plan, changed: [], note: plan.files.length ? 'ตรงเป้าหมายอยู่แล้ว' : 'ไม่พบไฟล์ Plannotator' };
  }

  const st = stamp();
  const changed = [];
  const errors = [];
  for (const f of todo) {
    try {
      const before = fs.readFileSync(f.file, 'utf8');
      const after = before.replace(TARGET_RE, `switchTo:"${target}"`);
      if (after === before) continue;
      const b = backupFile(st, f.file);
      const h = writeTextAtomic(f.file, after);
      record(st, [{ ...b, hashAfter: h }]);
      history({ stamp: st, entry: 'plannotator.patch', action: 'patch', target: f.file, hashBefore: b.hashBefore, hashAfter: h });
      changed.push({ file: f.file, from: f.values, to: target, count: f.count });
    } catch (e) {
      errors.push({ file: f.file, why: e.message });
    }
  }

  const check = plannotatorPlan(home, target);
  return {
    apply: true,
    ...plan,
    changed,
    errors,
    remaining: check.files.filter((f) => f.needsPatch).length,
    stamp: st,
  };
}
