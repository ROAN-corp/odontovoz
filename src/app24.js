/* ===== 1.16: agenda de centro con los profesionales al costado (tocás uno y ves su agenda) y varios meses de calendario ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc;
  const wide = () => !window.OV_NATIVE && (window.innerWidth || 0) >= 1100;
  const many = () => A.visPros().length > 1;
  const ini = n => String(n || '').replace(/^(Dra?\.|Lic\.)\s*/i, '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  const live = a => a.type !== 'block' && a.status !== 'cancelado';
  const cur = () => (S.proSel && S.proSel.length === 1 ? S.proSel[0] : null);

  A.acts.agPickPro = el => {
    const id = el.getAttribute('data-id');
    S.proSel = id ? [id] : null;
    if (!id && S.view === 'semana') S.view = 'dia';
    A.refresh();
  };

  /* ---------- lista de profesionales ---------- */
  function proList(vertical) {
    const pros = A.visPros(), d = S.date, sel = cur();
    const item = (p, on) => {
      const n = p ? A.day(d).filter(a => live(a) && a.pro === p.id).length : A.day(d).filter(live).length;
      const works = p ? A.hoursFor(p, d).length > 0 : true;
      return '<button class="ap-pro' + (on ? ' on' : '') + (works ? '' : ' ap-off') + '" data-act="agPickPro" data-id="' + (p ? p.id : '') + '" aria-pressed="' + on + '">' +
        '<span class="ap-av" style="--c:' + (p ? p.color : 'var(--ink-2)') + '">' + (p ? esc(ini(p.name)) : '★') + '</span>' +
        '<span class="ap-tx"><b>' + (p ? esc(p.name) : 'Todos') + '</b><small>' + (p ? (works ? n + ' turno' + (n === 1 ? '' : 's') : 'No atiende') : n + ' turnos del día') + '</small></span></button>';
    };
    return '<div class="ap-list' + (vertical ? ' v' : ' h') + '" role="group" aria-label="Profesionales">' + (vertical ? '<div class="ap-ttl">Profesionales</div>' : '') +
      item(null, !sel) + pros.map(p => item(p, sel === p.id)).join('') + '</div>';
  }

  /* ---------- varios meses de calendario ---------- */
  function month(m0) {
    const first = m0 + '-01', d0 = A.parse(first), today = A.today(), sel = cur();
    const pros = sel ? A.visPros().filter(p => p.id === sel) : A.visPros();
    const start = A.add(first, -((d0.getDay() + 6) % 7));
    let h = '<div class="am-m"><div class="am-t">' + esc(A.cap(d0.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }))) + '</div><div class="mc-grid">' + ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'].map(x => '<span class="mc-dw">' + x + '</span>').join('');
    for (let i = 0; i < 42; i++) {
      const k = A.add(start, i), out = k.slice(0, 7) !== m0; if (i >= 35 && out) break;
      if (out) { h += '<span class="mc-d out am-blank"></span>'; continue; }
      const n = A.day(k).filter(a => live(a) && pros.some(p => p.id === a.pro)).length;
      const works = pros.some(p => A.hoursFor(p, k).length);
      h += '<button class="mc-d' + (k === today ? ' today' : '') + (k === S.date ? ' sel' : '') + (works ? ' am-w' : '') + '" data-act="agGoDay" data-date="' + k + '" aria-label="' + esc(A.fmtLong(k) + (n ? ': ' + n + ' turnos' : '')) + '"><span class="mc-n">' + A.parse(k).getDate() + '</span>' + (n ? '<small class="mc-t">' + n + '</small>' : '') + '</button>';
    }
    return h + '</div></div>';
  }
  const addM = (m, n) => { const d = new Date(+m.slice(0, 4), +m.slice(5) - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  function months() {
    const m0 = S.calM || S.date.slice(0, 7);
    const sel = cur(), p = sel && A.PRO(sel);
    return '<div class="mc-head"><button class="btn small" data-act="agCalMon" data-n="-1" aria-label="Meses anteriores">‹</button><b>Calendario</b><button class="btn small" data-act="agCalMon" data-n="1" aria-label="Meses siguientes">›</button></div>' +
      (p ? '<div class="am-who"><b class="pdot" style="background:' + p.color + '"></b>' + esc(p.name) + '</div>' : '') +
      '<div class="am-ms">' + [0, 1, 2].map(i => month(addM(m0, i))).join('') + '</div><div class="hint am-leg">Los días marcados son los que ' + (p ? 'atiende' : 'hay atención') + '. El número chico son los turnos.</div>';
  }

  const prevAgenda = A.render.agenda;
  A.render.agenda = () => {
    prevAgenda();
    if (S.uimode === 'atencion') return;
    const host = $('#view-agenda'); if (!host) return;
    const split = host.querySelector('.ag-split');
    if (split) {
      /* PC: tres columnas como en la referencia: profesionales | agenda | calendario de varios meses */
      const side = split.querySelector('.ag-side'); if (side) { side.innerHTML = months(); side.classList.add('am-side'); }
      if (many()) {
        split.classList.add('has-pros');
        const left = document.createElement('aside'); left.className = 'ag-left card'; left.innerHTML = proList(true); split.insertBefore(left, split.firstChild);
        const pf = host.querySelector('details.pro-filter[data-key="pros"]'); if (pf) pf.hidden = true;
      }
      return;
    }
    /* celular y pantallas chicas: fila de profesionales para tocar, arriba de la agenda */
    if (!many()) return;
    const anchor = host.querySelector('.ds-wrap') || host.querySelector('#dayStrip');
    const pf = host.querySelector('details.pro-filter[data-key="pros"]'); if (pf) pf.hidden = true;
    if (anchor) anchor.insertAdjacentHTML('beforebegin', proList(false));
  };

  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '.ag-split.has-pros{grid-template-columns:210px minmax(0,1fr) 270px}.ag-left{position:sticky;top:70px;padding:10px;order:0;max-height:calc(100vh - 90px);overflow:auto}.ag-split.has-pros .ag-main{order:1}.ag-split.has-pros .ag-side{order:2}' +
    '.ap-ttl{font:700 13px var(--f-display,inherit);color:var(--ink-2);text-transform:uppercase;letter-spacing:.06em;margin:2px 4px 8px}' +
    '.ap-list.v{display:flex;flex-direction:column;gap:4px}.ap-list.h{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0 6px;margin-bottom:4px}.ap-list.h::-webkit-scrollbar{display:none}' +
    '.ap-pro{display:flex;align-items:center;gap:10px;border:1px solid transparent;background:transparent;border-radius:12px;padding:8px;cursor:pointer;text-align:left;color:var(--ink);font:inherit;min-width:0}.ap-pro:hover{background:var(--surface-2)}' +
    '.ap-pro.on{background:var(--accent-soft);border-color:var(--accent)}.ap-pro.ap-off .ap-av{opacity:.45}' +
    '.ap-av{flex:0 0 auto;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--c) 18%,var(--surface));color:var(--c);border:2px solid var(--c);font:800 14px var(--f-display,inherit)}' +
    '.ap-tx{display:flex;flex-direction:column;min-width:0}.ap-tx b{font-size:14px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ap-tx small{font-size:12px;color:var(--ink-2)}' +
    '.ap-list.h .ap-pro{flex:0 0 auto;flex-direction:column;gap:3px;padding:6px 8px;width:76px;text-align:center;border-color:var(--line);background:var(--surface)}.ap-list.h .ap-pro.on{background:var(--accent-soft);border-color:var(--accent)}.ap-list.h .ap-tx{align-items:center;width:100%}.ap-list.h .ap-tx b{font-size:11.5px;max-width:100%}.ap-list.h .ap-tx small{font-size:10.5px}.ap-list.h .ap-av{width:36px;height:36px;font-size:13px}' +
    '.am-side .am-ms{display:flex;flex-direction:column;gap:12px}.am-t{font:700 14px var(--f-display,inherit);text-align:center;margin-bottom:4px}.am-who{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink-2)}.am-blank{visibility:hidden}' +
    '.am-side .mc-d.am-w{background:var(--accent-soft)}.am-side .mc-d.sel{outline:2px solid var(--accent)}.am-leg{font-size:12px}' +
    '@media (max-width:1280px){.ag-split.has-pros{grid-template-columns:190px minmax(0,1fr) 240px}}' +
    '</style>');
})();
