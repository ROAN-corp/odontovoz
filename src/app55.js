/* ===== 1.43: Novedades sin cansar (tarjeta única en el inicio, casilla y Ajustes › Novedades) + «Sugerencias y críticas» en Ayuda ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, MF = A.modalFns, $ = q => document.querySelector(q);
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } } };

  /* Lo nuevo, de lo más nuevo a lo más viejo. «top» = lo que va en la tarjeta (máx. 3 en total). Escribir corto y en lo que le sirve al usuario. */
  const NEWS = [
    { v: '1.50', d: '2026-11-14', items: [
      { t: 'Al cargar prácticas a un paciente con obra social elegís qué le cobrás: «No le cobro nada», coseguro, diferencial (el monto que quieras) o todo particular.', top: 1 },
      { t: 'Lo que paga la obra social queda pendiente en Caja › Obras sociales, aunque todavía no tengas su arancel cargado (lo podés escribir en el momento y se recuerda).', top: 1 }] },
    { v: '1.49.3', d: '2026-11-14', items: [
      { t: 'Cada celular y computadora guarda su copia de los datos en un espacio mucho más grande: ahora entran consultorios y centros con decenas de miles de pacientes, también sin internet.' }] },
    { v: '1.49.2', d: '2026-11-13', items: [
      { t: 'En la historia clínica, «Indicaciones» ahora se llama «Indicaciones y recetas»: arriba está el botón para hacer la receta electrónica (RCTA) y abajo las indicaciones para el paciente.', top: 1 }] },
    { v: '1.49.1', d: '2026-11-13', items: [
      { t: 'Receta electrónica: en Android, «Recetar en RCTA» abre la app de RCTA si la tenés instalada (si no, la web). Los datos del paciente quedan copiados para pegar.', top: 1 }] },
    { v: '1.49', d: '2026-11-12', items: [
      { t: 'Al cobrar: descuento o recargo libre según cómo paga (efectivo, débito, transferencia…), y cuotas con tarjeta o del consultorio. Queda asentado quién lo aplicó y cuándo.', top: 1 },
      { t: 'Presupuestos en pesos, dólares, euros o reales (también mezclados), con precio por ítem e ítems libres. Lista de precios para compartir por WhatsApp o PDF.', top: 1 },
      { t: 'Turnos de 15 minutos a 8 horas. Receta electrónica (RCTA u otra) desde la ficha, con los datos del paciente listos para pegar. Insumos: aumento contra la primera compra.', top: 1 }] },
    { v: '1.48.1', d: '2026-11-12', items: [
      { t: 'Porcentaje de cada profesional a elección, del 5% al 100% (por ejemplo 30% o 50%), también al sumarlo al centro y en cada excepción.', top: 1 }] },
    { v: '1.48', d: '2026-11-11', items: [
      { t: 'Aranceles de la Federación Odontológica de Río Negro: en Obras sociales tocá «Federación RN» y se cargan solos. Cada mes te avisamos cuando haya valores nuevos; tus coseguros los decidís vos.', top: 1 },
      { t: 'Subir precios por porcentaje (todos o por categoría) y «Costos y rentabilidad»: precios de insumos mes a mes, gastos fijos y precio sugerido para no perder margen.', top: 1 },
      { t: 'Consentimiento en papel: se imprime, se firma y se sube la foto a la historia clínica. Radiografías en PDF, arrastrando o pegando. Recepción carga sin poder borrar lo hecho.', top: 1 }] },
    { v: '1.47', d: '2026-11-11', items: [
      { t: 'La Caja abre en «Cobros del día»: el total de hoy, por medio de pago y por odontólogo, con quién cobró y qué pagó cada paciente.', top: 1 },
      { t: 'Obras sociales que pagan después (como OSOEFRNyN): lo que pagan no queda «para cobrar» al paciente; en Caja › Obras sociales ves lo que te deben por mes y marcás «Llegó el pago».', top: 1 },
      { t: 'Acuerdo de cada profesional al crearlo o editarlo: porcentaje con excepciones (ej.: 40% y Ortodoncia 60%), módulo, consultorio entero u otro. La liquidación se hace sobre lo cobrado.' }] },
    { v: '1.46.4', d: '2026-11-11', items: [
      { t: 'Cerrar sesión en un equipo ya no cierra la sesión de esa persona en sus otros equipos.', top: 1 },
      { t: 'Lo que se cobra desde la evolución usa tus precios de «Prácticas y aranceles» (por ejemplo, composite por cantidad de caras).', top: 1 }] },
    { v: '1.46.3', d: '2026-11-11', items: [
      { t: 'Si escribís un pago en la evolución («hoy paga 130.000 de 150.000 que debía»), la app te ofrece registrar el cobro con un toque y te dice cuánto queda debiendo.', top: 1 },
      { t: 'Si alguien después carga el mismo cobro a mano, la app avisa que ya está y no se duplica.', top: 1 }] },
    { v: '1.46.2', d: '2026-11-11', items: [
      { t: 'En un centro, cada odontólogo del equipo ve todas las agendas pero solo cambia la suya, y le llegan solo los avisos de sus pacientes.', top: 1 }] },
    { v: '1.46.1', d: '2026-11-11', items: [
      { t: 'Arreglado: con varios equipos abiertos la pantalla parpadeaba y se sincronizaba de más.', top: 1 }] },
    { v: '1.46', d: '2026-11-11', items: [
      { t: 'Tus datos se respaldan en tres lugares: la nube, una copia cifrada cada noche en otra empresa y un disco nuestro. Lo ves en Ajustes › Copia de seguridad.', top: 1 },
      { t: 'En el celular, los avisos llegan aunque la app esté cerrada (llegó un paciente, cancelaciones, notas, stock bajo y turnos online).', top: 1 }] },
    { v: '1.45.4', d: '2026-11-11', items: [
      { t: 'Turnero online: los pacientes reservan como máximo 30 minutos, y cada día dice claro cuántos «turnos libres» quedan.', top: 1 }] },
    { v: '1.45.3', d: '2026-11-11', items: [
      { t: 'Los equipos se enteran al instante de lo que hace otro (por ejemplo, cuando recepción marca que llegó un paciente).', top: 1 }] },
    { v: '1.45.2', d: '2026-11-11', items: [
      { t: 'La sesión ya no se cierra sola: queda abierta hasta que toques «Cerrar sesión» (al ingresar podés elegirlo).', top: 1 },
      { t: 'En el celular, los avisos (llegó un paciente, stock, laboratorio, turnos online…) aparecen arriba, en la barra de notificaciones, como un mensaje de WhatsApp.', top: 1 }] },
    { v: '1.45.1', d: '2026-11-11', items: [
      { t: 'Si hiciste la mudanza desde Bilog: Ajustes › Mudanza › «Revisar una mudanza ya hecha» comprueba que cada evolución esté en la ficha correcta y corrige lo que no.', top: 1 }] },
    { v: '1.45', d: '2026-11-11', items: [
      { t: 'Queda registrado qué usuario cargó, cambió o anuló cada cosa (Historial de cambios en el menú ⋮ del paciente).', top: 1 },
      { t: '¿Paciente repetido? Menú ⋮ › «Unir con otra ficha»: junta todo en una sola, sin perder nada.', top: 1 },
      { t: 'Al crear un paciente podés tildar «Es de prueba»: esos se borran del todo. Los reales se archivan.' }] },
    { v: '1.44', d: '2026-11-09', items: [
      { t: 'Odontograma: lo que marcás en rojo al revisar al paciente queda como «ya lo tenía» y no se cobra. Si lo hiciste vos hoy, elegí «Lo hice yo hoy» o decí «hice…».', top: 1 }] },
    { v: '1.43', d: '2026-11-09', items: [
      { t: 'Ajustes › Ayuda › «Sugerencias y críticas»: contanos qué mejorarías, lo leemos todo.', top: 1 },
      { t: 'Ajustes › Novedades: la lista de lo nuevo de cada versión.' }] },
    { v: '1.42', d: '2026-11-09', items: [
      { t: 'Lo que escribís en la evolución («hice restauración en 25») se marca solo en el odontograma.', top: 1 },
      { t: 'Lo que dejás para la próxima («la próx 24») queda planificado en azul, sin cobrar.' }] },
    { v: '1.41', d: '2026-11-09', items: [
      { t: 'Las evoluciones traídas de otro sistema se pueden pasar al odontograma: «Ver y pasar» en el odontograma del paciente.', top: 1 },
      { t: 'Si cambiás de consultorio sin internet, la app te avisa en vez de perder lo que no se guardó.' }] },
    { v: '1.40', d: '2026-11-09', items: [
      { t: 'Mudanza gratis: traé pacientes, turnos y evoluciones desde Bilog u otro sistema (Ajustes › Mudanza).', top: 1 },
      { t: 'Ajustes › Equipo e invitaciones, para sumar odontólogos y recepción.' },
      { t: 'Más seguridad al usar la app en varios equipos y en varios consultorios.' }] }
  ];
  const vnum = v => String(v || '0').split('.').map(n => +n || 0).reduce((s, n, i) => s + n * Math.pow(1000, 2 - i), 0);
  const LATEST = NEWS[0].v;
  const KEY = 'odontovoz.newsSeen';
  /* el primer uso de esta función en un equipo: se toma como visto lo anterior a 1.40 (no se muestra la historia entera) */
  if (!LS.get(KEY, '')) LS.set(KEY, '1.39.9');
  const unseen = () => { const seen = vnum(LS.get(KEY, '0')); return NEWS.filter(n => vnum(n.v) > seen); };

  /* ---------- tarjeta en el inicio: una sola, aunque haya varias versiones nuevas ---------- */
  const card = () => {
    const v = document.getElementById('view-inicio'); if (!v || S.tab !== 'inicio') return;
    const old = v.querySelector('.nw-card'), un = unseen();
    if (!un.length) { if (old) old.remove(); return; }
    if (old) return;
    const tops = []; un.forEach(n => n.items.forEach(i => { if (i.top && tops.length < 3) tops.push(i.t); }));
    un.forEach(n => n.items.forEach(i => { if (tops.length < 3 && tops.indexOf(i.t) < 0) tops.push(i.t); }));
    const n = un.reduce((s, x) => s + x.items.length, 0);
    const d = document.createElement('section'); d.className = 'nw-card'; d.setAttribute('aria-label', 'Novedades');
    d.innerHTML = '<button class="nw-x" data-act="nwSeen" aria-label="Cerrar novedades">×</button><b class="nw-h">Novedades' + (n > 1 ? ' · ' + n + ' mejoras' : '') + '</b><ul>' + tops.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' +
      '<div class="nw-b"><button class="btn small" data-act="newsOpen">Ver todo</button><button class="btn small ghost" data-act="fbOpen">Dejar una sugerencia</button></div>';
    const hi = v.querySelector('.home-hi'), host = v.querySelector('.home') || v;
    if (hi && hi.parentNode) hi.parentNode.insertBefore(d, hi.nextSibling); else host.insertBefore(d, host.firstChild);
  };
  const quietInbox = () => {
    if (!A.nfAdd) return;
    unseen().forEach(n => { A.nfAdd({ id: 'news:' + n.v, k: 'info', t: 'Novedades de la versión ' + n.v, b: n.items[0].t, act: 'newsOpen', at: n.d + 'T12:00:00' }); if (A.nfRead) A.nfRead('news:' + n.v); });   /* queda en la casilla, sin globito */
  };
  A.afterRefresh = (prev => function () { const r = prev && prev.apply(this, arguments); try { card(); } catch (e) { /* nada */ } return r; })(A.afterRefresh);
  try { new MutationObserver(() => { try { card(); } catch (e) { /* nada */ } }).observe(document.getElementById('view-inicio') || document.body, { childList: true }); } catch (e) { /* nada */ }
  setTimeout(() => { try { quietInbox(); card(); } catch (e) { /* nada */ } }, 1500);
  A.acts.nwSeen = () => { LS.set(KEY, LATEST); if (A.nfRead) unseen().concat(NEWS).forEach(n => { try { A.nfRead('news:' + n.v); } catch (e) { /* nada */ } }); const c = $('.nw-card'); if (c) c.remove(); };

  /* ---------- Ajustes › Novedades ---------- */
  MF.news = () => {
    const seen = vnum(LS.get(KEY, '0'));
    const b = '<div class="nw-list">' + NEWS.map(n => '<section class="nw-v' + (vnum(n.v) > seen ? ' new' : '') + '"><h3>Versión ' + esc(n.v) + (vnum(n.v) > seen ? ' <span class="nw-dot">nuevo</span>' : '') + '</h3><ul>' + n.items.map(i => '<li>' + esc(i.t) + '</li>').join('') + '</ul></section>').join('') + '</div>' +
      '<p class="hint">¿Algo de esto no anda como esperabas? <button class="linkbtn" data-act="fbOpen">Contanos acá</button>.</p>';
    return A.modalShell('Novedades', b, '<button class="btn primary" data-act="newsClose">Listo</button>');
  };
  A.acts.newsOpen = () => { if (A.hideDrawer) A.hideDrawer(); S.modal = { type: 'news' }; A.renderModal(); };
  A.acts.newsClose = () => { A.acts.nwSeen(); S.modal = null; A.renderModal(); };

  /* ---------- Ajustes › Ayuda › Sugerencias y críticas ---------- */
  const KINDS = [['sugerencia', 'Idea o sugerencia'], ['critica', 'Crítica'], ['problema', 'Algo no anda'], ['felicitacion', 'Me gustó']];
  MF.fbBox = () => {
    const f = S.fbF || (S.fbF = { kind: 'sugerencia', text: '', sent: false });
    let b;
    if (f.sent) b = '<p><b>¡Gracias!</b> Lo leemos nosotros, Rodrigo y Angel. Cada comentario nos ayuda a decidir qué mejorar primero.</p><button class="btn small" data-act="fbAgain">Mandar otro</button>';
    else b = '<p class="hint" style="margin-top:0">Escribí lo que quieras: qué te falta, qué te molesta, qué cambiarías o qué te gustó. Las críticas también suman. Lo leemos todo.</p>' +
      '<div class="seg fb-seg" role="group" aria-label="Tipo de comentario">' + KINDS.map(x => '<button data-act="fbKind" data-k="' + x[0] + '" aria-pressed="' + (f.kind === x[0]) + '">' + x[1] + '</button>').join('') + '</div>' +
      '<label class="sr" for="fbTxt">Comentario</label><textarea id="fbTxt" class="inp" rows="6" maxlength="2000" placeholder="Escribí acá…">' + esc(f.text) + '</textarea>' +
      '<div class="hint" id="fbMsg"></div><p class="hint">Si es algo urgente que no te deja trabajar, escribinos por WhatsApp desde «Ayuda y soporte».</p>';
    return A.modalShell('Sugerencias y críticas', b, f.sent ? '<button class="btn primary" data-act="closeModal">Listo</button>' : '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="fbSend">Enviar</button>');
  };
  A.acts.fbOpen = () => { if (A.hideDrawer) A.hideDrawer(); S.fbF = S.fbF && !S.fbF.sent ? S.fbF : { kind: 'sugerencia', text: '', sent: false }; S.modal = { type: 'fbBox' }; A.renderModal(); };
  /* la base acepta sugerencia/problema/felicitacion/otro: la crítica viaja como «otro» con su etiqueta */
  const sendPrev = A.acts.fbSend;
  A.acts.fbSend = function () {
    const f = S.fbF, ta = $('#fbTxt');
    if (f && f.kind === 'critica' && ta && ta.value.trim() && !/^\[Crítica\]/.test(ta.value)) { ta.value = '[Crítica] ' + ta.value.trim(); f.kind = 'otro'; const r = sendPrev.apply(this, arguments); f.kind = 'critica'; return r; }
    return sendPrev.apply(this, arguments);
  };

  /* ---------- entradas en el menú (y por lo tanto en Ajustes › Ayuda) ---------- */
  const SVG_N = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.4 7.2 17.9l.9-5.4L4.2 8.7l5.4-.8z"/></svg>';
  const SVG_F = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/></svg>';
  const mountMenu = () => {
    const sup = document.querySelector('#gearMenu .dnav[data-act="supportOpen"]'); if (!sup || document.querySelector('#gearMenu .dnav[data-act="fbOpen"]')) return;
    sup.insertAdjacentHTML('beforebegin', '<button class="dnav" data-act="newsOpen">' + SVG_N + '<span class="t">Novedades</span></button><button class="dnav" data-act="fbOpen">' + SVG_F + '<span class="t">Sugerencias y críticas</span></button>');
  };
  mountMenu(); setTimeout(mountMenu, 800);

  const css = document.createElement('style');
  css.textContent = '.nw-card{position:relative;border:1px solid var(--line,#d6e2e2);background:var(--card,#fff);border-radius:16px;padding:12px 40px 12px 14px;margin:10px 0 12px;box-shadow:0 1px 0 rgba(0,0,0,.02)}' +
    '.nw-card .nw-h{display:block;font-size:14px;margin-bottom:4px;color:var(--accent,#0b6b6f)}.nw-card ul{margin:0;padding-left:18px;font-size:14px;line-height:1.4}.nw-card li{margin:2px 0}' +
    '.nw-card .nw-x{position:absolute;top:6px;right:8px;width:30px;height:30px;border:0;background:transparent;font-size:20px;line-height:1;color:var(--muted,#567);cursor:pointer;border-radius:8px}' +
    '.nw-card .nw-b{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
    '.nw-list .nw-v{border-bottom:1px solid var(--line,#e3ecec);padding:4px 0 8px}.nw-list h3{font-size:15px;margin:8px 0 4px}.nw-list ul{margin:0;padding-left:18px}.nw-list li{margin:3px 0}' +
    '.nw-dot{display:inline-block;font-size:11px;font-weight:800;background:#f6c453;color:#08484b;border-radius:999px;padding:1px 8px;margin-left:6px;vertical-align:middle}' +
    '.linkbtn{border:0;background:none;padding:0;color:var(--accent,#0b6b6f);text-decoration:underline;font:inherit;cursor:pointer}' +
    '.fb-seg{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.fb-seg button{flex:1 1 auto}';
  document.head.appendChild(css);
})();
