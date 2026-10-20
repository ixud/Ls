/**
 * save.mjs — the only module that touches cli.json / tui.json.
 *
 * Order of operations, every time, no exceptions:
 *   1. re-read the file from disk (never trust a snapshot the client held)
 *   2. merge the incoming patches into a copy; only named leaves change
 *   3. validate the merged result against the real cli schema
 *   4. refuse if the merge would add a key the schema forbids
 *   5. back up every file that is about to change
 *   6. write atomically, then write the mirror, then log
 *
 * Backup and history reuse the shapes BAZER Console already has (a timestamped
 * folder with a manifest, a TSV history line) so this drops into console.mjs
 * without a second convention.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applyPatches, diffValues, unknownPaths, isPlainObject } from './patches.mjs';
import { SchemaValidator, validateKeybindValue } from './validate.mjs';
import { cliToTui, tuiToCli } from './mirror.mjs';
import { loadSchemas, buildFormModel } from './form-model.mjs';

/* ------------------------------- jsonc handling ------------------------------- */

/** Comments and trailing commas: opencode accepts them, so the editor must too. */
export function stripJsonc(text) {
  let out = '', i = 0, inStr = false;
  while (i < text.length) {
    const c = text[i], c2 = text[i + 1];
    if (inStr) {
      out += c;
      if (c === '\\') { out += c2 ?? ''; i += 2; continue; }
      if (c === '"') inStr = false;
      i++;
      continue;
    }
    if (c === '"') { inStr = true; out += c; i++; continue; }
    if (c === '/' && c2 === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && c2 === '*') { i += 2; while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++; i += 2; continue; }
    out += c;
    i++;
  }
  return out.replace(/,\s*([}\]])/g, '$1');
}

export function readConfig(file) {
  if (!fs.existsSync(file)) return { exists: false, text: '', obj: {}, error: null };
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  if (!text.trim()) return { exists: true, text, obj: {}, error: null };
  try {
    return { exists: true, text, obj: JSON.parse(stripJsonc(text)), error: null };
  } catch (e) {
    return { exists: true, text, obj: null, error: 'JSON ไม่ถูกต้อง: ' + e.message };
  }
}

export function writeAtomic(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp-' + process.pid + '-' + crypto.randomBytes(2).toString('hex');
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, file);
}

/* --------------------------------- backup set --------------------------------- */

export function createBackup({ backupsDir, label, files }) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '-' + crypto.randomBytes(2).toString('hex');
  const dir = path.join(backupsDir, stamp);
  const items = [];
  for (const [i, file] of files.entries()) {
    try {
      if (!fs.existsSync(file)) continue;
      const stored = `file_${i}.bak`;
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(file, path.join(dir, stored));
      items.push({ orig: file, stored, kind: 'file' });
    } catch { /* a file we cannot read is a file we cannot back up; keep going and report below */ }
  }
  if (!items.length) return { dir: null, count: 0 };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ label, time: new Date().toISOString(), files: items }, null, 2), 'utf8');
  pruneBackups(backupsDir);
  return { dir, count: items.length };
}

export function pruneBackups(backupsDir, keep = 30) {
  try {
    const dirs = fs.readdirSync(backupsDir).filter(d => fs.existsSync(path.join(backupsDir, d, 'manifest.json'))).sort();
    for (const d of dirs.slice(0, Math.max(0, dirs.length - keep))) fs.rmSync(path.join(backupsDir, d), { recursive: true, force: true });
  } catch { /* pruning is best effort */ }
}

export function listBackups(backupsDir, limit = 30) {
  try {
    return fs.readdirSync(backupsDir)
      .filter(d => fs.existsSync(path.join(backupsDir, d, 'manifest.json')))
      .sort().reverse().slice(0, limit)
      .map(d => {
        try {
          const m = JSON.parse(fs.readFileSync(path.join(backupsDir, d, 'manifest.json'), 'utf8'));
          return { set: d, label: m.label, time: m.time, count: (m.files || []).length };
        } catch { return { set: d, label: '', time: '', count: 0 }; }
      });
  } catch { return []; }
}

/* ---------------------------------- the store ---------------------------------- */

export class CliSettingsStore {
  /**
   * @param {object} options
   * @param {string} options.cliFile   absolute path to cli.json
   * @param {string} options.tuiFile   absolute path to tui.json
   * @param {string} options.backupsDir
   * @param {string} [options.historyFile]
   * @param {string} [options.schemaDir]
   */
  constructor({ cliFile, tuiFile, backupsDir, historyFile = null, schemaDir = undefined }) {
    this.cliFile = cliFile;
    this.tuiFile = tuiFile;
    this.backupsDir = backupsDir;
    this.historyFile = historyFile;
    const schemas = loadSchemas(schemaDir);
    this.schemas = schemas;
    this.model = buildFormModel(schemas);
    this.validator = new SchemaValidator(schemas.cli);
    this.knownPaths = new Set(Object.keys(this.model.index));
  }

  /** Everything the page needs to draw itself. */
  read() {
    const cli = readConfig(this.cliFile);
    const tui = readConfig(this.tuiFile);
    return {
      model: this.model,
      capabilities: {
        mirror: mirrorCapabilityFor(this.schemas.translate),
        keybindShapes: this.model.groups.find(g => g.id === 'keybinds')?.bindingShape || [],
        keybindRuntimeAdjustments: this.schemas.settingDefaults.report.runtimeAdjustments,
      },
      files: {
        cli: { path: this.cliFile, exists: cli.exists, error: cli.error, values: cli.obj },
        tui: { path: this.tuiFile, exists: tui.exists, error: tui.error },
      },
      unknownPaths: cli.obj ? unknownPaths(cli.obj, this.knownPaths) : [],
      backups: listBackups(this.backupsDir, 10),
      provenance: {
        generatedAt: this.schemas.keybindDefaults.provenance.generatedAt,
        binary: this.schemas.keybindDefaults.provenance.binary,
        keybindDefaults: this.schemas.keybindDefaults.report,
        settings: this.schemas.settingDefaults.report,
        translation: this.schemas.translate.report,
      },
    };
  }

  /** Dry run of the mirror, so the page can show what a save would write to tui.json. */
  previewMirror(patches) {
    const current = readConfig(this.cliFile);
    if (current.error) return { ok: false, message: current.error };
    const merged = applyPatches(current.obj, patches);
    const { result, applied, skipped } = merged;
    const mirror = cliToTui(result, this.schemas.translate, this.schemas.tuiAllowlist);
    return { ok: true, applied, skipped, mirror, validation: this.validator.validate(result) };
  }

  /**
   * @param {Array} patches  [{path, op:'set'|'unset', value}] with `/`-separated paths
   * @param {object} [options]
   * @param {boolean} [options.mirrorToTui=true]
   */
  save(patches, { mirrorToTui = true } = {}) {
    const current = readConfig(this.cliFile);
    if (current.error) throw new Error('อ่าน cli.json ไม่ได้ — ' + current.error);

    const { result, applied, skipped } = applyPatches(current.obj, patches);

    /* Nothing to write to cli.json. The mirror is still checked: pressing Save on an
       unchanged form should repair tui.json drift, which is half the point of mirroring. */
    if (!applied.length) {
      const repaired = mirrorToTui ? this.repairMirror(result, { ensureExists: true }) : null;
      const didRepair = !!repaired?.wrote;
      return {
        ok: true,
        message: didRepair ? `ไม่มีค่าเปลี่ยน — ซ่อม tui.json ให้ตรงแล้ว (${repaired.changedPaths.length} คีย์)` : 'ไม่มีอะไรเปลี่ยน',
        applied, skipped, wrote: didRepair ? [this.tuiFile] : [], backup: repaired?.backup || null,
        mirror: repaired, validation: { ok: true, errors: [] },
      };
    }

    /*
     * boundary guard 1: refuse to introduce a top-level key the schema forbids.
     * This runs before the value check because "key the schema does not know" is a
     * more actionable message than "value fails the schema". The two are not
     * alternatives — removing this guard would only change the wording, since the
     * schema validation below refuses the same patch.
     */
    {
      const schemaTopKeys = new Set(Object.keys(this.schemas.cli.properties || {}));
      const added = Object.keys(result).filter(k => !schemaTopKeys.has(k) && !(k in (current.obj || {})));
      if (added.length) {
        const e = new Error(`patch เพิ่มคีย์ที่สคีมาไม่รู้จัก: ${added.join(', ')}`);
        e.unknownKeys = added;
        throw e;
      }
    }

    /*
     * boundary guard 2: the merge must not introduce a NEW schema violation.
     * The whole document is validated, then the file's own pre-existing violations
     * are subtracted — a key someone already had in their config is left alone, but
     * every value this save would introduce has to satisfy the schema.
     */
    const after = this.validator.validate(result);
    const before = this.validator.validate(current.obj);
    const baseline = new Set(before.errors.map(e => e.path + '|' + e.message));
    const introduced = after.errors.filter(e => !baseline.has(e.path + '|' + e.message));
    const validation = { ok: introduced.length === 0, errors: introduced, preExisting: before.errors };
    if (introduced.length) {
      const first = introduced.slice(0, 6).map(e => `  /${e.path} ${e.message}`).join('\n');
      const e = new Error(`ค่าไม่ผ่านสคีมา (${introduced.length} จุด):\n${first}`);
      e.validation = validation;
      throw e;
    }

    /* boundary guard 3: keybind values get the check the schema cannot express */
    for (const p of applied) {
      if (!p.path.startsWith('keybinds/') || p.op === 'unset') continue;
      const r = validateKeybindValue(p.value);
      if (!r.ok) {
        const e = new Error(`keybind ${p.path}: ${r.message}`);
        e.validation = validation;
        throw e;
      }
    }

    /* preserve: anything on disk that the catalog does not know stays untouched. */
    const untouchedUnknown = unknownPaths(current.obj, this.knownPaths);

    const backup = createBackup({ backupsDir: this.backupsDir, label: 'settings-form', files: [this.cliFile, mirrorToTui ? this.tuiFile : null].filter(Boolean) });
    writeAtomic(this.cliFile, JSON.stringify(result, null, 2) + '\n');

    const mirrorResult = mirrorToTui ? this.repairMirror(result, { backup, ensureExists: true }) : null;

    if (this.historyFile) {
      try {
        fs.mkdirSync(path.dirname(this.historyFile), { recursive: true });
        const line = [new Date().toISOString(), 'save-cli-settings', 'ok', applied.map(a => a.path).join(' ')].join('\t');
        fs.appendFileSync(this.historyFile, line + '\n');
      } catch { /* history is a nicety, not a correctness requirement */ }
    }

    return {
      ok: true,
      message: `บันทึก ${applied.length} ค่า${mirrorResult ? ` + mirror ไป tui.json (${mirrorResult.changedPaths.length} คีย์${mirrorResult.created ? ', สร้างไฟล์ใหม่' : ''})` : ''} (สำรอง ${backup.count} ไฟล์)`,
      applied,
      skipped,
      wrote: [this.cliFile, mirrorToTui ? this.tuiFile : null].filter(Boolean),
      backup,
      mirror: mirrorResult,
      untouchedUnknown,
      validation,
    };
  }

  /**
   * Write the mirror of a merged cli config into tui.json, merging over whatever
   * is already there so hand-written tui keys survive. Only writes when the content
   * actually differs.
   *
   * The merge is DEEP, not a shallow spread: tui-only keys that live under a group
   * the mirror also touches (`attention.enabled` under `attention`, `prompt.max_height`
   * under `prompt`) survive because the groups are merged key-by-key, not replaced.
   * Keybinds use remapTuiKeybinds instead, which keeps hand-written names the mirror
   * does not manage.
   *
   * `ensureExists` creates tui.json when it is missing. That is what "mirror so it
   * does not matter which file is read" means in practice: opencode's legacy route
   * only migrates a tui.json that exists, so leaving it absent would silently skip
   * the mirror. Pass false to write only into a file that is already there.
   */
  repairMirror(cliObject, { backup = null, ensureExists = false } = {}) {
    const tuiCurrent = readConfig(this.tuiFile);
    if (!tuiCurrent.exists && !ensureExists) return { report: null, changedPaths: [], tuiPath: this.tuiFile, backup, wrote: false, skippedReason: 'tui.json ไม่มีอยู่' };
    if (tuiCurrent.exists && tuiCurrent.error) return { report: null, changedPaths: [], tuiPath: this.tuiFile, backup, wrote: false, skippedReason: 'อ่าน tui.json ไม่ได้ — ' + tuiCurrent.error };
    const prev = tuiCurrent.obj || {};
    const created = !tuiCurrent.exists;
    const { tui, report } = cliToTui(cliObject, this.schemas.translate, this.schemas.tuiAllowlist);
    const { keybinds: nextKb, ...tuiRest } = tui;
    const next = deepMerge(prev, tuiRest);
    if (isPlainObject(prev.keybinds) || isPlainObject(nextKb)) {
      next.keybinds = remapTuiKeybinds(prev.keybinds || {}, nextKb || {}, this.schemas.translate);
    }
    const changedPaths = diffValues(prev, next);
    if (!changedPaths.length && !created) return { report, changedPaths, tuiPath: this.tuiFile, backup, wrote: false, created: false };
    if (!backup) backup = createBackup({ backupsDir: this.backupsDir, label: 'mirror-tui', files: [this.tuiFile] });
    writeAtomic(this.tuiFile, JSON.stringify(next, null, 2) + '\n');
    return { report, changedPaths, tuiPath: this.tuiFile, backup, wrote: true, created, content: next };
  }

  /** Import legacy tui.json (+ state/kv.json) into cli.json, the way the binary migrates. */
  importTui({ kvFile = null } = {}) {
    const tui = readConfig(this.tuiFile);
    if (!tui.exists) throw new Error('ไม่พบ tui.json');
    if (tui.error) throw new Error('อ่าน tui.json ไม่ได้ — ' + tui.error);
    const kv = kvFile && fs.existsSync(kvFile) ? readConfig(kvFile).obj || {} : {};
    const { cli, report } = tuiToCli(tui.obj, this.schemas.translate, { kv });
    const currentCli = readConfig(this.cliFile).obj || {};
    const patches = diffValues(currentCli, { ...currentCli, ...cli });
    const result = this.save(patches, { mirrorToTui: false });
    return { ...result, translationReport: report, patches };
  }

  /** Is tui.json actually in sync with cli.json? Proves the mirror ran. */
  mirrorStatus() {
    const cli = readConfig(this.cliFile);
    const tui = readConfig(this.tuiFile);
    if (!tui.exists) return { inSync: false, reason: 'tui.json ไม่มีอยู่' };
    const expected = cliToTui(cli.obj || {}, this.schemas.translate, this.schemas.tuiAllowlist);
    const drift = [];
    for (const [key, value] of Object.entries(expected.tui)) {
      if (key === '$schema') continue;
      if (JSON.stringify(tui.obj?.[key]) !== JSON.stringify(value)) drift.push(key);
    }
    return { inSync: drift.length === 0, drift, expected: expected.tui, report: expected.report };
  }
}

/** Recursive merge of plain objects; arrays and scalars from `over` replace. */
function deepMerge(base, over) {
  if (!isPlainObject(base) || !isPlainObject(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = isPlainObject(v) && isPlainObject(base[k]) ? deepMerge(base[k], v) : v;
  }
  return out;
}

/** tui keybind set: keep hand-written unknown names, overwrite the ones we manage. */
function remapTuiKeybinds(prevTui, nextTui, translate) {
  const managed = new Set(Object.values(translate.cliToTui).concat('leader'));
  const out = {};
  for (const [k, v] of Object.entries(prevTui)) if (!managed.has(k)) out[k] = v;
  return { ...out, ...nextTui };
}

function mirrorCapabilityFor(translate) {
  const tuiNames = Object.keys(translate.tuiToCli).length;
  return {
    tuiNames,
    cliNamesCovered: Object.keys(translate.cliToTui).length + 1,
    cliNamesTotal: 242,
    note: 'cli keybinds newer than the legacy tui schema have no mirror target',
  };
}
