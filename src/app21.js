/* ===== 1.13: cerrar sesión desde el menú y agenda de cada profesional armada a mano, día por día ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc;

  /* ---------------------------------------------------------------
     CERRAR SESIÓN al fondo del menú (solo si hay una cuenta en la nube abierta)
     --------------------------------------------------------------- */
  const foot = document.querySelector('#gearMenu .dr-foot');
  if (foot && !$('#drOut')) foot.insertAdjacentHTML('beforebegin', '<div class="dr-sec dr-out" id="drOut" hidden><button class="dnav dnav-out" data-act="drLogout"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg><span>Cerrar sesión<small id="drOutWho"></small></span></button></div>');
  const logged = () => !!(A.cloud && A.cloud.session);
  function syncOut() {
    const box = $('#drOut'); if (!box) return; box.hidden = !logged();
    const who = $('#drOutWho'), u = A.cloud && A.cloud.session && A.cloud.session.user; if (who) who.textContent = u && u.email ? u.email : '';
  }
  const prevShow = A.showDrawer; A.showDrawer = () => { syncOut(); prevShow(); };
  const prevAfter = A.afterRefresh; A.afterRefresh = () => { if (prevAfter) prevAfter(); syncOut(); };
  A.acts.drLogout = () => { if (A.hideDrawer) A.hideDrawer(); if (A.acts.acctOut) A.acts.acctOut(); };

  /* ---------------------------------------------------------------
     AGENDA DEL PROFESIONAL, ARMADA A MANO
     Cada día muestra sus horarios como chips. «+ Agregar horario» abre un formulario:
     elegís uno o varios días, desde, hasta y si es todas las semanas o semana por medio.
     Tocar un horario lo edita. Un día sin horarios = no atiende.
     --------------------------------------------------------------- */
  const DAYS = [[1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado'], [0, 'Domingo']];
  const dn = d => DAYS.filter(x => x[0] === d)[0][1];
  const sel = (id, v, a, b, step) => { let o = ''; for (let x = a; x <= b; x += step) o += '<option value="' + x + '"' + (x === v ? ' selected' : '') + '>' + String(x).padStart(2, '0') + '</option>'; return '<select id="' + id + '">' + o + '</select>'; };
  const timeSel = (pre, t) => '<div class="ab-time">' + sel(pre + 'H', Math.floor(t / 60), 0, 23, 1) + '<span>:</span>' + sel(pre + 'M', t % 60 - (t % 60) % 5, 0, 55, 5) + '</div>';
  const readT = pre => (+$('#' + pre + 'H').value) * 60 + (+$('#' + pre + 'M').value);
  const curOdd = () => A.isoWeek(A.today()) % 2 === 1;
  const freqOf = (p, d) => (p.freq && p.freq[d]) || 'all';
  const freqTxt = (p, d) => { const f = freqOf(p, d); if (f === 'all') return ''; return (f === 'odd') === curOdd() ? 'semana por medio (esta sí)' : 'semana por medio (la próxima)'; };

  function builder(p) {
    const f = S.modal.ab;
    let h = '<h3>Días y horarios de atención</h3><div class="hint">Armá la agenda como quieras: un solo día, varios días, mañana y tarde, o semana por medio. Tocá un horario para cambiarlo.</div>';
    h += '<div class="ab-week">' + DAYS.map(([d, name]) => {
      const rs = (p.sched[d] || []).slice().sort((a, b) => a[0] - b[0]), fq = freqTxt(p, d);
      return '<div class="ab-day' + (rs.length ? '' : ' ab-off') + '"><b>' + name + '</b><div class="ab-chips">' +
        (rs.length ? rs.map(r => { const i = (p.sched[d] || []).indexOf(r); return '<button class="ab-chip" data-act="abEdit" data-d="' + d + '" data-i="' + i + '" aria-label="Cambiar ' + name + ' de ' + A.mm(r[0]) + ' a ' + A.mm(r[1]) + '">' + A.mm(r[0]) + ' a ' + A.mm(r[1]) + '</button>'; }).join('') + (fq ? '<span class="ab-fq">' + fq + '</span>' : '') : '<span class="ab-none">No atiende</span>') +
        '<button class="ab-add" data-act="abNew" data-d="' + d + '" aria-label="Agregar horario el ' + name + '">+</button></div></div>';
    }).join('') + '</div>';
    if (f && f.pid === p.id) h += form(p, f);
    else h += '<div class="row-btns"><button class="btn primary" data-act="abNew">+ Agregar horario</button><button class="btn small ghost" data-act="abZero">Empezar de cero</button></div>';
    const tot = Object.keys(p.sched).reduce((s, d) => s + (p.sched[d] || []).reduce((x, r) => x + r[1] - r[0], 0) * (freqOf(p, +d) === 'all' ? 1 : 0.5), 0) / 60;
    h += '<div class="hint">' + (tot ? 'Total: ' + String(Math.round(tot * 10) / 10).replace('.', ',') + ' horas por semana.' : 'Todavía no tiene horarios: la agenda no le ofrece turnos.') + '</div><div id="abMsg" class="hint bad" aria-live="polite"></div>';
    return h;
  }
  function form(p, f) {
    return '<div class="ab-form" id="abForm"><h4>' + (f.edit ? 'Cambiar horario del ' + dn(f.edit.d).toLowerCase() : 'Nuevo horario') + '</h4>' +
      (f.edit ? '' : '<div class="ab-lbl">¿Qué días?</div><div class="ab-days" role="group" aria-label="Días">' + DAYS.map(([d, n]) => '<button type="button" class="pill" data-act="abDay" data-d="' + d + '" aria-pressed="' + (f.days.indexOf(d) >= 0) + '">' + n.slice(0, 3) + '</button>').join('') + '</div>') +
      '<div class="ab-row"><div><div class="ab-lbl">Desde</div>' + timeSel('abF', f.from) + '</div><div><div class="ab-lbl">Hasta</div>' + timeSel('abT', f.to) + '</div></div>' +
      '<div class="ab-lbl">¿Cada cuánto?</div><select id="abQ"><option value="all"' + (f.fq === 'all' ? ' selected' : '') + '>Todas las semanas</option><option value="this"' + (f.fq === 'this' ? ' selected' : '') + '>Semana por medio (empieza esta semana)</option><option value="next"' + (f.fq === 'next' ? ' selected' : '') + '>Semana por medio (empieza la próxima)</option></select>' +
      '<div class="row-btns"><button class="btn primary" data-act="abSave">' + (f.edit ? 'Guardar cambio' : 'Agregar') + '</button>' + (f.edit ? '<button class="btn danger" data-act="abDel">Quitar este horario</button>' : '') + '<button class="btn" data-act="abCancel">Cancelar</button></div></div>';
  }
  const pro = () => A.PRO(S.modal.sel);
  const say = t => { const m = $('#abMsg'); if (m) m.textContent = t || ''; };
  function redraw() { const b = $('.m-body'), t = b ? b.scrollTop : 0; A.renderModal(); const b2 = $('.m-body'); if (b2) b2.scrollTop = t; const fm = $('#abForm'); if (fm && S.modal.ab && S.modal.ab.scroll) { fm.scrollIntoView({ block: 'nearest' }); S.modal.ab.scroll = false; } }
  function changed() { A.dropDayCache(); A.save(); A.refresh(); }
  const fqKey = (p, d) => { const f = freqOf(p, d); return f === 'all' ? 'all' : (f === 'odd') === curOdd() ? 'this' : 'next'; };
  A.acts.abNew = el => {
    const p = pro(), d = el && el.getAttribute && el.getAttribute('data-d'), rs = d != null ? p.sched[+d] || [] : [];
    const last = rs.length ? Math.max(...rs.map(r => r[1])) : 0, from = last ? Math.min(last + 60, 1320) : 540;
    S.modal.ab = { pid: p.id, days: d != null ? [+d] : [], from, to: Math.min(from + 240, 1435), fq: d != null ? fqKey(p, +d) : 'all', edit: null, scroll: true }; redraw();
  };
  A.acts.abEdit = el => { const p = pro(), d = +el.getAttribute('data-d'), i = +el.getAttribute('data-i'), r = p.sched[d][i]; S.modal.ab = { pid: p.id, days: [d], from: r[0], to: r[1], fq: fqKey(p, d), edit: { d, i }, scroll: true }; redraw(); };
  A.acts.abDay = el => { const f = S.modal.ab, d = +el.getAttribute('data-d'), k = f.days.indexOf(d); if (k >= 0) f.days.splice(k, 1); else f.days.push(d); el.setAttribute('aria-pressed', String(k < 0)); };
  A.acts.abCancel = () => { S.modal.ab = null; redraw(); };
  A.acts.abSave = () => {
    const p = pro(), f = S.modal.ab, from = readT('abF'), to = readT('abT'), fq = $('#abQ').value;
    if (to <= from) { say('La hora de «hasta» tiene que ser después de «desde».'); return; }
    if (!f.days.length) { say('Elegí al menos un día.'); return; }
    const next = {};
    for (const d of f.days) {
      const rs = (p.sched[d] || []).map(r => r.slice()); let keep = null; if (f.edit) keep = rs.splice(f.edit.i, 1)[0];
      const clash = rs.filter(r => r[0] < to && from < r[1])[0];
      if (clash) { say('El ' + dn(d).toLowerCase() + ' ya tiene un horario de ' + A.mm(clash[0]) + ' a ' + A.mm(clash[1]) + ' que se superpone. Cambiá las horas o tocá ese horario para modificarlo.'); return; }
      rs.push(keep && keep[2] ? [from, to, keep[2]] : [from, to]); rs.sort((a, b) => a[0] - b[0]); next[d] = rs;
    }
    Object.keys(next).forEach(d => {
      p.sched[d] = next[d];
      p.freq = p.freq || {}; if (fq === 'all') delete p.freq[d]; else p.freq[d] = (fq === 'this') === curOdd() ? 'odd' : 'even';
      if (A.CFG.days.indexOf(+d) < 0) { A.CFG.days.push(+d); A.CFG.days.sort((a, b) => a - b); }
    });
    S.modal.ab = null; changed(); redraw();
    A.toast(f.edit ? 'Horario actualizado.' : 'Agregado: ' + f.days.map(dn).join(', ') + ' de ' + A.mm(from) + ' a ' + A.mm(to) + '.');
  };
  A.acts.abDel = () => {
    const p = pro(), f = S.modal.ab, d = f.edit.d, old = (p.sched[d] || []).map(r => r.slice());
    p.sched[d].splice(f.edit.i, 1); if (!p.sched[d].length) { delete p.sched[d]; if (p.freq) delete p.freq[d]; }
    S.modal.ab = null; changed(); redraw();
    A.toast('Horario quitado del ' + dn(d).toLowerCase() + '.', () => { p.sched[d] = old; changed(); redraw(); });
  };
  A.acts.abZero = () => {
    const p = pro(), old = JSON.stringify({ s: p.sched, f: p.freq || {} });
    p.sched = {}; p.freq = {}; S.modal.ab = null; changed(); redraw();
    A.toast('Agenda de ' + p.short + ' vacía: agregá sus horarios.', () => { const o = JSON.parse(old); p.sched = o.s; p.freq = o.f; changed(); redraw(); });
  };

  /* reemplaza el bloque «Días y horarios de atención» del editor del profesional */
  const prevRender = A.renderModal;
  A.renderModal = () => {
    prevRender();
    const m = S.modal; if (!m || m.type !== 'cfg' || !m.sel || m.wiz) { if (m && m.type === 'cfg' && !m.sel) m.ab = null; return; }
    const p = A.PRO(m.sel); if (!p || p.id !== m.sel) return;
    /* con varios consultorios propios, los horarios se arman en «Mis consultorios y horarios» */
    if (A.isSolo && A.isSolo() && A.locs && A.locs().length > 1) return;
    const blk = Array.prototype.slice.call(document.querySelectorAll('.modal .block')).filter(b => /Días y horarios de atención/.test((b.querySelector('h3') || {}).textContent || ''))[0];
    if (!blk) return;
    if (m.ab && m.ab.pid !== p.id) m.ab = null;
    blk.classList.add('ab-block'); blk.innerHTML = builder(p);
  };

  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '.dr-out{border-top:1px solid var(--line);padding-top:6px}.dnav-out{color:var(--pat,#c0392b)!important}.dnav-out span{display:flex;flex-direction:column;align-items:flex-start}.dnav-out small{font-size:12px;color:var(--ink-2);font-weight:400}' +
    '.ab-week{display:flex;flex-direction:column;gap:6px;margin:10px 0}.ab-day{display:grid;grid-template-columns:92px 1fr;align-items:center;gap:8px;border:1px solid var(--line);border-radius:12px;padding:8px 10px;background:var(--surface)}.ab-day.ab-off{background:var(--surface-2)}.ab-day>b{font-size:15px}' +
    '.ab-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.ab-chip{border:1px solid var(--accent);background:var(--accent-soft);color:var(--ink);border-radius:999px;padding:6px 12px;font:600 14px var(--f-mono,inherit);cursor:pointer;min-height:36px}.ab-none{color:var(--ink-2);font-size:14px}.ab-fq{font-size:12px;color:var(--ink-2)}' +
    '.ab-add{margin-left:auto;width:36px;height:36px;border-radius:50%;border:1px dashed var(--accent);background:transparent;color:var(--accent);font:700 20px/1 inherit;cursor:pointer}' +
    '.ab-form{border:2px solid var(--accent);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:8px;background:var(--surface);margin:6px 0}.ab-form h4{margin:0;font-size:16px}.ab-lbl{font-size:13px;font-weight:700;color:var(--ink-2)}' +
    '.ab-days{display:flex;flex-wrap:wrap;gap:6px}.ab-days .pill{min-height:40px;min-width:52px}.ab-row{display:flex;gap:16px;flex-wrap:wrap}' +
    '.ab-time{display:flex;align-items:center;gap:4px}.ab-time select{width:auto!important;min-width:70px;min-height:44px;font:600 17px var(--f-mono,inherit);border-radius:10px}.ab-time span{font-weight:700}#abQ{min-height:44px}' +
    '@media (max-width:480px){.ab-day{grid-template-columns:76px 1fr;padding:6px 8px}.ab-day>b{font-size:14px}.ab-chip{padding:5px 9px;font-size:13px}}' +
    '</style>');
})();
