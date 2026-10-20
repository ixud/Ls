/**
 * models.mjs — รายชื่อโมเดลจริงจาก `opencode models`
 * อ่านผ่าน CLI (ไม่เดาจาก config) แล้วจัดกลุ่มตาม provider ให้ UI ทำ datalist
 * CLI ใช้ไม่ได้ = คืน ok:false พร้อม error — ห้าม throw ใส่หน้าเว็บ
 */
import { spawnSync } from 'node:child_process';

const PROVIDER_LABEL = {
  opencode: 'OpenCode',
  'opencode-go': 'OpenCode Go Harness',
};
const PROVIDER_ORDER = ['opencode', 'opencode-go'];
const CACHE_MS = 60_000;

let cache = { at: 0, data: null };

/** แปลงข้อความจาก `opencode models` → { models, providers } */
export function parseModelsOutput(text) {
  const seen = new Set();
  const models = [];
  for (const raw of String(text ?? '').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const slash = line.indexOf('/');
    // ต้องมี provider/model จริง — บรรทัดที่ไม่ใช่โมเดลให้ข้าม
    if (slash <= 0 || slash === line.length - 1) continue;
    const provider = line.slice(0, slash);
    const name = line.slice(slash + 1);
    const id = `${provider}/${name}`;
    if (seen.has(id)) continue;
    seen.add(id);
    models.push({ id, provider, name, label: `${PROVIDER_LABEL[provider] || provider} · ${name}` });
  }

  const groups = new Map();
  for (const m of models) {
    if (!groups.has(m.provider)) groups.set(m.provider, []);
    groups.get(m.provider).push(m);
  }
  const rank = (id) => {
    const i = PROVIDER_ORDER.indexOf(id);
    return i === -1 ? PROVIDER_ORDER.length : i;
  };
  const providers = [...groups.entries()]
    .map(([id, list]) => ({ id, label: PROVIDER_LABEL[id] || id, count: list.length, models: list }))
    .sort((a, b) => rank(a.id) - rank(b.id) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  return { models, providers };
}

/** รายชื่อโมเดลพร้อม cache 60 วินาที · ?fresh=1 ใน API เพื่อข้าม cache */
export function listModels({ fresh = false, timeout = 60_000 } = {}) {
  const started = Date.now();
  if (!fresh && cache.data && started - cache.at < CACHE_MS) return cache.data;

  const r = spawnSync('opencode models', {
    shell: true,
    encoding: 'utf8',
    timeout,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  const { models, providers } = parseModelsOutput(r.stdout || '');
  const stderr = (r.stderr || '').trim();
  const failed = !!r.error || r.status !== 0;
  const data = {
    ok: !failed && models.length > 0,
    at: new Date().toISOString(),
    source: 'opencode models',
    error: failed
      ? `opencode models ล้มเหลว: ${(stderr || r.error?.message || `exit ${r.status}`).slice(0, 300)}`
      : models.length ? '' : 'opencode models ไม่คืนรายชื่อโมเดล',
    models,
    providers,
  };
  cache = { at: started, data };
  return data;
}
