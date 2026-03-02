-- =============================================================================
-- F4.1 — Logistics Core Schema (GLOBAL, Amazon-ready)
-- Shipments / Shipment Legs / Packages / Tracking Events
-- =============================================================================

-- 1) ENUMS (create if not exists)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_status') THEN
    CREATE TYPE public.shipment_status AS ENUM (
      'draft',
      'in_transit',
      'customs',
      'delivered',
      'exception',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_destination_type') THEN
    CREATE TYPE public.shipment_destination_type AS ENUM (
      'warehouse',
      'amazon_fba'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_leg_type') THEN
    CREATE TYPE public.shipment_leg_type AS ENUM (
      'pickup',
      'main',
      'customs',
      'last_mile'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'package_status') THEN
    CREATE TYPE public.package_status AS ENUM (
      'pending',
      'in_transit',
      'delivered',
      'exception',
      'cancelled'
    );
  END IF;
END;
$$;

-- 2) TABLE shipments

CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,

  origin_country char(2),
  destination_country char(2),

  destination_type public.shipment_destination_type NOT NULL,
  destination_warehouse_id uuid NULL,
  destination_amazon_fc_code text NULL,
  destination_amazon_shipment_id text NULL,
  destination_amazon_marketplace text NULL,

  shipping_type text NULL,
  incoterm text NULL,
  forwarder_name text NULL,

  eta_estimated timestamptz NULL,
  eta_last_calculated timestamptz NULL,

  status public.shipment_status NOT NULL DEFAULT 'draft',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipments_org ON public.shipments(org_id);
CREATE INDEX IF NOT EXISTS idx_shipments_po ON public.shipments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_org_status ON public.shipments(org_id, status);
CREATE INDEX IF NOT EXISTS idx_shipments_org_created_at_desc ON public.shipments(org_id, created_at DESC);

-- 3) TABLE shipment_legs

CREATE TABLE IF NOT EXISTS public.shipment_legs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,

  sequence_number int NOT NULL,
  leg_type public.shipment_leg_type NOT NULL,

  origin_location text,
  destination_location text,
  transport_mode text,

  departure_date timestamptz,
  arrival_date timestamptz,

  status public.shipment_status NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_legs_org ON public.shipment_legs(org_id);
CREATE INDEX IF NOT EXISTS idx_shipment_legs_shipment ON public.shipment_legs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_legs_sequence ON public.shipment_legs(shipment_id, sequence_number);

-- 4) TABLE packages

CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,

  carrier_name text,
  tracking_number text,

  weight_kg numeric,
  cartons int,

  status public.package_status NOT NULL DEFAULT 'pending',

  last_tracking_status text,
  last_tracking_sync_at timestamptz,
  next_sync_due_at timestamptz,

  delivered_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_packages_org ON public.packages(org_id);
CREATE INDEX IF NOT EXISTS idx_packages_shipment ON public.packages(shipment_id);
CREATE INDEX IF NOT EXISTS idx_packages_org_status ON public.packages(org_id, status);
CREATE INDEX IF NOT EXISTS idx_packages_org_next_sync_due ON public.packages(org_id, next_sync_due_at);
CREATE INDEX IF NOT EXISTS idx_packages_tracking_number ON public.packages(tracking_number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_packages_org_tracking_unique
  ON public.packages(org_id, tracking_number)
  WHERE tracking_number IS NOT NULL;

-- 5) TABLE tracking_events (append-only)

CREATE TABLE IF NOT EXISTS public.tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,

  event_time timestamptz NOT NULL,
  location text,
  status_code text,
  status_description text,

  raw_payload jsonb,
  source text NOT NULL DEFAULT '17track',

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT tracking_events_dedupe UNIQUE (package_id, event_time, status_code, location)
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_org ON public.tracking_events(org_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_package ON public.tracking_events(package_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_package_event_time_desc ON public.tracking_events(package_id, event_time DESC);

-- 6) RLS ENABLE + POLICIES (Model C: member / owner_or_admin / owner-only delete)

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

-- Shipments

DROP POLICY IF EXISTS "shipments_select_model_c" ON public.shipments;
CREATE POLICY "shipments_select_model_c"
  ON public.shipments
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "shipments_insert_model_c" ON public.shipments;
CREATE POLICY "shipments_insert_model_c"
  ON public.shipments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_owner_or_admin(org_id));

DROP POLICY IF EXISTS "shipments_update_model_c" ON public.shipments;
CREATE POLICY "shipments_update_model_c"
  ON public.shipments
  FOR UPDATE
  TO authenticated
  USING (public.is_org_owner_or_admin(org_id))
  WITH CHECK (public.is_org_owner_or_admin(org_id));

DROP POLICY IF EXISTS "shipments_delete_model_c" ON public.shipments;
CREATE POLICY "shipments_delete_model_c"
  ON public.shipments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships om
      WHERE om.org_id = public.shipments.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );

-- Shipment Legs

DROP POLICY IF EXISTS "shipment_legs_select_model_c" ON public.shipment_legs;
CREATE POLICY "shipment_legs_select_model_c"
  ON public.shipment_legs
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "shipment_legs_insert_model_c" ON public.shipment_legs;
CREATE POLICY "shipment_legs_insert_model_c"
  ON public.shipment_legs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_owner_or_admin(org_id));

DROP POLICY IF EXISTS "shipment_legs_update_model_c" ON public.shipment_legs;
CREATE POLICY "shipment_legs_update_model_c"
  ON public.shipment_legs
  FOR UPDATE
  TO authenticated
  USING (public.is_org_owner_or_admin(org_id))
  WITH CHECK (public.is_org_owner_or_admin(org_id));

DROP POLICY IF EXISTS "shipment_legs_delete_model_c" ON public.shipment_legs;
CREATE POLICY "shipment_legs_delete_model_c"
  ON public.shipment_legs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships om
      WHERE om.org_id = public.shipment_legs.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );

-- Packages

DROP POLICY IF EXISTS "packages_select_model_c" ON public.packages;
CREATE POLICY "packages_select_model_c"
  ON public.packages
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "packages_insert_model_c" ON public.packages;
CREATE POLICY "packages_insert_model_c"
  ON public.packages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_owner_or_admin(org_id));

DROP POLICY IF EXISTS "packages_update_model_c" ON public.packages;
CREATE POLICY "packages_update_model_c"
  ON public.packages
  FOR UPDATE
  TO authenticated
  USING (public.is_org_owner_or_admin(org_id))
  WITH CHECK (public.is_org_owner_or_admin(org_id));

DROP POLICY IF EXISTS "packages_delete_model_c" ON public.packages;
CREATE POLICY "packages_delete_model_c"
  ON public.packages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships om
      WHERE om.org_id = public.packages.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );

-- Tracking Events

DROP POLICY IF EXISTS "tracking_events_select_model_c" ON public.tracking_events;
CREATE POLICY "tracking_events_select_model_c"
  ON public.tracking_events
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "tracking_events_insert_model_c" ON public.tracking_events;
CREATE POLICY "tracking_events_insert_model_c"
  ON public.tracking_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_owner_or_admin(org_id));

DROP POLICY IF EXISTS "tracking_events_update_model_c" ON public.tracking_events;
CREATE POLICY "tracking_events_update_model_c"
  ON public.tracking_events
  FOR UPDATE
  TO authenticated
  USING (public.is_org_owner_or_admin(org_id))
  WITH CHECK (public.is_org_owner_or_admin(org_id));

DROP POLICY IF EXISTS "tracking_events_delete_model_c" ON public.tracking_events;
CREATE POLICY "tracking_events_delete_model_c"
  ON public.tracking_events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships om
      WHERE om.org_id = public.tracking_events.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );

-- 7) REVOKE anon/authenticated (RLS + explicit policies only)

REVOKE ALL ON TABLE public.shipments FROM anon;
REVOKE ALL ON TABLE public.shipments FROM authenticated;

REVOKE ALL ON TABLE public.shipment_legs FROM anon;
REVOKE ALL ON TABLE public.shipment_legs FROM authenticated;

REVOKE ALL ON TABLE public.packages FROM anon;
REVOKE ALL ON TABLE public.packages FROM authenticated;

REVOKE ALL ON TABLE public.tracking_events FROM anon;
REVOKE ALL ON TABLE public.tracking_events FROM authenticated;

