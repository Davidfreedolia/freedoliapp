# Sprint 1 - Gestió de Codis Amazon (GTIN + FNSKU)

## 📋 Resum

Implementació de la gestió d'identificadors Amazon (GTIN, ASIN, FNSKU) amb pool de codis i assignació automàtica.

---

## 🗄️ Base de Dades

### Fitxer SQL: `identifiers-setup.sql`

**Executar aquest script al SQL Editor de Supabase abans d'utilitzar les funcionalitats.**

**Taules creades:**

1. **`gtin_pool`** - Pool de codis GTIN disponibles
   - `gtin_code` (text)
   - `gtin_type` (EAN, UPC, GTIN_EXEMPT)
   - `status` (available, assigned, archived)
   - `assigned_to_project_id` (nullable)
   - RLS habilitat

2. **`product_identifiers`** - Identificadors assignats a cada projecte
   - `project_id` (FK a projects)
   - `gtin_type` (EAN, UPC, GTIN_EXEMPT)
   - `gtin_code` (nullable - obligatori NULL si GTIN_EXEMPT)
   - `exemption_reason` (nullable - obligatori si GTIN_EXEMPT)
   - `asin` (text, nullable)
   - `fnsku` (text, nullable)
   - RLS habilitat
   - UNIQUE(user_id, project_id)

**Validacions:**

- ✅ GTIN_EXEMPT → `gtin_code` ha de ser NULL
- ✅ GTIN_EXEMPT → `exemption_reason` és obligatori
- ✅ Un GTIN no es pot assignar a 2 projectes (via `assigned_to_project_id`)
- ✅ Un projecte només pot tenir un `product_identifiers`

---

## 📁 Fitxers Creats/Modificats

### Nous Fitxers

1. **`identifiers-setup.sql`**
   - Script SQL idempotent amb totes les taules i constraints

2. **`src/components/IdentifiersSection.jsx`**
   - Component React per gestionar identificadors a ProjectDetail
   - Formulari per editar GTIN, ASIN, FNSKU
   - Modal per assignar GTINs des del pool

3. **`IDENTIFIERS_SPRINT1.md`** (aquest document)
   - Documentació de la funcionalitat

### Fitxers Modificats

4. **`src/lib/supabase.js`**
   - `getProductIdentifiers(projectId)` - Obté identificadors d'un projecte
   - `upsertProductIdentifiers(projectId, identifiers)` - Guarda/actualitza identificadors
   - `getGtinPool(status)` - Obté GTINs del pool (opcionalment filtrat per status)
   - `getAvailableGtinCodes()` - Obté GTINs disponibles (status='available')
   - `assignGtinFromPool(gtinPoolId, projectId)` - Assigna un GTIN del pool a un projecte
   - `addGtinToPool(gtinData)` - Afegeix un GTIN al pool
   - `getUnassignedGtinCodes()` - Obté GTINs no assignats
   - `getProjectsMissingGtin()` - Obté projectes que no tenen GTIN assignat

5. **`src/pages/ProjectDetail.jsx`**
   - Importat i integrat `IdentifiersSection` component

---

## 🎯 Funcionalitats Implementades

### 1. Visualització i Edició d'Identificadors

A `ProjectDetail`, nova secció "Identificadors Amazon" amb:
- **GTIN Type**: Dropdown (EAN, UPC, GTIN_EXEMPT)
- **GTIN Code**: Input text (obligatori si no és EXEMPT)
- **Exemption Reason**: Textarea (obligatori si GTIN_EXEMPT)
- **ASIN**: Input text (opcional)
- **FNSKU**: Input text (opcional)
- Botó "Guardar"

### 2. Assignació des del Pool

- Botó "Assignar del pool (X)" mostra quantitat de GTINs disponibles
- Al clicar, obre modal amb llista de GTINs disponibles
- Cada GTIN mostra: codi, tipus, botó "Assignar"
- En assignar, actualitza `gtin_pool.status = 'assigned'` i crea/actualitza `product_identifiers`

### 3. Validacions

- Si `gtin_type = GTIN_EXEMPT` → `gtin_code` ha de ser NULL (validat a BD i client)
- Si `gtin_type != GTIN_EXEMPT` → `gtin_code` és obligatori
- Si `gtin_type = GTIN_EXEMPT` → `exemption_reason` és obligatori

---

## 🧪 Prova Manual

### Pas 1: Executar SQL

1. Anar al SQL Editor de Supabase
2. Executar `identifiers-setup.sql`
3. Verificar que s'han creat les taules `gtin_pool` i `product_identifiers`

### Pas 2: Afegir GTINs al Pool

Per provar, afegeix alguns GTINs manualment:

```sql
INSERT INTO gtin_pool (gtin_code, gtin_type, status) VALUES
  ('1234567890123', 'EAN', 'available'),
  ('9876543210987', 'UPC', 'available'),
  ('EXEMPT001', 'GTIN_EXEMPT', 'available');
```

### Pas 3: Provar al ProjectDetail

1. Anar a un projecte existent
2. Veure nova secció "Identificadors Amazon"
3. Provar edició:
   - Seleccionar tipus GTIN (EAN, UPC, GTIN_EXEMPT)
   - Introduir codi GTIN (o exemption reason si EXEMPT)
   - Introduir ASIN i FNSKU
   - Guardar
4. Provar assignació des del pool:
   - Clicar "Assignar del pool"
   - Seleccionar un GTIN
   - Verificar que s'assigna correctament

### Pas 4: Verificar a Supabase

```sql
-- Veure identificadors assignats
SELECT * FROM product_identifiers;

-- Veure GTINs del pool
SELECT * FROM gtin_pool;
```

---

## ⚠️ Notes Importants

- **Un GTIN no es pot assignar a 2 projectes**: La lògica d'assignació actualitza `gtin_pool.status = 'assigned'` i `assigned_to_project_id`
- **GTIN_EXEMPT**: Si selecciones GTIN_EXEMPT, el camp `gtin_code` desapareix i apareix `exemption_reason` (obligatori)
- **RLS**: Totes les taules tenen RLS habilitat, cada usuari només veu les seves dades

---

## 📝 Funcions Disponibles a supabase.js

```javascript
// Obté identificadors d'un projecte
await getProductIdentifiers(projectId)

// Guarda/actualitza identificadors
await upsertProductIdentifiers(projectId, {
  gtin_type: 'EAN',
  gtin_code: '1234567890123',
  asin: 'B08XYZ1234',
  fnsku: 'X001ABCD1234'
})

// Obté GTINs disponibles del pool
await getAvailableGtinCodes()

// Assigna un GTIN del pool a un projecte
await assignGtinFromPool(gtinPoolId, projectId)

// Obté projectes que no tenen GTIN assignat
await getProjectsMissingGtin()
```

---

## 🚧 Pendent (Sprint 1 - Part 2)

- [ ] Vista "Unassigned codes" (a Projects page o Analytics)
- [ ] Vista "SKUs missing codes" (a Projects page o Analytics)
- [ ] UI per afegir GTINs al pool des de la UI (actualment només via SQL)

---

**Última actualització**: Sprint 1 - Base implementada (SQL + UI bàsica + assignació pool)
















