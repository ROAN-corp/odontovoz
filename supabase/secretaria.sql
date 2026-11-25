-- =====================================================================
-- OdontoVoz 1.34 · Secretaría: administra cobros y cuentas
-- Correr una vez en Supabase › SQL Editor. Se puede volver a correr sin problema.
--
-- Antes: recepción y asistente no podían cambiar ni borrar cobros ya guardados (solo agregar).
-- Ahora: la SECRETARÍA (puesto «recepcion») puede corregir y anular cobros y cuentas,
--        pero sigue sin poder cambiar ni borrar las NOTAS de la historia clínica.
--        El ASISTENTE queda igual que antes (cobros y notas protegidos).
-- Requiere haber corrido antes supabase/permisos.sql (usa ov_keep_old).
-- =====================================================================

create or replace function public.ov_pd_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text;
begin
  if new.k not like 'pd:%' or auth.uid() is null or tg_op <> 'UPDATE' then return new; end if;
  r := public.ov_role();
  if r not in ('recepcion', 'asistente') then return new; end if;
  if jsonb_typeof(old.v) <> 'object' or jsonb_typeof(new.v) <> 'object' then return new; end if;
  if r = 'asistente' and jsonb_typeof(old.v->'ledger') = 'array' then
    new.v := jsonb_set(new.v, '{ledger}', public.ov_keep_old(old.v->'ledger', new.v->'ledger', array['cobOk', 'cobBy', 'cobAt', 'cobPaid']), true);
  end if;
  if jsonb_typeof(old.v->'notes') = 'array' then
    new.v := jsonb_set(new.v, '{notes}', public.ov_keep_old(old.v->'notes', new.v->'notes', array['odon', 'payId']), true);
  end if;
  return new;
end $$;
