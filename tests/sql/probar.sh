#!/usr/bin/env bash
# Prueba de los SQL de Supabase en una base común (PostgreSQL), con las piezas de Supabase simuladas (stubs.sql).
# 1) Se aplican todos en orden sobre una base vacía.  2) ov_health() tiene que dar ok.
# 3) Cada archivo se vuelve a correr SOLO, como haría alguien por error, y ov_health() tiene que seguir en ok (no se pisan los nuevos).
# 4) Se rompe una función a propósito y ov_health() tiene que avisar.
# Uso:  bash tests/sql/probar.sh      (con psql configurado: PGHOST/PGUSER/PGPASSWORD, o  su postgres -c "bash tests/sql/probar.sh")
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; SQL="$HERE/../../supabase"; DB="${DB:-ovtest}"; T="$(mktemp -d)"; FALLAS=0; OKS=0
ok() { if [ "$1" = "0" ]; then OKS=$((OKS+1)); [ -n "${VERBOSE:-}" ] && echo "OK   $2"; else FALLAS=$((FALLAS+1)); echo "FALLA $2"; [ -n "${3:-}" ] && echo "$3" | head -8; fi; }
P() { psql -q -X -v ON_ERROR_STOP=1 -d "$DB" "$@"; }
archivo() { sed '/create extension if not exists pg_net/d' "$SQL/$1.sql" > "$T/$1.sql"; echo "$T/$1.sql"; }
FILES=$(grep -v '^#' "$HERE/orden.txt" | grep -v '^$')
psql -q -X -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null 2>&1 || { echo "No se pudo crear la base de prueba"; exit 2; }
P -f "$HERE/stubs.sql" >/dev/null 2>"$T/e"; ok $? "se arman las piezas de Supabase simuladas" "$(cat "$T/e")"
for f in $FILES; do P -f "$(archivo $f)" >/dev/null 2>"$T/e"; ok $? "se aplica $f.sql en una base nueva" "$(cat "$T/e")"; done
# huella del estado: todas las funciones, reglas de acceso y avisos de cambios. Si volver a correr un archivo la cambia, pisó algo.
huella() { P -At -c "select md5(coalesce((select string_agg(p.oid::regprocedure::text || p.prosrc, '|' order by p.oid::regprocedure::text) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'), '') || coalesce((select string_agg(schemaname || tablename || policyname || cmd || coalesce(qual, '') || coalesce(with_check, '') || roles::text, '|' order by schemaname, tablename, policyname) from pg_policies where schemaname in ('public', 'storage')), '') || coalesce((select string_agg(pg_get_triggerdef(t.oid), '|' order by t.tgname) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where not t.tgisinternal and n.nspname = 'public'), ''))" 2>/dev/null; }
salud() { P -At -c "select (ov_health()->>'ok')" 2>/dev/null; }
detalle() { P -At -c "select ov_health()->'faltan'" 2>&1; }
[ "$(salud)" = "true" ]; ok $? "ov_health() da ok con todo aplicado" "$(detalle)"
BASE="$(huella)"
for f in $FILES; do
  [ "$f" = "salud" ] && continue
  P -f "$(archivo $f)" >/dev/null 2>"$T/e"; ok $? "se puede volver a correr $f.sql" "$(cat "$T/e")"
  [ "$(salud)" = "true" ]; ok $? "después de volver a correr $f.sql ov_health() sigue ok" "$(detalle)"
  [ "$(huella)" = "$BASE" ]; ok $? "volver a correr $f.sql no cambió nada de lo instalado (no pisó versiones nuevas)"
  BASE="$(huella)"
done
P -c "create or replace function public.ov_key_ok(p_k text) returns boolean language sql as \$\$ select true \$\$;" >/dev/null 2>&1
[ "$(salud)" = "false" ] && detalle | grep -q "ov_key_ok"; ok $? "ov_health() avisa si una función queda en versión vieja"
P -f "$(archivo perfil-profesional)" >/dev/null 2>&1; [ "$(salud)" = "true" ]; ok $? "volver a correr el archivo nuevo repara el aviso"
P -c "grant select on public.ov_wpush_vapid to authenticated" >/dev/null 2>&1; [ "$(salud)" = "false" ]; ok $? "ov_health() avisa si la clave privada de los avisos queda legible"
P -c "revoke select on public.ov_wpush_vapid from authenticated" >/dev/null 2>&1
# saldo de hojas con IA, historial y uso (ia-uso.sql)
P -c "insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@x.com') on conflict do nothing" >/dev/null 2>&1
P -c "insert into public.ov_accounts (owner, email) values ('11111111-1111-1111-1111-111111111111', 'a@x.com') on conflict do nothing" >/dev/null 2>&1
[ "$(P -At -c "select public.ov_ai_take('11111111-1111-1111-1111-111111111111', 1)")" = "-1" ]; ok $? "sin hojas cargadas la lectura con IA no anda"
P -c "update public.ov_accounts set ai_sheets = 5 where owner = '11111111-1111-1111-1111-111111111111'" >/dev/null 2>&1
[ "$(P -At -c "select public.ov_ai_take('11111111-1111-1111-1111-111111111111', 2)")" = "3" ]; ok $? "leer 2 hojas descuenta 2 y quedan 3"
[ "$(P -At -c "select public.ov_ai_take('11111111-1111-1111-1111-111111111111', 4)")" = "-1" ]; ok $? "no deja leer más hojas de las que hay"
[ "$(P -At -c "select public.ov_ai_give('11111111-1111-1111-1111-111111111111', 2)")" = "5" ]; ok $? "si la lectura falla se devuelven las hojas"
[ "$(P -At -c "select ai_sheets from public.ov_accounts where owner = '11111111-1111-1111-1111-111111111111'")" = "5" ]; ok $? "el saldo quedó en 5"
P -c "update public.ov_accounts set plan = 'basico', notes = 'prueba' where owner = '11111111-1111-1111-1111-111111111111'" >/dev/null 2>&1
[ "$(P -At -c "select count(*) from public.ov_audit where owner = '11111111-1111-1111-1111-111111111111'")" = "1" ]; ok $? "un cambio de plan queda en el historial"
P -c "update public.ov_accounts set ai_sheets = ai_sheets - 1 where owner = '11111111-1111-1111-1111-111111111111'" >/dev/null 2>&1
[ "$(P -At -c "select count(*) from public.ov_audit where owner = '11111111-1111-1111-1111-111111111111'")" = "1" ]; ok $? "el saldo de hojas no llena el historial de cuentas"
# cancelar un turno desde el turnero (turnero-cancelar.sql)
U=11111111-1111-1111-1111-111111111111
P -c "insert into public.ov_booking (owner, slug, data) values ('$U', 'abc123xyz', '{\"cancelHours\": 24, \"wa\": \"5492990000000\"}') on conflict (owner) do update set slug = excluded.slug, data = excluded.data, enabled = true" >/dev/null 2>&1
P -c "delete from public.ov_booking_req where owner = '$U'" >/dev/null 2>&1
P -c "insert into public.ov_booking_req (owner, code, status, data) values ('$U', 'OV-AAAA', 'cargado', jsonb_build_object('date', to_char(now() + interval '5 days', 'YYYY-MM-DD'), 'start', 600, 'pro', 'p1', 'type', 'control', 'first', 'Ana', 'dni', '12345678', 'phone', '2994561234')), ('$U', 'OV-BBBB', 'cargado', jsonb_build_object('date', to_char(now() at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD'), 'start', 1439, 'pro', 'p1', 'type', 'control', 'first', 'Beto', 'dni', '87654321', 'phone', '2990001111'))" >/dev/null 2>&1
Q() { P -At -c "select $1"; }
[ "$(Q "(public.ov_booking_find('abc123xyz', 'OV-AAAA', '99999999', '1234')->>'ok')")" = "false" ]; ok $? "el turno no aparece con un DNI que no es"
[ "$(Q "(public.ov_booking_find('abc123xyz', 'OV-AAAA', '12345678', '9999')->>'ok')")" = "false" ]; ok $? "con el código y el DNI pero sin los últimos 4 del celular no se ve el turno"
[ "$(Q "(public.ov_booking_find('abc123xyz', 'ov-aaaa', '12.345.678', '1234')->>'can_cancel')")" = "true" ]; ok $? "con el código y el DNI correctos se ve el turno y se puede cancelar"
[ "$(Q "(public.ov_booking_cancel('abc123xyz', 'OV-BBBB', '87654321', '1111')->>'ok')")" = "false" ]; ok $? "faltando menos de 24 h no deja cancelar online"
[ "$(Q "status from public.ov_booking_req where code = 'OV-BBBB'")" = "cargado" ]; ok $? "el turno de menos de 24 h queda como estaba"
[ "$(Q "(public.ov_booking_cancel('abc123xyz', 'OV-AAAA', '12345678', '1234', 'no puedo')->>'canceled')")" = "true" ]; ok $? "el paciente cancela su turno"
[ "$(Q "status from public.ov_booking_req where code = 'OV-AAAA'")" = "cancelar" ]; ok $? "el pedido queda para que la app lo tome"
[ "$(Q "(public.ov_booking_cancel('abc123xyz', 'OV-AAAA', '12345678', '1234')->>'canceled')")" = "true" ]; ok $? "cancelar dos veces no da error"
[ "$(Q "count(*) from public.ov_booking_fail where owner = '$U'")" = "2" ]; ok $? "los intentos con datos equivocados quedan anotados para frenar abusos"
for i in 1 2 3 4 5 6 7 8 9 10; do P -c "insert into public.ov_booking_req (owner, code, status, data) values ('$U', 'OV-Z$i', 'cancelado', jsonb_build_object('date', to_char(now() + interval '9 days', 'YYYY-MM-DD'), 'start', 600, 'dni', '1', 'cancel', jsonb_build_object('at', now())))" >/dev/null 2>&1; done
P -c "insert into public.ov_booking_req (owner, code, status, data) values ('$U', 'OV-CCCC', 'cargado', jsonb_build_object('date', to_char(now() + interval '6 days', 'YYYY-MM-DD'), 'start', 600, 'pro', 'p1', 'type', 'control', 'first', 'Cleo', 'dni', '55555555', 'phone', '2995550000'))" >/dev/null 2>&1
[ "$(Q "(public.ov_booking_cancel('abc123xyz', 'OV-CCCC', '55555555', '0000')->>'ok')")" = "false" ]; ok $? "tope de seguridad: con 10 cancelaciones en el día no deja cancelar más online"
rm -rf "$T"; if [ "$FALLAS" = "0" ]; then echo "todo bien · $OKS pruebas"; else echo "$FALLAS FALLAS (de $((FALLAS+OKS)))"; exit 1; fi
