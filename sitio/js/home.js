/* Demostración de la portada: lo que se dice se pinta en el odontograma. */
(function () {
  const svg = document.getElementById('dOdo'), NS = 'http://www.w3.org/2000/svg';
  const UP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], LO = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
  const S = 22, G = 3, MID = 10, X0 = 2, pos = {};
  const el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  function tooth(n, x, y, up) {
    const g = el('g', { class: 't' }), i = S * .3, P = pts => pts.map(p => p.join(',')).join(' ');
    const faces = {
      top: P([[x, y], [x + S, y], [x + S - i, y + i], [x + i, y + i]]), bottom: P([[x, y + S], [x + S, y + S], [x + S - i, y + S - i], [x + i, y + S - i]]),
      left: P([[x, y], [x + i, y + i], [x + i, y + S - i], [x, y + S]]), right: P([[x + S, y], [x + S - i, y + i], [x + S - i, y + S - i], [x + S, y + S]])
    };
    const f = {};
    for (const k in faces) { f[k] = el('polygon', { points: faces[k] }); g.appendChild(f[k]); }
    f.center = el('rect', { x: x + i, y: y + i, width: S - 2 * i, height: S - 2 * i }); g.appendChild(f.center);
    /* vestibular: arriba en los superiores, abajo en los inferiores */
    f.V = up ? f.top : f.bottom; f.O = f.center;
    svg.appendChild(g); pos[n] = { x, y, f, g };
    const lbl = el('text', { x: x + S / 2, y: up ? y - 4 : y + S + 11, 'text-anchor': 'middle' }); lbl.textContent = n; svg.appendChild(lbl);
  }
  const col = k => X0 + k * (S + G) + (k >= 8 ? MID : 0);
  UP.forEach((n, k) => tooth(n, col(k), 12, true)); LO.forEach((n, k) => tooth(n, col(k), 56, false));
  svg.appendChild(el('line', { x1: col(8) - MID / 2 - G / 2 + .5, x2: col(8) - MID / 2 - G / 2 + .5, y1: 2, y2: 92, stroke: '#c5d5d3', 'stroke-dasharray': '3 3' }));
  const marks = el('g', {}); svg.appendChild(marks);

  const SCRIPT = [
    { say: 'Caries en el 36 por oclusal', n: 36, face: 'O', c: 'blue', done: '36 · caries oclusal · a realizar' },
    { say: 'Tiene una resina hecha en el 16 por vestibular', n: 16, face: 'V', c: 'red', done: '16 · resina vestibular · existente' },
    { say: 'Hay que hacer una corona en el 21', n: 21, ring: true, c: 'blue', done: '21 · corona · a realizar' },
    { say: 'Extracción del 48', n: 48, cross: true, c: 'blue', done: '48 · extracción · a realizar' }
  ];
  const said = document.getElementById('dSaid'), done = document.getElementById('dDone'), mic = document.getElementById('dMic');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function paint(s) {
    const p = pos[s.n], color = s.c === 'blue' ? 'var(--blue)' : 'var(--red)';
    if (s.face) p.f[s.face].setAttribute('class', 'f-' + s.c);
    if (s.ring) marks.appendChild(el('circle', { cx: p.x + S / 2, cy: p.y + S / 2, r: S / 2 + 2.5, class: 'mark', stroke: color }));
    if (s.cross) { marks.appendChild(el('line', { x1: p.x - 1, y1: p.y - 1, x2: p.x + S + 1, y2: p.y + S + 1, class: 'mark', stroke: color })); marks.appendChild(el('line', { x1: p.x + S + 1, y1: p.y - 1, x2: p.x - 1, y2: p.y + S + 1, class: 'mark', stroke: color })); }
  }
  function hl(s) { const old = svg.querySelector('.hl'); if (old) old.remove(); if (!s) return; const p = pos[s.n]; svg.appendChild(el('rect', { x: p.x - 3, y: p.y - 3, width: S + 6, height: S + 6, class: 'hl', rx: 4 })); }
  function reset() { Object.values(pos).forEach(p => ['top', 'bottom', 'left', 'right', 'center'].forEach(k => p.f[k].removeAttribute('class'))); marks.innerHTML = ''; hl(null); }
  if (reduce) { SCRIPT.forEach(paint); said.textContent = '«' + SCRIPT[0].say + '»'; done.innerHTML = '<i style="background:var(--blue)"></i>' + SCRIPT[0].done; mic.classList.remove('on'); return; }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  (async function loop() {
    for (;;) {
      reset();
      for (const s of SCRIPT) {
        mic.classList.add('on'); done.textContent = '';
        for (let k = 1; k <= s.say.length; k++) { said.innerHTML = '«' + s.say.slice(0, k) + '<span class="cur"></span>'; await wait(38 + Math.random() * 30); }
        said.textContent = '«' + s.say + '»'; mic.classList.remove('on');
        await wait(350); hl(s); paint(s);
        done.innerHTML = '<i style="background:var(--' + s.c + ')"></i>✓ ' + s.done;
        await wait(1700);
      }
      hl(null); await wait(2600);
    }
  })();
})();
