/* ===== 1.5: resumen del turno ordenado: arriba datos, odontograma y motivo; «Ficha completa» grande con lo realizado, lo pagado y lo que debe; seña chiquita ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc || (s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]));
  const css = document.createElement('style');
  css.textContent = '#panelHost .fc-btn.fc-big{display:flex;justify-content:center;width:100%;margin:0;padding:11px 14px;font-size:16px;border-radius:12px;background:var(--accent);color:#fff;border-color:var(--accent);box-shadow:0 2px 8px rgba(0,0,0,.12)}' +
    '#panelHost .fc-card{display:flex;flex-direction:column;gap:8px;padding:12px 14px;margin:0 0 10px;border:1px solid var(--line,#dde3e2);border-radius:14px;background:var(--surface,#fff);flex:none}' +
    '#panelHost .fc-acct{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}' +
    '#panelHost .fc-acct>div{display:flex;flex-direction:column;align-items:center;padding:6px 4px;border-radius:10px;background:var(--bg-soft,rgba(0,0,0,.035));text-align:center}' +
    '#panelHost .fc-acct small{font-size:11px;letter-spacing:.04em;text-transform:uppercase;opacity:.7}' +
    '#panelHost .fc-acct b{font-size:15px;font-variant-numeric:tabular-nums}' +
    '#panelHost .fc-acct .debe b{color:var(--bad,#c0392b)}#panelHost .fc-acct .ok b{color:var(--ok,#1e8a5a)}' +
    '#panelHost .fc-done{font-size:13px;line-height:1.35;opacity:.85}#panelHost .fc-done b{opacity:1}' +
    '#panelHost .fc-pay{align-self:flex-start}' +
    '#panelHost .sena-block.sena-mini{display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:8px;padding:6px 12px;margin:0 0 10px;min-height:0;flex:none}' +
    '#panelHost .sena-block.sena-mini h3{display:inline;margin:0;font-size:11px}#panelHost .sena-block.sena-mini .hint{font-size:13px}' +
    '#panelHost .sena-block.sena-mini>div{display:flex;flex-direction:row;flex-wrap:wrap;align-items:baseline;gap:4px 6px;font-size:13px}' +
    '#panelHost .sena-block.sena-mini .sena-amt{font-size:13px}' +
    '#panelHost .sena-block.sena-mini .btn{padding:3px 10px;font-size:12px;min-height:0}';
  document.head.appendChild(css);

  /* realizado = cargos (con ajustes), pagado = pagos, debe = saldo */
  function acctHTML(pid) {
    const L = (A.pd(pid).ledger || []), t = A.today();
    let done = 0, paid = 0;
    L.forEach(e => { if (e.type === 'pago') paid += e.amount || 0; else done += e.amount || 0; });
    const sal = A.saldo(pid);
    const today = L.filter(e => e.type === 'cargo' && e.date === t).map(e => String(e.desc || '').replace(/\s*\(presupuesto.*$/, ''));
    const last = L.filter(e => e.type === 'cargo' && e.date !== t && e.desc !== 'Saldo anterior').sort((x, y) => (y.date || '').localeCompare(x.date || ''))[0];
    const box = (k, lbl, v) => '<div class="' + k + '"><small>' + lbl + '</small><b>' + v + '</b></div>';
    return '<div class="fc-acct">' + box('', 'Realizado', A.money(done)) + box('', 'Pagado', A.money(paid)) +
      (sal > 0 ? box('debe', 'Debe', A.money(sal)) : sal < 0 ? box('ok', 'A favor', A.money(-sal)) : box('ok', 'Debe', 'Al día')) + '</div>' +
      (today.length ? '<div class="fc-done"><b>Hoy:</b> ' + esc(today.slice(0, 4).join(' · ')) + (today.length > 4 ? ' y ' + (today.length - 4) + ' más' : '') + '</div>'
        : last ? '<div class="fc-done"><b>Último realizado:</b> ' + esc(String(last.desc || '').replace(/\s*\(presupuesto.*$/, '')) + ' · ' + A.fmtDMY(last.date) + '</div>' : '');
  }

  /* orden: cabecera · seña chiquita · ficha completa + cuenta · datos · odontograma · motivo · el resto como estaba */
  const H3 = (el, re) => { const h = el.querySelector(':scope > h3, :scope > div > h3'); return !!(h && re.test(h.textContent)); };
  let busy = false;
  function arrange() {
    const panel = document.querySelector('#panelHost .panel');
    if (!panel || !S.panel || (S.panel.type !== 'appt' && S.panel.type !== 'pat') || A.CFG.panelOld === true) return;
    /* 1.15: también al abrir un paciente desde el buscador (panel «pat»), no solo desde el turno */
    let pid = null;
    if (S.panel.type === 'pat') pid = S.panel.pid;
    else { const a = A.apptById(S.panel.id); if (!a || a.type === 'block' || !a.pid) return; pid = a.pid; }
    if (!pid || !A.PAT(pid)) return;
    const head = panel.querySelector(':scope > .panel-head'); if (!head) return;
    const kids = [...panel.children];
    const sena = kids.find(e => e.classList.contains('sena-block'));
    const datos = kids.find(e => e.classList.contains('block') && H3(e, /^Datos principales/i));
    const odon = kids.find(e => e.classList.contains('block') && H3(e, /^Odontograma/i));
    const mot = kids.find(e => e.classList.contains('motivo-block'));
    let card = panel.querySelector(':scope > .fc-card');
    if (!card) {
      card = document.createElement('div'); card.className = 'fc-card';
      const btn = head.querySelector('.fc-btn') || Object.assign(document.createElement('button'), { className: 'fc-btn', textContent: 'Ficha completa ›' });
      btn.setAttribute('data-act', 'openFicha'); btn.setAttribute('data-pid', pid); btn.classList.add('fc-big'); btn.textContent = 'Abrir ficha completa ›';
      card.appendChild(btn);
      const debe = A.saldo(pid);
      card.insertAdjacentHTML('beforeend', acctHTML(pid) + (debe > 0 ? '<button class="btn fc-debt" data-act="debtPay" data-pid="' + pid + '">💵 Cobrar deuda · ' + A.money(debe) + '</button>' : '') + '<button class="btn small fc-pay" data-act="openFicha" data-pid="' + pid + '" data-tab="cuenta">' + (debe > 0 ? 'Ver la cuenta' : 'Cobrar / ver cuenta') + '</button>');
    }
    /* la fila «Cuenta» de datos principales ya está en la tarjeta */
    if (datos) datos.querySelectorAll('dt').forEach(dt => { if (/^Cuenta$/i.test(dt.textContent.trim()) && dt.nextElementSibling) { dt.nextElementSibling.remove(); dt.remove(); } });
    if (sena) sena.classList.add('sena-mini');
    const want = [sena, card, datos, odon, mot].filter(Boolean);
    let ref = head;
    want.forEach(el => { if (ref.nextElementSibling !== el) ref.after(el); ref = el; });
    /* «+ Sobreturno» queda después de lo principal */
    const sob = panel.querySelector(':scope > .sob-add'); if (sob && ref.nextElementSibling !== sob) ref.after(sob);
  }
  const run = () => { if (busy) return; busy = true; try { arrange(); } catch (e) { if (A.logError) A.logError('panel85', e); } busy = false; };
    const host = document.getElementById('panelHost');
  if (host && window.MutationObserver) new MutationObserver(() => { if (!busy) run(); }).observe(host, { childList: true, subtree: true });
  A.panelArrange = run;
  /* 1.17.4: cobrar la deuda directo desde el resumen (por ejemplo, el paciente viene solo a pagar lo que debía) */
  A.acts.debtPay = el => { const pid = el.getAttribute('data-pid'); if (!pid) return; const s = A.saldo(pid); S.modal = { type: 'cobro', pid, amt: s > 0 ? s : '' }; A.renderModal(); };
  const css2 = document.createElement('style');
  css2.textContent = '#panelHost .fc-debt{display:flex;justify-content:center;width:100%;padding:10px 14px;font-size:15.5px;font-weight:700;border-radius:12px;border:1.5px solid var(--red);background:color-mix(in srgb,var(--red) 10%,var(--surface));color:var(--red)}#panelHost .fc-debt:hover{background:color-mix(in srgb,var(--red) 16%,var(--surface))}';
  document.head.appendChild(css2);
})();
