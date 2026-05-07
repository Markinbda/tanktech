import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";

export default async function SubscriptionsPage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

  if (profile?.role === "admin") {
    redirect("/admin/reminders");
  }

  if (profile?.role === "staff") {
    redirect("/admin/dashboard");
  }

  redirect("/dashboard");
}
