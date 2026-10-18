#!/usr/bin/env node
/**
 * e2e.mjs — end-to-end proof over real HTTP, against the REAL console.mjs.
 *
 * Copies the app into a sandbox, points USERPROFILE at it so the live
 * ~/.config/opencode is never touched, starts console.mjs there, and drives the
 * tui-settings actions the way the browser does:
 *
 *   - POST tui-form   -> 19 groups, 242 keybinds
 *   - POST tui-save   -> cli.json gets the dotted keybind FLAT, tui.json gets the
 *                        translated name, and tui-only keys survive (deep merge)
 *   - POST tui-save with a bad value -> BOTH files byte-identical afterwards
 *   - mirror writes 0 keybind names outside the tui.schema.json allowlist
 *
 * Usage: node tests/e2e.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.resolve(ROOT, '..');           // the CONSOLE folder
const SANDBOX = path.join(os.tmpdir(), 'bazer-tui-e2e-' + crypto.randomBytes(3).toString('hex'));
const PORT = 4300 + (process.pid % 200);
const ALLOW = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'schema', 'tui-keybind-names.json'), 'utf8')).names);

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) { console.log('  ok   ' + name); return true; }
  failures++;
  console.log('  FAIL ' + name + (detail ? '\n       ' + detail : ''));
  return false;
}
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const cliFile = () => path.join(SANDBOX, 'home', '.config', 'opencode', 'cli.json');
const tuiFile = () => path.join(SANDBOX, 'home', '.config', 'opencode', 'tui.json');

function copyApp() {
  fs.rmSync(SANDBOX, { recursive: true, force: true });
  fs.mkdirSync(SANDBOX, { recursive: true });
  for (const f of ['console.mjs', 'console.html', 'mode-lock.mjs']) fs.copyFileSync(path.join(APP, f), path.join(SANDBOX, f));
  fs.cpSync(path.join(APP, 'tui-settings'), path.join(SANDBOX, 'tui-settings'), { recursive: true });
  const cfg = path.join(SANDBOX, 'home', '.config', 'opencode');
  fs.mkdirSync(cfg, { recursive: true });
  /* a config with a hand-written cli key and two tui-only keys that must survive */
  fs.writeFileSync(cliFile(), JSON.stringify({ $schema: 'https://opencode.ai/v2/cli.json', theme: { name: 'tokyonight', mode: 'dark' }, keybinds: { leader: 'ctrl+x', 'app.exit': 'ctrl+c' }, mouse: true, 'hand.written.key': { keep: 'me' } }, null, 2) + '\n');
  fs.writeFileSync(tuiFile(), JSON.stringify({ $schema: 'https://opencode.ai/tui.json', theme: 'tokyonight', attention: { enabled: true, volume: 0.4 }, prompt: { max_height: 12 }, mouse: true }, null, 2) + '\n');
}

function waitFor(url, ms = 15000) {
  const deadline = Date.now() + ms;
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try { const r = await fetch(url); if (r.ok) return resolve(true); } catch { /* not up */ }
      if (Date.now() > deadline) return reject(new Error('server did not start: ' + url));
      setTimeout(tick, 250);
    };
    tick();
  });
}

const run = async () => {
  copyApp();
  const child = spawn(process.execPath, ['console.mjs', '--port=' + PORT], {
    cwd: SANDBOX,
    env: { ...process.env, USERPROFILE: path.join(SANDBOX, 'home'), HOME: path.join(SANDBOX, 'home') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', d => { out += d.toString(); });
  child.stderr.on('data', d => { out += d.toString(); });

  try {
    await waitFor(`http://127.0.0.1:${PORT}/`);
    const token = /t=([0-9a-f]{32})/.exec(out)?.[1];
    if (!token) throw new Error('could not read token:\n' + out);
    const api = async (p, body) => {
      const r = await fetch(`http://127.0.0.1:${PORT}${p}`, {
        method: body ? 'POST' : 'GET',
        headers: { 'x-oc-token': token, ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!r.ok) throw new Error(p + ' -> HTTP ' + r.status);
      return r.json();
    };
    const act = (id, params = {}) => api('/api/action', { id, ...params });

    console.log('\nstate');
    const state = await api('/api/state');
    check('gatherState carries s.tui', !!state.tui, JSON.stringify(state.tui));
    check('s.tui.stats: 19 groups', state.tui?.stats?.groups === 19, JSON.stringify(state.tui?.stats));

    console.log('\nform model');
    const form = await act('tui-form');
    check('19 groups', form.model.stats.groupCount === 19, 'got ' + form.model.stats.groupCount);
    check('242 keybinds', form.model.stats.keybindCount === 242, 'got ' + form.model.stats.keybindCount);
    check('hand-written cli key reported, not hidden', (form.unknownPaths || []).includes('hand.written.key'), JSON.stringify(form.unknownPaths));

    console.log('\nsave a keybind + a scalar -> cli.json and tui.json');
    const saved = await act('tui-save', {
      patches: [
        { path: 'keybinds/app.exit', op: 'set', value: 'ctrl+alt+q' },
        { path: 'diffs/wrap', op: 'set', value: 'none' },
      ],
    });
    check('save ok', saved.ok === true, saved.message);

    const cli = JSON.parse(fs.readFileSync(cliFile(), 'utf8'));
    check('keybind stored FLAT as keybinds["app.exit"]', cli.keybinds['app.exit'] === 'ctrl+alt+q', JSON.stringify(cli.keybinds));
    check('NOT nested as keybinds.app.exit', cli.keybinds.app === undefined, JSON.stringify(cli.keybinds));
    check('scalar landed in its group', cli.diffs?.wrap === 'none', JSON.stringify(cli.diffs));
    check('hand-written cli key survived', cli['hand.written.key'] !== undefined);

    const tui = JSON.parse(fs.readFileSync(tuiFile(), 'utf8'));
    check('tui.json got the translated name app_exit', tui.keybinds?.app_exit === 'ctrl+alt+q', JSON.stringify(tui.keybinds));
    check('tui-only attention.enabled survived', tui.attention?.enabled === true, JSON.stringify(tui.attention));
    check('tui-only prompt.max_height survived', tui.prompt?.max_height === 12, JSON.stringify(tui.prompt));
    const illegal = Object.keys(tui.keybinds || {}).filter(n => !ALLOW.has(n));
    check('mirror wrote 0 keybind names outside the allowlist', illegal.length === 0, illegal.join(', '));

    console.log('\ninvalid patch must leave files byte-identical');
    const cliH = hash(cliFile()), tuiH = hash(tuiFile());
    const bad = await act('tui-save', { patches: [{ path: 'theme/mode', op: 'set', value: 'neon' }] });
    check('out-of-enum value refused', bad.ok === false, bad.message);
    check('and the message names the field', /theme\/mode/.test(bad.message), bad.message.split('\n')[0]);
    check('cli.json byte-identical', hash(cliFile()) === cliH);
    check('tui.json byte-identical', hash(tuiFile()) === tuiH);

    console.log('\nverify');
    const v = await api('/api/verify');
    check('runVerify includes TUI items', v.items.some(i => /^TUI · /.test(i.label)), JSON.stringify(v.items.map(i => i.label)));
    check('no TUI item fails', !v.items.some(i => /^TUI · /.test(i.label) && i.level === 'fail'), JSON.stringify(v.items.filter(i => i.level === 'fail')));
  } finally {
    child.kill();
    await new Promise(r => setTimeout(r, 300));
    fs.rmSync(SANDBOX, { recursive: true, force: true });
  }

  console.log('\n' + '-'.repeat(60));
  console.log(failures ? failures + ' check(s) failed' : 'all end-to-end checks passed');
  process.exit(failures ? 1 : 0);
};

run().catch(e => { console.error('e2e failed: ' + e.message); process.exit(2); });
