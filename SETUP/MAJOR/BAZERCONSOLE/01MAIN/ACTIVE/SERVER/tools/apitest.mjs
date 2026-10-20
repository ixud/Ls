/**
 * apitest.mjs — integration test ของเซิร์ฟเวอร์ (รันได้เอง: สตาร์ท → ยิง HTTP → ปิด)
 * ใช้ home ปลอมที่มีช่องว่างในชื่อ เพื่อทดสอบ path ของ Windows
 * node tools/apitest.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(__dirname, '..', 'index.mjs');
const PORT = 4477;
const HOME = path.join(os.tmpdir(), 'bazer', 'api test home');
const TOKEN_FILE = path.join(__dirname, '..', '..', 'var', 'token');

let pass = 0;
const fails = [];
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fails.push(name); console.error(`FAIL  ${name}${extra ? `\n      ${extra}` : ''}`); }
};

fs.rmSync(HOME, { recursive: true, force: true });
fs.mkdirSync(HOME, { recursive: true });

const srv = spawn(process.execPath, [SERVER, `--port=${PORT}`, `--home=${HOME}`, '--no-open'], { stdio: ['ignore', 'pipe', 'pipe'] });
const base = `http://127.0.0.1:${PORT}`;
const token = await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('เซิร์ฟเวอร์ไม่ขึ้นใน 15 วินาที')), 15000);
  srv.stdout.on('data', (b) => {
    const s = b.toString();
    if (s.includes('http://127.0.0.1')) {
      clearTimeout(t);
      resolve(fs.readFileSync(TOKEN_FILE, 'utf8').trim());
    }
  });
  srv.on('exit', (c) => { clearTimeout(t); reject(new Error(`เซิร์ฟเวอร์ออกก่อนกำหนด (code ${c})`)); });
});

const H = { 'content-type': 'application/json', 'x-bazer-token': token };
const get = async (p, headers = {}) => {
  const r = await fetch(base + p, { headers });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ไม่ใช่ JSON */ }
  return { status: r.status, text, json };
};
const post = async (body, headers = H) => {
  const r = await fetch(base + '/api/action', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ไม่ใช่ JSON */ }
  return { status: r.status, text, json };
};

try {
  const s = await get('/api/state');
  check('state ตอบ 200 + มี plan', s.status === 200 && Array.isArray(s.json?.plan?.entries), `status=${s.status}`);
  check('state มี actions/policies/settings ครบ', !!(s.json?.actions?.length && s.json?.policies?.length && s.json?.settings?.groups?.length));

  check('POST ไม่มี token → 403', (await post({ id: 'plan' }, { 'content-type': 'application/json' })).status === 403);
  check('POST token ผิด → 403', (await post({ id: 'plan' }, { 'content-type': 'application/json', 'x-bazer-token': 'deadbeef' })).status === 403);
  check('POST JSON พัง → 400', (await post('{oops')).status === 400);

  const unknown = await post({ id: 'nope-nope' });
  check('action ที่ไม่รู้จัก → ok:false พร้อมข้อความ', unknown.json?.ok === false && /ไม่รู้จัก/.test(unknown.json?.summary || ''));

  const noConfirm = await post({ id: 'policy-set', params: { level: '2' } });
  check('write + popup ที่ไม่ยืนยัน → needsConfirm', noConfirm.json?.needsConfirm === true, JSON.stringify(noConfirm.json).slice(0, 160));

  const badLevel = await post({ id: 'policy-set', params: { level: '99', confirmed: true } });
  check('policy-set ระดับที่ไม่มี → ok:false ไม่ crash', badLevel.json?.ok === false && badLevel.status === 200, badLevel.text.slice(0, 160));

  const badCtl = await post({ id: 'settings-save', params: { confirmed: true, patches: [{ id: 'ไม่มีจริง', value: 'x' }] } });
  check('settings-save control ที่ไม่มี → รายงานรายช่อง', badCtl.json?.settings?.results?.[0]?.ok === false);

  const badStamp = await post({ id: 'rollback', params: { stamp: '19000101-000000', confirmed: true } });
  check('rollback stamp ที่ไม่มี → ok:false', badStamp.json?.ok === false);

  const law = await post({ id: 'law-check' });
  check('law-check ผ่าน', law.json?.ok === true, law.json?.summary);

  const plan = await post({ id: 'plan' });
  check('plan ทำงานบน home ว่าง (มี missing)', plan.json?.ok === true && plan.json.plan.summary.missing > 0, plan.json?.summary);

  const probeEarly = await post({ id: 'probe' });
  check('probe ก่อนติดตั้ง → เตือน ไม่ใช่ fail', probeEarly.json?.ok === true && probeEarly.json?.warn === true, probeEarly.json?.summary);
  const loc = await post({ id: 'plannotator-locate' });
  check('plannotator-locate ไม่เจอ → เตือน ไม่ใช่ error', loc.json?.ok === true && loc.json?.warn === true, loc.json?.summary);
  const selfEarly = await post({ id: 'self-check' });
  check('self-check ก่อนติดตั้ง → เตือน (กฎผ่าน)', selfEarly.json?.warn === true && selfEarly.json?.law?.ok === true, selfEarly.json?.summary);

  const early = await post({ id: 'settings-save', params: { confirmed: true, patches: [{ id: 'pstack.judgment', value: 'a/b' }] } });
  check('บันทึก role ก่อนติดตั้ง → ล้มอย่างสุภาพ (ไม่ throw)', early.json?.ok === false && /template|ไฟล์/.test(JSON.stringify(early.json?.settings || {})), JSON.stringify(early.json?.settings || {}).slice(0, 160));

  const VAR = path.join(__dirname, '..', '..', 'var');
  const stateFile = path.join(VAR, 'state.json');
  const keep = fs.existsSync(stateFile) ? fs.readFileSync(stateFile) : null;
  fs.mkdirSync(VAR, { recursive: true });
  fs.writeFileSync(stateFile, '{ พัง ไม่ใช่ json');
  const corrupt = await get('/api/state');
  check('state.json พัง → เซิร์ฟเวอร์ยังตอบได้', corrupt.status === 200 && Array.isArray(corrupt.json?.plan?.entries));
  if (keep) fs.writeFileSync(stateFile, keep); else fs.rmSync(stateFile, { force: true });

  const histFile = path.join(VAR, 'history.tsv');
  if (fs.existsSync(histFile)) fs.appendFileSync(histFile, 'บรรทัดพังไม่มีแท็บ\n', 'utf8');
  const badHist = await post({ id: 'history-list' });
  check('history.tsv มีบรรทัดพัง → ไม่ crash', badHist.json?.ok === true);

  // --- เคสล้มกลางทาง: วาง "โฟลเดอร์" ทับที่ไฟล์ปลายทาง ทำให้เขียนไม่ได้ ---
  const blocked = path.join(HOME, '.config', 'opencode', 'agents', 'buddha.md');
  fs.mkdirSync(blocked, { recursive: true });
  const failApply = await post({ id: 'apply', params: { confirmed: true } });
  const cfgAfterFail = path.join(HOME, '.config', 'opencode', 'opencode.jsonc');
  check('apply ที่ล้มกลางทาง → ok:false + รายงาน error', failApply.json?.ok === false && (failApply.json?.apply?.errors?.length ?? 0) === 1,
    JSON.stringify(failApply.json?.apply?.errors || []).slice(0, 200));
  check('ล้มกลางทาง → rollback อัตโนมัติ (คืนไฟล์ที่เขียนไปแล้ว)', !!failApply.json?.apply?.rolledBack && !failApply.json.apply.rolledBack.error,
    JSON.stringify(failApply.json?.apply?.rolledBack || {}).slice(0, 200));
  check('rollback ลบไฟล์ที่เพิ่งสร้างในรอบที่ล้ม', !fs.existsSync(cfgAfterFail));
  fs.rmSync(blocked, { recursive: true, force: true });

  // --- binary ต้องไม่ถูกอ่านเป็นข้อความ ---
  const { ROOT } = await import('../env.mjs');
  const { writeEntry } = await import('../apply.mjs');
  const { stamp } = await import('../apply.mjs');
  const binSrcRel = 'BAZERCONSOLE/01MAIN/ACTIVE/var/bintest';
  const binSrc = path.join(ROOT, binSrcRel);
  fs.rmSync(binSrc, { recursive: true, force: true });
  fs.mkdirSync(path.join(binSrc, 'bin'), { recursive: true });
  const binFile = path.join(binSrc, 'bin', 'x.bin');
  fs.writeFileSync(binFile, Buffer.from([0, 1, 2, 255, 254, 0, 65, 66]));
  let binNote = '';
  try {
    writeEntry({ id: 'test.bin', kind: 'skill', title: 'binary', source: binSrcRel, target: '${HOME}/bin-out', strategy: 'copy-tree', owner: 'ours', status: 'ready' }, HOME, stamp());
  } catch (e) { binNote = e.message; }
  const copiedPath = path.join(HOME, 'bin-out', 'bin', 'x.bin');
  const copied = fs.existsSync(copiedPath) ? fs.readFileSync(copiedPath) : Buffer.alloc(0);
  check('copy-tree ไฟล์ไบนารีไม่เพี้ยน (bytes เดิม)', copied.length > 0 && Buffer.compare(copied, fs.readFileSync(binFile)) === 0, binNote);
  fs.rmSync(binSrc, { recursive: true, force: true });

  const install = await post({ id: 'install-tools', params: {} });
  check('install-tools dry-run ไม่รันอะไร', install.json?.ok === true && install.json.applied === false, install.json?.summary);

  const apply1 = await post({ id: 'apply', params: { confirmed: true } });
  const applied1 = apply1.json?.apply?.applied?.length ?? 0;
  check('apply ครั้งแรกเขียนจริง', applied1 > 0, `applied=${applied1} errors=${JSON.stringify(apply1.json?.apply?.errors || []).slice(0, 200)}`);

  const apply2 = await post({ id: 'apply', params: { confirmed: true } });
  check('apply ครั้งที่สองไม่เขียนซ้ำ (idempotent)', (apply2.json?.apply?.applied?.length ?? -1) === 0, `applied=${apply2.json?.apply?.applied?.length}`);

  const hist = await post({ id: 'history-list' });
  check('history มีรายการหลัง apply', (hist.json?.history?.length ?? 0) > 0);

  const kb = await post({ id: 'settings-save', params: { confirmed: true, patches: [{ id: 'keybind.copy', value: ['ctrl+alt+m', 'ctrl+alt+o'] }] } });
  const tuiRaw = fs.readFileSync(path.join(HOME, '.config', 'opencode', 'tui.json'), 'utf8');
  const tui = JSON.parse(tuiRaw.replace(/^\uFEFF/, '').replace(/\/\/.*$/gm, ''));
  check('คีย์ลัดถูกเขียนเป็น array (ไม่ใช่สตริง)', kb.json?.ok === true && Array.isArray(tui.keybinds.messages_copy), JSON.stringify(tui.keybinds));

  // --- full settings: เขียนทับทั้งไฟล์ ---
  const tuiPath = path.join(HOME, '.config', 'opencode', 'tui.json');
  const fullText = '{\n  "$schema": "https://opencode.ai/tui.json",\n  "keybinds": { "messages_copy": ["ctrl+x"] },\n  "theme": "old"\n}';
  const fullOk = await post({ id: 'settings-full', params: { confirmed: true, file: 'tui', content: fullText } });
  const tuiAfter = fs.readFileSync(tuiPath, 'utf8');
  check('settings-full เขียนทับทั้งไฟล์ (ค่าที่ไม่อยู่ในเนื้อหาหาย)', fullOk.json?.ok === true && tuiAfter.includes('"ctrl+x"') && !tuiAfter.includes('ctrl+alt+m'));
  const beforeBad = fs.readFileSync(tuiPath, 'utf8');
  const fullBad = await post({ id: 'settings-full', params: { confirmed: true, file: 'tui', content: '{oops' } });
  check('settings-full JSON พัง → ไม่เขียนทับ', fullBad.json?.ok === false && fs.readFileSync(tuiPath, 'utf8') === beforeBad);

  const icon = await fetch(base + '/icon.ico');
  const iconBuf = Buffer.from(await icon.arrayBuffer());
  check('favicon/logo เสิร์ฟ .ico จริง', icon.status === 200 && (icon.headers.get('content-type') || '').includes('image/x-icon') && iconBuf[0] === 0 && iconBuf[1] === 0 && iconBuf[2] === 1 && iconBuf[3] === 0);

  // --- Plannotator: แพตช์ token switchTo ---
  const plDir = path.join(HOME, '.cache', 'opencode', 'npm', 'plannotator');
  fs.mkdirSync(plDir, { recursive: true });
  const plFile = path.join(plDir, 'app.html');
  fs.writeFileSync(plFile, 'const a={switchTo:"build"};', 'utf8');
  const plDry = await post({ id: 'plannotator-patch', params: { target: 'buddha' } });
  check('plannotator-patch dry-run เห็นไฟล์', plDry.json?.ok === true && (plDry.json.patch?.todo ?? 0) === 1, JSON.stringify(plDry.json?.patch || {}).slice(0, 160));
  const plGo = await post({ id: 'plannotator-patch', params: { confirmed: true, target: 'buddha', apply: true } });
  check('plannotator-patch เขียน token เป็น buddha', plGo.json?.ok === true && fs.readFileSync(plFile, 'utf8').includes('switchTo:"buddha"'), JSON.stringify(plGo.json).slice(0, 200));
  const plAgain = await post({ id: 'plannotator-patch', params: { confirmed: true, target: 'buddha', apply: true } });
  check('plannotator-patch รันซ้ำไม่เปลี่ยนอะไร', plAgain.json?.ok === true && (plAgain.json.patch?.changed?.length ?? -1) === 0);

  const role = await post({ id: 'settings-save', params: { confirmed: true, patches: [{ id: 'pstack.judgment', value: 'x/y-z' }] } });
  const models = fs.readFileSync(path.join(HOME, '.agents', 'pstack-models.md'), 'utf8');
  check('บันทึก role ของ PSTACK ลงไฟล์บรรทัดเดียวได้', role.json?.ok === true && /^judgment and prose: x\/y-z$/m.test(models));

  const policy = await post({ id: 'policy-set', params: { level: '3', confirmed: true } });
  const cfgText = fs.readFileSync(path.join(HOME, '.config', 'opencode', 'opencode.jsonc'), 'utf8');
  check('policy-set เขียน permission ระดับ 3 ลง config', policy.json?.ok === true && /webfetch/.test(cfgText) && /external_directory/.test(cfgText));

  // --- reset template: ไฟล์ระบบรุ่นเก่าค้าง (เช่น AGENTS.md) ---
  const agentsMd = path.join(HOME, '.config', 'opencode', 'AGENTS.md');
  fs.appendFileSync(agentsMd, '\n<!-- OLD-RULE: ต้องอยู่ครบ 7 เฟส -->\n', 'utf8');
  const reset = await post({ id: 'reset-template', params: { id: 'tpl.agents-md', confirmed: true } });
  const afterReset = fs.readFileSync(agentsMd, 'utf8');
  check('reset-template เขียนทับไฟล์เก่าด้วยแม่แบบใหม่', reset.json?.ok === true && !afterReset.includes('OLD-RULE') && afterReset.includes('BAZER-MAJOR'));
  const resetBad = await post({ id: 'reset-template', params: { id: 'agent.buddha', confirmed: true } });
  check('reset-template ปฏิเสธ entry ที่ไม่ใช่ template', resetBad.json?.ok === false);

  // --- cleanup: ของเก่า → quarantine ---
  const cfgPath = path.join(HOME, '.config', 'opencode', 'opencode.jsonc');
  const oldAgent = path.join(HOME, '.config', 'opencode', 'agents', 'old-thing.md');
  const oldDisabled = path.join(HOME, '.config', 'opencode', 'agents', 'old-thing.md.disabled');
  const oldMirror = path.join(HOME, '.agents', 'skills', 'BAZERs-EXTENSION-Old', 'SKILL.md');
  const oldPluginDir = path.join(HOME, '.config', 'opencode', 'plugins', 'bazer-flow');
  fs.writeFileSync(oldAgent, '# old', 'utf8');
  fs.writeFileSync(oldDisabled, '# old disabled', 'utf8');
  fs.mkdirSync(path.dirname(oldMirror), { recursive: true });
  fs.writeFileSync(oldMirror, '# old mirror', 'utf8');
  fs.mkdirSync(oldPluginDir, { recursive: true });
  fs.writeFileSync(path.join(oldPluginDir, 'index.ts'), '// old plugin', 'utf8');
  const { setAtPath } = await import('../jsonc.mjs');
  fs.writeFileSync(cfgPath, setAtPath(fs.readFileSync(cfgPath, 'utf8'), ['plugins'], ['./plugins/bazer-flow']), 'utf8');

  const st1 = await get('/api/state');
  const g = (id) => st1.json.cleanup.groups.find((x) => x.id === id)?.count ?? 0;
  check('cleanup เห็นของเก่าครบ 4 กลุ่ม', g('agents') >= 2 && g('mirrors') >= 1 && g('plugins') === 1 && g('plugin-dirs') >= 1,
    JSON.stringify(st1.json.cleanup.groups.map((x) => [x.id, x.count])));

  const dry = await post({ id: 'cleanup-old', params: { apply: false } });
  check('cleanup dry-run ไม่ย้ายอะไร', dry.json?.ok === true && dry.json.cleanup.moved === undefined && fs.existsSync(oldAgent));

  const done = await post({ id: 'cleanup-old', params: { apply: true, groups: ['agents', 'mirrors', 'plugins', 'plugin-dirs'], confirmed: true } });
  const q = done.json?.cleanup?.quarantine;
  check('cleanup ย้ายของเก่าแล้ว', done.json?.ok === true && (done.json.cleanup.moved?.length ?? 0) >= 3, JSON.stringify(done.json?.cleanup?.moved || []).slice(0, 200));
  check('ของเก่าหายจากที่เดิม', !fs.existsSync(oldAgent) && !fs.existsSync(oldDisabled) && !fs.existsSync(path.dirname(oldMirror)) && !fs.existsSync(oldPluginDir));
  check('ปลั๊กอินเก่าถูกถอดจาก config', !fs.readFileSync(cfgPath, 'utf8').includes('bazer-flow'));
  check('quarantine มี manifest', !!(q && fs.existsSync(path.join(q, 'quarantine.json'))));

  const st2 = await get('/api/state');
  check('หลัง cleanup: ไม่เหลือของเก่าในกลุ่มที่เลือก', st2.json.cleanup.groups.filter((x) => ['agents', 'mirrors', 'plugins', 'plugin-dirs'].includes(x.id)).every((x) => x.count === 0));

  const diff = await get('/api/diff?entry=agent.buddha');
  check('diff ของ entry ที่มีอยู่ → 200', diff.status === 200 && typeof diff.json?.after === 'string');
  check('diff ของ entry ที่ไม่มี → 400', (await get('/api/diff?entry=zzz')).status === 400);

  const html = await get('/');
  check('หน้าแรกฉีด token จริง (ไม่เหลือ __TOKEN__)', html.status === 200 && html.text.includes('bazer-token') && !html.text.includes('__TOKEN__'));
  check('app.js โหลดได้', (await get('/app.js')).status === 200);
  check('/../ อ่านไฟล์นอก UI ไม่ได้', (await get('/../README.md')).status !== 200 || !(await get('/../README.md')).text.includes('MAJOR'));
  check('ไฟล์ที่ไม่มี → 404', (await get('/nope.css')).status === 404);

  const finalState = await get('/api/state');
  check('หลัง apply: doctors/blockers สะอาด', (finalState.json?.plan?.blockers?.length ?? 1) === 0, JSON.stringify(finalState.json?.plan?.blockers || []).slice(0, 200));
  check('หลัง apply: ไม่มี stale ที่ auto=true', (finalState.json?.plan?.entries || []).filter((e) => e.auto && e.writable).length === 0);
} catch (e) {
  fails.push(`exception: ${e.message}`);
  console.error('EXCEPTION', e);
} finally {
  srv.kill();
  await new Promise((r) => setTimeout(r, 300));
  fs.rmSync(HOME, { recursive: true, force: true });
}

console.log(`\n${pass} passed${fails.length ? ` · ${fails.length} FAILED` : ''}`);
if (fails.length) process.exitCode = 1;
