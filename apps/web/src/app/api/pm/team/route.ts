import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email(),
  memberRole: z.enum(["manager", "member"]),
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id || !["property_manager", "admin", "staff"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const token = randomUUID();

  const { data: invite, error } = await admin
    .from("organization_invites")
    .insert({
      org_id: profile.org_id,
      email: payload.data.email,
      member_role: payload.data.memberRole,
      token,
      invited_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: error?.message ?? "Failed to create invite" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  await admin.functions.invoke("send-email", {
    body: {
      to: payload.data.email,
      template: "tanktech_team_invite",
      dynamicData: {
        subject: "Tank Tech organization invite",
        inviteUrl: `${appUrl}/invite/${token}`,
        role: payload.data.memberRole,
      },
    },
  });

  return NextResponse.json({ inviteId: invite.id }, { status: 201 });
}
