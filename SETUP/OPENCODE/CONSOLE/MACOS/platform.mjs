// CONSOLE/MACOS/platform.mjs — macOS platform adapter for BAZER Console.
// console.mjs imports this only when process.platform === 'darwin'.
// Self-contained on purpose: it mirrors CONSOLE/LINUX/platform.mjs (identical export
// surface) instead of sharing a core, so each OS folder holds the whole story.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* --------------------------------- identity -------------------------------- */
export const id = 'darwin';
export const SERVER_LAUNCHER = 'opencode-serve.command';
export const PORTABLE_LAUNCHER = 'BAZER CONSOLE - WINDOW (macOS).command';
export const SHORTCUT_FILE = 'BAZER CONSOLE - WINDOW (macOS).command';
export const MAIN_LAUNCHER = 'BAZER Console.command';
export const LOCK_LAUNCHER_RE = /^lock-.*\.command$/i;
export const LOCK_LAUNCHER_EXT_RE = /\.command$/i;
/* same keys as the Windows LAUNCH_NAMES so LAUNCH.* / launchAudit need no change */
export const LAUNCH_NAMES = {
  serveVbs: SERVER_LAUNCHER,
  lockDeepseekJsonc: 'lock-deepseek-only.jsonc',
  lockProviderJsonc: 'lock-provider-only.jsonc',
  lockDeepseekVbs: 'lock-deepseek-only.command',
  lockProviderVbs: 'lock-provider-only.command',
};

const LABEL = 'dev.bazer.opencode-server';
const PLIST = path.join(os.homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`);

/* --------------------------------- helpers --------------------------------- */
function shellQuote(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }
function uid() { return typeof process.getuid === 'function' ? process.getuid() : ''; }

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
export function startupEntryPath() { return PLIST; }
export function autostartEnabled() { try { return fs.existsSync(PLIST); } catch { return false; } }

function plistXml(serverPath, workDir) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const log = esc(path.join(workDir, 'opencode-server.log'));
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${esc(serverPath)}</string>
  </array>
  <key>WorkingDirectory</key><string>${esc(workDir)}</string>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>${log}</string>
  <key>StandardErrorPath</key><string>${log}</string>
</dict>
</plist>
`;
}

export async function enableAutostart({ serverPath, workDir }) {
  if (!serverPath || !fs.existsSync(serverPath)) return { ok: false, message: 'ไม่พบไฟล์ server: ' + serverPath };
  try {
    fs.mkdirSync(path.dirname(PLIST), { recursive: true });
    fs.writeFileSync(PLIST, plistXml(serverPath, workDir), 'utf8');
  } catch (e) { return { ok: false, message: 'เขียน LaunchAgent ไม่สำเร็จ: ' + e.message }; }
  await ps(`launchctl bootout gui/${uid()}/${LABEL} 2>/dev/null || true`, 10000);
  let r = await ps(`launchctl bootstrap gui/${uid()} ${shellQuote(PLIST)}`, 20000);
  if (r.code !== 0) r = await ps(`launchctl load -w ${shellQuote(PLIST)}`, 20000);
  return { ok: true, message: 'เปิด autostart แล้ว — server จะเริ่มตอน login (LaunchAgent)' };
}

export async function disableAutostart() {
  await ps(`launchctl bootout gui/${uid()}/${LABEL} 2>/dev/null || true`, 20000);
  await ps(`launchctl unload -w ${shellQuote(PLIST)} 2>/dev/null || true`, 20000);
  try { fs.rmSync(PLIST, { force: true }); }
  catch (e) { return { ok: false, message: 'ลบ LaunchAgent ไม่สำเร็จ: ' + e.message }; }
  return { ok: true, message: 'ปิด autostart แล้ว (server ที่รันอยู่ยังทำงานต่อ)' };
}

/* --------------------------------- desktop --------------------------------- */
export function openPath(dir) { spawn('open', [dir], { detached: true, stdio: 'ignore' }).unref(); }
export function openUrl(url) { spawn('open', [url], { detached: true, stdio: 'ignore' }).unref(); }

export function isNoiseDir(dir) {
  const d = String(dir).replace(/\/+$/, '') || '/';
  if (d === '/') return true;
  const tmp = os.tmpdir().replace(/\/+$/, '');
  if (tmp && tmp !== '/' && (d === tmp || d.startsWith(tmp + '/'))) return true;
  for (const root of ['/tmp', '/private/tmp', '/var/tmp']) {
    if (d === root || d.startsWith(root + '/')) return true;
  }
  if (d.startsWith('/private/var/folders/')) return true;
  if (/(^|\/)opencode-pi-[^/]+$/.test(d)) return true;
  return false;
}

export async function applyShortcut({ root, dryRun }) {
  const target = portableLauncherPath(root);
  const main = mainLauncherPath();
  const missing = [target, main].filter(f => !fs.existsSync(f));
  if (missing.length) return { ok: false, message: 'ไม่พบ launcher: ' + missing.join(', ') };
  if (dryRun) return { ok: true, message: 'จะตั้งสิทธิ์รันได้: ' + target, path: target };
  try { for (const f of [target, main]) fs.chmodSync(f, 0o755); }
  catch (e) { return { ok: false, message: 'ตั้งสิทธิ์ launcher ไม่สำเร็จ: ' + e.message }; }
  return { ok: true, message: 'ตั้ง portable launcher (shortcut) แล้ว: ' + target, path: target };
}
