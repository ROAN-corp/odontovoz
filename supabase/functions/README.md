# Autogestión por WhatsApp · funciones del servidor (1.39.1)

Modelo: **autogestión con menú de botones incluida y gratis** (sin IA; Meta no cobra las respuestas a quien escribió en las últimas 24 h) + **recordatorios automáticos como único servicio pago** (`ov_wa.rem_plan` r1/r2/r3, `rem_quota`, `rem_used`). La respuesta con IA y `wa-sim` quedan guardadas: el webhook usa IA solo si la cuenta tiene `cfg.ai = true` y existe `ANTHROPIC_API_KEY`.

El motor del menú es `scripts/wa-menu.js` (pruebas: `tests/wa/menu.test.mjs`); `node scripts/build-wa.js` lo copia al webhook y a `src/app52.js`.

| Función | Verify JWT | Para qué | Secretos |
|---|---|---|---|
| `wa-sim` | Sí | (Guardada) prueba con IA desde la app. Hoy «Probala» usa el menú dentro de la app. | `ANTHROPIC_API_KEY` (opcional `WA_AI_MODEL`, `WA_SIM_MAX`) |
| `wa-webhook` | **No** | Recibe los mensajes de Meta y responde con el menú de botones; BAJA/ALTA; botones del recordatorio. | `META_APP_SECRET`, `META_TOKEN`, `WA_VERIFY_TOKEN` |
| `wa-send` | Sí | Una persona responde desde la app (solo dentro de las 24 h). | `META_TOKEN` |
| `wa-cron` | **No** | Cada 10 min: manda recordatorios en cola solo a cuentas con `rem_plan` y cupo del mes (9 a 20 h, tope diario, sin bajas) y revisa la calidad del número. | `META_TOKEN`, `WA_CRON_KEY` (opcional `WA_TPL_REM`, `WA_TPL_LANG`, `WA_HOURS`) |

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase; nadie los copia.
- `wa-sim/index.ts` se **genera**: editar `wa-sim/template.ts` o el bloque `CEREBRO` de `wa-webhook/index.ts` y correr `node scripts/build-wa.js`.
- Cada archivo es autocontenido (se puede pegar en el editor de funciones del panel de Supabase).
- SQL: `supabase/whatsapp.sql` (tablas `ov_wa*`, funciones para la app y el panel, y el `cron.schedule` comentado al final).
- Plantilla de Meta (categoría **Utility**, idioma `es_AR`, nombre `ov_recordatorio_turno`):
  - Cuerpo: `Hola {{1}}, te recordamos tu turno en {{2}} el {{3}} a las {{4}} con {{5}}. ¿Nos confirmás?`
  - Pie: `Si no querés recibir recordatorios, respondé BAJA.`
  - Botones de respuesta rápida: `Confirmo` y `Necesito cambiarlo`.
- Webhook en Meta: `https://hcppfvioiaaejayzzhpa.supabase.co/functions/v1/wa-webhook`, campo `messages`.
- Pruebas sin red: `tests/wa/menu.test.mjs`, `tests/wa/testmenu.mjs`, `tests/wa/test.mjs` (IA) y `tests/wa/testsim.mjs` (Node 22 con `--experimental-strip-types`, Meta, IA y base simuladas).
