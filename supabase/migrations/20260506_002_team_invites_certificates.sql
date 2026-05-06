-- Team invites, certificates, and tighter storage policies

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  member_role public.member_role not null default 'member',
  token text not null unique,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  accepted_by uuid null references public.profiles(id) on delete set null,
  accepted_at timestamptz null,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  tank_id uuid not null references public.tanks(id) on delete cascade,
  storage_path text not null,
  issued_to_email text,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_org_invites_updated_at
before update on public.organization_invites
for each row execute procedure public.set_updated_at();

create trigger trg_certificates_updated_at
before update on public.certificates
for each row execute procedure public.set_updated_at();

alter table public.organization_invites enable row level security;
alter table public.certificates enable row level security;

create policy "org_invites_select_scope" on public.organization_invites
for select using (
  public.is_staff_or_admin()
  or public.is_org_member(org_id)
  or lower(email) = lower(coalesce((select email from public.profiles where id = auth.uid()), ''))
);

create policy "org_invites_insert_scope" on public.organization_invites
for insert with check (
  public.is_staff_or_admin()
  or exists (
    select 1 from public.organization_members om
    where om.org_id = organization_invites.org_id
      and om.user_id = auth.uid()
      and om.member_role in ('owner', 'manager')
  )
);

create policy "org_invites_update_scope" on public.organization_invites
for update using (
  public.is_staff_or_admin()
  or exists (
    select 1 from public.organization_members om
    where om.org_id = organization_invites.org_id
      and om.user_id = auth.uid()
      and om.member_role in ('owner', 'manager')
  )
)
with check (
  public.is_staff_or_admin()
  or exists (
    select 1 from public.organization_members om
    where om.org_id = organization_invites.org_id
      and om.user_id = auth.uid()
      and om.member_role in ('owner', 'manager')
  )
);

create policy "certificates_scope" on public.certificates
for all using (
  exists (
    select 1
    from public.properties p
    where p.id = certificates.property_id
      and (
        p.owner_id = auth.uid()
        or (p.org_id is not null and public.is_org_member(p.org_id))
        or public.is_staff_or_admin()
      )
  )
)
with check (
  exists (
    select 1
    from public.properties p
    where p.id = certificates.property_id
      and (
        p.owner_id = auth.uid()
        or (p.org_id is not null and public.is_org_member(p.org_id))
        or public.is_staff_or_admin()
      )
  )
);

insert into storage.buckets (id, name, public)
values ('tank-tech-certificates', 'tank-tech-certificates', false)
on conflict (id) do nothing;

create policy "certificate_files_select" on storage.objects
for select using (
  bucket_id = 'tank-tech-certificates'
  and auth.uid() is not null
);

create policy "certificate_files_insert" on storage.objects
for insert with check (
  bucket_id = 'tank-tech-certificates'
  and public.is_staff_or_admin()
);

create policy "certificate_files_update" on storage.objects
for update using (
  bucket_id = 'tank-tech-certificates'
  and public.is_staff_or_admin()
)
with check (
  bucket_id = 'tank-tech-certificates'
  and public.is_staff_or_admin()
);

create policy "certificate_files_delete" on storage.objects
for delete using (
  bucket_id = 'tank-tech-certificates'
  and public.current_user_role() = 'admin'
);

drop policy if exists "photos_select_scope" on storage.objects;
drop policy if exists "photos_insert_scope" on storage.objects;
drop policy if exists "photos_update_scope" on storage.objects;
drop policy if exists "photos_delete_scope" on storage.objects;

create policy "photos_select_scope" on storage.objects
for select using (
  bucket_id = 'tank-tech-photos'
  and auth.uid() is not null
);

create policy "photos_insert_scope" on storage.objects
for insert with check (
  bucket_id = 'tank-tech-photos'
  and auth.uid() is not null
  and (
    public.is_staff_or_admin()
    or name like auth.uid()::text || '/%'
  )
);

create policy "photos_update_scope" on storage.objects
for update using (
  bucket_id = 'tank-tech-photos'
  and (
    public.is_staff_or_admin()
    or name like auth.uid()::text || '/%'
  )
)
with check (
  bucket_id = 'tank-tech-photos'
  and (
    public.is_staff_or_admin()
    or name like auth.uid()::text || '/%'
  )
);

create policy "photos_delete_scope" on storage.objects
for delete using (
  bucket_id = 'tank-tech-photos'
  and (
    public.is_staff_or_admin()
    or name like auth.uid()::text || '/%'
  )
);

insert into public.service_plans (name, cleaning_interval_months, includes_inspection, priority_scheduling, reminder_days_before, is_active)
values
  ('Compliance Plus', 36, true, false, '{120,60,30,7}', true)
on conflict (name) do nothing;
