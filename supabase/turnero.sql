-- OdontoVoz · turnero online con link para pacientes (1.9)
-- Correr en Supabase › SQL Editor. Se puede volver a correr sin problema.
-- Cómo funciona:
--   · La app de cada cuenta publica sus horarios LIBRES (sin datos de pacientes) en ov_booking.
--   · El paciente abre turnos.html?c=CODIGO, ve esos horarios y pide uno: queda en ov_booking_req.
--   · La app de la cuenta toma los pedidos nuevos y los carga en la agenda como turnos «pendiente · online».
-- Nadie sin cuenta puede leer las tablas: el paciente solo usa las dos funciones públicas de abajo.

create table if not exists public.ov_booking (
  owner      uuid primary key references auth.users (id) on delete cascade,
  slug       text not null unique check (slug ~ '^[a-z0-9]{6,16}$'),
  enabled    boolean not null default true,
  data       jsonb not null default '{}'::jsonb,   -- nombre, dirección, profesionales, motivos y horarios libres
  updated_at timestamptz not null default now()
);
alter table public.ov_booking enable row level security;
drop policy if exists "ov_booking_own" on public.ov_booking;
create policy "ov_booking_own" on public.ov_booking for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
grant select, insert, update, delete on public.ov_booking to authenticated;
revoke all on public.ov_booking from anon;

create table if not exists public.ov_booking_req (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  status     text not null default 'nuevo' check (status in ('nuevo', 'cargado', 'rechazado')),
  code       text not null,
  data       jsonb not null                          -- día, hora, profesional, motivo y datos del paciente
);
create index if not exists ov_booking_req_owner on public.ov_booking_req (owner, status);
alter table public.ov_booking_req enable row level security;
drop policy if exists "ov_booking_req_own" on public.ov_booking_req;
create policy "ov_booking_req_own" on public.ov_booking_req for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
grant select, update, delete on public.ov_booking_req to authenticated;
revoke all on public.ov_booking_req from anon;

-- Pública: datos de la página de turnos (solo horarios libres)
create or replace function public.ov_booking_get(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select b.data || jsonb_build_object('updated_at', b.updated_at)
  from public.ov_booking b where b.slug = lower(p_slug) and b.enabled and public.ov_is_active(b.owner);
$$;

-- Pública: pedir un turno. Revisa que el horario siga libre, frena abusos y saca ese horario de la lista.
create or replace function public.ov_booking_request(p_slug text, p_req jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b public.ov_booking; k text; d text; t int; pro text; ok boolean; code text; ph text; dni text; n int;
  al constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  select * into b from public.ov_booking where slug = lower(p_slug) and enabled for update;
  if not found or not public.ov_is_active(b.owner) then return jsonb_build_object('ok', false, 'msg', 'Este turnero no está disponible.'); end if;
  k := p_req->>'type'; d := p_req->>'date'; t := (p_req->>'start')::int; pro := p_req->>'pro';
  ph := regexp_replace(coalesce(p_req->>'phone', ''), '\D', '', 'g'); dni := regexp_replace(coalesce(p_req->>'dni', ''), '\D', '', 'g');
  if length(coalesce(p_req->>'first', '')) < 2 or length(coalesce(p_req->>'last', '')) < 2 or length(dni) < 6 or length(ph) < 8 then
    return jsonb_build_object('ok', false, 'msg', 'Revisá nombre, apellido, DNI y teléfono.');
  end if;
  if d < to_char(now() at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD') then return jsonb_build_object('ok', false, 'msg', 'Esa fecha ya pasó.'); end if;
  -- el horario tiene que estar publicado como libre
  select exists (select 1 from jsonb_array_elements(coalesce(b.data->'slots'->k->d, '[]'::jsonb)) s where s->>0 = pro and (s->>1)::int = t) into ok;
  if not ok then return jsonb_build_object('ok', false, 'msg', 'Ese horario ya no está libre. Elegí otro.', 'taken', true); end if;
  -- límites: 3 pedidos por día por teléfono o DNI, 30 por hora por consultorio
  select count(*) into n from public.ov_booking_req r where r.owner = b.owner and r.created_at > now() - interval '1 day'
    and (regexp_replace(r.data->>'phone', '\D', '', 'g') = ph or regexp_replace(r.data->>'dni', '\D', '', 'g') = dni);
  if n >= 3 then return jsonb_build_object('ok', false, 'msg', 'Ya pediste varios turnos hoy. Si necesitás otro, comunicate con el consultorio.'); end if;
  select count(*) into n from public.ov_booking_req r where r.owner = b.owner and r.created_at > now() - interval '1 hour';
  if n >= 30 then return jsonb_build_object('ok', false, 'msg', 'Hay muchos pedidos en este momento. Probá en unos minutos.'); end if;
  code := 'OV-' || (select string_agg(substr(al, 1 + floor(random() * length(al))::int, 1), '') from generate_series(1, 4));
  insert into public.ov_booking_req (owner, code, data) values (b.owner, code, jsonb_build_object(
    'type', k, 'date', d, 'start', t, 'pro', pro, 'dur', coalesce((p_req->>'dur')::int, 30),
    'first', left(p_req->>'first', 60), 'last', left(p_req->>'last', 60), 'dni', left(dni, 12), 'phone', left(ph, 20),
    'email', left(coalesce(p_req->>'email', ''), 120), 'cov', left(coalesce(p_req->>'cov', ''), 60), 'note', left(coalesce(p_req->>'note', ''), 300)));
  -- se saca ese horario (y los que se pisan) de todos los motivos
  update public.ov_booking set data = jsonb_set(data, '{slots}', (
    select coalesce(jsonb_object_agg(kk, (
      select coalesce(jsonb_object_agg(dd, (
        select coalesce(jsonb_agg(s), '[]'::jsonb) from jsonb_array_elements(v2) s
        where not (dd = d and s->>0 = pro and (s->>1)::int < t + coalesce((p_req->>'dur')::int, 30) and t < (s->>1)::int + coalesce((s->>2)::int, 30)))), '{}'::jsonb)
      from jsonb_each(v1) as x2(dd, v2))), '{}'::jsonb)
    from jsonb_each(coalesce(data->'slots', '{}'::jsonb)) as x1(kk, v1)))
  where owner = b.owner;
  return jsonb_build_object('ok', true, 'code', code);
end $$;

revoke all on function public.ov_booking_get(text) from public;
revoke all on function public.ov_booking_request(text, jsonb) from public;
grant execute on function public.ov_booking_get(text) to anon, authenticated;
grant execute on function public.ov_booking_request(text, jsonb) to anon, authenticated;

-- La app toma los pedidos nuevos de a uno por vez (si hay dos equipos abiertos, no se duplican)
create or replace function public.ov_booking_claim() returns setof public.ov_booking_req
language sql security definer set search_path = public as $$
  update public.ov_booking_req set status = 'cargado' where owner = auth.uid() and status = 'nuevo' returning *;
$$;
revoke all on function public.ov_booking_claim() from public, anon;
grant execute on function public.ov_booking_claim() to authenticated;
