-- OdontoVoz 1.17 · plan Red (dueño de hasta 5 centros) y prueba gratis con todo incluido.
-- Correr en Supabase › SQL Editor DESPUÉS de limites.sql. Se puede volver a correr.
--
--   Plan           Profesionales  Equipos  Consultorios  Centros
--   prueba              40           5          5           5     ← la prueba trae todo, para conocer cualquier plan
--   basico (Profesional) 1           2          1 (+ max_locs)
--   consultorio          3           5          1
--   centro               8          12          5
--   red                 40          60          5           5     ← dueño de varios centros ($161.900)
--
-- Al pagar, desde el panel se pasa la cuenta al plan contratado y quedan los límites de ese plan.

create or replace function public.ov_limits(uid uuid default auth.uid()) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((
    select jsonb_build_object(
      'plan', a.plan,
      'pros', coalesce(a.lim_pros, case a.plan when 'red' then 40 when 'prueba' then 40 when 'centro' then 8 when 'consultorio' then 3 else 1 end),
      'devices', coalesce(a.lim_devices, case a.plan when 'red' then 60 when 'centro' then 12 when 'consultorio' then 5 when 'prueba' then 5 else 2 end),
      'locs', coalesce(a.max_locs, case a.plan when 'red' then 5 when 'centro' then 5 when 'prueba' then 5 else 1 end),
      'centros', case a.plan when 'red' then 5 when 'prueba' then 5 else 1 end)
    from public.ov_accounts a where a.owner = uid), '{"plan":"prueba","pros":40,"devices":5,"locs":5,"centros":5}'::jsonb);
$$;
grant execute on function public.ov_limits(uuid) to authenticated;
