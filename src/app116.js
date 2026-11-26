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
    const t = pd.tgt = target(x, y), old = document.querySelector('.pd-hint');
    if (!t) { ghost.classList.remove('ok'); if (old) old.remove(); return; }
    const a = { pro: t.pro, date: t.date, start: t.start, dur: t.dur }, bad = A.conflicts ? A.conflicts(a).length > 0 : false;
    const html = '<b>' + esc(A.mm(t.start)) + '</b> ' + esc(pd.name) + (bad ? ' · ocupado' : '');
    let h = old; if (h && h.parentNode !== t.gb) { h.remove(); h = null; }
    if (!h) { h = document.createElement('div'); h.style.cssText = 'left:2px;right:2px'; t.gb.appendChild(h); }
    h.className = 'pd-hint' + (bad ? ' bad' : ''); h.style.top = t.top + 'px'; h.style.height = t.h + 'px'; if (h._html !== html) { h._html = html; h.innerHTML = html; }
    ghost.classList.add('ok'); ghost.classList.toggle('bad', bad);
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
    document.querySelectorAll('.pd-hint').forEach(n => n.remove()); const gh = ghost; ghost = null; document.body.classList.remove('pd-on');
    const b = bubEl(); if (b) b.classList.remove('pd-away');
    if (!d.on) { if (gh) gh.remove(); return; }
    clickBlock = Date.now() + 450;
    const t = d.tgt; if (cancel || !t) { if (gh) { gh.classList.add('pd-back'); setTimeout(() => gh.remove(), 220); } if (!cancel) A.toast('Soltalo sobre un horario de la agenda.', null, 2200); return; }
    if (b) b.remove(); if (A.acts.bubClose) A.acts.bubClose();
    A.openNewAppt({ date: t.date, pro: t.pro, start: t.start, pid: d.pid, dur: t.dur });
    if (A.acts.naSave) A.acts.naSave();
    if (S.modal) { if (gh) gh.remove(); return; }   /* hubo un cruce: queda el formulario con el aviso */
    afterDrop(d, t, gh);
  }
  /* ---------- después de soltar: el paciente «vuela» al turno, el turno aparece con un resplandor y sale el cuadrito del motivo ---------- */
  function afterDrop(d, t, gh) {
    const a = A.day(t.date).filter(x => x.pid === d.pid && x.start === t.start && x.pro === t.pro && x.status !== 'cancelado').pop();
    const blk = a && document.querySelector('.blk[data-id="' + a.id + '"]');
    if (!a || !blk) { if (gh) gh.remove(); return; }
    try { blk.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* nada */ }
    const r = blk.getBoundingClientRect(); blk.classList.add('blk-new'); setTimeout(() => blk.classList.remove('blk-new'), 1400);
    if (gh) {
      const from = gh.style.transform, to = 'translate(' + (r.left + 8) + 'px,' + (r.top + 2) + 'px)';
      try { const an = gh.animate([{ transform: from, opacity: 1 }, { transform: to + ' scale(.55)', opacity: 0 }], { duration: 360, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' }); an.onfinish = () => gh.remove(); } catch (e) { gh.remove(); }
    }
    setTimeout(() => motivoPop(a.id), gh ? 300 : 0);
  }
  const CHIPS = ['Control', 'Limpieza', 'Dolor', 'Urgencia', 'Primera consulta', 'Arreglo', 'Blanqueamiento'];
  const closePop = () => { const p = document.getElementById('mvPop'); if (p) { p.classList.add('out'); setTimeout(() => p.remove(), 160); } };
  function motivoPop(id) {
    closePop(); const a = A.apptById(id), blk = document.querySelector('.blk[data-id="' + id + '"]'); if (!a || !blk) return;
    const pt = A.PAT(a.pid) || {}, r = blk.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight, narrow = W <= 700, n = LS.get('odontovoz.pdTip', 0);
    const el = document.createElement('div'); el.id = 'mvPop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Motivo del turno'); el.setAttribute('data-id', id);
    el.innerHTML = '<div class="mv-h"><span class="mv-av">' + esc((pt.name || '?').charAt(0).toUpperCase()) + '</span><div class="mv-t"><b>Turno de ' + esc(pt.name || '') + '</b><small>' + esc(A.fmtShort ? A.fmtShort(a.date) : a.date) + ' · ' + A.mm(a.start) + ' · ' + a.dur + ' min</small></div><button class="mv-x" data-act="mvSkip" aria-label="Cerrar">×</button></div>' +
      '<label class="mv-q"><span class="sr">Motivo del turno</span><input id="mvQ" autocomplete="off" placeholder="¿Para qué viene? (opcional)" enterkeyhint="done"></label>' +
      '<div class="mv-chips">' + CHIPS.map((c, i) => '<button type="button" style="--i:' + i + '" data-act="mvChip" data-t="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' +
      '<div class="mv-f"><span>' + (n < 3 ? '💡 Estirá el borde de abajo del turno para cambiar la duración.' : '') + '</span><button class="btn small" data-act="mvSkip">Omitir</button><button class="btn small primary" data-act="mvSave">Guardar</button></div>';
    document.body.appendChild(el); el.setAttribute('data-id', id); LS.set('odontovoz.pdTip', n + 1);
    if (narrow) { el.classList.add('sheet'); }
    else { const w = el.offsetWidth || 340, h = el.offsetHeight || 190; let left = Math.min(Math.max(10, r.left), W - w - 10), top = r.bottom + 10, up = false; if (top + h > H - 10) { top = r.top - h - 10; up = true; } if (top < 10) top = Math.max(10, Math.min(H - h - 10, r.top + 6)); el.style.left = left + 'px'; el.style.top = top + 'px'; el.classList.add(up ? 'up' : 'down'); const ar = document.createElement('i'); ar.className = 'mv-ar'; ar.style.left = Math.max(16, Math.min(w - 30, r.left + 24 - left)) + 'px'; el.appendChild(ar); }
    const q = $('#mvQ'); if (q) { q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); A.acts.mvSave(); } else if (e.key === 'Escape') { e.preventDefault(); closePop(); } }); try { q.focus({ preventScroll: true }); } catch (e) { /* nada */ } }
  }
  function saveMotivo(v) {
    const p = document.getElementById('mvPop'); if (!p) return; const id = p.getAttribute('data-id'), a = A.apptById(id); v = String(v || '').trim();
    if (a && v) { A.mutate([a.date], () => { a.motivo = v.charAt(0).toUpperCase() + v.slice(1); }, 'Motivo del turno'); if (a.pid && A.setMotivo) A.setMotivo(a.pid, v); A.refresh(); }
    p.classList.add('done'); p.innerHTML = '<div class="mv-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><b>' + (v ? 'Motivo guardado' : 'Turno listo') + '</b></div>'; setTimeout(closePop, 650);
  }
  A.acts.mvSave = () => saveMotivo(($('#mvQ') || {}).value);
  A.acts.mvChip = el => saveMotivo(el.getAttribute('data-t'));
  A.acts.mvSkip = () => saveMotivo('');
  document.addEventListener('pointerdown', e => { const p = document.getElementById('mvPop'); if (p && !p.contains(e.target) && !p.classList.contains('done')) closePop(); }, true);
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
  css.textContent += '#pdGhost{rotate:-3deg;scale:1;transition:rotate .18s,scale .18s,border-color .15s;animation:pdLift .3s cubic-bezier(.2,1.5,.4,1)}#pdGhost.ok{rotate:0deg;scale:1.05}#pdGhost.bad{border-color:var(--red)}#pdGhost.pd-back{transition:opacity .2s;opacity:0}' +
    '@keyframes pdLift{0%{opacity:0;scale:.6;rotate:-10deg}100%{opacity:.95;scale:1;rotate:-3deg}}.pd-av{animation:pdPop .35s cubic-bezier(.2,1.6,.4,1)}@keyframes pdPop{0%{transform:scale(.4)}100%{transform:scale(1)}}' +
    '.pd-hint{transition:top .09s ease-out,height .09s ease-out;animation:pdHint .22s ease-out,pdPulse 1.4s ease-in-out .22s infinite}@keyframes pdHint{0%{opacity:0;transform:scale(.96)}100%{opacity:1;transform:none}}@keyframes pdPulse{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--accent) 35%,transparent)}50%{box-shadow:0 0 0 5px color-mix(in srgb,var(--accent) 10%,transparent)}}.pd-hint.bad{animation:pdHint .22s ease-out}' +
    '.blk.blk-new{animation:blkPop .55s cubic-bezier(.2,1.3,.4,1);transform-origin:50% 0}@keyframes blkPop{0%{opacity:0;transform:scale(.86)}55%{opacity:1;transform:scale(1.03);box-shadow:0 0 0 8px color-mix(in srgb,var(--accent) 35%,transparent)}100%{transform:none;box-shadow:0 0 0 0 transparent}}' +
    '#mvPop{position:fixed;z-index:410;width:min(360px,calc(100vw - 20px));background:var(--surface);color:var(--ink);border:1.5px solid color-mix(in srgb,var(--accent) 45%,var(--line));border-radius:18px;padding:12px;box-shadow:0 18px 44px rgba(8,20,24,.28);animation:mvIn .38s cubic-bezier(.2,1.25,.3,1);transform-origin:20% 0}#mvPop.up{transform-origin:20% 100%}#mvPop.out{opacity:0;transform:scale(.94) translateY(6px);transition:opacity .16s,transform .16s}' +
    '#mvPop.sheet{left:8px;right:8px;width:auto;bottom:calc(10px + env(safe-area-inset-bottom,0px));top:auto;border-radius:22px;transform-origin:50% 100%;animation:mvUp .4s cubic-bezier(.2,1.1,.3,1)}@keyframes mvIn{0%{opacity:0;transform:translateY(10px) scale(.9)}100%{opacity:1;transform:none}}@keyframes mvUp{0%{opacity:0;transform:translateY(40px)}100%{opacity:1;transform:none}}' +
    '.mv-h{display:flex;align-items:center;gap:10px;margin-bottom:8px}.mv-av{flex:none;width:34px;height:34px;border-radius:50%;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;font-weight:800}.mv-t{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.2}.mv-t b{font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mv-t small{color:var(--ink-2);font-size:.76rem}.mv-x{border:0;background:none;color:var(--ink-2);font-size:1.3rem;cursor:pointer;line-height:1}' +
    '.mv-q{display:block}.mv-q input{width:100%;box-sizing:border-box;border:1.5px solid var(--line);background:var(--surface-2);color:var(--ink);border-radius:12px;padding:10px 12px;font:inherit}.mv-q input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent)}' +
    '.mv-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 4px}.mv-chips button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:5px 11px;font:inherit;font-size:.82rem;cursor:pointer;animation:mvChip .32s cubic-bezier(.2,1.4,.4,1) both;animation-delay:calc(var(--i) * 45ms + 120ms)}.mv-chips button:hover{border-color:var(--accent);background:var(--accent-soft)}@keyframes mvChip{0%{opacity:0;transform:translateY(6px) scale(.9)}100%{opacity:1;transform:none}}' +
    '.mv-f{display:flex;align-items:center;gap:6px;margin-top:6px}.mv-f span{flex:1;font-size:.72rem;color:var(--ink-2);line-height:1.25}' +
    '.mv-ar{position:absolute;width:14px;height:14px;background:var(--surface);border:1.5px solid color-mix(in srgb,var(--accent) 45%,var(--line));transform:rotate(45deg)}#mvPop.down .mv-ar{top:-8px;border-right:0;border-bottom:0}#mvPop.up .mv-ar{bottom:-8px;border-left:0;border-top:0}' +
    '.mv-ok{display:flex;align-items:center;justify-content:center;gap:10px;padding:14px;color:var(--ok);font-size:1.05rem}.mv-ok svg{width:30px;height:30px;stroke-dasharray:30;stroke-dashoffset:30;animation:mvCheck .45s .05s ease-out forwards}@keyframes mvCheck{to{stroke-dashoffset:0}}#mvPop.done{animation:mvDone .5s ease-out}@keyframes mvDone{0%{transform:scale(1)}40%{transform:scale(1.04)}100%{transform:scale(1)}}' +
    '@media (prefers-reduced-motion:reduce){#pdGhost,.pd-av,.pd-hint,.blk.blk-new,#mvPop,.mv-chips button{animation:none!important}}';
  document.body.appendChild(css);
})();
