// Ajustes extra para la versión de Google Play (workflow play.yml):
// Google pide que las apps nuevas apunten a Android 16 (API 36) desde el 31/08/2026.
// Capacitor 7 trae 35 de fábrica: se sube compileSdk y targetSdk a 36.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const SDK = 36;
const vars = path.join(root, 'android', 'variables.gradle');
let v = fs.readFileSync(vars, 'utf8');
v = v.replace(/compileSdkVersion\s*=\s*\d+/, `compileSdkVersion = ${SDK}`).replace(/targetSdkVersion\s*=\s*\d+/, `targetSdkVersion = ${SDK}`);
fs.writeFileSync(vars, v);
const gp = path.join(root, 'android', 'gradle.properties');
let p = fs.existsSync(gp) ? fs.readFileSync(gp, 'utf8') : '';
if (!/suppressUnsupportedCompileSdk/.test(p)) p += `\nandroid.suppressUnsupportedCompileSdk=${SDK}\n`;
fs.writeFileSync(gp, p);
console.log(v.split('\n').filter(l => /Sdk/.test(l)).join('\n'));
