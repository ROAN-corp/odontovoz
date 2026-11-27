-- OdontoVoz · base de datos en Supabase
-- Cómo usarlo: en el panel de Supabase, abrí «SQL Editor», pegá todo este archivo y tocá «Run».
-- Crea la tabla donde cada cuenta guarda sus datos, con reglas para que nadie vea los datos de otra cuenta.

-- 1) Datos de cada cuenta: una fila por día de agenda, por paciente y por cada ajuste
create table if not exists public.ov_records (
  owner      uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  k          text        not null,                 -- ej.: day:2026-11-04, pd:x3-ab12, cfg, pats
  v          jsonb       not null,                 -- contenido
  rev        bigint      not null default 1,       -- número de versión (evita pisar cambios de otro equipo)
  device     text,                                 -- nombre del equipo que hizo el último cambio
  updated_at timestamptz not null default now(),
  primary key (owner, k)
);
create index if not exists ov_records_owner_updated on public.ov_records (owner, updated_at);

-- 2) Seguridad por usuario (RLS): cada cuenta solo lee y escribe sus propias filas
alter table public.ov_records enable row level security;
drop policy if exists "ov_records_own" on public.ov_records;
/* la regla ov_records_own de public.ov_records solo se crea si todavía no están las reglas nuevas (ov_records_insert, ov_records_read, ov_records_update): un archivo posterior la reemplaza (scripts/guardar-sql.py) */
do $guard$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ov_records' and policyname in ('ov_records_insert', 'ov_records_read', 'ov_records_update')) then execute $pol$
create policy "ov_records_own" on public.ov_records
  for all to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()));
$pol$; end if; end $guard$;

-- 3) La fecha y la versión las pone el servidor (no se pueden falsear desde la app)
/* ov_touch solo se crea si todavía no existe: hay una versión más nueva en un archivo posterior y volver a correr este no tiene que pisarla (scripts/guardar-sql.py) */
do $guard$ begin if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'ov_touch') then execute $fn$
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
    new.owner := auth.uid();
  end if;
  return new;
end $$;
$fn$; end if; end $guard$;
drop trigger if exists ov_touch on public.ov_records;
create trigger ov_touch before insert or update on public.ov_records
  for each row execute function public.ov_touch();

-- 4) Historial de cambios de las fichas de pacientes (integridad de la historia clínica, Ley 26.529)
create table if not exists public.ov_history (
  id       bigserial primary key,
  owner    uuid not null references auth.users (id) on delete cascade,
  k        text not null,
  v        jsonb not null,
  rev      bigint,
  device   text,
  saved_at timestamptz not null default now()
);
create index if not exists ov_history_owner_k on public.ov_history (owner, k, saved_at desc);
alter table public.ov_history enable row level security;
/* la regla ov_history_read_own de public.ov_history solo se crea si todavía no existe: hay una más nueva en un archivo posterior (scripts/guardar-sql.py) */
do $guard$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ov_history' and policyname = 'ov_history_read_own') then execute $pol$
create policy "ov_history_read_own" on public.ov_history
  for select to authenticated using (owner = (select auth.uid()));
$pol$; end if; end $guard$;

/* ov_keep_history solo se crea si todavía no existe: hay una versión más nueva en un archivo posterior y volver a correr este no tiene que pisarla (scripts/guardar-sql.py) */
do $guard$ begin if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'ov_keep_history') then execute $fn$
create or replace function public.ov_keep_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.k like 'pd:%' then
    insert into public.ov_history (owner, k, v, rev, device) values (old.owner, old.k, old.v, old.rev, old.device);
  end if;
  return new;
end $$;
$fn$; end if; end $guard$;
drop trigger if exists ov_history_trg on public.ov_records;
create trigger ov_history_trg after update on public.ov_records
  for each row execute function public.ov_keep_history();

-- 5) Derecho de supresión: la persona puede borrar todos sus datos de la nube desde la app
/* ov_delete_my_data solo se crea si todavía no existe: hay una versión más nueva en un archivo posterior y volver a correr este no tiene que pisarla (scripts/guardar-sql.py) */
do $guard$ begin if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'ov_delete_my_data') then execute $fn$
create or replace function public.ov_delete_my_data() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  delete from public.ov_records where owner = auth.uid();
  delete from public.ov_history where owner = auth.uid();
end $$;
$fn$; end if; end $guard$;
revoke all on function public.ov_delete_my_data() from public, anon;
grant execute on function public.ov_delete_my_data() to authenticated;

grant select, insert, update on public.ov_records to authenticated;
grant select on public.ov_history to authenticated;
revoke all on public.ov_records from anon;
revoke all on public.ov_history from anon;
