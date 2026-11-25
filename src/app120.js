/* ===== 1.34: buscador de pacientes de la barra de arriba: en pantallas chicas los resultados ocupan todo el ancho ===== */
(function () {
  'use strict';
  const css = document.createElement('style');
  css.textContent = '@media (max-width:760px){.searchbox .results{position:fixed;left:8px;right:8px;top:calc(62px + env(safe-area-inset-top,0px));max-height:calc(100dvh - 140px);width:auto;z-index:140;box-shadow:0 14px 34px rgba(0,0,0,.22)}.searchbox .results .res{word-break:normal;overflow-wrap:anywhere}.searchbox .results .res b{min-width:0}}';
  document.body.appendChild(css);
})();
