/* ===== 1.39: Secretaria virtual por WhatsApp (servicio aparte): conversaciones, configuración, prueba y recordatorios automáticos ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, CL = A.cloud;
  const real = () => !!(CL && CL.session && CL.conf && CL.conf() && !A.DEMO);
  const N = s => A.norm(String(s || ''));
  const ARS = usd => A.DOLAR ? ' (≈ $' + Math.round(usd * A.DOLAR).toLocaleString('es-AR') + ')' : '';

  /* ---------- planes del servicio (mantener igual en sitio/index.html, terminos.html y admin.html) ---------- */
  const PLANS = A.WA_PLANS = {
    wa1: { name: 'Secretaria Profesional', usd: 29, quota: 100, for: 'Un profesional' },
    wa2: { name: 'Secretaria Consultorio', usd: 49, quota: 300, for: 'Consultorio con varios profesionales' },
    wa3: { name: 'Secretaria Centro', usd: 89, quota: 800, for: 'Centros y empresas' }
  };
  const EXTRA = { usd: 10, n: 100 };
  const cfg = () => { const c = A.CFG.waBot || (A.CFG.waBot = {}); if (c.on == null) Object.assign(c, { on: true, book: true, botName: 'Sofi', info: '', rem: true, remWhen: 'dia', remAt: 10, maxDay: 150 }); return c; };

  /* ---------- estado ---------- */
  const W = S.wa || (S.wa = { me: undefined, chats: [], msgs: {}, err: '', busy: false, at: 0 });
  async function loadMe() {
    if (!real()) { W.me = null; return; }
    try { W.me = await CL.api('/rest/v1/rpc/ov_wa_me', { method: 'POST', body: {} }) || null; W.err = ''; }
    catch (e) { W.me = null; W.err = /does not exist|schema cache|404/.test(String(e && e.message)) ? 'notables' : ''; }
  }
  async function loadChats() {
    if (!W.me) return;
    try { W.chats = await CL.api('/rest/v1/ov_wa_chats?select=*&order=last_at.desc&limit=60') || []; } catch (e) { /* nada */ }
  }
  async function loadMsgs(id) {
    try { W.msgs[id] = await CL.api('/rest/v1/ov_wa_msgs?chat=eq.' + id + '&select=dir,who,body,created_at,status&order=created_at.asc&limit=200') || []; } catch (e) { /* nada */ }
  }
  const active = () => W.me && W.me.status === 'activo';

  /* ---------- charlas de ejemplo (modo prueba o sin el servicio) ---------- */
  const ago = m => new Date(Date.now() - m * 60000).toISOString();
  const DEMO_CHATS = [
    { id: 'd1', wa_id: '5492994123456', name: 'Ana Pérez', mode: 'bot', last_text: 'Listo, pedí tu turno para el martes 10:00 (OV-K7P2).', last_at: ago(8), last_in: ago(9), unread: 0 },
    { id: 'd2', wa_id: '5492994555111', name: 'Jorge Díaz', mode: 'humano', need: 'Quiere hablar de un pago', last_text: 'Te paso con alguien del consultorio.', last_at: ago(25), last_in: ago(26), unread: 2 },
    { id: 'd3', wa_id: '5492995222333', name: 'Lucía Gómez', mode: 'bot', last_text: '¡Gracias por confirmar! Te esperamos. 😊', last_at: ago(95), last_in: ago(96), unread: 0 }
  ];
  const DEMO_MSGS = {
    d1: [['in', 'paciente', 'Hola! quería un turno para control, a la mañana si puede ser'], ['out', 'bot', '¡Hola Ana! Soy Sofi, la asistente virtual del consultorio 😊 Si preferís, te paso con una persona. Para control tengo: martes 10:00, martes 10:30 o miércoles 9:30. ¿Cuál te queda mejor?'], ['in', 'paciente', 'el martes 10'], ['out', 'bot', 'Perfecto. ¿Me pasás tu nombre, apellido, DNI y obra social?'], ['in', 'paciente', 'Ana Pérez 30123456 OSDE'], ['out', 'bot', 'Listo, pedí tu turno para el martes 10:00 (OV-K7P2). El consultorio te lo confirma por acá.']],
    d2: [['in', 'paciente', 'Buenas, me cobraron dos veces la última sesión'], ['out', 'bot', 'Hola Jorge, soy Sofi, la asistente virtual. Eso lo tiene que ver una persona del consultorio: te paso con alguien.'], ['in', 'paciente', 'dale gracias'], ['in', 'paciente', '?']],
    d3: [['out', 'sistema', 'Hola Lucía, te recordamos tu turno en el consultorio el jueves 12 de noviembre a las 17:00 con Dra. Vega. ¿Nos confirmás? [Confirmo] [Necesito cambiarlo]'], ['in', 'paciente', 'Confirmo'], ['out', 'sistema', '¡Gracias por confirmar! Te esperamos. 😊']]
  };
  const chats = () => W.me ? W.chats : DEMO_CHATS;
  const msgsOf = id => W.me ? (W.msgs[id] || []) : (DEMO_MSGS[id] || []).map(x => ({ dir: x[0], who: x[1], body: x[2] }));
  const patOf = waId => (A.PATS || []).find(p => p.phone && A.waNumber && A.waNumber(p.phone) === waId);
  const when = iso => { if (!iso) return ''; const d = new Date(iso), m = (Date.now() - d) / 60000; return m < 1 ? 'recién' : m < 60 ? 'hace ' + Math.round(m) + ' min' : m < 1440 ? A.pad(d.getHours()) + ':' + A.pad(d.getMinutes()) : d.getDate() + '/' + (d.getMonth() + 1); };
  const open24 = c => c.last_in && Date.now() - Date.parse(c.last_in) < 24 * 3600e3;
  const waiting = () => chats().filter(c => c.mode === 'humano' && (c.unread || c.need)).length;

  /* ---------- pantalla ---------- */
  A.acts.waOpen = el => {
    if (A.hideDrawer) A.hideDrawer();
    S.waTab = (el && el.getAttribute && el.getAttribute('data-t')) || S.waTab || 'inicio'; S.waChat = (el && el.getAttribute && el.getAttribute('data-chat')) || null;
    S.modal = { type: 'wa' }; A.renderModal();
    loadMe().then(() => loadChats()).then(() => { if (S.modal && S.modal.type === 'wa') { if (S.waChat && W.me) loadMsgs(S.waChat).then(() => A.renderModal()); else A.renderModal(); } });
  };
  A.acts.waTab = el => { S.waTab = el.getAttribute('data-t'); S.waChat = null; A.renderModal(); if (S.waTab === 'charlas') loadChats().then(() => A.renderModal()); };
  A.acts.waChatOpen = el => {
    S.waChat = el.getAttribute('data-chat'); A.renderModal();
    if (W.me) { loadMsgs(S.waChat).then(() => A.renderModal()); CL.api('/rest/v1/rpc/ov_wa_take', { method: 'POST', body: { p_chat: S.waChat, p_mode: 'leido' } }).catch(() => { }); const c = W.chats.find(x => x.id === S.waChat); if (c) c.unread = 0; }
  };
  A.acts.waBack = () => { S.waChat = null; A.renderModal(); };

  function tabsHTML(t) {
    const n = waiting();
    return '<div class="wa-tabs" role="tablist">' + [['inicio', 'Inicio'], ['charlas', 'Charlas' + (n ? ' <span class="wa-dot">' + n + '</span>' : '')], ['config', 'Configurar'], ['probar', 'Probala']].map(x => '<button role="tab" aria-selected="' + (t === x[0]) + '" data-act="waTab" data-t="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
  }
  const SAFE = '<div class="wa-safe"><h4>Cómo cuidamos tu número</h4><ul>' +
    '<li>Canal <b>oficial</b> de WhatsApp para empresas (Meta). Nada de programas «truchos».</li>' +
    '<li>Solo responde a quien te escribe y solo habla de tu consultorio.</li>' +
    '<li>Recordatorios solo de turnos, de 9 a 20 h y con tope por día. Nunca promociones.</li>' +
    '<li>Cada recordatorio dice cómo darse de baja; con «BAJA» no recibe más.</li>' +
    '<li>Si WhatsApp baja la calidad del número, los recordatorios se frenan solos.</li>' +
    '<li>Se presenta como asistente virtual y te pasa la charla cuando hace falta.</li></ul></div>';

  function homeHTML() {
    if (W.err === 'notables') return '<div class="wa-card warn"><b>Falta preparar la base de datos.</b><p>Hay que correr <code>supabase/whatsapp.sql</code> en Supabase (lo hace ROAN).</p></div>';
    if (!W.me) {
      const plans = Object.keys(PLANS).map(k => { const p = PLANS[k]; return '<div class="wa-plan"><b>' + esc(p.name) + '</b><small>' + esc(p.for) + '</small><div class="wa-price">USD ' + p.usd + '<span>/mes</span></div><small>' + ARS(p.usd).replace(/[()]/g, '').trim() + '</small><small>' + p.quota + ' charlas por mes</small><button class="btn primary" data-act="waBuy" data-p="' + k + '">La quiero</button></div>'; }).join('');
      return '<div class="wa-hero"><div class="wa-hero-ic">' + WA_IC + '</div><div><h3>Tu secretaria por WhatsApp, las 24 horas</h3><p>Contesta a tus pacientes desde el WhatsApp del consultorio, les da turno con los horarios libres de tu agenda y les manda el recordatorio con un botón para confirmar. Cuando hace falta, te pasa la charla.</p></div></div>' +
        '<div class="wa-feats">' + [['Da turnos', 'Ofrece horarios reales y el turno entra solo a tu agenda.'], ['Responde dudas', 'Dirección, obras sociales, precios: lo que vos le cargues.'], ['Recordatorios con «Confirmo»', 'Salen solos el día anterior y la agenda se marca sola.'], ['Vos seguís a cargo', 'Ves todas las charlas y tomás la que quieras.']].map(f => '<div><b>' + f[0] + '</b><small>' + f[1] + '</small></div>').join('') + '</div>' +
        '<button class="btn wa-try" data-act="waTab" data-t="probar">▶ ' + (real() ? 'Probala gratis con tu agenda' : 'Probala ahora (simulación)') + '</button>' +
        '<h4 class="wa-h">Planes · se suma a tu plan de OdontoVoz</h4><div class="wa-plans">' + plans + '</div>' +
        '<p class="hint">Charla = una conversación con un paciente en 24 horas, con todos sus mensajes. Si te pasás, se suman ' + EXTRA.n + ' charlas por USD ' + EXTRA.usd + ' o las atiende una persona. Incluye la conexión de tu número: te ayudamos a hacerlo en una videollamada corta.</p>' + SAFE;
    }
    const w = W.me, p = PLANS[w.plan] || { name: w.plan, quota: w.quota }, pct = Math.min(100, Math.round((w.used || 0) / (w.quota || 1) * 100));
    const st = { activo: ['ok', 'Activa'], pendiente: ['wait', 'Conectando tu número'], pausado: ['warn', 'Pausada'], baja: ['warn', 'Dada de baja'] }[w.status] || ['wait', w.status];
    const q = { GREEN: ['ok', 'Buena'], YELLOW: ['warn', 'Regular: conviene mandar menos mensajes'], RED: ['bad', 'Baja: se frenaron los recordatorios'] }[String(w.quality || '').toUpperCase()];
    const c = cfg();
    return '<div class="wa-card"><div class="wa-row"><span class="wa-st ' + st[0] + '">' + st[1] + '</span><b>' + esc(p.name) + '</b></div>' +
      (w.display ? '<p>Número: <b>' + esc(w.display) + '</b></p>' : '<p class="hint">Todavía falta conectar el número. Te escribimos para hacerlo juntos.</p>') +
      '<div class="wa-use"><div><span>Charlas este mes</span><b>' + (w.period === new Date().toISOString().slice(0, 7) ? w.used || 0 : 0) + ' de ' + (w.quota || p.quota) + '</b></div><div class="wa-bar"><i style="width:' + pct + '%"></i></div></div>' +
      (q ? '<p>Calidad del número según WhatsApp: <span class="wa-st ' + q[0] + '">' + q[1] + '</span></p>' : '') +
      '<p>Recordatorios automáticos: <b>' + (w.out_paused ? 'frenados' : c.rem === false ? 'apagados' : 'encendidos') + '</b> ' + (w.out_paused ? '<button class="btn small" data-act="waPause" data-v="0">Reanudar</button>' : c.rem !== false ? '<button class="btn small" data-act="waPause" data-v="1">Frenar</button>' : '') + '</p>' +
      (waiting() ? '<button class="btn primary" data-act="waTab" data-t="charlas">' + waiting() + ' charla(s) esperan una persona ›</button>' : '') + '</div>' + SAFE +
      '<p class="hint">¿Querés más charlas o cambiar de plan? <button class="btn small" data-act="waBuy" data-p="mas">Escribinos</button></p>';
  }

  function chatsHTML() {
    const l = chats();
    if (S.waChat) return chatHTML(l.find(c => c.id === S.waChat));
    return (W.me ? '' : '<p class="wa-demo">Así se ven las charlas (ejemplo).</p>') +
      (l.length ? '<ul class="wa-list">' + l.map(c => {
        const p = patOf(c.wa_id);
        return '<li><button data-act="waChatOpen" data-chat="' + esc(c.id) + '"><span class="wa-av">' + esc(((p && p.name) || c.name || '?').charAt(0).toUpperCase()) + '</span><span class="wa-li"><b>' + esc((p && p.name) || c.name || ('+' + c.wa_id)) + '</b><small>' + esc(c.last_text || '') + '</small></span><span class="wa-meta"><small>' + when(c.last_at) + '</small>' +
          (c.mode === 'humano' ? '<span class="wa-tag hum">' + (c.need ? 'Te necesita' : 'Persona') + '</span>' : '<span class="wa-tag">Asistente</span>') + (c.unread ? '<span class="wa-dot">' + c.unread + '</span>' : '') + '</span></button></li>';
      }).join('') + '</ul>' : '<p class="hint">Todavía no hay charlas. Cuando un paciente escriba al WhatsApp del consultorio, aparece acá.</p>');
  }
  function chatHTML(c) {
    if (!c) return '<p class="hint">No encontré la charla.</p>';
    const p = patOf(c.wa_id), ms = msgsOf(c.id), op = open24(c);
    return '<div class="wa-chead"><button class="btn small" data-act="waBack">‹ Charlas</button><div><b>' + esc((p && p.name) || c.name || '+' + c.wa_id) + '</b><small>+' + esc(c.wa_id) + (c.opt_out ? ' · pidió BAJA' : '') + '</small></div>' + (p ? '<button class="btn small" data-act="openFicha" data-pid="' + p.id + '">Ficha</button>' : '') + '</div>' +
      (c.need ? '<div class="wa-need">⚑ ' + esc(c.need) + '</div>' : '') +
      '<div class="wa-msgs" id="waMsgs">' + ms.map(m => '<div class="wa-b ' + (m.dir === 'in' ? 'in' : 'out ' + m.who) + '">' + (m.dir === 'out' ? '<small>' + ({ bot: 'Asistente', persona: 'Consultorio', sistema: 'Automático' }[m.who] || '') + '</small>' : '') + esc(m.body).replace(/\n/g, '<br>') + (m.created_at ? '<i>' + when(m.created_at) + (m.status === 'failed' ? ' · no salió' : '') + '</i>' : '') + '</div>').join('') + '</div>' +
      '<div class="wa-ctl">' + (c.mode === 'humano' ? '<span>La atiende una persona.</span><button class="btn small" data-act="waMode" data-v="bot">Devolver al asistente</button>' : '<span>La atiende el asistente.</span><button class="btn small" data-act="waMode" data-v="humano">Tomar la charla</button>') + '</div>' +
      (op ? '<div class="wa-reply"><label class="sr" for="waTxt">Responder</label><textarea id="waTxt" rows="2" placeholder="Escribí tu respuesta…"></textarea><button class="btn primary" data-act="waSend">Enviar</button></div>'
        : '<p class="hint">Pasaron más de 24 horas desde el último mensaje del paciente: WhatsApp no deja escribirle primero desde acá. Esperá a que escriba o llamalo.</p>');
  }
  A.acts.waMode = async el => {
    const v = el.getAttribute('data-v'), c = chats().find(x => x.id === S.waChat); if (!c) return;
    if (W.me) { try { await CL.api('/rest/v1/rpc/ov_wa_take', { method: 'POST', body: { p_chat: c.id, p_mode: v } }); } catch (e) { A.toast('No se pudo. Revisá la conexión.'); return; } }
    c.mode = v; if (v === 'bot') c.need = null; A.renderModal();
    A.toast(v === 'bot' ? 'El asistente sigue la charla.' : 'Listo: la charla es tuya; el asistente no responde.');
  };
  A.acts.waSend = async () => {
    const t = ($('#waTxt') || {}).value || '', c = chats().find(x => x.id === S.waChat); if (!t.trim() || !c) return;
    if (!W.me) { (DEMO_MSGS[c.id] = DEMO_MSGS[c.id] || []).push(['out', 'persona', t.trim()]); c.mode = 'humano'; c.last_text = t.trim(); A.renderModal(); return; }
    if (W.busy) return; W.busy = true;
    try { const r = await CL.api('/functions/v1/wa-send', { method: 'POST', body: { chat: c.id, text: t.trim() } }); if (r && r.ok === false) A.toast(r.msg || 'No salió.'); }
    catch (e) { A.toast((e && e.data && e.data.msg) || 'No salió el mensaje. Probá de nuevo.'); }
    finally { W.busy = false; }
    await loadMsgs(c.id); c.mode = 'humano'; A.renderModal();
  };
  A.acts.waPause = async el => {
    const on = el.getAttribute('data-v') === '1';
    try { await CL.api('/rest/v1/rpc/ov_wa_out_pause', { method: 'POST', body: { p_on: on } }); W.me.out_paused = on; A.renderModal(); A.toast(on ? 'Recordatorios frenados.' : 'Recordatorios reanudados.'); } catch (e) { A.toast('No se pudo. Revisá la conexión.'); }
  };
  A.acts.waBuy = el => {
    const k = el.getAttribute('data-p'), p = PLANS[k];
    const txt = p ? 'Hola! Quiero contratar la ' + p.name + ' (USD ' + p.usd + '/mes) de OdontoVoz para ' + (A.CLINIC || 'mi consultorio') + '.' : 'Hola! Quiero cambiar mi plan de la Secretaria virtual de OdontoVoz (' + (A.CLINIC || '') + ').';
    const sup = A.SUPPORT || {}, num = (sup.wa && sup.wa[0]) || sup.whatsapp || '5492984513279';
    window.open('https://wa.me/' + String(num).replace(/\D/g, '') + '?text=' + encodeURIComponent(txt), '_blank', 'noopener');
  };

  function configHTML() {
    const c = cfg(), tn = !(A.CFG.online && (A.CFG.online.on === false || A.CFG.online.link === false));
    const chk = (k, t, sub) => '<label class="wa-sw"><input type="checkbox" data-chg="waCfg" data-k="' + k + '"' + (c[k] !== false ? ' checked' : '') + '><span><b>' + t + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span></label>';
    return '<div class="wa-form">' +
      chk('on', 'Asistente encendido', 'Apagado, las charlas llegan igual y las respondés vos.') +
      '<label class="lbl" for="waName">Nombre del asistente</label><input id="waName" data-chg="waCfg" data-k="botName" maxlength="24" value="' + esc(c.botName || '') + '" placeholder="Sofi">' +
      chk('book', 'Que dé turnos', tn ? 'Usa los mismos horarios libres y motivos que el turnero online.' : 'Primero activá el Turnero online: el asistente usa esos horarios.') +
      (tn ? '' : '<button class="btn small" data-act="tnOpen">Abrir Turnero online</button>') +
      '<label class="lbl" for="waInfo">Lo que tiene que saber de tu consultorio</label><textarea id="waInfo" rows="7" data-chg="waCfg" data-k="info" maxlength="2500" placeholder="Ej.: Atendemos OSDE, Swiss Medical y particulares. La consulta particular sale $25.000. Hay estacionamiento en la esquina. Aceptamos transferencia y tarjeta. Los sábados no atendemos.">' + esc(c.info || '') + '</textarea>' +
      '<div class="hint">Lo usa tal cual. Si no está acá, no lo inventa: ofrece pasar con una persona. La dirección y los horarios los toma de tu configuración.</div>' +
      chk('rem', 'Recordatorios automáticos con botón «Confirmo»', 'Cuando el paciente toca Confirmo, el turno se marca solo en la agenda.') +
      '<label class="lbl" for="waWhen">Cuándo se mandan</label><select id="waWhen" data-chg="waCfg" data-k="remWhen"><option value="dia"' + (c.remWhen !== '2dias' ? ' selected' : '') + '>El día anterior</option><option value="2dias"' + (c.remWhen === '2dias' ? ' selected' : '') + '>Dos días antes</option></select>' +
      '<label class="lbl" for="waAt">A qué hora</label><select id="waAt" data-chg="waCfg" data-k="remAt">' + [9, 10, 11, 12, 16, 18].map(h => '<option value="' + h + '"' + (+c.remAt === h ? ' selected' : '') + '>' + A.pad(h) + ':00</option>').join('') + '</select>' +
      '<label class="lbl" for="waMax">Tope de recordatorios por día</label><select id="waMax" data-chg="waCfg" data-k="maxDay">' + [50, 100, 150, 250].map(n => '<option value="' + n + '"' + (+c.maxDay === n ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>' +
      '<div class="hint">Un tope protege el número: WhatsApp mira cuántos mensajes mandás y cuántos te bloquean.</div>' +
      '</div>';
  }
  let cfgT = null;
  A.chg.waCfg = el => {
    const c = cfg(), k = el.getAttribute('data-k');
    c[k] = el.type === 'checkbox' ? el.checked : /^(remAt|maxDay)$/.test(k) ? +el.value : el.value;
    A.save && A.save();
    clearTimeout(cfgT); cfgT = setTimeout(pushCfg, 800);
    if (el.type === 'checkbox' || el.tagName === 'SELECT') A.toast('Guardado.');
  };
  async function pushCfg() { if (!active() && !(W.me && W.me.status === 'pendiente')) return; try { await CL.api('/rest/v1/rpc/ov_wa_cfg_set', { method: 'POST', body: { p_cfg: cfg() } }); } catch (e) { /* se reintenta al abrir */ } }

  /* ---------- simulador (en el equipo, sin IA): para probar y mostrar ---------- */
  const SIM = S.waSim || (S.waSim = { msgs: [], st: {} });
  function simHTML() {
    const aiOn = real() && SIM.ai !== false;
    return (aiOn ? '<p class="wa-demo ai">Prueba con la <b>inteligencia artificial real</b> y tu agenda de verdad: escribí como si fueras un paciente. Si pedís un turno, entra a tu agenda como «pedido online» marcado PRUEBA (después borralo).' + (tnOn() ? '' : ' <b>Activá el Turnero online</b> para que pueda ofrecer horarios.') + '</p>'
      : '<p class="wa-demo">Simulación en este equipo: escribí como si fueras un paciente. La secretaria real usa inteligencia artificial y conversa con más naturalidad.' + (A.DEMO ? ' Los turnos que pidas se cargan en tu agenda de prueba.' : ' Acá no se carga ningún turno de verdad.') + '</p>') +
      '<div class="wa-phone"><div class="wa-ph-top">' + WA_IC + '<b>' + esc(A.CLINIC || 'Tu consultorio') + '</b></div><div class="wa-msgs sim" id="waMsgs">' +
      (SIM.msgs.length ? '' : '<div class="wa-hint">Probá: «Hola, quiero un turno para control», «¿Dónde quedan?», «¿Atienden OSDE?» o «BAJA».</div>') +
      SIM.msgs.map(m => '<div class="wa-b ' + (m[0] === 'in' ? 'in' : 'out bot') + '">' + esc(m[1]).replace(/\n/g, '<br>') + '</div>').join('') + '</div>' +
      '<div class="wa-reply"><label class="sr" for="waSimTxt">Mensaje del paciente</label><input id="waSimTxt" placeholder="Escribí como paciente…" autocomplete="off"><button class="btn primary" data-act="waSimSend">Enviar</button></div></div>' +
      '<button class="btn small" data-act="waSimReset">Empezar de nuevo</button>';
  }
  const DAYN = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  function simSlots(kind) {
    const out = [], pros = (A.PROS || []).filter(p => p.sched && Object.keys(p.sched).length);
    for (let i = 1; i < 21 && out.length < 3; i++) {
      const d = A.add(A.today(), i); if (A.closedOn && A.closedOn(d)) continue;
      for (const p of pros) {
        const fs = A.freeSlots ? A.freeSlots(p, d, Math.max(30, A.slotOf ? A.slotOf(p) : 30), {}) : [];
        const t = fs.find(x => (kind === 'tarde' ? x >= 780 : kind === 'manana' ? x < 780 : true));
        if (t != null) { out.push({ d, t, pro: p.id }); break; }
      }
    }
    return out;
  }
  const say = (t) => SIM.msgs.push(['out', t]);
  function simBot(txt) {
    const c = cfg(), st = SIM.st, t = N(txt), name = c.botName || 'Sofi';
    if (!st.hi) { st.hi = 1; say('¡Hola! Soy ' + name + ', la asistente virtual de ' + (A.CLINIC || 'el consultorio') + ' 😊 Si preferís, te paso con una persona.'); }
    if (/^(baja|stop)\b/.test(t)) { st.step = null; return say('Listo, no te vamos a mandar más recordatorios por acá. Si querés volver a recibirlos, escribí ALTA.'); }
    if (/persona|humano|secretaria|alguien/.test(t)) { st.step = null; return say('Dale, te paso con alguien del consultorio. En breve te responden.'); }
    if (st.step === 'pick') {
      const n = /\b(1|uno|primer|primero)\b/.test(t) ? 0 : /\b(2|dos|segundo)\b/.test(t) ? 1 : /\b(3|tres|tercer|tercero)\b/.test(t) ? 2 : -1;
      if (n >= 0 && st.opts[n]) { st.sel = st.opts[n]; st.step = 'data'; return say('Perfecto. ¿Me pasás tu nombre, apellido y DNI? Y la obra social, si tenés.'); }
      return say('¿Cuál te queda mejor? Respondé 1, 2 o 3.');
    }
    if (st.step === 'data') {
      const dni = (txt.match(/\d[\d.]{6,10}/) || [''])[0].replace(/\D/g, ''), words = txt.replace(/\d[\d.]*/g, ' ').split(/[\s,]+/).filter(w => w.length > 1);
      if (dni.length < 7 || words.length < 2) return say('Me falta algo: necesito nombre, apellido y DNI (por ejemplo: Ana Pérez 30123456).');
      st.pat = { first: words[0], last: words[1], dni, cov: words.slice(2).join(' ') }; st.step = 'ok';
      const s = st.sel; return say('Te anoto: ' + st.pat.first + ' ' + st.pat.last + ', ' + DAYN[A.parse(s.d).getDay()] + ' ' + A.fmtShort(s.d).split(' ')[1] + ' a las ' + A.mm(s.t) + ' con ' + (A.PRO(s.pro) || {}).name + '. ¿Lo confirmo?');
    }
    if (st.step === 'ok') {
      if (/^(si|sí|dale|ok|confirm|perfecto|de una)/.test(t)) {
        const s = st.sel, code = 'OV-' + Math.random().toString(36).slice(2, 6).toUpperCase(); st.step = null;
        if (A.DEMO) {
          const pat = A.addPatient({ first: st.pat.first, last: st.pat.last, dni: st.pat.dni, cov: st.pat.cov || 'Particular', pro: s.pro });
          const a = { id: A.uid(), pid: pat.id, pro: s.pro, date: s.d, start: s.t, dur: 30, what: (A.TYPES[st.kind] || ['Control'])[0], status: 'pendiente', online: true, wa: true, code, note: 'Pedido por WhatsApp (asistente)' };
          A.mutate([a.date], () => { A.day(a.date).push(a); }); A.saveNow && A.saveNow();
          A.toast('Turno pedido por WhatsApp: ' + pat.name + ', ' + A.fmtShort(a.date) + ' ' + A.mm(a.start) + '.');
        }
        return say('¡Listo! Pedí tu turno (código ' + code + '). El consultorio te lo confirma por acá. ¿Te ayudo con algo más?');
      }
      st.step = null; return say('Sin problema, no lo anoto. ¿Querés otro día u horario?');
    }
    if (/turno|cita|sacar|agendar|reservar|atender|dolor|control|limpieza|consulta/.test(t)) {
      if (c.book === false) return say('Por acá no doy turnos, pero te paso con alguien del consultorio que te lo da enseguida.');
      st.kind = /dolor|urgen|me duele/.test(t) ? 'urgencia' : /limpieza/.test(t) ? 'limpieza' : 'control';
      const opts = simSlots(/tarde/.test(t) ? 'tarde' : /manana|mañana/.test(txt.toLowerCase()) && !/pasado/.test(t) ? 'manana' : '');
      if (!opts.length) return say('No encuentro horarios libres en los próximos días. Te paso con alguien del consultorio.');
      st.opts = opts; st.step = 'pick';
      return say((st.kind === 'urgencia' ? 'Uh, lamento el dolor. ' : '') + 'Tengo estos horarios:\n' + opts.map((o, i) => (i + 1) + ') ' + DAYN[A.parse(o.d).getDay()] + ' ' + A.fmtShort(o.d).split(' ')[1] + ' a las ' + A.mm(o.t) + ' con ' + (A.PRO(o.pro) || {}).name).join('\n') + '\n¿Cuál te queda mejor?');
    }
    if (/donde|direccion|ubicad|queda|llego/.test(t)) return say(A.CFG.addr ? 'Estamos en ' + A.CFG.addr + '.' : 'La dirección te la pasa una persona del consultorio. ¿Te paso con alguien?');
    if (/horario|abren|atienden los|que dias/.test(t) && !/obra|osde/.test(t)) return say('Atendemos según la agenda de cada profesional. Si querés, te busco el próximo turno libre.');
    const info = String(c.info || ''), key = t.split(/\W+/).filter(w => w.length > 3);
    const line = info.split(/(?<=[.\n])\s*/).find(l => key.some(k => N(l).includes(k)));
    if (line) return say(line.trim());
    if (/osde|swiss|obra social|prepaga|pami|ioma|galeno|medife|precio|cuanto|sale|cuesta|pago|tarjeta/.test(t)) return say('Eso te lo confirma una persona del consultorio. ¿Querés que te pase con alguien?');
    if (/gracias|genial|buenisimo|perfecto/.test(t)) return say('¡De nada! Cualquier cosa, escribime.');
    if (st.hi === 1 && SIM.msgs.length <= 2) return;
    say('Puedo darte un turno, decirte la dirección o pasarte con una persona. ¿Qué necesitás?');
  }
  const tnOn = () => !(A.CFG.online && (A.CFG.online.on === false || A.CFG.online.link === false));
  const simDone = () => { A.renderModal(); setTimeout(() => { const m = $('#waMsgs'); if (m) m.scrollTop = m.scrollHeight; const x = $('#waSimTxt'); if (x) x.focus(); }, 30); };
  /* con cuenta real: la IA de verdad (función wa-sim); si no está encendida, la simulación del equipo */
  async function aiReply() {
    SIM.busy = true; SIM.msgs.push(['out', '…escribiendo']); simDone();
    try {
      if (A.tnPublish) await A.tnPublish(true);
      const r = await CL.api('/functions/v1/wa-sim', { method: 'POST', body: { cfg: cfg(), phone: A.waNumber ? A.waNumber(A.CFG.phone || '') : '', messages: SIM.msgs.filter(m => m[1] !== '…escribiendo').map(m => ({ role: m[0] === 'in' ? 'user' : 'assistant', text: m[1] })) } });
      SIM.msgs.pop();
      SIM.msgs.push(['out', (r && r.reply) || '…']);
      if (r && r.booked) { A.toast('Turno de PRUEBA pedido para ' + A.fmtShort(r.booked.date) + ' ' + A.mm(r.booked.start) + '. Entra a la agenda en unos segundos.'); setTimeout(() => A.tnClaim && A.tnClaim(), 1500); }
    } catch (e) {
      SIM.msgs.pop();
      SIM.ai = false; const last = SIM.msgs[SIM.msgs.length - 1]; if (last && last[0] === 'in') simBot(last[1]);
      A.toast('La prueba con IA todavía no está encendida: sigue la simulación del equipo.');
    } finally { SIM.busy = false; simDone(); }
  }
  A.acts.waSimSend = () => {
    const i = $('#waSimTxt'), t = (i && i.value || '').trim(); if (!t || SIM.busy) return;
    SIM.msgs.push(['in', t]);
    if (real() && SIM.ai !== false) { aiReply(); return; }
    simBot(t); simDone();
  };
  A.acts.waSimReset = () => { SIM.msgs = []; SIM.st = {}; if (SIM.ai === false) SIM.ai = undefined; A.renderModal(); };
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'waSimTxt') { e.preventDefault(); A.acts.waSimSend(); } if (e.key === 'Enter' && !e.shiftKey && e.target && e.target.id === 'waTxt') { e.preventDefault(); A.acts.waSend(); } });

  MF.wa = () => {
    const t = S.waTab || 'inicio';
    const body = tabsHTML(t) + '<div class="wa-body">' + (t === 'charlas' ? chatsHTML() : t === 'config' ? configHTML() : t === 'probar' ? simHTML() : homeHTML()) + '</div>';
    setTimeout(() => { const m = $('#waMsgs'); if (m) m.scrollTop = m.scrollHeight; }, 20);
    return A.modalShell('Secretaria virtual por WhatsApp', body, '<button class="btn primary" data-act="closeModal">Cerrar</button>', true);
  };

  /* ---------- recordatorios automáticos: la app arma la cola ---------- */
  const isoAt = (d, h) => new Date(d + 'T' + A.pad(h) + ':00:00-03:00').toISOString();
  async function queue() {
    const c = cfg(); if (!active() || c.rem === false || W.me.out_paused) return;
    const items = [], marks = [];
    const before = c.remWhen === '2dias' ? 2 : 1;
    for (let n = 1; n <= before; n++) {
      const d = A.add(A.today(), n), sendDay = A.add(d, -before);
      (A.day(d) || []).forEach(a => {
        if (!a.pid || a.type === 'block' || /cancelado|ausente|atendido/.test(a.status || '') || a.rem === 'confirmo') return;
        const k = a.date + '|' + a.start;
        if (a.waQ && a.waQk === k) return;
        const p = A.PAT(a.pid), wa = p && A.waNumber ? A.waNumber(p.phone) : ''; if (!wa) return;
        let sa = sendDay === A.today() ? isoAt(sendDay, +c.remAt || 10) : new Date().toISOString();
        if (Date.parse(sa) < Date.now()) sa = new Date().toISOString();
        items.push({ appt: a.id, wa_id: wa, send_after: sa, params: { nombre: p.first || p.name, consultorio: A.CLINIC, dia: A.fmtLong(a.date), hora: A.mm(a.start), profesional: (A.PRO(a.pro) || {}).name || '', at: a.date + 'T' + A.mm(a.start) + ':00-03:00' } });
        marks.push([a, k]);
      });
    }
    if (!items.length) return;
    try {
      await CL.api('/rest/v1/rpc/ov_wa_queue', { method: 'POST', body: { p_items: items } });
      const ds = Array.from(new Set(marks.map(m => m[0].date)));
      A.mutate(ds, () => marks.forEach(m => { m[0].waQ = true; m[0].waQk = m[1]; if (!m[0].rem || m[0].rem === 'porenviar') m[0].rem = 'enviado'; }));
    } catch (e) { /* se reintenta */ }
  }
  /* si un turno en cola se cancela o se mueve, se saca de la cola (y se vuelve a armar si corresponde) */
  async function unqueueChanged() {
    if (!active()) return;
    for (let n = 0; n <= 3; n++) (A.day(A.add(A.today(), n)) || []).forEach(a => {
      if (!a.waQ) return;
      if (/cancelado/.test(a.status || '') || a.waQk !== a.date + '|' + a.start) {
        CL.api('/rest/v1/rpc/ov_wa_unqueue', { method: 'POST', body: { p_appt: a.id } }).catch(() => { });
        A.mutate([a.date], () => { a.waQ = false; a.waQk = null; });
      }
    });
  }
  /* respuestas de los pacientes → agenda y casilla de avisos */
  async function events() {
    if (!active()) return;
    let rows = []; try { rows = await CL.api('/rest/v1/rpc/ov_wa_events_claim', { method: 'POST', body: {} }) || []; } catch (e) { return; }
    rows.forEach(ev => {
      const a = ev.appt ? A.apptById(ev.appt) : null, p = a ? A.PAT(a.pid) : null, nm = (p && p.name) || ('+' + (ev.wa_id || ''));
      if (ev.kind === 'confirma' && a) { A.mutate([a.date], () => { a.rem = 'confirmo'; }); A.toast(nm + ' confirmó su turno por WhatsApp.'); }
      if (ev.kind === 'cambia') { if (a) A.mutate([a.date], () => { a.rem = 'cambiar'; }); if (A.nfAdd) A.nfAdd({ id: 'wa:' + ev.id, k: 'wa', t: nm + ' quiere cambiar su turno', b: a ? A.fmtShort(a.date) + ' ' + A.mm(a.start) + ' · el asistente le ofrece otro horario' : '', act: 'waOpen', args: { 'data-t': 'charlas' } }); }
      if (ev.kind === 'persona' && A.nfAdd) A.nfAdd({ id: 'wa:' + ev.id, k: 'wa', t: 'Una charla de WhatsApp te necesita', b: nm, act: 'waOpen', args: { 'data-t': 'charlas' } });
      if (ev.kind === 'baja' && A.nfAdd) A.nfAdd({ id: 'wa:' + ev.id, k: 'wa', t: nm + ' pidió no recibir recordatorios', b: 'Se respeta solo. Si cambia de idea, escribe ALTA.', act: 'waOpen', args: { 'data-t': 'charlas' } });
    });
    if (rows.length) { A.saveNow && A.saveNow(); A.refresh(); }
  }
  let lastQ = 0;
  async function tick(force) {
    if (!real()) return;
    if (W.me === undefined || force) await loadMe();
    if (!active()) return;
    await events();
    if (force || Date.now() - lastQ > 20 * 60000) { lastQ = Date.now(); await unqueueChanged(); await queue(); }
    if (S.modal && S.modal.type === 'wa' && S.waTab === 'charlas') { await loadChats(); if (S.waChat) await loadMsgs(S.waChat); if (!document.activeElement || document.activeElement.id !== 'waTxt') A.renderModal(); }
  }
  setInterval(() => tick(false), 60000);
  setInterval(() => { if (S.modal && S.modal.type === 'wa' && S.waTab === 'charlas' && W.me) tick(false); }, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(false); });
  setTimeout(() => tick(true), 9000);
  A.waTick = tick;

  /* ---------- menú ---------- */
  const WA_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z"/></svg>';
  function menu() {
    if ($('#drWa')) { const b = $('#drWa .wa-dot'), n = waiting(); if (W.me && n) { if (b) b.textContent = n; else $('#drWa .t').insertAdjacentHTML('beforeend', '<span class="wa-dot">' + n + '</span>'); } else if (b) b.remove(); return; }
    const ref = $('#gearMenu .dr-nav .dnav[data-act="tnOpen"]') || $('#gearMenu .dr-nav .dnav:last-child'); if (!ref) return;
    ref.insertAdjacentHTML('afterend', '<button class="dnav" id="drWa" data-act="waOpen">' + WA_IC + '<span class="t">Secretaria por WhatsApp<small>Responde y da turnos 24 h</small></span><span class="wa-new">Nuevo</span></button>');
  }
  const arPrev = A.afterRefresh;
  A.afterRefresh = function () { if (arPrev) arPrev.apply(this, arguments); try { menu(); } catch (e) { /* nada */ } };

  /* voz: «abrí la secretaria», «abrí WhatsApp de pacientes» */
  const execPrev = A.cmd && A.cmd.exec;
  if (execPrev) A.cmd.exec = (text, o) => {
    if (/^(?:abr[ií]|ir a|mostr[aá](?:me)?|ver)\s+(?:la\s+)?(?:secretaria(?: virtual)?|charlas de whatsapp|whatsapp de (?:los )?pacientes)\b/i.test(String(text || '').trim())) { A.acts.waOpen(); return { ok: true, msg: 'Abrí la Secretaria por WhatsApp.' }; }
    return execPrev(text, o);
  };

  const css = document.createElement('style');
  css.textContent = [
    '.wa-tabs { flex: none; display: flex; gap: 6px; overflow-x: auto; margin: 0 0 12px; padding: 2px 0 6px; position: sticky; top: -1px; z-index: 3; background: var(--surface); }',
    'body:has(.wa-tabs) #vdMic, body:has(.wa-tabs) .vd-fab, body:has(.wa-tabs) #hfBtn { visibility: hidden; }',
    '.wa-tabs button { flex: none; border: 1px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 999px; padding: 8px 12px; font: 600 13.5px inherit; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }',
    '.wa-tabs button[aria-selected="true"] { background: var(--accent); border-color: var(--accent); color: #fff; }',
    '.wa-dot { display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; background: #e5484d; color: #fff; font: 700 12px/1 inherit; }',
    '.wa-new { margin-left: auto; font: 700 10.5px inherit; letter-spacing: .04em; text-transform: uppercase; background: #25d366; color: #063; border-radius: 6px; padding: 2px 6px; }',
    '.wa-hero { display: flex; gap: 14px; align-items: flex-start; background: linear-gradient(135deg, #e9fbf0, var(--surface)); border: 1px solid var(--line); border-radius: 18px; padding: 16px; }',
    '[data-theme="dark"] .wa-hero { background: linear-gradient(135deg, #0f2a1d, var(--surface)); }',
    '.wa-hero-ic svg { width: 42px; height: 42px; color: #25a35a; } .wa-hero h3 { margin: 0 0 6px; font-size: 19px; } .wa-hero p { margin: 0; color: var(--ink-2); line-height: 1.45; }',
    '.wa-body { flex: none; } .wa-feats { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin: 14px 0; }',
    '.wa-feats > div { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 4px; } .wa-feats small { color: var(--ink-2); }',
    '.wa-try { width: 100%; margin-bottom: 8px; border-color: #25a35a; color: #1c7c45; font-weight: 700; }',
    '.wa-h { margin: 16px 0 8px; }',
    '.wa-plans { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; }',
    '.wa-plan { border: 1px solid var(--line); border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 4px; background: var(--surface); } .wa-plan small { color: var(--ink-2); }',
    '.wa-price { font: 800 26px inherit; margin-top: 6px; } .wa-price span { font-size: 14px; font-weight: 500; color: var(--ink-2); } .wa-plan .btn { margin-top: 8px; }',
    '.wa-safe { margin-top: 14px; border: 1px dashed var(--line); border-radius: 14px; padding: 12px 14px; } .wa-safe h4 { margin: 0 0 6px; } .wa-safe ul { margin: 0; padding-left: 18px; color: var(--ink-2); line-height: 1.5; font-size: 14px; }',
    '.wa-card { border: 1px solid var(--line); border-radius: 16px; padding: 14px; background: var(--surface); display: flex; flex-direction: column; gap: 8px; } .wa-card p { margin: 0; } .wa-card.warn { border-color: #e2a300; }',
    '.wa-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }',
    '.wa-st { display: inline-block; border-radius: 999px; padding: 3px 10px; font: 700 12.5px inherit; } .wa-st.ok { background: #dcfce7; color: #166534; } .wa-st.wait { background: #e0f2fe; color: #075985; } .wa-st.warn { background: #fef3c7; color: #92400e; } .wa-st.bad { background: #fee2e2; color: #991b1b; }',
    '.wa-use > div:first-child { display: flex; justify-content: space-between; font-size: 14px; } .wa-bar { height: 8px; border-radius: 4px; background: var(--bg); overflow: hidden; margin-top: 4px; } .wa-bar i { display: block; height: 100%; background: #25a35a; }',
    '.wa-demo.ai { background: #e6f7ee; color: #14532d; } [data-theme="dark"] .wa-demo.ai { background: #0f2a1d; color: #bbf7d0; }',
    '.wa-demo { background: #fff7e0; color: #7a5300; border-radius: 12px; padding: 8px 12px; font-size: 13.5px; margin: 0 0 10px; } [data-theme="dark"] .wa-demo { background: #3a2e0a; color: #f6d68a; }',
    '.wa-list { list-style: none; margin: 0; padding: 0; border: 1px solid var(--line); border-radius: 16px; overflow: hidden; background: var(--surface); }',
    '.wa-list button { display: flex; gap: 12px; align-items: center; width: 100%; padding: 12px 14px; border: 0; border-top: 1px solid var(--line); background: none; color: var(--ink); font: inherit; text-align: left; cursor: pointer; } .wa-list li:first-child button { border-top: 0; } .wa-list button:hover { background: var(--bg); }',
    '.wa-av { flex: none; width: 40px; height: 40px; border-radius: 20px; background: #d9f4e3; color: #1c7c45; display: grid; place-items: center; font-weight: 800; }',
    '.wa-li { flex: 1; min-width: 0; display: flex; flex-direction: column; } .wa-li small { color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.wa-meta { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; } .wa-meta small { color: var(--ink-2); font-size: 12px; }',
    '.wa-tag { font: 600 11px inherit; border-radius: 6px; padding: 2px 6px; background: var(--bg); color: var(--ink-2); } .wa-tag.hum { background: #fee2e2; color: #991b1b; }',
    '.wa-chead { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; } .wa-chead > div { flex: 1; display: flex; flex-direction: column; } .wa-chead small { color: var(--ink-2); }',
    '.wa-need { background: #fee2e2; color: #991b1b; border-radius: 10px; padding: 6px 10px; font-size: 14px; margin-bottom: 8px; }',
    '.wa-msgs { display: flex; flex-direction: column; gap: 6px; background: #efeae2; border-radius: 14px; padding: 12px; max-height: 52vh; min-height: 200px; overflow-y: auto; }',
    '[data-theme="dark"] .wa-msgs { background: #0b141a; }',
    '.wa-b { max-width: 82%; padding: 7px 10px 5px; border-radius: 10px; background: #fff; color: #111; font-size: 14.5px; line-height: 1.35; box-shadow: 0 1px 0 rgba(0,0,0,.08); align-self: flex-start; }',
    '.wa-b.out { align-self: flex-end; background: #d9fdd3; } .wa-b.out.persona { background: #cfe9ff; } .wa-b.out.sistema { background: #f3f0e8; }',
    '[data-theme="dark"] .wa-b { background: #202c33; color: #e9edef; } [data-theme="dark"] .wa-b.out { background: #005c4b; } [data-theme="dark"] .wa-b.out.persona { background: #12446b; } [data-theme="dark"] .wa-b.out.sistema { background: #2a3238; }',
    '.wa-b small { display: block; font: 700 11px inherit; color: #1c7c45; margin-bottom: 2px; } .wa-b i { display: block; text-align: right; font: 400 11px inherit; color: #667781; margin-top: 2px; font-style: normal; }',
    '.wa-hint { align-self: center; text-align: center; color: #54656f; font-size: 13px; background: rgba(255,255,255,.7); border-radius: 10px; padding: 8px 10px; }',
    '.wa-ctl { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin: 8px 0; font-size: 14px; color: var(--ink-2); flex-wrap: wrap; }',
    '.wa-reply { display: flex; gap: 8px; align-items: flex-end; margin-top: 8px; } .wa-reply textarea, .wa-reply input { flex: 1; min-height: 44px; border-radius: 22px; padding: 10px 14px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font: inherit; resize: none; }',
    '.wa-phone { border: 1px solid var(--line); border-radius: 22px; overflow: hidden; max-width: 460px; margin: 0 auto 10px; padding-bottom: 10px; background: var(--surface); } .wa-phone .wa-reply { padding: 0 10px; }',
    '.wa-ph-top { display: flex; gap: 10px; align-items: center; background: #075e54; color: #fff; padding: 10px 14px; } .wa-ph-top svg { width: 22px; height: 22px; }',
    '.wa-phone .wa-msgs { border-radius: 0; max-height: 46vh; min-height: 280px; }',
    '.wa-form { display: flex; flex-direction: column; gap: 8px; } .wa-form .lbl { margin-top: 6px; font-weight: 600; } .wa-form input:not([type=checkbox]), .wa-form select, .wa-form textarea { min-height: 44px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); padding: 8px 12px; font: inherit; }',
    '.wa-sw { display: flex; gap: 12px; align-items: flex-start; padding: 10px 12px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); cursor: pointer; } .wa-sw input { width: 22px; height: 22px; flex: none; margin-top: 2px; accent-color: #25a35a; } .wa-sw span { display: flex; flex-direction: column; } .wa-sw small { color: var(--ink-2); }'
  ].join('\n');
  document.head.appendChild(css);
})();
