/* ===== 1.40: Mudanza gratis desde otro sistema (Bilog, Dentalink…): pacientes, turnos y evoluciones desde el archivo del asistente o un Excel ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns;
  const N = s => A.norm(String(s == null ? '' : s).replace(/([a-z])([A-Z])/g, '$1 $2')).replace(/[_\-.:]+/g, ' ').replace(/\s+/g, ' ').trim();
  const PAGE = 'https://roan-corp.github.io/odontovoz/mudanza.html';
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

  function findPat(k, byRid) {
    if (k.dni) { const p = A.PATS.find(x => String(x.dni) === k.dni); if (p) return p; }
    if (k.rid && byRid[k.rid]) return byRid[k.rid];
    if (k.name) { const nk = nameKey(k.name); const p = A.PATS.find(x => nameKey(x.last + ' ' + x.first) === nk); if (p) return p; }
    return null;
  }
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
    (extra.ridPats || []).forEach(x => { const p = findPat({ dni: x.p.dni, name: x.p.last + ', ' + x.p.first }, {}); if (p) byRid[x.rid] = p; });
    let ap = 0, apSkip = 0, nt = 0, created = 0;
    const touched = {};
    const ensure = k => {
      let p = findPat(k, byRid);
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
      const p = ensure(patKey(o)); if (!p) { apSkip++; return; }
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
      const p = ensure(patKey(o)); if (!p) return;
      const d = parseDate(val(o, RE.date)) || today, pd = A.pd(p.id);
      pd.notes = pd.notes || [];
      if (pd.notes.some(x => x.imp && x.date === d && x.text.indexOf(text.slice(0, 60)) >= 0)) return;
      pd.notes.push({ id: A.uid(), date: d, pro: p.pro, text: '[Sistema anterior] ' + text.slice(0, 4000), imp: true });
      touched[p.id] = 1; nt++;
    });
    Object.keys(touched).forEach(pid => { const pd = A.pd(pid); pd.notes.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); A.touchPd(pid); });
    return { ap, apSkip, nt, created };
  }

  /* resumen final con turnos y evoluciones */
  const prevDone = MF.importDone;
  MF.importDone = function (m) {
    let h = prevDone.apply(this, arguments);
    if (m.ap != null) {
      h = h.replace('</div>', '</div><div class="stats"><div class="stat"><b>' + m.ap + '</b>turnos cargados</div><div class="stat"><b>' + m.nt + '</b>evoluciones</div>' + (m.created ? '<div class="stat"><b>' + m.created + '</b>pacientes que solo estaban en la agenda</div>' : '') + '</div>');
      h = h.replace(/Lo que no venía en el archivo \(odontogramas, imágenes, turnos\)/, 'Lo que no venía en el archivo (odontogramas, imágenes)');
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
    '.mu-chk { display: flex; gap: 8px; align-items: flex-start; margin-top: 6px; font-size: 14px; } .mu-chk input { width: 18px; height: 18px; margin-top: 2px; flex: none; }'
  ].join('\n');
  document.head.appendChild(css);
})();
