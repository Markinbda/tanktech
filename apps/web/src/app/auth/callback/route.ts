import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function getSafeReturnTo(value: string | null) {
  if (!value) {
    return "/dashboard";
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

  if (!code) {
    return NextResponse.redirect(new URL(`/login?returnTo=${encodeURIComponent(returnTo)}`, request.url));
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(new URL(`/login?returnTo=${encodeURIComponent(returnTo)}`, request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(`/login?returnTo=${encodeURIComponent(returnTo)}`, request.url));
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, phone")
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
      new URL(`/register?returnTo=${encodeURIComponent(returnTo)}`, request.url),
    );
  }

  if (!profile.full_name || !profile.phone) {
    return NextResponse.redirect(
      new URL(`/register?returnTo=${encodeURIComponent(returnTo)}`, request.url),
    );
  }

  return NextResponse.redirect(new URL(returnTo, request.url));
}
