/* ===== 1.43: tope mensual de prácticas por obra social: aviso por paciente en la ficha, en la resumida y al registrar una práctica ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, $ = q => document.querySelector(q);
  const mon = () => A.today().slice(0, 7);
  const baseOs = p => { const o = A.osOf ? A.osOf(p) : null; return o && o.base ? o.base : o; };

  /* Cuántas prácticas hechas tiene el paciente este mes con su obra social y cuál es el tope (o.tope; 0 = sin tope). */
  A.osTope = pid => {
    const p = A.PAT(pid), pd = A.S.pd[pid]; if (!p || !pd) return null;
    const o = baseOs(p); if (!o || o.kind === 'particular') return null;
    const ids = {}; ids[o.id] = 1; const raw = A.osOf(p); if (raw && raw.id) ids[raw.id] = 1;
    const m = mon();
    const rows = (pd.tx || []).filter(t => t.status === 'hecho' && t.doneDate && String(t.doneDate).slice(0, 7) === m && ids[(t.os && t.os.id) || o.id])
      .sort((a, b) => (a.doneDate < b.doneDate ? -1 : a.doneDate > b.doneDate ? 1 : 0));
    return { os: o, n: rows.length, tope: Math.max(0, Math.floor(+o.tope || 0)), rows };
  };
  const plural = n => n + ' práctica' + (n === 1 ? '' : 's');
  /* nivel: red = llegó o se pasó · warn = le queda una · info = el resto */
  const info = pid => {
    const r = A.osTope(pid); if (!r || !r.n) return null;
    const s = r.os.sigla || 'la obra social', t = r.tope;
    if (t && r.n > t) return Object.assign(r, { lv: 'red', msg: 'Se pasó del tope: ' + plural(r.n) + ' este mes con ' + s + ' y el tope es ' + t + '.' });
    if (t && r.n === t) return Object.assign(r, { lv: 'red', msg: 'Llegó al tope: ya hizo ' + t + ' de ' + t + ' prácticas este mes con ' + s + '.' });
    if (t && t - r.n === 1) return Object.assign(r, { lv: 'warn', msg: 'Le queda 1 práctica este mes con ' + s + ' (hizo ' + r.n + ' de ' + t + ').' });
    return Object.assign(r, { lv: 'info', msg: t ? r.n + ' de ' + t + ' prácticas este mes con ' + s + '.' : 'Este mes: ' + plural(r.n) + ' con ' + s + '.' });
  };
  const html = pid => {
    const r = info(pid); if (!r) return '';
    const L = r.rows.map(t => '<li><span class="mono">' + esc(A.fmtDMY(t.doneDate)) + '</span> ' + esc((t.label || t.cond || 'Práctica') + (t.tooth ? ' ' + t.tooth : '')) + '</li>').join('');
    return '<div class="ostp ostp-' + r.lv + '" data-pid="' + esc(pid) + '"' + (r.lv === 'red' ? ' role="alert"' : '') + '><details><summary><span class="ostp-i" aria-hidden="true">' + (r.lv === 'info' ? 'ⓘ' : '⚠') + '</span><span class="ostp-t">' + esc(r.msg) + '</span><span class="ostp-v">ver</span></summary><ul>' + L + '</ul></details></div>';
  };
  /* para que un redibujado no cierre el detalle que estaba abierto */
  let openPid = null;
  document.addEventListener('toggle', e => { const d = e.target; if (d && d.tagName === 'DETAILS' && d.closest && d.closest('.ostp')) openPid = d.open ? d.closest('.ostp').getAttribute('data-pid') : null; }, true);
  const put = (host, anchorSel, pid) => {
    if (!host) return;
    const old = host.querySelector('.ostp'); if (old) old.remove();
    const h = html(pid); if (!h) return;
    const at = anchorSel && host.querySelector(anchorSel);
    if (at) at.insertAdjacentHTML('afterend', h); else host.insertAdjacentHTML('afterbegin', h);
    const d = host.querySelector('.ostp details'); if (d && openPid === pid) d.open = true;
  };

  /* en la ficha completa: arriba de todo, en cualquier solapa */
  const fichaPrev = A.render.ficha;
  A.render.ficha = function () {
    const r = fichaPrev.apply(this, arguments);
    try { if (S.fichaPid) put($('#fichaBody'), null, S.fichaPid); } catch (e) { /* nada */ }
    return r;
  };
  /* en la ficha resumida: debajo del encabezado (otros módulos arman bloques un instante después, por eso se repite) */
  const panelPrev = A.renderPanel;
  A.renderPanel = function () {
    const r = panelPrev.apply(this, arguments);
    const go = () => {
      try {
        const pn = S.panel, pid = pn && (pn.type === 'pat' ? pn.pid : pn.type === 'appt' ? (A.apptById(pn.id) || {}).pid : null);
        if (pid) put($('#panelHost'), '.panel-head', pid);
      } catch (e) { /* nada */ }
    };
    go(); requestAnimationFrame(go); setTimeout(go, 150);
    return r;
  };

  /* al registrar una práctica hecha: si con esa llega o pasa el tope, aviso en el momento */
  const donePrev = A.onTxDone;
  A.onTxDone = function (pid, t) {
    const r = donePrev ? donePrev.apply(this, arguments) : undefined;
    try { const i = info(pid); if (i && i.tope && i.n >= i.tope) A.toast(i.msg + ' Revisá antes de seguir.'); } catch (e) { /* nada */ }
    return r;
  };

  /* en la obra social: el tope mensual */
  const edPrev = A.modalFns.osEdit;
  if (edPrev) A.modalFns.osEdit = m => {
    const h = edPrev(m), o = A.osById(m.id); if (typeof h !== 'string' || !o || o.kind === 'particular') return h;
    const f = '<div class="field"><label for="os_tope">Tope de prácticas por mes (por paciente)</label><input id="os_tope" type="number" min="0" step="1" inputmode="numeric" data-chg="osTope" data-os="' + esc(o.id) + '" value="' + (o.tope ? esc(o.tope) : '') + '" placeholder="Sin tope">' +
      '<div class="hint">Si la obra social limita las prácticas por mes, escribí cuántas. En la ficha del paciente te avisa cuando le queda una y cuando llega al tope. Vacío = sin tope.</div></div>';
    const k = '<div class="field"><label for="os_notes">';
    return h.indexOf(k) >= 0 ? h.replace(k, f + k) : h;
  };
  A.chg.osTope = el => {
    const o = A.osById(el.getAttribute('data-os')); if (!o) return;
    const n = Math.floor(+String(el.value).replace(',', '.')); if (n > 0) o.tope = n; else { delete o.tope; el.value = ''; }
    A.save(); A.toast(o.tope ? 'Tope de ' + o.sigla + ': ' + o.tope + ' prácticas por mes.' : 'Sin tope para ' + o.sigla + '.');
  };

  const css = document.createElement('style');
  css.id = 'ovApp126';
  css.textContent = [
    '.ostp { margin: 0 0 10px; border: 1px solid var(--line); border-left-width: 4px; border-radius: 10px; background: var(--surface); font-size: 14px; }',
    '.ostp summary { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; list-style: none; }',
    '.ostp summary::-webkit-details-marker { display: none; }',
    '.ostp-i { flex: none; font-weight: 700; }',
    '.ostp-t { flex: 1; min-width: 0; line-height: 1.35; font-weight: 600; }',
    '.ostp-v { flex: none; font-size: 12px; color: var(--ink-2); }',
    '.ostp details[open] .ostp-v { display: none; }',
    '.ostp ul { margin: 0; padding: 0 12px 10px 34px; font-size: 13px; color: var(--ink-2); display: flex; flex-direction: column; gap: 2px; }',
    '.ostp-info { border-left-color: var(--accent); }',
    '.ostp-info .ostp-i { color: var(--accent); }',
    '.ostp-warn { border-left-color: var(--warn); background: var(--surface-2); }',
    '.ostp-warn .ostp-i { color: var(--warn); }',
    '.ostp-red { border-color: var(--red); border-left-color: var(--red); background: var(--surface-2); }',
    '.ostp-red .ostp-i, .ostp-red .ostp-t { color: var(--red); }'
  ].join('\n');
  document.head.appendChild(css);
})();
