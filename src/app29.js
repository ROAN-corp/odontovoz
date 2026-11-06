/* ===== 1.20: planes de pago en cuotas con interés en presupuestos y planes de tratamiento ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns;
  const NS = [3, 6, 9, 12];
  /* interés mensual sugerido (noviembre 2026): por encima de la inflación esperada (≈2% mensual)
     y bastante por debajo de la financiación con tarjeta (TNA de 85% a 115%). Se puede cambiar. */
  const SUG = { 3: 2.5, 6: 3, 9: 3.3, 12: 3.6 };
  A.FIN_SUG = SUG;
  const rates = () => Object.assign({}, SUG, A.CFG.finRates || {});
  const pctTxt = v => (Math.round(v * 100) / 100).toString().replace('.', ',') + '%';
  const r100 = n => Math.round(n / 100) * 100;

  /* sistema francés: cuotas mensuales iguales */
  A.finCalc = (amount, n, rateM) => {
    amount = Math.max(0, Math.round(amount || 0)); n = Math.max(1, n | 0); const i = Math.max(0, +rateM || 0) / 100;
    if (n === 1) return { n, rate: 0, cuota: amount, total: amount, interest: 0, tea: 0, tna: 0 };
    const c = i ? amount * i / (1 - Math.pow(1 + i, -n)) : amount / n, cuota = r100(c), total = cuota * n;
    return { n, rate: i * 100, cuota, total, interest: Math.max(0, total - amount), tea: (Math.pow(1 + i, 12) - 1) * 100, tna: i * 1200 };
  };
  /* configuración por defecto de lo que se ofrece */
  A.finDefault = () => { const R = rates(); return { cont: true, contDisc: +(A.CFG.finContDisc || 0), on: { 3: true, 6: true, 9: true, 12: true }, rate: { 3: R[3], 6: R[6], 9: R[9], 12: R[12] }, pick: '' }; };
  /* opciones calculadas sobre un monto a financiar; base = precio total (para el contado) */
  A.finOptions = (fin, financed, base) => {
    const out = [];
    if (fin.cont) { const d = Math.min(50, Math.max(0, +fin.contDisc || 0)), tot = r100(base * (1 - d / 100)); out.push({ n: 1, label: d ? 'Contado con ' + pctTxt(d) + ' de descuento' : 'Contado (un solo pago)', total: tot, cuota: tot, disc: d, interest: 0 }); }
    NS.forEach(n => { if (!fin.on[n]) return; const c = A.finCalc(financed, n, fin.rate[n]); out.push(Object.assign({ label: n + ' cuotas' }, c)); });
    return out;
  };

  /* ---------- en el presupuesto: datos del borrador ---------- */
  const tot = (pid, f) => { const pd = A.pd(pid), sub = (pd.tx || []).filter(t => f.ids.indexOf(t.id) >= 0).reduce((s, t) => s + (+t.price || 0), 0), disc = Math.min(100, Math.max(0, parseFloat(($('#bdDisc') || {}).value) || f.disc || 0)); return Math.round(sub * (1 - disc / 100)); };
  const antOf = (total, f) => Math.round(total * Math.min(100, Math.max(0, parseFloat(($('#bdAnt') || {}).value) || f.anticipo || 0)) / 100);
  function finBlock(m) {
    const f = m.f, fin = f.fin || (f.fin = A.finDefault());
    let h = '<div class="block fin-blk"><h3>Planes de pago para ofrecer</h3><p class="hint" style="margin:0 0 8px">Las cuotas se calculan sobre el saldo (después del anticipo), con cuotas mensuales iguales. El interés sugerido está pensado para hoy: por encima de la inflación y más barato que financiar con tarjeta. Podés cambiarlo.</p>' +
      '<div class="fin-grid"><div class="fin-row fin-head"><span>Plan</span><span>Interés mensual</span><span class="num">Cuota</span><span class="num">Total</span><span class="num">Recargo</span></div>' +
      '<div class="fin-row"><label class="fin-l"><input type="checkbox" id="fnC" data-chg="finIn"' + (fin.cont ? ' checked' : '') + '> Contado</label><span class="fin-in"><input id="fnCD" type="number" min="0" max="50" step="0.5" data-in="finIn" value="' + (fin.contDisc || 0) + '" aria-label="Descuento por contado"> % de descuento</span><span class="num" id="fcq1"></span><span class="num" id="fct1"></span><span class="num" id="fcr1"></span></div>' +
      NS.map(n => '<div class="fin-row"><label class="fin-l"><input type="checkbox" id="fnO' + n + '" data-chg="finIn"' + (fin.on[n] ? ' checked' : '') + '> ' + n + ' cuotas</label><span class="fin-in"><input id="fnR' + n + '" type="number" min="0" max="15" step="0.1" data-in="finIn" value="' + fin.rate[n] + '" aria-label="Interés mensual en ' + n + ' cuotas"> % <small>sugerido ' + pctTxt(SUG[n]) + '</small></span><span class="num" id="fcq' + n + '"></span><span class="num" id="fct' + n + '"></span><span class="num" id="fcr' + n + '"></span></div>').join('') +
      '</div><div class="row2"><div class="field"><label for="fnPick">Plan que eligió el paciente</label><select id="fnPick" data-chg="finIn"><option value="">Todavía no eligió (se ofrecen todos)</option></select></div>' +
      '<div class="field"><span class="lbl">Intereses</span><div class="row-btns"><button type="button" class="btn small" data-act="finSug">Usar los sugeridos</button><button type="button" class="btn small" data-act="finDef">Guardar como predeterminados</button></div></div></div><div class="hint" id="fnNote"></div></div>';
    return h;
  }
  function readFin() {
    const m = S.modal; if (!m || !m.f || !$('#fnC')) return;
    const fin = m.f.fin; fin.cont = $('#fnC').checked; fin.contDisc = Math.min(50, Math.max(0, parseFloat($('#fnCD').value) || 0));
    NS.forEach(n => { fin.on[n] = $('#fnO' + n).checked; fin.rate[n] = Math.min(15, Math.max(0, parseFloat($('#fnR' + n).value) || 0)); });
    fin.pick = $('#fnPick').value;
  }
  function finUpdate() {
    const m = S.modal; if (!m || m.type !== 'budget' || !$('#fnC')) return; readFin();
    const f = m.f, fin = f.fin, total = tot(m.pid, f), ant = antOf(total, f), financed = total - ant;
    const R = (id, v) => { const e = $('#' + id); if (e) e.textContent = v; };
    const cd = A.finOptions({ cont: true, contDisc: fin.contDisc, on: {}, rate: {} }, financed, total)[0];
    R('fcq1', A.money(cd.total)); R('fct1', 'Total ' + A.money(cd.total)); R('fcr1', cd.disc ? '−' + pctTxt(cd.disc) : '—');
    NS.forEach(n => { const c = A.finCalc(financed, n, fin.rate[n]); R('fcq' + n, (ant ? A.money(ant) + ' + ' : '') + n + ' × ' + A.money(c.cuota)); R('fct' + n, 'Total ' + A.money(ant + c.total)); R('fcr' + n, financed ? '+' + pctTxt(c.interest / financed * 100) : '—'); const tr = $('#fnO' + n); if (tr) tr.closest('.fin-row').classList.toggle('off', !fin.on[n]); });
    /* opciones para elegir */
    const sel = $('#fnPick'), cur = fin.pick;
    if (sel) { sel.innerHTML = '<option value="">Todavía no eligió (se ofrecen todos)</option>' + (fin.cont ? '<option value="1"' + (cur === '1' ? ' selected' : '') + '>Contado</option>' : '') + NS.filter(n => fin.on[n]).map(n => '<option value="' + n + '"' + (cur === String(n) ? ' selected' : '') + '>' + n + ' cuotas</option>').join(''); if (sel.value !== cur) fin.pick = sel.value; }
    /* el plan elegido define el cronograma */
    const n = +fin.pick || 1, h = $('#bdCuotas'); if (h) h.value = String(fin.pick && n > 1 ? n : 1);
    const note = $('#fnNote'); if (note) note.textContent = financed ? 'Se financian ' + A.money(financed) + (ant ? ' (el anticipo de ' + A.money(ant) + ' se paga al aceptar)' : '') + '.' : '';
  }
  A.finUpdate = finUpdate;
  A.acts.finSug = () => { const f = S.modal.f.fin; NS.forEach(n => { f.rate[n] = SUG[n]; const e = $('#fnR' + n); if (e) e.value = SUG[n]; }); finUpdate(); A.ins.bdCalc(); };
  A.acts.finDef = () => { readFin(); const f = S.modal.f.fin; A.CFG.finRates = {}; NS.forEach(n => { A.CFG.finRates[n] = f.rate[n]; }); A.CFG.finContDisc = f.contDisc; A.save(); A.toast('Listo: estos intereses quedan como predeterminados para los próximos presupuestos.'); };
  A.ins.finIn = () => { finUpdate(); A.ins.bdCalc(); };
  A.chg.finIn = () => { finUpdate(); A.ins.bdCalc(); };
  const bdInPrev = A.ins.bdCalc, bdChgPrev = A.chg.bdCalc;
  A.ins.bdCalc = el => { const r = bdInPrev(el); if (el) finUpdate(); return r; };
  A.chg.bdCalc = el => { const r = bdChgPrev(el); if (el) finUpdate(); return r; };

  /* la ventana del presupuesto: la elección de cuotas sin interés se reemplaza por los planes de pago */
  const mfBudPrev = MF.budget;
  MF.budget = m => {
    if (!m.f.fin) m.f.fin = A.finDefault();
    let h = mfBudPrev(m);
    h = h.replace(/<div class="field"><label for="bdCuotas">[\s\S]*?<\/select><\/div>/, '<input type="hidden" id="bdCuotas" value="1">');
    h = h.replace(/(<div class="row3">)/, '$1'); /* el descuento y el anticipo quedan donde estaban */
    return h.replace('<div id="bdPrev"></div>', finBlock(m) + '<div id="bdPrev"></div>');
  };
  const afterPrev = A.modalAfter.budget;
  A.modalAfter.budget = m => { finUpdate(); if (afterPrev) afterPrev(m); };

  /* al guardar, el presupuesto se queda con los planes ofrecidos y el elegido */
  let pend = null;
  const saveBudPrev = A.acts.budgetSave;
  A.acts.budgetSave = el => {
    const m = S.modal; if (m && m.f && $('#fnC')) { readFin(); pend = { pid: m.pid, fin: JSON.parse(JSON.stringify(m.f.fin)), n: A.pd(m.pid).budgets.length }; }
    try { return saveBudPrev(el); } finally { pend = null; }
  };
  const touchPrev = A.touchPd;
  A.touchPd = pid => {
    if (pend && pend.pid === pid) { const pd = A.pd(pid); if (pd.budgets.length > pend.n) { const b = pd.budgets[pd.budgets.length - 1]; attachFin(b, pend.fin); } pend = null; }
    return touchPrev(pid);
  };
  function attachFin(b, fin) {
    b.fin = { cont: !!fin.cont, contDisc: +fin.contDisc || 0, opts: NS.filter(n => fin.on[n]).map(n => ({ n, rate: +fin.rate[n] || 0 })) };
    setPick(b, fin.pick);
  }
  function setPick(b, pick) {
    b.finPick = pick || '';
    const n = +pick || 0;
    if (n > 1) { const o = (b.fin && b.fin.opts || []).filter(x => x.n === n)[0]; b.cuotas = n; b.finRate = o ? o.rate : (rates()[n] || 0); }
    else { b.cuotas = 1; b.finRate = 0; }
  }

  /* cronograma con interés: cuotas iguales del sistema francés sobre el saldo */
  const schPrev = A.schedule;
  A.schedule = (pid, b) => {
    if (!(b && b.cuotas > 1 && b.finRate > 0)) return schPrev(pid, b);
    const sena = b.sena ? b.sena.amount : 0, base = b.total - sena, anticipo = Math.round(base * (b.anticipo || 0) / 100), rest = base - anticipo, n = b.cuotas;
    const c = A.finCalc(rest, n, b.finRate), pd = A.pd(pid), from = b.sena ? b.date : (b.acceptedAt || b.date);
    let paid = pd.ledger.filter(e => e.type === 'pago' && !e.voided && e.date >= from).reduce((s, e) => s + e.amount, 0);
    const lines = [];
    if (sena) lines.push({ label: 'Seña', due: b.sena.date, amount: sena });
    if (anticipo) lines.push({ label: 'Anticipo', due: b.acceptedAt || b.date, amount: anticipo });
    for (let i = 0; i < n; i++) lines.push({ label: 'Cuota ' + (i + 1) + ' de ' + n, due: A.add(b.acceptedAt || b.date, 30 * (i + 1)), amount: c.cuota });
    lines.forEach(l => { const p = Math.min(paid, l.amount); l.paid = p; paid -= p; });
    return { anticipo, sena, cuota: c.cuota, lines, fin: c };
  };

  /* el texto del presupuesto (pantalla, PDF y documento firmado) suma los planes de pago */
  const bodyPrev = A.budgetBody;
  A.budgetBody = (pid, b) => {
    let fin = b.fin, pick = b.finPick;
    if (b.id === 'draft' && S.modal && S.modal.type === 'budget' && S.modal.f && S.modal.f.fin) { const f = S.modal.f.fin; fin = { cont: f.cont, contDisc: f.contDisc, opts: NS.filter(n => f.on[n]).map(n => ({ n, rate: f.rate[n] })) }; pick = f.pick; if (+pick > 1) { b.cuotas = +pick; b.finRate = +f.rate[+pick] || 0; } }
    const r = bodyPrev(pid, b);
    if (!fin || (!fin.cont && !(fin.opts || []).length)) return r;
    const sena = b.sena ? b.sena.amount : 0, base = b.total - sena, ant = Math.round(base * (b.anticipo || 0) / 100), financed = base - ant;
    const ff = { cont: fin.cont, contDisc: fin.contDisc, on: {}, rate: {} }; (fin.opts || []).forEach(o => { ff.on[o.n] = true; ff.rate[o.n] = o.rate; });
    const opts = A.finOptions(ff, financed, base);
    const rows = opts.map(o => {
      if (o.n === 1) return [(String(pick) === '1' ? '✓ ' : '') + o.label, A.money(o.total)];
      return [(String(pick) === String(o.n) ? '✓ ' : '') + (ant ? 'Anticipo ' + A.money(ant) + ' + ' : '') + o.n + ' cuotas de ' + A.money(o.cuota), 'Total ' + A.money(ant + sena + o.total) + (o.rate ? ' · TEM ' + pctTxt(o.rate) + ' · TEA ' + pctTxt(Math.round(o.tea * 10) / 10) : ' · sin interés')];
    });
    const i = r.sections.findIndex(s => s.h === 'Forma de pago');
    const sec = { h: pick ? 'Planes de pago (✓ el elegido)' : 'Planes de pago', rows };
    const legal = { h: 'Sobre la financiación', p: 'Precio de contado: ' + A.money(b.total) + (sena ? ' (seña abonada ' + A.money(sena) + ')' : '') + '. Cuotas mensuales, iguales y consecutivas (sistema francés), la primera a los 30 días de aceptado. TEM: tasa efectiva mensual. TEA: tasa efectiva anual. El costo financiero total (CFT) es igual a la TEA porque no hay otros gastos ni seguros. Los intereses se calculan solo sobre el saldo financiado.' };
    if (i >= 0) r.sections.splice(i + 1, 0, sec, legal); else r.sections.push(sec, legal);
    return r;
  };

  /* en el presupuesto guardado: elegir o cambiar el plan antes de firmar */
  const bvPrev = MF.budgetView;
  MF.budgetView = m => {
    const h = bvPrev(m), pd = A.pd(m.pid), b = pd.budgets.filter(x => x.id === m.bid)[0]; if (!b || !h || !b.fin) return h;
    const locked = b.status === 'rechazado' || (b.status === 'aceptado' && b.finLedger);
    const opts = (b.fin.cont ? [['1', 'Contado']] : []).concat((b.fin.opts || []).map(o => [String(o.n), o.n + ' cuotas']));
    const blk = '<div class="block"><h3>Plan de pago elegido</h3>' + (locked ? '<p>' + esc(b.finPick ? (b.finPick === '1' ? 'Contado' : b.finPick + ' cuotas') : 'Sin elegir') + '</p>' :
      '<div class="row2"><div class="field"><label for="fvPick">¿Cómo va a pagar el paciente?</label><select id="fvPick" data-chg="finPickView" data-id="' + b.id + '"><option value="">Todavía no eligió</option>' + opts.map(o => '<option value="' + o[0] + '"' + (String(b.finPick) === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></div></div>' +
      '<p class="hint" style="margin:0">' + (b.status === 'aceptado' ? 'Al elegirlo se suman a la cuenta del paciente los intereses (o el descuento por contado).' : 'Al aceptar el presupuesto, los intereses del plan elegido (o el descuento por contado) se suman a la cuenta del paciente.') + '</p>') + '</div>';
    return h.replace('<div class="block"><h3>Cronograma de pagos</h3>', blk + '<div class="block"><h3>Cronograma de pagos</h3>');
  };
  A.chg.finPickView = el => {
    const pid = S.modal.pid, pd = A.pd(pid), b = pd.budgets.filter(x => x.id === el.getAttribute('data-id'))[0]; if (!b) return;
    setPick(b, el.value); if (b.status === 'aceptado') applyLedger(pid, b); A.touchPd(pid); A.renderModal(); A.refresh();
  };
  /* al aceptar: intereses o descuento por contado a la cuenta del paciente */
  function applyLedger(pid, b) {
    if (b.finLedger || !b.finPick) return;
    const pd = A.pd(pid), sena = b.sena ? b.sena.amount : 0, base = b.total - sena, ant = Math.round(base * (b.anticipo || 0) / 100), pro = A.PAT(pid).pro;
    if (+b.finPick > 1 && b.finRate > 0) {
      const c = A.finCalc(base - ant, +b.finPick, b.finRate); if (!c.interest) return;
      const e = { id: A.uid(), date: A.today(), type: 'ajuste', amount: c.interest, desc: 'Intereses por financiación en ' + b.finPick + ' cuotas (' + b.num + ', TEM ' + pctTxt(b.finRate) + ')', pro, fin: b.id };
      pd.ledger.push(e); b.finLedger = e.id;
    } else if (b.finPick === '1' && b.fin && b.fin.contDisc > 0) {
      const d = Math.round(base * b.fin.contDisc / 100 / 100) * 100; if (!d) return;
      const e = { id: A.uid(), date: A.today(), type: 'ajuste', amount: -d, desc: 'Descuento por pago de contado ' + pctTxt(b.fin.contDisc) + ' (' + b.num + ')', pro, fin: b.id };
      pd.ledger.push(e); b.finLedger = e.id;
    }
  }
  const accPrev = A.acceptBudget;
  A.acceptBudget = (pid, bid, docId) => { accPrev(pid, bid, docId); const b = A.pd(pid).budgets.filter(x => x.id === bid)[0]; if (b) { applyLedger(pid, b); A.touchPd(pid); } };

  const css = document.createElement('style');
  css.textContent = '.fin-grid{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-bottom:10px}.fin-row{display:grid;grid-template-columns:130px 200px 1fr 1fr 80px;gap:8px;align-items:center;padding:8px 10px;border-top:1px solid var(--line)}.fin-row:first-child{border-top:0}.fin-head{font-size:12px;font-weight:700;text-transform:uppercase;color:var(--ink-2);background:color-mix(in srgb,var(--ink) 4%,transparent)}.fin-row.off>span{opacity:.4}.fin-l{display:flex;align-items:center;gap:8px;font-weight:700}.fin-in{display:inline-flex;align-items:center;gap:4px;white-space:nowrap;font-size:13.5px}.fin-in input{width:70px;min-height:34px}.fin-in small{color:var(--ink-2)}.fin-row .num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}@media (max-width:640px){.fin-head{display:none}.fin-row{grid-template-columns:minmax(0,1fr) auto;row-gap:4px}.fin-in small{display:none}.fin-in input{width:62px}.fin-row .num{font-size:13.5px}.fin-row .num{grid-column:auto;text-align:left;font-size:14px}.fin-row span[id^=fcq]{grid-column:1}.fin-row span[id^=fct]{grid-column:2;text-align:right}.fin-row span[id^=fcr]{display:none}}';
  document.head.appendChild(css);
})();
