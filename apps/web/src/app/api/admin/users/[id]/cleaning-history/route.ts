import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/admin-api";

type Params = { id: string };

const schema = z.object({
  tankId: z.string().uuid(),
  cleanedAt: z.string(),
  nextDueDate: z.string().nullable().optional(),
  notes: z.string().optional(),
  technicianComments: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const guard = await requireAdminApi();
  if (guard.errorResponse || !guard.admin) {
    return guard.errorResponse!;
  }

  const { id } = await params;
  const { data: entries, error } = await guard.admin
    .from("cleaning_history")
    .select("id, user_id, property_id, tank_id, cleaned_at, next_due_date, notes, technician_comments, created_at")
    .eq("user_id", id)
    .order("cleaned_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ entries: entries ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  const guard = await requireAdminApi();
  if (guard.errorResponse || !guard.admin || !guard.user) {
    return guard.errorResponse!;
  }

  const { id } = await params;
  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const { data: tank, error: tankError } = await guard.admin
    .from("tanks")
    .select("id, property_id")
    .eq("id", payload.data.tankId)
    .maybeSingle();

  const { data: property } = tank
    ? await guard.admin.from("properties").select("id, owner_id").eq("id", tank.property_id).maybeSingle()
    : { data: null };

  if (tankError || !tank || !property || property.owner_id !== id) {
    return NextResponse.json({ error: "Tank not found for user." }, { status: 400 });
  }

  const cleanedAt = new Date(payload.data.cleanedAt);
  const nextDueDate = payload.data.nextDueDate ? new Date(payload.data.nextDueDate) : null;
  if (Number.isNaN(cleanedAt.getTime()) || (nextDueDate && Number.isNaN(nextDueDate.getTime()))) {
    return NextResponse.json({ error: "Invalid date values." }, { status: 400 });
  }

  const { data: inserted, error } = await guard.admin
    .from("cleaning_history")
    .insert({
      user_id: id,
      property_id: tank.property_id,
      tank_id: payload.data.tankId,
      cleaned_at: cleanedAt.toISOString().slice(0, 10),
      next_due_date: nextDueDate ? nextDueDate.toISOString().slice(0, 10) : null,
      notes: payload.data.notes ?? null,
      technician_comments: payload.data.technicianComments ?? null,
      created_by: guard.user.id,
    })
    .select("id, user_id, property_id, tank_id, cleaned_at, next_due_date, notes, technician_comments, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await guard.admin
    .from("tanks")
    .update({
      last_cleaned_date: cleanedAt.toISOString().slice(0, 10),
      next_due_date: nextDueDate ? nextDueDate.toISOString().slice(0, 10) : null,
    })
    .eq("id", payload.data.tankId);

  return NextResponse.json({ entry: inserted }, { status: 201 });
}
