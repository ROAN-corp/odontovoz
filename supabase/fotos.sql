-- OdontoVoz · fotos y radiografías en la nube (Supabase Storage)
-- Cada cuenta guarda sus imágenes en su propia carpeta (ov-media/<id de usuario>/...).
-- Nadie más puede verlas. Con la suscripción vencida se pueden ver y descargar, pero no subir nuevas.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ov-media', 'ov-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "ov_media_read" on storage.objects;
drop policy if exists "ov_media_insert" on storage.objects;
drop policy if exists "ov_media_update" on storage.objects;
drop policy if exists "ov_media_delete" on storage.objects;
create policy "ov_media_read" on storage.objects for select to authenticated
  using (bucket_id = 'ov-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "ov_media_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'ov-media' and (storage.foldername(name))[1] = (select auth.uid())::text and public.ov_is_active());
create policy "ov_media_update" on storage.objects for update to authenticated
  using (bucket_id = 'ov-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'ov-media' and (storage.foldername(name))[1] = (select auth.uid())::text and public.ov_is_active());
create policy "ov_media_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'ov-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

select id, public, file_size_limit from storage.buckets where id = 'ov-media';
