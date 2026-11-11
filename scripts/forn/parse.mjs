// Provisorio: se completa después de ver los textos.
import fs from 'node:fs';
const [inp, outp] = process.argv.slice(2);
const idx = JSON.parse(fs.readFileSync(inp + '/index.json', 'utf8'));
fs.mkdirSync(outp.replace(/\/[^/]+$/, ''), { recursive: true });
if (!fs.existsSync(outp)) fs.writeFileSync(outp, JSON.stringify({ v: 0, at: idx.at, os: [] }));
