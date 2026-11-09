// OdontoVoz · Secretaria virtual por WhatsApp · recibe los mensajes de Meta y responde (1.39)
// Se publica en Supabase › Edge Functions con el nombre «wa-webhook» y SIN «Verify JWT» (Meta no manda sesión).
// Secretos (Edge Functions › Secrets): META_APP_SECRET, META_TOKEN, WA_VERIFY_TOKEN, ANTHROPIC_API_KEY.
// Opcionales: WA_AI_MODEL (modelo de IA), GRAPH_VER (versión de la API de Meta).
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase solo; nunca salen de acá.
//
// Cuidados para que Meta no castigue el número del cliente:
//  · Solo canal oficial (Cloud API). Solo se responde a quien escribió (ventana de 24 h, gratis).
//  · El asistente se presenta como asistente del consultorio y habla solo de turnos y del consultorio.
//  · «BAJA» corta los recordatorios al instante; ofrece pasar con una persona; tope de respuestas por charla.

const env = (k: string, d = '') => (globalThis as any).Deno?.env?.get(k) ?? d;
const SB = () => env('SUPABASE_URL');
const KEY = () => env('SUPABASE_SERVICE_ROLE_KEY');
const GV = () => env('GRAPH_VER', 'v23.0');
const MODEL = () => env('WA_AI_MODEL', 'claude-haiku-5-5');
const TZ = 'America/Argentina/Buenos_Aires';
const MAX_BOT_PER_DAY = 40;   // respuestas del asistente por charla y por día
const MAX_IN_LEN = 1200;

/* ---------- base de datos (REST con la clave del servidor) ---------- */
async function db(path: string, init: any = {}) {
  const r = await fetch(SB() + '/rest/v1/' + path, {
    method: init.method || 'GET',
    headers: { apikey: KEY(), Authorization: 'Bearer ' + KEY(), 'Content-Type': 'application/json', Prefer: init.prefer || 'return=representation' },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const t = await r.text();
  if (!r.ok) throw new Error('db ' + r.status + ' ' + t.slice(0, 300));
  return t ? JSON.parse(t) : null;
}
const one = async (path: string) => ((await db(path)) || [])[0] || null;
const rpc = (fn: string, body: any) => db('rpc/' + fn, { method: 'POST', body });

/* ---------- WhatsApp ---------- */
async function graph(path: string, body?: any) {
  const r = await fetch('https://graph.facebook.com/' + GV() + '/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer ' + env('META_TOKEN'), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('graph ' + r.status + ' ' + JSON.stringify(j).slice(0, 300));
  return j;
}
async function sendText(w: any, chat: any, text: string, who = 'bot') {
  text = String(text || '').trim().slice(0, 3500);
  if (!text) return;
  let wamid = null, status = 'sent';
  try {
    const j = await graph(w.phone_id + '/messages', { messaging_product: 'whatsapp', recipient_type: 'individual', to: chat.wa_id, type: 'text', text: { preview_url: false, body: text } });
    wamid = j?.messages?.[0]?.id || null;
  } catch (e) { status = 'failed'; console.error(e); }
  await db('ov_wa_msgs', { method: 'POST', prefer: 'return=minimal', body: { owner: w.owner, chat: chat.id, dir: 'out', who, body: text, wamid, status } });
  await db('ov_wa_chats?id=eq.' + chat.id, { method: 'PATCH', prefer: 'return=minimal', body: { last_at: new Date().toISOString(), last_text: text.slice(0, 140) } });
}
async function markRead(w: any, wamid: string) {
  try { await graph(w.phone_id + '/messages', { messaging_product: 'whatsapp', status: 'read', message_id: wamid, typing_indicator: { type: 'text' } }); } catch (_) { /* nada */ }
}

/* ---------- firma de Meta ---------- */
async function signed(raw: string, sig: string | null) {
  const secret = env('META_APP_SECRET');
  if (!secret || !sig || !sig.startsWith('sha256=')) return false;
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(raw)));
  const hex = Array.from(mac).map(b => b.toString(16).padStart(2, '0')).join('');
  const got = sig.slice(7);
  if (got.length !== hex.length) return false;
  let d = 0; for (let i = 0; i < hex.length; i++) d |= hex.charCodeAt(i) ^ got.charCodeAt(i);
  return d === 0;
}

// >>> CEREBRO (se copia igual a wa-sim con: node scripts/build-wa.js)
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
    book?.sena ? `Se pide una seña de $${book.sena} para algunos turnos; los detalles los da una persona.` : '',
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

// <<< CEREBRO

/* ---------- una respuesta del asistente ---------- */
async function botReply(w: any, chat: any) {
  const book = await one('ov_booking?owner=eq.' + w.owner + '&select=slug,enabled,data');
  const data = book?.data || {};
  const hist = (await db('ov_wa_msgs?chat=eq.' + chat.id + '&select=dir,who,body&order=created_at.desc&limit=24')).reverse();
  const msgs: any[] = [];
  for (const m of hist) {
    const role = m.dir === 'in' ? 'user' : 'assistant';
    const text = (m.who === 'persona' ? '[Respondió una persona del consultorio] ' : '') + (m.body || '');
    if (msgs.length && msgs[msgs.length - 1].role === role) msgs[msgs.length - 1].content += '\n' + text; else msgs.push({ role, content: text });
  }
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length) return;
  const sys = system(w, data);
  for (let round = 0; round < 5; round++) {
    const res = await ai(sys, msgs);
    const uses = (res.content || []).filter((b: any) => b.type === 'tool_use');
    const text = (res.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim();
    if (!uses.length) { if (text) await sendText(w, chat, text); return; }
    msgs.push({ role: 'assistant', content: res.content });
    const results: any[] = [];
    for (const u of uses) {
      let out: any = {};
      try {
        if (u.name === 'buscar_horarios') out = book?.enabled ? buscar(data, u.input || {}) : { opciones: [], aviso: 'La agenda online está apagada: pasá la charla a una persona.' };
        else if (u.name === 'pedir_turno') {
          if (w.cfg?.book === false) out = { ok: false, msg: 'Este consultorio no da turnos por chat.' };
          else {
            const [pro, date, start, dur] = String(u.input.opcion || '').split('|');
            const r = await rpc('ov_booking_request', { p_slug: book.slug, p_req: { type: u.input.motivo, date, start: +start, pro, dur: +dur || 30,
              first: u.input.nombre, last: u.input.apellido, dni: u.input.dni, phone: chat.wa_id, cov: u.input.obra_social || '',
              note: 'Pedido por WhatsApp (asistente).' + (u.input.nota ? ' Motivo: ' + String(u.input.nota).slice(0, 200) : '') } });
            out = r;
          }
        } else if (u.name === 'pasar_a_persona') {
          await db('ov_wa_chats?id=eq.' + chat.id, { method: 'PATCH', prefer: 'return=minimal', body: { mode: 'humano', need: String(u.input.motivo || '').slice(0, 200) } });
          await db('ov_wa_events', { method: 'POST', prefer: 'return=minimal', body: { owner: w.owner, kind: 'persona', wa_id: chat.wa_id } });
          out = { ok: true, msg: 'Listo: una persona del consultorio va a seguir la charla. Avisale al paciente que en breve le responden.' };
        }
      } catch (e) { out = { ok: false, msg: 'No se pudo: ' + String((e as any).message || e).slice(0, 120) }; }
      results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(out) });
    }
    msgs.push({ role: 'user', content: results });
  }
  await sendText(w, chat, 'Disculpá, no pude resolverlo. Ya le aviso a alguien del consultorio para que te responda.');
}

/* ---------- un mensaje entrante ---------- */
const BAJA = /^(baja|stop|parar|no (quiero )?(recibir )?mas (mensajes|recordatorios)|desuscribir(me)?)\.?$/;
const ALTA = /^alta\.?$/;
async function onMessage(w: any, m: any, contacts: any[]) {
  if (await one('ov_wa_msgs?wamid=eq.' + encodeURIComponent(m.id) + '&select=id')) return;  // Meta reintentó
  const waId = String(m.from || '').replace(/\D/g, '');
  const name = (contacts || []).find((c: any) => c.wa_id === m.from)?.profile?.name || null;
  let chat = await one('ov_wa_chats?owner=eq.' + w.owner + '&wa_id=eq.' + waId + '&select=*');
  const fresh = !chat || !chat.last_in || Date.now() - new Date(chat.last_in).getTime() > 24 * 3600e3;
  if (!chat) chat = (await db('ov_wa_chats', { method: 'POST', body: { owner: w.owner, wa_id: waId, name } }))[0];

  let body = '', payload = '';
  if (m.type === 'text') body = String(m.text?.body || '').slice(0, MAX_IN_LEN);
  else if (m.type === 'button') { body = m.button?.text || ''; payload = m.button?.payload || ''; }
  else if (m.type === 'interactive') { const x = m.interactive?.button_reply || m.interactive?.list_reply || {}; body = x.title || ''; payload = x.id || ''; }
  else body = '[' + (({ audio: 'audio', image: 'foto', video: 'video', document: 'archivo', sticker: 'sticker', location: 'ubicación' } as any)[m.type] || m.type) + ']';

  await db('ov_wa_msgs', { method: 'POST', prefer: 'return=minimal', body: { owner: w.owner, chat: chat.id, dir: 'in', who: 'paciente', body, wamid: m.id } });
  await db('ov_wa_chats?id=eq.' + chat.id, { method: 'PATCH', prefer: 'return=minimal', body: { last_in: new Date().toISOString(), last_at: new Date().toISOString(), unread: (chat.unread || 0) + 1, last_text: body.slice(0, 140), name: chat.name || name } });
  await markRead(w, m.id);

  /* charlas del mes (para el tope del plan) */
  const per = nowAR().date.slice(0, 7);
  if (fresh) {
    const used = w.period === per ? (w.used || 0) + 1 : 1;
    await db('ov_wa?owner=eq.' + w.owner, { method: 'PATCH', prefer: 'return=minimal', body: { used, period: per } });
    w.used = used; w.period = per;
  }

  const t = norm(body);
  /* bajas y altas: siempre, sin IA */
  if (BAJA.test(t)) {
    await db('ov_wa_chats?id=eq.' + chat.id, { method: 'PATCH', prefer: 'return=minimal', body: { opt_out: true } });
    await db('ov_wa_out?owner=eq.' + w.owner + '&wa_id=eq.' + waId + '&status=eq.cola', { method: 'PATCH', prefer: 'return=minimal', body: { status: 'omitido', why: 'baja' } });
    await db('ov_wa_events', { method: 'POST', prefer: 'return=minimal', body: { owner: w.owner, kind: 'baja', wa_id: waId } });
    return sendText(w, chat, 'Listo, no te vamos a mandar más recordatorios por acá. Si querés volver a recibirlos, escribí ALTA.', 'sistema');
  }
  if (ALTA.test(t)) {
    await db('ov_wa_chats?id=eq.' + chat.id, { method: 'PATCH', prefer: 'return=minimal', body: { opt_out: false } });
    return sendText(w, chat, '¡Listo! Vas a volver a recibir los recordatorios de tus turnos.', 'sistema');
  }
  /* botones de los recordatorios */
  const pm = /^(conf|camb):(.+)$/.exec(payload);
  if (pm) {
    await db('ov_wa_events', { method: 'POST', prefer: 'return=minimal', body: { owner: w.owner, kind: pm[1] === 'conf' ? 'confirma' : 'cambia', appt: pm[2].slice(0, 60), wa_id: waId } });
    if (pm[1] === 'conf') return sendText(w, chat, '¡Gracias por confirmar! Te esperamos. 😊', 'sistema');
    body = 'Necesito cambiar mi turno.';
  }

  if (chat.mode === 'humano') return;                              // la atiende una persona
  if (w.cfg?.on === false) return;                                 // asistente apagado: solo bandeja
  if (w.used > (w.quota || 100)) {                                 // se pasó del tope del mes
    if (fresh) {
      await db('ov_wa_chats?id=eq.' + chat.id, { method: 'PATCH', prefer: 'return=minimal', body: { mode: 'humano', need: 'Tope de charlas del mes' } });
      await db('ov_wa_events', { method: 'POST', prefer: 'return=minimal', body: { owner: w.owner, kind: 'persona', wa_id: waId } });
      return sendText(w, chat, '¡Hola! Recibimos tu mensaje. En breve te responde alguien del consultorio.', 'sistema');
    }
    return;
  }
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const nb = await db('ov_wa_msgs?chat=eq.' + chat.id + '&who=eq.bot&created_at=gt.' + since + '&select=id');
  if ((nb || []).length >= MAX_BOT_PER_DAY) {
    await db('ov_wa_chats?id=eq.' + chat.id, { method: 'PATCH', prefer: 'return=minimal', body: { mode: 'humano', need: 'Charla muy larga' } });
    return sendText(w, chat, 'Te paso con una persona del consultorio para seguir. ¡Gracias por la paciencia!', 'sistema');
  }
  if (m.type !== 'text' && m.type !== 'button' && m.type !== 'interactive') {
    return sendText(w, chat, 'Por ahora solo puedo leer mensajes escritos. ¿Me lo escribís? Si preferís, te paso con una persona.', 'sistema');
  }
  try { await botReply(w, { ...chat, mode: 'bot' }); }
  catch (e) {
    console.error(e);
    await db('ov_wa_chats?id=eq.' + chat.id, { method: 'PATCH', prefer: 'return=minimal', body: { mode: 'humano', need: 'El asistente tuvo un problema' } });
    await sendText(w, chat, 'Recibimos tu mensaje. En breve te responde alguien del consultorio.', 'sistema');
  }
}

async function onStatus(s: any) {
  if (!s?.id) return;
  await db('ov_wa_msgs?wamid=eq.' + encodeURIComponent(s.id), { method: 'PATCH', prefer: 'return=minimal', body: { status: String(s.status || '').slice(0, 20) } });
}

async function handle(payload: any) {
  for (const e of payload?.entry || []) for (const ch of e.changes || []) {
    const v = ch.value || {}, pid = v.metadata?.phone_number_id;
    if (!pid) continue;
    const w = await one('ov_wa?phone_id=eq.' + encodeURIComponent(pid) + '&select=*');
    if (!w || w.status !== 'activo') continue;
    for (const s of v.statuses || []) await onStatus(s).catch(console.error);
    for (const m of v.messages || []) await onMessage(w, m, v.contacts || []).catch(console.error);
  }
}

export async function serve(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (req.method === 'GET') {   // verificación del webhook al configurarlo en Meta
    if (url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === env('WA_VERIFY_TOKEN') && env('WA_VERIFY_TOKEN'))
      return new Response(url.searchParams.get('hub.challenge') || '', { status: 200 });
    return new Response('no', { status: 403 });
  }
  if (req.method !== 'POST') return new Response('no', { status: 405 });
  const raw = await req.text();
  if (!(await signed(raw, req.headers.get('x-hub-signature-256')))) return new Response('firma', { status: 401 });
  let payload: any = {}; try { payload = JSON.parse(raw); } catch (_) { return new Response('ok'); }
  const job = handle(payload).catch(console.error);
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(job); else await job;   // Meta quiere el 200 rápido
  return new Response('ok', { status: 200 });
}
(globalThis as any).Deno?.serve?.(serve);
