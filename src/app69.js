/* ===== 1.48: liquidación por medio de pago, obras sociales en una línea, evolución de 12 meses y «Mis números» para cada profesional ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const money = n => A.money(n || 0);
  const MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MONL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const addM = (m, n) => { const d = new Date(+m.slice(0, 4), +m.slice(5) - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const mName = m => MONL[+m.slice(5) - 1] + ' ' + m.slice(0, 4);
  const METH = ['Efectivo', 'Transferencia', 'Débito', 'Crédito'];
  const methOf = x => { if (x.via === 'obra social') return 'Obras sociales'; const t = String(x.method || '').toLowerCase(); return /efect/.test(t) ? 'Efectivo' : /transf|mercado|mp|qr/.test(t) ? 'Transferencia' : /d[eé]bito/.test(t) ? 'Débito' : /cr[eé]dito|tarjeta/.test(t) ? 'Crédito' : 'Otros'; };

  /* el acuerdo de cada profesional también queda en su ficha de profesional (así cada uno ve sus números sin ver los de los demás) */
  const mirror = pid => { const p = A.PRO(pid); if (!p || !A.isBoss || !A.isBoss()) return; const c = A.liqCfg(pid); p.deal = JSON.parse(JSON.stringify({ pct: c.pct, rules: c.rules || [], mode: c.mode || 'pct', mod: c.mod || null, alq: c.alq || null, otro: c.otro || null, base: c.base || 'cobrado' })); };
  ['dlSet', 'dlRulePct'].forEach(k => { const prev = A.chg[k]; if (prev) A.chg[k] = function (el) { const r = prev.apply(this, arguments); mirror(el.getAttribute('data-id')); A.save(); return r; }; });
  ['dlBase', 'dlRuleDel', 'dlRuleAdd'].forEach(k => { const prev = A.acts[k]; if (prev) A.acts[k] = function (el) { const r = prev.apply(this, arguments); mirror(el.getAttribute('data-id')); A.save(); return r; }; });
  const cfgPrev = A.liqCfg;
  A.liqCfg = pid => {
    if (A.isMember && A.isMember() && !(A.isBoss && A.isBoss()) && !(S.liq && S.liq.cfg && S.liq.cfg[pid])) { const p = A.PRO(pid); if (p && p.deal) { S.liq.cfg[pid] = JSON.parse(JSON.stringify(p.deal)); return S.liq.cfg[pid]; } }
    return cfgPrev(pid);
  };

  /* números del mes de un profesional */
  A.liqMethods = (pid, m) => {
    const P = A.cobAlloc().filter(x => x.pro === pid && x.date.slice(0, 7) === m), by = {}, os = {};
    P.forEach(x => { const k = methOf(x); by[k] = (by[k] || 0) + x.amount; if (x.via === 'obra social') { const kk = x.os + '|' + x.osMonth; os[kk] = (os[kk] || 0) + x.amount; } });
    let owed = 0; if (A.osDue) A.osDue().filter(r => !r.pay).forEach(r => { r.items.forEach(i => { if (i.pro === pid) owed += i.amt; }); });
    return { by, os, owed, total: P.reduce((s, x) => s + x.amount, 0) };
  };
  A.liqYear = (pid, m) => { const out = []; for (let i = 11; i >= 0; i--) { const mm = addM(m, -i), c = A.liqCalc(pid, mm); out.push({ m: mm, prod: c.prod, dent: c.dent, net: c.net }); } return out; };

  function extraHTML(pid, m) {
    const M = A.liqMethods(pid, m), c = A.liqCalc(pid, m), keys = METH.concat(['Otros', 'Obras sociales']).filter(k => M.by[k]);
    let h = '<section class="card lq-x"><h2>Cobrado en ' + esc(mName(m)) + ' por medio de pago</h2>';
    h += keys.length ? '<table class="tbl"><tbody>' + keys.map(k => '<tr><td>' + esc(k) + '</td><td class="num">' + money(M.by[k]) + '</td></tr>').join('') + '<tr class="tot"><td><b>Total cobrado</b></td><td class="num"><b>' + money(M.total) + '</b></td></tr></tbody></table>' : '<div class="empty">Sin cobros en el mes.</div>';
    const osK = Object.keys(M.os);
    if (osK.length) h += '<h3 style="margin-top:12px">Obras sociales (una línea por mes)</h3><table class="tbl"><tbody>' + osK.map(k => { const [id, mm] = k.split('|'), o = A.osById ? A.osById(id) : null; return '<tr><td>' + esc(o ? o.sigla : 'Obra social') + ' · prácticas de ' + esc(mName(mm)) + '</td><td class="num">' + money(M.os[k]) + '</td></tr>'; }).join('') + '</tbody></table>';
    if (M.owed) h += '<div class="hint">Las obras sociales todavía le deben ' + money(M.owed) + ' por prácticas de este profesional: se suman cuando se marque «Llegó el pago».</div>';
    const Y = A.liqYear(pid, m), mx = Math.max.apply(null, Y.map(y => y.prod).concat([1]));
    h += '<h3 style="margin-top:14px">Últimos 12 meses</h3><div class="lq-bars" role="img" aria-label="Cobrado y lo del profesional, últimos 12 meses">' + Y.map(y => '<div class="lq-b" title="' + esc(mName(y.m)) + ': cobrado ' + money(y.prod) + ' · profesional ' + money(y.dent) + '"><div class="lq-col"><span class="lq-p" style="height:' + Math.round(y.prod / mx * 100) + '%"></span><span class="lq-d" style="height:' + Math.round(y.dent / mx * 100) + '%"></span></div><small>' + MON[+y.m.slice(5) - 1] + '</small></div>').join('') + '</div>' +
      '<div class="lq-leg"><span><i class="lq-p"></i>Cobrado</span><span><i class="lq-d"></i>Para el profesional</span></div>';
    const prev = Y[10];
    if (prev && prev.dent) { const v = Math.round((c.dent - prev.dent) / prev.dent * 100); h += '<div class="hint">Comparado con ' + esc(mName(prev.m)) + ': ' + (v >= 0 ? '+' : '') + v + '%.</div>'; }
    return h + '</section>';
  }
  A.liqExtraHTML = extraHTML;
  const liqPrev = A.render.liq;
  A.render.liq = () => {
    liqPrev(); const host = $('#view-liq'), pid = S.liq.pro && S.liq.pro !== 'all' ? S.liq.pro : null; if (!host || !pid) return;
    const secs = host.querySelectorAll('section.card'), last = Array.prototype.filter.call(secs, s => /Detalle de prácticas/.test((s.querySelector('h2') || {}).textContent || ''))[0];
    const html = extraHTML(pid, A.liqMonth()); if (last) last.insertAdjacentHTML('beforebegin', html); else host.insertAdjacentHTML('beforeend', html);
  };

  /* ---------- «Mis números» para el profesional del equipo ---------- */
  const myPro = () => { const mb = A.memberNow && A.memberNow(); return mb && mb.pro ? mb.pro : null; };
  A.acts.myLiq = () => { S.modal = { type: 'myLiq', m: A.today().slice(0, 7) }; A.renderModal(); };
  A.acts.myLiqM = el => { S.modal.m = addM(S.modal.m, +el.getAttribute('data-n')); A.renderModal(); };
  MF.myLiq = m => {
    const pid = myPro() || (A.isBoss() ? (S.liq.pro && S.liq.pro !== 'all' ? S.liq.pro : (A.PROS[0] || {}).id) : null);
    if (!pid) return A.modalShell('Mis números', '<div class="empty">Tu usuario no tiene una agenda de profesional asignada.</div>', '<button class="btn" data-act="closeModal">Cerrar</button>');
    const c = A.liqCalc(pid, m.m);
    let b = '<div class="cj-day"><button class="btn small" data-act="myLiqM" data-n="-1" aria-label="Mes anterior">‹</button><b>' + esc(A.cap(mName(m.m))) + '</b><button class="btn small" data-act="myLiqM" data-n="1" aria-label="Mes siguiente"' + (m.m >= A.today().slice(0, 7) ? ' disabled' : '') + '>›</button></div>';
    b += '<div class="cj-kpis"><div class="cj-kpi big"><small>Te corresponde</small><b>' + money(c.net) + '</b><span>' + esc(c.deal || '') + '</span></div><div class="cj-kpi"><small>Cobrado</small><b>' + money(c.prod) + '</b></div>' + (c.ded ? '<div class="cj-kpi"><small>Descuentos</small><b>' + money(c.ded) + '</b></div>' : '') + '</div>';
    b += extraHTML(pid, m.m);
    b += '<div class="hint">Es un cálculo con lo cargado hasta hoy. La liquidación final la cierra el centro.</div>';
    return A.modalShell('Mis números · ' + ((A.PRO(pid) || {}).name || ''), b, '<button class="btn" data-act="closeModal">Cerrar</button>');
  };
  /* entrada en el menú para el profesional del equipo */
  const addMenu = () => {
    const show = !!myPro(); const nav = document.querySelector('nav.dr-nav');
    let b = document.getElementById('drMyLiq');
    if (!show) { if (b) b.remove(); return; }
    if (b || !nav) return;
    const ref = nav.querySelector('.dnav[data-act="newsOpen"]') || nav.querySelector('.dnav');
    const btn = document.createElement('button'); btn.className = 'dnav'; btn.id = 'drMyLiq'; btn.setAttribute('data-act', 'myLiq'); btn.innerHTML = '<span class="t">Mis números</span>';
    if (ref) ref.parentNode.insertBefore(btn, ref); else nav.appendChild(btn);
  };
  const arPrev = A.afterRefresh; A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; try { addMenu(); } catch (e) { /* nada */ } return r; };

  const css = document.createElement('style');
  css.textContent = '.lq-bars{display:flex;gap:6px;align-items:flex-end;height:150px;padding:6px 0;overflow-x:auto}.lq-b{flex:1 0 22px;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%}' +
    '.lq-col{flex:1;width:100%;display:flex;align-items:flex-end;justify-content:center;gap:2px}.lq-col span{width:42%;border-radius:4px 4px 0 0;min-height:1px}.lq-b small{font-size:.7rem;color:var(--muted,#667)}' +
    '.lq-p{background:#9cc7c9}.lq-d{background:var(--teal,#0b6b6f)}.lq-leg{display:flex;gap:14px;font-size:.8rem;color:var(--muted,#667)}.lq-leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:middle}';
  document.head.appendChild(css);
})();
