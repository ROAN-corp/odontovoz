/* ===== 1.30: «Qué hice hoy» → prácticas con precio → «Para cobrar» en recepción (o cobra el profesional) → resumen y cierre del día ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, P = window.OdontoParser;
  const money = n => A.money(n);
  const N = s => (A.norm ? A.norm(s) : String(s || '').toLowerCase());
  const isEmp = () => !!(A.isEmp && A.isEmp());
  const isSolo = () => !!(A.isSolo && A.isSolo());
  const mb = () => (A.memberNow && A.memberNow()) || null;
  const role = () => { const m = mb(); return m ? m.role : null; };
  const curSede = () => (isEmp() && A.empSede ? A.empSede() : null);
  const who = () => { const m = mb(); if (m && m.name) return m.name; const p = A.empCurPerson && A.empCurPerson(); if (p && p.name) return p.name; return (A.CFG && A.CFG.ownerName) || (S.setup && S.setup.doctor) || ''; };
  const canCfg = () => !mb() || role() === 'admin';
  const proName = id => { const p = A.PRO(id) || {}; return p.short || p.name || 'Profesional'; };
  const today = () => A.today();
  const TOOTH = /\b([1-4][1-8]|[5-8][1-5])\b/g;
  const pnum = pid => String(pid).replace(/\D/g, '') || '0';

  /* ---------- quién cobra a cada profesional: recepción o él mismo ---------- */
  const cobraOf = pid => { const c = (A.CFG.cobra || {})[pid]; if (c) return c; return (isSolo() ? 'pro' : 'rcp'); };

  /* =====================================================================
     1. LEER LO QUE ESCRIBIÓ EL ODONTÓLOGO
     ===================================================================== */
  /* prácticas sin pieza que salen del catálogo de aranceles (el primero que coincide gana) */
  const CATKW = [
    [/control de ortodoncia|ortodoncia.*control/, 'Control de ortodoncia'],
    [/limpieza|profilaxis|tartrectomia|destartraje/, 'Limpieza y control'],
    [/panoramic/, 'Radiografía panorámica'],
    [/radiograf|\brx\b|periapical|placa/, 'Radiografía periapical'],
    [/fluor/, 'Aplicación de flúor'],
    [/urgencia/, 'Atención de urgencia'],
    [/raspaje|alisado radicular/, 'Raspaje y alisado (por cuadrante)'],
    [/blanqueamiento/, 'Blanqueamiento dental'],
    [/ferula|placa de descanso|placa miorrelajante/, 'Férula de descarga'],
    [/retenedor/, 'Retenedores'],
    [/consulta|diagnostico|primera vez|revision/, 'Consulta / diagnóstico']
  ];
  const SYN = [
    [/\b(le\s+)?(saque|extraje|sacamos|exodoncia de|exodoncia)\b/g, 'extraccion '],
    [/\b(hice|hicimos|realice|realizamos|se hizo|se realizo|le hice|le hicimos)\b/g, ' '],
    [/\btratamiento de conducto\b/g, 'endodoncia '],
    [/\bperno muñon\b/g, 'perno ']
  ];
  const isPract = cond => !!(A.ARANCEL && A.ARANCEL[cond]);
  const osCalc = (pid, t) => {
    const pat = A.PAT(pid), os = A.osOf ? A.osOf(pat) : null, code = A.codeFor ? A.codeFor(t) : null, ar = os && os.on && code && os.aran ? os.aran[code] : null;
    if (!ar || !ar.on) return null;
    return { sigla: os.sigla, cov: ar.cov || 0, cos: ar.cos || 0 };
  };
  A.pracParse = (text, pid) => {
    if (!P) return [];
    let s = N(text); SYN.forEach(x => { s = s.replace(x[0], x[1]); });
    const segs = s.split(/[.;\n]|,|\s+y\s+(?=[a-z])/).map(x => x.trim()).filter(Boolean);
    const out = [], seen = {}; let last = null;
    const push = it => { const k = it.key; if (seen[k]) return; seen[k] = 1; out.push(it); };
    const odonItem = (a, n) => {
      let cond = a.cond; if (cond === 'extraccion') cond = 'extraido';
      if (!isPract(cond)) return;
      const faces = a.faces ? a.faces.slice().sort().join('') : '';
      const t = { cond, tooth: n, faces, label: A.txLabel(cond, n, faces) };
      const price = A.priceOf(cond, faces.length || 1), os = osCalc(pid, t);
      push({ key: 'o' + cond + n + faces, kind: 'odon', a: { type: 'mark', teeth: [n], faces: a.faces ? a.faces.slice() : null, cond, status: 'realizado' }, label: t.label, price, os, pay: os ? os.cos : price, on: true });
    };
    segs.forEach(seg => {
      const r = P.parse(seg, { lastTooth: null }), acts = r.actions.filter(a => a.type === 'mark' && isPract(a.cond === 'extraccion' ? 'extraido' : a.cond));
      const nums = (seg.match(TOOTH) || []).map(Number);
      if (acts.length) {
        acts.forEach(a => { a.teeth.forEach(n => odonItem(a, n)); last = a; });
        /* «restauración oclusal 25 y 26»: el intérprete toma la primera pieza; las demás repiten la práctica */
        const got = []; acts.forEach(a => a.teeth.forEach(n => got.push(n)));
        nums.filter(n => got.indexOf(n) < 0).forEach(n => odonItem(last, n));
        return;
      }
      /* solo números («26», «la 27»): repite la práctica anterior */
      if (nums.length && last && /^(?:(?:la|el|en|pieza|piezas|y|e|tambien)\s*|\d{2}\s*)+$/.test(seg)) { nums.forEach(n => odonItem(last, n)); return; }
      const kw = CATKW.filter(x => x[0].test(seg))[0];
      if (kw && A.CAT.some(c => c.label === kw[1])) {
        const price = A.catPrice(kw[1], 0), t = { label: kw[1] }, os = osCalc(pid, t);
        let qty = 1; const mq = /\b(\d|dos|tres|cuatro)\s+cuadrantes?\b/.exec(seg); if (mq && /cuadrante/.test(kw[1])) qty = { dos: 2, tres: 3, cuatro: 4 }[mq[1]] || +mq[1] || 1;
        push({ key: 'c' + kw[1], kind: 'cat', label: kw[1] + (qty > 1 ? ' × ' + qty : ''), price: price * qty, os, pay: os ? os.cos * qty : price * qty, on: true });
      }
    });
    return out;
  };

  /* =====================================================================
     2. «QUÉ HICE HOY»: si hay prácticas, se confirman con un toque
     ===================================================================== */
  const qnHTMLPrev = A.quickNoteHTML;
  A.quickNoteHTML = function (pid, opt) {
    let h = qnHTMLPrev.apply(this, arguments);
    h = h.replace('>Guardar en la historia</button>', '>Guardar</button>');
    return h.replace('<label class="sr" for="qnTxt">', '<p class="qn-hint">Si escribís las prácticas («composite oclusal 25 y 26», «limpieza», «extracción 48») se cargan con su precio y pasan a cobrar.</p><label class="sr" for="qnTxt">');
  };
  const qnSavePrev = A.acts.qnSave;
  A.acts.qnSave = function (el) {
    const pid = el.getAttribute('data-pid'), txt = (($('#qnTxt') || {}).value || '').trim();
    if (!txt || role() === 'recepcion' || role() === 'asistente') return qnSavePrev.apply(this, arguments);
    const items = A.pracParse(txt, pid);
    if (!items.length) return qnSavePrev.apply(this, arguments);
    const id = el.getAttribute('data-id'), a = id ? A.apptById(id) : null, m = mb();
    const pro = (m && m.pro) || (a && a.pro) || (S.uimode === 'atencion' && S.me) || (A.PAT(pid) || {}).pro || (A.PROS[0] || {}).id;
    S.modal = { type: 'pracOk', pid, txt, items, apptId: id || null, pro, done: !!($('#qnDone') && $('#qnDone').checked) };
    A.renderModal();
  };
  /* también desde la evolución con prácticas escritas a mano: un botón directo */
  A.acts.pracFrom = el => {
    const pid = el.getAttribute('data-pid'), txt = (($('#qnTxt') || {}).value || '').trim();
    const items = txt ? A.pracParse(txt, pid) : [];
    S.modal = { type: 'pracOk', pid, txt, items, apptId: el.getAttribute('data-id') || null, pro: (mb() && mb().pro) || (A.PAT(pid) || {}).pro, done: false, only: !txt };
    A.renderModal();
  };

  MF.pracOk = m => {
    const p = A.PAT(m.pid) || {}, os = A.osOf ? A.osOf(p) : null, tot = m.items.filter(i => i.on).reduce((s, i) => s + (i.pay || 0), 0);
    const cob = cobraOf(m.pro), solo = isSolo();
    let b = '<p class="po-who"><b>' + esc(p.name || 'Paciente') + '</b> · ' + esc(os ? os.sigla : (p.cov || 'Particular')) + ' · atendió ' + esc(proName(m.pro)) + '</p>';
    b += '<ul class="po-list">' + m.items.map((it, i) => '<li class="' + (it.on ? '' : 'off') + '"><label class="po-chk"><input type="checkbox" data-chg="poOn" data-i="' + i + '"' + (it.on ? ' checked' : '') + ' aria-label="Incluir ' + esc(it.label) + '"></label><span class="po-l"><b>' + esc(it.label) + '</b>' +
      (it.os ? '<small>' + esc(it.os.sigla) + ' cubre ' + money(it.os.cov) + ' · paga el paciente</small>' : '<small>' + (os ? 'sin arancel de ' + esc(os.sigla) + ' cargado · ' : '') + 'particular</small>') + '</span>' +
      '<span class="po-amt"><span aria-hidden="true">$</span><input inputmode="numeric" data-in="poAmt" data-i="' + i + '" value="' + (it.pay || 0) + '" aria-label="Importe de ' + esc(it.label) + '"></span></li>').join('') + '</ul>';
    b += '<div class="po-add"><select data-chg="poAdd" aria-label="Agregar otra práctica del catálogo"><option value="">+ Agregar otra práctica…</option>' + A.catCats().map(c => '<optgroup label="' + esc(c) + '">' + A.CAT.filter(x => x.cat === c).map(x => '<option value="' + esc(x.k) + '">' + esc(x.label) + ' · ' + money(x.price) + '</option>').join('') + '</optgroup>').join('') + '</select></div>';
    b += '<div class="po-tot"><span>Total a cobrar hoy</span><b id="poTot">' + money(tot) + '</b></div>';
    if (!solo && canCfg()) b += '<label class="po-cfg">A ' + esc(proName(m.pro)) + ' le cobra <select data-chg="poCobra"><option value="rcp"' + (cob === 'rcp' ? ' selected' : '') + '>la recepción</option><option value="pro"' + (cob === 'pro' ? ' selected' : '') + '>el mismo profesional</option></select></label>';
    b += '<p class="hint" style="margin:6px 0 0">Las prácticas quedan en la historia clínica y en el odontograma (en rojo, realizadas).</p><div class="hint bad" id="poMsg"></div>';
    const mainRcp = !solo && cob === 'rcp';
    const f = '<button class="btn" data-act="closeModal">Volver</button>' + (m.only ? '' : '<button class="btn ghost" data-act="poGo" data-k="nota">Solo nota, sin cobrar</button>') +
      (solo ? '<button class="btn" data-act="poGo" data-k="later">Cobrar después</button><button class="btn primary" data-act="poGo" data-k="pro">Cobrar ahora</button>'
        : mainRcp ? '<button class="btn" data-act="poGo" data-k="pro">Cobrar yo</button><button class="btn primary" data-act="poGo" data-k="rcp">Mandar a recepción →</button>'
          : '<button class="btn" data-act="poGo" data-k="rcp">Mandar a recepción</button><button class="btn primary" data-act="poGo" data-k="pro">Cobrar yo</button>');
    return A.modalShell('Prácticas de hoy', b, f);
  };
  const poSync = () => { const m = S.modal; if (!m || m.type !== 'pracOk') return; A.$$('[data-in="poAmt"]').forEach(i => { const it = m.items[+i.getAttribute('data-i')]; if (it) it.pay = parseInt(String(i.value).replace(/\D/g, ''), 10) || 0; }); };
  A.ins.poAmt = () => { poSync(); const m = S.modal, t = $('#poTot'); if (t) t.textContent = money(m.items.filter(i => i.on).reduce((s, i) => s + (i.pay || 0), 0)); };
  A.chg.poOn = el => { poSync(); const it = S.modal.items[+el.getAttribute('data-i')]; if (it) it.on = el.checked; A.renderModal(); };
  A.chg.poAdd = el => {
    poSync(); const c = A.CAT.filter(x => x.k === el.value)[0]; if (!c) return; const m = S.modal, os = osCalc(m.pid, { label: c.label });
    m.items.push({ key: 'c' + c.k + Date.now(), kind: 'cat', label: c.label, price: c.price, os, pay: os ? os.cos : c.price, on: true }); A.renderModal();
  };
  A.chg.poCobra = el => { poSync(); A.CFG.cobra = A.CFG.cobra || {}; A.CFG.cobra[S.modal.pro] = el.value; A.save(); A.renderModal(); };

  A.acts.poGo = el => {
    poSync(); const m = S.modal, k = el.getAttribute('data-k'), pid = m.pid, pd = A.pd(pid), d = today(), items = m.items.filter(i => i.on);
    if (k !== 'nota' && !items.length) { $('#poMsg').textContent = 'Tildá al menos una práctica, o tocá «Solo nota».'; return; }
    const a = m.apptId ? A.apptById(m.apptId) : null;
    /* nota en la historia clínica: el texto tal cual lo escribió */
    if (m.txt) pd.notes.unshift({ id: A.uid(), date: d, pro: m.pro, text: m.txt, quick: true });
    const made = [];
    if (k !== 'nota') items.forEach(it => {
      const before = pd.ledger.length;
      if (it.kind === 'odon') A.applyAction(pd, it.a, { date: d, pro: m.pro, onDone: t => { A.onTxDone(pid, t); made.push(t); } });
      else { const t = { id: A.uid(), cond: null, tooth: null, faces: '', label: it.label, price: it.price, status: 'hecho', planDate: null, doneDate: d, pro: m.pro, bid: null }; pd.tx.push(t); A.onTxDone(pid, t); made.push(t); }
      /* el cargo que se acaba de crear: importe confirmado y a quién le toca cobrarlo */
      pd.ledger.slice(before).filter(e => e.type === 'cargo' && !e.voided).forEach(e => {
        e.amount = it.pay; e.cob = k === 'later' ? 'pro' : k; e.cobAt = new Date().toISOString(); e.cobBy = who();
        if (a) e.apptId = a.id; if (curSede() && !e.loc) e.loc = curSede();
      });
    });
    if (k !== 'nota' && items.length) pd.odonDate = pd.odonDate || d;
    A.touchPd(pid);
    if (a && (m.done || k !== 'nota') && a.status !== 'atendido') A.setStatus(a.id, 'atendido');
    if (a && k === 'rcp' && A.mutate) A.mutate([a.date], () => { a.toRcp = new Date().toISOString(); }, 'Mandado a recepción');
    if (A.empAudit && k !== 'nota') A.empAudit(proName(m.pro) + ' cargó ' + items.length + ' práctica' + (items.length === 1 ? '' : 's') + ' a ' + (A.PAT(pid) || {}).name + (k === 'rcp' ? ' y lo mandó a recepción' : '') + '.');
    S.modal = null; A.renderModal(); A.save();
    if (k === 'pro') { openPay(pid); return; }
    A.toast(k === 'nota' ? 'Guardado en la historia clínica.' : k === 'rcp' ? (A.PAT(pid) || {}).name + ' pasó a «Para cobrar» en la recepción.' : 'Queda en «Para cobrar».');
    if (A.renderPanel) A.renderPanel(); A.refresh();
  };

  /* =====================================================================
     3. «PARA COBRAR»: lo que mandaron los odontólogos, por paciente
     ===================================================================== */
  const DAYS_BACK = 7;
  A.pcList = (opt) => {
    opt = opt || {}; const from = A.add(today(), -DAYS_BACK), sd = curSede(), m = mb(), mine = m && m.role === 'profesional' ? m.pro : (S.uimode === 'atencion' && !isSolo() ? S.me : null);
    const out = [];
    A.PATS.forEach(p => {
      const pd = A.S.pd[p.id]; if (!pd || !pd.ledger) return;
      const its = pd.ledger.filter(e => e.type === 'cargo' && e.cob && !e.cobOk && !e.voided && e.date >= from);
      if (!its.length) return;
      const keep = its.filter(e => (!sd || !A.empCargoLoc || A.empCargoLoc(p.id, e) === sd) && (!mine || e.pro === mine));
      if (!keep.length) return;
      const pros = []; keep.forEach(e => { if (pros.indexOf(e.pro) < 0) pros.push(e.pro); });
      const tot = keep.reduce((s, e) => s + e.amount, 0), sal = A.saldo(p.id);
      const ap = (A.S.days[keep[0].date] || []).filter(x => x.pid === p.id && x.type !== 'block' && pros.indexOf(x.pro) >= 0)[0];
      const room = ap && A.roomOf ? A.roomOf(ap) : null;
      out.push({ pid: p.id, name: p.name, cov: p.cov, items: keep, tot, prev: Math.max(0, sal - tot), pros, date: keep[0].date, at: keep.map(e => e.cobAt || '').sort().pop(), who: keep[0].cob, room: room ? room.name : '', ap });
    });
    return out.sort((x, y) => (x.at < y.at ? -1 : 1));
  };
  /* cobrado hoy (para el resumen): pagos del día en el centro actual */
  function paidToday(d) {
    const sd = curSede(), rows = [];
    A.PATS.forEach(p => { const pd = A.S.pd[p.id]; if (!pd || !pd.ledger) return; pd.ledger.forEach(e => { if (e.type !== 'pago' || e.voided || e.anula || e.date !== d) return; if (sd && A.empPayLoc && A.empPayLoc(p.id, e) !== sd) return; rows.push({ p, e }); }); });
    return rows;
  }
  const canCobrar = it => { const r = role(); if (!r || r === 'admin' || r === 'recepcion') return true; if (r === 'profesional') return it.items.every(e => e.cob === 'pro'); return false; };

  A.pcHTML = (where) => {
    if (role() === 'asistente') return '';
    const L = A.pcList(), paid = paidToday(today()), r = role(), proOnly = r === 'profesional';
    if (!L.length && !paid.length && where === 'inicio') return '';
    const cob = paid.reduce((s, x) => s + x.e.amount, 0), nP = {}; paid.forEach(x => { nP[x.p.id] = 1; });
    let h = '<section class="card pc-card"><div class="pc-h"><h2>' + (proOnly ? 'Mis pacientes por cobrar' : 'Para cobrar') + (L.length ? ' <span class="pc-n">' + L.length + '</span>' : '') + '</h2>' +
      (proOnly ? '' : '<button class="btn small" data-act="pcDay">Cobrado hoy: ' + money(cob) + (Object.keys(nP).length ? ' · ' + Object.keys(nP).length : '') + ' ›</button>') + '</div>';
    if (!L.length) h += '<p class="pc-empty">' + (proOnly ? 'No hay pacientes tuyos esperando cobro.' : 'No hay nadie esperando para pagar. Cuando un odontólogo cargue lo que hizo y lo mande, aparece acá.') + '</p>';
    else h += '<ul class="pc-list">' + L.map(it => {
      const pro = it.pros.map(proName).join(', '), osTxt = it.cov ? ' · ' + esc(it.cov) : '';
      return '<li class="pc-it"><div class="pc-l"><b>' + esc(it.name) + '</b><small>' + esc([it.room, pro].filter(Boolean).join(' · ')) + osTxt + (it.date !== today() ? ' · del ' + A.fmtDMY(it.date) : it.at ? ' · ' + new Date(it.at).toTimeString().slice(0, 5) : '') + (it.who === 'pro' && !isSolo() ? ' · lo cobra el profesional' : '') + '</small>' +
        '<span class="pc-det">' + it.items.map(e => esc(e.desc.split(' · ').slice(0, 2).join(' · '))).join(' · ') + '</span></div>' +
        '<div class="pc-r"><b class="pc-amt">' + money(it.tot) + '</b>' + (it.prev ? '<small>+ debía ' + money(it.prev) + '</small>' : '') +
        (canCobrar(it) ? '<button class="btn small primary" data-act="pcPay" data-pid="' + it.pid + '">Cobrar</button>' : '<small>espera en recepción</small>') + '</div></li>';
    }).join('') + '</ul>';
    return h + '</section>';
  };
  ['inicio', 'caja'].forEach(tab => {
    const prev = A.render[tab]; if (!prev) return;
    A.render[tab] = function () {
      const r = prev.apply(this, arguments);
      const host = $('#view-' + tab); if (!host) return r;
      const h = A.pcHTML(tab); if (!h) return r;
      const crumb = host.querySelector('.emp-crumb');
      if (tab === 'caja') { const top = host.querySelector('.cash-top'); if (top) top.insertAdjacentHTML('afterend', h); else host.insertAdjacentHTML('afterbegin', h); }
      else if (crumb) crumb.insertAdjacentHTML('afterend', h); else host.insertAdjacentHTML('afterbegin', h);
      return r;
    };
  });

  /* ---------- cobrar ---------- */
  function openPay(pid) {
    const it = A.pcList().filter(x => x.pid === pid)[0] || null;
    const sal = A.saldo(pid), tot = it ? it.tot : Math.max(0, sal);
    S.modal = { type: 'pcPay', pid, ids: it ? it.items.map(e => e.id) : [], tot, prev: it ? it.prev : 0, addPrev: false, split: false, m1: 'Efectivo', m2: 'Transferencia', a1: tot, a2: 0 };
    A.renderModal();
  }
  A.acts.pcPay = el => openPay(el.getAttribute('data-pid'));
  const METH = () => (A.METHODS || ['Efectivo', 'Transferencia', 'Débito', 'Crédito', 'Mercado Pago']).filter(x => !/obra social/i.test(x));
  MF.pcPay = m => {
    const p = A.PAT(m.pid) || {}, pd = A.pd(m.pid), its = pd.ledger.filter(e => m.ids.indexOf(e.id) >= 0), want = m.tot + (m.addPrev ? m.prev : 0);
    const sel = (k, v) => '<select data-chg="ppMeth" data-k="' + k + '">' + METH().map(x => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>';
    let b = '<p class="po-who"><b>' + esc(p.name) + '</b> · ' + esc(p.cov || 'Particular') + '</p>';
    if (its.length) b += '<ul class="po-list ro">' + its.map(e => '<li><span class="po-l"><b>' + esc(e.desc.split(' · ').slice(0, 2).join(' · ')) + '</b><small>' + esc(proName(e.pro)) + (e.desc.indexOf(' cubre ') >= 0 ? ' · ' + esc(e.desc.split(' · ').slice(2).join(' · ')) : '') + '</small></span><b class="po-v">' + money(e.amount) + '</b></li>').join('') + '</ul>';
    if (m.prev) b += '<label class="chk po-prev"><input type="checkbox" data-chg="ppPrev"' + (m.addPrev ? ' checked' : '') + '> <span>Sumar lo que debía de antes: <b>' + money(m.prev) + '</b></span></label>';
    b += '<div class="po-tot"><span>A cobrar</span><b>' + money(want) + '</b></div>';
    b += '<div class="pp-row"><span class="po-amt"><span aria-hidden="true">$</span><input inputmode="numeric" data-in="ppAmt" data-k="a1" value="' + m.a1 + '" aria-label="Importe"></span>' + sel('m1', m.m1) + '</div>';
    if (m.split) b += '<div class="pp-row"><span class="po-amt"><span aria-hidden="true">$</span><input inputmode="numeric" data-in="ppAmt" data-k="a2" value="' + m.a2 + '" aria-label="Importe del segundo medio"></span>' + sel('m2', m.m2) + '</div>';
    b += '<button class="btn small ghost" data-act="ppSplit">' + (m.split ? 'Un solo medio de pago' : 'Paga con dos medios') + '</button><div class="hint" id="ppMsg"></div>';
    return A.modalShell('Cobrar', b, '<button class="btn" data-act="closeModal">Cancelar</button>' + (its.length ? '<button class="btn ghost" data-act="ppDebt">Queda debiendo</button>' : '') + '<button class="btn primary" data-act="ppGo">Cobrar</button>');
  };
  const ppSync = () => { const m = S.modal; A.$$('[data-in="ppAmt"]').forEach(i => { m[i.getAttribute('data-k')] = parseInt(String(i.value).replace(/\D/g, ''), 10) || 0; }); };
  const ppHint = () => { const m = S.modal, want = m.tot + (m.addPrev ? m.prev : 0), got = m.a1 + (m.split ? m.a2 : 0), o = $('#ppMsg'); if (!o) return; o.className = 'hint' + (got < want ? ' warn' : ''); o.textContent = got < want ? 'Faltan ' + money(want - got) + ': queda como deuda en su cuenta.' : got > want ? 'Paga ' + money(got - want) + ' de más: queda a favor.' : ''; };
  A.ins.ppAmt = () => { ppSync(); ppHint(); };
  A.chg.ppMeth = el => { ppSync(); S.modal[el.getAttribute('data-k')] = el.value; };
  A.chg.ppPrev = el => { ppSync(); const m = S.modal; m.addPrev = el.checked; m.a1 = m.tot + (m.addPrev ? m.prev : 0) - (m.split ? m.a2 : 0); A.renderModal(); };
  A.acts.ppSplit = () => { ppSync(); const m = S.modal, want = m.tot + (m.addPrev ? m.prev : 0); m.split = !m.split; if (m.split) { m.a1 = Math.round(want / 2); m.a2 = want - m.a1; } else { m.a1 = want; m.a2 = 0; } A.renderModal(); };
  const settle = (pd, ids, how, pagoId) => pd.ledger.forEach(e => { if (ids.indexOf(e.id) >= 0) { e.cobOk = how; e.cobDone = new Date().toISOString(); e.cobDoneBy = who(); if (pagoId) e.pagoId = pagoId; } });
  A.acts.ppGo = () => {
    ppSync(); const m = S.modal, pid = m.pid, pd = A.pd(pid), d = today(), its = pd.ledger.filter(e => m.ids.indexOf(e.id) >= 0);
    const lines = [[m.a1, m.m1]].concat(m.split ? [[m.a2, m.m2]] : []).filter(l => l[0] > 0);
    if (!lines.length) { const o = $('#ppMsg'); o.className = 'hint bad'; o.textContent = 'Escribí cuánto paga.'; return; }
    /* a quién se le atribuye el cobro: el profesional con más importe en lo que se cobra */
    const by = {}; its.forEach(e => { by[e.pro] = (by[e.pro] || 0) + e.amount; }); const pro = Object.keys(by).sort((x, y) => by[y] - by[x])[0] || (A.PAT(pid) || {}).pro;
    const ap = its.length && its[0].apptId ? A.apptById(its[0].apptId) : (A.S.days[d] || []).filter(x => x.pid === pid && x.type !== 'block')[0];
    const room = ap && A.roomOf ? A.roomOf(ap) : null;
    let first = null;
    lines.forEach(l => {
      const e = { id: A.uid(), date: d, type: 'pago', amount: l[0], desc: its.length ? 'Cobro de prácticas' : 'Cobro', method: l[1], pro, rcp: 'R-' + pnum(pid) + '-' + (++pd.rcpSeq), by: who(), pcIds: m.ids.slice() };
      if (curSede()) e.loc = curSede(); else if (its[0] && its[0].loc) e.loc = its[0].loc;
      if (room) e.room = room.name; if (ap) e.apptId = ap.id;
      pd.ledger.push(e); if (!first) first = e;
    });
    pd.ledger.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const got = lines.reduce((s, l) => s + l[0], 0), want = m.tot + (m.addPrev ? m.prev : 0);
    settle(pd, m.ids, got >= m.tot ? 'pagado' : 'parcial', first && first.id);
    A.touchPd(pid);
    if (A.empAudit) A.empAudit('Cobró ' + money(got) + ' a ' + (A.PAT(pid) || {}).name + ' (' + lines.map(l => l[1]).join(' + ') + ').');
    S.modal = null; A.renderModal(); A.save(); A.refresh(); if (A.renderPanel) A.renderPanel();
    A.toast('Cobrado ' + money(got) + ' a ' + (A.PAT(pid) || {}).name + (got < want ? '. Queda debiendo ' + money(want - got) + '.' : '.'), first ? () => { S.modal = { type: 'receipt', pid, id: first.id }; A.renderModal(); } : null);
    const ub = document.querySelector('#toastHost [data-act="toastUndo"]'); if (ub) ub.textContent = 'Ver recibo';
  };
  A.acts.ppDebt = () => {
    const m = S.modal, pd = A.pd(m.pid); settle(pd, m.ids, 'debe'); A.touchPd(m.pid);
    if (A.empAudit) A.empAudit((A.PAT(m.pid) || {}).name + ' se fue sin pagar ' + money(m.tot) + ' (queda en su cuenta).');
    S.modal = null; A.renderModal(); A.save(); A.refresh(); A.toast('Queda debiendo ' + money(m.tot) + '. Lo ves en su cuenta.');
  };

  /* ---------- resumen del día y cierre ---------- */
  A.acts.pcDay = () => { S.modal = { type: 'pcDay', d: today() }; A.renderModal(); };
  MF.pcDay = m => {
    const rows = paidToday(m.d), tot = rows.reduce((s, x) => s + x.e.amount, 0), L = A.pcList();
    const grp = f => { const o = {}; rows.forEach(x => { const k = f(x); o[k] = (o[k] || 0) + x.e.amount; }); return Object.keys(o).sort((a, b) => o[b] - o[a]).map(k => [k, o[k]]); };
    const tbl = (t, l) => l.length ? '<h3 class="pd-h">' + t + '</h3><table class="tbl"><tbody>' + l.map(r => '<tr><td>' + esc(r[0]) + '</td><td class="num">' + money(r[1]) + '</td></tr>').join('') + '</tbody></table>' : '';
    const sd = curSede(), l = sd && A.locById ? A.locById(sd) : null, rooms = l && Array.isArray(l.rooms) && l.rooms.length;
    let b = '<div class="pd-k"><div><span>Cobrado</span><b>' + money(tot) + '</b><small>' + rows.length + ' cobro' + (rows.length === 1 ? '' : 's') + '</small></div><div class="' + (L.length ? 'warn' : '') + '"><span>Falta cobrar</span><b>' + money(L.reduce((s, x) => s + x.tot, 0)) + '</b><small>' + L.length + ' paciente' + (L.length === 1 ? '' : 's') + '</small></div></div>';
    b += tbl('Por forma de pago', grp(x => x.e.method || 'Otro'));
    if (rooms) b += tbl('Por consultorio', grp(x => x.e.room || 'Sin consultorio'));
    b += tbl('Por odontólogo', grp(x => proName(x.e.pro || x.p.pro)));
    if (rows.length) b += '<details class="pd-det"><summary>Ver cada cobro</summary><table class="tbl"><tbody>' + rows.map(x => '<tr><td>' + esc(x.p.name) + '<small style="display:block;color:var(--ink-2)">' + esc([x.e.room, proName(x.e.pro || x.p.pro), x.e.by].filter(Boolean).join(' · ')) + '</small></td><td>' + esc(x.e.method || '') + '</td><td class="num">' + money(x.e.amount) + '</td></tr>').join('') + '</tbody></table></details>';
    if (!rows.length) b += '<p class="pc-empty">Todavía no se cobró nada hoy' + (l ? ' en ' + esc(l.name) : '') + '.</p>';
    if (L.length) b += '<p class="hint warn">Antes de cerrar: ' + L.length + ' paciente' + (L.length === 1 ? ' sigue' : 's siguen') + ' en «Para cobrar».</p>';
    return A.modalShell('Resumen del día' + (l ? ' · ' + l.name : ''), b, '<button class="btn" data-act="closeModal">Cerrar</button><button class="btn primary" data-act="pcClose">Ir a cerrar la caja</button>');
  };
  A.acts.pcClose = () => { S.modal = null; A.renderModal(); S.tab = 'caja'; S.caja = S.caja || {}; S.caja.sub = 'cierre'; S.caja.cdate = today(); A.refresh(); window.scrollTo(0, 0); };

  /* ---------- aviso en la recepción cuando llega alguien para cobrar ---------- */
  let known = null;
  const arPrev = A.afterRefresh;
  A.afterRefresh = () => {
    if (arPrev) arPrev();
    const r = role(); if (r === 'profesional' || r === 'asistente') return;
    const L = A.pcList(), ids = L.map(x => x.pid + ':' + x.items.map(e => e.id).join(','));
    if (known === null) { known = ids; return; }
    L.forEach((x, i) => {
      if (known.indexOf(ids[i]) >= 0) return;
      if (x.items.every(e => e.cobBy === who())) return;
      if (A.nfAdd) A.nfAdd({ id: 'pc:' + ids[i], k: 'cobro', t: 'Para cobrar: ' + x.name, b: [x.room, x.pros.map(proName).join(', '), money(x.tot)].filter(Boolean).join(' · '), act: 'nfTab', args: { 'data-t': 'inicio' } });
      A.toast('Para cobrar: ' + x.name + ' · ' + money(x.tot));
    });
    known = ids;
  };

  /* en la ficha (cuenta) y en la ventanita del turno: atajo a cobrar si tiene algo pendiente */
  const tpObs = new MutationObserver(() => {
    const tp = document.getElementById('tpop'); if (!tp || tp.querySelector('.tp-pc')) return;
    const n = tp.querySelector('[data-act="tpFicha"][data-id]'), a = n && A.apptById(n.getAttribute('data-id')); if (!a || !a.pid) return;
    const it = A.pcList().filter(x => x.pid === a.pid)[0]; if (!it || !canCobrar(it)) return;
    const acts = tp.querySelector('.tp-acts'); if (acts) acts.insertAdjacentHTML('beforebegin', '<button class="tp-pc" data-act="pcPay" data-pid="' + a.pid + '">💲 Cobrar ' + money(it.tot) + ' <small>(' + it.items.length + ' práctica' + (it.items.length === 1 ? '' : 's') + ')</small></button>');
  });
  tpObs.observe(document.body, { childList: true });

  const css = document.createElement('style');
  css.textContent = '.qn-hint{font-size:12.5px;color:var(--ink-2);margin:4px 0}' +
    '.po-who{margin:0 0 8px}.po-list{list-style:none;margin:0 0 8px;padding:0;display:flex;flex-direction:column;gap:6px}.po-list li{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:10px;padding:8px}.po-list li.off{opacity:.5}' +
    '.po-l{flex:1;min-width:0;display:flex;flex-direction:column}.po-l small{color:var(--ink-2);font-size:12.5px}.po-chk input{width:20px;height:20px}.po-v{white-space:nowrap}' +
    '.po-amt{display:inline-flex;align-items:center;gap:2px;border:1px solid var(--line);border-radius:8px;padding:0 6px;background:var(--surface)}.po-amt input{border:0;background:transparent;width:96px;min-height:38px;font:700 15px inherit;color:var(--ink);text-align:right;outline:0}' +
    '.po-add select{width:100%;min-height:40px;border:1px dashed var(--line);border-radius:10px;padding:0 8px;background:var(--surface);color:var(--ink);font:inherit}' +
    '.po-tot{display:flex;justify-content:space-between;align-items:baseline;margin:10px 0 4px;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--accent) 10%,var(--surface))}.po-tot b{font-size:22px}' +
    '.po-cfg{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:13.5px;margin-top:8px}.po-cfg select{min-height:34px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit}' +
    '.pp-row{display:flex;gap:8px;align-items:center;margin:6px 0}.pp-row select{flex:1;min-height:40px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;padding:0 6px}.po-prev{margin:6px 0}' +
    '.pc-card{border-top:4px solid var(--accent)}#view-inicio>.pc-card{max-width:760px;margin-left:auto;margin-right:auto}.pc-h{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.pc-h h2{margin:0;display:flex;align-items:center;gap:8px}.pc-n{background:#c0392b;color:#fff;border-radius:999px;font-size:13px;min-width:24px;height:24px;display:inline-grid;place-items:center;padding:0 7px}' +
    '.pc-empty{color:var(--ink-2);margin:8px 0 0;font-size:14px}.pc-list{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}' +
    '.pc-it{display:flex;gap:10px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:10px;flex-wrap:wrap}.pc-l{flex:1 1 220px;min-width:0;display:flex;flex-direction:column;gap:2px}.pc-l small{color:var(--ink-2);font-size:12.5px}.pc-det{font-size:13px;color:var(--ink);opacity:.85;overflow:hidden;text-overflow:ellipsis}' +
    '.pc-r{display:flex;flex-direction:column;align-items:flex-end;gap:4px;margin-left:auto}.pc-amt{font-size:19px}.pc-r small{color:var(--ink-2);font-size:12px}' +
    '.pd-k{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px}.pd-k>div{border:1px solid var(--line);border-radius:12px;padding:8px 10px;display:flex;flex-direction:column}.pd-k span{font-size:12.5px;color:var(--ink-2)}.pd-k b{font-size:20px}.pd-k small{color:var(--ink-2)}.pd-k .warn{background:var(--warn-soft,#fbf0d9)}' +
    '.pd-h{margin:12px 0 4px;font-size:14px}.pd-det{margin-top:10px}.pd-det summary{cursor:pointer;font-weight:700}' +
    '.tp-pc{all:unset;cursor:pointer;display:block;text-align:center;font-weight:800;padding:10px;border-radius:10px;background:#1e8449;color:#fff}.tp-pc small{font-weight:600;opacity:.9}';
  document.head.appendChild(css);
})();
