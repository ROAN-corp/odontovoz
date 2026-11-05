-- OdontoVoz · consultorios por cuenta (modo profesional)
-- max_locs: cuántos consultorios puede cargar la cuenta (1 a 5).
-- Si está vacío: la prueba gratis y el plan Centro tienen 5; los demás planes, 1.
alter table public.ov_accounts add column if not exists max_locs int check (max_locs between 1 and 5);

drop function if exists public.ov_admin_accounts();
create function public.ov_admin_accounts() returns table (
  owner uuid, email text, plan text, status text, trial_until date, paid_until date, max_devices int, max_locs int, notes text,
  created_at timestamptz, last_sync timestamptz, records bigint, last_sign_in timestamptz
) language sql stable security definer set search_path = public as $$
  select a.owner, a.email, a.plan, a.status, a.trial_until, a.paid_until, a.max_devices, a.max_locs, a.notes, a.created_at,
         (select max(r.updated_at) from public.ov_records r where r.owner = a.owner),
         (select count(*) from public.ov_records r where r.owner = a.owner),
         u.last_sign_in_at
  from public.ov_accounts a join auth.users u on u.id = a.owner
  where public.ov_is_admin()
  order by a.created_at desc;
$$;
revoke all on function public.ov_admin_accounts() from public, anon;
grant execute on function public.ov_admin_accounts() to authenticated;

-- las cuentas de los socios: 5 consultorios
update public.ov_accounts a set max_locs = 5 from public.ov_admins ad where ad.user_id = a.owner;
select email, plan, max_locs from public.ov_accounts order by created_at;
