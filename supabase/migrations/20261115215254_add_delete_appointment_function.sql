create function public.delete_appointment(appointment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.appointments set deleted_at = now()
    where id = appointment_id
      and deleted_at is null
      and patient_id = (select auth.uid());
  return found;
end;
$$;

revoke all on function public.delete_appointment(uuid) from anon, authenticated, public, service_role;

grant execute on function public.delete_appointment(uuid) to authenticated;
