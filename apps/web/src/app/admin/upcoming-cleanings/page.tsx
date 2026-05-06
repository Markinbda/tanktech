import { requireRole } from "@/lib/auth";

import { UpcomingCleaningsClient } from "./upcoming-cleanings-client";

export default async function AdminUpcomingCleaningsPage() {
  await requireRole(["admin"]);
  return <UpcomingCleaningsClient />;
}
