-- OdontoVoz 1.34 · una cuenta en varios lugares (vincularse a otros consultorios con la misma cuenta)
-- Una persona puede ser dueña de su consultorio y, a la vez, profesional (u otro puesto) en los
-- consultorios de otros dueños que la invitan. El equipo elige el lugar con el encabezado «x-ov-owner».
-- Se corre una vez en Supabase › SQL Editor › Run. Se puede volver a correr sin problema.

-- 0) una persona puede estar en varios equipos: la clave pasa a ser (persona, dueño)
do $$ begin
  if exists (select 1 from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
             where c.conname = 'ov_members_pkey' and c.conrelid = 'public.ov_members'::regclass group by c.conname having count(*) = 1) then
    alter table public.ov_members drop constraint ov_members_pkey;
    alter table public.ov_members add constraint ov_members_pkey primary key (member, owner);
  end if;
end $$;
create index if not exists ov_members_member on public.ov_members (member);

-- 1) qué lugar pidió el equipo (si es válido para esta persona)
create or replace function public.ov_place_hdr() returns uuid
language plpgsql stable as $$
declare h text := coalesce(nullif(current_setting('request.headers', true), '')::json->>'x-ov-owner', '');
begin
  if h ~ '^[0-9a-fA-F-]{36}$' then return h::uuid; end if;
  return null;
end $$;

-- el dueño de los datos con los que se trabaja ahora
create or replace function public.ov_owner() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select h from (select public.ov_place_hdr() as h) x
      where h is not null and (h = auth.uid() or exists (select 1 from public.ov_members m where m.member = auth.uid() and m.owner = h and m.active))),
    (select auth.uid() where exists (select 1 from public.ov_accounts a where a.owner = auth.uid())),
    (select m.owner from public.ov_members m where m.member = auth.uid() and m.active order by m.created_at limit 1),
    auth.uid());
$$;
grant execute on function public.ov_owner() to authenticated, anon;

create or replace function public.ov_role() returns text
language sql stable security definer set search_path = public as $$
  select case when public.ov_owner() = auth.uid() then 'dueno'
    else coalesce((select m.role from public.ov_members m where m.member = auth.uid() and m.owner = public.ov_owner() and m.active), 'dueno') end;
$$;
grant execute on function public.ov_role() to authenticated;

create or replace function public.ov_member_sede() returns text
language sql stable security definer set search_path = public as $$
  select m.sede from public.ov_members m where m.member = auth.uid() and m.owner = public.ov_owner() and m.active;
$$;
grant execute on function public.ov_member_sede() to authenticated;

-- 2) aceptar una invitación con la cuenta que ya se tiene (aunque tenga su propio consultorio)
create or replace function public.ov_join_invite(p_uid uuid, p_email text, p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv public.ov_invites;
begin
  select * into inv from public.ov_invites where code = upper(trim(coalesce(p_code, ''))) for update;
  if not found or inv.revoked then return jsonb_build_object('ok', false, 'msg', 'La invitación no existe o fue cancelada.'); end if;
  if inv.used_by is not null and inv.used_by <> p_uid then return jsonb_build_object('ok', false, 'msg', 'Esa invitación ya se usó.'); end if;
  if inv.expires_at < now() then return jsonb_build_object('ok', false, 'msg', 'La invitación venció. Pedile una nueva a quien te invitó.'); end if;
  if inv.owner = p_uid then return jsonb_build_object('ok', false, 'msg', 'No te podés invitar a vos mismo.'); end if;
  insert into public.ov_members (member, owner, role, sede, pro, name, email, active, removed_at)
  values (p_uid, inv.owner, inv.role, inv.sede, inv.pro, inv.name, p_email, true, null)
  on conflict (member, owner) do update set role = excluded.role, sede = excluded.sede, pro = excluded.pro, name = excluded.name, email = excluded.email, active = true, removed_at = null;
  update public.ov_invites set used_by = p_uid, used_at = now() where code = inv.code;
  /* una prueba propia recién creada y sin usar se quita (la persona trabaja en la cuenta del dueño) */
  if not exists (select 1 from public.ov_records where owner = p_uid) and not exists (select 1 from public.ov_members where owner = p_uid) then
    delete from public.ov_accounts where owner = p_uid and paid_until is null and plan = 'prueba' and created_at > now() - interval '1 day';
  end if;
  return jsonb_build_object('ok', true, 'owner', inv.owner);
end $$;
revoke all on function public.ov_join_invite(uuid, text, text) from public, anon, authenticated;

-- 3) dejar un lugar (lo hace la persona; el dueño lo hace con «Quitar acceso»)
create or replace function public.ov_leave(p_owner uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false); end if;
  update public.ov_members set active = false, removed_at = now() where member = auth.uid() and owner = p_owner;
  ok := found;
  update public.ov_devices set removed_at = now(), removed_by = 'member' where owner = p_owner and member = auth.uid() and removed_at is null;
  return jsonb_build_object('ok', ok);
end $$;
revoke all on function public.ov_leave(uuid) from public, anon;
grant execute on function public.ov_leave(uuid) to authenticated;

-- 4) quién soy, dónde estoy y en qué lugares puedo trabajar
create or replace function public.ov_whoami() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'me', auth.uid(), 'owner', public.ov_owner(), 'role', public.ov_role(),
    'member', (select jsonb_build_object('role', m.role, 'sede', m.sede, 'pro', m.pro, 'name', m.name, 'email', m.email, 'username', m.username, 'sub', m.sub) from public.ov_members m where m.member = auth.uid() and m.owner = public.ov_owner() and m.active),
    'member_off', (public.ov_owner() = auth.uid() and not exists (select 1 from public.ov_accounts where owner = auth.uid()) and exists (select 1 from public.ov_members m where m.member = auth.uid() and not m.active) and not exists (select 1 from public.ov_members m where m.member = auth.uid() and m.active)),
    'code', (select a.code from public.ov_accounts a where a.owner = public.ov_owner()),
    'account', (select to_jsonb(a) - 'notes' - 'flags' from public.ov_accounts a where a.owner = public.ov_owner()),
    'places', (select coalesce(jsonb_agg(p order by (p->>'mine')::boolean desc, p->>'clinic'), '[]'::jsonb) from (
        select jsonb_build_object('owner', a.owner, 'mine', true, 'role', 'dueno', 'clinic', coalesce((select r.v->>'clinic' from public.ov_records r where r.owner = a.owner and r.k = 'setup'), 'Mi consultorio')) p
          from public.ov_accounts a where a.owner = auth.uid()
        union all
        select jsonb_build_object('owner', m.owner, 'mine', false, 'role', m.role, 'sede', m.sede, 'pro', m.pro, 'sub', m.sub,
            'clinic', coalesce((select r.v->>'clinic' from public.ov_records r where r.owner = m.owner and r.k = 'setup'), (select a.email from public.ov_accounts a where a.owner = m.owner)))
          from public.ov_members m where m.member = auth.uid() and m.active) q));
$$;
revoke all on function public.ov_whoami() from public, anon;
grant execute on function public.ov_whoami() to authenticated;

-- 5) mis turnos en los otros lugares donde atiendo (solo hora, paciente y estado; para verlos en mi agenda)
create or replace function public.ov_ext_agenda(p_from date, p_to date) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('owner', m.owner, 'date', substr(r.k, 5), 'start', a->'start', 'dur', a->'dur', 'status', a->>'status', 'sobre', a->'sobre',
      'name', (select p->>'name' from public.ov_records pr, jsonb_array_elements(case when jsonb_typeof(pr.v) = 'array' then pr.v else '[]'::jsonb end) p where pr.owner = m.owner and pr.k = 'pats' and p->>'id' = a->>'pid' limit 1),
      'motivo', left(coalesce(a->>'motivo', a->>'note', ''), 60)) order by r.k, (a->>'start')::int), '[]'::jsonb)
  from public.ov_members m
  join public.ov_records r on r.owner = m.owner and r.k between 'day:' || p_from::text and 'day:' || p_to::text and jsonb_typeof(r.v) = 'array'
  cross join lateral jsonb_array_elements(r.v) a
  where auth.uid() is not null and p_to - p_from <= 62 and m.member = auth.uid() and m.active and m.pro is not null and m.owner <> public.ov_owner()
    and a->>'pro' = m.pro and coalesce(a->>'type', '') <> 'block' and coalesce(a->>'status', '') not in ('cancelado', 'ausente');
$$;
revoke all on function public.ov_ext_agenda(date, date) from public, anon;
grant execute on function public.ov_ext_agenda(date, date) to authenticated;

-- 6) equipos: la persona puede tener el mismo celular en varios lugares
create or replace function public.ov_device_register(p_id text, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public.ov_owner(); me uuid := auth.uid(); lim int; n int; acc public.ov_accounts; gone public.ov_devices; sc text; mem public.ov_members; forced text;
begin
  if me is null then return jsonb_build_object('ok', false, 'msg', 'Sin sesión.'); end if;
  if p_id !~ '^[A-Za-z0-9_-]{12,64}$' then return jsonb_build_object('ok', false, 'msg', 'Equipo inválido.'); end if;
  if uid <> me then
    select * into mem from public.ov_members where member = me and owner = uid and active;
    if not found then return jsonb_build_object('ok', false, 'revoked', true, 'by', 'owner', 'member_off', true); end if;
  end if;
  forced := case when mem.member is null then null when mem.sede is not null then 'sede:' || mem.sede when mem.role = 'admin' then 'todo' else null end;
  perform pg_advisory_xact_lock(hashtext('ovdev' || uid::text));
  select * into acc from public.ov_accounts where owner = uid;
  if mem.member is not null then update public.ov_members set last_seen = now() where member = me and owner = uid; end if;
  if exists (select 1 from public.ov_devices where owner = uid and id = p_id and removed_at is null) then
    update public.ov_devices set last_seen = now(), name = left(coalesce(p_name, name), 60), member = me,
      scope = case when mem.member is not null then forced else scope end
    where owner = uid and id = p_id returning scope into sc;
    return jsonb_build_object('ok', true, 'scope', sc, 'empresa', coalesce(acc.empresa, false));
  end if;
  select * into gone from public.ov_devices where owner = uid and id = p_id and removed_at is not null;
  if found and not (gone.removed_by = 'member' and mem.member is not null) then return jsonb_build_object('ok', false, 'revoked', true, 'by', coalesce(gone.removed_by, 'user'), 'at', gone.removed_at); end if;
  lim := (public.ov_limits(uid)->>'devices')::int;
  select count(*) into n from public.ov_devices where owner = uid and removed_at is null;
  if n >= lim then
    return jsonb_build_object('ok', false, 'full', true, 'limit', lim, 'plan', public.ov_limits(uid)->>'plan',
      'devices', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'last_seen', last_seen) order by last_seen desc), '[]'::jsonb) from public.ov_devices where owner = uid and removed_at is null));
  end if;
  if found then delete from public.ov_devices where owner = uid and id = p_id; end if;
  insert into public.ov_devices (owner, id, name, member, scope, scope_by, scope_at) values (uid, p_id, left(p_name, 60), me, forced, case when forced is not null then 'equipo' end, case when forced is not null then now() end);
  if mem.member is null and acc.plan = 'prueba' and acc.paid_until is null
     and exists (select 1 from public.ov_devices d where d.id = p_id and d.owner <> uid and d.owner not in (select owner from public.ov_members where member = me)) then
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
        'person', (select coalesce(m.name, m.email) from public.ov_members m where m.member = d.member and m.owner = d.owner)) order by d.last_seen desc), '[]'::jsonb)
      from public.ov_devices d where d.owner = public.ov_owner() and d.removed_at is null));
$$;

-- 7) cambiar el puesto o quitar el acceso: solo en el equipo de este dueño
create or replace function public.ov_member_set(p_member uuid, p_role text, p_sede text, p_pro text, p_active boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m public.ov_members;
begin
  if uid is null or public.ov_role() <> 'dueno' or public.ov_owner() <> uid then return jsonb_build_object('ok', false, 'msg', 'Solo el dueño de la cuenta.'); end if;
  select * into m from public.ov_members where member = p_member and owner = uid;
  if not found then return jsonb_build_object('ok', false, 'msg', 'Esa persona no es de tu equipo.'); end if;
  if p_role is not null and p_role not in ('admin', 'recepcion', 'profesional', 'asistente') then return jsonb_build_object('ok', false, 'msg', 'Puesto inválido.'); end if;
  update public.ov_members set role = coalesce(p_role, role), sede = case when p_sede is null then sede when p_sede = '' then null else p_sede end, pro = case when p_pro is null then pro when p_pro = '' then null else p_pro end,
    active = coalesce(p_active, active), removed_at = case when p_active is false then now() when p_active is true then null else removed_at end
  where member = p_member and owner = uid;
  if p_active is false then
    update public.ov_devices set removed_at = now(), removed_by = 'owner' where owner = uid and member = p_member and removed_at is null;
  else
    update public.ov_devices d set scope = case when mm.sede is not null then 'sede:' || mm.sede when mm.role = 'admin' then 'todo' else null end
    from public.ov_members mm where mm.member = p_member and mm.owner = uid and d.owner = uid and d.member = p_member and d.removed_at is null;
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.ov_member_set(uuid, text, text, text, boolean) from public, anon;
grant execute on function public.ov_member_set(uuid, text, text, text, boolean) to authenticated;

-- 8) en el registro de equipos: la persona del equipo de este dueño
do $$ begin
  if exists (select 1 from pg_proc where proname = 'ov_device_scope') then
    execute replace(pg_get_functiondef('public.ov_device_scope(text,text)'::regprocedure),
      'where m.member = cur.member and m.active', 'where m.member = cur.member and m.owner = uid and m.active');
  end if;
end $$;
