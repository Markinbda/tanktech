import Link from "next/link";

import { ServiceCalendar } from "@/components/admin/service-calendar";
import { DashboardCard } from "@/components/dashboard-card";
import { requireRole } from "@/lib/auth";

type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type PropertyRow = {
  id: string;
  owner_id: string;
  address: string;
};

type TankRow = {
  id: string;
  property_id: string;
  size_estimate: string | null;
  next_due_date: string | null;
  last_cleaned_date: string | null;
};

type CustomerSummary = {
  id: string;
  name: string;
  email: string;
  tankCount: number;
  nextDue: string | null;
  lastServiced: string | null;
};

function groupTanksByOwner(tanks: TankRow[], propertyById: Map<string, PropertyRow>) {
  const tanksByOwner = new Map<string, TankRow[]>();

  for (const tank of tanks) {
    const property = propertyById.get(tank.property_id);
    if (!property) {
      continue;
    }

    const list = tanksByOwner.get(property.owner_id) ?? [];
    list.push(tank);
    tanksByOwner.set(property.owner_id, list);
  }

  return tanksByOwner;
}

function resolveServiceDates(customerTanks: TankRow[]) {
  let nextDue: string | null = null;
  let lastServiced: string | null = null;

  for (const tank of customerTanks) {
    if (tank.next_due_date && (!nextDue || new Date(tank.next_due_date).getTime() < new Date(nextDue).getTime())) {
      nextDue = tank.next_due_date;
    }

    if (tank.last_cleaned_date && (!lastServiced || new Date(tank.last_cleaned_date).getTime() > new Date(lastServiced).getTime())) {
      lastServiced = tank.last_cleaned_date;
    }
  }

  return { nextDue, lastServiced };
}

function buildCustomerSummary(customers: CustomerRow[], tanksByOwner: Map<string, TankRow[]>) {
  const summary: CustomerSummary[] = [];

  for (const customer of customers) {
    const customerTanks = tanksByOwner.get(customer.id) ?? [];
    const serviceDates = resolveServiceDates(customerTanks);

    summary.push({
      id: customer.id,
      name: customer.full_name ?? "Unnamed customer",
      email: customer.email ?? "No email",
      tankCount: customerTanks.length,
      nextDue: serviceDates.nextDue,
      lastServiced: serviceDates.lastServiced,
    });
  }

  return summary;
}

function buildCalendarEvents(tanks: TankRow[], propertyById: Map<string, PropertyRow>, customerById: Map<string, CustomerSummary>) {
  return tanks
    .filter((tank) => Boolean(tank.next_due_date))
    .map((tank) => {
      const property = propertyById.get(tank.property_id);
      const customer = property ? customerById.get(property.owner_id) : null;

      return {
        id: tank.id,
        date: tank.next_due_date as string,
        customerId: customer?.id ?? "",
        customerName: customer?.name ?? "Unknown customer",
        label: `${tank.size_estimate ?? "Tank"} at ${property?.address ?? "Unknown property"}`,
      };
    })
    .filter((event) => event.customerId);
}

export default async function AdminDashboardPage() {
  const { supabase } = await requireRole(["admin"]);

  const [requested, scheduled, inProgress, completed, customers] = await Promise.all([
    supabase.from("bookings").select("id", { head: true, count: "exact" }).eq("status", "requested"),
    supabase.from("bookings").select("id", { head: true, count: "exact" }).eq("status", "scheduled"),
    supabase.from("bookings").select("id", { head: true, count: "exact" }).eq("status", "in_progress"),
    supabase.from("bookings").select("id", { head: true, count: "exact" }).eq("status", "completed"),
    supabase.from("profiles").select("id, full_name, email").eq("role", "customer").order("created_at", { ascending: false }).limit(120),
  ]);

  const customerRows = (customers.data ?? []) as CustomerRow[];
  const customerIds = customerRows.map((customer) => customer.id);

  const { data: properties } = customerIds.length
    ? await supabase.from("properties").select("id, owner_id, address").in("owner_id", customerIds)
    : { data: [] as PropertyRow[] };

  const propertyRows = (properties ?? []) as PropertyRow[];
  const propertyById = new Map(propertyRows.map((property) => [property.id, property]));
  const propertyIds = propertyRows.map((property) => property.id);

  const { data: tanks } = propertyIds.length
    ? await supabase
        .from("tanks")
        .select("id, property_id, size_estimate, next_due_date, last_cleaned_date")
        .in("property_id", propertyIds)
    : { data: [] as TankRow[] };

  const tankRows = (tanks ?? []) as TankRow[];

  const tanksByOwner = groupTanksByOwner(tankRows, propertyById);
  const customerSummary = buildCustomerSummary(customerRows, tanksByOwner);

  const customerById = new Map(customerSummary.map((customer) => [customer.id, customer]));
  const calendarEvents = buildCalendarEvents(tankRows, propertyById, customerById);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Operations Dashboard</h1>
      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <DashboardCard label="Requested" value={requested.count ?? 0} />
        <DashboardCard label="Scheduled" value={scheduled.count ?? 0} />
        <DashboardCard label="In Progress" value={inProgress.count ?? 0} />
        <DashboardCard label="Completed" value={completed.count ?? 0} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-sky-950">Customer Service Rows</h2>
            <Link href="/admin/users" className="text-sm font-semibold text-sky-800 hover:underline">
              Open full directory
            </Link>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Tanks</th>
                  <th className="px-3 py-2">Last Serviced</th>
                  <th className="px-3 py-2">Next Service</th>
                  <th className="px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {customerSummary.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-sky-950">{row.name}</p>
                      <p className="text-xs text-slate-600">{row.email}</p>
                    </td>
                    <td className="px-3 py-2">{row.tankCount}</td>
                    <td className="px-3 py-2">{row.lastServiced ?? "-"}</td>
                    <td className="px-3 py-2">{row.nextDue ?? "-"}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/users/${row.id}`}
                        className="inline-flex rounded-lg border border-sky-200 px-2 py-1 text-xs font-semibold text-sky-900 hover:bg-sky-50"
                      >
                        View tanks
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <ServiceCalendar events={calendarEvents} />
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/customers" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-sky-900 hover:bg-sky-50">
          Customer drill-down
        </Link>
        <Link href="/admin/upcoming-cleanings" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-sky-900 hover:bg-sky-50">
          Upcoming cleanings
        </Link>
        <Link href="/admin/bookings" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-sky-900 hover:bg-sky-50">
          Booking scheduler
        </Link>
      </section>
    </main>
  );
}
