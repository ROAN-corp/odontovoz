/* ===== 1.15: ficha del paciente: anamnesis más completa y agrupada, antecedentes al lado de las alertas, menú de secciones fácil y estética ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc;

  /* ---------- 1. anamnesis: más completa y agrupada (1 = alerta clínica en rojo; 0 = antecedente, va en otro color y chiquito) ---------- */
  const NEW = [
    ['Corazón y sangre', [['hta', 'Hipertensión arterial', 1], ['cardio', 'Enfermedad cardíaca / marcapasos', 1], ['endocard', 'Válvula protésica o endocarditis previa (profilaxis antibiótica)', 1], ['anticoag', 'Anticoagulantes / antiagregantes', 1], ['coag', 'Trastorno de la coagulación / hemofilia', 1], ['sangrado', 'Sangrado excesivo al cortarse', 1], ['acv', 'ACV / infarto previo', 1], ['anemia', 'Anemia', 0]]],
    ['Metabólicas y órganos', [['diabetes', 'Diabetes', 1], ['tiroides', 'Tiroides (hipo / hiper)', 0], ['renal', 'Enfermedad renal / diálisis', 0], ['gastro', 'Gastritis / reflujo', 0]]],
    ['Infecciones e inmunidad', [['vih', 'VIH', 1], ['hepatitis', 'Hepatitis B o C / enfermedad hepática', 1], ['tbc', 'Tuberculosis', 1], ['inmuno', 'Corticoides, inmunosupresores o trasplante', 1], ['cancer', 'Cáncer / quimioterapia actual', 1]]],
    ['Alergias', [['penicilina', 'Alergia a penicilina', 1], ['aines', 'Alergia a ibuprofeno / aspirina (AINE)', 1], ['latex', 'Alergia al látex', 1], ['anestesia', 'Reacción a anestesia local', 1], ['alergOtra', 'Otra alergia a medicamentos', 1]]],
    ['Otras', [['asma', 'Asma / problemas respiratorios', 0], ['epilepsia', 'Epilepsia / convulsiones', 1], ['embarazo', 'Embarazo / lactancia', 1], ['bifosf', 'Bifosfonatos / radioterapia de cabeza y cuello', 1], ['psiq', 'Tratamiento psiquiátrico / ansiedad', 0]]],
    ['Hábitos', [['fuma', 'Fuma', 0], ['bruxismo', 'Bruxismo / aprieta los dientes', 0], ['respBucal', 'Respira por la boca', 0], ['onico', 'Se come las uñas / muerde objetos', 0]]]
  ];
  const GROUP = {}, FIRST = {};
  const list = [];
  NEW.forEach(g => g[1].forEach((x, i) => { list.push(x); GROUP[x[0]] = g[0]; if (!i) FIRST[x[0]] = g[0]; }));
  /* se conservan las que hubiera de antes y no estén en la lista nueva */
  (A.ANAM || []).forEach(x => { if (!list.some(y => y[0] === x[0])) { list.push(x); GROUP[x[0]] = 'Otras'; } });
  A.ANAM.length = 0; list.forEach(x => A.ANAM.push(x));
  A.ANAM.forEach(x => { A.ANAM_LABEL[x[0]] = x[1]; });
  const isAlert = k => { const x = A.ANAM.filter(y => y[0] === k)[0]; return !!(x && x[2]); };
  A.alertsOf = pid => {
    const pd = A.pd(pid), out = [], c = (pd.hc && pd.hc.conds) || {};
    A.ANAM.forEach(x => { if (c[x[0]] && x[2]) out.push(x[1]); });
    if (pd.hc && pd.hc.alertExtra) out.push(pd.hc.alertExtra);
    return out;
  };
  A.antecOf = pid => { const c = (A.pd(pid).hc || {}).conds || {}; return A.ANAM.filter(x => c[x[0]] && !x[2]).map(x => x[1].split(' / ')[0]); };

  /* títulos de grupo dentro de la lista de casillas */
  function groupGrid(root) {
    (root || document).querySelectorAll('.check-grid').forEach(gr => {
      if (gr.getAttribute('data-grp')) return;
      const inputs = gr.querySelectorAll('input[data-k], input.np-cond'); if (inputs.length < 20) return;
      gr.setAttribute('data-grp', '1'); gr.classList.add('anam-grid');
      inputs.forEach(i => { const k = i.getAttribute('data-k') || i.value, lb = i.closest('label'); if (!lb) return; if (isAlert(k)) lb.classList.add('anam-al'); if (FIRST[k]) lb.insertAdjacentHTML('beforebegin', '<h4 class="anam-g">' + esc(FIRST[k]) + '</h4>'); });
    });
  }

  /* ---------- 2. antecedentes (bruxismo, fuma…) al lado de las alertas, en otro color y chiquitos ---------- */
  function pidFor(el) {
    if (el.closest('#view-ficha')) return S.fichaPid;
    if (el.closest('#panelHost') && S.panel) { if (S.panel.type === 'pat') return S.panel.pid; const a = A.apptById && A.apptById(S.panel.id); return a && a.pid; }
    return null;
  }
  function antec() {
    document.querySelectorAll('.alert-strip').forEach(st => {
      const pid = pidFor(st); if (!pid) return;
      const L = A.antecOf(pid), sig = pid + ':' + L.join('|');
      let box = st.nextElementSibling && st.nextElementSibling.classList.contains('antec-strip') ? st.nextElementSibling : null;
      if (box && box.getAttribute('data-sig') === sig) return;
      if (!L.length) { if (box) box.remove(); return; }
      if (!box) { box = document.createElement('div'); box.className = 'antec-strip'; st.after(box); }
      box.setAttribute('data-sig', sig); box.innerHTML = L.map(t => '<span>' + esc(t) + '</span>').join('');
    });
  }

  /* ---------- 3. menú de secciones de la historia clínica ---------- */
  const SV = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  const ICON = {
    datos: SV('<path d="M16 3H8a2 2 0 0 0-2 2v15a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a2 2 0 0 0-2-2z"/><path d="M9 8h6M9 12h6M9 16h4"/>'),
    odon: SV('<path d="M7 3c-2.5 0-4 2-4 4.5 0 2 .8 3.4 1.4 5.1.7 1.9.7 4.1 1.5 6.5.4 1.2 1.8 1.3 2.3.1.7-1.8 1-4.2 2.3-4.2h1c1.3 0 1.6 2.4 2.3 4.2.5 1.2 1.9 1.1 2.3-.1.8-2.4.8-4.6 1.5-6.5.6-1.7 1.4-3.1 1.4-5.1C21 5 19.5 3 17 3c-1.8 0-2.9 1-5 1S8.8 3 7 3z"/>'),
    perio: SV('<path d="M3 12h4l2-5 3 10 2-5h7"/>'),
    plan: SV('<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>'),
    hecho: SV('<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'),
    lab: SV('<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/>'),
    rx: SV('<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h4"/>'),
    img: SV('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 8"/>'),
    orto: SV('<path d="M12 3.2c-1.6 0-2.4.9-4 .9C6 4.1 4.6 5.2 4.6 7.7c0 1.6.8 3 1.2 4.6.5 2 .6 4.5 1.4 6.8.35 1.1 1.7 1.3 2.2.2.6-1.4.9-3.5 2.6-3.5s2 2.1 2.6 3.5c.5 1.1 1.85.9 2.2-.2.8-2.3.9-4.8 1.4-6.8.4-1.6 1.2-3 1.2-4.6 0-2.5-1.4-3.6-3.4-3.6-1.6 0-2.4-.9-4-.9z"/><rect x="9.3" y="7.4" width="5.4" height="4" rx="1" fill="currentColor" fill-opacity=".22"/><path d="M1.8 9.4h20.4" stroke-width="2.2"/>'),
    implantes: SV('<path d="M12 2.5v4M9 7.5h6M9.5 10h5M9.8 12.5h4.4M10.2 15h3.6M10.8 17.5h2.4"/><path d="M10.5 20h3l-.6 1.5h-1.8z"/>'),
    endo: SV('<path d="M12 3.2c-1.6 0-2.4.9-4 .9C6 4.1 4.6 5.2 4.6 7.7c0 1.6.8 3 1.2 4.6.5 2 .6 4.5 1.4 6.8.35 1.1 1.7 1.3 2.2.2.6-1.4.9-3.5 2.6-3.5s2 2.1 2.6 3.5c.5 1.1 1.85.9 2.2-.2.8-2.3.9-4.8 1.4-6.8.4-1.6 1.2-3 1.2-4.6 0-2.5-1.4-3.6-3.4-3.6-1.6 0-2.4-.9-4-.9z"/><path d="M9.5 8l.7 7M14.5 8l-.7 7"/>'),
    scan: SV('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9"/>'),
    docs: SV('<path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13 7l4 4"/>'),
    cuenta: SV('<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h4"/>')
  };
  const DEF_IC = SV('<circle cx="12" cy="12" r="8"/>');
  const DESC = { implantes: 'Cirugía, prótesis y controles', endo: 'Conductos y radiografías periapicales', scan: 'Escaneos y diseños en 3D', datos: 'Datos, anamnesis y evolución', odon: 'Estado de cada diente', perio: 'Encías y sondaje', plan: 'Tratamientos y presupuestos', hecho: 'Lo ya realizado', lab: 'Trabajos de laboratorio', rx: 'Recetas e indicaciones', img: 'Imágenes del paciente', orto: 'Controles y fotos', docs: 'Consentimientos y firmas', cuenta: 'Pagos y saldo' };
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* nada */ } } };
  const mobile = () => window.innerWidth < 700;
  function tabs() {
    const v = document.getElementById('view-ficha'); if (!v || v.hidden) return;
    const bar = v.querySelector(':scope > .ftabs'); if (!bar) return;
    bar.querySelectorAll('.ftab').forEach(b => { const k = b.getAttribute('data-tab'); b.setAttribute('data-k', k); if (!b.querySelector('svg')) b.insertAdjacentHTML('afterbegin', ICON[k] || DEF_IC); if (!b.querySelector('.ft-d') && DESC[k]) b.insertAdjacentHTML('beforeend', '<small class="ft-d">' + DESC[k] + '</small>'); });
    bar.classList.add('ft-pro');
    let sel = v.querySelector(':scope > .fsel');
    const cur = bar.querySelector('.ftab[aria-selected="true"]') || bar.querySelector('.ftab');
    if (!sel) { sel = document.createElement('button'); sel.className = 'fsel'; sel.setAttribute('data-act', 'fselToggle'); sel.setAttribute('aria-haspopup', 'true'); bar.before(sel); }
    const n = bar.querySelectorAll('.ftab').length, ck = cur ? cur.getAttribute('data-tab') : '', lab = cur ? (cur.childNodes.length ? Array.prototype.filter.call(cur.childNodes, x => x.nodeType === 3).map(x => x.textContent).join('').trim() || cur.textContent.trim() : '') : '', open = bar.classList.contains('ft-open'), html = '<span class="fs-ic">' + (ICON[ck] || DEF_IC) + '</span><span class="fs-t"><small>Estás en</small><b>' + esc(lab) + '</b></span><span class="fs-more">' + (open ? 'Cerrar' : 'Cambiar sección') + ' <b aria-hidden="true">' + (open ? '▴' : '▾') + '</b></span>';
    if (sel.innerHTML !== html) sel.innerHTML = html;
    sel.setAttribute('aria-expanded', String(bar.classList.contains('ft-open')));
    sel.classList.toggle('fs-pulse', LS.get('odontovoz.fselUsed', 0) < 4);
  }
  A.acts.fselToggle = () => { const bar = $('#view-ficha > .ftabs'); if (!bar) return; bar.classList.toggle('ft-open'); if (bar.classList.contains('ft-open')) LS.set('odontovoz.fselUsed', LS.get('odontovoz.fselUsed', 0) + 1); tabs(); };
  document.addEventListener('click', e => {
    const bar = $('#view-ficha > .ftabs'); if (!bar || !bar.classList.contains('ft-open')) return;
    if (e.target.closest('.ftab')) { setTimeout(() => { const b = $('#view-ficha > .ftabs'); if (b) b.classList.remove('ft-open'); tabs(); }, 0); return; }
    if (!e.target.closest('.fsel') && !e.target.closest('.ftabs')) { bar.classList.remove('ft-open'); tabs(); }
  });

  function all() { try { tabs(); } catch (e) { /* nada */ } try { antec(); } catch (e) { /* nada */ } try { groupGrid(); } catch (e) { /* nada */ } }
  const arPrev = A.afterRefresh;
  A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; all(); return r; };
  const rmPrev = A.renderModal;
  A.renderModal = function () { const r = rmPrev.apply(this, arguments); try { groupGrid($('#modalHost')); } catch (e) { /* nada */ } return r; };
  let busy = false;
  const obs = () => { if (busy) return; busy = true; requestAnimationFrame(() => { all(); busy = false; }); };
  try { ['view-ficha', 'panelHost'].forEach(id => { const el = document.getElementById(id); if (el) new MutationObserver(obs).observe(el, { childList: true, subtree: true }); }); } catch (e) { /* nada */ }
  window.addEventListener('resize', () => { const bar = $('#view-ficha > .ftabs'); if (bar && !mobile()) bar.classList.remove('ft-open'); });

  const css = document.createElement('style');
  css.textContent = [
    /* antecedentes */
    '.antec-strip { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0 0; }',
    '.antec-strip span { font-size: 11.5px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, var(--warn) 12%, var(--surface)); color: color-mix(in srgb, var(--warn) 75%, var(--ink)); border: 1px solid color-mix(in srgb, var(--warn) 35%, var(--line)); }',
    '#view-ficha .fh { align-items: flex-start; }',
    /* anamnesis agrupada */
    '.anam-grid .anam-g { grid-column: 1 / -1; margin: 10px 0 2px; padding-bottom: 3px; font-size: 11.5px; text-transform: uppercase; letter-spacing: .07em; color: var(--accent); border-bottom: 1px solid color-mix(in srgb, var(--accent) 25%, var(--line)); }',
    '.anam-grid .anam-g:first-child { margin-top: 0; }',
    '.anam-grid label.anam-al:has(input:checked) { color: var(--red); font-weight: 600; }',
    '.anam-grid label:not(.anam-al):has(input:checked) { color: color-mix(in srgb, var(--warn) 80%, var(--ink)); font-weight: 600; }',
    /* encabezado y tarjetas de la ficha */
    '#view-ficha > .fh { background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 8%, var(--surface)), var(--surface)); border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--line)); border-radius: 18px; padding: 12px 14px; margin-bottom: 10px; }',
    '#view-ficha .card { border-radius: 16px; border-color: color-mix(in srgb, var(--accent) 14%, var(--line)); }',
    '#view-ficha .card > h2 { display: flex; align-items: center; gap: 8px; } #view-ficha .card > h2::before { content: ""; width: 4px; height: 1.05em; border-radius: 2px; background: var(--accent); flex: none; }',
    /* menú de secciones: en la PC, botones con ícono en dos filas, sin desplazar */
    '#view-ficha > .ftabs.ft-pro { position: sticky; top: var(--appbar-h, 56px); z-index: 20; display: flex; flex-wrap: wrap; gap: 6px; overflow: visible; padding: 8px; margin: 0 0 12px; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); box-shadow: 0 2px 10px rgba(8, 20, 24, .06); }',
    '#view-ficha > .ftabs.ft-pro .ftab { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); color: var(--ink); font-size: 14px; white-space: nowrap; }',
    '#view-ficha > .ftabs.ft-pro .ftab svg { width: 17px; height: 17px; color: var(--accent); flex: none; }',
    '#view-ficha > .ftabs.ft-pro .ftab::after { display: none !important; }',
    '#view-ficha > .ftabs.ft-pro .ftab[aria-selected="true"] { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); } #view-ficha > .ftabs.ft-pro .ftab[aria-selected="true"] svg { color: var(--accent-ink); }',
    '#view-ficha > .fsel { display: none; } #view-ficha > .ftabs .ft-d { display: none; }',
    /* en el celular: un botón con la sección actual que despliega todas como tarjetas */
    '@media (max-width: 699px) {',
    '  #view-ficha > .fsel { position: sticky; top: var(--appbar-h, 52px); z-index: 21; display: flex; align-items: center; gap: 10px; width: 100%; margin: 0 0 8px; padding: 8px 8px 8px 10px; border: 1.5px solid color-mix(in srgb, var(--accent) 45%, var(--line)); border-radius: 16px; background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 7%, var(--surface)), var(--surface)); color: var(--ink); font: inherit; text-align: left; box-shadow: 0 3px 12px rgba(8, 20, 24, .08); cursor: pointer; }',
    '  #view-ficha > .fsel .fs-ic { flex: none; width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); }',
    '  #view-ficha > .fsel .fs-ic svg { width: 22px; height: 22px; }',
    '  #view-ficha > .fsel .fs-t { display: flex; flex-direction: column; min-width: 0; line-height: 1.15; } #view-ficha > .fsel .fs-t small { font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-2); } #view-ficha > .fsel .fs-t b { font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
    '  #view-ficha > .fsel .fs-more { margin-left: auto; flex: none; display: inline-flex; align-items: center; gap: 6px; padding: 9px 13px; border-radius: 999px; background: var(--accent); color: var(--accent-ink); font-size: 13px; font-weight: 700; box-shadow: 0 3px 8px color-mix(in srgb, var(--accent) 35%, transparent); }',
    '  #view-ficha > .fsel.fs-pulse .fs-more { animation: fsPulse 1.8s ease-out infinite; }',
    '  @keyframes fsPulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 55%, transparent); } 70% { box-shadow: 0 0 0 10px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }',
    '  #view-ficha > .ftabs.ft-pro { display: none; position: static; }',
    '  #view-ficha > .ftabs.ft-pro.ft-open { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 10px; }',
    '  #view-ficha > .ftabs.ft-pro.ft-open .ftab { display: grid; grid-template-columns: 34px minmax(0, 1fr); grid-template-rows: auto auto; column-gap: 8px; align-items: end; align-content: center; justify-content: stretch; overflow-wrap: anywhere; padding: 10px; border-radius: 14px; white-space: normal; text-align: left; font-size: 13px; font-weight: 700; line-height: 1.2; min-height: 64px; background: var(--surface-2); }',
    '  #view-ficha > .ftabs.ft-pro.ft-open .ftab svg { grid-row: 1 / span 2; align-self: center; width: 34px; height: 34px; padding: 7px; border-radius: 12px; background: var(--accent-soft); color: var(--accent); box-sizing: border-box; }',
    '  #view-ficha > .ftabs.ft-pro.ft-open .ftab .ft-d { display: block; grid-column: 2; align-self: start; font-size: 11.5px; font-weight: 400; color: var(--ink-2); line-height: 1.25; }',
    '  #view-ficha > .ftabs.ft-pro.ft-open .ftab[aria-selected="true"] { background: var(--accent); } #view-ficha > .ftabs.ft-pro.ft-open .ftab[aria-selected="true"] svg { background: color-mix(in srgb, var(--accent-ink) 22%, transparent); color: var(--accent-ink); } #view-ficha > .ftabs.ft-pro.ft-open .ftab[aria-selected="true"] .ft-d { color: color-mix(in srgb, var(--accent-ink) 80%, transparent); }',
    '}'
  ].join('\n');
  document.head.appendChild(css);
})();
