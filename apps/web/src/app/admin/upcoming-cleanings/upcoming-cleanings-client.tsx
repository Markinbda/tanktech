"use client";

import { useEffect, useState } from "react";

type UpcomingRow = {
  tankId: string;
  userId: string;
  customerName: string;
  email: string | null;
  phone: string | null;
  address: string;
  parish: string | null;
  tankSize: string | null;
  dueDate: string;
};

function toMonthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function UpcomingCleaningsClient() {
  const [month, setMonth] = useState(toMonthValue(new Date()));
  const [rows, setRows] = useState<UpcomingRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function loadRows() {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/upcoming-cleanings?month=${encodeURIComponent(month)}`, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        setError("Unable to load upcoming cleanings.");
        setRows([]);
        setLoading(false);
        return;
      }

      const body = (await response.json()) as { rows: UpcomingRow[] };
      setRows(body.rows ?? []);
      setLoading(false);
    }

    void loadRows();
    return () => controller.abort();
  }, [month]);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Upcoming Cleanings</h1>
      <p className="mt-2 text-sm text-slate-600">Track tanks due this month and prepare reminder outreach.</p>

      <label className="mt-6 inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-sky-900">
        Due month
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="rounded-lg border border-sky-200 px-3 py-1.5"
        />
      </label>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Due date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Tank</th>
              <th className="px-4 py-3">Contact</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.tankId} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-sky-900">{row.dueDate}</td>
                <td className="px-4 py-3">
                  <p>{row.customerName}</p>
                  <p className="text-xs text-slate-600">{row.email ?? "No email"}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{row.address}</p>
                  <p className="text-xs text-slate-600">{row.parish ?? ""}</p>
                </td>
                <td className="px-4 py-3">{row.tankSize ?? "Not specified"}</td>
                <td className="px-4 py-3">{row.phone ?? "No phone"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading ? <p className="mt-4 text-sm text-slate-600">Loading upcoming cleanings...</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">No cleanings are due for this month.</p>
      ) : null}
    </main>
  );
}
