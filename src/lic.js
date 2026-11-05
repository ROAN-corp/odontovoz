/* ===== licencia de la cuenta: prueba, plan y vencimiento; si vence, solo lectura (los datos se pueden ver y descargar) ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, CL = A.cloud;
  if (!CL) return;
  const PLANES = { prueba: 'Prueba gratis', basico: 'Profesional', consultorio: 'Consultorio', centro: 'Centro' };
  const ADMIN_URL = 'https://roan-corp.github.io/odontovoz/admin.html';
  CL.lic = null; CL.readonly = false; CL.isAdmin = false;
  const today = () => A.today();
  const until = l => (l ? [l.trial_until, l.paid_until].filter(Boolean).sort().pop() : null);
  const daysLeft = l => { const u = until(l); return u ? Math.round((A.parse(u) - A.parse(today())) / 86400000) : null; };
  CL.licActive = l => !!(l && l.status === 'activa' && until(l) && until(l) >= today());

  /* se consulta al sincronizar (cada pocos segundos como mucho una vez por minuto) */
  let lastCheck = 0;
  CL.checkLicense = async force => {
    if (!CL.session) return;
    if (!force && Date.now() - lastCheck < 60000 && CL.lic) return;
    lastCheck = Date.now();
    try {
      const rows = await CL.api('/rest/v1/ov_accounts?select=*&owner=eq.' + CL.session.user.id);
      CL.lic = rows && rows[0] ? rows[0] : null;
      if (!CL.adminChecked) { CL.adminChecked = true; const ad = await CL.api('/rest/v1/ov_admins?select=user_id&user_id=eq.' + CL.session.user.id); CL.isAdmin = !!(ad && ad.length); }
    } catch (e) { if (e.status === 404 || e.status === 400) { CL.lic = null; } else return; } /* sin conexión: queda lo último sabido */
    try { localStorage.setItem('odontovoz.lic', JSON.stringify(CL.lic)); } catch (e) { /* nada */ }
    apply();
  };
  CL.onDenied = () => { lastCheck = 0; CL.checkLicense(true); };
  CL.applyLic = () => apply();
  try { CL.lic = JSON.parse(localStorage.getItem('odontovoz.lic') || 'null'); } catch (e) { CL.lic = null; }

  function apply() {
    const was = CL.readonly;
    /* sin tabla de licencias todavía (servidor sin actualizar): no se bloquea nada */
    CL.readonly = !!(CL.session && CL.lic && !CL.licActive(CL.lic));
    document.body.classList.toggle('lic-ro', CL.readonly);
    banner();
    if (CL.readonly && !was) A.toast('Tu suscripción no está vigente: podés ver y descargar tus datos, pero no cargar cambios nuevos.');
    if (A.afterRefresh) A.afterRefresh();
  }
  function banner() {
    let b = $('#licBar');
    const l = CL.lic, d = daysLeft(l);
    let html = '';
    if (CL.session && l) {
      if (CL.readonly) html = '<b>' + (l.status === 'suspendida' ? 'Cuenta suspendida.' : 'Tu suscripción venció' + (until(l) ? ' el ' + A.fmtDMY(until(l)) : '') + '.') + '</b> Podés ver y descargar tus datos. Para seguir cargando, renovala. <button class="btn small" data-act="licOpen">Ver cómo</button>';
      else if (d != null && d <= 7) html = (l.plan === 'prueba' ? 'Tu prueba gratis termina ' : 'Tu suscripción vence ') + (d <= 0 ? 'hoy' : d === 1 ? 'mañana' : 'en ' + d + ' días') + '. <button class="btn small" data-act="licOpen">Renovar</button>';
    }
    if (!html) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'licBar'; document.body.appendChild(b); }
    b.className = 'lic-bar' + (CL.readonly ? ' ro' : ''); b.innerHTML = html;
    requestAnimationFrame(() => document.documentElement.style.setProperty('--licH', b.offsetHeight + 'px'));
  }

  /* modo solo lectura: se puede mirar, buscar, descargar e imprimir; no se puede cargar ni cambiar nada */
  const ALLOW = /^(tab|navBack|goHome|gear|drawer|open|close|ficha(Tab|Back)|ag(Prev|Next|Today|GoDay|View|More|CalMon|Free(Day)?|Shift)|view|search|topRes|pdf|acct|login|privacy|support|lic|tutorial|tut|voiceHelp|appear|theme|conv|scrim|labAll|labFilter|labMoreDone|labGoPat|osOpen|osMon|osEdit|osBack|impSeePats|toast|odZoom|cfgOpen|cfgTab|bk|backup|exportAll|dl|download|stMenu|stOpen|mvCancel|noop|modeOpen|demo|tpClose|cmdSay|voiceToggle|voiceStop|handsFree|introGo|exitNow|exit|devName|cloudSyncNow|pin|evMore|evOpen|evClear|evCopy|tpWa|lbx|agStrip|tnLink|jrOpen|jrGo|remMenu|lookSet|homeEdit|homePick|homeReset|agTodayNow|fb)/;
  const blocked = el => CL.readonly && el && !ALLOW.test(el.getAttribute('data-act') || '');
  const nope = () => A.toast('Solo lectura: tu suscripción no está vigente. Podés ver y descargar tus datos.');
  document.addEventListener('click', e => {
    if (!CL.readonly) return;
    const el = e.target.closest && e.target.closest('[data-act]');
    if (el && blocked(el) && !el.closest('#loginWrap')) { e.stopImmediatePropagation(); e.preventDefault(); nope(); }
  }, true);
  ['change', 'submit'].forEach(t => document.addEventListener(t, e => {
    if (!CL.readonly) return;
    const k = e.target.getAttribute && (e.target.getAttribute('data-chg') || e.target.getAttribute('data-sub'));
    if (k && !/^(theme|conv|devName|topSearch|pinGo|login|osQ|rsDate|evKind|evPro|evFrom|evTo|evAnul)/.test(k) && !(e.target.closest && e.target.closest('#loginWrap, #pinWrap'))) { e.stopImmediatePropagation(); e.preventDefault(); nope(); }
  }, true));
  /* por voz: solo consultar y moverse */
  const execPrev = A.cmd.exec;
  A.cmd.exec = (text, o) => {
    if (CL.readonly) {
      let pr = null; try { pr = window.OVCmd.parse(text, { today: A.today(), pros: A.PROS }); } catch (e) { /* nada */ }
      if (!pr || ['nav', 'ficha', 'openPat', 'home', 'back', 'menu', 'who', 'today', 'owe', 'help', 'stop', 'cancel'].indexOf(pr.intent) < 0) return { ok: false, msg: 'Solo lectura: tu suscripción no está vigente.' };
    }
    return execPrev(text, o);
  };
  /* tampoco se guardan cambios locales (no podrían subirse) */
  const origSave = A.saveNow;
  A.saveNow = () => { if (CL.readonly && CL.session) return; origSave(); };

  /* datos de la suscripción para el usuario */
  A.acts.licOpen = () => { S.modal = { type: 'lic' }; A.renderModal(); };
  MF.lic = () => {
    const l = CL.lic, d = daysLeft(l), sup = A.SUPPORT || {};
    let b = '';
    if (!l) b = '<p>No hay datos de suscripción para esta cuenta todavía.</p>';
    else b = '<div class="acct-box"><b>Plan: ' + esc(PLANES[l.plan] || l.plan) + '</b><span>Estado: ' + (CL.readonly ? (l.status === 'suspendida' ? 'suspendida' : 'vencida') + ' · solo lectura' : 'activa') + '</span>' +
      '<span>' + (l.plan === 'prueba' && !l.paid_until ? 'Prueba gratis hasta el ' : 'Vigente hasta el ') + A.fmtDMY(until(l)) + (d != null && d >= 0 ? ' (' + (d === 0 ? 'vence hoy' : 'quedan ' + d + ' días') + ')' : '') + '</span></div>';
    b += '<p class="hint">Para contratar o renovar, escribinos' + (sup.whatsapp ? ' por WhatsApp' : '') + (sup.email ? ' o a ' + esc(sup.email) : '') + '. Apenas se acredita el pago, tu cuenta se renueva sola en todos tus equipos.</p>' +
      '<p class="hint">Aunque la suscripción venza, <b>tus datos no se borran</b>: siempre podés verlos y descargar una copia completa (Ajustes › Copia de seguridad).</p>';
    return A.modalShell('Tu suscripción', b, (sup.whatsapp ? '<a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/' + esc(String(sup.whatsapp).replace(/\D/g, '')) + '?text=' + encodeURIComponent('Hola, quiero renovar OdontoVoz. Mi cuenta: ' + (CL.session ? CL.session.user.email : '')) + '">Escribir por WhatsApp</a>' : '') + '<button class="btn" data-act="closeModal">Cerrar</button>');
  };
  /* en la cuenta y en el menú: plan, vencimiento y (para ustedes) el panel de administración */
  const origAcct = MF.acct;
  MF.acct = m => {
    let h = origAcct(m); const l = CL.lic;
    if (l) h = h.replace('<div class="field" style="margin-top:10px">', '<div class="acct-box" style="margin-top:8px"><b>Plan ' + esc(PLANES[l.plan] || l.plan) + (CL.readonly ? ' · solo lectura' : '') + '</b><span>Vigente hasta el ' + A.fmtDMY(until(l)) + '</span><button class="btn small" data-act="licOpen">Ver suscripción</button></div><div class="field" style="margin-top:10px">');
    if (CL.isAdmin) h = h.replace('<div class="block"><h3>Tus datos</h3>', '<div class="block"><h3>Administración</h3><div class="hint" style="margin:0">Sos administrador: desde el panel manejás las cuentas de todos los usuarios.</div><div class="row-btns"><a class="btn small primary" href="' + ADMIN_URL + '" target="_blank" rel="noopener">Abrir panel de administración</a></div></div><div class="block"><h3>Tus datos</h3>');
    return h;
  };
  document.head.insertAdjacentHTML('beforeend', '<style>.lic-bar{position:fixed;left:0;right:0;bottom:0;z-index:118;background:#7a4b00;color:#fff;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));font-size:14px;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;text-align:center}.lic-bar.ro{background:#8a1f1a}.lic-bar .btn{background:#fff;color:#111;border-color:#fff}body:has(.lic-bar) .vdock{bottom:calc(var(--licH,80px) + 12px + env(safe-area-inset-bottom,0px))}</style>');
  if (CL.lic && CL.session) apply();
})();
