/* bazer-flow — pure decision logic (no I/O).
   Imported by the server plugin, the TUI badge and flow-check.mjs.
   Keep this file dependency-free so `node flow-check.mjs` can test it directly. */

export const PLANNING_AGENTS = ['plan', 'buddha', 'arena', 'snack', 'poteto-mode'];

const WRITE_TOOLS = new Set(['write', 'edit', 'patch', 'multiedit', 'apply_patch']);
const WRITE_COMMANDS = [
  /(^|[^>])>{1,2}\s*[^&|]/,                                              // redirect
  /(^|\s)(set-content|out-file|new-item|remove-item|copy-item|move-item|rename-item|add-content)\b/i,
  /(^|\s)(rm|del|erase|mv|move|cp|copy|tee|touch|mkdir)\s/i,
  /(^|\s)sed\s+(-[a-z]*i|--in-place)/i,
  /(^|\s)git\s+(apply|checkout\s+--|reset\s+--hard|clean\s+-[a-z]*f)/i,
  /(^|\s)(npm|pnpm|yarn|bun)\s+(add|install|remove|uninstall|update)\b/i,
  /(^|\s)node\s+-e\b/i,
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
  return /Plan mode remains active; no implementation has been requested/i.test(String(value ?? ''));
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
    a.subagent_type ??
      a.subagentType ??
      a.agent_type ??
      a.agentType ??
      a.agent ??
      a.subagent ??
      a.name ??
      '',
  );
}

export function writePath(args) {
  const a = args || {};
  return String(
    a.filePath ??
      a.file_path ??
      a.path ??
      a.file ??
      a.filename ??
      a.target ??
      '',
  );
}

export function looksLikeWrite(command) {
  const s = String(command ?? '');
  if (!s) return false;
  return WRITE_COMMANDS.some((re) => re.test(s));
}

function allow() {
  return { allow: true, reason: '' };
}

function deny(reason) {
  return { allow: false, reason };
}

/**
 * The single gate. Returns { allow, reason }.
 * Planning agents are gated; everyone else (build, builder, subagents) passes.
 */
export function decide({ agent, tool, args, approved, tempRoots } = {}) {
  const name = lower(agent);
  const t = String(tool ?? '');
  if (!PLANNING_AGENTS.includes(name)) return allow();
  if (t === 'submit_plan') return allow();

  const plan = name === 'plan';
  const target = builderTarget(args);

  if (t === 'task') {
    if (target === 'builder' && !approved) {
      return deny('builder is only callable after an approved plan');
    }
    if (plan && !approved && target && target !== 'explore') {
      return deny('in PLAN only explore subagents are allowed before approval');
    }
    if (plan && approved && target && target !== 'builder' && target !== 'explore') {
      return deny('approved Plan Mode delegates implementation to builder only');
    }
    return allow();
  }

  if (WRITE_TOOLS.has(t)) {
    const targetPath = writePath(args);
    if (approved && !plan) return allow();
    if (isTempPath(targetPath, tempRoots)) return allow();
    if (approved && plan) {
      return deny('approved Plan Mode must delegate writes to the builder subagent');
    }
    return deny('no approved plan in this session — implementation is blocked; call submit_plan first');
  }

  if (t === 'bash' && !approved) {
    const cmd = String(args?.command ?? '');
    if (!looksLikeWrite(cmd)) return allow();
    const inTemp = (tempRoots || []).some((root) => normalizedPath(cmd).includes(normalizedPath(root)));
    if (inTemp) return allow();
    return deny('shell writes are blocked before an approved plan');
  }

  return allow();
}

export function phaseFor(agent, approvedCount) {
  const name = lower(agent);
  const count = Number(approvedCount) || 0;
  if (name === 'plan') return count > 0 ? 'BUILD' : 'PLAN';
  if (name === 'buddha') return count >= 2 ? 'BUILD' : count === 1 ? 'ARENA' : 'PLAN';
  return '';
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

/** Last user message that is not Plannotator's approval handoff. */
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
