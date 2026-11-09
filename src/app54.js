/* ===== 1.41: evoluciones (sobre todo las traídas de otro sistema) → odontograma: lo hecho en rojo, lo que queda por hacer en azul ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, MF = A.modalFns, P = window.OdontoParser;
  const N = s => (A.norm ? A.norm(s) : String(s || '').toLowerCase());
  const TOOTH = /\b([1-4][1-8]|[5-8][1-5])\b/g;
  /* lo que indica que es para la próxima (azul) */
  const FUT = /\b(prox(ima|imo)?|la que viene|siguiente (turno|sesion|vez)|proximo turno|pendiente|falta(n|ria)?|queda(n)? (por )?hacer|a realizar|por realizar|hay que|planific\w*|presupuest\w*|a futuro|despues|luego|indic(o|amos|ado) (hacer|realizar)|sugiero|derivar)\b/;
  /* palabras que los odontólogos usan y el intérprete no conoce, o que sobran */
  const SYN = [
    [/\b(restauracion(?:es)?|restaurac|resinas?|arreglos?|obturacion(?:es)?|ob\.?)\b/g, 'obturacion '],
    [/\b(amalgamas?)\b/g, 'amalgama '],
    [/\b(composites?|comp\.?)\b/g, 'composite '],
    [/\b(le\s+)?(saque|extraje|sacamos|exodoncias?( de)?|extraccion(?:es)?)\b/g, 'extraccion '],
    [/\b(tratamiento de conducto|tto\.? de conducto|conducto|endo)\b/g, 'endodoncia '],
    [/\b(perno muñon|perno munon)\b/g, 'perno '],
    [/\b(coronas?)\b/g, 'corona '],
    [/\b(sellantes?|sellador(?:es)?)\b/g, 'sellador '],
    [/\b(hice|hicimos|realice|realizamos|se hizo|se hicieron|se realizo|se realizaron|le hice|le hicimos|termine|terminamos|hecho|hecha|realizado|realizada)\b/g, ' '],
    [/\b(hacer|realizar|seguir con|continuar con|ver|controlar)\b/g, ' '],
    [/\b(prox(ima|imo)?|proximo turno|la que viene|pendiente|falta(n|ria)?|queda(n)?( por)?|a realizar|por realizar|hay que|planificad[oa]|a futuro|despues|luego)\b/g, ' '],
    [/\b(no especifi\w*|sin especificar)( la)? caras?\b/g, ' '],
    [/\b(solo|solamente|tambien|ademas|la|las|el|los|en|de|del|pieza|piezas|diente|dientes|vez)\b/g, ' ']
  ];
  let CK0 = null;
  const CKs = () => CK0 || (CK0 = Object.keys((P && P.COND_META) || {}).filter(c => c !== 'sano').map(c => [new RegExp('\\b' + c + '\\b'), c]));
  const CK = { filter: f => CKs().filter(f) };
  const FACE_ONLY = c => !!(P && P.COND_META && P.COND_META[c] && P.COND_META[c].scope === 'face');
  const okCond = c => !!(P && P.COND_META && P.COND_META[c]) && c !== 'sano';

  /* lee un texto y devuelve marcas para el odontograma: [{teeth:[n], faces, cond, status}] */
  A.evoOdon = text => {
    if (!P) return [];
    const out = [], seen = {};
    let last = null;
    const add = (cond, n, faces, fut) => {
      if (cond === 'extraccion') cond = fut ? 'extraccion' : 'extraido';
      if (!okCond(cond)) return;
      const pat = (P.COND_META[cond] || {}).def === 'patologia';   /* caries, fractura…: lo que se vio, no se planifica */
      const status = pat ? 'patologia' : fut ? 'planificado' : 'realizado';
      const k = cond + n + (faces || []).join('') + status; if (seen[k]) return; seen[k] = 1;
      let fs = faces && faces.length ? faces.slice() : null, guess = null;
      /* sin cara: el odontograma solo dibuja estas prácticas en una cara. Va a la oclusal (o vestibular en los anteriores) y se avisa */
      if (!fs && FACE_ONLY(cond)) { guess = n % 10 >= 4 ? 'O' : 'V'; fs = [guess]; }
      out.push({ type: 'mark', teeth: [n], faces: fs, cond, status, nofaces: guess });
    };
    String(text || '').replace(/^\[Sistema anterior\]\s*/, '').split(/[.;\n]+/).forEach(sent => {
      const raw = N(sent); if (!raw.trim()) return;
      let fut = false;   /* desde que aparece «la próx», «queda», «falta»… lo que sigue en la oración es para la próxima */
      raw.split(/,|\s+y\s+(?=[a-z])/).forEach(seg0 => {
        if (FUT.test(seg0)) fut = true;
        let seg = ' ' + seg0 + ' '; SYN.forEach(x => { seg = seg.replace(x[0], x[1]); });
        seg = seg.replace(/\s+/g, ' ').trim(); if (!seg) return;
        const nums = (seg.match(TOOTH) || []).map(Number);
        let r = null; try { r = P.parse(seg, { lastTooth: null }); } catch (e) { r = null; }
        const acts = r ? r.actions.filter(a => a.type === 'mark' && a.cond && okCond(a.cond === 'extraccion' ? 'extraido' : a.cond)) : [];
        if (acts.length) {
          const got = [];
          acts.forEach(a => { a.teeth.forEach(n => { add(a.cond, n, a.faces, fut); got.push(n); }); last = a; });
          nums.filter(n => got.indexOf(n) < 0).forEach(n => add(last.cond, n, last.faces, fut));   /* «obturación 25 y 26» */
          return;
        }
        /* la práctica sin cara («obturación 25»): el intérprete la descarta; va a la pieza entera para completarla después */
        const kw = nums.length && CK.filter(c => c[0].test(seg))[0];
        if (kw) { nums.forEach(n => add(kw[1], n, null, fut)); last = { cond: kw[1], faces: null }; return; }
        /* solo piezas («la próx hacer solo en 24», «falta 45 y 44»): repite la práctica anterior */
        if (nums.length && last && /^(?:\d{2}|y|e|\s)+$/.test(seg)) nums.forEach(n => add(last.cond, n, null, fut));
      });
    });
    return out;
  };

  /* aplica las evoluciones de un paciente (de la más vieja a la más nueva), una sola vez cada una */
  const pending = pd => (pd.notes || []).filter(n => n && n.imp && !n.odon && !n.void);
  /* Qué se marca de cada evolución vieja:
     - lo hecho (restauraciones, endodoncias, coronas, extracciones) siempre: sigue estando en la boca;
     - lo pendiente y lo visto (caries, «la próx…») solo si es reciente (S.evoMonths, 12 meses por defecto): lo viejo seguramente ya se resolvió;
     - repetir lo mismo en la misma pieza y cara no suma nada: la marca se reemplaza, no se apila;
     - la cara supuesta (sin cara) se descarta si esa pieza tiene la misma práctica con la cara dicha. */
  const cutoff = () => { const mo = S.evoMonths == null ? 12 : +S.evoMonths; if (!mo) return ''; const d = new Date(); d.setMonth(d.getMonth() - mo); return d.toISOString().slice(0, 10); };
  A.evoPlan = pid => {
    const pd = (A.S.pd || {})[pid]; if (!pd) return { list: [], acts: [], old: 0 };
    const list = pending(pd).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const cut = cutoff(); let acts = [], old = 0;
    list.forEach(n => A.evoOdon(n.text).forEach(a => {
      if (cut && String(n.date || '') < cut && a.status !== 'realizado') { old++; return; }
      a.date = n.date; acts.push(a);
    }));
    const real = {}; acts.forEach(a => { if (a.faces && !a.nofaces) real[a.teeth[0] + a.cond] = 1; });
    acts = acts.filter(a => !(a.nofaces && real[a.teeth[0] + a.cond]));
    /* la misma marca repetida (misma pieza, cara y práctica) cuenta una vez: queda el estado de la última */
    const last = {}; acts.forEach((a, i) => { last[a.teeth[0] + '|' + a.cond + '|' + (a.faces || []).join('')] = i; });
    acts = acts.filter((a, i) => last[a.teeth[0] + '|' + a.cond + '|' + (a.faces || []).join('')] === i);
    return { list, acts, old };
  };
  A.evoApply = (pid, dry) => {
    const pl = A.evoPlan(pid), pd = (A.S.pd || {})[pid];
    let done = 0, plan = 0;
    pl.acts.forEach(a => { if (a.status === 'planificado') plan++; else done++; if (!dry) { const b = Object.assign({}, a); delete b.nofaces; delete b.date; A.applyAction(pd, b); } });
    if (!dry) { pl.list.forEach(n => { n.odon = 1; }); if (pl.list.length) { if (!pd.odonDate) pd.odonDate = A.today(); A.touchPd(pid); } }
    return { marks: pl.acts.length, done, plan, notes: pl.list.length, old: pl.old, acts: pl.acts };
  };
  const withImp = () => A.PATS.filter(p => { const pd = (A.S.pd || {})[p.id]; return pd && pending(pd).length; });
  A.evoApplyAll = dry => {
    const tot = { pats: 0, marks: 0, done: 0, plan: 0, notes: 0, old: 0, ex: [] };
    withImp().forEach(p => {
      const r = A.evoApply(p.id, dry); if (r.marks) tot.pats++; tot.marks += r.marks; tot.done += r.done; tot.plan += r.plan; tot.notes += r.notes; tot.old += r.old;
      if (dry && r.marks && tot.ex.length < 4) tot.ex.push({ name: (p.last + ' ' + p.first).trim(), n: r.notes, acts: r.acts });
    });
    return tot;
  };

  /* ---------- pantalla: revisar y confirmar ---------- */
  const actTxt = a => a.teeth.join(', ') + ' · ' + ((P.COND_META[a.cond] || {}).label || a.cond) + (a.faces && !a.nofaces ? ' ' + a.faces.join('') : '') + (a.nofaces ? ' (sin cara: en ' + (a.nofaces === 'O' ? 'oclusal' : 'vestibular') + ')' : '');
  const chip = a => '<span class="ev-chip ' + (a.status === 'planificado' ? 'plan' : 'done') + '">' + esc(actTxt(a)) + '</span>';
  MF.evoOdon = m => {
    const t = m.t;
    let b = '<p>Leo las evoluciones que trajiste del sistema anterior y marco en el odontograma lo que encuentro: <b class="ev-r">en rojo lo hecho</b> y <b class="ev-b">en azul lo que dice para la próxima</b> («la próx», «queda», «falta», «hay que»…).</p>';
    const mo = S.evoMonths == null ? 12 : +S.evoMonths;
    b += '<label class="ev-per">Caries y pendientes («la próx…»): <select data-chg="evoMonths">' + [[6, 'de los últimos 6 meses'], [12, 'del último año'], [24, 'de los últimos 2 años'], [0, 'de cualquier fecha']].map(o => '<option value="' + o[0] + '"' + (o[0] === mo ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label>';
    if (t.old) b += '<p class="hint">' + t.old + ' caries o pendientes más viejos no se marcan (seguramente ya se resolvieron). Siguen en la historia clínica.</p>';
    if (!t.marks) b += '<p class="hint">No encontré piezas ni prácticas para marcar en las evoluciones que faltan pasar' + (t.notes ? ' (' + t.notes + ')' : '') + '. Las evoluciones siguen igual en la historia clínica.</p>';
    else {
      b += '<div class="stats"><div class="stat"><b>' + t.pats + '</b>pacientes</div><div class="stat"><b>' + t.done + '</b>hechas o vistas</div><div class="stat"><b>' + t.plan + '</b>para la próxima</div></div>';
      if (t.ex.length) b += '<h4 class="ev-h">Ejemplos: cómo queda el odontograma</h4>' + t.ex.map(e => '<div class="ev-ex"><b>' + esc(e.name) + '</b><q>' + e.n + (e.n === 1 ? ' evolución' : ' evoluciones') + '</q><div>' + e.acts.map(chip).join(' ') + '</div></div>').join('');
      b += '<p class="hint">El odontograma muestra cómo está la boca hoy, no la lista de todo lo que se hizo (eso queda en la historia clínica con su fecha). Por eso: lo repetido en la misma pieza y cara se marca una sola vez; lo hecho hace años sí se marca (sigue en boca); y si no dice la cara, uso la oclusal (o vestibular adelante) salvo que esa pieza ya tenga la práctica con cara.</p>';
    }
    return A.modalShell('Evoluciones al odontograma', b, '<button class="btn" data-act="closeModal">Cancelar</button>' + (t.marks ? '<button class="btn primary" data-act="evoGo">Marcar en los odontogramas</button>' : ''));
  };
  A.chg.evoMonths = el => { S.evoMonths = +el.value; S.modal = { type: 'evoOdon', t: A.evoApplyAll(true) }; A.renderModal(); };
  A.acts.evoOpen = () => { S.modal = { type: 'evoOdon', t: A.evoApplyAll(true) }; A.renderModal(); };
  A.acts.evoGo = () => { const t = A.evoApplyAll(false); A.saveNow && A.saveNow(); S.modal = null; A.renderModal(); A.refresh(); A.toast('Listo: ' + t.marks + ' marcas en ' + t.pats + ' odontogramas (' + t.plan + ' para la próxima).'); };

  /* al terminar una mudanza, se ofrece enseguida */
  const prevGo = A.acts.impGo;
  if (prevGo) A.acts.impGo = function () { const r = prevGo.apply(this, arguments); try { const m = S.modal; if (m && m.type === 'importDone') { const t = A.evoApplyAll(true); if (t.marks) m.evo = t; A.renderModal(); } } catch (e) { /* nada */ } return r; };
  const prevDone = MF.importDone;
  if (prevDone) MF.importDone = function (m) {
    let h = prevDone.apply(this, arguments);
    if (m.evo) h = h.replace('</div>', '</div><div class="ev-offer"><b>¿Paso las evoluciones al odontograma?</b><span>Encontré ' + m.evo.marks + ' marcas en ' + m.evo.pats + ' pacientes (' + m.evo.plan + ' para la próxima).</span><button class="btn primary small" data-act="evoOpen">Revisar y marcar</button></div>');
    return h;
  };
  /* y queda a mano en la ventana de la mudanza */
  const prevImp = MF.importPats;
  if (prevImp) MF.importPats = function (m) {
    let h = prevImp.apply(this, arguments);
    if (m && !m.rows && withImp().length) h = h.replace(/(<\/p>)/, '$1<p><button class="btn small" data-act="evoOpen">Pasar evoluciones viejas al odontograma</button></p>');
    return h;
  };

  const css = document.createElement('style');
  css.textContent = '.ev-r{color:#c62828}.ev-b{color:#1565c0}' +
    '.ev-chip{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;margin:2px 2px 0 0}' +
    '.ev-chip.done{background:#fde7e7;color:#b71c1c}.ev-chip.plan{background:#e3f0fd;color:#0d47a1}' +
    '.ev-h{margin:14px 0 6px;font-size:14px}.ev-ex{border:1px solid var(--line,#dde);border-radius:12px;padding:8px 10px;margin:6px 0}.ev-ex q{display:block;font-size:13px;color:var(--muted,#567);margin:3px 0 4px}' +
    '.ev-per{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:10px 0;font-size:14px}.ev-per select{padding:6px 8px;border-radius:10px;border:1px solid var(--line,#ccd)}' +
    '.ev-offer{display:grid;gap:4px;border:1px solid var(--line,#dde);border-radius:14px;padding:10px 12px;margin:12px 0}.ev-offer span{font-size:13px;color:var(--muted,#567)}.ev-offer .btn{justify-self:start;margin-top:4px}';
  document.head.appendChild(css);
})();
