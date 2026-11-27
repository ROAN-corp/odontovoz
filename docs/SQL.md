# SQL de Supabase: cómo se ordena y cómo no se rompe

## La regla de oro
Cada función o regla de acceso puede estar definida en varios archivos de `supabase/` (la versión vieja y las que la fueron mejorando).
**Volver a correr un archivo viejo NO tiene que pisar lo nuevo.** Por eso:

1. `tests/sql/orden.txt` es el orden en que se aplican los archivos en una base nueva. El que está más abajo manda.
2. `python3 scripts/guardar-sql.py` deja cada definición vieja «solo si no existe» (funciones y reglas `create policy`). El último archivo que define algo queda como versión final.
3. `bash tests/sql/probar.sh` aplica todo en una base común, vuelve a correr cada archivo solo y verifica que no cambió nada. Corre solo en GitHub (`Pruebas`).
4. `supabase/salud.sql` crea `ov_health()`: dice si el servidor real tiene todo en su versión nueva. `Salud del servidor` (GitHub, todos los días) la consulta y avisa por mail si falla.

## Para sumar un SQL nuevo
1. Escribilo en `supabase/algo.sql`, que se pueda volver a correr (`if not exists`, `create or replace`, `drop policy if exists`).
2. Sumalo al **final** de `tests/sql/orden.txt` (antes de `salud`).
3. Si reemplaza una función o regla de otro archivo: corré `python3 scripts/guardar-sql.py` (protege los viejos) y sumá en `supabase/salud.sql` una marca de la versión nueva (por ejemplo `public.ov_fn_has('ov_algo', 'texto que solo tiene la versión nueva')`).
4. `bash tests/sql/probar.sh` tiene que dar todo bien (necesita PostgreSQL; en GitHub corre solo).
5. Correrlo en Supabase › SQL Editor y comprobar con `select ov_health();` que dé `{"ok": true}`.

## Si algo se rompió
`select ov_health();` en el SQL Editor dice qué falta. Para repararlo, volver a correr el archivo que define la versión nueva de lo que falta.
