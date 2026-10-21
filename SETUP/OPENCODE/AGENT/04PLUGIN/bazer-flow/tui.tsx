// @ts-nocheck
/* bazer-flow — TUI facet: reads v2/badge-<sid>.txt written by the server plugin.
   OpenCode 2 TUI plugins cannot read message parts, so the file is the only channel. */
import { Plugin } from '@opencode/plugin/tui';
import { createSignal, onCleanup } from 'solid-js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const COLORS = { PLAN: '#8a8a8a', ARENA: '#ffd166', BUILD: '#7ee787' };
const DIR = path.join(os.homedir(), '.local', 'state', 'opencode', 'bazer-flow', 'v2');

function badgePath(sessionID) {
  const safe = String(sessionID || '').replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(DIR, 'badge-' + safe + '.txt');
}

function readBadge(sessionID) {
  if (!sessionID) return '';
  try {
    return fs.readFileSync(badgePath(sessionID), 'utf8').trim().slice(0, 12);
  } catch {
    return '';
  }
}

function colorOf(badge) {
  for (const key of Object.keys(COLORS)) if (badge.includes(key)) return COLORS[key];
  return COLORS.PLAN;
}

function PhaseBadge(props) {
  const [phase, setPhase] = createSignal('');
  const tick = () => setPhase(readBadge(props.sessionID));
  const timer = setInterval(tick, 800);
  tick();
  onCleanup(() => clearInterval(timer));
  const label = () => (phase() ? ' ' + phase() : '');
  return <text fg={colorOf(phase())}>{label()}</text>;
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
