/* ===== 1.44: cada profesional ve solo su propia agenda (opción del dueño en Usuarios del equipo) ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  /* Con la opción prendida (A.CFG.agOwn), los usuarios con puesto Profesional o Asistente ven solo a su profesional.
     Dueño, socios, administración y secretaría siguen viendo todo. */
  const mine = () => {
    if (!A.CFG || !A.CFG.agOwn) return null;
    const m = A.memberNow && A.memberNow(); if (!m || (m.role !== 'profesional' && m.role !== 'asistente')) return null;
    return (A.mbPro && A.mbPro()) || null;
  };
  A.agOwnPro = mine;

  const vpPrev = A.visPros;
  A.visPros = function () {
    const l = vpPrev.apply(this, arguments), id = mine(); if (!id) return l;
    const f = l.filter(p => p.id === id); return f.length ? f : (A.PRO(id) ? [A.PRO(id)] : l);
  };
  const keepPrev = A.locKeep;
  A.locKeep = function (a) {
    const id = mine();
    if (id && a && a.pro && a.pro !== id) return false;
    return keepPrev ? keepPrev.apply(this, arguments) : true;
  };
  const arPrev = A.afterRefresh;
  A.afterRefresh = function () {
    const id = mine(); if (id && !(S.proSel && S.proSel.length === 1 && S.proSel[0] === id)) S.proSel = [id];
    return arPrev ? arPrev.apply(this, arguments) : undefined;
  };

  /* el interruptor, arriba de «Usuarios del equipo» (solo dueño y socios) */
  const teamPrev = MF.team;
  if (teamPrev) MF.team = function () {
    let h = teamPrev.apply(this, arguments); if (typeof h !== 'string' || (A.memberNow && A.memberNow())) return h;
    const box = '<label class="chk ag-own"><input type="checkbox" data-chg="agOwn"' + (A.CFG.agOwn ? ' checked' : '') + '> <span><b>Cada profesional ve solo su agenda</b><small>Los usuarios con puesto Profesional o Asistente no ven los turnos de los otros profesionales. Vos, los socios, la administración y la secretaría siguen viendo todo. Se oculta en pantalla; no es una barrera de seguridad de los datos.</small></span></label>';
    const k = '<div class="tm-code">'; return h.indexOf(k) >= 0 ? h.replace(k, box + k) : h.replace('<div class="tm-me">', box + '<div class="tm-me">');
  };
  A.chg.agOwn = el => { A.CFG.agOwn = !!el.checked; A.save(); A.toast(A.CFG.agOwn ? 'Listo: cada profesional ve solo su agenda.' : 'Listo: todos los profesionales ven todas las agendas.'); A.refresh(); };

  const css = document.createElement('style'); css.id = 'ovApp127';
  css.textContent = '.ag-own{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:0 0 12px;background:var(--surface-2)}.ag-own small{display:block;color:var(--ink-2);font-weight:400;margin-top:2px;line-height:1.35}';
  document.head.appendChild(css);
})();
