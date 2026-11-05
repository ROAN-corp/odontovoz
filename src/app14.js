/* ===== 1.7: periodontograma (sondaje guiado por voz o con el dedo) y muchos más comandos de voz ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns;
  const C = window.OVCmd;
  const N = s => A.norm(s);

  /* =====================================================================
     DATOS: cada examen guarda, por pieza, 6 sitios (3 por vestibular y 3 por palatino/lingual)
     ps = profundidad de sondaje · mg = margen gingival (positivo: recesión; negativo: agrandamiento)
     NIC (nivel de inserción) = ps + mg
     ===================================================================== */
  const UP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], LO = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
  const ALL = UP.concat(LO);
  const isUp = t => t < 30, molar = t => [6, 7, 8].indexOf(t % 10) >= 0;
  const inner = t => (isUp(t) ? 'palatino' : 'lingual');
  const FACE = { v: 'vestibular', l: '' };
  const faceName = (t, f) => (f === 'v' ? 'vestibular' : inner(t));
  /* orden de los sitios en el gráfico, de izquierda a derecha (lado derecho del paciente a la izquierda) */
  const chartOrder = t => ([1, 4].indexOf(Math.floor(t / 10)) >= 0 ? ['d', 'c', 'm'] : ['m', 'c', 'd']);
  const SITE = { m: 'mesial', c: 'medio', d: 'distal' };
  /* recorrido del sondaje guiado: superior vestibular → superior palatino → inferior lingual → inferior vestibular */
  const SEQ = [].concat(UP.map(t => ({ t, f: 'v', dir: 'r' })), UP.slice().reverse().map(t => ({ t, f: 'l', dir: 'l' })), LO.map(t => ({ t, f: 'l', dir: 'r' })), LO.slice().reverse().map(t => ({ t, f: 'v', dir: 'l' })));
  const stepSites = st => { const o = chartOrder(st.t); return st.dir === 'r' ? o : o.slice().reverse(); };
  const seqIndex = (t, f) => SEQ.findIndex(s => s.t === t && s.f === f);

  const perio = pid => { const pd = A.pd(pid); if (!pd.perio) pd.perio = { exams: [] }; return pd.perio; };
  const blankTooth = () => ({ x: 0, imp: 0, mob: 0, fur: { v: 0, l: 0 }, v: { ps: {}, mg: {}, bop: {}, pl: {}, sup: {} }, l: { ps: {}, mg: {}, bop: {}, pl: {}, sup: {} } });
  const tooth = (ex, t) => ex.t[t] || (ex.t[t] = blankTooth());
  function newExam(pid, copyFrom) {
    const P = perio(pid), ex = { id: A.uid(), date: A.today(), pro: (A.PAT(pid) || {}).pro, t: {} };
    /* las piezas ausentes e implantes del examen anterior se mantienen */
    if (copyFrom) Object.keys(copyFrom.t).forEach(k => { const o = copyFrom.t[k]; if (o.x || o.imp) { const n = tooth(ex, k); n.x = o.x; n.imp = o.imp; } });
    else { const od = A.pd(pid).odon || {}; Object.keys(od).forEach(k => { const o = od[k]; if (o && (o.whole || []).some(w => /ausente|extraccion-hecha|extraida/.test(w.cond || w))) tooth(ex, k).x = 1; }); }
    P.exams.push(ex); A.touchPd(pid); return ex;
  }
  const curExam = pid => { const P = perio(pid); return P.exams.filter(e => e.id === (S.pcExam && S.pcExam[pid]))[0] || P.exams[P.exams.length - 1] || null; };
  const absent = (ex, t) => !!(ex.t[t] && ex.t[t].x);

  function stats(ex) {
    let n = 0, sps = 0, snic = 0, bop = 0, pl = 0, s4 = 0, s6 = 0, teeth = 0, miss = 0, sitesPresent = 0;
    ALL.forEach(t => {
      const o = ex.t[t]; if (o && o.x) { miss++; return; } teeth++; sitesPresent += 6;
      if (!o) return;
      ['v', 'l'].forEach(f => ['m', 'c', 'd'].forEach(s => {
        const ps = o[f].ps[s]; if (o[f].bop[s]) bop++; if (o[f].pl[s]) pl++;
        if (ps == null || ps === '') return; n++; sps += +ps; snic += +ps + (+(o[f].mg[s] || 0)); if (ps >= 4) s4++; if (ps >= 6) s6++;
      }));
    });
    const pct = x => (sitesPresent ? Math.round(x * 100 / sitesPresent) : 0);
    return { n, teeth, miss, ps: n ? (sps / n).toFixed(1).replace('.', ',') : '–', nic: n ? (snic / n).toFixed(1).replace('.', ',') : '–', bop: pct(bop), pl: pct(pl), s4, s6, done: sitesPresent ? Math.round(n * 100 / sitesPresent) : 0 };
  }

  /* =====================================================================
     CURSOR (dónde se carga lo próximo) y escritura
     ===================================================================== */
  const pc = () => (S.pc && S.pc.pid === S.fichaPid ? S.pc : (S.pc = { pid: S.fichaPid, i: 0, k: 0, field: 'ps', on: false, last: null }));
  function skipMissing(ex, i, dir) { let g = 0; while (i >= 0 && i < SEQ.length && absent(ex, SEQ[i].t) && g++ < 70) i += dir; return Math.max(0, Math.min(SEQ.length - 1, i)); }
  const curStep = () => SEQ[pc().i];
  function advance(ex, dir) { const c = pc(); c.i = skipMissing(ex, c.i + (dir || 1), dir || 1); c.k = 0; }
  function writeVal(ex, v) {
    const c = pc(), st = SEQ[c.i], site = stepSites(st)[c.k], o = tooth(ex, st.t);
    o[st.f][c.field][site] = v; c.last = { i: c.i, k: c.k, site };
    c.k++; if (c.k >= 3) { const done = c.i; advance(ex, 1); c.lastStep = done; }
    return { t: st.t, f: st.f, site };
  }
  const lastStepOf = () => { const c = pc(); return c.last ? SEQ[c.last.i] : curStep(); };

  /* =====================================================================
     PANTALLA
     ===================================================================== */
  const cls = ps => (ps == null || ps === '' ? '' : ps >= 6 ? ' p6' : ps >= 4 ? ' p4' : '');
  function strip(ex, teeth, f, label) {
    const c = pc(), st = curStep();
    let h = '<div class="pr-strip"><div class="pr-lbl">' + label + '</div><div class="pr-row">';
    teeth.forEach(t => {
      const o = ex.t[t] || blankTooth(), x = o.x, ord = chartOrder(t), isCur = c.on !== false && st && st.t === t && st.f === f;
      h += '<div class="pr-t' + (x ? ' miss' : '') + (o.imp ? ' imp' : '') + (isCur ? ' cur' : '') + '" data-t="' + t + '">';
      h += '<button class="pr-n" data-act="pcTooth" data-t="' + t + '" data-f="' + f + '">' + t + (o.imp ? '<i>I</i>' : '') + '</button>';
      if (x) { h += '<div class="pr-x">ausente</div></div>'; return; }
      ['ps', 'mg'].forEach(fl => {
        h += '<div class="pr-cells ' + fl + '">' + ord.map(s => {
          const v = o[f][fl][s], on = isCur && c.field === fl && stepSites(st)[c.k] === s;
          return '<button class="pr-c' + (fl === 'ps' ? cls(v) : '') + (on ? ' on' : '') + (fl === 'ps' && o[f].bop[s] ? ' bop' : '') + '" data-act="pcCell" data-t="' + t + '" data-f="' + f + '" data-s="' + s + '" data-fl="' + fl + '" aria-label="' + t + ' ' + faceName(t, f) + ' ' + SITE[s] + ' ' + (fl === 'ps' ? 'sondaje' : 'margen') + '">' + (v == null || v === '' ? '' : v) + '</button>';
        }).join('') + '</div>';
      });
      h += '<div class="pr-dots">' + ord.map(s => '<span>' + (o[f].bop[s] ? '<i class="d-b" title="Sangrado"></i>' : '') + (o[f].pl[s] ? '<i class="d-p" title="Placa"></i>' : '') + (o[f].sup[s] ? '<i class="d-s" title="Supuración"></i>' : '') + '</span>').join('') + '</div>';
      const fu = o.fur[f], mo = o.mob;
      h += '<div class="pr-badges">' + (molar(t) && fu ? '<b class="b-f">F' + fu + '</b>' : '') + (f === 'v' && mo ? '<b class="b-m">M' + mo + '</b>' : '') + '</div>';
      h += '</div>';
    });
    h += '</div>' + graph(ex, teeth, f) + '</div>';
    return h;
  }
  /* gráfico: línea roja = margen gingival, azul = fondo de la bolsa (respecto del límite amelocementario) */
  function graph(ex, teeth, f) {
    const W = 54, sc = 5, H = 90, y0 = 18, pts1 = [], pts2 = [];
    teeth.forEach((t, i) => {
      const o = ex.t[t], has = o && !o.x && ['m', 'c', 'd'].some(k => o[f].ps[k] != null || o[f].mg[k] != null); if (!has) { pts1.push(null); pts2.push(null); return; }
      chartOrder(t).forEach((s, k) => {
        const x = i * W + 9 + k * 18, mg = +(o[f].mg[s] || 0), ps = o[f].ps[s];
        pts1.push([x, y0 + mg * sc]); pts2.push(ps == null || ps === '' ? null : [x, y0 + (mg + +ps) * sc]);
      });
    });
    const path = pts => { let d = '', pen = false; pts.forEach(p => { if (!p) { pen = false; return; } d += (pen ? 'L' : 'M') + p[0] + ' ' + p[1] + ' '; pen = true; }); return d; };
    let g = '<svg class="pr-g" viewBox="0 0 ' + (teeth.length * W) + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">';
    for (let mm = 0; mm <= 12; mm += 2) g += '<line x1="0" x2="' + teeth.length * W + '" y1="' + (y0 + mm * sc) + '" y2="' + (y0 + mm * sc) + '" class="' + (mm === 0 ? 'cej' : 'gl') + '"/>';
    g += '<path d="' + path(pts2) + '" class="ln-ps"/><path d="' + path(pts1) + '" class="ln-mg"/></svg>';
    return g;
  }
  const PRO_ONLY = () => S.role === 'profesional';
  A.render.perioTab = pid => {
    if (!S.pc || S.pc.pid !== pid) S.pc = { pid, i: 0, k: 0, field: 'ps', on: false, last: null };
    const P = perio(pid), ex = curExam(pid), c = pc();
    let h = '<section class="card pr-card"><div class="pr-head"><h2>Periodontograma</h2><div class="row-btns">' +
      (P.exams.length > 1 ? '<select data-chg="pcExamSel" aria-label="Examen">' + P.exams.slice().reverse().map(e => '<option value="' + e.id + '"' + (ex && e.id === ex.id ? ' selected' : '') + '>' + A.fmtDMY(e.date) + '</option>').join('') + '</select>' : '') +
      '<button class="btn small" data-act="pcNew">+ Nuevo</button>' + (ex ? '<button class="btn small" data-act="pcPdf">PDF</button>' : '') + '</div></div>';
    if (!ex) {
      h += '<div class="empty">Todavía no hay periodontogramas de este paciente.<br>Tocá <b>Empezar sondaje</b> y dictá las profundidades: «tres dos tres», «sangra distal», «movilidad uno», «furca dos», «ausente»… o cargalas tocando cada casilla.</div><div class="row-btns" style="justify-content:center"><button class="btn primary" data-act="pcStart">Empezar sondaje</button></div></section>';
      return h;
    }
    const s = stats(ex);
    h += '<div class="pr-stats"><span><b>' + s.ps + '</b> mm<small>PS media</small></span><span><b>' + s.nic + '</b> mm<small>NIC medio</small></span><span class="' + (s.bop >= 30 ? 'bad' : s.bop >= 10 ? 'warn' : 'ok') + '"><b>' + s.bop + '%</b><small>Sangrado</small></span><span class="' + (s.pl >= 30 ? 'bad' : s.pl >= 15 ? 'warn' : 'ok') + '"><b>' + s.pl + '%</b><small>Placa</small></span><span><b>' + s.s4 + '</b><small>Sitios ≥ 4 mm</small></span><span class="' + (s.s6 ? 'bad' : '') + '"><b>' + s.s6 + '</b><small>Sitios ≥ 6 mm</small></span><span><b>' + s.done + '%</b><small>Sondado</small></span></div>';
    const st = curStep();
    h += '<div class="pr-guide"><div><b>' + (c.on ? 'Sondaje en curso' : 'Próximo') + ':</b> pieza ' + st.t + ' · ' + faceName(st.t, st.f) + ' · ' + SITE[stepSites(st)[c.k]] + '</div><div class="row-btns">' +
      (c.on ? '<button class="btn small" data-act="pcStop">Pausar</button>' : '<button class="btn small primary" data-act="pcStart">' + (s.n ? 'Seguir sondaje' : 'Empezar sondaje') + '</button>') +
      '<button class="btn small" data-act="pcVoice">' + A.MIC + ' Dictar</button></div></div>';
    h += '<div class="pr-scroll" id="prScroll"><div class="pr-chart">' +
      strip(ex, UP, 'v', 'Superior · vestibular') + strip(ex, UP, 'l', 'Superior · palatino') + strip(ex, LO, 'l', 'Inferior · lingual') + strip(ex, LO, 'v', 'Inferior · vestibular') + '</div></div>';
    h += '<div class="pr-legend"><span><i class="lg-mg"></i>Margen gingival</span><span><i class="lg-ps"></i>Fondo de bolsa</span><span><i class="d-b"></i>Sangrado</span><span><i class="d-p"></i>Placa</span><span><i class="d-s"></i>Supuración</span><span><b class="b-m">M</b> movilidad · <b class="b-f">F</b> furca</span></div>';
    h += '<p class="small-note">Margen: positivo es recesión y negativo es agrandamiento gingival. El nivel de inserción (NIC) se calcula solo: sondaje + margen.</p></section>';
    return h + (c.on ? keypad(ex) : '');
  };
  function keypad(ex) {
    const c = pc(), st = curStep(), o = tooth(ex, st.t), site = stepSites(st)[c.k];
    const nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    return '<div class="pr-pad" id="prPad"><div class="pp-top"><b>' + st.t + ' · ' + faceName(st.t, st.f) + ' · ' + SITE[site] + '</b>' +
      '<div class="seg pp-seg"><button data-act="pcField" data-fl="ps" aria-pressed="' + (c.field === 'ps') + '">Sondaje</button><button data-act="pcField" data-fl="mg" aria-pressed="' + (c.field === 'mg') + '">Margen</button></div></div>' +
      '<div class="pp-nums">' + (c.field === 'mg' ? '<button data-act="pcNeg" class="neg">−</button>' : '') + nums.map(n => '<button data-act="pcKey" data-v="' + n + '">' + n + '</button>').join('') + '</div>' +
      '<div class="pp-tools"><button data-act="pcMark" data-k="bop" aria-pressed="' + !!o[st.f].bop[site] + '" class="t-b">Sangra</button><button data-act="pcMark" data-k="pl" aria-pressed="' + !!o[st.f].pl[site] + '" class="t-p">Placa</button><button data-act="pcMark" data-k="sup" aria-pressed="' + !!o[st.f].sup[site] + '" class="t-s">Supura</button>' +
      '<button data-act="pcMob">Movilidad ' + (o.mob || 0) + '</button>' + (molar(st.t) ? '<button data-act="pcFur">Furca ' + (o.fur[st.f] || 0) + '</button>' : '') +
      '<button data-act="pcAbs">Ausente</button><button data-act="pcImp" aria-pressed="' + !!o.imp + '">Implante</button><button data-act="pcMove" data-d="-1" aria-label="Pieza anterior">◀</button><button data-act="pcMove" data-d="1" aria-label="Pieza siguiente">▶</button><button data-act="pcStop" class="t-x">Listo</button></div></div>';
  }
  const pid = () => S.fichaPid;
  const ex = () => curExam(pid());
  const redraw = () => {
    const sc = $('#prScroll'), x = sc ? sc.scrollLeft : 0;
    A.refresh();
    const s2 = $('#prScroll'); if (!s2) return; s2.scrollLeft = x;
    const cur = s2.querySelector('.pr-c.on') || s2.querySelector('.pr-t.cur');
    document.body.classList.toggle('pc-open', !!$('#prPad'));
    if (cur) {
      const r = cur.getBoundingClientRect(), rs = s2.getBoundingClientRect(); if (r.left < rs.left + 40 || r.right > rs.right - 40) s2.scrollLeft += r.left - rs.left - rs.width / 2;
      /* que la pieza en curso quede a la vista, arriba del teclado */
      const pad = $('#prPad'), t = cur.closest('.pr-t') || cur, r2 = t.getBoundingClientRect(), bottom = pad && innerWidth < 900 ? pad.getBoundingClientRect().top : innerHeight;
      if (r2.top < 70 || r2.bottom > bottom - 10) window.scrollBy({ top: r2.top - 90, behavior: 'smooth' });
    }
  };
  const save = () => { A.touchPd(pid()); };
  A.acts.pcNew = () => { const prev = curExam(pid()); const e = newExam(pid(), prev); (S.pcExam = S.pcExam || {})[pid()] = e.id; S.pc = { pid: pid(), i: skipMissing(e, 0, 1), k: 0, field: 'ps', on: true }; redraw(); A.toast('Periodontograma nuevo del ' + A.fmtDMY(e.date) + '.'); };
  A.acts.pcStart = () => { let e = ex(); if (!e) { e = newExam(pid()); (S.pcExam = S.pcExam || {})[pid()] = e.id; } const c = pc(); c.on = true; c.i = skipMissing(e, c.i || 0, 1); redraw(); };
  A.acts.pcStop = () => { pc().on = false; document.body.classList.remove('pc-open'); redraw(); };
  A.chg.pcExamSel = el => { (S.pcExam = S.pcExam || {})[pid()] = el.value; redraw(); };
  A.acts.pcTooth = el => { const t = +el.getAttribute('data-t'), f = el.getAttribute('data-f'), c = pc(); c.i = seqIndex(t, f); c.k = 0; c.on = true; redraw(); };
  A.acts.pcCell = el => { const t = +el.getAttribute('data-t'), f = el.getAttribute('data-f'), s = el.getAttribute('data-s'), c = pc(); if (!ex()) A.acts.pcStart(); c.i = seqIndex(t, f); c.k = stepSites(SEQ[c.i]).indexOf(s); c.field = el.getAttribute('data-fl'); c.on = true; redraw(); };
  A.acts.pcField = el => { pc().field = el.getAttribute('data-fl'); redraw(); };
  let neg = false;
  A.acts.pcNeg = () => { neg = !neg; A.toast(neg ? 'Próximo valor negativo (agrandamiento).' : 'Valor positivo.'); };
  A.acts.pcKey = el => { const e = ex(); let v = +el.getAttribute('data-v'); if (pc().field === 'mg' && neg) { v = -v; neg = false; } writeVal(e, v); save(); redraw(); };
  A.acts.pcMark = el => { const e = ex(), c = pc(), k = el.getAttribute('data-k'); let st = curStep(), site = stepSites(st)[c.k]; if (c.last && c.last.i != null && (c.k === 0 || c.last.i === c.i)) { st = SEQ[c.last.i]; site = c.last.site; } const o = tooth(e, st.t); o[st.f][k][site] = o[st.f][k][site] ? 0 : 1; save(); redraw(); };
  A.acts.pcMob = () => { const e = ex(), o = tooth(e, curStep().t); o.mob = ((o.mob || 0) + 1) % 4; save(); redraw(); };
  A.acts.pcFur = () => { const e = ex(), st = curStep(), o = tooth(e, st.t); o.fur[st.f] = ((o.fur[st.f] || 0) + 1) % 4; save(); redraw(); };
  A.acts.pcAbs = () => { const e = ex(), o = tooth(e, curStep().t); o.x = o.x ? 0 : 1; if (o.x) advance(e, 1); save(); redraw(); };
  A.acts.pcImp = () => { const e = ex(), o = tooth(e, curStep().t); o.imp = o.imp ? 0 : 1; save(); redraw(); };
  A.acts.pcMove = el => { const e = ex(), d = +el.getAttribute('data-d'), c = pc(); if (c.k > 0 && d < 0) c.k = 0; else advance(e, d); redraw(); };
  A.acts.pcVoice = () => { A.acts.pcStart(); if (A.voice && !A.voice.on && A.acts.voiceToggle) A.acts.voiceToggle(); else if (A.voice && A.voice.on) A.say('Te escucho. Dictá los valores de la ' + curStep().t + '.'); };

  /* PDF del periodontograma */
  A.acts.pcPdf = () => {
    const p = A.PAT(pid()), e = ex(), s = stats(e), o = A.pdfDoc_ && A.pdfDoc_('Periodontograma'); if (!o) return;
    o.head('Periodontograma', 'Examen del ' + A.fmtDMY(e.date) + ' · ' + (A.PRO(e.pro) || {}).name, p, '');
    o.h('Índices'); o.rows([['Profundidad de sondaje media', s.ps + ' mm'], ['Nivel de inserción clínica medio', s.nic + ' mm'], ['Sangrado al sondaje', s.bop + '% de los sitios'], ['Placa', s.pl + '% de los sitios'], ['Sitios con PS ≥ 4 mm', String(s.s4)], ['Sitios con PS ≥ 6 mm', String(s.s6)], ['Piezas presentes / ausentes', s.teeth + ' / ' + s.miss]]);
    const row = (t, f) => { const x = e.t[t]; if (!x) return ['–', '–', '']; if (x.x) return ['ausente', '', '']; const ord = chartOrder(t), v = ord.map(k => x[f].ps[k] == null ? '·' : x[f].ps[k]).join(' '), m = ord.map(k => x[f].mg[k] == null ? '·' : x[f].mg[k]).join(' '); const marks = ord.map(k => (x[f].bop[k] ? 'S' : '') + (x[f].pl[k] ? 'P' : '') + (x[f].sup[k] ? 'Su' : '')).filter(Boolean).join(','); return [v, m, [marks, x.mob && f === 'v' ? 'Mov ' + x.mob : '', x.fur[f] ? 'Furca ' + x.fur[f] : '', x.imp ? 'Implante' : ''].filter(Boolean).join(' · ')]; };
    [['Superior', UP], ['Inferior', LO]].forEach(([nm, teeth]) => {
      o.h('Arcada ' + nm.toLowerCase());
      o.table([{ h: 'Pieza', w: 14 }, { h: 'PS vest.', w: 24 }, { h: 'Margen vest.', w: 24 }, { h: 'PS ' + (nm === 'Superior' ? 'palat.' : 'ling.'), w: 24 }, { h: 'Margen ' + (nm === 'Superior' ? 'palat.' : 'ling.'), w: 24 }, { h: 'Observaciones', w: 56 }],
        teeth.map(t => { const v = row(t, 'v'), l = row(t, 'l'); return [String(t), v[0], v[1], l[0], l[1], [v[2], l[2]].filter(Boolean).join(' · ')]; }), 8);
    });
    o.p('Valores en mm, de izquierda a derecha según el gráfico (lado derecho del paciente a la izquierda). S = sangrado · P = placa · Su = supuración. Margen positivo = recesión.', 8);
    o.finish('Periodontograma ' + p.name + ' ' + e.date + '.pdf');
  };

  /* =====================================================================
     VOZ: SONDAJE DICTADO
     ===================================================================== */
  const W2N = { cero: 0, uno: 1, una: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15 };
  const BLEED = /^(?:sangra|sangrado|sangro|sangre|sangran|sangrando|sangrante|hemorragia|bop|sangrado al sondaje)$/;
  const PLAQ = /^(?:placa|placas|biofilm|placa bacteriana)$/;
  const PUS = /^(?:supura|supuracion|supurando|pus|exudado)$/;
  const SITEW = w => (/^(?:mesial|medial|mesio)$/.test(w) ? 'm' : /^(?:distal|disto)$/.test(w) ? 'd' : /^(?:medio|centro|central|centrico|al medio)$/.test(w) ? 'c' : /^(?:todo|todos|todas|toda|completo|entero|enteros|los tres|las tres|en todos)$/.test(w) ? 'all' : null);
  const FACEW = w => (/^(?:vestibular|bucal|externa|de afuera|afuera|labial|vestibulares)$/.test(w) ? 'v' : /^(?:palatino|palatina|paladar|lingual|interna|de adentro|adentro|linguales|palatinos)$/.test(w) ? 'l' : null);
  function tokens(c) {
    /* «3-2-3», «3,2,3», «tres dos tres», «323» */
    return c.replace(/[-,;:/]/g, ' ').replace(/\bmenos\s+/g, '-').split(/\s+/).filter(Boolean);
  }
  function numOf(w) { if (/^-?\d+$/.test(w)) return parseInt(w, 10); if (w[0] === '-' && W2N[w.slice(1)] != null) return -W2N[w.slice(1)]; return W2N[w] != null ? W2N[w] : null; }
  function splitDigits(w, remaining) { if (!/^\d{2,3}$/.test(w)) return [parseInt(w, 10)]; const n = parseInt(w, 10); if (w.length === 3) return w.split('').map(Number); if (n >= 13 || remaining >= 2) return w.split('').map(Number); return [n]; }
  function perioVoice(text) {
    const p = pid(); if (!p) return null;
    let c = N(text).replace(/[.!?¿¡]/g, ' ').replace(/\s+/g, ' ').trim();
    c = c.replace(/^(?:che|bueno|dale|a ver|ok|listo,)\s+/, '');
    let e = ex(), m;
    const say = (msg, extra) => Object.assign({ ok: true, msg }, extra || {});
    const done = msg => { redraw(); return say(msg); };
    /* empezar / terminar / resumen */
    if (/^(?:nuevo|empezar|empeza|empecemos|arrancar|arranca|arrancamos|comenzar|comenza|iniciar|inicia|hacer|hace(?:mos)?|vamos con)\s+(?:un |el |otro )?(?:periodontograma|sondaje|perio|registro periodontal|ficha periodontal)$/.test(c)) {
      if (/^nuevo|otro/.test(c) || !e) A.acts.pcNew(); else A.acts.pcStart();
      const st = curStep(); return say('Arrancamos. ' + st.t + ' por ' + faceName(st.t, st.f) + '. Dictame de a tres: por ejemplo «tres dos tres».');
    }
    if (!e) { if (/^(?:\d|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)/.test(c)) { A.acts.pcStart(); e = ex(); } else return null; }
    if (/^(?:terminar|termine|terminamos|termina|finalizar|fin|cerrar|cerra|guardar|guarda|listo|ya esta|eso es todo)(?: el| con el)?(?: periodontograma| sondaje| perio)?$/.test(c)) {
      pc().on = false; const s = stats(e); redraw(); return say('Periodontograma guardado. Profundidad media ' + s.ps + ' milímetros, sangrado ' + s.bop + ' por ciento' + (s.s6 ? ', ' + s.s6 + ' sitios de seis o más' : '') + '.');
    }
    if (/^(?:resumen|como (?:viene|va|esta|quedo)|indices?|que porcentaje|cuanto sangrado|porcentaje de (?:sangrado|placa))/.test(c)) { const s = stats(e); return say('Llevás ' + s.done + ' por ciento sondado. Profundidad media ' + s.ps + ', sangrado ' + s.bop + ' por ciento, placa ' + s.pl + ' por ciento, ' + s.s4 + ' sitios de cuatro o más.'); }
    if (/^(?:donde (?:estoy|estamos|voy|vamos)|en que pieza (?:estoy|estamos|voy)|que pieza sigue|cual sigue)$/.test(c)) { const st = curStep(); return say('Estás en la ' + st.t + ' por ' + faceName(st.t, st.f) + ', ' + SITE[stepSites(st)[pc().k]] + '.'); }
    /* moverse */
    if (/^(?:salte(?:a|ar|o)|saltar|salta|siguiente|siguiente pieza|pasa|pasamos|proxima|proximo|next|sigue|segui|seguimos|dale)$/.test(c)) { advance(e, 1); const st = curStep(); return done(st.t + ' ' + faceName(st.t, st.f) + '.'); }
    if (/^(?:anterior|pieza anterior|volve|volver|atras|para atras|el anterior|la anterior|volvamos)$/.test(c)) { advance(e, -1); const st = curStep(); return done('Volvimos a la ' + st.t + '.'); }
    if (/^(?:borra(?:r|lo)?|repeti(?:r)?|corregi(?:r)?|corrijo|de nuevo|otra vez|mal|me equivoque|eso no|esta mal)(?: (?:esa|esta|la|la ultima) pieza)?(?: de nuevo)?$/.test(c)) {
      const ls = pc().lastStep != null ? pc().lastStep : pc().i, st = SEQ[ls], o = tooth(e, st.t); ['ps', 'mg', 'bop', 'pl', 'sup'].forEach(k => { o[st.f][k] = {}; }); pc().i = ls; pc().k = 0; save(); return done('Borré la ' + st.t + ' por ' + faceName(st.t, st.f) + '. Dictala de nuevo.');
    }
    /* cambiar de cara: «pasá a palatino», «ahora lingual», «por vestibular» */
    if ((m = /^(?:pasa(?:r|mos)? a|vamos (?:a|con)|ahora(?: por)?|cara|por|la cara)\s+(?:la\s+)?(vestibular|bucal|palatino|palatina|lingual)$/.exec(c)) || (m = /^(vestibular|palatino|palatina|lingual)$/.exec(c))) {
      const f = FACEW(m[1]), t = curStep().t; pc().i = seqIndex(t, f); pc().k = 0; return done(t + ' por ' + faceName(t, f) + '.');
    }
    /* ir a una pieza: «ir al 36», «el 46 por lingual», «pieza 11» */
    if ((m = /^(?:(?:ir|anda|vamos|pasa|pasame|volve|segui|sigo)\s+(?:a(?:l)?\s+)?(?:la\s+)?(?:(?:pieza|diente|muela)\s+)?|(?:al?\s+)?(?:la\s+)?(?:pieza|diente|muela|el|la)\s+)(\d{2})(?:\s+(?:por\s+(?:la\s+)?)?(vestibular|bucal|palatino|palatina|lingual))?$/.exec(c)) && ALL.indexOf(+m[1]) >= 0) {
      const t = +m[1], f = m[2] ? FACEW(m[2]) : (curStep().f); pc().i = seqIndex(t, f); pc().k = 0; pc().on = true; if (absent(e, t)) { tooth(e, t).x = 0; save(); } return done(t + ' por ' + faceName(t, f) + '.');
    }
    /* ausente / implante */
    if ((m = /^(?:(?:la |el )?(\d{2})\s+)?(?:esta\s+)?(?:ausente|falta|no esta|no hay|no tiene|extraid[oa]|perdid[oa]|le falta|no existe|sin pieza)(?:\s+(?:el|la|la pieza)?\s*(\d{2}))?$/.exec(c)) || (m = /^(?:falta|no esta|no hay)\s+(?:el|la)\s+(\d{2})$/.exec(c))) {
      const t = +(m[1] || m[2]) || curStep().t; if (ALL.indexOf(t) < 0) return null; tooth(e, t).x = 1; save(); if (curStep().t === t) advance(e, 1); const st = curStep(); return done('La ' + t + ' queda ausente. Sigue la ' + st.t + '.');
    }
    if ((m = /^(?:es (?:un )?)?implante(?:\s+(?:en\s+)?(?:el|la)?\s*(\d{2}))?$/.exec(c)) || (m = /^(?:el|la)\s+(\d{2})\s+(?:es|tiene)\s+(?:un\s+)?implante$/.exec(c))) { const t = +(m[1]) || curStep().t; tooth(e, t).imp = 1; save(); return done('La ' + t + ' es un implante.'); }
    /* movilidad: «movilidad dos», «movilidad grado 1 en el 31», «el 41 tiene movilidad 2» */
    if ((m = /^(?:(?:el|la)\s+(\d{2})\s+(?:tiene\s+)?)?(?:movilidad|se mueve|mueve)(?:\s+(?:de\s+)?grado)?\s+(-?\w+)(?:\s+(?:en\s+)?(?:el|la)\s+(\d{2}))?$/.exec(c)) && numOf(m[2]) != null) {
      const t = +(m[1] || m[3]) || lastStepOf().t, v = Math.max(0, Math.min(3, numOf(m[2]))); tooth(e, t).mob = v; save(); return done('Movilidad ' + v + ' en la ' + t + '.');
    }
    /* furca: «furca dos», «lesión de furca grado 1 en el 46 por vestibular» */
    if ((m = /^(?:lesion de\s+)?(?:furca|furcacion|forca|horca|furka)(?:\s+(?:de\s+)?grado)?\s+(\w+)(?:\s+(?:en|del)\s+(?:el|la)\s+(\d{2}))?(?:\s+(?:por\s+(?:la\s+)?)?(vestibular|bucal|palatino|palatina|lingual|mesial|distal))?$/.exec(c)) && numOf(m[1]) != null) {
      const ls = lastStepOf(), t = +m[2] || ls.t, fw = m[3] ? (FACEW(m[3]) || ls.f) : ls.f, v = Math.max(0, Math.min(3, numOf(m[1])));
      if (!molar(t) && t % 10 !== 4) return say('La furca se registra en molares (y primeros premolares superiores).');
      tooth(e, t).fur[fw] = v; save(); return done('Furca ' + v + ' en la ' + t + ' por ' + faceName(t, fw) + '.');
    }
    /* «bolsa de 6 en el 36 por distal» / «el 36 por distal 6» */
    if ((m = /^(?:bolsa|sondaje|profundidad)\s+de\s+(\w+)(?:\s+(?:mm|milimetros))?(?:\s+en\s+(?:el|la)\s+(\d{2}))?(?:\s+(?:por\s+(?:la\s+)?)?(mesial|distal|medio|vestibular|palatino|palatina|lingual))*(?:\s+(?:por\s+(?:la\s+)?)?(mesial|distal|medio))?$/.exec(c)) && numOf(m[1]) != null) {
      const t = +m[2] || lastStepOf().t, words = c.split(' '), f = words.map(FACEW).filter(Boolean)[0] || (t === curStep().t ? curStep().f : 'v'), s = words.map(SITEW).filter(x => x && x !== 'all')[0] || 'c';
      tooth(e, t)[f].ps[s] = numOf(m[1]); save(); return done('Bolsa de ' + numOf(m[1]) + ' en la ' + t + ' por ' + faceName(t, f) + ', ' + SITE[s] + '.');
    }
    /* «sin sangrado», «no sangra» */
    if (/^(?:sin sangrado|no sangra|no sangro|nada de sangrado|sin placa|no hay placa)$/.test(c)) { const ls = lastStepOf(), o = tooth(e, ls.t); if (/placa/.test(c)) o[ls.f].pl = {}; else o[ls.f].bop = {}; save(); return done('Anotado.'); }

    /* «16 vestibular 3 2 3», «en el 16 por palatino 3 2 4 sangra mesial» */
    if ((m = /^(?:en\s+)?(?:el|la|pieza)?\s*(\d{2})\s+(?:por\s+(?:la\s+)?)?(vestibular|bucal|palatino|palatina|lingual)\s+(.+)$/.exec(c)) && ALL.indexOf(+m[1]) >= 0) {
      pc().i = seqIndex(+m[1], FACEW(m[2])); pc().k = 0; pc().on = true; c = m[3];
    }
    /* recesión / margen: «recesión 2 1 2», «margen menos 1» */
    let field = 'ps';
    if ((m = /^(?:recesion|retraccion|margen|margen gingival|encia|retrae)\s+(.+)$/.exec(c))) { field = 'mg'; c = m[1]; }
    /* recorrido de números y marcas */
    const tk = tokens(c); let wrote = [], marks = 0, i = 0, lastSite = null, lastTooth = null;
    const c0 = pc(), savedField = c0.field;
    if (field === 'mg') {
      /* el margen va a la cara que se acaba de sondar */
      const ls = c0.lastStep != null && c0.k === 0 ? c0.lastStep : c0.i; c0.i = ls; c0.k = 0; c0.field = 'mg';
    }
    while (i < tk.length) {
      const w = tk[i];
      const n = numOf(w);
      if (n != null) {
        const vals = /^\d+$/.test(w) ? splitDigits(w, 3 - pc().k) : [n];
        vals.forEach(v => { const r = writeVal(e, v); wrote.push(v); lastSite = r.site; lastTooth = r; });
        i++; continue;
      }
      const kind = BLEED.test(w) ? 'bop' : PLAQ.test(w) ? 'pl' : PUS.test(w) ? 'sup' : null;
      if (kind) {
        /* «sangra» sola: el sitio recién dictado; «sangra mesial / todo»: esos sitios de la pieza recién dictada */
        let sites = [], j = i + 1;
        while (j < tk.length && (SITEW(tk[j]) || /^(?:en|por|el|la|y|los|las)$/.test(tk[j]))) { const s = SITEW(tk[j]); if (s) sites.push(s); j++; }
        const ref = lastTooth || (c0.last ? { t: SEQ[c0.last.i].t, f: SEQ[c0.last.i].f, site: c0.last.site } : null) || { t: curStep().t, f: curStep().f, site: stepSites(curStep())[0] };
        const o = tooth(e, ref.t);
        if (!sites.length) sites = [lastSite && lastTooth ? ref.site : null].filter(Boolean);
        if (!sites.length || sites.indexOf('all') >= 0) sites = ['m', 'c', 'd'];
        sites.forEach(s => { o[ref.f][kind][s] = 1; marks++; });
        i = j; continue;
      }
      i++;
    }
    c0.field = field === 'mg' ? savedField : c0.field;
    if (field === 'mg' && wrote.length) { const st = lastTooth ? lastTooth : null; }
    if (!wrote.length && !marks) return null;
    save(); redraw();
    const st = curStep();
    const head = lastTooth ? lastTooth.t + (field === 'mg' ? ' margen' : '') + ': ' + wrote.join(' ') : '';
    return say((head ? head + (marks ? ', con marcas' : '') + '. ' : 'Marcado. ') + (pc().k === 0 ? 'Sigue ' + st.t + (st.f !== (lastTooth || {}).f ? ' por ' + faceName(st.t, st.f) : '') + '.' : ''), { perio: true });
  }
  A.perioVoice = perioVoice;

  /* =====================================================================
     VOZ: MUCHOS MÁS COMANDOS, COMO SE HABLA ACÁ
     ===================================================================== */
  const curPid = () => (S.tab === 'ficha' && S.fichaPid) || (S.panel && S.panel.type === 'pat' && S.panel.pid) || (S.panel && S.panel.type === 'appt' && A.apptById(S.panel.id) && A.apptById(S.panel.id).pid) || null;
  const findPat = name => { if (!name) return curPid(); const r = A.searchPats(name, 3); return r[0] ? r[0].id : null; };
  const nextApptOf = p => { const t = A.today(), now = A.nowMin(); for (let i = 0; i < 120; i++) { const d = A.add(t, i); const a = A.day(d).filter(x => x.pid === p && x.type !== 'block' && x.status !== 'cancelado' && (i > 0 || x.start + x.dur >= now)).sort((x, y) => x.start - y.start)[0]; if (a) return a; } return null; };
  const todayOf = p => A.day(A.today()).filter(x => x.pid === p && x.type !== 'block' && x.status !== 'cancelado').sort((x, y) => x.start - y.start)[0];
  const cleanN = s => (C && C.cleanName ? C.cleanName(s || '') : (s || '').trim());
  let lastSaid = '';
  const prevSay = A.say; A.say = (msg, undo) => { lastSaid = msg; return prevSay(msg, undo); };
  const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MON = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function extra(text) {
    const c = N(text).replace(/[.!?¿¡,]/g, ' ').replace(/\s+/g, ' ').trim();
    let m;
    const ok = msg => ({ ok: true, msg }), no = msg => ({ ok: false, msg });
    /* saludo y charla corta */
    if (/^(?:hola|buen(?:os)? dias?|buenas(?: tardes| noches)?|que tal|como andas|como estas|todo bien|que onda|holis)$/.test(c)) { const n = A.day(A.today()).filter(a => a.type !== 'block' && a.status !== 'cancelado').length; return ok('¡Hola! Hoy tenés ' + n + ' turno' + (n === 1 ? '' : 's') + '. ¿En qué te ayudo?'); }
    if (/^(?:gracias|muchas gracias|genial|barbaro|joya|de diez|excelente|buenisimo|perfecto gracias|mil gracias|graciela)$/.test(c)) return ok('¡De nada! Cuando quieras.');
    if (/^(?:me escuchas|estas ahi|estas|me oyes|hola hay alguien|funcionas)$/.test(c)) return ok('Sí, te escucho.');
    if (/^(?:repeti(?:r|lo)?|que dijiste|no te escuche|perdon que|como|otra vez que dijiste)$/.test(c)) return ok(lastSaid || 'Todavía no dije nada.');
    if (/^(?:que hora es|me decis la hora|hora)$/.test(c)) { const d = new Date(); return ok('Son las ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0') + '.'); }
    if (/^(?:que dia es hoy|que fecha es(?: hoy)?|a cuanto estamos|que dia es)$/.test(c)) { const d = new Date(); return ok('Hoy es ' + DOW[d.getDay()] + ' ' + d.getDate() + ' de ' + MON[d.getMonth()] + '.'); }
    /* periodontograma desde cualquier lado */
    if ((m = /^(?:abri(?:r|me)?|mostra(?:r|me)?|ver|ir al?|anda al?|vamos al?|pasa(?:r|me)? al?|el|la)?\s*(?:el\s+|la\s+)?(?:periodontograma|perio|ficha periodontal|carta periodontal|registro periodontal|sondaje|periodoncia)(?:\s+(?:de|del|de la|para)\s+(.+))?$/.exec(c))) {
      const p = findPat(cleanN(m[1] || '')); if (!p) return no('¿De qué paciente? Decí «periodontograma de» y el nombre.');
      A.openFicha(p, 'perio'); return ok('Periodontograma de ' + A.PAT(p).name + '. Decí «empezar sondaje» o dictá directo.');
    }
    /* cuántos quedan, cuánto cobré */
    if (/^(?:cuantos (?:me )?(?:quedan|faltan)|cuantos pacientes (?:me )?(?:quedan|faltan)|cuanto me falta(?: para terminar)?|cuantos turnos (?:me )?quedan)$/.test(c)) { const now = A.nowMin(), l = A.day(A.today()).filter(a => a.type !== 'block' && ['cancelado', 'atendido', 'ausente'].indexOf(a.status) < 0 && a.start + a.dur > now); return ok(l.length ? 'Te quedan ' + l.length + ' paciente' + (l.length > 1 ? 's' : '') + '. El próximo es ' + A.PAT(l[0].pid).name + ' a las ' + A.mm(l[0].start) + '.' : 'No te queda nadie más hoy.'); }
    if (/^(?:cuanto (?:cobre|cobramos|hice|hicimos|facture|entro|junte)(?: hoy)?|caja de hoy|como viene la caja|cuanta plata (?:entro|hay)(?: hoy)?)$/.test(c)) {
      let tot = 0, k = 0; A.PATS.forEach(p => { const pd = A.S.pd[p.id]; if (!pd || !pd.ledger) return; pd.ledger.forEach(e => { if (e.type === 'pago' && !e.voided && e.date === A.today()) { tot += e.amount; k++; } }); });
      return ok(k ? 'Hoy cobraste ' + A.money(tot) + ' en ' + k + ' cobro' + (k > 1 ? 's' : '') + '.' : 'Hoy todavía no registraste cobros.');
    }
    /* cuándo viene alguien */
    if ((m = /^(?:a que hora (?:viene|tiene turno|le toca)|cuando (?:viene|tiene turno|le toca|vuelve)|cuando es el turno de|que dia viene|tiene turno)\s+(.+)$/.exec(c))) {
      const p = findPat(cleanN(m[1])); if (!p) return no('No encontré a «' + m[1] + '».');
      const a = nextApptOf(p); return ok(a ? A.PAT(p).name + ' viene el ' + A.fmtLong(a.date) + ' a las ' + A.mm(a.start) + '.' : A.PAT(p).name + ' no tiene turnos próximos.');
    }
    /* hueco / lugar libre */
    if ((m = /^(?:tengo|hay|queda|quedan)\s+(?:algun\s+)?(?:lugar|hueco|espacio|turno libre|turnos libres|horario libre|lugarcito)(?:\s+(?:para|el|la|este|esta))?\s*(.*)$/.exec(c)) || (m = /^(?:turnos libres|horarios libres|huecos|lugares libres)(?:\s+(?:para|el|del|de la|de))?\s*(.*)$/.exec(c))) {
      const d = C.parseDate((m[1] || 'hoy').trim() || 'hoy', A.today()).value || A.today(), p = A.visPros()[0], fs = A.freeSlots ? A.freeSlots(p, d) : [];
      if (A.acts.agFree) { S.modal = { type: 'freeSlots', date: d, pro: p.id }; A.renderModal(); }
      return ok(fs.length ? 'El ' + A.fmtLong(d) + ' tenés ' + fs.length + ' turno' + (fs.length > 1 ? 's' : '') + ' libre' + (fs.length > 1 ? 's' : '') + ', el primero a las ' + A.mm(fs[0]) + '.' : 'El ' + A.fmtLong(d) + ' no te quedan turnos libres.');
    }
    /* atendido: «ya atendí a Pérez», «terminé con Pérez», «listo con este» */
    if ((m = /^(?:ya\s+)?(?:atendi|lo atendi|la atendi|termine con|listo con|ya se fue|se fue|despache|despachado|atendido|atendida|terminamos con)\s*(?:a\s+|al\s+|la\s+)?(.*)$/.exec(c)) && !/^(?:la consulta|el dictado)$/.test(m[1])) {
      const nm = cleanN(m[1]), p = nm && !/^(?:este|esta|el|ella|el paciente|la paciente)$/.test(nm) ? findPat(nm) : (curPid() || (A.currentAppt && A.currentAppt() || {}).pid);
      const a = p ? todayOf(p) : (A.currentAppt && A.currentAppt()); if (!a) return no('No encontré un turno de hoy para marcar como atendido.');
      A.setStatus(a.id, 'atendido'); return ok(A.PAT(a.pid).name + ': atendido.');
    }
    /* en atención: «está en el sillón», «ya pasó Pérez» */
    if ((m = /^(?:ya\s+)?(?:paso|esta en el sillon|esta en el consultorio|lo estoy atendiendo|la estoy atendiendo|en atencion)\s*(?:a\s+)?(.*)$/.exec(c))) {
      const p = findPat(cleanN(m[1])) || curPid(); const a = p && todayOf(p); if (!a) return no('No encontré su turno de hoy.');
      A.setStatus(a.id, 'en-atencion'); return ok(A.PAT(a.pid).name + ' en atención.');
    }
    /* mover un turno: «pasá el turno de Pérez al jueves a las 5», «corré a Gómez para las 18» */
    if ((m = /^(?:pasa(?:r|le)?|move(?:r|le)?|mueve|corre(?:r|le)?|cambia(?:r|le)?|reprograma(?:r|le)?|posterga(?:r|le)?|adelanta(?:r|le)?)\s+(?:el\s+)?(?:turno\s+)?(?:de|a|del|de la)?\s*(.+?)\s+(?:para|al|a las|a la|a|el)\s+(.+)$/.exec(c))) {
      const p = findPat(cleanN(m[1])); if (!p) return no('No encontré a «' + m[1] + '».');
      const a = nextApptOf(p); if (!a) return no(A.PAT(p).name + ' no tiene un turno próximo para mover.');
      const rest = ' ' + m[2] + ' ', t = C.parseTime(rest), d = C.parseDate(t.rest || rest, A.today());
      if (t.value == null && !d.value) return no('¿Para qué día u hora lo paso? Por ejemplo: «pasá el turno de Pérez al jueves a las 17».');
      A.tryMove(a.id, { date: d.value || a.date, start: t.value != null ? t.value : a.start });
      if (S.modal && S.modal.type === 'conflict') return ok('Ese horario se superpone con otro turno. Elegí en pantalla qué hacer.');
      const b = A.apptById(a.id); return ok('Turno de ' + A.PAT(p).name + ': ' + A.fmtLong(b.date) + ' a las ' + A.mm(b.start) + '.');
    }
    /* WhatsApp: «mandale un whatsapp a Pérez», «recordale el turno a Gómez» */
    if ((m = /^(?:manda(?:le|r)?|envia(?:le|r)?|escribi(?:le|r)?|recorda(?:le|r)?)\s+(?:un\s+)?(?:whatsapp|wasap|guasap|mensaje|recordatorio|el turno|el recordatorio)?\s*(?:a|al|a la|de)?\s*(.+)$/.exec(c)) && /whatsapp|wasap|guasap|mensaje|recorda/.test(c)) {
      const p = findPat(cleanN(m[1].replace(/^(?:el turno|del turno)\s+(?:a|de)\s+/, ''))); if (!p) return no('No encontré a ese paciente.');
      const a = nextApptOf(p); if (a && A.acts.waAppt) { A.acts.waAppt({ getAttribute: () => a.id }); return ok('Abro WhatsApp con el recordatorio para ' + A.PAT(p).name + '.'); }
      return no(A.PAT(p).name + ' no tiene un turno próximo para recordarle.');
    }
    /* llamar */
    if ((m = /^(?:llama(?:le|r)?|llamalo|llamala|marcale)\s+(?:a\s+)?(.+)$/.exec(c))) { const p = findPat(cleanN(m[1])); if (!p || !A.PAT(p).phone) return no('No tengo el teléfono de ese paciente.'); location.href = 'tel:' + String(A.PAT(p).phone).replace(/[^\d+]/g, ''); return ok('Llamando a ' + A.PAT(p).name + '.'); }
    /* sinónimos que pasan a frases que ya entiende el asistente */
    const MAP = [
      [/^(?:que tengo manana|como viene manana|turnos de manana|quien viene manana|agenda de manana|que hay manana|como estoy manana)$/, 'agenda de mañana'],
      [/^(?:que tengo pasado manana|como viene pasado manana)$/, 'agenda de pasado mañana'],
      [/^(?:que tengo el|como viene el|quien viene el)\s+(lunes|martes|miercoles|jueves|viernes|sabado)$/, 'agenda del $1'],
      [/^(?:mostrame|abri|ver)?\s*(?:la )?semana$/, 'agenda de la semana'],
      [/^(?:quien (?:esta|hay) en (?:la )?sala(?: de espera)?|quien esta esperando|hay alguien esperando)$/, '__sala'],
      [/^(?:pasa(?:me)? al siguiente|hace pasar al (?:que sigue|siguiente|proximo)|el que sigue|que pase el siguiente|que pase el que sigue|llama al siguiente)$/, 'atender al siguiente'],
      [/^(?:quien viene ahora|a quien tengo ahora|quien me toca ahora|a quien le toca)$/, 'quien sigue']
    ];
    for (const [re, to] of MAP) {
      const mm = re.exec(c); if (!mm) continue;
      if (to === '__sala') { const l = A.day(A.today()).filter(a => a.status === 'llego').sort((x, y) => x.start - y.start); return ok(l.length ? 'En la sala: ' + l.map(a => A.PAT(a.pid).name + ' (' + A.mm(a.start) + ')').join(', ') + '.' : 'No hay nadie en la sala de espera.'); }
      return { rewrite: to.replace('$1', mm[1] || '') };
    }
    return null;
  }

  /* respuesta cuando no entiende: sugerencias según dónde estás */
  function hint() {
    if (S.tab === 'ficha' && S.fichaTab === 'perio') return 'Probá: «tres dos tres», «sangra distal», «movilidad uno», «furca dos», «ausente», «saltear», «ir al 36 por palatino» o «terminar».';
    if (S.tab === 'ficha' && S.fichaTab === 'odon') return 'Probá: «caries en el 36 por oclusal», «tiene una resina en el 16 por vestibular», «extracción del 48» o «corona en el 21».';
    if (S.tab === 'ficha') return 'Probá: «motivo de consulta…», «alergia a la penicilina», «hice una limpieza», «abrí el odontograma» o «periodontograma».';
    if (S.tab === 'agenda') return 'Probá: «turno para Pérez el jueves a las 10», «llegó Gómez», «pasá el turno de Pérez al viernes», «¿tengo lugar mañana?».';
    return 'Probá: «¿quién sigue?», «agendá a Pérez mañana a las 10», «abrí la ficha de Gómez», «¿cuántos me quedan?» o «qué puedo decir».';
  }
  const execPrev = A.cmd.exec;
  A.cmd.exec = (text, o) => {
    const ro = A.cloud && A.cloud.readonly;
    if (!ro && S.tab === 'ficha' && S.fichaTab === 'perio' && S.fichaPid) { try { const r = perioVoice(text); if (r) return r; } catch (e) { if (A.logError) A.logError('perio', e); } }
    let r = null; try { r = extra(text); } catch (e) { r = null; if (A.logError) A.logError('voz', e); }
    if (r && r.rewrite) return execPrev(r.rewrite, o);
    if (r) return r;
    const res = execPrev(text, o);
    if (res && !res.ok && !res.odon && /^No entend/.test(res.msg || '')) res.msg = 'No te entendí del todo. ' + hint();
    return res;
  };

  /* el teclado solo vive dentro del periodontograma */
  const afterPrev = A.afterRefresh; A.afterRefresh = () => { if (afterPrev) afterPrev(); const open = !!$('#prPad') && S.tab === 'ficha' && S.fichaTab === 'perio'; document.body.classList.toggle('pc-open', open); if (!open && S.pc && !(S.tab === 'ficha' && S.fichaTab === 'perio')) S.pc.on = false; };

  /* ---------- estilos ---------- */
  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '.pr-card{padding-bottom:12px}.pr-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.pr-head h2{margin:0}.pr-head select{min-height:36px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);padding:0 8px}' +
    '.pr-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(84px,1fr));gap:6px;margin:12px 0}.pr-stats span{border:1px solid var(--line);border-radius:12px;padding:6px 9px;line-height:1.25;display:flex;flex-direction:column;font-size:13px;color:var(--ink-2)}.pr-stats b{font-size:18px;color:var(--ink)}@media (max-width:600px){.pr-stats{grid-template-columns:repeat(4,1fr)}.pr-stats span{font-size:11.5px}.pr-stats small{font-size:11px}}.pr-stats small{font-size:12px}.pr-stats .ok b{color:var(--st-done,#2a7a4b)}.pr-stats .warn b{color:#a86f00}.pr-stats .bad b{color:var(--st-no,#c0392b)}' +
    '.pr-guide{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;background:var(--accent-soft);border-radius:12px;padding:10px 12px;margin-bottom:10px;font-size:15px}' +
    '.pr-scroll{overflow-x:auto;border:1px solid var(--line);border-radius:12px;-webkit-overflow-scrolling:touch}.pr-chart{min-width:900px;padding:6px 8px}' +
    '.pr-strip{margin:6px 0 10px}.pr-lbl{font-size:12.5px;font-weight:700;color:var(--ink-2);margin:4px 2px}.pr-row{display:grid;grid-template-columns:repeat(8,1fr) 6px repeat(8,1fr);gap:0}.pr-row>.pr-t:nth-child(9){grid-column:10}' +
    '.pr-t{display:flex;flex-direction:column;align-items:stretch;gap:2px;padding:2px;border-radius:8px}.pr-t.cur{background:var(--accent-soft);box-shadow:inset 0 0 0 2px var(--accent)}.pr-t.miss{opacity:.45}' +
    '.pr-n{border:0;background:transparent;font:700 12px/1.4 inherit;color:var(--ink);cursor:pointer;padding:0}.pr-n i{font-style:normal;color:#fff;background:#2457c5;border-radius:4px;padding:0 3px;margin-left:2px;font-size:10px}.pr-x{font-size:11px;color:var(--ink-2);text-align:center;padding:14px 0}' +
    '.pr-cells{display:grid;grid-template-columns:repeat(3,1fr);gap:1px}.pr-c{min-width:0;height:26px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:700 13px inherit;padding:0;border-radius:4px;cursor:pointer}.pr-cells.mg .pr-c{height:22px;font-weight:500;font-size:12px;color:var(--ink-2)}' +
    '.pr-c.p4{background:#fdf0d0;border-color:#e2b34d;color:#7a5200}.pr-c.p6{background:#f9d6d2;border-color:#d9473f;color:#8a1f1a}.pr-c.bop{box-shadow:inset 0 -3px 0 #d9473f}.pr-c.on{outline:3px solid var(--accent);outline-offset:-1px;background:#fff}' +
    '.pr-dots{display:grid;grid-template-columns:repeat(3,1fr);height:9px}.pr-dots span{display:flex;justify-content:center;gap:1px}.pr-dots i,.pr-legend i.d-b,.pr-legend i.d-p,.pr-legend i.d-s{width:7px;height:7px;border-radius:50%;display:inline-block}.d-b{background:#d9473f}.d-p{background:#2457c5}.d-s{background:#d4a017}' +
    '.pr-badges{display:flex;gap:2px;justify-content:center;min-height:14px}.pr-badges b,.pr-legend b{font-size:10px;border-radius:4px;padding:0 3px;color:#fff}.b-m{background:#7b4fc4}.b-f{background:#c2571a}' +
    '.pr-g{width:100%;height:76px;display:block;margin-top:2px}.pr-g .cej{stroke:var(--ink-2);stroke-width:1}.pr-g .gl{stroke:var(--line);stroke-width:.6}.pr-g .ln-mg{fill:none;stroke:#d9473f;stroke-width:2}.pr-g .ln-ps{fill:none;stroke:#2457c5;stroke-width:2}' +
    '.pr-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:var(--ink-2);margin-top:8px}.pr-legend span{display:inline-flex;align-items:center;gap:5px}.lg-mg,.lg-ps{width:16px;height:3px;display:inline-block}.lg-mg{background:#d9473f}.lg-ps{background:#2457c5}' +
    '.pr-pad{position:fixed;left:0;right:0;bottom:0;z-index:95;background:var(--surface);border-top:1px solid var(--line);box-shadow:0 -10px 30px rgba(0,0,0,.15);padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:8px}' +
    '.pp-top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.pp-top b{font-size:15px}.pp-seg{margin:0}' +
    '.pp-nums{display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:6px}.pp-nums button{height:46px;border-radius:10px;border:1px solid var(--line);background:var(--bg,#f2f6f5);color:var(--ink);font:700 19px inherit;cursor:pointer}.pp-nums button:active{background:var(--accent-soft)}.pp-nums .neg{background:#fff4e0}' +
    '.pp-tools{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.pp-tools button{flex:0 0 auto;min-height:40px;padding:0 12px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:600 14px inherit;cursor:pointer}.pp-tools button[aria-pressed="true"]{color:#fff}.pp-tools .t-b[aria-pressed="true"]{background:#d9473f;border-color:#d9473f}.pp-tools .t-p[aria-pressed="true"]{background:#2457c5;border-color:#2457c5}.pp-tools .t-s[aria-pressed="true"]{background:#d4a017;border-color:#d4a017}.pp-tools .t-x{background:var(--accent);border-color:var(--accent);color:#fff}' +
    'body.pc-open #view-ficha{padding-bottom:300px}@media (max-width:600px){.pp-nums{grid-template-columns:repeat(7,1fr);gap:5px}.pp-nums button{height:40px;font-size:17px}.pr-pad{gap:6px;padding-top:8px}}body.pc-open .vdock{bottom:calc(220px + env(safe-area-inset-bottom,0px))!important}' +
    '@media (min-width:900px){.pr-pad{left:auto;right:16px;bottom:16px;width:520px;border-radius:16px;border:1px solid var(--line)}body.pc-open #view-ficha{padding-bottom:20px}}' +
    '</style>');
})();
