/* ===== 1.55: solapa Implantes (planificación, cirugía, prótesis, controles, trazabilidad y tarjeta del implante) + lectura de radiografías de radiovisiógrafo (JPG, PNG, BMP y DICOM) ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc, $ = q => document.querySelector(q);
  if (!A.render || !A.imgAdd) return;
  const dmy = d => (A.fmtDMY ? A.fmtDMY(d) : d);

  /* ---------- radiografías de radiovisiógrafo: JPG, PNG, BMP y DICOM sin comprimir ---------- */
  const readBuf = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('lectura')); r.readAsArrayBuffer(f); });
  function dicomToCanvas(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf); let off = (u8.length > 132 && String.fromCharCode(u8[128], u8[129], u8[130], u8[131]) === 'DICM') ? 132 : 0;
    const T = { rows: 0, cols: 0, bits: 16, rep: 0, photo: 'MONOCHROME2', spp: 1, wc: null, ww: null, ts: '1.2.840.10008.1.2.1', slope: 1, inter: 0 }; let px = null;
    const str = (o, l) => String.fromCharCode.apply(null, u8.subarray(o, o + l)).replace(/[\0 ]+$/, '');
    const LONG = { OB: 1, OW: 1, OF: 1, SQ: 1, UT: 1, UN: 1, OD: 1, OL: 1, UC: 1, UR: 1 };
    while (off + 8 <= u8.length) {
      const g = dv.getUint16(off, true), e = dv.getUint16(off + 2, true), vr = String.fromCharCode(u8[off + 4], u8[off + 5]), ex = /^[A-Z]{2}$/.test(vr);
      let len, hdr; if (ex) { if (LONG[vr]) { len = dv.getUint32(off + 8, true); hdr = 12; } else { len = dv.getUint16(off + 6, true); hdr = 8; } } else { len = dv.getUint32(off + 4, true); hdr = 8; }
      if (g === 0x7FE0 && e === 0x0010) { if (len === 0xFFFFFFFF) throw new Error('compr'); px = off + hdr; T.pxLen = len; break; }
      if (len === 0xFFFFFFFF) { /* secuencia de largo indefinido: se salta hasta su delimitador */ let k = off + hdr; while (k + 8 <= u8.length && !(dv.getUint16(k, true) === 0xFFFE && dv.getUint16(k + 2, true) === 0xE0DD)) k++; off = k + 8; continue; }
      const v = off + hdr;
      if (g === 0x0028) { if (e === 0x0010) T.rows = dv.getUint16(v, true); else if (e === 0x0011) T.cols = dv.getUint16(v, true); else if (e === 0x0100) T.bits = dv.getUint16(v, true); else if (e === 0x0103) T.rep = dv.getUint16(v, true); else if (e === 0x0004) T.photo = str(v, len); else if (e === 0x0002) T.spp = dv.getUint16(v, true); else if (e === 0x1050) T.wc = parseFloat(str(v, len).split('\\')[0]); else if (e === 0x1051) T.ww = parseFloat(str(v, len).split('\\')[0]); else if (e === 0x1052) T.inter = parseFloat(str(v, len)) || 0; else if (e === 0x1053) T.slope = parseFloat(str(v, len)) || 1; }
      if (g === 0x0002 && e === 0x0010) T.ts = str(v, len);
      off = v + len;
    }
    if (px == null || !T.rows || !T.cols) throw new Error('dicom');
    if (!/^1\.2\.840\.10008\.1\.2(\.1)?$/.test(T.ts)) throw new Error('compr');
    if (T.spp !== 1) throw new Error('color');
    const n = T.rows * T.cols, out = new Float32Array(n); let mn = Infinity, mx = -Infinity;
    if (T.bits === 8) for (let i = 0; i < n; i++) { const v = u8[px + i] * T.slope + T.inter; out[i] = v; if (v < mn) mn = v; if (v > mx) mx = v; }
    else for (let i = 0; i < n; i++) { let v = T.rep ? dv.getInt16(px + i * 2, true) : dv.getUint16(px + i * 2, true); v = v * T.slope + T.inter; out[i] = v; if (v < mn) mn = v; if (v > mx) mx = v; }
    let lo = mn, hi = mx;
    if (T.wc != null && T.ww > 0) { lo = T.wc - T.ww / 2; hi = T.wc + T.ww / 2; }
    else { const h = new Uint32Array(1024), k = (mx - mn) || 1; for (let i = 0; i < n; i++) h[Math.min(1023, Math.floor((out[i] - mn) / k * 1023))]++; let a = 0, b = 0, c = 0; for (; a < 1024; a++) { c += h[a]; if (c >= n * 0.005) break; } c = 0; for (b = 1023; b > 0; b--) { c += h[b]; if (c >= n * 0.005) break; } lo = mn + a / 1023 * k; hi = mn + b / 1023 * k; }
    const cv = document.createElement('canvas'); cv.width = T.cols; cv.height = T.rows; const g2 = cv.getContext('2d'), im = g2.createImageData(T.cols, T.rows), d = im.data, sp = (hi - lo) || 1, inv = T.photo === 'MONOCHROME1';
    for (let i = 0; i < n; i++) { let t = (out[i] - lo) / sp; t = t < 0 ? 0 : t > 1 ? 1 : t; if (inv) t = 1 - t; const q = Math.round(t * 255); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = q; d[i * 4 + 3] = 255; }
    g2.putImageData(im, 0, 0); return cv;
  }
  const canvasJpg = (cv, max, q) => { const k = Math.min(1, max / Math.max(cv.width, cv.height)), c = document.createElement('canvas'); c.width = Math.round(cv.width * k); c.height = Math.round(cv.height * k); c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q); };
  const fileJpg = (file, max, q) => new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', q)); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); }; im.src = u; });
  /* un archivo de radiografía → imagen de trabajo y miniatura */
  A.rxRead = async file => {
    const isDcm = /\.(dcm|dicom)$/i.test(file.name) || file.type === 'application/dicom';
    if (isDcm) { const cv = dicomToCanvas(await readBuf(file)); return { full: canvasJpg(cv, 1600, 0.88), thumb: canvasJpg(cv, 160, 0.6) }; }
    return { full: await fileJpg(file, 1600, 0.85), thumb: await fileJpg(file, 160, 0.6) };
  };
  A.rxMsg = e => /compr/.test(String(e && e.message)) ? 'Ese DICOM está comprimido y no se puede abrir. En el programa del sensor exportalo como JPG o PNG.' : /color/.test(String(e && e.message)) ? 'Ese DICOM es a color: exportalo como JPG.' : 'No se pudo leer el archivo. Probá con JPG, PNG, BMP o DICOM sin comprimir (si es TIFF, exportalo como JPG).';
  A.rxAccept = 'image/*,.dcm,.dicom,.bmp';

  /* ---------- Implantes ---------- */
  const STAGES = [['plan', 'Planificación'], ['cirugia', 'Cirugía'], ['oseo', 'Oseointegración'], ['segunda', 'Segunda etapa'], ['protesis', 'Prótesis'], ['mant', 'Mantenimiento']];
  const BRANDS = ['Straumann', 'Nobel Biocare', 'Zimmer Biomet', 'Dentsply Sirona (Astra, Xive)', 'Neodent', 'MIS', 'Osstem', 'Bioner', 'Implacil De Bortoli', 'Cortex', 'SIN', 'Otro'];
  const TECH = ['Diferido (cicatrización completa)', 'Inmediato post-extracción', 'Inmediato con carga inmediata', 'Guiado (cirugía guiada)'];
  const BONE = ['D1', 'D2', 'D3', 'D4'];
  const SINUS = ['No', 'Elevación de seno lateral', 'Elevación de seno crestal'];
  const HEAL = ['Sumergido (tapa de cierre)', 'Transmucoso (pilar de cicatrización)'];
  const PTYPE = ['Corona atornillada', 'Corona cementada', 'Puente sobre implantes', 'Sobredentadura (locator / barra)', 'Prótesis híbrida', 'Provisoria inmediata'];
  const KRX = [['rx-peri', 'Periapical'], ['rx-pano', 'Panorámica'], ['estudio', 'Tomografía / CBCT'], ['intra', 'Foto intraoral']];
  const list = pid => { const pd = A.pd(pid); return pd.impl || (pd.impl = []); };
  const byId = (pid, id) => list(pid).filter(x => x.id === id)[0];
  const opts = (L, v) => '<option value="">—</option>' + L.map(x => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
  const stageOf = x => x.final ? 'mant' : x.provisional || x.abutDate ? 'protesis' : x.secondDate ? 'segunda' : x.surgDate && x.surgDate <= A.today() ? (x.surgDate > A.add(A.today(), -90) ? 'oseo' : 'oseo') : x.surgDate ? 'cirugia' : 'plan';
  const stageName = k => (STAGES.filter(s => s[0] === k)[0] || [])[1] || '';
  const nextCtl = x => { if (!x.final) return null; const m = [1, 3, 6, 12], done = (x.ctls || []).length; return done < m.length ? { when: A.add(x.final, m[done] * 30), label: 'control a los ' + m[done] + (m[done] === 1 ? ' mes' : ' meses') } : { when: A.add((x.ctls[x.ctls.length - 1] || {}).date || x.final, 365), label: 'control anual' }; };
  const imgsOf = (pid, x) => (A.pd(pid).images || []).filter(i => i.impl === x.id).sort((a, b) => (a.date < b.date ? 1 : -1));

  A.render.implantesTab = pid => {
    const L = list(pid);
    let h = '<div class="im-wrap"><section class="card"><div class="im-top"><div><h2>Implantes <span class="count">' + L.length + '</span></h2><div class="hint" style="margin:2px 0 0">Planificación, cirugía, prótesis y controles de cada implante, con la marca y el lote para la trazabilidad.</div></div><div class="row-btns"><button class="btn primary" data-act="imNew">+ Nuevo implante</button>' + (L.length ? '<button class="btn" data-act="imCard">Tarjeta del implante (PDF)</button>' : '') + '</div></div></section>';
    if (!L.length) h += '<section class="card"><div class="empty">Todavía no hay implantes. Tocá «+ Nuevo implante» para planificar o registrar uno.</div></section>';
    L.slice().sort((a, b) => (a.surgDate || a.plannedDate || '') < (b.surgDate || b.plannedDate || '') ? 1 : -1).forEach(x => h += cardHTML(pid, x));
    return h + '</div>';
  };
  function cardHTML(pid, x) {
    const st = stageOf(x), idx = STAGES.map(s => s[0]).indexOf(st), nx = nextCtl(x), ph = imgsOf(pid, x), dim = [x.diam && x.diam + ' mm', x.len && x.len + ' mm'].filter(Boolean).join(' × ');
    const line = (l, v) => v ? '<div class="im-kv"><span>' + l + '</span><b>' + esc(v) + '</b></div>' : '';
    return '<section class="card im-card" data-id="' + esc(x.id) + '"><div class="im-h"><div><h3>Pieza ' + esc(x.tooth || '—') + ' · ' + esc([x.brand, x.line].filter(Boolean).join(' ') || 'Implante') + (dim ? ' ' + esc(dim) : '') + '</h3><div class="sub">' + esc(stageName(st)) + (x.surgDate ? ' · cirugía ' + dmy(x.surgDate) : x.plannedDate ? ' · planificado para ' + dmy(x.plannedDate) : '') + '</div></div>' +
      '<div class="row-btns"><button class="btn small" data-act="imEd" data-id="' + esc(x.id) + '">✎ Editar</button><button class="btn small ghost" data-act="imDel2" data-id="' + esc(x.id) + '">Borrar</button></div></div>' +
      '<ol class="im-steps">' + STAGES.map((s, i) => '<li class="' + (i < idx ? 'done' : i === idx ? 'on' : '') + '">' + esc(s[1]) + '</li>').join('') + '</ol>' +
      '<div class="im-grid">' + line('Lote / REF', [x.lot, x.ref].filter(Boolean).join(' · ')) + line('Técnica', x.tech) + line('Hueso', x.bone) + line('Torque de inserción', x.torque ? x.torque + ' Ncm' : '') + line('ISQ', x.isq) + line('Injerto / seno', [x.graft, x.sinus && x.sinus !== 'No' ? x.sinus : ''].filter(Boolean).join(' · ')) + line('Cicatrización', x.heal) + line('Pilar', [x.abutType, x.abutTorque ? x.abutTorque + ' Ncm' : ''].filter(Boolean).join(' · ')) + line('Prótesis', [x.ptype, x.pmat].filter(Boolean).join(' · ')) + line('Entrega', x.final ? dmy(x.final) : '') + '</div>' +
      (nx ? '<div class="im-next">Próximo: ' + esc(nx.label) + ' ≈ <b>' + dmy(nx.when) + '</b></div>' : '') +
      '<h4 class="im-sub">Controles <span class="count">' + (x.ctls || []).length + '</span></h4>' + ((x.ctls || []).length ? '<ul class="im-ctls">' + x.ctls.map(c => '<li><b>' + dmy(c.date) + '</b> · sondaje ' + esc(c.probing || '—') + ' mm' + (c.bleed ? ' · sangrado' : '') + (c.mob ? ' · movilidad' : '') + (c.bone ? ' · pérdida ósea ' + esc(c.bone) + ' mm' : '') + (c.note ? ' · ' + esc(c.note) : '') + '<button class="lnk" data-act="imCtlDel" data-id="' + esc(x.id) + '" data-c="' + esc(c.id) + '">quitar</button></li>').join('') + '</ul>' : '<p class="hint" style="margin:0">Todavía no hay controles.</p>') +
      '<div class="im-ctlform"><input type="date" id="icD_' + esc(x.id) + '" value="' + A.today() + '" aria-label="Fecha del control"><input id="icP_' + esc(x.id) + '" inputmode="decimal" placeholder="Sondaje mm" aria-label="Sondaje en milímetros"><input id="icB_' + esc(x.id) + '" inputmode="decimal" placeholder="Pérdida ósea mm" aria-label="Pérdida ósea en milímetros"><label class="chk"><input type="checkbox" id="icS_' + esc(x.id) + '"> Sangrado</label><label class="chk"><input type="checkbox" id="icM_' + esc(x.id) + '"> Movilidad</label><input id="icN_' + esc(x.id) + '" placeholder="Nota (opcional)"><button class="btn small primary" data-act="imCtlAdd" data-id="' + esc(x.id) + '">+ Control</button></div>' +
      '<h4 class="im-sub">Radiografías, tomografías y fotos <span class="count">' + ph.length + '</span></h4><div class="im-up"><select id="iuK_' + esc(x.id) + '" aria-label="Tipo de imagen">' + KRX.map(k => '<option value="' + k[0] + '">' + k[1] + '</option>').join('') + '</select><label class="btn small filebtn">+ Subir<input type="file" accept="' + A.rxAccept + '" multiple hidden data-chg="imRxUp" data-id="' + esc(x.id) + '"></label></div>' +
      (ph.length ? '<div class="gallery">' + ph.map(i => '<button class="gal-item" data-act="imOpen" data-id="' + esc(i.id) + '"><img alt="" src="' + esc(i.thumb) + '"><span class="gk">' + esc(A.IMG_KINDS[i.kind] || '') + '</span><span class="gd">' + dmy(i.date) + '</span></button>').join('') + '</div>' : '') +
      (x.notes ? '<div class="small-note">' + esc(x.notes) + '</div>' : '') + '</section>';
  }
  A.chg.imRxUp = async el => {
    const pid = S.fichaPid, x = byId(pid, el.getAttribute('data-id')), files = Array.prototype.slice.call(el.files || []); if (!x || !files.length) return;
    const kind = ($('#iuK_' + x.id) || {}).value || 'rx-peri'; let n = 0;
    A.toast('Procesando ' + files.length + ' imagen' + (files.length === 1 ? '' : 'es') + '…');
    for (const f of files) { try { const r = await A.rxRead(f), it = await A.imgAdd(pid, { kind, tooth: parseInt(x.tooth, 10) || null, note: 'Implante pieza ' + (x.tooth || '') }, r.full, r.thumb); it.impl = x.id; n++; } catch (e) { A.toast(A.rxMsg(e)); } }
    el.value = ''; if (n) { A.touchPd(pid); A.refresh(); A.toast(n + ' imagen' + (n === 1 ? '' : 'es') + ' agregada' + (n === 1 ? '' : 's') + ' al implante.'); }
  };
  A.acts.imCtlAdd = el => {
    const pid = S.fichaPid, x = byId(pid, el.getAttribute('data-id')); if (!x) return; const v = k => ($('#' + k + '_' + x.id) || {});
    const c = { id: A.uid(), date: v('icD').value || A.today(), probing: v('icP').value.trim(), bone: v('icB').value.trim(), bleed: !!v('icS').checked, mob: !!v('icM').checked, note: v('icN').value.trim() };
    (x.ctls = x.ctls || []).push(c); x.ctls.sort((a, b) => (a.date < b.date ? -1 : 1)); A.touchPd(pid);
    const pd = A.pd(pid); pd.notes.unshift({ id: A.uid(), date: c.date, pro: A.PAT(pid).pro, text: 'Control de implante pieza ' + (x.tooth || '') + ': sondaje ' + (c.probing || '—') + ' mm' + (c.bleed ? ', sangrado' : ', sin sangrado') + (c.mob ? ', con movilidad' : ', sin movilidad') + (c.bone ? ', pérdida ósea ' + c.bone + ' mm' : '') + '.' + (c.note ? ' ' + c.note : '') });
    A.touchPd(pid); A.refresh(); A.toast('Control agregado y anotado en la evolución.');
  };
  A.acts.imCtlDel = el => { const pid = S.fichaPid, x = byId(pid, el.getAttribute('data-id')); if (!x) return; x.ctls = (x.ctls || []).filter(c => c.id !== el.getAttribute('data-c')); A.touchPd(pid); A.refresh(); };
  A.acts.imDel2 = el => { const m = S.modal = { type: 'imDelAsk', id: el.getAttribute('data-id'), pid: S.fichaPid }; A.renderModal(); };
  MF.imDelAsk = m => A.modalShell('Borrar el implante', '<p>Se borra el registro del implante (pieza ' + esc((byId(m.pid, m.id) || {}).tooth || '') + '). Las radiografías y fotos siguen en «Fotos y radiografías».</p>', '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn danger" data-act="imDelGo">Borrar</button>');
  A.acts.imDelGo = () => { const m = S.modal; const pd = A.pd(m.pid); pd.impl = list(m.pid).filter(x => x.id !== m.id); (pd.images || []).forEach(i => { if (i.impl === m.id) delete i.impl; }); A.touchPd(m.pid); S.modal = null; A.renderModal(); A.refresh(); A.toast('Implante borrado.'); };

  /* ---------- alta y edición ---------- */
  A.acts.imNew = () => { S.modal = { type: 'imEd', pid: S.fichaPid, f: { id: A.uid(), isNew: true } }; A.renderModal(); };
  A.acts.imEd = el => { const x = byId(S.fichaPid, el.getAttribute('data-id')); if (!x) return; S.modal = { type: 'imEd', pid: S.fichaPid, f: JSON.parse(JSON.stringify(x)) }; A.renderModal(); };
  MF.imEd = m => {
    const f = m.f, F = (k, l, ph, t) => '<div class="field"><label for="ie_' + k + '">' + l + '</label><input id="ie_' + k + '" ' + (t ? 'type="' + t + '" ' : '') + 'value="' + esc(f[k] || '') + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '></div>';
    const SEL = (k, l, L) => '<div class="field"><label for="ie_' + k + '">' + l + '</label><select id="ie_' + k + '">' + opts(L, f[k]) + '</select></div>';
    const b = '<h4 class="im-sub">Ubicación y planificación</h4><div class="row3">' + F('tooth', 'Pieza (FDI)', 'Ej.: 36') + F('plannedDate', 'Fecha planificada', '', 'date') + SEL('tech', 'Técnica', TECH) + '</div>' +
      '<h4 class="im-sub">El implante</h4><div class="row3"><div class="field"><label for="ie_brand">Marca / sistema</label><input id="ie_brand" list="ieBrands" value="' + esc(f.brand || '') + '"><datalist id="ieBrands">' + BRANDS.map(x => '<option>' + esc(x) + '</option>').join('') + '</datalist></div>' + F('line', 'Línea / modelo', 'Ej.: BLT, Drive CM') + F('lot', 'Lote', '') + '</div><div class="row3">' + F('ref', 'REF (código)', '') + F('diam', 'Diámetro (mm)', '4,1') + F('len', 'Largo (mm)', '10') + '</div>' +
      '<h4 class="im-sub">Cirugía</h4><div class="row3">' + F('surgDate', 'Fecha de cirugía', '', 'date') + SEL('bone', 'Calidad ósea', BONE) + F('torque', 'Torque de inserción (Ncm)', '35') + '</div><div class="row3">' + F('isq', 'ISQ', 'Ej.: 72') + SEL('sinus', 'Elevación de seno', SINUS) + F('graft', 'Injerto / membrana', 'Material, lote') + '</div>' +
      '<h4 class="im-sub">Cicatrización y segunda etapa</h4><div class="row3">' + SEL('heal', 'Protocolo', HEAL) + F('secondDate', 'Fecha de segunda etapa', '', 'date') + F('abutDate', 'Fecha del pilar', '', 'date') + '</div><div class="row3">' + F('abutType', 'Pilar (tipo / marca)', '') + F('abutTorque', 'Torque del pilar (Ncm)', '25') + SEL('impression', 'Impresión', ['Convencional', 'Digital (escáner intraoral)']) + '</div>' +
      '<h4 class="im-sub">Prótesis</h4><div class="row3">' + SEL('ptype', 'Tipo', PTYPE) + F('pmat', 'Material', 'Zirconio, metal-cerámica…') + F('provisional', 'Fecha de provisorio', '', 'date') + '</div><div class="row2">' + F('final', 'Fecha de entrega definitiva', '', 'date') + F('lab', 'Laboratorio / protesista', '') + '</div>' +
      '<div class="field"><label for="ie_notes">Notas, complicaciones o indicaciones</label><textarea id="ie_notes" rows="3">' + esc(f.notes || '') + '</textarea></div><div id="ieMsg" class="hint bad"></div>';
    return A.modalShell(f.isNew ? 'Nuevo implante' : 'Implante pieza ' + (f.tooth || ''), b, '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="imSave">Guardar</button>', true);
  };
  A.acts.imSave = () => {
    const m = S.modal, f = m.f, g = k => (($('#ie_' + k) || {}).value || '').trim(); ['tooth', 'plannedDate', 'tech', 'brand', 'line', 'lot', 'ref', 'diam', 'len', 'surgDate', 'bone', 'torque', 'isq', 'sinus', 'graft', 'heal', 'secondDate', 'abutDate', 'abutType', 'abutTorque', 'impression', 'ptype', 'pmat', 'provisional', 'final', 'lab', 'notes'].forEach(k => { f[k] = g(k); });
    const t = parseInt(f.tooth, 10); if (!t || !A.P.validTooth(t)) { $('#ieMsg').textContent = 'Escribí una pieza válida (FDI, por ejemplo 36).'; return; }
    f.tooth = String(t); const L = list(m.pid), i = L.findIndex(x => x.id === f.id), isNew = f.isNew; delete f.isNew;
    if (i >= 0) L[i] = Object.assign({}, L[i], f); else L.push(Object.assign({ ctls: [] }, f));
    const pd = A.pd(m.pid); if (isNew) pd.notes.unshift({ id: A.uid(), date: f.surgDate || A.today(), pro: A.PAT(m.pid).pro, text: 'Implante pieza ' + f.tooth + (f.brand ? ': ' + f.brand + (f.line ? ' ' + f.line : '') : '') + (f.diam ? ' ' + f.diam + '×' + f.len + ' mm' : '') + (f.lot ? ', lote ' + f.lot : '') + (f.surgDate ? ', colocado el ' + dmy(f.surgDate) : ', planificado') + '.' });
    A.touchPd(m.pid); S.modal = null; A.renderModal(); A.refresh(); A.toast('Implante guardado.');
  };

  /* ---------- tarjeta del implante (para el paciente) ---------- */
  A.acts.imCard = () => {
    const pid = S.fichaPid, pat = A.PAT(pid), L = list(pid).filter(x => x.brand || x.lot || x.surgDate), o = A.pdfDoc_ && A.pdfDoc_('Tarjeta del implante'); if (!o) return;
    o.head('Tarjeta del implante', 'Datos de trazabilidad: guardala, la puede pedir cualquier profesional que te atienda.', pat, '');
    if (!L.length) o.p('Todavía no hay implantes con marca, lote o fecha cargados.');
    L.forEach(x => { o.h('Pieza ' + x.tooth); o.rows([['Marca y modelo', [x.brand, x.line].filter(Boolean).join(' ') || '—'], ['Diámetro × largo', [x.diam, x.len].filter(Boolean).join(' × ') + (x.diam ? ' mm' : '') || '—'], ['Lote / REF', [x.lot, x.ref].filter(Boolean).join(' · ') || '—'], ['Fecha de colocación', x.surgDate ? dmy(x.surgDate) : '—'], ['Pilar', x.abutType || '—'], ['Prótesis', [x.ptype, x.pmat].filter(Boolean).join(' · ') || '—'], ['Entrega', x.final ? dmy(x.final) : '—']]); });
    const pro = A.PRO(pat.pro) || {}; o.y += 4; o.sigs([{ role: 'Profesional', name: pro.name, mat: pro.mat }]);
    o.finish('tarjeta-implante-' + String(pat.last || pat.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.pdf');
  };

  const css = document.createElement('style'); css.id = 'ovApp138';
  css.textContent = '.im-top{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}.im-h{display:flex;gap:10px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}.im-h h3{margin:0;font-size:1.05rem}' +
    '.im-steps{list-style:none;margin:10px 0;padding:0;display:grid;grid-template-columns:repeat(6,1fr);gap:4px;font-size:11px;text-align:center}.im-steps li{padding:5px 2px;border-radius:8px;background:var(--surface-2);color:var(--ink-2);border:1px solid var(--line)}.im-steps li.done{background:var(--accent-soft);color:var(--ink)}.im-steps li.on{background:var(--accent);color:var(--accent-ink);font-weight:700;border-color:var(--accent)}' +
    '.im-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px 12px;margin:8px 0}.im-kv{display:flex;flex-direction:column;font-size:.86rem}.im-kv span{color:var(--ink-2);font-size:.75rem}.im-next{padding:8px 10px;border-radius:10px;background:var(--accent-soft);font-size:.9rem;margin:8px 0}' +
    '.im-sub{margin:12px 0 6px;font-size:.95rem}.im-ctls{list-style:none;margin:0 0 8px;padding:0;display:flex;flex-direction:column;gap:4px;font-size:.88rem}.im-ctls .lnk{margin-left:8px}.im-ctlform{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0}.im-ctlform input[type=date],.im-ctlform input:not([type]){min-width:0;flex:1 1 110px}.im-up{display:flex;gap:8px;align-items:center;margin:0 0 8px}@media (max-width:560px){.im-steps{grid-template-columns:repeat(3,1fr)}}';
  document.head.appendChild(css);
})();
