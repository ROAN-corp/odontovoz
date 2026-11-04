/* ===== intérprete de comandos por voz para toda la app (español rioplatense y otras variantes) =====
   Determinístico: convierte una frase en una intención con sus datos (paciente, fecha, hora, monto…).
   No toca la pantalla: eso lo hace el ejecutor de la app. Se puede probar aparte con node. */
(function (root) {
  'use strict';

  const N = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/(\d)\s*[:.h]\s*(\d{2})\b/g, '$1:$2')
    .replace(/[¿?¡!.,;"“”«»()\[\]]/g, ' ').replace(/\s+/g, ' ').trim();

  /* ---------- palabra de activación ---------- */
  const WAKE = /(?:^|\s)(?:(?:hola|oye|oi|che|ey|hey|dale)\s+)?(?:o\s*)?dont[oa]\s*(?:voz|vos|boz|bos|box|bots|bot|vo)?(?=\s|$)/;
  function stripWake(text) {
    const n = N(text), m = WAKE.exec(n);
    if (!m) return { woke: false, rest: n };
    return { woke: true, rest: (n.slice(0, m.index) + ' ' + n.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim() };
  }

  /* ---------- muletillas al principio y al final ---------- */
  const LEAD = /^(?:che|eh+|em+|mm+|este|bueno|bien|ok|okey|oka|a ver|aver|mira|mire|miren|oime|oiga|escuchame|escucha|porfa|por favor|porfis|please|ahora|tipo|o sea|osea|boludo|amigo|loco|hola|buenas|buen dia|disculpa|perdon|vamos|vamo|venga|epa|ey|hey|y bueno|bueno che|dale que|dale|listo y|necesito que|quiero que|podes|podrias|me podes|me podrias|haceme el favor de|por favor)\s+/;
  const TAIL = /\s+(?:por favor|porfa|porfis|please|dale|gracias|che|ya|ahora|si podes|cuando puedas|rapidito)$/;
  function clean(t) {
    let s = N(t), prev;
    do { prev = s; s = s.replace(LEAD, ''); } while (s !== prev);
    do { prev = s; s = s.replace(TAIL, ''); } while (s !== prev);
    return s.trim();
  }

  /* ---------- números en palabras ---------- */
  const NUM = { cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
    dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
    treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400,
    quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900, medio: 0.5, media: 0.5 };
  const MULT = { mil: 1000, luca: 1000, lucas: 1000, k: 1000, millon: 1e6, millones: 1e6, palo: 1e6, palos: 1e6, mango: 1, mangos: 1, pesos: 1, peso: 1 };
  function wordsNum(tokens) { // devuelve {value, used}
    let total = 0, cur = 0, used = 0, any = false;
    for (let i = 0; i < tokens.length; i++) {
      const w = tokens[i];
      if (w === 'y' && any && i + 1 < tokens.length && (NUM[tokens[i + 1]] != null || /^\d+$/.test(tokens[i + 1]))) { used++; continue; }
      if (/^\d+(?:[.,]\d+)?$/.test(w)) { cur += parseFloat(w.replace(',', '.')); used++; any = true; continue; }
      if (NUM[w] != null) { cur += NUM[w]; used++; any = true; continue; }
      if (MULT[w] && any) { if (MULT[w] >= 1000) { total += (cur || 1) * MULT[w]; cur = 0; } used++; continue; }
      if (MULT[w] && !any && (w === 'mil' || w === 'luca')) { total += 1000; used++; any = true; continue; }
      break;
    }
    return any ? { value: Math.round(total + cur), used } : null;
  }

  /* ---------- montos de dinero ---------- */
  function parseAmount(s) {
    let m = /\$?\s*\b(\d{1,3}(?:[.\s]\d{3})+|\d+(?:,\d+)?)\s*(mil|lucas?|k|palos?|millones?|millon)?\b(?:\s*(?:pesos|mangos))?/.exec(s);
    if (m && !/\b(?:pieza|diente|turno|las|la)\s*$/.test(s.slice(0, m.index))) {
      let v = parseFloat(m[1].replace(/[.\s]/g, '').replace(',', '.'));
      if (m[2]) v *= MULT[m[2]] || (/^mill/.test(m[2]) ? 1e6 : 1000);
      return { value: Math.round(v), rest: (s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim() };
    }
    const toks = s.split(' ');
    for (let i = 0; i < toks.length; i++) {
      if (NUM[toks[i]] == null && !MULT[toks[i]]) continue;
      const r = wordsNum(toks.slice(i));
      if (r && r.value >= 100) {
        let end = i + r.used; if (toks[end] === 'pesos' || toks[end] === 'mangos') end++;
        return { value: r.value, rest: toks.slice(0, i).concat(toks.slice(end)).join(' ').trim() };
      }
    }
    return { value: null, rest: s };
  }
  const METHODS = [[/\b(efectivo|cash|billete|en mano|contado)\b/, 'Efectivo'], [/\b(transferencia|transfer|transferido|alias|cbu|cvu)\b/, 'Transferencia'], [/\b(debito)\b/, 'Débito'],
    [/\b(credito|tarjeta|visa|master|mastercard|cuotas)\b/, 'Crédito'], [/\b(mercado ?pago|mercadopago|mp|qr)\b/, 'Mercado Pago'], [/\b(obra social|prepaga|osde|swiss|galeno|pami)\b/, 'Obra social / prepaga']];
  function parseMethod(s) { for (const [re0, v] of METHODS) { const re = new RegExp('(?:\\b(?:en|con|por|via|a traves de|de|pago en|pago con)\\s+)?' + re0.source), m = re.exec(s); if (m) return { value: v, rest: s.replace(m[0], ' ').replace(/\s+(en|con|por)\s*$/, '').replace(/\s+/g, ' ').trim() }; } return { value: null, rest: s }; }

  /* ---------- fechas ---------- */
  const DOWS = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
  const MONS = { enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 };
  const pad = n => (n < 10 ? '0' : '') + n;
  const keyOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const fromKey = k => { const p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); };
  const addD = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const dayNum = w => (/^\d{1,2}$/.test(w) ? +w : w === 'primero' ? 1 : NUM[w]);
  const DAYW = '(\\d{1,2}|primero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete|dieciocho|diecinueve|veinte|veintiuno|veintidos|veintitres|veinticuatro|veinticinco|veintiseis|veintisiete|veintiocho|veintinueve|treinta(?: y uno)?|treinta y un)';
  function parseDate(s, today) {
    const cut = (m, v) => ({ value: v, rest: (s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim() });
    let m;
    if ((m = /\bpasado manana\b/.exec(s))) return cut(m, addD(today, 2));
    if ((m = /\b(?:para )?manana\b/.exec(s))) return cut(m, addD(today, 1));
    if ((m = /\b(?:para )?hoy\b/.exec(s))) return cut(m, today);
    if ((m = /\banteayer\b/.exec(s))) return cut(m, addD(today, -2));
    if ((m = /\bayer\b/.exec(s))) return cut(m, addD(today, -1));
    if ((m = /\b(?:dentro de|en|de aca a) (\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|quince|veinte|treinta) (dias?|semanas?|mes(?:es)?)\b/.exec(s))) {
      const n = /^\d+$/.test(m[1]) ? +m[1] : NUM[m[1]];
      if (/^semana/.test(m[2])) return cut(m, addD(today, 7 * n));
      if (/^mes/.test(m[2])) { const d = fromKey(today); d.setMonth(d.getMonth() + n); return cut(m, keyOf(d)); }
      return cut(m, addD(today, n));
    }
    if ((m = /\b(?:el |este |el proximo |proximo |el otro )?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)( que viene| proximo| siguiente)?\b/.exec(s))) {
      const want = DOWS[m[1]], cur = fromKey(today).getDay(); let diff = (want - cur + 7) % 7;
      if (diff === 0 && (m[2] || /proximo|otro/.test(m[0]))) diff = 7;
      return cut(m, addD(today, diff));
    }
    if ((m = new RegExp('\\b(?:el )?' + DAYW + ' (?:de )?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\\b').exec(s))) {
      const dn = /treinta y/.test(m[1]) ? 31 : dayNum(m[1]), t = fromKey(today); let d = new Date(t.getFullYear(), MONS[m[2]], dn, 12);
      if (keyOf(d) < today) d = new Date(t.getFullYear() + 1, MONS[m[2]], dn, 12);
      return cut(m, keyOf(d));
    }
    if ((m = new RegExp('\\b(?:el|para el|del) ' + DAYW + '\\b(?! de la| a la| hs| horas| y media| y cuarto)').exec(s))) {
      const dn = /treinta y/.test(m[1]) ? 31 : dayNum(m[1]);
      if (dn >= 1 && dn <= 31) { const t = fromKey(today); let d = new Date(t.getFullYear(), t.getMonth(), dn, 12); if (keyOf(d) < today) d = new Date(t.getFullYear(), t.getMonth() + 1, dn, 12); return cut(m, keyOf(d)); }
    }
    return { value: null, rest: s };
  }

  /* ---------- horas ---------- */
  const HW = '(\\d{1,2}(?::\\d{2})?|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete|dieciocho|diecinueve|veinte)';
  const MINW = { media: 30, cuarto: 15, quince: 15, treinta: 30, veinte: 20, diez: 10, cinco: 5, cuarenta: 40, cincuenta: 50, 'cuarenta y cinco': 45, veinticinco: 25 };
  function parseTime(s) {
    const cut = (m, v) => ({ value: v, rest: (s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim() });
    let m;
    if ((m = /\b(?:al |a |para el |tipo )?mediodia\b/.exec(s))) return cut(m, 720);
    m = new RegExp('\\b(?:a las|a la|para las|para la|tipo|como a las|a eso de las|cerca de las|las|la|a eso de la)\\s+' + HW +
      '(?:\\s+(?:y\\s+)?(media|cuarto|cuarenta y cinco|quince|treinta|veinticinco|veinte|diez|cinco|cuarenta|cincuenta|\\d{2})(?!\\s+(?:mil|lucas?|pesos)))?(?:\\s+menos\\s+(cuarto|diez|veinte|cinco))?(?:\\s+(?:en punto|hs|horas|h))?(?:\\s+(?:de la|del|por la|a la)\\s+(manana|tarde|noche|mediodia))?').exec(s);
    if (!m) {
      const b = /\b(\d{1,2}:\d{2})(?:\s*(?:hs|horas|h))?(?:\s+(?:de la|del|por la)\s+(manana|tarde|noche))?/.exec(s);
      if (b) m = { 0: b[0], index: b.index, 1: b[1], 2: null, 3: null, 4: b[2] };
    }
    if (!m) return { value: null, rest: s };
    let h, mi = 0; const hw = m[1];
    if (/:/.test(hw)) { h = +hw.split(':')[0]; mi = +hw.split(':')[1]; } else h = /^\d+$/.test(hw) ? +hw : NUM[hw];
    if (h == null || h > 23) return { value: null, rest: s };
    if (m[2]) mi = /^\d+$/.test(m[2]) ? +m[2] : MINW[m[2]] || 0;
    if (m[3]) { mi = 60 - (MINW[m[3]] || 15); h -= 1; }
    const per = m[4] || m[5];
    if ((per === 'tarde' || per === 'noche') && h < 12) h += 12;
    else if (!per && h >= 1 && h <= 7) h += 12; /* «a las 3» en un consultorio es a la tarde */
    if (mi > 59) return { value: null, rest: s };
    return cut(m, h * 60 + mi);
  }

  /* ---------- motivo del turno ---------- */
  const MOTIVES = [[/\b(?:de |por |para |una |un |con )*(control(?:es)?|revision|chequeo|ver como sigue)\b/, 'control'], [/\b(?:de |por |para |una |un )*(limpieza|higiene|profilaxis|tartrectomia|sarro)\b/, 'limpieza'],
    [/\b(?:de |por |para |una |un )*(composite|arreglo|arreglar (?:una |un )?(?:muela|diente)|caries|empaste|tapadura|restauracion)\b/, 'composite'], [/\b(?:de |por |para |una |un )*(endodoncia|conducto|tratamiento de conducto|nervio)\b/, 'endodoncia'],
    [/\b(?:de |por |para |una |un )*(extraccion|exodoncia|sacar(?:le)? (?:una |la |el )?(?:muela|diente|pieza)|sacarse (?:una )?muela)\b/, 'extraccion'], [/\b(?:de |por |para |una |un )*(corona|funda)\b/, 'corona'],
    [/\b(?:de |por |para |una |un )*(ortodoncia|brackets?|frenillos?|aparatos?|alineadores?)\b/, 'ortodoncia'], [/\b(?:de |por |para |una |un |con )*(urgencia|dolor|le duele|me duele|duele|flemon|inflamacion)\b/, 'urgencia'],
    [/\b(?:de |por |para |una |un )*(primera (?:vez|consulta)|consulta|evaluacion|diagnostico)\b/, 'primera'], [/\b(?:de |por |para |una |un )*(implantes?)\b/, 'implante'], [/\b(?:de |por |para |una |un )*(blanqueamiento|blanquear)\b/, 'blanq']];
  function parseMotive(s) { for (const [re, v] of MOTIVES) { const m = re.exec(s); if (m) return { value: v, rest: (s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim() }; } return { value: null, rest: s }; }

  /* ---------- profesional («con la Dra. Vega», «con Matías») ---------- */
  function parsePro(s, pros) {
    const m = /\bcon (?:la |el )?(?:dra|dr|doc|doctora|doctor|odontologa|odontologo|profesional)?\s*([a-z]+)(?:\s+([a-z]+))?/.exec(s);
    if (!m) return { value: null, rest: s };
    const toks = [m[1], m[2]].filter(Boolean);
    for (const p of pros || []) {
      const words = N(p.name).replace(/^(dra|dr)\s+/, '').split(' ').concat([N(p.short)]);
      if (toks.some(t => t.length > 2 && words.indexOf(t) >= 0)) {
        const used = toks.length > 1 && words.indexOf(toks[1]) >= 0 ? m[0] : m[0].replace(new RegExp('\\s+' + (m[2] || '') + '$'), '');
        return { value: p.id, rest: (s.slice(0, m.index) + ' ' + s.slice(m.index + used.length)).replace(/\s+/g, ' ').trim() };
      }
    }
    return { value: null, rest: s };
  }

  /* ---------- nombre de paciente que queda en la frase ---------- */
  const PRON = /^(?:el|ella|este|esta|este paciente|esta paciente|el paciente|la paciente|ahi|el mismo|la misma|le|lo|la)$/;
  function cleanName(s) {
    let t = ' ' + s + ' ', prev;
    do { prev = t; t = t.replace(/^\s*(?:para|a|al|de|del|la|el|los|las|paciente|la paciente|el paciente|con|que|sr|sra|senor|senora|don|dona|mi|nuestro|nuestra)\s+/, ' '); } while (t !== prev);
    t = t.replace(/\s+(?:por favor|porfa|ya|ahora|che|dale|nomas|no mas)\s*$/, ' ').trim();
    if (!t || /^(?:turno|sobreturno|cita|uno|una|un|nuevo|nueva|otro|otra)$/.test(t)) return null;
    return t;
  }
  const isPron = s => !s || PRON.test(s);

  /* ---------- verbos ---------- */
  const GO = '(?:ir a(?:l| la)?|anda a(?:l| la)?|andate a(?:l| la)?|vamos a(?:l| la)?|vamo a(?:l| la)?|llevame a(?:l| la)?|pasa a(?:l| la)?|pasame a(?:l| la)?|entra(?:r)? a(?:l| la)?|abri(?:r|me)?|abre|mostra(?:r|me)?|muestra(?:me)?|ver|veamos|quiero ver|dame|traeme|trae|mira|volve a(?:l| la)?|volver a(?:l| la)?|abrime la|abrime el|abri la|abri el)';
  const SECT = [['agenda', /^(?:la |el |mi |los )?(agenda|calendario|turnos(?: del dia| de hoy)?|turnero interno)$/], ['pacientes', /^(?:los |la |el )?(pacientes|lista de pacientes|fichero|listado de pacientes)$/],
    ['caja', /^(?:la |el )?(caja|plata|cobros|economia|finanzas|ingresos|gastos|guita|numeros|balance)$/], ['liq', /^(?:las |los |la )?(liquidacion(?:es)?|honorarios|porcentajes)$/],
    ['cfg', /^(?:los |las |la )?(ajustes|configuracion|configurar|opciones|preferencias|settings)$/], ['turnero', /^(?:el )?(turnero(?: online| en linea| web)?|turnos online|reservas online)$/],
    ['tutorial', /^(?:el |la )?(tutorial|recorrido|guia(?: de uso)?)$/], ['support', /^(?:el )?(soporte|ayuda y soporte|contacto)$/]];
  const SUB = [['odon', /^(?:el |la )?(odontograma|dientes|piezas|dentadura|boca|carta dental)$/], ['datos', /^(?:la |el |los )?(historia(?: clinica)?|anamnesis|antecedentes|datos(?: personales)?|evolucion|ficha|hc)$/],
    ['plan', /^(?:el |la |los )?(plan(?: de tratamiento)?|tratamientos?(?: a realizar)?|a realizar|presupuestos?)$/], ['hecho', /^(?:lo )?(realizado|hecho|lo que se hizo|tratamientos (?:hechos|realizados))$/],
    ['rx', /^(?:las |la )?(recetas?|medicacion|medicamentos)$/], ['img', /^(?:las |la |los )?(imagenes|radiografias?|rx|placas?|fotos?|panoramicas?)$/],
    ['docs', /^(?:los |las |el )?(documentos|consentimientos?|firmas?|papeles)$/], ['cuenta', /^(?:la |el )?(cuenta(?: corriente)?|saldo|deuda|pagos|lo que debe|estado de cuenta)$/]];

  /* ---------- análisis principal ---------- */
  function parse(text, ctx) {
    ctx = ctx || {};
    const today = ctx.today || keyOf(new Date());
    const raw = N(text), c = clean(text);
    if (!c) return null;
    let m;

    // detener el dictado
    if (/^(?:terminar|termina|termine|finalizar|finaliza|cortar|corta|parar|para|frenar|frena|detener|deten|apagar|apaga|cerrar|cerra|desactivar|desactiva|salir del?)\s*(?:el |la )?(?:dictado|microfono|escucha|voz|manos libres|modo voz)$/.test(c) ||
      /^(?:basta|chau|chao|nos vemos|fin del dictado|eso es todo|nada mas|deja de escuchar|no escuches mas|terminamos|ya termine|listo el dictado|ya esta el dictado|stop|silencio|callate|termino el dictado)$/.test(c)) return { intent: 'stop' };
    if (/(?:que (?:te |le )?puedo decir|que (?:sabes|podes) hacer|que comandos|como (?:te hablo|se usa|funciona(?:s)?)|no se que decir|ayuda(?: con la voz)?|^comandos$|lista de comandos)/.test(c)) return { intent: 'help' };
    if (/^(?:deshacer|deshace|deshacelo|desace|desaser|anula(?:r)?(?: lo ultimo| el ultimo| eso)?|borra(?:r)? (?:lo|el) ultimo|me equivoque|eso no|eso esta mal|volve(?:r)? atras (?:el|ese) cambio|revertir|revertilo|para atras eso)$/.test(c)) return { intent: 'undo' };
    if (/^(?:si|sii|dale|confirmo|confirmar|confirma|confirmado|aceptar|acepto|acepta|guardar|guarda|guardalo|grabar|graba|grabalo|ok|okey|de acuerdo|perfecto|listo|hecho|agendar|agendalo|registrar|registralo|registra|cobrar|cobralo|enviar|mandalo|firmar|esta bien|correcto|va|vamos)$/.test(c)) return { intent: 'confirm' };
    if (/^(?:no|cancelar|cancela|cancelalo|dejalo|deja|deja nomas|mejor no|olvidalo|olvidate|ninguno|ninguna|nada)$/.test(c)) return { intent: 'cancel' };
    if (/^(?:volver|volve|vuelve|atras|para atras|ir para atras|anda para atras|regresar|regresa|anterior|pantalla anterior|cerrar|cerra|cerralo|salir de aca|sali de aca|salir)$/.test(c)) return { intent: 'back' };
    if (new RegExp('^(?:' + GO + '\\s+)?(?:a(?:l)?\\s+|la\\s+)?(?:inicio|pantalla (?:principal|de inicio)|casa|casita|home|principio|menu principal|escritorio|el principio)$').test(c)) return { intent: 'home' };
    if (/^(?:abri(?:r|me)?|mostra(?:r|me)?|desplega(?:r)?)?\s*(?:el )?menu(?: lateral)?$/.test(c)) return { intent: 'menu' };

    // modos de uso y apariencia
    if (/\bmodo atencion\b|^(?:pasa(?:r|me)? a |activa(?:r)? (?:el )?)?atencion$/.test(c)) return { intent: 'mode', ui: 'atencion' };
    if (/\bmodo (?:administracion|admin|administrador|completo)\b/.test(c)) return { intent: 'mode', ui: 'admin' };
    if (/\b(?:modo|ver como|vista de) recepcion\b/.test(c)) return { intent: 'mode', role: 'recepcion' };
    if (/\b(?:modo|ver como|vista de) profesional\b/.test(c)) return { intent: 'mode', role: 'profesional' };
    if (/\b(?:tema|modo|pantalla) (?:oscuro|oscura|noche|negro|negra)\b/.test(c)) return { intent: 'mode', theme: 'dark' };
    if (/\b(?:tema|modo|pantalla) (?:claro|clara|dia|blanco|blanca)\b/.test(c)) return { intent: 'mode', theme: 'light' };
    if (/^(?:activa(?:r)?|prende(?:r)?|encende(?:r)?|pone(?:r)?) (?:el )?manos libres$|^manos libres$/.test(c)) return { intent: 'hands' };

    // pasos de la atención
    if (/^(?:siguiente paso|paso siguiente|proximo paso|seguimos|sigamos|sigue|avanza(?:r|mos)?|continuar|continua|continuemos|lo que sigue|que sigue ahora)$/.test(c)) return { intent: 'flowNext' };
    if (/^(?:paso anterior|volver un paso|volve un paso|retroceder|retrocede|el paso de antes)$/.test(c)) return { intent: 'flowPrev' };
    if (/^(?:terminar|termina|finalizar|finaliza|cerrar|cerra|dar por terminada|listo con) (?:la )?(?:atencion|consulta|sesion|visita)$/.test(c)) return { intent: 'flowEnd' };

    // consultas rápidas
    if (/^(?:quien sigue|quien viene|quien es el (?:siguiente|proximo)|cual es el proximo(?: paciente)?|(?:el )?proximo paciente|(?:el )?siguiente paciente|a quien atiendo|quien me toca)$/.test(c)) return { intent: 'who' };
    if (/^(?:como viene el dia|que tengo hoy|cuantos? (?:turnos|pacientes) (?:tengo|hay)(?: hoy)?|resumen del dia|como estamos hoy|cuantos faltan)$/.test(c)) return { intent: 'today' };
    if ((m = /^(?:cuanto (?:me )?debe|que saldo tiene|cual es el saldo de|cuanto le falta pagar a|debe algo)(?:\s+(.*))?$/.exec(c))) return { intent: 'owe', name: cleanName(m[1] || '') };

    // atender
    if ((m = /^(?:atender|atende|atiendo|atendamos|empezar|empeza|empecemos|arrancar|arranca|arrancamos|iniciar|inicia|comenzar|comenza|hace(?:r)? pasar|que pase|pasa|llama(?:r)?)(?: la| una)?(?: atencion| consulta)?(?: (?:a la|al|con|de|a))?\s*(.*)$/.exec(c))) {
      const who = cleanName(m[1] || '');
      if (!who || /^(?:siguiente|proximo|el siguiente|el proximo|el que sigue|la que sigue|quien sigue)$/.test(who)) return { intent: 'attend', next: true };
      if (!/\b(?:turno|agenda|dictado)\b/.test(who)) return { intent: 'attend', name: isPron(who) ? null : who, current: isPron(who) };
    }
    // recepción: llegó / no vino
    if ((m = /^(.+?)\s+(?:no vino|falto|no se presento|esta ausente|no llego|no va a venir)$/.exec(c)) || (m = /^(?:no vino|falto|ausente|marca(?:r)? ausente(?: a)?)\s+(.+)$/.exec(c))) return { intent: 'noshow', name: cleanName(m[1]) };
    if ((m = /^(?:ya )?(?:llego|vino|entro|esta aca|esta en la sala|esta esperando|ya esta|recibi(?:r)?|recibo|recepciona(?:r)?)\s+(?:a\s+|el\s+|la\s+)?(.+)$/.exec(c)) || (m = /^(.+?)\s+(?:ya )?(?:llego|vino|esta aca|esta en la sala|esta esperando|ya esta aca)$/.exec(c))) return { intent: 'arrived', name: cleanName(m[1]) };
    if ((m = /^confirma(?:r|le)?\s+(?:el\s+)?turno\s+(?:de|a|del|de la|para)\s+(.+)$/.exec(c))) return { intent: 'confirmAppt', name: cleanName(m[1]) };
    if ((m = /^(?:cancela(?:r|le)?|suspende(?:r|le)?|anula(?:r|le)?|borra(?:r|le)?|saca(?:r|le)?)\s+(?:el\s+)?turno\s+(?:de|a|del|de la|para)\s+(.+)$/.exec(c))) return { intent: 'cancelAppt', name: cleanName(m[1]) };

    // turnos nuevos
    if ((m = /^(?:(?:dar|da|dale|dame|darle|agenda(?:r|me|le)?|anota(?:r|me|le)?|pone(?:r|me|le)?|nuevo|nueva|reserva(?:r|me|le)?|saca(?:r|me|le)?|hace(?:r|me|le)?|programa(?:r|me|le)?|quiero|necesito|crea(?:r)?|agregar|agrega(?:me|le)?|carga(?:r|me|le)?|asigna(?:r|le)?)\s+)?(?:un |una |el |otro |otra |nuevo |nueva )?(sobreturno|sobre turno|turno|cita|hora)(?:\s+nuevo|\s+nueva)?\b(.*)$/.exec(c)) && (m[1] !== 'hora' || /\b(?:para|a)\b/.test(m[2]))) {
      let r = ' ' + m[2] + ' ';
      const t = parseTime(r.trim()); r = t.rest;
      const d = parseDate(r, today); r = d.rest;
      const mo = parseMotive(r); r = mo.rest;
      const p = parsePro(r, ctx.pros); r = p.rest;
      const name = cleanName(r.trim());
      return { intent: 'newAppt', sobre: /sobre/.test(m[1]), start: t.value, date: d.value, what: mo.value, pro: p.value, name: isPron(name) ? null : name, current: !!name && isPron(name) };
    }
    if ((m = /^(?:agenda(?:r|me|le)?|anota(?:r|me|le)?|reserva(?:r|me|le)?)\s+(?!(?:de la|del|de|semana|mes|dia|hoy|manana)\b)(?:a\s+|al\s+|a la\s+)?(.+)$/.exec(c)) && !/\b(?:en la historia|en historia|historia clinica)\b/.test(m[1])) {
      let r = m[1];
      const t = parseTime(r); r = t.rest; const d = parseDate(r, today); r = d.rest; const mo = parseMotive(r); r = mo.rest; const p = parsePro(r, ctx.pros); r = p.rest;
      const name = cleanName(r.trim());
      if (t.value != null || d.value || name) return { intent: 'newAppt', sobre: false, start: t.value, date: d.value, what: mo.value, pro: p.value, name: isPron(name) ? null : name, current: !!name && isPron(name) };
    }
    // pacientes nuevos
    if ((m = /^(?:nuevo paciente|nueva paciente|paciente nuevo|paciente nueva|agrega(?:r|me)? (?:un |una )?(?:nuevo |nueva )?paciente|crea(?:r)? (?:un |una )?paciente|alta de paciente|da(?:r)? de alta (?:a )?|registra(?:r)? (?:un |una )?(?:nuevo |nueva )?paciente|carga(?:r|me)? (?:un |una )?paciente)\s*(.*)$/.exec(c))) {
      const parts = (m[1] || '').replace(/^(?:que se llama|llamado|llamada|de nombre|a)\s+/, '').split(' ').filter(Boolean);
      return { intent: 'newPat', first: parts.slice(0, Math.max(1, parts.length - 1)).join(' '), last: parts.length > 1 ? parts[parts.length - 1] : '' };
    }

    // historia clínica y notas
    if ((m = /^(?:agrega(?:r|me|le)?|anota(?:r|me|le)?|suma(?:r|me|le)?|escribi(?:r|me|le)?|pone(?:r|me|le)?|carga(?:r|me|le)?|registra(?:r|me|le)?|deja(?:r|me)?)\s+(?:en|a)\s+(?:la\s+)?(?:historia(?:\s+clinica)?|hc|ficha|evolucion)\b[\s,:.-]*(.*)$/.exec(c)) ||
      (m = /^(?:en (?:la )?historia(?: clinica)?|historia clinica)\s*(?:pone|anota|agrega|escribi)?\s*(.+)$/.exec(c))) return { intent: 'hc', text: m[1] || '' };
    if ((m = /^(?:hoy\s+)?(?:hice|realice|hicimos|se hizo|se realizo|le hice|le hicimos|le realice|termine|terminamos|nota|anota que)\s+(.+)$/.exec(c))) return { intent: 'note', text: m[1] };

    // documentos y plan
    if ((m = /\bconsentimiento(?: informado)?(?: (?:de|para|del|por))?(?: la| el| una| un)?\s*(extraccion|exodoncia|sacar|endodoncia|conducto|implantes?|blanqueamiento|ortodoncia|brackets|anestesia)?/.exec(c)) && /^(?:firma(?:r)?|hace(?:r|me)?|arma(?:r|me)?|nuevo|genera(?:r)?|prepara(?:r)?|abri(?:r)?|el |un |)\s*(?:el |un )?consentimiento/.test(c)) {
      const k = m[1] || ''; const tpl = /extrac|exodon|sacar/.test(k) ? 'extraccion' : /endodon|conducto/.test(k) ? 'endodoncia' : /implant/.test(k) ? 'implante' : /blanque/.test(k) ? 'blanq' : /ortodon|bracket/.test(k) ? 'orto' : /anestes/.test(k) ? 'anestesia' : null;
      return { intent: 'consent', tpl };
    }
    if (/^(?:arma(?:r|me|le)?|hace(?:r|me|le)?|nuevo|genera(?:r|me)?|prepara(?:r|me)?|crea(?:r)?|calcula(?:r|me)?|pasa(?:r|me)?)\s+(?:un |el |una )?presupuesto/.test(c)) return { intent: 'budget' };
    if ((m = /^(?:receta(?:r|le)?|hace(?:r|me|le)? una receta|nueva receta|indica(?:r|le)?|recetale|prescribi(?:r|le)?)(?:\s+(?:de|con|para|el|la))?\s*(.*)$/.exec(c))) return { intent: 'rx', med: m[1] || '' };

    // cobros
    if ((m = /^(?:cobra(?:r|le|me)?|registra(?:r|me)? (?:un |el )?(?:cobro|pago)|me pago|me pagaron|pago|pagó|abono|abonaron|cobro|recibi|cobramos|entraron|carga(?:r|me)? (?:un )?(?:cobro|pago))\b\s*(.*)$/.exec(c))) {
      let r = m[1] || '';
      const a = parseAmount(r); r = a.rest; const me = parseMethod(r); r = me.rest;
      const name = cleanName(r.replace(/^(?:de|a|al|del|de la)\s+/, ''));
      return { intent: 'pay', amount: a.value, method: me.value, name: isPron(name) ? null : name };
    }

    // navegación por secciones y pestañas de la ficha
    let body = c; const goM = new RegExp('^' + GO + '\\s+').exec(body); if (goM) body = body.slice(goM[0].length);
    // agenda con fecha: «agenda de mañana», «turnos del lunes», «mañana»
    if ((m = /^(?:la |mi |los |el )?(?:agenda|turnos|calendario)(?: (?:para el|de la|del|para|de))?\s*(.*)$/.exec(body)) || (!goM && /^(?:hoy|manana|pasado manana|ayer|el (?:lunes|martes|miercoles|jueves|viernes|sabado|domingo)|(?:la )?semana (?:que viene|siguiente|proxima|pasada|anterior)|(?:el )?mes (?:que viene|siguiente|proximo|pasado|anterior)|(?:el )?dia (?:siguiente|anterior)|(?:el )?(?:siguiente|proximo) dia)$/.test(body) && (m = [body, body]))) {
      const rest = (m[1] || '').trim();
      if (!rest) return { intent: 'nav', tab: 'agenda' };
      if (/^(?:la )?semana (?:que viene|siguiente|proxima)$/.test(rest)) return { intent: 'nav', tab: 'agenda', view: 'semana', shift: 7 };
      if (/^(?:la )?semana (?:pasada|anterior)$/.test(rest)) return { intent: 'nav', tab: 'agenda', view: 'semana', shift: -7 };
      if (/^(?:la )?semana$|^esta semana$/.test(rest)) return { intent: 'nav', tab: 'agenda', view: 'semana' };
      if (/^(?:el )?mes (?:que viene|siguiente|proximo)$/.test(rest)) return { intent: 'nav', tab: 'agenda', view: 'mes', months: 1 };
      if (/^(?:el )?mes (?:pasado|anterior)$/.test(rest)) return { intent: 'nav', tab: 'agenda', view: 'mes', months: -1 };
      if (/^(?:el |todo el |este )?mes$/.test(rest)) return { intent: 'nav', tab: 'agenda', view: 'mes' };
      if (/^(?:el )?(?:dia siguiente|siguiente dia|proximo dia)$/.test(rest)) return { intent: 'nav', tab: 'agenda', view: 'dia', shift: 1 };
      if (/^(?:el )?dia anterior$/.test(rest)) return { intent: 'nav', tab: 'agenda', view: 'dia', shift: -1 };
      const d = parseDate(rest, today); if (d.value && !d.rest) return { intent: 'nav', tab: 'agenda', view: 'dia', date: d.value };
      const p = parsePro('con ' + rest.replace(/^con\s+/, ''), ctx.pros); if (p.value && !p.rest) return { intent: 'nav', tab: 'agenda', pro: p.value };
    }
    if (/^(?:vista (?:de )?|ver (?:el |la )?)?(dia|semana|mes)$/.test(body) && /^vista|^ver /.test(c)) return { intent: 'nav', tab: 'agenda', view: /dia/.test(body) ? 'dia' : /semana/.test(body) ? 'semana' : 'mes' };
    if (/^(?:dia siguiente|siguiente dia|proximo dia|un dia mas|adelante|para adelante)$/.test(body)) return { intent: 'nav', tab: 'agenda', shift: 1 };
    if (/^(?:dia anterior|un dia menos|para atras un dia)$/.test(body)) return { intent: 'nav', tab: 'agenda', shift: -1 };
    for (const [tab, re] of SECT) if (re.test(body)) return { intent: 'nav', tab };
    if ((m = /^(?:la )?ficha (?:de la|del|de)\s+(.+)$/.exec(body))) return { intent: 'openPat', name: cleanName(m[1]), ficha: true };
    // «odontograma de Pérez», «cuenta del paciente»
    for (const [sub, re] of SUB) {
      const src = re.source.replace(/\$$/, '');
      const mm = new RegExp(src + '(?:\\s+(?:de|del|de la|para)\\s+(.+))?$').exec(body);
      if (mm) { const nm = cleanName(mm[mm.length - 1] || ''); return { intent: 'ficha', sub, name: isPron(nm) ? null : nm, budget: /presupuesto/.test(body) && /^(?:arma|hace|nuevo)/.test(c) }; }
    }
    // abrir / buscar paciente
    if ((m = /^(?:abri(?:r|me)?|busca(?:r|me)?|buscame|mostra(?:r|me)?|traeme|trae|ver|fijate|encontra(?:r|me)?|anda a|ir a|pasame|dame)\s+(?:la ficha de|la historia de|el paciente|la paciente|al paciente|a la paciente|a|al|la|el|paciente)?\s*(.+)$/.exec(c)) && !/^(?:la |el )?(?:turno|agenda)/.test(m[1])) {
      const nm = cleanName(m[1]); if (nm) return { intent: 'openPat', name: nm, ficha: /ficha|historia/.test(c) };
    }
    if ((m = /^(?:la )?ficha (?:de|del|de la)\s+(.+)$/.exec(c))) return { intent: 'openPat', name: cleanName(m[1]), ficha: true };
    if ((m = /^paciente\s+(.+)$/.exec(c))) return { intent: 'openPat', name: cleanName(m[1]) };
    return { intent: 'unknown', text: c, raw };
  }

  const api = { parse, clean, N, stripWake, parseDate, parseTime, parseAmount, parseMethod, parseMotive, parsePro, cleanName, wordsNum };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OVCmd = api;
})(typeof window !== 'undefined' ? window : this);
