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
rm -rf "$T"; if [ "$FALLAS" = "0" ]; then echo "todo bien · $OKS pruebas"; else echo "$FALLAS FALLAS (de $((FALLAS+OKS)))"; exit 1; fi
