-- Run the entire script in the intended project's Supabase SQL Editor as postgres.
-- Replace the two profile-ID placeholders below with existing demo users' UIDs.
-- Creates synthetic history; reruns restore these demo appointments, including deleted rows.
-- The transaction temporarily disables only the scheduling trigger for past dates.
-- Other constraints remain active; a conflict aborts the transaction.

begin;

-- Demo appointment rows are keyed by uuid_generate_v5(patient_id, slot), so reruns
-- update the same rows and never match another appointment.
create temporary table demo_appointments on commit drop as
with
  patients (account, patient_id) as (
    values
      (1, 'REPLACE_WITH_FIRST_PROFILE_ID'::uuid),
      (2, 'REPLACE_WITH_SECOND_PROFILE_ID'::uuid)
  ),
  appointment_definitions (account, slot, day_offset, start_time, provider_id, reason, status) as (
    values
      (1, 'past-1', -21, time '09:30', '00000000-0000-4000-8000-000000000001'::uuid, 'Developmental screening follow-up', 'scheduled'),
      (1, 'past-2', -7, time '14:00', '00000000-0000-4000-8000-000000000002'::uuid, 'Speech articulation session', 'scheduled'),
      (1, 'future-1', 3, time '10:15', '00000000-0000-4000-8000-000000000003'::uuid, 'Fine motor skills evaluation', 'scheduled'),
      (1, 'future-2', 10, time '15:45', '00000000-0000-4000-8000-000000000002'::uuid, 'Speech progress review', 'scheduled'),
      (1, 'cancelled-1', 17, time '11:00', '00000000-0000-4000-8000-000000000005'::uuid, 'Sleep routine consultation', 'cancelled'),
      (2, 'past-1', -18, time '13:15', '00000000-0000-4000-8000-000000000004'::uuid, 'Behavior plan intake', 'scheduled'),
      (2, 'past-2', -4, time '08:45', '00000000-0000-4000-8000-000000000005'::uuid, 'Anxiety coping strategies session', 'scheduled'),
      (2, 'future-1', 2, time '16:00', '00000000-0000-4000-8000-000000000004'::uuid, 'Behavior plan check-in', 'scheduled'),
      (2, 'future-2', 12, time '09:00', '00000000-0000-4000-8000-000000000001'::uuid, 'Annual developmental review', 'scheduled'),
      (2, 'cancelled-1', 8, time '12:30', '00000000-0000-4000-8000-000000000003'::uuid, 'Sensory processing assessment', 'cancelled')
  ),
  clinic (today) as (
    select (now() at time zone 'America/New_York')::date
  ),
  dated as (
    select p.patient_id, f.*, c.today + f.day_offset as day
    from appointment_definitions f
    join patients p using (account)
    cross join clinic c
  ),
  -- Move weekend dates to a weekday, away from today so past stays past.
  weekdays as (
    select d.*,
      d.day + case extract(isodow from d.day)
        when 6 then case when d.day_offset < 0 then -1 else 2 end
        when 7 then case when d.day_offset < 0 then -2 else 1 end
        else 0
      end as weekday
    from dated d
  )
select
  extensions.uuid_generate_v5(w.patient_id, w.slot) as id,
  w.patient_id,
  w.provider_id,
  (w.weekday + w.start_time) at time zone 'America/New_York' as starts_at,
  w.reason,
  w.status
from weekdays w;

do $$
begin
  if (select count(*) from public.profiles where id in (select patient_id from demo_appointments)) <> 2 then
    raise exception 'Both demo profile IDs must exist in public.profiles';
  end if;
end;
$$;

alter table public.appointments disable trigger check_not_in_past_or_canceled;

insert into public.appointments as a (id, patient_id, provider_id, starts_at, ends_at, reason, status, created_at, updated_at)
select id, patient_id, provider_id, starts_at, starts_at + interval '30 minutes', reason, status,
  least(now(), starts_at - interval '14 days'),
  least(now(), starts_at - interval '14 days')
from demo_appointments
on conflict (id) do update
set provider_id = excluded.provider_id,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  reason = excluded.reason,
  status = excluded.status,
  created_at = excluded.created_at,
  deleted_at = null
where a.patient_id = excluded.patient_id;

alter table public.appointments enable trigger check_not_in_past_or_canceled;

-- Fails the run if a demo appointment ID somehow belonged to another patient.
do $$
begin
  if (
    select count(*) from public.appointments a join demo_appointments f using (id, patient_id)
  ) <> (select count(*) from demo_appointments) then
    raise exception 'A demo appointment ID is owned by a different patient';
  end if;
end;
$$;

select
  f.patient_id,
  count(*) filter (where a.status = 'scheduled' and a.ends_at <= now()) as past,
  count(*) filter (where a.status = 'scheduled' and a.starts_at > now()) as upcoming,
  count(*) filter (where a.status = 'cancelled') as cancelled
from demo_appointments f
join public.appointments a using (id)
group by f.patient_id
order by f.patient_id;

commit;
