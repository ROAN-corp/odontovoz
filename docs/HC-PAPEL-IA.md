# Pasar historias de papel con IA — estado y plan

Actualizado: 24/11/2026. Para Rodrigo y para la conversación de Claude que siga con esto.

## 1. Qué es

En la app: **Ajustes › Consultorio › Pasar historias de papel**. El consultorio saca fotos a las historias clínicas de papel, la app las lee con inteligencia artificial y arma la ficha del paciente: datos, antecedentes, odontograma y evoluciones. Antes de guardar, alguien revisa: lo dudoso aparece en amarillo y lo que no se entendió, en naranja con «[?]». Se puede agregar a un paciente que ya existe, y en ese caso solo se completa lo que está vacío.

**Hoy funciona la carga a mano** (gratis). **La lectura automática está apagada**, porque falta la clave de la IA.

## 2. Dónde está en el código

- App: `src/app77.js` (`hcpOpen`, `MF.hcp`, `MF.hcpRev`, `A.hcpRun`, `A.hcpSave`). Lotes guardados en IndexedDB `odontovoz.hcp`.
- Servidor: Edge Function `supabase/functions/hc-read/index.ts`. Modelo `claude-sonnet-5-5` (se cambia con el secreto opcional `HC_AI_MODEL`), `max_tokens` 8000. Sin `ANTHROPIC_API_KEY` responde 503 y la app pasa a carga a mano.
- Base de datos: `supabase/hcpapel.sql` (**ya corrido** el 16/11/2026). Tabla `ov_ai_use` y función `ov_ai_hit`: cuenta las hojas por cuenta y por día. Tope `HC_READ_MAX` = **600 hojas por día y cuenta** (secreto opcional).
- Prueba: `tests/hc/hcread.test.mjs`. En la app, `A._hcpMock` simula la IA.
- Términos y privacidad ya mencionan este servicio (versión 2026-11-16).

**Todavía no existe:** el cobro por paquetes, es decir, el saldo de hojas por cuenta, la venta de paquetes y la marca en el panel de licencias. Hoy cualquier cuenta puede leer hasta 600 hojas por día sin pagar.

## 3. Cómo encenderlo (lo hace Rodrigo; Claude no maneja claves)

1. Entrar a **console.anthropic.com** con la cuenta de ROAN. Ya hay crédito cargado.
2. **Settings › Limits**: poner un límite mensual bajo, **USD 10**, para que nunca se gaste de más.
3. **API Keys › Create key**, con el nombre «OdontoVoz historias de papel». Copiarla; se ve una sola vez.
4. Entrar a **Supabase › proyecto hcppfvioiaaejayzzhpa › Edge Functions › Secrets**, crear `ANTHROPIC_API_KEY` y pegar la clave. No pasarla por el chat.
5. Listo: la app empieza a leer sola, sin publicar una versión nueva.

## 4. Prueba para medir el costo real

1. Pasar **20 a 30 historias reales**, mezclando cortas, largas, de una y de dos carillas, con letra clara y con letra difícil.
2. Anotar: cuántas **hojas** se leyeron, cuántas salieron bien sin corregir y cuántas hubo que corregir mucho.
3. En console.anthropic.com › **Usage / Cost**: cuánto se gastó en dólares en esos días.
4. **Costo por hoja = dólares gastados ÷ hojas leídas.** Se estima en unos pocos centavos de dólar por hoja, pero hay que confirmarlo.

## 5. Precios propuestos (precio de VENTA al cliente)

Es lo que se le cobraría al consultorio, con la ganancia ya incluida. **No es el costo.** Es una propuesta: se confirma o se ajusta cuando se sepa el costo real (punto 4).

| Paquete | Hojas | Precio al cliente | Por hoja |
|---|---|---|---|
| Prueba | primeras 100 | gratis | — |
| Chico | 500 | USD 49 | ~USD 0,10 |
| Mediano | 2.000 | USD 149 | ~USD 0,075 |
| Grande | 5.000 | USD 299 | ~USD 0,06 |

**Cómo decidir:**
- **Ganancia por hoja = precio por hoja − costo por hoja.** Conviene que el costo sea, como mucho, un tercio del precio del paquete grande (más o menos USD 0,02 por hoja). Si da más, subir los precios o achicar los paquetes.
- Las **100 hojas gratis** las paga ROAN: cuentan como costo para conseguir clientes. Por ejemplo, con un costo de USD 0,02 por hoja, cada cliente nuevo cuesta unos USD 2.
- Los precios están en dólares, como el resto de los planes, y en Argentina se cobran en pesos al dólar de referencia (`DOLAR` en `src/app25.js`).

## 6. Qué hacer después de la prueba (tarea para Claude)

Cuando Rodrigo pase los números (gasto en USD, hojas leídas, cuántas salieron bien):

1. Calcular el costo por hoja y proponer la tabla final con el margen que él quiera.
2. Programar el **saldo de hojas por cuenta**:
   - columna o tabla en Supabase con las hojas disponibles;
   - descontar en `hc-read` antes de llamar a la IA;
   - primeras 100 gratis;
   - aviso en la app cuando quede poco, con un botón de WhatsApp para comprar más (como «Mi plan»);
   - carga de paquetes desde `admin.html`.
3. Agregar el servicio y sus precios a la portada (`sitio/index.html`) y a los términos (`sitio/terminos.html`, subir la versión de términos en `cloud.js` y en las páginas).
4. Publicar una versión nueva (pasos en CLAUDE.md).

**Reglas:** Claude no pide, no ve ni pega claves. La clave la pone Rodrigo en Supabase.

## 7. Activación por cuenta cuando un cliente paga (ARMADO Y PROBADO el 24/11/2026, SIN PUBLICAR)

**Estado:** el trabajo está hecho y probado, pero **no está en `main`** (no se publicó nada: ni la web, ni el APK, ni la función del servidor, ni el SQL). Vive en la rama local `ia-historias-papel-sin-publicar` (salió de `main` en la 1.23.2). Para retomarlo: `git checkout ia-historias-papel-sin-publicar`. Si la rama se perdió, el trabajo son estos archivos: `supabase/hcpapel-saldo.sql`, `supabase/functions/hc-read/index.ts`, `src/app77.js`, `admin.html`, `tests/hc/hcread.test.mjs` y `tests/hc/saldo.test.mjs`.

**Cómo funciona:** el servicio queda **apagado para todas las cuentas** y se habilita cuenta por cuenta con un **saldo de hojas** (una hoja = una foto). Cada lectura descuenta antes de llamar a la IA y devuelve las hojas si algo falla. Sin saldo no se lee, y si el SQL no está corrido tampoco (falla cerrado: no regala lecturas). Es el mismo esquema que los recordatorios de WhatsApp.

**Qué hay:**
- **Base de datos** (`supabase/hcpapel-saldo.sql`, repetible sin riesgo): `ov_ai_credit` (saldo), `ov_ai_ledger` (registro de cada carga, con nota y quién), `ov_ai_take` (descuenta de forma atómica: devuelve lo que queda, -1 si no alcanza o -2 si no está activada), `ov_ai_refund`, `ov_ai_grant` (cargar o corregir), `ov_ai_admin_grant`, `ov_ai_admin_list`, `ov_ai_admin_ledger` (panel, solo administradores) y `ov_ai_my` (la app, el saldo propio). Las funciones de descontar y cargar solo las puede llamar el servidor o el SQL Editor, nunca un usuario común.
- **Servidor** (`hc-read`): descuenta antes de leer; sin servicio responde 503 `no_activada`, sin hojas 503 `sin_hojas`; devuelve las hojas si falla la IA, si no usa la herramienta, si se corta la conexión o si se pasa del tope diario; la respuesta trae `left` (hojas que quedan).
- **App** (`src/app77.js`): en «Pasar historias de papel», arriba, aparece cuántas hojas tiene la cuenta. Con 20 o menos avisa y ofrece escribir por WhatsApp para sumar; si no está activada o se terminaron, lo dice y ofrece pedirlo por WhatsApp (con el mail de la cuenta). La carga a mano siempre sigue disponible. Si el servidor todavía no tiene el saldo, la ventana queda exactamente como antes.
- **Panel** (`admin.html`): botón **«IA historias»** en cada cuenta (y una etiqueta «IA N hojas» en la lista). Muestra hojas disponibles, cargadas y enviadas a leer; carga los paquetes con un clic (+100 prueba gratis, +500 USD 49, +2.000 USD 149, +5.000 USD 299), una cantidad a mano (con signo menos corrige un error), la nota del pago y las últimas cargas. Si falta el SQL, lo avisa.

**Lo que se probó:**
- El SQL en un Postgres real en memoria (PGlite): 42 comprobaciones, incluidos los permisos de cada rol, el piso en 0, que la devolución no cuente como compra, y 30 lecturas simultáneas con 10 hojas (pasan justo 10). `node tests/hc/saldo.test.mjs` (necesita `npm i --no-save @electric-sql/pglite@0.2`).
- La función con la base y la IA simuladas: 29 comprobaciones (sin servicio, sin hojas, SQL sin preparar, fallas de la IA, devoluciones, tope diario, pedidos simultáneos). `node --experimental-strip-types --no-warnings tests/hc/hcread.test.mjs`.
- La app y el panel, en celular y PC, con un servidor simulado: servidor sin saldo, no activada, con hojas, pocas, sin hojas, modo prueba (no consulta nada), lectura con descuento en pantalla, carga de paquetes, corrección y cantidad inválida.
- **No se probó:** la función real dentro de Supabase con la IA real y fotos reales (es la prueba de costo del punto 4), ni el flujo completo contra PostgREST con sesiones reales.

### Cuando se decida publicarlo (en este orden)
1. Traer el trabajo a `main` (`git pull --rebase origin main`), subir versión y compilación, anotar en `LEEME.md` y correr los tests de siempre más los dos de `tests/hc/`.
2. Rodrigo corre `supabase/hcpapel-saldo.sql` en Supabase › SQL Editor.
3. Subir a `main` (web, APK y la función `hc-read`, que se despliega sola con `functions.yml`).
4. **Recién al final**, Rodrigo carga la clave de Anthropic (punto 3 de este documento) y ajusta el límite mensual según lo que se venda. Aunque se hiciera antes, nadie puede leer sin saldo.
5. Probar con una cuenta propia: cargarle 100 hojas desde el panel y pasar 20 o 30 historias reales (punto 4: costo por hoja y calidad). Con eso se confirman o se ajustan los precios.

### Cada vez que un cliente paga (Rodrigo, 1 minuto)
1. Cobrar el paquete del punto 5 (en dólares, pasados a pesos con `DOLAR` de `src/app25.js`).
2. `admin.html` › la cuenta › **IA historias** › tocar el paquete (o escribir la cantidad) y poner en la nota cómo pagó.
3. Avisarle al cliente que ya puede usarlo en Ajustes › Consultorio › Pasar historias de papel. En la ficha de la cuenta queda el saldo y el registro de cargas.
- Sin el panel (alternativa): en el SQL Editor, `select ov_ai_grant('<owner>', 500, 'IA 500 hojas, USD 49');` (el `owner` sale de `select owner, email from ov_accounts where email ilike '%parte-del-mail%';`).

### Todavía sin hacer (decisiones de ustedes)
- Mostrar el servicio y sus precios en la portada (`sitio/index.html`) y en los términos (`sitio/terminos.html`). Subir la versión de los términos obliga a todos a volver a aceptarlos, por eso conviene hacerlo con el abogado y todo junto.
- IVA y facturación de los paquetes.
- Si los paquetes vencen o no (hoy las hojas no vencen).

**Cuidados:** si el gasto de Anthropic llega al límite, la lectura se corta sola y la app pasa a carga a mano (no se pierde nada). Si una lectura falla, no se descuentan hojas. Claude nunca ve ni pega claves.
