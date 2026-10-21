/* bazer-flow store — sync file store for runtime state. Never throws. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const safeName = (key) => String(key == null ? '' : key).replace(/[^a-zA-Z0-9._-]/g, '_');

/** Read + parse a JSON file from a file URL (or plain path). Throws on bad JSON. */
export function loadSpecFile(url) {
  const file = typeof url === 'string' ? url : fileURLToPath(url);
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

export function fsStore(dir) {
  const fileOf = (key) => path.join(dir, safeName(key) + '.json');
  const readJson = (file) => {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
  };
  const writeAtomic = (file, text) => {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = file + '.tmp-' + process.pid;
      fs.writeFileSync(tmp, text, 'utf8');
      fs.renameSync(tmp, file);
      return true;
    } catch { return false; }
  };
  return {
    get(key) { return readJson(fileOf(key)); },
    set(key, value) { return writeAtomic(fileOf(key), JSON.stringify(value)); },
    del(key) { try { fs.rmSync(fileOf(key), { force: true }); } catch { /* ignore */ } },
    badge(sid, text) {
      return writeAtomic(path.join(dir, 'badge-' + safeName(sid) + '.txt'), String(text == null ? '' : text));
    },
  };
}

export function ringLog(file, maxLines = 200) {
  return (entry) => {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.appendFileSync(file, JSON.stringify(entry) + '\n', 'utf8');
      const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
      if (lines.length > maxLines) fs.writeFileSync(file, lines.slice(-maxLines).join('\n') + '\n', 'utf8');
    } catch { /* logging never throws */ }
  };
}

export function pruneState(dir, maxAgeMs, now) {
  try {
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.json') || name.startsWith('badge-')) continue;
      const file = path.join(dir, name);
      const st = fs.statSync(file);
      if (now - st.mtimeMs > maxAgeMs) fs.rmSync(file, { force: true });
    }
  } catch { /* missing dir = nothing to prune */ }
}
