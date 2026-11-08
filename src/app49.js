/* ===== 1.38: Empresa más simple (4 pestañas + «Más» con tarjetas, números grandes arriba, ayudas plegadas) ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc;
  const IC = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  /* pestañas principales y lo que va dentro de «Más» */
  const MAIN = [['resumen', 'Resumen'], ['sedes', 'Centros'], ['personal', 'Personal'], ['liq', 'Pagos a profesionales']];
  const MORE = {
    cobrar: ['Por cobrar', 'Lo que deben los pacientes, por centro', IC('<path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>')],
    stats: ['Estadísticas', 'Turnos, ausentes y pacientes nuevos', IC('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>')],
    metas: ['Metas', 'Lo que querés lograr en cada centro', IC('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>')],
    stock: ['Stock', 'Insumos de cada centro', IC('<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/>')],
    equipos: ['Equipos', 'Celulares y compus que usan la cuenta', IC('<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/>')],
    registro: ['Registro', 'Quién hizo qué y cuándo', IC('<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>')],
    report: ['Reporte para imprimir', 'Todo el mes en una hoja', IC('<path d="M6 9V2h12v7"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v8H6z"/>')]
  };
  const isMore = t => !!MORE[t];

  A.acts.empMore = () => { S.empTab = '_more'; A.refresh(); window.scrollTo(0, 0); };

  function tabs(host) {
    const bar = host.querySelector('.emp-tabs'); if (!bar) return;
    const have = {}; bar.querySelectorAll('.emp-t').forEach(b => { have[b.getAttribute('data-t')] = 1; });
    const t = S.empTab || 'resumen', inMore = t === '_more' || isMore(t);
    bar.classList.add('emp-tabs2');
    bar.innerHTML = MAIN.filter(z => have[z[0]]).map(z => '<button class="emp-t" role="tab" aria-selected="' + (t === z[0]) + '" data-act="empTab" data-t="' + z[0] + '">' + z[1] + '</button>').join('') +
      '<button class="emp-t" role="tab" aria-selected="' + inMore + '" data-act="empMore">Más ▾</button>';
    return have;
  }

  function moreHTML(have) {
    return '<div class="emp-top"><h2>Más opciones</h2></div><div class="emp-more">' + Object.keys(MORE).filter(k => have[k]).map(k => {
      const m = MORE[k];
      return '<button class="emp-mo" data-act="empTab" data-t="' + k + '">' + m[2] + '<span><b>' + esc(m[0]) + '</b><small>' + esc(m[1]) + '</small></span><span class="aj-go" aria-hidden="true">›</span></button>';
    }).join('') + '</div>';
  }

  /* números grandes arriba del resumen */
  function kpis(body) {
    const tot = body.querySelector('.emp-res tr.tot'); if (!tot || body.querySelector('.emp-kpi')) return;
    const c = tot.querySelectorAll('td');
    const v = i => (c[i] ? c[i].textContent.trim() : '');
    const neg = c[5] && c[5].classList.contains('neg');
    const html = '<div class="emp-kpi"><div><small>Facturado</small><b>' + esc(v(1)) + '</b></div><div><small>Cobrado</small><b>' + esc(v(2)) + '</b></div><div class="' + (neg ? 'neg' : 'pos') + '"><small>Le queda a la empresa</small><b>' + esc(v(5)) + '</b></div></div>';
    const top = body.querySelector('.emp-top'); if (top) top.insertAdjacentHTML('afterend', html);
    const tw = body.querySelector('.emp-res') && body.querySelector('.emp-res').closest('.tbl-wrap');
    if (tw && !tw.closest('details')) {
      const d = document.createElement('details'); d.className = 'emp-fold'; d.innerHTML = '<summary>Ver el detalle por centro</summary>';
      tw.parentNode.insertBefore(d, tw); d.appendChild(tw);
      const h = d.nextElementSibling; if (h && h.classList.contains('hint')) d.appendChild(h);
    }
  }

  /* las secciones largas de «Centros» quedan plegadas */
  function foldSedes(body) {
    body.querySelectorAll(':scope > section.card').forEach(sec => {
      const h = sec.querySelector(':scope > h2'); if (!h || sec.closest('details')) return;
      const tt = h.textContent;
      if (!/En qué centro atiende|Ajustes del modo Empresa/.test(tt)) return;
      const d = document.createElement('details'); d.className = 'emp-fold card';
      d.innerHTML = '<summary>' + esc(/Ajustes/.test(tt) ? 'Ajustes del modo Empresa (PIN, dejar el modo)' : 'Tabla: en qué centro atiende cada profesional') + '</summary>';
      sec.parentNode.insertBefore(d, sec); h.remove(); sec.classList.remove('card'); d.appendChild(sec);
    });
  }

  /* las ayudas largas quedan en una línea; se tocan para leerlas enteras */
  function hints(body) {
    body.querySelectorAll('.hint').forEach(h => {
      if (h.classList.contains('emp-hc') || h.textContent.length < 90 || h.closest('table')) return;
      h.classList.add('emp-hc'); h.setAttribute('role', 'button'); h.setAttribute('tabindex', '0'); h.title = 'Tocá para leer todo';
    });
  }
  document.addEventListener('click', e => { const h = e.target.closest && e.target.closest('#view-empresa .emp-hc'); if (h) h.classList.toggle('open'); });

  const rPrev = A.render.empresa;
  if (rPrev) A.render.empresa = function () {
    const t = S.empTab;
    if (t === '_more') S.empTab = 'resumen';
    rPrev.apply(this, arguments);
    S.empTab = t;
    const host = $('#view-empresa'); if (!host) return;
    const have = tabs(host); const body = host.querySelector('.emp-body'); if (!have || !body) return;
    if (t === '_more') { body.innerHTML = moreHTML(have); return; }
    if (isMore(t)) body.insertAdjacentHTML('afterbegin', '<button class="emp-back" data-act="empMore">‹ Más opciones</button>');
    try { if ((t || 'resumen') === 'resumen') kpis(body); if (t === 'sedes') foldSedes(body); hints(body); } catch (e) { /* nada */ }
  };

  const css = document.createElement('style');
  css.textContent = [
    '.emp-tabs2 { flex-wrap: nowrap; }',
    '.emp-more { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }',
    '.emp-mo { display: flex; align-items: center; gap: 14px; padding: 14px; min-height: 64px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; color: var(--ink); font: inherit; text-align: left; cursor: pointer; }',
    '.emp-mo:hover { border-color: var(--accent); } .emp-mo svg { width: 26px; height: 26px; color: var(--accent); flex: none; }',
    '.emp-mo > span:not(.aj-go) { flex: 1; display: flex; flex-direction: column; } .emp-mo b { font-size: 15.5px; } .emp-mo small { color: var(--ink-2); font-size: 13px; }',
    '.emp-mo .aj-go { font-size: 22px; color: var(--ink-2); }',
    '.emp-sedes { margin-top: 12px; }',
    '.emp-back { background: none; border: 0; color: var(--accent); font: 600 15px inherit; padding: 4px 0 10px; cursor: pointer; }',
    '.emp-kpi { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 4px 0 12px; }',
    '.emp-kpi > div { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }',
    '.emp-kpi small { color: var(--ink-2); font-size: 12.5px; } .emp-kpi b { font-size: 20px; overflow-wrap: anywhere; } .emp-kpi .pos b { color: var(--ok, #15803d); } .emp-kpi .neg b { color: var(--bad, #b91c1c); }',
    '@media (max-width: 640px) { .emp-kpi { grid-template-columns: 1fr 1fr; } .emp-kpi > div:last-child { grid-column: 1 / -1; } .emp-kpi b { font-size: 18px; } }',
    '.emp-fold { margin: 0 0 12px; } .emp-fold > summary { cursor: pointer; font-weight: 600; color: var(--accent); padding: 8px 0; list-style-position: inside; }',
    'details.emp-fold.card > summary { padding: 0; } details.emp-fold.card[open] > summary { margin-bottom: 10px; }',
    '#view-empresa .emp-hc { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; cursor: pointer; }',
    '#view-empresa .emp-hc::before { content: "ⓘ "; color: var(--accent); }',
    '#view-empresa .emp-hc.open { display: block; -webkit-line-clamp: unset; }'
  ].join('\n');
  document.head.appendChild(css);
})();
