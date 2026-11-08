/* ===== 1.36.1: tira de días de la agenda centrada en el día elegido, hoy bien marcado y botón «Hoy» cuando se corre ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S;

  /* al entrar a la agenda desde otra sección (botones del menú, la barra o el inicio), arranca en el día de hoy.
     Se escucha el toque antes que la acción porque A.acts.tab se redefine en el arranque. */
  document.addEventListener('click', e => {
    const el = e.target && e.target.closest && e.target.closest('[data-act="tab"][data-tab="agenda"]');
    if (el && S.tab !== 'agenda') { S.date = A.today(); S._dsEnter = true; }
  }, true);

  /* centrar el día elegido (sin animación cuando recién se entra) */
  function center(smooth) {
    const st = $('#dayStrip'); if (!st || !st.clientWidth) return false;
    const b = st.querySelector('.wk[aria-pressed="true"]') || st.querySelector('.wk.today'); if (!b) return false;
    const left = Math.max(0, b.offsetLeft - st.offsetLeft - (st.clientWidth - b.offsetWidth) / 2);
    const keep = st.style.scrollSnapType; st.style.scrollSnapType = 'none';
    if (smooth) { try { st.scrollTo({ left, behavior: 'smooth' }); } catch (e) { st.scrollLeft = left; } setTimeout(() => { st.style.scrollSnapType = keep; }, 450); }
    else { st.style.scrollBehavior = 'auto'; st.scrollLeft = left; st.style.scrollBehavior = ''; requestAnimationFrame(() => { st.scrollLeft = left; st.style.scrollSnapType = keep; }); }
    return true;
  }
  /* mostrar «Hoy» si el día de hoy quedó fuera de la vista o hay otro día elegido */
  function updToday() {
    const st = $('#dayStrip'), btn = $('#dsToday'); if (!st || !btn) return;
    const t = st.querySelector('.wk.today'); let away = S.date !== A.today();
    if (!away) {
      if (!t) away = true;
      else { const x = t.offsetLeft - st.offsetLeft - st.scrollLeft; away = x + t.offsetWidth < 8 || x > st.clientWidth - 8; }
    }
    btn.hidden = !away;
  }
  function decorate() {
    const st = $('#dayStrip'); if (!st) return;
    st.querySelectorAll('.wk.today').forEach(b => { const sm = b.querySelector('small'); if (sm && sm.textContent !== 'Hoy') { sm.setAttribute('data-dow', sm.textContent); sm.textContent = 'Hoy'; } });
    const host = st.parentNode;
    if (!$('#dsToday')) {
      host.style.position = host.style.position || 'relative';
      host.insertAdjacentHTML('beforeend', '<button id="dsToday" class="ds-today" data-act="dsToday" hidden aria-label="Volver al día de hoy">Hoy</button>');
    }
    if (!st._dsBound) { st._dsBound = true; st.addEventListener('scroll', () => { clearTimeout(st._dsT); st._dsT = setTimeout(updToday, 60); }, { passive: true }); }
    updToday();
  }
  A.acts.dsToday = () => { const was = S.date; S.date = A.today(); if (was !== S.date) { S._dsCenter = true; A.refresh(); } else center(true); setTimeout(updToday, 500); };

  const arPrev = A.afterRefresh;
  A.afterRefresh = function () {
    if (arPrev) arPrev.apply(this, arguments);
    if (S.tab !== 'agenda') { S._dsLast = null; return; }
    if (!$('#dayStrip')) return;
    const enter = S._dsEnter || S._dsLast == null, changed = S._dsLast != null && S._dsLast !== S.date, force = S._dsCenter;
    S._dsEnter = false; S._dsCenter = false; S._dsLast = S.date;
    decorate();
    if (enter || changed || force) {
      /* esperar a que la sección esté visible para medir bien */
      let n = 0; const go = () => { if (center(!enter) || ++n > 10) { setTimeout(updToday, enter ? 30 : 480); return; } requestAnimationFrame(go); };
      requestAnimationFrame(go);
    }
  };

  /* al volver a la app (desde otra app o al desbloquear) con la agenda abierta: el día de hoy, centrado */
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (S.tab !== 'agenda' || S.modal) return;
    if (Date.now() - hiddenAt > 60 * 1000 && S.date !== A.today()) { S.date = A.today(); S._dsCenter = true; A.refresh(); }
    else { requestAnimationFrame(() => { center(false); updToday(); }); }
  });
  window.addEventListener('resize', () => { if (S.tab === 'agenda') { clearTimeout(window._dsRz); window._dsRz = setTimeout(() => { center(false); updToday(); }, 150); } });

  const css = document.createElement('style');
  css.textContent = [
    '#dayStrip .wk.today { border: 2px solid var(--accent); }',
    '#dayStrip .wk.today small { color: var(--accent); font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }',
    '#dayStrip .wk.today[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 4px 12px -4px rgba(0,0,0,.35); }',
    '#dayStrip .wk.today[aria-pressed="true"] b, #dayStrip .wk.today[aria-pressed="true"] small, #dayStrip .wk.today[aria-pressed="true"] span { color: #fff; }',
    '#dayStrip .wk[aria-pressed="true"]:not(.today) { border-width: 2px; }',
    '.ds-today { position: absolute; right: 4px; top: 50%; transform: translateY(-60%); z-index: 3; min-height: 40px; padding: 0 16px; border-radius: 999px; border: 0; background: var(--accent); color: #fff; font: inherit; font-weight: 800; font-size: 15px; box-shadow: 0 6px 18px -6px rgba(0,0,0,.45); cursor: pointer; }',
    '.ds-wrap .ds-today { right: 44px; } @media (hover:none) { .ds-wrap .ds-today { right: 4px; } }',
    '.ds-today[hidden] { display: none; }'
  ].join('\n');
  document.head.appendChild(css);
})();
