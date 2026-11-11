-- =====================================================================
-- OdontoVoz 1.46.2 · El odontólogo del equipo solo modifica SU agenda
-- Correr una vez en Supabase › SQL Editor. Se puede volver a correr sin problema.
--
-- Un usuario del equipo con puesto «profesional» o «asistente» y una agenda asignada (ov_members.pro)
-- puede VER todos los turnos del centro, pero si guarda un día con cambios en turnos de otro profesional
-- (crear, mover, cancelar, cambiar estado o borrar), el servidor deja esos turnos como estaban.
-- Sus propios turnos y los que no tienen profesional se guardan normal. Dueño, administración y recepción: sin límite.
-- (La app ya lo frena antes; esto es la red de seguridad para versiones viejas o equipos modificados.)
-- =====================================================================

create or replace function public.ov_day_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  me text; r text;
  o jsonb := '[]'::jsonb; e jsonb; b jsonb;
  bm jsonb := '{}'::jsonb; seen jsonb := '{}'::jsonb; outv jsonb := '[]'::jsonb;
  changed boolean := false;
begin
  if new.k not like 'day:%' or auth.uid() is null then return new; end if;
  select m.pro, m.role into me, r from public.ov_members m
    where m.member = auth.uid() and m.owner = new.owner and m.active limit 1;
  if me is null or me = '' or r not in ('profesional', 'asistente') then return new; end if;
  if tg_op = 'UPDATE' and jsonb_typeof(old.v) = 'array' then o := old.v; end if;
  for b in select x from jsonb_array_elements(o) x loop
    if b->>'id' is not null then bm := bm || jsonb_build_object(b->>'id', b); end if;
  end loop;
  if jsonb_typeof(new.v) = 'array' then
    for e in select x from jsonb_array_elements(new.v) x loop
      if e->>'id' is null then outv := outv || jsonb_build_array(e); continue; end if;
      seen := seen || jsonb_build_object(e->>'id', true);
      b := bm -> (e->>'id');
      if b is not null then
        if (coalesce(b->>'pro', '') not in ('', me) or coalesce(e->>'pro', '') not in ('', me)) and b is distinct from e then
          outv := outv || jsonb_build_array(b); changed := true;          -- turno de otro: queda como estaba
        else
          outv := outv || jsonb_build_array(e);
        end if;
      elsif coalesce(e->>'pro', '') not in ('', me) then
        changed := true;                                                  -- turno nuevo en la agenda de otro: no entra
      else
        outv := outv || jsonb_build_array(e);
      end if;
    end loop;
  end if;
  for b in select x.value from jsonb_each(bm) x loop
    if not (seen ? (b->>'id')) and coalesce(b->>'pro', '') not in ('', me) then
      outv := outv || jsonb_build_array(b); changed := true;              -- borró un turno de otro: vuelve
    end if;
  end loop;
  if changed then new.v := outv; end if;
  return new;
end $$;

drop trigger if exists ov_day_guard_trg on public.ov_records;
create trigger ov_day_guard_trg before insert or update on public.ov_records
  for each row execute function public.ov_day_guard();
