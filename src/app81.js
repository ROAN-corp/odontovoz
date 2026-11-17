/* ===== 1.1.2: logo de OdontoVoz en el medio de la barra de arriba, y «Stock de insumos» en el menú principal ===== */
(function () {
  'use strict';
  const A = window.App;
  const MARK = '<svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="ovbG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f6f6c"/><stop offset="1" stop-color="#0a3f45"/></linearGradient></defs><rect width="40" height="40" rx="10" fill="url(#ovbG)"/>' +
    '<g transform="translate(4 4)" fill="none" stroke="#bfe8df" stroke-linejoin="round" stroke-linecap="round"><path d="M9 4c-3.2 0-5.5 2.6-5.5 6 0 2.6 1 4.4 1.8 6.6.9 2.5.9 5.4 1.9 8.5.5 1.6 2.4 1.7 3 .1.9-2.4 1.1-5.2 2.4-5.2h2.8c1.3 0 1.5 2.8 2.4 5.2.6 1.6 2.5 1.5 3-.1 1-3.1 1-6 1.9-8.5.8-2.2 1.8-4 1.8-6.6 0-3.4-2.3-6-5.5-6-2.1 0-3.2 1.1-5.2 1.1S11.1 4 9 4z" stroke-width="2"/><path d="M11 11.5v2M13.5 10v5M16 9v7M18.5 10v5M21 11.5v2" stroke-width="1.8"/></g></svg>';
  A.ovMarkSVG = MARK;
  /* el logo va en la barra, centrado entre los botones de la izquierda y el buscador */
  const mountBar = () => {
    const bar = document.querySelector('header.appbar .top-in'); if (!bar || bar.querySelector('.ov-barlogo')) return;
    const el = document.createElement('div'); el.className = 'ov-barlogo'; el.setAttribute('aria-label', 'OdontoVoz');
    el.innerHTML = '<span class="ov-bm">' + MARK + '</span><span class="ov-bt">Odonto<b>Voz</b></span>';
    const t = bar.querySelector('.ab-title'); if (t) t.insertAdjacentElement('afterend', el); else bar.appendChild(el);
  };
  /* «Stock de insumos» sale de Ajustes y pasa al menú principal (después de Caja) */
  const mountMenu = () => {
    const st = document.querySelector('.dnav[data-act="stkOpen"]'), caja = document.querySelector('.dnav[data-act="tab"][data-tab="caja"]');
    if (!st || !caja || st.previousElementSibling === caja || st.dataset.main) return;
    caja.insertAdjacentElement('afterend', st); st.dataset.main = '1'; st.classList.add('dnav-main');
  };
  /* con varios lugares (consultorio propio + invitado): el nombre del lugar arriba del menú es un botón para cambiar */
  const mountPlace = () => {
    const L = A.placesList ? A.placesList() : [], many = L.length > 1 && !!(A.cloud && A.cloud.session);
    const old = document.getElementById('drPlace'); if (old) old.remove();
    const c = document.getElementById('drClinic'); if (!c) return;
    c.classList.toggle('dr-pl', many);
    if (many) { c.setAttribute('data-act', 'plOpen'); c.setAttribute('role', 'button'); c.setAttribute('tabindex', '0'); c.title = 'Cambiar de lugar'; }
    else { c.removeAttribute('data-act'); c.removeAttribute('role'); c.removeAttribute('tabindex'); }
  };
  const run = () => { try { mountBar(); mountMenu(); mountPlace(); const h = document.querySelector('header.appbar'), t = document.querySelector('.ab-title'); if (h) { h.classList.toggle('ov-home', A.S.tab === 'inicio'); h.classList.toggle('ov-many', !!(t && t.classList.contains('pl-many'))); } } catch (e) { /* nada */ } };
  const arPrev = A.afterRefresh; A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; run(); return r; };
  setTimeout(run, 0); setTimeout(run, 600); setTimeout(run, 2000);
  const css = document.createElement('style');
  css.textContent = 'header.appbar .top-in{position:relative}.ab-title{min-width:0}' +
    '.ov-barlogo{flex:none;display:flex;align-items:center;gap:8px;pointer-events:none;margin:0 6px}' +
    '.ov-barlogo .ov-bm{display:inline-flex;width:30px;height:30px;border-radius:8px;box-shadow:0 1px 5px rgba(10,63,69,.22)}.ov-barlogo .ov-bm svg{width:100%;height:100%;display:block}' +
    '.ov-barlogo .ov-bt{font-weight:800;font-size:16px;letter-spacing:-.01em;color:var(--ink,#123);white-space:nowrap}.ov-barlogo .ov-bt b{color:var(--accent,#0d6b6b);font-weight:800}' +
    /* en la compu, centrado en la barra */
    '@media(min-width:1100px){.ov-barlogo{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);margin:0;z-index:1}.ov-barlogo .ov-bm{width:34px;height:34px;border-radius:9px}.ov-barlogo .ov-bt{font-size:17px}}' +
    /* tablet: al lado del título */
    /* celular y APK: en el inicio, el nombre (sin el ícono) centrado en el espacio libre, en lugar del título; en las demás pantallas queda el título */
    '@media(max-width:699px){.ov-barlogo{display:none;flex:1 1 auto;justify-content:center;margin:0 4px}.ov-barlogo .ov-bm{display:none}.ov-barlogo .ov-bt{font-size:17px}header.appbar.ov-home:not(.ov-many) .ov-barlogo{display:flex}header.appbar.ov-home:not(.ov-many) .ab-title{display:none}}' +
    '@media(max-width:339px){.ov-barlogo{display:none}}' +
    /* con varios lugares, el título (que se toca para cambiar de lugar) manda sobre el nombre */
        '.dr-id{min-width:0}#drClinic.dr-pl{display:block;white-space:normal;overflow:visible;margin-top:6px;padding:7px 11px;border:1.5px solid var(--accent,#0d6b6b);border-radius:12px;background:color-mix(in srgb,var(--accent,#0d6b6b) 10%,transparent);color:var(--accent,#0d6b6b);font-weight:700;cursor:pointer;line-height:1.25}#drClinic.dr-pl::after{content:"⇄ Tocá para cambiar de lugar";display:block;margin-top:3px;font-size:11.5px;font-weight:600;color:var(--ink-2)}';
  document.head.appendChild(css);
})();
