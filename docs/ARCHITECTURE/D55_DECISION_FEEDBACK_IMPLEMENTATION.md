# D55 — Decision Feedback Implementation

Status: Draft

---

## 1. Objectiu

Implementar la primera versió de **Decision Feedback** a FREEDOLIAPP, seguint:

- D47 — Decision Feedback Loop (arquitectura i senyals).

Objectiu funcional:

- Permetre que el seller doni feedback explícit sobre decisions des de:
  - La **Decision Inbox** (vista de detall de decisió).
- Registrar aquests senyals a `decision_events` de forma:
  - **org-scoped**.
  - **traçable**.
  - Reutilitzable per analytics (D39) i millores futures d’engines.

---

## 2. Fitxers creats / modificats

### 2.1 Service layer (data + escriptura d’events)

- `src/lib/decisions/submitDecisionFeedback.js`
  - Nou helper canònic per escriure feedback.

### 2.2 Pàgina i components

- `src/pages/Decisions.jsx`
  - Extensions per gestionar l’estat de feedback i cridar el service layer.

- `src/components/decisions/DecisionDetail.jsx`
  - Nou bloc UI de feedback per decisió.

---

## 3. Service Layer — `submitDecisionFeedback`

### 3.1 API

Fitxer: `src/lib/decisions/submitDecisionFeedback.js`

Signatura:

- `submitDecisionFeedback({ orgId, decisionId, feedbackType })`

Paràmetres:

- `orgId: string` — org activa.
- `decisionId: string` — decisió sobre la qual es dona feedback.
- `feedbackType: 'useful' | 'not_useful' | 'wrong'`.

Retorn:

- `Promise<{ ok: boolean, code?: string, message?: string }>`

Codis principals:

- `ok: true` — feedback registrat.
- `code: 'invalid_args'` — paràmetres incomplets.
- `code: 'invalid_feedback_type'` — tipus no suportat.
- `code: 'not_found'` — decisió no pertany a l’org.
- `code: 'duplicate'` — l’usuari ja ha enviat aquest mateix feedback per aquesta decisió.
- `code: 'insert_error'` — error en inserir l’event.

### 3.2 Lògica

1. **Validació bàsica**  
   - Comprova `orgId`, `decisionId`, `feedbackType`.
   - Mapeja `feedbackType` → `event_type`:
     - `useful` → `decision_feedback_useful`.
     - `not_useful` → `decision_feedback_not_useful`.
     - `wrong` → `decision_feedback_wrong`.

2. **Validació org/decisió**  
   - Consulta:
     - `decisions` amb `eq('org_id', orgId).eq('id', decisionId).limit(1)`.
   - Si no hi ha resultat → `not_found`.

3. **Obtenció de `user_id`**  
   - Via `getCurrentUserId()` (ja existent a `supabase.js`).

4. **Evitar duplicats**  
   - Si hi ha `userId`:
     - Consulta `decision_events`:
       - `eq('decision_id', decisionId)`.
       - `eq('event_type', mappedEventType)`.
     - Revisa en memòria si algun `event_data.actor_id === userId`.
     - Si ja existeix → retorna `duplicate` (sense nou insert).

5. **Inserció de l’event**  
   - Insereix a `decision_events`:
     - `decision_id: decisionId`.
     - `event_type: mappedEventType`.
     - `event_data`:
       - `actor_type: 'user' | 'system'`.
       - `actor_id: userId | null`.
       - `org_id: orgId`.
       - `feedback_type: feedbackType`.

Org-scoping:

- `org_id` ve implícitament via:
  - Validació a `decisions` (que ja és org-scoped).
  - RLS existent a `decision_events` basat en `decisions`.

---

## 4. UI — Decision Inbox (DecisionDetail)

### 4.1 Component `DecisionDetail`

Fitxer: `src/components/decisions/DecisionDetail.jsx`

Signatura actual:

- `DecisionDetail({ item, onAction, actionLoading, onFeedback, feedbackSubmitting, feedbackGiven })`

Nous props:

- `onFeedback(feedbackType)`:
  - Callback proporcionat per la pàgina.
  - `feedbackType` ∈ `{ 'useful', 'not_useful', 'wrong' }`.
- `feedbackSubmitting: boolean`:
  - Indica que s’està enviant feedback (deshabilita botons).
- `feedbackGiven: boolean`:
  - Indica que ja s’ha donat feedback (deshabilita botons i mostra missatge de gràcies).

Bloc UI afegit:

- Títol:
  - “Was this decision helpful?”
- Botons:
  - `👍 Useful` → `onFeedback('useful')`.
  - `👎 Not useful` → `onFeedback('not_useful')`.
  - `⚠ Wrong decision` → `onFeedback('wrong')`.
- Estat:
  - Tots tres botons:
    - `disabled` quan `feedbackSubmitting` o `feedbackGiven` és `true`.
- Confirmació:
  - Si `feedbackGiven === true`, es mostra:
    - “Thank you for your feedback.”

### 4.2 Pàgina `Decisions.jsx`

Fitxer: `src/pages/Decisions.jsx`

Nous estats:

- `feedbackSubmitting` (`useState(false)`).
- `feedbackGiven` (`useState(false)`).

On es reinicialitza:

- Quan es canvia la selecció:
  - `handleSelect(item)`:
    - `setSelected(item)` + `setFeedbackGiven(false)`.
- Quan la pàgina recarrega items i selecciona nova decisió:
  - Després de setSelected:
    - `setFeedbackGiven(false)`.

Nou handler:

```js
const handleFeedback = async (feedbackType) => {
  if (!selected || !activeOrgId) return
  if (feedbackSubmitting || feedbackGiven) return
  setFeedbackSubmitting(true)
  try {
    const res = await submitDecisionFeedback({
      orgId: activeOrgId,
      decisionId: selected.id,
      feedbackType,
    })
    if (res.ok || res.code === 'duplicate') {
      setFeedbackGiven(true)
    }
  } catch (e) {
    console.error('Decisions: error submitting feedback', e)
  } finally {
    setFeedbackSubmitting(false)
  }
}
```

Passat al detall:

- `<DecisionDetail ... onFeedback={handleFeedback} feedbackSubmitting={feedbackSubmitting} feedbackGiven={feedbackGiven} />`

Comportament:

- Després d’un feedback **correcte** o detectar un duplicat:
  - `feedbackGiven = true` → botons deshabilitats i missatge de gràcies.

---

## 5. Events creats a `decision_events`

### 5.1 Tipus d’event

Nous `event_type` utilitzats:

- `decision_feedback_useful`
- `decision_feedback_not_useful`
- `decision_feedback_wrong`

Aquests tipus es mantenen coherents amb D47 (`feedback_useful`, `feedback_not_useful`, `feedback_wrong`) amb el prefix `decision_` per claredat.

### 5.2 Payload mínim

Camp `event_data` (jsonb) conté com a mínim:

- `actor_type`: `'user' | 'system'`.
- `actor_id`: `user_id` o `null`.
- `org_id`: `orgId`.
- `feedback_type`: `'useful' | 'not_useful' | 'wrong'`.

A més:

- `decision_id` ve al camp de taula.
- `created_at` és gestionat per Postgres via default per `decision_events`.

---

## 6. Integritat de dades i multi-tenant

### 6.1 Validació de decisió

Abans d’enregistrar feedback:

- `submitDecisionFeedback` comprova:
  - `decisions` amb `eq('org_id', orgId).eq('id', decisionId)`.
  - Evita donar feedback sobre decisions d’altres orgs.

### 6.2 Evitar duplicats

Per usuari / decisió / tipus de feedback:

- Es consulta:
  - `decision_events` filtrat per:
    - `decision_id`.
    - `event_type` corresponent.
  - Es revisa a JS:
    - Si algun `event_data.actor_id === userId`.
  - En cas afirmatiu:
    - Es retorna `code: 'duplicate'` sense nou insert.

### 6.3 Org-scoped i RLS

- Totes les consultes a `decisions`:
  - `eq('org_id', orgId)`.
- `decision_events`:
  - RLS ja existent garanteix que:
    - Qualsevol accés està lligat a l’`org_id` de la decisió mare.

---

## 7. Performance

- El flux de feedback és **lleuger**:
  - 1 select contra `decisions` (1 fila).
  - 1 select petit contra `decision_events` per comprovar duplicat (per decisió concreta).
  - 1 insert a `decision_events`.
- No hi ha:
  - Escanejos massius.
  - Agregacions pesades.
  - Dependències amb Dashboard o Inbox paging.

Això compleix les regles de D52/D50 per a aquest tipus d’acció:

- Backend-first.
- Org-scoped.
- Sense full table scans.

---

## 8. Limitacions actuals

1. **Sense feedback des del Dashboard**  
   - D47 permetia punts d’interacció també al Decision Dashboard.
   - D55 només implementa feedback a:
     - `DecisionDetail` (Decision Inbox).

2. **Sense raons detallades**  
   - No hi ha encara:
     - Camp `reason` o comentaris lliures.
   - Feedback és només categòric (`useful` / `not_useful` / `wrong`).

3. **Sense projeccions agregades específiques per feedback**  
   - No existeixen encara:
     - Vistes/taules resum dedicades a feedback.
   - Analytics s’haurà de basar en:
     - `decision_events` directament (o futures agregacions de D39).

4. **Sense i18n per a les etiquetes de feedback**  
   - Textos “Was this decision helpful?”, “Useful”, “Not useful”, “Wrong decision” estan en anglès i codificats al component.

---

## 9. Definition of Done (D55)

D55 es considera complet quan:

- [x] Existeix un **service layer** dedicat (`submitDecisionFeedback`) que:
  - [x] Valida org/decisió.
  - [x] Insereix events a `decision_events`.
  - [x] Evita duplicats per usuari/decisió/tipus.
- [x] La **Decision Inbox** mostra opcions de feedback a `DecisionDetail`:
  - [x] Botons 👍 Useful, 👎 Not useful, ⚠ Wrong decision.
  - [x] Confirmació visual de feedback donat.
  - [x] Prevenció de reenviament des de la UI.
- [x] Totes les operacions són:
  - [x] Org-scoped.
  - [x] Lleugeres (sense consultes pesades).
- [x] Els nous `event_type` i payloads queden documentats.
- [x] Aquest document descriu:
  - [x] Objectiu.
  - [x] Fitxers i helpers creats.
  - [x] Flux UI.
  - [x] Limitacions actuals.

