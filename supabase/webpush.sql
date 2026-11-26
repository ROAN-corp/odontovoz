-- =====================================================================
-- OdontoVoz 1.48 · Avisos con la app cerrada en iPhone, iPad, PC y Android sin el APK (Web Push)
-- Correr una vez en Supabase › SQL Editor (después de supabase/push.sql). Se puede volver a correr sin problema.
-- Si más adelante volvés a correr push.sql, corré también este archivo.
--
-- Cómo funciona:
--  1) Cada navegador que activa los avisos registra su suscripción (dirección + claves públicas) con ov_wpush_register,
--     atada a la persona, al lugar (dueño) y al equipo. Igual que los teléfonos con el APK (ov_push_tokens).
--  2) Los triggers de push.sql ahora también anotan el cambio en la cola cuando hay suscripciones web.
--  3) La función «push-hook» manda el aviso por Web Push. Las claves VAPID las crea la propia función
--     la primera vez que un navegador las pide y quedan en ov_wpush_vapid, que solo lee la clave de servicio.
-- =====================================================================

create table if not exists public.ov_wpush_subs (
  member     uuid not null,
  owner      uuid not null,
  device     text not null,
  endpoint   text not null,                 -- dirección del servicio de avisos del navegador (Apple, Google, Mozilla)
  p256dh     text not null,                 -- clave pública del navegador
  auth       text not null,                 -- secreto de la suscripción
  role       text,
  pro        text,
  sede       text,
  filter_pro text,
  updated_at timestamptz not null default now(),
  primary key (member, owner, device)
);
create index if not exists ov_wpush_subs_owner on public.ov_wpush_subs (owner);
create index if not exists ov_wpush_subs_endpoint on public.ov_wpush_subs (endpoint);
alter table public.ov_wpush_subs enable row level security;
drop policy if exists "ov_wpush_subs_mine" on public.ov_wpush_subs;
create policy "ov_wpush_subs_mine" on public.ov_wpush_subs for select to authenticated using (member = auth.uid());
revoke insert, update, delete on public.ov_wpush_subs from authenticated, anon;
revoke select on public.ov_wpush_subs from anon;
grant select (member, owner, device, role, pro, sede, filter_pro, updated_at) on public.ov_wpush_subs to authenticated;

-- claves del servidor para firmar los avisos (VAPID). Nadie de la app las lee: solo la función, con la clave de servicio.
create table if not exists public.ov_wpush_vapid (
  id         integer primary key check (id = 1),
  pub        text not null,
  jwk        jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.ov_wpush_vapid enable row level security;
revoke all on public.ov_wpush_vapid from authenticated, anon;

create or replace function public.ov_wpush_register(p_device text, p_endpoint text, p_p256dh text, p_auth text, p_filter_pro text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o uuid := public.ov_owner(); r text := public.ov_role(); m record;
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  if coalesce(p_device, '') = '' or coalesce(p_endpoint, '') = '' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = ''
     or length(p_endpoint) > 2048 or length(p_p256dh) > 256 or length(p_auth) > 256 or p_endpoint !~ '^https://' then
    return jsonb_build_object('ok', false);
  end if;
  select mm.pro, mm.sede into m from public.ov_members mm where mm.member = auth.uid() and mm.owner = o and mm.active limit 1;
  -- un mismo navegador no puede quedar anotado en dos cuentas o dos lugares a la vez
  delete from public.ov_wpush_subs where endpoint = p_endpoint and not (member = auth.uid() and owner = o and device = p_device);
  insert into public.ov_wpush_subs (member, owner, device, endpoint, p256dh, auth, role, pro, sede, filter_pro, updated_at)
  values (auth.uid(), o, p_device, p_endpoint, p_p256dh, p_auth, r, m.pro, m.sede, nullif(p_filter_pro, ''), now())
  on conflict (member, owner, device) do update set endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth,
    role = excluded.role, pro = excluded.pro, sede = excluded.sede, filter_pro = excluded.filter_pro, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.ov_wpush_register(text, text, text, text, text) from public, anon;
grant execute on function public.ov_wpush_register(text, text, text, text, text) to authenticated;

create or replace function public.ov_wpush_unregister(p_device text)
returns jsonb language sql security definer set search_path = public as $$
  with d as (delete from public.ov_wpush_subs where member = auth.uid() and device = p_device returning 1)
  select jsonb_build_object('ok', true, 'n', (select count(*) from d));
$$;
revoke all on function public.ov_wpush_unregister(text) from public, anon;
grant execute on function public.ov_wpush_unregister(text) to authenticated;

-- los triggers de push.sql ahora cuentan también las suscripciones web
create or replace function public.ov_push_enq_rec() returns trigger
language plpgsql security definer set search_path = public as $$
declare dev text;
begin
  if (new.k like 'day:%' or new.k = 'stock')
     and (tg_op = 'INSERT' or old.v is distinct from new.v)
     and (exists (select 1 from public.ov_push_tokens t where t.owner = new.owner)
          or exists (select 1 from public.ov_wpush_subs w where w.owner = new.owner)) then
    begin dev := nullif(current_setting('request.headers', true), '')::json->>'x-ov-device'; exception when others then dev := null; end;
    insert into public.ov_push_q (owner, k, device, by_uid, old_v, new_v)
    values (new.owner, new.k, dev, auth.uid(), case when tg_op = 'UPDATE' then old.v end, new.v);
    perform public.ov_push_wake();
  end if;
  return new;
end $$;

create or replace function public.ov_push_enq_booking() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.ov_push_tokens t where t.owner = new.owner)
     or exists (select 1 from public.ov_wpush_subs w where w.owner = new.owner) then
    insert into public.ov_push_q (owner, k, new_v) values (new.owner, 'booking', new.data);
    perform public.ov_push_wake();
  end if;
  return new;
end $$;
