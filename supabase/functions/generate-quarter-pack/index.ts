import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type QuarterlyJobRow = {
  id: string;
  org_id: string;
  year: number;
  quarter: number;
  period_status: string;
  base_currency: string;
  status: string;
  file_path: string | null;
  checksum: string | null;
  error: string | null;
};

async function loadJob(jobId: string): Promise<QuarterlyJobRow | null> {
  const { data, error } = await supabaseAdmin
    .from("quarterly_export_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw error;
  return data as QuarterlyJobRow | null;
}

async function updateJob(jobId: string, patch: Partial<QuarterlyJobRow>) {
  const { error } = await supabaseAdmin
    .from("quarterly_export_jobs")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) throw error;
}

function toCSV(headers: string[], rows: any[]): string {
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines: string[] = [];
  lines.push(headers.join(","));
  for (const row of rows) {
    const line = headers.map((h) => escape((row as any)[h])).join(",");
    lines.push(line);
  }
  return lines.join("\n");
}

async function generateQuarterPack(job: QuarterlyJobRow) {
  // Mark running
  await updateJob(job.id, { status: "running", error: null });

  const { year, quarter } = job;

  // 1) Fetch datasets via RPCs
  const fetchRpc = async (fn: string) => {
    const { data, error } = await supabaseAdmin.rpc(fn, {
      p_year: year,
      p_quarter: quarter,
    });
    if (error) throw error;
    return data || [];
  };

  const [pnlRows, cashRows, ledgerRows, reconRows] = await Promise.all([
    fetchRpc("pnl_quarterly"),
    fetchRpc("cashflow_quarterly"),
    fetchRpc("ledger_export_quarterly"),
    fetchRpc("ledger_reconciliation_quarterly"),
  ]);

  // 2) Build CSVs
  const pnlCsv = toCSV(["type", "total_base_pnl", "period_status"], pnlRows);
  const cashCsv = toCSV(["type", "total_base_cash", "period_status"], cashRows);
  const ledgerCsv = toCSV(
    [
      "id",
      "occurred_at",
      "cash_at",
      "type",
      "status",
      "amount_original",
      "currency_original",
      "rate_pnl",
      "amount_base_pnl",
      "rate_cash",
      "amount_base_cash",
      "reference_type",
      "reference_id",
      "note",
      "created_at",
      "period_status",
    ],
    ledgerRows,
  );
  const reconCsv = toCSV(
    [
      "reference_type",
      "rows",
      "total_base_pnl",
      "total_base_cash",
      "rows_in_base_ccy",
      "period_status",
    ],
    reconRows,
  );

  // 3) ZIP
  const zip = new JSZip();
  const prefix = `org_${job.org_id}_Y${year}_Q${quarter}`;
  zip.file(`${prefix}_pnl.csv`, pnlCsv);
  zip.file(`${prefix}_cashflow.csv`, cashCsv);
  zip.file(`${prefix}_ledger.csv`, ledgerCsv);
  zip.file(`${prefix}_reconciliation.csv`, reconCsv);

  const zipBlob = await zip.generateAsync({ type: "uint8array" });

  // Simple checksum (hex of first 32 bytes)
  const checksum = Array.from(zipBlob.slice(0, 32))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const filePath = `${job.org_id}/finance/quarterly/${year}/Q${quarter}/${prefix}.zip`;

  // 4) Upload to exports bucket
  const { error: uploadError } = await supabaseAdmin.storage
    .from("exports")
    .upload(filePath, zipBlob, {
      contentType: "application/zip",
      upsert: true,
    });
  if (uploadError) throw uploadError;

  // 5) Generate signed URL (7 days)
  const { data: signed, error: signedError } = await supabaseAdmin.storage
    .from("exports")
    .createSignedUrl(filePath, 7 * 24 * 60 * 60);
  if (signedError) throw signedError;

  const signedPath = signed?.signedUrl || filePath;

  await updateJob(job.id, {
    status: "done",
    file_path: signedPath,
    checksum,
  });
}

async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("job_id");

    if (!jobId) {
      return new Response(JSON.stringify({ error: "job_id_required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const job = await loadJob(jobId);
    if (!job) {
      return new Response(JSON.stringify({ error: "job_not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await generateQuarterPack(job);

    return new Response(
      JSON.stringify({
        ok: true,
        job_id: job.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("generate-quarter-pack error", err);
    // Best-effort job update if we can parse id from body/query later if needed
    return new Response(
      JSON.stringify({
        error: (err as any)?.message || "unknown_error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

Deno.serve(handler);

