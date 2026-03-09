# D52 — Architecture Guardrails

Status: Draft

---

## 1. Objective

L’objectiu d’aquest document és definir els **guardrails arquitecturals obligatoris** per al desenvolupament de FREEDOLIAPP.

A mesura que el sistema creix (Decision System, Helper/Assistant, Inventory, Supply, Finance, Integracions Amazon), augmenta el risc de:

- Introduir incoherències entre documents d’arquitectura i codi real.
- Trencar la multi-tenant isolation (`org_id`) o les regles de traçabilitat (`decision_events`, logs).
- Crear dependències incorrectes (engines que coneixen UI, UI que fa lògica d’engine).
- Degradar el rendiment amb consultes sense índexs ni paginació.

Abans d’entrar en més implementació (D37–D52 i més enllà), **calen guardrails clars** que:

- Marquin què és acceptable i què no en termes d’arquitectura.
- Serveixin de contracte entre:
  - Arquitectura (D-docs).
  - Implementació (migracions, Edge Functions, frontend).
- Evitin regressions quan el sistema s’escali a desenes o centenars d’orgs.

Aquest document és, per tant, la “línia base” que qualsevol nova fase d’implementació ha de respectar.

---

## 2. Core Architectural Principles

### 2.1 Backend-first logic

- La **lògica de negoci canònica** viu sempre al backend:
  - Base de dades (contractes i constraints).
  - Edge Functions / serveis backend.
  - No a la UI ni al client.
- La UI pot:
  - Aplicar optimitzacions de presentació.
  - Fer validacions lleugeres per millorar UX.
- Però:
  - Les regles que afecten diners, estoc, decisions, notificacions o automatitzacions han de ser validades i aplicades al backend.

### 2.2 Decision System canonical

- El **Decision System** (D32–D40) és el referent canònic per a:
  - Com es representen les decisions (`decisions`).
  - Com es descriu el context (`decision_context`).
  - Com es descriuen orígens i engines (`decision_sources`).
  - Com es registren els events (`decision_events`).
- Qualsevol altre subsistema que vulgui:
  - Crear decisions.
  - Llegir decisions.
  - Raonar sobre decisions.
  - Ha de fer-ho a través d’aquest model canònic i/o dels seus serveis de bridge/scheduler.

### 2.3 Clear separation between UI and engines

- Les capes estan clarament separades:
  - **Engines**: calculen recomanacions, alertes, decisions candidates.
  - **Bridge + Scheduler**: orquestren i normalitzen cap al model canònic de decisions.
  - **UI** (Inbox, Dashboard, Notifications, Assistant): mostren i permeten accions sobre decisions ja canòniques.
- Cap engine:
  - Coneix detalls d’implementació de la UI (components, rutes, layouts).
- La UI:
  - No implementa lògica d’engines.
  - Només treballa amb decisions i events segons el contracte definit.

### 2.4 Multi-tenant isolation

- Totes les dades del producte són **org-scoped**:
  - Cada fila rellevant inclou `org_id` (o es deriva clarament d’una entitat que el conté).
  - RLS i polítiques de billing es basen en `org_id`.
- No es permeten:
  - Consultes que barregin dades de múltiples orgs sense un motiu explícit i documentat (p. ex. dashboards interns d’operacions).
- Multi-tenant isolation és una propietat de:
  - Disseny de taules.
  - Consultes.
  - RLS.
  - Edge Functions i serveis.

### 2.5 Event-driven traceability

- Les accions crítiques (especialment al Decision System i subsistemes clau) són:
  - **Event-driven**.
  - **Auditables**.
- Això implica:
  - Cada canvi d’estat de decisió genera com a mínim un `decision_event`.
  - Assistants, automatitzacions i altres subsistemes registren intents i resultats a través d’events o logs estructurats.
- L’objectiu és:
  - Poder reconstruir què ha passat.
  - Mesurar efectivitat, errors i regressions.

---

## 3. Non-Negotiable Rules

Aquestes regles **no es poden trencar**. Si algun canvi les fa perillar, s’ha de:

- Actualitzar prèviament l’arquitectura.
- Documentar explícitament l’excepció i obtenir-ne aprovació.

### 3.1 Totes les dades org-scoped

- Qualsevol nova taula o feature que afecti dades de negoci:
  - Ha d’incloure `org_id` (directament o via FK obligatòria).
- Qualsevol consulta d’aquestes taules:
  - Ha d’estar filtrada per `org_id` excepte en casos internament justificats.
- No es creen:
  - Taules “globals” amb dades de negoci sense clau d’org.

### 3.2 Cap engine depèn de la UI

- Engines i processos backend:
  - No poden fer referència a:
    - Components React.
    - Rutes de frontend.
    - Textos d’i18n.
  - No han de dependre del fet que una pantalla existeixi o no.
- La UI pot desaparèixer o canviar sense:
  - Trencar engines.

### 3.3 Totes les accions crítiques generen events

- Qualsevol acció que:
  - Canvia l’estat d’una decisió.
  - Modifica inventari, subministrament, preus o finances.
  - Activa automatitzacions.
- Ha de generar:
  - Un event registrat segons la taxonomia de D49 (p. ex. `decision_events` o futures taules d’events).
- Sense event:
  - Es considera que l’acció **no compleix els guardrails**.

### 3.4 Cap feature nova sense document d’arquitectura

- Abans de:
  - Afegir una nova feature significativa.
  - Introduir un nou subsistema.
- És obligatori:
  - Crear (o ampliar) un D-doc d’arquitectura que:
    - Descrigui objectiu, model de dades, fluxos, RLS, dependències.
    - Estigui lligat a l’índex d’arquitectura (D44).
- Només després:
  - Es poden començar migracions, Edge Functions, components frontend, etc.

### 3.5 No duplicació de models de dades

- No es permet:
  - Definir el mateix concepte de domini en múltiples models incompatibles (p. ex. “Decision” amb camps diferents en llocs diferents).
- Quan cal ampliar un model:
  - S’actualitza el model canònic (per exemple, D32 per decisions).
  - Es reutilitza arreu on sigui necessari.
- Qualsevol duplicació temporal:
  - S’ha de marcar explícitament com a transició i amb pla de consolidació.

---

## 4. Decision System Guardrails

Guardrails específics per al Decision System (D32–D40, D45, D47–D48, D50–D51).

### 4.1 Decisions (`decisions`)

- Tota decisió:
  - Ha de tenir `org_id`, `decision_type`, `status` i `created_at` correctament definits.
- Canvis d’estat:
  - Només a través de serveis centralitzats (p. ex. `updateDecisionStatus`) o equivalents.
  - No es permet canviar `status` directament des de la UI via updates arbitraris.
- Noves tipologies de decisió:
  - S’han d’afegir al contracte canònic (D32, D33, D37–D39) abans de ser usades en codi.

### 4.2 Decision Events (`decision_events`)

- Cada transició important de decisió:
  - Genera com a mínim un `decision_event` amb:
    - `org_id` (directe o derivat).
    - `decision_id`.
    - `event_type` d’acord amb D49.
    - `created_at` i, si cal, metadata contextual.
- No es permet:
  - Canviar l’estat d’una decisió sense event associat.
- L’enregistrament d’events:
  - És responsabilitat dels serveis de domini (no de la UI directament).

### 4.3 Scheduler (`decision-scheduler`)

- El scheduler:
  - Ha de respectar:
    - Multi-tenant isolation.
    - Advisory locks per evitar solapaments.
    - Límits de temps i recursos segons D50 (Stress Test).
- No es permet:
  - Introduir noves crides massives sense:
    - Paginació o batching per org.
    - Avaluar l’impacte sobre rendiment i cost.
- Canvis en la freqüència o superfície del scheduler:
  - Han de passar per documentació (D34, D50, D51).

### 4.4 Inbox (Decision Inbox, D35–D36)

- La Inbox:
  - És un **client del model canònic de decisions**.
  - No muta directament taules sense passar pels serveis adequats.
- Filtres i paginació:
  - Han de respectar:
    - Paginació obligatòria.
    - Filtres per `org_id`, `status`, `decision_type` com a mínim.
- Noves accions des de la Inbox:
  - S’han de mapejar a transicions de `status` definides i a `decision_events` coherents.

---

## 5. Assistant System Guardrails

Aplicable al Helper / Virtual Assistant Intake Layer i sistemes relacionats (D41–D42).

### 5.1 Assistant intake

- Tot flux d’intake (missatges, consultes, ordres) ha de:
  - Estar associat a una sessió (`assistant_sessions`).
  - Estar lligat a `org_id` i, quan sigui possible, a `user_id`.
- No s’accepten:
  - Missatges sense associació clara a org/usuari, llevat de casos explícitament marcats com a anònims o d’ús intern.

### 5.2 Queries

- Les consultes generades pel sistema d’assistant:
  - Han de respectar les mateixes regles de:
    - Multi-tenancy (`org_id`).
    - Paginació.
    - Índexs i rendiment.
- No es permet:
  - Llençar consultes ad-hoc massives contra taules crítiques sense:
    - Documentació.
    - Revisió d’arquitectura i rendiment.

### 5.3 Intents

- Els intents inferits (`assistant_intents`):
  - Han de ser:
    - Normalitzats (noms clars, acotats).
    - Trazables a través d’events si deriven en accions reals (decisions, automatitzacions, canvis de dades).
- No es permet:
  - Barrej ar intents d’usuaris amb intents interns sense etiquetes clares.

### 5.4 Sessions

- Les sessions (`assistant_sessions`):
  - Han d’estar:
    - Tancades o arxivades de forma raonable quan ja no s’utilitzen.
  - Han de servir com a:
    - Eix de traçabilitat entre missatges, intents, queries i decisions/accions resultants.

---

## 6. Performance Guardrails

Aquestes pràctiques són **obligatòries** per evitar regressions de performance, especialment sota els escenaris de D50.

### 6.1 Paginació

- Qualsevol llistat potencialment gran (decisions, events, sessions, missatges, productes, etc.) ha de:
  - Fer servir **paginació explícita** (page/pageSize o equivalents).
  - Tenir un límit màxim de pageSize raonable (p. ex. ≤ 100).
- No es permet:
  - `select *` sense límits sobre taules crítiques.

### 6.2 Queries indexades

- Les consultes sobre taules grans:
  - Han d’estar dissenyades per aprofitar índexs.
  - Han de filtrar com a mínim per:
    - `org_id`.
    - Camps de partició lògics (dates, tipus).
- Abans d’introduir noves consultes pesades:
  - S’ha de revisar si calen nous índexs.

### 6.3 Evitar scans massius

- Està prohibit:
  - Afegir funcionalitats que depenguin de:
    - Full table scans freqüents sobre taules crítiques.
  - Llançar continuament consultes d’analytics pesades des del camí de request de l’usuari.
- Les operacions massives:
  - S’han de:
    - Moures a jobs en segon pla.
    - O alimentar vistes/taules agregades que la UI llegeix posteriorment.

---

## 7. Implementation Discipline

Aquests guardrails també apliquen al **procés de roadmap i implementació**.

### 7.1 Una fase per vegada

- Com a regla general:
  - El sistema avança per **fases D**.
  - Cada fase té:
    - Document d’arquitectura.
    - Scope clar.
    - Criteris de Definition of Done.
- No es barregen:
  - Implementacions de múltiples fases grans sense control (p. ex. D37, D45, D47 a la vegada) si això posa en risc la qualitat.

### 7.2 No saltar fases

- No es permet:
  - Implementar automatització (D38) abans de tenir:
    - Inbox estable (D36).
    - Notifications (D37).
    - Dashboard (D45).
    - Feedback + Analytics mínims (D47, D39).
- Això s’aplica en general:
  - No s’ha de saltar per sobre de fases que proveeixen visibilitat/qualitat abans de fases més arriscades.

### 7.3 No refactors massius sense justificació

- Qualsevol refactor significatiu:
  - Ha de tenir:
    - Justificació clara (arquitectura, performance, deute tècnic crític).
    - Àrea d’impacte acotada.
  - Idealment:
    - Estar associat a un D-doc o apèndix d’arquitectura.
- Refactors massius i transversals:
  - Només s’accepten si:
    - Hi ha un pla de migració.
    - Tests o validacions adequades.

---

## 8. Definition of Done (D52)

Aquest document es considera **complet** quan:

- [x] S’ha definit per què calen guardrails abans de noves fases d’implementació.
- [x] S’han establert els **principis arquitecturals bàsics** (backend-first, Decision System canònic, separació UI/engines, multi-tenant, event-driven).
- [x] S’han recollit les **regles no negociables** (org-scoped, no dependència d’UI, events obligatoris, docs previs, no duplicació de models).
- [x] S’han especificat guardrails concrets per al **Decision System** (decisions, decision_events, scheduler, Inbox).
- [x] S’han definit guardrails per al **Assistant System** (intake, queries, intents, sessions).
- [x] S’han inclòs **performance guardrails** clars (paginació, índexs, evitar scans massius).
- [x] S’han establert regles de **disciplina d’implementació** (fases, no saltar passos, refactors controlats).

Qualsevol nova implementació rellevant (especialment en el rang D37–D52 i posteriors) s’ha de revisar contra aquest document, i qualsevol excepció s’ha de documentar explícitament.

