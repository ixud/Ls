/**
 * frontmatter.mjs — อ่าน/เขียนบล็อก `permission:` ใน frontmatter ของไฟล์ agent
 * ทำไมต้องมี: probe พิสูจน์แล้วว่า OpenCode ต่อกฎในไฟล์ agent ไว้ "ท้าย" กฎใน config
 * → ค่าในไฟล์ชนะ ดังนั้นบันไดเหมาเข่งที่เขียนแต่ config จะถูกไฟล์ทับในคีย์ที่ไฟล์ประกาศ
 * ตัวนี้จึงเขียน permission ลงทั้งสองที่ ด้วยชุดค่าเดียวกัน
 *
 * ข้อจำกัด: เป็น YAML-lite — รองรับเฉพาะรูปแบบที่ไฟล์ agent ของเราใช้ (key: value ระดับเดียว)
 * ไม่ได้เป็น YAML parser เต็มตัว (ไม่ต้องใช้ dependency)
 */

export const PERMISSION_ORDER = [
  'read', 'edit', 'glob', 'grep', 'list', 'shell', 'subagent',
  'webfetch', 'websearch', 'external_directory', 'question', 'doom_loop',
];

const FM_RE = /^(---\r?\n)([\s\S]*?)(\r?\n---[ \t]*(?:\r?\n|$))/;

/** แยก frontmatter ออกจาก body — คืน null ถ้าไม่มี */
export function splitFrontmatter(text) {
  const src = String(text ?? '');
  const bom = src.charCodeAt(0) === 0xfeff ? '\uFEFF' : '';
  const rest = bom ? src.slice(1) : src;
  const m = FM_RE.exec(rest);
  if (!m) return null;
  return {
    bom,
    open: m[1],
    yaml: m[2],
    close: m[3],
    body: rest.slice(m[0].length),
  };
}

/** แทน (หรือเพิ่ม) บล็อก permission: ใน yaml — คง key อื่นทั้งหมดไว้ */
export function setYamlPermission(yaml, permission) {
  const lines = String(yaml ?? '').split(/\r?\n/);
  const out = [];
  let skipping = false;
  for (const line of lines) {
    if (/^permission\s*:/.test(line)) { skipping = true; continue; }
    if (skipping) {
      // บล็อกเดิม = บรรทัดที่ขึ้นต้นด้วยช่องว่าง หรือบรรทัดว่างที่ยังอยู่ในบล็อก
      if (/^\s+\S/.test(line) || line.trim() === '') continue;
      skipping = false;
    }
    out.push(line);
  }
  // ตัดบรรทัดว่างที่ค้างท้าย
  while (out.length && out[out.length - 1].trim() === '') out.pop();

  const keys = [
    ...PERMISSION_ORDER.filter((k) => permission?.[k] !== undefined),
    ...Object.keys(permission || {}).filter((k) => !PERMISSION_ORDER.includes(k)).sort(),
  ];
  out.push('permission:');
  for (const k of keys) out.push(`  ${k}: ${permission[k]}`);
  return out.join('\n');
}

/** เขียน permission ลง frontmatter ของไฟล์ agent (คืนข้อความใหม่) */
export function setFrontmatterPermission(text, permission) {
  const fm = splitFrontmatter(text);
  if (!fm) throw new Error('ไฟล์นี้ไม่มี frontmatter (ต้องเริ่มด้วย ---)');
  const yaml = setYamlPermission(fm.yaml, permission);
  const nl = fm.open.includes('\r\n') ? '\r\n' : '\n';
  const head = yaml.split('\n').join(nl);
  return `${fm.bom}${fm.open}${head}${fm.close}${fm.body}`;
}

/** ตัดบล็อก permission ออก — ใช้เทียบว่า "เนื้อหาอื่น" ตรงกันหรือไม่ (กัน stale ปลอม) */
export function stripFrontmatterPermission(text) {
  const fm = splitFrontmatter(text);
  if (!fm) return String(text ?? '');
  const nl = fm.open.includes('\r\n') ? '\r\n' : '\n';
  const yaml = setYamlPermission(fm.yaml, {})
    .split('\n')
    .filter((l) => !/^permission\s*:/.test(l))
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
  return `${fm.bom}${fm.open}${yaml}${fm.close}${fm.body}`;
}

/** permission ที่ประกาศอยู่ในไฟล์ (ใช้รายงาน "ไฟล์บังคับอะไร") */
export function getFrontmatterPermission(text) {
  const fm = splitFrontmatter(text);
  if (!fm) return {};
  const out = {};
  let inPerm = false;
  for (const raw of fm.yaml.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indented = /^\s+/.test(raw);
    const m = /^\s*([A-Za-z0-9_-]+):\s*(.*)$/.exec(raw);
    if (!m) continue;
    const [, k, vRaw] = m;
    const v = vRaw.trim().replace(/^["']|["']$/g, '');
    if (!indented) inPerm = k === 'permission';
    else if (inPerm) out[k] = v;
  }
  return out;
}
