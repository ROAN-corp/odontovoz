-- =====================================================================
-- OdontoVoz 1.45 · Registro de cambios (auditoría) — Ley 26.529 art. 13 y 18
-- Correr una vez en Supabase › SQL Editor. Se puede volver a correr sin problema.
--
-- Qué hace:
--  1) Cada guardado en la nube anota QUÉ USUARIO lo hizo (su cuenta, no el equipo).
--  2) Se guarda la versión anterior de todo lo que cambia (antes solo fichas):
--     - fichas de pacientes (pd:*): para siempre (la historia clínica se conserva 10 años o más);
--     - agenda, lista de pacientes y el resto: 90 días.
--  3) Nadie puede borrar ni tocar el registro desde la app (ni el dueño): solo leerlo.
--  4) ov_audit(clave) devuelve el historial con el nombre de quién hizo cada cambio
--     (solo para el dueño o un administrador del equipo).
-- =====================================================================

alter table public.ov_records add column if not exists updated_by uuid;
alter table public.ov_history add column if not exists changed_by uuid;   -- quién guardó la versión nueva
alter table public.ov_history add column if not exists old_by uuid;       -- quién había escrito la versión que se reemplazó
create index if not exists ov_history_owner_k_at on public.ov_history (owner, k, saved_at desc);

-- 1) firma de quién guarda (la pone el servidor: no se puede falsear desde la app)
create or replace function public.ov_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists ov_stamp_trg on public.ov_records;
create trigger ov_stamp_trg before insert or update on public.ov_records
  for each row execute function public.ov_stamp();

-- 2) versión anterior de todo lo que cambia
create or replace function public.ov_keep_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.v is not distinct from new.v then return new; end if;
  -- la lista de pacientes y la configuración son grandes y cambian seguido: una copia cada 10 minutos por persona alcanza
  if old.k in ('pats', 'cfg', 'prosOld', 'aran', 'cat') and exists (
       select 1 from public.ov_history h
       where h.owner = old.owner and h.k = old.k and h.changed_by is not distinct from auth.uid()
         and h.saved_at > now() - interval '10 minutes') then
    return new;
  end if;
  insert into public.ov_history (owner, k, v, rev, device, changed_by, old_by)
  values (old.owner, old.k, old.v, old.rev, old.device, auth.uid(), old.updated_by);
  return new;
end $$;
drop trigger if exists ov_history_trg on public.ov_records;
create trigger ov_history_trg after update on public.ov_records
  for each row execute function public.ov_keep_history();

-- 3) el registro es de solo lectura (y cada uno ve solo lo de su lugar, como antes)
revoke insert, update, delete on public.ov_history from authenticated, anon;
grant select on public.ov_history to authenticated;

-- limpieza: lo que no es historia clínica se guarda 90 días
create or replace function public.ov_history_trim() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from public.ov_history where k not like 'pd:%' and saved_at < now() - interval '90 days';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.ov_history_trim() from public, anon, authenticated;

do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron no disponible: correr «select public.ov_history_trim();» de vez en cuando';
  end;
  begin
    perform cron.unschedule('ov_history_trim');
  exception when others then null;
  end;
  begin
    perform cron.schedule('ov_history_trim', '17 4 * * *', 'select public.ov_history_trim()');
  exception when others then
    raise notice 'No se pudo programar la limpieza automática';
  end;
end $$;

-- 4) leer el historial de un registro con nombres (solo dueño o administrador del lugar)
create or replace function public.ov_audit(p_k text, p_limit integer default 60)
returns table (saved_at timestamptz, who text, who_role text, rev bigint, device text, v jsonb)
language plpgsql stable security definer set search_path = public as $$
declare o uuid := public.ov_owner(); r text := public.ov_role();
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  if r not in ('dueno', 'admin') then raise exception 'solo el dueño o un administrador ven el registro de cambios'; end if;
  return query
    with cur as (
      select x.updated_at as saved_at, x.updated_by as by_, x.rev, x.device, x.v from public.ov_records x where x.owner = o and x.k = p_k
    ), hist as (
      -- cada fila del historial es la versión ANTERIOR: su autor es old_by
      select h.saved_at, h.old_by as by_, h.rev, h.device, h.v from public.ov_history h where h.owner = o and h.k = p_k
      order by h.saved_at desc limit greatest(1, least(p_limit, 300))
    )
    select z.saved_at,
      coalesce(
        (select coalesce(nullif(m.name, ''), m.username, m.email) from public.ov_members m where m.member = z.by_ and m.owner = o limit 1),
        (select case when z.by_ = o then 'Dueño de la cuenta' end),
        (select u.email::text from auth.users u where u.id = z.by_),
        'Sin dato (antes de activar el registro)') as who,
      coalesce((select m.role from public.ov_members m where m.member = z.by_ and m.owner = o limit 1), case when z.by_ = o then 'dueno' end) as who_role,
      z.rev, z.device, z.v
    from (select * from cur union all select * from hist) z
    order by z.rev desc nulls last;
end $$;
revoke all on function public.ov_audit(text, integer) from public, anon;
grant execute on function public.ov_audit(text, integer) to authenticated;
