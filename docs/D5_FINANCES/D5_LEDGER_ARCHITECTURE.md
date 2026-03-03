# D5 — Financial Ledger Architecture (F5.1–F5.4)

## 1. Objectiu

Definir un **ledger financer multimoneda** per org capaç de:

- Representar moviments a nivell **companyia vs projecte** (`scope`).
- Separar clarament:
  - **Devengament (P&L)** → `occurred_at`, `rate_pnl`, `amount_base_pnl`.
  - **Caixa (cashflow)** → `cash_at`, `rate_cash`, `amount_base_cash`.
- Permetre reconciliació amb sistemes externs via `reference_type` / `reference_id`.
- Ser SaaS-ready amb `org_id` + RLS multi-tenant.

## 2. Tipus i taules

### 2.1 Enums

```sql
CREATE TYPE public.financial_scope AS ENUM ('company', 'project');
CREATE TYPE public.financial_status AS ENUM ('draft', 'posted', 'locked');
CREATE TYPE public.financial_event_type AS ENUM ('income', 'expense', 'transfer', 'adjustment');
```

### 2.2 Taula `financial_ledger`

```sql
CREATE TABLE public.financial_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  scope public.financial_scope NOT NULL,
  project_id uuid NULL REFERENCES public.projects(id) ON DELETE SET NULL,
  type public.financial_event_type NOT NULL,
  status public.financial_status NOT NULL DEFAULT 'draft',
  occurred_at date NOT NULL,
  cash_at date NULL,

  amount_original numeric(18,2) NOT NULL,
  currency_original text NOT NULL,

  rate_pnl numeric(18,8) NOT NULL CHECK (rate_pnl > 0),
  amount_base_pnl numeric(18,2) NOT NULL,

  rate_cash numeric(18,8) NULL CHECK (rate_cash > 0),
  amount_base_cash numeric(18,2) NULL,

  reference_type text NULL,
  reference_id uuid NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  posted_by uuid NULL REFERENCES auth.users(id),
  locked_by uuid NULL REFERENCES auth.users(id),

  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT financial_ledger_scope_project_coherence CHECK (
    (scope = 'company' AND project_id IS NULL)
    OR (scope = 'project' AND project_id IS NOT NULL)
  )
);
```

#### Idempotència per referències

```sql
CREATE UNIQUE INDEX idx_financial_ledger_ref_unique
ON public.financial_ledger(org_id, reference_type, reference_id, type)
WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;
```

### 2.3 Indexos

- `idx_financial_ledger_org_occurred_at (org_id, occurred_at)`
- `idx_financial_ledger_org_cash_at (org_id, cash_at)`
- `idx_financial_ledger_org_scope (org_id, scope)`
- `idx_financial_ledger_project_id (project_id)`

## 3. RLS i access control

```sql
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_ledger_select_scoped"
  ON public.financial_ledger
  FOR SELECT
  TO authenticated
  USING (
    (
      scope = 'company'
      AND public.is_org_owner_or_admin(org_id)
    ) OR (
      scope = 'project'
      AND public.is_org_member(org_id)
    )
  );

REVOKE ALL ON TABLE public.financial_ledger FROM PUBLIC;
REVOKE ALL ON TABLE public.financial_ledger FROM anon;
REVOKE ALL ON TABLE public.financial_ledger FROM authenticated;
```

- **INSERT/UPDATE/DELETE**:  
  - No hi ha cap policy per `authenticated`.  
  - Només service role o RPCs SECURITY DEFINER poden modificar el ledger.
- **Lectura**:
  - `company` scope reservat a finance viewer (owner/admin/accountant).
  - `project` scope visible a membres de l’org (més permissiu, p. ex. per vistes de projecte).

## 4. Period Lock

### 4.1 `accounting_periods`

```sql
CREATE TABLE public.accounting_periods (
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  year int NOT NULL,
  quarter int NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked')),
  locked_at timestamptz,
  locked_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, year, quarter)
);
```

`status='locked'` significa que el període és **oficial**:

- No s’hi poden fer canvis de ledger (`UPDATE`/`DELETE`).
- S’activa l’automatització de generació de pack trimestral.

### 4.2 Trigger de bloqueig

```sql
CREATE OR REPLACE FUNCTION public.financial_ledger_period_lock_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_id uuid;
  v_date date;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_org_id := COALESCE(NEW.org_id, OLD.org_id);
    v_date := COALESCE(NEW.occurred_at, OLD.occurred_at);
  ELSE
    v_org_id := OLD.org_id;
    v_date := OLD.occurred_at;
  END IF;

  IF v_org_id IS NULL OR v_date IS NULL THEN
    IF TG_OP = 'UPDATE' THEN
      RETURN NEW;
    ELSE
      RETURN OLD;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.accounting_periods ap
    WHERE ap.org_id = v_org_id
      AND ap.status = 'locked'
      AND ap.year = EXTRACT(YEAR FROM v_date)::int
      AND ap.quarter = (( (EXTRACT(MONTH FROM v_date)::int - 1) / 3 ) + 1)
  ) THEN
    RAISE EXCEPTION 'period_locked';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  ELSE
    RETURN OLD;
  END IF;
END;
$$;
```

Aplicació:

```sql
CREATE TRIGGER financial_ledger_period_lock_guard_trg
BEFORE UPDATE OR DELETE ON public.financial_ledger
FOR EACH ROW
EXECUTE FUNCTION public.financial_ledger_period_lock_guard();
```

## 5. Decisions clau

- **Separació devengament/caixa**:
  - Evita barreges conceptuals; permet informes P&L i cashflow independents.
- **Idempotència per referències**:
  - Garanteix que integracions externes (p. ex. ingestió de vendes, ordres) no creïn duplicats.
- **Scope `company` vs `project`**:
  - Facilita vistes agregades per org i drill-down per projecte sense duplicar taules.
- **Period lock hard**:
  - No es permet reobrir el període via UPDATE/DELETE; només via nous moviments (adjustments) a futurs períodes.

## 6. Definition of Done (ledger)

- Tots els moviments financers passen per `financial_ledger` amb:
  - `org_id`, `scope`, `type`, `status`, dates, imports original/base.
- RLS aplicada i verificada en mode SaaS (multi-tenant).
- Period lock aplicat i testejat:
  - Canvis en períodes `locked` → `period_locked`.
- RPCs trimestrals utilitzen exclusivament aquest ledger com a font única de veritat.

