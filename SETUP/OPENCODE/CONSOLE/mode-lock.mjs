#!/usr/bin/env node
/* BAZER mode-lock checker — คำสั่งเดียวบอกว่า "ล็อกอยู่หรือหลุด"
   ใช้ได้ 2 ทาง: CLI (exit 0 = ล็อกอยู่, 1 = หลุด) และ import จาก console.mjs (runLockCheck)
   หลักการ: อ่าน "ค่าจริง" จากไฟล์ ไม่เทียบ manifest กับ manifest */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HOME = os.homedir();
const DIR = path.dirname(fileURLToPath(import.meta.url));
const P = {
  opencodeJsonc: path.join(HOME, '.config', 'opencode', 'opencode.jsonc'),
  agentsMd: path.join(HOME, '.config', 'opencode', 'AGENTS.md'),
  agentsInstalled: path.join(HOME, '.config', 'opencode', 'agents'),
  modelJson: path.join(HOME, '.local', 'state', 'opencode', 'model.json'),
  skills: path.join(HOME, '.agents', 'skills'),
  conFig: path.join(DIR, 'console.config.json'),
  bundleAgents: path.join(DIR, 'bundle', 'agents'),
};

const MODES = ['advisor', 'arena', 'bazer', 'buddha', 'poteto-mode', 'snack'];
const MODE_TITLES = {
  'advisor': '# Advisor Mode',
  'arena': '# Debate Arena',
  'bazer': '# BAZER Mode',
  'buddha': '# Buddha Mode',
  'poteto-mode': '# Poteto Mode',
  'snack': '# Snack',
};
const PLAN_AGENTS = ['plan', 'buddha', 'arena', 'snack', 'poteto-mode'];
const RULES_MARKER_RE = /<!--\s*BAZER-MODE-RULES:\s*v(\d+)\s*-->/;
const MODE_MARKER_RE = /<!--\s*BAZER-MODE:\s*([a-z-]+)\s*v(\d+)\s*-->/;
const FLOW_MARKER_RE = /<!--\s*BAZER-FLOW:\s*v(\d+)\s*-->/;

function stripJSONC(text) {
  let out = '';
  let inStr = false, inLine = false, inBlock = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inLine) { if (c === '\n') { inLine = false; out += c; } continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i++; } continue; }
    if (inStr) {
      out += c;
      if (c === '\\') { out += n === undefined ? '' : n; i++; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; out += c; continue; }
    if (c === '/' && n === '/') { inLine = true; i++; continue; }
    if (c === '/' && n === '*') { inBlock = true; i++; continue; }
    out += c;
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

function readJSON(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    return { ok: true, obj: JSON.parse(stripJSONC(raw)), raw };
  } catch (e) { return { ok: false, error: e.message }; }
}

function readText(file) {
  try { return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''); } catch { return null; }
}

function frontmatterBody(text) {
  if (!text) return '';
  const m = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return m ? text.slice(m[0].length) : text;
}

function firstHeading(body) {
  for (const line of body.split(/\r?\n/)) {
    if (/^#\s+\S/.test(line.trim())) return line.trim();
    if (/^#/.test(line.trim())) continue;
  }
  return '';
}

function modelEntry(cfg, modelRef) {
  if (!cfg || !modelRef) return { entry: {}, where: 'none' };
  const [prov, ...rest] = String(modelRef).split('/');
  const mid = rest.join('/');
  for (const key of ['providers', 'provider']) {
    const e = cfg[key]?.[prov]?.models?.[mid];
    if (e) return { entry: e, where: key };
  }
  return { entry: {}, where: 'missing' };
}

function variantList(entry) {
  const v = entry?.variants;
  if (!v) return [];
  if (Array.isArray(v)) return v.map(x => ({ id: x?.id, effort: x?.settings?.reasoningEffort ?? x?.reasoningEffort }));
  if (typeof v === 'object') return Object.entries(v).map(([id, x]) => ({ id, effort: x?.reasoningEffort ?? x?.settings?.reasoningEffort }));
  return [];
}

function scanProjectConfigs(from, depth) {
  const hits = [];
  let cur = path.resolve(from);
  for (let i = 0; i <= depth; i++) {
    for (const name of ['opencode.json', 'opencode.jsonc']) {
      const f = path.join(cur, name);
      if (fs.existsSync(f)) {
        const r = readJSON(f);
        const overriding = ['model', 'plugins', 'plugin', 'provider', 'providers'].filter(k => r.ok && r.obj && r.obj[k]);
        hits.push({ file: f, overriding });
      }
    }
    const up = path.dirname(cur);
    if (up === cur) break;
    cur = up;
  }
  return hits;
}

function runLockCheck(opts = {}) {
  const results = [];
  const add = (rule, status, detail, evidence) => results.push({ rule, status, detail, evidence: evidence || null });
  const cfgLock = (() => {
    const c = readJSON(P.conFig);
    return (c.ok && c.obj && c.obj.modeLock) || { on: false, effort: 'max', model: '' };
  })();
  const lockOn = !!cfgLock.on;
  const wantEffort = cfgLock.effort || 'max';

  // R0 — อ่านไฟล์ได้
  const cfg = readJSON(P.opencodeJsonc);
  const mj = readJSON(P.modelJson);
  if (!cfg.ok) { add('R0', 'FAIL', `opencode.jsonc อ่านไม่ได้: ${cfg.error}`); return finish(results, lockOn); }
  add('R0', 'PASS', 'opencode.jsonc + console.config.json parse ผ่าน', P.opencodeJsonc);

  const obj = cfg.obj || {};
  const modelRef = typeof obj.model === 'string' ? obj.model : (obj.model?.providerID && obj.model?.model ? `${obj.model.providerID}/${obj.model.model}` : '');
  if (!cfgLock.model) cfgLock.model = modelRef;
  const lockedModel = cfgLock.model || modelRef;

  // R1 — workflow
  const plist = obj.plugins || obj.plugin || [];
  let plOpts = null;
  for (const x of (Array.isArray(plist) ? plist : [])) {
    const o = Array.isArray(x) ? x[1] : x?.options;
    if (o && (o.workflow || o.planningAgents)) { plOpts = o; break; }
  }
  if (!plOpts) add('R1', 'FAIL', 'ไม่พบปลั๊กอิน Plannotator ใน config → submit_plan ไม่ถูกควบคุม', null);
  else if (!['manual', 'user-managed', 'plan-agent', 'all-agents'].includes(plOpts.workflow))
    add('R1', 'FAIL', `workflow ไม่ใช่ค่าที่ปลั๊กอินรู้จัก: ${plOpts.workflow}`, null);
  else if (plOpts.workflow !== 'plan-agent') add('R1', 'WARN', `workflow = ${plOpts.workflow} (ไม่ใช่ plan-agent)`, null);
  else add('R1', 'PASS', 'workflow = plan-agent', null);

  // R2 — planningAgents
  const pa = Array.isArray(plOpts?.planningAgents) ? plOpts.planningAgents : [];
  const missingPa = PLAN_AGENTS.filter(n => !pa.includes(n));
  const extraPa = pa.filter(n => !PLAN_AGENTS.includes(n));
  if (missingPa.length) add('R2', 'FAIL', `planningAgents ขาด: ${missingPa.join(', ')}`, null);
  else if (extraPa.length) add('R2', 'WARN', `planningAgents มีตัวเกิน: ${extraPa.join(', ')}`, null);
  else add('R2', 'PASS', `planningAgents ครบ 5 ตัว`, null);

  // R3 — effort ที่ล็อกจริง + R3b variants
  const { entry, where } = modelEntry(obj, lockedModel);
  const effort = entry?.options?.reasoningEffort ?? entry?.settings?.reasoningEffort ?? null;
  const vs = variantList(entry);
  if (!lockOn) {
    add('R3', 'INFO', 'mode lock ปิดอยู่ (modeLock.on = false) — ข้ามการเทียบค่า', null);
    add('R3b', 'INFO', 'mode lock ปิดอยู่', null);
  } else {
    if (effort === wantEffort) add('R3', 'PASS', `reasoningEffort = ${effort} (คีย์ ${where})`, null);
    else add('R3', 'FAIL', `reasoningEffort = ${effort ?? '(ไม่มีคีย์)'} — ต้องเป็น "${wantEffort}" (คีย์ ${where})`, null);

    if (!vs.length) add('R3b', 'FAIL', 'ไม่มี variants เลย → TUI เลือก variant ได้ตาม catalog (ล็อกไม่ทำงาน)', null);
    else {
      const wrong = vs.filter(v => v.effort !== wantEffort);
      if (wrong.length) add('R3b', 'FAIL', `variants ที่ไม่ชี้ "${wantEffort}": ${wrong.map(v => v.id).join(', ')}`, null);
      else add('R3b', 'PASS', `variants ${vs.length} ตัวชี้ "${wantEffort}" ทั้งหมด (${vs.map(v => v.id).join(', ')})`, null);
    }
  }

  // R4 — model.json ชนะ config
  const mjVariant = mj.ok && mj.obj?.variant ? (mj.obj.variant[lockedModel] ?? null) : null;
  if (!lockOn) add('R4', 'INFO', `model.json variant = ${mjVariant ?? '(ไม่มี)'} (lock ปิด)`, null);
  else if (mjVariant === wantEffort) add('R4', 'PASS', `model.json variant = ${mjVariant}`, P.modelJson);
  else add('R4', 'FAIL', `model.json variant = ${mjVariant ?? '(ไม่มี)'} — TUI ค่านี้ชนะ config ต้องเป็น "${wantEffort}"`, P.modelJson);

  // R5 — project config ที่โหลดทีหลัง global
  const projects = scanProjectConfigs(path.resolve(DIR, '..', '..', '..'), 5);
  const badProjects = projects.filter(p => p.overriding.length);
  if (badProjects.length) add('R5', 'FAIL', `project config ทับคีย์ล็อก: ${badProjects.map(p => `${p.file} (${p.overriding.join(',')})`).join(' · ')}`, null);
  else if (!projects.length) add('R5', 'INFO', 'ไม่พบ project config ในสายโฟลเดอร์นี้', null);
  else add('R5', 'PASS', `project config ${projects.length} ไฟล์ไม่มีคีย์ที่ทับล็อก`, projects.map(p => p.file).join(' · '));

  // R6 — AGENTS.md (ชั้นเครื่อง)
  const ag = readText(P.agentsMd);
  if (!ag) add('R6', 'FAIL', 'ไม่พบ AGENTS.md', P.agentsMd);
  else {
    const hasMarker = RULES_MARKER_RE.test(ag);
    const hasMvp = /Max Effort/.test(ag);
    const hasGate = /submit_plan/.test(ag);
    const lines = ag.split(/\r?\n/).length;
    if (!hasMarker) add('R6', 'FAIL', 'AGENTS.md ไม่มี marker <!-- BAZER-MODE-RULES: v1 -->', null);
    else if (!hasMvp || !hasGate) add('R6', 'FAIL', 'AGENTS.md ขาดกฎขั้นต่ำ (Max Effort / submit_plan gate)', null);
    else add('R6', 'PASS', `AGENTS.md ${lines} บรรทัด · marker + กฎขั้นต่ำครบ`, null);
  }

  // R7 — skill กฎโหมด
  const skillFile = path.join(P.skills, 'bazer-mode-rules', 'SKILL.md');
  const sk = readText(skillFile);
  if (!sk) add('R7', 'FAIL', 'ยังไม่ติดตั้ง skill bazer-mode-rules', skillFile);
  else if (!/^---[\s\S]*?name:\s*\S+[\s\S]*?description:\s*\S+[\s\S]*?---/.test(sk))
    add('R7', 'FAIL', 'SKILL.md ไม่มี frontmatter name/description ครบ', skillFile);
  else add('R7', 'PASS', 'skill bazer-mode-rules ติดตั้งและมี frontmatter', skillFile);

  // R8 — flow marker bundle vs installed
  const budBundle = readText(path.join(P.bundleAgents, 'buddha.md'));
  const budInst = readText(path.join(P.agentsInstalled, 'buddha.md'));
  const bv = (budBundle?.match(FLOW_MARKER_RE) || [])[1] || null;
  const iv = (budInst?.match(FLOW_MARKER_RE) || [])[1] || null;
  if (!bv || !iv) add('R8', 'FAIL', `ไม่พบ marker BAZER-FLOW (bundle=${bv}, installed=${iv})`, null);
  else if (bv !== iv) add('R8', 'FAIL', `BAZER-FLOW ไม่ตรงกัน (bundle v${bv} · installed v${iv}) → Console ขึ้น warn`, null);
  else add('R8', 'PASS', `BAZER-FLOW v${bv} ตรงกันทั้ง bundle และที่ติดตั้ง`, null);

  // R9 + R10 — marker + permission + H1 ต่อโหมด
  for (const mode of MODES) {
    const f = path.join(P.bundleAgents, `${mode}.md`);
    const t = readText(f);
    if (!t) { add(`R9:${mode}`, 'FAIL', `ไม่พบไฟล์ bundle/agents/${mode}.md`, f); continue; }
    const fmOk = MODE_MARKER_RE.test(t);
    const permOk = /\npermission:\s*\n/.test(t);
    if (!fmOk && !permOk) add(`R9:${mode}`, 'FAIL', 'ไม่มี marker BAZER-MODE และไม่มี permission:', f);
    else if (!fmOk) add(`R9:${mode}`, 'WARN', 'ไม่มี marker BAZER-MODE', f);
    else if (!permOk) add(`R9:${mode}`, 'WARN', 'ไม่มี permission: (ใช้ค่า default ของ harness)', f);
    else add(`R9:${mode}`, 'PASS', 'marker + permission ครบ', f);

    const h1 = firstHeading(frontmatterBody(t));
    const want = MODE_TITLES[mode];
    if (!h1) add(`R10:${mode}`, 'WARN', 'อ่านหัวข้อแรกไม่ได้', f);
    else if (h1.toLowerCase() !== want.toLowerCase()) add(`R10:${mode}`, 'FAIL', `หัวข้อไม่ตรงชื่อโหมด: "${h1}" ต้องเป็น "${want}"`, f);
    else add(`R10:${mode}`, 'PASS', `หัวข้อ = ${h1}`, f);
  }

  // R11 — เป้าหมาย agentSwitch ของ Plannotator (อัปเดต 2026-10-19: default เป็น builder ที่ name ตรงเป๊ะ)
  add('R11', 'INFO', 'Plannotator ปุ่มอนุมัติ default = "builder" (subagent) — id=builder และ name=builder จึงผ่านการเทียบ name; ของเดิมชี้ "build" แต่ name จริงคือ "Build" = mismatch (ไม่สลับ agent) · ตัวตรวจ: node flow-check.mjs + node patch-plannotator.mjs --dry-run', 'plannotator.html → patch-plannotator.mjs');

  return finish(results, lockOn);
}

function finish(results, lockOn) {
  const count = s => results.filter(r => r.status === s).length;
  const fails = count('FAIL'), warns = count('WARN'), passes = count('PASS');
  return {
    ok: fails === 0,
    lockOn,
    wants: 'max',
    counts: { pass: passes, fail: fails, warn: warns, info: count('INFO') },
    items: results,
    summary: fails === 0 ? `ล็อกอยู่ (${passes} PASS${warns ? ` · ${warns} WARN` : ''})` : `หลุด ${fails} ข้อ (FAIL ${fails} · WARN ${warns} · PASS ${passes})`,
  };
}

export { runLockCheck };

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const r = runLockCheck();
  for (const it of r.items) console.log(`${it.status.padEnd(4)} ${it.rule.padEnd(12)} ${it.detail}`);
  console.log(`\nสรุป: ${r.summary}`);
  console.log(`สวิตช์: modeLock.on = ${r.lockOn} · ค่าที่ต้องเป็น: effort "${r.wants}"`);
  process.exit(r.ok ? 0 : 1);
}
