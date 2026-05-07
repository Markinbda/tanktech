import { AdminBookingIntake } from "@/components/admin/admin-booking-intake";
import { BookingScheduler } from "@/components/admin/booking-scheduler";
import { requireRole } from "@/lib/auth";

export default async function AdminBookingsPage() {
  const { supabase } = await requireRole(["admin"]);

  const [{ data: bookings }, { data: technicians }, { data: customers }, { data: properties }, { data: tanks }] = await Promise.all([
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
    supabase
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("role", "customer")
      .order("full_name", { ascending: true })
      .limit(400),
    supabase
      .from("properties")
      .select("id, owner_id, address, parish")
      .order("created_at", { ascending: false }),
    supabase
      .from("tanks")
      .select("id, property_id, size_estimate, last_cleaned_date, next_due_date")
      .order("created_at", { ascending: false }),
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
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
      <h1 className="text-3xl font-bold text-sky-950">Admin Booking Center</h1>
      <p className="mt-1 text-sm text-slate-600">Search customers, open contact/property detail shortcuts, and book service windows.</p>

      <div className="mt-4">
        <AdminBookingIntake customers={customers ?? []} properties={properties ?? []} tanks={tanks ?? []} />
      </div>

      <div className="mt-4">
        <h2 className="text-xl font-semibold text-sky-950">Update Existing Bookings</h2>
        <p className="mt-1 text-sm text-slate-600">Adjust technician assignment, schedule window, and status.</p>
      </div>

      <div className="mt-3">
        <BookingScheduler bookings={rows} technicians={technicians ?? []} />
      </div>
    </main>
  );
}
