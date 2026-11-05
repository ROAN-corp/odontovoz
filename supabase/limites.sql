-- OdontoVoz · límites de cada plan controlados por el servidor (1.11)
-- Correr en Supabase › SQL Editor DESPUÉS de licencias.sql y consultorios.sql. Se puede volver a correr.
--
--   Plan           Profesionales  Equipos  Consultorios (modo profesional)  Tipo de cuenta
--   prueba               1           2        2                            un profesional
--   basico (Profesional) 1           2        1 (+ adicionales: max_locs)  un profesional
--   consultorio          3           5        1                            consultorio / centro
--   centro               8          12        5                            consultorio / centro
--
-- Excepciones a mano desde el panel: lim_pros, lim_devices y max_locs (vacío = lo del plan).
-- El servidor rechaza: datos de equipos no registrados, más profesionales o consultorios que los del plan,
-- y pasar a «centro» con un plan de un solo profesional.

alter table public.ov_accounts add column if not exists lim_pros int check (lim_pros between 1 and 50);
alter table public.ov_accounts add column if not exists lim_devices int check (lim_devices between 1 and 50);
alter table public.ov_accounts add column if not exists flags text;          -- avisos para el panel (p. ej. prueba desde un equipo ya usado)

create or replace function public.ov_limits(uid uuid default auth.uid()) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((
    select jsonb_build_object(
      'plan', a.plan,
      'pros', coalesce(a.lim_pros, case a.plan when 'centro' then 8 when 'consultorio' then 3 else 1 end),
      'devices', coalesce(a.lim_devices, case a.plan when 'centro' then 12 when 'consultorio' then 5 else 2 end),
      'locs', coalesce(a.max_locs, case a.plan when 'centro' then 5 when 'prueba' then 2 else 1 end))
    from public.ov_accounts a where a.owner = uid), '{"plan":"prueba","pros":1,"devices":2,"locs":1}'::jsonb);
$$;
grant execute on function public.ov_limits(uuid) to authenticated;

-- equipos de cada cuenta
create table if not exists public.ov_devices (
  owner      uuid not null references auth.users (id) on delete cascade,
  id         text not null check (id ~ '^[A-Za-z0-9_-]{12,64}$'),
  name       text,
  created_at timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  removed_at timestamptz,
  primary key (owner, id)
);
alter table public.ov_devices enable row level security;
drop policy if exists "ov_devices_read" on public.ov_devices;
create policy "ov_devices_read" on public.ov_devices for select to authenticated using (owner = auth.uid() or public.ov_is_admin());
grant select on public.ov_devices to authenticated;
revoke all on public.ov_devices from anon;

-- el equipo que hace el pedido (lo manda la app en el encabezado x-ov-device)
create or replace function public.ov_device_id() returns text
language sql stable as $$ select coalesce(nullif(current_setting('request.headers', true), '')::json->>'x-ov-device', ''); $$;
create or replace function public.ov_device_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ov_devices d where d.owner = auth.uid() and d.id = public.ov_device_id() and d.removed_at is null);
$$;
grant execute on function public.ov_device_ok() to authenticated;

-- registrar este equipo (lo hace la app sola al entrar)
create or replace function public.ov_device_register(p_id text, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); lim int; n int; acc public.ov_accounts;
begin
  if uid is null then return jsonb_build_object('ok', false, 'msg', 'Sin sesión.'); end if;
  if p_id !~ '^[A-Za-z0-9_-]{12,64}$' then return jsonb_build_object('ok', false, 'msg', 'Equipo inválido.'); end if;
  perform pg_advisory_xact_lock(hashtext('ovdev' || uid::text));
  if exists (select 1 from public.ov_devices where owner = uid and id = p_id and removed_at is null) then
    update public.ov_devices set last_seen = now(), name = left(coalesce(p_name, name), 60) where owner = uid and id = p_id;
    return jsonb_build_object('ok', true);
  end if;
  lim := (public.ov_limits(uid)->>'devices')::int;
  select count(*) into n from public.ov_devices where owner = uid and removed_at is null;
  if n >= lim then
    return jsonb_build_object('ok', false, 'full', true, 'limit', lim, 'plan', public.ov_limits(uid)->>'plan',
      'devices', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'last_seen', last_seen) order by last_seen desc), '[]'::jsonb) from public.ov_devices where owner = uid and removed_at is null));
  end if;
  insert into public.ov_devices (owner, id, name) values (uid, p_id, left(p_name, 60))
    on conflict (owner, id) do update set removed_at = null, last_seen = now(), name = excluded.name;
  -- aviso para el panel: una prueba gratis desde un equipo que ya usó otra cuenta
  select * into acc from public.ov_accounts where owner = uid;
  if acc.plan = 'prueba' and acc.paid_until is null and exists (select 1 from public.ov_devices d where d.id = p_id and d.owner <> uid) then
    update public.ov_accounts set flags = 'prueba desde un equipo ya usado por otra cuenta' where owner = uid and flags is null;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- lista de equipos y cuántos se pueden liberar este mes
create or replace function public.ov_device_list() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('limit', (public.ov_limits()->>'devices')::int, 'plan', public.ov_limits()->>'plan', 'me', public.ov_device_id(),
    'removals_left', greatest(0, 4 - (select count(*) from public.ov_devices where owner = auth.uid() and removed_at > now() - interval '30 days')),
    'devices', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'last_seen', last_seen, 'created_at', created_at) order by last_seen desc), '[]'::jsonb) from public.ov_devices where owner = auth.uid() and removed_at is null));
$$;

-- liberar un equipo (para cambiar de celular o de PC). Hasta 4 por mes; más, desde soporte.
create or replace function public.ov_device_remove(p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then return jsonb_build_object('ok', false, 'msg', 'Sin sesión.'); end if;
  select count(*) into n from public.ov_devices where owner = uid and removed_at > now() - interval '30 days';
  if n >= 4 then return jsonb_build_object('ok', false, 'msg', 'Ya liberaste 4 equipos este mes. Para liberar otro, escribinos a soporte.'); end if;
  update public.ov_devices set removed_at = now() where owner = uid and id = p_id and removed_at is null;
  return jsonb_build_object('ok', found);
end $$;

-- administradores: ver y liberar equipos de una cuenta
create or replace function public.ov_admin_devices(p_owner uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.ov_is_admin() then (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'last_seen', last_seen, 'removed_at', removed_at) order by removed_at nulls first, last_seen desc), '[]'::jsonb) from public.ov_devices where owner = p_owner) end;
$$;
create or replace function public.ov_admin_device_reset(p_owner uuid, p_id text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.ov_is_admin() then raise exception 'solo administradores'; end if;
  if p_id is null then delete from public.ov_devices where owner = p_owner;
  else delete from public.ov_devices where owner = p_owner and id = p_id; end if;
end $$;
revoke all on function public.ov_device_register(text, text) from public, anon;
revoke all on function public.ov_device_list() from public, anon;
revoke all on function public.ov_device_remove(text) from public, anon;
revoke all on function public.ov_admin_devices(uuid) from public, anon;
revoke all on function public.ov_admin_device_reset(uuid, text) from public, anon;
grant execute on function public.ov_device_register(text, text) to authenticated;
grant execute on function public.ov_device_list() to authenticated;
grant execute on function public.ov_device_remove(text) to authenticated;
grant execute on function public.ov_admin_devices(uuid) to authenticated;
grant execute on function public.ov_admin_device_reset(uuid, text) to authenticated;

-- ¿estos datos respetan el plan? (profesionales, tipo de cuenta y consultorios)
create or replace function public.ov_rec_ok(p_k text, p_v jsonb) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare l jsonb := public.ov_limits();
begin
  if p_k = 'pros' then
    return jsonb_typeof(p_v) <> 'array' or jsonb_array_length(p_v) <= (l->>'pros')::int;
  elsif p_k = 'setup' then
    return p_v is null or jsonb_typeof(p_v) <> 'object' or coalesce(p_v->>'type', 'solo') = 'solo' or (l->>'pros')::int >= 2;
  elsif p_k = 'cfg' then
    return p_v is null or jsonb_typeof(p_v->'locs') is distinct from 'array' or jsonb_array_length(p_v->'locs') <= (l->>'locs')::int;
  end if;
  return true;
end $$;
grant execute on function public.ov_rec_ok(text, jsonb) to authenticated;

-- reglas de la tabla de datos: solo equipos registrados, con licencia vigente y dentro del plan
drop policy if exists "ov_records_read" on public.ov_records;
drop policy if exists "ov_records_insert" on public.ov_records;
drop policy if exists "ov_records_update" on public.ov_records;
create policy "ov_records_read" on public.ov_records for select to authenticated using (owner = (select auth.uid()) and public.ov_device_ok());
create policy "ov_records_insert" on public.ov_records for insert to authenticated with check (owner = (select auth.uid()) and public.ov_is_active() and public.ov_device_ok() and public.ov_rec_ok(k, v));
create policy "ov_records_update" on public.ov_records for update to authenticated using (owner = (select auth.uid()) and public.ov_device_ok()) with check (owner = (select auth.uid()) and public.ov_is_active() and public.ov_device_ok() and public.ov_rec_ok(k, v));
drop policy if exists "ov_history_read_own" on public.ov_history;
create policy "ov_history_read_own" on public.ov_history for select to authenticated using (owner = (select auth.uid()) and public.ov_device_ok());

-- panel: el resumen de cuentas suma los límites y los equipos en uso
drop function if exists public.ov_admin_accounts();
create function public.ov_admin_accounts() returns table (
  owner uuid, email text, plan text, status text, trial_until date, paid_until date, max_devices int, max_locs int, lim_pros int, lim_devices int, flags text, notes text,
  created_at timestamptz, last_sync timestamptz, records bigint, last_sign_in timestamptz, devices bigint, limits jsonb
) language sql stable security definer set search_path = public as $$
  select a.owner, a.email, a.plan, a.status, a.trial_until, a.paid_until, a.max_devices, a.max_locs, a.lim_pros, a.lim_devices, a.flags, a.notes, a.created_at,
         (select max(r.updated_at) from public.ov_records r where r.owner = a.owner),
         (select count(*) from public.ov_records r where r.owner = a.owner),
         u.last_sign_in_at,
         (select count(*) from public.ov_devices d where d.owner = a.owner and d.removed_at is null),
         public.ov_limits(a.owner)
  from public.ov_accounts a join auth.users u on u.id = a.owner
  where public.ov_is_admin()
  order by a.created_at desc;
$$;
revoke all on function public.ov_admin_accounts() from public, anon;
grant execute on function public.ov_admin_accounts() to authenticated;

-- las cuentas de los socios (administradores) sin límites prácticos
update public.ov_accounts a set lim_pros = coalesce(a.lim_pros, 8), lim_devices = coalesce(a.lim_devices, 12), max_locs = coalesce(a.max_locs, 5)
  from public.ov_admins ad where ad.user_id = a.owner;
