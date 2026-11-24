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

## 7. Método de activación cuando un cliente paga (decidido el 24/11/2026; todavía NO está armado, a propósito)

**Estado hoy:** apagado para todos (no hay clave de IA). No se publica nada hasta que entre el primer pago.

**Ojo, para no equivocarse:** **no hay que encender la clave de Anthropic (punto 3) antes de armar el control por cuenta (A.1 y A.2)**. Hoy `hc-read` no pregunta si la cuenta pagó: con la clave puesta, cualquier cuenta leería hasta 600 hojas por día gratis.

**La idea:** el servicio queda apagado para todos y se habilita **cuenta por cuenta con un saldo de hojas**. Es el mismo esquema de los recordatorios de WhatsApp (`ov_wa.rem_plan`, `ov_wa_admin_set`, botón en `admin.html`). Se carga hojas a quien paga y se descuentan al leer.

### A) Cuando entra el primer pago: lo que arma Claude (una sola vez, unas 2 horas y una versión nueva)
1. **SQL** (agregar a `supabase/hcpapel.sql`, repetible sin riesgo): tabla `ov_ai_credit (owner uuid primary key, hojas int not null default 0, updated_at)` cerrada con RLS; función `ov_ai_take(owner, n)` que descuenta de forma atómica y devuelve las hojas que quedan (o -1 si no alcanzan); función `ov_ai_grant(owner, n)` que suma (solo `service_role` y administradores, con `ov_is_admin()`); y `ov_ai_admin_list()` para el panel.
2. **`supabase/functions/hc-read/index.ts`**: una vez conocido el `owner`, llamar a `ov_ai_take` con la cantidad de hojas. Si no alcanza, responder **503 con `off: true`** y el mensaje «Este servicio no está activado en tu cuenta. Escribinos y te lo activamos.». La app ya sabe manejarlo (pasa a carga a mano y muestra el cartel), **no hay que tocar la app**. Si la IA falla (502 o 422), devolver las hojas con `ov_ai_grant`. Se mantiene el tope diario. Actualizar `tests/hc/hcread.test.mjs`.
   - `hc-read` se despliega solo (`.github/workflows/functions.yml`) al subir a `main` cualquier cambio en `supabase/functions/**`. Por eso **no tocar esos archivos hasta este momento**.
3. **`admin.html`**: botón «IA historias» en cada cuenta (como «WhatsApp»), para ver el saldo y cargar hojas (+500, +2.000, +5.000 o a mano). Se puede dejar para después: mientras tanto se carga con SQL (punto B).
4. **Después, sin apuro:** aviso en la app cuando quedan pocas hojas, con botón de WhatsApp (como «Mi plan»); servicio y precios en la portada (`sitio/index.html`) y en los términos (`sitio/terminos.html`, subiendo la versión en `cloud.js` y en las páginas).
5. Rodrigo corre el SQL nuevo en Supabase › SQL Editor (Claude no maneja la base) y hace el punto C.

### B) Cada vez que un cliente paga: lo hace Rodrigo, sin código, en unos 2 minutos
1. Cobrarle el paquete del punto 5 (en dólares, pasados a pesos con `DOLAR` de `src/app25.js`).
2. Supabase › SQL Editor, buscar la cuenta: `select owner, email from ov_accounts where email ilike '%parte-del-mail%';`
3. Cargar las hojas: `select ov_ai_grant('<owner>', 500);` (Chico 500, Mediano 2000, Grande 5000). Para dar las 100 de prueba gratis: `select ov_ai_grant('<owner>', 100);`
4. Avisarle al cliente que ya puede usarlo en Ajustes › Consultorio › Pasar historias de papel. Para ver cuánto le queda: `select * from ov_ai_credit where owner = '<owner>';`
5. Anotar el pago en las notas de la cuenta (panel › Editar), por ejemplo «IA 500 hojas, USD 49, 24/11/2026».

### C) Una sola vez antes del primer cliente (Rodrigo)
Hacer el punto 3 de este documento (clave en Supabase; límite mensual en Anthropic: subirlo según el volumen vendido, para no cortar el servicio a mitad de un paquete) y la prueba de costo del punto 4. Si la prueba todavía no se hizo cuando paga el primero, se hace con esas primeras historias y se ajustan los precios antes del segundo.

**Cuidados:** si el gasto de Anthropic llega al límite, la lectura se corta sola y la app pasa a carga a mano (no se pierde nada). Si una lectura falla, no se descuentan hojas. Claude nunca ve ni pega claves.
