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
