/* ===== 1.1: cobro antes de atender (prácticas autorizadas por la obra social, p. ej. SOSUNC) que se enlaza con lo que carga el odontólogo ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const money = n => A.money(n || 0);
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const num = v => A.parseMoney(v);   /* 1.18: acepta centavos */
  const mb = () => (A.memberNow && A.memberNow()) || null;
  const role = () => { const m = mb(); return m ? m.role : null; };
  const who = () => (A.actor && A.actor().who) || (mb() && mb().name) || (A.CFG && A.CFG.ownerName) || (S.setup && S.setup.doctor) || '';
  const today = () => A.today();
  const proName = id => { const p = A.PRO(id) || {}; return p.short || p.name || 'Profesional'; };
  const curSede = () => (A.isEmp && A.isEmp() && A.empSede ? A.empSede() : null);
  const pnum = pid => String(pid).replace(/\D/g, '') || '0';
  /* quién puede cobrar antes: todos menos el asistente */
  const canCob = () => role() !== 'asistente';

  /* =====================================================================
     1. SOSUNC en la lista (pide autorización; aranceles de la Federación de Río Negro si están)
     ===================================================================== */
  const SOS = { sigla: 'SOSUNC', name: 'Obra Social de la Universidad Nacional del Comahue', kind: 'nacional', via: 'Federación Odontológica de Río Negro', on: true, auth: true, plans: '', upd: null, aran: {}, cop: 'cos',
    notes: 'Viene con orden (papel o digital con QR) y, en Roca, Cipolletti y Neuquén, con token. Odontología pasa por la Auditoría Odontológica (auditoria.odontologica@sosunc.org.ar): las prácticas se autorizan antes. El uso de la orden se registra en SOSUNC.Móvil (prestadores.sosunc@gmail.com para el alta). El afiliado paga el coseguro.' };
  let osDone = false;
  const osSeed = () => {
    if (osDone || !A.osList || (A.isBoss && A.isMember && A.isMember() && !A.isBoss())) return; osDone = true;
    const l = A.osList(); if (l.some(o => /sosunc|comahue/.test(norm(o.sigla + ' ' + o.name)))) return;
    const o = Object.assign({ id: 'os-sosunc' }, SOS); l.push(o); A.save();
    if (A.fornGet && A.fornApply) A.fornGet().then(d => {
      if (!d || !(d.os || []).some(f => f.slug === 'sosunc') || Object.keys(o.aran || {}).length) return;
      const n = A.fornApply(o, { slug: 'sosunc', t: 0, cov: 0, cos: -1, sub: false }); if (n) { A.save(); }
    }).catch(() => {});
  };

  /* =====================================================================
     2. QUÉ PRÁCTICA ES (para enlazar lo autorizado con lo que hace el odontólogo, aunque cada obra social numere distinto)
     ===================================================================== */
  const FAM = [
    ['resto', 'Restauración (arreglo)', /restaurac|obturac|composite|resina|amalgama|ionomer|arreglo|caries/, '02.01'],
    ['endo', 'Endodoncia', /endodon|conducto|pulpect|biopulp/, '03.01'],
    ['extr', 'Extracción', /extracc|exodon|extraid|sacar/, '10.01'],
    ['limp', 'Limpieza / tartrectomía', /limpieza|tartrect|profilax|destartr|gingivitis|cepillado/, '08.12'],
    ['urg', 'Atención de urgencia', /urgencia/, '01.02'],
    ['cons', 'Consulta / examen', /consulta|examen|diagnost|fichado|revision|relevamiento/, '01.01'],
    ['pano', 'Radiografía panorámica', /panoram|ortopantomog/, '09.02.04'],
    ['rx', 'Radiografía periapical', /radiograf|\brx\b|periapical|bite.?wing/, '09.01.01'],
    ['sell', 'Sellador', /sellador|sellante/, '05.05'],
    ['fluor', 'Flúor', /fluor/, '05.02'],
    ['perio', 'Tratamiento periodontal', /raspaje|periodont|alisado/, '08.16'],
    ['corona', 'Corona', /corona/, '04.01.15'],
    ['perno', 'Perno muñón', /perno/, '04.01.08'],
    ['protesis', 'Prótesis', /protesis|dentadura/, '04.02.01'],
    ['implante', 'Implante', /implante/, '11.02.00'],
    ['orto', 'Ortodoncia', /ortodon/, null]
  ];
  const COND = { obturacion: 'resto', composite: 'resto', amalgama: 'resto', ionomero: 'resto', caries: 'resto', endodoncia: 'endo', extraido: 'extr', extraccion: 'extr', sellador: 'sell', corona: 'corona', perno: 'perno', implante: 'implante' };
  const famOf = (cond, label) => { if (cond && COND[cond]) return COND[cond]; const l = norm(label); const f = FAM.filter(x => x[2].test(l))[0]; return f ? f[0] : 'x:' + l.replace(/\s*[×x]\s*\d+$/, '').slice(0, 40); };
  const famName = k => (FAM.filter(x => x[0] === k)[0] || [k, String(k).replace(/^x:/, '')])[1];
  A.pracFam = famOf;

  /* =====================================================================
     3. DATOS: pd.pre = [{ id, date, at, by, pro, apptId, os, osSig, auth, total, payIds, units:[{id, fam, label, tooth, amt, used, back}] }]
     ===================================================================== */
  const preOf = pid => { const pd = A.pd(pid); return (pd && Array.isArray(pd.pre)) ? pd.pre : []; };
  /* lo cobrado antes que todavía no se hizo */
  A.prePending = pid => {
    const out = []; preOf(pid).forEach(r => (r.units || []).forEach(u => { if (!u.used && !u.back) out.push({ r, u }); })); return out;
  };
  const sumTxt = units => {
    const by = {}; units.forEach(u => { const k = u.label + (u.tooth ? ' ' + u.tooth : ''); by[k] = (by[k] || 0) + 1; });
    return Object.keys(by).map(k => (by[k] > 1 ? by[k] + '× ' : '') + k).join(', ');
  };
  const patOS = pid => { const p = A.PAT(pid) || {}, os = A.osOf ? A.osOf(p) : null; return os || null; };
  /* coseguro sugerido para cada práctica según la obra social del paciente */
  const amtFor = (pid, fam) => {
    const os = patOS(pid), f = FAM.filter(x => x[0] === fam)[0];
    if (os && os.on) {
      const code = f && f[3], alt = code && A.osAltCode ? A.osAltCode(os, code, f[1]) : (code && os.aran && os.aran[code] ? code : null), ar = alt && os.aran ? os.aran[alt] : null;
      const mode = os.cop || A.CFG.copDef || 'cos';
      if (mode === 'none') return 0;
      return ar && ar.cos > 0 ? ar.cos : 0;
    }
    /* particular: el precio de tu lista */
    if (!f) return 0;
    const cond = { resto: 'obturacion', endo: 'endodoncia', extr: 'extraccion', sell: 'sellador', corona: 'corona', perno: 'perno', implante: 'implante' }[fam];
    if (cond && A.priceOf) return A.priceOf(cond, 1) || 0;
    const c = (A.CAT || []).filter(x => f[2].test(norm(x.label)) && x.price > 0)[0]; return c ? c.price : 0;
  };

  /* =====================================================================
     4. LA SECRETARIA COBRA ANTES DE QUE PASE
     ===================================================================== */
  A.acts.preOpen = el => {
    const pid = el.getAttribute('data-pid') || S.fichaPid; if (!pid) return;
    const tp = $('#tpop'); if (tp) { tp.remove(); const sc = $('#tpopScrim'); if (sc) sc.remove(); }
    const aid = el.getAttribute('data-id'), a = aid ? A.apptById(aid) : (A.S.days[today()] || []).filter(x => x.pid === pid && x.type !== 'block' && x.status !== 'cancelado')[0];
    const fam0 = el.getAttribute('data-fam') || 'resto';
    S.modal = { type: 'preCob', pid, apptId: a ? a.id : null, pro: a ? a.pro : (A.PAT(pid) || {}).pro, auth: '', meth: (A.METHODS || ['Efectivo'])[0], lines: [{ fam: fam0, label: '', qty: 1, tooth: '', amt: amtFor(pid, fam0) }] };
    A.renderModal();
  };
  A.preOpenFor = (pid, apptId) => A.acts.preOpen({ getAttribute: k => (k === 'data-pid' ? pid : k === 'data-id' ? apptId : null) });
  const METH = () => (A.METHODS || ['Efectivo', 'Transferencia', 'Débito', 'Crédito', 'Mercado Pago']).filter(x => !/obra social/i.test(x));
  const lineTot = l => (l.amt || 0) * (l.qty || 1);
  MF.preCob = m => {
    const p = A.PAT(m.pid) || {}, os = patOS(m.pid), pend = A.prePending(m.pid);
    const tot = m.lines.reduce((s, l) => s + lineTot(l), 0);
    let b = '<p class="po-who"><b>' + esc(p.name || 'Paciente') + '</b> · ' + esc(os ? os.sigla : (p.cov || 'Particular')) + (m.pro && A.PROS.length > 1 ? ' · lo atiende ' + esc(proName(m.pro)) : '') + '</p>';
    b += '<p class="m-lead pc-lead">Cobrale ahora lo que trae autorizado (o lo que va a hacerse). Cuando el odontólogo cargue lo que hizo, le aparece <b>«ya cobrado en secretaría»</b> y no se cobra dos veces.</p>';
    if (pend.length) b += '<div class="pre-had">Ya tenía cobrado de antes, sin hacer: <b>' + esc(sumTxt(pend.map(x => x.u))) + '</b></div>';
    b += '<div class="field"><label for="pcAuth">N.º de autorización u orden' + (os ? ' de ' + esc(os.sigla) : '') + ' <small>(opcional)</small></label><input id="pcAuth" data-in="pcAuth" value="' + esc(m.auth) + '" placeholder="Ej.: 123456 o el token" autocomplete="off"></div>';
    b += '<ul class="pc-lines">' + m.lines.map((l, i) => {
      const opts = FAM.map(f => '<option value="' + f[0] + '"' + (l.fam === f[0] ? ' selected' : '') + '>' + esc(f[1]) + '</option>').join('') + '<option value="otra"' + (l.fam === 'otra' ? ' selected' : '') + '>Otra…</option>';
      return '<li class="pc-ln">' +
        '<div class="pc-q" role="group" aria-label="Cantidad"><button type="button" class="pc-qb" data-act="pcQty" data-i="' + i + '" data-d="-1" aria-label="Una menos">−</button><b>' + l.qty + '</b><button type="button" class="pc-qb" data-act="pcQty" data-i="' + i + '" data-d="1" aria-label="Una más">+</button></div>' +
        '<div class="pc-what"><select data-chg="pcFam" data-i="' + i + '" aria-label="Práctica">' + opts + '</select>' +
        (l.fam === 'otra' ? '<input data-in="pcLabel" data-i="' + i + '" value="' + esc(l.label) + '" placeholder="¿Qué práctica?" aria-label="Nombre de la práctica">' : '') +
        '<input class="pc-tooth" inputmode="numeric" data-in="pcTooth" data-i="' + i + '" value="' + esc(l.tooth) + '" placeholder="Pieza (opcional)" aria-label="Pieza"></div>' +
        '<div class="pc-am"><span aria-hidden="true">$</span><input inputmode="numeric" data-in="pcAmt" data-i="' + i + '" value="' + (l.amt || 0) + '" aria-label="Cuánto paga por cada una"><small>' + (l.qty > 1 ? 'c/u' : (os ? 'coseguro' : 'precio')) + '</small></div>' +
        (m.lines.length > 1 ? '<button type="button" class="pc-del" data-act="pcDel" data-i="' + i + '" aria-label="Quitar">×</button>' : '') + '</li>';
    }).join('') + '</ul>';
    b += '<button class="btn small ghost" data-act="pcAdd">+ Otra práctica autorizada</button>';
    b += '<div class="po-tot"><span>Cobrar ahora</span><b id="pcTot">' + money(tot) + '</b></div>';
    b += '<div class="field pc-meth"><label for="pcMeth">Medio de pago</label><select id="pcMeth" data-chg="pcMeth">' + METH().map(x => '<option' + (x === m.meth ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select></div>';
    b += '<p class="hint">Si no paga nada (sin coseguro), igual conviene guardarlo: queda registrada la autorización y el odontólogo la ve.</p><div class="hint bad" id="pcMsg"></div>';
    return A.modalShell('Cobrar antes de atender', b, '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="pcGo" id="pcGoBtn">' + (tot > 0 ? 'Cobrar ' + money(tot) : 'Guardar autorización') + '</button>');
  };
  const pcSync = () => {
    const m = S.modal; if (!m || m.type !== 'preCob') return;
    const a = $('#pcAuth'); if (a) m.auth = a.value.trim();
    A.$$('[data-in="pcAmt"]').forEach(i => { const l = m.lines[+i.getAttribute('data-i')]; if (l) l.amt = num(i.value); });
    A.$$('[data-in="pcTooth"]').forEach(i => { const l = m.lines[+i.getAttribute('data-i')]; if (l) l.tooth = String(i.value).replace(/\D/g, '').slice(0, 2); });
    A.$$('[data-in="pcLabel"]').forEach(i => { const l = m.lines[+i.getAttribute('data-i')]; if (l) l.label = i.value; });
  };
  const pcPaint = () => { const m = S.modal; if (!m) return; const t = m.lines.reduce((s, l) => s + lineTot(l), 0), o = $('#pcTot'), g = $('#pcGoBtn'); if (o) o.textContent = money(t); if (g) g.textContent = t > 0 ? 'Cobrar ' + money(t) : 'Guardar autorización'; };
  ['pcAmt', 'pcTooth', 'pcLabel', 'pcAuth'].forEach(k => { A.ins[k] = () => { pcSync(); pcPaint(); }; });
  A.chg.pcFam = el => { pcSync(); const m = S.modal, l = m.lines[+el.getAttribute('data-i')]; if (!l) return; l.fam = el.value; l.amt = l.fam === 'otra' ? 0 : amtFor(m.pid, l.fam); A.renderModal(); if (l.fam === 'otra') { const n = $('[data-in="pcLabel"][data-i="' + el.getAttribute('data-i') + '"]'); if (n) n.focus(); } };
  A.chg.pcMeth = el => { pcSync(); S.modal.meth = el.value; };
  A.acts.pcQty = el => { pcSync(); const l = S.modal.lines[+el.getAttribute('data-i')]; if (!l) return; l.qty = Math.max(1, Math.min(32, (l.qty || 1) + (+el.getAttribute('data-d')))); A.renderModal(); };
  A.acts.pcAdd = () => { pcSync(); const m = S.modal; m.lines.push({ fam: 'resto', label: '', qty: 1, tooth: '', amt: amtFor(m.pid, 'resto') }); A.renderModal(); };
  A.acts.pcDel = el => { pcSync(); S.modal.lines.splice(+el.getAttribute('data-i'), 1); A.renderModal(); };
  A.acts.pcGo = () => {
    pcSync(); const m = S.modal, pid = m.pid, pd = A.pd(pid), d = today(), os = patOS(pid), msg = $('#pcMsg');
    const lines = m.lines.filter(l => l.fam !== 'otra' || String(l.label).trim());
    if (!lines.length) { if (msg) msg.textContent = 'Elegí al menos una práctica.'; return; }
    const units = [];
    lines.forEach(l => {
      const lab = l.fam === 'otra' ? String(l.label).trim() : famName(l.fam), fam = l.fam === 'otra' ? famOf(null, lab) : l.fam;
      for (let k = 0; k < (l.qty || 1); k++) units.push({ id: A.uid(), fam, label: lab, tooth: l.tooth ? +l.tooth : null, amt: l.amt || 0 });
    });
    const total = units.reduce((s, u) => s + u.amt, 0);
    const r = { id: A.uid(), date: d, at: new Date().toISOString(), by: who(), pro: m.pro || null, apptId: m.apptId || null, os: os ? os.id : null, osSig: os ? os.sigla : ((A.PAT(pid) || {}).cov || ''), auth: m.auth || '', total, payIds: [], units };
    let pago = null;
    if (total > 0) {
      pd.rcpSeq = (pd.rcpSeq || 0) + 1;
      pago = { id: A.uid(), date: d, type: 'pago', amount: total, desc: 'Cobro antes de atender · ' + sumTxt(units) + (r.osSig ? ' · ' + r.osSig : '') + (r.auth ? ' aut. ' + r.auth : ''), method: m.meth, pro: m.pro || (A.PAT(pid) || {}).pro, rcp: 'R-' + pnum(pid) + '-' + pd.rcpSeq, by: who(), pre: r.id };
      if (curSede()) pago.loc = curSede(); if (m.apptId) pago.apptId = m.apptId;
      const ap = m.apptId ? A.apptById(m.apptId) : null, room = ap && A.roomOf ? A.roomOf(ap) : null; if (room) pago.room = room.name;
      pd.ledger.push(pago); pd.ledger.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)); r.payIds.push(pago.id);
    }
    pd.pre = Array.isArray(pd.pre) ? pd.pre : []; pd.pre.push(r);
    A.touchPd(pid); A.save();
    if (A.empAudit) A.empAudit((total > 0 ? 'Cobró ' + money(total) + ' antes de atender' : 'Registró autorización') + ' a ' + (A.PAT(pid) || {}).name + ': ' + sumTxt(units) + '.');
    S.modal = null; A.renderModal(); A.refresh(); if (A.renderPanel) A.renderPanel();
    A.toast((total > 0 ? 'Cobrado ' + money(total) + ' a ' : 'Autorización guardada para ') + (A.PAT(pid) || {}).name + '. El odontólogo lo va a ver como ya cobrado.', pago ? () => { S.modal = { type: 'receipt', pid, id: pago.id }; A.renderModal(); } : null);
    const ub = document.querySelector('#toastHost [data-act="toastUndo"]'); if (ub) ub.textContent = 'Ver recibo';
  };

  /* =====================================================================
     5. LO COBRADO ANTES: ver, marcar hecho, devolver
     ===================================================================== */
  A.acts.preList = el => { S.modal = { type: 'preList', pid: el.getAttribute('data-pid') || null }; A.renderModal(); };
  const allPend = () => {
    const out = []; (A.allPids ? A.allPids() : A.PATS.map(p => p.id)).forEach(id => { const L = A.prePending(id); if (L.length) out.push({ pid: id, L }); }); return out;
  };
  MF.preList = m => {
    const groups = m.pid ? [{ pid: m.pid, all: preOf(m.pid) }] : allPend().map(g => ({ pid: g.pid, all: preOf(g.pid).filter(r => r.units.some(u => !u.used && !u.back)) }));
    let b = '';
    if (!groups.length || !groups.some(g => g.all.length)) b = '<div class="empty">No hay nada cobrado antes de atender pendiente.</div>';
    groups.forEach(g => {
      const p = A.PAT(g.pid) || {};
      if (!m.pid) b += '<h3 class="pl-h">' + esc(p.name || 'Paciente') + '</h3>';
      g.all.slice().reverse().forEach(r => {
        b += '<div class="pl-r"><div class="pl-rh"><b>' + A.fmtDMY(r.date) + '</b> · ' + esc(r.osSig || 'Particular') + (r.auth ? ' · aut. ' + esc(r.auth) : '') + ' · ' + (r.total ? 'cobró ' + money(r.total) : 'sin cobro') + (r.by ? ' (' + esc(r.by) + ')' : '') + '</div><ul class="pl-u">' +
          r.units.map(u => '<li><span>' + esc(u.label) + (u.tooth ? ' ' + u.tooth : '') + ' · ' + money(u.amt) + '</span>' +
            (u.used ? '<small class="ok">✓ hecho el ' + A.fmtDMY(u.used.date) + (u.used.pro ? ' por ' + esc(proName(u.used.pro)) : '') + '</small>'
              : u.back ? '<small class="bk">devuelto el ' + A.fmtDMY(u.back.date) + '</small>'
                : '<span class="pl-b"><button class="btn small" data-act="preDone" data-pid="' + g.pid + '" data-r="' + r.id + '" data-u="' + u.id + '">Ya se hizo</button>' + (canCob() ? '<button class="btn small ghost" data-act="preBack" data-pid="' + g.pid + '" data-r="' + r.id + '" data-u="' + u.id + '">' + (u.amt ? 'Devolver' : 'Anular') + '</button>' : '') + '</span>') + '</li>').join('') + '</ul></div>';
      });
    });
    b += '<p class="hint">«Ya se hizo» la carga en la cuenta como cobrada (sirve cuando el odontólogo la marcó directo en el odontograma). «Devolver» registra la devolución del dinero en la caja de hoy.</p>';
    const pend = m.pid ? A.prePending(m.pid) : [];
    return A.modalShell(m.pid ? 'Cobrado antes de atender · ' + ((A.PAT(m.pid) || {}).name || '') : 'Cobrado antes, falta atender', b, '<button class="btn" data-act="closeModal">Cerrar</button>' + (m.pid && canCob() ? '<button class="btn primary" data-act="preOpen" data-pid="' + m.pid + '">+ Cobrar otra autorización</button>' : '') + (pend.length ? '' : ''));
  };
  const findU = (pid, rid, uid) => { const r = preOf(pid).filter(x => x.id === rid)[0], u = r && r.units.filter(x => x.id === uid)[0]; return { r, u }; };
  A.acts.preDone = el => {
    const pid = el.getAttribute('data-pid'), f = findU(pid, el.getAttribute('data-r'), el.getAttribute('data-u')); if (!f.u || f.u.used || f.u.back) return;
    const pd = A.pd(pid), d = today(), pro = f.r.pro || (A.PAT(pid) || {}).pro;
    const e = { id: A.uid(), date: d, type: 'cargo', amount: f.u.amt, desc: f.u.label + (f.u.tooth ? ' ' + f.u.tooth : '') + ' (cobrado antes' + (f.r.auth ? ', aut. ' + f.r.auth : '') + ')', pro, cob: 'rcp', cobOk: 'pre', cobDone: new Date().toISOString(), cobDoneBy: who(), preId: f.r.id, pagoId: f.r.payIds[0] || null };
    if (f.r.os) e.os = f.r.os; if (curSede()) e.loc = curSede();
    pd.ledger.push(e); f.u.used = { date: d, at: new Date().toISOString(), by: who(), pro, cargo: e.id, manual: 1 };
    A.touchPd(pid); A.save(); A.renderModal(); A.refresh(); A.toast('Marcada como hecha: ' + f.u.label + '.');
  };
  A.acts.preBack = el => {
    const pid = el.getAttribute('data-pid'), f = findU(pid, el.getAttribute('data-r'), el.getAttribute('data-u')); if (!f.u || f.u.used || f.u.back) return;
    const pd = A.pd(pid), d = today(), orig = pd.ledger.filter(x => x.id === f.r.payIds[0])[0];
    let pid2 = null;
    if (f.u.amt > 0) {
      const e = { id: A.uid(), date: d, type: 'pago', amount: -f.u.amt, desc: 'Devolución de lo cobrado antes · ' + f.u.label + (f.u.tooth ? ' ' + f.u.tooth : ''), method: orig ? orig.method : 'Efectivo', pro: f.r.pro || (A.PAT(pid) || {}).pro, by: who(), pre: f.r.id, refund: 1 };
      if (curSede()) e.loc = curSede(); pd.ledger.push(e); pid2 = e.id;
    }
    f.u.back = { date: d, at: new Date().toISOString(), by: who(), pago: pid2 };
    A.touchPd(pid); A.save(); A.renderModal(); A.refresh(); A.toast(f.u.amt ? 'Devolución de ' + money(f.u.amt) + ' registrada.' : 'Autorización anulada.');
  };

  /* =====================================================================
     6. EL ODONTÓLOGO CARGA LO QUE HIZO: lo que coincide aparece «ya cobrado en secretaría»
     ===================================================================== */
  const itFam = it => famOf(it.a && it.a.cond, it.label);
  const itTooth = it => (it.a && it.a.teeth && it.a.teeth[0]) || null;
  const link = (items, pid) => {
    const pend = A.prePending(pid); if (!pend.length) return items;
    const taken = {}; items.forEach(it => { if (it.pre) taken[it.pre.uid] = 1; });
    items.forEach(it => {
      if (it.pre || it.preOff) return;
      const f = itFam(it), t = itTooth(it);
      const ok = pend.filter(x => !taken[x.u.id] && x.u.fam === f);
      const hit = ok.filter(x => x.u.tooth && t && x.u.tooth === t)[0] || ok.filter(x => !x.u.tooth)[0];
      if (!hit) return;
      taken[hit.u.id] = 1; it.pre = { rid: hit.r.id, uid: hit.u.id, amt: hit.u.amt, auth: hit.r.auth, sig: hit.r.osSig, by: hit.r.by }; it.pay = 0;
    });
    return items;
  };
  const ppPrev = A.pracParse;
  if (ppPrev) A.pracParse = function (text, pid) { const out = ppPrev.apply(this, arguments) || []; try { link(out, pid); } catch (e) { /* nada */ } return out; };
  /* lo que agrega a mano el odontólogo también se enlaza */
  const addPrev = A.chg.poAdd;
  if (addPrev) A.chg.poAdd = function () { const r = addPrev.apply(this, arguments); const m = S.modal; if (m && m.type === 'pracOk') { link(m.items, m.pid); A.renderModal(); } return r; };

  const okPrev = MF.pracOk;
  MF.pracOk = m => {
    (m.items || []).forEach(it => { if (it.pre) it.pay = 0; });
    let h = okPrev(m);
    const pend = A.prePending(m.pid), linked = m.items.filter(it => it.on && it.pre);
    if (pend.length && !m.step) {
      const free = pend.filter(x => !m.items.some(it => it.pre && it.pre.uid === x.u.id));
      const bnr = '<div class="pre-bnr" role="status"><b>Cobrado en secretaría:</b> ' + esc(sumTxt(pend.map(x => x.u))) + (pend[0].r.auth ? ' · aut. ' + esc(pend[0].r.auth) : '') +
        (linked.length ? '<span>✓ ' + linked.length + ' ya figura' + (linked.length === 1 ? '' : 'n') + ' como cobrada' + (linked.length === 1 ? '' : 's') + ' acá abajo.</span>' : '') +
        (free.length ? '<span class="pre-free">Sin usar todavía: ' + esc(sumTxt(free.map(x => x.u))) + '. Si hiciste algo de eso con otro nombre, elegilo en la práctica.</span>' : '') + '</div>';
      h = h.replace('<ul class="po-list">', bnr + '<ul class="po-list">');
    }
    return h;
  };
  const afterPrev = A.modalAfter.pracOk;
  A.modalAfter.pracOk = m => {
    if (afterPrev) afterPrev(m);
    const pend = A.prePending(m.pid);
    m.items.forEach((it, i) => {
      const inp = $('[data-in="poAmt"][data-i="' + i + '"]'), li = inp && inp.closest('li'); if (!li) return;
      if (it.pre) {
        const am = inp.closest('.po-amt');
        if (am) am.outerHTML = '<span class="po-pre"><b>✓ Ya cobrado</b><small>en secretaría ' + money(it.pre.amt) + (it.pre.auth ? ' · aut. ' + esc(it.pre.auth) : '') + '</small><button type="button" class="po-unl" data-act="preUnlink" data-i="' + i + '">no es esta</button></span>';
        li.classList.add('is-pre');
        const cop = li.querySelector('.po-cop'); if (cop) cop.hidden = true;
      } else if (it.on) {
        const free = pend.filter(x => !m.items.some(o => o.pre && o.pre.uid === x.u.id));
        if (!free.length) return;
        const sel = document.createElement('label'); sel.className = 'po-plink';
        sel.innerHTML = '<span>¿Lo cobró la secretaría?</span><select data-chg="preLink" data-i="' + i + '"><option value="">No</option>' + free.map(x => '<option value="' + x.u.id + '">Sí: ' + esc(x.u.label + (x.u.tooth ? ' ' + x.u.tooth : '')) + ' (' + money(x.u.amt) + ')</option>').join('') + '</select>';
        const l = li.querySelector('.po-l'); if (l) l.appendChild(sel);
      }
    });
    /* todo lo hecho ya estaba cobrado: un solo botón */
    const on = m.items.filter(it => it.on), allPre = on.length && on.every(it => it.pre || !(it.pay > 0)) && on.some(it => it.pre);
    if (allPre && !m.step) {
      const foot = document.querySelector('#modalHost .m-foot');
      if (foot && !foot.querySelector('[data-k="pre"]')) {
        foot.querySelectorAll('[data-act="poWho"], [data-act="poGo"][data-k="later"], [data-act="poGo"][data-k="os"]').forEach(b => b.remove());
        foot.insertAdjacentHTML('beforeend', '<button class="btn primary" data-act="poGo" data-k="pre">Listo · ya cobrado en secretaría</button>');
      }
    }
  };
  A.acts.preUnlink = el => { const it = S.modal.items[+el.getAttribute('data-i')]; if (!it) return; delete it.pre; it.preOff = 1; it.pay = A.copPayFor ? A.copPayFor(it) : (it.price || 0); A.renderModal(); };
  A.chg.preLink = el => {
    const m = S.modal, it = m.items[+el.getAttribute('data-i')], v = el.value; if (!it || !v) return;
    const hit = A.prePending(m.pid).filter(x => x.u.id === v)[0]; if (!hit) return;
    it.pre = { rid: hit.r.id, uid: hit.u.id, amt: hit.u.amt, auth: hit.r.auth, sig: hit.r.osSig, by: hit.r.by, manual: 1 }; it.pay = 0; delete it.preOff; A.renderModal();
  };

  /* al guardar: el cargo de lo que ya se cobró queda saldado con el pago de la secretaria */
  const goPrev = A.acts.poGo;
  A.acts.poGo = function (el) {
    const m = S.modal; if (!m || m.type !== 'pracOk') return goPrev.apply(this, arguments);
    const k = el.getAttribute('data-k'), pid = m.pid, pd0 = A.pd(pid), before = {};
    (pd0.ledger || []).forEach(e => { before[e.id || ''] = 1; });
    const linked = m.items.filter(it => it.on && it.pre).map(it => ({ it, fam: itFam(it), tooth: itTooth(it), done: false }));
    let r, el2 = el;
    if (k === 'pre') {
      el2 = document.createElement('button'); el2.setAttribute('data-k', 'later');
      const t0 = A.toast; A.toast = () => {};
      try { r = goPrev.call(this, el2); } finally { A.toast = t0; }
    } else r = goPrev.call(this, el2);
    if (k === 'nota' || !linked.length) return r;
    try {
      const pd = A.pd(pid), d = today(), mine = []; let nPre = 0;
      (pd.ledger || []).forEach(e => {
        if (e.type !== 'cargo' || before[e.id || ''] || e.voided) return;
        const t = (pd.tx || []).filter(x => x.id === e.txId)[0];
        const f = famOf(t && t.cond, (t && t.label) || e.desc), tooth = t && t.tooth ? +t.tooth : null;
        const L = linked.filter(x => !x.done && x.fam === f);
        const x = L.filter(y => y.tooth && tooth && y.tooth === tooth)[0] || L[0]; if (!x) return;
        x.done = true;
        const fu = findU(pid, x.it.pre.rid, x.it.pre.uid); if (!fu.u || fu.u.used) return;
        e.amount = fu.u.amt; e.cobOk = 'pre'; e.cob = e.cob || 'rcp'; e.cobDone = new Date().toISOString(); e.cobDoneBy = fu.r.by || ''; e.preId = fu.r.id; if (fu.r.payIds[0]) e.pagoId = fu.r.payIds[0];
        e.desc = String(e.desc || '') + ' · cobrado antes' + (fu.r.auth ? ' (aut. ' + fu.r.auth + ')' : '');
        fu.u.used = { date: d, at: new Date().toISOString(), by: who(), pro: e.pro || m.pro, cargo: e.id };
        mine.push(e.id); nPre++;
      });
      /* «Listo»: lo que quedó en $0 sin cobrar tampoco pasa a «Para cobrar» */
      if (k === 'pre') (pd.ledger || []).forEach(e => { if (e.type === 'cargo' && !before[e.id || ''] && !e.voided && !e.cobOk && !(+e.amount > 0)) { e.cobOk = 'cero'; mine.push(e.id); } });
      if (mine.length) {
        A.touchPd(pid); A.save();
        /* si se abrió el cobro, lo ya cobrado no entra */
        const pm = S.modal; if (pm && pm.type === 'pcPay' && pm.pid === pid) { pm.ids = pm.ids.filter(id => mine.indexOf(id) < 0); const left = pd.ledger.filter(e => pm.ids.indexOf(e.id) >= 0); pm.tot = left.reduce((s, e) => s + (+e.amount || 0), 0); pm.a1 = pm.tot; A.renderModal(); }
        A.refresh(); if (A.renderPanel) A.renderPanel();
      }
      if (k === 'pre') {
        S.modal = null; A.renderModal(); A.refresh(); if (A.renderPanel) A.renderPanel();
        A.toast('Guardado. ' + nPre + ' práctica' + (nPre === 1 ? '' : 's') + ' ya cobrada' + (nPre === 1 ? '' : 's') + ' en secretaría: no pasa' + (nPre === 1 ? '' : 'n') + ' a cobrar.');
      }
    } catch (e) { /* nada */ }
    return r;
  };

  /* =====================================================================
     7. DÓNDE SE VE: en el turno, al marcar «Llegó», en la ficha y en «Para cobrar»
     ===================================================================== */
  /* botón en la ventanita del turno */
  new MutationObserver(() => {
    const tp = $('#tpop'); if (!tp || tp.querySelector('[data-act="preOpen"]') || !canCob()) return;
    const acts = tp.querySelector('.tp-acts'), any = tp.querySelector('[data-act="tpSobre"][data-id]'); if (!acts || !any) return;
    const a = A.apptById(any.getAttribute('data-id')); if (!a || !a.pid) return;
    const n = A.prePending(a.pid).length;
    const b = document.createElement('button'); b.setAttribute('data-act', n ? 'preList' : 'preOpen'); b.setAttribute('data-pid', a.pid); b.setAttribute('data-id', a.id); b.className = 'tp-pre';
    b.innerHTML = '<span aria-hidden="true">💳</span> ' + (n ? 'Cobrado antes (' + n + ' sin hacer)' : 'Cobrar antes de atender');
    const dz = acts.querySelector('.danger'); acts.insertBefore(b, dz || null);
  }).observe(document.body, { childList: true });

  /* al marcar «Llegó» un paciente con obra social que pide autorización */
  const ssPrev = A.setStatus;
  if (ssPrev) A.setStatus = function (id, st) {
    const r = ssPrev.apply(this, arguments);
    try {
      const a = A.apptById(id); if (st !== 'llego' || !a || !a.pid || S.modal || !canCob()) return r;
      const os = patOS(a.pid); if (!os || !os.auth) return r;
      if (preOf(a.pid).some(x => x.date === today())) return r;
      A.toast('Llegó ' + ((A.PAT(a.pid) || {}).first || (A.PAT(a.pid) || {}).name || '') + ' (' + os.sigla + '). ¿Trae prácticas autorizadas?', () => A.preOpenFor(a.pid, a.id));
      const ub = document.querySelector('#toastHost [data-act="toastUndo"]'); if (ub) ub.textContent = 'Cobrar autorizadas';
    } catch (e) { /* nada */ }
    return r;
  };

  /* ficha: aviso arriba si hay algo cobrado sin hacer + botón en la cuenta */
  const fichaDeco = () => {
    if (S.tab !== 'ficha' || !S.fichaPid) return; const v = $('#view-ficha'); if (!v) return;
    const pid = S.fichaPid, pend = A.prePending(pid), old = v.querySelector('.pre-fbnr');
    if (!pend.length) { if (old) old.remove(); }
    else {
      const html = '<div class="pre-fbnr" role="status"><span>Cobrado en secretaría, falta hacer: <b>' + esc(sumTxt(pend.map(x => x.u))) + '</b>' + (pend[0].r.auth ? ' · aut. ' + esc(pend[0].r.auth) : '') + '</span><button class="btn small" data-act="preList" data-pid="' + pid + '">Ver</button></div>';
      if (old) old.outerHTML = html; else { const h1 = v.querySelector('h1'); const at = h1 ? (h1.closest('.ag-bar') || h1) : v.firstElementChild; if (at) at.insertAdjacentHTML('afterend', html); }
    }
    const cb = v.querySelector('[data-act="cobroNew"]');
    if (cb && canCob() && !v.querySelector('.row-btns [data-act="preOpen"]')) cb.insertAdjacentHTML('afterend', '<button class="btn" data-act="preOpen" data-pid="' + pid + '">Cobrar antes de atender</button>' + (preOf(pid).length ? '<button class="btn ghost" data-act="preList" data-pid="' + pid + '">Autorizaciones</button>' : ''));
  };
  const arPrev = A.afterRefresh; A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; try { osSeed(); fichaDeco(); } catch (e) { /* nada */ } return r; };

  /* «Para cobrar» (inicio y caja): cuántos pagaron antes y todavía no pasaron */
  const pcPrev = A.pcHTML;
  if (pcPrev) A.pcHTML = function (where) {
    const h = pcPrev.apply(this, arguments); if (role() === 'profesional' || role() === 'asistente') return h;
    const G = allPend().filter(g => g.L.some(x => x.r.date >= A.add(today(), -30))); if (!G.length) return h;
    const n = G.reduce((s, g) => s + g.L.length, 0);
    const line = '<button class="pre-line" data-act="preList"><span>💳 Cobrado antes de atender, falta hacer: <b>' + n + ' práctica' + (n === 1 ? '' : 's') + '</b> de ' + G.length + ' paciente' + (G.length === 1 ? '' : 's') + '</span><span aria-hidden="true">›</span></button>';
    if (!h) return where === 'inicio' ? '' : '<section class="card pc-card">' + line + '</section>';
    return h.replace(/<\/section>$/, line + '</section>');
  };

  /* la cuenta del paciente: lo cobrado antes que no se hizo es saldo a favor (ya sale solo del pago) */

  const css = document.createElement('style');
  css.textContent = '.pc-lead{font-size:.88rem;margin:4px 0 10px}.pre-had{padding:8px 10px;border-radius:10px;background:#fff4e0;font-size:.86rem;margin-bottom:8px}' +
    '.pc-lines{list-style:none;margin:6px 0;padding:0;display:grid;gap:8px}.pc-ln{display:grid;grid-template-columns:auto 1fr auto auto;gap:8px;align-items:center;padding:8px;border:1px solid var(--line,#d5e2e1);border-radius:12px}' +
    '.pc-q{display:flex;align-items:center;gap:4px}.pc-q b{min-width:18px;text-align:center}.pc-qb{width:30px;height:30px;border-radius:50%;border:1px solid var(--line,#ccd);background:var(--card,#fff);color:inherit;font:inherit;font-size:1.05rem;cursor:pointer}' +
    '.pc-what{display:grid;gap:5px;min-width:0}.pc-what select,.pc-what input{width:100%;min-width:0;padding:7px 8px;border:1px solid var(--line,#ccd);border-radius:9px;font:inherit;font-size:.92rem;background:var(--card,#fff);color:inherit}.pc-what .pc-tooth{max-width:150px}' +
    '.pc-am{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:2px}.pc-am input{width:92px;padding:7px 8px;border:1px solid var(--line,#ccd);border-radius:9px;font:inherit}.pc-am small{grid-column:1/-1;font-size:.72rem;color:var(--muted,#567);text-align:right}' +
    '.pc-del{border:0;background:none;color:#b42318;font-size:1.3rem;cursor:pointer;padding:0 4px}' +
    '@media(max-width:520px){.pc-ln{grid-template-columns:auto 1fr auto}.pc-am{grid-column:2/3}.pc-del{grid-row:1;grid-column:3}}' +
    '.pre-bnr{display:grid;gap:3px;margin:4px 0 10px;padding:9px 12px;border-radius:12px;background:#e6f4ea;border:1px solid #b7dfc3;font-size:.88rem}.pre-bnr span{font-size:.84rem}.pre-free{color:#7a4d00}' +
    '.po-pre{display:grid;justify-items:end;gap:1px;color:#1e7a3c;font-size:.86rem;text-align:right}.po-pre small{color:var(--muted,#567);font-size:.76rem}.po-unl{border:0;background:none;color:var(--accent,#0d6b6b);text-decoration:underline;font:inherit;font-size:.76rem;cursor:pointer;padding:0}' +
    '.po-list li.is-pre{background:#f1faf3}.po-plink{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:.8rem;color:var(--muted,#567);margin-top:3px}.po-plink select{font:inherit;font-size:.8rem;padding:3px 6px;border-radius:8px;border:1px solid var(--line,#ccd);max-width:100%}' +
    '.pre-fbnr{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:space-between;margin:8px 0;padding:10px 12px;border-radius:12px;background:#e6f4ea;font-size:.9rem}' +
    '.pre-line{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;margin-top:10px;padding:10px 12px;border:1px dashed #b7dfc3;border-radius:12px;background:#f1faf3;color:inherit;font:inherit;font-size:.9rem;text-align:left;cursor:pointer}' +
    '.pl-h{margin:12px 0 4px;font-size:1rem}.pl-r{border:1px solid var(--line,#d5e2e1);border-radius:12px;padding:8px 10px;margin:6px 0}.pl-rh{font-size:.86rem;color:var(--muted,#567)}.pl-u{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:6px}' +
    '.pl-u li{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap}.pl-b{display:flex;gap:6px}.pl-u .ok{color:#1e7a3c}.pl-u .bk{color:#b42318}' +
    '.tp-acts .tp-pre{grid-column:1/-1;border-color:#b7dfc3;background:#f1faf3}' +
    '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .pre-bnr,:root:not([data-theme="light"]) .pre-fbnr{background:#17331f;border-color:#2c5b3a}:root:not([data-theme="light"]) .po-list li.is-pre,:root:not([data-theme="light"]) .pre-line,:root:not([data-theme="light"]) .tp-acts .tp-pre{background:#132a1a}:root:not([data-theme="light"]) .pre-had{background:#3d2f16}}' +
    ':root[data-theme="dark"] .pre-bnr,:root[data-theme="dark"] .pre-fbnr{background:#17331f;border-color:#2c5b3a}:root[data-theme="dark"] .po-list li.is-pre,:root[data-theme="dark"] .pre-line,:root[data-theme="dark"] .tp-acts .tp-pre{background:#132a1a}:root[data-theme="dark"] .pre-had{background:#3d2f16}';
  document.head.appendChild(css);
})();
