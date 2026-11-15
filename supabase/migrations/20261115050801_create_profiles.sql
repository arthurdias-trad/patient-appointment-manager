create schema private;

revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users (id)
    on delete cascade,
  first_name text null check (char_length(first_name) between 1 and 100),
  middle_name text null check (char_length(middle_name) between 1 and 100),
  last_name text null check (char_length(last_name) between 1 and 100),
  created_at timestamptz not null default now()
);

revoke all on table public.profiles from anon, authenticated, service_role;

alter table public.profiles enable row level security;

grant select on public.profiles to authenticated;

create policy "Patients can view own profile" on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, first_name, middle_name, last_name)
    values(new.id, nullif(btrim(new.raw_user_meta_data ->> 'first_name'), ''), nullif(btrim(new.raw_user_meta_data ->> 'middle_name'), ''), nullif(btrim(new.raw_user_meta_data ->> 'last_name'), ''));
  return new;
end;
$$;

revoke all on function private.handle_new_user() from anon, authenticated, service_role, public;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure private.handle_new_user();
