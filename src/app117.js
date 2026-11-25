/* ===== 1.32: solapa Ortodoncia en la ficha: tratamiento, controles con fotos (quedan también en Fotos y en la evolución) y comparación antes y ahora ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, $ = q => document.querySelector(q);
  if (!A.render || !A.imgAdd) return;
  const TYPES = ['Brackets metálicos', 'Brackets estéticos', 'Brackets autoligados', 'Alineadores transparentes', 'Aparato removible / ortopedia', 'Otro'];
  const VIEWS = ['Frente', 'Sonrisa', 'Perfil', 'Intraoral frente', 'Intraoral derecha', 'Intraoral izquierda', 'Oclusal superior', 'Oclusal inferior', 'Otra'];
  const ARCS = ['.012 NiTi', '.014 NiTi', '.016 NiTi', '.018 NiTi', '.016 x .022 NiTi', '.017 x .025 NiTi', '.019 x .025 NiTi', '.016 acero', '.018 acero', '.019 x .025 acero', 'Sin arco'];
  const CHIPS = ['Cambio de arco', 'Cambio de ligaduras', 'Elásticos', 'Recementado de bracket', 'Stripping', 'Activación de resortes', 'Higiene reforzada', 'Retiro de aparatología'];
  const ELAS = ['Clase II 1/4"', 'Clase III 1/4"', 'Verticales 3/16"', 'Cruzados', 'Sin elásticos'];
  const dmy = d => (A.fmtDMY ? A.fmtDMY(d) : d);
  const pid0 = () => S.fichaPid;
  const O = pid => A.pd(pid).orto;
  const drafts = {};
  const draft = pid => drafts[pid] || (drafts[pid] = { id: A.uid(), date: A.today(), arcU: '', arcL: '', elas: '', notes: '', next: 5, chips: [], view: 'Frente' });
  const months = o => Math.max(0, Math.floor((Date.parse(A.today()) - Date.parse(o.start)) / 86400000 / 30.4));
  const imgs = (pd, ctrl) => (pd.images || []).filter(i => i.kind === 'orto' && i.ctrl === ctrl).sort((a, b) => (a.view || '').localeCompare(b.view || ''));
  const toJpg = (file, max, q) => new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { const r = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * r); c.height = Math.round(im.height * r); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', q)); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); }; im.src = u; });
  if (A.IMG_KINDS) A.IMG_KINDS.orto = 'Ortodoncia · control';

  const thumbs = (pd, list, del) => list.map(i => '<span class="ox-th"><button type="button" data-act="imOpen" data-id="' + esc(i.id) + '" title="' + esc(i.view || 'Foto') + '"><img src="' + esc(i.thumb) + '" alt="' + esc(i.view || 'Foto') + '"><em>' + esc(i.view || '') + '</em></button>' + (del ? '<button type="button" class="ox-x" data-act="oxPhDel" data-id="' + esc(i.id) + '" aria-label="Quitar foto">×</button>' : '') + '</span>').join('');
  const opts = (L, v) => L.map(x => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('');

  function startHTML() {
    return '<section class="card ox-card"><h2>Ortodoncia</h2><p class="hint">Armá el tratamiento de ortodoncia de este paciente: en cada control cargás las fotos del día y lo que hiciste. Las fotos quedan también en «Fotos y radiografías» y se anota solo en la evolución clínica.</p>' +
      '<div class="row3"><div class="field"><label for="oxT">Aparatología</label><select id="oxT">' + opts(TYPES, TYPES[0]) + '</select></div><div class="field"><label for="oxS">Inicio</label><input id="oxS" type="date" value="' + A.today() + '"></div><div class="field"><label for="oxM">Duración estimada (meses)</label><input id="oxM" inputmode="numeric" value="24"></div></div>' +
      '<div class="field"><label for="oxG">Objetivo / diagnóstico <span class="opt">opcional</span></label><input id="oxG" placeholder="Ej.: Clase II, apiñamiento inferior, mordida profunda"></div><div class="row-btns"><button class="btn primary" data-act="oxStart">Empezar tratamiento</button></div></section>';
  }
  function headHTML(pid, o) {
    const m = months(o), pct = Math.max(2, Math.min(100, Math.round(m / Math.max(1, o.months || 24) * 100))), n = (o.ctrls || []).length, last = (o.ctrls || [])[0];
    const nx = last && last.next ? A.add(last.date, 7 * last.next) : null;
    return '<section class="card ox-card"><div class="ox-top"><div><h2>Ortodoncia <span class="count">' + esc(o.status === 'fin' ? 'finalizado' : o.status === 'ret' ? 'en retención' : 'en tratamiento') + '</span></h2><div class="sub">' + esc(o.type || '') + ' · inicio ' + dmy(o.start) + (o.goal ? ' · ' + esc(o.goal) : '') + '</div></div>' +
      '<div class="ox-st"><select data-chg="oxStat" aria-label="Estado"><option value="act"' + (!o.status || o.status === 'act' ? ' selected' : '') + '>En tratamiento</option><option value="ret"' + (o.status === 'ret' ? ' selected' : '') + '>En retención</option><option value="fin"' + (o.status === 'fin' ? ' selected' : '') + '>Finalizado</option></select></div></div>' +
      '<div class="ox-prog" role="img" aria-label="Mes ' + m + ' de ' + (o.months || 24) + '"><i style="width:' + pct + '%"></i></div><div class="ox-kpis"><span><b>' + n + '</b> controles</span><span>Mes <b>' + m + '</b> de ' + (o.months || 24) + '</span>' + (nx ? '<span>Próximo control ≈ <b>' + dmy(nx) + '</b></span>' : '') + '</span></div></section>';
  }
  function formHTML(pid) {
    const pd = A.pd(pid), d = draft(pid), n = ((O(pid).ctrls || []).length) + 1, ph = imgs(pd, d.id);
    return '<section class="card ox-card" id="oxForm"><h2>' + (d.editing ? 'Completar el control del ' + dmy(d.date) : 'Control N° ' + n) + '</h2>' +
      '<div class="field"><label>¿Qué hiciste hoy?</label><div class="ox-chips">' + CHIPS.map(c => '<button type="button" class="' + (d.chips.indexOf(c) >= 0 ? 'on' : '') + '" data-act="oxChip" data-c="' + esc(c) + '" aria-pressed="' + (d.chips.indexOf(c) >= 0) + '">' + esc(c) + '</button>').join('') + '</div></div>' +
      '<div class="row3"><div class="field"><label for="oxU">Arco superior</label><input id="oxU" list="oxArcs" data-chg="oxFld" data-k="arcU" value="' + esc(d.arcU) + '" placeholder=".016 NiTi"></div><div class="field"><label for="oxL">Arco inferior</label><input id="oxL" list="oxArcs" data-chg="oxFld" data-k="arcL" value="' + esc(d.arcL) + '" placeholder=".016 NiTi"></div><div class="field"><label for="oxE">Elásticos</label><input id="oxE" list="oxEl" data-chg="oxFld" data-k="elas" value="' + esc(d.elas) + '" placeholder="Clase II 1/4&quot;"></div></div>' +
      '<datalist id="oxArcs">' + ARCS.map(x => '<option value="' + esc(x) + '">').join('') + '</datalist><datalist id="oxEl">' + ELAS.map(x => '<option value="' + esc(x) + '">').join('') + '</datalist>' +
      '<div class="field"><label for="oxN">Observaciones</label><textarea id="oxN" data-chg="oxFld" data-k="notes" placeholder="Ej.: buena higiene, se activó el resorte del 13, indico elásticos 24 h">' + esc(d.notes) + '</textarea></div>' +
      '<div class="field"><label>Fotos de hoy <span class="count">' + ph.length + '</span></label><div class="ox-ph"><select id="oxV" data-chg="oxFld" data-k="view" aria-label="Qué foto es">' + opts(VIEWS, d.view) + '</select><label class="btn ox-up">📷 Agregar fotos<input type="file" accept="image/*" multiple hidden data-chg="oxPhoto"></label></div><div class="ox-ths">' + (ph.length ? thumbs(pd, ph, true) : '<span class="hint">Elegí qué foto es y tocá «Agregar fotos». Podés sacar varias seguidas.</span>') + '</div><div class="hint" id="oxMsg"></div></div>' +
      '<div class="row2"><div class="field"><label for="oxX">Próximo control en</label><select id="oxX" data-chg="oxFld" data-k="next">' + [3, 4, 5, 6, 8, 10, 12].map(w => '<option value="' + w + '"' + (+d.next === w ? ' selected' : '') + '>' + w + ' semanas</option>').join('') + '</select></div><div class="field"><label for="oxD">Fecha del control</label><input id="oxD" type="date" data-chg="oxFld" data-k="date" value="' + esc(d.date) + '"></div></div>' +
      '<div class="row-btns"><button class="btn primary" data-act="oxSave">' + (d.editing ? 'Guardar cambios' : 'Guardar control') + '</button><button class="btn" data-act="oxSaveNext">Guardar y dar el próximo turno</button>' + (d.editing ? '<button class="btn" data-act="oxCancelEdit">Cancelar</button>' : '') + '</div></section>';
  }
  function compareHTML(pid) {
    const pd = A.pd(pid), all = (pd.images || []).filter(i => i.kind === 'orto' && i.view), by = {};
    all.forEach(i => { (by[i.view] = by[i.view] || []).push(i); });
    const vs = VIEWS.filter(v => by[v] && by[v].length >= 2); if (!vs.length) return '';
    const v = vs.indexOf(S.oxView) >= 0 ? S.oxView : vs[0], L = by[v].slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)), a = L[0], b = L[L.length - 1];
    const cell = (i, t) => '<figure><button type="button" data-act="imOpen" data-id="' + esc(i.id) + '"><img data-full="' + esc(i.id) + '" src="' + esc(i.thumb) + '" alt="' + esc(t) + '"></button><figcaption><b>' + t + '</b> · ' + dmy(i.date) + '</figcaption></figure>';
    return '<section class="card ox-card"><h2>Antes y ahora</h2><div class="ox-chips" role="group" aria-label="Vista">' + vs.map(x => '<button type="button" class="' + (x === v ? 'on' : '') + '" data-act="oxView" data-v="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div><div class="ox-cmp">' + cell(a, 'Antes') + cell(b, 'Ahora') + '</div></section>';
  }
  function listHTML(pid) {
    const pd = A.pd(pid), L = O(pid).ctrls || [];
    if (!L.length) return '<section class="card ox-card"><h2>Controles</h2><div class="empty">Todavía no registraste controles.</div></section>';
    return '<section class="card ox-card"><h2>Controles <span class="count">' + L.length + '</span></h2><ol class="ox-list">' + L.map((c, k) => {
      const ph = imgs(pd, c.id), det = [c.arcU ? 'Sup. ' + c.arcU : '', c.arcL ? 'Inf. ' + c.arcL : '', c.elas ? 'Elásticos: ' + c.elas : ''].filter(Boolean).join(' · ');
      return '<li><div class="ox-ch"><b>Control N° ' + (L.length - k) + '</b><span>' + dmy(c.date) + '</span><button class="ox-del" data-act="oxEdit" data-id="' + esc(c.id) + '" aria-label="Completar o editar control">✎</button><button class="ox-del" data-act="oxDel" data-id="' + esc(c.id) + '" aria-label="Borrar control">🗑</button></div>' +
        (c.chips && c.chips.length ? '<div class="ox-tags">' + c.chips.map(x => '<span>' + esc(x) + '</span>').join('') + '</div>' : '') + (det ? '<div class="ox-det">' + esc(det) + '</div>' : '') + (c.notes ? '<div class="ox-nt">' + esc(c.notes) + '</div>' : '') + (ph.length ? '<div class="ox-ths">' + thumbs(pd, ph, false) + '</div>' : '') + '</li>';
    }).join('') + '</ol></section>';
  }
  A.render.ortoTab = pid => { const o = O(pid); return o ? '<div class="ox-wrap">' + headHTML(pid, o) + formHTML(pid) + compareHTML(pid) + listHTML(pid) + '</div>' : '<div class="ox-wrap">' + startHTML() + '</div>'; };

  /* ---------- acciones ---------- */
  const touch = pid => { A.touchPd(pid); };
  A.acts.oxStart = () => {
    const pid = pid0(), pd = A.pd(pid), m = parseInt(($('#oxM') || {}).value, 10) || 24;
    pd.orto = { type: ($('#oxT') || {}).value || TYPES[0], start: ($('#oxS') || {}).value || A.today(), months: m, goal: (($('#oxG') || {}).value || '').trim(), status: 'act', ctrls: [] };
    pd.notes.unshift({ id: A.uid(), date: pd.orto.start, pro: A.PAT(pid).pro, text: 'Inicio de tratamiento de ortodoncia: ' + pd.orto.type + (pd.orto.goal ? ' (' + pd.orto.goal + ')' : '') + '. Duración estimada: ' + m + ' meses.', auto: true });
    touch(pid); A.refresh(); A.toast('Tratamiento de ortodoncia iniciado.');
  };
  A.chg.oxStat = el => { const pid = pid0(), o = O(pid); if (!o) return; o.status = el.value; if (el.value !== 'act') A.pd(pid).notes.unshift({ id: A.uid(), date: A.today(), pro: A.PAT(pid).pro, text: el.value === 'fin' ? 'Finalizó el tratamiento de ortodoncia.' : 'Pasa a retención (ortodoncia).', auto: true }); touch(pid); A.refresh(); };
  A.chg.oxFld = el => { const d = draft(pid0()), k = el.getAttribute('data-k'); d[k] = el.value; };
  A.acts.oxChip = el => { const d = draft(pid0()), c = el.getAttribute('data-c'), i = d.chips.indexOf(c); if (i >= 0) d.chips.splice(i, 1); else d.chips.push(c); el.classList.toggle('on', i < 0); el.setAttribute('aria-pressed', String(i < 0)); };
  A.acts.oxView = el => { S.oxView = el.getAttribute('data-v'); A.refresh(); };
  A.chg.oxPhoto = async el => {
    const pid = pid0(), d = draft(pid), files = Array.prototype.slice.call(el.files || []), msg = $('#oxMsg'); if (!files.length) return;
    const view = ($('#oxV') || {}).value || d.view; d.view = view; if (msg) msg.textContent = 'Procesando ' + files.length + ' foto(s)…'; let n = 0;
    for (const f of files) {
      try { const full = await toJpg(f, 1600, 0.82), thumb = await toJpg(f, 160, 0.6), it = await A.imgAdd(pid, { kind: 'orto', note: 'Ortodoncia · ' + view, date: d.date || A.today() }, full, thumb); it.view = view; it.ctrl = d.id; n++; } catch (e) { if (msg) msg.textContent = 'No se pudo procesar «' + f.name + '».'; }
    }
    el.value = ''; if (n) { touch(pid); A.refresh(); A.toast(n + ' foto(s) agregada(s).'); }
  };
  A.acts.oxPhDel = el => { const pid = pid0(), pd = A.pd(pid), id = el.getAttribute('data-id'); pd.images = pd.images.filter(x => x.id !== id); try { A.media.del(id); } catch (e) { /* nada */ } touch(pid); A.refresh(); };
  function save(next) {
    const pid = pid0(), pd = A.pd(pid), o = O(pid), d = draft(pid), ph = imgs(pd, d.id);
    ['oxU', 'oxL', 'oxE', 'oxN', 'oxX', 'oxD'].forEach(id => { const e = $('#' + id); if (e) d[e.getAttribute('data-k')] = e.value; });
    if (!d.chips.length && !d.arcU && !d.arcL && !d.elas && !d.notes.trim() && !ph.length) { const m = $('#oxMsg'); if (m) m.textContent = 'Cargá al menos una foto, un arco o lo que hiciste.'; A.toast('Cargá al menos una foto o lo que hiciste.'); return; }
    const c = { id: d.id, date: d.date || A.today(), arcU: d.arcU.trim(), arcL: d.arcL.trim(), elas: d.elas.trim(), notes: d.notes.trim(), next: +d.next || 5, chips: d.chips.slice() };
    ph.forEach(i => { i.date = c.date; });
    if (d.editing) {
      const old = (o.ctrls || []).filter(x => x.id === d.editing)[0];
      if (old) { Object.assign(old, c, { id: old.id, noteId: old.noteId, auto: false }); delete drafts[pid]; touch(pid); A.refresh(); A.toast('Control actualizado.'); if (next && A.openNewAppt) A.openNewAppt({ pid, date: A.add(old.date, 7 * old.next), what: 'Control' }); return; }
    }
    o.ctrls = o.ctrls || []; o.ctrls.unshift(c); o.ctrls.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const nro = o.ctrls.length, parts = [];
    if (c.chips.length) parts.push(c.chips.join(', ')); if (c.arcU) parts.push('arco superior ' + c.arcU); if (c.arcL) parts.push('arco inferior ' + c.arcL); if (c.elas) parts.push('elásticos ' + c.elas);
    const nid = A.uid(); c.noteId = nid;
    pd.notes.unshift({ id: nid, date: c.date, pro: A.PAT(pid).pro, text: 'Control de ortodoncia N° ' + nro + (parts.length ? ': ' + parts.join('; ') : '') + '.' + (c.notes ? ' ' + c.notes : '') + (ph.length ? ' Fotos: ' + ph.length + '.' : '') + ' Próximo control en ' + c.next + ' semanas.', orto: c.id });
    pd.notes.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    delete drafts[pid]; touch(pid); A.refresh(); A.toast('Control N° ' + nro + ' guardado' + (ph.length ? ' con ' + ph.length + ' foto(s)' : '') + '.');
    if (next && A.openNewAppt) A.openNewAppt({ pid, date: A.add(c.date, 7 * c.next), what: 'Control' });
  }
  A.acts.oxEdit = el => {
    const pid = pid0(), o = O(pid), c = (o.ctrls || []).filter(x => x.id === el.getAttribute('data-id'))[0]; if (!c) return;
    drafts[pid] = { id: c.id, editing: c.id, date: c.date, arcU: c.arcU || '', arcL: c.arcL || '', elas: c.elas || '', notes: c.notes || '', next: c.next || 5, chips: (c.chips || []).slice(), view: 'Frente' };
    A.refresh(); const f = $('#oxForm'); if (f && f.scrollIntoView) f.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  A.acts.oxCancelEdit = () => { delete drafts[pid0()]; A.refresh(); };
  A.acts.oxSave = () => save(false);
  A.acts.oxSaveNext = () => save(true);
  A.acts.oxDel = el => {
    const pid = pid0(), pd = A.pd(pid), o = O(pid), id = el.getAttribute('data-id'), c = (o.ctrls || []).filter(x => x.id === id)[0]; if (!c) return;
    if (!window.confirm('¿Borrar este control? Las fotos quedan guardadas en «Fotos y radiografías».')) return;
    o.ctrls = o.ctrls.filter(x => x.id !== id); pd.notes = pd.notes.filter(n => n.id !== c.noteId); (pd.images || []).forEach(i => { if (i.ctrl === id) delete i.ctrl; });
    touch(pid); A.refresh(); A.toast('Control borrado.');
  };

  /* ---------- fotos dentro de la evolución clínica y imágenes grandes en «Antes y ahora» ---------- */
  function mount() {
    if (S.tab !== 'ficha' || !S.fichaPid) return; const pd = A.pd(S.fichaPid);
    if (S.fichaTab === 'datos') {
      const lis = Array.prototype.slice.call(document.querySelectorAll('#fichaBody .timeline li'));
      pd.notes.filter(n => n.orto).forEach(n => {
        const li = lis.filter(x => x.textContent.indexOf(n.text) >= 0).pop(); if (!li || li.querySelector('.ox-ths')) return;
        const ph = imgs(pd, n.orto); if (ph.length) li.insertAdjacentHTML('beforeend', '<div class="ox-ths">' + thumbs(pd, ph, false) + '</div>');
      });
    } else if (S.fichaTab === 'orto') {
      document.querySelectorAll('.ox-cmp img[data-full]').forEach(im => { A.media.get(im.getAttribute('data-full')).then(d => { if (d && im.isConnected) im.src = d; }); });
    }
  }
  const fichaPrev = A.render.ficha;
  A.render.ficha = function () { const r = fichaPrev.apply(this, arguments); try { mount(); setTimeout(() => { try { mount(); } catch (e) { /* nada */ } }, 150); } catch (e) { /* nada */ } return r; };

  const css = document.createElement('style');
  css.textContent = '.ox-wrap{display:grid;gap:14px;max-width:900px}.ox-top{display:flex;gap:10px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}.ox-top h2{margin:0 0 2px}.ox-st select{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:10px;padding:7px 10px;font:inherit}' +
    '.ox-prog{height:10px;border-radius:99px;background:var(--surface-2);overflow:hidden;margin:12px 0 8px}.ox-prog i{display:block;height:100%;border-radius:99px;background:var(--accent)}.ox-kpis{display:flex;gap:14px;flex-wrap:wrap;color:var(--ink-2);font-size:.88rem}.ox-kpis b{color:var(--ink)}' +
    '.ox-chips{display:flex;flex-wrap:wrap;gap:6px}.ox-chips button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:6px 12px;font:inherit;font-size:.85rem;cursor:pointer}.ox-chips button.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}' +
    '.ox-ph{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.ox-ph select{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:10px;padding:9px 10px;font:inherit}.ox-up{cursor:pointer}' +
    '.ox-ths{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.ox-th{position:relative;display:inline-block}.ox-th>button:first-child{border:1px solid var(--line);background:var(--surface);border-radius:12px;padding:0;overflow:hidden;cursor:pointer;display:block;width:84px}.ox-th img{display:block;width:84px;height:84px;object-fit:cover}.ox-th em{display:block;font-style:normal;font-size:.66rem;color:var(--ink-2);padding:2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.ox-x{position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;border:1px solid var(--line);background:var(--surface);color:var(--red);cursor:pointer;line-height:1;padding:0}' +
    '.ox-cmp{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.ox-cmp figure{margin:0}.ox-cmp button{border:1px solid var(--line);background:var(--surface);border-radius:14px;padding:0;overflow:hidden;width:100%;cursor:pointer}.ox-cmp img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}.ox-cmp figcaption{font-size:.84rem;color:var(--ink-2);padding:6px 2px}' +
    '.ox-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}.ox-list>li{border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:12px;padding:10px 12px;background:var(--surface)}.ox-ch{display:flex;gap:10px;align-items:center}.ox-ch span{color:var(--ink-2);font-size:.85rem;flex:1}.ox-del{border:0;background:none;cursor:pointer;font-size:1rem;opacity:.6}.ox-tags{display:flex;gap:5px;flex-wrap:wrap;margin:6px 0}.ox-tags span{background:var(--accent-soft);color:var(--accent);border-radius:999px;padding:2px 9px;font-size:.76rem}.ox-det{font-size:.88rem}.ox-nt{font-size:.88rem;color:var(--ink-2);margin-top:3px}' +
    '.timeline .ox-ths{margin-top:6px}@media (max-width:560px){.ox-cmp{grid-template-columns:1fr}}';
  document.body.appendChild(css);
})();
