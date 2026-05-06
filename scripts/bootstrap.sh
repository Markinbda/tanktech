#!/usr/bin/env bash
set -euo pipefail

echo "[Tank Tech] Installing dependencies..."
npm install

echo "[Tank Tech] Starting Supabase local stack..."
supabase start

echo "[Tank Tech] Applying migrations + seed..."
supabase db reset

echo "[Tank Tech] Done."
echo "Run in separate terminals:"
echo "  npm run dev:public"
echo "  npm run expose"
echo "  supabase functions serve send-email"
echo "  supabase functions serve reminders-run"
echo "  supabase functions serve generate-certificate"
