/* ===== 1.21.1: datos abreviados con N° de afiliado en la ficha y en la ficha resumida, y las últimas 3 evoluciones en la resumida ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, $ = q => document.querySelector(q);
  const isPart = cov => !cov || /particular/i.test(cov);
  const covTxt = p => (p.cov || 'Particular') + (p.plan && !isPart(p.cov) && String(p.cov).indexOf(p.plan) < 0 ? ' ' + p.plan : '');

  /* encabezado de la ficha completa: edad · DNI · obra social · N° afiliado · teléfono */
  function head() {
    if (S.tab !== 'ficha' || !S.fichaPid) return;
    const p = A.PAT(S.fichaPid), sub = $('#view-ficha .fh .sub'); if (!p || !sub) return;
    const bits = [];
    if (p.age != null && p.age !== '') bits.push(esc(p.age) + ' años');
    if (p.dni) bits.push('DNI ' + esc(p.dni));
    bits.push(esc(covTxt(p)));
    if (!isPart(p.cov)) bits.push(p.afil ? 'N° afiliado <b class="mono">' + esc(p.afil) + '</b>' : '<span class="fh-noafil">N° afiliado sin cargar</span>');
    if (p.phone) bits.push(esc(p.phone));
    const html = bits.join(' · ');
    if (sub.innerHTML !== html) sub.innerHTML = html;
  }
  const fichaPrev = A.render.ficha;
  A.render.ficha = function () { const r = fichaPrev.apply(this, arguments); try { head(); } catch (e) { /* nada */ } return r; };

  /* ficha resumida: N° afiliado en «Datos principales» y las últimas 3 notas de la evolución clínica */
  const lastNotes = pid => {
    const n = ((A.pd(pid) || {}).notes || []).map((x, i) => ({ x, i })).filter(o => !o.x.void); /* sin las anuladas */
    n.sort((a, b) => (a.x.date === b.x.date ? a.i - b.i : a.x.date < b.x.date ? 1 : -1)); /* notas nuevas van al principio con la misma fecha */
    return n.slice(0, 3).map(o => o.x);
  };
  function panel() {
    const pn = S.panel, pid = pn && (pn.type === 'pat' ? pn.pid : pn.type === 'appt' ? (A.apptById(pn.id) || {}).pid : null);
    const p = pid && A.PAT(pid); if (!p) return;
    const dp = [].slice.call(document.querySelectorAll('#panelHost .block')).filter(b => { const h = b.querySelector('h3'); return h && /Datos principales/i.test(h.textContent); })[0];
    if (dp && !dp.querySelector('.kv-afil')) {
      const dts = [].slice.call(dp.querySelectorAll('dl.kv dt')), cob = dts.filter(d => /Cobertura/i.test(d.textContent))[0];
      if (cob && cob.nextElementSibling && !isPart(p.cov)) cob.nextElementSibling.insertAdjacentHTML('afterend', '<dt class="kv-afil">N° afiliado</dt><dd class="mono kv-afil">' + (p.afil ? esc(p.afil) : '<span class="fh-noafil">sin cargar</span>') + '</dd>');
    }
    if (S.role !== 'profesional') return; /* la evolución es dato clínico: solo para profesionales */
    /* debajo de «Qué hice hoy» (donde se escribe la evolución desde la resumida); si no está, debajo de «Datos principales».
       Otros módulos agregan bloques un instante después, por eso se reubica en cada pasada. */
    const at = $('#panelHost .block.quick') || dp || $('#panelHost .fc-card'); if (!at) return;
    const ex = $('#panelHost .evo3');
    if (ex && ex.previousElementSibling === at && ex.getAttribute('data-n') === String(((A.pd(pid) || {}).notes || []).length)) return;
    if (ex) ex.remove();
    const L = lastNotes(pid);
    const h = '<div class="block evo3" data-n="' + (((A.pd(pid) || {}).notes || []).length) + '"><h3>Evolución clínica · últimas ' + Math.min(3, L.length || 3) + '</h3>' +
      (L.length ? '<ol class="evo3-list">' + L.map(n => '<li><div class="evo3-m">' + esc(A.fmtDMY(n.date)) + (n.pro && A.PRO(n.pro) ? ' · ' + esc(A.PRO(n.pro).short) : '') + (n.auto ? ' · automática' : '') + '</div><div class="evo3-t">' + esc(n.text) + '</div></li>').join('') + '</ol>'
        : '<p class="hint" style="margin:0">Todavía no hay notas en la evolución.</p>') +
      '<button class="lnk evo3-all" data-act="openFicha" data-pid="' + esc(pid) + '" data-tab="datos">Ver la evolución completa ›</button></div>';
    at.insertAdjacentHTML('afterend', h);
    /* la línea corta «Últimas notas: …» de «Qué hice hoy» queda repetida: se oculta */
    [].slice.call(document.querySelectorAll('#panelHost .block.quick .small-note')).forEach(x => { if (/^\s*Últimas notas/.test(x.textContent)) x.hidden = true; });
  }
  const panelPrev = A.renderPanel;
  A.renderPanel = function () { const r = panelPrev.apply(this, arguments); const go = () => { try { panel(); } catch (e) { /* nada */ } }; go(); requestAnimationFrame(go); setTimeout(go, 150); return r; };

  const css = document.createElement('style');
  css.id = 'ovApp107';
  css.textContent = [
    '.fh-noafil { color: var(--warn); font-style: italic; }',
    '.fh .sub b.mono { font-weight: 600; }',
    '#panelHost .evo3 { gap: 6px; }',
    '#panelHost .evo3-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }',
    '#panelHost .evo3-list li { border-left: 3px solid var(--accent); padding: 4px 0 4px 10px; }',
    '#panelHost .evo3-m { font-size: 12px; color: var(--ink-2); font-weight: 600; }',
    '#panelHost .evo3-t { font-size: 14px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }',
    '#panelHost .evo3-all { align-self: flex-start; font-size: 13.5px; }'
  ].join('\n');
  document.body.appendChild(css);
})();
