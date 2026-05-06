import { requireRole } from "@/lib/auth";

import { AdminUserDetailClient } from "./user-detail-client";

type Params = { id: string };

export default async function AdminUserDetailPage({ params }: { params: Promise<Params> }) {
  await requireRole(["admin"]);
  const { id } = await params;
  return <AdminUserDetailClient userId={id} />;
}
