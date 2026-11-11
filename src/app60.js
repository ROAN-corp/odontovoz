/* ===== 1.45.3: sincronización al instante entre equipos (Supabase Realtime, canal de aviso del lugar) ===== */
(function () {
  'use strict';
  /* Cuando un equipo sube cambios, manda un «toc toc» (sin datos) por el canal del lugar; los demás equipos abiertos
     sincronizan en el momento en vez de esperar la próxima vuelta (8 segundos con la app a la vista, más en segundo plano).
     Si el canal no anda (sin internet, red que bloquea), todo sigue como antes con las vueltas periódicas. */
  const A = window.App, CL = A.cloud;
  if (!CL || !window.WebSocket) return;
  let ws = null, topic = '', ref = 0, joinRef = '', hb = null, retry = 0, retryT = null, joined = false, wantOwner = '';
  const me = () => (A.devId ? A.devId() : '');
  A.rt = { state: () => (joined ? 'ok' : ws ? 'conectando' : 'apagado'), last: 0, got: 0, sent: 0 };
  const send = o => { try { if (ws && ws.readyState === 1) { ws.send(JSON.stringify(o)); return true; } } catch (e) { /* nada */ } return false; };
  function close() { joined = false; clearInterval(hb); hb = null; if (ws) { try { ws.onclose = null; ws.close(); } catch (e) { /* nada */ } } ws = null; }
  function later() { clearTimeout(retryT); retry = Math.min(retry + 1, 6); retryT = setTimeout(connect, Math.min(60e3, 1500 * Math.pow(2, retry))); }
  let pend = null;
  function onPing(p) {
    if (!p || p.dev === me()) return;
    A.rt.got++; A.rt.last = Date.now();
    clearTimeout(pend); pend = setTimeout(() => { if (CL.sync) CL.sync(); }, 250 + Math.floor(Math.random() * 400));
  }
  function connect() {
    const c = CL.conf && CL.conf(), owner = A.ownerId ? A.ownerId() : null;
    if (!c || !CL.session || A.DEMO || !owner || navigator.onLine === false) { close(); return; }
    if (ws && wantOwner === owner) return;
    close(); wantOwner = owner; topic = 'realtime:ov-' + owner; joinRef = String(++ref);
    try { ws = new WebSocket(c.url.replace(/^http/, 'ws') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(c.key) + '&vsn=1.0.0'); } catch (e) { ws = null; later(); return; }
    ws.onopen = () => {
      send({ topic, event: 'phx_join', payload: { config: { broadcast: { self: false, ack: false }, presence: { key: '' }, postgres_changes: [], private: false } }, ref: joinRef, join_ref: joinRef });
      hb = setInterval(() => send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++ref) }), 25000);
    };
    ws.onmessage = e => {
      let m = null; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (!m || m.topic !== topic) return;
      if (m.event === 'phx_reply' && m.ref === joinRef) { joined = !!(m.payload && m.payload.status === 'ok'); if (joined) retry = 0; else { close(); later(); } return; }
      if (m.event === 'broadcast' && m.payload && m.payload.event === 'chg') onPing(m.payload.payload);
      if (m.event === 'phx_close' || m.event === 'phx_error') { close(); later(); }
    };
    ws.onclose = () => { ws = null; joined = false; clearInterval(hb); later(); };
    ws.onerror = () => { /* onclose reintenta */ };
  }
  A.rtPing = keys => {
    if (!joined) return false;
    const ok = send({ topic, event: 'broadcast', payload: { type: 'broadcast', event: 'chg', payload: { dev: me(), n: keys || 1, at: Date.now() } }, ref: String(++ref), join_ref: joinRef });
    if (ok) A.rt.sent++;
    return ok;
  };

  /* después de subir cambios, avisar; si cambió el lugar o la sesión, reconectar */
  const prevSync = CL.sync;
  CL.sync = async function () {
    const r = await prevSync.apply(this, arguments);
    try { if (r && r.up) A.rtPing(r.up); const o = A.ownerId ? A.ownerId() : null; if (CL.session && o && o !== wantOwner) connect(); else if (!ws && CL.session) connect(); } catch (e) { /* nada */ }
    return r;
  };
  window.addEventListener('online', () => { retry = 0; connect(); });
  window.addEventListener('offline', close);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (!ws || !joined)) { retry = 0; connect(); } });
  setTimeout(connect, 2500);
})();
