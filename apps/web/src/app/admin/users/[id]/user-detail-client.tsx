"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type User = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  parish: string | null;
  preferred_contact_method: string | null;
  registration_details: Record<string, unknown> | null;
};

type Property = {
  id: string;
  address: string;
  parish: string | null;
  notes: string | null;
};

type Tank = {
  id: string;
  property_id: string;
  size_estimate: string | null;
  last_cleaned_date: string | null;
  next_due_date: string | null;
  access_notes: string | null;
};

type CleaningEntry = {
  id: string;
  tank_id: string;
  cleaned_at: string;
  next_due_date: string | null;
  notes: string | null;
  technician_comments: string | null;
};

export function AdminUserDetailClient({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [history, setHistory] = useState<CleaningEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [tankId, setTankId] = useState("");
  const [cleanedAt, setCleanedAt] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [technicianComments, setTechnicianComments] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNextDue, setEditNextDue] = useState("");
  const [editNotes, setEditNotes] = useState("");

  async function loadAll() {
    setIsLoading(true);
    setError(null);

    const response = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "Failed to load user." }))) as { error?: string };
      setError(body.error ?? "Failed to load user.");
      setIsLoading(false);
      return;
    }

    const body = (await response.json()) as {
      user: User;
      properties: Property[];
      tanks: Tank[];
      cleaningHistory: CleaningEntry[];
    };

    setUser(body.user);
    setProperties(body.properties ?? []);
    setTanks(body.tanks ?? []);
    setHistory(body.cleaningHistory ?? []);
    setTankId((body.tanks ?? [])[0]?.id ?? "");
    setIsLoading(false);
  }

  useEffect(() => {
    void loadAll();
  }, [userId]);

  const tanksById = useMemo(() => new Map(tanks.map((tank) => [tank.id, tank])), [tanks]);
  const propertyById = useMemo(() => new Map(properties.map((property) => [property.id, property])), [properties]);

  async function createCleaningEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/admin/users/${userId}/cleaning-history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tankId,
        cleanedAt,
        nextDueDate: nextDueDate || null,
        notes,
        technicianComments,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "Unable to add cleaning entry." }))) as {
        error?: string;
      };
      setError(body.error ?? "Unable to add cleaning entry.");
      setSaving(false);
      return;
    }

    setCleanedAt("");
    setNextDueDate("");
    setNotes("");
    setTechnicianComments("");
    setSaving(false);
    await loadAll();
  }

  async function saveEdit(entryId: string) {
    const response = await fetch(`/api/admin/cleaning-history/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nextDueDate: editNextDue || null,
        notes: editNotes || null,
      }),
    });

    if (!response.ok) {
      setError("Unable to update cleaning entry.");
      return;
    }

    setEditingId(null);
    setEditNextDue("");
    setEditNotes("");
    await loadAll();
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-sky-950">User Details</h1>
          <p className="mt-2 text-sm text-slate-600">Manage user profile, tanks, and cleaning history from a single screen.</p>
        </div>
        <Link
          href="/admin/reminders"
          className="rounded-lg border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-900 hover:bg-sky-50"
        >
          Open reminder center
        </Link>
      </div>

      {isLoading ? <p className="mt-4 text-sm text-slate-600">Loading user record...</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}

      {user ? (
        <section className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-sky-950">Customer</h2>
            <p className="mt-2 text-sm text-slate-700">{user.full_name ?? "Unnamed user"}</p>
            <p className="text-sm text-slate-600">{user.email ?? "No email"}</p>
            <p className="text-sm text-slate-600">{user.phone ?? "No phone"}</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-sky-950">Registration</h2>
            <p className="mt-2 text-sm text-slate-700">Address: {user.address ?? "-"}</p>
            <p className="text-sm text-slate-700">Parish: {user.parish ?? "-"}</p>
            <p className="text-sm text-slate-700 capitalize">
              Preferred contact: {(user.preferred_contact_method ?? "not set").replaceAll("_", " ")}
            </p>
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-sky-950">Tanks</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Tank</th>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">Last cleaned</th>
                <th className="px-4 py-3">Next due</th>
              </tr>
            </thead>
            <tbody>
              {tanks.map((tank) => (
                <tr key={tank.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{tank.size_estimate ?? "Not specified"}</td>
                  <td className="px-4 py-3">{propertyById.get(tank.property_id)?.address ?? "Unknown"}</td>
                  <td className="px-4 py-3">{tank.last_cleaned_date ?? "-"}</td>
                  <td className="px-4 py-3">{tank.next_due_date ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-sky-950">Add Cleaning Entry</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={createCleaningEntry}>
          <label className="text-sm font-semibold text-sky-900">
            Tank
            <select
              value={tankId}
              onChange={(event) => setTankId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
              required
            >
              {tanks.map((tank) => (
                <option key={tank.id} value={tank.id}>
                  {tank.size_estimate ?? "Tank"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-sky-900">
            Cleaned date
            <input
              type="date"
              value={cleanedAt}
              onChange={(event) => setCleanedAt(event.target.value)}
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
              required
            />
          </label>
          <label className="text-sm font-semibold text-sky-900">
            Next due date
            <input
              type="date"
              value={nextDueDate}
              onChange={(event) => setNextDueDate(event.target.value)}
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
            />
          </label>
          <label className="text-sm font-semibold text-sky-900 md:col-span-2">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 min-h-20 w-full rounded-xl border border-sky-200 px-3 py-2"
            />
          </label>
          <label className="text-sm font-semibold text-sky-900 md:col-span-2">
            Technician comments
            <textarea
              value={technicianComments}
              onChange={(event) => setTechnicianComments(event.target.value)}
              className="mt-1 min-h-20 w-full rounded-xl border border-sky-200 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={saving || !tankId}
            className="rounded-xl bg-sky-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Add cleaning entry"}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-sky-950">Cleaning History</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Date cleaned</th>
                <th className="px-4 py-3">Tank</th>
                <th className="px-4 py-3">Next due</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => {
                const tank = tanksById.get(entry.tank_id);
                return (
                  <tr key={entry.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3">{entry.cleaned_at}</td>
                    <td className="px-4 py-3">{tank?.size_estimate ?? "Unknown"}</td>
                    <td className="px-4 py-3">
                      {editingId === entry.id ? (
                        <input
                          type="date"
                          value={editNextDue}
                          onChange={(event) => setEditNextDue(event.target.value)}
                          className="w-full rounded-lg border border-sky-200 px-2 py-1"
                        />
                      ) : (
                        entry.next_due_date ?? "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === entry.id ? (
                        <textarea
                          value={editNotes}
                          onChange={(event) => setEditNotes(event.target.value)}
                          className="min-h-16 w-full rounded-lg border border-sky-200 px-2 py-1"
                        />
                      ) : (
                        entry.notes ?? "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === entry.id ? (
                        <button
                          className="rounded-lg bg-sky-900 px-3 py-1.5 text-xs font-semibold text-white"
                          onClick={() => void saveEdit(entry.id)}
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          className="rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-900"
                          onClick={() => {
                            setEditingId(entry.id);
                            setEditNextDue(entry.next_due_date ?? "");
                            setEditNotes(entry.notes ?? "");
                          }}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
