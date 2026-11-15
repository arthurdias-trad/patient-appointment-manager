create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id)
    on delete cascade default auth.uid(),
  provider_id uuid not null references public.providers (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint appointments_duration_check check (ends_at - starts_at = interval '30 minutes'),
  constraint appointments_reason_check check (reason = btrim(reason) and char_length(reason) between 1 and 500),
  constraint appointments_status_check check (status in ('scheduled', 'cancelled')),
  constraint appointments_no_overlap
    exclude
      using gist
      (patient_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
      where (deleted_at is null and status = 'scheduled')
);

create index if not exists appointments_patient_id_starts_at_idx on public.appointments (patient_id, starts_at)
where deleted_at is null;

revoke all on table public.appointments from anon, authenticated, service_role;

alter table public.appointments enable row level security;

grant select on public.appointments to authenticated;

grant insert (provider_id, starts_at, ends_at, reason) on public.appointments to authenticated;

grant update (provider_id, starts_at, ends_at, reason, status) on public.appointments to authenticated;

create policy "Patients can view own appointments" on public.appointments
for select
to authenticated
using ((select auth.uid()) = patient_id and deleted_at is null);

create policy "Patients can create appointments" on public.appointments
for insert
to authenticated
with check ((select auth.uid()) = patient_id);

create policy "Patients can update own appointments" on public.appointments
for update
to authenticated
using ((select auth.uid()) = patient_id and deleted_at is null)
with check ((select auth.uid()) = patient_id);

create function private.check_not_in_past_or_canceled()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.starts_at <= now() then
    raise exception 'Cannot schedule in the past';
  end if;
  if (TG_OP = 'UPDATE') then
    if (old.starts_at <= now()) then
      raise exception 'Cannot edit past appointment';
    end if;
    if (old.status = 'cancelled') then
      raise exception 'Cannot edit cancelled appointment';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.check_not_in_past_or_canceled() from anon, authenticated, service_role, public;

create function private.update_appointment_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.update_appointment_timestamp() from anon, authenticated, service_role, public;

create trigger check_not_in_past_or_canceled
before insert or update of status, starts_at, ends_at, provider_id, reason on public.appointments
for each row
execute function private.check_not_in_past_or_canceled();

create trigger update_appointment_timestamp
before update on public.appointments
for each row
execute function private.update_appointment_timestamp();
