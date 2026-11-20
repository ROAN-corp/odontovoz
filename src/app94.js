/* ===== 1.12: ventanas que se mueven y se minimizan en una burbuja, botones de voz más chicos y movibles, turno nuevo más prolijo ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* nada */ } } };
  const wide = () => window.innerWidth >= 700;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let eatClick = 0;   /* después de arrastrar, el clic que sigue no cuenta */
  document.addEventListener('click', e => { if (eatClick && Date.now() - eatClick < 400) { e.stopImmediatePropagation(); e.preventDefault(); eatClick = 0; } }, true);

  /* arrastre genérico con umbral (para distinguir un toque de un arrastre) */
  function dragger(el, onStart, onMove, onEnd, okTarget) {
    el.addEventListener('pointerdown', e => {
      if (e.button !== 0 || (okTarget && !okTarget(e))) return;
      const x0 = e.clientX, y0 = e.clientY; let on = false, st = null;
      const mv = ev => {
        const dx = ev.clientX - x0, dy = ev.clientY - y0;
        if (!on && Math.hypot(dx, dy) < 8) return;
        if (!on) { on = true; st = onStart(); try { el.setPointerCapture(e.pointerId); } catch (x) { /* nada */ } }
        ev.preventDefault(); onMove(st, dx, dy);
      };
      const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); if (on) { eatClick = Date.now(); onEnd(st); } };
      window.addEventListener('pointermove', mv, { passive: false }); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    });
  }

  /* =====================================================================
     1. VENTANAS: mover (PC) y minimizar (todos)
     ===================================================================== */
  const MIN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 17h12"/></svg>';
  const WIN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18"/></svg>';
  const NO_MIN = /^(ajustes|empWho|welcome|setup|intro|terms|update)$/;

  function decorate() {
    const md = $('#modalHost .modal'), m = S.modal; if (!md || !m) return;
    const head = md.querySelector('.m-head'), x = head && head.querySelector('.x');
    if (x && !head.querySelector('.m-min') && !NO_MIN.test(m.type)) x.insertAdjacentHTML('beforebegin', '<button class="m-min" data-act="mMin" aria-label="Minimizar" title="Minimizar (queda en una burbuja)">' + MIN_SVG + '</button>');
    if (!head) return;
    head.classList.toggle('m-drag', wide());
    if (S._mPos && S._mPos.type === m.type && wide()) md.style.transform = 'translate(' + S._mPos.x + 'px,' + S._mPos.y + 'px)';
    if (!head._ovDrag) {
      head._ovDrag = 1;
      dragger(head, () => ({ x: (S._mPos && S._mPos.type === m.type) ? S._mPos.x : 0, y: (S._mPos && S._mPos.type === m.type) ? S._mPos.y : 0, r: md.getBoundingClientRect() }),
        (st, dx, dy) => {
          const r = st.r, nx = clamp(st.x + dx, st.x - r.left - r.width + 120, st.x + window.innerWidth - r.left - 120), ny = clamp(st.y + dy, st.y - r.top, st.y + window.innerHeight - r.top - 60);
          S._mPos = { type: S.modal && S.modal.type, x: nx, y: ny }; md.style.transform = 'translate(' + nx + 'px,' + ny + 'px)';
        }, () => { }, e => wide() && !e.target.closest('button'));
    }
  }

  /* guardar y reponer lo escrito en la ventana (los datos que todavía no se guardaron) */
  const fields = md => Array.from(md.querySelectorAll('input,select,textarea')).filter(i => i.type !== 'file');
  const snap = md => fields(md).map(i => ({ id: i.id, t: i.type, v: i.value, c: i.checked }));
  function unsnap(md, vals) {
    const fs = fields(md); if (!vals || fs.length !== vals.length) { vals && vals.forEach(v => { if (!v.id) return; const i = md.querySelector('#' + CSS.escape(v.id)); if (i) put(i, v); }); return; }
    fs.forEach((i, k) => { if (vals[k].t === i.type) put(i, vals[k]); });
  }
  const put = (i, v) => { if (i.type === 'checkbox' || i.type === 'radio') i.checked = v.c; else if (i.type !== 'hidden' || v.id) i.value = v.v; };

  A._mini = null;
  A.acts.mMin = () => {
    const m = S.modal, md = $('#modalHost .modal'); if (!m || !md) return;
    if (A._mini) { A.toast('Ya tenés una ventana minimizada: abrila o cerrala primero.'); return; }
    const body = md.querySelector('.m-body');
    A._mini = { m, vals: snap(md), title: md.getAttribute('aria-label') || 'Ventana', top: body ? body.scrollTop : 0, aj: S._ajBack, pos: S._mPos };
    S._ajBack = false; S._ajBusy = true; S.modal = null;
    try { A.renderModal(); } finally { S._ajBusy = false; }
    bubble();
  };
  A.acts.mMax = () => {
    const mini = A._mini; if (!mini) return;
    A._mini = null;
    if (S.modal) A.acts.mMin();   /* si había otra abierta, cambian de lugar */
    S.modal = mini.m; S._ajBack = mini.aj; S._mPos = mini.pos || null;
    A.renderModal();
    const md = $('#modalHost .modal');
    if (md) { unsnap(md, mini.vals); const b = md.querySelector('.m-body'); if (b) b.scrollTop = mini.top || 0; }
    bubble();
  };
  A.acts.mBubX = () => { const t = A._mini && A._mini.title; A._mini = null; bubble(); A.toast('Se cerró «' + (t || 'la ventana') + '» sin guardar.'); };

  function bubble() {
    let b = document.getElementById('mBub');
    if (!A._mini) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('div'); b.id = 'mBub'; b.className = 'm-bub'; document.body.appendChild(b);
      dragger(b, () => { const r = b.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; },
        (st, dx, dy) => { const l = clamp(st.l + dx, 4, window.innerWidth - st.w - 4), t = clamp(st.t + dy, 4, window.innerHeight - st.h - 4); b.style.left = l + 'px'; b.style.top = t + 'px'; b.style.right = 'auto'; b.style.bottom = 'auto'; },
        () => { LS.set('odontovoz.bubPos', { l: parseFloat(b.style.left), t: parseFloat(b.style.top) }); });
    }
    b.innerHTML = '<button class="mb-open" data-act="mMax" title="Abrir la ventana">' + WIN_SVG + '<span>' + esc(A._mini.title) + '</span></button><button class="mb-x" data-act="mBubX" aria-label="Cerrar la ventana minimizada">×</button>';
    const p = LS.get('odontovoz.bubPos', null);
    if (p) { b.style.left = clamp(p.l, 4, window.innerWidth - 60) + 'px'; b.style.top = clamp(p.t, 4, window.innerHeight - 50) + 'px'; b.style.right = 'auto'; b.style.bottom = 'auto'; }
  }

  /* =====================================================================
     2. TURNO NUEVO: tipo en una fila compacta y horarios libres para tocar
     ===================================================================== */
  const readTime = () => { const h = $('#naH'), m = $('#naMi'); return h && m ? (+h.value) * 60 + (+m.value) : A.toMin(($('#naTime') || {}).value || '09:00'); };
  function kindHint() {
    document.querySelectorAll('#modalHost .na-kind').forEach(k => {
      k.querySelectorAll('button > b').forEach(x => { if (/^[^\wÁÉÍÓÚáéíóúñÑ]+\s/.test(x.textContent)) x.textContent = x.textContent.replace(/^[^\wÁÉÍÓÚáéíóúñÑ]+\s+/, ''); });
      const on = k.querySelector('button[aria-pressed="true"]'), sm = on && on.querySelector('small');
      let h = k.nextElementSibling; if (!h || !h.classList.contains('na-khint')) { h = document.createElement('div'); h.className = 'na-khint'; k.after(h); }
      h.textContent = sm ? sm.textContent.replace(/^./, c => c.toUpperCase()) + '.' : '';
    });
  }
  function freeChips() {
    const tm = $('#modalHost .na-time'); if (!tm || !S.modal || S.modal.type !== 'newAppt') return;
    const pro = ($('#naPro') || {}).value || S.modal.f.pro, date = ($('#naDate') || {}).value || S.modal.f.date, dur = parseInt(($('#naDur') || {}).value, 10) || 30, cur = readTime();
    const P = A.PRO(pro); if (!P || !date) return;
    const items = A.day(date).filter(b => b.pro === pro && b.status !== 'cancelado' && !b.sobre);
    const step = Math.min(A.slotOf(P) || 30, 30), now = new Date(), isToday = date === A.today(), nowMin = now.getHours() * 60 + now.getMinutes();
    const free = [];
    (A.hoursFor(P, date) || []).forEach(r => { for (let t = r[0]; t + dur <= r[1]; t += step) if (!(isToday && t < nowMin) && !items.some(b => b.start < t + dur && t < b.start + b.dur)) free.push(t); });
    let box = $('#naFree'); if (!box) { box = document.createElement('div'); box.id = 'naFree'; box.className = 'na-free'; tm.after(box); }
    box.innerHTML = free.length ? '<span class="na-fl">Libres ese día · tocá uno</span><div class="na-fc">' + free.map(t => '<button type="button" class="na-chip' + (t === cur ? ' on' : '') + '" data-act="naPick" data-t="' + t + '">' + A.mm(t) + '</button>').join('') + '</div>'
      : '<span class="na-fl">No quedan horarios libres ese día para ' + esc(P.short || P.name) + '.</span>';
    const on = box.querySelector('.na-chip.on'), fc = box.querySelector('.na-fc');
    if (on && fc) fc.scrollLeft = on.offsetLeft - fc.clientWidth / 2 + on.clientWidth / 2;
  }
  A.acts.naPick = el => {
    const t = +el.getAttribute('data-t'), h = $('#naH'), m = $('#naMi'); if (!h || !m) return;
    h.value = String(Math.floor(t / 60)); m.value = String(t % 60);
    h.dispatchEvent(new Event('change', { bubbles: true }));
    setTimeout(freeChips, 0);
  };
  document.addEventListener('change', e => { const id = e.target && e.target.id; if (S.modal && S.modal.type === 'newAppt' && /^(naPro|naDate|naDur|naH|naMi)$/.test(id || '')) setTimeout(freeChips, 0); });
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-act="naStep"],[data-act="naNextFree"],[data-act="naKind"],[data-act="qbGo"],[data-act="qbBack"]')) setTimeout(() => { freeChips(); kindHint(); }, 0); });

  /* después de dibujar cualquier ventana */
  const rmPrev = A.renderModal;
  A.renderModal = function () {
    const prevType = S._mPos && S._mPos.type;
    const r = rmPrev.apply(this, arguments);
    if (!S.modal || S.modal.type !== prevType) S._mPos = null;
    try { decorate(); kindHint(); freeChips(); } catch (e) { /* nada */ }
    return r;
  };

  /* =====================================================================
     3. BOTONES DE VOZ: más chicos, se arrastran y se pueden minimizar
     ===================================================================== */
  function dock() {
    const d = document.getElementById('vdock'); if (!d || d._ov) return; d._ov = 1;
    d.insertAdjacentHTML('beforeend', '<button class="vd-min" data-act="vdMini" aria-label="Achicar los botones de voz" title="Achicar">' + MIN_SVG + '</button>');
    const place = () => {
      const p = LS.get('odontovoz.vdPos', null); d.style.transform = '';
      if (!p) return;
      const r = d.getBoundingClientRect(), dx = clamp(p.dx, -r.left + 4, window.innerWidth - r.right - 4), dy = clamp(p.dy, -r.top + 60, window.innerHeight - r.bottom - 4);
      d.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    };
    dragger(d, () => { const p = LS.get('odontovoz.vdPos', { dx: 0, dy: 0 }); d.style.transform = ''; const r = d.getBoundingClientRect(); return { p, r }; },
      (st, dx, dy) => { const nx = clamp(st.p.dx + dx, -st.r.left + 4, window.innerWidth - st.r.right - 4), ny = clamp(st.p.dy + dy, -st.r.top + 60, window.innerHeight - st.r.bottom - 4); st.n = { dx: nx, dy: ny }; d.style.transform = 'translate(' + nx + 'px,' + ny + 'px)'; },
      st => { if (st.n) LS.set('odontovoz.vdPos', st.n); }, e => !e.target.closest('.vd-bar'));
    d.classList.toggle('vd-col', !!LS.get('odontovoz.vdMini', false));
    /* minimizado: tocar el micrófono chiquito lo vuelve a agrandar */
    d.addEventListener('click', e => { if (d.classList.contains('vd-col') && e.target.closest('.vd-mic')) { e.stopImmediatePropagation(); e.preventDefault(); A.acts.vdMini(); } }, true);
    place(); window.addEventListener('resize', place);
  }
  A.acts.vdMini = () => { const d = document.getElementById('vdock'); if (!d) return; const on = !d.classList.contains('vd-col'); d.classList.toggle('vd-col', on); LS.set('odontovoz.vdMini', on || null); if (on) A.toast('Botones de voz achicados. Tocá el micrófono chiquito para agrandarlos.'); };
  dock(); setTimeout(dock, 1500);

  const css = document.createElement('style');
  css.textContent = [
    /* marco de las ventanas */
    '.modal { border-radius: 20px; border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--line)); box-shadow: 0 24px 60px rgba(8, 20, 24, .28), 0 2px 8px rgba(8, 20, 24, .08); overflow: hidden; }',
    '.m-head { background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 9%, var(--surface)), var(--surface)); border-bottom: 1px solid color-mix(in srgb, var(--accent) 16%, var(--line)); }',
    '.m-head h2 { flex: 1; min-width: 0; } .m-head.m-drag { cursor: grab; user-select: none; } .m-head.m-drag:active { cursor: grabbing; }',
    '.m-foot { background: color-mix(in srgb, var(--accent) 3%, var(--surface)); }',
    '.m-min { width: 36px; height: 36px; flex: none; display: grid; place-items: center; border: 1px solid var(--line); background: var(--surface); color: var(--ink-2); border-radius: 10px; cursor: pointer; }',
    '.m-min svg { width: 18px; height: 18px; } .m-min:hover { color: var(--accent); border-color: var(--accent); }',
    /* burbuja */
    '.m-bub { position: fixed; left: 14px; bottom: calc(90px + env(safe-area-inset-bottom, 0px)); z-index: 130; display: flex; align-items: center; max-width: min(280px, calc(100vw - 28px)); border-radius: 999px; background: var(--accent); color: var(--accent-ink); box-shadow: 0 10px 28px rgba(8, 20, 24, .3); touch-action: none; user-select: none; }',
    '.m-bub .mb-open { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 10px 6px 10px 14px; border: 0; background: none; color: inherit; font: 600 14px inherit; cursor: pointer; }',
    '.m-bub .mb-open svg { width: 20px; height: 20px; flex: none; } .m-bub .mb-open span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.m-bub .mb-x { width: 32px; height: 32px; margin-right: 6px; flex: none; border: 0; border-radius: 50%; background: color-mix(in srgb, var(--accent-ink) 18%, transparent); color: inherit; font-size: 18px; cursor: pointer; }',
    /* turno nuevo: tipo en una fila */
    '#modalHost .na-kind { display: flex !important; gap: 4px; padding: 4px; margin-bottom: 4px; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--line); flex-wrap: nowrap !important; }',
    '#modalHost .na-kind button { flex: 1 1 auto !important; min-width: 0; align-items: center !important; justify-content: center; padding: 8px 4px !important; border: 0 !important; border-radius: 10px !important; background: transparent !important; font-size: 14px; }',
    '#modalHost .na-kind button b { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; } #modalHost .na-kind button small { display: none; }',
    '#modalHost .na-kind button[aria-pressed="true"] { background: var(--surface) !important; box-shadow: 0 1px 4px rgba(8, 20, 24, .14); color: var(--accent); }',
    '#modalHost .na-kind button[data-k="1"][aria-pressed="true"] { color: var(--warn); }',
    '.na-khint { font-size: 12.5px; color: var(--ink-2); margin: 0 0 12px 6px; } .na-khint:empty { display: none; }',
    '@media (max-width: 420px) { #modalHost .na-kind button { font-size: 13px; padding: 8px 1px !important; letter-spacing: -.01em; } }',
    /* hora: flechas a los costados y horarios libres */
    '#modalHost .na-time { flex-wrap: nowrap; } #modalHost .na-time [data-d="-15"] { order: -1; }',
    '#modalHost .na-time .btn { min-width: 44px; padding: 0 8px; }',
    '.na-free { margin-top: 8px; } .na-fl { display: block; font-size: 12.5px; color: var(--ink-2); margin-bottom: 4px; }',
    '.na-fc { display: flex; gap: 6px; overflow-x: auto; padding: 2px 2px 6px; scrollbar-width: thin; }',
    '.na-chip { flex: none; padding: 6px 10px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--ok) 40%, var(--line)); background: color-mix(in srgb, var(--ok) 8%, var(--surface)); color: var(--ink); font: 600 13.5px var(--f-mono, inherit); cursor: pointer; }',
    '.na-chip.on { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }',
    /* voz: más chicos, movibles, minimizables */
    '.vd-mic { width: 50px !important; height: 50px !important; touch-action: none; } .vd-mic svg { width: 22px !important; height: 22px !important; }',
    '.vd-hf { height: 38px !important; touch-action: none; } @media (max-width: 520px) { .vd-hf { width: 38px !important; } }',
    '.vdock { position: fixed; } .vd-min { position: absolute; top: -8px; right: -6px; width: 22px; height: 22px; padding: 0; display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--line); background: var(--surface); color: var(--ink-2); box-shadow: var(--shadow); cursor: pointer; }',
    '.vd-min svg { width: 12px; height: 12px; }',
    '.vdock.vd-col .vd-hf, .vdock.vd-col .vd-min { display: none !important; }',
    '.vdock.vd-col .vd-mic { width: 34px !important; height: 34px !important; opacity: .6; box-shadow: var(--shadow); } .vdock.vd-col .vd-mic svg { width: 16px !important; height: 16px !important; }'
  ].join('\n');
  document.head.appendChild(css);
})();
