alter table posts add column if not exists likes uuid[] default '{}'::uuid[];
alter table posts add column if not exists bookmarks uuid[] default '{}'::uuid[];
