/**
 * renderer.mjs — ONE generic control renderer.
 *
 * The client holds no knowledge of opencode's settings. It receives the form
 * model from the server (group -> field -> {type, enum, description, path}) and
 * draws a control per `type`:
 *
 *   boolean -> toggle switch            enum     -> select
 *   number  -> number input + bounds    integer  -> number input, step 1
 *   string  -> text input               keybind  -> keybind control
 *   union   -> type switch + sub-control
 *   object  -> nested fieldset          boolmap  -> key/value rows
 *   list    -> item rows + JSON escape
 *
 * Add a key to cli.schema.json and it renders with no change here. That is the
 * whole point of the direction: the schema is the source of truth and the GUI is
 * a projection of it.
 *
 * Value convention, used by every control:
 *   `state.draft` maps path -> {op:'set', value} or {op:'unset'}.
 *   A path absent from the draft is untouched. `collectPatches` emits only the
 *   paths whose value actually differs from the file on disk.
 */

import { readLeaf, toSegments } from '../shared/paths.mjs';

/* ----------------------------------- state ----------------------------------- */

export function createState(model, values) {
  return {
    model,
    values: values || {},
    draft: new Map(),
    openGroups: new Set(),
    search: '',
  };
}

/** Values are addressed by wire path; see shared/paths.mjs for why not dotted. */
export function readPath(obj, wirePath) {
  return readLeaf(obj, wirePath);
}

/** The value a control should show: draft edit if any, else what is on disk, else the schema default. */
export function effectiveValue(state, field) {
  const d = state.draft.get(field.path);
  if (d) return d.op === 'unset' ? { present: false, value: undefined, edited: true } : { present: true, value: d.value, edited: true };
  const onDisk = readPath(state.values, field.path);
  if (onDisk.found) return { present: true, value: onDisk.value, edited: false };
  if (field.hasDefault) return { present: false, value: field.default, edited: false, isDefault: true };
  return { present: false, value: undefined, edited: false };
}

export function setDraft(state, path, value) {
  const field = state.model.index[path];
  if (field?.readOnly) return;
  state.draft.set(path, { op: 'set', value });
}
export function clearDraft(state, path) {
  const fieldPath = path;
  const field = state.model.index[fieldPath];
  if (field?.readOnly) return;
  const onDisk = readPath(state.values, fieldPath);
  if (onDisk.found) state.draft.set(fieldPath, { op: 'unset' });
  else state.draft.delete(fieldPath);
}

/**
 * Only changed paths. Compared against the file on disk, not against the schema
 * default, so "revert to default" saves as an explicit unset only when the key
 * is actually present in the file.
 */
export function collectPatches(state) {
  const patches = [];
  for (const [path, edit] of state.draft) {
    const onDisk = readPath(state.values, path);
    if (edit.op === 'unset') {
      if (onDisk.found) patches.push({ path, op: 'unset' });
      continue;
    }
    if (onDisk.found && jsonEqual(onDisk.value, edit.value)) continue;
    patches.push({ path, op: 'set', value: edit.value });
  }
  return patches;
}

export function dirtyCount(state) { return collectPatches(state).length; }

function jsonEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const json = v => esc(JSON.stringify(v));

/* --------------------------------- rendering --------------------------------- */

export function renderSettings(state) {
  const { model } = state;
  const q = state.search.trim().toLowerCase();
  const groups = model.groups.map(g => renderGroup(state, g, q)).filter(Boolean);
  return `
<div class="settings">
  <div class="settings-bar">
    <input type="search" class="search" data-role="search" data-ctl="search" placeholder="ค้นหา setting / keybind…" value="${esc(state.search)}">
    <span class="muted" data-role="dirty">${dirtyCount(state)} ค่าที่แก้ไว้</span>
    <button class="btn gold" data-role="save" ${dirtyCount(state) ? '' : 'disabled'}>บันทึก</button>
    <button class="btn ghost" data-role="revert" ${dirtyCount(state) ? '' : 'disabled'}>ทิ้งการแก้</button>
  </div>
  ${groups.join('\n')}
</div>`;
}

function matches(field, q) {
  if (!q) return true;
  return field.path.toLowerCase().includes(q)
    || String(field.display || '').toLowerCase().includes(q)
    || String(field.label).toLowerCase().includes(q)
    || String(field.description || '').toLowerCase().includes(q)
    || String(field.default ?? '').toLowerCase().includes(q);
}

function renderGroup(state, group, q) {
  if (group.kind === 'keybinds') {
    const subs = group.subgroups.map(sg => {
      const fields = sg.fields.filter(f => matches(f, q));
      if (!fields.length) return '';
      return `<details class="subgroup" ${state.openGroups.has(sg.id) || q ? 'open' : ''} data-subgroup="${esc(sg.id)}">
  <summary>${esc(sg.label)} <span class="muted xs">${fields.length}/${sg.fields.length}</span></summary>
  <div class="rows">${fields.map(f => renderRow(state, f)).join('')}</div>
</details>`;
    }).filter(Boolean);
    if (!subs.length) return '';
    return `<section class="group" data-group="keybinds">
  <header><h2>${esc(group.label)} <span class="muted xs">${group.fieldCount} ปุ่ม</span></h2>
    <p class="muted small">${esc(group.description)}</p>
    ${renderBindingHelp(group.bindingShape)}
  </header>
  ${subs.join('\n')}
</section>`;
  }

  const fields = group.fields.filter(f => matches(f, q));
  if (!fields.length) return '';
  return `<section class="group" data-group="${esc(group.id)}">
  <header><h2>${esc(group.label)} <span class="muted xs">${group.labelEn}</span></h2>
    ${group.description ? `<p class="muted small">${esc(group.description)}</p>` : ''}</header>
  <div class="rows">${fields.map(f => renderRow(state, f)).join('')}</div>
</section>`;
}

function renderBindingHelp(shapes) {
  if (!shapes || !shapes.length) return '';
  const lines = shapes.map(s => {
    if (s.shape === 'disabled') return `<code>${esc(JSON.stringify(s.literal))}</code> = ปิดปุ่มนี้ (${esc(s.note || '')})`;
    if (s.shape === 'key') return `<code>"ctrl+k"</code> = ปุ่มเดียวหรือหลายปุ่มคั่นด้วยจุลภาค — ${esc(s.note || '')}`;
    if (s.shape === 'keyObject') return `<code>{name,…}</code> = ปุ่มพร้อมตัวปรับ (${esc((s.properties || []).join(', '))})`;
    if (s.shape === 'bindingObject') return `<code>{key,event,preventDefault,fallthrough}</code> = กำหนดพฤติกรรม event`;
    if (s.shape === 'array') return `<code>[…]</code> = หลายปุ่มพร้อมกัน`;
    return '';
  }).filter(Boolean);
  return `<div class="hint">รับค่าได้: ${lines.join(' · ')}</div>`;
}

function renderRow(state, field) {
  if (field.readOnly) {
    const disk = readPath(state.values, field.path);
    return `<div class="row readonly" data-path="${esc(field.path)}" data-type="readonly">
  <div class="rowhead">
    <div>
      <div class="label">${esc(field.label)} <code class="path">${esc(field.display || field.path)}</code></div>
      ${field.description ? `<div class="muted small">${esc(field.description)}</div>` : ''}
    </div>
    <div class="ctl"><code class="muted">${esc(disk.found ? JSON.stringify(disk.value) : '—')}</code><span class="badge opt">อ่านอย่างเดียว</span></div>
  </div>
</div>`;
  }
  const eff = effectiveValue(state, field);
  const isEdited = state.draft.has(field.path);
  const badge = !isEdited && field.hasDefault && !eff.present
    ? `<span class="badge def" title="ค่าที่โปรแกรมใช้เมื่อไม่มีคีย์นี้">default: ${esc(fmt(field.default))}</span>`
    : !isEdited && !eff.present
      ? `<span class="badge none" title="ไม่มีค่านี้ในไฟล์">ไม่ตั้งไว้</span>`
      : '';
  const source = field.defaultSource === 'runtime' ? 'จาก binary' : field.defaultSource === 'description' ? 'จากคำอธิบายสคีมา' : '';
  return `<div class="row ${isEdited ? 'edited' : ''}" data-path="${esc(field.path)}" data-type="${esc(field.type)}">
  <div class="rowhead">
    <div>
      <div class="label">${esc(field.label)} <code class="path" title="ที่อยู่บน wire: ${esc(field.path)}">${esc(field.display || field.path)}</code></div>
      ${field.description ? `<div class="muted small">${esc(field.description)}</div>` : ''}
      <div class="badges">${badge}${field.defaultSource !== 'none' ? `<span class="badge src" title="ที่มาของค่า default">${esc(source)}</span>` : ''}${field.nullable ? '<span class="badge opt">เว้นว่างได้</span>' : ''}</div>
    </div>
    <div class="ctl">${renderControl(state, field, eff)}</div>
  </div>
  <button class="clr" data-act="clear" title="คืนค่า default — ลบคีย์นี้ออกจากไฟล์ (ไม่ใช่ปิดด้วย false/none)">×</button>
</div>`;
}

function renderControl(state, field, eff) {
  switch (field.type) {
    case 'boolean': return renderBoolean(field, eff);
    case 'enum': return renderEnum(field, eff);
    case 'number':
    case 'integer': return renderNumber(field, eff);
    case 'string': return renderText(field, eff);
    case 'keybind': return renderKeybind(field, eff);
    case 'union': return renderUnion(field, eff);
    case 'object': return renderObject(state, field);
    case 'boolmap': return renderBoolmap(field, eff);
    case 'list': return renderList(field, eff);
    default: return renderText(field, eff);
  }
}

function renderBoolean(field, eff) {
  const on = eff.value === true;
  const off = eff.value === false;
  return `<label class="switch"><input type="checkbox" data-ctl="boolean" ${on ? 'checked' : ''} ${!on && !off ? 'data-indeterminate="1"' : ''}><span class="track"></span></label>
  <span class="muted xs">${on ? 'เปิด' : off ? 'ปิด' : 'ยังไม่ตั้ง'}</span>`;
}

function renderEnum(field, eff) {
  const opts = ['<option value="">— ใช้ค่าเริ่มต้น —</option>'];
  for (const item of field.enum || []) {
    const sel = eff.present && eff.value === item ? ' selected' : '';
    opts.push(`<option value="${esc(item)}"${sel}>${esc(item)}</option>`);
  }
  return `<select data-ctl="enum">${opts.join('')}</select>`;
}

function renderNumber(field, eff) {
  const c = field.constraint || {};
  const attrs = [
    field.type === 'integer' ? 'step="1"' : 'step="any"',
    c.minimum !== undefined ? `min="${c.minimum}"` : '',
    c.exclusiveMinimum !== undefined ? `min="${Number(c.exclusiveMinimum) + (field.type === 'integer' ? 1 : 0.0001)}"` : '',
    c.maximum !== undefined ? `max="${c.maximum}"` : '',
    c.exclusiveMaximum !== undefined ? `max="${Number(c.exclusiveMaximum) - (field.type === 'integer' ? 1 : 0.0001)}"` : '',
  ].filter(Boolean).join(' ');
  const bounds = [c.minimum !== undefined ? `min ${c.minimum}` : '', c.exclusiveMinimum !== undefined ? `> ${c.exclusiveMinimum}` : '', c.maximum !== undefined ? `max ${c.maximum}` : '', c.exclusiveMaximum !== undefined ? `< ${c.exclusiveMaximum}` : ''].filter(Boolean).join(' · ');
  return `<input type="number" data-ctl="number" ${attrs} value="${eff.present ? esc(eff.value) : ''}" placeholder="${field.hasDefault ? esc(field.default) : ''}">${bounds ? `<span class="muted xs">${esc(bounds)}</span>` : ''}`;
}

function renderText(field, eff) {
  return `<input type="text" data-ctl="text" value="${eff.present ? esc(eff.value) : ''}" placeholder="${field.hasDefault ? esc(field.default) : ''}">`;
}

/**
 * The keybind control. A binding is one of five shapes, so instead of one input
 * for all of them the control switches mode and shows only the fields that shape
 * needs. Key capture turns a real key press into `ctrl+shift+k`.
 */
function renderKeybind(field, eff) {
  const v = eff.value;
  const mode = !eff.present ? 'unset'
    : v === false ? 'false'
      : v === 'none' ? 'none'
        : typeof v === 'string' ? 'keys'
          : Array.isArray(v) ? 'list' : 'object';
  const modes = [['keys', 'ปุ่ม'], ['list', 'หลายปุ่ม'], ['object', 'กำหนดเอง'], ['none', 'ปิด (none)'], ['false', 'ปิด (false)'], ['unset', 'คืนค่า default']];
  const modeSel = `<select data-ctl="kb-mode" class="kb-mode">${modes.map(([m, label]) => `<option value="${m}"${mode === m ? ' selected' : ''}>${label}</option>`).join('')}</select>`;

  let body = '';
  if (mode === 'keys') {
    body = `<span class="kb-capture" data-ctl="kb-capture" tabindex="0" title="คลิกแล้วกดปุ่มเพื่อบันทึก"><input type="text" data-ctl="kb-keys" value="${esc(v)}" placeholder="${esc(field.default || 'ctrl+k')}"></span>`;
  } else if (mode === 'list') {
    body = `<input type="text" data-ctl="kb-keys" value="${esc(v.filter(x => typeof x === 'string').join(','))}" placeholder="ctrl+c,ctrl+d">
      ${v.some(x => typeof x !== 'string') ? `<div class="warnbox xs">มีสมาชิกที่ไม่ใช่ข้อความ — ใช้โหมด “กำหนดเอง” แก้</div>` : ''}`;
  } else if (mode === 'object') {
    body = `<textarea data-ctl="kb-json" rows="3" spellcheck="false">${esc(JSON.stringify(v, null, 1))}</textarea>`;
  } else {
    body = `<span class="muted small">${mode === 'none' ? 'ปิดปุ่มนี้ด้วย "none"' : mode === 'false' ? 'ปิดปุ่มนี้ด้วย false' : 'ไม่มีคีย์นี้ในไฟล์ — ใช้ค่าที่โปรแกรมตั้งไว้'}</span>`;
  }
  const advice = mode === 'object' ? '<div class="hint xs">ตัวอย่าง: {"key":"ctrl+v","preventDefault":false} หรือ {"name":"escape","ctrl":true}</div>' : '';
  return `<div class="kb">${modeSel}${body}${advice}</div>`;
}

function renderUnion(field, eff) {
  const kinds = field.variants.map(v => v.type);
  const currentKind = !eff.present ? ''
    : typeof eff.value === 'boolean' ? 'boolean'
      : typeof eff.value === 'number' ? (field.variants.some(v => v.type === 'integer') ? 'integer' : 'number')
        : 'enum';
  const kindSel = `<select data-ctl="union-kind"><option value="">— ไม่ตั้งค่า —</option>${[...new Set(kinds)].map(k => `<option value="${k}"${currentKind === k ? ' selected' : ''}>${k}</option>`).join('')}</select>`;
  const enumVariant = field.variants.find(v => v.type === 'enum');
  let inner = '';
  if (currentKind === 'boolean') inner = `<label class="switch"><input type="checkbox" data-ctl="boolean" ${eff.value === true ? 'checked' : ''}><span class="track"></span></label>`;
  else if (currentKind === 'enum') inner = `<select data-ctl="enum">${(enumVariant?.enum || []).map(o => `<option value="${esc(o)}"${eff.value === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  else if (currentKind === 'number' || currentKind === 'integer') inner = `<input type="number" step="${currentKind === 'integer' ? 1 : 'any'}" data-ctl="number" value="${eff.present ? esc(eff.value) : ''}">`;
  const shapes = field.variants.map(v => (v.enum ? v.enum.join('|') : v.type)).join(' หรือ ');
  return `<div class="union">${kindSel}${inner}<span class="muted xs">รับค่า: ${esc(shapes)}</span></div>`;
}

/** Nested object: draw its own subfields through the same renderRow, so it nestles to any depth. */
function renderObject(state, field) {
  return `<fieldset class="nested">${(field.subfields || []).map(sub => renderRow(state, sub)).join('')}</fieldset>`;
}

/** Free-form boolean map, e.g. `experimental`. Rows are added/removed by hand. */
function renderBoolmap(field, eff) {
  const entries = eff.value && typeof eff.value === 'object' && !Array.isArray(eff.value) ? Object.entries(eff.value) : [];
  const rows = entries.map(([k, val], i) => `<div class="bm-row">
    <input type="text" data-ctl="bm-key" data-idx="${i}" value="${esc(k)}" placeholder="ชื่อ feature">
    <label class="switch"><input type="checkbox" data-ctl="bm-val" data-idx="${i}" ${val ? 'checked' : ''}><span class="track"></span></label>
    <button class="clr" data-act="bm-del" data-idx="${i}" title="ลบแถวนี้">×</button>
  </div>`).join('');
  return `<div class="boolmap" data-ctl="boolmap">${rows || '<span class="muted small">ยังไม่มีรายการ</span>'}
    <button class="btn ghost xs" data-act="bm-add">+ เพิ่ม</button></div>`;
}

function renderList(field, eff) {
  const items = Array.isArray(eff.value) ? eff.value : [];
  const itemKind = field.item?.variants?.length > 1 ? 'string | {package,options}' : field.item?.type || 'any';
  const rows = items.map((it, i) => `<div class="li-row">
    <input type="text" data-ctl="li" data-idx="${i}" value="${esc(typeof it === 'string' ? it : JSON.stringify(it))}" placeholder="ชื่อปลั๊กอิน หรือ JSON">
    <button class="clr" data-act="li-del" data-idx="${i}" title="ลบ">×</button>
  </div>`).join('');
  return `<div class="list" data-ctl="list">${rows || '<span class="muted small">ว่าง</span>'}
    <div class="row-inline"><button class="btn ghost xs" data-act="li-add">+ เพิ่ม</button>
    <span class="muted xs">ชนิดสมาชิก: ${esc(itemKind)}</span></div>
    <details class="xs"><summary>แก้เป็น JSON</summary><textarea data-ctl="li-json" rows="3" spellcheck="false">${json(items)}</textarea></details></div>`;
}

function fmt(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/* ------------------------------ key capture helper ------------------------------ */

const MOD_ORDER = ['ctrl', 'shift', 'alt', 'meta', 'super'];
/** Turn a real keydown into the string the config file wants: `ctrl+shift+k`. */
export function normalizeKeyEvent(event) {
  const parts = [];
  for (const mod of MOD_ORDER) {
    const on = mod === 'ctrl' ? event.ctrlKey
      : mod === 'shift' ? event.shiftKey
        : mod === 'alt' ? event.altKey
          : mod === 'meta' ? event.metaKey : false;
    if (on) parts.push(mod === 'alt' ? 'alt' : mod);
  }
  const k = String(event.key || '').toLowerCase();
  const ignore = new Set(['control', 'shift', 'alt', 'meta', 'os', 'dead']);
  if (ignore.has(k)) return null;
  const named = { ' ': 'space', arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right', escape: 'escape', enter: 'return', tab: 'tab', backspace: 'backspace', delete: 'delete', pageup: 'pageup', pagedown: 'pagedown', home: 'home', end: 'end' };
  parts.push(named[k] || (event.shiftKey && k.length === 1 ? k : k));
  return parts.join('+');
}

/* --------------------------------- interaction --------------------------------- */

/**
 * Wire every control through one delegated listener. New control types added to
 * renderControl need one `case` here, not a new listener per row.
 */
export function bindSettings(root, state, { onChange = () => {} } = {}) {
  const commit = () => onChange(state);

  root.addEventListener('input', e => {
    const el = e.target;
    const row = el.closest('[data-path]');
    const ctl = el.dataset.ctl;
    if (ctl === 'search') { state.search = el.value; commit(); return; }
    if (!row) return;
    const path = row.dataset.path;
    const field = state.model.index[path];
    if (!field || field.readOnly) return;

    switch (ctl) {
      case 'boolean':
        setDraft(state, path, el.checked);
        break;
      case 'enum':
        el.value === '' ? clearDraft(state, path) : setDraft(state, path, el.value);
        break;
      case 'number': {
        if (el.value === '') { clearDraft(state, path); break; }
        const n = field.type === 'integer' ? parseInt(el.value, 10) : Number(el.value);
        if (Number.isFinite(n)) setDraft(state, path, n);
        break;
      }
      case 'text':
        el.value === '' ? clearDraft(state, path) : setDraft(state, path, el.value);
        break;
      case 'kb-mode':
        applyKeybindMode(state, field, el.value);
        break;
      case 'kb-keys':
        el.value.trim() === '' ? clearDraft(state, path) : setDraft(state, path, normaliseKeys(el.value));
        break;
      case 'kb-json':
        try { setDraft(state, path, JSON.parse(el.value)); el.classList.remove('bad'); }
        catch { el.classList.add('bad'); return; }
        break;
      case 'li':
      case 'li-json':
      case 'bm-key':
      case 'bm-val':
        applyComposite(state, field, row, el);
        break;
      default:
        break;
    }
    commit();
  });

  root.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.ctl === 'union-kind') {
      const row = el.closest('[data-path]');
      const field = state.model.index[row.dataset.path];
      row.dataset.unionKind = el.value;
      if (el.value === '') clearDraft(state, row.dataset.path);
      else if (el.value === 'boolean') setDraft(state, row.dataset.path, true);
      else if (el.value === 'integer') setDraft(state, row.dataset.path, 1);
      else if (el.value === 'number') setDraft(state, row.dataset.path, 1);
      else setDraft(state, row.dataset.path, (field.variants.find(v => v.type === 'enum')?.enum || [''])[0]);
      commit();
    }
  });

  /* key capture: focus the capture target, then take the next combo */
  root.addEventListener('keydown', e => {
    const cap = e.target.closest?.('[data-ctl="kb-capture"]');
    if (!cap) return;
    const combo = normalizeKeyEvent(e);
    if (!combo) return;
    e.preventDefault();
    const row = cap.closest('[data-path]');
    const input = cap.querySelector('[data-ctl="kb-keys"]');
    const existing = input.value.split(',').map(s => s.trim()).filter(Boolean);
    const mode = row.querySelector('[data-ctl="kb-mode"]').value;
    if (mode === 'list') { if (!existing.includes(combo)) existing.push(combo); input.value = existing.join(','); }
    else input.value = combo;
    setDraft(state, row.dataset.path, normaliseKeys(input.value));
    commit();
  });

  root.addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    const row = e.target.closest('[data-path]');
    if (act === 'clear' && row) {
      const field = state.model.index[row.dataset.path];
      if (field?.type === 'object') { for (const sub of field.subfields || []) clearDraft(state, sub.path); }
      else clearDraft(state, row.dataset.path);
      commit();
      return;
    }
    if (!row) return;
    const field = state.model.index[row.dataset.path];
    const idx = Number(e.target.closest('[data-idx]')?.dataset.idx ?? -1);
    if (act === 'bm-add' || act === 'bm-del') {
      const cur = effectiveValue(state, field).value;
      const map = cur && typeof cur === 'object' && !Array.isArray(cur) ? { ...cur } : {};
      if (act === 'bm-add') map[''] = true;
      else delete Object.keys(map)[idx];
      setDraft(state, field.path, map);
    }
    if (act === 'li-add' || act === 'li-del') {
      const cur = effectiveValue(state, field).value;
      const arr = Array.isArray(cur) ? [...cur] : [];
      if (act === 'li-add') arr.push('');
      else arr.splice(idx, 1);
      setDraft(state, field.path, arr);
    }
    commit();
  });
}

function normaliseKeys(text) {
  const list = String(text).split(',').map(s => s.trim()).filter(Boolean);
  if (list.length === 1) return list[0];
  return list;
}

function applyKeybindMode(state, field, mode) {
  const cur = effectiveValue(state, field).value;
  switch (mode) {
    case 'keys': setDraft(state, field.path, typeof cur === 'string' && cur !== 'none' ? cur : (field.default && typeof field.default === 'string' ? field.default : '')); break;
    case 'list': setDraft(state, field.path, Array.isArray(cur) ? cur : typeof cur === 'string' ? cur.split(',').map(s => s.trim()).filter(Boolean) : []); break;
    case 'object': setDraft(state, field.path, (cur && typeof cur === 'object' && !Array.isArray(cur)) ? cur : { key: typeof cur === 'string' ? cur : 'ctrl+k', preventDefault: false }); break;
    case 'none': setDraft(state, field.path, 'none'); break;
    case 'false': setDraft(state, field.path, false); break;
    case 'unset': clearDraft(state, field.path); break;
    default: break;
  }
}

function applyComposite(state, field, row, el) {
  const cur = effectiveValue(state, field).value;
  const idx = Number(el.dataset.idx ?? -1);
  if (el.dataset.ctl === 'li' || el.dataset.ctl === 'li-json') {
    let next;
    if (el.dataset.ctl === 'li-json') {
      try { next = JSON.parse(el.value); } catch { el.classList.add('bad'); return; }
      el.classList.remove('bad');
    } else {
      const arr = Array.isArray(cur) ? [...cur] : [];
      const raw = el.value;
      arr[idx] = raw.trim().startsWith('{') ? safeJson(raw) : raw;
      next = arr;
    }
    setDraft(state, field.path, next);
    return;
  }
  const map = cur && typeof cur === 'object' && !Array.isArray(cur) ? { ...cur } : {};
  if (el.dataset.ctl === 'bm-key') {
    const keys = Object.keys(map);
    const oldKey = keys[idx];
    const val = map[oldKey];
    if (oldKey !== undefined) delete map[oldKey];
    map[el.value] = val ?? true;
  } else if (el.dataset.ctl === 'bm-val') {
    map[Object.keys(map)[idx]] = el.checked;
  }
  setDraft(state, field.path, map);
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return text; }
}
