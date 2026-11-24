/* ===== 1.54: agenda de un día entero por voz o desde «Más»: cancelar la agenda de un día (con aviso a cada paciente) y agregar una agenda extra o estirar la de un día ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc;
  const $ = q => document.querySelector(q);
  const boss = () => (A.isBoss ? A.isBoss() : true);
  const canHours = () => boss();   /* los horarios (profesionales) los cambia el dueño o un administrador */
  /* un profesional o asistente del equipo solo maneja su propia agenda */
  const vis = () => { const own = A.myProOnly && A.myProOnly(); const v = A.visPros ? A.visPros() : A.PROS; return own ? v.filter(p => p.id === own) : v; };
  const fmtD = d => (A.fmtLong ? A.fmtLong(d) : A.fmtShort(d));
  const hrsTxt = rs => (rs || []).map(r => A.mm(r[0]) + ' a ' + A.mm(r[1])).join(' y ');
  const toMin = v => (v ? A.toMin(v) : null);
  const minStr = m => (m == null ? '' : ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2));

  /* ¿de quién es la agenda si no lo dijo? */
  function mine() {
    const mb = A.memberRaw && A.memberRaw(); if (mb && mb.pro) return mb.pro;
    const v = vis(); if (v.length === 1) return v[0].id;
    if (A.isSolo && A.isSolo()) return (v[0] || A.PROS[0]).id;
    if (S.uimode === 'atencion' && S.me) return S.me;
    if (S.proSel && S.proSel.length === 1) return S.proSel[0];
    return '';
  }
  /* horario «normal» de ese día sin contar cierres ni licencias (para sumar o estirar) */
  function rawHours(p, d) {
    const ex = (p.extra || []).filter(x => x.d === d)[0]; if (ex) return ex.r.map(r => r.slice()).sort((a, b) => a[0] - b[0]);
    const dw = A.dow(d), fq = p.freq && p.freq[dw], odd = A.isoWeek(d) % 2 === 1;
    if ((fq === 'even' && odd) || (fq === 'odd' && !odd)) return [];
    return (p.sched[dw] || []).map(r => r.slice()).sort((a, b) => a[0] - b[0]);
  }
  const merge = rs => { const s = rs.slice().sort((a, b) => a[0] - b[0]), o = []; s.forEach(r => { const l = o[o.length - 1]; if (l && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else o.push(r.slice()); }); return o; };

  /* =================== cancelar la agenda de un día =================== */
  const affected = (d, who) => A.day(d).filter(a => a.type !== 'block' && a.status !== 'cancelado' && a.status !== 'atendido' && (who === 'all' ? vis().some(p => p.id === a.pro) : a.pro === who)).sort((x, y) => x.start - y.start);
  A.acts.dayOffOpen = el => {
    const d = (el && el.getAttribute && el.getAttribute('data-date')) || S.date || A.today();
    S.agMore = false; S.modal = { type: 'dayOff', date: d, pro: mine(), why: '' }; A.renderModal();
  };
  A.dayOffAsk = o => { const own = A.myProOnly && A.myProOnly(); let pro = o.all ? 'all' : (o.pro || mine()); if (own) pro = own; S.modal = { type: 'dayOff', date: o.date || A.today(), pro, why: o.why || '' }; A.renderModal(); };
  MF.dayOff = m => {
    if (m.done) return doneHTML(m);
    const v = vis(), list = m.pro ? affected(m.date, m.pro) : [], past = m.date < A.today();
    const sel = '<select id="doPro" data-chg="doPro"><option value=""' + (!m.pro ? ' selected' : '') + ' disabled>Elegí el profesional</option>' + v.map(p => '<option value="' + p.id + '"' + (m.pro === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + (v.length > 1 ? '<option value="all"' + (m.pro === 'all' ? ' selected' : '') + '>Todo el consultorio</option>' : '') + '</select>';
    let b = '<div class="row2"><div class="field"><label for="doDate">Día</label><input type="date" id="doDate" data-chg="doDate" value="' + esc(m.date) + '"></div>' + (v.length > 1 ? '<div class="field"><label for="doPro">Agenda de</label>' + sel + '</div>' : '') + '</div>' +
      '<div class="field"><label for="doWhy">Motivo (se ve en la agenda, no se manda al paciente)</label><input id="doWhy" data-in="doWhy" value="' + esc(m.why || '') + '" placeholder="Ej.: me tuve que ir, curso, enfermedad"></div>';
    if (past) b += '<div class="hint bad">Ese día ya pasó.</div>';
    if (!m.pro) b += '<div class="hint">Elegí de quién es la agenda.</div>';
    else {
      b += '<div class="do-sum"><b>' + (list.length ? list.length + ' turno' + (list.length === 1 ? '' : 's') + ' para cancelar' : 'No hay turnos ese día') + '</b> · ' + esc(fmtD(m.date)) + '</div>';
      if (list.length) b += '<ul class="do-list">' + list.map(a => { const p = A.PAT(a.pid) || {}; return '<li><span class="mono">' + A.mm(a.start) + '</span> ' + esc(p.name || '') + (m.pro === 'all' ? ' <span class="muted">· ' + esc(A.PRO(a.pro).short || '') + '</span>' : '') + (p.phone ? '' : ' <span class="chip warn">sin teléfono</span>') + '</li>'; }).join('') + '</ul>';
      b += '<p class="hint">Se cancelan los turnos y se bloquea el día para que no se den turnos nuevos (tampoco por el turnero online). Después te muestro la lista para avisarle a cada paciente por WhatsApp.</p>';
    }
    b += '<div id="doMsg" class="hint bad"></div>';
    return A.modalShell('Cancelar la agenda del día', b, '<button class="btn" data-act="closeModal">Volver</button><button class="btn primary danger-ish" data-act="dayOffGo"' + (m.pro && !past ? '' : ' disabled') + '>Cancelar la agenda del ' + esc(A.fmtShort(m.date)) + '</button>', true);
  };
  A.chg.doDate = el => { S.modal.date = el.value || A.today(); A.renderModal(); };
  A.chg.doPro = el => { S.modal.pro = el.value; A.renderModal(); };
  A.ins.doWhy = el => { S.modal.why = el.value; };
  A.acts.dayOffGo = () => {
    const m = S.modal, d = m.date, why = String(m.why || '').trim(), label = 'Agenda cancelada' + (why ? ': ' + why : '');
    const pros = m.pro === 'all' ? vis() : [A.PRO(m.pro)], list = affected(d, m.pro), ids = list.map(a => a.id);
    let blocks = 0;
    A.mutate([d], () => {
      list.forEach(a => { a.status = 'cancelado'; a.rem = 'cancelo'; a.dayOff = why || 'agenda cancelada'; });
      pros.forEach(p => A.hoursFor(p, d).forEach(r => { A.day(d).push({ id: A.uid(), type: 'block', label, pro: p.id, date: d, start: r[0], dur: r[1] - r[0], status: 'confirmado', by: (A.actor ? A.actor().who : ''), at: new Date().toISOString(), dayOff: 1 }); blocks++; }));
    }, 'Agenda del ' + A.fmtShort(d) + ' cancelada' + (ids.length ? ' (' + ids.length + ' turnos)' : '') + '.');
    S.modal = { type: 'dayOff', done: 1, date: d, ids, pro: m.pro, blocks, sent: {} }; S.date = d; A.renderModal(); A.refresh();
  };
  const sorry = a => {
    const p = A.PAT(a.pid) || {}, cl = A.CLINIC || (A.CFG && A.CFG.name) || 'el consultorio', first = String(p.first || p.name || '').split(' ')[0];
    return 'Hola ' + first + ', te escribimos de ' + cl + '. Por un imprevisto tenemos que suspender tu turno del ' + A.fmtShort(a.date) + ' a las ' + A.mm(a.start) + '. Te pedimos disculpas. ¿Te parece si lo reprogramamos? Respondé este mensaje y te damos un nuevo turno.';
  };
  function doneHTML(m) {
    const L = m.ids.map(id => A.apptById(id)).filter(Boolean);
    let b = '<div class="do-ok">✔ Agenda del ' + esc(fmtD(m.date)) + ' cancelada' + (L.length ? ': ' + L.length + ' turno' + (L.length === 1 ? '' : 's') + ' suspendido' + (L.length === 1 ? '' : 's') : '') + '. El día quedó bloqueado.</div>';
    if (L.length) {
      const sent = Object.keys(m.sent || {}).length;
      b += '<h3 class="hp-h">Avisale a cada paciente <span class="count">' + sent + ' de ' + L.length + '</span></h3><ul class="do-list wa">' + L.map(a => { const p = A.PAT(a.pid) || {}, url = A.waLink ? A.waLink(p.phone, sorry(a)) : ''; return '<li><span class="mono">' + A.mm(a.start) + '</span> <span class="nm">' + esc(p.name || '') + '</span>' + (url ? '<a class="btn small' + (m.sent[a.id] ? ' ghost' : ' primary') + '" href="' + esc(url) + '" target="_blank" rel="noopener" data-act="doSent" data-id="' + a.id + '">' + (m.sent[a.id] ? 'Avisado ✓' : 'Avisar por WhatsApp') + '</a>' : '<span class="chip warn">sin teléfono</span>') + '</li>'; }).join('') + '</ul>' +
        '<div class="row-btns"><button class="btn small" data-act="doCopy">Copiar la lista</button></div><p class="small-note">El mensaje no dice el motivo: solo que hubo un imprevisto y ofrece reprogramar.</p>';
    }
    return A.modalShell('Agenda cancelada', b, '<button class="btn" data-act="dayOffUndo">Deshacer</button><button class="btn primary" data-act="closeModal">Listo</button>', true);
  }
  A.acts.doSent = el => { const m = S.modal; if (m && m.sent) { m.sent[el.getAttribute('data-id')] = 1; setTimeout(() => A.renderModal(), 300); } };
  A.acts.doCopy = () => {
    const m = S.modal, t = m.ids.map(id => A.apptById(id)).filter(Boolean).map(a => { const p = A.PAT(a.pid) || {}; return A.mm(a.start) + ' · ' + (p.name || '') + (p.phone ? ' · ' + p.phone : ''); }).join('\n');
    if (navigator.clipboard) navigator.clipboard.writeText('Turnos suspendidos del ' + A.fmtShort(m.date) + ':\n' + t).then(() => A.toast('Lista copiada.'), () => {});
  };
  A.acts.dayOffUndo = () => {
    const m = S.modal; if (!m) return;
    A.mutate([m.date], () => {
      m.ids.forEach(id => { const a = A.apptById(id); if (a) { a.status = 'confirmado'; delete a.rem; delete a.dayOff; } });
      const day = A.day(m.date); for (let i = day.length - 1; i >= 0; i--) if (day[i].type === 'block' && day[i].dayOff) day.splice(i, 1);
    }, 'Listo: la agenda del ' + A.fmtShort(m.date) + ' volvió como estaba.');
    S.modal = null; A.renderModal(); A.refresh();
  };

  /* =================== agregar o estirar la agenda de un día =================== */
  A.acts.dayAddOpen = el => {
    const d = (el && el.getAttribute && el.getAttribute('data-date')) || S.date || A.today();
    S.agMore = false; A.dayAddAsk({ date: d });
  };
  A.dayAddAsk = o => {
    const pro = o.pro || mine(), p = pro && A.PRO(pro), cur = p ? rawHours(p, o.date || A.today()) : [];
    let from = o.from, to = o.to, mode = 'sumar';
    /* «hasta las 18» / «desde las 7»: estirar lo que ya tiene ese día */
    if ((from == null) !== (to == null) && cur.length) { mode = 'estirar'; }
    S.modal = { type: 'dayAdd', date: o.date || A.today(), pro, from, to, mode }; A.renderModal();
  };
  MF.dayAdd = m => {
    const v = vis(), p = m.pro && A.PRO(m.pro), cur = p ? rawHours(p, m.date) : [], cl = A.closedOn(m.date), vac = p && A.vacOn(p, m.date);
    let b = '<div class="row2"><div class="field"><label for="daDate">Día</label><input type="date" id="daDate" data-chg="daDate" value="' + esc(m.date) + '"></div>' + (v.length > 1 ? '<div class="field"><label for="daPro">Agenda de</label><select id="daPro" data-chg="daPro"><option value=""' + (!m.pro ? ' selected' : '') + ' disabled>Elegí el profesional</option>' + v.map(x => '<option value="' + x.id + '"' + (m.pro === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div>' : '') + '</div>';
    if (p) b += '<div class="do-sum">' + esc(fmtD(m.date)) + ': ' + (cur.length ? 'hoy figura de <b>' + esc(hrsTxt(cur)) + '</b>' : 'ese día <b>no atiende</b>') + '</div>';
    if (cl) b += '<div class="hint warn">Ese día está marcado como cerrado' + (cl.why ? ' (' + esc(cl.why) + ')' : '') + '. Si confirmás, se reabre para ' + esc(p ? p.name : 'el profesional') + '.</div>';
    else if (vac) b += '<div class="hint warn">Ese día figura de licencia' + (vac.why ? ' (' + esc(vac.why) + ')' : '') + '. Si confirmás, ese día se saca de la licencia.</div>';
    b += '<div class="row2"><div class="field"><label for="daFrom">Desde</label><input type="time" id="daFrom" step="900" data-chg="daT" data-k="from" value="' + minStr(m.from != null ? m.from : (m.mode === 'estirar' && cur.length ? cur[0][0] : null)) + '"></div><div class="field"><label for="daTo">Hasta</label><input type="time" id="daTo" step="900" data-chg="daT" data-k="to" value="' + minStr(m.to != null ? m.to : (m.mode === 'estirar' && cur.length ? cur[cur.length - 1][1] : null)) + '"></div></div>';
    if (cur.length) b += '<div class="da-mode"><label class="chk"><input type="radio" name="daMode" data-chg="daMode" value="sumar"' + (m.mode === 'sumar' ? ' checked' : '') + '> Sumar este horario a lo que ya tiene</label><label class="chk"><input type="radio" name="daMode" data-chg="daMode" value="estirar"' + (m.mode === 'estirar' ? ' checked' : '') + '> Estirar: empezar o terminar a esta hora</label><label class="chk"><input type="radio" name="daMode" data-chg="daMode" value="reemplazar"' + (m.mode === 'reemplazar' ? ' checked' : '') + '> Reemplazar el horario de ese día</label></div>';
    b += '<p class="hint">Es solo para ese día: el horario de todas las semanas no cambia. Los turnos ya dados se respetan.</p><div id="daMsg" class="hint bad"></div>';
    if (!canHours()) b = '<p>Los horarios los cambia el dueño o un administrador de la cuenta. Pediselo a ellos, o bloqueá un horario desde «Más» en la agenda.</p>';
    return A.modalShell('Agregar agenda un día', b, '<button class="btn" data-act="closeModal">Volver</button>' + (canHours() ? '<button class="btn primary" data-act="dayAddGo"' + (p ? '' : ' disabled') + '>Guardar la agenda del ' + esc(A.fmtShort(m.date)) + '</button>' : ''), true);
  };
  A.chg.daDate = el => { S.modal.date = el.value || A.today(); A.renderModal(); };
  A.chg.daPro = el => { S.modal.pro = el.value; A.renderModal(); };
  A.chg.daMode = el => { S.modal.mode = el.value; A.renderModal(); };
  A.chg.daT = el => { S.modal[el.getAttribute('data-k')] = toMin(el.value); };
  A.acts.dayAddGo = () => {
    const m = S.modal, p = A.PRO(m.pro), d = m.date, msg = $('#daMsg');
    const f = toMin(($('#daFrom') || {}).value), t = toMin(($('#daTo') || {}).value), cur = rawHours(p, d);
    let r;
    if (m.mode === 'estirar' && cur.length) {
      r = cur.map(x => x.slice());
      if (f != null) r[0][0] = Math.min(f, r[0][1] - 15);
      if (t != null) r[r.length - 1][1] = Math.max(t, r[r.length - 1][0] + 15);
    } else {
      if (f == null || t == null) { if (msg) msg.textContent = 'Completá desde y hasta.'; return; }
      if (t <= f) { if (msg) msg.textContent = 'La hora de fin tiene que ser posterior a la de inicio.'; return; }
      r = m.mode === 'reemplazar' ? [[f, t]] : merge(cur.concat([[f, t]]));
    }
    const snap = JSON.stringify({ extra: p.extra || [], vac: p.vac || [], closed: A.CFG.closed || [] });
    p.extra = (p.extra || []).filter(x => x.d !== d); p.extra.push({ d, r: merge(r), by: A.actor ? A.actor().who : '' });
    /* reabrir el día si estaba cerrado o de licencia */
    if (A.closedOn(d)) A.CFG.closed = A.CFG.closed.filter(c => c.d !== d);
    const vac = A.vacOn(p, d);
    if (vac) { const out = []; (p.vac || []).forEach(x => { if (x !== vac) { out.push(x); return; } const to = x.to || x.from; if (x.from < d) out.push(Object.assign({}, x, { to: A.add(d, -1) })); if (to > d) out.push(Object.assign({}, x, { from: A.add(d, 1), to })); }); p.vac = out; }
    A.dropDayCache(); if (A.fixMe) A.fixMe(); A.save();
    S.modal = null; S.date = d; S.tab = 'agenda'; A.renderModal(); A.refresh();
    A.toast('Agenda del ' + A.fmtShort(d) + ' de ' + (p.short || p.name) + ': ' + hrsTxt(A.hoursFor(p, d)) + '.', () => { const o = JSON.parse(snap); p.extra = o.extra; p.vac = o.vac; A.CFG.closed = o.closed; A.dropDayCache(); A.save(); A.refresh(); });
  };

  /* =================== por voz =================== */
  const execPrev = A.cmd && A.cmd.exec;
  if (execPrev) A.cmd.exec = (text, o) => {
    const pr = window.OVCmd && window.OVCmd.parse(text, { today: A.today(), pros: A.PROS.concat(A.PROS_OLD || []) });
    if (pr && pr.intent === 'dayOff') {
      A.dayOffAsk(pr);
      const m = S.modal, n = m.pro ? affected(m.date, m.pro).length : 0;
      if (!m.pro) return { ok: true, msg: '¿De quién es la agenda del ' + A.fmtShort(m.date) + '? Elegilo en la ventana.' };
      return { ok: true, msg: 'Agenda del ' + A.fmtShort(m.date) + (m.pro === 'all' ? ' de todo el consultorio' : '') + ': ' + (n ? n + ' turno' + (n === 1 ? '' : 's') + ' para cancelar' : 'no hay turnos') + '. Decí «confirmar» para cancelarla.' };
    }
    if (pr && pr.intent === 'dayAdd') {
      if (!canHours()) return { ok: false, msg: 'Los horarios los cambia el dueño o un administrador de la cuenta.' };
      A.dayAddAsk(pr);
      const m = S.modal;
      if (!m.pro) return { ok: true, msg: '¿Para qué profesional? Elegilo en la ventana.' };
      if (m.from == null && m.to == null) return { ok: true, msg: 'Agenda extra del ' + A.fmtShort(m.date) + ': completá desde qué hora hasta qué hora.' };
      return { ok: true, msg: 'Agenda del ' + A.fmtShort(m.date) + (m.from != null ? ' desde las ' + A.mm(m.from) : '') + (m.to != null ? ' hasta las ' + A.mm(m.to) : '') + '. Decí «confirmar» para guardarla.' };
    }
    return execPrev(text, o);
  };

  /* =================== en «Más» de la agenda =================== */
  const mount = () => {
    const mm = document.querySelector('#view-agenda .more-menu');
    if (!mm || mm.querySelector('[data-act=dayOffOpen]')) return;
    const ref = mm.querySelector('[data-act=newBlock]');
    const h = '<button role="menuitem" data-act="dayOffOpen">Cancelar la agenda del día<small>Suspende todos los turnos y avisás por WhatsApp</small></button>' + (canHours() ? '<button role="menuitem" data-act="dayAddOpen">Agregar agenda un día<small>Atender un día extra o estirar el horario</small></button>' : '');
    if (ref) ref.insertAdjacentHTML('afterend', h); else mm.insertAdjacentHTML('beforeend', h);
  };
  const arPrev = A.afterRefresh; A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; try { mount(); } catch (e) { /* nada */ } return r; };

  const css = document.createElement('style');
  css.textContent = '.do-sum{background:var(--accent-soft,#e6f3f3);border-radius:10px;padding:8px 12px;margin:8px 0}.do-list{list-style:none;margin:6px 0;padding:0;display:flex;flex-direction:column;gap:4px;max-height:40vh;overflow:auto}.do-list li{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:4px 0;border-bottom:1px solid var(--line)}.do-list.wa .nm{flex:1;min-width:120px}.do-list .mono{min-width:44px}' +
    '.do-ok{border:1px solid #2e7d32;background:#edf7ee;border-radius:10px;padding:10px 12px;margin-bottom:8px}.da-mode{display:flex;flex-direction:column;gap:2px;margin:6px 0}';
  document.head.appendChild(css);
})();
