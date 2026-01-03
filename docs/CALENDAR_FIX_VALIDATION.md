# CALENDAR FIX — VALIDATION CHECKLIST

**Data:** 2025-01-02  
**Status:** ⏳ **PENDENT VALIDACIÓ MANUAL**

---

## ✅ FIXES COMPLETATS

### 1. Query de Shipments Fixada
- **Ubicació:** `src/lib/supabase.js` línies 2453-2454
- **Canvi:** Afegit `.eq('is_demo', demoMode)` directe a `po_shipments`
- **Abans:** Només filtrava per `purchase_orders.is_demo`
- **Després:** Filtra per `po_shipments.is_demo` + `purchase_orders.is_demo`

### 2. Logs de Validació Eliminats
- Tots els `console.log` temporals han estat eliminats
- Codi net i llest per producció

### 3. Build Verification
- ✅ `npm run build` — **PASS** (15.37s)
- ✅ No errors
- ✅ Warnings de lint (no bloquejants)

---

## 🧪 VALIDACIÓ MANUAL REQUERIDA

**URL Producció:** https://freedoliapp.vercel.app

### TEST A — Demo OFF

1. Assegura't que Demo mode checkbox està **OFF**
2. Navega a **Calendar**
3. **VERIFICA:**
   - ✅ **ZERO** events contenint "DEMO"
   - ✅ **ZERO** "Pickup DEMO-PO-*"
   - ✅ **ZERO** "ETA DEMO-PO-*"
4. Obre **DevTools Console**
5. **VERIFICA:**
   - No hi ha errors relacionats amb Calendar
   - Events mostrats són només reals

**FAIL CONDITION:**
- ❌ Qualsevol event DEMO visible → **STOP, NO COMMIT**

---

### TEST B — Demo ON

1. Toggle Demo mode **ON**
2. Navega a **Calendar**
3. **VERIFICA:**
   - ✅ **NOMÉS** events contenint "DEMO"
   - ✅ **ZERO** events reals visibles
4. Console:
   - No hi ha errors

**FAIL CONDITION:**
- ❌ Qualsevol event real visible → **STOP, NO COMMIT**

---

### TEST C — Toggle OFF Again

1. Toggle Demo **OFF**
2. Navega a **Calendar**
3. **VERIFICA:**
   - ✅ Events reals reapareixen
   - ✅ Events DEMO desapareixen completament

**FAIL CONDITION:**
- ❌ Events DEMO encara visibles → **STOP, NO COMMIT**

---

## 📋 DECISION GATE

### SI TOTS ELS TESTS PASSEN:
- ✅ Proceed to commit & push
- ✅ Confirmar que fix funciona correctament

### SI ALGUN TEST FALLA:
- ❌ **STOP**
- ❌ Reportar comportament exacte que falla
- ❌ **NO COMMIT**

---

## 🚀 COMMIT READY

**Fitxer modificat:**
- `src/lib/supabase.js`

**Canvis:**
- Afegit filtre `is_demo` a query de `po_shipments`
- Eliminats logs de validació temporals

**Commit message:**
```
fix: calendar demo/real isolation (po_shipments is_demo filter)
```

**Comandament:**
```bash
git add src/lib/supabase.js
git commit -m "fix: calendar demo/real isolation (po_shipments is_demo filter)"
git push origin master
```

---

## 📊 RESUM DEL FIX

### Query Fixada
- **Taula:** `po_shipments`
- **Problema:** Només filtrava per `purchase_orders.is_demo`
- **Solució:** Ara filtra per `po_shipments.is_demo` + `purchase_orders.is_demo`

### Per què resol el problema
Abans, si un shipment tenia `is_demo` diferent al seu PO, podia aparèixer al Calendar incorrectament. Ara, ambdós han de coincidir amb `demoMode` per aparèixer.

---

## ⚠️ FINAL RULE

**Si QUALSEVOL dada DEMO apareix al Calendar amb Demo OFF, el fix es considera FALLIT independentment de l'estat del build.**

---

**Generat:** 2025-01-02  
**Per:** Calendar Demo/Real Isolation Fix Validation

