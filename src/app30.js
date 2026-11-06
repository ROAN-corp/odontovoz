/* ===== 1.20.1: la agenda se queda donde estabas trabajando (vuelve arriba solo al entrar desde otra sección) ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S;
  /* en la PC la grilla tiene su propia barra: al volver a dibujarla (después de agendar, mover o cambiar algo)
     arrancaba de cero. Ahora se guarda la posición y se repone, mientras se siga en la agenda. */
  let shown = null;
  const rPrev = A.render.agenda;
  A.render.agenda = function () {
    const g = $('#gridWrap'), stay = shown === 'agenda' && S.tab === 'agenda';
    const keep = stay && g ? { t: g.scrollTop, l: g.scrollLeft } : null, wy = stay ? window.scrollY : null;
    const r = rPrev.apply(this, arguments);
    if (keep) { const g2 = $('#gridWrap'); if (g2) { g2.scrollTop = keep.t; g2.scrollLeft = keep.l; } }
    if (wy != null && Math.abs(window.scrollY - wy) > 2) window.scrollTo(0, wy);
    return r;
  };
  const prevAfter = A.afterRefresh;
  A.afterRefresh = () => { if (prevAfter) prevAfter(); shown = S.tab; };
})();
