# OdontoVoz · nota de traspaso para Claude

Leé esto antes de tocar nada. Resume el proyecto hasta la versión 1.11 (noviembre 2026).

## Quiénes y qué
- Producto de **ROAN corp** (Rodrigo y su socio, odontólogos de la Patagonia). Contacto: somosroan@gmail.com. GitHub: organización **ROAN-corp**.
- OdontoVoz: gestión odontológica (agenda, pacientes, historia clínica, odontograma, periodontograma, presupuestos, cobros, laboratorio, fotos, firma) **manejada por voz**. Interfaz en castellano rioplatense (vos, «agendá», «tocá»).
- Hablale al usuario en castellano rioplatense, simple y sin jerga técnica.

## Direcciones
- Web pública (landing): https://roan-corp.github.io/odontovoz/ (fuente: `sitio/`)
- App web: https://roan-corp.github.io/odontovoz/app/
- Panel de licencias: https://roan-corp.github.io/odontovoz/admin.html (admins: rodribobadilla5630@gmail.com y angelagatielo@gmail.com, tabla `ov_admins`)
- APK: https://github.com/ROAN-corp/odontovoz/releases/latest/download/OdontoVoz.apk
- Supabase: proyecto `hcppfvioiaaejayzzhpa` (org ROAN). Site URL `https://roan-corp.github.io/odontovoz/app/`. La URL y la clave **publicable** están en `OV_CONFIG` dentro de `index.html`.

## Cómo está armado
- La app es **un solo archivo**: `index.html` (`window.App`, alias `A`; estado `A.S`).
- Los módulos nuevos van en `src/*.js` y se copian dentro de `index.html` con `node scripts/inline-src.js` (orden en ese script: ovcmd, app5 … app14, app15, app16, app17, app18, app19). **Editá siempre `src/` y después corré el script.** La primera línea de cada módulo empieza con `/* =====` y ninguna otra línea puede empezar así.
- Acciones del HTML: `data-act` / `data-chg` / `data-in` / `data-sub` → `A.acts` / `A.chg` / `A.ins` / `A.subs`. Modales: `A.modalFns`, `A.modalShell`.
- `A.refresh` se redefine en la sección «arranque»: los módulos **no** deben envolverlo; usen `A.afterRefresh`, `A.load` o funciones de render.
- Voz: `src/ovcmd.js` (parser, `window.OVCmd`, testeado con `node tests/ovcmd.test.js`) + `A.cmd.exec(texto)` que devuelve `{ok, msg}`; los módulos lo envuelven (`const execPrev = A.cmd.exec; A.cmd.exec = …`). `src/app14.js` tiene el periodontograma y los comandos rioplatenses extra.
- Nube: Supabase REST (`src/cloud.js`), tabla `ov_records` con merge de 3 vías, fotos en el bucket privado `ov-media`. Licencias en `ov_accounts` (`src/lic.js`, SQL en `supabase/`).
- PDF: `A.pdfDoc_(titulo)` (jsPDF desde cdnjs).
- Convención del odontograma: azul = a realizar, rojo = existente/realizado.
- Legal: la firma del paciente es **firma electrónica** (Ley 25.506 art. 5), no firma digital. HC se conserva 10 años (Ley 26.529 art. 18).

## Publicar una versión
1. Subir la versión en `package.json`, `sw.js` (VERSION), `src/app10.js` (`A.VERSION`) y `.github/workflows/apk.yml` (tag y nombre). Anotar los cambios en `LEEME.md`.
2. Correr `node scripts/inline-src.js` y `node tests/ovcmd.test.js`; probar con Playwright en celular (390×844) y PC (1366×860).
3. Subir a `main`: el workflow `web.yml` publica la web y `apk.yml` compila y firma el APK (keystore en los secrets del repo; **nunca** subir el keystore).
4. Verificar la web en vivo y que la última release sea la nueva.

## Reglas acordadas con el usuario
- Nunca pedir ni manejar la service_role, la secret key ni la contraseña de la base de datos. Las contraseñas (por ejemplo, la de aplicación de Gmail para SMTP) las pega el usuario.
- No crear cuentas ni escribir contraseñas en formularios. Pedir permiso antes de cambiar configuraciones de servicios.
- No repetir credenciales en el chat.

## Planes (hechos en 1.7.1/1.8)
- Prueba 7 días (14 para las primeras 50 cuentas, `promo = 'lanzamiento50'`, ya cargado en Supabase). Profesional $26.900 + $4.900 por consultorio adicional; Consultorio $51.900; Centro $89.900; IVA incluido, abono mensual. Noviembre 2026: 35% solo el primer mes (`PROMO` en `sitio/index.html`, se apaga solo).
- Soporte por WhatsApp: Rodrigo 5492984513279 y Angel 5492984764428 (`A.SUPPORT` en `src/app5.js`, `CONTACTO` en `sitio/index.html`).
- La evolución clínica (`src/app15.js`) borra notas del día y automáticas; las manuales viejas se anulan (Ley 26.529). El plan de tratamiento está en `src/app16.js`.
- 1.9 (`src/app17.js`): turnero online con link (`sitio/turnos.html`, tablas `ov_booking` y `ov_booking_req`, SQL `supabase/turnero.sql`), recordatorios en el inicio y «Cambios de hoy» para deshacer en el día.
- 1.10 (`src/app18.js`): ventanas que solo cierran con Cerrar/✕, borrar turnos, borrar profesionales sin historia, apariencia por equipo (`odontovoz.look`), accesos del inicio (`odontovoz.home`), sugerencias (`ov_feedback`, SQL `supabase/sugerencias.sql`), botón Hoy y «12t» en el calendario.
- 1.11 (`src/app19.js`, `supabase/limites.sql`): límites por plan controlados por el servidor. Profesionales, equipos (tabla `ov_devices`, encabezado `x-ov-device` que manda `src/cloud.js`), consultorios y tipo de cuenta. Mantener iguales la tabla `PLAN` de `app19.js`, `ov_limits()` del SQL, `DEF` de `admin.html` y las tarjetas de `sitio/index.html`.

## Pendiente
- SMTP con la cuenta somosroan@gmail.com (el usuario genera la contraseña de aplicación); después cargar las plantillas `supabase/correos/*.html` en Supabase › Auth › Email templates y subir el límite de envíos.
- Página de la empresa: crear el repo `roan-corp.github.io` en ROAN-corp y subir su `index.html` (diseño ya hecho, con la cordillera).
- Publicar en Play Store y App Store (hoy el APK se instala desde la web).
