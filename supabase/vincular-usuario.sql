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
