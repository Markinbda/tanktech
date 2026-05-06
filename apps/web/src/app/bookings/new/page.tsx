"use client";

import { FormEvent, useState } from "react";

export default function NewBookingPage() {
  const [message, setMessage] = useState<string | null>(null);

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      propertyId: String(formData.get("propertyId")),
      tankId: String(formData.get("tankId")),
      requestedWindowStart: String(formData.get("requestedWindowStart")),
      requestedWindowEnd: String(formData.get("requestedWindowEnd")),
      notes: String(formData.get("notes") ?? ""),
    };

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setMessage("Unable to create booking right now.");
      return;
    }

    setMessage("Booking request submitted to Tank Tech.");
    event.currentTarget.reset();
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Request a Tank Cleaning</h1>
      <form className="mt-6 space-y-4 rounded-2xl border border-sky-100 bg-white p-6" onSubmit={submitBooking}>
        <input name="propertyId" placeholder="Property ID" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        <input name="tankId" placeholder="Tank ID" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        <label className="block text-sm font-medium text-slate-700">
          Preferred start
          <input name="requestedWindowStart" type="datetime-local" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" required />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Preferred end
          <input name="requestedWindowEnd" type="datetime-local" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" required />
        </label>
        <textarea name="notes" placeholder="Access details and special instructions" className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2" />
        <button type="submit" className="rounded-xl bg-sky-900 px-4 py-2 font-semibold text-white">
          Submit booking request
        </button>
      </form>
      {message ? <p className="mt-4 text-sm text-sky-900">{message}</p> : null}
    </main>
  );
}
