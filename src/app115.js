/* ===== 1.30: Stock rediseñado: «Mi stock» y «Comprar stock» (lo que falta, Rutiden y el pedido), movimientos y consumo por práctica ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, $ = q => document.querySelector(q);
  if (!A.stkApi || !A.stkHTML) return;
  const K = A.stkApi, fq = K.fq;
  const money = n => '$' + Math.round(n).toLocaleString('es-AR');
  const st2 = () => S.stk2 || (S.stk2 = { q: '', cat: '', f: 'all', sort: 'urg', group: true, dense: false, col: {} });
  const inner = A.stkHTML;   /* la versión anterior: da «para comprar», movimientos, receta y Rutiden */
  const strip = h => h.replace(/<div class="seg stk-tabs"[\s\S]*?<\/div>/, '');
  const pre = h => ((h.match(/<div class="stk-sede">[\s\S]*?<\/div>|<p class="stk-where">[\s\S]*?<\/p>/) || [''])[0]);
  const secOf = t => (t === 'lista' ? { s: 'mi' } : t === 'comprar' ? { s: 'buy', b: 'falta' } : t === 'rut' ? { s: 'buy', b: 'rut' } : t === 'mov' ? { s: 'mov' } : t === 'rec' ? { s: 'rec' } : { s: 'mi' });
  const go = t => A.acts.stkTab({ getAttribute: () => t });

  /* ---------- números de la cabecera ---------- */
  const info = L => {
    const out = L.filter(i => K.status(i) === 'out').length, low = L.filter(i => K.status(i) === 'low').length, exp = L.filter(K.expSoon).length;
    let val = 0, withCost = 0; L.forEach(i => { if (i.cost > 0) { val += i.cost * i.qty; withCost++; } });
    return { out, low, exp, ok: L.length - out - low, val, withCost };
  };
  const urg = i => { const s = K.status(i); return s === 'out' ? 0 : s === 'low' ? 1 : K.expSoon(i) ? 2 : 3; };
  const cmp = {
    urg: (a, b) => urg(a) - urg(b) || a.name.localeCompare(b.name, 'es'),
    name: (a, b) => a.name.localeCompare(b.name, 'es'),
    exp: (a, b) => (a.exp || '9999') < (b.exp || '9999') ? -1 : (a.exp || '9999') > (b.exp || '9999') ? 1 : a.name.localeCompare(b.name, 'es'),
    use: (a, b) => K.use30(b) - K.use30(a) || a.name.localeCompare(b.name, 'es'),
    val: (a, b) => (b.cost * b.qty || 0) - (a.cost * a.qty || 0) || a.name.localeCompare(b.name, 'es')
  };
  const filterOk = (i, s) => (!s.cat || i.cat === s.cat) && (s.f === 'all' || (s.f === 'out' && K.status(i) === 'out') || (s.f === 'low' && K.status(i) !== 'ok') || (s.f === 'exp' && K.expSoon(i))) &&
    (!s.q || (A.norm ? A.norm(i.name + ' ' + i.cat) : (i.name + ' ' + i.cat).toLowerCase()).indexOf(A.norm ? A.norm(s.q) : s.q.toLowerCase()) >= 0);

  /* ---------- pestañas principales ---------- */
  function tabsHTML(sec, L) {
    const n = L ? info(L) : { out: 0, low: 0 }, need = n.out + n.low;
    const T = [['mi', 'lista', '📦', 'Mi stock'], ['buy', 'comprar', '🛒', 'Comprar stock'], ['mov', 'mov', '⇄', 'Movimientos'], ['rec', 'rec', '🧾', 'Consumo por práctica']];
    return '<div class="s2-tabs" role="tablist">' + T.filter(t => t[0] !== 'rec' || K.canCfg()).map(t => '<button type="button" role="tab" data-act="stkTab" data-t="' + t[1] + '" aria-pressed="' + (sec === t[0]) + '"><i aria-hidden="true">' + t[2] + '</i><span>' + t[3] + '</span>' + (t[0] === 'buy' && need ? '<em>' + need + '</em>' : '') + '</button>').join('') + '</div>';
  }

  /* ---------- MI STOCK ---------- */
  function kpisHTML(n, total, s) {
    const card = (cls, f, big, lab, sub) => '<button class="s2-k ' + cls + (s.f === f ? ' on' : '') + '" data-act="s2F" data-f="' + f + '"><b>' + big + '</b><span>' + lab + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + '</button>';
    return '<div class="s2-kpis">' + card('all', 'all', total, 'insumos', n.val ? 'valen ' + money(n.val) : '') + card('ok', 'all', n.ok, 'bien', '') +
      card('low', 'low', n.out + n.low, 'poco o nada', n.out ? n.out + ' sin stock' : '') + card('exp', 'exp', n.exp, 'vencen pronto', 'en 45 días') + '</div>';
  }
  function itemHTML(i, s) {
    const stt = K.status(i), dl = K.daysLeft(i), u = K.use30(i), pct = i.min > 0 ? Math.min(100, Math.round(i.qty / (i.min * 3) * 100)) : (i.qty > 0 ? 70 : 0), mk = i.min > 0 ? Math.round(1 / 3 * 100) : 0;
    const badge = stt === 'out' ? '<span class="s2-b out">Sin stock</span>' : stt === 'low' ? '<span class="s2-b low">Poco</span>' : '';
    const ex = K.expSoon(i) ? '<span class="s2-b exp">Vence ' + (A.fmtDMY ? A.fmtDMY(i.exp) : i.exp) + '</span>' : '';
    const rt = i.rut ? '<span class="s2-b rut">Rutiden</span>' : '';
    const meta = [i.cat, i.min > 0 ? 'mínimo ' + fq(i.min) : '', i.uses > 1 ? 'rinde ' + i.uses + ' usos' : '', u > 0 ? 'usa ~' + fq(u) + ' por mes' : '', dl != null ? 'alcanza ~' + dl + ' días' : '', i.cost > 0 ? 'costo ' + money(i.cost) : ''].filter(Boolean).map(esc).join(' · ');
    return '<li class="s2-it ' + stt + (s.dense ? ' dn' : '') + '"><button class="s2-main" data-act="stkItem" data-id="' + i.id + '"><span class="s2-top"><b>' + esc(i.name) + '</b>' + badge + ex + rt + '</span>' + (s.dense ? '' : '<span class="s2-meta">' + meta + '</span>') +
      '<span class="s2-meter" aria-hidden="true"><i style="width:' + pct + '%"></i>' + (mk ? '<u style="left:' + mk + '%"></u>' : '') + '</span></button>' +
      '<div class="s2-q"><button data-act="s2Adj" data-id="' + i.id + '" data-d="-1" aria-label="Usé uno"' + (i.qty > 0 ? '' : ' disabled') + '>−</button><span><b>' + fq(i.qty) + '</b><small>' + esc(i.unit || '') + '</small></span><button data-act="s2Adj" data-id="' + i.id + '" data-d="1" aria-label="Llegó uno">+</button></div></li>';
  }
  function miHTML(L) {
    const s = st2(), n = info(L), cats = {}; L.forEach(i => { cats[i.cat] = (cats[i.cat] || 0) + 1; });
    let h = kpisHTML(n, L.length, s);
    if (n.out + n.low > 0 && s.f === 'all' && !s.q && !s.cat) h += '<div class="s2-alert"><span>⚠️ <b>' + (n.out + n.low) + ' insumo' + (n.out + n.low === 1 ? '' : 's') + '</b> con poco o nada' + (n.out ? ' (' + n.out + ' sin stock)' : '') + '.</span><button class="btn small primary" data-act="stkTab" data-t="comprar">Comprar ahora</button></div>';
    h += '<div class="s2-acts"><button data-act="stkIn"><i>📦</i><b>Llegó mercadería</b></button><button data-act="stkUseM"><i>✋</i><b>Usé algo</b></button><button data-act="stkCount"><i>🔢</i><b>Contar el stock</b></button><button data-act="stkNew"><i>＋</i><b>Insumo nuevo</b></button><button data-act="s2Share"><i>↗</i><b>Compartir</b></button></div>';
    h += '<div class="s2-bar"><label class="s2-search"><span aria-hidden="true">🔍</span><input type="search" id="s2Q" placeholder="Buscar insumo o categoría…" value="' + esc(s.q) + '" data-in="s2Q" aria-label="Buscar insumo"></label>' +
      '<select data-chg="s2Sort" aria-label="Ordenar"><option value="urg"' + (s.sort === 'urg' ? ' selected' : '') + '>Lo más urgente primero</option><option value="name"' + (s.sort === 'name' ? ' selected' : '') + '>Nombre (A a Z)</option><option value="exp"' + (s.sort === 'exp' ? ' selected' : '') + '>Vence antes</option><option value="use"' + (s.sort === 'use' ? ' selected' : '') + '>Más usado</option><option value="val"' + (s.sort === 'val' ? ' selected' : '') + '>Mayor valor</option></select>' +
      '<div class="s2-view" role="group" aria-label="Vista"><button data-act="s2View" data-v="g" aria-pressed="' + s.group + '" title="Agrupar por categoría">▤</button><button data-act="s2View" data-v="d" aria-pressed="' + s.dense + '" title="Lista compacta">☰</button></div></div>';
    h += '<div class="s2-chips" role="group" aria-label="Categorías"><button class="' + (!s.cat ? 'on' : '') + '" data-act="s2Cat" data-c="">Todas <small>' + L.length + '</small></button>' + Object.keys(cats).sort((a, b) => a.localeCompare(b, 'es')).map(c => '<button class="' + (s.cat === c ? 'on' : '') + '" data-act="s2Cat" data-c="' + esc(c) + '">' + esc(c) + ' <small>' + cats[c] + '</small></button>').join('') + '</div>';
    h += '<div id="s2List">' + listHTML(L) + '</div>';
    return h;
  }
  function listHTML(L) {
    const s = st2(), V = L.filter(i => filterOk(i, s)).sort(cmp[s.sort] || cmp.urg);
    if (!V.length) return '<p class="s2-none">No hay insumos con ese filtro. <button class="linkbtn" data-act="s2Clear">Ver todos</button></p>';
    if (!s.group || s.sort !== 'urg' && s.sort !== 'name') return '<ul class="s2-list">' + V.map(i => itemHTML(i, s)).join('') + '</ul>';
    const g = {}; V.forEach(i => { (g[i.cat] = g[i.cat] || []).push(i); });
    return Object.keys(g).sort((a, b) => a.localeCompare(b, 'es')).map(c => { const open = !s.col[c]; return '<section class="s2-g"><button class="s2-gh" data-act="s2Col" data-c="' + esc(c) + '" aria-expanded="' + open + '"><b>' + esc(c) + '</b><small>' + g[c].length + ' · ' + g[c].filter(i => K.status(i) !== 'ok').length + ' por reponer</small><i aria-hidden="true">' + (open ? '▾' : '▸') + '</i></button>' + (open ? '<ul class="s2-list">' + g[c].map(i => itemHTML(i, s)).join('') + '</ul>' : '') + '</section>'; }).join('');
  }

  /* ---------- COMPRAR STOCK ---------- */
  function buyHub(sub, L) {
    const n = info(L), need = n.out + n.low, r = A.rutInfo ? A.rutInfo() : { n: 0, total: 0, logo: '', name: 'Rutiden', count: 0 };
    const card = (on, act, data, ic, t, sub2, cls) => '<button class="s2-bc ' + (cls || '') + (on ? ' on' : '') + '" data-act="' + act + '" ' + (data || '') + '><span class="s2-bi">' + ic + '</span><b>' + t + '</b><small>' + sub2 + '</small></button>';
    return '<div class="s2-hub">' + card(sub === 'falta', 'stkTab', 'data-t="comprar"', '🧾', 'Lo que falta', need ? need + ' para reponer' : 'Todo en orden') +
      card(sub === 'rut', 'stkTab', 'data-t="rut"', r.logo ? '<img src="' + r.logo + '" alt="">' : '🏪', r.name, (r.count ? r.count.toLocaleString('es-AR') + ' productos' : 'Catálogo')) +
      card(false, 'rtCart', '', '🛒', 'Mi pedido', r.n ? r.n + ' producto' + (r.n === 1 ? '' : 's') + (r.total ? ' · ' + (r.all ? '' : 'desde ') + money(r.total) : '') : 'Vacío', r.n ? 'hot' : '') +
      card(false, 's2Soon', '', '🏬', 'Surdental', 'Próximamente', 'dis') + '</div>';
  }

  /* ---------- la pantalla ---------- */
  A.stkHTML = () => {
    const s = S.stk || (S.stk = { tab: 'lista' }), t = s.tab || 'lista', c = secOf(t), L = K.list();
    if (c.s === 'mi') {
      const h0 = inner();   /* para la elección de centro y, si no hay insumos, el kit recomendado */
      if (!L.length) return pre(h0) + tabsHTML('mi', L) + strip(h0);
      return pre(h0) + tabsHTML('mi', L) + miHTML(L);
    }
    const h = inner();
    if (c.s === 'buy') return pre(h) + tabsHTML('buy', L) + buyHub(c.b, L) + strip(h).replace(pre(h), '');
    return pre(h) + tabsHTML(c.s, L) + strip(h).replace(pre(h), '');
  };

  /* ---------- acciones ---------- */
  const paintList = () => { const l = $('#s2List'); if (l) l.innerHTML = listHTML(K.list()); };
  const repaint = () => { if (S.modal && S.modal.type === 'stk') { const h = $('#stkHost'); if (h) h.innerHTML = A.stkHTML(); else A.renderModal(); } };
  A.ins.s2Q = el => { st2().q = el.value; paintList(); };
  A.chg.s2Sort = el => { st2().sort = el.value; paintList(); };
  A.acts.s2F = el => { const s = st2(), f = el.getAttribute('data-f'); s.f = s.f === f && f !== 'all' ? 'all' : f; repaint(); };
  A.acts.s2Cat = el => { st2().cat = el.getAttribute('data-c') || ''; repaint(); };
  A.acts.s2Clear = () => { const s = st2(); s.q = ''; s.cat = ''; s.f = 'all'; repaint(); };
  A.acts.s2View = el => { const s = st2(); if (el.getAttribute('data-v') === 'g') s.group = !s.group; else s.dense = !s.dense; repaint(); };
  A.acts.s2Col = el => { const s = st2(), c = el.getAttribute('data-c'); if (s.col[c]) delete s.col[c]; else s.col[c] = 1; paintList(); };
  A.acts.s2Soon = () => A.toast('Surdental se suma pronto, con su catálogo, como Rutiden.');
  A.acts.s2Adj = el => {
    const d = +el.getAttribute('data-d'), i = K.adjust(el.getAttribute('data-id'), d); if (!i) return;
    const host = $('#s2List'), top = host ? host.getBoundingClientRect().top : 0; repaint(); void top;
  };
  A.acts.s2Share = async () => {
    const L = K.list().sort(cmp.urg), t = 'Stock de ' + (A.CLINIC || 'mi consultorio') + ' · ' + A.fmtDMY(A.today()) + '\n\n' + L.map(i => '- ' + i.name + ': ' + fq(i.qty) + ' ' + (i.unit || '') + (K.status(i) === 'out' ? ' (SIN STOCK)' : K.status(i) === 'low' ? ' (poco)' : '')).join('\n');
    try { if (navigator.share) { await navigator.share({ title: 'Stock de insumos', text: t }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(t); A.toast('Stock copiado: pegalo donde quieras.'); } catch (e) { A.toast(t); }
  };
  /* el costo por unidad, en «Datos» y al registrar lo que llegó */
  const MFp = A.modalFns.stkI;
  if (MFp) A.modalFns.stkI = m => {
    let h = MFp(m); if (typeof h !== 'string') return h; const i = A.stkFind(x => x.id === m.id) || {};
    if (m.mode === 'edit' && h.indexOf('id="seK"') < 0) h = h.replace('<div class="hint bad" id="siMsg">', '<div class="field"><label for="seK">Costo por unidad ($) <span class="opt">opcional</span></label><input id="seK" inputmode="decimal" value="' + (i.cost || '') + '" placeholder="Ej.: 16900"><small class="hint">Con el costo, el stock calcula cuánto vale.</small></div><div class="hint bad" id="siMsg">');
    if (m.mode === 'in' && h.indexOf('id="siK"') < 0) h = h.replace('<div class="hint bad" id="siMsg">', '<div class="field"><label for="siK">Precio pagado por unidad ($) <span class="opt">opcional</span></label><input id="siK" inputmode="decimal" value="' + (i.cost || '') + '"></div><div class="hint bad" id="siMsg">');
    return h;
  };
  const savePrev = A.acts.stkISave;
  A.acts.stkISave = function () {
    const m = S.modal, k = m && ($('#seK') || $('#siK')), id = m && m.id;
    if (k && id && (m.mode === 'edit' || m.mode === 'in')) { const v = A.parseMoney ? A.parseMoney(k.value) : 0, i = A.stkFind(x => x.id === id); if (i) { if (v > 0) i.cost = v; else if (m.mode === 'edit') delete i.cost; } }
    return savePrev.apply(this, arguments);
  };

  /* 1.30.2: la X de una ventanita de stock vuelve al stock, no al menú */
  const SUB = /^(stk(I|New|Pick|CountM|Kit|Levels|MoveM)|rt(Cart|Price|Wa)|pt(Ed|Del|Panel))$/, closePrev2 = A.closeModal;
  const stkHTMLv = A.stkHTML; A.stkHTML = function () { S._stkOn = true; return stkHTMLv.apply(this, arguments); };
  A.closeModal = function () {
    const m = S.modal;
    if (m && m.type === 'stk') S._stkOn = false;
    else if (m && SUB.test(m.type) && S._stkOn && !S._stkInline) { S.modal = { type: 'stk' }; A.renderModal(); return; }
    return closePrev2.apply(this, arguments);
  };

  /* 1.30.4: las ventanas se ajustan al espacio realmente visible (barra del teclado en tablets, DeX): --vvh */
  (function () {
    const vv = window.visualViewport, root = document.documentElement;
    const set = () => { const h = Math.max(Math.round(Math.min(window.innerHeight, vv ? vv.height : window.innerHeight)), Math.min(360, window.innerHeight)); root.style.setProperty('--vvh', h + 'px'); };
    set(); window.addEventListener('resize', set); window.addEventListener('focusout', () => setTimeout(set, 350)); document.addEventListener('visibilitychange', set); setInterval(set, 1500); if (vv) { vv.addEventListener('resize', set); vv.addEventListener('scroll', set); }
    document.addEventListener('focusin', e => { const t = e.target; if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) && t.closest('.modal')) setTimeout(() => { try { t.scrollIntoView({ block: 'nearest' }); } catch (x) { /* nada */ } }, 250); });
  })();

  const css = document.createElement('style');
  css.textContent = '.s2-tabs{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px;background:var(--surface-2);border:1px solid var(--line);border-radius:16px;padding:5px;margin:0 0 12px}' +
    '.s2-tabs button{position:relative;display:flex;align-items:center;justify-content:center;gap:7px;border:0;background:transparent;color:var(--ink-2);border-radius:12px;padding:10px 8px;font:inherit;font-weight:700;font-size:.9rem;cursor:pointer;transition:background .15s,color .15s}' +
    '.s2-tabs button i{font-style:normal;font-size:1.05rem}.s2-tabs button[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink);box-shadow:0 4px 12px rgba(0,0,0,.14)}.s2-tabs em{font-style:normal;background:var(--red);color:#fff;border-radius:999px;font-size:.7rem;min-width:18px;height:18px;display:grid;place-items:center;padding:0 5px}' +
    '.s2-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}.s2-k{display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:14px;padding:10px 12px;cursor:pointer;font:inherit}.s2-k b{font:800 1.5rem var(--display,inherit);line-height:1.1}.s2-k span{font-size:.8rem;color:var(--ink-2)}.s2-k small{font-size:.7rem;color:var(--ink-2)}' +
    '.s2-k.ok b{color:var(--ok)}.s2-k.low b{color:var(--warn)}.s2-k.exp b{color:var(--red)}.s2-k.on{border-color:var(--accent);background:var(--accent-soft)}' +
    '.s2-alert{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--warn);background:color-mix(in srgb,var(--warn) 14%,var(--surface));border-radius:14px;padding:10px 12px;margin-bottom:10px;font-size:.9rem}' +
    '.s2-acts{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:10px;scrollbar-width:none}.s2-acts::-webkit-scrollbar{display:none}.s2-acts button{flex:0 0 auto;display:flex;align-items:center;gap:7px;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:8px 13px;font:inherit;font-size:.86rem;cursor:pointer}.s2-acts button:hover{border-color:var(--accent)}.s2-acts i{font-style:normal}' +
    '.s2-bar{display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap}.s2-search{flex:1 1 200px;display:flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:12px;padding:0 10px;background:var(--surface)}.s2-search input{border:0;background:transparent;flex:1;min-width:0;padding:9px 0;font:inherit;color:var(--ink);outline:none}' +
    '.s2-bar select{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;padding:9px 10px;font:inherit;max-width:100%}.s2-view{display:flex;border:1px solid var(--line);border-radius:12px;overflow:hidden}.s2-view button{border:0;background:var(--surface);color:var(--ink-2);padding:8px 11px;cursor:pointer;font-size:1rem}.s2-view button[aria-pressed="true"]{background:var(--accent-soft);color:var(--accent)}' +
    '.s2-chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:6px;scrollbar-width:none}.s2-chips::-webkit-scrollbar{display:none}.s2-chips button{flex:0 0 auto;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:5px 12px;font:inherit;font-size:.82rem;cursor:pointer}.s2-chips button.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}.s2-chips small{opacity:.7;margin-left:3px}' +
    '.s2-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}.s2-g{margin:10px 0}.s2-gh{display:flex;align-items:baseline;gap:8px;width:100%;text-align:left;border:0;background:none;color:var(--ink);padding:6px 2px;cursor:pointer;font:inherit}.s2-gh b{font:800 .95rem var(--display,inherit)}.s2-gh small{color:var(--ink-2);flex:1;font-size:.76rem}.s2-gh i{font-style:normal;color:var(--ink-2)}' +
    '.s2-it{display:flex;align-items:stretch;gap:8px;border:1px solid var(--line);background:var(--surface);border-radius:14px;overflow:hidden;border-left:4px solid var(--ok)}.s2-it.low{border-left-color:var(--warn)}.s2-it.out{border-left-color:var(--red)}' +
    '.s2-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px;text-align:left;border:0;background:none;color:var(--ink);padding:10px 4px 10px 12px;cursor:pointer;font:inherit}.s2-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.s2-top b{font-size:.95rem;line-height:1.25}.s2-meta{font-size:.74rem;color:var(--ink-2);line-height:1.35}' +
    '.s2-b{font-size:.68rem;font-weight:700;border-radius:999px;padding:2px 8px}.s2-b.out{background:var(--red);color:#fff}.s2-b.low{background:var(--warn);color:#2b2100}.s2-b.exp{background:color-mix(in srgb,var(--red) 16%,transparent);color:var(--red)}.s2-b.rut{background:var(--accent-soft);color:var(--accent)}' +
    '.s2-meter{position:relative;height:6px;border-radius:99px;background:var(--surface-2);overflow:visible}.s2-meter i{display:block;height:100%;border-radius:99px;background:var(--ok)}.s2-it.low .s2-meter i{background:var(--warn)}.s2-it.out .s2-meter i{background:var(--red)}.s2-meter u{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--ink-2);opacity:.5;text-decoration:none}' +
    '.s2-q{flex:none;display:flex;align-items:center;gap:2px;padding:6px 8px 6px 0}.s2-q span{display:flex;flex-direction:column;align-items:center;min-width:44px}.s2-q span b{font:800 1.15rem var(--display,inherit);line-height:1}.s2-q small{font-size:.66rem;color:var(--ink-2);max-width:54px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.s2-q button{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:var(--surface-2);color:var(--accent);font-size:1.2rem;cursor:pointer}.s2-q button:disabled{opacity:.35}.s2-it.dn .s2-main{padding:7px 4px 7px 10px;gap:3px}.s2-it.dn .s2-q button{width:30px;height:30px}.s2-none{padding:20px 6px;color:var(--ink-2)}' +
    '.s2-hub{display:grid;grid-template-columns:repeat(auto-fit,minmax(138px,1fr));gap:8px;margin-bottom:12px}.s2-bc{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:16px;padding:12px;cursor:pointer;font:inherit;transition:transform .12s,border-color .12s}.s2-bc:hover{transform:translateY(-2px);border-color:var(--accent)}' +
    '.s2-bc.on{border-color:var(--accent);background:var(--accent-soft)}.s2-bc.hot{border-color:var(--accent)}.s2-bc.dis{opacity:.6}.s2-bi{font-size:1.4rem;height:34px;display:flex;align-items:center}.s2-bi img{height:34px;width:34px;border-radius:9px;object-fit:cover}.s2-bc b{font-size:.95rem}.s2-bc small{color:var(--ink-2);font-size:.76rem}' +
    '.modal-scrim{height:var(--vvh,100%);bottom:auto}.modal{max-height:calc(var(--vvh,100vh) - 32px)}@media (max-width:640px){.modal{max-height:calc(var(--vvh,100vh) - 16px)}}' +
    '@media (max-width:560px){.s2-kpis{grid-template-columns:repeat(2,1fr)}.s2-tabs button span{font-size:.8rem}.s2-tabs{grid-template-columns:repeat(2,1fr)}}';
  document.body.appendChild(css);
})();
