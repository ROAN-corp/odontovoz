/* ===== 1.55: solapa Endodoncia: control del tratamiento de conducto (diagnóstico, conductos y conductometría, sesiones, obturación, radiografías periapicales por etapa y controles) ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc, $ = q => document.querySelector(q);
  if (!A.render || !A.imgAdd || !A.rxRead) return;
  const dmy = d => (A.fmtDMY ? A.fmtDMY(d) : d);
  const DXP = ['Pulpa normal', 'Pulpitis reversible', 'Pulpitis irreversible sintomática', 'Pulpitis irreversible asintomática', 'Necrosis pulpar', 'Previamente tratado', 'Previamente iniciado'];
  const DXA = ['Tejidos periapicales normales', 'Periodontitis apical sintomática', 'Periodontitis apical asintomática', 'Absceso apical agudo', 'Absceso apical crónico (con fístula)', 'Osteítis condensante'];
  const SYS = ['ProTaper Next', 'ProTaper Gold', 'WaveOne Gold', 'Reciproc Blue', 'HyFlex', 'Rotatorio (otro)', 'Reciprocante (otro)', 'Manual'];
  const IRR = ['Hipoclorito 2,5%', 'Hipoclorito 5,25%', 'EDTA 17%', 'Clorhexidina 2%', 'Activación sónica / ultrasónica'];
  const MED = ['Ninguna', 'Hidróxido de calcio', 'Pasta antibiótica', 'Otra'];
  const OBT = ['Condensación lateral', 'Onda continua (vertical caliente)', 'Cono único (biocerámico)', 'Termoplastificada', 'Otra'];
  const REST = ['Provisoria', 'Definitiva directa (composite)', 'Perno + corona', 'Corona', 'Pendiente'];
  const PROG = ['Favorable', 'Reservado', 'Desfavorable'];
  const STG = [['diag', 'Diagnóstica'], ['cond', 'Conductometría'], ['cono', 'Cono maestro'], ['final', 'Obturación final'], ['c6', 'Control 6 meses'], ['c12', 'Control 12 meses'], ['otra', 'Otra']];
  const RES = ['Curación (sin lesión y sin síntomas)', 'En curación', 'Sin cambios', 'Enfermedad persistente'];
  const CHIPS = ['Apertura y exploración', 'Conductometría', 'Instrumentación', 'Medicación intraconducto', 'Obturación', 'Restauración', 'Retratamiento', 'Urgencia (dolor)'];
  const COMP = ['Perforación', 'Instrumento fracturado', 'Conducto calcificado', 'Sobreobturación', 'Fractura radicular', 'Flare-up'];
  const CANALS = ['Único', 'MV', 'MV2', 'DV', 'Palatino', 'Vestibular', 'Lingual', 'Mesial', 'Distal', 'Mesiolingual', 'Mesiovestibular', 'Distovestibular', 'Distolingual'];
  const list = pid => { const pd = A.pd(pid); return pd.endo || (pd.endo = []); };
  const byId = (pid, id) => list(pid).filter(x => x.id === id)[0];
  const opts = (L, v) => '<option value="">—</option>' + L.map(x => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
  const stgName = k => (STG.filter(s => s[0] === k)[0] || [])[1] || '';
  const imgsOf = (pid, x) => (A.pd(pid).images || []).filter(i => i.endo === x.id).sort((a, b) => (a.date < b.date ? -1 : 1));
  const state = x => x.status === 'fin' ? 'Terminado' : x.obtDate ? 'Obturado' : x.canals && x.canals.length ? 'En instrumentación' : 'Iniciado';

  A.render.endoTab = pid => {
    const L = list(pid);
    let h = '<div class="en-wrap"><section class="card"><div class="im-top"><div><h2>Endodoncia <span class="count">' + L.length + '</span></h2><div class="hint" style="margin:2px 0 0">Control del tratamiento de conducto de cada pieza: diagnóstico, conductos, sesiones, obturación, radiografías periapicales y controles.</div></div><div class="row-btns"><button class="btn primary" data-act="enNew">+ Nuevo tratamiento de conducto</button></div></div></section>';
    if (!L.length) h += '<section class="card"><div class="empty">Todavía no hay tratamientos de conducto. Tocá «+ Nuevo tratamiento de conducto» para empezar uno.</div></section>';
    L.slice().sort((a, b) => (a.start || '') < (b.start || '') ? 1 : -1).forEach(x => { h += cardHTML(pid, x); });
    return h + '</div>';
  };
  function cardHTML(pid, x) {
    const ph = imgsOf(pid, x), id = esc(x.id), line = (l, v) => v ? '<div class="im-kv"><span>' + l + '</span><b>' + esc(v) + '</b></div>' : '';
    const bySt = {}; ph.forEach(i => { (bySt[i.etapa || 'otra'] = bySt[i.etapa || 'otra'] || []).push(i); });
    return '<section class="card im-card" data-id="' + id + '"><div class="im-h"><div><h3>Pieza ' + esc(x.tooth) + (x.retreat ? ' · retratamiento' : '') + '</h3><div class="sub"><span class="chip ' + (x.status === 'fin' ? 'ok' : '') + '">' + esc(state(x)) + '</span> inicio ' + dmy(x.start) + (x.obtDate ? ' · obturación ' + dmy(x.obtDate) : '') + '</div></div><div class="row-btns"><button class="btn small" data-act="enEd" data-id="' + id + '">✎ Editar</button><button class="btn small ghost" data-act="enDelAsk" data-id="' + id + '">Borrar</button></div></div>' +
      '<div class="im-grid">' + line('Diagnóstico pulpar', x.dxP) + line('Diagnóstico periapical', x.dxA) + line('Pruebas', x.tests) + line('Anestesia / aislamiento', [x.anest, x.isol].filter(Boolean).join(' · ')) + line('Instrumentación', x.sys) + line('Irrigación', x.irr) + line('Medicación', x.med) + line('Obturación', [x.obt, x.sealer].filter(Boolean).join(' · ')) + line('Restauración', x.rest) + line('Pronóstico', x.prog) + '</div>' +
      /* conductos */
      '<h4 class="im-sub">Conductos y conductometría <span class="count">' + (x.canals || []).length + '</span></h4>' + ((x.canals || []).length ? '<div class="en-tbl"><div class="en-th"><span>Conducto</span><span>Longitud de trabajo</span><span>Referencia</span><span>Lima apical</span><span></span></div>' + x.canals.map(c => '<div class="en-tr"><span>' + esc(c.name) + '</span><span>' + esc(c.wl || '—') + (c.wl ? ' mm' : '') + '</span><span>' + esc(c.ref || '—') + '</span><span>' + esc(c.apical || '—') + '</span><button class="lnk" data-act="enCanalDel" data-id="' + id + '" data-c="' + esc(c.id) + '">quitar</button></div>').join('') + '</div>' : '<p class="hint" style="margin:0">Todavía no hay conductos cargados.</p>') +
      '<div class="im-ctlform"><input id="ecN_' + id + '" list="enCanals" placeholder="Conducto" aria-label="Conducto"><input id="ecW_' + id + '" inputmode="decimal" placeholder="Long. trabajo mm" aria-label="Longitud de trabajo"><input id="ecR_' + id + '" placeholder="Referencia (cúspide, borde…)" aria-label="Punto de referencia"><input id="ecA_' + id + '" placeholder="Lima apical (ej. 25/.06)" aria-label="Lima apical"><button class="btn small primary" data-act="enCanalAdd" data-id="' + id + '">+ Conducto</button></div><datalist id="enCanals">' + CANALS.map(c => '<option>' + c + '</option>').join('') + '</datalist>' +
      /* sesiones */
      '<h4 class="im-sub">Sesiones <span class="count">' + (x.sessions || []).length + '</span></h4>' + ((x.sessions || []).length ? '<ul class="im-ctls">' + x.sessions.map(s => '<li><b>' + dmy(s.date) + '</b> · ' + esc((s.what || []).join(', ') || 'Sesión') + (s.note ? ' · ' + esc(s.note) : '') + '<button class="lnk" data-act="enSesDel" data-id="' + id + '" data-c="' + esc(s.id) + '">quitar</button></li>').join('') + '</ul>' : '') +
      '<div class="en-chips" id="esC_' + id + '">' + CHIPS.map(c => '<button type="button" class="chip-ex" data-act="enChip" aria-pressed="false">' + esc(c) + '</button>').join('') + '</div><div class="im-ctlform"><input type="date" id="esD_' + id + '" value="' + A.today() + '" aria-label="Fecha de la sesión"><input id="esN_' + id + '" placeholder="Nota de la sesión (opcional)"><button class="btn small primary" data-act="enSesAdd" data-id="' + id + '">+ Sesión</button></div>' +
      /* radiografías */
      '<h4 class="im-sub">Radiografías periapicales <span class="count">' + ph.length + '</span></h4><div class="im-up"><select id="euS_' + id + '" aria-label="Etapa">' + STG.map(s => '<option value="' + s[0] + '">' + s[1] + '</option>').join('') + '</select><label class="btn small filebtn">+ Subir<input type="file" accept="' + A.rxAccept + '" multiple hidden data-chg="enRxUp" data-id="' + id + '"></label><span class="hint" style="margin:0">JPG, PNG, BMP o DICOM del radiovisiógrafo</span></div>' +
      (ph.length ? STG.filter(s => bySt[s[0]]).map(s => '<div class="en-stage"><b>' + s[1] + '</b><div class="gallery">' + bySt[s[0]].map(i => '<button class="gal-item" data-act="imOpen" data-id="' + esc(i.id) + '"><img alt="" src="' + esc(i.thumb) + '"><span class="gd">' + dmy(i.date) + '</span></button>').join('') + '</div></div>').join('') : '') +
      /* controles */
      '<h4 class="im-sub">Controles <span class="count">' + (x.ctls || []).length + '</span></h4>' + ((x.ctls || []).length ? '<ul class="im-ctls">' + x.ctls.map(c => '<li><b>' + dmy(c.date) + '</b> · ' + esc(c.res || '—') + (c.note ? ' · ' + esc(c.note) : '') + '<button class="lnk" data-act="enCtlDel" data-id="' + id + '" data-c="' + esc(c.id) + '">quitar</button></li>').join('') + '</ul>' : '') +
      '<div class="im-ctlform"><input type="date" id="ekD_' + id + '" value="' + A.today() + '" aria-label="Fecha del control"><select id="ekR_' + id + '" aria-label="Resultado">' + RES.map(r => '<option>' + r + '</option>').join('') + '</select><input id="ekN_' + id + '" placeholder="Nota (opcional)"><button class="btn small primary" data-act="enCtlAdd" data-id="' + id + '">+ Control</button></div>' +
      ((x.complications || []).length ? '<div class="small-note"><b>Complicaciones:</b> ' + esc(x.complications.join(', ')) + '</div>' : '') + (x.notes ? '<div class="small-note">' + esc(x.notes) + '</div>' : '') + '</section>';
  }
  A.acts.enChip = el => el.setAttribute('aria-pressed', el.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  const upd = (pid, msg) => { A.touchPd(pid); A.refresh(); if (msg) A.toast(msg); };
  const note = (pid, text, date) => A.pd(pid).notes.unshift({ id: A.uid(), date: date || A.today(), pro: A.PAT(pid).pro, text });
  A.acts.enCanalAdd = el => {
    const pid = S.fichaPid, x = byId(pid, el.getAttribute('data-id')); if (!x) return; const v = k => (($('#' + k + '_' + x.id) || {}).value || '').trim(), name = v('ecN'); if (!name) { A.toast('Escribí el nombre del conducto.'); return; }
    (x.canals = x.canals || []).push({ id: A.uid(), name, wl: v('ecW').replace(',', '.'), ref: v('ecR'), apical: v('ecA') }); upd(pid, 'Conducto agregado.');
  };
  A.acts.enCanalDel = el => { const pid = S.fichaPid, x = byId(pid, el.getAttribute('data-id')); if (!x) return; x.canals = (x.canals || []).filter(c => c.id !== el.getAttribute('data-c')); upd(pid); };
  A.acts.enSesAdd = el => {
    const pid = S.fichaPid, x = byId(pid, el.getAttribute('data-id')); if (!x) return; const w = Array.prototype.slice.call(document.querySelectorAll('#esC_' + x.id + ' [aria-pressed="true"]')).map(b => b.textContent), date = ($('#esD_' + x.id) || {}).value || A.today(), n = (($('#esN_' + x.id) || {}).value || '').trim();
    (x.sessions = x.sessions || []).push({ id: A.uid(), date, what: w, note: n }); x.sessions.sort((a, b) => (a.date < b.date ? -1 : 1));
    if (w.indexOf('Obturación') >= 0 && !x.obtDate) x.obtDate = date;
    note(pid, 'Endodoncia pieza ' + x.tooth + ': ' + (w.join(', ') || 'sesión') + '.' + (n ? ' ' + n : ''), date); upd(pid, 'Sesión agregada y anotada en la evolución.');
  };
  A.acts.enSesDel = el => { const pid = S.fichaPid, x = byId(pid, el.getAttribute('data-id')); if (!x) return; x.sessions = (x.sessions || []).filter(c => c.id !== el.getAttribute('data-c')); upd(pid); };
  A.acts.enCtlAdd = el => {
    const pid = S.fichaPid, x = byId(pid, el.getAttribute('data-id')); if (!x) return; const date = ($('#ekD_' + x.id) || {}).value || A.today(), res = ($('#ekR_' + x.id) || {}).value, n = (($('#ekN_' + x.id) || {}).value || '').trim();
    (x.ctls = x.ctls || []).push({ id: A.uid(), date, res, note: n }); x.ctls.sort((a, b) => (a.date < b.date ? -1 : 1));
    note(pid, 'Control de endodoncia pieza ' + x.tooth + ': ' + res + '.' + (n ? ' ' + n : ''), date); upd(pid, 'Control agregado y anotado en la evolución.');
  };
  A.acts.enCtlDel = el => { const pid = S.fichaPid, x = byId(pid, el.getAttribute('data-id')); if (!x) return; x.ctls = (x.ctls || []).filter(c => c.id !== el.getAttribute('data-c')); upd(pid); };
  A.chg.enRxUp = async el => {
    const pid = S.fichaPid, x = byId(pid, el.getAttribute('data-id')), files = Array.prototype.slice.call(el.files || []); if (!x || !files.length) return;
    const etapa = ($('#euS_' + x.id) || {}).value || 'diag'; let n = 0; A.toast('Procesando ' + files.length + ' radiografía' + (files.length === 1 ? '' : 's') + '…');
    for (const f of files) { try { const r = await A.rxRead(f), it = await A.imgAdd(pid, { kind: 'rx-peri', tooth: parseInt(x.tooth, 10) || null, note: 'Endodoncia · ' + stgName(etapa) }, r.full, r.thumb); it.endo = x.id; it.etapa = etapa; n++; } catch (e) { A.toast(A.rxMsg(e)); } }
    el.value = ''; if (n) upd(pid, n + ' radiografía' + (n === 1 ? '' : 's') + ' agregada' + (n === 1 ? '' : 's') + ' (' + stgName(etapa) + ').');
  };
  A.acts.enDelAsk = el => { S.modal = { type: 'enDelAsk', pid: S.fichaPid, id: el.getAttribute('data-id') }; A.renderModal(); };
  MF.enDelAsk = m => A.modalShell('Borrar el tratamiento de conducto', '<p>Se borra el registro de la pieza ' + esc((byId(m.pid, m.id) || {}).tooth || '') + '. Las radiografías siguen en «Fotos y radiografías».</p>', '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn danger" data-act="enDelGo">Borrar</button>');
  A.acts.enDelGo = () => { const m = S.modal, pd = A.pd(m.pid); pd.endo = list(m.pid).filter(x => x.id !== m.id); (pd.images || []).forEach(i => { if (i.endo === m.id) { delete i.endo; delete i.etapa; } }); S.modal = null; A.renderModal(); upd(m.pid, 'Tratamiento borrado.'); };

  /* ---------- alta y edición ---------- */
  A.acts.enNew = () => { S.modal = { type: 'enEd', pid: S.fichaPid, f: { id: A.uid(), isNew: true, start: A.today(), isol: 'Aislamiento absoluto (dique de goma)' } }; A.renderModal(); };
  A.acts.enEd = el => { const x = byId(S.fichaPid, el.getAttribute('data-id')); if (!x) return; S.modal = { type: 'enEd', pid: S.fichaPid, f: JSON.parse(JSON.stringify(x)) }; A.renderModal(); };
  MF.enEd = m => {
    const f = m.f, F = (k, l, ph, t) => '<div class="field"><label for="ee_' + k + '">' + l + '</label><input id="ee_' + k + '" ' + (t ? 'type="' + t + '" ' : '') + 'value="' + esc(f[k] || '') + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '></div>';
    const SEL = (k, l, L) => '<div class="field"><label for="ee_' + k + '">' + l + '</label><select id="ee_' + k + '">' + opts(L, f[k]) + '</select></div>';
    const b = '<h4 class="im-sub">Pieza y diagnóstico</h4><div class="row3">' + F('tooth', 'Pieza (FDI)', 'Ej.: 36') + F('start', 'Fecha de inicio', '', 'date') + '<label class="chk" style="align-self:end"><input type="checkbox" id="ee_retreat"' + (f.retreat ? ' checked' : '') + '> Es un retratamiento</label></div>' +
      '<div class="row2">' + SEL('dxP', 'Diagnóstico pulpar', DXP) + SEL('dxA', 'Diagnóstico periapical', DXA) + '</div><div class="field"><label for="ee_tests">Pruebas (frío, calor, percusión, palpación, movilidad, sondaje)</label><input id="ee_tests" value="' + esc(f.tests || '') + '" placeholder="Ej.: frío +, percusión vertical +, sondaje normal"></div>' +
      '<h4 class="im-sub">Procedimiento</h4><div class="row2">' + F('anest', 'Anestesia', 'Ej.: articaína 4% 1:100.000, 1 carpule') + F('isol', 'Aislamiento', '') + '</div><div class="row2">' + SEL('sys', 'Instrumentación', SYS) + F('irr', 'Irrigación', 'Hipoclorito 5,25% + EDTA 17%') + '</div><div class="row3">' + SEL('med', 'Medicación intraconducto', MED) + SEL('obt', 'Técnica de obturación', OBT) + F('sealer', 'Sellador', 'Ej.: AH Plus, biocerámico') + '</div><div class="row3">' + F('obtDate', 'Fecha de obturación', '', 'date') + SEL('rest', 'Restauración', REST) + SEL('prog', 'Pronóstico', PROG) + '</div>' +
      '<div class="field"><label>Complicaciones</label><div class="en-chips" id="eeComp">' + COMP.map(c => '<button type="button" class="chip-ex" data-act="enChip" aria-pressed="' + ((f.complications || []).indexOf(c) >= 0) + '">' + c + '</button>').join('') + '</div></div>' +
      '<div class="row2"><div class="field"><label for="ee_status">Estado</label><select id="ee_status"><option value="act"' + (f.status !== 'fin' ? ' selected' : '') + '>En tratamiento</option><option value="fin"' + (f.status === 'fin' ? ' selected' : '') + '>Terminado</option></select></div></div>' +
      '<div class="field"><label for="ee_notes">Notas</label><textarea id="ee_notes" rows="3">' + esc(f.notes || '') + '</textarea></div><div id="eeMsg" class="hint bad"></div>';
    return A.modalShell(f.isNew ? 'Nuevo tratamiento de conducto' : 'Endodoncia pieza ' + (f.tooth || ''), b, '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="enSave">Guardar</button>', true);
  };
  A.acts.enSave = () => {
    const m = S.modal, f = m.f, g = k => (($('#ee_' + k) || {}).value || '').trim();
    ['tooth', 'start', 'dxP', 'dxA', 'tests', 'anest', 'isol', 'sys', 'irr', 'med', 'obt', 'sealer', 'obtDate', 'rest', 'prog', 'status', 'notes'].forEach(k => { f[k] = g(k); }); f.retreat = !!($('#ee_retreat') || {}).checked;
    f.complications = Array.prototype.slice.call(document.querySelectorAll('#eeComp [aria-pressed="true"]')).map(b => b.textContent);
    const t = parseInt(f.tooth, 10); if (!t || !A.P.validTooth(t)) { $('#eeMsg').textContent = 'Escribí una pieza válida (FDI, por ejemplo 36).'; return; }
    f.tooth = String(t); const L = list(m.pid), i = L.findIndex(x => x.id === f.id), isNew = f.isNew; delete f.isNew;
    if (i >= 0) L[i] = Object.assign({}, L[i], f); else L.push(Object.assign({ canals: [], sessions: [], ctls: [] }, f));
    if (isNew) note(m.pid, 'Se inicia tratamiento de conducto' + (f.retreat ? ' (retratamiento)' : '') + ' en la pieza ' + f.tooth + (f.dxP ? '. Diagnóstico: ' + f.dxP + (f.dxA ? ' / ' + f.dxA : '') : '') + '.', f.start);
    S.modal = null; A.renderModal(); upd(m.pid, 'Tratamiento guardado.');
  };

  const css = document.createElement('style'); css.id = 'ovApp139';
  css.textContent = '.en-tbl{border:1px solid var(--line);border-radius:10px;overflow:hidden;margin:6px 0;font-size:.88rem}.en-th,.en-tr{display:grid;grid-template-columns:1.1fr 1.2fr 1.4fr 1.1fr auto;gap:8px;padding:7px 10px;align-items:center}.en-th{background:var(--surface-2);color:var(--ink-2);font-size:.75rem;font-weight:700}.en-tr{border-top:1px solid var(--line)}' +
    '.en-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.en-chips .chip-ex[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}.en-stage{margin:6px 0}.en-stage>b{font-size:.82rem;color:var(--ink-2)}@media (max-width:560px){.en-th,.en-tr{grid-template-columns:1fr 1fr 1fr auto}.en-th span:nth-child(3),.en-tr span:nth-child(3){display:none}}';
  document.head.appendChild(css);
})();
