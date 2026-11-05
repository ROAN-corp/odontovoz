/* ===== 1.14: agenda del celular más extendida: menos barras arriba, turnos a lo largo de la pantalla, consultorios visibles y sin cambiar de día al deslizar ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S;
  const phone = () => matchMedia('(max-width: 640px)').matches;

  /* en el celular, tocar el título del día abre el calendario (el campo de fecha queda oculto) */
  document.addEventListener('click', e => {
    const t = e.target && e.target.closest && e.target.closest('#view-agenda .ag-title'); if (!t || !phone()) return;
    const d = $('#agDate'); if (!d) return;
    try { if (d.showPicker) d.showPicker(); else d.click(); } catch (er) { d.focus(); d.click(); }
  });

  /* «Colores de los turnos» pasa adentro del menú «Más» en el celular */
  const prevAgenda = A.render.agenda;
  A.render.agenda = () => {
    prevAgenda();
    if (!phone()) return;
    const leg = document.querySelector('#view-agenda details.pro-filter[data-key="legend"]');
    const mm = document.querySelector('#view-agenda .more-menu');
    if (leg && mm && !mm.querySelector('.mm-legend')) mm.insertAdjacentHTML('beforeend', '<div class="mm-legend">' + (leg.querySelector('.st-legend') || { outerHTML: '' }).outerHTML + '</div>');
  };

  /* flechas flotantes abajo a la izquierda para cambiar de día sin subir (como en otros sistemas) */
  document.body.insertAdjacentHTML('beforeend', '<div class="ag-fnav" id="agFnav" hidden><button data-act="agPrev" aria-label="Día anterior">‹</button><button data-act="agToday" class="t">Hoy</button><button data-act="agNext" aria-label="Día siguiente">›</button></div>');
  const prevAfter = A.afterRefresh;
  A.afterRefresh = () => {
    if (prevAfter) prevAfter();
    const f = $('#agFnav'); if (!f) return;
    f.hidden = !(phone() && S.tab === 'agenda' && !S.modal && !S.panel);
    const t = f.querySelector('.t'); if (t) t.setAttribute('aria-pressed', String(S.date === A.today()));
  };

  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '.ag-fnav{position:fixed;left:12px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:60;display:flex;gap:2px;background:var(--surface);border:1px solid var(--line);border-radius:999px;box-shadow:0 6px 18px rgba(0,0,0,.18);padding:3px}.ag-fnav[hidden]{display:none}' +
    '.ag-fnav button{min-width:48px;height:48px;border:0;background:transparent;color:var(--ink);font:700 24px/1 inherit;border-radius:999px;cursor:pointer}.ag-fnav .t{font-size:15px;min-width:56px}.ag-fnav .t[aria-pressed="true"]{color:var(--accent)}.ag-fnav button:active{background:var(--accent-soft)}' +
    '@media (max-width:640px){body:has(#agFnav:not([hidden])) #view-agenda{padding-bottom:80px}}' +
    '@media (max-width:640px){' +
    /* encabezado compacto: título, flechas y una sola fila de botones */
    '#view-agenda .ag-head{padding-top:4px;gap:6px}#view-agenda .ag-head .btn{min-height:38px;min-width:38px;padding:0 10px}#view-agenda .ag-title{font-size:19px;line-height:1.15;cursor:pointer;text-decoration:underline dotted var(--line);text-underline-offset:5px}' +
    '#view-agenda .ag-tools{flex-wrap:nowrap;gap:6px;padding:4px 0 6px}#view-agenda .ag-tools .grow{display:none}#view-agenda .ag-tools .seg button{padding:0 9px;min-height:38px}#view-agenda .ag-tools .btn{min-height:38px;padding:0 11px;white-space:nowrap}#view-agenda .ag-tools .btn.primary{margin-left:auto}' +
    '#view-agenda #agDate{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}' +
    '#view-agenda details.pro-filter[data-key="legend"]{display:none}.mm-legend{padding:8px 12px;border-top:1px solid var(--line)}.mm-legend .st-legend{display:flex;flex-wrap:wrap;gap:6px}' +
    '#view-agenda .swipe-hint,#view-agenda .drag-note{display:none}' +
    /* tira de días más baja */
    '#view-agenda .daystrip{padding-bottom:4px;margin-bottom:4px;gap:4px}#view-agenda .daystrip .wk{width:46px;padding:4px 0}#view-agenda .daystrip .wk b{font-size:15px}#view-agenda .daystrip .wk small,#view-agenda .daystrip .wk span{font-size:10px}#view-agenda .ds-arr{height:46px;width:28px;font-size:18px}' +
    /* resumen en una línea */
    '#view-agenda .stats{flex-wrap:nowrap;gap:4px;margin-bottom:6px;overflow-x:auto;scrollbar-width:none}#view-agenda .stats::-webkit-scrollbar{display:none}#view-agenda .stat{padding:3px 8px;font-size:12px;white-space:nowrap}#view-agenda .stat b{font-size:13px}' +
    /* consultorios: todos a la vista, sin tener que deslizar */
    '#view-agenda .lbar{flex-wrap:wrap!important;overflow:visible!important;gap:5px;margin:2px 0 6px}#view-agenda .lchip{flex:0 1 auto!important;font-size:13px;padding:4px 10px;min-height:34px;max-width:100%}' +
    /* la agenda del día se extiende hacia abajo: se recorre con la página, sin una caja con su propio scroll */
    '#view-agenda .grid-wrap{max-height:none!important;min-height:0}' +
    '}' +
    '</style>');
})();
