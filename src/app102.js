/* ===== 1.19: aspecto premium (paleta, letra Inter, sombras, botones, ventanas, micrófono y odontograma con volumen) ===== */
(function () {
  'use strict';
  /* Solo estética: no cambia ids, data-act ni lógica. El CSS va al final del <body> para ganarle a los estilos base (que están en el body).
     Respeta los colores elegidos en Apariencia (data-acc / data-bg tienen más especificidad que :root). */
  const NS = 'http://www.w3.org/2000/svg';
  const css = document.createElement('style');
  css.id = 'ovPremium';
  css.textContent = [
    ':root {',
    '  --bg: #f3f6f6; --surface: #ffffff; --surface-2: #eaf0f0; --ink: #0f2328; --ink-2: #4d6268; --line: #dbe4e5;',
    '  --accent: #0a6c70; --accent-ink: #ffffff; --accent-soft: #dcefef; --accent-2: color-mix(in srgb, var(--accent) 80%, #fff); --accent-glow: color-mix(in srgb, var(--accent) 50%, transparent);',
    '  --blue: #1d5fd0; --blue-soft: #dfe9fb; --red: #d23a33; --red-soft: #fbe3e1;',
    '  --ok: #1f8a57; --ok-soft: #dcf2e6; --warn: #9a6200; --warn-soft: #fbedcf; --info: #2a6fdb; --info-soft: #e1ecfc;',
    '  --pat: #d23a33; --alert-bg: #fde7e4; --alert-ink: #8a1f19;',
    '  --shadow: 0 1px 1px rgba(15, 35, 40, .04), 0 2px 6px rgba(15, 35, 40, .05), 0 12px 32px -8px rgba(15, 35, 40, .10);',
    '  --shadow-sm: 0 1px 1px rgba(15, 35, 40, .04), 0 1px 3px rgba(15, 35, 40, .06);',
    '  --shadow-lg: 0 2px 4px rgba(15, 35, 40, .05), 0 24px 56px -12px rgba(15, 35, 40, .22);',
    '  --r-sm: 8px; --r: 12px; --r-lg: 16px; --r-xl: 20px;',
    '  --ease: cubic-bezier(.2, .7, .2, 1);',
    '  --f-display: "Inter", "Segoe UI", system-ui, sans-serif;',
    '  --f-body: "Inter", "Segoe UI", system-ui, sans-serif;',
    '  --f-mono: "Inter", "Segoe UI", system-ui, sans-serif;',
    '}',
    '@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {',
    '  --bg: #0b1619; --surface: #122126; --surface-2: #192d33; --ink: #e8f1f2; --ink-2: #9db3b8; --line: #24393f;',
    '  --accent: #46c2c1; --accent-ink: #032326; --accent-soft: #143a3d; --accent-2: color-mix(in srgb, var(--accent) 80%, #fff); --accent-glow: color-mix(in srgb, var(--accent) 40%, transparent);',
    '  --blue: #74a9ff; --blue-soft: #1a3152; --red: #ff7a72; --red-soft: #47211f;',
    '  --ok: #5ccc93; --ok-soft: #133628; --warn: #e9b155; --warn-soft: #3a2d12;',
    '  --shadow: 0 1px 2px rgba(0, 0, 0, .35), 0 12px 32px -8px rgba(0, 0, 0, .5);',
    '  --shadow-sm: 0 1px 2px rgba(0, 0, 0, .35); --shadow-lg: 0 24px 56px -12px rgba(0, 0, 0, .6); color-scheme: dark; } }',
    ':root[data-theme="dark"] {',
    '  --bg: #0b1619; --surface: #122126; --surface-2: #192d33; --ink: #e8f1f2; --ink-2: #9db3b8; --line: #24393f;',
    '  --accent: #46c2c1; --accent-ink: #032326; --accent-soft: #143a3d; --accent-2: color-mix(in srgb, var(--accent) 80%, #fff); --accent-glow: color-mix(in srgb, var(--accent) 40%, transparent);',
    '  --blue: #74a9ff; --blue-soft: #1a3152; --red: #ff7a72; --red-soft: #47211f;',
    '  --ok: #5ccc93; --ok-soft: #133628; --warn: #e9b155; --warn-soft: #3a2d12;',
    '  --shadow: 0 1px 2px rgba(0, 0, 0, .35), 0 12px 32px -8px rgba(0, 0, 0, .5);',
    '  --shadow-sm: 0 1px 2px rgba(0, 0, 0, .35); --shadow-lg: 0 24px 56px -12px rgba(0, 0, 0, .6); color-scheme: dark;',
    '}',
    '/* ---- base y tipografía ---- */',
    'body { font-size: 15px; line-height: 1.5; letter-spacing: -.003em; -webkit-font-smoothing: antialiased; font-feature-settings: "cv11"; }',
    'h1, h2, h3 { font-family: var(--f-display); font-weight: 650; letter-spacing: -.02em; }',
    '.mono, .num, time { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }',
    'button, .btn, .tab, .chip, .inp, .card, .ha, .seg button { transition: background-color .18s var(--ease), border-color .18s var(--ease), box-shadow .18s var(--ease), transform .12s var(--ease), color .18s var(--ease); }',
    '/* ---- barra superior ---- */',
    '.top { background: var(--bg); border-bottom: 1px solid color-mix(in srgb, var(--line) 70%, transparent); }',
    '.searchbox input { border-radius: 12px; background: var(--surface); box-shadow: var(--shadow-sm); border-color: var(--line); padding-top: 10px; padding-bottom: 10px; }',
    '.searchbox input:focus { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); outline: none; }',
    '/* ---- botones ---- */',
    '.btn { border-radius: 10px; padding: 9px 16px; min-height: 40px; font-weight: 600; box-shadow: var(--shadow-sm); border-color: var(--line); }',
    '.btn:hover { background: var(--surface-2); border-color: color-mix(in srgb, var(--accent) 35%, var(--line)); }',
    '.btn:active { transform: translateY(1px) scale(.985); box-shadow: none; }',
    '.btn.primary { background: linear-gradient(180deg, var(--accent-2), var(--accent)); border-color: transparent; box-shadow: 0 1px 0 rgba(255, 255, 255, .18) inset, 0 1px 2px var(--accent-glow), 0 6px 16px -6px var(--accent-glow); }',
    '.btn.primary:hover { filter: brightness(1.05); background: linear-gradient(180deg, var(--accent-2), var(--accent)); }',
    '.btn.small { min-height: 32px; padding: 5px 12px; border-radius: 9px; }',
    '.btn.ghost { box-shadow: none; }',
    '.btn[disabled] { opacity: .45; box-shadow: none; filter: grayscale(.4); }',
    '@media (pointer: coarse) { .btn { min-height: 44px; } .btn.small { min-height: 36px; } }',
    '/* ---- chips, pestañas, segmentados ---- */',
    '.chip { border-radius: 999px; padding: 3px 10px; font-weight: 600; letter-spacing: .005em; box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 14%, transparent); }',
    '.tabs, .seg { background: var(--surface-2); border-radius: 12px; padding: 4px; box-shadow: inset 0 1px 2px rgba(15, 35, 40, .06); }',
    '.tab, .seg button { border-radius: 9px; }',
    '.tab[aria-selected="true"], .seg button[aria-pressed="true"] { background: var(--surface); color: var(--ink); box-shadow: 0 1px 2px rgba(15, 35, 40, .08), 0 2px 8px -2px rgba(15, 35, 40, .12); }',
    '/* ---- tarjetas, bloques, accesos ---- */',
    '.card { border-radius: var(--r-lg); border-color: color-mix(in srgb, var(--line) 80%, transparent); box-shadow: var(--shadow); padding: 16px 18px; }',
    '.block { border-radius: var(--r); border-color: var(--line); background: var(--surface); }',
    '.ha { border-radius: var(--r-lg); box-shadow: var(--shadow-sm); border-color: var(--line); }',
    '.ha:hover { transform: translateY(-1px); box-shadow: var(--shadow); border-color: color-mix(in srgb, var(--accent) 30%, var(--line)); }',
    '.ha svg { background: var(--accent-soft); color: var(--accent); border-radius: 10px; padding: 7px; width: 38px; height: 38px; box-sizing: border-box; }',
    '.home-actions.icons .ha svg { width: 26px; height: 26px; padding: 15px; box-sizing: content-box; border-radius: 18px; border: 0; background: linear-gradient(160deg, color-mix(in srgb, var(--accent-soft) 60%, var(--surface)), var(--accent-soft)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 12%, transparent), 0 6px 14px -8px var(--accent-glow); }',
    '.home-actions.icons .ha:hover svg { transform: translateY(-2px); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent), 0 10px 20px -8px var(--accent-glow); }',
    '.home-actions.icons .ha span { font-size: 12px; font-weight: 600; color: var(--ink); }',
    '.home-hi h1, .home-hi h2 { font-size: 28px; letter-spacing: -.025em; }',
    '/* ---- formularios ---- */',
    '.inp, .field input, .field select, .field textarea, .modal .field input:not([type=checkbox]):not([type=radio]), .modal .field select, .modal .field textarea {',
    '  border: 1px solid var(--line); background: var(--surface); border-radius: 10px; padding: 10px 12px; min-height: 42px; box-shadow: inset 0 1px 1px rgba(15, 35, 40, .03); }',
    '.inp:focus, .field input:focus, .field select:focus, .field textarea:focus, .modal .field input:focus, .modal .field select:focus, .modal .field textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); outline: none; }',
    '.field > label, .field > span:first-child, label.lbl { font-size: 12.5px; font-weight: 600; color: var(--ink-2); letter-spacing: .01em; }',
    '/* ---- modales ---- */',
    '.modal-scrim { background: rgba(9, 22, 26, .5); }',
    '.m-body { overscroll-behavior: contain; }',
    '.modal .card, .modal .block, .modal .ha, .modal .hd-card, .modal .ps-card { box-shadow: var(--shadow-sm); }',
    '.modal { border-radius: var(--r-xl); box-shadow: var(--shadow-lg); border-color: color-mix(in srgb, var(--line) 60%, transparent); }',
    '.m-head { padding-block: 18px 14px !important; border-bottom: 1px solid var(--line); }',
    '.m-head h2, .m-head h3 { font-size: 19px; }',
    '.m-foot { background: color-mix(in srgb, var(--surface-2) 55%, var(--surface)); border-top: 1px solid var(--line); }',
    '/* ---- dictado por voz ---- */',
    '.vd-mic, .mic { position: relative; background: radial-gradient(120% 120% at 30% 20%, var(--accent-2), var(--accent)); color: #fff; border: 0; box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 14%, transparent), 0 10px 24px -6px var(--accent-glow); }',
    '.mic { width: 60px; height: 60px; }',
    '.vd-mic:hover, .mic:hover { transform: scale(1.04); }',
    '.vd-mic[aria-pressed="true"], .mic[aria-pressed="true"] { background: radial-gradient(120% 120% at 30% 20%, #f0645c, #c9302a); animation: ovRing 1.6s var(--ease) infinite; }',
    '@keyframes ovRing { 0% { box-shadow: 0 0 0 0 rgba(210, 58, 51, .45), 0 10px 24px -6px rgba(201, 48, 42, .6); } 70% { box-shadow: 0 0 0 16px rgba(210, 58, 51, 0), 0 10px 24px -6px rgba(201, 48, 42, .6); } 100% { box-shadow: 0 0 0 0 rgba(210, 58, 51, 0), 0 10px 24px -6px rgba(201, 48, 42, .6); } }',
    '.vd-bar { border-radius: 18px; box-shadow: var(--shadow-lg); }',
    '/* ---- odontograma ---- */',
    '.odon .face { fill: url(#ovEnamel); stroke: color-mix(in srgb, var(--ink-2) 55%, transparent); stroke-width: .75; stroke-linejoin: round; }',
    '.odon .face.f-todo { fill: url(#ovTodo); stroke: color-mix(in srgb, var(--m-todo) 70%, #000); }',
    '.odon .face.f-done { fill: url(#ovDone); stroke: color-mix(in srgb, var(--m-done) 70%, #000); }',
    '.odon .ov-crown { fill: none; stroke: color-mix(in srgb, var(--ink) 55%, transparent); stroke-width: 1.2; pointer-events: none; }',
    '.odon .ov-gloss { fill: url(#ovGloss); pointer-events: none; }',
    '.odon .ov-fis { fill: none; stroke: color-mix(in srgb, var(--ink-2) 40%, transparent); stroke-width: .9; stroke-linecap: round; pointer-events: none; }',
    '.odon .num { font-family: var(--f-body); font-size: 11px; font-weight: 600; fill: color-mix(in srgb, var(--ink-2) 85%, transparent); }',
    '.odon.armed .face:hover { stroke: var(--accent); stroke-width: 2; filter: drop-shadow(0 0 3px color-mix(in srgb, var(--accent) 55%, transparent)); }',
    '.odon .selbox { stroke: var(--accent); stroke-width: 2.2; fill: color-mix(in srgb, var(--accent) 7%, transparent); rx: 10; pointer-events: none; }',
    '.odon .midline { stroke: color-mix(in srgb, var(--line) 90%, var(--ink-2)); stroke-dasharray: 2 5; stroke-linecap: round; }',
    '.odon .xmark { stroke-width: 3.2; }',
    '.odon .badge rect { rx: 4; }',
    '.legend i { border-radius: 4px; width: 16px; height: 16px; }',
    '.legend .l-todo { background: linear-gradient(180deg, color-mix(in srgb, var(--m-todo) 70%, #fff), var(--m-todo)); }',
    '.legend .l-done { background: linear-gradient(180deg, color-mix(in srgb, var(--m-done) 70%, #fff), var(--m-done)); }',
    '@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .odon .face:not(.f-todo):not(.f-done) { fill: url(#ovEnamelDark); stroke: rgba(40, 50, 52, .55); } }',
    ':root[data-theme="dark"] .odon .face:not(.f-todo):not(.f-done) { fill: url(#ovEnamelDark); stroke: rgba(40, 50, 52, .55); }',
    ':root[data-theme="dark"] .odon .ov-crown { stroke: rgba(230, 236, 236, .7); } :root[data-theme="dark"] .odon .ov-fis { stroke: rgba(60, 70, 72, .45); }',
    ':root[data-theme="dark"] .vd-mic, :root[data-theme="dark"] .mic { color: var(--accent-ink); }',
    '@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .vd-mic, :root:not([data-theme="light"]) .mic { color: var(--accent-ink); } :root:not([data-theme="light"]) .odon .ov-crown { stroke: rgba(230, 236, 236, .7); } :root:not([data-theme="light"]) .odon .ov-fis { stroke: rgba(60, 70, 72, .45); } }',
    '/* ---- agenda: turnos como tarjetas suaves ---- */',
    '.hd-card, .ps-card, .nw-card { border-radius: var(--r-lg); box-shadow: var(--shadow); }'
  ].join('\n');
  document.body.appendChild(css);

  /* degradados de los dientes (marfil, azul y rojo con volumen) */
  if (!document.getElementById('ovDefs')) {
    document.body.insertAdjacentHTML('afterbegin', '<svg id="ovDefs" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>' +
      '<linearGradient id="ovEnamel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--surface)"/><stop offset=".55" style="stop-color:color-mix(in srgb, var(--surface) 70%, #f3eee3)"/><stop offset="1" style="stop-color:color-mix(in srgb, var(--surface-2) 60%, #e6dfcf)"/></linearGradient>' +
      '<linearGradient id="ovTodo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb, var(--m-todo) 72%, #fff)"/><stop offset="1" style="stop-color:var(--m-todo)"/></linearGradient>' +
      '<linearGradient id="ovDone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb, var(--m-done) 72%, #fff)"/><stop offset="1" style="stop-color:var(--m-done)"/></linearGradient>' +
      '<linearGradient id="ovEnamelDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efece4"/><stop offset="1" stop-color="#cfc7b6"/></linearGradient>' +
      '<radialGradient id="ovGloss" cx=".3" cy=".22" r=".55"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '</defs></svg>');
  }

  /* contorno según el tipo de pieza y surcos en la cara oclusal: solo adorno, no se tocan (pointer-events: none) */
  const kind = n => { const q = Math.floor(n / 10), u = n % 10; if (u <= 2) return 'inc'; if (u === 3) return 'can'; if (q >= 5) return 'mol'; return u <= 5 ? 'pre' : 'mol'; };
  const RX = { inc: 8, can: 12, pre: 10, mol: 6 };
  const FIS = { inc: 'M14 19 H24', can: 'M19 15 L19 23 M15.5 19 H22.5', pre: 'M14 19 Q19 16.5 24 19', mol: 'M14 17 Q19 19 24 17 M19 13.5 V24.5 M14 21.5 Q19 19.5 24 21.5' };
  const mk = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
  function toothNum(inner) {
    const p = inner.querySelector('polygon.face'); if (!p) return 0;
    const t = +p.getAttribute('data-t'); if (t) return t;
    const m = (p.textContent || '').match(/Pieza (\d+)/); return m ? +m[1] : 0;
  }
  function deco() {
    document.querySelectorAll('svg.odon:not([data-ov])').forEach(svg => {
      svg.setAttribute('data-ov', '1');
      const small = svg.classList.contains('tight');
      svg.querySelectorAll('polygon.face:nth-of-type(5)').forEach(o => {
        const inner = o.parentNode, g = inner && inner.parentNode; if (!g || inner.getAttribute('data-ov')) return;
        const n = toothNum(inner); if (!n) return;
        inner.setAttribute('data-ov', '1');
        const k = kind(n), after = inner.nextSibling;
        inner.style.clipPath = 'inset(0 round ' + RX[k] + 'px)';
        g.insertBefore(mk('rect', { class: 'ov-crown', x: .6, y: .6, width: 36.8, height: 36.8, rx: RX[k] - .6 }), after);
        if (!small) {
          g.insertBefore(mk('path', { class: 'ov-fis', d: FIS[k] }), after);
          g.insertBefore(mk('rect', { class: 'ov-gloss', x: 1, y: 1, width: 36, height: 20, rx: RX[k] - 1 }), after);
        }
      });
    });
  }
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; try { deco(); } catch (e) { /* nada */ } }); };
  try { new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); } catch (e) { /* nada */ }
  later();
})();
