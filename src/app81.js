/* ===== 1.1.1: logo de OdontoVoz arriba del inicio (con el nombre chiquito al lado) ===== */
(function () {
  'use strict';
  const A = window.App;
  const MARK = '<svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="ovbG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f6f6c"/><stop offset="1" stop-color="#0a3f45"/></linearGradient></defs><rect width="40" height="40" rx="10" fill="url(#ovbG)"/>' +
    '<g transform="translate(4 4)" fill="none" stroke="#bfe8df" stroke-linejoin="round" stroke-linecap="round"><path d="M9 4c-3.2 0-5.5 2.6-5.5 6 0 2.6 1 4.4 1.8 6.6.9 2.5.9 5.4 1.9 8.5.5 1.6 2.4 1.7 3 .1.9-2.4 1.1-5.2 2.4-5.2h2.8c1.3 0 1.5 2.8 2.4 5.2.6 1.6 2.5 1.5 3-.1 1-3.1 1-6 1.9-8.5.8-2.2 1.8-4 1.8-6.6 0-3.4-2.3-6-5.5-6-2.1 0-3.2 1.1-5.2 1.1S11.1 4 9 4z" stroke-width="2"/><path d="M11 11.5v2M13.5 10v5M16 9v7M18.5 10v5M21 11.5v2" stroke-width="1.8"/></g></svg>';
  A.ovMarkSVG = MARK;
  const mount = () => {
    const v = document.getElementById('view-inicio'); if (!v) return;
    const hi = v.querySelector('.home-hi'); if (!hi || hi.querySelector('.ov-brand')) return;
    hi.insertAdjacentHTML('afterbegin', '<div class="ov-brand" aria-label="OdontoVoz"><span class="ov-bm">' + MARK + '</span><span class="ov-bt">Odonto<b>Voz</b></span></div>');
  };
  const arPrev = A.afterRefresh; A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; try { mount(); } catch (e) { /* nada */ } return r; };
  const go = () => { const v = document.getElementById('view-inicio'); if (!v) { setTimeout(go, 300); return; } new MutationObserver(() => { try { mount(); } catch (e) { /* nada */ } }).observe(v, { childList: true, subtree: true }); mount(); };
  go();
  const css = document.createElement('style');
  css.textContent = '.ov-brand{display:flex;align-items:center;gap:9px;margin:0 0 10px}.ov-bm{display:inline-flex;width:38px;height:38px;border-radius:10px;box-shadow:0 2px 8px rgba(10,63,69,.25)}.ov-bm svg{width:100%;height:100%;display:block}' +
    '.ov-bt{font-weight:800;font-size:15px;letter-spacing:-.01em;color:var(--ink,#123)}.ov-bt b{color:var(--accent,#0d6b6b);font-weight:800}' +
    '.home-hi h1 .ov-mark{display:none}' +
    '@media(min-width:900px){.ov-brand{margin-bottom:14px}.ov-bm{width:44px;height:44px;border-radius:12px}.ov-bt{font-size:17px}}';
  document.head.appendChild(css);
})();
