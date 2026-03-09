# D20 — Trial Conversion Tracking
Status: DRAFT
Owner: Product / Architecture

### Current implementation status
- DB contract ready
- `converted_at` suportat a `trial_registrations`
- helper `src/lib/trials/markTrialConverted.js` implementat
- Stripe webhook wired per events compatibles
- tracking best-effort i idempotent
- billing engine no modificat funcionalment

## 1. Objectiu
Definir el contracte tècnic per detectar quan un registre de `trial_registrations` es converteix en client pagant a partir d'events de Stripe, sense modificar el billing engine existent, ni checkout, ni onboarding.

## 2. Abast
Inclou:
- detecció de conversió via Stripe webhook
- actualització de `trial_registrations`
- marcatge de `status = converted`
- persistència de `converted_at`
- definició de match strategy entre Stripe customer/subscription i trial registration

No inclou:
- canvis a Stripe Checkout
- canvis al billing engine
- canvis al onboarding flow
- analytics avançada
- admin UI

## 3. Inputs del sistema
Documenta com a fonts candidates:
- `trial_registrations`
- `billing_subscriptions`
- Stripe webhook events:
  - `invoice.paid`
  - `customer.subscription.created`
  - `customer.subscription.updated`

## 4. Contracte funcional
Defineix el lifecycle mínim:
- `started`
- `workspace_created`
- `converted`

Defineix que una conversió significa:
- existeix un `trial_registrations` previ
- existeix una subscripció/estat de pagament vàlid relacionable
- el registre encara NO està en `converted`

## 5. Match strategy
Defineix explícitament l'estratègia base:
1. intentar match per `workspace_id` si es pot derivar de billing/subscription
2. fallback per email normalitzat
3. només actualitzar registres no convertits
4. si hi ha múltiples candidats, escollir el més recent compatible
5. mai bloquejar el webhook principal

## 6. Side effects permesos
Només:
- update de `trial_registrations.status`
- update de `trial_registrations.converted_at`

Sense tocar altres taules de billing.

## 7. Idempotència
Defineix que el procés ha de ser idempotent:
- si ja està `converted`, no tornar a mutar
- múltiples events Stripe no han de provocar inconsistències

## 8. Error handling
Defineix:
- conversió best-effort
- cap error de tracking ha de trencar el flux principal del webhook
- logs només d'advertència/error operatiu

## 9. SQL / dades requerides
Afegeix una subsecció indicant quins camps mínims ha de tenir o tenir previstos `trial_registrations`:
- `id`
- `email`
- `workspace_id` (nullable)
- `status`
- `created_at`
- `converted_at` (si no existeix, marcar com a requisit de migració D20)

## 10. Definition of done
- contracte documentat
- font de veritat definida
- match strategy definida
- idempotència definida
- clar que no es toca billing existent

Completats amb la implementació real:
- contracte documentat
- DB contract implementat
- helper implementat
- webhook wired
- sense tocar checkout
- sense tocar onboarding
- sense reescriure billing

## 11. Decisions explícites
Afegeix una llista "Sí / No":
Sí:
- tracking derivat de Stripe webhook
- update només a `trial_registrations`
- conversió tolerant a duplicats d'events

No:
- no es reescriu billing
- no es modifica checkout
- no es modifica onboarding
- no es crea consola admin en aquesta fase

---

### Implemented Contract

#### Conversion helper
- fitxer: `src/lib/trials/markTrialConverted.js`
- input:
  - `workspaceId`
  - `email`
  - `convertedAt`
- match order:
  1. `workspace_id`
  2. fallback per email normalitzat
- només considera registres amb status:
  - `started`
  - `workspace_created`
- update:
  - `status = converted`
  - `converted_at = ...`
- mai fa throw
- retorna objecte estructurat operatiu

#### Webhook integration
- la integració viu dins del webhook Stripe existent
- events connectats:
  - `invoice.paid`
  - `customer.subscription.created`
  - `customer.subscription.updated`
- el tracking és side-effect secundari
- errors només via `console.warn`
- no canvia la resposta principal del webhook

#### Data contract
`trial_registrations` suporta ja:
- `email`
- `workspace_id`
- `status`
- `created_at`
- `converted_at`

### Lifecycle actual
- `started`
- `workspace_created`
- `converted`
