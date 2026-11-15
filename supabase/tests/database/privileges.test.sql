begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

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
  'default privileges grant API roles nothing'
);

drop function public.default_privileges_probe();
drop sequence public.default_privileges_probe_seq;
drop table public.default_privileges_probe;

select table_privs_are('public', 'profiles', 'anon', '{}', 'anon has no privileges on public.profiles');
select table_privs_are('public', 'profiles', 'authenticated', '{SELECT}', 'authenticated can only select public.profiles');
select table_privs_are('public', 'profiles', 'service_role', '{}', 'service_role has no privileges on public.profiles');

select policies_are('public', 'profiles', '{"Patients can view own profile"}', 'public.profiles has only Patients can view own profile');
select policy_cmd_is('public', 'profiles', 'Patients can view own profile', 'SELECT', 'Patients can view own profile applies to SELECT');
select policy_roles_are('public', 'profiles', 'Patients can view own profile', '{authenticated}', 'Patients can view own profile applies to authenticated');

select table_privs_are('public', 'providers', 'anon', '{}', 'anon has no privileges on public.providers');
select table_privs_are('public', 'providers', 'authenticated', '{SELECT}', 'authenticated can only select public.providers');
select table_privs_are('public', 'providers', 'service_role', '{}', 'service_role has no privileges on public.providers');

select policies_are('public', 'providers', '{"Patients can view all providers"}', 'public.providers has only Patients can view all providers');
select policy_cmd_is('public', 'providers', 'Patients can view all providers', 'SELECT', 'Patients can view all providers applies to SELECT');
select policy_roles_are('public', 'providers', 'Patients can view all providers', '{authenticated}', 'Patients can view all providers applies to authenticated');

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

select * from finish();

rollback;
