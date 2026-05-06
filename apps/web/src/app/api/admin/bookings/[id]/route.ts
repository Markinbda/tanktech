import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  scheduledStart: z.string().optional().nullable(),
  scheduledEnd: z.string().optional().nullable(),
  technicianId: z.string().uuid().optional().nullable(),
  status: z.enum(["requested", "scheduled", "in_progress", "completed", "cancelled"]),
});

type Params = { id: string };

export async function PATCH(request: Request, { params }: { params: Promise<Params> }) {
  const { id } = await params;
  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || !["staff", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const updatePayload = {
    scheduled_start: payload.data.scheduledStart || null,
    scheduled_end: payload.data.scheduledEnd || null,
    technician_id: payload.data.technicianId || null,
    status: payload.data.status,
  };

  const { data: booking, error } = await admin
    .from("bookings")
    .update(updatePayload)
    .eq("id", id)
    .select("id, owner_id, properties(address), profiles!bookings_owner_id_fkey(email,full_name)")
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: error?.message ?? "Booking not found" }, { status: 400 });
  }

  if (payload.data.status === "scheduled") {
    const owner = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
    const property = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties;

    if (owner?.email) {
      await admin.functions.invoke("send-email", {
        body: {
          to: owner.email,
          template: "tanktech_booking_confirmed",
          bookingId: booking.id,
          dynamicData: {
            subject: "Tank Tech booking confirmed",
            customerName: owner.full_name,
            propertyAddress: property?.address,
            scheduledStart: payload.data.scheduledStart,
            scheduledEnd: payload.data.scheduledEnd,
          },
        },
      });
    }
  }

  if (payload.data.status === "completed") {
    await admin.functions.invoke("generate-certificate", {
      body: { bookingId: booking.id },
    });
  }

  return NextResponse.json({ ok: true });
}
