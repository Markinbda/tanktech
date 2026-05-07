"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/browser";

const PARISH_OPTIONS = [
  "Pembroke",
  "Devonshire",
  "Paget",
  "Warwick",
  "Southampton",
  "Sandys",
  "Hamilton Parish",
  "Smith's",
  "St. George's",
];

const PROPERTY_TYPES = ["Residential", "Rental Property", "Commercial"] as const;
const USER_ROLES = ["Owner", "Tenant", "Property Manager"] as const;
const CONTACT_METHODS = ["Phone", "WhatsApp", "Email"] as const;
const TANK_SIZE_OPTIONS = ["Small", "Medium", "Large", "Not sure"] as const;
const LAST_CLEANED_OPTIONS = [
  "Less than 3 years ago",
  "3-6 years ago",
  "Over 6 years ago",
  "Not sure",
] as const;
const TANK_LOCATIONS = ["Roof", "Underground", "Basement/Lower level", "Other"] as const;
const ACCESS_CHALLENGES = ["Narrow access", "Ladder required", "Stairs", "Locked area", "Other"] as const;
const PROBLEM_SYMPTOMS = [
  "Bad smell (sulfur/egg smell)",
  "Cloudy/discoloured water",
  "Sediment buildup",
  "Low water pressure",
  "Algae/debris visible",
  "Other",
] as const;
const SERVICE_TYPES = [
  "Full water tank cleaning",
  "Inspection only",
  "Aeration/chlorination",
  "Emergency service",
  "Unsure (please advise)",
] as const;
const URGENCY_LEVELS = ["Same day", "Within 24 hours", "Within 48 hours"] as const;
const TIME_WINDOWS = ["Morning", "Afternoon"] as const;

type YesNo = "Yes" | "No";
type PropertyMode = "existing" | "new";
type TankMode = "existing" | "new";

type ExistingProperty = {
  id: string;
  address: string;
  parish: string | null;
  notes: string | null;
};

type ExistingTank = {
  id: string;
  property_id: string;
  size_estimate: string | null;
  last_cleaned_date: string | null;
  access_notes: string | null;
};

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  preferredContactMethod: string;
  propertyAddress: string;
  parish: string;
  propertyType: string;
  yourRole: string;
  numberOfTanks: number;
  approximateTankSize: string;
  lastCleaned: string;
  problemSymptoms: string[];
  problemOther: string;
  tankLocation: string;
  tankLocationOther: string;
  accessible: "" | YesNo;
  accessChallenges: string[];
  accessChallengesOther: string;
  animalsAffectAccess: "" | YesNo;
  animalDetails: string;
  someoneOnSite: "" | YesNo;
  onsiteContactName: string;
  onsiteContactPhone: string;
  accessNotes: string;
  serviceType: string;
  urgencyLevel: string;
  emergencyDescription: string;
  preferredDate: string;
  preferredTimeWindow: string;
  schedulingNotes: string;
  routineCompliance: "" | YesNo;
  needsCertificate: "" | YesNo;
  interestedInReminders: "" | YesNo;
  interestedInPlan: "" | YesNo;
  managesMultipleProperties: "" | YesNo;
  approxPropertyCount: string;
  consentAccuracy: boolean;
};

const initialFormState: FormState = {
  fullName: "",
  email: "",
  phone: "",
  preferredContactMethod: "",
  propertyAddress: "",
  parish: "",
  propertyType: "",
  yourRole: "",
  numberOfTanks: 1,
  approximateTankSize: "",
  lastCleaned: "",
  problemSymptoms: [],
  problemOther: "",
  tankLocation: "",
  tankLocationOther: "",
  accessible: "",
  accessChallenges: [],
  accessChallengesOther: "",
  animalsAffectAccess: "",
  animalDetails: "",
  someoneOnSite: "",
  onsiteContactName: "",
  onsiteContactPhone: "",
  accessNotes: "",
  serviceType: "",
  urgencyLevel: "",
  emergencyDescription: "",
  preferredDate: "",
  preferredTimeWindow: "",
  schedulingNotes: "",
  routineCompliance: "",
  needsCertificate: "",
  interestedInReminders: "",
  interestedInPlan: "",
  managesMultipleProperties: "",
  approxPropertyCount: "",
  consentAccuracy: false,
};

function parsePropertyTypeFromNotes(notes: string | null): string {
  if (!notes) {
    return "Residential";
  }

  const match = notes.match(/\[property_type:(.*?)\]/i);
  if (!match) {
    return "Residential";
  }

  const value = match[1].trim();
  return PROPERTY_TYPES.includes(value as (typeof PROPERTY_TYPES)[number]) ? value : "Residential";
}

function mapLastCleanedDateToOption(lastCleanedDate: string | null): string {
  if (!lastCleanedDate) {
    return "Not sure";
  }

  const date = new Date(lastCleanedDate);
  if (Number.isNaN(date.getTime())) {
    return "Not sure";
  }

  const now = new Date();
  const yearsSince = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

  if (yearsSince < 3) {
    return "Less than 3 years ago";
  }
  if (yearsSince <= 6) {
    return "3-6 years ago";
  }
  return "Over 6 years ago";
}

function normalizeTankSize(sizeEstimate: string | null): string {
  if (!sizeEstimate) {
    return "Not sure";
  }

  const normalized = sizeEstimate.trim().toLowerCase();
  if (normalized.includes("small")) {
    return "Small";
  }
  if (normalized.includes("medium")) {
    return "Medium";
  }
  if (normalized.includes("large")) {
    return "Large";
  }

  return "Not sure";
}

function yesNoButtons(
  currentValue: "" | YesNo,
  onSelect: (value: YesNo) => void,
  name: string,
) {
  return (
    <div className="mt-2 flex gap-2">
      {(["Yes", "No"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
            currentValue === option
              ? "border-sky-700 bg-sky-700 text-white"
              : "border-slate-200 bg-white text-slate-700"
          }`}
          aria-pressed={currentValue === option}
          aria-label={`${name}-${option}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default function NewBookingPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [propertyMode, setPropertyMode] = useState<PropertyMode>("new");
  const [tankMode, setTankMode] = useState<TankMode>("new");
  const [properties, setProperties] = useState<ExistingProperty[]>([]);
  const [tanks, setTanks] = useState<ExistingTank[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedTankId, setSelectedTankId] = useState("");

  const filteredTanks = useMemo(() => {
    if (!selectedPropertyId) {
      return [];
    }
    return tanks.filter((tank) => tank.property_id === selectedPropertyId);
  }, [selectedPropertyId, tanks]);

  useEffect(() => {
    let mounted = true;

    async function loadContext() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (!user) {
        setIsSignedIn(false);
        setIsLoadingContext(false);
        return;
      }

      setIsSignedIn(true);

      const [{ data: profile }, { data: userProperties }, { data: userTanks }] = await Promise.all([
        supabase.from("profiles").select("full_name, email, phone, role").eq("id", user.id).maybeSingle(),
        supabase.from("properties").select("id, address, parish, notes").order("created_at", { ascending: false }),
        supabase
          .from("tanks")
          .select("id, property_id, size_estimate, last_cleaned_date, access_notes")
          .order("created_at", { ascending: false }),
      ]);

      if (!mounted) {
        return;
      }

      if (profile?.role === "admin" || profile?.role === "staff") {
        router.replace("/admin/bookings");
        return;
      }

      setForm((current) => ({
        ...current,
        fullName: profile?.full_name ?? current.fullName,
        email: profile?.email ?? user.email ?? current.email,
        phone: profile?.phone ?? current.phone,
      }));

      const loadedProperties = (userProperties ?? []) as ExistingProperty[];
      const loadedTanks = (userTanks ?? []) as ExistingTank[];

      setProperties(loadedProperties);
      setTanks(loadedTanks);

      if (loadedProperties.length > 0) {
        const firstProperty = loadedProperties[0];
        setPropertyMode("existing");
        setSelectedPropertyId(firstProperty.id);
        setForm((current) => ({
          ...current,
          propertyAddress: firstProperty.address,
          parish: firstProperty.parish ?? "",
          propertyType: parsePropertyTypeFromNotes(firstProperty.notes),
        }));
      }

      setIsLoadingContext(false);
    }

    void loadContext();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  useEffect(() => {
    if (!selectedPropertyId || propertyMode !== "existing") {
      return;
    }

    const selectedProperty = properties.find((property) => property.id === selectedPropertyId);
    if (!selectedProperty) {
      return;
    }

    setForm((current) => ({
      ...current,
      propertyAddress: selectedProperty.address,
      parish: selectedProperty.parish ?? "",
      propertyType: parsePropertyTypeFromNotes(selectedProperty.notes),
    }));

    const propertyTanks = tanks.filter((tank) => tank.property_id === selectedPropertyId);
    if (propertyTanks.length > 0) {
      setTankMode("existing");
      setSelectedTankId(propertyTanks[0].id);
    } else {
      setTankMode("new");
      setSelectedTankId("");
    }
  }, [properties, propertyMode, selectedPropertyId, tanks]);

  useEffect(() => {
    if (!selectedTankId || tankMode !== "existing") {
      return;
    }

    const selectedTank = tanks.find((tank) => tank.id === selectedTankId);
    if (!selectedTank) {
      return;
    }

    setForm((current) => ({
      ...current,
      approximateTankSize: normalizeTankSize(selectedTank.size_estimate),
      lastCleaned: mapLastCleanedDateToOption(selectedTank.last_cleaned_date),
      accessNotes: selectedTank.access_notes ?? current.accessNotes,
    }));
  }, [selectedTankId, tankMode, tanks]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const clone = { ...current };
      delete clone[key];
      return clone;
    });
    setMessage(null);
  }

  function toggleMultiValueField(field: "problemSymptoms" | "accessChallenges", value: string) {
    setForm((current) => {
      const list = current[field];
      const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
      return { ...current, [field]: next };
    });
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {};

    if (!form.fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    if (!form.phone.trim()) nextErrors.phone = "Phone number is required.";
    if (!form.preferredContactMethod) nextErrors.preferredContactMethod = "Preferred contact method is required.";

    if (isSignedIn && propertyMode === "existing") {
      if (!selectedPropertyId) nextErrors.selectedPropertyId = "Choose an existing property or add a new one.";
    } else {
      if (!form.propertyAddress.trim()) nextErrors.propertyAddress = "Property address is required.";
      if (!form.parish.trim()) nextErrors.parish = "Parish/area is required.";
      if (!form.propertyType) nextErrors.propertyType = "Property type is required.";
    }

    if (!form.yourRole) nextErrors.yourRole = "Your role is required.";
    if (!Number.isFinite(form.numberOfTanks) || form.numberOfTanks < 1) {
      nextErrors.numberOfTanks = "Number of tanks must be at least 1.";
    }

    if (!form.approximateTankSize) nextErrors.approximateTankSize = "Approximate tank size is required.";
    if (!form.lastCleaned) nextErrors.lastCleaned = "Please select when the tank was last cleaned.";

    if (isSignedIn && propertyMode === "existing" && filteredTanks.length > 0 && tankMode === "existing" && !selectedTankId) {
      nextErrors.selectedTankId = "Choose an existing tank or add a new one.";
    }

    if (form.problemSymptoms.includes("Other") && !form.problemOther.trim()) {
      nextErrors.problemOther = "Please describe the other symptom.";
    }

    if (!form.tankLocation) nextErrors.tankLocation = "Tank location is required.";
    if (form.tankLocation === "Other" && !form.tankLocationOther.trim()) {
      nextErrors.tankLocationOther = "Please specify the tank location.";
    }

    if (!form.accessible) nextErrors.accessible = "Please tell us if the tank is easily accessible.";
    if (form.accessible === "No" && form.accessChallenges.length === 0) {
      nextErrors.accessChallenges = "Select at least one access challenge.";
    }
    if (form.accessChallenges.includes("Other") && !form.accessChallengesOther.trim()) {
      nextErrors.accessChallengesOther = "Please describe the other access challenge.";
    }

    if (!form.animalsAffectAccess) nextErrors.animalsAffectAccess = "Please confirm if animals affect access.";
    if (form.animalsAffectAccess === "Yes" && !form.animalDetails.trim()) {
      nextErrors.animalDetails = "Please provide animal details or instructions.";
    }

    if (!form.someoneOnSite) nextErrors.someoneOnSite = "Please confirm whether someone is required on site.";
    if (form.someoneOnSite === "Yes") {
      if (!form.onsiteContactName.trim()) nextErrors.onsiteContactName = "On-site contact name is required.";
      if (!form.onsiteContactPhone.trim()) nextErrors.onsiteContactPhone = "On-site contact phone is required.";
    }

    if (!form.serviceType) nextErrors.serviceType = "Service type is required.";
    if (form.serviceType === "Emergency service") {
      if (!form.urgencyLevel) nextErrors.urgencyLevel = "Urgency level is required for emergency service.";
      if (!form.emergencyDescription.trim()) {
        nextErrors.emergencyDescription = "Brief emergency description is required.";
      }
    }

    if (!form.preferredDate) nextErrors.preferredDate = "Preferred date is required.";
    if (!form.preferredTimeWindow) nextErrors.preferredTimeWindow = "Preferred time window is required.";

    if (form.yourRole === "Property Manager") {
      if (!form.managesMultipleProperties) {
        nextErrors.managesMultipleProperties = "Please answer whether you manage multiple properties.";
      }
      if (form.managesMultipleProperties === "Yes") {
        const parsedCount = Number(form.approxPropertyCount);
        if (!Number.isFinite(parsedCount) || parsedCount < 1) {
          nextErrors.approxPropertyCount = "Approximate number of properties is required.";
        }
      }
    }

    if (!form.consentAccuracy) {
      nextErrors.consentAccuracy = "You must confirm the information is accurate.";
    }

    if (!isSignedIn) {
      nextErrors.authentication = "Please sign in to submit your booking request.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function onReviewBooking() {
    setMessage(null);
    const isValid = validateForm();
    if (!isValid) {
      setReviewMode(false);
      return;
    }

    setReviewMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitBooking() {
    setMessage(null);
    const isValid = validateForm();

    if (!isValid) {
      setReviewMode(false);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      propertyMode,
      tankMode,
      existingPropertyId: selectedPropertyId || null,
      existingTankId: selectedTankId || null,
      contact: {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        preferredContactMethod: form.preferredContactMethod,
      },
      property: {
        address: form.propertyAddress,
        parish: form.parish,
        propertyType: form.propertyType,
        yourRole: form.yourRole,
      },
      tank: {
        numberOfTanks: form.numberOfTanks,
        approximateTankSize: form.approximateTankSize,
        lastCleaned: form.lastCleaned,
        problemSymptoms: form.problemSymptoms,
        problemOther: form.problemOther,
      },
      access: {
        tankLocation: form.tankLocation,
        tankLocationOther: form.tankLocationOther,
        accessible: form.accessible,
        accessChallenges: form.accessChallenges,
        accessChallengesOther: form.accessChallengesOther,
        animalsAffectAccess: form.animalsAffectAccess,
        animalDetails: form.animalDetails,
        someoneOnSite: form.someoneOnSite,
        onsiteContactName: form.onsiteContactName,
        onsiteContactPhone: form.onsiteContactPhone,
        accessNotes: form.accessNotes,
      },
      service: {
        serviceType: form.serviceType,
        urgencyLevel: form.urgencyLevel,
        emergencyDescription: form.emergencyDescription,
      },
      scheduling: {
        preferredDate: form.preferredDate,
        preferredTimeWindow: form.preferredTimeWindow,
        additionalSchedulingNotes: form.schedulingNotes,
      },
      compliance: {
        routineCompliance: form.routineCompliance,
        needsCertificate: form.needsCertificate,
        interestedInReminders: form.interestedInReminders,
        interestedInPlan: form.interestedInPlan,
        managesMultipleProperties: form.managesMultipleProperties,
        approxPropertyCount: form.approxPropertyCount,
      },
      consent: {
        accuracyConfirmed: form.consentAccuracy,
      },
    };

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "Unable to create booking right now." }))) as {
        error?: string;
      };
      setMessage(body.error ?? "Unable to create booking right now.");
      setIsSubmitting(false);
      return;
    }

    setMessage("Booking request submitted to Tank Tech.");
    setIsSubmitting(false);
    setReviewMode(false);
    setErrors({});
    setForm((current) => ({
      ...initialFormState,
      fullName: isSignedIn ? current.fullName : "",
      email: isSignedIn ? current.email : "",
      phone: isSignedIn ? current.phone : "",
    }));

    if (isSignedIn && properties.length > 0) {
      setPropertyMode("existing");
      setSelectedPropertyId(properties[0].id);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <header className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-sky-950 sm:text-3xl">Book a Tank Cleaning</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
          Tell us what we need to know so our team can arrive prepared and complete your service in one visit.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-3">
          <p className="text-sm font-semibold text-sky-900">Already a Tank Tech customer?</p>
          <Link
            href="/login?returnTo=/bookings/new"
            className="rounded-full bg-sky-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
          >
            Sign in
          </Link>
          <p className="text-sm text-slate-600">
            {isLoadingContext
              ? "Checking your account..."
              : isSignedIn
                ? "Signed in. Your details are prefilled below."
                : "Not signed in. Please sign in before final submission."}
          </p>
        </div>
      </header>

      {!reviewMode ? (
        <form className="mt-4 space-y-4">
          <section className="rounded-2xl border border-sky-100 bg-white p-4">
            <h2 className="text-xl font-bold text-sky-950">A) Customer & Contact Details</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Full Name
                <input
                  value={form.fullName}
                  onChange={(event) => setField("fullName", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  required
                />
                {errors.fullName ? <span className="mt-1 block text-xs text-rose-600">{errors.fullName}</span> : null}
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setField("email", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  required
                />
                {errors.email ? <span className="mt-1 block text-xs text-rose-600">{errors.email}</span> : null}
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Phone Number
                <input
                  value={form.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  required
                />
                {errors.phone ? <span className="mt-1 block text-xs text-rose-600">{errors.phone}</span> : null}
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Preferred Contact Method
                <select
                  value={form.preferredContactMethod}
                  onChange={(event) => setField("preferredContactMethod", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  required
                >
                  <option value="">Select one</option>
                  {CONTACT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
                {errors.preferredContactMethod ? (
                  <span className="mt-1 block text-xs text-rose-600">{errors.preferredContactMethod}</span>
                ) : null}
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-sky-100 bg-white p-4">
            <h2 className="text-xl font-bold text-sky-950">B) Property Details</h2>
            {isSignedIn && properties.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-sm font-semibold text-sky-900">Use your saved properties</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                      propertyMode === "existing" ? "bg-sky-900 text-white" : "bg-white text-sky-900"
                    }`}
                    onClick={() => setPropertyMode("existing")}
                  >
                    Choose an existing property
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                      propertyMode === "new" ? "bg-sky-900 text-white" : "bg-white text-sky-900"
                    }`}
                    onClick={() => setPropertyMode("new")}
                  >
                    Add new property
                  </button>
                </div>
                {propertyMode === "existing" ? (
                  <label className="mt-3 block text-sm font-semibold text-slate-700">
                    Choose an existing property
                    <select
                      value={selectedPropertyId}
                      onChange={(event) => setSelectedPropertyId(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <option value="">Select property</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.address}
                        </option>
                      ))}
                    </select>
                    {errors.selectedPropertyId ? (
                      <span className="mt-1 block text-xs text-rose-600">{errors.selectedPropertyId}</span>
                    ) : null}
                  </label>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                Property Address
                <input
                  value={form.propertyAddress}
                  onChange={(event) => setField("propertyAddress", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  required
                />
                {errors.propertyAddress ? (
                  <span className="mt-1 block text-xs text-rose-600">{errors.propertyAddress}</span>
                ) : null}
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Parish/Area
                <input
                  list="parish-options"
                  value={form.parish}
                  onChange={(event) => setField("parish", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  required
                />
                <datalist id="parish-options">
                  {PARISH_OPTIONS.map((parish) => (
                    <option key={parish} value={parish} />
                  ))}
                </datalist>
                {errors.parish ? <span className="mt-1 block text-xs text-rose-600">{errors.parish}</span> : null}
              </label>
              <div className="text-sm font-semibold text-slate-700">
                Property Type
                <div className="mt-2 flex flex-wrap gap-2">
                  {PROPERTY_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setField("propertyType", type)}
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        form.propertyType === type
                          ? "border-sky-700 bg-sky-700 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {errors.propertyType ? <span className="mt-1 block text-xs text-rose-600">{errors.propertyType}</span> : null}
              </div>
              <div className="text-sm font-semibold text-slate-700 md:col-span-2">
                Your Role
                <div className="mt-2 flex flex-wrap gap-2">
                  {USER_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setField("yourRole", role)}
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        form.yourRole === role
                          ? "border-sky-700 bg-sky-700 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                {errors.yourRole ? <span className="mt-1 block text-xs text-rose-600">{errors.yourRole}</span> : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-sky-100 bg-white p-4">
            <h2 className="text-xl font-bold text-sky-950">C) Water Tank Details</h2>

            {isSignedIn && propertyMode === "existing" && filteredTanks.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-sm font-semibold text-sky-900">Use saved tanks for this property</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                      tankMode === "existing" ? "bg-sky-900 text-white" : "bg-white text-sky-900"
                    }`}
                    onClick={() => setTankMode("existing")}
                  >
                    Choose existing tank
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                      tankMode === "new" ? "bg-sky-900 text-white" : "bg-white text-sky-900"
                    }`}
                    onClick={() => {
                      setTankMode("new");
                      setSelectedTankId("");
                    }}
                  >
                    Add new tank
                  </button>
                </div>
                {tankMode === "existing" ? (
                  <label className="mt-3 block text-sm font-semibold text-slate-700">
                    Choose existing tank
                    <select
                      value={selectedTankId}
                      onChange={(event) => setSelectedTankId(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <option value="">Select tank</option>
                      {filteredTanks.map((tank, index) => (
                        <option key={tank.id} value={tank.id}>
                          Tank {index + 1} ({normalizeTankSize(tank.size_estimate)})
                        </option>
                      ))}
                    </select>
                    {errors.selectedTankId ? <span className="mt-1 block text-xs text-rose-600">{errors.selectedTankId}</span> : null}
                  </label>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Number of Tanks on Property
                <input
                  type="number"
                  min={1}
                  value={form.numberOfTanks}
                  onChange={(event) => setField("numberOfTanks", Number(event.target.value || 1))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  required
                />
                {errors.numberOfTanks ? <span className="mt-1 block text-xs text-rose-600">{errors.numberOfTanks}</span> : null}
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Approximate Tank Size
                <select
                  value={form.approximateTankSize}
                  onChange={(event) => setField("approximateTankSize", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  required
                >
                  <option value="">Select size</option>
                  {TANK_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                {errors.approximateTankSize ? (
                  <span className="mt-1 block text-xs text-rose-600">{errors.approximateTankSize}</span>
                ) : null}
              </label>
              <div className="text-sm font-semibold text-slate-700 md:col-span-2">
                When was the tank last cleaned?
                <div className="mt-2 flex flex-wrap gap-2">
                  {LAST_CLEANED_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setField("lastCleaned", option)}
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        form.lastCleaned === option
                          ? "border-sky-700 bg-sky-700 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {errors.lastCleaned ? <span className="mt-1 block text-xs text-rose-600">{errors.lastCleaned}</span> : null}
              </div>
              <div className="text-sm font-semibold text-slate-700 md:col-span-2">
                Condition/Problem Symptoms (optional)
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {PROBLEM_SYMPTOMS.map((symptom) => (
                    <label key={symptom} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.problemSymptoms.includes(symptom)}
                        onChange={() => toggleMultiValueField("problemSymptoms", symptom)}
                      />
                      <span>{symptom}</span>
                    </label>
                  ))}
                </div>
              </div>
              {form.problemSymptoms.includes("Other") ? (
                <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                  Other symptom
                  <input
                    value={form.problemOther}
                    onChange={(event) => setField("problemOther", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                  {errors.problemOther ? <span className="mt-1 block text-xs text-rose-600">{errors.problemOther}</span> : null}
                </label>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-sky-100 bg-white p-4">
            <h2 className="text-xl font-bold text-sky-950">D) Access & Safety Information</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Tank location
                <select
                  value={form.tankLocation}
                  onChange={(event) => setField("tankLocation", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  required
                >
                  <option value="">Select location</option>
                  {TANK_LOCATIONS.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
                {errors.tankLocation ? <span className="mt-1 block text-xs text-rose-600">{errors.tankLocation}</span> : null}
              </label>
              {form.tankLocation === "Other" ? (
                <label className="text-sm font-semibold text-slate-700">
                  Other tank location
                  <input
                    value={form.tankLocationOther}
                    onChange={(event) => setField("tankLocationOther", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                  {errors.tankLocationOther ? (
                    <span className="mt-1 block text-xs text-rose-600">{errors.tankLocationOther}</span>
                  ) : null}
                </label>
              ) : null}
              <div className="text-sm font-semibold text-slate-700 md:col-span-2">
                Is the tank easily accessible?
                {yesNoButtons(form.accessible, (value) => setField("accessible", value), "accessible")}
                {errors.accessible ? <span className="mt-1 block text-xs text-rose-600">{errors.accessible}</span> : null}
              </div>
              {form.accessible === "No" ? (
                <div className="text-sm font-semibold text-slate-700 md:col-span-2">
                  Access challenges
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {ACCESS_CHALLENGES.map((challenge) => (
                      <label key={challenge} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.accessChallenges.includes(challenge)}
                          onChange={() => toggleMultiValueField("accessChallenges", challenge)}
                        />
                        <span>{challenge}</span>
                      </label>
                    ))}
                  </div>
                  {errors.accessChallenges ? (
                    <span className="mt-1 block text-xs text-rose-600">{errors.accessChallenges}</span>
                  ) : null}
                </div>
              ) : null}
              {form.accessChallenges.includes("Other") ? (
                <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                  Other access challenge
                  <input
                    value={form.accessChallengesOther}
                    onChange={(event) => setField("accessChallengesOther", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                  {errors.accessChallengesOther ? (
                    <span className="mt-1 block text-xs text-rose-600">{errors.accessChallengesOther}</span>
                  ) : null}
                </label>
              ) : null}
              <div className="text-sm font-semibold text-slate-700 md:col-span-2">
                Are there animals on the property that may affect access?
                {yesNoButtons(form.animalsAffectAccess, (value) => setField("animalsAffectAccess", value), "animals")}
                {errors.animalsAffectAccess ? (
                  <span className="mt-1 block text-xs text-rose-600">{errors.animalsAffectAccess}</span>
                ) : null}
              </div>
              {form.animalsAffectAccess === "Yes" ? (
                <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                  Animal details/instructions
                  <textarea
                    value={form.animalDetails}
                    onChange={(event) => setField("animalDetails", event.target.value)}
                    className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                  {errors.animalDetails ? <span className="mt-1 block text-xs text-rose-600">{errors.animalDetails}</span> : null}
                </label>
              ) : null}
              <div className="text-sm font-semibold text-slate-700 md:col-span-2">
                Is someone required to be on site?
                {yesNoButtons(form.someoneOnSite, (value) => setField("someoneOnSite", value), "on-site")}
                {errors.someoneOnSite ? <span className="mt-1 block text-xs text-rose-600">{errors.someoneOnSite}</span> : null}
              </div>
              {form.someoneOnSite === "Yes" ? (
                <>
                  <label className="text-sm font-semibold text-slate-700">
                    On-site contact name
                    <input
                      value={form.onsiteContactName}
                      onChange={(event) => setField("onsiteContactName", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                    />
                    {errors.onsiteContactName ? (
                      <span className="mt-1 block text-xs text-rose-600">{errors.onsiteContactName}</span>
                    ) : null}
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    On-site contact phone
                    <input
                      value={form.onsiteContactPhone}
                      onChange={(event) => setField("onsiteContactPhone", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                    />
                    {errors.onsiteContactPhone ? (
                      <span className="mt-1 block text-xs text-rose-600">{errors.onsiteContactPhone}</span>
                    ) : null}
                  </label>
                </>
              ) : null}
              <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                Access notes (optional)
                <textarea
                  value={form.accessNotes}
                  onChange={(event) => setField("accessNotes", event.target.value)}
                  className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2"
                  placeholder="Gate codes, entry details, preferred side access, etc."
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-sky-100 bg-white p-4">
            <h2 className="text-xl font-bold text-sky-950">E) Service Type Selection</h2>
            <div className="mt-4 grid gap-2">
              {SERVICE_TYPES.map((service) => (
                <button
                  key={service}
                  type="button"
                  onClick={() => setField("serviceType", service)}
                  className={`rounded-xl border px-4 py-2 text-left text-sm font-semibold ${
                    form.serviceType === service
                      ? "border-sky-700 bg-sky-700 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {service}
                </button>
              ))}
            </div>
            {errors.serviceType ? <span className="mt-1 block text-xs text-rose-600">{errors.serviceType}</span> : null}
            {form.serviceType === "Emergency service" ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Urgency level
                  <select
                    value={form.urgencyLevel}
                    onChange={(event) => setField("urgencyLevel", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <option value="">Select urgency</option>
                    {URGENCY_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                  {errors.urgencyLevel ? <span className="mt-1 block text-xs text-rose-600">{errors.urgencyLevel}</span> : null}
                </label>
                <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                  Brief description
                  <textarea
                    value={form.emergencyDescription}
                    onChange={(event) => setField("emergencyDescription", event.target.value)}
                    className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                  {errors.emergencyDescription ? (
                    <span className="mt-1 block text-xs text-rose-600">{errors.emergencyDescription}</span>
                  ) : null}
                </label>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-sky-100 bg-white p-4">
            <h2 className="text-xl font-bold text-sky-950">F) Scheduling Preferences</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Preferred date
                <input
                  type="date"
                  value={form.preferredDate}
                  onChange={(event) => setField("preferredDate", event.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  required
                />
                {errors.preferredDate ? <span className="mt-1 block text-xs text-rose-600">{errors.preferredDate}</span> : null}
              </label>
              <div className="text-sm font-semibold text-slate-700">
                Preferred time window
                <div className="mt-2 flex flex-wrap gap-2">
                  {TIME_WINDOWS.map((window) => (
                    <button
                      key={window}
                      type="button"
                      onClick={() => setField("preferredTimeWindow", window)}
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        form.preferredTimeWindow === window
                          ? "border-sky-700 bg-sky-700 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {window}
                    </button>
                  ))}
                </div>
                {errors.preferredTimeWindow ? (
                  <span className="mt-1 block text-xs text-rose-600">{errors.preferredTimeWindow}</span>
                ) : null}
              </div>
              <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                Additional scheduling notes (optional)
                <textarea
                  value={form.schedulingNotes}
                  onChange={(event) => setField("schedulingNotes", event.target.value)}
                  className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-sky-100 bg-white p-4">
            <h2 className="text-xl font-bold text-sky-950">G) Compliance & Report Needs</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="text-sm font-semibold text-slate-700">
                Is this booking for routine compliance/maintenance?
                {yesNoButtons(form.routineCompliance, (value) => setField("routineCompliance", value), "routine-compliance")}
              </div>
              <div className="text-sm font-semibold text-slate-700">
                Do you require a cleaning certificate/report?
                {yesNoButtons(form.needsCertificate, (value) => setField("needsCertificate", value), "certificate")}
              </div>
              <div className="text-sm font-semibold text-slate-700">
                Are you interested in reminders for future cleaning?
                {yesNoButtons(form.interestedInReminders, (value) => setField("interestedInReminders", value), "reminders")}
              </div>
              <div className="text-sm font-semibold text-slate-700">
                Are you interested in a Tank Tech maintenance plan?
                {yesNoButtons(form.interestedInPlan, (value) => setField("interestedInPlan", value), "maintenance-plan")}
              </div>
            </div>

            {form.yourRole === "Property Manager" ? (
              <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <div className="text-sm font-semibold text-slate-700">
                  Do you manage multiple properties?
                  {yesNoButtons(
                    form.managesMultipleProperties,
                    (value) => setField("managesMultipleProperties", value),
                    "multiple-properties",
                  )}
                  {errors.managesMultipleProperties ? (
                    <span className="mt-1 block text-xs text-rose-600">{errors.managesMultipleProperties}</span>
                  ) : null}
                </div>
                {form.managesMultipleProperties === "Yes" ? (
                  <label className="mt-3 block text-sm font-semibold text-slate-700">
                    Approx. number of properties
                    <input
                      type="number"
                      min={1}
                      value={form.approxPropertyCount}
                      onChange={(event) => setField("approxPropertyCount", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                    />
                    {errors.approxPropertyCount ? (
                      <span className="mt-1 block text-xs text-rose-600">{errors.approxPropertyCount}</span>
                    ) : null}
                  </label>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-sky-100 bg-white p-4">
            <h2 className="text-xl font-bold text-sky-950">H) Consent & Acknowledgements</h2>
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.consentAccuracy}
                onChange={(event) => setField("consentAccuracy", event.target.checked)}
                className="mt-0.5"
              />
              <span>I confirm the information provided is accurate.</span>
            </label>
            {errors.consentAccuracy ? <span className="mt-1 block text-xs text-rose-600">{errors.consentAccuracy}</span> : null}
          </section>

          {errors.authentication ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {errors.authentication} <Link href="/login?returnTo=/bookings/new" className="font-semibold underline">Sign in now</Link>.
            </div>
          ) : null}

          {message ? <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onReviewBooking}
              className="rounded-xl bg-sky-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800"
            >
              Review booking
            </button>
          </div>
        </form>
      ) : (
        <section className="mt-4 rounded-2xl border border-sky-100 bg-white p-4">
          <h2 className="text-2xl font-bold text-sky-950">Review your booking details</h2>
          <p className="mt-2 text-sm text-slate-600">
            Please confirm everything below before submitting.
          </p>

          <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="font-bold text-sky-950">Contact</h3>
              <p className="mt-2 text-slate-700">{form.fullName}</p>
              <p className="text-slate-700">{form.email}</p>
              <p className="text-slate-700">{form.phone}</p>
              <p className="text-slate-700">Preferred contact: {form.preferredContactMethod}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="font-bold text-sky-950">Property</h3>
              <p className="mt-2 text-slate-700">{form.propertyAddress}</p>
              <p className="text-slate-700">{form.parish}</p>
              <p className="text-slate-700">{form.propertyType}</p>
              <p className="text-slate-700">Role: {form.yourRole}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
              <h3 className="font-bold text-sky-950">Tank & Service</h3>
              <p className="mt-2 text-slate-700">
                {form.numberOfTanks} tank(s), size {form.approximateTankSize}, last cleaned {form.lastCleaned}
              </p>
              <p className="text-slate-700">Service: {form.serviceType}</p>
              {form.serviceType === "Emergency service" ? (
                <p className="text-slate-700">
                  Urgency: {form.urgencyLevel} | Details: {form.emergencyDescription}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
              <h3 className="font-bold text-sky-950">Access & Scheduling</h3>
              <p className="mt-2 text-slate-700">
                Location: {form.tankLocation}
                {form.tankLocation === "Other" ? ` (${form.tankLocationOther})` : ""}
              </p>
              <p className="text-slate-700">Accessible: {form.accessible}</p>
              <p className="text-slate-700">
                Preferred slot: {form.preferredDate} ({form.preferredTimeWindow})
              </p>
              {form.schedulingNotes ? <p className="text-slate-700">Notes: {form.schedulingNotes}</p> : null}
            </div>
          </div>

          {message ? <p className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setReviewMode(false)}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700"
            >
              Back to edit
            </button>
            <button
              type="button"
              onClick={() => void submitBooking()}
              disabled={isSubmitting}
              className="rounded-xl bg-sky-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Submitting..." : "Submit booking request"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
