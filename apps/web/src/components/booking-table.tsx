import type { BookingStatus } from "@/lib/types";

type BookingRow = {
  id: string;
  property: string;
  window: string;
  status: BookingStatus;
  technician?: string | null;
};

const statusClasses: Record<BookingStatus, string> = {
  requested: "bg-amber-100 text-amber-900",
  scheduled: "bg-sky-100 text-sky-900",
  in_progress: "bg-indigo-100 text-indigo-900",
  completed: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-rose-100 text-rose-900",
};

export function BookingTable({ rows }: { rows: BookingRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-4 py-3">Property</th>
            <th className="px-4 py-3">Window</th>
            <th className="px-4 py-3">Technician</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="px-4 py-3 text-slate-700">{row.property}</td>
              <td className="px-4 py-3 text-slate-600">{row.window}</td>
              <td className="px-4 py-3 text-slate-600">{row.technician ?? "Unassigned"}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[row.status]}`}>
                  {row.status.replace("_", " ")}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
