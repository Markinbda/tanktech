import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  customerId: z.string().uuid(),
  propertyId: z.string().uuid(),
  tankId: z.string().uuid(),
  serviceType: z.enum([
    "Full water tank cleaning",
    "Inspection only",
    "Aeration/chlorination",
    "Emergency service",
    "Unsure (please advise)",
  ]),
  scheduledStart: z.string().min(1),
  scheduledEnd: z.string().min(1),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
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

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "staff"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const start = new Date(payload.data.scheduledStart);
  const end = new Date(payload.data.scheduledEnd);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    return NextResponse.json({ error: "Invalid schedule window." }, { status: 400 });
  }

  const { data: property } = await admin
    .from("properties")
    .select("id, owner_id, org_id")
    .eq("id", payload.data.propertyId)
    .maybeSingle();

  if (!property || property.owner_id !== payload.data.customerId) {
    return NextResponse.json({ error: "Selected property does not belong to this customer." }, { status: 400 });
  }

  const { data: tank } = await admin
    .from("tanks")
    .select("id, property_id")
    .eq("id", payload.data.tankId)
    .maybeSingle();

  if (!tank || tank.property_id !== property.id) {
    return NextResponse.json({ error: "Selected tank does not belong to the property." }, { status: 400 });
  }

  const notes = [
    `service_type:${payload.data.serviceType}`,
    payload.data.notes?.trim() ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  const { data: booking, error } = await admin
    .from("bookings")
    .insert({
      owner_id: payload.data.customerId,
      org_id: property.org_id,
      property_id: property.id,
      tank_id: tank.id,
      requested_window_start: start.toISOString(),
      requested_window_end: end.toISOString(),
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      status: "scheduled",
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: error?.message ?? "Unable to create booking." }, { status: 400 });
  }

  return NextResponse.json({ bookingId: booking.id }, { status: 201 });
}