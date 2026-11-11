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
const it = (id, qty, min, why = 'compra') => ({ id, name: 'Anestesia (caja)', qty, min, mv: [{ why }] });
m = P.events({ owner: 'o', k: 'stock', old_v: { main: [it('i1', 5, 2)] }, new_v: { main: [it('i1', 2, 2)], _cfg: {} } }, N);
ok(m.length === 1 && m[0].kind === 'stock' && m[0].title === 'Queda poco: Anestesia', 'stock que baja del mínimo');
m = P.events({ owner: 'o', k: 'stock', old_v: { main: [it('i1', 2, 2)] }, new_v: { main: [it('i1', 1, 2)] } }, N);
ok(m.length === 0, 'stock que ya estaba bajo no se repite');
m = P.events({ owner: 'o', k: 'stock', old_v: null, new_v: { main: [it('i1', 0, 0, 'uso')] } }, N);
ok(m.length === 0, 'insumo nunca contado ni comprado no avisa');
m = P.events({ owner: 'o', k: 'booking', new_v: { first: 'Sol', last: 'Ríos', date: add(today, 2), start: 570, pro: 'a' } }, N);
ok(m.length === 1 && m[0].title === 'Turno pedido online: Sol Ríos' && /09:30 · Angel/.test(m[0].body), 'turno pedido online');

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

console.log(fails ? fails + ' FALLAS' : 'todo bien');
process.exit(fails ? 1 : 0);
