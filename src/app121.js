/* ===== 1.35: al escribir un control de ortodoncia en la evolución clínica se crea solo el control en la solapa Ortodoncia, con botón para agregar fotos ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, $ = q => document.querySelector(q);
  if (!A.touchPd || !A.render || !A.render.ficha || !A.imgAdd) return;
  const N = s => (A.norm ? A.norm(s) : String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
  const VIEWS = ['Frente', 'Sonrisa', 'Perfil', 'Intraoral frente', 'Intraoral derecha', 'Intraoral izquierda', 'Oclusal superior', 'Oclusal inferior', 'Otra'];

  /* ---------- ¿habla de un control de ortodoncia? ---------- */
  const STRONG = /\bcontrol(?:es)?\s+(?:de\s+|del\s+)?(?:la\s+)?(?:orto\w*|brackets?|aparat\w*|frenillos?|arcos?|alineadores?)\b|\bortodonci\w*\b|\bortodont\w*\b/;
  const PARTS = [/\barcos?\b/, /\bligadur\w*/, /\bcadena\s+elastic\w*/, /\bbrackets?\b/, /\belastic\w*|\bgomas?\b/, /\bniti\b|\bni\s?ti\b/, /\bresortes?\b/, /\bstripping\b/, /\btubos?\b|\bbandas?\b/];
  const isOrto = txt => { const t = N(txt); if (STRONG.test(t)) return true; return PARTS.filter(r => r.test(t)).length >= 2; };

  /* ---------- lo que se puede sacar del texto ---------- */
  const wire = s => String(s).split(/x/).map(p => { const d = p.replace(/[^\d]/g, '').replace(/^0+(?=\d{3})/, ''); return d ? '.' + d.padStart(3, '0') : ''; }).filter(Boolean).join(' x ');
  const MAT = { niti: 'NiTi', 'ni ti': 'NiTi', acero: 'acero', ss: 'acero', tma: 'TMA', cobre: 'cobre NiTi', beta: 'beta-titanio' };
  const SPEC = /(\d?[.,]?0?\d{2,3}(?:\s?x\s?\d?[.,]?0?\d{2,3})?)\s*(niti|ni\s?ti|acero|ss|tma|cobre|beta)?/;
  function parse(text) {
    const t = N(text), r = { arcU: '', arcL: '', elas: '', chips: [], next: 5 };
    const ia = t.search(/\barcos?\b/);
    if (ia >= 0) {
      const reg = t.slice(ia, ia + 90), m = SPEC.exec(reg.replace(/^arcos?/, ' '));
      if (m && (m[2] || /[.,]0?\d{2}/.test(m[1]) || /^0\d{2,3}$/.test(m[1]))) {
        const w = wire(m[1].replace(/,/g, '.')), mat = m[2] ? MAT[m[2].replace(/\s+/g, ' ')] || m[2] : '', val = (w + (mat ? ' ' + mat : '')).trim(), before = reg.slice(0, reg.indexOf(m[0]) + 6);
        const sup = /\bsup\w*|\barriba\b/.test(before), inf = /\binf\w*|\bsub\b|\babajo\b/.test(before);
        if (sup && !inf) r.arcU = val; else if (inf && !sup) r.arcL = val; else if (sup && inf || /\bambos|\bambas|\barcos\b/.test(before)) { r.arcU = val; r.arcL = val; }
      }
    }
    const el = /(?:elastic\w*|gomas?)[^.;,]{0,30}?(clase\s*(?:ii|iii|2|3)|verticales?|cruzad\w+|triangular\w*|box)/.exec(t);
    if (el) r.elas = el[1].replace(/\bii\b/, 'II').replace(/\biii\b/, 'III').replace(/^\w/, c => c.toUpperCase());
    const add = (rx, name) => { if (rx.test(t)) r.chips.push(name); };
    add(/cambi\w*\s+(?:de\s+|el\s+)?arcos?|\barcos?\s+(?:superior|inferior|sup|inf|sub|\d|\.)/, 'Cambio de arco');
    add(/cadena/, 'Cadena elástica'); add(/ligadur/, 'Cambio de ligaduras'); add(/elastic|goma/, 'Elásticos');
    add(/recement|despeg|se\s+(?:le\s+)?(?:cay|solt)|\bpegu\w*|fijacion de bracket/, 'Recementado de bracket'); add(/stripping|desgaste interproximal/, 'Stripping'); add(/resorte|activ\w+/, 'Activación de resortes'); add(/higiene/, 'Higiene reforzada');
    const nx = /(?:proximo\s+)?control\s+(?:en|dentro de)\s+(\d{1,2})\s*(semanas?|sem|meses|mes)/.exec(t); if (nx) r.next = Math.min(12, Math.max(1, (+nx[1]) * (/mes/.test(nx[2]) ? 4 : 1)));
    return r;
  }

  /* ---------- crear el control cuando se guarda la nota ---------- */
  let busy = false;
  const tpPrev = A.touchPd;
  A.touchPd = function (pid) {
    const r = tpPrev.apply(this, arguments);
    if (busy) return r; busy = true;
    try { scan(pid); } catch (e) { /* nada */ } finally { busy = false; }
    return r;
  };
  function scan(pid) {
    const pd = A.pd(pid); if (!pd || !pd.notes) return; const lim = A.add(A.today(), -1);
    pd.notes.slice(0, 6).forEach(n => {
      if (!n || n.orto || n.ox || n.auto || n.imp || n.paper || (n.date || '') < lim || !isOrto(n.text)) return;
      n.ox = 1;
      const made = !pd.orto; if (made) pd.orto = { type: 'Brackets metálicos', start: n.date || A.today(), months: 24, goal: '', status: 'act', ctrls: [], autoMade: true };
      const o = pd.orto; o.ctrls = o.ctrls || []; const p = parse(n.text);
      const c = { id: A.uid(), date: n.date || A.today(), arcU: p.arcU, arcL: p.arcL, elas: p.elas, notes: n.text, next: p.next, chips: p.chips, noteId: n.id, auto: true };
      o.ctrls.unshift(c); o.ctrls.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); n.orto = c.id;
      A.touchPd(pid);
      const nro = o.ctrls.length;
      A.toast('Se creó el control de ortodoncia N° ' + nro + ' en la solapa Ortodoncia.' + (made ? ' (Armé el tratamiento: lo completás ahí.)' : ''), () => {
        o.ctrls = o.ctrls.filter(x => x.id !== c.id); delete n.orto; n.ox = 2; if (made && !o.ctrls.length) delete pd.orto; A.touchPd(pid); A.refresh();
      }, 8000);
    });
  }

  /* ---------- botón «Agregar foto» dentro de la nota de evolución ---------- */
  const toJpg = (file, max, q) => new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', q)); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); }; im.src = u; });
  A.chg.oxNotePhoto = async el => {
    const pid = S.fichaPid, pd = A.pd(pid), cid = el.getAttribute('data-c'), c = pd.orto && (pd.orto.ctrls || []).filter(x => x.id === cid)[0], files = Array.prototype.slice.call(el.files || []); if (!c || !files.length) return;
    const sel = el.closest('.ox-addph') && el.closest('.ox-addph').querySelector('select'), view = sel ? sel.value : 'Frente'; let n = 0;
    A.toast('Guardando ' + files.length + ' foto(s)…');
    for (const f of files) { try { const full = await toJpg(f, 1600, 0.82), thumb = await toJpg(f, 160, 0.6), it = await A.imgAdd(pid, { kind: 'orto', note: 'Ortodoncia · ' + view, date: c.date }, full, thumb); it.view = view; it.ctrl = c.id; n++; } catch (e) { /* sigue */ } }
    el.value = ''; if (n) { A.touchPd(pid); A.refresh(); A.toast(n + ' foto(s) agregada(s) al control del ' + (A.fmtDMY ? A.fmtDMY(c.date) : c.date) + '.'); }
  };
  function mount() {
    if (S.tab !== 'ficha' || S.fichaTab !== 'datos' || !S.fichaPid) return; const pd = A.pd(S.fichaPid); if (!pd.orto) return;
    const lis = Array.prototype.slice.call(document.querySelectorAll('#fichaBody .timeline li'));
    pd.notes.filter(n => n.orto && (pd.orto.ctrls || []).some(c => c.id === n.orto)).forEach(n => {
      const li = lis.filter(x => x.textContent.indexOf(n.text) >= 0).pop(); if (!li || li.querySelector('.ox-addph')) return;
      li.insertAdjacentHTML('beforeend', '<div class="ox-addph"><span class="ox-tag">🦷 Control de ortodoncia</span><select aria-label="Qué foto es">' + VIEWS.map(v => '<option>' + esc(v) + '</option>').join('') + '</select><label class="btn small">📷 Agregar foto<input type="file" accept="image/*" multiple hidden data-chg="oxNotePhoto" data-c="' + esc(n.orto) + '"></label><button class="btn small" data-act="oxOpenCtrl">Ver en Ortodoncia</button></div>');
    });
  }
  A.acts.oxOpenCtrl = () => { S.fichaTab = 'orto'; A.refresh(); };
  const fichaPrev = A.render.ficha;
  A.render.ficha = function () { const r = fichaPrev.apply(this, arguments); try { mount(); setTimeout(() => { try { mount(); } catch (e) { /* nada */ } }, 200); } catch (e) { /* nada */ } return r; };

  const css = document.createElement('style');
  css.textContent = '.ox-addph{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px}.ox-tag{font-size:.76rem;font-weight:700;color:var(--accent);background:var(--accent-soft);border-radius:999px;padding:3px 10px}.ox-addph select{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:10px;padding:6px 8px;font:inherit;font-size:.82rem}';
  document.body.appendChild(css);
})();
