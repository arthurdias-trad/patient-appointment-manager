insert into public.providers (id, name, specialty)
values
  ('00000000-0000-4000-8000-000000000001', 'Dr. Avery Quill', 'Developmental Pediatrics'),
  ('00000000-0000-4000-8000-000000000002', 'Jordan Marlowe, CCC-SLP', 'Speech-Language Pathology'),
  ('00000000-0000-4000-8000-000000000003', 'Riley Fenwick, OTR/L', 'Occupational Therapy'),
  ('00000000-0000-4000-8000-000000000004', 'Casey Thornbury, BCBA', 'Applied Behavior Analysis'),
  ('00000000-0000-4000-8000-000000000005', 'Dr. Morgan Ashdown', 'Child Psychology')
on conflict (id) do nothing;
