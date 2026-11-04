/* ===== v5: voz continua, comandos para toda la app, navegación, inicio, flujo de atención, tutorial y soporte ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, C = window.OVCmd, P = A.P;
  const fake = attrs => ({ getAttribute: k => (attrs[k] == null ? null : String(attrs[k])), hasAttribute: k => attrs[k] != null });
  const SVG = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const IC = {
    mic: SVG('<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'), cal: SVG('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>'),
    plus: SVG('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M12 11v6M9 14h6"/>'), search: SVG('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
    users: SVG('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.9.8 3.1 2.6 3.5 5.2"/>'),
    tooth: SVG('<path d="M7 3c-2.4 0-4 1.9-4 4.4 0 1.9.7 3.2 1.3 4.8.7 1.8.7 4 1.4 6.2.4 1.2 1.8 1.2 2.2.1.6-1.8.8-3.8 1.8-3.8h2.1c.9 0 1.1 2 1.8 3.8.4 1.1 1.8 1.1 2.2-.1.7-2.2.7-4.4 1.4-6.2.6-1.6 1.3-2.9 1.3-4.8C21 4.9 19.4 3 17 3c-1.5 0-2.4.8-3.8.8S8.5 3 7 3z"/>'),
    menu: SVG('<path d="M4 7h16M4 12h16M4 17h16"/>'), hf: SVG('<path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 10v4"/>'), flask: SVG('<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>'),
    flow: SVG('<path d="M5 6h9M5 12h14M5 18h7"/><circle cx="17" cy="6" r="2"/><circle cx="15" cy="18" r="2"/>'), back: SVG('<path d="M15 18l-6-6 6-6"/>'), check: SVG('<path d="M5 12l5 5 9-10"/>'),
  };
  A.IC = IC;

  /* ---------- registro de errores (para el informe de soporte) ---------- */
  const ERRK = 'odontovoz.errors';
  A.logError = (kind, e) => { try { const l = JSON.parse(localStorage.getItem(ERRK) || '[]'); l.push({ t: new Date().toISOString(), k: kind, m: String((e && (e.stack || e.message || e.reason)) || e).slice(0, 400) }); localStorage.setItem(ERRK, JSON.stringify(l.slice(-40))); } catch (x) { /* sin almacenamiento */ } };
  window.addEventListener('error', ev => A.logError('error', ev.error || ev.message));
  window.addEventListener('unhandledrejection', ev => A.logError('promesa', ev.reason));

  /* =====================================================================
     MOTOR DE VOZ: un solo micrófono para toda la app.
     · «dictado»: procesa todo lo que decís hasta que lo apagás (no se corta al aplicar cada cambio).
     · «hands» (manos libres): espera la palabra «odontovoz» antes de cada pedido.
     · «texto»: escribe lo que decís en un cuadro de texto (notas).
     · «once»: una sola frase (búsqueda por voz).
     Los cortes normales del reconocedor (silencio, fin de frase) se reinician solos.
     ===================================================================== */
  const SRC = () => window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const MIC_BLOCKED = 'El micrófono no está disponible acá. Usá la app instalada o abrí la página en Chrome y permití el micrófono. Mientras tanto podés escribir el comando.';
  const V = A.voice = { on: false, mode: null, rec: null, opts: {}, speaking: false, restarts: [], armedUntil: 0, last: { t: '', at: 0 }, tts: true };
  try { V.tts = localStorage.getItem('odontovoz.tts') !== '0'; } catch (e) { /* nada */ }
  V.supported = () => !!SRC();
  function stopRec() { const r = V.rec; V.rec = null; if (r) { try { r.onend = null; r.onresult = null; r.onerror = null; (r.abort || r.stop).call(r); } catch (e) { /* ya detenido */ } } }
  function boot() {
    const SR = SRC(); if (!SR || !V.on) return;
    let rec; try { rec = new SR(); } catch (e) { fatal(MIC_BLOCKED); return; }
    rec.lang = 'es-AR'; rec.continuous = V.mode !== 'once'; rec.interimResults = true; rec.maxAlternatives = 1;
    rec.onresult = ev => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) { const r = ev.results[i]; if (r.isFinal) heard(r[0].transcript); else interim += r[0].transcript; }
      if (interim) live(interim, true);
    };
    rec.onerror = ev => {
      const e = ev && ev.error;
      if (e === 'not-allowed' || e === 'service-not-allowed') fatal(MIC_BLOCKED);
      else if (e === 'audio-capture') fatal('No se encontró un micrófono en este dispositivo.');
      else if (e === 'language-not-supported') fatal('El reconocimiento de voz de este dispositivo no tiene español.');
      /* no-speech, aborted, network: se ignoran; onend reinicia */
    };
    rec.onend = () => {
      if (V.rec !== rec) return; V.rec = null;
      if (!V.on) { ui(); return; }
      if (V.mode === 'once') { V.stop(); return; }
      if (V.speaking) return; /* vuelve a escuchar cuando termina de hablar */
      const now = Date.now(); V.restarts = V.restarts.filter(t => now - t < 60000); V.restarts.push(now);
      if (V.restarts.length > 45) { fatal('El micrófono se cortó muchas veces seguidas. Tocá el micrófono para seguir.'); return; }
      setTimeout(() => { if (V.on && !V.rec && !V.speaking) boot(); }, V.restarts.length > 10 ? 800 : 120);
    };
    V.rec = rec;
    try { rec.start(); } catch (e) { V.rec = null; setTimeout(() => { if (V.on && !V.rec) boot(); }, 600); }
  }
  function fatal(msg) { V.on = false; V.mode = null; stopRec(); ui(); A.toast(msg); }
  V.start = (mode, opts) => {
    if (!SRC()) { S.modal = { type: 'voiceHelp', blocked: true }; A.renderModal(); return false; }
    stopRec(); V.on = true; V.mode = mode || 'dictado'; V.opts = opts || {}; V.restarts = []; V.armedUntil = 0;
    if (V.mode === 'hands') live('Decí «odontovoz» y lo que necesitás');
    else if (V.mode === 'texto') live('Dictá la nota. Decí «terminar dictado» al final.');
    else if (V.mode === 'dictado') live(S.tab === 'ficha' && S.fichaTab === 'odon' ? 'Decí lo que ves: «caries oclusal del 35»' : 'Decí lo que necesitás: «turno para Pérez mañana a las 10»');
    boot(); ui(); return true;
  };
  V.stop = () => { const wasText = V.mode === 'texto' && V.opts; V.on = false; V.mode = null; stopRec(); V.armedUntil = 0; try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* nada */ } V.speaking = false; if (wasText && wasText.btn) wasText.btn.innerHTML = wasText.html; V.opts = {}; ui(); };
  V.toggle = mode => { if (V.on && (!mode || V.mode === mode)) V.stop(); else V.start(mode || 'dictado'); };
  /* respuesta hablada (solo en manos libres): se deja de escuchar mientras habla para no oírse a sí mismo */
  V.speak = msg => {
    if (!V.on || V.mode !== 'hands' || !V.tts || !window.speechSynthesis || !msg) return;
    try {
      const u = new SpeechSynthesisUtterance(String(msg).replace(/[«»]/g, '').slice(0, 220)); u.lang = 'es-AR'; u.rate = 1.05;
      V.speaking = true; stopRec();
      const resume = () => { if (!V.speaking) return; V.speaking = false; if (V.on && !V.rec) boot(); };
      u.onend = resume; u.onerror = resume;
      setTimeout(resume, Math.min(6500, 1200 + String(msg).length * 65));
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
      /* teléfonos sin voz instalada: nunca avisan que terminaron de hablar */
      setTimeout(() => { try { if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) resume(); } catch (e) { resume(); } }, 450);
    } catch (e) { V.speaking = false; if (V.on && !V.rec) boot(); }
  };
  A.say = (msg, undo) => { A.toast(msg, undo); V.speak(msg); };
  function live(t, interim) {
    const l = $('#vdLive'); if (l) l.textContent = t;
    if (A.odSetLive && S.tab === 'ficha' && S.fichaTab === 'odon') A.odSetLive((interim ? '… ' : '') + t);
  }
  V.live = live;
  function heard(text) {
    text = String(text || '').trim(); if (!text) return;
    const now = Date.now(); if (A.norm(text) === V.last.t && now - V.last.at < 1800) return; /* algunos teléfonos repiten la misma frase */
    V.last = { t: A.norm(text), at: now };
    if (V.mode === 'once') { const f = V.opts.onText; V.stop(); if (f) f(text); return; }
    if (V.mode === 'texto') {
      const n = C.clean(text);
      if (/^(?:terminar|termina|finalizar|cortar|parar|para) (?:el )?dictado$|^(?:basta|chau|fin del dictado|listo el dictado)$/.test(n)) { V.stop(); A.toast('Dictado terminado.'); return; }
      const ta = V.opts.target; if (!ta || !document.body.contains(ta)) { V.stop(); return; }
      const cap = text.charAt(0).toUpperCase() + text.slice(1);
      ta.value = (ta.value ? ta.value.replace(/\s*$/, '') + ' ' : '') + cap.replace(/[.\s]*$/, '') + '. ';
      ta.dispatchEvent(new Event('input', { bubbles: true })); live('Anotado: ' + text); return;
    }
    let phrase = text;
    if (V.mode === 'hands') {
      const w = C.stripWake(text);
      if (w.woke) {
        if (!w.rest) { V.armedUntil = now + 9000; live('Te escucho…'); V.speak('Te escucho'); ui(); return; }
        phrase = w.rest;
      } else if (V.armedUntil > now) { V.armedUntil = 0; }
      else { live('(sin «odontovoz») ' + text, true); return; }
      V.armedUntil = 0;
    } else { const w = C.stripWake(text); if (w.woke && !w.rest) { live('Te escucho…'); return; } if (w.woke) phrase = w.rest; }
    live('«' + phrase + '»');
    let r;
    try { r = A.cmd.exec(phrase, { voice: true }); } catch (e) { A.logError('comando', e); r = { ok: false, msg: 'No pude hacer eso: ' + ((e && e.message) || 'error') }; }
    if (r && r.msg) { live(r.msg); if (!(S.tab === 'ficha' && S.fichaTab === 'odon' && r.odon)) A.say(r.msg); else V.speak(r.msg); }
    ui();
  }
  V.heard = heard;
  function ui() {
    const on = V.on, hands = on && V.mode === 'hands';
    const mic = $('#vdMic'); if (mic) { mic.setAttribute('aria-pressed', String(on && V.mode !== 'hands')); mic.setAttribute('aria-label', on ? 'Terminar el dictado' : 'Hablar: tocá y decí un comando'); }
    const hf = $('#hfBtn'); if (hf) { hf.setAttribute('aria-pressed', String(hands)); hf.title = hands ? 'Manos libres activo: tocá para apagarlo' : 'Manos libres: decí «odontovoz» y el comando'; }
    const bar = $('#vdBar'); if (bar) bar.hidden = !on || V.mode === 'once';
    const st = $('#vdState'); if (st) st.textContent = hands ? (V.armedUntil > Date.now() ? 'Te escucho' : 'Manos libres · decí «odontovoz»') : V.mode === 'texto' ? 'Dictando una nota' : 'Escuchando';
    const dock = $('#vdock'); if (dock) { dock.classList.toggle('listening', on); dock.classList.toggle('hands', hands); }
    const tm = $('#topMic'); if (tm) tm.setAttribute('aria-pressed', String(on && V.mode === 'once'));
    if (A.odUpdateMic) A.odUpdateMic();
  }
  V.ui = ui;

  /* botones de voz */
  A.acts.voiceToggle = () => { if (V.on) V.stop(); else V.start('dictado'); };
  A.acts.voiceStop = () => V.stop();
  A.acts.handsFree = () => {
    if (V.on && V.mode === 'hands') { V.stop(); A.toast('Manos libres apagado.'); return; }
    if (V.start('hands')) A.toast('Manos libres activo: decí «odontovoz» y el pedido, por ejemplo «odontovoz, quién sigue». Funciona con la app abierta y la pantalla encendida.');
  };
  A.acts.voiceSearch = () => V.start('once', { onText: t => { const q = t.replace(/^(?:buscar|busca|buscame|abri|abrime|paciente)\s+(?:a\s+|al\s+)?/i, '').replace(/[.,;]+$/, '').trim(); const bar = $('.top.appbar'); if (bar) bar.classList.add('searching'); const i = $('#topQ'); if (i) { i.value = q; A.ins.topSearch(i); } } });
  A.acts.dictate = el => {
    const ta = $(el.getAttribute('data-target')); if (!ta) return;
    if (V.on && V.mode === 'texto' && V.opts.target === ta) { V.stop(); return; }
    const html = el.innerHTML;
    if (V.start('texto', { target: ta, btn: el, html })) { el.innerHTML = '<b>Escuchando…</b> tocá para cortar'; ta.focus(); }
  };
  A.acts.voiceCmd = () => V.start('dictado');
  A.stripWake = text => C.stripWake(text);
  A.runCommand = (text, src) => { const w = C.stripWake(text); if (src === 'wake' && !w.woke) return { ok: false, ignored: true }; const r = A.cmd.exec(w.rest || text, {}); if (r.msg) A.say(r.msg); return r; };
  A.subs.cmdForm = () => { const i = $('#cmdIn'), v = i.value; i.value = ''; const r = A.cmd.exec(v, {}); if (r.msg) A.toast(r.msg); };
  A.subs.cmdForm2 = () => { const i = $('#cmdIn2'), v = i.value; i.value = ''; const r = A.cmd.exec(v, {}); const o = $('#cmdOut'); if (o) o.textContent = r.msg || ''; };
  A.acts.cmdSay = el => { const r = A.cmd.exec(el.getAttribute('data-say'), {}); if (r.msg) A.toast(r.msg); };

  /* =====================================================================
     EJECUTOR: hace en la app lo que pidió la frase
     ===================================================================== */
  function curPid() {
    if (S.tab === 'ficha' && S.fichaPid) return S.fichaPid;
    if (S.panel && S.panel.type === 'pat') return S.panel.pid;
    if (S.panel && S.panel.type === 'appt') { const a = A.apptById(S.panel.id); if (a && a.pid) return a.pid; }
    if (S.visit) return S.visit.pid;
    return null;
  }
  A.curPid = curPid;
  function findPat(name) {
    if (!name) { const c = curPid(); return c ? { pid: c } : { none: true }; }
    const r = A.searchPats(name, 8);
    if (!r.length) return { none: true, name };
    if (r.length === 1) return { pid: r[0].id };
    const nn = A.norm(name), exact = r.filter(p => A.norm(p.first + ' ' + p.last) === nn || A.norm(p.last + ' ' + p.first) === nn);
    if (exact.length === 1) return { pid: exact[0].id };
    const tday = A.day(A.today()).filter(a => a.type !== 'block' && a.status !== 'cancelado').map(a => a.pid), tt = r.filter(p => tday.indexOf(p.id) >= 0);
    if (tt.length === 1) return { pid: tt[0].id };
    return { many: r, name };
  }
  function showMany(res) { const bar = $('.top.appbar'); if (bar) bar.classList.add('searching'); const i = $('#topQ'); if (i) { i.value = res.name; A.ins.topSearch(i); } return 'Hay ' + res.many.length + ' pacientes que coinciden con «' + res.name + '». Tocá el que corresponde o decí el nombre completo.'; }
  const noPat = res => (res.many ? showMany(res) : res.name ? 'No encontré a «' + res.name + '». Probá con el apellido o el DNI.' : 'Primero abrí un paciente, o decí su nombre: «abrí a Pérez».');
  function todayAppt(pid) { return A.day(A.today()).filter(a => a.pid === pid && a.type !== 'block' && a.status !== 'cancelado').sort((x, y) => x.start - y.start).filter(a => a.status !== 'atendido')[0] || null; }
  function upcomingAppt(pid) { return todayAppt(pid) || (A.nextAppt ? A.nextAppt(pid) : null); }
  A.nextUp = () => {
    const t = A.today(), now = A.nowMin(), mine = A.isSolo() ? null : (S.uimode === 'atencion' ? S.me : null), vis = A.visPros().map(p => p.id);
    const l = A.day(t).filter(a => a.type !== 'block' && ['cancelado', 'atendido', 'ausente'].indexOf(a.status) < 0 && (!mine || a.pro === mine) && vis.indexOf(a.pro) >= 0).sort((x, y) => x.start - y.start);
    return l.filter(a => a.status === 'en-atencion')[0] || l.filter(a => a.status === 'llego')[0] || l.filter(a => a.start + a.dur > now)[0] || null;
  };
  const apptLine = a => { const p = A.PAT(a.pid); return p.name + ' a las ' + A.mm(a.start) + ' (' + a.what + (A.isSolo() ? '' : ', ' + A.PRO(a.pro).short) + ')'; };
  function goAgenda(o) {
    A.stopOd && A.stopOd(); S.tab = 'agenda'; S.panel = null; if (o.view) S.view = o.view; if (o.date) S.date = o.date; if (o.shift) S.date = A.add(S.date, o.shift); if (o.months) S.date = A.addMonths(S.date, o.months);
    if (o.pro) S.proSel = [o.pro]; A.hideDrawer(); A.refresh();
  }
  function odDictate(text) {
    const r = A.odText(text, 'voz') || {};
    if (r.changed || (r.lines && r.lines.length && !/^(?:No hay nada|El barrido no)/.test(r.lines[0]))) return { ok: true, odon: true, msg: (r.lines || []).join(' · ') };
    if (r.issue) return { ok: true, odon: true, msg: 'Falta un dato: mirá el aviso debajo del odontograma.' };
    return { ok: false, odon: true, msg: 'No entendí «' + text + '». Probá: «caries oclusal del 35».' };
  }
  const ok = msg => ({ ok: true, msg }), no = msg => ({ ok: false, msg });
  function exec(text, opts) {
    opts = opts || {};
    const pr = C.parse(text, { today: A.today(), pros: A.PROS.concat(A.PROS_OLD) });
    if (!pr) return no('');
    const it = pr.intent, onOdon = S.tab === 'ficha' && S.fichaTab === 'odon' && S.fichaPid && S.od;
    /* lo que suena a odontograma («ausente el 48», «iniciar barrido») gana sobre los comandos de agenda */
    const NAVI = ['stop', 'help', 'back', 'home', 'menu', 'nav', 'ficha', 'flowNext', 'flowPrev', 'flowEnd', 'confirm', 'cancel', 'mode', 'hands'];
    const op = P.parse(text), odonLike = op.actions.length > 0 || op.issues.some(x => x.type !== 'unknown');
    if (onOdon && (it === 'unknown' || it === 'undo' || (odonLike && NAVI.indexOf(it) < 0))) return odDictate(text);
    if (!onOdon && curPid() && op.actions.some(x => x.type === 'mark' || x.type === 'sano' || x.type === 'clear') && ['noshow', 'arrived', 'attend', 'openPat', 'unknown', 'note'].indexOf(it) >= 0) { A.openFicha(curPid(), 'odon'); return odDictate(text); }
    let res, pid, a;
    switch (it) {
      case 'stop': V.stop(); return ok('Dictado terminado.');
      case 'help': S.modal = { type: 'voiceHelp' }; A.renderModal(); return ok('Estos son ejemplos de lo que entiendo.');
      case 'undo': if (A.toastUndo) { A.acts.toastUndo(); return ok('Listo, deshecho.'); } return no('No hay nada para deshacer.');
      case 'confirm': {
        if (S.modal) {
          const bs = A.$$('#modalHost .m-foot .btn.primary').filter(b => !b.disabled), before = S.modal;
          if (bs.length) {
            bs[bs.length - 1].click();
            const err = A.$$('#modalHost .hint.bad, #modalHost .hint.warn').map(x => x.textContent.trim()).filter(Boolean)[0];
            if (S.modal === before && err) return no(err);
            return ok('Hecho.');
          }
        }
        return no('No hay nada para confirmar ahora.');
      }
      case 'cancel': case 'back': A.back({ soft: true }); return ok('Volví atrás.');
      case 'home': A.goHome(); return ok('Inicio.');
      case 'menu': A.showDrawer(); return ok('Menú abierto.');
      case 'hands': V.start('hands'); return ok('Manos libres activo. Decí «odontovoz» antes de cada pedido.');
      case 'mode':
        if (pr.ui) { A.acts.uiMode(fake({ 'data-ui': pr.ui })); return ok(pr.ui === 'atencion' ? 'Modo atención: tu agenda del día.' : 'Modo administración.'); }
        if (pr.role) { if (A.isSolo()) return no('En un consultorio individual no hay vista de recepción.'); A.acts.role(fake({ 'data-role': pr.role })); return ok(pr.role === 'recepcion' ? 'Vista de recepción.' : 'Vista de profesional.'); }
        if (pr.theme) { A.acts.themeSet(fake({ 'data-theme-set': pr.theme })); return ok(pr.theme === 'dark' ? 'Tema oscuro.' : 'Tema claro.'); }
        return no('');
      case 'flowNext': if (!S.visit) return no('No hay una atención en curso. Decí «atender a» y el paciente.'); A.flow.next(); return ok('Paso: ' + A.flow.cur().t + '.');
      case 'flowPrev': if (!S.visit) return no('No hay una atención en curso.'); A.flow.prev(); return ok('Paso: ' + A.flow.cur().t + '.');
      case 'flowEnd': if (!S.visit) return no('No hay una atención en curso.'); return ok(A.flow.finish());
      case 'who': a = A.nextUp(); return a ? ok('Sigue ' + apptLine(a) + '.') : ok('No quedan pacientes por atender hoy.');
      case 'today': {
        const l = A.day(A.today()).filter(x => x.type !== 'block' && x.status !== 'cancelado' && A.visPros().some(p => p.id === x.pro));
        const done = l.filter(x => x.status === 'atendido').length, wait = l.filter(x => x.status === 'llego').length;
        return ok('Hoy hay ' + l.length + ' turnos: ' + done + ' atendidos, ' + wait + ' en espera y ' + (l.length - done - l.filter(x => x.status === 'ausente').length) + ' por atender.');
      }
      case 'owe': res = findPat(pr.name); if (!res.pid) return no(noPat(res)); { const s = A.saldo(res.pid), p = A.PAT(res.pid); return ok(s > 0 ? p.name + ' debe ' + A.money(s) + '.' : s < 0 ? p.name + ' tiene ' + A.money(-s) + ' a favor.' : p.name + ' tiene la cuenta al día.'); }
      case 'attend':
        if (pr.next) { a = A.nextUp(); if (!a) return no('No quedan pacientes por atender hoy.'); A.acts.startAtn(fake({ 'data-pid': a.pid, 'data-id': a.id })); return ok('Atención de ' + A.PAT(a.pid).name + '. Decí «siguiente paso» para avanzar.'); }
        res = findPat(pr.name); if (!res.pid) return no(noPat(res));
        a = todayAppt(res.pid); A.acts.startAtn(fake({ 'data-pid': res.pid, 'data-id': a ? a.id : null })); return ok('Atención de ' + A.PAT(res.pid).name + '. Decí «siguiente paso» para avanzar.');
      case 'arrived': case 'noshow': case 'confirmAppt': case 'cancelAppt': {
        res = findPat(pr.name); if (!res.pid) return no(noPat(res));
        a = it === 'arrived' || it === 'noshow' ? todayAppt(res.pid) : upcomingAppt(res.pid);
        const p = A.PAT(res.pid); if (!a) return no(p.name + ' no tiene turno ' + (it === 'arrived' || it === 'noshow' ? 'hoy.' : 'próximo.'));
        const st = { arrived: 'llego', noshow: 'ausente', confirmAppt: 'confirmado', cancelAppt: 'cancelado' }[it];
        A.setStatus(a.id, st);
        return ok({ arrived: p.name + ' llegó (turno de las ' + A.mm(a.start) + ').', noshow: p.name + ': marcado como «no vino».', confirmAppt: 'Turno de ' + p.name + ' confirmado: ' + A.fmtShort(a.date) + ' ' + A.mm(a.start) + '.', cancelAppt: 'Turno de ' + p.name + ' cancelado (' + A.fmtShort(a.date) + ' ' + A.mm(a.start) + '). Podés deshacerlo.' }[it]);
      }
      case 'newAppt': {
        res = pr.name ? findPat(pr.name) : (pr.current ? findPat(null) : { none: true });
        pid = res.pid || null;
        const pro = pr.pro || (S.uimode === 'atencion' ? S.me : null) || (pid && A.PAT(pid).pro && A.visPros().some(x => x.id === A.PAT(pid).pro) ? A.PAT(pid).pro : null) || (S.proSel && S.proSel[0]) || A.visPros()[0].id;
        const date = pr.date || (S.tab === 'agenda' ? S.date : A.today());
        const T = pr.what && A.TYPES[pr.what];
        A.openNewAppt({ pid, pro, date, start: pr.start != null ? pr.start : null, dur: T ? T[1] : null, what: T ? T[0] : null, sobre: pr.sobre });
        if (!pid && pr.name && S.modal && S.modal.f) { S.modal.f.q = pr.name; A.renderModal(); const q = $('#naQ'); if (q) { q.value = pr.name; A.ins.naSearch(q); } }
        const when = A.fmtShort(date) + (pr.start != null ? ' a las ' + A.mm(pr.start) : '');
        return ok((pid ? 'Turno para ' + A.PAT(pid).name : res.many ? 'Elegí el paciente en la lista' : pr.name ? 'No encontré a «' + pr.name + '»: elegilo o crealo' : 'Elegí el paciente') + ' · ' + when + ' con ' + A.PRO(pro).short + '. Decí «agendar» para confirmar o «cancelar».');
      }
      case 'newPat': {
        S.modal = { type: 'patient' }; A.renderModal();
        const cap = s => s.replace(/\b\w/g, ch => ch.toUpperCase());
        if (pr.first && $('#npF')) $('#npF').value = cap(pr.first); if (pr.last && $('#npL')) $('#npL').value = cap(pr.last);
        return ok('Completá los datos del paciente y decí «guardar».');
      }
      case 'hc': {
        pid = curPid(); if (!pid) return no(noPat({}));
        const r = A.parseHC(pr.text || ''); if (!r.secs.length && !r.conds.length) return no('No entendí qué agregar a la historia.');
        if (S.role !== 'profesional') S.role = 'profesional';
        const done = A.applyHC(pid, r); A.refresh(); A.toast('Agregado a la historia: ' + done.out.join(', ') + '.', done.undo);
        return ok('Agregado a la historia de ' + A.PAT(pid).first + ': ' + done.out.join(', ') + '.');
      }
      case 'note': {
        pid = curPid(); if (!pid) return no(noPat({}));
        const pd = A.pd(pid), txt = 'Se realizó: ' + pr.text.charAt(0).toUpperCase() + pr.text.slice(1) + '.';
        pd.notes.unshift({ id: A.uid(), date: A.today(), pro: A.PAT(pid).pro, text: txt, quick: true, voice: true }); A.touchPd(pid); A.refresh();
        return ok('Anotado en la historia: ' + pr.text + '.');
      }
      case 'consent': pid = curPid(); if (!pid) return no(noPat({})); A.openFicha(pid, 'docs'); if (pr.tpl) A.startSign({ pid, kind: 'consent', tpl: pr.tpl }); else A.acts.consentPick(); return ok(pr.tpl ? 'Consentimiento listo para leer y firmar.' : 'Elegí el consentimiento.');
      case 'budget': {
        pid = curPid(); if (!pid) return no(noPat({}));
        A.openFicha(pid, 'plan'); if (!A.pd(pid).tx.some(t => t.status === 'plan')) return no('El plan está vacío: planificá tratamientos en el odontograma o agregá prácticas.');
        A.acts.budgetNew(); return ok('Presupuesto armado con el plan. Revisalo y decí «guardar» o tocá «Presentar y firmar».');
      }
      case 'rx': {
        pid = curPid(); if (!pid) return no(noPat({}));
        A.openFicha(pid, 'rx'); A.acts.rxNew();
        if (pr.med) { const mm = (A.RX_MEDS || []).filter(x => A.norm(x[0]).indexOf(A.norm(pr.med).split(' ')[0]) >= 0)[0]; if (mm && S.modal) { S.modal.items.push({ name: mm[0], pos: mm[1], dur: mm[2], qty: mm[3] }); A.renderModal(); } }
        return ok('Receta abierta. Revisá las dosis y decí «guardar».');
      }
      case 'pay': {
        res = findPat(pr.name); if (!res.pid) return no(noPat(res));
        if (S.tab !== 'ficha' || S.fichaPid !== res.pid) A.openFicha(res.pid, 'cuenta');
        const s = A.saldo(res.pid); S.modal = { type: 'cobro', pid: res.pid, amt: pr.amount || (s > 0 ? s : '') }; A.renderModal();
        if (pr.method && $('#mvMeth')) $('#mvMeth').value = pr.method;
        return ok('Cobro ' + (pr.amount ? 'de ' + A.money(pr.amount) + ' ' : '') + 'a ' + A.PAT(res.pid).name + (pr.method ? ' en ' + pr.method.toLowerCase() : '') + '. Decí «registrar» para confirmar.');
      }
      case 'nav':
        if (pr.tab === 'agenda') { goAgenda(pr); return ok('Agenda' + (pr.date ? ' del ' + A.fmtLong(S.date) : '') + '.'); }
        if (pr.tab === 'cfg') { A.acts.cfgOpen(fake({ 'data-t': 'centro' })); return ok('Ajustes.'); }
        if (pr.tab === 'turnero') { A.acts.tnOpen(); return ok('Turnero online.'); }
        if (pr.tab === 'tutorial') { A.openTutorial(); return ok('Tutorial.'); }
        if (pr.tab === 'support') { A.acts.supportOpen(); return ok('Ayuda y soporte.'); }
        if ((pr.tab === 'caja' || pr.tab === 'pacientes' || pr.tab === 'liq') && S.uimode === 'atencion') A.acts.uiMode(fake({ 'data-ui': 'admin' }));
        if (pr.tab === 'liq' && A.isSolo()) return no('Las liquidaciones son para centros con varios profesionales.');
        A.acts.tab(fake({ 'data-tab': pr.tab })); return ok({ pacientes: 'Pacientes.', caja: 'Caja.', liq: 'Liquidaciones.' }[pr.tab] || '');
      case 'ficha':
        res = findPat(pr.name); if (!res.pid) return no(noPat(res));
        A.openFicha(res.pid, pr.sub);
        if (pr.budget && A.pd(res.pid).tx.some(t => t.status === 'plan')) A.acts.budgetNew();
        return ok(A.PAT(res.pid).name + ' · ' + ({ odon: 'odontograma', datos: 'historia clínica', plan: 'plan y presupuesto', hecho: 'realizado', rx: 'recetas', img: 'imágenes', docs: 'documentos', cuenta: 'cuenta' }[pr.sub]) + '.');
      case 'openPat':
        res = findPat(pr.name); if (!res.pid) return no(noPat(res));
        if (pr.ficha || S.tab === 'ficha') A.openFicha(res.pid, 'datos'); else { S.panel = { type: 'pat', pid: res.pid }; A.renderPanel(); }
        return ok('Paciente: ' + A.PAT(res.pid).name + '.');
      default: {
        pid = curPid();
        if (pid && P.parse(text).actions.some(x => x.type === 'mark' || x.type === 'sano' || x.type === 'clear')) { if (!onOdon) A.openFicha(pid, 'odon'); return odDictate(text); }
        return no('No entendí «' + text + '». Decí «qué puedo decir» para ver ejemplos.');
      }
    }
  }
  A.cmd = { exec };

  /* =====================================================================
     NAVEGACIÓN: historial, botón atrás (de la app y del teléfono), casita, menú lateral, salir
     ===================================================================== */
  const NAV = A.nav = { stack: [], restoring: false, exiting: false };
  const navKey = () => S.tab + (S.tab === 'ficha' ? '|' + S.fichaPid + '|' + S.fichaTab : '') + (S.tab === 'caja' ? '|' + ((S.caja && S.caja.sub) || '') : '');
  A.navRecord = () => {
    if (NAV.restoring) return;
    const k = navKey(), top = NAV.stack[NAV.stack.length - 1];
    if (top && top.k === k) return;
    if (S.tab === 'inicio') NAV.stack = [];
    NAV.stack.push({ k, tab: S.tab, fichaPid: S.fichaPid, fichaTab: S.fichaTab, sub: S.caja && S.caja.sub });
    if (NAV.stack.length > 60) NAV.stack.splice(0, NAV.stack.length - 60);
  };
  A.showDrawer = () => { const d = $('#gearMenu'); if (d) d.hidden = false; A.afterRefresh(); };
  A.hideDrawer = () => { const d = $('#gearMenu'); if (d) d.hidden = true; };
  const drawerOpen = () => { const d = $('#gearMenu'); return d && !d.hidden; };
  A.back = opt => {
    opt = opt || {};
    if (document.body.classList.contains('tn-on')) { A.acts.tnClose(); return true; }
    if (S.modal) {
      if (S.modal.type === 'setup') return true;
      if (S.modal.type === 'exit') { if (opt.soft) { A.closeModal(); return true; } exitNow(); return true; }
      if (S.modal.back) { S.modal = S.modal.back; A.renderModal(); return true; }
      A.closeModal(); return true;
    }
    if (drawerOpen()) { A.hideDrawer(); A.afterRefresh(); return true; }
    if (S.panel) { S.panel = null; A.renderPanel(); A.afterRefresh(); return true; }
    const bar = $('.top.appbar'), res = $('#topRes');
    if ((res && res.innerHTML) || (bar && bar.classList.contains('searching'))) { if (res) res.innerHTML = ''; if (bar) bar.classList.remove('searching'); const q = $('#topQ'); if (q) q.value = ''; A.afterRefresh(); return true; }
    if (S.agMore) { S.agMore = false; A.refresh(); return true; }
    if (NAV.stack.length > 1) {
      NAV.stack.pop(); const prev = NAV.stack[NAV.stack.length - 1];
      A.stopOd && A.stopOd();
      NAV.restoring = true;
      S.tab = prev.tab; if (prev.tab === 'ficha') { if (prev.fichaPid !== S.fichaPid || !S.od) S.od = A.newOd(null); S.fichaPid = prev.fichaPid; S.fichaTab = prev.fichaTab; } if (prev.tab === 'caja' && prev.sub) S.caja.sub = prev.sub;
      S.panel = null; A.refresh(); NAV.restoring = false; window.scrollTo(0, 0); return true;
    }
    if (S.tab !== 'inicio') { A.goHome(); return true; }
    if (!opt.soft) { S.modal = { type: 'exit' }; A.renderModal(); }
    return true;
  };
  A.goHome = () => {
    A.stopOd && A.stopOd(); A.hideDrawer(); S.panel = null; if (S.modal && S.modal.type !== 'setup') { S.modal = null; A.renderModal(); }
    const bar = $('.top.appbar'); if (bar) bar.classList.remove('searching');
    S.tab = 'inicio'; NAV.stack = []; A.refresh(); window.scrollTo(0, 0);
  };
  A.acts.goHome = () => A.goHome();
  A.acts.navBack = () => A.back({ soft: true });
  A.acts.drawerClose = () => { A.hideDrawer(); A.afterRefresh(); };
  A.acts.searchToggle = () => {
    const bar = $('.top.appbar'); if (!bar) return;
    if (!A.isNarrow()) { const q = $('#topQ'); if (q) q.focus(); return; }
    bar.classList.toggle('searching'); if (bar.classList.contains('searching')) { const q = $('#topQ'); if (q) setTimeout(() => q.focus(), 30); }
  };
  const standalone = () => { try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) { return false; } };
  function exitNow() {
    A.saveNow(); S.modal = null; A.renderModal();
    const CP = window.OV_NATIVE && window.Capacitor.Plugins;
    if (CP && CP.App && CP.App.exitApp) { CP.App.exitApp(); return; }
    if (standalone()) { NAV.exiting = true; try { history.go(-(history.length - 1)); } catch (e) { /* nada */ } setTimeout(() => { try { window.close(); } catch (e) { /* nada */ } }, 200); return; }
    A.toast('Tus datos quedaron guardados. Ya podés cerrar esta pestaña.');
  }
  A.acts.exitNow = exitNow;
  MF.exit = () => A.modalShell('¿Salir de Odonto Voz?', '<p style="margin:0">Tus datos quedan guardados en este dispositivo.</p><p class="hint" style="margin:0">Tocá atrás otra vez para salir enseguida.</p>', '<button class="btn" data-act="closeModal">Quedarme</button><button class="btn primary" data-act="exitNow">Salir</button>');
  /* botón atrás del teléfono */
  A.navInit = () => {
    const CP = window.OV_NATIVE && window.Capacitor.Plugins;
    if (CP && CP.App && CP.App.addListener) { try { CP.App.addListener('backButton', () => A.back()); return; } catch (e) { A.logError('back', e); } }
    try {
      history.replaceState({ ov: 'base' }, '');
      history.pushState({ ov: 'trap' }, '');
      window.addEventListener('popstate', () => { if (NAV.exiting) return; A.back(); if (!NAV.exiting) { try { history.pushState({ ov: 'trap' }, ''); } catch (e) { /* nada */ } } });
    } catch (e) { /* el visor no permite historial: queda el botón atrás de la app */ }
  };
  window.addEventListener('resize', (() => { let last = A.isNarrow(), t = null; return () => { clearTimeout(t); t = setTimeout(() => { const n = A.isNarrow(); if (n !== last) { last = n; if (S.tab === 'ficha' && S.fichaTab === 'odon') A.refresh(); } }, 200); }; })());
  /* cerrar el menú «Más» de la agenda y recordar los desplegables */
  document.addEventListener('click', e => { if (S.agMore && !(e.target.closest && e.target.closest('.more-wrap .btn[data-act="agMore"]'))) { const inMenu = e.target.closest && e.target.closest('.more-menu'); S.agMore = false; const mm = $('.more-menu'); if (mm && !inMenu) { mm.remove(); } else if (inMenu) setTimeout(() => { const m2 = $('.more-menu'); if (m2) m2.remove(); }, 0); } }, true);
  document.addEventListener('toggle', e => { const d = e.target; if (d && d.matches && d.matches('details.pro-filter')) { if (d.getAttribute('data-key') === 'pros') S.proOpen = d.open; else S.legOpen = d.open; } }, true);

  /* barra superior, menú lateral y estado general después de cada cambio */
  const TITLES = { inicio: 'Inicio', agenda: 'Agenda', pacientes: 'Pacientes', caja: 'Caja', liq: 'Liquidaciones' };
  const SUBT = { datos: 'Datos e historia', odon: 'Odontograma', plan: 'Plan y presupuesto', hecho: 'Realizado', rx: 'Recetas', img: 'Imágenes', docs: 'Documentos y firmas', cuenta: 'Cuenta' };
  A.afterRefresh = () => {
    const mh = $('#modalHost'); if (!S.modal && mh && mh.innerHTML) A.renderModal(); /* algunas acciones cerraban la ventana sin quitarla de la pantalla */
    const t = $('#abTitle'), sb = $('#abSub');
    if (t) {
      if (S.tab === 'ficha' && S.fichaPid && A.PAT(S.fichaPid)) { t.textContent = A.PAT(S.fichaPid).name; sb.textContent = (S.visit && S.visit.pid === S.fichaPid ? 'Atención · ' : '') + (SUBT[S.fichaTab] || ''); }
      else if (S.tab === 'agenda' && S.uimode === 'atencion') { t.textContent = 'Mi día'; sb.textContent = A.PRO(A.isSolo() ? A.PROS[0].id : S.me).name; }
      else { t.textContent = TITLES[S.tab] || 'Odonto Voz'; sb.textContent = S.tab === 'inicio' ? A.CLINIC : ''; }
    }
    const bb = $('#abBack'); if (bb) bb.disabled = S.tab === 'inicio' && !S.panel && !S.modal && NAV.stack.length <= 1 && !drawerOpen();
    document.body.classList.toggle('on-odon', S.tab === 'ficha' && S.fichaTab === 'odon');
    A.$$('.dnav[data-tab]').forEach(b => { const tb = b.getAttribute('data-tab'); if (tb === S.tab || (S.tab === 'ficha' && tb === 'pacientes')) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    const dc = $('#drClinic'); if (dc) dc.textContent = A.CLINIC;
    const dm = $('#drMode'); if (dm) dm.innerHTML = '<button class="mode-chip' + (A.DEMO ? '' : ' real') + '" data-act="modeOpen">' + (A.DEMO ? '● Modo prueba · datos de ejemplo' : '● Uso real · tus datos') + '</button>';
    const dv = $('#drVer'); if (dv) dv.textContent = 'Odonto Voz ' + A.VERSION;
    V.ui();
  };
  /* reemplaza al ajuste de pantalla anterior (tipo de cuenta, modo atención/administración) */
  A.chromeExtra = () => {
    const b = document.body, solo = A.isSolo(), atn = S.uimode === 'atencion';
    b.classList.toggle('solo', solo); b.classList.toggle('uim-atn', atn);
    A.$$('[data-ui]').forEach(x => x.setAttribute('aria-pressed', String(x.getAttribute('data-ui') === S.uimode)));
    const me = $('#meSel'); if (me) me.innerHTML = A.PROS.map(p => '<option value="' + p.id + '"' + (p.id === S.me ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('');
    const cb = $('#cfgBtn .t'); if (cb) cb.textContent = solo ? 'Mi consultorio y horarios' : 'Centro, profesionales y horarios';
    const al = $('#acctLbl'); if (al) al.textContent = solo ? 'Consultorio individual' : 'Centro odontológico';
    if (S.tab === 'liq' && (solo || atn)) S.tab = 'inicio';
    if ((S.tab === 'caja' || S.tab === 'pacientes') && atn) S.tab = 'inicio';
  };

  /* =====================================================================
     INICIO: poca información, lo importante a mano
     ===================================================================== */
  A.render.inicio = () => {
    const host = $('#view-inicio'); if (!host) return;
    const t = A.today(), h = A.nowDate().getHours(), hi = h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
    const meP = A.isSolo() ? A.PROS[0] : (S.uimode === 'atencion' ? A.PRO(S.me) : null);
    const l = A.day(t).filter(a => a.type !== 'block' && a.status !== 'cancelado' && (!meP || a.pro === meP.id) && A.visPros().some(p => p.id === a.pro));
    const nx = A.nextUp(), done = l.filter(a => a.status === 'atendido').length, wait = l.filter(a => a.status === 'llego').length;
    const admin = S.uimode !== 'atencion';
    let o = '<div class="home">';
    if (A.DEMO) o += '<div class="demo-banner"><span>Modo prueba: los pacientes y turnos son de ejemplo, para mostrar la app.</span><button class="btn small" data-act="modeOpen">Empezar a usarla de verdad</button></div>';
    o += '<div class="home-hi"><h1>' + hi + (meP && !meP.blank ? ', ' + esc(meP.name) : '') + '</h1><p>' + esc(A.cap(A.fmtLong(t))) + ' · ' + esc(A.CLINIC) + '</p></div>';
    o += '<div class="home-now"><span class="lbl">' + (nx && (nx.status === 'en-atencion') ? 'En atención' : nx && nx.status === 'llego' ? 'En la sala de espera' : 'Próximo paciente') + '</span>';
    if (nx) {
      const p = A.PAT(nx.pid), al = S.role === 'profesional' ? A.alertsOf(nx.pid) : [];
      o += '<div class="hn-row"><span class="hn-time">' + A.mm(nx.start) + '</span><div class="hn-who"><b>' + esc(p.name) + '</b><span>' + esc(nx.what) + (A.isSolo() ? '' : ' · ' + esc(A.PRO(nx.pro).short)) + (al.length ? ' · ⚠ ' + esc(al.join(', ')) : '') + '</span></div>' +
        '<div class="row-btns">' + (nx.status === 'pendiente' || nx.status === 'confirmado' ? '<button class="btn" data-act="apStatus" data-id="' + nx.id + '" data-st="llego">Llegó</button>' : '') + (S.role === 'profesional' ? '<button class="btn primary" data-act="startAtn" data-pid="' + nx.pid + '" data-id="' + nx.id + '">Atender</button>' : '<button class="btn primary" data-act="openPat" data-pid="' + nx.pid + '">Ver paciente</button>') + '</div></div>';
    } else o += '<div class="hn-row"><div class="hn-who"><b>No quedan pacientes por atender hoy</b><span>' + (l.length ? l.length + ' turnos en el día, ' + done + ' atendidos.' : 'No hay turnos cargados para hoy.') + '</span></div><button class="btn primary" data-act="newAppt">+ Dar un turno</button></div>';
    o += '</div>';
    o += '<div class="home-stats"><button class="hs" data-act="tab" data-tab="agenda"><b>' + l.length + '</b><span>turnos hoy</span></button><button class="hs" data-act="tab" data-tab="agenda"><b>' + wait + '</b><span>en espera</span></button><button class="hs" data-act="tab" data-tab="agenda"><b>' + done + '</b><span>atendidos</span></button></div>';
    o += '<div class="home-actions">' +
      '<button class="ha" data-act="newAppt">' + IC.plus + '<span>Dar turno<small>Elegí paciente, día y hora</small></span></button>' +
      '<button class="ha" data-act="searchToggle">' + IC.search + '<span>Buscar paciente<small>Por nombre, apellido o DNI</small></span></button>' +
      '<button class="ha" data-act="tab" data-tab="agenda">' + IC.cal + '<span>Agenda<small>Deslizá entre los días</small></span></button>' +
      (admin ? '<button class="ha" data-act="tab" data-tab="pacientes">' + IC.users + '<span>Pacientes<small>Lista de la A a la Z</small></span></button>' : '<button class="ha" data-act="voiceToggle">' + IC.mic + '<span>Dictar<small>Manejá la app con la voz</small></span></button>') + '</div>';
    o += '<div class="home-voice"><b>' + IC.mic.replace('<svg', '<svg style="width:18px;height:18px;vertical-align:-3px;margin-right:6px"') + 'Manejala con la voz</b><span style="font-size:14px">Tocá el micrófono de abajo a la derecha y decí lo que necesitás. Probá tocando un ejemplo:</span><div class="chips-ex" style="margin:0">' +
      ['quién sigue', 'agenda de mañana', 'turno para ' + (A.PATS[0] ? A.PATS[0].last : 'Pérez') + ' mañana a las 10', 'cómo viene el día'].map(x => '<button class="chip-ex" data-act="cmdSay" data-say="' + esc(x) + '">«' + esc(x) + '»</button>').join('') +
      '</div><button class="btn small ghost" data-act="voiceHelp" style="align-self:flex-start">Ver todo lo que entiende</button></div>';
    host.innerHTML = o + '</div>';
  };

  /* =====================================================================
     FLUJO GUIADO DE LA ATENCIÓN
     ===================================================================== */
  const STEPS = [
    { k: 'recepcion', t: 'Recepción', tab: 'datos', hint: 'Confirmá los datos personales y la cobertura del paciente.' },
    { k: 'hc', t: 'Historia clínica', tab: 'datos', hint: 'Repasá antecedentes, medicación y alergias. Podés dictar: «agregá en la historia…».', act: ['hcConfirm', 'Confirmar datos al día'] },
    { k: 'odon', t: 'Odontograma', tab: 'odon', hint: 'Dictá lo que ves pieza por pieza o tocá las caras. El micrófono sigue escuchando hasta que lo apagás.' },
    { k: 'cons', t: 'Consentimiento', tab: 'docs', hint: 'Antes de un procedimiento con riesgo (extracción, endodoncia, implante), firmá el consentimiento.', act: ['consentPick', 'Elegir consentimiento'] },
    { k: 'plan', t: 'Plan de tratamiento', tab: 'plan', hint: 'Lo planificado en el odontograma ya aparece acá. Podés sumar prácticas del catálogo.', act: ['flowAddTx', '+ Agregar práctica'] },
    { k: 'pres', t: 'Presupuesto', tab: 'plan', hint: 'Armá el presupuesto del plan, con cuotas o seña si hace falta, y firmalo con el paciente.', act: ['budgetNew', 'Armar presupuesto'] },
    { k: 'cobro', t: 'Cobro', tab: 'cuenta', hint: 'Registrá lo que paga hoy: seña, cuota o tratamiento.', act: ['cobroNew', 'Registrar cobro'] },
    { k: 'turno', t: 'Próximo turno', tab: 'datos', hint: 'Dale el próximo turno antes de que se vaya.', act: ['flowAppt', 'Dar próximo turno'] }
  ];
  const fl = A.flow = {
    steps: STEPS,
    cur: () => STEPS[(S.visit && S.visit.step) || 0],
    go: i => {
      const v = S.visit; if (!v) return; v.step = Math.max(0, Math.min(STEPS.length - 1, i));
      A.stopOd && A.stopOd(); S.tab = 'ficha'; S.fichaPid = v.pid; S.panel = null;
      let tab = STEPS[v.step].tab; if (S.role !== 'profesional' && ['odon', 'plan', 'hecho'].indexOf(tab) >= 0) tab = 'datos';
      if (S.fichaTab !== tab || !S.od) { if (!S.od) S.od = A.newOd(null); }
      S.fichaTab = tab; A.refresh(); window.scrollTo(0, 0);
    },
    next: () => { const v = S.visit; if (!v) return; v.done[v.step] = true; if (v.step < STEPS.length - 1) fl.go(v.step + 1); else fl.finish(); },
    prev: () => { const v = S.visit; if (v && v.step > 0) fl.go(v.step - 1); },
    finish: () => {
      const v = S.visit; if (!v) return ''; const p = A.PAT(v.pid);
      const a = v.apptId ? A.apptById(v.apptId) : null; if (a && a.status !== 'atendido') A.setStatus(a.id, 'atendido');
      S.visit = null; A.goHome(); const msg = 'Atención de ' + p.name + ' terminada.'; A.toast(msg); return msg;
    }
  };
  A.acts.flowGo = el => fl.go(parseInt(el.getAttribute('data-i'), 10));
  A.acts.flowNext = () => fl.next();
  A.acts.flowPrev = () => fl.prev();
  A.acts.flowEnd = () => fl.finish();
  A.acts.flowAddTx = () => A.acts.addTx(fake({ 'data-mode': 'plan' }));
  A.acts.flowAppt = () => { const v = S.visit, p = A.PAT(v.pid); A.openNewAppt({ pid: v.pid, pro: p.pro, date: A.add(A.today(), 7) }); };
  function flowHTML() {
    const v = S.visit, st = STEPS[v.step], p = A.PAT(v.pid);
    return '<div class="flow" aria-label="Pasos de la atención"><div class="flow-top">' + IC.flow.replace('<svg', '<svg style="width:18px;height:18px;color:var(--accent)"') + '<b>Atención de ' + esc(p.first) + ' · paso ' + (v.step + 1) + ' de ' + STEPS.length + '</b><span class="sp"></span><button class="btn small" data-act="flowEnd">Terminar atención</button></div>' +
      '<div class="flow-steps">' + STEPS.map((s, i) => '<button class="flow-step' + (i === v.step ? ' on' : v.done[i] ? ' done' : '') + '" data-act="flowGo" data-i="' + i + '"' + (i === v.step ? ' aria-current="step"' : '') + '><i>' + (v.done[i] && i !== v.step ? '✓' : i + 1) + '</i>' + esc(s.t) + '</button>').join('') + '</div>' +
      '<div class="flow-hint">' + esc(st.hint) + '</div><div class="flow-nav">' + (v.step > 0 ? '<button class="btn small" data-act="flowPrev">‹ Anterior</button>' : '') + (st.act ? '<button class="btn small" data-act="' + st.act[0] + '">' + esc(st.act[1]) + '</button>' : '') +
      '<button class="btn small primary" data-act="flowNext">' + (v.step < STEPS.length - 1 ? 'Siguiente: ' + esc(STEPS[v.step + 1].t) + ' ›' : 'Terminar atención ✓') + '</button></div></div>';
  }
  const origFicha = A.render.ficha;
  A.render.ficha = () => { origFicha(); if (S.visit && S.visit.pid === S.fichaPid) { const body = $('#fichaBody'); if (body) body.insertAdjacentHTML('beforebegin', flowHTML()); } };
  const origStart = A.acts.startAtn;
  A.acts.startAtn = el => {
    const pid = el.getAttribute('data-pid'); let id = el.getAttribute('data-id');
    if (!id) { const a = todayAppt(pid); if (a) id = a.id; }
    origStart(fake({ 'data-pid': pid, 'data-id': id }));
    S.visit = { pid, apptId: id || null, step: 0, done: {} };
    fl.go(0);
  };

  /* =====================================================================
     TUTORIAL, COMANDOS DE VOZ, SOPORTE, MODO PRUEBA / REAL, APARIENCIA
     ===================================================================== */
  const TUT = () => [
    [IC.tooth, 'Bienvenido a Odonto Voz', 'En un minuto te muestro cómo se usa. Podés saltearlo y verlo cuando quieras desde el menú, en «Tutorial de uso».'],
    [IC.menu, 'Menú, inicio y volver', 'Arriba a la izquierda: la flecha vuelve a la pantalla anterior (también el botón atrás del teléfono), el ☰ abre el menú con todas las secciones y la casita te lleva al inicio.'],
    [IC.mic, 'La voz, siempre a mano', 'El botón redondo de abajo a la derecha escucha y hace lo que pedís: «turno para Pérez mañana a las 10», «abrí la ficha de Gómez», «caries oclusal del 36». Sigue escuchando hasta que lo tocás de nuevo o decís «terminar dictado».'],
    [IC.hf, 'Manos libres', 'Con «Manos libres» activo, la app espera que digas «odontovoz» antes de cada pedido. Ideal para atender con guantes sin tocar la pantalla.'],
    [IC.cal, 'Agenda', 'Deslizá los días hacia los costados. «+ Turno» da un turno; en «Más» están el sobreturno, los bloqueos y los recordatorios por WhatsApp.'],
    [IC.flow, 'La atención, paso a paso', 'Al tocar «Atender», la ficha te guía en orden: recepción, historia clínica, odontograma, consentimiento, plan, presupuesto, cobro y próximo turno. Decí «siguiente paso» para avanzar.'],
    [IC.flask, A.DEMO ? 'Modo prueba y uso real' : 'Tus datos', A.DEMO ? 'Ahora estás en modo prueba, con pacientes de ejemplo para mostrar la app. Cuando quieras empezar con tus datos, entrá al menú → «Modo prueba y uso real».' : 'Estás usando la app con tus datos reales. Hacé una copia de seguridad seguido desde el menú → «Copia de seguridad».']
  ];
  A.openTutorial = () => { A.hideDrawer(); S.modal = { type: 'tutorial', i: 0 }; A.renderModal(); };
  A.acts.tutorialOpen = () => A.openTutorial();
  MF.tutorial = m => {
    const steps = TUT(), s = steps[m.i], last = m.i === steps.length - 1;
    return A.modalShell('Tutorial de uso', '<div class="tut"><span class="tut-ico">' + s[0] + '</span><h3>' + esc(s[1]) + '</h3><p>' + esc(s[2]) + '</p><div class="tut-dots" aria-label="Paso ' + (m.i + 1) + ' de ' + steps.length + '">' + steps.map((x, i) => '<i class="' + (i === m.i ? 'on' : '') + '"></i>').join('') + '</div></div>',
      '<button class="btn" data-act="tutSkip">' + (last ? 'Cerrar' : 'Saltear') + '</button>' + (m.i > 0 ? '<button class="btn" data-act="tutPrev">Anterior</button>' : '') + '<button class="btn primary" data-act="' + (last ? 'tutSkip' : 'tutNext') + '">' + (last ? 'Empezar' : 'Siguiente') + '</button>');
  };
  A.acts.tutNext = () => { S.modal.i++; A.renderModal(); };
  A.acts.tutPrev = () => { S.modal.i = Math.max(0, S.modal.i - 1); A.renderModal(); };
  A.acts.tutSkip = () => { S.tutorialSeen = true; A.save(); A.closeModal(); A.afterRefresh(); };

  const CMDS = [
    ['Navegar', ['inicio', 'abrí la agenda', 'agenda de mañana', 'agenda del lunes', 'la semana que viene', 'pacientes', 'mostrame la caja', 'volver', 'abrí el menú']],
    ['Turnos', ['turno para Pérez mañana a las 10', 'agendame a Gómez el 15 a las 9 para limpieza', 'sobreturno para Ríos hoy a las 11 por dolor', 'confirmá el turno de Sosa', 'cancelá el turno de Paz', 'Quiroga no vino']],
    ['Atención', ['llegó Benítez', 'quién sigue', 'atender al siguiente', 'atender a Lucía Benítez', 'siguiente paso', 'terminar la atención', 'cómo viene el día']],
    ['Pacientes', ['abrí a Lucía Benítez', 'traeme la ficha de Quiroga', 'odontograma de Ortega', 'nuevo paciente Juan Pérez', 'cuánto debe Benítez']],
    ['Odontograma (con la ficha abierta)', ['caries oclusal del 35', 'mesio ocluso distal en el 46 composite realizado', 'ausente el 48', 'del 14 al 17 ausentes', 'planificado extracción del 38', 'corona en el 11', 'deshacer']],
    ['Historia, plan y cobros', ['agregá en la historia antecedentes de conducto en el 46', 'hoy hice limpieza y control', 'consentimiento de extracción', 'armá el presupuesto', 'recetale amoxicilina', 'cobrale 20 mil en efectivo', 'me pagó 15 lucas por transferencia']],
    ['En ventanas abiertas', ['guardar · agendar · confirmar · dale', 'cancelar · no · cerrar']],
    ['La voz', ['terminar dictado · basta · chau', 'activá manos libres', 'modo atención · modo administración', 'tema oscuro']]
  ];
  A.acts.voiceHelp = () => { A.hideDrawer(); S.modal = { type: 'voiceHelp' }; A.renderModal(); };
  MF.voiceHelp = m => A.modalShell('Qué le puedo decir', (m.blocked || !V.supported() ? '<div class="legal"><b>El micrófono no está disponible en esta vista.</b> Funciona en la app instalada (APK) y en Chrome. Mientras tanto, podés escribir el mismo comando acá abajo.</div>' : '<p class="hint" style="margin:0">Hablá normal, como le hablarías a una asistente. No hace falta decir las cosas exactas: entiende muchas formas de decirlo («dale un turno», «agendame», «poneme un turno»…). Tocá un ejemplo para probarlo.</p>') +
    '<form data-sub="cmdForm2" class="cmdbar"><label class="sr" for="cmdIn2">Comando</label><input id="cmdIn2" autocomplete="off" placeholder="Escribí un comando, por ejemplo: quién sigue"><button class="btn primary" type="submit">Hacer</button></form><div id="cmdOut" class="hint"></div>' +
    '<div class="cmd-list">' + CMDS.map(g => '<div class="cmd-group"><h3>' + esc(g[0]) + '</h3><ul>' + g[1].map(x => '<li>' + (x.indexOf('·') < 0 ? '<button class="link" data-act="cmdSayH" data-say="' + esc(x) + '">«' + esc(x) + '»</button>' : '«' + esc(x) + '»') + '</li>').join('') + '</ul></div>').join('') + '</div>' +
    '<div class="block"><h3>Manos libres</h3><div class="hint" style="margin:0">Activalo con el botón «Manos libres» (al lado del micrófono). Después decí «odontovoz» y el pedido: «odontovoz, quién sigue». Si decís solo «odontovoz», espera tu pedido unos segundos. Responde en voz alta. Funciona con la app abierta y la pantalla encendida.</div>' +
    '<label class="chk" style="margin-top:6px"><input type="checkbox" data-chg="ttsSet"' + (V.tts ? ' checked' : '') + '> Responder en voz alta en manos libres</label></div>', '<button class="btn primary" data-act="closeModal">Entendido</button>', true);
  A.acts.cmdSayH = el => { const r = A.cmd.exec(el.getAttribute('data-say'), {}); if (S.modal && S.modal.type === 'voiceHelp') { const o = $('#cmdOut'); if (o) o.textContent = r.msg || ''; } else if (r.msg) A.toast(r.msg); };
  A.chg.ttsSet = el => { V.tts = el.checked; try { localStorage.setItem('odontovoz.tts', el.checked ? '1' : '0'); } catch (e) { /* nada */ } };

  A.SUPPORT = A.SUPPORT || { whatsapp: '', email: '' };
  const FAQ = [
    ['El micrófono no anda', 'En la app instalada, aceptá el permiso de micrófono (Ajustes del teléfono → Apps → Odonto Voz → Permisos). En la computadora usá Chrome. En la vista previa dentro de Claude el micrófono está bloqueado.'],
    ['El dictado se corta', 'El micrófono sigue escuchando hasta que lo apagás. Si el teléfono bloquea la pantalla, se detiene: dejá la pantalla encendida mientras atendés.'],
    ['¿Dónde quedan mis datos?', 'Por ahora, en este dispositivo. Hacé copias seguido desde el menú → «Copia de seguridad». La copia automática en la nube viene en la próxima versión.'],
    ['Cambié de teléfono', 'En el teléfono viejo: menú → Copia de seguridad → Descargar. En el nuevo: instalá la app y usá «Restaurar desde una copia».'],
    ['¿Cómo empiezo con mis pacientes reales?', 'Menú → «Modo prueba y uso real» → «Empezar a usarla de verdad». Los datos de ejemplo quedan aparte para mostrarle la app a otros colegas.']
  ];
  A.acts.supportOpen = () => { A.hideDrawer(); S.modal = { type: 'support' }; A.renderModal(); };
  A.supportReport = () => {
    let errs = []; try { errs = JSON.parse(localStorage.getItem(ERRK) || '[]'); } catch (e) { /* nada */ }
    return 'Odonto Voz ' + A.VERSION + ' · ' + (A.DEMO ? 'modo prueba' : 'uso real') + ' · ' + (A.isSolo() ? 'consultorio' : 'centro') + '\n' + (window.OV_NATIVE ? 'App Android' : (standalone() ? 'App instalada (web)' : 'Navegador')) + ' · ' + navigator.userAgent.slice(0, 140) + '\nVoz: ' + (V.supported() ? 'disponible' : 'no disponible') + ' · Guardado: ' + (A.saveOk === false ? 'con problemas' : 'bien') + '\nPacientes: ' + A.PATS.length + ' · Profesionales: ' + A.PROS.length +
      '\nÚltimos errores:\n' + (errs.length ? errs.slice(-8).map(e => e.t.slice(0, 16).replace('T', ' ') + ' ' + e.k + ': ' + e.m.split('\n')[0]).join('\n') : 'ninguno');
  };
  MF.support = () => {
    const s = A.SUPPORT, rep = A.supportReport();
    return A.modalShell('Ayuda y soporte', '<div class="cmd-list">' + FAQ.map(f => '<details class="block"><summary style="cursor:pointer;font-weight:700">' + esc(f[0]) + '</summary><p class="hint" style="margin:6px 0 0">' + esc(f[1]) + '</p></details>').join('') + '</div>' +
      '<div class="block"><h3>Contactar al soporte</h3>' + (s.whatsapp || s.email ? '<div class="row-btns">' + (s.whatsapp ? '<a class="btn" target="_blank" rel="noopener" href="https://wa.me/' + esc(s.whatsapp.replace(/\D/g, '')) + '?text=' + encodeURIComponent('Hola, necesito ayuda con Odonto Voz.\n\n' + rep) + '">WhatsApp de soporte</a><span class="mono hint">' + esc(s.whatsapp) + '</span>' : '') + (s.email ? '<span class="mono hint">' + esc(s.email) + '</span>' : '') + '</div>' : '<div class="hint" style="margin:0">El contacto de soporte se configura al publicar la app.</div>') +
      '<div class="hint">Si algo falla, copiá este informe y mandalo al soporte: ayuda a encontrar el problema. No incluye datos de pacientes.</div><textarea id="supRep" class="inp" rows="6" readonly>' + esc(rep) + '</textarea><div class="row-btns"><button class="btn" data-act="copyText" data-text="' + esc(rep) + '">Copiar informe</button></div></div>' +
      '<div class="small-note">Odonto Voz ' + esc(A.VERSION) + '</div>', '<button class="btn primary" data-act="closeModal">Listo</button>', true);
  };

  A.acts.modeOpen = () => { A.hideDrawer(); S.modal = { type: 'modeSel', step: 0 }; A.renderModal(); };
  MF.modeSel = m => {
    let body, foot = '<button class="btn" data-act="closeModal">Cerrar</button>';
    if (m.step === 'real') {
      body = '<p style="margin:0">Se abre la app <b>vacía</b>, sin pacientes ni turnos de ejemplo, lista para cargar tus datos reales.</p><ul class="plain"><li>Te va a pedir una sola vez si sos un consultorio o un centro.</li><li>Los datos de ejemplo quedan guardados aparte: podés volver al modo prueba para mostrarle la app a un colega, sin mezclar nada.</li></ul>';
      foot = '<button class="btn" data-act="modeBack">Volver</button><button class="btn primary" data-act="modeGo" data-m="real">Empezar con mis datos</button>';
    } else if (m.step === 'factory') {
      body = '<div class="legal"><b>Esto borra todos tus datos reales de este dispositivo</b>: pacientes, turnos, historias, firmas, imágenes y caja. No se puede deshacer.</div><p style="margin:0">Antes, descargá una copia de seguridad por las dudas.</p><div class="row-btns"><button class="btn" data-act="cfgBackup">Descargar copia de seguridad</button></div><div class="field"><label for="facTxt">Para confirmar, escribí BORRAR</label><input id="facTxt" class="inp" autocomplete="off" data-in="facChk"></div>';
      foot = '<button class="btn" data-act="modeBack">Volver</button><button class="btn danger" id="facGo" data-act="factoryGo" disabled>Borrar todo y empezar de cero</button>';
    } else if (m.step === 'demoReset') {
      body = '<p style="margin:0">Se vuelven a cargar los pacientes y turnos de ejemplo como estaban al principio. Tus datos reales no se tocan.</p>';
      foot = '<button class="btn" data-act="modeBack">Volver</button><button class="btn primary" data-act="demoResetGo">Restablecer el modo prueba</button>';
    } else if (A.DEMO) {
      body = '<div class="demo-banner"><span>Estás en <b>modo prueba</b>: pacientes y turnos de ejemplo para mostrar la app.</span></div>' +
        '<div class="setup-grid"><button class="setup-card" data-act="modeStep" data-s="real"><b>Empezar a usarla de verdad</b><span>Abre la app vacía para cargar tus pacientes reales.</span></button>' +
        '<button class="setup-card" data-act="modeStep" data-s="demoReset"><b>Restablecer el modo prueba</b><span>Deja los datos de ejemplo como al principio, para una nueva presentación.</span></button></div>' +
        (A.hasReal() ? '<p class="hint">Ya tenés datos reales guardados en este dispositivo: «Empezar a usarla de verdad» los vuelve a abrir.</p>' : '');
    } else {
      body = '<div class="demo-banner" style="background:var(--ok-soft);color:var(--ok)"><span>Estás usando la app con <b>tus datos reales</b>.</span></div>' +
        '<div class="setup-grid"><button class="setup-card" data-act="modeGo" data-m="demo"><b>Mostrar el modo prueba</b><span>Para presentarle la app a otro odontólogo con datos de ejemplo. Tus datos quedan guardados y volvés cuando quieras.</span></button>' +
        '<button class="setup-card" data-act="modeStep" data-s="factory"><b>Reiniciar de fábrica</b><span>Borra todos tus datos reales y deja la app vacía.</span></button></div>';
    }
    return A.modalShell('Modo prueba y uso real', body, foot, true);
  };
  A.hasReal = () => { try { return !!localStorage.getItem('odontovoz.real.v1'); } catch (e) { return false; } };
  A.acts.modeStep = el => { S.modal.step = el.getAttribute('data-s'); A.renderModal(); };
  A.acts.modeBack = () => { S.modal.step = 0; A.renderModal(); };
  A.acts.modeGo = el => { V.stop(); A.setMode(el.getAttribute('data-m')); A.toast('Cambiando de modo…'); };
  A.ins.facChk = el => { const b = $('#facGo'); if (b) b.disabled = el.value.trim().toUpperCase() !== 'BORRAR'; };
  A.acts.factoryGo = () => { const v = ($('#facTxt') || {}).value || ''; if (v.trim().toUpperCase() !== 'BORRAR') return; V.stop(); A.factoryReset(); };
  A.acts.demoResetGo = () => { A.closeModal(); A.acts.resetDemo(); };

  A.acts.appearOpen = () => { A.hideDrawer(); S.modal = { type: 'appear' }; A.renderModal(); };
  MF.appear = () => A.modalShell('Apariencia', '<div class="opt"><div class="lbl">Tema</div><div class="seg" role="group" aria-label="Tema"><button data-act="themeSet" data-theme-set="" aria-pressed="' + (S.theme === '') + '">Automático</button><button data-act="themeSet" data-theme-set="light" aria-pressed="' + (S.theme === 'light') + '">Claro</button><button data-act="themeSet" data-theme-set="dark" aria-pressed="' + (S.theme === 'dark') + '">Oscuro</button></div></div>' +
    '<div class="opt" style="margin-top:12px"><div class="lbl">Colores del odontograma</div><div class="seg" role="group" aria-label="Colores del odontograma"><button data-act="convSet" data-conv="" aria-pressed="' + (S.conv === '') + '">Azul a realizar · rojo realizado</button><button data-act="convSet" data-conv="classic" aria-pressed="' + (S.conv === 'classic') + '">Clásico (invertido)</button></div></div>',
    '<button class="btn primary" data-act="closeModal">Listo</button>');
  const origTheme = A.acts.themeSet, origConv = A.acts.convSet;
  A.acts.themeSet = el => { origTheme(el); if (S.modal && S.modal.type === 'appear') A.renderModal(); };
  A.acts.convSet = el => { origConv(el); if (S.modal && S.modal.type === 'appear') A.renderModal(); };

  /* configuración inicial: se pide una sola vez y queda guardada enseguida */
  const origSetupGo = A.acts.setupGo;
  A.acts.setupGo = () => {
    const first = !S.setup, f = (S.modal && S.modal.f) || {};
    origSetupGo();
    if (!S.setup) return;
    if (!A.DEMO && S.setup.type === 'centro' && f.proName && A.PROS[0] && A.PROS[0].blank && A.PROS[0].name === 'Profesional') { A.PROS[0].name = f.proName; const w = f.proName.replace(/^(Dra?\.)\s*/i, '').split(/\s+/); A.PROS[0].short = w[w.length - 1] || f.proName; A.PROS[0].custom = true; }
    if (!A.DEMO && S.setup.type === 'solo' && f.proName && A.PROS[0]) { A.PROS[0].name = f.proName; const w = f.proName.replace(/^(Dra?\.)\s*/i, '').split(/\s+/); A.PROS[0].short = w[w.length - 1] || f.proName; A.PROS[0].custom = true; }
    S.tab = 'inicio'; A.saveNow(); A.refresh();
    if (first && !S.tutorialSeen) setTimeout(() => A.openTutorial(), 250);
  };
})();
