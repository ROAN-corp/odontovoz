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
  /* 1.36: días en que normalmente se atiende pero no hay agenda (feriado/cierre, vacaciones o agenda cancelada) */
  const normalDay = (p, k) => { const dw = A.dow(k); if ((A.CFG.days || []).indexOf(dw) < 0) return false; return (p.extra || []).some(x => x.d === k) || (p.sched && (p.sched[dw] || []).length > 0); };
  const offWhy = (p, k) => {
    if (!normalDay(p, k)) return '';
    const c = A.closedOn && A.closedOn(k); if (c) return c.why || 'Cerrado';
    const v = A.vacOn && A.vacOn(p, k); if (v) return v.why || 'Vacaciones';
    if (A.day(k).some(a => a.type === 'block' && a.dayOff && a.pro === p.id)) return 'Agenda cancelada';
    return '';
  };
  A.offWhy = offWhy;
  function month(m0) {
    const first = m0 + '-01', d0 = A.parse(first), today = A.today(), sel = cur();
    const pros = sel ? A.visPros().filter(p => p.id === sel) : A.visPros();
    const start = A.add(first, -((d0.getDay() + 6) % 7));
    let h = '<div class="am-m"><div class="am-t">' + esc(A.cap(d0.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }))) + '</div><div class="mc-grid">' + ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'].map(x => '<span class="mc-dw">' + x + '</span>').join('');
    for (let i = 0; i < 42; i++) {
      const k = A.add(start, i), out = k.slice(0, 7) !== m0; if (i >= 35 && out) break;
      if (out) { h += '<span class="mc-d out am-blank"></span>'; continue; }
      const n = A.day(k).filter(a => live(a) && pros.some(p => p.id === a.pro)).length;
      const works = pros.some(p => A.hoursFor(p, k).length), why = !works ? (pros.map(p => offWhy(p, k)).filter(Boolean)[0] || '') : '';
      h += '<button class="mc-d' + (k === today ? ' today' : '') + (k === S.date ? ' sel' : '') + (works ? ' am-w' : '') + (why ? ' am-off' : '') + (works && pros.length > 1 && pros.some(p => offWhy(p, k)) ? ' am-part' : '') + '" data-act="agGoDay" data-date="' + k + '"' + (why ? ' title="' + esc(why) + '"' : '') + ' aria-label="' + esc(A.fmtLong(k) + (n ? ': ' + n + ' turnos' : '') + (why ? ': sin atención (' + why + ')' : '')) + '"><span class="mc-n">' + A.parse(k).getDate() + '</span>' + (n ? '<small class="mc-t">' + n + '</small>' : '') + '</button>';
    }
    return h + '</div></div>';
  }
  const addM = (m, n) => { const d = new Date(+m.slice(0, 4), +m.slice(5) - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  function months() {
    const m0 = S.calM || S.date.slice(0, 7);
    const sel = cur(), p = sel && A.PRO(sel);
    const base = A.today().slice(0, 7), opts = []; for (let i = -1; i < 14; i++) { const mm = addM(base, i); opts.push('<option value="' + mm + '"' + (mm === m0 ? ' selected' : '') + '>' + esc(A.cap(A.MON[+mm.slice(5) - 1]) + ' ' + mm.slice(0, 4)) + '</option>'); }
    if (!opts.some(o => o.indexOf('value="' + m0 + '"') >= 0)) opts.unshift('<option value="' + m0 + '" selected>' + esc(A.cap(A.MON[+m0.slice(5) - 1]) + ' ' + m0.slice(0, 4)) + '</option>');
    return '<div class="mc-head"><button class="btn small" data-act="agCalMon" data-n="-1" aria-label="Meses anteriores">‹</button><label class="mc-jump"><span class="sr">Ir a un mes</span><i aria-hidden="true">📅</i><select data-chg="agCalJump" aria-label="Ir a un mes">' + opts.join('') + '</select></label><button class="btn small" data-act="agCalMon" data-n="1" aria-label="Meses siguientes">›</button></div>' +
      (p ? '<div class="am-who"><b class="pdot" style="background:' + p.color + '"></b>' + esc(p.name) + '</div>' : '') +
      '<div class="am-leg"><span><i class="lg lg-w"></i>' + (p ? 'Atiende' : 'Hay atención') + '</span><span><i class="lg lg-o"></i>Sin atención</span><span><i class="lg lg-t"></i>Hoy</span><span class="lg-n">Rojo: vacaciones, feriado o agenda cancelada · número chico: turnos</span></div><div class="am-ms">' + [0, 1, 2].map(i => month(addM(m0, i))).join('') + '</div>';
  }

  A.chg.agCalJump = el => { S.calM = el.value; A.render.agenda(); };
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
    '.am-side{background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 7%,var(--surface)),var(--surface))!important;border:1px solid color-mix(in srgb,var(--accent) 18%,var(--line))!important;border-radius:20px!important;padding:14px!important;box-shadow:0 6px 22px rgba(8,20,24,.07)}' +
    '.am-side .mc-head{margin-bottom:8px}.am-side .mc-head b{font:800 16px var(--f-display,inherit);display:flex;align-items:center;gap:6px}.am-side .mc-head b i{font-style:normal}.am-side .mc-head .btn{border-radius:50%;width:32px;height:32px;padding:0;display:grid;place-items:center;font-size:18px;line-height:1}' +
    '.am-side .am-m{background:var(--surface);border:1px solid color-mix(in srgb,var(--accent) 12%,var(--line));border-radius:16px;padding:10px 8px 8px}' +
    '.am-side .am-t{font:800 14px var(--f-display,inherit);color:var(--accent);letter-spacing:.02em;margin-bottom:6px}' +
    '.am-side .mc-grid{gap:3px}.am-side .mc-dw{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-2);opacity:.8}' +
    '.am-side .mc-d{border-radius:10px;transition:transform .12s,background .12s}.am-side .mc-d:hover{transform:scale(1.08);background:var(--surface-2)}' +
    '.am-side .mc-d.am-w{background:color-mix(in srgb,var(--ok) 15%,var(--surface));color:color-mix(in srgb,var(--ok) 55%,var(--ink));font-weight:700}' +
    '.am-side .mc-d.am-off{background:color-mix(in srgb,var(--red) 13%,var(--surface));color:color-mix(in srgb,var(--red) 60%,var(--ink));font-weight:700;background-image:repeating-linear-gradient(135deg,transparent 0 5px,color-mix(in srgb,var(--red) 10%,transparent) 5px 6px)}' +
    '.am-side .mc-d.today{box-shadow:inset 0 0 0 2px var(--accent)}.am-side .mc-d.sel{outline:none;background:var(--accent);color:var(--accent-ink);box-shadow:0 4px 12px color-mix(in srgb,var(--accent) 40%,transparent)}.am-side .mc-d.sel .mc-t{color:inherit}' +
    '.am-side .mc-d.am-part::after{content:"";position:absolute;top:3px;right:4px;width:6px;height:6px;border-radius:50%;background:var(--red)}.am-side{max-height:calc(100vh - 86px);overflow-y:auto}.am-leg{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:11.5px;color:var(--ink-2);margin:0 0 10px;padding-bottom:8px;border-bottom:1px dashed var(--line)}.am-leg span{display:inline-flex;align-items:center;gap:5px}.am-leg .lg{width:12px;height:12px;border-radius:4px;display:inline-block}.am-leg .lg-w{background:color-mix(in srgb,var(--ok) 35%,var(--surface))}.am-leg .lg-o{background:color-mix(in srgb,var(--red) 35%,var(--surface))}.am-leg .lg-t{box-shadow:inset 0 0 0 2px var(--accent)}.am-leg .lg-n{flex-basis:100%;font-size:9.5px;opacity:.85}' +
    '.am-side{--mcell:clamp(17px,calc((100vh - 395px) / 18),26px);padding:10px!important}.am-side .mc-head{margin-bottom:6px}.am-side .mc-head .btn{width:28px;height:28px;font-size:16px}' +
    '.mc-jump{flex:1;min-width:0;display:flex;align-items:center;gap:6px;border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));background:var(--surface);border-radius:999px;padding:0 6px 0 8px;margin:0 4px}.mc-jump i{font-style:normal;font-size:13px}.mc-jump select{flex:1;min-width:0;border:0;background:transparent;color:var(--ink);font:800 13px var(--f-display,inherit);padding:6px 0;cursor:pointer;appearance:auto}' +
    '.am-side .am-ms{gap:8px}.am-side .am-m{padding:6px 6px 5px;border-radius:14px}.am-side .am-t{font-size:12.5px;margin-bottom:3px}.am-side .mc-grid{gap:2px}.am-side .mc-dw{font-size:9px;padding:0}' +
    '.am-side .mc-d{min-height:var(--mcell);padding:0;align-items:center;justify-content:center;font-size:12px}.am-side .mc-d .mc-t{position:absolute;top:0;right:2px;font-size:8px;line-height:1;opacity:.75}' +
    '.am-leg{font-size:10.5px;margin:0 0 6px;padding-bottom:6px}.am-leg .lg{width:10px;height:10px}.am-side .am-who{font-size:12px;margin-bottom:4px}' +
    '@media (max-width:1280px){.ag-split.has-pros{grid-template-columns:190px minmax(0,1fr) 240px}}' +
    '</style>');
})();
