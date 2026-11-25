/* ===== 1.29: agenda: mantené presionado un espacio libre y arrastrá para bloquear varias horas; al tocar un espacio libre se abre una burbuja con el menú y la lista de pacientes ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc || (s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]));
  const $ = q => document.querySelector(q);
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const holdMs = () => { const v = +LS.get('odontovoz.holdMs', '1000'); return v >= 300 && v <= 6000 ? v : 1000; };
  const bubbleOn = () => LS.get('odontovoz.bubble', '1') !== '0';
  const who = () => { const m = A.memberNow && A.memberNow(); if (m && m.name) return m.name; const p = A.empCurPerson && A.empCurPerson(); return p && p.name ? p.name : ''; };
  const hhmm = m => (A.mm ? A.mm(m) : String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
  const dur = d => (d < 60 ? d + ' min' : (d % 60 ? Math.floor(d / 60) + ' h ' + (d % 60) + ' min' : (d / 60) + (d === 60 ? ' hora' : ' horas')));
  const SHof = gb => { const g = gb.closest('.grid'); const v = g ? parseFloat(getComputedStyle(g).getPropertyValue('--sh')) : 0; return v > 0 ? v : 28; };
  const stepOf = gb => { const pr = A.PRO(gb.getAttribute('data-pro')); return Math.max(5, Math.min(60, (A.slotOf ? A.slotOf(pr) : 30) || 30)); };

  /* =====================================================================
     1) BLOQUEAR ARRASTRANDO: mantener presionado un lugar libre y arrastrar
     ===================================================================== */
  let sel = null, press = null, suppressUntil = 0, raf = 0, lastPt = null;
  const ctx = gb => ({ gb, date: gb.getAttribute('data-date'), pro: gb.getAttribute('data-pro'), g0: parseInt(gb.getAttribute('data-g0'), 10), sh: SHof(gb), step: stepOf(gb) });
  const minuteAt = (c, y) => { const r = c.gb.getBoundingClientRect(); return c.g0 + (y - r.top) / c.sh * 15; };
  const range = (c, a, cur) => {   /* a: minuto donde empezó; cur: minuto bajo el dedo → [desde, hasta] alineado a los turnos del profesional */
    const st = c.step, base = Math.floor((a - c.g0) / st) * st + c.g0;
    let from, to;
    if (cur >= base) { from = base; to = Math.max(base + st, Math.ceil((cur - c.g0) / st) * st + c.g0); } else { from = Math.floor((cur - c.g0) / st) * st + c.g0; to = base + st; }
    const gMax = c.g0 + Math.round(c.gb.getBoundingClientRect().height / c.sh * 15);
    return [Math.max(c.g0, from), Math.min(gMax, to)];
  };
  function paintSel() {
    if (!sel) return; const c = sel.c; let ov = sel.ov;
    if (!ov) { ov = sel.ov = document.createElement('div'); ov.className = 'sel-blk'; c.gb.appendChild(ov); }
    ov.style.top = ((sel.from - c.g0) / 15 * c.sh) + 'px'; ov.style.height = (Math.max(1, (sel.to - sel.from)) / 15 * c.sh) + 'px';
    ov.innerHTML = '<span>🔒 ' + hhmm(sel.from) + ' – ' + hhmm(sel.to) + '<small>' + dur(sel.to - sel.from) + '</small></span>';
    const bar = $('#blkBar'); if (bar) { const t = bar.querySelector('.bb-t'); if (t) t.innerHTML = '🔒 Bloquear de ' + hhmm(sel.from) + ' a ' + hhmm(sel.to); const s = bar.querySelector('.bb-s'); if (s) s.textContent = dur(sel.to - sel.from); }
  }
  function endSel() { if (sel && sel.ov) sel.ov.remove(); sel = null; const b = $('#blkBar'); if (b) b.remove(); document.body.classList.remove('blk-drag'); }
  const holdFx = (x, y, ms) => { let f = $('#holdFx'); if (!f) { f = document.createElement('div'); f.id = 'holdFx'; document.body.appendChild(f); } f.style.left = x + 'px'; f.style.top = y + 'px'; f.style.setProperty('--hold', ms + 'ms'); f.className = ''; void f.offsetWidth; f.className = 'on'; };
  const holdOff = () => { const f = $('#holdFx'); if (f) f.className = ''; };
  function scrollLoop() {
    if (!sel || !sel.drag || !lastPt) { raf = 0; return; }
    const y = lastPt.y, H = window.innerHeight, edge = 70; let d = 0;
    if (y < edge + 50) d = -Math.ceil((edge + 50 - y) / 5); else if (y > H - edge - 40) d = Math.ceil((y - (H - edge - 40)) / 5);
    if (d) { window.scrollBy(0, d); const gw = sel.c.gb.closest('.grid-wrap'); if (gw && gw.scrollHeight > gw.clientHeight + 2) gw.scrollTop += d; move(lastPt.y); }
    raf = requestAnimationFrame(scrollLoop);
  }
  function move(y) { if (!sel) return; const cur = minuteAt(sel.c, y), r = range(sel.c, sel.a, cur); sel.from = r[0]; sel.to = r[1]; paintSel(); }
  document.addEventListener('pointerdown', e => {
    if ((e.pointerType === 'mouse' && e.button !== 0) || sel || (S.modal) || document.body.classList.contains('clip-on')) return;
    const gb = e.target.closest && e.target.closest('#gridWrap .gb'); if (!gb) return;
    if (e.target.closest('.blk, [data-appt], .grip, [data-grip], [data-act="openAppt"]')) return;
    const c = ctx(gb), ms = holdMs(); press = { c, x: e.clientX, y: e.clientY, id: e.pointerId, t: 0 };
    holdFx(e.clientX, e.clientY, ms);
    press.t = setTimeout(() => {
      if (!press) return; holdOff(); const a = minuteAt(c, press.y), r = range(c, a, a);
      sel = { c, a, from: r[0], to: r[1], drag: true, ov: null }; press = null; lastPt = { x: e.clientX, y: lastPt ? lastPt.y : e.clientY };
      document.body.classList.add('blk-drag'); try { navigator.vibrate && navigator.vibrate(35); } catch (er) { /* nada */ }
      paintSel(); if (!raf) raf = requestAnimationFrame(scrollLoop);
    }, ms);
  }, true);
  document.addEventListener('pointermove', e => {
    if (press) { if (Math.abs(e.clientX - press.x) > 10 || Math.abs(e.clientY - press.y) > 10) { clearTimeout(press.t); press = null; holdOff(); } return; }
    if (!sel || !sel.drag) return; lastPt = { x: e.clientX, y: e.clientY }; move(e.clientY);
  }, true);
  const release = e => {
    if (press) { clearTimeout(press.t); press = null; holdOff(); return; }
    if (!sel || !sel.drag) return; sel.drag = false; suppressUntil = Date.now() + 500; lastPt = null; document.body.classList.remove('blk-drag');
    if (e && e.type === 'pointercancel') { endSel(); return; }
    barOpen();
  };
  document.addEventListener('pointerup', release, true); document.addEventListener('pointercancel', release, true);
  /* mientras se arrastra no se mueve la pantalla (en el celular) ni sale el menú del sistema */
  document.addEventListener('touchmove', e => { if (sel && sel.drag && e.cancelable) e.preventDefault(); }, { passive: false, capture: true });
  document.addEventListener('contextmenu', e => { if (press || sel || (e.target.closest && e.target.closest('#gridWrap .gb'))) e.preventDefault(); }, true);
  document.addEventListener('click', e => { if (Date.now() < suppressUntil && e.target.closest && e.target.closest('#gridWrap')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (sel) endSel(); closeBubble(); } });

  const CHIPS = ['Almuerzo', 'Curso', 'Reunión', 'Trámite', 'Salgo y vuelvo', 'Urgencia'];
  function barOpen() {
    if (!sel) return; const old = $('#blkBar'); if (old) old.remove(); const c = sel.c, p = A.PRO(c.pro) || {};
    const b = document.createElement('div'); b.id = 'blkBar'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Bloquear horario');
    b.innerHTML = '<div class="bb-h"><div><b class="bb-t"></b><small><span class="bb-s"></span> · ' + esc(p.name || '') + ' · ' + esc(A.fmtShort ? A.fmtShort(c.date) : c.date) + '</small></div><button class="bb-x" data-act="blkCancel" aria-label="Cancelar">×</button></div>' +
      '<div class="bb-adj"><button data-act="blkShr" aria-label="Terminar antes">− ' + c.step + ' min</button><span>Ajustá la hora de fin</span><button data-act="blkExt" aria-label="Terminar después">+ ' + c.step + ' min</button></div>' +
      '<input id="blkLab" maxlength="120" placeholder="Motivo (opcional)" autocomplete="off"><div class="bb-chips">' + CHIPS.map(t => '<button type="button" data-act="blkChip" data-v="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>' +
      '<div class="bb-btns"><button class="btn" data-act="blkCancel">Cancelar</button><button class="btn primary" data-act="blkGo">🔒 Bloquear</button></div>';
    document.body.appendChild(b); paintSel(); setTimeout(showSel, 60);
  }
  /* que lo seleccionado quede a la vista, arriba de la barra */
  function showSel() {
    if (!sel || !sel.ov) return; const bar = $('#blkBar'), r = sel.ov.getBoundingClientRect(), lim = window.innerHeight - (bar ? bar.offsetHeight : 0) - 14;
    if (r.bottom > lim || r.top < 80) window.scrollBy({ top: r.top - 90, behavior: 'smooth' });
  }
  A.acts.blkCancel = () => endSel();
  A.acts.blkChip = el => { const i = $('#blkLab'); if (i) { i.value = el.getAttribute('data-v'); i.focus(); } };
  A.acts.blkExt = () => { if (!sel) return; const c = sel.c, max = c.g0 + Math.round(c.gb.getBoundingClientRect().height / c.sh * 15); sel.to = Math.min(max, sel.to + c.step); paintSel(); showSel(); };
  A.acts.blkShr = () => { if (!sel) return; sel.to = Math.max(sel.from + sel.c.step, sel.to - sel.c.step); paintSel(); };
  A.acts.blkGo = () => {
    if (!sel) return; const c = sel.c, lab = (($('#blkLab') || {}).value || '').trim(), start = sel.from, d = sel.to - sel.from, by = who();
    const it = { id: A.uid(), type: 'block', label: lab || 'Bloqueado', pro: c.pro, date: c.date, start, dur: d, status: 'confirmado', at: new Date().toISOString() };
    if (by) it.by = by; if (A.empSede && A.empSede()) it.loc = A.empSede();
    const busy = A.day(c.date).filter(x => x.pro === c.pro && x.type !== 'block' && x.status !== 'cancelado' && !x.sobre && x.start < start + d && start < x.start + x.dur);
    A.mutate([c.date], () => { A.day(c.date).push(it); }, 'Horario bloqueado' + (lab ? ': ' + lab : ''));
    endSel(); S.date = c.date; A.refresh();
    A.toast('🔒 Bloqueado de ' + hhmm(start) + ' a ' + hhmm(start + d) + '.' + (busy.length ? ' Ojo: en ese horario ya tenía turno ' + busy.map(x => (A.PAT(x.pid) || {}).name).filter(Boolean).join(', ') + '.' : ''), null, busy.length ? 7000 : 3500);
  };

  /* =====================================================================
     2) BURBUJA AL TOCAR UN ESPACIO LIBRE: menú a la izquierda y pacientes a la derecha
     ===================================================================== */
  let bub = null;
  const recentPats = () => {
    const seen = {}, out = [], keys = Object.keys(A.S.days || {}).sort().reverse(), today = A.today();
    for (const k of keys) { if (k > A.add(today, 30)) continue; (A.S.days[k] || []).slice().reverse().forEach(a => { if (a.pid && a.type !== 'block' && !seen[a.pid] && A.PAT(a.pid)) { seen[a.pid] = 1; out.push(a.pid); } }); if (out.length >= 8) break; }
    if (out.length < 8) (A.PATS || []).forEach(p => { if (out.length < 8 && !seen[p.id] && !p.deleted) { seen[p.id] = 1; out.push(p.id); } });
    return out.slice(0, 8).map(id => A.PAT(id));
  };
  const patRows = q => {
    const qq = (A.norm ? A.norm(q || '') : (q || '').toLowerCase()).trim();
    const L = qq.length >= 2 && A.searchPats ? (A.searchPats(qq, 8) || []) : recentPats();
    if (!L.length) return '<li class="bub-none">No encontré pacientes con eso.</li>';
    return L.map(p => '<li><button data-act="bubPick" data-pid="' + esc(p.id) + '"><span class="bub-av">' + esc((p.name || '?').charAt(0).toUpperCase()) + '</span><span class="bub-pn"><b>' + esc(p.name) + '</b><small>' + esc([p.cov && p.cov !== 'Particular' ? p.cov : '', p.phone || ''].filter(Boolean).join(' · ') || 'Paciente') + '</small></span></button></li>').join('');
  };
  function openBubble(el, ev) {
    closeBubble(); const rect = el.getBoundingClientRect(), pr = A.PRO(el.getAttribute('data-pro')), g0 = parseInt(el.getAttribute('data-g0'), 10), sh = SHof(el), step = stepOf(el);
    const y = ev && ev.clientY != null ? ev.clientY - rect.top : 0, start = g0 + Math.max(0, Math.floor((y / sh * 15) / step)) * step;
    bub = { el, date: el.getAttribute('data-date'), pro: el.getAttribute('data-pro'), start, x: ev && ev.clientX || rect.left + 40, y: ev && ev.clientY || rect.top + 40 };
    const d = document.createElement('div'); d.id = 'bub'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Qué hacer en este horario');
    d.innerHTML = '<div class="bub-arrow"></div><div class="bub-h"><div><b>' + hhmm(start) + '</b><small>' + esc(pr ? pr.name : '') + ' · ' + esc(A.fmtShort ? A.fmtShort(bub.date) : bub.date) + '</small></div><button class="bub-x" data-act="bubClose" aria-label="Cerrar">×</button></div>' +
      '<div class="bub-body"><div class="bub-menu" role="group" aria-label="Qué querés hacer">' +
      '<button data-act="bubAct" data-k="turno"><i>📅</i><span><b>Turno</b><small>en este horario</small></span></button>' +
      '<button data-act="bubAct" data-k="sobre"><i>➕</i><span><b>Sobreturno</b><small>se superpone</small></span></button>' +
      '<button data-act="bubAct" data-k="block"><i>🔒</i><span><b>Bloquear</b><small>que no den turnos</small></span></button>' +
      '<button data-act="bubAct" data-k="note"><i>✎</i><span><b>Nota</b><small>un recordatorio</small></span></button></div>' +
      '<div class="bub-pats"><label class="bub-s"><span aria-hidden="true">🔍</span><input id="bubQ" type="search" placeholder="Paciente: nombre, apellido o DNI" autocomplete="off" aria-label="Buscar paciente"></label><div class="bub-pt">' + (document.getElementById('bubQ') ? '' : '') + 'Recientes</div><ul class="bub-list" id="bubList">' + patRows('') + '</ul></div></div>' +
      '<div class="bub-f"><span>💡 Arrastrá un paciente a la agenda para darle turno (en el celu, mantenelo presionado). Para bloquear horas, mantené presionado un espacio libre y arrastrá.</span><label>⏱ <select id="bubHold" aria-label="Tiempo para mantener presionado">' + [[500, '0,5 s'], [1000, '1 s'], [2000, '2 s'], [4000, '4 s']].map(o => '<option value="' + o[0] + '"' + (holdMs() === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label></div>';
    document.body.appendChild(d); bub.d = d; place(d);
    requestAnimationFrame(() => d.classList.add('in'));
    const q = $('#bubQ'); if (q && window.innerWidth > 700) q.focus({ preventScroll: true });
  }
  function place(d) {
    const W = window.innerWidth, H = window.innerHeight, narrow = W <= 700; d.classList.toggle('sheet', narrow);
    if (narrow) { d.style.left = '8px'; d.style.right = '8px'; d.style.top = ''; d.style.bottom = 'calc(10px + env(safe-area-inset-bottom,0px))'; return; }
    const bw = d.offsetWidth || 520, bh = d.offsetHeight || 340; let left = bub.x + 18, side = 'r';
    if (left + bw > W - 10) { left = bub.x - bw - 18; side = 'l'; } if (left < 10) { left = Math.max(10, (W - bw) / 2); side = 'c'; }
    let top = bub.y - 40; top = Math.max(10, Math.min(top, H - bh - 10));
    d.style.left = left + 'px'; d.style.top = top + 'px'; d.style.right = ''; d.style.bottom = ''; d.style.transformOrigin = side === 'r' ? '0 ' + (bub.y - top) + 'px' : side === 'l' ? '100% ' + (bub.y - top) + 'px' : '50% 0';
    const ar = d.querySelector('.bub-arrow'); ar.className = 'bub-arrow ' + side; ar.style.top = Math.max(18, Math.min(bh - 30, bub.y - top - 8)) + 'px';
  }
  function closeBubble() { if (bub && bub.d) bub.d.remove(); bub = null; }
  A.acts.bubClose = () => closeBubble();
  A.ins.bubQ = el => { const u = $('#bubList'), t = document.querySelector('.bub-pt'); if (u) u.innerHTML = patRows(el.value); if (t) t.textContent = (A.norm ? A.norm(el.value) : el.value).trim().length >= 2 ? 'Resultados' : 'Recientes'; };
  document.addEventListener('input', e => { if (e.target && e.target.id === 'bubQ') A.ins.bubQ(e.target); });
  document.addEventListener('change', e => { if (e.target && e.target.id === 'bubHold') { LS.set('odontovoz.holdMs', e.target.value); A.toast('Para bloquear: mantené presionado ' + (+e.target.value / 1000).toString().replace('.', ',') + ' s.', null, 2500); } });
  A.acts.bubPick = el => { const b = bub; if (!b) return; closeBubble(); A.openNewAppt({ date: b.date, pro: b.pro, start: b.start, pid: el.getAttribute('data-pid') }); };
  A.acts.bubAct = el => {
    const b = bub; if (!b) return; const k = el.getAttribute('data-k'); closeBubble();
    if (k === 'turno' || k === 'sobre') { A.openNewAppt({ date: b.date, pro: b.pro, start: b.start, sobre: k === 'sobre' }); return; }
    if (k === 'block') {   /* empieza la selección con ese horario: se estira con − y + o se baja desde la burbuja manteniendo presionado */
      const gb = b.el; if (!gb || !gb.isConnected) return; const c = ctx(gb); sel = { c, a: b.start, from: b.start, to: b.start + c.step, drag: false, ov: null }; paintSel(); barOpen(); return;
    }
    A.openNewAppt({ date: b.date, pro: b.pro, start: b.start }); setTimeout(() => { const nb = document.querySelector('[data-act="qbGo"][data-k="note"]'); if (nb && A.acts.qbGo) A.acts.qbGo(nb); }, 30);
  };
  /* el toque en un espacio libre abre la burbuja (si no se está copiando un turno, ni hay una selección en curso) */
  const gbPrev = A.acts.gbClick;
  A.acts.gbClick = function (el, ev) {
    if (Date.now() < suppressUntil || sel) return;
    if (!bubbleOn() || document.body.classList.contains('clip-on') || S.modal) return gbPrev.apply(this, arguments);
    openBubble(el, ev);
  };
  document.addEventListener('pointerdown', e => { if (bub && bub.d && !e.target.closest('#bub') && !(e.target.closest && e.target.closest('#gridWrap .gb'))) closeBubble(); }, true);
  window.addEventListener('resize', () => { if (bub && bub.d) place(bub.d); });
  const arPrev = A.afterRefresh; A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; if (sel && (!sel.c.gb.isConnected)) endSel(); return r; };

  const css = document.createElement('style');
  css.textContent = '#gridWrap .gb{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}body.blk-drag{cursor:ns-resize;user-select:none;-webkit-user-select:none}body.blk-drag #gridWrap{touch-action:none}' +
    '.sel-blk{position:absolute;left:3px;right:3px;z-index:30;border:2px dashed var(--accent);background:color-mix(in srgb,var(--accent) 18%,transparent);border-radius:10px;pointer-events:none;display:flex;align-items:flex-start;justify-content:center;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.12)}' +
    '.sel-blk span{margin-top:4px;background:var(--accent);color:var(--accent-ink);border-radius:999px;padding:3px 10px;font-weight:700;font-size:12.5px;display:flex;gap:8px;align-items:baseline;white-space:nowrap}.sel-blk small{font-weight:500;opacity:.9}' +
    '#holdFx{position:fixed;z-index:400;width:0;height:0;pointer-events:none}#holdFx.on::before{content:"";position:absolute;left:-26px;top:-26px;width:52px;height:52px;border-radius:50%;border:3px solid var(--accent);background:color-mix(in srgb,var(--accent) 22%,transparent);animation:holdgrow var(--hold) linear forwards}' +
    '@keyframes holdgrow{from{transform:scale(.2);opacity:.2}to{transform:scale(1);opacity:1}}' +
    '#blkBar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:300;width:min(460px,calc(100vw - 20px));background:var(--surface);border:1px solid var(--accent);border-radius:18px;padding:12px;box-shadow:0 14px 40px rgba(0,0,0,.25);display:flex;flex-direction:column;gap:9px}' +
    '.bb-h{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.bb-h b{font-size:1.02rem}.bb-h small{display:block;color:var(--ink-2);font-size:.8rem}.bb-x{border:0;background:none;font-size:1.5rem;line-height:1;color:var(--ink-2);cursor:pointer}' +
    '.bb-adj{display:flex;align-items:center;gap:8px;justify-content:space-between;font-size:.8rem;color:var(--ink-2)}.bb-adj button{border:1px solid var(--line);background:var(--surface-2);color:var(--ink);border-radius:999px;padding:7px 12px;font:inherit;font-weight:700;cursor:pointer}' +
    '#blkLab{width:100%;box-sizing:border-box}.bb-chips{display:flex;flex-wrap:wrap;gap:6px}.bb-chips button{border:1px solid var(--line);background:var(--surface-2);color:var(--ink);border-radius:999px;padding:5px 11px;font:inherit;font-size:.82rem;cursor:pointer}.bb-btns{display:flex;gap:8px;justify-content:flex-end}' +
    '#bub{position:fixed;z-index:310;width:min(520px,calc(100vw - 20px));background:var(--surface);border:1px solid var(--line);border-radius:20px;box-shadow:0 18px 50px rgba(0,0,0,.28);opacity:0;transform:scale(.92);transition:opacity .16s ease,transform .18s cubic-bezier(.2,.9,.3,1.2);padding:12px 12px 10px}#bub.in{opacity:1;transform:none}' +
    '.bub-arrow{position:absolute;width:16px;height:16px;background:var(--surface);border:1px solid var(--line);transform:rotate(45deg)}.bub-arrow.r{left:-9px;border-right:0;border-top:0}.bub-arrow.l{right:-9px;border-left:0;border-bottom:0}.bub-arrow.c{display:none}' +
    '.bub-h{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}.bub-h b{font:800 1.5rem var(--display,inherit);color:var(--accent)}.bub-h small{display:block;color:var(--ink-2);font-size:.82rem}.bub-x{border:0;background:none;font-size:1.5rem;line-height:1;color:var(--ink-2);cursor:pointer}' +
    '.bub-body{display:grid;grid-template-columns:168px 1fr;gap:12px}.bub-menu{display:flex;flex-direction:column;gap:6px}.bub-menu button{display:flex;align-items:center;gap:10px;text-align:left;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);border-radius:14px;padding:9px 10px;cursor:pointer;font:inherit;transition:transform .12s,border-color .12s}' +
    '.bub-menu button:hover{border-color:var(--accent);transform:translateX(2px)}.bub-menu i{font-style:normal;font-size:1.25rem}.bub-menu b{display:block;font-size:.92rem}.bub-menu small{display:block;color:var(--ink-2);font-size:.72rem}' +
    '.bub-pats{display:flex;flex-direction:column;min-width:0;border-left:1px solid var(--line);padding-left:12px}.bub-s{display:flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:12px;padding:0 10px;background:var(--surface-2)}.bub-s input{border:0;background:transparent;flex:1;min-width:0;padding:9px 0;font:inherit;color:var(--ink);outline:none}' +
    '.bub-pt{font:700 .72rem var(--display,inherit);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);margin:9px 2px 4px}.bub-list{list-style:none;margin:0;padding:0;max-height:238px;overflow:auto}.bub-list button{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:0;background:none;color:var(--ink);padding:7px 6px;border-radius:12px;cursor:pointer;font:inherit}.bub-list button:hover{background:var(--accent-soft)}' +
    '.bub-av{flex:none;width:34px;height:34px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-weight:800}.bub-pn{display:flex;flex-direction:column;min-width:0}.bub-pn b{font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bub-pn small{color:var(--ink-2);font-size:.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bub-none{padding:12px 4px;color:var(--ink-2);font-size:.85rem}' +
    '.bub-f{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:9px;padding-top:8px;border-top:1px solid var(--line);font-size:.74rem;color:var(--ink-2)}.bub-f select{border:1px solid var(--line);background:var(--surface-2);color:var(--ink);border-radius:8px;padding:3px 6px;font:inherit}' +
    '#bub.sheet{width:auto;border-radius:20px 20px 18px 18px}#bub.sheet .bub-arrow{display:none}#bub.sheet .bub-body{grid-template-columns:1fr}#bub.sheet .bub-menu{flex-direction:row;overflow-x:auto}#bub.sheet .bub-menu button{flex:1 0 auto;flex-direction:column;text-align:center;gap:2px;padding:8px 10px}#bub.sheet .bub-menu small{display:none}#bub.sheet .bub-pats{border-left:0;padding-left:0}#bub.sheet .bub-list{max-height:30vh}' +
    '@media (prefers-reduced-motion:reduce){#bub{transition:none}}';
  document.body.appendChild(css);
})();
