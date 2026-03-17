# P1.3 OPERATIONS FLOW AUDIT REPORT

## 1. Executive verdict

Les pantalles **Orders**, **Suppliers** i **Inventory** són útils i org-scoped, però es perceben com **tres mòduls separats**: no hi ha un relat únic “Project → PO → Supplier → Shipment → Stock”. Orders concentra molt (PO + Amazon readiness + logística + shipments + tasks + decisions + Manufacturer Pack duplicat) i el detall del PO és un mur de seccions; Suppliers és un CRUD net però desconnectat visualment del flux de comandes; Inventory és un registre de stock per SKU/projecte sense vincle explícit amb “PO rebut” o “shipment entregat”. La capa de logística visible viu dins el modal de detall d’Orders (LogisticsFlow, ShipmentsPanel, ShipmentTrackingSection), no com a capa pròpia. Per fer-ho demo-worthy cal **definir el contracte canònic del flow**, netejar duplicats i redundàncies a Orders, i donar **enllaços i llenguatge comú** entre les tres pantalles sense refactor massiu.

---

## 2. Orders audit

**Què mostra avui**
- Header “Comandes (PO)”.
- Toolbar: cerca, filtre per estat, filtre per projecte, LayoutSwitcher (grid/list/split), botó Nova comanda.
- Stats: Total POs, Pendents, En curs, Completades, Valor total.
- Llista/grid/split de cards: po_number, projecte, estat (pill), proveïdor, data, import; accions Veure, PDF, menú (Editar, Eliminar). Estat Amazon readiness carregat per PO (manufacturer pack status).
- **Modal de detall** (en obrir “Veure”): capçalera amb po_number, projecte, selector d’estat, PDF, tancar. Cos amb seccions:
  - Informació general (data, quote ref, moneda, incoterm).
  - Proveïdor (nom, contacte, email).
  - Adreça d’entrega.
  - Productes (taula items).
  - Especificacions d’enviament (caixes, pesos, volum) si n’hi ha.
  - Notes.
  - **Amazon Ready** (col·lapsable): AmazonReadySection.
  - **LogisticsFlow** (flux logístic).
  - **ShipmentsPanel** (shipments de la PO).
  - **Manufacturer Pack**: dos blocs amb el mateix títol i CTA “Generate Manufacturer Pack” (duplicat).
  - **Etiquetes FNSKU** (botó obre modal).
  - **ShipmentTrackingSection**.
  - **TasksSection** (entityType purchase_order).
  - **DecisionLog** “Why this supplier was chosen”.
  - **PlannedVsActual** (quote + PO + shipment).
- Modals: NewPOModal, ManufacturerPackModal, modal FNSKU labels.
- URL: `?project=...` i `?action=create` per obrir directament nova PO per projecte.

**Què és útil**
- Llista de POs amb estat i filtre per projecte/estat; creació i edició de PO; detall ric (proveïdor, items, entrega, Amazon readiness, shipments, tracking, tasks, planned vs actual).
- Integració amb projectes i proveïdors (dropdowns, supplier_id); càlcul Amazon ready; generació PDF PO, Manufacturer Pack (ZIP), FNSKU labels; canvi d’estat de la PO.
- Source of truth per “on es gestiona la comanda” i “on es veu el shipment”.

**Què és soroll**
- **Duplicat**: dos blocs “Manufacturer Pack” seguits al detall (mateix títol, dos CTAs).
- Seccions molt nombroses al modal sense agrupació (Overview vs Documents vs Logistics).
- DecisionLog “Why this supplier was chosen” és una mica fora de context (més aviat decisió de sourcing que de PO).

**Què és massa dens**
- El modal de detall: més de 10 seccions en scroll; no queda clar què és “resum” i què és “accions/documentació”.
- Barreja de “lectura de la PO” i “accions (pack, etiquetes, tracking)” sense jerarquia visual clara.

**Què és demo-worthy**
- La llista de POs amb estat i el detall amb supplier, items i enllaç a projecte ho són, si es treu el duplicat i es dona un ordre més clar (resum → logística/shipments → documents/Amazon).

**Què no hi hauria de viure**
- Un segon bloc idèntic “Manufacturer Pack” (ha de quedar només un).
- Tota la lògica de “llista de transitaris” o gestió de forwarders (això està a Forwarders).

---

## 3. Suppliers audit

**Què mostra avui**
- Header “Proveïdors”.
- Toolbar: cerca, filtre per tipus (Fabricant, Trading, Agent; sense Transitari), filtre per país, LayoutSwitcher, botó Nou proveïdor.
- Stats: Total, Fabricants, Trading, Top Rated (4+⭐).
- Grid/list/split de cards: nom, tipus (badge), ciutat/país, contacte, telèfon, payment terms, incoterm (+ location), valoració; SupplierMemory; menú Editar / Eliminar.
- Modal crear/editar: nom, tipus, contacte, país, ciutat (amb lògica custom cities), email, telèfon, whatsapp, wechat, web, adreça, payment_terms, incoterm, incoterm_location, lead_time_days, rating, notes. Eliminar amb confirmació i missatge si FK (en ús).

**Què és útil**
- CRUD de proveïdors; filtres per tipus i país; dades necessàries per a PO (nom, contacte, termes); SupplierMemory per context; exclusió de transitaris (van a Forwarders).

**Què és soroll**
- Lògica “custom cities” (taula custom_cities) és un detall que no cal per al relat operatiu bàsic.

**Què és massa dens**
- El formulari té molts camps; per a demo n’hi ha prou amb nom, tipus, contacte, país/ciutat, email, telèfon, payment terms, incoterm.

**Què és demo-worthy**
- Sí: llista de proveïdors i crear/editar per poder triar proveïdor a la PO.

**Què no hi hauria de viure**
- La gestió de transitaris (ja es filtra tipus freight i es delega a Forwarders).

---

## 4. Inventory audit

**Què mostra avui**
- Header “Inventari”.
- Stats: SKUs, Unitats totals, A Amazon, En trànsit, Stock baix.
- Toolbar: cerca, filtre per projecte, filtre per estat (stock baix / en trànsit / OK), refresh, LayoutSwitcher, “Nou Producte”.
- Grid/list/split de cards: SKU, product_name, projecte (badge), unitats per ubicació (producció, trànsit, transitari, FBA, FBM, total), punt de reposició implícit (reorder_point), badge Crític/Baix/OK; botons afegir moviment i historial.
- Modal “Editar/Nou producte”: SKU, projecte, nom, unitats per ubicació, reorder point.
- Modal “Historial”: afegir moviment (tipus, quantitat, notes), llista de moviments del producte.

**Què és útil**
- Vista de stock per SKU/projecte; buckets (producció, trànsit, forwarder, FBA, FBM); senyal de stock baix; moviments i historial.
- Org-scoped (inventory + inventory_movements per org_id).

**Què és soroll**
- No hi ha cap enllaç explícit “aquest stock ve de la PO X” o “shipment Y entregat”; la connexió PO → rebuda → inventory és manual o implícita.
- “Nou Producte” crea una línia d’inventari; pot confondre amb “nou projecte” si no es deixa clar que és una línia de stock.

**Què és massa dens**
- La card mostra 6 tipus d’unitats + total; per a demo es podria resumir a “En trànsit”, “A Amazon (FBA/FBM)”, “Total” i estat (OK/Baix/Crític).

**Què és demo-worthy**
- Sí com a vista de stock i reorder; el que falta és el relat “PO rebut → actualitza stock” o almenys un enllaç “Veure POs d’aquest projecte” per cohesionar amb Orders.

**Què no hi hauria de viure**
- Lògica pesada de sincronització automàtica PO → inventory (fora d’abast P1.3); sí que cal un vincle visual/navegació cap a Orders/Project.

---

## 5. Canonical role split

| Pantalla   | Per a què serveix | Què ha de resoldre l’usuari | Què no s’ha de duplicar |
|-----------|-------------------|-----------------------------|---------------------------|
| **Orders** | Gestionar comandes de compra (PO): crear, editar, veure estat, lligar a projecte i proveïdor, preparar Amazon (readiness, labels, pack), seguir enviaments i tracking. | “Quines POs tinc? En quin estat? Què falta per enviar al fabricant / rebre / enviar a Amazon?” | No duplicar llista de proveïdors (només selector); no duplicar inventari (només enllaç “Stock del projecte”). |
| **Suppliers** | Mantenir el catàleg de proveïdors (fabricants, trading, agents): dades de contacte i termes per poder triar-los a la PO. | “Qui són els meus proveïdors? Crear/editar per poder-los assignar a una PO.” | No gestionar POs ni inventari; transitaris a Forwarders. |
| **Inventory** | Veure i actualitzar stock per producte/SKU (per projecte): on són les unitats (producció, trànsit, Amazon) i si cal reordenar. | “Quin stock tinc per SKU? Què està en trànsit / a Amazon? Què està baix?” | No crear POs; no duplicar dades de proveïdor; la “font” del stock (PO/shipment) es pot indicar amb enllaços, no amb lògica duplicada. |

---

## 6. Canonical operations flow proposal

Relat del producte que ha de quedar visible:

1. **Project** (Projects / Project Detail)  
   - On es defineix el producte i la fase; des d’aquí es pot “Nova PO” (enllaç a Orders amb projecte preseleccionat).

2. **PO (Orders)**  
   - **Source of action**: crear/editar PO, triar projecte i proveïdor, definir items i entrega.  
   - Es veu: llista de POs, estat, projecte, proveïdor, import; al detall: dades PO, proveïdor (lectura), Amazon readiness, **shipments** (ShipmentsPanel), **tracking** (ShipmentTrackingSection), **LogisticsFlow**, documents (Manufacturer Pack, FNSKU).  
   - La “font d’acció” de shipments i tracking és el **detall de la PO** (Orders), no una pàgina separada de logística.

3. **Supplier (Suppliers)**  
   - **Source of action**: crear/editar proveïdor.  
   - Es veu: llista de proveïdors, contacte, termes; a la PO (Orders) es tria un supplier_id. No cal mostrar la llista de POs dins Suppliers; opcional: “POs amb aquest proveïdor” com a enllaç a Orders filtrat.

4. **Shipment / readiness**  
   - Es veu **dins Orders** (detall PO): ShipmentsPanel, ShipmentTrackingSection, LogisticsFlow, Amazon readiness.  
   - No cal (P1.3) una pàgina “Logística” separada; el flow visible és “obro la PO → veig shipments i tracking”.

5. **Inventory / stock**  
   - **Source of action**: consultar/actualitzar stock per SKU/projecte; registrar moviments.  
   - Es veu: Inventory amb línies per producte, projecte, unitats per ubicació, estat.  
   - Vincle amb el flow: des d’Inventory, “Projecte” enllaça a Project Detail; des de Project Detail o Dashboard es pot enllaçar “Stock” cap a Inventory (filtrat per projecte). No cal (P1.3) que “PO rebut” actualitzi automàticament inventari; sí que cal que **es noti el relat** (p. ex. “Veure POs d’aquest projecte” des d’Inventory o “Veure stock” des de la PO).

Resum del contracte canònic visible:
- **Project** → origen del producte i enllaç a “Nova PO”.
- **Orders** → origen de PO, shipments, tracking, Amazon readiness i documents (una sola secció Manufacturer Pack).
- **Suppliers** → origen de dades de proveïdor; selecció a la PO.
- **Inventory** → vista i acció sobre stock; enllaços cap a projecte i (opcional) cap a POs del projecte.

### 6.1 Block classification

| Bloc / àrea | Pantalla | Classificació | Nota |
|-------------|----------|----------------|------|
| Llista POs, filtres, stats, cards, LayoutSwitcher | Orders | **KEEP** | Nucli operatiu. |
| Modal detall PO: info general, proveïdor, adreça, productes, shipping, notes | Orders | **KEEP** | Agrupar com “Resum PO”. |
| AmazonReadySection | Orders | **KEEP** | Una sola instància. |
| LogisticsFlow, ShipmentsPanel, ShipmentTrackingSection | Orders | **KEEP** | Logística visible aquí. |
| Manufacturer Pack (primer bloc) | Orders | **KEEP** | Únic bloc. |
| Manufacturer Pack (segon bloc duplicat) | Orders | **REMOVE** | Duplicat. |
| Etiquetes FNSKU, TasksSection, PlannedVsActual | Orders | **KEEP** | Útils per demo. |
| DecisionLog “Why this supplier was chosen” | Orders | **KEEP BUT SIMPLIFY** | Opcional o col·lapsable; no protagonista. |
| NewPOModal, selector projecte/proveïdor | Orders | **KEEP** | Sense duplicar llista proveïdors. |
| Llista proveïdors, filtres, stats, cards, SupplierMemory | Suppliers | **KEEP** | Nucli. |
| Modal crear/editar proveïdor (tots els camps) | Suppliers | **KEEP BUT SIMPLIFY** | Per demo: nom, tipus, contacte, país, email, telèfon, payment terms, incoterm. |
| Exclusió tipus freight / transitaris | Suppliers | **KEEP** | Transitaris a Forwarders. |
| Llista inventari, stats, filtres, cards (unitats per ubicació) | Inventory | **KEEP** | Nucli. |
| Modal producte (SKU, projecte, unitats, reorder) | Inventory | **KEEP** | |
| Modal historial + afegir moviment | Inventory | **KEEP** | |
| Enllaços Inventory → Project / POs | Inventory | **REWORK** | Afegir enllaços a Project i (opcional) a Orders filtrat per projecte. |
| Lògica custom_cities (Suppliers) | Suppliers | **KEEP BUT SIMPLIFY** | No prioritària per demo. |

---

## 7. Minimum demo-worthy scope

Mínim perquè els flows es puguin ensenyar com a producte coherent:

1. **Orders**  
   - Llista de POs amb filtre per projecte i estat; una card clara (PO, projecte, proveïdor, estat, import).  
   - Detall PO: resum (dades, proveïdor, items) → **una** secció Amazon Ready + **una** secció Manufacturer Pack → Shipments + Tracking (LogisticsFlow, ShipmentsPanel, ShipmentTrackingSection) → Tasks/Decisions si es vol, sense duplicar blocs.  
   - Eliminar el **duplicat** del bloc Manufacturer Pack.

2. **Suppliers**  
   - Llista de proveïdors amb filtre tipus/país; card amb nom, tipus, ubicació, contacte.  
   - Crear/editar proveïdor amb camps essencials.  
   - En crear PO (Orders), selector de proveïdor que ve de Suppliers.

3. **Inventory**  
   - Llista d’inventari per SKU/projecte amb estat (OK/Baix/Crític) i unitats resumides (trànsit, Amazon, total).  
   - Enllaç des de la card (o des del filtre) cap a “Projecte” o “Veure POs d’aquest projecte” per tancar el relat.

4. **Logística**  
   - Sense nova pàgina: es veu al **detall de la PO** (Orders) amb ShipmentsPanel + ShipmentTrackingSection + LogisticsFlow.  
   - Opcional: a la sidebar o navegació, un sol enllaç tipus “Comandes” que porti a Orders, i des d’Orders el detall mostra “tot el que és logística per aquesta PO”.

5. **Navegació / llenguatge**  
   - Enllaços clars: Project Detail → “Nova PO” → Orders; Orders (detall) → “Projecte” → Project Detail; Inventory → “Projecte” → Project Detail; Orders (detall) → proveïdor (nom) pot enllaçar a Suppliers si es vol.  
   - Títols o breadcrumbs coherents (p. ex. “Comandes (PO)”, “Proveïdors”, “Inventari”) sense canvis de nom arbitraris.

---

## 8. Recommended implementation order

1. **Orders – Neteja i estructura**  
   - Treure el bloc duplicat “Manufacturer Pack” (deixar-ne un sol).  
   - Agrupar visualment el detall del modal en blocs (Resum PO / Proveïdor i entrega / Productes i enviament / Amazon i documents / Shipments i tracking / Tasques i decisions).  
   - No cal canviar dades ni APIs; només ordre i eliminació de duplicat.

2. **Orders – Enllaços**  
   - A la secció proveïdor del detall, fer que el nom del proveïdor (si existeix) enllaći a Suppliers (p. ex. `/app/suppliers` o amb query per destacar).  
   - Enllaç “Veure projecte” cap a Project Detail.

3. **Suppliers – Estabilitat**  
   - Assegurar que el selector de proveïdor a NewPOModal rep la llista org-scoped; sense canvis grans.  
   - Opcional: a la card o detall, “X POs amb aquest proveïdor” amb enllaç a Orders amb filtre.

4. **Inventory – Vincle amb projecte**  
   - A la card (o filtre), enllaç “Veure projecte” cap a Project Detail.  
   - Opcional: “Veure POs d’aquest projecte” cap a Orders amb `?project=...`.  
   - Mantenir càrrega org-scoped i moviments tal com estan.

5. **Navegació i copy**  
   - Revisar que Sidebar/TopNav tinguin “Comandes”, “Proveïdors”, “Inventari” amb ordre o agrupació que reflecteixi el flow (opcional).  
   - Copy comú (p. ex. “Comandes (PO)” a tot arreu on es parli d’orders).

6. **Validació**  
   - Build; comprovar que Orders obre detall sense duplicats; que des de Project es pot anar a Nova PO i des d’Inventory a projecte (i opcionalment a Orders).

---

## 9. Final verdict

**Sí, tenim definició prou bona per passar a implementació P1.3.**  

El contracte canònic del flow (Project → PO → Supplier → Shipment/readiness → Inventory) està definit; el rol de cada pantalla és clar; el mínim demo-worthy és assolible amb neteja a Orders (duplicat Manufacturer Pack, agrupació del detall), enllaços entre Orders, Suppliers, Inventory i Project, i sense obrir una pàgina nova de Logística. No cal refactor massiu ni canvis de backend; sí consistència visual i de navegació dins del que ja existeix.
