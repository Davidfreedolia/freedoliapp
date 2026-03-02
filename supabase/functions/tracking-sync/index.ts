import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TRACKING_17TRACK_TOKEN = Deno.env.get("TRACKING_17TRACK_TOKEN") || "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const MAX_ORGS_PER_RUN = 20;
const MAX_PACKAGES_PER_ORG = 40;

type PackageRow = {
  id: string;
  org_id: string;
  shipment_id: string;
  tracking_number: string | null;
  status: string;
};

type TrackingEventInput = {
  event_time: string;
  location: string | null;
  status_code: string | null;
  status_description: string | null;
  raw_payload: unknown;
};

async function fetchOrgsWithDuePackages() {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("packages")
    .select("org_id")
    .not("tracking_number", "is", null)
    .neq("status", "delivered")
    .or(`next_sync_due_at.is.null,next_sync_due_at.lte.${nowIso}`)
    .order("org_id", { ascending: true })
    .limit(200);

  if (error) throw error;
  const orgIds = Array.from(new Set((data || []).map((row: any) => row.org_id))).slice(
    0,
    MAX_ORGS_PER_RUN,
  );
  return orgIds;
}

async function loadOrgState(orgId: string) {
  const { data, error } = await supabaseAdmin
    .from("tracking_org_state")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertOrgState(orgId: string, patch: Partial<{
  backoff_until: string | null;
  error_count: number;
  last_error_code: string | null;
}>) {
  const { error } = await supabaseAdmin
    .from("tracking_org_state")
    .upsert(
      {
        org_id: orgId,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" },
    );
  if (error) throw error;
}

async function loadDuePackagesForOrg(orgId: string): Promise<PackageRow[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("packages")
    .select("id, org_id, shipment_id, tracking_number, status")
    .eq("org_id", orgId)
    .not("tracking_number", "is", null)
    .neq("status", "delivered")
    .or(`next_sync_due_at.is.null,next_sync_due_at.lte.${nowIso}`)
    .order("next_sync_due_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .limit(MAX_PACKAGES_PER_ORG);

  if (error) throw error;
  return (data || []) as PackageRow[];
}

async function call17TrackBatch(
  packages: PackageRow[],
): Promise<Record<string, TrackingEventInput[]>> {
  // Placeholder 17TRACK client — expects TRACKING_17TRACK_TOKEN in env
  if (!TRACKING_17TRACK_TOKEN || packages.length === 0) {
    return {};
  }

  const payload = {
    numbers: packages
      .map((p) => p.tracking_number)
      .filter((v): v is string => !!v),
  };

  // NOTE: Replace URL and response parsing with real 17TRACK API
  const resp = await fetch("https://api.17track.net/mock/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "17track-api-key": TRACKING_17TRACK_TOKEN,
    },
    body: JSON.stringify(payload),
  });

  if (resp.status === 429) {
    const err: any = new Error("17TRACK rate limited");
    err.status = 429;
    throw err;
  }
  if (resp.status >= 500) {
    const err: any = new Error(`17TRACK server error: ${resp.status}`);
    err.status = resp.status;
    throw err;
  }

  const json = await resp.json().catch(() => ({}));

  const result: Record<string, TrackingEventInput[]> = {};
  const list = Array.isArray(json?.results) ? json.results : [];

  for (const item of list) {
    const trackingNumber = String(item.tracking_number || item.number || "");
    if (!trackingNumber) continue;
    const events = Array.isArray(item.events) ? item.events : [];
    result[trackingNumber] = events.map((e: any) => ({
      event_time: e.event_time || e.time || new Date().toISOString(),
      location: e.location || e.place || null,
      status_code: e.status_code || e.code || null,
      status_description: e.status_description || e.desc || null,
      raw_payload: e,
    }));
  }

  return result;
}

// Map 17TRACK status codes to package_status enum: pending | in_transit | delivered | exception | cancelled
function derivePackageStatusFromEvents(events: TrackingEventInput[], currentStatus: string): {
  status: string;
  delivered_at: string | null;
} {
  let status = currentStatus;
  let delivered_at: string | null = null;

  for (const ev of events) {
    const code = (ev.status_code || "").toLowerCase();
    if (code.includes("delivered")) {
      status = "delivered";
      delivered_at = ev.event_time;
    } else if (code.includes("exception")) {
      status = "exception";
    } else if (code.includes("customs") || code.includes("out_for_delivery")) {
      status = "in_transit";
    } else if (code.includes("in_transit")) {
      status = "in_transit";
    } else if (code.includes("invalid")) {
      status = "exception";
    }
  }

  return { status, delivered_at };
}

async function recomputeShipmentStatus(shipmentId: string) {
  const { data, error } = await supabaseAdmin
    .from("packages")
    .select("status")
    .eq("shipment_id", shipmentId);
  if (error) throw error;

  const statuses = (data || []).map((r: any) => r.status);
  if (!statuses.length) return;

  let derived: string | null = null;
  if (statuses.every((s) => s === "delivered")) {
    derived = "delivered";
  } else if (statuses.some((s) => s === "exception")) {
    derived = "exception";
  } else if (statuses.some((s) => s === "customs")) {
    derived = "customs";
  } else if (statuses.some((s) => s === "in_transit")) {
    derived = "in_transit";
  }

  if (!derived) return;

  // Do not override cancelled
  const { data: ship, error: shipErr } = await supabaseAdmin
    .from("shipments")
    .select("status")
    .eq("id", shipmentId)
    .maybeSingle();
  if (shipErr || !ship) return;
  if (ship.status === "cancelled") return;

  if (ship.status !== derived) {
    await supabaseAdmin
      .from("shipments")
      .update({ status: derived, updated_at: new Date().toISOString() })
      .eq("id", shipmentId);
  }
}

async function processOrg(orgId: string): Promise<{
  packagesProcessed: number;
  eventsInserted: number;
  backoffApplied: boolean;
}> {
  const nowIso = new Date().toISOString();
  const orgState = await loadOrgState(orgId);
  if (orgState?.backoff_until && new Date(orgState.backoff_until) > new Date()) {
    return { packagesProcessed: 0, eventsInserted: 0, backoffApplied: true };
  }

  const packages = await loadDuePackagesForOrg(orgId);
  if (!packages.length) {
    if (orgState && (orgState.error_count || orgState.backoff_until)) {
      await upsertOrgState(orgId, { error_count: 0, backoff_until: null, last_error_code: null });
    }
    return { packagesProcessed: 0, eventsInserted: 0, backoffApplied: false };
  }

  const byTracking = await call17TrackBatch(packages);

  let eventsInserted = 0;
  try {
    for (const pkg of packages) {
      const tn = pkg.tracking_number;
      if (!tn) continue;
      const events = byTracking[tn] || [];
      if (events.length) {
        const rows = events.map((ev) => ({
          org_id: orgId,
          package_id: pkg.id,
          event_time: ev.event_time,
          location: ev.location,
          status_code: ev.status_code,
          status_description: ev.status_description,
          raw_payload: ev.raw_payload,
        }));
        const { error: insertErr } = await supabaseAdmin
          .from("tracking_events")
          .upsert(rows, {
            onConflict: "package_id,event_time,status_code,location",
            ignoreDuplicates: true,
          });
        if (insertErr) throw insertErr;
        eventsInserted += rows.length;
      }

      const { status: newStatus, delivered_at } = derivePackageStatusFromEvents(events, pkg.status);

      let nextSync: string | null = null;
      if (newStatus === "delivered") {
        nextSync = null;
      } else if (events.length > 0 && newStatus !== pkg.status) {
        nextSync = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      } else {
        nextSync = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
      }

      const updatePatch: any = {
        last_tracking_sync_at: nowIso,
        next_sync_due_at: nextSync,
        updated_at: nowIso,
      };
      if (events.length) {
        updatePatch.last_tracking_status = events[events.length - 1].status_description || null;
      }
      if (newStatus !== pkg.status) {
        updatePatch.status = newStatus;
      }
      if (delivered_at) {
        updatePatch.delivered_at = delivered_at;
      }

      await supabaseAdmin.from("packages").update(updatePatch).eq("id", pkg.id);
      await recomputeShipmentStatus(pkg.shipment_id);
    }

    if (orgState && (orgState.error_count || orgState.backoff_until)) {
      await upsertOrgState(orgId, { error_count: 0, backoff_until: null, last_error_code: null });
    }

    return {
      packagesProcessed: packages.length,
      eventsInserted,
      backoffApplied: false,
    };
  } catch (err: any) {
    const status = err?.status || 0;
    let errorCount = (orgState?.error_count ?? 0) + 1;
    let backoffUntil: string | null = null;
    let lastErrorCode: string | null = status ? String(status) : "error";

    if (status === 429) {
      backoffUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    } else if (status >= 500 || status === 0) {
      if (errorCount >= 5) {
        backoffUntil = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
      }
    }

    await upsertOrgState(orgId, {
      error_count: errorCount,
      backoff_until: backoffUntil,
      last_error_code: lastErrorCode,
    });

    console.error("[tracking-sync] Error processing org", orgId, err);
    return {
      packagesProcessed: 0,
      eventsInserted: 0,
      backoffApplied: !!backoffUntil,
    };
  }
}

async function runGlobalSync() {
  const orgIds = await fetchOrgsWithDuePackages();
  let totalPackages = 0;
  let totalEvents = 0;
  let backoffCount = 0;

  for (const orgId of orgIds) {
    const res = await processOrg(orgId);
    totalPackages += res.packagesProcessed;
    totalEvents += res.eventsInserted;
    if (res.backoffApplied) backoffCount += 1;
  }

  return {
    orgs_considered: orgIds.length,
    orgs_processed: orgIds.length,
    packages_processed: totalPackages,
    events_inserted: totalEvents,
    orgs_backoffed: backoffCount,
  };
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "POST") {
      const result = await runGlobalSync();
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (err) {
    console.error("[tracking-sync] Unhandled error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

