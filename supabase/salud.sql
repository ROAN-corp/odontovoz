-- =====================================================================
-- OdontoVoz · chequeo de salud del servidor (ov_health)
-- Correr una vez en Supabase › SQL Editor (al final, después de todos los demás). Se puede volver a correr.
--
-- Devuelve {"ok": true} si todo lo importante está instalado en su versión nueva, o {"ok": false, "faltan": [...]}
-- con lo que falta o quedó en una versión vieja (por ejemplo, si alguien volvió a correr un SQL viejo).
-- Lo mira todos los días la prueba «Salud del servidor» de GitHub (.github/workflows/salud.yml): si algo falla,
-- GitHub avisa por mail. No devuelve datos de nadie: solo nombres de piezas técnicas.
-- Cada vez que un SQL nuevo reemplace una función de otro archivo, sumá acá su marca (ver tests/sql/).
-- =====================================================================

create or replace function public.ov_fn_has(p_fn text, p_marker text) returns text
language plpgsql stable security definer set search_path = public as $$
declare src text;
begin
  select p.prosrc into src from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = p_fn order by length(p.prosrc) desc limit 1;
  if src is null then return p_fn || ': no está instalada'; end if;
  if p_marker is not null and position(p_marker in src) = 0 then return p_fn || ': quedó en una versión vieja (falta «' || p_marker || '»)'; end if;
  return null;
end $$;
revoke all on function public.ov_fn_has(text, text) from public, anon, authenticated;

create or replace function public.ov_health() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare f text[] := '{}'; x text; t text;
begin
  /* funciones: tienen que existir y ser la versión nueva (la que tiene la marca) */
  foreach x in array array[
    public.ov_fn_has('ov_owner', 'ov_place_hdr'),                 -- varios lugares por cuenta (vinculos.sql)
    public.ov_fn_has('ov_role', 'ov_owner() = auth.uid()'),
    public.ov_fn_has('ov_member_sede', 'm.owner = public.ov_owner()'),
    public.ov_fn_has('ov_join_invite', 'on conflict (member, owner)'),
    public.ov_fn_has('ov_key_ok', '''pf:%'''),                    -- datos propios de cada profesional (perfil-profesional.sql)
    public.ov_fn_has('ov_rec_ok', '''aran'''),                    -- precios solo del dueño (permisos.sql)
    public.ov_fn_has('ov_pd_guard', 'r = ''asistente'' and'),     -- secretaría administra cobros (secretaria.sql)
    public.ov_fn_has('ov_push_enq_rec', 'ov_wpush_subs'),         -- avisos en iPhone/PC (webpush.sql)
    public.ov_fn_has('ov_push_enq_booking', 'ov_wpush_subs'),
    public.ov_fn_has('ov_whoami', 'places'), public.ov_fn_has('ov_whoami', 'socio'),
    public.ov_fn_has('ov_booking_find', 'cancelHours'), public.ov_fn_has('ov_booking_cancel', 'cancelar'), public.ov_fn_has('ov_booking_claim_cancels', 'cancelar'),  -- cancelar turno desde el turnero (turnero-cancelar.sql)
    public.ov_fn_has('ov_admin_accounts', 'ai_sheets'), public.ov_fn_has('ov_ai_take', 'ai_sheets'), public.ov_fn_has('ov_usage_add', 'ov_usage'),  -- saldo de hojas con IA y uso (ia-uso.sql)
    public.ov_fn_has('ov_push_register', null), public.ov_fn_has('ov_wpush_register', null), public.ov_fn_has('ov_wpush_unregister', null),
    public.ov_fn_has('ov_link_start', null), public.ov_fn_has('ov_link_accept', null), public.ov_fn_has('ov_new_account', null)
  ] loop if x is not null then f := array_append(f, x); end if; end loop;
  /* tablas que tienen que estar */
  foreach t in array array['ov_records', 'ov_accounts', 'ov_members', 'ov_invites', 'ov_devices', 'ov_push_tokens', 'ov_push_q', 'ov_wpush_subs', 'ov_wpush_vapid', 'ov_link_codes'] loop
    if to_regclass('public.' || t) is null then f := array_append(f, t || ': la tabla no existe'); end if;
  end loop;
  /* una persona puede estar en varios consultorios: la clave es (persona, dueño) */
  if to_regclass('public.ov_members') is not null and not exists (
      select 1 from pg_constraint c where c.conrelid = 'public.ov_members'::regclass and c.contype = 'p'
        and (select count(*) from unnest(c.conkey)) = 2) then f := array_append(f, 'ov_members: la clave primaria no es (persona, dueño)'::text); end if;
  /* seguridad: protección por filas prendida y las claves del servidor que nadie de la app puede leer */
  foreach t in array array['ov_records', 'ov_members', 'ov_wpush_subs', 'ov_wpush_vapid', 'ov_link_codes'] loop
    if to_regclass('public.' || t) is not null and not (select c.relrowsecurity from pg_class c where c.oid = ('public.' || t)::regclass) then f := array_append(f, t || ': le falta la protección por filas'); end if;
  end loop;
  if to_regclass('public.ov_wpush_vapid') is not null and (has_table_privilege('authenticated', 'public.ov_wpush_vapid', 'select') or has_table_privilege('anon', 'public.ov_wpush_vapid', 'select')) then f := array_append(f, 'ov_wpush_vapid: la clave privada de los avisos quedó legible desde la app'::text); end if;
  if to_regclass('public.ov_records') is not null and (select count(*) from pg_policies where schemaname = 'public' and tablename = 'ov_records') < 3 then f := array_append(f, 'ov_records: faltan reglas de acceso'::text); end if;
  if to_regclass('public.ov_records') is not null and not exists (select 1 from pg_trigger where tgrelid = 'public.ov_records'::regclass and tgname = 'ov_push_rec_trg') then f := array_append(f, 'ov_records: falta el aviso de cambios (ov_push_rec_trg)'::text); end if;
  if to_regclass('public.ov_records') is not null and not exists (select 1 from pg_trigger where tgrelid = 'public.ov_records'::regclass and tgname = 'ov_pd_guard_trg') then f := array_append(f, 'ov_records: falta la protección de las fichas (ov_pd_guard_trg)'::text); end if;
  return jsonb_build_object('ok', coalesce(array_length(f, 1), 0) = 0, 'faltan', to_jsonb(f), 'at', now());
end $$;
revoke all on function public.ov_health() from public;
grant execute on function public.ov_health() to anon, authenticated;
