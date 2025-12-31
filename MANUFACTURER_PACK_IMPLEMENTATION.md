# 📦 Manufacturer Pack - Implementació Completa

## Fitxers Creats

### 1. `src/lib/generatePackingListPdf.js`
- Genera PDF de Packing List amb:
  - Header amb dades de Freedolia i companyia
  - Informació de PO, Project, Supplier
  - Taula d'items amb quantitats i preus
  - Detalls de packaging (cartons, dimensions, weight)
  - Totals calculats

### 2. `src/lib/generateCartonLabelsPdf.js`
- Genera PDF d'etiquetes per caixes amb:
  - Una o dues etiquetes per pàgina A4
  - PO number, Project SKU
  - Carton X of N
  - Units per carton, weight, dimensions
  - Línies de tall

### 3. `src/lib/manufacturerPack.js`
- `validateManufacturerPack()`: Valida camps requerits per generar pack
- `getManufacturerPackFileNames()`: Genera noms de fitxers estàndard

### 4. `src/components/ManufacturerPackModal.jsx`
- Modal UI per seleccionar documents a incloure
- Checkboxes per cada document
- Configuració de FNSKU labels (quantity, template)
- Botons: Download ZIP / Upload to Drive
- Validacions visuals

## Fitxers Modificats

### 1. `src/pages/Orders.jsx`
- Afegit botó "Generate Manufacturer Pack" al detall de PO
- Funció `handleGenerateManufacturerPack()` que:
  - Genera tots els PDFs seleccionats
  - Crea ZIP amb jszip
  - Puja a Google Drive (si connectat) o descarrega localment
  - Registra audit log
- Integrat modal ManufacturerPackModal

### 2. `package.json`
- Afegit `jszip` com a dependència

## Dependències Afegides

```json
{
  "jszip": "^3.10.1"  // (versió instal·lada automàticament)
}
```

## Funcionalitats Implementades

### ✅ A) Packing List PDF
- Header amb dades companyia
- PO number, Project (name+SKU), Supplier
- Taula items amb desc, qty, unit, price, total
- Packaging info de `po_amazon_readiness`:
  - cartons_count
  - units_per_carton
  - dimensions (L/W/H cm)
  - weight (kg)
  - Totals calculats

### ✅ B) Carton Labels PDF
- Una etiqueta per caixa
- PO number, Project SKU
- Carton X of N
- Units per carton, weight, dimensions
- Plantilla 2 per pàgina A4

### ✅ C) Integració amb Amazon Ready
- Validació de camps crítics abans de generar
- Missatges clars si falten camps
- No genera Packing List/Carton Labels si falten dades
- No genera FNSKU labels si falta FNSKU i `needs_fnsku=true`

### ✅ D) UI al detall de PO
- Botó "Generate Manufacturer Pack" destacat
- Modal amb checkboxes:
  - Include PO PDF (default ON)
  - Include FNSKU labels (default ON si `needs_fnsku`)
  - Include Packing List (default ON)
  - Include Carton Labels (default ON si `cartons_count` existeix)
- Configuració FNSKU labels (quantity, template)

### ✅ E) ZIP Generation
- Crea ZIP amb tots els PDFs seleccionats
- Noms de fitxers estàndard:
  - `PO_<po_number>.pdf`
  - `FNSKU_Labels_<po_number>.pdf`
  - `PackingList_<po_number>.pdf`
  - `CartonLabels_<po_number>.pdf`
- Descarrega automàticament

### ✅ F) Upload a Google Drive
- Si Drive connectat → puja ZIP i PDFs a:
  - Carpeta projecte → `03_PurchaseOrders/<po_number>/`
- Idempotent (utilitza `findOrCreateFolder`)
- Missatge clar si Drive desconnectat

### ✅ G) Observabilitat
- Registra a `audit_log`:
  - `action: manufacturer_pack_generated`
  - `entity: purchase_order_id`
  - `metadata`: quins docs + si s'ha pujat a Drive

## Prova Manual Pas a Pas

### Pas 1: Preparar dades Amazon Ready

1. Obre una PO amb projecte associat
2. Ves a la secció "Amazon Ready" i omple:
   - Units per carton: `10`
   - Cartons count: `5`
   - Carton length: `30`
   - Carton width: `20`
   - Carton height: `15`
   - Carton weight: `2.5`
3. Guarda els canvis

### Pas 2: Configurar FNSKU (si cal)

1. Si el projecte no té FNSKU:
   - Ves a Project Detail → Identificadors
   - Afegeix FNSKU
2. Si `needs_fnsku=false`, les etiquetes FNSKU no es generaran

### Pas 3: Generar Manufacturer Pack

1. Al detall de la PO, busca el botó **"Generate Manufacturer Pack"**
2. Clica el botó → s'obre el modal
3. Selecciona els documents que vols incloure:
   - ✅ Include PO PDF
   - ✅ Include FNSKU labels (si aplica)
   - ✅ Include Packing List
   - ✅ Include Carton Labels
4. Configura FNSKU labels (quantity, template) si aplica
5. Tria:
   - **"Generate & Download ZIP"** → descarrega ZIP localment
   - **"Generate & Upload to Drive"** → puja a Google Drive (si connectat)

### Pas 4: Verificar resultat

**Si descarregat localment:**
- Obre el ZIP descarregat
- Verifica que contingui tots els PDFs seleccionats
- Obre cada PDF i verifica el contingut

**Si pujat a Drive:**
1. Obre Google Drive
2. Ves a la carpeta del projecte → `03_PurchaseOrders/<po_number>/`
3. Verifica que hi siguin el ZIP i els PDFs

### Pas 5: Verificar validacions

**Prova 1: Falten camps crítics**
1. Esborra `cartons_count` o `units_per_carton` de Amazon Ready
2. Intenta generar Packing List
3. ✅ Ha de mostrar error clar i no generar

**Prova 2: Falta FNSKU**
1. Si `needs_fnsku=true` però no hi ha FNSKU al projecte
2. Intenta generar FNSKU labels
3. ✅ Ha de mostrar error clar

**Prova 3: Drive desconnectat**
1. Desconnecta Google Drive
2. Intenta generar pack
3. ✅ Només ha de mostrar opció de download
4. ✅ Ha de mostrar missatge "Connect Drive to upload"

## Estructura de Carpetes a Drive

```
Project Folder (SKU_ProjectName)
  └── 03_PurchaseOrders
      └── PO_<po_number>
          ├── ManufacturerPack_<po_number>.zip
          ├── PO_<po_number>.pdf
          ├── FNSKU_Labels_<po_number>.pdf (si generat)
          ├── PackingList_<po_number>.pdf (si generat)
          └── CartonLabels_<po_number>.pdf (si generat)
```

## Notes Tècniques

- **Idempotència**: `findOrCreateFolder` evita duplicats
- **Error Handling**: Errors clars per l'usuari, logs estructurats
- **Performance**: Generació asíncrona de PDFs, ZIP al final
- **Audit Log**: Registra cada generació amb metadades completes

## Comprovacions Finals

- [x] Build compila sense errors (`npm run build`)
- [x] Modal s'obre correctament
- [x] Validacions funcionen
- [x] PDFs es generen correctament
- [x] ZIP es crea i descarrega
- [x] Upload a Drive funciona (si connectat)
- [x] Audit log registra accions
- [x] Error handling adequat

---

**Commit suggerit:**
```
Add Manufacturer Pack generator (PDFs + ZIP + Drive upload)
```

