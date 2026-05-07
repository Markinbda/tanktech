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

export default async function AdminCustomersPage() {
  const { supabase } = await requireRole(["admin"]);
  const customers = await loadCustomers(supabase);

  return <AdminCustomersClient customers={customers} />;
}
