// @ts-nocheck
// OdontoVoz · Autogestión por WhatsApp · recibe los mensajes de Meta y responde con el menú de botones (1.39.1)
// (la respuesta con IA queda guardada: se usa solo si la cuenta tiene cfg.ai = true y existe ANTHROPIC_API_KEY)
// Se publica en Supabase › Edge Functions con el nombre «wa-webhook» y SIN «Verify JWT» (Meta no manda sesión).
// Secretos (Edge Functions › Secrets): META_APP_SECRET, META_TOKEN, WA_VERIFY_TOKEN (ANTHROPIC_API_KEY solo para la IA).
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
const MAX_BOT_PER_DAY = 80;   // respuestas automáticas por charla y por día
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
/* mensaje del menú: texto, botones (hasta 3) o lista (hasta 10 filas) */
const clip = (x: string, n: number) => { x = String(x || ''); return x.length > n ? x.slice(0, n - 1) + '…' : x; };
async function sendMsg(w: any, chat: any, m: any, who = 'bot') {
  let payload: any, shown = m.text || '';
  if (m.buttons && m.buttons.length) {
    payload = { type: 'interactive', interactive: { type: 'button', body: { text: clip(m.text, 1024) }, action: { buttons: m.buttons.slice(0, 3).map((b: any) => ({ type: 'reply', reply: { id: clip(b.id, 256), title: clip(b.title, 20) } })) } } };
    shown += '\n[' + m.buttons.map((b: any) => b.title).join('] [') + ']';
  } else if (m.list && m.list.rows && m.list.rows.length) {
    payload = { type: 'interactive', interactive: { type: 'list', body: { text: clip(m.text, 1024) }, action: { button: clip(m.list.button || 'Ver opciones', 20), sections: [{ title: 'Opciones', rows: m.list.rows.slice(0, 10).map((r: any) => ({ id: clip(r.id, 200), title: clip(r.title, 24), ...(r.desc ? { description: clip(r.desc, 72) } : {}) })) }] } } };
    shown += '\n' + m.list.rows.map((r: any, i: number) => (i + 1) + '. ' + r.title).join('\n');
  } else return sendText(w, chat, m.text, who);
  let wamid = null, status = 'sent';
  try { const j = await graph(w.phone_id + '/messages', { messaging_product: 'whatsapp', recipient_type: 'individual', to: chat.wa_id, ...payload }); wamid = j?.messages?.[0]?.id || null; }
  catch (e) { status = 'failed'; console.error(e); }
  await db('ov_wa_msgs', { method: 'POST', prefer: 'return=minimal', body: { owner: w.owner, chat: chat.id, dir: 'out', who, body: shown.slice(0, 3500), wamid, status } });
  await db('ov_wa_chats?id=eq.' + chat.id, { method: 'PATCH', prefer: 'return=minimal', body: { last_at: new Date().toISOString(), last_text: String(m.text || '').slice(0, 140) } });
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

// >>> MENU (se copia de scripts/wa-menu.js con: node scripts/build-wa.js)
/* Autogestión por WhatsApp · motor del menú con botones (sin IA). Código común a la app («Probala») y al servidor (wa-webhook).
   node scripts/build-wa.js lo copia dentro de supabase/functions/wa-webhook/index.ts y de src/app52.js: editá SOLO este archivo.
   step(estado, entrada, ctx) → { st, out: [mensajes], act? }
     entrada: { text, id } (id = botón o fila de lista tocada) · { booked: {ok, code, msg} } (resultado de pedir el turno)
     ctx: { clinic, addr, phone, info, book, types:[{k,label}], pros:[{id,name}], slots:{tipo:{fecha:[[pro,min,dur]]}}, today:'AAAA-MM-DD', nowMin, now (ms) }
     mensaje: { text } · { text, buttons:[{id,title}] } (hasta 3) · { text, list:{ button, rows:[{id,title,desc}] } } (hasta 10)
     act: { book: {type,date,start,pro,dur,first,last,dni,cov} } · { handoff: 'motivo' } */
const OVMenu = (function () {
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,;:]/g, ' ').replace(/\s+/g, ' ').trim();
  const hm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const dow = d => new Date(d + 'T12:00:00Z').getUTCDay();
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const dShort = d => cap(DIAS[dow(d)]) + ' ' + (+d.slice(8)) + '/' + (+d.slice(5, 7));
  const dLong = d => DIAS[dow(d)] + ' ' + (+d.slice(8)) + ' de ' + MES[+d.slice(5, 7) - 1];
  const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const TIMEOUT = 30 * 60000;

  const MENU_ROWS = ctx => [
    ctx.book !== false ? { id: 'm:turno', title: 'Pedir un turno', desc: 'Elegís el día y el horario' } : null,
    { id: 'm:dir', title: 'Dirección y contacto', desc: ctx.addr ? cut(ctx.addr, 72) : '' },
    ctx.info ? { id: 'm:info', title: 'Obras sociales y precios', desc: 'Lo que atiende el consultorio' } : null,
    { id: 'm:persona', title: 'Hablar con una persona', desc: 'Te responde alguien del consultorio' }
  ].filter(Boolean);
  const menu = (ctx, intro) => ({ text: (intro ? intro + '\n\n' : '') + '¿Qué necesitás?', list: { button: 'Ver opciones', rows: MENU_ROWS(ctx) } });
  const hello = ctx => '¡Hola! 👋 Te responde el asistente automático de ' + (ctx.clinic || 'el consultorio') + '.';
  const back = [{ id: 'm:menu', title: 'Volver al menú' }];

  const slotsOf = (ctx, k) => (ctx.slots && (ctx.slots[k] || ctx.slots.control || ctx.slots[Object.keys(ctx.slots)[0]])) || {};
  const proName = (ctx, id) => ((ctx.pros || []).find(p => p.id === id) || {}).name || '';
  const okSlot = (ctx, d, t) => d > ctx.today || (d === ctx.today && t >= (ctx.nowMin || 0) + 60);
  function days(ctx, k) {
    const by = slotsOf(ctx, k);
    return Object.keys(by).sort().filter(d => d >= ctx.today).map(d => ({ d, l: by[d].filter(s => okSlot(ctx, d, s[1])) })).filter(x => x.l.length).slice(0, 10);
  }
  function askType(st, ctx) {
    const types = (ctx.types || []).slice(0, 10);
    if (types.length <= 1) return askDay({ ...st, k: (types[0] || { k: 'control' }).k }, ctx);
    const rows = types.map(t => ({ id: 't:' + t.k, title: cut(t.label, 24), desc: t.label.length > 24 ? cut(t.label, 72) : '' }));
    return { st: { ...st, s: 'tipo', rows }, out: [{ text: '¿Para qué es el turno?', list: { button: 'Elegir motivo', rows } }] };
  }
  function askDay(st, ctx) {
    const ds = days(ctx, st.k);
    if (!ds.length) return { st: { s: 'idle' }, out: [{ text: 'Por ahora no hay horarios libres para eso en los próximos días. Si querés, te paso con alguien del consultorio.', buttons: [{ id: 'm:persona', title: 'Hablar con alguien' }, { id: 'm:menu', title: 'Volver al menú' }] }] };
    const rows = ds.map(x => ({ id: 'd:' + x.d, title: dShort(x.d), desc: x.l.length + (x.l.length === 1 ? ' horario' : ' horarios') + ' · desde las ' + hm(x.l[0][1]) }));
    return { st: { ...st, s: 'dia', rows }, out: [{ text: '¿Qué día te queda mejor?', list: { button: 'Elegir día', rows } }] };
  }
  function askHour(st, ctx) {
    const l = (slotsOf(ctx, st.k)[st.d] || []).filter(s => okSlot(ctx, st.d, s[1]));
    if (!l.length) return askDay(st, ctx);
    const many = new Set(l.map(s => s[0])).size > 1;
    let rows = l.slice(0, 9).map(s => ({ id: 'h:' + s[0] + '|' + s[1] + '|' + (s[2] || 30), title: hm(s[1]) + ' h', desc: many ? cut(proName(ctx, s[0]), 72) : '' }));
    rows.push({ id: 'm:otrodia', title: 'Otro día', desc: '' });
    return { st: { ...st, s: 'hora', rows }, out: [{ text: dLong(st.d) + ': elegí el horario.', list: { button: 'Elegir horario', rows } }] };
  }
  const summary = (st, ctx) => '¿Confirmo el turno?\n\n📅 ' + cap(dLong(st.d)) + ' a las ' + hm(st.t) + ' h' + (proName(ctx, st.pro) ? '\n🦷 ' + proName(ctx, st.pro) : '') + '\n👤 ' + st.first + ' ' + st.last + ' · DNI ' + st.dni + '\n🏥 ' + (st.cov || 'Particular');

  function pick(st, text) {   // texto escrito cuando se esperaba una opción: número o nombre de la fila
    const t = norm(text), rows = st.rows || [];
    const n = parseInt(t, 10); if (n >= 1 && n <= rows.length && String(n) === t) return rows[n - 1].id;
    const r = rows.find(x => norm(x.title) === t) || rows.find(x => t.length >= 3 && norm(x.title).includes(t)) || rows.find(x => t.length >= 4 && norm(x.desc).includes(t));
    return r ? r.id : '';
  }

  function step(st0, inp, ctx) {
    let st = st0 && st0.s ? st0 : { s: 'idle' };
    const now = ctx.now || Date.now();
    if (st.at && now - st.at > TIMEOUT && st.s !== 'idle') st = { s: 'idle' };
    const R = r => { r.st = { ...r.st, at: now }; return r; };
    if (inp && inp.booked) {
      const b = inp.booked;
      if (b.ok) return R({ st: { s: 'idle' }, out: [{ text: '¡Listo! ✅ Pedimos tu turno para el ' + dLong(st.d) + ' a las ' + hm(st.t) + ' h.' + (b.code ? ' Código: ' + b.code + '.' : '') + '\nEl consultorio te lo confirma por acá.', buttons: back }] });
      const r = askDay({ ...st }, ctx); r.out.unshift({ text: (b.msg || 'Ese horario ya no está libre.') + ' Elegí otro, por favor.' }); return R(r);
    }
    const text = String((inp && inp.text) || '').trim(), t = norm(text);
    let id = (inp && inp.id) || '';
    if (!id && st.rows && /^(tipo|dia|hora)$/.test(st.s)) id = pick(st, text);
    const typing = /^(nombre|dni|os)$/.test(st.s);

    /* atajos que valen siempre (salvo mientras escribe sus datos) */
    if (id === 'm:menu' || (!typing && !id && /^(menu|hola|holis|buenas|buen dia|buenos dias|buenas tardes|buenas noches|inicio|volver|empezar)\b/.test(t)))
      return R({ st: { s: 'idle' }, out: [menu(ctx, st0 && st0.s ? '' : hello(ctx))] });
    if (id === 'c:no' || (typing && /^(cancelar|salir)$/.test(t))) return R({ st: { s: 'idle' }, out: [{ text: 'Listo, no anoté nada.' }, menu(ctx)] });
    if (id === 'm:persona' || (!typing && !id && /(persona|humano|secretari|alguien|hablar con|atencion)/.test(t)))
      return R({ st: { s: 'idle' }, out: [{ text: 'Listo, ya le aviso a alguien del consultorio. En breve te responden por acá. 🙌' }], act: { handoff: text ? cut(text, 120) : 'Pidió hablar con una persona' } });
    if (id === 'm:dir' || (!typing && !id && /(direcc|donde (estan|queda)|ubicac|como llego|telefono)/.test(t)))
      return R({ st: { s: 'idle' }, out: [{ text: (ctx.addr ? '📍 ' + ctx.addr : 'La dirección te la pasa alguien del consultorio.') + (ctx.phone ? '\n📞 ' + ctx.phone : ''), buttons: [ctx.book !== false ? { id: 'm:turno', title: 'Pedir un turno' } : null, { id: 'm:menu', title: 'Volver al menú' }].filter(Boolean) }] });
    if (id === 'm:info' || (!typing && !id && /(obra social|obras sociales|prepaga|osde|swiss|pami|ioma|galeno|medife|precio|cuanto (sale|cuesta)|valor|pago|tarjeta|transferencia)/.test(t)))
      return R({ st: { s: 'idle' }, out: [{ text: ctx.info ? cut(ctx.info, 1000) : 'Eso te lo confirma alguien del consultorio.', buttons: [ctx.book !== false ? { id: 'm:turno', title: 'Pedir un turno' } : null, { id: 'm:persona', title: 'Hablar con alguien' }, { id: 'm:menu', title: 'Volver al menú' }].filter(Boolean) }] });
    if (id === 'm:turno' || (!typing && !id && st.s === 'idle' && /(turno|cita|reserv|agend|sacar|atender|consulta|me duele|dolor)/.test(t))) {
      if (ctx.book === false) return R({ st: { s: 'idle' }, out: [{ text: 'Los turnos los da una persona del consultorio. Ya le aviso para que te escriba.' }], act: { handoff: 'Quiere un turno' } });
      const urg = /(me duele|dolor|urgencia|urgente)/.test(t) && (ctx.types || []).some(x => x.k === 'urgencia');
      return R(urg ? askDay({ s: 'dia', k: 'urgencia' }, ctx) : askType({ s: 'tipo' }, ctx));
    }
    if (id === 'm:otrodia' || id === 'c:hora') return R(askDay({ ...st }, ctx));

    /* pasos del turno */
    if (st.s === 'tipo') { if (id.startsWith('t:')) return R(askDay({ ...st, k: id.slice(2) }, ctx)); return R(askType(st, ctx)); }
    if (st.s === 'dia') { if (id.startsWith('d:')) return R(askHour({ ...st, d: id.slice(2) }, ctx)); return R(askDay(st, ctx)); }
    if (st.s === 'hora') {
      if (!id && /^\d{1,2}([:.h ]\d{2})?/.test(t)) { const m = t.match(/^(\d{1,2})(?:[:.h ](\d{2}))?/), want = +m[1] * 60 + (+m[2] || 0); const r = (st.rows || []).find(x => x.id.startsWith('h:') && +x.id.split('|')[1] === want); if (r) id = r.id; }
      if (id.startsWith('h:')) { const [pro, tt, dur] = id.slice(2).split('|'); return R({ st: { ...st, s: 'nombre', pro, t: +tt, dur: +dur || 30, rows: null }, out: [{ text: '¡Bien! ' + cap(dLong(st.d)) + ' a las ' + hm(+tt) + ' h.\n¿Cuál es el nombre y apellido del paciente?' }] }); }
      return R(askHour(st, ctx));
    }
    if (st.s === 'nombre') {
      const w = text.replace(/[^\p{L}\s'-]/gu, ' ').split(/\s+/).filter(x => x.length > 1);
      if (w.length < 2) return R({ st, out: [{ text: 'Escribime nombre y apellido, por favor (por ejemplo: Ana Pérez).' }] });
      const T = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
      return R({ st: { ...st, s: 'dni', first: T(w[0]), last: w.slice(1).map(T).join(' ') }, out: [{ text: 'Gracias. ¿Número de DNI?' }] });
    }
    if (st.s === 'dni') {
      const dni = text.replace(/\D/g, '');
      if (dni.length < 6 || dni.length > 9) return R({ st, out: [{ text: 'El DNI tiene que tener entre 7 y 8 números. ¿Me lo pasás de nuevo?' }] });
      return R({ st: { ...st, s: 'os', dni }, out: [{ text: '¿Tenés obra social o prepaga? Escribí cuál, o tocá «Particular».', buttons: [{ id: 'os:part', title: 'Particular' }] }] });
    }
    if (st.s === 'os') {
      const cov = id === 'os:part' || /^(particular|no|ninguna|no tengo)$/.test(t) ? 'Particular' : cut(text, 40);
      if (!cov) return R({ st, out: [{ text: 'Escribí tu obra social, o tocá «Particular».', buttons: [{ id: 'os:part', title: 'Particular' }] }] });
      const s2 = { ...st, s: 'ok', cov };
      return R({ st: s2, out: [{ text: summary(s2, ctx), buttons: [{ id: 'c:si', title: 'Confirmar' }, { id: 'c:hora', title: 'Cambiar horario' }, { id: 'c:no', title: 'Cancelar' }] }] });
    }
    if (st.s === 'ok') {
      if (id === 'c:si' || /^(si|sí|dale|ok|confirmo|confirmar|de una|perfecto)\b/.test(t))
        return R({ st: { ...st, s: 'wait' }, out: [], act: { book: { type: st.k, date: st.d, start: st.t, pro: st.pro, dur: st.dur, first: st.first, last: st.last, dni: st.dni, cov: st.cov } } });
      return R({ st, out: [{ text: summary(st, ctx), buttons: [{ id: 'c:si', title: 'Confirmar' }, { id: 'c:hora', title: 'Cambiar horario' }, { id: 'c:no', title: 'Cancelar' }] }] });
    }
    if (/(gracias|genial|buenisimo|perfecto|joya)/.test(t)) return R({ st: { s: 'idle' }, out: [{ text: '¡De nada! Cualquier cosa, escribinos. 😊' }] });
    return R({ st: { s: 'idle' }, out: [menu(ctx, st0 && st0.s ? 'No te entendí bien.' : hello(ctx))] });
  }
  return { step, norm, dLong, hm };
})();
// <<< MENU

/* ---------- respuesta con el menú de botones (sin IA) ---------- */
async function menuReply(w: any, chat: any, inp: any) {
  const book = await one('ov_booking?owner=eq.' + w.owner + '&select=slug,enabled,data');
  const data = book?.data || {}, now = nowAR();
  const ctx = { clinic: data.clinic, addr: data.addr, phone: data.phone, info: w.cfg?.info || '', book: w.cfg?.book !== false && !!book?.enabled,
    types: data.types || [], pros: data.pros || [], slots: data.slots || {}, today: now.date, nowMin: now.min, now: Date.now() };
  let r = OVMenu.step(chat.state || null, inp, ctx);
  for (const m of r.out) await sendMsg(w, chat, m);
  if (r.act?.book) {
    let res: any;
    try { res = await rpc('ov_booking_request', { p_slug: book.slug, p_req: { ...r.act.book, phone: chat.wa_id, note: 'Pedido por WhatsApp (autogestión).' } }); }
    catch (e) { res = { ok: false, msg: 'No pude anotarlo.' }; }
    r = OVMenu.step(r.st, { booked: res || { ok: false } }, ctx);
    for (const m of r.out) await sendMsg(w, chat, m);
  }
  if (r.act?.handoff) {
    await db('ov_wa_chats?id=eq.' + chat.id, { method: 'PATCH', prefer: 'return=minimal', body: { mode: 'humano', need: String(r.act.handoff).slice(0, 200) } });
    await db('ov_wa_events', { method: 'POST', prefer: 'return=minimal', body: { owner: w.owner, kind: 'persona', wa_id: chat.wa_id } });
  }
  await db('ov_wa_chats?id=eq.' + chat.id, { method: 'PATCH', prefer: 'return=minimal', body: { state: r.st || {} } });
}

/* ---------- una respuesta del asistente con IA (guardada; solo si cfg.ai) ---------- */
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
    if (chat.mode !== 'humano' && w.cfg?.on !== false) {
      await sendText(w, chat, 'Dale, te ayudo a cambiarlo. Elegí un nuevo horario y el consultorio libera el anterior.', 'sistema');
      return menuReply(w, chat, { id: 'm:turno' });
    }
    return;
  }

  if (chat.mode === 'humano') return;                              // la atiende una persona
  if (w.cfg?.on === false) return;                                 // asistente apagado: solo bandeja
  const useAI = w.cfg?.ai === true && !!env('ANTHROPIC_API_KEY');
  if (useAI && w.used > (w.quota || 100)) {                        // IA: tope de charlas del mes
    if (fresh) {
      await db('ov_wa_chats?id=eq.' + chat.id, { method: 'PATCH', prefer: 'return=minimal', body: { mode: 'humano', need: 'Tope de charlas del mes' } });
      await db('ov_wa_events', { method: 'POST', prefer: 'return=minimal', body: { owner: w.owner, kind: 'persona', wa_id: waId } });
      return sendText(w, chat, '¡Hola! Recibimos tu mensaje. En breve te responde alguien del consultorio.', 'sistema');
    }
    return;
  }
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const nb = await db('ov_wa_msgs?chat=eq.' + chat.id + '&dir=eq.out&who=eq.bot&created_at=gt.' + since + '&select=id');
  if ((nb || []).length >= MAX_BOT_PER_DAY) {
    await db('ov_wa_chats?id=eq.' + chat.id, { method: 'PATCH', prefer: 'return=minimal', body: { mode: 'humano', need: 'Charla muy larga' } });
    return sendText(w, chat, 'Te paso con una persona del consultorio para seguir. ¡Gracias por la paciencia!', 'sistema');
  }
  if (m.type !== 'text' && m.type !== 'button' && m.type !== 'interactive') {
    await sendText(w, chat, 'Por ahora solo puedo leer mensajes escritos o tus respuestas a los botones.', 'sistema');
    return menuReply(w, chat, { id: 'm:menu' });
  }
  try { if (useAI) await botReply(w, { ...chat, mode: 'bot' }); else await menuReply(w, chat, { text: m.type === 'text' ? body : '', id: payload }); }
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
