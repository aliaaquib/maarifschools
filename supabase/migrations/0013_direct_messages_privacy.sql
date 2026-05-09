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

create index if not exists direct_messages_conversation_id_idx
  on public.direct_messages (conversation_id, created_at);

create index if not exists direct_messages_sender_receiver_idx
  on public.direct_messages (sender_id, receiver_id, created_at);

alter table public.direct_messages enable row level security;

drop policy if exists "school_messages_dev_all" on public.school_messages;
drop policy if exists "school_chat_rooms_dev_all" on public.school_chat_rooms;

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

grant select, insert, delete on public.direct_messages to authenticated;

notify pgrst, 'reload schema';
