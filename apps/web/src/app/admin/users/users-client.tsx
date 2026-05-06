"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type UserRow = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  parish: string | null;
  preferredContactMethod: string | null;
  role: string;
  numberOfTanks: number;
  tankSizes: string[];
  createdAt: string;
};

export function AdminUsersClient() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("created_desc");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUsers() {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ sort });
      if (query.trim()) {
        params.set("q", query.trim());
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({ error: "Failed to load users." }))) as { error?: string };
        setError(body.error ?? "Failed to load users.");
        setRows([]);
        setIsLoading(false);
        return;
      }

      const body = (await response.json()) as { rows: UserRow[] };
      setRows(body.rows ?? []);
      setIsLoading(false);
    }

    void loadUsers();

    return () => controller.abort();
  }, [query, sort]);

  const totalTanks = useMemo(() => rows.reduce((sum, row) => sum + row.numberOfTanks, 0), [rows]);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-sky-950">Registered Users</h1>
          <p className="mt-2 text-sm text-slate-600">Search, sort, and open user records to manage tanks and cleaning history.</p>
        </div>
        <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-2 text-sm text-sky-900">
          {rows.length} users, {totalTanks} tanks
        </div>
      </div>

      <section className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px]">
        <label className="text-sm font-semibold text-sky-900">
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, email, phone, address"
            className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2 outline-none ring-sky-300 focus:ring"
          />
        </label>
        <label className="text-sm font-semibold text-sky-900">
          Sort
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2 outline-none ring-sky-300 focus:ring"
          >
            <option value="created_desc">Newest first</option>
            <option value="created_asc">Oldest first</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="tanks_desc">Most tanks</option>
            <option value="tanks_asc">Fewest tanks</option>
          </select>
        </label>
      </section>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Tanks</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-3">
                  <p className="font-semibold text-sky-950">{row.fullName ?? "Unnamed user"}</p>
                  <p className="text-xs text-slate-600">{row.email ?? "No email"}</p>
                </td>
                <td className="px-4 py-3 capitalize">{row.role.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">
                  <p>{row.address ?? "-"}</p>
                  <p className="text-xs text-slate-600">{row.parish ?? ""}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{row.phone ?? "-"}</p>
                  <p className="text-xs capitalize text-slate-600">{row.preferredContactMethod ?? "not set"}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{row.numberOfTanks}</p>
                  <p className="text-xs text-slate-600">{row.tankSizes.join(", ") || "No tank sizes"}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{new Date(row.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${row.id}`}
                    className="inline-flex rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-900 hover:bg-sky-50"
                  >
                    Open profile
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isLoading ? <p className="mt-4 text-sm text-slate-600">Loading users...</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
      {!isLoading && !error && rows.length === 0 ? (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">No users matched your filters.</p>
      ) : null}
    </main>
  );
}
