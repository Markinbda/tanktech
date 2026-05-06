import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  fullName: z.string().min(1, "Full name is required."),
  phone: z.string().min(1, "Phone number is required."),
  address: z.string().min(1, "Property address is required."),
  parish: z.string().min(1, "Parish is required."),
  preferredContactMethod: z.enum(["phone", "email", "whatsapp"]),
  customerType: z.enum(["property_owner", "tenant", "property_manager"]),
  propertyType: z.enum(["residential", "commercial", "mixed_use"]),
  numberOfTanks: z.coerce.number().int().min(1).max(10),
  tankSizes: z.array(z.string().min(1)).min(1).max(10),
  accessNotes: z.string().optional(),
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

  if (payload.data.tankSizes.length !== payload.data.numberOfTanks) {
    return NextResponse.json({ error: "Please provide a size for each tank." }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    full_name: payload.data.fullName,
    phone: payload.data.phone,
    role: "customer",
    address: payload.data.address,
    parish: payload.data.parish,
    preferred_contact_method: payload.data.preferredContactMethod,
    registration_details: {
      completed: true,
      customerType: payload.data.customerType,
      propertyType: payload.data.propertyType,
      numberOfTanks: payload.data.numberOfTanks,
      tankSizes: payload.data.tankSizes,
      submittedAt: new Date().toISOString(),
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: existingProperties } = await supabase
    .from("properties")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);

  if (!existingProperties || existingProperties.length === 0) {
    const propertyNotes = [
      `Customer type: ${payload.data.customerType}`,
      `Property type: ${payload.data.propertyType}`,
      payload.data.accessNotes ? `Access notes: ${payload.data.accessNotes}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .insert({
        owner_id: user.id,
        address: payload.data.address,
        parish: payload.data.parish,
        notes: propertyNotes,
      })
      .select("id")
      .single();

    if (propertyError || !property) {
      return NextResponse.json({ error: propertyError?.message ?? "Failed to create property." }, { status: 400 });
    }

    const tanksToInsert = payload.data.tankSizes.map((tankSize) => ({
      property_id: property.id,
      size_estimate: tankSize,
      access_notes: payload.data.accessNotes ?? null,
    }));

    const { error: tankError } = await supabase.from("tanks").insert(tanksToInsert);
    if (tankError) {
      return NextResponse.json({ error: tankError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
