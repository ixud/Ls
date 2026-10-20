/**
 * index.mjs — เซิร์ฟเวอร์ของ BAZERCONSOLE (Node built-ins เท่านั้น)
 * 127.0.0.1 + token ต่อการเปิดหนึ่งครั้ง · POST ทุกตัวต้องมี header x-bazer-token
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, UI_DIR, VAR_DIR, ensureVarDir, makeResolver, MANIFEST_DIR, CONSOLE_DIR } from './env.mjs';
import { manifest, settings, actions, policies, probes, validate } from './manifest.mjs';
import { computePlan, diffFor } from './plan.mjs';
import { checkLaw } from './law.mjs';
import { runAction, actionIds } from './actions.mjs';
import { readHistory, readState, allControls } from './apply.mjs';
import { cleanupPlan } from './apply.mjs';
import { getAtPath } from './jsonc.mjs';
import { listModels } from './models.mjs';

const APP_VERSION = '0.1.0';
const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
};
const PORT = Number(arg('port', 4310));
const HOME = arg('home', '');
const NO_OPEN = process.argv.includes('--no-open');

ensureVarDir();
const tokenFile = path.join(VAR_DIR, 'token');
if (!fs.existsSync(tokenFile)) fs.writeFileSync(tokenFile, crypto.randomBytes(24).toString('hex'), 'utf8');
const TOKEN = fs.readFileSync(tokenFile, 'utf8').trim();

/* ---------- log bus (SSE) ---------- */
const clients = new Set();
const emit = (msg, type = 'info') => {
  const payload = `data: ${JSON.stringify({ at: Date.now(), msg, type })}\n\n`;
  for (const res of clients) { try { res.write(payload); } catch { /* client หลุด */ } }
};

/* ---------- plan cache ---------- */
let planCache = { at: 0, home: null, data: null };
function getPlan(home) {
  if (planCache.data && planCache.home === home && Date.now() - planCache.at < 2500) return planCache.data;
  const law = checkLaw({ handlerIds: actionIds });
  const data = computePlan(home, { lawResult: law });
  planCache = { at: Date.now(), home, data };
  return data;
}

function controlValue(c, home) {
  const { resolve } = makeResolver(home);
  if (c.strategy === 'internal') {
    const st = readState();
    return !!(st.locks || {})[c.path];
  }
  const file = resolve(c.target);
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  if (c.strategy === 'jsonc-set') {
    try { return getAtPath(text, c.path.split('.')); } catch { return null; }
  }
  if (c.strategy === 'line') {
    const hit = text.split(/\r?\n/).find((l) => l.trim().startsWith(c.line));
    return hit ? hit.trim().slice(c.line.length).trim() : null;
  }
  return null;
}

function modelDrift(home, state) {
  if (!state.locks?.models || !state.modelsSnapshot) return [];
  const { resolve } = makeResolver(home);
  const file = resolve('${CONFIG}/opencode.jsonc');
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const [mode, snap] of Object.entries(state.modelsSnapshot)) {
    const cur = {
      model: getAtPath(text, ['agent', mode, 'model']) ?? null,
      variant: getAtPath(text, ['agent', mode, 'variant']) ?? null,
    };
    if (JSON.stringify(cur) !== JSON.stringify(snap)) out.push({ mode, was: snap, now: cur });
  }
  return out;
}

function settingsValues(home) {
  const out = {};
  for (const c of allControls()) {
    out[c.id] = controlValue(c, home);
  }
  return out;
}

function rawSettings(home) {
  const { resolve } = makeResolver(home);
  const out = {};
  for (const f of settings.full?.files || []) {
    const file = resolve(f.target);
    const exists = fs.existsSync(file);
    out[f.id] = { label: f.label, file, exists, text: exists ? fs.readFileSync(file, 'utf8') : '' };
  }
  return out;
}

function buildState(home, { withProbes = false } = {}) {
  const { vars } = makeResolver(home);
  const plan = getPlan(home);
  const state = readState();
  let probeResult = null;
  if (withProbes) probeResult = runAction('probe', { home }, {}).probes;

  return {
    app: { version: APP_VERSION, root: ROOT, home, platform: process.platform, node: process.versions.node, tokenInPage: true },
    vars,
    plan,
    law: checkLaw({ handlerIds: actionIds }),
    probes: probeResult,
    manifest: {
      entries: manifest.entries.map((e) => ({ id: e.id, kind: e.kind, title: e.title, status: e.status, auto: e.auto !== false, target: e.target })),
      problems: validate(),
      counts: manifest.entries.reduce((a, e) => { a[e.kind] = (a[e.kind] || 0) + 1; return a; }, {}),
    },
    policies: Object.entries(policies).filter(([k]) => k !== 'note').map(([id, p]) => ({ id, title: p.title, mode: p.mode, defaultLevel: p.defaultLevel, levels: p.levels.map(({ permission, ...rest }) => rest) })),
    policyState: state.policy || null,
    settings,
    settingsValues: settingsValues(home),
    rawSettings: rawSettings(home),
    actions: actions.actions,
    history: readHistory(40),
    cleanup: cleanupPlan(home),
    locks: state.locks || {},
    drift: modelDrift(home, state),
    lastApply: state.lastApply || null,
  };
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const home = HOME || process.env.BAZER_HOME || undefined;

  if (req.method === 'GET') {
    if (url.pathname === '/api/models') {
      // รายชื่อโมเดลจริง — อ่านอย่างเดียว ไม่ต้องใช้ token และไม่เขียน state
      try { return send(res, 200, JSON.stringify(listModels({ fresh: url.searchParams.get('fresh') === '1' }))); }
      catch (e) { return send(res, 500, JSON.stringify({ ok: false, error: e.message, models: [], providers: [] })); }
    }
    if (url.pathname === '/api/state') {
      try { return send(res, 200, JSON.stringify(buildState(home, { withProbes: url.searchParams.get('probes') === '1' }))); }
      catch (e) { return send(res, 500, JSON.stringify({ error: e.message })); }
    }
    if (url.pathname === '/api/diff') {
      try { return send(res, 200, JSON.stringify(diffFor(url.searchParams.get('entry'), home))); }
      catch (e) { return send(res, 400, JSON.stringify({ error: e.message })); }
    }
    if (url.pathname === '/api/log') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
      res.write(`data: ${JSON.stringify({ at: Date.now(), msg: 'เชื่อมต่อแล้ว', type: 'info' })}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (url.pathname === '/icon.ico' || url.pathname === '/favicon.ico') {
      const dir = path.join(CONSOLE_DIR, '02SHORTCUT');
      let icons = [];
      try { icons = fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith('.ico')).sort(); } catch { icons = []; }
      if (!icons.length) { res.writeHead(204); return res.end(); }
      const pick = icons.find((n) => /^bazerconsole\.ico$/i.test(n)) || icons[0];
      const ico = fs.readFileSync(path.join(dir, pick));
      res.writeHead(200, { 'content-type': 'image/x-icon', 'cache-control': 'public, max-age=300', 'content-length': ico.length });
      return res.end(ico);
    }

    const rel = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
    const file = path.join(UI_DIR, rel);
    const inside = path.relative(UI_DIR, file);
    if (!inside || inside.startsWith('..') || path.isAbsolute(inside) || rel.includes('..')) {
      return send(res, 400, 'bad path', 'text/plain; charset=utf-8');
    }
    if (!fs.existsSync(file)) return send(res, 404, 'not found', 'text/plain; charset=utf-8');
    let body = fs.readFileSync(file);
    if (rel === 'index.html') body = Buffer.from(body.toString('utf8').replace(/__TOKEN__/g, TOKEN).replace(/__VERSION__/g, APP_VERSION));
    return send(res, 200, body, MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
    if (req.headers['x-bazer-token'] !== TOKEN) return send(res, 403, JSON.stringify({ ok: false, summary: 'token ไม่ถูกต้อง' }));
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 2_000_000) req.destroy(); });
    req.on('end', () => {
      let body = {};
      try { body = raw ? JSON.parse(raw) : {}; } catch { return send(res, 400, JSON.stringify({ ok: false, summary: 'JSON ไม่ถูกต้อง' })); }
      if (url.pathname === '/api/action') {
        emit(`เริ่ม: ${body.id}`, 'start');
        try {
          const result = runAction(body.id, { home }, body.params || {});
          const kind = result.level === 'warn' ? 'warn' : result.ok ? 'ok' : 'err';
          const label = kind === 'ok' ? 'เสร็จ' : kind === 'warn' ? 'เตือน' : 'ไม่สำเร็จ';
          emit(`${label}: ${body.id} — ${result.summary}`, kind);
          planCache.at = 0;
          return send(res, 200, JSON.stringify(result));
        } catch (e) {
          emit(`พัง: ${body.id} — ${e.message}`, 'err');
          return send(res, 500, JSON.stringify({ ok: false, summary: e.message }));
        }
      }
      send(res, 404, JSON.stringify({ ok: false, summary: 'ไม่พบ endpoint' }));
    });
    return;
  }

  send(res, 405, 'method not allowed', 'text/plain; charset=utf-8');
});

function listen(port, tries = 0) {
  server.once('error', (e) => {
    if (e.code === 'EADDRINUSE' && tries < 10) return listen(port + 1, tries + 1);
    console.error('เปิดเซิร์ฟเวอร์ไม่ได้:', e.message);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => {
    const link = `http://127.0.0.1:${port}/?t=${TOKEN}`;
    console.log(`BAZERCONSOLE ${APP_VERSION} · ${link}`);
    console.log(`home: ${HOME || '(ค่าเริ่มต้นของเครื่อง)'}`);
    if (!NO_OPEN) {
      const cmd = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      const args = process.platform === 'win32' ? ['/c', 'start', '', link] : [link];
      import('node:child_process').then(({ spawn }) => {
        try { spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref(); } catch { /* เปิดไม่ได้ก็ไม่เป็นไร */ }
      });
    }
  });
}
listen(PORT);
