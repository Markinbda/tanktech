import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const yesNo = z.enum(["Yes", "No"]);

const schema = z.object({
  propertyMode: z.enum(["existing", "new"]),
  tankMode: z.enum(["existing", "new"]),
  existingPropertyId: z.string().uuid().nullable(),
  existingTankId: z.string().uuid().nullable(),
  contact: z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    preferredContactMethod: z.enum(["Phone", "WhatsApp", "Email"]),
  }),
  property: z.object({
    address: z.string().min(1),
    parish: z.string().min(1),
    propertyType: z.enum(["Residential", "Rental Property", "Commercial"]),
    yourRole: z.enum(["Owner", "Tenant", "Property Manager"]),
  }),
  tank: z.object({
    numberOfTanks: z.number().int().min(1),
    approximateTankSize: z.enum(["Small", "Medium", "Large", "Not sure"]),
    lastCleaned: z.enum([
      "Less than 3 years ago",
      "3-6 years ago",
      "Over 6 years ago",
      "Not sure",
    ]),
    problemSymptoms: z.array(z.string()),
    problemOther: z.string(),
  }),
  access: z.object({
    tankLocation: z.enum(["Roof", "Underground", "Basement/Lower level", "Other"]),
    tankLocationOther: z.string(),
    accessible: yesNo,
    accessChallenges: z.array(z.string()),
    accessChallengesOther: z.string(),
    animalsAffectAccess: yesNo,
    animalDetails: z.string(),
    someoneOnSite: yesNo,
    onsiteContactName: z.string(),
    onsiteContactPhone: z.string(),
    accessNotes: z.string(),
  }),
  service: z.object({
    serviceType: z.enum([
      "Full water tank cleaning",
      "Inspection only",
      "Aeration/chlorination",
      "Emergency service",
      "Unsure (please advise)",
    ]),
    urgencyLevel: z.enum(["Same day", "Within 24 hours", "Within 48 hours", ""]).optional(),
    emergencyDescription: z.string(),
  }),
  scheduling: z.object({
    preferredDate: z.string(),
    preferredTimeWindow: z.enum(["Morning", "Afternoon"]),
    additionalSchedulingNotes: z.string(),
  }),
  compliance: z.object({
    routineCompliance: z.union([yesNo, z.literal("")]),
    needsCertificate: z.union([yesNo, z.literal("")]),
    interestedInReminders: z.union([yesNo, z.literal("")]),
    interestedInPlan: z.union([yesNo, z.literal("")]),
    managesMultipleProperties: z.union([yesNo, z.literal("")]),
    approxPropertyCount: z.string(),
  }),
  consent: z.object({
    accuracyConfirmed: z.literal(true),
  }),
})
.superRefine((data, context) => {
  if (data.propertyMode === "existing" && !data.existingPropertyId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["existingPropertyId"],
      message: "Existing property is required when using existing property mode.",
    });
  }

  if (data.tankMode === "existing" && !data.existingTankId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["existingTankId"],
      message: "Existing tank is required when using existing tank mode.",
    });
  }

  if (data.tank.problemSymptoms.includes("Other") && !data.tank.problemOther.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["tank", "problemOther"],
      message: "Other symptom details are required.",
    });
  }

  if (data.access.tankLocation === "Other" && !data.access.tankLocationOther.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["access", "tankLocationOther"],
      message: "Other tank location details are required.",
    });
  }

  if (data.access.accessible === "No" && data.access.accessChallenges.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["access", "accessChallenges"],
      message: "At least one access challenge is required.",
    });
  }

  if (data.access.accessChallenges.includes("Other") && !data.access.accessChallengesOther.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["access", "accessChallengesOther"],
      message: "Other access challenge details are required.",
    });
  }

  if (data.access.animalsAffectAccess === "Yes" && !data.access.animalDetails.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["access", "animalDetails"],
      message: "Animal details are required.",
    });
  }

  if (data.access.someoneOnSite === "Yes") {
    if (!data.access.onsiteContactName.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["access", "onsiteContactName"],
        message: "On-site contact name is required.",
      });
    }

    if (!data.access.onsiteContactPhone.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["access", "onsiteContactPhone"],
        message: "On-site contact phone is required.",
      });
    }
  }

  if (data.service.serviceType === "Emergency service") {
    if (!data.service.urgencyLevel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["service", "urgencyLevel"],
        message: "Urgency level is required for emergency service.",
      });
    }

    if (!data.service.emergencyDescription.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["service", "emergencyDescription"],
        message: "Emergency description is required.",
      });
    }
  }

  if (data.property.yourRole === "Property Manager" && data.compliance.managesMultipleProperties === "") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["compliance", "managesMultipleProperties"],
      message: "Please confirm whether multiple properties are managed.",
    });
  }

  if (
    data.property.yourRole === "Property Manager" &&
    data.compliance.managesMultipleProperties === "Yes" &&
    (!data.compliance.approxPropertyCount || Number(data.compliance.approxPropertyCount) < 1)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["compliance", "approxPropertyCount"],
      message: "Approximate number of properties is required.",
    });
  }
});

function buildWindowFromPreference(dateInput: string, preferredTimeWindow: "Morning" | "Afternoon") {
  const startTime = preferredTimeWindow === "Morning" ? "08:00:00" : "13:00:00";
  const endTime = preferredTimeWindow === "Morning" ? "12:00:00" : "17:00:00";

  const start = new Date(`${dateInput}T${startTime}`);
  const end = new Date(`${dateInput}T${endTime}`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

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

  const bookingData = payload.data;

  const bookingWindow = buildWindowFromPreference(
    bookingData.scheduling.preferredDate,
    bookingData.scheduling.preferredTimeWindow,
  );

  if (!bookingWindow) {
    return NextResponse.json({ error: "Invalid preferred date or time window." }, { status: 400 });
  }

  let propertyId = bookingData.existingPropertyId;
  let orgId: string | null = null;

  if (bookingData.propertyMode === "existing") {
    const { data: existingProperty, error: propertyError } = await supabase
      .from("properties")
      .select("id, org_id")
      .eq("id", bookingData.existingPropertyId)
      .maybeSingle();

    if (propertyError || !existingProperty) {
      return NextResponse.json({ error: "Unable to find selected property." }, { status: 400 });
    }

    propertyId = existingProperty.id;
    orgId = existingProperty.org_id;
  } else {
    const propertyNotes = [
      `[property_type:${bookingData.property.propertyType}]`,
      `[customer_role:${bookingData.property.yourRole}]`,
    ].join("\n");

    const { data: createdProperty, error: propertyError } = await supabase
      .from("properties")
      .insert({
        owner_id: user.id,
        address: bookingData.property.address,
        parish: bookingData.property.parish,
        notes: propertyNotes,
      })
      .select("id, org_id")
      .single();

    if (propertyError || !createdProperty) {
      return NextResponse.json({ error: propertyError?.message ?? "Unable to create property." }, { status: 400 });
    }

    propertyId = createdProperty.id;
    orgId = createdProperty.org_id;
  }

  if (!propertyId) {
    return NextResponse.json({ error: "Property details are required." }, { status: 400 });
  }

  let tankId = bookingData.existingTankId;
  if (bookingData.tankMode === "existing") {
    const { data: existingTank, error: tankError } = await supabase
      .from("tanks")
      .select("id, property_id")
      .eq("id", bookingData.existingTankId)
      .maybeSingle();

    if (tankError || !existingTank || existingTank.property_id !== propertyId) {
      return NextResponse.json({ error: "Unable to find selected tank for property." }, { status: 400 });
    }

    tankId = existingTank.id;
  } else {
    const tankAccessNotes = [
      bookingData.access.accessNotes.trim(),
      `last_cleaned_window:${bookingData.tank.lastCleaned}`,
      bookingData.access.accessible === "No" && bookingData.access.accessChallenges.length > 0
        ? `access_challenges:${bookingData.access.accessChallenges.join(", ")}${
            bookingData.access.accessChallengesOther ? ` (${bookingData.access.accessChallengesOther})` : ""
          }`
        : "",
    ]
      .filter((note) => note)
      .join("\n");

    const { data: createdTank, error: tankError } = await supabase
      .from("tanks")
      .insert({
        property_id: propertyId,
        size_estimate: bookingData.tank.approximateTankSize,
        access_notes: tankAccessNotes || null,
      })
      .select("id")
      .single();

    if (tankError || !createdTank) {
      return NextResponse.json({ error: tankError?.message ?? "Unable to create tank." }, { status: 400 });
    }

    tankId = createdTank.id;
  }

  if (!tankId) {
    return NextResponse.json({ error: "Tank details are required." }, { status: 400 });
  }

  const bookingNotes = JSON.stringify(
    {
      contact: bookingData.contact,
      property: bookingData.property,
      tank: bookingData.tank,
      access: bookingData.access,
      service: bookingData.service,
      scheduling: bookingData.scheduling,
      compliance: bookingData.compliance,
      selection: {
        propertyMode: bookingData.propertyMode,
        tankMode: bookingData.tankMode,
      },
    },
    null,
    2,
  );

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      owner_id: user.id,
      org_id: orgId,
      property_id: propertyId,
      tank_id: tankId,
      requested_window_start: bookingWindow.start,
      requested_window_end: bookingWindow.end,
      notes: bookingNotes,
      status: "requested",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ bookingId: booking.id }, { status: 201 });
}
