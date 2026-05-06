alter table public.resources
  add column if not exists resource_scope text not null default 'school';

create index if not exists resources_resource_scope_idx on public.resources (resource_scope);

update public.resources
set resource_scope = 'school'
where resource_scope is null or resource_scope = '';

notify pgrst, 'reload schema';
