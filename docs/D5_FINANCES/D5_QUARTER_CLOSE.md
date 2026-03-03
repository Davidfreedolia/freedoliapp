# D5 — Quarter Close (F5.3–F5.4)

## 1. Objectiu

Definir el **procés de tancament trimestral**:

- Marcar períodes com a `open` o `locked`.
- Impedir modificacions de ledger en períodes tancats.
- Lligar el tancament a l’**export “oficial”** (packs locked).
- Permetre pack **provisional** per períodes oberts.

## 2. accounting_periods

### 2.1 Esquema

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

### 2.2 RLS

- `SELECT` → `is_org_member(org_id)`.
- `INSERT/UPDATE` → `is_org_owner_or_admin(org_id)`.

### 2.3 updated_at trigger

```sql
CREATE FUNCTION public.set_accounting_periods_updated_at() RETURNS trigger ...
CREATE TRIGGER accounting_periods_set_updated_at
BEFORE UPDATE ON public.accounting_periods
FOR EACH ROW EXECUTE FUNCTION public.set_accounting_periods_updated_at();
```

## 3. Lock semantics

- **Open**:
  - El ledger del període es pot seguir modificant (`draft`/`posted`).
  - Els packs generats tenen `period_status='open'` → **provisionals**.
- **Locked**:
  - El ledger del període queda protegit via trigger:
    - `financial_ledger_period_lock_guard` impedeix `UPDATE`/`DELETE`.
  - Només es poden reflectir correccions mitjançant nous moviments (`adjustment`) en períodes futurs.
  - Els packs generats amb `period_status='locked'` són **oficials**.

## 4. Period Lock Guard

Lògica resumida (veure `D5_LEDGER_ARCHITECTURE` per detalls complets):

```sql
IF EXISTS (
  SELECT 1
  FROM accounting_periods ap
  WHERE ap.org_id = v_org_id
    AND ap.status = 'locked'
    AND ap.year = year(v_date)
    AND ap.quarter = quarter(v_date)
) THEN
  RAISE EXCEPTION 'period_locked';
END IF;
```

- Es dispara BEFORE UPDATE/DELETE a `financial_ledger`.
- Manté la integritat comptable un cop el període està tancat.

## 5. Quarter Lock → Export Pack

### 5.1 enqueue_quarter_pack

```sql
CREATE FUNCTION public.enqueue_quarter_pack(p_org_id uuid, p_year int, p_quarter int) RETURNS void;
```

Lògica:

- Llegeix `base_currency` de `org_settings` (default `'EUR'`).
- Comprova si **ja existeix** un job `done` per:

```sql
WHERE org_id = p_org_id
  AND year = p_year
  AND quarter = p_quarter
  AND period_status = 'locked'
  AND base_currency = v_base_currency
  AND status = 'done'
```

- Si existeix → `RETURN` (no re-genera pack locked).
- Sinó:
  - Crea `quarterly_export_jobs` amb:
    - `period_status = 'locked'`
    - `status = 'queued'`
    - `base_currency = v_base_currency`

### 5.2 Trigger AFTER UPDATE

```sql
CREATE TRIGGER accounting_periods_after_lock_quarter_pack
AFTER UPDATE ON public.accounting_periods
FOR EACH ROW
WHEN (OLD.status = 'open' AND NEW.status = 'locked')
EXECUTE FUNCTION public.accounting_periods_enqueue_quarter_pack_trg();
```

- Es dispara quan un període passa d’`open` a `locked`.
- Envia un *enqueue* a la cua de jobs d’export.

## 6. Semàntica “oficial” vs “provisional”

- Els RPCs trimestrals (`pnl_quarterly`, `cashflow_quarterly`, `ledger_export_quarterly`, `ledger_reconciliation_quarterly`) sempre calculen els totals sobre el **ledger real**.
- El camp `period_status` es deriva de:
  - `accounting_periods.status` si hi ha fila (`open`/`locked`).
  - `'open'` per defecte si no hi ha registre.

### 6.1 Packs

- `period_status='open'`:
  - Export **provisional** (útil per QA / pre-tancament).
- `period_status='locked'`:
  - Export **oficial**:
    - Generat automàticament al lock via `enqueue_quarter_pack` + worker.
    - Si ja n’hi ha un `done`, no es re-generen automàticament.
    - Es pot seguir generant packs provisionals via `request_quarter_pack` amb `period_status='open'` (si es desitja).

## 7. Definition of Done (quarter close)

- Cada trimestre d’una org està representat com a (org_id, year, quarter, status).
- El canvi `open → locked`:
  - Bloqueja els moviments de ledger del període.
  - Engega l’export locked (pack oficial).
- Els exports poden informar clarament:
  - `period_status='open'` → provisional.
  - `period_status='locked'` → oficial.

