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

## 4. Bloc actiu actual (P0)

L’únic bloc actiu real ara mateix és **P0 — Blockers reals i preparació immediata**:

- **P0.1 — Multi-tenant cleanup de superfícies visibles**  
  Netejar qualsevol UI/surface visible que no reflecteixi correctament el contracte multi-tenant vigent (S2/S3), sense reobrir models ni RLS.

- **P0.2 — Purchase Orders hardening**  
  Endurir els fluxos de `purchase_orders` (validacions, UX, coherència amb ledger/export) sobre l’esquema actual.

- **P0.3 — Roadmap / documentation reset**  
  Mantenir alineats aquest document i `IMPLEMENTATION_STATUS.md` amb l’estat real del repo i del producte.

Després de **P0.1 + P0.2**, el punt d’entrada natural és **P1 — Producte visible / UI / UX**.

---

## 5. Roadmap canònic (P0 / P1 / P2 / P3)

### P0 — Blockers reals (actiu)

- Multi-tenant visible cleanup.
- Purchase Orders hardening.
- Roadmap/documentation reset.

### P1 — Producte visible / UI / UX

- Dashboard usable de veritat.
- Projects i project detail productitzats.
- Flows visibles consistents (end-to-end).
- Onboarding + demo flow comercial.

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

