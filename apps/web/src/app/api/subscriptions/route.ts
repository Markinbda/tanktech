import { addMonths, formatISO } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  propertyId: z.string().uuid(),
  tankId: z.string().uuid(),
  planId: z.string().uuid(),
  notes: z.string().optional(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["pause", "cancel"]),
});

export async function POST(request: Request) {
  const payload = createSchema.safeParse(await request.json());
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

  const { data: plan } = await supabase
    .from("service_plans")
    .select("cleaning_interval_months")
    .eq("id", payload.data.planId)
    .single();

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const nextDueDate = formatISO(addMonths(new Date(), plan.cleaning_interval_months), {
    representation: "date",
  });

  const { data: sub, error } = await supabase
    .from("subscriptions")
    .insert({
      owner_id: user.id,
      property_id: payload.data.propertyId,
      tank_id: payload.data.tankId,
      plan_id: payload.data.planId,
      status: "active",
      start_date: formatISO(new Date(), { representation: "date" }),
      next_due_date: nextDueDate,
      notes: payload.data.notes ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ subscriptionId: sub.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const payload = patchSchema.safeParse(await request.json());
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

  const newStatus = payload.data.action === "pause" ? "paused" : "cancelled";

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: newStatus })
    .eq("id", payload.data.id)
    .eq("owner_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
