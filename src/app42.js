/* ===== 1.32: agenda más compacta arriba (más lugar para la grilla), sobre todo en la PC ===== */
(function () {
  'use strict';
  const A = window.App;

  /* «Colores de los turnos» va adentro de «Más» también en la PC (en el celular ya estaba ahí) */
  const prevAgenda = A.render.agenda;
  A.render.agenda = function () {
    const r = prevAgenda.apply(this, arguments);
    const leg = document.querySelector('#view-agenda details.pro-filter[data-key="legend"]');
    const mm = document.querySelector('#view-agenda .more-menu');
    if (leg && mm && !mm.querySelector('.mm-legend')) mm.insertAdjacentHTML('beforeend', '<div class="mm-legend">' + (leg.querySelector('.st-legend') || { outerHTML: '' }).outerHTML + '</div>');
    return r;
  };

  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '#view-agenda details.pro-filter[data-key="legend"]{display:none}.mm-legend{padding:8px 12px;border-top:1px solid var(--line)}.mm-legend .st-legend{display:flex;flex-wrap:wrap;gap:6px;margin:0}' +
    /* ---------- PC y tablet ---------- */
    '@media (min-width:641px){' +
    '#view-agenda .ag-head{padding-top:2px;gap:8px}#view-agenda .ag-head .btn{min-height:34px;min-width:34px;padding:0 9px}' +
    '#view-agenda .ag-title{font-size:21px;line-height:1.15}#view-agenda .ag-title small{display:inline;margin-left:8px;font-size:12.5px}' +
    '#view-agenda .ag-tools{padding:2px 0 4px;gap:6px}#view-agenda .ag-tools .btn{min-height:34px;padding:0 12px}#view-agenda .ag-tools .seg{padding:2px}#view-agenda .ag-tools .seg button{padding:3px 10px;font-size:13.5px}#view-agenda #agDate{min-height:30px;font-size:13.5px}' +
    '#view-agenda .swipe-hint,#view-agenda .drag-note{display:none}' +
    '#view-agenda .daystrip{padding-top:1px;padding-bottom:3px;margin-bottom:2px;gap:5px}#view-agenda .daystrip .wk{padding:3px 0;min-width:54px}#view-agenda .daystrip .wk b{font-size:16px;line-height:1.1}#view-agenda .daystrip .wk small,#view-agenda .daystrip .wk span{font-size:10.5px;line-height:1.2}' +
    '#view-agenda .ds-arr{min-height:40px!important;height:40px}' +
    '#view-agenda .stats{margin:0 0 6px;gap:6px}#view-agenda .stat{padding:2px 9px;font-size:12.5px}#view-agenda .stat b{font-size:13.5px}' +
    '#view-agenda .gcol .gh{padding-top:4px;padding-bottom:4px}#view-agenda .gutter .gh{padding-top:4px;padding-bottom:4px}' +
    '#view-agenda .ag-left{padding-top:10px;padding-bottom:10px}#view-agenda .ag-left .ap-pro{padding:6px 8px}#view-agenda .ag-left .ap-av{width:34px;height:34px;font-size:13px}' +
    '}' +
    /* ---------- celular: un poquito más, sin achicar de más ---------- */
    '@media (max-width:640px){' +
    '#view-agenda .ag-head{padding-top:2px}#view-agenda .ag-tools{padding:2px 0 4px}' +
    '#view-agenda .ap-list.h{padding-top:0;padding-bottom:4px;margin-bottom:2px}#view-agenda .ap-list.h .ap-pro{padding:4px 6px;gap:2px}#view-agenda .ap-list.h .ap-av{width:30px;height:30px;font-size:12px}#view-agenda .ap-list.h .ap-tx{line-height:1.15}' +
    '#view-agenda .stats{margin-bottom:4px}' +
    '}' +
    '</style>');
})();
