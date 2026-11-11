# OdontoVoz · Copias de seguridad y plan de salida

Las historias clínicas se conservan 10 años como mínimo (Ley 26.529, art. 18). Ningún proveedor garantiza 10 años por contrato, así que no dependemos de uno solo: los datos están en **tres lugares distintos**, en dos empresas distintas y en un disco nuestro.

| Copia | Dónde | Cada cuánto | Cuánto se guarda | Quién la hace |
|---|---|---|---|---|
| 1. La base en uso + copias de Supabase | Supabase Pro | continuo + 1 diaria | diarias de 7 días | Supabase (automático) |
| 2. Copia encriptada | Google Drive de somosroan, carpeta `OdontoVoz-respaldos` | todas las noches 03:40 | diarias 35 días, mensuales 13 meses, **anuales para siempre** | GitHub (`.github/workflows/backup.yml`) |
| 3. Copia física | Disco externo de ROAN | una vez por semana (o a diario) | todas | Nosotros (`scripts/respaldo-disco.bat`) |

Además: el **registro de cambios** (`ov_history`) guarda cada versión anterior de cada ficha para siempre, así que un error de un usuario se puede deshacer aunque no haga falta ninguna copia.

Las copias 2 y 3 están **encriptadas con AES-256** con la *frase de respaldo*. Sin la frase no las puede leer nadie: ni Google, ni quien entre al Drive o encuentre el disco. **Si se pierde la frase, se pierden las copias.** Escribila en papel y guardala en dos lugares (por ejemplo, uno cada socio).

---

## Puesta en marcha (una sola vez)

Todo lo que es contraseña o clave lo pegás vos en GitHub; nadie más la ve.
Dónde se pegan: GitHub › repositorio `ROAN-corp/odontovoz` › **Settings › Secrets and variables › Actions › New repository secret**.

### 1. Supabase Pro
supabase.com › organización ROAN › **Billing** › pasar a Pro (USD 25/mes). Con eso:
- copias diarias automáticas de 7 días (Database › Backups);
- el proyecto no se pausa nunca por inactividad.

### 2. `BACKUP_DB_URL` (conexión a la base)
1. Supabase › proyecto › botón **Connect** (arriba).
2. Elegí **Session pooler** (no «Direct connection»: GitHub no llega por IPv6).
3. Copiá la cadena `postgresql://postgres.hcppfvioiaaejayzzhpa:[YOUR-PASSWORD]@aws-…pooler.supabase.com:5432/postgres` y reemplazá `[YOUR-PASSWORD]` por la contraseña de la base. Si no la recordás: Database › Settings › Reset database password. Ojo: si la cambiás, actualizá también este secreto.
4. Pegala como secreto `BACKUP_DB_URL`.

### 3. `BACKUP_PASSPHRASE` (frase de respaldo)
Inventá una frase larga, fácil de escribir y difícil de adivinar, por ejemplo cinco o seis palabras sueltas con algún número. Anotala en papel **antes** de pegarla como secreto `BACKUP_PASSPHRASE`. No la cambies después: las copias viejas solo se abren con la frase con la que se hicieron (si algún día hay que cambiarla, anotá desde qué fecha rige la nueva).

### 4. `BACKUP_DRIVE_TOKEN` (permiso para escribir en el Drive)
1. En tu PC instalá rclone: rclone.org/downloads → Windows 64 bits → descomprimí en `C:\rclone`.
2. Abrí «Símbolo del sistema» y escribí: `C:\rclone\rclone.exe authorize "drive"`
3. Se abre el navegador: entrá con **somosroan@gmail.com** y aceptá.
4. En la ventana negra aparece un texto entre llaves `{"access_token":…}`. Copiá **todo** lo que está entre las llaves, incluidas las llaves, y pegalo como secreto `BACKUP_DRIVE_TOKEN`.

### 5. Fotos: `BACKUP_S3_KEY_ID` y `BACKUP_S3_SECRET` (opcional pero recomendado)
1. Supabase › **Storage › S3 Configuration** (o Settings › Storage) › **New access key**.
2. Pegá el *Access key ID* como `BACKUP_S3_KEY_ID` y el *Secret access key* como `BACKUP_S3_SECRET`.
3. En la misma pantalla figura la **región** (el proyecto está en Irlanda: `eu-west-1`). Cargala en la pestaña **Variables** (no Secrets) como `BACKUP_S3_REGION`.

Sin estas claves la copia nocturna igual guarda toda la base, pero no las fotos.

### 6. Primera prueba
GitHub › **Actions › Copia de seguridad nocturna (Google Drive) › Run workflow**. En unos minutos tiene que quedar en verde y aparecer en el Drive la carpeta `OdontoVoz-respaldos`. El último paso restaura la copia en una base vacía y comprueba que tenga todos los registros: eso se hace **todas las noches**, así sabemos que las copias sirven, no solo que existen.

### Avisos
- Si una noche falla, GitHub crea un *issue* «Falló la copia de seguridad…» y te llega un correo.
- Si la cantidad de fichas cae a menos de la mitad de una noche a otra, crea el issue «las fichas bajaron» (puede ser un borrado masivo: hay 35 días para recuperar de las diarias).
- GitHub apaga las tareas programadas si el repositorio pasa **60 días sin cambios**. Si alguna vez pasa, entrá a Actions y reactivala.

---

## Copia en el disco (semanal)

1. Una vez: instalá rclone (paso 4) y en el Símbolo del sistema corré `C:\rclone\rclone.exe config` → `n` (nuevo) → nombre `drive` → tipo `drive` (Google Drive) → Enter en todo lo demás → entrá con somosroan en el navegador.
2. Copiá `scripts/respaldo-disco.bat` al escritorio. Si el disco no es `E:`, editá la línea `set DISCO=E:`.
3. Cada semana: enchufá el disco y hacé doble clic en el archivo. Termina con «Listo».
4. Para que lo haga solo: **Programador de tareas** de Windows › Crear tarea básica › «Respaldo OdontoVoz» › Semanalmente (por ejemplo lunes 9:00) › Iniciar un programa › el `.bat`. Si el disco no está enchufado, avisa y no hace nada.

El disco guarda todas las copias que baja (no borra nada). Un disco de 1 TB alcanza para muchos años. Guardalo en un lugar distinto del consultorio cuando no lo uses, y cambiá el disco cada 4 o 5 años.

En Mac: `sh scripts/respaldo-disco.sh /Volumes/NombreDelDisco`.

---

## Cómo abrir una copia

### La base
```
gpg -d odontovoz-2026-11-11.dump.gpg > odontovoz.dump      (pide la frase)
pg_restore --list odontovoz.dump                            (muestra lo que tiene)
```
(En Windows: gpg viene con Gpg4win; pg_restore con PostgreSQL 17.)

### Las fotos
Están encriptadas archivo por archivo (terminan en `.bin`). Para abrirlas, en rclone crear un remoto tipo `crypt` que apunte a la carpeta `fotos` (del Drive o del disco), con *filename_encryption* = `off`, *directory_name_encryption* = `false`, contraseña = la frase de respaldo y *password2* = `odontovoz-sal-` seguido de la frase. Después: `rclone copy remoto-crypt:actual C:\fotos-abiertas`.

---

## Plan de salida (si hay que dejar Supabase)

Todo lo que usa OdontoVoz es estándar (PostgreSQL + almacenamiento S3 + autenticación), así que se puede mudar.

**A otro proyecto de Supabase** (otra cuenta u otra región; lo más simple, ~1 hora):
1. Crear el proyecto nuevo.
2. Restaurar la última copia: `pg_restore -d "<conexión del proyecto nuevo>" --no-owner --clean --if-exists odontovoz.dump` (trae datos, usuarios y contraseñas cifradas: la gente entra con la misma contraseña).
3. Correr de nuevo los SQL de `supabase/` en el orden de LEEME.md (no borran datos) para reponer funciones y permisos.
4. Subir las fotos al bucket `ov-media` del proyecto nuevo (`rclone copy remoto-crypt:actual supa-nuevo:ov-media`).
5. En `index.html` cambiar `OV_CONFIG` (URL y clave publicable), en Authentication cargar Site URL, SMTP y plantillas de `supabase/correos/`, y publicar una versión nueva. Los equipos bajan todo de nuevo solos.

**A un PostgreSQL propio u otro proveedor** (Neon, AWS RDS, un servidor propio): mismos datos (`pg_restore`), pero hace falta poner delante algo que haga de API y de login (por ejemplo, Supabase autoalojado con Docker, que es código abierto y usa el mismo formato). Es un trabajo de días, no de horas: por eso las copias guardan el formato de Supabase tal cual.

**Si ROAN deja de dar el servicio:** avisar a los clientes con 90 días, entregar a cada uno su información (Menú › Ajustes › Exportar, o desde la base) y conservar las copias anuales encriptadas hasta cumplir 10 años desde la última atención de cada paciente, como dicen los términos (cláusula 8).

---

## Recomendación para cada consultorio
En la app (Ajustes › Cuenta y datos › «Cómo cuidamos tus datos») se recomienda que cada consultorio baje una copia de sus datos una vez por mes y la guarde. No es porque haga falta: es que la ley lo pone como responsable de sus historias clínicas, y tener su propia copia le da control total.
