// Pasar historias de papel: la función hc-read con la base y la IA simuladas.
// Correr: node --experimental-strip-types --no-warnings tests/hc/hcread.test.mjs
const ENV = { SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_ROLE_KEY: 'srv', SUPABASE_ANON_KEY: 'anon' };
globalThis.Deno = { env: { get: k => ENV[k] } };
const F = await import('../../supabase/functions/hc-read/index.ts');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALLA') + ' ' + m); if (!c) fails++; };

let calls = [], aiReply = null, hits = 0, hitFail = false;
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url, init });
  const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
  if (url.endsWith('/rpc/ov_whoami')) return init.headers.Authorization === 'Bearer bueno' ? J({ owner: 'own-1' }) : J({ owner: null });
  if (url.endsWith('/rpc/ov_ai_hit')) { if (hitFail) return J({ msg: 'no existe' }, 404); hits += JSON.parse(init.body).p_n; return J(hits); }
  if (url.startsWith('https://api.anthropic.com/')) return aiReply ? J(aiReply) : J({ error: 'x' }, 500);
  return J({}, 404);
};
const req = (body, auth = 'Bearer bueno', extra = {}) => new Request('https://f.test/hc-read', { method: 'POST', headers: Object.assign({ authorization: auth, 'content-type': 'application/json' }, extra), body: JSON.stringify(body) });
const img = { type: 'image/jpeg', data: 'AAAA' };

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

aiReply = { content: [{ type: 'tool_use', name: 'historia', input: {
  paciente: { first: ' Ariana ', last: 'Quinteros', dni: '35.123.456', birth: '1990-04-12', age: 999, cov: 'OSPe', inventado: 'x' },
  antecedentes: { marcados: ['hta', 'penicilina', 'cualquiera'], medicacion: 'enalapril' },
  odontograma: [{ texto: 'obturación oclusal 16', estado: 'realizado' }, { texto: 'caries 36', estado: 'azul' }, { texto: '' }],
  evoluciones: [{ fecha: '2019-03-15', texto: 'Ext. 48 s/c' }, { fecha: '15/3/19', texto: 'control [?]' }, { texto: '' }],
  dudoso: ['dni'], varios: false } }] };
calls = [];
r = await F.serve(req({ images: [img, img], hint: 'Quinteros' }, 'Bearer bueno', { 'x-ov-owner': 'own-1' }));
const j = await r.json();
ok(r.status === 200 && j.ok && j.pages === 2, 'lee y responde');
ok(j.data.paciente.first === 'Ariana' && j.data.paciente.dni === '35123456' && j.data.paciente.age === null && !('inventado' in j.data.paciente), 'limpia los datos del paciente');
ok(j.data.antecedentes.marcados.join() === 'hta,penicilina', 'solo antecedentes conocidos');
ok(j.data.odontograma.length === 2 && j.data.odontograma[1].estado === 'no se sabe', 'odontograma limpio');
ok(j.data.evoluciones.length === 2 && j.data.evoluciones[1].fecha === '' && j.data.evoluciones[0].fecha === '2019-03-15', 'evoluciones: fecha inválida queda vacía');
const ai = calls.filter(c => c.url.startsWith('https://api.anthropic.com/'))[0], body = JSON.parse(ai.init.body);
ok(body.tool_choice.name === 'historia' && body.messages[0].content.filter(c => c.type === 'image').length === 2, 'manda las fotos a la IA y obliga a usar la herramienta');
ok(calls.filter(c => c.url.endsWith('/rpc/ov_whoami'))[0].init.headers['x-ov-owner'] === 'own-1', 'respeta el lugar elegido');
ok(hits === 2, 'cuenta las hojas para el tope');

ENV.HC_READ_MAX = '3';
r = await F.serve(req({ images: [img, img] }));
ok(r.status === 429 && (await r.json()).limit, 'tope diario por cuenta');
hitFail = true;
r = await F.serve(req({ images: [img] }));
ok(r.status === 200, 'si el SQL del tope no está corrido, sigue andando');
aiReply = { content: [{ type: 'text', text: 'no puedo' }] };
r = await F.serve(req({ images: [img] }));
ok(r.status === 422, 'si la IA no usa la herramienta, avisa');
aiReply = null;
r = await F.serve(req({ images: [img] }));
ok(r.status === 502, 'si la IA falla, avisa');

console.log(fails ? fails + ' FALLAS' : 'todo bien');
process.exit(fails ? 1 : 0);
