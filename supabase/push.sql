-- =====================================================================
-- OdontoVoz 1.47 · Notificaciones push al teléfono (con la app cerrada)
-- Correr una vez en Supabase › SQL Editor. Se puede volver a correr sin problema.
--
-- Cómo funciona:
--  1) Cada teléfono con la app instalada registra su «dirección» de notificaciones (token de Firebase)
--     con ov_push_register: queda atada a la persona, al lugar (dueño) y al equipo.
--  2) Cuando se guarda un día de la agenda o el stock, o entra un pedido del turnero online, un trigger
--     anota el cambio en la cola ov_push_q y despierta la función «push-hook» (pg_net).
--  3) La función compara antes y después (llegó un paciente, canceló, nota de otra persona, stock bajo,
--     turno online) y manda la notificación a los otros teléfonos del lugar, nunca al que hizo el cambio.
-- La cola solo la escriben los triggers y solo la lee la función (con la clave de servicio, que no sale del servidor).
-- =====================================================================

create extension if not exists pg_net with schema extensions;

create table if not exists public.ov_push_tokens (
  member     uuid not null,                 -- la persona (su usuario)
  owner      uuid not null,                 -- el lugar (dueño de los datos)
  device     text not null,                 -- el equipo (A.devId)
  token      text not null,                 -- dirección de Firebase de ese teléfono
  role       text,                          -- dueno / admin / recepcion / profesional / asistente
  pro        text,                          -- profesional del puesto (si es odontólogo del equipo)
  sede       text,                          -- consultorio del puesto (Empresa)
  filter_pro text,                          -- «Avisarme de los pacientes de…» (Avisos y sonidos)
  updated_at timestamptz not null default now(),
  primary key (member, owner, device)
);
create index if not exists ov_push_tokens_owner on public.ov_push_tokens (owner);
alter table public.ov_push_tokens enable row level security;
drop policy if exists "ov_push_tokens_mine" on public.ov_push_tokens;
create policy "ov_push_tokens_mine" on public.ov_push_tokens for select to authenticated using (member = auth.uid());
revoke insert, update, delete on public.ov_push_tokens from authenticated, anon;
grant select on public.ov_push_tokens to authenticated;

create or replace function public.ov_push_register(p_device text, p_token text, p_filter_pro text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o uuid := public.ov_owner(); r text := public.ov_role(); m record;
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  if coalesce(p_device, '') = '' or coalesce(p_token, '') = '' or length(p_token) > 4096 then return jsonb_build_object('ok', false); end if;
  select mm.pro, mm.sede into m from public.ov_members mm where mm.member = auth.uid() and mm.owner = o and mm.active limit 1;
  -- un mismo teléfono no puede quedar anotado en dos cuentas o dos lugares a la vez
  delete from public.ov_push_tokens where token = p_token and not (member = auth.uid() and owner = o and device = p_device);
  insert into public.ov_push_tokens (member, owner, device, token, role, pro, sede, filter_pro, updated_at)
  values (auth.uid(), o, p_device, p_token, r, m.pro, m.sede, nullif(p_filter_pro, ''), now())
  on conflict (member, owner, device) do update set token = excluded.token, role = excluded.role, pro = excluded.pro,
    sede = excluded.sede, filter_pro = excluded.filter_pro, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.ov_push_register(text, text, text) from public, anon;
grant execute on function public.ov_push_register(text, text, text) to authenticated;

create or replace function public.ov_push_unregister(p_device text)
returns jsonb language sql security definer set search_path = public as $$
  with d as (delete from public.ov_push_tokens where member = auth.uid() and device = p_device returning 1)
  select jsonb_build_object('ok', true, 'n', (select count(*) from d));
$$;
revoke all on function public.ov_push_unregister(text) from public, anon;
grant execute on function public.ov_push_unregister(text) to authenticated;

-- cola de cambios para avisar
create table if not exists public.ov_push_q (
  id     bigserial primary key,
  owner  uuid not null,
  k      text not null,
  device text,
  by_uid uuid,
  old_v  jsonb,
  new_v  jsonb,
  at     timestamptz not null default now()
);
alter table public.ov_push_q enable row level security;
revoke all on public.ov_push_q from authenticated, anon;

create or replace function public.ov_push_wake() returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://hcppfvioiaaejayzzhpa.supabase.co/functions/v1/push-hook',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 5000);
exception when others then null;  -- nunca frena el guardado
end $$;
revoke all on function public.ov_push_wake() from public, anon, authenticated;

create or replace function public.ov_push_enq_rec() returns trigger
language plpgsql security definer set search_path = public as $$
declare dev text;
begin
  if (new.k like 'day:%' or new.k = 'stock')
     and (tg_op = 'INSERT' or old.v is distinct from new.v)
     and exists (select 1 from public.ov_push_tokens t where t.owner = new.owner) then
    -- el equipo que hizo el cambio (encabezado x-ov-device que manda la app) no recibe su propio aviso
    begin dev := nullif(current_setting('request.headers', true), '')::json->>'x-ov-device'; exception when others then dev := null; end;
    insert into public.ov_push_q (owner, k, device, by_uid, old_v, new_v)
    values (new.owner, new.k, dev, auth.uid(), case when tg_op = 'UPDATE' then old.v end, new.v);
    perform public.ov_push_wake();
  end if;
  return new;
end $$;
drop trigger if exists ov_push_rec_trg on public.ov_records;
create trigger ov_push_rec_trg after insert or update on public.ov_records
  for each row execute function public.ov_push_enq_rec();

create or replace function public.ov_push_enq_booking() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.ov_push_tokens t where t.owner = new.owner) then
    insert into public.ov_push_q (owner, k, new_v) values (new.owner, 'booking', new.data);
    perform public.ov_push_wake();
  end if;
  return new;
end $$;
drop trigger if exists ov_push_booking_trg on public.ov_booking_req;
create trigger ov_push_booking_trg after insert on public.ov_booking_req
  for each row execute function public.ov_push_enq_booking();

-- la función toma lo pendiente (y la cola nunca crece: lo de más de un día se descarta)
create or replace function public.ov_push_claim(p_n integer default 50)
returns setof public.ov_push_q language plpgsql security definer set search_path = public as $$
begin
  delete from public.ov_push_q where at < now() - interval '1 day';
  return query
    delete from public.ov_push_q where id in (
      select id from public.ov_push_q order by id limit greatest(1, least(p_n, 200)) for update skip locked)
    returning *;
end $$;
revoke all on function public.ov_push_claim(integer) from public, anon, authenticated;
grant execute on function public.ov_push_claim(integer) to service_role;
