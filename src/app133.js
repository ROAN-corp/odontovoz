/* ===== 1.50: consentimientos y documentos firmables: editar los textos (para todos o solo antes de firmar), crear nuevos y enviar lo firmado por WhatsApp ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc, $ = q => document.querySelector(q);
  if (!A.CONSENTS || !A.consentBody) return;
  const ORIG = {}; Object.keys(A.CONSENTS).forEach(k => { ORIG[k] = A.CONSENTS[k]; });
  const T = () => { if (!A.CFG.consentTpl || typeof A.CFG.consentTpl !== 'object') A.CFG.consentTpl = {}; return A.CFG.consentTpl; };
  const canEdit = () => !A.isMember || !A.isMember() || ['admin', 'profesional'].indexOf(A.mbRole ? A.mbRole() : '') >= 0;
  const lines = t => String(t || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const DECL_H = 'Declaraciones del paciente';

  /* los textos cambiados (guardados en la cuenta) pisan a los de fábrica; los nuevos se suman */
  function apply() {
    const t = T();
    Object.keys(A.CONSENTS).forEach(k => { if (!ORIG[k] && !t[k]) delete A.CONSENTS[k]; });
    Object.keys(t).forEach(k => {
      const o = t[k], b = ORIG[k];
      A.CONSENTS[k] = { title: o.title || (b && b.title) || 'Consentimiento', custom: !b, edited: true,
        proc: pd => (o.proc != null ? o.proc : (b ? b.proc(pd) : '')), risks: Array.isArray(o.risks) ? o.risks : (b ? b.risks : []), alts: o.alts != null ? o.alts : (b ? b.alts : '') };
    });
    Object.keys(ORIG).forEach(k => { if (!t[k]) A.CONSENTS[k] = ORIG[k]; });
  }
  const bodyPrev = A.consentBody;
  A.consentBody = function (pid, tpl) {
    apply(); const o = T()[tpl];
    const b = bodyPrev.call(this, pid, tpl);
    if (o && Array.isArray(o.decl) && o.decl.length) { const s = (b.sections || []).filter(x => x.h === DECL_H)[0]; if (s) s.list = o.decl.slice(); }
    return b;
  };

  /* ---------- la lista para elegir ---------- */
  MF.consentPick = m => {
    apply(); const can = canEdit(), keys = Object.keys(A.CONSENTS);
    const rows = keys.map(k => '<div class="cp-row"><button class="go" data-act="consentGo" data-tpl="' + esc(k) + '"><b>' + esc(A.CONSENTS[k].title) + '</b>' + (A.CONSENTS[k].edited ? '<small class="cp-ed">' + (A.CONSENTS[k].custom ? 'tuyo' : 'editado') + '</small>' : '') + '</button>' +
      (can ? '<button class="btn small ghost cp-edit" data-act="consentEd" data-k="' + esc(k) + '" aria-label="Editar ' + esc(A.CONSENTS[k].title) + '">✎ Editar</button>' : '') + '</div>').join('');
    return A.modalShell('Elegí el consentimiento', '<div class="mini-list cp-list">' + rows + '</div>' +
      (can ? '<div class="row-btns"><button class="btn small" data-act="consentNew">+ Nuevo consentimiento</button></div><div class="hint">Con «✎ Editar» cambiás el texto para todos los pacientes. Antes de firmar también podés ajustarlo solo para esa persona.</div>' : '') +
      '<div class="hint">Los textos son un borrador base: hacelos revisar por tu abogado y ajustalos a tu práctica.</div>', '<button class="btn" data-act="closeModal">Cancelar</button>');
  };

  /* ---------- editar o crear un consentimiento ---------- */
  const effective = (k, pid) => {
    apply(); const c = A.CONSENTS[k], pd = A.pd(pid), b = bodyPrev.call(A, pid, k), dec = (b.sections || []).filter(x => x.h === DECL_H)[0];
    return { title: c.title, proc: c.proc(pd), risks: (c.risks || []).join('\n'), alts: c.alts || '', decl: dec && dec.list ? dec.list.join('\n') : '' };
  };
  A.acts.consentEd = el => { const k = el.getAttribute('data-k'), pid = (S.modal && S.modal.pid) || S.fichaPid; S.modal = { type: 'consentEd', key: k, pid, f: effective(k, pid), isNew: false }; A.renderModal(); };
  A.acts.consentNew = () => {
    const pid = (S.modal && S.modal.pid) || S.fichaPid, any = Object.keys(ORIG)[0];
    const base = effective(any, pid);
    S.modal = { type: 'consentEd', key: 'c_' + A.uid().slice(0, 6), pid, f: { title: '', proc: '', risks: '', alts: '', decl: base.decl }, isNew: true }; A.renderModal();
  };
  MF.consentEd = m => {
    const f = m.f, orig = !!ORIG[m.key], edited = !!T()[m.key];
    const b = '<p class="hint" style="margin-top:0">' + (m.isNew ? 'Escribí el consentimiento. Queda guardado en tu lista para usarlo con cualquier paciente.' : 'Lo que cambies acá queda guardado para <b>todos los pacientes</b> a partir de ahora. Lo ya firmado no se modifica.') + '</p>' +
      '<div class="field"><label for="ceT">Nombre del consentimiento</label><input id="ceT" value="' + esc(f.title) + '" placeholder="Ej.: Blanqueamiento dental"></div>' +
      '<div class="field"><label for="ceP">Procedimiento</label><textarea id="ceP" rows="3" placeholder="Qué se va a hacer, explicado simple">' + esc(f.proc) + '</textarea></div>' +
      '<div class="field"><label for="ceR">Riesgos y complicaciones posibles <small>(uno por línea)</small></label><textarea id="ceR" rows="5">' + esc(f.risks) + '</textarea></div>' +
      '<div class="field"><label for="ceA">Alternativas</label><textarea id="ceA" rows="2">' + esc(f.alts) + '</textarea></div>' +
      '<div class="field"><label for="ceD">Declaraciones del paciente <small>(una por línea)</small></label><textarea id="ceD" rows="5">' + esc(f.decl) + '</textarea></div>' +
      '<div id="ceMsg" class="hint bad"></div>';
    const foot = '<button class="btn" data-act="consentEdBack">Volver</button>' +
      (orig && edited ? '<button class="btn" data-act="consentRestore">Volver al texto original</button>' : '') +
      (!orig ? '<button class="btn danger" data-act="consentDel">' + (m.delAsk ? '¿Seguro? Borrar' : 'Borrar') + '</button>' : '') +
      '<button class="btn primary" data-act="consentSave">Guardar para todos</button>';
    return A.modalShell(m.isNew ? 'Nuevo consentimiento' : 'Editar: ' + f.title, b, foot, true);
  };
  const readEd = () => { const m = S.modal; if (!m || !$('#ceT')) return; m.f = { title: $('#ceT').value.trim(), proc: $('#ceP').value.trim(), risks: $('#ceR').value, alts: $('#ceA').value.trim(), decl: $('#ceD').value }; };
  A.acts.consentEdBack = () => { const pid = S.modal.pid; S.modal = { type: 'consentPick', pid }; A.renderModal(); };
  A.acts.consentSave = () => {
    readEd(); const m = S.modal, f = m.f, msg = $('#ceMsg');
    if (!f.title) { msg.textContent = 'Ponele un nombre al consentimiento.'; return; }
    if (!f.proc) { msg.textContent = 'Escribí en qué consiste el procedimiento.'; return; }
    if (!lines(f.risks).length) { msg.textContent = 'Agregá al menos un riesgo (una línea cada uno).'; return; }
    T()[m.key] = { title: f.title, proc: f.proc, risks: lines(f.risks), alts: f.alts, decl: lines(f.decl) };
    A.save(); apply(); A.toast('Guardado: se usa para todos los pacientes.'); A.acts.consentEdBack();
  };
  A.acts.consentRestore = () => { const m = S.modal; delete T()[m.key]; A.save(); apply(); A.toast('Volvió al texto original.'); A.acts.consentEdBack(); };
  A.acts.consentDel = () => {
    const m = S.modal; if (!m.delAsk) { readEd(); m.delAsk = true; A.renderModal(); return; }
    delete T()[m.key]; A.save(); apply(); A.toast('Consentimiento borrado de tu lista.'); A.acts.consentEdBack();
  };

  /* ---------- ajustar el texto antes de firmar (sirve para cualquier documento) ---------- */
  const copy = o => JSON.parse(JSON.stringify(o));
  const SIGN_BTN = '<label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="sgAgree"';
  const signPrev = MF.sign;
  MF.sign = function (m) {
    const h = signPrev.apply(this, arguments);
    if (typeof h !== 'string' || !m || m.step !== 0 || !canEdit() || h.indexOf(SIGN_BTN) < 0) return h;
    return h.replace(SIGN_BTN, '<div class="row-btns se-open"><button class="btn small" data-act="signEdit">✎ Agregar o quitar cosas antes de firmar</button></div>' + SIGN_BTN);
  };
  A.acts.signEdit = () => { const m = S.modal; S.modal = { type: 'signEdit', prev: m, f: copy({ title: m.body.title, lead: m.body.lead || '', sections: m.body.sections || [] }) }; A.renderModal(); };
  MF.signEdit = m => {
    const f = m.f;
    let b = '<p class="hint" style="margin-top:0">Los cambios valen solo para este documento y esta persona: quedan escritos en lo que se firma. Para cambiar el texto de todos los pacientes, usá «✎ Editar» en la lista de consentimientos.</p>' +
      '<div class="field"><label for="seT">Título</label><input id="seT" value="' + esc(f.title) + '"></div>';
    f.sections.forEach((s, i) => {
      b += '<div class="se-sec"><div class="field"><label for="seH' + i + '">Título de la parte</label><input id="seH' + i + '" value="' + esc(s.h) + '"></div>' +
        (s.rows ? '<p class="hint">Es una tabla (importes): no se edita acá.</p>' :
          '<div class="field"><label for="seB' + i + '">Texto <small>(' + (s.list ? 'una línea por ítem' : 'párrafo') + ')</small></label><textarea id="seB' + i + '" rows="' + (s.list ? Math.min(8, s.list.length + 1) : 4) + '">' + esc(s.list ? s.list.join('\n') : s.p || '') + '</textarea></div>') +
        '<div class="row-btns"><button class="btn small ghost" data-act="seDel" data-i="' + i + '">Quitar esta parte</button></div></div>';
    });
    b += '<div class="row-btns"><button class="btn small" data-act="seAdd">+ Agregar una parte</button></div>';
    return A.modalShell('Ajustar antes de firmar', b, '<button class="btn" data-act="seCancel">Descartar cambios</button><button class="btn primary" data-act="seSave">Usar este texto</button>', true);
  };
  const readSe = () => {
    const m = S.modal; if (!m || !$('#seT')) return; m.f.title = $('#seT').value.trim() || m.f.title;
    m.f.sections.forEach((s, i) => { const h = $('#seH' + i), t = $('#seB' + i); if (h) s.h = h.value.trim(); if (t) { if (s.list) s.list = lines(t.value); else s.p = t.value.trim(); } });
  };
  A.acts.seAdd = () => { readSe(); S.modal.f.sections.push({ h: 'Nueva parte', p: '' }); A.renderModal(); };
  A.acts.seDel = el => { readSe(); S.modal.f.sections.splice(+el.getAttribute('data-i'), 1); A.renderModal(); };
  A.acts.seCancel = () => { S.modal = S.modal.prev; A.renderModal(); };
  A.acts.seSave = () => {
    readSe(); const m = S.modal, p = m.prev, f = m.f; if (!p._body0) p._body0 = copy(p.body);
    const secs = f.sections.filter(s => s.h || s.p || (s.list && s.list.length) || s.rows);
    const changed = JSON.stringify({ t: f.title, s: secs }) !== JSON.stringify({ t: p._body0.title, s: p._body0.sections || [] });
    const NOTE = ' (Texto ajustado por el profesional antes de la firma.)';
    p.body = Object.assign({}, p.body, { title: f.title, sections: secs, lead: String(p._body0.lead || '') + (changed ? NOTE : '') });
    p.title = f.title; S.modal = p; A.renderModal();
  };

  /* ---------- enviar lo firmado por WhatsApp (en el teléfono se comparte el PDF; en la PC se descarga y se abre el chat) ---------- */
  const DOC_BTN = '<button class="btn" data-act="pdfDoc"';
  const viewPrev = MF.docView;
  MF.docView = function (m) {
    const h = viewPrev.apply(this, arguments); if (typeof h !== 'string' || h.indexOf(DOC_BTN) < 0) return h;
    const id = (A.pd(m.pid).docs.filter(x => x.id === m.id)[0] || {}).id; if (!id) return h;
    return h.replace(DOC_BTN, '<button class="btn primary" data-act="docWa" data-id="' + esc(id) + '">Enviar por WhatsApp</button>' + DOC_BTN);
  };
  A.acts.docWa = async el => {
    const pid = S.modal && S.modal.pid, pd = A.pd(pid), d = pd.docs.filter(x => x.id === el.getAttribute('data-id'))[0], pat = A.PAT(pid); if (!d || !pat) return;
    let got = null; const sv = A.saveFile; A.saveFile = (n, b) => { got = { name: n, blob: b }; return Promise.resolve(true); };
    try { await A.pdfOfDoc(pid, d); } finally { A.saveFile = sv; }
    if (!got) { A.toast('No se pudo armar el PDF.'); return; }
    const txt = 'Hola ' + (pat.first || pat.name) + ', te envío tu documento firmado: ' + d.title + ' (PDF adjunto).\n' + (A.CLINIC || '');
    const file = typeof File === 'function' ? new File([got.blob], got.name, { type: 'application/pdf' }) : null;
    if (window.OV_NATIVE) { A.saveFile(got.name, got.blob); return; }
    if (file && navigator.canShare && navigator.canShare({ files: [file] }) && /android|iphone|ipad/i.test(navigator.userAgent)) {
      try { await navigator.share({ files: [file], text: txt, title: d.title }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    await A.saveFile(got.name, got.blob);
    const link = A.waLink ? A.waLink(pat.phone, txt) : '';
    if (link) { window.open(link, '_blank', 'noopener'); A.toast('Se descargó el PDF y se abrió el chat de ' + (pat.first || pat.name) + ': adjuntalo con el clip.'); }
    else A.toast('Se descargó el PDF. El paciente no tiene teléfono cargado: mandalo por WhatsApp a mano.');
  };

  apply();
  const css = document.createElement('style'); css.id = 'ovApp133';
  css.textContent = '.cp-row{display:flex;gap:8px;align-items:stretch;margin:0 0 6px}.cp-row .go{flex:1;text-align:left}.cp-ed{display:block;font-weight:500;color:var(--accent);font-size:11px}.cp-edit{white-space:nowrap}.se-open{margin:0 0 8px}.se-sec{border:1px solid var(--line);border-radius:12px;padding:10px;margin:0 0 10px;background:var(--surface-2)}';
  document.head.appendChild(css);
})();
