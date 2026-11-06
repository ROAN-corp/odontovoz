-- OdontoVoz 1.31 · usuarios del equipo SIN correo (como Bilog)
-- Cada cuenta tiene un código (por ejemplo «castelli»). El dueño crea los usuarios de su equipo
-- con usuario y contraseña; se entra con Cuenta + Usuario + Contraseña. Nadie necesita un correo
-- propio, y una persona puede tener usuarios en varias cuentas (uno por cada lugar donde trabaja).
-- Se corre una vez en Supabase › SQL Editor › Run. Se puede volver a correr sin problema.

-- 0) columnas nuevas
alter table public.ov_accounts add column if not exists code text;
create unique index if not exists ov_accounts_code on public.ov_accounts (code) where code is not null;
alter table public.ov_members add column if not exists username text;
alter table public.ov_members add column if not exists sub boolean not null default false;
create unique index if not exists ov_members_owner_user on public.ov_members (owner, username) where username is not null;

-- correo interno (nunca se le manda nada): usuario@codigo.equipo.odontovoz.app
create or replace function public.ov_sub_email(p_code text, p_user text) returns text
language sql immutable as $$ select lower(p_user) || '@' || lower(p_code) || '.equipo.odontovoz.app' $$;

-- 1) el código de la cuenta (se crea solo la primera vez, a partir del correo del dueño)
create or replace function public.ov_code_ensure(p_owner uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text; base text; em text; i int := 0;
begin
  select code, email into c, em from public.ov_accounts where owner = p_owner;
  if c is not null then return c; end if;
  base := left(regexp_replace(lower(split_part(coalesce(em, 'cuenta'), '@', 1)), '[^a-z0-9]', '', 'g'), 8);
  if length(base) < 3 then base := 'cuenta'; end if;
  loop
    c := base || (100 + floor(random() * 900))::int::text;
    exit when not exists (select 1 from public.ov_accounts where code = c);
    i := i + 1; if i > 40 then c := base || floor(random() * 1000000)::int::text; exit; end if;
  end loop;
  update public.ov_accounts set code = c where owner = p_owner;
  return c;
end $$;
revoke all on function public.ov_code_ensure(uuid) from public, anon, authenticated;

create or replace function public.ov_code_get() returns jsonb
language plpgsql security definer set search_path = public as $$
declare o uuid := public.ov_owner();
begin
  if auth.uid() is null then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'code', public.ov_code_ensure(o),
    'locked', exists (select 1 from public.ov_members where owner = o and sub));
end $$;
revoke all on function public.ov_code_get() from public, anon;
grant execute on function public.ov_code_get() to authenticated;

-- el dueño puede elegir el código mientras todavía no creó usuarios con el código actual
create or replace function public.ov_code_set(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text := lower(trim(coalesce(p_code, '')));
begin
  if auth.uid() is null or public.ov_role() <> 'dueno' then return jsonb_build_object('ok', false, 'msg', 'Solo el dueño de la cuenta.'); end if;
  if c !~ '^[a-z0-9]{4,20}$' then return jsonb_build_object('ok', false, 'msg', 'El código lleva de 4 a 20 letras o números, sin espacios ni acentos.'); end if;
  if exists (select 1 from public.ov_members where owner = auth.uid() and sub) then return jsonb_build_object('ok', false, 'msg', 'Ya hay usuarios creados con el código actual: no se puede cambiar.'); end if;
  if exists (select 1 from public.ov_accounts where code = c and owner <> auth.uid()) then return jsonb_build_object('ok', false, 'msg', 'Ese código ya lo usa otra cuenta. Probá con otro.'); end if;
  update public.ov_accounts set code = c where owner = auth.uid();
  return jsonb_build_object('ok', true, 'code', c);
end $$;
revoke all on function public.ov_code_set(text) from public, anon;
grant execute on function public.ov_code_set(text) to authenticated;

-- 2) crear un usuario del equipo (lo hace el dueño o un administrador)
create or replace function public.ov_sub_create(p_name text, p_user text, p_pass text, p_role text, p_sede text, p_pro text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare o uuid := public.ov_owner(); r text := public.ov_role(); u text := lower(trim(coalesce(p_user, ''))); c text; em text; nid uuid := gen_random_uuid(); n int;
begin
  if auth.uid() is null or r not in ('dueno', 'admin') then return jsonb_build_object('ok', false, 'msg', 'Solo el dueño o un administrador pueden crear usuarios.'); end if;
  if r = 'admin' and p_role = 'admin' then return jsonb_build_object('ok', false, 'msg', 'Solo el dueño puede crear administradores.'); end if;
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

-- 3) cambiarle la contraseña a un usuario del equipo (se le cierran las sesiones abiertas)
create or replace function public.ov_sub_password(p_member uuid, p_pass text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare o uuid := public.ov_owner();
begin
  if auth.uid() is null or public.ov_role() not in ('dueno', 'admin') then return jsonb_build_object('ok', false, 'msg', 'Solo el dueño o un administrador.'); end if;
  if not exists (select 1 from public.ov_members where member = p_member and owner = o and sub) then return jsonb_build_object('ok', false, 'msg', 'Ese usuario no es de tu equipo.'); end if;
  if length(coalesce(p_pass, '')) < 6 then return jsonb_build_object('ok', false, 'msg', 'La contraseña necesita al menos 6 caracteres.'); end if;
  update auth.users set encrypted_password = crypt(p_pass, gen_salt('bf')), updated_at = now() where id = p_member;
  delete from auth.sessions where user_id = p_member;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.ov_sub_password(uuid, text) from public, anon;
grant execute on function public.ov_sub_password(uuid, text) to authenticated;

-- 4) los usuarios creados así no abren una cuenta propia al crearse
create or replace function public.ov_new_account() returns trigger
language plpgsql security definer set search_path = public as $$
declare usados int; con_promo boolean; inv text; r jsonb;
begin
  if new.raw_user_meta_data ? 'ov_sub' then return new; end if;
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

-- 5) el equipo, ahora con usuario y código
create or replace function public.ov_team() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.ov_role() not in ('dueno', 'admin') then '{"ok":false}'::jsonb else jsonb_build_object('ok', true,
    'code', (select a.code from public.ov_accounts a where a.owner = public.ov_owner()),
    'members', (select coalesce(jsonb_agg(jsonb_build_object('member', m.member, 'role', m.role, 'sede', m.sede, 'pro', m.pro, 'name', m.name, 'email', case when m.sub then null else m.email end, 'username', m.username, 'sub', m.sub, 'active', m.active, 'created_at', m.created_at, 'last_seen', m.last_seen,
        'devices', (select count(*) from public.ov_devices d where d.owner = m.owner and d.member = m.member and d.removed_at is null)) order by m.active desc, m.created_at), '[]'::jsonb)
      from public.ov_members m where m.owner = public.ov_owner()),
    'invites', (select coalesce(jsonb_agg(jsonb_build_object('code', i.code, 'role', i.role, 'sede', i.sede, 'pro', i.pro, 'name', i.name, 'created_at', i.created_at, 'expires_at', i.expires_at) order by i.created_at desc), '[]'::jsonb)
      from public.ov_invites i where i.owner = public.ov_owner() and i.used_by is null and not i.revoked and i.expires_at > now())) end;
$$;
revoke all on function public.ov_team() from public, anon;
grant execute on function public.ov_team() to authenticated;

-- 6) quién soy: también el usuario y el código (para mostrarlo arriba)
create or replace function public.ov_whoami() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'me', auth.uid(), 'owner', public.ov_owner(), 'role', public.ov_role(),
    'member', (select jsonb_build_object('role', m.role, 'sede', m.sede, 'pro', m.pro, 'name', m.name, 'email', m.email, 'username', m.username, 'sub', m.sub) from public.ov_members m where m.member = auth.uid() and m.active),
    'member_off', exists (select 1 from public.ov_members m where m.member = auth.uid() and not m.active),
    'code', (select a.code from public.ov_accounts a where a.owner = public.ov_owner()),
    'account', (select to_jsonb(a) - 'notes' - 'flags' from public.ov_accounts a where a.owner = public.ov_owner()));
$$;
revoke all on function public.ov_whoami() from public, anon;
grant execute on function public.ov_whoami() to authenticated;

-- 7) al borrar una cuenta desde el panel, también los usuarios sin correo de su equipo
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
  delete from auth.users where id in (select member from public.ov_members where owner = p_owner and sub);
  delete from public.ov_members where owner = p_owner;
  update public.ov_requests set status = 'hecho', done_at = now() where owner = p_owner and kind = 'eliminar' and status <> 'hecho';
  delete from public.ov_accounts where owner = p_owner;
  delete from auth.users where id = p_owner;
end $$;

-- 8) códigos para las cuentas que ya existen
select public.ov_code_ensure(owner) from public.ov_accounts where code is null;
