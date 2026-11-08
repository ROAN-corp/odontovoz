/* ===== 1.38.1: inicio sin «Menú» (Ajustes y Paciente nuevo en su lugar), formato de íconos siempre, y en la PC un panel con más información ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } } };

  /* ---------- pasar los accesos guardados al formato nuevo (una sola vez por equipo) ---------- */
  (function migrate() {
    if (LS.get('odontovoz.homeV', '') === '1381') return;
    try {
      let l = JSON.parse(LS.get('odontovoz.home', 'null'));
      if (Array.isArray(l) && l.length) {
        const i = l.indexOf('menu');
        if (i >= 0) { if (l.indexOf('ajustes') < 0) l[i] = 'ajustes'; else l.splice(i, 1); }
        else if (l.indexOf('ajustes') < 0) l.push('ajustes');
        if (l.indexOf('paciente') < 0) { const s = l.indexOf('search'); l.splice(s >= 0 ? s + 1 : 0, 0, 'paciente'); }
        LS.set('odontovoz.home', JSON.stringify(l.slice(0, 8)));
      }
    } catch (e) { /* nada */ }
    LS.set('odontovoz.homeV', '1381');
  })();

  /* ---------- PC: panel a la derecha con lo que viene, la semana y la plata ---------- */
  const wide = () => window.innerWidth >= 1100 && !(A.liteOn && A.liteOn());
  const role = () => { try { const m = A.memberNow && A.memberNow(); return m ? m.role : ''; } catch (e) { return ''; } };
  const canMoney = () => { const r = role(); return !r || r === 'admin'; };
  const hm = n => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  const DW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const apptsOf = k => (A.day(k) || []).filter(a => a.pid && a.type !== 'block' && a.status !== 'cancelado' && (!A.locKeep || A.locKeep(a)) && (!A.visPros || A.visPros().some(p => p && p.id === a.pro)));
  const money = n => A.money(n || 0);

  function sideHTML() {
    const t = A.today(), now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
    /* próximos turnos */
    const next = []; let k = t;
    for (let i = 0; i < 14 && next.length < 6; i++) {
      apptsOf(k).sort((a, b) => a.start - b.start).forEach(a => { if (next.length < 6 && (k > t || a.start + (a.dur || 30) > nowM) && a.status !== 'atendido' && a.status !== 'ausente') next.push({ k, a }); });
      k = A.add(k, 1);
    }
    const dayLbl = d => d === t ? 'Hoy' : d === A.add(t, 1) ? 'Mañana' : DW[new Date(d + 'T12:00').getDay()] + ' ' + +d.slice(8);
    let x = '<section class="hs-card"><h3>Próximos turnos</h3>' + (next.length ? '<ul class="hs-next">' + next.map(z => {
      const p = A.PAT(z.a.pid) || {}, pr = A.PRO ? A.PRO(z.a.pro) : null;
      return '<li><button data-act="hsGo" data-d="' + z.k + '"><span class="hs-when"><b>' + hm(z.a.start) + '</b><small>' + esc(dayLbl(z.k)) + '</small></span><span class="hs-who"><b>' + esc(p.name || z.a.name || 'Paciente') + '</b><small>' + esc([z.a.what, pr && pr.short].filter(Boolean).join(' · ')) + '</small></span></button></li>';
    }).join('') + '</ul>' : '<p class="hint">No hay turnos en los próximos días.</p>') + '</section>';
    /* la semana */
    const days = []; k = t; for (let i = 0; i < 7; i++) { days.push({ k, n: apptsOf(k).length }); k = A.add(k, 1); }
    const mx = Math.max(1, ...days.map(d => d.n));
    x += '<section class="hs-card"><h3>Los próximos 7 días</h3><div class="hs-week">' + days.map(d => '<button data-act="hsGo" data-d="' + d.k + '" title="' + d.n + ' turnos"><span class="hs-n">' + d.n + '</span><span class="hs-bar"><i style="height:' + Math.round(d.n / mx * 100) + '%"></i></span><small>' + (d.k === t ? 'Hoy' : DW[new Date(d.k + 'T12:00').getDay()]) + '</small></button>').join('') + '</div><p class="hint" style="margin:6px 0 0">' + days.reduce((s, d) => s + d.n, 0) + ' turnos en total</p></section>';
    /* la plata */
    if (canMoney() && A.dayControl) {
      let wk = 0, wp = 0; k = t; for (let i = 0; i < 7; i++) { const c = A.dayControl(k, null); wk += c.cob; wp += c.prod; k = A.add(k, -1); }
      const c0 = A.dayControl(t, null), pend = A.pcList ? A.pcList().length : 0;
      x += '<section class="hs-card"><h3>Caja</h3><div class="hs-money"><div><small>Cobrado hoy</small><b>' + money(c0.cob) + '</b></div><div><small>Últimos 7 días</small><b>' + money(wk) + '</b></div><div><small>Producción 7 días</small><b>' + money(wp) + '</b></div><div><small>Esperando cobro</small><b>' + pend + '</b></div></div><button class="btn small" data-act="hsCaja">Ir a la caja</button></section>';
    }
    /* pacientes */
    const pats = (A.PATS || []).filter(p => !p.prov), m = t.slice(0, 7);
    const nuevos = pats.filter(p => String(p.created || p.alta || '').slice(0, 7) === m).length;
    x += '<section class="hs-card"><h3>Pacientes</h3><div class="hs-money"><div><small>En total</small><b>' + pats.length + '</b></div>' + (nuevos ? '<div><small>Nuevos este mes</small><b>' + nuevos + '</b></div>' : '') + '</div><div class="row-btns"><button class="btn small" data-act="newPatient">+ Paciente nuevo</button><button class="btn small" data-act="tab" data-tab="pacientes">Ver todos</button></div></section>';
    return x;
  }
  A.acts.hsGo = el => { S.date = el.getAttribute('data-d'); S.tab = 'agenda'; S._dsEnter = true; A.refresh(); window.scrollTo(0, 0); };
  A.acts.hsCaja = () => { S.tab = 'caja'; A.refresh(); window.scrollTo(0, 0); };

  function side() {
    const v = $('#view-inicio'); if (!v) return;
    let s = v.querySelector(':scope > .hm-side');
    if (!wide() || S.tab !== 'inicio' || !v.querySelector(':scope > .home')) { if (s) s.remove(); v.classList.remove('hm-wide'); return; }
    if (!s) { s = document.createElement('aside'); s.className = 'hm-side'; s.setAttribute('aria-label', 'Resumen'); v.appendChild(s); }
    v.classList.add('hm-wide');
    const home = v.querySelector(':scope > .home');
    if (home) Array.from(v.children).reverse().forEach(c => { if (c !== home && c !== s) home.insertBefore(c, home.firstChild); });
    const h = sideHTML(); if (s._h !== h) { s.innerHTML = h; s._h = h; }
  }

  /* ---------- el inicio se puede dibujar sin pasar por afterRefresh: vigilarlo ---------- */
  let busy = false, tm = null;
  function fix() {
    if (busy || S.tab !== 'inicio') return; busy = true;
    try { if (A.homeMount) A.homeMount(); if (A.homeIcons) A.homeIcons(); side(); } catch (e) { /* nada */ }
    setTimeout(() => { busy = false; }, 0);
  }
  function watch() {
    const v = $('#view-inicio'); if (!v || v._hmObs) return; v._hmObs = true;
    new MutationObserver(() => { if (busy) return; clearTimeout(tm); tm = setTimeout(fix, 0); }).observe(v, { childList: true, subtree: true });
  }
  const arPrev = A.afterRefresh;
  A.afterRefresh = function () { if (arPrev) arPrev.apply(this, arguments); watch(); try { side(); } catch (e) { /* nada */ } };
  let rz = null; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (S.tab === 'inicio') fix(); }, 150); });
  setTimeout(watch, 0);

  const css = document.createElement('style');
  css.textContent = [
    '@media (min-width: 1100px) {',
    '  #view-inicio.hm-wide { display: flex; gap: 28px; justify-content: center; align-items: flex-start; }',
    '  #view-inicio.hm-wide > .home { flex: 1 1 auto; min-width: 0; max-width: 780px; margin: 0; }',
    '  #view-inicio.hm-wide > .hm-side { flex: 0 0 340px; position: sticky; top: 72px; display: flex; flex-direction: column; gap: 14px; padding-top: 14px; max-height: calc(100vh - 90px); overflow-y: auto; }',
    '}',
    '.hs-card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; }',
    '.hs-card h3 { font-size: 13px; text-transform: uppercase; letter-spacing: .07em; color: var(--ink-2); margin: 0 0 10px; }',
    '.hs-next { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }',
    '.hs-next button { display: flex; gap: 12px; align-items: center; width: 100%; padding: 8px 4px; border: 0; border-top: 1px solid var(--line); background: none; color: var(--ink); font: inherit; text-align: left; cursor: pointer; border-radius: 8px; }',
    '.hs-next li:first-child button { border-top: 0; } .hs-next button:hover { background: var(--bg); }',
    '.hs-when { flex: 0 0 58px; display: flex; flex-direction: column; } .hs-when b { font-size: 15px; } .hs-when small, .hs-who small { font-size: 12px; color: var(--ink-2); }',
    '.hs-who { flex: 1; min-width: 0; display: flex; flex-direction: column; } .hs-who b, .hs-who small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .hs-who b { font-weight: 600; font-size: 14.5px; }',
    '.hs-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }',
    '.hs-week button { display: flex; flex-direction: column; align-items: center; gap: 4px; border: 0; background: none; color: var(--ink); font: inherit; cursor: pointer; padding: 2px 0; border-radius: 8px; } .hs-week button:hover { background: var(--bg); }',
    '.hs-bar { width: 18px; height: 56px; border-radius: 6px; background: color-mix(in srgb, var(--accent) 12%, var(--surface)); display: flex; align-items: flex-end; overflow: hidden; } .hs-bar i { display: block; width: 100%; background: var(--accent); border-radius: 6px; }',
    '.hs-n { font-size: 12.5px; font-weight: 700; } .hs-week small { font-size: 11.5px; color: var(--ink-2); }',
    '.hs-money { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; } .hs-money > div { display: flex; flex-direction: column; } .hs-money small { font-size: 12px; color: var(--ink-2); } .hs-money b { font-size: 17px; }'
  ].join('\n');
  document.head.appendChild(css);
})();
