-- ============================================================================
-- OdontoVoz 1.25 · «Dueño/a (socio/a)»: una persona del equipo con puesto Administración
-- que además maneja el equipo (crea usuarios y administradores, cambia puestos, quita accesos),
-- igual que el dueño de la cuenta. El plan, el cobro y el cambio de cuenta siguen siendo del dueño.
-- Correr UNA vez en Supabase › SQL Editor (después de equipo.sql, subusuarios.sql y vinculos.sql).
-- ============================================================================
alter table public.ov_members add column if not exists socio boolean not null default false;

-- ¿quien está usando la app es socio/a del dueño?
create or replace function public.ov_is_socio() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ov_members m where m.member = auth.uid() and m.owner = public.ov_owner() and m.active and m.role = 'admin' and m.socio);
$$;
grant execute on function public.ov_is_socio() to authenticated;

-- marcar o desmarcar a alguien como socio/a (lo hace el dueño o un socio)
create or replace function public.ov_member_socio(p_member uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); o uuid := public.ov_owner();
begin
  if uid is null or not ((public.ov_role() = 'dueno' and o = uid) or public.ov_is_socio()) then return jsonb_build_object('ok', false, 'msg', 'Solo el dueño o un socio.'); end if;
  if not exists (select 1 from public.ov_members where member = p_member and owner = o) then return jsonb_build_object('ok', false, 'msg', 'Esa persona no es de tu equipo.'); end if;
  update public.ov_members set socio = coalesce(p_on, false), role = case when coalesce(p_on, false) then 'admin' else role end where member = p_member and owner = o;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.ov_member_socio(uuid, boolean) from public, anon;
grant execute on function public.ov_member_socio(uuid, boolean) to authenticated;

-- crear usuarios: un socio también puede crear administradores
create or replace function public.ov_sub_create(p_name text, p_user text, p_pass text, p_role text, p_sede text, p_pro text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare o uuid := public.ov_owner(); r text := public.ov_role(); u text := lower(trim(coalesce(p_user, ''))); c text; em text; nid uuid := gen_random_uuid(); n int;
begin
  if auth.uid() is null or r not in ('dueno', 'admin') then return jsonb_build_object('ok', false, 'msg', 'Solo el dueño o un administrador pueden crear usuarios.'); end if;
  if r = 'admin' and p_role = 'admin' and not public.ov_is_socio() then return jsonb_build_object('ok', false, 'msg', 'Solo el dueño puede crear administradores.'); end if;
  if p_role not in ('admin', 'recepcion', 'profesional', 'asistente') then return jsonb_build_object('ok', false, 'msg', 'Puesto inválido.'); end if;
  if u !~ '^[a-z0-9]([a-z0-9._-]{1,28}[a-z0-9])$' or u ~ '\.\.' then return jsonb_build_object('ok', false, 'msg', 'El usuario lleva de 3 a 30 letras minúsculas, números, punto, guion o guion bajo (ej.: juan.perez).'); end if;
  if length(coalesce(p_pass, '')) < 6 then return jsonb_build_object('ok', false, 'msg', 'La contraseña necesita al menos 6 caracteres.'); end if;
  if p_sede is not null and p_sede <> '' and p_sede !~ '^[A-Za-z0-9_-]{1,40}$' then return jsonb_build_object('ok', false, 'msg', 'Centro inválido.'); end if;
  select count(*) into n from public.ov_members where owner = o and created_at > now() - interval '1 day';
  if n >= 40 then return jsonb_build_object('ok', false, 'msg', 'Demasiados usuarios nuevos hoy. Probá mañana.'); end if;
  c := public.ov_code_ensure(o);
  em := public.ov_sub_email(c, u);
  if exists (select 1 from auth.users where email = em) then return jsonb_build_object('ok', false, 'msg', 'Ya existe el usuario «' || u || '» en esta cuenta.'); end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', nid, 'authenticated', 'authenticated', em, crypt(p_pass, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('ov_sub', o, 'name', left(coalesce(p_name, ''), 80)), now(), now(), '', '', '', '');
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), nid::text, nid, jsonb_build_object('sub', nid::text, 'email', em, 'email_verified', true), 'email', now(), now(), now());

  insert into public.ov_members (member, owner, role, sede, pro, name, email, username, sub, active)
  values (nid, o, p_role, nullif(p_sede, ''), nullif(p_pro, ''), left(coalesce(p_name, u), 80), em, u, true, true);
  return jsonb_build_object('ok', true, 'member', nid, 'code', c, 'user', u);
end $$;
revoke all on function public.ov_sub_create(text, text, text, text, text, text) from public, anon;
grant execute on function public.ov_sub_create(text, text, text, text, text, text) to authenticated;

-- cambiar el puesto o quitar el acceso: el dueño o un socio, solo en el equipo del dueño
create or replace function public.ov_member_set(p_member uuid, p_role text, p_sede text, p_pro text, p_active boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); o uuid := public.ov_owner(); m public.ov_members;
begin
  if uid is null or not ((public.ov_role() = 'dueno' and o = uid) or public.ov_is_socio()) then return jsonb_build_object('ok', false, 'msg', 'Solo el dueño de la cuenta o un socio.'); end if;
  select * into m from public.ov_members where member = p_member and owner = o;
  if not found then return jsonb_build_object('ok', false, 'msg', 'Esa persona no es de tu equipo.'); end if;
  if p_role is not null and p_role not in ('admin', 'recepcion', 'profesional', 'asistente') then return jsonb_build_object('ok', false, 'msg', 'Puesto inválido.'); end if;
  update public.ov_members set role = coalesce(p_role, role), socio = case when p_role is not null and p_role <> 'admin' then false else socio end,
    sede = case when p_sede is null then sede when p_sede = '' then null else p_sede end, pro = case when p_pro is null then pro when p_pro = '' then null else p_pro end,
    active = coalesce(p_active, active), removed_at = case when p_active is false then now() when p_active is true then null else removed_at end
  where member = p_member and owner = o;
  if p_active is false then
    update public.ov_devices set removed_at = now(), removed_by = 'owner' where owner = o and member = p_member and removed_at is null;
  else
    update public.ov_devices d set scope = case when mm.sede is not null then 'sede:' || mm.sede when mm.role = 'admin' then 'todo' else null end
    from public.ov_members mm where mm.member = p_member and mm.owner = o and d.owner = o and d.member = p_member and d.removed_at is null;
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.ov_member_set(uuid, text, text, text, boolean) from public, anon;
grant execute on function public.ov_member_set(uuid, text, text, text, boolean) to authenticated;

-- el equipo: ahora cada persona dice si es socia
create or replace function public.ov_team() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.ov_role() not in ('dueno', 'admin') then '{"ok":false}'::jsonb else jsonb_build_object('ok', true,
    'code', (select a.code from public.ov_accounts a where a.owner = public.ov_owner()),
    'socio', public.ov_is_socio(),
    'members', (select coalesce(jsonb_agg(jsonb_build_object('member', m.member, 'role', m.role, 'socio', m.socio, 'sede', m.sede, 'pro', m.pro, 'name', m.name, 'email', case when m.sub then null else m.email end, 'username', m.username, 'sub', m.sub, 'active', m.active, 'created_at', m.created_at, 'last_seen', m.last_seen,
        'devices', (select count(*) from public.ov_devices d where d.owner = m.owner and d.member = m.member and d.removed_at is null)) order by m.active desc, m.created_at), '[]'::jsonb)
      from public.ov_members m where m.owner = public.ov_owner()),
    'invites', (select coalesce(jsonb_agg(jsonb_build_object('code', i.code, 'role', i.role, 'sede', i.sede, 'pro', i.pro, 'name', i.name, 'created_at', i.created_at, 'expires_at', i.expires_at) order by i.created_at desc), '[]'::jsonb)
      from public.ov_invites i where i.owner = public.ov_owner() and i.used_by is null and not i.revoked and i.expires_at > now())) end;
$$;
revoke all on function public.ov_team() from public, anon;
grant execute on function public.ov_team() to authenticated;

-- quién soy: también si soy socio/a
create or replace function public.ov_whoami() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'me', auth.uid(), 'owner', public.ov_owner(), 'role', public.ov_role(),
    'member', (select jsonb_build_object('role', m.role, 'socio', m.socio, 'sede', m.sede, 'pro', m.pro, 'name', m.name, 'email', m.email, 'username', m.username, 'sub', m.sub) from public.ov_members m where m.member = auth.uid() and m.owner = public.ov_owner() and m.active),
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

-- el socio también invita por mail, cancela invitaciones y elige el código de la cuenta (todo a nombre de la cuenta del dueño)
create or replace function public.ov_invite_create(p_role text, p_sede text, p_pro text, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); o uuid := public.ov_owner(); code text; al constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; n int;
begin
  if uid is null or not ((public.ov_role() = 'dueno' and o = uid) or public.ov_is_socio()) then return jsonb_build_object('ok', false, 'msg', 'Solo el dueño de la cuenta o un socio puede invitar.'); end if;
  if p_role not in ('admin', 'recepcion', 'profesional', 'asistente') then return jsonb_build_object('ok', false, 'msg', 'Puesto inválido.'); end if;
  if p_sede is not null and p_sede !~ '^[A-Za-z0-9_-]{1,40}$' then return jsonb_build_object('ok', false, 'msg', 'Consultorio inválido.'); end if;
  select count(*) into n from public.ov_invites where owner = o and created_at > now() - interval '1 day';
  if n >= 30 then return jsonb_build_object('ok', false, 'msg', 'Demasiadas invitaciones hoy. Probá mañana.'); end if;
  code := (select string_agg(substr(al, 1 + floor(random() * length(al))::int, 1), '') from generate_series(1, 10));
  insert into public.ov_invites (code, owner, role, sede, pro, name) values (code, o, p_role, nullif(p_sede, ''), nullif(p_pro, ''), left(p_name, 80));
  return jsonb_build_object('ok', true, 'code', code, 'expires_at', now() + interval '7 days');
end $$;
revoke all on function public.ov_invite_create(text, text, text, text) from public, anon;
grant execute on function public.ov_invite_create(text, text, text, text) to authenticated;

create or replace function public.ov_invite_revoke(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o uuid := public.ov_owner();
begin
  if auth.uid() is null or not ((public.ov_role() = 'dueno' and o = auth.uid()) or public.ov_is_socio()) then return jsonb_build_object('ok', false); end if;
  update public.ov_invites set revoked = true where code = p_code and owner = o;
  return jsonb_build_object('ok', found);
end $$;
revoke all on function public.ov_invite_revoke(text) from public, anon;
grant execute on function public.ov_invite_revoke(text) to authenticated;

create or replace function public.ov_code_set(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text := lower(trim(coalesce(p_code, ''))); o uuid := public.ov_owner();
begin
  if auth.uid() is null or not ((public.ov_role() = 'dueno' and o = auth.uid()) or public.ov_is_socio()) then return jsonb_build_object('ok', false, 'msg', 'Solo el dueño de la cuenta o un socio.'); end if;
  if c !~ '^[a-z0-9]{4,20}$' then return jsonb_build_object('ok', false, 'msg', 'El código lleva de 4 a 20 letras o números, sin espacios ni acentos.'); end if;
  if exists (select 1 from public.ov_members where owner = o and sub) then return jsonb_build_object('ok', false, 'msg', 'Ya hay usuarios creados con el código actual: no se puede cambiar.'); end if;
  if exists (select 1 from public.ov_accounts where code = c and owner <> o) then return jsonb_build_object('ok', false, 'msg', 'Ese código ya lo usa otra cuenta. Probá con otro.'); end if;
  update public.ov_accounts set code = c where owner = o;
  return jsonb_build_object('ok', true, 'code', c);
end $$;
revoke all on function public.ov_code_set(text) from public, anon;
grant execute on function public.ov_code_set(text) to authenticated;
