import Link from "next/link";

import { requireRole } from "@/lib/auth";

export default async function AdminCustomersPage() {
  const { supabase } = await requireRole(["admin"]);

  const { data: customers } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role")
    .eq("role", "customer")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Customers</h1>
      <p className="mt-2 text-sm text-slate-600">Click a customer to open their tanks, service history, and next due schedule.</p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(customers ?? []).map((customer) => (
              <tr key={customer.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-sky-950">
                  <Link href={`/admin/users/${customer.id}`} className="hover:text-sky-700 hover:underline">
                    {customer.full_name ?? "-"}
                  </Link>
                </td>
                <td className="px-4 py-3">{customer.email ?? "-"}</td>
                <td className="px-4 py-3">{customer.phone ?? "-"}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${customer.id}`}
                    className="inline-flex rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-900 hover:bg-sky-50"
                  >
                    View details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
