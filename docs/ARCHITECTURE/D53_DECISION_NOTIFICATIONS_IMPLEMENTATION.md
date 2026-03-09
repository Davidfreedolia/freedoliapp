# D53 — Decision Notifications Implementation (In-app Only)

Status: Draft

---

## 1. Objectiu

Implementar la primera fase de **Decision Notifications in-app** per a FREEDOLIAPP, seguint:

- L’arquitectura de D37 — Decision Notifications (channels, triggers, read/unread).
- El model de navegació de D46 — Decision UX Navigation Model (Topbar → Inbox).

Objectiu funcional:

- Permetre que el seller vegi decisions noves/rellevants sense haver d’entrar explícitament a `/app/decisions`, mitjançant:
  - Un **badge** al topbar.
  - Un **dropdown** lleuger amb les últimes decisions no vistes.

Fora d’abast:

- Email, push, websocket o altres canals externs.
- Digest periòdic (només in-app in this phase).

---

## 2. Components creats

### 2.1 `DecisionBadge` (`src/components/decisions/DecisionBadge.jsx`)

Responsabilitats:

- Carregar les notificacions de decisions per a l’org activa:
  - Utilitza `getDecisionNotifications({ orgId, limit: 10 })`.
  - Deriva el **recompte** de decisions no vistes.
- Mostrar un **Botó amb icona** (Bell) al topbar:
  - Amb un **badge numèric** quan hi ha decisions no vistes.
- Gestionar l’estat d’obertura del dropdown:
  - Obrir/tancar en clicar.
  - Tancar en fer clic fora del component.
- En clicar una notificació:
  - Crida `trackDecisionViewed({ decisionId })`.
  - Navega a `/app/decisions?id=<decision_id>`.
  - Recàrrega les notificacions en background.

Integració:

- Afegit a la secció dreta de `TopNavbar` (`src/components/TopNavbar.jsx`), al costat del mode (DEMO/LIVE) i abans dels widgets de preferències/usuari.

### 2.2 `DecisionDropdown` (`src/components/decisions/DecisionDropdown.jsx`)

Responsabilitats:

- Renderitzar el **dropdown** ancorat al `DecisionBadge`:
  - Conté:
    - Capçalera (“Decisions” + botó `Close`).
    - Llista scrolleable d’items o missatges d’estat.
- Estats suportats:
  - `loading`: mostra “Loading decisions…”.
  - `error`: mostra error bàsic.
  - `empty`: mostra “No new decisions.”.
  - `items`: llista d’items via `DecisionNotificationItem`.
- Props:
  - `items`: array de decisions.
  - `loading`, `error`.
  - `onItemClick(item)`: cridat quan l’usuari selecciona una decisió.
  - `onClose()`: per tancar el dropdown.

### 2.3 `DecisionNotificationItem` (`src/components/decisions/DecisionNotificationItem.jsx`)

Responsabilitats:

- Mostrar un **item compacte** per a cada decisió:
  - **Severity dot** (color segons severitat).
  - **Title** (truncat).
  - **Severity + created_at** en una línia auxiliar.
- Props:
  - `item`: `{ id, title, severity, createdAt }`.
  - `onClick(item)`: es dispara en clicar.

Estil:

- Consistent amb `DecisionRow` però optimitzat per a espai reduït al dropdown.

---

## 3. Data Source i contracte

### 3.1 `getDecisionNotifications` (`src/lib/decisions/getDecisionNotifications.js`)

Ja existia com a helper alineat amb D37; D53 l’utilitza com a font de veritat.

Contracte:

- Input:
  - `orgId` (obligatori).
  - `limit` (opcional, per defecte 10; D53 passa `limit: 10`).
- Sortida:
  - `{ items: Array<{ id, title, severity, createdAt }>, total: number }`.

Lògica clau (D37-aligned, simplificada):

- Base set:
  - `decisions` amb:
    - `org_id = orgId`.
    - `status = 'open'`.
    - Ordenades per `created_at DESC`.
    - Límit base `baseLimit = max(limit * 3, limit)` per tenir marge de filtratge.
- Filtrat per severitat:
  - Deriva `severity` de `priority_score` (`high`, `medium`, `low`).
  - Inclou només:
    - `high` o `medium` (D53 considera ambdues com a notificables).
- Read tracking:
  - Carrega `decision_events` amb:
    - `event_type = 'decision_viewed'`.
    - `decision_id` dins del conjunt elegible.
  - Extreu els events on:
    - `event_data.actor_id === currentUserId`.
  - Marca com a **unread** les decisions que **no** tenen `decision_viewed` per l’usuari.

Performance i guardrails:

- **Org-scoped** (`eq('org_id', orgId)`).
- Índexs utilitzats:
  - `decisions`: `org_id`, `status`, `created_at`.
  - `decision_events`: `decision_id`, `created_at`.
- Límit efectiu:
  - D53 passa `limit = 10`, i s’aplica `slice(0, limit)` després de filtratge.

### 3.2 `trackDecisionViewed` (`src/lib/decisions/trackDecisionViewed.js`)

Responsabilitats:

- Registrar un event `decision_viewed` a `decision_events` quan:
  - L’usuari obre una decisió des del dropdown.
- No canvia:
  - `status` ni altres camps de la decisió.

Event:

- `event_type: 'decision_viewed'`.
- `event_data`:
  - `actor_type: 'user' | 'system'`.
  - `actor_id: currentUserId | null`.
  - `source: 'topbar_decision_dropdown'`.

Traçabilitat:

- Permet reconstruir quines decisions s’han vist via el topbar i per quin usuari.

---

## 4. Flux d’interacció

### 4.1 Visualització del badge

1. L’usuari inicia sessió i entra a l’app.
2. `TopNavbar` es renderitza i inclou `<DecisionBadge />`.
3. `DecisionBadge`:
   - Obté `activeOrgId` via `useWorkspace`.
   - Crida `getDecisionNotifications({ orgId, limit: 10 })`.
   - Desa la llista en estat local i calcula `count = items.length`.
4. El botó del badge:
   - Mostra la icona `Bell`.
   - Si `count > 0`, mostra un badge numèric vermell amb `count`.

### 4.2 Obertura del dropdown

1. L’usuari clica el botó del badge.
2. `DecisionBadge`:
   - Inverteix l’estat `open`.
   - Si passa a `true`, torna a cridar `getDecisionNotifications` (refresc lleuger).
3. Es renderitza `DecisionDropdown` sota el botó:
   - Mostra:
     - Estats `loading`, `error` o llista d’items.
   - Limita la llista als **últims 10** elements via el `limit`.
4. Si l’usuari fa clic fora del component:
   - Un manejador global tanca el dropdown (`open = false`).

### 4.3 Obertura d’una decisió des del dropdown

1. L’usuari clica un `DecisionNotificationItem`.
2. `DecisionBadge`:
   - Crida `trackDecisionViewed({ decisionId })`.
   - Tanca el dropdown (`open = false`).
   - Navega a `/app/decisions?id=<decision_id>` mitjançant `useNavigate`.
   - Llança un `loadNotifications()` en background per actualitzar el recompte.
3. Quan es recarreguen notificacions:
   - La decisió amb event `decision_viewed` per l’usuari ja no es considera “unread”.
   - El badge s’actualitza i la decisió desapareix del dropdown.

Aquest flux compleix:

- Els requisits de **read tracking** de D37 (basat en events).
- Les regles de navegació de D46:
  - Topbar / Notifications → Inbox (`/app/decisions`).

---

## 5. Limitacions actuals

1. **Sense preferències org/user**  
   - D37 defineix un model de preferències (org-level, user-level, severity thresholds), però:
     - D53 no l’implementa encara.
   - Actualment:
     - Totes les decisions `open` de severitat `high` o `medium` són candidates.

2. **Sense digest ni altres canals**  
   - Només hi ha:
     - In-app badge.
     - Dropdown lleuger.
   - No hi ha email, push ni vista de digest.

3. **Severitat derivada només de `priority_score`**  
   - `deriveSeverity` (tant per inbox com per notificacions) mapeja:
     - `>= 100` → `high`.
     - `>= 50` → `medium`.
     - Altres → `low`.
   - No hi ha encara:
     - Model de severitat explícit a `decisions`.

4. **Sense throttling avançat**  
   - La càrrega de notificacions es fa:
     - Al muntatge del component.
     - En cada obertura del dropdown.
   - No hi ha encara:
     - Throttling horari per org.
     - Mecanismes complexos de protecció en cas de pics.

5. **Read model només per topbar**  
   - `decision_viewed` amb `source = 'topbar_decision_dropdown'`:
     - Es fa servir per el read tracking del badge.
   - No hi ha encara:
     - Model unificat de “seen” entre Inbox i Topbar.

6. **Sense linker directe a un estat específic d’Inbox**  
   - La navegació és:
     - `/app/decisions?id=<decision_id>`.
   - La pàgina `Decisions.jsx` encara no interpreta l’`id` des de la query per fer `auto-select` inicial (futur refactor possible).
   - No obstant:
     - Es compleix el contracte principal de D46 (Topbar → Inbox), i l’usuari veu la vista principal d’Inbox amb la decisió accessible.

---

## 6. Definition of Done (D53)

D53 — Decision Notifications Implementation (in-app only) es considera complet quan:

- [x] S’ha implementat un **badge de decisions** al topbar (`DecisionBadge`) que:
  - [x] Mostra el nombre de decisions `open` no vistes (high/medium).
  - [x] És sempre org-scoped (`org_id` via `useWorkspace`).
- [x] S’ha implementat un **dropdown de notificacions** (`DecisionDropdown`) que:
  - [x] Mostra com a màxim les **últimes 10 decisions** via `getDecisionNotifications`.
  - [x] Mostra `title`, `severity` i `created_at` per item (`DecisionNotificationItem`).
- [x] S’ha implementat **read tracking** mitjançant:
  - [x] `trackDecisionViewed` que insereix `decision_viewed` a `decision_events`.
  - [x] Actualització del badge per eliminar decisions vistes.
- [x] S’ha mantingut:
  - [x] Org-scoping i ús d’índexs existents (`org_id`, `status`, `created_at`).
  - [x] Compliment dels guardrails de D52 (backend-first, event-driven traceability, multi-tenant).
- [x] S’ha documentat:
  - [x] Objectiu, components creats, flux d’interacció i limitacions actuals en aquest document.

# D53 — Decision Notifications Implementation (In-app only)

Status: Draft

---

## 1. Objectiu

D53 implementa la primera iteració de **Decision Notifications in-app**, seguint els contractes definits a:

- `D37_DECISION_NOTIFICATIONS.md` (arquitectura de notificacions).
- `D46_DECISION_UX_NAVIGATION_MODEL.md` (model de navegació entre Topbar/Notifications i Decision Inbox).

Objectiu concret:

- Permetre que el seller vegi decisions noves (obertes i rellevants) des del **topbar**, sense haver d’entrar manualment a `/app/decisions`, mantenint:
  - Model de dades canònic (`decisions`, `decision_events`).
  - Multi-tenant isolation (`org_id`).
  - Traçabilitat (`decision_viewed` events).

Fora d’abast:

- Email, push, websocket o altres canals.
- Digest diari/setmanal.
- Preferences UI i configuració avançada.

---

## 2. Components creats / actualitzats

### 2.1 Components nous

- `src/components/decisions/DecisionNotificationItem.jsx`
  - Representa una entrada individual al dropdown de notificacions.
  - Mostra:
    - `title`
    - `severity` (amb dot de color)
    - `created_at` (formatat en `toLocaleString()`).
  - Contracte:
    - `item: { id, title, severity, createdAt }`
    - `onClick(item)` → callback quan l’usuari clica l’element.

- `src/components/decisions/DecisionDropdown.jsx`
  - Dropdown ancorat al topbar per llistat de decisions notificables.
  - Props:
    - `items`: llista de decisions notificables.
    - `loading`: estat de càrrega.
    - `error`: error opcional.
    - `onItemClick(item)`: es dispara en clicar un item.
    - `onClose()`: tanca el dropdown.
  - Responsabilitats:
    - Renderitzar:
      - Estat “Loading…”.
      - Error.
      - Missatge “No new decisions”.
      - Llista de `DecisionNotificationItem`.
    - No fa fetch directament; es limita a presentació.

- `src/components/decisions/DecisionBadge.jsx`
  - Component principal al **topbar** encarregat de:
    - Mostrar la icona de campana amb el badge de recompte.
    - Obre/tanca el `DecisionDropdown`.
    - Carrega dades de notificacions via servei.
    - Gestionar el clic d’un element:
      - Registra `decision_viewed`.
      - Navega a `/app/decisions?id=<decision_id>`.
      - Elimina l’element del badge (lectura local).
  - Dependències:
    - `useWorkspace` → `activeOrgId`.
    - `useNavigate` (react-router).
    - `getDecisionNotifications` (service layer).
    - `trackDecisionViewed` (service layer).

### 2.2 Components existents actualitzats

- `src/components/TopNavbar.jsx`
  - S’ha substituït el sistema antic d’`alerts` (taula `alerts`, drawer lateral) pel nou **Decision Badge**:
    - Importa i rendeix `DecisionBadge` dins la secció dreta del topbar.
    - Elimina:
      - Estat i lògica d’`alerts`.
      - RPCs `alert_acknowledge`, `alert_resolve`, `alert_mute`.
      - Drawer a pantalla completa per alerts.
  - Manté:
    - Notes, help modal, avatar, logout, time widget, mode DEMO/LIVE.
  - Resultat:
    - El **Bell** del topbar ara reflecteix exclusivament **Decision Notifications** segons D37/D53.

- `src/pages/Decisions.jsx`
  - Afegida integració amb `?id=<decision_id>`:
    - Usa `useSearchParams` per llegir i escriure el paràmetre `id`.
    - Quan carrega la pàgina:
      - Si `id` és present i la decisió és a la llista carregada, la selecciona automàticament.
    - Quan l’usuari selecciona una decisió des de la llista:
      - Actualitza `?id=` a l’URL amb l’`id` seleccionat.
    - Quan es fa una acció de lifecycle (`updateDecisionStatus`):
      - Recarrega la llista.
      - Manté `?id=` apuntant a la decisió afectada.
  - Això permet que els enllaços des de el topbar (dropdown) aterrin a la decisió correcta dins la Inbox.

### 2.3 Service layer existent reutilitzat

Ja existien (definits per preparar D37/D53, no usats fins ara):

- `src/lib/decisions/getDecisionNotifications.js`
  - Carrega notificacions de decisions “no vistes” per a l’usuari actual en una org.
  - Criteris (simplificats, compatibles amb D37):
    - `org_id = activeOrgId`
    - `status = 'open'`
    - Severitat derivada de `priority_score`:
      - inclou `high` i `medium`, ignora `low`.
    - Exclou decisions que ja tenen `decision_viewed` per l’actor actual (via `decision_events`).
    - Limita a `limit` (10 per D53).

- `src/lib/decisions/trackDecisionViewed.js`
  - Insereix un event a `decision_events`:
    - `event_type = 'decision_viewed'`
    - `event_data.actor_id = currentUserId`
    - `event_data.source = 'topbar_decision_dropdown'`
  - No canvia `status` ni altres camps de `decisions`.

---

## 3. Flux d’interacció

### 3.1 Flux complet Topbar → Inbox

1. L’usuari entra a l’app autenticat, amb `activeOrgId` resolt via `WorkspaceContext`.
2. `TopNavbar` rendeix:
   - Controls existents (notes, help, mode, user).
   - **`<DecisionBadge />`**.
3. Quan l’usuari fa clic a la campana (`DecisionBadge`):
   - Es commuta l’estat `open`.
   - Si el dropdown s’obre:
     - Es crida `getDecisionNotifications({ orgId, limit: 10 })`.
     - Es mostren fins a 10 decisions “no vistes”:
       - title
       - severity (high / medium)
       - created_at (data i hora).
4. Quan l’usuari fa clic sobre una notificació (un `DecisionNotificationItem`):
   - Es crida `trackDecisionViewed({ decisionId })` (best-effort).
   - El component:
     - Elimina la decisió de la llista interna (`setItems`).
     - Tanca el dropdown.
     - Navega a `/app/decisions?id=<decision_id>`.
5. A `Decisions.jsx`:
   - L’efecte de càrrega de pàgina llegeix `id` de `useSearchParams`.
   - Carrega una pàgina de decisions per `activeOrgId`.
   - Després de filtrar:
     - Si troba la decisió amb `id` de l’URL:
       - La marca com a seleccionada.
     - Si no, fa fallback a la primera de la llista.
6. El panell de detall:
   - Mostra la decisió seleccionada.
   - L’usuari pot aplicar accions de lifecycle (`acknowledge`, `acted`, `dismissed`) via `updateDecisionStatus`.

### 3.2 Read tracking i model “unread”

- **Unread per usuari**:
  - `getDecisionNotifications` filtra decisions que:
    - No tenen `decision_viewed` per `actor_id = currentUserId`.
  - Això introdueix un model de “vist/no vist” per usuari, sense taula addicional.
- **Tracking d’obertura**:
  - Només quan l’usuari obre la decisió des del dropdown:
    - Es registra `decision_viewed`.
  - Obres des de la Inbox per altres vies (sidebar, widget, etc.) poden ser afegides en fases futures si cal.
- **Impacte al badge**:
  - El badge reflecteix:
    - Nombre d’elements carregats com a “no vists” a l’últim fetch.
  - Després de clicar una notificació:
    - L’element es retira del llistat local.
    - El badge decreix sense esperar un nou fetch.

---

## 4. Limitacions i decisions de performance

### 4.1 Limitacions actuals

- **Només status `open`**:
  - D37 permetria considerar també `acknowledged` segons preferències.
  - D53, per simplicitat, utilitza només `status = 'open'` com a base per notificacions.
- **Sense preferences UI**:
  - No hi ha encara configuració per org/user sobre:
    - canals
    - thresholds de severitat
  - L’implementació assumeix:
    - High + medium són elegibles per tothom.
- **Només tracking via dropdown**:
  - `decision_viewed` només es registra quan l’usuari obre des de la campana.
  - Future work:
    - Marcar com a “vist” en altres recorreguts (p. ex. quan la decisió entra a la vista a la Inbox).

### 4.2 Performance guardrails aplicats

- **Queries org-scoped**:
  - `getDecisionNotifications` filtra sempre per `org_id = activeOrgId`.
- **Limit a 10 decisions**:
  - Service layer aplica `limit` i un marge intern petit (`baseLimit`) per filtratge.
- **Índexs existents**:
  - Es reaprofiten índexs de `decisions`:
    - `idx_decisions_org_id`
    - `idx_decisions_created_at`
  - Per `decision_events`, l’ús actual:
    - Selecciona per `decision_id` + `event_type`.
    - Escala bé perquè la llista es limita a unes poques desenes d’IDs.
- **No hi ha polling agressiu**:
  - Les notificacions es carreguen quan:
    - Es desplega el dropdown.
  - No hi ha interval de refresh continu per evitar càrrega innecessària.

---

## 5. Definition of Done (D53)

D53 es considera complet quan:

- [x] Existeix un **Topbar Decision Badge** que:
  - Mostra un recompte d’últimes decisions obertes i rellevants (high/medium).
  - Està limitat a les 10 decisions més recents.
  - És sempre org-scoped.
- [x] En clicar el badge:
  - S’obre un **Decision Dropdown** amb:
    - title, severity, created_at.
    - Enllaç implícit cap a `/app/decisions?id=<decision_id>`.
- [x] Quan l’usuari obre una decisió des del dropdown:
  - S’insereix un event `decision_viewed` a `decision_events`.
  - L’element desapareix del badge localment.
  - L’usuari és redirigit a la pàgina `/app/decisions` amb la decisió seleccionada.
- [x] El flux és coherent amb:
  - L’arquitectura de D37 (canal in-app, triggers i read/unread).
  - El model de navegació de D46 (Topbar → Inbox com a superfície operativa).
- [x] No s’ha introduït cap canal de notificació extern ni s’ha alterat el model canònic de decisions.

