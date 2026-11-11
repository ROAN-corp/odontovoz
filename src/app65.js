/* ===== 1.47: acuerdo de cada profesional con el centro (porcentaje con excepciones, módulo, consultorio entero, otro) y liquidación sobre lo cobrado ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const money = n => A.money(n || 0);
  const canCfg = () => !A.isMember || !A.isMember() || (A.mbRole && A.mbRole() === 'admin');
  const MODES = [
    ['pct', 'Porcentaje de lo que trabaja'],
    ['mod', 'Alquila un módulo (se queda con todo y paga el módulo)'],
    ['pctmod', 'Porcentaje + módulo'],
    ['alq', 'Alquila el consultorio entero (monto fijo por mes)'],
    ['otro', 'Otro acuerdo']
  ];
  const BY = [['hora', 'por hora'], ['turno', 'por turno'], ['dia', 'por día']];
  const cfgOf = pid => { const c = A.liqCfg(pid); c.rules = c.rules || []; return c; };
  const baseOf = c => c.base || 'cobrado';
  const num = v => parseInt(String(v || '').replace(/\D/g, ''), 10) || 0;
  const pctNum = v => Math.min(100, Math.max(0, parseFloat(String(v).replace(',', '.')) || 0));

  /* ---------- el acuerdo, en palabras (para la lista y la liquidación) ---------- */
  A.liqDeal = pid => {
    const c = cfgOf(pid), mode = c.mode || 'pct', ex = c.rules.map(r => r.key + ' ' + r.pct + '%').join(', ');
    const pc = c.pct + '% para el profesional' + (ex ? ' (' + ex + ')' : '');
    const md = c.mod && c.mod.price ? money(c.mod.price) + ' ' + ((BY.filter(x => x[0] === c.mod.by)[0] || BY[0])[1]) : 'módulo sin valor';
    const t = mode === 'pct' ? pc : mode === 'mod' ? 'Alquila módulo: ' + md : mode === 'pctmod' ? pc + ' + módulo ' + md
      : mode === 'alq' ? 'Alquila el consultorio: ' + money((c.alq || {}).price) + ' por mes' : 'Otro: ' + ((c.otro || {}).txt || 'sin detalle');
    return t + (mode === 'alq' || mode === 'mod' ? '' : baseOf(c) === 'cobrado' ? ' · sobre lo cobrado' : ' · sobre lo facturado');
  };

  /* ---------- el formulario del acuerdo (mismo en «Profesionales» y en Liquidaciones) ---------- */
  function dealHTML(pid) {
    const c = cfgOf(pid), mode = c.mode || 'pct', mod = c.mod || { by: 'hora', price: 0 }, cats = A.catCats ? A.catCats() : [];
    const D = 'data-id="' + pid + '"';
    let h = '<div class="dl-box"><div class="field"><label for="dlMode">Cómo trabaja con el centro</label><select id="dlMode" data-chg="dlSet" data-f="mode" ' + D + '>' +
      MODES.map(x => '<option value="' + x[0] + '"' + (x[0] === mode ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></div>';
    if (mode === 'pct' || mode === 'pctmod' || mode === 'otro') {
      h += '<div class="row2"><div class="field"><label for="dlPct">Porcentaje para el profesional</label><div class="pct-in"><input id="dlPct" inputmode="decimal" data-chg="dlSet" data-f="pct" ' + D + ' value="' + (c.pct != null ? c.pct : 40) + '"><span>%</span></div></div>' +
        '<div class="field"><label>Sobre qué se calcula</label><div class="seg" role="group"><button data-act="dlBase" data-v="cobrado" ' + D + ' aria-pressed="' + (baseOf(c) === 'cobrado') + '">Lo cobrado</button><button data-act="dlBase" data-v="facturado" ' + D + ' aria-pressed="' + (baseOf(c) === 'facturado') + '">Lo facturado</button></div></div></div>';
      h += '<div class="dl-ex"><b>Excepciones</b>' + (c.rules.length ? '<ul>' + c.rules.map((r, i) => '<li><span>' + esc(r.key) + (r.t === 'pr' ? ' (práctica)' : '') + '</span><div class="pct-in sm"><input inputmode="decimal" data-chg="dlRulePct" data-i="' + i + '" ' + D + ' value="' + r.pct + '" aria-label="Porcentaje para ' + esc(r.key) + '"><span>%</span></div><button class="btn small ghost" data-act="dlRuleDel" data-i="' + i + '" ' + D + ' aria-label="Quitar">✕</button></li>').join('') + '</ul>' : '<div class="hint">Sin excepciones: todas las prácticas al mismo porcentaje.</div>') +
        '<div class="dl-add"><select id="dlCat" aria-label="Categoría">' + cats.map(k => '<option>' + esc(k) + '</option>').join('') + '</select><div class="pct-in sm"><input id="dlCatPct" inputmode="decimal" placeholder="60" aria-label="Porcentaje"><span>%</span></div><button class="btn small" data-act="dlRuleAdd" ' + D + '>+ Excepción</button></div>' +
        '<div class="hint">Ejemplo: 40% de todo y Ortodoncia al 60% (porque pone los materiales).</div></div>';
    }
    if (mode === 'mod' || mode === 'pctmod') {
      h += '<div class="row2"><div class="field"><label for="dlModBy">El módulo se paga</label><select id="dlModBy" data-chg="dlSet" data-f="modBy" ' + D + '>' + BY.map(x => '<option value="' + x[0] + '"' + (x[0] === mod.by ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="dlModP">Valor</label><input id="dlModP" inputmode="numeric" data-chg="dlSet" data-f="modPrice" ' + D + ' value="' + (mod.price || '') + '" placeholder="Ej.: 8000"></div></div>' +
        '<div class="hint">Las horas, turnos o días salen de la agenda y se descuentan solos en la liquidación.</div>';
    }
    if (mode === 'alq') {
      h += '<div class="field"><label for="dlAlq">Paga por mes</label><input id="dlAlq" inputmode="numeric" data-chg="dlSet" data-f="alq" ' + D + ' value="' + ((c.alq || {}).price || '') + '" placeholder="Ej.: 350000"></div>' +
        '<div class="hint">Se queda con todo lo que cobra y el alquiler se descuenta solo en su liquidación.</div>';
    }
    if (mode === 'otro') {
      h += '<div class="field"><label for="dlTxt">Cómo es el acuerdo</label><textarea id="dlTxt" rows="2" data-chg="dlSet" data-f="txt" ' + D + ' placeholder="Ej.: 50% de lo cobrado y el laboratorio a medias">' + esc((c.otro || {}).txt || '') + '</textarea></div>' +
        '<div class="field"><label for="dlFix">Además paga por mes (opcional)</label><input id="dlFix" inputmode="numeric" data-chg="dlSet" data-f="fix" ' + D + ' value="' + ((c.otro || {}).fix || '') + '" placeholder="0"></div>';
    }
    return h + '<div id="dlMsg" class="m-msg"></div></div>';
  }
  A.liqDealHTML = dealHTML;
  const redraw = () => {
    A.save();
    if (S.modal) { const b = $('.m-body'), t = b ? b.scrollTop : 0; A.renderModal(); const b2 = $('.m-body'); if (b2) b2.scrollTop = t; } else A.refresh();
  };
  A.chg.dlSet = el => {
    const c = cfgOf(el.getAttribute('data-id')), f = el.getAttribute('data-f'), v = el.value;
    if (f === 'mode') { c.mode = v; if (v === 'mod' || v === 'pctmod') c.mod = c.mod || { by: 'hora', price: 0 }; }
    else if (f === 'pct') c.pct = pctNum(v);
    else if (f === 'modBy') { c.mod = c.mod || {}; c.mod.by = v; }
    else if (f === 'modPrice') { c.mod = c.mod || { by: 'hora' }; c.mod.price = num(v); }
    else if (f === 'alq') c.alq = { price: num(v) };
    else if (f === 'txt') { c.otro = c.otro || {}; c.otro.txt = v.trim(); }
    else if (f === 'fix') { c.otro = c.otro || {}; c.otro.fix = num(v); }
    redraw();
  };
  A.acts.dlBase = el => { cfgOf(el.getAttribute('data-id')).base = el.getAttribute('data-v'); redraw(); };
  A.chg.dlRulePct = el => { const c = cfgOf(el.getAttribute('data-id')), r = c.rules[+el.getAttribute('data-i')]; if (r) r.pct = pctNum(el.value); redraw(); };
  A.acts.dlRuleDel = el => { cfgOf(el.getAttribute('data-id')).rules.splice(+el.getAttribute('data-i'), 1); redraw(); };
  A.acts.dlRuleAdd = el => {
    const c = cfgOf(el.getAttribute('data-id')), k = ($('#dlCat') || {}).value, p = ($('#dlCatPct') || {}).value;
    if (!k || p === '' || isNaN(parseFloat(String(p).replace(',', '.')))) { const m = $('#dlMsg'); if (m) m.textContent = 'Elegí la categoría y poné el porcentaje.'; return; }
    const i = c.rules.findIndex(r => r.t === 'cat' && r.key === k), r = { t: 'cat', key: k, pct: pctNum(p) };
    if (i >= 0) c.rules[i] = r; else c.rules.push(r); redraw();
  };

  /* en el editor del profesional (Ajustes › Profesionales), antes de los horarios */
  const cfgPrev = MF.cfg;
  if (cfgPrev) MF.cfg = m => {
    const h = cfgPrev(m);
    if (!m || m.tab !== 'pros' || !m.sel || m.wiz || m.rm || !canCfg() || (A.liteOn && A.liteOn()) || !A.PRO(m.sel)) return h;
    const mark = '<div class="block"><h3>Días y horarios de atención</h3>';
    if (typeof h !== 'string' || h.indexOf(mark) < 0) return h;
    return h.replace(mark, '<div class="block"><h3>Acuerdo con el centro</h3><div class="hint">Cómo se reparte lo que trabaja. Se usa solo en la liquidación de cada mes.</div>' + dealHTML(m.sel) + '</div>' + mark);
  };

  /* ---------- lo cobrado de cada práctica ----------
     Cada pago se reparte entre las prácticas del paciente: primero las que eligió al cobrar (pcIds), después de la más vieja a la más nueva.
     Lo que paga la obra social cuenta cuando se marca «Llegó el pago» de ese mes. */
  let memo = null, memoAt = 0;
  A.cobAlloc = () => {
    if (memo && Date.now() - memoAt < 400) return memo;
    const out = [], osRows = {};
    if (A.osDue) A.osDue().forEach(r => { if (r.pay && r.amt > 0) osRows[r.os + '|' + r.month] = r; });
    A.allPids().forEach(pid => {
      const pd = A.pd(pid); if (!pd || !pd.ledger) return;
      const txCat = {}; (pd.tx || []).forEach(t => { txCat[t.id] = t.cat || null; });
      const name = (A.PAT(pid) || {}).name || (pd.prof && pd.prof.name) || 'Paciente';
      const cargos = pd.ledger.filter(e => e.type === 'cargo' && !e.voided && !e.anula).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      const left = {}; cargos.forEach(e => { left[e.id] = Math.max(0, +e.amount || 0); });
      const piece = (e, amt, date, via) => { if (amt > 0) out.push({ pid, patient: name, cargo: e, pro: e.pro || 'pr1', desc: e.desc, cat: (e.txId && txCat[e.txId]) || (A.catOf ? A.catOf({ desc: e.desc }) : ''), date, amount: amt, via }); };
      pd.ledger.filter(e => e.type === 'pago' && !e.voided && !e.anula).slice().sort((a, b) => (a.date < b.date ? -1 : 1)).forEach(p => {
        let av = +p.amount || 0;
        const first = (p.pcIds || []).map(id => cargos.filter(c => c.id === id)[0]).filter(Boolean);
        first.concat(cargos.filter(c => first.indexOf(c) < 0)).forEach(c => { if (av <= 0 || !(left[c.id] > 0)) return; const x = Math.min(av, left[c.id]); left[c.id] -= x; av -= x; piece(c, x, p.date, 'paciente'); });
      });
      cargos.forEach(c => {
        if (!c.os || !(+c.osCov > 0)) return; const r = osRows[c.os + '|' + c.date.slice(0, 7)]; if (!r) return;
        piece(c, Math.round(+c.osCov * Math.min(1, r.paid / r.amt)), r.pay.date, 'obra social');
      });
    });
    memo = out; memoAt = Date.now(); return out;
  };

  /* ---------- liquidación ---------- */
  const pctPrev = A.liqPctFor;
  A.liqPctFor = (pid, line) => { const md = cfgOf(pid).mode; return md === 'alq' ? { pct: 100, why: 'alquila el consultorio' } : pctPrev(pid, line); };
  const calcPrev = A.liqCalc;
  A.liqCalc = (pid, m) => {
    const c = calcPrev(pid, m), cfg = cfgOf(pid), mode = cfg.mode || 'pct';
    if (baseOf(cfg) === 'cobrado') {
      const lines = A.cobAlloc().filter(x => x.pro === pid && x.date.slice(0, 7) === m).map(x => {
        const ln = { date: x.date, pid: x.pid, patient: x.patient, desc: x.desc + (x.via === 'obra social' ? ' (pagó la obra social)' : ''), cat: x.cat, amount: x.amount };
        const r = A.liqPctFor(pid, ln); ln.pct = r.pct; ln.why = r.why; ln.dent = Math.round(ln.amount * ln.pct / 100); ln.center = ln.amount - ln.dent; return ln;
      }).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.patient < b.patient ? -1 : 1));
      const byCat = {}; lines.forEach(l => { const k = byCat[l.cat] || (byCat[l.cat] = { n: 0, amount: 0, dent: 0, center: 0 }); k.n++; k.amount += l.amount; k.dent += l.dent; k.center += l.center; });
      c.lines = lines; c.byCat = byCat; c.prod = lines.reduce((s, l) => s + l.amount, 0); c.dent = lines.reduce((s, l) => s + l.dent, 0);
      c.eff = c.prod ? Math.round(c.dent / c.prod * 1000) / 10 : 0; c.base = 'cobrado';
    }
    let fee = 0, why = '';
    if (mode === 'alq' && cfg.alq && cfg.alq.price > 0) { fee = cfg.alq.price; why = 'Alquiler del consultorio (mes)'; }
    if (mode === 'otro' && cfg.otro && cfg.otro.fix > 0) { fee = cfg.otro.fix; why = 'Monto fijo del acuerdo (mes)'; }
    if (fee) c.deds = [{ id: 'alquiler', auto: true, desc: why, amount: fee }].concat((c.deds || []).filter(d => d.id !== 'alquiler'));
    c.ded = (c.deds || []).reduce((s, d) => s + (+d.amount || 0), 0);
    c.center = c.prod - c.dent + (c.modFee || 0) + fee; c.net = c.dent - c.ded; c.deal = A.liqDeal(pid);
    return c;
  };

  /* en Liquidaciones: el acuerdo reemplaza al cuadro viejo de porcentajes, y «facturado» pasa a «cobrado» */
  const liqPrev = A.render.liq;
  A.render.liq = () => {
    liqPrev();
    const host = $('#view-liq'); if (!host) return;
    const pid = S.liq.pro && S.liq.pro !== 'all' ? S.liq.pro : null;
    if (pid && canCfg()) {
      const sec = Array.prototype.slice.call(host.querySelectorAll('section.card')).filter(s => /^Porcentajes de/.test((s.querySelector('h2') || {}).textContent || ''))[0];
      if (sec) sec.innerHTML = '<h2>Acuerdo de ' + esc((A.PRO(pid) || {}).short || '') + '</h2>' + dealHTML(pid);
    }
    host.querySelectorAll('[data-act="liqDedDel"][data-id="alquiler"]').forEach(b => { b.replaceWith(Object.assign(document.createElement('span'), { className: 'chip', textContent: 'automático' })); });
    const allCob = A.PROS.every(p => baseOf(cfgOf(p.id)) === 'cobrado');
    const one = pid ? baseOf(cfgOf(pid)) === 'cobrado' : allCob;
    host.querySelectorAll('th, td').forEach(n => {
      if (n.children.length) return;
      if (n.textContent === 'Facturado' && (one || n.closest('section.card') && !pid && allCob)) n.textContent = 'Cobrado';
      if (n.textContent === 'Total facturado' && one) n.textContent = 'Total cobrado en el mes';
    });
    if (one) host.querySelectorAll('.small-note, .hint, p').forEach(n => { if (/devengado/.test(n.textContent)) n.textContent = 'Se liquida sobre lo cobrado en el mes: cada pago se reparte entre las prácticas del paciente (primero las que se eligieron al cobrar, después las más viejas). Lo de las obras sociales entra cuando se marca «Llegó el pago». «Centro» es lo que queda para el dueño antes de gastos.'; });
    if (pid) {
      const h1 = host.querySelector('.ag-title small'); if (h1 && !host.querySelector('.dl-sum')) h1.insertAdjacentHTML('afterend', '<span class="dl-sum">' + esc(A.liqDeal(pid)) + '</span>');
    }
  };
  const txtPrev = A.liqText;
  if (txtPrev) A.liqText = (pid, m) => {
    let t = txtPrev(pid, m); const c = A.liqCalc(pid, m);
    if (c.base === 'cobrado') t = t.replace(/Total facturado/g, 'Total cobrado').replace(/facturado/g, 'cobrado');
    return t.replace(/\n/, '\nAcuerdo: ' + A.liqDeal(pid) + '\n');
  };

  const css = document.createElement('style');
  css.textContent = '.dl-box{display:flex;flex-direction:column;gap:8px}.dl-ex{border:1px solid var(--line);border-radius:12px;padding:10px}.dl-ex ul{list-style:none;margin:6px 0;padding:0}' +
    '.dl-ex li{display:flex;align-items:center;gap:8px;padding:4px 0}.dl-ex li>span{flex:1}.pct-in{display:flex;align-items:center;gap:4px}.pct-in input{width:80px}.pct-in.sm input{width:64px}' +
    '.dl-add{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:6px 0}.dl-add select{flex:1 1 140px;min-width:0}.dl-sum{display:block;font-size:.85rem;color:var(--muted,#667);font-weight:400}';
  document.head.appendChild(css);
})();
