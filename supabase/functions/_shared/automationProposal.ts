/**
 * D57.2 — Automation proposal (Deno). Mirrors src/lib/automation for scheduler.
 * Called after createDecision in syncReorderDecisions. No execution logic.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPPORTED_ACTION_TYPES = ["prepare_reorder", "create_internal_task", "schedule_review"];
const DECISION_TYPE_TO_ACTION: Record<string, string> = {
  reorder: "prepare_reorder",
  internal_task: "create_internal_task",
  schedule_review: "schedule_review",
};
const VALIDITY_DAYS: Record<string, number> = {
  prepare_reorder: 7,
  create_internal_task: 14,
  schedule_review: 7,
};
const ACTIVE_PROPOSAL_STATUSES = ["drafted", "pending_approval", "approved", "queued_for_execution"];

async function getActiveRule(
  supabase: SupabaseClient,
  orgId: string,
  actionType: string
): Promise<Record<string, unknown> | null> {
  const now = new Date().toISOString();
  const { data: rows, error } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("org_id", orgId)
    .eq("action_type", actionType)
    .eq("is_enabled", true)
    .lte("valid_from", now)
    .limit(10);
  if (error || !rows?.length) return null;
  const r = rows.find(
    (x: { valid_to?: string | null }) => x.valid_to == null || (x.valid_to && String(x.valid_to) >= now)
  );
  return (r ?? rows[0]) as Record<string, unknown>;
}

function simpleHash(obj: Record<string, unknown>): string {
  try {
    const keys = Object.keys(obj).sort();
    const str = JSON.stringify(obj, keys);
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h &= h;
    }
    return String(Math.abs(h));
  } catch {
    return "";
  }
}

function computeRisk(priorityScore: number | null, context: Record<string, unknown>): { risk_band: string; risk_score: number } {
  let score = 0;
  if (Number.isFinite(priorityScore)) {
    if ((priorityScore as number) >= 80) score += 40;
    else if ((priorityScore as number) >= 50) score += 25;
    else score += 10;
  }
  const reorderUnits = Number(context.reorder_units) || 0;
  if (reorderUnits > 500) score += 30;
  else if (reorderUnits > 100) score += 15;
  const conf = String(context.confidence || "").toLowerCase();
  if (conf === "low") score += 20;
  else if (conf === "medium") score += 5;
  score = Math.min(100, Math.max(0, score));
  const risk_band = score >= 60 ? "high" : score >= 30 ? "medium" : "low";
  return { risk_band, risk_score: score };
}

/**
 * Try to create an automation proposal for a decision. Best-effort; does not throw.
 */
export async function maybeCreateAutomationProposalForDecision(
  supabase: SupabaseClient,
  orgId: string,
  decisionId: string
): Promise<{ created: boolean }> {
  if (!orgId || !decisionId) return { created: false };

  const { data: decision, error: decErr } = await supabase
    .from("decisions")
    .select("id, org_id, decision_type, status, priority_score, title")
    .eq("id", decisionId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (decErr || !decision) return { created: false };
  if ((decision as { status: string }).status !== "open" && (decision as { status: string }).status !== "acknowledged") {
    return { created: false };
  }

  const decisionType = (decision as { decision_type: string }).decision_type;
  const actionType = DECISION_TYPE_TO_ACTION[decisionType];
  if (!actionType || !SUPPORTED_ACTION_TYPES.includes(actionType)) return { created: false };

  const rule = await getActiveRule(supabase, orgId, actionType);
  if (!rule || (Number(rule.automation_level) ?? 0) < 1) return { created: false };

  const { data: ctxRows } = await supabase
    .from("decision_context")
    .select("key, value")
    .eq("decision_id", decisionId);
  const context: Record<string, unknown> = {};
  for (const row of ctxRows || []) {
    const r = row as { key: string; value: unknown };
    context[r.key] = r.value;
  }

  const { data: existing } = await supabase
    .from("automation_proposals")
    .select("id")
    .eq("org_id", orgId)
    .eq("decision_id", decisionId)
    .eq("action_type", actionType)
    .in("proposal_status", ACTIVE_PROPOSAL_STATUSES)
    .limit(1)
    .maybeSingle();
  if (existing) return { created: false };

  const contextHash = simpleHash(context);
  const idempotencyKey = `decision:${decisionId}:${actionType}:${contextHash}`;
  const now = new Date();
  const validFrom = now.toISOString();
  const days = VALIDITY_DAYS[actionType] ?? 7;
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  const { risk_band, risk_score } = computeRisk(
    (decision as { priority_score: number | null }).priority_score,
    context
  );
  const approvalMode = (rule.approval_mode as string) || "single";
  const proposalStatus = approvalMode === "none" ? "drafted" : "pending_approval";

  const proposalRow = {
    org_id: orgId,
    decision_id: decisionId,
    decision_event_id: null,
    action_type: actionType,
    source_entity_type: "decision",
    source_entity_id: decisionId,
    target_entity_type: context.asin ? "asin" : context.project_id ? "project" : null,
    target_entity_id: context.project_id ?? null,
    proposal_status: proposalStatus,
    automation_level: Number(rule.automation_level) ?? 0,
    approval_mode: approvalMode,
    risk_score,
    risk_band,
    payload_json: { decision_id: decisionId, decision_type: decisionType, action_type: actionType, context },
    context_snapshot_json: context,
    context_hash: contextHash,
    idempotency_key: idempotencyKey,
    valid_from: validFrom,
    expires_at: expiresAt,
    created_by_system: true,
  };

  const { data: inserted, error: insErr } = await supabase
    .from("automation_proposals")
    .insert(proposalRow)
    .select("id")
    .single();
  if (insErr || !(inserted as { id?: string })?.id) return { created: false };

  const proposalId = (inserted as { id: string }).id;
  await supabase.from("automation_events").insert({
    org_id: orgId,
    proposal_id: proposalId,
    decision_id: decisionId,
    event_type: "proposal_created",
    event_payload_json: { action_type: actionType, proposal_status: proposalStatus },
    actor_type: "system",
    actor_id: null,
  });

  if (approvalMode !== "none") {
    const steps: { org_id: string; proposal_id: string; approval_step: number; required_role: string | null; approval_status: string }[] = [];
    const roleForStep = approvalMode === "role_constrained" ? "admin" : null;
    if (approvalMode === "single" || approvalMode === "role_constrained") {
      steps.push({ org_id: orgId, proposal_id: proposalId, approval_step: 1, required_role: roleForStep, approval_status: "pending" });
    } else if (approvalMode === "dual") {
      steps.push(
        { org_id: orgId, proposal_id: proposalId, approval_step: 1, required_role: null, approval_status: "pending" },
        { org_id: orgId, proposal_id: proposalId, approval_step: 2, required_role: null, approval_status: "pending" }
      );
    }
    if (steps.length > 0) {
      await supabase.from("automation_approvals").insert(steps);
      await supabase.from("automation_events").insert({
        org_id: orgId,
        proposal_id: proposalId,
        decision_id: null,
        event_type: "approval_requested",
        event_payload_json: { approval_mode: approvalMode, steps_count: steps.length },
        actor_type: "system",
        actor_id: null,
      });
    }
  }

  return { created: true };
}
