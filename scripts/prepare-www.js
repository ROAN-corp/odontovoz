// Arma la carpeta www/ (lo que va dentro del APK y lo que se publica como página web).
// Usa jsPDF desde el propio paquete en vez de internet, así los PDF funcionan sin conexión.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');
fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const jspdfSrc = path.join(root, 'node_modules', 'jspdf', 'dist', 'jspdf.umd.min.js');
if (fs.existsSync(jspdfSrc)) {
  fs.copyFileSync(jspdfSrc, path.join(www, 'jspdf.umd.min.js'));
  html = html.replace(CDN, 'jspdf.umd.min.js');
} else {
  console.warn('Aviso: no se encontró jsPDF en node_modules; los PDF van a necesitar internet.');
}
// servidor de cuentas: se toma de las variables del repositorio (SUPABASE_URL y SUPABASE_ANON_KEY) si existen
const sbUrl = process.env.SUPABASE_URL || '', sbKey = process.env.SUPABASE_ANON_KEY || '';
if (sbUrl && sbKey) {
  html = html.replace(/\{ supabaseUrl: '[^']*', supabaseAnonKey: '[^']*' \}/, JSON.stringify({ supabaseUrl: sbUrl, supabaseAnonKey: sbKey }));
  console.log('Nube configurada:', sbUrl);
}
fs.writeFileSync(path.join(www, 'index.html'), html);
// versión web en un solo archivo (para abrir en la PC con doble clic): usa jsPDF desde internet
let single = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (sbUrl && sbKey) single = single.replace(/\{ supabaseUrl: '[^']*', supabaseAnonKey: '[^']*' \}/, JSON.stringify({ supabaseUrl: sbUrl, supabaseAnonKey: sbKey }));
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'OdontoVoz-web.html'), single);

for (const f of ['manifest.webmanifest', 'sw.js', 'privacidad.html', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) {
  fs.copyFileSync(path.join(root, f), path.join(www, f));
}
console.log('www/ lista:', fs.readdirSync(www).join(', '));
