/* ===== v6.1: obras sociales con aranceles, trabajos de laboratorio, tipo de cuenta sin perder datos, voz conversada ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, C = window.OVCmd, V = A.voice;
  A.VERSION = '6.1';
  const N = s => A.norm(s);
  const num = v => parseInt(String(v == null ? '' : v).replace(/\D/g, ''), 10) || 0;

  /* =====================================================================
     OBRAS SOCIALES Y PREPAGAS
     Códigos del Nomenclador Nacional odontológico (los usan IAPOS, los círculos y las federaciones).
     Los montos cambian seguido: se cargan en 0 para que cada profesional ponga los de su convenio.
     ===================================================================== */
  const NOMEN = [
    ['01.01', 'Consulta / relevamiento bucal'], ['01.02', 'Consulta de urgencia'],
    ['02.01', 'Restauración simple (1 cara)'], ['02.02', 'Restauración compuesta (2 o más caras)'], ['02.09', 'Restauración compleja'],
    ['03.01', 'Endodoncia 1 conducto'], ['03.02', 'Endodoncia 2 conductos'], ['03.03', 'Endodoncia 3 conductos'], ['03.04', 'Endodoncia 4 conductos'],
    ['05.02', 'Topicación con flúor'], ['05.04', 'Enseñanza de higiene y control de placa'], ['05.05', 'Sellantes de fosas y fisuras'],
    ['08.12', 'Tratamiento de gingivitis (por arcada) / limpieza'], ['08.16', 'Tratamiento periodontal (bolsa hasta 4 mm)'], ['08.17', 'Tratamiento periodontal (bolsa más de 4 mm)'],
    ['09.01.01', 'Radiografía periapical'], ['09.02.04', 'Panorámica (pantomografía)'],
    ['10.01', 'Extracción dentaria'], ['10.09', 'Extracción de diente retenido'], ['10.12', 'Apicectomía'],
    ['04.01.08', 'Perno muñón'], ['04.01.04', 'Corona colada'], ['04.01.15', 'Corona de porcelana'], ['04.01.12', 'Provisorio de acrílico'],
    ['04.02.01', 'Prótesis parcial acrílica'], ['04.02.03', 'Prótesis parcial cromo-cobalto'], ['04.03.01', 'Prótesis completa superior'], ['04.03.02', 'Prótesis completa inferior'],
    ['04.04.01', 'Compostura de prótesis'], ['04.04.10', 'Rebasado de prótesis completa'], ['11.02.00', 'Implante dental']
  ];
  A.NOMEN = NOMEN;
  const NC = 'Círculo Odontológico de Neuquén', RN = 'Federación Odontológica de Río Negro';
  /* [sigla, nombre, tipo, gestión] — la gestión («a través de…») es orientativa: confirmala con tu círculo o federación */
  const OS_SEED = [
    ['Particular', 'Particular (sin cobertura)', 'particular', ''],
    ['ISSN', 'Instituto de Seguridad Social del Neuquén', 'provincial', NC],
    ['IPROSS', 'Instituto Provincial del Seguro de Salud (Río Negro)', 'provincial', RN],
    ['PAMI', 'PAMI (INSSJP)', 'nacional', ''], ['IOSFA', 'IOSFA (Fuerzas Armadas y de Seguridad)', 'nacional', ''], ['OSPJN', 'Obra Social del Poder Judicial de la Nación', 'nacional', ''],
    ['OSDE', 'OSDE', 'prepaga', ''], ['Swiss Medical', 'Swiss Medical', 'prepaga', ''], ['Galeno', 'Galeno', 'prepaga', ''], ['Medifé', 'Medifé', 'prepaga', ''],
    ['Omint', 'Omint', 'prepaga', ''], ['Sancor Salud', 'Sancor Salud', 'prepaga', ''], ['Prevención Salud', 'Prevención Salud', 'prepaga', ''], ['Avalian', 'Avalian (ex ACA Salud)', 'prepaga', ''],
    ['Federada Salud', 'Federada Salud', 'prepaga', ''], ['Jerárquicos', 'Jerárquicos Salud', 'prepaga', ''], ['Medicus', 'Medicus', 'prepaga', ''], ['Accord Salud', 'Accord Salud', 'prepaga', ''],
    ['OSECAC', 'OSECAC (Empleados de Comercio)', 'sindical', ''], ['OSPRERA', 'OSPRERA (Personal Rural)', 'sindical', ''], ['OSPe', 'OSPe (Petroleros)', 'sindical', ''],
    ['UOCRA', 'OSPeCon · Construcción (UOCRA)', 'sindical', ''], ['Unión Personal', 'Unión Personal (UPCN)', 'sindical', ''], ['OSUTHGRA', 'OSUTHGRA (Gastronómicos)', 'sindical', ''],
    ['OSPEDYC', 'OSPEDYC (Entidades Deportivas y Civiles)', 'sindical', ''], ['Luz y Fuerza', 'OSFATLyF (Luz y Fuerza)', 'sindical', ''], ['OSDEPYM', 'OSDEPYM', 'sindical', ''], ['OSPIP', 'OSPIP (Industria Plástica)', 'sindical', '']
  ];
  const KIND = { particular: 'Particular', provincial: 'Provincial', nacional: 'Nacional', prepaga: 'Prepaga', sindical: 'Sindical' };
  function seed() { return OS_SEED.map((r, i) => ({ id: 'os' + i, sigla: r[0], name: r[1], kind: r[2], via: r[3], on: r[2] !== 'particular', auth: false, plans: '', notes: '', upd: null, aran: {} })); }
  A.osList = () => { if (!Array.isArray(A.CFG.os)) { A.CFG.os = seed(); A.save(); } return A.CFG.os; };
  A.osById = id => A.osList().filter(o => o.id === id)[0] || null;
  A.osOf = pat => {
    if (!pat) return null; const c = N(pat.cov); if (!c || /^particular/.test(c)) return null;
    return A.osList().filter(o => o.kind !== 'particular').map(o => ({ o, s: N(o.sigla), n: N(o.name) })).filter(x => c === x.s || c === x.n || c.indexOf(x.s + ' ') === 0 || c.indexOf(x.n) === 0 || (x.s.length > 3 && c.indexOf(x.s) >= 0)).map(x => x.o)[0] || null;
  };
  /* qué código del nomenclador corresponde a una práctica del plan */
  A.codeFor = t => {
    if (t.code) return t.code;
    const c = t.cond, faces = String(t.faces || '').replace(/[^a-z]/gi, '').length, u = t.tooth ? t.tooth % 10 : 0, l = N(t.label);
    if (['composite', 'amalgama', 'obturacion', 'ionomero', 'caries'].indexOf(c) >= 0) return faces >= 2 ? '02.02' : '02.01';
    if (c === 'endodoncia') return u >= 6 ? '03.03' : u >= 4 ? '03.02' : '03.01';
    if (c === 'extraccion' || c === 'extraido') return '10.01';
    if (c === 'corona') return '04.01.15'; if (c === 'perno') return '04.01.08'; if (c === 'implante') return '11.02.00'; if (c === 'sellador') return '05.05';
    const kw = [[/urgencia/, '01.02'], [/consulta|control|revision|relevamiento/, '01.01'], [/limpieza|tartrectomia|profilaxis|gingivitis|destartraje/, '08.12'], [/fluor/, '05.02'], [/sellador|sellante/, '05.05'],
      [/panoram/, '09.02.04'], [/radiograf|\brx\b|periapical/, '09.01.01'], [/retenid/, '10.09'], [/extracci|exodoncia/, '10.01'], [/endodoncia|conducto/, '03.01'], [/perno/, '04.01.08'], [/provisori/, '04.01.12'],
      [/completa/, '04.03.01'], [/cromo|esqueletic/, '04.02.03'], [/parcial/, '04.02.01'], [/rebasad/, '04.04.10'], [/compostura|reparaci/, '04.04.01'], [/corona/, '04.01.15'], [/implante/, '11.02.00'], [/composite|resina|obturaci|restauraci|amalgama/, '02.01']];
    for (const k of kw) if (k[0].test(l)) return k[1];
    return null;
  };
  const codeName = code => (NOMEN.filter(x => x[0] === code)[0] || [code, code])[1];
  /* al registrar una práctica hecha a un paciente con obra social: al paciente se le carga solo el coseguro */
  const origDone = A.onTxDone;
  A.onTxDone = (pid, t) => {
    origDone(pid, t);
    const pat = A.PAT(pid), os = A.osOf(pat), code = A.codeFor(t), ar = os && os.on && code ? os.aran[code] : null;
    if (!ar || !ar.on) return;
    t.os = { id: os.id, sigla: os.sigla, code, cov: ar.cov || 0, cos: ar.cos || 0, afil: pat.afil || '' };
    const e = A.pd(pid).ledger.filter(x => x.txId === t.id && x.type === 'cargo')[0];
    if (e) { e.amount = ar.cos || 0; e.desc += ' · ' + os.sigla + ' cubre ' + A.money(ar.cov || 0) + (ar.cos ? ' (coseguro)' : ''); e.os = os.id; }
    A.touchPd(pid);
  };
  /* lo realizado en un mes para cada obra social (para presentar al círculo o a la obra social) */
  A.osMonth = (month, osId) => {
    const out = [];
    Object.keys(A.S.pd).forEach(pid => {
      const pd = A.S.pd[pid], pat = A.PAT(pid); if (!pd || !pat) return;
      (pd.tx || []).forEach(t => {
        if (t.status !== 'hecho' || !t.doneDate || t.doneDate.slice(0, 7) !== month) return;
        const id = t.os ? t.os.id : (A.osOf(pat) || {}).id; if (!id || (osId && id !== osId)) return;
        out.push({ pid, pat, t, os: id, code: (t.os && t.os.code) || A.codeFor(t), cov: t.os ? t.os.cov : null, cos: t.os ? t.os.cos : null });
      });
    });
    return out.sort((a, b) => (a.t.doneDate < b.t.doneDate ? -1 : 1));
  };
  A.covFieldHTML = p => '<div class="field"><label for="pf_cov">Obra social / prepaga</label><input id="pf_cov" list="osDl" data-chg="profField" data-k="cov" value="' + esc(p.cov || '') + '" placeholder="Elegí o escribí"><datalist id="osDl">' + A.osList().map(o => '<option value="' + esc(o.sigla) + '">' + esc(o.name) + '</option>').join('') + '</datalist></div>';

  /* ---------- pantallas ---------- */
  const monthNow = () => A.today().slice(0, 7);
  const monLabel = m => { const d = new Date(+m.slice(0, 4), +m.slice(5) - 1, 1); return A.cap(d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })); };
  const addMon = (m, n) => { const d = new Date(+m.slice(0, 4), +m.slice(5) - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  A.acts.osOpen = () => { A.hideDrawer(); S.modal = { type: 'osList', m: monthNow(), q: '' }; A.renderModal(); };
  MF.osList = m => {
    const rows = A.osMonth(m.m), byOs = {};
    rows.forEach(r => { const b = byOs[r.os] || (byOs[r.os] = { n: 0, cov: 0, cos: 0 }); b.n++; b.cov += r.cov || 0; b.cos += r.cos || 0; });
    const q = N(m.q), list = A.osList().filter(o => !q || N(o.name + ' ' + o.sigla + ' ' + o.via).indexOf(q) >= 0);
    list.sort((a, b) => ((byOs[b.id] || {}).n || 0) - ((byOs[a.id] || {}).n || 0) || (b.on - a.on) || a.sigla.localeCompare(b.sigla, 'es'));
    const tot = Object.values(byOs).reduce((s, b) => s + b.cov, 0);
    let b = '<div class="os-head"><button class="btn small" data-act="osMon" data-n="-1" aria-label="Mes anterior">‹</button><b>' + esc(monLabel(m.m)) + '</b><button class="btn small" data-act="osMon" data-n="1" aria-label="Mes siguiente">›</button></div>';
    b += '<div class="stats"><div class="stat"><b>' + rows.length + '</b>prácticas con obra social</div><div class="stat"><b>' + A.money(tot) + '</b>a facturar a obras sociales</div></div>';
    b += '<input class="inp" data-in="osQ" placeholder="Buscar obra social" value="' + esc(m.q) + '" style="width:100%;margin:6px 0">';
    b += '<div class="os-list">' + list.map(o => { const s = byOs[o.id], nA = Object.keys(o.aran || {}).filter(k => o.aran[k].on).length;
      return '<button class="os-row' + (o.on ? '' : ' os-off') + '" data-act="osEdit" data-id="' + o.id + '"><span class="os-n"><b>' + esc(o.sigla) + '</b><small>' + esc(o.name !== o.sigla ? o.name : KIND[o.kind] || '') + (o.via ? ' · vía ' + esc(o.via) : '') + '</small></span><span class="os-c">' + (s ? '<b>' + s.n + '</b> prácticas · ' + A.money(s.cov) : '<small>' + (o.kind === 'particular' ? 'precios del catálogo' : nA ? nA + ' aranceles cargados' : 'sin aranceles') + '</small>') + '</span></button>'; }).join('') + '</div>';
    return A.modalShell('Obras sociales y prepagas', b, '<button class="btn" data-act="osNew">+ Agregar</button><button class="btn primary" data-act="closeModal">Listo</button>', true);
  };
  A.ins.osQ = el => { S.modal.q = el.value; const pos = el.selectionStart; A.renderModal(); const i = $('#modalHost input[data-in="osQ"]'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) { /* nada */ } } };
  A.acts.osMon = el => { const m = S.modal; m.m = addMon(m.m, parseInt(el.getAttribute('data-n'), 10)); A.renderModal(); };
  A.acts.osNew = () => { const o = { id: A.uid(), sigla: 'Nueva', name: 'Obra social nueva', kind: 'sindical', via: '', on: true, auth: false, plans: '', notes: '', upd: null, aran: {} }; A.osList().push(o); A.save(); S.modal = { type: 'osEdit', id: o.id, m: monthNow(), back: S.modal }; A.renderModal(); };
  A.acts.osEdit = el => { S.modal = { type: 'osEdit', id: el.getAttribute('data-id'), m: (S.modal && S.modal.m) || monthNow(), back: S.modal }; A.renderModal(); };
  MF.osEdit = m => {
    const o = A.osById(m.id); if (!o) return '';
    const F = (k, l, v, ph) => '<div class="field"><label for="os_' + k + '">' + l + '</label><input id="os_' + k + '" data-chg="osField" data-os="' + o.id + '" data-k="' + k + '" value="' + esc(v || '') + '" placeholder="' + esc(ph || '') + '"' + (k === 'via' ? ' list="osVia"' : '') + '></div>';
    let b = '<div class="row2">' + F('sigla', 'Nombre corto (como figura en la ficha)', o.sigla) + F('name', 'Nombre completo', o.name) + '</div>';
    b += '<div class="row3"><div class="field"><label for="os_kind">Tipo</label><select id="os_kind" data-chg="osField" data-os="' + o.id + '" data-k="kind">' + Object.keys(KIND).map(k => '<option value="' + k + '"' + (o.kind === k ? ' selected' : '') + '>' + KIND[k] + '</option>').join('') + '</select></div>' + F('via', 'Se factura a través de', o.via, 'Directo, círculo o federación') + F('plans', 'Planes', o.plans, 'Ej.: 210, 310, 410') + '</div>';
    b += '<datalist id="osVia"><option>Directo</option><option>' + NC + '</option><option>' + RN + '</option><option>Colegio de Odontólogos</option></datalist>';
    b += '<label class="chk"><input type="checkbox" data-chg="osField" data-os="' + o.id + '" data-k="on"' + (o.on ? ' checked' : '') + '> Trabajo con esta obra social (convenio vigente)</label><label class="chk"><input type="checkbox" data-chg="osField" data-os="' + o.id + '" data-k="auth"' + (o.auth ? ' checked' : '') + '> Pide autorización u orden antes de atender</label>';
    if (o.kind !== 'particular') {
      b += '<div class="block"><h3>Aranceles por práctica</h3><div class="hint" style="margin:0">Tildá lo que cubre. «Paga la obra social» es lo que te liquida; «Coseguro» es lo que paga el paciente. Al registrar una práctica hecha, al paciente se le carga solo el coseguro.' + (o.upd ? ' Actualizado el ' + A.fmtDMY(o.upd) + '.' : '') + '</div>';
      b += '<div class="os-tbl"><div class="os-th"><span>Código y práctica</span><span>Cubre</span><span>Paga la O.S.</span><span>Coseguro</span></div>' + NOMEN.concat(Object.keys(o.aran).filter(k => !NOMEN.some(x => x[0] === k)).map(k => [k, o.aran[k].label || k])).map(x => {
        const a = o.aran[x[0]] || {};
        return '<div class="os-tr' + (a.on ? ' on' : '') + '"><span><b>' + esc(x[0]) + '</b> ' + esc(x[1]) + '</span><input type="checkbox" data-chg="osAr" data-os="' + o.id + '" data-c="' + esc(x[0]) + '" data-f="on" aria-label="Cubre ' + esc(x[1]) + '"' + (a.on ? ' checked' : '') + '><input inputmode="numeric" data-chg="osAr" data-os="' + o.id + '" data-c="' + esc(x[0]) + '" data-f="cov" value="' + (a.cov || '') + '" placeholder="$" aria-label="Paga la obra social"><input inputmode="numeric" data-chg="osAr" data-os="' + o.id + '" data-c="' + esc(x[0]) + '" data-f="cos" value="' + (a.cos || '') + '" placeholder="$" aria-label="Coseguro"></div>';
      }).join('') + '</div>';
      b += '<div class="row-btns"><button class="btn small" data-act="osPct">Subir todos un %</button><button class="btn small" data-act="osCode">+ Otro código</button></div></div>';
      const rows = A.osMonth(m.m, o.id);
      b += '<div class="block"><h3>Prácticas de ' + esc(monLabel(m.m)) + ' <small>(' + rows.length + ')</small></h3>' + (rows.length ? '<table class="tbl"><thead><tr><th>Fecha</th><th>Paciente</th><th>Código</th><th class="num">O.S.</th></tr></thead><tbody>' + rows.map(r => '<tr><td class="mono">' + A.fmtDMY(r.t.doneDate).slice(0, 5) + '</td><td>' + esc(r.pat.last + ', ' + r.pat.first) + '</td><td>' + esc(r.code || '—') + (r.t.tooth ? ' · ' + r.t.tooth : '') + '</td><td class="num">' + (r.cov != null ? A.money(r.cov) : '<span class="hint">sin arancel</span>') + '</td></tr>').join('') + '</tbody></table><button class="btn small" data-act="osCsv">Descargar planilla del mes</button>' : '<div class="hint">Todavía no hay prácticas registradas este mes con esta obra social.</div>') + '</div>';
    }
    b += '<div class="field"><label for="os_notes">Notas (normas de trabajo, topes, contactos)</label><textarea id="os_notes" data-chg="osField" data-os="' + o.id + '" data-k="notes">' + esc(o.notes || '') + '</textarea></div>';
    return A.modalShell(o.sigla, b, '<button class="btn danger" data-act="osDel">Quitar</button><button class="btn primary" data-act="osBack">Listo</button>', true);
  };
  A.chg.osField = el => { const o = A.osById(el.getAttribute('data-os')); if (!o) return; const k = el.getAttribute('data-k'); o[k] = el.type === 'checkbox' ? el.checked : el.value.trim(); if (k === 'sigla' && !o.sigla) o.sigla = 'Sin nombre'; A.save(); if ((k === 'kind' || k === 'sigla') && S.modal && S.modal.type === 'osEdit') A.renderModal(); };
  A.chg.osAr = el => {
    const o = A.osById(el.getAttribute('data-os')); if (!o) return; const c = el.getAttribute('data-c'), f = el.getAttribute('data-f'), a = o.aran[c] || (o.aran[c] = { on: false, cov: 0, cos: 0 });
    if (f === 'on') a.on = el.checked; else { a[f] = num(el.value); el.value = a[f] || ''; if (a[f] && !a.on) { a.on = true; const cb = el.parentNode.querySelector('input[type=checkbox]'); if (cb) cb.checked = true; } }
    el.parentNode.classList.toggle('on', !!a.on); o.upd = A.today(); A.save();
  };
  A.acts.osPct = () => { S.modal = { type: 'osPct', id: S.modal.id, back: S.modal }; A.renderModal(); };
  MF.osPct = m => A.modalShell('Actualizar aranceles', '<p class="hint">Sube todos los montos cargados de ' + esc(A.osById(m.id).sigla) + ' (lo que paga la obra social y el coseguro). Se redondea a $100.</p><div class="field"><label for="pctV">Porcentaje de aumento</label><input id="pctV" inputmode="decimal" placeholder="Ej.: 8"></div>', '<button class="btn" data-act="osBack">Cancelar</button><button class="btn primary" data-act="osPctGo">Aplicar</button>');
  A.acts.osPctGo = () => {
    const p = parseFloat(String($('#pctV').value).replace(',', '.')) || 0, o = A.osById(S.modal.id); if (!p) return;
    Object.keys(o.aran).forEach(k => { const a = o.aran[k]; a.cov = Math.round((a.cov || 0) * (1 + p / 100) / 100) * 100; a.cos = Math.round((a.cos || 0) * (1 + p / 100) / 100) * 100; });
    o.upd = A.today(); A.save(); A.acts.osBack(); A.toast('Aranceles de ' + o.sigla + ' actualizados ' + p + '%.');
  };
  A.acts.osCode = () => { S.modal = { type: 'osCode', id: S.modal.id, back: S.modal }; A.renderModal(); };
  MF.osCode = () => A.modalShell('Agregar código', '<div class="row2"><div class="field"><label for="ocC">Código</label><input id="ocC" placeholder="Ej.: 07.03"></div><div class="field"><label for="ocL">Práctica</label><input id="ocL" placeholder="Ej.: Corona de acero"></div></div>', '<button class="btn" data-act="osBack">Cancelar</button><button class="btn primary" data-act="osCodeGo">Agregar</button>');
  A.acts.osCodeGo = () => { const c = $('#ocC').value.trim(), l = $('#ocL').value.trim(); if (!c) return; const o = A.osById(S.modal.id); o.aran[c] = { on: true, cov: 0, cos: 0, label: l || c }; A.save(); A.acts.osBack(); };
  A.acts.osBack = () => { const b = S.modal && S.modal.back; S.modal = b || null; A.renderModal(); };
  A.acts.osDel = () => { const o = A.osById(S.modal.id); if (A.PATS.some(p => A.osOf(p) === o)) { A.toast('Hay pacientes con ' + o.sigla + '. Desmarcá «trabajo con esta obra social» en lugar de quitarla.'); return; } A.CFG.os = A.osList().filter(x => x !== o); A.save(); A.acts.osBack(); };
  A.acts.osCsv = () => {
    const o = A.osById(S.modal.id), rows = A.osMonth(S.modal.m, o.id), q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lines = [['Fecha', 'Apellido', 'Nombre', 'DNI', 'N.º de afiliado', 'Código', 'Práctica', 'Pieza', 'Caras', 'Paga la O.S.', 'Coseguro', 'Profesional'].map(q).join(';')]
      .concat(rows.map(r => [A.fmtDMY(r.t.doneDate), r.pat.last, r.pat.first, r.pat.dni, r.pat.afil || '', r.code || '', r.code ? codeName(r.code) : r.t.label, r.t.tooth || '', (r.t.faces || '').toUpperCase(), r.cov != null ? r.cov : '', r.cos != null ? r.cos : '', A.PRO(r.t.pro) ? A.PRO(r.t.pro).name : ''].map(q).join(';')));
    A.saveFile('Prestaciones ' + o.sigla + ' ' + S.modal.m + '.csv', new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv' }));
  };

  /* =====================================================================
     TRABAJOS DE LABORATORIO (prótesis fija, removible y otros)
     ===================================================================== */
  const WORKS = {
    'Prótesis fija': ['Corona metal-cerámica', 'Corona de zirconio', 'Corona de disilicato de litio', 'Corona colada', 'Corona provisoria', 'Incrustación (inlay / onlay)', 'Carilla', 'Perno muñón colado', 'Puente fijo', 'Corona sobre implante'],
    'Prótesis removible': ['Prótesis completa', 'Prótesis parcial acrílica', 'Prótesis parcial cromo-cobalto', 'Prótesis flexible', 'Sobredentadura sobre implantes', 'Compostura / agregado', 'Rebasado'],
    'Otros': ['Placa miorrelajante', 'Placa de blanqueamiento', 'Retenedor / placa de ortodoncia', 'Cubeta individual', 'Modelos de estudio', 'Guía quirúrgica']
  };
  const STAGES = ['Impresión / escaneo', 'Cubeta individual', 'Rodetes de articulación', 'Prueba de estructura', 'Prueba de dientes (enfilado)', 'Prueba de bizcocho', 'Terminación', 'Reparación'];
  const LST = [['porenviar', 'Por enviar'], ['enviado', 'Enviado'], ['prueba', 'Volvió para prueba'], ['ajuste', 'Reenviado con ajustes'], ['listo', 'Listo / recibido'], ['instalado', 'Instalado / entregado'], ['cancelado', 'Cancelado']];
  const LSTL = {}; LST.forEach(x => { LSTL[x[0]] = x[1]; });
  const SHADES = ['A1', 'A2', 'A3', 'A3.5', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'D2', 'D3', 'D4', 'BL1', 'BL2'];
  A.labDir = () => { if (!Array.isArray(A.CFG.labs)) A.CFG.labs = []; return A.CFG.labs; };
  const open = l => ['enviado', 'ajuste', 'porenviar'].indexOf(l.status) >= 0;
  const late = l => (l.status === 'enviado' || l.status === 'ajuste') && l.due && l.due < A.today();
  function labCard(l, pid, showPat) {
    const p = A.PAT(pid);
    return '<article class="lab-card st-' + l.status + (late(l) ? ' late' : '') + '"><div class="lab-top"><b>' + esc(l.work) + (l.teeth ? ' · ' + esc(l.teeth) : '') + '</b><span class="chip ' + (late(l) ? 'bad' : l.status === 'instalado' ? 'ok' : l.status === 'prueba' || l.status === 'listo' ? 'acc' : '') + '">' + (late(l) ? 'Atrasado · ' : '') + esc(LSTL[l.status] || l.status) + '</span></div>' +
      (showPat ? '<div class="lab-pat">' + esc(p ? p.name : '') + '</div>' : '') +
      '<div class="lab-meta">' + [l.lab ? 'Lab.: ' + esc(l.lab) : '', l.stage ? esc(l.stage) : '', l.material ? esc(l.material) : '', l.shade ? 'Color ' + esc(l.shade) : '', l.sent ? 'Enviado ' + A.fmtDMY(l.sent).slice(0, 5) : '', l.due ? 'Vuelve ' + A.fmtDMY(l.due).slice(0, 5) : '', l.cost ? 'Costo ' + A.money(l.cost) + (l.paid ? ' (pagado)' : '') : ''].filter(Boolean).join(' · ') + '</div>' +
      (l.notes ? '<div class="lab-notes">' + esc(l.notes) + '</div>' : '') +
      '<div class="row-btns">' + nextBtns(l, pid) + '<button class="btn small" data-act="labEdit" data-pid="' + pid + '" data-id="' + l.id + '">Editar</button>' + (showPat ? '<button class="btn small ghost" data-act="labGoPat" data-pid="' + pid + '">Ver ficha</button>' : '<button class="btn small ghost" data-act="labWa" data-pid="' + pid + '" data-id="' + l.id + '">WhatsApp al laboratorio</button>') + '</div></article>';
  }
  function nextBtns(l, pid) {
    const nx = { porenviar: [['enviado', 'Marcar enviado']], enviado: [['prueba', 'Volvió para prueba'], ['listo', 'Llegó terminado']], ajuste: [['prueba', 'Volvió'], ['listo', 'Llegó terminado']], prueba: [['ajuste', 'Reenviar con ajustes'], ['instalado', 'Instalado']], listo: [['instalado', 'Instalado']] }[l.status] || [];
    return nx.map(x => '<button class="btn small primary" data-act="labSt" data-pid="' + pid + '" data-id="' + l.id + '" data-st="' + x[0] + '">' + x[1] + '</button>').join('');
  }
  A.render.labTab = pid => {
    const pd = A.pd(pid), l = pd.labs.slice().sort((a, b) => (open(b) - open(a)) || ((b.sent || '') < (a.sent || '') ? -1 : 1));
    let h = '<section class="card"><h2>Trabajos de laboratorio <span class="count">' + l.filter(open).length + ' en curso</span></h2><div class="row-btns" style="margin-bottom:10px"><button class="btn primary" data-act="labNew" data-pid="' + pid + '">+ Nuevo trabajo</button><button class="btn" data-act="labDirOpen">Mis laboratorios</button></div>';
    h += l.length ? '<div class="lab-list">' + l.map(x => labCard(x, pid, false)).join('') + '</div>' : '<div class="empty">No hay trabajos de laboratorio. Cargá coronas, prótesis, placas y demás para seguir en qué etapa está cada uno y cuándo vuelve.</div>';
    return h + '</section>';
  };
  A.acts.labNew = (el, ev, pre) => { const pid = (el && el.getAttribute && el.getAttribute('data-pid')) || A.curPid(); if (!pid) { A.toast('Abrí primero la ficha del paciente.'); return; } S.modal = { type: 'labEdit', pid, f: Object.assign({ id: null, kind: 'Prótesis fija', work: 'Corona de zirconio', teeth: '', material: '', shade: '', stage: 'Impresión / escaneo', lab: (A.labDir()[0] || {}).name || '', status: 'enviado', sent: A.today(), due: A.add(A.today(), 7), recv: '', cost: '', paid: false, notes: '' }, pre || {}) }; A.renderModal(); };
  A.acts.labEdit = el => { const pid = el.getAttribute('data-pid'), l = A.pd(pid).labs.filter(x => x.id === el.getAttribute('data-id'))[0]; if (!l) return; S.modal = { type: 'labEdit', pid, f: Object.assign({}, l) }; A.renderModal(); };
  MF.labEdit = m => {
    const f = m.f, kinds = Object.keys(WORKS), works = WORKS[f.kind] || [];
    const sel = (id, l, opts, v, chg) => '<div class="field"><label for="' + id + '">' + l + '</label><select id="' + id + '"' + (chg ? ' data-chg="' + chg + '"' : '') + '>' + opts.map(o => { const val = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(val) + '"' + (val === v ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div>';
    let b = '<div class="hint">' + esc(A.PAT(m.pid).name) + '</div><div class="row2">' + sel('lbKind', 'Tipo', kinds, f.kind, 'lbKind') + '<div class="field"><label for="lbWork">Trabajo</label><input id="lbWork" list="lbWorks" value="' + esc(f.work) + '"><datalist id="lbWorks">' + works.map(w => '<option>' + esc(w) + '</option>').join('') + '</datalist></div></div>';
    b += '<div class="row3"><div class="field"><label for="lbTeeth">Piezas</label><input id="lbTeeth" value="' + esc(f.teeth) + '" placeholder="Ej.: 36 o 14 a 16"></div><div class="field"><label for="lbMat">Material</label><input id="lbMat" value="' + esc(f.material) + '" placeholder="Ej.: zirconio monolítico"></div><div class="field"><label for="lbShade">Color (guía VITA)</label><input id="lbShade" list="lbShades" value="' + esc(f.shade) + '"><datalist id="lbShades">' + SHADES.map(s => '<option>' + s + '</option>').join('') + '</datalist></div></div>';
    b += '<div class="row2">' + sel('lbStage', 'Etapa', STAGES, f.stage) + sel('lbSt', 'Estado', LST, f.status) + '</div>';
    b += '<div class="row2"><div class="field"><label for="lbLab">Laboratorio</label><input id="lbLab" list="lbLabs" value="' + esc(f.lab) + '" placeholder="Nombre del laboratorio"><datalist id="lbLabs">' + A.labDir().map(x => '<option>' + esc(x.name) + '</option>').join('') + '</datalist></div><div class="field"><label for="lbCost">Costo del laboratorio</label><input id="lbCost" inputmode="numeric" value="' + esc(f.cost || '') + '"></div></div>';
    b += '<div class="row3"><div class="field"><label for="lbSent">Enviado</label><input type="date" id="lbSent" value="' + esc(f.sent || '') + '"></div><div class="field"><label for="lbDue">Vuelve (prometido)</label><input type="date" id="lbDue" value="' + esc(f.due || '') + '"></div><div class="field"><label for="lbRecv">Recibido</label><input type="date" id="lbRecv" value="' + esc(f.recv || '') + '"></div></div>';
    b += '<label class="chk"><input type="checkbox" id="lbPaid"' + (f.paid ? ' checked' : '') + '> Ya le pagué al laboratorio</label>';
    b += '<div class="field"><label for="lbNotes">Indicaciones para el laboratorio</label><textarea id="lbNotes" placeholder="Ej.: hombro cerámico vestibular, contacto firme con 35">' + esc(f.notes || '') + '</textarea></div><div id="lbMsg" class="hint bad"></div>';
    return A.modalShell(f.id ? 'Trabajo de laboratorio' : 'Nuevo trabajo de laboratorio', b, (f.id ? '<button class="btn danger" data-act="labDel">Quitar</button>' : '<button class="btn" data-act="closeModal">Cancelar</button>') + '<button class="btn primary" data-act="labSave">Guardar</button>', true);
  };
  function readLab() { const f = S.modal.f; f.kind = $('#lbKind').value; f.work = $('#lbWork').value.trim(); f.teeth = $('#lbTeeth').value.trim(); f.material = $('#lbMat').value.trim(); f.shade = $('#lbShade').value.trim(); f.stage = $('#lbStage').value; f.status = $('#lbSt').value; f.lab = $('#lbLab').value.trim(); f.cost = num($('#lbCost').value); f.sent = $('#lbSent').value; f.due = $('#lbDue').value; f.recv = $('#lbRecv').value; f.paid = $('#lbPaid').checked; f.notes = $('#lbNotes').value.trim(); return f; }
  A.chg.lbKind = () => { readLab(); const f = S.modal.f; f.work = (WORKS[f.kind] || [''])[0]; A.renderModal(); };
  A.acts.labSave = () => {
    const f = readLab(), m = S.modal; if (!f.work) { $('#lbMsg').textContent = 'Escribí qué trabajo es.'; return; }
    const pd = A.pd(m.pid);
    if (f.lab && !A.labDir().some(x => N(x.name) === N(f.lab))) A.labDir().push({ id: A.uid(), name: f.lab, phone: '', contact: '', notes: '' });
    if (f.id) { const l = pd.labs.filter(x => x.id === f.id)[0]; if (l.status !== f.status) (l.hist = l.hist || []).push({ d: A.today(), st: f.status }); Object.assign(l, f); }
    else { f.id = A.uid(); f.hist = [{ d: A.today(), st: f.status }]; pd.labs.push(f); pd.notes.unshift({ id: A.uid(), date: A.today(), pro: A.PAT(m.pid).pro, text: 'Laboratorio: ' + f.work + (f.teeth ? ' (' + f.teeth + ')' : '') + (f.lab ? ' enviado a ' + f.lab : '') + '.', auto: true }); }
    A.touchPd(m.pid); A.save(); S.modal = null; A.renderModal(); A.refresh(); A.toast('Trabajo de laboratorio guardado.');
  };
  A.acts.labDel = () => { const m = S.modal, pd = A.pd(m.pid); pd.labs = pd.labs.filter(x => x.id !== m.f.id); A.touchPd(m.pid); S.modal = null; A.renderModal(); A.refresh(); };
  A.acts.labSt = el => {
    const pid = el.getAttribute('data-pid'), l = A.pd(pid).labs.filter(x => x.id === el.getAttribute('data-id'))[0], st = el.getAttribute('data-st'); if (!l) return;
    l.status = st; (l.hist = l.hist || []).push({ d: A.today(), st }); if (st === 'prueba' || st === 'listo') l.recv = A.today(); if (st === 'ajuste') { l.sent = A.today(); l.due = A.add(A.today(), 5); }
    A.touchPd(pid); A.refresh(); if (S.modal && S.modal.type === 'labAll') A.renderModal(); A.toast(l.work + ': ' + LSTL[st] + '.');
  };
  A.acts.labWa = el => {
    const pid = el.getAttribute('data-pid'), l = A.pd(pid).labs.filter(x => x.id === el.getAttribute('data-id'))[0], p = A.PAT(pid), d = A.labDir().filter(x => N(x.name) === N(l.lab))[0];
    const t = 'Hola' + (l.lab ? ' ' + l.lab : '') + ', te envío un trabajo de ' + A.CLINIC + ':\n• Paciente: ' + p.name + '\n• Trabajo: ' + l.work + (l.teeth ? '\n• Piezas: ' + l.teeth : '') + (l.material ? '\n• Material: ' + l.material : '') + (l.shade ? '\n• Color: ' + l.shade : '') + '\n• Etapa: ' + l.stage + (l.due ? '\n• Lo necesito para el ' + A.fmtDMY(l.due) : '') + (l.notes ? '\n• Indicaciones: ' + l.notes : '') + '\nGracias.';
    const ph = d && d.phone ? String(d.phone).replace(/\D/g, '') : '';
    window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(t), '_blank', 'noopener');
  };
  A.acts.labGoPat = el => { S.modal = null; A.renderModal(); A.openFicha(el.getAttribute('data-pid'), 'lab'); };
  /* todos los trabajos en curso, de todos los pacientes */
  A.acts.labAllOpen = () => { A.hideDrawer(); S.modal = { type: 'labAll' }; A.renderModal(); };
  MF.labAll = () => {
    const all = []; Object.keys(A.S.pd).forEach(pid => { const pd = A.S.pd[pid]; if (pd && pd.labs && A.PAT(pid)) pd.labs.forEach(l => { if (open(l) || l.status === 'prueba' || l.status === 'listo') all.push({ l, pid }); }); });
    all.sort((a, b) => (late(b.l) - late(a.l)) || ((a.l.due || '9') < (b.l.due || '9') ? -1 : 1));
    const nl = all.filter(x => late(x.l)).length;
    return A.modalShell('Laboratorio · trabajos en curso', (nl ? '<div class="alert-strip"><span class="label">Atrasados</span><span>' + nl + ' trabajo' + (nl > 1 ? 's pasaron' : ' pasó') + ' la fecha prometida</span></div>' : '') + (all.length ? '<div class="lab-list">' + all.map(x => labCard(x.l, x.pid, true)).join('') + '</div>' : '<div class="empty">No hay trabajos en curso.</div>'),
      '<button class="btn" data-act="labDirOpen">Mis laboratorios</button><button class="btn primary" data-act="closeModal">Listo</button>', true);
  };
  A.acts.labDirOpen = () => { S.modal = { type: 'labDir', back: S.modal }; A.renderModal(); };
  MF.labDir = () => A.modalShell('Mis laboratorios', '<p class="hint">Teléfono con código de área (para mandar el pedido por WhatsApp).</p>' + A.labDir().map(x => '<div class="row3"><div class="field"><label>Laboratorio</label><input data-chg="labDirF" data-id="' + x.id + '" data-f="name" value="' + esc(x.name) + '"></div><div class="field"><label>Teléfono</label><input inputmode="tel" data-chg="labDirF" data-id="' + x.id + '" data-f="phone" value="' + esc(x.phone || '') + '" placeholder="Ej.: 2994123456"></div><div class="field"><label>Contacto / notas</label><input data-chg="labDirF" data-id="' + x.id + '" data-f="contact" value="' + esc(x.contact || '') + '"></div></div>').join('') +
    '<button class="btn small" data-act="labDirAdd">+ Agregar laboratorio</button>', '<button class="btn primary" data-act="osBack">Listo</button>');
  A.chg.labDirF = el => { const x = A.labDir().filter(l => l.id === el.getAttribute('data-id'))[0]; if (x) { x[el.getAttribute('data-f')] = el.value.trim(); A.save(); } };
  A.acts.labDirAdd = () => { A.labDir().push({ id: A.uid(), name: 'Laboratorio nuevo', phone: '', contact: '' }); A.save(); A.renderModal(); };

  /* menú: obras sociales y laboratorio */
  const nav = $('#gearMenu .dr-nav');
  if (nav) nav.insertAdjacentHTML('beforeend',
    '<button class="dnav" data-act="labAllOpen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3c-2.4 0-4 1.9-4 4.4 0 1.9.7 3.2 1.3 4.8.7 1.8.7 4 1.4 6.2.4 1.2 1.8 1.2 2.2.1.6-1.8.8-3.8 1.8-3.8h2.1c.9 0 1.1 2 1.8 3.8.4 1.1 1.8 1.1 2.2-.1.7-2.2.7-4.4 1.4-6.2.6-1.6 1.3-2.9 1.3-4.8C21 4.9 19.4 3 17 3c-1.5 0-2.4.8-3.8.8S8.5 3 7 3z"/></svg><span class="t">Laboratorio</span></button>');
  /* obras sociales y aranceles van en Ajustes, al lado de «Prácticas y aranceles» */
  const catBtn = $('#gearMenu .dnav[data-act="catalogOpen"]');
  if (catBtn) catBtn.insertAdjacentHTML('afterend', '<button class="dnav only-admin" data-act="osOpen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M12 8v8M8 12h8"/></svg><span class="t">Obras sociales y aranceles</span></button>');


  /* =====================================================================
     TIPO DE CUENTA: se cambia con un toque y se conservan los datos
     ===================================================================== */
  A.acts.changeAccount = () => { A.hideDrawer(); if (!S.setup) { A.openSetup(); return; } S.modal = { type: 'acctType', t: S.setup.type }; A.renderModal(); };
  MF.acctType = m => {
    const st = S.setup || {}, card = (t, ttl, sub) => '<button class="setup-card' + (m.t === t ? ' on' : '') + '" data-act="acctTypeSel" data-t="' + t + '" aria-pressed="' + (m.t === t) + '"><b>' + ttl + '</b><span>' + sub + '</span></button>';
    return A.modalShell('Tipo de cuenta', '<div class="setup-grid">' + card('solo', 'Odontólogo', 'Consultorio individual') + card('centro', 'Centro odontológico', 'Dos o más profesionales') + '</div>' +
      '<div class="acct-box" style="margin-top:12px"><b>Tus datos se conservan</b><span>' + esc(st.proName || A.PROS[0].name) + ' · ' + esc(st.clinic || A.CLINIC) + '</span><span class="hint" style="margin:0">Pacientes, turnos y profesionales quedan igual. Solo cambia cómo se organiza la pantalla.</span></div>',
      '<button class="btn" data-act="acctTypeEdit">Editar nombres</button><button class="btn primary" data-act="acctTypeGo">Listo</button>');
  };
  A.acts.acctTypeSel = el => { S.modal.t = el.getAttribute('data-t'); A.renderModal(); };
  A.acts.acctTypeEdit = () => { S.modal = null; A.openSetup(); };
  A.acts.acctTypeGo = () => {
    const t = S.modal.t, prev = S.setup.type; S.modal = null; A.renderModal(); if (t === prev) return;
    S.setup = Object.assign({}, S.setup, { type: t }); if (t === 'solo') S.uimode = 'admin'; S.proSel = null;
    A.applySetup(); A.saveNow(); S.tab = 'inicio'; A.refresh(); A.toast(t === 'solo' ? 'Ahora: odontólogo, consultorio individual. Tus datos siguen igual.' : 'Ahora: centro odontológico. Tus datos siguen igual.');
  };

  /* =====================================================================
     VOZ CONVERSADA: después de una orden, el asistente sigue escuchando unos segundos
     sin repetir el nombre («Navi, abrí la ficha de Pérez» → «ahora el odontograma» → «caries oclusal del 45»)
     ===================================================================== */
  A.FOLLOW_MS = 15000;
  const execPrev = A.cmd.exec;
  A.cmd.exec = (text, opts) => {
    let t = text;
    /* en el odontograma, «agregá / poné / marcá …» es lo mismo que decir el hallazgo */
    if (S.tab === 'ficha' && S.fichaTab === 'odon') { const st = String(t).replace(/^\s*(?:ahora\s+)?(?:agrega(?:r|me|le)?|agregá|agregale|pone(?:r|me|le)?|poné|ponele|marca(?:r|me|le)?|marcá|marcale|anota(?:r|me|le)?|anotá|carga(?:r|me|le)?|cargá|registra(?:r)?|registrá)\s+(?:un |una |el |la )?/i, ''); if (st !== t && A.P.parse(st).actions.length) t = st; }
    let pr = null; try { pr = C.parse(t, { today: A.today(), pros: A.PROS }); } catch (e) { pr = null; }
    if (pr && pr.intent === 'labNew') return labCmd(pr);
    if (pr && pr.intent === 'ficha' && pr.sub === 'lab' && !pr.name && !A.curPid()) { A.acts.labAllOpen(); return { ok: true, msg: 'Trabajos de laboratorio en curso.' }; }
    if (pr && pr.intent === 'nav' && pr.tab === 'os') { A.acts.osOpen(); return { ok: true, msg: 'Obras sociales y aranceles.' }; }
    return execPrev(t, opts);
  };
  function labCmd(pr) {
    const pid = A.curPid(); if (!pid) return { ok: false, msg: 'Abrí primero la ficha del paciente: «abrí la ficha de Pérez».' };
    const tx = N(pr.text || ''), pre = {};
    const all = []; Object.keys(WORKS).forEach(k => WORKS[k].forEach(w => all.push([k, w])));
    const hit = all.filter(x => tx.indexOf(N(x[1]).split(' (')[0]) >= 0)[0] || [[/zirconio|circonio/, 'Corona de zirconio'], [/disilicato|emax|e max/, 'Corona de disilicato de litio'], [/metal ?ceramica|porcelana/, 'Corona metal-cerámica'], [/provisori/, 'Corona provisoria'], [/carilla/, 'Carilla'], [/perno/, 'Perno muñón colado'], [/puente/, 'Puente fijo'], [/incrustaci|inlay|onlay/, 'Incrustación (inlay / onlay)'], [/completa|dentadura/, 'Prótesis completa'], [/cromo|esqueletic/, 'Prótesis parcial cromo-cobalto'], [/flexible/, 'Prótesis flexible'], [/parcial/, 'Prótesis parcial acrílica'], [/placa/, 'Placa miorrelajante'], [/corona/, 'Corona de zirconio']].filter(x => x[0].test(tx)).map(x => [all.filter(a => a[1] === x[1])[0][0], x[1]])[0];
    if (hit) { pre.kind = hit[0]; pre.work = hit[1]; }
    const teeth = tx.match(/\b([1-4][1-8]|[5-8][1-5])\b/g); if (teeth) pre.teeth = teeth.join(', ');
    const sh = tx.match(/\bcolor\s+([abcd]\s?\d(?:[.,]5)?)\b/); if (sh) pre.shade = sh[1].replace(/\s/g, '').toUpperCase();
    const lb = tx.match(/\b(?:al |el )?laboratorio\s+(?!de\b)([a-z0-9 ]{2,30})$/); if (lb) pre.lab = lb[1].replace(/\b\w/g, c => c.toUpperCase());
    A.acts.labNew({ getAttribute: () => pid }, null, pre);
    return { ok: true, msg: 'Nuevo trabajo de laboratorio' + (pre.work ? ': ' + pre.work : '') + (pre.teeth ? ' en ' + pre.teeth : '') + '. Revisá los datos y decí «guardar».' };
  }
  /* frases de laboratorio y de obras sociales para el intérprete */
  const parsePrev = C.parse;
  C.parse = (text, ctx) => {
    const c = C.clean(text); let m;
    if ((m = /^(?:nuevo|nueva|agrega(?:r|me)?|carga(?:r|me)?|anota(?:r|me)?|registra(?:r)?)\s+(?:un |una )?(?:trabajo|pedido|orden)\s+(?:de |al |para el )?laboratorio\s*(.*)$/.exec(c)) ||
      (m = /^(?:mande|envie|mandamos|enviamos|se mando|se envio|manda(?:r)?|envia(?:r)?)\s+(?:al laboratorio\s+)?(.+?)$/.exec(c)) && /laboratorio/.test(c)) return { intent: 'labNew', text: m[1] || '' };
    if (/^(?:abri(?:r|me)?|mostra(?:r|me)?|ver|ir a|anda a)?\s*(?:las |los )?(?:obras sociales|prepagas|aranceles(?: de (?:las )?obras sociales)?|coberturas)$/.test(c)) return { intent: 'nav', tab: 'os' };
    return parsePrev(text, ctx);
  };

  /* estilos de esta parte */
  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '.os-head{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:8px}.os-list{display:flex;flex-direction:column;gap:6px}' +
    '.os-row{display:flex;justify-content:space-between;align-items:center;gap:10px;text-align:left;border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:10px 12px;color:var(--ink);cursor:pointer}.os-row.os-off{opacity:.6}' +
    '.os-n{display:flex;flex-direction:column;min-width:0}.os-n small,.os-c small{color:var(--ink-2)}.os-c{text-align:right;font-size:13px;flex:0 0 auto}' +
    '.os-tbl{display:flex;flex-direction:column;gap:2px;margin-top:8px}.os-th,.os-tr{display:grid;grid-template-columns:minmax(0,1fr) 44px 92px 92px;gap:6px;align-items:center}.os-th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-2);padding:0 4px}' +
    '.os-tr{padding:5px 4px;border-radius:8px;font-size:13.5px}.os-tr.on{background:var(--accent-soft)}.os-tr input[inputmode]{width:100%;min-width:0;padding:6px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit}.os-tr input[type=checkbox]{width:20px;height:20px;justify-self:center}' +
    '@media (max-width:520px){.os-th,.os-tr{grid-template-columns:minmax(0,1fr) 34px 74px 74px}.os-tr{font-size:12.5px}}' +
    '.lab-list{display:flex;flex-direction:column;gap:10px}.lab-card{border:1px solid var(--line);border-left:5px solid var(--accent);border-radius:12px;padding:10px 12px;background:var(--surface);display:flex;flex-direction:column;gap:6px}' +
    '.lab-card.late{border-left-color:var(--st-no);background:color-mix(in srgb,var(--st-no) 6%,var(--surface))}.lab-card.st-instalado{border-left-color:var(--st-done);opacity:.8}.lab-card.st-cancelado{opacity:.55}' +
    '.lab-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap}.lab-meta{font-size:13px;color:var(--ink-2)}.lab-notes{font-size:13.5px;border-left:3px solid var(--line);padding-left:8px}.lab-pat{font-weight:700;font-size:14px}' +
    '</style>');
})();
