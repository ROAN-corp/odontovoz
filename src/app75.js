/* ===== 1.50.1: aranceles de la Federación Odontológica de Río Negro cargados y actualizados solos en tus obras sociales ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S;
  const N = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const boss = () => !A.isBoss || A.isBoss();
  let DATA = null;

  /* la obra social de la Federación que corresponde, solo si el nombre coincide de verdad (no por una palabra suelta) */
  const sure = (o, f) => {
    if (!f) return false;
    if (o.forn && o.forn.slug === f.slug) return true;
    const txt = ' ' + N(f.name + ' ' + f.slug.replace(/-\d+$/, '').replace(/-/g, ' ') + ' ' + (f.sub || '')).replace(/ /g, '  ') + ' ', comp = N(f.name).replace(/ /g, '');
    const words = N(o.sigla).split(' ').filter(w => w.length > 2 && ['obra', 'social', 'del', 'los', 'las'].indexOf(w) < 0);
    if (!words.length) return false;
    if (comp === N(o.sigla).replace(/ /g, '')) return true;
    return words.every(w => txt.indexOf(' ' + w + ' ') >= 0);
  };
  const cols = t => {
    const k = t.cols.map(c => c.kind), cos = k.indexOf('cos'), cov = k.indexOf('cov'), tot = k.indexOf('total');
    return { cov: cov >= 0 ? cov : (tot >= 0 ? tot : 0), cos, sub: cov < 0 && cos >= 0 && tot >= 0 };
  };
  const findF = o => { if (!DATA || !A.fornMatch) return null; const f = A.fornMatch(o); return sure(o, f) ? f : null; };

  /* carga (si no tenía) o actualiza (si la Federación publicó valores nuevos) una obra social */
  const loadOne = o => {
    if (!o || !o.on || o.kind === 'particular' || o.fornOff) return '';
    const f = findF(o); if (!f || !f.tables || !f.tables.length) return '';
    const n = Object.keys(o.aran || {}).length;
    if (!o.forn) {
      if (n >= 3 && !Object.keys(o.aran).some(c => o.aran[c].forn)) return ''; /* ya tenía su propia lista: no se pisa */
      const c = cols(f.tables[0]); A.fornApply(o, { slug: f.slug, t: 0, cov: c.cov, cos: c.cos, sub: c.sub }); return 'new';
    }
    if (o.forn.at !== DATA.at && f.tables[o.forn.t]) { const before = JSON.stringify(o.aran); A.fornApply(o, o.forn); return JSON.stringify(o.aran) !== before ? 'upd' : ''; }
    return '';
  };
  A.fornAuto = () => {
    if (!DATA || !boss() || !A.osList) return { neu: [], upd: [] };
    const neu = [], upd = [];
    A.osList().forEach(o => { const r = loadOne(o); if (r === 'new') neu.push(o.sigla); else if (r === 'upd') upd.push(o.sigla); });
    if (neu.length || upd.length) {
      A.CFG.fornSeen = DATA.at; A.save();
      if (A.nfAdd) A.nfAdd({ id: 'fornauto:' + String(DATA.at).slice(0, 10), k: 'info', t: 'Aranceles de la Federación al día', b: (neu.length ? 'Cargados: ' + neu.join(', ') + '. ' : '') + (upd.length ? 'Actualizados: ' + upd.join(', ') + '.' : ''), act: 'osOpen' });
    }
    return { neu, upd };
  };

  /* al cargar prácticas: si la obra social del paciente todavía no tiene aranceles y la Federación los publica, se cargan en el momento */
  const ppPrev = A.pracParse;
  if (ppPrev) A.pracParse = function (text, pid) {
    try {
      if (DATA && boss()) { const o = A.osOf && A.osOf(A.PAT(pid)); if (o && loadOne(o)) A.save(); }
    } catch (e) { /* nada */ }
    return ppPrev.apply(this, arguments);
  };

  /* se bajan al abrir la app (una vez por sesión) y se aplican solos */
  let started = false;
  const go = () => {
    if (!A.fornGet) return;
    A.fornGet().then(d => { if (!d) return; DATA = d; try { A.fornAuto(); } catch (e) { /* nada */ } });
  };
  const arPrev = A.afterRefresh;
  A.afterRefresh = function () {
    const r = arPrev ? arPrev.apply(this, arguments) : undefined;
    if (!started && (!A.DEMO || A._fornData) && navigator.onLine !== false) { started = true; setTimeout(go, A._fornData ? 50 : 2500); }
    return r;
  };
  A._fornAutoLoad = d => { DATA = d; return A.fornAuto(); }; /* para pruebas */
})();
