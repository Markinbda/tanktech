import { requireRole } from "@/lib/auth";

export default async function AdminCustomersPage() {
  const { supabase } = await requireRole(["admin"]);

  const { data: customers } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role")
    .in("role", ["customer", "property_manager"])
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Customers</h1>
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {(customers ?? []).map((customer) => (
              <tr key={customer.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{customer.full_name ?? "-"}</td>
                <td className="px-4 py-3">{customer.email ?? "-"}</td>
                <td className="px-4 py-3">{customer.phone ?? "-"}</td>
                <td className="px-4 py-3 capitalize">{customer.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
