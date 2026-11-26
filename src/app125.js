/* ===== 1.40: stock con productos concretos: «Agregar producto» (catálogo de Rutiden, cargar hablando o a mano) ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc, $ = q => document.querySelector(q);
  if (!A.stkApi || !A.stkAddItem || !A.rutFind) return;
  const K = A.stkApi, norm = s => (A.norm ? A.norm(s) : String(s || '').toLowerCase());
  const money = n => '$' + Math.round(n).toLocaleString('es-AR');
  const sa = () => S.sa || (S.sa = { tab: 'cat', q: '', qty: {}, text: '', rows: null, added: [], man: { name: '', brand: '', det: '', unit: 'unidades', qty: '1', min: '0', cat: '' } });
  /* nombres del catálogo en MAYÚSCULAS → Título legible (se respetan A2, 3M, 4G…) */
  const nice = x => { x = String(x || ''); const L = x.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, ''), U = L.replace(/[^A-ZÁÉÍÓÚÑ]/g, ''); if (!L.length || U.length / L.length < 0.6) return x; return x.toLowerCase().replace(/[a-záéíóúñ0-9.]+/g, w => /\d/.test(w) ? w.toUpperCase() : (/^(x|de|del|y|con|para|gr|ml|mm|cc|g|mg|kg)$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))); };
  const NUM = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, doce: 12, quince: 15, veinte: 20 };

  /* ¿de qué «tipo» del kit es? (para que las recetas descuenten del producto concreto) */
  const MAP = [[/composit|resina|filtek|brillant|estelite|z350|charisma/, 'composite'], [/adhesiv|bond|single bond|ambar|futurabond/, 'adhesivo'], [/grabador|acido|etch|fosforic/, 'grabador'], [/anestesi|carticain|articain|lidocain|mepivac/, 'anestesia'], [/aguja/, 'agujas'], [/guante/, 'guantes'], [/barbijo|mascarilla/, 'barbijos'], [/babero/, 'baberos'], [/eyector/, 'eyectores'], [/gasa/, 'gasas'], [/algodon|rollito/, 'algodon'], [/microbrush|aplicador/, 'microbrush'], [/matriz|matrices/, 'matrices'], [/cuna/, 'cunas'], [/ionomero|vitremer|fuji/, 'ionomero'], [/amalgama/, 'amalgama'], [/gutapercha|cono/, 'gutapercha'], [/hipoclorito/, 'hipoclorito'], [/clorhexidina/, 'clorhex'], [/sutura|hilo de sutura/, 'suturas'], [/bisturi|hoja de bisturi/, 'bisturi'], [/alginato/, 'alginato'], [/silicona/, 'silicona']];
  const ckOf = text => { const t = norm(text), types = A.stkTypes ? A.stkTypes() : []; for (const m of MAP) if (m[0].test(t) && types.some(x => x.ck === m[1])) return m[1]; return null; };

  /* sumar un producto concreto: si el kit tenía el tipo «en blanco» (sin cantidad), se completa ese; si no, es uno nuevo */
  function addProduct(o) {
    const ck = o.ck || ckOf(o.name + ' ' + (o.cat || '')), qty = Math.max(0, +o.qty || 0), price = +o.price || 0, sup = o.sup || '';
    const dup = o.rut ? A.stkFind(i => i.rut === o.rut) : A.stkFind(i => i.spec && norm(i.name) === norm(o.name));
    let it = dup;
    if (!it) {
      const ty = ck && A.stkTypes ? A.stkTypes().filter(t => t.ck === ck)[0] : null, ph = ck ? A.stkFind(i => i.ck === ck && !i.spec && !i.rut && !(i.qty > 0)) : null;
      if (ph) { Object.assign(ph, { name: o.name, unit: o.unit || ph.unit, rut: o.rut || null, brand: o.brand || '', det: o.det || '', cost: o.cost || 0, supplier: o.rut ? 'rut' : '', spec: true, min: o.min != null ? o.min : (ph.min || 1) }); if (o.cat && !ph.cat) ph.cat = o.cat; A.stkSave(); it = ph; }
      else it = A.stkAddItem({ name: o.name, unit: o.unit || (ty && ty.unit) || 'unidades', uses: ty ? ty.uses : 1, min: o.min != null ? o.min : 1, cat: o.cat || 'Otros', ck, rut: o.rut || null, brand: o.brand || '', det: o.det || '', cost: o.cost || 0, supplier: o.rut ? 'rut' : '', spec: true });
    } else if (!qty && !price) A.toast('Ya lo tenés: ' + it.name);
    if (qty) K.adjust(it.id, qty, o.note || (price ? 'Compra' + (sup ? ' a ' + sup : '') + ' · ' + money(price) + ' c/u' : 'Stock inicial'));
    if (price) { it.cost = price; (it.ph = it.ph || []).push({ d: o.date || A.today(), p: price, q: qty, s: sup }); if (it.ph.length > 30) it.ph.shift(); A.stkSave(); }
    return it;
  }
  A.stkAddProduct = addProduct;

  /* ---------- ventana ---------- */
  A.acts.saOpen = () => { const s = sa(); s.rows = null; S.modal = { type: 'saAdd' }; A.renderModal(); if (A.rutLoad && !A.rutReady()) A.rutLoad(); };
  const back = () => { S.modal = { type: 'stk' }; if (S.stk) S.stk.tab = 'lista'; A.renderModal(); };
  A.acts.saDone = () => back();
  A.acts.saTab = el => { sa().tab = el.getAttribute('data-t'); paint(); };
  const paint = () => { const h = $('#saHost'); if (h) h.innerHTML = body(); else A.renderModal(); };
  const tabs = () => '<div class="seg sa-tabs" role="tablist">' + [['cat', '🔎 Buscar en el catálogo'], ['voz', '🎙 Cargar hablando'], ['man', '✎ A mano']].map(t => '<button type="button" role="tab" data-act="saTab" data-t="' + t[0] + '" aria-pressed="' + (sa().tab === t[0]) + '">' + t[1] + '</button>').join('') + '</div>';
  const addedBar = () => { const n = sa().added.length; return n ? '<div class="sa-added"><b>✔ ' + n + ' agregado' + (n === 1 ? '' : 's') + ':</b> ' + sa().added.slice(-4).map(x => esc(x)).join(' · ') + (n > 4 ? ' …' : '') + '</div>' : ''; };
  const qtyBox = code => { const q = sa().qty[code] || 1; return '<span class="sa-q"><button type="button" data-act="saQty" data-code="' + esc(code) + '" data-d="-1" aria-label="Menos">−</button><b>' + q + '</b><button type="button" data-act="saQty" data-code="' + esc(code) + '" data-d="1" aria-label="Más">+</button></span>'; };
  const resRow = (r, extra) => '<li class="sa-r"><div class="sa-n"><b>' + esc(nice(r.name)) + '</b><small>' + esc([r.brand, r.cat ? r.cat : '', 'cód. ' + r.code].filter(Boolean).join(' · ')) + '</small></div>' + (extra || qtyBox(r.code) + '<button type="button" class="btn small primary" data-act="saAdd" data-code="' + esc(r.code) + '">Agregar</button>') + '</li>';

  function catHTML() {
    const s = sa(); let h = '<label class="sa-s"><span aria-hidden="true">🔍</span><input id="saQ" type="search" autocomplete="off" placeholder="Ej.: composite 3M A2 · anestesia carticaína · baberos" value="' + esc(s.q) + '" data-in="saQ" aria-label="Buscar producto"></label>';
    h += '<p class="hint sa-hint">Escribí marca, tipo y tono, como se lo dirías al proveedor: «composite voco b2», «agujas cortas»… Cada producto queda con su código, así el pedido sale exacto.</p>';
    if (!A.rutReady()) return h + '<div class="empty">Cargando el catálogo de Rutiden…</div>';
    const q = s.q.trim(); if (q.length < 2) return h + '<div class="empty">Empezá a escribir para ver las variedades.</div>';
    const L = A.rutFind(q, 40); if (!L.length) return h + '<div class="empty">No encontré «' + esc(q) + '». Probá con menos palabras, o cargalo <button class="linkbtn" data-act="saTab" data-t="man">a mano</button>.</div>';
    return h + '<ul class="sa-list" id="saList">' + L.map(r => resRow(r)).join('') + '</ul>';
  }
  /* «dos composite 3M A2, una jeringa de composite voco b2, baberos» → filas con opciones para confirmar */
  function parse(text) {
    const parts = String(text || '').split(/[\n;,]+|\sy\s(?=(?:\d+|una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce)\b)/i).map(x => (x || '').trim()).filter(Boolean);
    return parts.map(p => { let price = 0; const pm = /\s(?:(?:a|por)\s+\$?|\$)\s*(\d[\d.,]*)\s*(?:c\/u|cada\s+una?|la\s+unidad|pesos|mil)?\s*$/i.exec(p); if (pm) { price = A.parseMoney ? A.parseMoney(pm[1]) : +String(pm[1]).replace(/\./g, '').replace(',', '.'); if (/mil\s*$/i.test(pm[0]) && price < 1000) price *= 1000; if (price >= 50) p = p.slice(0, pm.index).trim(); else price = 0; } const m = /^(\d+|[a-záéíóú]+)\b\s*(.*)$/i.exec(p); let qty = 1, rest = p; if (m && (/^\d+$/.test(m[1]) || NUM[norm(m[1])])) { qty = /^\d+$/.test(m[1]) ? +m[1] : NUM[norm(m[1])]; rest = m[2] || ''; } return { text: p, price, q: rest || p, qty, res: A.rutFind ? (A.rutFind(rest || p, 4) || []) : [], done: false }; });
  }
  function vozHTML() {
    const s = sa(); let h = '<p class="hint sa-hint">Decí o escribí lo que tenés, separado por comas: <i>«2 composite 3M A2, una jeringa de composite Voco B2, baberos Descartables…»</i>. Después confirmás cada uno.</p>' +
      '<div class="sa-voz"><textarea id="saT" rows="3" placeholder="Tengo dos jeringas de composite 3M A2, una de Voco B2…" data-in="saT" aria-label="Lo que tengo en stock">' + esc(s.text) + '</textarea><div class="sa-vb"><button type="button" class="btn" data-act="saMic" id="saMic">🎙 Hablar</button><button type="button" class="btn primary" data-act="saGo">Entender</button></div></div>';
    if (!A.rutReady()) h += '<div class="empty">Cargando el catálogo de Rutiden…</div>';
    if (s.rows) h += s.rows.length ? '<ul class="sa-list">' + s.rows.map((r, i) => '<li class="sa-row' + (r.done ? ' done' : '') + '"><div class="sa-say"><b>' + r.qty + ' ×</b> ' + esc(r.q) + (r.done ? ' <span class="sa-ok">✔ ' + esc(r.done) + '</span>' : '') + '</div>' + (r.done ? '' : '<div class="sa-opts">' + (r.res.length ? r.res.map(x => '<button type="button" class="sa-opt" data-act="saPick" data-i="' + i + '" data-code="' + esc(x.code) + '"><b>' + esc(nice(x.name)) + '</b><small>' + esc(x.brand || x.cat) + '</small></button>').join('') : '<span class="hint">No encontré ese producto en el catálogo.</span>') + '<button type="button" class="sa-opt sa-own" data-act="saOwn" data-i="' + i + '">Cargarlo tal cual: «' + esc(r.q.slice(0, 40)) + '»</button></div>') + '</li>').join('') + '</ul>' : '<div class="empty">No entendí nada. Probá de nuevo.</div>';
    return h;
  }
  function manHTML() {
    const m = sa().man, f = (id, l, v, ph, ex) => '<div class="field"><label for="sm_' + id + '">' + l + '</label><input id="sm_' + id + '" data-chg="saMan" data-k="' + id + '" value="' + esc(v) + '" placeholder="' + (ph || '') + '"' + (ex || '') + '></div>';
    return '<p class="hint sa-hint">Para lo que no está en el catálogo: poné el nombre completo y los detalles que le pedirías al proveedor.</p>' + f('name', 'Producto', m.name, 'Ej.: Composite Filtek Z350 XT') + '<div class="row2">' + f('brand', 'Marca', m.brand, '3M, Voco, Ultradent…') + f('det', 'Tono / presentación', m.det, 'A2 · jeringa 4 g') + '</div><div class="row3">' + f('unit', 'Unidad', m.unit, 'jeringas, cajas…') + f('qty', 'Cuánto tengo', m.qty, '', ' inputmode="decimal"') + f('min', 'Avisar cuando queden', m.min, '', ' inputmode="decimal"') + '</div>' + f('cat', 'Categoría', m.cat, 'Restauración, Anestesia…') + '<div class="hint bad" id="saMsg"></div><div class="row-btns"><button class="btn primary" data-act="saManGo">Agregar a mi stock</button></div>';
  }
  const body = () => tabs() + addedBar() + (sa().tab === 'voz' ? vozHTML() : sa().tab === 'man' ? manHTML() : catHTML());
  MF.saAdd = () => A.modalShell('Agregar a mi stock', '<div id="saHost">' + body() + '</div>', '<button class="btn primary" data-act="saDone">Listo, volver al stock</button>', true);

  /* ---------- acciones ---------- */
  A.ins.saQ = el => { sa().q = el.value; const l = $('#saList'), h = $('#saHost'); if (!h) return; const p = el.selectionStart; paintKeep(el); };
  function paintKeep(el) { const pos = el.selectionStart, id = el.id; paint(); const n = document.getElementById(id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* nada */ } } }
  A.ins.saT = el => { sa().text = el.value; };
  A.acts.saQty = el => { const s = sa(), c = el.getAttribute('data-code'); s.qty[c] = Math.max(1, (s.qty[c] || 1) + (+el.getAttribute('data-d'))); const q = document.getElementById('saQ'); if (q) paintKeep(q); else paint(); };
  A.acts.saAdd = el => {
    const s = sa(), code = el.getAttribute('data-code'), p = A.rutProd(code); if (!p) return;
    const it = addProduct({ name: nice(p.name), rut: code, cat: p.cat, brand: p.brand, cost: p.cost, qty: s.qty[code] || 1 });
    s.added.push((s.qty[code] || 1) + '× ' + nice(p.name)); delete s.qty[code]; A.toast('Sumado a tu stock: ' + it.name); const q = document.getElementById('saQ'); if (q) paintKeep(q); else paint();
  };
  A.acts.saGo = () => { const s = sa(); s.text = ($('#saT') || {}).value || s.text; s.rows = parse(s.text); paint(); };
  A.acts.saPick = el => { const r = sa().rows[+el.getAttribute('data-i')], code = el.getAttribute('data-code'), p = A.rutProd(code); if (!r || !p) return; addProduct({ name: nice(p.name), rut: code, cat: p.cat, brand: p.brand, cost: p.cost, qty: r.qty }); r.done = r.qty + '× ' + nice(p.name); sa().added.push(r.done); paint(); };
  A.acts.saOwn = el => { const r = sa().rows[+el.getAttribute('data-i')]; if (!r) return; const nm = r.q.replace(/^\w/, c => c.toUpperCase()); addProduct({ name: nm, qty: r.qty }); r.done = r.qty + '× ' + nm; sa().added.push(r.done); paint(); };
  A.chg.saMan = el => { sa().man[el.getAttribute('data-k')] = el.value; };
  A.acts.saManGo = () => {
    const m = sa().man; ['name', 'brand', 'det', 'unit', 'qty', 'min', 'cat'].forEach(k => { const e = $('#sm_' + k); if (e) m[k] = e.value; });
    if (!m.name.trim()) { const e = $('#saMsg'); if (e) e.textContent = 'Poné el nombre del producto.'; return; }
    const full = [m.name.trim(), m.brand.trim(), m.det.trim()].filter(Boolean).join(' · ');
    addProduct({ name: full, brand: m.brand.trim(), det: m.det.trim(), unit: m.unit.trim() || 'unidades', qty: A.parseMoney ? A.parseMoney(m.qty) : +m.qty, min: Math.max(0, +String(m.min).replace(',', '.') || 0), cat: m.cat.trim() || 'Otros' });
    sa().added.push(full); S.sa.man = { name: '', brand: '', det: '', unit: m.unit, qty: '1', min: '0', cat: m.cat }; A.toast('Sumado a tu stock.'); paint();
  };
  /* micrófono: reconocimiento de voz del navegador (si no hay, sirve el micrófono del teclado) */
  let rec = null;
  A.acts.saMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) { A.toast('Tocá el micrófono de tu teclado para dictar.'); const t = $('#saT'); if (t) t.focus(); return; }
    if (rec) { try { rec.stop(); } catch (e) { /* nada */ } return; }
    rec = new SR(); rec.lang = 'es-AR'; rec.interimResults = false; rec.continuous = true; const b = $('#saMic'); if (b) b.textContent = '⏹ Listo';
    rec.onresult = e => { let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript + ', '; if (t) { const ta = $('#saT'); sa().text = (sa().text ? sa().text.replace(/[,\s]*$/, ', ') : '') + t.replace(/[,\s]+$/, ''); if (ta) ta.value = sa().text; } };
    rec.onend = () => { rec = null; const m = $('#saMic'); if (m) m.textContent = '🎙 Hablar'; };
    try { rec.start(); } catch (e) { rec = null; }
  };

  /* =====================================================================
     CARGAR UNA COMPRA: lo que llegó, con lo que costó cada cosa (y se compara con la vez anterior)
     ===================================================================== */
  const sb = () => S.sb || (S.sb = { sup: 'Rutiden', date: A.today(), text: '', lines: [] });
  const cfgS = () => { const sc = A.EMP.stock || (A.EMP.stock = {}), cf = sc._cfg || (sc._cfg = {}); return cf; };
  const compras = () => cfgS().compras || (cfgS().compras = []);
  const lastPrice = ln => { const it = ln.pick ? A.stkFind(i => i.rut === ln.pick) : A.stkFind(i => i.spec && norm(i.name) === norm(ln.own || '')); const ph = it && it.ph && it.ph.length ? it.ph[it.ph.length - 1] : null; return ph; };
  const lineName = ln => { if (ln.pick) { const p = A.rutProd(ln.pick); return p ? nice(p.name) : ln.q; } return (ln.own || ln.q || '').replace(/^\w/, c => c.toUpperCase()); };
  const newLines = text => parse(text).map(r => ({ id: A.uid(), q: r.q, qty: r.qty, price: r.price || 0, cands: r.res, pick: r.res[0] ? r.res[0].code : null, own: r.res[0] ? null : r.q }));
  A.acts.sbOpen = () => { sb(); S.modal = { type: 'saBuy' }; A.renderModal(); if (A.rutLoad && !A.rutReady()) A.rutLoad(); };
  const pb = () => { const h = $('#sbHost'); if (h) h.innerHTML = buyBody(); else A.renderModal(); };
  function lineHTML(ln, i) {
    const lp = lastPrice(ln), cur = +ln.price || 0, d = lp && cur ? Math.round((cur - lp.p) / lp.p * 100) : null;
    const sel = ln.cands.length > 1 || (ln.cands.length && !ln.pick) ? '<select data-chg="sbPick" data-i="' + i + '" aria-label="Producto">' + ln.cands.map(c => '<option value="' + esc(c.code) + '"' + (ln.pick === c.code ? ' selected' : '') + '>' + esc(nice(c.name)) + '</option>').join('') + '<option value=""' + (!ln.pick ? ' selected' : '') + '>Otro: «' + esc(ln.q.slice(0, 30)) + '»</option></select>' : '';
    return '<li class="sb-l"><div class="sb-n"><b>' + esc(lineName(ln)) + '</b>' + sel + (lp ? '<small>Última vez: ' + money(lp.p) + ' (' + (A.fmtDMY ? A.fmtDMY(lp.d) : lp.d) + ')' + (d != null ? ' · <span class="' + (d > 0 ? 'up' : d < 0 ? 'dn' : '') + '">' + (d > 0 ? '▲ +' + d + '%' : d < 0 ? '▼ ' + d + '%' : '= igual') + '</span>' : '') + '</small>' : '') + '</div>' +
      '<label class="sb-f"><small>Cant.</small><input inputmode="decimal" value="' + esc(ln.qty) + '" data-chg="sbQty" data-i="' + i + '"></label><label class="sb-f"><small>Precio c/u</small><input inputmode="decimal" value="' + (ln.price ? esc(String(ln.price)) : '') + '" placeholder="$" data-chg="sbPrice" data-i="' + i + '"></label><b class="sb-t">' + (ln.price ? money(ln.price * ln.qty) : '') + '</b><button type="button" class="sb-x" data-act="sbDel" data-i="' + i + '" aria-label="Quitar">✕</button></li>';
  }
  function buyBody() {
    const b = sb(), tot = b.lines.reduce((t, l) => t + (+l.price || 0) * (+l.qty || 0), 0), prev = compras().slice(0, 4);
    let h = '<div class="row2"><div class="field"><label for="sbSup">Proveedor</label><input id="sbSup" list="sbSupL" data-chg="sbHead" data-k="sup" value="' + esc(b.sup) + '"><datalist id="sbSupL"><option value="Rutiden"><option value="Surdental"></datalist></div><div class="field"><label for="sbDate">Fecha</label><input id="sbDate" type="date" data-chg="sbHead" data-k="date" value="' + esc(b.date) + '"></div></div>' +
      '<p class="hint sa-hint">Escribí o dictá lo que llegó, con el precio de cada uno: <i>«5 composite 3M A3 a 18500, 2 composite 3M A1 a 18500, una caja de guantes a 9000»</i>. Podés ir sumando de a poco.</p>' +
      '<div class="sa-voz"><textarea id="sbT" rows="3" data-in="sbT" placeholder="5 composite 3M A3 a 18500…" aria-label="Lo que llegó">' + esc(b.text) + '</textarea><div class="sa-vb"><button type="button" class="btn" data-act="sbMic" id="sbMic">🎙 Hablar</button><button type="button" class="btn primary" data-act="sbAddT">Agregar a la compra</button></div></div>';
    if (!A.rutReady()) h += '<div class="empty">Cargando el catálogo de Rutiden…</div>';
    if (prev.length && !b.lines.length) h += '<div class="sb-prev"><b>Repetir una compra anterior</b>' + prev.map((c, i) => '<button type="button" data-act="sbRepeat" data-i="' + i + '"><span>' + (A.fmtDMY ? A.fmtDMY(c.d) : c.d) + ' · ' + esc(c.sup || '') + '</span><small>' + c.lines.length + ' productos · ' + money(c.total) + '</small></button>').join('') + '</div>';
    if (b.lines.length) h += '<ul class="sb-list">' + b.lines.map(lineHTML).join('') + '</ul><div class="sb-total"><span>' + b.lines.length + ' producto' + (b.lines.length === 1 ? '' : 's') + '</span><b>Total ' + money(tot) + '</b></div><div class="hint bad" id="sbMsg"></div>';
    return h;
  }
  MF.saBuy = () => { const b = sb(); return A.modalShell('Cargar una compra', '<div id="sbHost">' + buyBody() + '</div>', '<button class="btn" data-act="saDone">Volver al stock</button><button class="btn primary" data-act="sbGo"' + (b.lines.length ? '' : ' disabled') + '>Cargar al stock</button>', true); };
  A.ins.sbT = el => { sb().text = el.value; };
  A.chg.sbHead = el => { sb()[el.getAttribute('data-k')] = el.value; };
  A.acts.sbAddT = () => { const b = sb(); b.text = ($('#sbT') || {}).value || b.text; const L = newLines(b.text); if (!L.length) return; b.lines = b.lines.concat(L); b.text = ''; A.renderModal(); };
  A.chg.sbPick = el => { const ln = sb().lines[+el.getAttribute('data-i')]; if (!ln) return; ln.pick = el.value || null; ln.own = ln.pick ? null : ln.q; pb(); };
  A.chg.sbQty = el => { const ln = sb().lines[+el.getAttribute('data-i')]; if (ln) ln.qty = Math.max(0, A.parseMoney ? A.parseMoney(el.value) : +String(el.value).replace(',', '.')) || 0; pb(); };
  A.chg.sbPrice = el => { const ln = sb().lines[+el.getAttribute('data-i')]; if (ln) ln.price = A.parseMoney ? A.parseMoney(el.value) : +String(el.value).replace(/\./g, '').replace(',', '.') || 0; pb(); };
  A.acts.sbDel = el => { sb().lines.splice(+el.getAttribute('data-i'), 1); A.renderModal(); };
  A.acts.sbRepeat = el => { const c = compras()[+el.getAttribute('data-i')]; if (!c) return; const b = sb(); b.sup = c.sup || b.sup; b.lines = c.lines.map(l => ({ id: A.uid(), q: l.name, qty: l.qty, price: l.p, cands: l.rut ? [{ code: l.rut, name: l.name, cat: '', brand: '' }] : [], pick: l.rut || null, own: l.rut ? null : l.name })); A.renderModal(); };
  A.acts.sbGo = () => {
    const b = sb(), ok = b.lines.filter(l => +l.qty > 0); if (!ok.length) { const m = $('#sbMsg'); if (m) m.textContent = 'Poné la cantidad de cada producto.'; return; }
    const rec = []; let tot = 0;
    ok.forEach(l => { const p = l.pick ? A.rutProd(l.pick) : null, name = p ? nice(p.name) : lineName(l); addProduct({ name, rut: l.pick || null, cat: p ? p.cat : '', brand: p ? p.brand : '', qty: +l.qty, price: +l.price || 0, sup: b.sup, date: b.date, cost: +l.price || (p ? p.cost : 0) }); rec.push({ name, rut: l.pick || null, qty: +l.qty, p: +l.price || 0 }); tot += (+l.price || 0) * (+l.qty); });
    compras().unshift({ id: A.uid(), d: b.date, sup: b.sup, total: tot, lines: rec }); if (compras().length > 40) compras().length = 40; A.stkSave();
    A.toast('Compra cargada: ' + rec.length + ' producto' + (rec.length === 1 ? '' : 's') + (tot ? ' · ' + money(tot) : '') + '.'); S.sb = null; back();
  };
  let rec2 = null;
  A.acts.sbMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) { A.toast('Tocá el micrófono de tu teclado para dictar.'); const t = $('#sbT'); if (t) t.focus(); return; }
    if (rec2) { try { rec2.stop(); } catch (e) { /* nada */ } return; }
    rec2 = new SR(); rec2.lang = 'es-AR'; rec2.continuous = true; const m = $('#sbMic'); if (m) m.textContent = '⏹ Listo';
    rec2.onresult = e => { let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript + ', '; if (t) { const ta = $('#sbT'); sb().text = (sb().text ? sb().text.replace(/[,\s]*$/, ', ') : '') + t.replace(/[,\s]+$/, ''); if (ta) ta.value = sb().text; } };
    rec2.onend = () => { rec2 = null; const x = $('#sbMic'); if (x) x.textContent = '🎙 Hablar'; };
    try { rec2.start(); } catch (e) { rec2 = null; }
  };

  /* el botón del «Mi stock» ahora es «Agregar producto» */
  const stkHTMLp = A.stkHTML;
  A.stkHTML = function () { const h = stkHTMLp.apply(this, arguments); return h.replace('<button data-act="stkNew"><i>＋</i><b>Insumo nuevo</b></button>', '<button data-act="saOpen" class="sa-main"><i>＋</i><b>Agregar producto</b></button><button data-act="sbOpen" class="sa-main"><i>🧾</i><b>Cargar una compra</b></button>'); };
  /* cuando el catálogo termina de bajar, se repinta la ventana */
  const rl = A.rutLoad; if (rl) A.rutLoad = function () { const r = rl.apply(this, arguments); setTimeout(() => { if (S.modal && S.modal.type === 'saAdd') paint(); }, 1500); return r; };

  /* las filas de botones y categorías del stock: en pantallas anchas se acomodan en varias líneas; si no entran, se arrastran con el mouse o con la rueda */
  const dragRows = '.s2-acts, .s2-chips';
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return; const row = e.target.closest && e.target.closest(dragRows); if (!row || row.scrollWidth <= row.clientWidth + 2) return;
    const x0 = e.clientX, l0 = row.scrollLeft; let moved = false;
    const mv = ev => { const dx = ev.clientX - x0; if (!moved && Math.abs(dx) < 5) return; moved = true; row.scrollLeft = l0 - dx; row.classList.add('dragging'); };
    const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); row.classList.remove('dragging'); if (moved) { const stop = ev => { ev.stopPropagation(); ev.preventDefault(); }; row.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => row.removeEventListener('click', stop, true), 80); } };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
  });
  document.addEventListener('wheel', e => { const row = e.target.closest && e.target.closest(dragRows); if (row && row.scrollWidth > row.clientWidth + 2 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { row.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });

  const css = document.createElement('style');
  css.textContent = '.sa-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}.sa-tabs button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;padding:9px 6px;font:inherit;font-size:.82rem;font-weight:700;cursor:pointer}.sa-tabs button[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}' +
    '.sa-added{background:var(--accent-soft);border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));border-radius:12px;padding:8px 12px;margin-bottom:10px;font-size:.84rem}.sa-s{display:flex;align-items:center;gap:6px;border:1.5px solid var(--line);border-radius:12px;padding:0 10px;background:var(--surface)}.sa-s:focus-within{border-color:var(--accent)}.sa-s input{flex:1;border:0;background:transparent;color:var(--ink);font:inherit;padding:11px 0;outline:none;min-width:0}.sa-hint{margin:8px 2px}' +
    '.sa-list{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px;max-height:48vh;overflow:auto}.sa-r{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:12px;padding:8px 10px;background:var(--surface)}.sa-n{flex:1;min-width:0;display:flex;flex-direction:column}.sa-n b{font-size:.9rem;line-height:1.25}.sa-n small{color:var(--ink-2);font-size:.72rem}' +
    '.sa-q{display:inline-flex;align-items:center;gap:4px}.sa-q button{width:28px;height:28px;border-radius:50%;border:1px solid var(--line);background:var(--surface-2);color:var(--accent);font-size:1rem;cursor:pointer;padding:0}.sa-q b{min-width:20px;text-align:center}' +
    '.sa-voz textarea{width:100%;box-sizing:border-box;border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;font:inherit;background:var(--surface);color:var(--ink);resize:vertical}.sa-vb{display:flex;gap:8px;margin:8px 0}' +
    '.sa-row{border:1px solid var(--line);border-radius:12px;padding:9px 10px;background:var(--surface)}.sa-row.done{border-color:var(--ok);background:color-mix(in srgb,var(--ok) 8%,var(--surface))}.sa-say{margin-bottom:6px;font-size:.92rem}.sa-ok{color:var(--ok);font-weight:700;font-size:.82rem}.sa-opts{display:flex;flex-wrap:wrap;gap:6px}' +
    '.sa-opt{display:flex;flex-direction:column;text-align:left;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);border-radius:10px;padding:6px 10px;font:inherit;cursor:pointer;max-width:100%}.sa-opt b{font-size:.82rem}.sa-opt small{color:var(--ink-2);font-size:.7rem}.sa-opt:hover{border-color:var(--accent)}.sa-own{border-style:dashed;justify-content:center;font-size:.8rem;color:var(--ink-2)}' +
    '.s2-acts .sa-main{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}@media (min-width:700px){.s2-acts,.s2-chips{flex-wrap:wrap;overflow:visible}}.s2-acts.dragging,.s2-chips.dragging{cursor:grabbing;user-select:none}.s2-acts,.s2-chips{cursor:grab}.s2-acts button,.s2-chips button{cursor:pointer}' +
    '.sb-list{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}.sb-l{display:grid;grid-template-columns:1fr 64px 96px auto 24px;gap:8px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:8px 10px;background:var(--surface)}.sb-n{min-width:0;display:flex;flex-direction:column;gap:3px}.sb-n b{font-size:.9rem;line-height:1.25}.sb-n small{font-size:.74rem;color:var(--ink-2)}.sb-n small .up{color:var(--red);font-weight:700}.sb-n small .dn{color:var(--ok);font-weight:700}.sb-n select{border:1px solid var(--line);background:var(--surface-2);color:var(--ink);border-radius:8px;padding:4px 6px;font:inherit;font-size:.76rem;max-width:100%}' +
    '.sb-f{display:flex;flex-direction:column;gap:1px}.sb-f small{font-size:.66rem;color:var(--ink-2)}.sb-f input{width:100%;box-sizing:border-box;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:8px;padding:6px;font:inherit;text-align:right}.sb-t{font-size:.86rem;min-width:70px;text-align:right}.sb-x{border:0;background:none;color:var(--ink-2);cursor:pointer;font-size:1rem}' +
    '.sb-total{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:10px 12px;border-radius:12px;background:var(--accent-soft);font-size:1rem}.sb-prev{margin-top:10px;display:grid;gap:6px}.sb-prev button{display:flex;justify-content:space-between;gap:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;padding:9px 12px;font:inherit;cursor:pointer;text-align:left}.sb-prev small{color:var(--ink-2)}' +
    '@media (max-width:620px){.sb-l{grid-template-columns:1fr 1fr}.sb-n{grid-column:1/-1}.sb-t{grid-column:1;text-align:left}.sb-x{justify-self:end}}';
  document.body.appendChild(css);
})();
