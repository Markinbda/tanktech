import { requireRole } from "@/lib/auth";

import { AdminRemindersClient } from "./reminders-client";

export default async function AdminRemindersPage() {
  await requireRole(["admin"]);
  return <AdminRemindersClient />;
}
