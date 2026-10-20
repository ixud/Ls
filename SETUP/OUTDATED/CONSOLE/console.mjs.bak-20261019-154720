#!/usr/bin/env node
/**
 * BAZER Console — ศูนย์ควบคุม config ของ OpenCode ในเครื่องนี้
 * Node built-ins only · zero dependencies · รันที่ 127.0.0.1 เท่านั้น (มี token กันการเรียกจากเว็บอื่น)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { applyAll as plPatchApplyAll, check as plannotatorCheck, plan as plannotatorPlan, syntaxBad as plannotatorSyntaxBad, syntaxOf as plannotatorSyntax } from './patch-plannotator.mjs';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runLockCheck } from './mode-lock.mjs';
import { createSettingsApi } from './tui-settings/src/api.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_VERSION = '1.5.0';

/* ---- per-OS platform adapter ---------------------------------------------------------
   darwin → CONSOLE/MACOS/platform.mjs · linux → CONSOLE/LINUX/platform.mjs
   win32  → null: ทุกจุดเรียกใช้จะคงโค้ด Windows เดิมไว้เป๊ะ (ไม่มีการ eval import บน win32) */
const PLAT = process.platform === 'darwin' ? await import('./MACOS/platform.mjs')
           : process.platform === 'linux'  ? await import('./LINUX/platform.mjs')
           : null;

/* ---------------------------------- config ---------------------------------- */

const DEFAULTS = {
  port: 4310,
  launchDir: '',          // เว้นว่าง = ตรวจอัตโนมัติ (หา opencode-serve.vbs ข้างโฟลเดอร์แอป) หรือให้ Setup สร้างให้
  buildDir: '',           // เว้นว่าง = ใช้โฟลเดอร์ bundle ที่แนบมากับแอป
  projectConfigs: [],     // เพิ่ม path ไฟล์ opencode.json ของโปรเจกต์ที่อยากให้ตรวจสถานะ plugin ได้
  modeLock: { on: false, effort: 'max', model: '' },  // สวิตช์ล็อก effort — เปิด/ปิดได้ในแท็บ "ล็อก & โมเดล"
};
const CFG_FILE = path.join(__dirname, 'console.config.json');
let CFG = { ...DEFAULTS };
try {
  if (fs.existsSync(CFG_FILE)) CFG = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CFG_FILE, 'utf8').replace(/^\uFEFF/, '')) };
  else fs.writeFileSync(CFG_FILE, JSON.stringify(DEFAULTS, null, 2));
} catch {}
// ตรวจอัตโนมัติแบบพกพา — ไม่ผูกกับ path ส่วนตัวของใคร
try {
  if (!CFG.buildDir) { const b = path.join(__dirname, 'bundle'); if (fs.existsSync(path.join(b, 'skills'))) CFG.buildDir = b; }
  if (!CFG.launchDir) { const c = path.resolve(__dirname, '..'); if (fs.existsSync(path.join(c, PLAT ? PLAT.SERVER_LAUNCHER : 'opencode-serve.vbs'))) CFG.launchDir = c; }
} catch {}
for (const a of process.argv.slice(2)) { const m = a.match(/^--port=(\d+)$/); if (m) CFG.port = +m[1]; }

const HOME = process.env.BAZER_CONSOLE_HOME || os.homedir();
const P = {
  config: path.join(HOME, '.config', 'opencode'),
  opencodeJsonc: path.join(HOME, '.config', 'opencode', 'opencode.jsonc'),
  serveRestricted: path.join(HOME, '.config', 'opencode', 'serve-restricted.jsonc'),
  cliJson: path.join(HOME, '.config', 'opencode', 'cli.json'),
  tuiJson: path.join(HOME, '.config', 'opencode', 'tui.json'),
  agentsMd: path.join(HOME, '.config', 'opencode', 'AGENTS.md'),
  agentsDir: path.join(HOME, '.config', 'opencode', 'agents'),
  commandsDir: path.join(HOME, '.config', 'opencode', 'commands'),
  skillsDir: path.join(HOME, '.agents', 'skills'),
  skillsLock: path.join(HOME, '.agents', '.skill-lock.json'),
  pstackModels: path.join(HOME, '.agents', 'pstack-models.md'),
  strayModels: path.join(HOME, '.agents', 'skills', 'pstack-models.md'),
  stateDir: path.join(HOME, '.local', 'state', 'opencode'),
  modelJson: path.join(HOME, '.local', 'state', 'opencode', 'model.json'),
  plannotatorDir: path.join(HOME, '.plannotator'),
  cacheNpm: path.join(HOME, '.cache', 'opencode', 'npm'),
  claudeSkills: path.join(HOME, '.claude', 'skills'),
  backups: path.join(__dirname, 'backups'),
  history: path.join(__dirname, 'history.tsv'),
  runtime: path.join(__dirname, 'console.runtime.json'),
  html: path.join(__dirname, 'console.html'),
};
/* ต้นทางเดียวของโฟลเดอร์ launch — ทุกที่ที่ต้องรู้ที่อยู่ไฟล์ launch ต้องเรียกฟังก์ชันนี้เท่านั้น
   launchDir ว่าง = ใช้โฟลเดอร์มาตรฐานเดียวกับที่ setup-apply ใช้ (~/opencode-launch)
   ห้ามปล่อยเป็นชื่อไฟล์ลอย ๆ (path.join('', name)) เพราะจะไปอิง CWD ของ process
   ทำให้ตัวตรวจบอก "ไฟล์ launch หาย" ทั้งชุดทั้งที่ไฟล์อยู่ครบในโฟลเดอร์มาตรฐาน */
function launchDirResolved() { return CFG.launchDir || path.join(HOME, 'opencode-launch'); }
const LAUNCH_NAMES = PLAT ? PLAT.LAUNCH_NAMES : {
  serveVbs: 'opencode-serve.vbs',
  lockDeepseekJsonc: 'lock-deepseek-only.jsonc',
  lockProviderJsonc: 'lock-provider-only.jsonc',
  lockDeepseekVbs: 'lock-deepseek-only.vbs',
  lockProviderVbs: 'lock-provider-only.vbs',
};
function makeLaunch() {
  const d = launchDirResolved();
  return Object.fromEntries(Object.entries(LAUNCH_NAMES).map(([k, f]) => [k, path.join(d, f)]));
}
const LAUNCH = makeLaunch();

/* flow + planningAgents — ต้นทางเดียวของรายการนี้ (แก้ที่นี่ที่เดียว) */
const PLAN_AGENTS = ['plan', 'buddha', 'arena', 'snack', 'poteto-mode'];
/* BAZER FLOW v2 — plugin ที่บังคับ gate + builder สำหรับ Plan Mode */
const FLOW_PLUGIN_ID = 'bazer-flow';
const FLOW_GATE_MARKER = '<!-- BAZER-FLOW-GATE: v2 -->';
/* keybind เริ่มต้นสำหรับ "copy latest" (messages.copy) — ตั้งให้เฉพาะเมื่อยังไม่มีค่า */
const DEFAULT_COPY_KEYBINDS = ['ctrl+alt+m', 'ctrl+alt+o'];
/* marker ในไฟล์โหมด Buddha: <!-- BAZER-FLOW: v2 --> — regex อ่านเลขเวอร์ชันเพื่อเทียบ bundle กับเครื่อง */
const FLOW_MARKER_RE = /<!--\s*BAZER-FLOW:\s*v(\d+)\s*-->/;
const BUNDLE = (() => {
  const local = path.join(__dirname, 'bundle');
  if (fs.existsSync(path.join(local, 'skills'))) return local;
  if (CFG.buildDir && fs.existsSync(path.join(CFG.buildDir, 'skills'))) return CFG.buildDir;
  return local;
})();
/* โฟลเดอร์เทมเพลตไฟล์ launch — Windows ใช้ launch-template/ (.vbs), macOS/Linux ใช้ของตัวเอง */
const LAUNCH_TPL_DIR = PLAT ? PLAT.templateDir() : path.join(__dirname, 'launch-template');
/* บน macOS/Linux สคริปต์ที่เพิ่งคัดลอกต้องมี exec bit ไม่งั้นดับเบิลคลิกไม่รัน (Windows: ไม่ต้องทำ) */
function chmodLaunchers(dir) {
  if (!PLAT) return;
  try {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      try { if (fs.statSync(p).isFile()) fs.chmodSync(p, 0o755); } catch {}
    }
  } catch {}
}
function patchConfig(patch) {
  try {
    const cur = fs.existsSync(CFG_FILE) ? JSON.parse(fs.readFileSync(CFG_FILE, 'utf8').replace(/^\uFEFF/, '')) : { ...DEFAULTS };
    fs.writeFileSync(CFG_FILE, JSON.stringify({ ...DEFAULTS, ...cur, ...patch }, null, 2));
    Object.assign(CFG, patch);
    if ('launchDir' in patch) Object.assign(LAUNCH, makeLaunch());
  } catch {}
}
const STARTUP_LNK = PLAT ? PLAT.startupEntryPath() : path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'OpenCode Server.lnk');
const SERVER_URL = 'http://127.0.0.1:4096';
const TOKEN = crypto.randomBytes(16).toString('hex');
const STARTED_AT = new Date().toISOString();

const DEEPSEEK_BLACKLIST = [
  'mimo-v2.6-pro','mimo-v2.5','grok-4.7','longcat-2.5-preview-free','glm-5.3-flash','qwen3.8-max','kimi-k3',
  'deepseek-v4-flash-vision-exp','longcat-2.0','space-bunny','minimax-m2.7','mimo-v2.5-pro','mimo-v2.6-flash',
  'minimax-m3','gpt-5.6-luna','qwen3.8-flash','glm-5.2','hy3','muse-spark-1.2-contributor','claude-haiku-5-5',
  'gpt-6-luna','deepseek-v4-pro','hy4-preview','muse-spark-1.3-contributor','step-5-preview-free','glm-5.3',
  'kimi-k2.7-code','grok-4.6','qwen3.7-plus','deepseek-v4-flash',
];

/* ---------------------------------- utils ---------------------------------- */

function readText(file) {
  try { return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''); } catch { return null; }
}
function writeAtomic(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, file);
}
function stripJsonc(text) {
  let out = '', i = 0, inStr = false;
  while (i < text.length) {
    const c = text[i], c2 = text[i + 1];
    if (inStr) { out += c; if (c === '\\') { out += c2 ?? ''; i += 2; continue; } if (c === '"') inStr = false; i++; continue; }
    if (c === '"') { inStr = true; out += c; i++; continue; }
    if (c === '/' && c2 === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && c2 === '*') { i += 2; while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++; i += 2; continue; }
    out += c; i++;
  }
  return out.replace(/,\s*([}\]])/g, '$1');
}
function parseJSONC(file) {
  const t = readText(file);
  if (t === null) return { ok: false, error: 'ไม่พบไฟล์', obj: null };
  try { return { ok: true, obj: JSON.parse(stripJsonc(t)) }; }
  catch (e) { return { ok: false, error: 'JSON ผิดรูปแบบ: ' + e.message, obj: null }; }
}
function jsonHeader(what) {
  return `// ${what} — จัดการโดย BAZER Console (สำรองอัตโนมัติทุกครั้งที่เขียน)\n`;
}
function ps(script, timeoutMs = 60000) {
  if (PLAT) return PLAT.ps(script, timeoutMs);
  return new Promise(resolve => {
    const p = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true });
    let out = '', err = '';
    const t = setTimeout(() => { try { p.kill(); } catch {} resolve({ code: -1, out, err: err + '\n(timeout)' }); }, timeoutMs);
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => err += d);
    p.on('close', code => { clearTimeout(t); resolve({ code, out, err }); });
    p.on('error', e => { clearTimeout(t); resolve({ code: -1, out, err: String(e) }); });
  });
}
async function fetchT(url, timeoutMs = 2000) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const text = await r.text();
    return { ok: r.ok, status: r.status, text };
  } catch (e) { return { ok: false, status: 0, text: '', error: String(e.message || e) }; }
}

/* backups + history */

function createBackup(label) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '-' + crypto.randomBytes(2).toString('hex');
  const dir = path.join(P.backups, stamp);
  const items = [];
  return {
    dir,
    add(p) {
      try {
        if (!fs.existsSync(p)) return;
        const idx = items.length;
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          const stored = `dir_${idx}`;
          fs.cpSync(p, path.join(dir, stored), { recursive: true });
          items.push({ orig: p, stored, kind: 'dir' });
        } else {
          const stored = `file_${idx}.bak`;
          fs.mkdirSync(dir, { recursive: true });
          fs.copyFileSync(p, path.join(dir, stored));
          items.push({ orig: p, stored, kind: 'file' });
        }
      } catch {}
    },
    finalize() {
      if (!items.length) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} return 0; }
      fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ label, time: new Date().toISOString(), files: items }, null, 2));
      pruneBackups();
      return items.length;
    },
  };
}
function pruneBackups(keep = 30) {
  try {
    const dirs = fs.readdirSync(P.backups).filter(d => fs.existsSync(path.join(P.backups, d, 'manifest.json'))).sort();
    for (const d of dirs.slice(0, Math.max(0, dirs.length - keep))) fs.rmSync(path.join(P.backups, d), { recursive: true, force: true });
  } catch {}
}
function logHistory(action, params, result, detail) {
  try {
    fs.mkdirSync(__dirname, { recursive: true });
    const line = [new Date().toISOString(), action, result, String(detail ?? '').replace(/[\t\r\n]+/g, ' ').slice(0, 300)].join('\t');
    fs.appendFileSync(P.history, line + '\n');
  } catch {}
}
function readHistory(limit = 60) {
  const t = readText(P.history);
  if (!t) return [];
  return t.split(/\r?\n/).filter(Boolean).slice(-limit).map(l => {
    const [time, action, result, detail] = l.split('\t');
    return { time: (time || '').replace('T', ' ').slice(0, 19), action, result, detail };
  });
}
function listBackups() {
  try {
    return fs.readdirSync(P.backups).filter(d => fs.existsSync(path.join(P.backups, d, 'manifest.json')))
      .sort().reverse().slice(0, 30)
      .map(d => {
        try { const m = JSON.parse(readText(path.join(P.backups, d, 'manifest.json'))); return { set: d, count: (m.files || []).length, label: m.label }; }
        catch { return { set: d, count: 0, label: '' }; }
      });
  } catch { return []; }
}
const ALLOWLIST_ROOTS = [P.config, safe(() => fs.realpathSync.native(P.config), null), path.join(HOME, '.agents'), P.stateDir, P.plannotatorDir, launchDirResolved()].filter(Boolean);
function isAllowedPath(p) {
  const r = path.resolve(p).toLowerCase();
  if (/[\\/]\.opencode[\\/]/.test(r)) return true; // ไฟล์ใน .opencode ของโปรเจกต์ (จัดการผ่านแท็บโปรเจกต์)
  return ALLOWLIST_ROOTS.some(root => { const b = path.resolve(root).toLowerCase(); return r === b || r.startsWith(b + path.sep); });
}

/* โปรเจกต์ที่เคยใช้ OpenCode — สแกนจากฐานข้อมูล SQLite ของ OpenCode */

let PROJECTS = { at: 0, items: [] };
function findProjectRoot(dir) {
  let d = path.resolve(dir);
  for (let i = 0; i < 6; i++) {
    try {
      if (fs.existsSync(path.join(d, '.opencode')) || fs.existsSync(path.join(d, 'opencode.json')) || fs.existsSync(path.join(d, 'opencode.jsonc')) || fs.existsSync(path.join(d, 'AGENTS.md')) || fs.existsSync(path.join(d, '.git'))) return d;
    } catch {}
    const parent = path.dirname(d);
    if (parent === d) break;
    d = parent;
  }
  return path.resolve(dir);
}
async function scanProjects() {
  const seen = new Map();
  const noise = d => {
    if (PLAT) return PLAT.isNoiseDir(d);
    const l = String(d).toLowerCase().replace(/\//g, '\\');
    return l.includes('\\appdata\\local\\temp') || l.includes('\\opencode-pi-') || /^[a-z]:\\?$/.test(l);
  };
  const add = (directory, sessions, lastUsed) => {
    if (!directory) return;
    const root = findProjectRoot(String(directory).replace(/\//g, '\\'));
    if (noise(root)) return;
    const key = root.toLowerCase();
    const it = seen.get(key) || { root, sessions: 0, lastUsed: 0, exists: fs.existsSync(root), hasOpencode: false, agents: [] };
    it.sessions += sessions || 0;
    it.lastUsed = Math.max(it.lastUsed, lastUsed || 0);
    seen.set(key, it);
  };
  const dbFile = path.join(HOME, '.local', 'share', 'opencode', 'opencode.db');
  if (!fs.existsSync(dbFile)) throw new Error('ไม่พบฐานข้อมูล OpenCode ที่ ' + dbFile);
  let DatabaseSync = null;
  try { ({ DatabaseSync } = await import('node:sqlite')); } catch {}
  if (!DatabaseSync) throw new Error('Node นี้ไม่มี node:sqlite — ต้องใช้ Node 22.5 ขึ้นไป');
  const db = new DatabaseSync(dbFile, { readOnly: true });
  try {
    const rows = db.prepare(
      "SELECT directory, COUNT(*) AS c, MAX(t) AS last FROM (" +
      " SELECT directory, time_updated AS t FROM session WHERE directory IS NOT NULL AND directory <> ''" +
      " UNION ALL" +
      " SELECT directory, time_updated AS t FROM session_v2 WHERE directory IS NOT NULL AND directory <> ''" +
      ") GROUP BY directory ORDER BY last DESC LIMIT 300").all();
    for (const r of rows) if (!noise(r.directory)) add(r.directory, r.c, r.last);
    try {
      const ps = db.prepare("SELECT worktree, time_active FROM project WHERE worktree IS NOT NULL AND worktree <> ''").all();
      for (const p of ps) if (!noise(p.worktree)) add(p.worktree, 0, p.time_active || 0);
    } catch {}
  } finally { try { db.close(); } catch {} }
  const items = [...seen.values()];
  for (const it of items) {
    it.hasOpencode = fs.existsSync(path.join(it.root, '.opencode'));
    const ad = path.join(it.root, '.opencode', 'agents');
    try {
      it.agents = fs.readdirSync(ad).filter(f => f.endsWith('.md') || f.endsWith('.md.disabled')).map(f => ({ file: f, disabled: f.endsWith('.disabled'), content: (readText(path.join(ad, f)) || '').slice(0, 30000) }));
    } catch { it.agents = []; }
  }
  items.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
  PROJECTS = { at: Date.now(), items: items.slice(0, 120) };
  return PROJECTS.items;
}
function projectOf(file) {
  const f = path.resolve(file).toLowerCase();
  return PROJECTS.items.find(p => f.startsWith(path.resolve(p.root).toLowerCase() + path.sep) && /[\\/]\.opencode[\\/]/i.test(f)) || null;
}

/* frontmatter helpers */

function editFrontmatter(md, fn) {
  const m = md.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!m) return null;
  const lines = m[2].split(/\r?\n/);
  const out = fn(lines);
  if (!out) return null;
  return md.slice(0, m.index) + m[1] + out.join('\n') + m[3] + md.slice(m.index + m[0].length);
}
function setAutoinvoke(md, hide) {
  return editFrontmatter(md, lines => {
    const isMeta = i => /^metadata:\s*$/.test(lines[i] || '');
    let mi = lines.findIndex(isMeta);
    let ki = lines.findIndex(l => /^\s+opencode\/autoinvoke\s*:/.test(l));
    if (hide) {
      if (ki >= 0) lines[ki] = '  opencode/autoinvoke: false';
      else if (mi >= 0) lines.splice(mi + 1, 0, '  opencode/autoinvoke: false');
      else { lines.push('metadata:'); lines.push('  opencode/autoinvoke: false'); }
    } else if (ki >= 0) {
      lines.splice(ki, 1);
      mi = lines.findIndex(isMeta);
      if (mi >= 0) {
        const next = lines[mi + 1];
        if (next === undefined || !/^\s+/.test(next)) lines.splice(mi, 1);
      }
    }
    return lines;
  });
}
function removeLegacyField(md) {
  return editFrontmatter(md, lines => lines.filter(l => !/^disable-model-invocation\s*:/.test(l)));
}
function skillMeta(md) {
  const fm = (md.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
  let desc = (fm.match(/^description:\s*(.+)$/m) || [])[1] || '';
  desc = desc.trim();
  if (/^>-?\s*$/.test(desc)) desc = '—';
  desc = desc.replace(/^["']|["']$/g, '').slice(0, 130);
  return {
    desc,
    hidden: /opencode\/autoinvoke\s*:\s*false/.test(fm),
    legacy: /^disable-model-invocation\s*:\s*true/m.test(fm),
  };
}

/* pstack-models: ดึงเฉพาะบล็อกค่าจริงจาก template (ไม่เอาคำอธิบาย/โค้ดเฟนซ์ติดมาด้วย) */

function pstackTemplateContent(base) {
  const tpl = readText(path.join(base || BUNDLE, 'config', 'pstack-models.template.md'));
  if (!tpl) return '# pStack model configuration\n# budget: large (xhigh)\n';
  const m = tpl.match(/```\r?\n([\s\S]*?)```/);
  return m ? m[1].replace(/\s+$/, '') + '\n' : tpl.replace(/\r\n/g, '\n');
}

/* mirrors — BAZERs-EXTENSION-* (สำเนาโหมดหลักให้โหมดอื่นเรียกใช้เป็น skill) */

const MIRRORS = [
  { id: 'advisor.md',     skill: 'BAZERs-EXTENSION-Advisor', name: 'Advisor' },
  { id: 'arena.md',       skill: 'BAZERs-EXTENSION-Arena',   name: 'Arena' },
  { id: 'bazer.md',       skill: 'BAZERs-EXTENSION-Bazer',   name: 'Bazer' },
  { id: 'buddha.md',      skill: 'BAZERs-EXTENSION-Buddha',  name: 'Buddha' },
  { id: 'poteto-mode.md', skill: 'BAZERs-EXTENSION-Poteto',  name: 'Poteto' },
  { id: 'snack.md',       skill: 'BAZERs-EXTENSION-Snack',   name: 'Snack' },
];
function splitAgentFrontmatter(md) {
  const m = String(md).match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return m ? String(md).slice(m[0].length).trim() : String(md).trim();
}
function findAgentSource(id) {
  const a = path.join(P.agentsDir, id), d = a + '.disabled';
  const ip = fs.existsSync(a) ? a : (fs.existsSync(d) ? d : null);
  if (ip) { const t = readText(ip); if (t !== null) return { content: t, from: 'installed' }; }
  const b = path.join(BUNDLE, 'agents', id);
  if (fs.existsSync(b)) { const t = readText(b); if (t !== null) return { content: t, from: 'bundle' }; }
  return null;
}
function buildMirrorContent(m, agentMd) {
  const body = splitAgentFrontmatter(agentMd);
  const desc = `โหมด ${m.name} ฉบับ mirror (BAZERs-EXTENSION) — โหลดเมื่อถูกเรียกจากโหมดอื่นเท่านั้น เช่น Buddha Mode เรียก Arena · ต้นทาง agents/${m.id} · อัปเดตผ่านปุ่มอัพเดต mirror ใน BAZER Console`;
  return [
    '---',
    `name: ${m.skill}`,
    `description: "${desc}"`,
    'metadata:',
    '  opencode/autoinvoke: false',
    '---',
    '',
    `# ${m.skill} — ${m.name} Mode (mirror)`,
    '',
    `ไฟล์นี้เป็นสำเนา (mirror) ของโหมด ${m.name} จาก agents/${m.id} — ห้ามแก้ไฟล์นี้ตรง ๆ ให้แก้ที่ต้นทางแล้วกด "อัพเดต mirror" ใน BAZER Console`,
    '',
    `วิธีใช้: โหลด skill นี้ด้วย ID ${m.skill} แล้วทำตามเนื้อหาทั้งหมดด้านล่าง เสมือนสลับเข้าสู่โหมด ${m.name} — สิทธิ์เครื่องมือจริงยังเป็นของโหมดที่รันอยู่ (ถ้าโหลด skill ไม่ได้ ให้อ่านไฟล์นี้ตรง ๆ)`,
    '',
    body,
    '',
  ].join('\n');
}
function mirrorStatus() {
  return MIRRORS.map(m => {
    const src = findAgentSource(m.id);
    const cur = readText(path.join(P.skillsDir, m.skill, 'SKILL.md'));
    const synced = !!(src && cur !== null && cur === buildMirrorContent(m, src.content));
    return { id: m.id, name: m.name, skill: m.skill, agentExists: !!src, source: src ? src.from : null, exists: cur !== null, synced };
  });
}

/* BAZER FLOW v2 — สถานะติดตั้งของ plugin + builder + gate (อ่านของจริง ไม่เชื่อ config) */
function flowPluginDir() { return path.join(P.config, 'plugins', FLOW_PLUGIN_ID); }
function flowBuilderFile() { return path.join(P.agentsDir, 'builder.md'); }
function flowRegistered() {
  try {
    const obj = parseJSONC(P.opencodeJsonc).obj || {};
    const arr = obj.plugins || obj.plugin || [];
    return Array.isArray(arr) && arr.some(x => String(typeof x === 'string' ? x : x?.package || '').includes(FLOW_PLUGIN_ID));
  } catch { return false; }
}
/** Plannotator approve button → Buddha: อ่าน patch state จาก html จริงด้วย invariant ของ patch-plannotator
 *  (แหล่งเดียวกับ --check ไม่ hardcode สตริงใน Console อีก) · plan() คืน state ต่อจุด: todo|applied|na
 *  patched = invariant ระดับไฟล์ครบ (check().recognised && check().ok) + bundle ใน <script type="module"> compile ผ่าน
 *  — ไม่ใช่แค่ "5 จุด applied": ไฟล์ที่โครงปุ่มพัง (span ชื่อ agent หาย / children array ไม่ปิด) หรือไบต์พัง
 *  ต้องไม่ถูกนับเป็น patched (เกณฑ์ชุดเดียวกับ `node patch-plannotator.mjs --check`)
 *  stale = มีจุด todo (แพตช์ซ่อมได้ด้วย patch-plannotator.mjs) · unknown = ที่เหลือ (มีจุด na / โครงไม่ครบจนซ่อมด้วยสคริปต์ไม่ได้ / อ่านไม่รู้เรื่อง)
 *  ทุกทางคืนค่าได้ — ไม่ throw ออกมาถึงผู้ใช้ (ผู้เรียกยังห่อ safe() อีกชั้น) */
function plannotatorPatchState() {
  const roots = [
    path.join(HOME, '.cache', 'opencode', 'npm', '@plannotator'),
    path.join(HOME, '.cache', 'opencode', 'packages', '@plannotator'),
  ];
  const found = [];
  const walk = (dir, depth = 0) => {
    if (depth > 6) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (e.name === 'plannotator.html') found.push(p);
    }
  };
  for (const r of roots) walk(r);
  const naIds = new Set();
  let stale = 0, patched = 0, unknown = 0;
  for (const f of found) {
    try {
      const text = readText(f) || '';
      const points = plannotatorPlan(text);
      const todo = points.filter(p => p.state === 'todo').length;
      const na = points.filter(p => p.state === 'na');
      for (const s of na) naIds.add(s.patch.id);
      const inv = plannotatorCheck(text);
      /* เกณฑ์เดียวกับ `--check` (checkAll): invariant required ครบ + bundle ใน <script type="module"> compile ผ่าน
         (syntaxBad ข้าม 'no-module' = ไฟล์ที่ไม่ใช่หน้า Plannotator) — ไฟล์ที่ไบต์พังจะไม่ถูกเรียกว่า "ครบ" */
      const syntaxOk = !plannotatorSyntaxBad(plannotatorSyntax(text));
      if (inv.recognised && inv.ok && syntaxOk) patched++;
      else if (todo) stale++;
      else unknown++;
    } catch { unknown++; }
  }
  return { total: found.length, patched, stale, unknown, notInVersion: [...naIds] };
}
function gatherFlowkit() {
  const pluginFile = fs.existsSync(path.join(flowPluginDir(), 'index.ts'));
  const builderPath = flowBuilderFile();
  const builderText = readText(builderPath) || readText(builderPath + '.disabled') || '';
  const mode = (builderText.match(/^mode:\s*(.+)$/m) || [])[1]?.trim() || '';
  const agentsMd = readText(P.agentsMd) || '';
  const bundleBud = readText(path.join(BUNDLE, 'agents', 'buddha.md')) || '';
  return {
    on: flowRegistered(),
    pluginFile,
    registered: flowRegistered(),
    builder: fs.existsSync(builderPath),
    builderDisabled: fs.existsSync(builderPath + '.disabled'),
    builderMode: mode,
    gateMarker: agentsMd.includes(FLOW_GATE_MARKER),
    version: (bundleBud.match(FLOW_MARKER_RE) || [])[1] || null,
    plPatch: safe(plannotatorPatchState, { total: 0, stale: 0, patched: 0, unknown: 0, notInVersion: [] }),
  };
}
/** Real load proof: the host must list bazer.flow, not just have the file registered. */
async function flowPluginLoaded() {
  try {
    const r = await ps('opencode plugin list', 12000);
    const text = (r.out || '') + (r.err || '');
    return /\bbazer\.flow\b/.test(text) ? true : false;
  } catch { return null; }
}

/* ---------------------------------- gather ---------------------------------- */

let cliVersionCache = { v: null, at: 0 };
let availModelsCache = { v: null, at: 0 };
async function getCliVersion() {
  if (cliVersionCache.v && Date.now() - cliVersionCache.at < 5 * 60 * 1000) return cliVersionCache.v;
  const r = await ps('opencode --version', 20000);
  const m = (r.out || '').match(/(\d+\.\d+\.\d+)/);
  cliVersionCache = { v: m ? m[1] : (r.out || '').trim().slice(0, 40) || null, at: Date.now() };
  return cliVersionCache.v;
}

function gatherLock() {
  const t = readText(P.serveRestricted);
  if (t === null) return { mode: 'none', enabledProviders: [], blacklist: [], path: P.serveRestricted };
  const { ok, obj } = parseJSONC(P.serveRestricted);
  if (!ok || !obj) return { mode: 'custom', enabledProviders: [], blacklist: [], path: P.serveRestricted };
  const ep = obj.enabled_providers || [];
  const bl = (obj.provider && obj.provider['opencode-go'] && obj.provider['opencode-go'].blacklist) || [];
  let mode = 'custom';
  if (!ep.length && !bl.length) mode = 'off';
  else if (ep.length === 1 && ep[0] === 'opencode-go' && bl.length === 0) mode = 'provider-only';
  else if (ep.length === 1 && ep[0] === 'opencode-go' && sameSet(bl, DEEPSEEK_BLACKLIST)) mode = 'deepseek-only';
  return { mode, enabledProviders: ep, blacklist: bl, path: P.serveRestricted };
}
function sameSet(a, b) { const A = new Set(a), B = new Set(b); if (A.size !== B.size) return false; for (const x of A) if (!B.has(x)) return false; return true; }

function gatherModel() {
  const { obj } = parseJSONC(P.opencodeJsonc);
  const model = typeof obj?.model === 'string' ? obj.model
    : (obj?.model?.providerID ? `${obj.model.providerID}/${obj.model.model}` : '');
  const [prov, ...rest] = model.split('/');
  const mid = rest.join('/');
  /* OpenCode 2 normalize คีย์ V1 (provider) → providers ให้เอง — ตัวอ่านต้องรับทั้งสองรูป ไม่งั้นรายงานเท็จ */
  const md = obj?.providers?.[prov]?.models?.[mid] || obj?.provider?.[prov]?.models?.[mid] || {};
  const rawVariants = md?.variants;
  const variants = Array.isArray(rawVariants)
    ? Object.fromEntries(rawVariants.map(v => [v?.id, v?.settings || {}]))
    : (rawVariants && typeof rawVariants === 'object' ? rawVariants : {});
  const ids = Object.keys(variants);
  const variantEfforts = ids.map(id => variants[id]?.reasoningEffort).filter(Boolean);
  const effort = md?.options?.reasoningEffort || md?.settings?.reasoningEffort || variantEfforts[0] || 'default';
  let modelJsonVariant = null;
  const mj = parseJSONC(P.modelJson);
  if (mj.ok && mj.obj?.variant) modelJsonVariant = mj.obj.variant[model] || null;
  const mismatch = !!model && modelJsonVariant !== null && modelJsonVariant !== effort;
  const variantsMissing = ids.length === 0;
  const variantDrift = ids.length > 0 && (variantEfforts.length !== ids.length || new Set(variantEfforts).size > 1);
  return { current: model, effort, variants, variantEfforts, variantsMissing, variantDrift, modelJsonVariant, mismatch };
}

function gatherSkills() {
  const items = [];
  let lockObj = null;
  const t = readText(P.skillsLock);
  if (t) { try { lockObj = JSON.parse(t); } catch {} }
  let dirs = [];
  try { dirs = fs.readdirSync(P.skillsDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name); } catch {}
  for (const name of dirs) {
    const f = path.join(P.skillsDir, name, 'SKILL.md');
    const md = readText(f);
    if (md === null) continue;
    const meta = skillMeta(md);
    let sourceLabel = 'อื่น ๆ';
    const src = lockObj?.skills?.[name]?.source || '';
    if (src.includes('pstack')) sourceLabel = 'pStack';
    else if (src.includes('plannotator')) sourceLabel = 'plannotator';
    else if (src) sourceLabel = src.split('/').pop().slice(0, 18);
    items.push({ name, sourceLabel, hidden: meta.hidden, legacy: meta.legacy, desc: meta.desc });
  }
  items.sort((a, b) => a.name.localeCompare(b.name));
  return {
    total: items.length,
    hiddenCount: items.filter(i => i.hidden).length,
    legacyCount: items.filter(i => i.legacy).length,
    items,
  };
}

function gatherAgents() {
  let files = [];
  try { files = fs.readdirSync(P.agentsDir); } catch {}
  const out = [];
  for (const f of files) {
    if (!f.endsWith('.md') && !f.endsWith('.md.disabled')) continue;
    const disabled = f.endsWith('.disabled');
    const md = readText(path.join(P.agentsDir, f)) || '';
    const fm = (md.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
    const color = (fm.match(/^color:\s*(.+)$/m) || [])[1]?.trim() || '';
    out.push({
      file: f,
      disabled,
      desc: ((fm.match(/^description:\s*(.+)$/m) || [])[1] || '').slice(0, 110),
      mode: (fm.match(/^mode:\s*(.+)$/m) || [])[1]?.trim() || '',
      color,
      colorOk: !color || /^["']?#[0-9a-fA-F]{6}["']?$/.test(color),
      content: (md || '').slice(0, 30000),
    });
  }
  return out;
}

function gatherCommands() {
  let files = [];
  try { files = fs.readdirSync(P.commandsDir); } catch {}
  return files.filter(f => f.endsWith('.md') || f.endsWith('.md.disabled'))
    .map(f => ({ file: f, disabled: f.endsWith('.disabled') }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

function gatherPlannotator() {
  const configs = [{ path: P.opencodeJsonc, global: true }, ...CFG.projectConfigs.map(p => ({ path: p, global: false }))]
    .map(c => {
      const { ok, obj } = parseJSONC(c.path);
      const arr = obj?.plugin || obj?.plugins || [];
      const has = Array.isArray(arr) && arr.some(x => String(typeof x === 'string' ? x : x?.package || '').includes('plannotator'));
      return { path: c.path, global: c.global, has, exists: ok };
    });
  let cache = [];
  try {
    const base = path.join(P.cacheNpm, '@plannotator', 'opencode@latest');
    cache = fs.readdirSync(base, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => {
      const pkg = parseJSONC(path.join(base, d.name, 'node_modules', '@plannotator', 'opencode', 'package.json'));
      return { version: pkg.ok ? pkg.obj.version : '?', dir: d.name };
    }).reverse();
  } catch {}
  const dupeNames = [];
  try {
    const claude = fs.readdirSync(P.claudeSkills, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
    for (const n of claude) if (fs.existsSync(path.join(P.skillsDir, n, 'SKILL.md'))) dupeNames.push(n);
  } catch {}
  const cfgPath = path.join(P.plannotatorDir, 'config.json');
  const cfgTxt = readText(cfgPath);
  let cfgParsed = null; try { cfgParsed = cfgTxt ? JSON.parse(cfgTxt) : null; } catch {}
  const prefsPath = path.join(P.plannotatorDir, 'install-prefs');
  const prefsTxt = readText(prefsPath);
  return {
    configs, cache, cliPath: null, cliOk: false, dupes: dupeNames,
    configJson: { path: cfgPath, exists: cfgTxt !== null, content: cfgTxt || '', parsed: cfgParsed },
    prefs: { path: prefsPath, exists: prefsTxt !== null, content: prefsTxt || '' },
  };
}

async function gatherPlannotatorCli(pl) {
  const r = PLAT ? await PLAT.which('plannotator') : await ps('where.exe plannotator', 10000);
  const line = (r.out || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0];
  pl.cliPath = line || null;
  pl.cliOk = !!line;
  return pl;
}

/* build */

function walkBuild() {
  const B = CFG.buildDir;
  const out = { exists: fs.existsSync(B), files: [], counts: { new: 0, diff: 0, same: 0 }, stray: fs.existsSync(P.strayModels), byCat: { skills: 0, agents: 0, commands: 0, config: 0 } };
  if (!out.exists) return out;
  const cmp = (rel, src, dst) => {
    let status = 'new';
    if (fs.existsSync(dst)) status = readText(src) === readText(dst) ? 'same' : 'diff';
    out.counts[status]++;
    out.files.push({ path: rel, status });
    return status;
  };
  try {
    for (const d of fs.readdirSync(path.join(B, 'skills'), { withFileTypes: true }).filter(x => x.isDirectory())) {
      const src = path.join(B, 'skills', d.name, 'SKILL.md');
      if (!fs.existsSync(src)) continue;
      cmp(`skills/${d.name}`, src, path.join(P.skillsDir, d.name, 'SKILL.md'));
      out.byCat.skills++;
    }
  } catch {}
  try {
    for (const f of fs.readdirSync(path.join(B, 'agents')).filter(x => x.endsWith('.md'))) {
      cmp(`agents/${f}`, path.join(B, 'agents', f), path.join(P.agentsDir, f));
      out.byCat.agents++;
    }
  } catch {}
  try {
    for (const f of fs.readdirSync(path.join(B, 'commands')).filter(x => x.endsWith('.md'))) {
      cmp(`commands/${f}`, path.join(B, 'commands', f), path.join(P.commandsDir, f));
      out.byCat.commands++;
    }
  } catch {}
  const tpl = path.join(B, 'config', 'pstack-models.template.md');
  if (fs.existsSync(tpl)) {
    const status = fs.existsSync(P.pstackModels) ? 'exists' : 'new';
    out.files.push({ path: 'config/pstack-models.template.md → ~/.agents/pstack-models.md', status });
    out.byCat.config++;
  }
  out.diffCount = out.files.filter(f => f.status === 'diff').length;
  return out;
}

/* ---------------------------------- verify ---------------------------------- */

async function runVerify() {
  const items = [];
  const add = (level, label, detail) => items.push({ level, label, detail });
  const cliV = await getCliVersion();

  // 1 config parse
  {
    const files = [
      ['opencode.jsonc', P.opencodeJsonc, true], ['serve-restricted.jsonc', P.serveRestricted, true],
      ['cli.json', P.cliJson, false], ['model.json', P.modelJson, false],
      ...(CFG.projectConfigs[0] ? [[CFG.projectConfigs[0], CFG.projectConfigs[0], false]] : []),
      ['lock-deepseek-only.jsonc', LAUNCH.lockDeepseekJsonc, false], ['lock-provider-only.jsonc', LAUNCH.lockProviderJsonc, false],
    ];
    const bad = [];
    for (const [name, file, must] of files) {
      if (!fs.existsSync(file)) { if (must) bad.push(`${name} หาย`); continue; }
      const r = parseJSONC(file);
      if (!r.ok) bad.push(`${name}: ${r.error}`);
    }
    add(bad.length ? 'fail' : 'ok', 'ไฟล์ config อ่านได้ทั้งหมด', bad.length ? bad.join(' · ') : 'parse ผ่านทุกไฟล์');
  }

  // 1b config root — จริงหรือเป็นลิงก์ (junction): ต้องรู้ว่าไฟล์จริงอยู่ที่ไหน
  {
    const real = safe(() => fs.realpathSync.native(P.config), '');
    if (real && path.resolve(real).toLowerCase() !== path.resolve(P.config).toLowerCase())
      add('info', 'config root เป็นลิงก์ (junction)', P.config + ' → ' + real + ' — ไฟล์จริงอยู่ปลายทาง path เดียวกันทั้งสองทาง (ไม่ใช่สำเนา)');
  }

  // 2 server
  let serverV = null;
  {
    const r = await fetchT(SERVER_URL + '/global/health', 2500);
    if (r.ok) { try { serverV = JSON.parse(r.text).version; } catch { serverV = '?'; } }
    const pinnedV1 = !!(serverV && cliV && String(serverV).startsWith('1.') && String(cliV).startsWith('2.'));
    if (!r.ok) add('fail', 'Server 4096', 'ไม่ตอบสนอง — Cline จะต่อไม่ได้ (ลองปุ่มรีสตาร์ทในแท็บ Server)');
    else if (pinnedV1) add('ok', 'Server 4096 — ปักหมุด v1', `server v${serverV} (ปักหมุดให้ Cline ใช้ API ชุด V1) · TUI v${cliV}`);
    else if (serverV && cliV && serverV !== cliV) add('warn', 'เวอร์ชัน server ไม่ตรงกับ CLI', `server ${serverV} · CLI ${cliV} — ตัวที่รันอยู่อาจเป็นตัวเก่า ควรรีสตาร์ทและทดสอบล็อกใหม่`);
    else add('ok', 'Server 4096', 'ทำงานอยู่ v' + (serverV || '?'));
    if (serverV && String(serverV).startsWith('2')) add('warn', 'server เป็น V2 — blacklist (ฟิลด์ V1) อาจถูกมองข้าม', 'ล็อกที่แน่นอนคือ enabled_providers; ทดสอบยิงชื่อโมเดลอื่นผ่าน Cline ดู');
  }

  // 3 lock file baseline
  const lock = gatherLock();
  {
    if (lock.mode === 'none') add('fail', 'ไฟล์ล็อก', 'ไม่พบ serve-restricted.jsonc');
    else if (lock.mode === 'off') add('warn', 'โหมดล็อก = ปลดล็อก', 'ไม่มีการจำกัด provider/โมเดลฝั่ง server');
    else if (!lock.enabledProviders.includes('opencode-go')) add('warn', 'enabled_providers ไม่มี opencode-go', JSON.stringify(lock.enabledProviders));
    else add('ok', 'ไฟล์ล็อก', `${lock.mode} · ${lock.blacklist.length} โมเดลถูกบล็อก`);
  }

  // 4 lock effective (probe /provider)
  {
    const r = await fetchT(SERVER_URL + '/provider', 3000);
    if (!r.ok) add('warn', 'ตรวจล็อกจริงจาก server', 'ดึง /provider ไม่ได้ — ตรวจด้วยตา: เปิด http://127.0.0.1:4096/provider');
    else {
      let j = null; try { j = JSON.parse(r.text); } catch {}
      if (!j) add('warn', 'ตรวจล็อกจริงจาก server', 'รูปแบบผลลัพธ์ไม่คุ้น — เช็คด้วยตาได้ที่ /provider');
      else {
        const providers = extractProviders(j);
        const models = extractModelsFor(j, 'opencode-go');
        if (lock.mode === 'deepseek-only') {
          if (providers.length > 1) add('fail', 'ล็อก provider ไม่ทำงาน', 'server เห็น provider: ' + providers.join(', '));
          else if (models.length > 1) add('warn', 'ล็อกโมเดลอาจไม่ทำงาน', `server ยังเห็น ${models.length} โมเดลของ opencode-go${serverV && String(serverV).startsWith('2') ? ' (คาดว่าเป็นเพราะ V2 ไม่รองรับ blacklist)' : ''}`);
          else add('ok', 'ล็อกมีผลจริง', `server เห็น provider เดียว + ${models.length || '?'} โมเดล`);
        } else add('info', 'ตรวจล็อกจริงจาก server', `providers: ${providers.join(', ') || '?'} · opencode-go models: ${models.length}`);
      }
    }
  }

  // 5 effort sync + mode lock
  {
    const m = gatherModel();
    const lock = (() => { try { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8').replace(/^\uFEFF/, '')).modeLock || null; } catch { return null; } })();
    const lockOn = !!lock?.on;
    const want = lock?.effort || 'max';
    if (!lockOn) {
      add('info', 'mode lock ปิด', `effort ${m.effort} · model.json ${m.modelJsonVariant ?? '?'} — เปิดสวิตช์ในแท็บ "ล็อก & โมเดล" เพื่อบังคับ effort`);
    } else if (m.variantsMissing || m.variantDrift || m.mismatch || m.effort !== want) {
      add('fail', 'effort ไม่ล็อก', `config ${m.effort} · model.json ${m.modelJsonVariant ?? '?'} · variants ${Object.keys(m.variants).length} — กด "ล็อกเลย" ในแท็บ ล็อก & โมเดล`);
    } else {
      add('ok', 'effort ล็อกอยู่', `model ${m.current} · effort ${m.effort} · variants ${Object.keys(m.variants).length}`);
    }

  // 5b — ตัวตรวจเดียวกับ CLI (mode-lock.mjs) เพื่อไม่ให้มีตรรกะสองชุด
    const ml = safe(() => runLockCheck(), null);
    if (!ml) add('warn', 'mode lock ตรวจไม่ได้', 'mode-lock.mjs อ่านไม่สำเร็จ');
    else if (ml.ok) add('ok', 'mode lock ครบ', ml.summary);
    else {
      const fails = ml.items.filter(i => i.status === 'FAIL').map(i => `${i.rule}: ${i.detail}`);
      add(ml.lockOn ? 'fail' : 'warn', 'mode lock หลุด', fails.join(' · '));
    }
  }

  // 5c — TUI settings: OpenCode 2 อ่าน tui.json (cli.json เป็นของ V1)
  {
    if (fs.existsSync(P.tuiJson)) add('ok', 'TUI config (tui.json)', P.tuiJson);
    else if (fs.existsSync(P.cliJson)) add('warn', 'cli.json ถูกเมินใน OpenCode 2', 'TUI อ่าน ~/.config/opencode/tui.json — กด "ย้าย cli.json → tui.json"');
    else add('info', 'ยังไม่มี tui.json', 'TUI ใช้ค่า default');
  }

  // 5d — keybind เริ่มต้น (copy latest) + shortcut
  {
    const tj = safe(() => parseJSONC(P.tuiJson), { ok: false, obj: null });
    const kb = tj && tj.obj && tj.obj.keybinds ? tj.obj.keybinds.messages_copy : null;
    if (!Array.isArray(kb) || !kb.length) add('warn', 'keybind copy latest', 'ยังไม่ได้ตั้งค่า — กด "ติดตั้งเสร็จสรรพ" หรือ "ซิงค์ทั้งหมด"');
    else if (kb.join(',') === DEFAULT_COPY_KEYBINDS.join(',')) add('ok', 'keybind copy latest', kb.join(', '));
    else add('info', 'keybind copy latest (แก้เอง)', kb.join(', '));

    const root = path.resolve(__dirname, '..');
    const vbs = PLAT ? PLAT.portableLauncherPath(root) : path.join(root, 'BAZER CONSOLE - WINDOW (Windows).vbs');
    const link = PLAT ? PLAT.shortcutPath(root) : path.join(root, 'BAZER CONSOLE - WINDOW (Windows).lnk');
    if (!fs.existsSync(vbs)) add('warn', 'shortcut BAZER CONSOLE', 'ไม่พบ portable launcher (' + path.basename(vbs) + ')');
    else if (!fs.existsSync(link)) add('info', 'shortcut BAZER CONSOLE', 'มี launcher แล้ว แต่ยังไม่มี shortcut — กดติดตั้ง/ซิงค์');
    else add('ok', 'shortcut BAZER CONSOLE', 'มี shortcut + portable launcher');
  }

  // 6 skills
  {
    const s = gatherSkills();
    if (s.legacyCount) add('warn', `skills ติดฟิลด์เก่า ${s.legacyCount} ตัว`, 'V2 เคารพ disable-model-invocation → skill ถูกซ่อนจากโมเดล (แก้ได้ในแท็บ pStack)');
    else add('ok', 'skills ไม่มีฟิลด์เก่าที่ซ่อน', `ทั้งหมด ${s.total} ตัว`);
    if (s.hiddenCount) add('info', `skills ถูกตั้งซ่อนจากโมเดล ${s.hiddenCount} ตัว`, 'ตั้งใจซ่อน (autoinvoke: false) — โหลดด้วย @ชื่อ ได้');
  }

  // 7 agents
  {
    const ag = gatherAgents().filter(a => !a.disabled);
    const badColor = ag.filter(a => a.colorOk === false);
    if (badColor.length) add('fail', 'agent color ไม่ใช่ hex (V2 จะทิ้ง agent)', badColor.map(a => a.file + ' → ' + a.color).join(' · '));
    else add('ok', 'agent frontmatter ผ่าน', `${ag.length} ตัว`);
  }

  // 7b planningAgents ของ Plannotator
  {
    try {
      const arrs = parseJSONC(P.opencodeJsonc).obj || {};
      const plist = arrs.plugins || arrs.plugin || [];
      let pa = [];
      for (const x of (Array.isArray(plist) ? plist : [])) { const o = Array.isArray(x) ? x[1] : x?.options; if (o?.planningAgents) { pa = o.planningAgents; break; } }
      const need = PLAN_AGENTS.filter(n => n !== 'plan');
      const miss = need.filter(n => !pa.includes(n));
      if (!pa.length) add('warn', 'planningAgents ของ Plannotator', 'ไม่พบค่า — กดเปิด/บันทึกปลั๊กอินในแท็บ Plannotator เพื่อเขียนใหม่');
      else if (miss.length) add('warn', 'planningAgents ยังขาดโหมด', miss.join(', ') + ' — เปิดปลั๊กอินใหม่ในแท็บ Plannotator');
      else add('ok', 'planningAgents ครบตามโหมดจริง', pa.join(', '));
    } catch {}
  }

  // 7c mirror โหมด (BAZERs-EXTENSION-*)
  {
    const ms = safe(mirrorStatus, []);
    const bad = ms.filter(x => !x.synced);
    if (!bad.length) add('ok', 'mirror โหมด (BAZERs-EXTENSION-*)', `${ms.length} ตัวตรงกับต้นทาง`);
    else add('warn', `mirror โหมดต้องอัพเดต ${bad.length} ตัว`, bad.map(b => b.name).join(', ') + ' — กด "อัพเดต mirror" ในแท็บ Buddha');
  }

  // 7d BAZER FLOW (marker ต้องตรงกันระหว่าง bundle กับไฟล์ที่ติดตั้ง)
  {
    const bBud = readText(path.join(BUNDLE, 'agents', 'buddha.md')) || '';
    const iBud = readText(path.join(P.agentsDir, 'buddha.md')) || '';
    const bv = (bBud.match(FLOW_MARKER_RE) || [])[1] || null;
    const iv = (iBud.match(FLOW_MARKER_RE) || [])[1] || null;
    if (!bv) add('warn', 'BAZER FLOW', 'ไม่พบ marker ใน bundle/agents/buddha.md');
    else if (iv !== bv) add('warn', `BAZER FLOW v${bv}`, `โหมด Buddha ในเครื่อง${iv ? ' เป็น v' + iv : ' ยังไม่มี marker'} — กด "ซิงค์ทั้งหมด" ที่แท็บภาพรวม`);
    else add('ok', `BAZER FLOW v${bv}`, 'โหมด Buddha ตรงกับ bundle (สเปค: FLOW.md)');
  }

  // 7d2 BAZER FLOW v2 — kernel (plugin) + builder + gate ที่บังคับจริง
  {
    const fk = safe(gatherFlowkit, { on: false, pluginFile: false, registered: false, builder: false, builderMode: '', gateMarker: false, version: null });
    const bundleV2 = fk.version === '2';
    const loaded = fk.pluginFile && fk.registered ? await flowPluginLoaded() : null;
    if (fk.pluginFile && fk.registered && loaded === true) add('ok', 'BAZER FLOW v2 · kernel', 'ปลั๊กอิน bazer-flow ติดตั้ง ลงทะเบียน และโหลดจริง (opencode plugin list)');
    else if (fk.pluginFile && fk.registered) add('warn', 'BAZER FLOW v2 · kernel ยังไม่โหลด', loaded === false ? 'ลงทะเบียนแล้วแต่ host ยังไม่โหลด — รีสตาร์ท OpenCode แล้วตรวจอีกครั้ง' : 'ตรวจการโหลดไม่ได้ (opencode plugin list) — ไฟล์และ registration ครบ');
    else if (bundleV2 && !fk.pluginFile) add('fail', 'BAZER FLOW v2 · ยังไม่ติดตั้ง kernel', 'gate ยังไม่ถูกบังคับ — กด "ติดตั้ง/ซ่อม BAZER FLOW v2" ในแท็บ Buddha');
    else if (fk.pluginFile && !fk.registered) add('fail', 'BAZER FLOW v2 · kernel ไม่ได้ลงทะเบียน', 'มีไฟล์แต่ไม่ได้อยู่ใน plugins[] — กด "ติดตั้ง/ซ่อม" ในแท็บ Buddha');
    else add('info', 'BAZER FLOW v2 · kernel', 'ยังไม่ติดตั้ง (โหมดเดิมยังทำงานได้)');
    if (fk.builder && fk.builderMode === 'subagent') add('ok', 'builder (subagent)', 'ไม่โชว์ใน Main Agents — เรียกผ่าน task ได้ (Plan Mode)');
    else if (!bundleV2) add('info', 'builder', 'ยังไม่ติดตั้ง');
    else if (!fk.builder) add('warn', 'builder', fk.builderDisabled ? 'ปิดอยู่ (builder.md.disabled) — กด "ติดตั้ง/ซ่อม"' : 'ยังไม่ติดตั้ง — กด "ติดตั้ง/ซ่อม"');
    else add('warn', 'builder', `mode = ${fk.builderMode || '?'} — ต้องเป็น subagent`);
    {
      const pl = fk.plPatch || { total: 0, stale: 0, patched: 0, unknown: 0, notInVersion: [] };
      const na = pl.notInVersion || [];
      if (!pl.total) add('info', 'Plannotator: ปุ่มอนุมัติ → Buddha', 'ยังไม่พบ plannotator.html — ข้าม (ติดตั้ง/ซิงค์จะลองให้ใหม่ทุกครั้ง)');
      else if (pl.stale) add('warn', 'Plannotator: ปุ่มอนุมัติ → Buddha ยังไม่ครบ 5 จุด', `${pl.stale}/${pl.total} ไฟล์ยังแพตช์ไม่ครบ — ดูแผนด้วย "node patch-plannotator.mjs --dry-run" แล้วรัน "node patch-plannotator.mjs" (สำรอง .bak ทุกไฟล์)`);
      else if (pl.unknown) add('warn', 'Plannotator: ปุ่มอนุมัติ → Buddha อ่านสถานะไม่ได้', `Plannotator อาจเปลี่ยนโครง html — ตรวจด้วย "node patch-plannotator.mjs --check"${na.length ? ` · จุด ${na.join(', ')} ไม่มีในเวอร์ชันนี้` : ''}`);
      else add('ok', 'Plannotator: ปุ่มอนุมัติ → Buddha', `${pl.patched}/${pl.total} ไฟล์ครบ 5 จุด — ค่าเริ่มต้นของปุ่มคือ buddha (label "Approve → Buddha" ไม่มี "(?)") · key plannotator-approve-target-v2 · Buddha เรียก builder เป็น subagent inline`);
      if (na.length && (pl.stale || pl.patched)) add('warn', 'Plannotator: จุดที่ไม่มีในเวอร์ชันนี้', `จุด ${na.join(', ')} ไม่มีในเวอร์ชันนี้ — ยืนยันด้วย "node patch-plannotator.mjs --check"`);
    }
    if (fk.gateMarker) add('ok', 'AGENTS gate (BAZER-FLOW-GATE v2)', 'กฎระดับเครื่องมี gate ครบ');
    else add('warn', 'AGENTS gate', 'ยังไม่มี marker — กด "ติดตั้ง/ซ่อม BAZER FLOW v2" หรือ "รีเซ็ตจาก template"');
  }

  // 7e ไฟล์ส่วนตัวจาก template (AGENTS.md / pstack-models.md) — เดิมตรวจแค่ว่า "มีไฟล์ไหม" ของใหม่ใน template จึงมองไม่เห็น
  {
    const ts = safe(templateDrift, []);
    const miss = ts.filter(t => t.status === 'missing');
    const stale = ts.filter(t => t.status === 'stale');
    const custom = ts.filter(t => t.status === 'custom');
    if (miss.length) add('warn', `ไฟล์จาก template ยังไม่มี ${miss.length} ตัว`, miss.map(t => t.key).join(', ') + ' — จะสร้างให้ตอนติดตั้ง/อัพเดต');
    else if (stale.length) add('warn', `template ใน bundle ใหม่กว่าไฟล์ในเครื่อง ${stale.length} ตัว`, stale.map(t => `${t.key} ยังขาด: ${t.missing.slice(0, 3).join(' / ')}${t.missing.length > 3 ? ` (+${t.missing.length - 3})` : ''}`).join(' · ') + ' — กด "รีเซ็ตจาก template" ในแท็บภาพรวม (ของเดิมถูกสำรองก่อนเขียน)');
    else if (custom.length) add('info', 'ไฟล์จาก template ถูกแก้เอง', custom.map(t => t.key).join(', ') + ' — ระบบไม่ทับ (หัวข้อ/role ครบตาม bundle แล้ว)');
    else add('ok', 'ไฟล์จาก template ตรงกับ bundle', ts.map(t => `${t.key} (${t.tplHash})`).join(' · '));
  }

  // 8 plannotator
  {
    const pl = await gatherPlannotatorCli(gatherPlannotator());
    const reg = pl.configs.filter(c => c.has).length;
    if (!reg && !pl.cache.length) add('warn', 'ไม่พบ Plannotator', 'ไม่มีลงทะเบียนใน config และไม่มี cache');
    else add(reg ? 'ok' : 'warn', 'Plannotator', `ลงทะเบียน ${reg} config · cache ${pl.cache[0] ? 'v' + pl.cache[0].version : '—'} · CLI ${pl.cliOk ? 'พบ' : 'ไม่พบบน PATH'}`);
    if (pl.dupes.length) add('info', 'skill ชื่อซ้ำ (.claude + .agents)', pl.dupes.join(', '));
  }

  // 9 autostart + launch files
  {
    const lnk = fs.existsSync(STARTUP_LNK);
    add(lnk ? 'ok' : 'info', 'Autostart server ตอนล็อกอิน', lnk ? 'มีรายการ autostart ของระบบ' : 'ปิดอยู่ (เปิดได้ในแท็บ Server)');
    const la = safe(launchAudit, { items: [], template: [], extra: [] });
    const missing = la.items.filter(x => !x.exists);
    const noTpl = la.items.filter(x => !x.inTemplate);
    const mate = la.items.filter(x => x.mate && x.mateMissing);
    const wrongLock = la.items.filter(x => x.mate && x.writesLockFile === false);
    const unref = la.items.filter(x => x.inTemplate && x.refs === 0);
    if (missing.length) add('warn', 'ไฟล์ launch บางตัวหาย', missing.map(x => x.name).join(', ') + ' — กด "ติดตั้งเสร็จสรรพ" ในแท็บภาพรวมเพื่อสร้างกลับจาก launch-template (ไม่ทับไฟล์เดิม)');
    else if (noTpl.length) add('warn', 'ไฟล์ launch นอกเทมเพลต (อัพเดตไม่ถึง)', noTpl.map(x => x.name).join(', ') + ' — "อัพเดตทั้งหมด" จะไม่แตะไฟล์นี้ ต้องเพิ่มใน launch-template ก่อน');
    else add('ok', 'ไฟล์ launch ครบและอยู่ในเทมเพลต', `${la.items.length} ไฟล์ · เทมเพลต ${la.template.length} ไฟล์`);
    if (mate.length) add('warn', 'สคริปต์ล็อกขาดไฟล์คู่', mate.map(x => `${x.name} → ไม่พบ ${x.mate}`).join(' · ') + ' — ดับเบิลคลิกแล้วล็อกไม่เปลี่ยน');
    if (wrongLock.length) add('warn', 'สคริปต์ล็อกเขียนผิดไฟล์', wrongLock.map(x => x.name).join(', ') + ` — แอปอ่าน ${path.basename(P.serveRestricted)} จะไม่เห็นค่าที่สคริปต์เขียน`);
    if (la.extra.length) add('info', 'ไฟล์ในโฟลเดอร์ launch ที่ไม่อยู่ในเทมเพลต', la.extra.join(', ') + ' — ของคุณเอง ระบบไม่แตะ');
    if (unref.length) add('info', 'ไฟล์ launch ที่โค้ดไม่เรียกเอง', unref.map(x => x.name).join(', ') + ' — เป็นสคริปต์ให้ผู้ใช้ดับเบิลคลิกเอง ไม่ใช่ไฟล์ค้าง');
  }

  // 10 ตั้งค่า OpenCode (tui-settings) — cli.json อ่านได้ · mirror ตรง · คีย์นอก catalog คงอยู่ · keybind ผ่าน
  {
    try {
      const tv = await ACTIONS['tui-verify']({});
      for (const it of tv.items) add(it.level, 'TUI · ' + it.label, it.detail);
    } catch (e) { add('warn', 'TUI · ตรวจตั้งค่าไม่ได้', String(e.message || e)); }
  }

  const summary = { ok: items.filter(i => i.level === 'ok').length, warn: items.filter(i => i.level === 'warn').length, fail: items.filter(i => i.level === 'fail').length };
  return { at: new Date().toLocaleString('th-TH'), items, summary };
}
function extractProviders(j) {
  const out = [];
  const visit = n => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(visit);
    if ((typeof n.id === 'string' || typeof n.providerID === 'string') && n.models && typeof n.models === 'object') { out.push(n.id || n.providerID); return; }
    Object.values(n).forEach(visit);
  };
  visit(j);
  return [...new Set(out)];
}
function extractModelsFor(j, providerId) {
  let res = [];
  const visit = n => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(visit);
    if ((n.id === providerId || n.providerID === providerId) && n.models && typeof n.models === 'object') {
      res = Array.isArray(n.models) ? n.models.map(x => x.id || x.modelID || x.name).filter(Boolean) : Object.keys(n.models);
      return;
    }
    Object.values(n).forEach(visit);
  };
  visit(j);
  return res;
}

/* ---------------------------------- actions ---------------------------------- */

function listFilesRec(dir, base) {
  const root = base || dir;
  let out = [];
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) out = out.concat(listFilesRec(p, root));
      else out.push(path.relative(root, p).replace(/\\/g, '/'));
    }
  } catch {}
  return out;
}
function packUpdateItems() {
  const out = [];
  const addFiles = (cat, srcDir, dstDir, ext) => {
    try {
      for (const f of fs.readdirSync(srcDir)) {
        if (ext && !f.endsWith(ext)) continue;
        if (!fs.statSync(path.join(srcDir, f)).isFile()) continue;
        let dst = path.join(dstDir, f);
        if (!fs.existsSync(dst) && fs.existsSync(dst + '.disabled')) dst = dst + '.disabled';
        out.push({ cat, name: f, src: path.join(srcDir, f), dst, kind: 'file' });
      }
    } catch {}
  };
  const addDirs = (cat, srcDir, dstDir) => {
    try {
      for (const d of fs.readdirSync(srcDir, { withFileTypes: true }).filter(x => x.isDirectory())) {
        out.push({ cat, name: d.name, src: path.join(srcDir, d.name), dst: path.join(dstDir, d.name), kind: 'dir' });
      }
    } catch {}
  };
  addDirs('skills', path.join(BUNDLE, 'skills'), P.skillsDir);
  addFiles('agents', path.join(BUNDLE, 'agents'), P.agentsDir, '.md');
  addFiles('commands', path.join(BUNDLE, 'commands'), P.commandsDir, '.md');
  if (fs.existsSync(path.join(BUNDLE, 'plugins'))) addDirs('plugins', path.join(BUNDLE, 'plugins'), path.join(P.config, 'plugins'));
  const ldir = launchDirResolved();
  if (fs.existsSync(ldir)) addFiles('launch', LAUNCH_TPL_DIR, ldir);
  return out;
}
function packStatus(it) {
  if (it.kind === 'dir') {
    if (!fs.existsSync(it.dst)) return 'new';
    let diff = false;
    for (const rel of listFilesRec(it.src)) {
      const d = readText(path.join(it.dst, rel.split('/').join(path.sep)));
      if (d === null || d !== readText(path.join(it.src, rel))) { diff = true; break; }
    }
    return diff ? 'diff' : 'same';
  }
  if (!fs.existsSync(it.dst)) return 'new';
  return readText(it.src) === readText(it.dst) ? 'same' : 'diff';
}
/* เทียบไฟล์ส่วนตัวในเครื่อง (AGENTS.md / pstack-models.md) กับ template ใน bundle
   สถานะ: missing = ยังไม่มี · same = ตรงกับ template · stale = template มีหัวข้อ/role ที่ไฟล์ในเครื่องยังไม่มี
   custom = ผู้ใช้แก้เองแต่หัวข้อ/role ครบตาม template (ระบบไม่ทับ — บอกได้แค่ว่า "ต่าง" ไม่ใช่ "เก่า") */
function normKey(s) { return String(s).replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase(); }
function topicSet(md, kind) {
  const out = new Set();
  for (const line of String(md).split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (kind === 'pstack') {
      const m = line.match(/^([^:#]{3,60}):\s*\S/);
      if (m) out.add(m[1].trim());
    } else {
      const m = line.match(/^#{1,3}\s+(.+?)\s*$/);
      if (m) out.add(m[1].trim());
    }
  }
  return out;
}
function hash8(s) { return crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 8); }
function templateSpec() {
  return [
    { key: 'AGENTS.md', dst: P.agentsMd, kind: 'md', content: () => readText(path.join(BUNDLE, 'config', 'AGENTS.md.template')) },
    { key: 'pstack-models.md', dst: P.pstackModels, kind: 'pstack', content: () => pstackTemplateContent() },
  ];
}
function templateDrift() {
  return templateSpec().map(({ key, dst, kind, content }) => {
    const tpl = content();
    const cur = readText(dst);
    const base = { key, dst, tplHash: tpl ? hash8(tpl) : null, missing: [] };
    if (!tpl) return { ...base, status: cur === null ? 'missing' : 'custom', note: 'อ่าน template จาก bundle ไม่ได้' };
    if (cur === null) return { ...base, status: 'missing' };
    if (cur === tpl) return { ...base, status: 'same' };
    const want = topicSet(tpl, kind), have = new Set([...topicSet(cur, kind)].map(normKey));
    const missing = [...want].filter(t => !have.has(normKey(t)));
    return { ...base, status: missing.length ? 'stale' : 'custom', missing };
  });
}

/* ไฟล์ launch — ตรวจ 4 อย่างที่ไม่มีในโค้ดเดิม:
   (1) มีอยู่จริง (2) อยู่ใน launch-template ไหม (= อัพเดตถึงไหม) (3) สคริปต์ล็อกมีไฟล์ .jsonc คู่กันไหม
   (4) สคริปต์ล็อกเขียนทับชื่อไฟล์เดียวกับที่แอปใช้จริงไหม · refs = โค้ดเรียกไฟล์นี้เองกี่ครั้ง (0 = ให้ผู้ใช้ดับเบิลคลิกเอง) */
function launchAudit() {
  const dir = launchDirResolved();
  const tplDir = LAUNCH_TPL_DIR;
  const listDir = d => { try { return fs.readdirSync(d).filter(f => fs.statSync(path.join(d, f)).isFile()); } catch { return []; } };
  const tpl = listDir(tplDir);
  let self = ''; try { self = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8'); } catch {}
  const lockBase = path.basename(P.serveRestricted);
  const items = Object.entries(LAUNCH).map(([key, file]) => {
    const name = path.basename(file);
    const exists = fs.existsSync(file);
    const txt = exists ? (readText(file) || '') : '';
    const lockVbs = (PLAT ? PLAT.LOCK_LAUNCHER_RE : /^lock-.*\.vbs$/i).test(name);
    const mate = lockVbs ? name.replace(PLAT ? PLAT.LOCK_LAUNCHER_EXT_RE : /\.vbs$/i, '.jsonc') : null;
    return {
      key, name, exists,
      inTemplate: tpl.includes(name),
      refs: (self.match(new RegExp('LAUNCH\\.' + key + '\\b', 'g')) || []).length,
      mate,
      mateMissing: mate && exists ? !fs.existsSync(path.join(path.dirname(file), mate)) : false,
      writesLockFile: mate && exists ? txt.includes(lockBase) : null,
    };
  });
  return { dir, items, template: tpl, extra: listDir(dir).filter(f => !tpl.includes(f)), skipped: !CFG.launchDir && !fs.existsSync(dir) };
}
function configDrift() {
  try {
    const arrs = parseJSONC(P.opencodeJsonc).obj || {};
    const plist = arrs.plugins || arrs.plugin || [];
    let pa = [];
    for (const x of (Array.isArray(plist) ? plist : [])) { const o = Array.isArray(x) ? x[1] : x?.options; if (o?.planningAgents) { pa = o.planningAgents; break; } }
    const arr = Array.isArray(pa) ? pa : [];
    const missing = PLAN_AGENTS.filter(n => !arr.includes(n));
    return { planningAgents: arr, missing, ok: arr.length > 0 && missing.length === 0 };
  } catch { return { planningAgents: [], missing: PLAN_AGENTS.slice(), ok: false }; }
}

/* ตั้งค่า OpenCode — สร้าง API ครั้งเดียว ถ้าโฟลเดอร์ tui-settings หาย ให้แอปยังบูตได้และบอกเหตุผล */
const TUI_API = (() => {
  try {
    return createSettingsApi({ cliFile: P.cliJson, tuiFile: P.tuiJson, backupsDir: P.backups, historyFile: P.history });
  } catch (e) {
    const fail = () => { throw new Error('โหลด tui-settings ไม่ได้ (โฟลเดอร์ tui-settings ต้องอยู่ข้าง console.mjs): ' + e.message); };
    return Object.fromEntries(['tui-form', 'tui-save', 'tui-preview-mirror', 'tui-mirror-status', 'tui-status', 'tui-import', 'tui-restore', 'tui-verify', 'tui-backups'].map(id => [id, fail]));
  }
})();

const ACTIONS = {
  /* ตั้งค่า OpenCode (tui-settings) — schema-driven form + cli.json↔tui.json mirror */
  ...TUI_API,

  /* mode lock — สวิตช์เดียว เขียนครบทุกช่องที่ชนะ แล้วปิดท้ายด้วยการตรวจ */
  'check-mode-lock': async () => {
    const r = runLockCheck();
    return { message: `mode lock: ${r.summary}`, result: r };
  },
  'set-mode-lock': async ({ on = true, effort = 'max', model } = {}) => {
    const want = String(effort || 'max');
    const cfg = parseJSONC(P.opencodeJsonc);
    if (!cfg.ok) throw new Error('opencode.jsonc อ่านไม่ได้: ' + cfg.error);
    const obj = cfg.obj || {};
    const modelRef = model || (typeof obj.model === 'string' ? obj.model
      : (obj.model?.providerID ? `${obj.model.providerID}/${obj.model.model}` : ''));
    if (!/^[^/\s]+\/.+$/.test(modelRef)) throw new Error('ยังไม่รู้ว่าจะล็อกโมเดลไหน — ต้องเป็น provider/model');
    const [prov, ...rest] = modelRef.split('/');
    const mid = rest.join('/');
    const bk = createBackup(on ? 'set-mode-lock' : 'unlock-mode-lock');
    bk.add(P.opencodeJsonc);
    obj.model = modelRef;
    const useV2 = !!obj.providers;
    if (useV2) obj.providers = obj.providers || {};
    else obj.provider = obj.provider || {};
    const bucket = useV2 ? (obj.providers[prov] = obj.providers[prov] || {}) : (obj.provider[prov] = obj.provider[prov] || {});
    bucket.models = bucket.models || {};
    const md = bucket.models[mid] = bucket.models[mid] || {};
    if (on) {
      md.options = md.options || {};
      md.options.reasoningEffort = want;
      /* object map ใต้ provider ถูก OpenCode 2 normalize เป็น variants[] {id,settings} ให้เอง — พิสูจน์ด้วย opencode debug config */
      md.variants = { low: { reasoningEffort: want }, high: { reasoningEffort: want }, max: { reasoningEffort: want } };
    } else {
      delete md.variants;
      if (md.options) { delete md.options.reasoningEffort; if (!Object.keys(md.options).length) delete md.options; }
      if (!Object.keys(md).length) delete bucket.models[mid];
      if (!Object.keys(bucket.models).length) delete bucket.models;
      if (!Object.keys(bucket).length) { if (useV2) delete obj.providers[prov]; else delete obj.provider[prov]; }
    }
    writeAtomic(P.opencodeJsonc, jsonHeader('Global config') + JSON.stringify(obj, null, 2) + '\n');
    let synced = false;
    try {
      const mj = parseJSONC(P.modelJson);
      if (mj.ok && mj.obj) {
        mj.obj.variant = mj.obj.variant || {};
        mj.obj.variant[modelRef] = on ? want : 'default';
        bk.add(P.modelJson);
        writeAtomic(P.modelJson, JSON.stringify(mj.obj, null, 2));
        synced = true;
      }
    } catch {}
    bk.finalize();
    patchConfig({ modeLock: { on: !!on, effort: want, model: modelRef } });
    const chk = runLockCheck();
    return { message: `${on ? 'ล็อก' : 'ปลดล็อก'} ${modelRef} · effort ${on ? want : 'default'}${synced ? ' + ซิงค์ model.json' : ''} — ${chk.summary} (มีผลกับ session ใหม่)` };
  },

  /* lock */
  'set-lock': async ({ mode, restart }) => {
    const templates = {
      'deepseek-only': () => {
        const t = parseJSONC(LAUNCH.lockDeepseekJsonc);
        if (t.ok && t.obj) return t.obj;
        return { $schema: 'https://opencode.ai/config.json', enabled_providers: ['opencode-go'], provider: { 'opencode-go': { blacklist: DEEPSEEK_BLACKLIST } } };
      },
      'provider-only': () => {
        const t = parseJSONC(LAUNCH.lockProviderJsonc);
        if (t.ok && t.obj) return t.obj;
        return { $schema: 'https://opencode.ai/config.json', enabled_providers: ['opencode-go'] };
      },
      'off': () => ({ $schema: 'https://opencode.ai/config.json' }),
    };
    if (!templates[mode]) throw new Error('โหมดไม่ถูกต้อง: ' + mode);
    const bk = createBackup('set-lock ' + mode);
    bk.add(P.serveRestricted);
    const obj = templates[mode]();
    writeAtomic(P.serveRestricted, jsonHeader('ไฟล์ล็อกของเซอร์เวอร์') + JSON.stringify(obj, null, 2) + '\n');
    bk.finalize();
    let msg = `เขียนไฟล์ล็อกเป็นโหมด ${mode} แล้ว`;
    if (restart) {
      const r = await ACTIONS['restart-server']({});
      msg += ' · ' + r.message;
    } else msg += ' — ยังไม่รีสตาร์ท server (ไฟล์มีผลเมื่อ server เริ่มใหม่)';
    return { message: msg };
  },

  'update-blacklist': async ({ add = [], remove = [] }) => {
    const r = parseJSONC(P.serveRestricted);
    const obj = r.ok && r.obj ? r.obj : { $schema: 'https://opencode.ai/config.json' };
    if (!obj.enabled_providers || !obj.enabled_providers.length) obj.enabled_providers = ['opencode-go'];
    obj.provider = obj.provider || {};
    obj.provider['opencode-go'] = obj.provider['opencode-go'] || {};
    const set = new Set(obj.provider['opencode-go'].blacklist || []);
    for (const m of add) if (m) set.add(m);
    for (const m of remove) set.delete(m);
    obj.provider['opencode-go'].blacklist = [...set];
    const bk = createBackup('update-blacklist');
    bk.add(P.serveRestricted);
    writeAtomic(P.serveRestricted, jsonHeader('ไฟล์ล็อกของเซอร์เวอร์') + JSON.stringify(obj, null, 2) + '\n');
    bk.finalize();
    return { message: `อัปเดต blacklist แล้ว (${[...set].length} รายการ) — มีผลเมื่อ server รีสตาร์ท` };
  },

  'list-models': async () => {
    const r = await fetchT(SERVER_URL + '/provider', 4000);
    if (!r.ok) throw new Error('ดึงจาก server ไม่ได้ — server 4096 ทำงานอยู่ไหม?');
    let j = null; try { j = JSON.parse(r.text); } catch {}
    if (!j) throw new Error('ผลลัพธ์จาก /provider ไม่ใช่ JSON');
    let models = extractModelsFor(j, 'opencode-go');
    if (!models.length) {
      const providers = extractProviders(j);
      if (!providers.includes('opencode-go')) throw new Error('server ไม่เห็น provider opencode-go — โหมดล็อกอาจปิดอยู่ หรือยังไม่โหลด provider');
    }
    models = [...new Set(models)];
    return { models, message: `ดึงรายชื่อโมเดลของ opencode-go ได้ ${models.length} ตัว` };
  },

  'list-avail-models': async () => {
    if (availModelsCache.v && Date.now() - availModelsCache.at < 5 * 60 * 1000) {
      return { models: availModelsCache.v, message: `มี ${availModelsCache.v.length} โมเดลในเครื่อง (จาก cache 5 นาที)` };
    }
    const r = await ps('opencode models', 90000);
    const uniq = [...new Set((r.out + '\n' + r.err).split(/\r?\n/).map(s => s.trim()).filter(s => /^[a-z0-9_.-]+\/.+/i.test(s)))];
    if (!uniq.length) throw new Error('อ่านรายการโมเดลไม่ได้ — ลองรัน `opencode models` เองดู: ' + (r.out + r.err).slice(0, 150));
    availModelsCache = { v: uniq, at: Date.now() };
    return { models: uniq, message: `ดึงรายชื่อโมเดลทั้งหมดจากเครื่องได้ ${uniq.length} ตัว` };
  },

  'set-model-effort': async ({ model, effort, sync }) => {
    if (!model || !/^[^/\s]+\/.+$/.test(model)) throw new Error('รูปแบบโมเดลต้องเป็น provider/model');
    const eff = effort || 'default';
    const r = parseJSONC(P.opencodeJsonc);
    const obj = r.ok && r.obj ? r.obj : { $schema: 'https://opencode.ai/config.json' };
    obj.model = model;
    const [prov, ...rest] = model.split('/');
    const mid = rest.join('/');
    obj.provider = obj.provider || {};
    obj.provider[prov] = obj.provider[prov] || {};
    obj.provider[prov].models = obj.provider[prov].models || {};
    obj.provider[prov].models[mid] = obj.provider[prov].models[mid] || {};
    const md = obj.provider[prov].models[mid];
    if (eff === 'default') {
      delete md.variants;
      if (md.options) { delete md.options.reasoningEffort; if (!Object.keys(md.options).length) delete md.options; }
    } else {
      md.options = md.options || {};
      md.options.reasoningEffort = eff;
      md.variants = { low: { reasoningEffort: eff }, high: { reasoningEffort: eff }, max: { reasoningEffort: eff } };
    }
    const bk = createBackup('set-model-effort');
    bk.add(P.opencodeJsonc);
    writeAtomic(P.opencodeJsonc, jsonHeader('Global config') + JSON.stringify(obj, null, 2) + '\n');
    let extra = '';
    if (sync && fs.existsSync(P.modelJson)) {
      const mj = parseJSONC(P.modelJson);
      if (mj.ok && mj.obj) {
        mj.obj.variant = mj.obj.variant || {};
        mj.obj.variant[model] = eff === 'default' ? 'default' : eff;
        bk.add(P.modelJson);
        writeAtomic(P.modelJson, JSON.stringify(mj.obj, null, 2));
        extra = ' + ซิงค์ model.json แล้ว';
      } else extra = ' (model.json อ่านไม่ได้ — ข้าม)';
    }
    bk.finalize();
    return { message: `ตั้งโมเดล ${model} · effort ${eff}${extra} — มีผลกับ session ใหม่` };
  },

  /* OpenCode 2 อ่าน TUI settings จาก tui.json ไม่ใช่ cli.json (docs: "TUI-specific settings" + legacy keys migrated) */
  'migrate-tui': async () => {
    const src = parseJSONC(P.cliJson);
    const cur = fs.existsSync(P.tuiJson) ? parseJSONC(P.tuiJson) : { ok: true, obj: {} };
    const base = (cur.ok && cur.obj) ? cur.obj : {};
    const from = (src.ok && src.obj) ? src.obj : {};
    const next = { $schema: 'https://opencode.ai/tui.json', ...from, ...base };
    const bk = createBackup('migrate-tui');
    if (fs.existsSync(P.cliJson)) bk.add(P.cliJson);
    if (fs.existsSync(P.tuiJson)) bk.add(P.tuiJson);
    writeAtomic(P.tuiJson, JSON.stringify(next, null, 2) + '\n');
    bk.finalize();
    return { message: `เขียน ${P.tuiJson} แล้ว (จาก cli.json ${Object.keys(from).length} คีย์) — cli.json เก็บไว้เป็น legacy` };
  },

  'save-text': async ({ target, content }) => {
    const map = {
      cli: { file: P.tuiJson, kind: 'json', label: 'tui.json', also: P.cliJson },
      'pstack-models': { file: P.pstackModels, kind: 'text', label: 'pstack-models.md' },
      'agents-md': { file: P.agentsMd, kind: 'text', label: 'AGENTS.md' },
    };
    const t = map[target];
    if (!t) throw new Error('target ไม่ถูกต้อง');
    if (t.kind === 'json') { try { JSON.parse(content); } catch (e) { throw new Error('JSON ผิดรูปแบบ: ' + e.message); } }
    const bk = createBackup('save-' + target);
    if (t.also && fs.existsSync(t.also)) bk.add(t.also);
    bk.add(t.file);
    writeAtomic(t.file, content);
    /* TUI ของ OpenCode 2 อ่าน tui.json — เขียน cli.json คู่กันไว้ให้ของเดิมไม่พัง */
    if (t.also) { try { writeAtomic(t.also, content); } catch {} }
    bk.finalize();
    return { message: `บันทึก ${t.label} แล้ว${t.also ? ' (+ cli.json legacy)' : ''} (สำรองเดิมไว้)` };
  },

  /* server */
  'restart-server': async () => {
    const ldir = launchDirResolved();
    if (!fs.existsSync(LAUNCH.serveVbs)) throw new Error(`ไม่พบ ${path.basename(LAUNCH.serveVbs)} ใน ${ldir} — ไปกด "ติดตั้งเสร็จสรรพ" ที่แท็บภาพรวมก่อน (หรือตั้ง launchDir ใน console.config.json)`);
    if (PLAT) await PLAT.killPort(4096);
    else await ps('Get-NetTCPConnection -LocalPort 4096 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }', 15000);
    await new Promise(r => setTimeout(r, 900));
    if (PLAT) PLAT.launchServer(LAUNCH.serveVbs, ldir);
    else spawn('wscript.exe', [LAUNCH.serveVbs], { detached: true, stdio: 'ignore', windowsHide: true, cwd: ldir }).unref();
    let version = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 800));
      const h = await fetchT(SERVER_URL + '/global/health', 1500);
      if (h.ok) { try { version = JSON.parse(h.text).version; } catch { version = '?'; } break; }
    }
    if (!version) return { message: 'สั่งรีสตาร์ทแล้ว แต่ยังไม่ตอบสนองภายใน ~17 วินาที — ลองกด "ตรวจสุขภาพ" อีกครั้ง' };
    return { message: `รีสตาร์ท server แล้ว — ตอบกลับที่ v${version}` };
  },

  'restart-service': async () => {
    const r = await ps('opencode service restart', 60000);
    const ok = r.code === 0;
    return { ok, message: ok ? 'รีสตาร์ท opencode service แล้ว' : 'คำสั่ง service ตอบรหัส ' + r.code, detail: (r.out + r.err).slice(0, 500) };
  },

  'health-check': async () => {
    const h = await fetchT(SERVER_URL + '/global/health', 3000);
    if (!h.ok) throw new Error('server 4096 ไม่ตอบสนอง');
    let v = '?'; try { v = JSON.parse(h.text).version; } catch {}
    const cli = await getCliVersion();
    const pinned = v && cli && String(v).startsWith('1.') && String(cli).startsWith('2.');
    const tail = v === cli ? '' : pinned ? ' (bridge ปักหมุด v1 — ปกติ)' : ' (เวอร์ชันไม่ตรงกัน)';
    return { message: `server 4096 ทำงาน · v${v} · CLI v${cli || '?'}${tail}` };
  },

  autostart: async ({ on }) => {
    const ldir = launchDirResolved();
    if (on && !fs.existsSync(LAUNCH.serveVbs)) throw new Error(`ยังไม่มี ${path.basename(LAUNCH.serveVbs)} ใน ${ldir} — กด "ติดตั้งเสร็จสรรพ" ที่แท็บภาพรวมก่อน`);
    if (PLAT) {
      const r = on ? await PLAT.enableAutostart({ serverPath: LAUNCH.serveVbs, workDir: ldir }) : await PLAT.disableAutostart();
      if (!r.ok) throw new Error(r.message);
      return { message: r.message };
    }
    if (on) {
      const cmdLn = [
        `$ws=New-Object -ComObject WScript.Shell`,
        `$sc=$ws.CreateShortcut('${STARTUP_LNK.replace(/'/g, "''")}')`,
        `$sc.TargetPath='C:\\Windows\\System32\\wscript.exe'`,
        `$sc.Arguments='"${LAUNCH.serveVbs}"'`,
        `$sc.WorkingDirectory='${ldir.replace(/'/g, "''")}'`,
        `$sc.Description='OpenCode background server (http://127.0.0.1:4096) for Cline'`,
        `$sc.Save()`,
      ].join('; ');
      const r = await ps(cmdLn, 20000);
      if (r.code !== 0) throw new Error('สร้างทางลัดไม่สำเร็จ: ' + r.err.slice(0, 200));
      return { message: 'เปิด autostart แล้ว — server จะเปิดเองทุกครั้งที่ล็อกอิน' };
    } else {
      try { fs.rmSync(STARTUP_LNK, { force: true }); } catch (e) { throw new Error('ลบทางลัดไม่สำเร็จ: ' + e.message); }
      return { message: 'ปิด autostart แล้ว (server ที่รันอยู่ยังทำงานต่อ)' };
    }
  },

  /* pStack */
  'build-preview': async () => {
    const b = walkBuild();
    if (!b.exists) throw new Error('ไม่พบโฟลเดอร์ build: ' + CFG.buildDir);
    return { files: b.files, counts: b.counts, stray: b.stray, byCat: b.byCat, message: `diff: ใหม่ ${b.counts.new} · ต่าง ${b.counts.diff} · เหมือน ${b.counts.same}` };
  },

  'build-apply': async ({ parts = {}, cleanup = false }) => {
    const B = CFG.buildDir;
    if (!fs.existsSync(B)) throw new Error('ไม่พบโฟลเดอร์ build');
    const bk = createBackup('apply-build');
    const stat = { skills: 0, agents: 0, commands: 0, config: 'ข้าม', cleanup: false };
    if (parts.skills) {
      try {
        for (const d of fs.readdirSync(path.join(B, 'skills'), { withFileTypes: true }).filter(x => x.isDirectory())) {
          const src = path.join(B, 'skills', d.name);
          if (!fs.existsSync(path.join(src, 'SKILL.md'))) continue;
          const dst = path.join(P.skillsDir, d.name);
          bk.add(dst);
          fs.cpSync(src, dst, { recursive: true, force: true });
          stat.skills++;
        }
      } catch (e) { throw new Error('copy skills ล้มเหลว: ' + e.message); }
    }
    if (parts.agents) {
      try {
        for (const f of fs.readdirSync(path.join(B, 'agents')).filter(x => x.endsWith('.md'))) {
          const dst = path.join(P.agentsDir, f);
          bk.add(dst);
          fs.mkdirSync(P.agentsDir, { recursive: true });
          fs.copyFileSync(path.join(B, 'agents', f), dst);
          stat.agents++;
        }
      } catch (e) { throw new Error('copy agents ล้มเหลว: ' + e.message); }
    }
    if (parts.commands) {
      try {
        for (const f of fs.readdirSync(path.join(B, 'commands')).filter(x => x.endsWith('.md'))) {
          const dst = path.join(P.commandsDir, f);
          bk.add(dst);
          fs.mkdirSync(P.commandsDir, { recursive: true });
          fs.copyFileSync(path.join(B, 'commands', f), dst);
          stat.commands++;
        }
      } catch (e) { throw new Error('copy commands ล้มเหลว: ' + e.message); }
    }
    if (parts.config) {
      const tpl = path.join(B, 'config', 'pstack-models.template.md');
      if (fs.existsSync(tpl) && !fs.existsSync(P.pstackModels)) {
        writeAtomic(P.pstackModels, pstackTemplateContent(B));
        stat.config = 'คัดลอก template แล้ว';
      } else stat.config = fs.existsSync(P.pstackModels) ? 'มีไฟล์อยู่แล้ว — ไม่ทับ' : 'ไม่พบ template';
    }
    if (cleanup && fs.existsSync(P.strayModels)) {
      bk.add(P.strayModels);
      try { fs.rmSync(P.strayModels); stat.cleanup = true; } catch {}
    }
    const n = bk.finalize();
    return { message: `Apply แล้ว — skills ${stat.skills} · agents ${stat.agents} · commands ${stat.commands} · config: ${stat.config}${stat.cleanup ? ' · ลบไฟล์ค้างแล้ว' : ''} (สำรอง ${n} รายการ)` };
  },

  'skill-hide': async ({ name }) => {
    const f = path.join(P.skillsDir, path.basename(name), 'SKILL.md');
    const md = readText(f);
    if (md === null) throw new Error('ไม่พบ skill: ' + name);
    const out = setAutoinvoke(md, true);
    if (!out) throw new Error('แก้ frontmatter ไม่ได้ (ไม่พบ ---)');
    const bk = createBackup('skill-hide');
    bk.add(f); writeAtomic(f, out); bk.finalize();
    return { message: `ซ่อน ${name} จากโมเดลแล้ว (โหลดด้วย @${name} ยังได้)` };
  },

  'skill-show': async ({ name }) => {
    const f = path.join(P.skillsDir, path.basename(name), 'SKILL.md');
    const md = readText(f);
    if (md === null) throw new Error('ไม่พบ skill: ' + name);
    const out = setAutoinvoke(md, false);
    if (!out) throw new Error('แก้ frontmatter ไม่ได้');
    const bk = createBackup('skill-show');
    bk.add(f); writeAtomic(f, out); bk.finalize();
    return { message: `เปิดให้ ${name} ถูก advertise ให้โมเดลแล้ว` };
  },

  'skill-remove-field': async ({ name }) => {
    const f = path.join(P.skillsDir, path.basename(name), 'SKILL.md');
    const md = readText(f);
    if (md === null) throw new Error('ไม่พบ skill: ' + name);
    const out = removeLegacyField(md);
    if (!out) throw new Error('แก้ frontmatter ไม่ได้');
    const bk = createBackup('skill-remove-field');
    bk.add(f); writeAtomic(f, out); bk.finalize();
    return { message: `ลบ disable-model-invocation จาก ${name} แล้ว` };
  },

  'npx-skills': async ({ op }) => {
    const cmd = op === 'update' ? 'cmd /c npx -y skills update -g' : 'cmd /c npx -y skills list -g';
    const r = await ps(cmd, op === 'update' ? 240000 : 90000);
    const out = (r.out + (r.err ? '\n' + r.err : '')).replace(/\u001b\[[0-9;]*m/g, '').trim();
    return { ok: r.code === 0, message: (out || 'ไม่มี output').slice(-1800), detail: 'exit ' + r.code };
  },

  /* agents / commands */
  'agent-toggle': async ({ file, enable }) => {
    const base = path.basename(file).replace(/\.disabled$/, '');
    const active = path.join(P.agentsDir, base);
    const disabled = active + '.disabled';
    const from = enable ? (fs.existsSync(active) ? active : disabled) : active;
    if (!fs.existsSync(from)) throw new Error('ไม่พบไฟล์: ' + base);
    const to = enable ? active : disabled;
    if (from === to) return { message: `agent ${base} ${enable ? 'เปิด' : 'ปิด'}อยู่แล้ว` };
    fs.renameSync(from, to);
    return { message: `${enable ? 'เปิด' : 'ปิด'} agent ${base} แล้ว` };
  },

  'agent-del': async ({ file }) => {
    const base = path.basename(file);
    const f = path.join(P.agentsDir, base);
    if (!fs.existsSync(f)) throw new Error('ไม่พบไฟล์: ' + base);
    const bk = createBackup('agent-del');
    bk.add(f);
    fs.rmSync(f);
    bk.finalize();
    return { message: `ลบ agent ${base} แล้ว (สำรองไว้ — กู้คืนได้ในแท็บประวัติ)` };
  },

  'command-toggle': async ({ file, enable }) => {
    const base = path.basename(file).replace(/\.disabled$/, '');
    const active = path.join(P.commandsDir, base);
    const disabled = active + '.disabled';
    const from = enable ? (fs.existsSync(active) ? active : disabled) : active;
    if (!fs.existsSync(from)) throw new Error('ไม่พบไฟล์: ' + base);
    const to = enable ? active : disabled;
    if (from === to) return { message: `คำสั่ง ${base} ${enable ? 'เปิด' : 'ปิด'}อยู่แล้ว` };
    fs.renameSync(from, to);
    return { message: `${enable ? 'เปิด' : 'ปิด'} คำสั่ง ${base} แล้ว` };
  },

  /* plannotator */
  'plannotator-toggle': async ({ enable }) => {
    const r = parseJSONC(P.opencodeJsonc);
    const obj = r.ok && r.obj ? r.obj : { $schema: 'https://opencode.ai/config.json' };
    const key = obj.plugin && !obj.plugins ? 'plugin' : 'plugins';
    let arr = obj[key] || [];
    if (!Array.isArray(arr)) arr = [];
    const nameOf = x => typeof x === 'string' ? x : Array.isArray(x) ? String(x[0] || '') : String(x?.package || '');
    arr = arr.filter(x => !nameOf(x).includes('plannotator'));
    const PLAN_OPTS = { workflow: 'plan-agent', planningAgents: PLAN_AGENTS };
    if (enable) {
      if (key === 'plugin') arr.push(['@plannotator/opencode@latest', PLAN_OPTS]);
      else arr.push({ package: '@plannotator/opencode@latest', options: PLAN_OPTS });
    }
    obj[key] = arr;
    const bk = createBackup('plannotator-toggle');
    bk.add(P.opencodeJsonc);
    writeAtomic(P.opencodeJsonc, jsonHeader('Global config') + JSON.stringify(obj, null, 2) + '\n');
    bk.finalize();
    return { message: `${enable ? 'เปิด' : 'ปิด'} ปลั๊กอิน Plannotator ใน global config แล้ว (โหมด plan-agent · planningAgents: ${PLAN_AGENTS.join(', ')}) — มีผลกับ session ใหม่` };
  },

  plannotator: async ({ op }) => {
    if (op === 'clear-cache') {
      const base = path.join(P.cacheNpm, '@plannotator');
      if (!fs.existsSync(base)) return { message: 'ไม่พบ cache ปลั๊กอิน — ไม่มีอะไรต้องลบ' };
      fs.rmSync(base, { recursive: true, force: true });
      return { message: 'ล้าง cache แล้ว — OpenCode จะติดตั้งปลั๊กอินใหม่ตอนเปิดครั้งถัดไป' };
    }
    if (op === 'version') {
      const pl = await gatherPlannotatorCli(gatherPlannotator());
      const ver = pl.cache[0]?.version ? 'v' + pl.cache[0].version : 'ไม่พบ cache';
      return { message: `Plannotator: ${ver} · CLI ${pl.cliOk ? pl.cliPath : 'ไม่พบบน PATH'}` };
    }
    throw new Error('op ไม่ถูกต้อง: ' + op);
  },

  /* pStack models + Plannotator config */
  'save-pstack-models': async ({ budget, rows, dryRun }) => {
    const EFFORT = { unlimited: 'max', large: 'xhigh', medium: 'high', small: 'medium' };
    const b = EFFORT[budget] ? budget : 'large';
    const clean = (rows || []).map(r => {
      const m = Array.isArray(r.models) ? r.models.map(x => String(x).trim()).filter(Boolean).join(', ') : String(r.models || '').trim();
      return { role: String(r.role || '').trim(), models: m };
    }).filter(r => r.role && r.models);
    if (!clean.length) throw new Error('ต้องมีอย่างน้อย 1 แถว (role: model)');
    const content = [
      '# pStack model configuration. One line per role. Delete a line to fall back to the skill default.',
      '# `inherit-parent` or `auto` as a value: the role runs on the parent chat model. Alias entries in a panel list still count toward its fan-out.',
      '# OpenCode note: the `task` tool takes no per-spawn `model`. Name the intended model in the brief and record which model actually ran.',
      `# budget: ${b} (${EFFORT[b]})`,
      ...clean.map(r => `${r.role}: ${r.models}`),
      '',
    ].join('\n');
    if (dryRun) return { message: `ทดสอบ: ${clean.length} role · budget ${b} (${EFFORT[b]})`, content };
    const bk = createBackup('save-pstack-models');
    bk.add(P.pstackModels);
    writeAtomic(P.pstackModels, content);
    bk.finalize();
    return { message: `บันทึก pstack-models.md แล้ว — ${clean.length} role · budget ${b} (${EFFORT[b]}) (มีผลกับ session ใหม่)` };
  },

  'save-model-sets': async ({ sets }) => {
    const arr = (Array.isArray(sets) ? sets : []).slice(0, 50).map(s => ({
      name: String((s && s.name) || '').trim().slice(0, 60) || 'ชุดใหม่',
      models: (Array.isArray(s && s.models) ? s.models : []).map(x => String(x).trim()).filter(Boolean).slice(0, 50),
      roles: (Array.isArray(s && s.roles) ? s.roles : []).map(x => String(x).trim()).filter(Boolean).slice(0, 60),
    }));
    patchConfig({ modelSets: arr });
    return { message: `บันทึกชุดโมเดลแล้ว (${arr.length} ชุด) — เก็บไว้ใน console.config.json` };
  },

  'save-plannotator-config': async ({ semanticDiff, callFlow, raw, dryRun }) => {
    const f = path.join(P.plannotatorDir, 'config.json');
    let out;
    if (typeof raw === 'string') {
      let j = null;
      try { j = JSON.parse(raw); } catch (e) { throw new Error('JSON ผิดรูปแบบ: ' + e.message); }
      out = JSON.stringify(j, null, 2) + '\n';
    } else {
      let obj = {};
      const t = readText(f);
      if (t) { try { obj = JSON.parse(t); } catch { throw new Error('config.json เดิมอ่านไม่ได้ (ไม่ใช่ JSON) — ตรวจก่อนแก้'); } }
      obj.reviewAnalysis = obj.reviewAnalysis || {};
      if (typeof semanticDiff === 'boolean') obj.reviewAnalysis.semanticDiff = semanticDiff;
      if (typeof callFlow === 'boolean') obj.reviewAnalysis.callFlow = callFlow;
      out = JSON.stringify(obj, null, 2) + '\n';
    }
    if (dryRun) return { message: 'ทดสอบ: เนื้อหา config ที่จะเขียน', content: out };
    const bk = createBackup('save-plannotator-config');
    bk.add(f); writeAtomic(f, out); bk.finalize();
    return { message: 'บันทึก Plannotator config แล้ว — มีผลกับรอบถัดไปของ Plannotator' };
  },

  'save-plannotator-prefs': async ({ content }) => {
    const f = path.join(P.plannotatorDir, 'install-prefs');
    const bk = createBackup('save-plannotator-prefs');
    bk.add(f); writeAtomic(f, String(content ?? '')); bk.finalize();
    return { message: 'บันทึก install-prefs แล้ว — มีผลตอนติดตั้ง/อัปเดต Plannotator ครั้งถัดไป' };
  },

  /* agent editing + Bazer */
  'save-agent': async ({ file, content }) => {
    const base = path.basename(String(file || ''));
    if (!base) throw new Error('ไม่รู้จักไฟล์');
    let target = null;
    const g = path.join(P.agentsDir, base);
    const fstr = String(file);
    if (!/[\\/]/.test(fstr) || path.resolve(fstr).toLowerCase() === path.resolve(g).toLowerCase()) { if (fs.existsSync(g)) target = g; }
    if (!target) { const p = projectOf(fstr); if (p) { const pp = path.join(p.root, '.opencode', 'agents', base); if (fs.existsSync(pp)) target = pp; } }
    if (!target) throw new Error('ไฟล์นี้ไม่อยู่ในรายการที่จัดการได้');
    if (typeof content !== 'string' || !content.trim()) throw new Error('เนื้อหาว่าง — ไม่บันทึก');
    const bk = createBackup('save-agent');
    bk.add(target);
    writeAtomic(target, content);
    bk.finalize();
    return { message: `บันทึก ${base} แล้ว (สำรองก่อนเขียน — มีผลกับ session ใหม่)` };
  },
  /* pStack models roles + mirrors */
  'pm-role-save': async ({ role, models, dryRun }) => {
    const r = String(role || '').trim();
    if (!['arena runners', 'arena cross-judge pool'].includes(r)) throw new Error('role นี้ไม่รองรับ: ' + role);
    const arr = (Array.isArray(models) ? models : []).map(x => String(x).trim()).filter(Boolean);
    let content = readText(P.pstackModels);
    if (content === null) content = pstackTemplateContent();
    const isRole = (l, r2) => { const i = l.indexOf(':'); return i > 0 && l.slice(0, i).trim() === r2; };
    const lines = content.split(/\r?\n/);
    const idx = lines.findIndex(l => isRole(l, r));
    if (arr.length) {
      const nl = `${r}: ${arr.join(', ')}`;
      if (idx >= 0) lines[idx] = nl; else lines.push(nl);
    } else if (idx >= 0) lines.splice(idx, 1);
    if (dryRun) return { message: `ทดสอบ: ${r} → ${arr.join(', ') || '(ลบบรรทัด)'}`, content: lines.join('\n') };
    const bk = createBackup('pm-role-save');
    bk.add(P.pstackModels);
    writeAtomic(P.pstackModels, lines.join('\n'));
    bk.finalize();
    return { message: `บันทึก ${r} แล้ว (${arr.length} โมเดล) — มีผลกับ session ใหม่` };
  },
  'pm-legacy-migrate': async () => {
    const content = readText(P.pstackModels);
    if (content === null) throw new Error('ยังไม่มี pstack-models.md');
    const isRole = (l, r2) => { const i = l.indexOf(':'); return i > 0 && l.slice(0, i).trim() === r2; };
    const lines = content.split(/\r?\n/);
    const li = lines.findIndex(l => isRole(l, 'bazer arena runners'));
    if (li < 0) return { message: 'ไม่พบบรรทัดเก่า bazer arena runners — ไม่มีอะไรต้องย้าย' };
    const oldVal = lines[li].slice(lines[li].indexOf(':') + 1).trim();
    const hasArena = lines.some(l => isRole(l, 'arena runners'));
    lines.splice(li, 1);
    let msg;
    if (hasArena) msg = 'ลบบรรทัดเก่าแล้ว (arena runners มีค่าอยู่แล้ว — Buddha ใช้ชุดเดียวกับ Arena)';
    else { lines.push(`arena runners: ${oldVal}`); msg = 'ย้ายค่าไปเป็น arena runners แล้ว (Buddha ใช้ชุดเดียวกับ Arena)'; }
    const bk = createBackup('pm-legacy-migrate');
    bk.add(P.pstackModels);
    writeAtomic(P.pstackModels, lines.join('\n'));
    bk.finalize();
    return { message: msg };
  },
  'pm-legacy-del': async () => {
    const content = readText(P.pstackModels);
    if (content === null) throw new Error('ยังไม่มี pstack-models.md');
    const lines = content.split(/\r?\n/);
    const li = lines.findIndex(l => { const i = l.indexOf(':'); return i > 0 && l.slice(0, i).trim() === 'bazer arena runners'; });
    if (li < 0) return { message: 'ไม่พบบรรทัดเก่า — ไม่มีอะไรต้องลบ' };
    lines.splice(li, 1);
    const bk = createBackup('pm-legacy-del');
    bk.add(P.pstackModels);
    writeAtomic(P.pstackModels, lines.join('\n'));
    bk.finalize();
    return { message: 'ลบบรรทัดเก่า bazer arena runners แล้ว' };
  },
  'mirror-agents': async ({ names, dryRun }) => {
    const want = Array.isArray(names) ? names : [];
    const list = MIRRORS.filter(m => !want.length || want.includes(m.id) || want.includes(m.skill));
    if (!list.length) throw new Error('ไม่รู้จักชื่อโหมดที่จะ mirror');
    const bk = createBackup('mirror-agents');
    const results = [];
    let n = 0;
    for (const m of list) {
      const src = findAgentSource(m.id);
      if (!src) { results.push({ id: m.id, name: m.name, skill: m.skill, status: 'no-source' }); continue; }
      const content = buildMirrorContent(m, src.content);
      const f = path.join(P.skillsDir, m.skill, 'SKILL.md');
      const prev = readText(f);
      const status = prev === null ? 'new' : (prev === content ? 'same' : 'diff');
      if (!dryRun && status !== 'same') { bk.add(f); writeAtomic(f, content); n++; }
      results.push({ id: m.id, name: m.name, skill: m.skill, status });
    }
    if (!dryRun) bk.finalize();
    const mustUpdate = results.filter(r => r.status === 'new' || r.status === 'diff').length;
    const noSource = results.filter(r => r.status === 'no-source').length;
    const msg = dryRun
      ? `ทดสอบ mirror: ต้องอัปเดต ${mustUpdate} · ตรงอยู่แล้ว ${results.length - mustUpdate - noSource}${noSource ? ' · ไม่มีต้นทาง ' + noSource : ''}`
      : `อัพเดต mirror แล้ว ${n} ตัว (ที่เหลือตรงอยู่แล้ว${noSource ? ' · ไม่มีต้นทาง ' + noSource : ''}) — โหลดด้วย ID ได้ทันทีใน session ใหม่`;
    return { message: msg, results };
  },
  'flow-apply': async ({ enable = true }) => {
    const src = path.join(BUNDLE, 'plugins', FLOW_PLUGIN_ID);
    if (!fs.existsSync(path.join(src, 'index.ts'))) throw new Error('ไม่พบ bundle/plugins/' + FLOW_PLUGIN_ID + ' — ชุดติดตั้งไม่ครบ');
    const bk = createBackup(enable ? 'flow-apply' : 'flow-disable');
    const log = [];
    const pluginDir = flowPluginDir();
    const builderPath = flowBuilderFile();
    const builderDisabled = builderPath + '.disabled';

    if (enable) {
      bk.add(pluginDir);
      fs.rmSync(pluginDir, { recursive: true, force: true });
      fs.mkdirSync(pluginDir, { recursive: true });
      fs.cpSync(src, pluginDir, { recursive: true, force: true });
      log.push('plugin');

      const builderSrc = path.join(BUNDLE, 'agents', 'builder.md');
      if (fs.existsSync(builderSrc)) {
        bk.add(builderPath);
        fs.mkdirSync(P.agentsDir, { recursive: true });
        fs.copyFileSync(builderSrc, builderPath);
        if (fs.existsSync(builderDisabled)) fs.rmSync(builderDisabled, { force: true });
        log.push('builder');
      }

      const r = parseJSONC(P.opencodeJsonc);
      const obj = r.ok && r.obj ? r.obj : { $schema: 'https://opencode.ai/config.json' };
      const key = obj.plugin && !obj.plugins ? 'plugin' : 'plugins';
      const arr = Array.isArray(obj[key]) ? obj[key] : [];
      if (!arr.some(x => String(typeof x === 'string' ? x : x?.package || '').includes(FLOW_PLUGIN_ID))) {
        arr.push('./plugins/' + FLOW_PLUGIN_ID);
        obj[key] = arr;
        bk.add(P.opencodeJsonc);
        writeAtomic(P.opencodeJsonc, jsonHeader('Global config') + JSON.stringify(obj, null, 2) + '\n');
        log.push('register');
      }

      const agentsMd = readText(P.agentsMd) || '';
      if (!agentsMd.includes(FLOW_GATE_MARKER)) {
        const block = [
          '',
          FLOW_GATE_MARKER,
          '## BAZER FLOW v2 gate',
          '',
          '- **Plan Mode:** ก่อนได้ `Plan approved!` ห้ามเขียน/แก้ไฟล์โปรเจกต์ และห้ามสั่ง `builder` ผ่าน `task` — หลังอนุมัติให้สร้างผ่าน subagent `builder` เท่านั้น',
          '- **Buddha Mode:** ทุกเฟสอยู่ใน Buddha เซสชันเดียว ห้ามสลับ agent; ก่อนอนุมัติเขียนได้เฉพาะ `%TEMP%\\bazer\\**`',
          '- แผนในแชตอย่างเดียวไม่นับอนุมัติ — ต้องผ่าน `submit_plan` หรือ Plannotator CLI gate และได้ผล approved',
          '',
        ].join('\n');
        bk.add(P.agentsMd);
        writeAtomic(P.agentsMd, (agentsMd.replace(/\s+$/, '') + '\n' + block));
        log.push('AGENTS gate');
      }
    } else {
      const r = parseJSONC(P.opencodeJsonc);
      const obj = r.ok && r.obj ? r.obj : null;
      if (obj) {
        const key = obj.plugin && !obj.plugins ? 'plugin' : 'plugins';
        const arr = Array.isArray(obj[key]) ? obj[key] : [];
        const next = arr.filter(x => !String(typeof x === 'string' ? x : x?.package || '').includes(FLOW_PLUGIN_ID));
        if (next.length !== arr.length) {
          obj[key] = next;
          bk.add(P.opencodeJsonc);
          writeAtomic(P.opencodeJsonc, jsonHeader('Global config') + JSON.stringify(obj, null, 2) + '\n');
          log.push('unregister');
        }
      }
      if (fs.existsSync(builderPath)) {
        bk.add(builderPath);
        fs.renameSync(builderPath, builderDisabled);
        log.push('builder off');
      }
    }

    bk.finalize();
    try { if (!configDrift().ok) await ACTIONS['refresh-config']({}); } catch {}
    try { await ACTIONS['mirror-agents']({}); log.push('mirror'); } catch {}
    if (enable) {
      try {
        const pl = await ACTIONS['plannotator-patch']({});
        log.push(pl.targets ? 'plannotator patch' : 'plannotator (ยังไม่มี cache)');
      } catch (e) { log.push('plannotator patch (ข้าม — ' + e.message + ')'); }
    }
    patchConfig({ flowkit: { on: !!enable } });
    const tail = log.length ? log.join(' · ') : 'ไม่มีอะไรต้องเปลี่ยน';
    return { message: `${enable ? 'ติดตั้ง/ซ่อม' : 'ปิด'} BAZER FLOW v2 แล้ว (${tail}) — มีผลกับ session ใหม่`, flowkit: gatherFlowkit() };
  },

  'flow-toggle': async ({ enable }) => ACTIONS['flow-apply']({ enable: !!enable }),

  'tui-defaults': async ({ dryRun }) => {
    const file = P.tuiJson;
    const r = parseJSONC(file);
    if (fs.existsSync(file) && !r.ok) throw new Error('tui.json parse ไม่ได้ — ไม่เขียนทับ: ' + (r.error || 'unknown'));
    const obj = r.ok && r.obj ? r.obj : { $schema: 'https://opencode.ai/tui.json' };
    obj.keybinds = obj.keybinds && typeof obj.keybinds === 'object' && !Array.isArray(obj.keybinds) ? obj.keybinds : {};
    const cur = obj.keybinds.messages_copy;
    if (Array.isArray(cur) && cur.length) return { message: `keybind copy latest มีค่าแล้ว (${cur.join(', ')}) — ไม่ทับ`, value: cur };
    obj.keybinds.messages_copy = DEFAULT_COPY_KEYBINDS.slice();
    if (dryRun) return { message: `ทดสอบ: messages_copy → ${DEFAULT_COPY_KEYBINDS.join(', ')}`, content: obj };
    const bk = createBackup('tui-defaults');
    bk.add(file);
    writeAtomic(file, JSON.stringify(obj, null, 2) + '\n');
    bk.finalize();
    return { message: `ตั้งค่า keybind copy latest = ${DEFAULT_COPY_KEYBINDS.join(', ')} ใน tui.json แล้ว (มีผลกับ TUI รอบใหม่)` };
  },

  'shortcut-apply': async ({ dryRun }) => {
    const root = path.resolve(__dirname, '..');
    const target = PLAT ? PLAT.portableLauncherPath(root) : path.join(root, 'BAZER CONSOLE - WINDOW (Windows).vbs');
    const link = PLAT ? PLAT.shortcutPath(root) : path.join(root, 'BAZER CONSOLE - WINDOW (Windows).lnk');
    if (!fs.existsSync(target)) throw new Error('ไม่พบ portable launcher: ' + target);
    if (PLAT) { const r = await PLAT.applyShortcut({ root, dryRun }); if (!r.ok) throw new Error(r.message); return { message: r.message }; }
    if (dryRun) return { message: 'ทดสอบ: จะสร้าง ' + link };
    const q = (s) => String(s).replace(/'/g, "''");
    const script = [
      '$w = New-Object -ComObject WScript.Shell',
      `$s = $w.CreateShortcut('${q(link)}')`,
      `$s.TargetPath = '${q(target)}'`,
      `$s.WorkingDirectory = '${q(root)}'`,
      '$s.IconLocation = "$env:SystemRoot\\System32\\wscript.exe,0"',
      "$s.Description = 'BAZER Console'",
      '$s.Save()',
    ].join('; ');
    const r = await ps(script, 20000);
    if (r.code !== 0 || !fs.existsSync(link)) throw new Error('สร้าง shortcut ไม่สำเร็จ: ' + (r.err || r.out || 'unknown'));
    return { message: 'สร้าง shortcut แล้ว: ' + link };
  },

  'install-agent': async ({ file, dryRun }) => {
    const base = path.basename(String(file || ''));
    if (!base.endsWith('.md')) throw new Error('ต้องเป็นไฟล์ .md');
    const src = path.join(BUNDLE, 'agents', base);
    if (!fs.existsSync(src)) throw new Error('ไม่พบไฟล์ต้นทางใน bundle: ' + base);
    const dst = path.join(P.agentsDir, base);
    if (dryRun) return { message: `ทดสอบ: จะติดตั้ง ${base} → ${dst}` };
    const bk = createBackup('install-agent');
    bk.add(dst);
    fs.mkdirSync(P.agentsDir, { recursive: true });
    fs.copyFileSync(src, dst);
    bk.finalize();
    return { message: `ติดตั้ง ${base} จาก bundle แล้ว (สำรองของเดิม — มีผลกับ session ใหม่)` };
  },

  /* projects + setup */
  'scan-projects': async () => {
    const items = await scanProjects();
    return { message: `สแกนพบ ${items.length} โปรเจกต์`, projects: items };
  },
  'project-agent-toggle': async ({ file, enable }) => {
    const p = projectOf(file);
    if (!p) throw new Error('ไฟล์นี้ไม่อยู่ในโปรเจกต์ที่สแกนไว้ — กดสแกนก่อน');
    const base = path.basename(file);
    const from = path.join(p.root, '.opencode', 'agents', base);
    if (!fs.existsSync(from)) throw new Error('ไม่พบไฟล์: ' + base);
    fs.renameSync(from, enable ? from.replace(/\.disabled$/, '') : from + '.disabled');
    return { message: `${enable ? 'เปิด' : 'ปิด'} agent ${base} ในโปรเจกต์แล้ว` };
  },
  'project-agent-del': async ({ file }) => {
    const p = projectOf(file);
    if (!p) throw new Error('ไฟล์นี้ไม่อยู่ในโปรเจกต์ที่สแกนไว้');
    const base = path.basename(file);
    const f = path.join(p.root, '.opencode', 'agents', base);
    if (!fs.existsSync(f)) throw new Error('ไม่พบไฟล์: ' + base);
    const bk = createBackup('project-agent-del');
    bk.add(f);
    fs.rmSync(f);
    bk.finalize();
    return { message: `ลบ ${base} จากโปรเจกต์แล้ว (สำรองไว้)` };
  },
  'project-agent-add': async ({ root, name }) => {
    const p = PROJECTS.items.find(x => path.resolve(x.root).toLowerCase() === path.resolve(root || '').toLowerCase());
    if (!p) throw new Error('ไม่พบโปรเจกต์นี้ — กดสแกนก่อน');
    const base = path.basename(name || '');
    if (!base) throw new Error('ยังไม่ได้เลือก agent');
    const srcBundle = path.join(BUNDLE, 'agents', base);
    const srcLive = path.join(P.agentsDir, base);
    const src = fs.existsSync(srcBundle) ? srcBundle : (fs.existsSync(srcLive) ? srcLive : null);
    if (!src) throw new Error('ไม่พบ agent ต้นทาง: ' + base);
    const dst = path.join(p.root, '.opencode', 'agents', base);
    if (fs.existsSync(dst)) throw new Error('มีไฟล์นี้อยู่แล้วในโปรเจกต์');
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    return { message: `ติดตั้ง ${base} เข้าโปรเจกต์แล้ว` };
  },
  'project-init': async ({ root }) => {
    const p = PROJECTS.items.find(x => path.resolve(x.root).toLowerCase() === path.resolve(root || '').toLowerCase());
    if (!p) throw new Error('ไม่พบโปรเจกต์นี้ — กดสแกนก่อน');
    if (!fs.existsSync(p.root)) throw new Error('โฟลเดอร์โปรเจกต์ไม่มีอยู่จริง');
    const ad = path.join(p.root, '.opencode', 'agents');
    fs.mkdirSync(ad, { recursive: true });
    let n = 0;
    try {
      for (const f of fs.readdirSync(path.join(BUNDLE, 'agents')).filter(x => x.endsWith('.md'))) {
        const dst = path.join(ad, f);
        if (!fs.existsSync(dst)) { fs.copyFileSync(path.join(BUNDLE, 'agents', f), dst); n++; }
      }
    } catch {}
    const extras = [];
    const agm = path.join(p.root, 'AGENTS.md');
    const agmTpl = path.join(BUNDLE, 'config', 'AGENTS.md.template');
    if (!fs.existsSync(agm) && fs.existsSync(agmTpl)) { fs.copyFileSync(agmTpl, agm); extras.push('AGENTS.md'); }
    if (!fs.existsSync(path.join(p.root, 'opencode.json')) && !fs.existsSync(path.join(p.root, 'opencode.jsonc'))) {
      fs.writeFileSync(path.join(p.root, 'opencode.json'), JSON.stringify({ $schema: 'https://opencode.ai/config.json' }, null, 2) + '\n');
      extras.push('opencode.json');
    }
    return { message: `ติดตั้ง .opencode เริ่มต้นแล้ว — agents ใหม่ ${n} · ${extras.join(', ') || 'ไม่มีไฟล์เพิ่ม'}` };
  },
  'setup-preview': async () => {
    if (!fs.existsSync(path.join(BUNDLE, 'skills'))) throw new Error('ไม่พบโฟลเดอร์ bundle ในตัวแอป — ชุดติดตั้งไม่ครบ');
    const steps = [];
    const needDirs = [P.config, P.agentsDir, P.commandsDir, P.skillsDir].filter(d => !fs.existsSync(d));
    steps.push({ id: 'dirs', label: 'สร้างโฟลเดอร์พื้นฐาน', detail: needDirs.length ? 'จะสร้าง: ' + needDirs.join(' · ') : 'มีครบแล้ว', will: true });
    const gp = parseJSONC(P.opencodeJsonc);
    const arr = (gp.obj && (gp.obj.plugin || gp.obj.plugins)) || [];
    const hasPl = Array.isArray(arr) && arr.some(x => JSON.stringify(x).includes('plannotator'));
    steps.push({ id: 'plugins', label: 'ลงทะเบียนปลั๊กอิน Plannotator (เปิด submit_plan ให้ plan + buddha + arena + snack + poteto-mode)', detail: hasPl ? 'มีอยู่แล้ว — ข้าม' : 'จะเพิ่มใน ' + P.opencodeJsonc, will: !hasPl });
    const countCopy = (src, dst) => {
      let fresh = 0, exist = 0;
      try {
        for (const d of fs.readdirSync(src, { withFileTypes: true })) {
          const check = d.isDirectory() ? path.join(dst, d.name, 'SKILL.md') : path.join(dst, d.name);
          if (fs.existsSync(check)) exist++; else fresh++;
        }
      } catch {}
      return { fresh, exist };
    };
    const cs = countCopy(path.join(BUNDLE, 'skills'), P.skillsDir);
    steps.push({ id: 'skills', label: `ติดตั้ง skills — ใหม่ ${cs.fresh} / มีอยู่แล้ว ${cs.exist}`, detail: 'จาก bundle → ' + P.skillsDir, will: cs.fresh > 0 });
    const ca = countCopy(path.join(BUNDLE, 'agents'), P.agentsDir);
    steps.push({ id: 'agents', label: `ติดตั้ง agents — ใหม่ ${ca.fresh} / มีอยู่แล้ว ${ca.exist}`, detail: 'Bazer, arena, Snack, poteto-mode, poteto-agent, comment-sicko, buddha, advisor → ' + P.agentsDir, will: ca.fresh > 0 });
    const cc = countCopy(path.join(BUNDLE, 'commands'), P.commandsDir);
    steps.push({ id: 'commands', label: `ติดตั้ง commands — ใหม่ ${cc.fresh} / มีอยู่แล้ว ${cc.exist}`, detail: '→ ' + P.commandsDir, will: cc.fresh > 0 });
    steps.push({ id: 'agents-md', label: 'สร้างกฎ AGENTS.md ระดับเครื่อง', detail: fs.existsSync(P.agentsMd) ? 'มีอยู่แล้ว — ข้าม' : 'จะสร้างจาก template', will: !fs.existsSync(P.agentsMd) });
    steps.push({ id: 'pstack-models', label: 'สร้าง pstack-models.md (โมเดลต่อ role)', detail: fs.existsSync(P.pstackModels) ? 'มีอยู่แล้ว — ข้าม' : 'จะสร้างจาก template', will: !fs.existsSync(P.pstackModels) });
    {
      const tj = safe(() => parseJSONC(P.tuiJson), { ok: false, obj: null });
      const kb = tj && tj.obj && tj.obj.keybinds ? tj.obj.keybinds.messages_copy : null;
      const filled = Array.isArray(kb) && kb.length > 0;
      steps.push({
        id: 'tui-defaults',
        label: 'ตั้งค่า keybind เริ่มต้น (copy latest = ' + DEFAULT_COPY_KEYBINDS.join(' / ') + ')',
        detail: filled ? `มีค่าแล้ว (${kb.join(', ')}) — ไม่ทับ` : 'จะเขียนใน ' + P.tuiJson,
        will: !filled,
      });
    }
    {
      const root = path.resolve(__dirname, '..');
      const link = PLAT ? PLAT.shortcutPath(root) : path.join(root, 'BAZER CONSOLE - WINDOW (Windows).lnk');
      steps.push({
        id: 'shortcut',
        label: 'สร้าง shortcut "BAZER CONSOLE - WINDOW"',
        detail: fs.existsSync(link) ? 'มีอยู่แล้วที่ ' + link : 'จะสร้าง shortcut ชี้ portable launcher (clone แล้วยังใช้ได้)',
        will: !fs.existsSync(link),
      });
    }
    {
      const bfSrc = path.join(BUNDLE, 'plugins', 'bazer-fire');
      if (fs.existsSync(path.join(bfSrc, 'index.ts'))) {
        const bfDst = path.join(P.config, 'plugins', 'bazer-fire');
        const bfFile = fs.existsSync(path.join(bfDst, 'index.ts'));
        let bfReg = false;
        try {
          const gp2 = parseJSONC(P.opencodeJsonc);
          const arr2 = (gp2.obj && (gp2.obj.plugin || gp2.obj.plugins)) || [];
          bfReg = Array.isArray(arr2) && arr2.some(x => String(typeof x === 'string' ? x : x?.package || '').includes('bazer-fire'));
        } catch {}
        steps.push({ id: 'plugins-bazer-fire', label: 'ติดตั้งปลั๊กอิน bazer-fire (ไฟ 🔥 ลุกในโหมด Bazer)', detail: (bfFile && bfReg) ? 'มีอยู่แล้ว — ข้าม' : 'จะคัดลอกไป ' + bfDst + (bfReg ? '' : ' + ลงทะเบียน ./plugins/bazer-fire ใน ' + P.opencodeJsonc), will: !(bfFile && bfReg) });
      }
    }
    {
      const fk = safe(gatherFlowkit, { pluginFile: false, registered: false, builder: false });
      steps.push({
        id: 'flow',
        label: 'ติดตั้ง BAZER FLOW v2 (Plan gate + builder + prompt badge)',
        detail: (fk.pluginFile && fk.registered && fk.builder)
          ? 'มีอยู่แล้ว — ข้าม'
          : 'จะติดตั้งปลั๊กอิน bazer-flow + agent builder + ลงทะเบียน ./plugins/bazer-flow + เติมกฎ AGENTS.md',
        will: !(fk.pluginFile && fk.registered && fk.builder),
      });
    }
    {
      const st = safe(plannotatorPatchState, { total: 0, stale: 0, patched: 0, unknown: 0, notInVersion: [] });
      const na = st.notInVersion || [];
      const naNote = na.length ? ` · จุด ${na.join(', ')} ไม่มีในเวอร์ชันนี้` : '';
      steps.push({
        id: 'plannotator-patch',
        label: 'อัพเดต config ปุ่มอนุมัติ Plannotator → Buddha (ปุ่มอ่าน "Approve → Buddha" ไม่มี "(?)" · Buddha เรียก builder เป็น subagent inline)',
        detail: !st.total
          ? 'ยังไม่พบ plannotator.html — จะลองใหม่ให้อัตโนมัติทุกครั้งที่กดอัพเดต/ซิงค์ (หลังเปิด OpenCode ครั้งแรก)'
          : st.stale
            ? `จะแพตช์ ${st.stale}/${st.total} ไฟล์ให้ครบ 5 จุด (label + key plannotator-approve-target-v2 · สำรอง .bak ก่อนเขียน)${naNote}`
            : st.unknown
              ? `อ่านสถานะไม่ได้ ${st.unknown}/${st.total} ไฟล์ — Plannotator อาจเปลี่ยนโครง html (ตรวจด้วย patch-plannotator.mjs --check)${naNote}`
              : `แพตช์ครบแล้ว ${st.patched}/${st.total} ไฟล์ (5/5 จุด · label "Approve → Buddha" ไม่มี "(?)")`,
        will: st.stale > 0,
      });
    }
    steps.push({ id: 'lock-file', label: 'ไฟล์ล็อก server (serve-restricted.jsonc)', detail: fs.existsSync(P.serveRestricted) ? 'มีอยู่แล้ว — ข้าม' : 'จะสร้างค่าเริ่มต้นแบบปลดล็อก (สลับโหมดได้ในแท็บ ล็อก & โมเดล)', will: !fs.existsSync(P.serveRestricted) });
    const launchTarget = launchDirResolved();
    const serveExists = fs.existsSync(path.join(launchTarget, PLAT ? PLAT.SERVER_LAUNCHER : 'opencode-serve.vbs'));
    let launchMissing = 0;
    try { launchMissing = fs.readdirSync(LAUNCH_TPL_DIR).filter(f => !fs.existsSync(path.join(launchTarget, f))).length; } catch {}
    steps.push({ id: 'launch', label: 'ติดตั้งไฟล์ launch (เปิด server 4096 + สคริปต์สลับโหมดล็อก)', detail: (serveExists && !launchMissing) ? 'มีอยู่แล้วที่ ' + launchTarget : 'จะสร้างที่ ' + launchTarget + (CFG.launchDir ? '' : ' + ตั้ง launchDir ให้แอป') + (launchMissing ? ` (ยังขาด ${launchMissing} ไฟล์)` : ''), will: !serveExists || launchMissing > 0 });
    {
      const ms = safe(mirrorStatus, []);
      const msBad = ms.filter(x => !x.synced).length;
      steps.push({ id: 'mirror', label: `mirror โหมด → skills (BAZERs-EXTENSION-*) — ต้องอัพเดต ${msBad} / ${ms.length}`, detail: 'ให้โหมดต่าง ๆ เรียกกันได้ (เช่น Buddha เรียก Arena) — เขียนที่ ' + P.skillsDir, will: msBad > 0 });
    }
    return { steps, message: `${steps.filter(s => s.will).length} ขั้นตอนพร้อมติดตั้ง` };
  },
  'setup-apply': async ({ steps = [], overwrite = false, autostart = false }) => {
    if (!fs.existsSync(path.join(BUNDLE, 'skills'))) throw new Error('ไม่พบโฟลเดอร์ bundle');
    const has = id => steps.includes(id);
    const log = [];
    if (has('dirs')) {
      for (const d of [P.config, P.agentsDir, P.commandsDir, P.skillsDir, path.dirname(P.pstackModels)]) fs.mkdirSync(d, { recursive: true });
      log.push('โฟลเดอร์พื้นฐาน');
    }
    if (has('plugins')) {
      const r = parseJSONC(P.opencodeJsonc);
      const obj = r.ok && r.obj ? r.obj : { $schema: 'https://opencode.ai/config.json' };
      const key = obj.plugin && !obj.plugins ? 'plugin' : 'plugins';
      let arr2 = Array.isArray(obj[key]) ? obj[key] : [];
      arr2 = arr2.filter(x => !JSON.stringify(x).includes('plannotator'));
      const opts = { workflow: 'plan-agent', planningAgents: PLAN_AGENTS };
      arr2.push(key === 'plugin' ? ['@plannotator/opencode@latest', opts] : { package: '@plannotator/opencode@latest', options: opts });
      obj[key] = arr2;
      const bk = createBackup('setup-plugins');
      bk.add(P.opencodeJsonc);
      writeAtomic(P.opencodeJsonc, jsonHeader('Global config') + JSON.stringify(obj, null, 2) + '\n');
      bk.finalize();
      log.push('ปลั๊กอิน Plannotator');
    }
    if (has('skills') || has('agents') || has('commands')) {
      const bk = createBackup('setup-copy');
      let n = 0, skipped = 0;
      if (has('skills')) {
        for (const d of fs.readdirSync(path.join(BUNDLE, 'skills'), { withFileTypes: true }).filter(x => x.isDirectory())) {
          const src = path.join(BUNDLE, 'skills', d.name);
          if (!fs.existsSync(path.join(src, 'SKILL.md'))) continue;
          const dst = path.join(P.skillsDir, d.name);
          if (fs.existsSync(path.join(dst, 'SKILL.md')) && !overwrite) { skipped++; continue; }
          if (overwrite && fs.existsSync(dst)) bk.add(dst);
          fs.cpSync(src, dst, { recursive: true, force: true });
          n++;
        }
      }
      const doFiles = (srcDir, dstDir) => {
        if (!fs.existsSync(srcDir)) return;
        fs.mkdirSync(dstDir, { recursive: true });
        for (const f of fs.readdirSync(srcDir).filter(x => x.endsWith('.md'))) {
          const dst = path.join(dstDir, f);
          if (fs.existsSync(dst) && !overwrite) { skipped++; continue; }
          if (overwrite && fs.existsSync(dst)) bk.add(dst);
          fs.copyFileSync(path.join(srcDir, f), dst);
          n++;
        }
      };
      if (has('agents')) doFiles(path.join(BUNDLE, 'agents'), P.agentsDir);
      if (has('commands')) doFiles(path.join(BUNDLE, 'commands'), P.commandsDir);
      bk.finalize();
      log.push(`คัดลอกไฟล์ +${n}${skipped ? ` · ข้าม ${skipped}` : ''}`);
    }
    if (has('agents-md') && !fs.existsSync(P.agentsMd)) {
      const tpl = path.join(BUNDLE, 'config', 'AGENTS.md.template');
      if (fs.existsSync(tpl)) { fs.mkdirSync(path.dirname(P.agentsMd), { recursive: true }); fs.copyFileSync(tpl, P.agentsMd); log.push('AGENTS.md'); }
    }
    if (has('pstack-models') && !fs.existsSync(P.pstackModels)) {
      writeAtomic(P.pstackModels, pstackTemplateContent());
      log.push('pstack-models.md');
    }
    if (has('plugins-bazer-fire')) {
      const src = path.join(BUNDLE, 'plugins', 'bazer-fire');
      const dst = path.join(P.config, 'plugins', 'bazer-fire');
      if (fs.existsSync(path.join(src, 'index.ts'))) {
        fs.mkdirSync(dst, { recursive: true });
        fs.cpSync(src, dst, { recursive: true, force: true });
        const r2 = parseJSONC(P.opencodeJsonc);
        const obj2 = r2.ok && r2.obj ? r2.obj : { $schema: 'https://opencode.ai/config.json' };
        const key2 = obj2.plugin && !obj2.plugins ? 'plugin' : 'plugins';
        let arr2 = Array.isArray(obj2[key2]) ? obj2[key2] : [];
        if (!arr2.some(x => String(typeof x === 'string' ? x : x?.package || '').includes('bazer-fire'))) {
          arr2.unshift('./plugins/bazer-fire');
          obj2[key2] = arr2;
          const bk2 = createBackup('setup-bazer-fire');
          bk2.add(P.opencodeJsonc);
          writeAtomic(P.opencodeJsonc, jsonHeader('Global config') + JSON.stringify(obj2, null, 2) + '\n');
          bk2.finalize();
        }
        log.push('ปลั๊กอิน bazer-fire');
      }
    }
    if (has('flow')) {
      try { const f = await ACTIONS['flow-apply']({ enable: true }); log.push(f.message); }
      catch (e) { log.push('flow (ข้าม — ' + e.message + ')'); }
    }
    if (has('plannotator-patch')) {
      try { const pl = await ACTIONS['plannotator-patch']({}); log.push(pl.targets ? pl.message : 'plannotator patch (ยังไม่มี cache — จะแพตช์ตอนอัพเดต)'); }
      catch (e) { log.push('plannotator patch (ข้าม — ' + e.message + ')'); }
    }
    if (has('tui-defaults')) {
      try { const t = await ACTIONS['tui-defaults']({}); log.push(t.message); }
      catch (e) { log.push('tui-defaults (ข้าม — ' + e.message + ')'); }
    }
    if (has('shortcut')) {
      try { const s = await ACTIONS['shortcut-apply']({}); log.push(s.message); }
      catch (e) { log.push('shortcut (ข้าม — ' + e.message + ')'); }
    }
    if (has('lock-file') && !fs.existsSync(P.serveRestricted)) {
      const bk3 = createBackup('setup-lock-file');
      bk3.add(P.serveRestricted);
      writeAtomic(P.serveRestricted, jsonHeader('ไฟล์ล็อกของเซอร์เวอร์') + JSON.stringify({ $schema: 'https://opencode.ai/config.json' }, null, 2) + '\n');
      bk3.finalize();
      log.push('serve-restricted.jsonc');
    }
    if (has('launch')) {
      const target = launchDirResolved();
      fs.mkdirSync(target, { recursive: true });
      let nL = 0;
      try {
        for (const f of fs.readdirSync(LAUNCH_TPL_DIR)) {
          const src = path.join(LAUNCH_TPL_DIR, f);
          if (!fs.statSync(src).isFile()) continue;
          const dst = path.join(target, f);
          if (!fs.existsSync(dst)) { fs.writeFileSync(dst, readText(src) ?? ''); nL++; }
        }
      } catch {}
      chmodLaunchers(target);
      if (!CFG.launchDir) patchConfig({ launchDir: target });
      log.push('ไฟล์ launch: ' + target + (nL ? ' (+' + nL + ')' : ''));
    }
    if (autostart) { await ACTIONS['autostart']({ on: true }); log.push('autostart'); }
    if (has('mirror')) { try { await ACTIONS['mirror-agents']({}); log.push('mirror โหมด → skills'); } catch { log.push('mirror โหมด (ข้าม — error)'); } }
    return { message: 'ติดตั้งเสร็จ — ' + log.join(' · ') };
  },

  'update-check': async () => {
    const items = packUpdateItems().map(it => ({ cat: it.cat, name: it.name, status: packStatus(it) }));
    const counts = { new: 0, diff: 0, same: 0 };
    for (const it of items) counts[it.status]++;
    const templates = safe(templateDrift, []);
    const cfg = configDrift();
    const tmplBad = templates.filter(t => t.status === 'missing' || t.status === 'stale');
    return {
      counts,
      total: items.length,
      changed: items.filter(i => i.status !== 'same'),
      templates,
      config: cfg,
      launch: safe(launchAudit, { items: [], template: [], extra: [] }),
      launchSkipped: !CFG.launchDir && !fs.existsSync(path.join(HOME, 'opencode-launch')),
      message: `ตรวจแล้ว — ต่าง ${counts.diff} · ใหม่ ${counts.new} · เหมือน ${counts.same}`
        + (tmplBad.length ? ` · ต้องดู: ${tmplBad.map(t => t.key + (t.status === 'stale' ? ' (template ใหม่กว่า)' : ' (ยังไม่มี)')).join(', ')}` : '')
        + (cfg.ok ? '' : ` · planningAgents ขาด: ${cfg.missing.join(', ')}`),
    };
  },

  'update-apply': async () => {
    const todo = packUpdateItems().map(it => ({ ...it, status: packStatus(it) })).filter(it => it.status !== 'same');
    const bk = createBackup('update-pack');
    let n = 0;
    for (const it of todo) {
      try {
        bk.add(it.dst);
        if (it.kind === 'dir') fs.cpSync(it.src, it.dst, { recursive: true, force: true });
        else { fs.mkdirSync(path.dirname(it.dst), { recursive: true }); fs.copyFileSync(it.src, it.dst); }
        n++;
      } catch {}
    }
    bk.finalize();
    if (PLAT && todo.some(it => it.cat === 'launch')) chmodLaunchers(launchDirResolved());
    const extra = [];
    try { await ACTIONS['mirror-agents']({}); extra.push('mirror'); } catch { extra.push('mirror ข้าม (error)'); }
    try { if (!configDrift().ok) { await ACTIONS['refresh-config']({}); extra.push('planningAgents'); } } catch {}
    try {
      const pl = await ACTIONS['plannotator-patch']({});
      if (pl.applied) extra.push(`plannotator patch ${pl.applied}`);
      else if (pl.state && pl.state.stale) extra.push('plannotator patch ล้มเหลว (ดู log)');
    } catch { extra.push('plannotator patch ข้าม (error)'); }
    const tail = extra.length ? ' + ' + extra.join(' · ') : '';
    if (!n) return { message: `ไม่มีไฟล์ต้องอัพเดต${tail ? ' (ปรับให้แล้ว:' + tail + ')' : ''}`, applied: 0 };
    return { message: `อัพเดตแล้ว ${n} รายการ (สำรองอัตโนมัติก่อนเขียน)${tail}`, applied: n };
  },

  /* Plannotator: ปุ่มอนุมัติ → Buddha (patch vendor ไฟล์ html 5 จุด) — เรียกได้จากปุ่ม + ติดไปกับ install/update */
  'plannotator-patch': async ({ dryRun } = {}) => {
    const st = safe(plannotatorPatchState, { total: 0, stale: 0, patched: 0, unknown: 0, notInVersion: [] });
    const r = safe(() => plPatchApplyAll({ dryRun: !!dryRun, home: HOME }), { targets: 0, discovered: 0, applied: 0, skipped: 0, errors: 1, details: [], notInVersion: [] });
    const parts = [`applied=${r.applied}`, `skipped=${r.skipped}`, `targets=${r.targets}`];
    if (r.errors) parts.push(`errors=${r.errors}`);
    const na = [...new Set([...(r.notInVersion || []).map(n => n.id), ...(st.notInVersion || [])])];
    const naNote = na.length ? ` · จุด ${na.join(', ')} ไม่มีในเวอร์ชันนี้` : '';
    if (!r.targets) {
      return { message: 'ยังไม่พบ plannotator.html (Plannotator ยังไม่ถูกติดตั้งบนเครื่องนี้) — ปุ่มติดตั้ง/อัพเดต/ซิงค์จะลองให้ใหม่ทุกครั้ง', ...r, state: st };
    }
    const where = (r.details || []).filter(d => d.applied).map(d => `${path.basename(path.dirname(path.dirname(d.file)))}/${path.basename(path.dirname(d.file))}`);
    const msg = `${dryRun ? 'ทดสอบ: ' : ''}อัพเดต config ปุ่มอนุมัติ Plannotator → Buddha — อ่าน "Approve → Buddha" ไม่มี "(?)" · 5 จุด (ค่าเริ่มต้น buddha · key plannotator-approve-target-v2 ทับค่าเก่าในเบราว์เซอร์) · ${parts.join(' · ')}${where.length ? ' · ' + where.join(', ') : ''}${naNote}${r.errors ? ' · มีไฟล์ที่แพตช์ไม่ได้ (ดู log)' : ''} — ตรวจซ้ำด้วย patch-plannotator.mjs --check`;
    return { message: msg, ...r, state: st };
  },

  'refresh-config': async ({ dryRun }) => {
    const r = parseJSONC(P.opencodeJsonc);
    const obj = r.ok && r.obj ? r.obj : { $schema: 'https://opencode.ai/config.json' };
    const key = obj.plugin && !obj.plugins ? 'plugin' : 'plugins';
    let arr = Array.isArray(obj[key]) ? obj[key] : [];
    let found = false;
    arr = arr.map(x => {
      if (!JSON.stringify(x).includes('plannotator')) return x;
      found = true;
      const name = Array.isArray(x) ? String(x[0]) : (typeof x === 'string' ? x : x.package);
      const prev = Array.isArray(x) ? (x[1] || {}) : (typeof x === 'string' ? {} : (x.options || {}));
      const next = { ...prev, workflow: 'plan-agent', planningAgents: PLAN_AGENTS };
      return key === 'plugin' ? [name, next] : { package: name, options: next };
    });
    if (!found) throw new Error('ไม่พบปลั๊กอิน Plannotator ใน config — เปิดปลั๊กอินก่อน (แท็บ Plannotator)');
    obj[key] = arr;
    if (dryRun) return { message: `ทดสอบ: planningAgents → ${PLAN_AGENTS.join(', ')}`, before: configDrift() };
    const bk = createBackup('refresh-config');
    bk.add(P.opencodeJsonc);
    writeAtomic(P.opencodeJsonc, jsonHeader('Global config') + JSON.stringify(obj, null, 2) + '\n');
    bk.finalize();
    return { message: `รีเฟรช config แล้ว — planningAgents: ${PLAN_AGENTS.join(', ')} (มีผลกับ session ใหม่)` };
  },

  'reset-template': async ({ name, dryRun }) => {
    const map = {
      'AGENTS.md': { src: path.join(BUNDLE, 'config', 'AGENTS.md.template'), dst: P.agentsMd },
      'pstack-models.md': { src: path.join(BUNDLE, 'config', 'pstack-models.template.md'), dst: P.pstackModels, extract: true },
    };
    const it = map[String(name)];
    if (!it) throw new Error('ไม่รู้จัก template: ' + name);
    const out = it.extract ? pstackTemplateContent() : (readText(it.src) ?? '');
    if (!out) throw new Error('อ่าน template ไม่ได้: ' + name);
    if (dryRun) return { message: `ทดสอบ: จะเขียน ${name} จาก template`, content: out };
    const bk = createBackup('reset-template');
    bk.add(it.dst); writeAtomic(it.dst, out); bk.finalize();
    return { message: `รีเซ็ต ${name} จาก template แล้ว (สำรองของเดิมไว้ — กู้คืนได้ในแท็บประวัติ)` };
  },

  'sync-all': async () => {
    const log = [];
    try { const u = await ACTIONS['update-apply']({}); log.push(u.message); } catch (e) { log.push('อัพเดต: ' + e.message); }
    try { const c = await ACTIONS['refresh-config']({}); log.push(c.message); } catch (e) { log.push('config: ' + e.message); }
    try { const m = await ACTIONS['mirror-agents']({}); log.push(m.message); } catch (e) { log.push('mirror: ' + e.message); }
    try {
      const fk = safe(gatherFlowkit, { pluginFile: false });
      if (fk.pluginFile || (CFG.flowkit && CFG.flowkit.on)) { await ACTIONS['flow-apply']({ enable: true }); log.push('flow (ซ่อม)'); }
    } catch (e) { log.push('flow (ข้าม — ' + e.message + ')'); }
    try { await ACTIONS['tui-defaults']({}); log.push('keybind (เติมค่าเริ่มต้นถ้ายังว่าง)'); } catch {}
    try { await ACTIONS['shortcut-apply']({}); log.push('shortcut'); } catch {}
    const templates = safe(templateDrift, []);
    const stale = templates.filter(t => t.status === 'stale' || t.status === 'missing');
    if (stale.length) {
      log.push(`ไฟล์ส่วนตัวยังต่างจาก template ${stale.length} ตัว: ` + stale.map(t => t.key).join(', ')
        + ' — ระบบไม่ทับให้เอง'
        + (stale.some(t => t.status === 'stale') ? ' · กด "รีเซ็ตจาก template" ในแท็บภาพรวมถ้าต้องการของใหม่ (สำรองก่อนเขียน)' : ' · กดติดตั้ง/อัพเดตเพื่อสร้างให้'));
    }
    const v = await runVerify();
    return { message: 'ซิงค์ทั้งหมด — ' + log.join(' · '), verify: v.summary, templates, launch: safe(launchAudit, { items: [], template: [], extra: [] }) };
  },

  /* misc */
  'open-folder': async ({ key }) => {
    const map = {
      console: __dirname, bundle: BUNDLE, config: P.config, skills: P.skillsDir, agents: P.agentsDir, commands: P.commandsDir,
      state: P.stateDir, launch: launchDirResolved(), build: CFG.buildDir, plannotator: P.plannotatorDir,
      cache: P.cacheNpm, backups: P.backups, claude: P.claudeSkills,
    };
    const dir = map[key];
    if (!dir) throw new Error((key === 'launch' || key === 'build') ? 'ยังไม่ได้ตั้งค่าโฟลเดอร์นี้ — ดู console.config.json หรือกด Setup' : 'key ไม่ถูกต้อง');
    if (!fs.existsSync(dir)) throw new Error('ไม่พบโฟลเดอร์: ' + dir);
    if (PLAT) PLAT.openPath(dir);
    else spawn('explorer.exe', [dir], { detached: true, stdio: 'ignore' }).unref();
    return { message: 'เปิดโฟลเดอร์แล้ว: ' + dir };
  },

  'restore-backup': async ({ set }) => {
    const dir = path.join(P.backups, path.basename(set));
    const mf = parseJSONC(path.join(dir, 'manifest.json'));
    if (!mf.ok || !mf.obj?.files) throw new Error('ไม่พบ manifest ของชุดสำรองนี้');
    const bk = createBackup('restore-' + path.basename(set));
    let n = 0, skipped = 0;
    for (const it of mf.obj.files) {
      if (!isAllowedPath(it.orig)) { skipped++; continue; }
      const stored = path.join(dir, it.stored);
      if (!fs.existsSync(stored)) { skipped++; continue; }
      bk.add(it.orig);
      if (it.kind === 'dir') fs.cpSync(stored, it.orig, { recursive: true, force: true });
      else { fs.mkdirSync(path.dirname(it.orig), { recursive: true }); fs.copyFileSync(stored, it.orig); }
      n++;
    }
    bk.finalize();
    return { message: `กู้คืนแล้ว ${n} รายการ${skipped ? ' (ข้าม ' + skipped + ' นอก allowlist)' : ''} — สถานะก่อนกู้ถูกสำรองใหม่อีกชุด` };
  },
};

/* ---------------------------------- state ---------------------------------- */

async function gatherState() {
  const s = {
    app: { version: APP_VERSION, port: CFG.port, node: process.version, startedAt: STARTED_AT },
    paths: {
      config: P.config, launchDir: launchDirResolved(), buildDir: CFG.buildDir, skillsDir: P.skillsDir,
      agentsDir: P.agentsDir, commandsDir: P.commandsDir, plannotatorDir: P.plannotatorDir, backups: P.backups,
      configReal: safe(() => fs.realpathSync.native(P.config), P.config),
    },
    server: { up: false, version: null, mismatch: false },
    opencodeCli: null,
    lock: safe(gatherLock, { mode: 'none', blacklist: [], enabledProviders: [] }),
    model: safe(gatherModel, {}),
    autostart: fs.existsSync(STARTUP_LNK),
    files: {
      launch: Object.entries(LAUNCH).map(([k, f]) => ({ name: path.basename(f), exists: fs.existsSync(f) })),
    },
    cli: { content: readText(P.cliJson) || '{}' },
    skills: safe(gatherSkills, { total: 0, hiddenCount: 0, legacyCount: 0, items: [] }),
    agents: safe(gatherAgents, []),
    commands: safe(gatherCommands, []),
    pl: { configs: [], cache: [], cliPath: null, cliOk: false, dupes: [] },
    build: safe(walkBuild, { exists: false, files: [], counts: {}, diffCount: 0, stray: false }),
    models2: { exists: fs.existsSync(P.pstackModels), content: readText(P.pstackModels) || '', path: P.pstackModels },
    modelSets: Array.isArray(CFG.modelSets) ? CFG.modelSets : [],
    history: readHistory(60),
    backups: listBackups(),
  };
  const h = await fetchT(SERVER_URL + '/global/health', 1800);
  if (h.ok) { s.server.up = true; try { s.server.version = JSON.parse(h.text).version; } catch { s.server.version = '?'; } }
  s.opencodeCli = await getCliVersion();
  const svr = s.server.version || '', clv = s.opencodeCli || '';
  s.server.pinned = !!(s.server.up && String(svr).startsWith('1.') && String(clv).startsWith('2.'));
  s.server.mismatch = !!(s.server.up && svr && clv && svr !== clv && !s.server.pinned);
  try { s.pl = await gatherPlannotatorCli(gatherPlannotator()); } catch {}
  s.projects = PROJECTS.items;
  s.projectsAt = PROJECTS.at || null;
  s.agentLib = [...new Set([
    ...safe(() => fs.readdirSync(path.join(BUNDLE, 'agents')).filter(f => f.endsWith('.md')), []),
    ...safe(() => fs.readdirSync(P.agentsDir).filter(f => f.endsWith('.md')), []),
  ])];
  s.setup = { bundle: fs.existsSync(path.join(BUNDLE, 'skills')), firstRun: !fs.existsSync(P.opencodeJsonc) || (s.skills.total || 0) < 10 };
  s.templates = safe(templateDrift, []);
  s.launch = safe(launchAudit, { dir: launchDirResolved(), items: [], template: [], extra: [], skipped: true });
  const rmd = readText(path.join(launchDirResolved(), 'remindToUpdate.md'));
  s.remind = rmd ? { exists: true, preview: rmd.split(/\r?\n/).filter(l => l.trim()).slice(0, 12).join('\n').slice(0, 420) } : { exists: false };
  try {
    const arrs = parseJSONC(P.opencodeJsonc).obj || {};
    const plist = arrs.plugins || arrs.plugin || [];
    let pa = [];
    for (const x of (Array.isArray(plist) ? plist : [])) { const o = Array.isArray(x) ? x[1] : x?.options; if (o?.planningAgents) { pa = o.planningAgents; break; } }
    s.plg = {
      planningAgents: Array.isArray(pa) ? pa : [],
      buddha: Array.isArray(pa) && pa.includes('buddha'),
      arena: Array.isArray(pa) && pa.includes('arena'),
      snack: Array.isArray(pa) && pa.includes('snack'),
      poteto: Array.isArray(pa) && pa.includes('poteto-mode'),
    };
    s.fire = {
      file: fs.existsSync(path.join(P.config, 'plugins', 'bazer-fire', 'index.ts')),
      reg: Array.isArray(plist) && plist.some(x => String(typeof x === 'string' ? x : x?.package || '').includes('bazer-fire')),
    };
    s.mirror = safe(mirrorStatus, []);
    s.cfgDrift = configDrift();
    s.modeLock = safe(() => runLockCheck(), null);
    {
      const bBud = readText(path.join(BUNDLE, 'agents', 'buddha.md')) || '';
      const iBud = readText(path.join(P.agentsDir, 'buddha.md')) || '';
      const bv = (bBud.match(FLOW_MARKER_RE) || [])[1] || null;
      const iv = (iBud.match(FLOW_MARKER_RE) || [])[1] || null;
      s.flow = { bundle: bv, installed: iv, ok: !!bv && bv === iv };
    }
  } catch { s.plg = { planningAgents: [], buddha: false, arena: false, snack: false, poteto: false }; s.fire = { file: false, reg: false }; s.mirror = []; s.cfgDrift = { planningAgents: [], missing: PLAN_AGENTS.slice(), ok: false }; s.flow = { bundle: null, installed: null, ok: false }; }
  s.flowkit = safe(gatherFlowkit, { on: false, pluginFile: false, registered: false, builder: false, builderDisabled: false, builderMode: '', gateMarker: false, version: null });
  /* ตั้งค่า OpenCode — สรุปเบา ๆ เท่านั้น (ไม่ฝัง form model ลง state ทุกครั้ง) */
  try { s.tui = await ACTIONS['tui-status']({}); } catch { s.tui = null; }
  return s;
}
function safe(fn, fallback) { try { return fn(); } catch { return fallback; } }

/* ---------------------------------- server ---------------------------------- */

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}
function checkToken(req, url) {
  const h = req.headers['x-oc-token'];
  const q = url.searchParams.get('t');
  return h === TOKEN || q === TOKEN;
}
async function runAction(id, params) {
  const a = ACTIONS[id];
  if (!a) return { ok: false, message: 'ไม่รู้จัก action: ' + id };
  try {
    const r = await a(params || {});
    logHistory(id, params, 'ok', r?.message);
    return { ok: true, ...r };
  } catch (e) {
    logHistory(id, params, 'fail', String(e.message || e));
    return { ok: false, message: String(e.message || e) };
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const p = url.pathname;
    if (req.method === 'GET' && p === '/') { return send(res, 200, readText(P.html) || '<h1>console.html not found</h1>', 'text/html; charset=utf-8'); }
    if (req.method === 'GET' && p === '/api/ping') {
      if (url.searchParams.get('t') !== TOKEN) return send(res, 401, { ok: false });
      return send(res, 200, { ok: true, app: 'opencode-console', version: APP_VERSION });
    }
    if (!p.startsWith('/api/')) return send(res, 404, { ok: false, message: 'not found' });
    if (!checkToken(req, url)) return send(res, 401, { ok: false, message: 'unauthorized' });
    if (req.method === 'GET' && p === '/api/state') return send(res, 200, await gatherState());
    if (req.method === 'GET' && p === '/api/verify') return send(res, 200, await runVerify());
    if (req.method === 'POST' && p === '/api/action') {
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 4 * 1024 * 1024) break; }
      let j = {};
      try { j = JSON.parse(body || '{}'); } catch { return send(res, 400, { ok: false, message: 'body ไม่ใช่ JSON' }); }
      const { id, ...params } = j;
      return send(res, 200, await runAction(id, params));
    }
    send(res, 404, { ok: false, message: 'not found' });
  } catch (e) {
    send(res, 500, { ok: false, message: String(e.message || e) });
  }
});

/* ---------------------------------- main ---------------------------------- */

fs.mkdirSync(P.backups, { recursive: true });
pruneBackups();
server.on('error', async e => {
  if (e.code === 'EADDRINUSE') {
    const rt = readText(P.runtime);
    console.log(`[BAZER Console] port ${CFG.port} ถูกใช้อยู่ — อาจเปิดแอปไว้แล้ว`);
    console.log(rt ? '[BAZER Console] runtime: ' + rt.split('\n').slice(0, 4).join(' ') : '');
    process.exit(0);
  }
  console.error('[BAZER Console] error:', e.message);
  process.exit(1);
});
server.listen(CFG.port, '127.0.0.1', () => {
  fs.writeFileSync(P.runtime, JSON.stringify({ app: 'opencode-console', port: CFG.port, token: TOKEN, pid: process.pid, startedAt: STARTED_AT }, null, 2));
  console.log(`[BAZER Console] v${APP_VERSION} — http://127.0.0.1:${CFG.port}/?t=${TOKEN}`);
});
const cleanup = () => { try { fs.rmSync(P.runtime, { force: true }); } catch {} process.exit(0); };
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
