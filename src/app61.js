/* ===== 1.46.2: odontólogo del equipo: ve todas las agendas del centro, pero solo modifica los turnos de su agenda; avisos solo de sus pacientes ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S;
  const $ = s => document.querySelector(s);
  /* profesional del puesto (odontólogo o asistente del equipo con agenda asignada); dueño, administración y recepción no tienen límite */
  const myPro = () => { const m = A.memberNow && A.memberNow(); return m && (m.role === 'profesional' || m.role === 'asistente') && m.pro ? m.pro : null; };
  A.myProOnly = myPro;
  A.canEditAppt = a => { const p = myPro(); return !p || !a || !a.pro || a.pro === p; };
  const proName = id => { const p = A.PRO && A.PRO(id); return p ? p.name : 'otro profesional'; };
  const J = x => JSON.stringify(x === undefined ? null : x);
  const clone = x => JSON.parse(JSON.stringify(x));
  let lastWarn = 0;
  const warn = who => { lastWarn = Date.now(); A.toast('Ese turno es de la agenda de ' + who + '. Lo pueden cambiar recepción o la administración del centro.'); };

  /* cualquier cambio de turnos pasa por A.mutate: si toca la agenda de otro profesional, eso se deshace */
  const mutPrev = A.mutate;
  A.mutate = (keys, fn, msg) => {
    const me = myPro(); if (!me) return mutPrev(keys, fn, msg);
    let who = '';
    const res = mutPrev(keys, () => {
      const before = {}; (keys || []).forEach(k => { before[k] = clone(A.day(k)); });
      const r = fn();
      (keys || []).forEach(k => {
        const B = before[k] || [], N = A.S.days[k] || [], bm = {}, seen = {}, out = [];
        B.forEach(b => { bm[b.id] = b; });
        N.forEach(a => {
          seen[a.id] = 1; const b = bm[a.id];
          if (b) {
            if ((b.pro && b.pro !== me || a.pro && a.pro !== me) && J(a) !== J(b)) { out.push(b); who = proName(b.pro !== me ? b.pro : a.pro); } else out.push(a);
          } else if (a.pro && a.pro !== me) { who = proName(a.pro); } else out.push(a);
        });
        B.forEach(b => { if (!seen[b.id] && b.pro && b.pro !== me) { out.push(b); who = proName(b.pro); } });
        if (who) { out.sort((x, y) => (x.start || 0) - (y.start || 0)); A.S.days[k] = out; }
      });
      return r;
    }, msg);
    if (who) { warn(who); if (A.refresh) A.refresh(); }
    return res;
  };

  /* la ventanita del turno de otro profesional queda en solo lectura (se puede abrir la ficha: los pacientes son del centro) */
  const css = document.createElement('style');
  css.textContent = '#tpop.tp-ro select,#tpop.tp-ro #tpObs{pointer-events:none;opacity:.6}' +
    '#tpop.tp-ro [data-act=tpEdit],#tpop.tp-ro [data-act=tpClip],#tpop.tp-ro [data-act=tpFree],#tpop.tp-ro [data-act=tpSobre],#tpop.tp-ro [data-act=apShift]{display:none!important}' +
    '#tpop .tp-roNote{margin:8px 0 2px;padding:8px 10px;border-radius:10px;background:var(--soft,#eef3fb);font-size:.88rem;line-height:1.35}';
  document.head.appendChild(css);
  const markPop = () => {
    const el = $('#tpop'); if (!el || el.dataset.roDone) return; el.dataset.roDone = '1';
    const any = el.querySelector('[data-id]'); const a = any && A.apptById && A.apptById(any.getAttribute('data-id'));
    if (!a || A.canEditAppt(a)) return;
    el.classList.add('tp-ro');
    const n = document.createElement('div'); n.className = 'tp-roNote';
    n.textContent = 'Turno de la agenda de ' + proName(a.pro) + ': lo ves, pero lo cambian recepción o la administración del centro.';
    const nm = el.querySelector('.tp-name'); if (nm && nm.parentNode) nm.parentNode.insertBefore(n, nm.nextSibling); else el.prepend(n);
  };
  new MutationObserver(() => { if (myPro()) markPop(); }).observe(document.body, { childList: true });

  /* turno nuevo: el odontólogo del equipo agenda solo en su agenda */
  const naPrev = A.acts.naSave;
  if (naPrev) A.acts.naSave = function () {
    const me = myPro(), m = S.modal;
    if (me && m && m.f && m.f.pro && m.f.pro !== me) { A.toast('Solo podés dar turnos en tu agenda. Para la agenda de ' + proName(m.f.pro) + ', pedíselo a recepción.'); return; }
    return naPrev.apply(this, arguments);
  };
})();
