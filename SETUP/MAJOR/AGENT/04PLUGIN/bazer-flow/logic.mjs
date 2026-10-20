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

/** agent ที่ถูกบังคับด้วย gate (ชื่อเป็น lowercase ตาม OpenCode) */
export const PLANNING_AGENTS = ['plan', 'buddha', 'bazer', 'arena', 'poteto-mode'];

/** จำนวน approval ที่ต้องมีก่อนอนุญาตให้เขียนไฟล์โปรเจกต์ (0 = ไม่ต้องมี) */
export const REQUIRED_APPROVALS = { plan: 1, buddha: 2, bazer: 1, arena: 0, 'poteto-mode': 0 };

/** agent ที่เขียนได้เฉพาะ %TEMP%\\bazer — ห้ามแตะโปรเจกต์ไม่ว่าจะอนุมัติกี่ครั้ง */
export const TEMP_ONLY = ['arena', 'poteto-mode'];

const WRITE_TOOLS = new Set(['write', 'edit', 'patch', 'multiedit', 'apply_patch']);
const WRITE_COMMANDS = [
  /(^|[^>])>{1,2}\s*[^&|]/,                                              // redirect
  /(^|\s)(set-content|out-file|new-item|remove-item|copy-item|move-item|rename-item|add-content|set-item|clear-content)\b/i,
  /(^|\s)(rm|del|erase|mv|move|cp|copy|tee|touch|mkdir|rmdir)\s/i,
  /(^|\s)sed\s+(-[a-z]*i|--in-place)/i,
  /(^|\s)git\s+(apply|checkout\s+--|reset\s+--hard|clean\s+-[a-z]*f)/i,
  /(^|\s)(npm|pnpm|yarn|bun)\s+(add|install|remove|uninstall|update)\b/i,
  /(^|\s)node\s+-e\b/i,
  /\[(?:System\.)?IO\.File\]::/i,
];

function lower(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizedPath(value) {
  return String(value ?? '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

export function isApprovedOutput(value) {
  return /Plan approved(?:!| with notes!)(?=\s|$|["'}\)\]])/.test(String(value ?? ''));
}

export function isDeniedOutput(value) {
  return /(^|\n)\s*(YOUR PLAN WAS NOT APPROVED|Plan changes requested)/i.test(String(value ?? ''));
}

export function isHandoffText(value) {
  const s = String(value ?? '');
  if (/Plan mode remains active; no implementation has been requested/i.test(s)) return true;
  // Plannotator แนบ feedback ของผู้ตรวจมาเป็นข้อความ role=user — ไม่ใช่คำสั่งใหม่ของผู้ใช้
  if (/^#\s*Plan Feedback/im.test(s.trim())) return true;
  if (/I've reviewed this plan and I have \d+ piece/i.test(s)) return true;
  return false;
}

export function defaultTempRoots() {
  const base = process.env.TEMP || process.env.TMP || '';
  const roots = ['/tmp/bazer'];
  if (base) roots.push(normalizedPath(base).replace(/\/+$/, '') + '/bazer');
  return roots;
}

export function isTempPath(filePath, tempRoots = defaultTempRoots()) {
  const p = normalizedPath(filePath);
  if (!p) return false;
  if (p.split('/').includes('..')) return false;
  return (tempRoots || []).some((root) => {
    const r = normalizedPath(root);
    return !!r && (p === r || p.startsWith(r + '/'));
  });
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

export function looksLikeWrite(command) {
  const s = String(command ?? '');
  if (!s) return false;
  return WRITE_COMMANDS.some((re) => re.test(s));
}

/** คำสั่ง shell ที่เขียนไฟล์: อนุญาตเฉพาะเมื่อทุกพาธที่อ้างถึงอยู่ใน temp root */
export function shellTouchesTemp(command, tempRoots = defaultTempRoots()) {
  const s = normalizedPath(command);
  return (tempRoots || []).some((root) => {
    const r = normalizedPath(root);
    return !!r && s.includes(r);
  });
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
