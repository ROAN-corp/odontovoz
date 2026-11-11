/* ===== 1.48: aranceles de la Federación Odontológica de Río Negro (se bajan solos cada mes; cada consultorio pone su coseguro) ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const money = n => A.money(n || 0);
  const N = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const URL = 'https://roan-corp.github.io/odontovoz/aranceles/forn.json';
  const RN = 'Federación Odontológica de Río Negro';
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } } };

  /* ---------- datos ---------- */
  let DATA = null, loading = null;
  A.fornGet = (force) => {
    if (DATA && !force) return Promise.resolve(DATA);
    if (A._fornData) { DATA = A._fornData; return Promise.resolve(DATA); } /* para pruebas */
    if (loading) return loading;
    loading = fetch(URL + '?m=' + A.today().slice(0, 7), { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).then(d => { DATA = d; loading = null; return d; }).catch(() => { loading = null; return null; });
    return loading;
  };
  const fById = slug => (DATA && DATA.os || []).filter(f => f.slug === slug)[0] || null;
  const fName = f => f.name + (f.sub && f.sub.length < 60 ? ' · ' + f.sub : '');
  const tblName = (t, i) => (t.title ? t.title : 'Tabla ' + (i + 1)) + ' · ' + Object.keys(t.rows).length + ' prácticas';

  /* parecido de nombres (obra social de la app ↔ de la Federación) */
  const ALIAS = { 'sancor salud': 'asociacion-mutual-sancor', ospjn: 'osjpn', 'luz y fuerza': 'osfatlyf', osfatlyf: 'osfatlyf', 'swiss medical': 'swiss-medical', jerarquicos: 'jerarquicos-salud', avalian: 'avalian-aca-salud', 'federada salud': 'federada-salud-2', 'prevencion salud': 'prevencion-salud', medife: 'medife', omint: 'consulmed', 'ospsa': 'ospsa-sanidad', 'uom': 'uom', 'osde': 'osde', 'galeno': 'galeno', 'medicus': 'medicus' };
  A.fornMatch = o => {
    if (!DATA) return null;
    if (o.forn && fById(o.forn.slug)) return fById(o.forn.slug);
    const s = N(o.sigla), n = N(o.name);
    if (ALIAS[s] && fById(ALIAS[s])) return fById(ALIAS[s]);
    let best = null, bs = 0;
    DATA.os.forEach(f => {
      const fs = N(f.slug.replace(/-\d+$/, '').replace(/-/g, ' ')), fn = N(f.name), fsub = N(f.sub);
      let sc = 0;
      if (s && (fs === s || fn.replace(/ /g, '') === s.replace(/ /g, ''))) sc = 10;
      else if (s.length > 3 && (fn.indexOf(s) >= 0 || fsub.indexOf(s) >= 0 || fs.indexOf(s) >= 0)) sc = 6;
      else { const w = (n + ' ' + s).split(' ').filter(x => x.length > 3), fw = (fn + ' ' + fsub + ' ' + fs); sc = w.filter(x => fw.indexOf(x) >= 0).length; }
      if (sc > bs) { bs = sc; best = f; }
    });
    return bs >= 2 ? best : null;
  };
  /* qué columna es «paga la O.S.» y cuál «coseguro» */
  const guessCols = t => {
    const k = t.cols.map(c => c.kind);
    const cos = k.indexOf('cos'), cov = k.indexOf('cov'), tot = k.indexOf('total');
    return { cov: cov >= 0 ? cov : (tot >= 0 ? tot : 0), cos: cos, sub: cov < 0 && cos >= 0 && tot >= 0 }; /* sub: «paga la O.S.» = total − coseguro */
  };
  /* aplica una tabla a una obra social de la app; el coseguro propio se respeta si la tabla no trae */
  A.fornApply = (o, map) => {
    const f = fById(map.slug), t = f && f.tables[map.t]; if (!t) return 0;
    o.aran = o.aran || {}; let n = 0;
    Object.keys(t.rows).forEach(code => {
      const r = t.rows[code], v = r.v; let cov = v[map.cov], cos = map.cos >= 0 ? v[map.cos] : null;
      if (cov == null) return;
      if (map.sub && cos != null) cov = Math.max(0, cov - cos);
      const a = o.aran[code] || (o.aran[code] = { on: true, cov: 0, cos: 0 });
      a.on = true; a.cov = cov; if (cos != null) a.cos = cos; if (!(A.NOMEN || []).some(x => x[0] === code)) a.label = r.d; a.forn = 1; n++;
    });
    o.forn = { slug: map.slug, t: map.t, cov: map.cov, cos: map.cos, sub: !!map.sub, vig: t.vig || f.vig || null, at: DATA.at, sig: sigOf(t) };
    if (!o.via) o.via = RN; if (f.normas && !(o.notes || '').includes(f.normas)) o.notes = ((o.notes || '') + '\nNormas de trabajo (FORN): ' + f.normas).trim();
    o.upd = A.today(); return n;
  };
  const sigOf = t => { let h = 0; const s = JSON.stringify(t.rows); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };

  /* ---------- pantalla: traer aranceles para una obra social ---------- */
  A.fornBtn = () => '<button class="btn" data-act="fornAll">Federación RN</button>';
  A.acts.fornOpen = el => {
    const o = A.osById(el.getAttribute('data-id') || (S.modal && S.modal.id)); if (!o) return;
    S.modal = { type: 'fornPick', id: o.id, back: S.modal, loading: true }; A.renderModal();
    A.fornGet().then(d => {
      const m = S.modal; if (!m || m.type !== 'fornPick') return; m.loading = false;
      if (!d) { m.err = 'No se pudieron bajar los aranceles. Revisá la conexión a internet.'; A.renderModal(); return; }
      const f = A.fornMatch(o); m.slug = f ? f.slug : ''; m.t = (o.forn && o.forn.slug === m.slug) ? o.forn.t : 0; setCols(m); A.renderModal();
    });
  };
  const setCols = m => {
    const f = fById(m.slug), t = f && f.tables[m.t]; if (!t) return;
    const o = A.osById(m.id), g = guessCols(t);
    if (o && o.forn && o.forn.slug === m.slug && o.forn.t === m.t) { m.cov = o.forn.cov; m.cos = o.forn.cos; m.sub = o.forn.sub; } else { m.cov = g.cov; m.cos = g.cos; m.sub = g.sub; }
  };
  MF.fornPick = m => {
    const o = A.osById(m.id);
    if (m.loading) return A.modalShell('Aranceles de la Federación', '<div class="empty">Bajando los aranceles de la ' + RN + '…</div>', '<button class="btn" data-act="fornBack">Volver</button>');
    if (m.err) return A.modalShell('Aranceles de la Federación', '<div class="empty">' + esc(m.err) + '</div>', '<button class="btn" data-act="fornBack">Volver</button>');
    const f = fById(m.slug), t = f && f.tables[m.t];
    let b = '<p class="m-lead">Aranceles publicados por la ' + RN + ' (actualizados el ' + esc(A.fmtDMY(DATA.at.slice(0, 10))) + '). Elegí la tabla que corresponde a <b>' + esc(o.sigla) + '</b>.</p>';
    b += '<div class="field"><label for="fpOs">Obra social en la Federación</label><select id="fpOs" data-chg="fpSet" data-f="slug"><option value="">Elegí…</option>' + DATA.os.slice().sort((a, b) => a.name.localeCompare(b.name)).map(x => '<option value="' + esc(x.slug) + '"' + (x.slug === m.slug ? ' selected' : '') + '>' + esc(fName(x)) + (x.vig ? ' (' + esc(x.vig) + ')' : '') + '</option>').join('') + '</select></div>';
    if (f) {
      if (f.tables.length > 1) b += '<div class="field"><label for="fpT">Tabla</label><select id="fpT" data-chg="fpSet" data-f="t">' + f.tables.map((x, i) => '<option value="' + i + '"' + (i === m.t ? ' selected' : '') + '>' + esc(tblName(x, i)) + '</option>').join('') + '</select></div>';
      const colOpt = (sel, none) => (none ? '<option value="-1"' + (sel < 0 ? ' selected' : '') + '>' + none + '</option>' : '') + t.cols.map((c, i) => '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + esc(c.label || 'Columna ' + (i + 1)) + '</option>').join('');
      b += '<div class="row2"><div class="field"><label for="fpCov">' + (m.sub ? 'Valor total (le resto el coseguro)' : 'Lo que paga la obra social') + '</label><select id="fpCov" data-chg="fpSet" data-f="cov">' + colOpt(m.cov) + '</select></div>' +
        '<div class="field"><label for="fpCos">Coseguro</label><select id="fpCos" data-chg="fpSet" data-f="cos">' + colOpt(m.cos, 'Lo pongo yo (dejo mis coseguros)') + '</select></div></div>';
      if (m.cos >= 0 && t.cols[m.cov] && t.cols[m.cov].kind === 'total') b += '<label class="chk"><input type="checkbox" data-chg="fpSet" data-f="sub"' + (m.sub ? ' checked' : '') + '> El valor total incluye el coseguro (la obra social paga el total menos el coseguro)</label>';
      if ((f.notes || []).length) b += '<div class="fp-notes"><b>Notas de la Federación</b><ul>' + f.notes.map(n => '<li>' + esc(n) + '</li>').join('') + '</ul></div>';
      const codes = Object.keys(t.rows);
      b += '<div class="tbl-scroll" style="max-height:38vh"><table class="tbl fp-tbl"><thead><tr><th>Código</th><th>Práctica</th><th class="num">Ahora paga</th><th class="num">Nuevo</th><th class="num">Coseguro</th></tr></thead><tbody>' + codes.map(c => {
        const r = t.rows[c], cur = (o.aran || {})[c] || {}; let cov = r.v[m.cov], cos = m.cos >= 0 ? r.v[m.cos] : (cur.cos || 0); if (m.sub && m.cos >= 0 && cov != null) cov -= (cos || 0);
        return '<tr><td class="mono">' + esc(c) + '</td><td>' + esc(r.d) + '</td><td class="num">' + (cur.on ? money(cur.cov) : '—') + '</td><td class="num"><b>' + (cov == null ? '—' : money(cov)) + '</b></td><td class="num">' + money(cos || 0) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
      const plans = t.cols.filter(c => c.kind === 'plan').length;
      if (plans > 1) b += '<div class="hint">Esta obra social paga distinto según el plan. Si atendés varios planes, usá «Una por plan» y se crea una obra social para cada plan (por ejemplo «' + esc(o.sigla) + ' ' + esc(t.cols[1].label.split(/[ ;]/)[0]) + '»).</div>';
      b += '<div class="hint">Tus coseguros los decidís vos' + (m.cos >= 0 ? ' (podés cambiarlos después en la tabla de la obra social)' : ': quedan los que ya tenías cargados') + '. Cada mes, cuando la Federación publique valores nuevos, te avisamos para actualizar con un toque.</div>';
    }
    const plans = t ? t.cols.filter(c => c.kind === 'plan').length : 0;
    return A.modalShell('Aranceles de la Federación · ' + o.sigla, b, '<button class="btn" data-act="fornBack">Volver</button>' + (plans > 1 ? '<button class="btn" data-act="fornPlans">Una por plan</button>' : '') + '<button class="btn primary" data-act="fornGo"' + (t ? '' : ' disabled') + '>Usar estos aranceles</button>');
  };
  A.chg.fpSet = el => {
    const m = S.modal, f = el.getAttribute('data-f');
    if (f === 'slug') { m.slug = el.value; m.t = 0; setCols(m); }
    else if (f === 't') { m.t = +el.value; setCols(m); }
    else if (f === 'sub') m.sub = el.checked;
    else m[f] = +el.value;
    A.renderModal();
  };
  A.acts.fornBack = () => { S.modal = S.modal.back || null; A.renderModal(); };
  A.acts.fornGo = () => {
    const m = S.modal, o = A.osById(m.id); if (!o) return;
    const n = A.fornApply(o, m); A.save(); S.modal = m.back || null; if (S.modal && S.modal.type === 'osEdit') S.modal.id = o.id; A.renderModal(); A.toast(n + ' aranceles de ' + o.sigla + ' cargados.');
  };
  A.acts.fornPlans = () => {
    if (!A.isBoss()) { A.toast(A.permWhy(true)); return; }
    const m = S.modal, o = A.osById(m.id), t = fById(m.slug).tables[m.t]; let made = 0;
    t.cols.forEach((c, i) => {
      if (c.kind !== 'plan') return; const lab = (c.label || 'Plan ' + (i + 1)).replace(/\s+/g, ' ').slice(0, 30);
      let x = made === 0 ? o : null;
      if (!x) { x = Object.assign({}, o, { id: A.uid(), aran: JSON.parse(JSON.stringify(o.aran || {})), forn: null }); A.osList().push(x); }
      x.sigla = o.sigla.replace(/\s+\(.*$/, '') + ' (' + lab + ')'; A.fornApply(x, { slug: m.slug, t: m.t, cov: i, cos: -1 }); made++;
    });
    A.save(); S.modal = { type: 'osList', m: A.today().slice(0, 7), q: '' }; A.renderModal(); A.toast('Se crearon ' + made + ' planes de ' + o.sigla.replace(/\s+\(.*$/, '') + '. Elegí el plan en la ficha de cada paciente.');
  };
  /* en la obra social: estado de la tabla y botón */
  const osEditPrev = MF.osEdit;
  MF.osEdit = m => {
    const h = osEditPrev(m), o = A.osById(m.id); if (typeof h !== 'string' || !o || o.kind === 'particular') return h;
    const st = o.forn ? 'Usa los aranceles de la Federación' + (o.forn.vig ? ' (vigencia ' + esc(o.forn.vig) + ')' : '') + '.' : 'Podés traer los aranceles que publica la ' + RN + '.';
    const box = '<div class="fp-box"><span>' + st + '</span>' + (A.isBoss() ? '<button class="btn small primary" data-act="fornOpen" data-id="' + esc(o.id) + '">' + (o.forn ? 'Actualizar' : 'Traer aranceles') + '</button>' : '') + '</div>';
    return h.replace('<div class="block"><h3>Aranceles por práctica</h3>', box + '<div class="block"><h3>Aranceles por práctica</h3>');
  };

  /* ---------- todas las de la Federación de una vez ---------- */
  A.acts.fornAll = () => {
    S.modal = { type: 'fornAll', back: S.modal, loading: true, sel: {} }; A.renderModal();
    A.fornGet().then(d => { const m = S.modal; if (!m || m.type !== 'fornAll') return; m.loading = false; if (!d) m.err = 'No se pudieron bajar los aranceles. Revisá la conexión.'; A.renderModal(); });
  };
  MF.fornAll = m => {
    if (m.loading || m.err) return A.modalShell('Obras sociales de la Federación', '<div class="empty">' + esc(m.err || 'Bajando los aranceles de la ' + RN + '…') + '</div>', '<button class="btn" data-act="fornBack">Volver</button>');
    const mine = {}; A.osList().forEach(o => { const f = A.fornMatch(o); if (f) mine[f.slug] = o; });
    let b = '<p class="m-lead">La ' + RN + ' publica los aranceles de ' + DATA.os.length + ' obras sociales y prepagas (actualizado el ' + esc(A.fmtDMY(DATA.at.slice(0, 10))) + '). Tildá con las que trabajás: se agregan o se actualizan con sus valores. Los coseguros que ya tenías cargados no se tocan.</p>';
    b += '<div class="fa-list">' + DATA.os.slice().sort((a, b) => a.name.localeCompare(b.name)).map(f => {
      const o = mine[f.slug], on = m.sel[f.slug] != null ? m.sel[f.slug] : !!(o && o.forn);
      return '<label class="fa-row"><input type="checkbox" data-chg="faSel" data-s="' + esc(f.slug) + '"' + (on ? ' checked' : '') + '><span><b>' + esc(f.name) + '</b><small>' + esc(f.sub || '') + (f.vig ? ' · vigencia ' + esc(f.vig) : '') + (o ? ' · en tu lista como ' + esc(o.sigla) : '') + '</small></span></label>';
    }).join('') + '</div>';
    b += '<div class="hint">Los valores salen de los PDF publicados en odontorionegro.com. Revisá siempre la normativa de cada obra social.</div>';
    return A.modalShell('Obras sociales de la Federación', b, '<button class="btn" data-act="fornBack">Volver</button><button class="btn primary" data-act="fornAllGo">Agregar / actualizar</button>');
  };
  A.chg.faSel = el => { S.modal.sel[el.getAttribute('data-s')] = el.checked; };
  A.acts.fornAllGo = () => {
    const m = S.modal; document.querySelectorAll('[data-chg="faSel"]').forEach(i => { m.sel[i.getAttribute('data-s')] = i.checked; });
    const mine = {}; A.osList().forEach(o => { const f = A.fornMatch(o); if (f) mine[f.slug] = o; });
    let add = 0, upd = 0;
    Object.keys(m.sel).filter(s => m.sel[s]).forEach(slug => {
      const f = fById(slug); if (!f) return; let o = mine[slug];
      if (!o) { o = { id: A.uid(), sigla: f.name.length <= 22 ? f.name : (f.slug.toUpperCase().replace(/-\d+$/, '').replace(/-/g, ' ')), name: fName(f), kind: 'prepaga', via: RN, on: true, auth: false, plans: '', notes: '', upd: null, aran: {} }; A.osList().push(o); add++; } else upd++;
      const t = o.forn && o.forn.slug === slug ? o.forn.t : 0, g = guessCols(f.tables[t]);
      A.fornApply(o, o.forn && o.forn.slug === slug ? o.forn : { slug, t, cov: g.cov, cos: g.cos, sub: g.sub });
    });
    A.CFG.fornSeen = DATA.at; A.save(); S.modal = m.back || null; A.renderModal(); A.toast((add ? add + ' obras sociales agregadas' : '') + (add && upd ? ' y ' : '') + (upd ? upd + ' actualizadas' : '') + (add || upd ? '.' : 'No elegiste ninguna.'));
  };

  /* ---------- aviso mensual: hay valores nuevos ---------- */
  A.fornCheck = () => A.fornGet(true).then(d => {
    if (!d || !A.isBoss()) return [];
    const L = A.osList().filter(o => o.forn && fById(o.forn.slug)).filter(o => { const t = fById(o.forn.slug).tables[o.forn.t]; return t && sigOf(t) !== o.forn.sig; });
    if (L.length && A.nfAdd) A.nfAdd({ id: 'forn:' + d.at.slice(0, 10), k: 'info', t: 'Aranceles nuevos de la Federación', b: L.map(o => o.sigla).join(', ') + '. Tocá para actualizarlos.', act: 'fornUpd' });
    return L;
  });
  A.acts.fornUpd = () => { S.modal = { type: 'fornUpd', loading: true }; A.renderModal(); A.fornCheck().then(L => { const m = S.modal; if (!m || m.type !== 'fornUpd') return; m.loading = false; m.list = L.map(o => o.id); A.renderModal(); }); };
  MF.fornUpd = m => {
    if (m.loading) return A.modalShell('Aranceles nuevos', '<div class="empty">Revisando…</div>', '<button class="btn" data-act="closeModal">Cerrar</button>');
    const L = (m.list || []).map(A.osById).filter(Boolean);
    if (!L.length) return A.modalShell('Aranceles nuevos', '<div class="empty">Tus obras sociales ya tienen los últimos valores de la Federación.</div>', '<button class="btn" data-act="closeModal">Cerrar</button>');
    const b = '<p class="m-lead">La ' + RN + ' publicó valores nuevos para:</p><ul class="pd-list">' + L.map(o => { const f = fById(o.forn.slug), t = f.tables[o.forn.t]; return '<li><b>' + esc(o.sigla) + '</b> · vigencia ' + esc(t.vig || f.vig || '') + '</li>'; }).join('') + '</ul><div class="hint">Se actualiza lo que paga cada obra social. Tus coseguros se mantienen, salvo en las obras sociales donde elegiste usar el coseguro de la tabla.</div>';
    return A.modalShell('Aranceles nuevos', b, '<button class="btn" data-act="closeModal">Después</button><button class="btn primary" data-act="fornUpdGo">Actualizar ' + L.length + '</button>');
  };
  A.acts.fornUpdGo = () => {
    const L = (S.modal.list || []).map(A.osById).filter(Boolean); L.forEach(o => A.fornApply(o, o.forn));
    A.CFG.fornSeen = DATA.at; A.save(); S.modal = null; A.renderModal(); A.toast('Aranceles actualizados: ' + L.map(o => o.sigla).join(', ') + '.');
  };
  /* se revisa una vez por día (al abrir la app) */
  let checked = false;
  const arPrev = A.afterRefresh;
  A.afterRefresh = function () {
    const r = arPrev ? arPrev.apply(this, arguments) : undefined;
    if (!checked && !A.DEMO && navigator.onLine !== false) {
      checked = true; const k = 'odontovoz.fornDay';
      if (LS.get(k) !== A.today() && A.osList().some(o => o.forn)) { LS.set(k, A.today()); setTimeout(() => A.fornCheck(), 8000); }
    }
    return r;
  };

  const css = document.createElement('style');
  css.textContent = '.fp-box{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:space-between;padding:10px 12px;margin:10px 0;border-radius:12px;background:var(--soft,#eef6f6)}' +
    '.fp-notes{font-size:.85rem;margin:8px 0;padding:8px 10px;border-radius:10px;background:#fff8e6}.fp-notes ul{margin:4px 0 0;padding-left:18px}' +
    '.fa-list{display:flex;flex-direction:column;gap:2px;max-height:50vh;overflow:auto}.fa-row{display:flex;gap:10px;align-items:flex-start;padding:7px 4px;border-bottom:1px solid var(--line)}.fa-row small{display:block;color:var(--muted,#667);font-size:.8rem}@media (max-width:640px){.fp-tbl th:nth-child(3),.fp-tbl td:nth-child(3){display:none}.fp-tbl{font-size:.85rem}}';
  document.head.appendChild(css);
})();
