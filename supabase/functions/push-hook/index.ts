// OdontoVoz · push-hook: manda notificaciones al teléfono cuando cambia algo en el lugar:
//   · Android con el APK → Firebase Cloud Messaging.
//   · iPhone, iPad, PC y Android sin el APK → Web Push estándar (VAPID + cifrado aes128gcm, RFC 8291), sin librerías.
//   Las claves VAPID las genera la propia función la primera vez y quedan en la tabla ov_wpush_vapid (solo la lee la clave de servicio).
//   GET devuelve la clave pública para que los navegadores se suscriban.
// La despierta la base (supabase/push.sql, pg_net) cada vez que entra un cambio a la cola ov_push_q.
// Verify JWT: NO (la llama la base). No recibe datos de afuera: solo procesa la cola, que únicamente escriben los triggers.
// Secretos: FCM_SERVICE_ACCOUNT (el JSON de la cuenta de servicio de Firebase, pegado entero). SUPABASE_URL y
// SUPABASE_SERVICE_ROLE_KEY los pone Supabase.

const env = (k: string) => (globalThis as any).Deno?.env.get(k) || '';

/* ======================= lógica (sin red: se prueba en tests/push) ======================= */
export type Tok = { member: string; owner: string; device: string; token: string; role?: string | null; pro?: string | null; sede?: string | null; filter_pro?: string | null };
export type Ev = { owner: string; k: string; device?: string | null; by_uid?: string | null; old_v?: any; new_v?: any };
export type Msg = { kind: 'llego' | 'cancel' | 'nota' | 'stock' | 'online' | 'cobrar'; title: string; body: string; pro?: string | null; sede?: string | null; data: Record<string, string>; tag: string };
export type Names = { pat: (id: string) => string; pro: (id: string) => string; sede: (id: string) => string };

export const todayAR = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(now);
const hhmm = (m: number) => String(Math.floor((m || 0) / 60)).padStart(2, '0') + ':' + String((m || 0) % 60).padStart(2, '0');
const dm = (d: string) => (d && d.length >= 10 ? d.slice(8, 10) + '/' + d.slice(5, 7) : d || '');
const arr = (v: any) => (Array.isArray(v) ? v : []);

export function events(ev: Ev, N: Names, today = todayAR()): Msg[] {
  const out: Msg[] = [];
  if (ev.k.startsWith('day:')) {
    const d = ev.k.slice(4);
    if (d < today) return out; /* días pasados: no se avisa nada */
    const om: Record<string, any> = {}; arr(ev.old_v).forEach(a => { if (a && a.id) om[a.id] = a; });
    const isToday = d === today, when = (isToday ? 'Hoy' : dm(d)) + ' ';
    arr(ev.new_v).forEach(a => {
      if (!a || !a.id) return; const o = om[a.id];
      const withPro = a.pro && N.pro(a.pro) ? ' · ' + N.pro(a.pro) : '';
      if (a.type === 'block') {
        if (!o && a.by) out.push({ kind: 'nota', title: (a.note ? 'Nota de ' : 'Horario bloqueado por ') + a.by + (a.label ? ': ' + a.label : ''), body: when + hhmm(a.start) + withPro, pro: a.pro, sede: a.loc, data: { nf: 'nota:' + a.id, appt: a.id }, tag: 'nota:' + a.id });
        return;
      }
      if (!a.pid) return;
      const name = N.pat(a.pid) || 'un paciente';
      if (isToday && a.status === 'llego' && (!o || o.status !== 'llego'))
        out.push({ kind: 'llego', title: 'Llegó ' + name, body: 'Turno de las ' + hhmm(a.start) + withPro + ' · está en la sala de espera', pro: a.pro, sede: a.loc, data: { appt: a.id }, tag: 'llego:' + a.id });
      if (isToday && a.toRcp && (!o || o.toRcp !== a.toRcp))
        out.push({ kind: 'cobrar', title: 'Para cobrar: ' + name, body: 'Lo manda' + (a.pro && N.pro(a.pro) ? ' ' + N.pro(a.pro) : ' el odontólogo') + ' · cobralo en «Para cobrar»', pro: a.pro, sede: a.loc, data: { act: 'nfTab', appt: a.id }, tag: 'cobrar:' + a.id });
      if (o && a.status === 'cancelado' && o.status !== 'cancelado')
        out.push({ kind: 'cancel', title: 'Canceló ' + name, body: when + hhmm(a.start) + withPro, pro: a.pro, sede: a.loc, data: { appt: a.id }, tag: 'cancel:' + a.id });
    });
  } else if (ev.k === 'stock') {
    const low = (i: any) => i && Array.isArray(i.mv) && i.mv.some((m: any) => m && m.why !== 'uso') && ((+i.qty || 0) <= 0 || ((+i.min || 0) > 0 && (+i.qty || 0) <= (+i.min || 0)));
    const nv = ev.new_v || {}, ov = ev.old_v || {};
    Object.keys(nv).filter(s => !s.startsWith('_')).forEach(sd => {
      const before: Record<string, boolean> = {}; arr(ov[sd]).forEach((i: any) => { if (i && i.id) before[i.id] = low(i); });
      const now = arr(nv[sd]).filter((i: any) => low(i) && !before[i.id]);
      if (!now.length) return;
      const where = sd !== 'main' && N.sede(sd) ? ' · ' + N.sede(sd) : '';
      out.push({ kind: 'stock', title: now.length === 1 ? 'Queda poco: ' + String(now[0].name || '').split(' (')[0] : now.length + ' insumos con poco o nada' + where,
        body: now.slice(0, 4).map((i: any) => String(i.name || '').split(' (')[0] + ' (' + (+i.qty || 0) + ')').join(', ') + (now.length > 4 ? '…' : ''),
        sede: sd === 'main' ? null : sd, data: { act: 'stkOpen' }, tag: 'stk:' + sd + ':' + today });
    });
  } else if (ev.k === 'booking') {
    const b = ev.new_v || {}, nm = [b.first, b.last].filter(Boolean).join(' ') || 'Paciente';
    if (b.cancelled) { out.push({ kind: 'online', title: 'Canceló un turno: ' + nm, body: dm(b.date) + ' ' + hhmm(+b.start || 0) + (b.pro && N.pro(b.pro) ? ' · ' + N.pro(b.pro) : ''), pro: b.pro, data: { act: 'onlInbox' }, tag: 'onlc:' + (b.date || '') + ':' + (b.start || '') + ':' + nm }); return out; }
    out.push({ kind: 'online', title: 'Turno pedido online: ' + nm, body: dm(b.date) + ' ' + hhmm(+b.start || 0) + (b.pro && N.pro(b.pro) ? ' · ' + N.pro(b.pro) : ''), pro: b.pro, data: { act: 'onlInbox' }, tag: 'onl:' + (b.date || '') + ':' + (b.start || '') + ':' + nm });
  }
  return out;
}

/* a quién le llega cada aviso */
export function recipients(m: Msg, toks: Tok[], ev: Ev): Tok[] {
  return toks.filter(t => {
    if (ev.device && t.device === ev.device) return false;                 /* nunca al equipo que hizo el cambio */
    if (t.sede && m.sede && t.sede !== m.sede) return false;              /* otro consultorio (Empresa) */
    const role = t.role || 'dueno';
    if (m.kind === 'stock') return role !== 'profesional';                /* el stock lo ve quien compra y ordena */
    if (m.kind === 'cobrar') return role === 'recepcion' || ((role === 'dueno' || role === 'admin') && !t.filter_pro); /* lo cobra la recepción; quien atiende y filtra por su profesional no recibe el cobro */
    if ((role === 'profesional' || role === 'asistente') && t.pro && m.pro && t.pro !== m.pro) return false; /* pacientes de otro odontólogo */
    if (t.filter_pro && m.pro && t.filter_pro !== m.pro) return false;    /* «Avisarme de los pacientes de…» */
    return true;
  });
}

/* ======================= Firebase ======================= */
const b64url = (b: ArrayBuffer | Uint8Array | string) => {
  const u = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b as ArrayBuffer);
  let s = ''; u.forEach(c => { s += String.fromCharCode(c); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
let cached: { tok: string; exp: number } | null = null;
async function fcmToken(sa: any): Promise<string> {
  if (cached && cached.exp > Date.now() + 60e3) return cached.tok;
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: sa.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = String(sa.private_key || '').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head + '.' + claim));
  const jwt = head + '.' + claim + '.' + b64url(sig);
  const r = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + jwt });
  const j = await r.json(); if (!r.ok || !j.access_token) throw new Error('Firebase no dio acceso: ' + JSON.stringify(j).slice(0, 200));
  cached = { tok: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 }; return cached.tok;
}
export function fcmBody(m: Msg, token: string) {
  return { message: { token, notification: { title: m.title, body: m.body },
    android: { priority: 'HIGH', collapse_key: m.kind, notification: { channel_id: 'ov-avisos', icon: 'ic_stat_ov', color: '#0B6B6F', sound: 'default', tag: m.tag, notification_priority: 'PRIORITY_HIGH', visibility: 'PRIVATE' } },
    data: Object.assign({ kind: m.kind }, m.data) } };
}
async function send(sa: any, m: Msg, t: Tok): Promise<'ok' | 'gone' | 'err'> {
  const r = await fetch('https://fcm.googleapis.com/v1/projects/' + sa.project_id + '/messages:send', { method: 'POST', headers: { Authorization: 'Bearer ' + (await fcmToken(sa)), 'Content-Type': 'application/json' }, body: JSON.stringify(fcmBody(m, t.token)) });
  if (r.ok) return 'ok';
  const txt = await r.text();
  return r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT.*token|registration-token-not-registered/i.test(txt) ? 'gone' : 'err';
}

/* ======================= Web Push (iPhone, iPad, PC, Android sin APK) ======================= */
export type WSub = { endpoint: string; p256dh: string; auth: string };
const ub64 = (s: string) => { let t = s.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; return Uint8Array.from(atob(t), c => c.charCodeAt(0)); };
const cat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let p = 0; a.forEach(x => { o.set(x, p); p += x.length; }); return o; };
const hkdf = async (ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, len: number) => {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
};
/* RFC 8291 (aes128gcm): cifra el mensaje para la suscripción de ese navegador */
export async function encryptPush(payload: Uint8Array, p256dh: string, auth: string): Promise<Uint8Array> {
  const ua = ub64(p256dh), authSecret = ub64(auth), enc = new TextEncoder();
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikm = await hkdf(shared, authSecret, cat(enc.encode('WebPush: info\0'), ua, asPub), 32);
  const cek = await hkdf(ikm, salt, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(ikm, salt, enc.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, cat(payload, new Uint8Array([2]))));
  const head = new Uint8Array(21); head.set(salt, 0); new DataView(head.buffer).setUint32(16, 4096); head[20] = asPub.length;
  return cat(head, asPub, ct);
}
type VKeys = { pub: string; priv: CryptoKey };
let vcache: VKeys | null = null;
/* claves VAPID: se crean una sola vez y quedan guardadas (la clave privada nunca sale de la base) */
export async function vapidKeys(): Promise<VKeys> {
  if (vcache) return vcache;
  const read = async () => { const r = await db('/rest/v1/ov_wpush_vapid?select=pub,jwk&id=eq.1'); return r && r[0] ? r[0] : null; };
  let row = await read();
  if (!row) {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
    const pub = b64url(await crypto.subtle.exportKey('raw', kp.publicKey)), jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
    await db('/rest/v1/ov_wpush_vapid', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ id: 1, pub, jwk }) });
    row = await read(); if (!row) throw new Error('No se pudieron guardar las claves de Web Push');
  }
  const priv = await crypto.subtle.importKey('jwk', row.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  vcache = { pub: row.pub, priv }; return vcache;
}
export async function vapidAuth(endpoint: string, V: VKeys, now = Date.now()): Promise<string> {
  const head = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claim = b64url(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: 'https://odontovoz.com.ar' }));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, V.priv, new TextEncoder().encode(head + '.' + claim));
  return 'vapid t=' + head + '.' + claim + '.' + b64url(sig) + ', k=' + V.pub;
}
export function webPayload(m: Msg) { return JSON.stringify({ title: m.title, body: m.body, tag: m.tag, data: Object.assign({ kind: m.kind }, m.data) }); }
async function sendWeb(m: Msg, s: WSub, V: VKeys): Promise<'ok' | 'gone' | 'err'> {
  const body = await encryptPush(new TextEncoder().encode(webPayload(m)), s.p256dh, s.auth);
  const r = await fetch(s.endpoint, { method: 'POST', headers: { Authorization: await vapidAuth(s.endpoint, V), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '3600', Urgency: 'high' }, body });
  if (r.ok) return 'ok';
  return r.status === 404 || r.status === 410 ? 'gone' : 'err';
}
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': '*' };
const J = { 'Content-Type': 'application/json' };

/* ======================= base (clave de servicio, solo dentro del servidor) ======================= */
const db = async (path: string, init: RequestInit = {}) => {
  const r = await fetch(env('SUPABASE_URL') + path, Object.assign({}, init, { headers: Object.assign({ apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: 'Bearer ' + env('SUPABASE_SERVICE_ROLE_KEY'), 'Content-Type': 'application/json' }, init.headers || {}) }));
  const t = await r.text(); if (!r.ok) throw new Error(path + ' ' + r.status + ' ' + t.slice(0, 200));
  return t ? JSON.parse(t) : null;
};
async function namesFor(owner: string): Promise<Names> {
  const rows = await db('/rest/v1/ov_records?select=k,v&owner=eq.' + owner + '&k=in.(pats,pros,cfg)');
  const get = (k: string) => (rows || []).filter((r: any) => r.k === k).map((r: any) => r.v)[0];
  const P: Record<string, string> = {}; arr(get('pats')).forEach((p: any) => { if (p && p.id) P[p.id] = String(p.name || [p.first, p.last].filter(Boolean).join(' ')).replace(/\s+/g, ' ').trim(); });
  const R: Record<string, string> = {}; arr(get('pros')).forEach((p: any) => { if (p && p.id) R[p.id] = p.name || ''; });
  const L: Record<string, string> = {}; arr((get('cfg') || {}).locs).forEach((l: any) => { if (l && l.id) L[l.id] = l.name || ''; });
  return { pat: id => P[id] || '', pro: id => R[id] || '', sede: id => L[id] || '' };
}

export async function serve(req: Request): Promise<Response> {
  /* el navegador pregunta la clave pública para suscribirse a los avisos */
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method === 'GET') {
    try { const V = await vapidKeys(); return new Response(JSON.stringify({ ok: true, key: V.pub }), { headers: Object.assign({}, J, CORS) }); }
    catch (_e) { return new Response(JSON.stringify({ ok: false }), { status: 200, headers: Object.assign({}, J, CORS) }); }
  }
  let sa: any = null; try { sa = JSON.parse(env('FCM_SERVICE_ACCOUNT') || 'null'); } catch (_e) { sa = null; }
  const fcmOk = !!(sa && sa.private_key);
  const q: Ev[] = await db('/rest/v1/rpc/ov_push_claim', { method: 'POST', body: JSON.stringify({ p_n: 100 }) }) || [];
  if (!q.length) return new Response(JSON.stringify({ ok: true, n: 0 }), { headers: J });
  const byOwner: Record<string, Ev[]> = {}; q.forEach(e => { (byOwner[e.owner] = byOwner[e.owner] || []).push(e); });
  let sent = 0, gone = 0, errs = 0, web = 0, webGone = 0, webErrs = 0, V: VKeys | null = null;
  for (const owner of Object.keys(byOwner)) {
    const toks: Tok[] = fcmOk ? (await db('/rest/v1/ov_push_tokens?select=*&owner=eq.' + owner) || []) : [];
    /* suscripciones web (iPhone, PC…): si todavía no está el SQL de Web Push, se sigue sin ellas */
    let wsubs: Array<Tok & WSub> = [];
    try { wsubs = ((await db('/rest/v1/ov_wpush_subs?select=*&owner=eq.' + owner)) || []).map((x: any) => Object.assign({}, x, { token: x.endpoint })); } catch (_e) { wsubs = []; }
    if (!toks.length && !wsubs.length) continue;
    const N = await namesFor(owner), seen = new Set<string>();
    for (const ev of byOwner[owner]) {
      for (const m of events(ev, N)) {
        for (const t of recipients(m, toks, ev)) {
          const key = t.token + '|' + m.tag; if (seen.has(key)) continue; seen.add(key);
          try {
            const r = await send(sa, m, t);
            if (r === 'ok') sent++; else if (r === 'gone') { gone++; await db('/rest/v1/ov_push_tokens?token=eq.' + encodeURIComponent(t.token), { method: 'DELETE' }); } else errs++;
          } catch (_e) { errs++; }
        }
        for (const t of recipients(m, wsubs, ev) as Array<Tok & WSub>) {
          const key = t.endpoint + '|' + m.tag; if (seen.has(key)) continue; seen.add(key);
          try {
            V = V || await vapidKeys();
            const r = await sendWeb(m, t, V);
            if (r === 'ok') web++; else if (r === 'gone') { webGone++; await db('/rest/v1/ov_wpush_subs?endpoint=eq.' + encodeURIComponent(t.endpoint), { method: 'DELETE' }); } else webErrs++;
          } catch (_e) { webErrs++; }
        }
      }
    }
  }
  if (!fcmOk && !web && !webGone && !webErrs) return new Response(JSON.stringify({ ok: false, msg: 'Falta FCM_SERVICE_ACCOUNT', n: q.length }), { status: 200 });
  return new Response(JSON.stringify({ ok: true, n: q.length, sent, gone, errs, web, webGone, webErrs }), { headers: J });
}

if ((globalThis as any).Deno?.serve) (globalThis as any).Deno.serve(serve);
