/* ===== 1.16: botón Atrás a la pantalla anterior (no a cada pestaña que se tocó) y cuadros estadísticos optativos en Caja y Liquidaciones ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } } };

  /* =====================================================================
     1. ATRÁS: cada pantalla (Inicio, Agenda, Pacientes, la ficha de un paciente, Caja…) cuenta una vez.
        Cambiar de pestaña dentro de la ficha o de sección dentro de la caja no suma pasos.
     ===================================================================== */
  const NAV = A.nav;
  if (NAV) A.navRecord = () => {
    if (NAV.restoring) return;
    const k = S.tab + (S.tab === 'ficha' ? '|' + S.fichaPid : '');
    const it = { k, tab: S.tab, fichaPid: S.fichaPid, fichaTab: S.fichaTab, sub: S.caja && S.caja.sub };
    if (S.tab === 'inicio') { NAV.stack = [it]; return; }
    const i = NAV.stack.findIndex(x => x.k === k);
    if (i >= 0) { NAV.stack.splice(i + 1); NAV.stack[i] = it; return; }   /* volver a una pantalla ya visitada corta la vuelta */
    NAV.stack.push(it);
    if (NAV.stack.length > 30) NAV.stack.splice(0, NAV.stack.length - 30);
  };

  /* =====================================================================
     2. CUADROS ESTADÍSTICOS (optativos, cada equipo decide)
     ===================================================================== */
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const ym = d => String(d || '').slice(0, 7);
  const curM = () => S._ovcM || A.today().slice(0, 7);
  const shift = (m, n) => { const y = +m.slice(0, 4), mo = +m.slice(5, 7) - 1 + n, d = new Date(y, mo, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const mName = m => MES[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
  const money = n => A.money(Math.round(n));
  const short = n => n >= 1e6 ? (Math.round(n / 1e5) / 10).toString().replace('.', ',') + ' M' : n >= 1e3 ? Math.round(n / 1e3) + ' mil' : String(Math.round(n));
  const proName = id => { const p = A.PRO && A.PRO(id); return p ? (p.short || p.name) : 'Sin profesional'; };
  const isOn = v => LS.get('odontovoz.charts.' + v, '0') === '1';

  /* todos los movimientos (con caché corto para no recorrer todo en cada dibujo) */
  let cache = null, cacheAt = 0;
  function rows() {
    if (cache && Date.now() - cacheAt < 4000) return cache;
    const out = [];
    (A.allPids ? A.allPids() : []).forEach(pid => {
      const pd = A.pd(pid); if (!pd || !pd.ledger) return;
      const pat = A.PAT(pid) || {};
      pd.ledger.forEach(e => { if (e && e.date && (e.type === 'pago' || e.type === 'cargo')) out.push({ t: e.type, d: e.date, a: +e.amount || 0, m: e.method || 'Sin indicar', p: e.pro || pat.pro || '', desc: e.desc || '' }); });
    });
    cache = out; cacheAt = Date.now(); return out;
  }
  const sum = (L, f) => L.reduce((t, x) => t + f(x), 0);
  const group = (L, key) => { const g = {}; L.forEach(x => { const k = key(x); g[k] = (g[k] || 0) + x.a; }); return Object.keys(g).map(k => ({ k, v: g[k] })).sort((a, b) => b.v - a.v); };

  /* ---------- dibujos (SVG, colores del tema) ---------- */
  const COLS = ['var(--accent)', 'var(--ok)', 'var(--warn)', 'var(--red)', 'var(--ink-2)', 'color-mix(in srgb, var(--accent) 55%, var(--surface))'];
  function vbars(vals, labels, hi) {
    const W = 600, H = 170, max = Math.max(1, ...vals), bw = W / vals.length;
    let s = '<svg class="ovc-svg" viewBox="0 0 ' + W + ' ' + (H + 22) + '" preserveAspectRatio="none" role="img" aria-label="Gráfico de barras">';
    [0.5, 1].forEach(f => { s += '<line x1="0" x2="' + W + '" y1="' + (H - H * f) + '" y2="' + (H - H * f) + '" stroke="var(--line)" stroke-dasharray="3 4"/>'; });
    vals.forEach((v, i) => {
      const h = v ? Math.max(2, H * v / max) : 0, x = i * bw + bw * 0.15;
      s += '<rect x="' + x + '" y="' + (H - h) + '" width="' + bw * 0.7 + '" height="' + h + '" rx="3" fill="' + (i === hi ? 'var(--warn)' : 'var(--accent)') + '"><title>' + esc(labels[i]) + ': ' + money(v) + '</title></rect>';
      if (vals.length <= 12 || i % 5 === 0 || i === vals.length - 1) s += '<text x="' + (i * bw + bw / 2) + '" y="' + (H + 16) + '" text-anchor="middle" font-size="12" fill="var(--ink-2)">' + esc(String(labels[i]).slice(0, 3)) + '</text>';
    });
    return s + '</svg><div class="ovc-max">máx. ' + money(max) + '</div>';
  }
  function hbars(list, total, two) {
    if (!list.length) return '<p class="ovc-empty">Sin datos en este mes.</p>';
    const max = Math.max(1, ...list.map(x => Math.max(x.v, x.v2 || 0)));
    return '<div class="ovc-hb">' + list.slice(0, 7).map((x, i) => '<div class="ovc-hr"><span class="ovc-hl" title="' + esc(x.k) + '">' + esc(x.k) + '</span><span class="ovc-ht">' +
      '<i style="width:' + (100 * x.v / max) + '%;background:' + (two ? 'var(--accent)' : COLS[i % COLS.length]) + '"></i>' + (two ? '<i class="ovc-b2" style="width:' + (100 * (x.v2 || 0) / max) + '%"></i>' : '') +
      '</span><b>' + (two ? short(x.v) + ' / ' + short(x.v2 || 0) : money(x.v) + (total ? ' <small>' + Math.round(100 * x.v / total) + '%</small>' : '')) + '</b></div>').join('') + '</div>';
  }
  const kpi = (lbl, val, sub, cls) => '<div class="ovc-k' + (cls ? ' ' + cls : '') + '"><small>' + lbl + '</small><b>' + val + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>';
  const card = (t, body) => '<section class="ovc-c"><h4>' + esc(t) + '</h4>' + body + '</section>';
  const pct = (a, b) => b ? (a >= b ? '▲ ' : '▼ ') + Math.abs(Math.round(100 * (a - b) / b)) + '% vs. mes anterior' : '';

  function cajaHTML(m) {
    const L = rows(), pagos = L.filter(x => x.t === 'pago' && ym(x.d) === m), prev = L.filter(x => x.t === 'pago' && ym(x.d) === shift(m, -1));
    const tot = sum(pagos, x => x.a), tprev = sum(prev, x => x.a);
    const days = new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate(), per = Array(days).fill(0);
    pagos.forEach(x => { per[+x.d.slice(8, 10) - 1] += x.a; });
    const hoy = A.today(), hi = ym(hoy) === m ? +hoy.slice(8, 10) - 1 : -1;
    return '<div class="ovc-ks">' + kpi('Cobrado en el mes', money(tot), pct(tot, tprev), tot >= tprev ? 'up' : 'down') + kpi('Cobros', String(pagos.length)) + kpi('Promedio por cobro', pagos.length ? money(tot / pagos.length) : '—') + '</div>' +
      '<div class="ovc-grid">' + card('Cobrado por día', vbars(per, per.map((_, i) => String(i + 1)), hi)) +
      card('Por medio de pago', hbars(group(pagos, x => x.m), tot)) + card('Por profesional', hbars(group(pagos, x => proName(x.p)), tot)) + '</div>';
  }
  function liqHTML(m) {
    const L = rows(), inM = L.filter(x => ym(x.d) === m);
    const prod = group(inM.filter(x => x.t === 'cargo'), x => proName(x.p)), cob = group(inM.filter(x => x.t === 'pago'), x => proName(x.p));
    const names = Array.from(new Set(prod.map(x => x.k).concat(cob.map(x => x.k))));
    const both = names.map(k => ({ k, v: (prod.filter(x => x.k === k)[0] || {}).v || 0, v2: (cob.filter(x => x.k === k)[0] || {}).v || 0 })).sort((a, b) => b.v - a.v);
    const prac = group(inM.filter(x => x.t === 'cargo' && x.desc !== 'Saldo anterior'), x => String(x.desc).split(' · ')[0].replace(/\s*\(.*$/, '').trim() || 'Otra');
    const six = []; for (let i = 5; i >= 0; i--) { const mm = shift(m, -i); six.push({ m: mm, v: sum(L.filter(x => x.t === 'pago' && ym(x.d) === mm), x => x.a) }); }
    const tp = sum(inM.filter(x => x.t === 'cargo'), x => x.a), tc = sum(inM.filter(x => x.t === 'pago'), x => x.a);
    return '<div class="ovc-ks">' + kpi('Producción del mes', money(tp)) + kpi('Cobrado del mes', money(tc)) + (tp >= tc ? kpi('Falta cobrar', money(tp - tc), 'de lo producido en el mes', tp > tc ? 'down' : 'up') : kpi('Entró de más', money(tc - tp), 'cobros de trabajos anteriores', 'up')) + '</div>' +
      '<div class="ovc-grid">' + card('Producción / cobrado por profesional', '<div class="ovc-leg"><i></i>producción <i class="ovc-b2"></i>cobrado</div>' + hbars(both, 0, true)) +
      card('Prácticas que más facturaron', hbars(prac, tp)) + card('Cobrado en los últimos 6 meses', vbars(six.map(x => x.v), six.map(x => MES[+x.m.slice(5, 7) - 1]), 5)) + '</div>';
  }

  /* ---------- montaje en Caja y Liquidaciones ---------- */
  const VIEWS = { caja: cajaHTML, liq: liqHTML };
  function mount(v) {
    const host = document.getElementById('view-' + v); if (!host || host.hidden || S.tab !== v) return;
    let w = host.querySelector(':scope > .ovc-wrap');
    if (!w) {
      w = document.createElement('div'); w.className = 'ovc-wrap';
      const top = host.querySelector(':scope > .cash-top');
      if (top) top.after(w); else host.prepend(w);
    }
    const on = isOn(v), m = curM(), sig = v + on + m + (on ? rows().length : '');
    if (w.getAttribute('data-sig') === sig) return;
    w.setAttribute('data-sig', sig);
    w.innerHTML = '<div class="ovc-bar"><button class="ovc-tg" data-act="ovcToggle" data-v="' + v + '" aria-pressed="' + on + '">📊 ' + (on ? 'Ocultar gráficos' : 'Ver en gráficos') + '</button>' +
      (on ? '<span class="ovc-m"><button data-act="ovcMonth" data-n="-1" aria-label="Mes anterior">‹</button><b>' + esc(mName(m)) + '</b><button data-act="ovcMonth" data-n="1" aria-label="Mes siguiente"' + (m >= A.today().slice(0, 7) ? ' disabled' : '') + '>›</button></span>' : '') + '</div>' +
      (on ? '<div class="ovc-body">' + VIEWS[v](m) + '</div>' : '');
  }
  A.acts.ovcToggle = el => { const v = el.getAttribute('data-v'); LS.set('odontovoz.charts.' + v, isOn(v) ? '0' : '1'); cache = null; mount(v); };
  A.acts.ovcMonth = el => { S._ovcM = shift(curM(), +el.getAttribute('data-n')); if (S._ovcM > A.today().slice(0, 7)) S._ovcM = A.today().slice(0, 7); ['caja', 'liq'].forEach(mount); };
  const all = () => { ['caja', 'liq'].forEach(v => { try { mount(v); } catch (e) { /* nada */ } }); };
  const arPrev = A.afterRefresh;
  A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; all(); return r; };
  try { ['view-caja', 'view-liq'].forEach(id => { const el = document.getElementById(id); if (el) new MutationObserver(() => { const w = el.querySelector(':scope > .ovc-wrap'); if (!w) all(); }).observe(el, { childList: true }); }); } catch (e) { /* nada */ }

  const css = document.createElement('style');
  css.textContent = [
    '.ovc-wrap { margin: 0 0 12px; }',
    '.ovc-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }',
    '.ovc-tg { border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--line)); background: var(--surface); color: var(--accent); border-radius: 999px; padding: 7px 14px; font: 600 14px inherit; cursor: pointer; }',
    '.ovc-tg[aria-pressed="true"] { background: var(--accent-soft); }',
    '.ovc-m { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; } .ovc-m b { min-width: 130px; text-align: center; text-transform: capitalize; font-size: 14px; }',
    '.ovc-m button { width: 32px; height: 32px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font-size: 18px; cursor: pointer; } .ovc-m button:disabled { opacity: .35; cursor: default; }',
    '.ovc-body { margin-top: 10px; padding: 12px; border-radius: 18px; border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--line)); background: color-mix(in srgb, var(--accent) 4%, var(--surface)); }',
    '.ovc-ks { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }',
    '.ovc-k { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 14px; background: var(--surface); border: 1px solid var(--line); min-width: 0; }',
    '.ovc-k small { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-2); } .ovc-k b { font-size: 18px; font-variant-numeric: tabular-nums; } .ovc-k span { font-size: 12px; color: var(--ink-2); }',
    '.ovc-k.up span { color: var(--ok); } .ovc-k.down span { color: var(--red); }',
    '.ovc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 10px; }',
    '.ovc-c { padding: 12px; border-radius: 14px; background: var(--surface); border: 1px solid var(--line); min-width: 0; } .ovc-c h4 { margin: 0 0 8px; font-size: 14px; }',
    '.ovc-svg { width: 100%; height: 180px; display: block; } .ovc-max { font-size: 11.5px; color: var(--ink-2); text-align: right; }',
    '.ovc-hb { display: flex; flex-direction: column; gap: 7px; }',
    '.ovc-hr { display: grid; grid-template-columns: minmax(70px, 34%) 1fr auto; align-items: center; gap: 8px; font-size: 13px; }',
    '.ovc-hl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.ovc-ht { position: relative; height: 14px; border-radius: 7px; background: var(--surface-2); overflow: hidden; display: flex; flex-direction: column; }',
    '.ovc-ht i { display: block; height: 100%; border-radius: 7px; flex: 1; min-width: 2px; } .ovc-ht i.ovc-b2 { background: var(--ok); }',
    '.ovc-hr b { font-variant-numeric: tabular-nums; white-space: nowrap; } .ovc-hr small { color: var(--ink-2); font-weight: 500; }',
    '.ovc-leg { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-2); margin-bottom: 6px; } .ovc-leg i { width: 12px; height: 8px; border-radius: 3px; background: var(--accent); display: inline-block; } .ovc-leg i.ovc-b2 { background: var(--ok); margin-left: 8px; }',
    '.ovc-empty { color: var(--ink-2); font-size: 13px; margin: 4px 0; }',
    '@media (max-width: 520px) { .ovc-ks { grid-template-columns: 1fr 1fr; } .ovc-k b { font-size: 16px; } .ovc-m { margin-left: 0; } }'
  ].join('\n');
  document.head.appendChild(css);
})();
