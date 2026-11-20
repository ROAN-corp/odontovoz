/* ===== 1.11: primeros pasos (configuración inicial guiada: Ajustes › Consultorio numerado, tarjeta en el inicio y avisos) ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc;

  /* pasos en orden (las claves son las de las filas de Ajustes, ver GROUPS de app48) */
  const STEPS = [
    { k: 'cfgOpen:centro', n: 'Centro, profesionales y horarios', act: 'cfgOpen', t: 'centro' },
    { k: 'tmOpen', n: 'Equipo e invitaciones', act: 'teamOpen', need: () => !!(A.cloud && A.cloud.session) },
    { k: 'catalogOpen', n: 'Prácticas y aranceles', act: 'catalogOpen' },
    { k: 'osOpen', n: 'Obras sociales y aranceles', act: 'osOpen' },
    { k: 'stkOpen', n: 'Stock de insumos', act: 'stkOpen', data: true, done: () => { const st = (A.EMP && A.EMP.stock) || {}; return Object.keys(st).some(c => c !== '_cfg' && Array.isArray(st[c]) && st[c].length > 0); } },
    { k: 'tnOpen', n: 'Turnero online', act: 'tnOpen' },
    { k: 'payRatesOpen', n: 'Medios de pago y recargos', act: 'payRatesOpen' }
  ];
  const OPT = { importOpen: 1, hcpOpen: 1 };   /* solo si vienen de otro sistema o de papel */

  const boss = () => { try { return !A.isBoss || A.isBoss(); } catch (e) { return true; } };
  const lite = () => { try { return !!(A.liteOn && A.liteOn()); } catch (e) { return false; } };
  const marks = () => { A.CFG = A.CFG || {}; const m = A.CFG.steps; return (m && typeof m === 'object') ? m : (A.CFG.steps = {}); };
  const list = () => STEPS.filter(s => A.acts[s.act] && (!s.need || s.need()));
  const isDone = s => { const m = marks()[s.k]; return m === 'skip' || (!s.data && !!m) || !!(s.done && s.done()); };
  function state() {
    const L = list(), d = L.filter(isDone).length, next = L.filter(s => !isDone(s))[0] || null;
    return { L, d, n: L.length, next, idx: next ? L.indexOf(next) + 1 : 0 };
  }
  const on = () => boss() && !lite();
  const save = () => { try { A.save(); } catch (e) { /* nada */ } };

  /* ---------- lo que usa Ajustes (app48) ---------- */
  A.ps = {
    on: () => on() && state().next !== null,
    badge(k) {
      if (!on()) return '';
      if (OPT[k]) return '<span class="aj-n aj-opt" title="Opcional">opc.</span>';
      const L = list(), i = L.findIndex(s => s.k === k); if (i < 0) return '';
      return isDone(L[i]) ? '<span class="aj-n aj-ok" title="Listo">✓</span>' : '<span class="aj-n" title="Paso ' + (i + 1) + '">' + (i + 1) + '</span>';
    },
    head() {
      if (!on()) return '';
      const st = state(); if (!st.next) return '';
      return '<div class="ps-strip"><div class="ps-top"><b>Configuración inicial: ' + st.d + ' de ' + st.n + ' listos</b><span>Sigue el paso ' + st.idx + ': ' + esc(st.next.n) + '</span></div>' + bar(st) +
        '<div class="ps-btns"><button class="btn primary small" data-act="psGo">Seguir con el paso ' + st.idx + '</button><button class="btn small" data-act="psSkip">Ya lo hice / no lo uso</button></div></div>';
    },
    state
  };
  const bar = st => '<div class="ps-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + st.n + '" aria-valuenow="' + st.d + '"><i style="width:' + Math.round(100 * st.d / Math.max(1, st.n)) + '%"></i></div>';

  /* ---------- abrir el paso que sigue ---------- */
  A.acts.psGo = () => {
    const st = state(); if (!st.next) return;
    const el = document.createElement('button'); el.setAttribute('data-act', st.next.act); if (st.next.t) el.setAttribute('data-t', st.next.t);
    visit(st.next.k); if (A.hideDrawer) A.hideDrawer();
    S._ajBack = true;   /* al cerrar la ventana vuelve a Ajustes, con el avance */
    try { A.acts[st.next.act](el); } catch (e) { S._ajBack = false; }
  };
  A.acts.psSkip = () => { const st = state(); if (!st.next) return; marks()[st.next.k] = 'skip'; save(); drop(st.next.k); A.toast('Paso ' + st.idx + ' marcado como listo.'); if (S.modal && S.modal.type === 'ajustes') A.renderModal(); paint(); };
  A.acts.psHide = () => { marks()._hide = Date.now(); save(); paint(); A.toast('Listo. La guía sigue en Ajustes › Consultorio.'); };

  /* entrar a un paso cuenta como hecho (salvo stock, que necesita al menos un insumo) */
  function visit(k) {
    const s = STEPS.filter(x => x.k === k)[0]; if (!s || s.data || !on()) return;
    const m = marks(); if (m[k]) return; m[k] = Date.now(); save(); drop(k);
  }
  const keyOf = b => { const a = b.getAttribute('data-act'); return a === 'cfgOpen' ? 'cfgOpen:' + (b.getAttribute('data-t') || 'centro') : a === 'teamOpen' ? 'tmOpen' : a; };
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-act]'); if (b) { try { visit(keyOf(b)); } catch (x) { /* nada */ } } }, true);

  /* ---------- tarjeta en el inicio ---------- */
  function paint() {
    const v = document.getElementById('view-inicio'); if (!v) return;
    const old = v.querySelector('.ps-card');
    const st = state(), show = on() && st.next && !marks()._hide && S.tab === 'inicio';
    if (!show) { if (old) old.remove(); return; }
    const sig = st.d + '/' + st.n + '/' + st.next.k;
    if (old && old.getAttribute('data-sig') === sig) return;
    const d = document.createElement('section'); d.className = 'ps-card'; d.setAttribute('aria-label', 'Primeros pasos'); d.setAttribute('data-sig', sig);
    d.innerHTML = '<button class="ps-x" data-act="psHide" aria-label="Ocultar la guía">×</button>' +
      '<span class="ps-k">Primeros pasos</span><b class="ps-h">' + (st.d ? 'Te falta configurar el paso ' + st.idx + ' de ' + st.n : 'Configurá OdontoVoz en ' + st.n + ' pasos') + '</b>' +
      '<span class="ps-s">' + esc(st.next.n) + '</span>' + bar(st) +
      '<div class="ps-btns"><button class="btn primary small" data-act="psGo">' + (st.d ? 'Seguir' : 'Empezar') + '</button><button class="btn small" data-act="ajOpen">Ver todos los pasos</button></div>';
    if (old) { old.replaceWith(d); return; }
    const host = v.querySelector('.home') || v, hi = host.querySelector('.home-hi');
    if (hi) hi.after(d); else host.prepend(d);
  }

  /* ---------- aviso en la casilla (uno por paso pendiente) ---------- */
  const drop = k => { try { if (A.nfDrop) A.nfDrop('ps:' + k); } catch (e) { /* nada */ } };
  let nfT = 0;
  function notify() {
    if (!A.nfAdd || !on()) return;
    const st = state();
    st.L.forEach(s => { if (isDone(s)) drop(s.k); });
    if (!st.next) return;
    A.nfAdd({ id: 'ps:' + st.next.k, k: 'info', t: 'Falta configurar el paso ' + st.idx + ' de ' + st.n, b: st.next.n, act: 'psGo', args: {}, at: Date.now() });
  }

  const arPrev = A.afterRefresh;
  A.afterRefresh = function () {
    const r = arPrev ? arPrev.apply(this, arguments) : undefined;
    try { paint(); } catch (e) { /* nada */ }
    clearTimeout(nfT); nfT = setTimeout(() => { try { notify(); } catch (e) { /* nada */ } }, 3000);
    return r;
  };
  try { new MutationObserver(() => { try { paint(); } catch (e) { /* nada */ } }).observe(document.getElementById('view-inicio') || document.body, { childList: true }); } catch (e) { /* nada */ }

  const css = document.createElement('style');
  css.textContent = [
    '.aj-n { flex: none; min-width: 24px; height: 24px; padding: 0 6px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 12.5px; font-weight: 700; background: var(--accent-soft); color: var(--accent-ink); border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--line)); }',
    '.aj-n.aj-ok { background: color-mix(in srgb, var(--ok) 16%, var(--surface)); color: var(--ok); border-color: color-mix(in srgb, var(--ok) 40%, var(--line)); }',
    '.aj-n.aj-opt { font-weight: 600; font-size: 11px; background: var(--surface-2); color: var(--ink-2); border-color: var(--line); }',
    '.ps-strip { margin: 0 0 10px; padding: 10px 12px; border-radius: 14px; background: var(--surface); border: 1px dashed color-mix(in srgb, var(--accent) 45%, var(--line)); }',
    '.ps-top { display: flex; flex-direction: column; gap: 2px; font-size: 14px; } .ps-top span { color: var(--ink-2); font-size: 13px; }',
    '.ps-bar { height: 8px; border-radius: 4px; background: var(--surface-2); margin: 8px 0; overflow: hidden; } .ps-bar i { display: block; height: 100%; border-radius: 4px; background: var(--accent); transition: width .3s; }',
    '.ps-btns { display: flex; flex-wrap: wrap; gap: 6px; }',
    '.ps-card { position: relative; margin: 10px 0 12px; padding: 12px 40px 12px 14px; border-radius: 16px; border: 1.5px solid color-mix(in srgb, var(--accent) 35%, var(--line)); background: color-mix(in srgb, var(--accent) 8%, var(--surface)); display: flex; flex-direction: column; gap: 2px; }',
    '.ps-card .ps-k { font-size: 11.5px; text-transform: uppercase; letter-spacing: .08em; color: var(--accent); font-weight: 700; }',
    '.ps-card .ps-h { font-size: 15.5px; } .ps-card .ps-s { font-size: 14px; color: var(--ink-2); }',
    '.ps-card .ps-x { position: absolute; top: 6px; right: 8px; width: 30px; height: 30px; border: 0; background: transparent; font-size: 20px; color: var(--ink-2); cursor: pointer; border-radius: 8px; }'
  ].join('\n');
  document.head.appendChild(css);
})();
