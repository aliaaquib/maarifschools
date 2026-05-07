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

alter table public.users enable row level security;
alter table public.schools enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.resources enable row level security;
alter table public.resource_versions enable row level security;
alter table public.school_messages enable row level security;

drop policy if exists "users_dev_all" on public.users;
create policy "users_dev_all"
on public.users
for all
using (true)
with check (true);

drop policy if exists "schools_read" on public.schools;
create policy "schools_read"
on public.schools
for select
using (true);

drop policy if exists "schools_dev_all" on public.schools;
create policy "schools_dev_all"
on public.schools
for all
using (true)
with check (true);

drop policy if exists "posts_dev_all" on public.posts;
create policy "posts_dev_all"
on public.posts
for all
using (true)
with check (true);

drop policy if exists "comments_dev_all" on public.comments;
create policy "comments_dev_all"
on public.comments
for all
using (true)
with check (true);

drop policy if exists "resources_dev_all" on public.resources;
create policy "resources_dev_all"
on public.resources
for all
using (true)
with check (true);

drop policy if exists "resource_versions_dev_all" on public.resource_versions;
create policy "resource_versions_dev_all"
on public.resource_versions
for all
using (true)
with check (true);

drop policy if exists "school_messages_dev_all" on public.school_messages;
create policy "school_messages_dev_all"
on public.school_messages
for all
using (true)
with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.users to anon, authenticated;
grant select, insert, update, delete on public.schools to anon, authenticated;
grant select, insert, update, delete on public.posts to anon, authenticated;
grant select, insert, update, delete on public.comments to anon, authenticated;
grant select, insert, update, delete on public.resources to anon, authenticated;
grant select, insert, update, delete on public.resource_versions to anon, authenticated;
grant select, insert, update, delete on public.school_messages to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do nothing;

drop policy if exists "resources_storage_dev_all" on storage.objects;
create policy "resources_storage_dev_all"
on storage.objects
for all
using (bucket_id = 'resources')
with check (bucket_id = 'resources');

notify pgrst, 'reload schema';
