/* ===== 1.21: notas de facturación a obras sociales en la ficha (registro continuo por paciente, aparte de la evolución) ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, $ = q => document.querySelector(q);
  /* Cada nota: { id, mes: 'AAAA-MM', os, txt, at: 'AAAA-MM-DD', by }. Vive en pd.factNotes y se sincroniza con la ficha. */
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mesTxt = m => { const p = String(m || '').split('-'); return p.length === 2 ? A.cap(MESES[(+p[1] || 1) - 1]) + ' ' + p[0] : ''; };
  const list = pid => { const pd = A.pd(pid); return (pd.factNotes = pd.factNotes || []); };
  const sorted = pid => list(pid).slice().sort((a, b) => (a.mes === b.mes ? (a.at < b.at ? 1 : a.at > b.at ? -1 : (a.id < b.id ? 1 : -1)) : a.mes < b.mes ? 1 : -1));
  const who = () => { try { return (A.actor && A.actor().who) || ''; } catch (e) { return ''; } };
  const thisMonth = () => A.today().slice(0, 7);
  let edit = null, delAsk = null; /* id en edición / id que pide confirmar borrado */
  let draft = null; /* lo que se está escribiendo: sobrevive si la ficha se redibuja (sincronización) */
  document.addEventListener('input', e => {
    const f = e.target && e.target.closest && e.target.closest('.ofn-form'); if (!f) return;
    draft = { pid: f.getAttribute('data-pid'), edit, mes: ($('#ofnMes') || {}).value, os: ($('#ofnOs') || {}).value, txt: ($('#ofnTxt') || {}).value };
  });

  function sectionHTML(pid) {
    const p = A.PAT(pid) || {}, L = sorted(pid), d = draft && draft.pid === pid && draft.edit === edit ? draft : null;
    let e = edit && list(pid).filter(x => x.id === edit)[0];
    if (d) e = Object.assign({}, e || {}, { mes: d.mes, os: d.os, txt: d.txt, _d: 1 });
    let h = '<section class="card ofn-card" id="ofnCard"><div class="ofn-head"><h2>Facturado a obras sociales <span class="count">' + L.length + '</span></h2></div>' +
      '<p class="hint" style="margin:0 0 8px">Anotá lo que le facturaste a la obra social (prácticas y piezas) para no volver a facturarlo por error. Es aparte de la evolución y no cambia cobros ni liquidaciones.</p>' +
      '<form class="ofn-form" data-sub="ofnSave" data-pid="' + esc(pid) + '">' +
      '<div class="ofn-row"><label class="field"><span>Mes facturado</span><input class="inp" type="month" id="ofnMes" value="' + esc(e && e.mes ? e.mes : thisMonth()) + '" required></label>' +
      '<label class="field"><span>Obra social</span><input class="inp" id="ofnOs" value="' + esc(e ? e.os : (p.cov && !/particular/i.test(p.cov) ? p.cov : '')) + '" placeholder="Ej.: OSDE" autocomplete="off"></label></div>' +
      '<label class="field"><span>Qué facturaste</span><textarea class="inp" id="ofnTxt" rows="3" required placeholder="Ej.: consulta 01.01 · arreglo pieza 36 (OD) y 46 (MOD) · limpieza">' + esc(e ? e.txt : '') + '</textarea></label>' +
      '<div class="row-btns"><button class="btn primary" type="submit">' + (edit ? 'Guardar cambios' : 'Agregar nota') + '</button>' + (edit || (e && e._d) ? '<button class="btn ghost" type="button" data-act="ofnCancel">Cancelar</button>' : '') + '</div></form>';
    if (L.length) {
      h += '<ol class="ofn-list">' + L.map(n => '<li class="ofn-it' + (n.id === edit ? ' ofn-ed' : '') + '"><div class="ofn-top"><b>' + esc(mesTxt(n.mes)) + '</b>' + (n.os ? '<span class="chip acc">' + esc(n.os) + '</span>' : '') +
        '<span class="ofn-acts">' + (delAsk === n.id
          ? '<span class="ofn-q">¿Borrar?</span><button class="lnk bad" data-act="ofnDel" data-pid="' + esc(pid) + '" data-id="' + esc(n.id) + '">Sí, borrar</button><button class="lnk" data-act="ofnNo">No</button>'
          : '<button class="lnk" data-act="ofnEdit" data-pid="' + esc(pid) + '" data-id="' + esc(n.id) + '">Editar</button><button class="lnk" data-act="ofnAsk" data-pid="' + esc(pid) + '" data-id="' + esc(n.id) + '">Borrar</button>') + '</span></div>' +
        '<div class="ofn-txt">' + esc(n.txt).replace(/\n/g, '<br>') + '</div>' +
        '<div class="ofn-meta">Anotado el ' + esc(A.fmtDMY(n.at)) + (n.by ? ' · ' + esc(n.by) : '') + '</div></li>').join('') + '</ol>';
    } else h += '<p class="hint ofn-empty">Todavía no hay notas de facturación para este paciente.</p>';
    return h + '</section>';
  }
  function mount() {
    if (S.tab !== 'ficha' || S.fichaTab !== 'datos' || !S.fichaPid) return;
    const body = $('#fichaBody'); if (!body) return;
    const old = $('#ofnCard'), html = sectionHTML(S.fichaPid);
    if (old) { old.outerHTML = html; return; }
    const after = body.querySelector('.mv-card');
    if (after) after.insertAdjacentHTML('afterend', html); else body.insertAdjacentHTML('afterbegin', html);
  }
  const fichaPrev = A.render.ficha;
  A.render.ficha = function () { const r = fichaPrev.apply(this, arguments); try { if (S.fichaPid !== mount._pid) { edit = null; delAsk = null; draft = null; mount._pid = S.fichaPid; } mount(); } catch (e) { /* nada */ } return r; };

  A.subs.ofnSave = (form, e) => {
    if (e && e.preventDefault) e.preventDefault();
    const pid = form.getAttribute('data-pid'), mes = ($('#ofnMes') || {}).value, os = (($('#ofnOs') || {}).value || '').trim(), txt = (($('#ofnTxt') || {}).value || '').trim();
    if (!txt) { A.toast('Escribí qué facturaste.'); return; }
    if (!/^\d{4}-\d{2}$/.test(mes || '')) { A.toast('Elegí el mes facturado.'); return; }
    const L = list(pid), cur = edit && L.filter(x => x.id === edit)[0];
    if (cur) Object.assign(cur, { mes, os, txt, at: A.today(), by: who() || cur.by });
    else L.push({ id: A.uid(), mes, os, txt, at: A.today(), by: who() });
    const was = !!cur; edit = null; delAsk = null; draft = null;
    A.touchPd(pid); mount(); A.toast(was ? 'Nota de facturación actualizada.' : 'Nota de facturación agregada.');
  };
  A.acts.ofnEdit = el => { edit = el.getAttribute('data-id'); delAsk = null; draft = null; mount(); const t = $('#ofnTxt'); if (t) { t.focus(); t.scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
  A.acts.ofnCancel = () => { edit = null; draft = null; mount(); };
  A.acts.ofnAsk = el => { delAsk = el.getAttribute('data-id'); mount(); };
  A.acts.ofnNo = () => { delAsk = null; mount(); };
  A.acts.ofnDel = el => {
    const pid = el.getAttribute('data-pid'), id = el.getAttribute('data-id'), pd = A.pd(pid);
    pd.factNotes = (pd.factNotes || []).filter(x => x.id !== id); if (edit === id) edit = null; delAsk = null;
    A.touchPd(pid); mount(); A.toast('Nota borrada.');
  };

  /* en la ficha resumida: la última nota, para tenerla a mano antes de facturar */
  const panelPrev = A.renderPanel;
  A.renderPanel = function () {
    const r = panelPrev.apply(this, arguments);
    try {
      const pn = S.panel, pid = pn && (pn.type === 'pat' ? pn.pid : pn.type === 'appt' ? (A.apptById(pn.id) || {}).pid : null);
      const L = pid ? sorted(pid) : [];
      if (L.length) {
        const n = L[0], html = '<button class="ofn-mini" data-act="openFicha" data-pid="' + esc(pid) + '" data-tab="datos"><span class="ofn-mini-l">Última facturación a OS</span><b>' + esc(mesTxt(n.mes)) + (n.os ? ' · ' + esc(n.os) : '') + '</b><span class="ofn-mini-t">' + esc(n.txt.replace(/\s+/g, ' ').slice(0, 110)) + (n.txt.length > 110 ? '…' : '') + '</span></button>';
        /* el recuadro de «Ficha completa» (.fc-card) se arma un instante después: ubicarla debajo de él */
        const place = () => { const old = $('#panelHost .ofn-mini'); if (old) old.remove(); const fc = $('#panelHost .fc-card'); if (fc) fc.insertAdjacentHTML('beforeend', html); else { const h = $('#panelHost .panel-head'); if (h) h.insertAdjacentHTML('afterend', html); } };
        place(); requestAnimationFrame(() => { const fc = $('#panelHost .fc-card'); if (fc && !fc.querySelector('.ofn-mini')) place(); });
      }
    } catch (e) { /* nada */ }
    return r;
  };

  const css = document.createElement('style');
  css.id = 'ovApp106';
  css.textContent = [
    '.ofn-card h2 .count { font-size: 13px; font-weight: 600; color: var(--ink-2); background: var(--surface-2); border-radius: 999px; padding: 1px 8px; margin-left: 4px; vertical-align: 2px; }',
    '.ofn-form { display: flex; flex-direction: column; gap: 10px; padding: 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface-2); }',
    '.ofn-row { display: grid; grid-template-columns: minmax(0, 170px) minmax(0, 1fr); gap: 10px; }',
    '@media (max-width: 480px) { .ofn-row { grid-template-columns: minmax(0, 1fr); } }',
    '.ofn-form textarea { resize: vertical; min-height: 72px; font: inherit; }',
    '.ofn-list { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }',
    '.ofn-it { border: 1px solid var(--line); border-left: 4px solid var(--accent); border-radius: 10px; padding: 10px 12px; background: var(--surface); display: flex; flex-direction: column; gap: 4px; }',
    '.ofn-it.ofn-ed { border-color: var(--accent); background: var(--accent-soft); }',
    '.ofn-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }',
    '.ofn-acts { margin-left: auto; display: flex; gap: 12px; align-items: center; font-size: 14px; }',
    '.ofn-q { color: var(--red); font-weight: 600; }',
    '.ofn-txt { white-space: normal; overflow-wrap: anywhere; line-height: 1.45; }',
    '.ofn-meta { font-size: 12.5px; color: var(--ink-2); }',
    '.ofn-empty { margin: 10px 0 0; }',
    '#panelHost .ofn-mini { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; text-align: left; margin: 0; padding: 10px 12px; border: 1px solid var(--line); border-left: 4px solid var(--accent); border-radius: 12px; background: var(--surface); color: var(--ink); cursor: pointer; font: inherit; }',
    '#panelHost .ofn-mini:hover { border-color: var(--accent); }',
    '.ofn-mini-l { font-size: 11px; letter-spacing: .05em; text-transform: uppercase; color: var(--ink-2); font-weight: 700; }',
    '.ofn-mini-t { font-size: 13.5px; color: var(--ink-2); }'
  ].join('\n');
  document.body.appendChild(css);
})();
