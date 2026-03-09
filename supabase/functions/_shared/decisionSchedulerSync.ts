/**
 * D34 — Decision scheduler sync (Deno). Mirrors app sync: getReorderAlerts → syncReorderDecisions.
 * Used only by decision-scheduler Edge Function. Single shared module to avoid importing from src/.
 * D57.2: after each created decision, maybe create automation proposal (no execution).
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { maybeCreateAutomationProposalForDecision } from "./automationProposal.ts";

const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_LEAD_TIME_DAYS = 30;
const COVERAGE_DAYS_CAP = 999;
const MIN_DAILY_SALES_RELIABLE = 0.5;
const DAYS_URGENT = 14;
const DAYS_IMMINENT = 7;
const SOURCE_ENGINE = "reorder_engine";
const SEVERITY_TO_PRIORITY: Record<string, number> = { high: 100, medium: 50, low: 10 };

async function getWorkspaceAsins(supabase: SupabaseClient, orgId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("product_identifiers")
    .select("asin")
    .eq("org_id", orgId)
    .not("asin", "is", null);
  if (error) return [];
  return [...new Set((data || []).map((r: { asin?: string }) => (r.asin || "").trim()).filter(Boolean))];
}

async function resolveProduct(
  supabase: SupabaseClient,
  orgId: string,
  asin: string
): Promise<{ projectId: string | null; productName: string | null }> {
  const normalized = (asin || "").trim().toUpperCase();
  if (!normalized) return { projectId: null, productName: null };
  const { data: pi, error: piError } = await supabase
    .from("product_identifiers")
    .select("project_id")
    .eq("org_id", orgId)
    .ilike("asin", normalized)
    .not("project_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (piError || !(pi as { project_id?: string })?.project_id)
    return { projectId: null, productName: null };
  const { data: proj } = await supabase
    .from("projects")
    .select("name")
    .eq("id", (pi as { project_id: string }).project_id)
    .maybeSingle();
  return {
    projectId: (pi as { project_id: string }).project_id,
    productName: (proj as { name?: string })?.name ?? null,
  };
}

async function getAverageDailyUnitsSold(
  supabase: SupabaseClient,
  orgId: string,
  productId: string,
  lookbackDays: number
): Promise<number> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - lookbackDays);
  const dateFrom = from.toISOString().slice(0, 10);
  const dateTo = to.toISOString().slice(0, 10);
  const { data: rows, error } = await supabase
    .from("v_product_units_sold_day")
    .select("d, orders_count")
    .eq("org_id", orgId)
    .eq("product_id", productId)
    .gte("d", dateFrom)
    .lte("d", dateTo);
  if (error || !rows?.length) return 0;
  const total = (rows as { orders_count?: number }[]).reduce((s, r) => s + (Number(r.orders_count) || 0), 0);
  return lookbackDays > 0 ? total / lookbackDays : 0;
}

async function getCurrentStock(supabase: SupabaseClient, orgId: string, projectId: string): Promise<number> {
  const { data: rows, error } = await supabase
    .from("inventory")
    .select("total_units")
    .eq("org_id", orgId)
    .eq("project_id", projectId);
  if (error || !rows?.length) return 0;
  return (rows as { total_units?: number }[]).reduce((s, r) => s + (Number(r?.total_units) || 0), 0);
}

async function getIncomingUnits(supabase: SupabaseClient, orgId: string, projectId: string): Promise<number> {
  const { data: rows, error } = await supabase
    .from("purchase_orders")
    .select("items")
    .eq("org_id", orgId)
    .eq("project_id", projectId);
  if (error) return 0;
  let sum = 0;
  for (const r of rows || []) {
    const items = (r as { items?: unknown }).items;
    if (Array.isArray(items)) {
      for (const it of items as { quantity?: number; qty?: number; units?: number }[]) {
        const q = it?.quantity ?? it?.qty ?? it?.units;
        if (Number.isFinite(q)) sum += Number(q);
      }
    }
  }
  return sum;
}

function getConfidenceAndIssues(
  dailySales: number,
  stockOnHand: number,
  incomingUnits: number,
  leadTimeSource: string
): { confidence: string; issues: string[] } {
  const issues: string[] = [];
  if (leadTimeSource === "fallback" || leadTimeSource === "unknown") issues.push("missing_lead_time");
  if (!Number.isFinite(incomingUnits) || incomingUnits === 0) issues.push("no_incoming_po_data");
  if (Number.isFinite(dailySales) && dailySales < MIN_DAILY_SALES_RELIABLE && dailySales > 0)
    issues.push("weak_daily_sales");
  const stockOk = Number.isFinite(stockOnHand) && stockOnHand >= 0;
  const salesReliable = Number.isFinite(dailySales) && dailySales >= MIN_DAILY_SALES_RELIABLE;
  let confidence = "low";
  if (salesReliable && stockOk && leadTimeSource !== "unknown") {
    confidence = issues.length === 0 ? "high" : "medium";
  } else if (Number.isFinite(dailySales) && dailySales > 0 && stockOk) {
    confidence = "medium";
  }
  return { confidence, issues };
}

type Candidate = {
  asin: string;
  productName: string | null;
  reorderUnits: number;
  daysUntilStockout: number;
  confidence: string;
  issues: string[];
};

async function getReorderCandidates(
  supabase: SupabaseClient,
  orgId: string,
  limit: number
): Promise<Candidate[]> {
  const lookbackDays = DEFAULT_LOOKBACK_DAYS;
  const leadTimeFallback = DEFAULT_LEAD_TIME_DAYS;
  const asins = await getWorkspaceAsins(supabase, orgId);
  if (!asins.length) return [];

  const candidates: Array<{
    asin: string;
    productName: string | null;
    dailySales: number;
    stockOnHand: number;
    incomingUnits: number;
    leadTimeDays: number;
    reorderUnits: number;
    daysUntilStockout: number;
    coverageDays: number;
    demandDuringLeadTime: number;
    leadTimeSource: string;
    confidence: string;
    issues: string[];
  }> = [];

  for (const asin of asins) {
    try {
      const { projectId, productName } = await resolveProduct(supabase, orgId, asin);
      if (!projectId) continue;

      const [dailySalesRaw, stockOnHandRaw, incomingUnitsRaw] = await Promise.all([
        getAverageDailyUnitsSold(supabase, orgId, projectId, lookbackDays),
        getCurrentStock(supabase, orgId, projectId),
        getIncomingUnits(supabase, orgId, projectId),
      ]);

      const dailySales = Number.isFinite(dailySalesRaw) ? Math.max(0, dailySalesRaw) : 0;
      const stockOnHand = Number.isFinite(stockOnHandRaw) ? Math.max(0, stockOnHandRaw) : 0;
      const incomingUnits = Number.isFinite(incomingUnitsRaw) ? Math.max(0, incomingUnitsRaw) : 0;
      if (dailySales <= 0) continue;

      const leadTimeDays = leadTimeFallback;
      const demandDuringLeadTime = dailySales * leadTimeDays;
      const available = stockOnHand + incomingUnits;
      const reorderNeeded = demandDuringLeadTime - available;
      if (reorderNeeded <= 0) continue;

      const reorderUnits = Math.max(0, Math.round(reorderNeeded));
      const daysUntilStockout = Math.max(0, stockOnHand / dailySales);
      let coverageDays = available / dailySales;
      if (!Number.isFinite(coverageDays) || coverageDays < 0) coverageDays = 0;
      if (coverageDays > COVERAGE_DAYS_CAP) coverageDays = COVERAGE_DAYS_CAP;

      const { confidence, issues } = getConfidenceAndIssues(
        dailySales,
        stockOnHand,
        incomingUnits,
        "fallback"
      );

      candidates.push({
        asin: (asin || "").trim(),
        productName: productName ?? null,
        dailySales,
        stockOnHand,
        incomingUnits,
        leadTimeDays,
        reorderUnits,
        daysUntilStockout,
        coverageDays,
        demandDuringLeadTime,
        leadTimeSource: "fallback",
        confidence,
        issues: Array.isArray(issues) ? issues : [],
      });
    } catch {
      continue;
    }
  }

  const confidenceOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  candidates.sort((a, b) => {
    const dA = a.daysUntilStockout ?? 0;
    const dB = b.daysUntilStockout ?? 0;
    if (dA !== dB) return dA - dB;
    const cA = confidenceOrder[a.confidence] ?? 2;
    const cB = confidenceOrder[b.confidence] ?? 2;
    if (cA !== cB) return cA - cB;
    return (b.reorderUnits ?? 0) - (a.reorderUnits ?? 0);
  });

  return candidates.slice(0, limit).map((c) => ({
    asin: c.asin,
    productName: c.productName,
    reorderUnits: c.reorderUnits,
    daysUntilStockout: c.daysUntilStockout,
    confidence: c.confidence,
    issues: c.issues,
    severity:
      c.daysUntilStockout <= DAYS_IMMINENT
        ? "high"
        : c.daysUntilStockout <= DAYS_URGENT && c.confidence !== "low"
          ? "high"
          : c.daysUntilStockout <= DAYS_URGENT
            ? "medium"
            : c.confidence === "high" || c.confidence === "medium"
              ? "medium"
              : "low",
  }));
}

async function getExistingReorderAsins(supabase: SupabaseClient, orgId: string): Promise<Set<string>> {
  const { data: decisions, error: decError } = await supabase
    .from("decisions")
    .select("id")
    .eq("org_id", orgId)
    .eq("decision_type", "reorder")
    .in("status", ["open", "acknowledged"]);

  if (decError || !decisions?.length) return new Set();
  const ids = (decisions as { id: string }[]).map((d) => d.id);

  const { data: sources, error: srcError } = await supabase
    .from("decision_sources")
    .select("decision_id")
    .in("decision_id", ids)
    .eq("source_engine", SOURCE_ENGINE);

  if (srcError || !sources?.length) return new Set();
  const sourceDecisionIds = new Set((sources as { decision_id: string }[]).map((s) => s.decision_id));

  const { data: contextRows, error: ctxError } = await supabase
    .from("decision_context")
    .select("decision_id, value")
    .in("decision_id", ids)
    .eq("key", "asin");

  if (ctxError || !contextRows?.length) return new Set();
  const asins = new Set<string>();
  for (const row of contextRows as { decision_id: string; value: unknown }[]) {
    if (!sourceDecisionIds.has(row.decision_id)) continue;
    const v = row.value;
    const asin = typeof v === "string" ? v : (v as { value?: string })?.value ?? (v != null ? String(v) : null);
    if (asin && typeof asin === "string") asins.add(asin.trim());
  }
  return asins;
}

async function createDecision(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    decisionType: string;
    priorityScore: number | null;
    title: string | null;
    description: string | null;
    sourceEngine: string;
    contextData: Record<string, unknown>;
  }
): Promise<string | null> {
  const { orgId, decisionType, priorityScore, title, description, sourceEngine, contextData } = params;
  if (!orgId || !decisionType || !sourceEngine) return null;

  const { data: decision, error: decError } = await supabase
    .from("decisions")
    .insert({
      org_id: orgId,
      decision_type: decisionType,
      priority_score: priorityScore,
      title,
      description,
      status: "open",
    })
    .select("id")
    .single();

  if (decError || !(decision as { id?: string })?.id) return null;
  const decisionId = (decision as { id: string }).id;

  const contextEntries = Object.entries(contextData).filter(([, v]) => v !== undefined);
  if (contextEntries.length > 0) {
    const contextRows = contextEntries.map(([key, value]) => ({
      decision_id: decisionId,
      key,
      value: value !== null && typeof value === "object" && !Array.isArray(value) ? value : value,
    }));
    await supabase.from("decision_context").insert(contextRows);
  }
  await supabase.from("decision_sources").insert({
    decision_id: decisionId,
    source_engine: sourceEngine,
    source_reference: null,
  });
  await supabase.from("decision_events").insert({
    decision_id: decisionId,
    event_type: "created",
    event_data: null,
  });
  return decisionId;
}

export type SyncResult = {
  ok: boolean;
  scanned: number;
  created: number;
  skipped: number;
  errors: string[];
};

export async function syncReorderDecisions(
  supabase: SupabaseClient,
  orgId: string
): Promise<SyncResult> {
  const result: SyncResult = { ok: true, scanned: 0, created: 0, skipped: 0, errors: [] };

  if (!orgId || typeof orgId !== "string") {
    result.ok = false;
    result.errors.push("orgId is required");
    return result;
  }

  let alerts: Candidate[];
  try {
    alerts = await getReorderCandidates(supabase, orgId, 100);
  } catch (e) {
    result.ok = false;
    result.errors.push(e instanceof Error ? e.message : "getReorderCandidates failed");
    return result;
  }

  result.scanned = alerts.length;
  const existingAsins = await getExistingReorderAsins(supabase, orgId);
  const createdAsinsInRun = new Set<string>();

  for (const alert of alerts) {
    const asin = (alert.asin || "").trim();
    if (!asin) {
      result.skipped += 1;
      continue;
    }
    if (existingAsins.has(asin) || createdAsinsInRun.has(asin)) {
      result.skipped += 1;
      continue;
    }

    const productName = alert.productName?.trim() || asin;
    const title = `Reorder required for ${productName}`;
    const description =
      "Stockout risk detected. Reorder recommended based on current coverage and lead time.";
    const priorityScore = SEVERITY_TO_PRIORITY[alert.severity] ?? 10;

    const contextData: Record<string, unknown> = {
      asin,
      product_name: alert.productName ?? null,
      reorder_units: alert.reorderUnits ?? 0,
      days_until_stockout: alert.daysUntilStockout ?? 0,
      confidence: alert.confidence ?? "low",
    };

    const decisionId = await createDecision(supabase, {
      orgId,
      decisionType: "reorder",
      priorityScore,
      title,
      description,
      sourceEngine: SOURCE_ENGINE,
      contextData,
    });

    if (decisionId) {
      result.created += 1;
      createdAsinsInRun.add(asin);
      try {
        await maybeCreateAutomationProposalForDecision(supabase, orgId, decisionId);
      } catch (e) {
        console.error("syncReorderDecisions: automation proposal failed for decision", decisionId, e);
      }
    } else {
      result.errors.push(`Failed to create decision for ASIN ${asin}`);
    }
  }

  if (result.errors.length > 0) result.ok = false;
  return result;
}
