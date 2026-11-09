import { T, setAI } from './harness.mjs';
const M = await import('../../supabase/functions/wa-sim/index.ts');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALLA') + ' ' + m); if (!c) fails++; };
const call = (msgs, auth = 'Bearer userjwt') => M.serve(new Request('https://x/wa-sim', { method: 'POST', headers: { authorization: auth }, body: JSON.stringify({ messages: msgs, cfg: { botName: 'Sofi' } }) }));
setAI([
  b => ({ content: [{ type: 'tool_use', id: 't1', name: 'buscar_horarios', input: { motivo: 'control' } }] }),
  b => { globalThis._o = JSON.parse(b.messages.at(-1).content[0].content).opciones; return { content: [{ type: 'text', text: 'Tengo ' + globalThis._o.length + ' horarios' }] }; },
  b => ({ content: [{ type: 'tool_use', id: 't2', name: 'pedir_turno', input: { opcion: globalThis._o[0].opcion, motivo: 'control', nombre: 'Ana', apellido: 'P', dni: '30123456' } }] }),
  { content: [{ type: 'text', text: 'Listo' }] },
]);
let r = await call([{ role: 'user', text: 'turno para control' }]); let j = await r.json();
ok(j.ok && j.reply.includes('horarios'), 'responde con IA real y horarios: ' + j.reply);
r = await call([{ role: 'user', text: 'turno' }, { role: 'assistant', text: j.reply }, { role: 'user', text: 'el primero, Ana P 30123456' }]); j = await r.json();
ok(j.booked && j.booked.code === 'OV-AB12' && T.booking_reqs.at(-1).p_req.note.includes('PRUEBA'), 'pide el turno real marcado como PRUEBA');
r = await call([{ role: 'user', text: 'x' }], 'Bearer otro'); ok(r.status === 403, 'sin cuenta: rechazado');
T.sim = 999; r = await call([{ role: 'user', text: 'x' }]); j = await r.json(); ok(j.reply.includes('Por hoy'), 'tope diario por cuenta');
console.log(fails ? fails + ' fallas' : 'todo bien');
