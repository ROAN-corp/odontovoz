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
