// CONSOLE/LINUX/platform.mjs — Linux platform adapter for BAZER Console.
// console.mjs imports this only when process.platform === 'linux'.
// Self-contained on purpose: it mirrors CONSOLE/MACOS/platform.mjs (identical export
// surface). The faithful Linux analogue of the Windows Startup folder is XDG autostart
// (~/.config/autostart), so that is what autostart uses here.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* --------------------------------- identity -------------------------------- */
export const id = 'linux';
export const SERVER_LAUNCHER = 'opencode-serve.sh';
export const PORTABLE_LAUNCHER = 'BAZER CONSOLE - WINDOW (Linux).desktop';
export const SHORTCUT_FILE = 'BAZER CONSOLE - WINDOW (Linux).desktop';
export const MAIN_LAUNCHER = 'BAZER Console.sh';
export const LOCK_LAUNCHER_RE = /^lock-.*\.sh$/i;
export const LOCK_LAUNCHER_EXT_RE = /\.sh$/i;
/* same keys as the Windows LAUNCH_NAMES so LAUNCH.* / launchAudit need no change */
export const LAUNCH_NAMES = {
  serveVbs: SERVER_LAUNCHER,
  lockDeepseekJsonc: 'lock-deepseek-only.jsonc',
  lockProviderJsonc: 'lock-provider-only.jsonc',
  lockDeepseekVbs: 'lock-deepseek-only.sh',
  lockProviderVbs: 'lock-provider-only.sh',
};

const AUTOSTART_NAME = 'bazer-opencode-server.desktop';
const AUTOSTART_FILE = path.join(os.homedir(), '.config', 'autostart', AUTOSTART_NAME);

/* --------------------------------- helpers --------------------------------- */
function shellQuote(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }

/* ---------------------------------- paths ---------------------------------- */
export function templateDir() { return path.join(__dirname, 'launch-template'); }
export function portableLauncherPath(root) { return path.join(root, PORTABLE_LAUNCHER); }
export function shortcutPath(root) { return path.join(root, SHORTCUT_FILE); }
export function mainLauncherPath() { return path.join(__dirname, MAIN_LAUNCHER); }

/* --------------------------------- process --------------------------------- */
export function ps(script, timeoutMs = 60000) {
  return new Promise(resolve => {
    const p = spawn('/bin/bash', ['-c', script]);
    let out = '', err = '';
    const t = setTimeout(() => { try { p.kill(); } catch {} resolve({ code: -1, out, err: err + '\n(timeout)' }); }, timeoutMs);
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => err += d);
    p.on('close', code => { clearTimeout(t); resolve({ code, out, err }); });
    p.on('error', e => { clearTimeout(t); resolve({ code: -1, out, err: String(e) }); });
  });
}

export async function which(name) {
  const r = await ps('command -v ' + shellQuote(name), 10000);
  const line = (r.out || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0] || '';
  return { code: line ? 0 : 1, out: line, err: r.err };
}

export function killPort(port) {
  const p = Number(port) || 0;
  return ps(
    `pids=$(lsof -ti tcp:${p} 2>/dev/null || true); ` +
    `if [ -z "$pids" ]; then pids=$(fuser ${p}/tcp 2>/dev/null || true); fi; ` +
    `if [ -n "$pids" ]; then kill -9 $pids 2>/dev/null || true; fi`,
    15000
  );
}

export function launchServer(serverPath, cwd) {
  try { fs.chmodSync(serverPath, 0o755); } catch {}
  const p = spawn('/bin/bash', [serverPath], { detached: true, stdio: 'ignore', cwd });
  p.unref();
  return { pid: p.pid ?? null };
}

/* -------------------------------- autostart -------------------------------- */
export function startupEntryPath() { return AUTOSTART_FILE; }
export function autostartEnabled() { try { return fs.existsSync(AUTOSTART_FILE); } catch { return false; } }

function desktopEntry(serverPath, workDir) {
  return `[Desktop Entry]
Type=Application
Version=1.0
Name=BAZER OpenCode Server
Comment=OpenCode background server (http://127.0.0.1:4096) for Cline
Exec=/bin/bash ${serverPath}
Path=${workDir}
Terminal=false
X-GNOME-Autostart-enabled=true
`;
}

export async function enableAutostart({ serverPath, workDir }) {
  if (!serverPath || !fs.existsSync(serverPath)) return { ok: false, message: 'ไม่พบไฟล์ server: ' + serverPath };
  try {
    fs.mkdirSync(path.dirname(AUTOSTART_FILE), { recursive: true });
    fs.writeFileSync(AUTOSTART_FILE, desktopEntry(serverPath, workDir), 'utf8');
    fs.chmodSync(AUTOSTART_FILE, 0o755);
  } catch (e) { return { ok: false, message: 'เขียน autostart ไม่สำเร็จ: ' + e.message }; }
  return { ok: true, message: 'เปิด autostart แล้ว — server จะเริ่มตอน login (XDG autostart)' };
}

export async function disableAutostart() {
  try { fs.rmSync(AUTOSTART_FILE, { force: true }); }
  catch (e) { return { ok: false, message: 'ลบ autostart ไม่สำเร็จ: ' + e.message }; }
  return { ok: true, message: 'ปิด autostart แล้ว (server ที่รันอยู่ยังทำงานต่อ)' };
}

/* --------------------------------- desktop --------------------------------- */
export function openPath(dir) {
  const p = spawn('xdg-open', [dir], { detached: true, stdio: 'ignore' });
  p.on('error', () => { try { spawn('gio', ['open', dir], { detached: true, stdio: 'ignore' }).unref(); } catch {} });
  p.unref();
}
export function openUrl(url) { openPath(url); }

export function isNoiseDir(dir) {
  const d = String(dir).replace(/\/+$/, '') || '/';
  if (d === '/') return true;
  const tmp = os.tmpdir().replace(/\/+$/, '');
  if (tmp && tmp !== '/' && (d === tmp || d.startsWith(tmp + '/'))) return true;
  for (const root of ['/tmp', '/var/tmp']) {
    if (d === root || d.startsWith(root + '/')) return true;
  }
  if (/(^|\/)opencode-pi-[^/]+$/.test(d)) return true;
  return false;
}

/* The Linux shortcut is a .desktop file. A .desktop Exec is not run through a shell, so
   the most reliable form bakes the absolute launcher path — exactly how the Windows .lnk
   is generated per machine. We rewrite it here so the shortcut always points at the real
   location of this checkout. */
function shortcutDesktopEntry(root) {
  const main = mainLauncherPath();
  return `[Desktop Entry]
Type=Application
Version=1.0
Name=BAZER CONSOLE - WINDOW (Linux)
Comment=BAZER Console — the Linux shortcut, counterpart of "BAZER CONSOLE - WINDOW (Windows).lnk"
Exec=/bin/bash ${main}
Icon=utilities-terminal
Terminal=false
Categories=Development;
`;
}

export async function applyShortcut({ root, dryRun }) {
  const target = portableLauncherPath(root);
  const main = mainLauncherPath();
  const missing = [target, main].filter(f => !fs.existsSync(f));
  if (missing.length) return { ok: false, message: 'ไม่พบ launcher: ' + missing.join(', ') };
  if (dryRun) return { ok: true, message: 'จะตั้งสิทธิ์ + ชี้ shortcut ไปที่: ' + main, path: target };
  try {
    if (fs.existsSync(target)) fs.writeFileSync(target, shortcutDesktopEntry(root), 'utf8');
    for (const f of [target, main]) fs.chmodSync(f, 0o755);
  } catch (e) { return { ok: false, message: 'ตั้ง shortcut ไม่สำเร็จ: ' + e.message }; }
  return { ok: true, message: 'ตั้ง portable launcher (shortcut) แล้ว: ' + target, path: target };
}
