/* ===== 1.56: Informe para un colega (derivación y contrarreferencia): PDF con logo, datos del consultorio, resumen de Endodoncia / Implantes / Ortodoncia / evolución, radiografías, sello y firma; logo del consultorio en Datos del centro ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc, $ = q => document.querySelector(q);
  if (!A.pdfDoc_ || !A.render) return;
  const dmy = d => (A.fmtDMY && d ? A.fmtDMY(d) : d || '');
  const SECS = [['endo', 'Endodoncia', 'Tratamientos de conducto'], ['impl', 'Implantes', 'Implantes'], ['orto', 'Ortodoncia', 'Ortodoncia'], ['evo', 'Evolución clínica', 'Últimas notas de evolución']];
  const has = (pid, k) => { const pd = A.pd(pid); return k === 'endo' ? (pd.endo || []).length : k === 'impl' ? (pd.impl || []).length : k === 'orto' ? !!pd.orto : (pd.notes || []).length; };
  const kv = (l, v) => (v ? [[l, String(v)]] : []);

  /* ---- botón en las solapas ---- */
  const btn = (k) => '<div class="row-btns rp-top"><button class="btn" data-act="rpOpen" data-k="' + k + '">📄 Informe para un colega (PDF)</button></div>';
  [['endoTab', 'endo'], ['implantesTab', 'impl'], ['ortoTab', 'orto']].forEach(([fn, k]) => {
    const prev = A.render[fn]; if (!prev) return;
    A.render[fn] = function (pid) { const h = prev.apply(this, arguments); return /^<div class="[a-z]+-wrap">/.test(h) ? h.replace(/^(<div class="[a-z]+-wrap">)/, '$1' + btn(k)) : btn(k) + h; };
  });

  /* ---- ventana ---- */
  A.acts.rpOpen = el => {
    const pid = S.fichaPid, pd = A.pd(pid), k = el && el.getAttribute ? el.getAttribute('data-k') : '', pro = A.PRO(A.PAT(pid).pro) || {};
    const sel = {}; SECS.forEach(s => { sel[s[0]] = s[0] === k || (!k && has(pid, s[0]) && s[0] !== 'evo'); });
    if (!Object.keys(sel).some(x => sel[x])) sel.evo = true;
    S.modal = { type: 'rp', pid, sel, to: '', why: '', rec: '', rx: true, sign: true, evoN: 5, last: pd.rpLast || null };
    A.renderModal();
  };
  MF.rp = m => {
    const pid = m.pid, pat = A.PAT(pid), pd = A.pd(pid), pro = A.PRO(pat.pro) || {}, cr = (A.credPick ? A.credPick(pro) : pro.cred) || {}, lg = A.CFG && A.CFG.logo;
    const secs = SECS.map(s => '<label class="chk"><input type="checkbox" data-chg="rpSel" data-k="' + s[0] + '"' + (m.sel[s[0]] ? ' checked' : '') + '> ' + s[1] + ' <span class="muted">(' + (s[0] === 'orto' ? (pd.orto ? 'cargada' : 'sin cargar') : has(pid, s[0])) + ')</span></label>').join('');
    const body = '<p class="m-lead">Armá un informe en PDF para el colega que te derivó al paciente, o al que se lo derivás. Sale con el logo, la dirección, tu sello y tu firma.</p>' +
      '<div class="field"><label for="rpTo">Para (colega)</label><input id="rpTo" data-in="rpField" data-k="to" value="' + esc(m.to) + '" placeholder="Ej.: Dra. Pérez (odontología general)"></div>' +
      '<div class="field"><label>Qué incluir</label><div class="rp-secs">' + secs + '</div></div>' +
      '<div class="field"><label for="rpWhy">Motivo de la derivación / resumen</label><textarea id="rpWhy" rows="3" data-in="rpField" data-k="why" placeholder="Ej.: Paciente derivado para tratamiento de conducto de la pieza 36. Se completó el tratamiento sin complicaciones.">' + esc(m.why) + '</textarea></div>' +
      '<div class="field"><label for="rpRec">Indicaciones para el colega</label><textarea id="rpRec" rows="3" data-in="rpField" data-k="rec" placeholder="Ej.: Restauración definitiva en 15 días. Control radiográfico a los 6 meses.">' + esc(m.rec) + '</textarea></div>' +
      '<label class="chk"><input type="checkbox" data-chg="rpFlag" data-k="rx"' + (m.rx ? ' checked' : '') + '> Incluir las radiografías y fotos de esos tratamientos (hasta 9)</label>' +
      '<label class="chk"><input type="checkbox" data-chg="rpFlag" data-k="sign"' + (m.sign ? ' checked' : '') + '> Poner mi sello y mi firma' + (cr.sello || cr.firma ? '' : ' <span class="muted">(todavía no los cargaste: Menú › Profesionales)</span>') + '</label>' +
      '<div class="small-note">' + (lg && lg.src ? 'El logo del consultorio sale arriba.' : 'No cargaste el logo del consultorio: podés subirlo en Menú › Datos del centro.') + '</div><div id="rpMsg" class="m-msg"></div>';
    return A.modalShell('Informe para un colega', body, '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn" data-act="rpWa">Armar y mandar por WhatsApp</button><button class="btn primary" data-act="rpGo">Armar el PDF</button>');
  };
  A.ins.rpField = el => { if (S.modal && S.modal.type === 'rp') S.modal[el.getAttribute('data-k')] = el.value; };
  A.chg.rpField = A.ins.rpField;
  A.chg.rpSel = el => { if (S.modal && S.modal.type === 'rp') S.modal.sel[el.getAttribute('data-k')] = !!el.checked; };
  A.chg.rpFlag = el => { if (S.modal && S.modal.type === 'rp') S.modal[el.getAttribute('data-k')] = !!el.checked; };

  /* ---- PDF ---- */
  const imgs = (pd, ids) => (pd.images || []).filter(i => i.thumb && (ids.indexOf(i.endo) >= 0 || ids.indexOf(i.impl) >= 0 || i.kind === 'orto' && ids.indexOf('orto') >= 0)).sort((a, b) => (a.date < b.date ? -1 : 1));
  function build(m) {
    const pid = m.pid, pat = A.PAT(pid), pd = A.pd(pid), pro = A.PRO(pat.pro) || {}, o = A.pdfDoc_('Informe para colega');
    if (!o) return null; const d = o.d;
    o.head('Informe odontológico', m.to ? 'Para: ' + m.to : 'Informe de derivación / contrarreferencia', pat, 'Fecha: ' + dmy(A.today()) + (pat.dob ? '' : ''));
    if (m.why) { o.h('Motivo y resumen'); o.p(m.why); }
    const ids = [];
    if (m.sel.endo && (pd.endo || []).length) {
      o.h('Endodoncia');
      pd.endo.slice().sort((a, b) => ((a.start || '') < (b.start || '') ? -1 : 1)).forEach(x => {
        ids.push(x.id); o.need(30); o.p('Pieza ' + x.tooth + (x.retreat ? ' · retratamiento' : '') + ' · ' + (x.status === 'fin' ? 'Terminado' : x.obtDate ? 'Obturado' : 'En curso') + ' · inicio ' + dmy(x.start) + (x.obtDate ? ' · obturación ' + dmy(x.obtDate) : ''), 10, null, true);
        o.rows([].concat(kv('Diagnóstico pulpar', x.dxP), kv('Diagnóstico periapical', x.dxA), kv('Pruebas', x.tests), kv('Anestesia / aislamiento', [x.anest, x.isol].filter(Boolean).join(' · ')), kv('Instrumentación', x.sys), kv('Irrigación', x.irr), kv('Medicación', x.med), kv('Obturación', [x.obt, x.sealer].filter(Boolean).join(' · ')), kv('Restauración', x.rest), kv('Pronóstico', x.prog), kv('Complicaciones', (x.complications || []).join(', ')), kv('Observaciones', x.notes)));
        if ((x.canals || []).length) o.table([{ h: 'Conducto', w: 30 }, { h: 'Long. de trabajo (mm)', w: 34 }, { h: 'Referencia', w: 40 }, { h: 'Lima apical', w: 30 }], x.canals.map(c => [c.name || '', c.wl || '', c.ref || '', c.apical || '']));
        if ((x.sessions || []).length) o.list(x.sessions.map(s => dmy(s.date) + ' · ' + ((s.what || []).join(', ') || 'Sesión') + (s.note ? ' · ' + s.note : '')));
        if ((x.ctls || []).length) { o.p('Controles', 9, null, true); o.list(x.ctls.map(c => dmy(c.date) + ' · ' + (c.res || '') + (c.note ? ' · ' + c.note : ''))); }
        o.y += 2;
      });
    }
    if (m.sel.impl && (pd.impl || []).length) {
      o.h('Implantes');
      pd.impl.slice().sort((a, b) => ((a.surgDate || '') < (b.surgDate || '') ? -1 : 1)).forEach(x => {
        ids.push(x.id); o.need(30); o.p('Pieza ' + x.tooth + (x.surgDate ? ' · colocado el ' + dmy(x.surgDate) : ' · planificado'), 10, null, true);
        o.rows([].concat(kv('Marca y modelo', [x.brand, x.line].filter(Boolean).join(' ')), kv('Diámetro × largo', [x.diam, x.len].filter(Boolean).join(' × ') + (x.diam ? ' mm' : '')), kv('Lote / REF', [x.lot, x.ref].filter(Boolean).join(' / ')), kv('Técnica', x.tech), kv('Hueso / injerto', [x.bone, x.graft, x.sinus].filter(Boolean).join(' · ')), kv('Torque / ISQ', [x.torque && x.torque + ' Ncm', x.isq && 'ISQ ' + x.isq].filter(Boolean).join(' · ')), kv('Segunda etapa', dmy(x.secondDate)), kv('Pilar', [x.abutType, dmy(x.abutDate), x.abutTorque && x.abutTorque + ' Ncm'].filter(Boolean).join(' · ')), kv('Prótesis', [x.ptype, x.pmat, x.provisional && 'provisoria ' + dmy(x.provisional), x.final && 'definitiva ' + dmy(x.final)].filter(Boolean).join(' · ')), kv('Laboratorio', x.lab), kv('Observaciones', x.notes)));
        if ((x.ctls || []).length) { o.p('Controles', 9, null, true); o.list(x.ctls.map(c => dmy(c.date) + (c.probing ? ' · sondaje ' + c.probing : '') + (c.bone ? ' · hueso ' + c.bone : '') + (c.bleed ? ' · sangrado' : '') + (c.mob ? ' · movilidad' : '') + (c.note ? ' · ' + c.note : ''))); }
        o.y += 2;
      });
    }
    if (m.sel.orto && pd.orto) {
      const t = pd.orto; ids.push('orto'); o.h('Ortodoncia');
      o.rows([].concat(kv('Tratamiento', t.type), kv('Inicio', dmy(t.start)), kv('Duración estimada', t.months && t.months + ' meses'), kv('Objetivo', t.goal), kv('Estado', t.status === 'fin' ? 'Terminado' : 'En curso')));
      if ((t.ctrls || []).length) o.table([{ h: 'Fecha', w: 22 }, { h: 'Arco sup.', w: 30 }, { h: 'Arco inf.', w: 30 }, { h: 'Elásticos', w: 26 }, { h: 'Notas', w: 56 }], t.ctrls.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).map(c => [dmy(c.date), c.arcU || '', c.arcL || '', c.elas || '', c.notes || '']));
    }
    if (m.sel.evo && (pd.notes || []).length) {
      o.h('Evolución clínica reciente');
      o.table([{ h: 'Fecha', w: 22 }, { h: 'Profesional', w: 34 }, { h: 'Nota', w: 110 }], pd.notes.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8).map(n => [dmy(n.date), (A.PRO(n.pro) || {}).name || '', n.text || '']));
    }
    if (m.rx) {
      const L = imgs(pd, ids).slice(-9);
      if (L.length) {
        o.h('Radiografías y fotos'); const bw = 55, bh = 42, gap = 6;
        L.forEach((im, i) => { const col = i % 3; if (col === 0) o.need(bh + 10); const x = o.M + col * (bw + gap), y = o.y; try { const pr = d.getImageProperties(im.thumb), r = Math.min(bw / pr.width, bh / pr.height), w = pr.width * r, h = pr.height * r; d.addImage(im.thumb, /png/i.test(im.thumb.slice(0, 30)) ? 'PNG' : 'JPEG', x + (bw - w) / 2, y + (bh - h) / 2, w, h, undefined, 'FAST'); } catch (e) { /* nada */ } d.setFontSize(7.5); d.setTextColor(110, 120, 125); d.text(String(dmy(im.date) + (im.tooth ? ' · pieza ' + im.tooth : '')), x, y + bh + 3.5); if (col === 2 || i === L.length - 1) o.y += bh + 8; });
      }
    }
    if (m.rec) { o.h('Indicaciones para el colega'); o.p(m.rec); }
    /* sello y firma */
    o.need(50); o.y += 6; const cr = (A.credPick ? A.credPick(pro) : pro.cred) || {}, y0 = o.y, fit = (data, x, y, w, h) => { try { const pr = d.getImageProperties(data), r = Math.min(w / pr.width, h / pr.height), iw = pr.width * r, ih = pr.height * r; d.addImage(data, 'PNG', x + (w - iw) / 2, y + (h - ih) / 2, iw, ih, undefined, 'FAST'); } catch (e) { /* nada */ } };
    if (m.sign) { if (cr.firma) fit(cr.firma, o.M, y0, 60, 22); if (cr.sello) fit(cr.sello, o.M + 80, y0 - 2, 62, 26); }
    d.setDrawColor(60, 70, 75); d.setLineWidth(0.25); d.line(o.M, y0 + 26, o.M + 70, y0 + 26);
    d.setFont('helvetica', 'bold'); d.setFontSize(9.5); d.setTextColor(30, 40, 45); d.text(String(pro.name || ''), o.M, y0 + 31);
    d.setFont('helvetica', 'normal'); d.setFontSize(8.5); d.setTextColor(110, 120, 125); d.text(String([pro.spec || pro.esp, A.matRN ? A.matRN(pro) : pro.mat].filter(Boolean).join(' · ') + (pro.mat || (A.matRN && A.matRN(pro)) ? '' : '')), o.M, y0 + 35.5); d.text('Firma electrónica registrada · ' + dmy(A.today()), o.M, y0 + 40);
    o.y = y0 + 44;
    return { o, name: 'informe-' + String(pat.last || pat.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + A.today() + '.pdf' };
  }
  const sinNada = m => !Object.keys(m.sel).some(k => m.sel[k] && has(m.pid, k)) && !m.why && !m.rec;
  async function go(wa) {
    const m = S.modal; if (!m || m.type !== 'rp') return;
    if (sinNada(m)) { $('#rpMsg').textContent = 'Tildá algo para incluir o escribí un resumen.'; return; }
    if (!window.jspdf) { $('#rpMsg').textContent = 'No se pudo preparar el PDF: falta conexión para cargar el generador. Probá de nuevo con internet.'; return; }
    let r; try { r = build(m); } catch (e) { $('#rpMsg').textContent = 'No se pudo armar el informe: ' + ((e && e.message) || 'error'); return; }
    if (!r) return; const pat = A.PAT(m.pid), pd = A.pd(m.pid); pd.rpLast = { date: A.today(), to: m.to }; A.touchPd(m.pid);
    await r.o.finish(r.name);
    if (wa) { const t = 'Hola' + (m.to ? ' ' + m.to : '') + ', te envío el informe de ' + pat.name + ' (' + A.CLINIC + '). Te adjunto el PDF.'; const url = 'https://wa.me/?text=' + encodeURIComponent(t); if (A.waOpen) A.waOpen(url); else window.open(url, '_blank', 'noopener'); }
    S.modal = null; A.renderModal();
  }
  A.acts.rpGo = () => go(false);
  A.acts.rpWa = () => go(true);
  A.rpBuild = build;

  /* ---- logo del consultorio en Datos del centro ---- */
  A.chg.cfgLogo = el => {
    const f = el.files && el.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => {
      const k = Math.min(1, 480 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); const png = /png|svg|webp|gif/i.test(f.type);
      A.CFG.logo = { src: png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.88), w: c.width, h: c.height }; A.save(); A.renderModal(); A.refresh(); A.toast('Logo guardado: sale en todos los PDF.');
    }; img.onerror = () => A.toast('No se pudo leer esa imagen.'); img.src = r.result; }; r.readAsDataURL(f);
  };
  A.acts.cfgLogoDel = () => { delete A.CFG.logo; A.save(); A.renderModal(); A.refresh(); A.toast('Logo quitado.'); };
  A.cfgLogoHTML = () => { const lg = A.CFG && A.CFG.logo; return '<div class="tp-logo cf-logo">' + (lg && lg.src ? '<img src="' + esc(lg.src) + '" alt="Logo del consultorio">' : '<span class="tp-nologo">Sin logo</span>') + '<div><b>Logo del consultorio</b><span class="hint" style="margin:0">Sale arriba en todos los PDF: informes para colegas, presupuestos, recetas e historia clínica.</span><div class="row-btns"><label class="btn small filebtn">' + (lg && lg.src ? 'Cambiar logo' : 'Subir logo') + '<input type="file" accept="image/*" data-chg="cfgLogo"></label>' + (lg && lg.src ? '<button class="btn small ghost" data-act="cfgLogoDel">Quitar</button>' : '') + '</div></div></div>'; };

  const css = document.createElement('style'); css.id = 'ovApp141';
  css.textContent = '.rp-top{margin:0 0 10px}.rp-secs{display:flex;flex-direction:column;gap:6px;margin-top:4px}.cf-logo{margin:10px 0}';
  document.head.appendChild(css);
})();
