-- Hi!Book 2.0 — private media storage security
-- Files are never public. Application/server code issues short-lived signed URLs
-- after the parent entity's authorization has been evaluated.

begin;

insert into storage.buckets (id, name, public)
values
  ('avatars','avatars',false),
  ('posts','posts',false),
  ('messages','messages',false)
on conflict (id) do update set public=false;

-- Remove broad policies if this migration is re-applied in development.
drop policy if exists avatars_insert_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;
drop policy if exists avatars_delete_own on storage.objects;
drop policy if exists avatars_select_own on storage.objects;

drop policy if exists posts_insert_own on storage.objects;
drop policy if exists posts_update_own on storage.objects;
drop policy if exists posts_delete_own on storage.objects;
drop policy if exists posts_select_authorized on storage.objects;

drop policy if exists messages_insert_own on storage.objects;
drop policy if exists messages_update_own on storage.objects;
drop policy if exists messages_delete_own on storage.objects;
drop policy if exists messages_select_participant on storage.objects;

-- ============================================================
-- AVATARS
-- ============================================================

create policy avatars_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id='avatars'
  and (storage.foldername(name))[1]=auth.uid()::text
);

create policy avatars_update_own on storage.objects
for update to authenticated
using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);

create policy avatars_delete_own on storage.objects
for delete to authenticated
using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);

-- Avatar reads are owner-only at Storage level. Public profile rendering uses a
-- trusted server endpoint to issue a short-lived signed URL after profile/privacy checks.
create policy avatars_select_own on storage.objects
for select to authenticated
using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);

-- ============================================================
-- POST MEDIA
-- ============================================================

create policy posts_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id='posts'
  and (storage.foldername(name))[1]=auth.uid()::text
  and array_length(storage.foldername(name),1) >= 3
  and (storage.foldername(name))[2]::uuid is not null
  and (storage.foldername(name))[3]::uuid is not null
);

create policy posts_update_own on storage.objects
for update to authenticated
using (bucket_id='posts' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='posts' and (storage.foldername(name))[1]=auth.uid()::text);

create policy posts_delete_own on storage.objects
for delete to authenticated
using (bucket_id='posts' and (storage.foldername(name))[1]=auth.uid()::text);

create policy posts_select_authorized on storage.objects
for select to authenticated
using (
  bucket_id='posts'
  and exists (
    select 1
    from public.post_media pm
    join public.posts p on p.id=pm.post_id
    where pm.storage_path=storage.objects.name
      and (
        p.user_id=auth.uid()
        or (
          p.status='PUBLISHED'
          and not public.is_blocked_between(p.user_id)
          and (
            p.visibility='PUBLIC'
            or (p.visibility='FOLLOWERS' and exists (
              select 1 from public.follows f
              where f.follower_id=auth.uid() and f.following_id=p.user_id
            ))
          )
        )
      )
  )
);

-- ============================================================
-- MESSAGE MEDIA
-- ============================================================

create policy messages_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id='messages'
  and (storage.foldername(name))[1]=auth.uid()::text
  and array_length(storage.foldername(name),1) >= 4
  and (storage.foldername(name))[2]::uuid is not null
  and (storage.foldername(name))[3]::uuid is not null
  and (storage.foldername(name))[4]::uuid is not null
);

create policy messages_update_own on storage.objects
for update to authenticated
using (bucket_id='messages' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='messages' and (storage.foldername(name))[1]=auth.uid()::text);

create policy messages_delete_own on storage.objects
for delete to authenticated
using (bucket_id='messages' and (storage.foldername(name))[1]=auth.uid()::text);

create policy messages_select_participant on storage.objects
for select to authenticated
using (
  bucket_id='messages'
  and exists (
    select 1
    from public.message_media mm
    join public.messages m on m.id=mm.message_id
    where mm.storage_path=storage.objects.name
      and public.is_conversation_participant(m.conversation_id)
  )
);

commit;
