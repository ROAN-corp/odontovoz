# OdontoVoz · nota de traspaso para Claude

Leé esto antes de tocar nada. Versión actual: **1.17.1** (compilación 1.72.1), noviembre 2026. Esta nota es corta a propósito (cada mensaje la lee entera): el historial completo por versión está en `docs/HISTORIA.md` y el detalle en `LEEME.md`; buscalos con grep solo cuando haga falta.

## Quiénes y qué
- Producto de **ROAN corp** (Rodrigo y su socio, odontólogos de la Patagonia). Contacto: somosroan@gmail.com. GitHub: organización **ROAN-corp**.
- OdontoVoz: gestión odontológica (agenda, pacientes, historia clínica, odontograma, periodontograma, presupuestos, cobros, laboratorio, fotos, firma) **manejada por voz**. Interfaz en castellano rioplatense (vos, «agendá», «tocá»).
- Hablale al usuario en castellano rioplatense, simple y sin jerga técnica.

## Direcciones
- Web pública (landing): https://odontovoz.com.ar/ (fuente: `sitio/`; desde 1.52.1, la vieja roan-corp.github.io/odontovoz redirige)
- App web: https://odontovoz.com.ar/app/
- Panel de licencias: https://odontovoz.com.ar/admin.html (admins: rodribobadilla5630@gmail.com y angelagatielo@gmail.com, tabla `ov_admins`)
- APK: https://github.com/ROAN-corp/odontovoz/releases/latest/download/OdontoVoz.apk
- Supabase: proyecto `hcppfvioiaaejayzzhpa` (org ROAN). Site URL `https://odontovoz.com.ar/app/` (Redirect URLs: odontovoz.com.ar/**, www.odontovoz.com.ar/** y las viejas). La URL y la clave **publicable** están en `OV_CONFIG` dentro de `index.html`.

## Cómo está armado
- La app es **un solo archivo**: `index.html` (`window.App`, alias `A`; estado `A.S`).
- Los módulos nuevos van en `src/*.js` y se copian dentro de `index.html` con `node scripts/inline-src.js` (orden en ese script: ovcmd, app5 … app14, app15, app16, app17, app18, app19, app20, app21, app22, app23, app24, app25, app26, app27, app28, app29, app30, app31, app32, app33, app34, app35, app36, app37, app38, app39, app40, app41, app42, app43, app44, app45, app46, app47, app48, app49, app50, app51, app52, app53, app54, app55 … app100). **Editá siempre `src/` y después corré el script.** La primera línea de cada módulo empieza con `/* =====` y ninguna otra línea puede empezar así.
- Acciones del HTML: `data-act` / `data-chg` / `data-in` / `data-sub` → `A.acts` / `A.chg` / `A.ins` / `A.subs`. Modales: `A.modalFns`, `A.modalShell`.
- `A.refresh` se redefine en la sección «arranque»: los módulos **no** deben envolverlo; usen `A.afterRefresh`, `A.load` o funciones de render.
- Voz: `src/ovcmd.js` (parser, `window.OVCmd`, testeado con `node tests/ovcmd.test.js`) + `A.cmd.exec(texto)` que devuelve `{ok, msg}`; los módulos lo envuelven (`const execPrev = A.cmd.exec; A.cmd.exec = …`). `src/app14.js` tiene el periodontograma y los comandos rioplatenses extra.
- Nube: Supabase REST (`src/cloud.js`), tabla `ov_records` con merge de 3 vías, fotos en el bucket privado `ov-media`. Licencias en `ov_accounts` (`src/lic.js`, SQL en `supabase/`).
- PDF: `A.pdfDoc_(titulo)` (jsPDF desde cdnjs).
- Convención del odontograma: azul = a realizar, rojo = existente/realizado.
- Legal: la firma del paciente es **firma electrónica** (Ley 25.506 art. 5), no firma digital. HC se conserva 10 años (Ley 26.529 art. 18).

## Publicar una versión
1. Subir la versión. **Desde el 16/11/2026 hay dos números:** el visible (`A.VERSION` en `src/app10.js`, `NAME` en `sw.js`, `package.json`, tag y nombre en `.github/workflows/apk.yml`; arrancó en 1.0) y la compilación interna que nunca baja (`A.VBUILD` en `src/app10.js` y `VERSION` de `sw.js`, `odontovoz-1.55.0` en la 1.0; subirla siempre). En Novedades (`app55`) cada versión nueva lleva `v` (visible) y `b` (compilación). Anotar los cambios en `LEEME.md`.
2. Correr `node scripts/inline-src.js`, `node tests/ovcmd.test.js` y `node tests/ovcmd.charla.test.js`; probar con Playwright en celular (390×844) y PC (1366×860).
3. Subir a `main`: el workflow `web.yml` publica la web y `apk.yml` compila y firma el APK (keystore en los secrets del repo; **nunca** subir el keystore).
4. Verificar la web en vivo y que la última release sea la nueva.

## Reglas acordadas con el usuario
- Nunca pedir ni manejar la service_role, la secret key ni la contraseña de la base de datos. Las contraseñas (por ejemplo, la de aplicación de Gmail para SMTP) las pega el usuario.
- No crear cuentas ni escribir contraseñas en formularios. Pedir permiso antes de cambiar configuraciones de servicios.
- No repetir credenciales en el chat.

## Datos de negocio
- Precios en dólares (USD 1 = $1.570, `DOLAR` en `src/app25.js`): Profesional USD 17 (+3 por consultorio extra), Centro USD 35 (+3 por profesional extra), Empresa USD 82. Prueba 7 días (14 para las primeras 50). Mantener iguales `PLAN` de `app19.js`, `PRICE`/`USD` de `app25.js`, `ov_limits()` del SQL, `DEF` de `admin.html`, tarjetas de `sitio/index.html` y `sitio/terminos.html`.
- **Registro DNDA (hecho):** OdontoVoz 1.0 inscripto en el Registro de Obra Publicada – Software el 18/11/2026, legajo **RL-2026-111680189-APN-DNDA#MJ** (expediente EX-2026-110910062- -APN-DNDA#MJ; constancia RE-2026-111680201-APN-DNDA#MJ en TAD; obra `OdontoVoz-1.0-deposito.zip`, SHA-256 cf24222f…).
- Soporte WhatsApp: Rodrigo 5492984513279 y Angel 5492984764428 (`A.SUPPORT` en `src/app5.js`).

## Mapa rápido de módulos (lo más tocado últimamente)
- Cobros desde la evolución: `app40` (parser `A.pracParse`, `poGo`, cola `pcList`/`pcPay`), `app74` (el `MF.pracOk` que se ve), `app89` («¿Quién cobra?» primero, editor de recepción con coseguro/diferencial/cubierto/particular/nada, `A.evoRewrite`, simple/compuesta/compleja), `app90` (varios medios de pago y recargos por cuotas), `app80` (cobrar antes de atender).
- Caja y liquidaciones: `app86`/`app87` (caja en 6 secciones), `app64`/`app65` (obras sociales que deben, `cobAlloc`, liquidaciones).
- Obras sociales: `app7` (editor y aranceles), `app67` (Federación de Río Negro, `sitio/aranceles/forn.json`), `app91`/`app92` (planes por obra social `o.pl`, plan del paciente `p.plan`, plan al cobrar).
- Ventana de actualización: `app92` (`#updPop`). Novedades: `app55` (sumar arriba cada versión). Importes con centavos: `A.parseMoney`/`A.moneyIn` en `index.html`.
- Permisos por puesto: `app66` (`A.isBoss`, `A.isCarga`); servidor `ov_keep_old` (recepción no modifica cargos guardados: las correcciones van como `ajuste`).

## Ojo (errores que ya pasaron)
- El `MF.pracOk` visible es el de `app74`. Las cadenas de envoltorios (`poGo`, `ppGo`, `pracParse`) se encadenan por orden de módulo.
- Solo tokens del tema en CSS (`--surface`, `--surface-2`, `--ink`, `--ink-2`, `--line`, `--accent`, `--accent-ink`, `--accent-soft`, `--ok`, `--warn`, `--red`); nunca `#fff` fijo. Evitar clases genéricas (`off`, `on`, `bad`).
- Comparar datos de la nube siempre con `J()` de `cloud.js`, nunca `JSON.stringify`.
- En `css.textContent = '…' + '…'` una coma en lugar de `+` deja solo el último pedazo.
- Si cambia la primera línea de un módulo, `inline-src.js` lo agrega como nuevo: borrar el bloque viejo de `index.html`.
- Antes de subir, `git pull --rebase` de `main` (puede haber otra conversación trabajando).
- Las capturas de Playwright guardarlas en el borrador (scratchpad), nunca dentro del repo.

## Para gastar poco
- El usuario paga por tokens: respuestas cortas, pocas capturas, pruebas proporcionales al cambio (los cobros y los datos de pacientes sí se prueban bien). Leer solo las partes de los archivos que hacen falta (grep primero).
- Publicar = subir versión (ver arriba), `inline-src`, tests, commit, push y avisar en una o dos líneas.

## Pendiente
- **Marca INPI** ODONTOVOZ (14/11/2026, clases 9 y 42, a nombre de Rodrigo): esperar números de acta y notificaciones.
- **Play Store**: D-U-N-S pedido el 17/11/2026 (hasta 30 días hábiles; datos: BOBADILLA RODRIGO NICOLAS, CUIT 20-36871177-3, Manuel Belgrano 155, Allen, Río Negro 8328). Ya listo de nuestro lado: `.aab` con API 36 (`.github/workflows/play.yml`), capturas en `play/`, textos y formularios en `docs/PLAY.md`. Después: cuenta de Play Console de empresa (la crea y paga el usuario), «Usar mi propia clave» con `odontovoz-firma.jks` (nunca subirlo), cuenta de prueba para revisores (la crea el usuario).
- **IA de historias de papel**: el usuario crea la clave en console.anthropic.com (límite USD 10/mes) y la pega en Supabase › Edge Functions › Secrets como `ANTHROPIC_API_KEY`. Después probar con 20–30 historias y recién ahí poner precio.
- Valores de los planes de OSPe (604, etc.): cargarlos cuando el usuario los pase (la Federación de RN no los publica por plan; Neuquén no publica aranceles).
- Probar el push con la app cerrada en dos celulares.
- Página de la empresa (`roan-corp.github.io`), y lo legal: abogado, sociedad (SAS) y CUIT, facturación, AAIP.
