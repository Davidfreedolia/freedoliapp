# FASE 4.3.F — MINIMAL ORIGIN NAVIGATION (DECISIONS-FIRST)

Implementació acotada. Repo real; tracker: `docs/ROADMAP/IMPLEMENTATION_STATUS.md`.

---

## 1. Scope implemented

- **Task Inbox (`/app/inbox`):**
  - Per a tasques amb `source === 'decision'`, `source_ref_type === 'decision'` i `source_ref_id` present, s'ha afegit una acció **“Open decision”**.
  - Aquesta acció navega a la pàgina de decisions (`/app/decisions`) amb `id=<source_ref_id>` a la query string, reutilitzant la infraestructura existent (`Decisions.jsx` + `useSearchParams`).
- **TasksWidget (Dashboard):**
  - Per al mateix tipus de tasques (`decision`-origin), s'ha afegit una acció **“Open decision”** al costat de les accions existents (Mark done, Snooze, Open entity).
  - Es reutilitza el mateix patró de navegació (`/app/decisions?id=<source_ref_id>`).

Cap altre origen (alert, gate, manual, sticky_note) no rep navegació d’origen en aquesta fase; continuen funcionant únicament amb “Open entity” on aplica.

---

## 2. Files modified

| Fitxer | Canvi |
|--------|-------|
| `src/pages/TaskInbox.jsx` | Afegit handler `handleOpenDecisionOrigin(task)` i botó condicional “Open decision” per a tasques amb `source='decision'` i `source_ref_type='decision'`. Navega a `/app/decisions?id=<source_ref_id>`. |
| `src/components/TasksWidget.jsx` | Afegit handler `handleOpenDecisionOrigin(task)` i botó condicional “Open decision” a la columna d’accions quan la tasca és d’origen decisió. |
| `src/i18n/locales/en.json` | Afegit `tasks.inbox.openDecision = "Open decision"`. |
| `src/i18n/locales/ca.json` | Afegit `tasks.inbox.openDecision = "Obrir decisió"`. |
| `src/i18n/locales/es.json` | Afegit `tasks.inbox.openDecision = "Abrir decisión"`. |
| `docs/ROADMAP/IMPLEMENTATION_STATUS.md` | Actualitzada fila FASE 4 per incloure 4.3.F; secció detallada ajustada per reflectir la nova fase. |
| `docs/ROADMAP/FASE_4_3_F_MINIMAL_ORIGIN_NAVIGATION_DECISIONS_FIRST.md` | **Nou.** Aquest document. |

---

## 3. Navigation behavior

### Task Inbox

- **Quan apareix “Open decision”:**
  - Només per a tasques on:
    - `task.source === 'decision'`
    - `task.source_ref_type === 'decision'`
    - `task.source_ref_id` és no nul.
- **Què fa:**
  - Crida `navigate(`/app/decisions?id=${encodeURIComponent(task.source_ref_id)}`)`.
  - La pàgina de Decisions (`Decisions.jsx`) ja llegeix `id` de la query string mitjançant `useSearchParams` i selecciona/mostra la decisió concreta (via `getDecisionById`).
- **On es mostra:**
  - A la columna d’accions de la fila de tasca, al costat de “Open entity”. És un botó secundari etiquetat amb `t('tasks.inbox.openDecision')`.

### TasksWidget

- **Quan apareix “Open decision”:**
  - Mateixa condició que a la inbox (`source='decision'`, `source_ref_type='decision'`, `source_ref_id` present).
- **Què fa:**
  - Crida el mateix handler `handleOpenDecisionOrigin(task)` amb navegació a `/app/decisions?id=<source_ref_id>`.
- **On es mostra:**
  - Dins el bloc d’accions de cada tasca (a la dreta), com un botó textual petit i secundari; no interfereix amb Mark done / Snooze / Open entity.

En tots els altres casos (altres sources), el comportament actual es manté: només “Open entity” quan hi ha `entity_type`/`entity_id`.

---

## 4. Org-safety notes

- **Context d’org:**
  - La pàgina `Decisions.jsx` ja filtra dades per `activeOrgId` via `useWorkspace()` i passa `orgId: activeOrgId` a `getDecisionInboxPage` i `getDecisionById`.
  - El nou enllaç “Open decision” es limita a navegar a `/app/decisions?id=<decisionId>`; l’execució posterior (càrrega de la decisió) continua fent servir `activeOrgId` com a guard.
  - No s’ha introduït cap bypass d’org: si `activeOrgId` no és coherent, la mateixa pàgina de decisions ja ho gestiona segons el contracte existent.
- **Seguretat multi-tenant:**
  - `source_ref_id` només és utilitzat com a identificador de decisió dins del context de l’org actual; els helpers de decisions segueixen exigint `orgId`.
  - No hi ha cap camí nou que permeti obrir decisions d’una altra org, ja que tant la capa de dades com la de UI de decisions continuen tenant-scoped.

---

## 5. Out of scope intentionally preserved

- **Altres orígens (no tocats):**
  - `alert`, `gate`, `manual`, `sticky_note` i qualsevol altre `source` **no** tenen navegació d’origen afegida en aquesta fase.
  - Per aquests casos, només es manté (o no) “Open entity” segons existeixi o no un `entity_type`/`entity_id` navigable.
- **Sense canvis en:**
  - RLS, schema, lifecycle de tasks, billing, alerts, decisions engine intern, `project_tasks`, `/app/calendar`.
  - No s’ha creat cap sistema genèric de mapping `source_ref_type -> route`; la implementació és explícita i limitada a decisions.

---

## 6. Risks / controlled debt remaining

- **Altres orígens sense open-origin:**
  - Alertes i gates continuen sense “Open origin”; això està assumit com a disseny actual (documentat a 4.3.E) i pot ser revisat en fases futures si es veu necessari.
- **Dependència de `source_ref_id` coherent:**
  - La navegació correcta depèn que `source_ref_id` sigui sempre el `decision.id` adequat i que la pàgina de decisions continuï suportant `id` a la query string. El contracte ja es complia abans per a altres usos del detail de decisions.

---

## 7. Tracker / docs updated

- **`docs/ROADMAP/IMPLEMENTATION_STATUS.md`:**
  - FASE 4 actualitzada per mencionar 4.3.F com a part de la cadena 4.1–4.3.D + 4.3.F.
  - 4.3.F referenciat com a “minimal origin navigation (decisions-first)” a nivell executiu.
- **Aquest document:** `docs/ROADMAP/FASE_4_3_F_MINIMAL_ORIGIN_NAVIGATION_DECISIONS_FIRST.md` com a descripció detallada d’implementació de 4.3.F.

