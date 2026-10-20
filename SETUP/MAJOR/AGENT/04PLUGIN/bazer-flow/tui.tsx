// @ts-nocheck
/* bazer-flow — TUI facet: PLAN / ARENA / BUILD badge next to the prompt.
   OpenCode 2 TUI plugins cannot read message parts, so the server plugin writes
   a tiny per-session phase file and this facet polls it (in-process fs read). */

import { Plugin, usePlugin } from '@opencode/plugin/tui';
import { createSignal, onCleanup } from 'solid-js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { phaseFor } from './logic.mjs';

const COLORS = { PLAN: '#8a8a8a', ARENA: '#ffd166', BUILD: '#7ee787' };

function statePath(sessionID) {
  return path.join(os.homedir(), '.local', 'state', 'opencode', 'bazer-flow', String(sessionID) + '.json');
}

function readPhase(api, sessionID) {
  if (!sessionID) return '';
  try {
    const state = JSON.parse(fs.readFileSync(statePath(sessionID), 'utf8'));
    return phaseFor(state.agent, state.count);
  } catch {}
  try {
    const session = api?.data?.session?.get?.(sessionID);
    return phaseFor(session?.agent, 0);
  } catch {}
  return '';
}

function PhaseBadge(props) {
  const api = usePlugin();
  const [phase, setPhase] = createSignal('');
  const tick = () => setPhase(readPhase(api, props.sessionID));
  const timer = setInterval(tick, 800);
  tick();
  onCleanup(() => clearInterval(timer));
  const label = () => (phase() ? ' ' + phase() : '');
  return <text fg={COLORS[phase()] || COLORS.PLAN}>{label()}</text>;
}

export default Plugin.define({
  id: 'bazer.flow.tui',
  setup(context) {
    let un = null;
    try {
      un = context.ui.slot({
        append: 'prompt.footer.status',
        render: (input) => <PhaseBadge sessionID={input?.sessionID} />,
      });
    } catch {
      un = null;
    }
    return () => {
      try {
        un && un();
      } catch {}
    };
  },
});
