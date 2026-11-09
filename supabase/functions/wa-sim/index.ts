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

// ---- cerebro copiado de wa-webhook ----
/* ---------- fechas en hora argentina ---------- */
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function nowAR() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const g = (t: string) => (p.find(x => x.type === t) || { value: '' }).value;
  return { date: g('year') + '-' + g('month') + '-' + g('day'), min: (+g('hour') % 24) * 60 + +g('minute') };
}
const hm = (m: number) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const dayName = (d: string) => DIAS[new Date(d + 'T12:00:00Z').getUTCDay()];
const dayText = (d: string) => dayName(d) + ' ' + (+d.slice(8)) + ' de ' + MESES[+d.slice(5, 7) - 1];
const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/* ---------- herramientas del asistente ---------- */
function slotsFor(book: any, motivo: string) {
  const s = book?.slots || {};
  return s[motivo] || s['control'] || s['primera'] || s[Object.keys(s)[0]] || {};
}
function buscar(book: any, a: any) {
  const now = nowAR(), byD = slotsFor(book, a.motivo || ''), out: any[] = [];
  const pros = book?.pros || [];
  const proOk = (id: string) => !a.profesional || norm((pros.find((p: any) => p.id === id) || {}).name).includes(norm(a.profesional));
  const days = Object.keys(byD).sort().filter(d => d >= (a.desde || now.date) && (!a.hasta || d <= a.hasta));
  for (const d of days) {
    let n = 0;
    for (const s of byD[d]) {
      const [pro, t, dur] = s;
      if (d === now.date && t < now.min + 60) continue;
      if (a.franja === 'manana' && t >= 13 * 60) continue;
      if (a.franja === 'tarde' && t < 13 * 60) continue;
      if (!proOk(pro)) continue;
      out.push({ opcion: pro + '|' + d + '|' + t + '|' + (dur || 30), dia: dayText(d), hora: hm(t), profesional: (pros.find((p: any) => p.id === pro) || {}).name || '' });
      if (++n >= 3) break;
    }
    if (out.length >= 8) break;
  }
  return out.length ? { opciones: out } : { opciones: [], aviso: 'No hay horarios libres con esos datos. Probá con otras fechas o pasá con una persona.' };
}
const TOOLS = [
  { name: 'buscar_horarios', description: 'Busca horarios libres reales de la agenda del consultorio. Usala siempre antes de ofrecer un horario; nunca inventes horarios.',
    input_schema: { type: 'object', properties: {
      motivo: { type: 'string', description: 'clave del motivo de la lista de motivos' },
      desde: { type: 'string', description: 'fecha AAAA-MM-DD (opcional)' }, hasta: { type: 'string', description: 'fecha AAAA-MM-DD (opcional)' },
      franja: { type: 'string', enum: ['manana', 'tarde', 'cualquiera'] }, profesional: { type: 'string', description: 'nombre del profesional si el paciente lo pidió' } }, required: ['motivo'] } },
  { name: 'pedir_turno', description: 'Pide el turno elegido. Solo después de que el paciente eligió una opción de buscar_horarios y dio nombre, apellido y DNI, y confirmó.',
    input_schema: { type: 'object', properties: {
      opcion: { type: 'string', description: 'el valor «opcion» que devolvió buscar_horarios' }, motivo: { type: 'string' },
      nombre: { type: 'string' }, apellido: { type: 'string' }, dni: { type: 'string' }, obra_social: { type: 'string' }, nota: { type: 'string', description: 'motivo contado por el paciente, en pocas palabras' } },
      required: ['opcion', 'motivo', 'nombre', 'apellido', 'dni'] } },
  { name: 'pasar_a_persona', description: 'Pasa la charla a una persona del consultorio: urgencias con mucho dolor o sangrado, quejas, pagos, dudas clínicas, pedidos que no podés resolver o si el paciente lo pide.',
    input_schema: { type: 'object', properties: { motivo: { type: 'string' } }, required: ['motivo'] } },
];

function system(w: any, book: any) {
  const c = w.cfg || {}, now = nowAR();
  const name = c.botName || 'el asistente virtual';
  const types = (book?.types || []).map((t: any) => t.k + ' = ' + t.label).join('; ');
  const pros = (book?.pros || []).map((p: any) => p.name + (p.spec ? ' (' + p.spec + ')' : '')).join(', ');
  return [
    `Sos ${name}, asistente virtual por WhatsApp de ${book?.clinic || 'un consultorio odontológico'}. Hablás en castellano rioplatense (vos), cordial, breve y claro: mensajes cortos, sin listas largas, como una buena secretaria.`,
    'En tu primer mensaje de cada charla aclarás que sos el asistente virtual del consultorio y que, si prefiere, lo pasás con una persona.',
    'Solo hablás de temas del consultorio: turnos, horarios, dirección, obras sociales, precios cargados abajo y cómo prepararse para la consulta. Si te preguntan cualquier otra cosa, decí amablemente que solo podés ayudar con el consultorio.',
    'No das diagnósticos, ni indicaciones de medicamentos, ni opiniones clínicas. Ante dolor fuerte, hinchazón grande, fiebre o sangrado que no para: ofrecé el primer turno de urgencia y, si es grave, sugerí ir a una guardia; además pasá la charla a una persona.',
    'Nunca inventes horarios, precios ni datos: usá buscar_horarios y la información de abajo. Si no sabés algo, ofrecé pasar con una persona.',
    c.book === false ? 'Este consultorio NO da turnos por este chat: tomá los datos y pasá la charla a una persona.' :
      'Para dar un turno: preguntá el motivo, buscá horarios (ofrecé 2 o 3 opciones), cuando elija pedí nombre, apellido, DNI y obra social (si tiene), repetí el resumen y, cuando confirme, usá pedir_turno. Después avisá que el consultorio le va a confirmar.',
    'No pidas datos de más (nada de domicilio, mail ni datos de tarjeta). No mandes links salvo la dirección.',
    `Hoy es ${dayText(now.date)} (${now.date}), ${hm(now.min)} h.`,
    `Motivos (clave = nombre): ${types || 'control = Control'}.`,
    pros ? `Profesionales: ${pros}.` : '',
    book?.addr ? `Dirección: ${book.addr}.` : '',
    book?.phone ? `Teléfono del consultorio: ${book.phone}.` : '',
    book?.cancelHours ? `Los turnos se cancelan con ${book.cancelHours} h de anticipación.` : '',
    book?.sena ? `Se pide una seña de ${book.sena} para algunos turnos; los detalles los da una persona.` : '',
    c.info ? 'Información del consultorio (usala tal cual): ' + String(c.info).slice(0, 2500) : '',
  ].filter(Boolean).join('\n');
}

async function ai(sys: string, msgs: any[]) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL(), max_tokens: 600, system: [{ type: 'text', text: sys, cache_control: { type: 'ephemeral' } }], tools: TOOLS, messages: msgs }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('ia ' + r.status + ' ' + JSON.stringify(j).slice(0, 300));
  return j;
}



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
