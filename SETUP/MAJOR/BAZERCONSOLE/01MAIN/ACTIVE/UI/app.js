(() => {
  'use strict';
  const TOKEN = document.querySelector('meta[name="bazer-token"]').content;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const STATE_TH = { ok: 'ตรง', stale: 'ต้องอัพเดต', missing: 'ยังไม่มี', broken: 'ไม่ทำงาน', design: 'ยังไม่พร้อม', raw: 'raw', foreign: 'ไม่รู้จัก' };
  const RISK_TH = { 1: 'ปลอดภัยมาก', 2: 'ดูเหมือนปลอดภัย', 3: 'ไม่ปลอดภัย' };
  const MODE_COLORS = { buddha: '#EB895B', bazer: '#D9480F', snack: '#40E0D0', advisor: '#B26BFF' };
  const MODE_ROLE = {
    buddha: 'วางแผน Arena → GATE 1 → Arena ในเซสชัน → GATE 2 → สร้างในเซสชัน',
    bazer: 'แผนเดียว → GATE → แก้เฉพาะไฟล์ที่ระบุพาธ',
    snack: 'ถามเร็วตอบเร็ว อ่านได้เฉพาะพาธที่ระบุ แก้ไม่ได้',
    advisor: 'คุยจากบริบทในแชต อ่าน/แก้ไม่ได้เลย',
  };

  let S = null, TAB = 'overview', FILE_SUB = 'all', SET_SUB = 'full', DRAFTS = {}, BUSY = false, PALETTE_SEL = 0, PALETTE_ITEMS = [];
  let MODELS = { ok: false, models: [], providers: [], error: '' };

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      ...opts,
      headers: { 'x-bazer-token': TOKEN, 'content-type': 'application/json', ...(opts.headers || {}) },
    });
    return res.json();
  }

  /* ---------------- chrome ---------------- */
  function toast(title, msg, kind = 'ok') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `<strong>${esc(title)}</strong>${esc(msg)}`;
    $('#toasts').append(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(18px)'; }, 4200);
    setTimeout(() => el.remove(), 4600);
  }

  function openModal({ title, body, foot = '' }) {
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = body;
    $('#modalFoot').innerHTML = foot;
    $('#modalRoot').hidden = false;
  }
  const closeModal = () => { $('#modalRoot').hidden = true; };

  function riskBadge(level, why, withWhy = true) {
    return `<span class="risk l${level}">${RISK_TH[level]}</span>${withWhy && why ? `<span class="risk-why">${esc(why)}</span>` : ''}`;
  }
  const badge = (st) => `<span class="badge ${st}">${STATE_TH[st] || st}</span>`;

  function confirmSheet({ title, risk, body, confirmText = 'ยืนยัน', onConfirm }) {
    openModal({
      title,
      body: `<div class="cols">
        <div>${body}</div>
        <div class="card" style="margin:0">${riskBadge(risk.level, risk.why)}</div>
      </div>`,
      foot: `<button class="btn ghost" data-close="1">ยกเลิก</button><button class="btn primary" id="confirmGo">${esc(confirmText)}</button>`,
    });
    $('#confirmGo').onclick = () => { closeModal(); onConfirm(); };
  }

  /* ---------------- data ---------------- */
  async function load(withProbes = false) {
    // state กับ models โหลดพร้อมกัน — models พังต้องไม่ทำให้หน้าโหลดไม่ขึ้น
    const [stateRes, modelsRes] = await Promise.allSettled([
      api(`/api/state${withProbes ? '?probes=1' : ''}`),
      api('/api/models'),
    ]);
    if (stateRes.status === 'rejected') {
      toast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', stateRes.reason?.message || String(stateRes.reason), 'err');
      return;
    }
    S = stateRes.value;
    if (!S || !S.plan) {
      toast('อ่านสถานะไม่ได้', S?.error || 'ผลตอบกลับไม่ครบ', 'err');
      return;
    }
    const mr = modelsRes.status === 'fulfilled' ? modelsRes.value : null;
    MODELS = {
      ok: !!(mr && mr.ok),
      models: Array.isArray(mr?.models) ? mr.models : [],
      providers: Array.isArray(mr?.providers) ? mr.providers : [],
      error: mr?.error || (modelsRes.status === 'rejected' ? modelsRes.reason?.message || 'โหลดรายชื่อโมเดลไม่ได้' : ''),
    };
    DRAFTS = {};
    render();
  }

  async function act(id, params = {}, { confirmed = false } = {}) {
    if (BUSY) return toast('รอสักครู่', 'มีงานกำลังทำอยู่', 'err');
    const meta = S.actions.find((a) => a.id === id);
    if (meta?.kind === 'write' && meta.confirm === 'popup' && !confirmed) {
      return confirmSheet({
        title: meta.title,
        risk: meta.risk,
        body: `<p>${esc(meta.subtitle || '')}</p><p class="mono muted">${esc(id)}</p>`,
        onConfirm: () => act(id, params, { confirmed: true }),
      });
    }
    BUSY = true;
    document.body.classList.add('busy');
    try {
      const r = await api('/api/action', { method: 'POST', body: JSON.stringify({ id, params: { ...params, confirmed: true } }) });
      const kind = r.ok ? (r.warn ? 'warn' : 'ok') : 'err';
      const label = r.ok ? (r.warn ? 'ยังไม่พร้อม' : 'สำเร็จ') : 'ไม่สำเร็จ';
      toast(label, r.summary || '', kind);
      if (r.law) S.law = r.law;
      await load(id === 'probe' || id === 'self-check');
    } catch (e) {
      toast('ผิดพลาด', e.message, 'err');
    } finally {
      BUSY = false;
      document.body.classList.remove('busy');
    }
  }

  /* ---------------- models ---------------- */
  function ensureModelDatalist() {
    let dl = $('#bazer-models');
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = 'bazer-models';
      document.body.append(dl);
    }
    dl.innerHTML = (MODELS.models || [])
      .map((m) => `<option value="${esc(m.id)}" label="${esc(m.label || m.id)}"></option>`)
      .join('');
    return dl;
  }

  function modelHint() {
    if (MODELS.ok) {
      return `รายชื่อโมเดลจริง: ${MODELS.models.length} รายการ จาก ${MODELS.providers.length} provider — พิมพ์เองได้ถ้าไม่พบในรายการ`;
    }
    return `โหลดรายชื่อโมเดลไม่ได้${MODELS.error ? ` (${MODELS.error})` : ''} — ช่องโมเดลยังพิมพ์เองได้`;
  }

  /* ---------------- render ---------------- */
  function render() {
    try {
      ensureModelDatalist();
      renderHeader();
      renderOverview();
      renderQuick();
      renderModes();
      renderFiles();
      renderSettings();
      renderHistory();
      showTab(TAB);
    } catch (e) {
      console.error(e);
      toast('หน้าจอเรนเดอร์ไม่สำเร็จ', e.message, 'err');
    }
  }

  function renderHeader() {
    const p = S.plan;
    const todo = p.summary.missing + p.summary.stale;
    $('#subtitle').textContent = `${S.app.platform} · node ${S.app.node} · ${S.app.root}`;
    $('#cmdBtn').textContent = S.app.platform === 'darwin' ? '⌘ K' : 'Ctrl K';
    const ladder = S.policies.find((x) => x.mode === 'buddha') || S.policies[0];
    const pol = S.policyState?.policyId === ladder.id
      ? ladder.levels.find((l) => String(l.id) === String(S.policyState.level))
      : ladder.levels.find((l) => String(l.id) === String(ladder.defaultLevel));
    $('#statusStrip').innerHTML = [
      `<span class="pill ${todo ? 'warn' : 'ok'}"><span class="dot"></span>ต้องทำ <b>${todo}</b></span>`,
      `<span class="pill ${p.summary.broken ? 'bad' : 'ok'}"><span class="dot"></span>ไม่ทำงาน <b>${p.summary.broken}</b></span>`,
      `<span class="pill ${S.law.ok ? 'ok' : 'bad'}"><span class="dot"></span>กฎ <b>${S.law.ok ? 'ผ่าน' : 'ไม่ผ่าน'}</b></span>`,
      `<span class="pill"><span class="dot" style="background:var(--buddha)"></span>BUDDHA <b>${esc(pol?.name || '-')}</b></span>`,
    ].join('');
  }

  function actionCard(a) {
    const cls = a.kind === 'write' ? 'danger' : '';
    return `<div class="card">
      <h3>${esc(a.title)}</h3>
      <p>${esc(a.subtitle || '')}</p>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn ${cls}" data-act="${esc(a.id)}">${esc(a.cta || 'ทำ')}</button>
        ${riskBadge(a.risk.level, a.risk.why)}
      </div>
    </div>`;
  }

  function lawCard(r) {
    return `<div class="card">
      <div class="row" style="justify-content:space-between"><h3>${esc(r.id)} · ${esc(r.title)}</h3><span class="badge ${r.ok ? 'ok' : 'broken'}">${r.ok ? 'ผ่าน' : 'ไม่ผ่าน'}</span></div>
      ${r.details?.length ? `<ul class="small muted" style="margin:8px 0 0 16px">${r.details.slice(0, 6).map((d) => `<li class="mono">${esc(d)}</li>`).join('')}${r.more ? `<li>… อีก ${r.more}</li>` : ''}</ul>` : ''}
    </div>`;
  }

  function renderOverview() {
    const p = S.plan;
    const wired = new Set(['policy-set', 'policy-undo', 'settings-save', 'settings-full', 'pstack-preset', 'rollback', 'apply', 'builtin-toggle', 'retire-old-flow', 'history-list', 'probe', 'plannotator-patch', 'plannotator-locate', 'cleanup-plan', 'cleanup-old', 'reset-template', 'lock-restore']);
    const heroIds = new Set(['self-check', 'plan', 'apply']);
    const hero = [...heroIds].map((id) => S.actions.find((a) => a.id === id)).filter(Boolean);
    const acts = S.actions.filter((a) => (a.group === 'overview' || !wired.has(a.id)) && !heroIds.has(a.id));
    const probeRows = S.probes ? S.probes.results.map((r) => `<tr>
        <td>${esc(r.title)}</td><td>${r.ok ? '<span class="badge ok">ผ่าน</span>' : `<span class="badge ${r.severity === 'fail' ? 'missing' : 'stale'}">${r.severity === 'fail' ? 'ตก' : 'เตือน'}</span>`}</td>
        <td class="mono muted">${esc(r.detail || '')}</td></tr>`).join('') : '';

    $('#view-overview').innerHTML = `
      <div class="card" style="border-color:rgba(235,137,91,0.38)">
        <div class="btn-row">
          ${hero.map((a) => `<button class="btn ${a.id === 'apply' ? 'primary' : ''}" data-act="${esc(a.id)}">${esc(a.cta || a.title)}</button>`).join('')}
        </div>
        <p class="hint" style="margin-top:10px">${p.summary.missing + p.summary.stale > 0
          ? `ยังมี ${p.summary.missing + p.summary.stale} รายการที่ไม่ตรงกับ MAJOR — กด “ติดตั้ง / อัพเดตทั้งหมด” (backup ทุกไฟล์)`
          : 'ทุกอย่างตรงกับ MAJOR แล้ว — กด “ตรวจของจริง” เพื่อยืนยันว่า OpenCode อ่านค่าจริง'}</p>
      </div>
      <div class="grid c4" style="margin-top:12px">
        <div class="card"><p>ต้องติดตั้ง</p><div class="big" style="color:var(--bad)">${p.summary.missing}</div></div>
        <div class="card"><p>ต้องอัพเดต</p><div class="big" style="color:var(--warn)">${p.summary.stale}</div></div>
        <div class="card"><p>ไม่ทำงาน</p><div class="big" style="color:var(--bad)">${p.summary.broken}</div></div>
        <div class="card"><p>ของนอก manifest</p><div class="big">${p.foreignTotal}</div></div>
      </div>
      ${p.blockers.length ? `<h2 class="section">ตัวที่ทำให้ยังกดติดตั้งไม่ได้</h2><div class="card"><ul class="small">${p.blockers.map((b) => `<li class="mono">${esc(b)}</li>`).join('')}</ul></div>` : ''}
      ${(S.drift || []).length ? `<h2 class="section">ค่าถูกเปลี่ยนหลังล็อก</h2><div class="card"><ul class="small">${S.drift.map((d) => `<li><strong>${esc(d.mode)}</strong>: ตั้งไว้ <code>${esc(d.was.model || '-')}/${esc(d.was.variant || '-')}</code> แต่ตอนนี้ <code>${esc(d.now.model || '-')}/${esc(d.now.variant || '-')}</code></li>`).join('')}</ul><div class="btn-row" style="margin-top:10px"><button class="btn primary" data-act="lock-restore">ล็อกคืนตาม snapshot</button></div></div>` : ''}
      <h2 class="section">เครื่องมืออื่น</h2>
      <div class="grid c3">${acts.map(actionCard).join('')}</div><h2 class="section">กฎ 4 ข้อ</h2>
      <div class="grid c2">${S.law.rules.map(lawCard).join('')}</div>
      <h2 class="section">ของจริง (probe)</h2>
      <div class="card">
        ${S.probes ? `<table><thead><tr><th>ข้อ</th><th>ผล</th><th>รายละเอียด</th></tr></thead><tbody>${probeRows}</tbody></table>` : '<p>ยังไม่ได้รัน probe ในหน้านี้</p>'}
        <div class="btn-row" style="margin-top:12px"><button class="btn" data-act="probe">รัน probe เดี๋ยวนี้</button></div>
      </div>`;
  }

  function renderModes() {
    const agents = S.plan.entries.filter((e) => e.kind === 'agent');
    const ladder = S.policies.find((x) => x.mode === 'buddha') || S.policies[0];
    const cur = S.policyState?.policyId === ladder.id ? String(S.policyState.level) : String(ladder.defaultLevel);
    const arenaCtl = S.settings.groups.find((g) => g.id === 'arena').controls;

    const modeCards = agents.map((e) => {
      const key = e.id.split('.').pop();
      return `<div class="card mode-card ${key}">
        <h3><span class="mode-dot" style="background:${MODE_COLORS[key] || '#999'}"></span>${esc(e.title.replace('โหมด ', ''))}</h3>
        <p>${esc(MODE_ROLE[key] || '')}</p>
        <div class="btn-row" style="margin-top:10px">${badge(e.state)}<span class="mono muted small">${esc(e.target || '')}</span></div>
      </div>`;
    }).join('');

    $('#view-modes').innerHTML = `
      <h2 class="section">โหมดหลัก</h2>
      <div class="grid c2">${modeCards}</div>

      <h2 class="section">บันไดเหมาเข่ง · BUDDHA เท่านั้น</h2>
      <div class="card">
        <p class="muted">กดขั้นที่ต้องการ → ยืนยัน → เขียนค่าลง <code>opencode.jsonc</code> ทันที (ไม่ต้องกดอัพเดตอีกที) · มีผลกับ session ใหม่</p>
        <div class="ladder" style="margin-top:12px">
          ${ladder.levels.map((l) => `<div class="step ${String(l.id) === cur ? 'active' : ''}" data-ladder="${esc(l.id)}">
            <div class="num">${esc(l.id)}</div>
            <div><div class="name">${esc(l.name)} <span class="tag">· ${esc(l.tagline || '')}</span></div><span class="risk-why">${esc(l.why)}</span></div>
            <div>${riskBadge(l.risk)}</div>
          </div>`).join('')}
        </div>
        <div class="btn-row" style="margin-top:12px">
          <button class="btn ghost" data-act="policy-undo">ย้อนระดับก่อนหน้า</button>
          ${badge(S.policyState ? 'ok' : 'design')}<span class="small muted">ตอนนี้: ${esc(ladder.levels.find((l) => String(l.id) === cur)?.name || '-')}</span>
        </div>
      </div>

      <h2 class="section">โมเดล &amp; Effort ของ ARENA</h2>
      <div class="card">
        <div class="arena-bar">
          ${arenaCtl.map((c) => `<div class="field"><label>${esc(c.label)}</label>
            <input data-draft="${esc(c.id)}" ${c.type === 'model-list' ? 'data-list="1"' : ''} ${['model', 'model-list'].includes(c.type) ? 'list="bazer-models"' : ''} value="${esc(DRAFTS[c.id] ?? S.settingsValues[c.id] ?? '')}" placeholder="${esc(c.placeholder || '')}" />
            ${riskBadge(c.risk.level, c.risk.why, false)}</div>`).join('')}
          <button class="btn primary" data-save-group="arena">บันทึก ARENA</button>
        </div>
        <p class="hint">เขียนลง <code>${esc('~/.agents/pstack-models.md')}</code> — ใช้ร่วมกับ Arena ใน BUDDHA</p>
        <p class="hint">${esc(modelHint())}</p>
      </div>

      <h2 class="section">ปุ่มอนุมัติ Plannotator</h2>
      <div class="card">
        <p class="muted">กำหนดว่าหลังกดอนุมัติแล้วจะกลับไปโหมดไหน — เขียนลงไฟล์ของปลั๊กอิน (ต้องติดตั้ง Plannotator ก่อน)</p>
        <div class="btn-row" style="margin-top:10px">
          <button class="btn ghost" data-act="plannotator-locate">ตรวจหาไฟล์</button>
          <button class="btn" data-patch="buddha">แพตช์ → BUDDHA</button>
          <button class="btn" data-patch="bazer">แพตช์ → BAZER</button>
        </div>
        <p class="hint">ข้อจำกัด: ปุ่มของ Plannotator เป็นปุ่มเดียว (global) — เลือกได้ว่ากลับโหมดไหน; ถ้าต้องการสลับตามผู้เรียกอัตโนมัติ ต้องรอ Plannotator รองรับ per-agent (PLANNOTATOR จะรายงานถ้าปุ่มชี้ผิดโหมด)</p>
      </div>

      <h2 class="section">โหมดที่มากับ OpenCode</h2>
      <div class="grid c2">
        <div class="card"><h3>Plan &amp; Build</h3><p>ซ่อนด้วย config (ไม่ลบไฟล์) — ย้อนกลับได้ทุกเมื่อ</p>
          <div class="btn-row" style="margin-top:10px">
            <button class="btn" data-act="builtin-toggle" data-params='{"mode":"off"}'>ซ่อน</button>
            <button class="btn ghost" data-act="builtin-toggle" data-params='{"mode":"on"}'>คืนค่า</button>
          </div></div>
        <div class="card"><h3>ปลั๊กอินเก่า bazer-flow</h3><p>ถอดออกจาก config เมื่อติดตั้งชุดใหม่เสร็จแล้วเท่านั้น</p>
          <div class="btn-row" style="margin-top:10px"><button class="btn danger" data-act="retire-old-flow">ถอด</button></div></div>
      </div>`;
  }

  function entryRow(e) {
    const canApply = ['missing', 'stale'].includes(e.state) && e.writable;
    const canReset = e.strategy === 'template-once';
    return `<tr>
      <td><div><strong>${esc(e.title)}</strong></div><div class="mono muted small">${esc(e.id)}</div></td>
      <td>${badge(e.state)}</td>
      <td class="mono small muted">${esc(e.target || '')}</td>
      <td class="small muted">${esc(e.note || '')}</td>
      <td style="white-space:nowrap">
        <button class="btn tiny ghost" data-diff="${esc(e.id)}">ดู diff</button>
        ${canApply ? `<button class="btn tiny" data-apply-one="${esc(e.id)}">ติดตั้ง</button>` : ''}
        ${canReset ? `<button class="btn tiny danger" data-reset="${esc(e.id)}">รีเซ็ต</button>` : ''}
      </td></tr>`;
  }

  function renderCleanup() {
    const c = S.cleanup;
    if (!c) return '<div class="empty">ยังไม่มีข้อมูล — กด ตรวจใหม่</div>';
    const total = c.groups.reduce((a, g) => a + g.count, 0);
    if (!total) return '<div class="empty">สะอาดแล้ว — ไม่มีของเก่าที่ไม่ใช่ของ MAJOR</div>';
    const defaultOn = new Set(['agents', 'mirrors', 'plugins', 'plugin-dirs']);
    return `<div class="card">
      <h3>เคลียร์ของเก่า</h3>
      <p>ย้ายออกจากโฟลเดอร์ระบบไปเก็บที่ <code>ACTIVE/var/quarantine/&lt;เวลา&gt;</code> — ไม่ได้ลบทิ้ง กู้คืนได้</p>
      <table style="margin-top:12px">
        <thead><tr><th>เลือก</th><th>กลุ่ม</th><th>จำนวน</th><th>รายการ</th></tr></thead>
        <tbody>${c.groups.map((g) => `<tr>
          <td><input type="checkbox" data-clean-group="${esc(g.id)}" ${defaultOn.has(g.id) && g.count ? 'checked' : ''} ${g.count ? '' : 'disabled'} style="width:auto"></td>
          <td><strong>${esc(g.title)}</strong><div class="hint">${esc(g.hint || '')}</div></td>
          <td>${g.count}</td>
          <td class="mono small muted">${g.items.slice(0, 8).map((i) => esc(i.name)).join('<br>')}${g.count > 8 ? `<br>… อีก ${g.count - 8}` : ''}</td>
        </tr>`).join('')}</tbody>
      </table>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn danger" id="cleanupGo">ย้ายของเก่าไป quarantine</button>
        <button class="btn ghost" data-act="cleanup-plan">ตรวจใหม่</button>
      </div>
    </div>`;
  }

  function renderFiles() {
    const all = S.plan.entries;
    const rows = FILE_SUB === 'pstack' ? all.filter((e) => e.kind === 'skill')
      : FILE_SUB === 'bazer' ? all.filter((e) => e.kind === 'skill' && /03SKILLS[\\/]BAZER/i.test(S.manifest.entries.find((m) => m.id === e.id)?.source || ''))
      : all;
    const oldTotal = (S.cleanup?.groups || []).reduce((a, g) => a + g.count, 0);

    $('#view-files').innerHTML = `
      <div class="subtabs">
        ${[['all', 'ทั้งหมด'], ['pstack', 'PSTACK'], ['bazer', 'BAZER'], ['foreign', `ของเก่า (${oldTotal})`]]
          .map(([k, t]) => `<button data-filesub="${k}" class="${FILE_SUB === k ? 'active' : ''}">${t}</button>`).join('')}
      </div>
      ${FILE_SUB === 'foreign'
        ? renderCleanup()
        : `<div class="card"><table><thead><tr><th>รายการ</th><th>สถานะ</th><th>ปลายทาง</th><th>หมายเหตุ</th><th></th></tr></thead><tbody>${rows.map(entryRow).join('')}</tbody></table></div>`}
      ${FILE_SUB === 'bazer' ? '<div class="empty" style="margin-top:12px">03SKILLS/BAZER ยังว่างโดยเจตนา — เติมเมื่อมี skill ของเราเอง</div>' : ''}`;
  }

  function controlField(c) {
    const v = DRAFTS[c.id] ?? S.settingsValues[c.id] ?? '';
    const isModel = c.type === 'model' || c.type === 'model-list';
    const isList = c.type === 'keybind-list' || c.type === 'model-list';
    const input = c.type === 'select'
      ? `<select data-draft="${esc(c.id)}">${(c.options || []).map((o) => `<option value="${esc(o)}" ${String(o) === String(v) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
      : c.type === 'toggle'
        ? `<label class="small"><input type="checkbox" data-draft="${esc(c.id)}" ${v ? 'checked' : ''} style="width:auto"> เปิด</label>`
        : `<input data-draft="${esc(c.id)}" ${isList ? 'data-list="1"' : ''} ${isModel ? 'list="bazer-models"' : ''} value="${esc(Array.isArray(v) ? v.join(', ') : v)}" placeholder="${esc(c.placeholder || '')}" type="${c.type === 'number' ? 'number' : 'text'}" />`;
    return `<div class="field"><label>${esc(c.label)}</label>${input}${riskBadge(c.risk.level, c.risk.why)}</div>`;
  }

  function renderQuick() {
    const group = S.settings.groups.find((g) => g.id === 'quick');
    if (!group) { $('#view-quick').innerHTML = '<div class="empty">ไม่พบกลุ่ม Quick Access ใน settings.json</div>'; return; }
    $('#view-quick').innerHTML = `
      <div class="card">
        <h3>${esc(group.title)}</h3>
        <p>${esc(group.subtitle || '')}</p>
        <div class="grid c2" style="margin-top:12px">${group.controls.map(controlField).join('')}</div>
        <div class="btn-row" style="margin-top:14px">
          <button class="btn primary" data-save-group="quick">บันทึกเฉพาะช่องที่แก้</button>
          <button class="btn ghost" data-reload="1">โหลดค่าใหม่</button>
        </div>
        <p class="hint" style="margin-top:10px">Quick Access แก้เฉพาะคีย์ที่เปลี่ยน — ถ้าต้องแก้ทั้งไฟล์ ไปที่ <strong>ตั้งค่า → การตั้งค่าฉบับเต็ม</strong></p>
        <p class="hint">${esc(modelHint())}</p>
      </div>`;
  }

  function renderSettings() {
    const full = S.settings.full;
    const ps = S.settings.pstack;
    const other = S.settings.groups.find((g) => g.id === 'other');
    const pstackRows = ps.roles.map((r) => `<tr>
        <td class="mono small">${esc(r.line)}</td>
        <td><input data-draft="pstack.${esc(r.id)}" data-list="1" list="bazer-models" value="${esc(DRAFTS[`pstack.${r.id}`] ?? S.settingsValues[`pstack.${r.id}`] ?? r.default ?? '')}" /></td>
      </tr>`).join('');
    const editors = (full?.files || []).map((f) => {
      const raw = (S.rawSettings || {})[f.id] || { text: '', file: '', exists: false };
      return `<div class="card" style="margin-top:12px">
        <div class="row" style="justify-content:space-between;align-items:center">
          <h3>${esc(f.label)}</h3>
          ${raw.exists ? '<span class="badge ok">มีไฟล์</span>' : '<span class="badge missing">ยังไม่มี — จะสร้างใหม่</span>'}
        </div>
        <p class="hint">${esc(f.note || '')} · <span class="mono">${esc(raw.file || '')}</span></p>
        <textarea class="code" data-full="${esc(f.id)}" spellcheck="false">${esc(raw.text || '{\n}\n')}</textarea>
        <div class="btn-row" style="margin-top:10px">
          <button class="btn" data-validate="${esc(f.id)}">ตรวจ JSON</button>
          <button class="btn danger" data-fullsave="${esc(f.id)}">เขียนทับทั้งไฟล์</button>
        </div>
      </div>`;
    }).join('');

    $('#view-settings').innerHTML = `
      <div class="subtabs">
        <button data-setsub="full" class="${SET_SUB === 'full' ? 'active' : ''}">การตั้งค่าฉบับเต็ม</button>
        <button data-setsub="pstack" class="${SET_SUB === 'pstack' ? 'active' : ''}">PSTACK roles</button>
        <button data-setsub="other" class="${SET_SUB === 'other' ? 'active' : ''}">ตั้งค่าอื่น ๆ</button>
      </div>
      ${SET_SUB === 'pstack' ? `
        <div class="card">
          <h3>Preset</h3><p>เลือกวิธีเติมทั้ง 15 role — ไม่ต้องนั่งไล่ทีละบรรทัด</p>
          <div class="arena-bar" style="margin-top:12px">
            <div class="field"><label>แบบ</label><select id="presetMode">
              <option value="uniform">ใช้ตัวเดียวทั้งชุด</option>
              <option value="split">แยกงานเขียน / งานตัดสิน</option>
            </select></div>
            <div class="field"><label>โมเดล A (งานเขียน)</label><input id="presetA" list="bazer-models" placeholder="เช่น grok-4.7-xhigh-fast" /></div>
            <div class="field"><label>โมเดล B (งานตัดสิน)</label><input id="presetB" list="bazer-models" placeholder="เช่น claude-opus-5-5-xhigh" /></div>
            <button class="btn primary" id="presetGo">เติมทั้งชุด</button>
          </div>
          <p class="hint">${esc(modelHint())}</p>
        </div>
        <div class="card" style="margin-top:12px">
          <table><thead><tr><th>role</th><th>โมเดล</th></tr></thead><tbody>${pstackRows}</tbody></table>
          <div class="btn-row" style="margin-top:12px"><button class="btn primary" data-save-group="pstack">บันทึก PSTACK</button></div>
        </div>`
      : SET_SUB === 'full' ? `
        <div class="card">
          <h3>${esc(full?.title || 'การตั้งค่าฉบับเต็ม')}</h3>
          <p>${esc(full?.subtitle || '')}</p>
          <p class="hint">การบันทึกที่นี่ = <strong>เขียนทับทั้งไฟล์</strong> ต่างจาก Quick Access ที่แก้เฉพาะบรรทัด — ระบบตรวจ JSON และสำรองไฟล์เดิมก่อนทุกครั้ง</p>
        </div>
        ${editors}`
      : `<div class="card">
          <h3>${esc(other?.title || 'ตั้งค่าอื่น ๆ')}</h3><p>${esc(other?.subtitle || '')}</p>
          <div class="grid c2" style="margin-top:12px">${(other?.controls || []).map(controlField).join('')}</div>
          <div class="btn-row" style="margin-top:14px">
            <button class="btn primary" data-save-group="other">บันทึก</button>
            <button class="btn ghost" data-reload="1">โหลดค่าใหม่</button>
          </div>
        </div>`}`;
  }

  function renderHistory() {
    const rows = S.history.map((h) => `<tr>
      <td class="mono small">${esc((h.at || '').replace('T', ' ').slice(0, 19))}</td>
      <td class="mono small">${esc(h.entry)}</td>
      <td class="mono small muted">${esc(h.target)}</td>
      <td>${esc(h.result || '')}</td>
      <td><button class="btn tiny danger" data-rollback="${esc(h.stamp)}">ย้อนรอบนี้</button></td></tr>`).join('');
    $('#view-history').innerHTML = `
      <h2 class="section">ประวัติการเขียนไฟล์</h2>
      <div class="card">${rows ? `<table><thead><tr><th>เวลา</th><th>รายการ</th><th>ไฟล์</th><th>ผล</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">ยังไม่มีการเขียนไฟล์</div>'}</div>`;
  }

  function showTab(tab) {
    TAB = tab;
    $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    $$('.view').forEach((v) => { v.hidden = v.id !== `view-${tab}`; });
    const active = $(`#view-${tab}`);
    if (active) { active.style.animation = 'none'; void active.offsetWidth; active.style.animation = ''; }
  }

  /* ---------------- events ---------------- */
  document.addEventListener('click', async (ev) => {
    const t = ev.target.closest('[data-close],[data-tab],[data-act],[data-diff],[data-apply-one],[data-reset],[data-patch],[data-ladder],[data-filesub],[data-setsub],[data-save-group],[data-reload],[data-rollback],[data-validate],[data-fullsave]');
    if (!t) return;

    if (t.dataset.close) return closeModal();
    if (t.dataset.tab) return showTab(t.dataset.tab);
    if (t.dataset.filesub) { FILE_SUB = t.dataset.filesub; return renderFiles(); }
    if (t.dataset.setsub) { SET_SUB = t.dataset.setsub; DRAFTS = {}; return renderSettings(); }
    if (t.dataset.reload) return load();

    if (t.dataset.validate) {
      const ta = $(`[data-full="${t.dataset.validate}"]`);
      try { JSON.parse(ta.value); toast('JSON ถูกต้อง', `${ta.value.length} ตัวอักษร`, 'ok'); }
      catch (e) { toast('JSON ไม่ถูกต้อง', e.message, 'err'); }
      return;
    }

    if (t.dataset.fullsave) {
      const id = t.dataset.fullsave;
      const ta = $(`[data-full="${id}"]`);
      try { JSON.parse(ta.value); } catch (e) { return toast('JSON ไม่ถูกต้อง', e.message, 'err'); }
      return confirmSheet({
        title: `เขียนทับทั้งไฟล์ · ${id}.json`,
        risk: { level: 3, why: 'ค่าที่ไม่ได้อยู่ในเนื้อหาจะหายไป — ระบบสำรองไฟล์เดิมไว้ใน var/backups และตรวจ JSON ก่อนเขียน' },
        body: `<p>จะเขียนทับทั้งไฟล์ด้วยเนื้อหาที่แก้ (${ta.value.length} ตัวอักษร)</p><p class="hint">ต่างจาก Quick Access ที่แก้เฉพาะบรรทัด</p>`,
        confirmText: 'เขียนทับทั้งไฟล์',
        onConfirm: () => act('settings-full', { file: id, content: ta.value }, { confirmed: true }),
      });
    }

    if (t.dataset.diff) {
      const d = await api(`/api/diff?entry=${encodeURIComponent(t.dataset.diff)}`);
      if (d.error) return toast('ผิดพลาด', d.error, 'err');
      const body = d.files
        ? `<table><thead><tr><th>ไฟล์</th><th>สถานะ</th></tr></thead><tbody>${d.files.map((f) => `<tr><td class="mono small">${esc(f.rel)}</td><td>${f.state === 'new' ? '<span class="badge missing">ใหม่</span>' : f.state === 'diff' ? '<span class="badge stale">ต่าง</span>' : '<span class="badge ok">ตรง</span>'}</td></tr>`).join('')}</tbody></table>`
        : `<div class="diff"><div><p class="diff-head">ก่อน</p><pre class="old">${esc(d.before || '(ไม่มีไฟล์)')}</pre></div><div><p class="diff-head">หลัง</p><pre class="new">${esc(d.after || '')}</pre></div></div>`;
      return openModal({ title: `diff · ${d.id}`, body, foot: `<button class="btn ghost" data-close="1">ปิด</button>` });
    }

    if (t.dataset.applyOne) return act('apply', { ids: [t.dataset.applyOne] });

    if (t.dataset.reset) {
      return confirmSheet({
        title: `รีเซ็ต ${t.dataset.reset} จาก template`,
        risk: { level: 3, why: 'เขียนทับไฟล์ในเครื่องด้วยแม่แบบจาก MAJOR — ค่าที่คุณแก้เองจะหาย (สำรองไว้ใน var/backups)' },
        body: '<p>ใช้เมื่อไฟล์ระบบรุ่นเก่าค้างอยู่ (เช่น AGENTS.md ที่ยังมีกฎเก่า) และคุณต้องการให้ตรงกับ MAJOR เท่านั้น</p>',
        confirmText: 'เขียนทับ',
        onConfirm: () => act('reset-template', { id: t.dataset.reset }, { confirmed: true }),
      });
    }

    if (t.dataset.patch) {
      const target = t.dataset.patch;
      return confirmSheet({
        title: `แพตช์ปุ่มอนุมัติ → ${target.toUpperCase()}`,
        risk: { level: 3, why: 'แก้ไฟล์ปลั๊กอิน Plannotator ในเครื่อง — backup ทุกไฟล์และตรวจซ้ำหลังเขียน' },
        body: `<p>หลังกดอนุมัติใน Plannotator จะกลับไปโหมด <strong>${esc(target)}</strong></p><p class="hint">ปุ่มเป็นปุ่มเดียว (global) — ถ้าเรียกจากอีกโหมด ปุ่มจะชี้ผิด; PLANNOTATOR จะรายงานให้ทราบ</p>`,
        confirmText: 'แพตช์เลย',
        onConfirm: () => act('plannotator-patch', { target, apply: true }, { confirmed: true }),
      });
    }

    if (t.dataset.ladder) {
      const ladder = S.policies.find((x) => x.mode === 'buddha') || S.policies[0];
      const lv = ladder.levels.find((l) => String(l.id) === String(t.dataset.ladder));
      const keys = Object.entries(lv.permission || {}).map(([k, v]) => `<code>${esc(k)}: ${esc(v)}</code>`).join(' · ');
      return confirmSheet({
        title: `เปลี่ยน BUDDHA เป็นขั้น ${lv.id} · ${lv.name}`,
        risk: { level: lv.risk, why: lv.why },
        body: `<p>${esc(lv.tagline || '')}</p><p class="small muted">ค่าที่จะเขียน: ${keys || '(ไม่ระบุ)'}</p><p class="small">มีผลกับ <strong>session ใหม่</strong> · บันทึกทันทีโดยไม่ต้องกดอัพเดต</p>`,
        confirmText: 'ยืนยันและบันทึกทันที',
        onConfirm: () => act('policy-set', { level: lv.id }, { confirmed: true }),
      });
    }

    if (t.dataset.saveGroup) {
      const groupId = t.dataset.saveGroup;
      const controls = groupId === 'pstack'
        ? S.settings.pstack.roles.map((r) => ({ id: `pstack.${r.id}`, cur: S.settingsValues[`pstack.${r.id}`] }))
        : (S.settings.groups.find((g) => g.id === groupId) || { controls: [] }).controls.map((c) => ({ id: c.id, cur: S.settingsValues[c.id] }));
      const patches = [];
      for (const c of controls) {
        const el = $(`[data-draft="${c.id}"]`);
        if (!el) continue;
        let val = el.type === 'checkbox' ? el.checked : el.value;
        if (typeof val === 'string') val = val.trim();
        // ฟิลด์ประเภทลิสต์ (เช่นคีย์ลัด/โมเดลหลายตัว) ต้องเขียนเป็น array ไม่ใช่สตริง
        if (el.dataset.list === '1' && typeof val === 'string') {
          val = val.split(',').map((s) => s.trim()).filter(Boolean);
        }
        // line strategy เก็บเป็นสตริง — รวมลิสต์กลับก่อนเทียบ/เขียน
        const cur = c.cur ?? '';
        const next = Array.isArray(val) && !Array.isArray(cur) ? val.join(', ') : val;
        if (JSON.stringify(next) !== JSON.stringify(cur)) patches.push({ id: c.id, value: next });
      }
      if (!patches.length) return toast('ไม่มีอะไรเปลี่ยน', 'แก้ช่องที่ต้องการก่อน', 'ok');
      return act('settings-save', { patches });
    }

    if (t.dataset.rollback) {
      return confirmSheet({
        title: `ย้อนรอบ ${t.dataset.rollback}`,
        risk: { level: 3, why: 'เขียนทับไฟล์ระบบด้วยสำเนาเก่า — งานที่ทำหลังรอบนั้นจะหายไป' },
        body: `<p>จะคืนไฟล์ทั้งหมดที่ถูกเขียนในรอบนี้ และลบไฟล์ที่เพิ่งสร้างใหม่ในรอบนั้น</p>`,
        confirmText: 'ย้อนกลับ',
        onConfirm: () => act('rollback', { stamp: t.dataset.rollback }, { confirmed: true }),
      });
    }

    if (t.dataset.act) {
      const params = t.dataset.params ? JSON.parse(t.dataset.params) : {};
      return act(t.dataset.act, params);
    }
  });

  document.addEventListener('input', (ev) => {
    const d = ev.target.closest('[data-draft]');
    if (d) DRAFTS[d.dataset.draft] = d.type === 'checkbox' ? d.checked : d.value;
  });

  document.addEventListener('click', (ev) => {
    const go = ev.target.closest('#presetGo');
    if (go) {
      const mode = $('#presetMode').value;
      const a = $('#presetA').value.trim();
      const b = $('#presetB').value.trim();
      if (!a) return toast('ต้องระบุโมเดล', 'ช่องโมเดล A ว่าง', 'err');
      act('pstack-preset', { mode, modelA: a, modelB: b });
      return;
    }

    const clean = ev.target.closest('#cleanupGo');
    if (clean) {
      const groups = $$('[data-clean-group]').filter((el) => el.checked).map((el) => el.dataset.cleanGroup);
      if (!groups.length) return toast('ยังไม่ได้เลือก', 'เลือกอย่างน้อยหนึ่งกลุ่ม', 'err');
      const info = S.cleanup.groups.filter((g) => groups.includes(g.id)).map((g) => `<li>${esc(g.title)} — ${g.count} รายการ</li>`).join('');
      return confirmSheet({
        title: 'ย้ายของเก่าไป quarantine',
        risk: { level: 3, why: 'ของเก่าจะหายจาก OpenCode จนกว่าจะกู้คืนจาก ACTIVE/var/quarantine' },
        body: `<p>จะย้าย:</p><ul class="small">${info}</ul><p class="hint">ไม่มีการลบถาวร — ทุกไฟล์ถูกย้ายไปเก็บพร้อม manifest</p>`,
        confirmText: 'ย้ายเลย',
        onConfirm: () => act('cleanup-old', { apply: true, groups }),
      });
    }
  });

  $('#cmdBtn').onclick = () => openPalette();
  $('#logToggle').onclick = () => { const l = $('#logbar'); l.classList.toggle('collapsed'); $('#logToggle').textContent = l.classList.contains('collapsed') ? 'ขยาย' : 'ย่อ'; };

  /* ---------------- palette ---------------- */
  function openPalette() {
    const items = [
      ...S.actions.map((a) => ({ label: a.title, sub: `ปุ่ม · ${a.id}`, run: () => act(a.id) })),
      { label: 'ไป ภาพรวม', sub: 'แท็บ', run: () => showTab('overview') },
      { label: 'ไป Quick Access', sub: 'แท็บ', run: () => showTab('quick') },
      { label: 'ไป โหมด & สิทธิ์', sub: 'แท็บ', run: () => showTab('modes') },
      { label: 'ไป ไฟล์ & สกิล', sub: 'แท็บ', run: () => showTab('files') },
      { label: 'ไป ตั้งค่า', sub: 'แท็บ', run: () => showTab('settings') },
      { label: 'ไป ประวัติ', sub: 'แท็บ', run: () => showTab('history') },
    ];
    PALETTE_ITEMS = items;
    PALETTE_SEL = 0;
    $('#palette').hidden = false;
    $('#paletteInput').value = '';
    renderPalette('');
    $('#paletteInput').focus();
  }
  function renderPalette(q) {
    const list = PALETTE_ITEMS.filter((i) => `${i.label} ${i.sub}`.toLowerCase().includes(q.toLowerCase()));
    PALETTE_SEL = Math.min(PALETTE_SEL, Math.max(0, list.length - 1));
    $('#paletteList').innerHTML = list.map((i, idx) => `<button data-pal="${idx}" class="${idx === PALETTE_SEL ? 'sel' : ''}">${esc(i.label)}<small>${esc(i.sub)}</small></button>`).join('') || '<div class="empty">ไม่พบ</div>';
    $('#paletteList')._list = list;
    $$('#paletteList button').forEach((b) => { b.onclick = () => { const it = list[+b.dataset.pal]; closePalette(); it.run(); }; });
  }
  function closePalette() { $('#palette').hidden = true; }
  $('#paletteInput').addEventListener('input', (e) => renderPalette(e.target.value));
  $('#palette').addEventListener('keydown', (e) => {
    const list = $('#paletteList')._list || [];
    if (e.key === 'Escape') return closePalette();
    if (e.key === 'ArrowDown') { PALETTE_SEL = Math.min(list.length - 1, PALETTE_SEL + 1); renderPalette($('#paletteInput').value); e.preventDefault(); }
    if (e.key === 'ArrowUp') { PALETTE_SEL = Math.max(0, PALETTE_SEL - 1); renderPalette($('#paletteInput').value); e.preventDefault(); }
    if (e.key === 'Enter' && list[PALETTE_SEL]) { const it = list[PALETTE_SEL]; closePalette(); it.run(); }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
    if (e.key === 'Escape') { closePalette(); closeModal(); }
  });

  /* ---------------- live log ---------------- */
  function connectLog() {
    const es = new EventSource('/api/log');
    es.onmessage = (m) => {
      const ev = JSON.parse(m.data);
      const row = document.createElement('div');
      row.className = ev.type || 'info';
      row.textContent = `${new Date(ev.at).toLocaleTimeString()} · ${ev.msg}`;
      $('#logBody').prepend(row);
      while ($('#logBody').children.length > 120) $('#logBody').lastChild.remove();
      $('#logbar').classList.add('flash');
      setTimeout(() => $('#logbar').classList.remove('flash'), 600);
      $('#logState').textContent = ev.type === 'err' ? 'มีปัญหา' : 'ทำงานอยู่';
    };
    es.onerror = () => { $('#logState').textContent = 'ขาดการเชื่อมต่อ — กำลังต่อใหม่'; };
  }

  /* ---------------- boot ---------------- */
  load().then(() => { connectLog(); });
})();
