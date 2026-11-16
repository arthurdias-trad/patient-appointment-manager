alter table public.appointments add constraint appointments_start_alignment_check check (extract(epoch from starts_at) % 900 = 0);
