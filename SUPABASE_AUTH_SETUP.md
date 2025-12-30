# Pas a Pas: Configuració Autenticació Supabase Auth + RLS

Aquest document explica com configurar l'autenticació Supabase Auth amb Row Level Security (RLS) al projecte Freedoliapp.

## 📋 Prerequisits

- Projecte Supabase creat a [supabase.com](https://supabase.com)
- Credencials de Supabase (URL i anon key) disponibles
- Accés al SQL Editor de Supabase

---

## 🔧 Pas 1: Activar Auth a Supabase

1. Entra al Dashboard del teu projecte Supabase
2. Vés a **Authentication** > **Providers** (menú lateral)
3. Activa **Email** provider:
   - Toggle **"Enable Email provider"** a ON
   - Configuració recomanada:
     - ✅ Confirm email: **OFF** (per desenvolupament, activa'l en producció)
     - ✅ Secure email change: **ON**
4. **Guarda** els canvis

---

## 🔗 Pas 2: Configurar Redirect URLs

### 2.1 Local (Desenvolupament)

1. Vés a **Authentication** > **URL Configuration**
2. A **Site URL**, posa: `http://localhost:5173` (o el port que facis servir)
3. A **Redirect URLs**, afegeix:
   - `http://localhost:5173`
   - `http://localhost:5173/`

### 2.2 Producció (Vercel)

1. Després de fer deploy a Vercel, obtén la URL del teu projecte (ex: `https://freedoliapp.vercel.app`)
2. Vés a **Authentication** > **URL Configuration**
3. A **Redirect URLs**, afegeix:
   - `https://tu-app.vercel.app`
   - `https://tu-app.vercel.app/`
4. (Opcional) Actualitza **Site URL** amb la URL de producció

---

## 💾 Pas 3: Executar SQL Script

1. Vés a **SQL Editor** al Dashboard de Supabase
2. Clica **New Query**
3. Obre el fitxer `supabase-auth-setup.sql` del projecte
4. Copia tot el contingut i enganxa'l al SQL Editor
5. **IMPORTANT**: Si tens dades existents sense `user_id`:
   - Descomenta les línies UPDATE de la secció 2
   - Ajusta l'email o la lògica segons les teves necessitats
   - Executa-les **abans** de les comandes ALTER COLUMN ... SET NOT NULL
6. Clica **Run** (o `Ctrl+Enter` / `Cmd+Enter`)
7. Verifica que no hi hagi errors (haurien d'aparèixer missatges de confirmació)

### ⚠️ Nota sobre Dades Existents

Si ja tens dades a la base de dades:

**Opció A: Assignar a un usuari específic**
```sql
-- Descomenta i executa aquestes línies abans del SET NOT NULL
UPDATE projects SET user_id = (SELECT id FROM auth.users WHERE email = 'tu-email@example.com' LIMIT 1) WHERE user_id IS NULL;
-- (i així per totes les taules)
```

**Opció B: Eliminar dades de prova**
```sql
DELETE FROM projects WHERE user_id IS NULL;
-- (i així per totes les taules)
```

---

## 🧪 Pas 4: Provar-ho Local

### 4.1 Configurar Variables d'Entorn

Assegura't que el fitxer `.env` (o `.env.local`) conté:

```env
VITE_SUPABASE_URL=https://tu-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4.2 Crear Primer Usuari

1. Inicia el servidor de desenvolupament:
   ```bash
   npm run dev
   ```

2. Obre el navegador a `http://localhost:5173`

3. Hauries de ser redirigit a `/login`

4. Crea un compte:
   - **Opció 1 (Email/Password)**: Introdueix email i contrasenya, clica "Iniciar sessió"
   - **Opció 2 (Magic Link)**: Introdueix email, clica "Enviar enllaç", revisa el correu i clica l'enllaç

5. Després del login, hauries de veure el Dashboard

### 4.3 Verificar que Funciona

1. **Comprovar que veus les teves dades**:
   - Crea un projecte nou des del Dashboard
   - Verifica que apareix a la llista

2. **Comprovar RLS**:
   - Tanca sessió (botó logout)
   - Crea un segon compte amb un email diferent
   - Verifica que NO veus les dades del primer usuari

3. **Comprovar que sense login no veus res**:
   - Tanca sessió
   - Intenta accedir directament a `http://localhost:5173/projects`
   - Hauries de ser redirigit a `/login`

---

## ✅ Verificació Final

### Funcionalitats que han de funcionar:

- ✅ Login amb email/password
- ✅ Login amb magic link
- ✅ Redirecció a `/login` si no hi ha sessió
- ✅ Cada usuari només veu les seves dades
- ✅ Crear projectes, proveïdors, comandes, etc. (s'assignen automàticament al usuari autenticat)
- ✅ Logout funciona correctament

### Si alguna cosa no funciona:

1. **"No hi ha usuari autenticat"**:
   - Verifica que les variables d'entorn estan correctes
   - Verifica que Auth està activat a Supabase

2. **"Permission denied" o errors de RLS**:
   - Verifica que has executat tot el SQL script
   - Verifica que les policies RLS estan creades (Authentication > Policies)

3. **Redirect URLs no funcionen**:
   - Verifica que les URLs són exactes (inclouen el port per local)
   - Verifica que no hi ha espais ni caràcters estranys

---

## 🚀 Desplegament a Producció

Després de fer deploy a Vercel:

1. Afegeix les variables d'entorn a Vercel:
   - Vercel Dashboard > Project > Settings > Environment Variables
   - Afegeix `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`

2. Actualitza Redirect URLs a Supabase amb la URL de producció

3. Fes un redeploy del projecte

4. Prova el login amb la URL de producció

---

## 📚 Referències

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Redirect URLs Guide](https://supabase.com/docs/guides/auth/redirect-urls)

---

**Nota**: Aquest setup utilitza `DEFAULT auth.uid()` a la base de dades, així que el `user_id` s'assigna automàticament. El codi de l'aplicació elimina qualsevol `user_id` que pugui venir del client per seguretat.
