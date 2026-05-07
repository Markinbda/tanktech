import { requireRole } from "@/lib/auth";

import { AdminCustomersClient } from "./customers-client";

export default async function AdminCustomersPage() {
  const { supabase } = await requireRole(["admin"]);

  const { data: customers } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, address, parish, preferred_contact_method, role")
    .eq("role", "customer")
    .order("full_name", { ascending: true })
    .limit(500);

  return <AdminCustomersClient customers={customers ?? []} />;
}
