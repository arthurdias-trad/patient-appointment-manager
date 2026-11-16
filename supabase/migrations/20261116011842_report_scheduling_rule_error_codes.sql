create or replace function private.check_not_in_past_or_canceled()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.status = 'cancelled' then
      raise exception 'Cannot edit cancelled appointment' using errcode = 'AP003';
    end if;
    if old.starts_at <= now() then
      raise exception 'Cannot edit started appointment' using errcode = 'AP002';
    end if;
  end if;
  if new.starts_at <= now() then
    raise exception 'Cannot schedule in the past' using errcode = 'AP001';
  end if;
  return new;
end;
$$;
