/**
 * actions.mjs — registry ของปุ่มทั้งหมด (R3: ต้องตรงกับ actions.json 1:1)
 * handler ทุกตัวคืนรูปแบบเดียวกัน: { ok, summary, ...payload }
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { makeResolver, PASSIVE_DIR } from './env.mjs';
import { manifest, settings, actions, policies } from './manifest.mjs';
import { computePlan, diffFor } from './plan.mjs';
import { runProbes, verifyProofs } from './probe.mjs';
import { checkLaw } from './law.mjs';
import {
  applyEntries, setPolicy, undoPolicy, setBuiltin, retireOldFlow,
  saveSettings, pstackPreset, readHistory, rollback, readState,
  cleanupPlan, cleanupOld, resetTemplate, writeFullSettings, restoreLockedModels,
} from './apply.mjs';
import { plannotatorPatch } from './plannotator.mjs';
const ok = (summary, extra = {}) => ({ ok: true, summary, ...extra });
const bad = (summary, extra = {}) => ({ ok: false, summary, ...extra });
const warn = (summary, extra = {}) => ({ ok: true, warn: true, level: 'warn', summary, ...extra });

/* probe ที่ "ตก" ได้ตามปกติก่อนติดตั้ง — ใช้แยก "ยังไม่ติดตั้ง" ออกจาก "พังจริง" */
const PREINSTALL_PROBES = new Set(['builtin-hidden', 'permission-level', 'permission-arena-runner', 'permission-arena-judge', 'modes-present']);

function probeVerdict(pr, plan) {
  const pending = plan.summary.missing + plan.summary.stale;
  const fails = pr.results.filter((r) => !r.ok && r.severity === 'fail');
  const onlyPre = fails.length > 0 && fails.every((r) => PREINSTALL_PROBES.has(r.id));
  if (pending > 0 && onlyPre) {
    return { kind: 'warn', summary: `ยังไม่ได้ติดตั้ง ${pending} รายการ — probe ${fails.length} ข้อจะผ่านหลังติดตั้ง` };
  }
  if (pr.ok) return { kind: 'ok', summary: `ผ่าน ${pr.results.filter((r) => r.ok).length}/${pr.results.length}` };
  return { kind: 'err', summary: `ตก ${pr.failed} ข้อ · ${fails.map((r) => r.id).join(', ')}` };
}

const HANDLERS = {
  'law-check': () => {
    const r = checkLaw({ handlerIds: Object.keys(HANDLERS) });
    return r.ok ? ok(`ผ่านทั้ง ${r.rules.length} ข้อ (${r.filesScanned} ไฟล์)`, { law: r }) : bad(`ไม่ผ่าน ${r.failed} ข้อ`, { law: r });
  },

  'plan': (ctx) => {
    const lawR = checkLaw({ handlerIds: Object.keys(HANDLERS) });
    const p = computePlan(ctx.home, { lawResult: lawR });
    return ok(`ต้องติดตั้ง ${p.summary.missing} · ต้องอัพเดต ${p.summary.stale} · ปกติ ${p.summary.ok}`, { plan: p });
  },

  'self-check': (ctx) => {
    const lawR = checkLaw({ handlerIds: Object.keys(HANDLERS) });
    const p = computePlan(ctx.home, { lawResult: lawR });
    const pr = runProbes(ctx.home);
    const proofs = verifyProofs(ctx.home);
    const pending = p.summary.missing + p.summary.stale;
    const failIds = pr.results.filter((r) => !r.ok && r.severity === 'fail').map((r) => r.id);
    const onlyPre = failIds.length > 0 && failIds.every((id) => PREINSTALL_PROBES.has(id));
    const payload = { law: lawR, plan: p, probes: pr, proofs };

    if (lawR.ok && p.blockers.length === 0 && pr.ok) {
      return ok('ทุกอย่างผ่าน — กฎ ความครบ และ probe', payload);
    }
    if (lawR.ok && p.blockers.length === 0 && pending > 0 && onlyPre) {
      return warn(`ยังไม่ได้ติดตั้ง ${pending} รายการ (กฎผ่าน · probe รอติดตั้ง ${failIds.length} ข้อ)`, payload);
    }
    return bad(`กฎ ${lawR.ok ? 'ผ่าน' : 'ไม่ผ่าน'} · ต้องทำ ${pending} รายการ · probe ตก ${pr.failed}`, payload);
  },

  'probe': (ctx) => {
    const pr = runProbes(ctx.home);
    const plan = computePlan(ctx.home, {});
    const v = probeVerdict(pr, plan);
    const payload = { probes: pr, plan };
    if (v.kind === 'ok') return ok(v.summary, payload);
    if (v.kind === 'warn') return warn(v.summary, payload);
    return bad(v.summary, payload);
  },

  'apply': (ctx, params) => {
    const lawR = checkLaw({ handlerIds: Object.keys(HANDLERS) });
    if (!lawR.ok) return bad('กฎไม่ผ่าน — หยุดก่อนติดตั้ง', { law: lawR });
    const p = computePlan(ctx.home, { lawResult: lawR });
    if (p.blockers.length) return bad(`มี blocker ${p.blockers.length} รายการ`, { plan: p });
    const r = applyEntries(ctx.home, Array.isArray(params?.ids) ? params.ids : null);
    const pr = runProbes(ctx.home);
    const summary = r.errors.length
      ? `ล้มเหลว ${r.errors.length} · เขียน ${r.applied.length}`
      : `เขียน ${r.applied.length} · ข้าม ${r.skipped.length} · probe ${pr.ok ? 'ผ่าน' : `ตก ${pr.failed}`}`;
    return (r.errors.length === 0 ? ok : bad)(summary, { apply: r, probes: pr });
  },

  'policy-set': (ctx, params) => {
    if (!params?.level) return bad('ต้องระบุระดับ');
    const r = setPolicy(ctx.home, 'buddha-ladder', params.level);
    const lv = policies['buddha-ladder'].levels.find((l) => String(l.id) === String(params.level));
    return ok(`BUDDHA = ${lv.id} ${lv.name} · เขียน ${r.targets} agent (BUDDHA + ARENA) · มีผลกับ session ใหม่`, { policy: r, level: lv });
  },

  'policy-undo': (ctx) => {
    const r = undoPolicy(ctx.home);
    return ok(`ย้อนเป็นระดับ ${r.level} ${r.name} · เขียน ${r.targets} agent`, { policy: r });
  },

  'builtin-toggle': (ctx, params) => {
    const mode = params?.mode === 'on' ? 'on' : 'off';
    const r = setBuiltin(ctx.home, mode);
    return ok(mode === 'off' ? 'ซ่อน Plan/Build แล้ว' : 'คืน Plan/Build แล้ว', { result: r });
  },

  'retire-old-flow': (ctx) => {
    const r = retireOldFlow(ctx.home);
    return r.changed ? ok('ถอด bazer-flow เก่าออกจาก config แล้ว', { result: r }) : ok(r.note || 'ไม่มีอะไรต้องถอด', { result: r });
  },

  'settings-save': (ctx, params) => {
    const patches = Array.isArray(params?.patches) ? params.patches : [];
    if (!patches.length) return bad('ไม่มีค่าที่เปลี่ยน');
    const r = saveSettings(ctx.home, patches);
    return r.ok ? ok(`บันทึก ${r.results.filter((x) => x.changed).length} ช่อง`, { settings: r }) : bad('มีช่องที่บันทึกไม่ได้', { settings: r });
  },

  'settings-full': (ctx, params) => {
    if (!params?.file) return bad('ต้องระบุไฟล์ (tui / cli)');
    const r = writeFullSettings(ctx.home, params.file, params.content);
    return ok(`เขียนทับ ${r.label} แล้ว (${r.bytes} bytes)`, { full: r });
  },

  'pstack-preset': (ctx, params) => {
    const mode = params?.mode === 'split' ? 'split' : 'uniform';
    const r = pstackPreset(ctx.home, mode, params?.modelA, params?.modelB);
    return r.ok ? ok(`เติม ${r.results.length} role แล้ว`, { settings: r }) : bad('มี role ที่เขียนไม่ได้', { settings: r });
  },

  'history-list': () => ok('อ่านประวัติแล้ว', { history: readHistory(200) }),

  'rollback': (ctx, params) => {
    if (!params?.stamp) return bad('ต้องระบุ stamp');
    const r = rollback(ctx.home, params.stamp);
    return ok(`คืน ${r.restored} · ลบ ${r.deleted}`, { rollback: r });
  },

  'plannotator-locate': (ctx) => {
    const pr = runProbes(ctx.home).results.find((x) => x.id === 'plannotator-locate');
    return pr?.ok ? ok(pr.detail, { locate: pr.extra }) : warn(pr?.detail || 'ไม่พบไฟล์ Plannotator', { locate: pr?.extra });
  },

  'plannotator-patch': (ctx, params) => {
    const target = params?.target === 'bazer' ? 'bazer' : 'buddha';
    const r = plannotatorPatch(ctx.home, target, { apply: !!params?.apply });
    if (!r.apply) {
      return ok(r.files.length ? `dry-run: ${r.todo} ไฟล์ต้องแพตช์ (พบ ${r.files.length} ไฟล์)` : 'ไม่พบไฟล์ Plannotator ที่มี switchTo', { patch: r });
    }
    if (r.errors?.length) return bad(`แพตช์ไม่สำเร็จ ${r.errors.length} ไฟล์`, { patch: r });
    if (!r.changed.length) return warn(r.note || 'ไม่มีไฟล์ที่ต้องแพตช์', { patch: r });
    return ok(`แพตช์ ${r.changed.length} ไฟล์ → ${target} (เหลือ ${r.remaining})`, { patch: r });
  },

  'lock-restore': (ctx) => {
    const r = restoreLockedModels(ctx.home);
    return r.changed.length ? ok(`คืนค่า ${r.changed.length} ช่องจาก snapshot`, { run: r }) : ok('ค่าตรงกับ snapshot อยู่แล้ว', { run: r });
  },

  'cleanup-plan': (ctx) => {
    const c = cleanupPlan(ctx.home);
    const total = c.groups.reduce((a, g) => a + g.count, 0);
    return ok(total ? `พบของเก่า ${total} รายการ` : 'ไม่พบของเก่า', { cleanup: c });
  },

  'cleanup-old': (ctx, params) => {
    const groups = Array.isArray(params?.groups) && params.groups.length ? params.groups : undefined;
    const r = cleanupOld(ctx.home, { apply: !!params?.apply, groups });
    if (!r.apply) return ok(`dry-run: จะย้าย ${r.count} รายการ`, { cleanup: r });
    return ok(`ย้าย ${r.moved.length} รายการไป ${r.quarantine}`, { cleanup: r });
  },

  'reset-template': (ctx, params) => {
    if (!params?.id) return bad('ต้องระบุ id ของ template (เช่น tpl.agents-md)');
    const r = resetTemplate(ctx.home, params.id);
    return ok(`${r.id}: เขียนใหม่จาก template แล้ว (${r.created ? 'สร้างใหม่' : 'ทับของเดิม'})`, { run: r });
  },

  'install-tools': (ctx, params) => {
    const steps = JSON.parse(fs.readFileSync(path.join(PASSIVE_DIR, '02INSTALLER', 'install.json'), 'utf8')).steps;
    const need = [];
    for (const s of steps) {
      if (s.check?.cmd) {
        const r = spawnSync(s.check.cmd, { shell: true, encoding: 'utf8', windowsHide: true });
        if (r.status !== 0) need.push({ id: s.id, label: s.label, cmd: s.install, why: s.why });
      } else if (s.check?.kind) {
        const probe = runProbes(ctx.home).results.find((x) => x.id === s.check.kind);
        if (!probe?.ok) need.push({ id: s.id, label: s.label, cmd: s.install, why: s.why });
      }
    }
    if (!need.length) return ok('เครื่องมือครบแล้ว');
    const withCmd = need.filter((n) => n.cmd);
    if (!params?.apply) return ok('ยังขาด: ' + need.map((n) => n.label).join(', '), { need, applied: false });
    if (!withCmd.length) return bad('ไม่มีคำสั่งติดตั้งที่ยืนยันได้สำหรับ: ' + need.map((n) => n.label).join(', '), { need });
    const out = [];
    for (const n of withCmd) {
      const r = spawnSync(n.cmd, { shell: true, encoding: 'utf8', timeout: 600000, windowsHide: true });
      out.push({ tool: n.id, code: r.status, out: (r.stdout || '').slice(-800), err: (r.stderr || '').slice(-800) });
    }
    return ok('สั่งติดตั้งแล้ว (ตรวจซ้ำด้วยปุ่ม ตรวจของจริง)', { results: out, need });
  },

  'open-target': (ctx, params) => {
    const { resolve } = makeResolver(ctx.home);
    const map = {
      config: '${CONFIG}', skills: '${SKILLS}', major: '${MAJOR}', backups: '${VAR}/backups',
    };
    const target = resolve(map[params?.which] || '${CONFIG}');
    const cmd = process.platform === 'win32' ? 'explorer' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawn(cmd, [target], { detached: true, stdio: 'ignore' }).unref();
    return ok(`เปิด ${target}`);
  },
};

export const actionIds = Object.keys(HANDLERS);
export function runAction(id, ctx, params) {
  const fn = HANDLERS[id];
  if (!fn) return bad(`ไม่รู้จัก action: ${id}`);
  const meta = actions.actions.find((a) => a.id === id);
  const mustConfirm = meta?.confirmUnlessParam ? params?.[meta.confirmUnlessParam] === true : true;
  if (meta?.kind === 'write' && meta.confirm === 'popup' && !params?.confirmed && mustConfirm) {
    return { ok: false, needsConfirm: true, risk: meta.risk, summary: 'ต้องยืนยันก่อน' };
  }
  try { return fn(ctx, params || {}); }
  catch (e) { return bad(e.message); }
}

export { settings, manifest };
