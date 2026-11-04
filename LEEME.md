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
