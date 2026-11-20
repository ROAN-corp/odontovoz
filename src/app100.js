/* ===== 1.17.1: recargos preestablecidos (descargados de odontovoz.com.ar), turno nuevo sin superposiciones y del mismo tamaño en Bloquear/Nota ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, MF = A.modalFns, esc = A.esc;

  /* =====================================================================
     1. MEDIOS DE PAGO Y RECARGOS: «Usar valores preestablecidos»
        El archivo se publica en sitio/recargos/preset.json; si no hay internet se usa esta copia.
     ===================================================================== */
  const URL = 'https://odontovoz.com.ar/recargos/preset.json';
  const BUILTIN = {
    v: 1, updated: '2026-11-20',
    source: 'Cuotas MiPyME (Payway y Cabal) para 3 y 6 cuotas; comisión máxima por ley 25.065 para crédito en 1 pago (1,8% + IVA); BCRA: el pago con débito no lleva recargo.',
    note: 'Recargo que cubre lo que te descuenta la tarjeta, para que cobres lo mismo que de contado. Para más de 6 cuotas cada banco o procesador tiene su tasa: consultala y cargala a mano.',
    rates: { 'Efectivo': { p: 0 }, 'Transferencia': { p: 0 }, 'Débito': { p: 0 }, 'Crédito': { cuo: true, c: { 1: 2.2, 3: 9.1, 6: 18.7 } }, 'Mercado Pago': { p: 0 } }
  };
  let preset = BUILTIN;
  async function getPreset() {
    try {
      const r = await fetch(URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (r.ok) { const j = await r.json(); if (j && j.rates && j.updated) preset = j; }
    } catch (e) { /* sin internet: queda la copia que trae la app */ }
    return preset;
  }
  const fmtD = d => { const p = String(d || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : d; };
  const prPrev = MF.payRates;
  if (prPrev) MF.payRates = function (m) {
    const h = prPrev.apply(this, arguments);
    const ok = !A.isBoss || A.isBoss();
    if (!ok || typeof h !== 'string') return h;
    const box = '<div class="pr-preset"><div><b>¿No sabés qué porcentajes poner?</b><span>Cargamos valores de referencia y después los cambiás como quieras.</span></div>' +
      '<button class="btn primary small" data-act="prPreset">Usar valores preestablecidos</button>' +
      '<small>Valores al ' + esc(fmtD(preset.updated)) + '. Fuente: ' + esc(preset.source) + '</small>' + (m && m.presetOn ? '<p class="pr-pnote">' + esc(preset.note) + '</p>' : '') + '</div>';
    return h.replace('<div class="pr-list">', box + '<div class="pr-list">');
  };
  A.acts.prPreset = async () => {
    const m = S.modal; if (!m || m.type !== 'payRates') return;
    const btn = $('#modalHost [data-act="prPreset"]'); if (btn) { btn.disabled = true; btn.textContent = 'Buscando los valores…'; }
    const p = await getPreset();
    if (!m.prev) m.prev = JSON.parse(JSON.stringify(A.CFG.payRates || {}));
    const R = JSON.parse(JSON.stringify(A.CFG.payRates || {}));
    Object.keys(p.rates).forEach(k => { R[k] = JSON.parse(JSON.stringify(p.rates[k])); });
    A.CFG.payRates = R; m.presetOn = true;
    A.renderModal();
    A.toast('Listo: se cargaron los valores al ' + fmtD(p.updated) + '. Revisalos y tocá Guardar.');
  };
  /* «Cancelar» deshace lo preestablecido si no se guardó */
  const clPrev = A.acts.payRatesClose;
  if (clPrev) A.acts.payRatesClose = function () { const m = S.modal; if (m && m.type === 'payRates' && m.prev) A.CFG.payRates = m.prev; return clPrev.apply(this, arguments); };
  getPreset();   /* se actualiza al abrir la app (si hay internet) */

  /* =====================================================================
     2. TURNO NUEVO / BLOQUEAR / NOTA: mismo tamaño de ventana
     ===================================================================== */
  let naH = 0;
  const rmPrev = A.renderModal;
  A.renderModal = function () {
    const r = rmPrev.apply(this, arguments);
    try {
      const md = $('#modalHost .modal'), t = S.modal && S.modal.type;
      if (md && (t === 'newAppt' || t === 'qblock')) {
        md.classList.add('na-fixed');
        if (t === 'newAppt') { md.style.minHeight = naH ? naH + 'px' : ''; const hh = md.offsetHeight; if (hh > naH) naH = hh; }
        else if (naH) md.style.minHeight = naH + 'px';
      } else if (!S.modal) naH = 0;
    } catch (e) { /* nada */ }
    return r;
  };

  const css = document.createElement('style');
  css.textContent = [
    '.pr-preset { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; align-items: center; margin: 0 0 12px; padding: 12px 14px; border-radius: 14px; border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--line)); background: color-mix(in srgb, var(--accent) 7%, var(--surface)); }',
    '.pr-preset > div { display: flex; flex-direction: column; gap: 2px; } .pr-preset > div span { font-size: 13px; color: var(--ink-2); }',
    '.pr-preset small { grid-column: 1 / -1; font-size: 11.5px; color: var(--ink-2); }',
    '.pr-pnote { grid-column: 1 / -1; margin: 2px 0 0; font-size: 13px; color: var(--ink); background: var(--surface); border-radius: 10px; padding: 8px 10px; border: 1px dashed var(--line); }',
    '@media (max-width: 520px) { .pr-preset { grid-template-columns: 1fr; } }',
    /* la hora ocupa toda la fila: no se pisa con la duración y los horarios libres se ven enteros */
    '#modalHost .na-fixed .row3:has(.na-time) { grid-template-columns: 1fr 1fr !important; }',
    '#modalHost .na-fixed .row3 .field:has(.na-time) { grid-column: 1 / -1; order: 3; }',
    '#modalHost .na-fixed .na-time { flex-wrap: nowrap; min-width: 0; } #modalHost .na-fixed .na-time select { min-width: 0 !important; flex: 1 1 0 !important; max-width: none !important; }',
    '#modalHost .na-fixed .na-fc { flex-wrap: wrap; overflow-x: visible; max-height: 84px; overflow-y: auto; }',
    '#modalHost .na-fixed .row2, #modalHost .na-fixed .row3 { min-width: 0; } #modalHost .na-fixed .field { min-width: 0; }',
    '#modalHost .na-fixed .field select, #modalHost .na-fixed .field input { max-width: 100%; }'
  ].join('\n');
  document.head.appendChild(css);
})();
