type CertificateInput = {
  certificateNumber: string;
  propertyAddress: string;
  customerName: string;
  completedAt: string;
  technicianName: string;
  summary: string;
};

export function renderCertificateHtml(input: CertificateInput) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; background: #eff6ff; padding: 40px; color: #0f172a;">
        <div style="max-width: 720px; margin: 0 auto; background: white; border: 1px solid #bae6fd; border-radius: 24px; padding: 40px;">
          <p style="font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #0369a1;">Tank Tech</p>
          <h1 style="font-size: 34px; margin: 8px 0 16px;">Cleaning Certificate</h1>
          <p>This certifies that the water tank at <strong>${input.propertyAddress}</strong> was serviced by Tank Tech.</p>
          <table style="width: 100%; margin-top: 24px; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #475569;">Certificate No.</td><td style="padding: 8px 0; font-weight: 700;">${input.certificateNumber}</td></tr>
            <tr><td style="padding: 8px 0; color: #475569;">Customer</td><td style="padding: 8px 0; font-weight: 700;">${input.customerName}</td></tr>
            <tr><td style="padding: 8px 0; color: #475569;">Completion Date</td><td style="padding: 8px 0; font-weight: 700;">${input.completedAt}</td></tr>
            <tr><td style="padding: 8px 0; color: #475569;">Technician</td><td style="padding: 8px 0; font-weight: 700;">${input.technicianName}</td></tr>
          </table>
          <div style="margin-top: 24px; padding: 20px; background: #f8fafc; border-radius: 16px;">
            <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; color: #0369a1;">Service Summary</p>
            <p style="margin: 8px 0 0; line-height: 1.7;">${input.summary}</p>
          </div>
          <p style="margin-top: 32px; font-size: 13px; color: #64748b;">Tank Tech - Bermuda Water Tank Cleaning</p>
        </div>
      </body>
    </html>
  `;
}
