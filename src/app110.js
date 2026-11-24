/* ===== 1.24: caja privada de cada profesional (alquila, socia, otro): la administración ve solo el alquiler ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc;
  const cfgOf = pid => (A.liqCfg ? A.liqCfg(pid) : {}) || {};
  /* ¿la caja de este profesional es privada? Alquila: privada salvo que se destilde. Socia y otro: privada si la tildan. Porcentaje: nunca (una parte es del centro). */
  A.proPriv = pid => { const c = cfgOf(pid), md = c.mode || 'pct'; if (md === 'pct' || md === 'pctmod') return false; return md === 'mod' || md === 'alq' ? c.priv !== false : c.priv === true; };
  /* ¿se la oculto a quien está usando la app? (el propio profesional siempre ve la suya) */
  A.privFrom = pid => !!pid && A.proPriv(pid) && !(A.myProId && A.myProId() === pid);
  /* «Solo yo» (1.25.2): nadie más puede abrirla, ni el dueño de la cuenta */
  A.proSolo = pid => A.proPriv(pid) && cfgOf(pid).solo === true;
  A.soloFrom = pid => !!pid && A.proSolo(pid) && !(A.myProId && A.myProId() === pid);
  /* «Privada»: la apaga el propio profesional o, desde el usuario del dueño, con aviso en el registro. «Solo yo»: únicamente él */
  A.privLocked = pid => A.proPriv(pid) && !(A.myProId && A.myProId() === pid) && (A.proSolo(pid) || !!(A.memberRaw && A.memberRaw()));

  A.privHTML = (pid, mode) => {
    if (mode === 'pct' || mode === 'pctmod') return '<div class="hint">Su caja es visible para la administración: una parte de lo que cobra es del consultorio.</div>';
    const on = A.proPriv(pid), lock = A.privLocked(pid);
    return '<label class="chk pv-row"><input type="checkbox" data-chg="dlSet" data-f="priv" data-id="' + pid + '"' + (on ? ' checked' : '') + (lock ? ' disabled' : '') + '> <span><b>Caja privada</b>: solo este profesional ve sus cobros y sus números. La administración ve únicamente el alquiler.</span></label>' +
      (lock ? '<div class="hint">Solo el propio profesional puede abrir su caja.</div>' : '') +
      '<div class="hint">Se oculta en la caja general, el inicio, Liquidaciones y «Mis números». La cuenta de cada paciente (que es del consultorio) sigue mostrando sus cobros.</div>';
  };
  const dlPrev = A.chg.dlSet;
  A.chg.dlSet = function (el) {
    if (el.getAttribute('data-f') !== 'priv') return dlPrev.apply(this, arguments);
    const pid = el.getAttribute('data-id'), c = cfgOf(pid), want = !!el.checked;
    if (!want && A.privLocked(pid)) { el.checked = true; A.toast('Solo el propio profesional puede abrir su caja.'); return; }
    if (!want && A.proPriv(pid) && !(A.myProId && A.myProId() === pid) && !window.confirm('Vas a abrir la caja privada de este profesional: la administración va a ver sus cobros. ¿Seguir?')) { el.checked = true; return; }
    c.priv = want; if (A.empAudit) { try { A.empAudit((want ? 'Caja privada activada' : 'Caja privada desactivada') + ' para ' + ((A.PRO(pid) || {}).name || pid) + '.'); } catch (e) { /* nada */ } }
    const p = A.PRO(pid); if (p && p.deal) p.deal.priv = want;
    A.save(); if (S.modal) A.renderModal(); else A.refresh();
  };

  /* lo cobrado por cada profesional: para quien no puede verlo, no existe */
  const allocPrev = A.cobAlloc;
  A.cobAlloc = () => allocPrev().filter(x => !A.privFrom(x.pro));
  const calcPrev = A.liqCalc;
  A.liqCalc = (pid, m) => {
    const c = calcPrev(pid, m); if (!A.privFrom(pid)) return c;
    const rent = (c.deds || []).filter(d => d.auto).reduce((s, d) => s + (+d.amount || 0), 0);
    return Object.assign(c, { hidden: true, lines: [], byCat: {}, prod: 0, dent: 0, eff: 0, net: 0, deds: (c.deds || []).filter(d => d.auto), ded: rent, center: rent, deal: 'Caja privada: la administración ve solo el alquiler' });
  };
  const metPrev = A.liqMethods;
  if (metPrev) A.liqMethods = (pid, m) => A.privFrom(pid) ? { by: {}, os: {}, owed: 0, total: 0 } : metPrev(pid, m);
  const liqPrev = A.render.liq;
  A.render.liq = () => {
    liqPrev(); const pid = S.liq && S.liq.pro && S.liq.pro !== 'all' ? S.liq.pro : null, host = document.querySelector('#view-liq');
    if (!pid || !host || !A.privFrom(pid) || host.querySelector('.pv-note')) return;
    const t = host.querySelector('.ag-title'); if (t) t.insertAdjacentHTML('afterend', '<div class="hint pv-note">🔒 La caja de ' + esc((A.PRO(pid) || {}).short || '') + ' es privada. Acá se ve solo el alquiler.</div>');
  };
  /* «Mi caja» en «Mis números»: cada dueño/a o socio/a decide si sus cobros se ven en la caja general */
  A.chg.pvMine = el => {
    const pid = A.myProId && A.myProId(); if (!pid || !(A.isBoss && A.isBoss())) return;
    const c = cfgOf(pid), v = el.value, want = v === 'priv' || v === 'solo';
    if (want && (c.mode || 'pct') === 'pct') { c.mode = 'socia'; }
    c.priv = want; c.solo = v === 'solo'; const p = A.PRO(pid); if (p && p.deal) { p.deal.priv = want; p.deal.solo = c.solo; p.deal.mode = c.mode; }
    if (A.empAudit) { try { A.empAudit('Caja propia: ' + (v === 'solo' ? 'solo yo' : want ? 'privada' : 'visible') + ' (' + ((A.PRO(pid) || {}).name || pid) + ').'); } catch (e) { /* nada */ } }
    A.save(); A.toast(v === 'solo' ? 'Listo: solo vos ves tus números. Nadie más puede abrirlos.' : want ? 'Listo: tus cobros ya no se ven en la caja general.' : 'Listo: tus cobros se ven en la caja general.'); if (S.modal) A.renderModal(); else A.refresh();
  };
  /* «Solo yo»: sus cobros pendientes tampoco aparecen en «Para cobrar» de los demás */
  const pcPrev = A.pcList;
  if (pcPrev) A.pcList = opt => pcPrev(opt).filter(it => !(it.items && it.items.length && it.items.every(e => A.soloFrom(e.pro))));
  const myPrev = A.modalFns.myLiq;
  if (myPrev) A.modalFns.myLiq = m => {
    const h = myPrev(m), pid = A.myProId && A.myProId(); if (typeof h !== 'string' || !pid || h.indexOf('pvMine') >= 0) return h;
    const boss = A.isBoss && A.isBoss(), on = A.proPriv(pid);
    const blk = '<div class="block pv-mine"><h3>Mi caja</h3>' + (boss
      ? '<div class="field"><label for="pvSel">Quién ve mis números</label><select id="pvSel" data-chg="pvMine"><option value=""' + (!on ? ' selected' : '') + '>Visible: se ven en la caja del consultorio</option><option value="priv"' + (on && !A.proSolo(pid) ? ' selected' : '') + '>Privada: no aparecen en la caja general, el inicio ni las liquidaciones</option><option value="solo"' + (A.proSolo(pid) ? ' selected' : '') + '>Solo yo: además tampoco en «Para cobrar», y nadie más puede abrirla (ni el dueño)</option></select></div><div class="hint">Podés cambiarlo cuando quieras (en «Solo yo», solo vos). La historia clínica y los pacientes siguen siendo del consultorio, y la cuenta de cada paciente muestra sus cobros.</div>'
      : '<div class="hint">' + (on ? '🔒 Tu caja es privada: la administración ve solo el alquiler.' : 'Tu caja es visible para la administración del consultorio.') + '</div>') + '</div>';
    return h.replace('<div class="hint">Es un cálculo', blk + '<div class="hint">Es un cálculo');
  };
  const css = document.createElement('style');
  css.textContent = '.pv-row{display:flex;gap:8px;align-items:flex-start;margin:6px 0}.pv-row span{font-size:.9rem;color:var(--ink-2)}';
  document.body.appendChild(css);
})();
