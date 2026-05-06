-- Tank Tech realistic demo seed data
-- Requires existing auth.users entries; use placeholder UUIDs as examples.

insert into public.organizations (id, name, owner_id)
values
  ('11111111-1111-1111-1111-111111111111', 'Coral View Property Management Ltd.', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
on conflict (id) do nothing;

insert into public.profiles (id, full_name, email, phone, role, org_id)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ariana Simons', 'owner@coralview.bm', '+1-441-555-0101', 'property_manager', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Marlon Tucker', 'staff@tanktech.bm', '+1-441-555-0102', 'staff', null),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Leah Bean', 'customer1@bermuda.bm', '+1-441-555-0103', 'customer', null),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Noah Outerbridge', 'customer2@bermuda.bm', '+1-441-555-0104', 'customer', null)
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  role = excluded.role,
  org_id = excluded.org_id;

insert into public.organization_members (org_id, user_id, member_role)
values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner')
on conflict (org_id, user_id) do update set member_role = excluded.member_role;

insert into public.properties (id, owner_id, org_id, address, parish, notes)
values
  ('21111111-1111-1111-1111-111111111111', null, '11111111-1111-1111-1111-111111111111', '15 Front Street, Hamilton', 'Pembroke', 'Commercial rooftop collection'),
  ('22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', null, '8 South Road, Warwick', 'Warwick', 'Family home with underground tank'),
  ('23333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd', null, '22 Harbour Road, Paget', 'Paget', 'Steep driveway access')
on conflict (id) do update set
  owner_id = excluded.owner_id,
  org_id = excluded.org_id,
  address = excluded.address,
  parish = excluded.parish,
  notes = excluded.notes;

insert into public.tanks (id, property_id, last_cleaned_date, next_due_date, size_estimate, access_notes)
values
  ('31111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '2022-04-12', '2026-10-12', '2500 gallons', 'Service hatch behind AC units'),
  ('32222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '2020-06-10', '2026-06-10', '1800 gallons', 'Side gate key code 4401'),
  ('33333333-3333-3333-3333-333333333333', '23333333-3333-3333-3333-333333333333', '2019-09-15', '2025-09-15', '2200 gallons', 'Technician parking on upper lane')
on conflict (id) do update set
  property_id = excluded.property_id,
  last_cleaned_date = excluded.last_cleaned_date,
  next_due_date = excluded.next_due_date,
  size_estimate = excluded.size_estimate,
  access_notes = excluded.access_notes;

insert into public.subscriptions (id, org_id, owner_id, property_id, tank_id, plan_id, status, start_date, next_due_date, notes)
select
  '41111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '21111111-1111-1111-1111-111111111111',
  '31111111-1111-1111-1111-111111111111',
  sp.id,
  'active',
  current_date - interval '1 year',
  current_date + interval '20 days',
  'Portfolio plan for annual inspections'
from public.service_plans sp
where sp.name = 'Premium'
on conflict (id) do nothing;

insert into public.bookings (id, owner_id, org_id, property_id, tank_id, subscription_id, requested_window_start, requested_window_end, scheduled_start, scheduled_end, status, technician_id, notes)
values
  ('51111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', null, '22222222-2222-2222-2222-222222222222', '32222222-2222-2222-2222-222222222222', null, now() + interval '2 days', now() + interval '2 days 2 hour', null, null, 'requested', null, 'Please avoid afternoon slot due to school pickup.'),
  ('52222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111111', now() + interval '5 days', now() + interval '5 days 2 hour', now() + interval '6 days', now() + interval '6 days 2 hour', 'scheduled', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Portfolio service window')
on conflict (id) do update set
  status = excluded.status,
  technician_id = excluded.technician_id,
  notes = excluded.notes;

insert into public.job_reports (id, booking_id, summary, before_photos, after_photos, customer_signed_at)
values
  ('61111111-1111-1111-1111-111111111111', '52222222-2222-2222-2222-222222222222', 'Initial inspection complete. Awaiting service date completion.', '[{"path":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/52222222-2222-2222-2222-222222222222/before-1.jpg"}]'::jsonb, '[]'::jsonb, null)
on conflict (booking_id) do update set summary = excluded.summary;
