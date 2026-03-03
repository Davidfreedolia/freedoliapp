import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logOpsEvent } from "../_shared/opsEvents.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function handler(_req: Request): Promise<Response> {
  const startedAt = Date.now();
  try {
    await logOpsEvent({
      org_id: null,
      source: "worker",
      event_type: "HEALTH_RUN_STARTED",
      severity: "info",
      entity_type: "ops_health",
      entity_id: null,
      message: "Ops health checks run started",
    });

    const { error } = await supabaseAdmin.rpc("run_ops_health_checks");
    if (error) {
      throw error;
    }

    const durationMs = Date.now() - startedAt;

    await logOpsEvent({
      org_id: null,
      source: "worker",
      event_type: "HEALTH_RUN_DONE",
      severity: "info",
      entity_type: "ops_health",
      entity_id: null,
      message: "Ops health checks run completed",
      meta: {
        duration_ms: durationMs,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        duration_ms: durationMs,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = (err as any)?.message || "unknown_error";
    console.error("ops-health-runner error", err);

    await logOpsEvent({
      org_id: null,
      source: "worker",
      event_type: "HEALTH_RUN_FAILED",
      severity: "error",
      entity_type: "ops_health",
      entity_id: null,
      message: "Ops health checks run failed",
      meta: {
        error: message,
      },
    });

    return new Response(
      JSON.stringify({
        ok: false,
        error: message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

Deno.serve(handler);

