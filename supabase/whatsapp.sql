-- OdontoVoz · Autogestión por WhatsApp (1.39.1) · menú con botones incluido + recordatorios automáticos como servicio pago
-- Correr en Supabase › SQL Editor DESPUÉS de turnero.sql, equipo.sql y vinculos.sql. Se puede volver a correr sin problema.
--
-- Cómo funciona:
--   · Cada cuenta que contrata el servicio conecta su número al canal OFICIAL de WhatsApp para empresas (Cloud API de Meta).
--   · Meta manda cada mensaje del paciente a la función wa-webhook (supabase/functions). La función responde con un menú
--     de botones (sin IA, sin costo), usando los mismos horarios libres que publica el turnero (ov_booking) y pidiendo
--     el turno con ov_booking_request. Las respuestas a quien escribió en las últimas 24 h no las cobra Meta.
--   · Los recordatorios automáticos (los únicos mensajes que cobra Meta) se activan aparte: rem_plan / rem_quota.
--   · Los turnos pedidos entran a la agenda igual que los del turnero (la app los toma con ov_booking_claim).
--   · La app arma la cola de recordatorios (ov_wa_out); wa-cron los manda en horario, con tope por día y respetando las bajas.
--   · Las respuestas a los recordatorios (Confirmo / Necesito cambiarlo) quedan en ov_wa_events y la app las aplica al turno.
--   · Las tablas solo las escriben las funciones del servidor; la app lee y usa las funciones de abajo.

-- ---------- número conectado y suscripción ----------
create table if not exists public.ov_wa (
  owner       uuid primary key references auth.users (id) on delete cascade,
  status      text not null default 'pendiente' check (status in ('pendiente', 'activo', 'pausado', 'baja')),
  plan        text not null default 'wa1',
  quota       int  not null default 100,          -- charlas por mes incluidas
  used        int  not null default 0,            -- charlas usadas en el mes
  period      text not null default to_char(now() at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM'),
  phone_id    text unique,                        -- phone_number_id de Meta
  waba_id     text,
  display     text,                               -- número que ve el paciente, ej. +54 9 299 412-3456
  quality     text,                               -- GREEN / YELLOW / RED (Meta)
  tier        text,                               -- límite de mensajes de Meta
  out_paused  boolean not null default false,     -- se frenan los mensajes salientes (calidad baja o a mano)
  cfg         jsonb not null default '{}'::jsonb, -- lo que responde el asistente (lo arma la app)
  updated_at  timestamptz not null default now()
);
-- recordatorios automáticos (servicio pago): plan, cupo por mes y uso
alter table public.ov_wa add column if not exists rem_plan text;              -- null = sin recordatorios automáticos; r1 / r2 / r3
alter table public.ov_wa add column if not exists rem_quota int not null default 0;
alter table public.ov_wa add column if not exists rem_used int not null default 0;
alter table public.ov_wa add column if not exists rem_period text;
alter table public.ov_wa alter column plan set default 'base';
alter table public.ov_wa alter column quota set default 100000;
alter table public.ov_wa enable row level security;
drop policy if exists "ov_wa_read" on public.ov_wa;
create policy "ov_wa_read" on public.ov_wa for select to authenticated using (owner = public.ov_owner() or public.ov_is_admin());
grant select on public.ov_wa to authenticated;
revoke all on public.ov_wa from anon;

-- ---------- conversaciones ----------
create table if not exists public.ov_wa_chats (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users (id) on delete cascade,
  wa_id      text not null,                         -- teléfono del paciente (formato de WhatsApp, ej. 5492994123456)
  name       text,
  mode       text not null default 'bot' check (mode in ('bot', 'humano')),
  opt_out    boolean not null default false,        -- pidió no recibir más mensajes
  last_in    timestamptz,                           -- último mensaje del paciente (ventana de 24 h)
  last_at    timestamptz not null default now(),
  unread     int not null default 0,
  last_text  text,
  need       text,                                  -- por qué pide una persona
  unique (owner, wa_id)
);
alter table public.ov_wa_chats add column if not exists state jsonb not null default '{}'::jsonb;   -- paso del menú
create index if not exists ov_wa_chats_owner on public.ov_wa_chats (owner, last_at desc);
alter table public.ov_wa_chats enable row level security;
drop policy if exists "ov_wa_chats_read" on public.ov_wa_chats;
create policy "ov_wa_chats_read" on public.ov_wa_chats for select to authenticated using (owner = public.ov_owner());
grant select on public.ov_wa_chats to authenticated;
revoke all on public.ov_wa_chats from anon;

create table if not exists public.ov_wa_msgs (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users (id) on delete cascade,
  chat       uuid not null references public.ov_wa_chats (id) on delete cascade,
  dir        text not null check (dir in ('in', 'out')),
  who        text not null default 'paciente' check (who in ('paciente', 'bot', 'persona', 'sistema')),
  body       text not null default '',
  wamid      text,
  status     text,                                  -- sent / delivered / read / failed
  created_at timestamptz not null default now()
);
create index if not exists ov_wa_msgs_chat on public.ov_wa_msgs (chat, created_at);
create index if not exists ov_wa_msgs_wamid on public.ov_wa_msgs (wamid);
alter table public.ov_wa_msgs enable row level security;
drop policy if exists "ov_wa_msgs_read" on public.ov_wa_msgs;
create policy "ov_wa_msgs_read" on public.ov_wa_msgs for select to authenticated using (owner = public.ov_owner());
grant select on public.ov_wa_msgs to authenticated;
revoke all on public.ov_wa_msgs from anon;

-- ---------- cola de recordatorios (la arma la app; la manda wa-cron) ----------
create table if not exists public.ov_wa_out (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,
  appt        text not null,                        -- id del turno en la app
  kind        text not null default 'recordatorio',
  wa_id       text not null,
  params      jsonb not null default '{}'::jsonb,   -- nombre, fecha, hora, profesional
  send_after  timestamptz not null,
  status      text not null default 'cola' check (status in ('cola', 'enviado', 'fallo', 'omitido')),
  why         text,
  sent_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (owner, appt, kind)
);
alter table public.ov_wa_out add column if not exists sent_at timestamptz;
create index if not exists ov_wa_out_due on public.ov_wa_out (status, send_after);
alter table public.ov_wa_out enable row level security;
drop policy if exists "ov_wa_out_read" on public.ov_wa_out;
create policy "ov_wa_out_read" on public.ov_wa_out for select to authenticated using (owner = public.ov_owner());
grant select on public.ov_wa_out to authenticated;
revoke all on public.ov_wa_out from anon;

-- ---------- respuestas a recordatorios para aplicar en la agenda ----------
create table if not exists public.ov_wa_events (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,
  appt        text,
  kind        text not null check (kind in ('confirma', 'cambia', 'baja', 'persona')),
  wa_id       text,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists ov_wa_events_owner on public.ov_wa_events (owner, done);
alter table public.ov_wa_events enable row level security;
drop policy if exists "ov_wa_events_read" on public.ov_wa_events;
create policy "ov_wa_events_read" on public.ov_wa_events for select to authenticated using (owner = public.ov_owner());
grant select on public.ov_wa_events to authenticated;
revoke all on public.ov_wa_events from anon;

-- ---------- funciones para la app ----------
-- estado del servicio de mi cuenta (null si no está contratado)
create or replace function public.ov_wa_me() returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(w) - 'waba_id' from public.ov_wa w where w.owner = public.ov_owner();
$$;

-- guardar lo que responde el asistente (dueño o administración)
create or replace function public.ov_wa_cfg_set(p_cfg jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.ov_role(), 'dueno') not in ('dueno', 'admin') then raise exception 'sin permiso'; end if;
  update public.ov_wa set cfg = coalesce(p_cfg, '{}'::jsonb), updated_at = now() where owner = public.ov_owner();
end $$;

-- pasar una charla a una persona o devolverla al asistente; marcar como leída
create or replace function public.ov_wa_take(p_chat uuid, p_mode text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_mode not in ('bot', 'humano', 'leido') then raise exception 'modo inválido'; end if;
  if p_mode = 'leido' then
    update public.ov_wa_chats set unread = 0 where id = p_chat and owner = public.ov_owner();
  else
    update public.ov_wa_chats set mode = p_mode, unread = 0, need = case when p_mode = 'bot' then null else need end
    where id = p_chat and owner = public.ov_owner();
  end if;
end $$;

-- frenar o reanudar los mensajes salientes (recordatorios)
create or replace function public.ov_wa_out_pause(p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.ov_role(), 'dueno') not in ('dueno', 'admin') then raise exception 'sin permiso'; end if;
  update public.ov_wa set out_paused = p_on, updated_at = now() where owner = public.ov_owner();
end $$;

-- encolar recordatorios: [{appt, wa_id, params, send_after}] (si ya existe, no se duplica)
create or replace function public.ov_wa_queue(p_items jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare o uuid := public.ov_owner(); n int := 0; it jsonb;
begin
  if o is null or not exists (select 1 from public.ov_wa where owner = o and status = 'activo' and rem_plan is not null) then return 0; end if;
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if exists (select 1 from public.ov_wa_chats c where c.owner = o and c.wa_id = it->>'wa_id' and c.opt_out) then continue; end if;
    insert into public.ov_wa_out (owner, appt, kind, wa_id, params, send_after)
    values (o, left(it->>'appt', 60), coalesce(it->>'kind', 'recordatorio'), left(regexp_replace(it->>'wa_id', '\D', '', 'g'), 20),
            coalesce(it->'params', '{}'::jsonb), (it->>'send_after')::timestamptz)
    on conflict (owner, appt, kind) do nothing;
    if found then n := n + 1; end if;
  end loop;
  return n;
end $$;

-- sacar de la cola un recordatorio (turno borrado, cambiado o cancelado)
create or replace function public.ov_wa_unqueue(p_appt text) returns void
language sql security definer set search_path = public as $$
  delete from public.ov_wa_out where owner = public.ov_owner() and appt = p_appt and status = 'cola';
$$;

-- tomar las respuestas a recordatorios para aplicarlas en la agenda (una sola vez)
create or replace function public.ov_wa_events_claim() returns setof public.ov_wa_events
language sql security definer set search_path = public as $$
  update public.ov_wa_events set done = true where owner = public.ov_owner() and not done returning *;
$$;

-- panel de licencias: dar de alta, conectar el número o activar los recordatorios pagos de una cuenta
drop function if exists public.ov_wa_admin_set(uuid, text, text, int, text, text, text);
create or replace function public.ov_wa_admin_set(p_owner uuid, p_status text, p_rem_plan text, p_rem_quota int,
  p_phone_id text default null, p_waba_id text default null, p_display text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.ov_is_admin() then raise exception 'solo administración'; end if;
  insert into public.ov_wa (owner, status, rem_plan, rem_quota, phone_id, waba_id, display)
  values (p_owner, coalesce(p_status, 'pendiente'), nullif(p_rem_plan, ''), coalesce(p_rem_quota, 0), nullif(p_phone_id, ''), nullif(p_waba_id, ''), nullif(p_display, ''))
  on conflict (owner) do update set status = coalesce(p_status, ov_wa.status), rem_plan = nullif(p_rem_plan, ''), rem_quota = coalesce(p_rem_quota, ov_wa.rem_quota),
    phone_id = coalesce(nullif(p_phone_id, ''), ov_wa.phone_id), waba_id = coalesce(nullif(p_waba_id, ''), ov_wa.waba_id),
    display = coalesce(nullif(p_display, ''), ov_wa.display), updated_at = now();
end $$;

create or replace function public.ov_wa_admin_list() returns setof public.ov_wa
language sql stable security definer set search_path = public as $$
  select * from public.ov_wa where public.ov_is_admin() order by updated_at desc;
$$;

revoke all on function public.ov_wa_me(), public.ov_wa_cfg_set(jsonb), public.ov_wa_take(uuid, text), public.ov_wa_out_pause(boolean),
  public.ov_wa_queue(jsonb), public.ov_wa_unqueue(text), public.ov_wa_events_claim(),
  public.ov_wa_admin_set(uuid, text, text, int, text, text, text), public.ov_wa_admin_list() from public, anon;
grant execute on function public.ov_wa_me(), public.ov_wa_cfg_set(jsonb), public.ov_wa_take(uuid, text), public.ov_wa_out_pause(boolean),
  public.ov_wa_queue(jsonb), public.ov_wa_unqueue(text), public.ov_wa_events_claim(),
  public.ov_wa_admin_set(uuid, text, text, int, text, text, text), public.ov_wa_admin_list() to authenticated;


-- ---------- prueba con IA desde la app (wa-sim): tope de respuestas por cuenta y por día ----------
create table if not exists public.ov_wa_sim (
  owner uuid not null references auth.users (id) on delete cascade,
  day   text not null,
  n     int  not null default 0,
  primary key (owner, day)
);
alter table public.ov_wa_sim enable row level security;
revoke all on public.ov_wa_sim from anon, authenticated;
create or replace function public.ov_wa_sim_hit(p_owner uuid, p_day text) returns int
language sql security definer set search_path = public as $$
  insert into public.ov_wa_sim (owner, day, n) values (p_owner, p_day, 1)
  on conflict (owner, day) do update set n = ov_wa_sim.n + 1 returning n;
$$;
revoke all on function public.ov_wa_sim_hit(uuid, text) from public, anon, authenticated;

-- ---------- wa-cron cada 10 minutos (manda recordatorios y revisa la calidad del número) ----------
-- Requiere las extensiones pg_cron y pg_net (Database › Extensions). Reemplazá TU_CLAVE_CRON por la misma que cargues
-- en los secretos de las funciones como WA_CRON_KEY (una palabra larga inventada; no es ninguna clave de Supabase).
-- select cron.schedule('ov-wa-cron', '*/10 * * * *', $c$
--   select net.http_post(url := 'https://hcppfvioiaaejayzzhpa.supabase.co/functions/v1/wa-cron',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'x-ov-cron', 'TU_CLAVE_CRON'), body := '{}'::jsonb);
-- $c$);
