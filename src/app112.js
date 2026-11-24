/* ===== 1.27.1: fecha de nacimiento en tres casilleros (día, mes y año) en lugar del calendario ===== */
(function () {
  'use strict';
  const A = window.App;
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const pad = n => String(n).padStart(2, '0');
  const today = () => (A.today ? A.today() : new Date().toISOString().slice(0, 10));
  const isBirth = el => {
    if (!el || el.type !== 'date' || el.dataset.bd3) return false;
    if (/birth|^npB$/i.test(el.id || '') || el.getAttribute('data-k') === 'birth') return true;
    const f = el.closest && el.closest('.field, label'); return !!(f && /nacimiento/i.test((f.querySelector('label, span') || f).textContent || ''));
  };
  const validIso = (d, m, y) => {
    if (!(d >= 1 && m >= 1 && m <= 12 && y >= 1900)) return '';
    const t = new Date(y, m - 1, d); if (t.getFullYear() !== y || t.getMonth() !== m - 1 || t.getDate() !== d) return '';
    const iso = y + '-' + pad(m) + '-' + pad(d); return iso <= today() ? iso : '';
  };
  const ageOf = iso => { const t = today(), a = +t.slice(0, 4) - +iso.slice(0, 4), md = t.slice(5) < iso.slice(5) ? 1 : 0; return a - md; };
  const year4 = v => { v = String(v).replace(/\D/g, ''); if (v.length === 2) { const yy = +today().slice(2, 4); return (+v > yy ? 1900 : 2000) + +v; } return v.length === 4 ? +v : 0; };

  function wrap(el) {
    el.dataset.bd3 = '1';
    const cls = el.className || '', lab = (el.closest('.field') || document).querySelector('label[for="' + el.id + '"]');
    const w = document.createElement('div'); w.className = 'bd3'; w.setAttribute('role', 'group'); w.setAttribute('aria-label', 'Fecha de nacimiento');
    const dl = 'bd3d' + Math.random().toString(36).slice(2, 7);
    w.innerHTML = '<input class="' + cls + ' bd3-d" inputmode="numeric" autocomplete="off" maxlength="2" placeholder="Día" aria-label="Día" list="' + dl + '">' +
      '<datalist id="' + dl + '">' + Array.from({ length: 31 }, (_, i) => '<option value="' + (i + 1) + '">').join('') + '</datalist>' +
      '<select class="' + cls + ' bd3-m" aria-label="Mes"><option value="">Mes</option>' + MESES.map((n, i) => '<option value="' + (i + 1) + '">' + n + '</option>').join('') + '</select>' +
      '<input class="' + cls + ' bd3-y" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="Año" aria-label="Año">' +
      '<span class="bd3-age" aria-live="polite"></span>';
    el.insertAdjacentElement('beforebegin', w); el.hidden = true; el.tabIndex = -1;
    if (lab) lab.addEventListener('click', e => { e.preventDefault(); w.querySelector('.bd3-d').focus(); });
    const D = w.querySelector('.bd3-d'), M = w.querySelector('.bd3-m'), Y = w.querySelector('.bd3-y'), ag = w.querySelector('.bd3-age');
    let mine = false;
    const fromIso = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); if (m) { D.value = String(+m[3]); M.value = String(+m[2]); Y.value = m[1]; ag.textContent = ageOf(iso) + ' años'; w.classList.remove('bad'); } else if (!iso) { D.value = ''; M.value = ''; Y.value = ''; ag.textContent = ''; w.classList.remove('bad'); } };
    const push = iso => { mine = true; el.value = iso; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); mine = false; };
    const read = (fin) => {
      const d = parseInt(D.value, 10) || 0, m = parseInt(M.value, 10) || 0, y = year4(Y.value);
      if (!D.value && !M.value && !Y.value) { w.classList.remove('bad'); ag.textContent = ''; if (el.value) push(''); return; }
      if (!(d && m && y)) { w.classList.toggle('bad', !!fin && !!(D.value || M.value || Y.value)); ag.textContent = fin ? 'Falta completar la fecha' : ''; return; }
      const iso = validIso(d, m, y);
      if (!iso) { w.classList.add('bad'); ag.textContent = 'Esa fecha no existe o es futura'; return; }
      w.classList.remove('bad'); ag.textContent = ageOf(iso) + ' años'; if (el.value !== iso) push(iso);
    };
    D.addEventListener('input', () => { D.value = D.value.replace(/\D/g, ''); const n = +D.value; if (D.value.length === 2 || n > 3) { if (n >= 1 && n <= 31 && !M.value) M.focus(); } read(false); });
    D.addEventListener('change', () => { D.value = String(parseInt(D.value, 10) || ''); if (+D.value >= 1 && !M.value) M.focus(); read(true); });
    M.addEventListener('change', () => { if (M.value && !Y.value) Y.focus(); read(true); });
    Y.addEventListener('input', () => { Y.value = Y.value.replace(/\D/g, '').slice(0, 4); read(false); });
    [D, Y].forEach(i => { i.addEventListener('blur', () => read(true)); i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); read(true); i.blur(); } }); });
    /* si otro módulo (la voz, la ficha) cambia la fecha, los casilleros la siguen */
    ['input', 'change'].forEach(ev => el.addEventListener(ev, () => { if (!mine) fromIso(el.value); }));
    fromIso(el.value);
  }
  const scan = root => { try { (root.querySelectorAll ? root : document).querySelectorAll('input[type="date"]').forEach(el => { if (isBirth(el)) wrap(el); }); } catch (e) { /* nada */ } };
  let pend = false;
  new MutationObserver(() => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; scan(document); }); }).observe(document.body, { childList: true, subtree: true });
  scan(document);
  const css = document.createElement('style');
  css.textContent = '.bd3{display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-width:0}.bd3 input,.bd3 select{min-width:0;margin:0}.bd3-d{flex:0 0 4.4em;width:4.4em;text-align:center}.bd3-m{flex:1 1 7.5em}.bd3-y{flex:0 0 5.2em;width:5.2em;text-align:center}' +
    '.bd3-age{flex:1 0 100%;font-size:.8rem;color:var(--ink-2);min-height:1em}.bd3.bad input,.bd3.bad select{border-color:var(--red)}.bd3.bad .bd3-age{color:var(--red)}';
  document.body.appendChild(css);
})();
