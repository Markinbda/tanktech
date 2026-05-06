import { DashboardCard } from "@/components/dashboard-card";
import { requireRole } from "@/lib/auth";

const today = new Date();
const todayISO = today.toISOString().slice(0, 10);
const dueSoonISO = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 30)
  .toISOString()
  .slice(0, 10);

export default async function PropertyManagerDashboard() {
  const { supabase, user } = await requireRole(["property_manager", "admin", "staff"]);

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.org_id;

  const [properties, tanks, dueSoon, overdue, upcoming] = await Promise.all([
    supabase.from("properties").select("id", { head: true, count: "exact" }).eq("org_id", orgId),
    supabase
      .from("tanks")
      .select("id, properties!inner(org_id)", { head: true, count: "exact" })
      .eq("properties.org_id", orgId),
    supabase
      .from("subscriptions")
      .select("id", { head: true, count: "exact" })
      .eq("org_id", orgId)
      .lte("next_due_date", dueSoonISO),
    supabase
      .from("subscriptions")
      .select("id", { head: true, count: "exact" })
      .eq("org_id", orgId)
      .lt("next_due_date", todayISO),
    supabase
      .from("bookings")
      .select("id", { head: true, count: "exact" })
      .eq("org_id", orgId)
      .in("status", ["requested", "scheduled"]),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Portfolio Dashboard</h1>
      <p className="mt-2 text-slate-600">Track compliance, tanks, and bookings across your properties.</p>
      <section className="mt-8 grid gap-4 md:grid-cols-5">
        <DashboardCard label="Properties" value={properties.count ?? 0} />
        <DashboardCard label="Tanks" value={tanks.count ?? 0} />
        <DashboardCard label="Due Soon" value={dueSoon.count ?? 0} />
        <DashboardCard label="Overdue" value={overdue.count ?? 0} />
        <DashboardCard label="Upcoming" value={upcoming.count ?? 0} />
      </section>
    </main>
  );
}
