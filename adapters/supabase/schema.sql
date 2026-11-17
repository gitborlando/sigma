begin;

create table public.files (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  owner uuid not null references auth.users(id)
);

create index files_owner_created_at_idx on public.files (owner, created_at desc);

alter table public.files enable row level security;

revoke all on public.files from anon, authenticated;
grant select on public.files to anon;
grant select, insert, delete on public.files to authenticated;

create policy "Owners can read files"
  on public.files for select to authenticated
  using (owner = (select auth.uid()));

create policy "Owners can create files"
  on public.files for insert to authenticated
  with check (owner = (select auth.uid()));

create policy "Owners can delete files"
  on public.files for delete to authenticated
  using (owner = (select auth.uid()));

insert into storage.buckets (id, name, public)
values ('file-assets', 'file-assets', true);

create policy "Authenticated users can upload file assets"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'file-assets');

commit;
