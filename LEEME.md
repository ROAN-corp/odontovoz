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
