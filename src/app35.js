/* ===== 1.25: aviso en todos los equipos cuando un paciente se agenda solo por el turnero online ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns;
  const LSg = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const LSs = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* nada */ } };
  const pref = () => Object.assign({ online: true }, A.notifPref ? A.notifPref() : {});
  const KEY = () => 'odontovoz.online.' + (A.DEMO ? 'demo' : (A.ownerId && A.ownerId()) || 'local');

  /* lo que este equipo ya vio, y la bandeja de turnos online nuevos */
  const st = () => LSg(KEY(), null);
  const save = v => LSs(KEY(), v);
  const locName = a => { const id = A.locOf ? A.locOf(a) : a.loc; const l = (A.locs ? A.locs() : []).filter(x => x.id === id)[0]; return l && (A.locs().length > 1 || (A.isEmp && A.isEmp())) ? l.name : ''; };
  const mine = a => {
    const p = pref();
    if (p.pro && a.pro !== p.pro) return false;
    const mb = A.memberNow && A.memberNow(); if (mb && (mb.role === 'profesional' || mb.role === 'asistente') && mb.pro && a.pro !== mb.pro) return false;
    if (A.locKeep && A.isEmp && A.isEmp()) { try { if (!A.locKeep(a)) return false; } catch (e) { /* nada */ } }
    return true;
  };
  function onlineAppts() {
    const out = [], from = A.add(A.today(), -3);
    Object.keys(S.days || {}).forEach(d => { if (d >= from) (S.days[d] || []).forEach(a => { if (a.online && a.pid && a.status !== 'cancelado') out.push(a); }); });
    return out;
  }
  function line(a) {
    const p = A.PAT(a.pid), pro = A.PRO(a.pro), ln = locName(a);
    return { name: p ? p.name : 'Paciente', when: A.fmtLong(a.date) + ' a las ' + A.mm(a.start), pro: pro && A.PROS.length > 1 ? pro.name : '', loc: ln, what: a.what || '' };
  }
  function scan() {
    if (!S.days) return;
    const list = onlineAppts();
    let s = st();
    if (!s) { save({ seen: list.map(a => a.id), inbox: [] }); return; } /* primera vez en este equipo: no avisa lo viejo */
    const seen = {}; s.seen.forEach(id => { seen[id] = 1; });
    const fresh = list.filter(a => !seen[a.id]);
    if (!fresh.length) return;
    fresh.forEach(a => { s.seen.push(a.id); });
    /* solo lo pedido en los últimos 2 días (al estrenar un equipo no avisa lo viejo) */
    const recent = a => !a.onlineAt || (Date.now() - new Date(a.onlineAt)) < 2 * 86400000;
    const show = fresh.filter(a => recent(a) && mine(a));
    show.forEach(a => { if (s.inbox.indexOf(a.id) < 0) s.inbox.unshift(a.id); });
    s.seen = s.seen.slice(-500); s.inbox = s.inbox.slice(0, 30);
    save(s);
    if (show.length && A.onOnlineNew) { try { A.onOnlineNew(show); } catch (e) { /* nada */ } }
    if (show.length && pref().online) notify(show);
    if (show.length && S.tab === 'inicio' && A.render.inicio) { try { A.render.inicio(); } catch (e) { /* nada */ } }
  }

  /* el aviso: cartel que queda hasta que lo cerrás, sonido, vibración y notificación del celular */
  function notify(list) {
    const p = pref();
    if (p.sound && A.soundArrive) { try { A.soundArrive(); } catch (e) { /* nada */ } }
    if (p.vibrate) { try { navigator.vibrate && navigator.vibrate([120, 80, 120, 80, 120]); } catch (e) { /* nada */ } }
    let host = $('#arrHost'); if (!host) { host = document.createElement('div'); host.id = 'arrHost'; host.setAttribute('aria-live', 'assertive'); document.body.appendChild(host); }
    list.slice(0, 4).forEach(a => {
      const L = line(a), d = document.createElement('div'); d.className = 'arr arr-online';
      d.innerHTML = '<span class="arr-i" aria-hidden="true">📅</span><span class="arr-t"><b>Nuevo turno online: ' + esc(L.name) + '</b><span>' + esc(L.when) + (L.pro ? ' · ' + esc(L.pro) : '') + (L.loc ? ' · ' + esc(L.loc) : '') + (L.what ? ' · ' + esc(L.what) : '') + '</span></span>' +
        '<button class="btn small" data-act="onlOpen" data-id="' + a.id + '">Ver</button><button class="x" data-act="arrClose" aria-label="Cerrar aviso">×</button>';
      host.appendChild(d);
    });
    if (list.length > 4) A.toast('Y ' + (list.length - 4) + ' turnos online más: mirálos en el inicio.');
    if (A.sysNotify && (document.hidden || !document.hasFocus())) list.slice(0, 5).forEach(a => { const L = line(a); A.sysNotify('Nuevo turno online: ' + L.name, L.when + (L.pro ? ' · ' + L.pro : '') + (L.loc ? ' · ' + L.loc : ''), { nf: 'onl:' + a.id }); });
    if (A.voice && A.voice.on && A.voice.speak && list.length === 1) { const L = line(list[0]); try { A.voice.speak('Nuevo turno online de ' + L.name + ', ' + L.when + '.'); } catch (e) { /* nada */ } }
  }
  A.acts.onlOpen = el => {
    const id = el.getAttribute('data-id'), a = A.apptById(id); const d = el.closest('.arr'); if (d) d.remove();
    seenOne(id); if (!a) return;
    S.modal = null; A.renderModal(); S.tab = 'agenda'; S.date = a.date; A.refresh(); S.panel = { type: 'appt', id }; A.renderPanel();
  };
  function seenOne(id) { const s = st(); if (!s) return; s.inbox = s.inbox.filter(x => x !== id); save(s); }
  A.acts.onlSeen = el => { seenOne(el.getAttribute('data-id')); A.refresh(); };
  A.acts.onlAllSeen = () => { const s = st(); if (s) { s.inbox = []; save(s); } A.refresh(); };

  /* en el inicio: «Turnos pedidos online» hasta que los marques como vistos */
  const riPrev = A.render.inicio;
  A.render.inicio = () => {
    riPrev();
    const s = st(); if (!s || !s.inbox.length) return;
    const items = s.inbox.map(id => A.apptById(id)).filter(a => a && a.status !== 'cancelado');
    if (!items.length) return;
    const host = $('#view-inicio'); if (!host || host.querySelector('.onl-card')) return;
    const h = '<section class="card onl-card"><div class="onl-head"><h2>📅 Turnos pedidos online <span class="count">' + items.length + '</span></h2><button class="btn small ghost" data-act="onlAllSeen">Marcar todos como vistos</button></div>' +
      items.map(a => { const L = line(a); return '<div class="onl-row"><button class="onl-main" data-act="onlOpen" data-id="' + a.id + '"><b>' + esc(L.name) + '</b><span>' + esc(L.when) + (L.pro ? ' · ' + esc(L.pro) : '') + (L.loc ? ' · ' + esc(L.loc) : '') + (L.what ? ' · ' + esc(L.what) : '') + '</span>' + (a.onlineAt ? '<small>Lo pidió ' + esc(ago(a.onlineAt)) + '</small>' : '') + '</button><button class="btn small" data-act="onlSeen" data-id="' + a.id + '">Visto</button></div>'; }).join('') +
      (A.sysNotify && !(pref().system) ? '<p class="hint" style="margin:8px 0 0">¿Querés que te avise también con una notificación del celular? <button class="link" data-act="notifOpen">Activar avisos</button></p>' : '') + '</section>';
    const after = host.querySelector('.pg-head, .home-head, h1');
    const anchor = after ? (after.closest('.pg-head, .home-head') || after) : null;
    if (anchor && anchor.parentNode === host) anchor.insertAdjacentHTML('afterend', h); else host.insertAdjacentHTML('afterbegin', h);
  };
  const ago = t => { const s = (Date.now() - new Date(t)) / 1000; return s < 3600 ? 'hace ' + Math.max(1, Math.round(s / 60)) + ' min' : s < 86400 ? 'hace ' + Math.round(s / 3600) + ' h' : 'el ' + A.fmtShort(String(t).slice(0, 10)); };

  /* revisar después de cada sincronización o carga (lo trae cualquier equipo que reciba el pedido) */
  const arPrev = A.afterRefresh; let tmr = null;
  A.afterRefresh = () => { if (arPrev) arPrev(); clearTimeout(tmr); tmr = setTimeout(() => { try { scan(); } catch (e) { /* nada */ } }, 400); };
  setInterval(() => { try { scan(); } catch (e) { /* nada */ } }, 30000);

  /* en Avisos y sonidos: el interruptor de esto */
  const mfPrev = MF.notif;
  if (mfPrev) MF.notif = m => {
    const p = pref();
    return mfPrev(m).replace('<h3 class="nt-h">Cuando recepción marca que llegó un paciente</h3>', '<h3 class="nt-h">Cuando un paciente saca turno por el turnero online</h3><label class="nt-row"><span><b>Avisarme</b><small>Cartel en la app con el nombre, el día, la hora y el consultorio; suena y vibra según lo de abajo. Con «Notificación del sistema» activada, también te llega al celular.</small></span><input type="checkbox" role="switch" data-chg="notifOnl"' + (p.online ? ' checked' : '') + '></label><h3 class="nt-h">Cuando recepción marca que llegó un paciente</h3>');
  };
  A.chg.notifOnl = el => { if (!A.notifPrefSave) return; const p = A.notifPref(); p.online = el.checked; A.notifPrefSave(p); };
  const testPrev = A.acts.notifTest;
  if (testPrev) A.acts.notifTest = el => { testPrev(el); const a = onlineAppts()[0] || (A.day(A.today()).filter(x => x.pid)[0]); if (a) setTimeout(() => notify([a]), 900); };

  document.head.insertAdjacentHTML('beforeend', '<style>' +
    /* el cartel de avisos: otra regla «.arr» (la etiqueta chica de la hora de llegada) le cambiaba la letra y el color */
    '#arrHost .arr{display:flex;align-items:center;gap:10px;background:#0b4d50;color:#fff;border-radius:16px;padding:10px 10px 10px 14px;margin:0;font:inherit;font-family:var(--f-body,inherit);box-shadow:0 12px 30px rgba(0,0,0,.3)}' +
    '#arrHost .arr.arr-online{background:#173f7a;border-left:6px solid #7fb3ff}#arrHost .arr .arr-t b{font-size:16px;font-weight:700}#arrHost .arr .arr-t span{font-size:13.5px;opacity:.92}' +
    '.onl-card{border:2px solid #9cc0f0}.onl-head{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:6px}.onl-head h2{margin:0}' +
    '.onl-row{display:flex;gap:8px;align-items:center;border-top:1px solid var(--line);padding:8px 0}.onl-main{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;text-align:left;background:none;border:0;padding:0;color:inherit;cursor:pointer;font:inherit}.onl-main span{font-size:14px;color:var(--ink-2)}.onl-main small{font-size:12.5px;color:var(--muted,var(--ink-2))}' +
    '</style>');
})();
