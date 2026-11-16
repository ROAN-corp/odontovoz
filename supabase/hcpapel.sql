-- OdontoVoz 1.53 · Pasar historias de papel: tope diario de lectura con IA por cuenta
-- Correr una vez en Supabase › SQL Editor. Sin esto la función hc-read igual anda, pero sin tope.
create table if not exists public.ov_ai_use (
  owner uuid not null,
  day text not null,
  kind text not null,
  n int not null default 0,
  primary key (owner, day, kind)
);
alter table public.ov_ai_use enable row level security;
revoke all on public.ov_ai_use from anon, authenticated;

create or replace function public.ov_ai_hit(p_owner uuid, p_day text, p_kind text, p_n int default 1) returns int
language sql security definer set search_path = public as $$
  insert into public.ov_ai_use (owner, day, kind, n) values (p_owner, p_day, p_kind, greatest(p_n, 1))
  on conflict (owner, day, kind) do update set n = ov_ai_use.n + greatest(p_n, 1) returning n;
$$;
revoke all on function public.ov_ai_hit(uuid, text, text, int) from public, anon, authenticated;
grant execute on function public.ov_ai_hit(uuid, text, text, int) to service_role;
