# D51 — Architecture to Implementation Cut

Status: Draft

---

## 1. Resum executiu: arquitectura vs implementació

Aquest document defineix el **tall entre arquitectura i implementació** per a FREEDOLIAPP, amb focus especial en el Decision System i subsistemes relacionats.

Foto actual (simplificada):

- **Implementat i en ús (codi existent)**:
  - **D32** — Decision Engine:
    - Taules: `decisions`, `decision_context`, `decision_sources`, `decision_events`.
    - RLS multi-tenant i contractes bàsics establerts.
  - **D33** — Decision Bridge:
    - `decisionBridge.js`, `reorderDecisions.js`.
    - Integració del Reorder Engine cap a decisions de tipus `reorder`.
  - **D34** — Decision Scheduler:
    - Edge Function `decision-scheduler`.
    - Lock global i cron configurat.
  - **D35–D36** — Decision Inbox:
    - `/app/decisions` (llista + detall).
    - Service layer: `getDecisionInboxPage`, `getDecisionById`, `updateDecisionStatus`.
    - Widget de dashboard `HomeTopDecisions`.

- **Només documentat (arquitectura sense codi)**:
  - **D37** — Decision Notifications.
  - **D38** — Decision Automation.
  - **D39** — Decision Analytics.
  - **D40** — Decision System Overview.
  - **D41–D42** — Helper / Assistant Intake Layer + Data Model.
  - **D43** — Architecture Map.
  - **D45** — Decision Dashboard.
  - **D46** — Decision UX Navigation Model.
  - **D47** — Decision Feedback Loop.
  - **D48** — Decision Roadmap.
  - **D49** — Event Taxonomy.
  - **D50** — Architecture Stress Test.

En resum:

- Tenim un **camí complet Engine → Decisions → Inbox** operatiu.
- Les capes de **notifications, dashboard, feedback, analytics, automation, helper/assistant** estan definides però no implementades.

---

## 2. Subsistemes prioritzats per passar a execució real

A partir de D48 (Roadmap) i D50 (Stress Test), els subsistemes següents són els candidats prioritaris per a la **següent onada d’implementació**:

1. **Decision Notifications (D37)**  
   - Objectiu: fer visibles les decisions sense que el seller hagi d’anar proactivament a la Inbox.
   - Impacte: augment de l’adopció i time-to-value de la Inbox existent.

2. **Decision Dashboard (D45)**  
   - Objectiu: donar visibilitat agregada (mètriques) per org i producte.
   - Impacte: permet entendre si el sistema de decisions està aportant valor i on cal millorar.

3. **Decision Feedback Loop (D47)**  
   - Objectiu: capturar senyals de qualitat (`useful`, `not_useful`, `wrong`).
   - Impacte: preparar el terreny per millores d’engines i futures automatitzacions.

4. **Decision Analytics (D39)**  
   - Objectiu: derivar mètriques i dashboards més rics a partir de decisions + events + feedback.
   - Impacte: base quantitativa per a decisions de producte i millora d’algoritmes.

5. **Decision Automation (D38)**  
   - Objectiu: tancar el loop amb accions assistides i, eventualment, automatitzades.
   - Impacte: palanca forta de productivitat, però amb risc superior.

6. **Helper / Assistant Intake (D41–D42)**  
   - Objectiu: canalitzar consultes d’usuari en intents estructurats, vinculables a decisions.
   - Impacte: preparar l’ecosistema per a superfícies de “assistant” sense bloquejar el core.

---

## 3. Criteris per decidir què entra a la següent onada

Per seleccionar què implementem a curt termini, utilitzarem una combinació de criteris:

1. **Time-to-value per al seller**
   - Prioritzar funcionalitats que:
     - Aprofiten dades ja existents (`decisions`, `decision_events`).
     - No requereixen migracions disruptives.
   - Exemple:
     - Notifications i Dashboard aporten valor ràpid sense canviar el model de dades base.

2. **Risc operatiu i de negoci**
   - Baix risc:
     - Lectors (dashboards), notificacions in-app, feedback.
   - Alt risc:
     - Automatitzacions amb efectes reals (comandes, inventari, preus).
   - Criteri:
     - No avançar automatització fins que Inbox, Notifications, Dashboard i Feedback funcionin bé.

3. **Complexitat tècnica relativa**
   - Prioritzar peces amb:
     - Dependències clares i acotades.
     - Impacte transversal limitat.
   - Exemple:
     - Un topbar badge de notificacions amb enllaç a `/app/decisions` és menys complex que un pipeline d’automatització complet.

4. **Preparació de dades i contractes**
   - Implementar només allò per al qual:
     - Contractes de D32–D39 estan prou estables.
     - No cal re-dissenyar el model de dades en curt termini.
   - Exemple:
     - Analytics bàsics poden començar sobre `decisions` + `decision_events` sense esperar totes les extensions.

5. **Retroalimentació i adopció**
   - Usar l’ús real de la Inbox (D36) per:
     - Prioritzar quines mètriques i notificacions tenen més sentit.
   - Evitar:
     - Implementar superfícies que encara no tenen prou trànsit o dades reals.

---

## 4. Dependències crítiques entre D36–D50

Les dependències principals que condicionen l’ordre d’implementació són:

1. **D32 (Engine) → D33 (Bridge) → D34 (Scheduler) → D36 (Inbox)**
   - Ja implementat.
   - Constitueix el “core pipeline” de decisions.

2. **D37 (Notifications) depèn de:**
   - D32–D36:
     - Necessita decisions i events estables.
   - D46 (UX Navigation Model):
     - Punts d’entrada i enllaços cap a Inbox / Dashboard.

3. **D45 (Decision Dashboard) depèn de:**
   - D32 (Decision Engine) i D39 (Analytics) com a model conceptual.
   - D50 (Stress Test) per:
     - Consideracions de rendiment i agregacions.

4. **D47 (Feedback Loop) depèn de:**
   - D36 (Inbox) i D45 (Dashboard):
     - Punts d’interacció on capturar feedback.
   - D39 (Analytics) i D49 (Event Taxonomy):
     - Com s’analitzen i s’encaixen aquests senyals.

5. **D39 (Decision Analytics) depèn de:**
   - Existència de volums suficients de:
     - `decisions`
     - `decision_events`
     - Feedback (D47) per a segones fases.
   - D50 (Stress Test) per pautes d’agregació.

6. **D38 (Automation) depèn fortament de:**
   - D37, D45, D47, D39:
     - Necessita evidència d’efectivitat i senyals de qualitat.
   - D41–D42 quan hi hagi automatitzacions iniciades per l’usuari via assistant.

7. **D50 (Architecture Stress Test) és transversal:**
   - Informa cada fase d’implementació:
     - Índexs, límits de consultes, estratègies d’agregació.

---

## 5. Riscos de seguir documentant sense executar

Continuar expandint només l’arquitectura sense implementar té riscos clars:

1. **Divergència entre “paper” i realitat**
   - Quan massa documents defineixen capes no existents:
     - Augmenta el risc que l’arquitectura teòrica no s’ajusti als condicionants reals (rendiment, ús, equip, mercat).

2. **Incertesa de producte**
   - Sense implementació:
     - És difícil validar què aporta realment valor als sellers.
   - Les prioritats poden quedar “congelades” a nivell de paper.

3. **Inèrcia arquitectònica**
   - Com més gran és el mapa conceptual sense codi:
     - Més difícil és canviar de direcció quan aprenem coses noves.

4. **Debt de validació**
   - D36 està validat, però:
     - Notifications, Dashboard, Feedback, Analytics, Automation encara no han passat per:
       - Build.
       - Runtime.
       - Mesura d’ús.

5. **Risc d’over-design**
   - D37–D50 ja donen una base robusta.
   - Afegir més capes purament teòriques abans d’executar:
     - No aporta valor addicional proporcional.

Conclusió:

- És el moment adequat per fer un **tall clar**:
  - Pausar noves D-docs sense execució.
  - Centrar-se a convertir blocs prioritzats en funcionalitat real.

---

## 6. Proposta d’ordre curt d’execució real

A partir de D48 i de la foto d’implementació actual, la proposta d’ordre **curt** (focalitzat) és:

1. **Ona 1 — Awareness i visibilitat bàsica**
   - **D37 — Decision Notifications**
     - In-app badge/topbar, sense emails inicialment.
     - Integració amb Inbox actual, respectant multi-tenant.
   - **D45 — Decision Dashboard (MVP)**
     - Widgets bàsics:
       - Nombre de decisions obertes.
       - High severity.
       - Time-to-action simple.
     - Drill-down cap a Inbox.

2. **Ona 2 — Qualitat i aprenentatge**
   - **D47 — Decision Feedback Loop**
     - Feedback explícit des de Inbox i, si escau, Dashboard.
     - Registre via `decision_events` seguint la taxonomia de D49.
   - **D39 — Decision Analytics (MVP)**
     - Primer conjunt de dashboards/quadres:
       - Creation rate, acknowledgement rate, acted/dismiss rate.
       - Time-to-action bàsic.

3. **Ona 3 — Automatització segura**
   - **D38 — Decision Automation (first slice)**
     - Una via d’**assisted action** per a un tipus de decisió de baix risc (p. ex. reorders suggerits).
     - Opt-in per org i amb audit trail clar.

4. **Ona 4 — Helper / Assistant (parcial i opcional en paral·lel)**
   - **D41–D42 — Helper/Assistant intake (MVP)**
     - Implementar només el mínim necessari per:
       - Recollir intents.
       - Tancar el cercle amb decisions o tasks future.

Aquest ordre és deliberadament curt i pragmatic:

- Converteix l’arquitectura existent en:
  - Awareness → Insight → Feedback → (limitada) Action.
- Evita:
  - Posar automatització al davant de visibilitat i qualitat.

---

## 7. Definition of Done (D51)

D51 es considera complet quan:

- [x] S’ha resumit clarament què està **implementat** vs només **documentat** (D32–D50).
- [x] S’ha definit una **llista de subsistemes prioritzats** per passar a execució real.
- [x] S’han establert **criteris concrets** per decidir què entra a la següent onada d’implementació.
- [x] S’han identificat les **dependències crítiques** entre D36–D50.
- [x] S’han explicitat els **riscos** de continuar només documentant sense executar.
- [x] S’ha proposat un **ordre curt d’execució real**, alineat amb D48 i D50.

