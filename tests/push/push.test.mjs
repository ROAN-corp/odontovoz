// Notificaciones push: qué cambio genera qué aviso, a quién le llega, y el envío a Firebase (base y Google simulados).
// Correr: node --experimental-strip-types --no-warnings tests/push/push.test.mjs
import crypto from 'node:crypto';
const ENV = {};
globalThis.Deno = { env: { get: k => ENV[k] } };
const P = await import('../../supabase/functions/push-hook/index.ts');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALLA') + ' ' + m); if (!c) fails++; };

const today = P.todayAR(), add = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const N = { pat: id => ({ p1: 'Ana Pérez', p2: 'Luis Gómez' })[id] || '', pro: id => ({ r: 'Rodrigo', a: 'Angel' })[id] || '', sede: id => ({ s1: 'Allen' })[id] || '' };
const ap = (id, o) => Object.assign({ id, pid: 'p1', pro: 'r', start: 600, dur: 30, status: 'pendiente' }, o);

/* 1) qué se avisa */
let m = P.events({ owner: 'o', k: 'day:' + today, old_v: [ap('t1')], new_v: [ap('t1', { status: 'llego' })] }, N);
ok(m.length === 1 && m[0].kind === 'llego' && m[0].title === 'Llegó Ana Pérez' && /10:00 · Rodrigo/.test(m[0].body) && m[0].data.appt === 't1', 'llegó un paciente hoy');
m = P.events({ owner: 'o', k: 'day:' + today, old_v: [ap('t1', { status: 'llego' })], new_v: [ap('t1', { status: 'llego', note: 'x' })] }, N);
ok(m.length === 0, 'si ya había llegado, no se repite');
m = P.events({ owner: 'o', k: 'day:' + add(today, -1), old_v: [ap('t1')], new_v: [ap('t1', { status: 'cancelado' })] }, N);
ok(m.length === 0, 'días pasados no avisan');
m = P.events({ owner: 'o', k: 'day:' + add(today, 3), old_v: [ap('t1')], new_v: [ap('t1', { status: 'cancelado' })] }, N);
ok(m.length === 1 && m[0].kind === 'cancel' && /^Canceló Ana/.test(m[0].title), 'canceló un turno futuro');
m = P.events({ owner: 'o', k: 'day:' + add(today, 1), old_v: [], new_v: [{ id: 'b1', type: 'block', note: true, by: 'Marta', label: 'Llamar al lab', start: 540, pro: 'a' }] }, N);
ok(m.length === 1 && m[0].kind === 'nota' && m[0].title === 'Nota de Marta: Llamar al lab', 'nota de otra persona');
m = P.events({ owner: 'o', k: 'day:' + today, old_v: [], new_v: [ap('t9')] }, N);
ok(m.length === 0, 'un turno nuevo común no molesta');
m = P.events({ owner: 'o', k: 'day:' + today, old_v: [ap('t1', { status: 'atendido' })], new_v: [ap('t1', { status: 'atendido', toRcp: '2026-11-14T10:00:00Z' })] }, N);
ok(m.length === 1 && m[0].kind === 'cobrar' && m[0].title === 'Para cobrar: Ana Pérez' && /Rodrigo/.test(m[0].body), 'el odontólogo lo manda a cobrar a la secretaria');
ok(P.recipients(m[0], [{ token: 'a', role: 'recepcion' }, { token: 'b', role: 'profesional', pro: 'a' }, { token: 'c', role: 'asistente' }, { token: 'd' }], { owner: 'o', k: 'day:x' }).map(t => t.token).join() === 'a,d', 'el aviso de cobro le llega a la recepción y al dueño');
const it = (id, qty, min, why = 'compra') => ({ id, name: 'Anestesia (caja)', qty, min, mv: [{ why }] });
m = P.events({ owner: 'o', k: 'stock', old_v: { main: [it('i1', 5, 2)] }, new_v: { main: [it('i1', 2, 2)], _cfg: {} } }, N);
ok(m.length === 1 && m[0].kind === 'stock' && m[0].title === 'Queda poco: Anestesia', 'stock que baja del mínimo');
m = P.events({ owner: 'o', k: 'stock', old_v: { main: [it('i1', 2, 2)] }, new_v: { main: [it('i1', 1, 2)] } }, N);
ok(m.length === 0, 'stock que ya estaba bajo no se repite');
m = P.events({ owner: 'o', k: 'stock', old_v: null, new_v: { main: [it('i1', 0, 0, 'uso')] } }, N);
ok(m.length === 0, 'insumo nunca contado ni comprado no avisa');
m = P.events({ owner: 'o', k: 'booking', new_v: { first: 'Sol', last: 'Ríos', date: add(today, 2), start: 570, pro: 'a' } }, N);
ok(m.length === 1 && m[0].title === 'Turno pedido online: Sol Ríos' && /09:30 · Angel/.test(m[0].body), 'turno pedido online');
m = P.events({ owner: 'o', k: 'booking', new_v: { first: 'Sol', last: 'Ríos', date: add(today, 2), start: 570, pro: 'a', cancelled: true } }, N);
ok(m.length === 1 && m[0].title === 'Canceló un turno: Sol Ríos' && /09:30/.test(m[0].body), 'aviso cuando un paciente cancela online');

/* 2) a quién */
const T = [
  { member: 'dueño', device: 'pc-recep', token: 'T0', role: 'dueno' },
  { member: 'dueño', device: 'cel-rodri', token: 'T1', role: 'dueno', filter_pro: 'r' },
  { member: 'angel', device: 'cel-angel', token: 'T2', role: 'profesional', pro: 'a' },
  { member: 'marta', device: 'cel-marta', token: 'T3', role: 'recepcion' },
  { member: 'sede2', device: 'cel-s2', token: 'T4', role: 'recepcion', sede: 's2' },
];
const ev = { owner: 'o', k: 'day:' + today, device: 'pc-recep' };
const ll = P.events({ owner: 'o', k: 'day:' + today, old_v: [ap('t1', { loc: 's1' })], new_v: [ap('t1', { status: 'llego', loc: 's1' })] }, N)[0];
ok(P.recipients(m[0], [{ token: 'a', role: 'recepcion' }, { token: 'b', role: 'admin', filter_pro: 'pr1' }, { token: 'c', role: 'dueno', filter_pro: 'pr1' }, { token: 'd', role: 'admin' }], { owner: 'o' }).map(t => t.token).join() === 'a,d', 'el cobro no le llega a quien administra y filtra por su profesional');
let r = P.recipients(ll, T, ev).map(t => t.token);
ok(!r.includes('T0'), 'no le llega al equipo que lo marcó');
ok(r.includes('T1'), 'le llega a Rodrigo (sus pacientes)');
ok(!r.includes('T2'), 'no le llega a Angel (paciente de otro odontólogo)');
ok(r.includes('T3') && !r.includes('T4'), 'recepción del mismo consultorio sí, la de otro consultorio no');
const la = Object.assign({}, ll, { pro: 'a' });
r = P.recipients(la, T, ev).map(t => t.token);
ok(r.includes('T2') && !r.includes('T1'), 'paciente de Angel: a Angel sí; a Rodrigo no (eligió solo los suyos)');
const st = P.events({ owner: 'o', k: 'stock', old_v: { main: [it('i1', 5, 2)] }, new_v: { main: [it('i1', 1, 2)] } }, N)[0];
r = P.recipients(st, T, { owner: 'o', k: 'stock', device: 'x' }).map(t => t.token);
ok(!r.includes('T2') && r.includes('T3') && r.includes('T0'), 'stock: a dueño y recepción, no a los odontólogos');

/* 3) envío completo con Firebase y la base simulados */
const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
ENV.SUPABASE_URL = 'https://sb.test'; ENV.SUPABASE_SERVICE_ROLE_KEY = 'srv';
ENV.FCM_SERVICE_ACCOUNT = JSON.stringify({ project_id: 'odontovoz-test', client_email: 'push@odontovoz-test.iam.gserviceaccount.com', token_uri: 'https://oauth2.googleapis.com/token', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) });
const Q = [{ owner: 'o', k: 'day:' + today, device: 'pc-recep', old_v: [ap('t1')], new_v: [ap('t1', { status: 'llego' })] }];
let TOKS = T.slice(0, 4).map(t => Object.assign({ owner: 'o' }, t)); const SENT = [], DELETED = []; let jwtOk = false;
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url), res = (j, s = 200) => new Response(JSON.stringify(j), { status: s, headers: { 'Content-Type': 'application/json' } });
  if (u.host === 'oauth2.googleapis.com') {
    const jwt = new URLSearchParams(init.body).get('assertion'), [h, c, s] = jwt.split('.');
    const pub = crypto.createPublicKey(privateKey);
    jwtOk = crypto.verify('RSA-SHA256', Buffer.from(h + '.' + c), pub, Buffer.from(s, 'base64url')) && JSON.parse(Buffer.from(c, 'base64url')).scope === 'https://www.googleapis.com/auth/firebase.messaging';
    return res({ access_token: 'ya29.x', expires_in: 3600 });
  }
  if (u.host === 'fcm.googleapis.com') { const b = JSON.parse(init.body); SENT.push(b.message); return b.message.token === 'T3' ? res({ error: { status: 'NOT_FOUND', message: 'UNREGISTERED' } }, 404) : res({ name: 'x' }); }
  if (u.host === 'sb.test') {
    if (u.pathname.endsWith('/rpc/ov_push_claim')) { const q = Q.splice(0); return res(q); }
    if (u.pathname.endsWith('/ov_push_tokens') && (init.method || 'GET') === 'GET') return res(TOKS);
    if (u.pathname.endsWith('/ov_push_tokens') && init.method === 'DELETE') { DELETED.push(u.searchParams.get('token')); return res(null); }
    if (u.pathname.endsWith('/ov_records')) return res([{ k: 'pats', v: [{ id: 'p1', first: 'Ana', last: 'Pérez', name: 'Ana Pérez' }] }, { k: 'pros', v: [{ id: 'r', name: 'Rodrigo' }] }]);
  }
  return res({}, 404);
};
const out = await (await P.serve(new Request('https://x/push-hook', { method: 'POST', body: '{}' }))).json();
ok(jwtOk, 'la firma para Firebase es válida');
ok(SENT.length === 2 && SENT.every(s => s.notification.title === 'Llegó Ana Pérez' && s.android.notification.channel_id === 'ov-avisos' && s.android.priority === 'HIGH'), 'manda «Llegó Ana Pérez» con prioridad alta a 2 teléfonos');
ok(!SENT.some(s => s.token === 'T0'), 'no al equipo que lo marcó');
ok(DELETED[0] === 'eq.T3' && out.gone === 1, 'el teléfono que desinstaló la app se borra de la lista');
const out2 = await (await P.serve(new Request('https://x/push-hook', { method: 'POST', body: '{}' }))).json();
ok(out2.n === 0, 'cola vacía: no hace nada');


/* 4) Web Push (iPhone, PC…): cifrado, firma VAPID y envío, con un navegador y la base simulados */
const b64u = b => Buffer.from(b).toString('base64url');
const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
const uaPub = ecdh.getPublicKey(), authSecret = crypto.randomBytes(16);
const decryptPush = body => {
  const salt = body.subarray(0, 16), rs = body.readUInt32BE(16), idlen = body[20], asPub = body.subarray(21, 21 + idlen), ct = body.subarray(21 + idlen);
  const shared = ecdh.computeSecret(asPub);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', shared, authSecret, Buffer.concat([Buffer.from('WebPush: info\0'), uaPub, asPub]), 32));
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.subarray(ct.length - 16));
  const pt = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  return { rs, idlen, text: pt.subarray(0, pt.lastIndexOf(2)).toString() };
};
const enc = await P.encryptPush(new TextEncoder().encode('Llegó Ana Pérez · 10:00'), b64u(uaPub), b64u(authSecret));
const dec = decryptPush(Buffer.from(enc));
ok(dec.text === 'Llegó Ana Pérez · 10:00' && dec.rs === 4096 && dec.idlen === 65, 'Web Push: el mensaje cifrado lo descifra el navegador (RFC 8291)');
ok(Buffer.from(enc).length < 4096, 'Web Push: entra en un solo bloque');

const VROW = { id: 1 }; let vposts = 0; const WSUBS = [
  { member: 'angel', owner: 'o', device: 'iphone-angel', endpoint: 'https://web.push.apple.com/abc', p256dh: b64u(uaPub), auth: b64u(authSecret), role: 'profesional', pro: 'a' },
  { member: 'marta', owner: 'o', device: 'iphone-marta', endpoint: 'https://web.push.apple.com/marta', p256dh: b64u(uaPub), auth: b64u(authSecret), role: 'recepcion' },
  { member: 'dueño', owner: 'o', device: 'pc-recep', endpoint: 'https://fcm.googleapis.com/wp/gone', p256dh: b64u(uaPub), auth: b64u(authSecret), role: 'dueno' }];
const WSENT = [], WDEL = [];
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url), res = (j, st = 200) => new Response(j == null ? null : JSON.stringify(j), { status: st, headers: { 'Content-Type': 'application/json' } });
  if (u.host === 'sb.test') {
    if (u.pathname.endsWith('/rpc/ov_push_claim')) return res(Q.splice(0));
    if (u.pathname.endsWith('/ov_push_tokens')) return res([]);
    if (u.pathname.endsWith('/ov_wpush_vapid')) { if (init.method === 'POST') { vposts++; Object.assign(VROW, JSON.parse(init.body)); return res(null, 201); } return res(VROW.pub ? [VROW] : []); }
    if (u.pathname.endsWith('/ov_wpush_subs') && (init.method || 'GET') === 'GET') return res(WSUBS);
    if (u.pathname.endsWith('/ov_wpush_subs') && init.method === 'DELETE') { WDEL.push(u.searchParams.get('endpoint')); return res(null); }
    if (u.pathname.endsWith('/ov_records')) return res([{ k: 'pats', v: [{ id: 'p1', first: 'Ana', last: 'Pérez', name: 'Ana Pérez' }] }, { k: 'pros', v: [{ id: 'r', name: 'Rodrigo' }] }]);
  }
  if (u.host === 'web.push.apple.com' || (u.host === 'fcm.googleapis.com' && u.pathname.startsWith('/wp/'))) {
    WSENT.push({ url: String(url), h: init.headers, body: Buffer.from(init.body) });
    return u.pathname.endsWith('/gone') ? new Response(null, { status: 410 }) : new Response(null, { status: 201 });
  }
  return res({}, 404);
};
const gk = await (await P.serve(new Request('https://x/push-hook', { method: 'GET' }))).json();
ok(gk.ok && gk.key && Buffer.from(gk.key, 'base64url').length === 65 && vposts === 1, 'Web Push: la primera vez crea las claves y devuelve la pública (65 bytes)');
const gk2 = await (await P.serve(new Request('https://x/push-hook', { method: 'GET' }))).json();
ok(gk2.key === gk.key && vposts === 1, 'Web Push: las claves no se vuelven a crear');
const opt = await P.serve(new Request('https://x/push-hook', { method: 'OPTIONS' }));
ok(opt.status === 204 && opt.headers.get('Access-Control-Allow-Origin') === '*', 'Web Push: el navegador puede pedir la clave desde la app (CORS)');
Q.push({ owner: 'o', k: 'day:' + today, device: 'pc-recep', old_v: [ap('t1')], new_v: [ap('t1', { status: 'llego' })] });
const o3 = await (await P.serve(new Request('https://x/push-hook', { method: 'POST', body: '{}' }))).json();
const toApple = WSENT.filter(x => x.url.includes('apple.com'));
ok(o3.ok && o3.web === 1 && toApple.length === 1 && toApple[0].url.endsWith('/marta'), 'Web Push: «Llegó» va a la secretaria (no a Angel, que es otro odontólogo, ni al equipo que lo marcó)');
const msg = JSON.parse(decryptPush(toApple[0].body).text);
ok(msg.title === 'Llegó Ana Pérez' && msg.data.appt === 't1' && msg.data.kind === 'llego', 'Web Push: el mensaje trae el título y el turno para abrirlo al tocar');
const hd = toApple[0].h, auth = hd.Authorization, mm = auth.match(/^vapid t=([^,]+), k=(.+)$/);
ok(!!mm && mm[2] === gk.key && hd['Content-Encoding'] === 'aes128gcm' && hd.Urgency === 'high', 'Web Push: encabezados VAPID y de cifrado');
const [vh, vc, vs] = mm[1].split('.'), vcl = JSON.parse(Buffer.from(vc, 'base64url')), pk = Buffer.from(gk.key, 'base64url');
const vkey = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: b64u(pk.subarray(1, 33)), y: b64u(pk.subarray(33, 65)) }, format: 'jwk' });
ok(crypto.verify('sha256', Buffer.from(vh + '.' + vc), { key: vkey, dsaEncoding: 'ieee-p1363' }, Buffer.from(vs, 'base64url')) && vcl.aud === 'https://web.push.apple.com' && vcl.exp - Date.now() / 1000 < 24 * 3600, 'Web Push: la firma VAPID es válida, para el servicio de Apple y vence en menos de 24 h');
const tgone = WSENT.filter(x => x.url.includes('/gone'));
ok(tgone.length === 0, 'Web Push: el equipo que lo marcó no recibe su propio aviso');
Q.push({ owner: 'o', k: 'day:' + today, device: 'otro', old_v: [ap('t1')], new_v: [ap('t1', { status: 'llego' })] });
const o4 = await (await P.serve(new Request('https://x/push-hook', { method: 'POST', body: '{}' }))).json();
ok(o4.webGone === 1 && WDEL.length === 1 && WDEL[0] === 'eq.https://fcm.googleapis.com/wp/gone', 'Web Push: el navegador que ya no existe (410) se borra de la lista');

console.log(fails ? fails + ' FALLAS' : 'todo bien');
process.exit(fails ? 1 : 0);
