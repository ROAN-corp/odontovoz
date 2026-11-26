/* Video del iPhone (vertical, para mandar por WhatsApp): cómo instalar OdontoVoz desde Safari y activar los avisos.
   Las pantallas de iOS están dibujadas (animación); las de la app son capturas reales (capturas.js).
   Uso:  MODELO_TTS=/ruta/al/modelo SALIDA=/ruta node scripts/tutoriales/ios/rec-ios.js   (con la app servida en :8123) */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const OUT = process.env.SALIDA || path.join(process.cwd(), 'salida-tutoriales'); fs.mkdirSync(OUT, { recursive: true });
const W = path.join(OUT, 'tmp-ios'); fs.rmSync(W, { recursive: true, force: true }); fs.mkdirSync(W, { recursive: true });
const REPO = path.join(__dirname, '..', '..', '..'), sleep = ms => new Promise(r => setTimeout(r, ms));

/* lo que se escucha (dice), lo que se lee (muestra) y lo que pasa en pantalla (hace) */
const SEG = [
  { dice: 'Hola. Te muestro cómo instalar OdontoVoz en tu áifon y activar los avisos. Lleva un minuto.',
    muestra: 'Cómo instalar OdontoVoz en tu iPhone y activar los avisos. Lleva un minuto.',
    hace: async p => { await sleep(4600); await p.evaluate(() => { title(null); show('safari'); }); } },
  { dice: 'Primero abrí odontovoz punto com punto ar barra app, en Safari. Tiene que ser Safari, no Guatsap ni Instagram.',
    muestra: 'Paso 1: abrí odontovoz.com.ar/app en Safari. No desde WhatsApp ni Instagram.',
    hace: async p => { await p.evaluate(() => hl('#url')); await sleep(2500); await p.evaluate(() => hl('#url', false)); } },
  { dice: 'Tocá el botón Compartir, el cuadradito con la flecha, abajo en el medio.',
    muestra: 'Paso 2: tocá el botón Compartir (el cuadrado con la flecha), abajo en el medio.',
    hace: async p => { await p.evaluate(() => hl('#btnShare')); await p.evaluate(() => tapEl('#btnShare')); await p.evaluate(() => { hl('#btnShare', false); $('#dim').classList.add('on'); $('#sheet').classList.add('on'); }); } },
  { dice: 'Tocá Agregar a inicio, y después Agregar, arriba a la derecha.',
    muestra: 'Paso 3: tocá «Agregar a inicio» y después «Agregar», arriba a la derecha.',
    hace: async p => { await p.evaluate(() => hl('#itAdd')); await sleep(500); await p.evaluate(() => tapEl('#itAdd')); await p.evaluate(() => { $('#sheet').classList.remove('on'); $('#dim').classList.remove('on'); show('add'); }); await sleep(600);
      await p.evaluate(() => hl('#btnAddOk')); await p.evaluate(() => tapEl('#btnAddOk')); await p.evaluate(() => { show('home'); setTimeout(() => $('#icoOv').classList.add('in'), 500); }); await sleep(900); } },
  { dice: 'Listo, ya tenés el ícono. Abrila siempre desde ahí, no desde Safari: se ve a pantalla completa, como cualquier aplicación.',
    muestra: 'Listo: ya está el ícono. Abrí OdontoVoz siempre desde ahí, no desde Safari.',
    hace: async p => { await p.evaluate(() => hl('#icoOv')); await sleep(1200); await p.evaluate(() => tapEl('#icoOv')); await p.evaluate(() => { hl('#icoOv', false); show('login'); hideFing(); }); } },
  { dice: 'La primera vez, ingresá con tu usuario y contraseña.',
    muestra: 'La primera vez ingresá con tu usuario y contraseña.',
    hace: async p => { await sleep(1800); await p.evaluate(() => show('app1')); } },
  { dice: 'Ahora los avisos: tocá el menú, Avisos y sonidos, y Activar avisos con la app cerrada.',
    muestra: 'Paso 4: Menú › Avisos y sonidos › «Activar avisos con la app cerrada».',
    hace: async (p, C) => { await p.evaluate(([x, y]) => tapAt(x, y), [C.menu.x, C.menu.y]); await p.evaluate(() => { show('app2'); hideFing(); }); await sleep(1200);
      await p.evaluate(([x, y]) => tapAt(x, y), [C.activar.x, C.activar.y]); await p.evaluate(() => { $('#perm').classList.add('on'); hideFing(); }); } },
  { dice: 'El áifon te pregunta si querés recibir notificaciones. Tocá Permitir. Si tocás No permitir, no te llega nada.',
    muestra: 'El iPhone pregunta si querés recibir notificaciones: tocá «Permitir».',
    hace: async p => { await sleep(1200); await p.evaluate(() => hl('#btnAllow')); await sleep(900); await p.evaluate(() => tapEl('#btnAllow')); await p.evaluate(() => { $('#perm').classList.remove('on'); show('app3'); hideFing(); }); } },
  { dice: 'Y listo: cuando llegue un paciente o cancelen un turno, te llega el aviso aunque la aplicación esté cerrada.',
    muestra: 'Listo. Te llega el aviso al iPhone aunque la app esté cerrada.',
    hace: async p => { await sleep(1300); await p.evaluate(() => show('lock')); await sleep(900); await p.evaluate(() => $('#nt').classList.add('in')); } },
  { dice: 'Hace falta iOS dieciséis punto cuatro o más nuevo. Si tenés dudas, escribinos por Guatsap.',
    muestra: 'Hace falta iOS 16.4 o más nuevo. ¿Dudas? Escribinos por WhatsApp.',
    hace: async () => { await sleep(3500); } }
];

(async () => {
  /* 1) capturas reales de la app y archivos de la pantalla */
  execFileSync('node', [path.join(__dirname, 'capturas.js'), W], { stdio: 'inherit' });
  const C = JSON.parse(fs.readFileSync(W + '/coords.json'));
  fs.copyFileSync(path.join(REPO, 'sitio', 'img', 'icono.png'), W + '/icon.png'); fs.copyFileSync(path.join(__dirname, 'ios.html'), W + '/ios.html');
  /* 2) la voz */
  fs.writeFileSync(W + '/segs.json', JSON.stringify(SEG.map(s => s.dice)));
  execFileSync('python3', [path.join(__dirname, '..', 'tts.py'), W + '/segs.json', W], { stdio: 'inherit' });
  const durs = JSON.parse(fs.readFileSync(W + '/durs.json'));
  /* 3) la grabación (720×1280) */
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 720, height: 1280 }, recordVideo: { dir: W, size: { width: 720, height: 1280 } }, deviceScaleFactor: 1 });
  const t0 = Date.now(), now = () => (Date.now() - t0) / 1000;
  const p = await ctx.newPage(); await p.goto('file://' + W + '/ios.html'); await sleep(900);
  await p.evaluate(() => title('Instalá OdontoVoz en tu iPhone', 'y activá los avisos'));
  const starts = [];
  for (let i = 0; i < SEG.length; i++) {
    const s = SEG[i], ini = now(); starts.push(ini + 0.15);
    const frases = s.muestra.split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean), tot = frases.reduce((a, f) => a + f.length, 0); let acum = 0;
    frases.forEach(f => { const at = (acum / tot) * durs[i] * 1000; acum += f.length; setTimeout(() => p.evaluate(t => cap(t), f).catch(() => {}), at); });
    try { await s.hace(p, C); } catch (e) { console.error('Paso', i, 'falló:', String(e.message).split('\n')[0]); }
    const falta = ini + durs[i] + 0.7 - now(); if (falta > 0) await sleep(falta * 1000);
    await p.evaluate(() => cap('')).catch(() => {});
  }
  await p.evaluate(() => { title('¡Listo!', 'odontovoz.com.ar'); }); await sleep(2200);
  const vid = p.video(); await ctx.close(); const webm = await vid.path(); await b.close();
  /* 4) voz + video */
  fs.writeFileSync(W + '/starts.json', JSON.stringify(starts.map(x => x + 0.35)));
  execFileSync('python3', [path.join(__dirname, '..', 'mezcla.py'), W, W + '/starts.json', W + '/voz.wav']);
  const mp4 = path.join(OUT, 'OdontoVoz-instalar-en-iPhone.mp4');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', webm, '-i', W + '/voz.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-pix_fmt', 'yuv420p', '-r', '25', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-shortest', mp4]);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', '14', '-i', mp4, '-vframes', '1', '-q:v', '4', path.join(OUT, 'OdontoVoz-instalar-en-iPhone-portada.jpg')]);
  console.log('Listo:', mp4, (fs.statSync(mp4).size / 1048576).toFixed(1) + ' MB');
})();
