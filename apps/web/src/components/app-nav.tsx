"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const appLinks = [
  { href: "/dashboard", label: "Customer" },
  { href: "/pm/dashboard", label: "Property Manager" },
  { href: "/admin/dashboard", label: "Staff/Admin" },
  { href: "/bookings/new", label: "Book Cleaning" },
  { href: "/subscriptions", label: "Subscriptions" },
];

const marketingLinks = [
  { href: "/#customer-info", label: "Customer Info" },
  { href: "/#property-owner-info", label: "Property Owner Info" },
];

export function AppNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#08262f]/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-semibold uppercase tracking-[0.22em] text-white">
          Tank Tech
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold text-white/88">
          {(isHome ? marketingLinks : appLinks).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-white/20 px-3 py-1.5 transition hover:bg-white/10"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-full bg-[#dcb572] px-4 py-1.5 text-[#08262f] transition hover:bg-[#e5c58c]"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
