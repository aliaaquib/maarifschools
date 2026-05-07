create table if not exists public.school_chat_rooms (
  id text primary key,
  school_id uuid references public.schools(id) on delete cascade,
  name text not null,
  type text not null default 'group' check (type in ('group', 'direct')),
  member_ids uuid[] not null default '{}',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default now()
);

create index if not exists school_chat_rooms_school_id_idx on public.school_chat_rooms (school_id, created_at);

alter table public.school_chat_rooms enable row level security;

drop policy if exists "school_chat_rooms_dev_all" on public.school_chat_rooms;
create policy "school_chat_rooms_dev_all"
on public.school_chat_rooms
for all
using (true)
with check (true);

grant select, insert, update, delete on public.school_chat_rooms to anon, authenticated;

notify pgrst, 'reload schema';
