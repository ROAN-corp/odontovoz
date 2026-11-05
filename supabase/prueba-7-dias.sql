-- OdontoVoz · noviembre 2026: prueba gratis de 7 días; las primeras 50 cuentas nuevas, 14 días (lanzamiento).
-- Correr UNA vez en Supabase › SQL Editor. No toca las cuentas que ya existen.
alter table public.ov_accounts add column if not exists promo text;
alter table public.ov_accounts alter column trial_until set default (current_date + 7);

create or replace function public.ov_new_account() returns trigger
language plpgsql security definer set search_path = public as $$
declare usados int;
begin
  perform pg_advisory_xact_lock(4202611);
  select count(*) into usados from public.ov_accounts where promo = 'lanzamiento50';
  insert into public.ov_accounts (owner, email, trial_until, promo)
  values (new.id, new.email, current_date + case when usados < 50 then 14 else 7 end, case when usados < 50 then 'lanzamiento50' end)
  on conflict (owner) do nothing;
  return new;
end $$;

-- para ver cuántos lugares del lanzamiento quedan:
-- select 50 - count(*) as quedan from public.ov_accounts where promo = 'lanzamiento50';
