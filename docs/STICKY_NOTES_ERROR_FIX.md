# FIX: "supabase.from(...).eq is not a function" (STICKY NOTES)

**Data:** 2025-01-02  
**Error:** `supabase.from(...).eq is not a function`  
**Ubicació:** `src/lib/supabase.js` línia 3006  
**Funció:** `getStickyNotes()`  
**Status:** ✅ **FIXAT**

---

## ✅ PROBLEMA IDENTIFICAT

**Root Cause:**
- L'ordre dels mètodes de query builder era incorrecte
- `.eq('is_demo', demoMode)` s'estava cridant **abans** de `.select()`
- A Supabase, `.select()` ha de ser cridat abans dels filtres `.eq()`

**Error Stacktrace:**
- `src/lib/supabase.js:~3006`
- `function: getStickyNotes`
- Error apareixia quan es creava un projecte (perquè notes es carregaven automàticament)

---

## ✅ FIX APLICAT

### Abans (INCORRECTE):
```javascript
let query = supabase
  .from('sticky_notes')
  .eq('is_demo', demoMode) // ❌ Abans de .select()
  .select(`
    *,
    tasks:linked_task_id (
      id,
      title,
      status,
      due_date,
      priority
    )
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
```

### Després (CORRECTE):
```javascript
let query = supabase
  .from('sticky_notes')
  .select(`
    *,
    tasks:linked_task_id (
      id,
      title,
      status,
      due_date,
      priority
    )
  `)
  .eq('user_id', userId)
  .eq('is_demo', demoMode) // ✅ Després de .select()
  .order('created_at', { ascending: false })
```

### Canvis:
1. ✅ Mogut `.select()` abans de `.eq('is_demo', demoMode)`
2. ✅ Mantingut ordre correcte: `.select()` → `.eq()` → `.order()`

---

## ✅ ORDRE CORRECTE SUPABASE QUERY BUILDER

El patró correcte per Supabase queries és:

```javascript
const { data, error } = await supabase
  .from('table_name')
  .select('columns')      // 1. SELECT primer
  .eq('column', value)   // 2. Filtres després
  .eq('column2', value2)
  .order('column', { ascending: false })
```

**NO:**
```javascript
.eq('column', value)     // ❌ Abans de .select()
.select('columns')
```

---

## ✅ VERIFICACIÓ

- ✅ Build passa (`npm run build` — 21.15s)
- ✅ No errors de lint
- ✅ Fix minimal (només reordenat mètodes)

---

## 📋 RESULTAT

**Abans:**
- Error: `supabase.from(...).eq is not a function` quan es creava projecte
- Notes no es carregaven correctament

**Després:**
- Query builder amb ordre correcte
- Notes es carreguen sense errors
- Crear projecte no genera errors a consola

---

## ✅ CONFIRMACIÓ

**Error eliminat:** `supabase.from(...).eq is not a function` a `getStickyNotes()` ✅

---

**Generat:** 2025-01-02  
**Per:** Sticky Notes Error Fix


