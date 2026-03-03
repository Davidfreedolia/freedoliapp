import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseOps = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export type OpsEventPayload = {
  org_id?: string | null;
  source: "edge" | "worker" | "rpc" | "db" | "system";
  event_type: string;
  severity?: "info" | "warn" | "error" | "critical";
  entity_type?: string | null;
  entity_id?: string | null;
  message: string;
  meta?: unknown;
};

export async function logOpsEvent(payload: OpsEventPayload) {
  try {
    const { org_id = null, source, event_type, severity = "info", entity_type = null, entity_id = null, message, meta = null } =
      payload;

    const { error } = await supabaseOps.from("ops_events").insert({
      org_id,
      source,
      event_type,
      severity,
      entity_type,
      entity_id,
      message,
      meta,
    });
    if (error) {
      console.error("[opsEvents] insert error", error);
    }
  } catch (err) {
    console.error("[opsEvents] unexpected error", err);
  }
}

