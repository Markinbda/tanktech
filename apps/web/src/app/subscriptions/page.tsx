"use client";

import { FormEvent, useState } from "react";

export default function SubscriptionsPage() {
  const [message, setMessage] = useState<string | null>(null);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId: String(formData.get("propertyId")),
        tankId: String(formData.get("tankId")),
        planId: String(formData.get("planId")),
        notes: String(formData.get("notes") ?? ""),
      }),
    });

    if (!response.ok) {
      setMessage("Could not create subscription.");
      return;
    }

    setMessage("Subscription created.");
    event.currentTarget.reset();
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Service Plan Subscriptions</h1>
      <p className="mt-2 text-slate-600">
        Enroll tanks into Basic, Standard, or Premium plans. Plan intervals drive reminders and due dates.
      </p>
      <form className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6" onSubmit={onCreate}>
        <input name="propertyId" placeholder="Property ID" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        <input name="tankId" placeholder="Tank ID" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        <input name="planId" placeholder="Plan ID" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        <textarea name="notes" placeholder="Notes" className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2" />
        <button type="submit" className="rounded-xl bg-sky-900 px-4 py-2 font-semibold text-white">
          Create subscription
        </button>
      </form>
      {message ? <p className="mt-4 text-sm text-slate-700">{message}</p> : null}
    </main>
  );
}
