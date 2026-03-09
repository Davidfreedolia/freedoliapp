# D50 — FREEDOLIAPP Architecture Stress Test

Status: Draft

---

## 1. Objective

Definir escenaris d’estrès i consideracions arquitectòniques per a FREEDOLIAPP, amb focus especial en:

- El Decision System (`decisions`, `decision_events`, Inbox, Dashboard).
- Subsistemes de suport (scheduler, taules de context, Helper/Assistant).

L’objectiu és **anticipar límits d’escala i colls d’ampolla** i proposar **estratègies de mitigació**, sense implementar codi ni canvis d’infraestructura en aquesta fase.

---

## 2. Escenaris d’escala

Els següents escenaris serveixen com a punts de referència.

### Escenari A — 100 orgs (multi-tenant petit)

- ~100 orgs actives.
- Per org:
  - Desenes a pocs centenars de decisions.
  - Milers de `decision_events`.
- Total aproximat:
  - `decisions`: O(10k)
  - `decision_events`: O(100k–500k)

Expectativa:

- L’arquitectura actual hauria de suportar bé aquest nivell amb índexs bàsics i consultes cuidades.

### Escenari B — 10k decisions per org

- ~100 orgs actives.
- Per org:
  - ~10.000 decisions històriques.
  - Cada decisió amb múltiples events:
    - `created`, `acknowledged`, `acted`/`dismissed`/`expired`, i potencialment feedback.
- Total aproximat:
  - `decisions`: O(1M)
  - `decision_events`: O(5M–10M)

Expectativa:

- Consultes sobre tot l’històric poden començar a ser costoses.
- És crític definir finestres temporals i bons índexs.

### Escenari C — Milions de `decision_events`

- Producció a llarg termini:
  - Volums de decisions i events acumulats durant anys.
  - Consultes analítiques i dashboards operant sobre **milions** de events.

Expectativa:

- Consultes ingènues (sense filtres ni límits de temps) seran lentes.
- Requereix:
  - Índexs eficients.
  - Estratègies d’agregació (materialized views, taules de resum).
  - Eventualment, particionat de taules en el futur si cal.

---

## 3. Punts potencials de coll d’ampolla

### 3.1 Consultes de decisions (Inbox i Dashboard)

Riscos:

- Consultes de la Inbox que:
  - Filtren per `org_id`, `status`, `decision_type`.
  - Ordenen per `priority_score`, `created_at`.
  - Fan joins o consultes separades contra `decision_context` i `decision_sources` per pàgina.
- Consultes de Dashboard que:
  - Agreguen comptadors, funnels i time-to-action.

Si no estan acotades per:

- `org_id`
- finestra temporal
- mida de pàgina (paginació),

 aquestes consultes poden esdevenir lentes amb grans volums.

### 3.2 Taules de context (`decision_context`, `decision_sources`)

Riscos:

- Per cada pàgina de Inbox o detall:
  - Cal recuperar tots els context rows de les decisions visibles.
- Amb molts parells clau/valor per decisió, aquestes taules poden créixer ràpidament.

Impacte potencial:

- Cost de join i de consulta més alt.
- Empremta de memòria més gran quan es carrega context al service layer.

### 3.3 Scheduler (D34) — `decision-scheduler`

Riscos:

- Recorregut de totes les orgs actives cada 10 minuts:
  - Si el nombre d’orgs creix significativament (p. ex. >1000), una execució pot:
    - Allargar-se massa.
    - Topar amb límits de recursos de l’Edge Function.
- Advisory lock global:
  - Garanteix absència de solapaments.
  - Però també limita el paral·lelisme (un sol worker lògic).

### 3.4 Taules de Helper / Assistant (futur)

Riscos:

- Sistemes de gran volum:
  - Moltes sessions i missatges.
  - Consultes analítiques o de debugging sobre aquests logs.

Tot i que D41–D42 són conceptuals, cal anticipar:

- Cost de les polítiques RLS.
- Necessitat d’índexs per a consultes freqüents (per org, per user, per data).

### 3.5 Logs i analytics transversals

Riscos:

- Si Decision Analytics (D39) i Event Taxonomy (D49) deriven en:
  - Consultes pesades sobre un log unificat d’events.
  - Dashboards en temps real sense agregació prèvia.

Això pot estressar:

- CPU i I/O de la base de dades.
- Xarxa i servidors d’aplicació.

---

## 4. Estratègies de mitigació

### 4.1 Acotació de consultes i paginació

Principis:

- **Filtrar sempre per `org_id` al principi**.
- **Utilitzar finestres temporals**:
  - Analytics i dashboards no han de consultar “all time” per defecte.
  - La Inbox pot ser menys acotada en temps, però amb:
    - Mida de pàgina petita (p. ex. 25–50).
    - Ordenació clara per `created_at` i/o `priority_score`.
- **Paginar sempre**:
  - Mai llistar tot el conjunt de decisions o events en una sola consulta.

Quan sigui possible:

- Desplaçar consultes pesades fora del camí de petició/resposta:
  - Jobs en segon pla.
  - Vistes materialitzades / taules de resum.

### 4.2 Índexs i manteniment

Índexs mínims recomanats per escenaris alts:

- `decisions`:
  - `(org_id, status, created_at)`
  - `(org_id, decision_type, created_at)`
  - Opcionalment `(org_id, priority_score DESC, created_at DESC)` si els plans de consulta ho demanen.
- `decision_events`:
  - `(org_id, decision_id, created_at)`
  - `(event_type, created_at)` per filtres analítics per tipus.
- `decision_context`:
  - `(decision_id, key)`
- `decision_sources`:
  - `(decision_id)`

Manteniment:

- Monitoritzar regularment:
  - Bloat d’índexs.
  - Consultes lentes.
- Ajustar:
  - Polítiques de VACUUM / ANALYZE segons patrons d’escriptura.

### 4.3 Agregacions i vistes materialitzades

Per Escenaris B/C:

- Introduir **taules/vistes agregades** per:
  - Comptes per org/decision_type/dia.
  - Funnels per org i període.
  - Distribucions de time-to-action (quantils precomputats).

Beneficis:

- Dashboards i analytics passen a ser:
  - Consultes O(1) sobre taules petites.
  - Independents del volum brut de `decision_events`.

Notes d’implementació (futur):

- Utilitzar:
  - Materialized views amb refresh programat.
  - O taules de resum alimentades per jobs periòdics o triggers acotats.

### 4.4 Enduriment del scheduler

Per escalar de manera segura amb moltes orgs:

- Considerar:
  - **Batching d’orgs** per execució (p. ex. processar N orgs per run i rotar).
  - Límits configurables sobre:
    - Màxim d’orgs per invocació.
    - Màxim de temps d’execució per run.
- Mantenir:
  - Advisory lock global per evitar solapaments.
  - Però obrir la porta a:
    - **Scheduler particionat** (p. ex. per rangs d’org_id) si el volum ho requereix.

### 4.5 Gestió de mida del context

Per `decision_context`:

- Evitar:
  - Payloads molt grans (JSON massius, text extens).
  - Dades redundants o no necessàries per Inbox/Dashboard/Analytics.
- Mantenir:
  - Clau/valor pensat per lectura ràpida (claus estables, valors curts).
- Considerar:
  - Truncar o resumir valors que només tenen interès de debugging profund.

Això redueix:

- Cost de lectura.
- Mida de taula i índexs.

---

## 5. Límits coneguts del sistema actual

Basat en l’arquitectura actual (post-D36, amb D37–D49 només documentats):

1. **Un únic scheduler lògic amb advisory lock global**
   - Pràctic per:
     - Dotzenes a pocs centenars d’orgs.
   - Risc:
     - Execucions massa llargues quan el nombre d’orgs creixi molt.

2. **Analytics directes sobre `decision_events`**
   - Sense agregacions:
     - Consultes sobre milions d’events poden ser lentes o cares.

3. **Decisions amb context molt ric**
   - Si moltes decisions tenen molts `decision_context` rows:
     - Paginació + càrrega de context pot esdevenir una operació pesada.

4. **Filtres ad-hoc des del front**
   - Combinacions complexes de filtres (status, tipus, severitat, atributs de context) sense índexs específics poden forçar:
     - Table scans.
     - Experiències lentes per a l’usuari sota càrrega.

5. **Base de dades compartida per tots els tenants**
   - Multi-tenant amb totes les orgs al mateix clúster lògic:
     - Requereix monitorització i capacity planning constants.

Aquests límits no són problemàtics al volum actual, però defineixen el contorn del “stress zone” per a D50.

---

## 6. Definition of Done (D50)

D50 es considera complet quan:

- [x] S’han definit clarament escenaris d’escala (incloent-hi 100 orgs, 10k decisions per org i milions de `decision_events`).
- [x] S’han identificat punts potencials de coll d’ampolla:
  - Consultes de decisions i Inbox/Dashboard.
  - Taules de context (`decision_context`, `decision_sources`).
  - Scheduler multi-tenant.
  - Logs i analytics transversals.
- [x] S’han proposat estratègies de mitigació:
  - Acotació de consultes i paginació.
  - Índexs mínims recomanats i manteniment.
  - Agregacions / materialized views per a analytics.
  - Estratègies de batching i partició per al scheduler.
  - Bones pràctiques de mida de context.
- [x] S’han explicitat els límits coneguts de l’estat actual del sistema.
- [x] El document queda alineat amb:
  - D32–D40 (Decision Engine, Bridge, Scheduler, Inbox, Overview).
  - D37–D39, D45–D48 (Notifications, Dashboard, Analytics, Feedback, Roadmap).

