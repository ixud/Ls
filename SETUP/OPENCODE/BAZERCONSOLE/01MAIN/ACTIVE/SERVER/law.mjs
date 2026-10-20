/**
 * law.mjs — บังคับ R1–R4 (อ่านกฎจาก law.json ไม่ hardcode)
 * ถ้าเพิ่ม kind ใหม่ ต้องอัพเดต README §7 + CHANGELOG
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, MANIFEST_DIR } from './env.mjs';
import { law } from './manifest.mjs';

const norm = (p) => p.replace(/\\/g, '/');

function globToRe(glob) {
  const g = norm(glob);
  let out = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*' && g[i + 1] === '*') {
      i++;
      // "dir/**" = dir เอง + ลูกทั้งหมด / "**" เดี่ยว ๆ = ทุกอย่าง
      if (out.endsWith('/')) { out = out.slice(0, -1); out += '(?:/.*)?'; }
      else out += '.*';
    } else if (c === '*') out += '[^/]*';
    else if (c === '?') out += '[^/]';
    else out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${out}$`, 'i');
}

function walkAll(dir, out = [], depth = 0) {
  if (depth > 14) return out;
  let names = [];
  try { names = fs.readdirSync(dir); } catch { return out; }
  for (const n of names) {
    if (n === '.git' || n === 'node_modules') continue;
    const p = path.join(dir, n);
    let st; try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) walkAll(p, out, depth + 1);
    else out.push(p);
  }
  return out;
}

const isExcepted = (rel, except = []) => except.some((e) => globToRe(e).test(rel));
const inScope = (rel, paths) => paths.some((p) => globToRe(p).test(rel) || globToRe(`${p.replace(/\/$/, '')}/**`).test(rel));

export function checkLaw({ handlerIds } = {}) {
  const all = walkAll(ROOT);
  const rules = [];

  for (const rule of law.rules) {
    const details = [];
    if (rule.kind === 'no-code-in-data') {
      for (const abs of all) {
        const rel = norm(path.relative(ROOT, abs));
        if (!inScope(rel, rule.paths) || isExcepted(rel, rule.except)) continue;
        if (rule.forbidExt.includes(path.extname(abs).toLowerCase())) details.push(rel);
      }
    } else if (rule.kind === 'no-hardcoded-targets') {
      for (const abs of all) {
        const rel = norm(path.relative(ROOT, abs));
        if (!inScope(rel, rule.paths) || isExcepted(rel, rule.except)) continue;
        if (!/\.(mjs|js|html|css|json|md)$/i.test(abs)) continue;
        let text = '';
        try { text = fs.readFileSync(abs, 'utf8'); } catch { continue; }
        for (const pat of rule.forbidPatterns) {
          if (new RegExp(pat, 'm').test(text)) details.push(`${rel} ← /${pat}/`);
        }
      }
    } else if (rule.kind === 'actions-handlers') {
      if (!Array.isArray(handlerIds)) details.push('ไม่ได้ส่งรายการ handler เข้ามา');
      else {
        const { actions } = JSON.parse(fs.readFileSync(path.join(MANIFEST_DIR, 'actions.json'), 'utf8'));
        const declared = new Set(actions.map((a) => a.id));
        const implemented = new Set(handlerIds);
        for (const id of declared) if (!implemented.has(id)) details.push(`ประกาศแต่ไม่มี handler: ${id}`);
        for (const id of implemented) if (!declared.has(id)) details.push(`มี handler แต่ไม่ประกาศ: ${id}`);
      }
    } else if (rule.kind === 'no-bak-files') {
      for (const abs of all) {
        const rel = norm(path.relative(ROOT, abs));
        if (isExcepted(rel, rule.except)) continue;
        if (rule.forbidNamePatterns.some((p) => new RegExp(p).test(path.basename(abs)))) details.push(rel);
      }
    } else {
      details.push(`kind "${rule.kind}" ไม่มี implementation`);
    }
    rules.push({ id: rule.id, title: rule.title, ok: details.length === 0, details: details.slice(0, 40), more: Math.max(0, details.length - 40) });
  }

  const failed = rules.filter((r) => !r.ok).length;
  return { at: new Date().toISOString(), rules, failed, ok: failed === 0, filesScanned: all.length };
}
