import { requireRole } from "@/lib/auth";

import { AdminUsersClient } from "./users-client";

export default async function AdminUsersPage() {
  await requireRole(["admin"]);
  return <AdminUsersClient />;
}
