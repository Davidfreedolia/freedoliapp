# 📋 Ordre d'Execució Scripts - Setup DEV

Aquest document explica l'ordre correcte d'execució dels scripts SQL per configurar l'entorn DEV de Supabase.

---

## 🎯 Resum Ràpid

1. **Crear projecte Supabase DEV**
2. **Crear usuari a Auth** (opcional, però recomanat)
3. **Executar `bootstrap_dev.sql`** (script principal)
4. **Executar `seed_dev_data.sql`** (opcional, per tenir dades de prova)

---

## 📝 Pas a Pas Detallat

### Pas 1: Crear Projecte Supabase DEV

1. Anar a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Clicar **"New Project"**
3. Configurar:
   - **Name**: `Freedoliapp DEV` (o el nom que prefereixis)
   - **Database Password**: Guardar-la en un lloc segur
   - **Region**: Escollir la més propera
4. Esperar que el projecte es creï (2-3 minuts)

---

### Pas 2: Crear Usuari a Auth (Recomanat)

**Per què?** El script `bootstrap_dev.sql` necessita almenys un usuari a `auth.users` per assignar `user_id` a les dades.

1. Anar a **Authentication** → **Users**
2. Clicar **"Add user"** → **"Create new user"**
3. Introduir:
   - **Email**: `dev@freedoliapp.local` (o qualsevol email)
   - **Password**: Qualsevol password (no s'utilitzarà per login real)
4. Clicar **"Create user"**

**Nota**: Si no crees un usuari, el script intentarà assignar `user_id` al primer usuari que es registri després.

---

### Pas 3: Executar Bootstrap Script (OBLIGATORI)

Aquest és el script principal que crea tot l'entorn.

1. Anar a **SQL Editor** al Dashboard de Supabase DEV
2. Clicar **"New Query"**
3. Obrir el fitxer: `supabase/migrations/bootstrap_dev.sql`
4. **Copiar tot el contingut** del fitxer
5. Enganxar al SQL Editor
6. Clicar **"Run"** (o `Ctrl+Enter` / `Cmd+Enter`)
7. Esperar que s'executi (pot trigar 30-60 segons)
8. Verificar que aparegui **"Success"** en verd

**Què fa aquest script?**
- ✅ Crea totes les taules base (projects, suppliers, purchase_orders, etc.)
- ✅ Afegeix columnes `user_id` amb RLS
- ✅ Crea índexs per millorar performance
- ✅ Habilita Row Level Security (RLS)
- ✅ Crea policies RLS per totes les taules
- ✅ Crea taules addicionals (gtin_pool, tasks, sticky_notes, etc.)

**Si hi ha errors:**
- Verificar que has creat un usuari a Auth (Pas 2)
- Revisar els missatges d'error al panell inferior
- El script és idempotent: pots executar-lo múltiples vegades sense problemes

---

### Pas 4: Executar Seed Data (OPCIONAL)

Aquest script crea dades de prova per tenir l'app "plena" des del principi.

1. Anar a **SQL Editor**
2. Clicar **"New Query"**
3. Obrir el fitxer: `supabase/migrations/seed_dev_data.sql`
4. **Copiar tot el contingut**
5. Enganxar al SQL Editor
6. Clicar **"Run"**
7. Verificar **"Success"**

**Què crea?**
- 2 projectes de prova
- 1 proveïdor de prova
- 1 Purchase Order de prova
- 1 profitability de prova
- 2 sticky notes de prova
- 2 tasks de prova

**Nota**: Si ja tens dades reals, pots saltar aquest pas.

---

## ✅ Verificació

Després d'executar els scripts, verifica que tot funciona:

### 1. Verificar Taules Creades

Executar aquesta query al SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Hauries de veure totes les taules (projects, suppliers, purchase_orders, gtin_pool, tasks, etc.)

### 2. Verificar RLS Activat

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('projects', 'suppliers', 'purchase_orders')
ORDER BY tablename;
```

Totes les taules haurien de tenir `rowsecurity = true`.

### 3. Verificar Policies

```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'projects';
```

Hauries de veure 4 policies per taula (SELECT, INSERT, UPDATE, DELETE).

### 4. Provar l'App

1. Configurar variables d'entorn a Vercel (veure `docs/VERCEL_ENV_SETUP.md`)
2. Obrir l'app en mode Preview
3. Verificar que:
   - El login funciona
   - El Dashboard carrega
   - Es poden crear projectes nous
   - No hi ha errors a la consola

---

## 🔄 Re-executar Scripts

Els scripts són **idempotents**, això significa que:

- ✅ Es poden executar múltiples vegades sense errors
- ✅ Si una taula ja existeix, no la crea de nou
- ✅ Si una columna ja existeix, no la crea de nou
- ✅ Si una policy ja existeix, la reemplaça

**Quan re-executar?**
- Si hi ha hagut errors i vols intentar-ho de nou
- Si has modificat el script i vols aplicar canvis
- Si vols assegurar-te que tot està configurat correctament

---

## 📚 Scripts Disponibles

### Scripts Principals

| Script | Obligatori | Descripció |
|--------|-----------|------------|
| `bootstrap_dev.sql` | ✅ Sí | Crea tot l'entorn (taules, RLS, policies) |
| `seed_dev_data.sql` | ❌ No | Crea dades de prova opcionals |

### Scripts Addicionals (ja inclosos a bootstrap_dev.sql)

Aquests scripts ja estan integrats a `bootstrap_dev.sql`, no cal executar-los per separat:

- `supabase-auth-setup-v3.sql` → Inclòs a PART 1
- `dashboard-improvements.sql` → Inclòs a PART 2
- `identifiers-setup.sql` → Inclòs a PART 3
- `tasks-setup.sql` → Inclòs a PART 4
- `sticky-notes-setup.sql` → Inclòs a PART 5
- `profitability-calculator-setup.sql` → Inclòs a PART 6
- `supplier-quotes-setup.sql` → Inclòs a PART 7
- `amazon-ready-po-setup.sql` → Inclòs a PART 8
- `po-shipments-setup.sql` → Inclòs a PART 9
- `decision-log-setup.sql` → Inclòs a PART 10
- `supplier-price-estimates-setup.sql` → Inclòs a PART 11
- `recurring-expenses-setup-LIMPIO.sql` → Inclòs a PART 12

---

## 🆘 Troubleshooting

### Error: "column user_id does not exist"

**Causa**: S'ha intentat executar una part del script abans que les taules estiguin creades.

**Solució**: 
1. Assegurar-te d'executar `bootstrap_dev.sql` complet (no per parts)
2. Verificar que la PART 0 (creació de taules) s'ha executat correctament

### Error: "relation does not exist"

**Causa**: Una taula que s'espera que existeixi no existeix.

**Solució**:
1. Executar `bootstrap_dev.sql` complet de nou
2. Verificar que no hi ha errors al panell inferior

### Error: "permission denied"

**Causa**: No tens permisos suficients al projecte.

**Solució**:
1. Assegurar-te que ets el propietari del projecte
2. Verificar que tens rol d'administrador

### Les policies no funcionen

**Causa**: RLS no està activat o les policies no s'han creat correctament.

**Solució**:
1. Verificar RLS amb la query de verificació (veure secció Verificació)
2. Re-executar la secció de policies de `bootstrap_dev.sql`

---

## 📝 Notes Importants

- ⚠️ **Mai executar aquests scripts a PROD**: Només a DEV
- ✅ **Els scripts són idempotents**: Es poden executar múltiples vegades
- 🔒 **RLS està activat**: Cada usuari només veurà les seves dades
- 📊 **Seed data és opcional**: Només si vols dades de prova

---

## 🎯 Checklist Final

Abans de considerar el setup complet:

- [ ] Projecte Supabase DEV creat
- [ ] Usuari creat a Auth (opcional però recomanat)
- [ ] `bootstrap_dev.sql` executat sense errors
- [ ] `seed_dev_data.sql` executat (opcional)
- [ ] Verificació de taules: totes creades
- [ ] Verificació de RLS: totes activades
- [ ] Verificació de policies: totes creades
- [ ] App funciona en Preview amb variables DEV
- [ ] Badge "DEV" visible a l'app

---

**Última actualització**: Gener 2025


