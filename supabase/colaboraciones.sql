-- OdontoVoz · colaboraciones (casas de insumos y otros aliados) que administran los creadores (tabla ov_admins)
-- Correr en Supabase › SQL Editor. Se puede volver a correr sin problema.
-- Todas las apps leen las colaboraciones activas (también sin sesión); solo los creadores las crean, cambian o borran.

create table if not exists public.ov_partners (
  id          text primary key,                         -- p. ej. 'surdental'
  name        text not null,
  kind        text not null default 'insumos',          -- insumos (por ahora)
  active      boolean not null default false,           -- apagada = no aparece en ninguna app
  rank        int not null default 0,                   -- el menor va primero
  exclusive   boolean not null default false,           -- «En colaboración exclusiva con…»
  logo        text,                                     -- imagen chica (data:image/png;base64,…)
  url         text,                                     -- sitio o tienda
  branches    jsonb not null default '[]'::jsonb,       -- [{"name":"General Roca","wa":"5492984641519"}]
  benefit     jsonb not null default '{}'::jsonb,       -- {"pct":5,"days":[5],"text":"","from":null,"to":null}
  show        jsonb not null default '{"home":true,"menu":true,"stock":true}'::jsonb,
  note        text,                                     -- nota interna (no la ven los usuarios)
  updated_at  timestamptz not null default now(),
  updated_by  text
);
alter table public.ov_partners enable row level security;

drop policy if exists "ov_partners_read" on public.ov_partners;
create policy "ov_partners_read" on public.ov_partners for select to anon, authenticated using (active or public.ov_is_admin());

-- las apps solo ven estas columnas (la nota interna y quién lo cambió quedan para los creadores)
revoke select on public.ov_partners from anon, authenticated;
grant select (id, name, kind, active, rank, exclusive, logo, url, branches, benefit, show, updated_at) on public.ov_partners to anon, authenticated;
revoke insert, update, delete on public.ov_partners from anon, authenticated;

-- quién cambió y cuándo
create or replace function public.ov_partners_stamp() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce((select email from auth.users where id = auth.uid()), new.updated_by);
  return new;
end $$;
drop trigger if exists ov_partners_stamp_trg on public.ov_partners;
create trigger ov_partners_stamp_trg before insert or update on public.ov_partners for each row execute function public.ov_partners_stamp();

-- para que la app sepa si quien entró es creador (muestra el panel)
grant execute on function public.ov_is_admin() to authenticated;

-- todo (con nota y quién cambió), solo para creadores
create or replace function public.ov_partners_all() returns setof public.ov_partners
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.ov_is_admin() then raise exception 'solo creadores'; end if;
  return query select * from public.ov_partners order by rank, name;
end $$;
revoke all on function public.ov_partners_all() from public, anon;
grant execute on function public.ov_partners_all() to authenticated;

-- guardar y borrar: solo creadores, por funciones (la app nunca escribe la tabla directo)
create or replace function public.ov_partner_save(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_id text := lower(regexp_replace(coalesce(p->>'id', ''), '[^a-zA-Z0-9_-]', '', 'g'));
begin
  if not public.ov_is_admin() then raise exception 'solo creadores'; end if;
  if v_id = '' or coalesce(trim(p->>'name'), '') = '' then raise exception 'falta el nombre'; end if;
  if length(coalesce(p->>'logo', '')) > 400000 then raise exception 'el logo es muy pesado'; end if;
  insert into public.ov_partners as t (id, name, kind, active, rank, exclusive, logo, url, branches, benefit, show, note)
  values (v_id, trim(p->>'name'), coalesce(p->>'kind', 'insumos'), coalesce((p->>'active')::boolean, false), coalesce((p->>'rank')::int, 0),
          coalesce((p->>'exclusive')::boolean, false), nullif(p->>'logo', ''), nullif(p->>'url', ''),
          coalesce(p->'branches', '[]'::jsonb), coalesce(p->'benefit', '{}'::jsonb), coalesce(p->'show', '{"home":true,"menu":true,"stock":true}'::jsonb), nullif(p->>'note', ''))
  on conflict (id) do update set name = excluded.name, kind = excluded.kind, active = excluded.active, rank = excluded.rank, exclusive = excluded.exclusive,
    logo = excluded.logo, url = excluded.url, branches = excluded.branches, benefit = excluded.benefit, show = excluded.show, note = excluded.note;
end $$;
create or replace function public.ov_partner_del(p_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.ov_is_admin() then raise exception 'solo creadores'; end if;
  delete from public.ov_partners where id = p_id;
end $$;
revoke all on function public.ov_partner_save(jsonb) from public, anon;
revoke all on function public.ov_partner_del(text) from public, anon;
grant execute on function public.ov_partner_save(jsonb) to authenticated;
grant execute on function public.ov_partner_del(text) to authenticated;

-- Surdental como borrador APAGADO (se prende desde el panel cuando el acuerdo esté firmado)
insert into public.ov_partners (id, name, kind, active, rank, exclusive, url, branches, benefit, note)
values ('surdental', 'Surdental', 'insumos', false, 0, true, 'https://www.surdentalinsumos.com.ar',
  '[{"name":"General Roca","wa":"5492984641519"},{"name":"Neuquén","wa":""}]'::jsonb,
  '{"pct":5,"days":[5],"text":"","from":null,"to":null}'::jsonb,
  'Propuesta: 5% los viernes. Confirmar con ellos el WhatsApp de pedidos de cada sucursal.')
on conflict (id) do nothing;
