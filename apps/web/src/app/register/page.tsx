"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/browser";

function getSafeReturnTo(value: string | null) {
  if (!value) {
    return "/dashboard";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export default function RegisterPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (!user) {
        router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) {
        return;
      }

      setEmail(user.email ?? "");
      setFullName(profile?.full_name ?? user.user_metadata.full_name ?? "");
      setPhone(profile?.phone ?? user.user_metadata.phone ?? "");
      setIsLoading(false);
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [returnTo, router, supabase]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "Unable to complete registration." }))) as {
        error?: string | { fieldErrors?: Record<string, string[]> };
      };

      if (typeof body.error === "string") {
        setError(body.error);
      } else {
        setError("Unable to complete registration.");
      }
      setIsSubmitting(false);
      return;
    }

    router.replace(returnTo);
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-6 py-12">
      <section className="w-full rounded-3xl border border-sky-100 bg-white p-8 shadow-xl shadow-sky-100/30">
        <h1 className="text-2xl font-bold text-sky-950">Complete your registration</h1>
        <p className="mt-2 text-sm text-slate-600">
          Finish setting up your Tank Tech customer account so we can save your details for bookings and service updates.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-semibold text-sky-900">
            Email
            <input
              type="email"
              value={email}
              readOnly
              className="mt-1 w-full rounded-xl border border-sky-200 bg-slate-50 px-3 py-2 text-slate-500"
            />
          </label>
          <label className="block text-sm font-semibold text-sky-900">
            Full name
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2 outline-none ring-sky-300 focus:ring"
              required
              disabled={isLoading || isSubmitting}
            />
          </label>
          <label className="block text-sm font-semibold text-sky-900">
            Phone number
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2 outline-none ring-sky-300 focus:ring"
              required
              disabled={isLoading || isSubmitting}
            />
          </label>
          <button
            className="w-full rounded-xl bg-sky-900 px-4 py-2.5 font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={isLoading || isSubmitting}
          >
            {isSubmitting ? "Saving details..." : "Complete registration"}
          </button>
        </form>
        {error ? (
          <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>
        ) : null}
      </section>
    </main>
  );
}