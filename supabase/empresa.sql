-- OdontoVoz 1.19 · plan y modo Empresa (dueño de hasta 5 consultorios)
-- Correr en Supabase › SQL Editor DESPUÉS de red.sql y legal.sql. Se puede volver a correr.
--
--   1) El plan «red» pasa a llamarse «empresa» (mismos límites; las cuentas que ya tenían «red» se pasan solas).
--   2) Cada equipo de una cuenta Empresa tiene un alcance:
--        'todo'          → el dueño o la administración: ve todos los consultorios y los números de la empresa
--        'sede:<código>' → un consultorio: ve su agenda, sus pacientes y su caja, pero NO los sueldos,
--                          las liquidaciones, las metas ni el registro de los otros consultorios
--        sin asignar     → recién instalado: hasta que se asigne, tampoco ve los números de la empresa
--      El control lo hace el servidor: aunque alguien toque la app, un equipo de consultorio no puede leer ni
--      escribir esos datos. Los pacientes y sus pagos son compartidos (una sola ficha por paciente).
--   3) Solo un equipo del dueño ('todo') puede cambiar el alcance de otro equipo o darle 'todo'.
--      Un equipo sin asignar puede elegir su consultorio (eso lo limita, no le da más permisos).

-- 1) plan Empresa
update public.ov_accounts set plan = 'empresa' where plan = 'red';
alter table public.ov_accounts add column if not exists empresa boolean not null default false;

create or replace function public.ov_limits(uid uuid default auth.uid()) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((
    select jsonb_build_object(
      'plan', a.plan,
      'pros', coalesce(a.lim_pros, case a.plan when 'empresa' then 40 when 'red' then 40 when 'prueba' then 40 when 'centro' then 8 when 'consultorio' then 3 else 1 end),
      'devices', coalesce(a.lim_devices, case a.plan when 'empresa' then 60 when 'red' then 60 when 'centro' then 12 when 'consultorio' then 5 when 'prueba' then 5 else 2 end),
      'locs', coalesce(a.max_locs, case a.plan when 'empresa' then 5 when 'red' then 5 when 'centro' then 5 when 'prueba' then 5 else 1 end),
      'centros', case a.plan when 'empresa' then 5 when 'red' then 5 when 'prueba' then 5 else 1 end)
    from public.ov_accounts a where a.owner = uid), '{"plan":"prueba","pros":40,"devices":5,"locs":5,"centros":5}'::jsonb);
$$;
grant execute on function public.ov_limits(uuid) to authenticated;

-- el modo Empresa solo se puede activar con el plan Empresa o en la prueba
create or replace function public.ov_rec_ok(p_k text, p_v jsonb) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare l jsonb := public.ov_limits();
begin
  if p_k = 'pros' then
    return jsonb_typeof(p_v) <> 'array' or jsonb_array_length(p_v) <= (l->>'pros')::int;
  elsif p_k = 'setup' then
    if p_v is null or jsonb_typeof(p_v) <> 'object' then return true; end if;
    if coalesce(p_v->>'type', 'solo') = 'empresa' then return (l->>'centros')::int >= 2; end if;
    return coalesce(p_v->>'type', 'solo') = 'solo' or (l->>'pros')::int >= 2;
  elsif p_k = 'cfg' then
    return p_v is null or jsonb_typeof(p_v->'locs') is distinct from 'array' or jsonb_array_length(p_v->'locs') <= (l->>'locs')::int;
  end if;
  return true;
end $$;
grant execute on function public.ov_rec_ok(text, jsonb) to authenticated;

-- 2) alcance de cada equipo
alter table public.ov_devices add column if not exists scope text check (scope is null or scope = 'todo' or scope ~ '^sede:[A-Za-z0-9_-]{1,40}$');
alter table public.ov_devices add column if not exists scope_by text;
alter table public.ov_devices add column if not exists scope_at timestamptz;

create or replace function public.ov_my_scope() returns text
language sql stable security definer set search_path = public as $$
  select d.scope from public.ov_devices d where d.owner = auth.uid() and d.id = public.ov_device_id() and d.removed_at is null;
$$;
grant execute on function public.ov_my_scope() to authenticated;

-- qué datos puede leer o escribir este equipo
--   'liq'           liquidaciones de los profesionales
--   'empo'          datos del dueño: sueldos, metas, ajustes de la empresa
--   'cash'          caja general de la empresa (gastos del dueño, honorarios pagados)
--   'caja:<sede>'   caja de cada consultorio: egresos y cierres (lo ve ese consultorio y el dueño)
--   'audit:todo'    registro de lo que se hace desde los equipos del dueño
--   'audit:<sede>'  registro de cada consultorio (lo ve ese consultorio y el dueño)
create or replace function public.ov_key_ok(p_k text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare emp boolean; sc text;
begin
  select coalesce(a.empresa, false) into emp from public.ov_accounts a where a.owner = auth.uid();
  if not coalesce(emp, false) then return true; end if;
  sc := public.ov_my_scope();
  if sc = 'todo' then return true; end if;
  if p_k in ('liq', 'empo', 'cash', 'audit:todo') then return false; end if;
  if p_k like 'audit:%' then return sc is not null and sc = 'sede:' || substr(p_k, 7); end if;
  if p_k like 'caja:%' then return sc is not null and sc = 'sede:' || substr(p_k, 6); end if;
  return true;
end $$;
grant execute on function public.ov_key_ok(text) to authenticated;

drop policy if exists "ov_records_read" on public.ov_records;
drop policy if exists "ov_records_insert" on public.ov_records;
drop policy if exists "ov_records_update" on public.ov_records;
create policy "ov_records_read" on public.ov_records for select to authenticated using (owner = (select auth.uid()) and public.ov_device_ok() and public.ov_key_ok(k));
create policy "ov_records_insert" on public.ov_records for insert to authenticated with check (owner = (select auth.uid()) and public.ov_is_active() and public.ov_device_ok() and public.ov_key_ok(k) and public.ov_rec_ok(k, v));
create policy "ov_records_update" on public.ov_records for update to authenticated using (owner = (select auth.uid()) and public.ov_device_ok() and public.ov_key_ok(k)) with check (owner = (select auth.uid()) and public.ov_is_active() and public.ov_device_ok() and public.ov_key_ok(k) and public.ov_rec_ok(k, v));
drop policy if exists "ov_history_read_own" on public.ov_history;
create policy "ov_history_read_own" on public.ov_history for select to authenticated using (owner = (select auth.uid()) and public.ov_device_ok() and public.ov_key_ok(k));

-- activar el modo Empresa: el equipo que lo activa queda como equipo del dueño
create or replace function public.ov_empresa_on() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); l jsonb := public.ov_limits(); acc public.ov_accounts; sc text;
begin
  if uid is null or not public.ov_device_ok() then return jsonb_build_object('ok', false, 'msg', 'Este equipo no está habilitado.'); end if;
  if (l->>'centros')::int < 2 then return jsonb_build_object('ok', false, 'plan', true, 'msg', 'El modo Empresa es del plan Empresa.'); end if;
  select * into acc from public.ov_accounts where owner = uid;
  sc := public.ov_my_scope();
  -- si la empresa ya estaba activa, solo un equipo del dueño puede volver a activarla
  if coalesce(acc.empresa, false) and coalesce(sc, '') <> 'todo' and exists (select 1 from public.ov_devices where owner = uid and scope = 'todo' and removed_at is null) then
    return jsonb_build_object('ok', false, 'msg', 'El modo Empresa ya está activo. Pedile al dueño que habilite este equipo.');
  end if;
  update public.ov_accounts set empresa = true where owner = uid;
  update public.ov_devices set scope = 'todo', scope_by = 'empresa_on', scope_at = now() where owner = uid and id = public.ov_device_id();
  return jsonb_build_object('ok', true, 'scope', 'todo');
end $$;
revoke all on function public.ov_empresa_on() from public, anon;
grant execute on function public.ov_empresa_on() to authenticated;

-- dejar el modo Empresa (solo desde un equipo del dueño): todos los equipos vuelven a ver todo
create or replace function public.ov_empresa_off() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null or coalesce(public.ov_my_scope(), '') <> 'todo' then return jsonb_build_object('ok', false, 'msg', 'Solo desde un equipo del dueño.'); end if;
  update public.ov_accounts set empresa = false where owner = uid;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.ov_empresa_off() from public, anon;
grant execute on function public.ov_empresa_off() to authenticated;

-- asignar el alcance de un equipo
create or replace function public.ov_device_scope(p_id text, p_scope text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); me text := public.ov_device_id(); my text; cur public.ov_devices; owners int;
begin
  if uid is null or not public.ov_device_ok() then return jsonb_build_object('ok', false, 'msg', 'Este equipo no está habilitado.'); end if;
  if p_scope is not null and p_scope <> 'todo' and p_scope !~ '^sede:[A-Za-z0-9_-]{1,40}$' then return jsonb_build_object('ok', false, 'msg', 'Consultorio inválido.'); end if;
  select * into cur from public.ov_devices where owner = uid and id = p_id and removed_at is null;
  if not found then return jsonb_build_object('ok', false, 'msg', 'Ese equipo no está conectado.'); end if;
  my := public.ov_my_scope();
  select count(*) into owners from public.ov_devices where owner = uid and scope = 'todo' and removed_at is null;
  if coalesce(my, '') = 'todo' then
    -- el dueño puede asignar cualquier equipo, pero no dejar la empresa sin ningún equipo del dueño
    if cur.scope = 'todo' and coalesce(p_scope, '') <> 'todo' and owners <= 1 then return jsonb_build_object('ok', false, 'msg', 'Tiene que quedar al menos un equipo del dueño.'); end if;
  elsif p_id = me and cur.scope is null and p_scope like 'sede:%' then
    null; -- un equipo nuevo elige su consultorio
  elsif owners = 0 and p_id = me and p_scope = 'todo' then
    null; -- no hay ningún equipo del dueño todavía
  else
    return jsonb_build_object('ok', false, 'need_owner', true, 'msg', 'Esto lo tiene que hacer el dueño desde Empresa › Equipos.');
  end if;
  update public.ov_devices set scope = p_scope, scope_by = me, scope_at = now() where owner = uid and id = p_id;
  return jsonb_build_object('ok', true, 'scope', p_scope);
end $$;
revoke all on function public.ov_device_scope(text, text) from public, anon;
grant execute on function public.ov_device_scope(text, text) to authenticated;

-- registrar el equipo (como antes) y además devolver su alcance y si la cuenta está en modo Empresa
create or replace function public.ov_device_register(p_id text, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); lim int; n int; acc public.ov_accounts; gone public.ov_devices; sc text;
begin
  if uid is null then return jsonb_build_object('ok', false, 'msg', 'Sin sesión.'); end if;
  if p_id !~ '^[A-Za-z0-9_-]{12,64}$' then return jsonb_build_object('ok', false, 'msg', 'Equipo inválido.'); end if;
  perform pg_advisory_xact_lock(hashtext('ovdev' || uid::text));
  select * into acc from public.ov_accounts where owner = uid;
  if exists (select 1 from public.ov_devices where owner = uid and id = p_id and removed_at is null) then
    update public.ov_devices set last_seen = now(), name = left(coalesce(p_name, name), 60) where owner = uid and id = p_id returning scope into sc;
    return jsonb_build_object('ok', true, 'scope', sc, 'empresa', coalesce(acc.empresa, false));
  end if;
  select * into gone from public.ov_devices where owner = uid and id = p_id and removed_at is not null;
  if found then return jsonb_build_object('ok', false, 'revoked', true, 'by', coalesce(gone.removed_by, 'user'), 'at', gone.removed_at); end if;
  lim := (public.ov_limits(uid)->>'devices')::int;
  select count(*) into n from public.ov_devices where owner = uid and removed_at is null;
  if n >= lim then
    return jsonb_build_object('ok', false, 'full', true, 'limit', lim, 'plan', public.ov_limits(uid)->>'plan',
      'devices', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'last_seen', last_seen) order by last_seen desc), '[]'::jsonb) from public.ov_devices where owner = uid and removed_at is null));
  end if;
  insert into public.ov_devices (owner, id, name) values (uid, p_id, left(p_name, 60));
  if acc.plan = 'prueba' and acc.paid_until is null and exists (select 1 from public.ov_devices d where d.id = p_id and d.owner <> uid) then
    update public.ov_accounts set flags = 'prueba desde un equipo ya usado por otra cuenta' where owner = uid and flags is null;
  end if;
  return jsonb_build_object('ok', true, 'scope', null, 'empresa', coalesce(acc.empresa, false));
end $$;

-- la lista de equipos suma el alcance de cada uno
create or replace function public.ov_device_list() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('limit', (public.ov_limits()->>'devices')::int, 'plan', public.ov_limits()->>'plan', 'me', public.ov_device_id(), 'my_scope', public.ov_my_scope(),
    'empresa', (select coalesce(empresa, false) from public.ov_accounts where owner = auth.uid()),
    'removals_left', greatest(0, 4 - (select count(*) from public.ov_devices where owner = auth.uid() and coalesce(removed_by, 'user') = 'user' and removed_at > now() - interval '30 days')),
    'devices', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'last_seen', last_seen, 'created_at', created_at, 'scope', scope) order by last_seen desc), '[]'::jsonb) from public.ov_devices where owner = auth.uid() and removed_at is null));
$$;

-- desconectar un equipo: en modo Empresa, solo desde un equipo del dueño
create or replace function public.ov_device_remove(p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int; emp boolean;
begin
  if uid is null then return jsonb_build_object('ok', false, 'msg', 'Sin sesión.'); end if;
  select coalesce(empresa, false) into emp from public.ov_accounts where owner = uid;
  if emp and coalesce(public.ov_my_scope(), '') <> 'todo' and p_id <> public.ov_device_id() then
    return jsonb_build_object('ok', false, 'msg', 'En modo Empresa, los equipos los desconecta el dueño.');
  end if;
  select count(*) into n from public.ov_devices where owner = uid and coalesce(removed_by, 'user') = 'user' and removed_at > now() - interval '30 days';
  if n >= 4 then return jsonb_build_object('ok', false, 'msg', 'Ya liberaste 4 equipos este mes. Para liberar otro, escribinos a soporte.'); end if;
  update public.ov_devices set removed_at = now(), removed_by = 'user' where owner = uid and id = p_id and removed_at is null;
  return jsonb_build_object('ok', found);
end $$;
