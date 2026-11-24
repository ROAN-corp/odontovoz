// Pasar historias de papel: prueba del SQL del saldo de hojas (supabase/hcpapel-saldo.sql) en un Postgres de verdad, en memoria.
// Necesita:  npm i --no-save @electric-sql/pglite@0.2
// Correr:    node tests/hc/saldo.test.mjs
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const sql = f => readFileSync(new URL('../../supabase/' + f, import.meta.url), 'utf8');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALLA') + ' ' + m); if (!c) fails++; };
process.on('uncaughtException', e => { console.log('ERROR: ' + String(e && e.message || e).slice(0, 300)); process.exit(1); });
process.on('unhandledRejection', e => { console.log('ERROR: ' + String(e && e.message || e).slice(0, 300)); process.exit(1); });
const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const err = async s => { try { await db.query(s); return null; } catch (e) { return String(e.message || e); } };

/* lo mínimo de Supabase que el SQL necesita: roles, auth.uid(), cuentas, administradores, ov_owner() y la tabla de uso diario real */
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  grant usage on schema public to anon, authenticated, service_role;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  create table public.ov_accounts (owner uuid primary key, email text);
  create table public.ov_admins (user_id uuid primary key);
  create function public.ov_is_admin() returns boolean language sql stable security definer as $$ select exists (select 1 from public.ov_admins where user_id = auth.uid()) $$;
  create function public.ov_owner() returns uuid language sql stable security definer as $$ select nullif(current_setting('test.owner', true), '')::uuid $$;
`);
await db.exec(sql('hcpapel.sql'));
await db.exec(sql('hcpapel-saldo.sql'));
await db.exec(sql('hcpapel-saldo.sql')); // se puede repetir sin problema
ok(true, 'el SQL corre dos veces seguidas sin error');

const A = '00000000-0000-0000-0000-0000000000a1', B = '00000000-0000-0000-0000-0000000000b2', ADM = '00000000-0000-0000-0000-0000000000ad', NOP = '00000000-0000-0000-0000-0000000000ff';
await db.exec(`insert into public.ov_accounts values ('${A}', 'a@x.com'), ('${B}', 'b@x.com'), ('${ADM}', 'adm@x.com'); insert into public.ov_admins values ('${ADM}');`);
const take = async (o, n) => +(await q(`select public.ov_ai_take('${o}', ${n}) as v`))[0].v;

/* 1) apagado por defecto */
ok(await take(A, 1) === -2, 'una cuenta sin el servicio: -2 (no activada)');
ok(await take(NOP, 1) === -2, 'una cuenta que ni existe: -2');
ok(await take(A, 0) === -2 && await take(A, -5) === -2, 'cantidades inválidas: no descuenta');

/* 2) cargar hojas */
ok((await err(`select public.ov_ai_grant('${NOP}', 500, 'x')`) || '').includes('No existe esa cuenta'), 'cargar a una cuenta que no existe da error (protege de un identificador mal copiado)');
ok((await err(`select public.ov_ai_grant('${A}', 0)`) || '').includes('cuántas'), 'cargar 0 da error');
ok(+(await q(`select public.ov_ai_grant('${A}', 500, 'IA 500 hojas, USD 49') as v`))[0].v === 500, 'cargar 500 deja 500');
ok(+(await q(`select public.ov_ai_grant('${A}', 100) as v`))[0].v === 600, 'cargar 100 más suma: 600');
let c = (await q(`select * from public.ov_ai_credit where owner = '${A}'`))[0];
ok(c.hojas === 600 && c.comprado === 600, 'saldo 600 y comprado 600');
ok((await q(`select count(*)::int n from public.ov_ai_ledger where owner = '${A}'`))[0].n === 2, 'cada carga queda en el registro');
ok((await q(`select nota from public.ov_ai_ledger where owner = '${A}' order by id limit 1`))[0].nota === 'IA 500 hojas, USD 49', 'con su nota del pago');

/* 3) descontar */
ok(await take(A, 2) === 598, 'leer 2 hojas deja 598');
ok(await take(A, 599) === -1, 'pedir más de lo que hay: -1 (sin hojas)');
ok((await q(`select hojas from public.ov_ai_credit where owner = '${A}'`))[0].hojas === 598, '… y no descuenta nada');
ok(await take(B, 1) === -2, 'otra cuenta sigue apagada');

/* 4) atomicidad: 30 lecturas a la vez con 10 hojas → exactamente 10 pasan */
await db.exec(`select public.ov_ai_grant('${B}', 10, 'prueba')`);
const res = await Promise.all(Array.from({ length: 30 }, () => take(B, 1)));
ok(res.filter(v => v >= 0).length === 10 && res.filter(v => v === -1).length === 20, 'con 10 hojas y 30 pedidos a la vez pasan 10 y 20 se rechazan');
ok((await q(`select hojas from public.ov_ai_credit where owner = '${B}'`))[0].hojas === 0, 'el saldo termina en 0, nunca negativo');
ok(await take(B, 1) === -1, 'activada pero sin hojas: -1 (no -2)');

/* 5) devolución */
ok(+(await q(`select public.ov_ai_refund('${B}', 3) as v`))[0].v === 3, 'devolver 3 hojas: 3');
c = (await q(`select * from public.ov_ai_credit where owner = '${B}'`))[0];
ok(c.hojas === 3 && c.comprado === 10, 'la devolución no cuenta como compra');
ok((await q(`select public.ov_ai_refund('${NOP}', 3) as v`))[0].v === null, 'devolver a una cuenta sin servicio no inventa saldo');

/* 6) corrección con negativo y piso en 0 */
ok(+(await q(`select public.ov_ai_grant('${B}', -2, 'me equivoqué') as v`))[0].v === 1, 'corregir con -2 resta');
ok(+(await q(`select public.ov_ai_grant('${B}', -50) as v`))[0].v === 0, 'nunca baja de 0');
ok((await q(`select comprado from public.ov_ai_credit where owner = '${B}'`))[0].comprado >= 0, 'comprado tampoco queda negativo');

/* 7) permisos: lo que puede y no puede cada uno */
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${A}', false);`);
ok((await err(`select public.ov_ai_take('${A}', 1)`) || '').includes('permission denied'), 'un usuario no puede descontarse hojas');
ok((await err(`select public.ov_ai_grant('${A}', 9999)`) || '').includes('permission denied'), 'un usuario no puede cargarse hojas');
ok((await err(`select public.ov_ai_refund('${A}', 9999)`) || '').includes('permission denied'), 'un usuario no puede devolverse hojas');
ok((await err(`select public.ov_ai_admin_grant('${A}', 9999)`) || '').includes('Solo administradores'), 'un usuario común no puede usar la carga del panel');
ok((await q(`select * from public.ov_ai_admin_list()`)).length === 0, 'un usuario común ve la lista del panel vacía');
ok((await q(`select * from public.ov_ai_admin_ledger('${A}')`)).length === 0, 'ni el registro de cargas');
ok((await err(`select * from public.ov_ai_credit`) || '').includes('permission denied'), 'ni las tablas directamente');
await db.exec(`select set_config('test.owner', '${A}', false)`);
let my = (await q(`select public.ov_ai_my() as v`))[0].v;
ok(my.activada === true && my.hojas === 598, 'ov_ai_my muestra el saldo de mi cuenta (598)');
await db.exec(`select set_config('test.owner', '${NOP}', false)`);
my = (await q(`select public.ov_ai_my() as v`))[0].v;
ok(my.activada === false && my.hojas === 0, 'ov_ai_my de una cuenta sin el servicio: no activada, 0');
await db.exec(`select set_config('request.jwt.claim.sub', '${ADM}', false)`);
ok(+(await q(`select public.ov_ai_admin_grant('${A}', 2000, 'USD 149') as v`))[0].v === 2598, 'un administrador carga 2.000 desde el panel (2598)');
const lst = await q(`select * from public.ov_ai_admin_list()`);
ok(lst.length === 2 && lst.some(r => r.email === 'a@x.com' && r.hojas === 2598), 'el administrador ve la lista con mails y saldos');
ok((await q(`select * from public.ov_ai_admin_ledger('${A}')`)).length === 3, 'y el registro de cargas de la cuenta');
await db.exec(`reset role`);
ok((await q(`select by from public.ov_ai_ledger where owner = '${A}' order by id desc limit 1`))[0].by === ADM, 'queda registrado qué administrador lo cargó');
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${ADM}', false);`);
await db.exec(`reset role; set role anon;`);
ok((await err(`select public.ov_ai_my()`) || '').includes('permission denied'), 'sin sesión no se puede nada');
ok((await err(`select public.ov_ai_admin_list()`) || '').includes('permission denied'), '… ni la lista');
await db.exec(`reset role; set role service_role;`);
ok(await take(A, 1) === 2597, 'la función del servidor (service_role) sí descuenta');
ok(+(await q(`select public.ov_ai_refund('${A}', 1) as v`))[0].v === 2598, '… y devuelve');
await db.exec(`reset role`);

/* 8) las hojas leídas salen del uso diario que ya existía */
await db.exec(`select public.ov_ai_hit('${A}', '2026-11-24', 'hc', 4); select public.ov_ai_hit('${A}', '2026-11-25', 'hc', 3);`);
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${ADM}', false);`);
ok(+(await q(`select leidas from public.ov_ai_admin_list() where email = 'a@x.com'`))[0].leidas === 7, 'la lista muestra las hojas leídas (7)');
await db.exec(`reset role`);

console.log(fails ? '\n' + fails + ' FALLA(S)' : '\nTodo bien');
process.exit(fails ? 1 : 0);
