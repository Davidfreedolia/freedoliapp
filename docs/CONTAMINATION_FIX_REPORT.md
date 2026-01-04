# DB CONTAMINATION FIX — COMPLETE REPORT

**Data:** 2025-01-02  
**Problema:** Demo OFF Calendar mostra events DEMO (DEMO-PO-0003-1, DEMO-PO-0002-1, DEMO-PO-0001-1)  
**Causa Root:** Dades DEMO contaminades amb `is_demo = false` o `NULL`  
**Status:** ✅ **FIXES PREPARATS**

---

## 🔍 DIAGNÒSTIC

### Problema Confirmat
- Demo OFF → Calendar mostra events "DEMO-PO-*"
- Demo ON → Calendar mostra només events DEMO (correcte)
- **Conclusió:** Dades DEMO tenen `is_demo = false` o `NULL`

### Hipòtesi
Dades DEMO generades abans del fix de seed tenen flags incorrectes:
- `purchase_orders` amb `po_number ILIKE 'DEMO-%'` però `is_demo = false` o `NULL`
- `po_shipments` amb `is_demo` diferent al seu PO pare
- Altres taules relacionades amb flags incorrectes

---

## ✅ FIXES IMPLEMENTATS

### 1. Queries SQL d'Auditoria
**Fitxer:** `docs/DB_CONTAMINATION_AUDIT.sql`
- Query A: Check DEMO purchase_orders i flags
- Query B: Identificar POs contaminats
- Query C: Verificar alineació po_shipments amb PO
- Query D-G: Verificar altres taules (projects, tasks, suppliers, quotes)

### 2. Queries SQL de Fix
**Fitxer:** `docs/DB_CONTAMINATION_FIX.sql`
- Fix purchase_orders: `UPDATE ... SET is_demo = true WHERE po_number ILIKE 'DEMO-%'`
- Fix po_shipments: Alinear amb PO pare
- Fix projects, tasks, suppliers, quotes

### 3. Script SQL Complet
**Fitxer:** `docs/DB_CONTAMINATION_FIX_COMPLETE.sql`
- Script únic que fa audit → fix → verificació
- Executar tot d'una a Supabase SQL Editor

### 4. Verificació Seed Code
**Fitxer:** `src/lib/demoSeed.js`
- ✅ **TOTS els inserts ja tenen `is_demo: true`**
- ✅ Suppliers: `is_demo: true` (línia 86)
- ✅ Projects: `is_demo: true` (línia 128)
- ✅ GTIN pool: `is_demo: true` (línia 171)
- ✅ Product identifiers: `is_demo: true` (línia 200)
- ✅ Supplier quotes: `is_demo: true` (línia 225)
- ✅ Supplier quote price breaks: `is_demo: true` (línia 246)
- ✅ Purchase orders: `is_demo: true` (línia 292)
- ✅ PO Amazon readiness: `is_demo: true` (línies 316, 332)
- ✅ PO shipments: `is_demo: true` (línia 384)
- ✅ Tasks: `is_demo: true` (línia 437)
- ✅ Sticky notes: `is_demo: true` (línies 468, 621)
- ✅ Expenses: `is_demo: true` (línia 502)
- ✅ Incomes: `is_demo: true` (línia 534)
- ✅ Recurring expenses: `is_demo: true` (línies 557, 572)

**Conclusió:** El seed code està correcte. El problema són dades antigues contaminades.

---

## 📋 PASSOS PER EXECUTAR

### STEP 1: Executar Script SQL

1. Obre Supabase SQL Editor
2. Copia tot el contingut de `docs/DB_CONTAMINATION_FIX_COMPLETE.sql`
3. Executa el script complet
4. Verifica que tots els `remaining_contaminated` són 0

### STEP 2: Verificar Calendar

1. Demo OFF → Calendar
2. Verifica: **ZERO** events "DEMO-PO-*"
3. Demo ON → Calendar
4. Verifica: **NOMÉS** events "DEMO-PO-*"
5. Toggle OFF → Verifica que DEMO desapareixen

---

## 🔍 VERIFICACIÓ DE QUERIES CALENDAR

Totes les queries del Calendar ja filtren correctament:

1. **Tasks** → `getTasks()` filtra per `is_demo` (línia 2139)
2. **Shipments** → Filtra per `po_shipments.is_demo` + `purchase_orders.is_demo` (línies 2453-2454)
3. **Manufacturer Packs** → Filtra per `purchase_orders.is_demo` (línia 2506)
4. **Quotes** → Filtra per `supplier_quotes.is_demo` (línia 2557)
5. **Purchase Orders** → Filtra per `purchase_orders.is_demo` (línia 2602)

**Conclusió:** Les queries estan correctes. El problema són dades contaminades.

---

## 📊 RESULTAT ESPERAT

### Abans del Fix
- Demo OFF → Calendar mostra events "DEMO-PO-*" (incorrecte)
- Dades DEMO amb `is_demo = false` o `NULL`

### Després del Fix
- Demo OFF → Calendar mostra **ZERO** events "DEMO-PO-*" (correcte)
- Totes les dades DEMO tenen `is_demo = true`
- `po_shipments.is_demo` alineat amb `purchase_orders.is_demo`

---

## ✅ CHECKLIST FINAL

- [x] Queries SQL d'auditoria creades
- [x] Queries SQL de fix creades
- [x] Script SQL complet creat
- [x] Seed code verificat (tots els inserts tenen `is_demo: true`)
- [x] Calendar queries verificades (totes filtren per `is_demo`)
- [ ] **Script SQL executat a Supabase** ⚠️ **PENDENT**
- [ ] **Verificació Calendar després del fix** ⚠️ **PENDENT**

---

## 🚀 PRÒXIMS PASSOS

1. **Executar Script SQL:**
   - Obre `docs/DB_CONTAMINATION_FIX_COMPLETE.sql`
   - Executa a Supabase SQL Editor
   - Verifica que tots els `remaining_contaminated = 0`

2. **Test Calendar:**
   - Demo OFF → Verificar ZERO events DEMO
   - Demo ON → Verificar NOMÉS events DEMO
   - Toggle OFF → Verificar que DEMO desapareixen

3. **Si tot passa:**
   - Fix completat
   - No cal commit (només fix de dades a DB)

---

**Status:** ✅ **READY FOR EXECUTION**

Tots els fixes estan preparats. Executa el script SQL a Supabase per fixar la contaminació.

---

**Generat:** 2025-01-02  
**Per:** DB Contamination Fix


