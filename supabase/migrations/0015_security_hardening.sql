alter table public.users enable row level security;
alter table public.schools enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.resources enable row level security;
alter table public.resource_versions enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.class_resources enable row level security;
alter table public.class_posts enable row level security;
alter table public.school_messages enable row level security;
alter table public.school_chat_rooms enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists "users_dev_all" on public.users;
drop policy if exists "users_select_authenticated" on public.users;
create policy "users_select_authenticated"
on public.users
for select
using (auth.role() = 'authenticated');

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users
for insert
with check (id = auth.uid());

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "users_delete_own" on public.users;
create policy "users_delete_own"
on public.users
for delete
using (id = auth.uid());

drop policy if exists "schools_dev_all" on public.schools;
drop policy if exists "schools_read" on public.schools;
create policy "schools_read"
on public.schools
for select
using (true);

drop policy if exists "posts_dev_all" on public.posts;
drop policy if exists "posts_select_authenticated" on public.posts;
create policy "posts_select_authenticated"
on public.posts
for select
using (auth.role() = 'authenticated');

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own"
on public.posts
for insert
with check (user_id = auth.uid());

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own"
on public.posts
for delete
using (user_id = auth.uid());

drop policy if exists "comments_dev_all" on public.comments;
drop policy if exists "comments_select_authenticated" on public.comments;
create policy "comments_select_authenticated"
on public.comments
for select
using (auth.role() = 'authenticated');

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
on public.comments
for insert
with check (user_id = auth.uid());

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own"
on public.comments
for delete
using (user_id = auth.uid());

drop policy if exists "resources_dev_all" on public.resources;
drop policy if exists "resources_select_visible" on public.resources;
create policy "resources_select_visible"
on public.resources
for select
using (
  auth.role() = 'authenticated'
  and (
    resource_scope = 'common'
    or exists (
      select 1
      from public.users viewer
      where viewer.id = auth.uid()
        and viewer.school_id = resources.school_id
    )
  )
);

drop policy if exists "resources_insert_own" on public.resources;
create policy "resources_insert_own"
on public.resources
for insert
with check (
  user_id = auth.uid()
  and (
    resource_scope = 'common'
    or (
      school_id is not null
      and exists (
        select 1
        from public.users viewer
        where viewer.id = auth.uid()
          and viewer.school_id = resources.school_id
      )
    )
  )
);

drop policy if exists "resources_delete_own" on public.resources;
create policy "resources_delete_own"
on public.resources
for delete
using (user_id = auth.uid());

drop policy if exists "resource_versions_dev_all" on public.resource_versions;
drop policy if exists "resource_versions_select_visible" on public.resource_versions;
create policy "resource_versions_select_visible"
on public.resource_versions
for select
using (
  exists (
    select 1
    from public.resources resource_record
    where resource_record.id = resource_versions.resource_id
      and (
        resource_record.resource_scope = 'common'
        or exists (
          select 1
          from public.users viewer
          where viewer.id = auth.uid()
            and viewer.school_id = resource_record.school_id
        )
      )
  )
);

drop policy if exists "resource_versions_insert_allowed" on public.resource_versions;
create policy "resource_versions_insert_allowed"
on public.resource_versions
for insert
with check (
  exists (
    select 1
    from public.resources resource_record
    where resource_record.id = resource_versions.resource_id
      and resource_record.user_id = auth.uid()
  )
);

drop policy if exists "resource_versions_delete_allowed" on public.resource_versions;
create policy "resource_versions_delete_allowed"
on public.resource_versions
for delete
using (
  exists (
    select 1
    from public.resources resource_record
    where resource_record.id = resource_versions.resource_id
      and resource_record.user_id = auth.uid()
  )
);

drop policy if exists "classes_dev_all" on public.classes;
drop policy if exists "classes_select_visible" on public.classes;
create policy "classes_select_visible"
on public.classes
for select
using (
  teacher_id = auth.uid()
  or exists (
    select 1
    from public.class_members member
    where member.class_id = classes.id
      and member.user_id = auth.uid()
  )
);

drop policy if exists "class_members_dev_all" on public.class_members;
drop policy if exists "class_members_select_visible" on public.class_members;
create policy "class_members_select_visible"
on public.class_members
for select
using (
  exists (
    select 1
    from public.classes class_record
    where class_record.id = class_members.class_id
      and (
        class_record.teacher_id = auth.uid()
        or exists (
          select 1
          from public.class_members member
          where member.class_id = class_members.class_id
            and member.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "class_resources_dev_all" on public.class_resources;
drop policy if exists "class_resources_select_visible" on public.class_resources;
create policy "class_resources_select_visible"
on public.class_resources
for select
using (
  exists (
    select 1
    from public.classes class_record
    where class_record.id = class_resources.class_id
      and (
        class_record.teacher_id = auth.uid()
        or exists (
          select 1
          from public.class_members member
          where member.class_id = class_resources.class_id
            and member.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "class_posts_dev_all" on public.class_posts;
drop policy if exists "class_posts_select_visible" on public.class_posts;
create policy "class_posts_select_visible"
on public.class_posts
for select
using (
  exists (
    select 1
    from public.classes class_record
    where class_record.id = class_posts.class_id
      and (
        class_record.teacher_id = auth.uid()
        or exists (
          select 1
          from public.class_members member
          where member.class_id = class_posts.class_id
            and member.user_id = auth.uid()
        )
      )
  )
);

revoke all on public.users from anon;
revoke all on public.posts from anon;
revoke all on public.comments from anon;
revoke all on public.resources from anon;
revoke all on public.resource_versions from anon;
revoke all on public.school_messages from anon;
revoke all on public.school_chat_rooms from anon;
revoke all on public.direct_messages from anon;
revoke all on public.classes from anon;
revoke all on public.class_members from anon;
revoke all on public.class_resources from anon;
revoke all on public.class_posts from anon;

grant select on public.schools to anon, authenticated;
grant select, insert, update, delete on public.users to authenticated;
grant select, insert, delete on public.posts to authenticated;
grant select, insert, delete on public.comments to authenticated;
grant select, insert, delete on public.resources to authenticated;
grant select, insert, delete on public.resource_versions to authenticated;
grant select, insert, delete on public.school_messages to authenticated;
grant select, insert, delete on public.school_chat_rooms to authenticated;
grant select, insert, delete on public.direct_messages to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select, insert, update, delete on public.class_members to authenticated;
grant select, insert, update, delete on public.class_resources to authenticated;
grant select, insert, update, delete on public.class_posts to authenticated;

create or replace function public.toggle_post_reaction(
  target_post_id uuid,
  target_field text,
  actor_id uuid
)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  next_values uuid[];
begin
  if auth.uid() is distinct from actor_id then
    raise exception 'Not allowed';
  end if;

  if target_field not in ('likes', 'bookmarks') then
    raise exception 'Invalid reaction field';
  end if;

  execute format(
    'update public.posts
     set %1$I = case
       when $1 = any(coalesce(%1$I, ''{}''::uuid[])) then array_remove(coalesce(%1$I, ''{}''::uuid[]), $1)
       else array_append(coalesce(%1$I, ''{}''::uuid[]), $1)
     end
     where id = $2
     returning %1$I',
    target_field
  )
  into next_values
  using actor_id, target_post_id;

  if next_values is null then
    raise exception 'Post not found';
  end if;

  return next_values;
end;
$$;

create or replace function public.toggle_resource_reaction(
  target_resource_id uuid,
  target_field text,
  actor_id uuid
)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  next_values uuid[];
begin
  if auth.uid() is distinct from actor_id then
    raise exception 'Not allowed';
  end if;

  if target_field not in ('likes', 'bookmarks') then
    raise exception 'Invalid reaction field';
  end if;

  execute format(
    'update public.resources
     set %1$I = case
       when $1 = any(coalesce(%1$I, ''{}''::uuid[])) then array_remove(coalesce(%1$I, ''{}''::uuid[]), $1)
       else array_append(coalesce(%1$I, ''{}''::uuid[]), $1)
     end
     where id = $2
     returning %1$I',
    target_field
  )
  into next_values
  using actor_id, target_resource_id;

  if next_values is null then
    raise exception 'Resource not found';
  end if;

  return next_values;
end;
$$;

grant execute on function public.toggle_post_reaction(uuid, text, uuid) to authenticated;
grant execute on function public.toggle_resource_reaction(uuid, text, uuid) to authenticated;

drop policy if exists "resources_storage_dev_all" on storage.objects;
drop policy if exists "resources_storage_insert_authenticated" on storage.objects;
create policy "resources_storage_insert_authenticated"
on storage.objects
for insert
with check (
  bucket_id = 'resources'
  and auth.role() = 'authenticated'
  and array_length(storage.foldername(name), 1) >= 2
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "resources_storage_update_owner" on storage.objects;
create policy "resources_storage_update_owner"
on storage.objects
for update
using (
  bucket_id = 'resources'
  and owner = auth.uid()
)
with check (
  bucket_id = 'resources'
  and owner = auth.uid()
);

drop policy if exists "resources_storage_delete_owner" on storage.objects;
create policy "resources_storage_delete_owner"
on storage.objects
for delete
using (
  bucket_id = 'resources'
  and owner = auth.uid()
);

notify pgrst, 'reload schema';
