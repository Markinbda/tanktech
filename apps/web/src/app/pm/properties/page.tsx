import { requireRole } from "@/lib/auth";

export default async function PMPropertiesPage() {
  const { supabase, user } = await requireRole(["property_manager", "admin", "staff"]);

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, address, parish, notes")
    .eq("org_id", profile?.org_id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Portfolio Properties</h1>
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Parish</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {(properties ?? []).map((property) => (
              <tr key={property.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-700">{property.address}</td>
                <td className="px-4 py-3 text-slate-600">{property.parish ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">{property.notes ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
