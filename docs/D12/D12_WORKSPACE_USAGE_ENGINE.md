# D12 — Workspace Usage Engine

**Status:** slice 1–5 done (D12 complete)  
**Fitxer motor:** `src/lib/workspace/usage.js` · **Hook:** `src/hooks/useWorkspaceUsage.js` · **Alert global:** `src/components/billing/WorkspaceLimitAlert.jsx`

---

## Objectiu

Capa central que calcula l’ús del workspace (projectes, seats) a partir del sistema d’entitlements existent, sense duplicar lògica ni tocar taules de billing ni webhook.

---

## Slice 1 — Entregable

### Funció principal

**`getWorkspaceUsage(supabase, orgId)`**

- **Entrada:** client Supabase i UUID de l’org.
- **Sortida:** objecte amb `projects`, `seats`, `limitsReached`, `nearLimits`.

### Responsabilitats

1. **Llegir entitlements** des del sistema existent: `getOrgEntitlements(supabase, orgId)` i `getOrgFeatureLimit(entitlements, …)` de `src/lib/billing/entitlements.js`. No es duplica lògica d’entitlements.
2. **Calcular usage:** comptatges a `projects` i `org_memberships` per `org_id`.
3. **Calcular límits:** `projects.max` i `team.seats` (amb fallback a `entitlements.seat_limit` si cal).
4. **Percent:** per cada recurso, `percent` = 0–100 quan hi ha límit; `null` quan no n’hi ha.
5. **limitsReached:** array de strings (`'projects'`, `'seats'`) on `used >= limit`.
6. **nearLimits:** array de strings on `used / limit >= 0.8` (D12 Slice 5). Inclou recursos a prop o al límit; pot coincidir amb `limitsReached` quan s’arriba al 100 %.

### Contracte de retorn

```ts
{
  projects: { used: number, limit: number | null, percent: number | null },
  seats:    { used: number, limit: number | null, percent: number | null },
  limitsReached: string[],  // ['projects'] | ['seats'] | ['projects','seats'] | []
  nearLimits: string[]      // recursos amb used/limit >= 0.8 (Slice 5)
}
```

Si no hi ha fila d’entitlements per l’org, els límits seran `null` i `limitsReached` / `nearLimits` restaran buits.

### Regles

- **NO** duplicar lògica d’entitlements (es reutilitza la capa de billing).
- **NO** tocar taules de billing directament; només llegir via `getOrgEntitlements` / `getOrgFeatureLimit`.
- **NO** tocar webhook ni subscriptions.
- **NO** hacks; només encapsular càlcul d’usage.

---

## Slice 2 — Hook React `useWorkspaceUsage`

### Fitxer i contracte del hook

- **Fitxer:** `src/hooks/useWorkspaceUsage.js`
- **Retorn:** `{ usage, isLoading, error, refresh }`
  - `usage`: objecte retornat per `getWorkspaceUsage` (o `null` si encara no s’ha carregat o no hi ha org).
  - `isLoading`: `true` mentre es resol la crida a `getWorkspaceUsage`.
  - `error`: missatge d’error si la crida falla; `null` si no n’hi ha.
  - `refresh`: funció sense arguments que torna a cridar el motor i actualitza l’estat.

### D’on surt l’orgId

El hook obté `orgId` des del **context existent**: fa servir `useWorkspace()` (el mateix que `useOrgBilling` / Billing UI) i en treu `activeOrgId`. No rep `orgId` per paràmetre.

### Regles del hook

- **NO** duplicar queries de projects o seats; tot passa per `getWorkspaceUsage` a `src/lib/workspace/usage.js`.
- **NO** recalcular entitlements; el motor ja ho fa.
- El hook és només **capa React** (estat, loading, error, refresh).

### Maneig d’estat

- **Loading inicial:** quan hi ha `activeOrgId`, es posa `isLoading` a `true` fins que `getWorkspaceUsage` resol o falla.
- **Error:** si `getWorkspaceUsage` llança, es guarda el missatge a `error` i `usage` es deixa `null`.
- **refresh():** en cridar-la, es torna a executar `getWorkspaceUsage` i es refresca `usage` / `error` / `isLoading`.

---

## Consum des de la UI

### Ús directe del motor (sense React)

```js
import { getWorkspaceUsage } from '../lib/workspace/usage'

const usage = await getWorkspaceUsage(supabase, orgId)
// usage.projects.used, usage.projects.limit, usage.projects.percent
// usage.seats.used, usage.seats.limit, usage.seats.percent
// usage.limitsReached, usage.nearLimits
```

### Ús des de components React (hook)

```js
const { usage, isLoading, error, refresh } = useWorkspaceUsage()

// usage pot ser null (loading o sense org)
usage?.projects.used
usage?.projects.limit
usage?.seats.used
usage?.seats.limit
usage?.limitsReached   // ['projects'] | ['seats'] | []
usage?.nearLimits      // []

// refrescar després d’una acció (p. ex. crear projecte)
refresh()
```

---

## Slice 3 — Integració amb `/app/billing`

### Billing com a primer consumidor oficial

La pàgina **`/app/billing`** (`src/pages/Billing.jsx`) és el primer consumidor oficial del workspace usage engine:

- **Font única d’usage:** deixa de dependre de càlculs dispersos o d’un hook altern; llegeix **només** de `useWorkspaceUsage()`.
- **Bloc Usage:** consumeix `usage.projects.used`, `usage.projects.limit`, `usage.seats.used`, `usage.seats.limit`. Loading net mentre el hook carrega; error discret si falla; la resta de la pantalla (Current Plan, Locked features) segueix funcional.
- **Secció Billing alerts:** els `LimitReachedBanner` (projects / seats) reben les mateixes dades des de `usage` retornat per `useWorkspaceUsage()`. No hi ha càlculs duplicats ni una segona font de veritat per used/limit.

### Regles respectades

- No es dupliquen queries de projects ni seats; tot passa per `getWorkspaceUsage` dins del motor.
- No es toquen webhook, taules de billing, entitlements engine ni lògica Stripe.

---

## Slice 4 — Alerta de límit al layout global

### Component `WorkspaceLimitAlert`

- **Fitxer:** `src/components/billing/WorkspaceLimitAlert.jsx`
- **Props:** `usage` (objecte retornat per `useWorkspaceUsage()`), `onUpgrade` (funció que obre Stripe Checkout; mateixa lògica que a Billing).
- **Comportament:**
  - Es mostra banner de **projects** si `usage.projects.limit != null` i `usage.projects.used >= usage.projects.limit`. Text: «Project limit reached. Upgrade your plan to create more projects.»
  - Es mostra banner de **seats** si `usage.seats.limit != null` i `usage.seats.used > usage.seats.limit`. Text: «Your workspace exceeded the seat limit. Upgrade your plan to add more team members.»
- **UX:** compacte, dismissible (un tancar per tipus); visible a tot `/app/*`. No bloqueja cap acció; només informa. El bloqueig real segueix als guards existents.
- **Botó Upgrade:** crida `onUpgrade()`; al layout es passa una funció que invoca `createStripeCheckoutSession(activeOrgId, 'growth')` i redirigeix a la URL de Checkout (sense nova lògica Stripe).

### Integració amb el layout global

- **Layout:** dins de `AppContent` (a `App.jsx`), just després de `BillingBanner` i abans de `TopNavbar`.
- **Dades:** `useWorkspaceUsage()` es crida al layout; el `usage` retornat es passa a `WorkspaceLimitAlert`. No es recalcula l’usage en cap altre lloc; tot ve del hook.
- **Visible** a totes les rutes `/app/*` (excepte les rutes de billing locked/over-seat, on el layout es renderitza sense sidebar ni aquests components).

### Rol dels alerts globals

- Converteixen el billing en **intel·ligència del sistema**: l’usuari pot veure que ha arribat al límit de projectes o seats encara que no entri a `/app/billing`.
- Complementen la pàgina Billing (on es veu el detall i es pot fer upgrade); no la substitueixen.

### Què NO s’ha tocat (Slice 4)

- `stripe_webhook`, `billing_subscriptions`, `billing_org_entitlements`, feature gating engine. No es recalcula l’usage; tot ve de `useWorkspaceUsage()`.

---

## Slice 5 — Detecció «near limit»

### Camp `nearLimits`

- **Regla:** si `used / limit >= 0.8`, el recurso s’afegeix a `nearLimits`.
- **Exemple de retorn:** `{ projects: { used, limit, percent }, seats: { used, limit, percent }, limitsReached: [], nearLimits: ["projects"] }` quan projectes estan al 80 % o més.
- Només s’enriqueix el resultat del motor; no es toquen billing tables, entitlements ni lògica Stripe.

---

## Properes slices (previst)

- Altres vistes que necessitin `limitsReached` / `nearLimits` mitjançant `useWorkspaceUsage`.
