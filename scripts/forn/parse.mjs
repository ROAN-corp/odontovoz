// Pasa los textos de los PDF de la FORN (scripts/forn/fetch.mjs) a un JSON chico para la app.
// Uso: node scripts/forn/parse.mjs <carpeta de fetch> <salida.json>
// Formato de salida:
// { v:1, at, src, eticos:{vig, pdf, rows:{ '01.01': {d, v} }},
//   os:[ {slug, name, sub, vig, page, pdf, normas, tables:[ {title, cols:[{label, kind:'total'|'cov'|'cos'|'plan'}], rows:{ code:{d, v:[n|null…]} } } ] } ] }
import fs from 'node:fs';
import path from 'node:path';

const [inp, outp] = process.argv.slice(2);
const idx = JSON.parse(fs.readFileSync(path.join(inp, 'index.json'), 'utf8'));
const CODE = /^\s*(\d{2}\.\d{2}(?:\.\d{2})?)\b\s*/;
const MONEY = /\$\s*(-(?!\d)|[\d.]+(?:,\d+)?)/g;
const num = s => (s === '-' ? 0 : Math.round(parseFloat(s.replace(/\./g, '').replace(',', '.'))));
const clean = s => s.replace(/\s+/g, ' ').replace(/^[.\-–\s]+|[\s.]+$/g, '').trim();
const isTitle = l => /nomenclador valorizado|^\s*$/i.test(l);

function vigOf(txt) {
  const m = txt.match(/vig(?:encia|\.)?\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}|[0-9]{1,2}\/[0-9]{4}|[0-9]{4})/i) || txt.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
  if (!m) return null;
  const p = m[1].split('/');
  if (p.length === 3) return (p[2].length === 2 ? '20' + p[2] : p[2]) + '-' + p[1].padStart(2, '0');
  if (p.length === 2) return p[1] + '-' + p[0].padStart(2, '0');
  return p[0];
}

/* palabras del encabezado con su posición, para saber qué es cada columna de importes */
function words(line) { const out = []; const re = /\S+(?: \S+)*/g; let m; while ((m = re.exec(line))) out.push({ t: m[0], a: m.index, b: m.index + m[0].length }); return out; }
function kindOf(label) {
  const L = label.toLowerCase();
  if (/coseguro|a\/?c\.? afiliado|a cargo (del )?afiliado|valor afiliado/.test(L)) return 'cos';
  if (/total|arancel/.test(L)) return 'total';
  if (/a cargo|a\/c|valor smg|valor os/.test(L)) return 'cov';
  return 'plan';
}

function parseTable(lines, startHdr) {
  /* filas con código */
  const rows = {}, order = [], xs = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i], m = l.match(CODE); if (!m) continue;
    const vals = []; let mm; MONEY.lastIndex = 0;
    while ((mm = MONEY.exec(l))) vals.push({ x: mm.index, v: num(mm[1]) });
    if (!vals.length) continue;
    let d = clean(l.slice(m[0].length, vals[0].x));
    if (!d) { /* descripción en las líneas de al lado */
      const near = [lines[i - 1], lines[i + 1]].filter(x => x && !CODE.test(x) && !/\$/.test(x)).map(clean).filter(Boolean);
      d = near.join(' ');
    }
    const code = m[1];
    if (rows[code]) continue;
    rows[code] = { d: d.slice(0, 120), vals }; order.push(code); xs.push(vals.map(v => v.x));
  }
  if (!order.length) return null;
  /* columnas: la cantidad de importes más común por fila; la posición de cada una sale de las filas completas */
  const cnt = {}; order.forEach(c => { const n = rows[c].vals.length; cnt[n] = (cnt[n] || 0) + 1; });
  const ncol = +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || b - a)[0];
  const full = order.filter(c => rows[c].vals.length === ncol);
  const C = Array.from({ length: ncol }, (_, i) => Math.round(full.reduce((s, c) => s + rows[c].vals[i].x, 0) / full.length));
  /* etiquetas: palabras del encabezado que caen en el rango de cada columna */
  const hdr = lines.slice(startHdr, lines.findIndex(l => CODE.test(l) && /\$/.test(l)));
  const labels = C.map(() => []);
  hdr.forEach(l => words(l).forEach(w => {
    if (/^(c[oó]digo|cod\.?|c[oó]d\.?|descripci[oó]n|vigencia|desc)/i.test(w.t) || /nomenclador|convenio/i.test(w.t)) return;
    const mid = (w.a + w.b) / 2; let best = -1, bd = 1e9;
    C.forEach((x, i) => { const d = Math.abs(mid - (x + 8)); if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd <= 24 && w.a > C[0] - 40) labels[best].push(w.t);
  }));
  const colsOut = C.map((x, i) => { const label = clean(labels[i].join(' ')) || (C.length === 1 ? 'Valor' : ''); return { label, kind: C.length === 1 ? 'total' : kindOf(label) }; });
  /* si no hay coseguro ni «a cargo», son columnas por plan (aunque alguna diga «total») */
  if (colsOut.length > 2 && !colsOut.some(c => c.kind === 'cos' || c.kind === 'cov')) colsOut.forEach(c => { c.kind = 'plan'; });
  if (colsOut.length === 2 && !colsOut.some(c => c.kind === 'cos' || c.kind === 'cov')) colsOut.forEach(c => { c.kind = 'plan'; });
  const out = {};
  order.forEach(code => {
    const r = rows[code], v = C.map(() => null);
    if (r.vals.length === ncol) r.vals.forEach((val, i) => { v[i] = val.v; });
    else r.vals.forEach(val => { let bi = 0, bd = 1e9; C.forEach((x, i) => { const d = Math.abs(val.x - x); if (d < bd) { bd = d; bi = i; } }); if (v[bi] == null) v[bi] = val.v; });
    out[code] = { d: r.d, v };
  });
  return { cols: colsOut, rows: out };
}

function parseFile(txt) {
  /* un PDF puede tener varias páginas o bloques con encabezados distintos: se corta en cada «Nomenclador Valorizado» */
  const pages = txt.split(/\f/);
  const tables = [];
  pages.forEach(pg => {
    const lines = pg.split('\n');
    if (!lines.some(l => CODE.test(l) && /\$/.test(l))) return;
    const t = parseTable(lines, 0); if (!t) return;
    const prev = tables[tables.length - 1];
    const generic = t.cols.every(c => !c.label || c.label === 'Valor');
    if (prev && prev.cols.length === t.cols.length && (generic || prev.cols.every((c, i) => c.label === t.cols[i].label))) { Object.assign(prev.rows, t.rows); return; }
    t.cols.forEach((c, i) => { if (!c.label) c.label = 'Columna ' + (i + 1); });
    tables.push(t);
  });
  return tables;
}
function heading(txt) {
  const L = txt.split('\n').map(clean).filter(Boolean).filter(l => !/nomenclador valorizado/i.test(l)).slice(0, 4);
  const name = (L[0] || '').replace(/^convenio\s+/i, '').replace(/\s*vigencia.*$/i, '');
  const sub = L[1] && !/vigencia|c[oó]digo|^\$/i.test(L[1]) && !CODE.test(L[1]) ? L[1].replace(/\s*vigencia.*$/i, '') : '';
  return { name, sub };
}

const res = { v: 1, at: idx.at, src: idx.base, os: [] };
if (idx.eticos) {
  const txt = fs.readFileSync(path.join(inp, idx.eticos.txt), 'utf8');
  const t = parseFile(txt)[0];
  res.eticos = { vig: vigOf(txt.replace(/(\d{2}\/\d{2}\/\d{4})/, 'Vigencia $1')), pdf: idx.eticos.pdf, rows: {} };
  if (t) Object.keys(t.rows).forEach(k => { res.eticos.rows[k] = { d: t.rows[k].d, v: t.rows[k].v[0] }; });
}
idx.os.forEach(o => {
  if (!o.aranceles || !o.aranceles.length) return;
  const rec = { slug: o.slug, name: '', sub: '', vig: null, page: o.page, normas: o.normas || null, tables: [] };
  o.aranceles.forEach(a => {
    let txt; try { txt = fs.readFileSync(path.join(inp, a.txt), 'utf8'); } catch (e) { return; }
    const h = heading(txt); if (!rec.name) { rec.name = h.name; rec.sub = h.sub; }
    const notes = txt.split('\n').filter(l => !CODE.test(l) && !/c[oó]digo|descripci|^\s*[a-z]?\d{5,}/i.test(l) && /coseguro|copago|l[ií]mite|tope|exento/i.test(l) && clean(l).length > 25).map(clean).slice(0, 6);
    rec.notes = (rec.notes || []).concat(notes.filter(n => (rec.notes || []).indexOf(n) < 0)).slice(0, 8);
    const v = vigOf(txt); if (v && (!rec.vig || v > rec.vig)) rec.vig = v;
    parseFile(txt).forEach(t => { t.title = h.sub && h.sub !== rec.sub ? h.sub : (h.name !== rec.name ? h.name : ''); t.pdf = a.pdf; t.vig = v; rec.tables.push(t); });
  });
  if (rec.tables.length) res.os.push(rec);
});
if (res.os.length < 10) { console.error('Muy pocas obras sociales leídas (' + res.os.length + '): no se reemplaza el archivo.'); process.exit(1); }
fs.mkdirSync(path.dirname(outp), { recursive: true });
fs.writeFileSync(outp, JSON.stringify(res));
console.log('obras sociales con aranceles:', res.os.length, '· filas:', res.os.reduce((s, o) => s + o.tables.reduce((t, x) => t + Object.keys(x.rows).length, 0), 0), '· éticos:', res.eticos ? Object.keys(res.eticos.rows).length : 0);
