/* ===== 1.2: colaboraciones (casas de insumos aliadas) que administran los creadores de OdontoVoz desde la app ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const CL = () => A.cloud;
  const DOW = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const DOWS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const COLS = 'id,name,kind,active,rank,exclusive,logo,url,branches,benefit,show,updated_at';
  const CACHE = 'odontovoz.partners';

  /* =====================================================================
     1. LEER LAS COLABORACIONES (cualquier app, con o sin sesión; se guardan para usarlas sin internet)
     ===================================================================== */
  let list = []; try { const c = JSON.parse(LS.get(CACHE, 'null')); if (c && Array.isArray(c.list)) list = c.list; } catch (e) { /* nada */ }
  let lastFetch = 0, fetching = null;
  A.partnersLoad = (force) => {
    const cl = CL(); if (!cl || !cl.http || fetching) return fetching;
    if (!force && Date.now() - lastFetch < 3 * 3600e3) return Promise.resolve(list);
    lastFetch = Date.now();
    fetching = cl.http('/rest/v1/ov_partners?select=' + COLS + '&active=eq.true&order=rank.asc,name.asc', { auth: false })
      .then(d => { if (Array.isArray(d)) { list = d; LS.set(CACHE, JSON.stringify({ at: Date.now(), list })); paintAll(); } return list; })
      .catch(() => list).finally(() => { fetching = null; });
    return fetching;
  };
  if (A._partners) list = A._partners; /* para pruebas */
  const shown = (p, where) => p && p.active && (!p.show || p.show[where] !== false);
  /* la casa de insumos principal (la primera activa) */
  A.partnerMain = (where) => { const L = A._partners || list; return L.filter(p => p.kind === 'insumos' && shown(p, where || 'stock')).sort((a, b) => (a.rank || 0) - (b.rank || 0))[0] || null; };

  /* el beneficio de hoy: % y si vale hoy (días de la semana y fechas desde/hasta) */
  A.partnerBenefit = (p, d) => {
    const b = (p && p.benefit) || {}, pct = +b.pct || 0; if (!pct && !b.text) return null;
    d = d || A.today(); const dow = new Date(d + 'T12:00:00').getDay();
    const days = Array.isArray(b.days) ? b.days.map(Number) : [];
    const inRange = (!b.from || d >= b.from) && (!b.to || d <= b.to);
    const today = inRange && (!days.length || days.indexOf(dow) >= 0);
    const when = days.length ? (days.length === 1 ? 'los ' + DOW[days[0]].toLowerCase() + (/s$/.test(DOW[days[0]]) ? '' : 's') : 'los ' + days.map(x => DOW[x].toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' y $1')) : 'todos los días';
    const txt = b.text || (pct ? pct + '% de descuento ' + when : '');
    return { pct, today, when, txt, label: today ? (pct ? 'Hoy ' + pct + '% de descuento' : txt) : txt, range: inRange };
  };

  /* =====================================================================
     2. DÓNDE APARECE: pedido de stock, aviso del inicio y pie del menú
     ===================================================================== */
  const logoImg = (p, cls) => p.logo ? '<img class="' + cls + '" src="' + esc(p.logo) + '" alt="' + esc(p.name) + '">' : '<b class="' + cls + ' pt-noimg">' + esc(p.name) + '</b>';
  const waNum = n => String(n || '').replace(/\D/g, '');
  /* en el pedido: la casa aliada primero, con su beneficio; abajo, en chiquito, otro proveedor */
  A.partnerBuyHTML = (text) => {
    const p = A.partnerMain('stock'); if (!p) return null;
    const br = (p.branches || []).filter(b => waNum(b.wa)); if (!br.length) return null;
    const pick = Math.min(+(LS.get('odontovoz.ptBranch.' + p.id, '0')) || 0, br.length - 1);
    const bn = A.partnerBenefit(p);
    let h = '<div class="pt-order"><div class="pt-head">' + logoImg(p, 'pt-logo') + '<div><span class="pt-tag">Proveedor recomendado</span><b>Pedir a ' + esc(p.name) + '</b>' + (bn ? '<small class="pt-ben' + (bn.today ? ' on' : '') + '">🏷️ ' + esc(bn.today ? bn.label + ' para usuarios de OdontoVoz' : 'Beneficio OdontoVoz: ' + bn.txt) + '</small>' : '') + '</div></div>';
    if (br.length > 1) h += '<div class="pt-br">Sucursal: ' + br.map((b, i) => '<button type="button" class="pt-c' + (i === pick ? ' on' : '') + '" data-act="ptBranch" data-p="' + esc(p.id) + '" data-i="' + i + '">' + esc(b.name || 'Sucursal ' + (i + 1)) + '</button>').join('') + '</div>';
    h += '<button type="button" class="pt-go" data-act="ptSend" data-p="' + esc(p.id) + '">💬 Enviar el pedido a ' + esc(p.name) + '</button><p class="pt-note">Le llega armado por WhatsApp, con cada insumo y la cantidad' + (bn && bn.today && bn.pct ? ', y con el beneficio de hoy anotado' : '') + '. Antes de mandarlo lo podés revisar.</p></div>';
    h += '<div class="pt-other"><a target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(text) + '">Mandar a otro proveedor</a><button type="button" class="linkbtn" data-act="stkBuyCopy">Copiar el pedido</button></div>';
    return h;
  };
  A.acts.ptBranch = el => { LS.set('odontovoz.ptBranch.' + el.getAttribute('data-p'), el.getAttribute('data-i')); A.renderModal(); };
  A.partnerOrderText = (p, text) => {
    const bn = A.partnerBenefit(p);
    return text + '\n\nPedido desde OdontoVoz' + (bn && bn.today && bn.pct ? ' · Beneficio OdontoVoz: ' + bn.pct + '% de descuento (' + bn.when + ')' : '');
  };
  A.acts.ptSend = el => {
    const p = (A._partners || list).filter(x => x.id === el.getAttribute('data-p'))[0]; if (!p) return;
    const br = (p.branches || []).filter(b => waNum(b.wa)), i = Math.min(+(LS.get('odontovoz.ptBranch.' + p.id, '0')) || 0, br.length - 1), b = br[i]; if (!b) return;
    let n = waNum(b.wa); if (!/^54/.test(n)) n = '549' + n.replace(/^0/, '');
    const url = 'https://wa.me/' + n + '?text=' + encodeURIComponent(A.partnerOrderText(p, A.stkBuyText ? A.stkBuyText() : ''));
    A._ptLast = url; window.open(url, '_blank');
  };

  /* aviso del inicio: solo cuando falta algo */
  const homeAlert = () => {
    const v = document.getElementById('view-inicio'); if (!v) return;
    const old = v.querySelector('.pt-alert'), p = A.partnerMain('home'), low = p && A.stkLowList ? A.stkLowList() : [];
    const hiddenTill = +LS.get('odontovoz.ptHide', '0') || 0;
    if (!p || !low.length || Date.now() < hiddenTill || !(p.branches || []).some(b => waNum(b.wa))) { if (old) old.remove(); return; }
    const names = low.slice(0, 5).map(i => String(i.name).split(' (')[0].toLowerCase());
    const bn = A.partnerBenefit(p);
    const html = '<div class="pt-alert" role="status"><span class="pt-ai" aria-hidden="true">📦</span><div class="pt-at"><b>Te falta' + (low.length === 1 ? ' 1 insumo' : 'n ' + low.length + ' insumos') + '</b><small>' + esc(A.cap ? A.cap(names.join(', ')) : names.join(', ')) + (low.length > 5 ? '…' : '') + (bn && bn.today && bn.pct ? ' · hoy ' + bn.pct + '% en ' + esc(p.name) : '') + '</small></div>' +
      '<button type="button" class="pt-ab" data-act="ptStock">' + logoImg(p, 'pt-mini') + 'Pedir a ' + esc(p.name) + '</button><button type="button" class="pt-x" data-act="ptHide" aria-label="Ocultar por hoy">×</button></div>';
    const at = v.querySelector('.nw-card') || v.querySelector('.home-actions') || v.querySelector('.home-hi');
    if (old && old.outerHTML === html && (!at || old.previousElementSibling === at)) return;
    if (old) old.remove(); if (at) at.insertAdjacentHTML('afterend', html);
  };
  A.acts.ptStock = () => A.acts.stkOpen && A.acts.stkOpen({ getAttribute: k => (k === 'data-t' ? 'comprar' : null) });
  A.acts.ptHide = () => { const d = new Date(); d.setHours(23, 59, 59, 0); LS.set('odontovoz.ptHide', String(d.getTime())); homeAlert(); };

  /* pie del menú: «En colaboración con» y el logo */
  const menuFoot = () => {
    const foot = document.querySelector('#gearMenu .dr-foot'); if (!foot) return;
    const old = document.querySelector('#gearMenu .pt-foot'), p = A.partnerMain('menu');
    if (!p) { if (old) old.remove(); }
    else {
      const html = '<div class="pt-foot"><span>En colaboración' + (p.exclusive ? ' exclusiva' : '') + ' con</span>' + (p.url ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + logoImg(p, 'pt-flogo') + '</a>' : logoImg(p, 'pt-flogo')) + '</div>';
      if (old) { if (old.outerHTML !== html) old.outerHTML = html; } else foot.insertAdjacentHTML('beforebegin', html);
    }
    /* debajo de «Stock de insumos»: a quién se le pide */
    const st = document.querySelector('.dnav[data-act="stkOpen"] .t'), ps = A.partnerMain('stock');
    if (st) { const sm = st.querySelector('.pt-sub'); if (ps && !sm) st.insertAdjacentHTML('beforeend', '<small class="pt-sub">Pedidos a ' + esc(ps.name) + '</small>'); else if (!ps && sm) sm.remove(); else if (ps && sm && sm.textContent !== 'Pedidos a ' + ps.name) sm.textContent = 'Pedidos a ' + ps.name; }
  };
  function paintAll() { try { homeAlert(); menuFoot(); creatorEntry(); } catch (e) { /* nada */ } }
  const arPrev = A.afterRefresh; A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; paintAll(); A.partnersLoad(); checkCreator(); return r; };
  setTimeout(() => { A.partnersLoad(true); paintAll(); }, 1200);

  /* =====================================================================
     3. PANEL DE CREADORES (solo las cuentas de ov_admins: Rodrigo y Angel)
     ===================================================================== */
  let creator = null, creatorFor = '';
  const checkCreator = () => {
    const cl = CL(), uid = cl && cl.session && cl.session.user && cl.session.user.id;
    if (A._creator != null) { creator = !!A._creator; return; }
    if (!uid) { creator = false; creatorFor = ''; return; }
    if (creatorFor === uid) return; creatorFor = uid;
    const k = 'odontovoz.creator.' + uid, c = LS.get(k, ''); if (c) creator = c === '1';
    cl.api('/rest/v1/rpc/ov_is_admin', { method: 'POST', body: {} }).then(v => { creator = v === true; LS.set(k, creator ? '1' : '0'); creatorEntry(); }).catch(() => { /* nada */ });
  };
  A.isCreator = () => !!(A._creator != null ? A._creator : creator);
  const creatorEntry = () => {
    const ok = A.isCreator(), btn = document.getElementById('drCreator');
    if (!ok) { if (btn) btn.remove(); return; }
    if (btn) return;
    const anchor = document.querySelector('#gearMenu .pt-foot') || document.querySelector('#gearMenu .dr-foot'); if (!anchor) return;
    anchor.insertAdjacentHTML('beforebegin', '<button class="dnav pt-cre" id="drCreator" data-act="ptPanel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.4 7.2 16.9l.9-5.4L4.2 7.7l5.4-.8z"/><path d="M5 21h14"/></svg><span class="t">Creadores de OdontoVoz<small>Colaboraciones y beneficios</small></span></button>');
  };

  A.acts.ptPanel = () => {
    if (A.hideDrawer) A.hideDrawer();
    S.modal = { type: 'ptPanel', loading: true, rows: [] }; A.renderModal();
    const done = rows => { const m = S.modal; if (!m || m.type !== 'ptPanel') return; m.loading = false; m.rows = rows || []; A.renderModal(); };
    if (A._partnersAll) { done(A._partnersAll); return; }
    CL().api('/rest/v1/rpc/ov_partners_all', { method: 'POST', body: {} }).then(done).catch(e => { const m = S.modal; if (m && m.type === 'ptPanel') { m.loading = false; m.err = /solo creadores/.test(JSON.stringify(e.data || '')) ? 'Esta cuenta no es de creador.' : /ov_partners_all|does not exist|404/.test(String(e.status) + JSON.stringify(e.data || '')) ? 'Falta correr supabase/colaboraciones.sql en Supabase.' : (e.message || 'No se pudo leer.'); A.renderModal(); } });
  };
  MF.ptPanel = m => {
    let b = '<p class="m-lead">Lo que cambies acá le llega a todas las apps en pocas horas (o al abrirlas), sin publicar una versión nueva. Solo lo ven y lo cambian los creadores.</p>';
    if (m.loading) b += '<div class="empty">Cargando…</div>';
    else if (m.err) b += '<div class="hint bad">' + esc(m.err) + '</div>';
    else if (!m.rows.length) b += '<div class="empty">Todavía no hay colaboraciones.</div>';
    else b += '<ul class="pt-list">' + m.rows.map(p => { const bn = A.partnerBenefit(p); return '<li><button type="button" data-act="ptEdit" data-id="' + esc(p.id) + '">' + logoImg(p, 'pt-lmini') + '<span><b>' + esc(p.name) + '</b><small>' + (p.active ? '<span class="pt-on">Activa</span>' : '<span class="pt-off">Apagada</span>') + (bn ? ' · ' + esc(bn.txt) : '') + (p.updated_by ? ' · cambió ' + esc(p.updated_by.split('@')[0]) + ' el ' + A.fmtDMY(String(p.updated_at).slice(0, 10)) : '') + '</small></span><span aria-hidden="true">›</span></button></li>'; }).join('') + '</ul>';
    return A.modalShell('Creadores · Colaboraciones', b, '<button class="btn" data-act="closeModal">Cerrar</button>' + (m.loading || m.err ? '' : '<button class="btn primary" data-act="ptEdit">+ Nueva colaboración</button>'));
  };
  const blank = () => ({ id: '', name: '', kind: 'insumos', active: false, rank: 0, exclusive: false, logo: '', url: '', branches: [{ name: '', wa: '' }], benefit: { pct: 0, days: [], text: '', from: null, to: null }, show: { home: true, menu: true, stock: true }, note: '' });
  A.acts.ptEdit = el => {
    const id = el && el.getAttribute && el.getAttribute('data-id'), rows = (S.modal && S.modal.rows) || [];
    const p = id ? JSON.parse(JSON.stringify(rows.filter(x => x.id === id)[0] || blank())) : blank();
    p.branches = (p.branches && p.branches.length) ? p.branches : [{ name: '', wa: '' }]; p.benefit = Object.assign({ pct: 0, days: [], text: '', from: null, to: null }, p.benefit || {}); p.show = Object.assign({ home: true, menu: true, stock: true }, p.show || {});
    S.modal = { type: 'ptEd', p, isNew: !id, rows };
    A.renderModal();
  };
  MF.ptEd = m => {
    const p = m.p, bn = A.partnerBenefit(p);
    let b = '<div class="row2"><div class="field"><label for="peN">Nombre</label><input id="peN" data-in="ptF" data-k="name" value="' + esc(p.name) + '" placeholder="Ej.: Surdental"></div><div class="field"><label for="peU">Sitio o tienda</label><input id="peU" data-in="ptF" data-k="url" value="' + esc(p.url || '') + '" placeholder="https://…"></div></div>';
    b += '<label class="chk pt-act"><input type="checkbox" data-chg="ptB" data-k="active"' + (p.active ? ' checked' : '') + '> <span><b>Activa</b> (si la apagás, desaparece de todas las apps)</span></label>';
    b += '<label class="chk"><input type="checkbox" data-chg="ptB" data-k="exclusive"' + (p.exclusive ? ' checked' : '') + '> <span>Decir «colaboración exclusiva»</span></label>';
    b += '<div class="field"><label>Logo</label><div class="pt-lg">' + (p.logo ? '<img src="' + esc(p.logo) + '" alt="">' : '<span class="pt-nolg">Sin logo</span>') + '<label class="btn small">Elegir imagen<input type="file" accept="image/*" data-chg="ptLogo" hidden></label>' + (p.logo ? '<button type="button" class="btn small ghost" data-act="ptLogoDel">Quitar</button>' : '') + '</div><small class="hint">PNG o JPG; se achica solo. Usá el archivo que te pase la empresa.</small></div>';
    b += '<h3 class="pt-h">WhatsApp para pedidos</h3>' + p.branches.map((r, i) => '<div class="pt-brow"><input data-in="ptBr" data-i="' + i + '" data-k="name" value="' + esc(r.name || '') + '" placeholder="Sucursal (ej.: General Roca)" aria-label="Sucursal"><input data-in="ptBr" data-i="' + i + '" data-k="wa" inputmode="tel" value="' + esc(r.wa || '') + '" placeholder="WhatsApp (ej.: 298 464-1519)" aria-label="WhatsApp">' + (p.branches.length > 1 ? '<button type="button" class="pt-del" data-act="ptBrDel" data-i="' + i + '" aria-label="Quitar">×</button>' : '') + '</div>').join('') + '<button type="button" class="btn small ghost" data-act="ptBrAdd">+ Otra sucursal</button>';
    b += '<h3 class="pt-h">Beneficio para usuarios de OdontoVoz</h3><div class="row2"><div class="field"><label for="peP">Descuento (%)</label><input id="peP" inputmode="decimal" data-in="ptBen" data-k="pct" value="' + (p.benefit.pct || '') + '" placeholder="Ej.: 5"></div><div class="field"><label for="peT">Texto (opcional)</label><input id="peT" data-in="ptBen" data-k="text" value="' + esc(p.benefit.text || '') + '" placeholder="Se arma solo si lo dejás vacío"></div></div>';
    b += '<div class="field"><label>Qué días vale <small>(ninguno = todos los días)</small></label><div class="pt-days">' + [1, 2, 3, 4, 5, 6, 0].map(d => '<button type="button" class="pt-d' + (p.benefit.days.indexOf(d) >= 0 ? ' on' : '') + '" data-act="ptDay" data-d="' + d + '" aria-pressed="' + (p.benefit.days.indexOf(d) >= 0) + '" title="' + DOW[d] + '">' + DOWS[d] + '</button>').join('') + '</div></div>';
    b += '<div class="row2"><div class="field"><label for="peF">Desde (opcional)</label><input id="peF" type="date" data-chg="ptBenD" data-k="from" value="' + esc(p.benefit.from || '') + '"></div><div class="field"><label for="peH">Hasta (opcional)</label><input id="peH" type="date" data-chg="ptBenD" data-k="to" value="' + esc(p.benefit.to || '') + '"></div></div>';
    b += '<p class="pt-prev" id="ptPrev">' + (bn ? 'Así lo ven: <b>' + esc(bn.txt) + '</b>' + (bn.today ? ' (vale hoy)' : '') : 'Sin beneficio por ahora.') + '</p>';
    b += '<h3 class="pt-h">Dónde aparece</h3>' + [['stock', 'En el pedido de stock, como primera opción'], ['home', 'Aviso en el inicio cuando faltan insumos'], ['menu', 'Al pie del menú, con el logo']].map(x => '<label class="chk"><input type="checkbox" data-chg="ptShow" data-k="' + x[0] + '"' + (p.show[x[0]] !== false ? ' checked' : '') + '> <span>' + x[1] + '</span></label>').join('');
    b += '<div class="row2"><div class="field"><label for="peR">Orden (el menor va primero)</label><input id="peR" inputmode="numeric" data-in="ptF" data-k="rank" value="' + (p.rank || 0) + '"></div><div class="field"><label for="peNo">Nota interna (no la ven los usuarios)</label><input id="peNo" data-in="ptF" data-k="note" value="' + esc(p.note || '') + '"></div></div>';
    b += '<div class="hint bad" id="ptMsg"></div>';
    return A.modalShell(m.isNew ? 'Nueva colaboración' : p.name, b, '<button class="btn" data-act="ptBack">Volver</button>' + (m.isNew ? '' : '<button class="btn danger" data-act="ptDelAsk">Borrar</button>') + '<button class="btn primary" data-act="ptSave">Guardar</button>');
  };
  const prev = () => { const m = S.modal, o = $('#ptPrev'); if (!m || !o) return; const bn = A.partnerBenefit(m.p); o.innerHTML = bn ? 'Así lo ven: <b>' + esc(bn.txt) + '</b>' + (bn.today ? ' (vale hoy)' : '') : 'Sin beneficio por ahora.'; };
  A.ins.ptF = el => { const k = el.getAttribute('data-k'), m = S.modal; m.p[k] = k === 'rank' ? (parseInt(el.value, 10) || 0) : el.value; };
  A.chg.ptB = el => { S.modal.p[el.getAttribute('data-k')] = el.checked; };
  A.ins.ptBr = el => { const r = S.modal.p.branches[+el.getAttribute('data-i')]; if (r) r[el.getAttribute('data-k')] = el.value; };
  A.acts.ptBrAdd = () => { S.modal.p.branches.push({ name: '', wa: '' }); A.renderModal(); };
  A.acts.ptBrDel = el => { S.modal.p.branches.splice(+el.getAttribute('data-i'), 1); A.renderModal(); };
  A.ins.ptBen = el => { const k = el.getAttribute('data-k'), b = S.modal.p.benefit; b[k] = k === 'pct' ? (parseFloat(String(el.value).replace(',', '.')) || 0) : el.value; prev(); };
  A.chg.ptBenD = el => { S.modal.p.benefit[el.getAttribute('data-k')] = el.value || null; prev(); };
  A.acts.ptDay = el => { const d = +el.getAttribute('data-d'), a = S.modal.p.benefit.days, i = a.indexOf(d); if (i >= 0) a.splice(i, 1); else a.push(d); A.renderModal(); };
  A.chg.ptShow = el => { S.modal.p.show[el.getAttribute('data-k')] = el.checked; };
  A.acts.ptLogoDel = () => { S.modal.p.logo = ''; A.renderModal(); };
  A.chg.ptLogo = el => {
    const f = el.files && el.files[0]; if (!f) return;
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => {
      const max = 480, k = Math.min(1, max / img.width, 160 / img.height), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); S.modal.p.logo = c.toDataURL('image/png'); A.renderModal();
    };
    img.onerror = () => { const o = $('#ptMsg'); if (o) o.textContent = 'No se pudo leer esa imagen.'; };
    img.src = url;
  };
  A.acts.ptBack = () => { const rows = S.modal.rows; S.modal = { type: 'ptPanel', loading: false, rows }; A.renderModal(); };
  const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  A.acts.ptSave = () => {
    const m = S.modal, p = m.p, o = $('#ptMsg');
    if (!String(p.name || '').trim()) { o.textContent = 'Poné el nombre.'; return; }
    if (!p.id) p.id = slug(p.name) || ('c' + Date.now());
    p.branches = p.branches.filter(b => String(b.name || '').trim() || waNum(b.wa)).map(b => ({ name: String(b.name || '').trim(), wa: waNum(b.wa) }));
    if (p.active && p.show.stock !== false && !p.branches.some(b => b.wa)) { o.textContent = 'Para que aparezca en los pedidos falta un WhatsApp.'; if (!p.branches.length) p.branches.push({ name: '', wa: '' }); return; }
    const body = { p: p }, done = () => { lastFetch = 0; A.partnersLoad(true); A.toast('Guardado. Les llega a las apps en un rato.'); A.acts.ptPanel(); };
    if (A._partnersAll) { const L = A._partnersAll, i = L.findIndex(x => x.id === p.id); if (i >= 0) L[i] = p; else L.push(p); if (A._partners) { A._partners = L.filter(x => x.active); } done(); return; }
    o.className = 'hint'; o.textContent = 'Guardando…';
    CL().api('/rest/v1/rpc/ov_partner_save', { method: 'POST', body }).then(done).catch(e => { o.className = 'hint bad'; o.textContent = 'No se pudo guardar: ' + (e.message || '') + (/does not exist|404/.test(String(e.status) + JSON.stringify(e.data || '')) ? ' (falta correr supabase/colaboraciones.sql)' : ''); });
  };
  A.acts.ptDelAsk = () => { const m = S.modal; S.modal = { type: 'ptDel', p: m.p, back: m }; A.renderModal(); };
  MF.ptDel = m => A.modalShell('Borrar colaboración', '<p>¿Borrar <b>' + esc(m.p.name) + '</b>? Desaparece de todas las apps. Si solo querés pausarla, mejor apagala.</p>', '<button class="btn" data-act="ptDelNo">Volver</button><button class="btn danger" data-act="ptDelGo">Borrar</button>');
  A.acts.ptDelNo = () => { S.modal = S.modal.back; A.renderModal(); };
  A.acts.ptDelGo = () => {
    const m = S.modal, id = m.p.id, done = () => { lastFetch = 0; A.partnersLoad(true); A.toast('Colaboración borrada.'); A.acts.ptPanel(); };
    if (A._partnersAll) { A._partnersAll = A._partnersAll.filter(x => x.id !== id); if (A._partners) A._partners = A._partnersAll.filter(x => x.active); done(); return; }
    CL().api('/rest/v1/rpc/ov_partner_del', { method: 'POST', body: { p_id: id } }).then(done).catch(e => A.toast('No se pudo borrar: ' + (e.message || '')));
  };

  const css = document.createElement('style');
  css.textContent = '.pt-order{margin-top:12px;padding:14px;border:2px solid var(--accent,#0d6b6b);border-radius:16px;background:var(--accent-soft,#f3faf9);display:grid;gap:10px}' +
    '.pt-head{display:flex;gap:12px;align-items:center}.pt-head b{display:block;font-size:16px}.pt-logo{width:110px;height:54px;object-fit:contain;background:#fff;border:1px solid #dfe7ea;border-radius:12px;padding:4px 6px;flex:none;box-sizing:border-box}' +
    '.pt-noimg{display:inline-flex;align-items:center;justify-content:center;font-weight:800;color:#0d6b6b}' +
    '.pt-tag{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#fff;background:var(--accent,#0d6b6b);border-radius:999px;padding:3px 8px;margin-bottom:4px}' +
    '.pt-ben{display:block;margin-top:3px;font-size:12.5px;color:var(--ink-2,#5b6b70)}.pt-ben.on{color:#a14d00;font-weight:700}' +
    '.pt-br{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:13px}.pt-c{border:1.5px solid var(--line,#c9d8d6);border-radius:999px;padding:6px 12px;background:var(--surface,#fff);color:var(--ink);font:inherit;font-weight:600;cursor:pointer}.pt-c.on{border-color:var(--accent,#0d6b6b);background:var(--accent,#0d6b6b);color:#fff}' +
    '.pt-go{display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;border:0;border-radius:12px;background:var(--accent,#0d6b6b);color:#fff;font:inherit;font-weight:800;font-size:15px;cursor:pointer}.pt-note{font-size:12px;color:var(--ink-2,#5b6b70);margin:0}' +
    '.pt-other{display:flex;justify-content:center;gap:14px;margin-top:10px;font-size:12.5px}.pt-other a,.pt-other .linkbtn{color:var(--ink-2,#5b6b70);text-decoration:underline;font-size:12.5px}' +
    '.pt-alert{display:flex;align-items:center;gap:12px;margin:14px 0 4px;padding:10px 12px;border-radius:14px;background:var(--surface,#fff);border:1px solid #f0d9a8;box-shadow:0 1px 6px rgba(0,0,0,.04)}' +
    '.pt-ai{font-size:20px}.pt-at{flex:1;min-width:0;display:flex;flex-direction:column}.pt-at b{font-size:14px}.pt-at small{font-size:12px;color:var(--ink-2,#5b6b70);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.pt-ab{display:flex;align-items:center;gap:6px;flex:none;border:0;background:var(--accent,#0d6b6b);color:#fff;font:inherit;font-weight:700;font-size:13px;border-radius:10px;padding:6px 10px 6px 6px;cursor:pointer}.pt-mini{width:40px;height:24px;object-fit:contain;background:#fff;border-radius:6px;padding:1px 2px;box-sizing:border-box}' +
    '.pt-x{border:0;background:none;color:var(--ink-2,#5b6b70);font-size:18px;cursor:pointer;padding:0 2px}' +
    '@media(max-width:600px){.pt-alert{flex-wrap:wrap}.pt-ab{order:3;width:100%;justify-content:center;padding:8px}}' +
    '.pt-foot{display:flex;flex-direction:column;align-items:center;gap:8px;margin:14px 10px 6px;padding:14px 12px;border:1px solid var(--line,#d5e2e1);border-radius:14px;background:var(--surface,#fff);text-align:center}.pt-foot span{font-size:12px;font-weight:700;color:var(--ink-2,#5b6b70);letter-spacing:.02em}' +
    '.pt-flogo{width:170px;height:56px;object-fit:contain;background:#fff;border:1px solid #dfe7ea;border-radius:12px;padding:4px 8px;box-sizing:border-box;display:block}' +
    '.pt-sub{display:block;font-size:11.5px;color:var(--accent,#0d6b6b);font-weight:600}.pt-cre{border:1px dashed var(--accent,#0d6b6b)}' +
    '.pt-list{list-style:none;padding:0;margin:8px 0;display:grid;gap:8px}.pt-list button{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);font:inherit;cursor:pointer}.pt-list button>span{flex:1;min-width:0;display:flex;flex-direction:column}.pt-list small{font-size:12px;color:var(--ink-2)}' +
    '.pt-lmini{width:64px;height:32px;object-fit:contain;background:#fff;border:1px solid #dfe7ea;border-radius:8px;padding:2px;box-sizing:border-box;flex:none}.pt-on{color:#1e7a3c;font-weight:700}.pt-off{color:#a24a46;font-weight:700}' +
    '.pt-lg{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.pt-lg img{width:150px;height:50px;object-fit:contain;background:#fff;border:1px solid #dfe7ea;border-radius:10px;padding:3px}.pt-nolg{font-size:13px;color:var(--ink-2)}' +
    '.pt-h{font-size:14px;margin:14px 0 6px}.pt-brow{display:grid;grid-template-columns:1fr 1fr auto;gap:6px;margin-bottom:6px}.pt-brow input{min-height:38px;border:1px solid var(--line);border-radius:9px;padding:0 9px;font:inherit;background:var(--surface);color:var(--ink);min-width:0}.pt-del{border:0;background:none;color:#b42318;font-size:1.3rem;cursor:pointer}' +
    '.pt-days{display:flex;gap:6px;flex-wrap:wrap}.pt-d{width:38px;height:38px;border-radius:50%;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-weight:700;cursor:pointer}.pt-d.on{background:var(--accent,#0d6b6b);border-color:var(--accent,#0d6b6b);color:#fff}' +
    '.pt-prev{margin:6px 0 0;padding:8px 10px;border-radius:10px;background:var(--accent-soft,#e6f3f3);font-size:13px}.pt-act{margin-top:4px}' +
    '.linkbtn{border:0;background:none;padding:0;color:var(--accent);text-decoration:underline;font:inherit;cursor:pointer}';
  document.head.appendChild(css);
})();
