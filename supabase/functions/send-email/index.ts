import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.10";

const SENDGRID_ENDPOINT = "https://api.sendgrid.com/v3/mail/send";
const FROM_EMAIL = "Tank Tech <noreply@YOURDOMAIN>";

type Payload = {
  to: string;
  template: string;
  dynamicData?: Record<string, unknown>;
  bookingId?: string;
  subscriptionId?: string;
};

function renderHtml(template: string, dynamicData: Record<string, unknown>) {
  const subject = String(dynamicData.subject ?? "Tank Tech Notification");
  const propertyAddress = String(dynamicData.propertyAddress ?? "your property");
  const dueDate = String(dynamicData.dueDate ?? "soon");
  const inviteUrl = String(dynamicData.inviteUrl ?? "");
  const certificateUrl = String(dynamicData.certificateUrl ?? "");

  const bodyMap: Record<string, string> = {
    tanktech_booking_received: `<p>Your cleaning request for <strong>${propertyAddress}</strong> has been received by Tank Tech.</p>`,
    tanktech_booking_confirmed: `<p>Your Tank Tech booking at <strong>${propertyAddress}</strong> has been confirmed.</p>`,
    tanktech_reminder_due_soon: `<p>Your next Tank Tech service for <strong>${propertyAddress}</strong> is due on <strong>${dueDate}</strong>.</p>`,
    tanktech_reminder_overdue: `<p>Your Tank Tech service for <strong>${propertyAddress}</strong> is overdue. Recorded due date: <strong>${dueDate}</strong>.</p>`,
    tanktech_job_completed_certificate_ready: `<p>Your Tank Tech cleaning certificate is ready.</p><p><a href="${certificateUrl}">Download certificate</a></p>`,
    tanktech_team_invite: `<p>You have been invited to join a Tank Tech organization.</p><p><a href="${inviteUrl}">Accept invite</a></p>`,
  };

  return `
    <div style="font-family: Arial, sans-serif; background: #eff6ff; padding: 32px; color: #0f172a;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #bae6fd; padding: 32px;">
        <p style="font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; color: #0369a1;">Tank Tech</p>
        <h1 style="margin: 8px 0 16px; font-size: 28px;">${subject}</h1>
        ${bodyMap[template] ?? `<pre>${JSON.stringify(dynamicData, null, 2)}</pre>`}
        <p style="margin-top: 24px; font-size: 13px; color: #64748b;">Tank Tech - Bermuda Water Tank Cleaning</p>
      </div>
    </div>
  `;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = (await request.json()) as Payload;
  if (!body.to || !body.template) {
    return new Response(JSON.stringify({ error: "Missing to/template" }), { status: 400 });
  }

  const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!sendgridApiKey || !supabaseUrl || !serviceRole) {
    return new Response(JSON.stringify({ error: "Missing required environment variables" }), {
      status: 500,
    });
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const dynamicData = body.dynamicData ?? {};
  const subject = dynamicData.subject ?? `Tank Tech Notification: ${body.template}`;

  const response = await fetch(SENDGRID_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendgridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: body.to }],
          dynamic_template_data: {
            ...dynamicData,
            brand: "Tank Tech",
            footer: "Tank Tech - Bermuda Water Tank Cleaning",
          },
          subject,
        },
      ],
      from: { email: "noreply@YOURDOMAIN", name: "Tank Tech" },
      content: [{ type: "text/html", value: renderHtml(body.template, dynamicData) }],
    }),
  });

  const status = response.ok ? "sent" : `failed:${response.status}`;

  await supabase.from("email_log").insert({
    booking_id: body.bookingId ?? null,
    subscription_id: body.subscriptionId ?? null,
    to_email: body.to,
    template: body.template,
    status,
  });

  if (!response.ok) {
    const message = await response.text();
    return new Response(JSON.stringify({ error: message }), { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true, from: FROM_EMAIL }), {
    headers: { "Content-Type": "application/json" },
  });
});
