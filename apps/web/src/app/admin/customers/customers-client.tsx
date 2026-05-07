"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  parish: string | null;
  preferred_contact_method: string | null;
  role: string;
};

export function AdminCustomersClient({ customers }: { customers: CustomerRow[] }) {
  const [searchName, setSearchName] = useState("");
  const [parishFilter, setParishFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const parishOptions = useMemo(() => {
    const values = Array.from(new Set(customers.map((customer) => customer.parish?.trim()).filter(Boolean))) as string[];
    return values.sort((a, b) => a.localeCompare(b));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const query = searchName.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesName = !query || (customer.full_name ?? "").toLowerCase().includes(query);
      const matchesParish = parishFilter === "all" || (customer.parish ?? "Unknown") === parishFilter;
      return matchesName && matchesParish;
    });
  }, [customers, parishFilter, searchName]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Customers</h1>
      <p className="mt-2 text-sm text-slate-600">Filter by parish, search by name, and expand any row for full customer details.</p>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold text-sky-900">
            Search by name
            <input
              type="text"
              value={searchName}
              onChange={(event) => setSearchName(event.target.value)}
              placeholder="Customer name"
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
            />
          </label>
          <label className="text-sm font-semibold text-sky-900">
            Filter by parish
            <select
              value={parishFilter}
              onChange={(event) => setParishFilter(event.target.value)}
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
            >
              <option value="all">All parishes</option>
              <option value="Unknown">Unknown</option>
              {parishOptions.map((parish) => (
                <option key={parish} value={parish}>
                  {parish}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Parish</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer) => {
              const isExpanded = expandedId === customer.id;
              return (
                <Fragment key={customer.id}>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-sky-950">{customer.full_name ?? "-"}</td>
                    <td className="px-4 py-3">{customer.parish ?? "Unknown"}</td>
                    <td className="px-4 py-3">{customer.phone ?? "-"}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                        className="rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-900 hover:bg-sky-50"
                      >
                        {isExpanded ? "Hide details" : "View details"}
                      </button>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr className="border-t border-slate-100 bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700" colSpan={4}>
                        <p>Email: {customer.email ?? "-"}</p>
                        <p>Address: {customer.address ?? "-"}</p>
                        <p>Preferred contact: {customer.preferred_contact_method ?? "-"}</p>
                        <Link href={`/admin/users/${customer.id}`} className="mt-2 inline-flex font-semibold text-sky-800 hover:underline">
                          Open full profile
                        </Link>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </section>

      {filteredCustomers.length === 0 ? (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">No customers match your current filters.</p>
      ) : null}
    </main>
  );
}
