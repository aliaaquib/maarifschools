alter table public.school_messages
  add column if not exists parent_id uuid references public.school_messages(id) on delete set null,
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text check (attachment_type in ('image', 'file', 'link')),
  add column if not exists attachment_size bigint;

create index if not exists school_messages_parent_id_idx on public.school_messages (parent_id);

notify pgrst, 'reload schema';
