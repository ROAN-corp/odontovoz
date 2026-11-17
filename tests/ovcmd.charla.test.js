/* 1.4 · Navi conversa: miles de formas de preguntar por un día, seguir la charla, encadenar pedidos y abrir pantallas.
   Se arman combinando arranques × preguntas × días. Correr: node tests/ovcmd.charla.test.js */
const C = require('../src/ovcmd.js');
const ctx = { today: '2026-11-04', pros: [] }; // miércoles
let n = 0, fail = 0; const bad = [];
function t(phrase, exp) {
  n++; const w = C.stripWake(phrase), r = C.parse(w.woke ? w.rest : phrase, ctx) || {};
  const k = Object.keys(exp).filter(x => JSON.stringify(r[x]) !== JSON.stringify(exp[x]));
  if (k.length) { fail++; bad.push(phrase + '\n   esperado ' + JSON.stringify(exp) + '\n   obtenido ' + JSON.stringify(r)); }
}
const DAYS = [['mañana', '2026-11-05'], ['hoy', '2026-11-04'], ['pasado mañana', '2026-11-06'], ['el viernes', '2026-11-06'], ['el lunes', '2026-11-09'], ['el martes que viene', '2026-11-10'],
  ['el jueves', '2026-11-05'], ['el sábado', '2026-11-07'], ['el viernes de la semana que viene', '2026-11-13'], ['el lunes de la semana próxima', '2026-11-09'], ['la semana que viene el miércoles', '2026-11-11'],
  ['el 20 de noviembre', '2026-11-20'], ['el próximo lunes', '2026-11-09']];
const LEADS = ['', 'Navi, ', 'Navi ', 'che Navi, ', 'Navi, a ver, ', 'Navi, decime ', 'Navi, contame ', 'Navi, fijate ', 'Navi, sabés ', 'Navi, me decís '];
// ¿cuántos turnos / pacientes tengo?
const COUNT = ['cuántos turnos tengo D', 'cuántos pacientes tengo D', 'cuántos pacientes tengo agendados D', 'cuántos turnos hay D', 'D cuántos turnos tengo', 'cuántos pacientes vienen D',
  'cuántas citas tengo D', 'cuánta gente tengo D', 'cuántos turnos dados tengo D', 'cuántos tengo D', 'cuántos pacientes hay agendados D', 'cuántas consultas tengo D', 'D cuántos pacientes vienen',
  'cuántos turnos tenemos D', 'tengo muchos turnos D', 'cuántos pacientes anotados hay D', 'cómo viene la agenda D'];
// ¿cuántos libres? ¿tengo lugar?
const FREE = ['cuántos turnos libres tengo D', 'cuántos turnos disponibles tengo D', 'tengo lugar D', 'hay lugar D', 'tengo algún hueco D', 'qué horarios libres tengo D', 'cuántos lugares libres hay D',
  'D tengo turnos libres', 'me quedan turnos libres D', 'hay turnos disponibles D', 'tengo disponibilidad D', 'cuántos huecos tengo D', 'quedan lugares libres D', 'qué turnos libres hay D',
  'cuántos espacios libres me quedan D', 'hay algún lugarcito D', 'D hay lugar'];
// ¿puedo sumar más gente?
const ADD = ['puedo sumar más gente D', 'creés que D puedo sumar más gente', 'D puedo agregar un paciente más', 'me entra uno más D', 'puedo meter otro paciente D', 'D se puede agregar alguien más',
  'podemos sumar más pacientes D', 'D me da para un turno más', 'entra alguien más D', 'puedo dar otro turno D', 'D caben más pacientes', 'puedo atender a alguien más D'];
for (const [d, k] of DAYS) for (const L of LEADS) {
  COUNT.forEach(p => t(L + p.replace('D', d), { intent: 'dayCount', date: k }));
  FREE.forEach(p => t(L + p.replace('D', d), { intent: 'dayFree', date: k }));
  ADD.forEach(p => t(L + p.replace('D', d), { intent: 'dayFree', date: k, add: true }));
}
// seguir la charla
const FOL = ['y D?', '¿y D?', 'y para D', 'y D qué tal', 'y D cómo viene', '¿y para D?', 'que tal D'];
for (const [d, k] of DAYS) for (const L of ['', 'Navi, ']) FOL.forEach(p => t(L + p.replace('D', d), { intent: 'follow', date: k }));
// pedidos encadenados
const NAVS = ['llevame a la agenda de D', 'abrime la agenda de D', 'mostrame la agenda de D', 'pasame a la agenda de D', 'andá a la agenda de D'];
const THEN = [['y contame cuántos turnos tengo', 'dayCount'], ['y decime cuántos turnos libres tengo', 'dayFree'], ['y fijate si tengo lugar', 'dayFree'], ['y después decime cuántos pacientes vienen', 'dayCount'],
  [', y contame cuántos disponibles tengo', 'dayFree'], ['y decime si puedo sumar más gente', 'dayFree']];
for (const [d, k] of DAYS) for (const nv of NAVS) for (const [th, it] of THEN) {
  const ph = 'Navi, ' + nv.replace('de D', d.replace(/^el /, 'del ').replace(/^la /, 'de la ').replace(/^(hoy|mañana|pasado mañana)$/, 'de $1')) + ' ' + th;
  n++; const w = C.stripWake(ph), r = C.parse(w.rest, ctx) || {};
  if (r.intent !== 'multi' || r.steps.length !== 2 || r.steps[1].intent !== it || r.steps[1].date !== k) { fail++; bad.push(ph + '\n   obtenido ' + JSON.stringify(r)); }
}
// pantallas del menú
const SCR = { stkOpen: ['stock', 'stock de insumos', 'los insumos', 'el inventario'], osOpen: ['obras sociales', 'las obras sociales', 'las prepagas'], newsOpen: ['novedades', 'las novedades', 'lo nuevo'],
  catalogOpen: ['prácticas y aranceles', 'los aranceles', 'la lista de precios', 'mis precios'], labAllOpen: ['laboratorio', 'el laboratorio', 'los trabajos de laboratorio'], planOpen: ['mi plan', 'los planes', 'mi suscripción'],
  jrOpen: ['cambios de hoy', 'los cambios de hoy'], importOpen: ['la mudanza', 'importar pacientes'], appearOpen: ['la apariencia'], archOpen: ['pacientes archivados', 'los archivados'],
  nfToggle: ['mis avisos', 'las notificaciones', 'la bandeja'], plOpen: ['cambiar de consultorio', 'cambiar de lugar'], costOpen: ['los costos', 'mis costos'], hcpOpen: ['las historias de papel'],
  waOpen: ['la autogestión', 'la secretaria virtual'], fbOpen: ['sugerencias'], tutVid: ['los videos tutoriales'], assistOpen: ['el asistente', 'el asistente de voz'] };
const GOS = ['', 'abrí ', 'abrime ', 'llevame a ', 'mostrame ', 'quiero ver ', 'andá a ', 'pasame a ', 'me abrís ', 'necesito ver ', 'quiero ir a ', 'entrá a ', 'me llevás a ', 'dejame ver '];
for (const act of Object.keys(SCR)) for (const nm of SCR[act]) for (const g of GOS) for (const L of ['', 'Navi, ']) t(L + g + nm, { intent: 'screen', act });
console.log(bad.join('\n'));
console.log((n - fail) + ' de ' + n + ' frases de charla bien' + (fail ? ' · ' + fail + ' fallas' : ''));
process.exitCode = fail ? 1 : 0;
