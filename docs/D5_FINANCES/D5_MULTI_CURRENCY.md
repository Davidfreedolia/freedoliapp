# D5 — Multi-Currency Model (Base Currency + Exchange Rates)

## 1. Objectiu

Proporcionar un model multimoneda per org que permeti:

- Fixar una **moneda base** per org (`org_settings.base_currency`).
- Emmagatzemar moviments en **moneda original** + imports convertits a base (`amount_base_*`).
- Gestionar **tipus de canvi diaris** amb:
  - origen oficial (ECB/Frankfurter).
  - overrides manuals (`manual_override`).
- Bloquejar la moneda base un cop hi ha moviments `posted/locked`.

## 2. org_settings.base_currency

### 2.1 Esquema

```sql
CREATE TABLE public.org_settings (
  org_id uuid PRIMARY KEY REFERENCES public.orgs(id) ON DELETE CASCADE,
  base_currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_settings_base_currency_iso CHECK (
    base_currency IS NOT NULL
    AND char_length(base_currency) = 3
    AND base_currency = upper(base_currency)
  )
);
```

### 2.2 RLS

- `SELECT`: `is_org_member(org_id)`.
- `INSERT/UPDATE`: `is_org_owner_or_admin(org_id)`.

### 2.3 Trigger updated_at

```sql
CREATE FUNCTION public.set_org_settings_updated_at() RETURNS trigger ...
CREATE TRIGGER org_settings_set_updated_at
BEFORE UPDATE ON public.org_settings
FOR EACH ROW EXECUTE FUNCTION public.set_org_settings_updated_at();
```

### 2.4 Guard base_currency_lock (F5.10)

```sql
CREATE OR REPLACE FUNCTION public.org_settings_base_currency_guard()
RETURNS trigger AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF NEW.base_currency IS DISTINCT FROM OLD.base_currency THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.financial_ledger l
      WHERE l.org_id = OLD.org_id
        AND l.status IN ('posted', 'locked')
      LIMIT 1
    )
    INTO v_exists;

    IF v_exists THEN
      RAISE EXCEPTION 'base_currency_locked';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Aplicació:

```sql
CREATE TRIGGER org_settings_base_currency_guard_trg
BEFORE UPDATE ON public.org_settings
FOR EACH ROW
EXECUTE FUNCTION public.org_settings_base_currency_guard();
```

## 3. exchange_rates_daily

### 3.1 Esquema

```sql
CREATE TABLE public.exchange_rates_daily (
  id bigserial PRIMARY KEY,
  base_currency text NOT NULL DEFAULT 'EUR',
  currency text NOT NULL,
  rate_date date NOT NULL,
  rate_to_base numeric(18,8) NOT NULL CHECK (rate_to_base > 0),
  source text NOT NULL DEFAULT 'ecb' CHECK (source IN ('ecb','manual_override')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exchange_rates_daily_base_currency_iso CHECK (
    base_currency IS NOT NULL
    AND char_length(base_currency) = 3
    AND base_currency = upper(base_currency)
  ),
  CONSTRAINT exchange_rates_daily_currency_iso CHECK (
    currency IS NOT NULL
    AND char_length(currency) = 3
    AND currency = upper(currency)
  ),
  CONSTRAINT exchange_rates_daily_unique_per_day UNIQUE (rate_date, base_currency, currency)
);
```

Indexos:

```sql
CREATE INDEX idx_exchange_rates_daily_rate_date ON public.exchange_rates_daily(rate_date);
CREATE INDEX idx_exchange_rates_daily_currency ON public.exchange_rates_daily(currency);
```

RLS:

- `SELECT` → `authenticated` (rates públiques dins l’app).
- `INSERT/UPDATE` → només via service role / processos interns.

## 4. Helper RPC: get_exchange_rate_to_base

### 4.1 Contracte

```sql
CREATE FUNCTION public.get_exchange_rate_to_base(
  p_date date,
  p_currency text,
  p_base text DEFAULT 'EUR'
) RETURNS numeric;
```

### 4.2 Implementació

```sql
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
BEGIN
  IF p_currency IS NULL OR p_base IS NULL OR p_date IS NULL THEN
    RAISE EXCEPTION 'missing_exchange_rate';
  END IF;

  -- exact
  SELECT rate_to_base INTO v_rate
  FROM public.exchange_rates_daily
  WHERE rate_date = p_date
    AND currency = upper(p_currency)
    AND base_currency = upper(p_base)
  LIMIT 1;

  IF v_rate IS NULL THEN
    -- fallback ≤ date
    SELECT rate_to_base INTO v_rate
    FROM public.exchange_rates_daily
    WHERE rate_date <= p_date
      AND currency = upper(p_currency)
      AND base_currency = upper(p_base)
    ORDER BY rate_date DESC
    LIMIT 1;
  END IF;

  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'missing_exchange_rate';
  END IF;

  RETURN v_rate;
END;
$$;
```

### 4.3 Ús a Edge

- `generate-quarter-pack`:
  - abans de generar CSV del ledger:
    - si detecta `rate_pnl` o `rate_cash` nul·les/0:
      - crida `get_exchange_rate_to_base` amb `occurred_at` / `cash_at` i `currency_original` / `base_currency`.
      - recalcula imports base.
    - si segueix sense rate → marca job `failed` amb error `missing_exchange_rate`.

## 5. Decisions i guardrails

- **No hi ha revaloritzacions massives**:
  - Els imports base (`amount_base_*`) es calculen en el moment del registre i no es re-genereixen globalment.
- **Base currency immutable després de posting**:
  - Evita que canvis de moneda base malmetin històrics.
- **Typus de canvi monotònic**:
  - Només s’afegeixen files; no es “reescriu” històric de `exchange_rates_daily`.
- **missing_exchange_rate**:
  - Es tracta com error dur a Edge i trava l’export, obligant a completar rates abans de pack oficial.

## 6. Definition of Done (multicurrency)

- Cada org té `base_currency` ISO-3 validada i bloquejable.
- `exchange_rates_daily` conté l’històric necessari (ecb + overrides).
- `get_exchange_rate_to_base` és l’única abstracció que coneix Edge / RPCs per consultar rates.
- Els packs trimestrals no poden generar-se sense rates completes (o bé fallen amb missatge explícit).

