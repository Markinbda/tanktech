import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/admin-api";

const sendNowSchema = z.object({
  month: z.string().optional(),
  userIds: z.array(z.string().uuid()).optional(),
  notes: z.string().optional(),
});

type ReminderFilters = {
  status: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  propertyType: string | null;
  customerQuery: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type TankRow = {
  id: string;
  size_estimate: string | null;
  property_id: string;
};

type PropertyRow = {
  id: string;
  owner_id: string | null;
  address: string;
  parish: string | null;
  notes: string | null;
};

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function asDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
}

function parseMonth(month?: string) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  const value = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value;
}

function classifyPropertyType(notes: string | null, address: string) {
  const text = `${notes ?? ""} ${address}`.toLowerCase();

  if (/(hotel|resort|restaurant|office|warehouse|shop|commercial|school|church)/.test(text)) {
    return "Commercial";
  }

  if (/(apartment|condo|house|home|villa|residential)/.test(text)) {
    return "Residential";
  }

  return "Unknown";
}

function normalizeFilterInputs(filters: ReminderFilters) {
  return {
    customerQuery: filters.customerQuery?.trim().toLowerCase() ?? "",
    propertyTypeFilter: filters.propertyType?.trim() ?? "all",
  };
}

function matchesCustomerAndPropertyFilter(
  row: { customerName: string; customerEmail: string | null; propertyType: string },
  normalized: ReturnType<typeof normalizeFilterInputs>,
) {
  if (normalized.propertyTypeFilter !== "all" && row.propertyType !== normalized.propertyTypeFilter) {
    return false;
  }

  if (!normalized.customerQuery) {
    return true;
  }

  const haystack = `${row.customerName} ${row.customerEmail ?? ""}`.toLowerCase();
  return haystack.includes(normalized.customerQuery);
}

function toUpcomingBookingRow(
  booking: { id: string; owner_id: string; tank_id: string; property_id: string; scheduled_start: string | null },
) {
  const appointment = booking.scheduled_start ? new Date(booking.scheduled_start) : null;
  if (!appointment || Number.isNaN(appointment.getTime())) {
    return null;
  }

  const reminderSendDate = addDays(new Date(appointment.getFullYear(), appointment.getMonth(), appointment.getDate()), -7);

  return {
    bookingId: booking.id,
    userId: booking.owner_id,
    tankId: booking.tank_id,
    propertyId: booking.property_id,
    appointmentAt: booking.scheduled_start,
    appointmentDate: asDateOnly(appointment),
    reminderSendDate: asDateOnly(reminderSendDate),
  };
}

function toDispatchCandidate(
  booking: { id: string; owner_id: string; tank_id: string; property_id: string; scheduled_start: string | null },
  today: Date,
) {
  const appointment = booking.scheduled_start ? new Date(booking.scheduled_start) : null;
  if (!appointment || Number.isNaN(appointment.getTime())) {
    return null;
  }

  const appointmentDate = new Date(appointment.getFullYear(), appointment.getMonth(), appointment.getDate());
  const reminderDate = addDays(appointmentDate, -7);
  if (reminderDate.getTime() > today.getTime() || appointmentDate.getTime() < today.getTime()) {
    return null;
  }

  return {
    bookingId: booking.id,
    userId: booking.owner_id,
    tankId: booking.tank_id,
    propertyId: booking.property_id,
    dueDate: asDateOnly(appointmentDate),
    scheduledFor: asDateOnly(reminderDate),
  };
}

async function loadProfilesAndAssets(
  admin: Awaited<ReturnType<typeof requireAdminApi>>["admin"],
  userIds: string[],
  tankIds: string[],
  propertyIds: string[],
) {
  const [{ data: profiles, error: profilesError }, { data: tanks, error: tanksError }, { data: properties, error: propertiesError }] =
    await Promise.all([
      userIds.length
        ? admin!.from("profiles").select("id, full_name, email").in("id", userIds)
        : Promise.resolve({ data: [] as ProfileRow[], error: null }),
      tankIds.length
        ? admin!.from("tanks").select("id, size_estimate, property_id").in("id", tankIds)
        : Promise.resolve({ data: [] as TankRow[], error: null }),
      propertyIds.length
        ? admin!.from("properties").select("id, owner_id, address, parish, notes").in("id", propertyIds)
        : Promise.resolve({ data: [] as PropertyRow[], error: null }),
    ]);

  if (profilesError) throw new Error(profilesError.message);
  if (tanksError) throw new Error(tanksError.message);
  if (propertiesError) throw new Error(propertiesError.message);

  return {
    profileMap: new Map((profiles ?? []).map((profile) => [profile.id, profile])),
    tankMap: new Map((tanks ?? []).map((tank) => [tank.id, tank])),
    propertyMap: new Map((properties ?? []).map((property) => [property.id, property])),
  };
}

async function loadReminderHistory(
  admin: Awaited<ReturnType<typeof requireAdminApi>>["admin"],
  filters: ReminderFilters,
) {
  let query = admin!
    .from("scheduled_reminders")
    .select("id, user_id, tank_id, due_date, scheduled_for, reminder_type, status, email, sent_at, notes, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.dateFrom) {
    query = query.gte("scheduled_for", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("scheduled_for", filters.dateTo);
  }

  const { data: rows, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const userIds = Array.from(new Set((rows ?? []).map((row) => row.user_id)));
  const tankIds = Array.from(new Set((rows ?? []).map((row) => row.tank_id)));

  const { data: tanks, error: tanksError } = tankIds.length
    ? await admin!.from("tanks").select("id, size_estimate, property_id").in("id", tankIds)
    : { data: [] as TankRow[], error: null };

  if (tanksError) {
    throw new Error(tanksError.message);
  }

  const propertyIds = Array.from(new Set((tanks ?? []).map((tank) => tank.property_id)));
  const assets = await loadProfilesAndAssets(admin, userIds, tankIds, propertyIds);

  const normalizedFilters = normalizeFilterInputs(filters);

  return (rows ?? [])
    .map((row) => {
      const profile = assets.profileMap.get(row.user_id);
      const tank = assets.tankMap.get(row.tank_id);
      const property = tank ? assets.propertyMap.get(tank.property_id) : null;
      const propertyType = classifyPropertyType(property?.notes ?? null, property?.address ?? "");

      return {
        id: row.id,
        scheduledFor: row.scheduled_for,
        dueDate: row.due_date,
        status: row.status,
        reminderType: row.reminder_type,
        email: row.email,
        sentAt: row.sent_at,
        notes: row.notes,
        createdAt: row.created_at,
        customerName: profile?.full_name ?? "Customer",
        customerEmail: profile?.email ?? row.email,
        propertyAddress: property?.address ?? "Unknown",
        parish: property?.parish ?? null,
        propertyType,
        tankSize: tank?.size_estimate ?? null,
      };
    })
    .filter((row) => matchesCustomerAndPropertyFilter(row, normalizedFilters));
}

async function loadUpcomingReminderQueue(
  admin: Awaited<ReturnType<typeof requireAdminApi>>["admin"],
  filters: ReminderFilters,
) {
  const today = startOfToday();
  const horizon = addDays(today, 35);

  let query = admin!
    .from("bookings")
    .select("id, owner_id, tank_id, property_id, scheduled_start, status")
    .in("status", ["scheduled", "in_progress"])
    .not("scheduled_start", "is", null)
    .gte("scheduled_start", `${asDateOnly(today)}T00:00:00.000Z`)
    .lte("scheduled_start", `${asDateOnly(horizon)}T23:59:59.999Z`)
    .order("scheduled_start", { ascending: true })
    .limit(500);

  const { data: bookings, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const bookingRows = (bookings ?? [])
    .map((booking) => toUpcomingBookingRow(booking))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const userIds = Array.from(new Set(bookingRows.map((row) => row.userId)));
  const tankIds = Array.from(new Set(bookingRows.map((row) => row.tankId)));
  const propertyIds = Array.from(new Set(bookingRows.map((row) => row.propertyId)));
  const assets = await loadProfilesAndAssets(admin, userIds, tankIds, propertyIds);

  const normalizedFilters = normalizeFilterInputs(filters);

  return bookingRows
    .map((row) => {
      const profile = assets.profileMap.get(row.userId);
      const tank = assets.tankMap.get(row.tankId);
      const property = assets.propertyMap.get(row.propertyId);
      const propertyType = classifyPropertyType(property?.notes ?? null, property?.address ?? "");
      const daysUntilSend = Math.ceil(
        (new Date(`${row.reminderSendDate}T00:00:00`).getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
      );

      return {
        ...row,
        customerName: profile?.full_name ?? "Customer",
        customerEmail: profile?.email ?? null,
        propertyAddress: property?.address ?? "Unknown",
        parish: property?.parish ?? null,
        propertyType,
        tankSize: tank?.size_estimate ?? null,
        daysUntilSend,
      };
    })
    .filter((row) => row.daysUntilSend >= 0 && row.daysUntilSend <= 28)
    .filter((row) => matchesCustomerAndPropertyFilter(row, normalizedFilters))
    .sort((a, b) => a.reminderSendDate.localeCompare(b.reminderSendDate));
}

export async function GET(request: Request) {
  const guard = await requireAdminApi();
  if (guard.errorResponse || !guard.admin) {
    return guard.errorResponse!;
  }

  try {
    const requestUrl = new URL(request.url);
    const filters: ReminderFilters = {
      status: requestUrl.searchParams.get("status"),
      dateFrom: requestUrl.searchParams.get("dateFrom"),
      dateTo: requestUrl.searchParams.get("dateTo"),
      propertyType: requestUrl.searchParams.get("propertyType"),
      customerQuery: requestUrl.searchParams.get("customer"),
    };

    const [rows, upcoming] = await Promise.all([
      loadReminderHistory(guard.admin, filters),
      loadUpcomingReminderQueue(guard.admin, filters),
    ]);

    return NextResponse.json({ rows, upcoming });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load reminders." },
      { status: 400 },
    );
  }
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
    const monthDate = parseMonth(payload.data.month);
    const today = startOfToday();
    const startDate = monthDate ?? today;
    const endDate = monthDate
      ? new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      : addDays(today, 60);

    let bookingsQuery = guard.admin
      .from("bookings")
      .select("id, owner_id, tank_id, property_id, scheduled_start, status")
      .in("status", ["scheduled", "in_progress"])
      .not("scheduled_start", "is", null)
      .gte("scheduled_start", `${asDateOnly(startDate)}T00:00:00.000Z`)
      .lte("scheduled_start", `${asDateOnly(endDate)}T23:59:59.999Z`)
      .order("scheduled_start", { ascending: true })
      .limit(500);

    if (payload.data.userIds?.length) {
      bookingsQuery = bookingsQuery.in("owner_id", payload.data.userIds);
    }

    const { data: bookingRows, error: bookingsError } = await bookingsQuery;
    if (bookingsError) {
      throw new Error(bookingsError.message);
    }

    const candidates = (bookingRows ?? [])
      .map((booking) => toDispatchCandidate(booking, today))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    if (!candidates.length) {
      return NextResponse.json({ sent: 0, rows: [] });
    }

    const reminderTankIds = Array.from(new Set(candidates.map((candidate) => candidate.tankId)));
    const reminderDueDates = Array.from(new Set(candidates.map((candidate) => candidate.dueDate)));

    const { data: existingRows, error: existingError } = await guard.admin
      .from("scheduled_reminders")
      .select("tank_id, due_date, status")
      .eq("reminder_type", "booking_one_week")
      .in("tank_id", reminderTankIds)
      .in("due_date", reminderDueDates);

    if (existingError) {
      throw new Error(existingError.message);
    }

    const dedupeKeys = new Set((existingRows ?? []).map((row) => `${row.tank_id}|${row.due_date}`));

    const userIds = Array.from(new Set(candidates.map((candidate) => candidate.userId)));
    const tankIds = Array.from(new Set(candidates.map((candidate) => candidate.tankId)));
    const propertyIds = Array.from(new Set(candidates.map((candidate) => candidate.propertyId)));
    const assets = await loadProfilesAndAssets(guard.admin, userIds, tankIds, propertyIds);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const sentRows: Array<Record<string, unknown>> = [];
    let sentCount = 0;

    for (const row of candidates) {
      const dedupeKey = `${row.tankId}|${row.dueDate}`;
      if (dedupeKeys.has(dedupeKey)) {
        continue;
      }

      const profile = assets.profileMap.get(row.userId);
      const property = assets.propertyMap.get(row.propertyId);
      const tank = assets.tankMap.get(row.tankId);

      const reminderInsert = {
        user_id: row.userId,
        tank_id: row.tankId,
        due_date: row.dueDate,
        scheduled_for: row.scheduledFor,
        reminder_type: "booking_one_week",
        status: "pending",
        email: profile?.email ?? null,
        notes: payload.data.notes ? `${payload.data.notes}\nbooking_id:${row.bookingId}` : `booking_id:${row.bookingId}`,
        created_by: guard.user.id,
      };

      const { data: reminder } = await guard.admin
        .from("scheduled_reminders")
        .insert(reminderInsert)
        .select("id")
        .single();

      if (profile?.email) {
        const sendResponse = await fetch(`${baseUrl}/api/email/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: profile.email,
            template: "tanktech_reminder_due_soon",
            data: {
              customerName: profile?.full_name ?? "Customer",
              dueDate: row.dueDate,
              propertyAddress: property?.address ?? "Property",
              tankSize: tank?.size_estimate ?? "Not specified",
            },
          }),
        });

        if (sendResponse.ok && reminder?.id) {
          await guard.admin
            .from("scheduled_reminders")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", reminder.id);

          sentCount += 1;
        }
      }

      sentRows.push({
        reminderId: reminder?.id,
        email: profile?.email ?? null,
        userId: row.userId,
        tankId: row.tankId,
        dueDate: row.dueDate,
      });
    }

    return NextResponse.json({ sent: sentCount, rows: sentRows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send reminders." },
      { status: 400 },
    );
  }
}
