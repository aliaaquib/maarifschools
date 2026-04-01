create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key,
  email text,
  name text,
  subject text,
  grade text,
  avatar text,
  created_at timestamp with time zone default now()
);

create table if not exists posts (
  id uuid default uuid_generate_v4() primary key,
  content text,
  user_id uuid references users(id) on delete set null,
  created_at timestamp with time zone default now()
);

create table if not exists comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  content text,
  created_at timestamp with time zone default now()
);

create table if not exists resources (
  id uuid default uuid_generate_v4() primary key,
  title text,
  description text,
  user_id uuid references users(id) on delete set null,
  file_type text,
  file_name text,
  tags text[] default '{}'::text[],
  likes uuid[] default '{}'::uuid[],
  bookmarks uuid[] default '{}'::uuid[],
  created_at timestamp with time zone default now()
);

create table if not exists resource_versions (
  id uuid default uuid_generate_v4() primary key,
  resource_id uuid references resources(id) on delete cascade,
  file_url text,
  storage_path text,
  created_at timestamp with time zone default now()
);

create table if not exists schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp with time zone default now()
);

alter table users enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table resources enable row level security;
alter table resource_versions enable row level security;
alter table posts add column if not exists likes uuid[] default '{}'::uuid[];
alter table posts add column if not exists bookmarks uuid[] default '{}'::uuid[];
alter table users add column if not exists avatar text;
alter table users add column if not exists subject text;
alter table users add column if not exists grade text;

alter table posts add column if not exists likes uuid[] default '{}'::uuid[];
alter table posts add column if not exists bookmarks uuid[] default '{}'::uuid[];

alter table resources add column if not exists file_type text;
alter table resources add column if not exists file_name text;
alter table resources add column if not exists tags text[] default '{}'::text[];
alter table resources add column if not exists likes uuid[] default '{}'::uuid[];
alter table resources add column if not exists bookmarks uuid[] default '{}'::uuid[];

alter table resource_versions add column if not exists storage_path text;

alter table schools enable row level security;

drop policy if exists "schools_dev_all" on schools;
create policy "schools_dev_all" on schools for all using (true) with check (true);

alter table users add column if not exists school_id uuid references schools(id) on delete set null;
alter table resources add column if not exists school_id uuid references schools(id) on delete set null;


drop policy if exists "users_dev_all" on users;
create policy "users_dev_all" on users for all using (true) with check (true);

drop policy if exists "posts_dev_all" on posts;
create policy "posts_dev_all" on posts for all using (true) with check (true);

drop policy if exists "comments_dev_all" on comments;
create policy "comments_dev_all" on comments for all using (true) with check (true);

drop policy if exists "resources_dev_all" on resources;
create policy "resources_dev_all" on resources for all using (true) with check (true);

drop policy if exists "resource_versions_dev_all" on resource_versions;
create policy "resource_versions_dev_all" on resource_versions for all using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do nothing;

drop policy if exists "resources_storage_dev_all" on storage.objects;
create policy "resources_storage_dev_all"
on storage.objects
for all
using (bucket_id = 'resources')
with check (bucket_id = 'resources');
