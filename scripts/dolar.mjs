// Baja el dólar oficial de Argentina (venta) y lo guarda en sitio/dolar.json. Lo usan la web y la app para mostrar los precios en pesos.
// Si falla la consulta, deja el archivo como estaba. Fuente: dolarapi.com (dólar oficial).
import fs from 'node:fs';
const out = process.argv[2] || 'sitio/dolar.json';
const FUENTES = ['https://dolarapi.com/v1/dolares/oficial', 'https://api.bluelytics.com.ar/v2/latest'];
async function bajar() {
  for (const u of FUENTES) {
    try {
      const r = await fetch(u, { headers: { accept: 'application/json' } }); if (!r.ok) continue;
      const d = await r.json();
      const v = +(d.venta || (d.oficial && d.oficial.value_sell));
      if (v > 500 && v < 100000) return { usd: Math.round(v * 100) / 100, fuente: new URL(u).hostname };
    } catch (e) { /* prueba con la siguiente */ }
  }
  return null;
}
const nuevo = await bajar();
if (!nuevo) { console.log('No se pudo bajar el dólar: queda el valor anterior.'); process.exit(0); }
let viejo = null; try { viejo = JSON.parse(fs.readFileSync(out, 'utf8')); } catch (e) { /* primera vez */ }
if (viejo && viejo.usd === nuevo.usd) { console.log('Sin cambios: USD 1 = $' + nuevo.usd); process.exit(0); }
const hoy = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
fs.writeFileSync(out, JSON.stringify({ usd: nuevo.usd, fecha: hoy, fuente: nuevo.fuente, nota: 'Dólar oficial (venta) de Argentina. Se actualiza los lunes.' }, null, 2) + '\n');
console.log('Dólar actualizado: USD 1 = $' + nuevo.usd + ' (' + hoy + ')');
