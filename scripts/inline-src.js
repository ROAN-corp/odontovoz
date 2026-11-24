// Copia src/*.js dentro de index.html (la app es un solo archivo). Uso: node scripts/inline-src.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), file = path.join(root, 'index.html');
let lines = fs.readFileSync(file, 'utf8').split('\n');
const order = ['ovcmd.js', 'app5.js', 'app6.js', 'app7.js', 'app8.js', 'app9.js', 'app10.js', 'cloud.js', 'lic.js', 'app11.js', 'app12.js', 'app13.js', 'app14.js', 'app15.js', 'app16.js', 'app17.js', 'app18.js', 'app19.js', 'app20.js', 'app21.js', 'app22.js', 'app23.js', 'app24.js', 'app25.js', 'app26.js', 'app27.js', 'app28.js', 'app29.js', 'app30.js', 'app31.js', 'app32.js', 'app33.js', 'app34.js', 'app35.js', 'app36.js', 'app37.js', 'app38.js', 'app39.js', 'app40.js', 'app41.js', 'app42.js', 'app43.js', 'app44.js', 'app45.js', 'app46.js', 'app47.js', 'app48.js', 'app49.js', 'app50.js', 'app51.js', 'app52.js', 'app53.js', 'app54.js', 'app55.js', 'app56.js', 'app57.js', 'app58.js', 'app59.js', 'app60.js', 'app61.js', 'app62.js', 'app63.js', 'app64.js', 'app65.js', 'app66.js', 'app67.js', 'app68.js', 'app69.js', 'app70.js', 'app71.js', 'app72.js', 'app73.js', 'app74.js', 'app75.js', 'app76.js', 'app77.js', 'app78.js', 'app79.js', 'app80.js', 'app81.js', 'app82.js', 'app83.js', 'app84.js', 'app85.js', 'app86.js', 'app87.js', 'app88.js', 'app89.js', 'app90.js', 'app91.js', 'app92.js', 'app93.js', 'app94.js', 'app95.js', 'app96.js', 'app97.js', 'app98.js', 'app99.js', 'app100.js', 'app101.js', 'app102.js', 'app103.js', 'app104.js', 'app105.js', 'app106.js', 'app107.js', 'app108.js', 'app109.js', 'app110.js'];
for (const name of order) {
  const p = path.join(root, 'src', name); if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, 'utf8').replace(/\n+$/, '').split('\n'), head = src[0];
  let i = lines.indexOf(head);
  if (i < 0) { // módulo nuevo: va antes del arranque
    i = lines.findIndex(l => l.startsWith('/* ===== arranque'));
    lines.splice(i, 0, ...src); console.log('agregado', name); continue;
  }
  let j = i + 1; while (j < lines.length && !lines[j].startsWith('/* =====') && lines[j] !== '</script>') j++;
  lines.splice(i, j - i, ...src); console.log('actualizado', name);
}
fs.writeFileSync(file, lines.join('\n'));
