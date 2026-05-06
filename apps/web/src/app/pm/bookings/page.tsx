import { BookingTable } from "@/components/booking-table";
import { requireRole } from "@/lib/auth";

export default async function PMBookingsPage() {
  const { supabase, user } = await requireRole(["property_manager", "admin", "staff"]);
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, technician_id, requested_window_start, requested_window_end, properties(address)")
    .eq("org_id", profile?.org_id)
    .order("requested_window_start", { ascending: false })
    .limit(50);

  const rows = (bookings ?? []).map((booking) => {
    const property = Array.isArray(booking.properties)
      ? booking.properties[0]
      : booking.properties;

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
      <h1 className="text-3xl font-bold text-sky-950">Portfolio Bookings</h1>
      <div className="mt-6">
        <BookingTable rows={rows} />
      </div>
    </main>
  );
}
