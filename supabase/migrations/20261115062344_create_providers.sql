create table public.providers(
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 100),
  specialty text not null check (specialty = btrim(specialty) and char_length(specialty) between 1 and 100)
);

revoke all on table public.providers from anon, authenticated, service_role;

alter table public.providers enable row level security;

grant select on public.providers to authenticated;

create policy "Patients can view all providers" on public.providers
  for select to authenticated using (true);

create extension if not exists btree_gist with schema extensions;
