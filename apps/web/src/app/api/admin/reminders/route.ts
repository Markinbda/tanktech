import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/admin-api";

const sendNowSchema = z.object({
  month: z.string().optional(),
  userIds: z.array(z.string().uuid()).optional(),
  notes: z.string().optional(),
});

async function loadDueRows(
  admin: Awaited<ReturnType<typeof requireAdminApi>>["admin"],
  month?: string,
  userIds?: string[],
) {
  const baseDate = month ? new Date(`${month}-01`) : new Date();
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);

  let tanksQuery = admin!
    .from("tanks")
    .select("id, size_estimate, next_due_date, properties!inner(id, owner_id, address, parish)")
    .gte("next_due_date", start.toISOString().slice(0, 10))
    .lte("next_due_date", end.toISOString().slice(0, 10));

  if (userIds?.length) {
    tanksQuery = tanksQuery.in("properties.owner_id", userIds);
  }

  const { data: tanks, error } = await tanksQuery.order("next_due_date", { ascending: true }).limit(1000);
  if (error) {
    throw new Error(error.message);
  }

  const ownerIds = (tanks ?? []).map((tank) => {
    const property = Array.isArray(tank.properties) ? tank.properties[0] : tank.properties;
    return property.owner_id;
  });

  const { data: owners, error: ownersError } = ownerIds.length
    ? await admin!.from("profiles").select("id, full_name, email").in("id", ownerIds)
    : { data: [], error: null };

  if (ownersError) {
    throw new Error(ownersError.message);
  }

  const ownerMap = new Map((owners ?? []).map((owner) => [owner.id, owner]));

  return (tanks ?? []).map((tank) => {
    const property = Array.isArray(tank.properties) ? tank.properties[0] : tank.properties;
    const owner = ownerMap.get(property.owner_id);

    return {
      userId: property.owner_id,
      tankId: tank.id,
      dueDate: tank.next_due_date,
      propertyAddress: property.address,
      tankSize: tank.size_estimate,
      email: owner?.email ?? null,
      customerName: owner?.full_name ?? "Customer",
    };
  });
}

export async function GET(request: Request) {
  const guard = await requireAdminApi();
  if (guard.errorResponse || !guard.admin) {
    return guard.errorResponse!;
  }

  const requestUrl = new URL(request.url);
  const status = requestUrl.searchParams.get("status");

  let query = guard.admin
    .from("scheduled_reminders")
    .select("id, user_id, tank_id, due_date, scheduled_for, reminder_type, status, email, sent_at, notes, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.errorResponse || !guard.admin || !guard.user) {
    return guard.errorResponse!;
  }

  const payload = sendNowSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  try {
    const dueRows = await loadDueRows(guard.admin, payload.data.month, payload.data.userIds);
    if (!dueRows.length) {
      return NextResponse.json({ sent: 0, rows: [] });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const sentRows: Array<Record<string, unknown>> = [];

    for (const row of dueRows) {
      const reminderInsert = {
        user_id: row.userId,
        tank_id: row.tankId,
        due_date: row.dueDate,
        scheduled_for: new Date().toISOString().slice(0, 10),
        reminder_type: "cleaning_due",
        status: "pending",
        email: row.email,
        notes: payload.data.notes ?? null,
        created_by: guard.user.id,
      };

      const { data: reminder } = await guard.admin
        .from("scheduled_reminders")
        .insert(reminderInsert)
        .select("id")
        .single();

      if (row.email) {
        const sendResponse = await fetch(`${baseUrl}/api/email/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: row.email,
            template: "tanktech_reminder_due_soon",
            data: {
              customerName: row.customerName,
              dueDate: row.dueDate,
              propertyAddress: row.propertyAddress,
              tankSize: row.tankSize,
            },
          }),
        });

        if (sendResponse.ok && reminder?.id) {
          await guard.admin
            .from("scheduled_reminders")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", reminder.id);
        }
      }

      sentRows.push({
        reminderId: reminder?.id,
        email: row.email,
        userId: row.userId,
        tankId: row.tankId,
        dueDate: row.dueDate,
      });
    }

    return NextResponse.json({ sent: sentRows.length, rows: sentRows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send reminders." },
      { status: 400 },
    );
  }
}
