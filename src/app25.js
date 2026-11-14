/* ===== 1.17: «Mi plan» con botón para mejorarlo, y alquiler de módulos en las liquidaciones (por hora, por turno, por día o porcentaje + módulo) ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, CL = A.cloud;

  /* ---------------------------------------------------------------
     MI PLAN Y MEJORAR PLAN
     --------------------------------------------------------------- */
  /* precios en dólares; en pesos se calculan con el dólar de referencia (mantener igual que en sitio/index.html y sitio/terminos.html) */
  const DOLAR = 1570, USD = { lite: 17, basico: 17, consultorio: 35, centro: 35, empresa: 82, red: 82 }, USD_EXTRA = 3; /* 1.52: sin LITE; Consultorio y Centro unificados */
  const PRICE = {}; Object.keys(USD).forEach(k => { PRICE[k] = USD[k] * DOLAR; });
  A.PRICE_USD = USD; A.DOLAR = DOLAR;
  const DESC = {
    lite: '1 profesional, en uno o varios consultorios',
    basico: '1 profesional, en uno o varios consultorios',
    consultorio: 'Hasta 3 profesionales y 5 equipos, con recepción',
    centro: 'Hasta 3 profesionales y 5 equipos, con recepción. Profesional adicional (con un equipo más): USD 3',
    empresa: 'De 2 a 5 consultorios: personal, cajas, estadísticas y panel del dueño',
    red: 'De 2 a 5 consultorios: personal, cajas, estadísticas y panel del dueño'
  };
  const ORDER = ['basico', 'consultorio', 'empresa'];
  const pesos = n => '$' + Math.round(n).toLocaleString('es-AR');
  const myPlan = () => { const l = CL && CL.lic; return l && CL.session ? (l.plan || 'prueba') : null; };
  const planName = k => ((A.PLAN_INFO || {})[k] || {}).name || k;
  const trialLeft = () => { const l = CL && CL.lic; if (!l || !l.trial_until) return null; const d = Math.round((Date.parse(String(l.trial_until).slice(0, 10) + 'T12:00:00') - Date.parse(A.today() + 'T12:00:00')) / 86400000); return d >= 0 ? d : null; };
  const waLink = (plan) => {
    const sup = A.SUPPORT || {}, num = String([].concat(sup.whatsapp || [])[0] || '').replace(/\D/g, ''), mail = CL && CL.session && CL.session.user ? CL.session.user.email : '';
    const t = 'Hola, quiero ' + (plan ? 'el plan ' + planName(plan) + ' de OdontoVoz' : 'consultar por los planes de OdontoVoz') + '.' + (mail ? ' Mi cuenta: ' + mail : '');
    return num ? 'https://wa.me/' + num + '?text=' + encodeURIComponent(t) : 'mailto:' + (sup.email || 'somosroan@gmail.com') + '?subject=' + encodeURIComponent('Plan de OdontoVoz') + '&body=' + encodeURIComponent(t);
  };
  A.acts.planOpen = () => { if (A.hideDrawer) A.hideDrawer(); S.modal = { type: 'myPlan' }; A.renderModal(); };
  MF.myPlan = () => {
    const cur = myPlan(), left = trialLeft();
    let b = '';
    if (!cur) b += '<p>Estás usando OdontoVoz <b>sin cuenta</b> (modo prueba con datos de ejemplo). Creá tu cuenta gratis para probarla con tus pacientes: la prueba trae <b>todas las funciones</b>.</p>';
    else if (cur === 'prueba') b += '<div class="pl-now"><b>Prueba gratis</b><span>' + (left != null ? 'Te quedan ' + left + ' día' + (left === 1 ? '' : 's') + '. ' : '') + 'Tenés todas las funciones habilitadas. Cuando contrates, tu cuenta queda con el plan que elijas.</span></div>';
    else b += '<div class="pl-now"><b>Tu plan: ' + esc(planName(cur)) + '</b><span>' + esc(DESC[cur] || '') + '</span></div>';
    b += '<div class="pl-list">' + ORDER.map(k => {
      const on = k === cur, lower = cur && cur !== 'prueba' && ORDER.indexOf(k) < ORDER.indexOf(cur);
      return '<div class="pl-it' + (on ? ' on' : '') + '"><div><b>' + esc(planName(k)) + '</b><small>' + esc(DESC[k]) + '</small></div><div class="pl-pr">USD ' + USD[k] + '<small>≈ ' + pesos(PRICE[k]) + ' por mes</small>' + (k === 'basico' ? '<small>+ USD ' + USD_EXTRA + ' (≈ ' + pesos(USD_EXTRA * DOLAR) + ') por consultorio extra, con un equipo más</small>' : k === 'consultorio' ? '<small>+ USD ' + USD_EXTRA + ' (≈ ' + pesos(USD_EXTRA * DOLAR) + ') por profesional extra, con un equipo más</small>' : '') + '</div>' +
        (on ? '<span class="pl-tag">Tu plan</span>' : '<a class="btn small' + (lower ? '' : ' primary') + '" target="_blank" rel="noopener" href="' + esc(waLink(k)) + '">' + (lower ? 'Cambiar a este' : cur && cur !== 'prueba' ? 'Mejorar a este' : 'Quiero este') + '</a>') + '</div>';
    }).join('') + '</div><p class="hint">El cambio de plan lo hacemos nosotros por WhatsApp, en el momento. Precios en dólares, con su equivalente en pesos (USD 1 = ' + pesos(DOLAR) + '), IVA incluido. Abono mensual, sin permanencia.</p>';
    return A.modalShell('Mi plan', b, '<a class="btn" target="_blank" rel="noopener" href="' + esc(waLink(null)) + '">Consultar por WhatsApp</a><button class="btn primary" data-act="closeModal">Listo</button>');
  };
  /* botón en el menú, en «Tu cuenta» */
  const anchor = document.querySelector('#gearMenu #drAcct');
  if (anchor && !$('#drPlan')) anchor.insertAdjacentHTML('afterend', '<button class="dnav" id="drPlan" data-act="planOpen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l3 6.5 7 .9-5 4.9 1.2 7L12 18l-6.2 3.3L7 14.3 2 9.4l7-.9z"/></svg><span>Mi plan<small id="drPlanTxt">Mejorar plan</small></span></button>');
  const prevAfter = A.afterRefresh;
  A.afterRefresh = () => {
    if (prevAfter) prevAfter();
    const t = $('#drPlanTxt'); if (!t) return; const cur = myPlan(), left = trialLeft();
    t.textContent = !cur ? 'Ver planes' : cur === 'prueba' ? 'Prueba gratis' + (left != null ? ' · ' + left + ' días' : '') + ' · elegir plan' : planName(cur) + (cur !== 'red' && cur !== 'empresa' ? ' · mejorar plan' : '');
  };

  /* ---------------------------------------------------------------
     ALQUILER DE MÓDULOS EN LAS LIQUIDACIONES
     Forma de trabajo de cada profesional:
       pct    = cobra un porcentaje de lo que factura (como hasta ahora)
       mod    = se queda con lo que factura y paga el módulo al centro
       pctmod = cobra su porcentaje y además paga el módulo
     El módulo se cobra por hora atendida, por turno o por día trabajado.
     --------------------------------------------------------------- */
  const MODES = [['pct', 'Porcentaje de lo que factura'], ['mod', 'Alquila un módulo (se queda con lo que factura)'], ['pctmod', 'Porcentaje + módulo']];
  const BY = [['hora', 'por hora', 'hora', 'horas'], ['turno', 'por turno', 'turno', 'turnos'], ['dia', 'por día', 'día', 'días']];
  const byInfo = k => BY.filter(x => x[0] === k)[0] || BY[0];
  const modeOf = pid => { const c = A.liqCfg(pid); return c.mode || 'pct'; };
  /* lo que trabajó en el mes según la agenda: horas, turnos y días */
  A.liqUse = (pid, m) => {
    let mins = 0, n = 0; const days = {};
    const [y, mo] = m.split('-').map(Number), last = new Date(y, mo, 0).getDate(), today = A.today();
    for (let d = 1; d <= last; d++) {
      const k = m + '-' + String(d).padStart(2, '0'); if (k > today) break; /* lo que ya pasó: lo agendado a futuro todavía no se trabajó */
      A.day(k).forEach(a => { if (a.pro !== pid || a.type === 'block' || a.status === 'cancelado' || a.status === 'ausente') return; mins += a.dur; n++; days[k] = 1; });
    }
    return { hora: Math.round(mins / 6) / 10, turno: n, dia: Object.keys(days).length };
  };
  const prevPct = A.liqPctFor;
  A.liqPctFor = (pid, line) => (modeOf(pid) === 'mod' ? { pct: 100, why: 'alquila módulo' } : prevPct(pid, line));
  const prevCalc = A.liqCalc;
  A.liqCalc = (pid, m) => {
    const c = prevCalc(pid, m), cfg = A.liqCfg(pid), mode = cfg.mode || 'pct';
    if (mode === 'pct' || !cfg.mod || !(cfg.mod.price > 0)) return c;
    const by = byInfo(cfg.mod.by), u = A.liqUse(pid, m)[by[0]], fee = Math.round(u * cfg.mod.price);
    if (!fee) return c;
    const line = { id: 'modulo', auto: true, desc: 'Alquiler de módulo: ' + String(u).replace('.', ',') + ' ' + (u === 1 ? by[2] : by[3]) + ' × ' + A.money(cfg.mod.price), amount: fee };
    c.deds = [line].concat(c.deds); c.ded += fee; c.net = c.dent - c.ded; c.center += fee; c.modFee = fee;
    return c;
  };

  const prevLiq = A.render.liq;
  A.render.liq = () => {
    prevLiq();
    const pid = S.liq.pro && S.liq.pro !== 'all' ? S.liq.pro : null; if (!pid) return;
    const sec = Array.prototype.slice.call(document.querySelectorAll('#view-liq section.card')).filter(s => /^Porcentajes de/.test((s.querySelector('h2') || {}).textContent || ''))[0];
    if (!sec) return;
    const cfg = A.liqCfg(pid), mode = cfg.mode || 'pct', mod = cfg.mod || { by: 'hora', price: 0 }, m = A.liqMonth(), use = A.liqUse(pid, m), by = byInfo(mod.by);
    const fee = Math.round(use[by[0]] * (mod.price || 0));
    let h = '<div class="lm-box"><div class="field"><label for="lqMode">Cómo trabaja</label><select id="lqMode" data-chg="liqMode">' + MODES.map(x => '<option value="' + x[0] + '"' + (x[0] === mode ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></div>';
    if (mode !== 'pct') {
      h += '<div class="row2"><div class="field"><label for="lqModBy">El módulo se cobra</label><select id="lqModBy" data-chg="liqModBy">' + BY.map(x => '<option value="' + x[0] + '"' + (x[0] === by[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="lqModPrice">Valor ' + by[1] + '</label><input id="lqModPrice" inputmode="numeric" data-chg="liqModPrice" value="' + (mod.price || '') + '" placeholder="Ej.: 8000"></div></div>' +
        '<div class="lm-use">En ' + esc(A.liqMonthName(m)) + ' según la agenda: <b>' + String(use.hora).replace('.', ',') + ' h</b> · <b>' + use.turno + '</b> turnos · <b>' + use.dia + '</b> días.' + (mod.price ? ' Módulo del mes: <b>' + A.money(fee) + '</b>.' : ' Cargá el valor para calcularlo.') + '</div>' +
        '<div class="hint">' + (mode === 'mod' ? 'El profesional se queda con todo lo que factura y le paga el módulo al centro; se descuenta solo en su liquidación.' : 'El profesional cobra su porcentaje y además paga el módulo, que se descuenta solo en su liquidación.') + ' Cuenta los turnos hasta hoy que no se cancelaron ni faltaron.</div>';
    }
    h += '</div>';
    const h2 = sec.querySelector('h2'); h2.textContent = (mode === 'mod' ? 'Forma de trabajo de ' : 'Porcentajes de ') + A.PRO(pid).short;
    h2.insertAdjacentHTML('afterend', h);
    if (mode === 'mod') Array.prototype.slice.call(sec.children).forEach(ch => { if (!ch.classList.contains('lm-box') && ch.tagName !== 'H2') ch.hidden = true; });
    /* la línea del módulo es automática: no se borra a mano */
    document.querySelectorAll('#view-liq [data-act="liqDedDel"][data-id="modulo"]').forEach(b => { b.replaceWith(Object.assign(document.createElement('span'), { className: 'chip', textContent: 'automático' })); });
  };
  A.chg.liqMode = el => { const c = A.liqCfg(S.liq.pro); c.mode = el.value; if (el.value !== 'pct') c.mod = c.mod || { by: 'hora', price: 0 }; A.save(); A.refresh(); };
  A.chg.liqModBy = el => { const c = A.liqCfg(S.liq.pro); c.mod = c.mod || {}; c.mod.by = el.value; A.save(); A.refresh(); };
  A.chg.liqModPrice = el => { const c = A.liqCfg(S.liq.pro); c.mod = c.mod || { by: 'hora' }; c.mod.price = parseInt(String(el.value).replace(/\D/g, ''), 10) || 0; A.save(); A.refresh(); };

  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '#drPlan span{display:flex;flex-direction:column;align-items:flex-start}#drPlan small{font-size:12px;color:var(--accent);font-weight:600}' +
    '.pl-now{border:2px solid var(--accent);background:var(--accent-soft);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;margin-bottom:12px}.pl-now span{font-size:14px;color:var(--ink-2)}' +
    '.pl-list{display:flex;flex-direction:column;gap:8px}.pl-it{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:10px 12px}.pl-it.on{border-color:var(--accent)}.pl-it small{display:block;color:var(--ink-2);font-size:13px}' +
    '.pl-pr{font:700 16px var(--f-mono,inherit);text-align:right}.pl-pr small{font:400 11px inherit}.pl-tag{font-size:12px;font-weight:700;color:var(--accent)}' +
    '@media (max-width:520px){.pl-it{grid-template-columns:1fr auto}.pl-it .btn,.pl-it .pl-tag{grid-column:1/-1;justify-self:start}}' +
    '.lm-box{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:8px 0 12px;background:var(--surface-2,transparent)}.lm-use{font-size:14px;margin:6px 0}' +
    '</style>');
})();
