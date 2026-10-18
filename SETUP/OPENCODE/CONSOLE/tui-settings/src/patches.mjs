/**
 * patches.mjs — changed-paths-only writes.
 *
 * The client never sends a whole config file back. It sends
 *   [{ path: 'diffs/wrap', op: 'set', value: 'none' },
 *    { path: 'keybinds/app.exit', op: 'unset' }]
 * and this module merges those leaves into the file that is on disk *now*.
 *
 * Paths are `/`-separated and escaped (see shared/paths.mjs). Dots are not a
 * separator because keybind IDs contain dots.
 *
 * Two invariants the rest of the feature depends on:
 *   1. Only the named leaves change. Unknown keys, sibling keys the catalog does
 *      not know about, and key order all survive.
 *   2. The merge reads the file again at save time, so a hand edit made while the
 *      page was open is not clobbered by a stale snapshot.
 */
import { toSegments, toWire, readLeaf, isKnownContainer, isPlainObject } from '../shared/paths.mjs';

export { readLeaf };

/**
 * Set one leaf. Creates intermediate objects but never replaces an existing
 * non-object with an object (that would silently drop unknown content).
 */
export function setLeaf(root, wirePath, value) {
  const parts = toSegments(wirePath);
  let node = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (node[key] === undefined) node[key] = {};
    if (!isPlainObject(node[key])) {
      throw new Error(`cannot set ${wirePath}: ${toSegments(wirePath).slice(0, i + 1).join('.')} is not an object`);
    }
    node = node[key];
  }
  node[parts[parts.length - 1]] = value;
}

/** Delete one leaf, then drop parent objects that became empty because of it. */
export function unsetLeaf(root, wirePath) {
  const parts = toSegments(wirePath);
  const chain = [];
  let node = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!isPlainObject(node[key])) return false;
    chain.push([node, key]);
    node = node[key];
  }
  const last = parts[parts.length - 1];
  if (!(last in node)) return false;
  delete node[last];
  for (let i = chain.length - 1; i >= 0; i--) {
    const [parent, key] = chain[i];
    if (isPlainObject(parent[key]) && Object.keys(parent[key]).length === 0) delete parent[key];
    else break;
  }
  return true;
}

export const getLeaf = readLeaf;

/**
 * Apply a patch list to a snapshot.
 * @returns {{ result: object, applied: Array, skipped: Array }}
 */
export function applyPatches(base, patches) {
  const result = JSON.parse(JSON.stringify(base ?? {}));
  const applied = [];
  const skipped = [];
  for (const p of patches || []) {
    if (!p || typeof p.path !== 'string' || !p.path) { skipped.push({ patch: p, reason: 'empty path' }); continue; }
    try {
      if (p.op === 'unset') {
        if (unsetLeaf(result, p.path)) applied.push({ ...p });
        else skipped.push({ patch: p, reason: 'not present in file' });
      } else {
        const before = getLeaf(result, p.path);
        if (before.found && jsonEqual(before.value, p.value)) { skipped.push({ patch: p, reason: 'identical to current value' }); continue; }
        setLeaf(result, p.path, p.value);
        applied.push({ ...p });
      }
    } catch (e) {
      skipped.push({ patch: p, reason: e.message });
    }
  }
  return { result, applied, skipped };
}

/** Leaf-level diff of two snapshots -> patch list. Only changed paths appear. */
export function diffValues(current, edited, prefix = [], out = []) {
  const keys = new Set([...Object.keys(current || {}), ...Object.keys(edited || {})]);
  for (const key of keys) {
    const segments = [...prefix, key];
    const a = current?.[key];
    const b = edited?.[key];
    if (isPlainObject(a) && isPlainObject(b)) { diffValues(a, b, segments, out); continue; }
    if (a === undefined && b !== undefined) { out.push({ path: toWire(segments), op: 'set', value: b }); continue; }
    if (a !== undefined && b === undefined) { out.push({ path: toWire(segments), op: 'unset' }); continue; }
    if (!jsonEqual(a, b)) out.push({ path: toWire(segments), op: 'set', value: b });
  }
  return out;
}

/**
 * Paths present in the file that the catalog does not describe. Reported before
 * a save so nothing is lost silently — and never edited.
 * Recursion stops at the first unknown key: the whole subtree is unknown, so
 * listing its children would be noise nobody can act on.
 */
export function unknownPaths(fileObject, knownPaths, prefix = [], out = []) {
  for (const [key, value] of Object.entries(fileObject || {})) {
    const segments = [...prefix, key];
    const wire = toWire(segments);
    if (isKnownContainer(wire, knownPaths)) { if (isPlainObject(value)) unknownPaths(value, knownPaths, segments, out); continue; }
    out.push(wire);
  }
  return out;
}

export { isPlainObject };

export function jsonEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  return JSON.stringify(sortDeep(a)) === JSON.stringify(sortDeep(b));
}

function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (!isPlainObject(v)) return v;
  return Object.fromEntries(Object.keys(v).sort().map(k => [k, sortDeep(v[k])]));
}
