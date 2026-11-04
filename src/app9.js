/* ===== v6.3: pestañas de la ficha que no saltan, importar pacientes desde Bilog u otro programa (Excel o CSV) ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns;
  A.VERSION = '6.3';
  const N = s => A.norm(s);

  /* =====================================================================
     PESTAÑAS DE LA FICHA: quedan donde estaban y la elegida siempre a la vista
     ===================================================================== */
  let tabsX = 0;
  document.addEventListener('scroll', e => { if (e.target && e.target.classList && e.target.classList.contains('ftabs')) tabsX = e.target.scrollLeft; }, true);
  const origFicha = A.render.ficha;
  A.render.ficha = () => {
    const old = $('#view-ficha .ftabs'); if (old) tabsX = old.scrollLeft;
    origFicha();
    const bar = $('#view-ficha .ftabs'); if (!bar) return;
    bar.scrollLeft = tabsX;
    const sel = bar.querySelector('[aria-selected="true"]');
    if (sel) {
      const l = sel.offsetLeft - bar.offsetLeft, r = l + sel.offsetWidth;
      if (l < bar.scrollLeft) bar.scrollLeft = Math.max(0, l - 12);
      else if (r > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = r - bar.clientWidth + 12;
    }
    tabsX = bar.scrollLeft;
  };

  /* =====================================================================
     IMPORTAR PACIENTES (Bilog, Dentalink, Excel propio, etc.)
     Se lee el archivo en el propio equipo; se reconocen solas las columnas más comunes y se pueden corregir.
     ===================================================================== */
  const COLS = [
    ['full', 'Apellido y nombre', /^(?:apellido y nombres?|apellidos? y nombres?|nombre y apellido|nombre completo|paciente|apellido, nombre|ayn)$/],
    ['last', 'Apellido', /^(?:apellidos?)$/], ['first', 'Nombre', /^(?:nombres?|primer nombre)$/],
    ['dni', 'DNI', /^(?:dni|documento|nro\.? (?:de )?doc(?:umento)?|n(?:ro|°|º)?\.? documento|doc|numero de documento|n doc)$/],
    ['phone', 'Teléfono', /^(?:tel(?:efono)?s?|celular|cel|movil|whatsapp|telefono celular|tel\.? celular|telefono movil)$/], ['phone2', 'Otro teléfono', /^(?:tel(?:efono)? (?:fijo|particular|2)|telefono alternativo)$/],
    ['email', 'Email', /^(?:e-?mail|correo(?: electronico)?|mail)$/], ['cov', 'Obra social', /^(?:obra social|os|cobertura|financiador|prepaga|plan|obra social \/ plan)$/],
    ['afil', 'N.º de afiliado', /^(?:n(?:ro|°|º)?\.? (?:de )?afiliado|afiliado|numero de afiliado|credencial|nro\.? credencial)$/],
    ['birth', 'Fecha de nacimiento', /^(?:fecha de nacimiento|f(?:echa|ec)?\.? (?:de )?nac(?:imiento)?\.?|nacimiento|nacido)$/], ['age', 'Edad', /^(?:edad)$/],
    ['addr', 'Domicilio', /^(?:domicilio|direccion|calle)$/], ['city', 'Localidad', /^(?:localidad|ciudad)$/],
    ['notes', 'Observaciones / antecedentes', /^(?:observaciones?|notas?|antecedentes|comentarios?|alertas?)$/]
  ];
  const LBL = {}; COLS.forEach(c => { LBL[c[0]] = c[1]; });
  function guess(h) { const n = N(h).replace(/[_:]+/g, ' ').replace(/\s+/g, ' ').trim(); const c = COLS.filter(x => x[2].test(n))[0]; return c ? c[0] : ''; }
  function parseCSV(text) {
    const sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : (text.indexOf('\t') >= 0 && text.split('\n')[0].indexOf('\t') >= 0 ? '\t' : ',');
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === sep) { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(c => String(c).trim()));
  }
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = () => res(window.XLSX); s.onerror = () => rej(new Error('Para leer archivos de Excel hace falta internet. También podés guardarlo como CSV desde Excel y subir ese.')); document.head.appendChild(s); });
  }
  A.acts.importOpen = () => { A.hideDrawer(); S.modal = { type: 'importPats', step: 1 }; A.renderModal(); };
  MF.importPats = m => {
    if (m.step === 1) return A.modalShell('Importar pacientes',
      '<p>Traé tus pacientes desde <b>Bilog</b> u otro programa sin cargarlos de nuevo.</p>' +
      '<ol class="imp-steps"><li>En el programa anterior, exportá el <b>listado de pacientes a Excel</b> (suele estar en Reportes o Pacientes › Exportar). Si no encontrás la opción, pediles a ellos la exportación de tus datos: son tuyos.</li><li>Elegí acá ese archivo (Excel .xlsx/.xls o .csv).</li><li>Revisá que cada columna vaya al lugar correcto y confirmá.</li></ol>' +
      '<label class="btn primary imp-file">Elegir archivo<input type="file" id="impFile" accept=".csv,.txt,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-chg="impFile" hidden></label>' +
      '<div id="impMsg" class="hint bad"></div><p class="hint">El archivo se lee en este equipo. Los pacientes repetidos (mismo DNI) no se duplican: se completan los datos que falten.</p>' +
      '<p class="hint">¿Preferís armarlo a mano? <button class="link" data-act="impTemplate">Descargá la planilla modelo</button>.</p>',
      '<button class="btn" data-act="closeModal">Cancelar</button>', true);
    const rows = m.rows, map = m.map, prev = rows.slice(1, 6);
    let b = '<p class="hint">' + (rows.length - 1) + ' filas en «' + esc(m.name) + '». Indicá qué es cada columna (se reconocieron solas las que pudimos).</p>';
    b += '<div class="imp-map">' + rows[0].map((h, i) => '<div class="imp-col"><b>' + esc(h || 'Columna ' + (i + 1)) + '</b><span class="hint">' + esc(prev.map(r => r[i] || '').filter(Boolean).slice(0, 2).join(' · ') || '(vacía)') + '</span><select data-chg="impMap" data-i="' + i + '"><option value="">No importar</option>' + COLS.map(c => '<option value="' + c[0] + '"' + (map[i] === c[0] ? ' selected' : '') + '>' + esc(c[1]) + '</option>').join('') + '</select></div>').join('') + '</div>';
    const ok = map.indexOf('full') >= 0 || map.indexOf('last') >= 0 || map.indexOf('first') >= 0;
    b += '<div id="impMsg" class="hint ' + (ok ? '' : 'bad') + '">' + (ok ? 'Vista previa: ' + esc(prev.slice(0, 3).map(r => toPat(r, map)).filter(Boolean).map(p => p.last + ', ' + p.first + (p.dni ? ' (' + p.dni + ')' : '')).join(' · ')) : 'Elegí al menos la columna del nombre (o apellido y nombre).') + '</div>';
    return A.modalShell('Importar pacientes', b, '<button class="btn" data-act="importOpen">Elegir otro archivo</button><button class="btn primary" data-act="impGo"' + (ok ? '' : ' disabled') + '>Importar ' + (rows.length - 1) + ' pacientes</button>', true);
  };
  A.chg.impFile = async el => {
    const f = el.files && el.files[0]; if (!f) return; const msg = $('#impMsg');
    try {
      let rows;
      if (/\.(xlsx|xls)$/i.test(f.name)) { if (msg) msg.textContent = 'Leyendo el Excel…'; const X = await loadXLSX(), wb = X.read(await f.arrayBuffer(), { type: 'array', cellDates: true }); rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }); rows = rows.filter(r => r.some(c => String(c).trim())); }
      else { const buf = await f.arrayBuffer(); let t = new TextDecoder('utf-8').decode(buf); if (/\uFFFD/.test(t)) t = new TextDecoder('windows-1252').decode(buf); rows = parseCSV(t.replace(/^﻿/, '')); }
      if (!rows || rows.length < 2) throw new Error('El archivo no tiene filas de pacientes.');
      let hi = 0; for (let i = 0; i < Math.min(8, rows.length); i++) if (rows[i].filter(c => guess(c)).length >= 2) { hi = i; break; }
      rows = rows.slice(hi).map(r => r.map(c => String(c == null ? '' : c).trim()));
      const map = rows[0].map(guess); map.forEach((k, i) => { if (k && map.indexOf(k) !== i) map[i] = ''; });
      S.modal = { type: 'importPats', step: 2, rows, map, name: f.name }; A.renderModal();
    } catch (e) { if (msg) msg.textContent = e.message || 'No se pudo leer el archivo.'; }
  };
  A.chg.impMap = el => { const m = S.modal, i = +el.getAttribute('data-i'); m.map = m.map.map((k, j) => (j !== i && k === el.value && el.value ? '' : k)); m.map[i] = el.value; A.renderModal(); };
  const cap = s => String(s || '').toLowerCase().replace(/(^|[\s'-])([a-zñáéíóúü])/g, (x, a, b) => a + b.toUpperCase()).trim();
  function ageFrom(v) {
    const s = String(v || '').trim(); if (!s) return null; let d = null, m;
    if ((m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(s))) { let y = +m[3]; if (y < 100) y += y > 30 ? 1900 : 2000; d = new Date(y, +m[2] - 1, +m[1]); }
    else if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (!d || isNaN(d)) return null; const t = A.parse(A.today()); let a = t.getFullYear() - d.getFullYear(); if (t < new Date(t.getFullYear(), d.getMonth(), d.getDate())) a--; return a >= 0 && a < 120 ? { age: a, birth: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') } : null;
  }
  function toPat(r, map) {
    const g = k => { const i = map.indexOf(k); return i >= 0 ? String(r[i] || '').trim() : ''; };
    let first = g('first'), last = g('last');
    if (!first && !last && g('full')) { const f = g('full'); if (f.indexOf(',') >= 0) { last = f.split(',')[0]; first = f.split(',').slice(1).join(' '); } else { const w = f.split(/\s+/); last = w[0]; first = w.slice(1).join(' '); } }
    else if (!first && last.indexOf(',') >= 0) { first = last.split(',').slice(1).join(' '); last = last.split(',')[0]; }
    if (!first && !last) return null;
    const bd = ageFrom(g('birth')), ag = parseInt(g('age'), 10);
    const cov = g('cov'), os = cov && A.osList ? A.osList().filter(o => N(o.sigla) === N(cov) || N(cov).indexOf(N(o.sigla)) === 0 || N(o.name) === N(cov))[0] : null;
    return { first: cap(first) || '-', last: cap(last) || '-', dni: g('dni').replace(/\D/g, ''), phone: g('phone') || g('phone2'), email: g('email').toLowerCase(), cov: os ? os.sigla + (N(cov) !== N(os.sigla) ? cov.slice(os.sigla.length) : '') : (cov || 'Particular'), afil: g('afil'),
      age: bd ? bd.age : (ag > 0 ? ag : null), birth: bd ? bd.birth : '', addr: [g('addr'), g('city')].filter(Boolean).join(', '), notes: g('notes') };
  }
  A.acts.impGo = () => {
    const m = S.modal, list = m.rows.slice(1).map(r => toPat(r, m.map)).filter(Boolean);
    let nw = 0, upd = 0, skip = 0;
    list.forEach(d => {
      const ex = d.dni ? A.PATS.filter(p => String(p.dni) === d.dni)[0] : A.PATS.filter(p => N(p.first) === N(d.first) && N(p.last) === N(d.last))[0];
      if (ex) {
        const ch = {}; ['phone', 'email', 'afil', 'addr', 'birth'].forEach(k => { if (d[k] && !ex[k]) ch[k] = d[k]; }); if (d.cov && (!ex.cov || ex.cov === 'Particular') && d.cov !== 'Particular') ch.cov = d.cov;
        if (Object.keys(ch).length) { A.setProfile(ex.id, ch); upd++; } else skip++;
        return;
      }
      const p = A.addPatient({ first: d.first, last: d.last, dni: d.dni, phone: d.phone, email: d.email, cov: d.cov, age: d.age || 0 });
      const extra = {}; if (d.afil) extra.afil = d.afil; if (d.addr) extra.addr = d.addr; if (d.birth) extra.birth = d.birth; if (!d.age) extra.age = 0;
      if (Object.keys(extra).length) A.setProfile(p.id, extra);
      if (d.notes) { const pd = A.pd(p.id); pd.notes.unshift({ id: A.uid(), date: A.today(), pro: p.pro, text: 'Importado del sistema anterior: ' + d.notes, auto: true }); A.touchPd(p.id); }
      nw++;
    });
    A.saveNow(); S.modal = { type: 'importDone', nw, upd, skip }; A.renderModal(); A.refresh();
  };
  MF.importDone = m => A.modalShell('Importación lista', '<div class="stats"><div class="stat"><b>' + m.nw + '</b>pacientes nuevos</div><div class="stat"><b>' + m.upd + '</b>completados</div><div class="stat"><b>' + m.skip + '</b>ya estaban</div></div>' +
    '<p class="hint">Revisá algunos pacientes al azar. Lo que no venía en el archivo (odontogramas, imágenes, turnos) se carga desde la ficha de cada paciente; si el programa anterior te da las historias en PDF, guardalas en «Imágenes» o «Documentos» de cada ficha.</p>',
    '<button class="btn primary" data-act="impSeePats">Ver pacientes</button>');
  A.acts.impSeePats = () => { S.modal = null; A.renderModal(); S.tab = 'pacientes'; A.refresh(); };
  A.acts.impTemplate = () => {
    const h = ['Apellido', 'Nombre', 'DNI', 'Teléfono', 'Email', 'Obra social', 'N.º de afiliado', 'Fecha de nacimiento', 'Domicilio', 'Localidad', 'Observaciones'];
    const ex = ['Pérez', 'Juan Carlos', '30123456', '299 4123456', 'juan@ejemplo.com', 'OSDE 210', '61234567801', '15/03/1983', 'San Martín 123', 'Neuquén', 'Alérgico a la penicilina'];
    const q = v => '"' + String(v).replace(/"/g, '""') + '"';
    A.saveFile('Planilla de pacientes OdontoVoz.csv', new Blob(['﻿' + [h.map(q).join(';'), ex.map(q).join(';')].join('\r\n')], { type: 'text/csv' }));
  };
  /* en Ajustes, debajo de obras sociales */
  const anchor = $('#gearMenu .dnav[data-act="osOpen"]') || $('#gearMenu .dnav[data-act="catalogOpen"]');
  if (anchor) anchor.insertAdjacentHTML('afterend', '<button class="dnav" data-act="importOpen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 15v5h16v-5"/></svg><span class="t">Importar pacientes<small>Desde Bilog u otro programa</small></span></button>');
  /* el comando de voz «importar pacientes» */
  const parsePrev = window.OVCmd.parse;
  window.OVCmd.parse = (text, ctx) => { const c = window.OVCmd.clean(text); if (/^(?:importar|traer|pasar|cargar) (?:los |mis )?pacientes(?: (?:de|desde) .+)?$/.test(c)) return { intent: 'nav', tab: 'import' }; return parsePrev(text, ctx); };
  const execPrev = A.cmd.exec;
  A.cmd.exec = (text, o) => { const pr = window.OVCmd.parse(text, {}); if (pr && pr.intent === 'nav' && pr.tab === 'import') { A.acts.importOpen(); return { ok: true, msg: 'Importar pacientes: elegí el archivo exportado.' }; } return execPrev(text, o); };

  document.head.insertAdjacentHTML('beforeend', '<style>.imp-steps{margin:0 0 6px;padding-left:20px;display:flex;flex-direction:column;gap:6px}.imp-file{align-self:flex-start;cursor:pointer}' +
    '.imp-map{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}.imp-col{display:flex;flex-direction:column;gap:3px;border:1px solid var(--line);border-radius:10px;padding:8px}.imp-col .hint{margin:0;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.imp-col select{padding:6px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink)}' +
    '.link{background:none;border:0;padding:0;color:var(--accent);text-decoration:underline;cursor:pointer;font:inherit}</style>');

  /* =====================================================================
     LABORATORIO: a la izquierda mis laboratorios; a la derecha los trabajos activos y los entregados
     ===================================================================== */
  const ACTIVE = ['porenviar', 'enviado', 'ajuste', 'prueba', 'listo'];
  const pl = (n, a, b) => n + ' ' + (n === 1 ? a : b);
  MF.labAll = m => {
    const labs = A.labDir(), all = [], sel = m.lab || '';
    Object.keys(A.S.pd).forEach(pid => { const pd = A.S.pd[pid]; if (pd && pd.labs && A.PAT(pid)) pd.labs.forEach(l => { if (l.status !== 'cancelado') all.push({ l, pid }); }); });
    const mine = x => !sel || N(x.l.lab) === N(sel);
    const act = all.filter(x => ACTIVE.indexOf(x.l.status) >= 0 && mine(x)).sort((a, b) => (A.labLate(b.l) - A.labLate(a.l)) || ((a.l.due || '9') < (b.l.due || '9') ? -1 : 1));
    const done = all.filter(x => x.l.status === 'instalado' && mine(x)).sort((a, b) => ((b.l.recv || b.l.sent || '') > (a.l.recv || a.l.sent || '') ? 1 : -1));
    const cnt = name => all.filter(x => N(x.l.lab) === N(name) && ACTIVE.indexOf(x.l.status) >= 0).length;
    const nLate = act.filter(x => A.labLate(x.l)).length;
    let left = '<div class="lb-col lb-labs"><div class="lb-h"><b>Mis laboratorios</b><button class="btn small" data-act="labDirAdd">+ Agregar</button></div>' +
      '<button class="lb-lab' + (sel ? '' : ' on') + '" data-act="labFilter" data-name=""><b>Todos</b><span>' + all.filter(x => ACTIVE.indexOf(x.l.status) >= 0).length + ' activos</span></button>' +
      (labs.length ? labs.map(x => '<div class="lb-lab' + (N(sel) === N(x.name) ? ' on' : '') + '" data-act="labFilter" data-name="' + esc(x.name) + '" role="button" tabindex="0"><b>' + esc(x.name) + '</b><span>' + esc([x.mech, x.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto') + '</span><span class="lb-n">' + cnt(x.name) + ' activos · ' + ((x.items || []).length) + ' precios</span><button class="btn small ghost" data-act="labOne" data-id="' + x.id + '">Editar</button></div>').join('') : '<div class="empty">Todavía no cargaste laboratorios. Tocá «+ Agregar».</div>') + '<button class="lb-lab lb-add" data-act="labDirAdd"><b>+ Agregar laboratorio</b><span>Nombre, mecánico, teléfono y precios</span></button></div>';
    let right = '<div class="lb-col lb-works"><div class="lb-h"><b>Activos y pendientes de entrega' + (sel ? ' · ' + esc(sel) : '') + '</b><span class="chip' + (nLate ? ' bad' : '') + '">' + act.length + (nLate ? ' · ' + nLate + ' atrasados' : '') + '</span></div>' +
      (act.length ? '<div class="lab-list">' + act.map(x => A.labCard(x.l, x.pid, true)).join('') + '</div>' : '<div class="empty">No hay trabajos activos.</div>') +
      '<div class="lb-h" style="margin-top:14px"><b>Entregados</b><span class="chip ok">' + done.length + '</span></div>' +
      (done.length ? '<div class="lab-list">' + done.slice(0, m.more ? 200 : 8).map(x => A.labCard(x.l, x.pid, true)).join('') + '</div>' + (done.length > 8 && !m.more ? '<button class="btn small ghost" data-act="labMoreDone">Ver los ' + done.length + ' entregados</button>' : '') : '<div class="empty">Todavía no hay trabajos entregados.</div>') + '</div>';
    return A.modalShell('Laboratorio', '<div class="lb-split">' + left + right + '</div>', '<button class="btn primary" data-act="closeModal">Listo</button>', true);
  };
  A.acts.labFilter = (el, ev) => { if (ev && ev.target.closest('[data-act="labOne"]')) return; S.modal.lab = el.getAttribute('data-name'); A.renderModal(); };
  A.acts.labMoreDone = () => { S.modal.more = true; A.renderModal(); };
  document.head.insertAdjacentHTML('beforeend', '<style>.modal:has(.lb-split){max-width:min(1100px,96vw);width:min(1100px,96vw)}.lb-split{display:grid;grid-template-columns:300px minmax(0,1fr);gap:16px;align-items:start}' +
    '.lb-col{display:flex;flex-direction:column;gap:8px;min-width:0}.lb-h{display:flex;align-items:center;justify-content:space-between;gap:8px}.lb-h b{font-size:15px}' +
    '.lb-lab{display:flex;flex-direction:column;gap:2px;text-align:left;border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:10px 12px;color:var(--ink);cursor:pointer;position:relative}.lb-lab span{font-size:12.5px;color:var(--ink-2)}.lb-lab .lb-n{color:var(--accent);font-weight:600}' +
    '.lb-lab.on{border-color:var(--accent);background:var(--accent-soft)}.lb-lab .btn{position:absolute;top:8px;right:8px}.lb-add{border-style:dashed;color:var(--accent)}' +
    '@media (max-width:760px){.lb-split{grid-template-columns:minmax(0,1fr)}.lb-labs{flex-direction:row;overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px}.lb-labs .lb-h{display:none}.lb-labs .lb-lab{flex:0 0 auto;min-width:170px}.lb-labs .empty{min-width:240px}.lb-labs .lb-lab .btn{position:static;align-self:flex-start;margin-top:4px}}</style>');
})();
