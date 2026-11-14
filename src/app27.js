/* ===== 1.18: puesta en regla legal: aceptación de la voz y de los términos, baja / arrepentimiento / eliminación, consentimiento de datos del paciente ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, CL = A.cloud;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const WEB = 'https://odontovoz.com.ar/';
  const VER = A.TERMS_VER || '2026-11-05', VOICE_VER = '2026-11-05';
  const real = () => !!(CL && CL.session && !A.DEMO);
  const rpc = (fn, body) => CL.api('/rest/v1/rpc/' + fn, { method: 'POST', body: body || {} });

  /* =====================================================================
     1) DICTADO POR VOZ: el audio pasa por Google. Se pide aceptación en cada equipo antes de usarla.
     ===================================================================== */
  const voiceOk = () => LS.get('odontovoz.voiceOk', '') === VOICE_VER;
  A.voiceAllowed = voiceOk;
  function wrapSR(name) {
    const Orig = window[name]; if (!Orig || Orig.__ovWrapped) return;
    const W = function () {
      const r = new Orig(); const st = r.start;
      r.start = function () {
        if (voiceOk()) return st.apply(r, arguments);
        askVoice();
        setTimeout(() => { try { if (typeof r.onerror === 'function') r.onerror({ error: 'not-allowed', message: 'consent' }); } catch (e) { /* nada */ } }, 0);
      };
      return r;
    };
    W.__ovWrapped = true; W.prototype = Orig.prototype;
    try { window[name] = W; } catch (e) { /* propiedad de solo lectura */ }
  }
  wrapSR('SpeechRecognition'); wrapSR('webkitSpeechRecognition');
  /* mientras se muestra el aviso de la voz no aparecen los mensajes de «micrófono bloqueado» */
  const toastPrev = A.toast;
  A.toast = function () { if (S.modal && S.modal.type === 'voiceOk') return; return toastPrev.apply(this, arguments); };
  let asking = false;
  function askVoice() { if (asking || (S.modal && S.modal.type === 'voiceOk')) return; asking = true; S.modal = { type: 'voiceOk', back: S.modal }; A.renderModal(); }
  MF.voiceOk = () => A.modalShell('Antes de usar la voz',
    '<p>Para pasar tu voz a texto, OdontoVoz usa el reconocimiento de voz de <b>Google</b> que viene en Chrome y en Android. <b>El audio de lo que dictás se envía a Google</b>, principalmente a servidores en EE. UU., y puede incluir datos de salud de tus pacientes.</p>' +
    '<ul class="plain"><li>Google lo usa para convertirlo en texto; nosotros no guardamos el audio.</li><li>Evitá dictar nombres completos o DNI cuando no haga falta, y usala donde no te escuchen terceros.</li><li>Si no lo aceptás, la app funciona igual escribiendo. Podés cambiarlo cuando quieras en Menú › Cuenta y equipos.</li></ul>' +
    '<label class="chk"><input type="checkbox" id="voOk"> <span>Entiendo y acepto que el audio de lo que dicto se envíe a Google para pasarlo a texto, según la <a href="' + WEB + 'privacidad.html#voz" target="_blank" rel="noopener">política de privacidad</a>.</span></label><div class="hint bad" id="voMsg"></div>',
    '<button class="btn" data-act="voiceNo">Ahora no</button><button class="btn primary" data-act="voiceYes">Activar la voz</button>');
  A.acts.voiceYes = () => {
    if (!$('#voOk') || !$('#voOk').checked) { $('#voMsg').textContent = 'Para activar la voz, tildá la casilla.'; return; }
    LS.set('odontovoz.voiceOk', VOICE_VER); asking = false; S.modal = null; A.renderModal();
    if (real()) rpc('ov_accept', { p_kind: 'voz', p_version: VOICE_VER, p_accepted: true }).catch(() => { /* se registra la próxima vez */ });
    A.toast('Listo: la voz quedó activada en este equipo. Tocá el micrófono de nuevo.');
  };
  A.acts.voiceNo = () => { asking = false; S.modal = null; A.renderModal(); A.toast('La voz queda apagada. Podés seguir escribiendo.'); };
  A.acts.voiceOff = () => { LS.set('odontovoz.voiceOk', null); if (real()) rpc('ov_accept', { p_kind: 'voz', p_version: VOICE_VER, p_accepted: false }).catch(() => {}); A.renderModal(); A.toast('Voz desactivada en este equipo.'); };

  /* =====================================================================
     2) TÉRMINOS: se registra en el servidor qué versión aceptó cada cuenta; si cambian, se piden de nuevo
     ===================================================================== */
  let termsBusy = false;
  async function checkTerms() {
    if (!real() || termsBusy) return; const l = CL.lic; if (!l || !('terms_version' in l)) return;
    if (l.terms_version === VER) return;
    /* recién creada: ya aceptó en el registro, se guarda sin volver a preguntar */
    if (LS.get('odontovoz.termsSigned', '') === VER) { termsBusy = true; try { await rpc('ov_accept', { p_kind: 'terminos', p_version: VER, p_accepted: true }); l.terms_version = VER; } catch (e) { /* reintenta */ } termsBusy = false; return; }
    if (!S.modal || S.modal.type !== 'termsNew') { S.modal = { type: 'termsNew' }; A.renderModal(); }
  }
  MF.termsNew = () => '<div class="modal-scrim"><div class="modal" role="dialog" aria-modal="true" aria-label="Términos actualizados"><div class="m-head"><h2>Actualizamos los términos y la privacidad</h2></div><div class="m-body">' +
    '<p>Para seguir usando OdontoVoz con tu cuenta, leé y aceptá la versión del ' + esc(A.fmtDMY ? A.fmtDMY(VER) : VER) + '. Los cambios principales:</p><ul class="plain"><li>Términos y condiciones completos, con el <b>contrato de encargado de datos</b> de tus pacientes.</li><li>Botón de baja, arrepentimiento en 10 días y cómo pedir la eliminación de la cuenta.</li><li>El dictado por voz usa Google: ahora se pide permiso en cada equipo.</li><li>Las «recetas» pasan a llamarse «indicaciones» y aclaran que no sirven para farmacia.</li></ul>' +
    '<p><a href="' + WEB + 'terminos.html" target="_blank" rel="noopener">Leer los términos y condiciones</a> · <a href="' + WEB + 'privacidad.html" target="_blank" rel="noopener">Leer la política de privacidad</a></p>' +
    '<label class="chk"><input type="checkbox" id="tnOk"> Leí y acepto los términos y condiciones (incluido el contrato de encargado) y la política de privacidad.</label><div class="hint bad" id="tnMsg"></div></div>' +
    '<div class="m-foot"><a class="btn" href="' + WEB + 'baja.html" target="_blank" rel="noopener">No acepto: quiero darme de baja</a><button class="btn primary" data-act="termsYes">Aceptar y seguir</button></div></div></div>';
  A.acts.termsYes = async () => {
    if (!$('#tnOk').checked) { $('#tnMsg').textContent = 'Para seguir, tildá la casilla.'; return; }
    try { await rpc('ov_accept', { p_kind: 'terminos', p_version: VER, p_accepted: true }); if (CL.lic) CL.lic.terms_version = VER; LS.set('odontovoz.termsSigned', VER); S.modal = null; A.renderModal(); A.toast('Gracias. Términos aceptados.'); }
    catch (e) { $('#tnMsg').textContent = /could not find|schema cache|404/i.test(String(e.message)) ? 'El servidor todavía se está actualizando. Probá en unos minutos.' : (e.message || 'Sin conexión.'); }
  };
  setInterval(checkTerms, 30000); setTimeout(checkTerms, 4000);

  /* =====================================================================
     3) BAJA, ARREPENTIMIENTO Y ELIMINACIÓN DE LA CUENTA (también en la web: baja.html)
     ===================================================================== */
  const KINDS = {
    baja: { t: 'Dar de baja la suscripción', p: 'Dejamos de cobrarte desde el próximo mes. La cuenta funciona hasta el final del período pagado y después queda en <b>solo lectura</b>: podés ver y descargar todo. No se borra nada.', ok: 'Quiero dar de baja mi suscripción.' },
    arrepentimiento: { t: 'Arrepentimiento (10 días)', p: 'Dentro de los <b>10 días corridos</b> desde que contrataste o pagaste por primera vez, revocás la contratación sin dar motivos y te devolvemos todo lo pagado.', ok: 'Quiero revocar la contratación y que me devuelvan lo pagado.' },
    eliminar: { t: 'Eliminar la cuenta y todos los datos', p: 'Se borran la cuenta, los pacientes, las historias clínicas, los turnos, las fotos y los documentos. <b>No se puede deshacer.</b> Antes descargá una copia: la ley te obliga a conservar las historias clínicas al menos 10 años (Ley 26.529, art. 18).', ok: 'Descargué mi copia y entiendo que se borra todo y no se puede deshacer.' }
  };
  A.acts.reqOpen = () => { S.modal = { type: 'reqPick' }; A.renderModal(); };
  MF.reqPick = () => A.modalShell('Baja o eliminación', '<div class="setup-grid">' + Object.keys(KINDS).map(k => '<button class="setup-card" data-act="reqGo" data-k="' + k + '"><b>' + esc(KINDS[k].t) + '</b><span>' + KINDS[k].p.replace(/<[^>]+>/g, '') + '</span></button>').join('') + '</div><p class="hint">También se puede hacer sin entrar a la app, desde <a href="' + WEB + 'baja.html" target="_blank" rel="noopener">la página de baja</a>.</p>',
    '<button class="btn primary" data-act="closeModal">Volver</button>');
  A.acts.reqGo = el => { S.modal = { type: 'reqForm', k: el.getAttribute('data-k') }; A.renderModal(); };
  MF.reqForm = m => {
    const K = KINDS[m.k];
    if (m.done) return A.modalShell('Pedido recibido', '<p>Tu código de constancia:</p><div class="req-code">' + esc(m.done.code) + '</div><p class="hint">' + esc(K.t) + ' · ' + new Date(m.done.at || Date.now()).toLocaleString('es-AR') + '. Guardalo: te escribimos al correo de la cuenta dentro de las 24 horas para confirmarlo.</p>' + (m.k === 'eliminar' && m.media != null ? '<p class="hint">Se borraron ' + m.media + ' fotos de la nube.</p>' : ''),
      '<button class="btn primary" data-act="closeModal">Listo</button>');
    return A.modalShell(K.t, '<p>' + K.p + '</p>' + (m.k === 'eliminar' ? '<div class="row-btns"><button class="btn small" data-act="cfgBackup">Descargar mi copia ahora</button></div>' : '') +
      '<div class="field"><label for="rqDt">Comentario (opcional)</label><textarea id="rqDt" rows="2" maxlength="1000"></textarea></div>' +
      (m.k === 'eliminar' ? '<div class="field"><label for="rqTy">Para confirmar, escribí ELIMINAR</label><input id="rqTy" autocomplete="off"></div>' : '') +
      '<label class="chk"><input type="checkbox" id="rqOk"> ' + esc(K.ok) + '</label><div class="hint bad" id="rqMsg"></div>',
    '<button class="btn" data-act="reqOpen">Volver</button><button class="btn ' + (m.k === 'eliminar' ? 'danger' : 'primary') + '" data-act="reqSend">Enviar pedido</button>');
  };
  /* borra las fotos de la nube de esta cuenta (el servidor no deja borrarlas desde la base) */
  async function wipeMedia() {
    const conf = CL.conf(), uid = CL.session.user.id, H = { apikey: conf.key, Authorization: 'Bearer ' + CL.session.access_token, 'Content-Type': 'application/json' };
    let n = 0;
    const list = async prefix => { const r = await fetch(conf.url + '/storage/v1/object/list/ov-media', { method: 'POST', headers: H, body: JSON.stringify({ prefix, limit: 1000, offset: 0 }) }); return r.ok ? r.json() : []; };
    const walk = async prefix => { const items = await list(prefix); let files = []; for (const it of items) { if (it.id) files.push(prefix + it.name); else files = files.concat(await walk(prefix + it.name + '/')); } return files; };
    const files = await walk(uid + '/');
    for (let i = 0; i < files.length; i += 100) { const part = files.slice(i, i + 100); const r = await fetch(conf.url + '/storage/v1/object/ov-media', { method: 'DELETE', headers: H, body: JSON.stringify({ prefixes: part }) }); if (r.ok) n += part.length; }
    return n;
  }
  A.acts.reqSend = async () => {
    const m = S.modal, msg = $('#rqMsg');
    if (!$('#rqOk').checked) { msg.textContent = 'Tildá la casilla para confirmar.'; return; }
    if (m.k === 'eliminar' && ($('#rqTy').value || '').trim().toUpperCase() !== 'ELIMINAR') { msg.textContent = 'Escribí ELIMINAR para confirmar.'; return; }
    if (!real()) { window.open(WEB + 'baja.html#' + m.k, '_blank', 'noopener'); return; }
    msg.textContent = 'Enviando…';
    try {
      let media = null;
      if (m.k === 'eliminar') { try { media = await wipeMedia(); } catch (e) { media = null; } try { await rpc('ov_delete_my_data'); } catch (e) { /* el administrador borra el resto */ } }
      const r = await rpc('ov_request', { p_kind: m.k, p_email: '', p_name: (A.PROS[0] || {}).name || '', p_detail: ($('#rqDt').value || '').trim() });
      if (!r || !r.ok) { msg.textContent = (r && r.msg) || 'No se pudo enviar.'; return; }
      S.modal = Object.assign({}, m, { done: r, media }); A.renderModal();
    } catch (e) { msg.textContent = /could not find|schema cache/i.test(String(e.message)) ? 'El servidor todavía se está actualizando: usá la página de baja.' : (e.message || 'Sin conexión.'); }
  };

  /* en «Cuenta y equipos»: voz, documentos legales, baja */
  const acctPrev = MF.acct;
  if (acctPrev) MF.acct = m => {
    const h = acctPrev(m);
    const block = '<div class="block"><h3>Privacidad y legales</h3>' +
      '<div class="lg-row"><span>Dictado por voz en este equipo: <b>' + (voiceOk() ? 'activado' : 'apagado') + '</b></span>' + (voiceOk() ? '<button class="btn small" data-act="voiceOff">Desactivar</button>' : '<button class="btn small" data-act="voiceAsk">Activar</button>') + '</div>' +
      '<div class="lg-row"><span>Términos aceptados: <b>' + esc((CL.lic && CL.lic.terms_version) || (LS.get('odontovoz.termsSigned', '') || '—')) + '</b></span><span><a href="' + WEB + 'terminos.html" target="_blank" rel="noopener">Términos</a> · <a href="' + WEB + 'privacidad.html" target="_blank" rel="noopener">Privacidad</a></span></div>' +
      '<div class="hint" style="margin:6px 0">Si tenés pacientes, inscribí tu base de datos en el <a href="https://www.argentina.gob.ar/aaip/datospersonales/registro" target="_blank" rel="noopener">Registro Nacional de Bases de Datos (AAIP)</a> y pediles el consentimiento con la plantilla «Uso de datos personales».</div>' +
      '<div class="row-btns"><button class="btn small" data-act="reqOpen">Baja, arrepentimiento o eliminar la cuenta</button></div></div>';
    return h.replace('<div class="block"><h3>Bloqueo con PIN</h3>', block + '<div class="block"><h3>Bloqueo con PIN</h3>');
  };
  A.acts.voiceAsk = () => askVoice();

  /* =====================================================================
     4) PLANTILLA: CONSENTIMIENTO PARA EL USO DE DATOS PERSONALES (Ley 25.326, arts. 5, 6 y 7)
     ===================================================================== */
  if (A.CONSENTS) {
    A.CONSENTS.datos = { title: 'Uso de datos personales', proc: () => '', risks: [], alts: '' };
    const cbPrev = A.consentBody;
    A.consentBody = (pid, tpl) => {
      if (tpl !== 'datos') return cbPrev(pid, tpl);
      const pro = A.PRO(A.PAT(pid).pro) || {}, clin = A.CLINIC || 'el consultorio';
      return { title: 'Consentimiento para el uso de datos personales', lead: 'Información y consentimiento según la Ley 25.326 de Protección de Datos Personales y la Ley 26.529 de Derechos del Paciente.', sections: [
        { h: 'Responsable', p: clin + (A.CFG && A.CFG.addr ? ', ' + A.CFG.addr : '') + '. Profesional: ' + (pro.name || '') + (pro.mat ? ', ' + pro.mat : '') + '.' },
        { h: 'Para qué se usan mis datos', p: 'Para mi atención odontológica: historia clínica, turnos, presupuestos, cobros, recordatorios y comunicaciones sobre mi tratamiento. No se usan para publicidad ni se ceden a terceros, salvo obligación legal, a mi obra social para lo que corresponda o con mi autorización.' },
        { h: 'Qué datos', p: 'Datos de identificación y contacto, obra social, y datos de salud (antecedentes, diagnósticos, tratamientos, radiografías y fotos clínicas). Los datos de salud son sensibles y están protegidos por el secreto profesional.' },
        { h: 'Dónde se guardan', p: 'En el sistema de gestión OdontoVoz, de ROAN corp, que los guarda por cuenta del consultorio en servidores de la Unión Europea, cifrados y con acceso restringido. La historia clínica se conserva al menos 10 años (Ley 26.529, art. 18).' },
        { h: 'Comunicaciones', p: 'Acepto recibir recordatorios de turnos e información sobre mi tratamiento por WhatsApp, mensaje o correo al contacto que di. Puedo pedir que no me escriban por esos medios.' },
        { h: 'Mis derechos', p: 'Puedo pedir acceso a mis datos y a mi historia clínica, su rectificación, actualización o supresión cuando no sea obligatorio conservarlos (Ley 25.326, arts. 14 a 16; Ley 26.529, art. 14). El acceso es gratuito a intervalos no menores a seis meses. LA AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.' },
        { h: 'Declaración', list: ['Fui informado/a de lo anterior de forma clara.', 'Doy mi consentimiento libre, expreso e informado para el tratamiento de mis datos, incluidos los de salud, con las finalidades descriptas.', 'Sé que puedo revocar este consentimiento, salvo en lo que la ley obligue a conservar.'] }
      ] };
    };
  }

  /* estilos */
  const css = document.createElement('style');
  css.textContent = '.lg-row{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid var(--line);font-size:14px}.req-code{font:800 26px var(--f-mono,monospace);letter-spacing:.06em;margin:4px 0 8px}';
  document.head.appendChild(css);
})();
