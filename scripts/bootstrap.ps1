$ErrorActionPreference = "Stop"

Write-Host "[Tank Tech] Installing dependencies..."
npm install

Write-Host "[Tank Tech] Starting Supabase local stack..."
supabase start

Write-Host "[Tank Tech] Applying migrations + seed..."
supabase db reset

Write-Host "[Tank Tech] Done."
Write-Host "Run in separate terminals:"
Write-Host "  npm run dev:public"
Write-Host "  npm run expose"
Write-Host "  supabase functions serve send-email"
Write-Host "  supabase functions serve reminders-run"
Write-Host "  supabase functions serve generate-certificate"
