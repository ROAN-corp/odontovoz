-- ============================================================================
-- OdontoVoz 1.27 · planes nuevos: Consultorio o Centro = hasta 5 profesionales y 6 equipos (precio total, sin adicionales).
-- Correr UNA vez en Supabase › SQL Editor (después de equipo.sql). Las cuentas con límites propios (lim_pros, lim_devices) no cambian.
-- ============================================================================
create or replace function public.ov_limits(uid uuid default public.ov_owner()) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((
    select jsonb_build_object(
      'plan', a.plan,
      'pros', coalesce(a.lim_pros, case a.plan when 'empresa' then 40 when 'red' then 40 when 'prueba' then 40 when 'centro' then 8 when 'consultorio' then 5 else 1 end),
      'devices', coalesce(a.lim_devices, case a.plan when 'empresa' then 60 when 'red' then 60 when 'centro' then 12 when 'consultorio' then 6 when 'prueba' then 5 else 2 end),
      'locs', coalesce(a.max_locs, case a.plan when 'empresa' then 5 when 'red' then 5 when 'centro' then 5 when 'prueba' then 5 else 1 end),
      'centros', case a.plan when 'empresa' then 5 when 'red' then 5 when 'prueba' then 5 else 1 end)
    from public.ov_accounts a where a.owner = uid), '{"plan":"prueba","pros":40,"devices":5,"locs":5,"centros":5}'::jsonb);
$$;
grant execute on function public.ov_limits(uuid) to authenticated;
