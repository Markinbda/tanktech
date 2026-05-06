"use client";

import { useState } from "react";

import type { BookingStatus } from "@/lib/types";

type BookingRecord = {
  id: string;
  property: string;
  requestedWindow: string;
  status: BookingStatus;
  technicianId: string | null;
};

type Props = {
  bookings: BookingRecord[];
  technicians: Array<{ id: string; full_name: string | null; email: string | null }>;
};

export function BookingScheduler({ bookings, technicians }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function updateBooking(formData: FormData) {
    const bookingId = String(formData.get("bookingId"));
    setPendingId(bookingId);
    setMessage(null);

    const response = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledStart: formData.get("scheduledStart"),
        scheduledEnd: formData.get("scheduledEnd"),
        technicianId: formData.get("technicianId") || null,
        status: formData.get("status"),
      }),
    });

    setPendingId(null);

    if (!response.ok) {
      setMessage("Unable to update booking.");
      return;
    }

    setMessage("Booking updated.");
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <form
          key={booking.id}
          action={updateBooking}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <input type="hidden" name="bookingId" value={booking.id} />
          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-semibold text-sky-900">{booking.property}</p>
              <p className="text-xs text-slate-500">Requested: {booking.requestedWindow}</p>
            </div>
            <label className="text-sm text-slate-600">
              Scheduled start
              <input
                name="scheduledStart"
                type="datetime-local"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-600">
              Scheduled end
              <input
                name="scheduledEnd"
                type="datetime-local"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-600">
              Technician
              <select
                name="technicianId"
                defaultValue={booking.technicianId ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">Unassigned</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.full_name ?? technician.email ?? technician.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Status
              <select
                name="status"
                defaultValue={booking.status}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="requested">Requested</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            disabled={pendingId === booking.id}
            className="mt-4 rounded-xl bg-sky-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pendingId === booking.id ? "Saving..." : "Save schedule"}
          </button>
        </form>
      ))}
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </div>
  );
}
