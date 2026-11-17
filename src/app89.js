/* ===== 1.7: cobro desde la evolución: primero «¿quién cobra?», varias prácticas juntas bien leídas, cartel en recepción con lo que escribió el odontólogo y cobro corregible ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const money = n => A.money(Math.round(n || 0));
  const num = v => { const n = parseInt(String(v == null ? '' : v).replace(/[^\d-]/g, ''), 10); return isNaN(n) ? 0 : n; };
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const mb = () => (A.memberNow && A.memberNow()) || null;
  const role = () => { const m = mb(); return m ? m.role : null; };
  const isSolo = () => !!(A.isSolo && A.isSolo());
  const who = () => { try { return (A.actor && A.actor().who) || ''; } catch (e) { return ''; } };
  const proName = id => { const p = A.PRO(id) || {}; return p.short || p.name || 'Profesional'; };
  const devId = () => { try { return A.devId ? A.devId() : ''; } catch (e) { return ''; } };
  const T = () => A.today();

  /* =====================================================================
     1. VARIAS PRÁCTICAS JUNTAS
     «arreglo en 24, arreglo en 25, arreglo en 33, por oclusal, por mesial y por distal» → 24 O, 25 M, 33 D
     «arreglo 24 oclusal, 25 mesial» · «arreglo en 24, 25 y 33 por oclusal» · «por mesial y distal» = MD
     ===================================================================== */
  const REST = /\b(arreglos?|obturacion(?:es)?|composites?|resinas?|restauracion(?:es)?|amalgamas?|ionomeros?)\b/g;
  const FACE = { oclusal: 'oclusal', oclusales: 'oclusal', ocluso: 'oclusal', mesial: 'mesial', mesio: 'mesial', distal: 'distal', disto: 'distal', vestibular: 'vestibular', vestibulo: 'vestibular', bucal: 'vestibular', palatino: 'palatino', palatina: 'palatino', palato: 'palatino', lingual: 'lingual', linguo: 'lingual', incisal: 'incisal', inciso: 'incisal' };
  const FACE_ALL = /^(mesio|disto|vestibulo|linguo|palato|ocluso|inciso)(oclusal|distal|mesial|vestibular|lingual|palatino|palatina|incisal)$/;
  const FILL = /^(en|la|las|el|los|pieza|piezas|diente|dientes|numero|nro|n|de|del|sobre|a)$/;
  const isTooth = w => /^\d{2}$/.test(w) && /^([1-4][1-8]|[5-8][1-5])$/.test(w);
  const plainOf = s => s.toLowerCase().split('').map(c => c.normalize('NFD').charAt(0)).join('');
  function rewriteRegion(words) {
    const teeth = [], floating = []; let cur = null, lastT = null, sepSince = false, porPending = false;
    words.forEach(w => {
      if (w.k === 'T') { cur = null; const t = { n: w.v, faces: null }; teeth.push(t); lastT = t; sepSince = false; porPending = false; return; }
      if (w.k === 'S') { sepSince = true; return; }
      if (w.k === 'P') { cur = null; porPending = true; return; }
      if (w.k === 'F') {
        if (cur && !porPending) { w.v.forEach(f => { if (cur.indexOf(f) < 0) cur.push(f); }); return; }
        cur = w.v.slice(); porPending = false;
        if (lastT && !sepSince && !lastT.faces) lastT.faces = cur; else floating.push(cur);
      }
    });
    if (!teeth.length) return null;
    const bare = teeth.filter(t => !t.faces);
    if (bare.length && floating.length) {
      if (floating.length === bare.length) bare.forEach((t, i) => { t.faces = floating[i]; });
      else { const all = []; floating.forEach(g => g.forEach(f => { if (all.indexOf(f) < 0) all.push(f); })); bare.forEach(t => { t.faces = all; }); }
    } else if (bare.length && !floating.length) {
      const withF = teeth.filter(t => t.faces);
      if (withF.length === 1 && withF[0] === teeth[teeth.length - 1]) bare.forEach(t => { t.faces = withF[0].faces; });
    }
    return teeth;
  }
  function rewrite(text) {
    let s = String(text || ''); if (!s) return s;
    const pl = plainOf(s);
    /* «limpieza con flúor» = limpieza + flúor */
    let out = s.replace(/\b(limpieza|profilaxis|tartrectom[ií]a)\s+con\s+(fl[uú]or)/gi, '$1 y $2');
    if (out !== s) return rewrite(out);
    REST.lastIndex = 0; let m, res = '', from = 0;
    while ((m = REST.exec(pl))) {
      const kwStart = m.index, kw = s.slice(m.index, m.index + m[0].length);
      const tokRe = /\s*(,|;|\.(?!\d)|\by\b|\be\b|[a-z]+|\d+)\s*/y; tokRe.lastIndex = m.index + m[0].length;
      const words = []; let end = tokRe.lastIndex, t, lastGood = end, sawTooth = false;
      while ((t = tokRe.exec(pl))) {
        const w = t[1];
        if (w === '.' || w === ';') break;
        if (w === ',' || w === 'y' || w === 'e') { words.push({ k: 'S' }); end = tokRe.lastIndex; continue; }
        if (/^\d+$/.test(w)) { if (!isTooth(w)) break; words.push({ k: 'T', v: w }); sawTooth = true; lastGood = t.index + t[0].replace(/\s+$/, '').length; end = tokRe.lastIndex; continue; }
        if (w === 'por' || w === 'cara' || w === 'caras') { words.push({ k: 'P' }); end = tokRe.lastIndex; continue; }
        if (FACE[w]) { words.push({ k: 'F', v: [FACE[w]] }); lastGood = t.index + t[0].replace(/\s+$/, '').length; end = tokRe.lastIndex; continue; }
        const cm = w.match(FACE_ALL); if (cm) { words.push({ k: 'F', v: [FACE[cm[1]], FACE[cm[2]]] }); lastGood = t.index + t[0].replace(/\s+$/, '').length; end = tokRe.lastIndex; continue; }
        if (/^(arreglos?|obturacion(?:es)?|composites?|resinas?|restauracion(?:es)?|amalgamas?|ionomeros?)$/.test(w)) { end = tokRe.lastIndex; continue; }
        if (FILL.test(w)) { end = tokRe.lastIndex; continue; }
        break;
      }
      if (!sawTooth) continue;
      const teeth = rewriteRegion(words); if (!teeth) continue;
      const word = kw.toLowerCase();
      const gen = teeth.map(t => word + ' ' + t.n + (t.faces && t.faces.length ? ' ' + t.faces.join(' ') : '')).join(', ');
      res += s.slice(from, kwStart) + gen; from = lastGood;
      REST.lastIndex = lastGood;
    }
    return from ? res + s.slice(from) : s;
  }
  A.evoRewrite = rewrite;
  const ppPrev = A.pracParse;
  if (ppPrev) A.pracParse = function (txt) { const a = [].slice.call(arguments); a[0] = rewrite(txt); return ppPrev.apply(this, a); };
  const eoPrev = A.evoOdon;
  if (eoPrev) A.evoOdon = function (txt) { const a = [].slice.call(arguments); a[0] = rewrite(txt); return eoPrev.apply(this, a); };

  /* =====================================================================
     2. PRIMERO: ¿QUIÉN COBRA?
     ===================================================================== */
  const askWho = m => m && m.type === 'pracOk' && !m.who && !m.only && !isSolo() && role() !== 'recepcion' && role() !== 'asistente' && A.CFG.askWho !== false && m.items.some(i => i.on && (i.pay || 0) > 0);
  const pracPrev = MF.pracOk;
  MF.pracOk = m => {
    if (!askWho(m)) return pracPrev(m);
    const p = A.PAT(m.pid) || {}, on = m.items.filter(i => i.on), tot = on.reduce((s, i) => s + (i.pay || 0), 0);
    const osTot = on.filter(i => i.os).reduce((t, i) => t + (i.os.cov || 0) * (i.qty || 1), 0);
    let b = '<p class="pw-lead">Anotaste ' + (on.length === 1 ? '1 práctica' : on.length + ' prácticas') + ' a <b>' + esc(p.name || 'el paciente') + '</b>:</p>' +
      '<ul class="pw-list">' + on.map(i => '<li><span>' + esc(i.label) + '</span><b>' + money(i.pay) + '</b></li>').join('') + '</ul>' +
      '<div class="pw-tot"><span>Paga el paciente</span><b>' + money(tot) + '</b></div>' + (osTot ? '<p class="pw-os">Y ' + money(osTot) + ' van a la obra social.</p>' : '') +
      '<h3 class="pw-q">¿Quién le cobra?</h3><div class="pw-btns">' +
      '<button class="pw-b primary" data-act="pwGo" data-k="rcp"><span class="pw-i" aria-hidden="true">🧾</span><b>Cobra secretaría</b><small>Le llega a recepción con todo lo que anotaste</small></button>' +
      '<button class="pw-b" data-act="pwGo" data-k="pro"><span class="pw-i" aria-hidden="true">💵</span><b>Lo cobro yo</b><small>Revisás los importes y cobrás acá</small></button></div>' +
      '<div class="pw-more"><button class="btn small ghost" data-act="pwGo" data-k="fix">Corregir prácticas antes de mandar</button><button class="btn small ghost" data-act="pwGo" data-k="nota">Solo guardar en la historia, sin cobrar</button></div><div class="hint bad" id="poMsg"></div>';
    return A.modalShell('¿Quién cobra?', b, '<button class="btn" data-act="closeModal">Volver</button>');
  };
  A.acts.pwGo = el => {
    const m = S.modal, k = el.getAttribute('data-k'); if (!m) return;
    if (k === 'rcp' || k === 'nota') { m.who = k; A.acts.poGo({ getAttribute: x => (x === 'data-k' ? k : null), dataset: { k } }); return; }
    m.who = k === 'fix' ? 'rcpFix' : 'pro'; A.renderModal();
  };
  /* después de elegir, la hoja de siempre pero con un solo camino */
  const afterPrev = A.modalAfter.pracOk;
  A.modalAfter.pracOk = m => {
    if (afterPrev) try { afterPrev(m); } catch (e) { /* nada */ }
    if (!m || !m.who) return;
    const foot = document.querySelector('#modalHost .m-foot') || document.querySelector('#modalHost footer'); if (!foot) return;
    const wb = foot.querySelector('[data-act="poWho"]'); if (wb) { wb.setAttribute('data-act', 'poGo'); wb.setAttribute('data-k', m.who === 'pro' ? 'pro' : 'rcp'); }
    foot.querySelectorAll('[data-act="poGo"]').forEach(b => {
      if (b.getAttribute('data-k') === 'os') return; const k = b.getAttribute('data-k'); if (k === 'nota' || k === 'pre') return; if (m.who === 'pro' ? (k !== 'pro') : (k !== 'rcp')) b.remove(); else { b.classList.add('primary'); b.textContent = m.who === 'pro' ? 'Cobrar ahora' : 'Mandar a secretaría →'; } });
    const back = foot.querySelector('[data-act="closeModal"]'); if (back) { back.setAttribute('data-act', 'pwBack'); back.textContent = '‹ Volver'; }
    const cfg = document.querySelector('#modalHost .po-cfg'); if (cfg) cfg.remove();
  };
  A.acts.pwBack = () => { const m = S.modal; if (m) { delete m.who; A.renderModal(); } };

  /* lo que escribió el odontólogo viaja con el cobro (para el cartel de recepción) */
  const poPrev = A.acts.poGo;
  A.acts.poGo = function (el) {
    const m = S.modal, k = el && el.getAttribute ? el.getAttribute('data-k') : null;
    if (m && m.type === 'pracOk' && k !== 'nota') {
      A.$$('[data-in="poWhy"]').forEach(i => { const it = m.items[+i.getAttribute('data-i')]; if (it) it.why = i.value; });
      const nw = m.items.filter(i => i.on && (i.free || (i.os && i.os.mode === 'free')) && !String(i.why || '').trim())[0];
      if (nw) { const o = $('#poMsg'); if (o) o.textContent = 'Contá por qué no se le cobra «' + nw.label + '» (queda anotado en la cuenta).'; const w = $('[data-in="poWhy"]'); if (w) w.focus(); return; }
    }
    const pid = m && m.pid, pd = pid ? A.pd(pid) : null, n0 = pd ? pd.ledger.length : 0, txt = m && m.txt;
    sending = true; let r; try { r = poPrev.apply(this, arguments); } finally { sending = false; }
    try {
      if (pd && k && k !== 'nota') {
        pd.ledger.slice(n0).forEach(e => { if (e.type === 'cargo') { if (txt) e.evo = txt; e.cobDev = devId(); } });
        pd.ledger.forEach(e => { if (e.type === 'cargo' && e.cob && !e.cobDev && e.cobAt && Date.now() - new Date(e.cobAt).getTime() < 5000) { if (txt) e.evo = txt; e.cobDev = devId(); } });
        const sn = seenGet() || {}; pd.ledger.forEach(e => { if (e.cobDev === devId()) sn[e.id] = 1; }); seenSet(sn);
        A.touchPd(pid); A.save();
      }
    } catch (e) { /* nada */ }
    return r;
  };

  /* =====================================================================
     3. CARTEL EN RECEPCIÓN
     ===================================================================== */
  const seenKey = () => 'odontovoz.pcPop.' + ((A.ownerId && A.ownerId()) || 'local');
  const seenGet = () => { try { return JSON.parse(LS.get(seenKey(), 'null')); } catch (e) { return null; } };
  const seenSet = o => { const k = Object.keys(o); if (k.length > 400) k.slice(0, k.length - 400).forEach(x => delete o[x]); LS.set(seenKey(), JSON.stringify(o)); };
  const iSee = () => { const r = role(); if (r === 'profesional' || r === 'asistente') return false; if (isSolo()) return false; return A.CFG.rcpPop !== false; };
  let queue = [], sending = false;
  function popCheck() {
    if (sending || !iSee() || !A.pcList) return;
    const L = A.pcList(); let seen = seenGet();
    if (!seen) { seen = {}; L.forEach(x => x.items.forEach(e => { seen[e.id] = 1; })); seenSet(seen); return; }
    const me = devId(); let nw = false;
    L.forEach(x => {
      const fresh = x.items.filter(e => !seen[e.id] && e.cob === 'rcp' && e.cobDev !== me && e.date === T());
      x.items.forEach(e => { seen[e.id] = 1; });
      if (fresh.length && !queue.some(q => q === x.pid)) { queue.push(x.pid); nw = true; }
    });
    seenSet(seen);
    if (!nw && queue.length) showPop();
    if (nw) { showPop(); try { if (navigator.vibrate) navigator.vibrate([120, 80, 120]); if (document.hidden && A.sysNotify) A.sysNotify('Para cobrar', (A.PAT(queue[0]) || {}).name || ''); } catch (e) { /* nada */ } }
  }
  function popHTML(pid) {
    const x = (A.pcList() || []).filter(y => y.pid === pid)[0]; if (!x) return '';
    const p = A.PAT(pid) || {}, evos = []; x.items.forEach(e => { if (e.evo && evos.indexOf(e.evo) < 0) evos.push(e.evo); });
    const osc = x.items.reduce((s, e) => s + (e.osCov || 0), 0);
    return '<div class="pp-pop" role="alertdialog" aria-labelledby="ppPopT"><div class="pp-h"><span class="pp-tag">Para cobrar</span><button class="pp-x" data-act="ppPopLater" aria-label="Más tarde">✕</button></div>' +
      '<h2 id="ppPopT">' + esc(p.name || x.name) + '</h2><p class="pp-sub">' + esc([x.pros.map(proName).join(', '), x.room, p.cov || 'Particular'].filter(Boolean).join(' · ')) + (x.at ? ' · ' + new Date(x.at).toTimeString().slice(0, 5) : '') + '</p>' +
      (evos.length ? '<div class="pp-evo"><small>Lo que anotó en la evolución</small>' + evos.map(t => '<q>' + esc(t) + '</q>').join('') + '</div>' : '') +
      '<ul class="pp-its">' + x.items.map(e => '<li><span>' + esc(String(e.desc || '').split(' · ').slice(0, 3).join(' · ')) + '</span><b>' + money(e.amount) + '</b></li>').join('') + '</ul>' +
      '<div class="pp-tot"><span>A cobrar</span><b>' + money(x.tot) + '</b></div>' + (x.prev ? '<p class="pp-prev">Además debía ' + money(x.prev) + ' de antes.</p>' : '') + (osc ? '<p class="pp-prev">' + money(osc) + ' se le cobran a la obra social.</p>' : '') +
      '<div class="pp-b"><button class="btn" data-act="ppPopFix" data-pid="' + pid + '">Corregir</button><button class="btn" data-act="ppPopLater">Más tarde</button><button class="btn primary" data-act="ppPopGo" data-pid="' + pid + '">Cobrar ahora</button></div>' +
      (queue.length > 1 ? '<p class="pp-more">Hay ' + (queue.length - 1) + ' más esperando</p>' : '') + '</div>';
  }
  function showPop() {
    let host = $('#ppPopHost'); if (!host) { host = document.createElement('div'); host.id = 'ppPopHost'; document.body.appendChild(host); }
    while (queue.length && !popHTML(queue[0])) queue.shift();
    host.innerHTML = queue.length ? popHTML(queue[0]) : '';
    host.classList.toggle('on', !!queue.length);
  }
  A.pcPopShow = pid => { if (queue.indexOf(pid) < 0) queue.unshift(pid); showPop(); };
  A.acts.ppPopLater = () => { queue.shift(); showPop(); };
  A.acts.ppPopGo = el => { const pid = el.getAttribute('data-pid'); queue = queue.filter(q => q !== pid); showPop(); A.acts.pcPay({ getAttribute: () => pid }); };
  A.acts.ppPopFix = el => { A.acts.ppPopGo(el); const m = S.modal; if (m && m.type === 'pcPay') { m.edit = true; A.renderModal(); } };
  const arPrev = A.afterRefresh;
  A.afterRefresh = () => { if (arPrev) arPrev(); try { popCheck(); } catch (e) { if (A.logError) A.logError('pcPop', e); } };

  /* =====================================================================
     4. COBRO CORREGIBLE EN RECEPCIÓN
     (lo ya cargado no se toca: las correcciones quedan como ajustes firmados; lo que no se cobra queda marcado)
     ===================================================================== */
  const pcPayPrev = MF.pcPay;
  const effAmt = (m, e) => { const x = (m.ed || {})[e.id]; return x ? (x.off ? 0 : x.amt) : e.amount; };
  MF.pcPay = m => {
    const html = pcPayPrev(m);
    const pd = A.pd(m.pid), its = pd.ledger.filter(e => (m.ids || []).indexOf(e.id) >= 0);
    const evos = []; its.forEach(e => { if (e.evo && evos.indexOf(e.evo) < 0) evos.push(e.evo); });
    let extra = '';
    if (evos.length) extra += '<div class="pp-evo in"><small>Lo que anotó el odontólogo</small>' + evos.map(t => '<q>' + esc(t) + '</q>').join('') + '</div>';
    if (its.length && !m.edit) extra += '<button class="btn small ghost pp-edit" data-act="ppEdit">✎ Corregir prácticas o importes</button>';
    if (m.edit) {
      m.ed = m.ed || {};
      extra += '<div class="pp-ed"><p class="hint" style="margin:0 0 6px">Cambiá lo que haga falta. Lo que destildes no se cobra. Queda anotado quién lo corrigió.</p>' + its.map(e => {
        const x = m.ed[e.id] || { amt: e.amount, mode: e.cop || (e.os ? 'cos' : ''), off: false };
        return '<div class="pp-er' + (x.off ? ' pp-off' : '') + '"><label class="po-chk"><input type="checkbox" data-chg="ppEdOn" data-id="' + e.id + '"' + (x.off ? '' : ' checked') + ' aria-label="Cobrar ' + esc(e.desc) + '"></label><span class="pp-el"><b>' + esc(String(e.desc || '').split(' · ').slice(0, 3).join(' · ')) + '</b>' +
          '<select data-chg="ppEdMode" data-id="' + e.id + '" aria-label="Qué paga el paciente">' + (e.os ? [['cos', 'Coseguro'], ['dif', 'Diferencial'], ['none', 'Cubierto 100% por la obra social'], ['free', 'No le cobro nada']] : [['', 'Se cobra'], ['free', 'No le cobro nada']]).map(o => '<option value="' + o[0] + '"' + ((x.mode || '') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>' +
          (x.mode === 'free' ? '<input class="pp-why" data-in="ppEdWhy" data-id="' + e.id + '" value="' + esc(x.why || '') + '" placeholder="¿Por qué no se cobra? (obligatorio)" aria-label="Motivo">' : '') + '</span>' +
          '<span class="po-amt"><span aria-hidden="true">$</span><input inputmode="numeric" data-chg="ppEdAmt" data-id="' + e.id + '" value="' + (x.off ? 0 : x.amt) + '"' + (x.off ? ' disabled' : '') + ' aria-label="Importe"></span></div>';
      }).join('') + (m.add || []).map((a, i) => '<div class="pp-er pp-new"><span class="po-chk">+</span><span class="pp-el"><b>' + esc(a.label) + '</b><small>agregada ahora</small></span><span class="po-amt"><span aria-hidden="true">$</span><input inputmode="numeric" data-chg="ppAddAmt" data-i="' + i + '" value="' + a.amt + '" aria-label="Importe"></span><button class="btn small ghost" data-act="ppAddDel" data-i="' + i + '" aria-label="Quitar">✕</button></div>').join('') +
        '<div class="field pp-whyall"><label for="ppWhyAll">¿Por qué lo corregís? <small>(obligatorio si cambiás algo · lo ve el dueño)</small></label><input id="ppWhyAll" data-in="ppWhyAll" value="' + esc(m.whyAll || '') + '" placeholder="Ej.: el doctor me avisó que la limpieza no se cobra"></div>' +
        '<select class="pp-addsel" data-chg="ppAdd" aria-label="Agregar otra práctica"><option value="">+ Agregar otra práctica…</option>' + (A.catCats ? A.catCats() : []).map(c => '<optgroup label="' + esc(c) + '">' + A.CAT.filter(x => x.cat === c).map(x => '<option value="' + esc(x.k) + '">' + esc(x.label) + ' · ' + money(x.price) + '</option>').join('') + '</optgroup>').join('') + '</select></div>';
    }
    if (!extra) return html;
    const roRe = /<ul class="po-list ro">[\s\S]*?<\/ul>/;
    if (roRe.test(html)) return html.replace(roRe, mt => (m.edit ? extra : extra + mt));
    return html.replace(/<p class="po-who">[\s\S]*?<\/p>/, mt => mt + extra);
  };
  const reTot = m => {
    const pd = A.pd(m.pid), its = pd.ledger.filter(e => (m.ids || []).indexOf(e.id) >= 0);
    const t = its.reduce((s, e) => s + effAmt(m, e), 0) + (m.add || []).reduce((s, a) => s + (a.amt || 0), 0);
    m.tot = t; const want = t + (m.addPrev ? m.prev : 0); if (m.split) { m.a2 = Math.min(m.a2, want); m.a1 = want - m.a2; } else m.a1 = want;
  };
  const edOf = (m, id) => { m.ed = m.ed || {}; if (!m.ed[id]) { const e = A.pd(m.pid).ledger.filter(x => x.id === id)[0] || {}; m.ed[id] = { amt: e.amount || 0, mode: e.cop || (e.os ? 'cos' : ''), off: false }; } return m.ed[id]; };
  A.acts.ppEdit = () => { const m = S.modal; if (!m) return; m.edit = true; A.renderModal(); };
  A.chg.ppEdOn = el => { const m = S.modal, x = edOf(m, el.getAttribute('data-id')); x.off = !el.checked; reTot(m); A.renderModal(); };
  A.chg.ppEdAmt = el => { const m = S.modal, x = edOf(m, el.getAttribute('data-id')); x.amt = Math.max(0, num(el.value)); reTot(m); A.renderModal(); };
  A.chg.ppEdMode = el => { const m = S.modal, id = el.getAttribute('data-id'), x = edOf(m, id), e = A.pd(m.pid).ledger.filter(y => y.id === id)[0] || {}; x.mode = el.value; if (x.mode === 'none' || x.mode === 'free') x.amt = 0; else if (x.amt === 0) x.amt = e.amount || 0; reTot(m); A.renderModal(); };
  A.ins.ppWhyAll = el => { S.modal.whyAll = el.value; };
  A.ins.ppEdWhy = el => { const x = edOf(S.modal, el.getAttribute('data-id')); x.why = el.value; };
  A.chg.ppAdd = el => { const m = S.modal, c = A.CAT.filter(x => x.k === el.value)[0]; if (!c) return; (m.add = m.add || []).push({ k: c.k, label: c.label, amt: c.price || 0 }); reTot(m); A.renderModal(); };
  A.chg.ppAddAmt = el => { const m = S.modal, a = (m.add || [])[+el.getAttribute('data-i')]; if (a) { a.amt = Math.max(0, num(el.value)); reTot(m); A.renderModal(); } };
  A.acts.ppAddDel = el => { const m = S.modal; (m.add || []).splice(+el.getAttribute('data-i'), 1); reTot(m); A.renderModal(); };
  /* antes de cobrar (o de dejar la deuda): se graban las correcciones */
  const edChanged = m => { if ((m.add || []).length) return true; const pd = A.pd(m.pid); return Object.keys(m.ed || {}).some(id => { const x = m.ed[id], e = pd.ledger.filter(y => y.id === id)[0] || {}; return x.off || (x.amt !== e.amount) || ((x.mode || '') !== (e.cop || (e.os ? 'cos' : ''))); }); };
  function applyEdits(m) {
    if (!m || (!m.ed && !(m.add || []).length)) return;
    const pd = A.pd(m.pid), d = T(), by = who(), at = new Date().toISOString(), its = pd.ledger.filter(e => (m.ids || []).indexOf(e.id) >= 0), base = its[0] || {}, why = String(m.whyAll || '').trim();
    its.forEach(e => {
      const x = (m.ed || {})[e.id]; if (!x) return;
      const now = x.off ? 0 : x.amt, dlt = now - e.amount;
      if (dlt) pd.ledger.push({ id: A.uid(), date: d, type: 'ajuste', amount: dlt, desc: (x.off ? 'No se cobra: ' : x.mode === 'free' ? 'Bonificado: ' : 'Corrección de importe: ') + String(e.desc || '').split(' · ').slice(0, 2).join(' · ') + (x.mode === 'none' ? ' (cubierto 100% por la obra social)' : x.mode === 'free' ? ' · motivo: ' + String(x.why || '').trim() : '') + (why ? ' · ' + why : ''), why: why || undefined, pro: e.pro, adjFor: e.id, by, at, rcpFix: 1, free: x.mode === 'free' ? 1 : undefined, freeWhy: x.mode === 'free' ? String(x.why || '').trim() : undefined });
      if (x.off) { e.cobOk = 'quitado'; e.cobDone = at; e.cobDoneBy = by; m.ids = m.ids.filter(i => i !== e.id); }
    });
    (m.add || []).forEach(a => {
      const id = A.uid(); pd.ledger.push({ id, date: d, type: 'cargo', amount: a.amt, desc: a.label + ' · agregada en recepción' + (why ? ' · ' + why : ''), why: why || undefined, pro: base.pro || (A.PAT(m.pid) || {}).pro, cob: 'rcp', cobAt: at, cobBy: by, apptId: base.apptId, loc: base.loc, rcpFix: 1 });
      m.ids.push(id);
    });
    if (A.cjLog) A.cjLog('correccion', 'Corrigió el cobro de ' + ((A.PAT(m.pid) || {}).name || '') + ' antes de cobrar' + (why ? ': ' + why : ''));
    m.ed = null; m.add = []; A.touchPd(m.pid);
  }
  ['ppGo', 'ppDebt'].forEach(k => { const prev = A.acts[k]; if (prev) A.acts[k] = function () { try { const m = S.modal; if (m && m.type === 'pcPay') { const nw = Object.keys(m.ed || {}).filter(id => m.ed[id].mode === 'free' && !m.ed[id].off && !String(m.ed[id].why || '').trim())[0]; if (nw) { const o = $('#ppMsg'); if (o) { o.className = 'hint bad'; o.textContent = 'Contá por qué no se cobra (queda anotado).'; } return; }
        const wi = $('#ppWhyAll'); if (wi) m.whyAll = wi.value; if (m.edit && edChanged(m) && !String(m.whyAll || '').trim()) { const o = $('#ppMsg'); if (o) { o.className = 'hint bad'; o.textContent = 'Escribí por qué corregiste el cobro: lo ve el dueño.'; } if (wi) wi.focus(); return; } const keepA1 = m.a1, keepA2 = m.a2; applyEdits(m); if (keepA1 != null) { m.a1 = keepA1; m.a2 = keepA2; } } } catch (e) { if (A.logError) A.logError('ppEdit', e); } return prev.apply(this, arguments); }; });

  /* =====================================================================
     estilos (solo tokens del tema)
     ===================================================================== */
  const css = document.createElement('style');
  css.textContent = '.pw-lead{margin:0 0 6px}.pw-list{list-style:none;margin:0;padding:0;border:1px solid var(--line);border-radius:12px}.pw-list li{display:flex;justify-content:space-between;gap:10px;padding:7px 12px;border-top:1px solid var(--line)}.pw-list li:first-child{border-top:0}.pw-list b{font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.pw-tot{display:flex;justify-content:space-between;align-items:baseline;margin:8px 2px 0;font-size:1.05rem}.pw-tot b{font-size:1.35rem}.pw-os{margin:2px 2px 0;color:var(--ink-2);font-size:.9rem}' +
    '.pw-q{margin:16px 0 8px;font-size:1.2rem}.pw-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '.pw-b{display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;padding:14px;border-radius:16px;border:2px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;cursor:pointer;min-height:110px}' +
    '.pw-b b{font-size:1.1rem}.pw-b small{color:var(--ink-2);font-size:.85rem;line-height:1.3}.pw-b .pw-i{font-size:1.6rem}.pw-b.primary{border-color:var(--accent);background:var(--accent-soft)}.pw-b:focus-visible,.pw-b:hover{border-color:var(--accent)}' +
    '.pw-more{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}' +
    '#ppPopHost{position:fixed;inset:auto 16px 16px auto;z-index:9000;width:min(420px,calc(100vw - 32px));display:none}#ppPopHost.on{display:block}' +
    '.pp-pop{background:var(--surface);color:var(--ink);border:2px solid var(--accent);border-radius:20px;box-shadow:0 18px 50px rgba(0,0,0,.28);padding:14px 16px 12px;max-height:calc(100vh - 40px);overflow:auto;animation:ppIn .25s ease-out}' +
    '@keyframes ppIn{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}@media (prefers-reduced-motion:reduce){.pp-pop{animation:none}}' +
    '.pp-h{display:flex;justify-content:space-between;align-items:center}.pp-tag{background:var(--accent);color:var(--accent-ink);border-radius:999px;padding:2px 10px;font-size:.8rem;font-weight:700}.pp-x{background:none;border:0;font-size:1.1rem;color:var(--ink-2);cursor:pointer;padding:4px 8px}' +
    '.pp-pop h2{margin:6px 0 0;font-size:1.3rem}.pp-sub{margin:2px 0 8px;color:var(--ink-2);font-size:.9rem}' +
    '.pp-evo{background:var(--surface-2);border-radius:12px;padding:8px 12px;margin:6px 0}.pp-evo small{display:block;color:var(--ink-2);font-size:.78rem;margin-bottom:2px}.pp-evo q{display:block;font-style:italic;quotes:"«" "»"}.pp-evo.in{margin:0 0 8px}' +
    '.pp-its{list-style:none;margin:6px 0;padding:0}.pp-its li{display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-top:1px solid var(--line)}.pp-its li:first-child{border-top:0}' +
    '.pp-tot{display:flex;justify-content:space-between;align-items:baseline;font-size:1.05rem;margin-top:4px}.pp-tot b{font-size:1.5rem;color:var(--accent)}.pp-prev{margin:2px 0;color:var(--ink-2);font-size:.88rem}' +
    '.pp-b{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:10px}.pp-more{margin:8px 0 0;text-align:center;color:var(--ink-2);font-size:.85rem}' +
    '.po-why{display:flex;flex-direction:column;gap:2px;margin-top:6px;font-size:.82rem;color:var(--ink-2)}.po-why input,.pp-why{font:inherit;font-size:.9rem;padding:5px 8px;border:1px solid var(--warn,#e8a33d);border-radius:8px;background:var(--surface);color:var(--ink);margin-top:4px}' +
    '.pp-whyall{margin:10px 0 0}.pp-whyall small{color:var(--ink-2);font-weight:400}.po-whyb{background:none;border:0;padding:2px 0;margin-top:4px;color:var(--accent);font:inherit;font-size:.82rem;cursor:pointer;text-align:left}.po-why.opt input{border-color:var(--line)}' +
    '.pp-edit{margin:0 0 8px}.pp-ed{border:1px solid var(--line);border-radius:12px;padding:8px 10px;margin:0 0 10px}.pp-er{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--line)}.pp-er:first-of-type{border-top:0}.pp-er.pp-off .pp-el b{text-decoration:line-through;opacity:.6}' +
    '.pp-el{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.pp-el small{color:var(--ink-2);font-size:.8rem}.pp-el select{max-width:100%}.pp-er .po-amt{flex:0 0 118px;display:flex;align-items:center;gap:4px}.pp-er .po-amt input{width:100%;min-width:0}.pp-el b{font-size:.95rem;line-height:1.25}.pp-addsel{margin-top:8px;width:100%}' +
    '@media (max-width:600px){#ppPopHost{inset:auto 10px 10px 10px;width:auto}.pw-btns{grid-template-columns:1fr}.pw-b{min-height:0}}';
  document.head.appendChild(css);
})();
