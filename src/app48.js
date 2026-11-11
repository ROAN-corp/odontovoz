/* ===== 1.38: pantalla de Ajustes (tuerquita) que junta todas las opciones, y al cambiar de cuenta se vuelve al Inicio ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, MF = A.modalFns, esc = A.esc;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';

  /* ---------- grupos de la pantalla de Ajustes ---------- */
  const GROUPS = [
    { t: 'Consultorio', k: ['cfgOpen:centro', 'locsOpen', 'catalogOpen', 'osOpen', 'stkOpen', 'tnOpen', 'importOpen'] },
    { t: 'La app en este equipo', k: ['appearOpen', 'assistOpen', 'notifOpen', 'waCfg', 'pwaInstall'] },
    { t: 'Cuenta y datos', k: ['planOpen', 'changeAccount', 'empOn', 'empOff', 'plOpen', 'tmOpen', 'cfgOpen:datos', 'archOpen', 'testWipeOpen', 'modeOpen', 'acctOpen'] },
    { t: 'Ayuda', k: ['newsOpen', 'fbOpen', 'tutVid', 'tutorialOpen', 'voiceHelp', 'supportOpen'] }
  ];
  const keyOf = b => { const a = b.getAttribute('data-act'); return a === 'cfgOpen' ? 'cfgOpen:' + (b.getAttribute('data-t') || 'centro') : a; };
  function items() {
    const seen = {}, all = {};
    A.$$('#gearMenu .aj-sec').forEach(x => x.classList.remove('aj-collapsed'));
    A.$$('#gearMenu .dr-sec .dnav, #gearMenu .dr-nav .dnav').forEach(b => {
      const k = keyOf(b); if (!k || seen[k] || b.id === 'drAjustes') return;
      if (b.hidden || b.classList.contains('lt-hide') || getComputedStyle(b).display === 'none') return;
      seen[k] = 1; all[k] = b;
    });
    A.$$('#gearMenu .aj-sec').forEach(x => x.classList.add('aj-collapsed'));
    return all;
  }
  const rowHTML = b => {
    const attrs = Array.from(b.attributes).filter(a => /^data-/.test(a.name)).map(a => a.name + '="' + esc(a.value) + '"').join(' ');
    const svg = b.querySelector('svg'), t = b.querySelector('.t') || b.querySelector('span');
    let title = b.textContent; if (t) { const c = t.cloneNode(true); c.querySelectorAll('small').forEach(x => x.remove()); title = c.textContent; }
    if (b.getAttribute('data-act') === 'changeAccount') title = 'Tipo de cuenta: ' + String(title).trim();
    const sub = t && t.querySelector('small') ? t.querySelector('small').textContent : '';
    return '<button class="aj-row" ' + attrs + ' data-aj="1">' + (svg ? svg.outerHTML : GEAR) + '<span class="aj-t"><b>' + esc(String(title).trim()) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span><span class="aj-go" aria-hidden="true">›</span></button>';
  };
  MF.ajustes = () => {
    const all = items(), used = {};
    /* filas propias (no están en el menú): equipo e invitaciones, y la cuenta */
    const CLx = A.cloud, mk = (act, t, sub, ic) => { const b = document.createElement('button'); b.setAttribute('data-act', act); b.innerHTML = ic + '<span class="t">' + esc(t) + '<small>' + esc(sub) + '</small></span>'; return b; };
    if (CLx && CLx.session) {
      const role = A.mbRole ? A.mbRole() : '', boss = !(A.isMember && A.isMember()) || role === 'admin';
      if (boss && A.acts.teamOpen) all.tmOpen = mk('teamOpen', 'Equipo e invitaciones', 'Usuarios, e invitar a un odontólogo que ya usa OdontoVoz', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>');
      all.acctOpen = all.acctOpen || mk('acctOpen', 'Cuenta y equipos', 'Sincronizar, contraseña, PIN y equipos conectados', GEAR);
    }
    GROUPS.forEach(g => g.k.forEach(k => { if (all[k]) used[k] = 1; }));
    const extra = Object.keys(all).filter(k => !GROUPS.some(g => g.k.indexOf(k) >= 0) && all[k].closest('.aj-sec'));
    let b = '<div class="aj">';
    GROUPS.forEach(g => {
      const rows = g.k.filter(k => all[k]).map(k => rowHTML(all[k]));
      if (g.t === 'Consultorio') extra.forEach(k => rows.push(rowHTML(all[k])));
      if (rows.length) b += '<section class="aj-g"><h3>' + esc(g.t) + '</h3><div class="aj-list">' + rows.join('') + '</div></section>';
    });
    b += '<p class="aj-ver">OdontoVoz ' + esc(A.VERSION || '') + '</p></div>';
    return A.modalShell('Ajustes', b, '<button class="btn primary" data-act="ajClose">Listo</button>', true);
  };
  A.acts.ajOpen = () => { if (A.hideDrawer) A.hideDrawer(); S._ajBack = false; S.modal = { type: 'ajustes' }; A.renderModal(); };
  A.acts.ajClose = () => { S._ajBack = false; S.modal = null; A.renderModal(); };
  /* tocar una opción: se abre su ventana; al cerrarla se vuelve a Ajustes */
  document.addEventListener('click', e => { const r = e.target.closest && e.target.closest('.aj-row'); if (r) S._ajBack = true; }, true);
  const rmPrev = A.renderModal;
  A.renderModal = function () {
    if (!S.modal && S._ajBack && !S._ajBusy) {
      const leftForTab = S.tab && S._ajTab && S.tab !== S._ajTab;
      if (!leftForTab) { S.modal = { type: 'ajustes' }; }
      S._ajBack = false;
    }
    if (S.modal && S.modal.type === 'ajustes') S._ajTab = S.tab;
    return rmPrev.apply(this, arguments);
  };

  /* ---------- videos tutoriales por modo ---------- */
  const VBASE = 'https://roan-corp.github.io/odontovoz/video/';
  const VIDS = [['pro', 'Profesional'], ['centro', 'Consultorio y centro'], ['empresa', 'Empresa'], ['lite', 'LITE']];
  const myVid = () => (A.liteOn && A.liteOn()) ? 'lite' : !S.setup ? 'centro' : S.setup.type === 'empresa' ? 'empresa' : S.setup.type === 'solo' ? 'pro' : 'centro';
  A.acts.tutVid = el => { if (A.hideDrawer) A.hideDrawer(); S.modal = { type: 'tutVid', v: (el && el.getAttribute && el.getAttribute('data-v')) || myVid() }; A.renderModal(); };
  MF.tutVid = m => {
    const v = m.v || myVid();
    return A.modalShell('Videos tutoriales',
      '<div class="seg tv-seg" role="group" aria-label="Elegí el video">' + VIDS.map(x => '<button data-act="tutVid" data-v="' + x[0] + '" aria-pressed="' + (v === x[0]) + '">' + esc(x[1]) + (x[0] === myVid() ? ' ·&nbsp;el tuyo' : '') + '</button>').join('') + '</div>' +
      '<div class="tv-box"><video src="' + VBASE + 'tut-' + v + '.mp4" poster="' + VBASE + 'poster-tut-' + v + '.jpg" controls playsinline preload="metadata"></video></div>' +
      '<p class="hint" style="text-align:center">Dura menos de un minuto. Si no carga, revisá la conexión a internet.</p>',
      '<button class="btn" data-act="tutorialOpen">Tutorial paso a paso</button><button class="btn primary" data-act="closeModal">Cerrar</button>', true);
  };
  const tutPrev = MF.tutorial;
  if (tutPrev) MF.tutorial = function () {
    const h = tutPrev.apply(this, arguments);
    return h.replace('<div class="tut">', '<button class="tv-cta" data-act="tutVid">▶ Ver el video de tu modo (1 minuto)</button><div class="tut">');
  };

  /* ---------- menú: una sola entrada «Ajustes» con la tuerquita ---------- */
  function drawer() {
    const secs = A.$$('#gearMenu .dr-sec'), sec = secs.filter(s => /Ajustes/.test((s.querySelector('.dr-lbl') || {}).textContent || ''))[0];
    if (!sec) return;
    sec.classList.add('aj-sec', 'aj-collapsed');
    const tb = $('#gearMenu .dnav[data-act="tutorialOpen"]');
    if (tb && !$('#drTutVid')) tb.insertAdjacentHTML('beforebegin', '<button class="dnav" id="drTutVid" data-act="tutVid"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="15" height="14" rx="2"/><path d="M17 10l5-3v10l-5-3z"/></svg><span class="t">Videos tutoriales</span></button>');
    if (!$('#drAjustes')) sec.insertAdjacentHTML('afterbegin', '<button class="dnav" id="drAjustes" data-act="ajOpen">' + GEAR + '<span class="t">Ajustes<small>Consultorio, apariencia, voz, cuenta…</small></span></button>');
  }

  /* ---------- al cambiar de cuenta o de lugar: al Inicio ---------- */
  if (LS.get('odontovoz.goHome', '') === '1') { LS.set('odontovoz.goHome', null); S.tab = 'inicio'; S.panel = null; S.date = A.today(); }
  const owner = () => { try { return (A.ownerId && A.ownerId()) || (A.cloud && A.cloud.session && A.cloud.session.user && A.cloud.session.user.id) || ''; } catch (e) { return ''; } };
  let lastOwner = null;

  const arPrev = A.afterRefresh;
  A.afterRefresh = function () {
    const o = owner();
    if (lastOwner !== null && o !== lastOwner && S.tab !== 'inicio') {
      lastOwner = o; S.tab = 'inicio'; S.panel = null; S.date = A.today(); if (A.hideDrawer) A.hideDrawer(); A.refresh(); window.scrollTo(0, 0); return;
    }
    lastOwner = o;
    if (arPrev) arPrev.apply(this, arguments);
    try { drawer(); } catch (e) { /* nada */ }
  };

  const css = document.createElement('style');
  css.textContent = [
    '#gearMenu .aj-sec.aj-collapsed > .dnav:not(#drAjustes) { display: none !important; }',
    '.aj { display: flex; flex-direction: column; gap: 18px; }',
    '.aj-g h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-2); margin: 0 0 8px 4px; }',
    '.aj-list { display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }',
    '.aj-row { display: flex; align-items: center; gap: 14px; width: 100%; padding: 12px 14px; min-height: 56px; background: none; border: 0; border-top: 1px solid var(--line); color: var(--ink); font: inherit; text-align: left; cursor: pointer; }',
    '.aj-row:first-child { border-top: 0; } .aj-row:hover { background: var(--bg); }',
    '.aj-row svg { width: 22px; height: 22px; flex: none; color: var(--accent); }',
    '.aj-t { flex: 1; min-width: 0; display: flex; flex-direction: column; } .aj-t b { font-weight: 600; font-size: 15.5px; } .aj-t small { font-size: 13px; color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.aj-go { font-size: 22px; color: var(--ink-2); flex: none; }',
    '.tv-seg { flex-wrap: wrap; margin-bottom: 12px; } .tv-box { display: flex; justify-content: center; } .tv-box video { height: 62vh; width: auto; max-width: 100%; aspect-ratio: 720 / 1558; object-fit: contain; border-radius: 18px; background: #000; }',
    '.tv-cta { display: block; width: 100%; margin: 0 0 14px; padding: 12px; border-radius: 14px; border: 1px solid var(--accent); background: color-mix(in srgb, var(--accent) 10%, var(--surface)); color: var(--accent); font: 700 15px inherit; cursor: pointer; }',
    '.aj-ver { text-align: center; font-size: 12px; color: var(--ink-2); margin: 0; }'
  ].join('\n');
  document.head.appendChild(css);
})();
