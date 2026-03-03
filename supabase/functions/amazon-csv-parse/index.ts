import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Papa from "https://esm.sh/papaparse@5.4.1";
import { logOpsEvent } from "../_shared/opsEvents.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type AmazonImportJob = {
  id: string;
  org_id: string;
  file_name: string;
  created_by: string;
};

function createUserClient(userJwt: string) {
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
  });
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

function getRowValue(row: Record<string, string>, ...keys: string[]): string | null {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    lower[normalizeHeader(k)] = v;
  }
  for (const key of keys) {
    const n = normalizeHeader(key);
    if (lower[n] !== undefined && lower[n] !== "") return String(lower[n]).trim();
  }
  return null;
}

function parseDate(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseAmount(s: string | null): number | null {
  if (s === null || s === "") return null;
  const n = parseFloat(String(s).replace(/,/g, ""));
  if (Number.isFinite(n)) return n;
  return null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  const userJwt = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!userJwt) {
    return new Response(
      JSON.stringify({ error: "Authorization required (Bearer token)" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: { job_id?: string; csv_text?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const jobId = body.job_id;
  const csvText = body.csv_text;
  if (!jobId || typeof csvText !== "string") {
    return new Response(
      JSON.stringify({ error: "job_id and csv_text required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const userClient = createUserClient(userJwt);

  let orgId: string;
  try {
    const { data: job, error: jobErr } = await supabaseAdmin
      .from("amazon_import_jobs")
      .select("id, org_id, file_name, created_by")
      .eq("id", jobId)
      .maybeSingle();

    if (jobErr || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found or access denied" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    orgId = (job as AmazonImportJob).org_id;

    const { error: startErr } = await userClient.rpc("start_amazon_import", {
      p_job_id: jobId,
    });
    if (startErr) {
      return new Response(
        JSON.stringify({ error: startErr.message }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    await logOpsEvent({
      org_id: orgId,
      source: "edge",
      event_type: "IMPORT_STARTED",
      severity: "info",
      entity_type: "amazon_import_job",
      entity_id: jobId,
      message: "Amazon CSV import started",
      meta: { job_id: jobId },
    });
  } catch (e) {
    console.error("start_amazon_import or log", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let totalRows = 0;
  let parsedRows = 0;
  const events: Array<{
    job_id: string;
    org_id: string;
    settlement_id: string | null;
    transaction_id: string | null;
    event_type: string;
    event_date: string;
    amount: number;
    currency: string;
    reference: string | null;
    meta: Record<string, unknown> | null;
  }> = [];

  try {
    const parseResult = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    const rows = parseResult.data || [];
    totalRows = rows.length;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;
      const rawData = { ...row } as Record<string, unknown>;
      const uniqueKey = `${jobId}:${rowNumber}`;

      const { error: rawErr } = await supabaseAdmin.from("amazon_raw_rows").insert({
        job_id: jobId,
        org_id: orgId,
        row_number: rowNumber,
        raw_data: rawData,
        unique_key: uniqueKey,
      });
      if (rawErr) {
        console.warn("amazon_raw_rows insert skip duplicate or error", rawErr);
      }

      const settlementId = getRowValue(row, "settlement_id", "settlement-id", "settlement id");
      const transactionId = getRowValue(row, "transaction_id", "transaction-id", "transaction id");
      const eventDateStr = getRowValue(row, "event_date", "date", "transaction_date");
      const amountVal = getRowValue(row, "amount");
      const currencyVal = getRowValue(row, "currency");
      const eventTypeVal = getRowValue(row, "event_type", "type", "transaction_type");

      const eventDate = parseDate(eventDateStr);
      const amount = parseAmount(amountVal);
      if (eventDate && amount !== null && currencyVal) {
        parsedRows += 1;
        const sid = settlementId || `${jobId}_r${rowNumber}`;
        const tid = transactionId || `${jobId}_r${rowNumber}`;
        events.push({
          job_id: jobId,
          org_id: orgId,
          settlement_id: sid,
          transaction_id: tid,
          event_type: eventTypeVal || "unknown",
          event_date,
          amount,
          currency: currencyVal,
          reference: getRowValue(row, "reference", "description") || null,
          meta: Object.keys(row).length > 6 ? (row as unknown as Record<string, unknown>) : null,
        });
      }
    }

    if (events.length > 0) {
      const { error: eventsErr } = await supabaseAdmin
        .from("amazon_financial_events")
        .upsert(events, {
          onConflict: "org_id,settlement_id,transaction_id,event_type",
          ignoreDuplicates: true,
        });
      if (eventsErr) {
        const errMsg = eventsErr.message;
        await supabaseAdmin
          .from("amazon_import_jobs")
          .update({
            status: "failed",
            error: errMsg.slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
        await logOpsEvent({
          org_id: orgId,
          source: "edge",
          event_type: "IMPORT_FAILED",
          severity: "error",
          entity_type: "amazon_import_job",
          entity_id: jobId,
          message: "Amazon import failed",
          meta: { error: errMsg, job_id: jobId },
        });
        return new Response(
          JSON.stringify({ error: errMsg }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    const { error: finalizeErr } = await supabaseAdmin.rpc("finalize_amazon_parse", {
      p_job_id: jobId,
      p_total_rows: totalRows,
      p_parsed_rows: parsedRows,
    });
    if (finalizeErr) {
      throw finalizeErr;
    }

    await logOpsEvent({
      org_id: orgId,
      source: "edge",
      event_type: "IMPORT_PARSED",
      severity: "info",
      entity_type: "amazon_import_job",
      entity_id: jobId,
      message: "Amazon CSV parsed",
      meta: { job_id: jobId, total_rows: totalRows, parsed_rows: parsedRows },
    });

    const { data: postData, error: postErr } = await userClient.rpc("post_amazon_job_to_ledger", {
      p_job_id: jobId,
    });
    if (postErr) {
      await logOpsEvent({
        org_id: orgId,
        source: "edge",
        event_type: "IMPORT_FAILED",
        severity: "error",
        entity_type: "amazon_import_job",
        entity_id: jobId,
        message: "Amazon post to ledger failed",
        meta: { error: postErr.message, job_id: jobId },
      });
      return new Response(
        JSON.stringify({ error: postErr.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const postedCount = Array.isArray(postData) && postData[0] != null
      ? (postData[0] as { posted_count: number }).posted_count
      : 0;

    await logOpsEvent({
      org_id: orgId,
      source: "edge",
      event_type: "IMPORT_DONE",
      severity: "info",
      entity_type: "amazon_import_job",
      entity_id: jobId,
      message: "Amazon import done",
      meta: { job_id: jobId, posted_count: postedCount },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        job_id: jobId,
        total_rows: totalRows,
        parsed_rows: parsedRows,
        posted_count: postedCount,
        status: "done",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    const errMsg = (e as Error).message;
    console.error("amazon-csv-parse error", e);
    await supabaseAdmin
      .from("amazon_import_jobs")
      .update({
        status: "failed",
        error: errMsg.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    await logOpsEvent({
      org_id: orgId,
      source: "edge",
      event_type: "IMPORT_FAILED",
      severity: "error",
      entity_type: "amazon_import_job",
      entity_id: jobId,
      message: "Amazon import failed",
      meta: { error: errMsg, job_id: jobId },
    });
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
