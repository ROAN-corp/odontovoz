/* ===== 1.33.1: paciente nuevo desde el turno con la misma obra social que la ficha (lista, N.º de afiliado y plan con toque) ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, $ = q => document.querySelector(q);
  if (!A.wrapNewAppt || !A.osList) return;
  const N = s => (A.norm ? A.norm(s) : String(s || '').toLowerCase());
  const sigla = txt => { const t = String(txt || '').trim(); if (!t || /^particular$/i.test(t)) return 'Particular'; const o = A.osList().filter(x => N(x.sigla) === N(t) || N(x.name) === N(t))[0]; return o ? o.sigla : t; };
  const prev = A.wrapNewAppt;
  A.wrapNewAppt = (m, html) => {
    html = prev ? prev(m, html) : html;
    if (!m.f || !m.f.creating) return html;
    const f = m.f, oss = A.osList().filter(o => o.kind !== 'particular'), v = f.n_cov && f.n_cov !== 'Particular' ? f.n_cov : '';
    const field = '<div class="field"><label for="npC">Obra social / prepaga <span class="opt">vacío = particular</span></label><input id="npC" list="npOsDl" value="' + esc(v) + '" placeholder="Elegí de la lista o escribí" autocomplete="off"><datalist id="npOsDl">' + oss.map(o => '<option value="' + esc(o.sigla) + '">' + esc(o.name) + '</option>').join('') + '</datalist></div>' +
      '<div class="row2"><div class="field"><label for="npAfil">N.º de afiliado <span class="opt">opcional</span></label><input id="npAfil" value="' + esc(f.n_afil || '') + '"></div><div class="field"><label for="npPlan">Plan <span class="opt">opcional</span></label><input id="npPlan" value="' + esc(f.n_plan || '') + '" placeholder="Ej.: 210, Bronce, PMO"></div></div>';
    const re = /<div class="field"><label for="nc_cov">[\s\S]*?<\/select><\/div>/;
    return re.test(html) ? html.replace(re, field) : html.replace(/(<div class="field"><label for="nc_phone">[\s\S]*?<\/div>)/, '$1' + field);
  };
  const keep = e => {
    const id = e.target && e.target.id, k = { npC: 'n_cov', npAfil: 'n_afil', npPlan: 'n_plan' }[id];
    if (k && S.modal && S.modal.type === 'newAppt' && S.modal.f) S.modal.f[k] = e.target.value;
  };
  document.addEventListener('input', keep); document.addEventListener('change', keep);
  const addPrev = A.addPatient;
  A.addPatient = function (d) {
    const c = $('#npC'), inNew = c && S.modal && S.modal.type === 'newAppt';
    if (inNew && d && (!d.cov || d.cov === 'Particular')) d.cov = sigla(c.value);
    const p = addPrev.apply(this, arguments);
    if (inNew && p && p.id && A.setProfile && d.cov !== 'Particular') { const ex = {}, af = ($('#npAfil') || {}).value, pl = ($('#npPlan') || {}).value; if (af && af.trim()) ex.afil = af.trim(); if (pl && pl.trim()) ex.plan = pl.trim(); if (Object.keys(ex).length) A.setProfile(p.id, ex); }
    return p;
  };
})();
