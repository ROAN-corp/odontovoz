-- =============================================================================
-- OdontoVoz · todo lo pendiente para correr en Supabase (versiones 1.48 a 1.54)
-- Pegar TODO en Supabase › SQL Editor y tocar Run. Se puede volver a correr sin problema.
-- Tiene 3 partes, en este orden:
--   1) Avisos con la app cerrada en iPhone, iPad y PC (Web Push)
--   2) Vincular el usuario de otro consultorio con la cuenta propia
--   3) Datos propios de cada profesional (matrícula, sello, firma) y pagos de alquiler
-- Necesita que ya estén corridos push.sql y vinculos.sql (los de antes).
-- =============================================================================

-- ########## PARTE 1 · webpush.sql ##########
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

-- ########## PARTE 2 · vincular-usuario.sql ##########
-- =====================================================================
-- OdontoVoz 1.49 · pasar el usuario de otro consultorio a mi cuenta
-- Caso: un odontólogo entra a OdontoVoz con un usuario del equipo que le dio otro consultorio (sin correo) y
-- ahora tiene su propia cuenta. Con esto vincula los dos: el acceso a ese consultorio pasa a su cuenta nueva
-- (mismo puesto, mismo profesional, mismo consultorio) y desde ahí elige dónde trabajar en «Dónde trabajás».
-- Correr una vez en Supabase › SQL Editor (después de vinculos.sql). Se puede volver a correr sin problema.
--
-- Cómo funciona (los dos tienen que estar de acuerdo, así nadie se apropia del acceso de otro):
--  1) Con la cuenta nueva se pide un código de un solo uso (ov_link_start), que vence a los 15 minutos.
--  2) Con el usuario viejo se entrega ese código (ov_link_accept): el acceso de ese usuario a cada consultorio
--     pasa a la cuenta nueva y el usuario viejo queda sin acceso. No se pierde nada de lo hecho: las notas y los
--     turnos están atados al profesional del consultorio, no al usuario.
--  3) El dueño del consultorio puede quitarle el acceso a la cuenta nueva cuando quiera, igual que antes.
-- =====================================================================

create table if not exists public.ov_link_codes (
  code       text primary key,
  new_uid    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes',
  used_at    timestamptz
);
alter table public.ov_link_codes enable row level security;
revoke all on public.ov_link_codes from anon, authenticated;

-- 1) la cuenta nueva pide el código
create or replace function public.ov_link_start() returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text; uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok', false, 'msg', 'Ingresá con tu cuenta.'); end if;
  delete from public.ov_link_codes where new_uid = uid or expires_at < now() - interval '1 day';
  c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.ov_link_codes (code, new_uid) values (c, uid);
  return jsonb_build_object('ok', true, 'code', c);
end $$;
revoke all on function public.ov_link_start() from public, anon;
grant execute on function public.ov_link_start() to authenticated;

-- 2) el usuario viejo lo entrega: su acceso pasa a la cuenta nueva
create or replace function public.ov_link_accept(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l public.ov_link_codes; s uuid := auth.uid(); n int := 0; m record; em text;
begin
  if s is null then return jsonb_build_object('ok', false, 'msg', 'Falta ingresar.'); end if;
  select * into l from public.ov_link_codes where code = upper(trim(coalesce(p_code, ''))) and used_at is null and expires_at > now() for update;
  if not found then return jsonb_build_object('ok', false, 'msg', 'El código no sirve o venció. Pedí uno nuevo desde tu cuenta.'); end if;
  if l.new_uid = s then return jsonb_build_object('ok', false, 'msg', 'Es la misma cuenta: tenés que usar el usuario del otro consultorio.'); end if;
  select email into em from auth.users where id = l.new_uid;
  for m in select * from public.ov_members where member = s and active loop
    if m.owner = l.new_uid then continue; end if;            -- la cuenta nueva no se suma a sí misma
    -- se copia todo lo del puesto (rol, consultorio, profesional, nombre, si es socio…); cambian la persona y el correo
    insert into public.ov_members
      select * from jsonb_populate_record(null::public.ov_members,
        to_jsonb(m) || jsonb_build_object('member', l.new_uid, 'email', em, 'username', null, 'sub', false, 'active', true, 'removed_at', null))
    on conflict (member, owner) do update set role = excluded.role, sede = excluded.sede, pro = excluded.pro, name = excluded.name,
      email = excluded.email, active = true, removed_at = null;
    update public.ov_members set active = false, removed_at = now() where member = s and owner = m.owner;
    update public.ov_devices set removed_at = now(), removed_by = 'vinculo' where owner = m.owner and member = s and removed_at is null;
    n := n + 1;
  end loop;
  if n = 0 then return jsonb_build_object('ok', false, 'msg', 'Ese usuario no tiene acceso activo a ningún consultorio.'); end if;
  update public.ov_link_codes set used_at = now() where code = l.code;
  return jsonb_build_object('ok', true, 'n', n);
end $$;
revoke all on function public.ov_link_accept(text) from public, anon;
grant execute on function public.ov_link_accept(text) to authenticated;

-- ########## PARTE 3 · perfil-profesional.sql ##########
-- =====================================================================
-- OdontoVoz 1.51 · cada profesional carga sus propios datos (matrícula, sello, firma)
-- Correr una vez en Supabase › SQL Editor (después de equipo.sql y empresa.sql). Se puede volver a correr.
--
-- Un usuario del equipo con puesto Profesional o Asistente no puede cambiar la lista de profesionales (`pros`),
-- que es del dueño. Para que cargue sus propios datos sin pasárselos a nadie, cada profesional tiene su registro
-- propio `pf:<id del profesional>`:
--   · lo escribe y lo lee ese usuario (el que está asignado a ese profesional),
--   · lo leen y escriben el dueño y la administración,
--   · nadie más del equipo lo ve (los sellos y las firmas no circulan).
-- Lo mismo vale para `rp:<id>`: los pagos del alquiler de ese profesional (lo que avisa que pagó y lo que cobra el centro).
-- El dueño recibe los datos en su cuenta automáticamente y los pasa a la ficha del profesional.
-- =====================================================================

create or replace function public.ov_key_ok(p_k text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare emp boolean; sc text; rl text := public.ov_role(); ms text;
begin
  /* datos propios de cada profesional (pf:) y pagos de su alquiler (rp:) */
  if p_k like 'pf:%' or p_k like 'rp:%' then
    if rl in ('dueno', 'admin') then return true; end if;
    return rl in ('profesional', 'asistente') and exists (
      select 1 from public.ov_members m
      where m.member = auth.uid() and m.owner = public.ov_owner() and m.active and m.pro is not null and m.pro = substr(p_k, 4));
  end if;
  /* personas del equipo: según su puesto, en cualquier tipo de cuenta */
  select coalesce(a.empresa, false) into emp from public.ov_accounts a where a.owner = public.ov_owner();
  if rl = 'admin' and p_k = 'empo' then return false; end if;
  if rl in ('recepcion', 'profesional', 'asistente') then
    if p_k in ('liq', 'empo', 'audit:todo') then return false; end if;
    /* la caja general: solo la recepción de una cuenta sin modo Empresa (en Empresa cada consultorio tiene la suya) */
    if p_k = 'cash' then return rl = 'recepcion' and not coalesce(emp, false); end if;
    ms := public.ov_member_sede();
    /* la caja del consultorio: la recepción de ese consultorio; los profesionales no ven la plata */
    if p_k like 'caja:%' then return rl = 'recepcion' and ms is not null and ms = substr(p_k, 6); end if;
    if p_k like 'audit:%' then return ms is not null and ms = substr(p_k, 7); end if;
  end if;
  /* equipos de consultorio en modo Empresa */
  if not coalesce(emp, false) then return true; end if;
  sc := public.ov_my_scope();
  if sc = 'todo' then return true; end if;
  if p_k in ('liq', 'empo', 'cash', 'audit:todo') then return false; end if;
  if p_k like 'audit:%' then return sc is not null and sc = 'sede:' || substr(p_k, 7); end if;
  if p_k like 'caja:%' then return sc is not null and sc = 'sede:' || substr(p_k, 6); end if;
  return true;
end $$;
grant execute on function public.ov_key_ok(text) to authenticated;
