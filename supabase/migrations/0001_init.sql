create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key,
  email text,
  name text,
  subject text,
  grade text,
  avatar text,
  school_id uuid,
  created_at timestamp with time zone default now()
);

create table if not exists public.schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.posts (
  id uuid default uuid_generate_v4() primary key,
  content text,
  user_id uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default now(),
  likes uuid[] default '{}'::uuid[],
  bookmarks uuid[] default '{}'::uuid[]
);

create table if not exists public.comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  content text,
  created_at timestamp with time zone default now()
);

create table if not exists public.resources (
  id uuid default uuid_generate_v4() primary key,
  title text,
  description text,
  user_id uuid references public.users(id) on delete set null,
  school_id uuid,
  resource_scope text not null default 'school',
  file_type text,
  file_name text,
  tags text[] default '{}'::text[],
  likes uuid[] default '{}'::uuid[],
  bookmarks uuid[] default '{}'::uuid[],
  view_count integer not null default 0,
  download_count integer not null default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.resource_versions (
  id uuid default uuid_generate_v4() primary key,
  resource_id uuid references public.resources(id) on delete cascade,
  file_url text,
  storage_path text,
  created_at timestamp with time zone default now()
);

create table if not exists public.school_messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  room text not null default 'general',
  user_id uuid references public.users(id) on delete set null,
  content text,
  parent_id uuid references public.school_messages(id) on delete set null,
  attachment_url text,
  attachment_name text,
  attachment_type text check (attachment_type in ('image', 'file', 'link')),
  attachment_size bigint,
  created_at timestamp with time zone default now()
);

create table if not exists public.school_chat_rooms (
  id text primary key,
  school_id uuid references public.schools(id) on delete cascade,
  name text not null,
  type text not null default 'group' check (type in ('group', 'direct')),
  member_ids uuid[] not null default '{}',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default now()
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null references public.school_chat_rooms(id) on delete cascade,
  sender_id uuid references public.users(id) on delete cascade,
  receiver_id uuid references public.users(id) on delete cascade,
  content text,
  parent_id uuid references public.direct_messages(id) on delete set null,
  attachment_url text,
  attachment_name text,
  attachment_type text check (attachment_type in ('image', 'file', 'link')),
  attachment_size bigint,
  created_at timestamp with time zone default now()
);

alter table public.users
  drop constraint if exists users_school_id_fkey;

alter table public.users
  add constraint users_school_id_fkey
  foreign key (school_id)
  references public.schools(id)
  on delete set null;

alter table public.resources
  drop constraint if exists resources_school_id_fkey;

alter table public.resources
  add constraint resources_school_id_fkey
  foreign key (school_id)
  references public.schools(id)
  on delete set null;

create index if not exists users_school_id_idx on public.users (school_id);
create index if not exists resources_school_id_idx on public.resources (school_id);
create index if not exists resources_resource_scope_idx on public.resources (resource_scope);
create index if not exists school_messages_school_id_idx on public.school_messages (school_id);
create index if not exists school_messages_room_idx on public.school_messages (school_id, room, created_at);
create index if not exists school_messages_parent_id_idx on public.school_messages (parent_id);
create index if not exists school_chat_rooms_school_id_idx on public.school_chat_rooms (school_id, created_at);
create index if not exists direct_messages_conversation_id_idx on public.direct_messages (conversation_id, created_at);
create index if not exists direct_messages_sender_receiver_idx on public.direct_messages (sender_id, receiver_id, created_at);

alter table public.users enable row level security;
alter table public.schools enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.resources enable row level security;
alter table public.resource_versions enable row level security;
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

drop policy if exists "schools_read" on public.schools;
create policy "schools_read"
on public.schools
for select
using (true);

drop policy if exists "schools_dev_all" on public.schools;

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

drop policy if exists "school_messages_dev_all" on public.school_messages;
drop policy if exists "school_messages_select_school" on public.school_messages;
create policy "school_messages_select_school"
on public.school_messages
for select
using (
  exists (
    select 1
    from public.users viewer
    where viewer.id = auth.uid()
      and viewer.school_id = school_messages.school_id
  )
);

drop policy if exists "school_messages_insert_school" on public.school_messages;
create policy "school_messages_insert_school"
on public.school_messages
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.users viewer
    where viewer.id = auth.uid()
      and viewer.school_id = school_messages.school_id
  )
);

drop policy if exists "school_messages_delete_allowed" on public.school_messages;
create policy "school_messages_delete_allowed"
on public.school_messages
for delete
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.school_chat_rooms room
    where room.id = school_messages.room
      and room.type = 'group'
      and room.created_by = auth.uid()
  )
);

drop policy if exists "school_chat_rooms_dev_all" on public.school_chat_rooms;
drop policy if exists "school_chat_rooms_select_visible" on public.school_chat_rooms;
create policy "school_chat_rooms_select_visible"
on public.school_chat_rooms
for select
using (
  (
    type = 'group'
    and exists (
      select 1
      from public.users viewer
      where viewer.id = auth.uid()
        and viewer.school_id = school_chat_rooms.school_id
    )
  )
  or (
    type = 'direct'
    and auth.uid() = any(member_ids)
  )
);

drop policy if exists "school_chat_rooms_insert_allowed" on public.school_chat_rooms;
create policy "school_chat_rooms_insert_allowed"
on public.school_chat_rooms
for insert
with check (
  created_by = auth.uid()
  and auth.uid() = any(member_ids)
  and (
    (
      type = 'group'
      and exists (
        select 1
        from public.users viewer
        where viewer.id = auth.uid()
          and viewer.school_id = school_chat_rooms.school_id
      )
    )
    or type = 'direct'
  )
);

drop policy if exists "school_chat_rooms_delete_allowed" on public.school_chat_rooms;
create policy "school_chat_rooms_delete_allowed"
on public.school_chat_rooms
for delete
using (
  (type = 'group' and created_by = auth.uid())
  or (type = 'direct' and auth.uid() = any(member_ids))
);

drop policy if exists "direct_messages_select_own" on public.direct_messages;
create policy "direct_messages_select_own"
on public.direct_messages
for select
using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "direct_messages_insert_own" on public.direct_messages;
create policy "direct_messages_insert_own"
on public.direct_messages
for insert
with check (auth.uid() = sender_id);

drop policy if exists "direct_messages_delete_own" on public.direct_messages;
create policy "direct_messages_delete_own"
on public.direct_messages
for delete
using (auth.uid() = sender_id or auth.uid() = receiver_id);

grant usage on schema public to anon, authenticated;
grant select on public.schools to anon, authenticated;
grant select, insert, update, delete on public.users to authenticated;
grant select, insert, delete on public.posts to authenticated;
grant select, insert, delete on public.comments to authenticated;
grant select, insert, delete on public.resources to authenticated;
grant select, insert, delete on public.resource_versions to authenticated;
grant select, insert, delete on public.school_messages to authenticated;
grant select, insert, delete on public.school_chat_rooms to authenticated;
grant select, insert, delete on public.direct_messages to authenticated;

create or replace function public.increment_resource_view_count(target_resource_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.resources
  set view_count = coalesce(view_count, 0) + 1
  where id = target_resource_id;
$$;

create or replace function public.increment_resource_download_count(target_resource_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.resources
  set download_count = coalesce(download_count, 0) + 1
  where id = target_resource_id;
$$;

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

grant execute on function public.increment_resource_view_count(uuid) to anon, authenticated;
grant execute on function public.increment_resource_download_count(uuid) to anon, authenticated;
grant execute on function public.toggle_post_reaction(uuid, text, uuid) to authenticated;
grant execute on function public.toggle_resource_reaction(uuid, text, uuid) to authenticated;

insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do nothing;

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
