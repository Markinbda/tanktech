"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/browser";

function getSafeReturnTo(value: string | null) {
  if (!value) {
    return null;
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
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAction, setActiveAction] = useState<"signin" | "register" | null>(null);

  async function resolvePostLoginRoute(userId: string) {
    if (returnTo) {
      return returnTo;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    return (profile as { role?: string } | null)?.role === "admin" ? "/admin/dashboard" : "/dashboard";
  }

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted || !user) {
        return;
      }

      const destination = await resolvePostLoginRoute(user.id);
      router.replace(destination);
    }

    void checkSession();

    return () => {
      mounted = false;
    };
  }, [returnTo, router, supabase]);

  function validateInputs() {
    if (!email.trim()) {
      setError("Email is required.");
      return false;
    }

    if (!password.trim()) {
      setError("Password is required.");
      return false;
    }

    return true;
  }

  async function withTimeout<T>(operation: Promise<T>, timeoutMs = 15000): Promise<T> {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out. Please try again.")), timeoutMs);
      }),
    ]);
  }

  async function onSignIn() {
    setError(null);
    setNotice(null);

    if (!validateInputs()) {
      return;
    }

    setIsSubmitting(true);
    setActiveAction("signin");

    try {
      const { error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({ email: email.trim(), password }),
      );

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const destination = user ? await resolvePostLoginRoute(user.id) : "/dashboard";
      router.replace(destination);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
      setActiveAction(null);
    }
  }

  async function onRegister() {
    setError(null);
    setNotice(null);

    if (!validateInputs()) {
      return;
    }

    setIsSubmitting(true);
    setActiveAction("register");

    try {
      const { data, error: signUpError } = await withTimeout(
        supabase.auth.signUp({
          email: email.trim(),
          password,
        }),
      );

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        router.replace("/register");
        router.refresh();
        return;
      }

      setNotice("Account created. Please confirm your email, then sign in with your password.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create account.");
    } finally {
      setIsSubmitting(false);
      setActiveAction(null);
    }
  }

  function getErrorMessage(message: string) {
    if (message.toLowerCase().includes("email rate limit")) {
      return "Too many email attempts. Please wait a few minutes and try again.";
    }

    return message;
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-6 py-12">
      <section className="w-full rounded-3xl border border-sky-100 bg-white p-8 shadow-xl shadow-sky-100/30">
        <h1 className="text-2xl font-bold text-sky-950">Sign in to Tank Tech</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in with your email and password to continue.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          New customers can create an account below and complete onboarding immediately after sign-in.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSignIn();
          }}
        >
          <label className="block text-sm font-semibold text-sky-900">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2 outline-none ring-sky-300 focus:ring"
              required
              disabled={isSubmitting}
            />
          </label>
          <label className="block text-sm font-semibold text-sky-900">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2 outline-none ring-sky-300 focus:ring"
              required
              minLength={8}
              disabled={isSubmitting}
            />
          </label>
          <button
            className="w-full rounded-xl bg-sky-900 px-4 py-2.5 font-semibold text-white transition hover:bg-sky-800"
            type="button"
            onClick={() => void onSignIn()}
            disabled={isSubmitting}
          >
            {activeAction === "signin" ? "Signing in..." : "Sign in"}
          </button>
          <button
            className="w-full rounded-xl border border-sky-300 bg-white px-4 py-2.5 font-semibold text-sky-900 transition hover:bg-sky-50"
            type="button"
            onClick={() => void onRegister()}
            disabled={isSubmitting}
          >
            {activeAction === "register" ? "Creating account..." : "Create account"}
          </button>
        </form>
        {notice ? (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{getErrorMessage(error)}</p>
        ) : null}
      </section>
    </main>
  );
}
