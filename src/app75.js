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
  /* de qué federación se toman los aranceles: se elige una vez (Río Negro automático; Neuquén u otra, a mano por ahora) */
  const SRC = { rn: 'Federación Odontológica de Río Negro', nqnref: 'Neuquén, con los de Río Negro como referencia', nqn: 'Neuquén, sin precarga (los cargo yo)', manual: 'Otra provincia · los cargo yo' };
  const src = () => {
    if (A.CFG.fornSrc) return A.CFG.fornSrc;
    if (A.CFG.fornAuto === false) return 'manual';
    if ((A.CFG.os || []).some(o => o.fornAuto || o.forn)) { A.CFG.fornSrc = 'rn'; return 'rn'; }
    return '';
  };
  A.fornSrc = src;
  const autoOn = () => src() === 'rn' || src() === 'nqnref';
  A.fornIsRef = () => src() === 'nqnref';
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
      if (A.nfAdd) A.nfAdd({ id: 'fornauto:' + String(DATA.at).slice(0, 10), k: 'info', t: A.fornIsRef() ? 'Aranceles de referencia (Río Negro) al día' : 'Aranceles de la Federación al día', b: (neu.length ? 'Cargados: ' + neu.join(', ') + '. ' : '') + (upd.length ? 'Actualizados: ' + upd.join(', ') + '.' : ''), act: 'osOpen' });
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
    /* todavía no eligió de dónde salen los aranceles: se pregunta una vez (si hay una ventana abierta, se espera) */
    if (!src() && boss()) { let n = 0; const ask = () => { if (src()) return; if (S.modal || !S.setup || document.querySelector('#intro')) { if (++n < 40) setTimeout(ask, 3000); return; } S.modal = { type: 'fornSrc' }; A.renderModal(); }; setTimeout(ask, 1500); }
  };
  A.modalFns.fornSrc = m => {
    const opt = (k, t, d) => '<button class="fs-op' + (m.pick === k || (k === 'nqn' && m.pick === 'nqnref') ? ' on' : '') + '" data-act="fornSrcPick" data-k="' + k + '"><b>' + t + '</b><span>' + d + '</span></button>';
    const b = '<p class="m-lead">Para que al cargar prácticas aparezca lo que paga cada obra social, OdontoVoz puede precargar los aranceles. ¿Dónde está tu consultorio?</p><div class="fs-ops">' +
      opt('rn', SRC.rn, 'Se cargan solos en tus obras sociales y se actualizan cada mes (solo suben: nunca bajan lo que edites).') +
      opt('nqn', 'Neuquén (Círculo Odontológico de Neuquén)', 'Los aranceles de Neuquén todavía no se pueden bajar solos: cargás los valores de tus obras sociales a mano y te avisamos cuando estén disponibles.') +
      (m.pick === 'nqn' || m.pick === 'nqnref' ? '<label class="chk fs-ref"><input type="checkbox" data-chg="fornRefChk"' + (m.pick === 'nqnref' ? ' checked' : '') + '> <span><b>¿Precargamos los de Río Negro como referencia?</b> Te sirven de punto de partida: los cambiás por los valores de Neuquén y los que edites no se tocan más (cada mes solo se suben los que no cambiaste).</span></label>' : '') +
      opt('manual', SRC.manual, 'No se precarga nada: cargás vos lo que paga cada obra social.') + '</div><p class="hint">Lo podés cambiar cuando quieras en Ajustes › Obras sociales.</p>';
    return A.modalShell('Aranceles de las obras sociales', b, '<button class="btn" data-act="closeModal">Después</button><button class="btn primary" data-act="fornSrcGo"' + (m.pick ? '' : ' disabled') + '>Listo</button>');
  };
  A.acts.fornSrcPick = el => { S.modal.pick = el.getAttribute('data-k'); A.renderModal(); };
  A.chg.fornRefChk = el => { S.modal.pick = el.checked ? 'nqnref' : 'nqn'; A.renderModal(); };
  A.acts.fornSrcGo = () => { const k = S.modal && S.modal.pick; if (!k) return; S.modal = null; A.renderModal(); setSrc(k); };
  function setSrc(k) {
    const was = src();
    if (k === 'rn' || k === 'nqnref') {
      A.CFG.fornSrc = k; delete A.CFG.fornAuto; A.save();
      const ref = k === 'nqnref', fin = () => { const r = A.fornAuto(); A.toast(r.neu.length ? (ref ? 'Listo: precargados como referencia los de Río Negro en ' : 'Listo: aranceles de la Federación cargados en ') + r.neu.join(', ') + '.' + (ref ? ' Cambialos por los de Neuquén tocando cada obra social.' : '') : 'Listo: los aranceles de la Federación se cargan y actualizan solos.'); A.renderModal(); };
      if (DATA) fin(); else if (A.fornGet) A.fornGet().then(d => { if (d) { DATA = d; fin(); } });
      return;
    }
    /* deja de usar Río Negro: se quitan los valores que se cargaron solos y no editaste (se puede deshacer) */
    const snap = JSON.stringify(A.CFG.os || []); let q = 0;
    A.CFG.fornSrc = k; delete A.CFG.fornAuto;
    if (was === 'rn' || was === 'nqnref') A.osList().forEach(o => { if (!o.fornAuto) return; Object.keys(o.aran || {}).forEach(c => { const a = o.aran[c]; if (a.forn && !a.man) { delete o.aran[c]; q++; } }); delete o.forn; delete o.fornAuto; });
    A.save(); A.renderModal();
    A.toast((k === 'nqn' ? 'Listo: Neuquén. Cargá lo que paga cada obra social tocándola en Ajustes › Obras sociales.' : 'Listo: los aranceles los cargás vos.') + (q ? ' Quité ' + q + ' valores de Río Negro que no habías editado.' : ''), q ? () => { A.CFG.os = JSON.parse(snap); A.CFG.fornSrc = was; A.save(); A.renderModal(); } : null);
  }
  A.fornSetSrc = setSrc;
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
    const k = src(), n = A.osList().filter(o => o.forn).length;
    const box = '<div class="fa-box"><label for="faSrc"><b>Aranceles precargados de</b></label><select id="faSrc" data-chg="fornSrcSet"><option value=""' + (k ? '' : ' selected') + ' disabled>Elegí…</option>' + Object.keys(SRC).map(x => '<option value="' + x + '"' + (k === x ? ' selected' : '') + '>' + SRC[x] + '</option>').join('') + '</select>' +
      '<small>' + (k === 'nqnref' ? (n ? n + ' obras sociales con valores de Río Negro como referencia. ' : '') + 'Cambialos por los de Neuquén tocando cada obra social: lo que edites se marca con ✎ y no se toca más. Los que no cambies se actualizan cada mes (solo suben).' : k === 'rn' ? (n ? n + ' obras sociales con valores de la Federación. ' : '') + 'Cada mes se actualizan solos y <b>solo suben</b>: si la Federación publica un valor más bajo que el que tenés o editaste, queda el tuyo. Cualquier valor lo podés editar tocando la obra social.' : k === 'nqn' ? 'Por ahora los valores de Neuquén se cargan a mano (tocá cada obra social). Te avisamos cuando se puedan bajar solos.' : k === 'manual' ? 'Los aranceles los cargás vos: tocá cada obra social.' : 'Elegí de dónde se precargan los aranceles de tus obras sociales.') + '</small></div>';
    return h.replace(/(<div class="m-body"[^>]*>)/, '$1' + box);
  };
  A.chg.fornSrcSet = el => { if (el.value && el.value !== src()) setSrc(el.value); };
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
    const box = '<div class="fa-box"><label class="chk"><input type="checkbox" data-chg="fornOneSet" data-os="' + esc(o.id) + '"' + (!o.fornOff && autoOn() ? ' checked' : '') + (autoOn() ? '' : ' disabled') + '> ' + (A.fornIsRef() ? 'Actualizar sola la referencia de Río Negro cada mes' : 'Actualizar sola con la ' + RN + ' cada mes') + '</label><small>Solo sube valores: si editás uno (por ejemplo, porque en tu zona paga distinto) y la Federación publica uno más bajo, queda el tuyo. Los editados se marcan con ✎.' + (o.forn.vig ? ' Vigencia de los valores: ' + esc(o.forn.vig) + '.' : '') + '</small></div>';
    let out = h.replace('<div class="block"><h3>Aranceles por práctica</h3>', box + '<div class="block"><h3>Aranceles por práctica</h3>');
    /* marca ✎ en los valores editados */
    Object.keys(o.aran || {}).forEach(c => { if (o.aran[c].man) out = out.replace('<span><b>' + esc(c) + '</b> ', '<span><b>' + esc(c) + '</b> <i class="fa-man" title="Editado por vos">✎</i> '); });
    return out;
  };
  A.chg.fornOneSet = el => { const o = A.osById(el.getAttribute('data-os')); if (!o) return; o.fornOff = !el.checked; A.save(); A.renderModal(); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const css = document.createElement('style');
  css.textContent = '.fs-ops{display:grid;gap:8px}.fs-ref{display:flex;gap:8px;align-items:flex-start;margin:-2px 4px 4px;padding:10px 12px;border-radius:12px;background:#fff6e0;font-size:.88rem}.fs-ref span{line-height:1.35}.os-ref{color:#8a5a00}.fs-op{display:grid;gap:3px;text-align:left;border:1.5px solid var(--line,#ccd);border-radius:14px;padding:12px 14px;background:var(--card,#fff);color:inherit;font:inherit;cursor:pointer}.fs-op span{font-size:.85rem;color:var(--muted,#567)}.fs-op.on{border-color:var(--teal,#0b6b6f);box-shadow:0 0 0 3px rgba(11,107,111,.15)}.fa-box select{padding:8px 10px;border-radius:10px;border:1px solid var(--line,#ccd);font:inherit;background:var(--card,#fff);color:inherit}' +
    '.fa-box{display:grid;gap:4px;margin:0 0 12px;padding:10px 12px;border:1px solid var(--line,#d5e2e1);border-radius:14px;background:var(--soft,#f1f8f7)}.fa-box small{color:var(--muted,#567);font-size:.83rem;line-height:1.35}.fa-man{font-style:normal;color:#b26a00;font-size:.85em}';
  document.head.appendChild(css);
})();
