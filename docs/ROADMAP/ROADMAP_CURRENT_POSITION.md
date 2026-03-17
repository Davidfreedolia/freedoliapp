# FREEDOLIAPP — ROADMAP CURRENT POSITION

Aquest document és la **vista executiva actual** del roadmap.  
Per a l’estat detallat de fases i subfases, el tracker viu és `docs/ROADMAP/IMPLEMENTATION_STATUS.md`.

---

## 1. D’on venim

- **FASE 3 — Business alerts**: motor d’alertes de negoci, API/hook i UI Bell + Drawer completament implementats i documentats.
- **FASE 4 — Tasks / inbox / origins / gates alignment**: model de tasks canònic (`tasks`), linkage `source`/`source_ref_*`, Task Inbox a `/app/inbox`, lifecycle net `open`/`done`, gates (`project_gate`/`workspace_gate`) alineats i documentats.
- **FASE 5 — Finance canonical model / profit / cashflow**:  
  - `financial_ledger` + `org_settings.base_currency` + `exchange_rates_daily` com a core financer canònic.  
  - Contractes de P&L i cashflow fixats (5.2, 5.3).  
  - Profit Truth Engine (F10.2) alineat amb ledger; Profit UI V1 honestada.
- **FASE 6 — Future prep / governance / legacy finances**:  
  - Contracte futur de COGS / landed cost (6.1).  
  - Contracte futur de realized cashflow UI (6.2).  
  - Contracte futur d’Admin Console / governance (6.3).  
  - Contracte de coverage/completeness de profit (6.4).  
  - Estratègia de finances i dashboard legacy (6.5).

El backend/arquitectura interna està **molt avançat**; no cal una altra mega fase interior abans de centrar-nos en producte/UI.

---

## 2. Què està tancat i no s’ha de reobrir

- Contractes multi-tenant i billing (S2/S3.x) — només es toquen en fases específiques, no com a “refactor espontani”.
- FASE 3, 4, 5 i 6 — considerades **CLOSED**:  
  qualsevol treball futur en aquests dominis ha de respectar els contractes existents i obrir subfases noves si cal.
- **P0 — Blockers reals i preparació immediata — CLOSED.**  
- **P1 — Producte visible / UI / UX — CLOSED.**

---

## 3. Controlled debt (non-blocking)

Aquests punts són **deute controlat**, no blockers immediats:

- `project_tasks` continua com a engine legacy de `project_gate`.
- `BillingLocked` continua sense unblock task (gate dur de billing).
- `phaseGates.js` continua com a validació, no gate engine primari.
- `tasks` continua amb RLS per `user_id`; org-safety s’aplica a nivell d’app.
- `Finances.jsx`, `expenses`, `incomes`, `recurring_expenses`, `finance_categories`, `payments` continuen com a món legacy fora del core financer canònic.
- COGS / landed cost continuen parcials / no activats.
- `Cashflow.jsx` continua sent forecast (`getCashflowForecast`), no realized cashflow UI.
- KPIs heurístics de dashboard (`getDashboardStats` i similars) continuen existint com a mètriques aproximades, no reporting oficial.
- Admin Console no està implementada; només hi ha contracte futur (S3.4.A + FASE 6.3).

---

## 4. Posició actual de producte (post P1)

- **P0 — Blockers reals i preparació immediata:** tancat (multi-tenant visible cleanup, PO hardening i reset documental completats i reflectits).  
- **P1 — Producte visible / UI / UX:** tancat amb totes les subfases P1.1–P1.5 marcades CLOSED al tracker.

En conseqüència:

- El producte és **visible, coherent i demo-worthy**.  
- El veredicte actual és: **pilot-ready with caveats**.  
- Les caveats reals per a pilots són:
  - **Onboarding** encara millor amb acompanyament: el recorregut d’entrada funciona però es recomana pilot guiat, no self-serve pur.  
  - **Amazon-first** massa tècnic per self-serve massiu: el camí Amazon snapshot requereix context i suport per a orgs no tècniques.

No s’obre una nova mega fase de producte; el següent bloc és **operatiu**: **Pilot Preparation / Pilot Execution** (playbook curt, selecció de 1–3 orgs pilot, execució controlada i feedback).

---

## 5. Roadmap canònic (P0 / P1 / P2 / P3)

### P0 — Blockers reals (tancat)

- **Status:** CLOSED.  
- **Scope:** Multi-tenant visible cleanup, Purchase Orders hardening, roadmap/documentation reset.

### P1 — Producte visible / UI / UX (tancat)

- **Status:** CLOSED.  
- **Resultat:** Dashboard V1 usable, Projects/ProjectDetail productitzats, flows visibles Project → PO → Inventory, onboarding/demo flow comercial, i polish/consistència visual sobre superfícies clau.

### P2 — Millores fortes

- Analytics net sobre el model canònic.
- Realized cashflow UI sobre ledger.
- Observabilitat mínima (health, mètriques bàsiques).
- Encapsular finances legacy darrere surfaces canòniques.
- Governance/admin millor (Admin Console parcial).
- Responsive i polish fort.

### P3 — Futur / expansió

- Admin Console completa.
- COGS complet (cost pool + WAC activats).
- Automatitzacions avançades (decisions/alertes/tasks).
- Connectors nous (Shopify/altres marketplaces).
- Assistant layer.
- Listing intelligence.
- Expansió de plataforma.

