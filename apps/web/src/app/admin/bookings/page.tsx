import { BookingScheduler } from "@/components/admin/booking-scheduler";
import { requireRole } from "@/lib/auth";

export default async function AdminBookingsPage() {
  const { supabase } = await requireRole(["staff", "admin"]);

  const [{ data: bookings }, { data: technicians }] = await Promise.all([
    supabase
    .from("bookings")
    .select("id, status, technician_id, requested_window_start, requested_window_end, properties(address)")
    .order("requested_window_start", { ascending: false })
    .limit(100),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "staff")
      .order("full_name", { ascending: true }),
  ]);

  const rows = (bookings ?? []).map((booking) => {
    const property = Array.isArray(booking.properties)
      ? booking.properties[0]
      : booking.properties;

    return {
      id: booking.id,
      property: property?.address ?? "Unknown",
      requestedWindow: `${new Date(booking.requested_window_start).toLocaleDateString()} - ${new Date(
        booking.requested_window_end,
      ).toLocaleDateString()}`,
      status: booking.status,
      technicianId: booking.technician_id,
    };
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">All Bookings</h1>
      <p className="mt-2 text-sm text-slate-600">Schedule appointments, assign technicians, and update booking status.</p>
      <div className="mt-6">
        <BookingScheduler bookings={rows} technicians={technicians ?? []} />
      </div>
    </main>
  );
}
