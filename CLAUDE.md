# OdontoVoz · nota de traspaso para Claude

Leé esto antes de tocar nada. Versión actual: **1.47.0** (compilación 1.102.0), noviembre 2026. Esta nota es corta a propósito (cada mensaje la lee entera): el historial completo por versión está en `docs/HISTORIA.md` y el detalle en `LEEME.md`; buscalos con grep solo cuando haga falta.

## Quiénes y qué
- Producto de **ROAN corp** (Rodrigo y su socio, odontólogos de la Patagonia). Contacto: somosroan@gmail.com. GitHub: organización **ROAN-corp**.
- OdontoVoz: gestión odontológica (agenda, pacientes, historia clínica, odontograma, periodontograma, presupuestos, cobros, laboratorio, fotos, firma) **manejada por voz**. Interfaz en castellano rioplatense (vos, «agendá», «tocá»).
- Hablale al usuario en castellano rioplatense, simple y sin jerga técnica.

## Direcciones
- Web pública: https://odontovoz.com.ar/ con páginas propias (`/funciones/`, `/planes/`, `/probala/`, `/descargas/`, `/tutoriales/`, `/preguntas/`, `/seguridad/`, `/contacto/`) y menú lateral; fuente en `sitio/` (CSS en `sitio/css`, JS en `sitio/js`; los planes y el contacto se editan en `sitio/js/datos.js`; desde 1.52.1, la vieja roan-corp.github.io/odontovoz redirige)
- App web: https://odontovoz.com.ar/app/
- Panel de licencias: https://odontovoz.com.ar/admin.html (admins: rodribobadilla5630@gmail.com y angelagatielo@gmail.com, tabla `ov_admins`)
- APK: https://github.com/ROAN-corp/odontovoz/releases/latest/download/OdontoVoz.apk
- Supabase: proyecto `hcppfvioiaaejayzzhpa` (org ROAN). Site URL `https://odontovoz.com.ar/app/` (Redirect URLs: odontovoz.com.ar/**, www.odontovoz.com.ar/** y las viejas). La URL y la clave **publicable** están en `OV_CONFIG` dentro de `index.html`.

## Cómo está armado
- La app es **un solo archivo**: `index.html` (`window.App`, alias `A`; estado `A.S`).
- Los módulos nuevos van en `src/*.js` y se copian dentro de `index.html` con `node scripts/inline-src.js` (orden en ese script: ovcmd, app5 … app14, app15, app16, app17, app18, app19, app20, app21, app22, app23, app24, app25, app26, app27, app28, app29, app30, app31, app32, app33, app34, app35, app36, app37, app38, app39, app40, app41, app42, app43, app44, app45, app46, app47, app48, app49, app50, app51, app52, app53, app54, app55 … app130). **Editá siempre `src/` y después corré el script.** La primera línea de cada módulo empieza con `/* =====` y ninguna otra línea puede empezar así.
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
- Precios en dólares (desde 1.27; USD 1 = $1.700 de referencia, el dólar oficial se actualiza solo los lunes: `.github/workflows/dolar.yml` → `sitio/dolar.json`, que leen la web y `A.DOLAR` en `src/app25.js`): Profesional USD 22,21 (= $37.753; +3 por consultorio extra), Consultorio o Centro USD 45 todo incluido (hasta 5 profesionales y 6 equipos), Empresa USD 96. Sin descuentos fijos («consultá por descuentos disponibles»). Prueba 7 días (14 para las primeras 50). Mantener iguales `PLAN` de `app19.js`, `USD` de `app25.js`, `ov_limits()` del SQL (`supabase/planes-1-27.sql`), `DEF` de `admin.html`, `sitio/js/datos.js` y `sitio/terminos.html`.
- **Registro DNDA (hecho):** OdontoVoz 1.0 inscripto en el Registro de Obra Publicada – Software el 18/11/2026, legajo **RL-2026-111680189-APN-DNDA#MJ** (expediente EX-2026-110910062- -APN-DNDA#MJ; constancia RE-2026-111680201-APN-DNDA#MJ en TAD; obra `OdontoVoz-1.0-deposito.zip`, SHA-256 cf24222f…).
- Soporte WhatsApp: Rodrigo 5492984513279 y Angel 5492984764428 (`A.SUPPORT` en `src/app5.js`).

## Mapa rápido de módulos (lo más tocado últimamente)
- Cobros desde la evolución: `app40` (parser `A.pracParse`, `poGo`, cola `pcList`/`pcPay`), `app74` (el `MF.pracOk` que se ve), `app89` («¿Quién cobra?» primero, editor de recepción con coseguro/diferencial/cubierto/particular/nada, `A.evoRewrite`, simple/compuesta/compleja), `app90` (varios medios de pago y recargos por cuotas), `app80` (cobrar antes de atender).
- Caja y liquidaciones: `app86`/`app87` (caja en 6 secciones), `app64`/`app65` (obras sociales que deben, `cobAlloc`, liquidaciones).
- Obras sociales: `app7` (editor y aranceles), `app67` (Federación de Río Negro, `sitio/aranceles/forn.json`), `app91`/`app92` (planes por obra social `o.pl`, plan del paciente `p.plan`, plan al cobrar).
- Ventana de actualización: `app92` (`#updPop`). Novedades: `app55` (sumar arriba cada versión). Importes con centavos: `A.parseMoney`/`A.moneyIn` en `index.html`.
- Permisos por puesto: `app66` (desde 1.34 «Recepción» se llama «Secretaría»: administra agenda/cobros/caja/cuentas; solo se le bloquea lo clínico y borrar pacientes; SQL `supabase/secretaria.sql`) (`A.isBoss`, `A.isCarga`); servidor `ov_keep_old` (recepción no modifica cargos guardados: las correcciones van como `ajuste`).

## Ojo (errores que ya pasaron)
- El `MF.pracOk` visible es el de `app74`. Las cadenas de envoltorios (`poGo`, `ppGo`, `pracParse`) se encadenan por orden de módulo.
- Aspecto «premium» (1.19): `app102` (CSS al final del body, letra Inter, degradados y adornos del odontograma con `MutationObserver`). Los estilos nuevos que tengan que pisar a los base van al final del `<body>`, no al `<head>`.
- Foto del paciente (1.20): `app103` (`pd.avatar` + `pd.photoOK`, ventana `avEdit`, foto chiquita en buscador y lista). Ojo: en el odontograma, todo adorno encima de las caras necesita `pointer-events: none` (en 1.19 el `selbox` con relleno frenaba los toques).
- Notas de facturación a obras sociales (1.21): `app106` (`pd.factNotes`, tarjeta al final de Datos e historia y última nota en la ficha resumida). Encabezado con N° de afiliado y últimas 3 evoluciones en la resumida: `app107`. La resumida (`#panelHost`) recibe bloques de varios módulos en distintos momentos: lo que se ubique ahí hay que reubicarlo después de `rAF`.
- Mudanza (1.21.2): `app53` `match()` **nunca adivina** el paciente (lo dudoso no se carga y se lista al final); `sitio/mudanza.js` no mezcla registros con el mismo `id` si la identidad no coincide; `app108` «No es de este paciente» para mover o anular notas importadas. Ante cualquier cambio en la mudanza, probar con homónimos y con ids repetidos. «Revisar una mudanza ya hecha» (1.21.3): no crea pacientes salvo que se tilde, cada pase se destilda, se deshace (`odontovoz.mudUndo`) y no toca notas `mvd`, anuladas ni propias.
- Fichas FORN (1.22): `app109` (`pd.forn`, tarjeta en Datos e historia, Menú › FORN · Presentación mensual (en el menú principal, arriba de «Cambios de hoy»), PDF apaisado como la ficha de papel con dorso periodontal; código con lista desplegable por obra social desde `forn.json`; logo de la FORN embebido, falta confirmar con la Federación el permiso de uso). Desde 1.23, «+ Ficha nueva» con o sin paciente: las sin paciente se guardan en la clave sincronizada `fornfree` (`A.cloudExtra`) y se pueden asignar después. Prueba: el PDF necesita jsPDF (sin internet, inyectarlo desde `node_modules/jspdf/dist/jspdf.umd.min.js`).
- Agenda (1.29): `app114` (bloquear arrastrando con `.gb` + pointer events y burbuja de espacio libre que envuelve `A.acts.gbClick`; `odontovoz.holdMs`).
- Stock por producto (1.40): `app125` (agregar productos concretos desde el catálogo de Rutiden, hablando o a mano; `spec:true`, `ck` = tipo del kit que usan las recetas; `A.rutFind`/`A.rutProd` en `app113`, `A.stkTypes` en `app43`).
- Tutoriales (1.39): se graban con `scripts/tutoriales/rec.js NOMBRE` (Playwright + voz Piper con onnxruntime y espeak-ng; ver README del script) y van a `sitio/video/tut-NOMBRE.mp4` + `poster-tut-NOMBRE.jpg`. Hay que volver a grabarlos cuando cambie mucho la app.
- Animaciones de ventanas (1.38): `app123` (solo al abrir/cambiar de ventana; al cerrar retrasa 150 ms `A.acts.closeModal` solo si no cambió `S.modal`; usar `translate`/`scale`, no `transform`).
- Agenda PC/tablet (1.36): `app24` (calendario de 3 meses con `am-off` rojo para días sin atención y `A.offWhy`) y `app122` (vacaciones: cancelar turnos y avisar; etiqueta «Vacaciones» en las columnas).
- Ortodoncia automática (1.35): `app121` (envuelve `A.touchPd`; crea el control desde la nota de evolución y agrega «Agregar foto» a la nota).
- Ortodoncia (1.32): `app117` (solapa `orto` agregada a `TABS` de index.html; `pd.orto`, fotos `kind:'orto'`, notas con `orto`; las fotos de la evolución se ponen después de dibujar la línea de tiempo, que otro módulo reagrupa por mes).
- Agenda (1.31): `app116` (arrastrar paciente de la burbuja a la grilla → `A.openNewAppt` + `A.acts.naSave`; asa `.rz` en cada `.blk` para cambiar la duración con `A.conflicts`/`A.mutate`).
- Stock rediseñado (1.30): `app115` (envuelve `A.stkHTML`: pestañas Mi stock / Comprar stock / Movimientos / Consumo; KPIs, buscador, orden, −/+ rápido, costo por unidad `i.cost`; usa `A.stkApi` de `app43`).
- Stock › Rutiden (1.28): `app113` (catálogo `sitio/catalogos/rutiden.json` armado por `scripts/rutident/build.py`; precios, pedido y WhatsApp en `A.EMP.stock._cfg.rut`). Hace falta el permiso de Rutiden para el logo y el listado, y su WhatsApp. Surdental después.
- Fecha de nacimiento (1.27.1): `app112` reemplaza el calendario por día/mes/año en todo `input[type=date]` de nacimiento (MutationObserver; el input original queda oculto y manda).
- Sello y firma del profesional (1.26): `app111` (`p.cred`, `A.frnStamp`, `A.frnCode`, `A.frnSeal`, `A.frnCover`). La ficha FORN presentada queda **sellada** (no se edita; corrección = ficha nueva). Es firma electrónica registrada, no digital: no decir «validada».
- Socias y cajas privadas: diseño en `docs/SOCIAS-CAJAS-PRIVADAS.md` (1.23.3: avisos por profesional propio, `PREF`/`proSet` en `app12`; 1.24.0: acuerdos de alquiler/socia en `app65` y caja privada **blanda** en `app110`, que no oculta aún la caja del día ni la cuenta del paciente; 1.25.0: puesto «Dueño/a (socio/a)» (`ov_members.socio`, SQL en `supabase/socio.sql`, `A.isSocio` en `app33`; desde 1.25.1 el socio es como el dueño en pantalla: `mb()` da `null` y `A.memberRaw()` su ficha real) y «Mi caja» Visible/Privada/Solo yo (`cfg.priv`, `cfg.solo`; `A.privFrom` filtra pagos por `e.pro` en caja, inicio y liquidaciones); faltan privacidad dura `priv:<uid>`, caja del consultorio y reparto entre socias).
- Equipo (1.23.1): `app33`. Un usuario con puesto Administración puede «Atender como» un profesional (`m.pro`): `A.mbPro()` da su profesional de cualquier puesto, `enforce()` le abre su agenda y firma por defecto como él (`A.startSign`). Socias del mismo consultorio: una Dueña (mail del consultorio) y cada una con su propio usuario Administración, para que cada nota quede a su nombre. El mail de la cuenta es solo el usuario de entrada: no hay un mail de avisos aparte. Desde 1.23.2, el **dueño** que también atiende elige «Atendo como…» en Usuarios del equipo (`A.CFG.ownerPro`, `A.ownerPro()`, `A.myProId()`): agenda, firma, FORN y firma de las notas (`A.actor`) a su nombre. Hay un solo dueño por cuenta (el plan, el cambio de cuenta y los usuarios son solo suyos).
- WhatsApp en la PC (1.18.2): `app51` (`odontovoz.waPc`: WhatsApp Web o la app de escritorio `whatsapp://`). WhatsApp Web no deja reusar su pestaña.
- El inicio se redibuja también sin `afterRefresh` (`app6` cada minuto, `app35` al sincronizar): lo que se agregue al inicio después de dibujarlo tiene que reponerse con un `MutationObserver`, no solo en `afterRefresh` (1.20.3, logo del saludo).
- No usar `backdrop-filter` (desenfoque) en barras fijas ni fondos de ventanas: traba el desplazamiento en Android (sacado en 1.20.1).
- Solo tokens del tema en CSS (`--surface`, `--surface-2`, `--ink`, `--ink-2`, `--line`, `--accent`, `--accent-ink`, `--accent-soft`, `--ok`, `--warn`, `--red`); nunca `#fff` fijo. Evitar clases genéricas (`off`, `on`, `bad`).
- Comparar datos de la nube siempre con `J()` de `cloud.js`, nunca `JSON.stringify`.
- En `css.textContent = '…' + '…'` una coma en lugar de `+` deja solo el último pedazo.
- Si cambia la primera línea de un módulo, `inline-src.js` lo agrega como nuevo: borrar el bloque viejo de `index.html`.
- Antes de crear un `A.acts.X` / `A.chg.X` nuevo, buscar con grep que ese nombre no exista (en 1.12 `naPick` pisó la elección de paciente del turno nuevo).
- Antes de subir, `git pull --rebase` de `main` (puede haber otra conversación trabajando).
- Las capturas de Playwright guardarlas en el borrador (scratchpad), nunca dentro del repo.

## Para gastar poco
- El usuario paga por tokens: respuestas cortas, pocas capturas, pruebas proporcionales al cambio (los cobros y los datos de pacientes sí se prueban bien). Leer solo las partes de los archivos que hacen falta (grep primero).
- Publicar = subir versión (ver arriba), `inline-src`, tests, commit, push y avisar en una o dos líneas.

## Pendiente
- **Migración a la cuenta de Claude de la empresa** (20/11/2026): pasos y mensaje inicial en `docs/MIGRACION.md`. Prueba de pantallas: `python3 tests/ui/humo.py /tmp/ov-humo`.
- **Marca INPI** ODONTOVOZ (14/11/2026, clases 9 y 42, a nombre de Rodrigo): esperar números de acta y notificaciones.
- **Play Store**: D-U-N-S pedido el 17/11/2026 (hasta 30 días hábiles; datos: BOBADILLA RODRIGO NICOLAS, CUIT 20-36871177-3, Manuel Belgrano 155, Allen, Río Negro 8328). Ya listo de nuestro lado: `.aab` con API 36 (`.github/workflows/play.yml`), capturas en `play/`, textos y formularios en `docs/PLAY.md`. Después: cuenta de Play Console de empresa (la crea y paga el usuario), «Usar mi propia clave» con `odontovoz-firma.jks` (nunca subirlo), cuenta de prueba para revisores (la crea el usuario).
- **IA de historias de papel** (plan completo en `docs/HC-PAPEL-IA.md`; **método para activarla cuando un cliente paga: §7**; no encender la clave de Anthropic antes de armar el control de saldo por cuenta, y no tocar `supabase/functions/hc-read` hasta el primer pago porque se despliega solo): el usuario crea la clave en console.anthropic.com (límite USD 10/mes) y la pega en Supabase › Edge Functions › Secrets como `ANTHROPIC_API_KEY`. Después probar con 20–30 historias, medir costo por hoja y recién ahí poner precio (propuesta: 500/2.000/5.000 hojas a USD 49/149/299, primeras 100 gratis; tope diario `HC_READ_MAX` 600 hojas).
- Valores de los planes de OSPe (604, etc.): cargarlos cuando el usuario los pase (la Federación de RN no los publica por plan; Neuquén no publica aranceles).
- Probar el push con la app cerrada en dos celulares.
- Página de la empresa (`roan-corp.github.io`), y lo legal: abogado, sociedad (SAS) y CUIT, facturación, AAIP.
