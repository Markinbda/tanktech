"use client";

import { FormEvent, useState } from "react";

type Invite = {
  id: string;
  email: string;
  member_role: string;
  accepted_at: string | null;
  expires_at: string;
};

type Member = {
  id: string;
  member_role: string;
  profiles: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null;
};

export function TeamManager({ invites, members }: { invites: Invite[]; members: Member[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/pm/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        memberRole: formData.get("memberRole"),
      }),
    });

    setLoading(false);

    if (!response.ok) {
      setMessage("Could not send invite.");
      return;
    }

    setMessage("Invite created and email dispatch requested.");
    event.currentTarget.reset();
    window.location.reload();
  }

  return (
    <div className="space-y-8">
      <form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6" onSubmit={invite}>
        <input name="email" placeholder="Team member email" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        <select name="memberRole" className="w-full rounded-xl border border-slate-200 px-3 py-2">
          <option value="manager">Manager</option>
          <option value="member">Member</option>
        </select>
        <button disabled={loading} type="submit" className="rounded-xl bg-sky-900 px-4 py-2 font-semibold text-white disabled:opacity-50">
          {loading ? "Sending..." : "Send invite"}
        </button>
        {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-sky-950">Current Team</h2>
        <div className="mt-4 space-y-3 text-sm">
          {members.map((member) => {
            const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
            return (
              <div key={member.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-800">{profile?.full_name ?? "Unnamed"}</p>
                  <p className="text-slate-500">{profile?.email ?? "No email"}</p>
                </div>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase text-sky-900">
                  {member.member_role}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-sky-950">Pending Invites</h2>
        <div className="mt-4 space-y-3 text-sm">
          {invites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
              <div>
                <p className="font-semibold text-slate-800">{invite.email}</p>
                <p className="text-slate-500">Expires {new Date(invite.expires_at).toLocaleDateString()}</p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase text-amber-900">
                {invite.accepted_at ? "Accepted" : invite.member_role}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
