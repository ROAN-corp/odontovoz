/* ===== 1.20.1: la ventanita del turno (en la PC) siempre entra entera en la pantalla, aunque crezca después de abrirse ===== */
(function () {
  'use strict';
  /* app38 la ubica junto al clic midiendo su alto al aparecer; después otros módulos le suman cosas (cobrar antes, consultorio, color)
     y en los últimos turnos del día quedaba cortada abajo. Acá se reacomoda cada vez que cambia de tamaño. */
  const M = 10;
  function fit(el) {
    if (!el || el.classList.contains('sheet') || !el.isConnected) return;
    const H = window.innerHeight;
    el.style.maxHeight = (H - 2 * M) + 'px'; el.style.overflowY = 'auto'; el.style.overscrollBehavior = 'contain';
    const r = el.getBoundingClientRect(), top = parseFloat(el.style.top);
    if (isNaN(top)) return;
    if (r.bottom > H - M) el.style.top = Math.max(M - (r.top - top), top - (r.bottom - (H - M))) + 'px';
    else if (r.top < M) el.style.top = (top + (M - r.top)) + 'px';
  }
  let ro = null, seen = null;
  function watch() {
    const el = document.getElementById('tpop');
    if (el === seen) return; seen = el;
    if (ro) { ro.disconnect(); ro = null; }
    if (!el) return;
    fit(el);
    if (window.ResizeObserver) { ro = new ResizeObserver(() => fit(el)); ro.observe(el); }
  }
  try { new MutationObserver(watch).observe(document.body, { childList: true }); } catch (e) { /* nada */ }
  window.addEventListener('resize', () => { const el = document.getElementById('tpop'); if (el) fit(el); });
})();
