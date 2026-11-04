const C = require('../src/ovcmd.js');
const pros = [{ id: 'pr1', name: 'Dra. Carolina Vega', short: 'Vega' }, { id: 'pr2', name: 'Dr. Matías Roldán', short: 'Roldán' }, { id: 'pr3', name: 'Dra. Julieta Ferreyra', short: 'Ferreyra' }];
const ctx = { today: '2026-11-04', pros }; // miércoles
let fail = 0, n = 0;
function t(phrase, exp) {
  n++; const r = C.parse(phrase, ctx) || {};
  const bad = Object.keys(exp).filter(k => JSON.stringify(r[k]) !== JSON.stringify(exp[k]));
  if (bad.length) { fail++; console.log('FALLA:', JSON.stringify(phrase), '\n   esperado', JSON.stringify(exp), '\n   obtenido', JSON.stringify(r)); }
}
// detener
['terminar dictado', 'Pará el micrófono', 'basta', 'chau', 'che, terminá el dictado por favor', 'apagá la voz', 'listo el dictado'].forEach(p => t(p, { intent: 'stop' }));
['¿qué le puedo decir?', 'ayuda', 'no sé qué decir', 'cómo te hablo'].forEach(p => t(p, { intent: 'help' }));
['deshacer', 'me equivoqué', 'eso no', 'borrá lo último', 'anulá eso'].forEach(p => t(p, { intent: 'undo' }));
['sí', 'dale', 'guardalo', 'confirmo', 'agendar', 'listo', 'registrar', 'perfecto'].forEach(p => t(p, { intent: 'confirm' }));
['no', 'cancelar', 'mejor no', 'dejalo'].forEach(p => t(p, { intent: 'cancel' }));
['volver', 'atrás', 'para atrás', 'cerrá', 'salir'].forEach(p => t(p, { intent: 'back' }));
['inicio', 'andá al inicio', 'llevame a la pantalla principal', 'casita', 'volvé a la casa'].forEach(p => t(p, { intent: 'home' }));
t('abrí el menú', { intent: 'menu' });
// navegación
t('agenda', { intent: 'nav', tab: 'agenda' });
t('abrí la agenda', { intent: 'nav', tab: 'agenda' });
t('mostrame los turnos de mañana', { intent: 'nav', tab: 'agenda', date: '2026-11-05' });
t('agenda del lunes', { intent: 'nav', tab: 'agenda', date: '2026-11-09' });
t('mañana', { intent: 'nav', tab: 'agenda', date: '2026-11-05' });
t('la semana que viene', { intent: 'nav', tab: 'agenda', view: 'semana', shift: 7 });
t('agenda del mes que viene', { intent: 'nav', tab: 'agenda', view: 'mes', months: 1 });
t('día siguiente', { intent: 'nav', tab: 'agenda', shift: 1 });
t('agenda de la doctora Vega', { intent: 'nav', tab: 'agenda', pro: 'pr1' });
t('andá a pacientes', { intent: 'nav', tab: 'pacientes' });
t('mostrame la caja', { intent: 'nav', tab: 'caja' });
t('quiero ver la plata', { intent: 'nav', tab: 'caja' });
t('liquidaciones', { intent: 'nav', tab: 'liq' });
t('abrí ajustes', { intent: 'nav', tab: 'cfg' });
t('turnero online', { intent: 'nav', tab: 'turnero' });
// ficha
t('odontograma', { intent: 'ficha', sub: 'odon', name: null });
t('abrí el odontograma de Quiroga', { intent: 'ficha', sub: 'odon', name: 'quiroga' });
t('mostrame la historia clínica', { intent: 'ficha', sub: 'datos' });
t('plan de tratamiento', { intent: 'ficha', sub: 'plan' });
t('la cuenta de Benítez', { intent: 'ficha', sub: 'cuenta', name: 'benitez' });
t('radiografías', { intent: 'ficha', sub: 'img' });
t('ver las recetas', { intent: 'ficha', sub: 'rx' });
// pacientes
t('abrí a Lucía Benítez', { intent: 'openPat', name: 'lucia benitez' });
t('buscame a Pérez', { intent: 'openPat', name: 'perez' });
t('traeme la ficha de Martín Quiroga', { intent: 'openPat', name: 'martin quiroga', ficha: true });
t('paciente Gómez', { intent: 'openPat', name: 'gomez' });
t('nuevo paciente Juan Pérez', { intent: 'newPat', first: 'juan', last: 'perez' });
t('agregá un paciente que se llama Ana María López', { intent: 'newPat', first: 'ana maria', last: 'lopez' });
// turnos
t('turno para Pérez mañana a las 10', { intent: 'newAppt', name: 'perez', date: '2026-11-05', start: 600 });
t('dale un turno a Lucía Benítez el viernes a las tres y media con Roldán', { intent: 'newAppt', name: 'lucia benitez', date: '2026-11-06', start: 930, pro: 'pr2' });
t('agendame a Gómez el 15 a las 9 para una limpieza', { intent: 'newAppt', name: 'gomez', date: '2026-11-15', start: 540, what: 'limpieza' });
t('sobreturno para Martín Quiroga hoy a las 11 por dolor', { intent: 'newAppt', sobre: true, name: 'martin quiroga', date: '2026-11-04', start: 660, what: 'urgencia' });
t('nuevo turno', { intent: 'newAppt', name: null });
t('sacale un turno el lunes que viene a las 10 y cuarto para control', { intent: 'newAppt', date: '2026-11-09', start: 615, what: 'control', name: null });
t('turno para el 20 de diciembre a las 17:30 con la doctora Ferreyra para ortodoncia a Paz', { intent: 'newAppt', date: '2026-12-20', start: 1050, pro: 'pr3', what: 'ortodoncia', name: 'paz' });
t('turno para Sosa pasado mañana al mediodía', { intent: 'newAppt', name: 'sosa', date: '2026-11-06', start: 720 });
t('turno a Ríos dentro de 2 semanas a las 4 de la tarde', { intent: 'newAppt', name: 'rios', date: '2026-11-18', start: 960 });
t('poneme un turno para Ortega a las 10 de la mañana', { intent: 'newAppt', name: 'ortega', start: 600 });
// recepción y atención
t('llegó Pérez', { intent: 'arrived', name: 'perez' });
t('Lucía Benítez ya está en la sala', { intent: 'arrived', name: 'lucia benitez' });
t('Quiroga no vino', { intent: 'noshow', name: 'quiroga' });
t('atender a Benítez', { intent: 'attend', name: 'benitez' });
t('atender al siguiente', { intent: 'attend', next: true });
t('que pase el próximo', { intent: 'attend', next: true });
t('empezar la atención', { intent: 'attend', next: true });
t('quién sigue', { intent: 'who' });
t('cómo viene el día', { intent: 'today' });
t('confirmá el turno de Ríos', { intent: 'confirmAppt', name: 'rios' });
t('cancelá el turno de Sosa', { intent: 'cancelAppt', name: 'sosa' });
t('siguiente paso', { intent: 'flowNext' }); t('seguimos', { intent: 'flowNext' }); t('paso anterior', { intent: 'flowPrev' });
t('terminar la atención', { intent: 'flowEnd' });
// clínica
t('agregá en la historia clínica antecedentes de tratamiento de conducto en el 46', { intent: 'hc', text: 'antecedentes de tratamiento de conducto en el 46' });
t('anotá en la historia medicación enalapril', { intent: 'hc', text: 'medicacion enalapril' });
t('hoy hice limpieza y control', { intent: 'note', text: 'limpieza y control' });
t('armá el presupuesto', { intent: 'budget' });
t('hacé un presupuesto', { intent: 'budget' });
t('consentimiento de extracción', { intent: 'consent', tpl: 'extraccion' });
t('firmar consentimiento para endodoncia', { intent: 'consent', tpl: 'endodoncia' });
t('recetale amoxicilina', { intent: 'rx', med: 'amoxicilina' });
// cobros
t('cobrale 20 mil en efectivo a Pérez', { intent: 'pay', amount: 20000, method: 'Efectivo', name: 'perez' });
t('me pagó 15 lucas por transferencia', { intent: 'pay', amount: 15000, method: 'Transferencia', name: null });
t('cobrar veinticinco mil quinientos con tarjeta', { intent: 'pay', amount: 25500, method: 'Crédito' });
t('registrá un pago de $ 32.000 de Benítez', { intent: 'pay', amount: 32000, name: 'benitez' });
t('cobrale un palo con mercado pago', { intent: 'pay', amount: 1000000, method: 'Mercado Pago' });
t('cuánto debe Benítez', { intent: 'owe', name: 'benitez' });
// modos
t('modo atención', { intent: 'mode', ui: 'atencion' }); t('pasá a modo administración', { intent: 'mode', ui: 'admin' });
t('tema oscuro', { intent: 'mode', theme: 'dark' }); t('activá manos libres', { intent: 'hands' });
// odontograma: no debe confundirse con comandos
['caries oclusal del 35', 'mesio oclusal distal en el 46 composite realizado', 'planificado extracción del 38', 'del 14 al 17 ausentes', 'siguiente'].forEach(p => t(p, { intent: 'unknown' }));
// palabra de activación
const w = [['odontovoz abrí la agenda', true, 'abri la agenda'], ['odonto voz, turno para Pérez', true, 'turno para perez'], ['hola odonto quién sigue', true, 'quien sigue'], ['abrí el odontograma', false, 'abri el odontograma'], ['che odontovos llegó Gómez', true, 'llego gomez']];
w.forEach(([p, woke, rest]) => { n++; const r = C.stripWake(p); if (r.woke !== woke || r.rest !== rest) { fail++; console.log('FALLA wake', p, JSON.stringify(r)); } });
// v6: frases largas para dar turnos, duración y odontograma explícito
t('agrega un a pedro juarez el dia miercoles 4 de noviembre a las 16hs en un turno de media hora', { intent: 'newAppt', name: 'pedro juarez', date: '2026-11-04', start: 960, dur: 30 });
t('agregá a Pedro Juárez el miércoles a las 16 hs por una hora', { intent: 'newAppt', name: 'pedro juarez', date: '2026-11-04', start: 960, dur: 60 });
t('dale un turno a María López el jueves a las 10 y media de 45 minutos', { intent: 'newAppt', name: 'maria lopez', start: 630, dur: 45 });
t('agendame a Juan Pérez mañana 9hs', { intent: 'newAppt', name: 'juan perez', start: 540, date: '2026-11-05' });
t('sumá a la señora Ana Díaz el lunes que viene a las 11 de una hora y media', { intent: 'newAppt', name: 'ana diaz', date: '2026-11-09', dur: 90 });
t('turno para Pérez el 12 de diciembre a las 3 de la tarde', { intent: 'newAppt', name: 'perez', date: '2026-12-12', start: 900 });
t('agrega una caries oclusal del 45 en el odontograma', { intent: 'odon', text: 'caries oclusal del 45' });
t('marcá ausente el 18 en el odontograma de Quiroga', { intent: 'odon', text: 'ausente el 18', name: 'quiroga' });
t('agrega caries en el 36', { intent: 'unknown' });
t('odontograma de Lucía Benítez', { intent: 'ficha', sub: 'odon' });
// nombres del asistente
C.setWake('nexus');
[['Nexus, agregá a Pedro Juárez mañana a las 10', true, 'agrega a pedro juarez manana a las 10'], ['nexos quién sigue', true, 'quien sigue'], ['odontovoz quién sigue', true, 'quien sigue'], ['el nexus de la historia', false, 'el nexus de la historia']].forEach(([p, woke, rest]) => { n++; const r = C.stripWake(p); if (r.woke !== woke || r.rest !== rest) { fail++; console.log('FALLA wake nexus', p, JSON.stringify(r)); } });
C.setWake('agenda');
[['agenda, agregá a Gómez el viernes a las 10', true, 'agrega a gomez el viernes a las 10']].forEach(([p, woke, rest]) => { n++; const r = C.stripWake(p); if (r.woke !== woke || r.rest !== rest) { fail++; console.log('FALLA wake agenda', p, JSON.stringify(r)); } });
C.setWake('navi');
console.log((n - fail) + ' de ' + n + ' frases bien' + (fail ? ' · ' + fail + ' fallas' : ''));
process.exit(fail ? 1 : 0);
