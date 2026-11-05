/* ===== v6.2: ficha a un toque, WhatsApp al paciente, calendario en la web, laboratorios con precios, pantalla encendida, voz más comprensiva, alta por voz ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, C = window.OVCmd, V = A.voice;
  A.VERSION = '6.2';
  const N = s => A.norm(s);
  const num = v => parseInt(String(v == null ? '' : v).replace(/\D/g, ''), 10) || 0;
  const WA_IC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 12 12 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.2z"/></svg>';

  /* =====================================================================
     WHATSAPP AL NÚMERO DEL PACIENTE (formato internacional de Argentina: 54 9 + área + número, sin 0 ni 15)
     ===================================================================== */
  A.waNumber = phone => {
    let d = String(phone || '').replace(/\D/g, ''); if (!d) return '';
    if (d.indexOf('00') === 0) d = d.slice(2);
    if (d.indexOf('54') === 0 && d.length >= 12) { d = d.slice(2); if (d.charAt(0) === '9') d = d.slice(1); }
    if (d.charAt(0) === '0') d = d.slice(1);
    if (d.length === 12) { for (const al of [2, 3, 4]) if (d.substr(al, 2) === '15') { d = d.slice(0, al) + d.slice(al + 2); break; } }
    if (d.length !== 10) return d.length > 10 ? d : '';
    return '549' + d;
  };
  A.waLink = (phone, text) => { const n = A.waNumber(phone); return n ? 'https://wa.me/' + n + '?text=' + encodeURIComponent(text || '') : ''; };
  A.waBtnHTML = a => (a.pid && a.status !== 'cancelado' && a.status !== 'atendido' && a.status !== 'ausente' ? '<button class="wab' + (a.rem === 'enviado' || a.rem === 'confirmo' ? ' sent' : '') + '" data-act="waAppt" data-id="' + a.id + '" aria-label="Recordatorio por WhatsApp" title="Recordatorio por WhatsApp' + (a.rem === 'enviado' ? ' (ya enviado)' : '') + '">' + WA_IC + '</button>' : '');
  A.acts.waAppt = (el, ev) => {
    if (ev) ev.stopPropagation();
    const a = A.apptById(el.getAttribute('data-id')), p = A.PAT(a.pid), url = A.waLink(p.phone, A.reminderText(a));
    if (!url) { A.toast(p.name + ' no tiene un teléfono válido. Cargalo en su ficha (con código de área, ej. 299 4123456).'); return; }
    window.open(url, '_blank', 'noopener');
    if (a.rem !== 'confirmo') A.mutate([a.date], () => { a.rem = 'enviado'; }, 'Recordatorio enviado a ' + p.name + '.');
    A.refresh();
  };

  /* =====================================================================
     PANEL DEL PACIENTE Y DEL TURNO: «Ficha completa» arriba, al lado del nombre; WhatsApp con el número correcto
     ===================================================================== */
  const origPanel = A.renderPanel;
  A.renderPanel = () => {
    origPanel();
    const p = S.panel; if (!p) return;
    const pid = p.type === 'pat' ? p.pid : (A.apptById(p.id) || {}).pid; if (!pid) return;
    const sub = $('#panelHost .panel-head .sub');
    if (sub && !$('#panelHost .fc-btn')) sub.insertAdjacentHTML('afterend', '<button class="fc-btn" data-act="openFicha" data-pid="' + pid + '">Ficha completa ›</button>');
    A.$$('#panelHost a[href^="https://wa.me/?text="]').forEach(x => {
      const a = p.type === 'appt' ? A.apptById(p.id) : null, url = a ? A.waLink(A.PAT(pid).phone, A.reminderText(a)) : '';
      if (url) x.href = url; else { x.removeAttribute('href'); x.setAttribute('data-act', 'waNoPhone'); }
    });
  };
  A.acts.waNoPhone = () => A.toast('Falta un teléfono válido en la ficha del paciente (con código de área).');

  /* =====================================================================
     WEB EN LA PC: todo el ancho y calendario del mes en la agenda (solo web, pantallas anchas)
     ===================================================================== */
  const isWeb = () => !window.OV_NATIVE;
  const wide = () => isWeb() && (window.innerWidth || 0) >= 1100;
  document.body.classList.toggle('web', isWeb());
  function miniCal() {
    const m0 = S.calM || S.date.slice(0, 7), first = m0 + '-01', d0 = A.parse(first), today = A.today();
    const start = A.add(first, -((d0.getDay() + 6) % 7)), pros = A.visPros();
    let h = '<div class="mc-head"><button class="btn small" data-act="agCalMon" data-n="-1" aria-label="Mes anterior">‹</button><b>' + esc(A.cap(d0.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }))) + '</b><button class="btn small" data-act="agCalMon" data-n="1" aria-label="Mes siguiente">›</button></div>';
    h += '<div class="mc-grid">' + ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'].map(x => '<span class="mc-dw">' + x + '</span>').join('');
    for (let i = 0; i < 42; i++) {
      const k = A.add(start, i), out = k.slice(0, 7) !== m0; if (i >= 35 && out) break;
      const n = A.day(k).filter(a => a.type !== 'block' && a.status !== 'cancelado' && pros.some(p => p.id === a.pro)).length;
      h += '<button class="mc-d' + (out ? ' out' : '') + (k === today ? ' today' : '') + (k === S.date ? ' sel' : '') + '" data-act="agGoDay" data-date="' + k + '" aria-label="' + esc(A.fmtLong(k) + (n ? ': ' + n + ' turnos' : '')) + '">' + '<span class="mc-n">' + A.parse(k).getDate() + '</span>' + (n ? '<small class="mc-t">' + n + 't</small>' : '') + '</button>';
    }
    h += '</div>';
    const l = A.day(S.date).filter(a => a.type !== 'block' && a.status !== 'cancelado' && pros.some(p => p.id === a.pro));
    const free = pros.reduce((s, p) => s + (A.freeSlots ? A.freeSlots(p, S.date).length : 0), 0);
    h += '<div class="mc-sum"><b>' + l.length + '</b> turnos · <b class="ok">' + free + '</b> disponibles</div>';
    h += '<div class="mc-pros">' + pros.map(p => '<span><b class="pdot" style="background:' + p.color + '"></b>' + esc(p.name) + '</span>').join('') + '</div>';
    return h;
  }
  A.acts.agCalMon = el => { const m = S.calM || S.date.slice(0, 7), d = new Date(+m.slice(0, 4), +m.slice(5) - 1 + parseInt(el.getAttribute('data-n'), 10), 1); S.calM = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); A.render.agenda(); };
  const origAgenda = A.render.agenda;
  A.render.agenda = () => {
    origAgenda();
    const host = $('#view-agenda'); if (!host || !wide()) return;
    if (S.calM && S.calM !== S.date.slice(0, 7) && S._calDate !== S.date) S.calM = null; S._calDate = S.date;
    const kids = Array.from(host.childNodes), main = document.createElement('div'), side = document.createElement('aside');
    main.className = 'ag-main'; side.className = 'ag-side card'; side.setAttribute('aria-label', 'Calendario del mes');
    kids.forEach(k => main.appendChild(k)); side.innerHTML = miniCal();
    const wrap = document.createElement('div'); wrap.className = 'ag-split'; wrap.appendChild(main); wrap.appendChild(side); host.appendChild(wrap);
  };
  window.addEventListener('resize', (() => { let w = wide(), t = null; return () => { clearTimeout(t); t = setTimeout(() => { if (wide() !== w) { w = wide(); if (S.tab === 'agenda') A.render.agenda(); } }, 200); }; })());

  /* =====================================================================
     LABORATORIOS COMO FICHAS: mecánico dental, teléfono y lista de prácticas con precios;
     en cada paciente: laboratorio + práctica + costo + precio al paciente + lo que abonó
     ===================================================================== */
  const labs = () => A.labDir();
  const labBy = name => labs().filter(x => N(x.name) === N(name))[0] || null;
  MF.labDir = () => {
    const l = labs();
    return A.modalShell('Mis laboratorios', '<p class="hint">Cargá cada laboratorio con su mecánico dental, teléfono y la lista de trabajos con sus precios. Después, en la ficha del paciente, elegís laboratorio y trabajo y el costo se completa solo.</p>' +
      (l.length ? '<div class="os-list">' + l.map(x => '<button class="os-row" data-act="labOne" data-id="' + x.id + '"><span class="os-n"><b>' + esc(x.name) + '</b><small>' + esc([x.mech ? 'Mecánico: ' + x.mech : '', x.phone || ''].filter(Boolean).join(' · ') || 'Sin datos de contacto') + '</small></span><span class="os-c"><small>' + ((x.items || []).length ? (x.items || []).length + ' trabajos con precio' : 'sin precios') + '</small></span></button>').join('') + '</div>' : '<div class="empty">Todavía no cargaste laboratorios.</div>'),
      '<button class="btn" data-act="labDirAdd">+ Agregar laboratorio</button><button class="btn primary" data-act="osBack">Listo</button>');
  };
  A.acts.labDirAdd = () => { const x = { id: A.uid(), name: 'Laboratorio nuevo', mech: '', phone: '', addr: '', notes: '', items: [] }; labs().push(x); A.save(); S.modal = { type: 'labOne', id: x.id, back: S.modal }; A.renderModal(); };
  A.acts.labOne = el => { S.modal = { type: 'labOne', id: el.getAttribute('data-id'), back: S.modal }; A.renderModal(); };
  MF.labOne = m => {
    const x = labs().filter(l => l.id === m.id)[0]; if (!x) return '';
    x.items = x.items || [];
    const F = (k, l, ph, t) => '<div class="field"><label>' + l + '</label><input data-chg="labOneF" data-lab="' + x.id + '" data-f="' + k + '" value="' + esc(x[k] || '') + '" placeholder="' + esc(ph || '') + '"' + (t ? ' inputmode="' + t + '"' : '') + '></div>';
    let b = '<div class="row2">' + F('name', 'Nombre del laboratorio', 'Ej.: Laboratorio Dental Sur') + F('mech', 'Mecánico dental', 'Ej.: Jorge Martínez') + '</div><div class="row2">' + F('phone', 'Teléfono / WhatsApp', 'Ej.: 299 4123456', 'tel') + F('addr', 'Dirección o datos de pago', '') + '</div>';
    b += '<div class="block"><h3>Trabajos y precios</h3><div class="lab-items">' + x.items.map(it => '<div class="lab-it"><input data-chg="labItF" data-lab="' + x.id + '" data-it="' + it.id + '" data-f="name" value="' + esc(it.name) + '" aria-label="Trabajo"><input inputmode="numeric" data-chg="labItF" data-lab="' + x.id + '" data-it="' + it.id + '" data-f="price" value="' + (it.price || '') + '" placeholder="$" aria-label="Precio"><button class="x" data-act="labItDel" data-lab="' + x.id + '" data-it="' + it.id + '" aria-label="Quitar">×</button></div>').join('') + '</div>' +
      '<div class="row-btns"><button class="btn small" data-act="labItAdd" data-lab="' + x.id + '">+ Agregar trabajo</button>' + (x.items.length ? '' : '<button class="btn small ghost" data-act="labItSeed" data-lab="' + x.id + '">Cargar lista típica</button>') + '</div></div>';
    b += '<div class="field"><label>Notas</label><textarea data-chg="labOneF" data-lab="' + x.id + '" data-f="notes">' + esc(x.notes || '') + '</textarea></div>';
    return A.modalShell(x.name, b, '<button class="btn danger" data-act="labOneDel" data-lab="' + x.id + '">Quitar</button><button class="btn primary" data-act="osBack">Listo</button>', true);
  };
  const LAB_OF = el => labs().filter(l => l.id === el.getAttribute('data-lab'))[0];
  A.chg.labOneF = el => { const x = LAB_OF(el); if (!x) return; x[el.getAttribute('data-f')] = el.value.trim(); A.save(); };
  A.chg.labItF = el => { const x = LAB_OF(el); if (!x) return; const it = x.items.filter(i => i.id === el.getAttribute('data-it'))[0]; if (!it) return; const f = el.getAttribute('data-f'); it[f] = f === 'price' ? num(el.value) : el.value.trim(); if (f === 'price') el.value = it.price || ''; A.save(); };
  A.acts.labItAdd = el => { const x = LAB_OF(el); x.items.push({ id: A.uid(), name: '', price: 0 }); A.save(); A.renderModal(); const ins = A.$$('.lab-it input[data-f="name"]'); if (ins.length) ins[ins.length - 1].focus(); };
  A.acts.labItDel = el => { const x = LAB_OF(el); x.items = x.items.filter(i => i.id !== el.getAttribute('data-it')); A.save(); A.renderModal(); };
  A.acts.labItSeed = el => { const x = LAB_OF(el); ['Corona metal-cerámica', 'Corona de zirconio', 'Corona de disilicato de litio', 'Perno muñón colado', 'Corona provisoria', 'Prótesis completa', 'Prótesis parcial acrílica', 'Prótesis parcial cromo-cobalto', 'Compostura / agregado', 'Placa miorrelajante'].forEach(n => x.items.push({ id: A.uid(), name: n, price: 0 })); A.save(); A.renderModal(); };
  A.acts.labOneDel = el => { const x = LAB_OF(el); A.CFG.labs = labs().filter(l => l !== x); A.save(); A.acts.osBack(); };

  /* formulario del trabajo del paciente: laboratorio y trabajo desde la lista, con precios y lo abonado */
  const origLabEditMF = MF.labEdit;
  MF.labEdit = m => {
    let h = origLabEditMF(m);
    const f = m.f, l = labBy(f.lab), items = (l && l.items) || [];
    const labSel = '<div class="field"><label for="lbLabSel">Laboratorio</label><select id="lbLabSel" data-chg="lbLabSel">' + (labs().length ? '' : '<option value="">(cargá tus laboratorios)</option>') + labs().map(x => '<option' + (l === x ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '<option value="__new">+ Laboratorio nuevo…</option></select><input id="lbLab" type="hidden" value="' + esc(f.lab || '') + '"></div>';
    h = h.replace(/<div class="field"><label for="lbLab">Laboratorio<\/label><input id="lbLab"[\s\S]*?<\/datalist><\/div>/, labSel);
    if (items.length) h = h.replace('<div class="row2"><div class="field"><label for="lbKind">', '<div class="field"><label for="lbItem">Trabajo del laboratorio</label><select id="lbItem" data-chg="lbItem"><option value="">Elegí de la lista de ' + esc(l.name) + '</option>' + items.map(it => '<option value="' + it.id + '"' + (N(it.name) === N(f.work) ? ' selected' : '') + '>' + esc(it.name) + (it.price ? ' · ' + A.money(it.price) : '') + '</option>').join('') + '</select></div><div class="row2"><div class="field"><label for="lbKind">');
    h = h.replace('<label class="chk"><input type="checkbox" id="lbPaid"', '<div class="block lab-money"><h3>Precios</h3><div class="row3"><div class="field"><label for="lbCost2">Costo del laboratorio</label><input id="lbCost2" inputmode="numeric" data-in="lbCalc" value="' + (f.cost || '') + '"></div><div class="field"><label for="lbPrice">Precio al paciente</label><input id="lbPrice" inputmode="numeric" data-in="lbCalc" value="' + (f.pricePat || '') + '"></div><div class="field"><label for="lbPaidPat">El paciente abonó</label><input id="lbPaidPat" inputmode="numeric" data-in="lbCalc" value="' + (f.paidPat || '') + '"></div></div><div id="lbSaldo" class="hint" style="margin:0"></div></div><label class="chk"><input type="checkbox" id="lbPaid"');
    h = h.replace(/<div class="field"><label for="lbCost">Costo del laboratorio<\/label><input id="lbCost"[^>]*><\/div>/, '<input id="lbCost" type="hidden" value="' + (f.cost || '') + '">');
    return h;
  };
  A.modalAfter = A.modalAfter || {};
  A.modalAfter.labEdit = () => A.ins.lbCalc();
  A.ins.lbCalc = () => {
    const c = num(($('#lbCost2') || {}).value), p = num(($('#lbPrice') || {}).value), pa = num(($('#lbPaidPat') || {}).value), o = $('#lbSaldo'); if (!o) return;
    const hc = $('#lbCost'); if (hc) hc.value = c || '';
    o.innerHTML = (p ? 'Saldo del paciente: <b>' + A.money(Math.max(0, p - pa)) + '</b>' + (pa > p ? ' (pagó de más ' + A.money(pa - p) + ')' : '') : 'Cargá el precio al paciente para ver el saldo.') + (p && c ? ' · Ganancia: <b>' + A.money(p - c) + '</b>' : '');
  };
  A.chg.lbLabSel = el => {
    const f = S.modal.f; f.work = ($('#lbWork') || {}).value || f.work;
    keepLabMoney();
    if (el.value === '__new') { const x = { id: A.uid(), name: 'Laboratorio nuevo', mech: '', phone: '', addr: '', notes: '', items: [] }; labs().push(x); A.save(); f.lab = x.name; S.modal = { type: 'labOne', id: x.id, back: S.modal }; A.renderModal(); return; }
    f.lab = el.value; A.renderModal();
  };
  A.chg.lbItem = el => {
    const f = S.modal.f, l = labBy(f.lab), it = l && l.items.filter(i => i.id === el.value)[0]; if (!it) return;
    keepLabMoney(); f.work = it.name; if (it.price) f.cost = it.price;
    const all = { 'Prótesis fija': /corona|incrust|carilla|perno|puente|implante/i, 'Prótesis removible': /protesis|completa|parcial|flexible|sobredent|compostura|rebasad/i };
    Object.keys(all).forEach(k => { if (all[k].test(it.name)) f.kind = k; });
    A.renderModal();
  };
  function keepLabMoney() { const f = S.modal.f; ['lbTeeth:teeth', 'lbMat:material', 'lbShade:shade', 'lbNotes:notes', 'lbSent:sent', 'lbDue:due', 'lbRecv:recv'].forEach(x => { const [id, k] = x.split(':'); const e = $('#' + id); if (e) f[k] = e.value; }); f.cost = num(($('#lbCost2') || {}).value) || f.cost; f.pricePat = num(($('#lbPrice') || {}).value); f.paidPat = num(($('#lbPaidPat') || {}).value); }
  const origLabSave = A.acts.labSave;
  A.acts.labSave = () => {
    const f = S.modal.f; f.pricePat = num(($('#lbPrice') || {}).value); f.paidPat = num(($('#lbPaidPat') || {}).value);
    const sel = $('#lbLabSel'); if (sel && sel.value && sel.value !== '__new') { const h = $('#lbLab'); if (h) h.value = sel.value; }
    origLabSave();
  };
  /* resumen de plata en la pestaña del paciente */
  const origLabTab = A.render.labTab;
  A.render.labTab = pid => {
    let h = origLabTab(pid);
    const l = A.pd(pid).labs.filter(x => x.status !== 'cancelado'), price = l.reduce((s, x) => s + (x.pricePat || 0), 0), paid = l.reduce((s, x) => s + (x.paidPat || 0), 0), cost = l.reduce((s, x) => s + (x.cost || 0), 0);
    if (l.length && (price || cost)) h = h.replace('<div class="lab-list">', '<div class="stats"><div class="stat"><b>' + A.money(price) + '</b>precio al paciente</div><div class="stat"><b>' + A.money(paid) + '</b>abonó</div><div class="stat"><b' + (price - paid > 0 ? ' class="saldo-pos"' : '') + '>' + A.money(Math.max(0, price - paid)) + '</b>saldo</div><div class="stat"><b>' + A.money(cost) + '</b>costo laboratorio</div></div><div class="lab-list">');
    return h.replace('Trabajos de laboratorio <span', 'Laboratorios del paciente <span');
  };

  /* =====================================================================
     PANTALLA ENCENDIDA MIENTRAS LA VOZ ESTÁ ACTIVA
     ===================================================================== */
  let wl = null, awake = false;
  const KA = () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.KeepAwake) || null;
  async function setAwake(on) {
    if (on === awake) return; awake = on;
    try {
      const k = KA();
      if (k) { if (on) await k.keepAwake(); else await k.allowSleep(); return; }
      if (on && navigator.wakeLock) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener && wl.addEventListener('release', () => { wl = null; }); }
      if (!on && wl) { await wl.release(); wl = null; }
    } catch (e) { awake = false; }
  }
  setInterval(() => setAwake(!!(V && V.on)), 1500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && V && V.on) { awake = false; setAwake(true); } });

  /* =====================================================================
     VOZ MÁS COMPRENSIVA: varias versiones de lo escuchado, errores típicos del reconocedor y nombres parecidos
     ===================================================================== */
  const FIX = [[/\bcarie\b/g, 'caries'], [/\bcarias\b/g, 'caries'], [/\bo ?clusal(?:es)?\b|\boclusar\b|\bo cluso\b/g, 'oclusal'], [/\bme ?cial\b|\bmecial\b/g, 'mesial'], [/\bdis ?tal\b/g, 'distal'],
    [/\bvesti ?bular\b|\bbestibular\b/g, 'vestibular'], [/\bpala ?tino\b/g, 'palatino'], [/\bcomposi?t\b|\bcomposite\b|\bcomposites\b|\bcompo sit\b/g, 'composite'], [/\bodonto ?grama\b|\bodontogramas\b|\bodontográfica\b/g, 'odontograma'],
    [/\bpieza (?:numero |nro )?/g, 'pieza '], [/\bel diente\b/g, 'el'], [/\bendo ?doncia\b/g, 'endodoncia'], [/\bimplantes?\b/g, 'implante'], [/\bamal ?gama\b/g, 'amalgama'], [/\bextrac?ion\b|\bextracion\b/g, 'extraccion'],
    [/\bhistoria clinica\b|\bhistoria clínica\b/g, 'historia clinica'], [/\bagendar?le\b/g, 'agendale'], [/\bde ?ene ?i\b|\bdeni\b/g, 'dni']];
  A.fixAsr = t => { let s = String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); FIX.forEach(f => { s = s.replace(f[0], f[1]); }); return s.replace(/\s+/g, ' ').trim(); };
  /* entre las versiones que da el reconocedor, se queda con la que tiene sentido para la app */
  A.pickAlt = alts => {
    if (!alts || alts.length < 2) return alts && alts[0];
    const onOdon = S.tab === 'ficha' && S.fichaTab === 'odon', hands = V.on && V.mode === 'hands';
    let best = alts[0], bs = -1;
    alts.forEach((a, i) => {
      const w = C.stripWake(A.fixAsr(a)), rest = w.rest || '';
      let s = -i * 0.3; if (hands && w.woke) s += 3;
      let pr = null; try { pr = C.parse(rest, { today: A.today(), pros: A.PROS }); } catch (e) { /* nada */ }
      if (pr && pr.intent !== 'unknown') s += 2;
      if (onOdon && A.P.parse(rest).actions.length) s += 2.5;
      if (pr && pr.name && A.searchPats(pr.name, 1).length) s += 1;
      if (s > bs) { bs = s; best = a; }
    });
    return best;
  };
  /* búsqueda de pacientes tolerante: «Gonsales» encuentra a «González», «Baldes» a «Valdez» */
  const phon = w => N(w).replace(/h/g, '').replace(/v/g, 'b').replace(/z|c(?=[ei])|x/g, 's').replace(/ll|y(?=[aeiou])/g, 'y').replace(/qu|c(?=[aou])|k/g, 'k').replace(/g(?=[ei])|j/g, 'j').replace(/(.)\1+/g, '$1').replace(/s\b/g, '');
  function lev(a, b) { if (Math.abs(a.length - b.length) > 2) return 9; const d = []; for (let i = 0; i <= a.length; i++) { d[i] = [i]; for (let j = 1; j <= b.length; j++) d[i][j] = i ? Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) : j; } return d[a.length][b.length]; }
  const origSearch = A.searchPats;
  A.searchPats = (q, limit) => {
    const r = origSearch(q, limit); if (r.length || !q || /\d/.test(q)) return r;
    const qt = N(q).split(/\s+/).filter(w => w.length > 2).map(phon); if (!qt.length) return r;
    const sc = A.PATS.map(p => { const pt = N(p.first + ' ' + p.last).split(/\s+/).map(phon); let s = 0; qt.forEach(t => { const b = Math.min.apply(null, pt.map(x => (x === t ? 0 : lev(x, t)))); if (b === 0) s += 2; else if (b === 1 && t.length >= 4) s += 1.2; else if (b === 2 && t.length >= 7) s += 0.6; }); return { p, s }; })
      .filter(x => x.s >= Math.max(1.2, qt.length * 0.9)).sort((a, b) => b.s - a.s);
    return sc.slice(0, limit || 8).map(x => x.p);
  };

  /* =====================================================================
     ALTA Y FICHA POR VOZ: «nombre Juan», «apellido Pérez», «DNI 30.123.456», «alergia a la penicilina»…
     ===================================================================== */
  const FIELDS = [['first', /^(?:el |su )?nombre(?: del paciente)?$/], ['last', /^(?:el |su )?apellidos?$/], ['dni', /^(?:el |su )?(?:dni|documento|d n i|numero de documento)$/], ['phone', /^(?:el |su )?(?:telefono|celular|cel|whatsapp|numero de telefono)$/],
    ['age', /^(?:la |su )?edad$/], ['email', /^(?:el |su )?(?:email|e mail|mail|correo(?: electronico)?)$/], ['addr', /^(?:el |su )?(?:domicilio|direccion)$/], ['cov', /^(?:la |su )?(?:obra social|cobertura|prepaga)$/], ['afil', /^(?:el |su )?(?:numero de afiliado|afiliado|n de afiliado|credencial)$/]];
  const HCK = /^(antecedentes?(?: medicos| odontologicos| personales)?|medicacion(?: actual)?|medicamentos|toma|alergias?|alerta|diagnostico|indicaciones|motivo de consulta|evolucion|observaciones?)\b/;
  const parseField = c => {
    let m = /^(.+?)\s*(?:es|son|:|=)\s+(.+)$/.exec(c) || /^((?:el |la |su )?(?:nombre|apellidos?|dni|documento|telefono|celular|whatsapp|edad|email|e mail|mail|correo(?: electronico)?|domicilio|direccion|obra social|cobertura|prepaga|numero de afiliado|afiliado|credencial|numero de documento|numero de telefono))\s+(.+)$/.exec(c);
    if (!m) return null; const key = m[1].trim(); for (const f of FIELDS) if (f[1].test(key)) return { f: f[0], v: m[2].trim() };
    return null;
  };
  const parsePrev = C.parse;
  C.parse = (text, ctx) => {
    const c = C.clean(A.fixAsr(text)); let fd;
    if ((S.modal && S.modal.type === 'patient') || (S.tab === 'ficha' && S.fichaTab === 'datos')) { if ((fd = parseField(c))) return { intent: 'field', f: fd.f, v: fd.v }; }
    if (S.tab === 'ficha' && S.fichaPid && HCK.test(c)) return { intent: 'hcLine', text: c };
    if (/^(?:agrega(?:r|me|mos)?|agreguemos|crea(?:r|mos)?|creemos|carga(?:r|mos)?|carguemos|da(?:r|mos)? de alta|nuevo|nueva|registra(?:r)?|abri(?:r)?)\s+(?:un |una |a un |a una )?(?:paciente|ficha|historia clinica)\s*(?:nuevo|nueva)?$/.test(c)) return { intent: 'newPat', first: '', last: '' };
    return parsePrev(text, ctx);
  };
  const cap = s => String(s).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const UC = s => s.charAt(0).toUpperCase() + s.slice(1);
  const IDS = { first: 'npF', last: 'npL', dni: 'npD', phone: 'npT', email: 'npE', cov: 'npC', age: 'npA' };
  const LBL = { first: 'nombre', last: 'apellido', dni: 'DNI', phone: 'teléfono', age: 'edad', email: 'email', addr: 'domicilio', cov: 'obra social', afil: 'número de afiliado' };
  function cleanVal(f, v) {
    v = v.replace(/[.,;]+$/, '');
    if (f === 'dni' || f === 'phone' || f === 'afil') { const w = C.wordsNum(v.split(' ')); const d = v.replace(/\D/g, ''); return d || (w && w.value ? String(w.value) : v); }
    if (f === 'age') { const d = v.replace(/\D/g, ''); if (d) return d; const w = C.wordsNum(v.split(' ')); return w && w.value ? String(w.value) : v; }
    if (f === 'email') return v.replace(/\s*arroba\s*/g, '@').replace(/\s*punto\s*/g, '.').replace(/\s+/g, '').toLowerCase();
    if (f === 'cov') { const os = A.osList().filter(o => N(o.sigla) === N(v) || N(o.name).indexOf(N(v)) === 0)[0]; return os ? os.sigla : cap(v); }
    return cap(v);
  }
  const execPrev = A.cmd.exec;
  A.cmd.exec = (text, opts) => {
    let pr = null; try { pr = C.parse(text, { today: A.today(), pros: A.PROS }); } catch (e) { pr = null; }
    if (pr && pr.intent === 'field') {
      /* se recupera el valor con sus tildes tal como se dijo («Pérez», no «Perez») */
      const ow = String(A._lastRaw && N(A._lastRaw).indexOf(N(pr.v)) >= 0 ? A._lastRaw : text).replace(/[.,;:]+$/, '').trim().split(/\s+/), k = pr.v.split(' ').length, cand = ow.slice(-k).join(' ');
      const v = cleanVal(pr.f, N(cand) === N(pr.v) ? cand : pr.v);
      if (S.modal && S.modal.type === 'patient') {
        const el = $('#' + IDS[pr.f]); if (!el) return { ok: false, msg: 'Ese dato se completa después, en la ficha.' };
        el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
        const miss = ['npF', 'npL'].filter(id => !($('#' + id) || {}).value).map(id => id === 'npF' ? 'nombre' : 'apellido');
        return { ok: true, msg: UC(LBL[pr.f]) + ': ' + v + '.' + (miss.length ? ' Falta ' + miss.join(' y ') + '.' : ' Decí «guardar» cuando termines.') };
      }
      if (S.tab === 'ficha' && S.fichaPid) { A.setProfile(S.fichaPid, { [pr.f]: pr.f === 'age' ? num(v) : v }); A.refresh(); return { ok: true, msg: 'Guardado. ' + UC(LBL[pr.f]) + ': ' + v + '.' }; }
    }
    if (pr && pr.intent === 'hcLine') {
      const pid = S.fichaPid, r = A.parseHC(pr.text); if (!r.secs.length && !r.conds.length) return { ok: false, msg: 'No entendí qué agregar a la historia.' };
      const done = A.applyHC(pid, r); if (S.fichaTab !== 'datos') S.fichaTab = 'datos'; A.refresh(); A.toast('Historia clínica: ' + done.out.join(', ') + '.', done.undo);
      return { ok: true, msg: 'Anotado en la historia: ' + done.out.join(', ') + '.' };
    }
    if (pr && pr.intent === 'newPat' && !pr.first) { S.modal = { type: 'patient' }; A.renderModal(); return { ok: true, msg: 'Paciente nuevo. Decime los datos: «nombre…», «apellido…», «DNI…», «teléfono…», «obra social…». Al final, «guardar».' }; }
    return execPrev(A.fixAsr(text), opts);
  };
  /* después de guardar un paciente nuevo por voz, sigue la historia clínica */
  const origNpSave = A.acts.npSave;
  A.acts.npSave = () => { origNpSave(); if (V.on && S.tab === 'ficha') A.say('Listo. Seguimos con la historia: decí «antecedentes…», «medicación…» o «alergia a…».'); };

  /* =====================================================================
     TIPO DE CUENTA: al pasar a centro por primera vez se pide el nombre del centro
     ===================================================================== */
  const origTypeGo = A.acts.acctTypeGo;
  A.acts.acctTypeGo = () => {
    const t = S.modal.t, st = S.setup || {};
    if (t === 'centro' && st.type !== 'centro' && !st.centroNamed) { S.modal = { type: 'centroName' }; A.renderModal(); return; }
    if (t === 'solo' && st.type !== 'solo') { S.setup = Object.assign({}, st, { clinicCentro: st.clinic, clinic: st.clinicSolo || st.clinic }); }
    if (t === 'centro' && st.type !== 'centro') { S.setup = Object.assign({}, st, { clinicSolo: st.clinic, clinic: st.clinicCentro || st.clinic }); }
    origTypeGo();
  };
  MF.centroName = () => A.modalShell('Tu centro odontológico', '<p class="hint">Es la primera vez que pasás a centro: poné el nombre del centro. Tu nombre sigue como primer profesional y después podés sumar a los demás en Ajustes.</p>' +
    '<div class="field"><label for="cnName">Nombre del centro</label><input id="cnName" value="' + esc((S.setup && (S.setup.clinicCentro || S.setup.clinic)) || '') + '" placeholder="Ej.: Centro Dental Norte"></div><div class="field"><label for="cnPhone">Teléfono del centro (opcional)</label><input id="cnPhone" inputmode="tel" value="' + esc(A.CFG.phone || '') + '"></div><div id="cnMsg" class="hint bad"></div>',
    '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="centroNameGo">Guardar y pasar a centro</button>');
  A.acts.centroNameGo = () => {
    const n = $('#cnName').value.trim(); if (!n) { $('#cnMsg').textContent = 'Escribí el nombre del centro.'; return; }
    const st = S.setup || {}; A.CFG.phone = $('#cnPhone').value.trim() || A.CFG.phone;
    S.setup = Object.assign({}, st, { clinicSolo: st.type === 'solo' ? st.clinic : st.clinicSolo, clinic: n, clinicCentro: n, centroNamed: true });
    S.modal = { type: 'acctType', t: 'centro' }; origTypeGo();
  };

  /* estilos */
  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '.fc-btn{display:inline-flex;align-items:center;gap:4px;margin-top:6px;border:1px solid var(--accent);color:var(--accent);background:var(--accent-soft);border-radius:999px;padding:4px 12px;font:700 13px/1.3 var(--f-sans,system-ui);cursor:pointer}.fc-btn:hover{filter:brightness(1.05)}' +
    '.wab{flex:0 0 auto;width:22px;height:22px;border-radius:50%;border:0;background:#25d366;color:#fff;display:inline-grid;place-items:center;padding:3px;cursor:pointer;margin-left:4px}.wab svg{width:15px;height:15px}.wab.sent{background:#9adbb3}' +
    '.blk .t .wab{width:19px;height:19px;padding:2px;margin:0 2px 0 auto}.blk .t{align-items:center}.hd-row .wab{width:28px;height:28px;margin-left:auto}.hd-row .wab svg{width:18px;height:18px}' +
    '@media (min-width:1000px){body.web .wrap,body.web .top-in{max-width:none}body.web .wrap{padding-left:24px;padding-right:24px}}' +
    '.ag-split{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:16px;align-items:start}.ag-side{position:sticky;top:70px;padding:12px;display:flex;flex-direction:column;gap:10px;order:2}.ag-main{min-width:0}' +
    '.mc-head{display:flex;align-items:center;justify-content:space-between;gap:6px}.mc-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center}.mc-dw{font-size:11px;color:var(--ink-2);padding:2px 0}' +
    '.mc-d{position:relative;border:0;background:transparent;border-radius:8px;padding:6px 0 9px;font:600 13px var(--f-sans,system-ui);color:var(--ink);cursor:pointer}.mc-d:hover{background:var(--surface-2)}.mc-d.out{color:var(--ink-2);opacity:.55}' +
    '.mc-d.today{box-shadow:inset 0 0 0 1.5px var(--accent)}.mc-d.sel{background:var(--accent);color:var(--accent-ink,#fff)}.mc-d i{position:absolute;left:50%;bottom:3px;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:#2c8a58}.mc-d.sel i{background:#fff}' +
    '.mc-sum{font-size:13px;color:var(--ink-2)}.mc-sum b{color:var(--ink)}.mc-sum b.ok{color:#2c8a58}.mc-pros{display:flex;flex-direction:column;gap:4px;font-size:13px}.mc-pros .pdot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;vertical-align:0}' +
    '.lab-items{display:flex;flex-direction:column;gap:6px}.lab-it{display:grid;grid-template-columns:minmax(0,1fr) 110px 32px;gap:6px;align-items:center}.lab-it input{min-width:0;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit}' +
    '</style>');
})();
