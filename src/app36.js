/* ===== 1.26: casilla de notificaciones (sobrecito arriba a la derecha) con lo importante ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, CL = A.cloud;
  const LSg = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const LSs = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* nada */ } };
  const KEY = () => 'odontovoz.nf.' + (A.DEMO ? 'demo' : (A.ownerId && A.ownerId()) || 'local');
  const APK_URL = 'https://github.com/ROAN-corp/odontovoz/releases/latest/download/OdontoVoz.apk';
  const WEB_SW = 'https://odontovoz.com.ar/app/sw.js';
  const native = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const mb = () => (A.memberNow && A.memberNow()) || null;
  const isOwner = () => !mb();
  const me = () => { const m = mb(); if (m && m.name) return m.name; return ''; };

  /* ---------- guardado ---------- */
  const load = () => { const v = LSg(KEY(), null); return v && Array.isArray(v.items) ? v : { items: [] }; };
  const store = v => { const lim = Date.now() - 30 * 86400000; v.items = v.items.filter(x => new Date(x.at) > lim).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 80); LSs(KEY(), v); paintBadge(); if (open) paintPanel(); };
  /* agregar (o actualizar) una notificación; `id` evita repetirla */
  A.nfAdd = n => {
    const v = load(), old = v.items.filter(x => x.id === n.id)[0];
    if (old) { old.t = n.t; old.b = n.b; old.act = n.act; old.args = n.args; store(v); return false; }
    v.items.unshift({ id: n.id, k: n.k || 'info', t: n.t, b: n.b || '', at: n.at || new Date().toISOString(), act: n.act || '', args: n.args || {}, read: false });
    store(v); return true;
  };
  A.nfRead = id => { const v = load(); let ch = false; v.items.forEach(x => { if (x.id === id && !x.read) { x.read = true; ch = true; } }); if (ch) store(v); };
  A.nfDrop = id => { const v = load(), n = v.items.length; v.items = v.items.filter(x => x.id !== id); if (v.items.length !== n) store(v); };
  const unread = () => load().items.filter(x => !x.read).length;

  /* ---------- el sobrecito ---------- */
  const ENV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>';
  function mount() {
    const bar = document.querySelector('header.appbar .top-in'); if (!bar || $('#nfBtn')) return;
    bar.insertAdjacentHTML('beforeend', '<button class="ab-btn nf-btn" id="nfBtn" data-act="nfToggle" aria-haspopup="dialog" aria-expanded="false" aria-label="Notificaciones" title="Notificaciones">' + ENV + '<span class="nf-badge" id="nfBadge" hidden></span></button>');
    paintBadge();
  }
  function paintBadge() {
    const b = $('#nfBadge'), btn = $('#nfBtn'); if (!b) return;
    const n = unread(); b.hidden = !n; b.textContent = n > 99 ? '99+' : String(n);
    if (btn) btn.setAttribute('aria-label', n ? 'Notificaciones: ' + n + ' sin leer' : 'Notificaciones');
  }

  /* ---------- la solapa ---------- */
  let open = false;
  const ICON = { online: '📅', llego: '🔔', update: '⬇️', lab: '🧪', rem: '💬', plan: '⭐', nota: '✎', sync: '☁️', team: '👥', info: 'ℹ️' };
  const ago = t => { const s = (Date.now() - new Date(t)) / 1000; if (s < 60) return 'recién'; if (s < 3600) return 'hace ' + Math.round(s / 60) + ' min'; if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h'; const d = Math.round(s / 86400); return d === 1 ? 'ayer' : 'hace ' + d + ' días'; };
  function paintPanel() {
    let p = $('#nfPanel');
    if (!open) { if (p) p.remove(); const b = $('#nfBtn'); if (b) b.setAttribute('aria-expanded', 'false'); return; }
    if (!p) { p = document.createElement('div'); p.id = 'nfPanel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Notificaciones'); document.body.appendChild(p); }
    const items = load().items, n = items.filter(x => !x.read).length;
    p.innerHTML = '<div class="nf-head"><b>Notificaciones</b>' + (n ? '<button class="btn small ghost" data-act="nfAllRead">Marcar todas como leídas</button>' : '') + '<button class="x" data-act="nfClose" aria-label="Cerrar">×</button></div>' +
      (items.length ? '<div class="nf-list">' + items.map(x => '<div class="nf-it' + (x.read ? '' : ' unread') + '"><button class="nf-main" data-act="nfGo" data-id="' + esc(x.id) + '"><span class="nf-ic" aria-hidden="true">' + (ICON[x.k] || ICON.info) + '</span><span class="nf-tx"><b>' + esc(x.t) + '</b>' + (x.b ? '<span>' + esc(x.b) + '</span>' : '') + '<small>' + esc(ago(x.at)) + '</small></span></button><button class="nf-del" data-act="nfDel" data-id="' + esc(x.id) + '" aria-label="Borrar esta notificación" title="Borrar">×</button></div>').join('') + '</div>'
        : '<div class="nf-empty">No tenés notificaciones.<small>Acá te avisamos los turnos pedidos online, los pacientes que llegan, los trabajos de laboratorio, las versiones nuevas y lo que te dejen anotado en la agenda.</small></div>') +
      '<div class="nf-foot"><button class="link" data-act="notifOpen">Avisos y sonidos</button></div>';
    const btn = $('#nfBtn'); if (btn) btn.setAttribute('aria-expanded', 'true');
  }
  A.acts.nfToggle = () => { open = !open; if (open) { try { check(); } catch (e) { /* nada */ } } paintPanel(); };
  A.acts.nfClose = () => { open = false; paintPanel(); };
  A.acts.nfAllRead = () => { const v = load(); v.items.forEach(x => { x.read = true; }); store(v); };
  A.acts.nfDel = el => A.nfDrop(el.getAttribute('data-id'));
  A.acts.nfGo = el => {
    const id = el.getAttribute('data-id'), x = load().items.filter(i => i.id === id)[0]; if (!x) return;
    A.nfRead(id); open = false; paintPanel();
    const fn = x.act && A.acts[x.act];
    if (fn) { const args = x.args || {}; try { fn({ getAttribute: k => (args[k.replace(/^data-/, '')] != null ? String(args[k.replace(/^data-/, '')]) : null), closest: () => null, value: '' }); } catch (e) { /* nada */ } }
  };
  document.addEventListener('click', e => { if (!open) return; if (e.target.closest && (e.target.closest('#nfPanel') || e.target.closest('#nfBtn'))) return; open = false; paintPanel(); }, true);
  document.addEventListener('keydown', e => { if (open && e.key === 'Escape') { open = false; paintPanel(); } });

  /* acciones que usan las notificaciones */
  A.acts.nfTab = el => { S.modal = null; A.renderModal(); S.panel = null; A.renderPanel(); S.tab = el.getAttribute('data-tab') || 'inicio'; const d = el.getAttribute('data-date'); if (d) S.date = d; A.refresh(); window.scrollTo(0, 0); };
  A.acts.nfAppt = el => { const id = el.getAttribute('data-id'), a = A.apptById(id); if (!a) { A.toast('Ese turno ya no está.'); return; } S.modal = null; A.renderModal(); S.tab = 'agenda'; S.date = a.date; A.refresh(); S.panel = { type: 'appt', id }; A.renderPanel(); };
  A.acts.nfUrl = el => { const u = el.getAttribute('data-url'); try { window.open(u, native() ? '_system' : '_blank', 'noopener'); } catch (e) { location.href = u; } };
  A.acts.nfUpdWeb = () => { const b = document.querySelector('.upd-bar button'); if (b) b.click(); else location.reload(); };
  A.acts.nfLab = el => { const pid = el.getAttribute('data-pid'); if (!A.PAT(pid)) return; A.openFicha(pid, 'lab'); };

  /* =====================================================================
     DE DÓNDE SALEN
     ===================================================================== */
  /* 1) turnos pedidos online (los detecta app35 en cualquier equipo) */
  const line = a => { const p = A.PAT(a.pid), pro = A.PRO(a.pro); return { n: p ? p.name : 'Paciente', w: A.fmtLong(a.date) + ' a las ' + A.mm(a.start) + (pro && A.PROS.length > 1 ? ' · ' + pro.name : '') + (a.what ? ' · ' + a.what : '') }; };
  A.onOnlineNew = list => list.forEach(a => { const L = line(a); A.nfAdd({ id: 'onl:' + a.id, k: 'online', t: 'Turno pedido online: ' + L.n, b: L.w, act: 'onlOpen', args: { id: a.id }, at: a.onlineAt }); });
  const onlOpenPrev = A.acts.onlOpen; if (onlOpenPrev) A.acts.onlOpen = el => { A.nfRead('onl:' + el.getAttribute('data-id')); return onlOpenPrev(el); };
  const onlSeenPrev = A.acts.onlSeen; if (onlSeenPrev) A.acts.onlSeen = el => { A.nfRead('onl:' + el.getAttribute('data-id')); return onlSeenPrev(el); };

  /* 2) llegó un paciente (lo marca otro equipo) */
  const arrPrev = A.onArrivals;
  if (arrPrev) A.onArrivals = list => {
    arrPrev(list);
    const pf = A.notifPref ? A.notifPref() : {}, m = mb();
    list.filter(x => (!pf.pro || x.pro === pf.pro) && !(m && m.pro && (m.role === 'profesional' || m.role === 'asistente') && x.pro !== m.pro)).forEach(x => { const p = A.PAT(x.pid); if (!x.id) return; A.nfAdd({ id: 'llego:' + x.id, k: 'llego', t: 'Llegó ' + (p ? p.name : 'un paciente'), b: 'Turno de las ' + A.mm(x.start) + ' · está en la sala de espera', act: 'nfAppt', args: { id: x.id } }); });
  };

  /* 3) versión nueva: en la web, cuando el navegador ya la bajó; en el APK, si hay una más nueva para descargar */
  const cmpV = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
  function webUpd() { if (native()) return; if (document.querySelector('.upd-bar')) A.nfAdd({ id: 'upd:web', k: 'update', t: 'Hay una versión nueva de OdontoVoz', b: 'Tocá acá para actualizar. Tus datos no se tocan.', act: 'nfUpdWeb' }); }
  new MutationObserver(webUpd).observe(document.body, { childList: true });
  async function apkUpd() {
    if (!native()) return;
    const last = +LSg('odontovoz.nf.apkchk', 0); if (Date.now() - last < 6 * 3600000) return;
    LSs('odontovoz.nf.apkchk', Date.now());
    try {
      const t = await fetch(WEB_SW + '?t=' + Date.now(), { cache: 'no-store' }).then(r => r.text());
      const m = /odontovoz-(\d+\.\d+(?:\.\d+)?)/.exec(t); if (!m) return;
      const nv = m[1].replace(/\.0$/, '');
      if (cmpV(nv, A.VERSION) > 0) A.nfAdd({ id: 'upd:apk:' + nv, k: 'update', t: 'Hay una versión nueva para descargar: ' + nv, b: 'Tocá para bajar el APK nuevo e instalarlo encima. No se pierden tus datos.', act: 'nfUrl', args: { url: APK_URL } });
    } catch (e) { /* sin conexión */ }
  }

  /* 4) trabajos de laboratorio: atrasados, vuelven hoy o mañana, o ya llegaron y hay que citar */
  function labs() {
    const t = A.today(), tm = A.add(t, 1), m = mb();
    if (m && m.role === 'recepcion') return;
    A.PATS.forEach(p => {
      const pd = S.pd && S.pd[p.id]; if (!pd || !pd.labs) return;
      pd.labs.forEach(l => {
        if (m && m.pro && l.pro && l.pro !== m.pro) return;
        const w = (l.work || 'Trabajo') + ' de ' + p.name;
        if (['enviado', 'ajuste', 'porenviar'].indexOf(l.status) >= 0 && l.due) {
          if (l.due < t) A.nfAdd({ id: 'lab:' + l.id + ':late:' + t, k: 'lab', t: 'Trabajo atrasado: ' + w, b: (l.lab ? l.lab + ' · ' : '') + 'tenía que volver el ' + A.fmtShort(l.due), act: 'nfLab', args: { pid: p.id } });
          else if (l.due === t) A.nfAdd({ id: 'lab:' + l.id + ':hoy', k: 'lab', t: 'Vuelve hoy del laboratorio: ' + w, b: l.lab || '', act: 'nfLab', args: { pid: p.id } });
          else if (l.due === tm) A.nfAdd({ id: 'lab:' + l.id + ':man', k: 'lab', t: 'Vuelve mañana del laboratorio: ' + w, b: l.lab || '', act: 'nfLab', args: { pid: p.id } });
        }
        if (l.status === 'listo') {
          const next = A.nextAppt ? A.nextAppt(p.id) : null;
          if (!next) A.nfAdd({ id: 'lab:' + l.id + ':cita', k: 'lab', t: 'Llegó terminado: ' + w, b: 'Todavía no tiene turno para colocarlo.', act: 'nfLab', args: { pid: p.id } });
        }
      });
    });
  }

  /* 5) recordatorios de mañana sin mandar (desde el mediodía) */
  function reminders() {
    const m = mb(); if (m && (m.role === 'profesional' || m.role === 'asistente')) return;
    if (new Date().getHours() < 12) return;
    const tm = A.add(A.today(), 1);
    const list = (A.day ? A.day(tm) : []).filter(a => a.pid && a.type !== 'block' && a.status !== 'cancelado' && (a.rem || 'porenviar') === 'porenviar' && (A.PAT(a.pid) || {}).phone && (!A.locKeep || A.locKeep(a)));
    if (list.length) A.nfAdd({ id: 'rem:' + tm, k: 'rem', t: 'Faltan ' + list.length + ' recordatorio' + (list.length === 1 ? '' : 's') + ' para mañana', b: 'Mandalos por WhatsApp desde el inicio para que no falten.', act: 'nfTab', args: { tab: 'inicio' } });
    else A.nfRead('rem:' + tm);
  }

  /* 6) notas y bloqueos que dejó otra persona en la agenda (de hoy en adelante) */
  function notes() {
    const t = A.today(), my = me(), lim = Date.now() - 3 * 86400000;
    for (let i = 0; i < 14; i++) {
      const d = A.add(t, i);
      (A.day ? A.day(d) : []).forEach(a => {
        if (a.type !== 'block' || !a.by || !a.at || a.by === my || new Date(a.at) < lim) return;
        if (!my && isOwner() && a.byOwner) return;
        if (A.locKeep && !A.locKeep(a)) return;
        A.nfAdd({ id: 'nota:' + a.id, k: 'nota', t: (a.note ? 'Nota de ' : 'Horario bloqueado por ') + a.by + ': ' + a.label, b: A.fmtLong(d) + ' · ' + A.mm(a.start) + (A.PROS.length > 1 && A.PRO(a.pro) ? ' · ' + A.PRO(a.pro).name : ''), act: 'nfAppt', args: { id: a.id }, at: a.at });
      });
    }
  }
  /* las notas que deja el dueño (sin nombre) llevan su marca, así no se avisa a sí mismo */
  const qbPrev = A.acts.qbSave;
  if (qbPrev) A.acts.qbSave = el => {
    const before = {}; const d0 = S.modal && S.modal.f && S.modal.f.date; if (d0) A.day(d0).forEach(a => { before[a.id] = 1; });
    const r = qbPrev(el);
    if (d0) A.day(d0).forEach(a => { if (!before[a.id] && a.type === 'block') { if (!a.by) { a.by = isOwner() ? (A.CFG.ownerName || 'el dueño') : (me() || ''); } if (isOwner()) a.byOwner = true; } });
    return r;
  };

  /* 7) el plan vence pronto (solo al dueño) */
  function plan() {
    if (A.DEMO || !isOwner() || !CL || !CL.lic) return;
    const l = CL.lic, u = [l.trial_until, l.paid_until].filter(Boolean).sort().pop(); if (!u) return;
    const d = Math.round((new Date(u + 'T12:00:00') - new Date(A.today() + 'T12:00:00')) / 86400000);
    if (d >= 0 && d <= 5) A.nfAdd({ id: 'plan:' + u + ':' + (d <= 1 ? 1 : 5), k: 'plan', t: (l.plan === 'prueba' && !l.paid_until ? 'Tu prueba gratis ' : 'Tu plan ') + (d === 0 ? 'vence hoy' : d === 1 ? 'vence mañana' : 'vence en ' + d + ' días'), b: 'Para seguir usando OdontoVoz sin cortes, elegí tu plan.', act: 'planOpen', args: {} });
  }

  /* 8) este equipo hace mucho que no guarda en la nube */
  function sync() {
    if (A.DEMO || !CL || !CL.session) return;
    const last = +(localStorage.getItem('odontovoz.cloud.last') || 0);
    if (last && Date.now() - last > 24 * 3600000) A.nfAdd({ id: 'sync:' + A.today(), k: 'sync', t: 'Este equipo no guarda en la nube desde ' + ago(new Date(last).toISOString()).replace('hace ', 'hace '), b: 'Revisá la conexión a internet. Lo que cargues queda guardado acá y se sube cuando vuelva la conexión.', act: 'acctOpen', args: {} });
  }

  /* revisar todo: al abrir, cada 2 minutos y después de sincronizar */
  let busy = false;
  function check() {
    if (busy) return; busy = true;
    try { [labs, reminders, notes, plan, sync, webUpd].forEach(f => { try { f(); } catch (e) { /* nada */ } }); apkUpd(); } finally { busy = false; }
    paintBadge();
  }
  const arPrev = A.afterRefresh; let tm = null;
  A.afterRefresh = () => { if (arPrev) arPrev(); mount(); clearTimeout(tm); tm = setTimeout(check, 1500); };
  setInterval(check, 120000);
  setTimeout(() => { mount(); check(); }, 2500);

  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '.nf-btn{position:relative;margin-left:2px}.nf-badge{position:absolute;right:1px;bottom:1px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:#d92d20;color:#fff;font:700 10.5px/17px var(--f-body,system-ui);text-align:center;box-shadow:0 0 0 2px var(--surface,#fff);pointer-events:none}' +
    '#nfPanel{position:fixed;top:calc(58px + env(safe-area-inset-top,0px));right:8px;width:min(400px,calc(100vw - 16px));max-height:min(72vh,620px);display:flex;flex-direction:column;background:var(--surface,#fff);color:var(--ink);border:1px solid var(--line);border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.25);z-index:260;overflow:hidden;animation:nfIn .18s ease-out}' +
    '@keyframes nfIn{from{opacity:0;transform:translateY(-8px)}}' +
    '.nf-head{display:flex;align-items:center;gap:8px;padding:12px 10px 10px 16px;border-bottom:1px solid var(--line)}.nf-head b{flex:1;font-size:16px}.nf-head .x{background:none;border:0;font-size:24px;line-height:1;width:36px;height:36px;color:var(--ink-2);cursor:pointer}' +
    '.nf-list{overflow:auto;flex:1}.nf-it{display:flex;align-items:stretch;border-bottom:1px solid var(--line)}.nf-it.unread{background:color-mix(in srgb,var(--accent,#0b6b6f) 8%,transparent)}' +
    '.nf-main{flex:1;min-width:0;display:flex;gap:10px;align-items:flex-start;text-align:left;background:none;border:0;padding:11px 6px 11px 14px;color:inherit;font:inherit;cursor:pointer}.nf-ic{font-size:19px;line-height:1.2;flex:none;width:24px;text-align:center}' +
    '.nf-tx{display:flex;flex-direction:column;gap:2px;min-width:0}.nf-tx b{font-size:14.5px;line-height:1.3}.nf-tx span{font-size:13px;color:var(--ink-2);line-height:1.35}.nf-tx small{font-size:12px;color:var(--ink-2);opacity:.8}' +
    '.nf-it.unread .nf-tx b::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:#d92d20;margin-right:6px;vertical-align:1px}' +
    '.nf-del{background:none;border:0;color:var(--ink-2);font-size:20px;width:38px;cursor:pointer;opacity:.6}.nf-del:hover{opacity:1}' +
    '.nf-empty{padding:26px 18px;text-align:center;font-weight:600;display:flex;flex-direction:column;gap:8px}.nf-empty small{font-weight:400;color:var(--ink-2);font-size:13px;line-height:1.4}' +
    '.nf-foot{padding:8px 14px;border-top:1px solid var(--line);text-align:right;font-size:13.5px}' +
    '</style>');
})();
