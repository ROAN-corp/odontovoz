/* ===== 1.5: eliminar pacientes, guardar en la historia, fotos y radiografías en la nube, laboratorio compacto, avisos de llegada, logo al abrir ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, CL = A.cloud;
  const N = s => A.norm(s);
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const DOTS = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>';

  /* =====================================================================
     SONIDOS (generados en el momento: sin archivos)
     ===================================================================== */
  let ac = null;
  const audio = () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { ac = null; } return ac; };
  ['pointerdown', 'keydown', 'touchstart'].forEach(t => document.addEventListener(t, () => audio(), { once: true, passive: true, capture: true }));
  function tone(freq, at, dur, gain, type) {
    const c = audio(); if (!c || c.state !== 'running') return false;
    const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + at;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05); return true;
  }
  /* al abrir: acorde suave que se arma de abajo hacia arriba (do – mi – sol – si) */
  A.soundOpen = () => { if (!tone(261.6, 0, 1.6, 0.035)) return; tone(329.6, 0.09, 1.5, 0.03); tone(392, 0.18, 1.4, 0.028); tone(493.9, 0.27, 1.3, 0.022); tone(523.3, 0.27, 1.3, 0.012, 'triangle'); };
  /* llegó un paciente: dos notas claras y cortas, como un timbre suave */
  A.soundArrive = () => { tone(784, 0, 0.5, 0.07); tone(1175, 0.16, 0.7, 0.06); };

  /* =====================================================================
     LOGO ANIMADO CADA VEZ QUE SE ABRE LA APP
     ===================================================================== */
  const PREF = () => { try { return Object.assign({ splash: true, splashSound: true, sound: true, vibrate: true, system: !!window.OV_NATIVE, pro: '' }, JSON.parse(LS.get('odontovoz.notif', '{}'))); } catch (e) { return { splash: true, splashSound: true, sound: true, vibrate: true, system: !!window.OV_NATIVE, pro: '' }; } };
  const savePref = p => LS.set('odontovoz.notif', JSON.stringify(p));
  A.notifPref = PREF;
  const LOGO = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path class="sp-tooth" d="M9 4c-3.2 0-5.5 2.6-5.5 6 0 2.6 1 4.4 1.8 6.6.9 2.5.9 5.4 1.9 8.5.5 1.6 2.4 1.7 3 .1.9-2.4 1.1-5.2 2.4-5.2h2.8c1.3 0 1.5 2.8 2.4 5.2.6 1.6 2.5 1.5 3-.1 1-3.1 1-6 1.9-8.5.8-2.2 1.8-4 1.8-6.6 0-3.4-2.3-6-5.5-6-2.1 0-3.2 1.1-5.2 1.1S11.1 4 9 4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path class="sp-wave" d="M11 11.5v2M13.5 10v5M16 9v7M18.5 10v5M21 11.5v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  function splash() {
    const p = PREF(); if (!p.splash || document.getElementById('intro')) return;
    const d = document.createElement('div'); d.id = 'ovSplash'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<div class="sp-box"><div class="sp-logo">' + LOGO + '</div><div class="sp-name">OdontoVoz</div></div>';
    document.body.appendChild(d);
    if (p.splashSound) setTimeout(() => A.soundOpen(), 120);
    setTimeout(() => d.classList.add('out'), 1250);
    setTimeout(() => d.remove(), 1650);
  }
  splash();

  /* =====================================================================
     ELIMINAR PACIENTES
     ===================================================================== */
  const hasClinical = pid => {
    if (!A.PAT(pid)) return false; const pd = A.pd(pid); if (!pd || pd.deleted) return false; const hc = pd.hc || {};
    return !!((pd.notes || []).some(n => !n.auto) || (pd.tx || []).length || (pd.images || []).length || (pd.labs || []).length || (pd.rx || []).length ||
      Object.keys(hc.conds || {}).some(k => hc.conds[k]) || hc.meds || hc.ant || hc.motivo);
  };
  const apptsOf = pid => { const out = []; Object.keys(A.S.days || {}).forEach(d => (A.S.days[d] || []).forEach(a => { if (a.pid === pid) out.push(a); })); return out; };
  A.deletePatient = pid => {
    const p = A.PAT(pid); if (!p) return false;
    const pd = A.S.pd[pid];
    (pd && pd.images || []).forEach(i => { try { A.media.del(i.id); } catch (e) { /* nada */ } });
    Object.keys(A.S.days || {}).forEach(d => { const l = A.S.days[d] || []; if (l.some(a => a.pid === pid)) { A.S.days[d] = l.filter(a => a.pid !== pid); A.S.dirtyDays[d] = 1; } });
    A.S.pd[pid] = { deleted: true, at: A.today() }; A.S.dirtyPd[pid] = 1;
    /* queda solo una marca sin datos personales, para que los demás equipos también lo borren */
    const stub = { id: pid, deleted: true, first: 'Paciente', last: 'eliminado', dni: '', phone: '', email: '', cov: '', age: 0, seed: [], debt: 0, conds: [], pro: p.pro, custom: true };
    Object.keys(p).forEach(k => { delete p[k]; }); Object.assign(p, stub); A.derive(p);
    const i = A.PATS.indexOf(p); if (i >= 0) A.PATS.splice(i, 1);
    const np = A.S.newPats || (A.S.newPats = []); if (!np.some(x => x.id === pid)) np.push(p);
    if (S.fichaPid === pid) { S.fichaPid = null; S.tab = 'pacientes'; }
    if (S.panel && S.panel.pid === pid) S.panel = null;
    A.save(); if (CL && CL.sync) setTimeout(() => CL.sync(), 300);
    return true;
  };
  /* los pacientes eliminados no aparecen en listas ni búsquedas (quedan solo como marca vacía) */
  const purgeList = () => { for (let i = A.PATS.length - 1; i >= 0; i--) if (A.PATS[i] && A.PATS[i].deleted) A.PATS.splice(i, 1); };
  A.purgeDeleted = purgeList;
  /* al arrancar, después de cargar lo guardado */
  const prevLoad = A.load;
  if (prevLoad) A.load = (...args) => { const r = prevLoad.apply(A, args); purgeList(); return r; };

  A.acts.patMenu = el => { const pid = el.getAttribute('data-pid'); if (!A.PAT(pid)) return; S.modal = { type: 'patMenu', pid, back: S.modal && S.modal.type !== 'patMenu' ? S.modal : null }; A.renderModal(); };
  MF.patMenu = m => {
    const p = A.PAT(m.pid), pro = S.role === 'profesional';
    const it = (act, label, sub, extra, cls) => '<button class="pm-it' + (cls ? ' ' + cls : '') + '" data-act="' + act + '" data-pid="' + m.pid + '"' + (extra || '') + '><b>' + label + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</button>';
    return A.modalShell(p.name, '<div class="pm-list">' +
      it('pmFicha', 'Abrir la ficha completa', 'Datos, historia clínica, odontograma, fotos') +
      it('pmTurno', 'Darle un turno', '') +
      (pro ? it('pdfHC', 'Descargar la historia clínica (PDF)', 'Para imprimir o guardar una copia') : '') +
      it('pmDel', 'Eliminar paciente', 'Borra sus datos, su historia y sus turnos', '', 'danger') + '</div>', '<button class="btn" data-act="closeModal">Cerrar</button>');
  };
  A.acts.pmFicha = el => { S.modal = null; A.renderModal(); A.openFicha(el.getAttribute('data-pid'), 'datos'); };
  A.acts.pmTurno = el => { S.modal = null; A.renderModal(); A.acts.newApptFor(el); };
  A.acts.pmDel = el => { S.modal = { type: 'patDel', pid: el.getAttribute('data-pid') }; A.renderModal(); };
  MF.patDel = m => {
    const p = A.PAT(m.pid), clin = hasClinical(m.pid), fut = apptsOf(m.pid).filter(a => a.date >= A.today() && a.status !== 'cancelado').length;
    let b = '<p>Se va a eliminar a <b>' + esc(p.name) + '</b>' + (p.dni ? ' (DNI ' + esc(p.dni) + ')' : '') + ' de todos tus equipos. No se puede deshacer.</p>';
    b += '<ul class="pd-list"><li>Sus datos personales y de obra social.</li>' + (clin ? '<li>Su historia clínica, odontograma, fotos y trabajos de laboratorio.</li>' : '') + '<li>' + (fut ? fut + ' turno' + (fut > 1 ? 's' : '') + ' a futuro y su historial de turnos.' : 'Su historial de turnos.') + '</li></ul>';
    if (clin) b += '<div class="pd-warn"><b>Este paciente tiene historia clínica.</b> La ley (26.529, art. 18) obliga a conservarla al menos 10 años desde la última atención. Si lo atendiste, descargá antes una copia en PDF y guardala.</div>' +
      '<div class="row-btns"><button class="btn small" data-act="pdfHC" data-pid="' + m.pid + '">Descargar historia clínica (PDF)</button></div>' +
      '<label class="chk"><input type="checkbox" id="pdOk"> Entiendo que se borra la historia clínica de este paciente.</label>';
    b += '<div id="pdMsg" class="hint bad"></div>';
    return A.modalShell('Eliminar paciente', b, '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn danger" data-act="pdGo" data-pid="' + m.pid + '">Eliminar definitivamente</button>');
  };
  A.acts.pdGo = el => {
    const pid = el.getAttribute('data-pid'), ok = $('#pdOk');
    if (ok && !ok.checked) { $('#pdMsg').textContent = 'Para eliminarlo, marcá la casilla de arriba.'; return; }
    const name = A.PAT(pid).name; A.deletePatient(pid); S.modal = null; A.renderModal(); A.refresh(); A.toast(name + ' fue eliminado.');
  };
  /* botón ⋮ en la lista de pacientes, en la ficha y en el resumen */
  const kebab = pid => '<button class="kebab" data-act="patMenu" data-pid="' + pid + '" aria-label="Opciones del paciente" title="Opciones">' + DOTS + '</button>';
  function addKebabs() {
    A.$$('.prow[data-pid]').forEach(r => {
      if (r.parentNode.classList.contains('prow-w')) return;
      const w = document.createElement('div'); w.className = 'prow-w'; r.parentNode.insertBefore(w, r); w.appendChild(r); w.insertAdjacentHTML('beforeend', kebab(r.getAttribute('data-pid')));
    });
  }
  new MutationObserver(() => addKebabs()).observe(document.body, { childList: true, subtree: true });
  const prevFicha = A.render.ficha;
  A.render.ficha = () => {
    prevFicha();
    const pid = S.fichaPid, tr = $('#view-ficha .fh .top-right');
    if (tr && !tr.querySelector('.kebab')) tr.insertAdjacentHTML('beforeend', kebab(pid));
    if (S.fichaTab === 'datos') datosExtras(pid);
  };
  const prevPanel = A.renderPanel;
  A.renderPanel = () => {
    prevPanel();
    if (S.panel && S.panel.type === 'pat') { const x = $('#panelHost .panel-head .x'); if (x && !x.parentNode.querySelector('.kebab')) x.insertAdjacentHTML('beforebegin', kebab(S.panel.pid)); }
  };

  /* =====================================================================
     BOTONES «GUARDAR» AL FINAL DE CADA PARTE DE LA HISTORIA
     ===================================================================== */
  function datosExtras(pid) {
    const body = $('#fichaBody'); if (!body) return;
    A.$$('#fichaBody section.card').forEach(sec => {
      const h = sec.querySelector('h2'); if (!h || sec.querySelector('.save-row')) return;
      const t = h.textContent;
      const which = /^Datos personales/.test(t) ? 'datos personales' : /^Anamnesis/.test(t) ? 'anamnesis' : null;
      if (!which) return;
      sec.insertAdjacentHTML('beforeend', '<div class="save-row"><button class="btn primary" data-act="secSave" data-sec="' + which + '">Guardar ' + which + '</button><span class="save-ok" aria-live="polite"></span></div>');
    });
    /* fotos y radiografías, a la vista desde la historia */
    if (S.role === 'profesional' && !body.querySelector('.ph-strip')) {
      const im = (A.pd(pid).images || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
      const html = '<section class="card ph-strip"><h2>Fotos y radiografías <span class="count">' + im.length + '</span></h2>' +
        (im.length ? '<div class="ph-row">' + im.slice(0, 8).map(i => '<button class="ph-th" data-act="imOpen" data-id="' + i.id + '" aria-label="' + esc((A.IMG_KINDS[i.kind] || '') + ' ' + A.fmtDMY(i.date)) + '"><img alt="" src="' + esc(i.thumb) + '"></button>').join('') + '</div>' : '<p class="hint" style="margin:0">Todavía no hay fotos ni radiografías de este paciente.</p>') +
        '<div class="row-btns"><button class="btn small primary" data-act="fichaTab" data-tab="img">' + (im.length ? 'Ver todas y agregar' : 'Agregar fotos o radiografías') + '</button></div></section>';
      const mv = body.querySelector('.mv-card');
      if (mv) mv.insertAdjacentHTML('afterend', html); else body.insertAdjacentHTML('afterbegin', html);
    }
  }
  A.acts.secSave = async el => {
    const ae = document.activeElement; if (ae && ae.blur) ae.blur(); /* lo que se estaba escribiendo se guarda al salir del campo */
    await new Promise(r => setTimeout(r, 30));
    const sec = el.closest('section'); if (sec) sec.querySelectorAll('input[data-chg],textarea[data-chg],select[data-chg]').forEach(i => { if (i.type !== 'checkbox' && i.value !== i.defaultValue) i.dispatchEvent(new Event('change', { bubbles: true })); });
    if (A.saveNow) A.saveNow(); else A.save();
    if (CL && CL.session && CL.sync) CL.sync();
    const ok = el.parentNode.querySelector('.save-ok'), t = new Date();
    if (ok) ok.textContent = '✓ Guardado a las ' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
    A.toast('Guardado: ' + el.getAttribute('data-sec') + '.');
  };

  /* =====================================================================
     FOTOS Y RADIOGRAFÍAS: también en la nube (se ven en todos los equipos)
     ===================================================================== */
  const BUCKET = 'ov-media';
  const cloudOn = () => !!(CL && CL.session && CL.token && CL.conf && CL.conf() && !A.DEMO);
  const objPath = id => A.ownerId() + '/' + id + '.jpg';
  const sUrl = p => CL.conf().url + '/storage/v1/object/' + p;
  const toBlob = dataUrl => { const [h, b64] = String(dataUrl).split(','), bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: (/data:([^;]+)/.exec(h) || [])[1] || 'image/jpeg' }); };
  const toData = blob => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(blob); });
  async function sfetch(method, path, body) {
    const tk = await CL.token();
    return fetch(sUrl(path), { method, headers: Object.assign({ apikey: CL.conf().key, Authorization: 'Bearer ' + tk }, body ? { 'Content-Type': body.type || 'image/jpeg', 'x-upsert': 'true' } : {}), body });
  }
  const Q = { get: () => { try { return JSON.parse(LS.get('odontovoz.mediaQ', '[]')); } catch (e) { return []; } }, set: l => LS.set('odontovoz.mediaQ', JSON.stringify(l)) };
  const local = { put: A.media.put, get: A.media.get, del: A.media.del };
  let flushing = false;
  A.mediaFlush = async () => {
    if (flushing || !cloudOn() || (CL.readonly)) return; flushing = true;
    try {
      for (const job of Q.get()) {
        let ok = false;
        try {
          if (job.op === 'put') { const d = await local.get(job.id); if (!d) ok = true; else { const r = await sfetch('POST', BUCKET + '/' + objPath(job.id), toBlob(d)); ok = r.ok; } }
          else { const r = await sfetch('DELETE', BUCKET + '/' + objPath(job.id)); ok = r.ok || r.status === 404 || r.status === 400; }
        } catch (e) { ok = false; }
        if (!ok) break;
        Q.set(Q.get().filter(x => !(x.id === job.id && x.op === job.op)));
      }
    } finally { flushing = false; }
  };
  A.media.put = async (id, data) => { await local.put(id, data); if (cloudOn()) { Q.set(Q.get().filter(x => x.id !== id).concat([{ op: 'put', id }])); A.mediaFlush(); } };
  A.media.get = async id => {
    const d = await local.get(id); if (d || !cloudOn()) return d;
    try { const r = await sfetch('GET', 'authenticated/' + BUCKET + '/' + objPath(id)); if (!r.ok) return null; const data = await toData(await r.blob()); if (data) await local.put(id, data); return data; } catch (e) { return null; }
  };
  A.media.del = async id => { await local.del(id); if (cloudOn()) { Q.set(Q.get().filter(x => x.id !== id).concat([{ op: 'del', id }])); A.mediaFlush(); } };
  setInterval(() => { if (Q.get().length) A.mediaFlush(); }, 30000);

  /* pestaña ordenada en tres grupos: radiografías, intraorales y extraorales */
  const GROUPS = [
    { key: 'rx', title: 'Radiografías', kinds: ['rx-peri', 'rx-pano', 'rx-bite', 'rx-cef', 'estudio'], def: 'rx-peri', empty: 'Periapicales, panorámicas, aleta de mordida, telerradiografías y tomografías.' },
    { key: 'intra', title: 'Fotos intraorales', kinds: ['intra'], def: 'intra', empty: 'Fotos de la boca: frente, oclusales, laterales, antes y después.' },
    { key: 'extra', title: 'Fotos extraorales', kinds: ['extra', 'perfil'], def: 'extra', empty: 'Rostro de frente, perfil y sonrisa.' },
    { key: 'otro', title: 'Otras', kinds: ['otro'], def: 'otro', empty: '' }
  ];
  const RXK = [['rx-peri', 'Periapical'], ['rx-pano', 'Panorámica'], ['rx-bite', 'Aleta de mordida'], ['rx-cef', 'Telerradiografía'], ['estudio', 'Tomografía / estudio']];
  A.render.imgTab = pid => {
    const pd = A.pd(pid), f = S.imgF || (S.imgF = { kind: 'rx-peri' }), all = (pd.images || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    let h = '<div class="ph-tab"><section class="card ph-opt"><h2>Fotos y radiografías <span class="count">' + all.length + '</span></h2>' +
      '<details class="ph-more"><summary>Pieza, fecha y nota (opcional)</summary><div class="row3"><div class="field"><label for="imTooth">Pieza</label><input id="imTooth" inputmode="numeric" placeholder="ej. 36"></div><div class="field"><label for="imDate">Fecha</label><input id="imDate" type="date" value="' + A.today() + '"></div><div class="field"><label for="imNote">Nota</label><input id="imNote" placeholder="ej. control post endodoncia"></div></div></details>' +
      '<input type="hidden" id="imKind" value="' + esc(f.kind) + '"><div id="imMsg" class="hint bad"></div>' +
      (cloudOn() ? '<div class="small-note">Se guardan reducidas a un tamaño de trabajo y quedan en tu cuenta: las ves desde el celular y desde la PC.</div>' : '<div class="small-note">En este modo se guardan solo en este equipo. Ingresando con tu cuenta se ven en todos tus equipos.</div>') + '</section>';
    GROUPS.forEach(g => {
      const list = all.filter(i => g.kinds.indexOf(i.kind) >= 0); if (g.key === 'otro' && !list.length) return;
      h += '<section class="card ph-grp"><div class="ph-h"><h2>' + g.title + ' <span class="count">' + list.length + '</span></h2><div class="ph-add">' +
        (g.key === 'rx' ? '<select id="imRxK" aria-label="Tipo de radiografía">' + RXK.map(k => '<option value="' + k[0] + '">' + k[1] + '</option>').join('') + '</select>' : '') +
        '<label class="btn small primary filebtn">+ Subir<input type="file" accept="image/*" multiple hidden data-chg="imUp" data-g="' + g.key + '"></label>' +
        '<label class="btn small filebtn">Cámara<input type="file" accept="image/*" capture="environment" hidden data-chg="imUp" data-g="' + g.key + '"></label></div></div>' +
        (list.length ? '<div class="gallery">' + list.map(i => '<button class="gal-item" data-act="imOpen" data-id="' + i.id + '" aria-label="' + esc((A.IMG_KINDS[i.kind] || '') + ' ' + A.fmtDMY(i.date)) + '"><img alt="" src="' + esc(i.thumb) + '"><span class="gk">' + esc(A.IMG_KINDS[i.kind] || '') + '</span><span class="gd">' + A.fmtDMY(i.date) + (i.tooth ? ' · pieza ' + i.tooth : '') + '</span></button>').join('') + '</div>' : '<p class="hint" style="margin:0">' + g.empty + '</p>') +
        (g.key === 'extra' ? '<label class="chk" style="margin-top:10px"><input type="checkbox" data-chg="photoOK"' + (pd.photoOK ? ' checked' : '') + '> El paciente autoriza usar una foto suya como foto de perfil</label>' : '') + '</section>';
    });
    return h + '</div>';
  };
  A.chg.imUp = el => {
    const g = el.getAttribute('data-g'), grp = GROUPS.filter(x => x.key === g)[0], k = $('#imKind');
    if (k) k.value = g === 'rx' ? (($('#imRxK') || {}).value || 'rx-peri') : grp.def;
    return A.chg.imUpload(el);
  };

  /* =====================================================================
     LABORATORIO: lista compacta, todo a la vista
     ===================================================================== */
  const ACTIVE = ['porenviar', 'enviado', 'ajuste', 'prueba', 'listo'];
  const ST = { porenviar: 'Por enviar', enviado: 'En el laboratorio', ajuste: 'Reenviado con ajustes', prueba: 'Volvió para prueba', listo: 'Llegó terminado', instalado: 'Entregado', cancelado: 'Cancelado' };
  const NEXT = { porenviar: [['enviado', 'Enviado']], enviado: [['prueba', 'Volvió para prueba'], ['listo', 'Llegó terminado']], ajuste: [['prueba', 'Volvió'], ['listo', 'Llegó terminado']], prueba: [['ajuste', 'Reenviar con ajustes'], ['instalado', 'Instalado']], listo: [['instalado', 'Instalado']] };
  const days = (a, b) => Math.round((A.parse(a) - A.parse(b)) / 86400000);
  function dueTxt(l) {
    if (l.status === 'instalado') return { t: 'Entregado' + (l.recv ? ' ' + A.fmtDMY(l.recv).slice(0, 5) : ''), c: '' };
    if (l.status === 'prueba' || l.status === 'listo') return { t: 'En el consultorio', c: 'here' };
    if (!l.due) return { t: 'Sin fecha', c: '' };
    const d = days(l.due, A.today());
    if (d < 0) return { t: 'Atrasado ' + (-d) + (d === -1 ? ' día' : ' días'), c: 'late' };
    if (d === 0) return { t: 'Vuelve hoy', c: 'soon' };
    if (d === 1) return { t: 'Vuelve mañana', c: 'soon' };
    if (d <= 7) return { t: 'Vuelve en ' + d + ' días', c: 'soon' };
    return { t: 'Vuelve ' + A.fmtDMY(l.due).slice(0, 5), c: '' };
  }
  function lwRow(l, pid, showPat) {
    const p = A.PAT(pid), du = dueTxt(l), nx = (NEXT[l.status] || [])[0];
    return '<div class="lw st-' + l.status + (A.labLate(l) ? ' late' : '') + '">' +
      '<button class="lw-main" data-act="labEdit" data-pid="' + pid + '" data-id="' + l.id + '">' +
      '<span class="lw-1">' + (showPat ? '<b>' + esc(p ? p.name : '') + '</b>' : '') + '<span class="lw-w">' + esc(l.work || 'Trabajo') + (l.teeth ? ' · ' + esc(l.teeth) : '') + '</span></span>' +
      '<span class="lw-2">' + [l.lab ? esc(l.lab) : 'Sin laboratorio', l.stage ? esc(l.stage) : '', l.cost ? A.money(l.cost) + (l.paid ? ' ✓' : '') : ''].filter(Boolean).join(' · ') + '</span></button>' +
      '<span class="lw-st"><span class="lw-due ' + du.c + '">' + du.t + '</span><span class="lw-s">' + esc(ST[l.status] || l.status) + '</span></span>' +
      '<span class="lw-act">' + (nx ? '<button class="btn small primary" data-act="labSt" data-pid="' + pid + '" data-id="' + l.id + '" data-st="' + nx[0] + '">' + nx[1] + '</button>' : '') +
      '<button class="kebab" data-act="labMenu" data-pid="' + pid + '" data-id="' + l.id + '" aria-label="Más opciones del trabajo">' + DOTS + '</button></span></div>';
  }
  A.labRow = lwRow;
  MF.labAll = m => {
    const labs = A.labDir(), all = [], sel = m.lab || '', tab = m.tab || 'act';
    Object.keys(A.S.pd).forEach(pid => { const pd = A.S.pd[pid]; if (pd && !pd.deleted && pd.labs && A.PAT(pid)) pd.labs.forEach(l => { if (l.status !== 'cancelado') all.push({ l, pid }); }); });
    const mine = x => !sel || N(x.l.lab) === N(sel);
    const isLab = x => ['porenviar', 'enviado', 'ajuste'].indexOf(x.l.status) >= 0, isHere = x => ['prueba', 'listo'].indexOf(x.l.status) >= 0;
    const late = all.filter(x => mine(x) && A.labLate(x.l)), inLab = all.filter(x => mine(x) && isLab(x)), here = all.filter(x => mine(x) && isHere(x)), done = all.filter(x => mine(x) && x.l.status === 'instalado');
    const TABS = [['act', 'Activos', inLab.length + here.length], ['late', 'Atrasados', late.length], ['lab', 'En el laboratorio', inLab.length], ['here', 'Para probar o instalar', here.length], ['done', 'Entregados', done.length]];
    let list = tab === 'late' ? late : tab === 'lab' ? inLab : tab === 'here' ? here : tab === 'done' ? done : inLab.concat(here);
    list = list.slice().sort((a, b) => tab === 'done' ? ((b.l.recv || b.l.sent || '') > (a.l.recv || a.l.sent || '') ? 1 : -1) : (A.labLate(b.l) - A.labLate(a.l)) || ((a.l.due || '9') < (b.l.due || '9') ? -1 : 1));
    const cnt = name => all.filter(x => N(x.l.lab) === N(name) && ACTIVE.indexOf(x.l.status) >= 0).length;
    let b = '<div class="lb2"><div class="lb2-tabs" role="tablist">' + TABS.filter(t => t[0] !== 'late' || t[2]).map(t => '<button role="tab" class="lb2-t' + (t[0] === 'late' ? ' bad' : '') + '" data-act="labTab" data-t="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + ' <b>' + t[2] + '</b></button>').join('') + '</div>';
    b += '<div class="lb2-bar"><div class="lb2-labs">' + '<button class="chip-ex' + (sel ? '' : ' on') + '" data-act="labFilter2" data-name="">Todos</button>' +
      labs.map(x => '<button class="chip-ex' + (N(sel) === N(x.name) ? ' on' : '') + '" data-act="labFilter2" data-name="' + esc(x.name) + '">' + esc(x.name) + (cnt(x.name) ? ' · ' + cnt(x.name) : '') + '</button>').join('') + '</div>' +
      '<div class="lb2-btns"><button class="btn small" data-act="labDirOpen">Mis laboratorios</button><button class="btn small primary" data-act="labPick">+ Trabajo</button></div></div>';
    if (sel) { const d = labs.filter(x => N(x.name) === N(sel))[0]; if (d) b += '<div class="lb2-lab">' + [d.mech ? 'Mecánico: ' + esc(d.mech) : '', d.phone ? '<a href="tel:' + esc(d.phone.replace(/[^\d+]/g, '')) + '">' + esc(d.phone) + '</a>' : '', (d.items || []).length ? (d.items || []).length + ' precios cargados' : ''].filter(Boolean).join(' · ') + ' <button class="btn small ghost" data-act="labOne" data-id="' + d.id + '">Editar laboratorio</button></div>'; }
    b += list.length ? '<div class="lw-list">' + list.slice(0, m.more ? 500 : 60).map(x => lwRow(x.l, x.pid, true)).join('') + '</div>' + (list.length > 60 && !m.more ? '<button class="btn small ghost" data-act="labMoreDone">Ver los ' + list.length + '</button>' : '') :
      '<div class="empty">' + (tab === 'done' ? 'Todavía no hay trabajos entregados.' : tab === 'late' ? 'No hay trabajos atrasados.' : 'No hay trabajos ' + (tab === 'here' ? 'para probar o instalar.' : 'en curso.') + ' Tocá «+ Trabajo» o decí «nuevo trabajo de laboratorio».') + '</div>';
    return A.modalShell('Laboratorio', b + '</div>', '<button class="btn primary" data-act="closeModal">Listo</button>', true).replace('<div class="modal wide"', '<div class="modal wide lb2-modal"');
  };
  A.acts.labTab = el => { S.modal.tab = el.getAttribute('data-t'); S.modal.more = false; A.renderModal(); };
  A.acts.labFilter2 = el => { S.modal.lab = el.getAttribute('data-name'); A.renderModal(); };
  /* menú ⋮ de cada trabajo */
  A.acts.labMenu = el => { S.modal = { type: 'labMenu', pid: el.getAttribute('data-pid'), id: el.getAttribute('data-id'), back: S.modal }; A.renderModal(); };
  MF.labMenu = m => {
    const l = A.pd(m.pid).labs.filter(x => x.id === m.id)[0]; if (!l) return '';
    const it = (act, label, extra, cls) => '<button class="pm-it' + (cls ? ' ' + cls : '') + '" data-act="' + act + '" data-pid="' + m.pid + '" data-id="' + m.id + '"' + (extra || '') + '><b>' + label + '</b></button>';
    return A.modalShell(l.work + ' · ' + A.PAT(m.pid).name, '<div class="pm-list">' + (NEXT[l.status] || []).map(x => it('labMenuSt', 'Marcar: ' + x[1], ' data-st="' + x[0] + '"')).join('') +
      it('labMenuEdit', 'Editar el trabajo') + it('labWa', 'Mandar el pedido por WhatsApp al laboratorio') + it('labMenuPat', 'Ver la ficha del paciente') + '</div>', '<button class="btn" data-act="labMenuBack">Volver</button>');
  };
  A.acts.labMenuBack = () => { S.modal = S.modal.back || null; A.renderModal(); };
  A.acts.labMenuSt = el => { S.modal = S.modal.back || null; A.renderModal(); A.acts.labSt(el); };
  A.acts.labMenuEdit = el => { A.acts.labEdit(el); };
  A.acts.labMenuPat = el => { S.modal = null; A.renderModal(); A.openFicha(el.getAttribute('data-pid'), 'lab'); };
  /* + Trabajo desde la lista: primero se elige el paciente */
  A.acts.labPick = () => { S.modal = { type: 'labPick', back: S.modal, q: '' }; A.renderModal(); };
  MF.labPick = m => A.modalShell('Nuevo trabajo: ¿de qué paciente?', '<div class="field"><label for="lpQ">Buscar paciente</label><input id="lpQ" data-in="labPickQ" autocomplete="off" placeholder="Nombre, apellido o DNI" value="' + esc(m.q || '') + '"></div><div id="lpRes" class="pm-list"></div>', '<button class="btn" data-act="labMenuBack">Volver</button>');
  const pickRes = q => { const host = $('#lpRes'); if (!host) return; const r = N(q).length >= 2 ? A.searchPats(q, 12) : []; host.innerHTML = r.map(p => '<button class="pm-it" data-act="labPickGo" data-pid="' + p.id + '"><b>' + esc(p.name) + '</b><span>DNI ' + esc(p.dni || '—') + '</span></button>').join('') || (N(q).length >= 2 ? '<p class="hint">Sin resultados.</p>' : ''); };
  A.ins.labPickQ = el => { S.modal.q = el.value; pickRes(el.value); };
  A.modalAfter.labPick = m => { pickRes(m.q || ''); setTimeout(() => { const i = $('#lpQ'); if (i) i.focus(); }, 50); };
  A.acts.labPickGo = el => { S.modal = null; A.acts.labNew(el); };
  /* en la ficha del paciente, la misma lista compacta */
  const prevLabTab = A.render.labTab;
  A.render.labTab = pid => {
    const pd = A.pd(pid), l = (pd.labs || []).slice().sort((a, b) => (ACTIVE.indexOf(b.status) >= 0) - (ACTIVE.indexOf(a.status) >= 0) || ((b.sent || '') < (a.sent || '') ? -1 : 1));
    if (!prevLabTab) return '';
    return '<section class="card"><h2>Trabajos de laboratorio <span class="count">' + l.filter(x => ACTIVE.indexOf(x.status) >= 0).length + ' en curso</span></h2><div class="row-btns" style="margin-bottom:10px"><button class="btn primary" data-act="labNew" data-pid="' + pid + '">+ Nuevo trabajo</button></div>' +
      (l.length ? '<div class="lw-list">' + l.map(x => lwRow(x, pid, false)).join('') + '</div>' : '<div class="empty">No hay trabajos de laboratorio. Cargá coronas, prótesis, placas y demás para seguir en qué etapa está cada uno y cuándo vuelve.</div>') + '</section>';
  };

  /* =====================================================================
     AVISOS: LLEGÓ UN PACIENTE (marcado desde otro equipo, por ejemplo recepción)
     ===================================================================== */
  const NL = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  let nid = 1;
  /* en el teléfono: canal de importancia alta (aparece arriba como un mensaje de WhatsApp, con sonido y vibración) */
  let chanOk = null;
  const chan = ln => chanOk || (chanOk = Promise.resolve(ln.createChannel ? ln.createChannel({ id: 'ov-avisos', name: 'Avisos de OdontoVoz', description: 'Llegó un paciente, turnos online, stock, laboratorio y otros avisos', importance: 5, visibility: 1, vibration: true, lights: true, lightColor: '#0B6B6F' }) : null).catch(() => null));
  async function sysNotify(title, body, extra) {
    const p = PREF(); if (!p.system) return;
    if (A.pushCovers && A.pushCovers(extra)) return; /* ya lo avisa el servidor (push) */
    try {
      const ln = NL();
      if (ln) { await chan(ln); await ln.schedule({ notifications: [{ id: (Date.now() % 100000) + (nid++), title, body, largeBody: body, channelId: 'ov-avisos', smallIcon: 'ic_stat_ov', iconColor: '#0B6B6F', extra: extra || {}, group: 'odontovoz' }] }); return; }
      if ('Notification' in window && Notification.permission === 'granted') {
        const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) reg.showNotification(title, { body, icon: 'icon-192.png', tag: 'ov-llego', renotify: true });
        else new Notification(title, { body, icon: 'icon-192.png' });
      }
    } catch (e) { /* sin permiso */ }
  }
  function banner(items) {
    let host = $('#arrHost'); if (!host) { host = document.createElement('div'); host.id = 'arrHost'; host.setAttribute('aria-live', 'assertive'); document.body.appendChild(host); }
    items.forEach(x => {
      const p = A.PAT(x.pid), pro = A.PRO(x.pro), d = document.createElement('div'); d.className = 'arr';
      d.innerHTML = '<span class="arr-i" aria-hidden="true">🔔</span><span class="arr-t"><b>Llegó ' + esc(p ? p.name : 'un paciente') + '</b><span>Turno de las ' + A.mm(x.start) + (pro && A.PROS.length > 1 ? ' · ' + esc(pro.name) : '') + ' · está en la sala de espera</span></span>' +
        '<button class="btn small" data-act="arrOpen" data-id="' + x.id + '">Ver</button><button class="x" data-act="arrClose" aria-label="Cerrar aviso">×</button>';
      host.appendChild(d); setTimeout(() => { if (d.parentNode) { d.classList.add('out'); setTimeout(() => d.remove(), 400); } }, 30000);
    });
  }
  A.acts.arrClose = el => { const d = el.closest('.arr'); if (d) d.remove(); };
  A.acts.arrOpen = el => { const d = el.closest('.arr'); if (d) d.remove(); S.modal = null; A.renderModal(); S.panel = { type: 'appt', id: el.getAttribute('data-id') }; A.renderPanel(); };
  A.onArrivals = list => {
    const p = PREF(), mine = list.filter(x => !p.pro || x.pro === p.pro); if (!mine.length) return;
    if (p.sound) A.soundArrive();
    if (p.vibrate) { try { navigator.vibrate && navigator.vibrate([90, 70, 90]); } catch (e) { /* nada */ } }
    banner(mine);
    if (document.hidden || !document.hasFocus()) mine.forEach(x => { const pt = A.PAT(x.pid); sysNotify('Llegó ' + (pt ? pt.name : 'un paciente'), 'Turno de las ' + A.mm(x.start) + '. Está en la sala de espera.', { appt: x.id }); });
  };
  A.notifBg = () => { const p = PREF(); return !!(p.system || p.sound); };
  A.sysNotify = sysNotify; A.notifPref = PREF; A.notifPrefSave = savePref;

  /* ajustes de avisos y sonidos (cada equipo decide lo suyo) */
  A.acts.notifOpen = () => { if (A.hideDrawer) A.hideDrawer(); const g = $('#gearMenu'); if (g) g.hidden = true; S.modal = { type: 'notif' }; A.renderModal(); };
  MF.notif = () => {
    const p = PREF(), sw = (k, l, sub) => '<label class="nt-row"><span><b>' + l + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span><input type="checkbox" role="switch" data-chg="notifSet" data-k="' + k + '"' + (p[k] ? ' checked' : '') + '></label>';
    const perm = NL() ? '' : ('Notification' in window ? Notification.permission : 'unsupported');
    let b = '<h3 class="nt-h">Cuando recepción marca que llegó un paciente</h3>' + sw('sound', 'Sonido de aviso', 'Un timbre corto y suave') + sw('vibrate', 'Vibrar', 'En el celular') + sw('system', 'Notificación del sistema', 'Aparece aunque estés en otra app o con la pantalla bloqueada (si el teléfono no cerró OdontoVoz)');
    if (p.system && perm && perm !== 'granted') b += '<div class="row-btns"><button class="btn small primary" data-act="notifPerm">Permitir notificaciones</button></div>' + (perm === 'denied' ? '<p class="hint bad">El navegador tiene bloqueadas las notificaciones de OdontoVoz: habilitalas desde el candado de la barra de direcciones.</p>' : '');
    b += '<div class="field" style="margin-top:8px"><label for="ntPro">Avisarme de los pacientes de</label><select id="ntPro" data-chg="notifPro"><option value="">Todos los profesionales</option>' + A.PROS.map(x => '<option value="' + x.id + '"' + (p.pro === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div>';
    b += '<h3 class="nt-h">Al abrir la app</h3>' + sw('splash', 'Logo animado al abrir', 'Un segundo y medio') + sw('splashSound', 'Sonido al abrir', 'Un acorde suave y corto');
    b += '<p class="small-note">El aviso se ve, suena y vibra en este equipo cuando el cambio lo hace otro (por ejemplo, la PC de recepción). Para que llegue, OdontoVoz tiene que estar abierta o en segundo plano en este equipo.</p>';
    return A.modalShell('Avisos y sonidos', b, '<button class="btn" data-act="notifTest">Probar aviso</button><button class="btn primary" data-act="closeModal">Listo</button>');
  };
  A.chg.notifSet = el => {
    const p = PREF(); p[el.getAttribute('data-k')] = el.checked; savePref(p);
    if (el.getAttribute('data-k') === 'system' && el.checked) A.acts.notifPerm(); else A.renderModal();
  };
  A.chg.notifPro = el => { const p = PREF(); p.pro = el.value; savePref(p); };
  A.acts.notifPerm = async () => {
    try {
      const ln = NL();
      if (ln) { const r = await ln.requestPermissions(); if (r && r.display !== 'granted') A.toast('Sin permiso no se pueden mostrar notificaciones. Activalo en los ajustes del teléfono › Apps › OdontoVoz › Notificaciones.'); }
      else if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
    } catch (e) { /* nada */ }
    if (S.modal && S.modal.type === 'notif') A.renderModal();
  };
  A.acts.notifTest = () => {
    audio();
    const t = A.today(), a = (A.day ? A.day(t) : []).filter(x => x.pid && A.PAT(x.pid))[0];
    const fake = a ? { id: a.id, pid: a.pid, start: a.start, pro: a.pro } : { id: '', pid: (A.PATS[0] || {}).id, start: A.nowMin ? A.nowMin() : 600, pro: (A.PROS[0] || {}).id };
    const p = PREF(), keep = p.pro; p.pro = ''; savePref(p); A.onArrivals([fake]); p.pro = keep; savePref(p);
    sysNotify('Así se ve el aviso', 'Llegó un paciente: está en la sala de espera.');
  };
  /* botón en Ajustes */
  const anchor = $('#gearMenu .dnav[data-act="impOpen"]') || $('#gearMenu .dnav[data-act="osOpen"]') || $('#gearMenu .dnav[data-act="catalogOpen"]');
  const BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
  if (anchor) anchor.insertAdjacentHTML('afterend', '<button class="dnav" data-act="notifOpen">' + BELL + '<span>Avisos y sonidos</span></button>');
  else { const g = $('#gearMenu'); if (g) g.insertAdjacentHTML('beforeend', '<button class="dnav" data-act="notifOpen">' + BELL + '<span>Avisos y sonidos</span></button>'); }

  /* ---------- estilos ---------- */
  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '#ovSplash{position:fixed;inset:0;z-index:400;display:grid;place-items:center;background:radial-gradient(120% 90% at 50% 25%,#12666a,#072f33 72%);color:#9ee6e0;pointer-events:none;transition:opacity .4s ease}#ovSplash.out{opacity:0}' +
    '.sp-box{display:flex;flex-direction:column;align-items:center;gap:12px}.sp-logo{width:88px;height:88px;animation:spPop .55s cubic-bezier(.2,.9,.3,1.2) both}.sp-logo svg{width:100%;height:100%}' +
    '.sp-tooth{stroke-dasharray:120;stroke-dashoffset:120;animation:spDraw .9s .1s ease-out forwards}.sp-wave{opacity:0;animation:spIn .35s .75s ease forwards}' +
    '.sp-name{font:700 26px/1 var(--f-sans,system-ui);color:#eafaf8;letter-spacing:.01em;opacity:0;animation:spRise .45s .55s ease forwards}' +
    '@keyframes spPop{from{transform:scale(.6);opacity:0}}@keyframes spDraw{to{stroke-dashoffset:0}}@keyframes spIn{to{opacity:1}}@keyframes spRise{from{transform:translateY(8px)}to{opacity:1;transform:none}}' +
    '@media (prefers-reduced-motion:reduce){#ovSplash *{animation:none!important;opacity:1!important;stroke-dashoffset:0!important}}' +
    '.kebab{flex:0 0 auto;width:40px;height:40px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);display:inline-grid;place-items:center;cursor:pointer;padding:0}.kebab:hover{background:var(--accent-soft)}' +
    '.prow-w{position:relative;display:flex;align-items:stretch}.prow-w>.prow{flex:1;min-width:0;padding-right:54px}.prow-w>.kebab{position:absolute;right:8px;top:50%;transform:translateY(-50%);border-color:transparent;background:transparent}' +
    '.panel-head .kebab{margin-left:auto;margin-right:6px}.fh .top-right .kebab{width:38px;height:38px}' +
    '.pm-list{display:flex;flex-direction:column;gap:8px}.pm-it{display:flex;flex-direction:column;gap:2px;text-align:left;padding:13px 14px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);cursor:pointer;font:inherit}.pm-it b{font-size:16px}.pm-it span{font-size:13.5px;color:var(--ink-2)}.pm-it:hover{background:var(--accent-soft)}.pm-it.danger b{color:var(--st-no,#c0392b)}' +
    '.pd-list{margin:8px 0 12px;padding-left:20px;display:grid;gap:4px}.pd-warn{border:1px solid #e0b25a;background:#fff6e2;color:#5c4100;border-radius:12px;padding:10px 12px;margin-bottom:8px;font-size:14.5px;line-height:1.4}' +
    '.save-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}.save-ok{color:var(--st-done,#2a7a4b);font-weight:700;font-size:14px}' +
    '.ph-more summary{cursor:pointer;color:var(--accent);font-weight:600;padding:4px 0 8px}.ph-row{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:8px}.ph-th{flex:0 0 auto;width:76px;height:76px;border-radius:10px;overflow:hidden;border:1px solid var(--line);padding:0;background:#000;cursor:pointer}.ph-th img{width:100%;height:100%;object-fit:cover}' +
    '.ph-h{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}.ph-h h2{margin:0}.ph-add{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ph-add select{min-height:36px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);padding:0 8px}' +
    '.lb2-modal{width:min(1080px,96vw);max-width:min(1080px,96vw)}.lb2{display:flex;flex-direction:column;gap:12px}' +
    '.lb2-tabs{display:flex;gap:6px;flex-wrap:wrap}@media (max-width:640px){.lb2-tabs{flex-wrap:nowrap;overflow-x:auto;margin:0 -12px;padding:0 12px 2px;scrollbar-width:none}.lb2-t{flex:0 0 auto}}.lb2-t{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:7px 12px;font:600 14px/1.1 inherit;cursor:pointer}.lb2-t b{margin-left:4px}.lb2-t[aria-selected="true"]{background:var(--accent);border-color:var(--accent);color:#fff}.lb2-t.bad{border-color:var(--st-no,#c0392b);color:var(--st-no,#c0392b)}.lb2-t.bad[aria-selected="true"]{background:var(--st-no,#c0392b);color:#fff}' +
    '.lb2-bar{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}.lb2-labs{display:flex;gap:6px;flex-wrap:wrap}.lb2-btns{display:flex;gap:6px}.lb2-lab{font-size:14px;color:var(--ink-2);display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
    '.lw-list{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface)}' +
    '.lw{display:grid;grid-template-columns:minmax(0,1fr) 150px auto;align-items:center;gap:10px;padding:8px 10px 8px 12px;border-top:1px solid var(--line);border-left:4px solid var(--accent)}.lw:first-child{border-top:0}' +
    '.lw.late{border-left-color:var(--st-no,#c0392b);background:color-mix(in srgb,var(--st-no,#c0392b) 5%,var(--surface))}.lw.st-prueba,.lw.st-listo{border-left-color:#d49a1f}.lw.st-instalado{border-left-color:var(--line);opacity:.85}.lw.st-porenviar{border-left-color:var(--ink-2)}' +
    '.lw-main{all:unset;cursor:pointer;display:flex;flex-direction:column;gap:2px;min-width:0}.lw-main:focus-visible{outline:3px solid var(--accent);outline-offset:2px;border-radius:6px}' +
    '.lw-1{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;min-width:0}.lw-1 b{font-size:15.5px}.lw-w{font-size:15px;color:var(--ink)}.lw-1 b+.lw-w{color:var(--ink-2)}.lw-2{font-size:13px;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.lw-st{display:flex;flex-direction:column;gap:1px;font-size:13px}.lw-due{font-weight:700}.lw-due.late{color:var(--st-no,#c0392b)}.lw-due.soon{color:#a86f00}.lw-due.here{color:var(--accent)}.lw-s{color:var(--ink-2)}' +
    '.lw-act{display:flex;gap:6px;align-items:center;justify-content:flex-end}.lw-act .kebab{width:36px;height:36px;border-color:transparent;background:transparent}' +
    '@media (max-width:640px){.lw{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"m a" "s a";row-gap:2px}.lw-main{grid-area:m}.lw-st{grid-area:s;flex-direction:row;gap:8px}.lw-act{grid-area:a;flex-direction:column;align-items:flex-end}.lw-act .btn{max-width:118px;white-space:normal;line-height:1.15;padding:6px 8px}.lb2-modal .m-body{padding-left:12px;padding-right:12px}}' +
    '#arrHost{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:300;display:flex;flex-direction:column;gap:8px;width:min(560px,calc(100vw - 20px))}' +
    '.arr{display:flex;align-items:center;gap:10px;background:#0b4d50;color:#fff;border-radius:16px;padding:10px 10px 10px 14px;box-shadow:0 12px 30px rgba(0,0,0,.3);animation:arrIn .35s cubic-bezier(.2,.9,.3,1.2) both;transition:opacity .35s,transform .35s}.arr.out{opacity:0;transform:translateY(-10px)}' +
    '.arr-i{font-size:22px}.arr-t{flex:1;min-width:0;display:flex;flex-direction:column}.arr-t b{font-size:16px}.arr-t span{font-size:13.5px;opacity:.9}.arr .btn{background:#fff;color:#0b4d50;border-color:#fff}.arr .x{background:transparent;border:0;color:#fff;font-size:22px;width:34px;height:34px;cursor:pointer}' +
    '@keyframes arrIn{from{transform:translateY(-16px);opacity:0}}' +
    '.nt-h{font-size:15px;margin:6px 0 4px}.nt-row{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--line);cursor:pointer}.nt-row span{display:flex;flex-direction:column}.nt-row small{color:var(--ink-2);font-size:13px}.nt-row input{width:22px;height:22px;flex:0 0 auto}' +
    '</style>');
})();
