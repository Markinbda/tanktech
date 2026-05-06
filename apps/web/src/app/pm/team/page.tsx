import { TeamManager } from "@/components/pm/team-manager";
import { requireRole } from "@/lib/auth";

export default async function PMTeamPage() {
  const { supabase, user } = await requireRole(["property_manager", "admin", "staff"]);

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.org_id;

  const [{ data: invites }, { data: members }] = await Promise.all([
    supabase
      .from("organization_invites")
      .select("id, email, member_role, accepted_at, expires_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("organization_members")
      .select("id, member_role, profiles(full_name,email)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-sky-950">Team Management</h1>
      <p className="mt-2 text-slate-600">Invite managers and members to your organization.</p>
      <div className="mt-6">
        <TeamManager invites={invites ?? []} members={members ?? []} />
      </div>
    </main>
  );
}
