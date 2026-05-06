import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";

type Params = { id: string };

export default async function TankDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: tank } = await supabase
    .from("tanks")
    .select("id, size_estimate, access_notes, last_cleaned_date, next_due_date")
    .eq("id", id)
    .single();

  if (!tank) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-sky-950">Tank Details</h1>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">Size Estimate</p>
        <p className="text-lg font-semibold text-slate-800">{tank.size_estimate ?? "Unknown"}</p>
        <p className="mt-4 text-sm text-slate-500">Last Cleaned</p>
        <p className="font-medium text-slate-800">{tank.last_cleaned_date ?? "Not recorded"}</p>
        <p className="mt-4 text-sm text-slate-500">Next Due Date</p>
        <p className="font-medium text-slate-800">{tank.next_due_date ?? "Pending"}</p>
        <p className="mt-4 text-sm text-slate-500">Access Notes</p>
        <p className="text-slate-700">{tank.access_notes ?? "None"}</p>
      </div>
    </main>
  );
}
