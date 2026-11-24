# Socias, cajas privadas y profesionales que alquilan — diseño

Escrito el 24/11/2026 con Rodrigo, a partir del consultorio de Vanessa y Mariela (dos socias, dueñas y odontólogas) y de los profesionales que trabajan ahí. **Es un diseño: se va programando por etapas** (ver «Etapas»). Lo dicho por Rodrigo está resumido con sus palabras.

## 1. Lo que se quiere

- **Los pacientes son del consultorio**, no del profesional que los atiende. Todos los usuarios del consultorio (socias, secretaria, administración, profesionales) ven los pacientes y sus historias. Esto **no cambia** respecto de hoy.
- **La plata sí se separa por profesional.** Cada profesional tiene su propia caja: lo que se cobra por sus pacientes y sus números. Esa caja puede ser **privada (solo él la ve)** o **visible para la administración**. Lo elige él, libremente.
  - Vanessa no quiere que Mariela vea lo que ella cobra, y al revés.
  - El profesional que **alquila** un módulo o el consultorio completo gana el 100% de lo suyo y «no le rinde cuentas a nadie»: el consultorio solo ve el pago del alquiler.
  - El profesional que trabaja **a porcentaje** es distinto: una parte es del consultorio, así que **la administración sí ve sus números**.
- **El consultorio tiene su propia caja:** los gastos compartidos (alquiler del local, insumos, etc.), lo que entra por porcentajes, lo que entra por alquileres. Ese resultado **se reparte entre las dos socias** con un porcentaje configurable (mitad y mitad por defecto).
- El que alquila necesita **su propio usuario dentro del consultorio**: ve la agenda y los pacientes del consultorio, y sus propios números. Si no, no se puede sumar a un consultorio.
- Flujo: el paciente llega, la secretaria lo asigna al profesional, el profesional lo atiende y cobra en su caja.

## 2. Tres tipos de profesional (decidido con Rodrigo el 24/11/2026)

| Tipo | Plata | ¿La administración ve sus números? | Su caja |
|---|---|---|---|
| **Socia** (dueña y profesional) | 100% de sus pacientes; reparte con la otra socia solo lo del consultorio | Lo que ella decida | Privada o visible, la elige ella |
| **A porcentaje** (`pct`, `pctmod`) | Parte para el consultorio, parte para él | **Sí, siempre** (le corresponde plata al consultorio) | Visible |
| **Alquila** (rama aparte) | **Siempre se queda con el 100%.** Solo paga el alquiler | **No**: la administración ve únicamente el pago del alquiler | Privada (puede tildar que sea visible) |

**Alquiler es una rama aparte, con dos modalidades** (las dos con el mismo trato: 100% para él):
- **Alquiler de un módulo** (un sillón/espacio dentro del consultorio).
- **Alquiler del consultorio completo.**
- **Qué es un módulo:** un bloque de horas semanales **a convenir** (por ejemplo 2, 3, 4 o 5 horas por semana), con **horarios editables**. Como las horas son variables, **el precio del módulo también es editable** para cada profesional (más horas, más plata; se acuerda y se puede cambiar cuando cambian las horas).
- En cualquiera de las dos, el alquiler se puede cobrar **por hora, por módulo o por consultorio entero** (monto por hora × horas de agenda, o monto fijo mensual). Esto reemplaza a los modos `alq`/`mod`/`otro` para quien alquila.

**Obras sociales del que alquila: también privadas.** Atiende a sus pacientes, factura él y le pagan a él. Sus liquidaciones de obra social, deudas y cobros no los ve el consultorio.

**Regla legal que ordena todo (Ley 26.529 art. 18, 10 años):** las **historias clínicas son del consultorio**, no del profesional. Si el que alquila se va:
- sus **cobros y números privados se los lleva** (los exporta; no quedan en el consultorio);
- las **historias clínicas, odontogramas, fotos y firmas quedan en el consultorio**;
- los pacientes son del consultorio; si el profesional se los lleva a otro lugar, **el consultorio conserva la historia** (solo deja de atenderlos ahí).
Por eso la privacidad es **solo de la plata** (cobros, deuda, obras sociales, liquidaciones). La parte clínica nunca es privada.

## 3. Cómo se hace (privacidad de verdad, no solo esconder en pantalla)

- Hoy los cobros y cargos viven dentro de la ficha de cada paciente (`pd:<id>`, `ledger`), que ve todo el consultorio. Para que un profesional con **caja privada** no se la muestre a nadie, sus importes se guardan en una clave propia `priv:<usuario>` y **el servidor solo se la deja leer y escribir a ese usuario**. Es una regla más en `ov_key_ok(k)` (`supabase/equipo.sql` y `permisos.sql`), como las que ya existen para `caja:` o `liq`. Ni la administración, ni la otra socia, ni la cuenta del dueño pueden leerla por la app ni por la API.
- En la ficha compartida del paciente queda solo una marca «atendido por Dr. X, cobro en su caja privada», **sin importes**. La secretaria no ve la deuda de esos pacientes: la maneja el profesional.
- **Límite honesto:** quien administra el servidor (ROAN y Supabase) puede leer cualquier dato, como en cualquier sistema en la nube. Si algún día se quiere cifrado de punta a punta, es otro nivel y otro costo.
- El **alquiler** (módulo o consultorio completo; por hora, por módulo o fijo) se registra solo como ingreso del consultorio, sin mostrar los cobros del profesional.
- El **reparto entre socias**: resultado del consultorio del mes = ingresos del consultorio (porcentajes, alquileres, otros) − gastos compartidos, repartido por el porcentaje de cada socia (configurable). Lo ven las dos, porque es del consultorio.
- **Subcuenta del que alquila:** un usuario con puesto Profesional vinculado a él (`m.pro`), con «Mi caja privada» activada. Ve la agenda y los pacientes del consultorio y solo sus números.

## 4. Etapas

1. **Avisos por profesional** (hecha en la 1.23.3): a quien atiende y administra le llegan solo los avisos de sus pacientes (en pantalla y con la app cerrada), no le llegan los «Para cobrar» (los cobra la secretaria) y en la lista de usuarios se ve «Administra y atiende».
2. **Ficha del profesional: «Mi caja»** (privada o visible) y la regla del servidor para `priv:<usuario>`. Se fuerza visible para los de porcentaje.
3. **Cobros y cargos a la caja privada** (la etapa más grande y delicada): los importes de un profesional privado se guardan en su caja privada; «Mis números» y la caja personal leen de ahí; las vistas del consultorio (caja, liquidaciones, estado de cuenta) los excluyen. Hay que probar a fondo: cobros con obras sociales, planes de tratamiento, presupuestos, caja del día, y el cambio de privada a visible (qué pasa con lo ya cargado).
4. **Caja del consultorio y reparto entre socias.**
5. **Subcuenta del que alquila** (puesto y privacidad) y el alquiler como ingreso automático.

## 5. Decisiones abiertas (a definir cuando se llegue a cada etapa)

- ~~Obras sociales del que alquila~~: resuelto, son privadas (le pagan a él).
- Qué obras sociales del profesional **socia** o **a porcentaje** quedan en la caja del consultorio.
- Cómo se exportan los números privados cuando el que alquila se va.
- Si un paciente pasa de un profesional privado a otro, ¿qué pasa con su deuda? (la deuda es del profesional que la generó; la historia sigue en el consultorio)
- Cambiar una caja de privada a visible (o al revés) cuando ya tiene movimientos.
- IVA y facturación de los alquileres.
- Precio del plan: cada usuario usa un equipo del plan (Consultorio o Centro trae 5).

## 6. Qué ya existe (para no rehacerlo)

- Acuerdos por profesional y liquidaciones: `src/app65.js`, `src/app69.js` (`A.liqCalc`, «Mis números»), modos `pct`, `mod`, `pctmod`, `alq`, `otro`.
- Usuarios del equipo y puestos: `src/app33.js`; «Atiende como» (Administración y dueño): 1.23.1 y 1.23.2.
- Permisos por clave en el servidor: `ov_key_ok(k)`; guardas de lo ya cargado: `supabase/permisos.sql`.
- Avisos: `src/app12.js` (`PREF`, `A.onArrivals`), `src/app59.js` (push), `supabase/functions/push-hook/index.ts`.
