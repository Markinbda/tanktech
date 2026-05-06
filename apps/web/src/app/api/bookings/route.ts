import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  propertyId: z.string().uuid(),
  tankId: z.string().uuid(),
  requestedWindowStart: z.string().datetime(),
  requestedWindowEnd: z.string().datetime(),
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

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      owner_id: user.id,
      property_id: payload.data.propertyId,
      tank_id: payload.data.tankId,
      requested_window_start: payload.data.requestedWindowStart,
      requested_window_end: payload.data.requestedWindowEnd,
      notes: payload.data.notes ?? null,
      status: "requested",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ bookingId: booking.id }, { status: 201 });
}
