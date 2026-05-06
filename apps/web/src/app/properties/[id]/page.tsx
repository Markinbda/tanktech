import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";

type Params = { id: string };

export default async function PropertyDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: property } = await supabase
    .from("properties")
    .select("id, address, parish, notes")
    .eq("id", id)
    .single();

  if (!property) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-sky-950">Property Details</h1>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">Address</p>
        <p className="text-lg font-semibold text-slate-800">{property.address}</p>
        <p className="mt-4 text-sm text-slate-500">Parish</p>
        <p className="font-medium text-slate-800">{property.parish ?? "Not provided"}</p>
        <p className="mt-4 text-sm text-slate-500">Notes</p>
        <p className="text-slate-700">{property.notes ?? "None"}</p>
      </div>
    </main>
  );
}
