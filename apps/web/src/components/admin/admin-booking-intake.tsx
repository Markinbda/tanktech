"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Customer = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

type Property = {
  id: string;
  owner_id: string;
  address: string;
  parish: string | null;
};

type Tank = {
  id: string;
  property_id: string;
  size_estimate: string | null;
  last_cleaned_date: string | null;
  next_due_date: string | null;
};

const SERVICE_TYPES = [
  "Full water tank cleaning",
  "Inspection only",
  "Aeration/chlorination",
  "Emergency service",
  "Unsure (please advise)",
] as const;

type Props = {
  customers: Customer[];
  properties: Property[];
  tanks: Tank[];
};

function validateBookingSelection(input: {
  selectedCustomerId: string;
  selectedPropertyId: string;
  selectedTankId: string;
  scheduledStart: string;
  scheduledEnd: string;
}) {
  if (!input.selectedCustomerId || !input.selectedPropertyId || !input.selectedTankId) {
    return "Select customer, property, and tank.";
  }

  if (!input.scheduledStart || !input.scheduledEnd) {
    return "Select booking start and end date-time.";
  }

  return null;
}

export function AdminBookingIntake({ customers, properties, tanks }: Props) {
  const [query, setQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedTankId, setSelectedTankId] = useState("");
  const [serviceType, setServiceType] = useState<(typeof SERVICE_TYPES)[number]>("Full water tank cleaning");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCustomers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return customers.slice(0, 12);
    }

    return customers
      .filter((customer) => {
        const haystack = `${customer.full_name ?? ""} ${customer.email ?? ""} ${customer.phone ?? ""}`.toLowerCase();
        return haystack.includes(term);
      })
      .slice(0, 12);
  }, [customers, query]);

  const customerProperties = useMemo(
    () => properties.filter((property) => property.owner_id === selectedCustomerId),
    [properties, selectedCustomerId],
  );

  const propertyTanks = useMemo(
    () => tanks.filter((tank) => tank.property_id === selectedPropertyId),
    [selectedPropertyId, tanks],
  );

  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedPropertyId("");
      setSelectedTankId("");
      return;
    }

    const firstProperty = properties.find((property) => property.owner_id === selectedCustomerId);
    if (!firstProperty) {
      setSelectedPropertyId("");
      setSelectedTankId("");
      return;
    }

    setSelectedPropertyId(firstProperty.id);
  }, [properties, selectedCustomerId]);

  useEffect(() => {
    if (!selectedPropertyId) {
      setSelectedTankId("");
      return;
    }

    const firstTank = tanks.find((tank) => tank.property_id === selectedPropertyId);
    setSelectedTankId(firstTank?.id ?? "");
  }, [selectedPropertyId, tanks]);

  async function createBooking() {
    setMessage(null);

    const validationError = validateBookingSelection({
      selectedCustomerId,
      selectedPropertyId,
      selectedTankId,
      scheduledStart,
      scheduledEnd,
    });

    if (validationError) {
      setMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: selectedCustomerId,
        propertyId: selectedPropertyId,
        tankId: selectedTankId,
        serviceType,
        scheduledStart,
        scheduledEnd,
        notes,
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "Unable to create booking." }))) as { error?: string };
      setMessage(body.error ?? "Unable to create booking.");
      return;
    }

    setMessage("Booking created for customer.");
    setNotes("");
    window.location.reload();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-sky-950">Create Booking For Customer</h2>
      <p className="mt-1 text-sm text-slate-600">Search by typing a name, then select property, tank, service, and date/time.</p>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-slate-200 p-3">
          <label className="text-sm font-semibold text-slate-700">
            Search customer
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type name or email"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>

          <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-2 py-2">Customer</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-t border-slate-100">
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerId(customer.id)}
                        className={`text-left font-semibold ${selectedCustomerId === customer.id ? "text-sky-900" : "text-slate-800"}`}
                      >
                        {customer.full_name ?? "Unnamed"}
                      </button>
                      <p className="text-[11px] text-slate-500">{customer.email ?? "No email"}</p>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Link
                          href={`/admin/users/${customer.id}`}
                          className="rounded border border-sky-200 px-2 py-1 text-[11px] font-semibold text-sky-900 hover:bg-sky-50"
                        >
                          Contact details
                        </Link>
                        <Link
                          href={`/admin/users/${customer.id}#tanks`}
                          className="rounded border border-sky-200 px-2 py-1 text-[11px] font-semibold text-sky-900 hover:bg-sky-50"
                        >
                          Property details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-3">
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700">
              Property
              <select
                value={selectedPropertyId}
                onChange={(event) => setSelectedPropertyId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              >
                <option value="">Select property</option>
                {customerProperties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.address}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Tank
              <select
                value={selectedTankId}
                onChange={(event) => setSelectedTankId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              >
                <option value="">Select tank</option>
                {propertyTanks.map((tank, index) => (
                  <option key={tank.id} value={tank.id}>
                    Tank {index + 1} ({tank.size_estimate ?? "Not set"})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Service type
              <select
                value={serviceType}
                onChange={(event) => setServiceType(event.target.value as (typeof SERVICE_TYPES)[number])}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              >
                {SERVICE_TYPES.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 p-3">
        <h3 className="text-sm font-semibold text-sky-900">Booking calendar and time</h3>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Start date and time
            <input
              type="datetime-local"
              value={scheduledStart}
              onChange={(event) => setScheduledStart(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            End date and time
            <input
              type="datetime-local"
              value={scheduledEnd}
              onChange={(event) => setScheduledEnd(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700 md:col-span-2">
            Notes (optional)
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void createBooking()}
          disabled={isSubmitting}
          className="rounded-lg bg-sky-900 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
        >
          {isSubmitting ? "Booking..." : "Book service"}
        </button>
      </div>

      {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
    </section>
  );
}