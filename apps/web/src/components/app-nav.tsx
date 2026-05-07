"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/browser";

const appLinks = [
  { href: "/dashboard", label: "Customer" },
  { href: "/pm/dashboard", label: "Property Manager" },
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/bookings/new", label: "Book Cleaning" },
  { href: "/admin/reminders", label: "Reminders" },
];

const marketingLinks = [
  { href: "/#customer-info", label: "Customer Info" },
];

export function AppNav() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      setIsAuthenticated(Boolean(user));

      if (!user) {
        setRole(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) {
        return;
      }

      setRole((profile as { role?: string } | null)?.role ?? null);
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user));
      void loadUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function onSignOut() {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setRole(null);
    router.push("/login");
    router.refresh();
  }

  const navLinks = useMemo(() => {
    if (role !== "admin") {
      return appLinks;
    }

    return appLinks.map((link) => (link.label === "Customer" ? { ...link, href: "/admin/customers" } : link));
  }, [role]);

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a1a3a]/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-semibold uppercase tracking-[0.22em] text-white">
          Tank Tech
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold text-white/88">
          {(isHome ? marketingLinks : navLinks).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-white/20 px-3 py-1.5 transition hover:bg-white/10"
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="rounded-full bg-[#dcb572] px-4 py-1.5 text-[#08262f] transition hover:bg-[#e5c58c]"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[#dcb572] px-4 py-1.5 text-[#08262f] transition hover:bg-[#e5c58c]"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
