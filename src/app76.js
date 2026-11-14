/* ===== 1.52: sin modo LITE (las cuentas con plan LITE quedan como Profesional) y planes: Profesional, Consultorio o Centro, Empresa ===== */
(function () {
  'use strict';
  const A = window.App;
  /* LITE ya no se ofrece: nunca se activa y se borra la preferencia guardada en el equipo */
  try { localStorage.removeItem('odontovoz.lite'); } catch (e) { /* nada */ }
  A.liteForced = () => false;
  A.liteOn = () => false;
  ['liteOn', 'liteToggle', 'liteUp'].forEach(k => { if (A.acts[k]) A.acts[k] = () => {}; });
  const clean = () => {
    document.body.classList.remove('lite');
    document.querySelectorAll('#drLite, .lt-try').forEach(x => x.remove());
  };
  const arPrev = A.afterRefresh;
  A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; try { clean(); } catch (e) { /* nada */ } return r; };
  const css = document.createElement('style');
  css.textContent = '#drLite,.lt-try{display:none!important}';
  document.head.appendChild(css);
})();
