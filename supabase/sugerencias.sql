-- OdontoVoz · comentarios y sugerencias desde Ayuda (1.10)
-- Correr en Supabase › SQL Editor. Se puede volver a correr sin problema.
create table if not exists public.ov_feedback (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner      uuid default auth.uid() references auth.users (id) on delete set null,
  email      text,
  kind       text not null default 'sugerencia' check (kind in ('sugerencia', 'problema', 'felicitacion', 'otro')),
  text       text not null check (length(text) between 3 and 2000),
  app        text,
  status     text not null default 'nuevo' check (status in ('nuevo', 'leido', 'hecho'))
);
alter table public.ov_feedback enable row level security;
drop policy if exists "ov_feedback_insert" on public.ov_feedback;
create policy "ov_feedback_insert" on public.ov_feedback for insert to authenticated with check (owner = auth.uid());
drop policy if exists "ov_feedback_admin" on public.ov_feedback;
create policy "ov_feedback_admin" on public.ov_feedback for select to authenticated using (public.ov_is_admin());
drop policy if exists "ov_feedback_admin_upd" on public.ov_feedback;
create policy "ov_feedback_admin_upd" on public.ov_feedback for update to authenticated using (public.ov_is_admin()) with check (public.ov_is_admin());
grant insert, select, update on public.ov_feedback to authenticated;
revoke all on public.ov_feedback from anon;
