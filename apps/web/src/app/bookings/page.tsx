import { BookingTable } from "@/components/booking-table";
import { requireUser } from "@/lib/auth";

export default async function CustomerBookingsPage() {
  const { supabase, user } = await requireUser();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, technician_id, requested_window_start, requested_window_end, properties(address)")
    .eq("owner_id", user.id)
    .order("requested_window_start", { ascending: false })
    .limit(50);

  const rows = (bookings ?? []).map((booking) => {
    const property = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties;

    return {
      id: booking.id,
      property: property?.address ?? "Unknown",
      window: `${new Date(booking.requested_window_start).toLocaleDateString()} - ${new Date(
        booking.requested_window_end,
      ).toLocaleDateString()}`,
      status: booking.status,
      technician: booking.technician_id,
    };
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Your Bookings</h1>
      <p className="mt-2 text-slate-600">Review your recent booking requests and statuses.</p>

      <div className="mt-6">
        {rows.length ? (
          <BookingTable rows={rows} />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">No bookings found yet.</div>
        )}
      </div>
    </main>
  );
}