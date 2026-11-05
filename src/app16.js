/* ===== 1.8: plan de tratamiento por fases (plantilla editable, PDF con logo y WhatsApp), presupuestos que quedan, fotos en grande, hora de llegada y agenda arrastrable en la web ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns;
  const N = s => A.norm(String(s || ''));
  const fake = o => ({ getAttribute: k => (o[k] == null ? null : String(o[k])) });

  /* =====================================================================
     PLAN DE TRATAMIENTO
     Plantilla orientativa (esquema de fases de la Facultad de Odontología, UNCuyo):
     urgencia → fase I básica → fase II correctiva → fase III mantenimiento.
     Cada tratamiento queda en el plan aunque se realice: pasa a «hecho» con su fecha.
     ===================================================================== */
  const TEMPLATE = [
    { id: 'urg', name: 'Urgencia', hint: 'Lo primero: aliviar el dolor y frenar la infección (drenaje de abscesos, pulpectomía, medicación).' },
    { id: 'bas', name: 'Fase I · Básica', hint: 'Sacar las causas: enseñanza de higiene, control de placa, limpieza y tartrectomía, eliminación de caries, piezas sin pronóstico y restauraciones desbordantes. Al final, reevaluar.' },
    { id: 'cor', name: 'Fase II · Correctiva', hint: 'Rehabilitar: endodoncias, restauraciones definitivas, periodoncia quirúrgica, cirugía, implantes, prótesis y ortodoncia.' },
    { id: 'man', name: 'Fase III · Mantenimiento', hint: 'Que no vuelva: controles y limpiezas cada 3 a 12 meses, según el riesgo del paciente.' }
  ];
  const tp = pid => { const pd = A.pd(pid); return pd.tplan || { phases: TEMPLATE.map(p => Object.assign({}, p)), prices: true, dx: '', notes: '', virgin: true }; };
  const tpSave = (pid, p) => { delete p.virgin; p.updated = new Date().toISOString(); A.pd(pid).tplan = p; A.touchPd(pid); };
  function guessPhase(t, phases) {
    const ids = phases.map(p => p.id), has = id => ids.indexOf(id) >= 0, l = N(t.label) + ' ' + (t.cond || '');
    let g = 'cor';
    if (/urgencia|drenaje|absceso|dolor|pulpectomia|apertura/.test(l)) g = 'urg';
    else if (/control|mantenimiento|recall/.test(l)) g = 'man';
    else if (/limpieza|profilaxis|tartrectom|detartraje|raspaje|alisado|fluor|topicacion|higiene|motivacion|ensenanza|sellador|extraccion|resto radicular|restoradicular|caries/.test(l)) g = 'bas';
    return has(g) ? g : ids[Math.min(ids.length - 1, Math.max(0, ['urg', 'bas', 'cor', 'man'].indexOf(g)))] || ids[0];
  }
  const inPlan = t => t && t.status !== 'anulado' && !t.hidePlan && (t.status === 'plan' || t.status === 'hecho');
  function items(pid) {
    const p = tp(pid), pd = A.pd(pid);
    return (pd.tx || []).filter(inPlan).map(t => ({ t, ph: p.phases.some(x => x.id === t.ph) ? t.ph : guessPhase(t, p.phases) }));
  }
  const totals = list => {
    const tot = list.reduce((s, x) => s + (+x.t.price || 0), 0), done = list.filter(x => x.t.status === 'hecho');
    return { n: list.length, nd: done.length, tot, done: done.reduce((s, x) => s + (+x.t.price || 0), 0) };
  };
  const budgetOf = (pid, t) => (t.bid ? (A.pd(pid).budgets || []).filter(b => b.id === t.bid)[0] : null);
  const BCHIP = { borrador: ['', 'borrador'], presentado: ['warn', 'presentado'], aceptado: ['ok', 'aceptado'], rechazado: ['bad', 'rechazado'] };
  const chip = b => { const c = BCHIP[b.status] || ['', b.status]; return '<span class="chip ' + c[0] + '">' + esc(c[1]) + '</span>'; };
  const sel = {};

  function planHTML(pid) {
    const p = tp(pid), list = items(pid), T = totals(list), pd = A.pd(pid), logo = A.CFG.logo;
    let h = '<section class="card tp-card"><div class="tp-head"><h2>Plan de tratamiento</h2><div class="row-btns">' +
      '<button class="btn small" data-act="pdfPlanTp">PDF</button><button class="btn small" data-act="tpWa">' + WAICON + ' WhatsApp</button>' +
      '<button class="btn small ghost" data-act="tpMore" aria-label="Más opciones del plan">⋯</button></div></div>';
    if (T.n) h += '<div class="tp-prog"><div class="tp-bar"><i style="width:' + Math.round(T.nd * 100 / T.n) + '%"></i></div><span><b>' + T.nd + '</b> de ' + T.n + ' realizados' + (p.prices ? ' · ' + A.money(T.done) + ' de ' + A.money(T.tot) : '') + '</span></div>';
    h += '<details class="tp-sec"' + (p.dx || p.notes ? '' : '') + ' open><summary>Evaluación y observaciones para el paciente <span class="muted">(opcional)</span></summary>' +
      '<div class="field"><label for="tpDx">Diagnóstico / lo que vi en la evaluación</label><textarea id="tpDx" rows="2" data-chg="tpField" data-k="dx" placeholder="Ej.: gingivitis generalizada, caries en 16 y 36, 46 con lesión periapical.">' + esc(p.dx || '') + '</textarea></div>' +
      '<div class="field"><label for="tpNotes">Indicaciones y observaciones</label><textarea id="tpNotes" rows="2" data-chg="tpField" data-k="notes" placeholder="Ej.: cepillado 3 veces por día con técnica de Bass; turnos cada 15 días; la duración estimada es de 3 meses.">' + esc(p.notes || '') + '</textarea></div>' +
      '<label class="chk"><input type="checkbox" data-chg="tpPrices"' + (p.prices ? ' checked' : '') + '> Mostrar costos al lado de cada tratamiento (y en el PDF)</label></details>';
    if (p.virgin) h += '<details class="tp-guide"><summary>¿Cómo armar el plan? Guía rápida</summary><ol>' + TEMPLATE.map(f => '<li><b>' + esc(f.name) + ':</b> ' + esc(f.hint) + '</li>').join('') + '</ol><p class="hint">Las fases son una plantilla orientativa: cambiales el nombre, borralas o sumá otras. Lo que marcás como «planificado» en el odontograma entra solo en la fase que corresponde; lo podés pasar a otra.</p></details>';
    const chk = sel[pid] || (sel[pid] = {});
    p.phases.forEach((f, fi) => {
      const L = list.filter(x => x.ph === f.id), t = totals(L);
      h += '<div class="tp-ph" data-ph="' + f.id + '"><div class="tp-phh"><input class="tp-phn" data-chg="tpPhName" data-ph="' + f.id + '" value="' + esc(f.name) + '" aria-label="Nombre de la fase">' +
        '<span class="muted">' + (L.length ? t.nd + '/' + t.n + (p.prices && t.tot ? ' · ' + A.money(t.tot) : '') : 'vacía') + '</span>' +
        '<span class="tp-pha">' + (fi > 0 ? '<button class="lnk" data-act="tpPhUp" data-ph="' + f.id + '" aria-label="Subir fase">↑</button>' : '') + '<button class="lnk bad" data-act="tpPhDel" data-ph="' + f.id + '" aria-label="Borrar fase">Borrar fase</button></span></div>' +
        (f.hint ? '<div class="tp-hint">' + esc(f.hint) + '</div>' : '');
      h += L.length ? '<ul class="tp-list">' + L.map(x => itemHTML(pid, x.t, p, chk)).join('') + '</ul>' : '';
      h += '<button class="btn small ghost tp-add" data-act="tpAdd" data-ph="' + f.id + '">+ Agregar tratamiento</button></div>';
    });
    h += '<div class="row-btns" style="margin-top:10px"><button class="btn small" data-act="tpPhNew">+ Agregar fase</button>' + (p.virgin ? '' : '<button class="btn small ghost" data-act="tpTemplate">Volver a la plantilla de fases</button>') + '</div>';
    h += '<div class="tp-logo">' + (logo && logo.src ? '<img src="' + esc(logo.src) + '" alt="Logo del consultorio">' : '<span class="tp-nologo">Sin logo</span>') + '<div><b>Logo del consultorio</b><span class="hint" style="margin:0">Sale arriba en todos los PDF: plan, presupuestos, recetas e historia clínica.</span><div class="row-btns"><label class="btn small filebtn">' + (logo ? 'Cambiar logo' : 'Subir logo') + '<input type="file" accept="image/*" hidden data-chg="tpLogo"></label>' + (logo ? '<button class="btn small ghost" data-act="tpLogoDel">Quitar</button>' : '') + '</div></div></div>';
    h += '<div class="small-note">Tildá tratamientos para armar un presupuesto solo con esos; si no tildás ninguno, entra todo lo pendiente.</div></section>';
    return h;
  }
  function itemHTML(pid, t, p, chk) {
    const done = t.status === 'hecho', b = budgetOf(pid, t);
    return '<li class="tp-it' + (done ? ' done' : '') + '">' +
      (done ? '<span class="tp-ok" aria-hidden="true">✓</span>' : '<input type="checkbox" data-chg="tpSel" data-id="' + t.id + '"' + (chk[t.id] ? ' checked' : '') + ' aria-label="Elegir para el presupuesto">') +
      '<div class="tp-main"><input class="tp-lbl" data-chg="tpLabel" data-id="' + t.id + '" value="' + esc(t.label) + '" aria-label="Tratamiento">' +
      '<div class="tp-meta">' + (done ? '<span class="chip ok">hecho ' + A.fmtDMY(t.doneDate) + '</span>' : '<span class="chip">pendiente</span>') + (b ? ' <span class="muted">' + esc(b.num) + '</span> ' + chip(b) : '') +
      '<select data-chg="tpPh" data-id="' + t.id + '" aria-label="Fase">' + p.phases.map(f => '<option value="' + f.id + '"' + (f.id === (p.phases.some(x => x.id === t.ph) ? t.ph : guessPhase(t, p.phases)) ? ' selected' : '') + '>' + esc(f.name) + '</option>').join('') + '</select></div></div>' +
      (p.prices ? '<input class="tp-pr" inputmode="numeric" data-chg="tpPrice" data-id="' + t.id + '" value="' + (t.price || 0) + '" aria-label="Costo">' : '') +
      '<div class="tp-acts">' + (done ? '<button class="lnk" data-act="tpUndo" data-id="' + t.id + '">Deshacer</button>' : '<button class="btn small" data-act="txDone" data-id="' + t.id + '">Hecho hoy</button>') +
      '<button class="lnk bad" data-act="tpDel" data-id="' + t.id + '" aria-label="Quitar del plan">Quitar</button></div></li>';
  }
  const WAICON = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style="vertical-align:-2px"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z"/></svg>';

  /* presupuestos: quedan en la sección con su avance (lo hecho y lo pagado) aunque se terminen de pagar */
  function budgetsHTML(pid) {
    const pd = A.pd(pid), bs = (pd.budgets || []).slice().reverse();
    let h = '<section class="card"><h2>Presupuestos <span class="count">' + bs.length + '</span></h2>';
    if (!bs.length) return h + '<div class="empty">Todavía no hay presupuestos. Armalo con los tratamientos del plan: se puede presentar en pantalla, firmar y descargar en PDF.</div>' + budgetBtn(pid) + '</section>';
    h += '<div class="tp-bud">' + bs.map(b => {
      const its = b.items || [], done = its.filter(i => { const t = (pd.tx || []).filter(x => x.id === i.txId)[0]; return t && t.status === 'hecho'; }).length;
      let paid = 0; try { paid = A.schedule(pid, b).lines.reduce((s, l) => s + (l.paid || 0), 0); } catch (e) { paid = 0; }
      const pct = b.total ? Math.min(100, Math.round(paid * 100 / b.total)) : 0;
      return '<div class="tp-b"><div class="tp-bt"><b class="mono">' + esc(b.num) + '</b><span class="muted">' + A.fmtDMY(b.date) + '</span>' + chip(b) + (paid >= b.total && b.total && b.status === 'aceptado' ? '<span class="chip ok">pagado</span>' : '') + '<span class="tp-bm">' + A.money(b.total) + '</span></div>' +
        '<div class="tp-bs"><span>' + done + ' de ' + its.length + ' tratamientos hechos</span>' + (b.status === 'aceptado' ? '<span>Pagó ' + A.money(paid) + ' (' + pct + '%)</span>' : '') + '</div>' +
        '<div class="row-btns"><button class="btn small" data-act="budgetView" data-id="' + b.id + '">' + (b.status === 'aceptado' ? 'Ver' : 'Ver y firmar') + '</button><button class="btn small" data-act="tpBudPdf" data-id="' + b.id + '">PDF</button><button class="lnk bad" data-act="tpBudDelAsk" data-id="' + b.id + '">Borrar</button></div></div>';
    }).join('') + '</div>' + budgetBtn(pid) + '</section>';
    return h;
  }
  function budgetBtn(pid) {
    const pend = (A.pd(pid).tx || []).filter(t => t.status === 'plan'), chk = sel[pid] || {}, picked = pend.filter(t => chk[t.id]).length;
    return '<div class="row-btns" style="margin-top:10px"><button class="btn primary" data-act="tpBudNew"' + (pend.length ? '' : ' disabled') + '>Armar presupuesto' + (picked ? ' con lo elegido (' + picked + ')' : '') + '</button></div>';
  }
  A.render.planTab = pid => planHTML(pid) + budgetsHTML(pid);

  /* ---------- acciones del plan ---------- */
  const pidNow = () => S.fichaPid;
  const txById = id => (A.pd(pidNow()).tx || []).filter(t => t.id === id)[0];
  const keepScroll = fn => { const y = window.scrollY; fn(); A.refresh(); requestAnimationFrame(() => window.scrollTo(0, y)); };
  A.chg.tpField = el => { const pid = pidNow(), p = tp(pid); p[el.getAttribute('data-k')] = el.value; tpSave(pid, p); };
  A.chg.tpPrices = el => keepScroll(() => { const pid = pidNow(), p = tp(pid); p.prices = el.checked; tpSave(pid, p); });
  A.chg.tpPhName = el => { const pid = pidNow(), p = tp(pid), f = p.phases.filter(x => x.id === el.getAttribute('data-ph'))[0]; if (!f) return; f.name = el.value.trim() || f.name; tpSave(pid, p); };
  A.chg.tpSel = el => { const pid = pidNow(); (sel[pid] = sel[pid] || {})[el.getAttribute('data-id')] = el.checked; keepScroll(() => {}); };
  A.chg.tpLabel = el => { const t = txById(el.getAttribute('data-id')); if (!t || !el.value.trim()) return; t.label = el.value.trim(); A.touchPd(pidNow()); };
  A.chg.tpPrice = el => { const t = txById(el.getAttribute('data-id')), v = parseInt(String(el.value).replace(/\D/g, ''), 10); if (t && v >= 0) { t.price = v; A.touchPd(pidNow()); } keepScroll(() => {}); };
  A.chg.tpPh = el => keepScroll(() => { const pid = pidNow(), t = txById(el.getAttribute('data-id')), p = tp(pid); if (!t) return; t.ph = el.value; if (p.virgin) tpSave(pid, p); A.touchPd(pid); });
  A.acts.tpAdd = el => { S.tpAddPh = el.getAttribute('data-ph'); A.acts.addTx(fake({ 'data-mode': 'plan' })); };
  /* lo que se agrega desde «+ Agregar tratamiento» entra en esa fase */
  const atPrev = A.acts.atSave;
  A.acts.atSave = el => {
    const pid = pidNow(), before = (A.pd(pid).tx || []).map(t => t.id), ph = S.tpAddPh;
    const r = atPrev(el); const nw = (A.pd(pid).tx || []).filter(t => before.indexOf(t.id) < 0)[0];
    if (nw) { S.tpAddPh = null; if (ph) { nw.ph = ph; A.touchPd(pid); A.refresh(); } } return r;
  };
  A.acts.tpDel = el => {
    const pid = pidNow(), pd = A.pd(pid), t = txById(el.getAttribute('data-id')); if (!t) return;
    const snap = JSON.stringify(pd.tx);
    if (t.status === 'hecho') t.hidePlan = true; else t.status = 'anulado';
    A.touchPd(pid); A.toast('Quitado del plan: ' + t.label, () => { A.pd(pid).tx = JSON.parse(snap); A.touchPd(pid); A.refresh(); }); keepScroll(() => {});
  };
  /* deshacer «hecho»: vuelve a pendiente, se anula el cargo y se borra la nota automática */
  A.acts.tpUndo = el => {
    const pid = pidNow(), pd = A.pd(pid), t = txById(el.getAttribute('data-id')); if (!t) return;
    (pd.ledger || []).forEach(e => { if (e.txId === t.id && !e.voided) { e.voided = true; e.voidedAt = A.today(); } });
    pd.notes = (pd.notes || []).filter(n => !(n.auto && n.text === 'Se realizó: ' + t.label + '.' && n.date === t.doneDate));
    if (t.tooth && pd.odon && pd.odon[t.tooth]) {
      const d = pd.odon[t.tooth], c = t.cond === 'extraido' ? 'extraccion' : t.cond;
      Object.keys(d.faces || {}).forEach(f => { if (d.faces[f] && d.faces[f].cond === t.cond && d.faces[f].status === 'realizado' && (t.faces || '').indexOf(f) >= 0) d.faces[f].status = 'planificado'; });
      if (t.cond === 'extraido') { d.whole = (d.whole || []).filter(w => w.cond !== 'extraido'); d.whole.push({ cond: 'extraccion', status: 'planificado' }); }
      else (d.whole || []).forEach(w => { if (w.cond === c && w.status === 'realizado') w.status = 'planificado'; });
      t.cond = c;
    }
    t.status = 'plan'; t.doneDate = null; A.touchPd(pid); A.toast('Volvió a pendiente: ' + t.label + '. Se anuló su cargo en la cuenta.'); keepScroll(() => {});
  };
  A.acts.tpPhNew = () => keepScroll(() => { const pid = pidNow(), p = tp(pid); p.phases.push({ id: 'f' + A.uid().slice(-6), name: 'Fase nueva', hint: '' }); tpSave(pid, p); });
  A.acts.tpPhUp = el => keepScroll(() => { const pid = pidNow(), p = tp(pid), i = p.phases.findIndex(x => x.id === el.getAttribute('data-ph')); if (i > 0) { const [f] = p.phases.splice(i, 1); p.phases.splice(i - 1, 0, f); tpSave(pid, p); } });
  A.acts.tpPhDel = el => {
    const pid = pidNow(), p = tp(pid), id = el.getAttribute('data-ph'); if (p.phases.length <= 1) { A.toast('El plan necesita al menos una fase.'); return; }
    const L = items(pid).filter(x => x.ph === id), i = p.phases.findIndex(x => x.id === id), to = p.phases[i === 0 ? 1 : i - 1];
    keepScroll(() => { L.forEach(x => { x.t.ph = to.id; }); p.phases.splice(i, 1); tpSave(pid, p); });
    A.toast('Fase borrada' + (L.length ? '. Sus ' + L.length + ' tratamientos pasaron a «' + to.name + '».' : '.'));
  };
  A.acts.tpTemplate = () => keepScroll(() => { const pid = pidNow(), p = tp(pid); p.phases = TEMPLATE.map(f => Object.assign({}, f)); (A.pd(pid).tx || []).forEach(t => { if (inPlan(t)) delete t.ph; }); tpSave(pid, p); });
  A.acts.tpMore = () => { S.modal = { type: 'tpMore', pid: pidNow() }; A.renderModal(); };
  MF.tpMore = m => A.modalShell('Plan de tratamiento', '<div class="setup-grid">' +
    '<button class="setup-card" data-act="tpHideDone"><b>Ocultar lo realizado</b><span>Saca del plan los tratamientos ya hechos (siguen en «Realizado» y en la cuenta).</span></button>' +
    '<button class="setup-card" data-act="tpShowAll"><b>Volver a mostrar lo realizado</b><span>Trae de nuevo al plan lo que habías ocultado.</span></button>' +
    '<button class="setup-card" data-act="tpClearAsk"><b>Borrar el plan</b><span>Quita todo lo pendiente y el texto de la evaluación. Lo realizado no se toca.</span></button></div>',
  '<button class="btn primary" data-act="closeModal">Listo</button>');
  A.acts.tpHideDone = () => { const pid = S.modal.pid; (A.pd(pid).tx || []).forEach(t => { if (t.status === 'hecho') t.hidePlan = true; }); A.touchPd(pid); A.closeModal(); A.refresh(); };
  A.acts.tpShowAll = () => { const pid = S.modal.pid; (A.pd(pid).tx || []).forEach(t => { delete t.hidePlan; }); A.touchPd(pid); A.closeModal(); A.refresh(); };
  A.acts.tpClearAsk = () => { S.modal = { type: 'tpClear', pid: S.modal.pid }; A.renderModal(); };
  MF.tpClear = m => { const n = (A.pd(m.pid).tx || []).filter(t => t.status === 'plan').length; return A.modalShell('Borrar el plan', '<p>Se quitan <b>' + n + ' tratamientos pendientes</b> y se borran la evaluación y las observaciones. Las fases vuelven a la plantilla.</p><p class="hint">Lo que ya está realizado, los presupuestos y los cobros no se tocan.</p>', '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn danger" data-act="tpClearGo">Borrar el plan</button>'); };
  A.acts.tpClearGo = () => { const pid = S.modal.pid, pd = A.pd(pid); (pd.tx || []).forEach(t => { if (t.status === 'plan') t.status = 'anulado'; }); delete pd.tplan; A.touchPd(pid); A.closeModal(); A.refresh(); A.toast('Plan borrado.'); };

  /* presupuestos */
  A.acts.tpBudNew = () => {
    const pid = pidNow(), pd = A.pd(pid), pend = (pd.tx || []).filter(t => t.status === 'plan'), chk = sel[pid] || {}, picked = pend.filter(t => chk[t.id]);
    S.modal = { type: 'budget', pid, f: { ids: (picked.length ? picked : pend).map(t => t.id), disc: 0, valid: 30, cuotas: 1, anticipo: 0, notes: '' } }; A.renderModal();
  };
  A.acts.tpBudPdf = el => { S.modal = { type: 'budgetView', pid: pidNow(), bid: el.getAttribute('data-id') }; A.acts.pdfBudget(el); S.modal = null; };
  A.acts.tpBudDelAsk = el => { S.modal = { type: 'tpBudDel', pid: pidNow(), bid: el.getAttribute('data-id') }; A.renderModal(); };
  MF.tpBudDel = m => {
    const b = (A.pd(m.pid).budgets || []).filter(x => x.id === m.bid)[0]; if (!b) return '';
    return A.modalShell('Borrar presupuesto ' + esc(b.num), '<p>Se borra el presupuesto ' + esc(b.num) + ' (' + A.money(b.total) + '). Los tratamientos siguen en el plan.</p>' + (b.status === 'aceptado' ? '<p class="hint bad">Está aceptado y firmado: el documento firmado se conserva en «Documentos» y los cobros no se tocan.</p>' : ''),
      '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn danger" data-act="tpBudDelGo">Borrar</button>');
  };
  A.acts.tpBudDelGo = () => { const m = S.modal, pd = A.pd(m.pid); pd.budgets = (pd.budgets || []).filter(b => b.id !== m.bid); (pd.tx || []).forEach(t => { if (t.bid === m.bid) t.bid = null; }); A.touchPd(m.pid); A.closeModal(); A.refresh(); A.toast('Presupuesto borrado.'); };
  /* el detalle del presupuesto muestra qué se hizo de cada tratamiento */
  const bvPrev = MF.budgetView;
  MF.budgetView = m => {
    const h = bvPrev(m), pd = A.pd(m.pid), b = (pd.budgets || []).filter(x => x.id === m.bid)[0]; if (!b || !h) return h;
    const rows = (b.items || []).map(i => { const t = (pd.tx || []).filter(x => x.id === i.txId)[0], done = t && t.status === 'hecho'; return '<tr><td>' + (done ? '✓' : '') + '</td><td>' + esc(i.label) + '</td><td>' + (done ? '<span class="chip ok">hecho ' + A.fmtDMY(t.doneDate) + '</span>' : t && t.status === 'anulado' ? '<span class="chip bad">quitado</span>' : '<span class="chip">falta</span>') + '</td></tr>'; }).join('');
    const blk = '<div class="block"><h3>Avance del tratamiento</h3><table class="tbl"><tbody>' + rows + '</tbody></table></div>';
    return h.replace('<div class="block"><h3>Cronograma de pagos</h3>', blk + '<div class="block"><h3>Cronograma de pagos</h3>');
  };

  /* ---------- logo del consultorio ---------- */
  A.chg.tpLogo = el => {
    const f = el.files && el.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => {
      const k = Math.min(1, 480 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
      const png = /png|svg|webp|gif/i.test(f.type), src = png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.88);
      A.CFG.logo = { src, w: c.width, h: c.height }; A.save(); A.refresh(); A.toast('Logo guardado: sale en todos los PDF.');
    }; img.onerror = () => A.toast('No se pudo leer esa imagen.'); img.src = r.result; };
    r.readAsDataURL(f);
  };
  A.acts.tpLogoDel = () => { delete A.CFG.logo; A.save(); A.refresh(); A.toast('Logo quitado.'); };

  /* ---------- PDF y WhatsApp del plan ---------- */
  function buildPlanPdf(pid) {
    const pat = A.PAT(pid), p = tp(pid), list = items(pid), T = totals(list), o = A.pdfDoc_ && A.pdfDoc_('Plan de tratamiento'); if (!o) return null;
    o.head('Plan de tratamiento', 'Propuesta de tratamiento según la evaluación clínica.', pat, 'Fecha: ' + A.fmtDMY(A.today()) + ' · ' + A.PRO(pat.pro).name);
    if (p.dx) { o.h('Evaluación'); o.p(p.dx); }
    p.phases.forEach(f => {
      const L = list.filter(x => x.ph === f.id); if (!L.length) return;
      o.h(f.name);
      const cols = [{ h: 'Tratamiento', w: 110 }, { h: 'Estado', w: 34 }].concat(p.prices ? [{ h: 'Costo', w: 30, a: 'r' }] : []);
      o.table(cols, L.map(x => [x.t.label, x.t.status === 'hecho' ? 'Hecho ' + A.fmtDMY(x.t.doneDate) : 'Pendiente'].concat(p.prices ? [A.money(x.t.price || 0)] : [])));
    });
    if (!list.length) o.p('Todavía no hay tratamientos cargados en el plan.');
    if (p.prices && T.n) o.rows([['Total del plan', A.money(T.tot)], ['Realizado', A.money(T.done)], ['Falta', A.money(T.tot - T.done)]]);
    if (p.notes) { o.h('Indicaciones y observaciones'); o.p(p.notes); }
    o.p('Este plan es una propuesta orientativa: puede ajustarse según la evolución del tratamiento.' + (p.prices ? ' Los costos son de referencia; para el detalle de pago se arma un presupuesto.' : ''), 8.5, [96, 116, 124]);
    o.y += 4; o.sigs([{ role: 'Profesional', name: A.PRO(pat.pro).name, mat: A.PRO(pat.pro).mat }]);
    return { o, name: 'plan-de-tratamiento-' + N(pat.last).replace(/[^a-z0-9]+/g, '-') + '-' + A.today() + '.pdf' };
  }
  /* arma el archivo sin descargarlo (para compartirlo) */
  async function planBlob(pid) {
    const r = buildPlanPdf(pid); if (!r) return null; const save = A.saveFile; let got = null;
    A.saveFile = (name, blob) => { got = { name, blob }; return Promise.resolve(true); };
    try { await r.o.finish(r.name); } finally { A.saveFile = save; }
    return got;
  }
  A.acts.pdfPlanTp = () => { const r = buildPlanPdf(pidNow()); if (r) r.o.finish(r.name); };
  function waText(pid) {
    const pat = A.PAT(pid), p = tp(pid), list = items(pid).filter(x => x.t.status !== 'hecho'), T = totals(items(pid));
    let t = 'Hola ' + (pat.first || pat.name) + ', te paso el plan de tratamiento que conversamos:\n';
    p.phases.forEach(f => { const L = list.filter(x => x.ph === f.id); if (!L.length) return; t += '\n*' + f.name + '*\n' + L.map(x => '• ' + x.t.label + (p.prices && x.t.price ? ' — ' + A.money(x.t.price) : '')).join('\n') + '\n'; });
    if (!list.length) t += '\nYa está todo realizado. ¡Gracias!\n';
    if (p.prices && T.tot - T.done > 0) t += '\nTotal estimado de lo que falta: ' + A.money(T.tot - T.done) + '\n';
    if (p.notes) t += '\n' + p.notes + '\n';
    return t + '\n' + A.CLINIC;
  }
  A.acts.tpWa = async () => {
    const pid = pidNow(), pat = A.PAT(pid), txt = waText(pid);
    const f = await planBlob(pid); if (!f) return;
    const file = typeof File === 'function' ? new File([f.blob], f.name, { type: 'application/pdf' }) : null;
    /* en el teléfono: se comparte el PDF y se elige WhatsApp */
    if (window.OV_NATIVE) { A.saveFile(f.name, f.blob); return; }
    if (file && navigator.canShare && navigator.canShare({ files: [file] }) && /android|iphone|ipad/i.test(navigator.userAgent)) {
      try { await navigator.share({ files: [file], text: txt, title: 'Plan de tratamiento' }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    /* en la PC: se descarga el PDF y se abre el chat del paciente con el resumen escrito, para adjuntarlo */
    await A.saveFile(f.name, f.blob);
    const link = A.waLink ? A.waLink(pat.phone, txt) : '';
    if (link) { window.open(link, '_blank', 'noopener'); A.toast('Se descargó el PDF y se abrió el chat de ' + (pat.first || pat.name) + ': adjuntalo con el clip.'); }
    else { S.modal = { type: 'tpWaNo', txt }; A.renderModal(); }
  };
  MF.tpWaNo = m => A.modalShell('Enviar por WhatsApp', '<p>El paciente no tiene teléfono cargado. Ya se descargó el PDF: copiá el mensaje y mandalo con el archivo.</p><textarea class="inp" rows="8" readonly>' + esc(m.txt) + '</textarea>',
    '<button class="btn" data-act="copyText" data-text="' + esc(m.txt) + '">Copiar mensaje</button><button class="btn primary" data-act="closeModal">Listo</button>');

  /* =====================================================================
     FOTOS EN GRANDE: visor a pantalla completa con zoom (pellizcar, rueda o doble toque) y pasar de foto
     ===================================================================== */
  const LB = { list: [], i: 0, z: 1, x: 0, y: 0 };
  const lbEl = () => $('#ovLbx');
  function lbOpen(pid, id) {
    const all = ((A.pd(pid).images) || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    LB.pid = pid; LB.list = all; LB.i = Math.max(0, all.findIndex(x => x.id === id)); lbShow();
  }
  function lbShow() {
    const im = LB.list[LB.i]; if (!im) return; LB.z = 1; LB.x = 0; LB.y = 0;
    let el = lbEl(); if (!el) { el = document.createElement('div'); el.id = 'ovLbx'; el.className = 'lbx'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Imagen en grande'); document.body.appendChild(el); bindLb(el); }
    const kn = (A.IMG_KINDS && A.IMG_KINDS[im.kind]) || '';
    el.innerHTML = '<div class="lbx-top"><span><b>' + esc(kn) + '</b> · ' + A.fmtDMY(im.date) + (im.tooth ? ' · pieza ' + im.tooth : '') + (im.note ? ' · ' + esc(im.note) : '') + ' <small>' + (LB.i + 1) + ' de ' + LB.list.length + '</small></span>' +
      '<span class="lbx-b"><button data-act="lbxZoom" data-d="-1" aria-label="Alejar">−</button><button data-act="lbxZoom" data-d="1" aria-label="Acercar">+</button><button data-act="lbxInfo">Detalles</button><button data-act="lbxClose" aria-label="Cerrar">✕</button></span></div>' +
      '<div class="lbx-stage"><img id="lbxImg" alt="' + esc(kn) + '" src="' + esc(im.thumb) + '" draggable="false"></div>' +
      (LB.list.length > 1 ? '<button class="lbx-nav l" data-act="lbxGo" data-d="-1" aria-label="Anterior">‹</button><button class="lbx-nav r" data-act="lbxGo" data-d="1" aria-label="Siguiente">›</button>' : '') +
      '<div class="lbx-hint">Pellizcá o usá la rueda para acercar · doble toque para volver</div>';
    document.body.classList.add('lbx-open'); el.hidden = false;
    A.media.get(im.id).then(d => { const i = $('#lbxImg'); if (d && i && LB.list[LB.i] === im) i.src = d; });
  }
  const lbApply = () => { const i = $('#lbxImg'); if (i) i.style.transform = 'translate(' + LB.x + 'px,' + LB.y + 'px) scale(' + LB.z + ')'; };
  const lbZoom = (z, cx, cy) => { const nz = Math.max(1, Math.min(6, z)); if (nz === 1) { LB.x = 0; LB.y = 0; } LB.z = nz; lbApply(); };
  function lbClose() { const el = lbEl(); if (el) { el.hidden = true; el.innerHTML = ''; } document.body.classList.remove('lbx-open'); }
  function bindLb(el) {
    const pts = new Map(); let start = null;
    el.addEventListener('wheel', e => { e.preventDefault(); lbZoom(LB.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); }, { passive: false });
    el.addEventListener('pointerdown', e => { if (!e.target.closest('.lbx-stage')) return; el.setPointerCapture && el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); start = { x: LB.x, y: LB.y, z: LB.z, px: e.clientX, py: e.clientY, d: pts.size === 2 ? dist() : 0, t: Date.now() }; });
    const dist = () => { const a = Array.from(pts.values()); return a.length < 2 ? 0 : Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
    el.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId) || !start) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { if (!start.d) start.d = dist(); lbZoom(start.z * dist() / (start.d || 1)); return; }
      if (LB.z > 1) { LB.x = start.x + e.clientX - start.px; LB.y = start.y + e.clientY - start.py; lbApply(); }
    });
    const up = e => {
      if (!pts.has(e.pointerId)) return; const p = pts.get(e.pointerId); pts.delete(e.pointerId);
      if (start && LB.z === 1 && pts.size === 0) { const dx = p.x - start.px, dy = p.y - start.py; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) lbGo(dx < 0 ? 1 : -1); else if (dy > 110 && Math.abs(dy) > Math.abs(dx) * 1.5) lbClose(); }
      if (pts.size === 0) start = null;
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    let lastTap = 0; el.addEventListener('click', e => { if (!e.target.closest('.lbx-stage')) return; const n = Date.now(); if (n - lastTap < 320) { lbZoom(LB.z > 1 ? 1 : 2.5); } lastTap = n; });
  }
  const lbGo = d => { if (!LB.list.length) return; LB.i = (LB.i + d + LB.list.length) % LB.list.length; lbShow(); };
  A.acts.lbxGo = el => lbGo(+el.getAttribute('data-d'));
  A.acts.lbxZoom = el => lbZoom(LB.z * (+el.getAttribute('data-d') > 0 ? 1.5 : 1 / 1.5));
  A.acts.lbxClose = () => lbClose();
  A.acts.lbxInfo = () => { const im = LB.list[LB.i]; lbClose(); if (im) { S.modal = { type: 'img', pid: LB.pid, id: im.id }; A.renderModal(); } };
  document.addEventListener('keydown', e => { const el = lbEl(); if (!el || el.hidden) return; if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); lbClose(); } else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); lbGo(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); lbGo(-1); } }, true);
  /* tocar una foto de la galería la abre en grande; en el detalle, tocar la imagen también */
  const imOpenPrev = A.acts.imOpen;
  A.acts.imOpen = el => { const pid = S.fichaPid, id = el.getAttribute('data-id'); if (pid && id) lbOpen(pid, id); else imOpenPrev(el); };
  const imgPrev = MF.img;
  MF.img = m => { const h = imgPrev(m); return h ? h.replace('<img id="imBig"', '<img id="imBig" data-act="lbxFrom" data-id="' + esc(m.id) + '" style="cursor:zoom-in" title="Ver en grande"') .replace('<button class="btn" data-act="imDownload"', '<button class="btn" data-act="lbxFrom" data-id="' + esc(m.id) + '">Ver en grande</button><button class="btn" data-act="imDownload"') : h; };
  A.acts.lbxFrom = el => { const pid = S.modal && S.modal.pid, id = el.getAttribute('data-id'); A.closeModal(); if (pid) lbOpen(pid, id); };

  /* =====================================================================
     HORA DE LLEGADA: al marcar «Llegó» se guarda la hora exacta (y la de «En atención»)
     ===================================================================== */
  const hhmm = () => { const d = new Date(); return A.pad(d.getHours()) + ':' + A.pad(d.getMinutes()); };
  const toMin = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };
  const mutPrev = A.mutate;
  A.mutate = (keys, fn, msg) => {
    const before = {}; (keys || []).forEach(k => A.day(k).forEach(a => { before[a.id] = a.status; }));
    return mutPrev(keys, () => {
      fn();
      const today = A.today();
      (keys || []).forEach(k => A.day(k).forEach(a => {
        const was = before[a.id]; if (was === a.status) return;
        if (a.status === 'llego' && k === today && !a.arr) a.arr = hhmm();
        if (a.status === 'en-atencion' && k === today) { if (!a.inAt) a.inAt = hhmm(); }
        if (a.status === 'pendiente' || a.status === 'confirmado' || a.status === 'cancelado' || a.status === 'ausente') { delete a.arr; delete a.inAt; }
      }));
    }, msg);
  };
  const late = a => { const m = toMin(a.arr); return m == null ? 0 : m - a.start; };
  A.arrivalHTML = a => {
    if (!a || !a.arr) return '';
    const d = late(a), cls = d >= 10 ? ' late' : d <= -5 ? ' early' : '';
    return '<span class="arr' + cls + '" title="Llegó a las ' + esc(a.arr) + (d ? ' (' + (d > 0 ? d + ' min tarde' : -d + ' min antes') + ')' : '') + '">Llegó ' + esc(a.arr) + (d >= 5 ? ' · +' + d + '′' : '') + '</span>' + (a.inAt ? '<span class="arr in">Pasó ' + esc(a.inAt) + '</span>' : '');
  };
  const senaPrev = A.senaBadge;
  if (senaPrev) A.senaBadge = a => A.arrivalHTML(a) + senaPrev(a);
  const stPrev = MF.stMenu;
  if (stPrev) MF.stMenu = m => { const h = stPrev(m), a = A.apptById(m.id); return a && a.arr && h ? h.replace('</span></div>', '</span>' + A.arrivalHTML(a) + '</div>') : h; };
  const rpPrev = A.renderPanel;
  if (rpPrev) A.renderPanel = function () { const r = rpPrev.apply(this, arguments); try { const a = S.panel && S.panel.id && A.apptById(S.panel.id), sub = document.querySelector('.panel .panel-head .sub'); if (a && a.arr && sub && !sub.querySelector('.arr')) sub.insertAdjacentHTML('beforeend', ' ' + A.arrivalHTML(a)); } catch (e) { /* nada */ } return r; };

  /* =====================================================================
     AGENDA EN LA WEB: la tira de días se arrastra con el mouse, tiene flechas
     y la agenda del día se puede arrastrar hacia los costados (como en el celular)
     ===================================================================== */
  const mouse = () => window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function decorateStrip() {
    const st = $('#dayStrip'); if (!st || st.parentNode.classList.contains('ds-wrap')) return;
    const w = document.createElement('div'); w.className = 'ds-wrap'; st.parentNode.insertBefore(w, st); w.appendChild(st);
    w.insertAdjacentHTML('afterbegin', '<button class="ds-arr l" data-act="agStrip" data-d="-1" aria-label="Ver días anteriores">‹</button>');
    w.insertAdjacentHTML('beforeend', '<button class="ds-arr r" data-act="agStrip" data-d="1" aria-label="Ver días siguientes">›</button>');
    const hint = w.nextElementSibling; if (hint && hint.classList.contains('swipe-hint') && mouse()) hint.textContent = 'Arrastrá los días con el mouse, usá las flechas o las teclas ← → para cambiar de día.';
    const upd = () => { w.classList.toggle('at-start', st.scrollLeft < 4); w.classList.toggle('at-end', st.scrollLeft > st.scrollWidth - st.clientWidth - 4); };
    st.addEventListener('scroll', upd, { passive: true }); upd();
    /* la rueda del mouse mueve la tira de costado */
    st.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { st.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    /* arrastrar con el mouse */
    let d = null;
    st.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; d = { x: e.clientX, l: st.scrollLeft, moved: false }; });
    window.addEventListener('pointermove', e => { if (!d) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 4) { d.moved = true; st.classList.add('dragging'); } if (d.moved) st.scrollLeft = d.l - dx; });
    window.addEventListener('pointerup', () => { if (!d) return; const moved = d.moved; d = null; st.classList.remove('dragging'); if (moved) { const stop = ev => { ev.stopPropagation(); ev.preventDefault(); }; st.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => st.removeEventListener('click', stop, true), 60); } });
  }
  A.acts.agStrip = el => { const st = $('#dayStrip'); if (st) st.scrollBy({ left: (+el.getAttribute('data-d')) * Math.max(200, st.clientWidth * 0.8), behavior: 'smooth' }); };
  /* arrastrar la agenda del día con el mouse para pasar al día anterior o siguiente */
  (function () {
    let g = null;
    document.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || S.tab !== 'agenda' || S.view !== 'dia' || S.modal || S.panel) return;
      const t = e.target; if (!t.closest || !t.closest('#gridWrap') || t.closest('.blk,[data-grip],button,input,select,textarea,a')) return;
      const gw = t.closest('#gridWrap'); g = { x: e.clientX, y: e.clientY, l: gw.scrollLeft, max: gw.scrollWidth - gw.clientWidth };
    });
    document.addEventListener('pointerup', e => {
      if (!g) return; const dx = e.clientX - g.x, dy = e.clientY - g.y, s = g; g = null;
      if (Math.abs(dx) < 90 || Math.abs(dx) < Math.abs(dy) * 2) return;
      if (s.max > 4 && ((dx < 0 && s.l < s.max - 4) || (dx > 0 && s.l > 4))) return;
      if (A.agShift) A.agShift(dx < 0 ? 1 : -1);
      const sup = ev => { ev.stopPropagation(); ev.preventDefault(); }; document.addEventListener('click', sup, { capture: true, once: true }); setTimeout(() => document.removeEventListener('click', sup, true), 60);
    });
  })();
  const afterPrev = A.afterRefresh; A.afterRefresh = () => { if (afterPrev) afterPrev(); try { if (S.tab === 'agenda') decorateStrip(); } catch (e) { if (A.logError) A.logError('strip', e); } };

  /* ---------- estilos ---------- */
  const css = document.createElement('style');
  css.textContent =
    '.tp-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.tp-head h2{margin:0}' +
    '.tp-prog{display:flex;align-items:center;gap:10px;margin:10px 0;font-size:14px;color:var(--ink-2)}.tp-bar{flex:1;height:8px;border-radius:99px;background:var(--line);overflow:hidden}.tp-bar i{display:block;height:100%;background:#2e8b57}' +
    '.tp-sec,.tp-guide{margin:8px 0;border:1px solid var(--line);border-radius:10px;padding:8px 12px}.tp-sec summary,.tp-guide summary{cursor:pointer;font-weight:700}.tp-sec .field{margin-top:8px}.tp-guide ol{margin:8px 0 4px;padding-left:20px;display:grid;gap:6px;font-size:14px}' +
    '.tp-ph{border-top:1px solid var(--line);padding:10px 0 6px;margin-top:6px}.tp-phh{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.tp-phn{font:700 16px inherit;border:1px solid transparent;border-radius:6px;padding:4px 6px;background:transparent;color:inherit;min-width:0;flex:1 1 180px}.tp-phn:hover,.tp-phn:focus{border-color:var(--line)}' +
    '.tp-pha{display:flex;gap:10px}.tp-hint{font-size:13px;color:var(--ink-2);margin:2px 6px 6px}' +
    '.tp-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}.tp-it{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid var(--line);border-radius:10px;flex-wrap:wrap}.tp-it.done{background:color-mix(in srgb,#2e8b57 8%,transparent)}.tp-it.done .tp-lbl{text-decoration:line-through;text-decoration-color:color-mix(in srgb,currentColor 35%,transparent)}' +
    '.tp-ok{color:#2e8b57;font-weight:800;width:18px;text-align:center}.tp-main{flex:1 1 220px;min-width:0}.tp-lbl{width:100%;font:inherit;font-weight:600;border:1px solid transparent;border-radius:6px;padding:3px 5px;background:transparent;color:inherit}.tp-lbl:hover,.tp-lbl:focus{border-color:var(--line)}' +
    '.tp-meta{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:12.5px;margin-top:2px}.tp-meta select{font:inherit;font-size:12.5px;border:1px solid var(--line);border-radius:6px;padding:2px 4px;background:transparent;color:inherit;max-width:170px}' +
    '.tp-pr{width:96px;text-align:right;font:inherit;font-family:var(--f-mono);border:1px solid var(--line);border-radius:6px;padding:6px}.tp-acts{display:flex;gap:10px;align-items:center}.tp-add{margin-top:6px}' +
    '.lnk{background:none;border:0;padding:4px 0;font:inherit;font-size:13px;color:var(--accent,#0d6b6b);cursor:pointer;text-decoration:underline;min-height:28px}.lnk.bad{color:var(--pat,#b3261e)}' +
    '.tp-logo{display:flex;gap:12px;align-items:center;margin-top:14px;padding:10px;border:1px dashed var(--line);border-radius:10px}.tp-logo img{max-width:110px;max-height:60px;object-fit:contain;background:#fff;border-radius:6px;padding:4px}.tp-logo>div{display:flex;flex-direction:column;gap:4px}.tp-nologo{width:110px;height:56px;display:grid;place-items:center;border-radius:6px;background:var(--line);font-size:12px;color:var(--ink-2)}' +
    '.tp-bud{display:flex;flex-direction:column;gap:8px}.tp-b{border:1px solid var(--line);border-radius:10px;padding:10px}.tp-bt{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.tp-bm{margin-left:auto;font-family:var(--f-mono);font-weight:700}.tp-bs{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--ink-2);margin:4px 0}' +
    '@media (max-width:640px){.tp-pr{width:84px}.tp-acts{margin-left:auto}}' +
    /* visor de fotos */
    'body.lbx-open{overflow:hidden}.lbx{position:fixed;inset:0;z-index:9999;background:rgba(8,12,14,.96);color:#fff;display:flex;flex-direction:column;touch-action:none}.lbx[hidden]{display:none}' +
    '.lbx-top{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;font-size:14px;flex-wrap:wrap}.lbx-top small{opacity:.7;margin-left:6px}.lbx-b{display:flex;gap:6px}.lbx-b button,.lbx-nav{background:rgba(255,255,255,.14);color:#fff;border:0;border-radius:99px;min-width:42px;height:42px;padding:0 14px;font:inherit;font-size:16px;cursor:pointer}' +
    '.lbx-stage{flex:1;display:grid;place-items:center;overflow:hidden;cursor:grab}.lbx-stage img{max-width:100%;max-height:100%;object-fit:contain;transform-origin:center;transition:transform .05s linear;user-select:none;-webkit-user-drag:none}' +
    '.lbx-nav{position:absolute;top:50%;transform:translateY(-50%);font-size:28px;width:48px;height:64px;border-radius:12px}.lbx-nav.l{left:10px}.lbx-nav.r{right:10px}.lbx-hint{text-align:center;font-size:12px;opacity:.6;padding:6px}' +
    /* llegada */
    '.arr{display:inline-block;font:700 11px var(--f-mono,monospace);background:#dbeafe;color:#1e3a8a;border-radius:6px;padding:1px 6px;margin-right:4px}.arr.late{background:#fde2e1;color:#8a1c14}.arr.early{background:#dcfce7;color:#14532d}.arr.in{background:#ede9fe;color:#4c1d95}' +
    /* tira de días */
    '.ds-wrap{position:relative;display:flex;align-items:center;gap:6px}.ds-wrap #dayStrip{flex:1;min-width:0}.ds-arr{flex:0 0 auto;width:34px;height:58px;border-radius:10px;border:1px solid var(--line);background:var(--surface,#fff);color:inherit;font-size:22px;cursor:pointer}.ds-wrap.at-start .ds-arr.l,.ds-wrap.at-end .ds-arr.r{opacity:.35}' +
    '#dayStrip.dragging{cursor:grabbing;user-select:none}@media (hover:hover) and (pointer:fine){#dayStrip{cursor:grab}}@media (hover:none){.ds-arr{display:none}}';
  document.head.appendChild(css);
})();
