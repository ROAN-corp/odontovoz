/* ===== 1.17.1: «Cambios de hoy»: cada cambio lleva justo a su lugar (sección marcada) ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S;
  const flash = el => { if (!el) return; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('jr-flash'); setTimeout(() => el.classList.remove('jr-flash'), 2400); };
  const cardWith = (root, re) => Array.prototype.slice.call(document.querySelectorAll(root + ' section.card, ' + root + ' .card')).filter(c => re.test((c.querySelector('h2,h3') || {}).textContent || ''))[0];
  /* qué sección de la ficha mostrar según el texto del cambio */
  const SECS = [[/Evoluci[oó]n/, /Evoluci[oó]n/], [/Anamnesis/, /Anamnesis/], [/Datos personales/, /Datos personales/], [/Cuenta y cobros/, /Cuenta|Saldo|Cobros|Movimientos/], [/Presupuestos/, /Presupuesto/], [/Plan de tratamiento|Tratamientos/, /Plan|Tratamiento|Falta hacer/], [/Laboratorio/, /Laborator/], [/Fotos/, /Foto|Radiograf/], [/Recetas/, /Receta/], [/Documentos/, /Documento|Firma/]];
  const prevGo = A.acts.jrGo;
  A.acts.jrGo = (el, ev) => {
    const label = ((el && el.textContent) || '').replace('›', '').trim();
    /* ajustes del consultorio: abrir la sección correspondiente en vez del inicio */
    if (/^(Logo del consultorio|Ajustes del consultorio)$/.test(label)) { A.closeModal(); if (A.acts.cfgOpen) A.acts.cfgOpen({ getAttribute: () => 'centro' }); return; }
    if (/^Turnero online$/.test(label)) { A.closeModal(); if (A.acts.cfgOpen) A.acts.cfgOpen({ getAttribute: () => 'online' }); return; }
    const r = prevGo(el, ev);
    setTimeout(() => {
      if (/^Recordatorios$/.test(label) && S.tab === 'inicio') { window.scrollTo(0, 0); flash($('#remBox')); return; }
      if (S.tab === 'ficha') { const s = SECS.filter(x => x[0].test(label))[0]; if (s) flash(cardWith('#view-ficha', s[1])); return; }
      if (S.tab === 'caja') { window.scrollTo(0, 0); }
    }, 350);
    return r;
  };
  /* que se note que cada cambio es un enlace */
  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '.jr-list .jr-go{color:var(--accent);font-weight:600;flex:1 1 auto;min-height:40px;display:flex;align-items:center;gap:4px}.jr-list .jr-go span{margin-left:auto;font-size:20px;line-height:1}' +
    '.jr-flash{outline:3px solid var(--accent)!important;outline-offset:2px;border-radius:12px;transition:outline-color .3s}' +
    '</style>');
})();
