"""Prueba de humo de OdontoVoz (modo prueba, sin internet).
Abre la app en celular (390x844) y PC (1366x860), recorre las pantallas principales y las ventanas más usadas,
y avisa si aparece algún error de JavaScript. Las capturas van a la carpeta que se pase como argumento
(por defecto /tmp/ov-humo), NUNCA dentro del repo.

Uso:  python3 tests/ui/humo.py [carpeta_capturas]
Necesita: pip install playwright && playwright install chromium (o un Chrome instalado, ver CHROME).
"""
import asyncio, os, sys, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/ov-humo'); OUT.mkdir(parents=True, exist_ok=True)
CHROME = os.environ.get('CHROME') or next((p for p in ['/usr/bin/google-chrome', '/usr/bin/chromium'] if os.path.exists(p)), None)

PASOS = [
    ('inicio', "App.goHome()"),
    ('agenda', "App.S.tab='agenda'; App.refresh()"),
    ('turno-nuevo', "App.acts.newAppt(document.createElement('button'))"),
    ('cerrar', "App.S.modal=null; App.renderModal()"),
    ('ficha', "App.openFicha(App.PATS[0].id,'datos')"),
    ('plan', "App.openFicha(App.PATS[0].id,'plan')"),
    ('caja', "App.S.tab='caja'; App.refresh()"),
    ('liquidaciones', "App.S.tab='liq'; App.refresh()"),
    ('ajustes', "App.acts.ajOpen()"),
    ('stock', "App.S.modal=null; App.acts.stkOpen()"),
    ('recargos', "App.S.modal=null; App.acts.payRatesOpen()"),
    ('menu', "App.S.modal=null; App.renderModal(); App.acts.gear()"),
]

async def main():
    fallas = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}))
        for w, h, tag in [(390, 844, 'cel'), (1366, 860, 'pc')]:
            pg = await b.new_page(viewport={'width': w, 'height': h})
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
            await pg.goto((ROOT / 'index.html').as_uri()); await pg.wait_for_timeout(2500)
            await pg.evaluate("document.querySelectorAll('#intro,.intro').forEach(x=>x.remove()); App.S.modal=null; App.renderModal()")
            for nombre, js in PASOS:
                try:
                    await pg.evaluate(js); await pg.wait_for_timeout(400)
                    await pg.screenshot(path=str(OUT / f'{tag}-{nombre}.png'))
                except Exception as e:
                    errs.append(f'{nombre}: {e}')
            print(tag, 'versión', await pg.evaluate('App.VERSION'), '· errores:', errs or 'ninguno')
            fallas += len(errs)
        await b.close()
    print('Capturas en', OUT)
    sys.exit(1 if fallas else 0)

asyncio.run(main())
