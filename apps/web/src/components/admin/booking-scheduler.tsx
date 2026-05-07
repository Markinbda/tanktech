"use client";

import { useState } from "react";

import type { BookingStatus } from "@/lib/types";

type BookingRecord = {
  id: string;
  property: string;
  requestedWindow: string;
  requestedStart: string | null;
  requestedEnd: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  status: BookingStatus;
  technicianId: string | null;
};

type Props = {
  bookings: BookingRecord[];
  technicians: Array<{ id: string; full_name: string | null; email: string | null }>;
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIso(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function bookingAnchorDate(booking: BookingRecord) {
  return parseIso(booking.scheduledStart) ?? parseIso(booking.requestedStart);
}

function toInputDateTimeValue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function formatTimeSlot(booking: BookingRecord) {
  const start = bookingAnchorDate(booking);
  const end = parseIso(booking.scheduledEnd) ?? parseIso(booking.requestedEnd);

  if (!start) return "Time unavailable";
  const startText = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (!end) return startText;
  const endText = end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${startText} - ${endText}`;
}

export function BookingScheduler({ bookings, technicians }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const defaultAnchorDate = bookingAnchorDate(bookings[0]) ?? new Date();
  const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(defaultAnchorDate));
  const [selectedDayKey, setSelectedDayKey] = useState<string>(getDateKey(defaultAnchorDate));

  const bookingsByDay = new Map<string, number>();
  for (const booking of bookings) {
    const anchorDate = bookingAnchorDate(booking);
    if (!anchorDate) continue;
    const dayKey = getDateKey(anchorDate);
    bookingsByDay.set(dayKey, (bookingsByDay.get(dayKey) ?? 0) + 1);
  }

  const monthStart = startOfMonth(calendarMonth);
  const monthLabel = monthStart.toLocaleDateString([], { month: "long", year: "numeric" });
  const firstDayOffset = monthStart.getDay();
  const totalDays = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

  const calendarCells: Array<{ key: string; day: number; dateKey: string } | null> = [];
  for (let i = 0; i < firstDayOffset; i += 1) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
    calendarCells.push({ key: `d-${day}`, day, dateKey: getDateKey(date) });
  }

  const selectedDayBookings = bookings
    .filter((booking) => {
      const anchorDate = bookingAnchorDate(booking);
      return anchorDate ? getDateKey(anchorDate) === selectedDayKey : false;
    })
    .sort((a, b) => {
      const aTime = (bookingAnchorDate(a) ?? new Date(0)).getTime();
      const bTime = (bookingAnchorDate(b) ?? new Date(0)).getTime();
      return aTime - bTime;
    });

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
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Booking Calendar</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setCalendarMonth((current) => startOfMonth(new Date(current.getFullYear(), current.getMonth() - 1, 1)))
              }
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700"
            >
              Prev
            </button>
            <p className="min-w-32 text-center text-sm font-medium text-slate-800">{monthLabel}</p>
            <button
              type="button"
              onClick={() =>
                setCalendarMonth((current) => startOfMonth(new Date(current.getFullYear(), current.getMonth() + 1, 1)))
              }
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700"
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
          {[
            "Sun",
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
          ].map((label) => (
            <div key={label} className="py-1 font-medium">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((cell, index) => {
            if (!cell) {
              return <div key={`empty-${index}`} className="h-14 rounded-lg bg-slate-50" />;
            }

            const bookingCount = bookingsByDay.get(cell.dateKey) ?? 0;
            const selected = cell.dateKey === selectedDayKey;

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelectedDayKey(cell.dateKey)}
                className={[
                  "h-14 rounded-lg border text-left px-2 py-1 transition",
                  selected ? "border-sky-700 bg-sky-100" : "border-slate-200 bg-white hover:bg-slate-50",
                ].join(" ")}
              >
                <div className="text-xs font-medium text-slate-700">{cell.day}</div>
                {bookingCount > 0 ? (
                  <div className="mt-1 inline-flex rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {bookingCount} booking{bookingCount > 1 ? "s" : ""}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          Day Schedule: {new Date(`${selectedDayKey}T00:00:00`).toLocaleDateString()}
        </h3>
        <p className="mt-1 text-xs text-slate-500">Single-row bookings sorted by time slot.</p>
      </section>

      {selectedDayBookings.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No bookings for this day.</p>
      ) : null}

      {selectedDayBookings.map((booking) => (
        <form
          key={booking.id}
          action={updateBooking}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <input type="hidden" name="bookingId" value={booking.id} />
          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-semibold text-sky-900">{booking.property}</p>
              <p className="text-xs text-slate-500">Slot: {formatTimeSlot(booking)}</p>
              <p className="text-xs text-slate-500">Requested: {booking.requestedWindow}</p>
            </div>
            <label className="text-sm text-slate-600">
              Scheduled start
              <input
                name="scheduledStart"
                type="datetime-local"
                defaultValue={toInputDateTimeValue(booking.scheduledStart)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-600">
              Scheduled end
              <input
                name="scheduledEnd"
                type="datetime-local"
                defaultValue={toInputDateTimeValue(booking.scheduledEnd)}
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
