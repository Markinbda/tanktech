import { BookingTable } from "@/components/booking-table";
import { requireUser } from "@/lib/auth";

export default async function CustomerBookingsPage() {
  const { supabase, user } = await requireUser();

  const [{ data: bookings }, { data: properties }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, status, technician_id, requested_window_start, requested_window_end, scheduled_start, scheduled_end, property_id, properties(address)")
      .eq("owner_id", user.id)
      .order("requested_window_start", { ascending: false })
      .limit(50),
    supabase
      .from("properties")
      .select("id, address")
      .eq("owner_id", user.id),
  ]);

  const propertyIds = (properties ?? []).map((property) => property.id);
  const { data: tanks } = propertyIds.length
    ? await supabase
      .from("tanks")
      .select("id, property_id, size_estimate")
      .in("property_id", propertyIds)
    : { data: [] as Array<{ id: string; property_id: string; size_estimate: string | null }> };

  const tankIds = (tanks ?? []).map((tank) => tank.id);
  const { data: cleaningHistory } = tankIds.length
    ? await supabase
      .from("cleaning_history")
      .select("id, tank_id, cleaned_at, next_due_date, notes")
      .in("tank_id", tankIds)
      .order("cleaned_at", { ascending: false })
      .limit(100)
    : { data: [] as Array<{ id: string; tank_id: string; cleaned_at: string; next_due_date: string | null; notes: string | null }> };

  const propertyById = new Map((properties ?? []).map((property) => [property.id, property]));
  const tankById = new Map((tanks ?? []).map((tank) => [tank.id, tank]));

  const rows = (bookings ?? []).map((booking) => {
    const property = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties;
    const windowStart = booking.scheduled_start ?? booking.requested_window_start;
    const windowEnd = booking.scheduled_end ?? booking.requested_window_end;

    return {
      id: booking.id,
      property: property?.address ?? "Unknown",
      window: `${new Date(windowStart).toLocaleDateString()} - ${new Date(windowEnd).toLocaleDateString()}`,
      status: booking.status,
      technician: booking.technician_id,
    };
  });

  const today = new Date();
  const nextScheduled = (bookings ?? [])
    .filter((booking) => (booking.scheduled_start ?? booking.requested_window_start) >= today.toISOString())
    .sort((a, b) => (a.scheduled_start ?? a.requested_window_start).localeCompare(b.scheduled_start ?? b.requested_window_start))[0] ?? null;

  const nextScheduledProperty = nextScheduled
    ? Array.isArray(nextScheduled.properties)
      ? nextScheduled.properties[0]
      : nextScheduled.properties
    : null;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-sky-950">My Cleaning</h1>
          <p className="mt-2 text-slate-600">Review your upcoming service and full cleaning history.</p>
        </div>
        <a
          href="/bookings/new"
          className="rounded-xl bg-sky-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800"
        >
          Request Cleaning
        </a>
      </div>

      <section className="mt-6 rounded-2xl border border-sky-100 bg-sky-50/70 p-5">
        <h2 className="text-lg font-semibold text-sky-950">Next Scheduled Cleaning</h2>
        {nextScheduled ? (
          <p className="mt-2 text-sm text-slate-700">
            {new Date(nextScheduled.scheduled_start ?? nextScheduled.requested_window_start).toLocaleDateString()} at {nextScheduledProperty?.address ?? "Your property"} ({nextScheduled.status.replaceAll("_", " ")})
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-700">No upcoming cleaning is scheduled yet.</p>
        )}
      </section>

      <h2 className="mt-8 text-xl font-semibold text-sky-950">Booking History</h2>

      <div className="mt-6">
        {rows.length ? (
          <BookingTable rows={rows} />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">No booking history found yet.</div>
        )}
      </div>

      <h2 className="mt-8 text-xl font-semibold text-sky-950">Completed Cleaning History</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Cleaned Date</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Tank</th>
              <th className="px-4 py-3">Next Due</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {(cleaningHistory ?? []).map((entry) => {
              const tank = tankById.get(entry.tank_id);
              const property = tank ? propertyById.get(tank.property_id) : null;

              return (
                <tr key={entry.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{new Date(entry.cleaned_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{property?.address ?? "-"}</td>
                  <td className="px-4 py-3">{tank?.size_estimate ?? "-"}</td>
                  <td className="px-4 py-3">{entry.next_due_date ?? "-"}</td>
                  <td className="px-4 py-3">{entry.notes ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(cleaningHistory ?? []).length === 0 ? (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">No completed cleanings recorded yet.</p>
      ) : null}
    </main>
  );
}