-- =====================================================================
-- OdontoVoz 1.57 · Saldo de hojas para la lectura con IA, historial de cambios de cuentas y uso de la aplicación
-- Correr una vez en Supabase › SQL Editor (después de los demás). Se puede volver a correr sin problema.
--
-- 1) Saldo de hojas por cuenta (ai_sheets): la lectura de historias de papel con IA solo anda si la cuenta tiene hojas cargadas.
--    Las carga el administrador desde el panel cuando el cliente paga un paquete. Cada hoja leída resta una.
-- 2) ov_audit: quién cambió qué en una cuenta (plan, estado, vencimientos, límites, notas).
-- 3) ov_usage: contadores de uso por cuenta y por día (cuántos turnos, cobros, notas, PDFs…). NO guarda datos de pacientes ni textos.
-- =====================================================================

alter table public.ov_accounts add column if not exists ai_sheets int not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'ov_accounts_ai_sheets_chk') then
    alter table public.ov_accounts add constraint ov_accounts_ai_sheets_chk check (ai_sheets >= 0);
  end if;
end $$;

-- ---------- movimientos del saldo de hojas ----------
create table if not exists public.ov_ai_ledger (
  id bigserial primary key,
  owner uuid not null,
  at timestamptz not null default now(),
  delta int not null,
  saldo int not null,
  motivo text,
  by_email text
);
create index if not exists ov_ai_ledger_owner on public.ov_ai_ledger (owner, at desc);
alter table public.ov_ai_ledger enable row level security;
drop policy if exists "ov_ai_ledger_admin_read" on public.ov_ai_ledger;
create policy "ov_ai_ledger_admin_read" on public.ov_ai_ledger for select to authenticated using (public.ov_is_admin());
revoke all on public.ov_ai_ledger from anon;
revoke insert, update, delete on public.ov_ai_ledger from authenticated;
grant select on public.ov_ai_ledger to authenticated;

-- la función de lectura (con la clave del servidor) descuenta antes de leer; devuelve el saldo que queda o -1 si no alcanza
create or replace function public.ov_ai_take(p_owner uuid, p_n int) returns int
language plpgsql security definer set search_path = public as $$
declare left_ int;
begin
  if p_n is null or p_n < 1 then return -1; end if;
  update public.ov_accounts set ai_sheets = ai_sheets - p_n where owner = p_owner and ai_sheets >= p_n returning ai_sheets into left_;
  if left_ is null then return -1; end if;
  insert into public.ov_ai_ledger (owner, delta, saldo, motivo) values (p_owner, -p_n, left_, 'lectura');
  return left_;
end $$;
revoke all on function public.ov_ai_take(uuid, int) from public, anon, authenticated;
grant execute on function public.ov_ai_take(uuid, int) to service_role;

-- si la lectura falla, se devuelven las hojas
create or replace function public.ov_ai_give(p_owner uuid, p_n int) returns int
language plpgsql security definer set search_path = public as $$
declare left_ int;
begin
  if p_n is null or p_n < 1 then return null; end if;
  update public.ov_accounts set ai_sheets = ai_sheets + p_n where owner = p_owner returning ai_sheets into left_;
  if left_ is not null then insert into public.ov_ai_ledger (owner, delta, saldo, motivo) values (p_owner, p_n, left_, 'devuelta: la lectura falló'); end if;
  return left_;
end $$;
revoke all on function public.ov_ai_give(uuid, int) from public, anon, authenticated;
grant execute on function public.ov_ai_give(uuid, int) to service_role;

-- el administrador carga (o descuenta, con número negativo) hojas a una cuenta
create or replace function public.ov_admin_ai_add(p_owner uuid, p_n int, p_motivo text default null) returns int
language plpgsql security definer set search_path = public as $$
declare left_ int;
begin
  if not public.ov_is_admin() then raise exception 'Solo para administradores'; end if;
  if p_n is null or p_n = 0 or abs(p_n) > 100000 then raise exception 'Cantidad no válida'; end if;
  update public.ov_accounts set ai_sheets = greatest(0, ai_sheets + p_n) where owner = p_owner returning ai_sheets into left_;
  if left_ is null then raise exception 'No existe esa cuenta'; end if;
  insert into public.ov_ai_ledger (owner, delta, saldo, motivo, by_email) values (p_owner, p_n, left_, coalesce(nullif(trim(p_motivo), ''), case when p_n > 0 then 'paquete cargado' else 'ajuste' end), (select email from auth.users where id = auth.uid()));
  return left_;
end $$;
revoke all on function public.ov_admin_ai_add(uuid, int, text) from public, anon;
grant execute on function public.ov_admin_ai_add(uuid, int, text) to authenticated;

-- ---------- historial de cambios de cada cuenta ----------
create table if not exists public.ov_audit (
  id bigserial primary key,
  owner uuid not null,
  at timestamptz not null default now(),
  by_email text,
  change jsonb not null
);
create index if not exists ov_audit_owner on public.ov_audit (owner, at desc);
alter table public.ov_audit enable row level security;
drop policy if exists "ov_audit_admin_read" on public.ov_audit;
create policy "ov_audit_admin_read" on public.ov_audit for select to authenticated using (public.ov_is_admin());
revoke all on public.ov_audit from anon;
revoke insert, update, delete on public.ov_audit from authenticated;
grant select on public.ov_audit to authenticated;

create or replace function public.ov_accounts_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text; d jsonb := '{}'::jsonb; o jsonb := to_jsonb(old); n jsonb := to_jsonb(new);
begin
  foreach k in array array['plan', 'status', 'trial_until', 'paid_until', 'max_devices', 'max_locs', 'lim_pros', 'lim_devices', 'notes'] loop
    if (o -> k) is distinct from (n -> k) then d := d || jsonb_build_object(k, jsonb_build_array(o -> k, n -> k)); end if;
  end loop;
  if d <> '{}'::jsonb then
    insert into public.ov_audit (owner, by_email, change) values (new.owner, coalesce((select email from auth.users where id = auth.uid()), 'sistema'), d);
  end if;
  return new;
end $$;
drop trigger if exists ov_accounts_audit_t on public.ov_accounts;
create trigger ov_accounts_audit_t after update on public.ov_accounts for each row execute function public.ov_accounts_audit();

-- ---------- uso de la aplicación (solo contadores) ----------
create table if not exists public.ov_usage (
  owner uuid not null,
  day date not null,
  k text not null,
  n int not null default 0,
  primary key (owner, day, k)
);
alter table public.ov_usage enable row level security;
revoke all on public.ov_usage from anon, authenticated;

-- la app manda, de vez en cuando, cuántas cosas se hicieron (claves cortas como turno, cobro, nota, pdf, voz…)
create or replace function public.ov_usage_add(p_day date, p_counts jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare o uuid := public.ov_owner(); d date := p_day; r record; c int := 0;
begin
  if o is null then return; end if;
  if d is null or d < current_date - 2 or d > current_date + 1 then d := current_date; end if;
  insert into public.ov_usage (owner, day, k, n) values (o, d, 'dia', 1) on conflict (owner, day, k) do nothing;
  if p_counts is null or jsonb_typeof(p_counts) <> 'object' then return; end if;
  for r in select key, value from jsonb_each_text(p_counts) loop
    c := c + 1; exit when c > 30;
    if r.key ~ '^[a-z_]{1,24}$' and r.key <> 'dia' and r.value ~ '^[0-9]{1,4}$' and r.value::int > 0 then
      insert into public.ov_usage (owner, day, k, n) values (o, d, r.key, r.value::int)
      on conflict (owner, day, k) do update set n = public.ov_usage.n + excluded.n;
    end if;
  end loop;
end $$;
revoke all on function public.ov_usage_add(date, jsonb) from public, anon;
grant execute on function public.ov_usage_add(date, jsonb) to authenticated;

-- panel: por cuenta, cuántos días la usó en el período, el último día y el total por tipo de cosa
create or replace function public.ov_admin_usage(p_days int default 30) returns table (owner uuid, days int, last_day date, counts jsonb)
language sql stable security definer set search_path = public as $$
  select a.owner,
         (select count(*) from public.ov_usage x where x.owner = a.owner and x.k = 'dia' and x.day >= current_date - greatest(p_days, 1))::int,
         (select max(x.day) from public.ov_usage x where x.owner = a.owner),
         coalesce((select jsonb_object_agg(t.k, t.s) from (select x.k, sum(x.n)::int s from public.ov_usage x where x.owner = a.owner and x.day >= current_date - greatest(p_days, 1) and x.k <> 'dia' group by x.k) t), '{}'::jsonb)
  from public.ov_accounts a where public.ov_is_admin();
$$;
revoke all on function public.ov_admin_usage(int) from public, anon;
grant execute on function public.ov_admin_usage(int) to authenticated;

-- panel: el resumen de cuentas suma el saldo de hojas con IA
drop function if exists public.ov_admin_accounts();
create function public.ov_admin_accounts() returns table (
  owner uuid, email text, plan text, status text, trial_until date, paid_until date, max_devices int, max_locs int, lim_pros int, lim_devices int, flags text, notes text,
  created_at timestamptz, last_sync timestamptz, records bigint, last_sign_in timestamptz, devices bigint, limits jsonb, terms_version text, terms_at timestamptz, ai_sheets int
) language sql stable security definer set search_path = public as $$
  select a.owner, a.email, a.plan, a.status, a.trial_until, a.paid_until, a.max_devices, a.max_locs, a.lim_pros, a.lim_devices, a.flags, a.notes, a.created_at,
         (select max(r.updated_at) from public.ov_records r where r.owner = a.owner),
         (select count(*) from public.ov_records r where r.owner = a.owner),
         u.last_sign_in_at,
         (select count(*) from public.ov_devices d where d.owner = a.owner and d.removed_at is null),
         public.ov_limits(a.owner), a.terms_version, a.terms_at, a.ai_sheets
  from public.ov_accounts a join auth.users u on u.id = a.owner
  where public.ov_is_admin()
  order by a.created_at desc;
$$;
revoke all on function public.ov_admin_accounts() from public, anon;
grant execute on function public.ov_admin_accounts() to authenticated;
