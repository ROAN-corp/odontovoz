-- OdontoVoz · un equipo quitado queda desconectado (1.11.1)
-- Correr en Supabase › SQL Editor DESPUÉS de limites.sql. Se puede volver a correr.
-- Antes, «Quitar» borraba el registro y el equipo podía volver a registrarse solo. Ahora queda marcado como
-- desconectado: la app lo detecta, cierra la sesión y borra los datos de ese equipo. Para volver, hay que ingresar
-- de nuevo y entra como equipo nuevo (ocupa un lugar del plan).
alter table public.ov_devices add column if not exists removed_by text;

create or replace function public.ov_device_register(p_id text, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); lim int; n int; acc public.ov_accounts; gone public.ov_devices;
begin
  if uid is null then return jsonb_build_object('ok', false, 'msg', 'Sin sesión.'); end if;
  if p_id !~ '^[A-Za-z0-9_-]{12,64}$' then return jsonb_build_object('ok', false, 'msg', 'Equipo inválido.'); end if;
  perform pg_advisory_xact_lock(hashtext('ovdev' || uid::text));
  if exists (select 1 from public.ov_devices where owner = uid and id = p_id and removed_at is null) then
    update public.ov_devices set last_seen = now(), name = left(coalesce(p_name, name), 60) where owner = uid and id = p_id;
    return jsonb_build_object('ok', true);
  end if;
  -- un equipo desconectado no vuelve solo
  select * into gone from public.ov_devices where owner = uid and id = p_id and removed_at is not null;
  if found then return jsonb_build_object('ok', false, 'revoked', true, 'by', coalesce(gone.removed_by, 'user'), 'at', gone.removed_at); end if;
  lim := (public.ov_limits(uid)->>'devices')::int;
  select count(*) into n from public.ov_devices where owner = uid and removed_at is null;
  if n >= lim then
    return jsonb_build_object('ok', false, 'full', true, 'limit', lim, 'plan', public.ov_limits(uid)->>'plan',
      'devices', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'last_seen', last_seen) order by last_seen desc), '[]'::jsonb) from public.ov_devices where owner = uid and removed_at is null));
  end if;
  insert into public.ov_devices (owner, id, name) values (uid, p_id, left(p_name, 60));
  select * into acc from public.ov_accounts where owner = uid;
  if acc.plan = 'prueba' and acc.paid_until is null and exists (select 1 from public.ov_devices d where d.id = p_id and d.owner <> uid) then
    update public.ov_accounts set flags = 'prueba desde un equipo ya usado por otra cuenta' where owner = uid and flags is null;
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ov_device_list() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('limit', (public.ov_limits()->>'devices')::int, 'plan', public.ov_limits()->>'plan', 'me', public.ov_device_id(),
    'removals_left', greatest(0, 4 - (select count(*) from public.ov_devices where owner = auth.uid() and coalesce(removed_by, 'user') = 'user' and removed_at > now() - interval '30 days')),
    'devices', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'last_seen', last_seen, 'created_at', created_at) order by last_seen desc), '[]'::jsonb) from public.ov_devices where owner = auth.uid() and removed_at is null));
$$;

create or replace function public.ov_device_remove(p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then return jsonb_build_object('ok', false, 'msg', 'Sin sesión.'); end if;
  select count(*) into n from public.ov_devices where owner = uid and coalesce(removed_by, 'user') = 'user' and removed_at > now() - interval '30 days';
  if n >= 4 then return jsonb_build_object('ok', false, 'msg', 'Ya liberaste 4 equipos este mes. Para liberar otro, escribinos a soporte.'); end if;
  update public.ov_devices set removed_at = now(), removed_by = 'user' where owner = uid and id = p_id and removed_at is null;
  return jsonb_build_object('ok', found);
end $$;

-- administradores: desconectar (no borrar) uno o todos los equipos de una cuenta; no cuenta para el límite mensual del cliente
create or replace function public.ov_admin_device_reset(p_owner uuid, p_id text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.ov_is_admin() then raise exception 'solo administradores'; end if;
  update public.ov_devices set removed_at = now(), removed_by = 'admin' where owner = p_owner and removed_at is null and (p_id is null or id = p_id);
end $$;

-- el equipo que pregunta: ¿sigue conectado?
create or replace function public.ov_device_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.ov_devices where owner = auth.uid() and id = public.ov_device_id() and removed_at is null) then '{"ok":true}'::jsonb
    when exists (select 1 from public.ov_devices where owner = auth.uid() and id = public.ov_device_id()) then (select jsonb_build_object('ok', false, 'revoked', true, 'by', coalesce(removed_by, 'user')) from public.ov_devices where owner = auth.uid() and id = public.ov_device_id())
    else '{"ok":false,"unknown":true}'::jsonb end;
$$;
revoke all on function public.ov_device_status() from public, anon;
grant execute on function public.ov_device_status() to authenticated;
