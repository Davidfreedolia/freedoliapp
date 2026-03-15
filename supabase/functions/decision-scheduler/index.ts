/**
 * D34.1 — Decision Scheduler. Runs syncReorderDecisions for all active orgs.
 * Trigger: cron every 10 minutes. Lock: advisory lock. Auth: x-scheduler-secret.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { syncReorderDecisions } from "../_shared/decisionSchedulerSync.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DECISION_SCHEDULER_SECRET = Deno.env.get("DECISION_SCHEDULER_SECRET") ?? "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

Deno.serve(async (req: Request): Promise<Response> => {
  const log = (event: string, meta?: Record<string, unknown>) => {
    console.log(JSON.stringify({ event, ...meta, ts: new Date().toISOString() }));
  };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const secret = req.headers.get("x-scheduler-secret") ?? "";
  if (!DECISION_SCHEDULER_SECRET || secret !== DECISION_SCHEDULER_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let lockAcquired = false;
  try {
    const { data: locked } = await supabaseAdmin.rpc("decision_scheduler_try_lock");
    if (locked === false) {
      log("scheduler_skipped_locked");
      return new Response(
        JSON.stringify({ status: "skipped_locked" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    lockAcquired = true;

    log("scheduler_start");

    // S3.3.M: same billing-access semantics as RLS (org_billing_allows_access: prefer org_billing.status, fallback orgs.billing_status)
    const { data: orgIds, error: orgError } = await supabaseAdmin.rpc("get_org_ids_billing_allows_access");

    if (orgError) {
      log("scheduler_error", { error: orgError.message });
      return new Response(
        JSON.stringify({ ok: false, error: orgError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const orgList = ((orgIds as string[] | null) || []).map((id) => ({ id }));
    let totalCreated = 0;
    const errors: string[] = [];

    for (const row of orgList) {
      const orgId = row.id;
      try {
        const result = await syncReorderDecisions(supabaseAdmin, orgId);
        totalCreated += result.created;
        log("org_processed", {
          org_id: orgId,
          scanned: result.scanned,
          created: result.created,
          skipped: result.skipped,
          ok: result.ok,
        });
        if (result.errors.length) {
          for (const err of result.errors) {
            errors.push(`${orgId}: ${err}`);
            log("org_error", { org_id: orgId, error: err });
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${orgId}: ${msg}`);
        log("org_error", { org_id: orgId, error: msg });
      }
    }

    log("scheduler_complete", {
      orgs_processed: orgList.length,
      total_created: totalCreated,
      errors_count: errors.length,
    });

    return new Response(
      JSON.stringify({
        ok: errors.length === 0,
        orgs_processed: orgList.length,
        total_created: totalCreated,
        errors: errors.slice(0, 50),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    if (lockAcquired) {
      await supabaseAdmin.rpc("decision_scheduler_unlock");
    }
  }
});
