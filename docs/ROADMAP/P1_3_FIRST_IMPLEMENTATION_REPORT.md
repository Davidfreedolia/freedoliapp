# P1.3 FIRST IMPLEMENTATION REPORT

## 1. Files touched

- `src/pages/Orders.jsx`

(No s’han tocat components fills; tot el canvi és dins la pàgina Orders.)

## 2. Orders cleanup applied

- **Duplicat Manufacturer Pack eliminat**: Hi havia dos blocs seguits amb el mateix títol "📦 Manufacturer Pack" i dos botons "Generate Manufacturer Pack". S’ha deixat un sol bloc, amb la descripció "Generate all documents needed to send to the manufacturer (PO, labels, packing list, carton labels)" i el mateix `onClick` que carrega els identifiers del projecte abans d’obrir el modal (comportament del segon bloc original).
- **ShipmentTrackingSection**: Abans estava repetida (una vegada dins el bloc logística i una altra després d’Etiquetes FNSKU). S’ha eliminat la segona i s’ha col·locat una sola vegada just després de ShipmentsPanel, formant un bloc únic: LogisticsFlow → ShipmentsPanel → ShipmentTrackingSection.
- **Notes**: S’ha mogut la secció Notes del lloc immediatament després d’Especificacions d’Enviament al final del detall, agrupada amb Tasques, Decision Log i Planned vs Actual (notes / decision log / attachments).
- **Imports**: S’ha afegit `import useT from '../hooks/useT'` (s’usava `useT()` sense import). S’ha afegit `import { showToast } from '../components/Toast'` per als usos de `showToast` en el fitxer.

## 3. PO detail structure now

L’ordre real del cos del modal de detall de PO és:

1. **Summary / header PO**  
   - Capçalera amb po_number, projecte, selector d’estat, PDF, tancar.

2. **Supplier / commercial info**  
   - Informació general (data, quote ref, moneda, incoterm).  
   - Proveïdor (nom, contacte, email).  
   - Adreça d’entrega.

3. **Items / totals**  
   - Productes (taula d’items + total).  
   - Especificacions d’enviament (caixes, pesos, volum), si n’hi ha.

4. **Amazon Ready**  
   - Secció col·lapsable (AmazonReadySection).

5. **Shipment / tracking / logistics**  
   - Flux logístic (LogisticsFlow), si la PO no és draft ni cancel·lada.  
   - Shipments (ShipmentsPanel).  
   - Shipment Tracking (ShipmentTrackingSection).

6. **Amazon readiness / checklist (documents)**  
   - Manufacturer Pack (un sol bloc amb botó).  
   - Etiquetes FNSKU.

7. **Notes / decision log / attachments**  
   - Notes (si la PO té notes).  
   - TasksSection.  
   - Decision Log "Why this supplier was chosen".  
   - Planned vs Actual (si hi ha quote i shipment).

## 4. What stayed unchanged

- Llista de POs: toolbar, filtres, stats, grid/list/split, cards, accions Veure / PDF / menú.  
- NewPOModal, ManufacturerPackModal, modal FNSKU: lògica i props.  
- Càrrega de dades (getPurchaseOrders, getPurchaseOrder, getPoAmazonReadiness, getProductIdentifiers, etc.).  
- Handlers: handleStatusChange, handleDownloadPdf, handleGenerateManufacturerPack, handleGenerateLabels, etc.  
- Suppliers i Inventory: no s’han tocat.  
- No s’ha afegit cap pantalla nova de logística ni cap refactor d’arquitectura de modals.

## 5. Validation

- **Build**: `npm run build` executat des de la arrel del projecte. Ha finalitzat correctament (exit code 0).  
- **Comprovacions lògiques**:  
  - La llista de POs es renderitza amb el mateix codi; no s’ha tocat la part de llistat.  
  - El detall de PO s’obre amb el mateix `handleViewOrder` i `setShowDetailModal(true)`; no s’ha canviat la condició d’obertura.  
  - Només hi ha un bloc "Manufacturer Pack" al JSX del modal de detall; no hi ha blocs redundants amb el mateix títol.  
  - ShipmentTrackingSection es renderitza una sola vegada, dins el bloc logística.  
- **Imports**: S’ha afegit `useT` i `showToast`; no s’ha eliminat cap import utilitzat; no hi ha imports morts introduïts.

## 6. Final verdict

Aquest primer tall de P1.3 queda **implementat**. Orders queda amb una sola narrativa al detall (sense duplicat de Manufacturer Pack), l’ordre de seccions alineat amb l’auditoria (summary → supplier/commercial → items → shipment/tracking/logistics → Amazon readiness/checklist → notes/tasks/decisions), i la logística concentrada al detall de la PO sense nova pantalla. La llista de POs i tota la funcionalitat existent es manté. No s’ha tocat Suppliers ni Inventory; el següent pas natural seria l’ordre 2–4 de l’auditoria (enllaços des d’Orders a Suppliers/Project, i des d’Inventory a Project/Orders) en un tall posterior.
