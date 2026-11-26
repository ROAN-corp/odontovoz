-- =====================================================================
-- OdontoVoz 1.51 · cada profesional carga sus propios datos (matrícula, sello, firma)
-- Correr una vez en Supabase › SQL Editor (después de equipo.sql y empresa.sql). Se puede volver a correr.
--
-- Un usuario del equipo con puesto Profesional o Asistente no puede cambiar la lista de profesionales (`pros`),
-- que es del dueño. Para que cargue sus propios datos sin pasárselos a nadie, cada profesional tiene su registro
-- propio `pf:<id del profesional>`:
--   · lo escribe y lo lee ese usuario (el que está asignado a ese profesional),
--   · lo leen y escriben el dueño y la administración,
--   · nadie más del equipo lo ve (los sellos y las firmas no circulan).
-- Lo mismo vale para `rp:<id>`: los pagos del alquiler de ese profesional (lo que avisa que pagó y lo que cobra el centro).
-- El dueño recibe los datos en su cuenta automáticamente y los pasa a la ficha del profesional.
-- =====================================================================

create or replace function public.ov_key_ok(p_k text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare emp boolean; sc text; rl text := public.ov_role(); ms text;
begin
  /* datos propios de cada profesional (pf:) y pagos de su alquiler (rp:) */
  if p_k like 'pf:%' or p_k like 'rp:%' then
    if rl in ('dueno', 'admin') then return true; end if;
    return rl in ('profesional', 'asistente') and exists (
      select 1 from public.ov_members m
      where m.member = auth.uid() and m.owner = public.ov_owner() and m.active and m.pro is not null and m.pro = substr(p_k, 4));
  end if;
  /* personas del equipo: según su puesto, en cualquier tipo de cuenta */
  select coalesce(a.empresa, false) into emp from public.ov_accounts a where a.owner = public.ov_owner();
  if rl = 'admin' and p_k = 'empo' then return false; end if;
  if rl in ('recepcion', 'profesional', 'asistente') then
    if p_k in ('liq', 'empo', 'audit:todo') then return false; end if;
    /* la caja general: solo la recepción de una cuenta sin modo Empresa (en Empresa cada consultorio tiene la suya) */
    if p_k = 'cash' then return rl = 'recepcion' and not coalesce(emp, false); end if;
    ms := public.ov_member_sede();
    /* la caja del consultorio: la recepción de ese consultorio; los profesionales no ven la plata */
    if p_k like 'caja:%' then return rl = 'recepcion' and ms is not null and ms = substr(p_k, 6); end if;
    if p_k like 'audit:%' then return ms is not null and ms = substr(p_k, 7); end if;
  end if;
  /* equipos de consultorio en modo Empresa */
  if not coalesce(emp, false) then return true; end if;
  sc := public.ov_my_scope();
  if sc = 'todo' then return true; end if;
  if p_k in ('liq', 'empo', 'cash', 'audit:todo') then return false; end if;
  if p_k like 'audit:%' then return sc is not null and sc = 'sede:' || substr(p_k, 7); end if;
  if p_k like 'caja:%' then return sc is not null and sc = 'sede:' || substr(p_k, 6); end if;
  return true;
end $$;
grant execute on function public.ov_key_ok(text) to authenticated;
