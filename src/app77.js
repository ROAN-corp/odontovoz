/* ===== 1.53: pasar historias clínicas de papel (fotos + lectura con IA + revisión por secciones) y descargar todas las historias clínicas como resguardo ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc, CL = A.cloud;
  const $ = q => document.querySelector(q);
  const N = s => (A.norm ? A.norm(s) : String(s || '').toLowerCase());
  const boss = () => (A.isBoss ? A.isBoss() : true);
  const me = () => (A.actor ? A.actor() : { uid: 'local', who: 'Este equipo' });
  const ownerKey = () => (A.ownerId && A.ownerId()) || 'local';
  const pause = () => new Promise(r => setTimeout(r, 0));
  if (A.IMG_KINDS) A.IMG_KINDS.hcpapel = 'Historia clínica en papel';

  /* =====================================================================
     1) PASAR HISTORIAS DE PAPEL
     Las fotos quedan en este equipo (IndexedDB) hasta que una persona revisa y confirma.
     ===================================================================== */
  const DBN = 'odontovoz.hcp'; let dbp = null;
  const db = () => dbp || (dbp = new Promise(res => { try { const r = indexedDB.open(DBN, 1); r.onupgradeneeded = () => r.result.createObjectStore('l'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } }));
  const store = (mode, fn) => db().then(d => d ? new Promise(res => { try { const tx = d.transaction('l', mode); const rq = fn(tx.objectStore('l')); tx.oncomplete = () => res(rq ? rq.result : true); tx.onerror = () => res(null); } catch (e) { res(null); } }) : null);
  let L = null;                                   /* lote de este dueño, en memoria */
  const mem = {};                                 /* si no hay IndexedDB (vista previa), queda en memoria */
  const loadL = async () => {
    if (L) return L; const k = ownerKey() + ':';
    const all = await store('readonly', st => st.getAll()), keys = await store('readonly', st => st.getAllKeys());
    L = []; if (all && keys) keys.forEach((key, i) => { if (String(key).indexOf(k) === 0) L.push(all[i]); }); else Object.keys(mem).forEach(key => { if (key.indexOf(k) === 0) L.push(mem[key]); });
    L.sort((a, b) => (a.at < b.at ? -1 : 1)); return L;
  };
  const putI = it => { mem[ownerKey() + ':' + it.id] = it; return store('readwrite', st => st.put(it, ownerKey() + ':' + it.id)); };
  const delI = id => { delete mem[ownerKey() + ':' + id]; L = (L || []).filter(x => x.id !== id); return store('readwrite', st => st.delete(ownerKey() + ':' + id)); };
  const byId = id => (L || []).filter(x => x.id === id)[0];
  A.hcpList = () => (L || []).slice();

  function shrink(src, max, q) {
    return new Promise((res, rej) => {
      const url = typeof src === 'string' ? src : URL.createObjectURL(src), im = new Image();
      im.onload = () => { try { const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); if (typeof src !== 'string') URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q)); } catch (e) { rej(e); } };
      im.onerror = () => { if (typeof src !== 'string') URL.revokeObjectURL(url); rej(new Error('img')); }; im.src = url;
    });
  }
  const filesToPages = async files => {
    const out = [];
    for (const f of files) {
      if (/pdf/i.test(f.type) || /\.pdf$/i.test(f.name)) { if (!A.pdfPages) continue; try { (await A.pdfPages(f)).forEach(p => out.push(p)); } catch (e) { A.toast('No se pudo abrir «' + f.name + '» (para leer PDF hace falta internet la primera vez).'); } }
      else if (/^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name)) out.push(f);
    }
    return out;
  };
  const addPages = async (it, files) => {
    for (const f of files) {
      if (it.imgs.length >= 8) { A.toast('Hasta 8 hojas por historia. Si tiene más, pasala en dos partes.'); break; }
      try { it.imgs.push(await shrink(f, 1800, 0.82)); it.th.push(await shrink(f, 220, 0.6)); } catch (e) { A.toast('No se pudo procesar una foto (usá JPG o PNG).'); }
    }
  };
  const newItem = pid => ({ id: A.uid(), at: new Date().toISOString(), by: me().who, uid: me().uid, imgs: [], th: [], st: 'armando', data: null, msg: '', pid: pid || null });

  /* ---------- lectura con IA, de a una, en segundo plano ---------- */
  let running = false;
  const emptyData = () => ({ paciente: {}, antecedentes: { marcados: [], medicacion: '', alergias: '', otros: '' }, odontograma: [], evoluciones: [{ fecha: '', texto: '' }], dudoso: [], varios: false, nota: '' });
  const cloudOk = () => !!(CL && CL.session && !A.DEMO);
  async function readOne(it) {
    const imgs = it.imgs.map(d => ({ type: 'image/jpeg', data: String(d).split(',')[1] || '' }));
    if (A._hcpMock) return A._hcpMock(imgs, it);
    if (!cloudOk()) return { ok: false, manual: true, msg: A.DEMO ? 'En el modo prueba no se lee con IA: cargala a mano mirando la foto.' : 'Para leer con IA hay que entrar con tu cuenta. Mientras, cargala a mano mirando la foto.' };
    try { return await CL.api('/functions/v1/hc-read', { method: 'POST', body: { images: imgs, hint: it.pid ? (A.PAT(it.pid) || {}).name : '' } }); }
    catch (e) { const d = (e && e.data) || {}; if (e && e.status === 503) return { ok: false, manual: true, off: true, msg: d.msg || 'La lectura automática todavía no está encendida.' }; return { ok: false, msg: d.msg || (navigator.onLine === false ? 'Sin internet: se lee cuando vuelva la conexión.' : 'No se pudo leer ahora. Tocá «Reintentar».'), retry: navigator.onLine === false }; }
  }
  A.hcpRun = async () => {
    if (running) return; running = true;
    try {
      await loadL();
      for (;;) {
        const it = L.filter(x => x.st === 'cola')[0]; if (!it) break;
        it.st = 'leyendo'; paint();
        const r = await readOne(it);
        if (r && r.ok && r.data) { it.data = r.data; it.st = 'leido'; it.src = 'ia'; it.msg = ''; }
        else if (r && r.manual) { it.data = it.data || emptyData(); it.st = 'manual'; it.msg = r.msg || ''; if (r.off) S._hcpOff = 1; }
        else { it.st = r && r.retry ? 'cola' : 'error'; it.msg = (r && r.msg) || 'No se pudo leer.'; if (r && r.retry) { await putI(it); paint(); break; } }
        await putI(it); paint();
        if (it.st === 'leido' && A.nfAdd) A.nfAdd({ id: 'hcp:' + it.id, k: 'info', t: 'Historia leída: ' + nameOf(it), b: 'Revisala y confirmala en «Pasar historias de papel».', act: 'hcpOpen' });
      }
    } finally { running = false; }
  };
  window.addEventListener('online', () => { if (L && L.some(x => x.st === 'cola')) A.hcpRun(); });

  const nameOf = it => { const p = (it.data && it.data.paciente) || {}, t = [p.last, p.first].filter(Boolean).join(', '); return t || (it.pid && (A.PAT(it.pid) || {}).name) || 'Historia sin leer'; };
  const ST = { armando: ['Armando', 'mut'], cola: ['En espera', 'mut'], leyendo: ['Leyendo…', 'mut'], leido: ['Para revisar', 'ok'], manual: ['Cargar a mano', 'warn'], error: ['No se pudo leer', 'bad'] };

  /* ---------- pantalla principal ---------- */
  const paint = () => { if (S.modal && S.modal.type === 'hcp') A.renderModal(); };
  A.acts.hcpOpen = async el => {
    if (A.hideDrawer) A.hideDrawer(); await loadL();
    const pid = el && el.getAttribute && el.getAttribute('data-pid');
    S.modal = { type: 'hcp', pid: pid || null }; A.renderModal();
    if (L.some(x => x.st === 'cola')) A.hcpRun();
  };
  MF.hcp = m => {
    const lote = (L || []).filter(x => x.st !== 'armando'), cur = (L || []).filter(x => x.st === 'armando')[0], target = m.pid && A.PAT(m.pid);
    const cam = (lbl, cls) => '<label class="btn ' + (cls || '') + ' filebtn">' + lbl + '<input type="file" accept="image/*" capture="environment" hidden data-chg="hcpCam"></label>';
    let b = '';
    if (!lote.length && !cur) b += '<p class="m-lead">Sacale fotos a cada historia clínica en papel (frente, dorso y hojas de evolución). OdontoVoz lee lo que dice y arma la ficha: después alguien revisa sección por sección, corrige lo que esté mal y confirma. Las fotos quedan guardadas en la ficha como respaldo.</p>';
    if (target) b += '<div class="hp-target">Para la ficha de <b>' + esc(target.name) + '</b>' + (target.dni ? ' · DNI ' + esc(target.dni) : '') + '</div>';
    if (cur) {
      b += '<section class="hp-cur"><h3>Historia en curso · ' + cur.imgs.length + ' hoja' + (cur.imgs.length === 1 ? '' : 's') + '</h3><div class="hp-ths">' + cur.th.map((t, i) => '<span class="hp-th"><img alt="Hoja ' + (i + 1) + '" src="' + esc(t) + '"><button class="x" data-act="hcpDropPg" data-i="' + i + '" aria-label="Quitar hoja ' + (i + 1) + '">×</button></span>').join('') + '</div>' +
        '<div class="row-btns">' + cam('+ Otra hoja de este paciente', '') + '<label class="btn filebtn">Subir archivo<input type="file" accept="image/*,application/pdf" multiple hidden data-chg="hcpFiles"></label><button class="btn ghost" data-act="hcpCancel">Descartar</button><button class="btn primary" data-act="hcpDone"' + (cur.imgs.length ? '' : ' disabled') + '>Listo: leer esta historia →</button></div></section>';
    } else {
      b += '<div class="hp-start">' + cam('📷 Sacar fotos de una historia', 'primary big') + '<label class="btn big filebtn">Subir fotos o PDF escaneado<input type="file" accept="image/*,application/pdf" multiple hidden data-chg="hcpFiles"></label></div>' +
        '<label class="chk hp-each"><input type="checkbox" id="hpEach"' + (S._hpEach ? ' checked' : '') + ' data-chg="hcpEach"> Al subir archivos: cada archivo es de un paciente distinto</label>';
    }
    if (S._hcpOff) b += '<div class="hint">La lectura automática con IA todavía no está encendida en esta cuenta. Igual podés pasar las historias: la foto queda al lado y la cargás a mano (también por voz).</div>';
    if (lote.length) {
      const n = k => lote.filter(x => x.st === k).length;
      b += '<h3 class="hp-h">Historias pasadas por foto <span class="count">' + lote.length + '</span></h3><div class="hp-sum">' + (n('leido') ? '<span class="chip ok">' + n('leido') + ' para revisar</span>' : '') + (n('leyendo') + n('cola') ? '<span class="chip">' + (n('leyendo') + n('cola')) + ' leyéndose</span>' : '') + (n('manual') ? '<span class="chip warn">' + n('manual') + ' a mano</span>' : '') + (n('error') ? '<span class="chip bad">' + n('error') + ' con error</span>' : '') + '</div>' +
        '<div class="hp-list">' + lote.map(it => { const s = ST[it.st] || ST.cola; return '<div class="hp-row"><img alt="" src="' + esc(it.th[0] || '') + '"><div class="hp-rt"><b>' + esc(nameOf(it)) + '</b><span>' + it.imgs.length + ' hoja' + (it.imgs.length === 1 ? '' : 's') + ' · <span class="chip ' + s[1] + '">' + s[0] + '</span>' + (it.msg && it.st !== 'leido' ? ' · ' + esc(it.msg) : '') + '</span></div><div class="row-btns">' +
          (it.st === 'leido' || it.st === 'manual' ? '<button class="btn small primary" data-act="hcpRev" data-id="' + it.id + '">Revisar</button>' : '') +
          (it.st === 'error' ? '<button class="btn small" data-act="hcpRetry" data-id="' + it.id + '">Reintentar</button><button class="btn small" data-act="hcpManual" data-id="' + it.id + '">A mano</button>' : '') +
          (it.st !== 'leyendo' ? '<button class="btn small ghost" data-act="hcpDelAsk" data-id="' + it.id + '" aria-label="Quitar">Quitar</button>' : '') + '</div></div>'; }).join('') + '</div>';
    }
    b += '<div class="small-note">Las fotos quedan en este equipo hasta que se confirman; al confirmar pasan a la ficha (y a la nube). Guardá igual las historias en papel: la ley pide conservarlas 10 años desde la última atención.</div>';
    return A.modalShell('Pasar historias de papel', b, '<button class="btn" data-act="closeModal">Cerrar</button>', true);
  };
  A.chg.hcpEach = el => { S._hpEach = el.checked; };
  const curItem = async () => { await loadL(); let c = L.filter(x => x.st === 'armando')[0]; if (!c) { c = newItem(S.modal && S.modal.pid); L.push(c); } return c; };
  A.chg.hcpCam = async el => {
    const f = Array.prototype.slice.call(el.files || []); el.value = ''; if (!f.length) return;
    const c = await curItem(); await addPages(c, f); await putI(c); paint();
  };
  A.chg.hcpFiles = async el => {
    const files = Array.prototype.slice.call(el.files || []); el.value = ''; if (!files.length) return;
    await loadL();
    if (S._hpEach && !L.some(x => x.st === 'armando')) {
      A.toast('Procesando ' + files.length + ' archivo(s)…');
      for (const f of files) { const it = newItem(S.modal && S.modal.pid); await addPages(it, await filesToPages([f])); if (it.imgs.length) { it.st = 'cola'; L.push(it); await putI(it); } }
      paint(); A.hcpRun(); return;
    }
    const c = await curItem(); await addPages(c, await filesToPages(files)); await putI(c); paint();
  };
  A.acts.hcpDropPg = async el => { const c = (L || []).filter(x => x.st === 'armando')[0]; if (!c) return; const i = +el.getAttribute('data-i'); c.imgs.splice(i, 1); c.th.splice(i, 1); await putI(c); paint(); };
  A.acts.hcpCancel = async () => { const c = (L || []).filter(x => x.st === 'armando')[0]; if (c) await delI(c.id); paint(); };
  A.acts.hcpDone = async () => { const c = (L || []).filter(x => x.st === 'armando')[0]; if (!c || !c.imgs.length) return; c.st = 'cola'; await putI(c); paint(); A.hcpRun(); A.toast('Leyendo la historia… Mientras, podés sacarle fotos a la siguiente.'); };
  A.acts.hcpRetry = async el => { const it = byId(el.getAttribute('data-id')); if (!it) return; it.st = 'cola'; it.msg = ''; await putI(it); paint(); A.hcpRun(); };
  A.acts.hcpManual = async el => { const it = byId(el.getAttribute('data-id')); if (!it) return; it.st = 'manual'; it.data = it.data || emptyData(); it.src = 'manual'; await putI(it); A.acts.hcpRev(el); };
  A.acts.hcpDelAsk = el => { S.modal = { type: 'hcpDel', id: el.getAttribute('data-id'), back: S.modal }; A.renderModal(); };
  MF.hcpDel = m => { const it = byId(m.id); return A.modalShell('Quitar esta historia', '<p>Se borran las fotos de <b>' + esc(it ? nameOf(it) : '') + '</b> de este equipo. La historia en papel no se toca. ¿Seguro?</p>', '<button class="btn" data-act="hcpBack">No</button><button class="btn danger" data-act="hcpDel" data-id="' + esc(m.id) + '">Sí, quitar</button>'); };
  A.acts.hcpDel = async el => { await delI(el.getAttribute('data-id')); S.modal = { type: 'hcp', pid: (S.modal.back || {}).pid || null }; A.renderModal(); };
  A.acts.hcpBack = () => { S.modal = S.modal.back || { type: 'hcp' }; A.renderModal(); };

  /* ---------- revisión por secciones ---------- */
  const PF = [['last', 'Apellido'], ['first', 'Nombre'], ['dni', 'DNI', 'numeric'], ['birth', 'Fecha de nacimiento', 'date'], ['phone', 'Teléfono'], ['email', 'Email'], ['addr', 'Domicilio'], ['loc', 'Localidad'], ['cov', 'Obra social'], ['afil', 'N.º de afiliado'], ['plan', 'Plan']];
  const doubt = (it, k) => ((it.data && it.data.dudoso) || []).some(d => N(d).replace(/^paciente\./, '') === k) ? ' hp-dbt' : '';
  const qmark = s => /\[\?\]/.test(String(s || ''));
  const matches = d => {
    const p = d.paciente || {}, dni = String(p.dni || '').replace(/\D/g, ''), nm = N((p.first || '') + ' ' + (p.last || '')).trim();
    const all = (A.PATS || []).concat((S.newPats || []).filter(x => x && x.arch && !x.deleted));
    return all.filter(x => x && !x.deleted && ((dni.length >= 7 && String(x.dni || '').replace(/\D/g, '') === dni) || (nm.length > 4 && N(x.name || (x.first + ' ' + x.last)) === nm))).slice(0, 4);
  };
  A.acts.hcpRev = async el => { await loadL(); const it = byId(el.getAttribute('data-id')); if (!it) return; it.data = it.data || emptyData(); S.modal = { type: 'hcpRev', id: it.id, pg: 0, back: { type: 'hcp', pid: (S.modal || {}).pid || null } }; A.renderModal(); };
  MF.hcpRev = m => {
    const it = byId(m.id); if (!it) return A.modalShell('Revisar', '<p>Esta historia ya no está.</p>', '<button class="btn" data-act="hcpBack">Volver</button>');
    const d = it.data, p = d.paciente = d.paciente || {}, a = d.antecedentes = d.antecedentes || { marcados: [] }; a.marcados = a.marcados || [];
    d.odontograma = d.odontograma || []; d.evoluciones = d.evoluciones || [];
    const pg = Math.min(m.pg || 0, it.imgs.length - 1);
    const fixed = it.pid && A.PAT(it.pid), cand = fixed ? [] : matches(d);
    if (m.to == null) m.to = fixed ? it.pid : (cand.length && String(p.dni || '').replace(/\D/g, '').length >= 7 && cand[0].dni ? cand[0].id : '');
    const fld = f => '<div class="field' + doubt(it, f[0]) + (qmark(p[f[0]]) ? ' hp-q' : '') + '"><label for="hp_' + f[0] + '">' + f[1] + '</label><input id="hp_' + f[0] + '" data-in="hpP" data-k="' + f[0] + '"' + (f[2] === 'date' ? ' type="date"' : f[2] === 'numeric' ? ' inputmode="numeric"' : '') + ' value="' + esc(p[f[0]] || '') + '"></div>';
    const pics = '<div class="hp-pics"><div class="hp-big' + (m.zoom ? ' zoom' : '') + '"><img alt="Hoja ' + (pg + 1) + '" src="' + esc(it.imgs[pg] || '') + '" data-act="hpZoom"></div>' + (it.imgs.length > 1 ? '<div class="hp-ths">' + it.th.map((t, i) => '<button class="hp-th' + (i === pg ? ' on' : '') + '" data-act="hpPg" data-i="' + i + '" aria-label="Ver hoja ' + (i + 1) + '"><img alt="" src="' + esc(t) + '"></button>').join('') + '</div>' : '') + '<div class="small-note">Tocá la hoja para agrandarla.</div></div>';
    let f = '';
    if (d.varios) f += '<div class="hint bad">Ojo: parece que estas hojas son de más de un paciente. Revisalas antes de confirmar.</div>';
    if (d.nota) f += '<div class="hint">' + esc(d.nota) + '</div>';
    if (it.src === 'ia' || it.st === 'leido') f += '<div class="hp-legend"><span class="hp-sw dbt"></span> leído con dudas · <span class="hp-sw q"></span> tiene partes ilegibles <code>[?]</code></div>';
    f += '<section class="hp-sec"><h3>1. Datos del paciente</h3>';
    if (fixed) f += '<div class="hp-target">Se agrega a la ficha de <b>' + esc(fixed.name) + '</b>. Solo se completan los datos que estén vacíos.</div>';
    else if (cand.length) f += '<div class="hp-match"><b>Ya hay un paciente parecido:</b>' + cand.map(c => '<label class="chk"><input type="radio" name="hpTo" data-chg="hpTo" value="' + esc(c.id) + '"' + (m.to === c.id ? ' checked' : '') + '> Agregar a la ficha de <b>' + esc(c.name || c.first + ' ' + c.last) + '</b>' + (c.dni ? ' · DNI ' + esc(c.dni) : '') + (c.arch ? ' (archivado)' : '') + '</label>').join('') + '<label class="chk"><input type="radio" name="hpTo" data-chg="hpTo" value=""' + (!m.to ? ' checked' : '') + '> Es otro: crear paciente nuevo</label></div>';
    f += '<div class="row2">' + fld(PF[0]) + fld(PF[1]) + '</div><div class="row2">' + fld(PF[2]) + fld(PF[3]) + '</div><div class="row2">' + fld(PF[4]) + fld(PF[5]) + '</div><div class="row2">' + fld(PF[6]) + fld(PF[7]) + '</div><div class="row3">' + fld(PF[8]) + fld(PF[9]) + fld(PF[10]) + '</div></section>';
    f += '<section class="hp-sec"><h3>2. Antecedentes médicos</h3><div class="hp-anam">' + (A.ANAM || []).map(x => '<label class="chk"><input type="checkbox" data-chg="hpAn" value="' + x[0] + '"' + (a.marcados.indexOf(x[0]) >= 0 ? ' checked' : '') + '> ' + esc(x[1]) + '</label>').join('') + '</div>' +
      '<div class="field' + (qmark(a.medicacion) ? ' hp-q' : '') + '"><label for="hp_med">Medicación</label><textarea id="hp_med" rows="2" data-in="hpA" data-k="medicacion">' + esc(a.medicacion || '') + '</textarea></div>' +
      '<div class="field' + (qmark(a.alergias) ? ' hp-q' : '') + '"><label for="hp_ale">Alergias</label><input id="hp_ale" data-in="hpA" data-k="alergias" value="' + esc(a.alergias || '') + '"></div>' +
      '<div class="field' + (qmark(a.otros) ? ' hp-q' : '') + '"><label for="hp_otr">Otros antecedentes y observaciones</label><textarea id="hp_otr" rows="3" data-in="hpA" data-k="otros">' + esc(a.otros || '') + '</textarea></div></section>';
    f += '<section class="hp-sec"><h3>3. Odontograma de la hoja <span class="count">' + d.odontograma.length + '</span></h3><p class="hint" style="margin-top:0">Una línea por pieza, por ejemplo «obturación oclusal 16» o «extracción 36». Al confirmar se dibuja en el odontograma (rojo = realizado, azul = a realizar).</p>' +
      d.odontograma.map((o, i) => '<div class="hp-od' + (qmark(o.texto) || doubt(it, 'odon.' + (i + 1)) ? ' hp-q' : '') + '"><input aria-label="Marca ' + (i + 1) + '" data-in="hpO" data-i="' + i + '" value="' + esc(o.texto || '') + '"><select aria-label="Estado" data-chg="hpOs" data-i="' + i + '"><option value="realizado"' + (o.estado !== 'a realizar' ? ' selected' : '') + '>Realizado</option><option value="a realizar"' + (o.estado === 'a realizar' ? ' selected' : '') + '>A realizar</option></select><button class="x" data-act="hpODel" data-i="' + i + '" aria-label="Quitar">×</button></div>').join('') +
      '<button class="btn small" data-act="hpOAdd">+ Agregar marca</button></section>';
    f += '<section class="hp-sec"><h3>4. Evoluciones <span class="count">' + d.evoluciones.length + '</span></h3>' +
      d.evoluciones.map((e, i) => '<div class="hp-ev' + (qmark(e.texto) || doubt(it, 'evol.' + (i + 1)) ? ' hp-q' : '') + (!e.fecha ? ' hp-nod' : '') + '"><div class="hp-evh"><input type="date" aria-label="Fecha de la evolución ' + (i + 1) + '" data-in="hpEd" data-i="' + i + '" value="' + esc(e.fecha || '') + '">' + (e.firma ? '<span class="muted">' + esc(e.firma) + '</span>' : '') + '<button class="x" data-act="hpEDel" data-i="' + i + '" aria-label="Quitar evolución ' + (i + 1) + '">×</button></div><textarea rows="3" aria-label="Texto de la evolución ' + (i + 1) + '" data-in="hpEt" data-i="' + i + '">' + esc(e.texto || '') + '</textarea></div>').join('') +
      '<button class="btn small" data-act="hpEAdd">+ Agregar evolución</button><div class="small-note">Sin fecha: queda con la fecha de la evolución anterior y la marca «sin fecha legible».</div></section>';
    f += '<div id="hpMsg" class="m-msg"></div>';
    const b = '<div class="hp-rev">' + pics + '<div class="hp-form">' + f + '</div></div>';
    return A.modalShell('Revisar · ' + nameOf(it), b, '<button class="btn" data-act="hpSaveLater">Seguir después</button><button class="btn primary" data-act="hpGo">Confirmar y guardar</button>', true);
  };
  const curRev = () => { const m = S.modal; return m && m.type === 'hcpRev' ? byId(m.id) : null; };
  const keepScroll = fn => { const b = $('#modalHost .m-body'), y = b ? b.scrollTop : 0; fn(); A.renderModal(); const b2 = $('#modalHost .m-body'); if (b2) b2.scrollTop = y; };
  A.ins.hpP = el => { const it = curRev(); if (it) it.data.paciente[el.getAttribute('data-k')] = el.value; };
  A.ins.hpA = el => { const it = curRev(); if (it) it.data.antecedentes[el.getAttribute('data-k')] = el.value; };
  A.ins.hpO = el => { const it = curRev(); if (it) it.data.odontograma[+el.getAttribute('data-i')].texto = el.value; };
  A.ins.hpEd = el => { const it = curRev(); if (it) it.data.evoluciones[+el.getAttribute('data-i')].fecha = el.value; };
  A.ins.hpEt = el => { const it = curRev(); if (it) it.data.evoluciones[+el.getAttribute('data-i')].texto = el.value; };
  A.chg.hpEd = A.ins.hpEd;
  A.chg.hpOs = el => { const it = curRev(); if (it) it.data.odontograma[+el.getAttribute('data-i')].estado = el.value; };
  A.chg.hpAn = el => { const it = curRev(); if (!it) return; const l = it.data.antecedentes.marcados, k = el.value, i = l.indexOf(k); if (el.checked && i < 0) l.push(k); if (!el.checked && i >= 0) l.splice(i, 1); };
  A.chg.hpTo = el => { S.modal.to = el.value; };
  A.acts.hpPg = el => { S.modal.pg = +el.getAttribute('data-i'); keepScroll(() => {}); };
  A.acts.hpZoom = () => { S.modal.zoom = !S.modal.zoom; keepScroll(() => {}); };
  A.acts.hpOAdd = () => { const it = curRev(); if (it) keepScroll(() => it.data.odontograma.push({ texto: '', estado: 'realizado' })); };
  A.acts.hpODel = el => { const it = curRev(); if (it) keepScroll(() => it.data.odontograma.splice(+el.getAttribute('data-i'), 1)); };
  A.acts.hpEAdd = () => { const it = curRev(); if (it) keepScroll(() => it.data.evoluciones.push({ fecha: '', texto: '' })); };
  A.acts.hpEDel = el => { const it = curRev(); if (it) keepScroll(() => it.data.evoluciones.splice(+el.getAttribute('data-i'), 1)); };
  A.acts.hpSaveLater = async () => { const it = curRev(); if (it) await putI(it); S.modal = S.modal.back || { type: 'hcp' }; A.renderModal(); A.toast('Guardado. La podés seguir revisando cuando quieras.'); };

  /* ---------- confirmar: pasa todo a la ficha ---------- */
  const T = s => String(s || '').trim();
  const cap = s => T(s).toLowerCase().replace(/(^|[\s'-])([a-zñáéíóúü])/g, (x, a, b) => a + b.toUpperCase());
  A.hcpSave = async (it, to) => {
    const d = it.data, p = d.paciente || {}, an = d.antecedentes || {}, who = me(), today = A.today();
    let pid = to || it.pid || null, created = false;
    if (pid && !A.PAT(pid)) pid = null;
    if (!pid) {
      const np = A.addPatient({ first: cap(p.first) || '-', last: cap(p.last) || '-', dni: String(p.dni || '').replace(/\D/g, ''), cov: T(p.cov) || 'Particular', phone: T(p.phone), email: T(p.email), age: 0 });
      pid = np.id; created = true;
    }
    const pat = A.PAT(pid), pd = A.pd(pid);
    /* datos: en una ficha existente solo se completa lo vacío */
    const prof = {};
    ['dni', 'birth', 'phone', 'email', 'addr', 'loc', 'cov', 'afil', 'plan'].forEach(k => { const v = k === 'dni' ? String(p[k] || '').replace(/\D/g, '') : T(p[k]); if (!v || /\[\?\]/.test(v)) return; const cur = pat[k]; if (created || !cur || (k === 'cov' && cur === 'Particular')) prof[k] = v; });
    if (created) { if (T(p.first)) prof.first = cap(p.first); if (T(p.last)) prof.last = cap(p.last); }
    if (Object.keys(prof).length && A.setProfile) A.setProfile(pid, prof);
    /* antecedentes */
    pd.hc = pd.hc || { conds: {} }; pd.hc.conds = pd.hc.conds || {};
    (an.marcados || []).forEach(k => { pd.hc.conds[k] = true; });
    const add = (old, v) => (v ? (old ? old + '\n' : '') + v + (created ? '' : ' (de la historia en papel)') : old);
    if (T(an.medicacion)) pd.hc.meds = add(pd.hc.meds, T(an.medicacion));
    const ant = [T(an.alergias) ? 'Alergias: ' + T(an.alergias) : '', T(an.otros)].filter(Boolean).join('. ');
    if (ant) pd.hc.ant = add(pd.hc.ant, ant);
    /* evoluciones (de la más vieja a la más nueva) */
    pd.notes = pd.notes || [];
    let last = '', nE = 0; const pro = pat.pro || (A.PROS && A.PROS[0] && A.PROS[0].id);
    const evs = (d.evoluciones || []).filter(e => T(e.texto));
    evs.forEach(e => {
      const dt = /^\d{4}-\d{2}-\d{2}$/.test(e.fecha || '') ? e.fecha : '', date = dt || last || today; if (dt) last = dt;
      pd.notes.push({ id: A.uid(), date, pro, text: '[Historia en papel] ' + (dt ? '' : '(sin fecha legible) ') + T(e.texto) + (T(e.firma) ? ' — ' + T(e.firma) : ''), imp: true, paper: 1, uid: who.uid, who: who.who }); nE++;
    });
    const od = (d.odontograma || []).filter(o => T(o.texto));
    if (od.length) {
      /* el odontograma de la hoja ya lo revisó una persona: se aplica completo (con la fecha de hoy, que es cuando se pasó) */
      pd.notes.push({ id: A.uid(), date: today, pro, text: '[Historia en papel · odontograma] ' + od.map(o => (o.estado === 'a realizar' ? 'hay que hacer ' : '') + T(o.texto)).join('. '), imp: true, paper: 1, uid: who.uid, who: who.who });
    }
    pd.notes.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    /* fotos de las hojas: quedan como imágenes de la ficha */
    for (let i = 0; i < it.imgs.length; i++) { try { await A.imgAdd(pid, { kind: 'hcpapel', date: today, note: 'Historia clínica en papel · hoja ' + (i + 1) + ' de ' + it.imgs.length }, it.imgs[i], it.th[i] || it.imgs[i]); } catch (e) { /* sigue con las demás */ } }
    (pd.paperHC = pd.paperHC || []).push({ at: new Date().toISOString(), by: who.who, uid: who.uid, pages: it.imgs.length, evol: nE, odon: od.length, src: it.src === 'ia' ? 'ia' : 'manual', photoBy: it.by });
    if (A.alog) A.alog(pid, 'papel', 'Pasó la historia clínica en papel (' + it.imgs.length + ' hoja' + (it.imgs.length === 1 ? '' : 's') + ', ' + nE + ' evoluciones' + (od.length ? ', ' + od.length + ' marcas de odontograma' : '') + (it.src === 'ia' ? ', leída con IA y revisada' : ', cargada a mano') + ')');
    let marks = 0; try { if (A.evoApply) marks = A.evoApply(pid).marks || 0; } catch (e) { /* el odontograma se puede pasar después desde el aviso de la ficha */ }
    A.touchPd(pid); if (A.save) A.save();
    await delI(it.id);
    return { pid, created, notes: nE, marks };
  };
  A.acts.hpGo = async () => {
    const m = S.modal, it = curRev(); if (!it) return; const p = it.data.paciente || {}, msg = $('#hpMsg');
    const to = it.pid || m.to || '';
    if (!to && !T(p.last) && !T(p.first)) { if (msg) msg.textContent = 'Falta el nombre o el apellido del paciente.'; return; }
    if (/\?/.test(String(p.dni || ''))) { if (msg) msg.textContent = 'Revisá el DNI: tiene números que no se leyeron. Si no se puede leer, borralo y completalo cuando venga el paciente.'; return; }
    const all = JSON.stringify(it.data), q = (all.match(/\[\?\]/g) || []).length;
    if (q && !m._qok) { m._qok = 1; if (msg) msg.innerHTML = 'Quedan <b>' + q + '</b> partes marcadas <code>[?]</code> (no se pudieron leer). Si tampoco las entendés vos, dejalas así: la foto queda guardada en la ficha. Tocá <b>Confirmar</b> de nuevo para guardar.'; return; }
    const btn = $('#modalHost [data-act=hpGo]'); if (btn) btn.disabled = true;
    const r = await A.hcpSave(it, to);
    S.modal = Object.assign({ type: 'hcp' }, { pid: (m.back || {}).pid || null }); A.renderModal(); A.refresh();
    A.toast((A.PAT(r.pid) || {}).name + (r.created ? ' quedó cargado' : ': historia agregada') + ' con ' + r.notes + ' evoluciones' + (r.marks ? ' y ' + r.marks + ' marcas en el odontograma' : '') + '.');
  };

  /* desde la ficha del paciente (pestaña Imágenes): sacar foto de su historia en papel */
  const imgPrev = A.render.imgTab;
  if (imgPrev) A.render.imgTab = pid => '<section class="card hp-card"><div><b>¿Tiene historia clínica en papel?</b><span>Sacale fotos y OdontoVoz la pasa a su ficha (vos revisás y confirmás).</span></div><button class="btn" data-act="hcpOpen" data-pid="' + esc(pid) + '">Pasar historia de papel</button></section>' + imgPrev(pid);

  /* =====================================================================
     2) DESCARGAR TODAS LAS HISTORIAS CLÍNICAS (resguardo)
     Un PDF por paciente en un ZIP, con índice, constancia y códigos de verificación (SHA-256).
     El registro de cada descarga se guarda en la nube (clave «hcexp»).
     ===================================================================== */
  let EXP = null; const LSK = () => 'odontovoz.hcexp.' + ownerKey();
  const expGet = () => { if (EXP) return EXP; try { EXP = JSON.parse(localStorage.getItem(LSK()) || 'null'); } catch (e) { EXP = null; } return EXP || (EXP = { list: [] }); };
  const expSet = v => { EXP = v && Array.isArray(v.list) ? v : { list: [] }; try { localStorage.setItem(LSK(), JSON.stringify(EXP)); } catch (e) { /* lleno */ } };
  const prevExtra = A.cloudExtra, prevKeys = A.cloudExtraKeys;
  A.cloudExtra = k => (k === 'hcexp' ? { get: () => (expGet().list.length ? expGet() : null), set: v => expSet(v) } : (prevExtra ? prevExtra(k) : null));
  A.cloudExtraKeys = () => ['hcexp'].concat(prevKeys ? prevKeys() : []);

  const JSZIP = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  let zl = null;
  const loadZip = () => zl || (zl = new Promise((res, rej) => { if (window.JSZip) { res(window.JSZip); return; } const s = document.createElement('script'); s.src = JSZIP; s.onload = () => res(window.JSZip); s.onerror = () => { zl = null; rej(new Error('zip')); }; document.head.appendChild(s); }));
  const sha = async blob => { try { const h = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()); return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join(''); } catch (e) { return ''; } };
  const slug = s => N(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'x';
  const codeOf = h => (h || '').slice(0, 12).toUpperCase().replace(/(.{4})(?=.)/g, '$1-');

  const patsFor = o => {
    const seen = {}, out = [];
    (A.PATS || []).concat(o.arch ? (S.newPats || []).filter(p => p && p.arch) : []).forEach(p => {
      if (!p || seen[p.id] || p.deleted || p.test) return; seen[p.id] = 1;
      const pd = A.pd(p.id); if (!pd) return;
      const ds = (pd.notes || []).map(n => n.date).concat((pd.tx || []).filter(t => t.status === 'hecho').map(t => t.doneDate || t.planDate)).filter(Boolean);
      if (p.prov && !ds.length) return;
      if (o.mode === 'periodo' && !ds.some(x => (!o.from || x >= o.from) && x <= o.to)) return;
      out.push(p);
    });
    return out.sort((a, b) => N(a.last + ' ' + a.first) < N(b.last + ' ' + b.first) ? -1 : 1);
  };
  /* arma el PDF de un paciente con lo registrado hasta la fecha elegida (usa el PDF de historia clínica de siempre) */
  function pdfOf(p, o) {
    const pd = A.pd(p.id), keep = {}, inR = x => !!x && (!o.from || x >= o.from) && x <= o.to;
    const F = { notes: n => inR(n.date), tx: t => t.status !== 'hecho' ? (!t.planDate || t.planDate <= o.to) : inR(t.doneDate || t.planDate), rx: r => inR(r.date), images: i => inR(i.date), docs: d => inR(String(d.sealedAt || '').slice(0, 10)) };
    Object.keys(F).forEach(k => { keep[k] = pd[k]; pd[k] = (pd[k] || []).filter(F[k]); });
    const sv = A.saveFile, hadIdx = A.PIDX && A.PIDX[p.id]; let got = null;
    if (A.PIDX && !hadIdx) A.PIDX[p.id] = p;
    A.saveFile = (name, blob) => { got = { name, blob }; return Promise.resolve(true); };
    try { A.acts.pdfHC({ getAttribute: k => (k === 'data-pid' ? p.id : null) }); }
    finally { A.saveFile = sv; Object.keys(keep).forEach(k => { pd[k] = keep[k]; }); if (A.PIDX && !hadIdx) delete A.PIDX[p.id]; }
    return got;
  }
  A.hcxPdf = pdfOf;

  A.acts.hcxOpen = () => {
    if (A.hideDrawer) A.hideDrawer();
    if (!boss()) { A.toast('La descarga de todas las historias clínicas la hace el dueño o un administrador.'); return; }
    S.modal = { type: 'hcx', o: { from: '', to: A.today(), mode: 'todos', arch: true, paper: true, imgs: false } }; A.renderModal();
  };
  MF.hcx = m => {
    const o = m.o;
    if (m.run) return A.modalShell('Descargando historias clínicas', '<div class="hx-prog"><div class="hx-bar"><span style="width:' + Math.round(100 * (m.run.i / Math.max(1, m.run.n))) + '%"></span></div><p id="hxTxt">' + esc(m.run.txt || 'Preparando…') + '</p><p class="small-note">No cierres la app hasta que termine. Con muchas historias puede tardar unos minutos.</p></div>', '<button class="btn" data-act="hcxStop">Cancelar</button>');
    if (m.done) {
      const r = m.done;
      return A.modalShell('Historias clínicas descargadas', '<p><b>' + r.n + ' historias clínicas</b> en ' + r.parts + ' archivo' + (r.parts > 1 ? 's' : '') + ' ZIP' + (r.photos ? ', con ' + r.photos + ' fotos' : '') + '.</p>' +
        '<div class="hx-code">Código de la constancia<br><b>' + esc(codeOf(r.code)) + '</b></div><ul class="pd-list"><li>Cada ZIP trae un PDF por paciente, el índice (<code>indice.csv</code>) y la <b>constancia</b> con el código de verificación de cada archivo.</li><li>Guardalo en dos lugares: por ejemplo un pendrive o disco y tu Drive.</li><li>Si alguna vez tenés que probar que un PDF no se tocó, usá «Comprobar un archivo»: OdontoVoz lo compara con el registro que quedó guardado en la nube el ' + esc(A.fmtDMY(r.at.slice(0, 10))) + '.</li></ul>' + (r.miss ? '<div class="hint bad">' + r.miss + ' foto(s) no estaban en este equipo y no se incluyeron.</div>' : ''),
        '<button class="btn" data-act="hcxCheck">Comprobar un archivo</button><button class="btn primary" data-act="closeModal">Listo</button>');
    }
    if (m.chk) return A.modalShell('Comprobar un archivo', '<p class="m-lead">Elegí un PDF o un ZIP descargado desde OdontoVoz. Se calcula su código (SHA-256) y se busca en el registro de descargas.</p><label class="btn primary filebtn">Elegir archivo<input type="file" hidden data-chg="hcxCheckFile"></label><div id="hxChk" class="hx-chk">' + (m.chk.res || '') + '</div>', '<button class="btn" data-act="hcxBack">Volver</button>');
    const n = patsFor(o).length, hist = expGet().list.slice(-5).reverse();
    const b = '<p class="m-lead">Descargá todas las historias clínicas en PDF para guardarlas por tu cuenta (resguardo). Cada paciente queda en su PDF, listo para imprimir o presentar.</p>' +
      '<div class="row2"><div class="field"><label for="hxFrom">Desde (vacío = desde el principio)</label><input id="hxFrom" type="date" data-chg="hxO" data-k="from" value="' + esc(o.from) + '" max="' + A.today() + '"></div><div class="field"><label for="hxTo">Hasta</label><input id="hxTo" type="date" data-chg="hxO" data-k="to" value="' + esc(o.to) + '" max="' + A.today() + '"></div></div>' +
      '<div class="hx-who"><b>Pacientes</b><label class="chk"><input type="radio" name="hxM" data-chg="hxO" data-k="mode" value="todos"' + (o.mode === 'todos' ? ' checked' : '') + '> Todos</label><label class="chk"><input type="radio" name="hxM" data-chg="hxO" data-k="mode" value="periodo"' + (o.mode === 'periodo' ? ' checked' : '') + '> Solo los que tienen registros en esas fechas</label></div>' +
      '<label class="chk"><input type="checkbox" data-chg="hxO" data-k="arch"' + (o.arch ? ' checked' : '') + '> Incluir pacientes archivados</label>' +
      '<label class="chk"><input type="checkbox" data-chg="hxO" data-k="paper"' + (o.paper ? ' checked' : '') + '> Incluir las fotos de las historias en papel</label>' +
      '<label class="chk"><input type="checkbox" data-chg="hxO" data-k="imgs"' + (o.imgs ? ' checked' : '') + '> Incluir todas las imágenes (radiografías y fotos; el archivo pesa mucho más)</label>' +
      '<div class="hx-n">Van <b>' + n + '</b> historias clínicas' + (n > 400 ? ', en ' + Math.ceil(n / 400) + ' archivos ZIP' : '') + '.</div>' +
      '<div class="small-note">Las evoluciones, tratamientos, indicaciones y documentos se filtran por fecha. El odontograma muestra cómo está hoy. Cada descarga queda registrada (quién, cuándo y el código de cada archivo).</div>' +
      (hist.length ? '<h3 class="hp-h">Últimas descargas</h3><div class="hx-hist">' + hist.map(x => '<div><b>' + esc(A.fmtDMY(x.at.slice(0, 10))) + '</b> · ' + esc(x.by || '') + ' · ' + x.n + ' historias · código ' + esc(codeOf(x.code)) + '</div>').join('') + '</div>' : '') + '<div id="hxMsg" class="m-msg"></div>';
    return A.modalShell('Descargar historias clínicas', b, '<button class="btn" data-act="hcxCheck">Comprobar un archivo</button><button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="hcxGo"' + (n ? '' : ' disabled') + '>Descargar ' + n + '</button>', true);
  };
  A.chg.hxO = el => { const o = S.modal.o, k = el.getAttribute('data-k'); o[k] = el.type === 'checkbox' ? el.checked : el.value; if (k === 'to' && !o.to) o.to = A.today(); A.renderModal(); };
  A.acts.hcxStop = () => { if (S.modal && S.modal.run) S.modal.run.stop = 1; };
  A.acts.hcxBack = () => { S.modal = { type: 'hcx', o: (S.modal.back && S.modal.back.o) || { from: '', to: A.today(), mode: 'todos', arch: true, paper: true, imgs: false } }; A.renderModal(); };
  A.acts.hcxCheck = () => { S.modal = { type: 'hcx', chk: {}, back: S.modal, o: S.modal.o }; A.renderModal(); };
  A.chg.hcxCheckFile = async el => {
    const f = el.files && el.files[0]; el.value = ''; if (!f) return;
    const h = await sha(f), box = $('#hxChk'); let hit = null;
    expGet().list.forEach(x => { if (x.files && x.files[h]) hit = { x, what: 'pdf', pid: x.files[h] }; if (x.zips && x.zips.indexOf(h) >= 0) hit = { x, what: 'zip' }; if (x.cons && x.cons.indexOf(h) >= 0) hit = { x, what: 'cons' }; });
    const res = !h ? '<div class="hint bad">Este navegador no puede calcular el código.</div>' : hit
      ? '<div class="hx-ok">✔ <b>El archivo es idéntico</b> al que emitió OdontoVoz el ' + esc(A.fmtDMY(hit.x.at.slice(0, 10))) + ' a las ' + esc(hit.x.at.slice(11, 16)) + ' (descarga hecha por ' + esc(hit.x.by || '') + ').' + (hit.what === 'pdf' ? ' Es la historia clínica de ' + esc((A.PAT(hit.pid) || {}).name || 'un paciente') + '.' : hit.what === 'zip' ? ' Es el ZIP completo.' : ' Es la constancia.') + '<br><span class="small-note">Código: ' + esc(h) + '</span></div>'
      : '<div class="hx-no">✖ <b>No coincide</b> con ninguna descarga registrada: el archivo pudo haber sido modificado, o se descargó con otra cuenta.<br><span class="small-note">Código: ' + esc(h) + '</span></div>';
    S.modal.chk.res = res; if (box) box.innerHTML = res;
  };

  A.acts.hcxGo = async () => {
    const m = S.modal, o = Object.assign({}, m.o); if (!o.to) o.to = A.today();
    let Z; try { Z = await loadZip(); } catch (e) { const x = $('#hxMsg'); if (x) x.textContent = 'Para armar el ZIP hace falta internet la primera vez. Probá de nuevo con conexión.'; return; }
    const pats = patsFor(o), who = me(), at = new Date().toISOString(), base = 'OdontoVoz-historias-' + slug(A.CLINIC || 'consultorio') + '-hasta-' + o.to;
    const PART = 400, parts = Math.max(1, Math.ceil(pats.length / PART));
    const run = m.run = { i: 0, n: pats.length, txt: 'Preparando…' }; A.renderModal();
    const rec = { id: A.uid(), at, by: who.who, uid: who.uid, from: o.from || '', to: o.to, n: 0, parts, files: {}, zips: [], cons: [], code: '' };
    let photos = 0, miss = 0; const allIdx = [];
    const step = t => { run.txt = t; const x = $('#hxTxt'), bar = $('#modalHost .hx-bar span'); if (x) x.textContent = t; if (bar) bar.style.width = Math.round(100 * run.i / Math.max(1, run.n)) + '%'; };
    try {
      for (let pi = 0; pi < parts; pi++) {
        const zip = new Z(), dir = base + (parts > 1 ? '-parte-' + (pi + 1) + '-de-' + parts : '') + '/', idx = [];
        for (const p of pats.slice(pi * PART, (pi + 1) * PART)) {
          if (run.stop) throw new Error('stop');
          run.i++; step('Historia ' + run.i + ' de ' + run.n + ': ' + (p.last || '') + ', ' + (p.first || ''));
          let g = null; try { g = pdfOf(p, o); } catch (e) { g = null; }
          if (!g) { idx.push({ p, f: '', h: '', err: 1 }); continue; }
          const fname = 'historias/' + slug(p.last) + '-' + slug(p.first) + (p.dni ? '-' + String(p.dni).replace(/\D/g, '') : '-' + slug(p.id)) + '.pdf';
          const h = await sha(g.blob); zip.file(dir + fname, g.blob); if (h) rec.files[h] = p.id; idx.push({ p, f: fname, h });
          if (o.paper || o.imgs) {
            const pd = A.pd(p.id), im = (pd.images || []).filter(i => (o.imgs || i.kind === 'hcpapel') && (!o.from || i.date >= o.from) && i.date <= o.to);
            for (let k = 0; k < im.length; k++) {
              const d = (await A.media.get(im[k].id)) || null; if (!d) { miss++; continue; }
              const bl = await (await fetch(d)).blob(); zip.file(dir + 'fotos/' + slug(p.last) + '-' + slug(p.first) + '/' + im[k].date + '-' + slug((A.IMG_KINDS || {})[im[k].kind] || im[k].kind) + '-' + (k + 1) + '.jpg', bl); photos++;
            }
          }
          if (run.i % 5 === 0) await pause();
        }
        /* índice y constancia de esta parte */
        const csv = '﻿N.º;Apellido;Nombre;DNI;Archivo;Código SHA-256\n' + idx.map((x, i) => [i + 1, x.p.last || '', x.p.first || '', x.p.dni || '', x.f || 'NO SE PUDO GENERAR', x.h].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\n');
        zip.file(dir + 'indice.csv', csv); idx.forEach(x => allIdx.push(x));
        step('Armando la constancia…');
        const cons = constancia(idx, o, rec, pi, parts, await sha(new Blob([csv])));
        if (cons) { zip.file(dir + 'constancia.pdf', cons); const ch = await sha(cons); if (ch) rec.cons.push(ch); }
        zip.file(dir + 'LEEME.txt', leeme(o, rec, idx.length));
        step('Comprimiendo' + (parts > 1 ? ' la parte ' + (pi + 1) + ' de ' + parts : '') + '…');
        const zb = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        const zh = await sha(zb); if (zh) rec.zips.push(zh);
        await A.saveFile(dir.slice(0, -1) + '.zip', zb);
      }
      rec.n = allIdx.filter(x => x.f).length;
      rec.code = await sha(new Blob([allIdx.map(x => x.h).join('\n') + '\n' + at]));
      const E = expGet(); E.list.push(rec); E.list = E.list.slice(-12); expSet(E);
      if (A.save) A.save(); if (CL && CL.sync && CL.session) { try { CL.sync(); } catch (e) { /* se sube en la próxima */ } }
      S.modal = { type: 'hcx', o: m.o, done: { n: rec.n, parts, photos, miss, code: rec.code, at } }; A.renderModal();
    } catch (e) {
      S.modal = { type: 'hcx', o: m.o }; A.renderModal();
      A.toast(e && e.message === 'stop' ? 'Descarga cancelada.' : 'No se pudo terminar la descarga: ' + ((e && e.message) || 'error') + '.');
    }
  };
  function constancia(idx, o, rec, pi, parts, csvHash) {
    const Doc = A.pdfDoc_; if (!Doc) return null;
    const sv = A.saveFile; let got = null; A.saveFile = (n, b) => { got = b; return Promise.resolve(true); };
    try {
      const d = Doc('Constancia de resguardo');
      if (!d) return null;
      const fmt = iso => A.fmtDMY(iso.slice(0, 10)) + ' ' + new Date(iso).toTimeString().slice(0, 5);
      d.head('Constancia de resguardo de historias clínicas', 'Emitida el ' + fmt(rec.at) + ' por ' + rec.by + (parts > 1 ? ' · parte ' + (pi + 1) + ' de ' + parts : ''), null, '');
      d.rows([['Centro / consultorio', A.CLINIC || ''], ['Período', (o.from ? 'del ' + A.fmtDMY(o.from) : 'desde el primer registro') + ' al ' + A.fmtDMY(o.to)], ['Historias clínicas en este archivo', String(idx.filter(x => x.f).length)], ['Código del índice (SHA-256)', csvHash.slice(0, 32)], ['', csvHash.slice(32)]]);
      d.h('Archivos incluidos');
      d.table([{ h: 'N.º', w: 10 }, { h: 'Paciente', w: 50 }, { h: 'DNI', w: 22 }, { h: 'Código SHA-256 del PDF', w: 96 }], idx.map((x, i) => [String(i + 1), (x.p.last || '') + ', ' + (x.p.first || ''), String(x.p.dni || ''), x.h || (x.err ? 'no se pudo generar' : '')]), 6.5);
      d.h('Qué es este documento');
      d.p('Es una copia de resguardo de las historias clínicas registradas en el sistema OdontoVoz, generada por el usuario indicado. Los registros originales se conservan en el sistema, con acceso restringido por usuario y clave y con historial de modificaciones (Ley 26.529, art. 13). La conservación es de al menos 10 años desde la última actuación (art. 18).', 9);
      d.p('Cada PDF tiene un código SHA-256: si se cambia una sola letra del archivo, el código cambia. El registro de esta descarga (fecha, usuario y códigos) quedó guardado en la nube de OdontoVoz, así que cualquier archivo se puede comprobar después desde la app (Descargar historias clínicas › Comprobar un archivo). Las evoluciones de cada PDF figuran con la persona que las registró; las notas anuladas se muestran como anuladas.', 9);
      d.p('El odontograma de cada PDF refleja el estado al día de emisión.', 8.5);
      d.finish('constancia.pdf');
    } finally { A.saveFile = sv; }
    return got;
  }
  const leeme = (o, rec, n) => 'OdontoVoz · Resguardo de historias clínicas\r\n\r\nCentro: ' + (A.CLINIC || '') + '\r\nEmitido: ' + rec.at.replace('T', ' ').slice(0, 16) + ' (hora UTC) por ' + rec.by + '\r\nPeríodo: ' + (o.from || 'desde el principio') + ' al ' + o.to + '\r\nHistorias en esta parte: ' + n + '\r\n\r\n' +
    '- historias/: un PDF por paciente (para imprimir o presentar).\r\n- indice.csv: lista de pacientes con el código SHA-256 de cada PDF (se abre con Excel).\r\n- constancia.pdf: constancia de la descarga con los mismos códigos.\r\n' + (o.paper || o.imgs ? '- fotos/: fotos de las historias en papel' + (o.imgs ? ' e imágenes' : '') + ' de cada paciente.\r\n' : '') +
    '\r\nGuardá este archivo en dos lugares distintos. Para comprobar que un PDF no fue modificado: en OdontoVoz, Ajustes › Descargar historias clínicas › Comprobar un archivo.\r\n';

  /* ---------- entradas en el menú, en Ajustes › Copia de seguridad y por voz ---------- */
  const SVG_P = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/></svg>';
  const SVG_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2h9l5 5v15H6z"/><path d="M12 10v7M9 14l3 3 3-3"/></svg>';
  const mount = () => {
    const ref = document.querySelector('#gearMenu .dnav[data-act="importOpen"]');
    if (ref && !document.querySelector('#gearMenu .dnav[data-act="hcpOpen"]')) ref.insertAdjacentHTML('afterend', '<button class="dnav" data-act="hcpOpen">' + SVG_P + '<span class="t">Pasar historias de papel<small>Fotos de las historias clínicas en papel</small></span></button>');
    const ref2 = document.querySelector('#gearMenu .dnav[data-act="archOpen"]');
    const x = document.querySelector('#gearMenu .dnav[data-act="hcxOpen"]');
    if (ref2 && !x) ref2.insertAdjacentHTML('beforebegin', '<button class="dnav" data-act="hcxOpen">' + SVG_X + '<span class="t">Descargar historias clínicas<small>Resguardo en PDF de todas</small></span></button>');
    const xb = document.querySelector('#gearMenu .dnav[data-act="hcxOpen"]'); if (xb) xb.hidden = !boss();
  };
  /* Ajustes › Copia de seguridad */
  const carePrev = A.dataCareHTML;
  if (carePrev) A.dataCareHTML = function () { return carePrev.apply(this, arguments) + (boss() ? '<div class="hx-care"><div><b>Descargar todas las historias clínicas</b><span>Un PDF por paciente, con constancia y códigos para comprobar que no se tocaron.</span></div><button class="btn primary" data-act="hcxOpen">Descargar historias clínicas</button></div>' : ''); };
  const arPrev = A.afterRefresh; A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; try { mount(); } catch (e) { /* nada */ } return r; };
  setTimeout(() => { try { mount(); } catch (e) { /* nada */ } }, 0);
  const execPrev = A.cmd && A.cmd.exec;
  if (execPrev) A.cmd.exec = (text, o) => {
    const t = N(text);
    if (/\b(pasar|cargar|digitalizar|escanear|subir)\b.*\bhistori\w* (clinicas? )?(de |en )?papel\b|\bhistorias de papel\b/.test(t)) { A.acts.hcpOpen(); return { ok: true, msg: 'Pasar historias de papel: sacale fotos a cada historia.' }; }
    if (/\b(descargar|bajar|exportar|guardar)\b.*\b(todas las )?historias clinicas\b/.test(t)) { A.acts.hcxOpen(); return { ok: true, msg: 'Descargar historias clínicas.' }; }
    return execPrev(text, o);
  };

  const css = document.createElement('style');
  css.textContent = '.hp-start{display:flex;flex-wrap:wrap;gap:10px;margin:6px 0 8px}.hp-start .btn.big{min-height:56px;font-size:16px;flex:1 1 220px;justify-content:center}.hp-each{font-size:14px}' +
    '.hp-target{background:var(--accent-soft,#e6f3f3);border-radius:10px;padding:8px 12px;margin:6px 0}' +
    '.hp-cur{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:6px 0}.hp-cur h3{margin:0 0 8px;font-size:15px}' +
    '.hp-ths{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0}.hp-th{position:relative;display:inline-block;border:2px solid transparent;border-radius:8px;padding:0;background:none;cursor:pointer}.hp-th.on{border-color:var(--accent,#0d6b6b)}.hp-th img{width:64px;height:84px;object-fit:cover;border-radius:6px;display:block;background:#eee;border:1px solid var(--line,#ccd)}.hp-th .x{position:absolute;top:-8px;right:-8px;width:26px;height:26px;border-radius:50%;border:0;background:var(--ink,#222);color:#fff;font-size:16px;line-height:1;cursor:pointer}' +
    '.hp-h{margin:14px 0 6px;font-size:15px}.hp-sum{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}' +
    '.hp-list{display:flex;flex-direction:column;gap:8px}.hp-row{display:flex;gap:10px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:8px}.hp-row>img{width:46px;height:60px;object-fit:cover;border-radius:6px;background:#eee;flex:none;border:1px solid var(--line,#ccd)}.hp-rt{flex:1;min-width:0;display:flex;flex-direction:column}.hp-rt span{font-size:13px;color:var(--ink-2)}.hp-row .row-btns{flex-wrap:wrap;justify-content:flex-end}' +
    '.hp-rev{display:grid;grid-template-columns:minmax(0,46%) minmax(0,54%);gap:16px;align-items:start}.hp-pics{position:sticky;top:0}.hp-big{border:1px solid var(--line);border-radius:10px;overflow:auto;max-height:70vh;background:#f4f4f4}.hp-big img{width:100%;display:block;cursor:zoom-in}.hp-big.zoom img{width:220%;max-width:none;cursor:zoom-out}' +
    '.hp-sec{border-top:1px solid var(--line);padding-top:10px;margin-top:10px}.hp-sec:first-of-type{border-top:0;margin-top:0;padding-top:0}.hp-sec h3{margin:0 0 8px;font-size:15px}' +
    '.hp-dbt input,.hp-dbt textarea{background:#fff6d6!important;border-color:#e0b100!important}.hp-q input,.hp-q textarea{border-color:#d9822b!important;box-shadow:0 0 0 2px #ffe2c2}.hp-legend{font-size:12.5px;color:var(--ink-2);margin-bottom:8px}.hp-sw{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-1px}.hp-sw.dbt{background:#fff6d6;border:1px solid #e0b100}.hp-sw.q{background:#fff;border:2px solid #d9822b}' +
    '.hp-anam{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;margin-bottom:8px}.hp-anam .chk{font-size:14px}' +
    '.hp-od{display:flex;gap:6px;align-items:center;margin-bottom:6px}.hp-od input{flex:1;min-width:0}.hp-od select{width:auto}.hp-od .x,.hp-evh .x{border:0;background:none;font-size:22px;line-height:1;cursor:pointer;color:var(--ink-2);min-width:36px;min-height:36px}' +
    '.hp-ev{border:1px solid var(--line);border-radius:10px;padding:8px;margin-bottom:8px}.hp-ev textarea{width:100%;box-sizing:border-box}.hp-evh{display:flex;gap:8px;align-items:center;margin-bottom:6px}.hp-evh input{width:auto}.hp-evh .muted{flex:1;font-size:13px}.hp-nod .hp-evh input{border-color:#d9822b}' +
    '.hp-match{border:1px solid #e0b100;background:#fffbea;border-radius:10px;padding:8px 12px;margin-bottom:10px;display:flex;flex-direction:column;gap:4px}' +
    '.hp-card,.hx-care{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}.hp-card>div,.hx-care>div{display:flex;flex-direction:column;flex:1 1 220px}.hp-card span,.hx-care span{font-size:13.5px;color:var(--ink-2)}' +
    '.hx-prog{padding:8px 0}.hx-bar{height:10px;border-radius:6px;background:var(--line);overflow:hidden}.hx-bar span{display:block;height:100%;background:var(--accent,#0d6b6b);transition:width .2s}' +
    '.hx-who{display:flex;flex-direction:column;gap:2px;margin:6px 0 4px}.hx-who>b{font-size:14px}.hx-n{margin:10px 0;font-size:15px}.hx-hist{font-size:13.5px;display:flex;flex-direction:column;gap:3px}.hx-code{background:var(--accent-soft,#e6f3f3);border-radius:10px;padding:10px 14px;margin:10px 0;text-align:center}.hx-code b{font:700 20px var(--f-mono,monospace);letter-spacing:.06em}' +
    '.hx-chk{margin-top:12px}.hx-ok{border:1px solid #2e7d32;background:#edf7ee;border-radius:10px;padding:10px 12px;overflow-wrap:anywhere}.hx-no{border:1px solid #b3261e;background:#fdeceb;border-radius:10px;padding:10px 12px;overflow-wrap:anywhere}' +
    '@media (max-width:760px){.hp-rev{grid-template-columns:1fr}.hp-pics{position:static}.hp-big{max-height:38vh}.hp-anam{grid-template-columns:1fr}.hp-row{flex-wrap:wrap}.hp-row .row-btns{width:100%;justify-content:flex-start}}';
  document.head.appendChild(css);
})();
