create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  name text not null,
  subject text,
  grade text,
  description text,
  banner_url text,
  invite_code text not null unique,
  created_at timestamp with time zone default now()
);

create table if not exists public.class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text not null default 'student' check (role in ('teacher', 'student')),
  joined_at timestamp with time zone default now(),
  unique (class_id, user_id)
);

create table if not exists public.class_resources (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  resource_id uuid references public.resources(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (class_id, resource_id)
);

create table if not exists public.class_posts (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  author_id uuid references public.users(id) on delete cascade,
  type text not null default 'announcement' check (type in ('announcement', 'discussion', 'assignment')),
  title text,
  content text,
  created_at timestamp with time zone default now()
);

create index if not exists classes_teacher_id_idx on public.classes (teacher_id, created_at);
create index if not exists classes_school_id_idx on public.classes (school_id, created_at);
create index if not exists classes_invite_code_idx on public.classes (invite_code);
create index if not exists class_members_class_id_idx on public.class_members (class_id, joined_at);
create index if not exists class_posts_class_id_idx on public.class_posts (class_id, created_at);
create index if not exists class_resources_class_id_idx on public.class_resources (class_id, created_at);

alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.class_resources enable row level security;
alter table public.class_posts enable row level security;

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

drop policy if exists "classes_insert_own" on public.classes;
create policy "classes_insert_own"
on public.classes
for insert
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.users viewer
    where viewer.id = auth.uid()
      and viewer.school_id = classes.school_id
  )
);

drop policy if exists "classes_update_own" on public.classes;
create policy "classes_update_own"
on public.classes
for update
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

drop policy if exists "classes_delete_own" on public.classes;
create policy "classes_delete_own"
on public.classes
for delete
using (teacher_id = auth.uid());

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

drop policy if exists "class_members_insert_allowed" on public.class_members;
create policy "class_members_insert_allowed"
on public.class_members
for insert
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.classes class_record
    where class_record.id = class_members.class_id
      and class_record.teacher_id = auth.uid()
  )
);

drop policy if exists "class_members_delete_allowed" on public.class_members;
create policy "class_members_delete_allowed"
on public.class_members
for delete
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.classes class_record
    where class_record.id = class_members.class_id
      and class_record.teacher_id = auth.uid()
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

drop policy if exists "class_resources_insert_allowed" on public.class_resources;
create policy "class_resources_insert_allowed"
on public.class_resources
for insert
with check (
  exists (
    select 1
    from public.classes class_record
    where class_record.id = class_resources.class_id
      and class_record.teacher_id = auth.uid()
  )
);

drop policy if exists "class_resources_delete_allowed" on public.class_resources;
create policy "class_resources_delete_allowed"
on public.class_resources
for delete
using (
  exists (
    select 1
    from public.classes class_record
    where class_record.id = class_resources.class_id
      and class_record.teacher_id = auth.uid()
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

drop policy if exists "class_posts_insert_allowed" on public.class_posts;
create policy "class_posts_insert_allowed"
on public.class_posts
for insert
with check (
  author_id = auth.uid()
  and exists (
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

drop policy if exists "class_posts_delete_allowed" on public.class_posts;
create policy "class_posts_delete_allowed"
on public.class_posts
for delete
using (
  author_id = auth.uid()
  or exists (
    select 1
    from public.classes class_record
    where class_record.id = class_posts.class_id
      and class_record.teacher_id = auth.uid()
  )
);

grant select, insert, update, delete on public.classes to authenticated;
grant select, insert, update, delete on public.class_members to authenticated;
grant select, insert, update, delete on public.class_resources to authenticated;
grant select, insert, update, delete on public.class_posts to authenticated;

notify pgrst, 'reload schema';
