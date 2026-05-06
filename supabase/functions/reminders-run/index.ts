import { addDays, formatISO } from "https://esm.sh/date-fns@4.1.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.10";

const dueSoonTemplate = "tanktech_reminder_due_soon";
const overdueTemplate = "tanktech_reminder_overdue";
const autoRecommendBookings = Deno.env.get("AUTO_RECOMMENDED_BOOKINGS") === "true";

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: subs, error } = await admin
    .from("subscriptions")
    .select(
      "id, owner_id, next_due_date, status, service_plans(reminder_days_before), properties(address), profiles!subscriptions_owner_id_fkey(email,full_name)",
    )
    .eq("status", "active");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const edgeInvoker = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const today = new Date();
  let dueSoonCount = 0;
  let overdueCount = 0;

  for (const sub of subs ?? []) {
    if (!sub.next_due_date) {
      continue;
    }

    const dueDate = new Date(sub.next_due_date);
    const servicePlan = Array.isArray(sub.service_plans) ? sub.service_plans[0] : sub.service_plans;
    const property = Array.isArray(sub.properties) ? sub.properties[0] : sub.properties;
    const daysBefore = servicePlan?.reminder_days_before ?? [90, 30, 7];
    const profile = sub.profiles as { email?: string; full_name?: string } | null;

    if (!profile?.email) {
      continue;
    }

    for (const day of daysBefore) {
      const reminderDate = addDays(dueDate, -day);
      if (formatISO(reminderDate, { representation: "date" }) === formatISO(today, { representation: "date" })) {
        await edgeInvoker.functions.invoke("send-email", {
          body: {
            to: profile.email,
            template: dueSoonTemplate,
            dynamicData: {
              subject: `Tank Tech reminder: service due in ${day} days`,
              customerName: profile.full_name,
              propertyAddress: property?.address,
              dueDate: sub.next_due_date,
            },
            subscriptionId: sub.id,
          },
        });
        dueSoonCount += 1;

        if (autoRecommendBookings && day <= 30) {
          await admin.from("bookings").insert({
            owner_id: sub.owner_id,
            org_id: (sub as { org_id?: string | null }).org_id ?? null,
            property_id: (sub as { property_id?: string }).property_id,
            tank_id: (sub as { tank_id?: string }).tank_id,
            subscription_id: sub.id,
            requested_window_start: new Date().toISOString(),
            requested_window_end: addDays(new Date(), 7).toISOString(),
            status: "requested",
            notes: "Auto-generated recommended booking from reminders-run",
          });
        }
      }
    }

    if (dueDate < today) {
      await edgeInvoker.functions.invoke("send-email", {
        body: {
          to: profile.email,
          template: overdueTemplate,
          dynamicData: {
            subject: "Tank Tech reminder: service overdue",
            customerName: profile.full_name,
            propertyAddress: property?.address,
            dueDate: sub.next_due_date,
          },
          subscriptionId: sub.id,
        },
      });
      overdueCount += 1;
    }
  }

  return new Response(JSON.stringify({ ok: true, dueSoonCount, overdueCount }), {
    headers: { "Content-Type": "application/json" },
  });
});
