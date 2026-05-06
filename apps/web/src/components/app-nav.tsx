import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Customer" },
  { href: "/pm/dashboard", label: "Property Manager" },
  { href: "/admin/dashboard", label: "Staff/Admin" },
  { href: "/bookings/new", label: "Book Cleaning" },
  { href: "/subscriptions", label: "Subscriptions" },
];

export function AppNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-sky-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-sky-900">
          Tank Tech
        </Link>
        <nav className="flex flex-wrap gap-3 text-sm font-semibold text-sky-900">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-sky-200 px-3 py-1.5 transition hover:bg-sky-50"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
