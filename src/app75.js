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

  /* actualización mensual: solo sube valores (si la Federación publica uno más bajo que el que tenés o editaste, queda el tuyo) */
  const raise = (o, f) => {
    const map = o.forn, t = f.tables[map.t]; if (!t) return 0;
    let n = 0;
    Object.keys(t.rows).forEach(code => {
      const v = t.rows[code].v; let cov = v[map.cov], cos = map.cos >= 0 ? v[map.cos] : null;
      if (cov == null) return;
      if (map.sub && cos != null) cov = Math.max(0, cov - cos);
      const a = o.aran[code];
      if (!a) { o.aran[code] = { on: true, cov, cos: cos != null ? cos : 0, forn: 1 }; if (!(A.NOMEN || []).some(x => x[0] === code)) o.aran[code].label = t.rows[code].d; n++; return; }
      if (cov > (a.cov || 0)) { a.cov = cov; n++; }
      if (cos != null && cos > (a.cos || 0) && !a.man) { a.cos = cos; n++; }
    });
    o.forn.at = DATA.at; o.forn.vig = t.vig || f.vig || o.forn.vig; if (n) o.upd = A.today();
    return n;
  };
  const autoOn = () => A.CFG.fornAuto !== false;
  /* carga (si no tenía) o actualiza (si la Federación publicó valores nuevos) una obra social */
  const loadOne = o => {
    if (!autoOn() || !o || !o.on || o.kind === 'particular' || o.fornOff) return '';
    const f = findF(o); if (!f || !f.tables || !f.tables.length) return '';
    const n = Object.keys(o.aran || {}).length;
    if (!o.forn) {
      if (n >= 3 && !Object.keys(o.aran).some(c => o.aran[c].forn)) return ''; /* ya tenía su propia lista: no se pisa */
      const c = cols(f.tables[0]); A.fornApply(o, { slug: f.slug, t: 0, cov: c.cov, cos: c.cos, sub: c.sub }); o.fornAuto = 1; return 'new';
    }
    if (o.forn.at !== DATA.at && f.tables[o.forn.t]) return raise(o, f) ? 'upd' : (o.forn.at = DATA.at, '');
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

  /* ---------- lo editado a mano queda marcado (la Federación nunca lo baja) ---------- */
  const arPrevChg = A.chg.osAr;
  if (arPrevChg) A.chg.osAr = function (el) {
    const r = arPrevChg.apply(this, arguments);
    try { const o = A.osById(el.getAttribute('data-os')), a = o && o.aran[el.getAttribute('data-c')], f = el.getAttribute('data-f'); if (a && (f === 'cov' || f === 'cos')) { a.man = 1; A.save(); } } catch (e) { /* nada */ }
    return r;
  };

  /* ---------- ajustes: en la lista de obras sociales y en cada una ---------- */
  const RN = 'Federación Odontológica de Río Negro';
  const listPrev = A.modalFns.osList;
  if (listPrev) A.modalFns.osList = m => {
    const h = listPrev(m); if (typeof h !== 'string' || !boss()) return h;
    const on = autoOn(), n = A.osList().filter(o => o.forn).length;
    const box = '<div class="fa-box"><label class="chk"><input type="checkbox" data-chg="fornAutoSet"' + (on ? ' checked' : '') + '> <b>Aranceles de la ' + RN + ': cargarlos y actualizarlos solos</b></label>' +
      '<small>' + (on ? (n ? n + ' obras sociales con valores de la Federación. ' : '') + 'Cada mes se actualizan solos y <b>solo suben</b>: si la Federación publica un valor más bajo que el que tenés o editaste, queda el tuyo. Cualquier valor lo podés editar tocando la obra social.' : 'Apagado: los aranceles los cargás vos (tocá cada obra social). Recomendado si tu consultorio está en Neuquén u otra provincia.') + '</small></div>';
    return h.replace(/(<div class="m-body"[^>]*>)/, '$1' + box);
  };
  A.chg.fornAutoSet = el => {
    if (el.checked) { A.CFG.fornAuto = true; A.save(); A.renderModal(); if (DATA) { const r = A.fornAuto(); A.toast(r.neu.length ? 'Cargados los aranceles de: ' + r.neu.join(', ') + '.' : 'Listo: se actualizan solos.'); A.renderModal(); } else go(); return; }
    /* se apaga: se quitan los valores que se cargaron solos y no editaste (se puede deshacer) */
    const snap = JSON.stringify(A.osList()); A.CFG.fornAuto = false; let q = 0;
    A.osList().forEach(o => { if (!o.fornAuto) return; Object.keys(o.aran || {}).forEach(c => { const a = o.aran[c]; if (a.forn && !a.man) { delete o.aran[c]; q++; } }); delete o.forn; delete o.fornAuto; });
    A.save(); A.renderModal();
    A.toast(q ? 'Apagado. Quité ' + q + ' valores que se habían cargado solos (lo que editaste queda).' : 'Apagado.', q ? () => { A.CFG.os = JSON.parse(snap); A.CFG.fornAuto = true; A.save(); A.renderModal(); } : null);
  };
  const editPrev = A.modalFns.osEdit;
  if (editPrev) A.modalFns.osEdit = m => {
    const h = editPrev(m); if (typeof h !== 'string') return h;
    const o = A.osById(m.id); if (!o || !o.forn || !boss()) return h;
    const box = '<div class="fa-box"><label class="chk"><input type="checkbox" data-chg="fornOneSet" data-os="' + esc(o.id) + '"' + (!o.fornOff && autoOn() ? ' checked' : '') + (autoOn() ? '' : ' disabled') + '> Actualizar sola con la ' + RN + ' cada mes</label><small>Solo sube valores: si editás uno (por ejemplo, porque en tu zona paga distinto) y la Federación publica uno más bajo, queda el tuyo. Los editados se marcan con ✎.' + (o.forn.vig ? ' Vigencia de los valores: ' + esc(o.forn.vig) + '.' : '') + '</small></div>';
    let out = h.replace('<div class="block"><h3>Aranceles por práctica</h3>', box + '<div class="block"><h3>Aranceles por práctica</h3>');
    /* marca ✎ en los valores editados */
    Object.keys(o.aran || {}).forEach(c => { if (o.aran[c].man) out = out.replace('<span><b>' + esc(c) + '</b> ', '<span><b>' + esc(c) + '</b> <i class="fa-man" title="Editado por vos">✎</i> '); });
    return out;
  };
  A.chg.fornOneSet = el => { const o = A.osById(el.getAttribute('data-os')); if (!o) return; o.fornOff = !el.checked; A.save(); A.renderModal(); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const css = document.createElement('style');
  css.textContent = '.fa-box{display:grid;gap:4px;margin:0 0 12px;padding:10px 12px;border:1px solid var(--line,#d5e2e1);border-radius:14px;background:var(--soft,#f1f8f7)}.fa-box small{color:var(--muted,#567);font-size:.83rem;line-height:1.35}.fa-man{font-style:normal;color:#b26a00;font-size:.85em}';
  document.head.appendChild(css);
})();
