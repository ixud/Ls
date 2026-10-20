/**
 * validate.mjs — the write boundary.
 *
 * Everything the GUI sends is external input, so it is checked against the real
 * cli schema after the patch is merged and before the file is touched. This is
 * the one place guards live: controls stay dumb, the save path stays strict.
 *
 * Implements the JSON Schema subset the cli schema actually uses: type, enum,
 * const, anyOf, $ref, properties, required, additionalProperties, items,
 * minimum/maximum/exclusiveMinimum/exclusiveMaximum, minLength/maxLength, pattern.
 * Not a general validator, and deliberately so — see RATIONALIZE.md.
 */

import { escapeSegment } from '../shared/paths.mjs';

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const typeName = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const pointerEsc = escapeSegment;

export class SchemaValidator {
  constructor(schema) {
    this.schema = schema;
    this.defs = schema.$defs || {};
  }

  /** @returns {{ok: boolean, errors: Array<{path: string, message: string}>}} */
  validate(value) {
    const errors = [];
    this.walk(value, this.schema, '', errors);
    return { ok: errors.length === 0, errors };
  }

  resolve(node) {
    let cur = node;
    let guard = 0;
    while (cur && cur.$ref && guard++ < 20) {
      const key = cur.$ref.replace('#/$defs/', '');
      const next = this.defs[key];
      if (!next) return { node: cur, missing: key };
      cur = next;
    }
    return { node: cur };
  }

  walk(value, schemaNode, path, errors) {
    if (!schemaNode) return;
    const { node, missing } = this.resolve(schemaNode);
    if (missing) { errors.push({ path, message: `schema references unknown definition ${missing}` }); return; }

    if (Array.isArray(node.anyOf)) {
      /*
       * A nullable wrapper (`anyOf:[X, null]`) is not a real choice — the user's
       * value is an X or it is absent. Validate X directly so the error names the
       * field the user actually set instead of "matches none of object{…}|null".
       */
      const nonNull = node.anyOf.filter(v => v.type !== 'null');
      if (nonNull.length === 1 && node.anyOf.length === 2) { this.walk(value, nonNull[0], path, errors); return; }

      const failures = [];
      for (const variant of node.anyOf) {
        const local = [];
        this.walk(value, variant, path, local);
        if (!local.length) return;                 // first satisfied variant wins, as JSON Schema does
        failures.push({ errors: local });
      }
      /*
       * All variants failed. Report the variant that got furthest into the value —
       * the deepest error path is the most useful one — and only fall back to the
       * generic message when nothing was more specific.
       */
      const deepest = failures
        .map(f => ({ f, first: f.errors[0], depth: f.errors[0].path.split('/').length }))
        .sort((a, b) => (b.depth - a.depth) || (a.f.errors.length - b.f.errors.length))[0];
      if (deepest && deepest.first.path !== path) { errors.push(...deepest.f.errors); return; }
      const allowed = node.anyOf.map(v => this.describe(v)).join(' | ');
      errors.push({ path, message: `value ${short(value)} matches none of: ${allowed}` });
      return;
    }
    if (Array.isArray(node.allOf)) for (const sub of node.allOf) this.walk(value, sub, path, errors);
    if (Array.isArray(node.oneOf)) for (const sub of node.oneOf) this.walk(value, sub, path, errors);

    if (node.const !== undefined && !same(node.const, value)) {
      errors.push({ path, message: `must equal ${JSON.stringify(node.const)}` });
      return;
    }
    if (Array.isArray(node.enum) && !node.enum.some(e => same(e, value))) {
      errors.push({ path, message: `must be one of ${node.enum.map(e => JSON.stringify(e)).join(', ')} (got ${short(value)})` });
      return;
    }

    if (node.type === 'object') {
      if (!isObject(value)) { errors.push({ path, message: `must be an object (got ${typeName(value)})` }); return; }
      for (const key of node.required || []) {
        if (!(key in value)) errors.push({ path: join(path, key), message: 'is required' });
      }
      for (const [key, sub] of Object.entries(value)) {
        const childPath = join(path, key);
        if (node.properties && key in node.properties) { this.walk(sub, node.properties[key], childPath, errors); continue; }
        if (node.additionalProperties === false) { errors.push({ path: childPath, message: 'is not an allowed key here' }); continue; }
        if (isObject(node.additionalProperties)) this.walk(sub, node.additionalProperties, childPath, errors);
      }
      return;
    }

    if (node.type === 'array') {
      if (!Array.isArray(value)) { errors.push({ path, message: `must be an array (got ${typeName(value)})` }); return; }
      if (node.items) value.forEach((item, i) => this.walk(item, node.items, `${path}[${i}]`, errors));
      return;
    }

    if (node.type === 'string') {
      if (typeof value !== 'string') { errors.push({ path, message: `must be a string (got ${typeName(value)})` }); return; }
      if (node.minLength !== undefined && value.length < node.minLength) errors.push({ path, message: `shorter than ${node.minLength}` });
      if (node.maxLength !== undefined && value.length > node.maxLength) errors.push({ path, message: `longer than ${node.maxLength}` });
      if (node.pattern && !new RegExp(node.pattern).test(value)) errors.push({ path, message: `must match ${node.pattern}` });
      return;
    }

    if (node.type === 'number' || node.type === 'integer') {
      if (typeof value !== 'number' || !Number.isFinite(value)) { errors.push({ path, message: `must be a ${node.type} (got ${typeName(value)})` }); return; }
      if (node.type === 'integer' && !Number.isInteger(value)) errors.push({ path, message: 'must be an integer' });
      if (node.minimum !== undefined && value < node.minimum) errors.push({ path, message: `must be >= ${node.minimum}` });
      if (node.maximum !== undefined && value > node.maximum) errors.push({ path, message: `must be <= ${node.maximum}` });
      if (node.exclusiveMinimum !== undefined && value <= node.exclusiveMinimum) errors.push({ path, message: `must be > ${node.exclusiveMinimum}` });
      if (node.exclusiveMaximum !== undefined && value >= node.exclusiveMaximum) errors.push({ path, message: `must be < ${node.exclusiveMaximum}` });
      return;
    }

    if (node.type === 'boolean' && typeof value !== 'boolean') {
      errors.push({ path, message: `must be true or false (got ${typeName(value)})` });
      return;
    }
    if (node.type === 'null' && value !== null) {
      errors.push({ path, message: 'must be null' });
    }
  }

  describe(node) {
    const { node: n } = this.resolve(node);
    if (!n) return 'unknown';
    if (Array.isArray(n.enum)) return n.enum.map(e => JSON.stringify(e)).join('|');
    if (n.type === 'object' && n.properties) return `object{${Object.keys(n.properties).join(', ')}}`;
    if (n.type === 'array') return 'array';
    return n.type || 'any';
  }
}

function join(base, key) { return base ? `${base}/${pointerEsc(key)}` : pointerEsc(key); }
function same(a, b) { return a === b || JSON.stringify(a) === JSON.stringify(b); }
function short(v) {
  const s = JSON.stringify(v);
  return s && s.length > 60 ? s.slice(0, 57) + '…' : String(s);
}

/**
 * Keybind values get one extra check the schema cannot express: an object key
 * must be a key name the program understands, and an array entry must be a
 * string or object. `false` and "none" stay legal (they mean "disabled").
 */
export function validateKeybindValue(value) {
  if (value === false || value === 'none') return { ok: true };
  if (typeof value === 'string') {
    if (!value.trim()) return { ok: false, message: 'empty key string — use "none" or false to disable' };
    return { ok: true };
  }
  if (Array.isArray(value)) {
    if (!value.length) return { ok: false, message: 'empty array — use "none" or false to disable' };
    for (const [i, item] of value.entries()) {
      const r = validateKeybindValue(item);
      if (!r.ok) return { ok: false, message: `item ${i}: ${r.message}` };
    }
    return { ok: true };
  }
  if (isObject(value)) {
    const name = value.key ?? value.name;
    if (!name) return { ok: false, message: 'object form needs "key" (or "name")' };
    if (value.event !== undefined && !['press', 'release'].includes(value.event)) {
      return { ok: false, message: `event must be "press" or "release" (got ${JSON.stringify(value.event)})` };
    }
    for (const flag of ['preventDefault', 'fallthrough', 'ctrl', 'shift', 'meta', 'super', 'hyper']) {
      if (value[flag] !== undefined && value[flag] !== null && typeof value[flag] !== 'boolean') {
        return { ok: false, message: `${flag} must be a boolean` };
      }
    }
    return { ok: true };
  }
  return { ok: false, message: `unsupported binding value ${short(value)}` };
}
