# FASE 2 CBA — QA Final & Smoke Tests

**Versió:** 1.0  
**Data:** Post PAS 5 (Billing UI + i18n)  
**Rol:** QA Lead / Release Manager — validació i documentació únicament (sense canvis de codi/SQL).

---

## Resum executiu

Aquest document recull el checklist de QA per a la FASE 2 CBA (SaaS Readiness): Workspace Context, Billing Gating, Over-seat, Stripe endpoints, Webhook, RLS i i18n. Cada ítem es marca PASS/FAIL després de l’execució manual o automàtica.

---

## 1) Repo / Deploy sanity

| # | Verificació | Resultat | Notes |
|---|-------------|----------|--------|
| 1.1 | `git status -sb` net | ✅ PASS | `## master...origin/master` — working tree net |
| 1.2 | Build `npm run build` OK | ✅ PASS | `✓ built in 21.55s` (Vite production build) |
| 1.3 | Vercel deploy a prod sense errors | ⬜ A verificar | Enllaç deploy (si aplica): _[afegir URL]_ |

**Passos de reproducció (1.1–1.2):**
```bash
git status -sb
npm run build
```

---

## 2) Workspace context

| # | Verificació | Resultat | Notes |
|---|-------------|----------|--------|
| 2.1 | Usuari amb 2 orgs: bootstrap a org vàlida (fallback si storage incorrecte) | ⬜ A verificar | |
| 2.2 | Switch org: canvia `activeOrgId`, purge cache (no dades “fantasma”), navega a ruta safe | ⬜ A verificar | |
| 2.3 | Usuari expulsat d’una org: refresh => fallback a altra org sense loop | ⬜ A verificar | |

**Passos de reproducció:**
- **2.1:** Login amb usuari que té 2 orgs. Esborrar `freedoli_active_org_id` de localStorage (o posar un UUID invàlid). Recarregar → ha de mostrar una org vàlida (owner o primera per `created_at`).
- **2.2:** Amb 2 orgs, canviar d’org des del selector (si existeix) o invocar `setActiveOrg(altra_org_id)` → comprovar que la UI mostra dades de la nova org i que no queden llistats de la precedent.
- **2.3:** Expulsar l’usuari d’una org (DELETE a `org_memberships`). Refresh → ha de fer fallback a una altra org; no ha d’entrar en loop ni pantalla en blanc.

---

## 3) Billing gating (UI)

**Org en estat `past_due` o `canceled`:**

| # | Verificació | Resultat | Notes |
|---|-------------|----------|--------|
| 3.1 | MEMBER: entrar a `/app` => redirigeix a `/app/billing/locked` | ⬜ A verificar | |
| 3.2 | MEMBER: no veu dades tenant (només pantalla locked) | ⬜ A verificar | |
| 3.3 | OWNER/ADMIN: veu locked | ⬜ A verificar | |
| 3.4 | OWNER/ADMIN: pot clicar “Manage subscription” (portal) si hi ha `stripe_customer_id` | ⬜ A verificar | |

**Passos de reproducció:**
- Posar una org en `billing_status = 'past_due'` (o `'canceled'`) a la DB.
- Com MEMBER: obrir `/app` → ha de redirigir a `/app/billing/locked`; no ha de mostrar sidebar ni dades de projectes/suppliers, etc.
- Com OWNER/ADMIN: ha de veure la mateixa pantalla locked amb botó “Gestionar subscripció” (o “Manage subscription” segons idioma); en clicar, si hi ha `stripe_customer_id`, ha d’obrir el portal de Stripe.

---

## 4) Over-seat gating (UI + RPC)

| # | Verificació | Resultat | Notes |
|---|-------------|----------|--------|
| 4.1 | `seat_limit = 1` i 2 membres: MEMBER => redirigeix a `/app/billing/over-seat` | ⬜ A verificar | |
| 4.2 | OWNER/ADMIN => pantalla over-seat + CTA portal + anar a membres/config | ⬜ A verificar | |
| 4.3 | RPC `org_add_member`: quan `seats_used >= seat_limit` => error `seat_limit_reached` | ⬜ A verificar | |
| 4.4 | RPC `org_add_member`: no-owner => error de permís | ⬜ A verificar | |

**Passos de reproducció:**
- **4.1–4.2:** Posar `orgs.seat_limit = 1` i tenir 2 fileres a `org_memberships` per aquella org. Com MEMBER, obrir `/app` → ha de redirigir a `/app/billing/over-seat`. Com OWNER/ADMIN, ha de veure over-seat amb botó portal i botó “Anar a Configuració (membres)” (o equivalent).
- **4.3:** Cridar `supabase.rpc('org_add_member', { p_org_id, p_user_id, p_role })` amb una org on `seats_used >= seat_limit` → ha de retornar error amb missatge `seat_limit_reached`.
- **4.4:** Cridar `org_add_member` com a usuari que no és owner ni admin de l’org → ha de retornar error de permís (403 o equivalent).

---

## 5) Stripe endpoints

| # | Verificació | Resultat | Notes |
|---|-------------|----------|--------|
| 5.1 | `POST /api/stripe/create-checkout-session`: owner OK => retorna `url` | ⬜ A verificar | |
| 5.2 | `POST /api/stripe/create-checkout-session`: non-owner => 403/401 | ⬜ A verificar | |
| 5.3 | `POST /api/stripe/create-portal-session`: sense `stripe_customer_id` => 400 | ⬜ A verificar | |
| 5.4 | `POST /api/stripe/create-portal-session`: amb `stripe_customer_id` => retorna `url` | ⬜ A verificar | |

**Passos de reproducció:**
- **5.1:** Request amb Bearer token d’un owner de l’org i body `{ orgId }` → resposta 200 amb `{ url }`.
- **5.2:** Request amb token d’un member (no owner/admin) → 403 o 401.
- **5.3:** Portal amb org sense `stripe_customer_id` → 400 amb missatge clar (p. ex. “No customer yet”).
- **5.4:** Portal amb org que té `stripe_customer_id` → 200 amb `{ url }`.

---

## 6) Webhook correctness (mínim)

| # | Verificació | Resultat | Notes |
|---|-------------|----------|--------|
| 6.1 | Rebre `checkout.session.completed`: `orgs` actualitzat (stripe_customer_id, stripe_subscription_id, billing_status, plan_id, seat_limit, trial_ends_at) | ⬜ A verificar | |
| 6.2 | Idempotència: reenviar mateix `event.id` => 200 duplicate | ⬜ A verificar | |
| 6.3 | Raw body: verificació signatura OK (no `invalid_signature`) | ⬜ A verificar | |

**Passos de reproducció:**
- **6.1:** Stripe CLI: `stripe trigger checkout.session.completed` (o enviar event amb metadata `org_id`); comprovar a DB que la org té els camps billing actualitzats.
- **6.2:** Enviar el mateix event (mateix `id`) dues vegades → segona resposta 200 amb `{ received: true, duplicate: true }` (o equivalent); no ha d’actualitzar la DB dues vegades.
- **6.3:** Enviar webhook amb body o signatura incorrecta → 400; amb signatura correcta (Stripe CLI o secret correcte) → 200.

---

## 7) RLS sanity

| # | Verificació | Resultat | Notes |
|---|-------------|----------|--------|
| 7.1 | Org `past_due`: SELECT taules tenant com MEMBER => bloquejat (0 rows / deny) | ⬜ A verificar | |
| 7.2 | Org `past_due`: OWNER pot llegir `orgs` + `org_memberships` | ⬜ A verificar | |
| 7.3 | Org `active`: SELECT normal (dades visibles per membres) | ⬜ A verificar | |

**Passos de reproducció:**
- **7.1:** Com a usuari amb rol member en una org `past_due`, des del client Supabase (o API amb JWT): `from('projects').select().eq('org_id', org_id)` → 0 rows (o error RLS).
- **7.2:** Com a owner de la mateixa org: `from('orgs').select().eq('id', org_id)` i `from('org_memberships').select().eq('org_id', org_id)` → ha de retornar dades.
- **7.3:** Com a member en una org `active`: SELECT a projectes/suppliers/etc. → ha de retornar les files de l’org.

---

## 8) i18n sanity (nou)

| # | Verificació | Resultat | Notes |
|---|-------------|----------|--------|
| 8.1 | Billing screens: cap text hardcoded; tot via `t()` | ✅ PASS | Revisió codi: BillingLocked i BillingOverSeat fan servir `t(lang, key)` |
| 8.2 | Canvi manual de `freedoli_lang` (localStorage) canvia textos (ca/en/es) | ⬜ A verificar | |

**Passos de reproducció:**
- **8.1:** Revisió de `src/pages/BillingLocked.jsx` i `src/pages/BillingOverSeat.jsx`: tots els textos visibles passen per `t(lang, key[, vars])`; no hi ha strings literals per a la UI.
- **8.2:** Posar `localStorage.setItem('freedoli_lang', 'en')`, recarregar, obrir `/app/billing/locked` → textos en anglès; canviar a `es` → textos en castellà.

---

## Notes i incidències

- _Afegir qualsevol incident o observació durant el QA (ex.: comportament inesperat, missatges d’error, variacions entre entorns)._
- Build: warnings de Vite (dynamic/static import) són coneguts i no bloquejants per a aquesta fase.

---

## GO / NO-GO final

| Criteri | Estat |
|---------|--------|
| Repo net i build OK | ✅ |
| Workspace context (bootstrap, switch, expulsió) | ⬜ Pendent verificació manual |
| Billing gating (locked) | ⬜ Pendent verificació manual |
| Over-seat gating + RPC | ⬜ Pendent verificació manual |
| Stripe endpoints | ⬜ Pendent verificació manual |
| Webhook (update orgs + idempotència + signatura) | ⬜ Pendent verificació manual |
| RLS (past_due deny, owner read, active ok) | ⬜ Pendent verificació manual |
| i18n (strings via t(), canvi idioma) | ⬜ Pendent verificació manual |

**Decisió final:**  
⬜ **GO** — Es dona per tancada la FASE 2 CBA per a release.  
⬜ **NO-GO** — Es documenten bloquejants a “Notes i incidències” i es corregeixen abans de tancar.

---

*Document generat com a part del PAS 6 (QA Final) de la FASE 2 CBA. No inclou canvis de codi ni de migrations.*
