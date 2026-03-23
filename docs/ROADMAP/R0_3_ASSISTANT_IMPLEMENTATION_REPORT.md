# R0.3 ASSISTANT IMPLEMENTATION REPORT

## 1. Files touched

- `src/i18n/locales/ca.json` — added `dashboard.firstValue.checklist`; added root key `guidance` (nextStepTitle, dashboard.*, projects.*, orders.*, projectDetail.recommended).
- `src/i18n/locales/en.json` — same structure.
- `src/i18n/locales/es.json` — same structure.
- `src/pages/Landing.jsx` — added `id="landing-modules"` and `id="how-it-works"` to sections; wired "Show product" and "How it works" buttons to `scrollIntoView({ behavior: 'smooth' })`.
- `src/components/assistant/NextStepCard.jsx` — new component (title, description, primary CTA, optional secondary CTA, optional icon).
- `src/pages/Dashboard.jsx` — import NextStepCard; when `dashboardHasData`, render NextStepCard with client-side rules (no projects → create project; has orders → review activity; else → open project or create PO).
- `src/pages/Projects.jsx` — import NextStepCard; when `filteredProjects.length > 0`, render NextStepCard (open project / create order) above the grid.
- `src/pages/Orders.jsx` — import NextStepCard; when orders list is non-empty, render NextStepCard (create order / go to projects) above the layout.
- `src/pages/ProjectDetailImpl.jsx` — added one line below ProjectPhaseChecklist: `{t('guidance.projectDetail.recommended')}: {phaseLabel}`.
- `docs/ROADMAP/R0_3_ASSISTANT_IMPLEMENTATION_REPORT.md` — this file.

## 2. Entry guidance implemented

- **Landing:** "Show product" scrolls to `#landing-modules` (Product modules). "How it works" scrolls to `#how-it-works` (How it works). "Start trial" continues to navigate to `/trial`. No new pages; same section structure.
- **Dashboard first value:** La clau `dashboard.firstValue.checklist` s’ha afegit a ca, en i es (text tipus "Crea un producte → Comprova la viabilitat → Fes la primera comanda."). El banner existent que ja mostrava aquesta línia ara té copy complet. No s’ha tocat la lògica del banner ni el mode B (pipeline grid).

## 3. Next-step guidance implemented

- **Dashboard (quan `dashboardHasData`):** Es mostra una **NextStepCard** amb títol "Següent pas recomanat". Regles: (1) si no hi ha projectes → descripció "Crea el teu primer producte...", CTA "Crear producte" (obre modal); (2) si hi ha comandes en curs o POs no ready → "Revisa les comandes en curs...", CTA "New PO" i secundària "Obrir" (orders / projects); (3) en altre cas → "Tens productes; crea una comanda...", mateixos CTAs.
- **Projects (quan hi ha projectes):** NextStepCard amb "Obre un projecte per revisar les fases o crea una comanda..."; CTA principal "Crear projecte" (modal), secundària "Crear comanda" (navigate a /app/orders).
- **Orders (quan hi ha comandes):** NextStepCard amb "Crea una comanda de compra o enllaça-la a un projecte..."; CTA principal "Crear comanda" (modal), secundària "Proyectes" (navigate a /app/projects).
- **ProjectDetail:** Una línia de text sota ProjectPhaseChecklist: "Recomanat: [phaseLabel]" (ex. "Recomanat: Viabilitat"). Sense card; només text.

## 4. Contextual helper status

- **Reutilitzat sense canvis:** HelpIcon, HelpModal, helpContent.js, pàgina /app/help, manual i ajuda per camps (ProfitabilityCalculator, IdentifiersSection, AmazonReadySection). No s’ha tocat cap d’aquests.
- **No tocat:** Settings, Inventory, Suppliers, fluxos base, assistent global flotant. Cap backend nou ni LLM.

## 5. Validation

- **Build:** `npm run build` executat; ha acabat correctament (exit 0). NextStepCard apareix al bundle.
- **Imports:** No s’han detectat imports morts; ReadLints sense errors als fitxers modificats.
- **Landing:** Enllaços "Show product" i "How it works" criden `document.getElementById('landing-modules')?.scrollIntoView({ behavior: 'smooth' })` i `document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })` respectivament.
- **Guidance visible:** NextStepCard es renderitza a Dashboard (quan hi ha dades), a Projects (quan hi ha projectes), a Orders (quan hi ha comandes); la línia "Recomanat" es mostra a ProjectDetail sota el checklist de fase.
- **Producte més guiat:** La capa afegida és una sola card o línia per pantalla, sense overload; manté l’estil del producte (Card, Button, tokens existents).

## 6. Final verdict

- **R0.3 tancat.** S’ha implementat el contracte V1 de l’assistent: entry guidance (landing amb enllaços útils + first-value checklist complet), next-step guidance (NextStepCard a Dashboard, Projects, Orders + línia recomanada a ProjectDetail), contextual helper existent sense canvis, sense fake AI ni backend nou. L’abast es limita al previst; no s’ha obert P2, ni refactors massius, ni assistent conversacional.
