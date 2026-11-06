/* ===== 1.28: turno con ventanita rápida (como Bilog), obra social y motivo a la vista, agenda de la PC sin caja con scroll ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns;
  const mobile = () => window.matchMedia('(max-width: 760px)').matches;
  const who = () => { const m = A.memberNow && A.memberNow(); if (m && m.name) return m.name; return (A.CFG && A.CFG.ownerName) || (S.setup && S.setup.doctor) || ''; };

  /* ---------- 1) en el turno: obra social y motivo ---------- */
  const covShort = p => {
    const c = String((p && p.cov) || '').trim();
    if (!c || /^particular/i.test(c)) return 'Particular';
    const o = A.osOf ? A.osOf(p) : null; return o ? o.sigla : c.length > 18 ? c.slice(0, 17) + '…' : c;
  };
  A.blkCov = (a, p) => { if (!p) return ''; const c = covShort(p); return ' <span class="bcov' + (c === 'Particular' ? ' part' : '') + '">' + esc(c) + '</span>'; };
  A.blkMot = (a, p) => { const m = a.motivo || (p && A.S.pd && A.S.pd[p.id] && A.S.pd[p.id].hc && A.S.pd[p.id].hc.motivoDate === a.date ? A.S.pd[p.id].hc.motivo : ''); return m ? ' · <span class="bmot">' + esc(m) + '</span>' : ''; };

  /* ---------- 2) quién dio el turno y cuándo ---------- */
  const stamp = (date, before) => { A.day(date).forEach(a => { if (!before[a.id] && a.pid && !a.at) { a.at = new Date().toISOString(); const w = who(); if (w) a.by = w; } }); };
  const saveWrap = k => { const prev = A.acts[k]; if (!prev) return; A.acts[k] = (el, ev) => { const f = S.modal && S.modal.f, d = f && f.date, before = {}; if (d) A.day(d).forEach(a => { before[a.id] = 1; }); const r = prev(el, ev); if (d) stamp(d, before); return r; }; };
  saveWrap('naSave');

  /* ---------- 3) la ventanita del turno ---------- */
  let pop = null;
  const close = () => { const p = $('#tpop'); if (p) p.remove(); const sc = $('#tpopScrim'); if (sc) sc.remove(); pop = null; };
  A.tpClose = close;
  document.addEventListener('click', e => {
    if (pop && !(e.target.closest && (e.target.closest('#tpop') || e.target.closest('.blk')))) close();
  }, true);
  document.addEventListener('keydown', e => { if (pop && e.key === 'Escape') close(); });
  window.addEventListener('resize', () => { if (pop && !mobile()) close(); });

  /* tocar el nombre abre la ficha resumida (como siempre); tocar el resto del turno abre la ventanita */
  document.addEventListener('click', e => {
    const blk = e.target.closest && e.target.closest('.blk[data-appt]'); if (!blk || !blk.closest('#gridWrap')) return;
    if (e.target.closest('.nm') || e.target.closest('button') || e.target.closest('a') || e.target.closest('[data-grip]')) return;
    if (A.CFG && A.CFG.turnClick === 'ficha') return;
    e.stopPropagation(); e.preventDefault();
    open(blk.getAttribute('data-appt'), e);
  }, true);

  function open(id, ev) {
    const a = A.apptById(id); if (!a || !a.pid) return;
    close(); pop = { id };
    const p = A.PAT(a.pid) || {}, pro = A.PRO(a.pro), prov = A.isProv && A.isProv(p);
    const st = Object.keys(A.STATUS_LABEL).filter(k => k !== 'cancelado' || a.status === 'cancelado');
    const stSel = '<select class="tp-st st-' + a.status + '" data-chg="tpStatus" data-id="' + a.id + '" aria-label="Asistencia">' + ['pendiente', 'confirmado', 'llego', 'en-atencion', 'atendido', 'ausente'].concat(a.status === 'cancelado' ? ['cancelado'] : []).filter(k => A.STATUS_LABEL[k]).map(k => '<option value="' + k + '"' + (a.status === k ? ' selected' : '') + '>' + A.STATUS_LABEL[k] + '</option>').join('') + '</select>';
    const oss = (A.osList ? A.osList() : []).filter(o => o.on && o.kind !== 'particular');
    const curCov = String(p.cov || '').trim(), isPart = !curCov || /^particular/i.test(curCov);
    const covSel = '<select class="tp-cov" data-chg="tpCov" data-pid="' + p.id + '" aria-label="Obra social"><option value="Particular"' + (isPart ? ' selected' : '') + '>Particular</option>' + oss.map(o => '<option value="' + esc(o.sigla) + '"' + (!isPart && (A.osOf && A.osOf(p) === o) ? ' selected' : '') + '>' + esc(o.sigla) + '</option>').join('') + (!isPart && !(A.osOf && A.osOf(p)) ? '<option selected value="' + esc(curCov) + '">' + esc(curCov) + '</option>' : '') + '</select>';
    const tel = p.phone ? '<button class="tp-tel" data-act="apRem" data-id="' + a.id + '" title="Mandar el recordatorio por WhatsApp"><span aria-hidden="true">💬</span> ' + esc(p.phone) + '</button>' : '<button class="tp-tel none" data-act="provPhone" data-pid="' + p.id + '">+ Agregar teléfono</button>';
    const by = a.by || a.at ? '<div class="tp-by">Dado por ' + esc(a.by || '—') + (a.at ? ' el ' + A.fmtDMY(a.at.slice(0, 10)) + ' ' + new Date(a.at).toTimeString().slice(0, 5) : '') + (a.online ? ' · pedido online' : '') + '</div>' : (a.online ? '<div class="tp-by">Pedido por el turnero online</div>' : '');
    const h = '<div class="tp-head"><b>' + esc(A.fmtLong(a.date)) + ' · ' + A.mm(a.start) + ' a ' + A.mm(a.start + a.dur) + (a.sobre ? ' · sobreturno' : '') + '</b><button class="x" data-act="tpX" aria-label="Cerrar">×</button></div>' +
      '<button class="tp-name" data-act="tpFicha" data-id="' + a.id + '"><span class="tp-av" aria-hidden="true">' + esc((p.first || p.name || '?').charAt(0).toUpperCase()) + '</span><span><b>' + esc(p.name || 'Paciente') + '</b>' + (prov ? ' <span class="chip warn">sin ficha</span>' : '') + '<small>' + esc(a.what || '') + (A.PROS.length > 1 && pro ? ' · ' + esc(pro.name) : '') + '</small></span><span class="tp-go" aria-hidden="true">›</span></button>' +
      '<div class="tp-row">' + covSel + tel + '</div>' +
      '<div class="tp-row"><label class="tp-l">Asistencia</label>' + stSel + '</div>' +
      '<div class="tp-row tp-obs"><label class="tp-l" for="tpObs">Motivo u observación</label><input id="tpObs" value="' + esc(a.motivo || '') + '" placeholder="Ej.: dolor en una muela, control" data-id="' + a.id + '"></div>' +
      by +
      '<div class="tp-acts">' +
      '<button data-act="tpSobre" data-id="' + a.id + '"><span aria-hidden="true">＋</span> Nuevo sobreturno</button>' +
      '<button data-act="tpEdit" data-id="' + a.id + '"><span aria-hidden="true">✎</span> Modificar turno</button>' +
      '<button data-act="tpClip" data-mode="copy" data-id="' + a.id + '"><span aria-hidden="true">⧉</span> Copiar</button>' +
      '<button data-act="tpClip" data-mode="cut" data-id="' + a.id + '"><span aria-hidden="true">✂</span> Mover a otro horario</button>' +
      '<button class="danger" data-act="tpFree" data-id="' + a.id + '"><span aria-hidden="true">🗑</span> Liberar turno</button>' +
      '</div>' +
      (prov ? '<button class="tp-foot" data-act="provReg" data-pid="' + p.id + '">Pasar a la lista de pacientes <span aria-hidden="true">→</span></button>' : '<button class="tp-foot" data-act="tpFull" data-pid="' + p.id + '">Abrir la ficha completa <span aria-hidden="true">→</span></button>');
    const el = document.createElement('div'); el.id = 'tpop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Turno de ' + (p.name || '')); el.innerHTML = h;
    if (mobile()) { const sc = document.createElement('div'); sc.id = 'tpopScrim'; sc.addEventListener('click', close); document.body.appendChild(sc); el.classList.add('sheet'); }
    document.body.appendChild(el);
    if (!mobile()) {
      const r = el.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
      let x = (ev && ev.clientX != null ? ev.clientX : W / 2) + 10, y = (ev && ev.clientY != null ? ev.clientY : H / 2) - 20;
      if (x + r.width > W - 10) x = Math.max(10, x - r.width - 20);
      if (y + r.height > H - 10) y = Math.max(10, H - r.height - 10);
      el.style.left = x + 'px'; el.style.top = y + 'px';
    }
    const ob = $('#tpObs');
    if (ob) { ob.addEventListener('change', () => saveObs(a.id, ob.value)); ob.addEventListener('keydown', e => { if (e.key === 'Enter') { ob.blur(); } }); }
  }
  A.tpOpen = open;
  function saveObs(id, v) { const a = A.apptById(id); if (!a) return; v = v.trim(); if ((a.motivo || '') === v) return; A.mutate([a.date], () => { if (v) a.motivo = v.charAt(0).toUpperCase() + v.slice(1); else delete a.motivo; }, 'Motivo del turno'); if (v && a.pid && A.setMotivo) A.setMotivo(a.pid, v); A.refresh(); }
  const reopen = id => { const a = A.apptById(id); const blk = document.querySelector('.blk[data-appt="' + id + '"]'); const r = blk ? blk.getBoundingClientRect() : null; if (a) open(id, r ? { clientX: r.left + Math.min(r.width, 220), clientY: r.top + 10 } : null); };

  A.acts.tpX = () => close();
  A.acts.tpFicha = el => { const id = el.getAttribute('data-id'); close(); S.panel = { type: 'appt', id }; A.renderPanel(); };
  A.acts.tpFull = el => { const pid = el.getAttribute('data-pid'); close(); A.openFicha(pid); };
  A.chg.tpStatus = el => { const id = el.getAttribute('data-id'), v = el.value; close(); A.setStatus(id, v); if (!S.modal) setTimeout(() => reopen(id), 30); };
  A.chg.tpCov = el => { const pid = el.getAttribute('data-pid'); A.setProfile(pid, { cov: el.value }); A.save(); const id = pop && pop.id; A.refresh(); A.toast('Cobertura: ' + el.value + '.'); if (id) setTimeout(() => reopen(id), 30); };
  A.acts.tpSobre = el => { const a = A.apptById(el.getAttribute('data-id')); close(); if (a) A.openNewAppt({ pro: a.pro, date: a.date, start: a.start, sobre: true }); };
  A.acts.tpEdit = el => { const id = el.getAttribute('data-id'); close(); S.panel = { type: 'appt', id, edit: true }; A.renderPanel(); setTimeout(() => { const mv = document.querySelector('#panelHost .mv-grid, #panelHost [data-act="apShift"]'); if (mv && mv.scrollIntoView) mv.scrollIntoView({ block: 'center' }); }, 80); };
  A.acts.tpFree = el => { const id = el.getAttribute('data-id'); close(); if (A.acts.apDelAsk) A.acts.apDelAsk({ getAttribute: () => id }); else A.setStatus(id, 'cancelado'); };

  /* copiar y mover: se elige el horario nuevo tocando la agenda */
  let clip = null;
  A.acts.tpClip = el => {
    const id = el.getAttribute('data-id'), mode = el.getAttribute('data-mode'), a = A.apptById(id); if (!a) return;
    close(); clip = { id, mode };
    paintClip();
  };
  function paintClip() {
    let b = $('#clipBar');
    if (!clip) { if (b) b.remove(); document.body.classList.remove('clip-on'); return; }
    const a = A.apptById(clip.id), p = a && A.PAT(a.pid);
    if (!b) { b = document.createElement('div'); b.id = 'clipBar'; document.body.appendChild(b); }
    document.body.classList.add('clip-on');
    b.innerHTML = '<span>' + (clip.mode === 'cut' ? 'Mover' : 'Copiar') + ' el turno de <b>' + esc(p ? p.name : '') + '</b>: tocá el horario nuevo en la agenda (podés cambiar de día).</span><button class="btn small" data-act="clipCancel">Cancelar</button>';
  }
  A.acts.clipCancel = () => { clip = null; paintClip(); };
  const gbPrev = A.acts.gbClick;
  A.acts.gbClick = (el, ev) => {
    if (!clip) return gbPrev(el, ev);
    const rect = el.getBoundingClientRect(), y = ev && ev.clientY != null ? ev.clientY - rect.top : 0, g0 = parseInt(el.getAttribute('data-g0'), 10);
    const start = g0 + Math.max(0, Math.floor(y / 28)) * 15, to = { date: el.getAttribute('data-date'), pro: el.getAttribute('data-pro'), start };
    const c = clip; clip = null; paintClip();
    const a = A.apptById(c.id); if (!a) return;
    if (c.mode === 'cut') { A.tryMove(a.id, to); return; }
    const n = Object.assign({}, a, { id: A.uid(), date: to.date, pro: to.pro, start: to.start, status: 'pendiente', rem: 'porenviar', at: new Date().toISOString(), by: who() || undefined });
    delete n.sobre; delete n.online; delete n.code; delete n.onlineAt;
    if (A.conflicts(n).length) { A.toast('Ese horario ya está ocupado. Elegí otro o dalo como sobreturno.'); clip = c; paintClip(); return; }
    A.mutate([to.date], () => { A.day(to.date).push(n); }, 'Turno copiado para el ' + A.fmtShort(to.date) + ' ' + A.mm(to.start));
    A.refresh();
  };

  /* configurable: Menú › Apariencia podría cambiarlo; por defecto, ventanita */
  A.CFG = A.CFG || {};

  /* ---------- 4) nuevo paciente desde el turno: obra social ---------- */
  const wrapPrev = A.wrapNewAppt;
  A.wrapNewAppt = (m, html) => {
    html = wrapPrev ? wrapPrev(m, html) : html;
    if (!m.f || !m.f.creating) return html;
    const oss = (A.osList ? A.osList() : []).filter(o => o.on && o.kind !== 'particular');
    const v = m.f.n_cov || 'Particular';
    const sel = '<div class="field"><label for="nc_cov">Obra social</label><select id="nc_cov"><option value="Particular">Particular</option>' + oss.map(o => '<option value="' + esc(o.sigla) + '"' + (v === o.sigla ? ' selected' : '') + '>' + esc(o.name) + '</option>').join('') + '</select></div>';
    return html.replace(/(<div class="field"><label for="nc_phone">[\s\S]*?<\/div>)/, '$1' + sel);
  };
  const addPrev = A.addPatient;
  A.addPatient = d => { const s = $('#nc_cov'); if (s && d && !d.cov) d.cov = s.value; return addPrev(d); };
  document.addEventListener('change', e => { if (e.target && e.target.id === 'nc_cov' && S.modal && S.modal.f) S.modal.f.n_cov = e.target.value; });

  /* ---------- 5) PC: la agenda se recorre con la rueda del mouse, sin caja con su propio scroll ---------- */
  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '#view-agenda .grid-wrap{max-height:none!important;min-height:0!important;overflow-y:visible}' +
    '.blk .bcov{display:inline-block;margin-left:5px;padding:0 5px;border-radius:5px;background:color-mix(in srgb,currentColor 12%,transparent);font-size:10.5px;font-weight:700;letter-spacing:.02em;vertical-align:1px;white-space:nowrap}.blk .bcov.part{opacity:.75}' +
    '.blk .bmot{font-style:italic}' +
    '#tpop{position:fixed;z-index:270;width:min(360px,calc(100vw - 20px));background:var(--surface,#fff);color:var(--ink);border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 48px rgba(0,0,0,.28);padding:12px;display:flex;flex-direction:column;gap:9px;animation:tpIn .14s ease-out;font-size:14px}' +
    '@keyframes tpIn{from{opacity:0;transform:scale(.97)}}' +
    '#tpop.sheet{left:0!important;right:0;bottom:0;top:auto!important;width:auto;border-radius:18px 18px 0 0;padding:14px 14px calc(14px + env(safe-area-inset-bottom,0px));max-height:85vh;overflow:auto;animation:tpUp .18s ease-out}@keyframes tpUp{from{transform:translateY(40px);opacity:0}}' +
    '#tpopScrim{position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:269}' +
    '.tp-head{display:flex;align-items:center;gap:8px}.tp-head b{flex:1;font-size:13.5px;color:var(--ink-2)}.tp-head .x{background:none;border:1px solid var(--line);border-radius:8px;width:30px;height:30px;font-size:18px;line-height:1;color:var(--ink-2);cursor:pointer}' +
    '.tp-name{display:flex;align-items:center;gap:10px;text-align:left;background:none;border:0;padding:4px 2px;color:inherit;font:inherit;cursor:pointer;border-radius:10px}.tp-name:hover{background:color-mix(in srgb,var(--accent) 7%,transparent)}.tp-name b{font-size:17px}.tp-name small{display:block;color:var(--ink-2);font-size:12.5px}.tp-name>span:nth-child(2){flex:1;min-width:0}' +
    '.tp-av{flex:none;width:34px;height:34px;border-radius:50%;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent);display:grid;place-items:center;font-weight:800}.tp-go{font-size:22px;color:var(--ink-2)}' +
    '.tp-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.tp-l{font-size:12.5px;color:var(--ink-2);min-width:88px}.tp-row select{min-height:34px;border-radius:9px;padding:0 8px;max-width:100%}.tp-obs{flex-direction:column;align-items:stretch;gap:3px}.tp-obs input{min-height:36px}' +
    '.tp-st{font-weight:700}.tp-st.st-llego,.tp-st.st-en-atencion,.tp-st.st-atendido{background:#e3f6d6;color:#2a5a12}.tp-st.st-ausente{background:#fde2e2;color:#8a1f1f}.tp-st.st-confirmado{background:#e2efff;color:#174a8a}' +
    '.tp-tel{border:1px solid #9fdcb5;background:#eafaf0;color:#14612f;border-radius:999px;padding:5px 11px;font-weight:700;cursor:pointer;font-size:13.5px}.tp-tel.none{border-style:dashed;background:none;color:var(--ink-2)}' +
    '.tp-by{font-size:12px;color:var(--ink-2)}' +
    '.tp-acts{display:grid;grid-template-columns:1fr 1fr;gap:6px;border-top:1px solid var(--line);padding-top:9px}.tp-acts button{display:flex;align-items:center;gap:6px;justify-content:flex-start;min-height:38px;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:9px;padding:0 10px;font:inherit;font-size:13.5px;cursor:pointer;text-align:left}.tp-acts button:hover{border-color:var(--accent)}.tp-acts .danger{grid-column:1/-1;color:#b42318;border-color:#f3b8b2}' +
    '.tp-foot{display:flex;justify-content:space-between;align-items:center;background:none;border:0;border-top:1px solid var(--line);padding:9px 2px 0;color:var(--accent);font:inherit;font-weight:700;cursor:pointer}' +
    '#clipBar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:265;background:#173f7a;color:#fff;border-radius:14px;padding:10px 12px 10px 16px;display:flex;gap:10px;align-items:center;width:max-content;max-width:calc(100vw - 24px);box-shadow:0 12px 30px rgba(0,0,0,.3);font-size:14px}#clipBar .btn{background:#fff;color:#173f7a;border:0}' +
    'body.clip-on #gridWrap .gb{cursor:copy;outline:2px dashed #7fb3ff;outline-offset:-2px}' +
    '</style>');
})();
