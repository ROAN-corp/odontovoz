# Odonto Voz 4.1: cómo obtener el APK

Este proyecto arma el APK de Odonto Voz automáticamente en GitHub (gratis). No hace falta instalar nada en tu computadora. Cada vez que subas una versión nueva de `index.html`, GitHub genera un APK nuevo y lo deja listo para descargar desde el teléfono.

Conviene hacerlo desde una computadora la primera vez. Son unos 15 minutos.

## Lo que viene en el proyecto

- `index.html`: la app completa (la misma que usás en Claude, con los arreglos para teléfono).
- `.github/workflows/apk.yml`: la receta que compila y firma el APK.
- `.github/workflows/web.yml`: publica además la app como página web instalable.
- `assets/` e `icon-*.png`: ícono y pantalla de inicio.
- `manifest.webmanifest` y `sw.js`: para instalarla desde el navegador y que funcione sin conexión.
- `scripts/`: preparan la carpeta de la app y dan permiso de micrófono en Android.

La clave de firma viene en un archivo aparte (`clave-firma-odontovoz.zip`). **No la subas a GitHub.**

## Paso 1: crear la cuenta y el repositorio

1. Entrá a github.com y creá una cuenta gratuita (si no tenés).
2. Tocá **New repository**. Nombre: `odontovoz`. Elegí **Public** (así podés descargar el APK desde el teléfono sin iniciar sesión). Tocá **Create repository**.

## Paso 2: cargar la clave de firma (antes de subir los archivos)

La clave hace que cada APK nuevo se instale **encima** del anterior sin perder los datos.

1. Abrí `clave-firma-odontovoz.zip`.
2. En el repositorio: **Settings → Secrets and variables → Actions → New repository secret**.
3. Creá dos secretos:
   - Nombre `ANDROID_KEYSTORE_BASE64`: pegá todo el contenido de `ANDROID_KEYSTORE_BASE64.txt`.
   - Nombre `ANDROID_KEYSTORE_PASSWORD`: pegá el contenido de `ANDROID_KEYSTORE_PASSWORD.txt`.
4. Guardá el zip de la clave en un lugar seguro (por ejemplo, en tu mail o en un pendrive). **Si se pierde, no se van a poder publicar actualizaciones del mismo APK**: habría que desinstalar y empezar de nuevo.

## Paso 3: subir los archivos

1. En el repositorio, tocá **Add file → Upload files**.
2. Arrastrá **todo el contenido** de la carpeta `odontovoz-app` (incluida la carpeta `.github`; en Mac está oculta: apretá Cmd+Shift+. en el Finder para verla).
3. Tocá **Commit changes**.

## Paso 4: esperar el APK

1. Entrá a la pestaña **Actions**. Vas a ver "Generar APK de Odonto Voz" trabajando (tarda entre 5 y 10 minutos).
2. Cuando aparezca el tilde verde, andá a la pestaña **Releases** (columna derecha de la página principal del repositorio). Ahí está **OdontoVoz.apk**.
3. Desde el teléfono, el enlace directo es siempre el mismo:
   `https://github.com/TU_USUARIO/odontovoz/releases/latest/download/OdontoVoz.apk`

Si algo sale en rojo en Actions, abrí la ejecución, copiá el error y pasáselo a Claude.

## Paso 5: instalarlo en el teléfono

1. Abrí el enlace en el teléfono y descargá el APK.
2. Tocá el archivo descargado. Android va a pedir permiso para **instalar apps de orígenes desconocidos** para el navegador: activalo.
3. La primera vez que uses el dictado, la app pide permiso de micrófono: aceptalo.

Play Protect puede mostrar un aviso porque la app no viene de Play Store. Es normal en apps que se instalan directo: elegí **Instalar de todas formas**.

## La página web (opcional, también gratis)

El segundo proceso publica la app en `https://TU_USUARIO.github.io/odontovoz/`. Desde esa dirección, en Chrome del teléfono: menú → **Agregar a la pantalla de inicio**. Se actualiza sola cada vez que subís cambios. Si la primera vez falla, entrá a **Settings → Pages** y en "Source" elegí **GitHub Actions**, después volvé a ejecutarlo desde **Actions**.

## Actualizar la app

1. Reemplazá `index.html` en el repositorio (**Add file → Upload files** y subí el nuevo).
2. Esperá el tilde verde en **Actions**.
3. Descargá el APK nuevo e instalalo encima del anterior. Los datos se conservan.

## Importante sobre los datos

- Los pacientes, turnos e historias quedan guardados **dentro del teléfono**. Si desinstalás la app o borrás sus datos, se pierden.
- Hacé copias seguido: **Ajustes → Copia de seguridad → Descargar**. Con el APK, la copia se abre en el menú de compartir: guardala en Drive o mandátela por mail.
- El APK, la página web y la vista de Claude son lugares distintos y **no comparten datos** entre sí. Para pasar los datos de uno a otro usá la copia de seguridad.

## Versión 6: cuentas, nube y página web

### Qué hay de nuevo
- Botón de estado en cada turno (color según confirmó, llegó, atendido, no vino, canceló). Un toque y se cambia; también se reprograma o se carga la seña desde ahí.
- Seña bien visible: etiqueta verde «SEÑA $…» en la agenda, en el inicio y en el turno; queda como pago en la cuenta del paciente.
- Turnos atendidos tachados; la agenda del día se va moviendo sola hasta el turno actual.
- Asistente de voz con nombre a elección: Navi, Doc, Nexus, Mia, Axon, Lumina o Agenda (o uno propio). Responde en voz alta; se silencia en Menú › Asistente de voz.
- Menú escondido a la izquierda: se abre tocando la solapa o deslizando desde el borde.
- Un solo modo de uso (se quitó «atención»). Inicio del odontólogo: la agenda de hoy resumida y cuatro botones.
- Bienvenida animada la primera vez.
- Usuario y contraseña: la misma cuenta en el teléfono, la recepción y la PC, con los datos sincronizados.

### Activar las cuentas (una sola vez)
1. Crear una cuenta gratis en https://supabase.com y un proyecto nuevo. **Región: Central EU (Frankfurt)**, porque la Argentina reconoce a la Unión Europea con protección adecuada para datos personales.
2. En el proyecto: **SQL Editor** › pegar todo `supabase/schema.sql` › **Run**.
3. **Authentication › URL Configuration**: en *Site URL* y en *Redirect URLs* poner `https://roan-corp.github.io/odontovoz/`.
4. **Authentication › Providers › Email**: dejar activado «Confirm email» y poner largo mínimo de contraseña 8.
5. **Project Settings › API**: copiar *Project URL* y la clave **anon public** (la otra, *service_role*, no se comparte nunca).
6. En GitHub: **Settings › Secrets and variables › Actions › pestaña Variables**: crear `SUPABASE_URL` y `SUPABASE_ANON_KEY` con esos dos valores.
7. En GitHub: **Settings › Pages › Source: GitHub Actions** (para publicar la versión web).

### Actualizar el APK sin desinstalar
Desde la versión 6, cada compilación usa siempre la misma firma (guardada en GitHub). La primera vez que se pasa de la 5 a la 6 hay que desinstalar una única vez (antes, hacé una copia de seguridad desde Ajustes). Para que la firma sea tuya y permanente, cargá los secrets `ANDROID_KEYSTORE_BASE64` y `ANDROID_KEYSTORE_PASSWORD`.

## Versión 6.1
- **Obras sociales y aranceles** (Menú › Obras sociales y aranceles): precargadas las más usadas en Argentina y las provinciales de Neuquén (ISSN) y Río Negro (IPROSS). En cada una se tilda qué prácticas cubre (códigos del Nomenclador Nacional), cuánto paga la obra social y el coseguro. Al registrar una práctica hecha, al paciente se le carga solo el coseguro, y queda la planilla del mes para presentar (descargable).
- **Laboratorio**: pestaña nueva en la ficha (tipo de trabajo, piezas, material, color VITA, etapa, laboratorio, fechas de envío y de vuelta, costo, indicaciones) y vista de todos los trabajos en curso con los atrasados primero. El pedido se manda por WhatsApp al laboratorio.
- **Tipo de cuenta**: se cambia con un toque desde Menú › Tu cuenta, sin volver a cargar los datos.
- **Voz conversada**: después de una orden, el asistente sigue escuchando 15 segundos sin repetir el nombre («Navi, abrí la historia de Pérez» → «ahora el odontograma» → «agregá caries en 45 por oclusal»).
- **Ingreso obligatorio** con usuario y contraseña cuando la nube está activa, y PIN opcional para abrir la app en cada equipo.

## Versión 6.2
- Odontograma con **dentición temporaria** (51–55, 61–65, 71–75, 81–85) más chica debajo de la permanente; se dicta igual («caries oclusal del 55»).
- Resumen del paciente: botón **Ficha completa ›** debajo del nombre; el odontograma del resumen muestra las caras.
- **WhatsApp**: botón verde en cada turno de la agenda y del inicio; abre el chat del paciente (número en formato 549 + área + número).
- **Web en la PC**: ocupa todo el ancho y la agenda muestra el calendario del mes con los días con turnos.
- **Laboratorios**: ficha de cada laboratorio (mecánico dental, teléfono, lista de trabajos con precios). En el paciente: laboratorio + trabajo (el costo se completa solo) + precio al paciente + lo que abonó y el saldo.
- **Pantalla encendida** mientras la voz está activa.
- **Voz**: elige entre varias versiones de lo escuchado la que tiene sentido, corrige errores típicos («carie», «o clusal», «mecial») y encuentra nombres parecidos («Gonsales» → González).
- **Alta y ficha por voz**: «Navi, agregá un paciente nuevo» → «nombre…», «apellido…», «DNI…», «teléfono…», «obra social…», «guardar» → «alergia a…», «medicación…», «antecedentes…».
- Al pasar a **centro** por primera vez se pide el nombre del centro; se guarda y se puede cambiar después.
- Nuevo ícono y nombre: **OdontoVoz**.

## Versión 6.3
- Odontograma en el teléfono con los cuatro cuadrantes en su lugar (1 | 2 arriba, 4 | 3 abajo) y piezas más chicas; la temporaria debajo.
- Las pestañas de la ficha ya no vuelven al principio: queda a la vista la que elegiste.
- **Importar pacientes** (Menú › Importar pacientes): desde Bilog u otro programa, con el listado exportado a Excel o CSV. Reconoce las columnas solo, no duplica pacientes con el mismo DNI y trae una planilla modelo.
- Versión para PC: cada compilación publica también **OdontoVoz-web.html** (se abre con doble clic en Chrome o Edge).

## Versión 6.4
- Odontograma más grande en el teléfono (de borde a borde) y botón **+ Agrandar** para ver las piezas el doble (se desliza a los costados).
- **Pintar a mano** arriba del odontograma: elegís Caries, Arreglo de resina, Amalgama… y tocás la pieza. En el teléfono se abre la pieza grande para elegir la cara sin errar (se pueden marcar varias caras seguidas).
- Dictado más coloquial: «tenemos arreglo por cara vestibular del 26», «ah, también hay una caries por oclusal del 27», «tengo un arreglo de resina hecho en el 16 por vestibular», «la 47 tiene un empaste viejo», «hay que cambiar la amalgama del 46», «el 11 está roto por incisal», «hay que sacar el 48».

## Versión 6.5
- **Motivo de la consulta**: destacado arriba de todo en el resumen del paciente y del turno, debajo del nombre en la ficha y primero en «Datos e historia». Se carga con un toque (con ejemplos rápidos o dictado), al crear un paciente, al dar un turno o por voz («motivo de consulta: dolor en la muela de abajo»). Los motivos anteriores quedan guardados con su fecha.

## OdontoVoz 1.0 (primera versión con firma definitiva)
A partir de acá la numeración vuelve a empezar: 1.0, 1.1, 1.2… (las «6.x» fueron versiones de desarrollo).
Por dentro, Android usa el número de compilación (siempre creciente), así que las actualizaciones se instalan encima sin problema.

## OdontoVoz 1.1
- Nube activada (Supabase, proyecto «OdontoVoz» de la organización ROAN, región UE-Irlanda): al abrir la app se ingresa con correo y contraseña; los datos se sincronizan entre teléfono, PC y recepción.
- Versión web publicada en https://roan-corp.github.io/odontovoz/

## OdontoVoz 1.29.0 · agenda: bloquear arrastrando y burbuja en el espacio libre (25/11/2026)

- `src/app114.js`. **Bloquear arrastrando:** pointer events sobre `#gridWrap .gb` (la columna de cada profesional; `data-g0`, `--sh` = 28 px cada 15 min): se mantiene presionado (`odontovoz.holdMs`, 1 s por defecto; 0,5/1/2/4 s desde la burbuja), se arrastra hacia abajo o arriba (se alinea al turno del profesional; autoscroll en los bordes), y al soltar aparece la barra «Bloquear de 13:00 a 16:00» con − y + de un turno, motivo y botón. Mover más de 10 px antes de tiempo cancela (es un scroll). Crea el mismo `type: 'block'` que `app34` y avisa si ya había turnos. Se frena el menú del sistema y el `click` final.
- **Burbuja:** `A.acts.gbClick` envuelto (`odontovoz.bubble`; no actúa con el pegado de turnos ni con una ventana abierta): menú a la izquierda (Turno, Sobreturno, Bloquear, Nota) y a la derecha buscador y pacientes recientes (`A.searchPats`); al elegir uno se abre `A.openNewAppt` con ese paciente y la hora. En celular es una hoja desde abajo.
- Pedido de Rodrigo: «mantener presionado por 4 segundos». Lo dejé en 1 s por defecto porque 4 s se siente trabado; se puede elegir 4 s.

## OdontoVoz 1.28.0 · Stock › Rutiden (25/11/2026)

- Pedido de Rodrigo: que dentro de Stock haya una segunda solapa con la casa de insumos Rutiden (logo incluido), con su catálogo, para armar el pedido y mandárselo por WhatsApp; más adelante, lo mismo con Surdental. Los productos se agrupan (por ejemplo, un composite con todos sus colores) para no tener un stock gigante, con los precios a la derecha y el precio de compra.
- Catálogo: `scripts/rutident/lista.txt` (listado de la casa: código y nombre, **sin precios**, 2.981 productos) → `python3 scripts/rutident/build.py` → `sitio/catalogos/rutiden.json` (242 KB, 51 KB comprimido): 19 categorías, 51 marcas y 2.396 familias, 185 de ellas con variantes (colores A1-D4, medidas, números de fresa). La agrupación es por palabras clave del nombre (se ajusta en el diccionario del script). `robots.txt` no lo indexa.
- `src/app113.js`: solapa «Rutiden» de Stock (`S.stk.tab = 'rut'`; envuelve `A.stkHTML`), categorías, buscador, filtro de marca, variantes con cantidad, precios propios (`cfg.rut.p` lista y `cfg.rut.c` compra, viajan con el stock en `A.EMP.stock._cfg.rut`), pedido (`cfg.rut.cart`) y envío por WhatsApp (`cfg.rut.wa`, o la sucursal de la colaboración «Rutiden» si existe en `ov_partners`). «+ mi stock» suma el insumo con su código (`i.rut`); en «Para comprar» aparece «Pedir a Rutiden» con lo vinculado que falta. `app43` exporta `A.stkAddItem`, `A.stkFind` y `A.stkSave`.
- Para sumar otra casa (Surdental): repetir el catálogo en `sitio/catalogos/` y definir otro `P` en `app113`.
- Falta confirmar con Rutiden el permiso para usar su logo y su listado; y cargar su número de WhatsApp (se carga desde el botón «WhatsApp» de la solapa).

## OdontoVoz 1.27.1 · fecha de nacimiento en tres casilleros (24/11/2026)

- Pedido de Rodrigo: el calendario del navegador para la fecha de nacimiento es engorroso. `src/app112.js` convierte cada `input[type=date]` de nacimiento (paciente nuevo `#npB`, ficha del paciente `#pf_birth`, historia de papel `#hp_birth`, ficha FORN `data-k="birth"`, o cualquier campo cuya etiqueta diga «nacimiento») en **Día** (se escribe o se elige de la lista), **Mes** (lista con los nombres) y **Año** (se escribe; 2 cifras se completan: 85 → 1985). Salta solo de un casillero al otro y muestra la edad. Valida (31 de febrero, fecha futura, antes de 1900) y avisa en rojo.
- El `input[type=date]` original queda oculto y sigue siendo la fuente de la verdad: el módulo le pone el valor `AAAA-MM-DD` y dispara `input` y `change`, así que la edad, el guardado y el resto funcionan sin tocar nada. Si la voz u otro módulo cambia el valor, los casilleros lo siguen.

## OdontoVoz 1.27.0 · planes nuevos, dólar oficial y sitio web nuevo (24/11/2026)

- **Precios** (dólares): Profesional **22,21** (= $37.753 con USD 1 = $1.700; +USD 3 por consultorio adicional), Consultorio o Centro **45** todo incluido (hasta **5 profesionales y 6 equipos**, sin adicional por profesional) y Empresa **96**. Se sacaron los descuentos (la promoción de noviembre) y se aclara «consultá por descuentos disponibles». Sincronizados: `src/app19.js` (límites 5/6), `src/app25.js`, `admin.html` (`DEF`, abono), `sitio/js/datos.js`, `sitio/terminos.html` y `supabase/planes-1-27.sql` (**correr una vez**: `ov_limits` con 5/6).
- **Dólar oficial**: `.github/workflows/dolar.yml` corre todos los lunes, baja el dólar (dolarapi.com, con bluelytics de respaldo) con `scripts/dolar.mjs` y lo guarda en `sitio/dolar.json` (`{usd, fecha}`); republica la web. La web (`sitio/js/page.js`) y la app (`src/app25.js`, `A.DOLAR`) lo leen y calculan los pesos; si no hay internet queda el último valor guardado (`odontovoz.dolar`) o 1.700.
- **Sitio web nuevo** (`sitio/`): ya no es una sola página. Menú lateral fijo (en celular, se abre con el botón de arriba) con Inicio, Funciones, Planes, Probala gratis, Descargas, Tutoriales, Mudanza gratis, Preguntas frecuentes, Seguridad y datos y Contacto, más los botones legales de baja y arrepentimiento. Páginas: `/`, `/funciones/`, `/planes/`, `/probala/`, `/descargas/`, `/tutoriales/`, `/preguntas/`, `/seguridad/`, `/contacto/`; siguen `terminos.html`, `privacidad.html`, `baja.html`, `mudanza.html` y `turnos.html`. CSS: `sitio/css/base.css` (secciones heredadas) y `shell.css` (estructura); JS: `datos.js` (contacto, planes), `page.js`, `home.js` (demo del odontograma), `shell.js` (menú). Los enlaces viejos (`/#planes`, `/#descargas`…) redirigen a la página nueva. `scripts/build-site.js` pasa las tipografías locales también a las subcarpetas. Hay `sitemap.xml`, `robots.txt` y `404.html`.
- Pendiente de decisión: los **términos** (`terminos.html`) cambiaron de precios y se sacó la promoción de noviembre; la versión (`2026-11-16`) no se tocó. Si ya hay clientes pagando, hay que avisarles el cambio de precios con 30 días (punto 4 de los términos).

## OdontoVoz 1.26.0 · sello, firma y ficha FORN sellada (24/11/2026)

- Pedido de Rodrigo para la propuesta a la Federación: poder digitalizar todo, con el sello y la firma del profesional, y que lo presentado no se pueda tocar.
- `app111` (nuevo): bloque «Matrícula, sello y firma» en Ajustes › Profesionales (`p.cred = {sello, firma, matFoto, at, by, h}`). Las fotos del sello y la firma se pasan a PNG con fondo transparente y color de tinta (`toInk`); la de la matrícula, a JPG de 900 px. Se registran con fecha, quién y una huella SHA-256. Es firma **electrónica registrada** (Ley 25.506 art. 5), no firma digital ni «validada» por un organismo.
- Ficha FORN: `A.frnStamp` estampa firma y sello en el recuadro «Firma y sello»; el pie lleva el código de verificación (`A.frnCode`, SHA-256 de los datos de la ficha). «Marcar como presentadas» **sella** (`f.seal = {h, at, by, p}`): `cur()` de `app109` devuelve `null` y se frena toda edición, no se puede borrar ni reasignar. Si hay un error: «Hacer una ficha de corrección» (`frnCorr`, `f.corrige`). Si los datos no coinciden con el sello, el editor avisa.
- PDF mensual: nota de presentación por profesional (`A.frnCover`) con la declaración, el código del lote, la firma y el sello y la lista de fichas con su código.
- Las fichas ya marcadas como presentadas antes de esta versión no tienen sello (siguen editables).
- La foto de la matrícula viaja con el resto de los profesionales (la ven los usuarios del equipo).

## OdontoVoz 1.25.2 · «Solo yo» (24/11/2026)

- `app110`: tres niveles de caja propia en «Mis números» (`A.chg.pvMine`, selector): Visible, Privada (`cfg.priv`) y Solo yo (`cfg.solo`). `A.proSolo`/`A.soloFrom`; `privLocked`: en «Solo yo» solo el propio profesional la abre (ni el dueño de la cuenta). `A.pcList` oculta de «Para cobrar» lo de una caja «Solo yo» ajena.
- Sigue sin ocultarse: la cuenta de cada paciente y «Te deben las obras sociales» (el reparto de lo cobrado usa esas filas). Es privacidad en pantalla, no en el servidor.

## OdontoVoz 1.25.1 · el socio/a tiene los permisos del dueño (24/11/2026)

- `app33`: `mb()` devuelve `null` para un socio (pantalla y permisos como dueño); `rawMb()`/`A.memberRaw()` sigue dando su ficha (nombre, profesional). `isOwner()` es solo el dueño verdadero (el selector «Atiendo como» de la cuenta es suyo); `canTeam()` = dueño o socio. `A.mbPro`/`A.myProId` usan la ficha real. El socio no sube la clave `setup` (el servidor la rechaza).
- `supabase/socio.sql` (volver a correr): ahora también `ov_invite_create`, `ov_invite_revoke` y `ov_code_set` a nombre de la cuenta del dueño. Prueba: `node tests/sql/socio.test.mjs`.
- La caja privada de una socia no se abre desde la cuenta de otra socia (`A.privLocked`); solo el dueño de la cuenta, con aviso.
- Sigue siendo solo del dueño: plan y cobro, sueldos/metas del modo Empresa (clave `empo`), activar/desactivar Empresa por servidor no, borrar datos.

## OdontoVoz 1.25.0 · dueño/a (socio/a) y «Mi caja en privado» (24/11/2026)

- Servidor (`supabase/socio.sql`, correr una vez; probado con `node tests/sql/socio.test.mjs`): columna `ov_members.socio`, `ov_is_socio()`, `ov_member_socio()`; `ov_sub_create` (el socio crea administradores), `ov_member_set` (el socio cambia puestos y quita accesos), `ov_team` y `ov_whoami` devuelven `socio`. La socia sigue siendo `role = 'admin'`, así que todo lo que ya autorizaba al administrador (claves, fotos, WhatsApp, auditoría) sigue igual.
- `app33`: puesto «Dueño/a (socio/a)» (`isSocio`, `canTeam`): ve y maneja el equipo; en la lista y al crear aparece como puesto. El plan, el cobro y el cambio de cuenta siguen siendo solo del dueño. Los socios por invitación por mail quedan como Administración (se los marca después desde la lista).
- `app110`: «Mi caja en privado» en «Mis números» (`A.chg.pvMine`); al activarlo desde un acuerdo de porcentaje pasa a «Socia» (100%). `A.privFrom(e.pro)` oculta los cobros de otra caja privada en la caja general (`app86 pays`), el inicio (`app45`, `app13`, `app14`), la empresa (`app28`) y «Para cobrar» (`app40 paidToday`), además de Liquidaciones. La cuenta de cada paciente sigue mostrándolos (son del consultorio).
- Límite: es privacidad en pantalla, no en el servidor. Privacidad dura (clave `priv:<uid>`) sigue pendiente.

## OdontoVoz 1.24.0 · alquiler, socias y caja privada (24/11/2026)

- Diseño: `docs/SOCIAS-CAJAS-PRIVADAS.md`. Esta versión hace la parte de acuerdos y la privacidad **blanda** (en pantalla).
- `app65`: modos nuevos `socia` (100%), `mod` ahora con horas por semana (`mod.hs`), días/horarios (`mod.hor`) y valor editable; `mod.by === 'modulo'` = monto fijo por mes (`app25` lo descuenta); `alq.by` = `mes` u `hora` (por horas de agenda). `app69` copia `priv` al acuerdo del profesional.
- `app110` (nuevo): `A.proPriv(pid)` (alquila: privada salvo que se destilde; socia/otro: si la tildan; porcentaje: nunca), `A.privFrom(pid)`, `A.privLocked(pid)`. Envuelve `cobAlloc`, `liqCalc`, `liqMethods` y `render.liq`: quien no es ese profesional ve solo el alquiler. Abrir una caja privada ajena: solo desde el usuario del dueño, con aviso y registro (`empAudit`).
- **No oculta todavía:** caja del día (`app86`), cuenta del paciente, «Para cobrar», obras sociales que deben (`osDue`). Privacidad dura (clave `priv:<uid>` con regla en `ov_key_ok`) y reparto entre socias: etapas siguientes.

## OdontoVoz 1.23.3 · avisos de quien administra y atiende (24/11/2026)

- Diseño completo del modelo de socias, cajas privadas y profesionales que alquilan: `docs/SOCIAS-CAJAS-PRIVADAS.md` (se programa por etapas; esta es la etapa 1).
- `app12` (`PREF`): si quien usa la app atiende (`A.myProId()`: Administración con profesional, o dueño con «Atiendo como») y nunca eligió el filtro (`proSet`), los avisos «llegó un paciente» son solo de su profesional; si elige «Todos» en Avisos y sonidos, se guarda `proSet` y recibe todos. El push toma el mismo filtro (`p_filter_pro`, `app59`).
- `push-hook`: el aviso `cobrar` no le llega a dueño/administración que filtra por su profesional (el cobro lo hace la secretaria).
- `app33`: en la lista de usuarios se ve «Administra y atiende · profesional».

## OdontoVoz 1.23.2 · el dueño que también atiende (24/11/2026)

- Caso: dos socias dueñas y odontólogas. Un dueño no es un usuario del equipo, así que no tenía forma de quedar vinculado a un profesional: sus notas se firmaban con el **mail de la cuenta** (`A.actor()`) y la agenda, la firma de documentos y las fichas FORN no lo tenían en cuenta.
- `app33`: en «Usuarios del equipo», el dueño ve el bloque «Vos (dueño/a de la cuenta)» con «Si atendés pacientes, atendés como». Se guarda en `A.CFG.ownerPro` (se sincroniza con la cuenta, `cfg`). Nuevos `A.ownerPro()` (solo si no es un usuario del equipo) y `A.myProId()` (= `A.mbPro()` o `A.ownerPro()`). La pantalla del dueño abre en su agenda, como la de un socio. `A.startSign` y las fichas FORN (`app109`) usan `A.myProId()`.
- `app56` (`A.actor`): el dueño con profesional figura con el nombre del profesional y no con el mail.
- No se cambia el servidor ni los permisos: el dueño sigue siendo el único que maneja el plan, la cuenta y los usuarios. Hay **un solo dueño por cuenta**: no existen «varios dueños», y no hace falta porque un socio con puesto Administración que atiende (1.23.1) ve y maneja todo salvo el plan, el cambio de cuenta y la gestión de usuarios.
- Probado en celular y PC: dueño real simulado (mail del consultorio) que elige un profesional, nota firmada con su nombre, firma y ficha FORN a su nombre, un usuario del equipo ignora lo del dueño, quitar la elección vuelve a mostrar el mail. Antes del cambio, `A.myProId` no existía.
- Compilación 1.78.2.

## OdontoVoz 1.23.1 · socios con puesto Administración que también atienden (24/11/2026)

- Caso: dos socias (Vane y Mariela) en el mismo consultorio. Una es la **Dueña** (la cuenta con el mail del consultorio) y la otra entra con su propio usuario y puesto **Administración**. Antes, ese puesto veía todo pero no podía quedar vinculado a un profesional: el selector «Profesional» solo aparecía para Profesional y Asistente, y `enforce()` solo fijaba `S.me` y la agenda para esos dos.
- `app33`: el selector «Atiende como (si es odontólogo/a)» aparece también para Administración (alta de usuario, invitación y lista de personas), con la opción «— No atiende pacientes —». `enforce()` fija `S.me` y `S.proSel` también para `admin` con `pro`. Nuevo `A.mbPro()`: el profesional del usuario del equipo, de cualquier puesto. `A.startSign` envuelto: un `admin` con profesional firma por defecto como él. No hubo que cambiar el servidor: `ov_sub_create`, `ov_invite_create`, `ov_join_invite` y `ov_member_set` ya guardan `pro` para cualquier puesto.
- `app109`: la ficha FORN (con o sin paciente) toma por defecto el profesional del usuario (`A.mbPro()`); antes, `frnNewFree` leía `A.actor().pro`, que no existe.
- Los permisos no cambian: Administración sigue sin poder cambiar el plan, cambiar de cuenta ni crear usuarios, y sigue viendo caja y liquidaciones. Las notas ya salían firmadas con el nombre de cada usuario (`app56`).
- Probado en celular y PC con un usuario de equipo simulado: antes el selector no aparecía; ahora se elige, se manda `p_pro` al servidor, la agenda abre en su columna, firma y presenta FORN como ella.
- Compilación 1.78.1.

## OdontoVoz 1.23 · «Ficha nueva» en FORN, con o sin paciente (24/11/2026)

- Pedido de Rodrigo: crear fichas desde el apartado FORN y que quede registro en la organización, porque es lo que se cobra cuando pagan las obras sociales.
- `app109`. En «FORN · Presentación mensual» hay un botón **«+ Ficha nueva»** (`frnNew`):
  - **Con paciente:** se lo busca (`frnNewPat`) y se crea la ficha del mes que se está viendo, completada sola (`newFicha` + `pull`). Si ya tenía la de ese mes, se abre esa.
  - **Sin paciente:** se crea con `frnNewFree` y se completan a mano apellido, nombre y DNI (`frnP`, `f.pat`). Se guarda en un registro de la organización que se sincroniza con la nube como **`fornfree`** (`A.cloudExtra`, y en el equipo en `localStorage` `odontovoz.fornfree.<owner>`). Aparece en el listado del mes con la etiqueta «sin paciente asignado», entra en el PDF (sin odontograma ni periodontograma) y se puede borrar.
  - **Asignar** (`frnAsg`, `frnAsgPick`): la ficha pasa de `fornfree` a `pd.forn` del paciente, completa los datos que falten con los de su ficha y queda en su historial (`alog`).
- `patOf(pid, f)` da los datos del paciente para el editor, el listado y el PDF, tenga o no paciente asignado.
- Probado en celular y PC: con paciente, sin paciente, listado, PDF de 2 fichas, persistencia al recargar, clave `fornfree` en la sincronización y asignación (el registro sin paciente queda vacío).
- Compilación 1.78.0.

## OdontoVoz 1.22.3 · logo de la FORN en el menú (24/11/2026)

- `app109` (`menu()`): en la entrada del menú principal, el círculo del logo (PNG de 72 px con fondo transparente, `EMB`, 1,7 KB) hace de ícono y el logotipo «FORN | Federación Odontológica de Río Negro» (JPG de 270×77 px, `MARCA`, 10 KB) reemplaza al título, con «Presentación mensual» debajo.
- Compilación 1.77.3.

## OdontoVoz 1.22.2 · FORN en el menú principal (23/11/2026)

- `app109` (`menu()`): «FORN · Presentación mensual» pasó del grupo Ajustes, que está plegado, a `#gearMenu .dr-nav`, justo antes de `#jrBtn` («Cambios de hoy · deshacer»).
- Compilación 1.77.2.

## OdontoVoz 1.22.1 · códigos FORN en lista desplegable y logo de la Federación (23/11/2026)

- **Código de cada práctica** (`app109`): ahora es un `<select>` nativo con `optgroup` por capítulo (I Consultas … X Cirugía), como en el sistema de Frontini para OSPe, con los códigos de la obra social de la ficha. La obra social se busca con `A.fornMatch` (con `A.osOf` del paciente o el nombre que tenga la ficha). Si hay varias tablas, se juntan. Al elegir un código se completa la descripción y se muestra lo que paga la O.S. (`cov`), el valor (`total`) o el del plan. El selector «Códigos de la obra social» (`frnOsSel`, `f.fornSlug`) permite usar otra obra social de la Federación, o todas. «✎ Escribir otro código…» cambia el renglón a un campo de texto (`r.free`). Sin conexión, el código se escribe a mano. Probado con el `forn.json` real: OSDE muestra 58 códigos en 8 capítulos y OSPE, 43.
- **Logo de la FORN** (lo pasó Rodrigo; **hay que confirmar el permiso de uso con la Federación antes de vender**): JPG de 520×137 px embebido como `LOGO`. Va en el encabezado de «Presentación mensual» (con «Presentación mensual» debajo) y arriba a la izquierda en cada ficha del PDF, con la dirección al lado. Una ficha pesa unos 48 KB.
- Compilación 1.77.1.

## OdontoVoz 1.22 · Fichas FORN y presentación mensual (23/11/2026)

- Idea de Rodrigo, pensando en un convenio con la Federación Odontológica de Río Negro: que el odontólogo arme y presente en digital las fichas FORN del mes. Se tomó como modelo la ficha de papel (frente y dorso periodontal).
- `src/app109.js`. Datos en `pd.forn`: `{id, mes, pro, afil, addr, loc, tel, birth, os, rows: [{fecha, pieza, cara, cod, desc}], obs, sig, sigAt, perio, estado}`, con estado borrador, lista o presentada.
  - **En la historia clínica:** tarjeta «FORN» en Datos e historia (antes de «Facturado a obras sociales»). Arma la ficha del mes o abre la que ya existe. Al crearla trae solo lo **realizado en el mes** (`pd.tx`, `status: 'realizado'`) con su código (`A.codeFor`), pieza y caras. «Traer lo realizado» suma lo nuevo sin repetir. Los renglones se editan, los códigos se sugieren con los de `sitio/aranceles/forn.json` (`A.fornGet`) y al elegir uno se completa la descripción. Los datos del paciente que se corrigen acá (afiliado, domicilio, localidad, teléfono, nacimiento) vuelven a su ficha (`A.setProfile`). La firma del paciente va en un `canvas` (PNG) y el dorso periodontal es opcional.
  - **Menú › FORN · Presentación mensual** (`frnOpen`): fichas del mes de todos los pacientes, con filtro por odontólogo y avisos de las que no tienen firma o N° de afiliado. Desde ahí se arma el PDF con todas, se comparte (Web Share con archivo; en la app instalada, `A.saveFile` abre el menú para compartir), se arma un mail (`mailto` con el resumen; el PDF se adjunta a mano) y se marcan todas como presentadas.
  - **PDF** (jsPDF A4 apaisada, `compress: true`): resumen del mes y cada ficha con el formato del papel (encabezado de la Federación con sus datos de contacto, solo texto y sin su logo; casillas de afiliado; odontograma de 5 caras con el estado del paciente, rojo para lo existente o realizado y azul para lo que falta, X y corona; recuadro del odontólogo con la matrícula `pro.mat`; tabla de 6 renglones con la firma; consentimiento con el nombre del profesional; observaciones). Si hay más de 6 prácticas, sigue en otra hoja. El dorso lleva la profundidad de bolsa de más de 3 mm (vestibular, mesial y distal), la movilidad y el sangrado por cuadrante del último periodontograma. La firma va una sola vez por ficha (alias, `FAST`): una ficha pesa unos 26 KB.
- Para conversar con la FORN: si acepta la firma electrónica (una firma del paciente repetida en cada renglón), si quiere otro formato (planilla, sistema propio) y si hace falta el sello digital.
- Compilación 1.77.0.

## OdontoVoz 1.21.3 · revisión de la mudanza segura sobre una base que ya cambió (23/11/2026)

- Pregunta de Rodrigo: ¿se rompe algo si reviso la mudanza después de haber cargado pacientes, evoluciones y cambios? Ajustes en `app53`:
  - **Pacientes que faltan:** antes se creaban solos. Ahora solo si se tilda «Crear estos N pacientes» (`m.create`). Si la ficha se renombró, se le cambió el DNI o se unió con otra, no se encuentra, y crearla la duplicaba.
  - **Cada pase se puede destildar** (`mrPair`, `m.skip`). Los nombres llevan el DNI, para distinguir homónimos.
  - **Deshacer:** la corrección se guarda en `localStorage` `odontovoz.mudUndo` (ids de notas y turnos con `from`/`to`). «Deshacer» está en el resumen final y al abrir la revisión (`mrUndo`).
  - Las notas pasadas a mano con «No es de este paciente» quedan marcadas `n.mvd` (`app108`) y la revisión no las toca. Las anuladas y las escritas en OdontoVoz (sin `imp`) ya se excluían.
- Probado sobre una base modificada (evolución mal puesta, nota propia, anulada, pasada a mano, paciente renombrado): solo se movió la mal puesta, no se duplicó la renombrada y «Deshacer» dejó todo como estaba.
- Compilación 1.76.3.

## OdontoVoz 1.21.2 · mudanza sin evoluciones cruzadas (23/11/2026)

- Rodrigo encontró, en la evolución de algunos pacientes, notas que eran de otros, traídas con la mudanza. Hubo dos causas y las dos se arreglaron.
- **Asistente** (`sitio/mudanza.js`, `add`): los registros se guardaban por su número interno (`id`). Dos listados distintos del sistema anterior con el mismo número se **mezclaban** con `Object.assign`: el texto de una evolución quedaba con el paciente de otra, o se perdía. Ahora `ident()` junta la identidad (paciente, DNI, nombre y, en notas y turnos, la fecha, el texto o la hora) y `clash()` la compara: si no coincide, el registro se guarda aparte (`id~1`). Probado con 5 respuestas: antes quedaban 2 evoluciones (se perdían B y C), ahora quedan 4, sin repetidas.
- **Importación** (`app53`, `match()`): **ya no adivina**. Antes, con dos pacientes del mismo nombre y sin DNI se elegía el primero (`l[0]`), y un número del sistema anterior se aceptaba aunque el nombre fuera de otra persona. Ahora devuelve `{p}` si es seguro, `{amb}` si es dudoso (no se carga y va a la lista) o `{}` si no hay ninguno (se crea el paciente). Mismo nombre con otro DNI cuenta como otra persona. El resumen final muestra «No se cargaron N evoluciones…» con la lista y el motivo. Probado: las 2 notas peligrosas quedan afuera y las 3 claras entran en su ficha. Antes, la ambigua iba al primer homónimo y la contradictoria a Ana.
- **Corregir lo ya importado** (`src/app108.js` + botón en `app15`): las notas `imp` tienen «No es de este paciente». Se busca al paciente y se pasa la nota a esa ficha (con `alog` en las dos y aviso si ya estaba en el odontograma), o «No sé de quién es: anularla» (abre la anulación de siempre con el motivo escrito). Sigue estando «Revisar una mudanza ya hecha» (con el .json original).
- Compilación 1.76.2.

## OdontoVoz 1.21.1 · N° de afiliado a la vista y últimas evoluciones en la resumida (20/11/2026)

- **Facturado a obras sociales** (`app106`): pasó al final de Datos e historia (después de datos, anamnesis y evolución). Es más compacto: el formulario se abre con «+ Anotar facturación» (`ofnNew`) y se cierra al guardar o cancelar.
- **Encabezado de la ficha** (`src/app107.js`): edad · DNI · obra social (con plan) · N° afiliado (`p.afil`; si falta, dice «sin cargar» en ámbar) · teléfono. Para los Particular no se muestra el N° de afiliado.
- **Ficha resumida:** `dt/dd.kv-afil` debajo de «Cobertura» y el bloque `.evo3` con las últimas 3 notas de `pd.notes` (sin las anuladas `n.void`, ordenadas por fecha), solo para el rol profesional. Va debajo de «Qué hice hoy» y se reubica en cada pasada (`renderPanel`, `rAF` y 150 ms), porque otros módulos agregan bloques después. Se oculta la línea vieja «Últimas notas: …», que quedaba repetida.
- Probado en celular y PC: encabezado, orden de la ficha, formulario oculto y agregar nota, afiliado en la resumida, 3 últimas sin la anulada y actualización al guardar desde «Qué hice hoy».
- Compilación 1.76.1.

## OdontoVoz 1.21 · notas de facturación a obras sociales (20/11/2026)

- Pedido de Rodrigo: un registro continuo por paciente de lo que se le facturó a la obra social, para no facturar dos veces lo mismo.
- `src/app106.js`: tarjeta «Facturado a obras sociales» en Ficha › Datos e historia, debajo de «Motivo de la consulta». Cada nota tiene el mes facturado (`type=month`), la obra social (por defecto la del paciente, salvo Particular) y el texto libre. Se guarda en `pd.factNotes` (`{id, mes, os, txt, at, by}`, con `by` = `A.actor().who`) y se sincroniza con la ficha. Se ordena del mes más nuevo al más viejo y se puede editar o borrar (con confirmación en la misma tarjeta). Lo que se está escribiendo queda como borrador si la ficha se redibuja. No toca cobros, caja ni liquidaciones.
- En la ficha resumida, la última nota va dentro de `.fc-card` (otro módulo reordena los bloques del panel) y al tocarla se abre la ficha en Datos.
- Probado en celular y PC: agregar, ordenar, editar, borrar, borrador tras `A.refresh()`, persistencia tras recargar y ficha resumida, sin errores.
- Compilación 1.76.0.

## OdontoVoz 1.20.3 · el logo del saludo ya no desaparece (20/11/2026)

- El logo de «Buen día» lo agregaba `app18` (`mountLogo`) solo en `afterRefresh`. `app6` (cada minuto) y `app35` (al sincronizar) llaman a `A.render.inicio()` directamente, así que el logo desaparecía hasta el próximo refresco completo. Ahora un `MutationObserver` sobre `#view-inicio` lo repone antes de pintar, sin parpadeo. Probado: después de `A.render.inicio()` el logo está en el mismo cuadro.
- Compilación 1.75.3.

## OdontoVoz 1.20.2 · Stock con altura fija y accesos en una fila (20/11/2026)

- `src/app105.js`. **Stock:** la ventana (`.modal:has(#stkHost)`) tiene altura fija (`100dvh - 16px` en el celular, `100dvh - 32px` con tope de 900 px en la PC). Antes, en «Movimientos», pasaba de 828 a 289 px de alto.
- **Accesos directos del inicio:** `app99` les daba una base de 100 px y en el celular el cuarto bajaba a otra fila. Ahora cada uno ocupa un cuarto del ancho, con un máximo de 110 px. Probado a 360, 390 y 1366 px de ancho: una sola fila en los tres.
- Compilación 1.75.2.

## OdontoVoz 1.20.1 · desplazamiento más fluido y ventana del turno entera (20/11/2026)

- **Fluidez:** se sacó `backdrop-filter` (desenfoque) de `.top` y `.modal-scrim` (`app102`, agregado en la 1.19) y de la barra de pestañas de la ficha (`app97`). Ahora llevan fondos sólidos. Dentro de las ventanas, las tarjetas usan `--shadow-sm` y `.m-body` lleva `overscroll-behavior: contain`. En Android, el desenfoque sobre contenido que se desplaza se recalcula en cada cuadro. Ojo: la prueba local no tiene placa de video, así que la mejora no se pudo medir en números.
- **Ventana del turno en la PC** (`#tpop`, `src/app104.js`): `app38` la ubica midiendo su alto al abrirse, pero después otros módulos le suman contenido y en los últimos turnos quedaba hasta 100 px fuera de la pantalla. Un `ResizeObserver` la reacomoda (`top`) y le pone `max-height: 100vh - 20px` con desplazamiento interno. En el celular (hoja de abajo) no cambia.
- Compilación 1.75.1.

## OdontoVoz 1.20 · foto del paciente, arreglo del pintado por caras y fases completas (20/11/2026)

- **Arreglo (error de la 1.19):** el `rect.selbox` del diente seleccionado tenía relleno, quedaba encima de las caras y frenaba el segundo toque en el mismo diente. Ahora lleva `pointer-events: none` (`app102`). Probado: 24 O, D y V y 23 M y O, alternando, en PC y celular.
- **Foto del paciente** (`src/app103.js`): reusa `pd.avatar`, `pd.photoOK` y `pd.photoConsent`, que ya existían. Tocando la foto o las iniciales en la ficha resumida o la ficha completa (`A.avatarHTML` envuelto en `button.av-btn`, `data-act="avEdit"`), se abre una ventana para autorizar, sacar la foto (`capture="user"`), elegirla de la galería o quitarla. Se guarda un JPEG cuadrado de 256 px (unos 6 KB) dentro de `pd`, que se sincroniza como siempre. La foto chiquita aparece en `.res[data-pid]` (el buscador) y en `.prow[data-pid]` (la lista de Pacientes) gracias a un `MutationObserver`. Sin autorización se muestran las iniciales.
- **Plan de tratamiento:** el nombre de la fase (`input.tp-phn`) va en su propia línea (`flex-basis: 100%`) y ya no se corta cuando aparecen los costos.
- **«Ficha completa»** (`#panelHost .fc-btn`) con degradado y sombra, como los botones principales.
- Compilación 1.75.0.

## OdontoVoz 1.19 · aspecto premium (20/11/2026)

- Rediseño **solo estético**, aprobado por Rodrigo a partir de capturas de antes y después. No cambia ids, `data-act` ni la lógica.
- `src/app102.js`: pone su CSS **al final del `<body>`** (los estilos base están en el body; si se pone en el `<head>`, pierde). Trae la paleta en `:root` y en modo oscuro (sistema y `data-theme`), `--accent-2` y `--accent-glow` derivados de `--accent`, así que respeta los colores de Apariencia (`data-acc`/`data-bg` tienen más especificidad). También mejora las sombras en capas, los botones (40 px, o 44 en pantallas táctiles), las pestañas y los segmentados, las tarjetas, los campos con anillo de foco, las ventanas con fondo desenfocado y el micrófono con halo y pulso.
- Letra: **Inter** en todo (texto, títulos y números tabulares). Se cambió el enlace de Google Fonts y `--f-display`/`--f-body`/`--f-mono` en `index.html`.
- Odontograma: un `<svg id="ovDefs">` con los degradados (`ovEnamel`, `ovEnamelDark`, `ovTodo`, `ovDone`, `ovGloss`). Un `MutationObserver` (con rAF) suma a cada pieza `rect.ov-crown`, `path.ov-fis` y `rect.ov-gloss` según el tipo (incisivo, canino, premolar o molar), todos con `pointer-events: none`. También recorta las caras con `clip-path: inset(0 round Npx)`. Las 5 caras y sus `data-t`/`data-f` no cambian. En la vista chica del celular (`.tight`) van solo el contorno y el recorte.
- Probado: tocar una cara y dictar «caries oclusal del 35» guardan igual; 9 pantallas en celular y PC, en claro y oscuro, sin errores.
- Compilación 1.74.0.

## OdontoVoz 1.18.2 · app de WhatsApp de escritorio en la PC (20/11/2026)

- La 1.18.1 no alcanzó: WhatsApp Web corta el vínculo con la página que lo abre (Cross-Origin-Opener-Policy), así que el navegador pierde la pestaña con nombre y abre otra cada vez. Desde una web no se puede evitar.
- Nuevo en Ajustes › WhatsApp para recordatorios (solo en la PC, clave local `odontovoz.waPc`: `web` | `app`): «App de WhatsApp de la computadora» abre `whatsapp://send?phone=…&text=…` en la app de escritorio (sirve para Business), siempre en la misma ventana. Si a los 2,5 s la página no perdió el foco, avisa que hay que instalar la app. Con WhatsApp Web, al segundo mensaje de la sesión aparece un aviso que sugiere la app. Cambios en `src/app51.js` (`deskGo`, `A.acts.waPcSet`).
- Compilación 1.73.2.

## OdontoVoz 1.18.1 · una sola pestaña de WhatsApp Web en la PC (20/11/2026)

- En la computadora (web, no celular), todo enlace de WhatsApp de la app (recordatorios, presupuestos, avisos) se abre en **una sola pestaña con nombre** (`odontovoz-whatsapp`) apuntando a `web.whatsapp.com/send?phone=…&text=…`. Si la pestaña sigue abierta se reusa; si se cerró, se abre otra. Cambio en `src/app51.js` (`webGo`, dentro del enrutador central de WhatsApp). En Android e iPhone sigue igual.
- Compilación 1.73.1.

## OdontoVoz 1.18 · centavos en todos los importes y stock renovado (20/11/2026)

- Centavos: los lectores de importes pasan a `A.parseMoney` (núcleo: precio de práctica, seña, cobro, movimientos y cierre de caja, liquidación; módulos `app6`, `app16`, `app25`, `app40`, `app45`, `app62`, `app64`, `app72` y los `num` de `app8`, `app65`, `app70`, `app74`, `app80`, `app86`, `app87`, `app89`, `app90`). `app101` (nuevo) cambia `inputmode="numeric"` a `decimal` (teclado con coma) salvo DNI, teléfono, PIN, pieza, fecha o edad.
- `app43` stock: kits por tamaño (`KITS`: 1 odontólogo ×1, 2 ×2, centro ×4, grande ×7 sobre el mínimo del catálogo; «pedir hasta» = 3 × mínimo) al empezar y desde «Kit recomendado por tamaño» (`stkKitOpen`, `MF.stkKit`; reajusta mínimos sin tocar lo contado). Acciones como tarjetas (`.stk-tiles`). «Para comprar»: tildar/destildar (`stkBuyOn`, `S.stkSkip`), cantidad editable con decimales (`stkBuyQ`, `S.stkQty`), «Tildar/Destildar todo» (`stkBuyAll`) y barra fija `.stk-buybar` con WhatsApp/Copiar (o el proveedor de `app82`); el texto del pedido usa solo lo tildado.

## OdontoVoz 1.17.4 · cobrar deuda desde el resumen y nombre en Para cobrar (20/11/2026)

- `app85`: si `A.saldo(pid) > 0`, la tarjeta del resumen (turno o paciente) muestra «💵 Cobrar deuda · $X» (`debtPay` → modal `cobro` con el saldo cargado; el pago se descuenta de la deuda como cualquier cobro).
- `app40`: en `A.pcHTML` el nombre es un botón (`pcOpenPat` → panel `pat`, la ficha resumida) para ir a la cuenta y corregir o cancelar.

## OdontoVoz 1.17.3 · arreglo al elegir paciente en el turno nuevo (20/11/2026)

- `app94`: los chips de horarios libres usaban la acción `naPick`, la misma que elige al paciente de la lista (`index.html`), y la pisaban: tocar un paciente no hacía nada. Ahora es `naTimePick`. **Ojo:** antes de crear un `A.acts.X` nuevo, buscar con grep que no exista.

## OdontoVoz 1.17.2 · plan de tratamiento y accesos centrados (20/11/2026)

- `app16` `planHTML`: «Mostrar costos» / «Ofrecer cuotas» como chips `.tp-opts` arriba (las cuotas en `.tp-finbox`); fases dentro de `.tp-phases` (grilla de tarjetas con color por orden) con el botón «+ Agregar fase» como tarjeta punteada; la evaluación (`details.tp-sec`) va después de las fases y cerrada (dice «cargada» si tiene texto). Estilos en `app100`.
- `app99`: los accesos del inicio en `flex-wrap` centrado y a lo ancho del recuadro (antes la grilla fija se salía con 7 u 8 accesos).

## OdontoVoz 1.17.1 · recargos preestablecidos y arreglos del turno nuevo (20/11/2026)

- `sitio/recargos/preset.json` (se publica en odontovoz.com.ar/recargos/preset.json): valores de referencia (crédito 1 pago +2,2% = 1,8% + IVA de la ley 25.065; 3 cuotas +9,1% y 6 cuotas +18,7% según coeficientes de Cuotas MiPyME de Payway/Cabal; débito, efectivo, transferencia y Mercado Pago en 0; el BCRA no permite recargo con débito). **Para actualizarlos, editar ese archivo** (y la copia `BUILTIN` de `app100`).
- `app100` (nuevo): en `MF.payRates` caja «¿No sabés qué porcentajes poner?» + `prPreset` (baja el JSON, si no hay internet usa la copia; reemplaza esos medios en `A.CFG.payRates` sin guardar; «Cancelar» lo deshace con `m.prev`). Turno nuevo: `.na-fixed`, la hora va en su propia fila (no se pisa con la duración), horarios libres en varias líneas; Bloquear/Nota (`qblock`) toman la altura mínima del turno nuevo.
- `app20`: `naKind` solo marca los botones Turno/Sobreturno (antes marcaba también Bloquear/Nota). `app94`: la ficha resumida (`#panelHost .panel`) ya no se arrastra.

## OdontoVoz 1.17 · ficha en resumen, bloqueo del día, toques en la grilla (20/11/2026)

- `index.html` `gbClick` (y el pegar de `app38`): el horario tocado se redondea al intervalo del profesional (`A.slotOf`), no a 15 min.
- `app34`: «Todo el día» en la duración del bloqueo y botón `qbDay` «Bloquear todo el día» (desde el primer horario al último del profesional, o 8 a 20; marca `allDay`).
- `app99` (nuevo): × (`hkDel`) en cada acceso mientras se editan (guarda en `odontovoz.home` y vuelve a montar); en la PC los accesos van en columnas fijas centradas. Ficha › Datos: «Datos personales» (si tiene nombre, apellido y DNI o teléfono) y «Anamnesis» (si tiene algo cargado o `hc.saved`) se muestran como resumen (`.ov-ro` + `.ov-sum`, armado leyendo los campos) con «Editar…» (`roEdit`); en edición, los botones «Guardar …» que ya existían (`secSave` de `app12`, envuelto; la anamnesis marca `hc.saved`). Motivo vacío más chico; fotos y radiografías con ícono, degradé y miniaturas de 112 px. Estilo degradé por equipo en Apariencia (LS `odontovoz.grad`, `body.ov-grad`, `--gc`). Días con bloqueos (sin notas) marcados en la tira, el mes y el calendario de la derecha: `.ov-dblk` rayado rojo si es el día entero (`allDay` o 6 h o más), `.ov-pblk` con candadito si es parcial; respeta el profesional elegido.

## OdontoVoz 1.16.1 · ventanitas flotantes movibles y accesos sin colores (20/11/2026)

- `app94`: `wireFloats()` hace arrastrables (pantallas de 700 px o más, con la propiedad CSS `translate` para no pisar animaciones) `#tpop`, `.pp-pop`, `#panelHost .panel`, `#waPick` y `#updPop .up-card`; se arrastra desde cualquier parte que no sea botón, campo, enlace, `[data-act]` u odontograma. `app95`: se quitan los colores por acceso del inicio (quedan como antes, con el recuadro suave).

## OdontoVoz 1.16 · Atrás a la pantalla anterior y gráficos (20/11/2026)

- `app98` (nuevo): `A.navRecord` redefinido: la clave es la pantalla (`tab`, y en la ficha también el paciente), sin pestaña de la ficha ni sección de la caja; volver a una pantalla ya visitada corta la pila ahí; Inicio la reinicia. `A.back` (app5) sigue igual.
- Gráficos optativos por equipo (LS `odontovoz.charts.caja` / `.liq`): `.ovc-wrap` debajo de `.cash-top` (o arriba de la vista) con «Ver en gráficos» y selector de mes (`S._ovcM`, `ovcMonth`). Caja: cobrado del mes (vs. anterior), cantidad, promedio, barras por día, por medio de pago y por profesional. Liquidaciones: producción, cobrado y diferencia; producción/cobrado por profesional, prácticas que más facturaron (por `desc` hasta « · »), cobrado de 6 meses. Datos de `A.allPids()` + `A.pd(id).ledger` (caché 4 s), SVG con colores del tema.

## OdontoVoz 1.15 · ficha: anamnesis, antecedentes, menú de secciones (20/11/2026)

- `app85`: el resumen nuevo (tarjeta «Abrir ficha completa» + cuenta) también para el panel `pat` (paciente abierto desde el buscador), no solo `appt`.
- `app97` (nuevo): `A.ANAM` reordenada por grupos (`NEW`: corazón y sangre, metabólicas, infecciones e inmunidad, alergias, otras, hábitos) con claves nuevas `endocard`, `coag`, `acv`, `anemia`, `tiroides`, `gastro`, `vih`, `tbc`, `inmuno`, `cancer`, `aines`, `alergOtra`, `psiq`, `respBucal`, `onico`; `hepatitis` pasa a alerta. `A.alertsOf` redefinida (usa el 3.er valor de `A.ANAM`) y `A.antecOf(pid)` (marcadas que no son alerta). `.antec-strip` (ámbar, chiquita) después de cada `.alert-strip` (ficha y panel). Casillas con títulos de grupo (`.anam-g`) cuando la lista tiene 20+. Menú de secciones: `.ftabs.ft-pro` con íconos, en 2 filas y fijo arriba en la PC; en el celular `.fsel` (sección actual + «Secciones (n) ▾») despliega una grilla de 3 columnas (`fselToggle`). Encabezado `.fh` y tarjetas con tinte del acento.

## OdontoVoz 1.14 · menú en recuadros y secciones desplegables (20/11/2026)

- `app96` (nuevo): `.dr-nav` ordenada por `ORDER` (Inicio, Agenda, Pacientes, Laboratorio, Caja, Stock, Empresa, Liquidaciones; el resto al final). Turnero online y Autogestión por WhatsApp (con etiqueta «pronto») pasan a la sección nueva `.dr-more` «Turnos por internet», al fondo. Las secciones con `.dr-lbl` (salvo Ajustes y Cerrar sesión) se pliegan: `dr-fold`/`dr-shut`, `drSec`, cerradas por defecto, estado por equipo en LS `odontovoz.drOpen.<sección>`. Opciones con borde y el ícono en un cuadrito de color; secciones como tarjetas. `app48` `items()` también abre las `.dr-shut` un instante para leer las filas de Ajustes.

## OdontoVoz 1.13 · inicio, nombre como botón y ventanita del turno (20/11/2026)

- `app95` (nuevo): en el inicio se quita `.home-new` y el «+ Dar un turno» de `.hd-card` pasa a «Ir a la agenda» (`tab` agenda). Título `.hk-head` «Accesos directos» con «Cambiar» (`homeEditGo` de `app18`) arriba de `.home-actions.icons`, que va en un recuadro con un color por acceso (acento, ok, warn, red, gris, en ciclo). `.blk .nm` con aspecto de botón. `#tpop` con marco, franja y tinte `--tpc` elegible abajo (`.tp-tint`, `tpTint`, LS `odontovoz.popTint`, por equipo); la ventana de estado (`stMenu`) usa el mismo color (`.tp-tinted`).

## OdontoVoz 1.12.1 · arreglo al destildar prácticas (20/11/2026)

- `app40`/`app74`: la fila destildada de `MF.pracOk` usaba la clase genérica `off` (en la agenda es la franja rayada con `position:absolute`) y tapaba la ventana; ahora es `po-off`. Lo mismo en la tabla de sueldos de Empresa (`app28`, `emp-off`). `app94`: con todas destildadas, «Cobrar ahora/después» avisa en vez de no hacer nada.

## OdontoVoz 1.12 · ventanas movibles y minimizables, turno nuevo y botones de voz (20/11/2026)

- `app94` (nuevo): marco de ventanas más lindo (bordes 20 px, encabezado con tinte del acento). Botón `.m-min` (–) en toda ventana con × salvo `NO_MIN`: `A.acts.mMin` guarda `S.modal` + lo escrito (`snap`/`unsnap` por orden de campos) en `A._mini` y muestra la burbuja `#mBub` (arrastrable, posición en LS `odontovoz.bubPos`); `mMax` la reabre (si hay otra abierta, cambian de lugar), `mBubX` la descarta. Una sola burbuja. En pantallas de 700 px o más la ventana se arrastra desde el encabezado (`S._mPos`, se repone en cada `renderModal`; el clic que sigue a un arrastre se descarta para que no cierre por el fondo).
- Turno nuevo: `.na-kind` en una fila tipo pestañas (Turno / Sobreturno / Bloquear / Nota) con la explicación debajo (`.na-khint`); −15 a la izquierda de la hora; chips `#naFree` con los horarios libres del día (paso = `A.slotOf`, máx. 30 min; hoy no muestra horas pasadas), `naPick` los pone en `#naH`/`#naMi`.
- Voz: micrófono 50 px y manos libres 38 px; `#vdock` se arrastra (LS `odontovoz.vdPos`, con límites de pantalla) y se achica con `.vd-min` (`vdMini`, LS `odontovoz.vdMini`: queda un micrófono chiquito semitransparente que al tocarlo se agranda).

## OdontoVoz 1.11 · Ajustes en recuadros y primeros pasos (20/11/2026)

- `app48`: cada sección de Ajustes va en un recuadro con su color (Consultorio = acento, La app = `--ok`, Cuenta = `--warn`, Ayuda = gris). Consultorio en orden de pasos: Centro y profesionales (+ Mis consultorios), Equipo e invitaciones (salió de Cuenta y datos), Prácticas, Obras sociales, Stock, Mudanza, Turnero online, Medios de pago, Historias en papel.
- `app93` (nuevo): `A.ps` con los pasos (centro, equipo —solo con cuenta en la nube—, prácticas, obras sociales, stock, turnero, medios de pago; mudanza e historias en papel son opcionales). Marca en `A.CFG.steps` (se sincroniza): entrar a un paso lo da por hecho, salvo stock (necesita un insumo cargado); «Ya lo hice / no lo uso» = `skip`. Números/✓ en las filas, franja de avance arriba de Consultorio, tarjeta `.ps-card` en el inicio (× = `_hide`) y aviso `ps:<paso>` en la casilla. Solo dueño o administración, no en LITE.

## OdontoVoz 1.10.1 · aranceles con centavos (17/11/2026)

- `index.html`: `A.parseMoney(texto)` («12.500», «12500,50», «12.500,5», «1234.56») y `A.moneyIn(n)` (para mostrar en un campo, con coma); `A.money` muestra centavos solo si el importe los tiene. Usados en aranceles de obra social (`osAr`, `app7`), planes (`ospV`, `app91`), catálogo (`catEdit`) y valores por pieza (`aranEdit`), con `inputmode="decimal"`. Los demás campos de cobro siguen en pesos enteros. Prueba: `tdec.py`.

## OdontoVoz 1.10 · planes a la vista y ventana de actualización (17/11/2026)

- `src/app92.js`: `MF.osList` muestra «Planes: …» (`.osl-pl`) en cada obra social; `MF.osEdit` y `MF.ospEd` con pestañas `.osp-tabs` (General / cada plan, `ospGoPl`). `MF.pracOk` (también la pantalla «¿Quién cobra?») con `.po-plan` si la obra social tiene planes: `poPlan` guarda `p.plan` y vuelve a leer `m.txt` con `A.pracParse` (respeta destildados y la forma de cobro). Arreglo: `A.acts.ospEd` (botón «Valores» de 1.9) no existía; ahora está en `app91`.
- Actualización: ventana `#updPop` («Actualizar»/«Descargar» y «Más tarde» = 12 h por versión, `odontovoz.updLater.<v>`). Web: aparece cuando el service worker deja lista la versión (`.upd-bar`); al volver a la app se llama `reg.update()`. APK: compara `sw.js` publicado con `A.VBUILD` al abrir y al volver (cada 30 min como mucho, `odontovoz.updChk`), `A.updCheck()` fuerza. Prueba: `t110.py`.

## OdontoVoz 1.9.1 · restauraciones simples, compuestas o complejas (17/11/2026)

- `src/app89.js`: `rewriteRegion` junta en la última pieza las caras sueltas cuando todas las piezas ya tienen cara («27 por oclusal y por vestibular» → OV) y reparte en orden «24, 25 y 33 por oclusal, por mesial y por distal»; siglas de caras pegadas a la pieza (`LET`: «27 OV», «36 MOD»). `A.pracParse` envuelto agrega `it.cx` = `A.restKind(caras)` («simple (1 cara)», «compuesta (2 caras)», «compleja (N caras)») al nombre; `app40.poGo` lo pone en el `t.label` del tratamiento y en la `desc` del cargo (lo que ve recepción). El código de la obra social ya salía de la cantidad de caras (`codeFor`/`osAltCode`). Prueba: `trest2.py`, `t19d.py`.

## OdontoVoz 1.9 · quién cobra primero y planes de obra social (17/11/2026)

- `src/app89.js`: «¿Quién cobra?» aparece siempre que hay prácticas (aunque la obra social cubra todo). «Cobra secretaría» manda sin que el odontólogo elija la forma. En `MF.pcPay` el editor se abre solo si hay obra social: por práctica Coseguro (`e.osCos`), Diferencial (`e.price − e.osCov`), Cubierto 100%, Todo particular (`e.price`) o No le cobro nada (motivo); el importe se calcula solo (`A.rcpAutoAmt`). El motivo general solo es obligatorio si se cambia un importe a mano, se saca o se agrega algo. Particular deja un `ajuste` con `osOff = id del cargo` (y `cop`): `A.osOffSet(pd)` (app64) lo saca de lo que debe la obra social (`osDue` de app64/app74, `cobAlloc` de app65). `cobAlloc` suma a cada cargo sus ajustes `adjFor` (menos los de recargo). Si queda en $0, «Listo, no paga nada» marca `cobOk` 'os' o 'bonif' sin pago. `app40` guarda en el cargo `price` y `osCos`; `app64`/`app74` ya no marcan `cobOk = 'os'` si `e.cob === 'rcp'`.
- `src/app91.js`: planes por obra social `o.pl = [{id, name, aran, forn}]` (lo no cargado usa `o.aran`; `o.plans` queda como texto con los nombres). `A.osOf` envuelto: si `p.plan` coincide (`A.osPlanFor`) devuelve una vista (`Object.create(o)`) con los valores del plan y `sigla` «OSPe · 604». `MF.osEdit`: bloque «Planes» (`ospAdd`, `ospFornAuto`), `MF.ospEd` (valores propios, copiar la general con %, `ospForn` → `fornPick` con `m.plan`, `ospDel`). Federación: `A.fornAutoPlans(o, f)` arma un plan por cada columna `plan` (Galeno AZUL/PLATA, juntando todas sus tablas) al usar `fornAllGo`/`fornGo`/`fornUpdGo`/«Una por plan» (`app67` expone `A.fornById`, `A.fornSig`); `A.fornCheck` también avisa planes con tablas nuevas. Ficha y paciente nuevo: chips `.pl-chips` debajo de «Plan» (`pf_plan`, `npPlan`). La Federación de RN no publica valores por plan para la mayoría (OSPe, Avalian…): esos se cargan a mano o copiando la general con %. Neuquén no tiene aranceles públicos. Pruebas: `t19a.py`, `t19b.py`, `t19c.py`.

## OdontoVoz 1.8 · varios medios de pago, recargos por cuotas y motivos (17/11/2026)

- `src/app90.js`: recargos/descuentos por medio de pago en `A.CFG.payRates = { <medio>: { p, cuo, c: { <cuotas>: % } } }` (`A.payRate(medio, cuotas)`: la de menos cuotas con valor si falta), pantalla `MF.payRates` (`payRatesOpen`, entrada `#drPayRates` en Ajustes › Consultorio, solo dueño/admin). Líneas de pago `m.pl` (`A.payLines(m, base)`, `A.payLinesHTML`; la última es «el resto»; recargo de la lista o a mano con motivo obligatorio). En `MF.pcPay` reemplaza las filas viejas, el «dos medios» y el bloque de `app72` (ocultos con `:has`); `ppGo` arma `m.plLines` y `A.plBeforePay` (lo llama `app40.ppGo`) asienta los ajustes de recargo; los pagos llevan `method` limpio + `cuotas`, `rec`, `recPct`. En `MF.preCob` reemplaza «Medio de pago»; `pcGo` divide el pago creado por `app80` en varios y asienta el recargo con `pre`. Prueba: `tpl.py`.
- Motivos: `app89` pide «¿Por qué lo corregís?» (`m.whyAll`) si recepción cambia algo; `app74` suma «✎ Aclarar» por práctica (`it.why` → `e.why`). `app86` muestra en Historial › Correcciones los ajustes `rcpFix`/`plOver`/`free` y los cargos con `why`/`freeWhy`, y avisa al dueño en el semáforo de Hoy (`cjCorr`).

## OdontoVoz 1.7 · cobro desde la evolución (17/11/2026)

- `src/app89.js`: `A.evoRewrite(texto)` (envuelve `A.pracParse` y `A.evoOdon`): reescribe zonas de restauraciones (arreglo/obturación/composite/resina/restauración/amalgama/ionómero) con varias piezas y caras: «por X, por Y y por Z» empareja en orden con las piezas sin cara; «24, 25 y 33 por oclusal» reparte la cara; «por mesial y distal» = MD; «limpieza con flúor» = limpieza + flúor. Primero «¿Quién cobra?» (`MF.pracOk` envuelto si hay algo que pague el paciente y no es modo solo: `pwGo` rcp/pro/fix/nota; `A.CFG.askWho = false` lo apaga), los cargos llevan `evo` (texto de la evolución) y `cobDev`. Cartel en recepción `#ppPopHost` (`popCheck` en `afterRefresh`, vistos en LS `odontovoz.pcPop.<dueño>`, no aparece en el equipo que lo mandó ni a profesional/asistente; `A.CFG.rcpPop = false` lo apaga). Cobro corregible (`MF.pcPay` envuelto, `ppEdit`): lo ya cargado no se toca, las correcciones son `ajuste` con `adjFor`/`rcpFix` (el servidor no deja a recepción cambiar cargos viejos), lo destildado queda `cobOk: 'quitado'`, lo agregado es un `cargo` nuevo. Prueba: `tcob.py`, `tfree2.py`, `trw.py`.
- `src/app74.js`: modos `none` = «Cubierto 100% por la obra social» y nuevo `free` = «No le cobro nada» (también en particulares con `poFree`), con motivo obligatorio (`poWhy` → `e.free`, `e.freeWhy`, en la descripción del cargo; sin obra social y en $0 → `cobOk: 'bonif'`).

## OdontoVoz 1.6.1 · deshacer sin borrar historia clínica y modo oscuro (17/11/2026)

- `src/app17.js` `restore()`: «Deshacer» de «Cambios de hoy» pasa por `pdSafe` (evoluciones nuevas → `void` con «Deshecho desde «Cambios de hoy»»; `docs`, `paper`, `images`, `rx`, `alog`, `controls`, `pre` nunca se sacan; cobros/cargos nuevos → `voided` + contraasiento; tratamientos hechos → `anulado`; nota automática con lo deshecho en odontograma, plan, anamnesis…) y `cashSafe` (cierres, aperturas, ajustes, movimientos, anulados y registro se conservan; gastos nuevos → `voids`). Prueba: `tundo.py`.
- `src/app88.js`: tokens que faltaban (`--card`, `--muted`, `--soft`, `--teal`, `--bad`, `--bg-soft`, `--bg-2`, `--f-sans`, `--mono`) y un recorrido de las hojas de estilo que, en oscuro, pasa a `--accent-ink` la letra blanca sobre `var(--accent)` y a `--surface-2` los fondos claros fijos sin color de letra. Web: `sitio/mudanza.html`, `sitio/index.html` (.qk, .demo, enlaces), `legal.css` (.btn.main). Prueba: `tdark.py` (contraste de todos los textos en pantallas y ventanas), `tdarksite.py`.

## OdontoVoz 1.6 · caja nueva y clara (17/11/2026)

- `src/app86.js`: la caja se rearma en 6 secciones con una pregunta cada una (`hoy`, `deben`, `pagar`, `plata`, `mes`, `hist`); las viejas (`resumen`, `control`, `mov`, `pend`, `cierre`, `os`) se muestran adentro (`oldHTML(sub)` reusa el render anterior sin su barra). Datos nuevos dentro de `S.cash` (clave de nube `cash`): `opens`, `closes` v2 (`counted`, `exp`, `diff`, `note`, `bills`, `keepEf`, `out`, `flow`, `re`), `acc0` (con cuánto arranca cada cuenta, `since`, `firstUse`), `adj`, `xfer`, `voids`, `acred`, `fact`, `dun`, `prov`, `log`. Comisiones por medio en `A.CFG.cjFees` (`A.cjFee`), alias en `A.CFG.payAlias`. `A.cjBal(acc)`, `A.cjPays()`, `A.cjPeriod(lo, hi)`, `A.cjDebtors()`, `A.cjChecks()`. Gastos y cobros se anulan con motivo (`mvDel`, `ledVoid` → `cjReason`); día cerrado pide motivo. Voz: abrir/cerrar la caja, cuánto hay, quién me debe, qué tengo que pagar, cómo nos fue este mes. `A.CFG.cajaOld = true` vuelve a la caja anterior. En Empresa, la caja de cada centro sigue como antes.
- `src/app87.js`: facturas (`A.CFG.factOn`, `A.CFG.monoTope`, `S.cash.fact`), resumen para el contador (PDF y CSV), obras sociales con presentada (`A.CFG.osPres`), retenciones, débitos y reclamos (en `A.CFG.osPay[os][mes]`), liquidaciones con adelantos (`S.liq.adv`), gastos `chargePro` como descuento automático, pago que no se borra (`liqUnpay` con motivo) y confirmación del profesional (clave de nube `liqok`).

## OdontoVoz 1.5 · resumen del turno ordenado (17/11/2026)

- `src/app85.js`: en el panel del turno (`S.panel.type === 'appt'`) un `MutationObserver` sobre `#panelHost` ordena: cabecera · seña en una línea (`.sena-mini`) · tarjeta `.fc-card` (botón grande «Abrir ficha completa», realizado/pagado/debe del libro de cuenta, lo de hoy o el último realizado, «Cobrar / ver cuenta») · Datos principales (sin la fila Cuenta) · Odontograma · Motivo · el resto como estaba. `A.CFG.panelOld = true` vuelve al orden anterior.

## OdontoVoz 1.4 · Navi conversa (17/11/2026)

- `src/ovcmd.js`: capa de charla antes de `navRewrite` (`convo`/`convoOne`): `dayCount` {date, dated}, `dayFree` {date, dated, add, ask} (libres, huecos, lugar, disponibilidad, «puedo sumar más gente», «si agregamos un paciente nuevo»), `follow` («¿y el viernes?»), `multi` {steps} (parte en «y / y después / y decime…» y hereda el día). `parseDate` entiende «el viernes de la semana que viene». `screenOf` → `screen` {act, sub} para las pantallas del menú (stock, obras sociales, novedades, laboratorio, mi plan, costos, avisos, mudanza…).
- `src/app84.js`: responde esas intenciones (cuenta turnos y libres de los profesionales visibles, `A.navi.last` para seguir la charla, `A.navi.pending` para «¿A quién agendo?» → `agendá a <nombre> el <día> a las <hora>`).
- Arreglo (`src/app6.js` `findPat`): con nombre y apellido tienen que coincidir las dos palabras; antes «Zulema Quiroga» daba el turno a Martín Quiroga.
- Pruebas: `node tests/ovcmd.charla.test.js` (7.700 frases armadas combinando arranques, preguntas y días) + las 605 de siempre.

## OdontoVoz 1.3 · El asistente habla menos (17/11/2026)

- `src/app83.js`: si no entiende, `A.cmd.exec` devuelve «No entendí «lo que oyó».» sin sugerencias (reemplaza el `hint()` de `app14`); `A.voice.speak` envuelto con `A.shortSpeech(msg)`: primera oración, sin paréntesis ni consejos (Probá/Decí/Podés…), hasta ~90–110 caracteres; mantiene «Decí X para guardar/confirmar…». `A.CFG.voiceLong = true` vuelve al modo detallado.

## OdontoVoz 1.2.3 · OdontoVoz centrado siempre en el inicio del celular (16/11/2026)

- A pedido del usuario: en el inicio del celular vuelve a verse siempre «OdontoVoz» centrado, aunque haya varios lugares. Cambiar de lugar se hace solo desde el menú (nombre del lugar enmarcado, `#drClinic.dr-pl`).

## OdontoVoz 1.2.2 · Cambiar de lugar desde el menú (16/11/2026)

- Con varios lugares, el nombre del lugar arriba del menú (`#drClinic`) es un botón enmarcado («⇄ Tocá para cambiar de lugar», clase `dr-pl`, abre `plOpen`). Se quita el botón `#drPlace` de la 1.2.1.

## OdontoVoz 1.2.1 · Volver a cambiar de lugar (16/11/2026)

- Arreglo: en el celular, en el inicio, el nombre «OdontoVoz» tapaba el título que se toca para cambiar de lugar (quedabas atrapado en el lugar invitado). Con varios lugares, ahora se ve el título; además hay un botón «Cambiar de lugar» (`#drPlace`) arriba de todo en el menú.

## OdontoVoz 1.2 · suscripciones
- Cada cuenta nueva recibe 7 días de prueba gratis; las primeras 50 del lanzamiento, 14 días (tabla `ov_accounts`, columna `promo`, scripts `supabase/licencias.sql` y `supabase/prueba-7-dias.sql`).
- Si la suscripción vence o se suspende, la cuenta queda en **solo lectura**: ve y descarga sus datos, pero no puede cargar nada nuevo. El servidor lo hace cumplir (no se puede saltear desde el teléfono).
- Panel de administración: https://roan-corp.github.io/odontovoz/admin.html (entrar con una cuenta administradora). Desde ahí: +1 mes, +1 año, suspender, reactivar, cambiar plan y notas.
- Para sumar otro administrador (cuando tenga cuenta creada), en Supabase › SQL Editor:
  `insert into public.ov_admins (user_id) select id from auth.users where email = 'CORREO' on conflict do nothing;`

## OdontoVoz 1.3
- El resumen del paciente ya no «parpadea» cuando llegan cambios de otro equipo (queda quieto y en la misma posición).
- Paciente nuevo: se abre la ficha completa (datos personales, fecha de nacimiento con edad automática, domicilio, localidad, obra social con N.º de afiliado y plan, motivo y anamnesis). El turno con paciente nuevo sigue siendo la versión corta.
- Por voz: «fecha de nacimiento 3 de mayo de 1990», «domicilio…», «localidad…», «número de afiliado…», «plan…», «particular».
- Agenda: más alta; los turnos de 15 minutos muestran nombre y hora en una línea, y los superpuestos se reparten el ancho para que se lean.

## OdontoVoz 1.4
- Al crear la cuenta aparece la pantalla «Revisá tu correo» con los pasos, botón para reenviar el correo y para volver a ingresar.
- Usuario o contraseña equivocados: aviso rojo grande, campos marcados, vibración y se baja el teclado para que se lea.
- Si alguien intenta ingresar sin haber confirmado el correo, le aparece la misma pantalla con la opción de reenviarlo.
- Administradores: rodribobadilla5630@gmail.com y angelagatielo@gmail.com (cuentas principales, plan Centro sin vencimiento).

## Página web pública
- `sitio/` es la página de OdontoVoz (presentación, planes, descargas, guía de instalación). Se publica en https://roan-corp.github.io/odontovoz/
- La app web pasó a https://roan-corp.github.io/odontovoz/app/ (el panel sigue en /admin.html).
- Precios, textos de planes y contacto (WhatsApp/correo): al final de `sitio/index.html`, en `PLANES`, `NOTA_PLANES` y `CONTACTO`.

## OdontoVoz 1.5
- Pacientes: botón ⋮ (en la lista, en la ficha y en el resumen) con «Eliminar paciente». Si tiene historia clínica, avisa de la obligación legal de conservarla (Ley 26.529, art. 18), ofrece descargar el PDF y pide confirmar. Se borra en todos los equipos.
- Historia clínica: botón «Guardar» al final de Datos personales y de Anamnesis, con la hora de guardado.
- Fotos y radiografías: pestaña propia en la ficha (radiografías, intraorales, extraorales), vista rápida en «Datos e historia» y guardado en la nube (Supabase Storage, carpeta privada por cuenta: `supabase/fotos.sql`).
- Laboratorio: lista compacta con pestañas (activos, atrasados, en el laboratorio, para probar o instalar, entregados), filtro por laboratorio, acción principal en cada fila y menú ⋮.
- Avisos: cuando otro equipo marca que llegó un paciente, este equipo suena, vibra y muestra un aviso (y una notificación del sistema si se activa). Ajustes › Avisos y sonidos.
- Al abrir la app: logo animado con un acorde suave (se puede apagar).

## OdontoVoz 1.6 · varios consultorios para el profesional
- Modo profesional: hasta 5 consultorios (Menú › Mis consultorios y horarios). Cada uno con nombre, dirección, color, modalidad (propio, a porcentaje, institución) y tu porcentaje.
- Semana de trabajo libre: franjas por día y consultorio (ej. lunes 9–12 en el 1 y 14–19 en el 2), con «repetir en» otros días y control de superposición.
- Agenda única con franjas de color por consultorio, punto de color en cada turno, filtro por consultorio y «Hoy trabajás en…» en el inicio.
- Turno nuevo: se sugiere el consultorio según la hora; se puede cambiar, también desde el turno abierto. Los pacientes son del profesional y se comparten entre consultorios.
- Cobros por consultorio: al cobrar se elige el consultorio; resumen mensual con atendidos, cobrado, tu parte y lo que corresponde al consultorio.
- Plan: `ov_accounts.max_locs` (1 a 5; vacío = 5 en prueba y plan Centro, 1 en los demás). Se edita en el panel de administración. Script: `supabase/consultorios.sql`.

## OdontoVoz 1.7 · periodontograma y más comandos de voz
- Ficha › Periodontograma: sondaje guiado de 6 sitios por pieza (superior vestibular → palatino → inferior lingual → vestibular), saltea las ausentes. Profundidad de sondaje, margen gingival, sangrado, placa, supuración, movilidad, furca, ausentes e implantes. Gráfico de margen y fondo de bolsa, índices (PS media, NIC, % sangrado, % placa, sitios ≥ 4 y ≥ 6 mm), historial de exámenes y PDF.
- Carga con el dedo (teclado numérico abajo) o por voz: «empezar sondaje», «tres dos tres», «323 sangra distal», «4 5 3 sangra todo», «placa», «recesión 1 0 1», «movilidad 2», «furca 1 en el 46», «falta el 18», «implante en el 13», «saltear», «anterior», «borrá», «ir al 36 por lingual», «bolsa de 7 en el 46 por distal», «pasá a palatino», «resumen», «dónde estoy», «terminar».
- Comandos nuevos en cualquier pantalla: «periodontograma de Pérez», «hola», «gracias», «qué hora es», «qué día es hoy», «cuántos me quedan», «cuánto cobré hoy», «quién está en la sala», «qué tengo mañana / el jueves», «¿tengo lugar el viernes?», «¿a qué hora viene Pérez?», «ya atendí a Gómez», «está en el sillón», «pasá el turno de Pérez al jueves a las 17», «mandale un WhatsApp a Pérez», «llamá a Gómez», «repetí».
- Si no entiende una frase, sugiere ejemplos según la pantalla donde estás.

## OdontoVoz 1.7.1 · planes nuevos y correcciones en la historia clínica
- Planes: prueba gratis de 7 días (14 para las primeras 50 cuentas, columna `promo` en `ov_accounts`, script `supabase/prueba-7-dias.sql`). Profesional $26.900 (+ $4.900 por consultorio adicional), Consultorio $51.900, Centro $89.900. Abono mensual, sin permanencia. En noviembre de 2026 la web muestra 35% de descuento en el primer mes, por única vez (se apaga sola el 1.º de diciembre; datos en `PROMO` al final de `sitio/index.html`).
- Periodontograma: botón ⌫ en el teclado para borrar la casilla elegida, «Borrar 18 vestibular» para toda la cara, «Eliminar este» para el examen del día y, por voz, «borrar la 36» o «borrar la 36 por lingual».
- Evolución clínica (`src/app15.js`): las notas automáticas (laboratorio, recetas, «se realizó») se borran siempre; la del laboratorio queda unida a su pedido (al borrarla se puede quitar el pedido, y al quitar el pedido se va su nota). Buscador con resaltado, filtros por tipo, profesional y fechas, agrupado por mes, «Ver más» (antes mostraba solo 40), notas largas plegadas y «Copiar». Las notas de hoy se borran; las de días anteriores se anulan con motivo: quedan ocultas («Mostrar anuladas») y en el PDF figuran como ANULADA (Ley 26.529). Por voz: «buscar en la evolución endodoncia».

## OdontoVoz 1.8 · plan de tratamiento, fotos en grande, hora de llegada y agenda en la PC
- Plan de tratamiento (`src/app16.js`, dato `pd.tplan`, fase de cada tratamiento en `tx.ph`): plantilla de fases orientativa (Urgencia, Fase I básica, Fase II correctiva, Fase III mantenimiento; esquema de la Facultad de Odontología de la UNCuyo) que cada odontólogo renombra, ordena, borra o amplía. Lo realizado queda en el plan tildado con su fecha («Deshacer» lo vuelve a pendiente y anula el cargo). Evaluación e indicaciones opcionales, costos opcionales, PDF y WhatsApp (en el celular comparte el PDF; en la PC lo descarga y abre el chat del paciente con el resumen).
- Logo del consultorio (`CFG.logo`): sale arriba en todos los PDF, junto con la dirección y el teléfono. El pie de los PDF ya no dice «prototipo» con datos reales.
- Presupuestos: quedan en la sección con su avance (tratamientos hechos y lo pagado), con PDF y opción de borrar.
- Fotos: se abren a pantalla completa con zoom (pellizcar, rueda, doble toque), flechas y Esc.
- Agenda: al marcar «Llegó» se guarda la hora exacta (`a.arr`) y se ve en el turno («Llegó 9:15 · +15′»); también la hora en que pasó a atención (`a.inAt`). En la PC la tira de días se arrastra con el mouse, tiene flechas y la agenda del día se arrastra hacia los costados.
- Soporte: WhatsApp de Rodrigo (2984 513279) y Angel (2984 764428) en la web y en Ayuda › Soporte. Prueba de 7 días (14 para los primeros 50) ya cargada en Supabase.

## OdontoVoz 1.9 · turnero con link, recordatorios y deshacer del día
- Turnero online de verdad (`src/app17.js`, `sitio/turnos.html`, SQL `supabase/turnero.sql`): cada cuenta tiene su link `turnos.html?c=CODIGO` (código en `CFG.online.slug`). La app publica solo los horarios libres en `ov_booking` (sin datos de pacientes) y toma los pedidos de `ov_booking_req` con `ov_booking_claim()`: entran a la agenda como «pendiente · online» con código. En la vista de muestra del turnero, arriba, está el link con Copiar, WhatsApp y Compartir, y el tilde para pausar los pedidos.
- Recordatorios en el inicio (`CFG.rem`): opcionales, chicos y enmarcados; texto, día, hora, color y quién los ve; se tildan como hechos (con deshacer). Por voz: «recordatorio enviar el modelo al laboratorio antes de las 17».
- Cambios de hoy (menú › «Cambios de hoy · deshacer» y link en el inicio): cada cambio en pacientes, agenda, ajustes y caja se anota con cómo estaba antes y se puede deshacer en el día (en este equipo; se guarda en IndexedDB `odontovoz.journal`). Lo que llega de otro equipo no se anota. Al día siguiente la lista empieza de cero y en la historia clínica se anula.

## OdontoVoz 1.10 · ventanas firmes, borrar turnos, inicio a gusto y más
- Ventanas emergentes: ya no se cierran al tocar afuera ni al soltar el mouse fuera del cuadro; solo con «Cerrar»/«Cancelar» o la ✕ (`src/app18.js`).
- Turnos: «Borrar turno» en el turno y en el menú de estado; deja el horario libre y se puede deshacer.
- Profesionales: los dados de baja que nunca tuvieron turnos ni tratamientos se pueden borrar del todo; los que tienen historia se conservan.
- Turnero: motivos habituales para el paciente (restauración, conducto, extracción, corona, etc.), «Otro motivo» escrito por el paciente (`CFG.online.other`) y un link por profesional (`turnos.html?c=…&p=ID`) además del link del centro.
- Ayuda: caja «Ayudanos a mejorar»; llega a la tabla `ov_feedback` (SQL `supabase/sugerencias.sql`) y se ve en el panel de licencias; si no se puede, abre el correo.
- Apariencia (por equipo): color principal, fondo y tamaño de letra; accesos del inicio para elegir y ordenar manteniendo apretado.
- Agenda: botón «Hoy» cuando estás en otro día (lleva a la hora actual); el calendario de la web muestra «12t» con la cantidad de turnos.
- «Cambios de hoy»: cada cambio es un enlace que lleva al paciente o al turno. Logo sutil en el inicio, cuadros vacíos, Ayuda y la página de turnos.

## OdontoVoz 1.11 · límites de cada plan controlados por el servidor
- Planes y límites (`supabase/limites.sql`, `src/app19.js`): Prueba 1 profesional, 2 equipos, 2 consultorios · Profesional (`basico`) 1 profesional, 2 equipos, 1 consultorio (+ adicionales con `max_locs`) · Consultorio 3 profesionales, 5 equipos · Centro 8 profesionales, 12 equipos. Excepciones por cuenta en el panel (`lim_pros`, `lim_devices`, `max_locs`).
- El servidor rechaza: pedidos de equipos no registrados (encabezado `x-ov-device`, tabla `ov_devices`), más profesionales o consultorios que los del plan y pasar a «consultorio o centro» con un plan de un profesional. La app avisa antes con «Límite de tu plan» y botón para pedir el cambio.
- Equipos: cada equipo se registra solo; si se llega al máximo, pantalla para liberar uno (hasta 4 por mes; más, desde el panel). Prueba gratis desde un equipo que ya usó otra cuenta: queda marcada para revisar en el panel.
- Tipos de cuenta con los nombres de la web: «Profesional» y «Consultorio o centro». Panel de licencias: plan con sus límites, excepciones, equipos por cuenta y sugerencias.

## OdontoVoz 1.11.1 · desconectar equipos de verdad
- «Quitar»/«Desconectar» un equipo (desde el panel o desde otro equipo) ya no borra el registro: lo marca desconectado (`removed_at`, `removed_by`; SQL `supabase/equipos-desconectar.sql`). Ese equipo no puede volver a registrarse solo.
- La app revisa su registro cada minuto y en el acto si el servidor le rechaza un cambio; si está desconectado, cierra la sesión, borra los datos de ese equipo y al volver a abrir explica el motivo. Para usarlo otra vez hay que ingresar de nuevo y entra como equipo nuevo.
- Las desconexiones hechas por el soporte no cuentan para el límite de 4 por mes del cliente.

## OdontoVoz 1.11.2
- Agenda: el menú «Más» ya no se corta en los días que no son hoy (se acomoda siempre dentro de la pantalla). Se sacó el botón «Hoy» repetido; el de siempre ahora también lleva a la hora actual.

## OdontoVoz 1.12 · turnos más ágiles y sobreturnos
- Paciente al paso: para dar un turno alcanza con el nombre (y el teléfono para el recordatorio). Apellido y DNI son opcionales; la ficha y el turno avisan «falta apellido y DNI» con un botón para completarla cuando el paciente viene. También desde Pacientes › Nuevo paciente y por voz.
- Si se escribe un nombre que no existe y se toca «Agendar», se crea el paciente con ese nombre.
- Turno nuevo: interruptor «Turno / Sobreturno», hora y minutos en dos listas con atajos ±15, y aviso en vivo de qué hay a esa hora; si choca, «Darlo como sobreturno» o «Buscar el próximo libre».
- Agenda: los sobreturnos ya no achican los turnos; flotan semitransparentes y punteados sobre la mitad derecha. Turno abierto: «+ Sobreturno a las 10:30».

## OdontoVoz 1.13 · cerrar sesión y agenda de cada profesional a medida
- Menú: «Cerrar sesión» al fondo, con el correo de la cuenta (aparece cuando hay una cuenta en la nube abierta).
- Centro, profesionales y horarios › Editar datos y horarios: cada día muestra sus horarios; «+ Agregar horario» permite elegir uno o varios días, desde, hasta y si es todas las semanas o semana por medio. Tocar un horario lo cambia o lo quita. «Empezar de cero» deja la agenda vacía (se puede deshacer).
- Alta de profesional: nueva opción «Lo armo yo, de cero», que lo crea sin horarios y abre directamente el armado de su agenda.

## OdontoVoz 1.14 · agenda del celular más extendida
- Deslizar la agenda hacia los costados ya no cambia de día (pasaba sin querer al mover la barra de consultorios). El día se cambia tocando la tira de días o con las flechas.
- Flechas flotantes «‹ Hoy ›» abajo a la izquierda, siempre a mano mientras se recorre la agenda.
- Arriba ocupa mucho menos: Día/Semana/Mes, «+ Turno» y «Más» en una sola fila; la fecha se elige tocando el título; «Colores de los turnos» pasa adentro de «Más»; se sacan los textos de ayuda; tira de días y resumen más bajos.
- Los consultorios se muestran todos (en dos líneas si hace falta), sin tener que deslizarlos.
- La agenda del día se extiende hacia abajo y se recorre con la pantalla, sin una caja con su propio desplazamiento.

## OdontoVoz 1.15 · agenda quieta y la app arranca en Inicio
- La tira de días ya no se mueve sola al tocar otras opciones de la agenda (Más, + Turno, Día/Semana…): solo se centra cuando elegís otro día o tocás «Hoy».
- Al entrar a la agenda se ve desde arriba, sin saltar a la hora actual.
- Al abrir la app, o al volver a ella después de 2 minutos o más, arranca en la carátula de Inicio. Si había una ventana abierta (por ejemplo, un turno a medio cargar) se respeta para no perder lo escrito.

## OdontoVoz 1.16 · segundo plano configurable y profesionales al costado de la agenda
- La app vuelve a Inicio recién después de 15 minutos en segundo plano. Se cambia en Menú › Apariencia (5, 10, 15, 20, 30 minutos, 1 hora o nunca), por equipo.
- Centro: en la PC, columna de profesionales a la izquierda (tocás uno y ves su agenda, o «Todos») y calendario de tres meses a la derecha, con los días que atiende marcados. En el celular, fila de tarjetas de profesionales arriba de la tira de días.

## OdontoVoz 1.17 · planes y alquiler de módulos
- Nuevo plan Red (dueño de hasta 5 centros): ya está cargado en el servidor y en el panel de licencias. El modo Red para el dueño llega en la próxima versión.
- La prueba gratis trae todo (todos los planes) para conocerla; al pagar, la cuenta queda con el plan contratado (se cambia desde el panel).
- Menú › Mi plan: muestra el plan actual (o los días de prueba que quedan) y los planes con su precio; «Mejorar a este» abre el WhatsApp de soporte con el pedido armado.
- Liquidaciones › cada profesional: «Cómo trabaja»: porcentaje de lo que factura, alquila un módulo (se queda con lo que factura y paga el módulo) o porcentaje + módulo. El módulo se cobra por hora, por turno o por día, se calcula solo con la agenda (hasta hoy, sin cancelados ni ausentes) y se descuenta automáticamente en la liquidación.

## OdontoVoz 1.17.1 · «Cambios de hoy» con enlaces
- Cada cambio de la lista se ve como enlace y lleva a su lugar, marcado por un momento: el turno en la agenda (y lo abre), la sección de la ficha que se tocó (evolución, cuenta, presupuestos…), los recordatorios del inicio, la caja, o la configuración del consultorio, logo o turnero.

## OdontoVoz 1.18 · puesta en regla legal
- Páginas nuevas en la web: **Términos y condiciones** (con el contrato de encargado de datos y las bases de las promociones), **Política de privacidad** reescrita y **Botón de baja / Botón de arrepentimiento** (`sitio/baja.html`), con código de constancia en el momento. La portada muestra los dos botones arriba de todo.
- La voz pide permiso en cada equipo antes de usarse, porque el audio pasa por Google. Se puede desactivar en Cuenta y equipos.
- Al registrarse se acepta la versión de los términos y queda guardada en el servidor (versión y fecha). Si los términos cambian, la app los pide de nuevo.
- En Cuenta y equipos: «Privacidad y legales» con baja, arrepentimiento o eliminación de la cuenta (borra también las fotos de la nube).
- Las «recetas» pasan a llamarse «Indicaciones para el paciente» y aclaran que no sirven para farmacia (Ley 27.553).
- Nueva plantilla de consentimiento: «Uso de datos personales» (Ley 25.326).
- Las fuentes de letra se sirven desde la propia app (no se pide nada a Google Fonts).
- Panel de licencias: pedidos de baja/arrepentimiento/eliminación, versión de términos aceptada y botón para eliminar una cuenta.
- SQL: `supabase/legal.sql` (correr una vez en Supabase › SQL Editor).

## OdontoVoz 1.19 · modo Empresa
- Nuevo plan **Empresa** (antes «Red»): un dueño con 2 a 5 consultorios en una sola cuenta. Se activa desde Menú › «Modo Empresa» o en el tipo de cuenta.
- **Inicio del dueño**: totales del día (cobrado, gastado, saldo, turnos, profesionales) y un recuadro por consultorio con ingresos, egresos, saldo, turnos (atendidos, por venir, ausentes), próximos pacientes, profesionales del día, avance de la meta del mes y avisos (caja sin cerrar, atendidos sin cobrar, stock bajo, pagos vencidos).
- **Cada equipo pertenece a un consultorio** y solo ve ese; los equipos del dueño ven todo. Lo controla el servidor: un equipo de consultorio no puede leer sueldos, liquidaciones, metas, la caja general ni la caja y el registro de otros consultorios.
- **Caja por consultorio**: cobros por medio de pago, egresos y otros ingresos, pagos pendientes y cierre diario con arqueo (quién cerró y si faltó o sobró).
- **Personal**: recepción, asistentes, administración y otros, con consultorio, horario, sueldo (solo lo ve el dueño) y PIN. Los sueldos se cargan solos cada mes como pendientes.
- **Ingreso con PIN** en los equipos compartidos, con permisos por puesto (dueño, administración, recepción, profesional, asistente) y bloqueo por inactividad.
- Sección **Empresa**: resumen del mes (lo que le queda a la empresa por consultorio), consultorios y profesionales, personal, liquidaciones por consultorio, estadísticas de 6 o 12 meses (facturación, resultado, ocupación, atendidos, ausentismo, nuevos, ticket promedio, presupuestos, por profesional, por prestación y gastos), por cobrar, metas, stock de insumos, equipos, registro de quién hizo qué y reporte mensual en PDF y Excel.
- SQL: `supabase/empresa.sql` (correr una vez en Supabase › SQL Editor).

## OdontoVoz 1.19.1
- Precio del plan Empresa: $178.900 por mes (IVA incluido) en la app, la portada y los términos.

## OdontoVoz 1.20 · cuotas y voz más natural
- **Planes de pago en el presupuesto**: contado (con descuento opcional) y 3, 6, 9 y 12 cuotas con interés mensual sugerido y editable (2,5%, 3%, 3,3% y 3,6%), cuota, total y recargo de cada uno. Se elige qué ofrecer y cuál eligió el paciente; los intereses se pueden guardar como predeterminados.
- El presupuesto (pantalla, PDF y documento firmado) muestra los planes ofrecidos con su TEM y TEA, y la aclaración sobre la financiación (precio de contado, sistema francés, costo financiero total).
- El cronograma de pagos usa la cuota con interés. Al aceptar, los intereses (o el descuento por contado) se suman a la cuenta del paciente.
- **Plan de tratamiento**: opción «Ofrecer planes de pago en cuotas», calculados sobre lo que falta, en la pantalla, el PDF y el mensaje de WhatsApp.
- **Voz**: entiende muchas más formas de pedir ir a un lugar («llevame al inicio», «¿me podés llevar a la pantalla de inicio?», «quiero que me lleves a…», «pasame a la pantalla de pacientes», «¿me mostrás la caja?», «llevame a la empresa»…) y palabras repetidas («llevame llevame…»).

## OdontoVoz 1.20.1 · agenda
- La agenda se queda donde estabas trabajando: al agendar, mover o cambiar un turno ya no vuelve arriba. Vuelve arriba solo cuando entrás a la agenda desde otra sección.
- Las horas de la izquierda siguen la duración de turno del profesional: cada 15, 30 o 60 minutos (o 20, 40, 45), con una línea en cada turno.

## OdontoVoz 1.20.2
- Nuevo turno o sobreturno: los casilleros de la hora y los minutos son más anchos y muestran la hora elegida (en la PC quedaban tan angostos que no se veía el número).

## OdontoVoz 1.21 · control del día
- Caja: la barra de secciones queda fija arriba y en el mismo lugar en todas las secciones.
- Caja › **Control del día**: prácticas realizadas (producción), cobrado, lo que quedó en cuenta corriente, turnos; controles en verde o amarillo (atenciones sin práctica cargada, prácticas sin cobrar, turnos sin marcar, caja sin cerrar); tabla por profesional; lista de atenciones sin práctica con «Cargar práctica» o «Sin cargo»; lo realizado sin cobrar con «Cobrar»; detalle de prácticas; movimientos de caja del día. Se puede ir a días anteriores.
- **Libro diario del mes** en Excel (prácticas, cobros, ajustes, ingresos y gastos) para el contador.
- Nueva categoría de gasto: «Retiro del dueño».
- Agenda: los turnos atendidos sin práctica cargada muestran la marca «sin práctica».
- Modo Empresa: el inicio del dueño muestra las prácticas del día (total, por consultorio y por profesional, y lo que quedó sin cobrar) y avisa las atenciones sin práctica. La caja de cada consultorio empieza con su control del día. Las prácticas cargadas desde un equipo de consultorio quedan en ese consultorio.

## OdontoVoz 1.22 · la empresa como árbol
- Cada consultorio tiene su propia agenda: solo sus profesionales y solo los turnos dados en ese consultorio. Un consultorio sin profesionales ya no muestra los de otro: muestra una pantalla para sumar un profesional nuevo o uno que ya trabaja en otro consultorio.
- Arriba de la agenda, el inicio, la caja y los pacientes aparece el camino «🏢 Empresa › Consultorio › profesionales»: tocando «Empresa» volvés al inicio de la empresa, con la lista cambiás de consultorio y con los nombres ves la agenda de todos o de uno.
- Empresa › Consultorios muestra el árbol: la empresa, sus consultorios y los profesionales de cada uno. Tocando un consultorio entrás a su agenda; tocando un profesional, a la suya en ese consultorio. «+ Profesional» lo crea directamente en ese consultorio y «Mover» cambia en qué consultorios atiende.

## OdontoVoz 1.23 · usuarios del equipo
- **Arreglo importante:** desde la 1.18 el registro de cuentas nuevas fallaba en el servidor. Se corrige con `supabase/equipo.sql`.
- El dueño invita a su secretaria, a los odontólogos y a la administración con un enlace (Cuenta y equipos › Usuarios del equipo, o Empresa › Personal). Cada persona crea su propio usuario con su correo y su contraseña, gratis: usa la cuenta del dueño, que es quien paga. Nadie necesita la contraseña del dueño.
- Cada persona tiene un puesto y un consultorio, y el servidor decide qué puede bajar y cambiar:
  - Recepción: agenda, turnos, pacientes (datos y cuenta, sin historia clínica), cobros y la caja de su consultorio.
  - Profesional y asistente: su agenda, pacientes con historia clínica, prácticas, presupuestos y cobros; no ven la caja, las liquidaciones ni los números de la empresa.
  - Administración: todo menos sueldos y metas.
  - Nadie del equipo puede cambiar el plan, el tipo de cuenta, borrar la cuenta ni pedir la baja; solo el dueño y la administración cambian ajustes, profesionales y personal.
- El dueño cambia el puesto o el consultorio de una persona, o le quita el acceso al instante: se desconectan sus equipos y en ellos se borran los datos del consultorio.
- El PIN sigue sirviendo para una compu compartida que usa la cuenta del dueño.
- Pantalla de registro: las casillas de términos se leen bien en el celular.

## OdontoVoz 1.23.1 · el asistente entiende más formas de pedir
- El asistente reconoce el mismo pedido dicho de distintas maneras: «abrime», «¿me abrís…?», «quiero que abras…», «¿podés abrirme…?», «necesito ver…», «me dejás ver…», «quiero que me pongas…».
- «El inicio de la aplicación» o «de la app» se entiende como el inicio.
- «¿Qué turnos tengo hoy?» o «¿qué pacientes hay mañana?» abre la agenda de ese día; «¿cuánto cobramos hoy?» abre la caja.
- «Quiero hacerle un presupuesto a Juan Pérez» abre su plan y arma el presupuesto; «quiero cobrarle 20 mil a Juan Pérez» registra el cobro.

## OdontoVoz 1.24 · turnos sin ficha, bloquear y notas en la agenda
- **Turno sin ficha:** al escribir un nombre en el turno aparece «Agendar a … solo en la agenda». Queda con nombre y teléfono (para el recordatorio), sin entrar a la lista de pacientes. La casilla «Guardarlo ya en la lista de pacientes» elige lo contrario (y el equipo recuerda la elección).
- Cuando el paciente llega (al marcar Llegó/En atención/Atendido o al abrir su ficha) la app pregunta: «¿Ya tenía ficha?» con los parecidos por nombre o teléfono. «Es …» une los turnos a esa ficha (no queda duplicado); «Es nuevo» lo pasa a la lista para completar los datos.
- En Pacientes, los que están solo en la agenda van en un recuadro aparte.
- **Bloquear y Nota desde el mismo toque:** al tocar un hueco de la agenda, arriba están Turno · Sobreturno · 🔒 Bloquear · ✎ Nota. El bloqueo tiene motivos rápidos (Curso, Trámite, Salgo y vuelvo…), duración o «hasta el final», y puede ser para todos los profesionales. La nota es un mensaje amarillo que no ocupa el horario. Ambos muestran quién lo dejó y cuándo; una nota se puede convertir en bloqueo.

## OdontoVoz 1.24.1 · recuperar la contraseña sin trabas
- Al abrir el enlace del correo en un navegador nuevo (por ejemplo, el que abre la app de Gmail), la bienvenida tapaba la pantalla «Nueva contraseña»: la persona creía que el enlace no andaba, volvía a tocarlo y ahí sí vencía. Ahora la pantalla aparece directo, con la cuenta a la que corresponde.
- Si el enlace ya se usó o venció, la app lo explica y deja pedir otro en el mismo lugar (antes no decía nada).
- Si se piden varios correos seguidos (el servidor manda pocos por hora hasta que esté el correo propio), se avisa que hay que usar el último que llegó.

## OdontoVoz 1.25 · aviso de turnos pedidos online
- Cuando un paciente se agenda solo por el turnero online, **todos los equipos** de la cuenta avisan (no solo el que bajó el pedido): cartel arriba con el nombre, el día, la hora, el profesional, el consultorio y el motivo, que queda hasta cerrarlo, con «Ver» que abre el turno en la agenda. Suena y vibra según Avisos y sonidos.
- Con «Notificación del sistema» activada (Menú › Avisos y sonidos), también llega como notificación del celular o de la compu mientras OdontoVoz esté abierta o en segundo plano.
- En el inicio, «Turnos pedidos online» junta los que todavía no marcaste como vistos.
- Cada profesional del equipo recibe solo los suyos; en Empresa, cada consultorio los suyos. Interruptor propio en Avisos y sonidos.
- Arreglo: el cartel de «Llegó un paciente» se veía con letra y colores equivocados.

## OdontoVoz 1.26 · casilla de notificaciones
- Sobrecito arriba a la derecha (web y APK) con un numerito rojo de las no leídas. Al tocarlo baja una solapa con las notificaciones; tocar una lleva a su lugar y la marca como leída. «Marcar todas como leídas» y × para borrar.
- Qué avisa:
  - turnos pedidos online;
  - pacientes que llegaron (marcados desde otro equipo);
  - versión nueva (en la web, lista para actualizar; en el APK, cuando hay uno nuevo para bajar);
  - trabajos de laboratorio atrasados, que vuelven hoy o mañana, o que llegaron y el paciente no tiene turno;
  - recordatorios de mañana sin mandar (desde el mediodía);
  - notas y bloqueos que otra persona dejó en la agenda;
  - plan o prueba que vence en 5 días o menos (solo al dueño);
  - equipo que hace más de un día no guarda en la nube.
- Cada persona ve lo suyo: el odontólogo, sus pacientes y trabajos; la recepción, recordatorios y turnos; el dueño, todo.

## OdontoVoz 1.27 · avisos que se corren y revisión general
- Los avisos de confirmación (arriba en el celular) ya no tapan la barra: aparecen debajo, tienen una × y se cierran deslizándolos hacia un costado (o hacia arriba). Lo mismo los carteles de «Llegó» y «Turno online». Duran lo mismo que antes.
- Arreglo importante: en la Caja, «Guardar» un movimiento nuevo (ingreso o egreso) daba error porque otra ventana usaba el mismo nombre de botón. Ya guarda bien.
- Revisión general: se recorrieron todas las secciones y botones en celular y PC (cuenta común, Empresa, recepción y profesional), las páginas del sitio y el servidor.

## OdontoVoz 1.27.1
- Arreglo: las invitaciones creadas desde el APK armaban el enlace con «localhost» (la dirección interna del celular) y al abrirlo daba «no se puede acceder». Ahora el enlace siempre es el de la app publicada.

## OdontoVoz 1.28 · turno con ventanita rápida
- En la agenda, tocar el **nombre** del paciente abre su ficha resumida (como antes); tocar **el resto del turno** abre una ventanita rápida (en el celular, desde abajo) con: obra social para cambiar, teléfono con WhatsApp, asistencia, motivo u observación, quién dio el turno y cuándo, y botones Nuevo sobreturno, Modificar turno, Copiar, Mover a otro horario (se elige tocando la agenda) y Liberar turno. Abajo, «Abrir la ficha completa».
- Cada turno muestra la obra social (o «Particular») al lado del nombre y el motivo después de la práctica.
- Al cargar un paciente nuevo desde el turno se elige la obra social.
- En la PC la agenda ya no tiene una caja con su propio scroll: se ve el día entero y se baja con la rueda del mouse.

## OdontoVoz 1.29 · Empresa › Centros › Consultorios › Odontólogos
- En el modo Empresa, lo que antes se llamaba «consultorio» (cada sede) ahora se llama **centro**, y cada centro tiene sus **consultorios** (sillones): se crean con un toque (1 a 6) y se les cambia el nombre (Consultorio 1, Box A…).
- **Rotación semanal**: en Empresa › Centros, «Consultorios y rotación» muestra cada día de la semana con sus consultorios y quién atiende en cada uno y en qué horario. «+ Asignar» elige odontólogo, consultorio, día, todo su horario o solo una parte, y todas las semanas o semana por medio. Avisa si dos se pisan en el mismo consultorio o si uno quedó en dos a la vez, y marca quiénes atienden ese día sin consultorio. «Repartir solos» completa la semana y «Copiar lunes a otro día» repite un día. En la PC, resumen de toda la semana.
- El árbol de Organización queda Empresa › Centro › Consultorio › Odontólogos (con sus días), más «Sin consultorio fijo».
- En la agenda del centro se elige un consultorio y se ven solo quienes trabajan ahí ese día; cada turno muestra su consultorio (C1, C2…) y la ventanita del turno también.

## OdontoVoz 1.29.1
- Arreglo: el botón del correo de confirmación de cuenta (y el de recuperar contraseña) a veces llevaba a una página con error 404. Ahora siempre vuelve a la app.

## OdontoVoz 1.30 · de «Qué hice hoy» a la caja
- El odontólogo escribe o dicta lo que hizo en «Qué hice hoy» («composite oclusal 25 y 26, limpieza», «le saqué la 18», «raspaje 2 cuadrantes»). La app arma las prácticas con su precio (lo que paga el paciente según su obra social, o el arancel particular), se confirman con un toque y se puede cambiar el importe o agregar otra del catálogo. Quedan en la historia clínica, en el odontograma y en la cuenta del paciente.
- Botones: **Mandar a recepción**, **Cobrar yo** o **Solo nota**. En los modos profesional y consultorio: **Cobrar ahora** o **Cobrar después**. El dueño elige quién le cobra a cada profesional (recepción o él mismo).
- **Para cobrar**: en el inicio y en la caja aparece cada paciente que mandaron, con el consultorio, el odontólogo, el detalle y el total (avisa también en la casilla de notificaciones). «Cobrar» acepta uno o dos medios de pago, suma lo que debía de antes si se quiere, y «Queda debiendo» lo deja en su cuenta. En la ventanita del turno aparece «Cobrar».
- **Cobrado hoy** abre el resumen del día del centro: total, lo que falta cobrar, por forma de pago, por consultorio y por odontólogo, y «Ir a cerrar la caja».
- El odontólogo con usuario del equipo ve solo sus pacientes por cobrar; la recepción ve todo el día de su centro.

## OdontoVoz 1.31 · usuarios del equipo sin correo
- Cada cuenta tiene un **código** (Menú › Cuenta › Usuarios del equipo; el dueño lo puede elegir antes de crear el primer usuario).
- El dueño **crea usuarios** para su equipo con nombre, usuario, contraseña, puesto, centro y profesional, sin pedir correo. Le aparecen los datos para mandar por WhatsApp o copiar. Puede cambiarles la contraseña (se les cierra la sesión) y quitarles el acceso.
- En el ingreso: **«Entrar con usuario del equipo»** con Cuenta, Usuario y Contraseña. La app recuerda los lugares donde se entró en ese equipo para elegirlos con un toque, y «Entrar en otro lugar» (Menú › Cuenta) cambia de lugar.
- Una persona puede tener usuarios en varias cuentas (uno por cada lugar donde trabaja) sin necesitar más correos. La invitación por correo sigue como opción.
- Servidor: `supabase/subusuarios.sql`.

## OdontoVoz 1.31.1
- Arreglo: en «Usuarios del equipo», una persona sin acceso se dibujaba encima de la ventana (rayada y fuera de lugar). Ahora queda en la lista, atenuada.

## OdontoVoz 1.32 · agenda más arriba
- En la PC la parte de arriba de la agenda es más compacta: título más chico con el año al lado, botones más bajos, tira de días más baja, sin el texto de ayuda y con «Colores de los turnos» dentro de «Más». La grilla empieza unos 130 píxeles más arriba.
- En el celular, un poco más compacta también (tarjetas de profesionales más bajas), sin achicar los botones.

## OdontoVoz 1.32.1
- La **Evolución clínica** de la ficha también reconoce las prácticas («hoy hice una restauración con resina por oclusal del 25»): las marca en el odontograma en rojo (realizado), las carga con su precio y las manda a cobrar, igual que «Qué hice hoy».
- Se entienden mejor las caras juntas: «mesial y oclusal», «mesial, oclusal y distal».

## OdontoVoz 1.33 · stock de insumos
- Menú › **Stock de insumos** en todos los modos (en Empresa, también en Empresa › Stock, separado por centro).
- **Catálogo sugerido** de 48 insumos odontológicos con cuántos usos rinde cada uno (guantes, anestesia, composite, limas, gutapercha, suturas, alginato, bolsas de esterilización…). Todo editable.
- **Descuento automático**: cada vez que se cargan prácticas en «Prácticas de hoy» se descuenta lo que usa cada práctica (por ejemplo, una restauración usa 1 cartucho de anestesia, 1 aguja, 1 uso de composite, grabador, adhesivo…), más lo de toda atención (guantes, barbijo, babero, eyector, vaso, bolsa de esterilización) una vez por paciente por día. Las cantidades se cambian en «Qué usa cada práctica».
- **Llegó mercadería** (con vencimiento y nota), **Usé algo** (en unidades o usos, o vencido/roto), **Contar el stock** (todo de una vez), historial por insumo y **Movimientos**.
- **Para comprar**: lo que está bajo el mínimo o no llega a 30 días según lo que se viene usando, con el pedido para mandar por WhatsApp o copiar.
- En Empresa: **Pasar a otro centro**.
- Avisos en el sobre: insumos con poco o nada y vencimientos cercanos (uno por día).

## OdontoVoz 1.33.1
- Stock: al volver de un insumo, la lista queda donde estaba y marca el que tocaste (antes volvía arriba de todo).
- El siguiente insumo se abre en la misma pestaña que usaste (por ejemplo «Contar»), con el número listo para escribir; Enter guarda.
- En «Contar el stock», Enter pasa al siguiente casillero.

## OdontoVoz 1.34 · una cuenta en varios consultorios
- Con la misma cuenta se puede trabajar en el consultorio propio y en los de otros dueños que te invitan (los que quieras). El enlace de invitación se abre con la cuenta de siempre y el lugar se suma; también se puede escribir el código en Menú › **Dónde trabajás**.
- Para cambiar de lugar: tocá el nombre del consultorio arriba (debajo del título) o Menú › Dónde trabajás. Cada lugar tiene sus pacientes, su agenda y lo que su dueño te permite ver; al cambiar se guarda lo de acá y se bajan los datos del otro lugar.
- En tu agenda se ven también **tus turnos de los otros lugares** donde sos profesional, rayados y en otro color (solo se ven; tocándolos se puede entrar a ese lugar), con un aviso arriba del día. Si das un turno a una hora en la que estás en otro lugar, avisa.
- Se puede dejar un lugar desde la misma pantalla. El dueño sigue pudiendo cambiarte el puesto o quitarte el acceso.
- Servidor: `supabase/vinculos.sql`.

## Web pública (7/11/2026)
- La página de inicio se rediseñó para vender: portada «Dictás lo que hiciste. OdontoVoz hace el resto.», sección «Lo que solo tiene OdontoVoz» (Qué hice hoy → odontograma, cobro, stock; Para cobrar; stock automático; una cuenta en varios consultorios; equipo sin correo; Empresa con rotación; firma; turnero; cuotas; asistente), «Sin / Con OdontoVoz», los cuatro modos, un día con el flujo nuevo, descargas con tarjeta «iPhone y iPad · Compatible con Apple», preguntas frecuentes, cierre con prueba gratis y WhatsApp, y botones fijos «Probar gratis / Ver planes» en el celular.
- Web: sección «Miralo funcionar» con video de 29 s del recorrido «Qué hice hoy → recepción → cobro → cierre» (`sitio/video/que-hice-hoy.mp4`) y capturas nuevas (Prácticas de hoy, Para cobrar, Cobrar, Stock, Dónde trabajás, Resumen del día, Para comprar, turnos de otros lugares). App: «del 25 y del 26» ahora toma las dos piezas.

## OdontoVoz 1.35 · precios en dólares
- Planes en dólares con su equivalente en pesos (USD 1 = $1.570): Profesional USD 17 ($26.690) + USD 3 ($4.710) por consultorio adicional; Consultorio USD 33 ($51.810); Centro USD 57 ($89.490); Empresa USD 114 ($178.980). IVA incluido.
- En la app (Menú › Mi plan), en la portada y en los términos (nueva versión 2026-11-07: los precios se fijan en dólares; en Argentina se cobran en pesos al dólar de referencia). Los usuarios vuelven a aceptar los términos al entrar.
- Para cambiar el dólar o los precios: `DOLAR`/`USD` en `src/app25.js`, `DOLAR`/`PLANES` en `sitio/index.html` y la tabla de `sitio/terminos.html`.

## OdontoVoz 1.36 · modo LITE y plan Profesional LITE
- **Modo LITE**: versión simple para quien no se lleva bien con la tecnología. Inicio con cuatro botones grandes (Agenda, Dar un turno, Pacientes, Recordatorios), turnos de hoy con «Llegó», «Atendido» y WhatsApp a un toque, y «Cobrado hoy».
- Agenda en lista, día por día (‹ día ›, tocar la fecha para elegir otro). Dar un turno en tres pasos: paciente (o paciente nuevo con nombre y celular), día y hora; si choca, ofrece darlo como sobreturno.
- Pacientes: buscador grande y ficha simple con Llamar, WhatsApp, Dar turno, Editar datos, próximos turnos, notas de cada visita (escritas o dictadas, van a la historia clínica) y cobros.
- Recordatorios: hoy, mañana o pasado; «Mandar» abre WhatsApp con el mensaje listo y después se marca «Confirmó».
- Plan **Profesional LITE**: USD 8 ($12.560) por mes, 1 profesional, 1 consultorio, 2 equipos. Esa cuenta usa solo LITE: lo demás muestra «OdontoVoz PRO» con el botón para pedir el cambio.
- Los planes pagos pasan a llamarse **Profesional PRO, Consultorio PRO, Centro PRO y Empresa PRO**. Con PRO (y en la prueba) se pasa de una versión a la otra con un toque: Menú › Modo LITE / Pasar a PRO, o el botón del inicio. Se recuerda en cada equipo (`odontovoz.lite`).
- El servidor no necesitó cambios: un plan `lite` ya queda con los límites de un profesional. En el panel de licencias aparece «Profesional LITE» para elegir.

## Web pública (7/11/2026, noche)
- Portada: recuadro **Acceso rápido** debajo de «Probala gratis» con tres botones: Usar en la web (`app/`), Android: bajar APK (descarga directa) e iPhone y iPad (abre los pasos de Safari). El botón «Descargar» pasa a «Todas las descargas».
- Encabezado: enlace «Entrar» (abre la app) al lado de «Probar gratis».
- Barra fija del celular: «Probar gratis» + «Android (APK)»; en iPhone el segundo botón dice «Instalar en iPhone» y en la PC «Abrir la app».

## OdontoVoz 1.36.1 · la tira de días arranca en hoy
- Al entrar a la Agenda (desde el menú, la barra o el inicio) se abre siempre el día de hoy, con la tira de días centrada en ese día. Antes, al volver a la app, a veces quedaba corrida al principio del mes anterior (por ejemplo, en el 27 de octubre).
- El día de hoy se marca con un recuadro y la palabra «HOY»; si además es el día elegido, va relleno de color.
- Si deslizás la tira y el día de hoy queda fuera de la vista, o elegís otro día, aparece el botón **Hoy**, que vuelve al día de hoy y lo centra.
- Si volvés a la app con la agenda abierta después de más de un minuto, vuelve a hoy, centrado.

## OdontoVoz 1.37 · inicio más simple y tema claro de día
- Inicio: debajo de «Buen día» queda una fila de íconos chicos con su nombre abajo: **Buscar paciente**, **Agenda**, **Ajustes**, **Paciente nuevo** y **Menú**. Los turnos de hoy van debajo. Los accesos se siguen pudiendo elegir y ordenar desde Menú › Apariencia.
- El ofrecimiento del modo LITE ahora es un botoncito «LITE» arriba a la derecha del saludo.
- Tema: **claro por defecto**. En Menú › Apariencia › Tema: Claro, Oscuro, **Día y noche** (oscuro de 20:00 a 07:00, con las horas configurables, según la hora del equipo) o Como el celular. Se guarda en cada equipo (`odontovoz.theme`, `odontovoz.themeNight`).

## OdontoVoz 1.38 · Ajustes en un solo lugar, Empresa más simple, copagos y videos
- **Ajustes** (tuerquita en el inicio y en el menú): una pantalla con todo lo configurable, ordenado en Consultorio, La app en este equipo, Cuenta y datos y Ayuda. Al cerrar una opción se vuelve a Ajustes.
- Menú: se puede arrastrar a medias; al soltar se abre o se cierra solo según dónde quedó.
- Agenda en domingo (o un día sin atención): la tira muestra hoy y lo centra; antes saltaba a otra fecha.
- Al cambiar de cuenta o de lugar, la app arranca en Inicio.
- **Empresa más simple**: 4 pestañas (Resumen, Centros, Personal, Pagos a profesionales) y «Más» con tarjetas (Por cobrar, Estadísticas, Metas, Stock, Equipos, Registro, Reporte). El resumen muestra arriba Facturado, Cobrado y Le queda a la empresa; el detalle por centro y las tablas largas quedan plegadas; las ayudas largas ocupan una línea y se abren al tocarlas.
- **Coseguros y copagos**: en cada obra social se elige qué se le cobra al paciente: coseguro fijo, la diferencia con el precio del consultorio, o nada. Al confirmar las prácticas se ve cuánto paga la obra social, el precio del consultorio y lo que paga el paciente (se puede cambiar por práctica). El cargo guarda `os`, `osCov` y `cop`. Arreglo: «limpieza y control» se tomaba como consulta (01.01) en vez de 08.12.
- **Videos tutoriales** de menos de un minuto para Profesional, Consultorio y centro, Empresa y LITE: en Menú › Videos tutoriales, en Ajustes › Ayuda, en el tutorial paso a paso y en la web (`sitio/video/tut-*.mp4`).

## OdontoVoz 1.38.1 · inicio con Paciente nuevo y Ajustes, y más información en la PC
- Accesos del inicio: sale «Menú» (ya está arriba) y entran **Ajustes** (tuerquita) y **Paciente nuevo** al lado de «Buscar paciente». Los equipos que ya tenían sus accesos guardados se pasan solos una vez (`odontovoz.homeV`).
- Arreglo: después de andar por varias secciones el inicio a veces volvía con el formato viejo (se dibujaba sin pasar por `afterRefresh`); ahora se vigila y siempre queda con la fila de íconos.
- PC (1100 px o más): a la derecha del inicio, un panel con Próximos turnos, Los próximos 7 días (barras por día), Caja (cobrado hoy, 7 días, producción, esperando cobro; solo dueño o administración) y Pacientes. Tocar un turno o un día abre la agenda en ese día. En el inicio de Empresa no se muestra.

## OdontoVoz 1.38.2 · WhatsApp o WhatsApp Business
- En Android, al tocar cualquier botón de WhatsApp (recordatorio del turno, presupuesto, turnero, avisos) la app pregunta si abrir **WhatsApp** o **WhatsApp Business**, con «Recordar en este equipo». Se cambia en Ajustes › La app en este equipo › WhatsApp para recordatorios (`odontovoz.waApp`: ask/wa/biz).
- En la computadora y el iPhone sigue igual (wa.me abre el WhatsApp principal).
- APK: la app ahora abre enlaces `intent://` y `whatsapp://` (nueva `MainActivity` en `scripts/patch-android.js`), necesario para elegir WhatsApp Business.

## OdontoVoz 1.39 · Secretaria virtual por WhatsApp (servicio aparte)
- Nueva sección **Secretaria por WhatsApp** (menú, debajo de Turnero online): Inicio (planes o estado del servicio, charlas del mes, calidad del número, frenar/reanudar recordatorios), **Charlas** (bandeja: tomar la charla, devolver al asistente, responder dentro de las 24 h, ver ficha), **Configurar** (encendido, nombre, dar turnos, lo que tiene que saber del consultorio, recordatorios automáticos, hora y tope diario) y **Probala**.
- **Probala**: con cuenta real usa la IA de verdad (función `wa-sim`) con la agenda del consultorio y pide turnos marcados PRUEBA; sin cuenta o si la IA no está encendida, una simulación en el equipo. Pensado para que los testers la prueben antes de conectar WhatsApp.
- Servidor (`supabase/functions`): `wa-webhook` (Meta → IA → respuesta; BAJA/ALTA; botones Confirmo/Cambiar; tope de charlas y de respuestas), `wa-send` (responder desde la app), `wa-cron` (recordatorios 9–20 h con tope y calidad del número: en ROJO se frenan solos), `wa-sim` (prueba con IA). SQL `supabase/whatsapp.sql`. Publicación automática con `.github/workflows/functions.yml` cuando exista el secreto `SUPABASE_ACCESS_TOKEN`.
- Planes: Secretaria Profesional USD 29 (100 charlas), Consultorio USD 49 (300), Centro USD 89 (800); 100 charlas extra USD 10. En portada, términos, app (`A.WA_PLANS`) y panel.
- Panel de licencias: botón «WhatsApp» por cuenta (estado, plan, cupo, IDs de Meta) y etiqueta con el uso.
- Términos y privacidad versión 2026-11-09: servicio adicional y subencargados Meta y Anthropic (solo si se contrata o se prueba).

## OdontoVoz 1.39.1 · Autogestión por WhatsApp (incluida) + recordatorios automáticos (pago)
- La «Secretaria» pasa a ser **Autogestión por WhatsApp**, una función más incluida sin costo: menú con botones en el WhatsApp del consultorio (pedir turno con los horarios del turnero, dirección y contacto, obras sociales y precios, hablar con una persona). Sin IA, así que no cuesta nada: Meta no cobra las respuestas a quien escribió en las últimas 24 h.
- El único servicio pago son los **recordatorios automáticos** (Confirmo / Necesito cambiarlo): Recordatorios 300 USD 12, 1.000 USD 29, 3.000 USD 69 por mes. Sin el servicio se siguen mandando gratis con el botón de WhatsApp de la agenda.
- Motor del menú común a la app y al servidor: `scripts/wa-menu.js` (lo copia `node scripts/build-wa.js`), con pruebas en `tests/wa/menu.test.mjs` y `tests/wa/testmenu.mjs`. «Probala» muestra los botones tal cual los ve el paciente; en el modo prueba carga el turno en la agenda y con cuenta real lo pide como PRUEBA por el turnero.
- SQL: `ov_wa.rem_plan`, `rem_quota`, `rem_used`, `rem_period`; `ov_wa_chats.state`; `ov_wa_admin_set(owner, status, rem_plan, rem_quota, phone_id, waba_id, display)`; `ov_wa_queue` solo con `rem_plan`. `wa-cron` respeta el cupo del mes. La IA queda guardada (`cfg.ai = true`).
- Portada, términos y privacidad 2026-11-09.2 (sin Anthropic como subencargado) y panel de licencias actualizados.

## OdontoVoz 1.40 · Mudanza gratis desde otro sistema
- **Asistente de mudanza** (`sitio/mudanza.html` + `sitio/mudanza.js`): un botón para la barra de favoritos que se usa con la sesión abierta en Bilog, Dentalink u otro sistema. Escucha lo que la página recibe (fetch/XHR) y lee las tablas, reconoce pacientes, turnos y evoluciones, recorre todas las páginas del último listado (de a poco) y baja `mudanza-odontovoz-….json`. Todo en el navegador; no manda nada a ningún servidor ni guarda contraseñas.
- **Importador nuevo** (`src/app53.js`, Ajustes › «Mudanza desde otro sistema»): lee ese archivo (o Excel/CSV como antes), reconoce columnas también en formato camelCase, carga pacientes sin duplicar, turnos de hoy en adelante (los pasados, opcional, como historial; los cancelados no), evoluciones como «[Sistema anterior]», y los pacientes que solo aparecían en la agenda. Opción «solo pacientes con actividad en los últimos 2 años» (recomendada con más de 5.000).
- Carta modelo para pedir los datos al sistema anterior (Ley 25.326 y 26.529) y botón «Que nos ayuden (gratis)».
- Portada: sección «Te mudamos gratis».

## Mudanza desde Bilog (web, 9/11/2026)
- El asistente de mudanza reconoce Bilog y muestra «Traer todo de Bilog»: trae todos los pacientes (con teléfono, correo, obra social y antecedentes), las evoluciones de la historia clínica y los turnos, sin pasar páginas. Antes hay que abrir un paciente y entrar una vez a «Historia clínica» y «Turnos».

## OdontoVoz 1.40.1
- Ajustes › Cuenta y datos suma **«Equipo e invitaciones»** (crear usuarios e invitar a un odontólogo que ya usa OdontoVoz; solo dueño o administrador) y **«Cuenta y equipos»**. Desde la reorganización de 1.38 no había un acceso visible al equipo.

## OdontoVoz 1.40.2
- El ingreso de usuarios del equipo indica dónde está ahora el cambio de contraseña (Ajustes › Equipo e invitaciones).

## OdontoVoz 1.40.3 (urgente)
- **Arreglo de borrado de datos en la nube.** Un equipo que perdía sus datos locales (al cambiar de cuenta, entrar como usuario del equipo o cambiar de lugar) pero conservaba la «copia base» de la sincronización subía días y lista de pacientes vacíos. Ahora: si los datos locales son nuevos se descarta la copia base y se baja todo; y un freno no deja subir el vaciado de 3 o más días o de más de la mitad de los pacientes (vuelve a bajar todo). `afterLogin` espera a que se borre la copia base antes de recargar.

## OdontoVoz 1.40.4
- Trabajar en el consultorio de otro dueño: los datos de cada equipo quedan marcados con el dueño del lugar (`odontovoz.dataOwner`). Si no coinciden, o si el equipo trabaja en varios lugares y todavía no tiene la marca, se borran los datos locales y la copia base y se baja todo de nuevo, sin subir nada (evita mezclar consultorios).
- El modo LITE es solo del consultorio propio: como persona del equipo de otro lugar se usa la app completa con el puesto asignado.

## OdontoVoz 1.41
- **Evoluciones al odontograma** (`src/app54.js`): lee las evoluciones traídas de otro sistema y marca lo hecho en rojo y lo que dice «la próx / queda / falta / hay que…» como planificado. Sin cara: oclusal (o vestibular en anteriores), avisado. Una sola vez por evolución. Se ofrece al terminar la mudanza y queda un botón en «Mudanza desde otro sistema».
- Cambiar de lugar sin internet ya no borra lo que no se subió: se avisa y no cambia.

## OdontoVoz 1.41.1
- Evoluciones al odontograma, criterio de «estado actual»: lo hecho se marca aunque sea viejo; caries y pendientes solo si son recientes (6 meses, 1 año —predeterminado—, 2 años o todo); lo repetido en la misma pieza y cara se marca una vez (queda la última); la cara supuesta se descarta si la pieza ya tiene la práctica con cara.

## OdontoVoz 1.41.2
- En el odontograma de cada paciente con evoluciones del sistema anterior sin pasar aparece un aviso «Ver y pasar» (antes solo estaba en Mudanza). Mejor lectura: códigos del nomenclador escritos a mano («208 en 34» = obturación), «24 o 25» (o = elegir), errores de tipeo pegados a la pieza («deln34»), y piezas sueltas en lo pendiente («la de 24 o 25 son las que faltan»), salvo días, plata, etc.

## OdontoVoz 1.42
- Las evoluciones nuevas van solas al odontograma: lo hecho («hice restauración en 25», «208 en 34») aparece en «Prácticas de hoy» para cobrar y queda en rojo (también si se elige «Solo nota, sin cobrar»); lo de la próxima se marca planificado sin cobrar. Sin prácticas de cobro, se marca directo al guardar.

## OdontoVoz 1.43
- **Novedades sin cansar** (`src/app55.js`): una sola tarjeta en el inicio con hasta 3 novedades de las versiones no vistas (se cierra con ✕ y no vuelve), una entrada silenciosa (leída) en la casilla por versión y Ajustes › Ayuda › «Novedades».
- **Sugerencias y críticas** en Ajustes › Ayuda (y en el menú): idea, crítica, algo no anda, me gustó. Llegan al panel de licencias (`ov_feedback`; la crítica va como «otro» con «[Crítica]»).

## OdontoVoz 1.44
- **Odontograma: «ya lo tenía» vs. «lo hice yo hoy».** Lo que se pinta o dicta en rojo en el odontograma queda como preexistente (`pre: true`): no crea práctica hecha ni cargo. Es «hecho hoy» (con cobro) si la frase dice «hice/realicé/terminé…», si esa pieza estaba planificada, o si se elige «Lo hice yo hoy». Antes todo lo rojo se cobraba como hecho por el profesional.

## OdontoVoz 1.45 · Responsabilidad sobre la historia clínica
- **Registro de cambios en el servidor** (`supabase/auditoria.sql`, a correr en Supabase): `ov_records.updated_by` (lo pone el servidor), `ov_history` guarda la versión anterior de todo (`pd:*` siempre; el resto 90 días; `pats`/`cfg` una copia cada 10 min por persona), `changed_by`/`old_by`, solo lectura para todos, limpieza diaria con `pg_cron`, `ov_audit(clave)` para dueño/admin.
- **Nada clínico se borra**: las evoluciones escritas se anulan con motivo aunque sean del día; quitar una anulación queda registrado; cada nota y anulación guarda el usuario.
- **Archivar en vez de eliminar** (dueño/admin, con motivo; cancela turnos futuros; Ajustes › Pacientes archivados para volverlos).
- **Pacientes de prueba**: casilla «Es de prueba» solo al crear la ficha (se sugiere si el nombre dice prueba/test/ejemplo); esos sí se borran; Ajustes › Borrar los pacientes de prueba.
- **Unir fichas duplicadas** (menú ⋮ del paciente): turnos, evoluciones, odontograma, pagos, fotos y datos faltantes pasan a la ficha que se elige.
- **Historial de cambios** de cada ficha (dueño/admin).
- Términos (cláusula 6 bis) y privacidad versión 2026-11-11.
- `A.pd` completa campos faltantes (arreglo del error «reading reduce» en `A.saldo`).

## OdontoVoz 1.2 · Colaboraciones administradas por los creadores (16/11/2026)

- Tabla `ov_partners` (`supabase/colaboraciones.sql`): casas aliadas con logo, sucursales con WhatsApp, beneficio (`pct`, días, desde/hasta, texto) y dónde aparecen. Todas las apps leen las activas (sin sesión); solo los creadores (`ov_admins`) las cambian, con `ov_partner_save` / `ov_partner_del` / `ov_partners_all`.
- `src/app82.js`: la casa principal aparece primero en el pedido de stock (con el beneficio anotado en el WhatsApp), aviso «Te faltan N insumos · Pedir a …» en el inicio y «En colaboración (exclusiva) con» al pie del menú. Panel «Creadores de OdontoVoz» en el menú, solo para creadores: cambiar el % y los días sin publicar versión.
- Surdental queda cargada apagada hasta que esté el acuerdo.

## OdontoVoz 1.1.3 · Nombre en la barra del celular (16/11/2026)

- En el celular y el APK, en el inicio, la barra muestra «OdontoVoz» (sin el ícono) centrado en el espacio libre, en lugar del título; en las demás pantallas queda el título. En la PC sigue el logo con el nombre en el medio.

## OdontoVoz 1.1.2 · Stock en el menú y cantidades por insumo (16/11/2026)

- Logo de OdontoVoz en la barra de arriba (centrado en la PC; en el celular, solo el ícono al lado del título). Ya no va arriba del saludo del inicio.
- «Stock de insumos» en el menú principal (después de Caja); sigue también en Ajustes.
- Stock › «Cuándo avisar y cuánto pedir»: para cada insumo, el aviso (con decimales: 0,5 = media caja) y «Pedir hasta tener» (si queda vacío, se calcula con el uso). También en «Datos» de cada insumo.

## OdontoVoz 1.1.1 · Logo en el inicio (16/11/2026)

- Logo de OdontoVoz (`src/app81.js`, `A.ovMarkSVG`) con el nombre al lado, arriba del saludo del inicio, en celular y PC.

## OdontoVoz 1.1 · Cobrar antes de atender (16/11/2026)

- **Cobro anticipado en secretaría** (`src/app80.js`): para pacientes que llegan con prácticas autorizadas (p. ej. SOSUNC). Desde la ventanita del turno, la cuenta del paciente o el aviso al marcar «Llegó» (si su obra social pide autorización): cantidad, práctica, pieza opcional, coseguro sugerido según los aranceles, n.º de autorización y medio de pago. Genera el pago con recibo.
- Cuando el odontólogo carga lo que hizo («Prácticas de hoy»), lo que coincide por tipo de práctica (y pieza, si se anotó) aparece **«✓ Ya cobrado en secretaría»** y no pasa a «Para cobrar». Si lo anotó con otro nombre, se elige a mano («¿Lo cobró la secretaría?»); «no es esta» lo desengancha.
- Aviso en la ficha y en «Para cobrar» de lo cobrado que falta hacer; lista con «Ya se hizo» y «Devolver» (la devolución sale de la caja del día).
- **SOSUNC** agregada a las obras sociales (pide autorización; aranceles de la Federación de Río Negro si se pueden bajar).

## OdontoVoz 1.0 · Primera versión oficial (16/11/2026)

- Los números de versión vuelven a empezar: esta es la **1.0** (la que se registra en la DNDA). Incluye todo lo hecho hasta la 1.54.1 de prueba.
- Por dentro sigue una compilación que no baja (`A.VBUILD`, `VERSION` de `sw.js`: 1.55.0), así los equipos con el APK viejo reciben el aviso de actualización y Novedades sigue funcionando. Lo que ve la gente es `A.VERSION` / `NAME` de `sw.js` / `package.json`.

## OdontoVoz 1.54.1 · Buscador de obra social

- En el paciente nuevo, la ficha y el turnero, la obra social se elige con un buscador propio en lugar de la lista del navegador (que en Android salía chica, pegada al teclado y solo buscaba por el comienzo): lista debajo del campo, renglones de 48 px, busca por sigla o nombre, «Usar lo que escribí» si no está, flechas y Enter en la PC.

## OdontoVoz 1.54 · Agenda de un día entero

- **Cancelar la agenda de un día** (voz o Agenda › Más › «Cancelar la agenda del día»): «cancelame la agenda del viernes porque me tuve que ir», «el viernes no atiendo», «cerrá el viernes», «suspendé todos los turnos del viernes», «cancelá la agenda de todo el consultorio el viernes». Muestra los turnos afectados, al confirmar los cancela, bloquea el día (tampoco se dan turnos online) y deja un botón de WhatsApp por paciente con un mensaje de disculpas para reprogramar. «Deshacer» deja todo como estaba.
- **Agregar agenda un día puntual** (voz o Agenda › Más › «Agregar agenda un día»): «agregame una agenda el jueves de 9 a 14», «el sábado atiendo de 9 a 13», «extendeme la agenda del jueves hasta las 18», «el jueves arranco desde las 7». Sumar, estirar o reemplazar el horario de ese día; si estaba cerrado o de licencia, lo reabre. Solo dueño o administrador.

## OdontoVoz 1.53.1 · La voz entiende más formas de pedir

- Más de 300 frases nuevas probadas (`tests/ovcmd.frases.json`): pedidos en condicional («¿me abrirías…?»), negativos («¿no me abrís…?»), con «poné que / anotá que», con el paciente adelante («Julián pagó 20 mil», «Julián canceló», «Julián pegó el faltazo»), preguntas por un día («¿qué tengo mañana?», «¿cómo pinta el lunes?») y modismos («chusmeame», «echale un ojo», «garpó», «cayó», «clavale un turno»).

## OdontoVoz 1.53 · Historias de papel y resguardo de historias clínicas

- **Pasar historias de papel** (Menú › Pasar historias de papel, o desde la pestaña Imágenes de la ficha): fotos de cada historia (hasta 8 hojas) o PDF escaneado; la lectura con IA (función `hc-read`) arma datos, antecedentes, odontograma y evoluciones; una persona revisa por secciones (lo dudoso en amarillo, lo ilegible `[?]` en naranja), corrige y confirma. Las fotos quedan en la ficha como «Historia clínica en papel» y queda registrado quién la pasó.
- **Descargar historias clínicas** (dueño o administrador; Ajustes › Copia de seguridad): ZIP con un PDF por paciente hasta la fecha elegida, índice CSV, constancia y código SHA-256 de cada archivo; el registro de la descarga queda en la nube y se puede comprobar cualquier archivo después.
- Términos y privacidad 2026-11-16 (Anthropic como proveedor para la lectura de las historias de papel).

## OdontoVoz 1.52.1 · Dirección nueva

- La web y la app pasan a https://odontovoz.com.ar/ (la dirección vieja redirige sola). En la web hay que volver a entrar con el usuario; los datos bajan de la nube.

## OdontoVoz 1.52 · Planes nuevos y sin LITE

- Planes: Prueba (7 días), Profesional USD 17 (+ USD 3 por consultorio adicional con un equipo, hasta 5), Consultorio o Centro USD 35 (3 profesionales, 5 equipos; + USD 3 por profesional adicional con un equipo), Empresa USD 82. Sin «PRO» en los nombres.
- Sin modo LITE en la web, la app y el APK (`src/app76.js`: `A.liteOn`/`A.liteForced` siempre falsos; cuentas con plan `lite` = Profesional).
- Panel: campo «Adicionales» que completa profesionales/consultorios y equipos. Términos y privacidad versión 2026-11-14.

## OdontoVoz 1.51 · ¿Quién cobra?

- «Prácticas de hoy»: pie con «Cobrar después» y «Cobrar $X →», que abre «¿Quién le cobra?»: Cobro yo ahora (abre el cobro) / Lo cobra la secretaria (va a «Para cobrar» de la recepción). En todos los modos, también Profesional. Se resalta la última elección.
- «Para cobrar» (inicio y caja): para el dueño o el odontólogo, «Cobrar» pregunta lo mismo (marca «en recepción» si ya está); la secretaria cobra directo.
- Push: aviso «Para cobrar: <paciente>» a la recepción y al dueño cuando el turno de hoy pasa a recepción (`toRcp`).

## OdontoVoz 1.50.5 · Aumentos de la Federación al día

- Los aranceles de la FORN se revisan también todos los lunes (además del día 2): si la Federación publica un aumento a mitad de mes, se aplica solo.
- Río Negro: cualquier valor (también uno editado) sube si la Federación publica uno más alto; nunca baja. Neuquén con referencia: lo editado no se toca más.

## OdontoVoz 1.50.4 · Neuquén con referencia de Río Negro

- Al elegir Neuquén se pregunta si se precargan los de Río Negro como referencia (`fornSrc = 'nqnref'`): se cargan y actualizan como en Río Negro (solo suben, lo editado no se toca) y en el cobro se ve «(ref. Río Negro)».

## OdontoVoz 1.50.3 · Elegir la federación de los aranceles

- Antes de precargar nada, el dueño elige una vez: Federación Odontológica de Río Negro (automático), Neuquén (Círculo Odontológico de Neuquén, por ahora a mano) u otra provincia. Se cambia en Ajustes › Obras sociales (al dejar Río Negro se quitan los valores cargados solos no editados, con Deshacer).

## OdontoVoz 1.50.2 · Aranceles: solo suben y se pueden apagar

- La actualización mensual de la FORN solo sube valores (nunca baja lo que tenés o editaste); los editados a mano llevan ✎ (`a.man`).
- Interruptor general en Obras sociales (`A.CFG.fornAuto`; al apagarlo se quitan los valores cargados solos que no editaste, con Deshacer) y por obra social (`o.fornOff`).

## OdontoVoz 1.50.1 · Aranceles de la Federación automáticos

- Al abrir la app (dueño o admin) se bajan los aranceles de la FORN y se cargan solos en cada obra social de la lista que coincida por nombre (y se actualizan cuando cambian). No se pisan las listas cargadas a mano.
- Cada obra social numera distinto: la práctica se busca por su nombre (por ejemplo, OSPe 02.15 «Restauraciones simples»).
- Si la tabla trae coseguro, la primera vez se pregunta si se cobra (queda en `A.CFG.copDef`).

## OdontoVoz 1.50 · Cobro con obra social claro

- En «Prácticas de hoy» (desde Qué hice hoy o la evolución clínica), si el paciente tiene obra social aparece «¿Qué le cobrás al paciente?»: No le cobro nada / Coseguro / Diferencial / Todo particular, para todas las prácticas o una por una.
- Si la obra social no tiene el arancel cargado, se escribe cuánto paga en el momento (se completa igual en la misma práctica de otras piezas) y se puede recordar como arancel.
- Si el paciente no paga nada: botón «Listo · pendiente de <obra social>»: no pasa a «Para cobrar» y queda en Caja › Obras sociales (también las prácticas sin importe).

## OdontoVoz 1.49.3 · Guardado local más grande

- La copia de los datos que guarda cada equipo pasa a IndexedDB (cientos de MB) además de localStorage (5–10 MB). Mientras entre en localStorage se sigue guardando ahí también; si no entra, queda solo en IndexedDB. Sin cambios para el usuario y sin costo.

## OdontoVoz 1.49.2 · Indicaciones y recetas

- La pestaña «Indicaciones» de la historia clínica pasa a llamarse **«Indicaciones y recetas»**: arriba la receta electrónica (RCTA u otra plataforma de cada profesional) y abajo las «Indicaciones para el paciente». La receta ya no está en Documentos. Por voz: «ir a indicaciones y recetas».

## OdontoVoz 1.49.1 · App de RCTA

- «Recetar en RCTA» abre la app de RCTA (`com.innovamed.rcta`) si está instalada en Android: en el APK con `ovapp:` (MainActivity › `getLaunchIntentForPackage`, `<queries>` del paquete) y en Chrome con `intent://` (si no abre, la web a los 1,5 s). En iPhone se abre la web de RCTA. Casilla «Abrir la app de RCTA» en la configuración.

## OdontoVoz 1.49 · Ajustes al cobrar, presupuestos en otras monedas, turnos largos y receta electrónica

- **Al cobrar** (recepción y «Registrar cobro»): precio de lista, descuento %, recargo/interés % (sin tope) o cuotas (tarjeta: se cobra todo hoy; del consultorio: hoy la primera y queda el plan en la cuenta). Se asienta un «ajuste» con quién, cuándo, el % y el medio de pago. El dueño puede dejar un % predeterminado por medio.
- **Presupuestos**: moneda del presupuesto y de cada prestación (pesos, dólares, euros, reales), precio editable solo para ese presupuesto, ítems libres y cotización de referencia. Los totales salen por moneda y su equivalente en pesos. **Lista de precios** para compartir (copiar, WhatsApp, PDF) con descuento en efectivo y cuotas.
- **Turnos** de 15 minutos a 8 horas.
- **Receta electrónica**: cada profesional configura su plataforma (RCTA u otra); en la ficha › Documentos «Recetar en RCTA» copia los datos del paciente y abre la plataforma.
- **Insumos**: la primera compra queda como referencia; al cargar una compra nueva se ve el aumento de cada insumo, el promedio (ponderado por uso en las prácticas) y un botón para subir las prácticas ese %.

## OdontoVoz 1.48.1 · Porcentajes a elección

- El porcentaje del profesional (general y excepciones) se elige de una lista del 5% al 100%, de 5 en 5, en su ficha y en Liquidaciones. Al sumar un profesional (alta guiada, paso 1) ya se elige cómo trabaja y su porcentaje.

## OdontoVoz 1.48 · Aranceles de la Federación, permisos, costos y consentimiento en papel

- **Aranceles de la Federación Odontológica de Río Negro**: el día 2 de cada mes el workflow `aranceles.yml` baja los PDF de odontorionegro.com (aranceles de 44 obras sociales y aranceles éticos), los pasa a `sitio/aranceles/forn.json` y publica la web. En la app: Obras sociales › «Federación RN» (agregar o actualizar varias) y, dentro de cada obra social, «Traer aranceles» (elegir tabla, columna de lo que paga y coseguro; «Una por plan» crea una obra social por plan). Los coseguros propios se respetan. Aviso en la casilla cuando hay valores nuevos.
- **Permisos**: precios, aranceles, acuerdos y costos solo los cambia el dueño o un administrador. Recepción y asistente cargan turnos, pacientes, cobros y archivos; pueden cancelar y mover turnos, pero no borrar ni anular lo hecho, ni cambiar datos ya cargados (sí completar los vacíos). En el servidor: `supabase/permisos.sql`.
- **Subir precios por %** (todos o por categoría, con vista previa, redondeo e historial para volver atrás) y **coseguros por %** de todas las obras sociales.
- **Costos y rentabilidad** (Prácticas y aranceles): precios de insumos mes a mes, costo de cada práctica según las recetas del stock, gastos fijos con historial, resultado del mes con margen y precio sugerido para no perder ganancia.
- **Consentimiento en papel**: se imprime con los datos del paciente, se firma y se sube la foto o el escaneo; aviso en la ficha mientras falte.
- **Radiografías y estudios en PDF** (cada página pasa a imagen), arrastrando el archivo o pegándolo con Ctrl+V en la PC.
- **Liquidación**: cobrado por medio de pago, obras sociales en una línea por mes, evolución de 12 meses. Cada profesional del equipo ve «Mis números».
- Al cobrar se muestra el código y el coseguro de la obra social, y avisa si falta cargar un arancel. Poner el DNI completo en el buscador abre la ficha.

## OdontoVoz 1.47 · Caja nueva, obras sociales que pagan después y acuerdos con los profesionales

- **Caja › Cobros del día** (se abre ahí): total del día, por medio de pago, «Para cobrar» si hay alguien esperando, aviso de lo que deben las obras sociales y los cobros agrupados por odontólogo (paciente, qué pagó, quién cobró, medio, importe). Flechas para ver otros días. El odontólogo del equipo ve solo lo de sus pacientes. «Resumen» pasó a «Números del mes».
- **Obras sociales que pagan después**: se agrega OSOEFRNyN (sin coseguro). Si la obra social del paciente no cobra nada al paciente, la práctica queda en $ 0 para el paciente y lo de la obra social (a tu precio de lista si no hay arancel cargado) no aparece «para cobrar». En **Caja › Obras sociales** se ve lo que debe cada obra social por mes; «Llegó el pago» guarda lo que pagó de verdad, la fecha y el débito.
- **Acuerdo con el centro** en Ajustes › Profesionales (y en Liquidaciones): porcentaje con excepciones por categoría, módulo, porcentaje + módulo, consultorio entero (monto fijo por mes) u otro acuerdo. La liquidación se calcula **sobre lo cobrado** (o sobre lo facturado, a elección).

## OdontoVoz 1.46.4 · Cerrar sesión solo acá y precios de la lista
- **Error encontrado en la prueba con 4 equipos:** «Cerrar sesión» llamaba a `/auth/v1/logout` sin `scope`, y Supabase por defecto cierra **todas** las sesiones de esa persona: al cambiar de cuenta en un equipo se caía la misma persona en los otros (por eso se cerraron el celu de Rodrigo y la cuenta de Ángel). Ahora `?scope=local` (`src/cloud.js`).
- **Precios:** `src/app63.js` hace que `A.priceOf` (cobros desde la evolución, «Qué hice hoy» y odontograma) tome el precio de «Prácticas y aranceles»: obturación/composite según caras («1 cara», «2 caras», «3 o más»), amalgama, sellador, extracción simple, endodoncia, corona, perno, implante (`A.catItemFor(cond, caras)`). La tabla «Valores por pieza del odontograma» queda solo para lo que no está en la lista. Antes cambiar «Composite · 1 cara» a 75.000 no cambiaba lo que se proponía cobrar (40.000).

## OdontoVoz 1.46.3 · Pagos escritos en la evolución, sin duplicados
- `src/app62.js`: `A.payParse(texto)` entiende pagos en la evolución («hoy paga 130.000 de 150.000 que debía», «abonó $50.000 en efectivo», «dejó 20 mil por transferencia, debía 80 mil», «me dejó 100k», «1,5 millones»); no toma futuros ni negaciones («va a pagar», «no pagó», «próx…»), ni números chicos (piezas). Al guardar la nota (`addNote`/`qnSave`, después de «Prácticas de hoy» si hubo) aparece `MF.evPay`: importe, medio de pago, y si dice cuánto debía y en la app figura menos, ofrece cargar la deuda anterior que falta; muestra cuánto queda debiendo. El cobro queda con `fromNote` y la nota con `payId`; si había prácticas del día «para cobrar» y el pago las cubre, salen de la cola.
- **Sin duplicados** (`A.payTwin(pid, importe, fecha)`): si al escribir la nota ya hay un cobro igual de hoy, no ofrece cargarlo; si alguien carga a mano (`cobroSave`, `ltPaySave`) un cobro igual a uno de hoy, avisa «Ya hay un cobro de $… (anotado desde la evolución por …). ¿Es el mismo?» con «Es el mismo: no cargar» / «Es otro pago: cargar igual».

## OdontoVoz 1.46.2 · Cada odontólogo, su agenda
- `src/app61.js`: un usuario del equipo con puesto profesional o asistente y agenda asignada (`ov_members.pro`) **ve** todas las agendas del centro pero **solo modifica** los turnos de la suya. `A.mutate` envuelto: si un cambio toca turnos de otro profesional (crear, mover, cancelar, estado, borrar, pasarle un turno propio), esos turnos vuelven a como estaban y aparece «Ese turno es de la agenda de X…». La ventanita del turno de otro queda en solo lectura (se puede abrir la ficha: los pacientes son del centro). `naSave` no deja dar turnos en otra agenda. `A.myProOnly()`, `A.canEditAppt(a)`.
- Avisos de «Llegó…» (cartel y notificación del teléfono, `src/app12.js`): solo de los pacientes de su agenda.
- Servidor (`supabase/agenda_pro.sql`, trigger `ov_day_guard_trg`): misma regla como red de seguridad (si llega un día con cambios en turnos de otro, el servidor los deja como estaban).

## OdontoVoz 1.46.1 · Sin parpadeo ni sincronización de más
- **Error encontrado en la prueba con 4 equipos:** la base (jsonb) devuelve las claves de los objetos en otro orden que el equipo; `push()` comparaba con `JSON.stringify` y creía que `aran` y `cfg` habían cambiado, así que cada sincronización volvía a subirlos. Con Realtime los equipos se avisaban entre sí y quedaban en un ida y vuelta de ~1 s (parpadeo del inicio y cientos de pedidos). Ahora `J()` en `src/cloud.js` compara con las claves ordenadas (`canon`). Medido con una nube simulada que reordena como Postgres: versión vieja 82 subidas en 20 s en reposo, nueva 0.
- `src/app60.js`: freno de seguridad, como mucho una sincronización por aviso y un aviso enviado cada 2 s (el último se manda igual, un poco después).

## OdontoVoz 1.46 · Copias de seguridad en tres lugares
- **Copia nocturna cifrada** (`.github/workflows/backup.yml`): todas las noches copia la base (public, auth, storage) y las fotos del bucket `ov-media` al Google Drive de somosroan (`OdontoVoz-respaldos`), cifrado con la frase de respaldo. Diarias 35 días, mensuales 13 meses, anuales para siempre. Restaura la copia en una base vacía y cuenta los registros; abre un issue si falla o si las fichas caen a menos de la mitad. Necesita los secretos `BACKUP_DB_URL`, `BACKUP_PASSPHRASE`, `BACKUP_DRIVE_TOKEN` (y `BACKUP_S3_KEY_ID`/`BACKUP_S3_SECRET` para fotos); sin ellos no hace nada.
- **Copia a disco**: `scripts/respaldo-disco.bat` (Windows) y `respaldo-disco.sh` (Mac/Linux). Guía, cómo abrir una copia y **plan de salida**: `docs/RESPALDOS.md`.
- **App**: Ajustes › Copia de seguridad muestra «Cómo cuidamos tus datos» y, al dueño o administrador, la sugerencia opcional de bajar su propia copia una vez por mes (también en la casilla de avisos, sin carteles). Arreglado el botón «Descargar mi copia ahora» del pedido de baja, y la pregunta frecuente vieja «¿Dónde quedan mis datos?».
- **Avisos con la app cerrada (push, Firebase)**: `supabase/push.sql` (teléfonos `ov_push_tokens`, cola `ov_push_q` que llenan triggers de `ov_records` días/stock y de `ov_booking_req`, y despiertan la función con pg_net), función `push-hook` (compara antes/después: llegó, canceló, nota de otro, stock bajo, turno online; nunca al equipo que hizo el cambio; respeta profesional, consultorio y «Avisarme de…»), `src/app59.js` (registra el teléfono, abre el aviso al tocarlo, no repite el aviso local). Se activa al cargar `GOOGLE_SERVICES_JSON` (GitHub) y `FCM_SERVICE_ACCOUNT` (Supabase): ver `docs/PUSH.md`. Sin eso el APK sale igual, sin push.
- **Términos y privacidad 2026-11-11.2**: cláusula 8 (copias en tres lugares, qué pasa si el servicio termina, copia propia recomendada), Google Drive como subencargado de copias cifradas, y qué pasa con las copias al pedir eliminar la cuenta.

## OdontoVoz 1.45.4 · Turnero online más claro
- Por internet se reserva **como máximo 30 minutos** (`ONLINE_MAX`/`capDur` en `src/app17.js`; si el profesional usa turnos de más de 30, uno solo). Si el motivo lleva más (endodoncia, extracción, primera consulta), el consultorio lo alarga después. Vale también para la Autogestión por WhatsApp, que usa los mismos horarios.
- `sitio/turnos.html`: cada día muestra «N turnos libres» separado de la fecha (antes «nov · 14» se confundía con el día 14) y una aclaración arriba.

## OdontoVoz 1.45.3 · Sincronización al instante
- `src/app60.js`: cada equipo se conecta al canal de avisos del lugar (Supabase Realtime, canal público `ov-<dueño>`, solo un «toc toc» sin datos). Al subir cambios avisa, y los demás equipos abiertos sincronizan en el momento (unos 2 segundos de punta a punta) en vez de esperar la vuelta de 8 segundos (más en segundo plano). Sin canal, todo sigue igual que antes. El guardado sube a los 0,8 s (antes 1,5 s).

## OdontoVoz 1.45.2 · La sesión no se cierra sola y avisos en la barra del teléfono
- **Error encontrado:** con la app abierta en dos ventanas o pestañas del mismo equipo, una renovaba la sesión y la otra seguía con la llave vieja; el servidor la tomaba como robada y la app cerraba la sesión (se dejaba de sincronizar: por ejemplo, no llegaba el «llegó» de recepción). Ahora la renovación es una sola a la vez (también entre pestañas, con `navigator.locks`), cada pestaña toma la sesión nueva de las otras, y la sesión solo se da por vencida si el servidor rechaza la llave: en ese caso se pide la contraseña sin borrar nada. Sin internet la sesión sigue.
- **«Mantener la sesión iniciada en este equipo»** al ingresar (tildado de fábrica). Destildado, la sesión dura hasta cerrar el navegador.
- **Barra de notificaciones del teléfono (APK):** canal «Avisos de OdontoVoz» de prioridad alta (aparece arriba como un mensaje de WhatsApp), ícono propio, y todo lo que entra a la casilla (stock, laboratorio, notas de otros, recordatorios, cobros…) también sale como notificación cuando la app no está a la vista. Tocar la notificación abre ese aviso. En el teléfono las notificaciones vienen activadas y se pide el permiso una vez. Con la app cerrada del todo no llegan: para eso falta push (Firebase).

## OdontoVoz 1.45.1 · Arreglo de la mudanza
- **Error encontrado:** al importar, un paciente con el mismo DNI que otro (por ejemplo, una hija con el de la madre) se tomaba como el mismo: no se creaba su ficha y sus evoluciones y turnos iban a la del otro. Ahora el DNI solo une si el nombre también coincide; las evoluciones y turnos se ubican primero por el número de paciente del sistema anterior.
- **«Revisar una mudanza ya hecha»** (Ajustes › Mudanza desde otro sistema): con el mismo archivo .json compara cada evolución y turno con su paciente original, crea los pacientes que faltan y pasa a su ficha lo que quedó en otra (con registro en cada ficha y aviso si ya se había pasado al odontograma).


## 1.30.0 (compilación 1.85.0)
Stock rediseñado (`src/app115.js`): «Mi stock» (indicadores, buscador, categorías, orden, agrupar/compacto, −/+ rápido, compartir, costo por unidad) y «Comprar stock» (Lo que falta, Rutiden, Mi pedido, Surdental próximamente), más Movimientos y Consumo por práctica.


## 1.31.0 (compilación 1.86.0)
Agenda (`src/app116.js`): arrastrar un paciente de la burbuja a la agenda para crear el turno (ratón: arrastrar; táctil: mantener ~0,4 s) y estirar el borde de abajo de un turno o bloqueo para cambiar la duración de a 15 min (con aviso de conflicto).


## 1.32.0 (compilación 1.87.0)
Ortodoncia (`src/app117.js`): solapa «Ortodoncia» en la ficha (`pd.orto` con `ctrls`). Cada control guarda fotos en `pd.images` (`kind:'orto'`, `view`, `ctrl`), crea una nota de evolución (`orto: id`) y muestra «Antes y ahora».


## 1.33.0 (compilación 1.88.0)
Planes de tratamiento en PDF (`src/app118.js`): tarjeta arriba de «Plan y presupuesto» para subir PDF hechos fuera de la app (`pd.planPdfs`, archivo en `A.media`, tope 20 MB). Abrir, descargar, renombrar y quitar.


## 1.33.1 (compilación 1.88.1)
Turno con paciente nuevo (`src/app119.js`): obra social con lista/escritura libre, N.º de afiliado y plan (chips de `app91`), igual que la ficha. `--vvh` (app115) se recalcula al salir de un campo, al volver a la pantalla y cada 1,5 s, con un piso de 360 px.


## 1.34.0 (compilación 1.89.0)
«Recepción» pasa a llamarse «Secretaría» (el valor interno sigue siendo `recepcion`). La secretaría administra agenda, cobros, caja y cuentas; `app66` bloquea solo lo clínico (`SECRE_BLOCK`: evoluciones, fotos, recetas, anular tratamientos) y borrar/archivar pacientes. SQL: `supabase/secretaria.sql` (el guardián de cobros solo protege al asistente). Buscador de arriba (`app120`): resultados a todo el ancho en pantallas chicas.


## 1.34.1 (compilación 1.89.1)
Ficha en el celular (`app97`): selector «Estás en … / Cambiar sección», tarjetas con ícono y descripción, ícono de ortodoncia (diente con bracket y arco).


## 1.35.0 (compilación 1.90.0)
Ortodoncia automática (`src/app121.js`): `A.touchPd` revisa las 6 notas más nuevas; si hablan de un control de ortodoncia (frase fuerte o 2+ términos: arco, ligadura, cadena elástica, bracket, NiTi…) crea el control (`ctrl.auto`, `note.orto`), con `parse()` de arcos/elásticos/chips/próximo control. Botón «Agregar foto» en la nota y edición de controles con ✎ (`app117`).


## 1.35.1 (compilación 1.90.1)
Agenda: la tira de días (`render.agenda` en index.html) conserva su posición (`S._stripKeep`) y se centra suavemente después de que `app16` la vuelve a armar; antes salía de 0 y recorría toda la tira.


## 1.36.0 (compilación 1.91.0)
Calendario de la derecha (`app24`): `offWhy`/`am-off` (rojo suave para días sin atención por cierre, vacaciones o agenda cancelada), `am-part` (punto rojo si solo algunos profesionales no atienden), leyenda arriba y nueva estética. `app122`: al cargar vacaciones ofrece cancelar los turnos y avisar por WhatsApp; las columnas cerradas muestran «Vacaciones»/«Cerrado».


## 1.36.1 (compilación 1.91.1)
Tira de días: al cambiar de mes se recuerda el día que estaba en el borde (`anchor`) y se vuelve a ubicar en el mismo lugar antes de centrar el día elegido.


## 1.36.2 (compilación 1.91.2)
Calendario (`app24`): celdas que se ajustan al alto de la pantalla (`--mcell`), contador de turnos arriba a la derecha de cada día, selector «ir a un mes» (`A.chg.agCalJump`, 14 meses) y leyenda más corta.


## 1.37.0 (compilación 1.92.0)
Agenda (`app116`): animaciones del arrastre de pacientes (levantar, cartelito que late, vuelo al turno, resplandor `blk-new`) y cuadrito `#mvPop` para escribir el motivo del turno recién creado (guarda `a.motivo` y `A.setMotivo`).


## 1.38.0 (compilación 1.93.0)
Animaciones de ventanas (`app123`): `m-anim` solo cuando una ventana se abre o cambia de tipo (no en cada redibujado), `m-out` al cerrar con `closeModal`, `pop-anim` en `#tpop`/`#waPick`/`#updPop`, avisos y menús. Usa las propiedades `translate`/`scale` para no pisar el `transform` de las ventanas arrastradas.


## 1.38.1 (compilación 1.93.1)
Agenda (`app116`): menú `#delMini` al mantener apretado un turno (`holdDel` = max(1,5 s, `odontovoz.holdMs`)), `movable()` para la burbuja y el cuadrito del motivo. Calendario (`app24`): selector de mes propio (`agCalPick`/`agCalSet`, `S.calPick`) en lugar del `<select>`.


## 1.39.0 (compilación 1.94.0)
Tutoriales nuevos con voz (`scripts/tutoriales/`, ver su README): `configurar`, `agenda` y `ficha`, grabados con Playwright + voz Piper (es_MX-claude-high). Se borraron los videos viejos `tut-pro/centro/empresa/lite`. `app124`: accesos al video desde Primeros pasos y Ajustes; `app48`: lista de videos; la página `sitio/tutoriales/` se rehízo.


## 1.40.0 (compilación 1.95.0)
Stock por producto concreto (`app125`): ventana «Agregar producto» (catálogo de Rutiden con `A.rutFind`, cargar hablando con `parse()`, a mano). Los productos llevan `ck` (tipo del kit), `rut` (código), `brand`, `det`, `spec`. `A.stockConsume` (`app43`) reparte el consumo entre los productos del mismo `ck`.


## 1.41.0 (compilación 1.96.0)
Stock: `app125` suma «Cargar una compra» (`S.sb`, `A.EMP.stock._cfg.compras`, historial de precios `item.ph`, precio al dictar «a 18500»); `app115` muestra las categorías como acordeón contraído (`s.opn`) con ícono y avisos.


## 1.42.0 (compilación 1.97.0)
Stock: botones unificados (`sbOpen` = compra/llegó mercadería; `saOpen` = «Editar stock», pestaña «Mi stock» en `app125` con `miHTML`, cantidades con `K.adjust(...,'conteo')` y `K.remove`). Se sacaron «Contar el stock», «Insumo nuevo» y «Llegó mercadería» de la fila de acciones.
