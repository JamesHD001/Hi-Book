begin;

-- The post composer stores canonical paths as posts/{user_id}/{post_id}/{media_id}.webp.
-- storage.foldername(name) returns folder segments only (it excludes the filename),
-- so the canonical path has three folder segments: posts, user_id, and post_id.
-- Keep the Storage RLS contract aligned with create_post() while validating the
-- UUID media filename separately.

drop policy if exists posts_insert_own on storage.objects;
drop policy if exists posts_update_own on storage.objects;
drop policy if exists posts_delete_own on storage.objects;

create policy posts_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'posts'
  and (storage.foldername(name))[1] = 'posts'
  and (storage.foldername(name))[2] = auth.uid()::text
  and array_length(storage.foldername(name), 1) >= 3
  and (storage.foldername(name))[3]::uuid is not null
  and storage.filename(name) ~ '^[0-9a-fA-F-]{36}\\.webp$'
  and split_part(storage.filename(name), '.', 1)::uuid is not null
);

create policy posts_update_own on storage.objects
for update to authenticated
using (
  bucket_id = 'posts'
  and (storage.foldername(name))[1] = 'posts'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'posts'
  and (storage.foldername(name))[1] = 'posts'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy posts_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'posts'
  and (storage.foldername(name))[1] = 'posts'
  and (storage.foldername(name))[2] = auth.uid()::text
);

commit;
