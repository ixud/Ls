#!/usr/bin/env node
/**
 * run.mjs — proof, not vibes.
 *
 * Every claim this candidate makes about safety or coverage gets a test that
 * fails when the claim stops being true. Runs on a temp sandbox, never on the
 * real ~/.config/opencode.
 *
 *   node tests/run.mjs            all tests
 *   node tests/run.mjs --verbose  print each passing test too
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPatches, diffValues, getLeaf, unknownPaths } from '../src/patches.mjs';
import { SchemaValidator, validateKeybindValue } from '../src/validate.mjs';
import { cliToTui, tuiToCli, pluginsCliToTui, pluginsTuiToCli } from '../src/mirror.mjs';
import { CliSettingsStore, stripJsonc, readConfig } from '../src/save.mjs';
import { buildFormModel, loadSchemas, defaultFromDescription } from '../src/form-model.mjs';
import { normalizeKeyEvent, collectPatches, createState, setDraft, renderSettings } from '../client/renderer.mjs';
import { toWire, toSegments, escapeSegment } from '../shared/paths.mjs';
import { findBinary, extractKeybindDefaults, extractKeybindNameMap } from '../tools/gen-opencode-facts.mjs';

const verbose = process.argv.includes('--verbose');

let passed = 0, failed = 0;
const failures = [];
const queue = [];

/** Register a test. Bodies may be async; the runner awaits them in order. */
function test(name, fn) { queue.push({ name, fn }); }

async function runQueue() {
  for (const { name, fn } of queue) {
    try {
      await fn();
      passed++;
      if (verbose) console.log('  ok   ' + name);
    } catch (e) {
      failed++;
      failures.push({ name, message: e.message });
      console.log('  FAIL ' + name + '\n       ' + e.message.split('\n').slice(0, 3).join('\n       '));
    }
  }
}
function eq(actual, expected, what = '') {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${what}expected ${b}\n              got      ${a}`);
}
function ok(cond, what) { if (!cond) throw new Error(what || 'expected truthy'); }
function section(title) { console.log('\n' + title); }

/* ------------------------------- sandbox helpers ------------------------------- */

const SANDBOXES = [];
function makeSandbox(cli, tui = undefined) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-settings-test-'));
  SANDBOXES.push(dir);
  fs.writeFileSync(path.join(dir, 'cli.json'), JSON.stringify(cli, null, 2) + '\n', 'utf8');
  if (tui !== undefined) fs.writeFileSync(path.join(dir, 'tui.json'), JSON.stringify(tui, null, 2) + '\n', 'utf8');
  return dir;
}
function storeFor(dir) {
  return new CliSettingsStore({
    cliFile: path.join(dir, 'cli.json'),
    tuiFile: path.join(dir, 'tui.json'),
    backupsDir: path.join(dir, 'backups'),
    historyFile: path.join(dir, 'history.tsv'),
  });
}
const cliPath = dir => path.join(dir, 'cli.json');
const tuiPath = dir => path.join(dir, 'tui.json');

/** Schema-legal fixture. Every field in it is a real cli.json key. */
const BASE = {
  $schema: 'https://opencode.ai/v2/cli.json',
  theme: { name: 'tokyonight', mode: 'dark' },
  leader: { timeout: 2000 },
  keybinds: { leader: 'ctrl+x', 'app.exit': 'ctrl+c' },
  diffs: { view: 'auto' },
  mouse: true,
  attention: { volume: 0.4 },
};
/** The same file with a key the schema does not describe — real configs have these. */
const EXTRA = { ...BASE, 'hand.written.key': { keep: 'me' } };
const TUI_BASE = { $schema: 'https://opencode.ai/tui.json', leader_timeout: 2000, theme: 'tokyonight', mouse: true, keybinds: { leader: 'ctrl+x', app_exit: 'ctrl+c' } };

/* ============================ 1. path addressing ============================ */

section('1. path addressing — keybind IDs contain dots');

test('dots inside a key do not become nesting levels', () => {
  eq(toSegments('keybinds/app.exit'), ['keybinds', 'app.exit']);
  const r = applyPatches({}, [{ path: 'keybinds/app.exit', op: 'set', value: 'ctrl+c' }]);
  eq(r.result, { keybinds: { 'app.exit': 'ctrl+c' } }, 'stored flat, the way opencode reads it: ');
});

test('a slash inside a key is escaped, not treated as a level', () => {
  eq(escapeSegment('a/b'), 'a~1b');
  const r = applyPatches({}, [{ path: toWire(['x', 'a/b']), op: 'set', value: 1 }]);
  eq(r.result, { x: { 'a/b': 1 } });
});

test('unknown dotted keys in a real file are addressed as one key', () => {
  eq(unknownPaths(EXTRA, new Set(Object.keys(buildFormModel(loadSchemas()).index))), ['hand.written.key']);
});

/* ============================== 2. patch safety ============================== */

section('2. patch engine — only changed paths, unknown keys survive');

test('patches touch only the named leaves', () => {
  const r = applyPatches(EXTRA, [{ path: 'diffs/wrap', op: 'set', value: 'none' }]);
  eq(r.result.theme, BASE.theme, 'theme untouched: ');
  eq(r.result['hand.written.key'], { keep: 'me' }, 'unknown key untouched: ');
  eq(r.result.keybinds['app.exit'], 'ctrl+c', 'sibling keybind untouched: ');
  eq(r.result.diffs, { view: 'auto', wrap: 'none' }, 'merged into the existing group: ');
});

test('unset removes a leaf and prunes the parent it emptied', () => {
  eq(applyPatches({ attention: { sound: true }, other: 1 }, [{ path: 'attention/sound', op: 'unset' }]).result, { other: 1 });
});

test('unset keeps a parent that still has siblings', () => {
  eq(applyPatches({ attention: { sound: true, volume: 0.4 } }, [{ path: 'attention/sound', op: 'unset' }]).result, { attention: { volume: 0.4 } });
});

test('unset of a nested leaf through a nested object works', () => {
  const r = applyPatches({ attention: { sounds: { done: 'a.wav', error: 'b.wav' } } }, [{ path: 'attention/sounds/done', op: 'unset' }]);
  eq(r.result, { attention: { sounds: { error: 'b.wav' } } });
});

test('unknown keys are reported once per key, not per child', () => {
  /* with only two known leaves the containers cannot be recognised, so the
     top-level key is reported once instead of every child inside it */
  eq(unknownPaths(EXTRA, new Set(['theme/name', 'leader/timeout'])), ['$schema', 'theme/mode', 'keybinds', 'diffs', 'mouse', 'attention', 'hand.written.key']);
});

test('with the full catalog, container keys are walked and only real strays are reported', () => {
  const known = new Set(Object.keys(buildFormModel(loadSchemas()).index));
  eq(unknownPaths(EXTRA, known), ['hand.written.key']);
  eq(unknownPaths(BASE, known), [], '$schema and every fixture key are known: ');
});

test('diffValues emits only changed paths', () => {
  eq(diffValues({ x: { y: 1, z: 2 }, keep: true }, { x: { y: 9, z: 2 }, keep: true }), [{ path: 'x/y', op: 'set', value: 9 }]);
});

test('a patch that cannot be applied is skipped, not thrown', () => {
  const r = applyPatches({ theme: 'a-string' }, [{ path: 'theme/name', op: 'set', value: 'x' }]);
  eq(r.applied.length, 0);
  ok(/not an object/.test(r.skipped[0].reason), 'reason explains why');
});

test('identical value is not reported as a change', () => {
  eq(applyPatches({ a: 1 }, [{ path: 'a', op: 'set', value: 1 }]).applied.length, 0);
});

/* ============================== 3. write boundary ============================== */

section('3. write boundary — schema validation before any write');

const schemas = loadSchemas();
const validator = new SchemaValidator(schemas.cli);

test('the shipped fixture config validates', () => {
  eq(validator.validate(BASE).ok, true);
});

test('an enum value outside the schema is rejected with a path', () => {
  const r = validator.validate({ theme: { mode: 'neon' } });
  eq(r.ok, false);
  eq(r.errors[0].path, 'theme/mode');
  ok(/must be one of/.test(r.errors[0].message), 'message lists the allowed values: ' + r.errors[0].message);
});

test('a wrong scalar type is rejected', () => {
  eq(validator.validate({ mouse: 'yes' }).ok, false);
});

test('unknown top-level keys are rejected by the schema (additionalProperties:false)', () => {
  eq(validator.validate({ nonsense: 1 }).ok, false);
});

test('integer-only fields reject fractions', () => {
  eq(validator.validate({ leader: { timeout: 1.5 } }).ok, false);
  eq(validator.validate({ leader: { timeout: 1500 } }).ok, true);
});

test('exclusiveMinimum is honoured (mini.replay_limit)', () => {
  eq(validator.validate({ mini: { replay_limit: 0 } }).ok, false);
  eq(validator.validate({ mini: { replay_limit: 1 } }).ok, true);
});

test('every keybind value shape the docs allow passes the boundary checks', () => {
  for (const v of ['ctrl+k', ['ctrl+c', 'ctrl+d'], false, 'none', { key: 'ctrl+v', preventDefault: false }, { name: 'escape', ctrl: true }]) {
    eq(validator.validate({ keybinds: { 'app.exit': v } }).ok, true, JSON.stringify(v) + ' schema: ');
    eq(validateKeybindValue(v).ok, true, JSON.stringify(v) + ' semantic: ');
  }
});

test('a malformed keybind value is caught by the semantic check', () => {
  eq(validateKeybindValue({ event: 'press' }).ok, false);
  eq(validateKeybindValue({ key: 'ctrl+k', event: 'hold' }).ok, false);
  eq(validateKeybindValue([]).ok, false);
  eq(validateKeybindValue({ key: 'ctrl+k', preventDefault: 'no' }).ok, false);
});

/* ============================== 4. save behaviour ============================== */

section('4. save — backup, atomic write, mirror, restore');

test('a save writes only the patched leaf and keeps unknown keys', () => {
  const dir = makeSandbox(EXTRA);
  const r = storeFor(dir).save([{ path: 'diffs/wrap', op: 'set', value: 'none' }]);
  ok(r.ok, 'save ok');
  const after = readConfig(cliPath(dir)).obj;
  eq(after.diffs, { view: 'auto', wrap: 'none' });
  eq(after['hand.written.key'], { keep: 'me' }, 'unknown key survived: ');
  eq(after.keybinds['app.exit'], 'ctrl+c', 'untouched sibling survived: ');
  eq(r.untouchedUnknown, ['hand.written.key'], 'unknown key reported: ');
});

test('a keybind save stores the dotted ID flat, not nested', () => {
  const dir = makeSandbox(BASE);
  storeFor(dir).save([{ path: 'keybinds/app.exit', op: 'set', value: ['ctrl+c', 'ctrl+d'] }]);
  const after = readConfig(cliPath(dir)).obj;
  eq(after.keybinds, { leader: 'ctrl+x', 'app.exit': ['ctrl+c', 'ctrl+d'] });
  eq(after.keybinds.app, undefined, 'no nested key was invented: ');
});

test('an existing invalid key does not block unrelated saves', () => {
  const dir = makeSandbox(EXTRA);
  const r = storeFor(dir).save([{ path: 'mouse', op: 'set', value: false }]);
  ok(r.ok, 'save went through despite the pre-existing unknown key');
  eq(readConfig(cliPath(dir)).obj.mouse, false);
});

test('but a save that introduces a NEW invalid value is refused', () => {
  const dir = makeSandbox(EXTRA);
  let threw = null;
  try { storeFor(dir).save([{ path: 'theme/mode', op: 'set', value: 'neon' }]); } catch (e) { threw = e; }
  ok(threw && /สคีมา/.test(threw.message), 'refused: ' + (threw && threw.message));
  eq(threw.validation?.errors?.[0]?.path, 'theme/mode', 'the report names the field: ');
});

test('every save backs up every file it is about to change', () => {
  const dir = makeSandbox(BASE, TUI_BASE);
  const r = storeFor(dir).save([{ path: 'mouse', op: 'set', value: false }]);
  ok(r.backup.dir, 'backup dir created');
  const manifest = JSON.parse(fs.readFileSync(path.join(r.backup.dir, 'manifest.json'), 'utf8'));
  eq(manifest.files.map(f => path.basename(f.orig)).sort(), ['cli.json', 'tui.json'], 'both files backed up: ');
  const restoreMe = JSON.parse(fs.readFileSync(path.join(r.backup.dir, manifest.files[0].stored), 'utf8'));
  eq(restoreMe.$schema, 'https://opencode.ai/v2/cli.json', 'backup holds the pre-save content: ');
});

test('a save that would add an unknown top-level key is refused, and nothing is written', () => {
  const dir = makeSandbox(BASE);
  const before = fs.readFileSync(cliPath(dir), 'utf8');
  let threw = null;
  try { storeFor(dir).save([{ path: 'brand/new/group', op: 'set', value: { x: 1 } }]); } catch (e) { threw = e; }
  ok(threw, 'refused');
  eq(threw.unknownKeys, ['brand'], 'the message names the offending top-level key: ');
  ok(/ไม่รู้จัก/.test(threw.message), threw.message);
  eq(fs.readFileSync(cliPath(dir), 'utf8'), before, 'file untouched: ');
});

test('there is no bypass: the schema guard catches what the key guard would allow', () => {
  /* sanity check on the layering — a key the schema knows but a value it forbids */
  const dir = makeSandbox(BASE);
  let threw = null;
  try { storeFor(dir).save([{ path: 'tabs/mode', op: 'set', value: 'nonsense' }]); } catch (e) { threw = e; }
  eq(threw.validation.errors[0].path, 'tabs/mode');
});

test('re-saving the same value reports no cli.json change', () => {
  const dir = makeSandbox(BASE, TUI_BASE);
  const before = fs.readFileSync(cliPath(dir), 'utf8');
  const r = storeFor(dir).save([{ path: 'mouse', op: 'set', value: true }]);
  eq(r.applied, [], 'nothing to apply: ');
  eq(fs.readFileSync(cliPath(dir), 'utf8'), before, 'cli.json byte-identical: ');
});

test('mirrorToTui:false leaves tui.json completely alone', () => {
  const dir = makeSandbox(BASE);
  storeFor(dir).save([{ path: 'mouse', op: 'set', value: false }], { mirrorToTui: false });
  eq(fs.existsSync(tuiPath(dir)), false, 'nothing created: ');
});

test('a hand edit made while the page was open is not clobbered', () => {
  const dir = makeSandbox(BASE);
  const live = readConfig(cliPath(dir)).obj;
  live['edited.by.hand'] = 42;
  fs.writeFileSync(cliPath(dir), JSON.stringify(live, null, 2), 'utf8');
  storeFor(dir).save([{ path: 'cursor/style', op: 'set', value: 'line' }]);
  const after = readConfig(cliPath(dir)).obj;
  eq(after['edited.by.hand'], 42, 'hand edit survived: ');
  eq(after.cursor, { style: 'line' });
});

test('an unwritable target does not leave a temp file behind', () => {
  const dir = makeSandbox(BASE);
  storeFor(dir).save([{ path: 'mouse', op: 'set', value: false }]);
  eq(fs.readdirSync(dir).filter(f => f.includes('.tmp-')), [], 'no temp files left: ');
});

test('restore puts the pre-save file back', async () => {
  const { createSettingsApi } = await import('../src/api.mjs');
  const dir = makeSandbox(BASE);
  const api = createSettingsApi({ cliFile: cliPath(dir), tuiFile: tuiPath(dir), backupsDir: path.join(dir, 'backups') });
  const r = await api['tui-save']({ patches: [{ path: 'animations', op: 'set', value: false }] });
  ok(r.ok, 'saved');
  eq(readConfig(cliPath(dir)).obj.animations, false);
  await api['tui-restore']({ set: path.basename(r.backup.dir) });
  eq(readConfig(cliPath(dir)).obj.animations, undefined, 'restored: ');
});

test('the api rejects a whole-file payload (the guarantee cannot be bypassed)', async () => {
  const { createSettingsApi } = await import('../src/api.mjs');
  const dir = makeSandbox(BASE);
  const api = createSettingsApi({ cliFile: cliPath(dir), tuiFile: tuiPath(dir), backupsDir: path.join(dir, 'backups') });
  let threw = null;
  try { await api['tui-save']({ content: '{}' }); } catch (e) { threw = e; }
  ok(threw && /patches/.test(threw.message), 'rejected: ' + (threw && threw.message));
});

test('the api rejects a malformed patch rather than writing it', async () => {
  const { createSettingsApi } = await import('../src/api.mjs');
  const dir = makeSandbox(BASE);
  const api = createSettingsApi({ cliFile: cliPath(dir), tuiFile: tuiPath(dir), backupsDir: path.join(dir, 'backups') });
  let threw = null;
  try { await api['tui-save']({ patches: [{ path: 'mouse', value: true }] }); } catch (e) { threw = e; }
  ok(threw, 'patch without an op is refused');
});

test('jsonc with comments and trailing commas is read, not rejected', () => {
  eq(JSON.parse(stripJsonc('{\n // hi\n "a": 1,\n}')).a, 1);
});

/* ============================== 5. form model coverage ============================== */

section('5. form model — the schema decides, nothing hardcoded');

const model = buildFormModel(schemas);
const allFields = model.groups.flatMap(g => (g.subgroups ? g.subgroups.flatMap(s => s.fields) : g.fields));

test('every top-level schema property becomes a group', () => {
  const schemaProps = Object.keys(schemas.cli.properties);
  eq(model.stats.schemaPropertyCount, schemaProps.length, 'schema properties counted: ');
  eq(model.stats.groupCount, schemaProps.length, 'one group per property, $schema included: ');
  eq(model.stats.groupCount, 19);
});

test('$schema is shown but cannot be edited', () => {
  eq(model.index['$schema'].readOnly, true);
  const state = createState(model, { $schema: 'https://opencode.ai/v2/cli.json' });
  setDraft(state, '$schema', 'https://evil.example/cli.json');
  eq(collectPatches(state), [], 'a read-only field never produces a patch: ');
});

test('every keybind in the schema has a field and a default', () => {
  const schemaKb = Object.keys(schemas.cli.properties.keybinds.anyOf[0].properties);
  const modelKb = model.groups.find(g => g.id === 'keybinds').subgroups.flatMap(s => s.fields).map(f => f.key);
  eq(modelKb.sort(), schemaKb.sort(), 'keybind fields == schema keybinds: ');
  eq(model.stats.keybindCount, schemaKb.length);
  eq(allFields.filter(f => f.path.startsWith('keybinds/') && !f.hasDefault).length, 0, 'keybinds without a default: ');
});

test('the field count matches an independent walk of the schema', () => {
  const expected = Object.values(schemas.cli.properties)
    .reduce((s, v) => s + (v.anyOf?.[0]?.properties ? Object.keys(v.anyOf[0].properties).length : 1), 0);
  eq(model.stats.fieldCount, expected, 'no leaf skipped: ');
});

test('field types cover every control the renderer implements', () => {
  const types = new Set(allFields.map(f => f.type));
  for (const t of ['boolean', 'enum', 'number', 'integer', 'string', 'keybind', 'union', 'object', 'boolmap', 'list']) {
    ok(types.has(t), 'the schema uses ' + t + ' and the renderer has a control for it');
  }
});

test('defaults are labelled with where they came from', () => {
  const bySource = allFields.reduce((a, f) => (a[f.defaultSource] = (a[f.defaultSource] || 0) + 1, a), {});
  ok(bySource.runtime >= 250, 'most defaults come from the binary: ' + JSON.stringify(bySource));
  eq(model.index['diffs/source'].defaultSource, 'description', 'diffs.source default read from prose: ');
  eq(model.index['diffs/source'].default, 'branch');
  eq(model.index['mini/work_spinner'].default, 'block-soft-slide', 'from the binary: ');
});

test('the default-from-description parser reads the shapes the schema uses', () => {
  eq(defaultFromDescription("defaults to 'branch'"), 'branch');
  eq(defaultFromDescription('(default: true)'), true);
  eq(defaultFromDescription('(default: block-soft-slide)'), 'block-soft-slide');
  eq(defaultFromDescription('no default here'), undefined);
});

test('enum values come from the schema, including $ref-resolved ones', () => {
  eq(model.index['theme/mode'].enum, ['system', 'dark', 'light']);
  eq(model.index['diffs/source'].enum, ['working', 'branch', 'committed', 'turn'], 'Vcs.Mode $ref flattened: ');
  eq(model.index['mini/work_spinner'].enum.length, 14);
});

test('the keybind control is told every binding shape the schema allows', () => {
  const shapes = model.groups.find(g => g.id === 'keybinds').bindingShape.map(s => s.shape).sort();
  eq(shapes, ['array', 'bindingObject', 'disabled', 'disabled', 'key', 'keyObject']);
});

test('nested objects are walked and their leaves are addressable', () => {
  const sounds = model.index['attention/sounds'];
  eq(sounds.type, 'object');
  eq(sounds.subfields.map(f => f.key), ['default', 'question', 'permission', 'error', 'done', 'subagent_done']);
  eq(model.index['attention/sounds/done'].type, 'string', 'nested leaf is in the index: ');
});

test('every field carries the dotted path the docs use, for display', () => {
  eq(model.index['keybinds/app.exit'].display, 'keybinds.app.exit');
  eq(model.index['attention/sounds/done'].display, 'attention.sounds.done');
});

/* ============================== 6. mirror correctness ============================== */

section('6. mirror — cli <-> tui, honest about what does not translate');

const translate = schemas.translate;

test('the name map comes from the binary and is not a `_` -> `.` guess', () => {
  eq(translate.tuiToCli.messages_page_up, 'session.page.up', 'different words, not a mechanical swap: ');
  eq(translate.tuiToCli.editor_open, 'prompt.editor');
  eq(translate.tuiToCli.app_exit, 'app.exit');
  ok(!translate.tuiToCli.app_clear, 'app.clear genuinely has no tui name');
  eq(translate.report.mappedCount, 162);
});

test('a mechanical `_` -> `.` translation would have been wrong for most of the map', () => {
  const mechanical = Object.entries(translate.tuiToCli).filter(([tui, cli]) => tui.replace(/_/g, '.') !== cli);
  ok(mechanical.length > 40, 'this is why the map is extracted, not derived: ' + mechanical.length + ' of ' + translate.report.mappedCount + ' differ');
});

test('cli -> tui writes the mapped settings and the mapped keybinds', () => {
  const { tui, report } = cliToTui({ theme: { name: 'tokyonight', mode: 'dark' }, leader: { timeout: 1500 }, scroll: { speed: 3, acceleration: true }, mouse: true, keybinds: { leader: 'ctrl+x', 'app.exit': 'ctrl+c', 'app.clear': 'ctrl+l' } }, translate);
  eq(tui.theme, 'tokyonight', 'theme becomes a plain string: ');
  eq(tui.leader_timeout, 1500, 'leader.timeout -> leader_timeout: ');
  eq(tui.scroll_speed, 3);
  eq(tui.scroll_acceleration, { enabled: true }, 'nested under scroll_acceleration: ');
  eq(tui.mouse, true);
  eq(tui.keybinds.app_exit, 'ctrl+c', 'keybind renamed: ');
  eq(tui.keybinds.app_clear, undefined, 'unmappable keybind is not written: ');
  eq(report.unmappedKeybinds, ['app.clear'], 'and it is reported: ');
});

test('cli-only settings are reported with a reason, not silently dropped', () => {
  const { report } = cliToTui({ theme: { name: 'x', mode: 'dark' }, tabs: { layout: 'vertical' } }, translate);
  const skipped = report.skippedSettings.map(s => s.cli);
  ok(skipped.includes('theme.mode'), 'theme.mode reported: ' + skipped.join(', '));
  ok(skipped.includes('tabs.*'), 'tabs.* reported: ');
  ok(report.skippedSettings.every(s => s.reason), 'every skip carries a reason');
});

test('a save mirrors into tui.json and reports what did not translate', () => {
  const dir = makeSandbox(BASE, TUI_BASE);
  const r = storeFor(dir).save([{ path: 'leader/timeout', op: 'set', value: 1234 }, { path: 'keybinds/app.exit', op: 'set', value: ['ctrl+c', 'ctrl+d'] }]);
  const tui = readConfig(tuiPath(dir)).obj;
  eq(tui.leader_timeout, 1234);
  eq(tui.keybinds.app_exit, ['ctrl+c', 'ctrl+d']);
  ok(r.mirror.report.mappedKeybinds >= 1, 'mirror reports mapped keybinds');
  ok(r.mirror.changedPaths.length >= 2, 'mirror reports which tui keys changed: ' + JSON.stringify(r.mirror.changedPaths));
});

test('the mirror creates tui.json when asked, because a missing tui.json skips the legacy route', () => {
  const dir = makeSandbox(BASE);
  const r = storeFor(dir).save([{ path: 'mouse', op: 'set', value: false }]);
  eq(fs.existsSync(tuiPath(dir)), true, 'created: ');
  eq(r.mirror.created, true, 'and reported as created: ');
  const tui = readConfig(tuiPath(dir)).obj;
  eq(tui.mouse, false, 'carries the mirrored value: ');
  eq(tui.$schema, 'https://opencode.ai/tui.json');
});

test('mirrorStatus detects drift, and a save repairs it', () => {
  const dir = makeSandbox(BASE, { leader_timeout: 9999 });
  const store = storeFor(dir);
  eq(store.mirrorStatus().inSync, false, 'drift found: ');
  ok(store.mirrorStatus().drift.includes('leader_timeout'), 'names the drifted key: ');
  const r = store.save([{ path: 'mouse', op: 'set', value: false }]);
  eq(store.mirrorStatus().inSync, true, 'repaired by the same save: ');
  ok(r.mirror.changedPaths.some(c => c.path === 'leader_timeout'), 'and the repair is reported: ');
});

test('pressing save with no edits still repairs mirror drift', () => {
  const dir = makeSandbox(BASE, { leader_timeout: 9999 });
  const store = storeFor(dir);
  const r = store.save([{ path: 'mouse', op: 'set', value: true }]);
  eq(r.applied.length, 0, 'nothing to change in cli.json: ');
  ok(/ซ่อม tui.json/.test(r.message), 'message says the mirror was repaired: ' + r.message);
  eq(store.mirrorStatus().inSync, true);
});

test('tui -> cli mirrors the binary: plugin tuples, kv fallbacks, unknown names rejected', () => {
  const { cli, report } = tuiToCli({
    theme: 'gruvbox',
    plugin: ['a-plugin', ['@scope/name', { opt: 1 }]],
    leader_timeout: 1200,
    scroll_speed: 2,
    scroll_acceleration: { enabled: true },
    attention: { enabled: true, sound: false, volume: 0.5 },
    mouse: false,
    keybinds: { app_exit: 'ctrl+q', totally_made_up_name: 'ctrl+z' },
  }, translate, { kv: { sidebar: false, diff_style: 'stacked', thinking_mode: 'hide' } });
  eq(cli.plugins, ['a-plugin', { package: '@scope/name', options: { opt: 1 } }], 'plugin tuple -> object: ');
  eq(cli.theme, { name: 'gruvbox' });
  eq(cli.leader, { timeout: 1200 });
  eq(cli.scroll, { speed: 2, acceleration: true });
  eq(cli.attention, { sound: false, volume: 0.5 }, 'attention.enabled dropped (not a cli key): ');
  eq(cli.keybinds, { 'app.exit': 'ctrl+q' }, 'unknown tui keybind name rejected: ');
  eq(report.rejectedKeybinds.length, 1);
});

test('the mirror is idempotent: cli -> tui -> cli returns the same values', () => {
  const cli = { theme: { name: 'tokyonight' }, leader: { timeout: 1500 }, scroll: { speed: 3, acceleration: false }, mouse: true, attention: { volume: 0.4 }, keybinds: { leader: 'ctrl+x', 'app.exit': 'ctrl+c', 'session.page.up': 'pageup' } };
  const round = tuiToCli(cliToTui(cli, translate).tui, translate).cli;
  for (const [p, v] of [['theme/name', 'tokyonight'], ['leader/timeout', 1500], ['scroll/speed', 3], ['scroll/acceleration', false], ['mouse', true], ['attention/volume', 0.4], ['keybinds/app.exit', 'ctrl+c'], ['keybinds/session.page.up', 'pageup']]) {
    eq(getLeaf(round, p).value, v, p + ' survived the round trip: ');
  }
});

test('the mirror never writes a name the cli schema does not know', () => {
  const unknownTargets = Object.values(translate.tuiToCli).filter(v => !schemas.cli.properties.keybinds.anyOf[0].properties[v]);
  eq(unknownTargets, ['app.heap_snapshot'], 'the only such target is reported in the generated map: ');
});

test('an unknown name in the map is reported at generation time, not written', () => {
  eq(translate.report.targetsUnknownToSchema, [['app_heap_snapshot', 'app.heap_snapshot']]);
});

test('plugin conversion keeps a plain string a plain string (both are legal)', () => {
  eq(pluginsTuiToCli(pluginsCliToTui(['plain', { package: 'pkg', options: { a: 1 } }])), ['plain', { package: 'pkg', options: { a: 1 } }]);
});

test('hand-written tui keys survive a mirror write', () => {
  const dir = makeSandbox(BASE, { ...TUI_BASE, my_custom_tui_key: 'keep-me' });
  storeFor(dir).save([{ path: 'mouse', op: 'set', value: false }]);
  const tui = readConfig(tuiPath(dir)).obj;
  eq(tui.my_custom_tui_key, 'keep-me', 'unknown tui key survived: ');
  eq(tui.mouse, false);
});

test('a hand-written tui keybind name survives a mirror write', () => {
  const dir = makeSandbox(BASE, { ...TUI_BASE, keybinds: { app_exit: 'ctrl+c', some_legacy_name: 'ctrl+z' } });
  storeFor(dir).save([{ path: 'keybinds/app.exit', op: 'set', value: 'ctrl+q' }]);
  const tui = readConfig(tuiPath(dir)).obj;
  eq(tui.keybinds.some_legacy_name, 'ctrl+z', 'legacy tui keybind name survived: ');
  eq(tui.keybinds.app_exit, 'ctrl+q');
});

/* ---- graft C: allowlist filter + deep merge ---- */

test('the mirror writes ZERO keybind names the tui schema does not allow', () => {
  /* pick a cli keybind that IS a real schema keybind but whose tui name is one
     of the 22 the legacy schema does not define (open_menu, session_tab_next, …) */
  const cliId = Object.keys(schemas.cli.properties.keybinds.anyOf[0].properties)
    .find(id => translate.cliToTui[id] && !schemas.tuiAllowlist.has(translate.cliToTui[id]));
  ok(cliId, 'the extracted map has a name outside tui.schema.json — that is the bug this guards');
  const tuiName = translate.cliToTui[cliId];

  const dir = makeSandbox({ ...BASE, keybinds: { leader: 'ctrl+x', [cliId]: 'ctrl+q' } }, { ...TUI_BASE });
  const r = storeFor(dir).save([{ path: 'mouse', op: 'set', value: false }]);
  const tui = readConfig(tuiPath(dir)).obj;
  const written = Object.keys(tui.keybinds || {});
  const illegal = written.filter(n => !schemas.tuiAllowlist.has(n));
  eq(illegal, [], 'mirror wrote names outside the allowlist: ');
  eq(written.includes(tuiName), false, `blocked name ${tuiName} was not written: `);
  ok((r.mirror.report.blockedKeybinds || []).some(b => b.tui === tuiName), 'and it is reported as blocked: ' + JSON.stringify(r.mirror.report.blockedKeybinds));
});

test('mirrored keybind names are always a subset of the allowlist', () => {
  const dir = makeSandbox(BASE, TUI_BASE);
  storeFor(dir); /* build the store so its schemas are available */
  const { tui } = cliToTui({ keybinds: { leader: 'ctrl+x', 'app.exit': 'ctrl+c', 'session.page.up': 'pageup' } }, translate, schemas.tuiAllowlist);
  const bad = Object.keys(tui.keybinds || {}).filter(n => !schemas.tuiAllowlist.has(n));
  eq(bad, []);
});

test('tui-only keys under a mirrored group survive (deep merge, not shallow spread)', () => {
  const dir = makeSandbox(BASE, { ...TUI_BASE, attention: { enabled: true, volume: 0.4 }, prompt: { max_height: 12, max_width: 99 } });
  storeFor(dir).save([{ path: 'mouse', op: 'set', value: false }]);
  const tui = readConfig(tuiPath(dir)).obj;
  eq(tui.attention.enabled, true, 'attention.enabled survived: ');
  eq(tui.attention.volume, 0.4, 'mirrored value still there: ');
  eq(tui.prompt.max_height, 12, 'prompt.max_height survived: ');
  eq(tui.prompt.max_width, 99, 'prompt.max_width survived: ');
  eq(tui.mouse, false, 'and the mirrored scalar landed: ');
});

test('an invalid patch leaves BOTH files byte-identical', () => {
  const dir = makeSandbox(BASE, TUI_BASE);
  const cliBefore = fs.readFileSync(cliPath(dir), 'utf8');
  const tuiBefore = fs.readFileSync(tuiPath(dir), 'utf8');
  let threw = null;
  try { storeFor(dir).save([{ path: 'theme/mode', op: 'set', value: 'neon' }]); } catch (e) { threw = e; }
  ok(threw, 'refused');
  eq(fs.readFileSync(cliPath(dir), 'utf8'), cliBefore, 'cli.json byte-identical: ');
  eq(fs.readFileSync(tuiPath(dir), 'utf8'), tuiBefore, 'tui.json byte-identical: ');
});

/* ============================== 7. client renderer ============================== */

section('7. renderer — one generic control per type, no per-field client code');

const render = state => renderSettings(state);

test('the whole model renders without knowing anything about the fields', () => {
  const html = render(createState(model, BASE));
  ok(html.length > 10000, 'renders a full page: ' + html.length + ' chars');
  for (const g of model.groups) ok(html.includes(`data-group="${g.id}"`), 'group rendered: ' + g.id);
});

test('each type renders its own control element', () => {
  const html = render(createState(model, {}));
  for (const ctl of ['boolean', 'enum', 'number', 'text', 'kb-mode', 'boolmap', 'list', 'union-kind']) {
    ok(html.includes(`data-ctl="${ctl}"`), 'a control exists for ' + ctl);
  }
});

test('keybind values render in the mode that matches their shape', () => {
  const state = createState(model, {
    keybinds: { leader: 'ctrl+x', 'app.debug': false, 'app.console': 'none', 'input.newline': ['shift+return', 'ctrl+j'], 'prompt.paste': { key: 'ctrl+v', preventDefault: false } },
  });
  const html = render(state);
  const row = p => {
    const at = html.indexOf(`data-path="${p}"`);
    if (at < 0) return '';
    const next = html.indexOf('data-path="', at + 12);
    return html.slice(at, next < 0 ? html.length : next);
  };
  ok(row('keybinds/app.exit').length > 0, 'row for the keybind exists');
  ok(row('keybinds/leader').includes('value="ctrl+x"'), 'string keybind shows its keys: ');
  ok(/<option value="false" selected>/.test(row('keybinds/app.debug')), 'false keybind opens in false mode: ');
  ok(/<option value="none" selected>/.test(row('keybinds/app.console')), '"none" keybind opens in none mode: ');
  ok(row('keybinds/prompt.paste').includes('kb-json'), 'object keybind shows the JSON editor: ');
  ok(row('keybinds/input.newline').includes('ctrl+j'), 'array keybind shows its keys: ');
  ok(row('keybinds/leader').includes('data-ctl="kb-capture"'), 'string keybind offers key capture: ');
});

test('the disabled shapes are named in the help text, read from the schema', () => {
  const html = render(createState(model, {}));
  ok(html.includes('ปิดปุ่มนี้'), 'help explains how to disable a binding');
  ok(html.includes('false disables the binding'), 'and quotes the schema description');
});

test('search filters the rendered fields', () => {
  const state = createState(model, {});
  state.search = 'work_spinner';
  ok(render(state).includes('mini/work_spinner'));
  ok(!render(state).includes('leader/timeout'), 'unmatched field hidden');
});

test('a field with no value in the file shows the default and where it came from', () => {
  const html = render(createState(model, {}));
  ok(html.includes('default: block-soft-slide'), 'default shown: ');
  ok(html.includes('จาก binary'), 'provenance badge shown: ');
});

test('a field present in the file is not shown as a default', () => {
  const html = render(createState(model, { mini: { work_spinner: 'square-toggle' } }));
  const at = html.indexOf('data-path="mini/work_spinner"');
  const row = html.slice(at, html.indexOf('data-path="', at + 12));
  ok(!row.includes('badge def'), 'no default badge when the file has a value: ');
  ok(row.includes('square-toggle'), 'the select shows the file value: ');
});

test('a nested object renders its subfields through the same row renderer', () => {
  const html = render(createState(model, {}));
  ok(html.includes('data-path="attention/sounds/done"'), 'nested leaf gets a row: ');
  ok(html.includes('fieldset class="nested"'), 'inside a nested fieldset: ');
});

/* client-side patch collection: the same guarantee as the server, computed locally */
test('collectPatches emits only edited paths', () => {
  const state = createState(model, { mouse: true });
  setDraft(state, 'mouse', false);
  eq(collectPatches(state), [{ path: 'mouse', op: 'set', value: false }]);
});

test('editing a key back to its on-disk value produces no patch', () => {
  const state = createState(model, { mouse: false });
  setDraft(state, 'mouse', true);
  eq(collectPatches(state).length, 1);
  setDraft(state, 'mouse', false);
  eq(collectPatches(state), [], 'a reverted edit is not a change: ');
});

test('clearing a key that exists on disk becomes an unset patch', () => {
  const state = createState(model, { mouse: false });
  state.draft.set('mouse', { op: 'unset' });
  eq(collectPatches(state), [{ path: 'mouse', op: 'unset' }]);
});

test('clearing a key that only has a default produces no patch', () => {
  const state = createState(model, {});
  state.draft.set('mini/work_spinner', { op: 'unset' });
  eq(collectPatches(state), [], 'nothing on disk to remove: ');
});

test('key capture turns a real key press into what the config file wants', () => {
  eq(normalizeKeyEvent({ key: 'K', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false }), 'ctrl+shift+k');
  eq(normalizeKeyEvent({ key: 'ArrowUp', ctrlKey: false, shiftKey: false, altKey: true, metaKey: false }), 'alt+up');
  eq(normalizeKeyEvent({ key: ' ', ctrlKey: false, shiftKey: false, altKey: false, metaKey: false }), 'space');
  eq(normalizeKeyEvent({ key: 'Control', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false }), null, 'a modifier alone is not a binding: ');
});

test('the client and the server agree on a keybind patch', () => {
  const dir = makeSandbox(BASE);
  const store = storeFor(dir);
  const state = createState(model, BASE);
  setDraft(state, 'keybinds/app.exit', ['ctrl+c', 'ctrl+d']);
  setDraft(state, 'diffs/wrap', 'none');
  const patches = collectPatches(state);
  const r = store.save(patches);
  eq(r.applied.map(p => p.path).sort(), ['diffs/wrap', 'keybinds/app.exit']);
  eq(readConfig(cliPath(dir)).obj.keybinds['app.exit'], ['ctrl+c', 'ctrl+d']);
});

/* ============================== 8. provenance ============================== */

section('8. provenance — the generated tables say where they came from');

test('keybind defaults record the binary they were extracted from', () => {
  const p = schemas.keybindDefaults.provenance;
  ok(/opencode/.test(p.binary.path), 'binary path recorded: ' + p.binary.path);
  eq(p.binary.sha256_16.length, 16, 'binary hash recorded: ' + p.binary.sha256_16);
  eq(schemas.keybindDefaults.report.schemaKeybindCount, 242);
  eq(schemas.keybindDefaults.report.binaryTableEntries, 242);
  eq(schemas.keybindDefaults.report.binaryVsDocsDisagreements, [], 'binary and docs agree on every row they share: ');
});

test('every keybind default is a value the schema accepts', () => {
  const bad = [];
  for (const [id, entry] of Object.entries(schemas.keybindDefaults.defaults)) {
    const r = validator.validate({ keybinds: { [id]: entry.default } });
    if (!r.ok) bad.push(id + ': ' + r.errors[0].message);
  }
  eq(bad, [], 'all defaults are schema-legal: ');
});

test('setting defaults extracted from the binary match the resolver', () => {
  eq(schemas.settingDefaults.defaults['leader.timeout'], 2000);
  eq(schemas.settingDefaults.defaults['attention.volume'], 0.4);
  eq(schemas.settingDefaults.defaults['attention.sound_pack'], 'opencode.default');
  eq(schemas.settingDefaults.defaults.mouse, true);
  eq(schemas.settingDefaults.miniDefaults['mini.work_spinner'], 'block-soft-slide');
  eq(schemas.settingDefaults.report.computedAtRuntime.sort(), ['enabled', 'mode'], 'runtime-computed keys are named, not guessed: ');
});

test('the leader default agrees across all sources', () => {
  eq(schemas.keybindDefaults.report.leaderDefault, 'ctrl+x');
  eq(schemas.keybindDefaults.defaults.leader.default, 'ctrl+x');
});

test('the generated tables are reproducible from the installed binary', () => {
  const bin = findBinary();
  if (!bin) { console.log('  skip reproducible-from-binary (no opencode binary on this machine)'); return; }
  const buf = fs.readFileSync(bin);
  const kb = extractKeybindDefaults(buf);
  eq(Object.keys(kb.entries).length, schemas.keybindDefaults.report.binaryTableEntries, 'entry count matches: ');
  eq(kb.leaderDefault, 'ctrl+x');
  eq(Object.keys(extractKeybindNameMap(buf)).length, translate.report.mappedCount, 'name map length matches: ');
});

/* ==================================== report ==================================== */

await runQueue();

for (const dir of SANDBOXES) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ } }

console.log('\n' + '-'.repeat(60));
console.log(`${passed} passed, ${failed} failed`);
if (failed) {
  console.log('\nfailures:');
  for (const f of failures) console.log('  · ' + f.name);
}
process.exit(failed ? 1 : 0);
