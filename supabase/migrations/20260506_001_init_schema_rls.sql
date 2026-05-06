-- Tank Tech initial schema + RLS

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create type public.user_role as enum ('customer', 'property_manager', 'staff', 'admin');
create type public.member_role as enum ('owner', 'manager', 'member');
create type public.subscription_status as enum ('active', 'paused', 'cancelled');
create type public.booking_status as enum ('requested', 'scheduled', 'in_progress', 'completed', 'cancelled');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role public.user_role not null default 'customer',
  org_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_org_id_fkey
  foreign key (org_id) references public.organizations(id) on delete set null;

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, user_id)
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid null references public.profiles(id) on delete cascade,
  org_id uuid null references public.organizations(id) on delete cascade,
  address text not null,
  parish text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_owner_or_org_chk check (
    (owner_id is not null and org_id is null)
    or (owner_id is null and org_id is not null)
  )
);

create table if not exists public.tanks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  last_cleaned_date date,
  next_due_date date,
  size_estimate text,
  access_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  cleaning_interval_months int not null check (cleaning_interval_months > 0),
  includes_inspection boolean not null default false,
  priority_scheduling boolean not null default false,
  reminder_days_before int[] not null default '{90,30,7}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid null references public.organizations(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  tank_id uuid not null references public.tanks(id) on delete cascade,
  plan_id uuid not null references public.service_plans(id) on delete restrict,
  status public.subscription_status not null default 'active',
  start_date date not null default current_date,
  next_due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  org_id uuid null references public.organizations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  tank_id uuid not null references public.tanks(id) on delete cascade,
  subscription_id uuid null references public.subscriptions(id) on delete set null,
  requested_window_start timestamptz not null,
  requested_window_end timestamptz not null,
  scheduled_start timestamptz null,
  scheduled_end timestamptz null,
  status public.booking_status not null default 'requested',
  technician_id uuid null references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_window_valid check (requested_window_end > requested_window_start)
);

create table if not exists public.job_reports (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  summary text,
  before_photos jsonb not null default '[]'::jsonb,
  after_photos jsonb not null default '[]'::jsonb,
  customer_signed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid null references public.bookings(id) on delete set null,
  subscription_id uuid null references public.subscriptions(id) on delete set null,
  to_email text not null,
  template text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role::text from public.profiles p where p.id = auth.uid() limit 1;
$$;

create or replace function public.current_user_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.org_id from public.profiles p where p.id = auth.uid() limit 1;
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('staff', 'admin'), false);
$$;

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.org_id = target_org
      and om.user_id = auth.uid()
  )
  or coalesce(public.current_user_org_id() = target_org, false)
  or public.is_staff_or_admin();
$$;

create or replace function public.compute_tank_next_due()
returns trigger
language plpgsql
as $$
begin
  if new.last_cleaned_date is not null and new.next_due_date is null then
    new.next_due_date := (new.last_cleaned_date + interval '72 months')::date;
  end if;
  return new;
end;
$$;

create or replace function public.compute_subscription_next_due()
returns trigger
language plpgsql
as $$
declare
  interval_months int;
  effective_start date;
begin
  select sp.cleaning_interval_months into interval_months
  from public.service_plans sp
  where sp.id = new.plan_id;

  effective_start := coalesce(new.start_date, current_date);

  if interval_months is not null and (
    new.next_due_date is null
    or (tg_op = 'UPDATE' and new.plan_id is distinct from old.plan_id)
  ) then
    new.next_due_date := (effective_start + make_interval(months => interval_months))::date;
  end if;

  return new;
end;
$$;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger trg_orgs_updated_at
before update on public.organizations
for each row execute procedure public.set_updated_at();

create trigger trg_org_members_updated_at
before update on public.organization_members
for each row execute procedure public.set_updated_at();

create trigger trg_properties_updated_at
before update on public.properties
for each row execute procedure public.set_updated_at();

create trigger trg_tanks_updated_at
before update on public.tanks
for each row execute procedure public.set_updated_at();

create trigger trg_service_plans_updated_at
before update on public.service_plans
for each row execute procedure public.set_updated_at();

create trigger trg_subscriptions_updated_at
before update on public.subscriptions
for each row execute procedure public.set_updated_at();

create trigger trg_bookings_updated_at
before update on public.bookings
for each row execute procedure public.set_updated_at();

create trigger trg_job_reports_updated_at
before update on public.job_reports
for each row execute procedure public.set_updated_at();

create trigger trg_tanks_compute_due
before insert or update on public.tanks
for each row execute procedure public.compute_tank_next_due();

create trigger trg_subscriptions_compute_due
before insert or update on public.subscriptions
for each row execute procedure public.compute_subscription_next_due();

insert into public.service_plans (name, cleaning_interval_months, includes_inspection, priority_scheduling, reminder_days_before, is_active)
values
  ('Basic', 72, false, false, '{90,30,7}', true),
  ('Standard', 48, true, false, '{90,30,14,7}', true),
  ('Premium', 12, true, true, '{120,60,30,7}', true)
on conflict (name) do nothing;

insert into storage.buckets (id, name, public)
values ('tank-tech-photos', 'tank-tech-photos', false)
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.properties enable row level security;
alter table public.tanks enable row level security;
alter table public.service_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.bookings enable row level security;
alter table public.job_reports enable row level security;
alter table public.email_log enable row level security;

create policy "profiles_select_self_or_staff" on public.profiles
for select using (id = auth.uid() or public.is_staff_or_admin());

create policy "profiles_update_self_or_admin" on public.profiles
for update using (id = auth.uid() or public.current_user_role() = 'admin')
with check (id = auth.uid() or public.current_user_role() = 'admin');

create policy "profiles_insert_self" on public.profiles
for insert with check (id = auth.uid() or public.current_user_role() = 'admin');

create policy "org_read_member_or_staff" on public.organizations
for select using (public.is_org_member(id) or owner_id = auth.uid());

create policy "org_insert_owner" on public.organizations
for insert with check (owner_id = auth.uid() or public.current_user_role() = 'admin');

create policy "org_update_owner_admin" on public.organizations
for update using (owner_id = auth.uid() or public.current_user_role() = 'admin')
with check (owner_id = auth.uid() or public.current_user_role() = 'admin');

create policy "org_members_read" on public.organization_members
for select using (public.is_org_member(org_id));

create policy "org_members_manage_owner_manager_admin" on public.organization_members
for all using (
  public.current_user_role() = 'admin'
  or exists (
    select 1 from public.organization_members om
    where om.org_id = organization_members.org_id
      and om.user_id = auth.uid()
      and om.member_role in ('owner', 'manager')
  )
)
with check (
  public.current_user_role() = 'admin'
  or exists (
    select 1 from public.organization_members om
    where om.org_id = organization_members.org_id
      and om.user_id = auth.uid()
      and om.member_role in ('owner', 'manager')
  )
);

create policy "properties_read_owner_org_staff" on public.properties
for select using (
  owner_id = auth.uid()
  or (org_id is not null and public.is_org_member(org_id))
  or public.is_staff_or_admin()
);

create policy "properties_insert_owner_org_staff" on public.properties
for insert with check (
  owner_id = auth.uid()
  or (org_id is not null and public.is_org_member(org_id))
  or public.is_staff_or_admin()
);

create policy "properties_update_owner_org_staff" on public.properties
for update using (
  owner_id = auth.uid()
  or (org_id is not null and public.is_org_member(org_id))
  or public.is_staff_or_admin()
)
with check (
  owner_id = auth.uid()
  or (org_id is not null and public.is_org_member(org_id))
  or public.is_staff_or_admin()
);

create policy "properties_delete_owner_org_staff" on public.properties
for delete using (
  owner_id = auth.uid()
  or (org_id is not null and public.is_org_member(org_id))
  or public.is_staff_or_admin()
);

create policy "tanks_crud_scope" on public.tanks
for all using (
  exists (
    select 1
    from public.properties p
    where p.id = tanks.property_id
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
    where p.id = tanks.property_id
      and (
        p.owner_id = auth.uid()
        or (p.org_id is not null and public.is_org_member(p.org_id))
        or public.is_staff_or_admin()
      )
  )
);

create policy "plans_select_all_authenticated" on public.service_plans
for select using (auth.uid() is not null);

create policy "plans_manage_admin_only" on public.service_plans
for all using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "subscriptions_crud_scope" on public.subscriptions
for all using (
  owner_id = auth.uid()
  or (org_id is not null and public.is_org_member(org_id))
  or public.is_staff_or_admin()
)
with check (
  owner_id = auth.uid()
  or (org_id is not null and public.is_org_member(org_id))
  or public.is_staff_or_admin()
);

create policy "bookings_crud_scope" on public.bookings
for all using (
  owner_id = auth.uid()
  or (org_id is not null and public.is_org_member(org_id))
  or public.is_staff_or_admin()
)
with check (
  owner_id = auth.uid()
  or (org_id is not null and public.is_org_member(org_id))
  or public.is_staff_or_admin()
);

create policy "job_reports_scope" on public.job_reports
for all using (
  exists (
    select 1
    from public.bookings b
    where b.id = job_reports.booking_id
      and (
        b.owner_id = auth.uid()
        or (b.org_id is not null and public.is_org_member(b.org_id))
        or public.is_staff_or_admin()
      )
  )
)
with check (
  exists (
    select 1
    from public.bookings b
    where b.id = job_reports.booking_id
      and (
        b.owner_id = auth.uid()
        or (b.org_id is not null and public.is_org_member(b.org_id))
        or public.is_staff_or_admin()
      )
  )
);

create policy "email_log_scope" on public.email_log
for select using (public.is_staff_or_admin());

create policy "email_log_insert_service" on public.email_log
for insert with check (public.is_staff_or_admin());

do $$
begin
  begin
    alter table storage.objects enable row level security;
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

create policy "photos_select_scope" on storage.objects
for select using (
  bucket_id = 'tank-tech-photos'
  and auth.uid() is not null
);

create policy "photos_insert_scope" on storage.objects
for insert with check (
  bucket_id = 'tank-tech-photos'
  and auth.uid() is not null
);

create policy "photos_update_scope" on storage.objects
for update using (
  bucket_id = 'tank-tech-photos'
  and auth.uid() is not null
)
with check (
  bucket_id = 'tank-tech-photos'
  and auth.uid() is not null
);

create policy "photos_delete_scope" on storage.objects
for delete using (
  bucket_id = 'tank-tech-photos'
  and auth.uid() is not null
);
