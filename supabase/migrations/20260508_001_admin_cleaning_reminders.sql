-- Admin operations schema additions: richer registration metadata,
-- cleaning history tracking, and scheduled reminder records.

alter table public.profiles
  add column if not exists address text,
  add column if not exists parish text,
  add column if not exists preferred_contact_method text,
  add column if not exists registration_details jsonb not null default '{}'::jsonb;

create table if not exists public.cleaning_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid null references public.properties(id) on delete set null,
  tank_id uuid not null references public.tanks(id) on delete cascade,
  cleaned_at date not null,
  next_due_date date null,
  notes text,
  technician_comments text,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scheduled_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tank_id uuid not null references public.tanks(id) on delete cascade,
  due_date date not null,
  scheduled_for date not null,
  reminder_type text not null default 'cleaning_due',
  status text not null default 'pending',
  email text,
  sent_at timestamptz null,
  notes text,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_reminders_status_chk check (status in ('pending', 'sent', 'cancelled'))
);

create index if not exists idx_cleaning_history_user on public.cleaning_history(user_id);
create index if not exists idx_cleaning_history_tank on public.cleaning_history(tank_id);
create index if not exists idx_scheduled_reminders_due_date on public.scheduled_reminders(due_date);
create index if not exists idx_scheduled_reminders_status on public.scheduled_reminders(status);

drop trigger if exists trg_cleaning_history_updated_at on public.cleaning_history;
create trigger trg_cleaning_history_updated_at
before update on public.cleaning_history
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_scheduled_reminders_updated_at on public.scheduled_reminders;
create trigger trg_scheduled_reminders_updated_at
before update on public.scheduled_reminders
for each row execute procedure public.set_updated_at();

alter table public.cleaning_history enable row level security;
alter table public.scheduled_reminders enable row level security;

drop policy if exists "cleaning_history_select_scope" on public.cleaning_history;
create policy "cleaning_history_select_scope" on public.cleaning_history
for select using (
  public.current_user_role() = 'admin'
  or public.is_staff_or_admin()
  or user_id = auth.uid()
);

drop policy if exists "cleaning_history_manage_admin_staff" on public.cleaning_history;
create policy "cleaning_history_manage_admin_staff" on public.cleaning_history
for all using (
  public.current_user_role() = 'admin'
  or public.is_staff_or_admin()
)
with check (
  public.current_user_role() = 'admin'
  or public.is_staff_or_admin()
);

drop policy if exists "scheduled_reminders_select_admin" on public.scheduled_reminders;
create policy "scheduled_reminders_select_admin" on public.scheduled_reminders
for select using (public.current_user_role() = 'admin');

drop policy if exists "scheduled_reminders_manage_admin" on public.scheduled_reminders;
create policy "scheduled_reminders_manage_admin" on public.scheduled_reminders
for all using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
