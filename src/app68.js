/* ===== 1.48: consentimiento en papel (se imprime, se firma y se sube la foto a la historia clínica) y radiografías en PDF, arrastrando o pegando ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  if (A.IMG_KINDS) { A.IMG_KINDS.consent = 'Consentimiento firmado'; A.IMG_KINDS.doc = 'Documento o estudio (PDF)'; }

  /* ---------- 1) consentimiento en papel ---------- */
  const paper = pid => { const pd = A.pd(pid); return pd.paper || (pd.paper = []); };
  const pending = pid => paper(pid).filter(x => !x.img && !x.drop);
  A.paperPending = pending;
  A.acts.ppPrint = el => {
    const pid = S.fichaPid, tpl = el.getAttribute('data-tpl'), pat = A.PAT(pid), T = A.CONSENTS[tpl]; if (!T || !pat) return;
    const o = A.pdfDoc_ && A.pdfDoc_('Consentimiento ' + T.title); if (!o) return;
    const body = A.consentBody(pid, tpl);
    o.head(body.title, 'Para firmar en papel. Una vez firmado se guarda una foto o escaneo en la historia clínica.', pat, '');
    body.sections.forEach(s => { o.h(s.h); if (s.p) o.p(s.p); if (s.list) o.list(s.list); });
    o.h('Lugar y fecha'); o.p('................................................, ......./......./...........');
    o.y += 4;
    const pro = A.PRO(pat.pro) || A.PROS[0] || {};
    o.sigs([{ role: 'Paciente o responsable (firma, aclaración y DNI)', name: pat.name, dni: pat.dni }, { role: 'Profesional (firma y sello)', name: pro.name, mat: pro.mat }]);
    o.finish('consentimiento-' + tpl + '-' + String(pat.last || pat.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.pdf');
    paper(pid).push({ id: A.uid(), tpl, title: T.title, at: new Date().toISOString(), by: (A.actor && A.actor().who) || '', img: null });
    A.touchPd(pid); A.refresh(); A.toast('Imprimilo, que lo firme y después tocá «Subir firmado».');
  };
  A.acts.ppUp = el => { const f = $('#ppFile'); if (!f) return; f.setAttribute('data-id', el.getAttribute('data-id')); f.click(); };
  A.acts.ppDrop = el => { const x = paper(S.fichaPid).filter(p => p.id === el.getAttribute('data-id'))[0]; if (!x) return; x.drop = { at: new Date().toISOString(), by: (A.actor && A.actor().who) || '' }; A.touchPd(S.fichaPid); A.refresh(); A.toast('Quitado de pendientes. El registro de que se imprimió queda guardado.'); };
  /* foto → jpg reducido */
  const toJpg = (file, max, q) => new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q)); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); }; im.src = url;
  });
  A.chg.ppFile = async el => {
    const pid = S.fichaPid, id = el.getAttribute('data-id'), x = paper(pid).filter(p => p.id === id)[0], files = Array.prototype.slice.call(el.files || []); if (!x || !files.length) return;
    A.toast('Guardando…'); let ids = [];
    for (const f0 of files) {
      const imgs = /pdf$/i.test(f0.type) || /\.pdf$/i.test(f0.name) ? await pdfPages(f0) : [f0];
      for (const f of imgs) { try { const full = await toJpg(f, 2000, 0.85), thumb = await toJpg(f, 160, 0.6); const it = await A.imgAdd(pid, { kind: 'consent', note: 'Consentimiento firmado en papel: ' + x.title }, full, thumb); ids.push(it.id); } catch (e) { /* sigue */ } }
    }
    el.value = '';
    if (!ids.length) { A.toast('No se pudo leer el archivo.'); return; }
    x.img = ids; x.upAt = new Date().toISOString(); x.upBy = (A.actor && A.actor().who) || ''; A.touchPd(pid);
    if (A.alog) A.alog(pid, 'consentimiento', 'Subió el consentimiento firmado en papel: ' + x.title);
    A.refresh(); A.toast('Consentimiento firmado guardado en la historia clínica.');
  };
  const docsPrev = A.render.docsTab;
  if (docsPrev) A.render.docsTab = pid => {
    let h = docsPrev(pid); const P = paper(pid), pend = pending(pid);
    let c = '<section class="card pp-card"><h2>Consentimiento en papel <span class="chip ok">recomendado</span></h2>' +
      '<p class="hint" style="margin-top:0">Se imprime con los datos del paciente, lo firma en papel y le sacás una foto (o lo escaneás). Queda guardado en la historia clínica con fecha y quién lo subió. Es la opción más segura ante un reclamo.</p>' +
      '<div class="row-btns">' + Object.keys(A.CONSENTS).map(k => '<button class="btn small" data-act="ppPrint" data-tpl="' + k + '">' + esc(A.CONSENTS[k].title) + '</button>').join('') + '</div>';
    if (pend.length) c += '<div class="pp-pend"><b>Falta subir firmado:</b>' + pend.map(x => '<div class="pp-row"><span>' + esc(x.title) + ' · impreso el ' + esc(A.fmtDMY(x.at.slice(0, 10))) + '</span><button class="btn small primary" data-act="ppUp" data-id="' + x.id + '">Subir firmado</button><button class="btn small ghost" data-act="ppDrop" data-id="' + x.id + '">No se firmó</button></div>').join('') + '</div>';
    const done = P.filter(x => x.img);
    if (done.length) c += '<div class="pp-done">' + done.slice().reverse().map(x => '<div class="pp-row"><span>✓ ' + esc(x.title) + ' · firmado y subido el ' + esc(A.fmtDMY(x.upAt.slice(0, 10))) + (x.upBy ? ' por ' + esc(x.upBy) : '') + '</span><button class="btn small" data-act="imOpenP" data-id="' + x.img[0] + '">Ver</button></div>').join('') + '</div>';
    c += '<input type="file" id="ppFile" accept="image/*,application/pdf" capture="environment" multiple hidden data-chg="ppFile"></section>';
    return c + h;
  };
  A.acts.imOpenP = el => { S.modal = { type: 'img', pid: S.fichaPid, id: el.getAttribute('data-id') }; A.renderModal(); };
  /* aviso arriba de la ficha */
  const banner = () => {
    if (S.tab !== 'ficha' || !S.fichaPid) return; const v = $('#view-ficha'); if (!v) return;
    const old = v.querySelector('.pp-bnr'); const pend = pending(S.fichaPid);
    if (!pend.length) { if (old) old.remove(); return; }
    const html = '<div class="pp-bnr" role="status"><span>Falta subir firmado: <b>' + esc(pend.map(x => x.title).join(', ')) + '</b></span><button class="btn small" data-act="fichaTab" data-tab="docs">Ir a documentos</button></div>';
    if (old) { old.outerHTML = html; return; }
    const h1 = v.querySelector('h1'); const at = h1 ? (h1.closest('.ag-bar') || h1) : v.firstElementChild; if (at) at.insertAdjacentHTML('afterend', html);
  };
  const arPrev = A.afterRefresh; A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; try { banner(); } catch (e) { /* nada */ } return r; };

  /* ---------- 2) radiografías y estudios en PDF ---------- */
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  let pdfLib = null;
  const loadPdf = () => pdfLib || (pdfLib = new Promise((res, rej) => {
    if (window.pdfjsLib) { res(window.pdfjsLib); return; }
    const s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js';
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(window.pdfjsLib); };
    s.onerror = () => { pdfLib = null; rej(new Error('pdfjs')); }; document.head.appendChild(s);
  }));
  /* cada página del PDF pasa a imagen (máx. 10 páginas) */
  async function pdfPages(file) {
    const lib = await loadPdf(), doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise, out = [];
    for (let i = 1; i <= Math.min(doc.numPages, 10); i++) {
      const pg = await doc.getPage(i), vp0 = pg.getViewport({ scale: 1 }), k = Math.min(3, 2000 / Math.max(vp0.width, vp0.height)), vp = pg.getViewport({ scale: k });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      await pg.render({ canvasContext: g, viewport: vp }).promise;
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
      out.push(new File([blob], file.name.replace(/\.pdf$/i, '') + '-p' + i + '.jpg', { type: 'image/jpeg' }));
    }
    return out;
  }
  A.pdfPages = pdfPages;
  const upPrev = A.chg.imUpload;
  const upload = async files => {
    const list = [];
    for (const f of files) {
      if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) { try { A.toast('Leyendo el PDF…'); (await pdfPages(f)).forEach(x => list.push(x)); } catch (e) { A.toast('No se pudo abrir el PDF (necesita internet la primera vez).'); } }
      else if (/^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name)) list.push(f);
    }
    if (!list.length) return;
    if (!$('#imKind')) { A.toast('Abrí la pestaña «Imágenes» del paciente para agregar archivos.'); return; }
    await upPrev({ files: list, value: '' });
  };
  if (upPrev) A.chg.imUpload = el => upload(Array.prototype.slice.call(el.files || [])).then(() => { try { el.value = ''; } catch (e) { /* nada */ } });
  const imgPrev = A.render.imgTab;
  if (imgPrev) A.render.imgTab = pid => {
    let h = imgPrev(pid);
    h = h.split('accept="image/*" multiple hidden data-chg="imUp"').join('accept="image/*,application/pdf" multiple hidden data-chg="imUp"');
    return h.replace('<section class="card ph-opt">', '<section class="card ph-opt im-drop"><div class="im-dz">En la computadora podés <b>arrastrar acá</b> la radiografía o el PDF que llegó por mail, o pegarla con Ctrl+V. Con «+ Subir» también se aceptan PDF.</div>');
  };
  const onImg = () => S.tab === 'ficha' && S.fichaTab === 'img' && !S.modal;
  document.addEventListener('dragover', e => { if (!onImg()) return; e.preventDefault(); document.body.classList.add('im-dragging'); });
  document.addEventListener('dragleave', e => { if (e.target === document.documentElement || !e.relatedTarget) document.body.classList.remove('im-dragging'); });
  document.addEventListener('drop', e => { if (!onImg()) return; e.preventDefault(); document.body.classList.remove('im-dragging'); const f = Array.prototype.slice.call((e.dataTransfer && e.dataTransfer.files) || []); if (f.length) upload(f); });
  document.addEventListener('paste', e => {
    if (!onImg()) return; const items = Array.prototype.slice.call((e.clipboardData && e.clipboardData.files) || []); if (!items.length) return;
    e.preventDefault(); upload(items);
  });

  const css = document.createElement('style');
  css.textContent = '.pp-pend,.pp-done{margin-top:10px;display:flex;flex-direction:column;gap:6px}.pp-pend{padding:10px;border-radius:12px;background:#fff4e0}.pp-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.pp-row>span{flex:1 1 200px}' +
    '.pp-bnr{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:space-between;margin:8px 0;padding:10px 12px;border-radius:12px;background:#fff4e0;font-size:.9rem}' +
    '.im-dz{display:none;font-size:.85rem;color:var(--muted,#667);margin-bottom:6px}@media (hover:hover) and (pointer:fine){.im-dz{display:block}}body.im-dragging .im-drop{outline:3px dashed var(--teal,#0b6b6f);outline-offset:4px}';
  document.head.appendChild(css);
})();
