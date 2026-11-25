/* ===== 1.31: arrastrar un paciente a la agenda para darle turno y estirar el borde de abajo de un turno para cambiar la duración ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, $ = q => document.querySelector(q);
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* nada */ } } };
  const SHof = gb => { const g = gb.closest('.grid'); const v = g ? parseFloat(getComputedStyle(g).getPropertyValue('--sh')) : 0; return v > 0 ? v : 28; };
  const stepOf = gb => { const pr = A.PRO(gb.getAttribute('data-pro')); return Math.max(5, Math.min(60, (A.slotOf ? A.slotOf(pr) : 30) || 30)); };
  let clickBlock = 0;
  document.addEventListener('click', e => { if (Date.now() < clickBlock && e.target.closest && e.target.closest('#bub, #gridWrap')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  const scroller = el => { for (let p = el && el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 2) return p; } return null; };

  /* =====================================================================
     1) ARRASTRAR UN PACIENTE DE LA BURBUJA A LA AGENDA
     ===================================================================== */
  let pd = null, ghost = null, raf = 0;
  const dur0 = () => A.CFG.defDur || 30;
  const bubEl = () => document.getElementById('bub');
  function target(x, y) {
    const els = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [], gb = els.filter(n => n.classList && n.classList.contains('gb') && n.closest('#gridWrap'))[0];
    if (!gb) return null;
    const r = gb.getBoundingClientRect(), sh = SHof(gb), g0 = parseInt(gb.getAttribute('data-g0'), 10), step = stepOf(gb), min = g0 + (y - r.top) / sh * 15;
    const d = dur0(), start = Math.max(g0, Math.floor(min / step) * step), top = (start - g0) / 15 * sh;
    return { gb, date: gb.getAttribute('data-date'), pro: gb.getAttribute('data-pro'), start, dur: d, top, h: d / 15 * sh };
  }
  function paint(x, y) {
    if (!ghost) return; ghost.style.transform = 'translate(' + (x + 14) + 'px,' + (y - 22) + 'px)';
    document.querySelectorAll('.pd-hint').forEach(n => n.remove());
    const t = pd.tgt = target(x, y); if (!t) { ghost.classList.remove('ok'); return; }
    const a = { pro: t.pro, date: t.date, start: t.start, dur: t.dur }, bad = A.conflicts ? A.conflicts(a).length > 0 : false;
    const h = document.createElement('div'); h.className = 'pd-hint' + (bad ? ' bad' : ''); h.style.cssText = 'top:' + t.top + 'px;height:' + t.h + 'px;left:2px;right:2px';
    h.innerHTML = '<b>' + esc(A.mm(t.start)) + '</b> ' + esc(pd.name) + (bad ? ' · ocupado' : ''); t.gb.appendChild(h); ghost.classList.add('ok');
  }
  function loop() {
    if (!pd || !pd.on) { raf = 0; return; }
    const t = pd.tgt && pd.tgt.gb || (document.elementsFromPoint(pd.x, pd.y).filter(n => n.classList && n.classList.contains('gb'))[0]), sc = scroller(t);
    if (sc) { const r = sc.getBoundingClientRect(); if (pd.y > r.bottom - 56) sc.scrollTop += 14; else if (pd.y < r.top + 56) sc.scrollTop -= 14; paint(pd.x, pd.y); }
    raf = requestAnimationFrame(loop);
  }
  function begin(x, y) {
    if (!pd || pd.on) return; pd.on = true; clearTimeout(pd.tm);
    ghost = document.createElement('div'); ghost.id = 'pdGhost'; ghost.innerHTML = '<span class="pd-av">' + esc(pd.name.charAt(0).toUpperCase()) + '</span><b>' + esc(pd.name) + '</b>'; document.body.appendChild(ghost);
    const b = bubEl(); if (b) b.classList.add('pd-away'); document.body.classList.add('pd-on');
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* nada */ }
    paint(x, y); raf = requestAnimationFrame(loop);
  }
  function stop(cancel) {
    if (!pd) return; const d = pd; pd = null; clearTimeout(d.tm);
    document.querySelectorAll('.pd-hint').forEach(n => n.remove()); if (ghost) { ghost.remove(); ghost = null; } document.body.classList.remove('pd-on');
    const b = bubEl(); if (b) b.classList.remove('pd-away');
    if (!d.on) return;
    clickBlock = Date.now() + 450;
    const t = d.tgt; if (cancel || !t) { if (!cancel) A.toast('Soltalo sobre un horario de la agenda.', null, 2200); return; }
    if (b) b.remove(); if (A.acts.bubClose) A.acts.bubClose();
    A.openNewAppt({ date: t.date, pro: t.pro, start: t.start, pid: d.pid, dur: t.dur });
    if (A.acts.naSave) A.acts.naSave();
    if (!S.modal) { const n = LS.get('odontovoz.pdTip', 0); A.toast('Turno de ' + d.name + ' a las ' + A.mm(t.start) + ' (' + t.dur + ' min).' + (n < 3 ? ' Estirá el borde de abajo del turno para cambiar la duración.' : ''), null, n < 3 ? 6000 : 3000); LS.set('odontovoz.pdTip', n + 1); }
  }
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest && e.target.closest('#bub .bub-list button[data-pid]'); if (!b || e.button > 0) return;
    const touch = e.pointerType === 'touch' || e.pointerType === 'pen', p = A.PAT(b.getAttribute('data-pid'));
    pd = { pid: b.getAttribute('data-pid'), name: p ? p.name : 'Paciente', x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, touch, on: false, tgt: null };
    if (touch) pd.tm = setTimeout(() => begin(pd && pd.x, pd && pd.y), 380);
  }, true);
  document.addEventListener('pointermove', e => {
    if (!pd) return; pd.x = e.clientX; pd.y = e.clientY;
    if (!pd.on) { const d = Math.hypot(pd.x - pd.x0, pd.y - pd.y0); if (pd.touch) { if (d > 12) { clearTimeout(pd.tm); pd = null; } } else if (d > 7) begin(pd.x, pd.y); return; }
    e.preventDefault(); paint(pd.x, pd.y);
  }, { passive: false });
  document.addEventListener('touchmove', e => { if (pd && pd.on && e.cancelable) e.preventDefault(); }, { passive: false });
  document.addEventListener('pointerup', () => stop(false));
  document.addEventListener('pointercancel', () => stop(true));
  document.addEventListener('contextmenu', e => { if (pd || (e.target.closest && e.target.closest('#bub .bub-list'))) e.preventDefault(); }, true);
  document.addEventListener('keydown', e => { if (pd && e.key === 'Escape') stop(true); });

  /* =====================================================================
     2) ESTIRAR EL BORDE DE ABAJO DE UN TURNO (o de un bloqueo) PARA CAMBIAR LA DURACIÓN
     ===================================================================== */
  function decorate() {
    document.querySelectorAll('#gridWrap .blk[data-id]:not([data-rzok])').forEach(b => {
      b.setAttribute('data-rzok', '1'); const s = document.createElement('span'); s.className = 'rz'; s.setAttribute('data-rz', b.getAttribute('data-id')); s.setAttribute('aria-label', 'Estirar para cambiar la duración'); s.title = 'Estirá hacia abajo o arriba para cambiar la duración'; b.appendChild(s);
    });
  }
  let rq = 0; const sched = () => { if (rq) return; rq = requestAnimationFrame(() => { rq = 0; try { decorate(); } catch (e) { /* nada */ } }); };
  try { new MutationObserver(sched).observe(document.body, { childList: true, subtree: true }); } catch (e) { /* nada */ }
  sched();

  let rz = null, tip = null;
  document.addEventListener('pointerdown', e => {
    const h = e.target.closest && e.target.closest('.rz[data-rz]'); if (!h || e.button > 0) return;
    const blk = h.closest('.blk'), gb = blk && blk.closest('.gb'), a = A.apptById ? A.apptById(h.getAttribute('data-rz')) : null; if (!blk || !gb || !a) return;
    e.preventDefault(); e.stopPropagation();
    const sh = SHof(gb), r = blk.getBoundingClientRect();
    rz = { id: a.id, a, blk, gb, sh, top: r.top, dur: a.dur, orig: a.dur, h0: r.height, moved: false, y0: e.clientY, maxMin: (gb.getBoundingClientRect().height / sh) * 15 + parseInt(gb.getAttribute('data-g0'), 10) };
    try { h.setPointerCapture(e.pointerId); } catch (x) { /* nada */ }
    blk.classList.add('rz-live'); document.body.classList.add('rz-on');
  }, true);
  document.addEventListener('pointermove', e => {
    if (!rz) return; if (!rz.moved && Math.abs(e.clientY - rz.y0) < 4) return; rz.moved = true; e.preventDefault();
    let d = Math.max(15, Math.round((e.clientY - rz.top) / rz.sh) * 15); d = Math.min(d, Math.floor((rz.maxMin - rz.a.start) / 15) * 15); rz.dur = d;
    rz.blk.style.height = Math.max(14, rz.h0 + (d - rz.orig) / 15 * rz.sh) + 'px';
    if (!tip) { tip = document.createElement('div'); tip.id = 'rzTip'; document.body.appendChild(tip); }
    tip.textContent = d + ' min · hasta ' + A.mm(rz.a.start + d); tip.style.transform = 'translate(' + (e.clientX + 14) + 'px,' + (e.clientY - 34) + 'px)';
  }, { passive: false });
  function rzEnd(cancel) {
    if (!rz) return; const z = rz; rz = null; if (tip) { tip.remove(); tip = null; } document.body.classList.remove('rz-on'); z.blk.classList.remove('rz-live');
    if (!z.moved) return; clickBlock = Date.now() + 450;
    z.blk.style.height = '';
    if (cancel || z.dur === z.orig) return;
    const a = z.a, t = { date: a.date, pro: a.pro, start: a.start, dur: z.dur, id: a.id, sobre: a.sobre }, nm = a.type === 'block' ? (a.label || 'Bloqueo') : ((A.PAT(a.pid) || {}).name || 'Turno');
    const cf = a.type === 'block' || !A.conflicts ? [] : A.conflicts(t, a.id);
    if (cf.length) { S.modal = { type: 'conflict', id: a.id, to: t, with: cf.map(c => c.id), desc: nm + ' → ' + A.mm(a.start) + ' · ' + z.dur + ' min' }; A.renderModal(); return; }
    A.mutate([a.date], () => { a.dur = z.dur; }, 'Duración: ' + nm + ' · ' + z.dur + ' min (hasta ' + A.mm(a.start + z.dur) + ')'); A.refresh();
    A.toast('⏱ ' + nm + ': ' + z.dur + ' min (hasta ' + A.mm(a.start + z.dur) + ').', null, 2500);
  }
  document.addEventListener('pointerup', () => rzEnd(false));
  document.addEventListener('pointercancel', () => rzEnd(true));
  document.addEventListener('touchmove', e => { if (rz && e.cancelable) e.preventDefault(); }, { passive: false });

  const css = document.createElement('style');
  css.textContent = '#pdGhost{position:fixed;left:0;top:0;z-index:400;pointer-events:none;display:flex;align-items:center;gap:8px;background:var(--surface);color:var(--ink);border:2px solid var(--accent);border-radius:999px;padding:5px 14px 5px 6px;box-shadow:0 10px 28px rgba(0,0,0,.28);font-size:.9rem;opacity:.95}#pdGhost.ok{border-style:solid}#pdGhost:not(.ok){border-style:dashed;opacity:.8}' +
    '.pd-av{width:28px;height:28px;border-radius:50%;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;font-weight:800}' +
    '#bub.pd-away{opacity:0!important;pointer-events:none!important;transition:none}body.pd-on,body.pd-on *{cursor:grabbing!important;user-select:none;-webkit-user-select:none}' +
    '.pd-hint{position:absolute;z-index:16;pointer-events:none;background:color-mix(in srgb,var(--accent) 26%,var(--surface));border:2px solid var(--accent);border-radius:8px;padding:2px 7px;font-size:12px;color:var(--ink);overflow:hidden;white-space:nowrap}.pd-hint.bad{border-color:var(--red);background:color-mix(in srgb,var(--red) 18%,var(--surface))}' +
    '.blk .rz{position:absolute;left:0;right:0;bottom:0;height:13px;cursor:ns-resize;touch-action:none;z-index:4}.blk .rz::after{content:"";position:absolute;left:50%;bottom:2px;width:26px;height:4px;margin-left:-13px;border-radius:4px;background:var(--ink-2);opacity:.28;transition:opacity .15s}.blk:hover .rz::after,.blk.rz-live .rz::after{opacity:.85}' +
    '@media (hover:none){.blk .rz::after{opacity:.45}}body.rz-on,body.rz-on *{cursor:ns-resize!important;user-select:none;-webkit-user-select:none}#rzTip{position:fixed;left:0;top:0;z-index:400;pointer-events:none;background:var(--ink);color:var(--surface);border-radius:8px;padding:4px 10px;font-size:.82rem;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,.3)}';
  document.body.appendChild(css);
})();
