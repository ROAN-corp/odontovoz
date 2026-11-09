// Copia src/*.js dentro de index.html (la app es un solo archivo). Uso: node scripts/inline-src.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), file = path.join(root, 'index.html');
let lines = fs.readFileSync(file, 'utf8').split('\n');
const order = ['ovcmd.js', 'app5.js', 'app6.js', 'app7.js', 'app8.js', 'app9.js', 'app10.js', 'cloud.js', 'lic.js', 'app11.js', 'app12.js', 'app13.js', 'app14.js', 'app15.js', 'app16.js', 'app17.js', 'app18.js', 'app19.js', 'app20.js', 'app21.js', 'app22.js', 'app23.js', 'app24.js', 'app25.js', 'app26.js', 'app27.js', 'app28.js', 'app29.js', 'app30.js', 'app31.js', 'app32.js', 'app33.js', 'app34.js', 'app35.js', 'app36.js', 'app37.js', 'app38.js', 'app39.js', 'app40.js', 'app41.js', 'app42.js', 'app43.js', 'app44.js', 'app45.js', 'app46.js', 'app47.js', 'app48.js', 'app49.js', 'app50.js', 'app51.js', 'app52.js', 'app53.js', 'app54.js'];
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
