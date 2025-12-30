# Millora del Tracking Logístic - Detecció de Comandes Abandonades

## 📋 Resum

S'ha millorat el widget de tracking logístic al Dashboard per detectar comandes que necessiten actualització o que estan "abandonades".

---

## 🗄️ Canvis a la Base de Dades

### Fitxer SQL: `logistics-tracking-update.sql`

Executar aquest script al SQL Editor de Supabase abans de fer servir les noves funcionalitats.

**Canvis inclosos:**

1. **Columna `logistics_updated_at`** a `purchase_orders`:
   - Timestamp que s'actualitza automàticament quan canvien `logistics_status` o `tracking_number`
   - Inicialitzat amb `updated_at` o `created_at` per registres existents

2. **Trigger automàtic**:
   - Funció `update_logistics_updated_at()` que actualitza el timestamp
   - S'activa automàticament en qualsevol UPDATE a `purchase_orders`
   - Només actualitza si `logistics_status` o `tracking_number` han canviat

3. **Índex**:
   - Índex per millorar consultes per `logistics_updated_at`

---

## 📁 Fitxers Modificats/Creats

### Nous Fitxers

1. **`logistics-tracking-update.sql`**
   - Script SQL idempotent per afegir el camp i el trigger

2. **`LOGISTICS_TRACKING_UPDATE.md`** (aquest document)
   - Documentació de la funcionalitat

### Fitxers Modificats

3. **`src/components/LogisticsTrackingWidget.jsx`**
   - Afegides funcions per calcular dies des de l'última actualització
   - Mostra "Última actualització: fa X dies"
   - Badges de warning:
     - **Taronja "Needs update"**: >7 dies sense actualització
     - **Vermell "Stale"**: >14 dies sense actualització
   - Filtre "Només pendents" per mostrar només comandes que necessiten actualització

---

## 🎯 Funcionalitats

### 1. Detecció d'Actualització

El widget calcula automàticament els dies des de l'última actualització logística:

```javascript
// Si logistics_updated_at existeix, mostra:
"Última actualització: fa X dies"
```

### 2. Badges de Warning

**Badge Taronja "Needs update"**:
- Es mostra quan han passat **més de 7 dies** des de l'última actualització
- Indica que la comanda necessita atenció

**Badge Vermell "Stale"**:
- Es mostra quan han passat **més de 14 dies** des de l'última actualització
- Indica que la comanda està "abandonada" i necessita actualització urgent

### 3. Filtre "Només pendents"

Botó al header del widget que permet filtrar:
- **Desactivat**: Mostra totes les comandes amb tracking
- **Activat**: Mostra només comandes amb badge taronja o vermell (>7 dies)

---

## 🔄 Flux de Funcionament

### Actualització Automàtica del Timestamp

1. Usuari edita una Purchase Order i canvia `logistics_status` o `tracking_number`
2. El trigger a la BD detecta el canvi
3. Actualitza automàticament `logistics_updated_at` amb la data/hora actual
4. El widget al Dashboard recalcula els dies des de l'última actualització

### Visualització al Dashboard

1. Widget carrega totes les POs amb `logistics_status`
2. Per cada PO, calcula `daysSinceUpdate` = diferència en dies entre `now()` i `logistics_updated_at`
3. Mostra badge corresponent:
   - >14 dies → Badge vermell "Stale"
   - >7 dies → Badge taronja "Needs update"
   - ≤7 dies → Sense badge (tot correcte)
4. Mostra text "Última actualització: fa X dies"

---

## 🧪 Prova Manual

### Pas 1: Executar SQL

1. Anar al SQL Editor de Supabase
2. Executar `logistics-tracking-update.sql`
3. Verificar que s'ha creat el camp `logistics_updated_at` a `purchase_orders`

### Pas 2: Crear/Actualitzar PO de Test

1. Anar a "Comandes" i crear/editar una Purchase Order
2. Introduir `tracking_number` i `logistics_status`
3. Guardar la PO
4. Verificar a Supabase que `logistics_updated_at` s'ha creat/actualitzat

### Pas 3: Provar al Dashboard

1. Anar al Dashboard
2. Verificar que el widget "Tracking Logístic" mostra les comandes
3. Comprovar que es mostra "Última actualització: fa X dies" per cada comanda

### Pas 4: Provar Badges (Simulació)

Per provar els badges, utilitza el script de test `logistics-test-updates.sql`:

1. Executar `logistics-test-updates.sql` al SQL Editor de Supabase
2. El script buscarà automàticament una PO amb tracking i l'actualitzarà amb 8 dies
3. Refrescar el Dashboard i verificar:
   - Badge taronja "Needs update" visible
   - Text "Última actualització: fa 8 dies"

**Provar badge vermell (>14 dies)** manualment:
```sql
-- Primer obtén l'ID d'una PO (substitueix per un ID real de la teva BD):
SELECT id, po_number FROM purchase_orders 
WHERE user_id = auth.uid() 
  AND logistics_status IS NOT NULL 
LIMIT 1;

-- Després actualitza amb 15 dies (substitueix 'UUID_AQUI' amb l'ID obtingut):
UPDATE purchase_orders 
SET logistics_updated_at = now() - interval '15 days'
WHERE id = 'UUID_AQUI';
```

Alternativament, utilitza el script `logistics-test-updates.sql` que fa tot automàticament.

### Pas 5: Provar Filtre

1. Amb almenys una PO amb badge taronja o vermell visible
2. Clicar al botó "Només pendents" al header del widget
3. Verificar que només es mostren POs amb badges (>7 dies)
4. Clicar novament per desactivar el filtre
5. Verificar que tornen a mostrar-se totes les POs

---

## ✅ Checklist de Verificació

- [ ] SQL executat correctament (sense errors)
- [ ] Camp `logistics_updated_at` existeix a `purchase_orders`
- [ ] Trigger creat correctament
- [ ] Al crear/editar PO, `logistics_updated_at` s'actualitza automàticament
- [ ] Widget mostra "Última actualització: fa X dies"
- [ ] Badge taronja apareix quan >7 dies
- [ ] Badge vermell apareix quan >14 dies
- [ ] Filtre "Només pendents" funciona correctament
- [ ] UI manté la claredat i simplicitat

---

## 📝 Notes Tècniques

- El trigger és **idempotent**: es pot executar múltiples vegades sense errors
- `logistics_updated_at` és opcional (NULL si mai s'ha actualitzat)
- El càlcul de dies es fa al client amb JavaScript natiu
- No s'utilitzen APIs externes de carriers (requisit complert)

---

## 🚨 Troubleshooting

**Problema**: No es mostra "Última actualització"
- **Solució**: Verificar que `logistics_updated_at` no és NULL a la BD

**Problema**: Badges no apareixen
- **Solució**: Verificar que `logistics_updated_at` existeix i la data és correcta

**Problema**: Trigger no s'actualitza
- **Solució**: Verificar que el trigger està creat amb `\df update_logistics_updated_at` i revisar logs de Supabase

---

**Última actualització**: Implementació tracking update timestamp + badges + filtre

