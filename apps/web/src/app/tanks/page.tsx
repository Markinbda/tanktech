import Link from "next/link";

import { requireUser } from "@/lib/auth";

type TankRow = {
  id: string;
  size_estimate: string | null;
  last_cleaned_date: string | null;
  next_due_date: string | null;
  properties: { owner_id: string; address: string | null } | { owner_id: string; address: string | null }[] | null;
};

function getPropertyAddress(tank: TankRow) {
  const property = Array.isArray(tank.properties) ? tank.properties[0] : tank.properties;
  return property?.address ?? "Unknown";
}

function TankCard({ tank }: { tank: TankRow }) {
  return (
    <Link
      href={`/tanks/${tank.id}`}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow"
    >
      <p className="text-sm text-slate-500">Property</p>
      <p className="text-lg font-semibold text-slate-900">{getPropertyAddress(tank)}</p>
      <p className="mt-3 text-sm text-slate-500">Size estimate</p>
      <p className="font-medium text-slate-800">{tank.size_estimate ?? "Unknown"}</p>
      <p className="mt-3 text-sm text-slate-500">Last cleaned</p>
      <p className="text-slate-700">{tank.last_cleaned_date ?? "Not recorded"}</p>
      <p className="mt-3 text-sm text-slate-500">Next due</p>
      <p className="text-slate-700">{tank.next_due_date ?? "Pending"}</p>
    </Link>
  );
}

export default async function TanksListPage() {
  const { supabase, user } = await requireUser();

  const { data: tanks } = await supabase
    .from("tanks")
    .select("id, size_estimate, last_cleaned_date, next_due_date, properties!inner(owner_id, address)")
    .eq("properties.owner_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (tanks ?? []) as TankRow[];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Your Tanks</h1>
      <p className="mt-2 text-slate-600">Select a tank to view full details.</p>

      {rows.length ? (
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {rows.map((tank) => (
            <TankCard key={tank.id} tank={tank} />
          ))}
        </section>
      ) : (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">No tanks found yet.</div>
      )}
    </main>
  );
}