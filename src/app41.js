/* ===== 1.31: entrar con usuario del equipo, sin correo (Cuenta + Usuario + Contraseña) y lugares recordados ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, esc = A.esc, CL = A.cloud;
  if (!CL || !CL.showLogin) return;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const DOM = '.equipo.odontovoz.app';
  const clean = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const subEmail = (code, user) => clean(user) + '@' + clean(code).replace(/[^a-z0-9]/g, '') + DOM;
  /* lugares donde se entró desde este equipo (sin contraseñas) */
  const places = () => { try { const l = JSON.parse(LS.get('odontovoz.places', '[]')); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
  const savePlace = p => { const l = places().filter(x => !(x.code === p.code && x.user === p.user)); l.unshift(p); LS.set('odontovoz.places', JSON.stringify(l.slice(0, 8))); };
  A.placesList = places;

  const LOGO = '<svg viewBox="0 0 32 32" width="44" height="44" fill="none" aria-hidden="true"><path d="M9 4c-3.2 0-5.5 2.6-5.5 6 0 2.6 1 4.4 1.8 6.6.9 2.5.9 5.4 1.9 8.5.5 1.6 2.4 1.7 3 .1.9-2.4 1.1-5.2 2.4-5.2h2.8c1.3 0 1.5 2.8 2.4 5.2.6 1.6 2.5 1.5 3-.1 1-3.1 1-6 1.9-8.5.8-2.2 1.8-4 1.8-6.6 0-3.4-2.3-6-5.5-6-2.1 0-3.2 1.1-5.2 1.1S11.1 4 9 4z" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/></svg>';
  const prev = CL.showLogin;
  CL.showLogin = (tab, msg) => {
    /* si la última vez se entró con usuario del equipo, se abre directo esa forma */
    if (tab === 'in' && LS.get('odontovoz.lgKind', '') === 'team' && !CL._forceMail) tab = 'team';
    CL._forceMail = false;
    if (tab !== 'team') {
      prev(tab, msg);
      if (tab === 'in' || !tab) {
        const seg = document.querySelector('#loginWrap .seg');
        if (seg && !document.querySelector('#loginWrap .lg-team')) seg.insertAdjacentHTML('afterend', '<button type="button" class="btn lg-team" data-act="lgTeam"><span aria-hidden="true">👥</span> Entrar con usuario del equipo <small>(sin correo: cuenta, usuario y contraseña)</small></button>');
      }
      return;
    }
    let w = $('#loginWrap'); if (!w) { w = document.createElement('div'); w.id = 'loginWrap'; w.className = 'login-wrap'; document.body.appendChild(w); }
    const pl = places(), last = pl[0] || {};
    let h = '<form class="login-card" data-sub="loginTeam" novalidate>' + LOGO + '<h1>Usuario del equipo</h1><p class="hint" style="margin:0">Los datos te los da el dueño del consultorio o del centro.</p>';
    if (pl.length) h += '<div class="lg-places"><span>Lugares donde entraste:</span>' + pl.map((p, i) => '<button type="button" class="lg-place" data-act="lgPlace" data-i="' + i + '"><b>' + esc(p.clinic || p.code) + '</b><small>' + esc(p.user) + ' · ' + esc(p.code) + '</small></button>').join('') + '</div>';
    h += '<div class="field"><label for="lgCode">Cuenta</label><input id="lgCode" autocapitalize="none" autocomplete="organization" spellcheck="false" placeholder="Ej.: castelli" value="' + esc(last.code || '') + '"></div>' +
      '<div class="field"><label for="lgUser">Usuario</label><input id="lgUser" autocapitalize="none" autocomplete="username" spellcheck="false" placeholder="Ej.: marta.gomez" value="' + esc(last.user || '') + '"></div>' +
      '<div class="field"><label for="lgPass">Contraseña</label><input id="lgPass" type="password" autocomplete="current-password"></div>' +
      '<div id="lgMsg" class="lg-alert' + (msg ? ' bad' : '') + '" role="alert" aria-live="assertive"' + (msg ? '' : ' hidden') + '>' + esc(msg || '') + '</div>' +
      (CL.keepBox ? CL.keepBox() : '') +
      '<button class="btn primary" type="submit" style="min-height:48px">Ingresar</button>' +
      '<p class="hint" style="margin:0">¿Te olvidaste la contraseña? Pedile al dueño que te ponga una nueva desde Ajustes › Equipo e invitaciones.</p>' +
      '<button type="button" class="btn ghost" data-act="lgMail">Ingresar con correo (dueño de la cuenta)</button>' +
      '<div class="row-btns" style="justify-content:center"><button type="button" class="btn small ghost" data-act="loginDemo">Probar con pacientes de ejemplo</button></div></form>';
    w.innerHTML = h;
    const f = (last.code ? $('#lgPass') : $('#lgCode')); if (f && !A.isNarrow()) f.focus();
  };
  const msg = (t, ok) => { const e = $('#lgMsg'); if (!e) { A.toast(t); return; } e.hidden = false; e.className = 'lg-alert ' + (ok ? 'ok' : 'bad'); e.innerHTML = '<b>' + (ok ? '✓ ' : '⚠ ') + '</b>' + esc(t); try { if (!ok && navigator.vibrate) navigator.vibrate(120); } catch (x) { /* nada */ } };
  A.acts.lgTeam = () => CL.showLogin('team');
  A.acts.lgMail = () => { LS.set('odontovoz.lgKind', 'mail'); CL._forceMail = true; CL.showLogin('in'); };
  A.acts.lgPlace = el => { const p = places()[+el.getAttribute('data-i')]; if (!p) return; $('#lgCode').value = p.code; $('#lgUser').value = p.user; const ps = $('#lgPass'); ps.value = ''; ps.focus(); };
  A.subs.loginTeam = async () => {
    const code = clean(($('#lgCode') || {}).value).replace(/[^a-z0-9]/g, ''), user = clean(($('#lgUser') || {}).value), pass = ($('#lgPass') || {}).value || '';
    if (code.length < 3) return msg('Escribí la cuenta (te la da el dueño, por ejemplo «castelli»).');
    if (!/^[a-z0-9._-]{3,30}$/.test(user)) return msg('Revisá el usuario: va sin espacios, por ejemplo «marta.gomez».');
    if (!pass) return msg('Escribí la contraseña.');
    const b = $('#loginWrap button[type="submit"]'); if (b) { b.disabled = true; b.textContent = 'Ingresando…'; }
    try {
      await CL.signIn(subEmail(code, user), pass);
      savePlace({ code, user, clinic: '' }); LS.set('odontovoz.lgKind', 'team'); LS.set('odontovoz.placeNow', code + '|' + user);
      CL.afterLogin();
    } catch (e) {
      const m = String(e && e.data && (e.data.msg || e.data.error_description || e.data.message) || e.message || '');
      if (/invalid login credentials|invalid_credentials/i.test(m) || (e && e.status === 400)) msg('Cuenta, usuario o contraseña incorrectos. Revisá que estén bien escritos (la contraseña respeta mayúsculas).');
      else msg(e && e.offline ? 'Sin conexión a internet.' : (m || 'No se pudo ingresar.'));
      const ps = $('#lgPass'); if (ps) ps.value = '';
    } finally { if (b && document.body.contains(b)) { b.disabled = false; b.textContent = 'Ingresar'; } }
  };
  /* cuando ya se sabe el nombre del consultorio, queda guardado en el lugar (para los botones del ingreso) */
  const arPrev = A.afterRefresh;
  A.afterRefresh = () => {
    if (arPrev) arPrev();
    const now = LS.get('odontovoz.placeNow', ''); if (!now || !CL.session || !A.CLINIC) return;
    const [code, user] = now.split('|'), l = places(), p = l.filter(x => x.code === code && x.user === user)[0];
    if (p && p.clinic !== A.CLINIC) { p.clinic = A.CLINIC; LS.set('odontovoz.places', JSON.stringify(l)); }
  };
  /* entrar en otro lugar: se cierra esta sesión (y se borran sus datos de este equipo) y se abre el ingreso con los lugares */
  A.acts.lgOtherPlace = () => { LS.set('odontovoz.lgKind', 'team'); CL.signOut(true); };

  const css = document.createElement('style');
  css.textContent = '.lg-team{display:flex;flex-direction:column;align-items:center;gap:1px;min-height:52px;border:1.5px solid var(--accent)!important;font-weight:700}.lg-team small{font-weight:500;font-size:12px;color:var(--ink-2)}' +
    '.lg-places{display:flex;flex-direction:column;gap:6px}.lg-places>span{font-size:13px;color:var(--ink-2)}.lg-place{all:unset;cursor:pointer;display:flex;flex-direction:column;padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface)}.lg-place:hover{border-color:var(--accent)}.lg-place small{color:var(--ink-2);font-size:12.5px}' +
    '.tm-code{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:10px 12px;border-radius:12px;border:1px dashed var(--accent);margin-bottom:10px}.tm-code span{font-size:13px;color:var(--ink-2)}.tm-code b{font-size:20px;letter-spacing:.03em;font-family:var(--mono,monospace)}.tm-code small{flex:1 1 100%;color:var(--ink-2);font-size:12.5px}' +
    '.tm-mode{margin-bottom:8px}.tm-cred{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:8px 0;padding:10px 12px;border-radius:10px;background:var(--surface);border:1px solid var(--line)}.tm-cred dt{color:var(--ink-2)}.tm-cred dd{margin:0;font-weight:800;font-family:var(--mono,monospace)}';
  document.head.appendChild(css);
})();
