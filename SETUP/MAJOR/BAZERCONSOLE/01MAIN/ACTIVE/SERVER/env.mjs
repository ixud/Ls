/**
 * env.mjs — ตัวแปรที่อยู่ (อ่านจาก MANIFEST/env.json เท่านั้น — R2)
 * ห้าม hardcode path ของผู้ใช้ในไฟล์นี้หรือไฟล์อื่นใน ACTIVE/**
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
export const ACTIVE_DIR = path.resolve(SERVER_DIR, '..');           // .../ACTIVE
export const MAIN_DIR = path.resolve(ACTIVE_DIR, '..');             // .../01MAIN
export const CONSOLE_DIR = path.resolve(MAIN_DIR, '..');            // .../BAZERCONSOLE
export const ROOT = path.resolve(CONSOLE_DIR, '..');                // .../MAJOR
export const PASSIVE_DIR = path.join(MAIN_DIR, 'PASSIVE');
export const MANIFEST_DIR = path.join(PASSIVE_DIR, '01MANIFEST');
export const UI_DIR = path.join(ACTIVE_DIR, 'UI');
export const VAR_DIR = path.join(ACTIVE_DIR, 'var');
export const BACKUP_DIR = path.join(VAR_DIR, 'backups');
export const HISTORY_FILE = path.join(VAR_DIR, 'history.tsv');
export const STATE_FILE = path.join(VAR_DIR, 'state.json');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const envSpec = readJson(path.join(MANIFEST_DIR, 'env.json'));

/** @returns {Record<string,string>} */
export function buildVars(homeOverride) {
  const home = homeOverride || os.homedir();
  const raw = { ...envSpec.vars };
  raw.ACTIVE = { kind: 'active' };
  raw.VAR = { kind: 'var' };
  raw.MAJOR = { kind: 'major' };
  const out = { HOME: home };
  const resolveOne = (name, guard = 0) => {
    if (out[name]) return out[name];
    if (guard > 12) throw new Error(`env: ตัวแปร ${name} วนซ้ำ`);
    const spec = raw[name];
    if (!spec) throw new Error(`env: ไม่รู้จักตัวแปร \${${name}}`);
    let value;
    if (spec.kind === 'home') value = home;
    else if (spec.kind === 'path') value = expand(spec.value, guard + 1);
    else if (spec.kind === 'temp') value = path.join(os.tmpdir(), 'bazer');
    else if (spec.kind === 'active') value = ACTIVE_DIR;
    else if (spec.kind === 'var') value = VAR_DIR;
    else if (spec.kind === 'major') value = ROOT;
    else throw new Error(`env: kind "${spec.kind}" ไม่รองรับ`);
    out[name] = path.normalize(value);
    return out[name];
  };
  const expand = (str, guard = 0) =>
    String(str).replace(/\$\{([A-Z_]+)\}/g, (_, n) => resolveOne(n, guard + 1));
  for (const name of Object.keys(raw)) resolveOne(name);
  return out;
}

export function makeResolver(homeOverride) {
  const vars = buildVars(homeOverride);
  const resolve = (template) => {
    if (typeof template !== 'string' || !template) return template;
    return path.normalize(template.replace(/\$\{([A-Z_]+)\}/g, (_, n) => {
      if (!vars[n]) throw new Error(`env: ไม่มีตัวแปร \${${n}}`);
      return vars[n];
    }));
  };
  return { vars, resolve };
}

export function ensureVarDir() {
  fs.mkdirSync(VAR_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
