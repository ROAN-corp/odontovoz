/* ===== 1.9: planes de cada obra social (cada plan paga distinto) y el plan del paciente decide lo que se cobra ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const money = n => A.money(Math.round(n || 0));
  const N = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const num = v => { const n = parseInt(String(v == null ? '' : v).replace(/[^\d]/g, ''), 10); return isNaN(n) ? null : n; };
  const boss = () => (A.isBoss ? A.isBoss() : true);
  const RN = 'Federación Odontológica de Río Negro';

  /* =====================================================================
     1. DATOS
     o.pl = [{ id, name, aran: { código: { on, cov, cos } }, forn: { slug, cols: [[tabla, columna]], sig } | null }]
     Lo que un plan no tiene cargado usa la tabla general de la obra social (o.aran).
     El paciente: p.plan (texto, como siempre) → se busca el plan con ese nombre o número.
     ===================================================================== */
  const plN = s => N(s).replace(/^plan(es)? /, '');
  A.osPlans = o => {
    if (!o) return [];
    const L = (o.pl || []).slice();
    String(o.plans || '').split(/[,;/\n]+/).map(x => x.trim()).filter(Boolean).forEach(nm => { if (!L.some(p => plN(p.name) === plN(nm))) L.push({ id: 'txt:' + plN(nm), name: nm, aran: {}, txt: true }); });
    return L;
  };
  A.osPlanFor = (o, txt) => {
    const t = plN(txt); if (!t || !o) return null; const L = (o.pl || []);
    let hit = L.filter(p => plN(p.name) === t)[0]; if (hit) return hit;
    const tw = t.split(' ');
    hit = L.filter(p => { const pw = plN(p.name).split(' ').filter(Boolean); return pw.length && pw.every(w => tw.indexOf(w) >= 0); }).sort((a, b) => plN(b.name).length - plN(a.name).length)[0];
    return hit || null;
  };
  /* la obra social «vista con el plan del paciente»: misma obra social, con los valores del plan encima */
  const view = (o, pl) => {
    const v = Object.create(o), ar = {};
    Object.keys(o.aran || {}).forEach(c => { ar[c] = Object.assign({}, o.aran[c]); });
    Object.keys(pl.aran || {}).forEach(c => { const x = pl.aran[c]; if (!x) return; ar[c] = Object.assign({}, ar[c] || { on: true, cov: 0, cos: 0 }, x); if (x.cov != null && x.on !== false) ar[c].on = true; });
    v.aran = ar; v.sigla = o.sigla + ' · ' + pl.name; v.planId = pl.id; v.planName = pl.name; v.base = o; return v;
  };
  const osOf0 = A.osOf;
  A.osOf = pat => {
    const o = osOf0(pat); if (!o || !pat || !pat.plan || !(o.pl || []).length) return o;
    const pl = A.osPlanFor(o, pat.plan); return pl ? view(o, pl) : o;
  };
  A.osPlanOfPat = pat => { const o = osOf0(pat); return o && pat && pat.plan ? A.osPlanFor(o, pat.plan) : null; };
  const syncTxt = o => { o.plans = (o.pl || []).map(p => p.name).join(', '); };

  /* =====================================================================
     2. FEDERACIÓN: los planes que vienen en columnas (Galeno AZUL / PLATA…) se cargan solos
     ===================================================================== */
  const cleanName = (lab, t) => {
    let s = String(lab || '').replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, ' ');
    if (t && t.title) s = s.replace(t.title, ' ');
    s = s.replace(/^\s*\d+\s*-\s*[^A-Z]*?(?=[A-Z]{2,})/, ' ').replace(/\s+/g, ' ').trim();
    if (/^columna\s*\d+$/i.test(s) || !s) return null;
    return s.length > 30 ? s.slice(0, 30) : s;
  };
  const planCols = f => {
    const out = {};
    (f.tables || []).forEach((t, ti) => {
      const cs = t.cols.map((c, i) => ({ c, i })).filter(x => x.c.kind === 'plan').map(x => ({ i: x.i, name: cleanName(x.c.label, t) })).filter(x => x.name);
      if (cs.length < 2) return;
      cs.forEach(x => { const k = plN(x.name); (out[k] = out[k] || { name: x.name, cols: [] }).cols.push([ti, x.i]); });
    });
    return out;
  };
  A.fornPlansFor = f => Object.keys(planCols(f)).map(k => planCols(f)[k].name);
  /* carga o actualiza los planes de la obra social con lo publicado (los coseguros que pusiste en cada plan se respetan) */
  A.fornAutoPlans = (o, f) => {
    if (!o || !f) return 0; const P = planCols(f), keys = Object.keys(P); if (!keys.length) return 0;
    o.pl = o.pl || []; let n = 0;
    keys.forEach(k => {
      const x = P[k]; let pl = o.pl.filter(p => plN(p.name) === k)[0];
      if (!pl) { pl = { id: A.uid(), name: x.name, aran: {} }; o.pl.push(pl); }
      let h = 0;
      x.cols.forEach(tc => {
        const t = f.tables[tc[0]];
        Object.keys(t.rows).forEach(code => { const v = t.rows[code].v[tc[1]]; if (v == null) return; const a = pl.aran[code] || (pl.aran[code] = { on: true }); a.cov = v; a.on = true; a.forn = 1; if (!(A.NOMEN || []).some(y => y[0] === code)) a.label = t.rows[code].d; n++; });
        h = (h * 31 + (A.fornSig ? A.fornSig(t) : 0)) | 0;
      });
      pl.forn = { slug: f.slug, cols: x.cols, sig: h };
    });
    syncTxt(o); o.upd = A.today(); return n;
  };
  const planSig = (f, pl) => { let h = 0; (pl.forn.cols || []).forEach(tc => { const t = f.tables[tc[0]]; h = (h * 31 + (t && A.fornSig ? A.fornSig(t) : 0)) | 0; }); return h; };
  /* «Una por plan» ya no crea una obra social por plan: carga los planes dentro de la misma */
  A.acts.fornPlans = () => {
    if (!boss()) { A.toast(A.permWhy ? A.permWhy(true) : 'Solo el dueño o un administrador.'); return; }
    const m = S.modal, o = A.osById(m.id), f = A.fornById && A.fornById(m.slug); if (!o || !f) return;
    A.fornApply(o, m); A.fornAutoPlans(o, f); A.save();
    S.modal = m.back || null; if (S.modal && S.modal.type === 'osEdit') S.modal.id = o.id; A.renderModal();
    A.toast('Se cargaron los planes de ' + o.sigla + ': ' + (o.pl || []).map(p => p.name).join(', ') + '. Elegí el plan en la ficha de cada paciente.');
  };
  /* al agregar/actualizar desde la Federación, también los planes */
  ['fornAllGo', 'fornUpdGo', 'fornGo'].forEach(k => {
    const prev = A.acts[k]; if (!prev) return;
    A.acts[k] = function () {
      const m = S.modal;
      if (k === 'fornGo' && m && m.plan) return planFornGo(m);
      const r = prev.apply(this, arguments);
      try { A.osList().forEach(o => { if (!o.forn || !A.fornById) return; const f = A.fornById(o.forn.slug); if (!f) return; if (k === 'fornGo' && (!m || m.id !== o.id)) return; if (Object.keys(planCols(f)).length) A.fornAutoPlans(o, f); }); A.save(); } catch (e) { if (A.logError) A.logError('osPlans', e); }
      return r;
    };
  });
  /* aviso de valores nuevos: también si cambió la tabla de un plan */
  const chkPrev = A.fornCheck;
  if (chkPrev) A.fornCheck = () => chkPrev().then(L => {
    L = L || []; const ids = L.map(o => o.id);
    try {
      const more = A.osList().filter(o => ids.indexOf(o.id) < 0 && (o.pl || []).some(pl => { if (!pl.forn || !A.fornById) return false; const f = A.fornById(pl.forn.slug); return f && planSig(f, pl) !== pl.forn.sig; }));
      if (more.length && A.nfAdd) A.nfAdd({ id: 'fornpl:' + A.today(), k: 'info', t: 'Aranceles nuevos de la Federación', b: 'Planes de ' + more.map(o => o.sigla).join(', ') + '. Tocá para actualizarlos.', act: 'fornUpd' });
      return L.concat(more.filter(o => o.forn));
    } catch (e) { return L; }
  });

  /* =====================================================================
     3. EN LA OBRA SOCIAL: lista de planes
     ===================================================================== */
  const osEditPrev = MF.osEdit;
  MF.osEdit = m => {
    let h = osEditPrev(m); const o = A.osById(m.id); if (typeof h !== 'string' || !o || o.kind === 'particular') return h;
    /* el viejo campo de texto «Planes» lo reemplaza la lista */
    h = h.replace(/<div class="field"><label for="os_plans">[\s\S]*?<\/div>/, '');
    const L = o.pl || [], ed = boss();
    let b = '<div class="block osp"><h3>Planes <small>(' + L.length + ')</small></h3><p class="hint" style="margin:0 0 6px">Si ' + esc(o.sigla) + ' paga distinto según el plan del paciente, cargá cada plan. Lo que no cargues en un plan usa la tabla general de abajo. En la ficha del paciente elegís su plan y al cobrar se usan esos valores.</p>';
    if (L.length) b += '<ul class="osp-list">' + L.map(pl => { const n = Object.keys(pl.aran || {}).filter(c => pl.aran[c] && pl.aran[c].cov != null).length, used = A.PATS.filter(p => A.osPlanOfPat(p) === pl).length;
      return '<li><span class="osp-n"><b>' + esc(pl.name) + '</b><small>' + (n ? n + ' valor' + (n === 1 ? '' : 'es') + ' propio' + (n === 1 ? '' : 's') : 'igual a la tabla general') + (pl.forn ? ' · de la Federación' : '') + (used ? ' · ' + used + ' paciente' + (used === 1 ? '' : 's') : '') + '</small></span>' +
        (ed ? '<button class="btn small" data-act="ospEd" data-os="' + esc(o.id) + '" data-pl="' + esc(pl.id) + '">Valores</button>' : '') + '</li>'; }).join('') + '</ul>';
    else if (o.plans) b += '<p class="hint">Tenías anotados estos planes: <b>' + esc(o.plans) + '</b>. Agregalos acá para cargarles sus valores.</p>';
    if (ed) b += '<div class="osp-add"><input id="ospNew" placeholder="Nombre o número del plan (ej.: 604)" aria-label="Nombre del plan nuevo"><button class="btn small primary" data-act="ospAdd" data-os="' + esc(o.id) + '">+ Agregar plan</button></div>' +
      (o.forn ? '<button class="btn small ghost" data-act="ospFornAuto" data-os="' + esc(o.id) + '">Buscar planes en la Federación</button>' : '');
    b += '</div>';
    return h.replace('<div class="block"><h3>Aranceles por práctica</h3>', () => b + '<div class="block"><h3>Aranceles por práctica <small>(tabla general)</small></h3>');
  };
  A.acts.ospAdd = el => {
    const o = A.osById(el.getAttribute('data-os')), i = $('#ospNew'), nm = i ? i.value.trim() : ''; if (!o) return;
    if (!nm) { if (i) i.focus(); A.toast('Escribí el nombre o número del plan.'); return; }
    o.pl = o.pl || []; if (o.pl.some(p => plN(p.name) === plN(nm))) { A.toast('Ese plan ya está.'); return; }
    const pl = { id: A.uid(), name: nm, aran: {} }; o.pl.push(pl); syncTxt(o); A.save();
    S.modal = { type: 'ospEd', os: o.id, pl: pl.id, back: S.modal, fresh: true }; A.renderModal();
  };
  A.acts.ospFornAuto = el => {
    const o = A.osById(el.getAttribute('data-os')); if (!o) return;
    A.fornGet().then(d => {
      const f = d && A.fornById(o.forn.slug); if (!f) { A.toast('No se pudo bajar lo de la Federación.'); return; }
      const n = A.fornAutoPlans(o, f); A.save(); A.renderModal();
      A.toast(n ? 'Planes cargados: ' + o.pl.map(p => p.name).join(', ') + '.' : 'La Federación no publica valores distintos por plan para ' + o.sigla + '. Cargalos a mano o copiá la tabla general con un porcentaje.');
    });
  };

  /* ---------- valores de un plan ---------- */
  const plOf = m => { const o = A.osById(m.os); return { o, pl: o && (o.pl || []).filter(p => p.id === m.pl)[0] }; };
  MF.ospEd = m => {
    const { o, pl } = plOf(m); if (!o || !pl) { S.modal = m.back || null; return A.renderModal(); }
    const codes = Object.keys(o.aran || {}).filter(c => o.aran[c] && o.aran[c].on).concat(Object.keys(pl.aran || {})).filter((c, i, a) => a.indexOf(c) === i).sort();
    const lab = c => (pl.aran[c] && pl.aran[c].label) || (o.aran[c] && o.aran[c].label) || ((A.NOMEN || []).filter(x => x[0] === c)[0] || [])[1] || '';
    let b = '<div class="field"><label for="ospName">Nombre del plan</label><input id="ospName" data-chg="ospName" value="' + esc(pl.name) + '"></div>';
    b += '<div class="osp-pct"><span>Copiar la tabla general al</span><span class="pr-in"><input id="ospPct" inputmode="decimal" value="' + esc(m.pct || '100') + '" aria-label="Porcentaje"><i>%</i></span><button class="btn small" data-act="ospCopy">Copiar</button></div>';
    b += '<button class="btn small ghost" data-act="ospForn">Traer de la Federación (elegir tabla y columna)</button>';
    if (m.fresh) b += '<p class="hint">Plan nuevo: poné lo que paga ' + esc(o.sigla) + ' en este plan. Lo que dejes vacío usa la tabla general.</p>';
    b += codes.length ? '<div class="os-tbl osp-tbl"><div class="os-th"><span>Práctica</span><span>General</span><span>Este plan paga</span><span>Coseguro</span></div>' + codes.map(c => {
      const g = o.aran[c] || {}, x = pl.aran[c] || {};
      return '<div class="os-tr' + (x.cov != null ? ' on' : '') + '"><span><b>' + esc(c) + '</b> ' + esc(lab(c)) + '</span><span class="osp-g">' + (g.on ? money(g.cov) : '—') + '</span>' +
        '<input inputmode="numeric" data-chg="ospV" data-c="' + esc(c) + '" data-f="cov" value="' + (x.cov != null ? x.cov : '') + '" placeholder="' + (g.on ? g.cov : '') + '" aria-label="Lo que paga en este plan: ' + esc(lab(c)) + '">' +
        '<input inputmode="numeric" data-chg="ospV" data-c="' + esc(c) + '" data-f="cos" value="' + (x.cos != null ? x.cos : '') + '" placeholder="' + (g.on ? (g.cos || 0) : '') + '" aria-label="Coseguro en este plan: ' + esc(lab(c)) + '"></div>';
    }).join('') + '</div>' : '<div class="empty">Primero cargá la tabla general de la obra social (o traé los valores de la Federación).</div>';
    return A.modalShell(o.sigla + ' · plan ' + pl.name, b, '<button class="btn danger" data-act="ospDel">Quitar el plan</button><button class="btn primary" data-act="ospBack">Listo</button>', true);
  };
  A.chg.ospName = el => { const { o, pl } = plOf(S.modal); const v = el.value.trim(); if (!pl || !v) return; pl.name = v; syncTxt(o); A.save(); };
  A.chg.ospV = el => {
    const { pl } = plOf(S.modal); if (!pl) return; const c = el.getAttribute('data-c'), f = el.getAttribute('data-f'), v = num(el.value);
    const x = pl.aran[c] || (pl.aran[c] = {}); if (v == null) delete x[f]; else { x[f] = v; x.on = true; }
    if (x.cov == null && x.cos == null) delete pl.aran[c]; A.save(); el.closest('.os-tr') && el.closest('.os-tr').classList.toggle('on', x.cov != null);
  };
  A.acts.ospCopy = () => {
    const m = S.modal, { o, pl } = plOf(m), i = $('#ospPct'), p = parseFloat(String(i ? i.value : '100').replace(',', '.')); if (!pl) return;
    if (!(p > 0)) { A.toast('Poné un porcentaje.'); return; }
    m.pct = String(p); let n = 0;
    Object.keys(o.aran || {}).forEach(c => { const g = o.aran[c]; if (!g || !g.on) return; const x = pl.aran[c] || (pl.aran[c] = {}); x.cov = Math.round((g.cov || 0) * p / 100); x.on = true; n++; });
    pl.copy = { p, at: A.today() }; A.save(); m.fresh = false; A.renderModal(); A.toast(n + ' valores copiados al ' + String(p).replace('.', ',') + '%. Corregí los que sean distintos.');
  };
  A.acts.ospForn = () => {
    const m = S.modal, { o, pl } = plOf(m); if (!pl) return;
    S.modal = { type: 'fornPick', id: o.id, plan: pl.id, back: m, loading: true }; A.renderModal();
    A.fornGet().then(d => {
      const k = S.modal; if (!k || k.type !== 'fornPick') return; k.loading = false;
      if (!d) { k.err = 'No se pudieron bajar los aranceles. Revisá la conexión a internet.'; A.renderModal(); return; }
      const f = A.fornMatch(o); k.slug = f ? f.slug : ''; k.t = 0;
      const t = f && f.tables[0]; if (t) { const ks = t.cols.map(c => c.kind); k.cov = Math.max(0, ks.indexOf('cov') >= 0 ? ks.indexOf('cov') : ks.indexOf('total')); k.cos = ks.indexOf('cos'); k.sub = ks.indexOf('cov') < 0 && k.cos >= 0 && ks.indexOf('total') >= 0; }
      A.renderModal();
    });
  };
  function planFornGo(m) {
    const o = A.osById(m.id), pl = o && (o.pl || []).filter(p => p.id === m.plan)[0]; if (!pl) return;
    const tmp = { aran: {}, notes: '' }; const n = A.fornApply(tmp, m);
    Object.keys(tmp.aran).forEach(c => { pl.aran[c] = Object.assign(pl.aran[c] || {}, { on: true, cov: tmp.aran[c].cov }, tmp.aran[c].cos != null && m.cos >= 0 ? { cos: tmp.aran[c].cos } : {}); if (tmp.aran[c].label) pl.aran[c].label = tmp.aran[c].label; });
    const f = A.fornById(m.slug); pl.forn = { slug: m.slug, cols: [[m.t, m.cov]], sig: f ? planSig(f, { forn: { cols: [[m.t, m.cov]] } }) : 0 };
    A.save(); S.modal = m.back || null; A.renderModal(); A.toast(n + ' valores del plan ' + pl.name + ' cargados.');
  }
  /* en la ventana de la Federación, si es para un plan, se dice */
  const fpPrev = MF.fornPick;
  MF.fornPick = m => { let h = fpPrev(m); if (!m.plan || typeof h !== 'string') return h; const { pl } = plOf({ os: m.id, pl: m.plan }); return h.replace('<p class="m-lead">', '<p class="m-lead"><b>Para el plan ' + esc(pl ? pl.name : '') + ':</b> ').replace(/<button class="btn" data-act="fornPlans">[^<]*<\/button>/, '').replace('>Usar estos aranceles<', '>Usar para este plan<'); };
  A.acts.ospBack = () => { S.modal = (S.modal && S.modal.back) || null; A.renderModal(); };
  A.acts.ospDel = () => {
    const m = S.modal, { o, pl } = plOf(m); if (!pl) return;
    const used = A.PATS.filter(p => A.osPlanOfPat(p) === pl).length;
    if (!m.delAsk) { m.delAsk = 1; A.toast((used ? used + ' paciente' + (used === 1 ? ' tiene' : 's tienen') + ' este plan: van a usar la tabla general. ' : '') + 'Tocá otra vez «Quitar el plan» para confirmar.'); return; }
    o.pl = o.pl.filter(p => p !== pl); syncTxt(o); A.save(); A.acts.ospBack();
  };

  /* =====================================================================
     4. EN LA FICHA Y EN EL PACIENTE NUEVO: elegir el plan con un toque
     ===================================================================== */
  const PAIRS = [['pf_cov', 'pf_plan'], ['npC', 'npPlan']];
  function chips() {
    PAIRS.forEach(pr => {
      const c = document.getElementById(pr[0]), pi = document.getElementById(pr[1]); if (!pi) return;
      const fld = pi.closest('.field') || pi.parentNode; let box = fld.querySelector('.pl-chips');
      const o = c ? osOf0({ cov: c.value }) : null, L = A.osPlans(o);
      const key = (o ? o.id : '') + '|' + L.map(p => p.name).join(',') + '|' + pi.value;
      if (box && box._k === key) return;
      if (!L.length) { if (box) box.remove(); return; }
      if (!box) { box = document.createElement('div'); box.className = 'pl-chips'; fld.appendChild(box); }
      box._k = key; const cur = A.osPlanFor({ pl: L }, pi.value);
      box.innerHTML = '<small>Planes de ' + esc(o.sigla) + ':</small>' + L.map(p => '<button type="button" class="pl-chip' + (cur === p ? ' on' : '') + '" data-pl="' + esc(p.name) + '" aria-pressed="' + (cur === p) + '">' + esc(p.name) + '</button>').join('') +
        (pi.value && !cur ? '<span class="pl-warn">«' + esc(pi.value) + '» no es uno de los planes cargados: se usa la tabla general.</span>' : '');
    });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.pl-chip'); if (!b) return;
    const fld = b.closest('.field'), pi = fld && fld.querySelector('input'); if (!pi) return;
    pi.value = b.getAttribute('data-pl'); ['input', 'change'].forEach(t => pi.dispatchEvent(new Event(t, { bubbles: true }))); chips();
  });
  document.addEventListener('input', e => { if (e.target && /^(pf_cov|pf_plan|npC|npPlan)$/.test(e.target.id)) setTimeout(chips, 0); });
  document.addEventListener('change', e => { if (e.target && /^(pf_cov|pf_plan|npC|npPlan)$/.test(e.target.id)) setTimeout(chips, 0); });
  if (window.MutationObserver) { let t = 0; new MutationObserver(() => { clearTimeout(t); t = setTimeout(chips, 60); }).observe(document.body, { childList: true, subtree: true }); }

  const css = document.createElement('style');
  css.textContent = '.osp-list{list-style:none;margin:0 0 8px;padding:0;border:1px solid var(--line);border-radius:12px}.osp-list li{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:8px 12px;border-top:1px solid var(--line)}.osp-list li:first-child{border-top:0}.osp-n{display:flex;flex-direction:column}.osp-n small{color:var(--ink-2);font-size:.82rem}' +
    '.osp-add{display:flex;gap:8px;margin:6px 0}.osp-add input{flex:1;min-width:0;font:inherit;padding:7px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink)}' +
    '.osp-pct{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0}.osp-pct .pr-in{display:inline-flex;align-items:center;gap:2px}.osp-pct input{width:70px;font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink)}' +
    '.osp-tbl .os-th,.osp-tbl .os-tr{grid-template-columns:1fr 80px 100px 90px}.osp-g{color:var(--ink-2);font-size:.88rem;text-align:right}' +
    '.pl-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px}.pl-chips small{color:var(--ink-2);font-size:.8rem;width:100%}.pl-chip{font:inherit;font-size:.88rem;padding:5px 12px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer}.pl-chip.on{background:var(--accent);border-color:var(--accent);color:var(--accent-ink);font-weight:600}' +
    '.pl-warn{width:100%;font-size:.8rem;color:var(--warn)}@media (max-width:600px){.osp-tbl .os-th,.osp-tbl .os-tr{grid-template-columns:1fr 70px 84px 74px}}';
  document.head.appendChild(css);
})();
