/* ===== 1.40: Mudanza gratis desde otro sistema (Bilog, Dentalink…): pacientes, turnos y evoluciones desde el archivo del asistente o un Excel ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns;
  const N = s => A.norm(String(s == null ? '' : s).replace(/([a-z])([A-Z])/g, '$1 $2')).replace(/[_\-.:]+/g, ' ').replace(/\s+/g, ' ').trim();
  const PAGE = 'https://odontovoz.com.ar/mudanza.html';
  const MANY = 5000;   // hoy cada equipo guarda todo en el navegador: más de esto conviene traer solo los activos

  /* ---------- leer campos de registros de cualquier sistema ---------- */
  function pickKey(o, re) { const ks = Object.keys(o); for (const k of ks) { const n = N(k); if (re.test(n) && o[k] != null && String(o[k]).trim() !== '') return k; } return ''; }
  const val = (o, re) => { const k = pickKey(o, re); return k ? String(o[k]).trim() : ''; };
  function parseDate(v) {
    const s = String(v || '').trim(); let m;
    if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return m[1] + '-' + m[2] + '-' + m[3];
    if ((m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(s))) { let y = +m[3]; if (y < 100) y += 2000; return y + '-' + String(+m[2]).padStart(2, '0') + '-' + String(+m[1]).padStart(2, '0'); }
    if (/^\d{10,13}$/.test(s)) { const d = new Date(+s * (s.length === 10 ? 1000 : 1)); return isNaN(d) ? '' : A.iso ? A.iso(d) : d.toISOString().slice(0, 10); }
    return '';
  }
  function parseTime(v) {
    const s = String(v || ''); let m;
    if ((m = /T(\d{2}):(\d{2})/.exec(s)) || (m = /(?:^|\s)(\d{1,2})[:.h](\d{2})/.exec(s)) || (m = /^(\d{1,2}):(\d{2})/.exec(s))) return +m[1] * 60 + +m[2];
    return null;
  }
  const RE = {
    date: /^(fecha|date|dia|fecha turno|fecha cita|fecha hora|fecha inicio|start date|datetime|start|inicio|desde|start time)$/,
    time: /^(hora|time|hora inicio|hora desde|hora turno|start|inicio|desde|start time)$/,
    dur: /^(duracion|dur|duration|minutos|tiempo)$/,
    pro: /(profesional|odontologo|doctor|dentista|prestador|medico|agenda|usuario)/,
    why: /^(motivo|tratamiento|prestacion|practica|tipo|tipo turno|concepto|observacion|observaciones|asunto|title|titulo)$/,
    status: /^(estado|status|situacion)$/,
    text: /^(evolucion|evoluciones|observacion|observaciones|descripcion|detalle|texto|nota|notas|comentario|comentarios|anotacion|diagnostico|tratamiento realizado|procedimiento|prestacion|practica|indicaciones)$/,
    dni: /(^|\s)(dni|documento|nro documento|numero documento|n documento|doc|nro doc|num documento)$/,
    pname: /(paciente|patient)(\s|$)|^(nombre|nombres|apellido|apellidos|nombre completo|apellido y nombre|paciente nombre|paciente apellido)$/,
    pidk: /(paciente id|id paciente|patient id|idpaciente|paciente codigo)$/
  };
  function patKey(o) {   // DNI o nombre del paciente dentro de un turno o evolución
    const dni = val(o, RE.dni).replace(/\D/g, '');
    const ks = Object.keys(o).filter(k => RE.pname.test(N(k)) && !/id$/.test(N(k)) && typeof o[k] !== 'object');
    let last = '', first = '', full = '';
    ks.forEach(k => { const n = N(k), v = String(o[k]).trim(); if (/apellido/.test(n)) last = v; else if (/^(paciente )?nombres?$/.test(n) && !/apellido/.test(n)) first = first || v; else full = full || v; });
    const name = (last && first) ? last + ', ' + first : full || [last, first].filter(Boolean).join(' ');
    return { dni, name, rid: val(o, RE.pidk) };
  }
  const nameKey = s => N(String(s || '').replace(',', ' ')).split(' ').filter(Boolean).sort().join(' ');

  /* ---------- archivo del asistente (.json) → filas para el mapeo de siempre + turnos y evoluciones aparte ---------- */
  function fromMudanza(j) {
    const pats = Array.isArray(j.patients) ? j.patients : [];
    const keys = []; pats.forEach(p => Object.keys(p).forEach(k => { if (keys.indexOf(k) < 0 && typeof p[k] !== 'object') keys.push(k); }));
    const pref = k => { const g = A.impGuess(String(k).replace(/([a-z])([A-Z])/g, '$1 $2')); return g ? 0 : 1; };
    keys.sort((a, b) => pref(a) - pref(b));
    const human = k => String(k).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_]+/g, ' ');
    const rows = [keys.map(human)].concat(pats.map(p => keys.map(k => p[k] == null ? '' : String(p[k]))));
    return { rows, extra: { appts: Array.isArray(j.appts) ? j.appts : [], notes: Array.isArray(j.notes) ? j.notes : [], source: j.source || '', ids: pats.map(p => val(p, /^(id|id paciente|codigo|nro hc|historia clinica)$/)) } };
  }

  const prevChg = A.chg.impFile;
  A.chg.impFile = async el => {
    const f = el.files && el.files[0]; if (!f) return;
    if (!/\.json$/i.test(f.name)) return prevChg(el);
    const msg = $('#impMsg');
    try {
      const j = JSON.parse(await f.text());
      if (!j || j.app !== 'odontovoz-mudanza') throw new Error('Ese archivo no es de la mudanza de OdontoVoz.');
      const { rows, extra } = fromMudanza(j);
      if (rows.length < 2 && !extra.appts.length && !extra.notes.length) throw new Error('El archivo no tiene pacientes, turnos ni evoluciones.');
      const map = rows[0].map(h => A.impGuess(h)); map.forEach((k, i) => { if (k && map.indexOf(k) !== i) map[i] = ''; });
      S.modal = { type: 'importPats', step: 2, rows, map, name: f.name, extra, past: false, onlyActive: rows.length - 1 > MANY };
      A.renderModal();
    } catch (e) { if (msg) msg.textContent = e.message || 'No se pudo leer el archivo.'; }
  };

  /* actividad: pacientes con turnos o evoluciones en los últimos 2 años */
  function activeSet(m) {
    const since = A.add(A.today(), -730), set = { dni: {}, name: {}, rid: {} };
    (m.extra.appts.concat(m.extra.notes)).forEach(o => { const d = parseDate(val(o, RE.date)); if (!d || d < since) return; const k = patKey(o); if (k.dni) set.dni[k.dni] = 1; if (k.name) set.name[nameKey(k.name)] = 1; if (k.rid) set.rid[k.rid] = 1; });
    return set;
  }

  /* ---------- pantalla: primer paso (mudanza) y extras del segundo ---------- */
  const prevMF = MF.importPats;
  MF.importPats = function (m) {
    if (m.step === 1) {
      return A.modalShell('Mudanza desde otro sistema',
        '<div class="mu-hero"><span class="mu-free">GRATIS</span><b>Traé tus pacientes, tu agenda y tus evoluciones</b><span>Desde Bilog, Dentalink u otro programa, sin cargarlos de nuevo.</span></div>' +
        '<ol class="imp-steps">' +
        '<li><b>Con el asistente de mudanza</b> (en la computadora): guardá el botón «📦 Mudanza a OdontoVoz» en tus favoritos desde <a href="' + PAGE + '" target="_blank" rel="noopener">esta página</a>, usalo adentro de tu sistema anterior y te baja un archivo.</li>' +
        '<li><b>O con un Excel</b> que te dé el sistema anterior (listado de pacientes).</li>' +
        '<li>Elegí acá el archivo. Los pacientes repetidos (mismo DNI) no se duplican.</li></ol>' +
        '<label class="btn primary imp-file">Elegir archivo<input type="file" id="impFile" accept=".json,.csv,.txt,.xlsx,.xls,application/json,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-chg="impFile" hidden></label>' +
        '<div id="impMsg" class="hint bad"></div>' +
        '<div class="mu-alt"><button class="btn small" data-act="muLetter">Pedirle los datos por escrito</button><button class="btn small" data-act="muHelp">Que nos ayuden (gratis)</button><button class="btn small" data-act="impTemplate">Planilla modelo</button></div>' +
        '<p class="hint">El archivo se lee en este equipo. El asistente no nos manda nada a nosotros ni guarda contraseñas.</p>',
        '<button class="btn" data-act="closeModal">Cancelar</button>', true);
    }
    let h = prevMF.apply(this, arguments);
    if (m.extra) {
      const fut = m.extra.appts.filter(o => (parseDate(val(o, RE.date)) || '') >= A.today() && !/cancel|anulad|suspend/.test(N(val(o, RE.status)))).length, n = m.rows.length - 1;
      const box = '<div class="mu-extra"><b>Además del listado:</b><ul>' +
        '<li>' + fut.toLocaleString('es-AR') + ' turnos de hoy en adelante se cargan en la agenda (los cancelados no).</li>' +
        '<li>' + m.extra.notes.length.toLocaleString('es-AR') + ' evoluciones se suman a la historia de cada paciente (marcadas «sistema anterior»).</li></ul>' +
        '<label class="mu-chk"><input type="checkbox" data-chg="muPast"' + (m.past ? ' checked' : '') + '> Traer también los turnos pasados (' + (m.extra.appts.length - fut).toLocaleString('es-AR') + '), como historial</label>' +
        (n > 0 ? '<label class="mu-chk"><input type="checkbox" data-chg="muActive"' + (m.onlyActive ? ' checked' : '') + '> Traer solo los pacientes con turnos o evoluciones de los últimos 2 años' + (n > MANY ? ' <b>(recomendado: son ' + n.toLocaleString('es-AR') + ')</b>' : '') + '</label>' : '') +
        '</div>';
      h = h.replace('<div id="impMsg"', box + '<div id="impMsg"');
      if (!(m.rows.length > 1)) h = h.replace(/<button class="btn primary" data-act="impGo" disabled>/, '<button class="btn primary" data-act="impGo">');
      h = h.replace(/Importar (\d+) pacientes/, (x, k) => 'Traer ' + (+k).toLocaleString('es-AR') + ' pacientes' + (m.extra.appts.length || m.extra.notes.length ? ', turnos y evoluciones' : ''));
    }
    return h;
  };
  A.chg.muPast = el => { S.modal.past = el.checked; };
  A.chg.muActive = el => { S.modal.onlyActive = el.checked; };

  /* ---------- importar: pacientes con el importador de siempre; turnos y evoluciones acá ---------- */
  const prevGo = A.acts.impGo;
  A.acts.impGo = () => {
    const m = S.modal; if (!m) return;
    if (m.extra) m.extra.ridPats = m.rows.slice(1).map((r, i) => ({ rid: m.extra.ids[i], p: A.impToPat(r, m.map) })).filter(x => x.rid && x.p);
    if (m.extra && m.onlyActive && m.rows.length > 1) {
      const act = activeSet(m), idsCol = m.extra.ids;
      m.rows = [m.rows[0]].concat(m.rows.slice(1).filter((r, i) => {
        const p = A.impToPat(r, m.map); if (!p) return false;
        return !!((p.dni && act.dni[p.dni]) || act.name[nameKey(p.last + ' ' + p.first)] || (idsCol[i] && act.rid[idsCol[i]]));
      }));
    }
    const extra = m.extra, past = m.past;
    if (m.rows.length > 1) prevGo(); else { S.modal = { type: 'importDone', nw: 0, upd: 0, skip: 0 }; }
    if (!extra) return;
    const res = importExtra(extra, past);
    const done = S.modal && S.modal.type === 'importDone' ? S.modal : { type: 'importDone', nw: 0, upd: 0, skip: 0 };
    S.modal = Object.assign(done, res); A.saveNow(); A.renderModal(); A.refresh();
  };

  /* 1.45.1: antes el DNI mandaba sobre todo; si dos pacientes compartían DNI (una hija con el de la madre, un DNI de relleno),
     las evoluciones de una iban a la otra. Ahora: primero el número de paciente del sistema anterior; el DNI solo si
     es de un único paciente y el nombre se parece; si no, el nombre completo. */
  const words = s => N(String(s || '').replace(',', ' ')).split(' ').filter(w => w.length > 1);
  const sameName = (a, b) => { const x = words(a), y = words(b); if (!x.length || !y.length) return false; const [s1, l1] = x.length <= y.length ? [x, y] : [y, x]; return s1.filter(w => l1.indexOf(w) >= 0).length >= Math.min(2, s1.length); };
  const fullName = x => x.last + ' ' + x.first;
  /* 1.21.2: nunca se adivina. Devuelve {p} si hay una ficha segura; {amb} si hay más de una posible o los datos se contradicen
     (mismo número del sistema anterior pero otro nombre, mismo DNI pero otra persona, dos pacientes con el mismo nombre…);
     {} si no hay ninguna (ahí sí se crea el paciente). Antes, con dos pacientes del mismo nombre se elegía el primero. */
  const digits = s => String(s || '').replace(/\D/g, '');
  function match(k, byRid) {
    byRid = byRid || {};
    const ok = p => !k.name || sameName(k.name, fullName(p));
    if (k.rid && byRid[k.rid]) return ok(byRid[k.rid]) ? { p: byRid[k.rid] } : { amb: 'el número de paciente del sistema anterior es de otra persona' };
    if (k.dni && k.dni.length >= 6) {
      const l = A.PATS.filter(x => !x.deleted && digits(x.dni) === k.dni);
      if (l.length === 1 && ok(l[0])) return { p: l[0] };
      if (l.length > 1) {
        if (!k.name) return { amb: 'hay ' + l.length + ' pacientes con ese DNI' };
        const m = l.filter(x => nameKey(fullName(x)) === nameKey(k.name)); if (m.length === 1) return { p: m[0] };
        const f = l.filter(x => sameName(k.name, fullName(x))); if (f.length === 1) return { p: f[0] };
        if (f.length > 1) return { amb: 'hay ' + f.length + ' pacientes con ese DNI y nombre parecido' };
      }
    }
    if (k.name) {
      const l = A.PATS.filter(x => !x.deleted && nameKey(fullName(x)) === nameKey(k.name));
      if (l.length === 1) { const d = digits(l[0].dni); return k.dni && d.length >= 6 && d !== k.dni ? {} : { p: l[0] }; } /* mismo nombre pero otro DNI: es otra persona */
      if (l.length > 1) {
        if (k.dni) { const d = l.filter(x => digits(x.dni) === k.dni); if (d.length === 1) return { p: d[0] }; }
        return { amb: 'hay ' + l.length + ' pacientes que se llaman igual' };
      }
    }
    return {};
  }
  const findPat = (k, byRid) => match(k, byRid).p || null;
  A._mudFind = findPat; A._mudPatKey = o => patKey(o); A._mudVal = (o, re) => val(o, re); A._mudRE = RE; A._mudDate = v => parseDate(v); A._mudNameKey = nameKey; A._mudSame = sameName;
  function proFor(name) {
    const pros = A.PROS || []; if (!pros.length) return null;
    const nk = N(name); if (!nk) return pros[0];
    const words = nk.split(' ').filter(w => w.length > 2);
    let best = null, score = 0;
    pros.forEach(p => { const pn = N(p.name); const s = words.filter(w => pn.includes(w)).length; if (s > score) { score = s; best = p; } });
    return best || pros[0];
  }
  function importExtra(extra, past) {
    const today = A.today(), byRid = {};
    /* pacientes del archivo por su id del sistema anterior (para turnos que solo traen el id) */
    (extra.ridPats || []).forEach(x => { const p = findPat({ dni: digits(x.p.dni), name: x.p.last + ', ' + x.p.first }, {}); if (p) byRid[x.rid] = p; });
    let ap = 0, apSkip = 0, nt = 0, created = 0;
    const doubt = [];   /* lo que no se cargó porque no se sabe con certeza de quién es */
    const touched = {};
    const ensure = (k, o, kind) => {
      const r = match(k, byRid);
      if (r.amb) { doubt.push({ kind, k, why: r.amb, date: parseDate(val(o, RE.date)) || '', text: kind === 'nota' ? val(o, RE.text).slice(0, 140) : (val(o, RE.time) || '') }); return null; }
      let p = r.p || null;
      if (!p && k.name) {
        const nm = k.name.indexOf(',') >= 0 ? { last: k.name.split(',')[0], first: k.name.split(',').slice(1).join(' ') } : { last: k.name.split(/\s+/).slice(-1)[0], first: k.name.split(/\s+/).slice(0, -1).join(' ') || '-' };
        const T = s => String(s || '').toLowerCase().replace(/(^|[\s'-])([a-zñáéíóúü])/g, (x, a, b) => a + b.toUpperCase()).trim();
        p = A.addPatient({ first: T(nm.first) || '-', last: T(nm.last) || '-', dni: k.dni || '', cov: 'Particular', age: 0 }); created++;
      }
      if (p && k.rid) byRid[k.rid] = p;
      return p;
    };
    extra.appts.forEach(o => {
      const d = parseDate(val(o, RE.date)), t = parseTime(val(o, RE.time)) ?? parseTime(val(o, RE.date));
      if (!d || t == null) { apSkip++; return; }
      if (d < today && !past) return;
      const st = N(val(o, RE.status)); if (/cancel|anulad|suspend/.test(st) && d >= today) { apSkip++; return; }
      const p = ensure(patKey(o), o, 'turno'); if (!p) { apSkip++; return; }
      const pro = proFor(val(o, RE.pro)); if (!pro) { apSkip++; return; }
      const list = A.day(d);
      if (list.some(a => a.pid === p.id && a.start === t)) { apSkip++; return; }
      const dur = parseInt(val(o, RE.dur), 10) || (A.slotOf ? A.slotOf(pro) : 30);
      const why = val(o, RE.why);
      const a = { id: A.uid(), pid: p.id, pro: pro.id, date: d, start: t, dur: Math.max(10, Math.min(240, dur)), what: why ? why.slice(0, 60) : 'Control', status: d < today ? (/ausent|falt/.test(st) ? 'ausente' : 'atendido') : 'pendiente', imp: true, note: 'Turno traído del sistema anterior' };
      A.mutate([d], () => { list.push(a); });
      ap++;
    });
    extra.notes.forEach(o => {
      const text = val(o, RE.text); if (!text) return;
      const p = ensure(patKey(o), o, 'nota'); if (!p) return;
      const d = parseDate(val(o, RE.date)) || today, pd = A.pd(p.id);
      pd.notes = pd.notes || [];
      if (pd.notes.some(x => x.imp && x.date === d && x.text.indexOf(text.slice(0, 60)) >= 0)) return;
      pd.notes.push({ id: A.uid(), date: d, pro: p.pro, text: '[Sistema anterior] ' + text.slice(0, 4000), imp: true });
      touched[p.id] = 1; nt++;
    });
    Object.keys(touched).forEach(pid => { const pd = A.pd(pid); pd.notes.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); A.touchPd(pid); });
    return { ap, apSkip, nt, created, doubt };
  }

  /* resumen final con turnos y evoluciones */
  const prevDone = MF.importDone;
  MF.importDone = function (m) {
    let h = prevDone.apply(this, arguments);
    if (m.ap != null) {
      h = h.replace('</div>', '</div><div class="stats"><div class="stat"><b>' + m.ap + '</b>turnos cargados</div><div class="stat"><b>' + m.nt + '</b>evoluciones</div>' + (m.created ? '<div class="stat"><b>' + m.created + '</b>pacientes que solo estaban en la agenda</div>' : '') + '</div>');
      h = h.replace(/Lo que no venía en el archivo \(odontogramas, imágenes, turnos\)/, 'Lo que no venía en el archivo (odontogramas, imágenes)');
      const D = m.doubt || [];
      if (D.length) {
        const nN = D.filter(x => x.kind === 'nota').length, nT = D.length - nN;
        h = h.replace('<div class="stats">', '<div class="mu-doubt"><b>No se cargaron ' + [nN ? nN + ' evolucion' + (nN === 1 ? '' : 'es') : '', nT ? nT + ' turno' + (nT === 1 ? '' : 's') : ''].filter(Boolean).join(' y ') + '</b> porque no se pudo saber con certeza de qué paciente eran. Así no se mezcla nada en la historia clínica de otro paciente.' +
          '<details><summary>Ver cuáles (' + D.length + ')</summary><ul class="pd-list">' + D.slice(0, 80).map(x => '<li><b>' + esc(x.k.name || 'Sin nombre') + '</b>' + (x.k.dni ? ' · DNI ' + esc(x.k.dni) : '') + (x.date ? ' · ' + esc(A.fmtDMY(x.date)) : '') + ' · ' + (x.kind === 'nota' ? 'evolución' : 'turno') + (x.text ? ': «' + esc(x.text) + (x.text.length >= 140 ? '…' : '') + '»' : '') + ' <span class="hint">(' + esc(x.why) + ')</span></li>').join('') + (D.length > 80 ? '<li>… y ' + (D.length - 80) + ' más</li>' : '') + '</ul>' +
          '<p class="hint">Para traerlas, corregí en el sistema anterior el DNI o el nombre de esos pacientes (o borrá el paciente repetido acá) y volvé a hacer la mudanza: lo que ya se cargó no se duplica.</p></details></div><div class="stats">');
      }
    }
    return h;
  };

  /* ---------- carta para pedir los datos y ayuda ---------- */
  const LETTER = () => 'Asunto: Pedido de entrega de mis datos\n\nHola. Soy ' + ((A.S.me && A.S.me.name) || '[nombre y apellido]') + ', titular de la cuenta [usuario o correo] de [nombre del sistema].\n\nComo responsable de los datos de mis pacientes, les pido que me entreguen, en una planilla (Excel o CSV) o en un archivo estándar, toda la información cargada en mi cuenta: listado de pacientes con sus datos de contacto y cobertura, agenda de turnos (pasados y futuros) e historias clínicas con sus evoluciones, odontogramas e imágenes.\n\nLo pido en ejercicio de mis derechos sobre los datos que les confié para su tratamiento por mi cuenta (Ley 25.326 de Protección de los Datos Personales) y de mi obligación de conservar las historias clínicas (Ley 26.529).\n\nQuedo a la espera de la entrega dentro de los próximos 10 días hábiles. Muchas gracias.\n\n[Firma]';
  A.acts.muLetter = () => { S.modal = { type: 'muLetter' }; A.renderModal(); };
  MF.muLetter = () => A.modalShell('Pedirle tus datos al sistema anterior', '<p>Los datos de tus pacientes son tuyos: el sistema los guarda por tu cuenta y tiene que entregártelos si se los pedís. Copiá este mensaje, completá lo que está entre corchetes y mandalo a su soporte.</p><textarea id="muTxt" rows="14" style="width:100%;font:inherit;border-radius:12px;padding:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink)">' + esc(LETTER()) + '</textarea><p class="hint">Modelo orientativo: no reemplaza el consejo de un abogado.</p>',
    '<button class="btn" data-act="importOpen">Volver</button><button class="btn primary" data-act="muCopy">Copiar</button>', true);
  A.acts.muCopy = () => { const t = ($('#muTxt') || {}).value || LETTER(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => A.toast('Copiado.')).catch(() => { const x = $('#muTxt'); if (x) { x.select(); document.execCommand && document.execCommand('copy'); A.toast('Copiado.'); } }); };
  A.acts.muHelp = () => { const sup = A.SUPPORT || {}, num = (sup.wa && sup.wa[0]) || sup.whatsapp || '5492984513279'; window.open('https://wa.me/' + String(num).replace(/\D/g, '') + '?text=' + encodeURIComponent('Hola! Quiero hacer la mudanza gratis a OdontoVoz desde mi sistema anterior (' + (A.CLINIC || '') + ').'), '_blank', 'noopener'); };

  /* el menú dice «Mudanza desde otro sistema» */
  function label() { const b = $('#gearMenu .dnav[data-act="importOpen"] .t'); if (b && !b.getAttribute('data-mu')) { b.setAttribute('data-mu', '1'); b.innerHTML = 'Mudanza desde otro sistema<small>Bilog, Dentalink, Excel · gratis</small>'; } }
  const arPrev = A.afterRefresh;
  A.afterRefresh = function () { if (arPrev) arPrev.apply(this, arguments); try { label(); } catch (e) { /* nada */ } };
  setTimeout(label, 0);

  const css = document.createElement('style');
  css.textContent = [
    '.mu-hero { display: flex; flex-direction: column; gap: 4px; background: linear-gradient(135deg, var(--accent), #08484b); color: #fff; border-radius: 16px; padding: 14px 16px; margin-bottom: 10px; } .mu-hero span:last-child { color: #d8f0eb; }',
    '.mu-free { align-self: flex-start; background: #f6c453; color: #08484b; border-radius: 999px; padding: 2px 10px; font-weight: 800; font-size: 12px; }',
    '.mu-alt { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }',
    '.mu-extra { border: 1px solid var(--line); border-radius: 14px; padding: 10px 14px; margin: 10px 0; background: var(--surface); } .mu-extra ul { margin: 6px 0; padding-left: 18px; }',
    '.mu-chk { display: flex; gap: 8px; align-items: flex-start; margin-top: 6px; font-size: 14px; } .mu-chk input { width: 18px; height: 18px; margin-top: 2px; flex: none; }',
    '.mu-doubt { border: 1px solid var(--warn); background: var(--warn-soft); border-radius: 12px; padding: 10px 12px; margin: 10px 0; font-size: 14px; } .mu-doubt summary { cursor: pointer; margin-top: 6px; font-weight: 600; } .mu-doubt .pd-list { max-height: 260px; overflow: auto; font-size: 13px; }'
  ].join('\n');
  document.head.appendChild(css);

  /* =====================================================================
     1.45.1: «Revisar una mudanza ya hecha». Se vuelve a elegir el mismo archivo y se compara, evolución por evolución
     y turno por turno, en qué ficha quedó y en cuál tendría que estar (por el número de paciente del sistema anterior).
     Lo que quedó en otra ficha se muestra y, si se confirma, se pasa a la correcta. Los pacientes que faltan se crean.
     ===================================================================== */
  const TX = t => N(String(t || '').replace(/^\[Sistema anterior\]\s*/, '')).slice(0, 160);
  function review(j) {
    const pats = Array.isArray(j.patients) ? j.patients : [], notes = Array.isArray(j.notes) ? j.notes : [], appts = Array.isArray(j.appts) ? j.appts : [];
    /* 1) cada paciente del archivo → su ficha en OdontoVoz (o «falta») */
    const byRid = {}, missing = [];
    pats.forEach(p => {
      const rid = val(p, /^(id|id paciente|codigo)$/), k = { dni: val(p, RE.dni).replace(/\D/g, ''), name: (() => { const n = val(p, /^(apellido y nombre|nombre completo|paciente|nombre y apellido)$/); return n; })(), rid: '' };
      const f = findPat(k, {});
      if (f && (!k.name || sameName(k.name, fullName(f)))) { if (rid) byRid[rid] = f; }
      else missing.push({ rid, k, p });
    });
    /* 2) dónde está hoy cada evolución importada */
    const where = {};   // clave → [{pid, note}]
    A.PATS.forEach(p => { const pd = A.S.pd && A.S.pd[p.id]; ((pd && pd.notes) || []).forEach(n => { if (n && n.imp && !n.void && !n.mvd) { const key = n.date + '|' + TX(n.text); (where[key] = where[key] || []).push({ pid: p.id, n }); } }); });
    /* 3) evoluciones del archivo agrupadas por clave y por ficha correcta */
    const want = {};    // clave → { pidCorrecto: cantidad }
    let unknown = 0;
    notes.forEach(o => {
      const text = val(o, RE.text); if (!text) return;
      const k = patKey(o), d = parseDate(val(o, RE.date)) || A.today(), key = d + '|' + TX(text);
      const p = (k.rid && byRid[k.rid]) || null; if (!p) { if (!k.rid) unknown++; return; }   /* con número pero sin ficha: es de un paciente que falta crear */
      const w = want[key] = want[key] || {}; w[p.id] = (w[p.id] || 0) + 1;
    });
    const moves = [];   // {n, from, to}
    Object.keys(want).forEach(key => {
      const have = (where[key] || []).slice(), need = Object.assign({}, want[key]);
      have.forEach(h => { if (need[h.pid] > 0) { need[h.pid]--; h.ok = true; } });
      const extra = have.filter(h => !h.ok && !want[key][h.pid]);
      Object.keys(need).forEach(pid => { while (need[pid] > 0 && extra.length) { const h = extra.shift(); moves.push({ n: h.n, from: h.pid, to: pid }); need[pid]--; } });
    });
    /* 4) turnos importados en la ficha equivocada */
    const amoves = [];
    appts.forEach(o => {
      const k = patKey(o), p = (k.rid && byRid[k.rid]) || null; if (!p) return;
      const d = parseDate(val(o, RE.date)), t = parseTime(val(o, RE.time)) ?? parseTime(val(o, RE.date)); if (!d || t == null) return;
      (A.S.days[d] || []).forEach(a => { if (a.imp && a.start === t && a.pid !== p.id && !(A.S.days[d] || []).some(b => b.imp && b.start === t && b.pid === p.id)) { const cur = A.PAT(a.pid); if (cur && k.name && !sameName(k.name, fullName(cur))) amoves.push({ d, a, to: p.id }); } });
    });
    return { moves, amoves, missing, unknown, total: notes.length };
  }
  const pl = (n, a, b) => n + ' ' + (n === 1 ? a : b);
  MF.mudReview = m => {
    const r = m.r;
    let b;
    if (!r) b = '<p>Elegí el <b>mismo archivo</b> de la mudanza (el .json que bajó el asistente). Comparo cada evolución y cada turno con el paciente al que pertenecía en el sistema anterior y te muestro si alguno quedó en otra ficha.</p><p class="hint">No cambia nada hasta que confirmes.</p><input type="file" accept=".json,application/json" data-chg="mudRevFile" class="inp">';
    else {
      const byPair = {}; r.moves.forEach(x => { const k = x.from + '>' + x.to; (byPair[k] = byPair[k] || { from: x.from, to: x.to, n: 0, odon: false }).n++; if (x.n.odon) byPair[k].odon = true; });
      const pairs = Object.keys(byPair).map(k => byPair[k]);
      const nm = pid => { const x = A.PAT(pid) || {}; return esc(x.name || '?') + (x.dni ? ' <span class="hint">(DNI ' + esc(x.dni) + ')</span>' : ''); };
      b = '<div class="stats"><div class="stat"><b>' + r.moves.length + '</b>evoluciones en otra ficha</div><div class="stat"><b>' + r.amoves.length + '</b>turnos en otra ficha</div><div class="stat"><b>' + r.missing.length + '</b>pacientes que faltan</div></div>';
      if (!r.moves.length && !r.amoves.length && !r.missing.length) b += '<p><b>Todo en orden:</b> cada evolución y cada turno está en la ficha que corresponde.</p>';
      /* 1.21.3: cada pase se puede destildar; los pacientes que faltan NO se crean salvo que se pida (pueden ser fichas que después renombraste o uniste) */
      m.skip = m.skip || {};
      if (pairs.length) b += '<h4 class="ev-h">Se van a pasar (destildá lo que no quieras mover)</h4><ul class="pd-list mr-pairs">' + pairs.map(x => { const k = x.from + '>' + x.to; return '<li><label class="mu-chk"><input type="checkbox" data-chg="mrPair" data-k="' + esc(k) + '"' + (m.skip[k] ? '' : ' checked') + '> <span>' + x.n + ' de <b>' + nm(x.from) + '</b> a <b>' + nm(x.to) + '</b>' + (x.odon ? ' · <span class="bad">ya se habían pasado al odontograma: revisalo</span>' : '') + '</span></label></li>'; }).join('') + '</ul>';
      if (r.missing.length) b += '<h4 class="ev-h">Pacientes del archivo que no encontré</h4><ul class="pd-list">' + r.missing.slice(0, 30).map(x => '<li>' + esc(x.k.name || '?') + (x.k.dni ? ' · DNI ' + esc(x.k.dni) : '') + '</li>').join('') + (r.missing.length > 30 ? '<li>y ' + (r.missing.length - 30) + ' más</li>' : '') + '</ul>' +
        '<p class="hint">Puede ser que no se hayan creado (por ejemplo, una hija que compartía el DNI con la madre) o que <b>después les cambiaste el nombre o el DNI, o los uniste con otra ficha</b>. Por eso no se crean solos.</p>' +
        '<label class="mu-chk"><input type="checkbox" data-chg="mrCreate"' + (m.create ? ' checked' : '') + '> Crear estos ' + r.missing.length + ' pacientes y pasarles lo suyo (solo si estás seguro de que no los tenés con otro nombre)</label>';
      if (r.unknown) b += '<p class="hint">' + pl(r.unknown, 'evolución', 'evoluciones') + ' del archivo no traen el número de paciente; esas no se pueden comprobar.</p>';
    }
    const U = undoGet();
    if (!r && U) b += '<div class="mu-extra"><b>Última corrección:</b> ' + esc(A.fmtDMY(U.at.slice(0, 10))) + ' (' + pl(U.notes.length, 'evolución', 'evoluciones') + ', ' + pl(U.appts.length, 'turno', 'turnos') + '). <button class="btn small" data-act="mrUndo">Deshacerla</button></div>';
    if (r) b += '<p class="hint">Solo se mueven evoluciones y turnos <b>traídos por la mudanza</b>. Lo que escribiste o cargaste vos en OdontoVoz no se toca, ni tampoco las notas que ya anulaste o pasaste a mano. Después podés deshacerlo.</p>';
    const fix = r && (r.moves.length || r.amoves.length || (r.missing.length && m.create));
    return A.modalShell('Revisar la mudanza', b, '<button class="btn" data-act="closeModal">' + (fix ? 'Cancelar' : 'Cerrar') + '</button>' + (fix ? '<button class="btn primary" data-act="mudRevGo">Corregir</button>' : ''));
  };
  A.acts.mudRevOpen = () => { if (A.hideDrawer) A.hideDrawer(); S.modal = { type: 'mudReview' }; A.renderModal(); };
  A.chg.mudRevFile = async el => {
    const f = el.files && el.files[0]; if (!f) return;
    try { const j = JSON.parse(await f.text()); if (!j || !Array.isArray(j.patients)) throw new Error('x'); S.modal = { type: 'mudReview', j, r: review(j) }; }
    catch (e) { A.toast('Ese archivo no es el de la mudanza (.json del asistente).'); return; }
    A.renderModal();
  };
  /* deshacer la última corrección (queda guardada en este equipo) */
  const UKEY = 'odontovoz.mudUndo';
  function undoGet() { try { const u = JSON.parse(localStorage.getItem(UKEY) || 'null'); return u && u.notes ? u : null; } catch (e) { return null; } }
  A.chg.mrPair = el => { const m = S.modal; m.skip = m.skip || {}; if (el.checked) delete m.skip[el.getAttribute('data-k')]; else m.skip[el.getAttribute('data-k')] = 1; };
  A.chg.mrCreate = el => { S.modal.create = el.checked; A.renderModal(); };
  A.acts.mrUndo = () => {
    const U = undoGet(); if (!U) return;
    let nN = 0, nA = 0; const pids = {};
    U.notes.forEach(x => { const b = A.pd(x.to), n = (b.notes || []).filter(y => y.id === x.id)[0]; if (!n || !A.PAT(x.from)) return; b.notes = b.notes.filter(y => y !== n); const a = A.pd(x.from); a.notes = a.notes || []; a.notes.push(n); pids[x.from] = pids[x.to] = 1; nN++; });
    U.appts.forEach(x => { const a = (A.S.days[x.d] || []).filter(y => y.id === x.id && y.pid === x.to)[0]; if (!a) return; a.pid = x.from; A.S.dirtyDays = A.S.dirtyDays || {}; A.S.dirtyDays[x.d] = 1; nA++; });
    Object.keys(pids).forEach(pid => { const pd = A.pd(pid); pd.notes.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); A.touchPd(pid); if (A.alog) A.alog(pid, 'mudanza', 'Se deshizo la corrección de la mudanza del ' + A.fmtDMY(U.at.slice(0, 10)) + '.'); });
    try { localStorage.removeItem(UKEY); } catch (e) { /* nada */ }
    A.saveNow(); A.refresh(); S.modal = null; A.renderModal();
    A.toast('Corrección deshecha: ' + pl(nN, 'evolución volvió', 'evoluciones volvieron') + ' y ' + pl(nA, 'turno volvió', 'turnos volvieron') + ' a donde estaban.');
  };
  A.acts.mudRevGo = () => {
    const m = S.modal; if (!m || !m.j) return;
    /* primero los pacientes que faltaban, solo si se pidió (después se vuelve a revisar, para mover sus evoluciones y turnos) */
    if (m.create) m.r.missing.forEach(x => {
      const nmv = x.k.name || ''; const parts = nmv.indexOf(',') >= 0 ? { last: nmv.split(',')[0], first: nmv.split(',').slice(1).join(' ') } : { last: nmv.split(/\s+/)[0], first: nmv.split(/\s+/).slice(1).join(' ') || '-' };
      const T = s2 => String(s2 || '').toLowerCase().replace(/(^|[\s'-])([a-zñáéíóúü])/g, (y, a, b2) => a + b2.toUpperCase()).trim();
      const p = A.addPatient({ first: T(parts.first) || '-', last: T(parts.last) || '-', dni: x.k.dni || '', cov: val(x.p, /^obra social$/) || 'Particular', age: 0 });
      const ex = {}; const ph = val(x.p, /^celular$/); if (ph) ex.phone = ph; const bd = val(x.p, /^fecha de nacimiento$/); if (bd) ex.birth = bd; if (Object.keys(ex).length) A.setProfile(p.id, ex);
      if (A.alog) A.alog(p.id, 'mudanza', 'Creado al revisar la mudanza (en la importación había quedado unido a otra ficha por compartir DNI).');
    });
    const r = m.create && m.r.missing.length ? review(m.j) : m.r, skip = m.skip || {};
    r.moves = r.moves.filter(x => !skip[x.from + '>' + x.to]);
    const U = { at: new Date().toISOString(), notes: [], appts: [] };
    let nN = 0, nA = 0; const odonPids = {};
    r.moves.forEach(x => {
      U.notes.push({ id: x.n.id, from: x.from, to: x.to });
      const a = A.pd(x.from), b = A.pd(x.to);
      a.notes = a.notes.filter(n => n !== x.n); b.notes.push(x.n); nN++;
      if (x.n.odon) { odonPids[x.from] = 1; odonPids[x.to] = 1; delete x.n.odon; }
      if (A.alog) { A.alog(x.from, 'mudanza', 'Revisión de la mudanza: una evolución del ' + A.fmtDMY(x.n.date) + ' pasó a la ficha de ' + ((A.PAT(x.to) || {}).name || '') + ' (era suya).'); A.alog(x.to, 'mudanza', 'Revisión de la mudanza: llegó una evolución del ' + A.fmtDMY(x.n.date) + ' que había quedado en la ficha de ' + ((A.PAT(x.from) || {}).name || '') + '.'); }
    });
    const days = {}; r.amoves.forEach(x => { U.appts.push({ d: x.d, id: x.a.id, from: x.a.pid, to: x.to }); x.a.pid = x.to; days[x.d] = 1; nA++; });
    try { localStorage.setItem(UKEY, JSON.stringify(U)); } catch (e) { /* nada */ }
    Object.keys(days).forEach(d => { A.S.dirtyDays = A.S.dirtyDays || {}; A.S.dirtyDays[d] = 1; });
    const pids = {}; r.moves.forEach(x => { pids[x.from] = 1; pids[x.to] = 1; });
    Object.keys(pids).forEach(pid => { const pd = A.pd(pid); pd.notes.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); A.touchPd(pid); });
    A.saveNow(); A.refresh();
    const op = Object.keys(odonPids).map(pid => (A.PAT(pid) || {}).name).filter(Boolean);
    S.modal = { type: 'mudRevDone', nN, nA, nP: m.create ? m.r.missing.length : 0, op };
    A.renderModal();
  };
  MF.mudRevDone = m => A.modalShell('Mudanza corregida',
    '<p>Listo: ' + pl(m.nN, 'evolución', 'evoluciones') + ' y ' + pl(m.nA, 'turno', 'turnos') + ' pasaron a su ficha' + (m.nP ? ', y ' + (m.nP === 1 ? 'se creó 1 paciente que faltaba' : 'se crearon ' + m.nP + ' pacientes que faltaban') : '') + '. Queda registrado en el historial de cada ficha.</p>' +
    (m.op.length ? '<div class="pd-warn"><b>Revisá el odontograma de:</b> ' + m.op.map(esc).join(', ') + '. Algunas de esas evoluciones ya se habían pasado al odontograma en la ficha equivocada. En la ficha correcta te aparece «Ver y pasar» para marcarlas donde van; en la otra, corregí las marcas que no son suyas.</div>' : ''),
    '<button class="btn" data-act="mrUndo">Deshacer</button><button class="btn primary" data-act="closeModal">Listo</button>');
  /* botón en la ventana de la mudanza */
  const prevImpPats = MF.importPats;
  if (prevImpPats) MF.importPats = function (m) {
    let h = prevImpPats.apply(this, arguments);
    if (m && !m.rows && !A.DEMO) h = h.replace(/(<\/p>)/, '$1<p><button class="btn small" data-act="mudRevOpen">Revisar una mudanza ya hecha</button></p>');
    return h;
  };
})();
