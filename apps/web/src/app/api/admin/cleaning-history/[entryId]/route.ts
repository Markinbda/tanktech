import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/admin-api";

type Params = { entryId: string };

const patchSchema = z.object({
  cleanedAt: z.string().optional(),
  nextDueDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  technicianComments: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<Params> }) {
  const guard = await requireAdminApi();
  if (guard.errorResponse || !guard.admin) {
    return guard.errorResponse!;
  }

  const { entryId } = await params;
  const payload = patchSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const { data: existing, error: existingError } = await guard.admin
    .from("cleaning_history")
    .select("id, tank_id, cleaned_at, next_due_date")
    .eq("id", entryId)
    .maybeSingle();

  if (existingError || !existing) {
    return NextResponse.json({ error: "Cleaning entry not found." }, { status: 404 });
  }

  const cleanedAt = payload.data.cleanedAt ? new Date(payload.data.cleanedAt) : new Date(existing.cleaned_at);
  const nextDueDate =
    payload.data.nextDueDate === undefined
      ? existing.next_due_date
      : payload.data.nextDueDate
        ? new Date(payload.data.nextDueDate).toISOString().slice(0, 10)
        : null;

  if (Number.isNaN(cleanedAt.getTime())) {
    return NextResponse.json({ error: "Invalid cleaned date." }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    cleaned_at: cleanedAt.toISOString().slice(0, 10),
  };

  if (payload.data.nextDueDate !== undefined) {
    updatePayload.next_due_date = nextDueDate;
  }
  if (payload.data.notes !== undefined) {
    updatePayload.notes = payload.data.notes;
  }
  if (payload.data.technicianComments !== undefined) {
    updatePayload.technician_comments = payload.data.technicianComments;
  }

  const { data: updated, error: updateError } = await guard.admin
    .from("cleaning_history")
    .update(updatePayload)
    .eq("id", entryId)
    .select("id, user_id, property_id, tank_id, cleaned_at, next_due_date, notes, technician_comments, created_at")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await guard.admin
    .from("tanks")
    .update({
      last_cleaned_date: cleanedAt.toISOString().slice(0, 10),
      next_due_date: nextDueDate,
    })
    .eq("id", existing.tank_id);

  return NextResponse.json({ entry: updated });
}
