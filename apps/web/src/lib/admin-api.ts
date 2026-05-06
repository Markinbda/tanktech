import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function requireAdminApi() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
      admin: null,
      supabase,
    };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "admin") {
    return {
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      user: null,
      admin: null,
      supabase,
    };
  }

  return {
    errorResponse: null,
    user,
    admin: createAdminClient(),
    supabase,
  };
}
