import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logOpsEvent } from "../_shared/opsEvents.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const MAX_JOBS_PER_RUN = 5;

async function fetchQueuedJobs() {
  const { data, error } = await supabaseAdmin
    .from("quarterly_export_jobs")
    .select("id")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(MAX_JOBS_PER_RUN);
  if (error) throw error;
  return (data || []) as { id: string }[];
}

async function markJobFailed(id: string, message: string) {
  const { error } = await supabaseAdmin
    .from("quarterly_export_jobs")
    .update({
      status: "failed",
      error: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.error("Failed to mark job failed", id, error);
  }
}

async function processJob(id: string) {
  try {
    const url = `${SUPABASE_URL}/functions/v1/generate-quarter-pack?job_id=${encodeURIComponent(id)}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
    });
    if (!resp.ok) {
      const text = await resp.text();
      await markJobFailed(id, `generate-quarter-pack failed: ${resp.status} ${text}`);
    }
  } catch (err) {
    console.error("Error processing quarter pack job", id, err);
    await markJobFailed(id, (err as any)?.message || "worker_error");
  }
}

async function handler(_req: Request): Promise<Response> {
  try {
    const jobs = await fetchQueuedJobs();

    await logOpsEvent({
      org_id: null,
      source: "worker",
      event_type: "WORKER_TICK",
      severity: "info",
      entity_type: "quarterly_export_job",
      entity_id: null,
      message: "Quarter pack worker tick",
      meta: {
        queued_found: jobs.length,
        batch_size: MAX_JOBS_PER_RUN,
      },
    });

    let failed = 0;
    for (const job of jobs) {
      try {
        await processJob(job.id);
      } catch {
        failed += 1;
      }
    }

    await logOpsEvent({
      org_id: null,
      source: "worker",
      event_type: "WORKER_BATCH_DONE",
      severity: "info",
      entity_type: "quarterly_export_job",
      entity_id: null,
      message: "Quarter pack worker batch completed",
      meta: {
        processed: jobs.length,
        failed,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        processed: jobs.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("quarter-pack-worker error", err);
    await logOpsEvent({
      org_id: null,
      source: "worker",
      event_type: "WORKER_BATCH_FAILED",
      severity: "error",
      entity_type: "quarterly_export_job",
      entity_id: null,
      message: "Quarter pack worker batch failed",
      meta: {
        error: (err as any)?.message || "unknown_error",
      },
    });
    return new Response(
      JSON.stringify({
        ok: false,
        error: (err as any)?.message || "unknown_error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

Deno.serve(handler);

