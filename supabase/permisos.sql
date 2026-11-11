-- =====================================================================
-- OdontoVoz 1.48 · Permisos: precios solo el dueño; recepción y asistente cargan pero no cambian lo hecho
-- Correr una vez en Supabase › SQL Editor. Se puede volver a correr sin problema.
--
-- 1) Lista de prácticas y precios (`cat`) y valores del odontograma (`aran`): solo dueño o administración.
--    (Ajustes, obras sociales y aranceles van en `cfg`, que ya estaba protegido.)
-- 2) Recepción y asistente: pueden agregar cobros, prácticas y notas, pero no cambiar ni borrar las que ya están
--    en la ficha del paciente (`pd:*`). Si lo intentan, el servidor deja lo anterior como estaba.
--    Se permiten las marcas que la app pone sola: cobOk/cobBy/cobAt en los cargos y odon/payId en las notas.
-- =====================================================================

create or replace function public.ov_rec_ok(p_k text, p_v jsonb) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare l jsonb := public.ov_limits(); rl text := public.ov_role();
begin
  if rl <> 'dueno' and p_k = 'setup' then return false; end if;
  if rl in ('recepcion', 'profesional', 'asistente') and p_k in ('cfg', 'pros', 'staff', 'cat', 'aran') then return false; end if;
  if p_k = 'pros' then
    return jsonb_typeof(p_v) <> 'array' or jsonb_array_length(p_v) <= (l->>'pros')::int;
  elsif p_k = 'setup' then
    if p_v is null or jsonb_typeof(p_v) <> 'object' then return true; end if;
    if coalesce(p_v->>'type', 'solo') = 'empresa' then return (l->>'centros')::int >= 2; end if;
    return coalesce(p_v->>'type', 'solo') = 'solo' or (l->>'pros')::int >= 2;
  elsif p_k = 'cfg' then
    return p_v is null or jsonb_typeof(p_v->'locs') is distinct from 'array' or jsonb_array_length(p_v->'locs') <= (l->>'locs')::int;
  end if;
  return true;
end $$;
grant execute on function public.ov_rec_ok(text, jsonb) to authenticated;

-- deja como estaban los elementos viejos de una lista (por id) que se cambiaron o se borraron
create or replace function public.ov_keep_old(p_old jsonb, p_new jsonb, p_free text[]) returns jsonb
language plpgsql immutable as $$
declare
  o jsonb; n jsonb; outv jsonb := '[]'::jsonb; om jsonb := '{}'::jsonb; seen jsonb := '{}'::jsonb; f text;
  a jsonb; b jsonb;
begin
  if jsonb_typeof(p_old) <> 'array' then return p_new; end if;
  if jsonb_typeof(p_new) <> 'array' then p_new := '[]'::jsonb; end if;
  for o in select x from jsonb_array_elements(p_old) x loop
    if o->>'id' is not null then om := om || jsonb_build_object(o->>'id', o); end if;
  end loop;
  for n in select x from jsonb_array_elements(p_new) x loop
    if n->>'id' is null or not (om ? (n->>'id')) then outv := outv || jsonb_build_array(n); continue; end if;
    seen := seen || jsonb_build_object(n->>'id', true);
    o := om -> (n->>'id'); a := o; b := n;
    foreach f in array p_free loop a := a - f; b := b - f; end loop;
    if a = b then outv := outv || jsonb_build_array(n); else outv := outv || jsonb_build_array(o); end if;
  end loop;
  for o in select x.value from jsonb_each(om) x loop
    if not (seen ? (o->>'id')) then outv := outv || jsonb_build_array(o); end if;
  end loop;
  return outv;
end $$;

create or replace function public.ov_pd_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text;
begin
  if new.k not like 'pd:%' or auth.uid() is null or tg_op <> 'UPDATE' then return new; end if;
  r := public.ov_role();
  if r not in ('recepcion', 'asistente') then return new; end if;
  if jsonb_typeof(old.v) <> 'object' or jsonb_typeof(new.v) <> 'object' then return new; end if;
  if jsonb_typeof(old.v->'ledger') = 'array' then
    new.v := jsonb_set(new.v, '{ledger}', public.ov_keep_old(old.v->'ledger', new.v->'ledger', array['cobOk', 'cobBy', 'cobAt', 'cobPaid']), true);
  end if;
  if jsonb_typeof(old.v->'notes') = 'array' then
    new.v := jsonb_set(new.v, '{notes}', public.ov_keep_old(old.v->'notes', new.v->'notes', array['odon', 'payId']), true);
  end if;
  return new;
end $$;

drop trigger if exists ov_pd_guard_trg on public.ov_records;
create trigger ov_pd_guard_trg before update on public.ov_records
  for each row execute function public.ov_pd_guard();
