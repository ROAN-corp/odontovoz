/* ===== 1.49: al cobrar, descuento o recargo libre según cómo paga, y cuotas (tarjeta o del consultorio); todo queda asentado ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const money = n => A.money(n || 0);
  const who = () => (A.actor && A.actor().who) || (A.memberNow && A.memberNow() && A.memberNow().name) || '';
  const pnum = v => { const n = parseFloat(String(v == null ? '' : v).replace(/\./g, '').replace(',', '.')); return isFinite(n) && n > 0 ? n : 0; };
  const r100 = n => Math.round(n / 100) * 100;
  const pctTxt = p => String(Math.round(p * 100) / 100).replace('.', ',') + '%';

  /* lo predeterminado por medio de pago (lo cambia el dueño o un administrador) */
  const DEF = () => A.CFG.payAdj || {};
  /* ajuste = { k: 'none' | 'desc' | 'rec' | 'cuo', p: %, n: cuotas, how: 'tarjeta' | 'propio' } */
  A.adjCalc = (base, adj) => {
    const a = adj || {}, p = pnum(a.p);
    if (a.k === 'desc') { const d = Math.min(base, Math.round(base * Math.min(p, 100) / 100)); return { delta: -d, total: base - d, txt: 'Descuento ' + pctTxt(Math.min(p, 100)) }; }
    if (a.k === 'rec') { const d = Math.round(base * p / 100); return { delta: d, total: base + d, txt: 'Recargo ' + pctTxt(p) }; }
    if (a.k === 'cuo') {
      const n = Math.max(2, parseInt(a.n, 10) || 3), d = Math.round(base * p / 100), tot = base + d, each = Math.ceil(tot / n);
      return { delta: d, total: tot, n, each, now: a.how === 'propio' ? each : tot, txt: n + ' cuotas' + (p ? ' con ' + pctTxt(p) + ' de interés' : ' sin interés') + (a.how === 'propio' ? ' (del consultorio)' : ' (tarjeta)') };
    }
    return { delta: 0, total: base, txt: '' };
  };
  const adjHTML = (base, adj, meth) => {
    const a = adj || { k: 'none' }, c = A.adjCalc(base, a), K = [['none', 'Precio de lista'], ['desc', 'Descuento'], ['rec', 'Recargo / interés'], ['cuo', 'En cuotas']];
    let h = '<div class="aj-box"><div class="aj-h">¿Cómo queda el precio' + (meth ? ' pagando con <b>' + esc(meth) + '</b>' : '') + '?</div><div class="seg aj-k" role="group">' + K.map(x => '<button type="button" data-act="ajK" data-k="' + x[0] + '" aria-pressed="' + (a.k === x[0]) + '">' + x[1] + '</button>').join('') + '</div>';
    if (a.k === 'desc' || a.k === 'rec' || a.k === 'cuo') {
      const chips = a.k === 'desc' ? [5, 10, 15, 20, 30, 50] : [5, 10, 15, 20, 30, 50, 100];
      h += '<div class="aj-row"><label>' + (a.k === 'desc' ? 'Descuento' : 'Interés / recargo') + '</label><span class="pct-in"><input inputmode="decimal" data-in="ajP" value="' + esc(a.p == null ? '' : a.p) + '" placeholder="0" aria-label="Porcentaje"><span>%</span></span>' + chips.map(n => '<button type="button" class="chip-ex" data-act="ajPc" data-p="' + n + '">' + n + '%</button>').join('') + '</div>';
    }
    if (a.k === 'cuo') {
      h += '<div class="aj-row"><label>Cuotas</label><select data-chg="ajN">' + [2, 3, 4, 5, 6, 9, 10, 12, 18, 24, 36].map(n => '<option' + (n === (+a.n || 3) ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>' +
        '<select data-chg="ajHow"><option value="tarjeta"' + (a.how !== 'propio' ? ' selected' : '') + '>Con tarjeta de crédito (se cobra todo hoy)</option><option value="propio"' + (a.how === 'propio' ? ' selected' : '') + '>Cuotas del consultorio (hoy paga la primera)</option></select></div>';
    }
    h += '<div class="aj-res" id="ajRes">' + resTxt(base, c) + '</div>';
    if (A.isBoss && A.isBoss() && meth && a.k !== 'none' && a.k !== 'cuo') h += '<label class="chk aj-def"><input type="checkbox" id="ajDef"> Usar siempre ' + (a.k === 'desc' ? 'este descuento' : 'este recargo') + ' con ' + esc(meth) + '</label>';
    return h + '</div>';
  };
  const resTxt = (base, c) => !c.delta ? 'Paga ' + money(base) + '.' : c.txt + ': ' + (c.delta < 0 ? '−' : '+') + money(Math.abs(c.delta)) + ' · total <b>' + money(c.total) + '</b>' + (c.n ? ' · ' + c.n + ' cuotas de ' + money(c.each) + (c.now !== c.total ? ' · hoy paga ' + money(c.now) : '') : '');

  /* ---------- en «Cobrar» de lo que quedó para cobrar en recepción ---------- */
  const isPc = () => S.modal && S.modal.type === 'pcPay';
  const isCb = () => S.modal && S.modal.type === 'cobro';
  const baseOf = m => isPc() ? (m.tot + (m.addPrev ? m.prev : 0)) : (m._cbBase || 0);
  const defFor = meth => { const d = DEF()[meth]; return d && d.k && d.k !== 'none' ? { k: d.k, p: d.p } : { k: 'none' }; };
  const pcPrev = MF.pcPay;
  if (pcPrev) MF.pcPay = m => {
    if (!m.adj) m.adj = defFor(m.m1);
    const base = m.tot + (m.addPrev ? m.prev : 0), c = A.adjCalc(base, m.adj);
    if (!m._adjSet || m._adjBase !== base || m._adjTot !== c.now) { m._adjSet = 1; m._adjBase = base; m._adjTot = c.n ? c.now : c.total; if (!m.split) m.a1 = m._adjTot; }
    let h = pcPrev(m);
    h = h.replace(/<div class="po-tot"><span>A cobrar<\/span><b>[^<]*<\/b><\/div>/, '<div class="po-tot"><span>A cobrar</span><b>' + money(base) + '</b></div>' + adjHTML(base, m.adj, m.m1));
    return h;
  };
  /* en «Registrar cobro» de la cuenta del paciente: el importe que se escribe es el precio de lista */
  const cbPrev = MF.cobro;
  MF.cobro = m => {
    const h = cbPrev(m); if (typeof h !== 'string') return h;
    if (m._cbBase == null) m._cbBase = pnum(m.amt);
    if (!m.adj) m.adj = { k: 'none' };
    return h.replace('<div id="mvMsg"', '<div id="ajHost">' + adjHTML(m._cbBase || 0, m.adj, m._cbMeth || '') + '</div><div id="mvMsg"');
  };
  document.addEventListener('input', e => { if (isCb() && e.target && e.target.id === 'mvAmt') { S.modal._cbBase = pnum(e.target.value); paint(); } }, true);
  document.addEventListener('change', e => { if (e.target && e.target.id === 'mvMeth' && isCb()) { S.modal._cbMeth = e.target.value; S.modal.adj = defFor(e.target.value); repaintCb(); } }, true);
  const repaintCb = () => { const host = $('#ajHost'); if (host) host.innerHTML = adjHTML(S.modal._cbBase || 0, S.modal.adj, S.modal._cbMeth || ''); };
  const paint = () => {
    const m = S.modal; if (!m) return; const base = baseOf(m), c = A.adjCalc(base, m.adj), r = $('#ajRes'); if (r) r.innerHTML = resTxt(base, c);
    if (isPc()) { const tot = c.n ? c.now : c.total; m._adjTot = tot; m._adjBase = base; if (!m.split) { m.a1 = tot; const i = $('[data-in="ppAmt"][data-k="a1"]'); if (i) i.value = tot; } }
  };
  const redraw = () => { if (isCb()) { repaintCb(); return; } const b = $('.m-body'), t = b ? b.scrollTop : 0; S.modal._adjSet = 0; A.renderModal(); const b2 = $('.m-body'); if (b2) b2.scrollTop = t; };
  A.acts.ajK = el => { const m = S.modal; const k = el.getAttribute('data-k'); m.adj = Object.assign({}, m.adj, { k }); if (k === 'cuo' && !m.adj.n) m.adj.n = 3; if (k === 'none') m.adj.p = ''; redraw(); };
  A.ins.ajP = el => { S.modal.adj.p = el.value; paint(); };
  A.acts.ajPc = el => { S.modal.adj.p = el.getAttribute('data-p'); redraw(); };
  A.chg.ajN = el => { S.modal.adj.n = +el.value; paint(); };
  A.chg.ajHow = el => { S.modal.adj.how = el.value; redraw(); };
  /* al cambiar el medio de pago, se propone el ajuste predeterminado de ese medio */
  const methPrev = A.chg.ppMeth;
  if (methPrev) A.chg.ppMeth = el => { methPrev(el); if (el.getAttribute('data-k') === 'm1') { S.modal.adj = defFor(el.value); redraw(); } };

  /* asienta el ajuste en la cuenta del paciente (y el plan de cuotas propio) */
  const book = (pid, base, adj, meth, extra) => {
    const c = A.adjCalc(base, adj); if (!c.delta && !(adj && adj.k === 'cuo')) return c;
    const pd = A.pd(pid), at = new Date().toISOString(), by = who();
    if (c.delta) pd.ledger.push(Object.assign({ id: A.uid(), date: A.today(), type: 'ajuste', amount: c.delta, desc: c.txt + ' sobre ' + money(base) + (meth ? ' · paga con ' + meth : ''), adj: { k: adj.k, p: pnum(adj.p), n: c.n || null, how: adj.how || null, base, meth: meth || '' }, by, at }, extra || {}));
    if (adj.k === 'cuo' && adj.how === 'propio') {
      const due = []; for (let i = 0; i < c.n; i++) due.push(A.add(A.today(), 30 * i));
      (pd.cuotas || (pd.cuotas = [])).push({ id: A.uid(), n: c.n, each: c.each, total: c.total, pct: pnum(adj.p), due, at, by, meth: meth || '' });
    }
    if (adj.k !== 'none' && document.getElementById('ajDef') && document.getElementById('ajDef').checked && meth) { A.CFG.payAdj = A.CFG.payAdj || {}; A.CFG.payAdj[meth] = { k: adj.k, p: pnum(adj.p) }; A.save(); }
    if (A.empAudit) A.empAudit(by + ' aplicó ' + c.txt + ' a ' + ((A.PAT(pid) || {}).name || '') + ' (' + money(base) + ' → ' + money(c.total) + ').');
    if (A.alog) A.alog(pid, 'ajuste', c.txt + ': ' + money(base) + ' → ' + money(c.total) + (meth ? ' (' + meth + ')' : ''));
    return c;
  };
  A.adjBook = book;
  const ppPrev = A.acts.ppGo;
  if (ppPrev) A.acts.ppGo = function () {
    const m = S.modal; if (!m || !m.adj || m.adj.k === 'none') return ppPrev.apply(this, arguments);
    A.$$('[data-in="ppAmt"]').forEach(i => { m[i.getAttribute('data-k')] = parseInt(String(i.value).replace(/\D/g, ''), 10) || 0; });
    const base = m.tot + (m.addPrev ? m.prev : 0), c = A.adjCalc(base, m.adj);
    if (!c.delta && m.adj.k !== 'cuo') return ppPrev.apply(this, arguments);
    book(m.pid, base, m.adj, m.m1, { pcIds: m.ids.slice() });
    /* lo que se considera «cobrado completo» pasa a ser el total con el ajuste (o la primera cuota) */
    m.tot = Math.max(0, (c.n ? c.now : c.total) - (m.addPrev ? m.prev : 0)); if (m.addPrev && c.n) m.addPrev = false;
    if (m.adj.k === 'cuo' && m.adj.how !== 'propio' && !/cr[eé]dito/i.test(m.m1)) m.m1 = 'Crédito';
    if (m.adj.k === 'cuo') m.m1 = m.m1 + ' · ' + c.n + ' cuotas';
    return ppPrev.apply(this, arguments);
  };
  const cbSavePrev = A.acts.cobroSave;
  A.acts.cobroSave = function (el, ev) {
    const m = S.modal; if (!m || !m.adj || m.adj.k === 'none') return cbSavePrev.apply(this, arguments);
    const amt = $('#mvAmt'), base = pnum(amt && amt.value), meth = ($('#mvMeth') || {}).value || '';
    if (!base) return cbSavePrev.apply(this, arguments);
    const c = A.adjCalc(base, m.adj); book(m.pid, base, m.adj, meth);
    if (amt) amt.value = String(c.n ? c.now : c.total);
    const note = $('#mvNote'); if (note && c.txt) note.value = (note.value || 'Cobro') + ' · ' + c.txt;
    return cbSavePrev.apply(this, arguments);
  };

  /* el aviso de «faltan…» compara contra el total con el ajuste */
  const amtPrev = A.ins.ppAmt;
  if (amtPrev) A.ins.ppAmt = el => { amtPrev(el); const m = S.modal; if (!m || !m.adj || m.adj.k === 'none' || !m._adjTot) return; const got = (m.a1 || 0) + (m.split ? m.a2 || 0 : 0), o = $('#ppMsg'); if (!o) return; o.className = 'hint' + (got < m._adjTot ? ' warn' : ''); o.textContent = got < m._adjTot ? 'Faltan ' + money(m._adjTot - got) + ': queda como deuda en su cuenta.' : got > m._adjTot ? 'Paga ' + money(got - m._adjTot) + ' de más: queda a favor.' : ''; };

  /* cuotas propias pendientes: se ven en la cuenta del paciente */
  A.cuotasOf = pid => (A.pd(pid).cuotas || []).map(q => { const paid = 0; return Object.assign({ paid }, q); });

  const css = document.createElement('style');
  css.textContent = '.aj-box{margin:10px 0;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--soft,#eef6f6)}.aj-h{font-size:.9rem;margin-bottom:6px}.aj-k{flex-wrap:wrap}' +
    '.aj-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:8px}.aj-row label{font-size:.85rem;min-width:110px}.aj-row .pct-in input{width:80px}.aj-res{margin-top:8px;font-size:.92rem}.aj-def{margin-top:6px;font-size:.85rem}';
  document.head.appendChild(css);
})();
