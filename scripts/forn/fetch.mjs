// Baja de la web de la Federación Odontológica de Río Negro (odontorionegro.com) los PDF de aranceles
// de cada obra social y los aranceles éticos, y los pasa a texto (pdftotext -layout).
// Uso: node scripts/forn/fetch.mjs <carpeta_salida>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://odontorionegro.com';
const out = process.argv[2] || 'forn-out';
fs.mkdirSync(path.join(out, 'pdf'), { recursive: true });
fs.mkdirSync(path.join(out, 'txt'), { recursive: true });
const UA = { 'user-agent': 'Mozilla/5.0 (OdontoVoz aranceles; somosroan@gmail.com)' };
const get = async u => { const r = await fetch(u, { headers: UA }); if (!r.ok) throw new Error(r.status + ' ' + u); return r; };
const html = async u => (await get(u)).text();
const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/&#8211;|&ndash;/g, '-').replace(/&amp;/g, '&').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim();
const links = h => { const L = []; const re = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi; let m; while ((m = re.exec(h))) L.push({ href: m[1].replace(/&amp;/g, '&'), text: strip(m[2]), img: (m[2].match(/src="([^"]+)"/) || [])[1] || '' }); return L; };
const slugOf = u => u.replace(/\/+$/, '').split('/').pop();

const index = { at: new Date().toISOString(), base: BASE, os: [], eticos: null };
async function pdfToTxt(url, name) {
  const buf = Buffer.from(await (await get(url)).arrayBuffer());
  const p = path.join(out, 'pdf', name + '.pdf'); fs.writeFileSync(p, buf);
  const t = path.join(out, 'txt', name + '.txt');
  execFileSync('pdftotext', ['-layout', p, t]);
  return { pdf: url, txt: path.relative(out, t), bytes: buf.length };
}

const home = await html(BASE + '/obrassociales/');
const seen = new Set();
const osLinks = links(home).filter(l => l.href.startsWith(BASE + '/') && !/wp-content|obrassociales|forms\.|validadores|#/.test(l.href) && /\.(png|jpe?g|webp)/i.test(l.img));
for (const l of osLinks) {
  const slug = slugOf(l.href); if (seen.has(slug)) continue; seen.add(slug);
  try {
    const h = await html(l.href);
    const title = strip((h.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || slug).replace(/\s*[-–|].*$/, '');
    const pdfs = links(h).filter(x => /\.pdf(\?|$)/i.test(x.href));
    const ar = pdfs.filter(x => /arancel|valores|honorario|planes/i.test(x.text + ' ' + x.href) && !/norma|receta/i.test(x.text + ' ' + x.href));
    const norm = pdfs.filter(x => /norma/i.test(x.text + ' ' + x.href))[0];
    const rec = { slug, title, page: l.href, logo: l.img.split('/').pop(), pdfs: pdfs.map(x => ({ text: x.text, href: x.href })), aranceles: [], normas: norm ? norm.href : null };
    if (slug.indexOf('aranceles-eticos') === 0) {
      const p = pdfs[0]; if (p) index.eticos = Object.assign({ page: l.href }, await pdfToTxt(p.href, '_eticos'));
      continue;
    }
    let i = 0;
    for (const a of ar) { try { rec.aranceles.push(Object.assign({ text: a.text }, await pdfToTxt(a.href, slug + (i ? '-' + i : '')))); i++; } catch (e) { rec.err = String(e); } }
    index.os.push(rec);
    console.log(slug, '·', rec.aranceles.length, 'pdf de aranceles');
  } catch (e) { console.log('ERROR', slug, String(e)); index.os.push({ slug, page: l.href, err: String(e) }); }
}
// circulares (las más nuevas)
try {
  const c = await html(BASE + '/circulares/');
  index.circulares = links(c).filter(x => /\.pdf/i.test(x.href)).map(x => ({ text: x.text, href: x.href }));
} catch (e) { index.circulares = []; }
fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(index, null, 1));
console.log('obras sociales:', index.os.length, '· éticos:', !!index.eticos);
