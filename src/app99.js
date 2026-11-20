/* ===== 1.17: accesos con cruz para sacarlos, ficha en resumen (datos y anamnesis) con Editar, fotos y motivo más prolijos, estilo degradé y días bloqueados en el calendario ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } } };

  /* =====================================================================
     1. ACCESOS DIRECTOS: al editar, cada uno tiene una × para sacarlo
     ===================================================================== */
  function hkX() {
    const w = document.querySelector('#view-inicio .home-actions'); if (!w) return;
    const ed = w.classList.contains('editing');
    w.querySelectorAll('.ha[data-hk]').forEach(b => {
      const x = b.querySelector('.hk-x');
      if (ed && !x) b.insertAdjacentHTML('beforeend', '<span class="hk-x" data-act="hkDel" data-k="' + esc(b.getAttribute('data-hk')) + '" role="button" aria-label="Sacar este acceso" title="Sacar">×</span>');
      if (!ed && x) x.remove();
    });
  }
  window.addEventListener('pointerdown', e => { const x = e.target.closest && e.target.closest('.hk-x'); if (!x) return; e.stopImmediatePropagation(); e.preventDefault(); A.acts.hkDel(x); }, true);
  window.addEventListener('click', e => { if (e.target.closest && e.target.closest('.hk-x')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  A.acts.hkDel = (el, ev) => {
    if (ev) { ev.stopPropagation(); ev.preventDefault(); }
    const w = document.querySelector('#view-inicio .home-actions'); if (!w) return;
    const keys = Array.from(w.querySelectorAll('.ha[data-hk]')).map(b => b.getAttribute('data-hk')), k = el.getAttribute('data-k');
    if (keys.length <= 1) { A.toast('Dejá al menos un acceso directo.'); return; }
    LS.set('odontovoz.home', JSON.stringify(keys.filter(x => x !== k)));
    w.removeAttribute('data-cust'); if (A.homeMount) A.homeMount(); if (A.homeIcons) A.homeIcons(); hkX();
  };

  /* =====================================================================
     2. FICHA: datos personales y anamnesis en resumen; «Editar» para volver a los campos
     ===================================================================== */
  const ED = {};   /* qué tarjeta está en edición, por paciente: { pid: { datos: true, anam: true } } */
  const edit = (pid, k) => !!(ED[pid] && ED[pid][k]);
  const setEd = (pid, k, v) => { ED[pid] = ED[pid] || {}; ED[pid][k] = v; };
  const cardBy = (re) => Array.from(document.querySelectorAll('#fichaBody section.card')).filter(c => { const h = c.querySelector(':scope > h2'); return h && re.test(h.textContent.trim()); })[0];
  const valOf = el => el.tagName === 'SELECT' ? (el.selectedOptions[0] ? el.selectedOptions[0].textContent : '') : el.type === 'date' && el.value ? A.fmtDMY(el.value) : el.value;

  function datosCard(pid) {
    const c = cardBy(/^Datos personales/); if (!c) return;
    const p = A.PAT(pid) || {}, complete = !!(p.first && p.last && (p.dni || p.phone));
    if (!complete && !(ED[pid] && 'datos' in ED[pid])) setEd(pid, 'datos', true);   /* si arrancó incompleta, queda en edición hasta «Guardar» */
    const ro = complete && !edit(pid, 'datos');
    c.classList.toggle('ov-ro', ro); c.classList.add('ov-sumcard');
    let sum = c.querySelector(':scope > .ov-sum');
    if (ro) {
      const rows = [];
      c.querySelectorAll('.field').forEach(f => {
        const lb = f.querySelector('label'), inp = f.querySelector('input, select, textarea'); if (!lb || !inp || inp.type === 'hidden') return;
        const v = String(valOf(inp) || '').trim(); if (!v) return;
        const l = lb.textContent.replace(/\(.*?\)/g, '').trim(); if (/^(Nombre|Apellido)$/i.test(l)) return;
        rows.push('<div><dt>' + esc(l) + '</dt><dd>' + esc(v) + '</dd></div>');
      });
      const html = '<div class="ov-sum-name"><b>' + esc(p.name || ((p.first || '') + ' ' + (p.last || ''))) + '</b></div><dl class="ov-dl">' + rows.join('') + '</dl><div class="ov-sum-b"><button class="btn small" data-act="roEdit" data-k="datos">✎ Editar datos personales</button></div>';
      if (!sum) { sum = document.createElement('div'); sum.className = 'ov-sum'; c.querySelector(':scope > h2').after(sum); }
      if (sum.innerHTML !== html) sum.innerHTML = html;
    } else if (sum) sum.remove();
  }
  function anamCard(pid) {
    const c = cardBy(/^Anamnesis/); if (!c) return;
    const hc = A.pd(pid).hc || {}, conds = hc.conds || {}, any = Object.keys(conds).some(k => conds[k]) || hc.meds || hc.ant || hc.alertExtra || hc.saved || hc.reviewedAt;
    if (!any && !(ED[pid] && 'anam' in ED[pid])) setEd(pid, 'anam', true);
    const ro = !!any && !edit(pid, 'anam');
    c.classList.toggle('ov-ro', ro); c.classList.add('ov-sumcard');
    let sum = c.querySelector(':scope > .ov-sum');
    if (ro) {
      const al = A.ANAM.filter(x => conds[x[0]] && x[2]), an = A.ANAM.filter(x => conds[x[0]] && !x[2]);
      const chips = (L, cls) => L.map(x => '<span class="ov-ch ' + cls + '">' + esc(x[1]) + '</span>').join('');
      const txt = (l, v) => v ? '<div class="ov-tx"><small>' + l + '</small><p>' + esc(v) + '</p></div>' : '';
      const html = (al.length || an.length ? '<div class="ov-chs">' + chips(al, 'al') + chips(an, 'an') + '</div>' : '<p class="ov-none">Sin antecedentes marcados.</p>') +
        txt('Medicación actual', hc.meds) + txt('Antecedentes odontológicos y hábitos', hc.ant) + txt('Alerta adicional', hc.alertExtra) +
        '<div class="ov-sum-b"><button class="btn small" data-act="roEdit" data-k="anam">✎ Editar anamnesis</button></div>';
      if (!sum) { sum = document.createElement('div'); sum.className = 'ov-sum'; c.querySelector(':scope > h2').after(sum); }
      if (sum.innerHTML !== html) sum.innerHTML = html;
    } else if (sum) sum.remove();
  }
  A.acts.roEdit = el => { const pid = S.fichaPid; if (!pid) return; setEd(pid, el.getAttribute('data-k'), true); ficha(); };
  /* los botones «Guardar datos personales» / «Guardar anamnesis» que ya estaban (app12) pasan la tarjeta a resumen */
  const ssPrev = A.acts.secSave;
  if (ssPrev) A.acts.secSave = async function (el) {
    const pid = S.fichaPid, k = /anam/.test((el && el.getAttribute && el.getAttribute('data-sec')) || '') ? 'anam' : 'datos';
    const r = await ssPrev.apply(this, arguments);
    try {
      if (pid) {
        if (k === 'anam') { const hc = A.pd(pid).hc; hc.saved = A.today(); A.touchPd(pid); }
        const p = A.PAT(pid) || {};
        if (k === 'datos' && !(p.first && p.last && (p.dni || p.phone))) A.toast('Para dejarlo como resumen, completá nombre, apellido y DNI o teléfono.');
        else setEd(pid, k, false);
        ficha();
      }
    } catch (e) { /* nada */ }
    return r;
  };

  function ficha() {
    if (S.tab !== 'ficha' || S.fichaTab !== 'datos') return;
    const pid = S.fichaPid; if (!pid) return;
    try { datosCard(pid); } catch (e) { /* nada */ }
    try { anamCard(pid); } catch (e) { /* nada */ }
    const ph = $('#fichaBody .ph-strip'); if (ph && !ph.querySelector('.ph-ic')) ph.insertAdjacentHTML('afterbegin', '<span class="ph-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 8"/></svg></span>');
  }

  /* =====================================================================
     3. ESTILO DEGRADÉ (como el encabezado de la ficha), a elección en Apariencia
     ===================================================================== */
  const GRADS = [['', 'Liso'], ['accent', 'Verde agua'], ['ok', 'Verde'], ['warn', 'Ámbar'], ['ink-2', 'Gris']];
  const grad = () => { const g = LS.get('odontovoz.grad', ''); return GRADS.some(x => x[0] === g) ? g : ''; };
  const applyGrad = () => { const g = grad(); document.body.classList.toggle('ov-grad', !!g); if (g) document.documentElement.style.setProperty('--gc', 'var(--' + g + ')'); };
  applyGrad();
  A.acts.gradSet = el => { LS.set('odontovoz.grad', el.getAttribute('data-v') || null); applyGrad(); document.querySelectorAll('.gr-seg button').forEach(b => b.setAttribute('aria-pressed', String((b.getAttribute('data-v') || '') === grad()))); };
  const apPrev = MF.appear;
  if (apPrev) MF.appear = function () {
    const h = apPrev.apply(this, arguments);
    const block = '<div class="opt"><div class="lbl">Estilo de las tarjetas</div><div class="seg gr-seg" role="group" aria-label="Estilo">' +
      GRADS.map(x => '<button data-act="gradSet" data-v="' + x[0] + '" aria-pressed="' + (grad() === x[0]) + '">' + (x[0] ? '<i style="--c:var(--' + x[0] + ')"></i>' : '') + esc(x[0] ? 'Degradé ' + x[1].toLowerCase() : x[1]) + '</button>').join('') +
      '</div><div class="hint">El degradé es el del encabezado de la ficha: un color suave que se va aclarando. Se elige en cada equipo.</div></div>';
    return typeof h === 'string' ? h.replace('<div class="m-body">', '<div class="m-body">' + block) : h;
  };

  /* =====================================================================
     4. DÍAS BLOQUEADOS en la tira de días, el mes y el calendario de la derecha
     ===================================================================== */
  function blkInfo(date) {
    const L = (S.days && S.days[date]) || [], sel = S.proSel && S.proSel !== 'all' ? S.proSel : null;
    const b = L.filter(x => x.type === 'block' && !x.note && x.status !== 'cancelado' && (!sel || x.pro === sel));
    if (!b.length) return null;
    const full = b.some(x => x.allDay || x.dur >= 360);
    return { full, txt: full ? 'Día bloqueado' + (b[0].label && b[0].label !== 'Día bloqueado' ? ': ' + b[0].label : '') : b.length + (b.length > 1 ? ' bloqueos' : ' bloqueo') };
  }
  function calMarks() {
    if (S.tab !== 'agenda') return;
    document.querySelectorAll('#view-agenda [data-date]:not(.gb):not(.blk):not([data-appt])').forEach(el => {
      const i = blkInfo(el.getAttribute('data-date'));
      el.classList.toggle('ov-dblk', !!(i && i.full)); el.classList.toggle('ov-pblk', !!(i && !i.full));
      if (i) el.setAttribute('data-blk', i.txt); else el.removeAttribute('data-blk');
      if (i && !el.title) el.title = i.txt;
    });
  }

  /* ---------- enganches ---------- */
  const all = () => { try { hkX(); } catch (e) { /* nada */ } try { ficha(); } catch (e) { /* nada */ } try { calMarks(); } catch (e) { /* nada */ } };
  const arPrev = A.afterRefresh;
  A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; all(); return r; };
  let raf = 0;
  const obs = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; all(); }); };
  try { ['view-inicio', 'view-ficha', 'view-agenda'].forEach(id => { const el = document.getElementById(id); if (el) new MutationObserver(obs).observe(el, { childList: true, subtree: true }); }); } catch (e) { /* nada */ }

  const css = document.createElement('style');
  css.textContent = [
    /* accesos: × y centrados en la PC */
    '#view-inicio .home-actions.editing, #view-inicio .home-actions.editing .ha { overflow: visible !important; } #view-inicio .home-actions.editing .ha { position: relative; }',
    '.hk-x { position: absolute; top: 2px; right: calc(50% - 36px); width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: var(--red); color: var(--surface); font: 700 15px/1 inherit; box-shadow: 0 1px 4px rgba(8, 20, 24, .25); cursor: pointer; z-index: 2; }',
    '@media (min-width: 700px) { #view-inicio .home-actions.icons { grid-template-columns: repeat(var(--hk, 5), 104px) !important; justify-content: center; } }',
    /* resumen de datos y anamnesis */
    '.ov-sumcard.ov-ro > :not(h2):not(.ov-sum):not(.row-btns) { display: none !important; }',
    '.ov-sumcard.ov-ro > .row-btns { margin-top: 8px; }',
    '.ov-sum-name b { font-size: 17px; }',
    '.ov-dl { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px 14px; margin: 10px 0 4px; }',
    '.ov-dl > div { display: flex; flex-direction: column; min-width: 0; padding: 6px 10px; border-radius: 10px; background: color-mix(in srgb, var(--accent) 5%, var(--surface)); border: 1px solid color-mix(in srgb, var(--accent) 12%, var(--line)); }',
    '.ov-dl dt { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-2); } .ov-dl dd { margin: 1px 0 0; font-weight: 600; overflow-wrap: anywhere; }',
    '.ov-sum-b { display: flex; justify-content: flex-end; margin-top: 10px; }',
    '.ov-chs { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }',
    '.ov-ch { font-size: 13px; font-weight: 600; padding: 3px 10px; border-radius: 999px; }',
    '.ov-ch.al { background: color-mix(in srgb, var(--red) 12%, var(--surface)); color: var(--red); border: 1px solid color-mix(in srgb, var(--red) 35%, var(--line)); }',
    '.ov-ch.an { background: color-mix(in srgb, var(--warn) 12%, var(--surface)); color: color-mix(in srgb, var(--warn) 75%, var(--ink)); border: 1px solid color-mix(in srgb, var(--warn) 35%, var(--line)); }',
    '.ov-tx { margin-top: 8px; } .ov-tx small { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-2); } .ov-tx p { margin: 2px 0 0; white-space: pre-wrap; }',
    '.ov-none { color: var(--ink-2); margin: 8px 0; }',
    /* motivo más chico */
    '#fichaBody .mv-card { padding: 8px 10px !important; }',
    '#fichaBody .mv-card .motivo-block.empty { padding: 8px 12px !important; min-height: 0 !important; border-width: 1px !important; }',
    '#fichaBody .mv-card .motivo-block.empty::before, #fichaBody .mv-card .motivo-block.empty > svg, #fichaBody .mv-card .motivo-block.empty .mv-ic { display: none !important; }',
    '#fichaBody .mv-card .mv-top { margin: 0 !important; } #fichaBody .mv-card h3 { font-size: 14.5px !important; margin: 0 !important; }',
    '#fichaBody .mv-card .motivo-block.empty .hint { font-size: 12.5px !important; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }',
    /* fotos y radiografías más lindas */
    '#fichaBody .ph-strip { display: grid !important; grid-template-columns: auto 1fr; column-gap: 14px; align-items: center; padding: 14px 16px !important; background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 9%, var(--surface)), var(--surface)) !important; }',
    '#fichaBody .ph-strip > :not(.ph-ic) { grid-column: 2; }',
    '#fichaBody .ph-strip .ph-ic { grid-row: 1 / span 4; width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center; background: var(--surface); border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--line)); color: var(--accent); }',
    '#fichaBody .ph-strip .ph-ic svg { width: 28px; height: 28px; }',
    '#fichaBody .ph-strip h2 { margin: 0 0 2px; font-size: 16px; } #fichaBody .ph-strip h2::before { display: none !important; }',
    '#fichaBody .ph-strip img { width: 112px !important; height: 112px !important; object-fit: cover; border-radius: 12px; border: 1px solid var(--line); }',
    '#fichaBody .ph-strip .row-btns { margin-top: 8px; }',
    /* estilo degradé */
    'body.ov-grad .card, body.ov-grad .hd-card, body.ov-grad .nw-card, body.ov-grad .hs-card, body.ov-grad .fc-card, body.ov-grad .ovc-c, body.ov-grad .ovc-k, body.ov-grad #view-inicio .home-actions.icons, body.ov-grad .aj-list, body.ov-grad #panelHost .block { background-image: linear-gradient(180deg, color-mix(in srgb, var(--gc) 10%, var(--surface)) 0, var(--surface) 130px) !important; border-color: color-mix(in srgb, var(--gc) 22%, var(--line)) !important; }',
    'body.ov-grad #view-ficha > .fh, body.ov-grad .m-head, body.ov-grad #panelHost .panel-head { background-image: linear-gradient(180deg, color-mix(in srgb, var(--gc) 14%, var(--surface)), var(--surface)) !important; }',
    'body.ov-grad header.appbar { background-image: linear-gradient(180deg, color-mix(in srgb, var(--gc) 10%, var(--surface)), var(--surface)); }',
    '.gr-seg { flex-wrap: wrap; } .gr-seg i { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; background: linear-gradient(180deg, var(--c), var(--surface)); border: 1px solid var(--line); }',
    /* días bloqueados */
    '#view-agenda .ov-dblk { position: relative; background-image: repeating-linear-gradient(135deg, color-mix(in srgb, var(--red) 14%, transparent) 0 4px, transparent 4px 9px) !important; border-color: color-mix(in srgb, var(--red) 45%, var(--line)) !important; }',
    '#view-agenda .ov-dblk::after, #view-agenda .ov-pblk::after { content: "🔒"; position: absolute; top: 1px; right: 2px; font-size: 9px; line-height: 1; }',
    '#view-agenda .ov-pblk { position: relative; }',
    '#view-agenda .wk.ov-dblk span { color: var(--red); font-weight: 700; }',
    '.qb-day { width: 100%; margin: 4px 0 8px; border-color: color-mix(in srgb, var(--red) 40%, var(--line)); color: var(--red); background: color-mix(in srgb, var(--red) 6%, var(--surface)); }'
  ].join('\n');
  document.head.appendChild(css);
})();
