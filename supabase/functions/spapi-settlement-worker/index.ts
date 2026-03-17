/**
 * F7.7.2 — SP-API Settlement Worker (multi-tenant).
 * Schedule: every 10 minutes (cron: 0,10,20,... min).
 * Discovers settlement reports, downloads, parses, posts to ledger.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Papa from "https://esm.sh/papaparse@5.4.1";
import { logOpsEvent } from "../_shared/opsEvents.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LWA_CLIENT_ID = Deno.env.get("LWA_CLIENT_ID");
const LWA_CLIENT_SECRET = Deno.env.get("LWA_CLIENT_SECRET");
const LWA_TOKEN_URL = Deno.env.get("LWA_TOKEN_URL") || "https://api.amazon.com/auth/o2/token";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const SPAPI_BASE_BY_REGION: Record<string, string> = {
  EU: "https://sellingpartnerapi-eu.amazon.com",
  NA: "https://sellingpartnerapi-na.amazon.com",
  FE: "https://sellingpartnerapi-fe.amazon.com",
};

const SETTLEMENT_REPORT_TYPE = "GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2";

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

async function getLwaAccessToken(refreshToken: string): Promise<string> {
  if (!LWA_CLIENT_ID || !LWA_CLIENT_SECRET) throw new Error("LWA not configured");
  const res = await fetch(LWA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: LWA_CLIENT_ID,
      client_secret: LWA_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`LWA token failed: ${res.status}`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("No access_token in LWA response");
  return data.access_token;
}

async function getReports(accessToken: string, region: string): Promise<Array<{ reportId: string; reportDocumentId?: string; processingStatus?: string; dataStartTime?: string; dataEndTime?: string; createdAt?: string }>> {
  const base = SPAPI_BASE_BY_REGION[region] || SPAPI_BASE_BY_REGION.EU;
  const url = `${base}/reports/2021-06-30/reports?reportTypes=${SETTLEMENT_REPORT_TYPE}`;
  const res = await fetch(url, {
    headers: { "x-amz-access-token": accessToken },
  });
  if (!res.ok) throw new Error(`getReports failed: ${res.status}`);
  const body = (await res.json()) as { reports?: Array<{ reportId: string; reportDocumentId?: string; processingStatus?: string; dataStartTime?: string; dataEndTime?: string; createdAt?: string }> };
  return body.reports || [];
}

async function getReportDocumentUrl(accessToken: string, region: string, reportDocumentId: string): Promise<{ url: string; compressionAlgorithm?: string }> {
  const base = SPAPI_BASE_BY_REGION[region] || SPAPI_BASE_BY_REGION.EU;
  const url = `${base}/reports/2021-06-30/documents/${reportDocumentId}`;
  const res = await fetch(url, {
    headers: { "x-amz-access-token": accessToken },
  });
  if (!res.ok) throw new Error(`getReportDocument failed: ${res.status}`);
  const data = (await res.json()) as { url: string; compressionAlgorithm?: string };
  return { url: data.url, compressionAlgorithm: data.compressionAlgorithm };
}

function insertRun(orgId: string, reportId: string, stage: string, status: string, message: string, meta?: unknown) {
  return supabaseAdmin.from("spapi_report_runs").insert({
    org_id: orgId,
    report_id: reportId,
    stage,
    status,
    message,
    meta: meta ?? null,
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  let lockAcquired = false;
  let connections: Array<{ id: string; org_id: string; region: string; seller_id: string; lwa_client_id: string; lwa_refresh_token_plain: string; created_by: string }> = [];

  try {
    if (req.method === "POST") {
      let body: { connection_id?: string } = {};
      try {
        body = await req.json();
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      const connectionId = body?.connection_id;
      if (!connectionId) {
        return new Response(JSON.stringify({ error: "connection_id required" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      const { data: conn } = await supabaseAdmin.rpc("get_spapi_connection_for_worker", { p_connection_id: connectionId });
      const c = Array.isArray(conn) ? conn[0] : conn;
      if (!c?.lwa_refresh_token_plain) {
        return new Response(JSON.stringify({ error: "Connection not found or inactive" }), { status: 404, headers: { "Content-Type": "application/json" } });
      }
      connections = [{
        id: c.id,
        org_id: c.org_id,
        region: c.region,
        seller_id: c.seller_id,
        lwa_client_id: c.lwa_client_id,
        lwa_refresh_token_plain: c.lwa_refresh_token_plain,
        created_by: c.created_by,
      }];
    } else {
      const { data: locked } = await supabaseAdmin.rpc("spapi_worker_try_lock");
      if (locked === false) {
        await logOpsEvent({
          org_id: null,
          source: "edge",
          event_type: "SPAPI_WORKER_SKIPPED_LOCKED",
          severity: "info",
          message: "Skipped: another run holds the lock",
        });
        return new Response(JSON.stringify({ skipped: true, reason: "already running" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      lockAcquired = true;

      await logOpsEvent({
        org_id: null,
        source: "edge",
        event_type: "SPAPI_WORKER_TICK",
        severity: "info",
        message: "SP-API settlement worker tick",
      });

      const nowIso = new Date().toISOString();
      const { data: ids } = await supabaseAdmin
        .from("spapi_connections")
        .select("id")
        .eq("status", "active")
        .or(`next_sync_due_at.is.null,next_sync_due_at.lte.${nowIso}`);
      if (!ids?.length) {
        await logOpsEvent({ org_id: null, source: "edge", event_type: "SPAPI_WORKER_DONE", severity: "info", message: "No active connections" });
        return new Response(JSON.stringify({ ok: true, connections: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      for (const row of ids as { id: string }[]) {
        const { data: conn } = await supabaseAdmin.rpc("get_spapi_connection_for_worker", { p_connection_id: row.id });
        const c = Array.isArray(conn) ? conn[0] : conn;
        if (c?.lwa_refresh_token_plain) {
          connections.push({
            id: c.id,
            org_id: c.org_id,
            region: c.region,
            seller_id: c.seller_id,
            lwa_client_id: c.lwa_client_id,
            lwa_refresh_token_plain: c.lwa_refresh_token_plain,
            created_by: c.created_by,
          });
        }
      }
    }

  for (const conn of connections) {
    const orgId = conn.org_id;
    const connectionId = conn.id;
    try {
      // D11.7 — Feature gating: amazon_ingest (single source of truth: billing_org_entitlements)
      const { data: entRows, error: entErr } = await supabaseAdmin
        .from("billing_org_entitlements")
        .select("is_active, features_jsonb")
        .eq("org_id", orgId)
        .limit(1);
      if (entErr || !entRows?.length) {
        await logOpsEvent({
          org_id: orgId,
          source: "edge",
          event_type: "SPAPI_GATING_BLOCKED",
          severity: "warn",
          message: "billing_entitlements_missing or lookup_failed",
        });
        if (connections.length === 1) {
          return new Response(
            JSON.stringify({ error: "billing_entitlements_missing" }),
            { status: 403, headers: { "Content-Type": "application/json" } },
          );
        }
        continue;
      }
      const ent = entRows[0] as { is_active?: boolean; features_jsonb?: Record<string, { enabled?: boolean }> };
      if (!ent.is_active) {
        if (connections.length === 1) {
          return new Response(
            JSON.stringify({ error: "org_billing_inactive" }),
            { status: 403, headers: { "Content-Type": "application/json" } },
          );
        }
        continue;
      }
      if (ent.features_jsonb?.amazon_ingest?.enabled !== true) {
        if (connections.length === 1) {
          return new Response(
            JSON.stringify({ error: "feature_not_available" }),
            { status: 403, headers: { "Content-Type": "application/json" } },
          );
        }
        continue;
      }

      await logOpsEvent({
        org_id: orgId,
        source: "edge",
        event_type: "SPAPI_DISCOVER_STARTED",
        severity: "info",
        message: "Discovering settlement reports",
        meta: { connection_id: connectionId },
      });

      const accessToken = await getLwaAccessToken(conn.lwa_refresh_token_plain);
      const reports = await getReports(accessToken, conn.region);

      let discoveredCount = 0;
      for (const r of reports) {
        const reportId = r.reportId;
        const { data: existing } = await supabaseAdmin.from("spapi_reports").select("id, status").eq("org_id", orgId).eq("report_id", reportId).maybeSingle();
        if ((existing as { status?: string } | null)?.status === "posted") continue;
        const { error: upsertErr } = await supabaseAdmin.from("spapi_reports").upsert(
          {
            org_id: orgId,
            connection_id: connectionId,
            region: conn.region,
            report_type: SETTLEMENT_REPORT_TYPE,
            report_id: reportId,
            document_id: r.reportDocumentId ?? null,
            data_start_time: r.dataStartTime ?? null,
            data_end_time: r.dataEndTime ?? null,
            processing_status: r.processingStatus ?? null,
            created_time: r.createdAt ?? null,
            status: "discovered",
            last_error: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "org_id,report_id" }
        );
        if (!upsertErr) discoveredCount += 1;
      }

      await logOpsEvent({
        org_id: orgId,
        source: "edge",
        event_type: "SPAPI_DISCOVER_DONE",
        severity: "info",
        message: "Discover done",
        meta: { discovered_count: discoveredCount, connection_id: connectionId },
      });

      const { data: reportsToProcess } = await supabaseAdmin
        .from("spapi_reports")
        .select("id, org_id, report_id, document_id, connection_id, status, failed_attempts")
        .eq("connection_id", connectionId)
        .in("status", ["discovered", "failed"]);

      const list = (reportsToProcess || []) as Array<{ id: string; org_id: string; report_id: string; document_id: string | null; connection_id: string; status?: string; failed_attempts?: number }>;

      for (const report of list) {
        const reportPk = report.id;
        const failedAttempts = report.failed_attempts ?? 0;
        if (report.status === "failed" && failedAttempts >= 5) {
          await logOpsEvent({
            org_id: orgId,
            source: "edge",
            event_type: "SPAPI_REPORT_GIVEUP",
            severity: "critical",
            entity_type: "spapi_report",
            entity_id: reportPk,
            message: "Report skipped after 5 failed attempts",
            meta: { report_id: reportPk, failed_attempts: failedAttempts },
          });
          continue;
        }

        await supabaseAdmin.from("spapi_reports").update({ last_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", reportPk);

        const reportIdStr = report.report_id;
        const docId = report.document_id;
        if (!docId) {
          await supabaseAdmin
            .from("spapi_reports")
            .update({ status: "failed", last_error: "no_document_id", failed_attempts: failedAttempts + 1, updated_at: new Date().toISOString() })
            .eq("id", reportPk);
          await insertRun(orgId, reportPk, "download", "failed", "no_document_id");
          await logOpsEvent({
            org_id: orgId,
            source: "edge",
            event_type: "SPAPI_REPORT_FAILED",
            severity: "warn",
            message: "Report failed",
            meta: { report_id: reportPk, failed_attempts: failedAttempts + 1 },
          });
          continue;
        }

        try {
          await insertRun(orgId, reportPk, "download", "started", "Downloading document");
          const { url, compressionAlgorithm } = await getReportDocumentUrl(accessToken, conn.region, docId);
          const docRes = await fetch(url);
          if (!docRes.ok) throw new Error(`Download failed: ${docRes.status}`);
          const buf = await docRes.arrayBuffer();
          let csvText: string;
          if (compressionAlgorithm === "GZIP") {
            const ds = new DecompressionStream("gzip");
            const stream = new Blob([buf]).stream().pipeThrough(ds);
            csvText = await new Response(stream).text();
          } else {
            csvText = new TextDecoder().decode(buf);
          }

          await supabaseAdmin.from("spapi_reports").update({ status: "downloaded", retrieved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", reportPk);
          await insertRun(orgId, reportPk, "download", "done", "Downloaded");

          await insertRun(orgId, reportPk, "parse", "started", "Parsing CSV");
          const parseResult = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true, delimiter: "\t" });
          const rows = parseResult.data || [];
          const fileSha256 = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(reportIdStr)).then((h) => Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join(""));
          const { data: existingJob } = await supabaseAdmin.from("amazon_import_jobs").select("id, status, attempt_count, last_error").eq("org_id", orgId).eq("file_sha256", fileSha256).maybeSingle();
          const existing = existingJob as { id: string; status: string; attempt_count?: number; last_error?: string | null } | null;
          let jobId: string;
          if (existing?.id) {
            jobId = existing.id;
            if (existing.status === "done") {
              await supabaseAdmin.from("spapi_reports").update({ status: "posted", last_error: null, failed_attempts: 0, updated_at: new Date().toISOString() }).eq("id", reportPk);
              await insertRun(orgId, reportPk, "post", "done", "Already posted");
              continue;
            }
            if (existing.status === "parsed" || existing.status === "failed") {
              const jobAttempts = existing.attempt_count ?? 0;
              if (jobAttempts >= 5) {
                await insertRun(orgId, reportPk, "post", "failed", "Job skipped after 5 failed attempts");
                continue;
              }
              await supabaseAdmin.from("amazon_import_jobs").update({
                status: "posting",
                attempt_count: jobAttempts + 1,
                started_at: new Date().toISOString(),
                finished_at: null,
                last_error: null,
              }).eq("id", jobId);
              await insertRun(orgId, reportPk, "post", "started", "Posting to ledger (retry)");
              const { data: postData, error: postErr } = await supabaseAdmin.rpc("post_amazon_job_to_ledger_backend", { p_org_id: orgId, p_job_id: jobId });
              if (postErr) throw postErr;
              await supabaseAdmin.from("spapi_reports").update({ status: "posted", last_error: null, failed_attempts: 0, updated_at: new Date().toISOString() }).eq("id", reportPk);
              await insertRun(orgId, reportPk, "post", "done", "Posted", { posted_count: Array.isArray(postData)?.[0]?.posted_count ?? 0 });
              await supabaseAdmin.from("amazon_import_jobs").update({
                status: "done",
                finished_at: new Date().toISOString(),
                last_error: null,
              }).eq("id", jobId);
              continue;
            }
            if (existing.status === "parsing" || existing.status === "posting") continue;
          }
          if (!existing?.id) {
            jobId = crypto.randomUUID();
            await supabaseAdmin.from("amazon_import_jobs").insert({
              id: jobId,
              org_id: orgId,
              file_name: `spapi-settlement-${reportIdStr}`,
              file_sha256: fileSha256,
              marketplace: conn.region,
              report_type: "settlement",
              status: "parsing",
              created_by: conn.created_by,
              attempt_count: 1,
              started_at: new Date().toISOString(),
              finished_at: null,
              last_error: null,
            });
          }

          if (!existing?.id) {
          const events: Array<{ job_id: string; org_id: string; settlement_id: string | null; transaction_id: string | null; event_type: string; event_date: string; amount: number; currency: string; reference: string | null; meta: Record<string, unknown> | null }> = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNumber = i + 1;
            const uniqueKey = `${jobId}:${rowNumber}`;
            await supabaseAdmin.from("amazon_raw_rows").insert({
              job_id: jobId,
              org_id: orgId,
              row_number: rowNumber,
              raw_data: row as unknown as Record<string, unknown>,
              unique_key: uniqueKey,
            }).then(() => {}).catch(() => {});

            const settlementId = getRowValue(row, "settlement_id", "settlement-id");
            const transactionId = getRowValue(row, "transaction_id", "transaction-id");
            const eventDateStr = getRowValue(row, "event_date", "date", "transaction_date");
            const amountVal = getRowValue(row, "amount");
            const currencyVal = getRowValue(row, "currency");
            const eventTypeVal = getRowValue(row, "event_type", "type", "transaction_type");
            const eventDate = parseDate(eventDateStr);
            const amount = parseAmount(amountVal);
            if (eventDate && amount !== null && currencyVal) {
              const sid = settlementId || `${jobId}_r${rowNumber}`;
              const tid = transactionId || `${jobId}_r${rowNumber}`;
              events.push({
                job_id: jobId,
                org_id: orgId,
                settlement_id: sid,
                transaction_id: tid,
                event_type: eventTypeVal || "unknown",
                event_date: eventDate,
                amount,
                currency: currencyVal,
                reference: getRowValue(row, "reference", "description") || null,
                meta: Object.keys(row).length > 6 ? (row as unknown as Record<string, unknown>) : null,
              });
            }
          }

          if (events.length > 0) {
            await supabaseAdmin.from("amazon_financial_events").upsert(events, { onConflict: "org_id,settlement_id,transaction_id,event_type", ignoreDuplicates: true });
          }
          await supabaseAdmin.rpc("finalize_amazon_parse", { p_job_id: jobId, p_total_rows: rows.length, p_parsed_rows: events.length });
          await supabaseAdmin.from("spapi_reports").update({ status: "parsed", updated_at: new Date().toISOString() }).eq("id", reportPk);
          await insertRun(orgId, reportPk, "parse", "done", "Parsed");

          await insertRun(orgId, reportPk, "post", "started", "Posting to ledger");
          const { data: postData, error: postErr } = await supabaseAdmin.rpc("post_amazon_job_to_ledger_backend", { p_org_id: orgId, p_job_id: jobId });
          if (postErr) throw postErr;
          await supabaseAdmin.from("spapi_reports").update({ status: "posted", last_error: null, failed_attempts: 0, updated_at: new Date().toISOString() }).eq("id", reportPk);
          await insertRun(orgId, reportPk, "post", "done", "Posted", { posted_count: Array.isArray(postData)?.[0]?.posted_count ?? 0 });
          await supabaseAdmin.from("amazon_import_jobs").update({
            status: "done",
            finished_at: new Date().toISOString(),
            last_error: null,
          }).eq("id", jobId);
          }
        } catch (reportErr) {
          const errMsg = (reportErr as Error).message;
          const newFailedAttempts = failedAttempts + 1;
          await supabaseAdmin
            .from("spapi_reports")
            .update({
              status: "failed",
              last_error: errMsg.slice(0, 500),
              failed_attempts: newFailedAttempts,
              updated_at: new Date().toISOString(),
            })
            .eq("id", reportPk);
          await insertRun(orgId, reportPk, "download", "failed", errMsg).catch(() => {});
          await insertRun(orgId, reportPk, "parse", "failed", errMsg).catch(() => {});
          await insertRun(orgId, reportPk, "post", "failed", errMsg).catch(() => {});
          if (jobId) {
            await supabaseAdmin.from("amazon_import_jobs").update({
              status: "failed",
              attempt_count: supabaseAdmin.rpc ? undefined : undefined,
              last_error: errMsg.slice(0, 500),
              finished_at: new Date().toISOString(),
            }).eq("id", jobId).catch(() => {});
          }
          await logOpsEvent({
            org_id: orgId,
            source: "edge",
            event_type: "SPAPI_REPORT_FAILED",
            severity: "warn",
            message: "Report failed",
            meta: { report_id: reportPk, failed_attempts: newFailedAttempts, error: errMsg.slice(0, 200) },
          });
          await logOpsEvent({
            org_id: orgId,
            source: "edge",
            event_type: "SPAPI_WORKER_ERROR",
            severity: "error",
            message: errMsg,
            meta: { error: errMsg, report_id: reportPk },
          });
        }
      }

      await supabaseAdmin
        .from("spapi_connections")
        .update({
          last_sync_at: new Date().toISOString(),
          last_error: null,
          backoff_minutes: 0,
          next_sync_due_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .eq("id", connectionId);
    } catch (connErr) {
      const errMsg = (connErr as Error).message;
      const { data: connRow } = await supabaseAdmin.from("spapi_connections").select("backoff_minutes").eq("id", connectionId).single();
      const current = (connRow as { backoff_minutes?: number } | null)?.backoff_minutes ?? 0;
      const backoffMinutes = Math.min(1440, Math.max(5, current * 2));
      const nextDue = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();
      await supabaseAdmin
        .from("spapi_connections")
        .update({
          last_error: errMsg.slice(0, 500),
          backoff_minutes: backoffMinutes,
          next_sync_due_at: nextDue,
        })
        .eq("id", connectionId);
      await logOpsEvent({
        org_id: orgId,
        source: "edge",
        event_type: "SPAPI_BACKOFF_SET",
        severity: "warn",
        message: "Connection backoff set after error",
        meta: { connection_id: connectionId, backoff_minutes: backoffMinutes, error: errMsg.slice(0, 200) },
      });
      await logOpsEvent({
        org_id: orgId,
        source: "edge",
        event_type: "SPAPI_WORKER_ERROR",
        severity: "error",
        message: errMsg,
        meta: { error: errMsg, connection_id: connectionId },
      });
    }
  }

  await logOpsEvent({
    org_id: null,
    source: "edge",
    event_type: "SPAPI_WORKER_DONE",
    severity: "info",
    message: "SP-API settlement worker run complete",
  });

  return new Response(JSON.stringify({ ok: true, connections: connections.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  } finally {
    if (lockAcquired) {
      await supabaseAdmin.rpc("spapi_worker_unlock");
    }
  }
});
