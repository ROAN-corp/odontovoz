# OdontoVoz en Google Play · todo lo que hay que cargar

Cuenta: Play Console de **organización** («Una empresa o un negocio») con el D-U-N-S de Rodrigo (pedido el 17/11/2026). Los datos de la cuenta tienen que ser **exactamente** los del D-U-N-S y ARCA: BOBADILLA RODRIGO NICOLAS · CUIT 20-36871177-3 · Manuel Belgrano 155, Allen, Río Negro 8328.

## 1. El paquete

- Se arma a mano: GitHub › Actions › «Versión para Google Play (.aab)» › Run workflow (`.github/workflows/play.yml`).
- Deja en Artifacts › `OdontoVoz-play`:
  - `OdontoVoz-play.aab` → el que se sube a Play Console.
  - `OdontoVoz-play-prueba.apk` → misma configuración, para probar en un celular antes.
- Apunta a Android 16 (API 36), como pide Google desde el 31/8/2026 (`scripts/patch-play.js`).
- Paquete: `ar.odontovoz.app`. El `versionCode` sube solo (minutos desde 1/1/2026), así nunca se repite.
- **Firma**: se firma con la misma clave del APK de GitHub (clave de subida). En Play Console › Firma de apps conviene elegir **«Usar mi propia clave»** (exportarla con la herramienta PEPK que da Google): así el que hoy usa el APK de la web puede pasar a la versión de la tienda sin desinstalar. Si se deja que Google genere la clave, las dos versiones quedan incompatibles (hay que desinstalar el APK de la web antes de bajar el de la tienda, y los datos que no estén en la nube se pierden). La contraseña del keystore la escribe Rodrigo, nunca Claude.

## 2. Ficha de la tienda

**Nombre (máx. 30):** OdontoVoz: consultorio por voz

**Descripción corta (máx. 80):**
Agenda, historia clínica, odontograma y caja del consultorio, manejados por voz.

**Descripción completa:**

OdontoVoz es el sistema de gestión para odontólogos que se maneja hablando. Decís lo que hiciste y queda anotado en la historia clínica, marcado en el odontograma y listo para cobrar, sin soltar el instrumental.

LO QUE HACÉS CON LA VOZ
• «Agendá a Julián Sosa el viernes a las 10»
• «¿Cuántos turnos libres tengo mañana?»
• «Le hice composite oclusal en la 25 y la 26»
• «Marta pagó 20 mil en efectivo»

AGENDA
• Turnos y sobreturnos, varios profesionales y consultorios.
• Turnero online con link para que el paciente pida turno.
• Avisos de llegada y recordatorios.

HISTORIA CLÍNICA Y ODONTOGRAMA
• Evolución clínica con fecha, autor y registro de cambios (Ley 26.529).
• Odontograma y periodontograma (azul = a realizar, rojo = existente).
• Fotos, radiografías, consentimientos y firma electrónica del paciente.
• Presupuestos y plan de tratamiento, con cuotas.

CAJA Y COBROS
• Lo que hiciste pasa a recepción para cobrar.
• Obras sociales, coseguros y aranceles.
• Caja del día, cierres y liquidaciones por profesional.

STOCK Y EQUIPO
• Stock de insumos que se descuenta solo y avisa antes de que falte.
• Usuarios para recepción, profesionales y asistentes, cada uno con sus permisos.
• Una cuenta para trabajar en varios lugares.

TUS DATOS, SEGUROS
• Copia en la nube cifrada en tránsito y copias de seguridad diarias.
• Funciona también sin internet y se sincroniza cuando vuelve la conexión.
• Hecho en la Patagonia argentina por odontólogos.

Probalo gratis 7 días. Después, abono mensual según el plan (Profesional, Consultorio o Empresa). Soporte por WhatsApp.

OdontoVoz es una herramienta de registro y gestión. No da diagnósticos ni indicaciones médicas: las decisiones clínicas son siempre del profesional.

**Categoría:** Medicina · **Correo de contacto:** somosroan@gmail.com · **Sitio web:** https://odontovoz.com.ar/ · **Política de privacidad:** https://odontovoz.com.ar/privacidad.html

**Imágenes** (carpeta `play/`):
- `icono-512.png` (512×512).
- `portada-1024x500.png` (gráfico de funciones).
- `capturas/1…7-*.png` (1080×1920, celular). Se suben en ese orden.

## 3. Contenido de la app (formularios)

**Acceso de la app (para los revisores):** «Algunas funciones requieren una cuenta». Crear una cuenta de prueba en la app (la crea y le pone contraseña Rodrigo, no Claude) con datos de ejemplo, y en las instrucciones poner:
> Entrar con el usuario y la contraseña indicados. Para ver la app con datos de ejemplo sin cuenta: en la primera pantalla tocar «Probar con pacientes de ejemplo» (modo prueba). La voz se prueba tocando el micrófono y diciendo «¿Cuántos turnos tengo hoy?».

**Anuncios:** No contiene anuncios.

**Clasificación del contenido (IARC):** categoría «Utilidades, productividad, comunicación u otra»; todas las respuestas «No» (sin violencia, sexo, drogas, apuestas, compras de contenido digital dentro de la app ni chat público entre usuarios). Resultado esperado: apta para todos.

**Público objetivo:** mayores de 18 años solamente. No está dirigida a niños.

**Apps de salud:** marcar «Registros médicos / historias clínicas electrónicas» y «Gestión de consultorio / administración». No es dispositivo médico, no diagnostica.

**Seguridad de los datos:**
- ¿Recopila o comparte datos? **Sí recopila, no comparte** (Supabase y Firebase son encargados de tratamiento, no terceros).
- Cifrado en tránsito: **Sí**. El usuario puede pedir que se borren sus datos: **Sí** (https://odontovoz.com.ar/baja.html).
- Datos recopilados (todos «necesarios para la funcionalidad de la app» y «administración de la cuenta», ninguno para publicidad):
  - Información personal: nombre, correo electrónico, teléfono, dirección (del profesional y de sus pacientes).
  - Información de salud y fitness: información de salud (historias clínicas, odontograma).
  - Fotos y videos: fotos (radiografías, fotos clínicas, consentimientos).
  - Audio: grabaciones de voz → **no se guardan**: el reconocimiento lo hace el teléfono. Declarar «No» salvo que se active la IA de historias de papel (que lee fotos, no audio).
  - Información financiera: historial de compras/pagos de los pacientes (cobros registrados por el consultorio). No se piden tarjetas.
  - Identificadores del dispositivo: ID del equipo (`x-ov-device`, para el límite de equipos del plan) y token de notificaciones.
  - Registros de fallas: no.

**Permisos que pide la app:** micrófono (dictado por voz), notificaciones (avisos de turnos), internet y vibración. No pide cámara ni ubicación: las fotos se eligen con el selector de archivos del teléfono.

## 4. Publicación

1. Subir el `.aab` a **Prueba interna** primero (no tiene revisión larga) y probarlo en dos celulares.
2. Con todo bien, pasar a **Producción**. Una cuenta de organización no tiene el requisito de 12 testers durante 14 días.
3. La primera revisión puede tardar varios días; las apps de salud a veces piden documentación extra (por ejemplo, la constancia de ARCA o el sitio web verificado).
