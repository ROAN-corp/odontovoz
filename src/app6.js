/* ===== v6: estado rápido de turnos, seña visible, asistente con nombre y voz, menú con solapa, inicio del día, bienvenida ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, C = window.OVCmd, V = A.voice, IC = A.IC || {};
  A.VERSION = '6.0';
  const fake = attrs => ({ getAttribute: k => (attrs[k] == null ? null : String(attrs[k])), hasAttribute: k => attrs[k] != null });
  const LS = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
  };
  const capName = s => String(s || '').replace(/\b([a-zñ])/g, ch => ch.toUpperCase());

  /* =====================================================================
     UN SOLO MODO DE USO (se quitó «modo atención»)
     ===================================================================== */
  S.uimode = 'admin';
  A.acts.uiMode = () => { S.uimode = 'admin'; A.refresh(); };

  /* =====================================================================
     ESTADO DEL TURNO CON UN TOQUE
     ===================================================================== */
  const ST_ICON = { pendiente: '?', confirmado: '✓', llego: '●', 'en-atencion': '▶', atendido: '✔', ausente: '✕', cancelado: '⊘' };
  const ST_OPTS = [['confirmado', 'Confirmó'], ['llego', 'Llegó · en sala'], ['en-atencion', 'En atención'], ['atendido', 'Atendido'], ['ausente', 'No vino'], ['pendiente', 'Sin confirmar'], ['cancelado', 'Canceló']];
  A.stBtnHTML = a => '<button class="stb st-' + a.status + '" data-act="stMenu" data-id="' + a.id + '" aria-label="Estado: ' + esc(A.STATUS_LABEL[a.status] || a.status) + '. Tocá para cambiarlo" title="' + esc(A.STATUS_LABEL[a.status] || '') + ' · tocá para cambiar">' + (ST_ICON[a.status] || '?') + '</button>';
  A.acts.stMenu = (el, ev) => { if (ev) ev.stopPropagation(); S.modal = { type: 'stMenu', id: el.getAttribute('data-id') }; A.renderModal(); };
  MF.stMenu = m => {
    const a = A.apptById(m.id); if (!a || !a.pid) return '';
    const p = A.PAT(a.pid), sena = A.senaOf(a);
    let b = '<div class="st-head"><b>' + esc(p.name) + '</b><span>' + esc(A.cap(A.fmtLong(a.date))) + ' · ' + A.mm(a.start) + '–' + A.mm(a.start + a.dur) + ' · ' + esc(a.what) + (A.isSolo() ? '' : ' · ' + esc(A.PRO(a.pro).short)) + '</span></div>';
    b += '<div class="st-grid">' + ST_OPTS.map(o => '<button class="st-opt st-' + o[0] + '" data-act="stSet" data-st="' + o[0] + '" aria-pressed="' + (a.status === o[0]) + '"><i>' + ST_ICON[o[0]] + '</i>' + o[1] + '</button>').join('') + '</div>';
    b += '<div class="st-more">' +
      '<button class="btn" data-act="stResched">↻ Reprogramar</button>' +
      '<button class="btn' + (sena ? ' sena-on' : '') + '" data-act="apSena" data-id="' + a.id + '">$ ' + (sena ? 'Seña ' + A.money(sena) : 'Registrar seña') + '</button>' +
      (S.role === 'profesional' && a.status !== 'atendido' ? '<button class="btn primary" data-act="stAtender">Atender</button>' : '') +
      '<button class="btn ghost" data-act="stOpen">Ver el turno</button></div>';
    return A.modalShell('Estado del turno', b, '');
  };
  A.acts.stSet = el => {
    const id = S.modal && S.modal.id, st = el.getAttribute('data-st'); if (!id) return;
    S.modal = null; A.renderModal(); A.setStatus(id, st);
  };
  A.acts.stOpen = () => { const id = S.modal.id; S.modal = null; A.renderModal(); S.panel = { type: 'appt', id }; A.renderPanel(); };
  A.acts.stAtender = () => { const a = A.apptById(S.modal.id); S.modal = null; A.renderModal(); A.acts.startAtn(fake({ 'data-pid': a.pid, 'data-id': a.id })); };

  /* reprogramar: elegir otro día y uno de sus horarios libres */
  A.acts.stResched = () => { const a = A.apptById(S.modal.id); S.modal = { type: 'resched', id: a.id, date: a.date === A.today() ? A.add(a.date, 7) : a.date, pro: a.pro }; A.renderModal(); };
  MF.resched = m => {
    const a = A.apptById(m.id); if (!a) return '';
    const p = A.PRO(m.pro), slots = A.freeSlots ? A.freeSlots(p, m.date).filter(t => !(m.date === a.date && t === a.start)) : [];
    const days = []; for (let i = 0, k = A.today(); i < 21 && days.length < 12; i++, k = A.add(k, 1)) if (A.hoursFor(p, k).length) days.push(k);
    let b = '<div class="hint">Turno actual: ' + esc(A.fmtShort(a.date)) + ' ' + A.mm(a.start) + ' · ' + esc(A.PAT(a.pid).name) + '</div>';
    b += '<div class="rs-days">' + days.map(k => '<button class="wk' + (k === m.date ? ' on' : '') + '" data-act="rsDay" data-date="' + k + '" aria-pressed="' + (k === m.date) + '"><small>' + A.DOW[A.dow(k)].slice(0, 3) + '</small><b>' + A.parse(k).getDate() + '</b></button>').join('') + '</div>';
    b += '<div class="field"><label for="rsDate">Otro día</label><input type="date" id="rsDate" data-chg="rsDate" value="' + m.date + '"></div>';
    b += slots.length ? '<div class="slots">' + slots.map(t => '<button class="slot" data-act="rsPick" data-t="' + t + '">' + A.mm(t) + '</button>').join('') + '</div>' : '<div class="empty" style="padding:8px 0">No quedan horarios libres ese día.</div>';
    return A.modalShell('Reprogramar turno', b, '<button class="btn" data-act="closeModal">Cancelar</button>');
  };
  A.acts.rsDay = el => { S.modal.date = el.getAttribute('data-date'); A.renderModal(); };
  A.chg.rsDate = el => { if (el.value) { S.modal.date = el.value; A.renderModal(); } };
  A.acts.rsPick = el => {
    const m = S.modal, a = A.apptById(m.id), t = parseInt(el.getAttribute('data-t'), 10); S.modal = null; A.renderModal();
    A.tryMove(a.id, { date: m.date, start: t });
    const b = A.apptById(a.id); if (b && b.date === m.date && b.start === t) { b.rep = (b.rep || 0) + 1; if (b.status === 'ausente' || b.status === 'cancelado') b.status = 'pendiente'; b.rem = 'porenviar'; A.S.dirtyDays[b.date] = 1; A.save(); }
    if (S.tab === 'agenda') { S.date = m.date; } A.refresh();
  };

  /* =====================================================================
     SEÑA: se ve en el turno, en la agenda y en la cuenta del paciente
     ===================================================================== */
  A.senaOf = a => (a && a.sena ? a.sena.amt : a && a.online && a.senaState !== 'retenida' ? (a.senaAmt || 0) : 0);
  A.senaBadge = a => { const v = A.senaOf(a); return v ? '<span class="sena-b" title="Seña abonada">SEÑA ' + A.money(v) + '</span> ' : ''; };
  A.acts.apSena = el => { const id = el.getAttribute('data-id'); S.modal = { type: 'apSena', id }; A.renderModal(); };
  MF.apSena = m => {
    const a = A.apptById(m.id); if (!a) return '';
    const s = a.sena, def = (A.CFG.online && A.CFG.online.sena) || 10000;
    let b = '<div class="hint">' + esc(A.PAT(a.pid).name) + ' · turno del ' + esc(A.fmtShort(a.date)) + ' a las ' + A.mm(a.start) + '</div>';
    if (s) b += '<div class="sena-now"><b>Seña abonada: ' + A.money(s.amt) + '</b><span>' + esc(s.method || '') + ' · ' + A.fmtDMY(s.date) + (s.by ? ' · cargó ' + esc(s.by) : '') + '</span></div>';
    b += '<div class="row-btns">' + [def, 5000, 10000, 20000].filter((v, i, l) => l.indexOf(v) === i).map(v => '<button class="chip-ex" data-act="snQuick" data-v="' + v + '">' + A.money(v) + '</button>').join('') + '</div>' +
      '<div class="row2"><div class="field"><label for="asAmt">Importe</label><input id="asAmt" inputmode="numeric" value="' + (s ? s.amt : def) + '"></div><div class="field"><label for="asMeth">Medio de pago</label><select id="asMeth">' + ['Efectivo', 'Transferencia', 'Mercado Pago', 'Débito', 'Crédito'].map(x => '<option' + (s && s.method === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div></div>' +
      '<div id="asMsg" class="hint bad"></div><div class="hint">La seña queda anotada en el turno (se ve en la agenda) y como pago en la cuenta del paciente.</div>';
    return A.modalShell(s ? 'Seña del turno' : 'Registrar seña', b, (s ? '<button class="btn danger" data-act="asDel">Quitar seña</button>' : '<button class="btn" data-act="closeModal">Cancelar</button>') + '<button class="btn primary" data-act="asSave">' + (s ? 'Guardar cambio' : 'Registrar seña') + '</button>');
  };
  A.acts.snQuick = el => { const i = $('#asAmt'); if (i) i.value = el.getAttribute('data-v'); };
  function dropSenaLedger(a) { if (!a.sena || !a.sena.ledgerId) return; const pd = A.pd(a.pid); pd.ledger = pd.ledger.filter(e => e.id !== a.sena.ledgerId); A.touchPd(a.pid); }
  A.acts.asSave = () => {
    const a = A.apptById(S.modal.id), amt = parseInt(($('#asAmt').value || '').replace(/\D/g, ''), 10) || 0, method = $('#asMeth').value;
    if (!(amt > 0)) { $('#asMsg').textContent = 'Ingresá el importe de la seña.'; return; }
    dropSenaLedger(a);
    const pd = A.pd(a.pid), e = { id: A.uid(), date: A.today(), type: 'pago', amount: amt, desc: 'Seña del turno del ' + A.fmtDMY(a.date) + ' ' + A.mm(a.start), method, pro: a.pro, sena: true, apptId: a.id };
    pd.ledger.push(e); pd.ledger.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0)); A.touchPd(a.pid);
    A.mutate([a.date], () => { a.sena = { amt, method, date: A.today(), ledgerId: e.id, by: A.deviceLabel ? A.deviceLabel() : '' }; if (a.status === 'pendiente') { a.status = 'confirmado'; a.rem = 'confirmo'; } }, 'Seña registrada: ' + A.money(amt) + ' · ' + A.PAT(a.pid).name);
    S.modal = null; A.renderModal(); A.refresh(); if (A.notifyPeers) A.notifyPeers('sena', a);
  };
  A.acts.asDel = () => {
    const a = A.apptById(S.modal.id); dropSenaLedger(a);
    A.mutate([a.date], () => { delete a.sena; }, 'Seña quitada'); S.modal = null; A.renderModal(); A.refresh();
  };
  /* en el panel del turno, la seña va arriba de todo */
  const origPanel = A.renderPanel;
  A.renderPanel = () => {
    origPanel();
    const p = S.panel; if (!p || p.type !== 'appt') return;
    const a = A.apptById(p.id); if (!a || a.type === 'block') return;
    const head = $('#panelHost .panel-head'); if (!head) return;
    const v = A.senaOf(a);
    head.insertAdjacentHTML('afterend', '<div class="block sena-block' + (v ? ' on' : '') + '"><div><h3>Seña</h3>' + (v ? '<b class="sena-amt">' + A.money(v) + ' abonada</b><span class="hint" style="margin:0">' + esc((a.sena && a.sena.method) || 'turnero online') + (a.sena ? ' · ' + A.fmtDMY(a.sena.date) : '') + '</span>' : '<span class="hint" style="margin:0">Sin seña</span>') + '</div><button class="btn small' + (v ? '' : ' primary') + '" data-act="apSena" data-id="' + a.id + '">' + (v ? 'Ver o cambiar' : 'Registrar seña') + '</button></div>');
  };

  /* =====================================================================
     AGENDA: la vista del día sigue al turno actual
     ===================================================================== */
  let lastTouch = 0, lastKey = '';
  ['touchstart', 'wheel', 'pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, e => { if (e.target && e.target.closest && e.target.closest('#gridWrap, #view-inicio')) lastTouch = Date.now(); }, { passive: true, capture: true }));
  A.currentAppt = (pros) => {
    const t = A.today(), now = A.nowMin(), ids = (pros || A.visPros()).map(p => p.id);
    const l = A.day(t).filter(a => a.type !== 'block' && a.status !== 'cancelado' && ids.indexOf(a.pro) >= 0).sort((x, y) => x.start - y.start);
    return l.filter(a => a.status === 'en-atencion')[0] || l.filter(a => a.start <= now && a.start + a.dur > now && a.status !== 'atendido' && a.status !== 'ausente')[0] ||
      l.filter(a => a.status === 'llego')[0] || l.filter(a => a.start + a.dur > now && a.status !== 'atendido' && a.status !== 'ausente')[0] || null;
  };
  A.scrollToNow = smooth => {
    const w = $('#gridWrap'); if (!w || S.date !== A.today() || S.view !== 'dia') return;
    const cur = A.currentAppt(), el = cur && w.querySelector('[data-appt="' + cur.id + '"]'), nowL = w.querySelector('.now');
    const target = el ? el.offsetTop + (el.offsetParent && el.offsetParent !== w ? el.offsetParent.offsetTop : 0) - 48 : nowL ? nowL.offsetTop - 120 : null;
    if (target == null) return;
    try { w.scrollTo({ top: Math.max(0, target), behavior: smooth ? 'smooth' : 'auto' }); } catch (e) { w.scrollTop = Math.max(0, target); }
    /* en el teléfono la cuadrícula no tiene alto fijo: se mueve la página */
    if (w.scrollHeight <= w.clientHeight + 4 && el) { const r = el.getBoundingClientRect(); if (r.top < 90 || r.top > innerHeight - 160) window.scrollTo({ top: Math.max(0, scrollY + r.top - 130), behavior: smooth ? 'smooth' : 'auto' }); }
  };
  const origAgenda = A.render.agenda;
  A.render.agenda = () => {
    origAgenda();
    const key = S.view + S.date;
    if (key !== lastKey) { lastKey = key; if (S.view === 'dia' && S.date === A.today()) setTimeout(() => A.scrollToNow(false), 30); }
  };
  setInterval(() => {
    if (document.hidden || S.modal || S.panel) return;
    if (S.tab === 'agenda' && S.view === 'dia' && S.date === A.today()) {
      A.render.agenda();
      if (Date.now() - lastTouch > 90000) A.scrollToNow(true);
    } else if (S.tab === 'inicio' && Date.now() - lastTouch > 60000) A.render.inicio();
  }, 60000);

  /* =====================================================================
     ASISTENTE: nombre para llamarlo, respuesta hablada y silencio
     ===================================================================== */
  const NAMES = [['navi', 'Navi'], ['doc', 'Doc'], ['nexus', 'Nexus'], ['mia', 'Mia'], ['axon', 'Axon'], ['lumina', 'Lumina'], ['agenda', 'Agenda']];
  const AS = A.assist = { name: LS.get('odontovoz.wake', 'navi'), custom: LS.get('odontovoz.wakeCustom', '') };
  AS.label = () => { const f = NAMES.filter(n => n[0] === AS.name)[0]; return f ? f[1] : (AS.custom || 'Navi'); };
  A.wakeLabel = AS.label;
  C.setWake(AS.name, AS.custom);
  V.tts = LS.get('odontovoz.tts', '1') !== '0';
  const nativeTTS = () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.TextToSpeech) || null;
  function webSpeak(text, done) {
    const ss = window.speechSynthesis; if (!ss) { done(); return; }
    const u = new SpeechSynthesisUtterance(text); u.lang = 'es-AR'; u.rate = 1.05;
    const es = (ss.getVoices() || []).filter(v => /^es/i.test(v.lang)); const pick = es.filter(v => /AR|419|US|MX/i.test(v.lang))[0] || es[0]; if (pick) u.voice = pick;
    u.onend = done; u.onerror = done; ss.cancel(); ss.speak(u);
    setTimeout(() => { try { if (!ss.speaking && !ss.pending) done(); } catch (e) { done(); } }, 500);
  }
  /* habla en cualquier modo de voz (no mientras se dicta una nota); deja de escuchar para no oírse */
  V.speak = (msg, force) => {
    if (!msg || (!V.tts && !force)) return;
    if (!force && (!V.on || V.mode === 'texto' || V.mode === 'once')) return;
    const text = String(msg).replace(/[«»]/g, '').replace(/\s·\s/g, '. ').replace(/\$\s?/g, '').slice(0, 260);
    let done = false;
    const resume = () => { if (done) return; done = true; V.speaking = false; if (V.on && !V.rec && V._boot) V._boot(); if (V.ui) V.ui(); };
    V.speaking = true; if (V._stopRec) V._stopRec();
    setTimeout(resume, Math.min(10000, 1600 + text.length * 80));
    const t = nativeTTS();
    try {
      if (t) t.speak({ text, lang: 'es-AR', rate: 1.0, pitch: 1.0, volume: 1.0, category: 'playback' }).then(resume, () => { try { webSpeak(text, resume); } catch (e) { resume(); } });
      else webSpeak(text, resume);
    } catch (e) { resume(); }
  };
  A.acts.assistOpen = () => { A.hideDrawer(); S.modal = { type: 'assist' }; A.renderModal(); };
  MF.assist = () => {
    const nm = AS.label();
    let b = '<div class="as-hero"><span class="as-orb" aria-hidden="true"></span><div><b>' + esc(nm) + '</b><span>Tu asistente. Decí «' + esc(nm) + '» y el pedido; por ejemplo: «' + esc(nm) + ', agregá a Pedro Juárez el miércoles 4 de noviembre a las 16 en un turno de media hora».</span></div></div>';
    b += '<div class="lbl">Cómo se llama</div><div class="as-names">' + NAMES.map(n => '<button class="pill" data-act="asName" data-n="' + n[0] + '" aria-pressed="' + (AS.name === n[0]) + '">' + n[1] + '</button>').join('') + '<button class="pill" data-act="asName" data-n="custom" aria-pressed="' + (NAMES.every(n => n[0] !== AS.name)) + '">Otro…</button></div>';
    if (NAMES.every(n => n[0] !== AS.name)) b += '<div class="field"><label for="asCustom">Nombre elegido (una o dos palabras fáciles de decir)</label><input id="asCustom" data-chg="asCustom" value="' + esc(AS.custom) + '" placeholder="Ej.: Carlota"></div>';
    if (AS.name === 'agenda') b += '<div class="hint">Con «Agenda» también podés seguir diciendo «agenda de mañana»: si la frase es un pedido de la agenda, se abre la agenda.</div>';
    b += '<label class="chk" style="margin-top:10px"><input type="checkbox" data-chg="ttsSet"' + (V.tts ? ' checked' : '') + '> Responder en voz alta</label><div class="hint" style="margin-top:2px">Si lo apagás, ' + esc(nm) + ' responde solo con un mensaje escrito.</div>';
    b += '<div class="row-btns" style="margin-top:8px"><button class="btn" data-act="asTest">Probar la voz</button><button class="btn primary" data-act="handsFree">Activar manos libres</button></div>';
    b += '<div class="hint">También responde a «odontovoz». Funciona con la app abierta y la pantalla encendida.</div>';
    return A.modalShell('Asistente de voz', b, '<button class="btn primary" data-act="closeModal">Listo</button>');
  };
  A.acts.asName = el => {
    const n = el.getAttribute('data-n');
    AS.name = n === 'custom' ? 'custom' : n; LS.set('odontovoz.wake', AS.name); C.setWake(AS.name, AS.custom); A.renderModal(); A.afterRefresh();
    if (n !== 'custom') A.toast('Ahora el asistente se llama ' + AS.label() + '.');
  };
  A.chg.asCustom = el => { AS.custom = el.value.trim().split(/\s+/).slice(0, 2).join(' '); LS.set('odontovoz.wakeCustom', AS.custom); C.setWake(AS.name, AS.custom); A.afterRefresh(); A.toast('Ahora el asistente se llama ' + AS.label() + '.'); };
  A.chg.ttsSet = el => { V.tts = el.checked; LS.set('odontovoz.tts', el.checked ? '1' : '0'); A.toast(el.checked ? 'Respuesta en voz alta activada.' : 'Respuesta en voz alta silenciada.'); };
  A.acts.asTest = () => V.speak('Hola, soy ' + AS.label() + '. ¿En qué te ayudo?', true);

  /* =====================================================================
     NUEVAS FRASES: turnos con duración y paciente nuevo, odontograma explícito
     ===================================================================== */
  function findPat(name) {
    if (!name) { const c = A.curPid(); return c ? { pid: c } : { none: true }; }
    const r = A.searchPats(name, 8); if (!r.length) return { none: true, name };
    if (r.length === 1) return { pid: r[0].id };
    const nn = A.norm(name), ex = r.filter(p => A.norm(p.first + ' ' + p.last) === nn || A.norm(p.last + ' ' + p.first) === nn);
    if (ex.length === 1) return { pid: ex[0].id };
    return { many: r, name };
  }
  function odonCmd(pr) {
    const res = findPat(pr.name);
    if (!res.pid) return { ok: false, msg: res.many ? 'Hay varios pacientes que se llaman «' + pr.name + '». Abrí la ficha del que corresponde.' : res.name ? 'No encontré a «' + res.name + '».' : 'Primero abrí un paciente, o decí: «… en el odontograma de Pérez».' };
    if (!(S.tab === 'ficha' && S.fichaPid === res.pid && S.fichaTab === 'odon')) A.openFicha(res.pid, 'odon');
    const r = A.odText(pr.text, 'voz') || {};
    if (r.changed || (r.lines && r.lines.length && !/^(?:No hay nada|El barrido no)/.test(r.lines[0]))) return { ok: true, odon: true, msg: (r.lines || []).join(' · ') };
    if (r.issue) return { ok: true, odon: true, msg: 'Falta un dato: mirá el aviso debajo del odontograma.' };
    return { ok: false, odon: true, msg: 'No entendí «' + pr.text + '». Probá: «caries oclusal del 45 en el odontograma».' };
  }
  function newApptCmd(pr) {
    const res = pr.name ? findPat(pr.name) : (pr.current ? findPat(null) : { none: true }), pid = res.pid || null;
    const pro = pr.pro || (pid && A.PAT(pid).pro && A.visPros().some(x => x.id === A.PAT(pid).pro) ? A.PAT(pid).pro : null) || (S.proSel && S.proSel[0]) || A.visPros()[0].id;
    const date = pr.date || (S.tab === 'agenda' ? S.date : A.today());
    const T = pr.what && A.TYPES[pr.what], dur = pr.dur || (T ? T[1] : null);
    A.openNewAppt({ pid, pro, date, start: pr.start != null ? pr.start : null, dur, what: T ? T[0] : null, sobre: pr.sobre });
    let newName = '';
    if (!pid && pr.name && S.modal && S.modal.f) {
      const f = S.modal.f; f.q = capName(pr.name);
      if (!res.many) { const w = f.q.split(/\s+/); f.creating = true; f.n_first = w.length > 1 ? w.slice(0, -1).join(' ') : w[0]; f.n_last = w.length > 1 ? w[w.length - 1] : ''; newName = f.q; }
      A.renderModal(); if (res.many) { const q = $('#naQ'); if (q) { q.value = f.q; A.ins.naSearch(q); } }
    }
    const f = S.modal && S.modal.f, when = A.fmtShort(date) + ' a las ' + A.mm(f ? f.start : pr.start || 0) + (f ? ', ' + f.dur + ' minutos' : '');
    if (pid) return { ok: true, msg: 'Turno para ' + A.PAT(pid).name + ' el ' + when + (A.isSolo() ? '' : ' con ' + A.PRO(pro).short) + '. Decí «agendar» para confirmar o «cancelar».' };
    if (res.many) return { ok: true, msg: 'Hay varios pacientes que coinciden con «' + pr.name + '». Elegí uno en la lista y decí «agendar».' };
    if (newName) return { ok: true, msg: newName + ' no está en tus pacientes: lo creo como paciente nuevo. Turno el ' + when + '. ' + (f && f.n_last ? 'Decí «agendar» para guardar todo.' : 'Falta el apellido: escribilo y decí «agendar».') };
    return { ok: true, msg: 'Elegí el paciente. Turno el ' + when + '.' };
  }
  const origExec = A.cmd.exec;
  A.cmd.exec = (text, opts) => {
    let pr = null; try { pr = C.parse(text, { today: A.today(), pros: A.PROS.concat(A.PROS_OLD || []) }); } catch (e) { pr = null; }
    if (pr && pr.intent === 'mode' && pr.ui) return { ok: true, msg: 'Ahora hay un solo modo: todo está en el inicio y en el menú de la izquierda.' };
    if (pr && pr.intent === 'odon') return odonCmd(pr);
    if (pr && pr.intent === 'newAppt') return newApptCmd(pr);
    return origExec(text, opts);
  };

  /* =====================================================================
     MENÚ ESCONDIDO A LA IZQUIERDA CON SOLAPA (tocar o arrastrar)
     ===================================================================== */
  document.body.insertAdjacentHTML('beforeend', '<button id="drHandle" class="dr-handle" data-act="gear" aria-label="Abrir el menú" title="Menú (tocá o deslizá hacia la derecha)"><span></span></button>');
  (function () {
    let sw = null;
    document.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) { sw = null; return; }
      const x = e.touches[0].clientX, y = e.touches[0].clientY, d = $('#gearMenu'), open = d && !d.hidden;
      const onHandle = e.target.closest && e.target.closest('#drHandle');
      if (!open && !S.modal && (x < 22 || onHandle)) sw = { x, y, open: false };
      else if (open && e.target.closest && e.target.closest('.drawer')) sw = { x, y, open: true };
      else sw = null;
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (!sw) return; const dx = e.touches[0].clientX - sw.x, dy = e.touches[0].clientY - sw.y;
      if (Math.abs(dy) > Math.abs(dx) * 1.3 && Math.abs(dy) > 20) { sw = null; return; }
      const dr = $('#gearMenu .drawer');
      if (!sw.open && dx > 45) { A.showDrawer(); sw = null; }
      else if (sw.open && dr && dx < 0) dr.style.transform = 'translateX(' + Math.max(-320, dx) + 'px)';
    }, { passive: true });
    document.addEventListener('touchend', e => {
      if (!sw) return; const dx = e.changedTouches[0].clientX - sw.x, dr = $('#gearMenu .drawer');
      if (sw.open) { if (dr) dr.style.transform = ''; if (dx < -70) { A.hideDrawer(); A.afterRefresh(); } }
      sw = null;
    }, { passive: true });
  })();

  /* =====================================================================
     INICIO: la agenda del día resumida y cuatro botones
     ===================================================================== */
  const ICS = Object.assign({ menu: '', search: '', cal: '', mic: '', plus: '' }, IC);
  function dayRows(list, curId, showPro) {
    return list.map(a => {
      const p = A.PAT(a.pid), done = a.status === 'atendido' || a.status === 'ausente';
      return '<div class="hd-row st-' + a.status + (a.id === curId ? ' cur' : '') + (done ? ' done' : '') + '" data-act="openAppt" data-id="' + a.id + '" role="button" tabindex="0">' +
        '<span class="hd-time">' + A.mm(a.start) + '<small>' + a.dur + "'" + '</small></span>' + A.stBtnHTML(a) +
        '<span class="hd-who"><b>' + esc(p.name) + '</b><span>' + A.senaBadge(a) + esc(a.what) + (showPro ? ' · ' + esc(A.PRO(a.pro).short) : '') + (a.id === curId ? ' · <em>' + (a.status === 'en-atencion' ? 'en atención' : a.status === 'llego' ? 'en sala' : 'ahora') + '</em>' : '') + '</span></span>' + (A.waBtnHTML ? A.waBtnHTML(a) : '') + '</div>';
    }).join('');
  }
  A.render.inicio = () => {
    const host = $('#view-inicio'); if (!host) return;
    const t = A.today(), hr = A.nowDate().getHours(), hi = hr < 13 ? 'Buen día' : hr < 20 ? 'Buenas tardes' : 'Buenas noches', solo = A.isSolo();
    const me = solo ? A.PROS[0] : null, nm = AS.label();
    const l = A.day(t).filter(a => a.type !== 'block' && a.status !== 'cancelado' && A.visPros().some(p => p.id === a.pro)).sort((x, y) => x.start - y.start || (x.pro < y.pro ? -1 : 1));
    const cur = A.currentAppt(), curId = cur && cur.id;
    const done = l.filter(a => a.status === 'atendido').length, wait = l.filter(a => a.status === 'llego').length, senas = l.reduce((s, a) => s + A.senaOf(a), 0);
    const idx = cur ? l.indexOf(cur) : l.filter(a => a.status === 'atendido' || a.status === 'ausente' || a.start + a.dur <= A.nowMin()).length;
    const before = l.slice(0, Math.max(0, idx)), after = l.slice(Math.max(0, idx));
    let o = '<div class="home v6">';
    if (A.DEMO) o += '<div class="demo-banner"><span>Modo prueba: los pacientes y turnos son de ejemplo.</span><button class="btn small" data-act="modeOpen">Usarla de verdad</button></div>';
    o += '<div class="home-hi"><h1>' + hi + (me && !me.blank ? ', ' + esc(me.name) : '') + '</h1><p>' + esc(A.cap(A.fmtLong(t))) + ' · ' + esc(A.CLINIC) + '</p></div>';
    o += '<section class="hd-card" aria-label="Turnos de hoy"><div class="hd-top"><b>Hoy</b><span>' + l.length + ' turnos · ' + done + ' atendidos' + (wait ? ' · ' + wait + ' en sala' : '') + (senas ? ' · señas ' + A.money(senas) : '') + '</span></div>';
    if (!l.length) o += '<div class="empty" style="padding:14px 4px">No hay turnos para hoy. <button class="btn small primary" data-act="newAppt">+ Dar un turno</button></div>';
    else {
      if (before.length) o += '<details class="hd-before"' + (S.hdBefore ? ' open' : '') + '><summary>Anteriores (' + before.length + ')</summary>' + dayRows(before, curId, !solo) + '</details>';
      o += '<div class="hd-list">' + (after.length ? dayRows(after.slice(0, 8), curId, !solo) : '<div class="empty" style="padding:10px 4px">Terminaste los turnos de hoy.</div>') + '</div>';
      if (after.length > 8) o += '<button class="btn small ghost" data-act="tab" data-tab="agenda">Ver ' + (after.length - 8) + ' más en la agenda</button>';
    }
    o += '</section>';
    o += '<div class="home-actions four">' +
      '<button class="ha" data-act="searchToggle">' + ICS.search + '<span>Buscar paciente<small>Nombre, apellido o DNI</small></span></button>' +
      '<button class="ha" data-act="tab" data-tab="agenda">' + ICS.cal + '<span>Agenda completa<small>Día, semana y mes</small></span></button>' +
      '<button class="ha ha-voice" data-act="handsFree">' + ICS.mic + '<span>Hablar con ' + esc(nm) + '<small>Decí «' + esc(nm) + '» y el pedido</small></span></button>' +
      '<button class="ha" data-act="gear">' + ICS.menu + '<span>Menú<small>Pacientes, caja, ajustes</small></span></button></div>';
    o += '<button class="btn primary home-new" data-act="newAppt">+ Dar un turno</button>';
    host.innerHTML = o + '</div>';
  };
  document.addEventListener('toggle', e => { if (e.target && e.target.matches && e.target.matches('details.hd-before')) S.hdBefore = e.target.open; }, true);

  /* =====================================================================
     MENÚ: tipo de cuenta a la vista y nombre del asistente
     ===================================================================== */
  const origAfter = A.afterRefresh;
  A.afterRefresh = () => {
    origAfter();
    const al = $('#acctLbl'); if (al) al.textContent = A.isSolo() ? 'Odontólogo · consultorio individual' : 'Centro odontológico';
    const da = $('#drAssist'); if (da) da.textContent = AS.label() + (V.tts ? ' · responde en voz alta' : ' · en silencio');
    const h = $('#drHandle'), g = $('#gearMenu'); if (h) h.hidden = !!(g && !g.hidden) || !!S.modal || (S.tab === 'turnero');
    if (A.cloudChrome) A.cloudChrome();
  };
  const origModal = A.renderModal;
  A.renderModal = () => { origModal(); const h = $('#drHandle'); if (h) h.hidden = !!S.modal; };

  /* la pantalla de inicio después de elegir el tipo de cuenta */
  const origSetupGo = A.acts.setupGo;
  A.acts.setupGo = el => { origSetupGo(el); if (!S.modal || S.modal.type !== 'setup') { if (S.tab === 'agenda' && S.setup) { S.tab = 'inicio'; A.refresh(); } } };
  const origSetup = MF.setup;
  MF.setup = m => { let h = origSetup(m); if (!A.DEMO) h = h.replace('Todos los pacientes y turnos de esta versión son ficticios y quedan solo en este navegador.', 'Podés cambiar el tipo de cuenta cuando quieras desde el menú › Tu cuenta.'); return h; };

  /* =====================================================================
     BIENVENIDA ANIMADA (solo la primera vez)
     ===================================================================== */
  const LOGO = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path class="lg-path" d="M9 4c-3.2 0-5.5 2.6-5.5 6 0 2.6 1 4.4 1.8 6.6.9 2.5.9 5.4 1.9 8.5.5 1.6 2.4 1.7 3 .1.9-2.4 1.1-5.2 2.4-5.2h2.8c1.3 0 1.5 2.8 2.4 5.2.6 1.6 2.5 1.5 3-.1 1-3.1 1-6 1.9-8.5.8-2.2 1.8-4 1.8-6.6 0-3.4-2.3-6-5.5-6-2.1 0-3.2 1.1-5.2 1.1S11.1 4 9 4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path class="lg-wave" d="M11 11.5v2M13.5 10v5M16 9v7M18.5 10v5M21 11.5v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  A.showIntro = force => {
    if (!force && (LS.get('odontovoz.intro', '') === '1' || S.setup)) return false;
    const d = document.createElement('div'); d.id = 'intro'; d.className = 'intro'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Bienvenida');
    d.innerHTML = '<div class="in-box"><div class="in-logo">' + LOGO + '</div><h1 class="in-name">OdontoVoz</h1><p class="in-hi">Bienvenido</p>' +
      '<p class="in-desc">La agenda, las historias clínicas y el odontograma de tu consultorio, manejados con la voz. Pensada para atender con guantes: decís lo que ves y queda anotado.</p>' +
      '<button class="btn primary in-go" data-act="introGo">Comenzar</button></div>';
    document.body.appendChild(d); return true;
  };
  A.acts.introGo = () => { LS.set('odontovoz.intro', '1'); const d = $('#intro'); if (!d) return; d.classList.add('out'); setTimeout(() => { d.remove(); if (!S.setup && !S.modal) A.openSetup(); }, 420); };
  A.showIntro(false);
})();
