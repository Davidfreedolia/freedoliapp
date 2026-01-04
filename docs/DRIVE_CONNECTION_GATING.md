# DRIVE CONNECTION GATING — IMPLEMENTATION REPORT

**Data:** 2025-01-02  
**Feature:** Disable creation when Google Drive disconnected  
**Status:** ✅ **COMPLETAT**

---

## ✅ OBJECTIU

Deshabilitar tots els punts d'entrada de creació quan `driveConnected === false`, proporcionant feedback clar i CTA per connectar Drive.

---

## ✅ FITXERS MODIFICATS

1. **`src/pages/Projects.jsx`**
   - Botó "Nou Projecte" (línia 144)
   - Botó "Crear Projecte" (línia 162)

2. **`src/pages/Suppliers.jsx`**
   - Botó "Nou Proveïdor" (línia 298)
   - Handler `handleNewSupplier()` (línia 159)

3. **`src/pages/Warehouses.jsx`**
   - Botó "Nou Magatzem" (línia 278)
   - Botó "Crear Magatzem" (línia 316)
   - Handler `handleNewWarehouse()` (línia 114)

4. **`src/pages/Orders.jsx`**
   - Botó "Nova Comanda" (línia 695)
   - Botó "Nova Comanda" (empty state, línia 792)

5. **`src/pages/Forwarders.jsx`**
   - Botó "Nou Transitari" (línia 341)
   - Handler `handleNewForwarder()` (línia 190)

6. **`src/pages/ProjectDetail.jsx`**
   - Botó "Crear Comanda (PO)" (línia 680)

---

## ✅ CANVIS APLICATS PER CADA BOTÓ

### Patró Comú:

1. **Import `driveConnected` de `useApp()`:**
   ```javascript
   const { darkMode, driveConnected } = useApp()
   ```

2. **Guard a l'inici del handler:**
   ```javascript
   const handleNewX = () => {
     if (!driveConnected) return
     // ... rest of handler
   }
   ```

3. **Botó amb `disabled` i `title`:**
   ```javascript
   <button 
     onClick={() => {
       if (!driveConnected) return
       // ... action
     }} 
     disabled={!driveConnected}
     title={!driveConnected ? "Connecta Google Drive per crear" : ""}
     style={{
       ...styles.button,
       opacity: !driveConnected ? 0.5 : 1,
       cursor: !driveConnected ? 'not-allowed' : 'pointer'
     }}>
     {/* Button content */}
   </button>
   ```

4. **Hint text amb CTA:**
   ```javascript
   {!driveConnected && (
     <div style={{ marginTop: '8px', fontSize: '13px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
       <a href="/settings" style={{ color: '#4f46e5', textDecoration: 'underline' }}>
         Connecta Google Drive per crear
       </a>
     </div>
   )}
   ```

---

## ✅ DIFS ESPECÍFIQUES

### Projects.jsx

**Botó "Nou Projecte":**
- Afegit `driveConnected` a `useApp()` destructuring
- Afegit guard `if (!driveConnected) return` a `onClick`
- Afegit `disabled={!driveConnected}`
- Afegit `title` attribute
- Afegit estils condicionals (opacity, cursor)
- Afegit hint text amb link a `/settings`

**Botó "Crear Projecte":**
- Mateix patró aplicat

### Suppliers.jsx

**Botó "Nou Proveïdor":**
- Afegit `driveConnected` a `useApp()` destructuring
- Afegit guard `if (!driveConnected) return` a `handleNewSupplier()`
- Afegit `disabled={!driveConnected}`
- Afegit `title` attribute
- Afegit estils condicionals
- Afegit hint text amb link a `/settings`

### Warehouses.jsx

**Botons "Nou Magatzem" i "Crear Magatzem":**
- Afegit `driveConnected` a `useApp()` destructuring
- Afegit guard `if (!driveConnected) return` a `handleNewWarehouse()`
- Afegit `disabled={!driveConnected}` a ambdós botons
- Afegit `title` attribute
- Afegit estils condicionals
- Afegit hint text amb link a `/settings`

### Orders.jsx

**Botons "Nova Comanda" (2 instàncies):**
- Afegit `driveConnected` a `useApp()` destructuring
- Afegit guard `if (!driveConnected) return` a `onClick`
- Afegit `disabled={!driveConnected}`
- Afegit `title` attribute
- Afegit estils condicionals
- Afegit hint text amb link a `/settings`

### Forwarders.jsx

**Botó "Nou Transitari":**
- Afegit `driveConnected` a `useApp()` destructuring
- Afegit guard `if (!driveConnected) return` a `handleNewForwarder()`
- Afegit `disabled={!driveConnected}`
- Afegit `title` attribute
- Afegit estils condicionals
- Afegit hint text amb link a `/settings`

### ProjectDetail.jsx

**Botó "Crear Comanda (PO)":**
- `driveConnected` ja estava disponible
- Afegit guard `if (!driveConnected) return` a `onClick`
- Afegit `disabled={!driveConnected}`
- Afegit `title` attribute
- Afegit estils condicionals (opacity, cursor)

---

## ✅ VERIFICACIÓ

- ✅ Build passa (`npm run build` — 18.39s)
- ✅ No errors de lint
- ✅ Tots els botons de creació deshabilitats quan `driveConnected === false`
- ✅ Tooltip apareix en hover quan està deshabilitat
- ✅ Click no fa res quan està deshabilitat
- ✅ Hint text amb CTA a Settings visible quan està deshabilitat
- ✅ Comportament normal quan `driveConnected === true`

---

## ✅ COMPORTAMENT ESPERAT

### Amb Drive Desconnectat (`driveConnected === false`):
- ✅ Botons de creació deshabilitats (opacity 0.5, cursor not-allowed)
- ✅ Tooltip "Connecta Google Drive per crear" en hover
- ✅ Click no obre modal/no executa acció
- ✅ Hint text visible amb link a Settings

### Amb Drive Connectat (`driveConnected === true`):
- ✅ Comportament normal (sense canvis)
- ✅ Botons funcionals
- ✅ No es mostra hint text

---

## ✅ CTA IMPLEMENTAT

- **Text:** "Connecta Google Drive per crear"
- **Link:** `/settings` (pàgina de Configuració on es pot connectar Drive)
- **Estil:** Link blau amb underline
- **Visibilitat:** Només quan `driveConnected === false`

---

**Generat:** 2025-01-02  
**Per:** Drive Connection Gating Implementation


