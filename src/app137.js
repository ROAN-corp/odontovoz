/* ===== 1.54: alquiler de módulos y consultorios: cuándo se paga, avisos el último día («Pagar» para quien alquila, «Cobrar» para el centro), registro del cobro y mensaje de WhatsApp editable ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc, $ = q => document.querySelector(q);
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const money = n => A.money(Math.round(n || 0));
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mesTxt = ym => MESES[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4);
  const dim = ym => new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
  const pad = n => String(n).padStart(2, '0');
  const METHODS = ['Transferencia', 'Efectivo', 'Otro'];
  const isMem = () => !!(A.isMember && A.isMember());
  const bossDev = () => !isMem() || (A.mbRole && A.mbRole() === 'admin') || (A.isSocio && A.isSocio());
  const tenantId = () => { const m = A.memberNow && A.memberNow(); return m && (m.role === 'profesional' || m.role === 'asistente') && A.mbPro ? A.mbPro() : null; };
  const canCfg = () => bossDev();

  /* ---------- pagos de cada profesional (rp:<id>): los escribe quien alquila (avisa que pagó) y el centro (cobra) ---------- */
  let RP = null, RPK = '';
  const key = () => 'odontovoz.rp.v1.' + ((A.ownerId && A.ownerId()) || 'x');
  const load = () => { const k = key(); if (RP && RPK === k) return RP; RPK = k; try { RP = JSON.parse(LS.get(k, '{}')) || {}; } catch (e) { RP = {}; } return RP; };
  const store = () => { load(); LS.set(RPK, JSON.stringify(RP)); };
  const xPrev = A.cloudExtra, kPrev = A.cloudExtraKeys;
  A.cloudExtra = k => /^rp:/.test(String(k)) ? { get: () => load()[k.slice(3)] || null, set: v => { if (v && typeof v === 'object') { load()[k.slice(3)] = v; store(); } } } : (xPrev ? xPrev(k) : null);
  A.cloudExtraKeys = () => (A.PROS || []).concat(A.PROS_OLD || []).map(p => 'rp:' + p.id).concat(kPrev ? kPrev() : []);
  A.rentPay = (pid, ym) => ((load()[pid] || {}).pays || {})[ym] || null;
  const setPay = (pid, ym, rec) => { const d = load()[pid] || (load()[pid] = { pays: {} }); d.pays = d.pays || {}; d.pays[ym] = rec; d.upd = new Date().toISOString(); store(); A.save(); };

  /* ---------- el alquiler de cada profesional, según su acuerdo ---------- */
  A.rentInfo = pid => {
    let c = {}; try { c = A.liqCfg(pid) || {}; } catch (e) { c = {}; }
    const mode = c.mode || 'pct'; let fee = null, what = '';
    if ((mode === 'mod' || mode === 'pctmod') && c.mod && c.mod.price > 0) {
      const n = Math.max(1, +c.mod.n || 1), hs = c.mod.hs ? String(c.mod.hs).replace('.', ',') : '';
      what = n + ' módulo' + (n > 1 ? 's' : '') + (hs ? ' de ' + hs + ' h semanales' : ''); if ((c.mod.by || 'modulo') === 'modulo') fee = c.mod.price * n;
    } else if (mode === 'alq' && c.alq && c.alq.price > 0) { what = 'el consultorio'; if ((c.alq.by || 'mes') === 'mes') fee = c.alq.price; }
    else if (mode === 'otro' && c.otro && c.otro.fix > 0) { what = 'el acuerdo'; fee = c.otro.fix; }
    else return null;
    const p = A.PRO(pid) || {}, r = p.rent || {};
    return { pid, mode, fee, what, from: +r.from || 0, to: +r.to || 0, wa: r.wa || '', ok: !!(r.from && r.to) };
  };
  const who = () => (A.actor && A.actor().who) || '';

  /* ---------- mensajes de WhatsApp (editables en Ajustes › WhatsApp para recordatorios) ---------- */
  if (A.waTplReg) {
    A.waTplReg('rentCobrar', { name: 'Alquiler: aviso del centro a quien alquila', hint: 'Lo manda el centro al profesional que alquila un módulo o el consultorio.',
      def: 'Hola {nombre}, te escribo de {centro}. Te recuerdo que el alquiler de {concepto} de {mes} ({monto}) vence el {vence}. ¡Gracias!',
      vars: [['nombre', 'nombre del profesional'], ['centro', 'nombre del consultorio'], ['concepto', 'qué alquila'], ['mes', 'mes'], ['monto', 'importe'], ['vence', 'último día para pagar']],
      sample: { nombre: 'Dr. Pérez', centro: 'Tu consultorio', concepto: '3 módulos de 4 h semanales', mes: 'noviembre 2026', monto: '$ 900.000', vence: '10/11' } });
    A.waTplReg('rentPagar', { name: 'Alquiler: aviso de quien alquila al centro (ya pagué)', hint: 'Lo manda el profesional que alquila cuando ya hizo el pago.',
      def: 'Hola, soy {nombre}. Ya hice el pago del alquiler de {concepto} de {mes} ({monto}). Si hace falta, te paso el comprobante.',
      vars: [['nombre', 'nombre del profesional'], ['centro', 'nombre del consultorio'], ['concepto', 'qué alquila'], ['mes', 'mes'], ['monto', 'importe'], ['vence', 'último día para pagar']],
      sample: { nombre: 'Dr. Pérez', centro: 'Tu consultorio', concepto: '3 módulos de 4 h semanales', mes: 'noviembre 2026', monto: '$ 900.000', vence: '10/11' } });
  }
  const vars = (I, ym, pay) => { const p = A.PRO(I.pid) || {}, last = Math.min(I.to, dim(ym)); return { nombre: p.name || '', centro: A.CLINIC || '', concepto: I.what, mes: mesTxt(ym), monto: I.fee != null ? money(pay && pay.amt ? pay.amt : I.fee) : 'el monto acordado', vence: pad(last) + '/' + ym.slice(5, 7) }; };

  /* ---------- en el acuerdo del profesional: módulos, fecha de pago y cobros ---------- */
  A.rentHTML = (pid, mode) => {
    if (['mod', 'pctmod', 'alq', 'otro'].indexOf(mode) < 0) return '';
    const I = A.rentInfo(pid), p = A.PRO(pid) || {}, r = p.rent || {}, can = canCfg(), D = can ? '' : 'disabled';
    let c = {}; try { c = A.liqCfg(pid) || {}; } catch (e) { c = {}; }
    const days = f => '<select id="rt' + f + '" data-chg="rentSet" data-f="' + f + '" data-id="' + esc(pid) + '" ' + D + '><option value="">Elegí…</option>' + Array.from({ length: 31 }, (_, i) => '<option value="' + (i + 1) + '"' + ((+r[f] || 0) === i + 1 ? ' selected' : '') + '>' + (i + 1) + '</option>').join('') + '</select>';
    let h = '<div class="block rent-box"><h3>Cobro del alquiler</h3>';
    if (mode === 'mod' || mode === 'pctmod') h += '<div class="row2"><div class="field"><label for="rtN">Cantidad de módulos</label><input id="rtN" inputmode="numeric" data-chg="dlSet" data-f="modN" data-id="' + esc(pid) + '" ' + D + ' value="' + ((c.mod && c.mod.n) || 1) + '"></div><div class="field"><label>Total por mes</label><div class="rent-tot">' + (I && I.fee != null ? money(I.fee) : 'según uso') + '</div></div></div>';
    else if (I) h += '<div class="field"><label>Total por mes</label><div class="rent-tot">' + (I.fee != null ? money(I.fee) : 'según uso') + '</div></div>';
    h += '<div class="row2"><div class="field"><label for="rtfrom">Se paga desde el día</label>' + days('from') + '</div><div class="field"><label for="rtto">hasta el día</label>' + days('to') + '</div></div>' +
      '<div class="hint">Del día que elijas al último día de cada mes. Si es un solo día, elegí el mismo en los dos. El último día se avisa en pantalla a quien alquila y al centro (dueño, socios y administración).</div>' +
      '<div class="field"><label for="rtwa">WhatsApp de este profesional (para los avisos)</label><input id="rtwa" inputmode="tel" data-chg="rentSet" data-f="wa" data-id="' + esc(pid) + '" ' + D + ' value="' + esc(r.wa || '') + '" placeholder="Ej.: 2984123456"></div>';
    if (I && I.ok) {
      const ym = A.today().slice(0, 7), pay = A.rentPay(pid, ym), L = [];
      for (let i = 0; i < 6; i++) { const d = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1 - i, 1), k = d.getFullYear() + '-' + pad(d.getMonth() + 1), x = A.rentPay(pid, k); L.push('<li><span>' + esc(mesTxt(k)) + '</span><b class="' + (x && x.st === 'cobrado' ? 'ok' : x ? 'warn' : '') + '">' + (x ? (x.st === 'cobrado' ? 'Cobrado ' + money(x.amt) + ' el ' + esc(A.fmtDMY(x.date)) : 'Avisó que pagó (falta confirmar)') : 'Sin registrar') + '</b></li>'); }
      h += '<ul class="rent-hist">' + L.join('') + '</ul>';
      if (can) h += '<div class="row-btns"><button class="btn small primary" data-act="rentCobOpen" data-id="' + esc(pid) + '" data-ym="' + ym + '">' + (pay && pay.st === 'cobrado' ? 'Cambiar el cobro de ' : 'Registrar cobro de ') + esc(mesTxt(ym)) + '</button><button class="btn small" data-act="rentWaOpen" data-id="' + esc(pid) + '" data-ym="' + ym + '" data-w="boss">Avisar por WhatsApp</button></div>';
    } else h += '<div class="hint warn">Elegí desde y hasta qué día se paga para activar los avisos.</div>';
    return h + '</div>';
  };
  A.chg.rentSet = el => {
    if (!canCfg()) return; const p = A.PRO(el.getAttribute('data-id')), f = el.getAttribute('data-f'); if (!p) return;
    p.rent = Object.assign({}, p.rent); const v = el.value.trim();
    if (f === 'wa') p.rent.wa = v.slice(0, 20); else p.rent[f] = Math.max(0, Math.min(31, parseInt(v, 10) || 0)) || undefined;
    A.save(); const b = $('.m-body'), t = b ? b.scrollTop : 0; A.renderModal(); const b2 = $('.m-body'); if (b2) b2.scrollTop = t;
  };

  /* ---------- registrar el cobro (centro) o el pago (quien alquila) ---------- */
  const rec = m => A.rentPay(m.pid, m.ym);
  A.acts.rentCobOpen = el => { const pid = el.getAttribute('data-id'), ym = el.getAttribute('data-ym'), I = A.rentInfo(pid), x = A.rentPay(pid, ym); S.modal = { type: 'rentCob', pid, ym, back: S.modal && S.modal.type === 'rentDue' ? 'rentDue' : null, f: { amt: x && x.amt ? x.amt : (I && I.fee) || 0, date: A.today(), method: (x && x.method) || 'Transferencia', note: (x && x.note) || '' } }; A.renderModal(); };
  A.acts.rentPayOpen = el => { const pid = el.getAttribute('data-id'), ym = el.getAttribute('data-ym'), I = A.rentInfo(pid); S.modal = { type: 'rentPay', pid, ym, f: { amt: (I && I.fee) || 0, date: A.today(), method: 'Transferencia', note: '' } }; A.renderModal(); };
  const form = (m, tenant) => '<div class="field"><label for="rfA">Importe</label><input id="rfA" inputmode="numeric" value="' + (m.f.amt || '') + '"></div>' +
    '<div class="row2"><div class="field"><label for="rfD">Fecha</label><input id="rfD" type="date" value="' + esc(m.f.date) + '"></div><div class="field"><label for="rfM">Medio</label><select id="rfM">' + METHODS.map(x => '<option' + (x === m.f.method ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div></div>' +
    '<div class="field"><label for="rfN">Nota <small>(opcional)</small></label><input id="rfN" value="' + esc(m.f.note) + '" placeholder="Ej.: transferencia a nombre de…"></div><div id="rfMsg" class="hint bad"></div>';
  const readF = () => ({ amt: A.parseMoney ? A.parseMoney(($('#rfA') || {}).value) : +($('#rfA') || {}).value, date: ($('#rfD') || {}).value || A.today(), method: ($('#rfM') || {}).value || 'Transferencia', note: (($('#rfN') || {}).value || '').trim() });
  const head = m => { const I = A.rentInfo(m.pid) || {}, p = A.PRO(m.pid) || {}; return '<p class="m-lead"><b>' + esc(p.name || '') + '</b> · alquiler de ' + esc(I.what || '') + ' · ' + esc(mesTxt(m.ym)) + (I.fee != null ? ' · ' + money(I.fee) : '') + '</p>'; };
  MF.rentCob = m => A.modalShell('Cobrar el alquiler', head(m) + form(m) + '<p class="hint">Queda registrado como cobrado y se dejan de mostrar los avisos de este mes.</p>', '<button class="btn" data-act="' + (m.back ? 'rentDueOpen' : 'closeModal') + '">Volver</button><button class="btn primary" data-act="rentCobSave">Registrar cobro</button>');
  MF.rentPay = m => A.modalShell('Pagar el alquiler', head(m) + '<p class="hint" style="margin-top:0">Hacé el pago al centro (transferencia o efectivo) y después registralo acá. Así el centro sabe que ya pagaste.</p>' + form(m, true), '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="rentPaySave">Ya pagué</button>');
  A.acts.rentCobSave = () => {
    const m = S.modal, f = readF(); if (!(f.amt > 0)) { $('#rfMsg').textContent = 'Escribí el importe cobrado.'; return; }
    setPay(m.pid, m.ym, Object.assign({}, f, { st: 'cobrado', by: who(), at: new Date().toISOString() }));
    A.toast('Cobro del alquiler registrado.'); if (A.nfRead) A.nfRead('rent:last:' + m.pid + ':' + m.ym); S.modal = null; A.renderModal(); A.refresh();
  };
  A.acts.rentPaySave = () => {
    const m = S.modal, f = readF(); if (!(f.amt > 0)) { $('#rfMsg').textContent = 'Escribí el importe pagado.'; return; }
    setPay(m.pid, m.ym, Object.assign({}, f, { st: 'avisado', by: who(), at: new Date().toISOString() }));
    A.toast('Listo: quedó anotado que pagaste. ¿Querés avisarle por WhatsApp?'); A.acts.rentWaOpen({ getAttribute: k => ({ 'data-id': m.pid, 'data-ym': m.ym, 'data-w': 'tenant' })[k] });
  };

  /* ---------- WhatsApp en un toque, con el mensaje editable ---------- */
  A.acts.rentWaOpen = el => {
    const pid = el.getAttribute('data-id'), ym = el.getAttribute('data-ym'), w = el.getAttribute('data-w') || 'boss', I = A.rentInfo(pid); if (!I) return;
    const text = A.waTpl ? A.waTpl(w === 'tenant' ? 'rentPagar' : 'rentCobrar', vars(I, ym, A.rentPay(pid, ym))) : '';
    S.modal = { type: 'rentWa', pid, ym, w, text, phone: w === 'tenant' ? (A.CFG.phone || '') : I.wa }; A.renderModal();
  };
  MF.rentWa = m => A.modalShell('Avisar por WhatsApp',
    '<p class="m-lead">' + (m.w === 'tenant' ? 'Mensaje para el centro' : 'Mensaje para ' + esc((A.PRO(m.pid) || {}).name || 'el profesional')) + '. Podés cambiar el texto antes de mandarlo.</p>' +
    '<div class="field"><label for="rwT">Mensaje</label><textarea id="rwT" rows="6">' + esc(m.text) + '</textarea></div>' +
    '<div class="field"><label for="rwP">WhatsApp al que se manda</label><input id="rwP" inputmode="tel" value="' + esc(m.phone || '') + '" placeholder="Si lo dejás vacío, elegís el contacto en WhatsApp"></div>' +
    '<p class="hint">El texto original se cambia en Ajustes › WhatsApp para recordatorios › «Editar los mensajes».</p>',
    '<button class="btn" data-act="closeModal">Cerrar</button><button class="btn primary" data-act="rentWaGo">Abrir WhatsApp</button>');
  A.acts.rentWaGo = () => {
    const t = ($('#rwT') || {}).value || '', ph = ($('#rwP') || {}).value || '', url = (ph && A.waLink ? A.waLink(ph, t) : '') || 'https://wa.me/?text=' + encodeURIComponent(t);
    if (A.waOpen) A.waOpen(url); else window.open(url, '_blank', 'noopener');
  };

  /* ---------- los avisos: abre el período, último día y vencido ---------- */
  function due() {
    const t = A.today(), ym = t.slice(0, 7), d = +t.slice(8, 10), my = tenantId(), boss = bossDev() && !my, out = [];
    (A.PROS || []).forEach(p => {
      if (my ? p.id !== my : !boss) return; const I = A.rentInfo(p.id); if (!I || !I.ok) return;
      if (boss && A.myProId && A.myProId() === p.id) return;
      const last = Math.min(I.to, dim(ym)), first = Math.min(I.from, last), pay = A.rentPay(p.id, ym);
      const paid = my ? !!pay : !!(pay && pay.st === 'cobrado'); if (paid) return;
      const lv = d > last ? 'late' : d === last ? 'last' : d >= first ? 'open' : null; if (!lv) return;
      out.push({ p, I, ym, first, last, lv, pay, my: !!my });
    });
    return out;
  }
  const label = x => x.my ? 'Pagar' : 'Cobrar';
  function notify() {
    const t = A.today(); if (!A.nfAdd) return;
    due().forEach(x => {
      const who1 = x.my ? 'tu alquiler' : 'el alquiler de ' + x.p.name, what = ' de ' + x.I.what + ' (' + mesTxt(x.ym) + (x.I.fee != null ? ' · ' + money(x.I.fee) : '') + ')';
      const pend = !x.my && x.pay && x.pay.st === 'avisado' ? ' ' + x.p.name + ' avisó que pagó: confirmá el cobro.' : '';
      if (x.lv === 'open') A.nfAdd({ id: 'rent:open:' + x.p.id + ':' + x.ym, k: 'info', t: 'Ya se puede ' + (x.my ? 'pagar' : 'cobrar') + ' ' + who1, b: 'Hasta el día ' + x.last + what + '.' + pend, act: 'rentDueOpen', args: {} });
      else if (x.lv === 'last') A.nfAdd({ id: 'rent:last:' + x.p.id + ':' + x.ym, k: 'update', t: 'Hoy vence ' + who1, b: 'Es el último día para ' + (x.my ? 'pagar' : 'cobrar') + what + '.' + pend, act: 'rentDueOpen', args: {} });
      else A.nfAdd({ id: 'rent:late:' + x.p.id + ':' + t, k: 'update', t: 'Venció ' + who1, b: 'Se podía ' + (x.my ? 'pagar' : 'cobrar') + ' hasta el día ' + x.last + what + '. Todavía no está registrado.' + pend, act: 'rentDueOpen', args: {} });
    });
  }
  /* la ventana, una vez por día, el último día para pagar */
  function popup() {
    const L = due().filter(x => x.lv === 'last'); if (!L.length || (S.modal && S.modal.type)) return;
    const k = 'odontovoz.rentSeen.' + ((A.ownerId && A.ownerId()) || 'x') + '.' + A.today() + '.' + (tenantId() || 'boss'); if (LS.get(k, '')) return; LS.set(k, '1');
    A.acts.rentDueOpen();
  }
  A.acts.rentDueOpen = () => { S.modal = { type: 'rentDue' }; A.renderModal(); };
  MF.rentDue = () => {
    const L = due().filter(x => x.lv !== 'open' || true).sort((a, b) => (a.lv === b.lv ? 0 : a.lv === 'last' ? -1 : a.lv === 'late' ? 0 : 1));
    if (!L.length) return A.modalShell('Alquileres', '<p class="m-lead">No hay alquileres para ' + (tenantId() ? 'pagar' : 'cobrar') + ' ahora. 👍</p>', '<button class="btn primary" data-act="closeModal">Cerrar</button>');
    const b = L.map(x => '<div class="rent-it ' + x.lv + '"><div class="rent-h"><b>' + esc(x.my ? 'Tu alquiler' : x.p.name) + '</b><span class="chip ' + (x.lv === 'last' ? 'bad' : x.lv === 'late' ? 'bad' : '') + '">' + (x.lv === 'last' ? 'Último día: hoy' : x.lv === 'late' ? 'Vencido' : 'Hasta el ' + x.last) + '</span></div>' +
      '<div class="rent-d">' + esc(x.I.what) + ' · ' + esc(mesTxt(x.ym)) + '</div><div class="rent-amt">' + (x.I.fee != null ? money(x.I.fee) : 'Según uso') + '</div>' +
      (x.pay ? '<div class="hint">' + (x.pay.st === 'avisado' ? (x.my ? 'Ya avisaste que pagaste. El centro lo tiene que confirmar.' : esc(x.p.name) + ' avisó que pagó el ' + esc(A.fmtDMY(x.pay.date)) + '. Confirmá el cobro.') : '') + '</div>' : '') +
      '<div class="row-btns">' + (x.my ? '<button class="btn primary" data-act="rentPayOpen" data-id="' + esc(x.p.id) + '" data-ym="' + x.ym + '">Pagar</button>' : '<button class="btn primary" data-act="rentCobOpen" data-id="' + esc(x.p.id) + '" data-ym="' + x.ym + '">Cobrar</button>') +
      '<button class="btn" data-act="rentWaOpen" data-id="' + esc(x.p.id) + '" data-ym="' + x.ym + '" data-w="' + (x.my ? 'tenant' : 'boss') + '">Avisar por WhatsApp</button></div></div>').join('');
    return A.modalShell(tenantId() ? 'Vence el pago de tu alquiler' : 'Vencen alquileres', b, '<button class="btn primary" data-act="closeModal">Después</button>');
  };
  let lastRun = 0;
  const arPrev = A.afterRefresh;
  A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; if (Date.now() - lastRun > 60000) { lastRun = Date.now(); setTimeout(() => { try { notify(); popup(); } catch (e) { /* nada */ } }, 5000); } return r; };

  const css = document.createElement('style'); css.id = 'ovApp137';
  css.textContent = '.rent-box{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:12px 0;background:var(--surface-2)}.rent-tot{padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);font-weight:700}' +
    '.rent-hist{list-style:none;margin:8px 0;padding:0;display:flex;flex-direction:column;gap:4px;font-size:.88rem}.rent-hist li{display:flex;justify-content:space-between;gap:10px}.rent-hist b{font-weight:600;color:var(--ink-2)}.rent-hist b.ok{color:var(--ok)}.rent-hist b.warn{color:var(--warn)}' +
    '.rent-it{border:1px solid var(--line);border-left-width:4px;border-radius:12px;padding:10px 12px;margin:0 0 10px;background:var(--surface-2)}.rent-it.last,.rent-it.late{border-left-color:var(--red)}.rent-it.open{border-left-color:var(--accent)}.rent-h{display:flex;justify-content:space-between;gap:8px;align-items:center}.rent-d{color:var(--ink-2);font-size:.9rem;margin-top:2px}.rent-amt{font-size:1.5rem;font-weight:800;margin:6px 0}';
  document.head.appendChild(css);
})();
