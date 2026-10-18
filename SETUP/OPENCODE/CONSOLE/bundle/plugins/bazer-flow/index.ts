// @ts-nocheck
/* bazer-flow — BAZER FLOW v2 enforcement kernel (OpenCode 2 / V2 plugin API).
   One job: no planning agent implements before an approved plan.
   - plan   : implements only through the `builder` subagent (never edits itself)
   - buddha : implements in the same session after approval (no agent switch)
   - others : pass-through (build, builder, subagents untouched)
   The Console installs this file; `flow-toggle` removes its registration. */

import { Plugin } from '@opencode/plugin';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  PLANNING_AGENTS,
  decide,
  defaultTempRoots,
  isApprovedOutput,
} from './logic.mjs';

function reminder(agent, approved) {
  if (agent === 'plan' && !approved) {
    return [
      '## BAZER FLOW v2 — PLAN GATE (enforced)',
      'No approved plan exists in this session. Implementation tools are blocked by the host.',
      'Do NOT write or edit project files and do NOT call `task` with `builder`.',
      'When the plan is complete, call `submit_plan` with the full plan and wait for approval.',
      'A plan written only in chat does not count as approval.',
    ].join('\n');
  }
  if (agent === 'plan' && approved) {
    return [
      '## BAZER FLOW v2 — PLAN APPROVED',
      'You are still the Plan agent. Do not edit files yourself; the host blocks it.',
      'Delegate the implementation to the `builder` subagent with `task`, passing the approved plan content,',
      'the exact files/areas to touch, and the verification commands. Then verify builder\'s report with real evidence.',
    ].join('\n');
  }
  if (agent === 'buddha' && !approved) {
    return [
      '## BAZER FLOW v2 — BUDDHA (gate closed)',
      'Work stays inside this Buddha session. No agent switching.',
      'Author the GATE 1 plan through `BAZERs-EXTENSION-Poteto` first (load the skill; do not switch agents), then add candidates/rubric.',
      'Before approval only `%TEMP%\\bazer\\**` writes are allowed. Arena candidates go there; never touch the project.',
      'GATE 1 plan title: `# GATE 1 — ARENA PLAN`. GATE 2 plan title: `# GATE 2 — BUILD PLAN`.',
      'Call `submit_plan` before any implementation, and never call `task` with `builder` before approval.',
    ].join('\n');
  }
  if (agent === 'buddha' && approved) {
    return [
      '## BAZER FLOW v2 — BUDDHA (approved)',
      'The Plannotator plan-mode reminder above is superseded for edits in this session: writes are allowed now.',
      'If the approved plan was GATE 1, run Arena inside this session (temp only) and then submit the GATE 2 plan.',
      'If it was GATE 2, implement in this session as Buddha. Do not switch agents.',
    ].join('\n');
  }
  if (approved) {
    return '## BAZER FLOW v2 — plan approved\nProceed according to this agent\'s workflow; do not switch agents unless the user asks.';
  }
  return [
    '## BAZER FLOW v2 — gate closed',
    'Call `submit_plan` before implementation. Project writes are blocked by the host until approval.',
  ].join('\n');
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
    const key = `${String(agent || '')}|${record?.approved ? 1 : 0}|${record?.count || 0}`;
    if (writePhase.last.get(file) === key) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      JSON.stringify({
        agent: String(agent || ''),
        approved: !!record?.approved,
        count: record?.count || 0,
        at: Date.now(),
      }),
    );
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
    /** sessionID -> { approved, count, at } */
    const approvals = new Map();
    const temps = defaultTempRoots();

    /** In-memory first; after a plugin reload/restart, restore the phase file. */
    const approvalFor = (sessionID, agent) => {
      const sid = String(sessionID || '');
      let record = approvals.get(sid);
      if (!record) {
        const saved = readPhase(sid);
        if (saved && (!agent || !saved.agent || String(saved.agent).toLowerCase() === String(agent).toLowerCase())) {
          record = { approved: !!saved.approved, count: Number(saved.count) || 0, at: Number(saved.at) || 0 };
          approvals.set(sid, record);
        }
      }
      return record;
    };

    // ---------------------------------------------------------------- agents
    await ctx.agent.transform((editor) => {
      for (const name of PLANNING_AGENTS) {
        const agent = editor.get(name);
        if (!agent) continue;
        const rules = [{ action: 'submit_plan', resource: '*', effect: 'allow' }];
        if (name === 'plan') {
          rules.push(
            { action: 'edit', resource: '*', effect: 'deny' },
            { action: 'edit', resource: '*.md', effect: 'allow' },
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
          draft.mode = 'all';
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
          if (event?.type !== 'session.deleted') continue;
          const id = event?.properties?.sessionID ?? event?.properties?.id ?? event?.data?.sessionID;
          if (id) {
            approvals.delete(id);
            try { fs.rmSync(statePath(id), { force: true }); } catch {}
          }
        }
      } catch {}
    })();

    // ---------------------------------------------------------------- hooks
    await ctx.tool.hook('execute.before', (event) => {
      const sid = String(event.sessionID || '');
      if (!sid) return;

      if (event.tool === 'submit_plan') {
        // A new plan is pending until its review returns approved.
        const prev = approvals.get(sid);
        const next = { approved: false, count: prev?.count || 0, at: Date.now() };
        approvals.set(sid, next);
        writePhase(sid, event.agent, next);
        return;
      }

      const agent = String(event.agent || '').toLowerCase();
      const record = approvalFor(sid, agent);
      const toolName = event.tool === 'subagent' ? 'task' : event.tool;
      const decision = decide({
        agent,
        tool: toolName,
        args: event.input,
        approved: !!record?.approved,
        tempRoots: temps,
      });
      if (!decision.allow) throw new Error(denyText(decision.reason));
    });

    await ctx.tool.hook('execute.after', (event) => {
      if (event.tool !== 'submit_plan') return;
      if (event.status !== 'completed') return;
      const text = typeof event.result === 'string' ? event.result : JSON.stringify(event.result ?? '');
      if (!isApprovedOutput(text)) return;
      const sid = String(event.sessionID || '');
      const prev = approvals.get(sid) || approvalFor(sid, event.agent);
      const next = { approved: true, count: (prev?.count || 0) + 1, at: Date.now() };
      approvals.set(sid, next);
      writePhase(sid, event.agent, next);
    });

    // Second veto for permission-mediated actions (edit/bash/task) that the
    // configured rules would otherwise allow. A deny here is final.
    await ctx.permission.hook('evaluate', (event) => {
      const agent = String(event.agent || '').toLowerCase();
      if (!PLANNING_AGENTS.includes(agent)) return;
      const mapped = actionToTool(event.action, event.resources);
      if (!mapped) return;
      const record = approvalFor(event.sessionID, agent);
      const decision = decide({
        agent,
        tool: mapped.tool,
        args: mapped.args,
        approved: !!record?.approved,
        tempRoots: temps,
      });
      if (decision.allow) return;
      event.effect = 'deny';
      event.message = denyText(decision.reason);
    });

    // Phase-aware instruction. Runs for the agent loop only.
    await ctx.session.hook('context', (event) => {
      const agent = String(event.agent || '').toLowerCase();
      if (!PLANNING_AGENTS.includes(agent)) return;
      const sid = String(event.sessionID || '');
      const record = approvalFor(sid, agent);
      writePhase(sid, agent, record);
      event.system.push({ type: 'text', text: reminder(agent, !!record?.approved) });
    });

    return () => controller.abort();
  },
});
