/* ===== 1.37: inicio más simple (fila de íconos chicos arriba) y tema claro por defecto, con cambio automático de día y de noche ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, MF = A.modalFns, esc = A.esc;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } } };

  /* ---------- inicio: accesos como íconos chicos debajo del saludo ---------- */
  const SHORT = { searchToggle: 'Buscar paciente', 'tab:agenda': 'Agenda', cfgOpen: 'Ajustes', newPatient: 'Paciente nuevo', gear: 'Menú', handsFree: 'Asistente', newAppt: 'Dar turno', 'tab:pacientes': 'Pacientes', 'tab:caja': 'Caja', labAllOpen: 'Laboratorio', tnOpen: 'Turnero', remNew: 'Recordatorio', jrOpen: 'Cambios' };
  function homeIcons() {
    if (S.tab !== 'inicio' || (A.liteOn && A.liteOn())) return;
    const v = $('#view-inicio'), wrap = v && v.querySelector('.home-actions'), hi = v && v.querySelector('.home-hi'); if (!wrap) return;
    if (hi && hi.nextElementSibling !== wrap && !wrap.classList.contains('editing')) hi.insertAdjacentElement('afterend', wrap);
    wrap.classList.add('icons'); wrap.style.setProperty('--hk', Math.min(6, wrap.querySelectorAll('.ha').length) || 5);
    const nw = v.querySelector('.home-new'); if (nw) nw.hidden = !!v.querySelector('.hd-card [data-act="newAppt"]');
    const lt = v.querySelector('.lt-try'); if (lt && hi && lt.parentNode !== hi) hi.appendChild(lt);
    wrap.querySelectorAll('.ha').forEach(b => {
      const act = b.getAttribute('data-act'), key = act === 'tab' ? 'tab:' + b.getAttribute('data-tab') : act, sp = b.querySelector('span');
      if (!sp || sp.getAttribute('data-short')) return;
      const full = sp.childNodes[0] ? sp.childNodes[0].textContent : sp.textContent, t = SHORT[key] || full;
      b.setAttribute('aria-label', full); b.title = full;
      sp.setAttribute('data-short', '1'); sp.textContent = t;
    });
  }

  /* ---------- tema: claro por defecto; oscuro, día y noche, o como el celular ---------- */
  const KEY = 'odontovoz.theme', NIGHT = 'odontovoz.themeNight';
  const mode = () => { const m = LS.get(KEY, ''); if (m) return m; return S.theme === 'dark' ? 'dark' : 'light'; };
  const night = () => { const p = String(LS.get(NIGHT, '20-7')).split('-').map(Number); return { from: isFinite(p[0]) ? p[0] : 20, to: isFinite(p[1]) ? p[1] : 7 }; };
  const isNight = () => { const h = new Date().getHours(), n = night(); return n.from > n.to ? (h >= n.from || h < n.to) : (h >= n.from && h < n.to); };
  const applyPrev = A.applyTheme;
  A.applyTheme = function () {
    if (applyPrev) applyPrev.apply(this, arguments);
    const r = document.documentElement, m = mode();
    if (m === 'system') r.removeAttribute('data-theme');
    else r.setAttribute('data-theme', m === 'time' ? (isNight() ? 'dark' : 'light') : m);
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', r.getAttribute('data-theme') === 'dark' || (!r.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches) ? '#0d1416' : '#ffffff');
  };
  /* revisar cada minuto, por si llegó la noche o la mañana */
  let lastNight = null;
  setInterval(() => { if (mode() !== 'time') return; const n = isNight(); if (n !== lastNight) { lastNight = n; A.applyTheme(); } }, 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && mode() === 'time') A.applyTheme(); });

  const setMode = m => { LS.set(KEY, m); S.theme = m === 'dark' ? 'dark' : m === 'light' ? 'light' : ''; A.applyTheme(); if (A.save) A.save(); };
  A.acts.thSet = el => { setMode(el.getAttribute('data-v')); A.renderModal(); };
  A.chg.thNight = el => { const f = ($('#thFrom') || {}).value, t = ($('#thTo') || {}).value; const pf = parseInt(f, 10), pt = parseInt(t, 10); LS.set(NIGHT, (isNaN(pf) ? 20 : pf) + '-' + (isNaN(pt) ? 7 : pt)); A.applyTheme(); };
  /* la voz («tema oscuro») sigue andando: se envuelve themeSet cuando ya existe (el arranque lo define después de los módulos) */
  function hookThemeSet() {
    const f = A.acts.themeSet; if (!f || f._ov) return;
    const w = function (el) { const v = el && el.getAttribute ? el.getAttribute('data-theme-set') : ''; LS.set(KEY, v === 'dark' ? 'dark' : v === 'light' ? 'light' : 'system'); return f.apply(this, arguments); };
    w._ov = true; A.acts.themeSet = w;
  }
  const hours = sel => Array.from({ length: 24 }, (_, h) => '<option value="' + h + '"' + (h === sel ? ' selected' : '') + '>' + String(h).padStart(2, '0') + ':00</option>').join('');
  const appearPrev = MF.appear;
  MF.appear = function () {
    let h = appearPrev.apply(this, arguments); const m = mode(), n = night();
    const opt = [['light', 'Claro'], ['dark', 'Oscuro'], ['time', 'Día y noche'], ['system', 'Como el celular']];
    const block = '<div class="opt"><div class="lbl">Tema</div><div class="seg th-seg" role="group" aria-label="Tema">' + opt.map(o => '<button data-act="thSet" data-v="' + o[0] + '" aria-pressed="' + (m === o[0]) + '">' + o[1] + '</button>').join('') + '</div>' +
      (m === 'time' ? '<div class="th-night"><span>Oscuro desde</span><label class="sr" for="thFrom">Hora en que empieza el modo oscuro</label><select id="thFrom" data-chg="thNight">' + hours(n.from) + '</select><span>hasta</span><label class="sr" for="thTo">Hora en que vuelve el modo claro</label><select id="thTo" data-chg="thNight">' + hours(n.to) + '</select></div><div class="hint">Usa la hora de este equipo. Ahora está en modo ' + (isNight() ? 'oscuro' : 'claro') + '.</div>'
        : m === 'system' ? '<div class="hint">Sigue lo que tenga elegido el celular o la computadora.</div>' : '') + '</div>';
    h = h.replace(/<div class="opt"><div class="lbl">Tema<\/div><div class="seg" role="group" aria-label="Tema">[\s\S]*?<\/div><\/div>/, block);
    return h;
  };

  const arPrev = A.afterRefresh;
  A.afterRefresh = function () {
    if (arPrev) arPrev.apply(this, arguments);
    hookThemeSet();
    try { homeIcons(); } catch (e) { /* nada */ }
  };
  /* aplicar al arrancar: claro salvo que se haya elegido otra cosa */
  setTimeout(() => { hookThemeSet(); A.applyTheme(); }, 0);

  const css = document.createElement('style');
  css.textContent = [
    '.home-actions.icons { display: grid; grid-template-columns: repeat(var(--hk, 5), minmax(0, 1fr)) !important; gap: 4px; margin: 4px 0 14px; }',
    '.home-hi { position: relative; padding-right: 56px; } .home-hi .lt-try { top: 0; right: 0; }',
    '.home-actions.icons .ha { flex-direction: column; justify-content: flex-start; align-items: center; gap: 6px; min-height: 0; padding: 8px 2px 6px; border: 0; background: transparent; box-shadow: none; text-align: center; font-weight: 600; }',
    '.home-actions.icons .ha svg { width: 24px; height: 24px; box-sizing: content-box; padding: 12px; border-radius: 16px; background: var(--surface); border: 1px solid var(--line); color: var(--accent); flex: none; }',
    '.home-actions.icons .ha:hover svg, .home-actions.icons .ha:focus-visible svg { border-color: var(--accent); }',
    '.home-actions.icons .ha span { font-size: 11px; line-height: 1.2; color: var(--ink-2); white-space: normal; overflow-wrap: anywhere; }',
    '.home-actions.icons .ha small { display: none; }',
    '.home-actions.icons .ha.ha-voice { background: transparent; }',
    '@media (min-width: 760px) { .home-actions.icons { max-width: 560px; } .home-actions.icons .ha span { font-size: 12px; } }',
    '.th-seg { flex-wrap: wrap; } .th-night { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 10px; font-size: 14px; } .th-night select { min-height: 40px; }'
  ].join('\n');
  document.head.appendChild(css);
})();
