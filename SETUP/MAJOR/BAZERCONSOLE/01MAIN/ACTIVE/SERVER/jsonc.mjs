/**
 * jsonc.mjs — แก้ JSONC แบบคงคอมเมนต์ (ไม่ parse ทั้งไฟล์แล้วเขียนใหม่)
 * ใช้กับ opencode.jsonc / tui.json ที่ผู้ใช้อาจมีคอมเมนต์อยู่
 *
 * หลักการ: สแกนข้อความหาช่วงของ value ที่ต้องการ แล้วแทนที่เฉพาะช่วงนั้น
 * ถ้าหาโครงสร้างไม่เจอ → throw (ห้ามเขียนไฟล์เด็ดขาด — safe failure)
 */

const WS = new Set([' ', '\t', '\r', '\n']);

export function stripJsonc(text) {
  let out = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (c === '"') {
      const start = i;
      i++;
      while (i < n) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === '"') { i++; break; }
        i++;
      }
      out += text.slice(start, i);
      continue;
    }
    if (c === '/' && text[i + 1] === '/') { while (i < n && text[i] !== '\n') i++; continue; }
    if (c === '/' && text[i + 1] === '*') { i += 2; while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++; i += 2; continue; }
    out += c;
    i++;
  }
  // trailing commas
  return out.replace(/,\s*([}\]])/g, '$1');
}

export function parseJsonc(text) {
  const clean = stripJsonc(text).replace(/^\uFEFF/, '').trim();
  if (!clean) return {};
  return JSON.parse(clean);
}

function skipWs(text, i, end) {
  while (i < end) {
    const c = text[i];
    if (WS.has(c)) { i++; continue; }
    if (c === '/' && text[i + 1] === '/') { while (i < end && text[i] !== '\n') i++; continue; }
    if (c === '/' && text[i + 1] === '*') { i += 2; while (i < end && !(text[i] === '*' && text[i + 1] === '/')) i++; i += 2; continue; }
    break;
  }
  return i;
}

function stringEnd(text, i, end) {
  let j = i + 1;
  while (j < end) {
    if (text[j] === '\\') { j += 2; continue; }
    if (text[j] === '"') return j + 1;
    j++;
  }
  throw new Error('jsonc: สตริงไม่ปิด');
}

/** จุดสิ้นสุดของ value ที่เริ่มที่ i */
export function valueEnd(text, i, end) {
  i = skipWs(text, i, end);
  const c = text[i];
  if (c === '"') return stringEnd(text, i, end);
  if (c === '{' || c === '[') {
    const open = c, close = c === '{' ? '}' : ']';
    let depth = 0, j = i;
    while (j < end) {
      const ch = text[j];
      if (ch === '"') { j = stringEnd(text, j, end); continue; }
      if (ch === '/' && text[j + 1] === '/') { while (j < end && text[j] !== '\n') j++; continue; }
      if (ch === '/' && text[j + 1] === '*') { j += 2; while (j < end && !(text[j] === '*' && text[j + 1] === '/')) j++; j += 2; continue; }
      if (ch === open) depth++;
      else if (ch === close) { depth--; if (depth === 0) return j + 1; }
      j++;
    }
    throw new Error('jsonc: วงเล็บไม่ปิด');
  }
  let j = i;
  while (j < end) {
    const ch = text[j];
    if (ch === ',' || ch === '}' || ch === ']' || ch === '\n' || ch === '\r') break;
    if (ch === '/' && (text[j + 1] === '/' || text[j + 1] === '*')) break;
    j++;
  }
  return j;
}

/** รายการ property ของ object ที่เริ่มที่ objectStart ('{') */
export function objectProps(text, objectStart) {
  const end = valueEnd(text, objectStart, text.length);
  const props = [];
  let i = skipWs(text, objectStart + 1, end - 1);
  while (i < end - 1) {
    i = skipWs(text, i, end - 1);
    if (i >= end - 1) break;
    if (text[i] === ',') { i++; continue; }
    const keyStart = i;
    let key;
    if (text[i] === '"') {
      const ke = stringEnd(text, i, end - 1);
      key = JSON.parse(text.slice(i, ke));
      i = ke;
    } else {
      let ke = i;
      while (ke < end && !WS.has(text[ke]) && text[ke] !== ':') ke++;
      key = text.slice(i, ke);
      i = ke;
    }
    i = skipWs(text, i, end - 1);
    if (text[i] !== ':') throw new Error(`jsonc: key "${key}" ไม่มี ':'`);
    i++;
    const vStart = skipWs(text, i, end - 1);
    const vEnd = valueEnd(text, vStart, end - 1);
    props.push({ key, keyStart, keyEnd: i, valueStart: vStart, valueEnd: vEnd });
    i = vEnd;
    i = skipWs(text, i, end - 1);
    if (text[i] === ',') i++;
  }
  return { props, start: objectStart, end };
}

function findProp(props, key) {
  for (let i = props.length - 1; i >= 0; i--) if (props[i].key === key) return props[i];
  return null;
}

function indentAt(text, index) {
  const lineStart = text.lastIndexOf('\n', index) + 1;
  const m = /^[ \t]*/.exec(text.slice(lineStart, index));
  return m ? m[0] : '';
}

function unitIndent(text) {
  const m = /\n([ \t]+)\S/.exec(text);
  return m ? m[1] : '  ';
}

function format(value, baseIndent, unit) {
  const s = JSON.stringify(value, null, unit);
  return s.replace(/\n/g, '\n' + baseIndent);
}

/** ลึก merge object เข้าไปใน object ที่ path */
function mergeInto(text, objStart, obj, unit, baseIndent) {
  let { props } = objectProps(text, objStart);
  const entries = Object.entries(obj);
  for (const [k, v] of entries) {
    const p = findProp(props, k);
    if (p && v && typeof v === 'object' && !Array.isArray(v) && text[p.valueStart] === '{') {
      mergeInto(text, p.valueStart, v, unit, baseIndent + unit);
    } else if (p) {
      const ind = indentAt(text, p.keyStart);
      text = text.slice(0, p.valueStart) + format(v, ind, unit) + text.slice(p.valueEnd);
    } else {
      ({ text, props } = insertProp(text, objStart, k, v, unit));
    }
    ({ props } = objectProps(text, objStart));
  }
  return text;
}

function insertProp(text, objStart, key, value, unit) {
  const { props, end } = objectProps(text, objStart);
  const closeBrace = end - 1;
  const objIndent = indentAt(text, objStart);
  const ind = objIndent + unit;
  const body = `${JSON.stringify(key)}: ${format(value, ind, unit)}`;
  if (!props.length) {
    const insert = `\n${ind}${body}\n${objIndent}`;
    text = text.slice(0, closeBrace) + insert + text.slice(closeBrace);
  } else {
    const last = props[props.length - 1];
    text = text.slice(0, last.valueEnd) + `,\n${ind}${body}` + text.slice(last.valueEnd);
  }
  return { text, props: objectProps(text, objStart).props };
}

/** ตั้งค่าที่ path (array ของ key) — ถ้าเป็น object และ merge=true จะ merge ลึก */
export function setAtPath(text, keys, value, { merge = false } = {}) {
  if (!Array.isArray(keys) || !keys.length) throw new Error('jsonc: path ว่าง');
  let bom = '';
  let raw = text || '';
  if (raw.charCodeAt(0) === 0xfeff) { bom = '\uFEFF'; raw = raw.slice(1); }
  let src = raw.trim() ? raw : '{\n}\n';
  const unit = unitIndent(src);
  let rootStart = skipWs(src, 0, src.length);
  if (src[rootStart] !== '{') throw new Error('jsonc: ไฟล์ไม่ได้เริ่มด้วย object');
  let objStart = rootStart;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const last = i === keys.length - 1;
    const { props } = objectProps(src, objStart);
    const p = findProp(props, key);
    if (last) {
      if (merge && value && typeof value === 'object' && !Array.isArray(value) && p && src[p.valueStart] === '{') {
        src = mergeInto(src, p.valueStart, value, unit, indentAt(src, p.keyStart));
      } else if (p) {
        src = src.slice(0, p.valueStart) + format(value, indentAt(src, p.keyStart), unit) + src.slice(p.valueEnd);
      } else {
        src = insertProp(src, objStart, key, value, unit).text;
      }
      return bom + src;
    }
    if (!p) {
      src = insertProp(src, objStart, key, {}, unit).text;
      const np = findProp(objectProps(src, objStart).props, key);
      objStart = np.valueStart;
      continue;
    }
    if (src[p.valueStart] !== '{') {
      src = src.slice(0, p.valueStart) + '{\n' + indentAt(src, p.keyStart) + unit + '}' + src.slice(p.valueEnd);
      const np = findProp(objectProps(src, objStart).props, key);
      objStart = np.valueStart;
      continue;
    }
    objStart = p.valueStart;
  }
  return bom + src;
}

export function getAtPath(text, keys) {
  let cur = parseJsonc(text);
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[k];
  }
  return cur;
}

/** ลบสมาชิก array ที่เท่ากับ item โดย "คงคอมเมนต์และรูปแบบเดิม" ไว้ทั้งหมด */
export function removeArrayItem(text, keys, item) {
  let bom = '';
  let src = text || '';
  if (src.charCodeAt(0) === 0xfeff) { bom = '\uFEFF'; src = src.slice(1); }

  let rootStart = skipWs(src, 0, src.length);
  if (src[rootStart] !== '{') return text;
  let objStart = rootStart;
  for (let i = 0; i < keys.length - 1; i++) {
    const p = findProp(objectProps(src, objStart).props, keys[i]);
    if (!p || src[p.valueStart] !== '{') return text;
    objStart = p.valueStart;
  }
  const prop = findProp(objectProps(src, objStart).props, keys[keys.length - 1]);
  if (!prop || src[prop.valueStart] !== '[') return text;

  const arrStart = prop.valueStart;
  const arrEnd = valueEnd(src, arrStart, src.length);
  const spans = [];
  let i = skipWs(src, arrStart + 1, arrEnd - 1);
  while (i < arrEnd - 1) {
    i = skipWs(src, i, arrEnd - 1);
    if (i >= arrEnd - 1) break;
    if (src[i] === ',') { i++; continue; }
    const ve = valueEnd(src, i, arrEnd - 1);
    spans.push({ start: i, end: ve, raw: src.slice(i, ve) });
    i = ve;
  }
  const hit = spans.find((sp) => { try { return parseJsonc(sp.raw) === item; } catch { return false; } });
  if (!hit) return text;

  const after = skipWs(src, hit.end, arrEnd - 1);
  if (src[after] === ',') return bom + src.slice(0, hit.start) + src.slice(after + 1);

  // ตัวสุดท้ายของ array → ลบ comma ที่นำหน้าแทน
  let before = hit.start - 1;
  while (before > arrStart && /\s/.test(src[before])) before--;
  if (src[before] === ',') return bom + src.slice(0, before) + src.slice(hit.end);
  return bom + src.slice(0, hit.start) + src.slice(hit.end);
}
