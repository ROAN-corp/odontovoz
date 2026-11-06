/* ===== 1.27: los avisos de arriba se corren con el dedo (o con la ×) y arreglos de la revisión general ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$;

  /* ---------- avisos: deslizar hacia un costado para cerrarlos ---------- */
  const host = $('#toastHost');
  const closeToast = () => { const h = $('#toastHost'); if (h) h.innerHTML = ''; A.toastUndo = null; };
  /* la × en cada aviso */
  const tPrev = A.toast;
  A.toast = function () {
    const r = tPrev.apply(this, arguments);
    const t = document.querySelector('#toastHost .toast');
    if (t && !t.querySelector('.toast-x')) t.insertAdjacentHTML('beforeend', '<button class="toast-x" data-act="toastClose" aria-label="Cerrar aviso" title="Cerrar">×</button>');
    return r;
  };
  A.acts.toastClose = () => closeToast();

  /* arrastre: sirve para el aviso común y para los carteles de «llegó» y «turno online» */
  let drag = null;
  const pick = e => e.target.closest && (e.target.closest('#toastHost .toast') || e.target.closest('#arrHost .arr'));
  const base = el => (el.classList.contains('toast') ? (getComputedStyle(el).position === 'fixed' ? 'translateX(-50%) ' : '') : '');
  document.addEventListener('pointerdown', e => {
    const el = pick(e); if (!el || (e.target.closest('button') && !e.target.closest('.toast-x'))) return;
    drag = { el, x: e.clientX, y: e.clientY, dx: 0, b: base(el), id: e.pointerId, moved: false };
    el.style.transition = 'none';
  }, true);
  document.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { /* hacia arriba también lo cierra */ if (dy < -24) { drag.up = true; } }
    if (Math.abs(dx) > 4 || drag.up) drag.moved = true;
    drag.dx = dx;
    drag.el.style.transform = drag.b + 'translate(' + dx + 'px,' + (drag.up ? Math.min(0, dy) : 0) + 'px)';
    drag.el.style.opacity = String(Math.max(0.15, 1 - Math.abs(dx) / 220));
    if (drag.moved) e.preventDefault();
  }, { capture: true, passive: false });
  const end = e => {
    if (!drag || (e.pointerId != null && e.pointerId !== drag.id)) return;
    const d = drag; drag = null;
    const gone = Math.abs(d.dx) > 70 || d.up;
    d.el.style.transition = 'transform .18s ease-out, opacity .18s ease-out';
    if (gone) {
      d.el.style.transform = d.b + 'translate(' + (d.up ? 0 : (d.dx > 0 ? 1 : -1) * 480) + 'px,' + (d.up ? -120 : 0) + 'px)'; d.el.style.opacity = '0';
      setTimeout(() => { if (d.el.classList.contains('toast')) closeToast(); else d.el.remove(); }, 180);
    } else { d.el.style.transform = d.b; d.el.style.opacity = ''; }
  };
  document.addEventListener('pointerup', end, true);
  document.addEventListener('pointercancel', end, true);

  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '.toast{display:flex;align-items:center;gap:10px;touch-action:pan-y;user-select:none;-webkit-user-select:none;cursor:grab}' +
    '.toast .toast-x{border:0!important;background:transparent!important;color:inherit;font-size:22px;line-height:1;padding:0 2px 2px!important;margin-left:2px;opacity:.75;cursor:pointer;min-width:30px;min-height:30px}' +
    '#arrHost .arr{touch-action:pan-y;cursor:grab}' +
    /* en el celular, debajo de la barra de arriba: ya no tapa la casita ni el sobre */
    '@media (max-width: 760px){.toast{max-width:calc(100vw - 24px);padding:8px 8px 8px 14px;top:calc(60px + env(safe-area-inset-top, 0px))!important}}' +
    '</style>');
})();
