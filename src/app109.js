/* ===== 1.22: Fichas FORN (Federación Odontológica de Río Negro): ficha mensual por paciente desde la historia clínica y presentación del mes en PDF ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, MF = A.modalFns, $ = q => document.querySelector(q);
  /* Ficha: { id, mes: 'AAAA-MM', pro, afil, addr, loc, tel, birth, os, rows: [{ id, fecha, pieza, cara, cod, desc }], obs,
     sig (firma del paciente, PNG), sigAt, perio (incluir dorso), estado: 'borrador' | 'lista' | 'presentada', at, upd }.
     Vive en pd.forn y se sincroniza con la ficha del paciente. */
  /* logo de la Federación (lo pasó Rodrigo, 23/11/2026; confirmar con la FORN el permiso de uso antes de venderlo) — 520×137 */
  const LOGO = 'data:image/jpeg;base64,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';
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mesTxt = m => { const p = String(m || '').split('-'); return p.length === 2 ? A.cap(MESES[(+p[1] || 1) - 1]) + ' ' + p[0] : ''; };
  const thisMonth = () => A.today().slice(0, 7);
  const addMonth = (m, k) => { let [y, mm] = m.split('-').map(Number); mm += k; while (mm < 1) { mm += 12; y--; } while (mm > 12) { mm -= 12; y++; } return y + '-' + String(mm).padStart(2, '0'); };
  /* 1.23: fichas sin paciente asignado. Son registro de la organización y se sincronizan con la clave «fornfree». */
  const FKEY = () => 'odontovoz.fornfree.' + ((A.ownerId && A.ownerId()) || 'local');
  let FREE = null;
  const freeGet = () => { if (FREE) return FREE; try { FREE = JSON.parse(localStorage.getItem(FKEY()) || 'null'); } catch (e) { FREE = null; } if (!FREE || !Array.isArray(FREE.list)) FREE = { list: [] }; return FREE; };
  const freeSet = v => { FREE = v && Array.isArray(v.list) ? v : { list: [] }; try { localStorage.setItem(FKEY(), JSON.stringify(FREE)); } catch (e) { /* lleno */ } };
  const freeSave = () => { freeSet(freeGet()); try { A.save && A.save(); } catch (e) { /* nada */ } };
  const xPrev = A.cloudExtra, kPrev = A.cloudExtraKeys;
  A.cloudExtra = k => (k === 'fornfree' ? { get: () => (freeGet().list.length ? freeGet() : null), set: v => freeSet(v) } : (xPrev ? xPrev(k) : null));
  A.cloudExtraKeys = () => ['fornfree'].concat(kPrev ? kPrev() : []);
  const list = pid => { if (!pid) return freeGet().list; const pd = A.pd(pid); return (pd.forn = pd.forn || []); };
  const byId = (pid, id) => list(pid).filter(f => f.id === id)[0] || null;
  /* datos del paciente: de su ficha o, si la ficha FORN no tiene paciente asignado, los que se escribieron a mano */
  const patOf = (pid, f) => { if (pid && A.PAT(pid)) return A.PAT(pid); const x = (f && f.pat) || {}; return { id: '', first: x.first || '', last: x.last || '', name: ((x.first || '') + ' ' + (x.last || '')).trim(), dni: x.dni || '', cov: (f && f.os) || '', birth: (f && f.birth) || '', age: '' }; };
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

  /* ---------- códigos de la Federación: lista desplegable por obra social (se bajan solos cada mes, app67) ---------- */
  let FD = null, FFAIL = false;
  function loadCodes() {
    if (FD || !A.fornGet) return;
    A.fornGet().then(d => { if (d && d.os) FD = d; else FFAIL = true; if (S.modal && S.modal.type === 'frnEd') A.renderModal(); }).catch(() => { FFAIL = true; });
  }
  const CHAP = { '01': 'I - CONSULTAS', '02': 'II - OPERATORIA DENTAL', '03': 'III - ENDODONCIA', '04': 'IV - PRÓTESIS', '05': 'V - ODONTOLOGÍA PREVENTIVA', '06': 'VI - ORTODONCIA Y ORTOPEDIA', '07': 'VII - ODONTOPEDIATRÍA', '08': 'VIII - PERIODONCIA', '09': 'IX - RADIOLOGÍA', '10': 'X - CIRUGÍA BUCAL' };
  /* la obra social de la Federación que corresponde a la ficha (o la que se eligió a mano) */
  function fornOs(pid, f) {
    if (!FD) return null;
    if (f.fornSlug) return (FD.os || []).filter(o => o.slug === f.fornSlug)[0] || null;
    if (f.fornSlug === '') return null;
    const p = patOf(pid, f), name = f.os || p.cov || ''; if (isPart(name)) return null;
    let o = null; try { o = A.osOf ? A.osOf(Object.assign({}, p, { cov: name })) : null; } catch (e) { /* nada */ }
    try { return A.fornMatch(o || { name, sigla: name }) || null; } catch (e) { return null; }
  }
  /* códigos con su descripción y valor: de esa obra social o, si no hay, de todas */
  function codesOf(fo) {
    const m = {};
    ((fo ? [fo] : (FD && FD.os) || [])).forEach(o => (o.tables || []).forEach(t => {
      const k = t.cols.map(c => c.kind), ix = k.indexOf('cov') >= 0 ? k.indexOf('cov') : k.indexOf('total') >= 0 ? k.indexOf('total') : 0;
      const lab = k[ix] === 'cov' ? 'paga la O.S.:' : k[ix] === 'total' ? 'valor:' : 'plan ' + ((t.cols[ix] && t.cols[ix].label) || '') + ':';
      Object.keys(t.rows || {}).forEach(c => { if (m[c]) return; const r = t.rows[c], v = r.v && r.v[ix]; m[c] = { c, d: r.d || '', val: fo && typeof v === 'number' && v > 0 ? lab + ' ' + A.money(v) : '' }; });
    }));
    return Object.keys(m).sort().map(c => m[c]);
  }
  function codeCtl(L, r, i) {
    const attrs = ' data-chg="frnR" data-i="' + i + '" data-k="cod" aria-label="Código"';
    if (r.free || (!L.length && FFAIL)) return '<input class="inp frn-codc"' + attrs + ' placeholder="Código (ej. 02.15)" value="' + esc(r.cod || '') + '">';
    const has = L.some(x => x.c === r.cod), groups = {};
    L.forEach(x => { const g = x.c.slice(0, 2); (groups[g] = groups[g] || []).push(x); });
    return '<select class="inp frn-codc"' + attrs + '><option value="">' + (L.length ? 'Elegí la práctica' : 'Cargando códigos…') + '</option>' +
      (r.cod && !has ? '<option value="' + esc(r.cod) + '" selected>' + esc(r.cod + (r.desc ? ' - ' + r.desc.slice(0, 70) : '')) + '</option>' : '') +
      Object.keys(groups).sort().map(g => '<optgroup label="Capítulo ' + esc(CHAP[g] || g) + '">' + groups[g].map(x => '<option value="' + esc(x.c) + '"' + (x.c === r.cod ? ' selected' : '') + '>' + esc(x.c + ' - ' + String(x.d).slice(0, 80)) + '</option>').join('') + '</optgroup>').join('') +
      '<option value="__otro">✎ Escribir otro código…</option></select>';
  }

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
  A.acts.frnEdit = el => openEd(el.getAttribute('data-pid') || null, el.getAttribute('data-id'));
  function openEd(pid, id) { loadCodes(); S.modal = { type: 'frnEd', pid, id, back: S.modal && S.modal.type === 'frnMes' ? S.modal : null }; A.renderModal(); }

  MF.frnEd = m => {
    const f = byId(m.pid, m.id), p = patOf(m.pid, f);
    if (!f) return A.modalShell('Ficha FORN', '<p>No encontré esa ficha.</p>', '<button class="btn" data-act="closeModal">Cerrar</button>');
    const fo = fornOs(m.pid, f), L = codesOf(fo);
    const fld = (k, lbl, type, ph) => '<label class="field"><span>' + lbl + '</span><input class="inp" ' + (type ? 'type="' + type + '" ' : '') + 'data-chg="frnF" data-k="' + k + '" value="' + esc(f[k] || '') + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '></label>';
    let b = '<div class="frn-ed">' +
      (m.pid ? '<div class="frn-top"><div><b class="frn-pat">' + esc(p.name || '') + '</b><span class="hint" style="margin:0">DNI ' + esc(p.dni || '—') + (p.birth ? ' · ' + esc(ageOf(f.birth || p.birth)) + ' años' : '') + '</span></div>'
        : '<div class="frn-free"><p class="hint" style="margin:0">Ficha sin paciente asignado: completá los datos a mano o <button class="lnk" data-act="frnAsg">asignala a un paciente</button>.</p><div class="frn-grid">' +
          ['last|Apellido', 'first|Nombre', 'dni|DNI'].map(x => { const k = x.split('|'); return '<label class="field"><span>' + k[1] + '</span><input class="inp" data-chg="frnP" data-k="' + k[0] + '" value="' + esc((f.pat || {})[k[0]] || '') + '"></label>'; }).join('') + '</div></div><div class="frn-top">') +
      '<label class="field frn-mes"><span>Mes</span><input class="inp" type="month" data-chg="frnF" data-k="mes" value="' + esc(f.mes) + '"></label></div>' +
      '<details class="frn-dat"' + (f.afil && f.os ? '' : ' open') + '><summary>Datos del paciente para la ficha' + (f.afil ? '' : ' <span class="chip warn">falta N° de afiliado</span>') + '</summary><div class="frn-grid">' +
      fld('os', 'Obra social', '', 'Ej.: OSPe') + fld('afil', 'N° de afiliado') + fld('addr', 'Domicilio') + fld('loc', 'Localidad') + fld('tel', 'Teléfono') + fld('birth', 'Fecha de nacimiento', 'date') +
      '</div><p class="hint" style="margin:6px 0 0">Vienen de la ficha del paciente. Si cambiás algo acá, se guarda también en su ficha.</p></details>' +
      '<label class="field"><span>Odontólogo</span><select class="inp" data-chg="frnF" data-k="pro">' + (A.PROS || []).map(x => '<option value="' + esc(x.id) + '"' + (x.id === f.pro ? ' selected' : '') + '>' + esc(x.name) + (x.mat ? ' · Mat. ' + esc(x.mat) : '') + '</option>').join('') + '</select></label>' +
      (proOf(f.pro).mat ? '' : '<p class="hint warn" style="margin:0">Este profesional no tiene la matrícula cargada (Ajustes › Profesionales). En la ficha queda en blanco.</p>') +
      '<h4 class="frn-h">Prácticas a facturar ' + (m.pid ? '<button class="btn small" data-act="frnPull">Traer lo realizado en ' + esc(mesTxt(f.mes)) + '</button>' : '') + '</h4>' +
      osPick(m.pid, f, fo) +
      '<div class="frn-rows">' + (f.rows.length ? f.rows.map((r, i) => { const x = L.filter(y => y.c === r.cod)[0]; return '<div class="frn-row">' +
        '<input class="inp" type="date" aria-label="Fecha" data-chg="frnR" data-i="' + i + '" data-k="fecha" value="' + esc(r.fecha || '') + '">' +
        '<input class="inp" inputmode="numeric" aria-label="Pieza" placeholder="Pieza" data-chg="frnR" data-i="' + i + '" data-k="pieza" value="' + esc(r.pieza || '') + '">' +
        '<input class="inp" aria-label="Cara" placeholder="Cara" data-chg="frnR" data-i="' + i + '" data-k="cara" value="' + esc(r.cara || '') + '">' +
        codeCtl(L, r, i) +
        '<button class="btn small ghost danger" data-act="frnDelRow" data-i="' + i + '" aria-label="Quitar">×</button>' +
        (r.desc || (x && x.val) ? '<span class="frn-desc">' + esc(r.desc || (x && x.d) || '') + (x && x.val ? ' <b>· ' + esc(x.val) + '</b>' : '') + '</span>' : '') + '</div>'; }).join('') : '<p class="hint" style="margin:0">Todavía no hay prácticas. Traé lo realizado del mes o agregalas a mano.</p>') + '</div>' +
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
  function osPick(pid, f, fo) {
    if (!FD) return '<p class="hint" style="margin:0">' + (FFAIL ? 'Sin conexión: no pude bajar los códigos de la Federación. Escribí el código a mano.' : 'Cargando los códigos de la Federación…') + '</p>';
    const all = (FD.os || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return '<label class="field frn-osp"><span>Códigos de la obra social' + (fo && fo.vig ? ' <small class="hint">(aranceles de la Federación, vigencia ' + esc(fo.vig) + ')</small>' : '') + '</span><select class="inp" data-chg="frnOsSel">' +
      '<option value=""' + (fo ? '' : ' selected') + '>Todas las obras sociales</option>' + all.map(o => '<option value="' + esc(o.slug) + '"' + (fo && fo.slug === o.slug ? ' selected' : '') + '>' + esc(o.name + (o.sub && o.sub.length < 40 ? ' · ' + o.sub : '')) + '</option>').join('') + '</select></label>';
  }
  A.chg.frnOsSel = el => { const f = cur(); if (!f) return; f.fornSlug = el.value; save(); A.renderModal(); };
  const cur = () => { const m = S.modal; return m && m.type === 'frnEd' ? byId(m.pid, m.id) : null; };
  const save = () => { const m = S.modal; if (!m) return; if (m.pid) A.touchPd(m.pid); else freeSave(); };
  const PROF = { afil: 'afil', addr: 'addr', loc: 'loc', tel: 'phone', birth: 'birth' };
  A.chg.frnF = el => {
    const f = cur(); if (!f) return; const k = el.getAttribute('data-k'), v = el.value;
    if (k === 'mes' && !/^\d{4}-\d{2}$/.test(v)) return;
    f[k] = v; f.upd = new Date().toISOString(); save();
    /* lo que se corrige del paciente vuelve a su ficha */
    if (PROF[k] && A.setProfile && S.modal.pid) { const o = {}; o[PROF[k]] = v; A.setProfile(S.modal.pid, o); }
    if (k === 'mes' || k === 'pro') A.renderModal();
  };
  A.chg.frnR = el => {
    const f = cur(); if (!f) return; const r = f.rows[+el.getAttribute('data-i')]; if (!r) return;
    const k = el.getAttribute('data-k'); r[k] = k === 'cara' ? el.value.toUpperCase().replace(/[^MODVLPI]/g, '') : el.value.trim();
    if (k === 'cod') {
      if (r.cod === '__otro') { r.cod = ''; r.free = true; r.desc = ''; save(); A.renderModal(); setTimeout(() => { const x = document.querySelector('[data-chg="frnR"][data-i="' + el.getAttribute('data-i') + '"][data-k="cod"]'); if (x) x.focus(); }, 30); return; }
      const x = codesOf(fornOs(S.modal.pid, f)).filter(y => y.c === r.cod)[0]; if (x) { r.desc = x.d; r.free = false; }
    }
    f.upd = new Date().toISOString(); save(); if (k === 'cod' || k === 'cara') A.renderModal();
  };
  A.chg.frnPerio = el => { const f = cur(); if (f) { f.perio = el.checked; save(); } };
  A.acts.frnAddRow = () => { const f = cur(); if (!f) return; f.rows.push({ id: A.uid(), fecha: A.today().slice(0, 7) === f.mes ? A.today() : f.mes + '-01', pieza: '', cara: '', cod: '', desc: '' }); save(); A.renderModal(); };
  A.acts.frnDelRow = el => { const f = cur(); if (!f) return; f.rows.splice(+el.getAttribute('data-i'), 1); save(); A.renderModal(); };
  A.chg.frnP = el => { const f = cur(); if (!f) return; f.pat = f.pat || {}; f.pat[el.getAttribute('data-k')] = el.value.trim(); f.upd = new Date().toISOString(); save(); };
  A.acts.frnPull = () => { const f = cur(); if (!f || !S.modal.pid) return; pull(S.modal.pid, f); save(); A.renderModal(); };
  A.acts.frnSigClear = () => { const f = cur(); if (!f) return; f.sig = ''; f.sigAt = ''; save(); A.renderModal(); };
  A.acts.frnDone = () => { const m = S.modal; S.modal = m.back || null; if (S.modal && S.modal.type === 'frnMes') { /* volver al listado */ } A.renderModal(); A.refresh(); };
  A.acts.frnDelAsk = () => { const m = S.modal; S.modal = { type: 'frnDel', pid: m.pid, id: m.id, back: m.back }; A.renderModal(); };
  MF.frnDel = m => { const f = byId(m.pid, m.id); return A.modalShell('Borrar la ficha FORN', '<p>¿Borrar la ficha de <b>' + esc(patOf(m.pid, f).name || 'sin paciente') + '</b> de ' + esc(mesTxt(f && f.mes)) + '? Las prácticas del plan de tratamiento no se tocan.</p>', '<button class="btn" data-act="frnDelNo">Cancelar</button><button class="btn danger" data-act="frnDelGo">Borrar</button>'); };
  A.acts.frnDelNo = () => { const m = S.modal; S.modal = { type: 'frnEd', pid: m.pid, id: m.id, back: m.back }; A.renderModal(); };
  A.acts.frnDelGo = () => { const m = S.modal; if (m.pid) { const pd = A.pd(m.pid); pd.forn = (pd.forn || []).filter(f => f.id !== m.id); A.touchPd(m.pid); } else { const F = freeGet(); F.list = F.list.filter(f => f.id !== m.id); freeSave(); } S.modal = m.back || null; A.renderModal(); A.refresh(); A.toast('Ficha FORN borrada.'); };

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
    freeGet().list.forEach(f => { if (f.mes === mes && (!pro || f.pro === pro)) out.push({ p: patOf(null, f), f, free: true }); });
    return out.sort((a, b) => ((a.p.last || '') + (a.p.first || '')).localeCompare((b.p.last || '') + (b.p.first || ''), 'es'));
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
      b += '<ul class="frn-list">' + L.map(x => '<li><button class="frn-it" data-act="frnEdit" data-pid="' + esc(x.p.id || '') + '" data-id="' + esc(x.f.id) + '"><span class="frn-n"><b>' + esc(x.p.last || x.p.first ? (x.p.last || '') + ', ' + (x.p.first || '') : 'Sin paciente') + '</b>' + (x.free ? ' <span class="chip warn">sin paciente asignado</span>' : '') + '<small>' + [esc(x.f.os || x.p.cov || ''), x.f.afil ? 'Afil. ' + esc(x.f.afil) : ''].filter(Boolean).concat(['']).join(' · ') + x.f.rows.length + ' práctica' + (x.f.rows.length === 1 ? '' : 's') + (x.f.rows.length ? ': ' + esc(x.f.rows.map(r => r.cod || '?').slice(0, 6).join(', ')) : '') + '</small></span>' +
        '<span class="frn-st">' + (x.f.sig ? '<span class="chip ok">firmada</span>' : '<span class="chip warn">sin firma</span>') + '<span class="chip ' + ECLS[x.f.estado] + '">' + ESTADO[x.f.estado] + '</span></span></button></li>').join('') + '</ul>';
    }
    return A.modalShell('FORN · Presentación mensual', b,
      '<button class="btn" data-act="closeModal">Cerrar</button><button class="btn" data-act="frnNew">+ Ficha nueva</button>' + (L.length ? '<button class="btn" data-act="frnMarkAll">Marcar como presentadas</button><button class="btn" data-act="frnMail">Mail</button><button class="btn" data-act="frnShare">WhatsApp / Compartir</button><button class="btn primary" data-act="frnPdfAll">PDF con todas</button>' : ''), true)
      .replace('<h2>FORN · Presentación mensual</h2>', '<h2 class="frn-logoh"><img src="' + LOGO + '" alt="FORN · Federación Odontológica de Río Negro" width="520" height="137"><span>Presentación mensual</span></h2>');
  };
  A.acts.frnMonth = el => { S.modal.mes = addMonth(S.modal.mes, +el.getAttribute('data-k')); A.renderModal(); };
  A.chg.frnProF = el => { S.modal.pro = el.value; A.renderModal(); };
  A.acts.frnMarkAll = () => {
    const m = S.modal, L = monthFichas(m.mes, m.pro), pids = {};
    L.forEach(x => { x.f.estado = 'presentada'; x.f.presAt = new Date().toISOString(); if (x.p.id) pids[x.p.id] = 1; });
    Object.keys(pids).forEach(pid => A.touchPd(pid)); if (L.some(x => x.free)) freeSave(); A.renderModal(); A.toast(L.length + ' ficha' + (L.length === 1 ? '' : 's') + ' marcada' + (L.length === 1 ? '' : 's') + ' como presentada' + (L.length === 1 ? '' : 's') + '.');
  };

  /* ---------- ficha nueva desde el apartado FORN: con un paciente o sin paciente (se asigna después, si se quiere) ---------- */
  function patResults(q, act, extra) {
    if (A.norm(q || '').length < 2) return '<p class="hint" style="margin:0">Escribí al menos 2 letras del nombre, el apellido o el DNI.</p>';
    const r = (A.searchPats(q, 8) || []).filter(p => !p.deleted);
    if (!r.length) return '<p class="hint" style="margin:0">No encontré pacientes con eso.</p>';
    return '<div class="mvn-res">' + r.map(p => '<button class="mvn-p" data-act="' + act + '" data-pid="' + esc(p.id) + '"' + (extra || '') + '>' + (A.avatarSm ? A.avatarSm(p.id, 'av-sm') : '') + '<span><b>' + esc(p.name) + '</b><small>DNI ' + esc(p.dni || '—') + ' · ' + esc(p.cov || 'Particular') + '</small></span></button>').join('') + '</div>';
  }
  A.acts.frnNew = () => { const m = S.modal; S.modal = { type: 'frnNew', mes: (m && m.mes) || thisMonth(), q: '', back: m && m.type === 'frnMes' ? m : null }; A.renderModal(); setTimeout(() => { const i = $('#frnNQ'); if (i) i.focus(); }, 50); };
  MF.frnNew = m => A.modalShell('Ficha nueva · ' + mesTxt(m.mes),
    '<label class="field"><span>¿De qué paciente?</span><input class="inp" id="frnNQ" data-in="frnNQ" autocomplete="off" placeholder="Nombre, apellido o DNI" value="' + esc(m.q) + '"></label><div id="frnNRes">' + patResults(m.q, 'frnNewPat') + '</div>' +
    '<p class="hint">Se completa sola con sus datos y con lo que le hiciste en ' + esc(mesTxt(m.mes)) + '. Si ya tiene la ficha de ese mes, se abre esa.</p>' +
    '<div class="frn-or"><span>o</span></div><button class="btn" data-act="frnNewFree">Crear sin paciente (la completo a mano)</button>' +
    '<p class="hint">Queda en el registro FORN de la organización. Después la podés asignar a un paciente.</p>',
    '<button class="btn" data-act="frnNewBack">Volver</button>');
  let tq = null;
  A.ins.frnNQ = el => { S.modal.q = el.value; clearTimeout(tq); tq = setTimeout(() => { const h = $('#frnNRes'); if (h && S.modal && S.modal.type === 'frnNew') h.innerHTML = patResults(S.modal.q, 'frnNewPat'); }, 120); };
  A.acts.frnNewBack = () => { const m = S.modal; S.modal = m.back || null; A.renderModal(); };
  A.acts.frnNewPat = el => {
    const m = S.modal, pid = el.getAttribute('data-pid'), had = list(pid).filter(x => x.mes === m.mes)[0], f = had || newFicha(pid, m.mes);
    if (had) A.toast('Ya tenía la ficha de ' + mesTxt(m.mes) + ': te la abro.');
    loadCodes(); S.modal = { type: 'frnEd', pid, id: f.id, back: m.back }; A.renderModal();
  };
  A.acts.frnNewFree = () => {
    const m = S.modal, f = { id: A.uid(), mes: m.mes, pro: ((A.PROS || [])[0] || {}).id, pat: { last: '', first: '', dni: '' }, afil: '', addr: '', loc: '', tel: '', birth: '', os: '', rows: [], obs: '', sig: '', perio: false, estado: 'borrador', at: new Date().toISOString() };
    const me = A.actor && A.actor(); if (me && me.pro) f.pro = me.pro;
    freeGet().list.push(f); freeSave(); loadCodes(); S.modal = { type: 'frnEd', pid: null, id: f.id, back: m.back }; A.renderModal();
  };
  /* asignar una ficha sin paciente a un paciente: pasa a su historia clínica */
  A.acts.frnAsg = () => { const m = S.modal; S.modal = { type: 'frnAsg', id: m.id, q: ((cur() || {}).pat || {}).last || '', back: m.back }; A.renderModal(); setTimeout(() => { const i = $('#frnAQ'); if (i) i.focus(); }, 50); };
  MF.frnAsg = m => A.modalShell('Asignar la ficha a un paciente',
    '<label class="field"><span>Paciente</span><input class="inp" id="frnAQ" data-in="frnAQ" autocomplete="off" placeholder="Nombre, apellido o DNI" value="' + esc(m.q) + '"></label><div id="frnARes">' + patResults(m.q, 'frnAsgPick') + '</div>' +
    '<p class="hint">La ficha pasa a su historia clínica. Los datos que falten (obra social, afiliado, domicilio…) se toman de su ficha.</p>',
    '<button class="btn" data-act="frnAsgBack">Volver</button>');
  A.ins.frnAQ = el => { S.modal.q = el.value; clearTimeout(tq); tq = setTimeout(() => { const h = $('#frnARes'); if (h && S.modal && S.modal.type === 'frnAsg') h.innerHTML = patResults(S.modal.q, 'frnAsgPick'); }, 120); };
  A.acts.frnAsgBack = () => { const m = S.modal; S.modal = { type: 'frnEd', pid: null, id: m.id, back: m.back }; A.renderModal(); };
  A.acts.frnAsgPick = el => {
    const m = S.modal, pid = el.getAttribute('data-pid'), F = freeGet(), f = F.list.filter(x => x.id === m.id)[0], p = A.PAT(pid); if (!f || !p) return;
    F.list = F.list.filter(x => x !== f); freeSave();
    const fill = { afil: p.afil, addr: p.addr, loc: p.loc, tel: p.phone, birth: p.birth, os: isPart(p.cov) ? '' : p.cov }; Object.keys(fill).forEach(k => { if (!f[k] && fill[k]) f[k] = fill[k]; });
    delete f.pat; list(pid).push(f); A.touchPd(pid);
    if (A.alog) A.alog(pid, 'forn', 'Se le asignó la ficha FORN de ' + mesTxt(f.mes) + ' creada desde el apartado FORN.');
    A.toast('Ficha asignada a ' + p.name + '.'); S.modal = { type: 'frnEd', pid, id: f.id, back: m.back }; A.renderModal();
  };

  /* ---------- PDF (A4 apaisada, como la ficha de papel) ---------- */
  const LINE = [40, 40, 40], RED = [207, 51, 45], BLUE = [31, 95, 191], MUT = [90, 100, 105];
  const clean = s => String(s == null ? '' : s).replace(/[−–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...');
  function faceMarks(pid) {
    if (!pid) return {};
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
    const p = patOf(pid, f), pr = proOf(f.pro), W = 297;
    d.setTextColor(20, 20, 20); d.setDrawColor(...LINE);
    try { d.addImage(LOGO, 'JPEG', 9, 6, 60, 15.8, 'fornLogo', 'FAST'); } catch (e) { d.setFont('helvetica', 'bold'); d.setFontSize(11); d.text('FEDERACIÓN ODONTOLÓGICA DE RÍO NEGRO', 10, 13); }
    d.setFont('helvetica', 'normal'); d.setFontSize(7.3);
    ['Avenida Roca 1277 - 3er. Piso Oficina 302', 'Tel./Fax: (0298) 4420453 - Cel: 298 4138156', 'E-mail: fedodonto@odontorionegro.com.ar', '(8332) GENERAL ROCA - RÍO NEGRO'].forEach((l, i) => d.text(l, 73, 10.5 + i * 3.3));
    d.setFont('helvetica', 'bold'); d.setFontSize(30); d.text('FORN', 152, 24);
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
  function lastExam(pid) { if (!pid) return null; const P = (A.pd(pid) || {}).perio; const E = (P && P.exams) || []; return E.length ? E[E.length - 1] : null; }
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
    const m = S.modal, f = cur(); if (!f) return; const p = patOf(m.pid, f); const d = makeDoc(); if (!d) return;
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
  const EMB = 'data:image/png;base64,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';
  const MARCA = 'data:image/jpeg;base64,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';
  const IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/></svg>';
  function menu() {
    if ($('#drFornMes')) return;
    /* 1.22.2: en el menú principal, arriba de «Cambios de hoy · deshacer» (antes estaba dentro de Ajustes, plegado) */
    const nav = $('#gearMenu .dr-nav'); if (!nav) return;
    /* 1.22.3: el círculo del logo como ícono, el logotipo en lugar del título y «Presentación mensual» debajo */
    const html = '<button class="dnav frn-dnav" id="drFornMes" data-act="frnOpen" aria-label="FORN · Presentación mensual"><img class="frn-emb" src="' + EMB + '" alt="" width="72" height="72"><span class="t"><img class="frn-marca" src="' + MARCA + '" alt="FORN · Federación Odontológica de Río Negro" width="270" height="77"><small>Presentación mensual</small></span></button>', jr = $('#jrBtn');
    if (jr && jr.parentNode === nav) jr.insertAdjacentHTML('beforebegin', html); else nav.insertAdjacentHTML('beforeend', html);
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
    '.frn-row { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, .55fr) minmax(0, .55fr) minmax(0, 2.6fr) auto; gap: 6px; align-items: center; }',
    '.frn-codc { width: 100%; } select.frn-codc { text-overflow: ellipsis; } .frn-osp { margin-bottom: 2px; }',
    '.frn-row .inp { min-height: 40px; padding: 6px 8px; } .frn-desc { grid-column: 1 / -1; font-size: 12.5px; color: var(--ink-2); margin-top: -2px; }',
    '@media (max-width: 720px) { .frn-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; padding-bottom: 6px; border-bottom: 1px solid var(--line); } .frn-row input[type=date] { grid-column: 1 / 3; grid-row: 1; } .frn-row > button { grid-column: 3; grid-row: 1; } .frn-row .frn-codc { grid-column: 1 / -1; } }',
    '.frn-sigbox { position: relative; border: 1.5px dashed var(--line); border-radius: 12px; background: var(--surface); }',
    '.frn-sigbox canvas { display: block; width: 100%; height: auto; aspect-ratio: 600 / 180; touch-action: none; cursor: crosshair; }',
    '.frn-ph { position: absolute; inset: 0; display: grid; place-items: center; color: var(--ink-2); font-size: 14px; pointer-events: none; }',
    '.frn-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; } .frn-bar b { font-size: 17px; min-width: 130px; text-align: center; } .frn-pro { max-width: 260px; }',
    '.frn-list { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }',
    '.frn-it { width: 100%; display: flex; align-items: center; gap: 10px; justify-content: space-between; text-align: left; border: 1px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 12px; padding: 10px 12px; cursor: pointer; font: inherit; flex-wrap: wrap; }',
    '.frn-it:hover { border-color: var(--accent); } .frn-n { display: flex; flex-direction: column; min-width: 0; flex: 1 1 220px; } .frn-n .chip { align-self: flex-start; margin: 2px 0; } .frn-n small { color: var(--ink-2); font-size: 12.5px; overflow-wrap: anywhere; }',
    '.frn-st { display: flex; gap: 6px; flex-wrap: wrap; } .frn-empty { color: var(--ink-2); }',
    '.frn-or { display: flex; align-items: center; gap: 10px; color: var(--ink-2); margin: 12px 0 8px; } .frn-or::before, .frn-or::after { content: ""; flex: 1; height: 1px; background: var(--line); }',
    '.frn-free { border: 1px dashed var(--warn); border-radius: 12px; padding: 10px 12px; background: var(--warn-soft); }',
    '.m-head h2.frn-logoh { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }',
    '.frn-logoh img { display: block; height: 46px; width: auto; max-width: 100%; background: #fff; border-radius: 10px; padding: 6px 10px; box-shadow: 0 0 0 1px var(--line); }',
    '.frn-logoh span { font-size: 14px; font-weight: 600; color: var(--ink-2); letter-spacing: .02em; }',
    '@media (max-width: 480px) { .frn-logoh img { height: 38px; } }',
    '#drFornMes .frn-emb { width: 34px; height: 34px; flex: none; border-radius: 50%; }',
    '#drFornMes .t { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; min-width: 0; }',
    '#drFornMes .frn-marca { display: block; height: 36px; width: auto; max-width: 100%; background: #fff; border-radius: 6px; padding: 3px 6px; }',
    '#drFornMes .t small { font-size: 12.5px; color: var(--ink-2); font-weight: 600; }'
  ].join('\n');
  document.body.appendChild(css);
})();
