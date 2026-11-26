/* ===== 1.45: «Instalar como aplicación» en iPhone y iPad: guía paso a paso (Apple no deja instalar con un solo toque) ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc;
  const standalone = () => { try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) { return false; } };
  /* iPhone, iPod, iPad (los iPad nuevos se presentan como Mac con pantalla táctil) */
  const isIOS = () => { try { const u = navigator.userAgent || ''; return /iPhone|iPad|iPod/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1); } catch (e) { return false; } };
  const isIpad = () => { try { return /iPad/.test(navigator.userAgent || '') || (/Macintosh/.test(navigator.userAgent || '') && navigator.maxTouchPoints > 1); } catch (e) { return false; } };
  /* abierta desde otra app (WhatsApp, Instagram, Facebook…): ahí no aparece «Agregar a inicio» */
  const inApp = () => /FBAN|FBAV|Instagram|WhatsApp|Line\/|Twitter|LinkedInApp|Snapchat|TikTok/i.test(navigator.userAgent || '');

  const SHARE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  const PLUS = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';

  MF.iosInst = () => {
    const steps = [
      inApp() ? '<b>Abrila en Safari.</b> Ahora la tenés abierta dentro de otra aplicación y ahí no se puede instalar. Tocá <b>Copiar enlace</b>, abrí Safari y pegalo.' : '<b>Abrí OdontoVoz en Safari</b> (el navegador azul con la brújula). Si estás en otro navegador, copiá el enlace y abrilo en Safari.',
      '<b>Tocá el botón Compartir</b> <span class="ios-ic">' + SHARE + '</span> ' + (isIpad() ? 'que está arriba, al lado de la barra de direcciones.' : 'que está abajo, en el medio de la pantalla.'),
      '<b>Deslizá hacia abajo y tocá «Agregar a inicio»</b> <span class="ios-ic">' + PLUS + '</span>. Si no lo ves, bajá hasta el final de la lista.',
      '<b>Tocá «Agregar»</b>, arriba a la derecha. Listo: el ícono de OdontoVoz queda en tu pantalla de inicio.'
    ];
    const b = '<p class="m-lead">En iPhone y iPad Apple no deja instalar con un solo toque: se hace desde el botón Compartir de Safari, en 4 pasos.</p>' +
      '<ol class="ios-steps">' + steps.map(s => '<li>' + s + '</li>').join('') + '</ol>' +
      '<p class="hint">Abrila siempre desde ese ícono: se ve a pantalla completa, como una aplicación, y sigue andando si se corta el internet.</p>' +
      '<div class="row-btns"><button class="btn" data-act="iosCopy">Copiar enlace</button></div>';
    return A.modalShell('Instalar OdontoVoz en tu ' + (isIpad() ? 'iPad' : 'iPhone'), b, '<button class="btn primary" data-act="closeModal">Entendido</button>', true);
  };
  A.acts.iosCopy = () => {
    const url = location.origin + location.pathname;
    const ok = () => A.toast('Enlace copiado. Pegalo en Safari.');
    try { navigator.clipboard.writeText(url).then(ok, () => A.toast(url)); } catch (e) { A.toast(url); }
  };
  const prev = A.acts.pwaInstall;
  A.acts.pwaInstall = function () {
    if (isIOS() && !standalone()) { const g = document.getElementById('gearMenu'); if (g) g.hidden = true; S.modal = { type: 'iosInst' }; A.renderModal(); return; }
    return prev ? prev.apply(this, arguments) : undefined;
  };
  A.isIOS = isIOS;

  const css = document.createElement('style'); css.id = 'ovApp128';
  css.textContent = '.ios-steps{margin:8px 0 12px;padding:0;list-style:none;counter-reset:ios;display:flex;flex-direction:column;gap:10px}.ios-steps li{counter-increment:ios;position:relative;padding:10px 12px 10px 46px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);line-height:1.4}.ios-steps li::before{content:counter(ios);position:absolute;left:12px;top:10px;width:24px;height:24px;border-radius:50%;background:var(--accent);color:var(--accent-ink);font-weight:700;display:flex;align-items:center;justify-content:center;font-size:13px}.ios-ic{display:inline-flex;vertical-align:middle;color:var(--accent);border:1px solid var(--line);border-radius:8px;padding:1px 4px;background:var(--surface)}';
  document.head.appendChild(css);
})();
