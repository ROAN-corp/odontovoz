/* ===== 1.47: profesionales: especialidad con lista desplegable y varias matrículas (cada una con su sello y su foto) ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc, $ = q => document.querySelector(q);
  const SPECS = ['Odontología general', 'Ortodoncia', 'Endodoncia', 'Implantes y cirugía', 'Periodoncia', 'Odontopediatría', 'Rehabilitación oral y prótesis', 'Estética dental', 'Cirugía y traumatología bucomaxilofacial', 'Odontogeriatría', 'Patología y medicina bucal', 'Radiología odontológica'];
  const PROVS = ['Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán', 'Nacional'];
  const rer = () => { const b = $('.m-body'), t = b ? b.scrollTop : 0; A.renderModal(); const b2 = $('.m-body'); if (b2) b2.scrollTop = t; };

  /* ---------- matrículas ---------- */
  const matsOf = p => (Array.isArray(p.mats) ? p.mats : (p.mat ? [{ n: p.mat, j: '' }] : []));
  const matTxt = p => { const L = matsOf(p).filter(x => x && String(x.n || '').trim()); return L.map(x => String(x.n).trim() + (x.j && String(x.j).trim() ? ' (' + String(x.j).trim() + ')' : '')).join(' · '); };
  A.matsOf = matsOf; A.matTxt = matTxt;
  const ensure = p => { if (!Array.isArray(p.mats)) p.mats = p.mat ? [{ n: p.mat, j: '' }] : []; return p.mats; };
  const commit = p => { p.mat = matTxt(p); if (p.cred && A.credStamp && (p.cred.sello || p.cred.firma || p.cred.matFoto || (p.mats || []).some(x => x && (x.sello || x.matFoto)))) A.credStamp(p); A.save(); };
  A.chg.matSet = el => {
    const p = A.PRO(el.getAttribute('data-id')), i = +el.getAttribute('data-i'), k = el.getAttribute('data-k'); if (!p) return;
    const L = ensure(p); if (!L[i]) L[i] = { n: '', j: '' }; L[i][k] = el.value.trim();
    commit(p); A.refresh(); /* sin redibujar la ventana: así no se pierde el cursor al pasar de un campo al otro */
  };
  A.acts.matAdd = el => { const p = A.PRO(el.getAttribute('data-id')); if (!p) return; const L = ensure(p); if (!L.length) L.push({ n: '', j: '' }); L.push({ n: '', j: '' }); rer(); const n = document.querySelectorAll('.pe-mrow .pe-mn'); if (n.length) n[n.length - 1].focus(); };
  A.acts.matDel = el => {
    const p = A.PRO(el.getAttribute('data-id')), i = +el.getAttribute('data-i'); if (!p) return; const L = ensure(p); L.splice(i, 1); commit(p); A.refresh(); rer();
    A.toast('Matrícula quitada.');
  };
  function matsHTML(p) {
    const L = matsOf(p).slice(); if (!L.length) L.push({ n: '', j: '' });
    return '<div class="block pe-mats"><h3>Matrícula' + (L.length > 1 ? 's' : '') + '</h3><div class="hint">Si tenés matrícula en más de una provincia, cargá todas: salen juntas en las indicaciones y firmas, y las fichas de la FORN usan la de Río Negro.</div>' +
      '<datalist id="peProvs">' + PROVS.map(x => '<option value="' + esc(x) + '">').join('') + '</datalist>' +
      L.map((x, i) => '<div class="pe-mrow"><div class="field"><label for="peMn' + i + '">' + (L.length > 1 ? 'Matrícula ' + (i + 1) : 'Número') + '</label><input id="peMn' + i + '" class="pe-mn" data-chg="matSet" data-id="' + esc(p.id) + '" data-i="' + i + '" data-k="n" value="' + esc(x.n || '') + '" placeholder="M.P. / M.N. 1234"></div>' +
        '<div class="field"><label for="peMj' + i + '">Provincia o colegio</label><input id="peMj' + i + '" list="peProvs" data-chg="matSet" data-id="' + esc(p.id) + '" data-i="' + i + '" data-k="j" value="' + esc(x.j || '') + '" placeholder="Ej.: Río Negro" autocomplete="off"></div>' +
        (L.length > 1 ? '<button type="button" class="btn small ghost pe-mdel" data-act="matDel" data-id="' + esc(p.id) + '" data-i="' + i + '" aria-label="Quitar la matrícula ' + (i + 1) + '">✕</button>' : '') + '</div>').join('') +
      '<div class="row-btns"><button type="button" class="btn small" data-act="matAdd" data-id="' + esc(p.id) + '">+ Agregar otra matrícula</button></div></div>';
  }

  /* ---------- sello y foto de cada matrícula extra ---------- */
  const SL = [['sello', 'Sello', 'Foto del sello sobre papel blanco. El fondo se quita solo.'], ['matFoto', 'Foto de la matrícula', 'Foto del carnet o certificado (solo para el registro).']];
  A.chg.credFile2 = async el => {
    const p = A.PRO(el.getAttribute('data-id')), i = +el.getAttribute('data-i'), k = el.getAttribute('data-k'), f = el.files && el.files[0], I = A.credImg; if (!p || !f || !I || !p.mats || !p.mats[i]) return;
    try {
      const im = await I.loadImg(f), out = k === 'matFoto' ? I.toJpg(im) : I.toInk(im);
      if (!out) { A.toast('No encontré el sello en la foto. Probá con más luz y papel blanco.'); return; }
      p.mats[i][k] = out; p.cred = p.cred || {}; commit(p); A.credStamp(p);
      if (A.empAudit) { try { A.empAudit('Cargó ' + (k === 'sello' ? 'el sello' : 'la foto de la matrícula') + ' (' + (p.mats[i].j || 'matrícula ' + (i + 1)) + ') de ' + (p.name || p.id) + '.'); } catch (e) { /* nada */ } }
      A.save(); A.toast('Listo: quedó registrado.'); A.renderModal();
    } catch (e) { A.toast(e.message || 'No se pudo cargar la foto.'); }
  };
  A.acts.credDel2 = el => { const p = A.PRO(el.getAttribute('data-id')), i = +el.getAttribute('data-i'), k = el.getAttribute('data-k'); if (!p || !p.mats || !p.mats[i]) return; delete p.mats[i][k]; commit(p); A.renderModal(); };
  function extraHTML(p) {
    const L = matsOf(p); if (L.length < 2) return '';
    let h = '<div class="block"><h3>Sello y foto de las otras matrículas</h3><div class="hint">La firma es una sola para todas. Lo de arriba (sello y foto) corresponde a la <b>primera</b> matrícula' + (L[0] && (L[0].n || L[0].j) ? ' (' + esc([L[0].n, L[0].j].filter(Boolean).join(' · ')) + ')' : '') + '. Si las otras tienen su propio sello o carnet, cargalos acá.</div>';
    L.forEach((x, i) => {
      if (!i) return;
      h += '<h4 class="pe-mt">Matrícula ' + (i + 1) + (x.n || x.j ? ' · ' + esc([x.n, x.j].filter(Boolean).join(' · ')) : '') + '</h4>';
      SL.forEach(s => {
        const v = x[s[0]], id = 'cr2-' + i + '-' + s[0];
        h += '<div class="cr-slot"><div class="cr-img">' + (v ? '<img alt="' + esc(s[1]) + '" src="' + v + '">' : '<span>Sin cargar</span>') + '</div><div class="cr-in"><b>' + s[1] + '</b><small>' + s[2] + '</small><div class="row-btns"><label class="btn small' + (v ? '' : ' primary') + '" for="' + id + '">' + (v ? 'Cambiar' : 'Subir o sacar foto') + '</label><input type="file" id="' + id + '" class="cr-file" accept="image/*" data-chg="credFile2" data-id="' + esc(p.id) + '" data-i="' + i + '" data-k="' + s[0] + '">' + (v ? '<button type="button" class="btn small ghost" data-act="credDel2" data-id="' + esc(p.id) + '" data-i="' + i + '" data-k="' + s[0] + '">Quitar</button>' : '') + '</div></div></div>';
      });
    });
    return h + '</div>';
  }

  /* ---------- especialidad con lista ---------- */
  const specField = (p, otro) => {
    const val = p.spec || '', inList = SPECS.indexOf(val) >= 0, showO = otro || (val && !inList);
    return '<div class="field"><label for="peSpec">Especialidad</label><select id="peSpec" data-chg="specSel" data-id="' + esc(p.id) + '">' + (val || otro ? '' : '<option value="">Elegí una…</option>') +
      SPECS.map(x => '<option' + (!showO && x === val ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '<option value="__otra"' + (showO ? ' selected' : '') + '>Otra (la escribo)…</option></select>' +
      (showO ? '<input id="peSpecO" class="pe-spo" data-chg="cfgPro" data-f="spec" data-id="' + esc(p.id) + '" value="' + esc(inList ? '' : val) + '" placeholder="Escribí la especialidad" autocomplete="off">' : '') + '</div>';
  };
  A.chg.specSel = el => {
    const m = S.modal, id = el.getAttribute('data-id'), p = A.PRO(id); if (!p || !m) return;
    if (el.value === '__otra') { m._specOtra = id; rer(); const n = $('#peSpecO'); if (n) n.focus(); return; }
    delete m._specOtra; p.spec = el.value; A.save(); A.refresh(); rer();
  };
  A.chg.wzSpecSel = el => {
    const w = S.modal && S.modal.wiz; if (!w) return; const f = w.f;
    if ($('#wzName')) f.name = $('#wzName').value.trim(); if ($('#wzMat')) f.mat = $('#wzMat').value.trim();
    if (el.value === '__otra') { f.specOther = true; f.spec = ''; rer(); const n = $('#wzSpec'); if (n) n.focus(); return; }
    f.specOther = false; f.spec = el.value; rer();
  };

  A.SPECS = SPECS; A.specFieldHTML = specField; A.matsBlockHTML = matsHTML; A.extraCredHTML = extraHTML; /* 1.51: «Mis datos profesionales» (app134) */
  const cfgPrev = MF.cfg;
  if (cfgPrev) MF.cfg = function (m) {
    let h = cfgPrev.apply(this, arguments); if (typeof h !== 'string' || !m || m.tab !== 'pros') return h;
    /* editor de un profesional */
    if (m.sel && !m.wiz && !m.rm && A.PRO(m.sel)) {
      const p = A.PRO(m.sel);
      h = h.replace(/<div class="field"><label for="peSpec">Especialidad<\/label><input id="peSpec"[^>]*><\/div>/, () => specField(p, m._specOtra === p.id));
      h = h.replace(/<div class="field"><label for="peMat">Matrícula<\/label><input id="peMat"[^>]*><\/div><\/div>/, () => '</div>' + matsHTML(p));
      if (/<div class="block"><h3>Días y horarios de atención<\/h3>/.test(h)) h = h.replace('<div class="block"><h3>Días y horarios de atención</h3>', () => extraHTML(p) + '<div class="block"><h3>Días y horarios de atención</h3>');
    }
    /* asistente para sumar un profesional */
    if (m.wiz && m.wiz.step === 1) {
      const f = m.wiz.f;
      h = h.replace(/<div class="field"><label for="wzSpec">Especialidad<\/label><input id="wzSpec"[\s\S]*?<\/datalist><\/div>/, () => {
        const inList = SPECS.indexOf(f.spec) >= 0, other = !!f.specOther || (f.spec && !inList);
        return '<div class="field"><label for="' + (other ? 'wzSpecSel' : 'wzSpec') + '">Especialidad</label><select id="' + (other ? 'wzSpecSel' : 'wzSpec') + '" data-chg="wzSpecSel">' +
          SPECS.map(x => '<option' + (!other && x === f.spec ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '<option value="__otra"' + (other ? ' selected' : '') + '>Otra (la escribo)…</option></select>' +
          (other ? '<input id="wzSpec" class="pe-spo" value="' + esc(inList ? '' : f.spec || '') + '" placeholder="Escribí la especialidad" autocomplete="off">' : '') + '</div>';
      });
    }
    return h;
  };

  const css = document.createElement('style'); css.id = 'ovApp130';
  css.textContent = '.pe-mrow{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;margin:0 0 8px}.pe-mdel{height:40px}.pe-spo{margin-top:6px;width:100%;box-sizing:border-box}.pe-mt{margin:12px 0 4px;font-size:.95rem}@media (max-width:560px){.pe-mrow{grid-template-columns:1fr auto}.pe-mrow .field:nth-child(2){grid-column:1 / -1;order:3}}';
  document.head.appendChild(css);
})();
