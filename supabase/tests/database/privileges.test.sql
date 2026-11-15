begin;

create extension if not exists pgtap with schema extensions;

select plan(69);

select is_empty(
  $$
    select c.relname
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  'every public table has RLS enabled'
);

select is_empty(
  $$
    select c.relname, r.rolname, p.privilege
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join (values ('anon'), ('authenticated'), ('service_role')) as r (rolname)
    cross join (values ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER'), ('MAINTAIN')) as p (privilege)
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and pg_catalog.has_table_privilege(r.rolname, c.oid, p.privilege)
  $$,
  'API roles hold no write-only table privileges'
);

select is_empty(
  $$
    select c.relname, a.attname, r.rolname, p.privilege
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    cross join (values ('anon'), ('service_role')) as r (rolname)
    cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')) as p (privilege)
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and pg_catalog.has_column_privilege(r.rolname, c.oid, a.attnum, p.privilege)
  $$,
  'anon and service_role hold no column privileges on public tables'
);

select is_empty(
  $$
    select c.relname::text, a.attname::text, p.privilege
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    cross join (values ('INSERT'), ('UPDATE'), ('REFERENCES')) as p (privilege)
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and pg_catalog.has_column_privilege('authenticated', c.oid, a.attnum, p.privilege)
    except
    values
      ('appointments', 'provider_id', 'INSERT'),
      ('appointments', 'provider_id', 'UPDATE'),
      ('appointments', 'starts_at', 'INSERT'),
      ('appointments', 'starts_at', 'UPDATE'),
      ('appointments', 'ends_at', 'INSERT'),
      ('appointments', 'ends_at', 'UPDATE'),
      ('appointments', 'reason', 'INSERT'),
      ('appointments', 'reason', 'UPDATE'),
      ('appointments', 'status', 'UPDATE')
  $$,
  'authenticated holds only the contract column writes on public tables'
);

set local role postgres;
create table public.default_privileges_probe ();
create sequence public.default_privileges_probe_seq;
create function public.default_privileges_probe() returns integer language sql as 'select 1';
reset role;

select is_empty(
  $$
    select r.rolname
    from (values ('anon'), ('authenticated'), ('service_role')) as r (rolname)
    where pg_catalog.has_table_privilege(r.rolname, 'public.default_privileges_probe',
        'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN')
      or pg_catalog.has_sequence_privilege(r.rolname, 'public.default_privileges_probe_seq',
        'USAGE, SELECT, UPDATE')
      or pg_catalog.has_function_privilege(r.rolname, 'public.default_privileges_probe()', 'EXECUTE')
  $$,
  'new objects postgres creates in public grant API roles nothing'
);

drop function public.default_privileges_probe();
drop sequence public.default_privileges_probe_seq;
drop table public.default_privileges_probe;

select table_privs_are('public', 'profiles', 'anon', '{}', 'anon has no table-level privileges on public.profiles');
select table_privs_are('public', 'profiles', 'authenticated', '{SELECT}', 'authenticated can only select public.profiles at table level');
select table_privs_are('public', 'profiles', 'service_role', '{}', 'service_role has no table-level privileges on public.profiles');

select policies_are('public', 'profiles', '{"Patients can view own profile"}', 'public.profiles has only Patients can view own profile');
select policy_cmd_is('public', 'profiles', 'Patients can view own profile', 'SELECT', 'Patients can view own profile applies to SELECT');
select policy_roles_are('public', 'profiles', 'Patients can view own profile', '{authenticated}', 'Patients can view own profile applies to authenticated');

select table_privs_are('public', 'providers', 'anon', '{}', 'anon has no table-level privileges on public.providers');
select table_privs_are('public', 'providers', 'authenticated', '{SELECT}', 'authenticated can only select public.providers at table level');
select table_privs_are('public', 'providers', 'service_role', '{}', 'service_role has no table-level privileges on public.providers');

select policies_are('public', 'providers', '{"Patients can view all providers"}', 'public.providers has only Patients can view all providers');
select policy_cmd_is('public', 'providers', 'Patients can view all providers', 'SELECT', 'Patients can view all providers applies to SELECT');
select policy_roles_are('public', 'providers', 'Patients can view all providers', '{authenticated}', 'Patients can view all providers applies to authenticated');

select table_privs_are('public', 'appointments', 'anon', '{}', 'anon has no table-level privileges on public.appointments');
select table_privs_are('public', 'appointments', 'authenticated', '{SELECT}', 'authenticated can only select public.appointments at table level');
select table_privs_are('public', 'appointments', 'service_role', '{}', 'service_role has no table-level privileges on public.appointments');

select column_privs_are('public', 'appointments', 'provider_id', 'authenticated', '{INSERT,SELECT,UPDATE}', 'authenticated can select, insert, and update public.appointments.provider_id');
select column_privs_are('public', 'appointments', 'starts_at', 'authenticated', '{INSERT,SELECT,UPDATE}', 'authenticated can select, insert, and update public.appointments.starts_at');
select column_privs_are('public', 'appointments', 'ends_at', 'authenticated', '{INSERT,SELECT,UPDATE}', 'authenticated can select, insert, and update public.appointments.ends_at');
select column_privs_are('public', 'appointments', 'reason', 'authenticated', '{INSERT,SELECT,UPDATE}', 'authenticated can select, insert, and update public.appointments.reason');
select column_privs_are('public', 'appointments', 'status', 'authenticated', '{SELECT,UPDATE}', 'authenticated can select and update public.appointments.status');
select column_privs_are('public', 'appointments', 'id', 'authenticated', '{SELECT}', 'authenticated can only select public.appointments.id');
select column_privs_are('public', 'appointments', 'patient_id', 'authenticated', '{SELECT}', 'authenticated can only select public.appointments.patient_id');
select column_privs_are('public', 'appointments', 'created_at', 'authenticated', '{SELECT}', 'authenticated can only select public.appointments.created_at');
select column_privs_are('public', 'appointments', 'updated_at', 'authenticated', '{SELECT}', 'authenticated can only select public.appointments.updated_at');
select column_privs_are('public', 'appointments', 'deleted_at', 'authenticated', '{SELECT}', 'authenticated can only select public.appointments.deleted_at');

select policies_are('public', 'appointments', '{"Patients can view own appointments","Patients can create appointments","Patients can update own appointments"}', 'public.appointments has only its select, insert, and update policies');
select policy_cmd_is('public', 'appointments', 'Patients can view own appointments', 'SELECT', 'Patients can view own appointments applies to SELECT');
select policy_cmd_is('public', 'appointments', 'Patients can create appointments', 'INSERT', 'Patients can create appointments applies to INSERT');
select policy_cmd_is('public', 'appointments', 'Patients can update own appointments', 'UPDATE', 'Patients can update own appointments applies to UPDATE');
select policy_roles_are('public', 'appointments', 'Patients can view own appointments', '{authenticated}', 'Patients can view own appointments applies to authenticated');
select policy_roles_are('public', 'appointments', 'Patients can create appointments', '{authenticated}', 'Patients can create appointments applies to authenticated');
select policy_roles_are('public', 'appointments', 'Patients can update own appointments', '{authenticated}', 'Patients can update own appointments applies to authenticated');

select has_index('public', 'appointments', 'appointments_patient_id_starts_at_idx', 'public.appointments has appointments_patient_id_starts_at_idx');

select schema_privs_are('private', 'anon', '{}', 'anon has no privileges on schema private');
select schema_privs_are('private', 'authenticated', '{}', 'authenticated has no privileges on schema private');
select schema_privs_are('private', 'service_role', '{}', 'service_role has no privileges on schema private');

select trigger_is('auth', 'users', 'on_auth_user_created', 'private', 'handle_new_user', 'on_auth_user_created calls private.handle_new_user');
select is_definer('private', 'handle_new_user', '{}', 'private.handle_new_user is security definer');
select is(
  (select p.proconfig from pg_catalog.pg_proc p where p.oid = pg_catalog.to_regprocedure('private.handle_new_user()')),
  array['search_path=""'],
  'private.handle_new_user pins an empty search_path'
);
select function_privs_are('private', 'handle_new_user', '{}', 'anon', '{}', 'anon cannot execute private.handle_new_user');
select function_privs_are('private', 'handle_new_user', '{}', 'authenticated', '{}', 'authenticated cannot execute private.handle_new_user');
select function_privs_are('private', 'handle_new_user', '{}', 'service_role', '{}', 'service_role cannot execute private.handle_new_user');

select trigger_is('public', 'appointments', 'check_not_in_past_or_canceled', 'private', 'check_not_in_past_or_canceled', 'check_not_in_past_or_canceled calls private.check_not_in_past_or_canceled');
select isnt_definer('private', 'check_not_in_past_or_canceled', '{}', 'private.check_not_in_past_or_canceled is security invoker');
select is(
  (select p.proconfig from pg_catalog.pg_proc p where p.oid = pg_catalog.to_regprocedure('private.check_not_in_past_or_canceled()')),
  array['search_path=""'],
  'private.check_not_in_past_or_canceled pins an empty search_path'
);
select function_privs_are('private', 'check_not_in_past_or_canceled', '{}', 'anon', '{}', 'anon cannot execute private.check_not_in_past_or_canceled');
select function_privs_are('private', 'check_not_in_past_or_canceled', '{}', 'authenticated', '{}', 'authenticated cannot execute private.check_not_in_past_or_canceled');
select function_privs_are('private', 'check_not_in_past_or_canceled', '{}', 'service_role', '{}', 'service_role cannot execute private.check_not_in_past_or_canceled');

select trigger_is('public', 'appointments', 'update_appointment_timestamp', 'private', 'update_appointment_timestamp', 'update_appointment_timestamp calls private.update_appointment_timestamp');
select isnt_definer('private', 'update_appointment_timestamp', '{}', 'private.update_appointment_timestamp is security invoker');
select is(
  (select p.proconfig from pg_catalog.pg_proc p where p.oid = pg_catalog.to_regprocedure('private.update_appointment_timestamp()')),
  array['search_path=""'],
  'private.update_appointment_timestamp pins an empty search_path'
);
select function_privs_are('private', 'update_appointment_timestamp', '{}', 'anon', '{}', 'anon cannot execute private.update_appointment_timestamp');
select function_privs_are('private', 'update_appointment_timestamp', '{}', 'authenticated', '{}', 'authenticated cannot execute private.update_appointment_timestamp');
select function_privs_are('private', 'update_appointment_timestamp', '{}', 'service_role', '{}', 'service_role cannot execute private.update_appointment_timestamp');

set local role postgres;
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000001', 'past-lock@example.test');
alter table public.appointments disable trigger check_not_in_past_or_canceled;
insert into public.appointments (id, patient_id, provider_id, starts_at, ends_at, reason, created_at, updated_at)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  now() - interval '15 minutes',
  now() + interval '15 minutes',
  'Synthetic follow-up',
  now() - interval '1 hour',
  now() - interval '1 hour'
);
alter table public.appointments enable trigger check_not_in_past_or_canceled;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$update public.appointments set reason = 'Synthetic check-in' where id = '20000000-0000-4000-8000-000000000001'$$,
  'P0001',
  null,
  'started appointment cannot be edited'
);
select throws_ok(
  $$update public.appointments set status = 'cancelled' where id = '20000000-0000-4000-8000-000000000001'$$,
  'P0001',
  null,
  'started appointment cannot be cancelled'
);
select throws_ok(
  $$update public.appointments
    set starts_at = now() + interval '1 day', ends_at = now() + interval '1 day 30 minutes'
    where id = '20000000-0000-4000-8000-000000000001'$$,
  'P0001',
  null,
  'started appointment cannot be moved to the future'
);

select is(
  public.delete_appointment('20000000-0000-4000-8000-000000000001'::uuid),
  true,
  'started appointment can be soft-deleted'
);

reset role;

select is(
  (select updated_at from public.appointments where id = '20000000-0000-4000-8000-000000000001'),
  now(),
  'soft delete refreshes updated_at'
);

select is_definer('public', 'delete_appointment', '{uuid}', 'public.delete_appointment is security definer');
select ok(
  coalesce(
    (select p.proconfig @> array['search_path=""'] from pg_catalog.pg_proc p where p.oid = pg_catalog.to_regprocedure('public.delete_appointment(uuid)')),
    false
  ),
  'delete_appointment pins an empty search_path'
);
select function_privs_are('public', 'delete_appointment', '{uuid}', 'anon', '{}', 'anon cannot execute public.delete_appointment');
select function_privs_are('public', 'delete_appointment', '{uuid}', 'authenticated', '{EXECUTE}', 'authenticated can execute public.delete_appointment');
select function_privs_are('public', 'delete_appointment', '{uuid}', 'service_role', '{}', 'service_role cannot execute public.delete_appointment');

select * from finish();

rollback;
