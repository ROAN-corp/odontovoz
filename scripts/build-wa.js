// Arma supabase/functions/wa-sim/index.ts copiando el «cerebro» del asistente desde wa-webhook,
// para que la prueba desde la app responda exactamente igual que el WhatsApp real.
// También copia el motor del menú (scripts/wa-menu.js) al webhook y a la app.
// Uso: node scripts/build-wa.js
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'supabase', 'functions');
const hook = fs.readFileSync(path.join(dir, 'wa-webhook', 'index.ts'), 'utf8');
const m = /\/\/ >>> CEREBRO[^\n]*\n([\s\S]*?)\/\/ <<< CEREBRO/.exec(hook);
if (!m) throw new Error('No encontré el bloque CEREBRO en wa-webhook/index.ts');
const tpl = fs.readFileSync(path.join(dir, 'wa-sim', 'template.ts'), 'utf8');
if (!tpl.includes('/*__CEREBRO__*/')) throw new Error('Falta /*__CEREBRO__*/ en wa-sim/template.ts');
fs.writeFileSync(path.join(dir, 'wa-sim', 'index.ts'), tpl.replace('/*__CEREBRO__*/', '// ---- cerebro copiado de wa-webhook ----\n' + m[1]));
console.log('wa-sim/index.ts listo');

/* motor del menú (scripts/wa-menu.js) → wa-webhook y src/app52.js */
const menu = fs.readFileSync(path.join(__dirname, 'wa-menu.js'), 'utf8').trim();
function inject(file, a, b) {
  const s = fs.readFileSync(file, 'utf8'), i = s.indexOf(a), j = s.indexOf(b);
  if (i < 0 || j < i) throw new Error('Faltan las marcas del MENU en ' + file);
  fs.writeFileSync(file, s.slice(0, s.indexOf('\n', i) + 1) + menu.split('\n').map(l => l.startsWith('/* =====') ? ' ' + l : l).join('\n') + '\n' + s.slice(j));
}
inject(path.join(dir, 'wa-webhook', 'index.ts'), '// >>> MENU', '// <<< MENU');
inject(path.join(__dirname, '..', 'src', 'app52.js'), '/* >>> MENU', '/* <<< MENU */');
console.log('menú copiado a wa-webhook y app52');
