/* ===== 1.53: consentimientos desde un PDF o una foto propios: se leen en pantalla, se firman en la app y el PDF final lleva las páginas y las firmas ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc, $ = q => document.querySelector(q);
  if (!A.CONSENTS || !A.consentBody || !MF.consentPick) return;
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch (e) { return false; } } };
  const MAXP = 6, MAXW = 1200;
  const T = () => { if (!A.CFG.consentTpl || typeof A.CFG.consentTpl !== 'object') A.CFG.consentTpl = {}; return A.CFG.consentTpl; };
  const canEdit = () => !A.isMember || !A.isMember() || ['admin', 'profesional'].indexOf(A.mbRole ? A.mbRole() : '') >= 0;

  /* los archivos (páginas en imagen) viajan por la nube como registros propios cf:<id>; los ya firmados los siguen necesitando, por eso nunca se borran */
  let CF = null, CFK = '';
  const key = () => 'odontovoz.cf.v1.' + ((A.ownerId && A.ownerId()) || 'x');
  const load = () => { const k = key(); if (CF && CFK === k) return CF; CFK = k; try { CF = JSON.parse(LS.get(k, '{}')) || {}; } catch (e) { CF = {}; } return CF; };
  const store = () => { load(); return LS.set(CFK, JSON.stringify(CF)); };
  const xPrev = A.cloudExtra, kPrev = A.cloudExtraKeys;
  A.cloudExtra = k => /^cf:/.test(String(k)) ? { get: () => load()[k.slice(3)] || null, set: v => { if (v && typeof v === 'object') { load()[k.slice(3)] = v; store(); } } } : (xPrev ? xPrev(k) : null);
  A.cloudExtraKeys = () => Object.keys(load()).map(id => 'cf:' + id).concat(kPrev ? kPrev() : []);
  A.cfGet = id => load()[id] || null;

  /* ---------- subir un PDF o una foto como consentimiento ---------- */
  const toJpg = file => new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { const k = Math.min(1, MAXW / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.72)); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); }; im.src = url;
  });
  const pick = MF.consentPick;
  MF.consentPick = function (m) {
    const h = pick.apply(this, arguments); if (typeof h !== 'string' || !canEdit()) return h;
    const mark = '<button class="btn small" data-act="consentNew">+ Nuevo consentimiento</button>';
    if (h.indexOf(mark) < 0) return h;
    return h.replace(mark, mark + '<label class="btn small" for="cfFile">+ Desde un PDF o una foto</label><input type="file" id="cfFile" accept="application/pdf,image/*" hidden data-chg="cfFile">');
  };
  A.chg.cfFile = async el => {
    const f = el.files && el.files[0]; el.value = ''; if (!f) return;
    A.toast('Leyendo el archivo…');
    try {
      const isPdf = /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name);
      const files = isPdf ? (A.pdfPages ? await A.pdfPages(f) : []) : [f];
      if (!files.length) throw new Error('vacio');
      const pages = []; for (const x of files.slice(0, MAXP)) pages.push(await toJpg(x));
      const id = A.uid(), hash = A.sha ? await A.sha(pages.join('|')) : String(pages.length);
      load()[id] = { id, name: f.name, pages, hash, at: new Date().toISOString() };
      if (!store()) { delete load()[id]; A.toast('No hay espacio para guardar ese archivo. Probá con uno más chico.'); return; }
      S.modal = { type: 'cfNew', id, name: f.name, n: pages.length, cut: isPdf && files.length > MAXP, pid: (S.modal && S.modal.pid) || S.fichaPid }; A.renderModal();
    } catch (e) { A.toast(isPdfErr(e) ? 'No se pudo leer el PDF (hace falta internet la primera vez). Probá con una foto.' : 'No se pudo leer el archivo.'); }
  };
  const isPdfErr = e => /pdfjs/i.test(String(e && e.message));
  MF.cfNew = m => A.modalShell('Consentimiento desde un archivo',
    '<p class="m-lead">Archivo: <b>' + esc(m.name) + '</b> · ' + m.n + ' página' + (m.n === 1 ? '' : 's') + (m.cut ? ' (se guardaron las primeras ' + MAXP + ')' : '') + '</p>' +
    '<div class="field"><label for="cfT">Nombre del consentimiento</label><input id="cfT" value="' + esc(String(m.name).replace(/\.[^.]+$/, '')) + '"></div>' +
    '<p class="hint">Queda en tu lista de consentimientos. Para firmarlo, el paciente lo lee en pantalla y firma; el PDF final lleva las páginas del documento y la hoja de firmas.</p><div id="cfMsg" class="hint bad"></div>',
    '<button class="btn" data-act="cfNewBack">Cancelar</button><button class="btn primary" data-act="cfNewSave">Guardar</button>');
  A.acts.cfNewBack = () => { const m = S.modal; S.modal = { type: 'consentPick', pid: m.pid }; A.renderModal(); };
  A.acts.cfNewSave = () => {
    const m = S.modal, t = ($('#cfT') || {}).value.trim(), f = load()[m.id]; if (!t) { $('#cfMsg').textContent = 'Ponele un nombre.'; return; }
    T()['c_' + m.id.slice(0, 6)] = { title: t, file: { id: m.id, name: f.name, n: f.pages.length, hash: f.hash } };
    A.save(); A.toast('Guardado en tu lista de consentimientos.'); A.acts.cfNewBack();
  };

  /* ---------- editar o borrar uno de archivo ---------- */
  const edPrev = A.acts.consentEd;
  A.acts.consentEd = function (el) {
    const k = el.getAttribute('data-k'), o = T()[k];
    if (o && o.file) { S.modal = { type: 'cfEd', key: k, pid: (S.modal && S.modal.pid) || S.fichaPid, title: o.title }; A.renderModal(); return; }
    return edPrev.apply(this, arguments);
  };
  MF.cfEd = m => A.modalShell('Consentimiento desde un archivo',
    '<div class="field"><label for="cfT2">Nombre</label><input id="cfT2" value="' + esc(m.title) + '"></div><p class="hint">Si hay que cambiar el documento, subí uno nuevo con «+ Desde un PDF o una foto» y borrá este. Lo ya firmado no se pierde.</p>',
    '<button class="btn" data-act="cfNewBack">Volver</button><button class="btn danger" data-act="cfDel">' + (m.delAsk ? '¿Seguro? Borrar' : 'Borrar de la lista') + '</button><button class="btn primary" data-act="cfRen">Guardar nombre</button>');
  A.acts.cfRen = () => { const m = S.modal, t = ($('#cfT2') || {}).value.trim(); if (!t) return; T()[m.key].title = t; A.save(); A.toast('Guardado.'); A.acts.cfNewBack(); };
  A.acts.cfDel = () => { const m = S.modal; if (!m.delAsk) { m.title = ($('#cfT2') || {}).value || m.title; m.delAsk = true; A.renderModal(); return; } delete T()[m.key]; A.save(); A.toast('Borrado de la lista (lo firmado no cambia).'); A.acts.cfNewBack(); };

  /* ---------- el cuerpo del documento y cómo se lee ---------- */
  const bodyPrev = A.consentBody;
  A.consentBody = function (pid, tpl) {
    const o = T()[tpl];
    if (o && o.file) return { title: 'Consentimiento informado · ' + o.title, lead: 'Documento adjunto: ' + o.file.name, file: o.file,
      sections: [{ h: 'Documento', p: 'El paciente lee el documento (' + o.file.n + ' página' + (o.file.n === 1 ? '' : 's') + ') y firma al final. Huella del archivo: ' + String(o.file.hash).slice(0, 16) + '…' }] };
    return bodyPrev.apply(this, arguments);
  };
  const pagesHTML = f => { const d = f && load()[f.id]; if (!d) return '<div class="hint warn">El archivo de este documento todavía no está en este equipo. Esperá a que sincronice.</div>'; return '<div class="cf-pages">' + d.pages.map((p, i) => '<img alt="Página ' + (i + 1) + '" src="' + p + '">').join('') + '</div>'; };
  const signPrev = MF.sign;
  MF.sign = function (m) {
    let h = signPrev.apply(this, arguments); if (typeof h !== 'string' || !m || !m.body || !m.body.file) return h;
    h = h.replace(/<div class="row-btns se-open">[\s\S]*?<\/div>/, '');
    if (m.step === 0) h = h.replace('<div class="docpaper">', pagesHTML(m.body.file) + '<div class="docpaper">');
    return h;
  };
  const viewPrev = MF.docView;
  MF.docView = function (m) {
    let h = viewPrev.apply(this, arguments); if (typeof h !== 'string') return h;
    const d = (A.pd(m.pid).docs || []).filter(x => x.id === m.id)[0]; if (!d || !d.body || !d.body.file) return h;
    return h.replace('<div class="docpaper">', pagesHTML(d.body.file) + '<div class="docpaper">');
  };

  /* ---------- el PDF final: las páginas del documento + la hoja de firmas ---------- */
  const pdfPrev = A.pdfOfDoc;
  A.pdfOfDoc = function (pid, d) {
    if (!d || !d.body || !d.body.file) return pdfPrev.apply(this, arguments);
    const pat = A.PAT(pid), o = A.pdfDoc_ && A.pdfDoc_(d.title); if (!o) return;
    const f = load()[d.body.file.id], jd = o.d; let ok = false;
    if (f && Array.isArray(f.pages)) {
      f.pages.forEach((src, i) => {
        try { const pr = jd.getImageProperties(src), W = 210, H = 297, M = 6, k = Math.min((W - 2 * M) / pr.width, (H - 2 * M - 8) / pr.height), w = pr.width * k, hh = pr.height * k; if (i > 0) jd.addPage(); jd.addImage(src, 'JPEG', (W - w) / 2, M, w, hh); ok = true; } catch (e) { /* sigue */ }
      });
    }
    if (ok) jd.addPage(); o.y = 16;
    o.head(d.title, 'Hoja de firmas', pat, '');
    o.p('Documento firmado: ' + d.body.file.name + ' (' + d.body.file.n + ' página' + (d.body.file.n === 1 ? '' : 's') + '). Huella del archivo: ' + d.body.file.hash + '.' + (ok ? '' : ' (El documento original no está disponible en este equipo; la huella permite verificarlo.)'), 9);
    o.y += 2; o.sigs(d.sigs.map(s => ({ role: s.role + (s.rel ? ' (' + s.rel + ')' : ''), name: s.name, dni: s.dni, mat: s.mat, strokes: s.strokes, ts: s.ts })));
    o.need(30); o.h(d.status === 'revocado' ? 'Documento REVOCADO' : 'Sello de integridad'); o.p('SHA-256: ' + d.hash, 8);
    if (d.status === 'revocado' && d.rev) o.p('Revocado el ' + d.rev.ts + '. Motivo: ' + d.rev.reason, 9);
    o.h('Registro de auditoría'); (d.audit || []).forEach(a => o.p(a.ts.slice(0, 16).replace('T', ' ') + ' · ' + a.ev + ' · ' + a.detail, 8));
    o.p('Firma electrónica simple (Ley 25.506, art. 5). La huella permite verificar que el contenido no fue alterado después de firmar.', 8);
    return o.finish(String(d.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + String(pat.last || pat.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + String(d.sealedAt).slice(0, 10) + '.pdf');
  };

  const css = document.createElement('style'); css.id = 'ovApp136';
  css.textContent = '.cf-pages{display:flex;flex-direction:column;gap:8px;margin:0 0 10px;max-height:60vh;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:6px;background:var(--surface-2)}.cf-pages img{width:100%;height:auto;border-radius:6px;display:block;background:#fff}';
  document.head.appendChild(css);
})();
