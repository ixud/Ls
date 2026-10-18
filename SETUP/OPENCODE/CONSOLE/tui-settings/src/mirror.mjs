/**
 * mirror.mjs — cli.json <-> tui.json.
 *
 * Why this exists: opencode V2 reads settings from `cli.json`, but the legacy
 * `tui.json` path is still consulted on the "migrated cli config" route. Writing
 * both keeps behaviour the same whichever file something reads.
 *
 * The hard part is that the two schemas do NOT line up mechanically:
 *   - settings: cli `leader.timeout` <-> tui `leader_timeout`; cli `theme` is an
 *     object {name,mode} <-> tui `theme` is a string; cli `diffs.view` <-> tui
 *     `diff_style` only partially.
 *   - keybinds: 242 cli IDs vs 184 tui IDs, and the names differ by more than
 *     `_` vs `.` — `session.child.next` is `session_child_cycle` in tui, and
 *     `session.page.up` is `messages_page_up`.
 *
 * So the mapping is not invented here. It is extracted from the opencode binary
 * (schema/translate-keybinds.json, `tuiToCli`), reversed for the cli->tui
 * direction, and anything outside the map is REPORTED, never guessed. A wrong
 * key name written into a config file fails silently at runtime, which is worse
 * than an honest gap in the UI.
 */

/** Settings-level translation, both directions. `lossy` entries are documented as such. */
const SETTING_MAP = [
  { cli: 'theme.name', tui: 'theme', note: 'cli theme is an object; tui theme is the plain name string' },
  { cli: 'leader.timeout', tui: 'leader_timeout', note: 'leader key + timeout are a pair; only the timeout has a tui home' },
  { cli: 'scroll.speed', tui: 'scroll_speed' },
  { cli: 'scroll.acceleration', tui: 'scroll_acceleration.enabled', note: 'tui nests it under scroll_acceleration' },
  { cli: 'attention.notifications', tui: 'attention.notifications' },
  { cli: 'attention.sound', tui: 'attention.sound' },
  { cli: 'attention.volume', tui: 'attention.volume' },
  { cli: 'attention.sound_pack', tui: 'attention.sound_pack' },
  { cli: 'mouse', tui: 'mouse' },
  { cli: 'cursor', tui: 'cursor' },
  /* cli-only, no tui target. Listed so the report explains them instead of looking like a bug. */
  { cli: 'theme.mode', tui: null, note: 'tui has no colour-mode setting' },
  { cli: 'prompt.editor', tui: null, note: 'kilocode-era kv flag; tui.prompt holds sizes, not this' },
  { cli: 'prompt.paste', tui: null, note: 'tui.prompt has no paste-mode key' },
  { cli: 'prompt.image_preview', tui: null, note: 'v2 only' },
  { cli: 'diffs.source', tui: null, note: 'v2 only' },
  { cli: 'diffs.wrap', tui: null, note: 'tui keeps diff wrap in state/kv.json, not tui.json' },
  { cli: 'diffs.tree', tui: null, note: 'tui keeps this in state/kv.json' },
  { cli: 'diffs.single', tui: null, note: 'tui keeps this in state/kv.json' },
  { cli: 'diffs.fullscreen', tui: null, note: 'tui keeps this in state/kv.json' },
  { cli: 'terminal.title', tui: null, note: 'tui keeps this in state/kv.json' },
  { cli: 'session.*', tui: null, note: 'v2 only; tui keeps the equivalents in state/kv.json' },
  { cli: 'tabs.*', tui: null, note: 'v2 only' },
  { cli: 'mini.*', tui: null, note: 'v2 only' },
  { cli: 'animations', tui: null, note: 'v2 only (tui kept it in kv.json)' },
  { cli: 'highlights', tui: null, note: 'v2 only' },
  { cli: 'debug.*', tui: null, note: 'v2 only' },
  { cli: 'experimental', tui: null, note: 'v2 only' },
  { cli: 'plugins', tui: 'plugin', note: 'cli plugins[] (string | {package,options}) <-> tui plugin[] (string | [name, options])' },
];
const TUI_ONLY = ['plugin_enabled', 'attention.enabled', 'prompt.max_height', 'prompt.max_width', 'diff_style'];

function splitPath(p) { return String(p).split('.'); }

function readPath(obj, dotted) {
  let node = obj;
  for (const key of splitPath(dotted)) {
    if (node === null || typeof node !== 'object' || !(key in node)) return undefined;
    node = node[key];
  }
  return node;
}
function writePath(obj, dotted, value) {
  const parts = splitPath(dotted);
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (node[parts[i]] === undefined) node[parts[i]] = {};
    node = node[parts[i]];
  }
  node[parts[parts.length - 1]] = value;
}

const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/** cli plugins[] -> tui plugin[] : `{package,options}` becomes `[package, options]`. */
export function pluginsCliToTui(plugins) {
  if (!Array.isArray(plugins)) return undefined;
  return plugins.map(p => (typeof p === 'string' ? p : [p.package, p.options ?? {}]));
}
/** tui plugin[] -> cli plugins[] : `[name, options]` becomes `{package,options}`. */
export function pluginsTuiToCli(plugin) {
  if (!Array.isArray(plugin)) return undefined;
  return plugin.map(p => (Array.isArray(p) ? { package: p[0], options: p[1] ?? null } : p));
}

/**
 * cli.json -> tui.json
 * @param {object} cli   the merged cli config
 * @param {object} translate  schema/translate-keybinds.json
 * @param {Set<string>|string[]} [allowlist]  tui keybind names the legacy schema
 *   accepts. When given, a translated name outside it is NOT written — it is
 *   reported under `blockedKeybinds` instead. The extracted name map is newer
 *   than `tui.schema.json`, so 22 of its names (open_menu, session_tab_next, …)
 *   would otherwise be written as keys the TUI never reads.
 * @returns {{ tui: object, report: object }}
 */
export function cliToTui(cli, translate, allowlist) {
  const allow = allowlist ? (allowlist instanceof Set ? allowlist : new Set(allowlist)) : null;
  const tui = { $schema: 'https://opencode.ai/tui.json' };
  const mapped = [], skipped = [], unmappedKeybinds = [], blockedKeybinds = [];

  for (const entry of SETTING_MAP) {
    if (!entry.tui) {
      const present = entry.cli.endsWith('.*')
        ? Object.keys(cli || {}).some(k => k === entry.cli.slice(0, -2))
        : readPath(cli || {}, entry.cli) !== undefined;
      if (present) skipped.push({ cli: entry.cli, reason: entry.note });
      continue;
    }
    if (entry.cli === 'plugins') {
      const v = pluginsCliToTui(cli?.plugins);
      if (v !== undefined) { writePath(tui, entry.tui, v); mapped.push({ cli: 'plugins', tui: entry.tui }); }
      continue;
    }
    const value = readPath(cli || {}, entry.cli);
    if (value === undefined) continue;
    writePath(tui, entry.tui, value);
    mapped.push({ cli: entry.cli, tui: entry.tui, note: entry.note });
  }

  const cliKeybinds = cli?.keybinds;
  if (isPlainObject(cliKeybinds)) {
    const out = {};
    for (const [id, value] of Object.entries(cliKeybinds)) {
      const tuiName = id === 'leader' ? 'leader' : translate.cliToTui[id];
      if (!tuiName) { unmappedKeybinds.push(id); continue; }
      if (allow && !allow.has(tuiName)) { blockedKeybinds.push({ cli: id, tui: tuiName }); continue; }
      out[tuiName] = value;
    }
    if (Object.keys(out).length) tui.keybinds = out;
  }

  return {
    tui,
    report: {
      direction: 'cli->tui',
      mappedSettings: mapped,
      skippedSettings: skipped,
      mappedKeybinds: Object.keys(tui.keybinds || {}).length,
      totalCliKeybinds: isPlainObject(cliKeybinds) ? Object.keys(cliKeybinds).length : 0,
      unmappedKeybinds,
      blockedKeybinds,
      blockedReason: 'these cli keybind IDs translate to tui names the legacy tui.schema.json does not define — writing them would create keys the TUI ignores',
      unmappedReason: 'these CLI keybind IDs have no tui.json name in the installed binary — newer than the legacy schema, nothing to mirror to',
      tuiOnlyKeys: TUI_ONLY,
    },
  };
}

/**
 * tui.json -> cli.json. Mirrors what the binary itself does on the
 * "migrated cli config" path, including its refusal to write keybind names it
 * does not recognise.
 */
export function tuiToCli(tui, translate, { kv = {} } = {}) {
  const cli = {};
  const rejected = [];

  const themeName = readPath(tui, 'theme') ?? kv.theme;
  const themeMode = kv.theme_mode_lock;
  if (themeName !== undefined || themeMode !== undefined) {
    cli.theme = {};
    if (themeName !== undefined) cli.theme.name = themeName;
    if (themeMode !== undefined) cli.theme.mode = themeMode;
  }

  const pluginList = pluginsTuiToCli(tui?.plugin);
  if (pluginList) cli.plugins = pluginList;
  else if (isPlainObject(tui?.plugin_enabled)) {
    cli.plugins = Object.entries(tui.plugin_enabled).map(([name, on]) => (on ? name : `-${name}`));
  }

  const lt = readPath(tui, 'leader_timeout');
  if (lt !== undefined) cli.leader = { timeout: lt };
  const ss = readPath(tui, 'scroll_speed');
  const sa = readPath(tui, 'scroll_acceleration.enabled');
  if (ss !== undefined || sa !== undefined) {
    cli.scroll = {};
    if (ss !== undefined) cli.scroll.speed = ss;
    if (sa !== undefined) cli.scroll.acceleration = sa;
  }
  if (isPlainObject(tui?.attention)) {
    const { enabled, ...rest } = tui.attention;
    if (Object.keys(rest).length) cli.attention = rest;
  }
  for (const p of ['mouse', 'cursor']) if (tui?.[p] !== undefined) cli[p] = tui[p];

  const diffStyle = readPath(tui, 'diff_style');
  const diffView = kv.diff_viewer_view ?? (diffStyle === 'stacked' ? 'unified' : undefined);
  const diffs = {};
  if (kv.diff_wrap_mode !== undefined) diffs.wrap = kv.diff_wrap_mode;
  if (kv.diff_viewer_show_file_tree !== undefined) diffs.tree = kv.diff_viewer_show_file_tree;
  if (kv.diff_viewer_single_patch !== undefined) diffs.single = kv.diff_viewer_single_patch;
  if (diffView !== undefined) diffs.view = diffView;
  if (Object.keys(diffs).length) cli.diffs = diffs;

  if (kv.terminal_title_enabled !== undefined) cli.terminal = { title: kv.terminal_title_enabled };

  const prompt = {};
  if (kv.file_context_enabled !== undefined) prompt.editor = kv.file_context_enabled;
  if (kv.paste_summary_enabled !== undefined) prompt.paste = kv.paste_summary_enabled ? 'compact' : 'full';
  if (Object.keys(prompt).length) cli.prompt = prompt;

  const session = {};
  const thinking = kv.thinking_mode ?? (kv.thinking_visibility === undefined ? undefined : (kv.thinking_visibility ? 'show' : 'hide'));
  for (const [from, to] of [['sidebar', 'sidebar'], ['scrollbar_visible', 'scrollbar'], ['exploration_grouping', 'grouping']]) {
    if (kv[from] === undefined) continue;
    session[to] = to === 'grouping' ? (kv[from] ? 'auto' : 'none') : kv[from];
  }
  if (thinking !== undefined) session.thinking = thinking;
  if (Object.keys(session).length) cli.session = session;
  if (kv.animations_enabled !== undefined) cli.animations = kv.animations_enabled;

  if (isPlainObject(tui?.keybinds)) {
    const out = {};
    for (const [name, value] of Object.entries(tui.keybinds)) {
      const cliName = !translate.tuiToCli[name] && name !== 'leader' ? null : (translate.tuiToCli[name] ?? 'leader');
      if (!cliName) { rejected.push({ tui: name, reason: 'no cli.json keybind with this name' }); continue; }
      out[cliName] = value;
    }
    if (Object.keys(out).length) cli.keybinds = out;
  }

  return { cli, report: { direction: 'tui->cli', rejectedKeybinds: rejected, unknownTuiKeys: TUI_ONLY } };
}

/** Every cli path the mirror touches, for the UI's mirror badge. */
export function mirrorCapability(translate) {
  const tuiCovered = Object.values(translate.cliToTui).length + 1; // + leader
  return {
    settingMap: SETTING_MAP,
    tuiOnly: TUI_ONLY,
    keybind: {
      tuiNames: Object.keys(translate.tuiToCli).length,
      cliNamesCovered: tuiCovered,
      note: 'cli keybinds newer than the legacy tui schema have no mirror target',
    },
  };
}
