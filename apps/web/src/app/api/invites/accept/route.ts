import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  token: z.string().min(1),
});

export async function POST(request: Request) {
  const payload = schema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: invite, error } = await admin
    .from("organization_invites")
    .select("id, org_id, email, member_role, expires_at, accepted_at")
    .eq("token", payload.data.token)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.accepted_at || new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite is no longer valid" }, { status: 400 });
  }

  const { data: profile } = await admin.from("profiles").select("id, email").eq("id", user.id).single();

  if (!profile?.email || profile.email.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json({ error: "Invite email does not match signed-in user" }, { status: 403 });
  }

  await admin.from("organization_members").upsert({
    org_id: invite.org_id,
    user_id: user.id,
    member_role: invite.member_role,
  });

  await admin
    .from("profiles")
    .update({ org_id: invite.org_id, role: "property_manager" })
    .eq("id", user.id);

  await admin
    .from("organization_invites")
    .update({ accepted_by: user.id, accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true });
}
