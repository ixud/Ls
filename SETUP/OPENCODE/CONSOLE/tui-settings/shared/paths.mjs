/**
 * paths.mjs — how a config leaf is addressed on the wire.
 *
 * Level separators are `/`, and `~`/`/` inside a key are escaped (`~0`, `~1`) —
 * the same convention as JSON Pointer. Two reasons not to use dotted paths:
 *
 *   1. keybind IDs contain dots. `keybinds.app.exit` split on dots becomes
 *      {keybinds:{app:{exit:…}}}, which is not the file shape opencode reads.
 *      Every keybind save would have silently written a nested object.
 *   2. a hand-written key can contain dots or slashes too. With escaping the
 *      path is unambiguous for any key, known or not.
 *
 * Display still uses dots (`keybinds.app.exit`) because that is what the docs and
 * the schema call it; `toDisplay`/`toWire` convert.
 *
 * Used by the server (patch engine, validator) and by the browser (renderer),
 * so it lives in its own module rather than in either one.
 */

export function escapeSegment(seg) {
  return String(seg).replace(/~/g, '~0').replace(/\//g, '~1');
}
export function unescapeSegment(seg) {
  return String(seg).replace(/~1/g, '/').replace(/~0/g, '~');
}

/** ['keybinds','app.exit'] -> 'keybinds/app.exit' */
export function toWire(segments) {
  return (Array.isArray(segments) ? segments : [segments]).map(escapeSegment).join('/');
}
/** 'keybinds/app.exit' -> ['keybinds','app.exit'] */
export function toSegments(wirePath) {
  return String(wirePath).split('/').map(unescapeSegment);
}
/** Wire path shown the way the docs write it: 'keybinds/app.exit' -> 'keybinds.app.exit' */
export function toDisplay(wirePath) {
  return toSegments(wirePath).join('.');
}

/** Read a leaf by wire path. `found` distinguishes absent from present-and-undefined. */
export function readLeaf(root, wirePath) {
  const keys = toSegments(wirePath);
  let node = root;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (node === null || typeof node !== 'object' || !(key in node)) return { found: false, value: undefined, parent: undefined, key };
    const parent = node;
    node = node[key];
    if (i === keys.length - 1) return { found: true, value: node, parent, key };
  }
  return { found: false, value: undefined, parent: undefined, key: undefined };
}

/** True when `wirePath` is the container of at least one known leaf. */
export function isKnownContainer(wirePath, knownPaths) {
  if (knownPaths.has(wirePath)) return true;
  const lead = wirePath + '/';
  for (const p of knownPaths) if (p.startsWith(lead)) return true;
  return false;
}

export function isPlainObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
