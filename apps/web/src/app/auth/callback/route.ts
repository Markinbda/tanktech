import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function getSafeReturnTo(value: string | null) {
  if (!value) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const returnTo = getSafeReturnTo(requestUrl.searchParams.get("returnTo"));
  const loginReturnTo = returnTo ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL(`/login?returnTo=${encodeURIComponent(loginReturnTo)}`, request.url));
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(new URL(`/login?returnTo=${encodeURIComponent(loginReturnTo)}`, request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(`/login?returnTo=${encodeURIComponent(loginReturnTo)}`, request.url));
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, phone, address, parish, registration_details, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    await admin.from("profiles").insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata.full_name ?? null,
      phone: user.user_metadata.phone ?? null,
      role: "customer",
    });

    return NextResponse.redirect(
      new URL(`/register?returnTo=${encodeURIComponent(loginReturnTo)}`, request.url),
    );
  }

  const registrationDetails = (profile.registration_details as Record<string, unknown> | null) ?? {};
  const registrationComplete = Boolean(registrationDetails.completed);
  const defaultReturnTo = profile.role === "admin" ? "/admin/dashboard" : "/dashboard";
  const targetReturnTo = returnTo ?? defaultReturnTo;

  if (profile.role !== "admin" && (!profile.full_name || !profile.phone || !profile.address || !profile.parish || !registrationComplete)) {
    return NextResponse.redirect(
      new URL(`/register?returnTo=${encodeURIComponent(targetReturnTo)}`, request.url),
    );
  }

  return NextResponse.redirect(new URL(targetReturnTo, request.url));
}
