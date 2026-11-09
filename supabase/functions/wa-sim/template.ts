// @ts-nocheck
// OdontoVoz · Secretaria virtual · PRUEBA con la inteligencia artificial real, sin WhatsApp (1.39)
// Sirve para que cualquier cuenta (testers incluidos) charle con el asistente desde la app, con su agenda de verdad.
// Se publica como «wa-sim» CON «Verify JWT». Secretos: ANTHROPIC_API_KEY. Opcional: WA_AI_MODEL, WA_SIM_MAX (respuestas por día y cuenta).
// ARCHIVO GENERADO: se arma con node scripts/build-wa.js a partir de template.ts + el «cerebro» de wa-webhook.

const env = (k: string, d = '') => (globalThis as any).Deno?.env?.get(k) ?? d;
const SB = () => env('SUPABASE_URL');
const KEY = () => env('SUPABASE_SERVICE_ROLE_KEY');
const MODEL = () => env('WA_AI_MODEL', 'claude-haiku-5-5');
const TZ = 'America/Argentina/Buenos_Aires';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-ov-owner, x-ov-device', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const out = (j: any, status = 200) => new Response(JSON.stringify(j), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function db(path: string, init: any = {}) {
  const r = await fetch(SB() + '/rest/v1/' + path, {
    method: init.method || 'GET',
    headers: { apikey: KEY(), Authorization: 'Bearer ' + KEY(), 'Content-Type': 'application/json', Prefer: init.prefer || 'return=representation' },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const t = await r.text();
  if (!r.ok) throw new Error('db ' + r.status + ' ' + t.slice(0, 200));
  return t ? JSON.parse(t) : null;
}
const rpc = (fn: string, body: any) => db('rpc/' + fn, { method: 'POST', body });

/*__CEREBRO__*/

export async function serve(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return out({ ok: false }, 405);
  const auth = req.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+/.test(auth)) return out({ ok: false, msg: 'Sin sesión' }, 401);
  if (!env('ANTHROPIC_API_KEY')) return out({ ok: false, off: true, msg: 'La prueba con IA todavía no está encendida.' }, 503);
  let b: any = {}; try { b = await req.json(); } catch (_) { /* nada */ }

  /* de quién es la cuenta (respeta el lugar elegido) y su turnero publicado */
  const h: any = { apikey: env('SUPABASE_ANON_KEY'), Authorization: auth, 'Content-Type': 'application/json' };
  const place = req.headers.get('x-ov-owner'); if (place) h['x-ov-owner'] = place;
  const who = await fetch(SB() + '/rest/v1/rpc/ov_whoami', { method: 'POST', headers: h, body: '{}' }).then(r => r.ok ? r.json() : null).catch(() => null);
  const owner = who && who.owner;
  if (!owner) return out({ ok: false, msg: 'No encontré tu cuenta.' }, 403);

  /* tope diario por cuenta (cuida el gasto de IA) */
  const max = +env('WA_SIM_MAX', '80'), day = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  const used = await rpc('ov_wa_sim_hit', { p_owner: owner, p_day: day }).catch(() => 0);
  if (+used > max) return out({ ok: true, reply: 'Por hoy se terminó la prueba con IA de esta cuenta. Mañana podés seguir probando.' });

  const book = ((await db('ov_booking?owner=eq.' + owner + '&select=slug,enabled,data')) || [])[0];
  const data = book?.data || {};
  const w = { owner, cfg: b.cfg || {} };
  const msgs: any[] = [];
  for (const m of (Array.isArray(b.messages) ? b.messages : []).slice(-24)) {
    const role = m.role === 'user' ? 'user' : 'assistant', text = String(m.text || '').slice(0, 1200);
    if (!text) continue;
    if (msgs.length && msgs[msgs.length - 1].role === role) msgs[msgs.length - 1].content += '\n' + text; else msgs.push({ role, content: text });
  }
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length) return out({ ok: false, msg: 'Falta el mensaje.' }, 400);
  const sys = system(w, data) + '\nESTO ES UNA PRUEBA desde la app: el que escribe es alguien del consultorio probando. Los turnos que pidas se cargan de verdad en su agenda como «pedido online».';
  let booked: any = null, handed = false;
  for (let round = 0; round < 5; round++) {
    const res = await ai(sys, msgs);
    const uses = (res.content || []).filter((x: any) => x.type === 'tool_use');
    const text = (res.content || []).filter((x: any) => x.type === 'text').map((x: any) => x.text).join('\n').trim();
    if (!uses.length) return out({ ok: true, reply: text || '…', booked, handed });
    msgs.push({ role: 'assistant', content: res.content });
    const results: any[] = [];
    for (const u of uses) {
      let o: any = {};
      try {
        if (u.name === 'buscar_horarios') o = book?.enabled ? buscar(data, u.input || {}) : { opciones: [], aviso: 'El turnero online de esta cuenta está apagado o sin publicar: no hay horarios para ofrecer.' };
        else if (u.name === 'pedir_turno') {
          if (w.cfg?.book === false || !book) o = { ok: false, msg: 'Este consultorio no da turnos por chat.' };
          else {
            const [pro, date, start, dur] = String(u.input.opcion || '').split('|');
            o = await rpc('ov_booking_request', { p_slug: book.slug, p_req: { type: u.input.motivo, date, start: +start, pro, dur: +dur || 30,
              first: u.input.nombre, last: u.input.apellido, dni: u.input.dni, phone: String(b.phone || '1100000000').replace(/\D/g, '').slice(0, 15) || '1100000000', cov: u.input.obra_social || '',
              note: 'PRUEBA de la Secretaria por WhatsApp.' + (u.input.nota ? ' Motivo: ' + String(u.input.nota).slice(0, 200) : '') } });
            if (o && o.ok) booked = { date, start: +start, pro, code: o.code };
          }
        } else if (u.name === 'pasar_a_persona') { handed = true; o = { ok: true, msg: 'En la versión real, la charla pasa a una persona del consultorio y le llega un aviso.' }; }
      } catch (e) { o = { ok: false, msg: 'No se pudo: ' + String((e as any).message || e).slice(0, 120) }; }
      results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(o) });
    }
    msgs.push({ role: 'user', content: results });
  }
  return out({ ok: true, reply: 'Disculpá, no pude resolverlo. En la versión real te paso con una persona.', booked, handed });
}
(globalThis as any).Deno?.serve?.(serve);
