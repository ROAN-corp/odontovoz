/* ===== 1.39: Autogestión por WhatsApp (incluida, menú con botones) + recordatorios automáticos (servicio pago): charlas, configuración, prueba ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, CL = A.cloud;
  const real = () => !!(CL && CL.session && CL.conf && CL.conf() && !A.DEMO);
  const N = s => A.norm(String(s || ''));
  const ARS = usd => A.DOLAR ? ' (≈ $' + Math.round(usd * A.DOLAR).toLocaleString('es-AR') + ')' : '';

  /* ---------- recordatorios automáticos: único servicio pago (mantener igual en sitio/index.html, terminos.html y admin.html) ---------- */
  const PLANS = A.WA_REM_PLANS = {
    r1: { name: 'Recordatorios 300', usd: 12, quota: 300, for: 'Un profesional' },
    r2: { name: 'Recordatorios 1.000', usd: 29, quota: 1000, for: 'Consultorio con varios profesionales' },
    r3: { name: 'Recordatorios 3.000', usd: 69, quota: 3000, for: 'Centros y empresas' }
  };
  const cfg = () => { const c = A.CFG.waBot || (A.CFG.waBot = {}); if (c.on == null) Object.assign(c, { on: true, book: true, info: '', rem: true, remWhen: 'dia', remAt: 10, maxDay: 150 }); return c; };

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
    { id: 'd1', wa_id: '5492994123456', name: 'Ana Pérez', mode: 'bot', last_text: '¡Listo! Pedimos tu turno para el martes 10:00 (OV-K7P2).', last_at: ago(8), last_in: ago(9), unread: 0 },
    { id: 'd2', wa_id: '5492994555111', name: 'Jorge Díaz', mode: 'humano', need: 'Pidió hablar con una persona', last_text: 'Listo, ya le aviso a alguien del consultorio.', last_at: ago(25), last_in: ago(26), unread: 2 },
    { id: 'd3', wa_id: '5492995222333', name: 'Lucía Gómez', mode: 'bot', last_text: '¡Gracias por confirmar! Te esperamos. 😊', last_at: ago(95), last_in: ago(96), unread: 0 }
  ];
  const DEMO_MSGS = {
    d1: [['in', 'paciente', 'Hola! quería un turno'], ['out', 'bot', '¡Hola! 👋 Te responde el asistente automático del consultorio.\n\n¿Qué necesitás?\n1. Pedir un turno\n2. Dirección y contacto\n3. Obras sociales y precios\n4. Hablar con una persona'], ['in', 'paciente', 'Pedir un turno'], ['out', 'bot', '¿Qué día te queda mejor?\n1. Martes 10/11\n2. Miércoles 11/11'], ['in', 'paciente', 'Martes 10/11'], ['out', 'bot', 'martes 10 de noviembre: elegí el horario.\n1. 10:00 h\n2. 10:30 h\n3. Otro día'], ['in', 'paciente', '10:00 h'], ['out', 'bot', '¿Cuál es el nombre y apellido del paciente?'], ['in', 'paciente', 'Ana Pérez'], ['out', 'bot', 'Gracias. ¿Número de DNI?'], ['in', 'paciente', '30123456'], ['out', 'bot', '¡Listo! ✅ Pedimos tu turno para el martes 10 de noviembre a las 10:00 h. Código: OV-K7P2.']],
    d2: [['in', 'paciente', 'Buenas, me cobraron dos veces la última sesión'], ['out', 'bot', '¿Qué necesitás?\n1. Pedir un turno\n2. Dirección y contacto\n3. Obras sociales y precios\n4. Hablar con una persona'], ['in', 'paciente', 'Hablar con una persona'], ['out', 'bot', 'Listo, ya le aviso a alguien del consultorio. En breve te responden por acá. 🙌'], ['in', 'paciente', '?']],
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
    '<li>Solo responde a quien te escribe, con un menú de botones sobre tu consultorio.</li>' +
    '<li>Recordatorios solo de turnos, de 9 a 20 h y con tope por día. Nunca promociones.</li>' +
    '<li>Cada recordatorio dice cómo darse de baja; con «BAJA» no recibe más.</li>' +
    '<li>Si WhatsApp baja la calidad del número, los recordatorios se frenan solos.</li>' +
    '<li>Se presenta como asistente automático y te pasa la charla cuando el paciente lo pide.</li></ul></div>';

  const remPlans = () => '<div class="wa-plans">' + Object.keys(PLANS).map(k => { const p = PLANS[k]; return '<div class="wa-plan"><b>' + esc(p.name) + '</b><small>' + esc(p.for) + '</small><div class="wa-price">USD ' + p.usd + '<span>/mes</span></div><small>' + ARS(p.usd).replace(/[()]/g, '').trim() + '</small><small>Hasta ' + p.quota.toLocaleString('es-AR') + ' recordatorios por mes</small><button class="btn primary" data-act="waBuy" data-p="' + k + '">Lo quiero</button></div>'; }).join('') + '</div>';
  const REM_INFO = '<h4 class="wa-h">Recordatorios automáticos · servicio aparte</h4><p class="hint" style="margin-top:0">Salen solos el día anterior por WhatsApp con los botones «Confirmo» y «Necesito cambiarlo», y el turno se marca solo en la agenda. Es lo único que cobra WhatsApp, por eso va aparte. Sin este servicio seguís mandando los recordatorios gratis con el botón de WhatsApp de la agenda.</p>';
  function homeHTML() {
    if (W.err === 'notables') return '<div class="wa-card warn"><b>Falta preparar la base de datos.</b><p>Hay que correr <code>supabase/whatsapp.sql</code> en Supabase (lo hace ROAN).</p></div>';
    if (!W.me) {
      return '<div class="wa-hero"><div class="wa-hero-ic">' + WA_IC + '</div><div><h3>Tus pacientes se autogestionan por WhatsApp</h3><p>Le escriben al WhatsApp del consultorio y, con botones, sacan turno con los horarios libres de tu agenda, ven la dirección y consultan obras sociales y precios. Cuando lo piden, la charla pasa a vos. <b>Incluido en tu plan, sin costo extra.</b></p></div></div>' +
        '<div class="wa-feats">' + [['Sacan turno solos', 'Eligen día y horario con botones y el pedido entra a tu agenda.'], ['Responde consultas', 'Dirección, obras sociales y precios: lo que vos cargues.'], ['Atiende las 24 h', 'Aunque estés atendiendo o sea de noche.'], ['Vos seguís a cargo', 'Ves todas las charlas y tomás la que quieras.']].map(f => '<div><b>' + f[0] + '</b><small>' + f[1] + '</small></div>').join('') + '</div>' +
        '<button class="btn wa-try" data-act="waTab" data-t="probar">▶ Probala ahora, como la ve el paciente</button>' +
        '<button class="btn primary wa-on" data-act="waBuy" data-p="base">Quiero activarla en mi WhatsApp</button>' +
        '<p class="hint">Para activarla conectamos el número del consultorio al WhatsApp oficial para empresas. Te ayudamos en una videollamada corta y no tiene costo.</p>' +
        REM_INFO + remPlans() + SAFE;
    }
    const w = W.me, pct = w.rem_quota ? Math.min(100, Math.round((w.rem_used || 0) / w.rem_quota * 100)) : 0;
    const st = { activo: ['ok', 'Activa'], pendiente: ['wait', 'Conectando tu número'], pausado: ['warn', 'Pausada'], baja: ['warn', 'Dada de baja'] }[w.status] || ['wait', w.status];
    const q = { GREEN: ['ok', 'Buena'], YELLOW: ['warn', 'Regular: conviene mandar menos mensajes'], RED: ['bad', 'Baja: se frenaron los recordatorios'] }[String(w.quality || '').toUpperCase()];
    const c = cfg(), rp = PLANS[w.rem_plan], per = new Date().toISOString().slice(0, 7);
    return '<div class="wa-card"><div class="wa-row"><span class="wa-st ' + st[0] + '">' + st[1] + '</span><b>Autogestión por WhatsApp</b></div>' +
      (w.display ? '<p>Número: <b>' + esc(w.display) + '</b></p>' : '<p class="hint">Todavía falta conectar el número. Te escribimos para hacerlo juntos.</p>') +
      (q ? '<p>Calidad del número según WhatsApp: <span class="wa-st ' + q[0] + '">' + q[1] + '</span></p>' : '') +
      (waiting() ? '<button class="btn primary" data-act="waTab" data-t="charlas">' + waiting() + ' charla(s) esperan una persona ›</button>' : '') + '</div>' +
      (rp ? '<div class="wa-card"><div class="wa-row"><b>' + esc(rp.name) + '</b><span class="wa-st ' + (w.out_paused ? 'warn' : c.rem === false ? 'wait' : 'ok') + '">' + (w.out_paused ? 'Frenados' : c.rem === false ? 'Apagados' : 'Encendidos') + '</span></div>' +
        '<div class="wa-use"><div><span>Recordatorios este mes</span><b>' + (w.rem_period === per ? w.rem_used || 0 : 0) + ' de ' + (w.rem_quota || rp.quota).toLocaleString('es-AR') + '</b></div><div class="wa-bar"><i style="width:' + pct + '%"></i></div></div>' +
        (w.out_paused ? '<button class="btn small" data-act="waPause" data-v="0">Reanudar</button>' : c.rem !== false ? '<button class="btn small" data-act="waPause" data-v="1">Frenar</button>' : '') + '</div>'
        : REM_INFO + remPlans()) +
      SAFE + '<p class="hint">¿Querés cambiar el plan de recordatorios? <button class="btn small" data-act="waBuy" data-p="mas">Escribinos</button></p>';
  }

  function chatsHTML() {
    const l = chats();
    if (S.waChat) return chatHTML(l.find(c => c.id === S.waChat));
    return (W.me ? '' : '<p class="wa-demo">Así se ven las charlas (ejemplo).</p>') +
      (l.length ? '<ul class="wa-list">' + l.map(c => {
        const p = patOf(c.wa_id);
        return '<li><button data-act="waChatOpen" data-chat="' + esc(c.id) + '"><span class="wa-av">' + esc(((p && p.name) || c.name || '?').charAt(0).toUpperCase()) + '</span><span class="wa-li"><b>' + esc((p && p.name) || c.name || ('+' + c.wa_id)) + '</b><small>' + esc(c.last_text || '') + '</small></span><span class="wa-meta"><small>' + when(c.last_at) + '</small>' +
          (c.mode === 'humano' ? '<span class="wa-tag hum">' + (c.need ? 'Te necesita' : 'Persona') + '</span>' : '<span class="wa-tag">Automático</span>') + (c.unread ? '<span class="wa-dot">' + c.unread + '</span>' : '') + '</span></button></li>';
      }).join('') + '</ul>' : '<p class="hint">Todavía no hay charlas. Cuando un paciente escriba al WhatsApp del consultorio, aparece acá.</p>');
  }
  function chatHTML(c) {
    if (!c) return '<p class="hint">No encontré la charla.</p>';
    const p = patOf(c.wa_id), ms = msgsOf(c.id), op = open24(c);
    return '<div class="wa-chead"><button class="btn small" data-act="waBack">‹ Charlas</button><div><b>' + esc((p && p.name) || c.name || '+' + c.wa_id) + '</b><small>+' + esc(c.wa_id) + (c.opt_out ? ' · pidió BAJA' : '') + '</small></div>' + (p ? '<button class="btn small" data-act="openFicha" data-pid="' + p.id + '">Ficha</button>' : '') + '</div>' +
      (c.need ? '<div class="wa-need">⚑ ' + esc(c.need) + '</div>' : '') +
      '<div class="wa-msgs" id="waMsgs">' + ms.map(m => '<div class="wa-b ' + (m.dir === 'in' ? 'in' : 'out ' + m.who) + '">' + (m.dir === 'out' ? '<small>' + ({ bot: 'Automático', persona: 'Consultorio', sistema: 'Automático' }[m.who] || '') + '</small>' : '') + esc(m.body).replace(/\n/g, '<br>') + (m.created_at ? '<i>' + when(m.created_at) + (m.status === 'failed' ? ' · no salió' : '') + '</i>' : '') + '</div>').join('') + '</div>' +
      '<div class="wa-ctl">' + (c.mode === 'humano' ? '<span>La atiende una persona.</span><button class="btn small" data-act="waMode" data-v="bot">Volver al menú automático</button>' : '<span>La atiende el menú automático.</span><button class="btn small" data-act="waMode" data-v="humano">Tomar la charla</button>') + '</div>' +
      (op ? '<div class="wa-reply"><label class="sr" for="waTxt">Responder</label><textarea id="waTxt" rows="2" placeholder="Escribí tu respuesta…"></textarea><button class="btn primary" data-act="waSend">Enviar</button></div>'
        : '<p class="hint">Pasaron más de 24 horas desde el último mensaje del paciente: WhatsApp no deja escribirle primero desde acá. Esperá a que escriba o llamalo.</p>');
  }
  A.acts.waMode = async el => {
    const v = el.getAttribute('data-v'), c = chats().find(x => x.id === S.waChat); if (!c) return;
    if (W.me) { try { await CL.api('/rest/v1/rpc/ov_wa_take', { method: 'POST', body: { p_chat: c.id, p_mode: v } }); } catch (e) { A.toast('No se pudo. Revisá la conexión.'); return; } }
    c.mode = v; if (v === 'bot') c.need = null; A.renderModal();
    A.toast(v === 'bot' ? 'El menú automático sigue la charla.' : 'Listo: la charla es tuya; el menú automático no responde.');
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
    const k = el.getAttribute('data-p'), p = PLANS[k], cl = A.CLINIC || 'mi consultorio';
    const txt = k === 'base' ? 'Hola! Quiero activar la Autogestión por WhatsApp de OdontoVoz en ' + cl + '.' : p ? 'Hola! Quiero contratar ' + p.name + ' (USD ' + p.usd + '/mes) de recordatorios automáticos de OdontoVoz para ' + cl + '.' : 'Hola! Quiero cambiar mi plan de recordatorios automáticos de OdontoVoz (' + cl + ').';
    const sup = A.SUPPORT || {}, num = (sup.wa && sup.wa[0]) || sup.whatsapp || '5492984513279';
    window.open('https://wa.me/' + String(num).replace(/\D/g, '') + '?text=' + encodeURIComponent(txt), '_blank', 'noopener');
  };

  function configHTML() {
    const c = cfg(), tn = !(A.CFG.online && (A.CFG.online.on === false || A.CFG.online.link === false));
    const chk = (k, t, sub) => '<label class="wa-sw"><input type="checkbox" data-chg="waCfg" data-k="' + k + '"' + (c[k] !== false ? ' checked' : '') + '><span><b>' + t + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span></label>';
    return '<div class="wa-form">' +
      chk('on', 'Menú automático encendido', 'Apagado, las charlas llegan igual y las respondés vos.') +
      chk('book', 'Que puedan sacar turno', tn ? 'Usa los mismos horarios libres y motivos que el turnero online.' : 'Primero activá el Turnero online: el menú usa esos horarios.') +
      (tn ? '' : '<button class="btn small" data-act="tnOpen">Abrir Turnero online</button>') +
      '<label class="lbl" for="waInfo">Obras sociales, precios y otros datos (lo que ve el paciente en «Obras sociales y precios»)</label><textarea id="waInfo" rows="7" data-chg="waCfg" data-k="info" maxlength="2500" placeholder="Ej.: Atendemos OSDE, Swiss Medical y particulares. La consulta particular sale $25.000. Hay estacionamiento en la esquina. Aceptamos transferencia y tarjeta. Los sábados no atendemos.">' + esc(c.info || '') + '</textarea>' +
      '<div class="hint">Se muestra tal cual. La dirección y el teléfono los toma de los datos del consultorio; los horarios, de tu agenda.</div>' +
      '<h4 class="wa-h">Recordatorios automáticos ' + (W.me && W.me.rem_plan ? '' : '<span class="wa-tag">servicio aparte</span>') + '</h4>' +
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

  /* ---------- motor del menú: lo copia node scripts/build-wa.js desde scripts/wa-menu.js (no editar acá) ---------- */
  /* >>> MENU */
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
/* <<< MENU */

  /* ---------- «Probala»: el mismo menú que ve el paciente, con botones ---------- */
  const SIM = S.waSim || (S.waSim = { msgs: [], st: null });
  const tnOn = () => !(A.CFG.online && (A.CFG.online.on === false || A.CFG.online.link === false));
  function simCtx() {
    const d = (A.tnPubData && A.tnPubData()) || {}, c = cfg(), now = new Date();
    return { clinic: A.CLINIC, addr: A.CFG.addr || d.addr, phone: A.CFG.phone || d.phone, info: c.info || '', book: c.book !== false, types: d.types || [], pros: d.pros || [], slots: d.slots || {}, today: A.today(), nowMin: now.getHours() * 60 + now.getMinutes(), now: Date.now() };
  }
  function simHTML() {
    const last = SIM.msgs.length - 1;
    return '<p class="wa-demo">Así lo ve el paciente en WhatsApp: tocá los botones o escribí. ' + (A.DEMO ? 'Los turnos que pidas se cargan en tu agenda de prueba.' : real() ? 'Si pedís un turno, entra a tu agenda como «pedido online» con la nota PRUEBA (después borralo).' + (tnOn() ? '' : ' <b>Activá el Turnero online</b> para que ofrezca horarios.') : 'Es una simulación: no se carga ningún turno.') + '</p>' +
      '<div class="wa-phone"><div class="wa-ph-top">' + WA_IC + '<b>' + esc(A.CLINIC || 'Tu consultorio') + '</b></div><div class="wa-msgs sim" id="waMsgs">' +
      (SIM.msgs.length ? '' : '<div class="wa-hint">Escribí «Hola» para empezar, o probá «quiero un turno», «¿dónde quedan?» o «BAJA».</div>') +
      SIM.msgs.map((m, i) => {
        if (m.dir === 'in') return '<div class="wa-b in">' + esc(m.text) + '</div>';
        const opts = m.buttons ? m.buttons.map(b => '<button class="wa-opt" data-act="waSimPick" data-id="' + esc(b.id) + '" data-t="' + esc(b.title) + '"' + (i < last ? ' disabled' : '') + '>' + esc(b.title) + '</button>').join('')
          : m.list ? '<div class="wa-lbtn">☰ ' + esc(m.list.button) + '</div>' + m.list.rows.map(r => '<button class="wa-opt row" data-act="waSimPick" data-id="' + esc(r.id) + '" data-t="' + esc(r.title) + '"' + (i < last ? ' disabled' : '') + '><b>' + esc(r.title) + '</b>' + (r.desc ? '<small>' + esc(r.desc) + '</small>' : '') + '</button>').join('') : '';
        return '<div class="wa-b out bot">' + esc(m.text).replace(/\n/g, '<br>') + (opts ? '<div class="wa-opts">' + opts + '</div>' : '') + '</div>';
      }).join('') + '</div>' +
      '<div class="wa-reply"><label class="sr" for="waSimTxt">Mensaje del paciente</label><input id="waSimTxt" placeholder="Escribí como paciente…" autocomplete="off"><button class="btn primary" data-act="waSimSend">Enviar</button></div></div>' +
      '<button class="btn small" data-act="waSimReset">Empezar de nuevo</button>';
  }
  const simDone = () => { A.renderModal(); setTimeout(() => { const m = $('#waMsgs'); if (m) m.scrollTop = m.scrollHeight; }, 30); };
  async function simBook(req) {
    if (A.DEMO) {
      const pat = A.addPatient({ first: req.first, last: req.last, dni: req.dni, cov: req.cov || 'Particular', pro: req.pro });
      const code = 'OV-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      const a = { id: A.uid(), pid: pat.id, pro: req.pro, date: req.date, start: req.start, dur: req.dur || 30, what: (A.TYPES[req.type] || ['Control'])[0], status: 'pendiente', online: true, wa: true, code, note: 'Pedido por WhatsApp (autogestión)' };
      A.mutate([a.date], () => { A.day(a.date).push(a); }); A.saveNow && A.saveNow();
      A.toast('Turno pedido por WhatsApp: ' + pat.name + ', ' + A.fmtShort(a.date) + ' ' + A.mm(a.start) + '.');
      return { ok: true, code };
    }
    if (!real()) return { ok: true, code: 'PRUEBA' };
    try {
      if (A.tnPublish) await A.tnPublish(true);
      const r = await CL.api('/rest/v1/rpc/ov_booking_request', { method: 'POST', body: { p_slug: A.tnSlug(), p_req: { ...req, phone: (A.waNumber && A.waNumber(A.CFG.phone || '')) || '1100000000', note: 'PRUEBA de la Autogestión por WhatsApp.' } } });
      if (r && r.ok) setTimeout(() => A.tnClaim && A.tnClaim(), 1500);
      return r || { ok: false };
    } catch (e) { return { ok: false, msg: 'No se pudo pedir (revisá que el Turnero online esté encendido).' }; }
  }
  async function simRun(inp) {
    const t = OVMenu.norm(inp.text || '');
    if (/^(baja|stop)$/.test(t)) { SIM.msgs.push({ dir: 'out', text: 'Listo, no te vamos a mandar más recordatorios por acá. Si querés volver a recibirlos, escribí ALTA.' }); return simDone(); }
    const ctx = simCtx();
    let r = OVMenu.step(SIM.st, inp, ctx);
    r.out.forEach(m => SIM.msgs.push({ dir: 'out', ...m }));
    if (r.act && r.act.book) { simDone(); const res = await simBook(r.act.book); r = OVMenu.step(r.st, { booked: res }, ctx); r.out.forEach(m => SIM.msgs.push({ dir: 'out', ...m })); }
    if (r.act && r.act.handoff) SIM.msgs.push({ dir: 'out', text: '(En la versión real, la charla pasa a la pestaña Charlas y te llega un aviso).', note: true });
    SIM.st = r.st; simDone();
  }
  A.acts.waSimSend = () => { const i = $('#waSimTxt'), t = (i && i.value || '').trim(); if (!t) return; SIM.msgs.push({ dir: 'in', text: t }); simRun({ text: t }); setTimeout(() => { const x = $('#waSimTxt'); if (x) x.focus(); }, 40); };
  A.acts.waSimPick = el => { if (el.disabled) return; SIM.msgs.push({ dir: 'in', text: el.getAttribute('data-t') }); simRun({ id: el.getAttribute('data-id') }); };
  A.acts.waSimReset = () => { SIM.msgs = []; SIM.st = null; A.renderModal(); };
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'waSimTxt') { e.preventDefault(); A.acts.waSimSend(); } if (e.key === 'Enter' && !e.shiftKey && e.target && e.target.id === 'waTxt') { e.preventDefault(); A.acts.waSend(); } });

  MF.wa = () => {
    const t = S.waTab || 'inicio';
    const body = tabsHTML(t) + '<div class="wa-body">' + (t === 'charlas' ? chatsHTML() : t === 'config' ? configHTML() : t === 'probar' ? simHTML() : homeHTML()) + '</div>';
    setTimeout(() => { const m = $('#waMsgs'); if (m) m.scrollTop = m.scrollHeight; }, 20);
    return A.modalShell('Autogestión por WhatsApp', body, '<button class="btn primary" data-act="closeModal">Cerrar</button>', true);
  };

  /* ---------- recordatorios automáticos: la app arma la cola ---------- */
  const isoAt = (d, h) => new Date(d + 'T' + A.pad(h) + ':00:00-03:00').toISOString();
  async function queue() {
    const c = cfg(); if (!active() || !W.me.rem_plan || c.rem === false || W.me.out_paused) return;
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
    ref.insertAdjacentHTML('afterend', '<button class="dnav" id="drWa" data-act="waOpen">' + WA_IC + '<span class="t">Autogestión por WhatsApp<small>Tus pacientes sacan turno solos</small></span><span class="wa-new">Nuevo</span></button>');
  }
  const arPrev = A.afterRefresh;
  A.afterRefresh = function () { if (arPrev) arPrev.apply(this, arguments); try { menu(); } catch (e) { /* nada */ } };

  /* voz: «abrí la secretaria», «abrí WhatsApp de pacientes» */
  const execPrev = A.cmd && A.cmd.exec;
  if (execPrev) A.cmd.exec = (text, o) => {
    if (/^(?:abr[ií]|ir a|mostr[aá](?:me)?|ver)\s+(?:la\s+)?(?:secretaria(?: virtual)?|autogesti[oó]n(?: por whatsapp)?|charlas de whatsapp|whatsapp de (?:los )?pacientes)\b/i.test(String(text || '').trim())) { A.acts.waOpen(); return { ok: true, msg: 'Abrí la Autogestión por WhatsApp.' }; }
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
    '.wa-opts { display: flex; flex-direction: column; gap: 4px; margin: 8px -4px -2px; } .wa-opt { border: 0; border-top: 1px solid rgba(0,0,0,.08); background: none; color: #027eb5; font: 600 14px inherit; padding: 8px 6px; cursor: pointer; text-align: center; display: flex; flex-direction: column; } .wa-opt.row { text-align: left; color: #111; } .wa-opt.row small { color: #667781; font-weight: 400; font-size: 12.5px; } .wa-opt:disabled { cursor: default; opacity: .55; } .wa-lbtn { text-align: center; color: #027eb5; font-weight: 600; font-size: 14px; padding: 6px 0 2px; border-top: 1px solid rgba(0,0,0,.08); margin-top: 8px; }',
    '[data-theme="dark"] .wa-opt { color: #53bdeb; border-color: rgba(255,255,255,.1); } [data-theme="dark"] .wa-opt.row { color: #e9edef; } [data-theme="dark"] .wa-lbtn { color: #53bdeb; border-color: rgba(255,255,255,.1); }',
    '.wa-on { width: 100%; margin-bottom: 4px; }',
    '.wa-hint { align-self: center; text-align: center; color: #54656f; font-size: 13px; background: rgba(255,255,255,.7); border-radius: 10px; padding: 8px 10px; }',
    '.wa-ctl { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin: 8px 0; font-size: 14px; color: var(--ink-2); flex-wrap: wrap; }',
    '.wa-reply { display: flex; gap: 8px; align-items: flex-end; margin-top: 8px; } .wa-reply textarea, .wa-reply input { flex: 1; min-width: 0; min-height: 44px; border-radius: 22px; padding: 10px 14px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font: inherit; resize: none; }',
    '.wa-phone { border: 1px solid var(--line); border-radius: 22px; overflow: hidden; max-width: 460px; margin: 0 auto 10px; padding-bottom: 10px; background: var(--surface); } .wa-phone .wa-reply { padding: 0 10px; }',
    '.wa-ph-top { display: flex; gap: 10px; align-items: center; background: #075e54; color: #fff; padding: 10px 14px; } .wa-ph-top svg { width: 22px; height: 22px; }',
    '.wa-phone .wa-msgs { border-radius: 0; max-height: 46vh; min-height: 280px; }',
    '.wa-form { display: flex; flex-direction: column; gap: 8px; } .wa-form .lbl { margin-top: 6px; font-weight: 600; } .wa-form input:not([type=checkbox]), .wa-form select, .wa-form textarea { min-height: 44px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); padding: 8px 12px; font: inherit; }',
    '.wa-sw { display: flex; gap: 12px; align-items: flex-start; padding: 10px 12px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); cursor: pointer; } .wa-sw input { width: 22px; height: 22px; flex: none; margin-top: 2px; accent-color: #25a35a; } .wa-sw span { display: flex; flex-direction: column; } .wa-sw small { color: var(--ink-2); }'
  ].join('\n');
  document.head.appendChild(css);
})();
