/* ===== 1.49: presupuestos en la moneda que quieras (pesos, dólares, euros, reales o mezclados), precio por ítem, ítems libres y lista de precios para compartir ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/\./g, '').replace(',', '.')); return isFinite(n) && n >= 0 ? n : 0; };

  const CUR = { ARS: { s: '$', n: 'pesos' }, USD: { s: 'US$', n: 'dólares' }, EUR: { s: '€', n: 'euros' }, BRL: { s: 'R$', n: 'reales' } };
  const KEYS = Object.keys(CUR);
  /* cotización de referencia (pesos por unidad); la del dólar arranca con la de los planes */
  const FX = () => { const f = A.CFG.fx || (A.CFG.fx = {}); if (!f.USD) f.USD = A.DOLAR || 1570; if (!f.EUR) f.EUR = Math.round((A.DOLAR || 1570) * 1.08); if (!f.BRL) f.BRL = Math.round((A.DOLAR || 1570) / 5.4); return f; };
  const rate = c => (c === 'ARS' ? 1 : +FX()[c] || 1);
  const fmt = (n, c) => (!c || c === 'ARS') ? A.money(n) : CUR[c].s + ' ' + Math.round(n).toLocaleString('es-AR');
  A.fmtCur = fmt;
  const curSel = (attrs, v) => '<select ' + attrs + '>' + KEYS.map(k => '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + CUR[k].s + ' ' + k + '</option>').join('') + '</select>';

  /* el presupuesto con precios, monedas y extras elegidos */
  function apply(b, f) {
    const cur = f.cur || 'ARS', ip = f.ip || {}, ic = f.ic || {};
    const items = b.items.map(i => Object.assign({}, i, { price: ip[i.txId] != null ? ip[i.txId] : i.price, cur: ic[i.txId] || cur }));
    /* si la moneda del presupuesto no es pesos y el ítem no tiene precio propio, se convierte el precio de lista */
    items.forEach(i => { if (ip[i.txId] == null && i.cur !== 'ARS') i.price = Math.round(i.price / rate(i.cur)); });
    (f.extra || []).filter(x => x.label && x.price > 0).forEach(x => items.push({ txId: null, label: x.label, price: x.price, cur: x.cur || cur, extra: true }));
    const sub = {}, tot = {}; items.forEach(i => { sub[i.cur] = (sub[i.cur] || 0) + i.price; });
    Object.keys(sub).forEach(c => { tot[c] = Math.round(sub[c] * (1 - (b.disc || 0) / 100)); });
    const fx = {}; Object.keys(sub).forEach(c => { if (c !== 'ARS') fx[c] = rate(c); });
    b.items = items; b.cur = cur; b.multi = { sub, tot, fx };
    b.subtotal = Object.keys(sub).reduce((s, c) => s + Math.round(sub[c] * rate(c)), 0);
    b.total = Object.keys(tot).reduce((s, c) => s + Math.round(tot[c] * rate(c)), 0);
    return b;
  }
  const isFx = b => b && b.multi && Object.keys(b.multi.sub).some(c => c !== 'ARS');

  /* el texto del presupuesto (pantalla, PDF y documento firmado) */
  const bodyPrev = A.budgetBody;
  A.budgetBody = (pid, b) => {
    if (b && b.id === 'draft' && S.modal && S.modal.type === 'budget' && S.modal.f) apply(b, S.modal.f);
    const r = bodyPrev(pid, b);
    if (!b || !b.multi) return r;
    const M = b.multi, cs = Object.keys(M.sub);
    const pi = r.sections.findIndex(s => s.h === 'Prestaciones'); if (pi >= 0) r.sections[pi].rows = b.items.map(i => [i.label, fmt(i.price, i.cur)]);
    const ii = r.sections.findIndex(s => s.h === 'Importe');
    if (ii >= 0) {
      let rows = [];
      cs.forEach(c => { const lab = cs.length > 1 ? ' en ' + CUR[c].n : ''; rows.push(['Subtotal' + lab, fmt(M.sub[c], c)]); if (b.disc) rows.push(['Descuento ' + b.disc + '%' + lab, '−' + fmt(M.sub[c] - M.tot[c], c)]); rows.push(['Total' + lab, fmt(M.tot[c], c)]); });
      if (isFx(b)) rows.push(['Equivale en pesos (referencia)', A.money(b.total)]);
      r.sections[ii].rows = rows;
      if (isFx(b)) r.sections.splice(ii + 1, 0, { h: 'Moneda', p: 'Cotización de referencia: ' + Object.keys(M.fx).map(c => CUR[c].s + ' 1 = ' + A.money(M.fx[c])).join(' · ') + '. Los importes en moneda extranjera se pueden pagar en esa moneda o en pesos al cambio del día de pago. Las cuotas y descuentos se calculan sobre el equivalente en pesos.' });
    }
    return r;
  };

  /* ---------- la ventana del presupuesto ---------- */
  const mfPrev = MF.budget;
  MF.budget = m => {
    const f = m.f; if (!f.cur) f.cur = A.CFG.budCur || 'ARS'; f.ip = f.ip || {}; f.ic = f.ic || {}; f.extra = f.extra || [];
    let h = mfPrev(m); if (typeof h !== 'string') return h;
    const pd = A.pd(m.pid), plan = pd.tx.filter(t => t.status === 'plan');
    const rowsT = plan.map(t => {
      const c = f.ic[t.id] || f.cur, pr = f.ip[t.id] != null ? f.ip[t.id] : (c === 'ARS' ? t.price : Math.round(t.price / rate(c)));
      return '<tr><td><input type="checkbox" data-bditem="' + t.id + '" data-in="bdCalc" aria-label="Incluir"' + (f.ids.indexOf(t.id) >= 0 ? ' checked' : '') + '></td><td>' + esc(t.label) + '</td><td class="num"><input class="bc-p" inputmode="numeric" data-in="bcP" data-id="' + t.id + '" value="' + pr + '" aria-label="Precio"></td><td>' + curSel('class="bc-c" data-chg="bcC" data-id="' + t.id + '" aria-label="Moneda"', c) + '</td></tr>';
    }).join('');
    const rowsX = f.extra.map((x, i) => '<tr class="bc-x"><td></td><td><input data-in="bcXL" data-i="' + i + '" value="' + esc(x.label) + '" placeholder="Descripción" aria-label="Descripción"></td><td class="num"><input class="bc-p" inputmode="numeric" data-in="bcXP" data-i="' + i + '" value="' + (x.price || '') + '" placeholder="0" aria-label="Precio"></td><td>' + curSel('class="bc-c" data-chg="bcXC" data-i="' + i + '" aria-label="Moneda"', x.cur || f.cur) + ' <button type="button" class="btn small ghost" data-act="bcXDel" data-i="' + i + '" aria-label="Quitar">✕</button></td></tr>').join('');
    const used = {}; plan.forEach(t => { if (f.ids.indexOf(t.id) >= 0) used[f.ic[t.id] || f.cur] = 1; }); f.extra.forEach(x => { used[x.cur || f.cur] = 1; }); used[f.cur] = 1;
    const fxs = Object.keys(used).filter(c => c !== 'ARS');
    const top = '<div class="bc-top"><div class="field"><label for="bcCur">Moneda del presupuesto</label>' + curSel('id="bcCur" data-chg="bcCur"', f.cur) + '</div>' +
      fxs.map(c => '<div class="field"><label>Cotización ' + CUR[c].s + ' 1 =</label><input class="bc-p" inputmode="numeric" data-in="bcFx" data-c="' + c + '" value="' + rate(c) + '" aria-label="Pesos por ' + c + '"></div>').join('') +
      '<div class="hint">Cada prestación puede ir en otra moneda: cambiala en su fila. Los precios se pueden cambiar solo para este presupuesto.</div></div>';
    const table = top + '<div class="tbl-scroll"><table class="tbl bc-tbl"><thead><tr><th></th><th>Prestación</th><th class="num">Precio</th><th>Moneda</th></tr></thead><tbody>' + rowsT + rowsX + '</tbody></table></div><button type="button" class="btn small" data-act="bcXAdd">+ Agregar ítem</button>';
    return h.replace(/<div class="tbl-scroll"><table class="tbl"><tbody>[\s\S]*?<\/tbody><\/table><\/div>/, table);
  };
  const recalc = () => { if (A.ins.bdCalc) A.ins.bdCalc({}); };
  const keepRedraw = () => { const b = $('.m-body'), t = b ? b.scrollTop : 0; A.renderModal(); const b2 = $('.m-body'); if (b2) b2.scrollTop = t; };
  /* antes de redibujar se guardan los tildes (los lee la ventana original) */
  const keepIds = () => { const f = S.modal.f; f.ids = A.$$('[data-bditem]').filter(c => c.checked).map(c => c.getAttribute('data-bditem')); };
  A.ins.bcP = el => { S.modal.f.ip[el.getAttribute('data-id')] = num(el.value); recalc(); };
  A.chg.bcC = el => { keepIds(); const f = S.modal.f, id = el.getAttribute('data-id'), old = f.ic[id] || f.cur, nw = el.value; const t = A.pd(S.modal.pid).tx.filter(x => x.id === id)[0];
    const cur = f.ip[id] != null ? f.ip[id] : (old === 'ARS' ? (t ? t.price : 0) : Math.round((t ? t.price : 0) / rate(old)));
    f.ip[id] = Math.round(cur * rate(old) / rate(nw)); f.ic[id] = nw; keepRedraw(); };
  A.chg.bcCur = el => { keepIds(); const f = S.modal.f; f.cur = el.value; A.CFG.budCur = el.value; keepRedraw(); };
  A.ins.bcFx = el => { FX()[el.getAttribute('data-c')] = num(el.value) || 1; recalc(); };
  A.acts.bcXAdd = () => { keepIds(); S.modal.f.extra.push({ label: '', price: 0, cur: S.modal.f.cur }); keepRedraw(); const L = A.$$('[data-in="bcXL"]'); if (L.length) L[L.length - 1].focus(); };
  A.ins.bcXL = el => { S.modal.f.extra[+el.getAttribute('data-i')].label = el.value; recalc(); };
  A.ins.bcXP = el => { S.modal.f.extra[+el.getAttribute('data-i')].price = num(el.value); recalc(); };
  A.chg.bcXC = el => { keepIds(); S.modal.f.extra[+el.getAttribute('data-i')].cur = el.value; keepRedraw(); };
  A.acts.bcXDel = el => { keepIds(); S.modal.f.extra.splice(+el.getAttribute('data-i'), 1); keepRedraw(); };

  /* al guardar: el presupuesto queda con sus monedas y precios (antes de la firma, por eso se engancha en touchPd) */
  let pend = null;
  const saveBudPrev = A.acts.budgetSave;
  A.acts.budgetSave = function (el) {
    const m = S.modal; if (!m || m.type !== 'budget') return saveBudPrev.apply(this, arguments);
    keepIds(); pend = { pid: m.pid, f: JSON.parse(JSON.stringify(m.f)), before: (A.pd(m.pid).budgets || []).map(b => b.id) };
    try { return saveBudPrev.apply(this, arguments); } finally { pend = null; }
  };
  const touchPrev = A.touchPd;
  A.touchPd = pid => {
    if (pend && pend.pid === pid) {
      const pd = A.pd(pid), f = pend.f, b = (pd.budgets || []).filter(x => pend.before.indexOf(x.id) < 0)[0];
      if (b && !b.multi) {
        apply(b, f);
        pd.tx.forEach(t => { if (f.ids.indexOf(t.id) >= 0 && f.ip[t.id] != null) { const c = f.ic[t.id] || f.cur; t.price = Math.round(f.ip[t.id] * rate(c)); if (c !== 'ARS') t.cur = { c, v: f.ip[t.id], fx: rate(c) }; } });
      }
    }
    return touchPrev(pid);
  };

  /* ---------- lista de precios para compartir (pacientes o colegas) ---------- */
  A.acts.plOpen2 = () => { S.modal = { type: 'priceList', back: S.modal, cur: A.CFG.budCur || 'ARS', cats: {}, cash: A.CFG.plCash || '', cuo: A.CFG.plCuo || '', note: A.CFG.plNote || '' }; A.renderModal(); };
  const plItems = m => A.CAT.filter(x => x.price > 0 && (!Object.keys(m.cats).length || m.cats[x.cat]));
  const plText = m => {
    const L = plItems(m), by = {}; L.forEach(x => { (by[x.cat] = by[x.cat] || []).push(x); });
    let t = '*' + A.CLINIC + '* · Lista de precios (' + A.fmtDMY(A.today()) + ')\n';
    Object.keys(by).forEach(c => { t += '\n*' + c + '*\n' + by[c].map(x => '• ' + x.label + ': ' + fmt(m.cur === 'ARS' ? x.price : x.price / rate(m.cur), m.cur)).join('\n') + '\n'; });
    if (num(m.cash)) t += '\nPagando en efectivo: ' + num(m.cash) + '% de descuento.';
    if (m.cuo) t += '\nCuotas: ' + m.cuo + '.';
    if (m.cur !== 'ARS') t += '\nValores en ' + CUR[m.cur].n + ' (referencia ' + CUR[m.cur].s + ' 1 = ' + A.money(rate(m.cur)) + ').';
    if (m.note) t += '\n' + m.note;
    return t;
  };
  MF.priceList = m => {
    const cats = A.catCats();
    const b = '<p class="m-lead">Armá la lista de valores del consultorio para mandarla a un paciente o a un colega.</p>' +
      '<div class="row2"><div class="field"><label for="plCur">Moneda</label>' + curSel('id="plCur" data-chg="plSet" data-f="cur"', m.cur) + '</div><div class="field"><label for="plCash">Descuento en efectivo (%)</label><input id="plCash" inputmode="decimal" data-chg="plSet" data-f="cash" value="' + esc(m.cash) + '" placeholder="Ej.: 10"></div></div>' +
      '<div class="field"><label for="plCuo">Cuotas (texto)</label><input id="plCuo" data-chg="plSet" data-f="cuo" value="' + esc(m.cuo) + '" placeholder="Ej.: hasta 6 cuotas con tarjeta (10% de recargo)"></div>' +
      '<div class="field"><label for="plNote">Aclaración</label><input id="plNote" data-chg="plSet" data-f="note" value="' + esc(m.note) + '" placeholder="Ej.: valores sujetos a evaluación clínica"></div>' +
      '<div class="field"><label>Categorías</label><div class="row-btns">' + cats.map(c => '<label class="chk"><input type="checkbox" data-chg="plCat" data-c="' + esc(c) + '"' + (!Object.keys(m.cats).length || m.cats[c] ? ' checked' : '') + '> ' + esc(c) + '</label>').join('') + '</div></div>' +
      '<pre class="pl-prev">' + esc(plText(m)) + '</pre>';
    return A.modalShell('Lista de precios', b, '<button class="btn" data-act="plBack">Volver</button><button class="btn" data-act="plCopy">Copiar</button><button class="btn" data-act="plWa">WhatsApp</button><button class="btn primary" data-act="plPdf">PDF</button>', true);
  };
  A.chg.plSet = el => { const f = el.getAttribute('data-f'); S.modal[f] = el.value; if (A.isBoss && A.isBoss()) { if (f === 'cash') A.CFG.plCash = el.value; if (f === 'cuo') A.CFG.plCuo = el.value; if (f === 'note') A.CFG.plNote = el.value; A.save(); } keepRedraw(); };
  A.chg.plCat = el => { const m = S.modal, cats = A.catCats(); if (!Object.keys(m.cats).length) cats.forEach(c => { m.cats[c] = true; }); m.cats[el.getAttribute('data-c')] = el.checked; if (!Object.keys(m.cats).some(k => m.cats[k])) m.cats = {}; keepRedraw(); };
  A.acts.plBack = () => { S.modal = S.modal.back || null; A.renderModal(); };
  A.acts.plCopy = () => { const t = plText(S.modal); if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => A.toast('Lista copiada.')); };
  A.acts.plWa = () => { window.open('https://wa.me/?text=' + encodeURIComponent(plText(S.modal)), '_blank'); };
  A.acts.plPdf = () => {
    const m = S.modal, o = A.pdfDoc_ && A.pdfDoc_('Lista de precios'); if (!o) return;
    o.head('Lista de precios', 'Valores al ' + A.fmtDMY(A.today()) + (m.cur !== 'ARS' ? ' · en ' + CUR[m.cur].n : ''), null, '');
    const by = {}; plItems(m).forEach(x => { (by[x.cat] = by[x.cat] || []).push(x); });
    Object.keys(by).forEach(c => { o.h(c); o.rows(by[c].map(x => [x.label, fmt(m.cur === 'ARS' ? x.price : x.price / rate(m.cur), m.cur)])); });
    const notes = [num(m.cash) ? 'Pagando en efectivo: ' + num(m.cash) + '% de descuento.' : '', m.cuo ? 'Cuotas: ' + m.cuo + '.' : '', m.cur !== 'ARS' ? 'Referencia: ' + CUR[m.cur].s + ' 1 = ' + A.money(rate(m.cur)) + '.' : '', m.note || ''].filter(Boolean);
    if (notes.length) { o.h('Condiciones'); notes.forEach(n => o.p(n)); }
    o.finish('lista-de-precios.pdf');
  };
  /* botón en «Prácticas y aranceles» */
  const catPrev = MF.catalog;
  MF.catalog = m => { const h = catPrev(m); if (typeof h !== 'string') return h; return h.replace('<div class="row-btns pu-row">', '<div class="row-btns pu-row"><button class="btn small" data-act="plOpen2">Lista de precios para compartir</button>'); };

  const css = document.createElement('style');
  css.textContent = '.bc-top{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:8px}.bc-top .field{flex:0 1 180px;margin:0}.bc-top .hint{flex:1 1 100%}' +
    '.bc-tbl input.bc-p{width:110px;text-align:right}.bc-tbl .bc-c{width:auto}.bc-tbl .bc-x input:not(.bc-p){width:100%}.pl-prev{white-space:pre-wrap;font:inherit;font-size:.85rem;background:var(--soft,#eef6f6);padding:10px;border-radius:10px;max-height:34vh;overflow:auto}' +
    '@media (max-width:640px){.bc-tbl input.bc-p{width:84px}.bc-tbl td,.bc-tbl th{padding:6px 4px}}';
  document.head.appendChild(css);
})();
