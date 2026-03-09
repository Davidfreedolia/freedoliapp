# D23 — Internal Admin Console

Status: DRAFT

## 1. Objectiu

Crear una consola interna per operar Freedoliapp com a SaaS.

Aquesta consola permetrà a l'equip:

- veure trials
- veure conversions
- veure workspaces
- veure subscripcions
- diagnosticar problemes

No és part del producte per l'usuari final.

Només per administració interna.

---

## 2. Àmbit

Inclou:

- lectura de dades SaaS
- diagnòstic operatiu
- observabilitat bàsica

No inclou:

- modificació de dades sensibles
- accions destructives
- billing manual

---

## 3. Seccions previstes

### Trials

Font:

trial_registrations

Mostra:

- email
- created_at
- workspace_id
- status
- converted_at

---

### Workspaces

Font:

organisations / workspaces

Mostra:

- workspace_id
- name
- created_at
- owner
- plan

---

### Subscriptions

Font:

billing_subscriptions

Mostra:

- workspace_id
- stripe_subscription_id
- status
- current_period_end
- plan

---

### Conversions

Font:

trial_registrations

Mostra:

- email
- workspace
- trial_created
- converted_at
- conversion_time

---

## 4. Arquitectura

Admin console viu dins la mateixa app.

Ruta protegida.

Exemple:

/app/admin

Accés limitat a:

admin role.

---

## 5. Regles arquitectòniques

No duplicar engines.

No tocar Stripe.

Només lectura.

---

## 6. Definition of done

Document creat.

Fonts de dades definides.

Seccions definides.

Sense implementació UI.

---

## 7. Admin UI Data Contract

Definir l'estructura exacta de dades que la UI d'admin consumirà.

No implementar encara cap pàgina.

---

## Trials View — data shape

Font:
trial_registrations

Cada fila:

{
  id: string,
  email: string,
  workspaceId: string | null,
  status: 'started' | 'workspace_created' | 'converted',
  createdAt: string,
  convertedAt: string | null
}

Ordenació per defecte:

createdAt DESC

---

## Workspaces View — data shape

Font:
organisations / workspaces

Cada fila:

{
  workspaceId: string,
  name: string,
  ownerEmail: string | null,
  createdAt: string,
  plan: string | null
}

Ordenació:

createdAt DESC

---

## Subscriptions View — data shape

Font:
billing_subscriptions

Cada fila:

{
  workspaceId: string,
  stripeSubscriptionId: string,
  status: string,
  plan: string | null,
  currentPeriodEnd: string | null
}

Ordenació:

currentPeriodEnd ASC

---

## Conversions View — data shape

Font:
trial_registrations

Cada fila:

{
  email: string,
  workspaceId: string | null,
  trialCreatedAt: string,
  convertedAt: string,
  conversionTimeHours: number
}

conversionTimeHours = difference(convertedAt - trialCreatedAt)

Ordenació:

convertedAt DESC

---

## 8. Performance constraints

Admin console ha de:

- suportar milers de registres
- carregar via async
- no bloquejar UI

Preferiblement:

- paginació
- queries limitades

---

## 9. Security rules

Admin console:

- accessible només a usuaris amb rol `admin`
- ruta protegida `/app/admin`
- no exposar a usuaris normals

---

### Current implementation status

- pàgina `src/pages/AdminConsole.jsx` creada
- ruta protegida `/app/admin` activa
- Trials View implementada
- Workspaces View implementada
- Subscriptions View implementada
- Conversions View implementada
- només lectura
- cap mutació admin
- cap engine nou creat

---

### Implemented Contract

#### Page scope

D23 implementa una única pàgina agregadora:

- `src/pages/AdminConsole.jsx`

La consola és interna, protegida i només de lectura.

#### Trials View

- font: `trial_registrations`
- columnes mostrades:
  - Email
  - Created
  - Workspace
  - Status
  - Converted
- ordenació per `created_at DESC`

#### Workspaces View

- fonts reals usades al projecte:
  - `orgs` / model real de workspace
  - `billing_org_entitlements`
  - `billing_plans`
- columnes mostrades:
  - Workspace
  - Name
  - Owner
  - Created
  - Plan
- si `ownerEmail` no és disponible des de font fiable client-side, es mostra placeholder (`—`)
- ordenació per `created_at DESC`

#### Subscriptions View

- font: `billing_subscriptions`
- columnes mostrades:
  - Workspace
  - Stripe Subscription
  - Status
  - Plan
  - Period End
- ordenació per `current_period_end ASC`

#### Conversions View

- font: `trial_registrations`
- filtre:
  - `status = converted`
  - `converted_at IS NOT NULL`
- columnes mostrades:
  - Email
  - Workspace
  - Trial Created
  - Converted
  - Conversion Time
- `Conversion Time` calculat al client com diferència entre `converted_at` i `created_at` en hores
- ordenació per `converted_at DESC`

---

### UI behaviour implemented

- loading states per secció
- errors recuperables per secció
- empty states clars
- sense tabs
- sense filtres
- sense accions d'admin
- sense mutacions
- sense billing manual

---

### Security implemented

- ruta protegida `/app/admin`
- accés limitat a rol admin segons el patró existent del projecte
- consola no exposada a usuaris normals

---

### Definition of done

Completats:

- contracte documentat
- data contract documentat
- pàgina base admin
- Trials View
- Workspaces View
- Subscriptions View
- Conversions View
- ruta protegida
- només lectura
- sense tocar Stripe ni billing engine
