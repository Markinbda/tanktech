"use client";

import { FormEvent, useEffect, useState } from "react";

type ReminderRow = {
  id: string;
  dueDate: string;
  scheduledFor: string;
  reminderType: string;
  status: "pending" | "sent" | "cancelled";
  email: string | null;
  sentAt: string | null;
  notes: string | null;
  createdAt: string;
  customerName: string;
  customerEmail: string | null;
  propertyAddress: string;
  parish: string | null;
  propertyType: "Commercial" | "Residential" | "Unknown";
  tankSize: string | null;
};

type UpcomingReminderRow = {
  bookingId: string;
  reminderSendDate: string;
  appointmentDate: string;
  customerName: string;
  customerEmail: string | null;
  propertyAddress: string;
  parish: string | null;
  propertyType: "Commercial" | "Residential" | "Unknown";
  tankSize: string | null;
  daysUntilSend: number;
};

function toMonthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildFilterParams(input: {
  status: string;
  dateFrom: string;
  dateTo: string;
  propertyType: string;
  customer: string;
}) {
  const params = new URLSearchParams();
  const entries: Array<[string, string | null]> = [
    ["status", input.status !== "all" ? input.status : null],
    ["dateFrom", input.dateFrom || null],
    ["dateTo", input.dateTo || null],
    ["propertyType", input.propertyType !== "all" ? input.propertyType : null],
    ["customer", input.customer.trim() || null],
  ];

  for (const [key, value] of entries) {
    if (value) {
      params.set(key, value);
    }
  }

  return params;
}

export function AdminRemindersClient() {
  const [status, setStatus] = useState("all");
  const [customer, setCustomer] = useState("");
  const [propertyType, setPropertyType] = useState("all");
  const [dateFrom, setDateFrom] = useState(toDateValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [dateTo, setDateTo] = useState(toDateValue(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
  const [rows, setRows] = useState<ReminderRow[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingReminderRow[]>([]);
  const [month, setMonth] = useState(toMonthValue(new Date()));
  const [notes, setNotes] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  async function loadRows() {
    setLoading(true);
    setError(null);

    const params = buildFilterParams({ status, dateFrom, dateTo, propertyType, customer });

    const response = await fetch(`/api/admin/reminders?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Unable to load reminders.");
      setRows([]);
      setUpcoming([]);
      setLoading(false);
      return;
    }

    const body = (await response.json()) as { rows: ReminderRow[]; upcoming: UpcomingReminderRow[] };
    setRows(body.rows ?? []);
    setUpcoming(body.upcoming ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void loadRows();
  }, [status, dateFrom, dateTo, propertyType, customer]);

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
      <p className="mt-2 text-sm text-slate-600">Review reminder logs, filter dispatch history, and send reminders exactly one week before appointments.</p>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
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

          <label className="text-sm font-semibold text-sky-900">
            Date from
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
            />
          </label>

          <label className="text-sm font-semibold text-sky-900">
            Date to
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
            />
          </label>

          <label className="text-sm font-semibold text-sky-900">
            Property type
            <select
              value={propertyType}
              onChange={(event) => setPropertyType(event.target.value)}
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
            >
              <option value="all">All</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Unknown">Unknown</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-sky-900">
            Search customer
            <input
              type="text"
              value={customer}
              onChange={(event) => setCustomer(event.target.value)}
              placeholder="Name or email"
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
            />
          </label>
        </div>

        <form className="mt-4 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-3" onSubmit={sendNow}>
          <label className="text-sm font-semibold text-sky-900">
            Appointment month
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
              placeholder="One-week reminder run"
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={isSending}
            className="rounded-xl bg-sky-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
          >
            {isSending ? "Sending..." : "Send due reminders now"}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-sky-950">Upcoming Reminders</h2>
        <p className="mt-1 text-xs text-slate-600">These are reminders queued for send date exactly one week before scheduled appointments.</p>

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Send date</th>
                <th className="px-4 py-3">Appointment</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">Type</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.slice(0, 12).map((row) => (
                <tr key={`${row.bookingId}-${row.reminderSendDate}`} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-sky-900">
                    {row.reminderSendDate}
                    <p className="text-xs font-normal text-slate-500">In {row.daysUntilSend} day(s)</p>
                  </td>
                  <td className="px-4 py-3">{new Date(row.appointmentDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <p>{row.customerName}</p>
                    <p className="text-xs text-slate-600">{row.customerEmail ?? "No email"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{row.propertyAddress}</p>
                    <p className="text-xs text-slate-600">{row.parish ?? ""}</p>
                  </td>
                  <td className="px-4 py-3">{row.propertyType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && !error && upcoming.length === 0 ? (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">No upcoming reminders match your filters.</p>
        ) : null}
      </section>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Scheduled</th>
              <th className="px-4 py-3">Due date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Sent at</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{row.scheduledFor}</td>
                <td className="px-4 py-3">{row.dueDate}</td>
                <td className="px-4 py-3">
                  <p>{row.customerName}</p>
                  <p className="text-xs text-slate-600">{row.customerEmail ?? row.email ?? "No email"}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{row.propertyAddress}</p>
                  <p className="text-xs text-slate-600">{row.parish ?? ""}</p>
                </td>
                <td className="px-4 py-3">{row.propertyType}</td>
                <td className="px-4 py-3 capitalize">{row.status}</td>
                <td className="px-4 py-3">{row.sentAt ? new Date(row.sentAt).toLocaleString() : "-"}</td>
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
