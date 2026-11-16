/* ===== 1.54.1: elegir la obra social con un buscador propio (el datalist del navegador en Android sale chico, pegado al teclado y solo busca por el comienzo) ===== */
(function () {
  'use strict';
  const A = window.App;
  const N = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const esc = A.esc;
  /* campos de obra social: paciente nuevo, ficha del paciente y turnero */
  const LISTS = { npOsDl: { part: false }, osDl: { part: true }, tnCovs: { part: true } };
  const opts = cfg => {
    const L = (A.osList ? A.osList() : []).filter(o => o && o.sigla && o.on !== false);
    const out = L.filter(o => !/^particular$/i.test(o.sigla)).map(o => ({ v: o.sigla, n: o.name && o.name !== o.sigla ? o.name : '' }));
    if (cfg.part) out.unshift({ v: 'Particular', n: 'Sin obra social' });
    return out;
  };
  let cur = null;   /* { inp, box, list, hi } */
  function close() { if (cur && cur.box) cur.box.remove(); cur = null; }
  let ghostUntil = 0;
  function pick(inp, v) {
    ghostUntil = Date.now() + 450; inp._typed = false;
    inp.value = v;
    ['input', 'change'].forEach(t => inp.dispatchEvent(new Event(t, { bubbles: true })));
    close();
    /* pasar al campo siguiente (n.º de afiliado) o cerrar el teclado */
    const next = inp.id === 'npC' ? document.getElementById('npAfil') : null;
    if (next) next.focus(); else inp.blur();
  }
  function paint(inp) {
    const cfg = inp._ovOs, q = inp._typed ? N(inp.value) : '', all = opts(cfg);
    let L = q ? all.filter(o => N(o.v).indexOf(q) >= 0 || N(o.n).indexOf(q) >= 0) : all;
    L.sort((a, b) => { const sa = N(a.v).indexOf(q) === 0 ? 0 : 1, sb = N(b.v).indexOf(q) === 0 ? 0 : 1; return sa - sb; });
    const exact = all.some(o => N(o.v) === q);
    if (!cur || cur.inp !== inp) { close(); const box = document.createElement('div'); box.className = 'os-sug'; box.setAttribute('role', 'listbox'); inp.closest('.field').appendChild(box); cur = { inp, box, hi: 0 }; }
    cur.list = L.slice(0, 60); if (cur.hi >= cur.list.length) cur.hi = 0;
    const free = q && !exact ? '<button type="button" class="os-it os-free" data-v="' + esc(inp.value.trim()) + '">Usar «' + esc(inp.value.trim()) + '» <small>(no está en la lista)</small></button>' : '';
    cur.box.innerHTML = (cur.list.length ? '' : free) +
      (cur.list.length ? cur.list.map((o, i) => '<button type="button" role="option" class="os-it' + (i === cur.hi ? ' hi' : '') + '" data-v="' + esc(o.v) + '"><b>' + esc(o.v) + '</b>' + (o.n ? '<span>' + esc(o.n) + '</span>' : '') + '</button>').join('') : (q ? '' : '<div class="os-none">No hay obras sociales cargadas. Escribila y queda guardada.</div>')) +
      (L.length > 60 ? '<div class="os-none">Escribí para ver más…</div>' : '') + (cur.list.length ? free : '');
  }
  function enhance(inp) {
    if (inp._ovOs) return;
    const id = inp.getAttribute('list'); if (!LISTS[id]) return;
    inp._ovOs = LISTS[id]; inp.removeAttribute('list'); inp.setAttribute('autocomplete', 'off'); inp.setAttribute('autocapitalize', 'characters');
    inp.setAttribute('role', 'combobox'); inp.setAttribute('aria-autocomplete', 'list');
    const dl = document.getElementById(id); if (dl) dl.remove();
    inp.addEventListener('focus', () => {
      inp._typed = false; paint(inp);
      try { inp.select(); } catch (e) { /* nada */ }
      /* en el celular, subir el campo para que la lista quede a la vista arriba del teclado */
      if (window.innerWidth < 760) setTimeout(() => { try { inp.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) { /* nada */ } }, 320);
    });
    inp.addEventListener('input', () => { inp._typed = true; if (cur) cur.hi = 0; paint(inp); });
    inp.addEventListener('keydown', e => {
      if (!cur || cur.inp !== inp) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); cur.hi = Math.max(0, Math.min(cur.list.length - 1, cur.hi + (e.key === 'ArrowDown' ? 1 : -1))); paint(inp); const h = cur.box.querySelector('.hi'); if (h) h.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter' && cur.list.length && inp._typed && N(inp.value)) { e.preventDefault(); pick(inp, cur.list[cur.hi].v); }
      else if (e.key === 'Escape') close();
    });
    inp.addEventListener('blur', () => setTimeout(() => { if (cur && cur.inp === inp && !cur.box.contains(document.activeElement)) close(); }, 180));
  }
  /* el toque que eligió no tiene que «caer» en el campo que queda abajo cuando la lista se cierra */
  ['click', 'mousedown', 'touchend'].forEach(t => document.addEventListener(t, e => { if (Date.now() < ghostUntil && !(e.target && e.target.id === 'npAfil')) { e.preventDefault(); e.stopPropagation(); } }, true));
  /* tocar un renglón: pointerdown para que el input no pierda el foco antes de elegir */
  document.addEventListener('pointerdown', e => {
    const it = e.target.closest && e.target.closest('.os-sug .os-it');
    if (it && cur) { e.preventDefault(); pick(cur.inp, it.getAttribute('data-v')); return; }
    if (cur && !(e.target.closest && (e.target.closest('.os-sug') || e.target === cur.inp))) close();
  }, true);
  const scan = root => (root.querySelectorAll ? root.querySelectorAll('input[list]') : []).forEach(enhance);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n.parentNode || n); }))).observe(document.body, { childList: true, subtree: true });
  scan(document);

  const css = document.createElement('style');
  css.textContent = '.field{position:relative}.os-sug{margin-top:4px;border:1px solid var(--line,#ccd);border-radius:12px;background:var(--card,#fff);max-height:min(46vh,320px);overflow:auto;-webkit-overflow-scrolling:touch;box-shadow:0 6px 18px rgba(0,0,0,.08);overscroll-behavior:contain}' +
    '.os-it{display:flex;flex-direction:column;align-items:flex-start;gap:1px;width:100%;text-align:left;border:0;border-bottom:1px solid var(--line,#eee);background:none;padding:11px 14px;min-height:48px;font:inherit;color:inherit;cursor:pointer}.os-it:last-child{border-bottom:0}.os-it b{font-size:15px}.os-it span{font-size:13px;color:var(--ink-2,#555)}.os-it.hi,.os-it:active{background:var(--accent-soft,#e6f3f3)}' +
    '.os-free{flex-direction:row;gap:6px;align-items:baseline;font-weight:600;color:var(--accent,#0d6b6b)}.os-free small{font-weight:400;color:var(--ink-2,#555)}.os-none{padding:10px 14px;font-size:13px;color:var(--ink-2,#555)}';
  document.head.appendChild(css);
})();
