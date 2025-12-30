# Configuració Autenticació Supabase Auth + RLS

## 📋 Pasos per configurar l'autenticació

### 1. Executar el script SQL

1. Obre el **Supabase Dashboard** (https://supabase.com/dashboard)
2. Selecciona el teu projecte
3. Ves a **SQL Editor** (menú lateral)
4. Crea una nova query: clica **New Query**
5. Obre el fitxer `supabase-auth-setup.sql` del projecte
6. Copia tot el contingut i enganxa'l a l'editor SQL
7. Clica **Run** (o prem `Ctrl+Enter`)
8. Verifica que no hi hagi errors (hauria de mostrar "Success")

⚠️ **IMPORTANT**: Si tens dades existents, hauràs de decidir:
- **Opció A**: Eliminar-les i començar de nou (millor per desenvolupament)
- **Opció B**: Assignar-les manualment a un usuari (veure secció al final del SQL)

### 2. Configurar Auth Settings a Supabase

#### 2.1. Habilitar Email Provider

1. Al Dashboard, ves a **Authentication** > **Providers**
2. Assegura't que **Email** estigui habilitat (toggle ON)
3. Configuració opcional:
   - **Confirm email**: Activa't si vols que els usuaris confirmen el correu
   - **Secure email change**: Recomanat activar

#### 2.2. Configurar Site URL i Redirect URLs

1. Ves a **Authentication** > **URL Configuration**

2. **Site URL**: 
   ```
   http://localhost:5173
   ```
   (per desenvolupament local)

3. **Redirect URLs**: Afegeix aquestes URLs (una per línia):
   ```
   http://localhost:5173
   http://localhost:5173/
   http://localhost:5173/login
   ```
   
   Si tens una URL de producció (ex: Vercel), afegeix també:
   ```
   https://tu-app.vercel.app
   https://tu-app.vercel.app/
   https://tu-app.vercel.app/login
   ```

#### 2.3. Configurar Email Templates (Opcional)

1. Ves a **Authentication** > **Email Templates**
2. Pots personalitzar els templates de:
   - Confirm signup
   - Magic Link
   - Change Email Address
   - Reset Password

Per defecte, Supabase envia emails funcionals, però pots personalitzar-los amb HTML.

### 3. Provar l'autenticació en local

#### 3.1. Crear un usuari de prova

**Mètode 1: Per l'aplicació (Recomanat)**

1. Inicia el servidor de desenvolupament:
   ```bash
   npm run dev
   ```

2. Obre http://localhost:5173
3. Hauries de veure la pantalla de Login
4. Clica a **"Enllaç màgic"** o utilitza **email/password**
5. Si utilitzes email/password:
   - Primer cal registrar-se (Supabase crea automàticament l'usuari al primer login)
   - O crea l'usuari manualment al Dashboard (veure Mètode 2)

**Mètode 2: Crear usuari manualment al Dashboard**

1. Ves a **Authentication** > **Users**
2. Clica **Add user** > **Create new user**
3. Introdueix:
   - **Email**: `test@example.com`
   - **Password**: (genera una contrasenya segura o introdueix una)
   - **Auto Confirm User**: Activa aquesta opció per no necessitar confirmació d'email
4. Clica **Create user**

#### 3.2. Provar el login

1. Ves a http://localhost:5173/login
2. **Amb email/password**:
   - Introdueix l'email i contrasenya
   - Clica "Iniciar sessió"
   - Hauries de ser redirigit al Dashboard

3. **Amb magic link**:
   - Toggle a "Enllaç màgic"
   - Introdueix l'email
   - Clica "Enviar enllaç"
   - Revisa el teu correu (o l'emissor de Supabase si estàs en desenvolupament)
   - Clica l'enllaç del correu
   - Hauries de ser redirigit i autenticat

#### 3.3. Provar RLS (Row Level Security)

1. Després de fer login, crea alguns registres (projectes, proveïdors, etc.)
2. Tanca sessió (botó logout al header)
3. Crea un **segon usuari** al Dashboard
4. Fes login amb el segon usuari
5. **Verifica**: Hauries de veure una llista buida (no veuràs els registres del primer usuari)
6. Crea alguns registres nous amb el segon usuari
7. Fes logout i torna a fer login amb el primer usuari
8. **Verifica**: Només veuràs els teus propis registres

### 4. Configurar per Producció (Vercel)

Quan despleguis a Vercel:

1. **Variables d'entorn**: Assegura't que tens configurades:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. **Redirect URLs**: Afegeix la URL de producció al Supabase Dashboard:
   - Authentication > URL Configuration > Redirect URLs
   - Afegeix: `https://tu-app.vercel.app` i variants

3. **Site URL**: Canvia temporalment la Site URL al Dashboard per provar, o deixa-la amb la de producció

### 5. Troubleshooting

#### Problema: "No hi ha usuari autenticat" al crear registres

**Solució**: Assegura't que has fet login correctament. Revisa la consola del navegador per errors.

#### Problema: Magic link no arriba

**Causes possibles**:
- Revisa la carpeta de spam
- Si estàs en desenvolupament, els emails poden tardar uns minuts
- Verifica que l'email estigui correctament escrit

**Solució temporal**: Utilitza email/password o crea l'usuari manualment al Dashboard amb "Auto Confirm User" activat.

#### Problema: Veig dades d'altres usuaris

**Causes possibles**:
- RLS no està habilitat
- Les polítiques no s'han creat correctament
- Els registres existents no tenen `user_id`

**Solució**:
1. Verifica al Dashboard > Authentication > Policies que les polítiques existeixen
2. Executa de nou el script SQL si cal
3. Per dades existents, assegura't que tenen `user_id` assignat

#### Problema: Error 401 (Unauthorized) a totes les peticions

**Causes possibles**:
- RLS està habilitat però no hi ha polítiques
- La sessió ha expirat

**Solució**:
1. Verifica que el script SQL s'ha executat correctament
2. Fes logout i login de nou
3. Revisa les polítiques RLS al Dashboard

### 6. Seguretat addicional (Opcional)

#### Deshabilitar registre públic

Si no vols que es puguin crear comptes des de l'app:

1. Ves a **Authentication** > **Settings**
2. Desactiva **Enable email signup** (només administradors podran crear usuaris)

#### Límit d'intents de login

1. Ves a **Authentication** > **Settings**
2. Configura **Rate Limits** per prevenir bruteforce attacks

---

## ✅ Checklist final

Abans de considerar-ho completat:

- [ ] Script SQL executat sense errors
- [ ] Site URL configurada correctament
- [ ] Redirect URLs configurades (local i producció)
- [ ] Email provider habilitat
- [ ] Usuari de prova creat
- [ ] Login funciona (email/password i magic link)
- [ ] Logout funciona
- [ ] RLS funciona (usuaris només veuen les seves dades)
- [ ] Crear registres funciona (projectes, proveïdors, etc.)
- [ ] Variables d'entorn configurades a Vercel (si aplica)

---

## 📚 Recursos addicionals

- [Documentació Supabase Auth](https://supabase.com/docs/guides/auth)
- [Documentació RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Dashboard](https://supabase.com/dashboard)

