# Billing gating UI (FASE 2 CBA)

**Versió:** 1.0  
**Àmbit:** Frontend — gate d’accés a `/app` i pantalles locked / over-seat.

---

## 1. Context

Després que el workspace context estigui preparat (`isWorkspaceReady`), l’app comprova l’estat de billing de l’org activa i el nombre de places en ús. Si l’org no és “billable” (`billing_status` no és trialing/active, o trial vençut) o hi ha over-seat (`seats_used > seat_limit`), l’usuari es redirigeix a una pantalla de bloqueig en lloc de veure el contingut normal. Les rutes de billing (`/app/billing/locked` i `/app/billing/over-seat`) són accessibles sense tornar a aplicar el redirect (evitar loop).

---

## 2. Decisions tancades

| # | Decisió | Detall |
|---|---------|--------|
| 1 | **Moment del gate** | Dins AppContent; després de `isWorkspaceReady` i després de carregar org + seats_used. |
| 2 | **Condició “allowed”** | billingOk = (billing_status === 'active') OR (billing_status === 'trialing' AND trial_ends_at > now()) OR (billing_status == null). overSeat = seats_used > seat_limit. allowed = billingOk AND NOT overSeat. |
| 3 | **Redirect** | Si !allowed: gate === 'over_seat' -> `/app/billing/over-seat`; sinó -> `/app/billing/locked`. State passat: { org, seatsUsed }. |
| 4 | **Excepció rutes billing** | Si pathname és `/app/billing/locked` o `/app/billing/over-seat`, no es redirigeix; es renderitza només Outlet + ToastContainer (sense sidebar). |
| 5 | **Owner/Admin a locked** | Veuen la pantalla locked amb CTA “Manage subscription” (portal) o “Start subscription” (checkout si no hi ha stripe_customer_id). |
| 6 | **Member a locked** | Només missatge “Contact the workspace owner”. |
| 7 | **Over-seat** | Owner/Admin: CTA portal + link a Settings (membres). Member: contactar owner. |

---

## 3. Contractes de dades

### 3.1 Estat del gate (AppContent)

- `billingState.loading`: true fins que s’ha fet fetch d’org i count de org_memberships.
- `billingState.allowed`: true només si billingOk i !overSeat.
- `billingState.gate`: 'locked' | 'over_seat' | null.
- `billingState.org`: objecte org (o null).
- `billingState.seatsUsed`: number.

### 3.2 Rutes

| Ruta | Component | Condició d’accés |
|------|-----------|-------------------|
| `/app/billing/locked` | BillingLocked | Sempre accessible des de /app (evitant loop). |
| `/app/billing/over-seat` | BillingOverSeat | Sempre accessible des de /app. |

### 3.3 Càlcul a AppContent

- `org` = supabase.from('orgs').select('*').eq('id', activeOrgId).single()
- `seatsUsed` = count de supabase.from('org_memberships').select(..., { count: 'exact', head: true }).eq('org_id', activeOrgId)
- `seatLimit` = org.seat_limit ?? 1
- `billingOk` segons taula de decisions; `overSeat` = seatsUsed > seatLimit.

---

## 4. Fluxos

### 4.1 Flux del gate (AppContent)

```
isWorkspaceReady?
    | NO -> loading spinner
    | YES
    v
billingState.loading = true -> fetch org + count seats
    v
billingOk? (active / trialing vàlid / null)
    | NO -> gate = 'locked', allowed = false
    | YES
    v
overSeat? (seatsUsed > seatLimit)
    | YES -> gate = 'over_seat', allowed = false
    | NO  -> allowed = true
    v
isBillingRoute? (pathname locked | over-seat)
    | YES -> render Outlet (BillingLocked | BillingOverSeat) + ToastContainer
    |
    !billingState.allowed?
    | YES -> <Navigate to={locked|over-seat} state={{ org, seatsUsed }} />
    |
    v
Render layout normal (Sidebar + TopNavbar + Outlet)
```

### 4.2 BillingLocked

- Carrega org (si no ve de state).
- isOwnerAdmin = memberships algun (org_id === activeOrgId && (role === 'owner' || role === 'admin')).
- Si owner/admin: botó Portal (si stripe_customer_id) o botó Checkout (si no); botó “Tornar a l’app”.
- Si no owner/admin: text contactar owner.
- Tots els textos via i18n `t(lang, key)`.

### 4.3 BillingOverSeat

- Carrega org + seatsUsed (si no ve de state).
- isOwnerAdmin igual.
- Mostra seatsUsed / seatLimit; missatge; owner/admin: botó portal, botó “Anar a Configuració (membres)” (navigate /app/settings), “Tornar a l’app”.
- No-owner: contactar owner.
- Textos via `t(lang, key)`.

---

## 5. Edge cases

| Cas | Comportament |
|-----|--------------|
| activeOrgId null | billingState.allowed = false, gate = 'locked'; redirect a locked. |
| Error en fetch org | allowed = false, gate = 'locked'. |
| Usuari a /app/billing/locked i refresca | isBillingRoute true -> no redirect; es mostra BillingLocked. |
| Demo mode | billingState.allowed = true; no gate. |
| No sessió (userId null) | allowed = true (no es bloqueja per billing en aquest cas; ProtectedRoute gestiona auth). |

---

## 6. Definition of Done

- [x] AppContent: esperar isWorkspaceReady; carregar org i seats_used; calcular billingOk i overSeat.
- [x] Redirect a /app/billing/locked o over-seat amb state { org, seatsUsed }.
- [x] isBillingRoute -> render Outlet sense sidebar; sense redirect.
- [x] BillingLocked: UI amb estat, CTAs portal/checkout, missatge no-owner; i18n.
- [x] BillingOverSeat: UI seats used/limit, CTAs portal + settings, missatge no-owner; i18n.
- [x] Helper billingApi (createCheckoutSession, createPortalSession) amb Bearer token; toasts d’error.

---

## 7. Relació amb altres documents

- **FASE2_CBA_ARCHITECTURE_FINAL** (D0): flux global i gate.
- **WORKSPACE_CONTEXT** (D3): isWorkspaceReady i activeOrgId.
- **BILLING_MODEL** (D2): billing_status, seat_limit, seats_used.
- **I18N_BASE_SYSTEM** (D3): keys i ús de t() a les pantalles billing.
