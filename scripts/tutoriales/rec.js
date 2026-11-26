/* Graba un tutorial de OdontoVoz: abre la app, hace los pasos, escribe subtítulos y le pone voz.
   Uso:  node scripts/tutoriales/rec.js configurar     (ver README.md)
   Cada tutorial (t-NOMBRE.js) exporta { titulo, segmentos: [{ dice, muestra?, hace: async h => {…} }] }. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const nombre = process.argv[2]; if (!nombre) { console.error('Falta el nombre del tutorial'); process.exit(1); }
const T = require('./t-' + nombre + '.js');
const URL = process.env.APP_URL || 'http://localhost:8123/index.html';
const OUT = process.env.SALIDA || path.join(process.cwd(), 'salida-tutoriales'); fs.mkdirSync(OUT, { recursive: true });
const W = path.join(OUT, 'tmp-' + nombre); fs.rmSync(W, { recursive: true, force: true }); fs.mkdirSync(W, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  /* 1) la voz */
  fs.writeFileSync(W + '/segs.json', JSON.stringify(T.segmentos.map(s => s.dice)));
  execFileSync('python3', [path.join(__dirname, 'tts.py'), W + '/segs.json', W], { stdio: 'inherit' });
  const durs = JSON.parse(fs.readFileSync(W + '/durs.json'));

  execFileSync('python3', [path.join(__dirname, 'assets.py'), W]);
  /* 2) la grabación */
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: W, size: { width: 1280, height: 720 } }, deviceScaleFactor: 1 });
  const t0 = Date.now(); const now = () => (Date.now() - t0) / 1000;
  const page = await ctx.newPage();
  await page.goto(URL); await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const i = document.getElementById('intro'); if (i) i.remove();
    const A = window.App; A.S.modal = null; A.renderModal(); A.S.tab = 'inicio'; A.refresh();
    const st = document.createElement('style');
    st.textContent = '#tcur{position:fixed;left:-50px;top:-50px;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;border:3px solid #fff;background:rgba(11,107,111,.75);box-shadow:0 0 0 2px rgba(0,0,0,.35),0 4px 12px rgba(0,0,0,.35);z-index:99999;pointer-events:none;transition:left .6s cubic-bezier(.3,.1,.2,1),top .6s cubic-bezier(.3,.1,.2,1),transform .15s}#tcur.dn{transform:scale(.7)}' +
      '.trip{position:fixed;z-index:99998;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:3px solid #0b6b6f;pointer-events:none;animation:trip .55s ease-out forwards}@keyframes trip{to{transform:scale(3.2);opacity:0}}' +
      '#tcap{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);max-width:min(980px,92vw);z-index:99997;background:rgba(8,28,30,.88);color:#fff;font:600 21px/1.35 Inter,system-ui,sans-serif;padding:11px 20px;border-radius:14px;text-align:center;pointer-events:none;opacity:0;transition:opacity .25s}#tcap.on{opacity:1}' +
      '#ttitle{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;background:linear-gradient(135deg,#08484b,#0b6b6f);color:#fff;font:800 44px/1.2 Inter,system-ui,sans-serif;text-align:center;padding:40px;transition:opacity .5s}#ttitle small{display:block;font:500 24px Inter,system-ui,sans-serif;opacity:.85;margin-top:14px}';
    document.head.appendChild(st);
    ['tcur', 'tcap'].forEach(id => { const d = document.createElement('div'); d.id = id; document.body.appendChild(d); });
  });

  const h = {
    page, sleep, foto1: path.join(W, 'foto1.jpg'), foto2: path.join(W, 'foto2.jpg'), pdf: path.join(W, 'plan.pdf'),
    cap: async t => page.evaluate(t => { const c = document.getElementById('tcap'); if (!t) { c.classList.remove('on'); return; } c.textContent = t; c.classList.add('on'); }, t),
    title: async (t, sub) => page.evaluate(([t, sub]) => { let d = document.getElementById('ttitle'); if (!t) { if (d) { d.style.opacity = 0; setTimeout(() => d.remove(), 600); } return; } if (!d) { d = document.createElement('div'); d.id = 'ttitle'; document.body.appendChild(d); } d.style.opacity = 1; d.innerHTML = t + (sub ? '<small>' + sub + '</small>' : ''); }, [t, sub]),
    to: async (x, y) => { await page.evaluate(([x, y]) => { const c = document.getElementById('tcur'); c.style.left = x + 'px'; c.style.top = y + 'px'; }, [x, y]); await page.mouse.move(x, y, { steps: 8 }); await sleep(650); },
    box: async sel => { const l = typeof sel === 'string' ? page.locator(sel).first() : sel; await l.waitFor({ state: 'visible', timeout: 8000 }); try { await l.scrollIntoViewIfNeeded(); } catch (e) { /* nada */ } return l.boundingBox(); },
    move: async sel => { const b = await h.box(sel); await h.to(b.x + Math.min(b.width / 2, 120), b.y + Math.min(b.height / 2, 24)); return b; },
    click: async sel => { const l = typeof sel === 'string' ? page.locator(sel).first() : sel; const b = await h.move(l); await page.evaluate(([x, y]) => { const c = document.getElementById('tcur'); c.classList.add('dn'); const r = document.createElement('div'); r.className = 'trip'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 700); setTimeout(() => c.classList.remove('dn'), 150); }, [b.x + Math.min(b.width / 2, 120), b.y + Math.min(b.height / 2, 24)]); await l.click(); await sleep(500); },
    text: (t, scope) => page.locator((scope || '') + ' :text-is("' + t + '")').first(),
    clickText: async (t, scope) => { const l = page.locator(scope || 'body').getByText(t, { exact: false }).first(); await h.click(l); },
    type: async (sel, txt) => { await h.click(sel); await page.locator(sel).first().fill(''); await page.keyboard.type(txt, { delay: 70 }); await sleep(300); },
    scroll: async (sel, by, ms) => { await page.evaluate(([sel, by, ms]) => { const e = document.querySelector(sel); if (!e) return; const from = e.scrollTop, t0 = performance.now(); const f = () => { const k = Math.min(1, (performance.now() - t0) / ms); e.scrollTop = from + by * (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2); if (k < 1) requestAnimationFrame(f); }; f(); }, [sel, by, ms || 1400]); await sleep((ms || 1400) + 100); },
    drag: async (fx, fy, tx, ty, ms, hold) => { ms = ms || 900; await h.to(fx, fy); await page.mouse.down(); if (hold) await sleep(hold); await page.evaluate(([x, y, ms]) => { const c = document.getElementById('tcur'); c.style.transitionDuration = ms + 'ms'; c.style.left = x + 'px'; c.style.top = y + 'px'; }, [tx, ty, ms]); const n = Math.ceil(ms / 30); for (let i = 1; i <= n; i++) { await page.mouse.move(fx + (tx - fx) * i / n, fy + (ty - fy) * i / n); await sleep(30); } await page.evaluate(() => { document.getElementById('tcur').style.transitionDuration = ''; }); await sleep(300); },
    up: async () => { await page.mouse.up(); await sleep(500); },
    /* punto libre de la agenda: devuelve {x,y} de un horario libre (k-ésimo) del profesional n */
    libre: async (n, k) => { const r = await page.evaluate(([n, k]) => { const A = window.App, pro = A.PROS[window.__pi != null ? window.__pi : n], gb = document.querySelector('#gridWrap .gb[data-pro="' + pro.id + '"]'); if (!gb) return null; const st = A.freeSlots(pro, A.S.date, 30)[k]; const g0 = +gb.getAttribute('data-g0'); const sh = parseFloat(getComputedStyle(gb.closest('.grid')).getPropertyValue('--sh')) || 28; gb.scrollIntoView({ block: 'center' }); const r = gb.getBoundingClientRect(); return { x: r.left + Math.min(r.width / 2, 120), y: r.top + (st - g0) / 15 * sh + 10 }; }, [n, k]); await sleep(300); return r; },
    modalBody: '.modal .m-body, .modal',
    ev: (fn, a) => page.evaluate(fn, a)
  };

  const starts = []; await h.title(T.titulo, T.subtitulo || ''); await sleep(2600); await h.title(null); await sleep(700);
  for (let i = 0; i < T.segmentos.length; i++) {
    const s = T.segmentos[i], ini = now(); starts.push(ini + 0.15);
    /* subtítulos: cada frase en su momento, proporcional a lo que dura la voz */
    const frases = (s.muestra || s.dice).match(/[^.!?]+[.!?]*/g).map(x => x.trim()).filter(Boolean), tot = frases.reduce((a, f) => a + f.length, 0); let acum = 0;
    frases.forEach(f => { const at = (acum / tot) * durs[i] * 1000; acum += f.length; setTimeout(() => h.cap(f).catch(() => {}), at); });
    try { await s.hace(h); } catch (e) { console.error('Paso', i, 'falló:', e.message.split('\n')[0]); }
    const falta = ini + durs[i] + 0.8 - now(); if (falta > 0) await sleep(falta * 1000);
    await h.cap('');
  }
  await h.title(T.cierre || '¡Listo!', T.cierreSub || 'odontovoz.com.ar'); await sleep(2500);
  const vid = page.video(); await ctx.close(); const webm = await vid.path(); await b.close();

  /* 3) mezclar voz + video */
  fs.writeFileSync(W + '/starts.json', JSON.stringify(starts.map(x => x + (T.desfase || 0.35))));
  execFileSync('python3', [path.join(__dirname, 'mezcla.py'), W, W + '/starts.json', W + '/voz.wav']);
  const mp4 = path.join(OUT, 'tut-' + nombre + '.mp4');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', webm, '-i', W + '/voz.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p', '-r', '25', '-c:a', 'aac', '-b:a', '80k', '-movflags', '+faststart', '-shortest', mp4]);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(T.posterEn || 6), '-i', mp4, '-vframes', '1', '-q:v', '4', path.join(OUT, 'poster-tut-' + nombre + '.jpg')]);
  console.log('Listo:', mp4, (fs.statSync(mp4).size / 1048576).toFixed(1) + ' MB');
})();
