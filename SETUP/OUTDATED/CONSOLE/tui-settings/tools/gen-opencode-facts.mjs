#!/usr/bin/env node
/**
 * gen-opencode-facts.mjs — the lever.
 *
 * cli.schema.json describes shapes but carries no `default` keyword, and the
 * legacy tui.json naming does not translate mechanically (a normal `_`->`.` swap
 * gets 124 of 242 IDs right and invents wrong names for the other 118 — see
 * RATIONALIZE.md). Both gaps are closed by reading the installed opencode
 * binary, which is the program that actually reads these files.
 *
 * Extracted, in one pass, all verified against the real binary:
 *   1. schema/keybind-defaults.json    — 242/242 keybind defaults + descriptions
 *                                        (embedded table `ey={leader:d(lde,"…"),…}`)
 *   2. schema/translate-keybinds.json  — tui flat name -> cli dotted name
 *                                        (embedded map `G={app_exit:"app.exit",…}`)
 *   3. schema/setting-defaults.json    — non-keybind runtime defaults
 *                                        (embedded defaults resolver, `??` fallbacks)
 *
 * Cross-check: when reachable, the docs page tables are parsed and every
 * disagreement with the binary is reported. The binary wins; the report says so.
 *
 * Usage:
 *   node tools/gen-opencode-facts.mjs                # extract + cross-check
 *   node tools/gen-opencode-facts.mjs --no-docs      # offline
 *   node tools/gen-opencode-facts.mjs --check        # exit 1 if outputs would change
 *   node tools/gen-opencode-facts.mjs --bin=<path>
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_DIR = path.join(ROOT, 'schema');
const CACHE = path.join(SCHEMA_DIR, '.cache', 'keybinds.html');
const DOCS_URL = 'https://opencode.ai/v2/docs/cli/keybinds';

const argv = process.argv.slice(2);
const has = name => argv.some(a => a === '--' + name || a.startsWith('--' + name + '='));
const opt = (name, dflt) => {
  const hit = argv.find(a => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : dflt;
};
const checkOnly = has('check');
const noDocs = has('no-docs');

/* ============================== tiny JS-data reader ============================== */

/** Find the index of the `}`/`)`/`]` matching the opener at `open`, skipping string literals. */
export function matchingBracket(buf, open) {
  let depth = 0, inStr = null, esc = false;
  for (let p = open; p < buf.length; p++) {
    const ch = buf[p];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === 0x5c) { esc = true; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === 0x22 || ch === 0x27 || ch === 0x60) { inStr = ch; continue; }
    if (ch === 0x7b || ch === 0x28 || ch === 0x5b) depth++;
    else if (ch === 0x7d || ch === 0x29 || ch === 0x5d) { depth--; if (depth === 0) return p; }
  }
  return -1;
}

/** `!0`/`!1` are minified true/false; unquoted keys need quoting. Everything else is JSON already. */
export function normalishToJson(src) {
  let out = '', inStr = false, esc = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inStr) { out += c; if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; out += c; continue; }
    if (c === '!' && src[i + 1] === '0') { out += 'true'; i++; continue; }
    if (c === '!' && src[i + 1] === '1') { out += 'false'; i++; continue; }
    if (/[A-Za-z_$]/.test(c) && !/[A-Za-z0-9_$]/.test(out.slice(-1))) {
      let j = i, name = '';
      while (j < src.length && /[A-Za-z0-9_$]/.test(src[j])) { name += src[j]; j++; }
      const next = src.slice(j).match(/^\s*:/);
      if (next) { out += '"' + name + '"'; i = j - 1; continue; }
    }
    out += c;
  }
  return out.replace(/'([^'\\]*)'/g, (m, s) => JSON.stringify(s));
}

/** Read one JS literal starting at `at`; returns { value, end }. */
export function readDataLiteral(src, at, consts = {}) {
  while (at < src.length && /\s/.test(src[at])) at++;
  const c = src[at];
  if (c === '"' || c === "'") {
    const quote = c;
    let i = at + 1, raw = c;
    let esc = false;
    for (; i < src.length; i++) {
      raw += src[i];
      if (esc) esc = false;
      else if (src[i] === '\\') esc = true;
      else if (src[i] === quote) { i++; break; }
    }
    return { value: JSON.parse(quote === "'" ? '"' + raw.slice(1, -1).replace(/"/g, '\\"') + '"' : raw), end: i };
  }
  if (c === '{' || c === '[') {
    const close = matchingBracket(Buffer.from(src, 'utf8'), at);
    if (close < 0) throw new Error('unterminated literal at ' + at);
    return { value: JSON.parse(normalishToJson(src.slice(at, close + 1))), end: close + 1 };
  }
  const m = /^(![01]|-?[0-9.]+|[A-Za-z_$][\w$]*)/.exec(src.slice(at));
  if (!m) throw new Error('cannot read literal at ' + at + ': ' + JSON.stringify(src.slice(at, at + 40)));
  const tok = m[1];
  let value;
  if (tok === '!0') value = true;
  else if (tok === '!1') value = false;
  else if (/^-?[0-9.]+$/.test(tok)) value = Number(tok);
  else if (Object.prototype.hasOwnProperty.call(consts, tok)) value = consts[tok];
  else value = undefined;
  return { value, end: at + tok.length };
}

/* ================================ source: the binary ================================ */

const ANCHORS = {
  keybindTable: 'ey={leader:d(',
  nameMap: 'G={app_exit:"app.exit"',
  defaultsResolver: 'attention:{notifications:i.attention?.notifications',
  miniDefaults: 'thinking:t?.mini?.thinking??"show"',
};

function npmGlobalPrefixes() {
  const out = [];
  if (process.env.APPDATA) out.push(path.join(process.env.APPDATA, 'npm'));
  const home = os.homedir();
  out.push(path.join(home, '.npm-global', 'lib'));
  out.push(path.join(home, '.local', 'share', 'npm', 'lib'));
  out.push('/usr/local/lib');
  out.push('/opt/homebrew/lib');
  out.push('/usr/lib');
  return out;
}

function candidateBinaries() {
  const explicit = opt('bin', '') || process.env.OPENCODE_BIN || '';
  const out = explicit ? [explicit] : [];
  for (const prefix of npmGlobalPrefixes()) {
    const npm = path.join(prefix, 'node_modules', '@opencode', 'cli');
    if (!fs.existsSync(npm)) continue;
    const inner = path.join(npm, 'node_modules', '@opencode');
    for (const p of [path.join(npm, 'bin', 'opencode.exe'), path.join(npm, 'bin', 'opencode')]) out.push(p);
    for (const dir of ['cli-windows-x64', 'cli-windows-x64-baseline', 'cli-linux-x64', 'cli-linux-arm64', 'cli-darwin-x64', 'cli-darwin-arm64']) {
      for (const f of ['opencode.exe', 'opencode']) out.push(path.join(inner, dir, 'bin', f));
    }
  }
  out.push('/usr/local/bin/opencode', '/usr/bin/opencode', '/opt/homebrew/bin/opencode');
  return out.filter(Boolean);
}

export function findBinary() {
  for (const p of candidateBinaries()) if (fs.existsSync(p)) return p;
  return null;
}

function sliceObjectAt(buf, marker, prefer = 'first') {
  const at = buf.indexOf(Buffer.from(marker, 'utf8'));
  if (at < 0) throw new Error(`anchor not found: ${marker} (binary layout changed — update ANCHORS)`);
  let open;
  if (prefer === 'enclosing-return') {
    // the marker sits inside `return{ ... ,attention:{<marker>...} }` — take the outer object
    const ret = buf.lastIndexOf(Buffer.from('return{', 'utf8'), at);
    if (ret < 0) throw new Error('enclosing `return{` not found for anchor ' + marker);
    open = ret + 'return'.length;
  } else {
    open = buf.indexOf(Buffer.from('{', 'utf8'), at);
  }
  const close = matchingBracket(buf, open);
  if (close < 0) throw new Error('unterminated object for anchor ' + marker);
  return { text: buf.slice(open, close + 1).toString('utf8'), offset: open, end: close };
}

/** 1. keybind defaults: `{leader:d(lde,"Desc"),"app.exit":d("ctrl+c,…","Desc"),…}` */
export function extractKeybindDefaults(buf) {
  const { text, offset } = sliceObjectAt(buf, ANCHORS.keybindTable);
  const leaderAt = buf.lastIndexOf(Buffer.from('lde=', 'utf8'), offset);
  const leaderSrc = buf.slice(leaderAt + 4, leaderAt + 48).toString('utf8').split(',')[0].trim();
  const consts = { lde: readDataLiteral(leaderSrc, 0).value };

  const entries = {};
  const order = [];
  const re = /(?:"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*[A-Za-z_$][\w$]*\(/g;
  let m;
  while ((m = re.exec(text))) {
    const id = m[1] ?? m[2];
    const p = readDataLiteral(text, m.index + m[0].length, consts);       // arg 1: default
    const comma = text.indexOf(',', p.end);
    if (comma < 0) throw new Error('cannot find description arg for ' + id);
    const q = readDataLiteral(text, comma + 1, consts);                    // arg 2: description
    if (p.value === undefined) throw new Error(`unresolved default expression for ${id}`);
    entries[id] = { default: p.value, description: q.value ?? '' };
    order.push(id);
  }
  return { entries, order, tableBytes: Buffer.byteLength(text), leaderDefault: consts.lde };
}

/** 2. tui flat keybind name -> cli dotted keybind name */
export function extractKeybindNameMap(buf) {
  const { text } = sliceObjectAt(buf, ANCHORS.nameMap);
  const map = JSON.parse(normalishToJson(text));
  return map;
}

/**
 * 3. non-keybind runtime defaults.
 * The resolver is `return{...i, attention:{notifications:i.attention?.notifications??!1,…}}`.
 * Every `?? literal` fallback is a real default; `tabs.mode`/`tabs.enabled` are
 * computed at runtime (environment dependent) and are recorded as such, not guessed.
 */
export function extractSettingDefaults(buf) {
  const { text, offset: open, end: close } = sliceObjectAt(buf, ANCHORS.defaultsResolver, 'enclosing-return');
  const defaults = {};
  const computed = [];
  const runtimeAdjustments = [];

  // group.field  e.g. i.attention?.volume ?? 0.4   /   i.cursor.style ?? "block"
  const nested = /i\.([A-Za-z_$][\w$]*)\??\.([A-Za-z_$][\w$]*)\s*\?\?\s*(("[^"]*"|'[^']*')|![01]|-?[0-9.]+|\{\})/g;
  for (const m of text.matchAll(nested)) {
    const [, group, field, lit] = m;
    defaults[`${group}.${field}`] = literalFromToken(lit);
  }
  // field  e.g. i.mouse ?? !0  /  new_location:i.session?.new_location ?? "launch"  (covered above)
  const flat = /([A-Za-z_$][\w$]*)\s*:\s*i\.([A-Za-z_$][\w$]*)\s*\?\?\s*(("[^"]*"|'[^']*')|![01]|-?[0-9.]+)/g;
  for (const m of text.matchAll(flat)) defaults[m[1]] = literalFromToken(m[3]);
  // computed at runtime, no static literal (environment / terminal dependent)
  for (const m of text.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*(c|\([^)]*\)\s*\?\s*[^,:]+)(?=[,}])/g)) computed.push(m[1]);
  for (const m of text.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*c===/g)) if (!computed.includes(m[1])) computed.push(m[1]);
  // unconditional runtime adjustments sit just before the resolver's return, not inside it
  const window = buf.slice(Math.max(0, open - 2000), close).toString('utf8');
  if (/g\["terminal\.suspend"\]\s*=\s*"none"/.test(window)) runtimeAdjustments.push({ path: 'keybinds.terminal.suspend', rule: 'set to "none" when unset' });
  if (/g\["input\.undo"\]/.test(window)) runtimeAdjustments.push({ path: 'keybinds.input.undo', rule: 'prepends ctrl+z when unset' });

  return { defaults, computed, runtimeAdjustments, bytes: Buffer.byteLength(text) };
}

/** 4. mini transcript defaults: `function A(t){return{thinking:t?.mini?.thinking??"show",…}}` */
export function extractMiniDefaults(buf) {
  const at = buf.indexOf(Buffer.from(ANCHORS.miniDefaults, 'utf8'));
  if (at < 0) throw new Error('mini defaults anchor not found');
  const open = buf.lastIndexOf(Buffer.from('{', 'utf8'), at);
  const close = matchingBracket(buf, open);
  const text = buf.slice(open, close + 1).toString('utf8');
  const defaults = {};
  for (const m of text.matchAll(/t\?\.mini\?\.([A-Za-z_$][\w$]*)\?\?\s*(("[^"]*")|![01]|-?[0-9.]+)/g)) {
    defaults[`mini.${m[1]}`] = literalFromToken(m[2]);
  }
  return defaults;
}

function literalFromToken(tok) {
  if (tok === '!0') return true;
  if (tok === '!1') return false;
  if (/^\{/.test(tok)) return {};
  if (/^-?[0-9.]+$/.test(tok)) return Number(tok);
  if (/^["']/.test(tok)) return tok.slice(1, -1);
  throw new Error('unsupported literal token: ' + tok);
}

/* ============================ docs page (cross-check) ============================ */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decodeEntities = s => s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (mm, e) => {
  if (ENTITIES[e] !== undefined) return ENTITIES[e];
  if (e[0] === '#') {
    const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(n) ? String.fromCodePoint(n) : mm;
  }
  return mm;
});
const cellText = html => decodeEntities(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

export function parseDocDefaults(html) {
  const out = {};
  for (const table of html.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    const rows = [];
    for (const r of table[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
      const cells = [];
      for (const c of r[0].matchAll(/<(th|td)[\s\S]*?<\/\1>/gi)) cells.push(cellText(c[0]));
      if (cells.length) rows.push(cells);
    }
    if (!rows.length) continue;
    const head = rows[0].map(c => c.toLowerCase());
    const iId = head.indexOf('id');
    const iDefault = head.indexOf('default');
    if (iId < 0 || iDefault < 0) continue;
    for (const row of rows.slice(1)) {
      const id = String(row[iId] || '').replace(/^`|`$/g, '').trim();
      if (!/^[a-z][a-z0-9_.-]*$/i.test(id)) continue;
      const raw = String(row[iDefault] || '').replace(/\s+/g, ' ').trim();
      const stripped = raw.replace(/^`|`$/g, '').trim();
      let value = stripped;
      if (stripped.startsWith('{')) {
        const end = stripped.indexOf('}');
        if (end > 0) { try { value = JSON.parse(stripped.slice(0, end + 1)); } catch { /* leave as text */ } }
      }
      out[id] = { default: value, raw };
    }
  }
  return out;
}

/** Both sources may express "this key and that key" as one string or a list; compare the set. */
export function normaliseBinding(v) {
  if (v && typeof v === 'object') return 'obj:' + JSON.stringify(v);
  const s = String(v ?? '').trim().replace(/,\s*$/, '');
  if (!s) return '';
  return s.split(',').map(x => x.trim()).filter(Boolean).join(',');
}

async function loadDocsHtml() {
  if (noDocs) return null;
  if (!process.env.OPENCODE_DOCS_FETCH && fs.existsSync(CACHE)) return fs.readFileSync(CACHE, 'utf8');
  try {
    const res = await fetch(DOCS_URL, { headers: { 'user-agent': 'bazer-console-tools/1' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();
    fs.mkdirSync(path.dirname(CACHE), { recursive: true });
    fs.writeFileSync(CACHE, html, 'utf8');
    return html;
  } catch (e) {
    if (fs.existsSync(CACHE)) return fs.readFileSync(CACHE, 'utf8');
    console.warn('docs cross-check skipped: ' + e.message);
    return null;
  }
}

/* ==================================== write ==================================== */

function schemaKeybindIds() {
  const cli = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, 'cli.schema.json'), 'utf8'));
  const kb = cli.properties.keybinds;
  const obj = kb.anyOf ? kb.anyOf.find(v => v.type === 'object') : kb;
  return Object.keys(obj.properties);
}

function stableText(obj) { return JSON.stringify(obj, null, 2) + '\n'; }

async function run() {
  const binPath = findBinary();
  if (!binPath) throw new Error('opencode binary not found — pass --bin=<path>');
  const buf = fs.readFileSync(binPath);
  const binarySha = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);

  const kb = extractKeybindDefaults(buf);
  const nameMap = extractKeybindNameMap(buf);
  const settings = extractSettingDefaults(buf);
  const mini = extractMiniDefaults(buf);

  const schemaIds = schemaKeybindIds();
  const schemaSet = new Set(schemaIds);

  // coverage checks — fail loudly instead of shipping a hole
  const missingDefaults = schemaIds.filter(id => !(id in kb.entries));
  const inBinaryNotSchema = Object.keys(kb.entries).filter(id => !schemaSet.has(id));
  const mapTargetsUnknown = Object.entries(nameMap).filter(([, v]) => !schemaSet.has(v));
  if (missingDefaults.length) throw new Error(`${missingDefaults.length} schema keybind ID(s) have no binary default:\n  ` + missingDefaults.join('\n  '));

  // docs cross-check
  const html = await loadDocsHtml();
  const docs = html ? parseDocDefaults(html) : {};
  const disagreements = [];
  for (const id of schemaIds) {
    if (!docs[id]) continue;
    if (normaliseBinding(docs[id].default) !== normaliseBinding(kb.entries[id].default)) {
      disagreements.push({ id, binary: kb.entries[id].default, docs: docs[id].default });
    }
  }

  const provenance = {
    generatedAt: new Date().toISOString(),
    binary: { path: binPath, bytes: buf.length, sha256_16: binarySha },
    anchors: ANCHORS,
    docsCrossCheck: { url: DOCS_URL, used: !!html, rows: Object.keys(docs).length },
  };

  const keybindDefaults = {
    $comment: 'GENERATED by tools/gen-opencode-facts.mjs — do not hand-edit. Defaults + descriptions come from the installed opencode binary.',
    provenance,
    report: {
      schemaKeybindCount: schemaIds.length,
      binaryTableEntries: kb.order.length,
      tableBytes: kb.tableBytes,
      leaderDefault: kb.leaderDefault,
      unresolved: missingDefaults,
      inBinaryButNotInSchema: inBinaryNotSchema,
      binaryVsDocsDisagreements: disagreements,
    },
    defaults: Object.fromEntries(schemaIds.map(id => [id, {
      default: kb.entries[id].default,
      shape: shapeOf(kb.entries[id].default),
      description: kb.entries[id].description,
    }])),
  };

  const translateKeybinds = {
    $comment: 'GENERATED by tools/gen-opencode-facts.mjs — tui.json flat keybind name -> cli.json dotted keybind name, from the installed opencode binary.',
    provenance,
    report: {
      mappedCount: Object.keys(nameMap).length,
      identityCount: Object.values(nameMap).filter((v, i) => Object.keys(nameMap)[i] === v).length,
      targetsUnknownToSchema: mapTargetsUnknown,
    },
    tuiToCli: nameMap,
    cliToTui: Object.fromEntries(Object.entries(nameMap).map(([k, v]) => [v, k])),
  };

  const settingDefaults = {
    $comment: 'GENERATED by tools/gen-opencode-facts.mjs — non-keybind runtime defaults, read from the installed opencode binary defaults resolver.',
    provenance,
    report: {
      defaultsFound: Object.keys(settings.defaults).length,
      computedAtRuntime: settings.computed,
      runtimeAdjustments: settings.runtimeAdjustments,
    },
    defaults: settings.defaults,
    miniDefaults: mini,
  };

  const outputs = {
    'keybind-defaults.json': stableText(keybindDefaults),
    'translate-keybinds.json': stableText(translateKeybinds),
    'setting-defaults.json': stableText(settingDefaults),
    'binary-facts.report.json': stableText({
      ...provenance,
      keybinds: keybindDefaults.report,
      translation: translateKeybinds.report,
      settings: settingDefaults.report,
    }),
  };

  if (checkOnly) {
    /* generatedAt changes every run, so compare the payload without it */
    const stable = obj => {
      const copy = JSON.parse(JSON.stringify(obj));
      delete copy.generatedAt;
      if (copy.provenance) delete copy.provenance.generatedAt;
      return JSON.stringify(copy, null, 2);
    };
    let drift = false;
    for (const [name, text] of Object.entries(outputs)) {
      const file = path.join(SCHEMA_DIR, name);
      const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (stable(JSON.parse(cur || 'null')) !== stable(JSON.parse(text))) { console.log('DRIFT ' + name); drift = true; }
    }
    console.log(drift ? 'FACTS DRIFT — regenerate' : 'OK facts in sync');
    process.exit(drift ? 1 : 0);
  }

  for (const [name, text] of Object.entries(outputs)) fs.writeFileSync(path.join(SCHEMA_DIR, name), text, 'utf8');

  console.log(`binary        : ${binPath}`);
  console.log(`                ${(buf.length / 1048576).toFixed(1)} MB · sha256:${binarySha}`);
  console.log(`keybinds      : ${Object.keys(keybindDefaults.defaults).length}/${schemaIds.length} resolved from a ${kb.tableBytes} B embedded table (leader=${kb.leaderDefault})`);
  console.log(`translation   : ${Object.keys(nameMap).length} tui->cli names (${translateKeybinds.report.identityCount} identity)`);
  console.log(`settings      : ${Object.keys(settings.defaults).length} defaults + ${Object.keys(mini).length} mini defaults; ${settings.computed.length} computed at runtime`);
  console.log(`docs check    : ${html ? Object.keys(docs).length + ' rows, ' + disagreements.length + ' disagreement(s)' : 'skipped'}`);
  for (const d of disagreements.slice(0, 8)) console.log(`                  ${d.id}: binary=${JSON.stringify(d.binary)} docs=${JSON.stringify(d.docs)}`);
  if (inBinaryNotSchema.length) console.log(`binary only   : ${inBinaryNotSchema.length} -> ${inBinaryNotSchema.slice(0, 6).join(', ')}`);
  if (mapTargetsUnknown.length) console.log(`map targets not in schema: ${mapTargetsUnknown.length} -> ${mapTargetsUnknown.slice(0, 6).map(x => x[1]).join(', ')}`);
}

function shapeOf(v) {
  if (v && typeof v === 'object') return 'object';
  if (v === false || (typeof v === 'string' && v.trim() === 'none')) return 'disabled';
  if (typeof v === 'string' && v.includes(',')) return 'list';
  return 'string';
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) run().catch(e => { console.error('gen-opencode-facts failed: ' + e.message); process.exit(2); });
