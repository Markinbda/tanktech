import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.10";

function renderCertificateHtml(data: {
  certificateNumber: string;
  propertyAddress: string;
  customerName: string;
  completedAt: string;
  technicianName: string;
  summary: string;
}) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; background: #eff6ff; padding: 40px; color: #0f172a;">
        <div style="max-width: 720px; margin: 0 auto; background: white; border: 1px solid #bae6fd; border-radius: 24px; padding: 40px;">
          <p style="font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #0369a1;">Tank Tech</p>
          <h1 style="font-size: 34px; margin: 8px 0 16px;">Cleaning Certificate</h1>
          <p>This certifies that the water tank at <strong>${data.propertyAddress}</strong> was serviced by Tank Tech.</p>
          <table style="width: 100%; margin-top: 24px; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #475569;">Certificate No.</td><td style="padding: 8px 0; font-weight: 700;">${data.certificateNumber}</td></tr>
            <tr><td style="padding: 8px 0; color: #475569;">Customer</td><td style="padding: 8px 0; font-weight: 700;">${data.customerName}</td></tr>
            <tr><td style="padding: 8px 0; color: #475569;">Completion Date</td><td style="padding: 8px 0; font-weight: 700;">${data.completedAt}</td></tr>
            <tr><td style="padding: 8px 0; color: #475569;">Technician</td><td style="padding: 8px 0; font-weight: 700;">${data.technicianName}</td></tr>
          </table>
          <div style="margin-top: 24px; padding: 20px; background: #f8fafc; border-radius: 16px;">
            <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; color: #0369a1;">Service Summary</p>
            <p style="margin: 8px 0 0; line-height: 1.7;">${data.summary}</p>
          </div>
          <p style="margin-top: 32px; font-size: 13px; color: #64748b;">Tank Tech - Bermuda Water Tank Cleaning</p>
        </div>
      </body>
    </html>
  `;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { bookingId } = await request.json();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRole || !bookingId) {
    return new Response(JSON.stringify({ error: "Missing configuration or bookingId" }), { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: booking, error } = await admin
    .from("bookings")
    .select("id, property_id, tank_id, scheduled_end, properties(address), profiles!bookings_owner_id_fkey(full_name,email), job_reports(summary), technician:profiles!bookings_technician_id_fkey(full_name)")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return new Response(JSON.stringify({ error: error?.message ?? "Booking not found" }), { status: 404 });
  }

  const owner = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
  const property = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties;
  const report = Array.isArray(booking.job_reports) ? booking.job_reports[0] : booking.job_reports;
  const technician = Array.isArray(booking.technician) ? booking.technician[0] : booking.technician;
  const certificateNumber = `TT-${booking.id.slice(0, 8).toUpperCase()}`;
  const html = renderCertificateHtml({
    certificateNumber,
    propertyAddress: property?.address ?? "Unknown property",
    customerName: owner?.full_name ?? owner?.email ?? "Customer",
    completedAt: booking.scheduled_end ?? new Date().toISOString(),
    technicianName: technician?.full_name ?? "Tank Tech Technician",
    summary: report?.summary ?? "Tank cleaning completed successfully.",
  });

  const storagePath = `${booking.property_id}/${booking.id}.html`;
  const upload = await admin.storage
    .from("tank-tech-certificates")
    .upload(storagePath, new TextEncoder().encode(html), {
      contentType: "text/html",
      upsert: true,
    });

  if (upload.error) {
    return new Response(JSON.stringify({ error: upload.error.message }), { status: 500 });
  }

  await admin.from("certificates").upsert({
    booking_id: booking.id,
    property_id: booking.property_id,
    tank_id: booking.tank_id,
    storage_path: storagePath,
    issued_to_email: owner?.email ?? null,
    issued_at: new Date().toISOString(),
  });

  const { data: signed } = await admin.storage.from("tank-tech-certificates").createSignedUrl(storagePath, 60 * 60 * 24 * 30);

  if (owner?.email && signed?.signedUrl) {
    await admin.functions.invoke("send-email", {
      body: {
        to: owner.email,
        template: "tanktech_job_completed_certificate_ready",
        bookingId: booking.id,
        dynamicData: {
          subject: "Tank Tech cleaning certificate ready",
          certificateUrl: signed.signedUrl,
          propertyAddress: property?.address,
        },
      },
    });
  }

  return new Response(JSON.stringify({ ok: true, storagePath, certificateUrl: signed?.signedUrl ?? null }), {
    headers: { "Content-Type": "application/json" },
  });
});
