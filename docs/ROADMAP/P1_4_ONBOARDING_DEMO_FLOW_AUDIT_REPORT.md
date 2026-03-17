# P1.4 ONBOARDING / DEMO FLOW AUDIT REPORT

## 1. Executive verdict
- El flow d’entrada existeix i és complet (Landing → Trial/Login → ActivationWizard → Dashboard → Projects/ProjectDetail/Orders), i les peces principals del producte ja són fortes a nivell funcional.
- El relat comercial, però, no era prou lineal: l’usuari havia de descobrir sol què passa després del trial, què implica cada camí d’ActivationWizard i què fer primer un cop arriba al Dashboard.
- Fortaleses: Landing molt alineada amb el producte real (mòduls i screenshots); ActivationWizard útil per triar entre camí Amazon-first i setup/manual; Dashboard, Projects, ProjectDetail i Orders prou madurs per explicar el “OS de producte” i el flow operatiu.
- Debilitats: faltava framing comercial clar entre Trial, Activation i “first value”; Login competia mentalment amb Trial; i el Dashboard no verbalitzava prou bé el recorregut recomanat de demo.

## 2. Entry flow audit

**Landing**
- Hero amb copy clar i CTAs directes: `Start trial` (cap a `/trial`) i `Log in` (cap a `/login`).
- Seccions de mòduls (Suppliers, Purchase Orders, Inventory, Profit, Decisions) i screenshots específiques (suppliers, orders workflow, decisions) molt alineades amb el que realment mostra el producte a `Projects`, `Orders`, `Inventory` i `DecisionDashboard`.
- El relat problema → solució → mòduls és sòlid i coherent amb l’arquitectura interna.
- Punt confús: la secció de “assistant / how it works” suggereix un tour intern interactiu que encara no existeix dins l’app; els botons “show product / how it works” no tenen recorregut directe associat i poden crear una expectativa que després no es compleix.

**Login**
- Bona pantalla d’entrada per a usuaris existents: permet password login, magic link i OAuth (Google/Apple), i captura lead bàsic per a usuaris que entren per primera vegada per aquí.
- Té redirecció correcta a `/app` si la sessió ja està iniciada, evitant fricció.
- A nivell comercial, és molt més “tècnica” i no explica el relat de producte; per a prospects, ha de quedar clarament subordinada a Trial (és a dir, “si ja tens compte, entra aquí; si no, ves a Start Trial”).

**Trial**
- Bo com a punt de captació simple: només demana email + consentiment de màrqueting opcional i registra un trial lead.
- Inicia un flux raonable: registra lead (`source=trial`) i envia un magic link amb redirect a `/`, que junt amb la lògica d’autenticació porta l’usuari cap a `/app` i, via `OnboardingGate`, cap a `/activation`.
- El que faltava era copy explícit explicant què passa després del magic link: que hi haurà un petit pas d’activació (ActivationWizard) on l’usuari triarà camí (Amazon snapshot vs Setup/OS manual) abans d’entrar al Dashboard.

**ActivationWizard**
- Bo com a peça funcional: implementa dues rutes d’entrada clares:
  - **Amazon-first**: connectar Amazon SP-API, demanar ingest i mostrar un snapshot financer (30 dies) abans d’entrar a l’app.
  - **Setup / manual OS**: permet saltar la connexió Amazon i entrar en mode “setup” per treballar amb productes/projectes manualment.
- És, però, massa tècnic si es fa servir com a part de demo comercial: parla molt de SP-API, imports, jobs, entitlements, etc., i poc de què ve després per al recorregut de producte.
- Necessitava re-framing comercial: fer evident que el centre del wizard és la tria de camí (Amazon snapshot vs Setup OS) i que cada camí porta a un Dashboard amb una expectativa concreta.

**Dashboard post-entrada**
- Mode B (sense dades) ja ofereix una base molt bona de first value: pipeline d’etapes (create product, viability, quotes, samples, PO, shipment, Amazon), i CTA clar per crear el primer projecte.
- Mode A (amb dades) ofereix KPIs, alerts i performance; és potent per a clients reals i per a demos amb dades.
- El que faltava era framing explícit del recorregut recomanat: que el Dashboard expliqui el “què fer primer” (crear/obrir un projecte), i com seguir (anar a ProjectDetail, després a Orders/Inventory), en lloc de només mostrar moltes dades de cop.

## 3. Demo flow audit

**Recorregut real actual possible**
- Un prospecte nou pot seguir avui aquest camí:
  1. Arriba a la Landing, entén problema/solució i fa clic a `Start trial`.
  2. A `/trial`, posa l’email i rep un magic link.
  3. Clica el magic link → Supabase inicia sessió → `OnboardingGate` l’envia a `/activation`.
  4. A ActivationWizard, tria entre camí **Amazon-first** (connectar SP-API i veure snapshot) o **Setup/OS manual** (mode “setup”).
  5. Després de completar el wizard, es registra `org_activation` i l’usuari entra al **Dashboard** (`/app` o `/app/snapshot`).
  6. Des del Dashboard, pot crear/obrir `Projects`, entrar a `ProjectDetail`, veure quotes, samples, identifiers, etc., i anar a `Orders` per crear i seguir POs.

**Què s’entén bé**
- El rol de les grans peces:
  - **Landing** com a entrada comercial.
  - **Trial** com a punt de registre.
  - **ActivationWizard** com a selector de camí de dades (Amazon vs manual).
  - **Dashboard** com a hub executiu.
  - **Projects / ProjectDetail** com a “OS de projecte” (fases, business snapshot, stock, decisions).
  - **Orders** com a lloc on es gestionen POs, logística i documents.
- El flow operatiu P1.3 (Project → PO → Supplier → Shipment → Inventory) és demostrable si es coneixen les pantalles.

**Què queda massa tècnic**
- Part de ActivationWizard (SP-API, ingest, financial_ledger) és difícil d’explicar a un prospecte sense entrar en detalls tècnics.
- El Dashboard en Mode A pot semblar un “mur de dades” si no es guia abans l’usuari per ProjectDetail i Orders.
- El demo mode intern (mocks) existeix però no està exposat com a “Start demo tour”; és una palanca tècnica, no un recorregut UX visible.

**Què falta perquè la demo sigui més clara i venedora**
- Un recorregut comercial canònic i curt que l’equip pugui narrar de memòria: des de Trial fins a Orders, passant per ProjectDetail.
- Framing textual explícit a cada punt clau (Trial, ActivationWizard, Dashboard) que respongui:
  - “Què passarà ara?”
  - “Quin camí estic triant?”
  - “Què he de fer primer un cop entri?”
- Un ús intencionat de Dashboard Mode B com a guia de primer valor, no només com a estat “sense dades”.

## 4. Canonical role split

**Landing**
- Rol: porta comercial principal. Explica el problema, la solució i els mòduls de producte, i condueix sobretot cap a `Start trial`.
- No ha de fer: onboarding funcional ni explicar tots els detalls interns de l’app.

**Login**
- Rol: porta tècnica d’entrada per a usuaris existents o que tornen després del trial.
- Ha de quedar clarament subordinat a Trial per a prospects; no ha de ser la ruta principal de descobriment del producte.

**Trial**
- Rol: punt canònic de conversió de prospecte a usuari registrat. Captura email, crea lead de trial i dispara el flux de magic link i autenticació.
- Hauria d’explicar que després del magic link hi haurà un petit pas d’activació (ActivationWizard) abans d’entrar al Dashboard.

**Activation / onboarding (ActivationWizard)**
- Rol: seleccionar el **camí d’entrada** al producte i preparar les expectatives sobre el que ve després.
  - Camí Amazon-first: connectar dades → snapshot financer → entrar a Dashboard amb dades.
  - Camí Setup/OS manual: activar mode setup i entrar directament a Dashboard com a hub per crear projectes i POs manualment.
- No ha de ser una “landing tècnica”; ha de ser un pas curt i clar entre auth i l’app.

**Dashboard**
- Rol: hub principal de first value i control de negoci.
- Ha d’explicar, sobretot en Mode B (sense dades), el mini-recorrerut recomanat: crea un projecte → entra al detall → crea PO → segueix l’operativa.
- En Mode A, ha de fer de resum executiu i porta d’entrada a Projects, Orders, Decisions, etc.

**Projects**
- Rol: catàleg central de productes/projectes. Llista totes les apostes de producte amb informació de fase, ROI, stock i marketplaces.
- És el primer lloc on l’usuari hauria d’anar des de Dashboard per aterrar la demo en un projecte concret.

**ProjectDetail**
- Rol: cockpit complet de cada projecte. Organitza el relat en fases (discovery, viability, suppliers/samples, production, launch/live) amb documents, números, decisions i anotacions.
- És l’escenari principal per explicar com FREEDOLIAPP estructura el cicle de vida d’un producte abans i després de la PO.

**Orders / Inventory / Suppliers**
- Rol conjunt dins del flow comercial:
  - **Orders**: origen i gestió de POs, logística, documents i Amazon readiness.
  - **Suppliers**: catàleg de proveïdors, font dels suppliers triats a les POs.
  - **Inventory**: visibilitat de stock per SKU/projecte i connexió conceptual amb POs i shipments.
- No han de duplicar el rol de Projects/ProjectDetail, sinó completar el relat operatiu un cop el projecte existeix.

## 5. Canonical commercial flow proposal

**Flow canònic**
1. **Landing**  
   - Usuari entén el problema i veu que FREEDOLIAPP és un OS per productes/procurement.  
   - Fa clic a `Start trial`.

2. **Trial**  
   - Introdueix l’email i accepta opcionalment comunicacions.  
   - Entén (via copy) que rebrà un magic link i que després hi haurà un petit pas d’activació abans del Dashboard.

3. **Magic link / auth**  
   - Fa clic al correu; Supabase crea sessió i, amb `OnboardingGate`, el porta a `/activation`.

4. **ActivationWizard**
   - Pas 1: confirmació d’org i context.  
   - Pas 2: tria de camí:
     - **Amazon snapshot path**:  
       - Connecta Amazon SP-API, sol·licita ingest bàsic i prepara un snapshot de 30 dies.  
       - Després, entra al Dashboard (o `/app/snapshot`) amb dades reals per ensenyar finances i performance.
     - **Setup / OS manual path**:  
       - Activa mode “setup”: no cal connectar Amazon ara mateix.  
       - L’usuari entra a Dashboard amb un recorregut recomanat per crear el primer projecte i la primera PO manualment.

5. **Dashboard**
   - En camí **Setup** (sense dades), mostra Mode B amb pipeline de passos i banner de first value.  
   - En camí **Amazon**, mostra Mode A amb KPIs i pot servir per “fer zoom” a projecte i operacions.

6. **Projects**
   - L’usuari veu el catàleg de projectes (o un projecte de demo).  
   - Tria un projecte per obrir el detall.

7. **ProjectDetail**
   - Es recorre visualment el pipeline de fases: discovery → viability → suppliers/samples → production → launch/live.  
   - Es mostra com es prenen decisions, es documenten quotes i samples, i com es prepara Amazon (identifiers, listing ready).

8. **Orders / operations**
   - Des d’aquest projecte (o via Dashboard), es mostra una PO relacionada a `Orders`.  
   - A la demo, s’ensenya la PO amb supplier, items, logística (LogisticsFlow, Shipments, Tracking) i enllaços cap a Inventory/Project.  
   - Es tanca així el relat Project → PO → Supplier → Shipment → Inventory/Profit.

**Dos camins d’entrada complementaris**
- **Amazon snapshot path**:
  - Públic objectiu: venedors Amazon amb dades ja existents.  
  - Promesa: “connectem Amazon, et mostrem com es veu el teu negoci i després t’ensenyem com el producte organitza projectes i POs al voltant d’aquestes dades”.

- **Setup / OS manual path**:
  - Públic objectiu: equips que volen entendre l’OS encara que no connectin dades reals d’Amazon a la primera sessió.  
  - Promesa: “veuràs com FREEDOLIAPP et guia des de la idea de producte fins a la PO i l’operativa, pas a pas”.

## 6. Minimum demo-worthy scope

Perquè FREEDOLIAPP es pugui ensenyar bé a un prospecte amb el mínim, cal:

- **Entrada clara**  
  - Landing que condueixi majoritàriament a Trial.  
  - Login reservat per a usuaris existents o per segones visites.

- **Activation que triï camí**  
  - ActivationWizard posant al centre la tria Amazon vs Setup, amb una frase per camí explicant què ve després.  
  - No cal que l’usuari completi tot el pipeline d’imports; n’hi ha prou amb fer entendre el “per què” de cadascun.

- **Dashboard com a primer valor**  
  - Mode B usat explícitament com a guia de primer valor: pipeline curt i banner que expliquen quins són els 3–4 passos següents.  
  - CTAs clares a `Create project`, `Open projects`, `Go to orders`.

- **Projects + ProjectDetail com a relat principal**  
  - Almenys un projecte amb prou dades (reals o de demo) per ensenyar les fases, la viabilitat, les quotes i la preparació d’Amazon.  
  - ProjectDetail com a peça central del relat de demo.

- **Orders com a continuació operativa**
  - Almenys una PO per ensenyar com es mou el projecte cap a l’operativa (supplier, shipments, documents) i com això tanca el loop amb Inventory i Profit.

## 7. Recommended implementation order

1. **Clarificar copy d’entrada**
   - Ajustar textos de Landing, Trial i Login perquè Trial sigui clarament la porta de prospects i Login la porta d’usuaris existents.  
   - Afegir indicació a Trial de què passa després del magic link.

2. **Re-framing d’ActivationWizard**
   - Centrar el wizard en la tria entre Amazon snapshot i Setup/OS manual, amb una frase per camí sobre el que vindrà després.  
   - Minimitzar la sensació de “wizard tècnic” en el context de demo.

3. **Convertir Dashboard en first-value guide**
   - Reforçar Mode B i el banner de first value com a checklist de 3–4 passos recomanats.  
   - Assegurar CTAs en línia amb el recorregut (Projects, Orders).

4. **Alinear Projects / ProjectDetail amb el guió de demo**
   - Micro-copy o framing mínim a `Projects` per deixar clar que és el catàleg de productes i que el següent pas és obrir-ne un.  
   - Verificar que ProjectDetail exposa de manera clara les fases i les connexions amb quotes, samples, POs i Amazon.

5. **Preparar guió intern de demo**
   - Escriure un guió breu perquè l’equip segueixi sempre la mateixa seqüència: Landing (30s), Activation (1 min), Dashboard (2-3 min), ProjectDetail (5-7 min), Orders/Inventory (3-4 min).

6. **Opcional: exposició controlada de demo mode**
   - Decidir quan activar `isDemoMode()` i amb qui (per exemple, per orgs de demo internes).  
   - Explicar de forma senzilla quan s’estan veient dades de demo i no dades reals.

## 8. Final verdict

- La definició d’onboarding i demo flow a P1.4 és prou bona per passar a implementació: s’ha establert un contracte clar de rols per Landing, Trial, ActivationWizard, Dashboard, Projects, ProjectDetail i Orders.
- El repo ja contenia totes les peces necessàries per fer coherent l’onboarding/demo flow sense refactor massiu ni noves pantalles: només calen ajustos de copy, framing i CTAs per fer emergir el recorregut recomanat.
- P1.4 pot, per tant, avançar a implementació incremental (talls petits) sense obrir P2 ni introduir un sistema nou de tours interactius.

