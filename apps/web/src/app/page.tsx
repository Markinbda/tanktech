import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-16">
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <p className="font-semibold uppercase tracking-[0.18em] text-sky-700">Bermuda Water Safety</p>
          <h1 className="mt-4 font-[var(--font-space-grotesk)] text-5xl leading-tight text-sky-950 sm:text-6xl">
            Tank Tech Cleaning Platform
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-600">
            End-to-end scheduling, compliance tracking, and service-plan automation for homeowners,
            landlords, and property managers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="rounded-full bg-sky-900 px-5 py-3 font-semibold text-white">
              Sign in
            </Link>
            <Link href="/bookings/new" className="rounded-full border border-sky-300 bg-white px-5 py-3 font-semibold text-sky-900">
              Request cleaning
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border border-sky-100 bg-white p-8 shadow-2xl shadow-sky-100/50">
          <h2 className="font-[var(--font-space-grotesk)] text-2xl font-bold text-sky-950">Platform Modules</h2>
          <ul className="mt-5 space-y-3 text-slate-700">
            <li>Customer portal for property/tank profiles and booking requests</li>
            <li>Property manager portfolio dashboard with org-level controls</li>
            <li>Staff/admin scheduling queue and technician assignment tools</li>
            <li>Compliance reminders, due-soon alerts, and overdue outreach</li>
            <li>Service plan subscriptions with interval-driven next due dates</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
