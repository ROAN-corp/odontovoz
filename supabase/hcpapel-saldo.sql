-- OdontoVoz · Pasar historias de papel con IA: saldo de hojas por cuenta
-- NO está activo todavía (se corre recién cuando se venda el servicio). Ver docs/HC-PAPEL-IA.md §7.
-- Correr UNA vez en Supabase › SQL Editor (se puede repetir sin problema). Después de correrlo, la lectura con IA queda
-- apagada para todas las cuentas, salvo las que tengan hojas cargadas.
--
-- Cuando un cliente paga:   select ov_ai_grant('<owner>', 500, 'IA 500 hojas, USD 49');
-- Para ver una cuenta:      select * from ov_ai_credit where owner = '<owner>';
-- Para buscar la cuenta:    select owner, email from ov_accounts where email ilike '%parte-del-mail%';
--
-- Requiere haber corrido antes: licencias.sql (ov_accounts, ov_is_admin), vinculos.sql (ov_owner) y hcpapel.sql (ov_ai_use).

create table if not exists public.ov_ai_credit (
  owner uuid primary key,
  hojas int not null default 0 check (hojas >= 0),   -- las que le quedan
  comprado int not null default 0,                    -- total cargado desde siempre (sin contar devoluciones)
  updated_at timestamptz not null default now()
);
alter table public.ov_ai_credit enable row level security;
revoke all on public.ov_ai_credit from anon, authenticated;

-- registro de cada carga (quién, cuánto, para qué pago)
create table if not exists public.ov_ai_ledger (
  id bigserial primary key,
  owner uuid not null,
  n int not null,
  nota text,
  by uuid,
  at timestamptz not null default now()
);
create index if not exists ov_ai_ledger_owner on public.ov_ai_ledger (owner, at desc);
alter table public.ov_ai_ledger enable row level security;
revoke all on public.ov_ai_ledger from anon, authenticated;

-- Descuenta n hojas de forma atómica. Devuelve las que quedan (>= 0), -1 si no alcanzan o -2 si la cuenta no tiene el servicio activado.
create or replace function public.ov_ai_take(p_owner uuid, p_n int) returns int
language plpgsql security definer set search_path = public as $$
declare left_ int;
begin
  if p_owner is null or p_n is null or p_n < 1 then return -2; end if;
  update public.ov_ai_credit set hojas = hojas - p_n, updated_at = now()
   where owner = p_owner and hojas >= p_n returning hojas into left_;
  if found then return left_; end if;
  if exists (select 1 from public.ov_ai_credit where owner = p_owner) then return -1; end if;
  return -2;
end $$;

-- Devuelve hojas que se descontaron y no se llegaron a usar (la IA falló o se pasó del tope diario). No cuenta como compra.
create or replace function public.ov_ai_refund(p_owner uuid, p_n int) returns int
language plpgsql security definer set search_path = public as $$
declare left_ int;
begin
  if p_owner is null or p_n is null or p_n < 1 then return null; end if;
  update public.ov_ai_credit set hojas = hojas + p_n, updated_at = now() where owner = p_owner returning hojas into left_;
  return left_;
end $$;

-- Carga hojas (o las corrige con un número negativo). Es lo que se usa cuando un cliente paga.
create or replace function public.ov_ai_grant(p_owner uuid, p_n int, p_nota text default null) returns int
language plpgsql security definer set search_path = public as $$
declare left_ int;
begin
  if p_n is null or p_n = 0 then raise exception 'Poné cuántas hojas'; end if;
  if p_n < -1000000 or p_n > 1000000 then raise exception 'Cantidad fuera de rango'; end if;
  if not exists (select 1 from public.ov_accounts where owner = p_owner) then raise exception 'No existe esa cuenta'; end if;
  insert into public.ov_ai_credit (owner, hojas, comprado) values (p_owner, greatest(p_n, 0), greatest(p_n, 0))
  on conflict (owner) do update set hojas = greatest(public.ov_ai_credit.hojas + p_n, 0),
                                    comprado = greatest(public.ov_ai_credit.comprado + p_n, 0), updated_at = now()
  returning hojas into left_;
  insert into public.ov_ai_ledger (owner, n, nota, by) values (p_owner, p_n, left(p_nota, 200), auth.uid());
  return left_;
end $$;

-- Lo mismo, pero desde el panel de licencias (solo administradores).
create or replace function public.ov_ai_admin_grant(p_owner uuid, p_n int, p_nota text default null) returns int
language plpgsql security definer set search_path = public as $$
begin
  if not public.ov_is_admin() then raise exception 'Solo administradores'; end if;
  return public.ov_ai_grant(p_owner, p_n, p_nota);
end $$;

-- Para el panel: saldo por cuenta (solo administradores).
create or replace function public.ov_ai_admin_list() returns table (owner uuid, email text, hojas int, comprado int, leidas bigint, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.owner, a.email, c.hojas, c.comprado, coalesce((select sum(u.n) from public.ov_ai_use u where u.owner = c.owner and u.kind = 'hc'), 0)::bigint, c.updated_at
    from public.ov_ai_credit c left join public.ov_accounts a on a.owner = c.owner
   where public.ov_is_admin() order by c.updated_at desc;
$$;

-- Para el panel: últimas cargas de una cuenta (solo administradores).
create or replace function public.ov_ai_admin_ledger(p_owner uuid) returns table (n int, nota text, at timestamptz)
language sql stable security definer set search_path = public as $$
  select l.n, l.nota, l.at from public.ov_ai_ledger l where l.owner = p_owner and public.ov_is_admin() order by l.at desc, l.id desc limit 20;
$$;

-- Para la app: cuántas hojas tiene mi cuenta (la del lugar donde estoy). activada = ya se le cargó el servicio alguna vez.
create or replace function public.ov_ai_my() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('activada', exists (select 1 from public.ov_ai_credit where owner = public.ov_owner()),
                            'hojas', coalesce((select hojas from public.ov_ai_credit where owner = public.ov_owner()), 0));
$$;

revoke all on function public.ov_ai_take(uuid, int), public.ov_ai_refund(uuid, int), public.ov_ai_grant(uuid, int, text),
  public.ov_ai_admin_grant(uuid, int, text), public.ov_ai_admin_list(), public.ov_ai_admin_ledger(uuid), public.ov_ai_my() from public, anon, authenticated;
grant execute on function public.ov_ai_take(uuid, int), public.ov_ai_refund(uuid, int), public.ov_ai_grant(uuid, int, text) to service_role;
grant execute on function public.ov_ai_admin_grant(uuid, int, text), public.ov_ai_admin_list(), public.ov_ai_admin_ledger(uuid), public.ov_ai_my() to authenticated;
