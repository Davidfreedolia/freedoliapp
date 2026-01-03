# SMOKE TEST — REAL WORKFLOW (DEMO OFF)

**Data:** 2025-01-02  
**Mode:** Demo OFF  
**Objectiu:** Verificar que totes les operacions reals funcionen correctament

---

## ✅ PART 1 — NAVBAR FIX COMPLETAT

- ✅ Toggle Demo eliminat del TopNavbar
- ✅ Toggle Demo mantingut a Settings
- ✅ Build passa
- ✅ Imports netejats

---

## 🧪 PART 2 — REAL WORKFLOW TEST (DEMO OFF)

**Prerequisit:** Assegura't que Demo mode està **OFF** (Settings → Demo mode checkbox desmarcat)

### A) Create Warehouse

1. Navega a **Warehouses** (o **Magatzems**)
2. Clica "Crear Magatzem" o equivalent
3. **Nom:** `REAL-WH-20250102-1200` (o timestamp actual)
4. Completa camps requerits (adreça, país, etc.)
5. Clica **Guardar**
6. **Verifica:**
   - [ ] Warehouse apareix a la llista
   - [ ] Refresh page → Warehouse persisteix
   - [ ] Nom NO comença amb "DEMO-"

**Status:** ⬜ PASS ⬜ FAIL  
**Error (si falla):** _______________

---

### B) Create Supplier

1. Navega a **Suppliers** (o **Proveïdors**)
2. Clica "Crear Proveïdor" o equivalent
3. **Nom:** `REAL-SUP-20250102-1200` (o timestamp actual)
4. Completa camps requerits (email, telèfon, país, etc.)
5. Clica **Guardar**
6. **Verifica:**
   - [ ] Supplier apareix a la llista
   - [ ] Refresh page → Supplier persisteix
   - [ ] Nom NO comença amb "DEMO-"

**Status:** ⬜ PASS ⬜ FAIL  
**Error (si falla):** _______________

---

### C) Create Project

1. Navega a **Projects** (o **Projectes**)
2. Clica "Crear Projecte" o equivalent
3. **Nom:** `REAL-SMOKE-20250102-1200` (o timestamp actual)
4. Completa camps requerits
5. Clica **Guardar**
6. **Verifica:**
   - [ ] Project apareix a la llista
   - [ ] **Codi/SKU NO comença amb "DEMO-"**
   - [ ] Refresh page → Project persisteix
   - [ ] Project code format: `PR-FRDL250001` (o similar, NO "DEMO-")

**Status:** ⬜ PASS ⬜ FAIL  
**Error (si falla):** _______________  
**Project Code generat:** _______________

---

### D) Create Purchase Order

1. Navega a **Orders** (o **Comandes**)
2. Clica "Crear Comanda" o equivalent
3. **Selecciona:**
   - Project: `REAL-SMOKE-20250102-1200` (creat a C)
   - Supplier: `REAL-SUP-20250102-1200` (creat a B)
   - Warehouse: `REAL-WH-20250102-1200` (creat a A)
4. **Afegeix 1 línia d'item:**
   - SKU/Producte
   - Quantitat: 100
   - Preu unitari: 10.00
5. Clica **Guardar**
6. **Verifica:**
   - [ ] PO apareix a la llista
   - [ ] PO number NO comença amb "DEMO-"
   - [ ] Refresh page → PO persisteix
   - [ ] Tots els camps es mantenen (project, supplier, warehouse, items)

**Status:** ⬜ PASS ⬜ FAIL  
**Error (si falla):** _______________  
**PO Number generat:** _______________

---

### E) Calendar Check (Demo OFF)

1. Navega a **Calendar**
2. **Verifica:**
   - [ ] **ZERO** events contenint "DEMO"
   - [ ] **ZERO** events contenint "DEMO-PO"
   - [ ] **ZERO** "Pickup DEMO-PO-*"
   - [ ] **ZERO** "ETA DEMO-PO-*"
   - [ ] Si hi ha events reals (del PO creat a D), són visibles
   - [ ] Si no hi ha events reals, Calendar està buit (acceptable)

**Status:** ⬜ PASS ⬜ FAIL  
**Events DEMO trobats (si falla):** _______________

---

## 📊 RESULTAT FINAL

### Workflow Completat
- [ ] A) Warehouse creat i persisteix
- [ ] B) Supplier creat i persisteix
- [ ] C) Project creat i persisteix (codi NO "DEMO-")
- [ ] D) Purchase Order creat i persisteix (number NO "DEMO-")
- [ ] E) Calendar mostra ZERO events DEMO

### Primer Punt de Fallida
**Si algun test falla:**
- **Test que falla:** _______________
- **Error exacte:** _______________
- **Pàgina on falla:** _______________
- **Screenshot/Notes:** _______________

### Si Tots Passen
- ✅ **Workflow A→E completat amb èxit**
- ✅ Totes les dades persisteixen
- ✅ ✅ Calendar mostra ZERO events DEMO amb Demo OFF

---

**Generat:** 2025-01-02  
**Per:** Real Workflow Smoke Test

