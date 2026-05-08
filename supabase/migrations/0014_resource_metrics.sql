alter table public.resources
  add column if not exists view_count integer not null default 0,
  add column if not exists download_count integer not null default 0;

update public.resources
set view_count = coalesce(view_count, 0),
    download_count = coalesce(download_count, 0);

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

grant execute on function public.increment_resource_view_count(uuid) to anon, authenticated;
grant execute on function public.increment_resource_download_count(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
