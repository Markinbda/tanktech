import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin-api";

type Params = { id: string };

function generateTemporaryPassword(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let generated = "";
  for (let index = 0; index < length; index += 1) {
    generated += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return generated;
}

export async function POST(_request: Request, { params }: { params: Promise<Params> }) {
  const guard = await requireAdminApi();
  if (guard.errorResponse || !guard.admin) {
    return guard.errorResponse!;
  }

  const { id } = await params;
  const temporaryPassword = generateTemporaryPassword();

  const { error } = await guard.admin.auth.admin.updateUserById(id, {
    password: temporaryPassword,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ temporaryPassword });
}
