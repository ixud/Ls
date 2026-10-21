// @ts-nocheck
/* bazer-flow — BAZER FLOW v2 enforcement kernel (OpenCode 2 / V2 plugin API).
   One job: no planning agent implements before the plan is approved (BUDDHA: 2 gates).
   - plan   : implements only through the `builder` subagent (never edits itself)
   - buddha : needs 2 approvals (GATE 1 Arena + GATE 2 Build), then edits in-session
   - bazer  : needs 1 approval
   - arena  : writes temp only (candidates), never the project
   - snack  : NOT gated — quick edit mode with no plan (by design)
   - others : pass-through (build, builder, subagents untouched)
   The Console installs this folder; `retire-old-flow` unregisters it. */

import { Plugin } from '@opencode/plugin';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  PLANNING_AGENTS,
  REQUIRED_APPROVALS,
  approvalOf,
  countOf,
  decide,
  defaultTempRoots,
  gateSatisfied,
  isApprovedOutput,
  isHandoffText,
  markApproved,
} from './logic.mjs';

/** อ่าน gate จากหัวแผนที่ถูกส่งเข้า submit_plan */
function gateOf(text) {
  const s = String(text ?? '');
  if (/GATE\s*2/i.test(s)) return 'gate2';
  if (/GATE\s*1/i.test(s)) return 'gate1';
  return 'unknown';
}

/** รวมข้อความ text part ของ event หนึ่ง ๆ (ใช้แยก user prompt จริงจาก feedback ของ Plannotator) */
function eventText(event) {
  const p = event?.properties || {};
  const parts = [p.parts, p.info?.parts, event?.data?.parts];
  const out = [];
  for (const list of parts) {
    if (!Array.isArray(list)) continue;
    for (const part of list) {
      if (part?.type === 'text' && part.text) out.push(String(part.text));
    }
  }
  if (!out.length && typeof p.text === 'string') out.push(p.text);
  return out.join('\n');
}

/** ข้อความแผนจาก input ของ submit_plan */
function planTextOf(input) {
  const i = input || {};
  const value = i.plan ?? i.text ?? i.markdown ?? i.content ?? i.content_preview ?? '';
  return typeof value === 'string' ? value : JSON.stringify(value ?? '');
}

function reminder(agent, count) {
  const need = REQUIRED_APPROVALS[agent] ?? 1;
  const ok = count >= need;

  if (agent === 'plan' && !ok) {
    return [
      '## BAZER FLOW v2 — PLAN GATE (enforced)',
      'No approved plan exists in this session. Implementation tools are blocked by the host.',
      'Do NOT write or edit project files and do NOT call `task` with `builder`.',
      'When the plan is complete, call `submit_plan` with the full plan and wait for approval.',
      'A plan written only in chat does not count as approval.',
    ].join('\n');
  }
  if (agent === 'plan' && ok) {
    return [
      '## BAZER FLOW v2 — PLAN APPROVED',
      'You are still the Plan agent. Do not edit files yourself; the host blocks it.',
      'Delegate the implementation to the `builder` subagent with `task`, passing the approved plan content,',
      'the exact files/areas to touch, and the verification commands. Then verify builder\'s report with real evidence.',
    ].join('\n');
  }
  if (agent === 'buddha' && !ok) {
    return [
      `## BAZER FLOW v2 — BUDDHA (gate closed · อนุมัติแล้ว ${count}/${need})`,
      'Work stays inside this Buddha session. No agent switching.',
      count === 0
        ? 'Author the GATE 1 plan through the `poteto` subagent (in line), then add candidates/rubric and call `submit_plan`.'
        : 'GATE 1 ผ่านแล้ว: รัน Arena ในเซสชันนี้ (candidate ลง %TEMP%\\bazer เท่านั้น) แล้วเขียน GATE 2 plan ผ่าน `poteto` และ `submit_plan` อีกครั้ง',
      'Before approval only `%TEMP%\\bazer\\**` writes are allowed. Arena candidates go there; never touch the project.',
      'GATE 1 plan title: `# GATE 1 — ARENA PLAN`. GATE 2 plan title: `# GATE 2 — BUILD PLAN`.',
      'Never call `task` with `builder` before GATE 2 approval.',
    ].join('\n');
  }
  if (agent === 'buddha' && ok) {
    return [
      '## BAZER FLOW v2 — BUDDHA (GATE 2 approved)',
      'Writes are allowed now: implement in this session as Buddha.',
      'Call the `builder` subagent inline (tool `subagent`) when a delegated hand is useful: pass the approved plan content,',
      'the files/areas to touch, and the proof commands — then verify the report with real evidence. Do not switch agents.',
    ].join('\n');
  }
  if (agent === 'bazer') {
    return ok
      ? '## BAZER FLOW v2 — plan approved\nProceed: edit only the paths the user named, then report evidence and commit.'
      : '## BAZER FLOW v2 — gate closed\nWrite the short plan, call `submit_plan`, wait for approval. Only `%TEMP%\\bazer\\**` writes are allowed until then.';
  }
  if (agent === 'arena') {
    return '## BAZER FLOW v2 — ARENA\nWrite candidates only under `%TEMP%\\bazer\\`. The project is read-only for this agent.';
  }
  return '## BAZER FLOW v2\ngate closed until submit_plan is approved.';
}

function denyText(reason) {
  return 'bazer-flow: ' + reason;
}

/** Replace rules with the same action+resource so repeated replays stay stable. */
function setRules(agent, rules) {
  agent.permissions = Array.isArray(agent.permissions) ? agent.permissions : [];
  for (const rule of rules) {
    agent.permissions = agent.permissions.filter(
      (current) => !(current.action === rule.action && current.resource === rule.resource),
    );
    agent.permissions.push(rule);
  }
}

function actionToTool(action, resources) {
  const name = String(action || '');
  if (name === 'edit' || name === 'write' || name === 'patch') return { tool: 'edit', args: { filePath: resources?.[0] } };
  if (name === 'bash' || name === 'shell') return { tool: 'bash', args: { command: resources?.[0] || '' } };
  if (name === 'task' || name === 'subagent') return { tool: 'task', args: { subagent_type: resources?.[0] || '' } };
  return null;
}

/** Shared phase file for the TUI badge (TUI cannot read server memory or message parts). */
function statePath(sessionID) {
  return path.join(os.homedir(), '.local', 'state', 'opencode', 'bazer-flow', String(sessionID) + '.json');
}

function writePhase(sessionID, agent, record) {
  try {
    const file = statePath(sessionID);
    const count = countOf(record);
    const key = `${String(agent || '')}|${count}`;
    if (writePhase.last.get(file) === key) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ agent: String(agent || ''), count, at: Date.now() }));
    writePhase.last.set(file, key);
  } catch {}
}
writePhase.last = new Map();

function readPhase(sessionID) {
  try {
    return JSON.parse(fs.readFileSync(statePath(sessionID), 'utf8'));
  } catch {
    return null;
  }
}

export default Plugin.define({
  id: 'bazer.flow',
  async setup(ctx) {
    /** sessionID -> { gate1, gate2, any, count?, at } */
    const approvals = new Map();
    /** child sessionID -> parent sessionID (plannotator = subagent → approval อยู่ที่ session ลูก) */
    const parents = new Map();
    /** sessionID -> ข้อความแผนล่าสุดที่ส่งเข้า submit_plan (ใช้เลือก gate) */
    const pendingPlans = new Map();
    const temps = defaultTempRoots();

    /** In-memory first; after a plugin reload/restart, restore the phase file. */
    const approvalFor = (sessionID, agent) => {
      const sid = String(sessionID || '');
      let record = approvals.get(sid);
      if (!record) {
        const saved = readPhase(sid);
        if (saved && (!agent || !saved.agent || String(saved.agent).toLowerCase() === String(agent).toLowerCase())) {
          const count = Number(saved.count) || 0;
          const savedAgent = String(saved.agent || '').toLowerCase();
          const isBuddha = savedAgent === 'buddha';
          record = {
            gate1: isBuddha && count >= 1,
            gate2: isBuddha && count >= 2,
            any: !isBuddha && count >= 1,
            count,
            at: Number(saved.at) || 0,
          };
          approvals.set(sid, record);
        }
      }
      return record || { gate1: false, gate2: false, any: false, count: 0, at: 0 };
    };

    /** agent จาก event ก่อน; ถ้าไม่มี ใช้ phase file (กัน fail-open) */
    const agentOf = (sid, agent) => {
      const a = String(agent || '').toLowerCase();
      if (a) return a;
      const saved = readPhase(sid);
      return String(saved?.agent || '').toLowerCase();
    };

    /** เติม parents จาก host (เฉพาะเมื่อ event ไม่ได้พา parentID มา) */
    const parentOf = (sid) => {
      const known = parents.get(sid);
      if (known) return known;
      try {
        const info = ctx.data?.session?.get?.(sid);
        const parentID = info?.parentID ?? info?.parentId ?? info?.parent;
        if (parentID) {
          parents.set(sid, String(parentID));
          return String(parentID);
        }
      } catch {}
      return '';
    };

    /**
     * ให้เครดิต approval กับ session ที่อนุมัติ (child) และไล่ขึ้น parent สูงสุด 5 ชั้น
     * เพราะ `task → builder` ถูกเรียกจาก parent แต่ submit_plan วิ่งใน child
     */
    const creditChain = (sessionID, gate, agent) => {
      const seen = new Set();
      let cur = String(sessionID || '');
      let depth = 0;
      while (cur && !seen.has(cur) && depth < 5) {
        seen.add(cur);
        const owner = depth === 0 ? agentOf(cur, agent) : agentOf(cur, '');
        const next = markApproved(approvals.get(cur), gate);
        approvals.set(cur, next);
        // อย่าเขียนทับ phase file เดิมด้วย agent ว่าง (badge จะหาย)
        if (owner) writePhase(cur, owner, next);
        const parent = parentOf(cur);
        if (!parent) break;
        cur = parent;
        depth++;
      }
    };

    /** ล้าง approval ของ session นี้ + session ลูกที่รู้จัก */
    const clearSubtree = (sessionID) => {
      const sid = String(sessionID || '');
      if (!sid) return;
      const ids = new Set([sid]);
      for (const [child, parent] of parents) if (parent === sid) ids.add(child);
      for (const id of ids) {
        approvals.delete(id);
        pendingPlans.delete(id);
        const owner = agentOf(id, '');
        if (owner) writePhase(id, owner, { gate1: false, gate2: false, any: false, count: 0 });
        else { try { fs.rmSync(statePath(id), { force: true }); } catch {} }
      }
    };

    /** จำนวนที่มีผลกับ gate (migrate count เดิม → gateSatisfied โดยไม่แก้ signature ของ decide) */
    const effectiveCount = (agent, record) => {
      const have = countOf(record);
      if (!gateSatisfied(agent, record)) return have;
      const need = REQUIRED_APPROVALS[agent] ?? 1;
      return Math.max(have, need);
    };

    // ---------------------------------------------------------------- agents
    await ctx.agent.transform((editor) => {
      for (const name of PLANNING_AGENTS) {
        const agent = editor.get(name);
        if (!agent) continue;
        const rules = [{ action: 'submit_plan', resource: '*', effect: 'allow' }];
        if (name === 'plan') {
          // ไม่มีข้อยกเว้น *.md — Plan ห้ามแตะไฟล์โปรเจกต์ก่อนอนุมัติ (เขียนได้เฉพาะ temp)
          rules.push(
            { action: 'edit', resource: '*', effect: 'deny' },
            { action: 'subagent', resource: '*', effect: 'deny' },
            { action: 'subagent', resource: 'explore', effect: 'allow' },
            { action: 'subagent', resource: 'builder', effect: 'allow' },
          );
        }
        editor.update(name, (draft) => setRules(draft, rules));
      }

      const builder = editor.get('builder');
      if (builder) {
        editor.update('builder', (draft) => {
          setRules(draft, [
            { action: 'submit_plan', resource: '*', effect: 'deny' },
            { action: 'subagent', resource: '*', effect: 'deny' },
          ]);
        });
      }
    });

    // --------------------------------------------------------------- events
    const controller = new AbortController();
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
          try {
            const props = event?.properties || {};
            const info = props.info || event?.data?.info || {};

            // 1) จำความสัมพันธ์ child → parent ของทุก event ที่พามา
            const sidOf =
              props.sessionID ??
              event?.data?.sessionID ??
              (String(event?.type || '').startsWith('session.') ? info.sessionID ?? info.id ?? props.id : info.sessionID);
            const parentID = info.parentID ?? info.parentId ?? props.parentID ?? event?.data?.parentID;
            if (sidOf && parentID) parents.set(String(sidOf), String(parentID));

            // 2) session ถูกลบ → ล้างทั้ง session นั้นและ memory
            if (event?.type === 'session.deleted') {
              const id = props.sessionID ?? props.id ?? event?.data?.sessionID ?? info.id;
              if (id) {
                clearSubtree(id);
                approvals.delete(String(id));
                parents.delete(String(id));
                try { fs.rmSync(statePath(String(id)), { force: true }); } catch {}
              }
              continue;
            }

            // 3) ผู้ใช้พิมพ์ใหม่ → approval เดิมของ session (และ session ลูก) เป็นโมฆะ
            if (String(info.role ?? props.role ?? '').toLowerCase() === 'user') {
              const text = eventText(event);
              const keep = text && (isHandoffText(text) || isApprovedOutput(text));
              if (!keep) clearSubtree(sidOf ?? info.sessionID ?? props.sessionID);
            }
          } catch {}
        }
      } catch {}
    })();

    // ---------------------------------------------------------------- hooks
    await ctx.tool.hook('execute.before', (event) => {
      const sid = String(event.sessionID || '');
      if (!sid) return;

      if (event.tool === 'submit_plan') {
        // A new plan is pending until its review returns approved.
        pendingPlans.set(sid, planTextOf(event.input));
        const prev = approvalFor(sid, event.agent);
        const next = { gate1: !!prev.gate1, gate2: !!prev.gate2, any: !!prev.any, count: countOf(prev), at: Date.now() };
        approvals.set(sid, next);
        writePhase(sid, event.agent, next);
        return;
      }

      const agent = agentOf(sid, event.agent);
      const record = approvalFor(sid, agent);
      const toolName = event.tool === 'subagent' ? 'task' : event.tool;
      const decision = decide({
        agent,
        tool: toolName,
        args: event.input,
        count: effectiveCount(agent, record),
        tempRoots: temps,
      });
      if (!decision.allow) throw new Error(denyText(decision.reason));
    });

    await ctx.tool.hook('execute.after', (event) => {
      if (event.tool === 'submit_plan') {
        if (event.status !== 'completed') return;
        const text = typeof event.result === 'string' ? event.result : JSON.stringify(event.result ?? '');
        if (!isApprovedOutput(text)) return;
        const sid = String(event.sessionID || '');
        if (!sid) return;
        const plan = pendingPlans.get(sid) ?? planTextOf(event.input);
        pendingPlans.delete(sid);
        // approval วิ่งใน child (plannotator) แต่ builder ถูกเรียกจาก parent → ให้เครดิตทั้งสาย
        creditChain(sid, gateOf(plan), event.agent);
        return;
      }

      // host บางตัวไม่มี tool `submit_plan`: subagent (plannotator) ใช้ CLI แล้วรายงาน
      // `{"decision":"approved"}` กลับมาเป็นข้อความในผลของ tool `task`/`subagent`
      // ไม่อิงชื่อ target — host อาจส่งชื่อ tool/agent ต่างกัน
      if (!/(task|subagent)/i.test(String(event.tool ?? ''))) return;

      const sid = String(event.sessionID || '');
      if (!sid) return;

      const result = typeof event.result === 'string' ? event.result : JSON.stringify(event.result ?? '');
      const input = JSON.stringify(event.input ?? '');
      const gate = approvalOf({ tool: event.tool, result, input });
      if (gate === null) return;

      creditChain(sid, gate, event.agent);
      if (process.env.BAZER_FLOW_DEBUG === '1') {
        console.log(`bazer-flow: approval-source=task-result gate=${gate} tool=${event.tool} sid=${sid}`);
      }
    });

    // Second veto for permission-mediated actions (edit/bash/task) that the
    // configured rules would otherwise allow. A deny here is final.
    await ctx.permission.hook('evaluate', (event) => {
      const sid = String(event.sessionID || '');
      const agent = agentOf(sid, event.agent);
      if (!PLANNING_AGENTS.includes(agent)) return;
      const mapped = actionToTool(event.action, event.resources);
      if (!mapped) return;
      const record = approvalFor(sid, agent);
      const decision = decide({
        agent,
        tool: mapped.tool,
        args: mapped.args,
        count: effectiveCount(agent, record),
        tempRoots: temps,
      });
      if (decision.allow) return;
      event.effect = 'deny';
      event.message = denyText(decision.reason);
    });

    // Phase-aware instruction. Runs for the agent loop only.
    await ctx.session.hook('context', (event) => {
      const sid = String(event.sessionID || '');
      const agent = agentOf(sid, event.agent);
      if (!PLANNING_AGENTS.includes(agent)) return;
      const record = approvalFor(sid, agent);
      writePhase(sid, agent, record);
      event.system.push({ type: 'text', text: reminder(agent, countOf(record)) });
    });

    return () => controller.abort();
  },
});
