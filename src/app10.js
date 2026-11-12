/* ===== v6.5: motivo de la consulta (en la ficha, arriba del resumen, al dar turno y por voz) ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, C = window.OVCmd;
  A.VERSION = '1.49.0';
  const UC = s => { s = String(s || '').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };

  /* el motivo vive en la historia del paciente; los anteriores quedan como historial */
  A.setMotivo = (pid, text, src) => {
    text = UC(String(text || '').replace(/^(?:de (?:la )?consulta|es|:)\s*/i, '').replace(/[.\s]+$/, ''));
    const pd = A.pd(pid), hc = pd.hc;
    if (!text) { hc.motivo = ''; A.touchPd(pid); return ''; }
    if (hc.motivo && hc.motivo !== text) (hc.motivos = hc.motivos || []).unshift({ t: hc.motivo, d: hc.motivoDate || null });
    hc.motivo = text; hc.motivoDate = A.today();
    pd.notes.unshift({ id: A.uid(), date: A.today(), pro: A.PAT(pid).pro, text: 'Motivo de consulta: ' + text + '.', auto: true });
    A.touchPd(pid); return text;
  };
  const motivoOf = pid => { const hc = A.pd(pid).hc || {}; return hc.motivo || ''; };

  /* bloque destacado: va arriba del resumen del paciente y del turno */
  function motivoBlock(pid, editable) {
    const hc = A.pd(pid).hc || {}, m = hc.motivo;
    return '<div class="block motivo-block' + (m ? '' : ' empty') + '"><div class="mv-top"><h3>Motivo de la consulta</h3>' + (editable ? '<button class="btn small" data-act="motivoEdit" data-pid="' + pid + '">' + (m ? 'Cambiar' : '+ Cargar') + '</button>' : '') + '</div>' +
      (m ? '<p class="mv-txt">' + esc(m) + '</p><span class="hint" style="margin:0">' + (hc.motivoDate ? 'Cargado el ' + A.fmtDMY(hc.motivoDate) : '') + ((hc.motivos || []).length ? ' · ' + hc.motivos.length + ' anteriores' : '') + '</span>' : '<span class="hint" style="margin:0">Sin motivo cargado. Preguntale al paciente qué lo trae y anotalo (o decí «motivo de consulta…»).</span>') + '</div>';
  }
  const origSum = A.patSummaryHTML;
  A.patSummaryHTML = (pid, opt) => motivoBlock(pid, true) + origSum(pid, opt);

  /* en los paneles (resumen del paciente y del turno) el motivo va primero, debajo del nombre */
  const origPanel = A.renderPanel;
  A.renderPanel = () => {
    origPanel();
    const head = $('#panelHost .panel-head'), mb = $('#panelHost .motivo-block');
    if (head && mb) head.insertAdjacentElement('afterend', mb);
  };
  /* ficha: arriba de todo en «Datos e historia», y una línea bajo el nombre en todas las pestañas */
  const origFicha = A.render.ficha;
  A.render.ficha = () => {
    origFicha();
    const pid = S.fichaPid, m = motivoOf(pid), sub = $('#view-ficha .fh .sub');
    if (sub && !$('#view-ficha .mv-line')) sub.insertAdjacentHTML('afterend', '<div class="mv-line"><b>Motivo:</b> ' + (m ? esc(m) : '<span class="hint" style="margin:0">sin cargar</span>') + ' <button class="link" data-act="motivoEdit" data-pid="' + pid + '">' + (m ? 'cambiar' : 'cargar') + '</button></div>');
    if (S.fichaTab === 'datos') { const body = $('#fichaBody'); if (body) body.insertAdjacentHTML('afterbegin', '<section class="card mv-card">' + motivoBlock(pid, true).replace('class="block motivo-block', 'class="motivo-block') + historyHTML(pid) + '</section>'); }
  };
  function historyHTML(pid) {
    const l = A.pd(pid).hc.motivos || []; if (!l.length) return '';
    return '<details class="mv-hist"><summary>Motivos anteriores (' + l.length + ')</summary>' + l.map(x => '<div class="finding"><span>' + esc(x.t) + '</span><span class="mono">' + (x.d ? A.fmtDMY(x.d) : '') + '</span></div>').join('') + '</details>';
  }

  /* cargar o cambiar el motivo */
  A.acts.motivoEdit = el => { const pid = el.getAttribute('data-pid'); S.modal = { type: 'motivo', pid, back: S.modal }; A.renderModal(); const t = $('#mvTxt'); if (t) t.focus(); };
  MF.motivo = m => {
    const cur = motivoOf(m.pid), ex = ['Dolor en una muela', 'Control', 'Limpieza', 'Se le rompió un diente', 'Sangrado de encías', 'Estética / blanqueamiento', 'Prótesis', 'Urgencia'];
    return A.modalShell('Motivo de la consulta · ' + A.PAT(m.pid).name,
      '<div class="field"><label for="mvTxt">¿Qué lo trae a la consulta? (con sus palabras)</label><textarea id="mvTxt" rows="3" placeholder="Ej.: Dolor en la muela de abajo a la izquierda desde hace 3 días, peor con el frío">' + esc(cur) + '</textarea></div>' +
      '<div class="row-btns"><button class="btn small" data-act="dictate" data-target="#mvTxt">' + A.MIC + ' Dictar</button></div>' +
      '<div class="chips-ex" style="margin:0">' + ex.map(x => '<button class="chip-ex" data-act="mvChip" data-v="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>',
      '<button class="btn" data-act="mvCancel">Cancelar</button><button class="btn primary" data-act="motSave">Guardar motivo</button>');
  };
  A.acts.mvChip = el => { const t = $('#mvTxt'); if (t) { t.value = el.getAttribute('data-v'); t.focus(); } };
  A.acts.mvCancel = () => { const b = S.modal.back; S.modal = b || null; A.renderModal(); };
  A.acts.motSave = () => { const m = S.modal, v = A.setMotivo(m.pid, $('#mvTxt').value); S.modal = m.back || null; A.renderModal(); A.refresh(); if (S.panel) A.renderPanel(); A.toast(v ? 'Motivo guardado: ' + v : 'Motivo borrado.'); };

  /* paciente nuevo: campo de motivo */
  const origPat = MF.patient;
  MF.patient = m => origPat(m).replace('<div id="npMsg"', '<div class="field"><label for="npMot">Motivo de la consulta</label><input id="npMot" placeholder="Ej.: dolor en una muela"></div><div id="npMsg"');
  const origNp = A.acts.npSave;
  A.acts.npSave = () => { const mot = ($('#npMot') || {}).value || ''; origNp(); if (mot.trim() && S.fichaPid) { A.setMotivo(S.fichaPid, mot); A.refresh(); } };

  /* nuevo turno: motivo opcional (queda en el paciente y en el turno) */
  A.wrapNewAppt = (m, h) => h.replace('<div id="naMsg"', '<div class="field"><label for="naMot">Motivo de la consulta (opcional)</label><input id="naMot" value="' + esc((m.f && m.f.mot) || '') + '" placeholder="Ej.: dolor, control, se le salió un arreglo"></div><div id="naMsg"');
  ['naPick', 'naClear', 'naNew', 'naCreate'].forEach(k => { const o = A.acts[k]; if (o) A.acts[k] = (el, ev) => { if (S.modal && S.modal.f && $('#naMot')) S.modal.f.mot = $('#naMot').value; o(el, ev); }; });
  const origNaSave = A.acts.naSave;
  A.acts.naSave = (el, ev) => {
    const f = S.modal && S.modal.f, mot = ($('#naMot') || {}).value || (f && f.mot) || '';
    origNaSave(el, ev);
    if (mot.trim() && f && f.pid && !S.modal) {
      const a = A.day(f.date).filter(x => x.pid === f.pid && x.start === f.start)[0]; if (a) { a.motivo = UC(mot); A.S.dirtyDays[f.date] = 1; }
      A.setMotivo(f.pid, mot); A.save(); A.refresh();
    }
  };

  /* por voz: «motivo de consulta: dolor en la muela de abajo» (en la ficha o con un paciente abierto) */
  const parsePrev = C.parse;
  C.parse = (text, ctx) => {
    const c = C.clean(A.fixAsr ? A.fixAsr(text) : text); let m;
    if ((m = /^(?:el )?motivo(?: de (?:la )?consulta)?(?: es| fue|:)?\s+(.+)$/.exec(c)) || (m = /^(?:viene|vino|consulta) (?:por|para)\s+(.+)$/.exec(c))) return { intent: 'motivo', text: m[1] };
    return parsePrev(text, ctx);
  };
  const execPrev = A.cmd.exec;
  A.cmd.exec = (text, opts) => {
    let pr = null; try { pr = C.parse(text, { today: A.today(), pros: A.PROS }); } catch (e) { pr = null; }
    if (pr && pr.intent === 'motivo') {
      /* se conserva el texto con sus tildes tal como se dijo o escribió */
      { const N = A.norm, o = String(A._lastRaw && N(A._lastRaw).indexOf(N(pr.text)) >= 0 ? A._lastRaw : text).replace(/[.,;:]+$/, '').trim().split(/\s+/), k = pr.text.split(' ').length, cand = o.slice(-k).join(' '); if (N(cand) === N(pr.text)) pr.text = cand; }
      if (S.modal && S.modal.type === 'patient') { const i = $('#npMot'); if (i) { i.value = UC(pr.text); return { ok: true, msg: 'Motivo: ' + UC(pr.text) + '.' }; } }
      if (S.modal && S.modal.type === 'newAppt') { const i = $('#naMot'); if (i) { i.value = UC(pr.text); S.modal.f.mot = i.value; return { ok: true, msg: 'Motivo: ' + i.value + '.' }; } }
      const pid = A.curPid(); if (!pid) return { ok: false, msg: 'Abrí primero la ficha del paciente.' };
      const v = A.setMotivo(pid, pr.text); A.refresh(); if (S.panel) A.renderPanel();
      return { ok: true, msg: 'Motivo de consulta de ' + A.PAT(pid).first + ': ' + v + '.' };
    }
    return execPrev(text, opts);
  };

  /* en la agenda: el motivo del turno se ve en el bloque cuando no hay motivo propio del turno */
  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '.motivo-block{border:2px solid var(--accent);background:var(--accent-soft);border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:4px}.motivo-block.empty{border-style:dashed;background:var(--surface)}' +
    '.mv-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.mv-top h3{margin:0}.mv-txt{margin:0;font-size:17px;font-weight:700;line-height:1.35}' +
    '.mv-card{display:flex;flex-direction:column;gap:8px}.mv-card .motivo-block{border-width:2px}.mv-line{margin-top:4px;font-size:14px}.mv-line .link{font-size:13px;margin-left:4px}.mv-hist summary{cursor:pointer;color:var(--ink-2);font-size:13px}' +
    '</style>');
})();
