import { requireRole } from "@/lib/auth";

import { AdminCustomersClient } from "./customers-client";

type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  parish: string | null;
  preferred_contact_method: string | null;
  role: string;
};

async function loadCustomers(supabase: Awaited<ReturnType<typeof requireRole>>["supabase"]) {
  const fullSelect = "id, full_name, email, phone, address, parish, preferred_contact_method, role";
  const baseSelect = "id, full_name, email, phone, role";

  const fullResult = await supabase
    .from("profiles")
    .select(fullSelect)
    .eq("role", "customer")
    .order("full_name", { ascending: true })
    .limit(500);

  if (!fullResult.error) {
    return fullResult.data ?? [];
  }

  const message = fullResult.error.message.toLowerCase();
  const hasMissingColumnError = message.includes("column") && message.includes("does not exist");
  if (!hasMissingColumnError) {
    return [];
  }

  const { data: fallbackRows } = await supabase
    .from("profiles")
    .select(baseSelect)
    .eq("role", "customer")
    .order("full_name", { ascending: true })
    .limit(500);

  return (fallbackRows ?? []).map((row) => ({
    ...row,
    address: null,
    parish: null,
    preferred_contact_method: null,
  })) as CustomerRow[];
}

function mergeWithLatestProperty(customers: CustomerRow[], properties: Array<{ owner_id: string | null; address: string; parish: string | null; created_at: string }>) {
  const latestPropertyByOwner = new Map<string, { address: string; parish: string | null; createdAt: number }>();

  for (const property of properties) {
    if (!property.owner_id) {
      continue;
    }

    const createdAt = new Date(property.created_at).getTime();
    const existing = latestPropertyByOwner.get(property.owner_id);
    if (!existing || createdAt > existing.createdAt) {
      latestPropertyByOwner.set(property.owner_id, {
        address: property.address,
        parish: property.parish,
        createdAt,
      });
    }
  }

  return customers.map((customer) => {
    const property = latestPropertyByOwner.get(customer.id);
    return {
      ...customer,
      address: customer.address ?? property?.address ?? null,
      parish: customer.parish ?? property?.parish ?? null,
    };
  });
}

export default async function AdminCustomersPage() {
  const { supabase } = await requireRole(["admin"]);
  const customers = await loadCustomers(supabase);

  const customerIds = customers.map((customer) => customer.id);
  const { data: properties } = customerIds.length
    ? await supabase
      .from("properties")
      .select("owner_id, address, parish, created_at")
      .in("owner_id", customerIds)
    : { data: [] as Array<{ owner_id: string | null; address: string; parish: string | null; created_at: string }> };

  const enrichedCustomers = mergeWithLatestProperty(customers, properties ?? []);

  return <AdminCustomersClient customers={enrichedCustomers} />;
}
