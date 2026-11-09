// Arma supabase/functions/wa-sim/index.ts copiando el «cerebro» del asistente desde wa-webhook,
// para que la prueba desde la app responda exactamente igual que el WhatsApp real.
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
