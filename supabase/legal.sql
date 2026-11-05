-- OdontoVoz · registros legales (1.12)
-- Correr en Supabase › SQL Editor DESPUÉS de los scripts anteriores. Se puede volver a correr.
--   1) Aceptación de términos y privacidad: qué versión aceptó cada cuenta y cuándo (con historial).
--   2) Botón de baja, botón de arrepentimiento y pedido de eliminación de cuenta (Disp. 954/2025): cada pedido
--      recibe un código de constancia en el momento; no hace falta tener cuenta para pedir la baja o arrepentirse.
--   3) Eliminación completa de una cuenta por parte de los administradores.

-- 1) aceptación de términos
alter table public.ov_accounts add column if not exists terms_version text;
alter table public.ov_accounts add column if not exists terms_at timestamptz;
alter table public.ov_accounts add column if not exists voice_ok_at timestamptz;

create table if not exists public.ov_consents (
  id         bigint generated always as identity primary key,
  owner      uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('terminos', 'voz')),
  version    text not null,
  accepted   boolean not null default true,
  at         timestamptz not null default now(),
  device     text
);
alter table public.ov_consents enable row level security;
drop policy if exists "ov_consents_read" on public.ov_consents;
create policy "ov_consents_read" on public.ov_consents for select to authenticated using (owner = auth.uid() or public.ov_is_admin());
grant select on public.ov_consents to authenticated;
revoke all on public.ov_consents from anon;

create or replace function public.ov_accept(p_kind text, p_version text, p_accepted boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok', false); end if;
  if p_kind not in ('terminos', 'voz') or coalesce(p_version, '') !~ '^[0-9a-z.-]{4,20}$' then return jsonb_build_object('ok', false); end if;
  insert into public.ov_consents (owner, kind, version, accepted, device) values (uid, p_kind, p_version, coalesce(p_accepted, true), left(public.ov_device_id(), 64));
  if p_kind = 'terminos' and p_accepted then update public.ov_accounts set terms_version = p_version, terms_at = now() where owner = uid; end if;
  if p_kind = 'voz' then update public.ov_accounts set voice_ok_at = case when p_accepted then now() end where owner = uid; end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.ov_accept(text, text, boolean) from public, anon;
grant execute on function public.ov_accept(text, text, boolean) to authenticated;

-- 2) pedidos de baja, arrepentimiento y eliminación
create table if not exists public.ov_requests (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  code       text not null unique,
  kind       text not null check (kind in ('baja', 'arrepentimiento', 'eliminar')),
  email      text not null,
  name       text,
  detail     text,
  owner      uuid references auth.users (id) on delete set null,
  status     text not null default 'nuevo' check (status in ('nuevo', 'en curso', 'hecho', 'rechazado')),
  done_at    timestamptz,
  notes      text
);
alter table public.ov_requests enable row level security;
drop policy if exists "ov_requests_read" on public.ov_requests;
create policy "ov_requests_read" on public.ov_requests for select to authenticated using (owner = auth.uid() or public.ov_is_admin());
drop policy if exists "ov_requests_admin" on public.ov_requests;
create policy "ov_requests_admin" on public.ov_requests for update to authenticated using (public.ov_is_admin()) with check (public.ov_is_admin());
grant select, update on public.ov_requests to authenticated;
revoke all on public.ov_requests from anon;

create or replace function public.ov_request(p_kind text, p_email text, p_name text, p_detail text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); em text; n int; code text; acc uuid;
  al constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if p_kind not in ('baja', 'arrepentimiento', 'eliminar') then return jsonb_build_object('ok', false, 'msg', 'Pedido inválido.'); end if;
  em := lower(trim(coalesce(p_email, '')));
  if uid is not null then select lower(email) into em from auth.users where id = uid; end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'msg', 'Revisá el correo.'); end if;
  select count(*) into n from public.ov_requests where email = em and created_at > now() - interval '1 day';
  if n >= 5 then return jsonb_build_object('ok', false, 'msg', 'Ya recibimos varios pedidos de este correo hoy. Si necesitás algo más, escribinos a somosroan@gmail.com.'); end if;
  select owner into acc from public.ov_accounts where lower(email) = em limit 1;
  code := upper(left(p_kind, 1)) || '-' || to_char(now() at time zone 'America/Argentina/Buenos_Aires', 'YYMMDD') || '-' || (select string_agg(substr(al, 1 + floor(random() * length(al))::int, 1), '') from generate_series(1, 4));
  insert into public.ov_requests (code, kind, email, name, detail, owner) values (code, p_kind, em, left(p_name, 120), left(p_detail, 1000), coalesce(uid, acc));
  return jsonb_build_object('ok', true, 'code', code, 'at', now());
end $$;
revoke all on function public.ov_request(text, text, text, text) from public;
grant execute on function public.ov_request(text, text, text, text) to anon, authenticated;

-- 3) eliminar una cuenta por completo (lo hace un administrador después de confirmar el pedido)
--    Las fotos se borran desde la app antes de pedir la eliminación (el servidor no permite borrarlas por SQL).
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
  update public.ov_requests set status = 'hecho', done_at = now() where owner = p_owner and kind = 'eliminar' and status <> 'hecho';
  delete from public.ov_accounts where owner = p_owner;
  delete from auth.users where id = p_owner;
end $$;
revoke all on function public.ov_admin_delete_account(uuid) from public, anon;
grant execute on function public.ov_admin_delete_account(uuid) to authenticated;

-- panel: el resumen de cuentas suma la aceptación de términos
drop function if exists public.ov_admin_accounts();
create function public.ov_admin_accounts() returns table (
  owner uuid, email text, plan text, status text, trial_until date, paid_until date, max_devices int, max_locs int, lim_pros int, lim_devices int, flags text, notes text,
  created_at timestamptz, last_sync timestamptz, records bigint, last_sign_in timestamptz, devices bigint, limits jsonb, terms_version text, terms_at timestamptz
) language sql stable security definer set search_path = public as $$
  select a.owner, a.email, a.plan, a.status, a.trial_until, a.paid_until, a.max_devices, a.max_locs, a.lim_pros, a.lim_devices, a.flags, a.notes, a.created_at,
         (select max(r.updated_at) from public.ov_records r where r.owner = a.owner),
         (select count(*) from public.ov_records r where r.owner = a.owner),
         u.last_sign_in_at,
         (select count(*) from public.ov_devices d where d.owner = a.owner and d.removed_at is null),
         public.ov_limits(a.owner), a.terms_version, a.terms_at
  from public.ov_accounts a join auth.users u on u.id = a.owner
  where public.ov_is_admin()
  order by a.created_at desc;
$$;
revoke all on function public.ov_admin_accounts() from public, anon;
grant execute on function public.ov_admin_accounts() to authenticated;

-- 4) la prueba de 14 días para las primeras 50 cuentas termina además el 31/12/2026 (bases publicadas en terminos.html)
create or replace function public.ov_new_account() returns trigger
language plpgsql security definer set search_path = public as $$
declare usados int; promo boolean;
begin
  perform pg_advisory_xact_lock(4202611);
  select count(*) into usados from public.ov_accounts where promo = 'lanzamiento50';
  promo := usados < 50 and now() < timestamptz '2027-01-01 00:00:00-03';
  insert into public.ov_accounts (owner, email, trial_until, promo)
  values (new.id, new.email, current_date + case when promo then 14 else 7 end, case when promo then 'lanzamiento50' end)
  on conflict (owner) do nothing;
  return new;
end $$;
