# OdontoVoz · Notificaciones con la app cerrada (Firebase)

Sin esto, los avisos llegan al celular mientras OdontoVoz está abierta o en segundo plano. Con esto llegan **aunque la app esté cerrada**, como un mensaje de WhatsApp: llegó un paciente, canceló un turno, nota o bloqueo de otra persona, stock bajo y turno pedido online. Firebase es de Google y **es gratis**.

Cada paso con clave lo hacés vos: las claves no pasan por el chat.

## 1 · Crear el proyecto de Firebase (con somosroan@gmail.com)
1. Entrá a **console.firebase.google.com** con somosroan@gmail.com.
2. **Crear un proyecto** → nombre `OdontoVoz` → Continuar. Google Analytics: **desactivado** → Crear proyecto.

## 2 · Sumar la app de Android y bajar `google-services.json`
1. En la página del proyecto, tocá el ícono de **Android**.
2. **Nombre del paquete:** `ar.odontovoz.app` (exacto). Apodo: `OdontoVoz`. Lo demás vacío → **Registrar app**.
3. **Descargar google-services.json**. Los pasos siguientes que muestra Firebase («Agregar el SDK»…) saltealos: ya están hechos.
4. Abrí el archivo con el Bloc de notas, **Ctrl + A**, **Ctrl + C**.
5. GitHub › `ROAN-corp/odontovoz` › Settings › Secrets and variables › Actions › **New repository secret** → Name `GOOGLE_SERVICES_JSON` → pegá → Add secret.

## 3 · Clave para que el servidor mande los avisos
1. En Firebase: ⚙ (arriba a la izquierda) › **Configuración del proyecto** › pestaña **Cuentas de servicio** › **Generar nueva clave privada** → Generar clave. Se baja un archivo `.json`.
2. Abrilo con el Bloc de notas, **Ctrl + A**, **Ctrl + C**.
3. Supabase › proyecto › **Edge Functions** › **Secrets** (o «Manage secrets») › Add new secret → Name `FCM_SERVICE_ACCOUNT` → pegá todo → Save.
4. **Borrá el archivo `.json` de Descargas** (y de la papelera): es una llave.

## 4 · Permiso para publicar las funciones del servidor
(Si ya está cargado por la Autogestión por WhatsApp, saltealo.)
1. supabase.com › tu foto (arriba a la derecha) › **Account preferences** › **Access Tokens** › Generate new token → nombre `GitHub OdontoVoz`.
2. Copialo y pegalo en GitHub como secreto `SUPABASE_ACCESS_TOKEN`.

## 5 · Preparar la base
Correr `supabase/push.sql` en Supabase › SQL Editor (se puede volver a correr sin problema). Crea la lista de teléfonos, la cola de avisos y los avisadores.

## 6 · Publicar
- Actions › «Publicar funciones…» › Run workflow (sube `push-hook`).
- Actions › «Generar APK de OdontoVoz» › Run workflow. Instalar el APK nuevo en cada celular.
- Al abrir la app, pide permiso de notificaciones: **Permitir**. En Ajustes › Avisos y sonidos tiene que decir «✓ Con la app cerrada también te llegan».

## Quién recibe qué
| Aviso | Le llega a |
|---|---|
| Llegó un paciente (hoy) / Canceló | El odontólogo de ese paciente, el dueño, administración y recepción. Respeta «Avisarme de los pacientes de…». |
| Nota o bloqueo de otra persona | Igual que arriba. |
| Stock bajo | Dueño, administración, recepción y asistentes (no a los odontólogos del equipo). |
| Turno pedido online | Todos, salvo odontólogos del equipo si el turno es de otro. |

Nunca le llega al equipo que hizo el cambio. En Empresa, cada consultorio recibe lo suyo. Los avisos que se pierden (teléfono apagado más de unas semanas, app desinstalada) se descartan solos.

Archivos: `supabase/push.sql`, `supabase/functions/push-hook/index.ts`, `src/app59.js`, prueba `tests/push/push.test.mjs`.
