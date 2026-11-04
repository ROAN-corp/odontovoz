// Ajusta el proyecto de Android que genera Capacitor:
// permiso de micrófono y acceso al servicio de reconocimiento de voz del teléfono (Android 11+),
// y número de versión de la app tomado de package.json.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const manifestPath = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
let m = fs.readFileSync(manifestPath, 'utf8');

const perms = ['android.permission.RECORD_AUDIO', 'android.permission.INTERNET'];
for (const p of perms) {
  if (!m.includes(`android:name="${p}"`)) {
    m = m.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`);
  }
}
if (!m.includes('android.speech.RecognitionService')) {
  m = m.replace('</manifest>', '    <queries>\n        <intent>\n            <action android:name="android.speech.RecognitionService" />\n        </intent>\n    </queries>\n</manifest>');
}
fs.writeFileSync(manifestPath, m);

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');
let g = fs.readFileSync(gradlePath, 'utf8');
const runNumber = parseInt(process.env.GITHUB_RUN_NUMBER || '1', 10);
g = g.replace(/versionCode\s+\d+/, `versionCode ${runNumber}`);
g = g.replace(/versionName\s+"[^"]*"/, `versionName "${pkg.version}"`);
fs.writeFileSync(gradlePath, g);

// Android 15 dibuja la app debajo de la barra de estado: se pide que no lo haga (la parte de arriba se veía cortada)
const stylesPath = path.join(root, 'android', 'app', 'src', 'main', 'res', 'values', 'styles.xml');
if (fs.existsSync(stylesPath)) {
  let st = fs.readFileSync(stylesPath, 'utf8');
  if (!st.includes('windowOptOutEdgeToEdgeEnforcement')) {
    st = st.replace(/(<style name="AppTheme\.NoActionBar"[^>]*>)/, '$1\n        <item name="android:windowOptOutEdgeToEdgeEnforcement" tools:targetApi="35">true</item>');
    if (!st.includes('xmlns:tools')) st = st.replace('<resources>', '<resources xmlns:tools="http://schemas.android.com/tools">');
    fs.writeFileSync(stylesPath, st);
  }
}

console.log('Android listo: micrófono habilitado, versión', pkg.version, '(' + runNumber + ')');
