"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/browser";

type RegistrationProfile = {
  full_name?: string | null;
  phone?: string | null;
  address?: string | null;
  parish?: string | null;
  preferred_contact_method?: string | null;
  registration_details?: Record<string, unknown> | null;
};

function normalizeRegistrationState(profile: RegistrationProfile | null, metadata: Record<string, unknown>) {
  const registrationDetails = (profile?.registration_details as Record<string, unknown> | null) ?? {};
  const detailsTankSizes = Array.isArray(registrationDetails.tankSizes)
    ? registrationDetails.tankSizes.map((value) => String(value))
    : [];
  const detailsTankCount = Number((registrationDetails.numberOfTanks ?? detailsTankSizes.length) || 1);

  return {
    fullName: profile?.full_name ?? String(metadata.full_name ?? ""),
    phone: profile?.phone ?? String(metadata.phone ?? ""),
    address: profile?.address ?? "",
    parish: profile?.parish ?? "",
    preferredContactMethod: (profile?.preferred_contact_method as "phone" | "email" | "whatsapp" | null) ?? "phone",
    customerType:
      (registrationDetails.customerType as "property_owner" | "tenant" | "property_manager" | undefined) ??
      "property_owner",
    propertyType:
      (registrationDetails.propertyType as "residential" | "commercial" | "mixed_use" | undefined) ?? "residential",
    numberOfTanks: detailsTankCount,
    tankSizes: detailsTankSizes.length ? detailsTankSizes : Array.from({ length: detailsTankCount }, () => ""),
  };
}

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
  const [address, setAddress] = useState("");
  const [parish, setParish] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState<"phone" | "email" | "whatsapp">("phone");
  const [customerType, setCustomerType] = useState<"property_owner" | "tenant" | "property_manager">("property_owner");
  const [propertyType, setPropertyType] = useState<"residential" | "commercial" | "mixed_use">("residential");
  const [numberOfTanks, setNumberOfTanks] = useState(1);
  const [tankSizes, setTankSizes] = useState<string[]>([""]);
  const [accessNotes, setAccessNotes] = useState("");
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
        .select("full_name, phone, address, parish, preferred_contact_method, registration_details")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) {
        return;
      }

      setEmail(user.email ?? "");
      const normalized = normalizeRegistrationState(
        profile as RegistrationProfile | null,
        (user.user_metadata as Record<string, unknown>) ?? {},
      );
      setFullName(normalized.fullName);
      setPhone(normalized.phone);
      setAddress(normalized.address);
      setParish(normalized.parish);
      setPreferredContactMethod(normalized.preferredContactMethod);
      setCustomerType(normalized.customerType);
      setPropertyType(normalized.propertyType);
      setNumberOfTanks(normalized.numberOfTanks);
      setTankSizes(normalized.tankSizes);
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

    const registrationPayload = {
      fullName,
      phone,
      address,
      parish,
      preferredContactMethod,
      customerType,
      propertyType,
      numberOfTanks,
      tankSizes,
      accessNotes,
    };

    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registrationPayload),
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
          <label className="block text-sm font-semibold text-sky-900">
            Preferred contact method
            <select
              value={preferredContactMethod}
              onChange={(event) => setPreferredContactMethod(event.target.value as "phone" | "email" | "whatsapp")}
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2 outline-none ring-sky-300 focus:ring"
              disabled={isLoading || isSubmitting}
            >
              <option value="phone">Phone call</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-sky-900">
            Property address
            <input
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2 outline-none ring-sky-300 focus:ring"
              required
              disabled={isLoading || isSubmitting}
            />
          </label>
          <label className="block text-sm font-semibold text-sky-900">
            Parish
            <input
              type="text"
              value={parish}
              onChange={(event) => setParish(event.target.value)}
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2 outline-none ring-sky-300 focus:ring"
              required
              disabled={isLoading || isSubmitting}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-sky-900">
              Customer type
              <select
                value={customerType}
                onChange={(event) => setCustomerType(event.target.value as "property_owner" | "tenant" | "property_manager")}
                className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2 outline-none ring-sky-300 focus:ring"
                disabled={isLoading || isSubmitting}
              >
                <option value="property_owner">Property owner</option>
                <option value="tenant">Tenant</option>
                <option value="property_manager">Property manager</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-sky-900">
              Property type
              <select
                value={propertyType}
                onChange={(event) => setPropertyType(event.target.value as "residential" | "commercial" | "mixed_use")}
                className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2 outline-none ring-sky-300 focus:ring"
                disabled={isLoading || isSubmitting}
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="mixed_use">Mixed use</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold text-sky-900">
            Number of tanks
            <input
              type="number"
              min={1}
              max={10}
              value={numberOfTanks}
              onChange={(event) => {
                const value = Math.max(1, Math.min(10, Number(event.target.value) || 1));
                setNumberOfTanks(value);
                setTankSizes((prev) => Array.from({ length: value }, (_, index) => prev[index] ?? ""));
              }}
              className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2 outline-none ring-sky-300 focus:ring"
              required
              disabled={isLoading || isSubmitting}
            />
          </label>
          <div className="space-y-3 rounded-xl border border-sky-100 bg-sky-50/50 p-4">
            <p className="text-sm font-semibold text-sky-900">Tank sizes</p>
            {tankSizes.map((tankSize, index) => (
              <label key={index} className="block text-sm font-semibold text-sky-900">
                Tank {index + 1} size
                <input
                  type="text"
                  value={tankSize}
                  onChange={(event) => {
                    const next = [...tankSizes];
                    next[index] = event.target.value;
                    setTankSizes(next);
                  }}
                  placeholder="e.g. 1,000 gallons"
                  className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  required
                  disabled={isLoading || isSubmitting}
                />
              </label>
            ))}
          </div>
          <label className="block text-sm font-semibold text-sky-900">
            Access notes (optional)
            <textarea
              value={accessNotes}
              onChange={(event) => setAccessNotes(event.target.value)}
              className="mt-1 min-h-24 w-full rounded-xl border border-sky-200 px-3 py-2 outline-none ring-sky-300 focus:ring"
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