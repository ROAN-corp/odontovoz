# Pasar OdontoVoz a la cuenta de Claude de la empresa

Escrito el 20/11/2026, con la app en la versión 1.18 (compilación 1.73.0).

## La idea en una línea

Claude no guarda la memoria del proyecto en la cuenta: está **en este repositorio**. Si la cuenta nueva puede abrir `ROAN-corp/odontovoz` en GitHub, sigue exactamente donde quedamos.

- `CLAUDE.md`: la nota de traspaso. Claude la lee sola al empezar cada sesión.
- `docs/HISTORIA.md`: el historial técnico versión por versión.
- `LEEME.md`: el detalle de cada cambio.

## Qué pasa solo (no hay que hacer nada)

- **El código y las notas** viven en GitHub (`ROAN-corp/odontovoz`) y no dependen de ninguna cuenta de Claude.
- **La publicación automática sigue igual.** La web y el APK se arman con GitHub Actions. El keystore, `GOOGLE_SERVICES_JSON`, `SUPABASE_ACCESS_TOKEN` y las demás claves están en los *secrets* del repositorio, no en Claude.
- **Supabase** (proyecto `hcppfvioiaaejayzzhpa`), el dominio `odontovoz.com.ar`, la cuenta de Gmail somosroan y el panel de licencias no cambian.
- **Los valores de recargos** (`sitio/recargos/preset.json`) y de aranceles (`sitio/aranceles/forn.json`) también están en el repo.

## Qué NO pasa

- **El historial de este chat** queda en la cuenta personal. Por eso todo lo importante está en las tres notas de arriba.
- **Las conexiones personales** (Gmail, Calendar, Drive) de la cuenta personal. Para OdontoVoz no hacen falta. Si algún día se usan, se conectan de nuevo en la cuenta de la empresa.
- **Las capturas y scripts de prueba** de esta sesión estaban en una carpeta temporal. La prueba importante quedó guardada en `tests/ui/humo.py`.

## Pasos en la cuenta nueva

1. **Crear la cuenta de Claude de la empresa** y contratar el plan **Pro** en claude.ai/upgrade. Conviene usar el correo de la empresa, por ejemplo somosroan@gmail.com.
2. **Conectar GitHub.** Entrar a **claude.ai/code** y conectar una cuenta de GitHub que tenga **permiso para escribir** en `ROAN-corp/odontovoz`.
   - Puede ser la cuenta de GitHub de siempre, o una de la empresa que hayan agregado como miembro de la organización ROAN-corp.
   - Cuando GitHub pregunte, **instalar o autorizar la app de Claude en la organización ROAN-corp** y darle acceso al repositorio `odontovoz`. Si la organización ya la tenía instalada para la cuenta vieja, alcanza con autorizar la cuenta nueva.
   - Instalar la app en la organización lo puede hacer solamente un dueño de ROAN-corp en GitHub.
3. **Abrir una sesión nueva** con el repositorio `ROAN-corp/odontovoz` y pegar el mensaje de abajo.
4. **Verificar.** Claude tiene que contestar que la versión es la 1.18 (o la que figure en `CLAUDE.md`) y listar los pendientes. Si contesta bien, la migración está completa.
5. **Opcional:** instalar la app de escritorio de Claude en la PC del consultorio. Sirve si quieren que Claude vea archivos de la computadora (por ejemplo, PDFs de TAD) o use el navegador.
6. **Opcional:** en la cuenta personal, desconectar GitHub cuando ya no se use, para no tener dos cuentas trabajando sobre el mismo repo al mismo tiempo.

## Mensaje para pegar en el primer chat de la cuenta nueva

```
Hola. Soy Rodrigo, de ROAN corp. Venimos de otra cuenta de Claude: seguimos el desarrollo de OdontoVoz acá.
Trabajá sobre el repositorio ROAN-corp/odontovoz (rama main). Antes de hacer nada:
1) Leé CLAUDE.md (la nota de traspaso), y buscá en docs/HISTORIA.md y LEEME.md solo lo que haga falta.
2) Decime en qué versión estamos y qué quedó pendiente.
Reglas de siempre (están en CLAUDE.md): hablame en castellano rioplatense y simple; cada cambio se publica como versión
nueva (número visible + compilación, Novedades en app55, LEEME), se corre inline-src y los tests, se prueba en celular y PC
(podés usar tests/ui/humo.py), se hace git pull --rebase y se sube a main. Nunca me pidas la service_role ni contraseñas.
```

## Seguridad

- **No pegar contraseñas ni claves en el chat nuevo.** Las claves de publicación ya están en los secrets de GitHub. La service_role de Supabase no se le da nunca a Claude.
- Si cambia quién administra GitHub o Supabase, actualizá en `CLAUDE.md` la sección «Direcciones» (admins del panel, correos).
