import { requireRole } from "@/lib/auth";

export default async function PMSubscriptionsPage() {
  const { supabase, user } = await requireRole(["property_manager", "admin", "staff"]);

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("id, status, next_due_date, service_plans(name), properties(address)")
    .eq("org_id", profile?.org_id)
    .order("next_due_date", { ascending: true });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Portfolio Subscriptions</h1>
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Next Due</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(subscriptions ?? []).map((sub) => {
              const property = Array.isArray(sub.properties)
                ? sub.properties[0]
                : sub.properties;
              const plan = Array.isArray(sub.service_plans)
                ? sub.service_plans[0]
                : sub.service_plans;

              return (
                <tr key={sub.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{property?.address ?? "Unknown"}</td>
                  <td className="px-4 py-3">{plan?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-3">{sub.next_due_date ?? "-"}</td>
                  <td className="px-4 py-3 capitalize">{sub.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
