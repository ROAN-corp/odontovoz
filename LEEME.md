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
