-- =====================================================================
-- OdontoVoz 1.58 · El paciente cancela su turno desde el turnero online
-- Correr una vez en Supabase › SQL Editor (después de los demás). Se puede volver a correr sin problema.
--
-- El paciente entra a la página de turnos, escribe el CÓDIGO que le dieron al pedir el turno (OV-XXXX), su DNI y los últimos 4 números de su celular,
-- ve su turno y lo cancela si está dentro del plazo que fijó el consultorio (cancelHours, 24 h por defecto).
-- La app del consultorio toma la cancelación, pone el turno en «Canceló», libera el horario y avisa.
-- =====================================================================

-- estados nuevos del pedido: cancelar (el paciente canceló; la app todavía no lo tomó) y cancelado (ya tomado)
do $$ begin
  alter table public.ov_booking_req drop constraint if exists ov_booking_req_status_check;
  alter table public.ov_booking_req add constraint ov_booking_req_status_check check (status in ('nuevo', 'cargado', 'rechazado', 'cancelar', 'cancelado'));
end $$;

-- intentos fallidos (freno contra quien prueba códigos al azar)
create table if not exists public.ov_booking_fail (owner uuid not null, at timestamptz not null default now());
create index if not exists ov_booking_fail_owner on public.ov_booking_fail (owner, at desc);
alter table public.ov_booking_fail enable row level security;
revoke all on public.ov_booking_fail from anon, authenticated;

-- Pública: buscar el turno con código + DNI + últimos 4 del celular (los tres tienen que coincidir)
create or replace function public.ov_booking_find(p_slug text, p_code text, p_dni text, p_tel text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b public.ov_booking; r public.ov_booking_req; v_code text := upper(trim(coalesce(p_code, ''))); v_dni text := regexp_replace(coalesce(p_dni, ''), '\D', '', 'g');
  v_tel text := right(regexp_replace(coalesce(p_tel, ''), '\D', '', 'g'), 4);
  at_ts timestamptz; left_h numeric; win numeric; n int; gone boolean;
begin
  select * into b from public.ov_booking where slug = lower(coalesce(p_slug, '')) and enabled;
  if not found then return jsonb_build_object('ok', false, 'msg', 'Este turnero no está disponible.'); end if;
  delete from public.ov_booking_fail where at < now() - interval '1 day';
  select count(*) into n from public.ov_booking_fail f where f.owner = b.owner and f.at > now() - interval '1 hour';
  if n >= 30 then return jsonb_build_object('ok', false, 'msg', 'Hubo demasiados intentos. Probá más tarde o comunicate con el consultorio.'); end if;
  select * into r from public.ov_booking_req q
   where q.owner = b.owner and q.code = v_code and length(v_dni) >= 6 and regexp_replace(coalesce(q.data->>'dni', ''), '\D', '', 'g') = v_dni
     and length(v_tel) = 4 and right(regexp_replace(coalesce(q.data->>'phone', ''), '\D', '', 'g'), 4) = v_tel
     and q.status in ('nuevo', 'cargado', 'cancelar', 'cancelado')
   order by q.created_at desc limit 1;
  if not found then
    insert into public.ov_booking_fail (owner) values (b.owner);
    return jsonb_build_object('ok', false, 'msg', 'No encontramos un turno con esos datos. Revisá el código, el DNI y los últimos 4 números del celular, o comunicate con el consultorio.');
  end if;
  at_ts := ((r.data->>'date')::date + make_interval(mins => coalesce((r.data->>'start')::int, 0))) at time zone 'America/Argentina/Buenos_Aires';
  left_h := extract(epoch from (at_ts - now())) / 3600;
  win := coalesce(nullif(b.data->>'cancelHours', '')::numeric, 24);
  gone := r.status in ('cancelar', 'cancelado');
  return jsonb_build_object('ok', true, 'canceled', gone, 'can_cancel', (not gone) and left_h >= win and left_h > 0, 'past', left_h <= 0, 'window', win, 'left_hours', floor(greatest(left_h, 0)),
    'appt', jsonb_build_object('code', r.code, 'date', r.data->>'date', 'start', (r.data->>'start')::int, 'pro', r.data->>'pro', 'type', r.data->>'type', 'first', r.data->>'first'),
    'wa', b.data->>'wa', 'phone', b.data->>'phone');
end $$;

-- Pública: cancelar ese turno
create or replace function public.ov_booking_cancel(p_slug text, p_code text, p_dni text, p_tel text, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.ov_booking; f jsonb; v_code text := upper(trim(coalesce(p_code, ''))); v_dni text := regexp_replace(coalesce(p_dni, ''), '\D', '', 'g'); n int;
begin
  f := public.ov_booking_find(p_slug, p_code, p_dni, p_tel);
  if not coalesce((f->>'ok')::boolean, false) then return f; end if;
  if coalesce((f->>'canceled')::boolean, false) then return f || jsonb_build_object('msg', 'Ese turno ya estaba cancelado.'); end if;
  if coalesce((f->>'past')::boolean, false) then return f || jsonb_build_object('ok', false, 'msg', 'Ese turno ya pasó.'); end if;
  if not coalesce((f->>'can_cancel')::boolean, false) then
    return f || jsonb_build_object('ok', false, 'msg', 'Faltan menos de ' || (f->>'window') || ' horas para el turno: para cancelarlo comunicate directamente con el consultorio.');
  end if;
  select * into b from public.ov_booking where slug = lower(p_slug) and enabled;
  -- tope de seguridad: como mucho 10 cancelaciones online por día en todo el consultorio (si hay más, que llamen)
  select count(*) into n from public.ov_booking_req q where q.owner = b.owner and q.status in ('cancelar', 'cancelado') and (q.data->'cancel'->>'at')::timestamptz > now() - interval '1 day';
  if n >= 10 then return f || jsonb_build_object('ok', false, 'msg', 'Hoy se hicieron muchas cancelaciones online. Para cancelar tu turno comunicate directamente con el consultorio.'); end if;
  update public.ov_booking_req set status = 'cancelar',
         data = data || jsonb_build_object('cancel', jsonb_build_object('at', now(), 'reason', left(coalesce(p_reason, ''), 200)))
   where owner = b.owner and code = v_code and status in ('nuevo', 'cargado') and regexp_replace(coalesce(data->>'dni', ''), '\D', '', 'g') = v_dni;
  get diagnostics n = row_count;
  if n = 0 then return f || jsonb_build_object('ok', false, 'msg', 'No se pudo cancelar. Comunicate con el consultorio.'); end if;
  return f || jsonb_build_object('canceled', true, 'can_cancel', false);
end $$;

revoke all on function public.ov_booking_find(text, text, text, text) from public;
revoke all on function public.ov_booking_cancel(text, text, text, text, text) from public;
grant execute on function public.ov_booking_find(text, text, text, text) to anon, authenticated;
grant execute on function public.ov_booking_cancel(text, text, text, text, text) to anon, authenticated;

-- La app toma las cancelaciones de a una vez (si hay dos equipos abiertos, no se duplican)
create or replace function public.ov_booking_claim_cancels() returns setof public.ov_booking_req
language sql security definer set search_path = public as $$
  update public.ov_booking_req set status = 'cancelado' where owner = public.ov_owner() and status = 'cancelar' returning *;
$$;
revoke all on function public.ov_booking_claim_cancels() from public, anon;
grant execute on function public.ov_booking_claim_cancels() to authenticated;

-- Aviso al teléfono del consultorio cuando un paciente cancela
create or replace function public.ov_push_enq_booking_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelar' and old.status is distinct from 'cancelar' then
    if exists (select 1 from public.ov_push_tokens t where t.owner = new.owner) or exists (select 1 from public.ov_wpush_subs w where w.owner = new.owner) then
      insert into public.ov_push_q (owner, k, new_v) values (new.owner, 'booking', new.data || jsonb_build_object('cancelled', true));
      perform public.ov_push_wake();
    end if;
  end if;
  return new;
end $$;
drop trigger if exists ov_push_booking_cancel_trg on public.ov_booking_req;
create trigger ov_push_booking_cancel_trg after update on public.ov_booking_req
  for each row execute function public.ov_push_enq_booking_cancel();
