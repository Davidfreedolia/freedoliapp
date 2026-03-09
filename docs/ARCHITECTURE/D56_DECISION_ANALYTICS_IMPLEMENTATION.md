# D56 — Decision Analytics Implementation

Status: Draft

---

## 1. Objectiu

Implementar la primera capa d’**analytics de decisions** a FREEDOLIAPP, seguint:

- D39 — Decision Analytics (definició de mètriques i agregacions).

Objectiu funcional:

- Calcular i exposar mètriques clau sobre:
  - Creació i estat de decisions.
  - Comportament dels sellers (ack/acted/dismissed).
  - Feedback explícit (`useful` / `wrong`) des de D55.
- Integrar aquestes mètriques al `Decision Dashboard` com a widgets executius, mantenint:
  - Multi-tenant isolation.
  - Performance acceptable per finestres 7/30/90 dies.

---

## 2. Fitxers creats / modificats

### 2.1 Service layer (analytics)

- `src/lib/decisions/getDecisionDashboardData.js`
  - Nous helpers:
    - `getDecisionAnalyticsSummary({ orgId, days })` — càlcul complet d’analytics.
    - `getDecisionActionStats({ orgId, days })` — wrapper centrat en mètriques d’acció (creation/ack/acted/dismissed/time-to-action).
    - `getDecisionFeedbackStats({ orgId, days })` — wrapper centrat en mètriques de feedback (useful/wrong).

### 2.2 Pàgina

- `src/pages/DecisionDashboard.jsx`
  - Integració de `getDecisionAnalyticsSummary` i nous widgets:
    - Feedback distribution.
    - Time-to-action distribution.

### 2.3 Documentació

- `docs/ARCHITECTURE/D56_DECISION_ANALYTICS_IMPLEMENTATION.md`
  - Aquest document.

---

## 3. Mètriques implementades

Totes les mètriques estan limitades a:

- Una **org** (`orgId`).
- Una **finestra temporal** (`days` ∈ {7, 30, 90}).

### 3.1 `getDecisionAnalyticsSummary({ orgId, days })`

Fitxer: `src/lib/decisions/getDecisionDashboardData.js`

Sortida:

```js
{
  overall: {
    createdCount,
    creationRatePerDay,
    acknowledgedRate,
    actedRate,
    dismissedRate,
    avgTimeToActionHours,
    feedbackUsefulRate,
    feedbackWrongRate,
  },
  byType: {
    [decision_type]: {
      createdCount,
      acknowledgedCount,
      actedCount,
      dismissedCount,
      feedbackUseful,
      feedbackWrong,
      feedbackTotal,
    },
    ...
  },
  bySeverity: {
    [severity]: {
      createdCount,
      acknowledgedCount,
      actedCount,
      dismissedCount,
      feedbackUseful,
      feedbackWrong,
      feedbackTotal,
    },
    ...
  },
  timeToActionBuckets: {
    '<1h': number,
    '1-24h': number,
    '1-3d': number,
    '>3d': number,
  },
}
```

#### 3.1.1 Decision creation rate

- `createdCount`:
  - Nombre de decisions creades per a l’org amb:
    - `decisions.org_id = orgId`.
    - `decisions.created_at >= fromIso`.
- `creationRatePerDay`:
  - `createdCount / days`.

#### 3.1.2 Acknowledgement / acted / dismiss rates

A nivell **overall**:

- `acknowledgedRate`:
  - `acknowledgedCount / createdCount`.
  - `acknowledgedCount` = decisions amb:
    - almenys un `decision_events.event_type = 'acknowledged'` dins la finestra.
- `actedRate`:
  - `actedCount / createdCount`.
  - `actedCount` = decisions amb:
    - almenys un event `event_type = 'acted'`.
- `dismissedRate`:
  - `dismissedCount / createdCount`.
  - `dismissedCount` = decisions amb:
    - almenys un event `event_type = 'dismissed'`.

A nivell **byType** / **bySeverity**:

- Per cada `decision_type` i severitat derivada (`deriveSeverity(priority_score)`):
  - Es mantenen:
    - `createdCount`, `acknowledgedCount`, `actedCount`, `dismissedCount`.
  - Les rates es poden derivar fàcilment al client:
    - `ackRate = acknowledgedCount / createdCount`, etc.

#### 3.1.3 Feedback useful / wrong rate

Es basen en events de:

- `decision_events.event_type` ∈:
  - `decision_feedback_useful`
  - `decision_feedback_not_useful`
  - `decision_feedback_wrong`

Comptadors:

- `feedbackUseful`:
  - Suma de events `decision_feedback_useful`.
- `feedbackWrong`:
  - Suma de events `decision_feedback_wrong`.
- `feedbackTotal`:
  - Suma de tots els events de feedback (incloent `not_useful`).

Rates:

- `feedbackUsefulRate = feedbackUseful / feedbackTotal` (si `feedbackTotal > 0`).
- `feedbackWrongRate = feedbackWrong / feedbackTotal`.

A nivell per tipus i severitat:

- S’actualitzen els mateixos comptadors a:
  - `byType[decision_type]`.
  - `bySeverity[severity]`.

#### 3.1.4 Average time-to-action i buckets

Per cada decisió:

- Es calcula el temps (en hores) entre:
  - `created_at` i el primer event `acted` o `dismissed` dins la finestra.
- `timeToActionHours` es guarda a `perDecision`.

Agregació:

- `avgTimeToActionHours`:
  - Mitjana d’`timeToActionHours` per totes les decisions amb valor definit.
- `timeToActionBuckets`:
  - `<1h`: `h < 1`.
  - `1-24h`: `1 <= h < 24`.
  - `1-3d`: `24 <= h < 72`.
  - `>3d`: `h >= 72`.

Aquestes dades serveixen de base per a la resta de helpers i per als widgets del Dashboard.

### 3.2 `getDecisionActionStats({ orgId, days })`

Wrapper sobre `getDecisionAnalyticsSummary` que retorna:

- `overall`:
  - `createdCount`
  - `creationRatePerDay`
  - `acknowledgedRate`
  - `actedRate`
  - `dismissedRate`
  - `avgTimeToActionHours`
- `byType` i `bySeverity`:
  - Referència directa als agregats de `getDecisionAnalyticsSummary` per tipus i severitat.
- `timeToActionBuckets`:
  - Reutilitza el mateix histograma de temps fins a acció.

Propòsit:

- Proporcionar una API clara per consumidors que només necessiten **mètriques d’acció**, sense haver de conèixer l’estructura completa de `getDecisionAnalyticsSummary`.

### 3.3 `getDecisionFeedbackStats({ orgId, days })`

Wrapper sobre `getDecisionAnalyticsSummary` que retorna:

- `overall`:
  - `createdCount`
  - `feedbackUsefulRate`
  - `feedbackWrongRate`
- `byType`:
  - Per cada `decision_type`:
    - `createdCount`
    - `feedbackUseful`
    - `feedbackWrong`
    - `feedbackTotal`
- `bySeverity`:
  - Per cada severitat:
    - `createdCount`
    - `feedbackUseful`
    - `feedbackWrong`
    - `feedbackTotal`

Propòsit:

- Exposar un contracte específic de **feedback analytics** per a altres superfícies (dashboards futurs, informes interns) sense duplicar lògica de càlcul.

---

## 4. Fonts de dades i queries utilitzades

### 4.1 Decisions

Query principal (analytics summary):

```js
supabase
  .from('decisions')
  .select('id, decision_type, priority_score, created_at')
  .eq('org_id', orgId)
  .gte('created_at', fromIso)
```

Notes:

- **Org-scoped** via `eq('org_id', orgId)`.
- Limitat per finestra temporal via `gte('created_at', fromIso)`.
- `deriveSeverity(priority_score)` defineix:
  - `high` | `medium` | `low`.

### 4.2 Decision events

Query d’events per a decisions en finestra:

```js
supabase
  .from('decision_events')
  .select('decision_id, event_type, created_at, event_data')
  .in('decision_id', decisionIds)
  .gte('created_at', fromIso)
```

Notes:

- **Org-scoped indirectament**:
  - `decisionIds` provenen de `decisions` ja filtrades per `org_id`.
  - RLS a `decision_events` utilitza `decisions` com a font.
- Finestra temporal garantida via `gte('created_at', fromIso)`.

Tipus d’events rellevants:

- Lifecycle:
  - `acknowledged`
  - `acted`
  - `dismissed`
- Feedback:
  - `decision_feedback_useful`
  - `decision_feedback_not_useful`
  - `decision_feedback_wrong`

---

## 5. Integració al Decision Dashboard

### 5.1 Ús de `getDecisionAnalyticsSummary` a `DecisionDashboard.jsx`

Fitxer: `src/pages/DecisionDashboard.jsx`

Canvis:

- Import:

```js
import {
  getDecisionDashboardSummary,
  getDecisionDashboardGroups,
  getDecisionDashboardRecentActivity,
  getDecisionAnalyticsSummary,
} from '../lib/decisions/getDecisionDashboardData'
```

- Estat:

```js
const [analytics, setAnalytics] = useState(null)
```

- Càrrega:

```js
const [s, g, r, a] = await Promise.all([
  getDecisionDashboardSummary({ orgId: activeOrgId, days: windowDays }),
  getDecisionDashboardGroups({ orgId: activeOrgId, days: windowDays }),
  getDecisionDashboardRecentActivity({ orgId: activeOrgId, days: windowDays, limit: 20 }),
  getDecisionAnalyticsSummary({ orgId: activeOrgId, days: windowDays }),
])
setSummary(s)
setGroups(g)
setRecent(r)
setAnalytics(a)
```

- Valors derivats:

```js
const timeToActionBuckets = analytics?.timeToActionBuckets || {}
const feedbackUsefulRate = analytics?.overall?.feedbackUsefulRate ?? 0
const feedbackWrongRate = analytics?.overall?.feedbackWrongRate ?? 0
```

### 5.2 Nous widgets

#### 5.2.1 Feedback distribution

Widget `Card` amb:

- Dues xifres principals:
  - `Useful` → `formatPercent(feedbackUsefulRate)`.
  - `Wrong` → `formatPercent(feedbackWrongRate)`.
- Text de context:
  - “Share of decisions with explicit feedback marked as useful or wrong in this window.”

Propòsit:

- Mostrar ràpidament:
  - Quina part del feedback explícit és positiu vs “wrong”.

#### 5.2.2 Time-to-action distribution

Widget `Card` + `SimpleBarList`:

- Dades:
  - `timeToActionBuckets`:
    - `<1h`, `1-24h`, `1-3d`, `>3d`.
- Text:
  - “How quickly decisions are acted on or dismissed after creation.”

Propòsit:

- Visualitzar la distribució del temps fins a acció per decisions tancades en la finestra.

### 5.3 Finestra temporal (7 / 30 / 90 dies)

- `WINDOW_OPTIONS` a `DecisionDashboard.jsx`:
  - Ara inclou:
    - 7, 30 i 90 dies.
- Canviar el select:
  - Actualitza `windowDays`, que s’aplica a totes les crides de:
    - `getDecisionDashboardSummary`.
    - `getDecisionDashboardGroups`.
    - `getDecisionDashboardRecentActivity`.
    - `getDecisionAnalyticsSummary`.

---

## 6. Multi-tenant i performance

### 6.1 Multi-tenant safety

Per totes les funcions analytics:

- `decisions`:
  - Sempre amb `eq('org_id', orgId)`.
- `decision_events`:
  - Filtrat per:
    - `.in('decision_id', decisionIds)`.
    - Finestra temporal `created_at >= fromIso`.
  - RLS de `decision_events` garanteix que només s’accedeixen events per decisions de l’org.

### 6.2 Performance

Escala:

- D56 està dissenyat per:
  - Finestra màxima de 90 dies per org.
  - Volum raonable de decisions/action-events en aquesta finestra.

Regles:

- No s’utilitzen:
  - Consultes “all time”.
  - Full table scans no acotats.
- Totes les agregacions:
  - Es fan a memòria després de llegir:
    - Decisions de l’org dins la finestra.
    - Events per a aquestes decisions dins la finestra.

Futurs passos (per volums grans, segons D39/D50):

- Introduir:
  - Vistes materialitzades o taules de resum.
  - Job d’actualització periòdica.
  - Reutilitzar la mateixa signatura de service layer amb preferència per llegir d’agregats.

---

## 7. Limitacions actuals

1. **Sense breakdown visual per tipus/severitat**  
   - `getDecisionAnalyticsSummary` ja calcula:
     - `byType` i `bySeverity`.
   - D56 no afegeix encara widgets específics per aquests agregats.

2. **Time-to-action sense medians/p90**  
   - Es calcula només:
     - `avgTimeToActionHours`.
     - Distribució per buckets (histograma simple).
   - P90/p99 es podrien afegir en futures fases.

3. **Feedback parcial**  
   - Només s’analitzen:
     - Events explícits de feedback (D55).
   - No es combinen encara amb:
     - Implicit signals (p. ex. dismiss/acted ràpids).

4. **Sense product/project-level analytics**  
   - D39 descriu agregacions per producte/projecte (via `decision_context`).
   - D56 es manté a nivell:
     - Org.
     - Type.
     - Severity.

5. **Sense vistes o taules específiques d’analytics**  
   - Tot es calcula on-demand.
   - És adequat per volums actuals.

---

## 8. Definition of Done (D56)

D56 es considera complet quan:

- [x] Existeix un service layer analytics (`getDecisionAnalyticsSummary`) que:
  - [x] Utilitza exclusivament `decisions` i `decision_events`.
  - [x] Calcula:
    - [x] Decision creation rate.
    - [x] Acknowledgement rate.
    - [x] Acted rate.
    - [x] Dismissed rate.
    - [x] Feedback useful rate.
    - [x] Feedback wrong rate.
    - [x] Time-to-action buckets.
  - [x] Proporciona agregacions per `decision_type` i severitat.
- [x] El `Decision Dashboard` inclou widgets analítics:
  - [x] Outcome/feedback distribution.
  - [x] Time-to-action distribution.
- [x] Finestra temporal suportada:
  - [x] 7d / 30d / 90d.
- [x] Totes les queries són:
  - [x] Org-scoped.
  - [x] Limitades per finestra temporal.
  - [x] Sense full table scans no acotats.
- [x] Aquest document descriu:
  - [x] Mètriques implementades.
  - [x] Queries utilitzades.
  - [x] Limitacions actuals.

