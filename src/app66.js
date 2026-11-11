/* ===== 1.48: permisos (precios solo el dueño; recepción y asistente cargan sin cambiar lo hecho), aumentos por porcentaje, coseguro claro al cobrar y DNI que abre la ficha ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const money = n => A.money(n || 0);
  const role = () => (A.isMember && A.isMember() && A.mbRole) ? A.mbRole() : 'dueno';
  A.isBoss = () => role() === 'dueno' || role() === 'admin';
  A.isCarga = () => role() === 'recepcion' || role() === 'asistente';

  /* ---------- 1) qué no puede tocar cada uno ---------- */
  /* precios, aranceles, acuerdos y ajustes de plata: solo dueño o administración */
  const BOSS_ACT = ['catDel', 'catAdd', 'catReset', 'osDel', 'osNew', 'osPct', 'osPctGo', 'osCode', 'dlRuleDel', 'dlRuleAdd', 'dlBase', 'liqRuleDel', 'liqRuleAdd', 'liqDedDel', 'liqDedAdd', 'liqPay',
    'osPayNew', 'osPayGo', 'osPayUndo', 'pctOpen', 'pctGo', 'osPctAll', 'osPctAllGo', 'fornOpen', 'fornGo', 'fornAll', 'fornAllGo', 'fornUpdGo', 'cfgProDel', 'costOpen', 'costGo', 'fixAdd', 'fixDel', 'stkPriceGo'];
  const BOSS_CHG = ['catEdit', 'aranEdit', 'osAr', 'osField', 'dlSet', 'dlRulePct', 'liqPct', 'liqRulePct', 'liqMode', 'liqModBy', 'liqModPrice', 'fixF', 'stkPrice'];
  /* recepción y asistente: dan turnos, cargan pacientes, cobran y suben archivos; no borran ni anulan lo hecho */
  const CARGA_ACT = ['apDelAsk', 'apDelGo', 'evDelAsk', 'evDelGo', 'evVoidAsk', 'evVoidGo', 'ledVoid', 'txVoid', 'mvDel', 'pmDel', 'pdGo', 'arOpen', 'arGo', 'mgOpen', 'mgGo', 'imDel', 'rxDel', 'odPlanDel',
    'tpBudDelAsk', 'tpBudDelGo', 'tpDel', 'labDel', 'labItDel', 'labOneDel', 'leDel', 'leDelGo', 'pcDelAsk', 'pcDelGo', 'stkDel', 'tpFree', 'clReopen'];
  const CARGA_FILL = ['profField', 'hcText', 'reField', 'tpField']; /* completar lo vacío sí; cambiar lo cargado, no */
  const why = boss => boss ? 'Solo el dueño o un administrador pueden cambiar precios, aranceles y acuerdos.' : 'Tu usuario puede cargar datos nuevos, pero no cambiar ni borrar lo que ya está. Pedíselo al dueño o a un administrador.';
  A.permWhy = why;
  const blockedAct = a => (!A.isBoss() && BOSS_ACT.indexOf(a) >= 0) ? 'boss' : (A.isCarga() && CARGA_ACT.indexOf(a) >= 0) ? 'carga' : '';
  A.permBlocked = blockedAct;
  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('[data-act]'); if (!el) return;
    const b = blockedAct(el.getAttribute('data-act')); if (!b) return;
    e.stopImmediatePropagation(); e.preventDefault(); A.toast(why(b === 'boss'));
  }, true);
  document.addEventListener('change', e => {
    const el = e.target; if (!el || !el.getAttribute) return; const c = el.getAttribute('data-chg'); if (!c) return;
    if (!A.isBoss() && BOSS_CHG.indexOf(c) >= 0) { e.stopImmediatePropagation(); if (el.type === 'checkbox') el.checked = el.defaultChecked; else el.value = el.defaultValue; A.toast(why(true)); return; }
    if (A.isCarga() && CARGA_FILL.indexOf(c) >= 0 && el.type !== 'checkbox' && String(el.defaultValue || '').trim() && el.value !== el.defaultValue) {
      e.stopImmediatePropagation(); el.value = el.defaultValue; A.toast(why(false));
    }
  }, true);
  /* se ocultan los botones que no puede usar (así no se ofrecen) */
  const css0 = document.createElement('style');
  css0.textContent = BOSS_ACT.map(a => 'body.pm-noboss [data-act="' + a + '"]').join(',') + '{display:none!important}' +
    CARGA_ACT.map(a => 'body.pm-carga [data-act="' + a + '"]').join(',') + '{display:none!important}' +
    'body.pm-noboss .m-body [data-chg="catEdit"],body.pm-noboss .m-body [data-chg="aranEdit"],body.pm-noboss .m-body [data-chg="osAr"]{pointer-events:none;background:transparent;border-color:transparent}';
  document.head.appendChild(css0);
  const mark = () => { document.body.classList.toggle('pm-noboss', !A.isBoss()); document.body.classList.toggle('pm-carga', A.isCarga()); };
  const arPrev = A.afterRefresh; A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; mark(); return r; };
  const rmPrev = A.renderModal; A.renderModal = function () { mark(); const r = rmPrev.apply(this, arguments); if (!A.isBoss()) { const h = $('.m-body'); if (h && S.modal && /^(catalog|osEdit|cfg)$/.test(S.modal.type)) h.querySelectorAll('[data-chg="catEdit"],[data-chg="aranEdit"],[data-chg="osAr"],[data-chg="osField"],[data-chg^="dl"]').forEach(i => { i.disabled = true; }); } return r; };

  /* ---------- 2) subir precios por porcentaje ---------- */
  const round = (v, r) => (r > 1 ? Math.round(v / r) * r : Math.round(v));
  const pctOf = v => parseFloat(String(v || '').replace(',', '.')) || 0;
  A.acts.pctOpen = () => { S.modal = { type: 'pctUp', back: S.modal, cat: '', pct: '', r: 100 }; A.renderModal(); };
  MF.pctUp = m => {
    const cats = A.catCats(), p = pctOf(m.pct), list = A.CAT.filter(x => !m.cat || x.cat === m.cat);
    let b = '<p class="m-lead">Sube (o baja, con un número negativo) los precios particulares de tu lista. Mirás cómo quedan antes de aplicar.</p>' +
      '<div class="row3"><div class="field"><label for="puCat">A qué prácticas</label><select id="puCat" data-chg="puSet" data-f="cat"><option value="">Todas</option>' + cats.map(c => '<option' + (c === m.cat ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="puPct">Porcentaje</label><div class="pct-in"><input id="puPct" inputmode="decimal" data-chg="puSet" data-f="pct" value="' + esc(m.pct) + '" placeholder="Ej.: 8"><span>%</span></div></div>' +
      '<div class="field"><label for="puR">Redondear a</label><select id="puR" data-chg="puSet" data-f="r">' + [[1, 'sin redondeo'], [100, '$ 100'], [500, '$ 500'], [1000, '$ 1.000']].map(x => '<option value="' + x[0] + '"' + (+m.r === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></div></div>';
    if (p) b += '<div class="tbl-scroll" style="max-height:46vh"><table class="tbl"><thead><tr><th>Práctica</th><th class="num">Ahora</th><th class="num">Queda</th></tr></thead><tbody>' + list.map(x => '<tr><td>' + esc(x.label) + '</td><td class="num">' + money(x.price) + '</td><td class="num"><b>' + money(round(x.price * (1 + p / 100), +m.r)) + '</b></td></tr>').join('') + '</tbody></table></div>';
    else b += '<div class="hint">Poné el porcentaje para ver cómo quedan los ' + list.length + ' precios.</div>';
    b += '<div class="hint">La lista anterior queda guardada: podés volver atrás desde «Historial de precios».</div>';
    return A.modalShell('Subir precios por porcentaje', b, '<button class="btn" data-act="pctBack">Volver</button><button class="btn primary" data-act="pctGo"' + (p ? '' : ' disabled') + '>Aplicar a ' + list.length + ' prácticas</button>');
  };
  A.chg.puSet = el => { const m = S.modal; m[el.getAttribute('data-f')] = el.value; A.renderModal(); };
  A.acts.pctBack = () => { S.modal = S.modal.back || null; A.renderModal(); };
  /* historial: cada cambio masivo guarda la lista anterior (máx. 12) */
  const hist = () => A.CFG.priceHist || (A.CFG.priceHist = []);
  A.acts.pctGo = () => {
    const m = S.modal, p = pctOf(m.pct); if (!p) return;
    hist().unshift({ at: new Date().toISOString(), what: (m.cat || 'Todas') + ' ' + (p > 0 ? '+' : '') + p + '%', prev: A.CAT.map(x => [x.k, x.price]) }); A.CFG.priceHist = hist().slice(0, 12);
    let n = 0; A.CAT.forEach(x => { if (!m.cat || x.cat === m.cat) { x.price = round(x.price * (1 + p / 100), +m.r); n++; } });
    A.save(); S.modal = m.back || null; A.renderModal(); A.toast(n + ' precios actualizados ' + (p > 0 ? '+' : '') + p + '%.');
  };
  A.acts.phOpen = () => { S.modal = { type: 'priceHist', back: S.modal }; A.renderModal(); };
  MF.priceHist = () => {
    const H = hist();
    const b = H.length ? '<ul class="pd-list">' + H.map((h, i) => '<li><b>' + esc(A.fmtDMY(h.at.slice(0, 10))) + '</b> · ' + esc(h.what) + ' <button class="btn small ghost" data-act="phUndo" data-i="' + i + '">Volver a los precios de antes</button></li>').join('') + '</ul>' : '<div class="empty">Todavía no hubo cambios masivos de precios.</div>';
    return A.modalShell('Historial de precios', b, '<button class="btn" data-act="pctBack">Volver</button>');
  };
  A.acts.phUndo = el => {
    if (!A.isBoss()) { A.toast(why(true)); return; }
    const h = hist()[+el.getAttribute('data-i')]; if (!h) return; const mp = {}; h.prev.forEach(x => { mp[x[0]] = x[1]; });
    A.CAT.forEach(x => { if (mp[x.k] != null) x.price = mp[x.k]; }); A.save(); S.modal = S.modal.back || null; A.renderModal(); A.toast('Precios restaurados al ' + A.fmtDMY(h.at.slice(0, 10)) + '.');
  };
  const catPrev = MF.catalog;
  MF.catalog = m => {
    const h = catPrev(m); if (typeof h !== 'string') return h;
    const top = '<div class="row-btns pu-row"><button class="btn small primary" data-act="pctOpen">Subir precios por %</button><button class="btn small" data-act="phOpen">Historial de precios</button>' + (A.costOpenBtn ? A.costOpenBtn() : '') + '</div>';
    return h.replace(/(<p class="hint">Cargá y modificá tus prácticas[^<]*<\/p>)/, '$1' + top);
  };

  /* coseguros de todas las obras sociales a la vez */
  A.acts.osPctAll = () => { S.modal = { type: 'osPctAll', back: S.modal, pct: '', what: 'cos' }; A.renderModal(); };
  MF.osPctAll = m => {
    const L = A.osList().filter(o => o.on && o.kind !== 'particular' && Object.keys(o.aran || {}).length);
    const b = '<p class="m-lead">Cambia de una vez lo cargado en todas las obras sociales con aranceles (' + L.length + '). Se redondea a $ 100.</p>' +
      '<div class="row2"><div class="field"><label for="opWhat">Qué</label><select id="opWhat" data-chg="opSet" data-f="what"><option value="cos"' + (m.what === 'cos' ? ' selected' : '') + '>Los coseguros (lo que paga el paciente)</option><option value="cov"' + (m.what === 'cov' ? ' selected' : '') + '>Lo que pagan las obras sociales</option><option value="both"' + (m.what === 'both' ? ' selected' : '') + '>Las dos cosas</option></select></div>' +
      '<div class="field"><label for="opPct">Porcentaje</label><div class="pct-in"><input id="opPct" inputmode="decimal" data-chg="opSet" data-f="pct" value="' + esc(m.pct) + '" placeholder="Ej.: 10"><span>%</span></div></div></div>' +
      '<div class="small-note">' + L.map(o => esc(o.sigla)).join(' · ') + '</div>';
    return A.modalShell('Coseguros: subir por porcentaje', b, '<button class="btn" data-act="pctBack">Volver</button><button class="btn primary" data-act="osPctAllGo">Aplicar</button>');
  };
  A.chg.opSet = el => { S.modal[el.getAttribute('data-f')] = el.value; };
  A.acts.osPctAllGo = () => {
    const m = S.modal, p = pctOf(($('#opPct') || {}).value || m.pct), w = ($('#opWhat') || {}).value || m.what; if (!p) { A.toast('Poné el porcentaje.'); return; }
    let n = 0; A.osList().forEach(o => { if (!o.on || o.kind === 'particular') return; Object.keys(o.aran || {}).forEach(k => { const a = o.aran[k]; if (w !== 'cov') a.cos = round((a.cos || 0) * (1 + p / 100), 100); if (w !== 'cos') a.cov = round((a.cov || 0) * (1 + p / 100), 100); n++; }); o.upd = A.today(); });
    A.save(); S.modal = m.back || null; A.renderModal(); A.toast(n + ' valores actualizados ' + p + '%.');
  };
  const osListPrev = MF.osList;
  if (osListPrev) MF.osList = m => {
    const h = osListPrev(m); if (typeof h !== 'string') return h;
    return h.replace('<button class="btn" data-act="osNew">', '<button class="btn" data-act="osPctAll">Coseguros por %</button>' + (A.fornBtn ? A.fornBtn() : '') + '<button class="btn" data-act="osNew">');
  };

  /* ---------- 3) al cobrar: qué paga el paciente según su obra social ---------- */
  const poPrev = MF.pracOk;
  if (poPrev) MF.pracOk = m => {
    let h = poPrev(m); if (typeof h !== 'string') return h;
    const p = A.PAT(m.pid) || {}, os = A.osOf ? A.osOf(p) : null;
    if (!os) return h;
    const miss = m.items.filter(i => i.on && !i.os).map(i => i.label);
    const codes = m.items.filter(i => i.on && i.os && i.os.code).map(i => i.os.code + (i.os.cos ? ' coseguro ' + money(i.os.cos) : ' sin coseguro'));
    let add = '';
    if (codes.length) add += '<div class="po-osinfo">Según los aranceles de <b>' + esc(os.sigla) + '</b>' + (os.forn && os.forn.vig ? ' (vigencia ' + esc(os.forn.vig) + ')' : '') + ': ' + esc(codes.join(' · ')) + '.</div>';
    if (miss.length) add += '<div class="po-osinfo warn">' + esc(os.sigla) + ' no tiene cargado el arancel de: ' + esc(miss.join(', ')) + '. Se cobra como particular.' + (A.isBoss() ? ' <button class="btn small" data-act="osEdit" data-id="' + esc(os.id) + '">Cargar aranceles</button>' : '') + '</div>';
    return h.replace('<div class="po-tot">', add + '<div class="po-tot">');
  };

  /* ---------- 4) DNI completo en el buscador: abre la ficha ---------- */
  document.addEventListener('input', e => {
    const el = e.target; if (!el || el.id !== 'topQ') return;
    const v = String(el.value || '').replace(/\D/g, ''); if (v.length < 7 || v !== String(el.value).replace(/[\s.]/g, '')) return;
    const L = A.PATS.filter(p => String(p.dni || '').replace(/\D/g, '') === v); if (L.length !== 1) return;
    setTimeout(() => { el.value = ''; const host = $('#topRes'); if (host) host.innerHTML = ''; el.blur(); A.openFicha(L[0].id, 'datos'); A.toast('Ficha de ' + L[0].name + '.'); }, 120);
  });

  const css = document.createElement('style');
  css.textContent = '.pu-row{margin:4px 0 10px}.po-osinfo{font-size:.85rem;margin:8px 0 0;padding:8px 10px;border-radius:10px;background:var(--soft,#eef6f6)}.po-osinfo.warn{background:#fff4e0}.po-osinfo .btn{margin-left:6px}';
  document.head.appendChild(css);
})();
