import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin-api";

export async function GET(request: Request) {
  const guard = await requireAdminApi();
  if (guard.errorResponse || !guard.admin) {
    return guard.errorResponse!;
  }

  const requestUrl = new URL(request.url);
  const month = requestUrl.searchParams.get("month");
  const baseDate = month ? new Date(`${month}-01`) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    return NextResponse.json({ error: "Invalid month format. Use YYYY-MM." }, { status: 400 });
  }

  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);

  const { data: tanks, error } = await guard.admin
    .from("tanks")
    .select("id, size_estimate, next_due_date, properties!inner(id, owner_id, address, parish)")
    .gte("next_due_date", start.toISOString().slice(0, 10))
    .lte("next_due_date", end.toISOString().slice(0, 10))
    .order("next_due_date", { ascending: true })
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const ownerIds = (tanks ?? []).map((tank) => {
    const property = Array.isArray(tank.properties) ? tank.properties[0] : tank.properties;
    return property.owner_id;
  });

  const { data: owners } = ownerIds.length
    ? await guard.admin.from("profiles").select("id, full_name, email, phone").in("id", ownerIds)
    : { data: [] as Array<{ id: string; full_name: string | null; email: string | null; phone: string | null }> };

  const ownersById = new Map((owners ?? []).map((owner) => [owner.id, owner]));

  const rows = (tanks ?? []).map((tank) => {
    const property = Array.isArray(tank.properties) ? tank.properties[0] : tank.properties;
    const owner = ownersById.get(property.owner_id);

    return {
      tankId: tank.id,
      propertyId: property.id,
      userId: property.owner_id,
      customerName: owner?.full_name ?? "Unknown customer",
      email: owner?.email,
      phone: owner?.phone,
      address: property.address,
      parish: property.parish,
      tankSize: tank.size_estimate,
      dueDate: tank.next_due_date,
    };
  });

  return NextResponse.json({ rows, month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}` });
}
