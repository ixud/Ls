/* bazer-flow — pure decision logic (no I/O).
   Imported by the server plugin, the TUI badge and the Console's checks.
   Keep this file dependency-free so it can be tested with plain `node`.

   ซ่อม 6 จุดเทียบรุ่น 20261019 (ดู BAZERCONSOLE/LOGS.md §00.00.05):
   1) SNACK ไม่ถูก gate — SNACK คือโหมด "แก้ไฟล์เร็ว ไม่มีแผน"
   2) BUDDHA ต้องอนุมัติครบ 2 ครั้ง (GATE 1 = Arena, GATE 2 = Build) ก่อนเขียนไฟล์โปรเจกต์
   3) BAZER ถูก gate ด้วย (แผนเดียว = 1 ครั้ง)
   4) ข้อความ feedback ของ Plannotator ไม่ทำให้ approval ที่ได้มาแล้วหายไป
   5) ไม่มีช่อง `edit *.md` ให้ Plan แก้ไฟล์โปรเจกต์ก่อนอนุมัติ
   6) ไม่อ้าง mirror (BAZERs-EXTENSION-*) — ใช้ subagent `poteto` ตรง ๆ */

import { isTempPath, looksLikeWrite, shellTouchesTemp } from './paths.mjs';

/** agent ที่ถูกบังคับด้วย gate (ชื่อเป็น lowercase ตาม OpenCode) */
export const PLANNING_AGENTS = ['plan', 'buddha', 'bazer', 'arena', 'poteto-mode'];

/** จำนวน approval ที่ต้องมีก่อนอนุญาตให้เขียนไฟล์โปรเจกต์ (0 = ไม่ต้องมี) */
export const REQUIRED_APPROVALS = { plan: 1, buddha: 2, bazer: 1, arena: 0, 'poteto-mode': 0 };

/** agent ที่เขียนได้เฉพาะ %TEMP%\\bazer — ห้ามแตะโปรเจกต์ไม่ว่าจะอนุมัติกี่ครั้ง */
export const TEMP_ONLY = ['arena', 'poteto-mode'];

const WRITE_TOOLS = new Set(['write', 'edit', 'patch', 'multiedit', 'apply_patch']);

function lower(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function isApprovedOutput(value) {
  return /Plan approved(?:!| with notes!)(?=\s|$|["'}\)\]])/.test(String(value ?? ''));
}

export function isDeniedOutput(value) {
  return /(^|\n)\s*(YOUR PLAN WAS NOT APPROVED|Plan changes requested)/i.test(String(value ?? ''));
}

/** ชื่อ gate จากข้อความ ('GATE 2' มาก่อน เพราะ GATE 2 มักอ้างถึง GATE 1 ในเนื้อหา) */
function gateNameOf(value) {
  const s = String(value ?? '');
  if (/GATE\s*2/i.test(s)) return 'gate2';
  if (/GATE\s*1/i.test(s)) return 'gate1';
  return 'unknown';
}

/**
 * แปลงผลของ tool call เป็น gate ที่ได้รับอนุมัติ
 *
 * host บางตัวไม่มี tool `submit_plan`: subagent `plannotator` ใช้ CLI
 * (`plannotator annotate … --gate --json --require-approval --result-file`)
 * แล้วรายงานกลับมาเป็นข้อความ `{"decision":"approved"}` ในผลของ tool `task`/`subagent`
 *
 * @param {{tool?: string, result?: any, input?: any}} [o]
 * @returns {'gate1'|'gate2'|'unknown'|null}  null = ไม่ใช่การอนุมัติ
 */
export function approvalOf({ tool, result, input } = {}) {
  const out = String(result ?? '');
  if (!out) return null;
  // ตัวปฏิเสธต้องชนะก่อน — "annotated" คือยังไม่ตัดสิน, "denied"/"error" คือไม่ผ่าน
  if (/"decision"\s*:\s*"(annotated|pending|denied|error)"/i.test(out)) return null;
  if (isDeniedOutput(out)) return null;

  const approved =
    /"decision"\s*:\s*"approved"/i.test(out) || isApprovedOutput(out) || /Plan approved(?:!| with notes!)/.test(out);
  if (!approved) return null;

  // gate จากสิ่งที่ส่งเข้าไปก่อน (plannotator ส่งหัวแผน `# GATE n — …` เข้า input)
  const fromInput = gateNameOf(input);
  if (fromInput !== 'unknown') return fromInput;
  const fromResult = gateNameOf(out);
  if (fromResult !== 'unknown') return fromResult;
  return 'unknown';
}

export function isHandoffText(value) {
  const s = String(value ?? '');
  if (/Plan mode remains active; no implementation has been requested/i.test(s)) return true;
  // Plannotator แนบ feedback ของผู้ตรวจมาเป็นข้อความ role=user — ไม่ใช่คำสั่งใหม่ของผู้ใช้
  if (/^#\s*Plan Feedback/im.test(s.trim())) return true;
  if (/I've reviewed this plan and I have \d+ piece/i.test(s)) return true;
  return false;
}

export function builderTarget(args) {
  const a = args || {};
  return lower(
    a.subagent_type ?? a.subagentType ?? a.agent_type ?? a.agentType ?? a.agent ?? a.subagent ?? a.name ?? '',
  );
}

export function writePath(args) {
  const a = args || {};
  return String(a.filePath ?? a.file_path ?? a.path ?? a.file ?? a.filename ?? a.target ?? '');
}

/* ---------------------------------------------------------------- approvals
   Approval records are plain objects: { gate1, gate2, any, count?, at }.
   - buddha : gate1 (Arena) + gate2 (Build)
   - plan / bazer / others that need 1: any
   - unknown gate: sets `any` only (never fakes a BUDDHA gate)
   `count` is kept only as a legacy mirror/floor so phase files written by
   older builds can still be restored. */

/** จำนวน approval สะท้อนจาก flag ใน record (ใช้ mirror ลง phase file) */
export function countOf(record) {
  const r = record || {};
  const flags = (r.gate1 ? 1 : 0) + (r.gate2 ? 1 : 0);
  if (flags > 0) return Math.max(flags, Number(r.count) || 0);
  if (r.any) return Math.max(1, Number(r.count) || 0);
  return Number(r.count) || 0;
}

/** คืน record ใหม่ที่อนุมัติ gate นั้นแล้ว — ไม่ mutate ของเดิม */
export function markApproved(record, gate) {
  const prev = record || {};
  const gate1 = !!prev.gate1;
  const gate2 = !!prev.gate2;
  const any = !!prev.any;
  const name = lower(gate);
  const at = Date.now();
  const count = countOf(prev);
  if (name === 'gate1') return { gate1: true, gate2, any, count, at };
  if (name === 'gate2') return { gate1, gate2: true, any, count, at };
  // 'unknown' — ตั้ง any=true เท่านั้น ไม่แต่ง gate ของ BUDDHA
  return { gate1, gate2, any: true, count, at };
}

/** gate สำหรับ agent นี้เปิดแล้วหรือยัง (non-planning = true) */
export function gateSatisfied(agent, record) {
  const name = lower(agent);
  if (!PLANNING_AGENTS.includes(name)) return true;
  const need = REQUIRED_APPROVALS[name] ?? 1;
  if (need <= 0) return true;

  const r = record || {};
  const hasFlags = 'gate1' in r || 'gate2' in r || 'any' in r;
  // record รุ่นเก่า/กู้จาก phase file: ไม่มี flag → เทียบจำนวนเดิม
  if (!hasFlags) return countOf(r) >= need;

  if (name === 'buddha') return !!(r.gate1 && r.gate2);
  return !!r.any || countOf(r) >= need;
}

function allow() {
  return { allow: true, reason: '' };
}

function deny(reason) {
  return { allow: false, reason };
}

/**
 * The single gate. Returns { allow, reason }.
 *
 * @param {object} o
 * @param {string} o.agent
 * @param {string} o.tool            ชื่อ tool ('edit' | 'bash' | 'task' | ...)
 * @param {object} o.args
 * @param {number|boolean} o.count   จำนวน approval ที่อนุมัติแล้วในเซสชันนี้
 * @param {string[]} o.tempRoots
 */
export function decide({ agent, tool, args, count, approved, tempRoots } = {}) {
  const name = lower(agent);
  const t = String(tool ?? '');
  if (!PLANNING_AGENTS.includes(name)) return allow();
  if (t === 'submit_plan') return allow();

  const need = REQUIRED_APPROVALS[name] ?? 1;
  const have = typeof count === 'number' ? count : approved ? 1 : 0;
  const ok = have >= need;
  const plan = name === 'plan';
  const target = builderTarget(args);

  if (t === 'task') {
    if (target === 'builder' && !ok) {
      return deny(`builder is only callable after ${need} approved plan${need > 1 ? 's' : ''} (มี ${have})`);
    }
    if (plan && !ok && target && target !== 'explore') {
      return deny('in PLAN only explore subagents are allowed before approval');
    }
    if (plan && ok && target && target !== 'builder' && target !== 'explore') {
      return deny('approved Plan Mode delegates implementation to builder only');
    }
    return allow();
  }

  if (WRITE_TOOLS.has(t)) {
    const targetPath = writePath(args);
    if (TEMP_ONLY.includes(name)) {
      return isTempPath(targetPath, tempRoots)
        ? allow()
        : deny(`${name} เขียนได้เฉพาะ %TEMP%\\bazer (ห้ามแตะไฟล์โปรเจกต์)`);
    }
    if (ok && !plan) return allow();
    if (isTempPath(targetPath, tempRoots)) return allow();
    if (ok && plan) return deny('approved Plan Mode must delegate writes to the builder subagent');
    const hint = need > 1 ? ` (ต้องอนุมัติ ${need} ครั้ง — ตอนนี้ ${have})` : '';
    return deny(`no approved plan in this session${hint} — implementation is blocked; call submit_plan first`);
  }

  if ((t === 'bash' || t === 'shell') && !ok) {
    const cmd = String(args?.command ?? '');
    if (!looksLikeWrite(cmd)) return allow();
    if (shellTouchesTemp(cmd, tempRoots)) return allow();
    return deny('shell writes are blocked before an approved plan');
  }

  if ((t === 'bash' || t === 'shell') && TEMP_ONLY.includes(name)) {
    const cmd = String(args?.command ?? '');
    if (!looksLikeWrite(cmd) || shellTouchesTemp(cmd, tempRoots)) return allow();
    return deny(`${name} รันคำสั่งที่เขียนไฟล์ได้เฉพาะใต้ %TEMP%\\bazer`);
  }

  return allow();
}

/** PLAN / ARENA / BUILD สำหรับ badge — นับ approval ตามที่ agent นั้นต้องการ */
export function phaseFor(agent, approvedCount) {
  const name = lower(agent);
  const count = Number(approvedCount) || 0;
  const need = REQUIRED_APPROVALS[name] ?? 1;
  if (!PLANNING_AGENTS.includes(name)) return '';
  if (count <= 0) return 'PLAN';
  if (count < need) return need > 1 && name === 'buddha' ? 'ARENA' : 'PLAN';
  return 'BUILD';
}

function messageRole(message) {
  return lower(message?.role ?? message?.info?.role ?? '');
}

function messageAgent(message) {
  return lower(message?.agent ?? message?.info?.agent ?? '');
}

function partsOf(message, partOf) {
  if (typeof partOf === 'function') return partOf(message) || [];
  return Array.isArray(message?.parts) ? message.parts : [];
}

export function messageText(message, partOf) {
  const parts = partsOf(message, partOf);
  return parts.map((p) => (p?.type === 'text' ? String(p.text ?? '') : '')).join('\n');
}

/** Last user message that is not Plannotator's own handoff/feedback. */
export function lastRealUserIndex(messages, partOf) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i];
    if (messageRole(m) !== 'user') continue;
    if (isHandoffText(messageText(m, partOf))) continue;
    return i;
  }
  return -1;
}

export function agentFromMessages(messages) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i--) {
    const a = messageAgent(list[i]);
    if (a) return a;
  }
  return '';
}

/** Count approved submit_plan tool parts after the last real user prompt. */
export function approvalsFromMessages(messages, partOf) {
  const list = Array.isArray(messages) ? messages : [];
  const start = Math.max(0, lastRealUserIndex(list, partOf));
  let count = 0;
  for (let i = start; i < list.length; i++) {
    const parts = partsOf(list[i], partOf);
    for (const p of parts) {
      if (p?.type !== 'tool') continue;
      const tool = String(p.tool ?? p.name ?? '');
      const out = String(p?.state?.output ?? p?.output ?? '');
      if (tool === 'submit_plan' && isApprovedOutput(out)) count++;
    }
  }
  return count;
}
