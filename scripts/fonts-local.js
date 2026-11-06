// Tipografías servidas desde nuestro propio sitio en vez de Google Fonts (así el navegador no le avisa a Google
// cada vez que alguien abre la app). Usa los paquetes @fontsource instalados en la compilación; si falta alguno,
// deja el enlace original a Google Fonts para que nada se rompa.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const FAM = {
  'Bricolage Grotesque': 'bricolage-grotesque', 'IBM Plex Mono': 'ibm-plex-mono', 'Instrument Sans': 'instrument-sans',
  'Atkinson Hyperlegible': 'atkinson-hyperlegible', 'Schibsted Grotesk': 'schibsted-grotesk'
};
function parse(url) {
  const out = []; const q = url.split('?')[1] || '';
  for (const part of q.split('&')) {
    if (!part.startsWith('family=')) continue;
    const [name, spec] = decodeURIComponent(part.slice(7)).replace(/\+/g, ' ').split(':');
    const ws = new Set(), it = new Set();
    if (spec) { const [axes, vals] = spec.split('@'); const ax = axes.split(','); for (const v of vals.split(';')) { const p = v.split(','); const o = {}; ax.forEach((a, i) => { o[a] = p[i]; }); const w = String(o.wght || '400').split('..')[0]; if (o.ital === '1') it.add(w); else ws.add(w); } } else ws.add('400');
    out.push({ name, ws: [...ws], it: [...it] });
  }
  return out;
}
/* devuelve el html con el <link> de Google reemplazado por fonts.css local, copiando los archivos a outDir/fonts */
module.exports = function localFonts(html, outDir) {
  const m = html.match(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)">/) || html.match(/<link href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)" rel="stylesheet">/);
  if (!m) return html;
  let css = '', ok = true; const fdir = path.join(outDir, 'fonts');
  for (const f of parse(m[1].replace(/&amp;/g, '&'))) {
    const pkg = FAM[f.name], base = pkg && path.join(root, 'node_modules', '@fontsource', pkg);
    if (!base || !fs.existsSync(base)) { ok = false; break; }
    const files = f.ws.map(w => 'latin-' + w + '.css').concat(f.it.map(w => 'latin-' + w + '-italic.css'));
    for (const cf of files) {
      const p = path.join(base, cf); if (!fs.existsSync(p)) { ok = false; break; }
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace(/url\(\.\/files\/([^)]+)\)/g, (x, file) => { fs.mkdirSync(fdir, { recursive: true }); fs.copyFileSync(path.join(base, 'files', file), path.join(fdir, file)); return 'url(fonts/' + file + ')'; });
      css += c + '\n';
    }
    if (!ok) break;
  }
  if (!ok) { console.warn('Tipografías: falta algún paquete @fontsource; se sigue usando Google Fonts.'); return html; }
  fs.writeFileSync(path.join(outDir, 'fonts.css'), css);
  return html.replace(m[0], '<link rel="stylesheet" href="fonts.css">').replace(/<link rel="preconnect" href="https:\/\/fonts\.g(oogleapis|static)\.com"( crossorigin)?>\s*/g, '');
};
