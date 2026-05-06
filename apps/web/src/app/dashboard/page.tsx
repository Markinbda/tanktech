import { DashboardCard } from "@/components/dashboard-card";
import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  const [{ count: propertyCount }, { count: tankCount }, { count: bookingCount }] =
    await Promise.all([
      supabase.from("properties").select("id", { head: true, count: "exact" }).eq("owner_id", user.id),
      supabase
        .from("tanks")
        .select("id, properties!inner(owner_id)", { head: true, count: "exact" })
        .eq("properties.owner_id", user.id),
      supabase.from("bookings").select("id", { head: true, count: "exact" }).eq("owner_id", user.id),
    ]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Customer Dashboard</h1>
      <p className="mt-2 text-slate-600">Manage your properties, tanks, bookings, and compliance schedule.</p>
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <DashboardCard label="Properties" value={propertyCount ?? 0} href="/properties" hint="View your properties" />
        <DashboardCard label="Tanks" value={tankCount ?? 0} href="/tanks" hint="View your tanks" />
        <DashboardCard label="Bookings" value={bookingCount ?? 0} href="/bookings" hint="View your bookings" />
      </section>
    </main>
  );
}
