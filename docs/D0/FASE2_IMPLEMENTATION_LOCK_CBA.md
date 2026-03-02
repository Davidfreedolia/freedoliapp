# FREEDOLIAPP — FASE 2 IMPLEMENTATION LOCK (CBA)

**Estat:** LOCKED — Execució controlada  
**No brainstorming. No canviar decisions. No refactors fora FASE 2.**

---

# 🧱 1. DB CHANGES — Contracte definitiu

## 1.1 Taula `public.orgs` — camps billing

| Camp | Tipus | Nullable | Default | Notes |
|------|--------|----------|---------|------|
| `billing_status` | enum `billing_status` | NO | `'inactive'` | Valors: `inactive`, `trialing`, `active`, `past_due`, `canceled` |
| `plan_id` | text | SÍ | NULL | Stripe Price ID (ex: `price_xxx`) |
| `seat_limit` | integer | NO | 1 | Mínim 1; màxim per plan (validat app-side o RPC) |
| `trial_ends_at` | timestamptz | SÍ | NULL | Fi de trial; després passa a inactive si no hi ha subscription |
| `stripe_customer_id` | text | SÍ | NULL | UNIQUE, un per org |
| `stripe_subscription_id` | text | SÍ | NULL | UNIQUE, un per org |

- **Enum:** `CREATE TYPE billing_status AS ENUM ('inactive', 'trialing', 'active', 'past_due', 'canceled');`
- **Índexs:**  
  - `UNIQUE(stripe_customer_id)` (WHERE stripe_customer_id IS NOT NULL)  
  - `UNIQUE(stripe_subscription_id)` (WHERE stripe_subscription_id IS NOT NULL)  
  - Opcional: `idx_orgs_billing_status` sobre `billing_status` per filtres.
- **Constraints:**  
  - `seat_limit >= 1` (CHECK).  
  - No FK a Stripe; `plan_id` és text de referència.
- **Compatibilitat:** Si ja existeixen `stripe_customer_id` / `stripe_subscription_id` (migració S7.3), es reutilitzen; s’afegeixen només `billing_status`, `plan_id`, `seat_limit`, `trial_ends_at` i constraints/índexs indicats.

---

# 🔐 2. RLS MODEL — Gating real

## 2.1 Funció booleana `org_billing_allows_access(org_id uuid)`

- **Signatura:** `(org_id uuid) RETURNS boolean`.
- **Lògica:**  
  - Si `org_id` és NULL → retorna `false`.  
  - Llegeix `public.orgs.billing_status` (i opcionalment `trial_ends_at`) per a aquest `org_id`.  
  - Retorna `true` si i només si:  
    - `billing_status IN ('active', 'trialing')`, **o**  
    - `billing_status = 'trialing'` i `trial_ends_at > now()`.  
  - Retorna `false` si `billing_status IN ('inactive', 'past_due', 'canceled')` o si el trial ha vençut.
- **Seguretat:** `SECURITY DEFINER` amb `search_path = public` per llegir `orgs` sense exposar RLS al caller.
- **Ús:** S’usa **en combinació** amb `is_org_member(org_id)`: accés = `is_org_member(org_id) AND org_billing_allows_access(org_id)` per a tenant-data.

## 2.2 Integració amb helpers existents

- **is_org_member(org_id):** sense canvis. Continua sent la condició d’“pertany a l’org”.
- **is_org_owner(org_id):** sense canvis. Ús per: transfer ownership, billing, seat management.
- **Gating:**  
  - **Taules tenant-data (projects, suppliers, purchase_orders, etc.):**  
    - Policy: `USING (is_org_member(org_id) AND org_billing_allows_access(org_id))` i mateix `WITH CHECK`.  
  - **Excepció owner:** L’owner ha de poder **veure** la org sempre (per anar a Billing/Settings i reactivar). Es defineix:  
    - “Accés de lectura a dades de l’org” si és member **o** si és owner (permet veure org encara que billing bloqueigi).  
    - **Alternativa lockada:** Una sola policy amb `(is_org_member(org_id) AND (org_billing_allows_access(org_id) OR is_org_owner(org_id)))` per SELECT; per INSERT/UPDATE/DELETE es manté `is_org_member(org_id) AND org_billing_allows_access(org_id)` (owner no pot crear dades si billing està bloquejat).  
  - **Lock definitiu:** SELECT: `is_org_member(org_id) AND (org_billing_allows_access(org_id) OR is_org_owner(org_id))`. INSERT/UPDATE/DELETE: `is_org_member(org_id) AND org_billing_allows_access(org_id)`.

## 2.3 Taules protegides per billing gating

Totes les taules tenant-data que avui tenen policy “Org members can manage X” passen a incloure `org_billing_allows_access(org_id)` (o l’excepció owner) com abans. Cap taula de referència global (marketplaces, alert_state) ni taules de sistema (health_*) es toquen.

## 2.4 Over-seat

- **No es resol a RLS.** RLS no compta seats.  
- Over-seat es bloqueja a **aplicació:** abans d’`INSERT` a `org_memberships`, es crida una funció o RPC que comprova `seats_used < seat_limit`; si no es compleix, es retorna error i no s’insereix. RLS només comprova `is_org_member` / billing; la lògica de límit de seats és a RPC o a API layer.

---

# 🖥 3. WORKSPACE CONTEXT (FRONTEND)

## 3.1 `active_org_id` — storage definitiu

- **Clau:** `freedoli_active_org_id` (localStorage).
- **Valor:** UUID de l’org activa (string).
- **Inicialització:** En bootstrap, si no hi ha valor vàlid (o l’usuari ja no és membre), es considera “no hi ha org activa” i s’aplica flux d’onboarding/selector.

## 3.2 Flux de bootstrap

1. Llegir `freedoli_active_org_id` de localStorage.  
2. Si hi ha valor: validar que l’usuari és membre d’aquesta org (query `org_memberships` o endpoint que retorni orgs del usuari).  
3. Si és membre: confirmar org activa i carregar context (nom d’org, billing_status si cal per UI).  
4. Si no és membre o no hi ha valor: obtenir llista d’orgs del usuari; si n’hi ha una o més, mostrar selector i guardar l’elegida a localStorage; si n’hi ha zero, mostrar onboarding “crear org” / invitació.  
5. Cap a dades: totes les crides que depenen d’org fan servir aquest `active_org_id` (inclòs enviaments a Stripe: `client_reference_id` o metadata amb `org_id`).

## 3.3 Flux de switch

1. L’usuari tria una altra org al selector.  
2. S’actualitza `active_org_id` al context (React) i a localStorage (`freedoli_active_org_id`).  
3. **Cache invalidation:** es consideren invàlids tots els caches de dades que depenen d’org (llistes de projects, suppliers, etc.). Es tornen a fer fetch de les dades de la nova org.  
4. No es requereix full page reload; el canvi és reactiu (state + refetch).

## 3.4 Cache invalidation

- Quan canvia `active_org_id`: invalidar queries que depenen d’org (per exemple clau que inclogui `active_org_id` en React Query / SWR, o refetch explícit).  
- Quan es rep event de billing (p. ex. webhook processat o poll): actualitzar dades de billing de l’org activa; si `billing_status` passa a inactive/past_due, la UI ha de reflectir bloqueig (per exemple banner o redirecció a billing).

## 3.5 Desincronització

- **Detectada quan:** (a) al carregar, `freedoli_active_org_id` apunta a una org de la qual l’usuari ja no és membre; (b) una crida retorna 403 o error de “billing required”.  
- **Acció:** (a) netejar `active_org_id` de localStorage i forçar selector/onboarding; (b) mostrar banner/UI de “reactiva el teu pla” i enllaç al portal de billing.

---

# 💳 4. STRIPE SERVERLESS LAYER

## 4.1 Endpoints

| Mètode | Path | Propòsit |
|--------|------|----------|
| POST | `/api/stripe/create-checkout-session` | Crear sessió Checkout de Stripe (subscription o one-time); retorna `url` per redirecció. |
| POST | `/api/stripe/create-portal-session` | Crear sessió Customer Portal de Stripe; retorna `url` per redirecció. |
| POST | `/api/stripe/webhook` | Rebre esdeveniments Stripe (subscription created/updated/deleted, invoice paid, etc.). |

## 4.2 Qui pot cridar

- **create-checkout-session:** Només usuari autenticat (Supabase JWT); el cos ha de portar `org_id` (o es deriva de `active_org_id`). Només un **owner** (o admin si es defineix) de l’org pot iniciar checkout per aquella org.  
- **create-portal-session:** Mateix: autenticat; `org_id`; només owner/admin de l’org.  
- **webhook:** Només Stripe (signatura `Stripe-Signature`); cap JWT. Validació obligatòria del payload amb secret de webhook.

## 4.3 Validacions mínimes

- **Checkout/Portal:** Comprovar que l’usuari és owner (o admin) de l’`org_id`; que l’org existeix; que `billing_status` permet iniciar checkout si cal (evitar duplicats innecessaris).  
- **Webhook:** Verificar signatura; idempotència per `event.id` (no processar dos cops el mateix event); ignorar esdeveniments no gestionats.

## 4.4 Què actualitza el webhook

- `customer.subscription.created/updated/deleted` → actualitzar `orgs.stripe_subscription_id`, `orgs.billing_status`, `orgs.plan_id`, `orgs.seat_limit` (des de metadata de Stripe si s’hi emmagatzema).  
- `invoice.paid` / `invoice.payment_failed` → actualitzar `billing_status` (past_due si cal).  
- Crear/actualitzar `orgs.stripe_customer_id` si el subscription té `customer` i encara no està guardat.

## 4.5 Idempotència

- Webhook: abans de fer UPDATE/INSERT, comprovar si l’`event.id` ja s’ha processat (taula `stripe_webhook_events` amb `event_id` UNIQUE); si existeix, fer `RETURN` sense error. Després de processar, INSERT de `event.id` a aquesta taula.

---

# 👥 5. SEAT ENFORCEMENT

## 5.1 On es bloqueja l’insert a membership

- En **RPC** (recomanat): per exemple `invite_org_member` o `add_org_member`. Abans d’inserir a `org_memberships`, es llegeix `seat_limit` i es calcula `seats_used` (COUNT de `org_memberships` per aquella org, amb rol que compti com a seat). Si `seats_used >= seat_limit`, es fa `RAISE EXCEPTION` i no s’insereix.  
- Opcionalment, una **policy RLS** amb WITH CHECK que cridi una funció que comprovi el límit (menys preferible per rendiment i claredat; el lock és “a RPC”).

## 5.2 Càlcul de `seats_used`

- `seats_used = COUNT(*) FROM org_memberships WHERE org_id = $1` (tots els membres amb qualsevol rol compten com a 1 seat, o només els rols “member”/“admin” segons acord; lock: **tots els rows a org_memberships compten com 1 seat**).

## 5.3 Over-seat en runtime

- Si per error o race hi hagués més membres que `seat_limit`: la funció de billing gating no bloqueja la lectura per owner; la UI d’owner ha de mostrar “X/Y seats” i no permetre més invitacions fins que s’actualitzi el pla. No es borren membres automàticament; és responsabilitat d’owner/admin reduir o pujar de pla.

## 5.4 Què veu l’owner

- Llista de membres; nombre `seats_used` / `seat_limit`; enllaç a billing/portal per pujar de pla; possibilitat d’eliminar membres per alliberar seat.

## 5.5 Què veuen els membres normals

- No veuen gestió de seats ni billing; poden veure que l’org existeix i les dades tenant si billing permet accés; si billing bloqueja, veuen missatge de “contacta l’administrador” o similar.

---

# 📋 6. IMPLEMENTATION ORDER

| Pas | Descripció | Entregables |
|-----|------------|--------------|
| **PAS 1** | DB schema | Enum `billing_status`; alter `orgs` (camps + constraints + índexs); taula `stripe_webhook_events` si cal. |
| **PAS 2** | RLS | Funció `org_billing_allows_access(org_id)`; actualització de policies tenant-data amb gating; excepció owner a SELECT. |
| **PAS 3** | Serverless Stripe | Endpoints create-checkout-session, create-portal-session, webhook; validació i idempotència. |
| **PAS 4** | Frontend workspace | Storage `freedoli_active_org_id`; bootstrap; selector; switch; cache invalidation; desincronització. |
| **PAS 5** | Billing UI | Pàgina/s de billing (canviar pla, portal); integració amb checkout/portal; banner si billing bloquejat. |
| **PAS 6** | QA + Smoke tests | Tests manuals o automatitzats: switch org, checkout, webhook, over-seat bloquejat, owner veu billing. |

---

# ⚠️ 7. RISK MATRIX

| Risc | Impacte | Mitigació |
|------|---------|-----------|
| Webhook duplicat / perdut | Billing desincronitzat | Idempotència per `event.id`; reintents Stripe; log d’events. |
| Race en seat_count | Over-seat | RPC amb CHECK abans d’INSERT; opcionalment LOCK per org a RPC. |
| Owner bloquejat per billing | No pot pagar | Policy SELECT amb excepció owner; UI sempre mostra opció “anar a billing”. |
| localStorage esborrat | Pèrdua org activa | Bootstrap sense org → selector; sense pèrdua de dades. |
| Stripe key exposada | Seguretat | Keys només a serverless/env; webhook secret validat. |

---

# 🎯 8. DEFINITION OF DONE (Implementation Level)

- **PAS 1:** Migracions aplicades; `orgs` té tots els camps billing; constraints i índexs actius.  
- **PAS 2:** `org_billing_allows_access` existeix i s’usa a les policies; owner pot llegir encara amb billing inactive; la resta de membres només accedeixen si billing permet.  
- **PAS 3:** Els 3 endpoints responen; webhook actualitza `orgs` i idempotència verificada.  
- **PAS 4:** Canvi d’org al selector actualitza context i dades; bootstrap amb localStorage; desincronització detectada i tractada.  
- **PAS 5:** Owner pot obrir Checkout i Portal; es mostra estat de billing i seats; banner o bloqueig quan cal.  
- **PAS 6:** Smoke: crear org → checkout → webhook → accés OK; over-seat bloquejat; switch org correcte.

---

**FASE 2 queda formalment bloquejada per execució controlada.**

**OK — passem a executar.**
