"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ServiceEvent = {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  label: string;
};

type Props = {
  events: ServiceEvent[];
};

function toDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function monthStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function monthEnd(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0);
}

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function createGridDays(anchorMonth: Date) {
  const start = monthStart(anchorMonth);
  const end = monthEnd(anchorMonth);
  const days: Date[] = [];

  const first = new Date(start);
  first.setDate(start.getDate() - start.getDay());

  const last = new Date(end);
  last.setDate(end.getDate() + (6 - end.getDay()));

  const cursor = new Date(first);
  while (cursor <= last) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export function ServiceCalendar({ events }: Props) {
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ServiceEvent[]>();
    for (const event of events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }

    for (const list of map.values()) {
      list.sort((a, b) => a.customerName.localeCompare(b.customerName));
    }

    return map;
  }, [events]);

  const gridDays = useMemo(() => createGridDays(visibleMonth), [visibleMonth]);
  const selectedEvents = eventsByDate.get(selectedDateKey) ?? [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-sky-950">Service Calendar</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() =>
              setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
            }
          >
            Prev
          </button>
          <p className="min-w-36 text-center text-sm font-semibold text-slate-700">
            {visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() =>
              setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
            }
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
        <p>Sun</p>
        <p>Mon</p>
        <p>Tue</p>
        <p>Wed</p>
        <p>Thu</p>
        <p>Fri</p>
        <p>Sat</p>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {gridDays.map((day) => {
          const key = toDateKey(day);
          const inMonth = sameMonth(day, visibleMonth);
          const count = (eventsByDate.get(key) ?? []).length;
          const isSelected = key === selectedDateKey;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDateKey(key)}
              className={`min-h-16 rounded-lg border p-2 text-left text-xs transition ${
                isSelected
                  ? "border-sky-400 bg-sky-50"
                  : inMonth
                    ? "border-slate-200 hover:bg-slate-50"
                    : "border-slate-100 bg-slate-50 text-slate-400"
              }`}
            >
              <p className="font-semibold">{day.getDate()}</p>
              {count > 0 ? <p className="mt-1 text-[11px] text-sky-700">{count} due</p> : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-3">
        <p className="text-sm font-semibold text-slate-800">{selectedDateKey}</p>
        {selectedEvents.length ? (
          <ul className="mt-2 space-y-2">
            {selectedEvents.map((event) => (
              <li key={event.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                <Link href={`/admin/users/${event.customerId}`} className="font-semibold text-sky-900 hover:underline">
                  {event.customerName}
                </Link>
                <p className="text-xs text-slate-600">{event.label}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600">No services due on this date.</p>
        )}
      </div>
    </section>
  );
}