/* ===== 1.49: pasar el usuario de otro consultorio (sin correo) a mi cuenta propia, en «Dónde trabajás» ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, CL = A.cloud;
  if (!CL || !MF.places) return;
  const DOM = '.equipo.odontovoz.app';
  const clean = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const subEmail = (code, user) => clean(user) + '@' + clean(code).replace(/[^a-z0-9]/g, '') + DOM;
  const noServer = e => e && (e.status === 404 || /could not find the function|schema cache/i.test(String(e.message || '')));

  /* en «Dónde trabajás»: el acceso a vincular */
  const prev = MF.places;
  MF.places = function () {
    let h = prev.apply(this, arguments); if (typeof h !== 'string' || !CL.session) return h;
    const box = '<div class="lk-box"><b>¿Entrás a otro consultorio con un usuario que te dieron?</b><span>Si ya tenés un usuario (sin correo) de otro consultorio y ahora tenés tu propia cuenta, pasalo a esta cuenta: con un solo ingreso vas a poder trabajar en los dos.</span><button class="btn small" data-act="plLinkOpen">Vincular mi usuario de otro consultorio</button></div>';
    return h.indexOf('<details class="pl-code"') >= 0 ? h.replace('<details class="pl-code"', box + '<details class="pl-code"') : h.replace('<div class="m-foot"', box + '<div class="m-foot"');
  };

  A.acts.plLinkOpen = () => { S.modal = { type: 'plLink' }; A.renderModal(); const c = $('#lkCode'); if (c && !A.isNarrow()) c.focus(); };
  MF.plLink = () => A.modalShell('Vincular mi usuario de otro consultorio',
    '<p class="m-lead">Ingresá los datos del usuario que te dio el otro consultorio (los mismos con los que entrabas). Ese acceso pasa a <b>esta cuenta</b> y desde acá elegís dónde trabajar.</p>' +
    '<div class="field"><label for="lkCode">Cuenta del consultorio</label><input id="lkCode" autocapitalize="none" spellcheck="false" placeholder="Ej.: castelli" autocomplete="off"></div>' +
    '<div class="field"><label for="lkUser">Usuario</label><input id="lkUser" autocapitalize="none" spellcheck="false" placeholder="Ej.: marta.gomez" autocomplete="off"></div>' +
    '<div class="field"><label for="lkPass">Contraseña de ese usuario</label><input id="lkPass" type="password" autocomplete="off"></div>' +
    '<div id="lkMsg" class="hint bad" role="alert"></div>' +
    '<p class="hint">Después de vincular, ese usuario viejo deja de funcionar: vas a entrar siempre con tu cuenta. Lo hecho en ese consultorio (notas, turnos) queda igual. El dueño del consultorio puede quitarte el acceso cuando quiera, como antes.</p>',
    '<button class="btn" data-act="plOpen">Volver</button><button class="btn primary" id="lkGo" data-act="plLinkGo">Vincular</button>');
  MF.plLinked = m => A.modalShell('Listo', '<p class="m-lead">✓ Se vinculó. Ahora ese consultorio aparece en <b>Dónde trabajás</b> con tu cuenta.</p><p class="hint">Tocá el consultorio para entrar. Desde ahora entrás siempre con tu correo y tu contraseña; el usuario viejo ya no se usa.</p>', '<button class="btn primary" data-act="plOpen">Ver dónde trabajás</button>');

  A.acts.plLinkGo = async () => {
    const code = clean(($('#lkCode') || {}).value).replace(/[^a-z0-9]/g, ''), user = clean(($('#lkUser') || {}).value), pass = ($('#lkPass') || {}).value || '';
    const say = t => { const e = $('#lkMsg'); if (e) e.textContent = t || ''; };
    if (code.length < 3) return say('Escribí la cuenta del consultorio (por ejemplo «castelli»).');
    if (!/^[a-z0-9._-]{3,30}$/.test(user)) return say('Revisá el usuario: va sin espacios, por ejemplo «marta.gomez».');
    if (!pass) return say('Escribí la contraseña de ese usuario.');
    if (!CL.session) return say('Ingresá primero con tu cuenta.');
    const b = $('#lkGo'); if (b) { b.disabled = true; b.textContent = 'Vinculando…'; } say('');
    let tok = null;
    try {
      const s1 = await CL.api('/rest/v1/rpc/ov_link_start', { method: 'POST', body: {} });
      if (!s1 || !s1.ok || !s1.code) throw new Error((s1 && s1.msg) || 'No se pudo empezar.');
      /* se entra con el usuario viejo sin tocar la sesión de esta cuenta */
      const d = await CL.http('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email: subEmail(code, user), password: pass } });
      tok = d && d.access_token; if (!tok) throw new Error('No se pudo ingresar con ese usuario.');
      const r = await CL.http('/rest/v1/rpc/ov_link_accept', { method: 'POST', auth: false, headers: { Authorization: 'Bearer ' + tok }, body: { p_code: s1.code } });
      if (!r || !r.ok) throw new Error((r && r.msg) || 'No se pudo vincular.');
      try { if (CL.checkLicense) await CL.checkLicense(true); } catch (e) { /* se actualiza solo más tarde */ }
      S.modal = { type: 'plLinked', n: r.n }; A.renderModal();
    } catch (e) {
      const m = String(e && e.message || '');
      say(noServer(e) ? 'Falta actualizar el servidor (vincular-usuario.sql). Avisale a soporte.' : /no coinciden/i.test(m) ? 'La cuenta, el usuario o la contraseña no coinciden. Revisalos.' : m || 'No se pudo vincular. Probá de nuevo.');
      const b2 = $('#lkGo'); if (b2) { b2.disabled = false; b2.textContent = 'Vincular'; }
    } finally {
      if (tok) { try { await CL.http('/auth/v1/logout', { method: 'POST', auth: false, headers: { Authorization: 'Bearer ' + tok } }); } catch (e) { /* nada */ } }
    }
  };

  const css = document.createElement('style'); css.id = 'ovApp132';
  css.textContent = '.lk-box{display:flex;flex-direction:column;gap:6px;align-items:flex-start;border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:12px 0;background:var(--surface-2)}.lk-box span{font-size:.88rem;line-height:1.4;color:var(--ink-2)}';
  document.head.appendChild(css);
})();
