"use client";

import { FormEvent, useEffect, useState } from "react";

type ReminderRow = {
  id: string;
  user_id: string;
  tank_id: string;
  due_date: string;
  scheduled_for: string;
  reminder_type: string;
  status: "pending" | "sent" | "cancelled";
  email: string | null;
  sent_at: string | null;
  notes: string | null;
  created_at: string;
};

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function AdminRemindersClient() {
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState<ReminderRow[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [notes, setNotes] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  async function loadRows() {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (status !== "all") {
      params.set("status", status);
    }

    const response = await fetch(`/api/admin/reminders?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) {
      setError("Unable to load reminders.");
      setRows([]);
      setLoading(false);
      return;
    }

    const body = (await response.json()) as { rows: ReminderRow[] };
    setRows(body.rows ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void loadRows();
  }, [status]);

  async function sendNow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSending(true);
    setError(null);
    setResultMessage(null);

    const response = await fetch("/api/admin/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, notes }),
    });

    const body = (await response.json().catch(() => ({}))) as { sent?: number; error?: string };
    if (!response.ok) {
      setError(body.error ?? "Unable to send reminders.");
      setIsSending(false);
      return;
    }

    setResultMessage(`Sent ${body.sent ?? 0} reminder(s).`);
    setIsSending(false);
    await loadRows();
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Reminder Management</h1>
      <p className="mt-2 text-sm text-slate-600">Review reminder status history and trigger reminder emails for due tanks.</p>

      <section className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1fr_auto]">
        <label className="text-sm font-semibold text-sky-900">
          Status filter
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={sendNow}>
          <label className="text-sm font-semibold text-sky-900">
            Due month
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
              required
            />
          </label>
          <label className="text-sm font-semibold text-sky-900 md:col-span-2">
            Dispatch note (optional)
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Monthly reminder run"
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={isSending}
            className="rounded-xl bg-sky-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
          >
            {isSending ? "Sending..." : "Send reminders now"}
          </button>
        </form>
      </section>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Scheduled</th>
              <th className="px-4 py-3">Due date</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Sent at</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{row.scheduled_for}</td>
                <td className="px-4 py-3">{row.due_date}</td>
                <td className="px-4 py-3">{row.email ?? "No email"}</td>
                <td className="px-4 py-3 capitalize">{row.status}</td>
                <td className="px-4 py-3">{row.sent_at ? new Date(row.sent_at).toLocaleString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading ? <p className="mt-4 text-sm text-slate-600">Loading reminders...</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
      {resultMessage ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{resultMessage}</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">No reminders found for the selected filter.</p>
      ) : null}
    </main>
  );
}
