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

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted || !user) {
        return;
      }

      router.replace(returnTo);
    }

    void checkSession();

    return () => {
      mounted = false;
    };
  }, [returnTo, router, supabase]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`,
      },
    });

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setSent(true);
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-6 py-12">
      <section className="w-full rounded-3xl border border-sky-100 bg-white p-8 shadow-xl shadow-sky-100/30">
        <h1 className="text-2xl font-bold text-sky-950">Sign in to Tank Tech</h1>
        <p className="mt-2 text-sm text-slate-600">
          Use your email to receive a secure magic link. After sign-in, you will be returned to your previous page.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          New customers will be guided through a quick registration step after authentication.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-semibold text-sky-900">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2 outline-none ring-sky-300 focus:ring"
              required
            />
          </label>
          <button
            className="w-full rounded-xl bg-sky-900 px-4 py-2.5 font-semibold text-white transition hover:bg-sky-800"
            type="submit"
          >
            Send magic link
          </button>
        </form>
        {sent ? (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            Check your inbox for the Tank Tech login link.
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>
        ) : null}
      </section>
    </main>
  );
}
