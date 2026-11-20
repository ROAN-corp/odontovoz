/* ===== 1.13: inicio sin «Dar un turno», accesos directos en recuadros de color, nombre del paciente como botón y ventanitas del turno con color a elección ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>';

  /* ---------- 1. inicio ---------- */
  function home() {
    const v = document.getElementById('view-inicio'); if (!v || v.hidden) return;
    /* sin «+ Dar un turno»: para dar un turno se va a la agenda */
    v.querySelectorAll('.home-new').forEach(b => b.remove());
    v.querySelectorAll('.hd-card [data-act="newAppt"]').forEach(b => { b.setAttribute('data-act', 'tab'); b.setAttribute('data-tab', 'agenda'); b.innerHTML = CAL + ' Ir a la agenda'; b.classList.add('hd-go'); });
    /* «Accesos directos» con su botón para cambiarlos */
    const wrap = v.querySelector('.home-actions'); if (!wrap) return;
    const editing = wrap.classList.contains('editing') || !!$('#homeEditBar');
    let head = v.querySelector('.hk-head');
    if (editing || !wrap.classList.contains('icons')) { if (head) head.remove(); return; }
    if (!head) { head = document.createElement('div'); head.className = 'hk-head'; head.innerHTML = '<span>Accesos directos</span><button class="hk-ed" data-act="homeEditGo">Cambiar</button>'; }
    if (wrap.previousElementSibling !== head) wrap.before(head);
  }

  /* ---------- 2. ventanita del turno: color a elección (por equipo) ---------- */
  const TINTS = [['accent', 'Verde agua'], ['ok', 'Verde'], ['warn', 'Ámbar'], ['red', 'Rojo'], ['ink-2', 'Gris']];
  const tint = () => { const t = LS.get('odontovoz.popTint', 'accent'); return TINTS.some(x => x[0] === t) ? t : 'accent'; };
  const applyTint = () => document.documentElement.style.setProperty('--tpc', 'var(--' + tint() + ')');
  applyTint();
  A.acts.tpTint = el => { LS.set('odontovoz.popTint', el.getAttribute('data-c')); applyTint(); document.querySelectorAll('.tp-tint button').forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-c') === tint()))); };
  const tintRow = () => '<div class="tp-tint"><span>Color</span>' + TINTS.map(x => '<button type="button" data-act="tpTint" data-c="' + x[0] + '" aria-label="' + x[1] + '" title="' + x[1] + '" aria-pressed="' + (x[0] === tint()) + '" style="--c:var(--' + x[0] + ')"></button>').join('') + '</div>';
  function decoPop() {
    const p = document.getElementById('tpop'); if (!p || p.querySelector('.tp-tint')) return;
    p.insertAdjacentHTML('beforeend', tintRow());
  }
  try { new MutationObserver(() => { try { decoPop(); } catch (e) { /* nada */ } }).observe(document.body, { childList: true }); } catch (e) { /* nada */ }

  /* estado del turno: misma familia de color */
  const rmPrev = A.renderModal;
  A.renderModal = function () {
    const r = rmPrev.apply(this, arguments);
    try {
      const md = $('#modalHost .modal');
      if (md && S.modal && S.modal.type === 'stMenu') { md.classList.add('tp-tinted'); const b = md.querySelector('.m-body'); if (b && !b.querySelector('.tp-tint')) b.insertAdjacentHTML('beforeend', tintRow()); }
    } catch (e) { /* nada */ }
    return r;
  };

  const arPrev = A.afterRefresh;
  A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; try { home(); } catch (e) { /* nada */ } return r; };
  try { new MutationObserver(() => { try { home(); } catch (e) { /* nada */ } }).observe(document.getElementById('view-inicio') || document.body, { childList: true, subtree: true }); } catch (e) { /* nada */ }

  const css = document.createElement('style');
  css.textContent = [
    /* accesos directos */
    '.hk-head { display: flex; align-items: center; justify-content: space-between; margin: 6px 4px 4px; }',
    '.hk-head span { font-size: 11px; text-transform: uppercase; letter-spacing: .09em; color: var(--ink-2); font-weight: 700; }',
    '.hk-ed { border: 0; background: none; color: var(--accent); font: 600 12.5px inherit; cursor: pointer; padding: 4px 6px; border-radius: 8px; } .hk-ed:hover { background: var(--accent-soft); }',
    '#view-inicio .home-actions.icons { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 10px 6px 8px; box-shadow: 0 1px 0 rgba(8, 20, 24, .03); }',
    '#view-inicio .home-actions.icons .ha { --hc: var(--accent); }',
    '#view-inicio .home-actions.icons .ha:nth-child(5n+2) { --hc: var(--ok); } #view-inicio .home-actions.icons .ha:nth-child(5n+3) { --hc: var(--warn); }',
    '#view-inicio .home-actions.icons .ha:nth-child(5n+4) { --hc: var(--red); } #view-inicio .home-actions.icons .ha:nth-child(5n+5) { --hc: var(--ink-2); }',
    '#view-inicio .home-actions.icons .ha svg { background: color-mix(in srgb, var(--hc) 12%, var(--surface)) !important; border: 1.5px solid color-mix(in srgb, var(--hc) 38%, var(--line)) !important; color: var(--hc) !important; border-radius: 16px; }',
    '#view-inicio .home-actions.icons .ha:hover svg { background: color-mix(in srgb, var(--hc) 20%, var(--surface)) !important; }',
    '.hd-card .hd-go { display: inline-flex; align-items: center; gap: 6px; } .hd-card .hd-go svg { width: 16px; height: 16px; }',
    /* nombre del paciente en el turno: como un botón (abre la ficha resumida) */
    '.blk .nm { display: inline-block; max-width: 100%; padding: 0 7px; border-radius: 7px; background: color-mix(in srgb, var(--surface) 78%, transparent); border: 1px solid color-mix(in srgb, currentColor 22%, transparent); box-shadow: 0 1px 2px rgba(8, 20, 24, .08); cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; line-height: 1.45; }',
    '.blk .nm:hover { background: var(--surface); border-color: var(--accent); color: var(--accent); }',
    /* ventanita del turno */
    '#tpop { border-radius: 18px !important; border: 1.5px solid color-mix(in srgb, var(--tpc, var(--accent)) 40%, var(--line)) !important; box-shadow: 0 22px 56px rgba(8, 20, 24, .3) !important; background: linear-gradient(180deg, color-mix(in srgb, var(--tpc, var(--accent)) 10%, var(--surface)) 0, var(--surface) 90px) !important; overflow: hidden; }',
    '#tpop { border-top: 5px solid var(--tpc, var(--accent)) !important; }',
    '.tp-tint { display: flex; align-items: center; gap: 8px; padding: 8px 12px 10px; border-top: 1px solid var(--line); margin-top: 6px; }',
    '.tp-tint span { font-size: 12px; color: var(--ink-2); margin-right: 2px; }',
    '.tp-tint button { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--surface); background: var(--c); box-shadow: 0 0 0 1px var(--line); cursor: pointer; padding: 0; }',
    '.tp-tint button[aria-pressed="true"] { box-shadow: 0 0 0 2px var(--ink); }',
    '.modal.tp-tinted { border-color: color-mix(in srgb, var(--tpc) 40%, var(--line)) !important; } .modal.tp-tinted .m-head { background: color-mix(in srgb, var(--tpc) 12%, var(--surface)) !important; border-bottom-color: color-mix(in srgb, var(--tpc) 30%, var(--line)) !important; }',
    '.modal.tp-tinted .m-head::before { content: ""; width: 6px; align-self: stretch; border-radius: 3px; background: var(--tpc); }'
  ].join('\n');
  document.head.appendChild(css);
})();
