import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin-api";

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  parish: string | null;
  preferred_contact_method: string | null;
  registration_details: Record<string, unknown> | null;
  created_at: string;
};

type UserWithRole = UserRow & { role: string };

type PropertyRow = {
  id: string;
  owner_id: string;
  address: string;
  parish: string | null;
};

type TankRow = {
  id: string;
  property_id: string;
  size_estimate: string | null;
  next_due_date: string | null;
};

type PublicUserRow = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  parish: string | null;
  preferredContactMethod: string | null;
  role: string;
  registrationDetails: Record<string, unknown>;
  numberOfTanks: number;
  tankSizes: string[];
  createdAt: string;
};

function mapPropertiesByOwner(properties: PropertyRow[]) {
  const map = new Map<string, PropertyRow[]>();
  for (const property of properties) {
    const list = map.get(property.owner_id) ?? [];
    list.push(property);
    map.set(property.owner_id, list);
  }
  return map;
}

function mapTanksByProperty(tanks: TankRow[]) {
  const map = new Map<string, TankRow[]>();
  for (const tank of tanks) {
    const list = map.get(tank.property_id) ?? [];
    list.push(tank);
    map.set(tank.property_id, list);
  }
  return map;
}

function applySearch(rows: PublicUserRow[], q: string) {
  if (!q) {
    return rows;
  }
  return rows.filter((row) => {
    const haystack = [row.fullName, row.email, row.phone, row.address, row.parish]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

function applySort(rows: PublicUserRow[], sort: string) {
  const comparators: Record<string, (a: PublicUserRow, b: PublicUserRow) => number> = {
    name_asc: (a, b) => String(a.fullName ?? "").localeCompare(String(b.fullName ?? "")),
    name_desc: (a, b) => String(b.fullName ?? "").localeCompare(String(a.fullName ?? "")),
    tanks_desc: (a, b) => b.numberOfTanks - a.numberOfTanks,
    tanks_asc: (a, b) => a.numberOfTanks - b.numberOfTanks,
    created_asc: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    created_desc: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  };

  const comparator = comparators[sort] ?? comparators.created_desc;
  return [...rows].sort(comparator);
}

async function loadTanks(admin: NonNullable<Awaited<ReturnType<typeof requireAdminApi>>["admin"]>, propertyIds: string[]) {
  if (!propertyIds.length) {
    return [] as TankRow[];
  }

  const { data } = await admin
    .from("tanks")
    .select("id, property_id, size_estimate, next_due_date")
    .in("property_id", propertyIds);

  return (data ?? []) as TankRow[];
}

export async function GET(request: Request) {
  const guard = await requireAdminApi();
  if (guard.errorResponse || !guard.admin) {
    return guard.errorResponse!;
  }

  const requestUrl = new URL(request.url);
  const q = requestUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const sort = requestUrl.searchParams.get("sort") ?? "created_desc";

  const { data: users, error: usersError } = await guard.admin
    .from("profiles")
    .select(
      "id, full_name, email, phone, address, parish, preferred_contact_method, registration_details, role, created_at",
    )
    .in("role", ["customer", "property_manager"])
    .limit(500);

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 400 });
  }

  const typedUsers = (users ?? []) as UserWithRole[];
  const userIds = typedUsers.map((user) => user.id);

  const { data: properties } = await guard.admin
    .from("properties")
    .select("id, owner_id, address, parish")
    .in("owner_id", userIds);

  const propertyRows = (properties ?? []) as PropertyRow[];
  const propertyIds = propertyRows.map((property) => property.id);
  const tankRows = await loadTanks(guard.admin, propertyIds);
  const propertiesByOwner = mapPropertiesByOwner(propertyRows);
  const tanksByProperty = mapTanksByProperty(tankRows);

  const rows = typedUsers.map((user) => {
    const ownerProperties = propertiesByOwner.get(user.id) ?? [];
    const userTanks = ownerProperties.flatMap((property) => tanksByProperty.get(property.id) ?? []);
    const fallbackProperty = ownerProperties[0];

    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      address: user.address ?? fallbackProperty?.address ?? null,
      parish: user.parish ?? fallbackProperty?.parish ?? null,
      preferredContactMethod: user.preferred_contact_method,
      role: user.role,
      registrationDetails: user.registration_details ?? {},
      numberOfTanks: userTanks.length,
      tankSizes: userTanks.map((tank) => tank.size_estimate ?? "Not specified"),
      createdAt: user.created_at,
    };
  });

  const searchedRows = applySearch(rows, q);
  return NextResponse.json({ rows: applySort(searchedRows, sort) });
}
