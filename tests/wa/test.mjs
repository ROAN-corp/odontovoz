import { T, SENT, AI_CALLS, setAI, inbound, post, today, add } from './harness.mjs';
const W = await import('../../supabase/functions/wa-webhook/index.ts');
const S = await import('../../supabase/functions/wa-send/index.ts');
const C = await import('../../supabase/functions/wa-cron/index.ts');
T.ov_wa[0].cfg.ai = true;   // estas pruebas cubren la respuesta con IA (guardada); el menú está en testmenu.mjs
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALLA') + ' ' + m); if (!c) fails++; };

// verificación GET
let r = await W.serve(new Request('https://x/wa?hub.mode=subscribe&hub.verify_token=vt&hub.challenge=123'));
ok(r.status === 200 && (await r.text()) === '123', 'verificación del webhook');
r = await W.serve(new Request('https://x/wa?hub.mode=subscribe&hub.verify_token=mal&hub.challenge=123'));
ok(r.status === 403, 'verificación con token malo rechazada');
// firma mala
r = await post(W.serve, inbound('hola'), 'sha256=00');
ok(r.status === 401 && T.ov_wa_msgs.length === 0, 'firma falsa rechazada');

// charla: pide turno → busca → elige → pide datos → pide turno
setAI([
  b => ({ content: [{ type: 'tool_use', id: 't1', name: 'buscar_horarios', input: { motivo: 'control', franja: 'manana' } }] }),
  b => { const res = JSON.parse(b.messages.at(-1).content[0].content); globalThis._opts = res.opciones; return { content: [{ type: 'text', text: 'Hola, soy Sofi, la asistente virtual. Tengo ' + res.opciones.map(o => o.dia + ' ' + o.hora).join(', ') + '. ¿Cuál te queda?' }] }; },
]);
r = await post(W.serve, inbound('Hola, quiero un turno para control a la mañana'));
ok(r.status === 200, 'mensaje aceptado');
ok(globalThis._opts && globalThis._opts.length === 3 && globalThis._opts.every(o => o.hora < '13:00'), 'ofrece solo horarios de la mañana reales: ' + (globalThis._opts || []).map(o => o.hora).join(','));
ok(SENT.at(-1)?.text?.body.includes('Sofi'), 'responde por WhatsApp');
ok(AI_CALLS[0].system[0].text.includes('Consultorio Allen') && AI_CALLS[0].system[0].text.includes('OSDE'), 'el asistente conoce el consultorio y la info cargada');
ok(T.ov_wa[0].used === 1, 'cuenta 1 charla del mes');
const chat = T.ov_wa_chats[0];
ok(chat && chat.wa_id === '5492994123456' && chat.name === 'Ana', 'crea la charla con nombre');

setAI([
  b => ({ content: [{ type: 'tool_use', id: 't2', name: 'pedir_turno', input: { opcion: globalThis._opts[0].opcion, motivo: 'control', nombre: 'Ana', apellido: 'Pérez', dni: '30123456', obra_social: 'OSDE' } }] }),
  b => ({ content: [{ type: 'text', text: 'Listo, pedí tu turno (código ' + JSON.parse(b.messages.at(-1).content[0].content).code + '). El consultorio te confirma.' }] }),
]);
await post(W.serve, inbound('El primero. Ana Pérez DNI 30123456, OSDE'));
const req = T.booking_reqs.at(-1);
ok(req && req.p_slug === 'abc12345' && req.p_req.phone === '5492994123456' && req.p_req.start === 540 && req.p_req.pro === 'p1', 'pide el turno por el turnero con el teléfono del chat');
ok(SENT.at(-1).text.body.includes('OV-AB12'), 'confirma con código');
ok(T.ov_wa[0].used === 1, 'mismo día = misma charla (no suma)');

// pasar a persona
setAI([
  { content: [{ type: 'tool_use', id: 't3', name: 'pasar_a_persona', input: { motivo: 'Quiere hablar de un pago' } }] },
  { content: [{ type: 'text', text: 'Te paso con alguien del consultorio.' }] },
]);
await post(W.serve, inbound('quiero hablar con alguien por un pago'));
ok(T.ov_wa_chats[0].mode === 'humano' && T.ov_wa_events.some(e => e.kind === 'persona'), 'pasa la charla a una persona y avisa a la app');
const nAI = AI_CALLS.length;
await post(W.serve, inbound('hola?'));
ok(AI_CALLS.length === nAI, 'con una persona a cargo, el asistente no responde');

// wa-send: persona responde
r = await S.serve(new Request('https://x/wa-send', { method: 'POST', headers: { authorization: 'Bearer userjwt' }, body: JSON.stringify({ chat: chat.id, text: 'Hola Ana, soy Marta.' }) }));
ok(r.status === 200 && SENT.at(-1).text.body === 'Hola Ana, soy Marta.', 'una persona responde desde la app');
r = await S.serve(new Request('https://x/wa-send', { method: 'POST', headers: { authorization: 'Bearer otro' }, body: JSON.stringify({ chat: chat.id, text: 'x' }) }));
ok(r.status === 403, 'sin cuenta con el servicio, no deja mandar');
chat.last_in = new Date(Date.now() - 25 * 3600e3).toISOString();
r = await S.serve(new Request('https://x/wa-send', { method: 'POST', headers: { authorization: 'Bearer userjwt' }, body: JSON.stringify({ chat: chat.id, text: 'x' }) }));
ok(r.status === 409, 'pasadas 24 h no deja escribir primero (regla de WhatsApp)');

// BAJA
const before = SENT.length;
await post(W.serve, inbound('BAJA'));
ok(T.ov_wa_chats[0].opt_out === true && SENT.at(-1).text.body.includes('ALTA'), 'BAJA corta los recordatorios y lo confirma');
ok(T.ov_wa[0].used === 2, 'charla nueva después de 24 h suma al tope');

// botones del recordatorio
T.ov_wa_chats[0].opt_out = false; T.ov_wa_chats[0].mode = 'bot';
await post(W.serve, { entry: [{ changes: [{ value: { metadata: { phone_number_id: 'P1' }, messages: [{ id: 'wamid.btn1', from: '5492994123456', type: 'button', button: { text: 'Confirmo', payload: 'conf:a77' } }] } }] }] });
ok(T.ov_wa_events.some(e => e.kind === 'confirma' && e.appt === 'a77') && SENT.at(-1).text.body.includes('Gracias'), 'botón Confirmo → evento y gracias');
// reintento de Meta (mismo wamid) no duplica
const nm = T.ov_wa_msgs.length;
await post(W.serve, { entry: [{ changes: [{ value: { metadata: { phone_number_id: 'P1' }, messages: [{ id: 'wamid.btn1', from: '5492994123456', type: 'button', button: { text: 'Confirmo', payload: 'conf:a77' } }] } }] }] });
ok(T.ov_wa_msgs.length === nm, 'reintento de Meta no duplica');
// audio
await post(W.serve, inbound('', '5492994123456', { type: 'audio', text: undefined, audio: { id: 'x' } }));
ok(SENT.at(-2).text.body.includes('escritos') && SENT.at(-1).type === 'interactive', 'audio: pide que lo escriba y muestra el menú');
// tope del plan
T.ov_wa[0].used = 100; T.ov_wa[0].quota = 100;
await post(W.serve, inbound('hola', '5492995555555'));
ok(T.ov_wa_chats.find(c => c.wa_id === '5492995555555').mode === 'humano' && SENT.at(-1).text.body.includes('alguien del consultorio'), 'pasado el tope del plan, pasa a una persona sin IA');
// número no activo: se ignora
T.ov_wa[0].status = 'pausado'; const ns = SENT.length;
await post(W.serve, inbound('hola', '5492996666666'));
ok(SENT.length === ns, 'servicio pausado: no responde');
T.ov_wa[0].status = 'activo';

// wa-cron
const hour = +new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', hour12: false }).format(new Date()) % 24;
T.ov_wa_out.push({ id: 'q1', owner: 'o1', appt: 'a88', kind: 'recordatorio', wa_id: '5492997777777', params: { nombre: 'Juan', consultorio: 'Allen', dia: 'martes 10', hora: '09:00', profesional: 'Dra. Vega', at: new Date(Date.now() + 86400e3).toISOString() }, send_after: new Date(Date.now() - 1000).toISOString(), status: 'cola' });
T.ov_wa_out.push({ id: 'q2', owner: 'o1', appt: 'a89', kind: 'recordatorio', wa_id: '5492994123456', params: { at: new Date(Date.now() - 3600e3).toISOString() }, send_after: new Date(Date.now() - 1000).toISOString(), status: 'cola' });
r = await C.serve(new Request('https://x/wa-cron', { method: 'POST', headers: { 'x-ov-cron': 'mal' } }));
ok(r.status === 401, 'cron sin clave rechazado');
r = await C.serve(new Request('https://x/wa-cron', { method: 'POST', headers: { 'x-ov-cron': 'ck' } }));
const sum = await r.json();
if ((process.env.WH === '0-24') || (hour >= 9 && hour < 20)) {
  ok(sum.sent === 1 && T.ov_wa_out.find(x => x.id === 'q1').status === 'enviado', 'manda el recordatorio en horario: ' + JSON.stringify(sum));
  const tp = SENT.at(-1); ok(tp.type === 'template' && tp.template.components[1].parameters[0].payload === 'conf:a88', 'plantilla con botones Confirmo/Cambiar');
  ok(T.ov_wa_out.find(x => x.id === 'q2').status === 'omitido', 'turno ya pasado: no se manda');
} else ok(sum.sent === 0, 'fuera de horario (9 a 20) no manda nada: ' + JSON.stringify(sum));
ok(T.ov_wa[0].quality === 'GREEN', 'revisa la calidad del número');
// calidad roja → frena
T.ov_wa[0].cfg._qAt = null; globalThis._red = true;
const of = globalThis.fetch; globalThis.fetch = (u, i) => (String(u).includes('graph.facebook.com') && (!i || !i.method || i.method === 'GET')) ? Promise.resolve(new Response(JSON.stringify({ quality_rating: 'RED' }))) : of(u, i);
await C.serve(new Request('https://x/wa-cron', { method: 'POST', headers: { 'x-ov-cron': 'ck' } }));
ok(T.ov_wa[0].out_paused === true, 'calidad ROJA: se frenan solos los recordatorios');
console.log(fails ? fails + ' fallas' : 'todo bien');
