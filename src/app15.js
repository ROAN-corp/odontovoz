/* ===== 1.7.1: evolución clínica: buscar y filtrar notas, borrar las del día y anular las anteriores (quedan guardadas, como pide la ley) ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns;
  const N = s => A.norm(String(s || ''));
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const PASO = 30;

  /* Una nota del día y sin firmar se puede borrar (fue un error al escribir).
     Las de otros días no se borran: se ANULAN con motivo y fecha, quedan ocultas y figuran tachadas en el PDF
     (Ley 26.529: la historia clínica es inviolable y se conserva 10 años). */
  const isVoid = n => !!(n && n.void);
  /* las automáticas (laboratorio, recetas, «se realizó») son un registro de movimientos: se pueden borrar siempre */
  const canDelete = n => n && !isVoid(n) && !n.signed && !n.docId && (n.auto || n.date === A.today());
  const LABRX = /^Laboratorio: /;
  const labOf = (pid, n) => { const labs = A.pd(pid).labs || []; if (n.lab) return labs.filter(l => l.id === n.lab)[0] || null; if (!LABRX.test(n.text)) return null; return labs.filter(l => n.text.indexOf('Laboratorio: ' + l.work) === 0 && (!l.hist || !l.hist[0] || l.hist[0].d === n.date))[0] || null; };
  const kindOf = n => (n.auto ? 'auto' : n.voice ? 'voz' : 'manual');
  const KIND = { manual: 'Escritas', voz: 'Dictadas', auto: 'Automáticas' };

  const F = pid => { if (!S.evF || S.evF.pid !== pid) S.evF = { pid, q: '', pro: '', kind: '', from: '', to: '', anul: false, n: PASO, open: {} }; return S.evF; };
  const sorted = pid => (A.pd(pid).notes || []).map((n, i) => ({ n, i })).sort((a, b) => (a.n.date < b.n.date ? 1 : a.n.date > b.n.date ? -1 : a.i - b.i)).map(x => x.n);
  function filtered(pid) {
    const f = F(pid), words = N(f.q).split(/\s+/).filter(Boolean);
    return sorted(pid).filter(n => {
      if (isVoid(n) && !f.anul) return false;
      if (f.pro && n.pro !== f.pro) return false;
      if (f.kind && kindOf(n) !== f.kind) return false;
      if (f.from && n.date < f.from) return false;
      if (f.to && n.date > f.to) return false;
      if (words.length) { const t = N(n.text + ' ' + A.fmtDMY(n.date) + ' ' + ((A.PRO(n.pro) || {}).name || '')); if (!words.every(w => t.indexOf(w) >= 0)) return false; }
      return true;
    });
  }
  /* resalta lo buscado sin romper los acentos: se compara sin tildes y se marca sobre el texto original */
  function mark(text, q) {
    const words = N(q).split(/\s+/).filter(w => w.length > 1); if (!words.length) return esc(text);
    const plain = Array.from(text).map(ch => ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().charAt(0) || ch).join('');
    if (plain.length !== text.length) return esc(text);
    const on = new Array(text.length).fill(false);
    words.forEach(w => { let i = plain.indexOf(w); while (i >= 0) { for (let k = i; k < i + w.length; k++) on[k] = true; i = plain.indexOf(w, i + w.length); } });
    let h = '', open = false;
    for (let k = 0; k < text.length; k++) { if (on[k] && !open) { h += '<mark>'; open = true; } if (!on[k] && open) { h += '</mark>'; open = false; } h += esc(text[k]); }
    return h + (open ? '</mark>' : '');
  }
  const monthLabel = d => { const p = String(d || '').split('-'); return p.length < 2 ? 'Sin fecha' : MESES[+p[1] - 1] + ' ' + p[0]; };

  function noteLI(n, f) {
    const pr = A.PRO(n.pro) || {}, long = n.text.length > 320, open = f.open[n.id] || N(f.q);
    let h = '<li class="ev-n' + (n.auto ? ' done' : '') + (isVoid(n) ? ' void' : '') + '"><div class="meta"><span>' + A.fmtDMY(n.date) + '</span><span>' + esc(pr.short || pr.name || '') + '</span>' +
      (n.auto ? '<span>automática</span>' : n.voice ? '<span>dictada</span>' : '') + (isVoid(n) ? '<span class="ev-tag">anulada</span>' : '') + '</div>';
    h += '<div class="ev-txt' + (long && !open ? ' clamp' : '') + '">' + mark(n.text, f.q) + '</div>';
    if (isVoid(n)) h += '<div class="ev-why">Anulada el ' + A.fmtDMY(n.void.date) + (n.void.by ? ' por ' + esc((A.PRO(n.void.by) || {}).short || '') : '') + ': ' + esc(n.void.why) + '</div>';
    h += '<div class="ev-acts">' + (long && !N(f.q) ? '<button class="lnk" data-act="evOpen" data-id="' + n.id + '">' + (f.open[n.id] ? 'Ver menos' : 'Ver completa') + '</button>' : '') +
      '<button class="lnk" data-act="evCopy" data-id="' + n.id + '">Copiar</button>' +
      (isVoid(n) ? '<button class="lnk" data-act="evRestore" data-id="' + n.id + '">Quitar la anulación</button>' :
        canDelete(n) ? '<button class="lnk bad" data-act="evDelAsk" data-id="' + n.id + '">Borrar</button>' : '<button class="lnk bad" data-act="evVoidAsk" data-id="' + n.id + '">Anular</button>') + '</div></li>';
    return h;
  }
  function listHTML(pid) {
    const f = F(pid), all = A.pd(pid).notes || [], list = filtered(pid), shown = list.slice(0, f.n), nVoid = all.filter(isVoid).length;
    const busy = f.q || f.pro || f.kind || f.from || f.to;
    let h = '<div class="ev-count">' + (busy ? (list.length ? list.length + ' nota' + (list.length > 1 ? 's' : '') + ' encontrada' + (list.length > 1 ? 's' : '') : 'No hay notas con esos filtros') : all.filter(n => !isVoid(n)).length + ' notas') +
      (busy ? ' · <button class="lnk" data-act="evClear">Ver todas</button>' : '') + '</div>';
    if (!all.length) return '<div class="empty">Todavía no hay notas.</div>';
    if (!list.length) return h;
    h += '<ul class="timeline ev-list">'; let m = '';
    shown.forEach(n => { const ml = monthLabel(n.date); if (ml !== m) { m = ml; h += '<li class="ev-month">' + esc(ml) + '</li>'; } h += noteLI(n, f); });
    h += '</ul>';
    if (list.length > shown.length) h += '<div class="row-btns" style="justify-content:center;margin-top:10px"><button class="btn small" data-act="evMore">Ver más notas (quedan ' + (list.length - shown.length) + ')</button></div>';
    if (nVoid && !f.anul) h += '<div class="small-note">' + nVoid + ' nota' + (nVoid > 1 ? 's anuladas' : ' anulada') + ' oculta' + (nVoid > 1 ? 's' : '') + '.</div>';
    return h;
  }
  function toolsHTML(pid) {
    const f = F(pid), pros = A.PROS || [], all = A.pd(pid).notes || [], nVoid = all.filter(isVoid).length;
    if (all.length < 2 && !nVoid) return '';
    return '<div class="ev-tools"><div class="field ev-q"><label for="evQ" class="sr">Buscar en la evolución</label><input id="evQ" type="search" data-in="evQ" autocomplete="off" placeholder="Buscar en las notas: «36», «endodoncia», «ibuprofeno»…" value="' + esc(f.q) + '"></div>' +
      '<div class="ev-flt">' +
      '<select data-chg="evKind" aria-label="Tipo de nota"><option value="">Todas</option>' + Object.keys(KIND).map(k => '<option value="' + k + '"' + (f.kind === k ? ' selected' : '') + '>' + KIND[k] + '</option>').join('') + '</select>' +
      (!A.isSolo() && pros.length > 1 ? '<select data-chg="evPro" aria-label="Profesional"><option value="">Todos los profesionales</option>' + pros.map(p => '<option value="' + p.id + '"' + (f.pro === p.id ? ' selected' : '') + '>' + esc(p.short || p.name) + '</option>').join('') + '</select>' : '') +
      '<label class="ev-d">Desde <input type="date" data-chg="evFrom" value="' + esc(f.from) + '"></label><label class="ev-d">Hasta <input type="date" data-chg="evTo" value="' + esc(f.to) + '"></label>' +
      (nVoid ? '<label class="chk ev-a"><input type="checkbox" data-chg="evAnul"' + (f.anul ? ' checked' : '') + '> Mostrar anuladas (' + nVoid + ')</label>' : '') +
      '</div></div>';
  }
  const paintList = () => { const host = $('#evList'); if (host && S.fichaPid) host.innerHTML = listHTML(S.fichaPid); };

  /* se monta sobre la tarjeta «Evolución clínica» que arma la ficha */
  function mount() {
    if (S.tab !== 'ficha' || !S.fichaPid) return;
    const ta = $('#noteTxt'); if (!ta) return; const card = ta.closest('section'); if (!card || card.querySelector('#evList')) return;
    const pid = S.fichaPid, old = card.querySelector('ul.timeline') || card.querySelector(':scope > .empty');
    const box = document.createElement('div'); box.className = 'ev-box'; box.innerHTML = toolsHTML(pid) + '<div id="evList">' + listHTML(pid) + '</div>';
    if (old) old.replaceWith(box); else { const btns = card.querySelector('.row-btns'); if (btns) btns.after(box); }
    const cnt = card.querySelector('h2 .count'); if (cnt) { const k = (A.pd(pid).notes || []).filter(n => !isVoid(n)).length; cnt.textContent = k + ' nota' + (k === 1 ? '' : 's'); }
    const note = card.querySelector('.small-note:last-child'); if (note && /Ley 26\.529/.test(note.textContent)) note.textContent = 'Las notas automáticas salen del odontograma y del plan cuando algo pasa a «realizado». Las automáticas (laboratorio, recetas, tratamientos) se pueden borrar siempre. Las que escribís vos se borran el mismo día; las de días anteriores se anulan con un motivo: no desaparecen de la historia clínica (Ley 26.529).';
  }
  const afterPrev = A.afterRefresh; A.afterRefresh = () => { if (afterPrev) afterPrev(); try { mount(); } catch (e) { if (A.logError) A.logError('evol', e); } };

  /* filtros: la lista se repinta sola, sin perder el foco del buscador */
  let tq = null;
  A.ins.evQ = el => { F(S.fichaPid).q = el.value; F(S.fichaPid).n = PASO; clearTimeout(tq); tq = setTimeout(paintList, 120); };
  A.chg.evKind = el => { F(S.fichaPid).kind = el.value; F(S.fichaPid).n = PASO; paintList(); };
  A.chg.evPro = el => { F(S.fichaPid).pro = el.value; F(S.fichaPid).n = PASO; paintList(); };
  A.chg.evFrom = el => { F(S.fichaPid).from = el.value; F(S.fichaPid).n = PASO; paintList(); };
  A.chg.evTo = el => { F(S.fichaPid).to = el.value; F(S.fichaPid).n = PASO; paintList(); };
  A.chg.evAnul = el => { F(S.fichaPid).anul = el.checked; paintList(); };
  A.acts.evMore = () => { F(S.fichaPid).n += PASO; paintList(); };
  A.acts.evOpen = el => { const o = F(S.fichaPid).open, id = el.getAttribute('data-id'); o[id] = !o[id]; paintList(); };
  A.acts.evClear = () => { const f = F(S.fichaPid); Object.assign(f, { q: '', pro: '', kind: '', from: '', to: '', n: PASO }); S.evF = f; A.refresh(); };
  A.acts.evCopy = el => {
    const n = byId(el.getAttribute('data-id')); if (!n) return; const t = A.fmtDMY(n.date) + ' · ' + n.text;
    try { navigator.clipboard.writeText(t).then(() => A.toast('Nota copiada.'), () => A.toast('No se pudo copiar.')); } catch (e) { A.toast('No se pudo copiar.'); }
  };
  const byId = id => (A.pd(S.fichaPid).notes || []).filter(n => n.id === id)[0];

  /* borrar (solo las del día) */
  A.acts.evDelAsk = el => { S.modal = { type: 'evDel', id: el.getAttribute('data-id') }; A.renderModal(); };
  MF.evDel = m => {
    const n = byId(m.id); if (!n) return A.modalShell('Borrar nota', '<p>La nota ya no está.</p>', '<button class="btn primary" data-act="closeModal">Listo</button>');
    const lab = labOf(S.fichaPid, n);
    return A.modalShell('Borrar nota', '<p>Se borra esta nota de todos tus equipos:</p><blockquote class="ev-q-box">' + esc(n.text) + '</blockquote>' +
      (lab ? '<label class="chk"><input type="checkbox" id="evLabToo" checked> Quitar también el pedido de laboratorio «' + esc(lab.work) + '»</label>' : '') +
      '<p class="hint">' + (n.auto ? (/^Se realizó/.test(n.text) ? 'Borrar la nota no deshace el tratamiento: si lo marcaste por error, volvelo a «pendiente» en el plan.' : 'Es una nota automática: se puede borrar cuando quieras.') : 'Las notas escritas se pueden borrar solo el mismo día. Desde mañana, en vez de borrarse, se anulan con un motivo.') + '</p>',
      '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn danger" data-act="evDelGo" data-id="' + n.id + '">Borrar</button>');
  };
  A.acts.evDelGo = el => {
    const pid = S.fichaPid, pd = A.pd(pid), n = byId(el.getAttribute('data-id'));
    if (n && canDelete(n)) {
      const lab = labOf(pid, n), too = lab && $('#evLabToo') && $('#evLabToo').checked;
      pd.notes = pd.notes.filter(x => x.id !== n.id); if (too) pd.labs = pd.labs.filter(l => l.id !== lab.id);
      A.touchPd(pid); if (A.save) A.save(); A.toast(too ? 'Nota y pedido de laboratorio borrados.' : 'Nota borrada.');
    }
    A.closeModal(); A.refresh();
  };

  /* laboratorio: la nota automática queda unida a su pedido; si se quita el pedido, se va también su nota */
  const labSavePrev = A.acts.labSave;
  if (labSavePrev) A.acts.labSave = el => {
    const m = S.modal, pid = m && m.pid, before = pid ? (A.pd(pid).labs || []).map(l => l.id) : [];
    const r = labSavePrev(el);
    if (pid) { const pd = A.pd(pid), nw = (pd.labs || []).filter(l => before.indexOf(l.id) < 0)[0]; if (nw) { const n = (pd.notes || []).filter(x => x.auto && !x.lab && LABRX.test(x.text))[0]; if (n) { n.lab = nw.id; A.touchPd(pid); } } }
    return r;
  };
  const labDelPrev = A.acts.labDel;
  if (labDelPrev) A.acts.labDel = el => {
    const m = S.modal, pid = m && m.pid, id = m && m.f && m.f.id;
    if (pid && id) { const pd = A.pd(pid), lab = (pd.labs || []).filter(l => l.id === id)[0]; if (lab) pd.notes = (pd.notes || []).filter(n => !(n.auto && !isVoid(n) && labOf(pid, n) === lab)); }
    return labDelPrev(el);
  };

  /* anular (las de días anteriores): queda guardada, oculta y tachada en el PDF */
  A.acts.evVoidAsk = el => { S.modal = { type: 'evVoid', id: el.getAttribute('data-id') }; A.renderModal(); };
  MF.evVoid = m => {
    const n = byId(m.id); if (!n) return A.modalShell('Anular nota', '<p>La nota ya no está.</p>', '<button class="btn primary" data-act="closeModal">Listo</button>');
    return A.modalShell('Anular nota del ' + A.fmtDMY(n.date), '<blockquote class="ev-q-box">' + esc(n.text) + '</blockquote>' +
      '<div class="field"><label for="evWhy">¿Por qué la anulás?</label><input id="evWhy" placeholder="Ej.: cargada en el paciente equivocado, dato erróneo" maxlength="200"></div><div class="hint" id="evWhyMsg"></div>' +
      '<p class="hint">La nota no se borra de la historia clínica: queda oculta, con la fecha y el motivo, y en el PDF aparece tachada. Es lo que pide la ley (Ley 26.529, arts. 15 y 18). Si hace falta, agregá después una nota nueva con el dato correcto.</p>',
    '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn danger" data-act="evVoidGo" data-id="' + n.id + '">Anular nota</button>');
  };
  A.modalAfter = A.modalAfter || {};
  A.modalAfter.evVoid = () => { const i = $('#evWhy'); if (i) i.focus(); };
  A.acts.evVoidGo = el => {
    const why = ($('#evWhy') || {}).value ? $('#evWhy').value.trim() : ''; if (!why) { const m = $('#evWhyMsg'); if (m) m.textContent = 'Escribí el motivo: queda registrado junto a la nota.'; return; }
    const pid = S.fichaPid, n = byId(el.getAttribute('data-id')); if (!n) { A.closeModal(); return; }
    n.void = { date: A.today(), at: new Date().toISOString(), by: S.me || (A.PAT(pid) || {}).pro || '', why };
    A.touchPd(pid); A.closeModal(); A.refresh(); A.toast('Nota anulada. Sigue guardada y la ves con «Mostrar anuladas».');
  };
  A.acts.evRestore = el => { const pid = S.fichaPid, n = byId(el.getAttribute('data-id')); if (!n) return; delete n.void; A.touchPd(pid); A.refresh(); A.toast('La nota vuelve a estar vigente.'); };

  /* las notas anuladas no aparecen en «Últimas notas» y en el PDF figuran como anuladas */
  const withNotes = (pid, map, fn) => { const pd = A.pd(pid), orig = pd.notes; pd.notes = map(orig); try { return fn(); } finally { pd.notes = orig; } };
  const qnPrev = A.quickNoteHTML; if (qnPrev) A.quickNoteHTML = (pid, opt) => withNotes(pid, l => l.filter(n => !isVoid(n)), () => qnPrev(pid, opt));
  const pdfPrev = A.acts.pdfHC;
  if (pdfPrev) A.acts.pdfHC = el => {
    const pid = (el && el.getAttribute && el.getAttribute('data-pid')) || S.fichaPid;
    return withNotes(pid, l => l.map(n => (isVoid(n) ? Object.assign({}, n, { text: '[ANULADA el ' + A.fmtDMY(n.void.date) + ': ' + n.void.why + '] ' + n.text }) : n)), () => pdfPrev(el));
  };

  /* por voz: «buscar en la evolución endodoncia» */
  const execPrev = A.cmd.exec;
  A.cmd.exec = (text, o) => {
    if (S.tab === 'ficha' && S.fichaPid && S.fichaTab === 'datos') {
      const m = /^(?:busca(?:r|me)?|encontra(?:r|me)?|mostra(?:r|me)?)\s+(?:en\s+)?(?:la\s+)?(?:evolucion|historia(?: clinica)?|notas?|las notas)\s+(?:de\s+|por\s+|sobre\s+|con\s+)?(.+)$/.exec(N(text).replace(/[.!?¿¡]/g, '').trim());
      if (m) { const f = F(S.fichaPid); f.q = m[1]; f.n = PASO; A.refresh(); const k = filtered(S.fichaPid).length; return { ok: true, msg: k ? 'Encontré ' + k + ' nota' + (k > 1 ? 's' : '') + ' con «' + m[1] + '».' : 'No encontré notas con «' + m[1] + '».' }; }
    }
    return execPrev(text, o);
  };

  /* estilos */
  const css = document.createElement('style');
  css.textContent = '.ev-tools{display:flex;flex-direction:column;gap:8px;margin:4px 0 10px}.ev-flt{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.ev-flt select,.ev-flt input[type=date]{min-height:36px;font:inherit;font-size:14px;border:1px solid var(--line);border-radius:8px;padding:4px 8px;background:var(--card,#fff);color:inherit}' +
    '.ev-d{display:flex;gap:6px;align-items:center;font-size:13px;color:var(--ink-2)}.ev-a{font-size:13px}.ev-count{font-size:13px;color:var(--ink-2);margin:0 0 8px}' +
    '.ev-month{border:0!important;padding:6px 0 0!important;font:700 12px var(--f-mono);text-transform:uppercase;letter-spacing:.06em;color:var(--ink-2)}' +
    '.ev-txt{white-space:pre-wrap;overflow-wrap:anywhere}.ev-txt.clamp{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}.ev-txt mark{background:#ffe58a;color:inherit;border-radius:3px;padding:0 1px}' +
    '.ev-acts{display:flex;gap:14px;margin-top:4px}.ev-acts .lnk,.ev-count .lnk{background:none;border:0;padding:4px 0;font:inherit;font-size:13px;color:var(--acc,#0d6b6b);cursor:pointer;text-decoration:underline;min-height:28px}.ev-acts .lnk.bad{color:var(--pat,#b3261e)}' +
    '.ev-n.void .ev-txt{text-decoration:line-through;opacity:.6}.ev-why{font-size:13px;color:var(--pat,#b3261e);margin-top:2px}.ev-tag{color:var(--pat,#b3261e);font-weight:700}' +
    '.pp-nums .clr{color:var(--pat,#b3261e);font-weight:800}.ev-q-box{margin:8px 0;padding:8px 12px;border-left:3px solid var(--line);white-space:pre-wrap;max-height:30vh;overflow:auto;color:var(--ink-2)}';
  document.head.appendChild(css);
})();
