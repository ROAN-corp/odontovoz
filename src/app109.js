/* ===== 1.22: Fichas FORN (Federación Odontológica de Río Negro): ficha mensual por paciente desde la historia clínica y presentación del mes en PDF ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, MF = A.modalFns, $ = q => document.querySelector(q);
  /* Ficha: { id, mes: 'AAAA-MM', pro, afil, addr, loc, tel, birth, os, rows: [{ id, fecha, pieza, cara, cod, desc }], obs,
     sig (firma del paciente, PNG), sigAt, perio (incluir dorso), estado: 'borrador' | 'lista' | 'presentada', at, upd }.
     Vive en pd.forn y se sincroniza con la ficha del paciente. */
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mesTxt = m => { const p = String(m || '').split('-'); return p.length === 2 ? A.cap(MESES[(+p[1] || 1) - 1]) + ' ' + p[0] : ''; };
  const thisMonth = () => A.today().slice(0, 7);
  const addMonth = (m, k) => { let [y, mm] = m.split('-').map(Number); mm += k; while (mm < 1) { mm += 12; y--; } while (mm > 12) { mm -= 12; y++; } return y + '-' + String(mm).padStart(2, '0'); };
  const list = pid => { const pd = A.pd(pid); return (pd.forn = pd.forn || []); };
  const byId = (pid, id) => list(pid).filter(f => f.id === id)[0] || null;
  const ESTADO = { borrador: 'Borrador', lista: 'Lista para presentar', presentada: 'Presentada' };
  const ECLS = { borrador: '', lista: 'acc', presentada: 'ok' };
  const dmy = d => (d ? A.fmtDMY(d) : '');
  const ageOf = b => { if (!/^\d{4}-\d{2}-\d{2}$/.test(b || '')) return ''; const t = A.today(); let a = +t.slice(0, 4) - +b.slice(0, 4); if (t.slice(5) < b.slice(5)) a--; return a >= 0 ? a : ''; };
  const isPart = c => !c || /particular/i.test(c);
  const proOf = id => A.PRO(id) || {};

  /* ---------- crear / completar ---------- */
  function newFicha(pid, mes) {
    const p = A.PAT(pid) || {};
    const f = { id: A.uid(), mes, pro: p.pro || ((A.PROS || [])[0] || {}).id, afil: p.afil || '', addr: p.addr || '', loc: p.loc || '', tel: p.phone || '', birth: p.birth || '', os: isPart(p.cov) ? '' : (p.cov || ''), rows: [], obs: '', sig: '', perio: true, estado: 'borrador', at: new Date().toISOString() };
    pull(pid, f, true);
    list(pid).push(f); A.touchPd(pid); return f;
  }
  /* lo realizado ese mes (plan de tratamiento) pasa como renglones, con el código del nomenclador */
  function pull(pid, f, quiet) {
    const pd = A.pd(pid), have = {}; f.rows.forEach(r => { have[r.fecha + '|' + r.pieza + '|' + r.cod] = 1; });
    let n = 0;
    (pd.tx || []).filter(t => t.status === 'realizado' && String(t.doneDate || '').slice(0, 7) === f.mes).sort((a, b) => (a.doneDate < b.doneDate ? -1 : 1)).forEach(t => {
      let cod = ''; try { cod = (A.codeFor && A.codeFor(t)) || ''; } catch (e) { /* nada */ }
      const r = { id: A.uid(), fecha: t.doneDate, pieza: t.tooth ? String(t.tooth) : '', cara: String(t.faces || '').replace(/[^a-z]/gi, '').toUpperCase(), cod, desc: t.label || '' };
      const k = r.fecha + '|' + r.pieza + '|' + r.cod; if (have[k]) return; have[k] = 1; f.rows.push(r); n++;
    });
    if (!quiet) A.toast(n ? 'Se sumaron ' + n + ' práctica' + (n === 1 ? '' : 's') + ' realizada' + (n === 1 ? '' : 's') + ' en ' + mesTxt(f.mes) + '.' : 'No hay prácticas realizadas en ' + mesTxt(f.mes) + ' que no estén en la ficha.');
    return n;
  }

  /* ---------- códigos de la Federación (para sugerir al escribir) ---------- */
  let CODES = null;
  function loadCodes() {
    if (CODES || !A.fornGet) return;
    A.fornGet().then(d => {
      if (!d || !d.os) return; const m = {};
      d.os.forEach(o => (o.tables || []).forEach(t => Object.keys(t.rows || {}).forEach(c => { if (!m[c]) m[c] = t.rows[c].d || ''; })));
      CODES = Object.keys(m).sort().map(c => [c, m[c]]);
      const dl = $('#frnCodes'); if (dl) dl.innerHTML = codesOpts();
    }).catch(() => { /* sin conexión */ });
  }
  const codesOpts = () => (CODES || []).map(c => '<option value="' + esc(c[0]) + '">' + esc(c[0] + ' · ' + String(c[1]).slice(0, 70)) + '</option>').join('');
  const descOf = cod => { const x = (CODES || []).filter(c => c[0] === cod)[0]; return x ? x[1] : ''; };

  /* ---------- tarjeta en la ficha del paciente (Datos e historia) ---------- */
  function cardHTML(pid) {
    const L = list(pid).slice().sort((a, b) => (a.mes < b.mes ? 1 : -1)), cur = L.filter(f => f.mes === thisMonth())[0];
    return '<section class="card frn-card" id="frnCard"><div class="frn-head"><h2>FORN <span class="frn-sub">Federación Odontológica de Río Negro</span></h2>' +
      '<button class="btn small primary" data-act="frnOpenPat" data-pid="' + esc(pid) + '">' + (cur ? 'Ficha de ' + esc(mesTxt(cur.mes)) : '+ Ficha de ' + esc(mesTxt(thisMonth()))) + '</button></div>' +
      (L.length ? '<ul class="frn-mini">' + L.slice(0, 6).map(f => '<li><button class="lnk" data-act="frnEdit" data-pid="' + esc(pid) + '" data-id="' + esc(f.id) + '"><b>' + esc(mesTxt(f.mes)) + '</b></button><span>' + f.rows.length + ' práctica' + (f.rows.length === 1 ? '' : 's') + '</span><span class="chip ' + ECLS[f.estado] + '">' + ESTADO[f.estado] + '</span></li>').join('') + '</ul>'
        : '<p class="hint" style="margin:4px 0 0">Armá la ficha del mes con los datos del paciente ya cargados y lo que le hiciste. Después la presentás junto con las demás en Menú › FORN.</p>') +
      '</section>';
  }
  function mountCard() {
    if (S.tab !== 'ficha' || S.fichaTab !== 'datos' || !S.fichaPid) return;
    const body = $('#fichaBody'); if (!body) return;
    const old = $('#frnCard'), html = cardHTML(S.fichaPid);
    if (old) { old.outerHTML = html; return; }
    const ofn = $('#ofnCard'); if (ofn) ofn.insertAdjacentHTML('beforebegin', html); else body.insertAdjacentHTML('beforeend', html);
  }
  const fichaPrev = A.render.ficha;
  A.render.ficha = function () { const r = fichaPrev.apply(this, arguments); try { mountCard(); } catch (e) { /* nada */ } return r; };

  /* ---------- editor de la ficha ---------- */
  A.acts.frnOpenPat = el => {
    const pid = el.getAttribute('data-pid'), mes = thisMonth();
    const f = list(pid).filter(x => x.mes === mes)[0] || newFicha(pid, mes);
    openEd(pid, f.id);
  };
  A.acts.frnEdit = el => openEd(el.getAttribute('data-pid'), el.getAttribute('data-id'));
  function openEd(pid, id) { loadCodes(); S.modal = { type: 'frnEd', pid, id, back: S.modal && S.modal.type === 'frnMes' ? S.modal : null }; A.renderModal(); }

  MF.frnEd = m => {
    const p = A.PAT(m.pid) || {}, f = byId(m.pid, m.id);
    if (!f) return A.modalShell('Ficha FORN', '<p>No encontré esa ficha.</p>', '<button class="btn" data-act="closeModal">Cerrar</button>');
    const fld = (k, lbl, type, ph) => '<label class="field"><span>' + lbl + '</span><input class="inp" ' + (type ? 'type="' + type + '" ' : '') + 'data-chg="frnF" data-k="' + k + '" value="' + esc(f[k] || '') + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '></label>';
    let b = '<div class="frn-ed">' +
      '<div class="frn-top"><div><b class="frn-pat">' + esc(p.name || '') + '</b><span class="hint" style="margin:0">DNI ' + esc(p.dni || '—') + (p.birth ? ' · ' + esc(ageOf(f.birth || p.birth)) + ' años' : '') + '</span></div>' +
      '<label class="field frn-mes"><span>Mes</span><input class="inp" type="month" data-chg="frnF" data-k="mes" value="' + esc(f.mes) + '"></label></div>' +
      '<details class="frn-dat"' + (f.afil && f.os ? '' : ' open') + '><summary>Datos del paciente para la ficha' + (f.afil ? '' : ' <span class="chip warn">falta N° de afiliado</span>') + '</summary><div class="frn-grid">' +
      fld('os', 'Obra social', '', 'Ej.: OSPe') + fld('afil', 'N° de afiliado') + fld('addr', 'Domicilio') + fld('loc', 'Localidad') + fld('tel', 'Teléfono') + fld('birth', 'Fecha de nacimiento', 'date') +
      '</div><p class="hint" style="margin:6px 0 0">Vienen de la ficha del paciente. Si cambiás algo acá, se guarda también en su ficha.</p></details>' +
      '<label class="field"><span>Odontólogo</span><select class="inp" data-chg="frnF" data-k="pro">' + (A.PROS || []).map(x => '<option value="' + esc(x.id) + '"' + (x.id === f.pro ? ' selected' : '') + '>' + esc(x.name) + (x.mat ? ' · Mat. ' + esc(x.mat) : '') + '</option>').join('') + '</select></label>' +
      (proOf(f.pro).mat ? '' : '<p class="hint warn" style="margin:0">Este profesional no tiene la matrícula cargada (Ajustes › Profesionales). En la ficha queda en blanco.</p>') +
      '<h4 class="frn-h">Prácticas a facturar <button class="btn small" data-act="frnPull">Traer lo realizado en ' + esc(mesTxt(f.mes)) + '</button></h4>' +
      '<datalist id="frnCodes">' + codesOpts() + '</datalist>' +
      '<div class="frn-rows">' + (f.rows.length ? f.rows.map((r, i) => '<div class="frn-row">' +
        '<input class="inp" type="date" aria-label="Fecha" data-chg="frnR" data-i="' + i + '" data-k="fecha" value="' + esc(r.fecha || '') + '">' +
        '<input class="inp" inputmode="numeric" aria-label="Pieza" placeholder="Pieza" data-chg="frnR" data-i="' + i + '" data-k="pieza" value="' + esc(r.pieza || '') + '">' +
        '<input class="inp" aria-label="Cara" placeholder="Cara" data-chg="frnR" data-i="' + i + '" data-k="cara" value="' + esc(r.cara || '') + '">' +
        '<input class="inp" list="frnCodes" aria-label="Código" placeholder="Código" data-chg="frnR" data-i="' + i + '" data-k="cod" value="' + esc(r.cod || '') + '">' +
        '<button class="btn small ghost danger" data-act="frnDelRow" data-i="' + i + '" aria-label="Quitar">×</button>' +
        (r.desc ? '<span class="frn-desc">' + esc(r.desc) + '</span>' : '') + '</div>').join('') : '<p class="hint" style="margin:0">Todavía no hay prácticas. Traé lo realizado del mes o agregalas a mano.</p>') + '</div>' +
      '<button class="btn small" data-act="frnAddRow">+ Agregar práctica</button>' +
      '<label class="field"><span>Observaciones</span><input class="inp" data-chg="frnF" data-k="obs" value="' + esc(f.obs || '') + '"></label>' +
      '<h4 class="frn-h">Firma del paciente</h4>' +
      '<div class="frn-sigbox"><canvas id="frnPad" width="600" height="180" aria-label="Espacio para que firme el paciente"></canvas>' + (f.sig ? '' : '<span class="frn-ph">Que el paciente firme acá con el dedo</span>') + '</div>' +
      '<div class="row-btns"><button class="btn small" data-act="frnSigClear">Borrar firma</button>' + (f.sigAt ? '<span class="hint" style="margin:0">Firmó el ' + esc(dmy(f.sigAt.slice(0, 10))) + '</span>' : '') + '</div>' +
      '<label class="mu-chk"><input type="checkbox" data-chg="frnPerio"' + (f.perio ? ' checked' : '') + '> Incluir la ficha periodontal al dorso (con el último periodontograma, si hay)</label>' +
      '<label class="field"><span>Estado</span><select class="inp" data-chg="frnF" data-k="estado">' + Object.keys(ESTADO).map(k => '<option value="' + k + '"' + (k === f.estado ? ' selected' : '') + '>' + ESTADO[k] + '</option>').join('') + '</select></label>' +
      '</div>';
    return A.modalShell('Ficha FORN · ' + mesTxt(f.mes), b,
      '<button class="btn ghost danger" data-act="frnDelAsk">Borrar ficha</button><button class="btn" data-act="frnPdf1">Ver PDF</button><button class="btn primary" data-act="frnDone">Listo</button>');
  };
  const cur = () => { const m = S.modal; return m && m.type === 'frnEd' ? byId(m.pid, m.id) : null; };
  const save = () => { const m = S.modal; if (m && m.pid) A.touchPd(m.pid); };
  const PROF = { afil: 'afil', addr: 'addr', loc: 'loc', tel: 'phone', birth: 'birth' };
  A.chg.frnF = el => {
    const f = cur(); if (!f) return; const k = el.getAttribute('data-k'), v = el.value;
    if (k === 'mes' && !/^\d{4}-\d{2}$/.test(v)) return;
    f[k] = v; f.upd = new Date().toISOString(); save();
    /* lo que se corrige del paciente vuelve a su ficha */
    if (PROF[k] && A.setProfile) { const o = {}; o[PROF[k]] = v; A.setProfile(S.modal.pid, o); }
    if (k === 'mes' || k === 'pro') A.renderModal();
  };
  A.chg.frnR = el => {
    const f = cur(); if (!f) return; const r = f.rows[+el.getAttribute('data-i')]; if (!r) return;
    const k = el.getAttribute('data-k'); r[k] = k === 'cara' ? el.value.toUpperCase().replace(/[^MODVLPI]/g, '') : el.value.trim();
    if (k === 'cod') { const d = descOf(r.cod); if (d) r.desc = d; }
    f.upd = new Date().toISOString(); save(); if (k === 'cod' || k === 'cara') A.renderModal();
  };
  A.chg.frnPerio = el => { const f = cur(); if (f) { f.perio = el.checked; save(); } };
  A.acts.frnAddRow = () => { const f = cur(); if (!f) return; f.rows.push({ id: A.uid(), fecha: A.today().slice(0, 7) === f.mes ? A.today() : f.mes + '-01', pieza: '', cara: '', cod: '', desc: '' }); save(); A.renderModal(); };
  A.acts.frnDelRow = el => { const f = cur(); if (!f) return; f.rows.splice(+el.getAttribute('data-i'), 1); save(); A.renderModal(); };
  A.acts.frnPull = () => { const f = cur(); if (!f) return; pull(S.modal.pid, f); save(); A.renderModal(); };
  A.acts.frnSigClear = () => { const f = cur(); if (!f) return; f.sig = ''; f.sigAt = ''; save(); A.renderModal(); };
  A.acts.frnDone = () => { const m = S.modal; S.modal = m.back || null; if (S.modal && S.modal.type === 'frnMes') { /* volver al listado */ } A.renderModal(); A.refresh(); };
  A.acts.frnDelAsk = () => { const m = S.modal; S.modal = { type: 'frnDel', pid: m.pid, id: m.id, back: m.back }; A.renderModal(); };
  MF.frnDel = m => { const f = byId(m.pid, m.id); return A.modalShell('Borrar la ficha FORN', '<p>¿Borrar la ficha de <b>' + esc((A.PAT(m.pid) || {}).name || '') + '</b> de ' + esc(mesTxt(f && f.mes)) + '? Las prácticas del plan de tratamiento no se tocan.</p>', '<button class="btn" data-act="frnDelNo">Cancelar</button><button class="btn danger" data-act="frnDelGo">Borrar</button>'); };
  A.acts.frnDelNo = () => { const m = S.modal; S.modal = { type: 'frnEd', pid: m.pid, id: m.id, back: m.back }; A.renderModal(); };
  A.acts.frnDelGo = () => { const m = S.modal, pd = A.pd(m.pid); pd.forn = (pd.forn || []).filter(f => f.id !== m.id); A.touchPd(m.pid); S.modal = m.back || null; A.renderModal(); A.refresh(); A.toast('Ficha FORN borrada.'); };

  /* firma con el dedo (o el mouse) */
  A.modalAfter = A.modalAfter || {};
  A.modalAfter.frnEd = () => {
    const c = $('#frnPad'), f = cur(); if (!c || !f) return;
    const g = c.getContext('2d'); g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#13262c';
    if (f.sig) { const im = new Image(); im.onload = () => g.drawImage(im, 0, 0, c.width, c.height); im.src = f.sig; }
    let on = false, last = null, drew = false;
    const pt = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; };
    c.addEventListener('pointerdown', e => { on = true; drew = false; last = pt(e); c.setPointerCapture(e.pointerId); const ph = c.parentNode.querySelector('.frn-ph'); if (ph) ph.remove(); e.preventDefault(); });
    c.addEventListener('pointermove', e => { if (!on) return; const p = pt(e); g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke(); last = p; drew = true; e.preventDefault(); });
    const end = () => { if (!on) return; on = false; if (!drew) return; const ff = cur(); if (!ff) return; ff.sig = c.toDataURL('image/png'); ff.sigAt = new Date().toISOString(); save(); };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  };

  /* ---------- apartado FORN: la presentación del mes ---------- */
  A.acts.frnOpen = () => { if (A.hideDrawer) A.hideDrawer(); loadCodes(); S.modal = { type: 'frnMes', mes: (S.modal && S.modal.mes) || thisMonth(), pro: '' }; A.renderModal(); };
  function monthFichas(mes, pro) {
    const out = [];
    A.PATS.forEach(p => { if (p.deleted) return; const pd = S.pd && S.pd[p.id]; ((pd && pd.forn) || []).forEach(f => { if (f.mes === mes && (!pro || f.pro === pro)) out.push({ p, f }); }); });
    return out.sort((a, b) => (a.p.last + a.p.first).localeCompare(b.p.last + b.p.first, 'es'));
  }
  MF.frnMes = m => {
    const L = monthFichas(m.mes, m.pro), nPr = L.reduce((s, x) => s + x.f.rows.length, 0), sinFirma = L.filter(x => !x.f.sig).length, sinAfil = L.filter(x => !x.f.afil).length;
    const pros = A.PROS || [];
    let b = '<div class="frn-bar"><button class="btn small" data-act="frnMonth" data-k="-1" aria-label="Mes anterior">‹</button><b>' + esc(mesTxt(m.mes)) + '</b><button class="btn small" data-act="frnMonth" data-k="1" aria-label="Mes siguiente">›</button>' +
      (pros.length > 1 ? '<select class="inp frn-pro" data-chg="frnProF"><option value="">Todos los odontólogos</option>' + pros.map(x => '<option value="' + esc(x.id) + '"' + (x.id === m.pro ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select>' : '') + '</div>' +
      '<div class="stats"><div class="stat"><b>' + L.length + '</b>fichas</div><div class="stat"><b>' + nPr + '</b>prácticas</div><div class="stat"><b>' + L.filter(x => x.f.estado === 'presentada').length + '</b>presentadas</div></div>';
    if (!L.length) b += '<p class="frn-empty">Todavía no hay fichas de ' + esc(mesTxt(m.mes)) + '. Se arman desde la ficha de cada paciente: <b>Datos e historia › FORN › «+ Ficha del mes»</b>.</p>';
    else {
      if (sinFirma || sinAfil) b += '<p class="hint warn" style="margin:0 0 8px">' + [sinFirma ? sinFirma + ' sin la firma del paciente' : '', sinAfil ? sinAfil + ' sin N° de afiliado' : ''].filter(Boolean).join(' · ') + '.</p>';
      b += '<ul class="frn-list">' + L.map(x => '<li><button class="frn-it" data-act="frnEdit" data-pid="' + esc(x.p.id) + '" data-id="' + esc(x.f.id) + '"><span class="frn-n"><b>' + esc(x.p.last + ', ' + x.p.first) + '</b><small>' + esc(x.f.os || x.p.cov || '') + (x.f.afil ? ' · Afil. ' + esc(x.f.afil) : '') + ' · ' + x.f.rows.length + ' práctica' + (x.f.rows.length === 1 ? '' : 's') + (x.f.rows.length ? ': ' + esc(x.f.rows.map(r => r.cod || '?').slice(0, 6).join(', ')) : '') + '</small></span>' +
        '<span class="frn-st">' + (x.f.sig ? '<span class="chip ok">firmada</span>' : '<span class="chip warn">sin firma</span>') + '<span class="chip ' + ECLS[x.f.estado] + '">' + ESTADO[x.f.estado] + '</span></span></button></li>').join('') + '</ul>';
    }
    return A.modalShell('FORN · Presentación mensual', b,
      '<button class="btn" data-act="closeModal">Cerrar</button>' + (L.length ? '<button class="btn" data-act="frnMarkAll">Marcar como presentadas</button><button class="btn" data-act="frnMail">Mail</button><button class="btn" data-act="frnShare">WhatsApp / Compartir</button><button class="btn primary" data-act="frnPdfAll">PDF con todas</button>' : ''), true);
  };
  A.acts.frnMonth = el => { S.modal.mes = addMonth(S.modal.mes, +el.getAttribute('data-k')); A.renderModal(); };
  A.chg.frnProF = el => { S.modal.pro = el.value; A.renderModal(); };
  A.acts.frnMarkAll = () => {
    const m = S.modal, L = monthFichas(m.mes, m.pro), pids = {};
    L.forEach(x => { x.f.estado = 'presentada'; x.f.presAt = new Date().toISOString(); pids[x.p.id] = 1; });
    Object.keys(pids).forEach(pid => A.touchPd(pid)); A.renderModal(); A.toast(L.length + ' ficha' + (L.length === 1 ? '' : 's') + ' marcada' + (L.length === 1 ? '' : 's') + ' como presentada' + (L.length === 1 ? '' : 's') + '.');
  };

  /* ---------- PDF (A4 apaisada, como la ficha de papel) ---------- */
  const LINE = [40, 40, 40], RED = [207, 51, 45], BLUE = [31, 95, 191], MUT = [90, 100, 105];
  const clean = s => String(s == null ? '' : s).replace(/[−–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...');
  function faceMarks(pid) {
    const od = (A.pd(pid) || {}).odon || {}, out = {};
    Object.keys(od).forEach(n => {
      const d = od[n] || {}, w = d.whole || [], faces = {};
      Object.keys(d.faces || {}).forEach(k => { const mk = d.faces[k]; if (mk) faces[k] = mk.status === 'realizado' ? 'r' : 'b'; });
      const gone = w.filter(x => x.cond === 'ausente' || x.cond === 'extraido')[0], crown = w.filter(x => x.cond === 'corona')[0];
      out[n] = { faces, x: gone ? (gone.status === 'realizado' || gone.cond === 'ausente' ? 'r' : 'b') : '', crown: crown ? (crown.status === 'realizado' ? 'r' : 'b') : '' };
    });
    return out;
  }
  function tooth(d, n, x, y, s, upper, mk) {
    const q = Math.floor(n / 10), screenLeft = q === 1 || q === 4 || q === 5 || q === 8, i = s * 0.32;
    const top = upper ? 'V' : 'L', bot = upper ? 'L' : 'V', lf = screenLeft ? 'D' : 'M', rt = screenLeft ? 'M' : 'D';
    const P = { [top]: [[x, y], [x + s, y], [x + s - i, y + i], [x + i, y + i]], [bot]: [[x, y + s], [x + s, y + s], [x + s - i, y + s - i], [x + i, y + s - i]], [lf]: [[x, y], [x + i, y + i], [x + i, y + s - i], [x, y + s]], [rt]: [[x + s, y], [x + s - i, y + i], [x + s - i, y + s - i], [x + s, y + s]], O: [[x + i, y + i], [x + s - i, y + i], [x + s - i, y + s - i], [x + i, y + s - i]] };
    const m = mk || { faces: {} };
    Object.keys(P).forEach(k => {
      const c = m.faces[k], pts = P[k];
      d.setDrawColor(...LINE); d.setLineWidth(0.2);
      if (c) d.setFillColor(...(c === 'r' ? RED : BLUE));
      const lines = pts.slice(1).map((p, j) => [p[0] - pts[j][0], p[1] - pts[j][1]]);
      d.lines(lines, pts[0][0], pts[0][1], [1, 1], c ? 'FD' : 'S', true);
    });
    if (m.crown) { d.setDrawColor(...(m.crown === 'r' ? RED : BLUE)); d.setLineWidth(0.6); d.rect(x - 0.8, y - 0.8, s + 1.6, s + 1.6); }
    if (m.x) { d.setDrawColor(...(m.x === 'r' ? RED : BLUE)); d.setLineWidth(0.7); d.line(x, y, x + s, y + s); d.line(x + s, y, x, y + s); }
    d.setDrawColor(...LINE); d.setLineWidth(0.2);
  }
  function odontogram(d, pid, x0, y0) {
    const mk = faceMarks(pid), s = 6.2, P = 8.2, gap = 4;
    const row = (nums, y, upper, numY, x1) => nums.forEach((n, i) => { const x = x1 + i * P + (i >= nums.length / 2 ? gap : 0); tooth(d, n, x, y, s, upper, mk[n]); d.setFontSize(7); d.setTextColor(...MUT); d.text(String(n), x + s / 2, numY, { align: 'center' }); });
    const U = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], L = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
    const PU = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65], PL = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
    row(U, y0 + 3, true, y0 + 1.6, x0); row(L, y0 + 11, false, y0 + 21, x0);
    const xp = x0 + 3 * P; row(PU, y0 + 27, true, y0 + 25.6, xp); row(PL, y0 + 35, false, y0 + 45, xp);
    const midX = x0 + 8 * P - (P - s) / 2 + gap / 2;
    d.setDrawColor(...LINE); d.setLineWidth(0.4); d.line(midX, y0 - 1, midX, y0 + 46); d.line(x0 - 2, y0 + 10, x0 + 16 * P + gap, y0 + 10);
    d.setTextColor(30, 30, 30); d.setFontSize(8); d.setFont('helvetica', 'bold'); d.text('Derecha', x0 + 4, y0 + 36); d.text('Izquierda', x0 + 16 * P + gap - 16, y0 + 36); d.setFont('helvetica', 'normal');
    d.setFontSize(6.5); d.setTextColor(...MUT); d.text('Rojo: existente / realizado   ·   Azul: a realizar', x0, y0 + 49);
  }
  function front(d, pid, f, rows, page, pages) {
    const p = A.PAT(pid) || {}, pr = proOf(f.pro), W = 297;
    d.setTextColor(20, 20, 20); d.setDrawColor(...LINE);
    d.setFont('helvetica', 'bold'); d.setFontSize(11); d.text('FEDERACIÓN ODONTOLÓGICA DE RÍO NEGRO', 10, 13);
    d.setFont('helvetica', 'normal'); d.setFontSize(7.5);
    ['Avenida Roca 1277 - 3er. Piso Oficina 302', 'Tel./Fax: (0298) 4420453 - Cel: 298 4138156', 'E-mail: fedodonto@odontorionegro.com.ar', '(8332) GENERAL ROCA - RÍO NEGRO'].forEach((l, i) => d.text(l, 10, 17.5 + i * 3.4));
    d.setFont('helvetica', 'bold'); d.setFontSize(30); d.text('FORN', 150, 24);
    d.setLineWidth(0.3); d.rect(212, 7, 75, 22);
    d.setFontSize(7); d.setFont('helvetica', 'normal'); d.text(clean(mesTxt(f.mes)) + (pages > 1 ? '  ·  hoja ' + page + ' de ' + pages : ''), 214, 11);
    const lbl = (t, x, y) => { d.setFont('helvetica', 'bold'); d.setFontSize(8); d.text(t, x, y); d.setFont('helvetica', 'normal'); };
    const val = (t, x, y, w) => { d.setFontSize(9.5); d.text(clean(t || ''), x, y - 0.6, { maxWidth: w }); if (w) d.line(x - 1, y + 0.6, x + w, y + 0.6); };
    lbl('APELLIDO Y NOMBRE DEL PACIENTE', 10, 37); val((p.last || '') + ', ' + (p.first || ''), 66, 37, 114);
    lbl('NÚMERO DE', 186, 35); lbl('AFILIADO', 186, 38.4);
    const af = String(f.afil || '').slice(0, 16), bx = 207; for (let i = 0; i < 16; i++) { d.rect(bx + i * 4.6, 33, 4.6, 6); if (af[i]) { d.setFontSize(9); d.text(af[i], bx + i * 4.6 + 2.3, 37.4, { align: 'center' }); } }
    lbl('DOMICILIO', 10, 46); val(f.addr, 28, 46, 112); lbl('LOCALIDAD', 145, 46); val(f.loc, 165, 46, 62); lbl('TEL.', 231, 46); val(f.tel, 240, 46, 47);
    lbl('D.N.I. N°', 10, 55); val(p.dni, 26, 55, 40); lbl('FECHA DE NACIMIENTO', 70, 55); val(dmy(f.birth), 106, 55, 26); lbl('EDAD', 136, 55); val(String(ageOf(f.birth) || p.age || ''), 146, 55, 14);
    lbl('OBRA SOCIAL', 164, 55); val(f.os || p.cov, 186, 55, 101);
    odontogram(d, pid, 14, 64);
    /* odontólogo */
    d.setLineWidth(0.3); d.rect(170, 61, 117, 50);
    lbl('ODONTÓLOGO', 172, 66); d.setFontSize(9.5); d.text(clean(pr.name || ''), 172, 71);
    d.line(170, 74, 287, 74); lbl('Matrícula Profesional N°', 172, 79); d.setFontSize(9.5); d.text(clean(pr.mat || ''), 210, 79);
    d.line(170, 82, 287, 82); lbl('Lugar y Fecha', 172, 87); d.setFontSize(9.5); d.text(clean(((A.CFG && A.CFG.addr) || '').split(',').pop().trim() + '  ' + dmy(A.today())), 194, 87);
    d.line(170, 90, 287, 90); lbl('FIRMA Y SELLO', 215, 109);
    /* prácticas */
    const tx = 10, ty = 118, cw = [24, 15, 15, 28, 70], rh = 9.4, heads = ['FECHA', 'PIEZA', 'CARA', 'CÓDIGO', 'FIRMA DEL PACIENTE'];
    d.setLineWidth(0.3); let x = tx; heads.forEach((h, i) => { d.rect(x, ty, cw[i], 6); lbl(h, x + cw[i] / 2 - d.getTextWidth(h) / 2, ty + 4.3); x += cw[i]; });
    for (let r = 0; r < 6; r++) {
      let xx = tx; const y = ty + 6 + r * rh, it = rows[r];
      cw.forEach((w) => { d.rect(xx, y, w, rh); xx += w; });
      if (it) {
        d.setFontSize(9); d.text(dmy(it.fecha), tx + 2, y + 6); d.text(clean(it.pieza), tx + cw[0] + cw[1] / 2, y + 6, { align: 'center' }); d.text(clean(it.cara), tx + cw[0] + cw[1] + cw[2] / 2, y + 6, { align: 'center' });
        d.text(clean(it.cod), tx + cw[0] + cw[1] + cw[2] + 2, y + 6);
        if (f.sig) { try { d.addImage(f.sig, 'PNG', tx + 152 - 70 + 12, y + 0.6, 46, rh - 1.2, 'sig' + f.id, 'FAST'); } catch (e) { /* nada */ } }
      }
    }
    /* consentimiento */
    const cx = 170, cy = 118; d.setFontSize(7.6); d.setTextColor(20, 20, 20);
    const dr = pr.name ? (/^dr/i.test(pr.name) ? pr.name : 'Dr/a. ' + pr.name) : 'Dr. ......................';
    const t1 = '1 - Por la presente autorizo al ' + dr + ' para realizar el siguiente tratamiento.';
    const t2 = '2 - He conversado con el profesional sobre la naturaleza y propósitos del tratamiento, sobre la posibilidad de complicaciones, los riesgos y posibles métodos alternativos del tratamiento.';
    const t3 = '3 - Autorizo al ' + dr + ' a proveer los servicios o tratamientos adicionales que considere razonables, incluyendo, aunque no limitados a ellos, la administración de anestesia local, prácticas radiológicas y otros métodos de diagnósticos.';
    let yy = cy + 3; [t1, t2, t3].forEach(t => { const ls = d.splitTextToSize(clean(t), 117); d.text(ls, cx, yy); yy += ls.length * 3.2 + 1.2; });
    yy += 1; if (f.sig) { try { d.addImage(f.sig, 'PNG', cx, yy - 1, 36, 11, 'sig' + f.id, 'FAST'); } catch (e) { /* nada */ } }
    d.setFontSize(9); d.text(clean((p.first || '') + ' ' + (p.last || '')), cx + 42, yy + 7); d.text('Titular', cx + 92, yy + 7);
    d.line(cx, yy + 10, cx + 117, yy + 10); lbl('FIRMA', cx + 10, yy + 13.5); lbl('ACLARACIÓN', cx + 48, yy + 13.5); lbl('RELACIÓN', cx + 92, yy + 13.5);
    d.setFontSize(6.6); d.text(d.splitTextToSize('Si el paciente es menor de edad, discapacitado o inconsciente, el padre, madre, tutor o curador, debidamente acreditado debe firmar por él. Debe declarar la relación del firmante con el paciente y nombre.', 117), cx, yy + 17);
    /* observaciones y pie */
    lbl('Observaciones:', 10, 188); d.setFontSize(9); d.text(clean(f.obs || ''), 34, 187.4, { maxWidth: 160 }); d.line(33, 188.6, 200, 188.6);
    d.setFontSize(6.5); d.setTextColor(...MUT);
    d.text('Ficha generada con OdontoVoz. Firma del paciente: firma electrónica (Ley 25.506, art. 5)' + (f.sigAt ? ', ' + dmy(f.sigAt.slice(0, 10)) : '') + '.', 10, 203);
    if (f.perio) { d.setFont('helvetica', 'bold'); d.setFontSize(8); d.setTextColor(20, 20, 20); d.text('FICHA PERIODONTAL AL DORSO', 287, 203, { align: 'right' }); d.setFont('helvetica', 'normal'); }
  }
  function lastExam(pid) { const P = (A.pd(pid) || {}).perio; const E = (P && P.exams) || []; return E.length ? E[E.length - 1] : null; }
  function back(d, pid) {
    const ex = lastExam(pid); d.setTextColor(20, 20, 20); d.setDrawColor(...LINE);
    d.setFont('helvetica', 'bold'); d.setFontSize(13); d.text('FICHA PERIODONTAL', 148.5, 13, { align: 'center' });
    d.setFontSize(9); d.text('DERECHA', 10, 20); d.text('IZQUIERDA', 152, 20); d.setFont('helvetica', 'normal');
    const t = n => (ex && ex.t && ex.t[n]) || null;
    const ps = (n, s) => { const o = t(n); if (!o || o.x) return o && o.x ? 'X' : ''; const v = o.v && o.v.ps ? o.v.ps[s] : null; return v != null && v !== '' && +v > 3 ? String(v) : ''; };
    const mob = n => { const o = t(n); return o && !o.x && +o.mob > 0 ? String(o.mob) : ''; };
    const bop = nums => nums.some(n => { const o = t(n); return o && !o.x && ['v', 'l'].some(f => o[f] && o[f].bop && Object.keys(o[f].bop).some(k => o[f].bop[k])); });
    const cw = 15.5, lw = 14;
    function quad(nums, x0, y0, upper) {
      const rowsU = [['DIENTE', 'n'], ['PROF. BOLSA', 'ps'], ['MOVIL', 'mob']], R = upper ? rowsU : rowsU.slice().reverse();
      R.forEach((r, ri) => {
        const y = y0 + ri * 8; d.setLineWidth(0.3); d.rect(x0, y, lw, 8); d.setFontSize(6.5); d.setFont('helvetica', 'bold'); d.text(d.splitTextToSize(r[0], lw - 1), x0 + 0.8, y + 3.4); d.setFont('helvetica', 'normal');
        nums.forEach((n, i) => {
          const x = x0 + lw + i * cw; d.rect(x, y, cw, 8);
          if (r[1] === 'n') { d.setFontSize(8); d.text(String(n), x + cw / 2, y + 3.4, { align: 'center' }); d.setFontSize(7); d.text('D', x + cw / 4, y + 7, { align: 'center' }); d.text('M', x + 3 * cw / 4, y + 7, { align: 'center' }); }
          else if (r[1] === 'ps') { d.line(x + cw / 2, y + 1.5, x + cw / 2, y + 6.5); d.setFontSize(9); d.text(ps(n, 'd'), x + cw / 4, y + 5.6, { align: 'center' }); d.text(ps(n, 'm'), x + 3 * cw / 4, y + 5.6, { align: 'center' }); }
          else { d.setFontSize(9); d.text(mob(n), x + cw / 2, y + 5.6, { align: 'center' }); }
        });
      });
      const hy = upper ? y0 + 24 : y0 - 6, hb = ex ? bop(nums) : null;
      d.setFontSize(7.5); d.text('HEMORRAGIA EN ESTE CUADRANTE', x0, hy + 4.2); const sx = x0 + 78;
      d.text('SI', sx, hy + 4.2); d.rect(sx + 4, hy + 1.3, 3.5, 3.5); d.text('NO', sx + 12, hy + 4.2); d.rect(sx + 17, hy + 1.3, 3.5, 3.5);
      if (hb === true) d.text('X', sx + 4.8, hy + 4.3); if (hb === false) d.text('X', sx + 17.8, hy + 4.3);
    }
    quad([18, 17, 16, 15, 14, 13, 12, 11], 10, 23, true); quad([21, 22, 23, 24, 25, 26, 27, 28], 152, 23, true);
    quad([48, 47, 46, 45, 44, 43, 42, 41], 10, 66, false); quad([31, 32, 33, 34, 35, 36, 37, 38], 152, 66, false);
    const box = (x, y) => d.rect(x, y - 3, 3.5, 3.5);
    let y = 102; d.setFontSize(8.5); d.text('DIAGNÓSTICO: Marque lo que corresponda:', 10, y);
    d.text('PERIODONTITIS LEVE O MOD.', 10, y + 7); d.text('1 ARCADA', 64, y + 7); box(84, y + 7); d.text('AMBAS ARCADAS', 50, y + 13); box(84, y + 13);
    d.text('GINGIVITIS MARGINAL CRÓNICA', 152, y + 7); box(218, y + 7); d.text('PERIODONTITIS SEVERA', 152, y + 13); d.text('1 ARCADA', 198, y + 13); box(218, y + 13); d.text('AMBAS ARCADAS', 184, y + 19); box(218, y + 19);
    d.text('PRONÓSTICO', 10, y + 25); d.text('Bueno', 32, y + 25); box(42, y + 25); d.text('Regular', 50, y + 25); box(63, y + 25); d.text('Malo', 71, y + 25); box(80, y + 25);
    d.text('PLAN DE TRATAMIENTO:', 10, y + 33); d.line(48, y + 33.6, 287, y + 33.6); d.line(10, y + 40, 287, y + 40);
    if (ex) { d.setFontSize(7); d.setTextColor(...MUT); d.text('Profundidad de bolsa (solo > 3 mm, vestibular), movilidad y sangrado tomados del periodontograma del ' + dmy(ex.date) + '.', 10, y + 46); d.setTextColor(20, 20, 20); }
    d.setFont('helvetica', 'bold'); d.setFontSize(8.5); d.text('INSTRUCCIONES', 148.5, 154, { align: 'center' }); d.setFont('helvetica', 'normal'); d.setFontSize(7);
    const ins = ['Medición de Bolsas: Con una sonda periodontal, mida la profundidad de la bolsa en mesial y distal solamente, de cada diente. Aborde por vestibular en el punto más próximo a la relación de contacto y en direcciones paralelas al eje mayor del diente. Solo anote en diagrama medidas superiores a 3 mm.',
      'Hemorragia: Luego de la medición de bolsas en cada cuadrante observe en cuál de ellos hubo hemorragia y marque lo que corresponda. Se considerará que sí hay hemorragia, aunque solo ocurra en una pieza dentaria.',
      'Movilidad: Usando un instrumento mueva el diente en sentido vestíbulo-lingual y presiónelo apicalmente. 0 = No hay movilidad o inferior a 0,5 mm · 1 = 0,5 a 1 mm · 2 = 1,0 a 2,0 mm · 3 = movilidad mayor a 2,0 mm o depresibilidad.'];
    let yi = 159; ins.forEach(t => { const ls = d.splitTextToSize(t, 230); d.text(ls, 10, yi); yi += ls.length * 3.1 + 1.2; });
    d.line(220, 196, 287, 196); d.setFont('helvetica', 'bold'); d.setFontSize(8); d.text('Firma del Profesional', 253.5, 200, { align: 'center' }); d.setFont('helvetica', 'normal');
  }
  function addFicha(d, pid, f, first) {
    const rows = f.rows.length ? f.rows : [], pages = Math.max(1, Math.ceil(rows.length / 6));
    for (let k = 0; k < pages; k++) { if (!first || k > 0) d.addPage('a4', 'landscape'); first = false; front(d, pid, f, rows.slice(k * 6, k * 6 + 6), k + 1, pages); }
    if (f.perio) { d.addPage('a4', 'landscape'); back(d, pid); }
  }
  function summary(d, mes, L, pro) {
    d.setTextColor(20, 20, 20); d.setFont('helvetica', 'bold'); d.setFontSize(15); d.text('Presentación FORN · ' + clean(mesTxt(mes)), 10, 16);
    d.setFont('helvetica', 'normal'); d.setFontSize(9.5);
    const P = pro ? proOf(pro) : null;
    d.text(clean((P ? P.name + (P.mat ? ' · Matrícula ' + P.mat : '') + ' · ' : '') + A.CLINIC + ' · ' + L.length + ' fichas · ' + L.reduce((s, x) => s + x.f.rows.length, 0) + ' prácticas'), 10, 23);
    const cols = [['#', 8], ['Paciente', 58], ['DNI', 24], ['Obra social', 40], ['N° afiliado', 32], ['Prácticas (código · pieza · cara)', 104], ['Firma', 14]];
    let y = 31, x = 10; d.setFont('helvetica', 'bold'); d.setFontSize(8); cols.forEach(c => { d.text(c[0], x + 1, y); x += c[1]; }); d.setFont('helvetica', 'normal'); d.line(10, y + 1.5, 290, y + 1.5); y += 6;
    L.forEach((it, i) => {
      const pr = it.f.rows.map(r => [r.cod, r.pieza, r.cara].filter(Boolean).join(' · ')).join('; '), ls = d.splitTextToSize(clean(pr || '-'), 102), h = Math.max(1, ls.length) * 3.6 + 2;
      if (y + h > 200) { d.addPage('a4', 'landscape'); y = 16; }
      x = 10; d.setFontSize(8.5);
      [String(i + 1), it.p.last + ', ' + it.p.first, it.p.dni || '', it.f.os || it.p.cov || '', it.f.afil || '', null, it.f.sig ? 'Sí' : 'No'].forEach((v, k) => { if (v === null) d.text(ls, x + 1, y); else d.text(d.splitTextToSize(clean(v), cols[k][1] - 2), x + 1, y); x += cols[k][1]; });
      y += h; d.setDrawColor(220, 225, 227); d.line(10, y - 2.6, 290, y - 2.6); d.setDrawColor(...LINE);
    });
  }
  function makeDoc() {
    if (!window.jspdf || !window.jspdf.jsPDF) { A.toast('No se pudo cargar el generador de PDF (necesita internet la primera vez).'); return null; }
    const d = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape', compress: true }); d.setFont('helvetica', 'normal'); return d;
  }
  const fileName = (mes, who) => 'FORN-' + mes + (who ? '-' + A.norm(who).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '') + '.pdf';
  A.acts.frnPdf1 = () => {
    const m = S.modal, f = cur(), p = A.PAT(m.pid); if (!f) return; const d = makeDoc(); if (!d) return;
    addFicha(d, m.pid, f, true); A.saveFile(fileName(f.mes, p && p.last + ' ' + p.first), d.output('blob'));
  };
  function monthPdf() {
    const m = S.modal, L = monthFichas(m.mes, m.pro); if (!L.length) return null; const d = makeDoc(); if (!d) return null;
    summary(d, m.mes, L, m.pro); L.forEach(x => addFicha(d, x.p.id, x.f, false));
    return { blob: d.output('blob'), name: fileName(m.mes, m.pro ? proOf(m.pro).name : ''), L, mes: m.mes };
  }
  A._fornMonthPdf = monthPdf; /* para pruebas */
  A.acts.frnPdfAll = () => { const r = monthPdf(); if (r) A.saveFile(r.name, r.blob); };
  const resumen = r => 'Presentación FORN ' + mesTxt(r.mes) + ' · ' + A.CLINIC + '\n' + r.L.length + ' fichas, ' + r.L.reduce((s, x) => s + x.f.rows.length, 0) + ' prácticas.\n\n' + r.L.map((x, i) => (i + 1) + '. ' + x.p.last + ', ' + x.p.first + ' · DNI ' + (x.p.dni || '-') + ' · ' + (x.f.os || x.p.cov || '') + (x.f.afil ? ' · Afil. ' + x.f.afil : '') + ' · ' + x.f.rows.map(rw => rw.cod).filter(Boolean).join(', ')).join('\n');
  A.acts.frnShare = async () => {
    const r = monthPdf(); if (!r) return;
    const file = typeof File === 'function' ? new File([r.blob], r.name, { type: 'application/pdf' }) : null;
    if (!window.OV_NATIVE && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: r.name, text: 'Presentación FORN ' + mesTxt(r.mes) }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    await A.saveFile(r.name, r.blob); /* en la app instalada abre el menú para mandarlo por WhatsApp, mail o Drive */
    if (!window.OV_NATIVE) A.toast('Se descargó ' + r.name + '. Adjuntalo en WhatsApp o en el mail.');
  };
  A.acts.frnMail = async () => {
    const r = monthPdf(); if (!r) return; await A.saveFile(r.name, r.blob);
    const sub = 'Presentación FORN ' + mesTxt(r.mes) + ' · ' + A.CLINIC;
    try { location.href = 'mailto:?subject=' + encodeURIComponent(sub) + '&body=' + encodeURIComponent(resumen(r) + '\n\n(Adjunto el PDF con las fichas: ' + r.name + ')'); } catch (e) { /* nada */ }
  };

  /* ---------- entrada en el menú ---------- */
  const IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/></svg>';
  function menu() {
    if ($('#drFornMes')) return;
    const ref = $('#gearMenu .dnav[data-act="cajaOpen"]') || $('#gearMenu .dnav[data-act="importOpen"]') || $('#gearMenu .dnav[data-act="notifOpen"]'); if (!ref) return;
    ref.insertAdjacentHTML('beforebegin', '<button class="dnav" id="drFornMes" data-act="frnOpen">' + IC + '<span class="t">FORN · Presentación mensual<small>Fichas de la Federación de Río Negro</small></span></button>');
  }
  const arPrev = A.afterRefresh;
  A.afterRefresh = function () { if (arPrev) arPrev.apply(this, arguments); try { menu(); } catch (e) { /* nada */ } };

  /* ---------- estilos ---------- */
  const css = document.createElement('style');
  css.id = 'ovApp109';
  css.textContent = [
    '.frn-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: space-between; }',
    '.frn-card h2 { font-size: 17px; } .frn-sub { font-size: 12.5px; font-weight: 500; color: var(--ink-2); margin-left: 6px; }',
    '.frn-mini { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; font-size: 14px; }',
    '.frn-mini li { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; } .frn-mini li span:nth-child(2) { color: var(--ink-2); }',
    '.frn-ed { display: flex; flex-direction: column; gap: 10px; }',
    '.frn-top { display: flex; gap: 12px; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; } .frn-top > div { display: flex; flex-direction: column; } .frn-pat { font-size: 17px; } .frn-mes { max-width: 190px; }',
    '.frn-dat { border: 1px solid var(--line); border-radius: 12px; padding: 8px 12px; background: var(--surface-2); } .frn-dat summary { cursor: pointer; font-weight: 600; }',
    '.frn-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 8px; margin-top: 8px; }',
    '.frn-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin: 6px 0 0; font-size: 15px; }',
    '.frn-rows { display: flex; flex-direction: column; gap: 6px; }',
    '.frn-row { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, .8fr) minmax(0, .8fr) minmax(0, 1.2fr) auto; gap: 6px; align-items: center; }',
    '.frn-row .inp { min-height: 40px; padding: 6px 8px; } .frn-desc { grid-column: 1 / -1; font-size: 12.5px; color: var(--ink-2); margin-top: -2px; }',
    '@media (max-width: 560px) { .frn-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.3fr) auto; padding-bottom: 6px; border-bottom: 1px solid var(--line); } .frn-row input[type=date] { grid-column: 1 / 4; grid-row: 1; } .frn-row > button { grid-column: 4; grid-row: 1; } }',
    '.frn-sigbox { position: relative; border: 1.5px dashed var(--line); border-radius: 12px; background: var(--surface); }',
    '.frn-sigbox canvas { display: block; width: 100%; height: auto; aspect-ratio: 600 / 180; touch-action: none; cursor: crosshair; }',
    '.frn-ph { position: absolute; inset: 0; display: grid; place-items: center; color: var(--ink-2); font-size: 14px; pointer-events: none; }',
    '.frn-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; } .frn-bar b { font-size: 17px; min-width: 130px; text-align: center; } .frn-pro { max-width: 260px; }',
    '.frn-list { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }',
    '.frn-it { width: 100%; display: flex; align-items: center; gap: 10px; justify-content: space-between; text-align: left; border: 1px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 12px; padding: 10px 12px; cursor: pointer; font: inherit; flex-wrap: wrap; }',
    '.frn-it:hover { border-color: var(--accent); } .frn-n { display: flex; flex-direction: column; min-width: 0; flex: 1 1 220px; } .frn-n small { color: var(--ink-2); font-size: 12.5px; overflow-wrap: anywhere; }',
    '.frn-st { display: flex; gap: 6px; flex-wrap: wrap; } .frn-empty { color: var(--ink-2); }'
  ].join('\n');
  document.body.appendChild(css);
})();
