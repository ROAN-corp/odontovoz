// Pasar historias de papel: la función hc-read con la base y la IA simuladas (incluye el saldo de hojas por cuenta).
// Correr: node --experimental-strip-types --no-warnings tests/hc/hcread.test.mjs
const ENV = { SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_ROLE_KEY: 'srv', SUPABASE_ANON_KEY: 'anon' };
globalThis.Deno = { env: { get: k => ENV[k] } };
const F = await import('../../supabase/functions/hc-read/index.ts');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALLA') + ' ' + m); if (!c) fails++; };

/* base simulada: saldo por cuenta (sin entrada = el servicio no está activado), tope diario y IA */
let calls = [], aiReply = null, hits = 0, hitFail = false, takeFail = false, refundFail = false, aiThrows = false;
const bal = {};
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url, init });
  const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
  const b = () => { try { return JSON.parse(init.body); } catch (_) { return {}; } };
  if (url.endsWith('/rpc/ov_whoami')) return init.headers.Authorization === 'Bearer bueno' ? J({ owner: 'own-1' }) : J({ owner: null });
  if (url.endsWith('/rpc/ov_ai_take')) {
    if (takeFail) return J({ msg: 'no existe la función' }, 404);
    const { p_owner: o, p_n: n } = b(); if (bal[o] === undefined) return J(-2); if (bal[o] < n) return J(-1); bal[o] -= n; return J(bal[o]);
  }
  if (url.endsWith('/rpc/ov_ai_refund')) { if (refundFail) return J({ msg: 'caída' }, 500); const { p_owner: o, p_n: n } = b(); bal[o] += n; return J(bal[o]); }
  if (url.endsWith('/rpc/ov_ai_hit')) { if (hitFail) return J({ msg: 'no existe' }, 404); hits += b().p_n; return J(hits); }
  if (url.startsWith('https://api.anthropic.com/')) { if (aiThrows) throw new Error('sin red'); return aiReply ? J(aiReply) : J({ error: 'x' }, 500); }
  return J({}, 404);
};
const req = (body, auth = 'Bearer bueno', extra = {}) => new Request('https://f.test/hc-read', { method: 'POST', headers: Object.assign({ authorization: auth, 'content-type': 'application/json' }, extra), body: JSON.stringify(body) });
const img = { type: 'image/jpeg', data: 'AAAA' };
const aiCalls = () => calls.filter(c => c.url.startsWith('https://api.anthropic.com/')).length;
const GOOD = { content: [{ type: 'tool_use', name: 'historia', input: {
  paciente: { first: ' Ariana ', last: 'Quinteros', dni: '35.123.456', birth: '1990-04-12', age: 999, cov: 'OSPe', inventado: 'x' },
  antecedentes: { marcados: ['hta', 'penicilina', 'cualquiera'], medicacion: 'enalapril' },
  odontograma: [{ texto: 'obturación oclusal 16', estado: 'realizado' }, { texto: 'caries 36', estado: 'azul' }, { texto: '' }],
  evoluciones: [{ fecha: '2019-03-15', texto: 'Ext. 48 s/c' }, { fecha: '15/3/19', texto: 'control [?]' }, { texto: '' }],
  dudoso: ['dni'], varios: false } }] };

/* ---- lo de siempre ---- */
let r = await F.serve(req({ images: [img] }, ''));
ok(r.status === 401, 'sin sesión no entra');
r = await F.serve(req({ images: [img] }));
ok(r.status === 503 && (await r.json()).off === true, 'sin clave de IA avisa que está apagada');
ENV.ANTHROPIC_API_KEY = 'k';
r = await F.serve(req({ images: [] }));
ok(r.status === 400, 'sin fotos no hace nada');
r = await F.serve(req({ images: Array(9).fill(img) }));
ok(r.status === 400, 'más de 8 hojas no');
r = await F.serve(req({ images: [img] }, 'Bearer otro'));
ok(r.status === 403, 'usuario sin cuenta no');

/* ---- el servicio está apagado para quien no pagó ---- */
calls = []; hits = 0; aiReply = GOOD;
r = await F.serve(req({ images: [img, img] }));
let j = await r.json();
ok(r.status === 503 && j.off === true && j.code === 'no_activada' && /no está activada/.test(j.msg), 'cuenta sin el servicio activado: 503 «no activada»');
ok(aiCalls() === 0 && hits === 0, '… y no llama a la IA ni cuenta nada');

takeFail = true;
r = await F.serve(req({ images: [img] }));
j = await r.json();
ok(r.status === 503 && j.code === 'no_activada' && aiCalls() === 0, 'si el SQL del saldo no está corrido, NO regala lecturas (falla cerrado)');
takeFail = false;

bal['own-1'] = 1;
r = await F.serve(req({ images: [img, img] }));
j = await r.json();
ok(r.status === 503 && j.code === 'sin_hojas' && /Se terminaron/.test(j.msg) && bal['own-1'] === 1 && aiCalls() === 0, 'activada pero sin hojas suficientes: 503 «se terminaron» y no descuenta');

/* ---- con hojas ---- */
bal['own-1'] = 10; calls = []; hits = 0;
r = await F.serve(req({ images: [img, img], hint: 'Quinteros' }, 'Bearer bueno', { 'x-ov-owner': 'own-1' }));
j = await r.json();
ok(r.status === 200 && j.ok && j.pages === 2, 'con hojas: lee y responde');
ok(bal['own-1'] === 8 && j.left === 8, 'descuenta 2 hojas (quedan 8) y avisa cuántas quedan');
ok(j.data.paciente.first === 'Ariana' && j.data.paciente.dni === '35123456' && j.data.paciente.age === null && !('inventado' in j.data.paciente), 'limpia los datos del paciente');
ok(j.data.antecedentes.marcados.join() === 'hta,penicilina', 'solo antecedentes conocidos');
ok(j.data.odontograma.length === 2 && j.data.odontograma[1].estado === 'no se sabe', 'odontograma limpio');
ok(j.data.evoluciones.length === 2 && j.data.evoluciones[1].fecha === '' && j.data.evoluciones[0].fecha === '2019-03-15', 'evoluciones: fecha inválida queda vacía');
const ai = calls.filter(c => c.url.startsWith('https://api.anthropic.com/'))[0], body = JSON.parse(ai.init.body);
ok(body.tool_choice.name === 'historia' && body.messages[0].content.filter(c => c.type === 'image').length === 2, 'manda las fotos a la IA y obliga a usar la herramienta');
ok(calls.filter(c => c.url.endsWith('/rpc/ov_whoami'))[0].init.headers['x-ov-owner'] === 'own-1', 'respeta el lugar elegido');
ok(hits === 2, 'cuenta las hojas para el tope');
ok(calls.filter(c => c.url.endsWith('/rpc/ov_ai_take'))[0].init.headers.Authorization === 'Bearer srv', 'descuenta con la clave del servidor (no la del usuario)');
r = await F.serve(req({ images: [img, img, img] }));
ok((await r.json()).left === 5 && bal['own-1'] === 5, 'cobra una hoja por foto (3 fotos: quedan 5)');

/* ---- si algo falla, las hojas vuelven ---- */
bal['own-1'] = 10; hits = 0;
aiReply = null;
r = await F.serve(req({ images: [img, img] }));
ok(r.status === 502 && bal['own-1'] === 10, 'si la IA falla: avisa y devuelve las hojas');
aiReply = { content: [{ type: 'text', text: 'no puedo' }] };
r = await F.serve(req({ images: [img] }));
ok(r.status === 422 && bal['own-1'] === 10, 'si la IA no usa la herramienta: avisa y devuelve las hojas');
aiReply = GOOD; aiThrows = true;
r = await F.serve(req({ images: [img] }));
ok(r.status === 502 && bal['own-1'] === 10, 'si se corta la conexión con la IA: avisa y devuelve las hojas');
aiThrows = false;
refundFail = true; aiReply = null;
r = await F.serve(req({ images: [img] }));
ok(r.status === 502, 'si además falla la devolución, igual responde (no se cuelga)');
refundFail = false; bal['own-1'] = 10; aiReply = GOOD;

/* ---- tope diario ---- */
ENV.HC_READ_MAX = '3'; hits = 0; calls = [];
r = await F.serve(req({ images: [img, img] }));
ok(r.status === 200, 'dentro del tope: lee');
r = await F.serve(req({ images: [img, img] }));
ok(r.status === 429 && (await r.json()).limit, 'tope diario por cuenta');
ok(bal['own-1'] === 8 && aiCalls() === 1, '… y las hojas del pedido rechazado se devuelven (no se llamó a la IA otra vez)');
hitFail = true;
r = await F.serve(req({ images: [img] }));
ok(r.status === 200, 'si el SQL del tope no está corrido, sigue andando');
delete ENV.HC_READ_MAX; hitFail = false;

/* ---- varios a la vez ---- */
bal['own-1'] = 4; hits = 0;
const rs = await Promise.all(Array.from({ length: 6 }, () => F.serve(req({ images: [img] }))));
const st = rs.map(x => x.status);
ok(st.filter(s => s === 200).length === 4 && st.filter(s => s === 503).length === 2 && bal['own-1'] === 0, 'con 4 hojas y 6 pedidos a la vez: 4 leen y 2 quedan sin hojas');

console.log(fails ? fails + ' FALLAS' : 'todo bien');
process.exit(fails ? 1 : 0);
