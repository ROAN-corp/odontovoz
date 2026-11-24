/* ===== 1.26: matrícula, sello y firma de cada profesional (firma electrónica registrada), ficha FORN sellada al presentarla, nota de presentación y código de verificación ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc, $ = q => document.querySelector(q);
  /* ---------- SHA-256 (síncrono, para los códigos de verificación) ---------- */
  const K = (() => { const k = [], p = []; for (let c = 2; k.length < 64; c++) { if (p.every(q => c % q)) { p.push(c); k.push(Math.floor((Math.pow(c, 1 / 3) % 1) * 4294967296)); } } return k; })();
  const H0 = (() => { const h = [], p = []; for (let c = 2; h.length < 8; c++) { if (p.every(q => c % q)) { p.push(c); h.push(Math.floor((Math.pow(c, 0.5) % 1) * 4294967296)); } } return h; })();
  function sha256(str) {
    const b = unescape(encodeURIComponent(String(str))), l = b.length, w = new Array(64), h = H0.slice(), m = [];
    for (let i = 0; i < l; i++) m[i >> 2] |= b.charCodeAt(i) << (24 - (i % 4) * 8);
    m[l >> 2] |= 0x80 << (24 - (l % 4) * 8); m[(((l + 8) >> 6) << 4) + 15] = l * 8;
    const rot = (x, n) => (x >>> n) | (x << (32 - n));
    for (let i = 0; i < m.length; i += 16) {
      for (let j = 0; j < 64; j++) {
        if (j < 16) w[j] = m[i + j] | 0; else { const s0 = rot(w[j - 15], 7) ^ rot(w[j - 15], 18) ^ (w[j - 15] >>> 3), s1 = rot(w[j - 2], 17) ^ rot(w[j - 2], 19) ^ (w[j - 2] >>> 10); w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0; }
      }
      let [a, bb, c, d, e, f, g, hh] = h;
      for (let j = 0; j < 64; j++) {
        const t1 = (hh + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[j] + w[j]) | 0, t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + bb) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0; h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    return h.map(x => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
  }
  A.sha256 = sha256;
  const grp = h => h.slice(0, 16).toUpperCase().replace(/(.{4})(?=.)/g, '$1-');
  const dmy = d => (d ? A.fmtDMY(String(d).slice(0, 10)) : '');
  const hm = iso => { try { const t = new Date(iso); return dmy(iso) + ' ' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'); } catch (e) { return dmy(iso); } };
  const canCfg = () => !A.isMember || !A.isMember() || (A.mbRole && A.mbRole() === 'admin');

  /* ---------- matrícula, sello y firma del profesional ---------- */
  const SLOTS = [['sello', 'Sello', 'Foto del sello sobre papel blanco. El fondo se quita solo.'], ['firma', 'Firma', 'Foto de la firma sobre papel blanco. El fondo se quita solo.'], ['matFoto', 'Foto de la matrícula', 'Foto del carnet o certificado de matrícula (solo para el registro).']];
  const loadImg = file => new Promise((ok, no) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); ok(im); }; im.onerror = () => { URL.revokeObjectURL(u); no(new Error('No se pudo leer la imagen.')); }; im.src = u; });
  function toInk(im) {
    const mx = 700, r = Math.min(1, mx / Math.max(im.width, im.height)), w = Math.max(1, Math.round(im.width * r)), h = Math.max(1, Math.round(im.height * r));
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h);
    const id = x.getImageData(0, 0, w, h), d = id.data; let sr = 0, sg = 0, sb = 0, n = 0, bgs = [];
    for (let i = 0; i < d.length; i += 4) bgs.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    const sorted = bgs.slice().sort((a, b) => a - b), paper = sorted[Math.floor(sorted.length * 0.9)] || 255, cut = Math.max(120, paper - 18);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) { const l = bgs[p]; if (l < cut) { sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; n++; } }
    const ir = n ? sr / n : 20, ig = n ? sg / n : 20, ib = n ? sb / n : 80; let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const l = bgs[p], a = l >= cut ? 0 : Math.min(255, Math.round((cut - l) * 3.4 / 16) * 16);
      d[i] = ir; d[i + 1] = ig; d[i + 2] = ib; d[i + 3] = a;
      if (a > 30) { const px = p % w, py = (p / w) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
    }
    if (x1 <= x0 || y1 <= y0) return null;
    x.putImageData(id, 0, 0); const pad = 4; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height); return o.toDataURL('image/png');
  }
  function toJpg(im) { const mx = 900, r = Math.min(1, mx / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * r); c.height = Math.round(im.height * r); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.62); }
  const stampReg = p => { const a = A.actor ? A.actor() : { who: '' }, cr = p.cred || {}; cr.at = new Date().toISOString(); cr.by = a.who || ''; cr.h = sha256((cr.sello || '') + '|' + (cr.firma || '') + '|' + (cr.matFoto || '') + '|' + (p.mat || '')); p.cred = cr; };
  A.chg.credFile = async el => {
    const id = el.getAttribute('data-id'), k = el.getAttribute('data-k'), p = A.PRO(id), f = el.files && el.files[0]; if (!p || !f) return;
    try {
      const im = await loadImg(f), out = k === 'matFoto' ? toJpg(im) : toInk(im);
      if (!out) { A.toast('No encontré ' + (k === 'sello' ? 'el sello' : 'la firma') + ' en la foto. Probá con más luz y papel blanco.'); return; }
      p.cred = p.cred || {}; p.cred[k] = out; stampReg(p); A.save(); if (A.empAudit) { try { A.empAudit('Cargó ' + (k === 'sello' ? 'el sello' : k === 'firma' ? 'la firma' : 'la foto de la matrícula') + ' de ' + (p.name || id) + '.'); } catch (e) { /* nada */ } }
      A.toast('Listo: quedó registrado.'); A.renderModal();
    } catch (e) { A.toast(e.message || 'No se pudo cargar la foto.'); }
  };
  A.acts.credDel = el => { const id = el.getAttribute('data-id'), k = el.getAttribute('data-k'), p = A.PRO(id); if (!p || !p.cred) return; delete p.cred[k]; if (p.cred.sello || p.cred.firma || p.cred.matFoto) stampReg(p); else delete p.cred; A.save(); A.renderModal(); };
  function credHTML(id) {
    const p = A.PRO(id), cr = (p && p.cred) || {};
    let h = '<div class="block"><h3>Matrícula, sello y firma</h3><div class="hint">Se cargan una sola vez y se estampan solos en las fichas FORN y en la nota de presentación. Quedan registrados con fecha y quién los cargó: es la <b>firma electrónica</b> del profesional (Ley 25.506, art. 5).</div>';
    SLOTS.forEach(s => {
      const v = cr[s[0]];
      h += '<div class="cr-slot"><div class="cr-img">' + (v ? '<img alt="' + esc(s[1]) + '" src="' + v + '">' : '<span>Sin cargar</span>') + '</div><div class="cr-in"><b>' + s[1] + '</b><small>' + s[2] + '</small><div class="row-btns"><label class="btn small' + (v ? '' : ' primary') + '" for="cr-' + s[0] + '">' + (v ? 'Cambiar' : 'Subir o sacar foto') + '</label><input type="file" id="cr-' + s[0] + '" class="cr-file" accept="image/*" data-chg="credFile" data-id="' + esc(id) + '" data-k="' + s[0] + '">' + (v ? '<button class="btn small ghost" data-act="credDel" data-id="' + esc(id) + '" data-k="' + s[0] + '">Quitar</button>' : '') + '</div></div></div>';
    });
    h += (cr.at ? '<div class="hint">Registrado el ' + esc(hm(cr.at)) + (cr.by ? ' por ' + esc(cr.by) : '') + ' · huella ' + esc(grp(cr.h || '')) + '</div>' : '<div class="hint warn">Todavía no hay sello ni firma registrados: las fichas FORN salen con el recuadro vacío.</div>') + (p && p.mat ? '' : '<div class="hint warn">Falta la matrícula (número) más arriba.</div>') + '</div>';
    return h;
  }
  const cfgPrev = MF.cfg;
  if (cfgPrev) MF.cfg = m => {
    const h = cfgPrev(m);
    if (!m || m.tab !== 'pros' || !m.sel || m.wiz || m.rm || !canCfg() || !A.PRO(m.sel) || typeof h !== 'string') return h;
    const mark = '<div class="block"><h3>Días y horarios de atención</h3>'; return h.indexOf(mark) < 0 ? h : h.replace(mark, credHTML(m.sel) + mark);
  };

  /* ---------- código de verificación y sello de cada ficha ---------- */
  const canon = (f, p) => JSON.stringify({ id: f.id, mes: f.mes, pro: f.pro, p: [(p && p.last) || '', (p && p.first) || '', (p && p.dni) || ''], afil: f.afil || '', os: f.os || '', addr: f.addr || '', loc: f.loc || '', tel: f.tel || '', birth: f.birth || '', rows: (f.rows || []).map(r => [r.fecha || '', r.pieza || '', r.cara || '', r.cod || '', r.desc || '']), obs: f.obs || '', sig: f.sig ? sha256(f.sig) : '', sigAt: f.sigAt || '' });
  const hashOf = (f, p) => sha256(canon(f, p));
  A.frnIsSealed = f => !!(f && f.seal && f.seal.h);
  A.frnCode = (f, p) => grp(A.frnIsSealed(f) ? f.seal.h : hashOf(f, p));
  A.frnSeal = (f, p) => { if (A.frnIsSealed(f)) return; const a = A.actor ? A.actor() : { who: '' }, snap = { last: (p && p.last) || '', first: (p && p.first) || '', dni: (p && p.dni) || '' }; f.seal = { h: hashOf(f, snap), at: new Date().toISOString(), by: a.who || '', p: snap }; };
  A.frnIntact = f => A.frnIsSealed(f) && hashOf(f, f.seal.p) === f.seal.h;
  A.frnLote = L => grp(sha256(L.map(x => (A.frnIsSealed(x.f) ? x.f.seal.h : hashOf(x.f, x.p))).sort().join('|')));

  /* la ficha sellada se ve sin poder tocarse; si hay un error, se hace una ficha de corrección */
  const edPrev = MF.frnEd;
  if (edPrev) MF.frnEd = m => {
    let h = edPrev(m); const f = A.frnFicha && A.frnFicha(m.pid, m.id); if (typeof h !== 'string' || !f || !A.frnIsSealed(f)) return h;
    const ok = A.frnIntact(f), ban = '<div class="frn-seal' + (ok ? '' : ' bad') + '"><b>' + (ok ? '🔒 Ficha sellada' : '⚠ Atención: esta ficha cambió después de sellarse') + '</b><span>Presentada el ' + esc(hm(f.seal.at)) + (f.seal.by ? ' por ' + esc(f.seal.by) : '') + '. Código de verificación <b>' + esc(grp(f.seal.h)) + '</b>.' + (ok ? ' Ya no se puede modificar. Si hay un error, hacé una ficha de corrección.' : '') + '</span><button class="btn small" data-act="frnCorr" data-pid="' + esc(m.pid || '') + '" data-id="' + esc(m.id) + '">Hacer una ficha de corrección</button></div>';
    h = h.replace(/<(input|select|textarea)\b/g, '<$1 disabled'); const at = h.indexOf('<div class="m-body"'); const ins = at >= 0 ? h.indexOf('>', at) + 1 : -1; return ins > 0 ? h.slice(0, ins) + ban + h.slice(ins) : ban + h;
  };
  A.acts.frnCorr = el => {
    const pid = el.getAttribute('data-pid') || null, id = el.getAttribute('data-id'), f = A.frnFicha(pid, id); if (!f) return;
    const n = JSON.parse(JSON.stringify(f)); n.id = A.uid(); delete n.seal; delete n.presAt; n.estado = 'borrador'; n.corrige = f.id; n.obs = (n.obs ? n.obs + ' · ' : '') + 'Corrige la ficha ' + A.frnCode(f).slice(0, 9) + '.'; n.at = new Date().toISOString();
    A.frnList(pid).push(n); if (pid) A.touchPd(pid); else if (A.frnFreeSave) A.frnFreeSave(); A.frnOpenEd(pid, n.id); A.toast('Ficha de corrección creada: la original queda sellada.');
  };

  /* ---------- en el PDF: sello y firma del profesional, nota de presentación ---------- */
  function fit(d, data, x, y, w, h, fmt) { try { const pr = d.getImageProperties(data), r = Math.min(w / pr.width, h / pr.height), iw = pr.width * r, ih = pr.height * r; d.addImage(data, fmt || 'PNG', x + (w - iw) / 2, y + (h - ih) / 2, iw, ih, undefined, 'FAST'); } catch (e) { /* nada */ } }
  A.frnStamp = (d, pr, f) => { const cr = (pr && pr.cred) || {}; if (cr.firma) fit(d, cr.firma, 174, 92, 52, 17); if (cr.sello) fit(d, cr.sello, 230, 91, 54, 19); };
  A.frnCover = (d, mes, L, pro) => {
    const by = {}; L.forEach(x => { (by[x.f.pro || ''] = by[x.f.pro || ''] || []).push(x); });
    Object.keys(by).forEach(pid => {
      const items = by[pid], P = A.PRO(pid) || {}, cr = P.cred || {}, MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'], mt = MES[+mes.slice(5) - 1] + ' de ' + mes.slice(0, 4);
      d.addPage('a4', 'landscape'); d.setTextColor(20, 20, 20); d.setFont('helvetica', 'bold'); d.setFontSize(16); d.text('Nota de presentación mensual · FORN', 10, 18);
      d.setFont('helvetica', 'normal'); d.setFontSize(10);
      const txt = 'Quien suscribe, ' + (P.name || '') + (P.mat ? ', Matrícula Profesional N° ' + P.mat : '') + ', declara que ' + (items.length === 1 ? 'la ficha incluida' : 'las ' + items.length + ' fichas incluidas') + ' en este archivo, correspondientes a ' + mt + ', se refieren a prestaciones realizadas por el/la suscripto/a, que los datos consignados son veraces y que cada ficha cuenta con la conformidad del paciente mediante su firma electrónica (Ley 25.506, art. 5) cuando así se indica. Las fichas se sellan al presentarse: no pueden modificarse y cualquier corrección se hace con una ficha de corrección nueva. Cada ficha lleva un código de verificación; si el archivo o una ficha se alteran, el código deja de coincidir.';
      d.text(d.splitTextToSize(txt.replace(/[−–—]/g, '-'), 277), 10, 28);
      d.setFont('helvetica', 'bold'); d.setFontSize(9); d.text('Código del lote: ' + A.frnLote(items), 10, 60); d.setFont('helvetica', 'normal'); d.text('Armada el ' + hm(new Date().toISOString()) + ' con OdontoVoz · ' + (A.CLINIC || ''), 10, 65);
      d.setDrawColor(150, 160, 165); d.rect(180, 50, 107, 46); d.setFontSize(8); d.setFont('helvetica', 'bold'); d.text('FIRMA Y SELLO DEL PROFESIONAL', 183, 55); d.setFont('helvetica', 'normal');
      if (cr.firma) fit(d, cr.firma, 183, 57, 50, 22); if (cr.sello) fit(d, cr.sello, 235, 57, 50, 24);
      d.setFontSize(7); d.setTextColor(90, 100, 105); d.text(cr.at ? 'Firma y sello electrónicos registrados el ' + hm(cr.at) + (cr.by ? ' por ' + cr.by : '') : 'Este profesional no tiene sello ni firma registrados.', 183, 92); d.setTextColor(20, 20, 20);
      let y = 78, k = 0; d.setFont('helvetica', 'bold'); d.setFontSize(8.5); d.text('Ficha · paciente', 10, y); d.text('Código de verificación', 92, y); d.text('Estado', 142, y); d.setFont('helvetica', 'normal'); d.line(10, y + 1.5, 175, y + 1.5); y += 6;
      items.forEach((it, i) => { if (y > 196) { d.addPage('a4', 'landscape'); y = 16; } d.setFontSize(8.5); d.text(String(i + 1) + '. ' + String((it.p.last || '') + ', ' + (it.p.first || '')).replace(/[−–—]/g, '-').slice(0, 48), 10, y); d.text(A.frnCode(it.f, it.p), 92, y); d.text(A.frnIsSealed(it.f) ? 'Sellada' : 'Se sella al presentar', 142, y); y += 5; k++; });
    });
  };

  const css = document.createElement('style');
  css.textContent = '.cr-slot{display:flex;gap:10px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:8px;margin:8px 0;background:var(--surface-2)}.cr-img{width:110px;height:64px;flex:0 0 auto;border-radius:8px;border:1px dashed var(--line);display:flex;align-items:center;justify-content:center;background:var(--surface);overflow:hidden}.cr-img img{max-width:100%;max-height:100%}.cr-img span{font-size:.75rem;color:var(--ink-2)}' +
    '.cr-in{display:flex;flex-direction:column;gap:3px;min-width:0}.cr-in small{color:var(--ink-2);font-size:.78rem}.cr-file{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}.frn-seal{display:flex;flex-direction:column;gap:4px;border:1px solid var(--accent);background:var(--accent-soft);border-radius:12px;padding:10px 12px;margin:0 0 10px}.frn-seal.bad{border-color:var(--red)}.frn-seal span{font-size:.85rem;color:var(--ink-2)}';
  document.body.appendChild(css);
})();
