// research-orchestrator: coordinate research-amazon + research-suppliers +
// optional Helium 10 / Jungle Scout + ai-research-analyst, then persist.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function extractKeywordsFromTitle(title: string, description: string): string {
  const source = (title || description || "").toLowerCase();
  if (!source) return "";
  // Strip common Amazon filler, brand patterns, units, sizes
  const cleaned = source
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    .replace(/[^a-záéíóúñçü0-9\s-]/gi, " ")
    .replace(/\b(pack|set|kit|new|original|premium|quality|amazon|profesional|profesional|professional|fba|eco|bio)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Take first 4-5 significant tokens
  const tokens = cleaned.split(" ").filter((t) => t.length >= 3).slice(0, 5);
  return tokens.join(" ");
}

async function invokeFunction(name: string, body: unknown, authHeader: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: authHeader,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${name}_failed_${res.status}: ${text.substring(0, 200)}`);
  }
  return await res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") ?? "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) return jsonResponse({ error: "Invalid JWT" }, 401);
  const user = userData.user;

  let body: {
    asin?: string;
    description?: string;
    marketplace?: string;
    org_id?: string;
    project_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const asinRaw = (body.asin ?? "").toString().trim();
  const asin = /^B0[A-Z0-9]{8}$/i.test(asinRaw) ? asinRaw.toUpperCase() : "";
  const description = (body.description ?? "").toString().trim().substring(0, 300);
  const marketplace = (body.marketplace ?? "").toString().trim().toUpperCase();
  const orgId = (body.org_id ?? "").toString().trim();
  const projectId = (body.project_id ?? "").toString().trim() || null;

  if (!marketplace) return jsonResponse({ error: "marketplace_required" }, 400);
  if (!asin && !description) return jsonResponse({ error: "asin_or_description_required" }, 400);
  if (!orgId) return jsonResponse({ error: "org_id_required" }, 400);

  // Verify user belongs to org
  const { data: membership } = await supabase
    .from("org_memberships")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return jsonResponse({ error: "not_a_member_of_org" }, 403);

  const sourcesUsed: string[] = [];
  const raw: Record<string, unknown> = {
    input: { asin, description, marketplace },
  };

  // Step 1: Amazon (if ASIN provided)
  let amazonData: Record<string, unknown> | null = null;
  if (asin) {
    try {
      amazonData = await invokeFunction(
        "research-amazon",
        { asin, marketplace, org_id: orgId },
        authHeader,
      );
      raw.amazon = amazonData;
      sourcesUsed.push("amazon");
    } catch (err) {
      raw.amazon = { error: String(err) };
    }
  }

  // Step 2: derive keywords
  const keywords = extractKeywordsFromTitle(
    (amazonData?.title as string) ?? "",
    description,
  );

  // Step 3: fire parallel lookups (suppliers + optional tools)
  const parallelTasks: Promise<unknown>[] = [];
  const taskLabels: string[] = [];

  if (keywords) {
    parallelTasks.push(
      invokeFunction("research-suppliers", { keywords }, authHeader),
    );
    taskLabels.push("suppliers");
  }

  // Optional Helium 10 / Jungle Scout
  const { data: toolConns } = await supabase
    .from("tool_connections")
    .select("tool_name, credentials, status")
    .eq("org_id", orgId)
    .eq("status", "active");

  const helium = toolConns?.find((c) => c.tool_name === "helium10");
  const jungle = toolConns?.find((c) => c.tool_name === "jungle_scout");

  if (helium?.credentials && keywords) {
    parallelTasks.push(
      (async () => {
        // Placeholder — real H10 API integration goes here.
        return {
          status: "stub",
          note: "Helium 10 integration not yet implemented. Connection detected.",
        };
      })(),
    );
    taskLabels.push("helium10");
  }
  if (jungle?.credentials && keywords) {
    parallelTasks.push(
      (async () => {
        return {
          status: "stub",
          note: "Jungle Scout integration not yet implemented. Connection detected.",
        };
      })(),
    );
    taskLabels.push("jungle_scout");
  }

  const settled = await Promise.allSettled(parallelTasks);
  settled.forEach((res, idx) => {
    const label = taskLabels[idx];
    raw[label] = res.status === "fulfilled" ? res.value : { error: String((res as PromiseRejectedResult).reason) };
    if (res.status === "fulfilled") sourcesUsed.push(label);
  });

  raw.keywords = keywords;

  // Step 4: AI analysis
  let aiAnalysis: Record<string, unknown> | null = null;
  try {
    aiAnalysis = await invokeFunction(
      "ai-research-analyst",
      { marketplace, asin, description, ...raw },
      authHeader,
    );
    sourcesUsed.push("ai");
  } catch (err) {
    aiAnalysis = { error: String(err) };
  }

  const viabilityScore =
    typeof aiAnalysis?.viability_score === "number"
      ? (aiAnalysis.viability_score as number)
      : null;
  const recommendation =
    typeof aiAnalysis?.recommendation === "string"
      ? (aiAnalysis.recommendation as string)
      : null;

  // Step 5: persist report
  const { data: inserted, error: insertErr } = await supabase
    .from("research_reports")
    .insert({
      org_id: orgId,
      project_id: projectId,
      input_asin: asin || null,
      input_description: description || null,
      marketplace,
      sources_used: sourcesUsed,
      raw_data: raw,
      ai_analysis: aiAnalysis ?? {},
      viability_score: viabilityScore,
      recommendation,
      created_by: user.id,
    })
    .select("id, created_at")
    .maybeSingle();

  if (insertErr) {
    return jsonResponse(
      {
        error: "persist_failed",
        detail: insertErr.message,
        ai_analysis: aiAnalysis,
        raw_data: raw,
      },
      200,
    );
  }

  return jsonResponse(
    {
      report_id: inserted?.id ?? null,
      created_at: inserted?.created_at ?? null,
      marketplace,
      asin: asin || null,
      description: description || null,
      keywords,
      sources_used: sourcesUsed,
      ai_analysis: aiAnalysis,
      raw_data: raw,
    },
    200,
  );
});
