/* ===== 1.6.1: modo oscuro sin letras invisibles (colores que faltaban y textos blancos sobre fondos claros) ===== */
(function () {
  'use strict';
  const A = window.App;
  /* 1) nombres de colores que usaban algunos módulos y no existían (en oscuro caían a blanco) */
  const base = document.createElement('style');
  base.id = 'ov-dark-fix';
  base.textContent = ':root{--card:var(--surface);--muted:var(--ink-2);--soft:var(--accent-soft);--teal:var(--accent);--bad:var(--red);--bg-soft:rgba(0,0,0,.035);--bg-2:var(--surface-2);--f-sans:var(--f-body);--mono:var(--f-mono)}' +
    ':root[data-theme="dark"]{--bg-soft:rgba(255,255,255,.06)}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg-soft:rgba(255,255,255,.06)}}';
  document.head.appendChild(base);

  /* 2) reglas «fondo de color de acento + letra blanca» y «fondo claro fijo sin color de letra»: en oscuro se corrigen */
  const DARK = [':root[data-theme="dark"] ', ':root:not([data-theme="light"]) '];
  const SKIP = /sig|firma|canvas|paper|pdf|prev|qr|logo|odon|tooth|pieza|perio|print|photo|img|swatch|color-dot|cj-dot|stdot|pc[0-9]|ov-mark/i;
  const WHITE = /^(#fff|#ffffff|white|rgb\(255, ?255, ?255\))$/i;
  const lightHex = v => { const m = String(v || '').trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i); if (!m) return /^(white|rgb\(255, ?255, ?255\))$/i.test(String(v || '').trim()); let h = m[1]; if (h.length === 3) h = h.split('').map(c => c + c).join(''); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.82; };
  const done = new WeakSet();
  let out = null;
  function scan() {
    const list = [];
    const add = (sel, decl) => { const s = sel.split(',').map(x => x.trim()).filter(Boolean); DARK.forEach((p, i) => list.push({ s: s.map(x => p + x).join(','), d: decl, m: i })); };
    [].forEach.call(document.styleSheets, sh => {
      if (sh.ownerNode === out || sh.ownerNode === base) return;
      let rules; try { rules = sh.cssRules; } catch (e) { return; }
      const walk = list => [].forEach.call(list || [], r => {
        if (r.cssRules && !r.selectorText) { if (r.media && /dark/.test(r.media.mediaText)) return; walk(r.cssRules); return; }
        if (!r.selectorText || done.has(r)) return; done.add(r);
        const st = r.style, bg = (st.backgroundColor || st.background || '').trim(), col = (st.color || '').trim(), sel = r.selectorText;
        if (/data-theme|:root/.test(sel)) return;
        if (/var\(--accent\)/.test(bg) && !/gradient/.test(bg) && WHITE.test(col)) add(sel, 'color:var(--accent-ink)!important');
        else if (!col && lightHex(bg.split(' ')[0]) && !SKIP.test(sel)) add(sel, 'background:var(--surface-2)!important');
        else if (lightHex(bg.split(' ')[0]) && col && /var\(--ink/.test(col) && !SKIP.test(sel)) add(sel, 'background:var(--surface-2)!important');
      });
      walk(rules);
    });
    const L = list; if (!L.length) return;
    if (!out) { out = document.createElement('style'); out.id = 'ov-dark-fix2'; document.head.appendChild(out); }
    out.textContent += L.filter(x => x.m === 0).map(x => x.s + '{' + x.d + '}').join('') + '@media (prefers-color-scheme: dark){' + L.filter(x => x.m === 1).map(x => x.s + '{' + x.d + '}').join('') + '}';
  }
  /* 3) arreglos puntuales que no salen de una regla de hoja de estilos */
  const fix = document.createElement('style');
  fix.textContent = DARK.map((p, i) => (i ? '@media (prefers-color-scheme: dark){' : '') +
    p + '#dayStrip .wk.today[aria-pressed="true"],' + p + '#dayStrip .wk.today[aria-pressed="true"] b,' + p + '#dayStrip .wk.today[aria-pressed="true"] small,' + p + '#dayStrip .wk.today[aria-pressed="true"] span{color:var(--accent-ink)!important}' + p + '.cj-diff.bad{color:#ffb9b3}' + p + '.cj-b small,' + p + '.cj-b span{color:var(--ink-2)}' + p + '.cj-light.ok>b,' + p + '.cj-res.ok b{color:#55c58a}' + p + '.cj-res.bad b{color:#ff8a84}' + p + '.cj-osbar{background:var(--warn-soft)!important}' +
    (i ? '}' : '')).join('');
  document.head.appendChild(fix);
  const run = () => { try { scan(); } catch (e) { if (A && A.logError) A.logError('dark88', e); } };
  run(); setTimeout(run, 1500); setTimeout(run, 6000);
  /* estilos que se agregan más tarde (ventanas que cargan sus propios estilos) */
  if (window.MutationObserver) { let t = 0; new MutationObserver(ms => { if (ms.some(m => [].some.call(m.addedNodes, n => n.tagName === 'STYLE' && n !== out))) { clearTimeout(t); t = setTimeout(run, 200); } }).observe(document.head, { childList: true }); }
})();
