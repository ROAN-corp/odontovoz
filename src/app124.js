/* ===== 1.39: acceso al video «Configurá tu consultorio» desde Primeros pasos (Inicio) y desde Ajustes ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, $ = q => document.querySelector(q);
  function links() {
    const go = $('[data-act="psGo"]');
    if (go && go.parentNode && !go.parentNode.querySelector('.ps-tut')) go.parentNode.insertAdjacentHTML('beforeend', '<button class="btn ps-tut" data-act="tutVid" data-v="configurar">▶ Ver el video (con voz)</button>');
    if (S.modal && S.modal.type === 'ajustes') { const b = $('.modal .m-body'); if (b && !b.querySelector('.aj-tutv')) b.insertAdjacentHTML('afterbegin', '<button class="aj-tutv" data-act="tutVid" data-v="configurar"><span aria-hidden="true">▶</span><div><b>Mirá el video: cómo configurar tu consultorio</b><small>Es lo primero que tenés que hacer · con voz que te va explicando</small></div></button>'); }
  }
  let rq = 0; const sched = () => { if (rq) return; rq = requestAnimationFrame(() => { rq = 0; try { links(); } catch (e) { /* nada */ } }); };
  try { new MutationObserver(sched).observe(document.body, { childList: true, subtree: true }); } catch (e) { /* nada */ }
  sched();
  const css = document.createElement('style');
  css.textContent = '.aj-tutv{display:flex;align-items:center;gap:12px;width:100%;text-align:left;margin:0 0 12px;padding:12px 14px;border:1.5px solid color-mix(in srgb,var(--accent) 45%,var(--line));border-radius:16px;background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 9%,var(--surface)),var(--surface));color:var(--ink);font:inherit;cursor:pointer}.aj-tutv>span{flex:none;width:40px;height:40px;border-radius:50%;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;font-size:1rem}.aj-tutv b{display:block;font-size:.95rem}.aj-tutv small{color:var(--ink-2);font-size:.78rem}.ps-tut{margin-left:6px}';
  document.body.appendChild(css);
})();
