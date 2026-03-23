# R0.3 ASSISTANT CLOSEOUT AUDIT REPORT

## 1. Executive verdict

L’assistent avui és **principalment copy i una mica d’entry guidance**: la landing promet “Freedoli, your operational assistant” però no hi ha cap capa d’assistència real dins del producte més enllà d’un banner de benvinguda i l’estat buit del Dashboard. Hi ha peces reutilitzables (pipeline grid, ProjectPhaseChecklist, HelpIcon/helpContent, empty states) però cap “assistent” coherent que orienti el següent pas a Dashboard/Projects/ProjectDetail/Orders quan ja hi ha dades. No hi ha backend d’assistent ni LLM; la documentació tracta l’assistent com a futur. Per tancar R0.3 cal definir l’assistent V1 com a **capa de guidance guiada** (entry + next-step contextual) sense inventar chatbot ni AI.

## 2. Current assistant/helper audit

### Què hi ha avui de debò

- **Landing — secció “Freedoli assistant”**  
  - Bloc visual (bubble + avatar) amb títol i descripció i18n (`landing.assistant.title`, `description`).  
  - Tres botons: “Show product”, “How it works”, “Start trial” (només “Start trial” enllaça a `/trial`).  
  - **No** enllaça amb cap flux dins de l’app; és copy de màrqueting.

- **Dashboard — first-value banner**  
  - Banner dismissible (localStorage `FIRST_VALUE_KEY`): títol “Benvingut/da”, subtítol “Comença creant el teu primer producte”, línia de checklist, CTA “Crear primer producte” → navega a `/app/projects`.  
  - **Problema:** la clau i18n `dashboard.firstValue.checklist` no existeix a ca/en/es; la línia pot quedar buida o mostrar la clau.  
  - **Valor:** entry guidance real, una sola vegada.

- **Dashboard — estat buit (modeB)**  
  - Quan `!dashboardHasData`: pipeline en graella (createProduct → viability → quotes → samples → po → shipment → amazon) amb títol, descripció i botó per pas.  
  - CTA principal “Crear producte” obre el modal de nou projecte.  
  - **Valor:** guia d’entrada clara i reutilitzable.

- **ProjectDetail — ProjectPhaseChecklist**  
  - Card amb títol i llista d’items per fase (idea, viability, quotes, samples, po, shipment, amazon) des de i18n (`projects.phase.<phase>.title`, `projects.phase.<phase>.items`).  
  - **Valor:** next-step contextual per fase; patró reutilitzable.

- **Help / contextual**  
  - `helpContent.js`: estructure de manual (profitability, amazon_ready, purchase_orders, etc.) amb claus i18n.  
  - `HelpModal` (TopNavbar) i pàgina `/app/help`: manual navegable.  
  - `HelpIcon`: tooltip + popover per camp; usat a ProfitabilityCalculator, IdentifiersSection, AmazonReadySection.  
  - **Valor:** ajuda contextual per camps; **no** és guidance de flux ni “següent pas”.

- **Empty states**  
  - Projects, Orders, Suppliers: títol, subtítol i CTA (“Crear projecte”, “Crear comanda”, etc.) només copy; sense lògica de següent pas.

### Què és només copy

- Text de la landing “Use the assistant to explore the product, understand your numbers and find the next best action”: no hi ha cap sistema que “trobi” el següent pas.  
- firstValue.checklist: clau usada al codi però sense valor als JSON d’i18n.

### Què falta

- Continuïtat landing → app (cap “assistent” dins de l’app).  
- Guidance quan **sí** hi ha dades: “quin és el següent pas recomanat” a Dashboard, Projects, ProjectDetail, Orders.  
- Una peça visible i coherent que expliqui “què estàs veient / què pots fer ara / següent pas recomanat” a les pàgines clau.  
- Cap backend ni LLM d’assistent (i no es demana per R0.3).

## 3. V1 assistant contract

L’assistent V1 ha de ser una **capa de guidance guiada**, no un chatbot:

1. **Entry guidance**  
   - Landing: copy que reflecteixi que dins de l’app l’usuari trobarà guia (primer pas, pipeline, següent pas).  
   - Trial / activació: sense canvis si no toquem flux; es pot referir al mateix model.  
   - Dashboard: primer contacte = banner first-value + (si sense dades) pipeline grid. Tot això ja existeix; només cal completar copy (checklist) i, si cal, un enllaç “veure producte” des de la landing.

2. **In-app next-step guidance**  
   - **Dashboard (amb dades):** una sola línia o card “Següent pas recomanat: …” (ex. “Obre un projecte”, “Crea una comanda”, “Revisa viabilitat”) derivada de dades simples (nombre de projectes, POs, fase de projectes).  
   - **Projects:** quan hi ha projectes, una línia o card “Obre un projecte o crea una comanda”; quan no n’hi ha, es manté l’empty state actual.  
   - **ProjectDetail:** ProjectPhaseChecklist ja dona els següents passos per fase; opcional afegir una línia “Recomanat: [acció de la fase]”.  
   - **Orders:** una línia o card “Crea una comanda o enllaça a un projecte”.

3. **Contextual helper**  
   - Mantenir HelpIcon + HelpModal + helpContent com a ajuda per camps i manual.  
   - La “peça visible i coherent” és la **next-step / guidance card** (o tira) a Dashboard, Projects, ProjectDetail, Orders, no un xat.

4. **No fake AI**  
   - Cap conversa, cap LLM, cap “assistant” de cartró.  
   - Regles simples (client-side) a partir de dades que ja es carreguen (projectes, comandes, fases).

**Resum del contracte V1:** L’assistent = **banner/entry (ja quasi fet) + next-step card/strip a 4 llocs (Dashboard amb dades, Projects, ProjectDetail, Orders)** + copy complet (firstValue.checklist, landing alineada). Tot amb components i dades existents; sense nou backend.

## 4. Minimum implementable solution

1. **i18n**  
   - Afegir `dashboard.firstValue.checklist` a ca, en, es (frase o 2–3 bullets curts: ex. “Crea un producte → Comprova viabilitat → Fes la primera comanda”).

2. **Landing**  
   - Mantenir secció assistant; enllaçar “Show product” a `/app` (o scroll a secció producte) i “How it works” a secció o ruta concreta si n’hi ha.  
   - No afegir xat ni promeses d’“assistent conversacional”.

3. **Component de guidance reutilitzable**  
   - Un sol component (ex. `NextStepCard` o `GuidanceStrip`): títol opcional, text, CTA opcional.  
   - Es mostra a: Dashboard (quan `dashboardHasData`), llista de Projects, ProjectDetail (opcional), Orders.

4. **Regles de “següent pas” (client-side)**  
   - Dashboard: si 0 projectes → “Crea el teu primer producte”; si >0 i 0 POs → “Crea una comanda de compra”; si >0 projectes amb fase < po → “Obre un projecte i avança la fase”; etc. (regles mínimes, sense backend).  
   - Projects: si >0 projectes → “Obre un projecte o crea una comanda”.  
   - ProjectDetail: no cal canviar ProjectPhaseChecklist; opcional: una línia “Recomanat: [item primera fase]”.  
   - Orders: “Crea una comanda o enllaça a un projecte”.

5. **Sense canvis a backend**  
   - No nous endpoints ni taules; només UI i copy.

## 5. Recommended implementation order

1. **i18n** — Afegir `dashboard.firstValue.checklist` als tres locals.  
2. **Landing** — Enllaços “Show product” / “How it works” sense tocar la resta del disseny.  
3. **Component** — Crear `NextStepCard` (o equivalent) amb props: title, description, ctaLabel, ctaTo/onClick.  
4. **Dashboard** — Quan `dashboardHasData`, afegir una instància de NextStepCard amb la regla simple (següent pas segons projectes/POs/fases).  
5. **Projects** — Afegir NextStepCard quan hi ha projectes (text + enllaços).  
6. **Orders** — Afegir una línia o card de guidance (crear comanda / anar a projectes).  
7. **ProjectDetail** — Opcional: una línia “Recomanat” sobre el ProjectPhaseChecklist.  
8. **Doc** — Actualitzar R0.3 / IMPLEMENTATION_STATUS amb el contracte: “Assistant V1 = entry + next-step layer; no chat”.

## 6. Final verdict

Sí: **hi ha definició prou bona per passar a implementació.**  
El contracte V1 és concret: entry (banner + pipeline) ja gairebé complet, més una capa de **next-step guidance** a quatre pàgines amb un component reutilitzable i regles client-side. No es demana chatbot ni backend nou; s’aprofita el que ja existeix (ProjectPhaseChecklist, empty states, helpContent). L’ordre d’implementació és realista i acotat; un tancament R0.3 es pot fer amb aquest scope sense obrir P2 ni refactors massius.
