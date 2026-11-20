/* ===== 1.14: menú más claro: opciones en recuadros, nuevo orden y secciones que se despliegan (Tu cuenta, Ayuda, Turnos por internet) ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const CHEV = '<svg class="dr-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  /* orden de la lista principal (lo que no está acá queda al final, en el orden que tenía) */
  const ORDER = ['tab:inicio', 'tab:agenda', 'tab:pacientes', 'labAllOpen', 'tab:caja', 'stkOpen', 'tab:empresa', 'tab:liq'];
  const keyOf = b => { const a = b.getAttribute('data-act'); return a === 'tab' ? 'tab:' + b.getAttribute('data-tab') : a; };
  const openKey = n => 'odontovoz.drOpen.' + n;

  function build() {
    const g = document.getElementById('gearMenu'); if (!g) return;
    const nav = g.querySelector('.dr-nav'); if (!nav) return;

    /* 1. «Turnos por internet» al fondo: turnero online y autogestión por WhatsApp */
    let more = g.querySelector('.dr-more');
    if (!more) {
      more = document.createElement('div'); more.className = 'dr-sec dr-more';
      more.innerHTML = '<div class="dr-lbl">Turnos por internet</div>';
      const out = g.querySelector('.dr-out') || g.querySelector('.dr-foot');
      if (out) out.before(more); else g.querySelector('.drawer').appendChild(more);
    }
    ['tnOpen', 'waOpen'].forEach(act => { const b = g.querySelector('.dr-nav .dnav[data-act="' + act + '"]'); if (b) more.appendChild(b); });
    const wa = g.querySelector('#drWa .t'); if (wa && !wa.querySelector('.dr-soon')) wa.insertAdjacentHTML('afterbegin', '<em class="dr-soon">pronto</em>');

    /* 2. orden de la lista principal (laboratorio más arriba) */
    const btns = Array.from(nav.children).filter(b => b.matches('.dnav'));
    const sorted = btns.slice().sort((a, b) => { const ia = ORDER.indexOf(keyOf(a)), ib = ORDER.indexOf(keyOf(b)); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
    if (sorted.some((b, i) => b !== btns[i])) sorted.forEach(b => nav.appendChild(b));

    /* 3. secciones que se despliegan */
    g.querySelectorAll('.dr-sec').forEach(sec => {
      if (sec.classList.contains('aj-sec') || sec.classList.contains('dr-out')) return;
      const lbl = sec.querySelector(':scope > .dr-lbl'); if (!lbl) return;
      const name = lbl.getAttribute('data-n') || lbl.textContent.trim();
      if (/^Ajustes/.test(name) || sec.querySelector('#drAjustes')) return;   /* Ajustes ya es una sola entrada (app48) */
      if (!lbl.getAttribute('data-n')) {
        lbl.setAttribute('data-n', name); lbl.setAttribute('data-act', 'drSec'); lbl.setAttribute('role', 'button'); lbl.setAttribute('tabindex', '0');
        lbl.insertAdjacentHTML('beforeend', CHEV);
        sec.classList.add('dr-fold'); sec.classList.toggle('dr-shut', LS.get(openKey(name), '0') !== '1');
      }
      lbl.setAttribute('aria-expanded', String(!sec.classList.contains('dr-shut')));
    });
  }
  A.acts.drSec = el => {
    const sec = el.closest('.dr-sec'); if (!sec) return;
    const shut = !sec.classList.contains('dr-shut'); sec.classList.toggle('dr-shut', shut);
    el.setAttribute('aria-expanded', String(!shut)); LS.set(openKey(el.getAttribute('data-n')), shut ? '0' : '1');
    if (!shut) setTimeout(() => { try { sec.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* nada */ } }, 30);
  };
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.dr-fold > .dr-lbl')) { e.preventDefault(); A.acts.drSec(e.target); } });

  const arPrev = A.afterRefresh;
  A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; try { build(); } catch (e) { /* nada */ } return r; };
  const gearPrev = A.acts.gear;
  if (gearPrev) A.acts.gear = function () { const r = gearPrev.apply(this, arguments); try { build(); } catch (e) { /* nada */ } return r; };
  build(); setTimeout(build, 1500);

  const css = document.createElement('style');
  css.textContent = [
    /* lista principal en recuadros */
    '#gearMenu .dr-nav { gap: 6px; }',
    '#gearMenu .dr-nav .dnav, #gearMenu .dr-sec .dnav { border: 1px solid var(--line); background: var(--surface); border-radius: 12px; box-shadow: 0 1px 0 rgba(8, 20, 24, .03); }',
    '#gearMenu .dr-nav .dnav svg, #gearMenu .dr-sec .dnav > svg { box-sizing: content-box; padding: 6px; border-radius: 9px; background: var(--accent-soft); color: var(--accent); flex: none; }',
    '#gearMenu .dr-nav .dnav:hover, #gearMenu .dr-sec .dnav:hover { border-color: color-mix(in srgb, var(--accent) 45%, var(--line)); background: color-mix(in srgb, var(--accent) 5%, var(--surface)); }',
    '#gearMenu .dr-nav .dnav[aria-current="page"], #gearMenu .dr-nav .dnav.on, #gearMenu .dr-nav .dnav[aria-pressed="true"] { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, var(--surface)); }',
    /* secciones como tarjetas */
    '#gearMenu .dr-sec { margin-top: 12px; padding: 6px; gap: 6px; border-radius: 16px; border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--line)); background: color-mix(in srgb, var(--accent) 4%, var(--surface-2)); }',
    '#gearMenu .dr-sec.dr-out { border: 0; background: none; padding: 0; }',
    '#gearMenu .aj-sec > .dr-lbl { display: none; }',
    '#gearMenu .dr-fold > .dr-lbl { display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 8px 8px; margin: 0; border-radius: 10px; user-select: none; }',
    '#gearMenu .dr-fold > .dr-lbl:hover { background: color-mix(in srgb, var(--accent) 7%, transparent); }',
    '#gearMenu .dr-chev { width: 18px; height: 18px; color: var(--ink-2); transition: transform .2s; }',
    '#gearMenu .dr-fold.dr-shut .dr-chev { transform: rotate(-90deg); }',
    '#gearMenu .dr-fold.dr-shut > :not(.dr-lbl) { display: none !important; }',
    '#gearMenu .dr-soon { font-style: normal; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; padding: 1px 6px; margin-right: 6px; border-radius: 6px; background: var(--surface-2); color: var(--ink-2); border: 1px solid var(--line); vertical-align: 1px; }',
    '@media (prefers-reduced-motion: reduce) { #gearMenu .dr-chev { transition: none; } }'
  ].join('\n');
  document.head.appendChild(css);
})();
