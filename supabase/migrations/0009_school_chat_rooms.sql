alter table public.school_messages
  add column if not exists room text not null default 'general';

update public.school_messages
set room = 'general'
where room is null or room = '';

create index if not exists school_messages_room_idx
  on public.school_messages (school_id, room, created_at);

notify pgrst, 'reload schema';
