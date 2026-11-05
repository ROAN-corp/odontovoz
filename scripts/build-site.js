// Arma la carpeta site/ que se publica en GitHub Pages:
//   /            página pública de OdontoVoz (carpeta sitio/)
//   /app/        la app web (carpeta www/, armada antes por prepare-www.js)
//   /admin.html  panel de administración
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), site = path.join(root, 'site');
fs.rmSync(site, { recursive: true, force: true });
fs.cpSync(path.join(root, 'sitio'), site, { recursive: true });
fs.cpSync(path.join(root, 'www'), path.join(site, 'app'), { recursive: true });
for (const f of ['admin.html', 'privacidad.html']) fs.copyFileSync(path.join(root, f), path.join(site, f));
/* tipografías propias en las páginas públicas (sin Google Fonts) */
for (const f of fs.readdirSync(site).filter(x => x.endsWith('.html'))) {
  try { const p = path.join(site, f), h = fs.readFileSync(p, 'utf8'), n = require('./fonts-local')(h, site); if (n !== h) fs.writeFileSync(p, n); } catch (e) { console.warn('Tipografías locales (' + f + '): ' + e.message); }
}
fs.writeFileSync(path.join(site, '.nojekyll'), '');
console.log('site/ lista:', fs.readdirSync(site).join(', '));
