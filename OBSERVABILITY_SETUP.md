# Guia d'Observabilitat: Setup i Proves

Aquest document explica com configurar i provar el sistema d'observabilitat implementat.

---

## 📋 Prerequisits

- ✅ Projecte Supabase creat
- ✅ SQL Editor de Supabase accesible
- ✅ Usuari autenticat a l'aplicació

---

## 🗄️ Pas 1: Executar SQL Setup

1. Obre **Supabase Dashboard** > **SQL Editor**
2. Obre el fitxer `observability-setup.sql`
3. Copia tot el contingut
4. Pega al SQL Editor i executa (Run o Ctrl+Enter)
5. Verifica que aparegui **"Success"**

### Verificació SQL

Executa aquesta query per verificar que la taula s'ha creat:

```sql
SELECT 
  table_name, 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_log'
ORDER BY ordinal_position;
```

**Resultat esperat**: Hauries de veure les columnes: `id`, `created_at`, `user_id`, `entity_type`, `entity_id`, `action`, `status`, `message`, `meta`.

### Verificar RLS

```sql
SELECT tablename, rowsecurity as rls_enabled 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'audit_log';
```

**Resultat esperat**: `rls_enabled` hauria de ser `true`.

---

## 🧪 Pas 2: Proves Manuals

### 2.1. Provar Login

1. Fes logout si estàs connectat
2. Fes login amb email/password
3. Executa aquesta query a Supabase:

```sql
SELECT * FROM audit_log 
WHERE action = 'login' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Resultat esperat**: Hauria d'aparèixer un registre amb:
- `entity_type`: `'user'`
- `action`: `'login'`
- `status`: `'success'`
- `user_id`: el teu user_id

### 2.2. Provar Crear Projecte

1. Crea un nou projecte
2. Executa:

```sql
SELECT * FROM audit_log 
WHERE entity_type = 'project' AND action = 'create'
ORDER BY created_at DESC 
LIMIT 5;
```

**Resultat esperat**: Hauria d'aparèixer un registre amb:
- `entity_type`: `'project'`
- `action`: `'create'`
- `status`: `'success'`
- `entity_id`: ID del projecte creat
- `meta`: JSON amb `project_code`, `sku`, `name`

### 2.3. Provar Crear PO

1. Crea una nova Purchase Order
2. Executa:

```sql
SELECT * FROM audit_log 
WHERE entity_type = 'purchase_order' AND action = 'create'
ORDER BY created_at DESC 
LIMIT 5;
```

**Resultat esperat**: Registre amb `entity_type: 'purchase_order'`, `action: 'create'`, `status: 'success'`.

### 2.4. Provar Upload Document

1. Obre un projecte
2. Puja un document a Drive
3. Executa:

```sql
SELECT * FROM audit_log 
WHERE entity_type = 'document' AND action = 'upload'
ORDER BY created_at DESC 
LIMIT 5;
```

**Resultat esperat**: Registre amb informació del fitxer pujat.

### 2.5. Provar Error (Opcional)

Per provar que els errors també es loguegen:

1. Intenta crear un projecte sense omplir camps obligatoris (o simula un error)
2. Executa:

```sql
SELECT * FROM audit_log 
WHERE status = 'error'
ORDER BY created_at DESC 
LIMIT 10;
```

**Resultat esperat**: Registres amb `status: 'error'` i `message` amb descripció de l'error.

### 2.6. Provar Logout

1. Fes logout
2. Executa:

```sql
SELECT * FROM audit_log 
WHERE action = 'logout'
ORDER BY created_at DESC 
LIMIT 5;
```

**Resultat esperat**: Registre amb `action: 'logout'`, `status: 'success'`.

---

## ✅ Checklist de Validació

Després de fer totes les proves:

### Base de Dades
- [ ] Taula `audit_log` creada correctament
- [ ] RLS activat
- [ ] Índexs creats
- [ ] Policies RLS funcionant (només veus els teus logs)

### Events Loguejats
- [ ] Login es logueja correctament
- [ ] Logout es logueja correctament
- [ ] Crear projecte es logueja correctament
- [ ] Crear PO es logueja correctament
- [ ] Upload document es logueja correctament
- [ ] Errors es loguejen correctament (status = 'error')

### Seguretat
- [ ] Només veus els teus propis logs (RLS)
- [ ] `user_id` s'assigna automàticament
- [ ] No pots modificar o eliminar logs (només INSERT i SELECT)

---

## 📊 Queries Útils

### Veure últims 50 events

```sql
SELECT 
  created_at,
  entity_type,
  action,
  status,
  message,
  meta
FROM audit_log
ORDER BY created_at DESC
LIMIT 50;
```

### Veure només errors

```sql
SELECT 
  created_at,
  entity_type,
  action,
  message,
  meta
FROM audit_log
WHERE status = 'error'
ORDER BY created_at DESC
LIMIT 50;
```

### Estadístiques per tipus d'entitat

```sql
SELECT 
  entity_type,
  action,
  status,
  COUNT(*) as count
FROM audit_log
GROUP BY entity_type, action, status
ORDER BY entity_type, action, status;
```

### Events avui

```sql
SELECT * FROM audit_log
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

---

## 🐛 Troubleshooting

### Error: "relation audit_log does not exist"

**Causa**: No s'ha executat el SQL setup.

**Solució**: Executa `observability-setup.sql` al SQL Editor de Supabase.

### Error: "permission denied for table audit_log"

**Causa**: RLS està activat però les policies no estan creades.

**Solució**: Verifica que s'han creat les policies (revisa el SQL setup).

### No apareixen logs després d'una acció

**Causa**: Pot ser que l'audit log falli silenciosament (per design, no trenca l'app).

**Solució**: 
1. Obre la consola del navegador (F12)
2. Busca errors que comencin amb `[AuditLog]`
3. Verifica que l'usuari estigui autenticat
4. Verifica que la taula `audit_log` existeix i RLS està configurat correctament

### Veus logs d'altres usuaris

**Causa**: RLS no està funcionant correctament.

**Solució**: Verifica les policies RLS i assegura't que tenen `USING (auth.uid() = user_id)`.

---

## 📝 Notes Importants

- **Audit log NO trenca mai l'app**: Si falla, només es logueja a la consola, però l'acció continua
- **RLS protegeix els logs**: Cada usuari només veu els seus propis logs
- **Logs no es poden modificar**: Només INSERT i SELECT estan permesos (per integritat)
- **Meta és JSON**: Pots afegir qualsevol informació addicional al camp `meta`

---

## ✅ Conclusió

Si totes les proves passen, el sistema d'observabilitat està funcionant correctament i pots:

1. ✅ Veure tots els events crítics
2. ✅ Auditar accions dels usuaris
3. ✅ Diagnosticar errors fàcilment
4. ✅ Tenir traçabilitat completa de les operacions

**El sistema està llest per producció!** 🎉













