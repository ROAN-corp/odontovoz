/* ===== cuenta con usuario y contraseña, y nube: los mismos datos en el teléfono, la recepción y la PC ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns;
  const LS = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } }
  };
  const PRIV_VER = '2026-11-05';
  A.TERMS_VER = PRIV_VER;
  const WEB = 'https://roan-corp.github.io/odontovoz/';

  /* ---------- servidor (Supabase): dirección y clave pública del proyecto ---------- */
  const conf = () => {
    const c = window.OV_CONFIG || {};
    let url = c.supabaseUrl, key = c.supabaseAnonKey;
    if (!url || !key) { try { const o = JSON.parse(LS.get('odontovoz.cloudcfg', 'null')); if (o) { url = o.url; key = o.key; } } catch (e) { /* nada */ } }
    return url && key ? { url: String(url).replace(/\/+$/, ''), key: String(key) } : null;
  };
  const CL = A.cloud = { state: 'off', msg: '', last: 0, busy: false, session: null };
  CL.configured = () => !!conf();
  try { CL.session = JSON.parse(LS.get('odontovoz.session', 'null')); } catch (e) { CL.session = null; }
  const saveSession = s => { CL.session = s; LS.set('odontovoz.session', s ? JSON.stringify(s) : null); };
  A.deviceLabel = () => LS.get('odontovoz.devname', '') || (window.OV_NATIVE ? 'Teléfono' : 'Computadora');
  /* cada equipo tiene un número propio: el servidor solo acepta los equipos registrados (límite del plan) */
  A.devId = () => { let d = LS.get('odontovoz.devid', ''); if (!/^[A-Za-z0-9_-]{12,64}$/.test(d || '')) { const al = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; d = ''; const r = (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(24)) : Array.from({ length: 24 }, () => Math.floor(Math.random() * 256)); for (let i = 0; i < 24; i++) d += al[r[i] % al.length]; LS.set('odontovoz.devid', d); } return d; };

  /* ---------- pedidos al servidor ---------- */
  async function http(path, opt) {
    const c = conf(); if (!c) throw new Error('La nube no está configurada.');
    opt = opt || {};
    const h = Object.assign({ apikey: c.key, 'Content-Type': 'application/json' }, opt.headers || {});
    if (opt.auth !== false && CL.session) h.Authorization = 'Bearer ' + CL.session.access_token;
    h['x-ov-device'] = A.devId();
    let r;
    try { r = await fetch(c.url + path, { method: opt.method || 'GET', headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined }); }
    catch (e) { const er = new Error('Sin conexión con el servidor.'); er.offline = true; throw er; }
    const txt = await r.text(); let data = null; try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
    if (!r.ok) { const er = new Error(authMsg(data, r.status)); er.status = r.status; er.data = data; throw er; }
    return data;
  }
  function authMsg(d, st) {
    const m = String((d && (d.error_description || d.msg || d.message || d.error)) || '');
    if (/invalid login credentials/i.test(m)) return 'El correo o la contraseña no coinciden.';
    if (/email not confirmed/i.test(m)) return 'Falta confirmar el correo: abrí el mensaje que te enviamos y tocá el enlace.';
    if (/already registered|already exists/i.test(m)) return 'Ese correo ya tiene una cuenta. Ingresá o recuperá la contraseña.';
    if (/password should be|weak/i.test(m)) return 'La contraseña es muy débil: usá al menos 8 caracteres con letras y números.';
    if (/rate limit|too many/i.test(m)) return 'Demasiados intentos seguidos. Esperá unos minutos.';
    if (st === 401 || /jwt/i.test(m)) return 'La sesión venció. Volvé a ingresar.';
    return m || ('Error del servidor (' + st + ').');
  }
  const asSession = d => ({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + ((d.expires_in || 3600) - 60) * 1000, user: { id: d.user && d.user.id, email: d.user && d.user.email } });
  async function fresh() {
    const s = CL.session; if (!s) throw new Error('No hay sesión.');
    if (Date.now() < s.expires_at) return s;
    const d = await http('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: s.refresh_token } });
    saveSession(asSession(d)); return CL.session;
  }
  CL.api = (path, opt) => api(path, opt);
  CL.http = (path, opt) => http(path, opt);
  /* de quién son los datos: el dueño de la cuenta (las personas del equipo usan la cuenta del dueño) */
  A.ownerId = () => (CL.ownerId || (CL.session && CL.session.user.id) || null);
  CL.token = async () => (await fresh()).access_token;
  CL.conf = () => conf();
  async function api(path, opt) {
    await fresh();
    try { return await http(path, opt); }
    catch (e) { if (e.status === 401) { CL.session.expires_at = 0; await fresh(); return http(path, opt); } throw e; }
  }

  /* ---------- registro, ingreso, contraseña ---------- */
  /* a dónde vuelve el enlace del correo: siempre la app publicada (sin esto Supabase usaba la página de origen y daba 404) */
  const BACK = '?redirect_to=' + encodeURIComponent('https://roan-corp.github.io/odontovoz/app/');
  CL.signUp = async (email, pass, meta) => {
    const d = await http('/auth/v1/signup' + BACK, { method: 'POST', auth: false, body: { email, password: pass, data: meta } });
    if (d && d.access_token) { saveSession(asSession(d)); return { in: true }; }
    return { confirm: true };
  };
  CL.signIn = async (email, pass) => { const d = await http('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email, password: pass } }); saveSession(asSession(d)); };
  CL.resend = async email => http('/auth/v1/resend' + BACK, { method: 'POST', auth: false, body: { type: 'signup', email } });
  CL.recover = async email => http('/auth/v1/recover' + BACK, { method: 'POST', auth: false, body: { email } });
  CL.setPassword = async pass => api('/auth/v1/user', { method: 'PUT', body: { password: pass } });
  /* los usuarios del equipo sin correo tienen un correo interno: usuario@codigo.equipo.odontovoz.app */
  CL.who = em => { const m = /^([^@]+)@([a-z0-9]+)\.equipo\.odontovoz\.app$/.exec(em || ''); return m ? m[1] + ' (cuenta ' + m[2] + ')' : (em || ''); };
  CL.signOut = async wipe => {
    try { if (CL.session) await http('/auth/v1/logout', { method: 'POST' }); } catch (e) { /* igual se cierra */ }
    saveSession(null); stopLoop(); await baseClear();
    LS.set('odontovoz.member', null); CL.member = null; CL.ownerId = null;
    if (wipe) { A.noSave = true; LS.set('odontovoz.real.v1', null); LS.set('odontovoz.cloud.uid', null); try { indexedDB.deleteDatabase('odontovoz.media'); } catch (e) { /* nada */ } }
    setTimeout(() => location.reload(), 80);
  };
  /* enlaces del correo (confirmar cuenta, nueva contraseña): vuelven a la app con la sesión en la dirección */
  CL.fromLink = async () => {
    const h = location.hash || '';
    /* enlace vencido o ya usado: Supabase vuelve con #error=…&error_code=otp_expired */
    if (/(?:^#|&)error(?:_code)?=/.test(h) || /[?&]error_code=/.test(location.search)) {
      const q0 = new URLSearchParams(h.replace(/^#/, '') + '&' + location.search.replace(/^\?/, ''));
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* nada */ }
      return { err: q0.get('error_code') || q0.get('error') || 'error', desc: q0.get('error_description') || '' };
    }
    if (!/access_token=/.test(h)) return null;
    const q = new URLSearchParams(h.replace(/^#/, '')), at = q.get('access_token'), rt = q.get('refresh_token'), type = q.get('type');
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* nada */ }
    try { const u = await http('/auth/v1/user', { headers: { Authorization: 'Bearer ' + at }, auth: false }); saveSession({ access_token: at, refresh_token: rt, expires_at: Date.now() + (parseInt(q.get('expires_in') || '3600', 10) - 60) * 1000, user: { id: u.id, email: u.email } }); return type || 'login'; }
    catch (e) { A.toast('El enlace venció o ya se usó. Pedí uno nuevo.'); return null; }
  };

  /* ---------- copia de lo último sincronizado (para unir cambios de varios equipos) ---------- */
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => { try { const r = indexedDB.open('odontovoz.cloud', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }));
  const BASE = {}; let baseReady = false;
  async function baseLoad() {
    if (baseReady) return; const d = await db();
    await new Promise(res => { const tx = d.transaction('kv'), st = tx.objectStore('kv'), rq = st.openCursor(); rq.onsuccess = () => { const c = rq.result; if (c) { BASE[c.key] = c.value; c.continue(); } else res(); }; rq.onerror = () => res(); });
    baseReady = true;
  }
  async function basePut(k, val) { val = { v: JSON.parse(JSON.stringify(val.v === undefined ? null : val.v)), rev: val.rev }; BASE[k] = val; const d = await db(); await new Promise(res => { const tx = d.transaction('kv', 'readwrite'); tx.objectStore('kv').put(val, k); tx.oncomplete = res; tx.onerror = res; }); }
  async function baseClear() { Object.keys(BASE).forEach(k => delete BASE[k]); baseReady = false; try { const d = await db(); await new Promise(res => { const tx = d.transaction('kv', 'readwrite'); tx.objectStore('kv').clear(); tx.oncomplete = res; tx.onerror = res; }); } catch (e) { /* nada */ } }

  /* ---------- qué se sincroniza ---------- */
  const SIMPLE = {
    pats: () => A.S.newPats || [], pros: () => A.PROS, prosOld: () => A.PROS_OLD, cfg: () => A.CFG, cat: () => A.CAT, aran: () => A.ARANCEL,
    cash: () => A.S.cash || null, liq: () => A.S.liq || null, setup: () => A.S.setup || null
  };
  function getLocal(k) {
    if (k.indexOf('day:') === 0) return A.S.days[k.slice(4)];
    if (k.indexOf('pd:') === 0) return A.S.pd[k.slice(3)];
    if (SIMPLE[k]) return SIMPLE[k]() == null ? undefined : SIMPLE[k]();
    const X = A.cloudExtra && A.cloudExtra(k); if (X) { const v = X.get(); return v == null ? undefined : v; }
    return undefined;
  }
  function collect() {
    const out = {};
    Object.keys(A.S.days).forEach(d => { const l = A.S.days[d]; if ((l && l.length) || BASE['day:' + d]) out['day:' + d] = l || []; });
    Object.keys(A.S.pd).forEach(p => { if (A.S.pd[p]) out['pd:' + p] = A.S.pd[p]; });
    Object.keys(SIMPLE).forEach(k => { const v = SIMPLE[k](); if (v != null) out[k] = v; });
    /* datos que suman otros módulos (por ejemplo, el modo Empresa) */
    if (A.cloudExtraKeys) A.cloudExtraKeys().forEach(k => { const X = A.cloudExtra(k), v = X && X.get(); if (v != null) out[k] = v; });
    return out;
  }
  const J = x => JSON.stringify(x === undefined ? null : x);
  const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  const isIdArr = x => Array.isArray(x) && x.every(o => isObj(o) && o.id != null);
  /* unión de tres vías: lo que cambió de un lado se respeta; si cambiaron los dos, se unen las listas por código */
  function merge3(L, R, B) {
    if (J(L) === J(R)) return L;
    if (B === undefined) {
      if (isIdArr(L) && isIdArr(R)) { const rm = {}; R.forEach(o => { rm[o.id] = 1; }); return R.concat(L.filter(o => !rm[o.id])); }
      if (isObj(L) && isObj(R)) { const o = {}; new Set(Object.keys(L).concat(Object.keys(R))).forEach(k => { const v = R[k] === undefined ? L[k] : L[k] === undefined ? R[k] : merge3(L[k], R[k], undefined); if (v !== undefined) o[k] = v; }); return o; }
      return R === undefined || R === null ? L : R;
    }
    if (J(L) === J(B)) return R;
    if (J(R) === J(B)) return L;
    if (isIdArr(L) && isIdArr(R) && (B === null || Array.isArray(B))) {
      const map = a => { const m = {}; (a || []).forEach(o => { if (isObj(o) && o.id != null) m[o.id] = o; }); return m; };
      const bm = map(B), lm = map(L), out = [], seen = {};
      R.forEach(r => { seen[r.id] = 1; const l = lm[r.id], b = bm[r.id]; if (l) out.push(merge3(l, r, b)); else if (!(b && J(r) === J(b))) out.push(r); });
      L.forEach(l => { if (seen[l.id]) return; const b = bm[l.id]; if (!(b && J(l) === J(b))) out.push(l); });
      return out;
    }
    if (isObj(L) && isObj(R)) {
      const b = isObj(B) ? B : {}, o = {};
      new Set(Object.keys(L).concat(Object.keys(R))).forEach(k => { const v = merge3(L[k], R[k], b[k]); if (v !== undefined) o[k] = v; });
      return o;
    }
    return L; /* el mismo dato cambiado en los dos lados: queda el de este equipo, que se sube enseguida */
  }
  CL.merge3 = merge3;
  function setArr(arr, v) { arr.length = 0; (v || []).forEach(x => arr.push(x)); }
  function setObj(o, v) { Object.keys(o).forEach(k => { if (!(k in (v || {}))) delete o[k]; }); Object.assign(o, v || {}); }
  const notes = [], arrivals = [];
  function apply(k, v) {
    v = v == null ? v : JSON.parse(JSON.stringify(v)); /* copia propia: nunca compartir objetos con la copia sincronizada */
    if (k.indexOf('day:') === 0) {
      const d = k.slice(4), old = A.S.days[d] || [];
      if (d === A.today()) watchDay(old, v || []);
      A.S.days[d] = v || []; A.S.dirtyDays[d] = 1;
    } else if (k.indexOf('pd:') === 0) {
      const p = k.slice(3); A.S.pd[p] = v; A.S.dirtyPd[p] = 1; if (v && v.prof && A.PAT(p)) A.setProfileQuiet(p, v.prof);
    } else if (k === 'pats') {
      const list = v || [], ids = {}; list.forEach(p => { ids[p.id] = 1; });
      const prev = A.S.newPats || [];
      prev.forEach(p => { if (!ids[p.id]) { const i = A.PATS.indexOf(A.PIDX[p.id]); if (i >= 0) A.PATS.splice(i, 1); delete A.PIDX[p.id]; } });
      list.forEach(p => { const cur = A.PIDX[p.id]; if (cur) { Object.assign(cur, p); A.derive(cur); } else { const np = A.derive(Object.assign({}, p)); A.PATS.push(np); A.PIDX[np.id] = np; } });
      A.S.newPats = list.map(p => A.PIDX[p.id]);
      if (A.purgeDeleted) A.purgeDeleted();
    } else if (k === 'pros') setArr(A.PROS, v);
    else if (k === 'prosOld') setArr(A.PROS_OLD, v);
    else if (k === 'cfg') { const on = (v && v.online) || A.CFG.online; setObj(A.CFG, v); A.CFG.online = on; A.CFG.demo = false; }
    else if (k === 'cat') setArr(A.CAT, v);
    else if (k === 'aran') setObj(A.ARANCEL, v);
    else if (k === 'cash') A.S.cash = v;
    else if (k === 'liq') A.S.liq = v;
    else if (k === 'setup') { A.S.setup = v; A.applySetup(); }
    else if (A.cloudExtra && A.cloudExtra(k)) A.cloudExtra(k).set(v);
    if (A.journalSeen) A.journalSeen(k); /* lo que llega de otro equipo no se anota como cambio propio */
  }
  /* avisos de lo que hizo otro equipo (por ejemplo, la recepción) */
  function watchDay(old, nw) {
    const om = {}; old.forEach(a => { om[a.id] = a; });
    nw.forEach(a => {
      if (!a.pid || !A.PAT(a.pid)) return; const o = om[a.id], n = A.PAT(a.pid).name;
      if (a.status === 'llego' && (!o || o.status !== 'llego')) { if (A.onArrivals) arrivals.push({ id: a.id, pid: a.pid, start: a.start, pro: a.pro }); else notes.push('Llegó ' + n + ' (turno de las ' + A.mm(a.start) + ').'); }
      if (a.sena && (!o || !o.sena)) notes.push('Seña de ' + n + ': ' + A.money(a.sena.amt) + '.');
      if (!o) notes.push('Turno nuevo: ' + n + ' a las ' + A.mm(a.start) + '.');
      if (o && a.status === 'cancelado' && o.status !== 'cancelado') notes.push('Canceló ' + n + ' (' + A.mm(a.start) + ').');
    });
  }

  /* ---------- ciclo: bajar cambios, unir, subir ---------- */
  let loopT = null, pushT = null, running = false, again = false, pendingRefresh = false;
  const T = 'ov_records';
  async function pull() {
    let since = Object.keys(BASE).length ? LS.get('odontovoz.cloud.since', '1970-01-01T00:00:00Z') : '1970-01-01T00:00:00Z', changed = 0, guard = 0;
    for (;;) {
      const rows = await api('/rest/v1/' + T + '?select=k,v,rev,updated_at,device&updated_at=gte.' + encodeURIComponent(since) + '&order=updated_at.asc&limit=500');
      for (const r of rows) {
        const b = BASE[r.k]; if (b && b.rev >= r.rev) continue;
        const local = getLocal(r.k), merged = local === undefined ? r.v : merge3(local, r.v, b ? b.v : undefined);
        if (J(merged) !== J(local)) { apply(r.k, merged); changed++; }
        await basePut(r.k, { v: r.v, rev: r.rev });
      }
      if (rows.length) since = rows[rows.length - 1].updated_at;
      if (rows.length < 500 || ++guard > 40) break;
    }
    /* se repite un margen de 5 segundos por cambios que el servidor guardó en el mismo instante */
    const back = new Date(new Date(since).getTime() - 5000).toISOString(); LS.set('odontovoz.cloud.since', since === '1970-01-01T00:00:00Z' ? since : back);
    return changed;
  }
  async function pushKey(k, v, tries) {
    const b = BASE[k], body = { v, device: A.deviceLabel() };
    let rows;
    if (b) rows = await api('/rest/v1/' + T + '?k=eq.' + encodeURIComponent(k) + '&rev=eq.' + b.rev, { method: 'PATCH', body, headers: { Prefer: 'return=representation' } });
    else { try { rows = await api('/rest/v1/' + T, { method: 'POST', body: Object.assign({ k }, body), headers: { Prefer: 'return=representation' } }); } catch (e) { if (e.status === 409) rows = []; else throw e; } }
    if (rows && rows.length) { await basePut(k, { v, rev: rows[0].rev }); return; }
    /* otro equipo lo cambió antes: se baja, se une y se vuelve a intentar */
    if ((tries || 0) > 3) throw new Error('No se pudo guardar «' + k + '» en la nube (cambios simultáneos).');
    const cur = await api('/rest/v1/' + T + '?select=k,v,rev&k=eq.' + encodeURIComponent(k));
    if (cur && cur[0]) { const m = merge3(v, cur[0].v, b ? b.v : undefined); await basePut(k, { v: cur[0].v, rev: cur[0].rev }); if (J(m) !== J(v)) { apply(k, m); pendingRefresh = true; } return pushKey(k, m, (tries || 0) + 1); }
    if (b) { delete BASE[k]; return pushKey(k, v, (tries || 0) + 1); }
  }
  async function push() {
    const all = collect(); let n = 0;
    for (const k of Object.keys(all)) { const b = BASE[k]; if (A.recAllowed && !A.recAllowed(k, all[k])) continue; if (!b || J(b.v) !== J(all[k])) { await pushKey(k, all[k]); n++; } }
    return n;
  }
  CL.sync = async () => {
    if (!CL.session || !conf() || A.DEMO) return;
    if (running) { again = true; return; }
    running = true; setState('busy');
    try {
      await baseLoad();
      if (CL.checkLicense) await CL.checkLicense();
      if (!(await devCheck())) { setState('err', 'Este equipo no está habilitado para tu cuenta.'); return; }
      const ch = await pull(); const up = CL.readonly ? 0 : await push();
      CL.last = Date.now(); LS.set('odontovoz.cloud.last', String(CL.last)); setState('ok');
      if (ch || pendingRefresh) { pendingRefresh = false; A.noCloudPush = true; A.saveNow(); A.noCloudPush = false; softRefresh(); }
      if (arrivals.length && A.onArrivals) { try { A.onArrivals(arrivals.splice(0)); } catch (x) { arrivals.length = 0; } }
      if (notes.length) { const m = notes.splice(0).slice(-3).join(' '); A.toast(m); if (A.voice && A.voice.on) A.voice.speak(m); }
      if (S.modal && S.modal.type === 'setup' && A.S.setup) { S.modal = null; A.renderModal(); A.refresh(); }
      return { ch, up };
    } catch (e) {
      if (e.status === 403 || e.status === 401 && /row-level|42501/.test(JSON.stringify(e.data || ''))) {
        CL.devOk = false; CL.devFull = null; let ok = true; try { ok = await devCheck(); } catch (x) { /* nada */ }
        if (!ok) { setState('err', 'Este equipo no está habilitado para tu cuenta.'); return; }
        if (CL.onDenied) { CL.onDenied(); setState('ok'); return; }
      }
      setState(e.offline ? 'offline' : 'err', e.message);
      if (e.status === 401 || e.status === 400 && /refresh/i.test(e.message)) { saveSession(null); setState('err', 'La sesión venció. Volvé a ingresar.'); }
      if (A.logError && !e.offline) A.logError('nube', e);
    } finally { running = false; if (again) { again = false; setTimeout(CL.sync, 300); } }
  };
  /* registro del equipo (se repite cada 6 horas para que figure activo) */
  async function devCheck() {
    /* se revisa cada minuto: si lo desconectaron desde el panel o desde otro equipo, se entera enseguida */
    if (CL.devOk && Date.now() - (CL.devAt || 0) < 60e3) return true;
    if (!CL.devOk && CL.devFull && Date.now() - (CL.devFullAt || 0) < 60000) return false;
    try {
      const r = await api('/rest/v1/rpc/ov_device_register', { method: 'POST', body: { p_id: A.devId(), p_name: A.deviceLabel() } });
      if (r && r.ok) { CL.devOk = true; CL.devAt = Date.now(); CL.devFull = null; const sc = 'scope' in r ? (r.scope || null) : undefined; if (sc !== undefined) { const ch = sc !== CL.devScope || !!r.empresa !== !!CL.empresaOn; CL.devScope = sc; CL.empresaOn = !!r.empresa; LS.set('odontovoz.scope', JSON.stringify({ s: sc, e: !!r.empresa })); if (ch && A.onScope) A.onScope(sc); } return true; }
      if (r && r.revoked) { CL.devOk = false; if (A.onDeviceRevoked) A.onDeviceRevoked(r); return false; }
      CL.devOk = false; CL.devFull = r || { full: true }; CL.devFullAt = Date.now(); if (A.onDeviceFull) A.onDeviceFull(CL.devFull); return false;
    } catch (e) {
      /* el servidor todavía no tiene el control de equipos: se sigue como antes */
      if (e.status === 404 || /could not find the function|schema cache/i.test(String(e.message))) { CL.devOk = true; CL.devAt = Date.now(); return true; }
      throw e;
    }
  }
  CL.devCheck = () => { CL.devOk = false; CL.devFull = null; return devCheck(); };
  CL.baseClear = () => baseClear();
  function softRefresh() {
    const ae = document.activeElement, typing = ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);
    if (typing) { pendingRefresh = true; ae.addEventListener('blur', () => { if (pendingRefresh) { pendingRefresh = false; A._fromSync = true; try { A.refresh(); } finally { A._fromSync = false; } } }, { once: true }); return; }
    A._fromSync = true; try { A.refresh(); } finally { A._fromSync = false; }
  }
  function setState(st, msg) { CL.state = st; CL.msg = msg || ''; if (A.cloudChrome) A.cloudChrome(); }
  function startLoop() { stopLoop(); let tick = 0; loopT = setInterval(() => { tick++; if (navigator.onLine === false) return; if (!document.hidden) CL.sync(); else if (A.notifBg && A.notifBg() && tick % 2 === 0) CL.sync(); }, 8000); CL.sync(); }
  function stopLoop() { if (loopT) clearInterval(loopT); loopT = null; }
  /* cada vez que la app guarda, sube los cambios a los pocos segundos */
  const origSaveNow = A.saveNow;
  A.saveNow = () => { origSaveNow(); if (!A.noCloudPush && CL.session && !A.DEMO) { clearTimeout(pushT); pushT = setTimeout(CL.sync, 1500); } };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && CL.session) CL.sync(); });
  window.addEventListener('online', () => { if (CL.session) CL.sync(); });

  /* ---------- indicador en el menú ---------- */
  const ago = t => { if (!t) return 'nunca'; const s = Math.round((Date.now() - t) / 1000); return s < 60 ? 'recién' : s < 3600 ? 'hace ' + Math.round(s / 60) + ' min' : 'hace ' + Math.round(s / 3600) + ' h'; };
  A.cloudChrome = () => {
    const host = $('#drAcct'), foot = $('#drSync');
    const dot = { ok: 'ok', busy: 'busy', err: 'err', offline: 'err' }[CL.state] || '';
    let h;
    if (!conf()) h = '<div class="acct-box"><b>Sin cuenta en la nube</b><span>Los datos quedan solo en este dispositivo. Hacé copias de seguridad desde Ajustes.</span><button class="btn small" data-act="cloudAdmin">Conectar servidor…</button></div>';
    else if (!CL.session) h = '<div class="acct-box"><b>No ingresaste</b><span>Ingresá con tu correo y contraseña para tener los mismos datos en la PC, la recepción y el teléfono.</span><button class="btn small primary" data-act="loginOpen">Ingresar o crear cuenta</button></div>';
    else h = '<div class="acct-box"><b>' + esc(CL.who(CL.session.user.email)) + '</b><span><i class="sync-dot ' + dot + '"></i>' + (CL.state === 'busy' ? 'Sincronizando…' : CL.state === 'err' ? esc(CL.msg || 'Error al sincronizar') : CL.state === 'offline' ? 'Sin conexión: se sube al volver' : 'Sincronizado ' + ago(CL.last)) + '</span><button class="btn small" data-act="acctOpen">Cuenta y equipos</button></div>';
    if (host) host.innerHTML = h;
    if (foot) foot.textContent = CL.session ? (CL.state === 'ok' ? '☁ al día' : CL.state === 'busy' ? '☁ …' : '☁ pendiente') : '';
  };

  /* ---------- pantalla de ingreso ---------- */
  const LOGO = '<svg viewBox="0 0 32 32" width="44" height="44" fill="none" aria-hidden="true"><path d="M9 4c-3.2 0-5.5 2.6-5.5 6 0 2.6 1 4.4 1.8 6.6.9 2.5.9 5.4 1.9 8.5.5 1.6 2.4 1.7 3 .1.9-2.4 1.1-5.2 2.4-5.2h2.8c1.3 0 1.5 2.8 2.4 5.2.6 1.6 2.5 1.5 3-.1 1-3.1 1-6 1.9-8.5.8-2.2 1.8-4 1.8-6.6 0-3.4-2.3-6-5.5-6-2.1 0-3.2 1.1-5.2 1.1S11.1 4 9 4z" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/><path d="M11 11.5v2M13.5 10v5M16 9v7M18.5 10v5M21 11.5v2" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/></svg>';
  CL.showLogin = (tab, msg) => {
    let w = $('#loginWrap'); if (!w) { w = document.createElement('div'); w.id = 'loginWrap'; w.className = 'login-wrap'; document.body.appendChild(w); }
    const up = tab === 'up', rec = tab === 'rec', np = tab === 'newpass';
    let h = '<form class="login-card" data-sub="' + (np ? 'loginNewPass' : rec ? 'loginRec' : up ? 'loginUp' : 'loginIn') + '" novalidate>' + LOGO + '<h1>' + (np ? 'Nueva contraseña' : rec ? 'Recuperar contraseña' : up ? 'Crear cuenta' : 'Ingresar') + '</h1>';
    if (!rec && !np) h += '<div class="seg" role="group"><button type="button" data-act="loginTab" data-t="in" aria-pressed="' + !up + '">Ingresar</button><button type="button" data-act="loginTab" data-t="up" aria-pressed="' + up + '">Crear cuenta</button></div>';
    if (!np) h += '<div class="field"><label for="lgMail">Correo electrónico</label><input id="lgMail" type="email" autocomplete="email" inputmode="email" required value="' + esc(CL._mail || '') + '"></div>';
    if (!rec) h += '<div class="field"><label for="lgPass">' + (np ? 'Nueva contraseña' : 'Contraseña') + '</label><input id="lgPass" type="password" autocomplete="' + (up || np ? 'new-password' : 'current-password') + '" minlength="8" required></div>';
    if (up || np) h += '<div class="field"><label for="lgPass2">Repetí la contraseña</label><input id="lgPass2" type="password" autocomplete="new-password" minlength="8" required></div><div class="hint" style="margin:0">Mínimo 8 caracteres, con letras y números.</div>';
    if (up) h += '<label class="chk"><input type="checkbox" id="lgOk1"> Leí y acepto los <a href="https://roan-corp.github.io/odontovoz/terminos.html" target="_blank" rel="noopener">términos y condiciones</a> (incluido el contrato de encargado de datos) y la <a href="#" data-act="privacyOpen">política de privacidad</a>.</label>' +
      '<label class="chk"><input type="checkbox" id="lgOk2"> Soy profesional de la salud (o trabajo para uno) y voy a registrar datos de pacientes con su consentimiento, respetando el secreto profesional.</label>';
    h += '<div id="lgMsg" class="lg-alert' + (msg ? ' bad' : '') + '" role="alert" aria-live="assertive"' + (msg ? '' : ' hidden') + '>' + esc(msg || '') + '</div>';
    if (np && CL.session && CL.session.user) h += '<p class="hint" style="margin:0">Cuenta: <b>' + esc(CL.who(CL.session.user.email)) + '</b>. Elegí la contraseña nueva y guardala.</p>';
    if (rec) h += '<p class="hint" style="margin:0">Te mandamos un correo con un botón para elegir una contraseña nueva. Abrí <b>solo el último</b> que te llegue y tocá el botón una vez.</p>';
    h += '<button class="btn primary" type="submit" style="min-height:48px">' + (np ? 'Guardar contraseña' : rec ? 'Enviar enlace' : up ? 'Crear cuenta' : 'Ingresar') + '</button>';
    if (!up && !rec && !np) h += '<button type="button" class="btn ghost" data-act="loginTab" data-t="rec">Me olvidé la contraseña</button>';
    if (rec) h += '<button type="button" class="btn ghost" data-act="loginTab" data-t="in">Volver</button>';
    if (!np) h += '<div class="legal">Los datos viajan cifrados y se guardan en servidores de la Unión Europea, que la Argentina reconoce con protección adecuada. Solo vos (y los equipos donde ingreses con tu cuenta) pueden verlos.</div>' +
      '<div class="row-btns" style="justify-content:center"><button type="button" class="btn small ghost" data-act="loginDemo">Probar con pacientes de ejemplo</button></div>';
    w.innerHTML = h + '</form>';
    const f = w.querySelector('input'); if (f && !A.isNarrow()) f.focus();
  };
  CL.hideLogin = () => { const w = $('#loginWrap'); if (w) w.remove(); };
  A.acts.loginOpen = () => { A.hideDrawer(); CL.showLogin('in'); };
  A.acts.loginTab = el => { CL._mail = ($('#lgMail') || {}).value || CL._mail; CL.showLogin(el.getAttribute('data-t')); };
  A.acts.loginLocal = () => { LS.set('odontovoz.localOnly', '1'); CL.hideLogin(); A.afterRefresh(); };
  A.acts.loginDemo = () => { CL.hideLogin(); if (!A.DEMO) A.setMode('demo'); else A.toast('Modo prueba: pacientes ficticios, guardados solo en este equipo. Para tus pacientes reales, ingresá con tu cuenta.'); };
  /* mensajes del ingreso: un recuadro bien visible, se baja el teclado para que se lea y el teléfono vibra */
  const lgErr = (m, kind) => {
    const e = $('#lgMsg'); if (!e) { A.toast(m); return; }
    const ok = kind === 'ok';
    e.hidden = false; e.className = 'lg-alert ' + (ok ? 'ok' : 'bad');
    e.innerHTML = '<b>' + (ok ? '✓ ' : '⚠ ') + '</b>' + esc(m);
    const ae = document.activeElement; if (!ok && ae && ae.blur && A.isNarrow && A.isNarrow()) ae.blur();
    if (!ok) { const c = $('#loginWrap .login-card'); if (c) { c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); } try { navigator.vibrate && navigator.vibrate(120); } catch (x) { /* nada */ } }
    setTimeout(() => { try { e.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) { /* nada */ } }, 60);
  };
  const markBad = ids => { A.$$('#loginWrap input').forEach(i => i.removeAttribute('aria-invalid')); ids.forEach(id => { const i = $('#' + id); if (i) i.setAttribute('aria-invalid', 'true'); }); };
  document.addEventListener('input', e => { if (e.target && e.target.closest && e.target.closest('#loginWrap')) e.target.removeAttribute('aria-invalid'); });

  /* después de crear la cuenta (o si intenta entrar sin confirmar): pantalla «Revisá tu correo» */
  CL.showSent = (mail, again) => {
    let w = $('#loginWrap'); if (!w) { w = document.createElement('div'); w.id = 'loginWrap'; w.className = 'login-wrap'; document.body.appendChild(w); }
    CL._mail = mail;
    w.innerHTML = '<div class="login-card lg-sent">' + LOGO + '<div class="lg-env" aria-hidden="true"><svg viewBox="0 0 48 48" width="64" height="64" fill="none"><rect x="5" y="11" width="38" height="27" rx="4" stroke="var(--accent)" stroke-width="2.4"/><path d="M6 13l18 14 18-14" stroke="var(--accent)" stroke-width="2.4" stroke-linejoin="round"/></svg></div>' +
      '<h1>' + (again ? 'Falta confirmar tu correo' : '¡Cuenta creada! Revisá tu correo') + '</h1>' +
      '<p class="lg-mail">Te enviamos un mensaje a <b>' + esc(mail) + '</b></p>' +
      '<ol class="lg-steps"><li>Abrí tu correo y buscá el mensaje para confirmar la cuenta de OdontoVoz (puede tardar un par de minutos).</li><li>Si no está en la bandeja de entrada, mirá en <b>Spam</b>, <b>Promociones</b> o <b>Notificaciones</b>.</li><li>Tocá el botón o enlace para confirmar el correo. Se abre la página de OdontoVoz: la cuenta ya está activada.</li><li>Volvé acá e ingresá con tu correo y contraseña.</li></ol>' +
      '<div id="lgMsg" class="lg-alert" role="alert" hidden></div>' +
      '<button class="btn primary" type="button" data-act="lgSentIn" style="min-height:48px">Ya lo confirmé: ingresar</button>' +
      '<button class="btn" type="button" data-act="lgResend">No me llegó: reenviar el correo</button>' +
      '<button class="btn ghost small" type="button" data-act="loginTab" data-t="up">Me equivoqué de correo</button></div>';
    try { navigator.vibrate && navigator.vibrate([60, 60, 60]); } catch (x) { /* nada */ }
  };
  A.acts.lgSentIn = () => CL.showLogin('in');
  let resendAt = 0;
  A.acts.lgResend = async el => {
    if (Date.now() - resendAt < 60000) return lgErr('Ya lo reenviamos hace un momento. Esperá un minuto y revisá también Spam.', 'ok');
    el.disabled = true; const t = el.textContent; el.textContent = 'Reenviando…';
    try { await CL.resend(CL._mail); resendAt = Date.now(); lgErr('Listo, te lo reenviamos a ' + CL._mail + '. Revisá también Spam o Promociones.', 'ok'); }
    catch (e) { lgErr(e.message); }
    finally { el.disabled = false; el.textContent = t; }
  };
  const okPass = p => p.length >= 8 && /[a-zA-Z]/.test(p) && /\d/.test(p);
  const okMail = m => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m);
  async function busy(btnLabel, fn) { const b = $('#loginWrap button[type="submit"]'); const t = b ? b.textContent : ''; if (b) { b.disabled = true; b.textContent = btnLabel; } try { await fn(); } catch (e) { lgErr(e.message); if (CL._onErr) CL._onErr(e); } finally { if (b && document.body.contains(b)) { b.disabled = false; b.textContent = t; } } }
  A.subs.loginIn = () => {
    const m = $('#lgMail').value.trim(), p = $('#lgPass').value; CL._mail = m;
    if (!okMail(m)) return lgErr('Revisá el correo.'); if (!p) return lgErr('Escribí la contraseña.');
    CL._onErr = e => {
      const code = e && e.data && (e.data.error_code || e.data.code), msg = String(e && e.data && (e.data.msg || e.data.error_description || e.data.message) || '');
      if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) { CL.showSent(m, true); return; }
      if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) { markBad(['lgMail', 'lgPass']); lgErr('Correo o contraseña incorrectos. Revisá que el correo esté bien escrito y probá de nuevo la contraseña (respeta mayúsculas). Si no la recordás, tocá «Me olvidé la contraseña».'); const pi = $('#lgPass'); if (pi) pi.value = ''; }
    };
    busy('Ingresando…', async () => { await CL.signIn(m, p); afterLogin(); });
  };
  A.subs.loginUp = () => {
    const m = $('#lgMail').value.trim(), p = $('#lgPass').value, p2 = $('#lgPass2').value; CL._mail = m;
    if (!okMail(m)) return lgErr('Revisá el correo.'); if (!okPass(p)) return lgErr('La contraseña necesita al menos 8 caracteres, con letras y números.');
    if (p !== p2) return lgErr('Las contraseñas no coinciden.'); if (!$('#lgOk1').checked || !$('#lgOk2').checked) return lgErr('Para crear la cuenta tenés que aceptar las dos casillas.');
    CL._onErr = null;
    busy('Creando…', async () => {
      const r = await CL.signUp(m, p, { consent_privacy: PRIV_VER, consent_terms: PRIV_VER, consent_at: new Date().toISOString(), health_professional: true }); LS.set('odontovoz.termsSigned', PRIV_VER);
      if (r.in) afterLogin(); else CL.showSent(m);
    });
  };
  A.subs.loginRec = () => {
    const m = $('#lgMail').value.trim(); if (!okMail(m)) return lgErr('Revisá el correo.');
    CL._onErr = null;
    CL._onErr = e => { if (e && (e.status === 429 || /rate limit|too many/i.test(String(e.data && (e.data.msg || e.data.error_code) || '')))) lgErr('Ya te mandamos un correo hace poco. Buscá el último que llegó (revisá también Spam o Promociones) y tocá el botón. Si no llegó ninguno, probá de nuevo en una hora.'); };
    busy('Enviando…', async () => { await CL.recover(m); lgErr('Listo: si ' + m + ' tiene cuenta, en unos minutos te llega el correo para elegir una contraseña nueva. Revisá también Spam o Promociones.', 'ok'); });
  };
  A.subs.loginNewPass = () => {
    const p = $('#lgPass').value, p2 = $('#lgPass2').value;
    if (!okPass(p)) return lgErr('La contraseña necesita al menos 8 caracteres, con letras y números.'); if (p !== p2) return lgErr('Las contraseñas no coinciden.');
    CL._onErr = null;
    busy('Guardando…', async () => { await CL.setPassword(p); A.toast('Listo: contraseña cambiada. Ya podés entrar con la nueva en todos tus equipos.'); afterLogin(); });
  };
  function afterLogin() {
    const uid = CL.session.user.id, prev = LS.get('odontovoz.cloud.uid', '');
    if (prev && prev !== uid) { /* otra cuenta en este equipo: se empieza de cero para no mezclar consultorios */ LS.set('odontovoz.real.v1', null); LS.set('odontovoz.cloud.since', null); baseClear(); }
    LS.set('odontovoz.cloud.uid', uid); LS.set('odontovoz.localOnly', null);
    CL.hideLogin();
    if (A.DEMO || (prev && prev !== uid)) { LS.set('odontovoz.mode', 'real'); A.noSave = true; setTimeout(() => location.reload(), 60); return; }
    A.toast('Ingresaste como ' + CL.who(CL.session.user.email) + '. Sincronizando…'); startLoop(); A.afterRefresh();
  }
  CL.afterLogin = afterLogin;

  /* ---------- cuenta y equipos ---------- */
  A.acts.acctOpen = () => { A.hideDrawer(); S.modal = { type: 'acct' }; A.renderModal(); };
  MF.acct = () => {
    const s = CL.session; if (!s) return A.modalShell('Cuenta', '<p>No ingresaste.</p>', '<button class="btn primary" data-act="loginOpen">Ingresar</button>');
    const b = '<div class="acct-box"><b>' + esc(s.user.email) + '</b><span><i class="sync-dot ' + ({ ok: 'ok', busy: 'busy' }[CL.state] || 'err') + '"></i>Última sincronización: ' + ago(CL.last) + '</span></div>' +
      '<div class="field" style="margin-top:10px"><label for="devName">Nombre de este equipo (lo ven los demás al cargar algo)</label><input id="devName" data-chg="devName" value="' + esc(A.deviceLabel()) + '" placeholder="Ej.: Recepción, Consultorio, PC"></div>' +
      '<div class="hint">Para que la secretaria y vos vean lo mismo, ingresen con esta misma cuenta en cada equipo (teléfono, tablet o la página web en la PC). Los cambios aparecen en los otros equipos en unos segundos.</div>' +
      '<div class="row-btns"><button class="btn" data-act="cloudSyncNow">Sincronizar ahora</button><button class="btn" data-act="acctPass">Cambiar contraseña</button><button class="btn" data-act="privacyOpen">Privacidad</button></div>' +
      '<div class="block"><h3>Bloqueo con PIN</h3><div class="hint" style="margin:0">' + (CL.pinOn() ? 'Activo: la app pide el PIN al abrirla.' : 'Opcional: pide un PIN al abrir la app en este equipo.') + '</div><div class="row-btns">' + (CL.pinOn() ? '<button class="btn small" data-act="pinSetOpen">Cambiar PIN</button><button class="btn small" data-act="pinOff">Quitar PIN</button>' : '<button class="btn small primary" data-act="pinSetOpen">Poner PIN</button>') + '</div></div>' +
      '<div class="block"><h3>Tus datos</h3><div class="hint" style="margin:0">Podés descargar todo cuando quieras (Ajustes › Copia de seguridad). Las imágenes de pacientes quedan en el equipo donde se cargaron.</div><div class="row-btns"><button class="btn small" data-act="cfgOpen" data-t="datos">Descargar copia</button><button class="btn small danger" data-act="acctDelete">Borrar mis datos de la nube</button></div></div>';
    return A.modalShell('Cuenta y equipos', b, '<button class="btn" data-act="acctOut">Cerrar sesión</button><button class="btn primary" data-act="closeModal">Listo</button>');
  };
  A.chg.devName = el => { LS.set('odontovoz.devname', el.value.trim().slice(0, 30)); };
  A.acts.cloudSyncNow = async () => { await CL.sync(); A.toast(CL.state === 'ok' ? 'Todo sincronizado.' : CL.msg || 'No se pudo sincronizar.'); if (S.modal && S.modal.type === 'acct') A.renderModal(); };
  A.acts.acctPass = async () => { if (/\.equipo\.odontovoz\.app$/.test(CL.session.user.email || '')) { S.modal = null; A.renderModal(); CL.showLogin('newpass'); return; } try { await CL.recover(CL.session.user.email); A.toast('Te enviamos un correo con el enlace para elegir la contraseña nueva.'); } catch (e) { A.toast(e.message); } };
  A.acts.acctOut = () => { S.modal = { type: 'acctOut' }; A.renderModal(); };
  MF.acctOut = () => A.modalShell('Cerrar sesión', '<p>Lo que ya está en la nube queda guardado. ¿Querés también borrar los datos de este equipo? Conviene si el equipo es compartido.</p>',
    '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn" data-act="acctOutKeep">Cerrar y conservar</button><button class="btn danger" data-act="acctOutWipe">Cerrar y borrar de este equipo</button>');
  A.acts.acctOutKeep = () => { S.modal = null; A.renderModal(); CL.signOut(false); };
  A.acts.acctOutWipe = async () => { S.modal = null; A.renderModal(); if (CL.session) await CL.sync(); CL.signOut(true); };
  A.acts.acctDelete = () => { S.modal = { type: 'acctDel' }; A.renderModal(); };
  MF.acctDel = () => A.modalShell('Borrar mis datos de la nube',
    '<p>Se borran de los servidores todos los pacientes, turnos e historias de esta cuenta. <b>No se puede deshacer.</b></p><p class="hint">Antes, descargá una copia: la ley obliga a conservar las historias clínicas (Ley 26.529, art. 18: al menos 10 años).</p><div class="field"><label for="delOk">Escribí BORRAR para confirmar</label><input id="delOk" autocomplete="off"></div><div id="delMsg" class="hint bad"></div>',
    '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn danger" data-act="acctDelGo">Borrar</button>');
  A.acts.acctDelGo = async () => {
    if (($('#delOk').value || '').trim().toUpperCase() !== 'BORRAR') { $('#delMsg').textContent = 'Escribí BORRAR.'; return; }
    try { await api('/rest/v1/rpc/ov_delete_my_data', { method: 'POST', body: {} }); await baseClear(); LS.set('odontovoz.cloud.since', null); S.modal = null; A.renderModal(); A.toast('Datos de la nube borrados. Este equipo conserva su copia hasta que cierres sesión.'); stopLoop(); }
    catch (e) { $('#delMsg').textContent = e.message; }
  };
  /* conexión manual a un servidor propio (avanzado) */
  A.acts.cloudAdmin = () => { A.hideDrawer(); S.modal = { type: 'cloudAdmin' }; A.renderModal(); };
  MF.cloudAdmin = () => {
    let o = {}; try { o = JSON.parse(LS.get('odontovoz.cloudcfg', 'null')) || {}; } catch (e) { /* nada */ }
    return A.modalShell('Conectar servidor', '<p class="hint">Para quien administra la instalación: dirección del proyecto Supabase y su clave pública («anon»). La clave pública está pensada para ir dentro de la app; la seguridad la dan las reglas por usuario del servidor.</p>' +
      '<div class="field"><label for="ccUrl">Dirección del proyecto</label><input id="ccUrl" value="' + esc(o.url || '') + '" placeholder="https://xxxx.supabase.co"></div><div class="field"><label for="ccKey">Clave pública (anon)</label><input id="ccKey" value="' + esc(o.key || '') + '"></div><div id="ccMsg" class="hint bad"></div>',
      '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="cloudAdminSave">Guardar</button>');
  };
  A.acts.cloudAdminSave = () => {
    const url = $('#ccUrl').value.trim(), key = $('#ccKey').value.trim();
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(url) && !/^https:\/\//.test(url)) { $('#ccMsg').textContent = 'La dirección tiene que empezar con https://'; return; }
    LS.set('odontovoz.cloudcfg', url && key ? JSON.stringify({ url, key }) : null); S.modal = null; A.renderModal(); A.afterRefresh(); if (url && key) CL.showLogin('in');
  };

  /* ---------- bloqueo con PIN al abrir la app (el teléfono puede quedar en manos de otro) ---------- */
  async function hashPin(pin) {
    const salt = (CL.session && CL.session.user.id) || 'ov', data = new TextEncoder().encode(salt + ':' + pin);
    try { const h = await crypto.subtle.digest('SHA-256', data); return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join(''); }
    catch (e) { let x = 5381; for (const b of data) x = ((x << 5) + x + b) >>> 0; return 'f' + x.toString(16); }
  }
  CL.pinOn = () => !!LS.get('odontovoz.pin', '');
  let pinTries = 0, hiddenAt = 0;
  CL.lock = () => {
    if (!CL.pinOn() || !CL.session || $('#pinWrap')) return;
    const w = document.createElement('div'); w.id = 'pinWrap'; w.className = 'login-wrap';
    w.innerHTML = '<form class="login-card" data-sub="pinGo">' + LOGO + '<h1>OdontoVoz</h1><p class="hint" style="margin:0">' + esc(CL.who(CL.session.user.email)) + '</p><div class="field"><label for="pinIn">PIN</label><input id="pinIn" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></div><div id="pinMsg" class="hint bad"></div><button class="btn primary" type="submit" style="min-height:48px">Entrar</button><button type="button" class="btn ghost" data-act="pinForgot">Me olvidé el PIN</button></form>';
    document.body.appendChild(w); const i = $('#pinIn'); if (i) i.focus();
  };
  A.subs.pinGo = async () => {
    const v = ($('#pinIn').value || '').trim(); if (!v) return;
    if (await hashPin(v) === LS.get('odontovoz.pin', '')) { pinTries = 0; const w = $('#pinWrap'); if (w) w.remove(); return; }
    pinTries++; $('#pinIn').value = '';
    if (pinTries >= 5) { LS.set('odontovoz.pin', null); A.toast('Demasiados intentos: ingresá de nuevo con tu correo y contraseña.'); CL.signOut(false); return; }
    $('#pinMsg').textContent = 'PIN incorrecto. Te quedan ' + (5 - pinTries) + ' intentos.';
  };
  A.acts.pinForgot = () => { LS.set('odontovoz.pin', null); CL.signOut(false); };
  A.acts.pinSetOpen = () => { S.modal = { type: 'pinSet' }; A.renderModal(); };
  MF.pinSet = () => A.modalShell('PIN para abrir la app', '<p class="hint">Cada vez que abras la app (o vuelvas a ella después de 3 minutos) te pide este PIN. Es solo de este equipo.</p><div class="row2"><div class="field"><label for="pn1">PIN (4 a 8 números)</label><input id="pn1" type="password" inputmode="numeric" maxlength="8"></div><div class="field"><label for="pn2">Repetilo</label><input id="pn2" type="password" inputmode="numeric" maxlength="8"></div></div><div id="pnMsg" class="hint bad"></div>',
    '<button class="btn" data-act="acctOpen">Cancelar</button><button class="btn primary" data-act="pinSave">Guardar PIN</button>');
  A.acts.pinSave = async () => {
    const a = $('#pn1').value.trim(), b = $('#pn2').value.trim();
    if (!/^\d{4,8}$/.test(a)) { $('#pnMsg').textContent = 'Usá de 4 a 8 números.'; return; } if (a !== b) { $('#pnMsg').textContent = 'No coinciden.'; return; }
    LS.set('odontovoz.pin', await hashPin(a)); A.toast('PIN activado.'); A.acts.acctOpen();
  };
  A.acts.pinOff = () => { LS.set('odontovoz.pin', null); A.toast('PIN desactivado.'); A.renderModal(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) hiddenAt = Date.now(); else if (hiddenAt && Date.now() - hiddenAt > 180000) CL.lock(); });

  /* ---------- política de privacidad (también en privacidad.html) ---------- */
  A.acts.privacyOpen = (el, ev) => { if (ev) ev.preventDefault(); const w = $('#loginWrap'); if (w) w.style.display = 'none'; S.modal = { type: 'privacy', fromLogin: !!w }; A.renderModal(); };
  const origClose = A.closeModal;
  A.closeModal = () => { const fl = S.modal && S.modal.type === 'privacy' && S.modal.fromLogin; origClose(); if (fl) { const w = $('#loginWrap'); if (w) w.style.display = ''; } };
  A.PRIVACY_HTML = '<p><b>Versión ' + PRIV_VER + '.</b> Resumen de cómo se tratan los datos. Los textos completos están en la web: <a href="' + WEB + 'privacidad.html" target="_blank" rel="noopener">política de privacidad</a> y <a href="' + WEB + 'terminos.html" target="_blank" rel="noopener">términos y condiciones</a>.</p>' +
    '<h3>Quién es responsable</h3><p>El profesional o centro es el <b>responsable de los datos de sus pacientes</b> (Ley 25.326). ROAN corp, que hace OdontoVoz, es <b>encargado del tratamiento</b>: guarda los datos solo por su cuenta y para que la app funcione, con secreto, sin venderlos ni usarlos para otra cosa.</p>' +
    '<h3>Dónde están</h3><p>En servidores de Supabase en la <b>Unión Europea (Irlanda)</b>, cifrados. Cada cuenta solo accede a lo suyo y solo desde sus equipos registrados.</p>' +
    '<h3>Dictado por voz</h3><p>La voz usa el reconocimiento de Google (Chrome o Android): el audio de lo que dictás se envía a Google, principalmente en EE. UU. Por eso está apagada hasta que la actives y lo aceptes en tu equipo. Sin aceptarlo, la app funciona igual escribiendo.</p>' +
    '<h3>Sin cuenta</h3><p>En el modo prueba todo queda solo en tu equipo.</p>' +
    '<h3>Derechos</h3><p>Acceso, rectificación, actualización y supresión (Ley 25.326, arts. 14 a 16). Podés ver, corregir, descargar y borrar todo desde la app. La historia clínica se conserva al menos 10 años (Ley 26.529, art. 18).</p>' +
    '<p class="hint">LA AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.</p>' +
    '<h3>Lo que te toca como profesional</h3><p>Informar a tus pacientes y pedirles el consentimiento (hay una plantilla firmable: «Uso de datos personales»); inscribir tu base de datos en el Registro Nacional de Bases de Datos de la AAIP cuando corresponda; cuidar tu contraseña y tus equipos.</p>' +
    '<h3>Contacto</h3><p>' + (A.SUPPORT && A.SUPPORT.email ? esc(A.SUPPORT.email) : 'somosroan@gmail.com') + ' · <a href="' + WEB + 'baja.html" target="_blank" rel="noopener">Baja, arrepentimiento o eliminación de la cuenta</a></p>';
  MF.privacy = () => A.modalShell('Privacidad y condiciones', A.PRIVACY_HTML, '<button class="btn primary" data-act="closeModal">Entendido</button>', true);

  /* ---------- arranque ---------- */
  CL.boot = async () => {
    if (!conf()) { A.afterRefresh(); return; }
    const link = await CL.fromLink();
    /* si viene de un enlace del correo, la bienvenida no tapa la pantalla */
    if (link) { try { LS.set('odontovoz.intro', '1'); } catch (e) { /* nada */ } const it = $('#intro'); if (it) it.remove(); }
    if (link && link.err) {
      CL.showLogin('rec', /expired|invalid|otp/i.test(link.err + ' ' + link.desc) ? 'Ese enlace ya se usó o venció: cada enlace sirve una sola vez y dura una hora. Pedí uno nuevo acá abajo y abrí solo el último correo que te llegue.' : 'El enlace no funcionó (' + link.err + '). Pedí uno nuevo acá abajo.');
      return;
    }
    if (link === 'recovery') { CL.showLogin('newpass'); return; }
    if (link) { afterLogin(); return; }
    if (CL.session) { if (A.DEMO) { /* con sesión iniciada se usan los datos reales */ LS.set('odontovoz.mode', 'real'); A.noSave = true; location.reload(); return; } CL.lock(); startLoop(); return; }
    /* sin sesión no se entra: cada profesional ve solo lo suyo con su usuario y contraseña */
    const show = () => CL.showLogin('in');
    const intro = $('#intro'); if (intro) { const go = intro.querySelector('[data-act="introGo"]'); if (go) go.addEventListener('click', () => setTimeout(show, 450), { once: true }); } else show();
  };
  setTimeout(() => { CL.boot().catch(e => A.logError && A.logError('nube', e)); }, 0);
})();
