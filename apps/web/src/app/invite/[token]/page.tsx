"use client";

import { useState } from "react";

export default function InviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function acceptInvite() {
    const { token } = await params;
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    setLoading(false);
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not accept invite.");
      return;
    }

    setMessage("Invite accepted. Your organization access is now enabled.");
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-6 py-16">
      <section className="w-full rounded-3xl border border-sky-100 bg-white p-8 shadow-xl shadow-sky-100/30">
        <h1 className="text-3xl font-bold text-sky-950">Join Tank Tech Organization</h1>
        <p className="mt-3 text-slate-600">Sign in with the invited email address, then accept the team invitation.</p>
        <button
          onClick={acceptInvite}
          disabled={loading}
          className="mt-6 rounded-xl bg-sky-900 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Accepting..." : "Accept invite"}
        </button>
        {message ? <p className="mt-4 text-sm text-slate-700">{message}</p> : null}
      </section>
    </main>
  );
}
