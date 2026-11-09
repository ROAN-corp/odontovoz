/* ===== 1.38.2: WhatsApp o WhatsApp Business (en Android se elige cuál abrir, y se puede recordar por equipo) ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, esc = A.esc;
  const KEY = 'odontovoz.waApp';
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const android = /Android/i.test(navigator.userAgent || '');
  const PKG = { wa: 'com.whatsapp', biz: 'com.whatsapp.w4b' };
  const pref = () => LS.get(KEY, 'ask'); /* ask | wa | biz */

  /* ¿es un enlace de WhatsApp? devuelve {phone, text} */
  function parse(u) {
    u = String(u || '');
    let m = u.match(/^https?:\/\/wa\.me\/(\d*)\/?(?:\?(.*))?$/i);
    if (!m) { m = u.match(/^https?:\/\/(?:api|web)\.whatsapp\.com\/send\/?\?(.*)$/i); if (m) m = [m[0], (m[1].match(/(?:^|&)phone=(\d+)/) || [])[1] || '', m[1]]; }
    if (!m) return null;
    const q = new URLSearchParams(m[2] || '');
    return { phone: m[1] || '', text: q.get('text') || '' };
  }
  const intentUrl = (w, pkg, back) => 'intent://send/?' + (w.phone ? 'phone=' + w.phone + '&' : '') + 'text=' + encodeURIComponent(w.text) + '#Intent;scheme=whatsapp;package=' + pkg + ';S.browser_fallback_url=' + encodeURIComponent(back) + ';end';
  function go(u, w, which) {
    if (!which || !PKG[which]) { open0.call(window, u, '_blank', 'noopener'); return; }
    A._waLast = intentUrl(w, PKG[which], u); location.href = A._waLast;
  }

  /* ventanita para elegir (no usa S.modal, así no tapa la ventana que esté abierta) */
  function pick(u, w) {
    const old = $('#waPick'); if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', '<div id="waPick" role="dialog" aria-modal="true" aria-labelledby="waPickT"><div class="wp-box"><h3 id="waPickT">¿Con cuál WhatsApp lo mandás?</h3>' +
      '<button class="wp-opt" data-wp="wa"><b>WhatsApp</b><small>El común</small></button>' +
      '<button class="wp-opt biz" data-wp="biz"><b>WhatsApp Business</b><small>El de empresa</small></button>' +
      '<label class="wp-rem"><input type="checkbox" id="wpRem" checked> Recordar en este equipo</label>' +
      '<p class="wp-h">Se cambia en Ajustes › WhatsApp para recordatorios.</p>' +
      '<button class="btn" data-wp="x">Cancelar</button></div></div>');
    const box = $('#waPick');
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-wp]'); if (!b && e.target !== box) return;
      const k = b ? b.getAttribute('data-wp') : 'x';
      if (k !== 'x' && ($('#wpRem') || {}).checked) LS.set(KEY, k);
      box.remove();
      if (k !== 'x') go(u, w, k);
    });
  }
  function route(u) {
    const w = parse(u); if (!w) return false;
    if (!android) return false;
    const p = pref();
    if (p === 'ask') pick(u, w); else go(u, w, p);
    return true;
  }
  A.waOpen = u => { if (!route(u)) open0.call(window, u, '_blank', 'noopener'); };

  /* todos los botones de WhatsApp de la app pasan por acá */
  const open0 = window.open;
  window.open = function (u) { try { if (route(u)) return null; } catch (e) { /* nada */ } return open0.apply(window, arguments); };
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]'); if (!a || !parse(a.getAttribute('href'))) return;
    if (route(a.getAttribute('href'))) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* ajuste por equipo */
  A.acts.waCfg = () => {
    if (A.hideDrawer) A.hideDrawer();
    A.S.modal = { type: 'waCfg' }; A.renderModal();
  };
  A.modalFns.waCfg = () => {
    const p = pref(), o = [['ask', 'Preguntar cada vez'], ['wa', 'WhatsApp'], ['biz', 'WhatsApp Business']];
    return A.modalShell('WhatsApp para recordatorios',
      '<p class="hint">Elegí con qué WhatsApp se abren los recordatorios, presupuestos y avisos que mandás desde la app. Vale para este equipo.</p>' +
      '<div class="seg wp-seg" role="group" aria-label="WhatsApp">' + o.map(x => '<button data-act="waSet" data-v="' + x[0] + '" aria-pressed="' + (p === x[0]) + '">' + esc(x[1]) + '</button>').join('') + '</div>' +
      (android ? '' : '<p class="hint">En la computadora y en el iPhone se abre el WhatsApp que tengas como principal; la elección sirve en celulares Android.</p>') +
      '<p class="hint">En la app instalada (APK) hace falta la versión 1.38.2 o más nueva para abrir WhatsApp Business.</p>',
      '<button class="btn primary" data-act="closeModal">Listo</button>');
  };
  A.acts.waSet = el => { LS.set(KEY, el.getAttribute('data-v')); A.renderModal(); A.toast('Listo: ' + el.textContent + '.'); };

  /* entrada en el menú (queda dentro de Ajustes › La app en este equipo) */
  const WA_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z"/></svg>';
  function menu() {
    if ($('#drWaCfg')) return;
    const ref = $('#gearMenu .dnav[data-act="notifOpen"]') || $('#gearMenu .dnav[data-act="appearOpen"]'); if (!ref) return;
    ref.insertAdjacentHTML('afterend', '<button class="dnav" id="drWaCfg" data-act="waCfg">' + WA_IC + '<span class="t">WhatsApp para recordatorios<small>WhatsApp o WhatsApp Business</small></span></button>');
  }
  const arPrev = A.afterRefresh;
  A.afterRefresh = function () { if (arPrev) arPrev.apply(this, arguments); try { menu(); } catch (e) { /* nada */ } };

  const css = document.createElement('style');
  css.textContent = [
    '#waPick { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.45); display: flex; align-items: flex-end; justify-content: center; padding: 16px; }',
    '@media (min-width: 641px) { #waPick { align-items: center; } }',
    '#waPick .wp-box { width: 100%; max-width: 380px; background: var(--surface); color: var(--ink); border-radius: 20px; padding: 18px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 20px 50px -20px rgba(0,0,0,.5); }',
    '#waPick h3 { margin: 0 0 4px; font-size: 18px; }',
    '.wp-opt { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 14px 16px; min-height: 56px; border-radius: 14px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); font: inherit; text-align: left; cursor: pointer; }',
    '.wp-opt b { font-size: 16px; color: #128c4a; } .wp-opt.biz b { color: #0b6b6f; } .wp-opt small { color: var(--ink-2); font-size: 13px; }',
    '.wp-rem { display: flex; align-items: center; gap: 8px; font-size: 14.5px; padding: 4px 2px; } .wp-rem input { width: 20px; height: 20px; }',
    '.wp-h { margin: 0; font-size: 12.5px; color: var(--ink-2); }',
    '.wp-seg { flex-wrap: wrap; margin: 10px 0; }'
  ].join('\n');
  document.head.appendChild(css);
})();
