-- OdontoVoz 1.23 · cuentas del equipo (secretarias y odontólogos que trabajan para el dueño)
-- Correr en Supabase › SQL Editor DESPUÉS de empresa.sql. Se puede volver a correr.
--
--   0) ARREGLO URGENTE: desde legal.sql (1.18) el registro de cuentas nuevas fallaba por un nombre repetido
--      dentro de la función que crea la cuenta (la variable «promo» se confundía con la columna «promo»).
--   1) El dueño invita a cada persona con un enlace. La persona crea su propio usuario (correo y contraseña),
--      gratis: usa la cuenta del dueño, que es quien paga. Nadie necesita conocer la contraseña del dueño.
--   2) Cada persona tiene un puesto y un consultorio. El servidor decide qué puede leer y escribir:
--        admin        → todo, salvo los sueldos y las metas (empo)
--        recepcion    → agenda, pacientes, cobros y la caja de SU consultorio
--        profesional  → agenda, pacientes, prácticas, presupuestos y cobros de SU consultorio
--        asistente    → igual que profesional
--      Recepción, profesional y asistente NO pueden leer: liquidaciones, sueldos/metas, caja general,
--      cajas y registros de otros consultorios. Ninguna persona del equipo puede cambiar el tipo de cuenta;
--      solo el dueño y la administración cambian ajustes, profesionales y personal.
--   3) El dueño puede quitarle el acceso a cualquiera en el momento (y se desconectan sus equipos).
--   4) Para las cuentas que no tienen equipo, nada cambia: el dueño es el mismo usuario de siempre.

-- 0) registro de cuentas nuevas (y de personas invitadas)
create table if not exists public.ov_members (
  member      uuid primary key references auth.users (id) on delete cascade,
  owner       uuid not null references auth.users (id) on delete cascade,
  role        text not null check (role in ('admin', 'recepcion', 'profesional', 'asistente')),
  sede        text,
  pro         text,
  name        text,
  email       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  removed_at  timestamptz,
  last_seen   timestamptz
);
create index if not exists ov_members_owner on public.ov_members (owner);
alter table public.ov_members enable row level security;
drop policy if exists "ov_members_read" on public.ov_members;
create policy "ov_members_read" on public.ov_members for select to authenticated using (member = auth.uid() or owner = auth.uid() or public.ov_is_admin());
grant select on public.ov_members to authenticated;
revoke all on public.ov_members from anon;

create table if not exists public.ov_invites (
  code        text primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  role        text not null check (role in ('admin', 'recepcion', 'profesional', 'asistente')),
  sede        text,
  pro         text,
  name        text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  used_by     uuid references auth.users (id) on delete set null,
  used_at     timestamptz,
  revoked     boolean not null default false
);
alter table public.ov_invites enable row level security;
drop policy if exists "ov_invites_read" on public.ov_invites;
create policy "ov_invites_read" on public.ov_invites for select to authenticated using (owner = auth.uid() or public.ov_is_admin());
grant select on public.ov_invites to authenticated;
revoke all on public.ov_invites from anon;

-- de quién son los datos que usa esta sesión: el dueño (o el mismo usuario si no es parte de un equipo)
create or replace function public.ov_owner() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce((select m.owner from public.ov_members m where m.member = auth.uid() and m.active), auth.uid());
$$;
grant execute on function public.ov_owner() to authenticated, anon;
create or replace function public.ov_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select m.role from public.ov_members m where m.member = auth.uid() and m.active), 'dueno');
$$;
grant execute on function public.ov_role() to authenticated;
create or replace function public.ov_member_sede() returns text
language sql stable security definer set search_path = public as $$
  select m.sede from public.ov_members m where m.member = auth.uid() and m.active;
$$;
grant execute on function public.ov_member_sede() to authenticated;

-- unir a una persona a la cuenta del dueño con un código de invitación (lo usan el registro y «aceptar»)
create or replace function public.ov_join_invite(p_uid uuid, p_email text, p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv public.ov_invites;
begin
  select * into inv from public.ov_invites where code = upper(trim(coalesce(p_code, ''))) for update;
  if not found or inv.revoked then return jsonb_build_object('ok', false, 'msg', 'La invitación no existe o fue cancelada.'); end if;
  if inv.used_by is not null and inv.used_by <> p_uid then return jsonb_build_object('ok', false, 'msg', 'Esa invitación ya se usó.'); end if;
  if inv.expires_at < now() then return jsonb_build_object('ok', false, 'msg', 'La invitación venció. Pedile una nueva a quien te invitó.'); end if;
  if inv.owner = p_uid then return jsonb_build_object('ok', false, 'msg', 'No te podés invitar a vos mismo.'); end if;
  if exists (select 1 from public.ov_records where owner = p_uid) then return jsonb_build_object('ok', false, 'msg', 'Esta cuenta ya tiene datos propios. Para sumarte al equipo, creá un usuario nuevo con otro correo.'); end if;
  if exists (select 1 from public.ov_members where owner = p_uid and active) then return jsonb_build_object('ok', false, 'msg', 'Esta cuenta ya tiene su propio equipo.'); end if;
  insert into public.ov_members (member, owner, role, sede, pro, name, email, active, removed_at)
  values (p_uid, inv.owner, inv.role, inv.sede, inv.pro, inv.name, p_email, true, null)
  on conflict (member) do update set owner = excluded.owner, role = excluded.role, sede = excluded.sede, pro = excluded.pro, name = excluded.name, email = excluded.email, active = true, removed_at = null;
  update public.ov_invites set used_by = p_uid, used_at = now() where code = inv.code;
  /* si se había creado una prueba propia sin usar, se quita (la persona usa la cuenta del dueño) */
  delete from public.ov_accounts where owner = p_uid and paid_until is null and plan = 'prueba';
  delete from public.ov_devices where owner = p_uid;
  return jsonb_build_object('ok', true, 'role', inv.role, 'sede', inv.sede);
end $$;
revoke all on function public.ov_join_invite(uuid, text, text) from public, anon, authenticated;

create or replace function public.ov_new_account() returns trigger
language plpgsql security definer set search_path = public as $$
declare usados int; con_promo boolean; inv text; r jsonb;
begin
  -- persona invitada por un dueño: se suma a su equipo y no se le crea una cuenta propia
  inv := nullif(trim(coalesce(new.raw_user_meta_data->>'invite', '')), '');
  if inv is not null then
    r := public.ov_join_invite(new.id, new.email, inv);
    if coalesce((r->>'ok')::boolean, false) then return new; end if;
  end if;
  perform pg_advisory_xact_lock(4202611);
  select count(*) into usados from public.ov_accounts a where a.promo = 'lanzamiento50';
  con_promo := usados < 50 and now() < timestamptz '2027-01-01 00:00:00-03';
  insert into public.ov_accounts (owner, email, trial_until, promo)
  values (new.id, new.email, current_date + case when con_promo then 14 else 7 end, case when con_promo then 'lanzamiento50' end)
  on conflict (owner) do nothing;
  return new;
end $$;

-- 1) todo lo que era «del usuario» pasa a ser «del dueño de la sesión»
create or replace function public.ov_is_active(uid uuid default public.ov_owner()) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select a.status = 'activa' and greatest(a.trial_until, coalesce(a.paid_until, a.trial_until)) >= current_date
                   from public.ov_accounts a where a.owner = uid), false);
$$;
create or replace function public.ov_limits(uid uuid default public.ov_owner()) returns jsonb
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

-- equipos: pertenecen al dueño; se anota qué persona lo usa
alter table public.ov_devices add column if not exists member uuid;

create or replace function public.ov_device_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ov_devices d where d.owner = public.ov_owner() and d.id = public.ov_device_id() and d.removed_at is null);
$$;
create or replace function public.ov_my_scope() returns text
language sql stable security definer set search_path = public as $$
  select d.scope from public.ov_devices d where d.owner = public.ov_owner() and d.id = public.ov_device_id() and d.removed_at is null;
$$;
create or replace function public.ov_device_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.ov_devices where owner = public.ov_owner() and id = public.ov_device_id() and removed_at is null) then '{"ok":true}'::jsonb
    when exists (select 1 from public.ov_devices where owner = public.ov_owner() and id = public.ov_device_id()) then (select jsonb_build_object('ok', false, 'revoked', true, 'by', coalesce(removed_by, 'user')) from public.ov_devices where owner = public.ov_owner() and id = public.ov_device_id())
    else '{"ok":false,"unknown":true}'::jsonb end;
$$;

create or replace function public.ov_device_register(p_id text, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public.ov_owner(); me uuid := auth.uid(); lim int; n int; acc public.ov_accounts; gone public.ov_devices; sc text; mem public.ov_members; forced text;
begin
  if me is null then return jsonb_build_object('ok', false, 'msg', 'Sin sesión.'); end if;
  if p_id !~ '^[A-Za-z0-9_-]{12,64}$' then return jsonb_build_object('ok', false, 'msg', 'Equipo inválido.'); end if;
  select * into mem from public.ov_members where member = me and active;
  if not found and exists (select 1 from public.ov_members where member = me and not active) then
    return jsonb_build_object('ok', false, 'revoked', true, 'by', 'owner', 'member_off', true);
  end if;
  /* las personas del equipo quedan fijas en su consultorio (la administración sin consultorio ve todo) */
  forced := case when mem.member is null then null when mem.sede is not null then 'sede:' || mem.sede when mem.role = 'admin' then 'todo' else null end;
  perform pg_advisory_xact_lock(hashtext('ovdev' || uid::text));
  select * into acc from public.ov_accounts where owner = uid;
  if mem.member is not null then update public.ov_members set last_seen = now() where member = me; end if;
  if exists (select 1 from public.ov_devices where owner = uid and id = p_id and removed_at is null) then
    update public.ov_devices set last_seen = now(), name = left(coalesce(p_name, name), 60), member = me,
      scope = case when mem.member is not null then forced else scope end
    where owner = uid and id = p_id returning scope into sc;
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
  insert into public.ov_devices (owner, id, name, member, scope, scope_by, scope_at) values (uid, p_id, left(p_name, 60), me, forced, case when forced is not null then 'equipo' end, case when forced is not null then now() end);
  if mem.member is null and acc.plan = 'prueba' and acc.paid_until is null and exists (select 1 from public.ov_devices d where d.id = p_id and d.owner <> uid) then
    update public.ov_accounts set flags = 'prueba desde un equipo ya usado por otra cuenta' where owner = uid and flags is null;
  end if;
  return jsonb_build_object('ok', true, 'scope', forced, 'empresa', coalesce(acc.empresa, false));
end $$;

create or replace function public.ov_device_list() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('limit', (public.ov_limits()->>'devices')::int, 'plan', public.ov_limits()->>'plan', 'me', public.ov_device_id(), 'my_scope', public.ov_my_scope(),
    'empresa', (select coalesce(empresa, false) from public.ov_accounts where owner = public.ov_owner()),
    'removals_left', greatest(0, 4 - (select count(*) from public.ov_devices where owner = public.ov_owner() and coalesce(removed_by, 'user') = 'user' and removed_at > now() - interval '30 days')),
    'devices', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'last_seen', d.last_seen, 'created_at', d.created_at, 'scope', d.scope,
        'person', (select coalesce(m.name, m.email) from public.ov_members m where m.member = d.member)) order by d.last_seen desc), '[]'::jsonb)
      from public.ov_devices d where d.owner = public.ov_owner() and d.removed_at is null));
$$;

-- los equipos los maneja el dueño (y la administración)
create or replace function public.ov_device_remove(p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public.ov_owner(); n int; emp boolean; rl text := public.ov_role();
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'msg', 'Sin sesión.'); end if;
  if rl not in ('dueno', 'admin') and p_id <> public.ov_device_id() then return jsonb_build_object('ok', false, 'msg', 'Los equipos los desconecta el dueño.'); end if;
  select coalesce(empresa, false) into emp from public.ov_accounts where owner = uid;
  if emp and rl = 'dueno' and coalesce(public.ov_my_scope(), '') <> 'todo' and p_id <> public.ov_device_id() then
    return jsonb_build_object('ok', false, 'msg', 'En modo Empresa, los equipos los desconecta el dueño.');
  end if;
  select count(*) into n from public.ov_devices where owner = uid and coalesce(removed_by, 'user') = 'user' and removed_at > now() - interval '30 days';
  if n >= 4 then return jsonb_build_object('ok', false, 'msg', 'Ya liberaste 4 equipos este mes. Para liberar otro, escribinos a soporte.'); end if;
  update public.ov_devices set removed_at = now(), removed_by = 'user' where owner = uid and id = p_id and removed_at is null;
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.ov_device_scope(p_id text, p_scope text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public.ov_owner(); me text := public.ov_device_id(); my text; cur public.ov_devices; owners int; rl text := public.ov_role();
begin
  if auth.uid() is null or not public.ov_device_ok() then return jsonb_build_object('ok', false, 'msg', 'Este equipo no está habilitado.'); end if;
  if rl <> 'dueno' then return jsonb_build_object('ok', false, 'need_owner', true, 'msg', 'Esto lo maneja el dueño de la cuenta.'); end if;
  if p_scope is not null and p_scope <> 'todo' and p_scope !~ '^sede:[A-Za-z0-9_-]{1,40}$' then return jsonb_build_object('ok', false, 'msg', 'Consultorio inválido.'); end if;
  select * into cur from public.ov_devices where owner = uid and id = p_id and removed_at is null;
  if not found then return jsonb_build_object('ok', false, 'msg', 'Ese equipo no está conectado.'); end if;
  if cur.member is not null and cur.member <> auth.uid() and exists (select 1 from public.ov_members m where m.member = cur.member and m.active) then
    return jsonb_build_object('ok', false, 'msg', 'Ese equipo lo usa una persona del equipo: su consultorio se cambia desde Personal.');
  end if;
  my := public.ov_my_scope();
  select count(*) into owners from public.ov_devices where owner = uid and scope = 'todo' and removed_at is null;
  if coalesce(my, '') = 'todo' then
    if cur.scope = 'todo' and coalesce(p_scope, '') <> 'todo' and owners <= 1 then return jsonb_build_object('ok', false, 'msg', 'Tiene que quedar al menos un equipo del dueño.'); end if;
  elsif p_id = me and cur.scope is null and p_scope like 'sede:%' then
    null;
  elsif owners = 0 and p_id = me and p_scope = 'todo' then
    null;
  else
    return jsonb_build_object('ok', false, 'need_owner', true, 'msg', 'Esto lo tiene que hacer el dueño desde Empresa › Equipos.');
  end if;
  update public.ov_devices set scope = p_scope, scope_by = me, scope_at = now() where owner = uid and id = p_id;
  return jsonb_build_object('ok', true, 'scope', p_scope);
end $$;

create or replace function public.ov_empresa_on() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public.ov_owner(); l jsonb := public.ov_limits(); acc public.ov_accounts; sc text;
begin
  if auth.uid() is null or not public.ov_device_ok() then return jsonb_build_object('ok', false, 'msg', 'Este equipo no está habilitado.'); end if;
  if public.ov_role() <> 'dueno' then return jsonb_build_object('ok', false, 'msg', 'Solo el dueño de la cuenta puede activar el modo Empresa.'); end if;
  if (l->>'centros')::int < 2 then return jsonb_build_object('ok', false, 'plan', true, 'msg', 'El modo Empresa es del plan Empresa.'); end if;
  select * into acc from public.ov_accounts where owner = uid;
  sc := public.ov_my_scope();
  if coalesce(acc.empresa, false) and coalesce(sc, '') <> 'todo' and exists (select 1 from public.ov_devices where owner = uid and scope = 'todo' and removed_at is null) then
    return jsonb_build_object('ok', false, 'msg', 'El modo Empresa ya está activo. Pedile al dueño que habilite este equipo.');
  end if;
  update public.ov_accounts set empresa = true where owner = uid;
  update public.ov_devices set scope = 'todo', scope_by = 'empresa_on', scope_at = now() where owner = uid and id = public.ov_device_id();
  return jsonb_build_object('ok', true, 'scope', 'todo');
end $$;
create or replace function public.ov_empresa_off() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.ov_role() <> 'dueno' or coalesce(public.ov_my_scope(), '') <> 'todo' then return jsonb_build_object('ok', false, 'msg', 'Solo desde un equipo del dueño.'); end if;
  update public.ov_accounts set empresa = false where owner = public.ov_owner();
  return jsonb_build_object('ok', true);
end $$;

-- 2) qué datos puede leer o escribir esta sesión
create or replace function public.ov_key_ok(p_k text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare emp boolean; sc text; rl text := public.ov_role(); ms text;
begin
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

-- escritura: límites del plan y lo que cada puesto puede cambiar
create or replace function public.ov_rec_ok(p_k text, p_v jsonb) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare l jsonb := public.ov_limits(); rl text := public.ov_role();
begin
  if rl <> 'dueno' and p_k = 'setup' then return false; end if;
  if rl in ('recepcion', 'profesional', 'asistente') and p_k in ('cfg', 'pros', 'staff') then return false; end if;
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

-- los datos de la cuenta: de quien sea el dueño de la sesión
alter table public.ov_records alter column owner set default public.ov_owner();
create or replace function public.ov_touch() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := clock_timestamp();
  if tg_op = 'UPDATE' then
    new.rev := old.rev + 1;
    new.owner := old.owner;
    new.k := old.k;
  else
    new.rev := 1;
    new.owner := public.ov_owner();
  end if;
  return new;
end $$;
drop policy if exists "ov_records_read" on public.ov_records;
drop policy if exists "ov_records_insert" on public.ov_records;
drop policy if exists "ov_records_update" on public.ov_records;
create policy "ov_records_read" on public.ov_records for select to authenticated using (owner = (select public.ov_owner()) and public.ov_device_ok() and public.ov_key_ok(k));
create policy "ov_records_insert" on public.ov_records for insert to authenticated with check (owner = (select public.ov_owner()) and public.ov_is_active() and public.ov_device_ok() and public.ov_key_ok(k) and public.ov_rec_ok(k, v));
create policy "ov_records_update" on public.ov_records for update to authenticated using (owner = (select public.ov_owner()) and public.ov_device_ok() and public.ov_key_ok(k)) with check (owner = (select public.ov_owner()) and public.ov_is_active() and public.ov_device_ok() and public.ov_key_ok(k) and public.ov_rec_ok(k, v));
drop policy if exists "ov_history_read_own" on public.ov_history;
create policy "ov_history_read_own" on public.ov_history for select to authenticated using (owner = (select public.ov_owner()) and public.ov_device_ok() and public.ov_key_ok(k));

-- fotos: en la carpeta del dueño
drop policy if exists "ov_media_read" on storage.objects;
drop policy if exists "ov_media_insert" on storage.objects;
drop policy if exists "ov_media_update" on storage.objects;
drop policy if exists "ov_media_delete" on storage.objects;
create policy "ov_media_read" on storage.objects for select to authenticated
  using (bucket_id = 'ov-media' and (storage.foldername(name))[1] = (select public.ov_owner())::text);
create policy "ov_media_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'ov-media' and (storage.foldername(name))[1] = (select public.ov_owner())::text and public.ov_is_active());
create policy "ov_media_update" on storage.objects for update to authenticated
  using (bucket_id = 'ov-media' and (storage.foldername(name))[1] = (select public.ov_owner())::text)
  with check (bucket_id = 'ov-media' and (storage.foldername(name))[1] = (select public.ov_owner())::text and public.ov_is_active());
create policy "ov_media_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'ov-media' and (storage.foldername(name))[1] = (select public.ov_owner())::text and public.ov_role() in ('dueno', 'admin'));

-- turnero online: lo actualiza cualquier equipo de la cuenta (los horarios libres cambian con la agenda)
drop policy if exists "ov_booking_own" on public.ov_booking;
drop policy if exists "ov_booking_read" on public.ov_booking;
drop policy if exists "ov_booking_write" on public.ov_booking;
create policy "ov_booking_own" on public.ov_booking for all to authenticated using (owner = public.ov_owner()) with check (owner = public.ov_owner());
drop policy if exists "ov_booking_req_own" on public.ov_booking_req;
create policy "ov_booking_req_own" on public.ov_booking_req for all to authenticated using (owner = public.ov_owner()) with check (owner = public.ov_owner());
create or replace function public.ov_booking_claim() returns setof public.ov_booking_req
language sql security definer set search_path = public as $$
  update public.ov_booking_req set status = 'cargado' where owner = public.ov_owner() and status = 'nuevo' returning *;
$$;

-- borrar mis datos: solo el dueño
create or replace function public.ov_delete_my_data() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  if public.ov_role() <> 'dueno' then raise exception 'solo el dueño de la cuenta puede borrar los datos'; end if;
  delete from public.ov_records where owner = auth.uid();
  delete from public.ov_history where owner = auth.uid();
end $$;

-- 3) quién soy: el plan del dueño y mi puesto (la app lo usa al abrir)
create or replace function public.ov_whoami() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'me', auth.uid(), 'owner', public.ov_owner(), 'role', public.ov_role(),
    'member', (select jsonb_build_object('role', m.role, 'sede', m.sede, 'pro', m.pro, 'name', m.name, 'email', m.email) from public.ov_members m where m.member = auth.uid() and m.active),
    'member_off', exists (select 1 from public.ov_members m where m.member = auth.uid() and not m.active),
    'account', (select to_jsonb(a) - 'notes' - 'flags' from public.ov_accounts a where a.owner = public.ov_owner()));
$$;
revoke all on function public.ov_whoami() from public, anon;
grant execute on function public.ov_whoami() to authenticated;

-- 4) invitaciones (las crea el dueño)
create or replace function public.ov_invite_create(p_role text, p_sede text, p_pro text, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); code text; al constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; n int;
begin
  if uid is null or public.ov_role() <> 'dueno' then return jsonb_build_object('ok', false, 'msg', 'Solo el dueño de la cuenta puede invitar.'); end if;
  if p_role not in ('admin', 'recepcion', 'profesional', 'asistente') then return jsonb_build_object('ok', false, 'msg', 'Puesto inválido.'); end if;
  if p_sede is not null and p_sede !~ '^[A-Za-z0-9_-]{1,40}$' then return jsonb_build_object('ok', false, 'msg', 'Consultorio inválido.'); end if;
  select count(*) into n from public.ov_invites where owner = uid and created_at > now() - interval '1 day';
  if n >= 30 then return jsonb_build_object('ok', false, 'msg', 'Demasiadas invitaciones hoy. Probá mañana.'); end if;
  code := (select string_agg(substr(al, 1 + floor(random() * length(al))::int, 1), '') from generate_series(1, 10));
  insert into public.ov_invites (code, owner, role, sede, pro, name) values (code, uid, p_role, nullif(p_sede, ''), nullif(p_pro, ''), left(p_name, 80));
  return jsonb_build_object('ok', true, 'code', code, 'expires_at', now() + interval '7 days');
end $$;
revoke all on function public.ov_invite_create(text, text, text, text) from public, anon;
grant execute on function public.ov_invite_create(text, text, text, text) to authenticated;

-- datos de una invitación para mostrar antes de registrarse (sin datos de pacientes)
create or replace function public.ov_invite_info(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare inv public.ov_invites; st jsonb; cf jsonb; sede_name text;
begin
  select * into inv from public.ov_invites where code = upper(trim(coalesce(p_code, '')));
  if not found or inv.revoked then return jsonb_build_object('ok', false, 'msg', 'La invitación no existe o fue cancelada.'); end if;
  if inv.used_by is not null then return jsonb_build_object('ok', false, 'used', true, 'msg', 'Esa invitación ya se usó. Si sos vos, ingresá con tu correo y contraseña.'); end if;
  if inv.expires_at < now() then return jsonb_build_object('ok', false, 'msg', 'La invitación venció. Pedile una nueva a quien te invitó.'); end if;
  select v into st from public.ov_records where owner = inv.owner and k = 'setup';
  select v into cf from public.ov_records where owner = inv.owner and k = 'cfg';
  if inv.sede is not null and cf is not null and jsonb_typeof(cf->'locs') = 'array' then
    select x->>'name' into sede_name from jsonb_array_elements(cf->'locs') x where x->>'id' = inv.sede limit 1;
  end if;
  return jsonb_build_object('ok', true, 'role', inv.role, 'name', inv.name, 'sede', inv.sede, 'sede_name', sede_name,
    'clinic', coalesce(st->>'clinic', cf->>'clinic', cf->>'name'), 'expires_at', inv.expires_at);
end $$;
revoke all on function public.ov_invite_info(text) from public;
grant execute on function public.ov_invite_info(text) to anon, authenticated;

-- aceptar una invitación con un usuario que ya existe (sin datos propios)
create or replace function public.ov_invite_accept(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare em text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'msg', 'Ingresá primero.'); end if;
  select email into em from auth.users where id = auth.uid();
  return public.ov_join_invite(auth.uid(), em, p_code);
end $$;
revoke all on function public.ov_invite_accept(text) from public, anon;
grant execute on function public.ov_invite_accept(text) to authenticated;

-- el dueño ve su equipo y las invitaciones
create or replace function public.ov_team() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.ov_role() not in ('dueno', 'admin') then '{"ok":false}'::jsonb else jsonb_build_object('ok', true,
    'members', (select coalesce(jsonb_agg(jsonb_build_object('member', m.member, 'role', m.role, 'sede', m.sede, 'pro', m.pro, 'name', m.name, 'email', m.email, 'active', m.active, 'created_at', m.created_at, 'last_seen', m.last_seen,
        'devices', (select count(*) from public.ov_devices d where d.owner = m.owner and d.member = m.member and d.removed_at is null)) order by m.active desc, m.created_at), '[]'::jsonb)
      from public.ov_members m where m.owner = public.ov_owner()),
    'invites', (select coalesce(jsonb_agg(jsonb_build_object('code', i.code, 'role', i.role, 'sede', i.sede, 'pro', i.pro, 'name', i.name, 'created_at', i.created_at, 'expires_at', i.expires_at) order by i.created_at desc), '[]'::jsonb)
      from public.ov_invites i where i.owner = public.ov_owner() and i.used_by is null and not i.revoked and i.expires_at > now())) end;
$$;
revoke all on function public.ov_team() from public, anon;
grant execute on function public.ov_team() to authenticated;

-- cambiar el puesto o el consultorio de una persona, o quitarle el acceso (desconecta sus equipos)
create or replace function public.ov_member_set(p_member uuid, p_role text, p_sede text, p_pro text, p_active boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m public.ov_members;
begin
  if uid is null or public.ov_role() <> 'dueno' then return jsonb_build_object('ok', false, 'msg', 'Solo el dueño de la cuenta.'); end if;
  select * into m from public.ov_members where member = p_member and owner = uid;
  if not found then return jsonb_build_object('ok', false, 'msg', 'Esa persona no es de tu equipo.'); end if;
  if p_role is not null and p_role not in ('admin', 'recepcion', 'profesional', 'asistente') then return jsonb_build_object('ok', false, 'msg', 'Puesto inválido.'); end if;
  update public.ov_members set role = coalesce(p_role, role), sede = case when p_sede is null then sede when p_sede = '' then null else p_sede end, pro = case when p_pro is null then pro when p_pro = '' then null else p_pro end,
    active = coalesce(p_active, active), removed_at = case when p_active is false then now() when p_active is true then null else removed_at end
  where member = p_member;
  if p_active is false then
    update public.ov_devices set removed_at = now(), removed_by = 'owner' where owner = uid and member = p_member and removed_at is null;
  else
    /* el consultorio nuevo se aplica a sus equipos */
    update public.ov_devices d set scope = case when mm.sede is not null then 'sede:' || mm.sede when mm.role = 'admin' then 'todo' else null end
    from public.ov_members mm where mm.member = p_member and d.owner = uid and d.member = p_member and d.removed_at is null;
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.ov_member_set(uuid, text, text, text, boolean) from public, anon;
grant execute on function public.ov_member_set(uuid, text, text, text, boolean) to authenticated;

create or replace function public.ov_invite_revoke(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.ov_role() <> 'dueno' then return jsonb_build_object('ok', false); end if;
  update public.ov_invites set revoked = true where code = p_code and owner = auth.uid();
  return jsonb_build_object('ok', found);
end $$;
revoke all on function public.ov_invite_revoke(text) from public, anon;
grant execute on function public.ov_invite_revoke(text) to authenticated;

-- al borrar una cuenta desde el panel, también su equipo
create or replace function public.ov_admin_delete_account(p_owner uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.ov_is_admin() then raise exception 'solo administradores'; end if;
  if exists (select 1 from public.ov_admins where user_id = p_owner) then raise exception 'no se puede borrar una cuenta de administrador'; end if;
  delete from public.ov_records where owner = p_owner;
  delete from public.ov_history where owner = p_owner;
  delete from public.ov_booking_req where owner = p_owner;
  delete from public.ov_booking where owner = p_owner;
  delete from public.ov_devices where owner = p_owner;
  delete from public.ov_invites where owner = p_owner;
  delete from public.ov_members where owner = p_owner;
  update public.ov_requests set status = 'hecho', done_at = now() where owner = p_owner and kind = 'eliminar' and status <> 'hecho';
  delete from public.ov_accounts where owner = p_owner;
  delete from auth.users where id = p_owner;
end $$;
