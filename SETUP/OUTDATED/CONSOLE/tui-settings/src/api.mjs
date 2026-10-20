/**
 * api.mjs — the sidetab's server side, shaped to drop into console.mjs.
 *
 * console.mjs dispatches `POST /api/action` to `ACTIONS[id](params)`, so this
 * module exports a factory returning entries of exactly that shape. Nothing here
 * knows about HTTP.
 *
 * Actions (the `tui-*` id style console.mjs uses):
 *   tui-form           -> the form model + current values + provenance
 *   tui-save           -> apply changed-path patches, validate, back up, mirror
 *   tui-preview-mirror -> what a save would write to tui.json, without writing
 *   tui-mirror-status  -> is tui.json actually in sync right now
 *   tui-import         -> migrate legacy tui.json (+ state/kv.json) into cli.json
 *   tui-restore        -> restore one backup set
 *   tui-verify         -> read-only verify items
 *   tui-backups        -> recent backup sets
 */
import fs from 'node:fs';
import path from 'node:path';
import { CliSettingsStore, readConfig, writeAtomic, listBackups, createBackup } from './save.mjs';
import { validateKeybindValue } from './validate.mjs';

export function createSettingsApi({ cliFile, tuiFile, kvFile = null, backupsDir, historyFile = null }) {
  const store = new CliSettingsStore({ cliFile, tuiFile, backupsDir, historyFile });

  return {
    /** The whole page payload: form model, values, provenance, mirror state. */
    'tui-form': async () => {
      const state = store.read();
      return {
        ...state,
        mirrorStatus: store.mirrorStatus(),
        message: `${state.model.stats.schemaPropertyCount} กลุ่มในสคีมา · ${state.model.stats.fieldCount} ช่อง · keybind ${state.model.stats.keybindCount} ตัว`,
      };
    },

    /**
     * @param {{patches: Array, mirrorToTui?: boolean}} params
     * Only changed paths are accepted; a whole-file payload is rejected so the
     * "unknown keys survive" guarantee cannot be bypassed by the client.
     */
    'tui-save': async ({ patches, mirrorToTui = true }) => {
      if (!Array.isArray(patches)) throw new Error('ต้องส่ง patches เป็นรายการ');
      const bad = patches.filter(p => !p || typeof p.path !== 'string' || (p.op !== 'set' && p.op !== 'unset'));
      if (bad.length) throw new Error(`${bad.length} patch ไม่ถูกรูปแบบ (ต้องมี path และ op)`);
      return store.save(patches, { mirrorToTui: !!mirrorToTui });
    },

    'tui-preview-mirror': async ({ patches = [] }) => store.previewMirror(patches),

    'tui-mirror-status': async () => store.mirrorStatus(),

    /** Lightweight, no form model — for /api/state on every refresh. */
    'tui-status': async () => {
      const cli = readConfig(cliFile);
      const tui = readConfig(tuiFile);
      const status = store.mirrorStatus();
      return {
        cliExists: cli.exists,
        cliError: cli.error,
        tuiExists: tui.exists,
        inSync: !!status.inSync,
        drift: status.drift || [],
        reason: status.reason || null,
        stats: { groups: store.model.stats.groupCount, fields: store.model.stats.fieldCount, keybinds: store.model.stats.keybindCount },
      };
    },

    'tui-import': async () => store.importTui({ kvFile }),

    'tui-restore': async ({ set }) => {
      const dir = path.join(backupsDir, path.basename(set || ''));
      const manifest = path.join(dir, 'manifest.json');
      if (!fs.existsSync(manifest)) throw new Error('ไม่พบชุดสำรองนี้');
      const meta = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      const bk = createBackup({ backupsDir, label: 'before-restore-' + path.basename(set), files: meta.files.map(f => f.orig) });
      let restored = 0;
      for (const item of meta.files) {
        const stored = path.join(dir, item.stored);
        if (!fs.existsSync(stored)) continue;
        writeAtomic(item.orig, fs.readFileSync(stored, 'utf8'));
        restored++;
      }
      return { message: `กู้คืน ${restored} ไฟล์ (สำรองสถานะก่อนกู้ ${bk.count} ไฟล์)`, restored, backup: bk };
    },

    /** Read-only view used by the verify pass. */
    'tui-verify': async () => {
      const cli = readConfig(cliFile);
      const tui = readConfig(tuiFile);
      const status = store.mirrorStatus();
      const unknown = store.read().unknownPaths;
      const badBindings = [];
      for (const [id, value] of Object.entries(cli.obj?.keybinds || {})) {
        const r = validateKeybindValue(value);
        if (!r.ok) badBindings.push(`${id}: ${r.message}`);
      }
      const items = [
        { label: 'cli.json', level: cli.exists ? (cli.error ? 'fail' : 'ok') : 'warn', detail: cli.error || (cli.exists ? 'อ่านได้' : 'ยังไม่มีไฟล์ (จะสร้างตอนบันทึกครั้งแรก)') },
        { label: 'tui.json mirror', level: status.inSync ? 'ok' : 'warn', detail: status.inSync ? 'ตรงกับ cli.json' : `ต่างที่: ${(status.drift || []).join(', ') || status.reason}` },
        { label: 'คีย์นอก catalog', level: unknown.length ? 'warn' : 'ok', detail: unknown.length ? unknown.join(', ') + ' — จะคงไว้เหมือนเดิม' : 'ไม่มี' },
        { label: 'ค่า keybind ถูกต้อง', level: badBindings.length ? 'fail' : 'ok', detail: badBindings.length ? badBindings.slice(0, 6).join(' · ') : `${Object.keys(cli.obj?.keybinds || {}).length} ค่าในไฟล์ผ่านรูปที่สคีมา + โปรแกรมรับ` },
        { label: 'defaults', level: 'ok', detail: `keybind ${store.schemas.keybindDefaults.report.schemaKeybindCount} ตัว ดึงจาก binary ${store.schemas.keybindDefaults.provenance.binary.sha256_16}` },
      ];
      return { items, summary: { ok: items.filter(i => i.level === 'ok').length, warn: items.filter(i => i.level === 'warn').length, fail: items.filter(i => i.level === 'fail').length } };
    },

    'tui-backups': async () => ({ backups: listBackups(backupsDir, 30) }),
  };
}
