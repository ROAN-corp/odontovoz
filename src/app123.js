/* ===== 1.38: animaciones suaves en las ventanas emergentes (ventanas, ventanita del turno, avisos y menús) ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, $ = q => document.querySelector(q);
  const reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* una ventana anima solo cuando se abre (o cambia a otra), no cada vez que se vuelve a dibujar por dentro */
  let last = null;
  const rmPrev = A.renderModal;
  A.renderModal = function () {
    const r = rmPrev.apply(this, arguments);
    try { const m = S.modal, key = m ? m.type : null, sc = $('#modalHost .modal-scrim'); if (sc && key !== last && !reduce()) sc.classList.add('m-anim'); last = key; } catch (e) { /* nada */ }
    return r;
  };
  /* al cerrar con la X o «Cerrar»: se desvanece un instante antes de irse */
  const cmPrev = A.acts.closeModal;
  if (cmPrev) A.acts.closeModal = function (el, ev) {
    const sc = $('#modalHost .modal-scrim'), m = S.modal;
    if (!sc || !m || reduce() || sc.classList.contains('m-out')) return cmPrev.apply(this, arguments);
    sc.classList.remove('m-anim'); sc.classList.add('m-out'); const self = this, args = arguments;
    setTimeout(() => { if (S.modal === m) cmPrev.apply(self, args); }, 150);
  };

  /* ventanitas que se crean sueltas en el body: ventanita del turno, elegir WhatsApp, aviso de actualización */
  const IDS = { tpop: 1, waPick: 1, updPop: 1 }, closedAt = {};
  try {
    new MutationObserver(list => list.forEach(rec => {
      rec.removedNodes.forEach(n => { if (n.id && IDS[n.id]) closedAt[n.id] = Date.now(); });
      rec.addedNodes.forEach(n => { if (n.nodeType === 1 && n.id && IDS[n.id] && Date.now() - (closedAt[n.id] || 0) > 500 && !reduce()) n.classList.add('pop-anim'); });
    })).observe(document.body, { childList: true });
  } catch (e) { /* nada */ }

  const css = document.createElement('style');
  css.textContent = '@keyframes scrimIn{from{opacity:0}}@keyframes scrimOut{to{opacity:0}}' +
    '@keyframes modalIn{0%{opacity:0;translate:0 18px;scale:.94}60%{opacity:1}100%{translate:0 0;scale:1}}@keyframes modalOut{to{opacity:0;translate:0 10px;scale:.96}}' +
    '@keyframes popIn{0%{opacity:0;translate:0 10px;scale:.93}100%{opacity:1;translate:0 0;scale:1}}' +
    '@keyframes toastIn{0%{opacity:0;translate:0 16px;scale:.95}100%{opacity:1;translate:0 0;scale:1}}@keyframes toastInTop{0%{opacity:0;translate:0 -16px;scale:.95}100%{opacity:1;translate:0 0;scale:1}}' +
    '@keyframes menuIn{0%{opacity:0;translate:0 -6px;scale:.96}100%{opacity:1;translate:0 0;scale:1}}' +
    '.modal-scrim.m-anim{animation:scrimIn .22s ease-out}.modal-scrim.m-anim .modal{animation:modalIn .38s cubic-bezier(.2,1.25,.3,1)}' +
    '.modal-scrim.m-out{animation:scrimOut .15s ease-in forwards}.modal-scrim.m-out .modal{animation:modalOut .15s ease-in forwards}' +
    '#tpop.pop-anim,#waPick.pop-anim,#updPop.pop-anim .up-card{animation:popIn .3s cubic-bezier(.2,1.3,.4,1);transform-origin:top left}' +
    '#toastHost .toast{animation:toastIn .32s cubic-bezier(.2,1.3,.4,1)}' +
    '.more-menu,.menu:not(.drawer){animation:menuIn .18s ease-out}' +
    '.btn{transition:scale .12s ease,box-shadow .15s,background .15s,border-color .15s}.btn:active:not(:disabled){scale:.96}' +
    '@media (max-width:640px){#toastHost .toast{animation-name:toastInTop}.modal-scrim.m-anim .modal{animation-name:modalInM}@keyframes modalInM{0%{opacity:0;translate:0 26px;scale:.97}100%{translate:0 0;scale:1}}}' +
    '@media (prefers-reduced-motion:reduce){.modal-scrim,.modal-scrim .modal,#tpop,#waPick,#updPop .up-card,#toastHost .toast,.more-menu,.menu{animation:none!important}.btn{transition:none}}';
  document.body.appendChild(css);
})();
