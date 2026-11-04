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
3. **Authentication › URL Configuration**: en *Site URL* y en *Redirect URLs* poner `https://rodribobadilla.github.io/odontovoz/`.
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
