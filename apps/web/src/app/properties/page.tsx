import Link from "next/link";

import { requireUser } from "@/lib/auth";

export default async function PropertiesListPage() {
  const { supabase, user } = await requireUser();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, address, parish, notes")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Your Properties</h1>
      <p className="mt-2 text-slate-600">Select a property to view full details.</p>

      {properties?.length ? (
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow"
            >
              <p className="text-sm text-slate-500">Address</p>
              <p className="text-lg font-semibold text-slate-900">{property.address}</p>
              <p className="mt-3 text-sm text-slate-500">Parish</p>
              <p className="font-medium text-slate-800">{property.parish ?? "Not provided"}</p>
              <p className="mt-3 text-sm text-slate-500">Notes</p>
              <p className="line-clamp-2 text-slate-700">{property.notes ?? "None"}</p>
            </Link>
          ))}
        </section>
      ) : (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
          No properties found yet.
        </div>
      )}
    </main>
  );
}