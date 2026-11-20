/* ===== 1.20.2: Stock de insumos con altura fija al cambiar de pestaña y los 4 accesos directos en una sola fila en el celular ===== */
(function () {
  'use strict';
  const css = document.createElement('style');
  css.id = 'ovApp105';
  css.textContent = [
    /* Stock: la ventana no se achica en «Movimientos» (pasaba de 828 a 289 px de alto en el celular) */
    '.modal:has(#stkHost) { height: calc(100vh - 32px); height: calc(100dvh - 32px); max-height: 900px; }',
    '@media (max-width: 640px) { .modal:has(#stkHost) { height: calc(100vh - 16px); height: calc(100dvh - 16px); max-height: none; } }',
    '.modal:has(#stkHost) .m-body { flex: 1 1 auto; min-height: 0; }',
    /* Inicio: cada acceso ocupa un cuarto del ancho (antes, base de 100 px: el cuarto bajaba a otra fila) */
    '#view-inicio .home-actions.icons .ha { flex: 0 1 calc((100% - 12px) / 4) !important; min-width: 0 !important; max-width: 110px; }',
    '#view-inicio .home-actions.icons .ha span { overflow-wrap: normal; word-break: normal; hyphens: auto; }'
  ].join('\n');
  document.body.appendChild(css);
})();
