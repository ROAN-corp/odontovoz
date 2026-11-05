-- OdontoVoz · licencias y administración
-- Correr en Supabase › SQL Editor DESPUÉS de schema.sql. Se puede volver a correr sin problema.
-- Cada cuenta tiene una licencia (plan, estado, vencimiento). Si vence o se suspende, la cuenta queda en
-- SOLO LECTURA: puede ver y descargar sus datos (son del profesional) pero el servidor rechaza cambios nuevos.

-- 1) Administradores (ustedes): quiénes pueden ver y cambiar las licencias de todos
create table if not exists public.ov_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.ov_admins enable row level security;

create or replace function public.ov_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ov_admins where user_id = auth.uid());
$$;

drop policy if exists "ov_admins_read" on public.ov_admins;
create policy "ov_admins_read" on public.ov_admins for select to authenticated using (user_id = auth.uid() or public.ov_is_admin());

-- 2) Licencia de cada cuenta
create table if not exists public.ov_accounts (
  owner        uuid primary key references auth.users (id) on delete cascade,
  email        text,
  plan         text not null default 'prueba',          -- prueba, basico, consultorio, centro (se pueden sumar)
  status       text not null default 'activa' check (status in ('activa', 'suspendida')),
  trial_until  date not null default (current_date + 7),
  promo        text,                                   -- 'lanzamiento50': de los primeros 50, prueba de 14 días
  paid_until   date,
  max_devices  int  not null default 3,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.ov_accounts enable row level security;

-- cada usuario ve solo su licencia; los administradores ven y cambian todas
drop policy if exists "ov_accounts_own_read" on public.ov_accounts;
create policy "ov_accounts_own_read" on public.ov_accounts for select to authenticated using (owner = auth.uid() or public.ov_is_admin());
drop policy if exists "ov_accounts_admin_write" on public.ov_accounts;
create policy "ov_accounts_admin_write" on public.ov_accounts for update to authenticated using (public.ov_is_admin()) with check (public.ov_is_admin());
grant select, update on public.ov_accounts to authenticated;
revoke all on public.ov_accounts from anon;
grant select on public.ov_admins to authenticated;
revoke all on public.ov_admins from anon;

-- ¿la cuenta puede guardar cambios? (activa y con prueba o pago vigente)
create or replace function public.ov_is_active(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select a.status = 'activa' and greatest(a.trial_until, coalesce(a.paid_until, a.trial_until)) >= current_date
                   from public.ov_accounts a where a.owner = uid), false);
$$;
grant execute on function public.ov_is_active(uuid) to authenticated;

alter table public.ov_accounts add column if not exists promo text;
alter table public.ov_accounts alter column trial_until set default (current_date + 7);

-- 3) Toda cuenta nueva recibe su licencia de prueba automáticamente
create or replace function public.ov_new_account() returns trigger
language plpgsql security definer set search_path = public as $$
declare usados int;
begin
  -- lanzamiento: las primeras 50 cuentas nuevas tienen 14 días de prueba; después, 7
  perform pg_advisory_xact_lock(4202611);
  select count(*) into usados from public.ov_accounts where promo = 'lanzamiento50';
  insert into public.ov_accounts (owner, email, trial_until, promo)
  values (new.id, new.email, current_date + case when usados < 50 then 14 else 7 end, case when usados < 50 then 'lanzamiento50' end)
  on conflict (owner) do nothing;
  return new;
end $$;
drop trigger if exists ov_new_account on auth.users;
create trigger ov_new_account after insert on auth.users for each row execute function public.ov_new_account();

-- cuentas que ya existían: también reciben su licencia de prueba
insert into public.ov_accounts (owner, email) select id, email from auth.users on conflict (owner) do nothing;

-- 4) El servidor hace cumplir la licencia: leer siempre, escribir solo con licencia vigente
drop policy if exists "ov_records_own" on public.ov_records;
drop policy if exists "ov_records_read" on public.ov_records;
drop policy if exists "ov_records_insert" on public.ov_records;
drop policy if exists "ov_records_update" on public.ov_records;
create policy "ov_records_read" on public.ov_records for select to authenticated using (owner = (select auth.uid()));
create policy "ov_records_insert" on public.ov_records for insert to authenticated with check (owner = (select auth.uid()) and public.ov_is_active());
create policy "ov_records_update" on public.ov_records for update to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()) and public.ov_is_active());

-- 5) Resumen para el panel de administración (solo administradores)
create or replace function public.ov_admin_accounts() returns table (
  owner uuid, email text, plan text, status text, trial_until date, paid_until date, max_devices int, notes text,
  created_at timestamptz, last_sync timestamptz, records bigint, last_sign_in timestamptz
) language sql stable security definer set search_path = public as $$
  select a.owner, a.email, a.plan, a.status, a.trial_until, a.paid_until, a.max_devices, a.notes, a.created_at,
         (select max(r.updated_at) from public.ov_records r where r.owner = a.owner),
         (select count(*) from public.ov_records r where r.owner = a.owner),
         u.last_sign_in_at
  from public.ov_accounts a join auth.users u on u.id = a.owner
  where public.ov_is_admin()
  order by a.created_at desc;
$$;
revoke all on function public.ov_admin_accounts() from public, anon;
grant execute on function public.ov_admin_accounts() to authenticated;

-- 6) Ustedes como administradores: reemplazá el correo y corré solo esta línea (una por persona)
-- insert into public.ov_admins (user_id) select id from auth.users where email = 'TU-CORREO@ejemplo.com' on conflict do nothing;
