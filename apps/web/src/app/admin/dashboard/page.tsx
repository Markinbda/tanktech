import Link from "next/link";

import { DashboardCard } from "@/components/dashboard-card";
import { requireRole } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const { supabase } = await requireRole(["admin"]);

  const [requested, scheduled, inProgress, completed] = await Promise.all([
    supabase.from("bookings").select("id", { head: true, count: "exact" }).eq("status", "requested"),
    supabase.from("bookings").select("id", { head: true, count: "exact" }).eq("status", "scheduled"),
    supabase.from("bookings").select("id", { head: true, count: "exact" }).eq("status", "in_progress"),
    supabase.from("bookings").select("id", { head: true, count: "exact" }).eq("status", "completed"),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Operations Dashboard</h1>
      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <DashboardCard label="Requested" value={requested.count ?? 0} />
        <DashboardCard label="Scheduled" value={scheduled.count ?? 0} />
        <DashboardCard label="In Progress" value={inProgress.count ?? 0} />
        <DashboardCard label="Completed" value={completed.count ?? 0} />
      </section>
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/users" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-sky-900 hover:bg-sky-50">
          User Directory
        </Link>
        <Link href="/admin/upcoming-cleanings" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-sky-900 hover:bg-sky-50">
          Upcoming Cleanings
        </Link>
        <Link href="/admin/reminders" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-sky-900 hover:bg-sky-50">
          Reminder Management
        </Link>
        <Link href="/admin/bookings" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-sky-900 hover:bg-sky-50">
          Booking Scheduler
        </Link>
      </section>
    </main>
  );
}
