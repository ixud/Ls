#!/usr/bin/env node
/**
 * verify.mjs — one command that proves the tui-settings folder and its wiring.
 *
 *   node tui-settings/tools/verify.mjs
 *
 * Runs, in order:
 *   1. node --check on every module (this folder + console.mjs)
 *   2. the inline renderer in console.html is in sync with client/renderer.mjs
 *   3. the tui keybind allowlist is in sync with tui.schema.json (skipped, with a
 *      note, when the 1.15 MB schema is not provided)
 *   4. tests/run.mjs  (unit + integration)
 *   5. tests/e2e.mjs  (over real HTTP, against the copied console.mjs)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.resolve(ROOT, '..');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.cache') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.mjs')) out.push(full);
  }
  return out;
}
const run = (label, cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
  const ok = r.status === 0;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : '  (exit ' + r.status + ')'}`);
  if (!ok) console.log(((r.stdout || '') + (r.stderr || '')).split('\n').slice(-12).map(l => '       ' + l).join('\n'));
  return ok;
};

let failures = 0;

console.log('\n1. syntax — node --check');
const mods = [...walk(ROOT), path.join(APP, 'console.mjs')];
let ok = 0;
for (const f of mods) if (spawnSync(process.execPath, ['--check', f], { stdio: 'pipe' }).status === 0) ok++;
else { failures++; console.log('  FAIL ' + path.relative(APP, f)); }
console.log(`  ${ok}/${mods.length} modules parse`);

console.log('\n2. console.html inline renderer');
if (!run('renderer in sync with client/renderer.mjs', process.execPath, ['tools/build-client.mjs', '--check'])) failures++;

console.log('\n3. tui keybind allowlist');
const schemaCandidates = [path.join(ROOT, 'schema', 'tui.schema.json'), path.join(process.env.TEMP || '', 'bazer', 'cli-settings-tab', 'grounding', 'tui.schema.json')];
const found = schemaCandidates.find(p => p && fs.existsSync(p));
if (found) { if (!run('allowlist in sync with tui.schema.json', process.execPath, ['tools/gen-model.mjs', '--check', '--tui-schema=' + found])) failures++; }
else console.log('  note allowlist check skipped (tui.schema.json not provided) — schema/tui-keybind-names.json is committed');

console.log('\n4. unit + integration');
if (!run('tests/run.mjs', process.execPath, ['tests/run.mjs'])) failures++;

console.log('\n5. end-to-end over HTTP');
if (!run('tests/e2e.mjs', process.execPath, ['tests/e2e.mjs'])) failures++;

console.log('\n' + '-'.repeat(60));
console.log(failures ? `${failures} step(s) failed` : 'everything verified');
process.exit(failures ? 1 : 0);
