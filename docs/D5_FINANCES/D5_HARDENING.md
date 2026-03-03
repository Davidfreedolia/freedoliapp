# D5 — Hardening & Guardrails (F5.9–F5.10)

## 1. Objectiu

Documentar tots els **mecanismes de protecció** introduïts a F5 per:

- Evitar canvis destructius en dades financeres oficials.
- Forçar tipus de canvi coherents.
- Bloquejar mutations un cop hi ha tancaments i exports “locked”.
- Garantir que els packs trimestrals són reproduïbles i auditables.

## 2. Base currency lock

### 2.1 Problema

Canviar `org_settings.base_currency` després de tenir moviments `posted/locked` pot fer que:

- Els imports base històrics (P&L, Cash) perdin sentit.
- Exportacions anteriors deixin de ser “recalculables” de forma coherent.

### 2.2 Solució

Trigger `org_settings_base_currency_guard`:

```sql
IF NEW.base_currency IS DISTINCT FROM OLD.base_currency THEN
  SELECT EXISTS (
    SELECT 1
    FROM public.financial_ledger l
    WHERE l.org_id = OLD.org_id
      AND l.status IN ('posted', 'locked')
  ) INTO v_exists;

  IF v_exists THEN
    RAISE EXCEPTION 'base_currency_locked';
  END IF;
END IF;
```

Efector:

- En orgs amb ledger `posted` o `locked`, la `base_currency` és **immòbil**.
- Es permet canviar-la només:
  - abans d’haver registrat cap moviment oficial.

## 3. Period lock (ledger)

### 3.1 Trigger BEFORE UPDATE/DELETE

`financial_ledger_period_lock_guard` bloqueja qualsevol canvi (excepte inserts) per files:

- que pertanyen a un període `locked` a `accounting_periods`.

Efectes:

- No es pot “editar” l’històric d’un trimestre tancat.
- Ajustos posteriors sempre es registren com a **nous moviments** (ex: `adjustment` en períodes oberts).

## 4. Export packs locked i no-regeneració

### 4.1 Automatització al lock

`enqueue_quarter_pack(p_org_id, p_year, p_quarter)`:

- Deriva `base_currency`.
- Comprova si ja hi ha job:

```sql
WHERE org_id = p_org_id
  AND year = p_year
  AND quarter = p_quarter
  AND period_status = 'locked'
  AND base_currency = v_base_currency
  AND status = 'done'
```

- Si existeix:
  - `RETURN;` (no re-queuea).
- Sinó:
  - Crea job `status='queued'` amb `period_status='locked'`.

### 4.2 Trigger AFTER UPDATE a accounting_periods

Es dispara només en transició `open → locked`:

- Evita enqueues repetits en edits menors.
- Lliga clarament l’export oficial al moment de lock.

## 5. Exchange rate hardening

### 5.1 Helper RPC

`get_exchange_rate_to_base(date, currency, base)`:

- Cerca:
  - 1r: `rate_date = date`.
  - 2n: `rate_date <= date ORDER BY rate_date DESC`.
- Si no troba:
  - `RAISE EXCEPTION 'missing_exchange_rate'`.

### 5.2 Ús a `generate-quarter-pack`

Abans de generar els CSVs del ledger:

- Repassa totes les files de `ledger_export_quarterly`:
  - Si `rate_pnl <= 0` o NULL → recalcula via RPC.
  - Si `cash_at` no nul·la i `rate_cash <= 0` o NULL → recalcula via RPC per `cash_at`.
  - Si `amount_base_*` falta, el calcula com `amount_original * rate`.
- Si alguna crida a `get_exchange_rate_to_base` falla:
  - Es llança error `missing_exchange_rate`.
  - El job es marca `failed` amb `error='missing_exchange_rate'` (o missatge equivalent).

Resultat:

- Cap pack trimestral `done` es genera amb rates 0/null.
- Faltes de dades de tipus de canvi es detecten explícitament i paren el pipeline.

## 6. Splitting del ledger per volum

### 6.1 Risc

Un ledger trimestral molt dens (p. ex. >50k moviments) podria:

- Generar CSV massa grans.
- Tenir impacte en memòria/temps durant la generació del ZIP.

### 6.2 Solució

`generate-quarter-pack`:

- Si `ledgerRows.length > 50000`:
  - genera arxius:
    - `..._ledger_part1.csv`
    - `..._ledger_part2.csv`
    - …
  - cada chunk de 50k files.
- Si `<= 50000`:
  - `..._ledger.csv` únic.

Impacte:

- Millor UX en fulls de càlcul.
- Menys risc d’errors de memòria a Edge.

## 7. Worker robustness

### 7.1 quarter-pack-worker

- Crida la funció Edge `generate-quarter-pack` per cada job `queued`.
- Si la crida HTTP no és `2xx`:
  - marca el job com `failed` amb un `error` descrit (`generate-quarter-pack failed: ...`).

### 7.2 Idempotència

- Si el worker torna a veure un job `queued`:
  - el reprovarà.
- Si el job ja és `done`/`failed`:
  - no es reprocessa.

## 8. Definition of Done (Hardening)

- Base currency no modificable un cop hi ha ledger oficial (`posted/locked`).
- Cap **period lock** permet edició de ledger en períodes tancats.
- Packs locked no es re-generen automàticament si ja hi ha un `done`.
- Missing rates bloquegen exports amb errors clars, sense pack parcial.
- Ledger massiu es divideix en fitxers manejables.
- Worker i Edge marquen bé l’estat (`queued` → `running` → `done/failed`) amb missatges d’error raonables.

