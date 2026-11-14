/* ===== 1.50: cobro con obra social claro: «no le cobro nada», coseguro, diferencial o particular, y lo que paga la obra social queda pendiente ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const money = n => A.money(n || 0);
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const num = v => parseInt(String(v == null ? '' : v).replace(/\D/g, ''), 10) || 0;
  const isSolo = () => !!(A.isSolo && A.isSolo());
  const mb = () => (A.memberNow && A.memberNow()) || null;
  const canCfg = () => !mb() || mb().role === 'admin';
  const boss = () => !A.isBoss || A.isBoss();
  const proName = id => { const p = A.PRO(id) || {}; return p.short || p.name || 'Profesional'; };
  const cobraOf = pid => { const c = (A.CFG.cobra || {})[pid]; if (c) return c; return isSolo() ? 'pro' : 'rcp'; };

  /* ---------- la obra social del paciente (aunque no esté en tu lista o no tenga aranceles cargados) ---------- */
  const covSlug = t => 'cov:' + norm(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const patOS = pid => {
    const p = A.PAT(pid) || {}, os = A.osOf ? A.osOf(p) : null;
    if (os) return { id: os.id, sigla: os.sigla, cop: os.cop, real: true, os };
    const c = String(p.cov || '').trim(); if (!c || /^particular|^sin (obra|cobertura)|^ninguna/i.test(norm(c))) return null;
    return { id: covSlug(c), sigla: c, cop: null, real: false, os: null };
  };
  const osById0 = A.osById;
  if (osById0) A.osById = id => osById0(id) || (/^cov:/.test(String(id || '')) ? { id, sigla: A.cap ? A.cap(String(id).slice(4).replace(/-/g, ' ')) : String(id).slice(4), aran: {} } : null);
  const defMode = o => (o && o.cop) || A.CFG.copDef || 'cos';

  /* cuánto paga el paciente según cómo se cobra */
  const payOf = it => {
    const q = it.qty || 1; if (!it.os) return it.price || 0;
    const m = it.os.mode || 'cos';
    if (m === 'none') return 0;
    if (m === 'part') return it.price || 0;
    if (m === 'dif') return it.os.difSet != null ? it.os.difSet : (it.os.cov > 0 ? Math.max(0, (it.price || 0) - it.os.cov * q) : 0);
    return (it.os.cos || 0) * q;
  };
  A.copPayFor = payOf;

  /* todas las prácticas de un paciente con obra social traen la obra social (si no hay arancel, el importe queda a completar) */
  /* cada obra social numera distinto (OSPe: 02.15 restauración simple, 02.18 compuesta): se busca la práctica equivalente por su nombre */
  const GROUPS = [
    [/^02\.01$/, /^02\./, /simple|una cara|1 cara|superficial/],
    [/^02\.02$/, /^02\./, /compuest|complej|dos caras|2 caras|tres|3 caras|mas caras/],
    [/^08\.12$/, null, /tartrectom|limpieza|profilax|gingivitis/],
    [/^01\.01$/, /^01\./, /examen|diagnost|consulta/],
    [/^01\.02$/, /^01\./, /urgencia/],
    [/^10\.01$/, /^10\./, /extracci/],
    [/^09\.01\.01$/, /^09\./, /periapical/],
    [/^09\.02\.04$/, /^09\./, /panoram/],
    [/^05\.05$/, /^05\./, /sellador|sellante/],
    [/^05\.02$/, /^05\./, /fluor/]
  ];
  A.osAltCode = (os, code, label) => {
    const ar = os && os.aran; if (!ar || !code) return null;
    if (ar[code] && ar[code].on) return code;
    const g = GROUPS.filter(x => x[0].test(code))[0]; if (!g) return null;
    const lab = c => norm((ar[c] && ar[c].label) || (A.NOMEN || []).filter(x => x[0] === c).map(x => x[1])[0] || '');
    let hit = Object.keys(ar).filter(c => ar[c] && ar[c].on && (!g[1] || g[1].test(c)) && g[2].test(lab(c)));
    /* restauraciones con un solo código (p. ej. «con luz halógena»): sirve para cualquier cantidad de caras */
    if (!hit.length && /^02\./.test(code)) hit = Object.keys(ar).filter(c => ar[c] && ar[c].on && /^02\./.test(c) && /restaurac|obturac|composite|resina|amalgama|halogena|fotocur/.test(lab(c)) && !/provisori|perno|carilla|incrustac/.test(lab(c)));
    return hit.sort()[0] || null;
  };
  const ppPrev = A.pracParse;
  if (ppPrev) A.pracParse = function (text, pid) {
    const out = ppPrev.apply(this, arguments) || [];
    try {
      const po = patOS(pid); if (!po) return out;
      out.forEach(it => {
        const code0 = A.codeFor ? A.codeFor({ cond: it.a && it.a.cond, tooth: it.a && it.a.teeth && it.a.teeth[0], faces: it.a && it.a.faces ? it.a.faces.join('') : '', label: it.label }) : null;
        if ((!it.os || it.os.est) && po.real && po.os.on) {
          const alt = A.osAltCode(po.os, code0, it.label), ar = alt ? po.os.aran[alt] : null;
          if (ar) { const md = defMode(po); it.os = { id: po.id, sigla: po.sigla, code: alt, cov: (ar.cov || 0), cos: ar.cos || 0, mode: md === 'cos' && !(ar.cos > 0) ? 'none' : md }; it.pay = payOf(it); return; }
        }
        if (it.os) { if (it.os.est) it.os.noAran = true; if (it.os.mode === 'cos' && !(it.os.cos > 0)) { it.os.mode = 'none'; it.pay = payOf(it); } return; }
        const code = A.codeFor ? A.codeFor({ cond: it.a && it.a.cond, tooth: it.a && it.a.teeth && it.a.teeth[0], faces: it.a && it.a.faces ? it.a.faces.join('') : '', label: it.label }) : null;
        it.os = { id: po.id, sigla: po.sigla, code, cov: 0, cos: 0, mode: defMode(po) === 'cos' ? 'none' : defMode(po), noAran: true };
        it.pay = payOf(it);
      });
    } catch (e) { /* nada */ }
    return out;
  };

  /* ---------- la ventana «Prácticas de hoy» ---------- */
  const MODES = [['none', 'No le cobro nada'], ['cos', 'Coseguro'], ['dif', 'Diferencial'], ['part', 'Todo particular']];
  const modeTxt = (k, it) => {
    if (k === 'cos') return 'Coseguro' + (it && it.os && it.os.cos ? ' ' + money(it.os.cos * (it.qty || 1)) : '');
    if (k === 'part') return 'Particular (no va a la obra social)';
    return (MODES.filter(x => x[0] === k)[0] || [k, k])[1];
  };
  const isRef = o => { if (!A.fornIsRef || !A.fornIsRef() || !o || !o.code) return false; const os = A.osById(o.id), a = os && os.aran && os.aran[o.code]; return !!(a && a.forn && !a.man); };
  const totals = m => {
    const on = m.items.filter(i => i.on);
    const pay = on.reduce((s, i) => s + (i.pay || 0), 0);
    const osIt = on.filter(i => i.os && i.os.mode !== 'part');
    const osAmt = osIt.reduce((s, i) => s + (i.os.cov || 0) * (i.qty || 1), 0);
    return { pay, osIt, osAmt, osMiss: osIt.filter(i => !(i.os.cov > 0)).length };
  };
  MF.pracOk = m => {
    const p = A.PAT(m.pid) || {}, po = patOS(m.pid), cob = cobraOf(m.pro), solo = isSolo();
    const osItems = m.items.filter(i => i.os), allMode = osItems.length && osItems.every(i => i.os.mode === osItems[0].os.mode) ? osItems[0].os.mode : '';
    let b = '<p class="po-who"><b>' + esc(p.name || 'Paciente') + '</b> · ' + esc(po ? po.sigla : 'Particular') + ' · atendió ' + esc(proName(m.pro)) + '</p>';
    const askCos = osItems.some(i => i.os.cos > 0) && !A.CFG.copDef && !(po && po.cop);
    if (askCos) b += '<div class="po-ask"><b>¿Les cobrás el coseguro a tus pacientes?</b><span>La tabla de ' + esc(po ? po.sigla : 'la obra social') + ' trae coseguro. Lo que elijas queda como predeterminado (en cada cobro lo podés cambiar).</span><div class="row-btns"><button class="btn small" data-act="poCosDef" data-v="cos">Sí, lo cobro</button><button class="btn small" data-act="poCosDef" data-v="none">No, nunca</button></div></div>';
    if (osItems.length) {
      b += '<div class="po-mode"><span class="po-mq">¿Qué le cobrás al paciente?</span><div class="po-seg" role="radiogroup" aria-label="Qué le cobrás al paciente">' +
        MODES.map(x => '<button type="button" role="radio" aria-checked="' + (allMode === x[0]) + '" class="po-sb' + (allMode === x[0] ? ' on' : '') + '" data-act="poAll" data-m="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
        '<small>' + (allMode === 'none' ? 'Lo cubre todo ' + esc(po ? po.sigla : 'la obra social') + ': no pasa a cobrar y queda pendiente de cobro a la obra social.' : allMode === 'dif' ? 'Escribí en cada práctica cuánto le cobrás al paciente; lo de la obra social queda pendiente aparte.' : allMode === 'part' ? 'No se le factura a la obra social: el paciente paga tu precio.' : allMode === 'cos' ? 'El paciente paga el coseguro; el resto queda pendiente de la obra social.' : 'Elegí una opción para todas o cambiá cada práctica abajo.') + '</small></div>';
    }
    b += '<ul class="po-list">' + m.items.map((it, i) => {
      const o = it.os, q = it.qty || 1;
      let sub = '';
      if (o) {
        const sig = esc(o.sigla);
        sub = o.mode === 'part' ? '<small>Particular · tu precio ' + money(it.price) + '</small>'
          : '<small class="po-osl">' + sig + ' paga ' + (o.noAran && !o.est
            ? '<span class="po-cov"><span aria-hidden="true">$</span><input inputmode="numeric" data-in="poCov" data-i="' + i + '" value="' + (o.cov || '') + '" placeholder="¿cuánto?" aria-label="Cuánto paga ' + sig + ' por ' + esc(it.label) + '"></span>'
            : money(o.cov * q) + (o.est ? ' (estimado)' : '') + (isRef(o) ? ' <span class="os-ref">(ref. Río Negro)</span>' : '')) + (it.price ? ' · tu precio ' + money(it.price) : '') + '</small>';
        sub += '<label class="po-cop"><span class="sr">Qué paga el paciente</span><select data-chg="poCm" data-i="' + i + '">' +
          MODES.filter(x => x[0] !== 'cos' || o.cos > 0 || o.mode === 'cos').map(x => '<option value="' + x[0] + '"' + (o.mode === x[0] ? ' selected' : '') + '>' + esc(modeTxt(x[0], it)) + '</option>').join('') + '</select></label>';
      } else sub = '<small>Particular</small>';
      return '<li class="' + (it.on ? '' : 'off') + '"><label class="po-chk"><input type="checkbox" data-chg="poOn" data-i="' + i + '"' + (it.on ? ' checked' : '') + ' aria-label="Incluir ' + esc(it.label) + '"></label><span class="po-l"><b>' + esc(it.label) + '</b>' + sub + '</span>' +
        '<span class="po-amt"><small class="po-al">Paciente</small><span aria-hidden="true">$</span><input inputmode="numeric" data-in="poAmt" data-i="' + i + '" value="' + (it.pay || 0) + '" aria-label="Lo que paga el paciente por ' + esc(it.label) + '"></span></li>';
    }).join('') + '</ul>';
    b += '<div class="po-add"><select data-chg="poAdd" aria-label="Agregar otra práctica del catálogo"><option value="">+ Agregar otra práctica…</option>' + A.catCats().map(c => '<optgroup label="' + esc(c) + '">' + A.CAT.filter(x => x.cat === c).map(x => '<option value="' + esc(x.k) + '">' + esc(x.label) + ' · ' + money(x.price) + '</option>').join('') + '</optgroup>').join('') + '</select></div>';
    const t = totals(m);
    b += '<div class="po-tot"><span>' + (t.osIt.length ? 'Paga el paciente hoy' : 'Total a cobrar hoy') + '</span><b id="poTot">' + money(t.pay) + '</b></div>';
    if (t.osIt.length) b += '<div class="po-tot po-os"><span>Queda pendiente de cobro a ' + esc(po ? po.sigla : 'la obra social') + (t.osMiss ? ' · ' + t.osMiss + ' sin importe (lo podés completar después)' : '') + '</span><b id="poOsTot">' + money(t.osAmt) + '</b></div>';
    const learn = po && po.real && boss() && m.items.some(i => i.on && i.os && i.os.noAran && !i.os.est && i.os.cov > 0 && i.os.code);
    if (learn) b += '<label class="chk po-learn"><input type="checkbox" id="poLearn"' + (m.learn !== false ? ' checked' : '') + ' data-chg="poLearn"> Recordar estos importes como arancel de ' + esc(po.sigla) + ' para la próxima</label>';
    b += '<p class="hint" style="margin:6px 0 0">Las prácticas quedan en la historia clínica y en el odontograma (en rojo, realizadas).</p><div class="hint bad" id="poMsg"></div>';
    const osOnly = t.osIt.length && t.pay === 0;
    const mainRcp = !solo && cob === 'rcp';
    if (m.step === 'who' && !osOnly) return whoView(m, p, t, cob);
    const f = '<button class="btn" data-act="closeModal">Volver</button>' + (m.only ? '' : '<button class="btn ghost" data-act="poGo" data-k="nota">Solo nota, sin cobrar</button>') +
      (osOnly ? '<button class="btn primary" data-act="poGo" data-k="os">Listo · pendiente de ' + esc(po ? po.sigla : 'la obra social') + '</button>'
        : '<button class="btn" data-act="poGo" data-k="later">Cobrar después</button><button class="btn primary" data-act="poWho">Cobrar ' + money(t.pay) + ' →</button>');
    return A.modalShell('Prácticas de hoy', b, f);
  };
  const sync = () => {
    const m = S.modal; if (!m || m.type !== 'pracOk') return;
    A.$$('[data-in="poAmt"]').forEach(i => { const it = m.items[+i.getAttribute('data-i')]; if (it) { it.pay = num(i.value); if (it.os && it.os.mode === 'dif') it.os.difSet = it.pay; } });
    A.$$('[data-in="poCov"]').forEach(i => { const it = m.items[+i.getAttribute('data-i')]; if (it && it.os) it.os.cov = num(i.value); });
  };
  const paint = () => {
    const m = S.modal; if (!m) return; const t = totals(m), a = $('#poTot'), o = $('#poOsTot');
    if (a) a.textContent = money(t.pay); if (o) o.textContent = money(t.osAmt);
  };
  A.ins.poAmt = el => { sync(); paint(); if ((S.modal.items.filter(i => i.on).reduce((s, i) => s + (i.pay || 0), 0) > 0) !== !!$('[data-act="poGo"][data-k="pro"], [data-act="poGo"][data-k="later"]')) { const pos = el.selectionStart; const id = el.getAttribute('data-i'); A.renderModal(); const n = $('[data-in="poAmt"][data-i="' + id + '"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* nada */ } } } };
  A.ins.poCov = el => {
    sync(); const it = S.modal.items[+el.getAttribute('data-i')];
    /* misma práctica (mismo código) en otras piezas: se completa igual si estaba vacía */
    if (it && it.os && it.os.code) S.modal.items.forEach((x, j) => { if (x !== it && x.os && x.os.noAran && !x.os.est && x.os.code === it.os.code && (!x.os.cov || x.os._auto)) { x.os.cov = it.os.cov; x.os._auto = 1; const n = $('[data-in="poCov"][data-i="' + j + '"]'); if (n) n.value = x.os.cov || ''; } });
    if (it && it.os && it.os.mode === 'dif' && it.os.difSet == null) { it.pay = payOf(it); const pa = $('[data-in="poAmt"][data-i="' + el.getAttribute('data-i') + '"]'); if (pa) pa.value = it.pay; }
    paint();
    const lr = $('.po-learn'); if (!lr && it && it.os && it.os.cov > 0) { const id = el.getAttribute('data-i'), pos = el.selectionStart; A.renderModal(); const n = $('[data-in="poCov"][data-i="' + id + '"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* nada */ } } }
  };
  A.chg.poCm = el => { sync(); const it = S.modal.items[+el.getAttribute('data-i')]; if (!it || !it.os) return; it.os.mode = el.value; it.os.difSet = null; it.pay = payOf(it); A.renderModal(); if (el.value === 'dif') { const n = $('[data-in="poAmt"][data-i="' + el.getAttribute('data-i') + '"]'); if (n) { n.focus(); n.select(); } } };
  A.acts.poAll = el => {
    sync(); const k = el.getAttribute('data-m'), m = S.modal;
    m.items.forEach(it => { if (!it.os) return; it.os.mode = k === 'cos' && !(it.os.cos > 0) ? 'cos' : k; it.os.difSet = null; it.pay = payOf(it); });
    A.renderModal();
    if (k === 'dif') { const n = $('[data-in="poAmt"]'); if (n) { n.focus(); n.select(); } }
  };
  A.chg.poLearn = el => { S.modal.learn = el.checked; };
  A.acts.poCosDef = el => {
    sync(); const v = el.getAttribute('data-v'); A.CFG.copDef = v; A.save();
    S.modal.items.forEach(it => { if (!it.os || it.os.mode === 'part') return; it.os.mode = v === 'cos' && !(it.os.cos > 0) ? 'none' : v; it.os.difSet = null; it.pay = payOf(it); });
    A.renderModal(); A.toast(v === 'cos' ? 'Listo: se propone cobrar el coseguro.' : 'Listo: no se propone cobrar coseguro.');
  };
  const addPrev = A.chg.poAdd;
  A.chg.poAdd = el => {
    sync(); const n0 = S.modal.items.length; if (addPrev) addPrev(el);
    const m = S.modal; if (!m || m.items.length <= n0) return;
    const it = m.items[m.items.length - 1], po = patOS(m.pid);
    if (!it.os && po) { it.os = { id: po.id, sigla: po.sigla, code: A.codeFor ? A.codeFor({ label: it.label }) : null, cov: 0, cos: 0, mode: (m.items.filter(x => x.os)[0] || { os: { mode: defMode(po) } }).os.mode, noAran: true }; it.pay = payOf(it); A.renderModal(); }
  };

  /* ---------- guardar ---------- */
  const goPrev = A.acts.poGo;
  A.acts.poGo = function (el) {
    sync();
    const m = S.modal; if (!m || m.type !== 'pracOk') return goPrev.apply(this, arguments);
    const k = el.getAttribute('data-k'), pid = m.pid, po = patOS(pid), before = {};
    const pd0 = A.pd(pid); (pd0.ledger || []).forEach(e => { before[e.id || ''] = 1; });
    /* «Recordar como arancel»: el importe que pusiste queda en la lista de la obra social */
    if (k !== 'nota' && po && po.real && boss() && m.learn !== false && $('#poLearn')) {
      let ch = 0; m.items.forEach(it => { const o = it.os; if (!it.on || !o || !o.noAran || o.est || !(o.cov > 0) || !o.code) return; po.os.aran = po.os.aran || {}; po.os.aran[o.code] = Object.assign({}, po.os.aran[o.code] || {}, { on: true, cov: o.cov, cos: (po.os.aran[o.code] || {}).cos || 0 }); ch++; });
      if (ch) { po.os.upd = A.today(); A.save(); }
    }
    let r, el2 = el;
    if (k === 'os') {
      /* nada para cobrarle al paciente: se guarda como «después» y la obra social queda pendiente */
      el2 = document.createElement('button'); el2.setAttribute('data-k', 'later');
      const t0 = A.toast; A.toast = () => {};
      try { r = goPrev.call(this, el2); } finally { A.toast = t0; }
    } else r = goPrev.call(this, el2);
    try {
      const pd = A.pd(pid); let ch = 0;
      (pd.ledger || []).forEach(e => {
        if (e.type !== 'cargo' || before[e.id || ''] || e.voided) return;
        if (e.cop === 'part') {
          /* particular: no va a la obra social */
          delete e.os; delete e.osCov; e.desc = String(e.desc || '').replace(/ · [^·]* cubre [^·]*$/, ''); ch++;
          const t = (pd.tx || []).filter(x => x.id === e.txId)[0]; if (t && t.os) { delete t.os; }
        } else if (e.os && po && !e.osCov && e.cop) { e.osCov = 0; ch++; }
        if (e.os && !(+e.amount > 0) && e.cob && !e.cobOk) { e.cobOk = 'os'; ch++; }
      });
      if (ch) A.touchPd(pid);
    } catch (e) { /* nada */ }
    if (k === 'os') {
      const t = totals(m); S.modal = null; A.renderModal();
      A.toast('Guardado. ' + (po ? po.sigla : 'La obra social') + ' queda pendiente' + (t.osAmt ? ' de ' + money(t.osAmt) : '') + ' (Caja › Obras sociales).');
      if (A.renderPanel) A.renderPanel(); A.refresh();
    }
    return r;
  };

  /* ---------- Caja › Obras sociales: también las prácticas sin importe cargado ---------- */
  const dueePrev = A.osDue;
  if (dueePrev) A.osDue = () => {
    const rows = dueePrev(), add = {};
    A.allPids().forEach(id => {
      const pd = A.pd(id); if (!pd) return; const name = (A.PAT(id) || {}).name || (pd.prof && pd.prof.name) || 'Paciente';
      (pd.ledger || []).forEach(e => {
        if (e.type !== 'cargo' || e.voided || e.anula || !e.os || +e.osCov > 0 || !('osCov' in e)) return;
        const mk = e.date.slice(0, 7), key = e.os + '|' + mk, r = add[key] || (add[key] = { os: e.os, month: mk, items: [] });
        r.items.push({ pid: id, name, desc: e.desc + ' (sin importe)', date: e.date, amt: 0, pro: e.pro });
      });
    });
    Object.keys(add).forEach(key => {
      const a = add[key], row = rows.filter(x => x.os === a.os && x.month === a.month)[0];
      if (row) { row.items = row.items.concat(a.items); row.n += a.items.length; row.miss = (row.miss || 0) + a.items.length; }
      else { const os = A.osById ? A.osById(a.os) : null, pay = (A.osPayStore()[a.os] || {})[a.month] || null; rows.push({ os: a.os, sigla: os ? os.sigla : 'Obra social', month: a.month, amt: 0, n: a.items.length, items: a.items, paid: pay ? +pay.amt || 0 : 0, pay, miss: a.items.length }); }
    });
    return rows.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : String(a.sigla).localeCompare(String(b.sigla))));
  };

  /* ---------- ¿quién cobra? el odontólogo en el momento o la secretaria (le aparece en su usuario) ---------- */
  const whoBtns = (pre, last, extra) =>
    '<div class="who-ops">' +
      '<button class="who-op' + (last === 'pro' ? ' last' : '') + '" data-act="' + pre + '" data-k="pro"><b>Cobro yo ahora</b><span>Se abre el cobro: efectivo, tarjeta, transferencia, cuotas…</span></button>' +
      '<button class="who-op' + (last === 'rcp' ? ' last' : '') + '" data-act="' + pre + '" data-k="rcp"><b>Lo cobra la secretaria</b><span>Le aparece en «Para cobrar» en su usuario (y en la recepción), con aviso. Vos seguís atendiendo.</span></button>' +
    '</div>' + (extra || '');
  function whoView(m, p, t, cob) {
    const b = '<p class="who-q">¿Quién le cobra <b>' + money(t.pay) + '</b> a <b>' + esc(p.name || 'el paciente') + '</b>?</p>' + whoBtns('poGo', A.CFG.cobra && A.CFG.cobra[m.pro] ? cob : '');
    return A.modalShell('Cobrar', b, '<button class="btn" data-act="poWhoBack">‹ Volver a las prácticas</button>');
  }
  A.acts.poWho = () => { sync(); S.modal.step = 'who'; A.renderModal(); };
  A.acts.poWhoBack = () => { S.modal.step = null; A.renderModal(); };
  /* recordar la elección (queda resaltada la próxima vez) */
  const goPrev2 = A.acts.poGo;
  A.acts.poGo = function (el) {
    const m = S.modal, k = el.getAttribute('data-k');
    if (m && m.type === 'pracOk' && (k === 'pro' || k === 'rcp') && m.pro) { A.CFG.cobra = A.CFG.cobra || {}; A.CFG.cobra[m.pro] = k; }
    return goPrev2.apply(this, arguments);
  };

  /* en «Para cobrar» (inicio y caja): el odontólogo o el dueño eligen; la secretaria cobra directo */
  const rcpRole = () => { const r = A.mbRole ? A.mbRole() : null; return (A.isMember && A.isMember() && r === 'recepcion'); };
  const pcPrev = A.pcHTML;
  if (pcPrev) A.pcHTML = function () {
    const h = pcPrev.apply(this, arguments); if (typeof h !== 'string' || rcpRole()) return h;
    const L = A.pcList();
    return h.replace(/<button class="btn small primary" data-act="pcPay" data-pid="([^"]+)">Cobrar<\/button>/g, (all, pid) => {
      const it = L.filter(x => x.pid === pid)[0], atRcp = it && it.items.every(e => e.cob === 'rcp');
      return (atRcp ? '<small class="pc-rcp">en recepción</small>' : '') + '<button class="btn small primary" data-act="pcWho" data-pid="' + pid + '">Cobrar</button>';
    });
  };
  A.acts.pcWho = el => { S.modal = { type: 'pcWho', pid: el.getAttribute('data-pid') }; A.renderModal(); };
  MF.pcWho = m => {
    const it = A.pcList().filter(x => x.pid === m.pid)[0], p = A.PAT(m.pid) || {};
    if (!it) return A.modalShell('Cobrar', '<div class="empty">Ya no tiene nada para cobrar.</div>', '<button class="btn" data-act="closeModal">Cerrar</button>');
    const atRcp = it.items.every(e => e.cob === 'rcp'), pro = it.pros[0], last = A.CFG.cobra && A.CFG.cobra[pro];
    const b = '<p class="who-q">¿Quién le cobra <b>' + money(it.tot) + '</b> a <b>' + esc(p.name || it.name) + '</b>?</p>' +
      (atRcp ? '<p class="hint">Ya está en «Para cobrar» de la secretaria. Si querés, lo cobrás vos igual.</p>' : '') + whoBtns('pcWhoGo', atRcp ? 'rcp' : last);
    return A.modalShell('Cobrar', b, '<button class="btn" data-act="closeModal">Cancelar</button>');
  };
  A.acts.pcWhoGo = el => {
    const k = el.getAttribute('data-k'), pid = S.modal.pid, it = A.pcList().filter(x => x.pid === pid)[0];
    if (k === 'pro') { S.modal = null; A.renderModal(); A.acts.pcPay({ getAttribute: () => pid }); return; }
    if (it) {
      const pd = A.pd(pid), ids = it.items.map(e => e.id), now = new Date().toISOString(), w = (A.actor && A.actor().who) || '';
      (pd.ledger || []).forEach(e => { if (ids.indexOf(e.id) >= 0) { e.cob = 'rcp'; e.cobAt = now; e.cobBy = w; } });
      A.touchPd(pid);
      const ap = it.ap; if (ap && A.mutate) A.mutate([ap.date], () => { ap.toRcp = now; });
      if (it.pros[0]) { A.CFG.cobra = A.CFG.cobra || {}; A.CFG.cobra[it.pros[0]] = 'rcp'; }
      A.save();
    }
    S.modal = null; A.renderModal(); A.refresh();
    A.toast((A.PAT(pid) || {}).name + ' pasó a «Para cobrar» de la secretaria.');
  };

  const css = document.createElement('style');
  css.textContent = '.po-mode{display:grid;gap:6px;margin:8px 0 10px;padding:10px 12px;border:1px solid var(--line,#d5e2e1);border-radius:14px;background:var(--soft,#f1f8f7)}' +
    '.po-mq{font-weight:700;font-size:.92rem}.po-mode small{color:var(--muted,#567);font-size:.82rem}' +
    '.po-seg{display:flex;flex-wrap:wrap;gap:6px}.po-sb{border:1.5px solid var(--line,#c9d8d6);background:var(--card,#fff);color:inherit;border-radius:999px;padding:7px 12px;font:inherit;font-size:.88rem;cursor:pointer}' +
    '.po-sb.on{background:var(--teal,#0b6b6f);border-color:var(--teal,#0b6b6f);color:#fff;font-weight:700}' +
    '.po-cov{display:inline-flex;align-items:center;gap:2px}.po-cov input{width:96px;padding:3px 6px;border:1px solid var(--line,#ccd);border-radius:8px;font:inherit;font-size:.85rem}' +
    '.po-list li{flex-wrap:wrap}.po-l{flex:1 1 180px;min-width:0}.po-al{font-size:.72rem;color:var(--muted,#567);margin-right:4px}.po-amt input{width:90px}' +
    '.who-q{margin:0 0 12px;font-size:1.02rem}.who-ops{display:grid;gap:10px}.who-op{display:grid;gap:3px;text-align:left;border:1.5px solid var(--line,#ccd);border-radius:16px;padding:14px 16px;background:var(--card,#fff);color:inherit;font:inherit;cursor:pointer}.who-op b{font-size:1.05rem}.who-op span{font-size:.86rem;color:var(--muted,#567)}.who-op:hover{border-color:var(--teal,#0b6b6f)}.who-op.last{border-color:var(--teal,#0b6b6f);box-shadow:0 0 0 3px rgba(11,107,111,.12)}.pc-rcp{display:block;font-size:.75rem;color:var(--teal,#0b6b6f);font-weight:700}' +
    '.po-learn{margin:8px 0 0;font-size:.86rem}.po-ask{display:grid;gap:4px;margin:8px 0;padding:10px 12px;border-radius:14px;background:#fff6e0;border:1px solid #f0c674;color:#4d3800}.po-ask span{font-size:.84rem}' +
    '@media (max-width:640px){.po-sb{padding:6px 10px;font-size:.84rem}.po-cov input{width:84px}.po-list li{align-items:flex-start}.po-amt{margin-left:30px;flex:1 1 100%;justify-content:flex-end}.po-cop select{width:100%}}';
  document.head.appendChild(css);
})();
