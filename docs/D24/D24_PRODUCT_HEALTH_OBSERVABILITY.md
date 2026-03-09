# D24 — Product Health & Observability

Status: DRAFT

## 1. Objectiu

Crear mecanismes per monitoritzar la salut del sistema Freedoliapp.

Permetre detectar ràpidament:

- errors d'ingest
- engines que fallen
- jobs que no corren
- webhooks amb problemes
- anomalies operatives

---

## 2. Àmbit

Inclou:

- monitorització de processos crítics
- detecció d'errors operatius
- visibilitat interna

No inclou:

- alerting extern
- sistema de notificacions
- pager systems

---

## 3. Àrees a monitoritzar

### Ingestion Health

Fonts:

- amazon_import_jobs
- amazon_raw_rows

Detectar:

- jobs fallits
- parse errors

---

### Engine Health

Engines a monitoritzar:

- profit engine
- reorder engine
- inventory intelligence
- cashflow forecast

Detectar:

- execucions amb error
- retorns inconsistents

---

### Webhook Health

Fonts:

- stripe webhook events
- webhook errors

Detectar:

- retries
- failures

---

### Trial Funnel Health

Fonts:

- trial_registrations

Detectar:

- trials sense workspace
- conversions fallides

---

## 4. Arquitectura

Observability ha de:

- reutilitzar dades existents
- evitar logs redundants
- no duplicar engines

---

## 5. Definition of done

Document creat.

Àrees de salut definides.

Fonts de dades identificades.

Sense implementació UI.
