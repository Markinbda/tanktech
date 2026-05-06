# Tank Tech Platform

Production-ready monorepo scaffold for Tank Tech (Bermuda water-tank cleaning), including Next.js frontend, Supabase schema + RLS, and Supabase Edge Functions for transactional email reminders via SendGrid.

## Monorepo Structure

- `apps/web` - Next.js (TypeScript, App Router, Tailwind) frontend
- `supabase/migrations` - SQL migrations (schema + RLS + storage bucket)
- `supabase/functions/send-email` - Edge Function for SendGrid Mail Send API
- `supabase/functions/reminders-run` - Edge Function to compute/send due reminders
- `supabase/functions/generate-certificate` - Edge Function to issue and email certificate artifacts
- `.github/workflows/ci.yml` - GitHub Actions lint/test/build workflow

## Implemented Scope

### Phase 1 (MVP)
- Auth plumbing via Supabase Auth and role checks (`customer|property_manager|staff|admin`)
- Customer portal pages:
  - `/dashboard`
  - `/properties/[id]`
  - `/tanks/[id]`
  - `/bookings/new`
  - `/subscriptions`
- Booking API endpoint (`/api/bookings`) for `requested` cleanings
- Admin/staff pages:
  - `/admin/dashboard`
  - `/admin/bookings`
  - `/admin/customers`
- Compliance primitives:
  - `tanks.next_due_date`
  - `subscriptions.next_due_date`
  - interval-driven due logic in SQL triggers

### Phase 2 (Property Manager)
- Organization model:
  - `organizations`
  - `organization_members`
  - `properties` owner-or-org ownership mode
- PM pages:
  - `/pm/dashboard`
  - `/pm/properties`
  - `/pm/bookings`
  - `/pm/subscriptions`
  - `/pm/team`

### Phase 3 (Service Plans)
- `service_plans` and `subscriptions` tables
- Seeded plans: Basic/Standard/Premium
- Subscription endpoint (`/api/subscriptions`) create/pause/cancel
- Plan interval and reminder settings in data model

### Phase 4 Foundation
- `job_reports` table with before/after photo JSON fields and signoff timestamp
- Storage bucket `tank-tech-photos`
- `certificates` table and `tank-tech-certificates` storage bucket
- `organization_invites` workflow for PM team onboarding

## Security

- RLS enabled on all public tables in migration.
- Policy ownership and org scoping with `auth.uid()`.
- Staff/admin elevated policy paths for operational views/updates.
- No plaintext secrets in repo.

## Environment Variables

Use `.env.local` in `apps/web` (and map in deployment runtime):

- `NEXT_PUBLIC_SUPABASE_URL` (safe)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe)
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `SENDGRID_API_KEY` (server-side only)

For Supabase Edge Functions, configure:

```bash
supabase secrets set SENDGRID_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
```

Optional:

- `NEXT_PUBLIC_APP_URL`
- `AUTO_RECOMMENDED_BOOKINGS=true`

## Local Development

1. Install dependencies

```bash
npm install
```

2. Run frontend

```bash
npm run dev
```

3. Lint/test/build

```bash
npm run lint
npm run test
npm run build
```

4. Supabase CLI flow (recommended)

```bash
supabase start
supabase db reset
supabase functions serve send-email
supabase functions serve reminders-run
supabase functions serve generate-certificate
```

5. One-command local bootstrap

```bash
npm run bootstrap
```

6. Make local app publicly accessible

```bash
npm run dev:public
npm run expose
```

`npm run expose` prints a public `https://*.loca.lt` URL tunnel to your local app.

## Seed Data

- Demo seed file: `supabase/seed.sql`
- Applied automatically by `supabase db reset` via `supabase/config.toml`
- Includes realistic sample orgs, customers, properties, tanks, subscriptions, bookings, and reports

## Automatic Certificate Generation

- When admin/staff marks booking status as `completed`, the API calls `generate-certificate` Edge Function automatically.
- Function stores certificate artifact in `tank-tech-certificates` and sends `tanktech_job_completed_certificate_ready` email.

## Deploy Notes

- Deploy frontend to Vercel or equivalent with environment variables.
- Deploy Supabase migrations and functions:

```bash
supabase db push
supabase functions deploy send-email
supabase functions deploy reminders-run
supabase functions deploy generate-certificate
```

## SendGrid Templates (naming)

- `tanktech_booking_received`
- `tanktech_booking_confirmed`
- `tanktech_reminder_due_soon`
- `tanktech_reminder_overdue`
- `tanktech_job_completed_certificate_ready`
- `tanktech_team_invite`

All transactional sender identity should be:

- `Tank Tech <noreply@YOURDOMAIN>`

## GitHub Setup

1. Create GitHub repository and push this code.
2. Add repository secrets:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SENDGRID_API_KEY`
3. CI runs on push/PR via `.github/workflows/ci.yml`.
4. Set Supabase secrets for Edge Functions and app host URL.

## Roadmap Extensions

- Technician mobile workflow with upload + checklist capture
- PDF certificate generation and download links
- Stripe billing module for paid plan upgrades
