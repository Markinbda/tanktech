import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin-api";

type Params = { id: string };

async function loadUser(admin: NonNullable<Awaited<ReturnType<typeof requireAdminApi>>["admin"]>, id: string) {
  return admin
    .from("profiles")
    .select(
      "id, full_name, email, phone, address, parish, preferred_contact_method, registration_details, role, created_at",
    )
    .eq("id", id)
    .maybeSingle();
}

async function loadProperties(admin: NonNullable<Awaited<ReturnType<typeof requireAdminApi>>["admin"]>, id: string) {
  return admin
    .from("properties")
    .select("id, address, parish, notes, created_at")
    .eq("owner_id", id)
    .order("created_at", { ascending: false });
}

async function loadTanks(
  admin: NonNullable<Awaited<ReturnType<typeof requireAdminApi>>["admin"]>,
  propertyIds: string[],
) {
  if (!propertyIds.length) {
    return {
      data: [] as Array<{
        id: string;
        property_id: string;
        size_estimate: string | null;
        last_cleaned_date: string | null;
        next_due_date: string | null;
        access_notes: string | null;
        created_at: string;
      }>,
    };
  }

  return admin
    .from("tanks")
    .select("id, property_id, size_estimate, last_cleaned_date, next_due_date, access_notes, created_at")
    .in("property_id", propertyIds)
    .order("created_at", { ascending: false });
}

async function loadCleaningHistory(
  admin: NonNullable<Awaited<ReturnType<typeof requireAdminApi>>["admin"]>,
  tankIds: string[],
) {
  if (!tankIds.length) {
    return { data: [] as Array<Record<string, unknown>> };
  }

  return admin
    .from("cleaning_history")
    .select("id, tank_id, cleaned_at, next_due_date, notes, technician_comments, created_at")
    .in("tank_id", tankIds)
    .order("cleaned_at", { ascending: false });
}

function resolveGuardResponse(guard: Awaited<ReturnType<typeof requireAdminApi>>) {
  if (guard.errorResponse || !guard.admin) {
    return { response: guard.errorResponse!, admin: null };
  }
  return { response: null, admin: guard.admin };
}

async function resolveUser(
  admin: NonNullable<Awaited<ReturnType<typeof requireAdminApi>>["admin"]>,
  id: string,
) {
  const { data: user, error: userError } = await loadUser(admin, id);
  if (userError) {
    return { response: NextResponse.json({ error: userError.message }, { status: 400 }), user: null };
  }
  if (!user) {
    return { response: NextResponse.json({ error: "User not found" }, { status: 404 }), user: null };
  }
  return { response: null, user };
}

export async function GET(_request: Request, { params }: { params: Promise<Params> }) {
  const guard = await requireAdminApi();
  const auth = resolveGuardResponse(guard);
  if (auth.response || !auth.admin) {
    return auth.response!;
  }

  const { id } = await params;
  const userResult = await resolveUser(auth.admin, id);
  if (userResult.response || !userResult.user) {
    return userResult.response!;
  }

  const { data: properties } = await loadProperties(auth.admin, id);

  const propertyIds = (properties ?? []).map((property) => property.id);

  const { data: tanks } = await loadTanks(auth.admin, propertyIds);

  const tankIds = (tanks ?? []).map((tank) => tank.id);
  const { data: cleaningHistory } = await loadCleaningHistory(auth.admin, tankIds);

  return NextResponse.json({
    user: userResult.user,
    properties: properties ?? [],
    tanks: tanks ?? [],
    cleaningHistory: cleaningHistory ?? [],
  });
}
