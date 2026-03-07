# D18 — Trial Registration Capture (Pre-Design)

**Status:** pre-design (documentació i definició funcional; sense implementació)  
**Objectiu:** Definir el flux de captació de dades del lead abans d’iniciar la prova gratuïta.

---

## 1. Objectiu

Abans d’activar la prova, FREEDOLIAPP ha de capturar dades mínimes del possible client per:

- identificar el lead
- qualificar-lo
- millorar onboarding
- activar futures accions comercials

---

## 2. Principi de producte

El registre ha de ser:

- curt
- útil
- obligatori abans de la prova
- sense fricció absurda
- amb onboarding progressiu després

---

## 3. Camps obligatoris inicials

- `full_name`
- `email`
- `company_name`
- `country`
- `primary_marketplace`
- `seller_type` (FBA / FBM / Hybrid)
- `business_stage`
- `consent_checkbox`

---

## 4. Camps opcionals o posteriors

- `monthly_revenue_range`
- `asin_count_range`
- `current_tools`
- `team_size`

---

## 5. Flux canònic

```text
Landing
  → CTA "Start free trial"
  → Trial registration form
  → account creation
  → workspace creation
  → onboarding wizard
```

---

## 6. Regles

- no entrar a la prova sense registre mínim
- no convertir el formulari en una paret eterna
- separar lead capture de l'onboarding profund
- guardar sempre org_id + user_id + lead profile

---

## 7. Model de dades proposat

Definir taula o capa de persistència per: **trial_leads** (o equivalent).

| Camp | Tipus | Notes |
|------|--------|--------|
| `id` | uuid | PK |
| `user_id` | uuid | nullable fins crear compte |
| `org_id` | uuid | nullable inicialment si cal |
| `full_name` | text | |
| `email` | text | |
| `company_name` | text | |
| `country` | text | |
| `primary_marketplace` | text | |
| `seller_type` | text | FBA / FBM / Hybrid |
| `business_stage` | text | |
| `monthly_revenue_range` | text | nullable |
| `asin_count_range` | text | nullable |
| `current_tools` | text | nullable |
| `consent_given` | boolean | |
| `created_at` | timestamptz | |

---

## 8. Ús d’aquestes dades

- CRM intern futur
- onboarding personalitzat
- segmentació de trials
- detecció de leads bons
- mètriques de conversió trial → paid

---

## 9. Relació amb billing i signup

- **Trial registration** passa abans de billing.
- **Billing** comença quan el trial està creat.
- El **lead profile** no substitueix user profile ni org settings.

---

## 10. Resultat esperat

FREEDOLIAPP deixa de perdre informació comercial crítica en el punt d’entrada.
