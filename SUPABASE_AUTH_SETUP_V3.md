# Guia Pas a Pas: Executar supabase-auth-setup-v3.sql

Aquest script SQL és **IDEMPOTENT** (es pot executar múltiples vegades sense errors) i gestiona correctament les dades existents.

## 📋 Prerequisits

- ✅ Projecte Supabase creat
- ✅ Almenys **1 usuari creat** a Supabase Auth (Authentication > Users)
- ✅ Accés al SQL Editor de Supabase

---

## 🚀 Pas 1: Preparar SQL Editor

1. Entra al **Dashboard de Supabase**: https://supabase.com/dashboard
2. Selecciona el teu projecte
3. Vés a **SQL Editor** (menú lateral esquerre)
4. Clica **New Query** (botó verd a la dreta superior)
5. Obre el fitxer `supabase-auth-setup-v3.sql` del projecte
6. **Copia tot el contingut** del fitxer

---

## ⚡ Pas 2: Executar el Script

### Opció A: Executar Tot de Cop (Recomanat)

1. **Enganxa** tot el contingut del SQL a l'editor
2. Clica **Run** (botó verd) o prem `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
3. **Espera** que s'executi (pot trigar uns segons)
4. Verifica que al panell inferior aparegui **"Success"** en verd

### Opció B: Executar per Seccions (Si Vols Més Control)

Si prefereixes executar pas per pas per veure els resultats:

**Secció 1**: Línies 1-131 (Afegir columnes user_id)
- Executa i verifica: "Success"

**Secció 2**: Línies 133-169 (Migració de dades NULL)
- Executa i verifica: Hauria d'aparèixer un missatge "NOTICE: Migració completada..."

**Secció 3**: Línies 171-223 (SET DEFAULT i NOT NULL)
- Executa i verifica: "Success"

**Secció 4**: Línies 225-237 (Índexs)
- Executa i verifica: "Success"

**Secció 5**: Línies 239-251 (Habilitar RLS)
- Executa i verifica: "Success"

**Secció 6**: Línies 253 fins al final (Policies RLS)
- Executa i verifica: "Success"

---

## ✅ Pas 3: Validar que ha Funcionat

### 3.1 Comprovar que No Hi ha NULLs

Executa aquesta query al SQL Editor per verificar que totes les taules tenen user_id:

```sql
-- Comprovar NULLs (hauria de retornar 0 per a totes les taules)
SELECT 
  'projects' as tabla, COUNT(*) as nulls FROM projects WHERE user_id IS NULL
UNION ALL
SELECT 'suppliers', COUNT(*) FROM suppliers WHERE user_id IS NULL
UNION ALL
SELECT 'purchase_orders', COUNT(*) FROM purchase_orders WHERE user_id IS NULL
UNION ALL
SELECT 'documents', COUNT(*) FROM documents WHERE user_id IS NULL
UNION ALL
SELECT 'payments', COUNT(*) FROM payments WHERE user_id IS NULL
UNION ALL
SELECT 'warehouses', COUNT(*) FROM warehouses WHERE user_id IS NULL
UNION ALL
SELECT 'company_settings', COUNT(*) FROM company_settings WHERE user_id IS NULL
UNION ALL
SELECT 'briefings', COUNT(*) FROM briefings WHERE user_id IS NULL
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses WHERE user_id IS NULL
UNION ALL
SELECT 'incomes', COUNT(*) FROM incomes WHERE user_id IS NULL
UNION ALL
SELECT 'signatures', COUNT(*) FROM signatures WHERE user_id IS NULL;
```

**Resultat esperat**: Totes les files haurien de mostrar `0` a la columna `nulls`.

### 3.2 Comprovar que RLS Està Activat

```sql
-- Comprovar que RLS està habilitat
SELECT 
  tablename, 
  rowsecurity as rls_enabled 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'projects', 'suppliers', 'purchase_orders', 'documents', 
    'payments', 'warehouses', 'company_settings', 'briefings',
    'expenses', 'incomes', 'signatures'
  )
ORDER BY tablename;
```

**Resultat esperat**: Totes les files haurien de mostrar `true` a `rls_enabled`.

### 3.3 Comprovar que les Policies Estan Creades

```sql
-- Comprovar policies RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'projects', 'suppliers', 'purchase_orders', 'documents',
    'payments', 'warehouses', 'company_settings', 'briefings',
    'expenses', 'incomes', 'signatures'
  )
ORDER BY tablename, cmd;
```

**Resultat esperat**: Hauries de veure 4 policies per taula (SELECT, INSERT, UPDATE, DELETE). Total: 44 policies.

### 3.4 Comprovar que DEFAULT Funciona

```sql
-- Comprovar que la columna té DEFAULT auth.uid()
SELECT 
  table_name,
  column_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'user_id'
  AND table_name IN (
    'projects', 'suppliers', 'purchase_orders', 'documents',
    'payments', 'warehouses', 'company_settings', 'briefings',
    'expenses', 'incomes', 'signatures'
  )
ORDER BY table_name;
```

**Resultat esperat**: 
- `column_default` hauria de ser `auth.uid()` per totes
- `is_nullable` hauria de ser `NO` per totes

### 3.5 Comprovar la Migració

```sql
-- Veure quants registres s'han assignat al primer usuari
SELECT 
  (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1) as first_user_id,
  (SELECT COUNT(*) FROM projects) as total_projects,
  (SELECT COUNT(*) FROM suppliers) as total_suppliers,
  (SELECT COUNT(*) FROM purchase_orders) as total_pos;
```

**Resultat esperat**: Hauries de veure un `first_user_id` (UUID) i els comptadors de registres.

---

## 🔍 Pas 4: Verificar a la UI

1. Fes login a l'aplicació (http://localhost:5173)
2. Verifica que veus les teves dades (les que s'han migrat al primer usuari)
3. Crea un nou projecte/proveïdor/etc.
4. Verifica que es crea correctament (hauria d'assignar-se automàticament el teu user_id)

---

## ⚠️ Troubleshooting

### Error: "No hi ha usuaris a auth.users"

**Causa**: No has creat cap usuari a Supabase Auth.

**Solució**:
1. Vés a **Authentication** > **Users**
2. Clica **Add user** > **Create new user**
3. Introdueix email i contrasenya
4. Activa **Auto Confirm User**
5. Clica **Create user**
6. Executa el script SQL de nou

### Error: "column already exists"

**Causa**: El script ja s'ha executat abans (normal amb script idempotent).

**Solució**: **Ignora aquest error**. El script utilitza `DO $$ BEGIN IF NOT EXISTS` per evitar errors si la columna ja existeix.

### Error: "permission denied for table"

**Causa**: No tens permisos suficients al projecte Supabase.

**Solució**: Assegura't que ets el propietari del projecte o tens rol d'administrador.

### Després d'executar: Encara veig NULLs

**Causa**: La migració no s'ha executat correctament o hi havia un error.

**Solució**:
1. Executa manualment la secció de migració:
```sql
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  UPDATE projects SET user_id = first_user_id WHERE user_id IS NULL;
  UPDATE suppliers SET user_id = first_user_id WHERE user_id IS NULL;
  -- ... i així per totes les taules
END $$;
```

2. Després executa les comandes ALTER COLUMN ... SET NOT NULL

---

## 📝 Notes Importants

- ✅ **El script és idempotent**: pots executar-lo múltiples vegades sense problemes
- ✅ **No elimina dades**: només assigna user_id a files NULL
- ✅ **Migració segura**: totes les dades existents s'assignen al primer usuari
- ✅ **RLS activat**: cada usuari només veurà les seves dades
- ✅ **DEFAULT auth.uid()**: nous registres s'assignaran automàticament al usuari autenticat

---

## ✅ Checklist Final

Després d'executar el script, verifica:

- [ ] Script executat sense errors
- [ ] Query de NULLs retorna 0 per totes les taules
- [ ] Query de RLS mostra `true` per totes les taules
- [ ] Query de policies mostra 44 policies (4 per taula × 11 taules)
- [ ] Query de DEFAULT mostra `auth.uid()` per totes les columnes
- [ ] Login funciona a l'aplicació
- [ ] Veus les teves dades després del login
- [ ] Crear nous registres funciona correctament

---

**Si tot està correcte, ja tens Auth + RLS completament implementat!** 🎉

