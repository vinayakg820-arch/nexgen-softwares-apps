// Shubh Laxmi Billing: deletes shared bill PDFs older than 1 year (the bill itself stays in the software).
// Runs daily from pg_cron (job "billing-pdf-cleanup", 03:00 IST). Safe to call by anyone: it only removes files that have already expired.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  let removed = 0;
  for (let round = 0; round < 10; round++) {
    const { data, error } = await sb.rpc('billing_pdfs_expired', { p_limit: 500 });
    if (error) return Response.json({ ok: false, error: error.message, removed }, { status: 500 });
    const names = (data || []) as string[];
    if (!names.length) break;
    for (let i = 0; i < names.length; i += 100) {
      const { error: e } = await sb.storage.from('billing-pdfs').remove(names.slice(i, i + 100));
      if (e) return Response.json({ ok: false, error: e.message, removed }, { status: 500 });
      removed += Math.min(100, names.length - i);
    }
    if (names.length < 500) break;
  }
  return Response.json({ ok: true, removed });
});
