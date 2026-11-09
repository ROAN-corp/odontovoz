// Pruebas del menú de autogestión (scripts/wa-menu.js)
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../../scripts/wa-menu.js', import.meta.url), 'utf8');
const OVMenu = new Function(src + '; return OVMenu;')();
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALLA') + ' ' + m); if (!c) fails++; };
const today = '2026-11-09', tom = '2026-11-10', d2 = '2026-11-11';
const ctx = { clinic: 'Consultorio Allen', addr: 'Roca 123', phone: '299 412', info: 'Atendemos OSDE y particulares.', types: [{ k: 'control', label: 'Control' }, { k: 'urgencia', label: 'Urgencia · dolor' }], pros: [{ id: 'p1', name: 'Dra. Vega' }],
  slots: { control: { [today]: [['p1', 480, 30], ['p1', 1000, 30]], [tom]: [['p1', 540, 30], ['p1', 600, 30]], [d2]: [['p1', 570, 30]] }, urgencia: { [tom]: [['p1', 510, 30]] } }, today, nowMin: 600, now: 1e12 };
let st = null, r;
const go = (inp, c = ctx) => { r = OVMenu.step(st, inp, c); st = r.st; return r; };
go({ text: 'hola' }); ok(r.out[0].text.includes('asistente automático') && r.out[0].list.rows.length === 4, 'saluda y muestra el menú con 4 opciones');
go({ id: 'm:turno' }); ok(r.out[0].list && r.out[0].list.rows[0].id === 't:control', 'pide el motivo');
go({ id: 't:control' }); ok(r.out[0].list.rows[0].id === 'd:' + today && r.out[0].list.rows.length === 3, 'ofrece días con horarios (hoy solo si falta más de 1 h)');
ok(r.out[0].list.rows[0].desc.includes('1 horario'), 'hoy queda un solo horario (el de las 8 ya pasó)');
go({ text: '2' }); ok(st.s === 'hora' && st.d === tom, 'elegir escribiendo el número de la opción');
go({ text: '10:00' }); ok(st.s === 'nombre' && st.t === 600, 'elegir horario escribiendo la hora');
go({ text: 'ana' }); ok(st.s === 'nombre', 'pide nombre y apellido completos');
go({ text: 'ana PÉREZ gómez' }); ok(st.first === 'Ana' && st.last === 'Pérez Gómez' && st.s === 'dni', 'toma nombre y apellido');
go({ text: '30.123.456' }); ok(st.dni === '30123456' && st.s === 'os', 'toma el DNI con puntos');
go({ id: 'os:part' }); ok(st.s === 'ok' && r.out[0].buttons.length === 3 && r.out[0].text.includes('Particular'), 'muestra el resumen con Confirmar');
go({ id: 'c:si' }); ok(r.act && r.act.book && r.act.book.date === tom && r.act.book.start === 600 && r.act.book.dni === '30123456', 'pide el turno con los datos');
go({ booked: { ok: true, code: 'OV-X1' } }); ok(r.out[0].text.includes('OV-X1') && st.s === 'idle', 'confirma con el código');
go({ text: 'me duele una muela, necesito turno' }); ok(st.s === 'dia' && st.k === 'urgencia', 'con dolor va directo a urgencia');
go({ id: 'm:persona' }); ok(r.act && r.act.handoff, 'pasa con una persona');
go({ text: 'donde quedan?' }); ok(r.out[0].text.includes('Roca 123'), 'dirección');
go({ text: 'atienden osde?' }); ok(r.out[0].text.includes('OSDE'), 'obras sociales desde la info cargada');
go({ text: 'asdfgh' }); ok(r.out[0].text.includes('No te entendí') && r.out[0].list, 'no entiende: vuelve a mostrar el menú');
// fallo al pedir
st = null; go({ id: 'm:turno' }); go({ id: 't:control' }); go({ id: 'd:' + d2 }); go({ id: 'h:p1|570|30' }); go({ text: 'Juan Paz' }); go({ text: '20111222' }); go({ text: 'Swiss Medical' });
ok(st.cov === 'Swiss Medical', 'obra social escrita');
go({ text: 'si' }); go({ booked: { ok: false, msg: 'Ese horario se ocupó recién.' } }); ok(r.out[0].text.includes('se ocupó') && st.s === 'dia', 'si el horario se ocupó, ofrece otros días');
// sin turnos por chat
st = null; go({ id: 'm:turno' }, { ...ctx, book: false }); ok(r.act && r.act.handoff, 'si no da turnos por chat, pasa con una persona');
// límites de WhatsApp
st = null; go({ id: 'm:turno' }); go({ id: 't:control' });
const all = [r.out[0].list.rows].flat(); ok(all.every(x => x.title.length <= 24 && (x.desc || '').length <= 72), 'filas dentro de los límites de WhatsApp');
// vencido: después de 30 minutos arranca de cero
const old = { ...st, at: 1e12 - 31 * 60000 }; r = OVMenu.step(old, { text: 'Ana Pérez' }, ctx); ok(!r.act && r.st.s === 'idle', 'charla vieja vuelve a empezar');
console.log(fails ? fails + ' fallas' : 'todo bien');
