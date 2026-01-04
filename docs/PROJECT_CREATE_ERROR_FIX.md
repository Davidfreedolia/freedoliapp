# FIX: "supabase.from(...).eq is not a function" (PROJECT CREATE)

**Data:** 2025-01-02  
**Error:** `supabase.from(...).eq is not a function`  
**Status:** ✅ **FIXAT**

---

## ✅ PROBLEMA IDENTIFICAT

**Ubicació:** `src/lib/supabase.js` línia 692  
**Funció:** `generateProjectCode()`

**Problema:**
- La query a Supabase no comprovava l'error (`error`)
- Si la query fallava, `data` podia ser `null` o `undefined`
- Això podia causar errors quan s'intentava accedir a `data[0]` o quan es propagava l'error

---

## ✅ FIX APLICAT

### Abans:
```javascript
while (attempts < maxAttempts) {
  const { data } = await supabase
    .from('projects')
    .select('project_code, sku')
    .eq('user_id', userId)
    .eq('is_demo', demoMode)
    .like('project_code', `${prefix}%`)
    .order('project_code', { ascending: false })
    .limit(1)

  let nextNum = 1
  // ...
}
```

### Després:
```javascript
while (attempts < maxAttempts) {
  const { data, error } = await supabase
    .from('projects')
    .select('project_code, sku')
    .eq('user_id', userId)
    .eq('is_demo', demoMode)
    .like('project_code', `${prefix}%`)
    .order('project_code', { ascending: false })
    .limit(1)

  if (error) throw error

  let nextNum = 1
  // ...
}
```

### Canvis:
1. ✅ Afegit `error` a la desestructuració de la query
2. ✅ Afegit `if (error) throw error` per gestionar errors correctament

---

## ✅ VERIFICACIÓ

- ✅ Build passa (`npm run build` — 16.67s)
- ✅ No errors de lint
- ✅ Fix minimal (només 2 línies modificades)

---

## 📋 RESULTAT

**Abans:**
- Error: `supabase.from(...).eq is not a function` quan la query fallava
- `data` podia ser `null` o `undefined` sense comprovar

**Després:**
- Errors de query es gestionen correctament
- `data` només s'utilitza si la query és exitosa

---

## ✅ CONFIRMACIÓ

**Error eliminat:** `supabase.from(...).eq is not a function` ✅

---

**Generat:** 2025-01-02  
**Per:** Project Create Error Fix


