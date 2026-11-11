/* ===== 1.46.3: pagos escritos en la evolución («hoy paga 130.000 de 150.000 que debía») → cobro con un toque, sin duplicados ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const money = n => (A.money ? A.money(n) : '$' + n);
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const pnum = pid => String(pid || '').replace(/\D/g, '') || '0';
  const who = () => { try { const a = A.actor && A.actor(); return (a && a.who) || ''; } catch (e) { return ''; } };

  /* ---------- leer el texto ---------- */
  const AMT = '\\$?\\s*(\\d{1,3}(?:[.,]\\d{3})+|\\d+(?:[.,]\\d+)?)\\s*(mil\\b|k\\b|lucas\\b|millon(?:es)?\\b|palos\\b)?';
  const val = (num, mult) => {
    let v;
    if (/^\d{1,3}([.,]\d{3})+$/.test(num)) v = parseInt(num.replace(/[.,]/g, ''), 10);
    else v = parseFloat(num.replace(',', '.'));
    if (mult) v *= /^millon|^palos/.test(mult) ? 1e6 : 1e3;
    return Math.round(v);
  };
  const VERB = /\b(pag(?:o|a|aron|amos)|abon(?:o|a|aron)|dej(?:o|a)|entreg(?:o|a)|trajo|me dio|nos dio|cobr(?:e|amos|o)|transfiri(?:o|eron)|deposit(?:o|aron)|cancel(?:o|a)|señ(?:o|a))\b/g;
  const NOPE = /(va a|van a|tiene que|tendria que|debe|deberia|quedo en|queda en|promet\w*|prox\w*|la semana que viene|el mes que viene|no)\s+(?:\w+\s+){0,2}$/;
  const METH = [[/efectivo|cash/, 'Efectivo'], [/transf/, 'Transferencia'], [/mercado ?pago|\bmp\b/, 'Mercado Pago'], [/debito/, 'Débito'], [/credito|tarjeta/, 'Crédito']];
  A.payParse = text => {
    const t = norm(text); if (!t) return null;
    let m, paid = 0, at = -1;
    VERB.lastIndex = 0;
    while ((m = VERB.exec(t))) {
      const pre = t.slice(Math.max(0, m.index - 30), m.index);
      if (NOPE.test(pre)) continue;
      const rest = t.slice(m.index + m[0].length, m.index + m[0].length + 70);
      const re = new RegExp(AMT, 'g'); let a;
      while ((a = re.exec(rest))) { const v = val(a[1], a[2]); if (v >= 500) { paid = v; at = m.index + m[0].length + a.index + a[0].length; break; } }
      if (paid) break;
    }
    if (!paid) return null;
    let owed = 0;
    const tail = t.slice(at, at + 90), whole = t;
    const o1 = new RegExp('^\\s*(?:pesos\\s+)?(?:de|sobre|del total de)\\s+' + AMT + '\\s*(?:pesos\\s+)?(?:que\\s+deb\\w*|de\\s+deuda|del?\\s+total|adeud\\w*|que\\s+le\\s+faltaba\\w*|)').exec(tail);
    if (o1) { const v = val(o1[1], o1[2]); if (v > paid) owed = v; }
    if (!owed) { const o2 = new RegExp('(?:debia|adeudaba|deuda (?:era )?de|le faltaban?)\\s+' + AMT).exec(whole); if (o2) { const v = val(o2[1], o2[2]); if (v >= paid) owed = v; } }
    let method = '';
    METH.some(([r, k]) => { if (r.test(t)) { method = k; return true; } return false; });
    return { paid, owed, method };
  };

  /* ---------- duplicados ---------- */
  const today = () => A.today();
  /* un pago del mismo paciente, mismo día y mismo importe que no esté anulado */
  A.payTwin = (pid, amt, date) => {
    const pd = A.pd(pid); if (!pd || !(amt > 0)) return null;
    const d = date || today();
    return (pd.ledger || []).filter(e => e.type === 'pago' && e.date === d && +e.amount === +amt && !e.void && !e.anulado).slice(-1)[0] || null;
  };
  const twinText = e => 'Ya hay un cobro de ' + money(e.amount) + ' de hoy' + (e.fromNote ? ' (anotado desde la evolución' + (e.by ? ' por ' + e.by : '') + ')' : e.by ? ' (cargado por ' + e.by + ')' : '') + '.';

  /* ---------- después de guardar la evolución ---------- */
  let pending = null;
  const openPending = () => {
    if (!pending || S.modal) return;
    const p = pending; pending = null;
    const twin = A.payTwin(p.pid, p.paid);
    if (twin) { A.toast(twinText(twin) + ' No hace falta cargarlo de nuevo.'); linkNote(p, twin.id); return; }
    S.modal = Object.assign({ type: 'evPay' }, p); A.renderModal();
  };
  const linkNote = (p, payId) => { const pd = A.pd(p.pid); const n = (pd.notes || []).filter(x => x.id === p.noteId)[0]; if (n) { n.payId = payId; A.touchPd(p.pid); } };
  const after = (pid, txt) => {
    if (!pid || !txt) return;
    const r = A.payParse(txt); if (!r) return;
    const pd = A.pd(pid), n = (pd.notes || []).filter(x => x.text === txt)[0];
    pending = { pid, paid: r.paid, owed: r.owed, method: r.method || 'Efectivo', noteId: n ? n.id : null, txt };
    setTimeout(openPending, 50);
  };
  ['addNote', 'qnSave'].forEach(k => {
    const prev = A.acts[k]; if (!prev) return;
    A.acts[k] = function (el) {
      const txt = (((k === 'addNote' ? $('#noteTxt') : $('#qnTxt')) || {}).value || '').trim();
      const pid = k === 'addNote' ? S.fichaPid : el && el.getAttribute('data-pid');
      const r = prev.apply(this, arguments);
      try { after(pid, txt); } catch (e) { /* nada */ }
      return r;
    };
  });
  const prevAR = A.afterRefresh;
  A.afterRefresh = function () { const r = prevAR && prevAR.apply(this, arguments); if (pending && !S.modal) setTimeout(openPending, 80); return r; };

  MF.evPay = m => {
    const p = A.PAT(m.pid) || { name: 'Paciente' }, s0 = A.saldo(m.pid), gap = m.owed > s0 ? m.owed - s0 : 0;
    const add = m.addDebt == null ? gap > 0 : m.addDebt, after = s0 + (add ? gap : 0) - m.paid;
    let b = '<p class="m-lead">Anotaste un pago en la evolución de <b>' + esc(p.name) + '</b>. ¿Lo registro en los cobros?</p>';
    b += '<div class="evp-box"><div class="evp-amt">' + money(m.paid) + '</div><div class="field"><label for="evpMeth">Medio de pago</label><select id="evpMeth">' + A.METHODS.map(x => '<option' + (x === m.method ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div></div>';
    if (m.owed) {
      b += '<p class="small-note">En la evolución dice que debía <b>' + money(m.owed) + '</b>; en la app figuraba ' + (s0 > 0 ? 'una deuda de <b>' + money(s0) + '</b>' : '<b>sin deuda</b>') + '.</p>';
      if (gap > 0) b += '<label class="chk"><input type="checkbox" id="evpDebt"' + (add ? ' checked' : '') + ' data-chg="evpDebt"> Cargar la deuda anterior que falta (' + money(gap) + ')</label>';
    }
    b += '<p class="evp-rest">' + (after > 0 ? 'Queda debiendo <b>' + money(after) + '</b>.' : after < 0 ? 'Queda a favor del paciente: <b>' + money(-after) + '</b>.' : 'Queda <b>sin deuda</b>.') + '</p>';
    return A.modalShell('Pago anotado en la evolución', b, '<button class="btn" data-act="evpNo">No, era solo una nota</button><button class="btn primary" data-act="evpGo">Registrar cobro</button>');
  };
  A.chg.evpDebt = el => { S.modal.addDebt = !!el.checked; S.modal.method = ($('#evpMeth') || {}).value || S.modal.method; A.renderModal(); };
  A.acts.evpNo = () => { S.modal = null; A.renderModal(); };
  A.acts.evpGo = () => {
    const m = S.modal; if (!m) return;
    const pid = m.pid, pd = A.pd(pid), pat = A.PAT(pid) || {}, s0 = A.saldo(pid), gap = m.owed > s0 ? m.owed - s0 : 0;
    const add = m.addDebt == null ? gap > 0 : m.addDebt;
    const twin = A.payTwin(pid, m.paid);
    if (twin) { S.modal = null; A.renderModal(); A.toast(twinText(twin) + ' No se cargó de nuevo.'); linkNote(m, twin.id); return; }
    const d = today(), by = who();
    if (add && gap > 0) pd.ledger.push({ id: A.uid(), date: d, type: 'cargo', amount: gap, desc: 'Saldo anterior (anotado en la evolución)', pro: pat.pro, by, fromNote: m.noteId || true });
    pd.rcpSeq = pd.rcpSeq || 0;
    const e = { id: A.uid(), date: d, type: 'pago', amount: m.paid, desc: 'Cobro (anotado en la evolución)', method: ($('#evpMeth') || {}).value || m.method || 'Efectivo', pro: pat.pro, rcp: 'R-' + pnum(pid) + '-' + (++pd.rcpSeq), by, fromNote: m.noteId || true };
    /* si hoy quedaron prácticas «para cobrar» de este paciente y el pago las cubre, salen de la cola (así recepción no las cobra de nuevo) */
    const pend = (pd.ledger || []).filter(x => x.type === 'cargo' && x.cob && !x.cobOk && x.date === d);
    const sum = pend.reduce((t, x) => t + (+x.amount || 0), 0);
    if (pend.length && m.paid >= sum) { pend.forEach(x => { x.cobOk = 'nota'; x.cobDone = new Date().toISOString(); x.cobDoneBy = by; x.pagoId = e.id; }); e.pcIds = pend.map(x => x.id); }
    pd.ledger.push(e); pd.ledger.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    linkNote(m, e.id); A.touchPd(pid);
    S.modal = null; A.renderModal(); A.refresh();
    const rest = A.saldo(pid);
    A.toast('Cobro registrado: ' + money(m.paid) + '. ' + (rest > 0 ? 'Queda debiendo ' + money(rest) + '.' : 'Sin deuda.'));
  };

  /* ---------- al cargar un cobro a mano: avisar si ya está ---------- */
  const guard = (actName, readAmt, readPid, msgSel) => {
    const prev = A.acts[actName]; if (!prev) return;
    A.acts[actName] = function () {
      const m = S.modal; if (!m || m._twinOk) return prev.apply(this, arguments);
      const amt = readAmt(), pid = readPid(m), d = (($('#mvDate') || {}).value) || today();
      const twin = amt > 0 && pid ? A.payTwin(pid, amt, d) : null;
      if (!twin) return prev.apply(this, arguments);
      const box = $(msgSel);
      const h = '<div class="evp-twin">' + esc(twinText(twin)) + ' ¿Es el mismo pago?<div class="row-btns"><button class="btn small" data-act="twinSame">Es el mismo: no cargar</button><button class="btn small primary" data-act="twinOther" data-a="' + actName + '">Es otro pago: cargar igual</button></div></div>';
      if (box) box.innerHTML = h; else A.toast(twinText(twin));
      return undefined;
    };
  };
  guard('cobroSave', () => parseInt((($('#mvAmt') || {}).value || '').replace(/\D/g, ''), 10), m => m.pid, '#mvMsg');
  guard('ltPaySave', () => parseInt((($('#ltCa') || {}).value || '').replace(/\D/g, ''), 10), m => m.pid, '#ltCmsg');
  A.acts.twinSame = () => { S.modal = null; A.renderModal(); A.toast('Listo: no se cargó de nuevo.'); };
  A.acts.twinOther = el => { if (S.modal) S.modal._twinOk = true; const a = el.getAttribute('data-a'); if (A.acts[a]) A.acts[a](); };

  const css = document.createElement('style');
  css.textContent = '.evp-box{display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin:6px 0 10px}.evp-amt{font-size:30px;font-weight:800;line-height:1.1;color:var(--teal,#0b6b6f)}' +
    '.evp-box .field{flex:1;min-width:150px;margin:0}.evp-rest{margin:10px 0 0;font-size:1rem}' +
    '.evp-twin{margin-top:8px;padding:10px 12px;border-radius:10px;background:#fff6e0;color:#5c4400;font-size:.92rem;line-height:1.35}.evp-twin .row-btns{margin-top:8px;display:flex;gap:8px;flex-wrap:wrap}';
  document.head.appendChild(css);
})();
