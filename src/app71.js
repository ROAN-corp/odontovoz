/* ===== 1.49: turnos de 15 minutos a 8 horas y acceso a la receta electrónica de cada profesional (RCTA u otra) ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } } };

  /* ---------- 1) duración de los turnos: de 15 minutos a 8 horas ---------- */
  const DURS = []; for (let m = 15; m <= 480; m += 15) DURS.push(m);
  const durTxt = m => { const h = Math.floor(m / 60), r = m % 60; return h ? h + (h === 1 ? ' hora' : ' horas') + (r ? ' y ' + r + ' min' : '') : m + ' min'; };
  A.durTxt = durTxt;
  const fixDur = sel => {
    if (!sel || sel._ovDur) return; sel._ovDur = 1;
    const cur = parseInt(sel.value, 10) || 30, end = Array.prototype.filter.call(sel.options, o => o.value === 'end')[0];
    const L = DURS.slice(); if (L.indexOf(cur) < 0) { L.push(cur); L.sort((a, b) => a - b); }
    sel.innerHTML = L.map(m => '<option value="' + m + '"' + (m === cur ? ' selected' : '') + '>' + durTxt(m) + '</option>').join('') + (end ? end.outerHTML : '');
    if (end && end.selected) sel.value = 'end';
  };
  const fixAll = () => ['#naDur', '#apDur', '#ltNu', '#qbDur'].forEach(id => fixDur($(id)));
  const rmPrev = A.renderModal; A.renderModal = function () { const r = rmPrev.apply(this, arguments); try { fixAll(); } catch (e) { /* nada */ } return r; };
  new MutationObserver(() => fixAll()).observe(document.body, { childList: true, subtree: true });

  /* ---------- 2) receta electrónica: acceso directo con los datos del paciente ---------- */
  const RCTA_PKG = 'com.innovamed.rcta';
  const PLAT = [
    { k: 'rcta', name: 'RCTA', url: 'https://rcta.me' },
    { k: 'otra', name: 'Otra plataforma', url: '' }
  ];
  /* cada profesional: lo carga el dueño en su ficha (queda para todos los equipos) o el propio profesional en su equipo */
  const rxOf = pid => {
    const own = LS.get('odontovoz.rx.' + pid); if (own) { try { return JSON.parse(own); } catch (e) { /* nada */ } }
    const p = A.PRO(pid); return p && p.rx && p.rx.url ? p.rx : null;
  };
  A.rxOf = rxOf;
  const proOfFicha = pid => { const mb = A.memberNow && A.memberNow(); if (mb && mb.pro) return mb.pro; const p = A.PAT(pid); return (p && p.pro) || (A.PROS[0] || {}).id; };
  const patText = pid => {
    const p = A.PAT(pid) || {}, pd = A.pd(pid), pr = pd.prof || {};
    const L = [['Paciente', p.name], ['DNI', p.dni], ['Fecha de nacimiento', pr.birth || p.birth ? A.fmtDMY(pr.birth || p.birth) : ''], ['Sexo', pr.sex || ''], ['Obra social', p.cov], ['N.º de afiliado', pr.covNum || pr.afil || p.covNum || ''], ['Plan', pr.plan || ''], ['Teléfono', p.phone], ['Correo', pr.email || p.email || '']];
    return L.filter(x => x[1]).map(x => x[0] + ': ' + x[1]).join('\n');
  };
  A.acts.rxGo = el => {
    const pid = S.fichaPid, pro = el.getAttribute('data-pro') || proOfFicha(pid), rx = rxOf(pro);
    if (!rx) { S.modal = { type: 'rxCfg', pro, back: null }; A.renderModal(); return; }
    const txt = patText(pid);
    /* la app de RCTA si está instalada (Android); en iPhone la web de RCTA abre la app si la tenés */
    const android = /Android/i.test(navigator.userAgent), useApp = rx.k === 'rcta' && rx.app !== false && android;
    const go = () => {
      if (useApp && window.OV_NATIVE) { location.href = 'ovapp:' + RCTA_PKG + '?f=' + encodeURIComponent(rx.url); return; }
      if (useApp) { /* Chrome en Android: intenta la app; si en 1,5 s seguimos acá, abre la web en otra pestaña */
        location.href = 'intent://rcta.me/#Intent;scheme=https;package=' + RCTA_PKG + ';end';
        setTimeout(() => { if (document.visibilityState === 'visible') { try { window.open(rx.url, '_blank', 'noopener'); } catch (e) { /* nada */ } } }, 1500); return;
      }
      try { window.open(rx.url, '_blank', 'noopener'); } catch (e) { location.href = rx.url; }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => { A.toast('Datos del paciente copiados: pegalos en ' + rx.name + '.'); go(); }, () => go()); else go();
    if (A.alog) A.alog(pid, 'receta', 'Abrió la receta electrónica (' + rx.name + ')');
  };
  A.acts.rxCfg = el => { S.modal = { type: 'rxCfg', pro: el.getAttribute('data-pro') || proOfFicha(S.fichaPid), back: S.modal }; A.renderModal(); };
  MF.rxCfg = m => {
    const p = A.PRO(m.pro) || {}, cur = rxOf(m.pro) || {}, k = m.k || cur.k || 'rcta', plat = PLAT.filter(x => x.k === k)[0] || PLAT[0];
    const boss = !A.isBoss || A.isBoss();
    const b = '<p class="m-lead">La receta electrónica se hace en la plataforma que use ' + esc(p.name || 'el profesional') + ' (en Neuquén y Río Negro, por ejemplo RCTA). Desde la ficha, un botón copia los datos del paciente y abre la plataforma para pegarlos.</p>' +
      '<div class="field"><label for="rxK">Plataforma</label><select id="rxK" data-chg="rxK">' + PLAT.map(x => '<option value="' + x.k + '"' + (x.k === k ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div>' +
      (k === 'otra' ? '<div class="field"><label for="rxN">Nombre</label><input id="rxN" value="' + esc(cur.k === 'otra' ? cur.name : '') + '" placeholder="Ej.: receta del Colegio"></div>' : '') +
      '<div class="field"><label for="rxU">Dirección para entrar</label><input id="rxU" inputmode="url" value="' + esc(cur.url && cur.k === k ? cur.url : plat.url) + '" placeholder="https://…"></div>' +
      (k === 'rcta' ? '<label class="chk"><input type="checkbox" id="rxApp"' + (cur.app !== false ? ' checked' : '') + '> Abrir la app de RCTA si está instalada (Android). En iPhone se abre la web, que pasa a la app si la tenés.</label>' : '') +
      '<div class="hint">El usuario y la contraseña de la plataforma no se guardan en OdontoVoz: cada profesional entra con los suyos.' + (boss ? ' Queda guardado para todos los equipos.' : ' Queda guardado en este equipo.') + '</div><div id="rxMsg" class="m-msg"></div>';
    return A.modalShell('Receta electrónica · ' + (p.short || p.name || ''), b, '<button class="btn" data-act="rxBack">Cancelar</button>' + (cur.url ? '<button class="btn ghost" data-act="rxDel">Quitar</button>' : '') + '<button class="btn primary" data-act="rxSave">Guardar</button>');
  };
  A.chg.rxK = el => { S.modal.k = el.value; A.renderModal(); };
  A.acts.rxBack = () => { S.modal = S.modal.back || null; A.renderModal(); };
  A.acts.rxSave = () => {
    const m = S.modal, k = ($('#rxK') || {}).value || 'rcta', P = PLAT.filter(x => x.k === k)[0], url = String(($('#rxU') || {}).value || '').trim();
    if (!/^https?:\/\/\S+\.\S+/.test(url)) { const x = $('#rxMsg'); if (x) x.textContent = 'Poné la dirección completa (empieza con https://).'; return; }
    const rx = { k, name: k === 'otra' ? (String(($('#rxN') || {}).value || '').trim() || 'Receta electrónica') : P.name, url };
    if (k === 'rcta') rx.app = !!(($('#rxApp') || {}).checked);
    if (!A.isBoss || A.isBoss()) { const p = A.PRO(m.pro); if (p) { p.rx = rx; A.save(); } LS.set('odontovoz.rx.' + m.pro, null); }
    else LS.set('odontovoz.rx.' + m.pro, JSON.stringify(rx));
    S.modal = m.back || null; A.renderModal(); A.refresh(); A.toast('Listo: ' + rx.name + ' configurada.');
  };
  A.acts.rxDel = () => { const m = S.modal, p = A.PRO(m.pro); if (p && (!A.isBoss || A.isBoss())) { delete p.rx; A.save(); } LS.set('odontovoz.rx.' + m.pro, null); S.modal = m.back || null; A.renderModal(); A.refresh(); };

  /* 1.49.2: la receta electrónica va en la pestaña «Indicaciones y recetas» de la historia clínica, arriba de las indicaciones */
  const rxCard = pid => {
    const pro = proOfFicha(pid), rx = rxOf(pro), p = A.PRO(pro) || {};
    return '<section class="card rx-card"><h2>Receta electrónica</h2>' + (rx
      ? '<p class="hint" style="margin-top:0">Copia los datos de ' + esc((A.PAT(pid) || {}).name || 'el paciente') + ' y abre ' + esc(rx.name) + ' para que ' + esc(p.short || p.name || 'el profesional') + ' haga la receta para la farmacia.</p><div class="row-btns"><button class="btn primary" data-act="rxGo" data-pro="' + pro + '">Recetar en ' + esc(rx.name) + '</button><button class="btn small ghost" data-act="rxCfg" data-pro="' + pro + '">Cambiar plataforma</button></div>'
      : '<p class="hint" style="margin-top:0">Configurá la plataforma de receta electrónica de ' + esc(p.name || 'cada profesional') + ' (por ejemplo RCTA) y desde acá se abre con los datos del paciente listos para pegar.</p><button class="btn" data-act="rxCfg" data-pro="' + pro + '">Configurar receta electrónica</button>') + '</section>';
  };
  const rxTabPrev = A.render.rxTab;
  if (rxTabPrev) A.render.rxTab = pid => {
    const h = String(rxTabPrev(pid)).replace('<h2>Indicaciones <span', '<h2>Indicaciones para el paciente <span');
    return rxCard(pid) + h;
  };
  /* en la ficha del profesional (Ajustes › Profesionales) */
  const cfgPrev = MF.cfg;
  if (cfgPrev) MF.cfg = m => {
    const h = cfgPrev(m); if (!m || m.tab !== 'pros' || !m.sel || m.wiz || m.rm || typeof h !== 'string') return h;
    const rx = rxOf(m.sel), mark = '<div class="block"><h3>Días y horarios de atención</h3>';
    if (h.indexOf(mark) < 0) return h;
    return h.replace(mark, '<div class="block"><h3>Receta electrónica</h3><div class="row-btns"><span>' + (rx ? esc(rx.name) + ' · <span class="small-note">' + esc(rx.url) + '</span>' : 'Sin configurar') + '</span><button class="btn small" data-act="rxCfg" data-pro="' + m.sel + '">' + (rx ? 'Cambiar' : 'Configurar') + '</button></div></div>' + mark);
  };

  const css = document.createElement('style');
  css.textContent = '.rx-card .row-btns{align-items:center}';
  document.head.appendChild(css);
})();
