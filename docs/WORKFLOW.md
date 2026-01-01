# 🔄 Workflow Prod/Dev - Freedoliapp

Aquest document explica com treballar de forma segura amb entorns separats de producció i desenvolupament.

---

## 📋 Resum Ràpid

- **PRODUCCIÓ**: Branch `main` → Supabase PROD → `freedoliapp.vercel.app`
- **DESENVOLUPAMENT**: Branches `feature/*` → Supabase DEV → Preview URLs

---

## 🏗️ Estructura d'Entorns

### Supabase Projects

1. **PROD** (ja existeix)
   - Base de dades de producció amb dades reals
   - URL: `https://[prod-project].supabase.co`
   - **NO TOCAR** excepte per hotfixs urgents

2. **DEV** (nou)
   - Base de dades de desenvolupament
   - URL: `https://[dev-project].supabase.co`
   - Es pot resetar/seed sense problemes

### Variables d'Entorn

#### Local (.env)
```env
VITE_ENV=dev
VITE_SUPABASE_URL=https://[dev-project].supabase.co
VITE_SUPABASE_ANON_KEY=[dev-anon-key]
```

#### Vercel - Production
```env
VITE_ENV=prod
VITE_SUPABASE_URL=https://[prod-project].supabase.co
VITE_SUPABASE_ANON_KEY=[prod-anon-key]
```

#### Vercel - Preview
```env
VITE_ENV=dev
VITE_SUPABASE_URL=https://[dev-project].supabase.co
VITE_SUPABASE_ANON_KEY=[dev-anon-key]
```

---

## 🚀 Workflow Diari

### Treballar a Producció (Normal)

1. **Treballar amb dades reals**:
   - Branch `main` està connectat a PROD
   - Tots els canvis es veuen a `freedoliapp.vercel.app`
   - **CUIDAT**: No fer canvis trencadors sense provar abans

2. **Quan necessites provar alguna cosa**:
   - Crea branch `feature/nom-feature`
   - Aquest branch automàticament utilitza DEV (via Vercel Preview)
   - Prova sense risc

### Desenvolupar una Feature Nova

1. **Crear branch**:
   ```bash
   git checkout -b feature/nova-funcionalitat
   ```

2. **Desenvolupar localment**:
   ```bash
   # .env apunta a DEV
   npm run dev
   ```

3. **Push i Preview automàtic**:
   ```bash
   git push origin feature/nova-funcionalitat
   ```
   - Vercel crea automàticament un Preview
   - El Preview utilitza variables DEV
   - URL: `freedoliapp-[hash].vercel.app`

4. **Provar a Preview**:
   - Obre la URL de Preview
   - Prova la funcionalitat
   - Verifica que tot funciona

5. **Merge a main** (quan estigui llest):
   ```bash
   git checkout main
   git merge feature/nova-funcionalitat
   git push origin main
   ```
   - Això deploya a PRODUCCIÓ
   - Utilitza Supabase PROD
   - **Assegura't que has provat tot a Preview abans!**

---

## 🛡️ Proteccions

### Badge DEV

Quan `VITE_ENV !== 'prod'`, es mostra un badge "DEV" a la cantonada inferior esquerra. Això t'ajuda a saber sempre en quin entorn estàs.

### Seed Data (DEV)

Els entorns DEV poden tenir seed data automàtica per tenir dades de prova. Això NO passa a PROD.

### Safety Checks

- **PROD**: No es pot executar seed data
- **DEV**: Es pot resetar/reseeder sense problemes

---

## 🔧 Setup Inicial

### 1. Crear Projecte Supabase DEV

1. Anar a [supabase.com](https://supabase.com)
2. Crear nou projecte: "Freedoliapp DEV"
3. Copiar URL i ANON KEY

### 2. Executar Bootstrap Script

**Veure guia completa**: `docs/DEV_SETUP_ORDER.md`

**Resum ràpid**:
1. Crear almenys 1 usuari a Auth (Authentication > Users)
2. Anar a SQL Editor del projecte DEV
3. Executar `supabase/migrations/bootstrap_dev.sql` (script complet)
4. (Opcional) Executar `supabase/migrations/seed_dev_data.sql` per dades de prova
5. Verificar que totes les taules s'han creat

### 3. Configurar Vercel

**Veure documentació completa**: `docs/VERCEL_ENV_SETUP.md`

#### Resum Ràpid:

1. Vercel Dashboard → Project → Settings → Environment Variables
2. Afegir variables per **Production**:
   - `VITE_ENV=prod`
   - `VITE_SUPABASE_URL=[prod-url]`
   - `VITE_SUPABASE_ANON_KEY=[prod-key]`
   - `VITE_DEMO_MODE=false`
3. Afegir variables per **Preview**:
   - `VITE_ENV=dev`
   - `VITE_SUPABASE_URL=[dev-url]`
   - `VITE_SUPABASE_ANON_KEY=[dev-key]`
   - `VITE_DEMO_MODE=false`

**Important**: Assignar cada variable al entorn correcte (Production vs Preview)

### 4. Configurar Local

1. Copiar `.env.example` a `.env`
2. Completar amb variables DEV:
   ```env
   VITE_ENV=dev
   VITE_SUPABASE_URL=[dev-url]
   VITE_SUPABASE_ANON_KEY=[dev-key]
   ```

---

## 🐛 Què Fer Si...

### Hi ha un bug a PROD (Hotfix)

1. **Crear branch hotfix**:
   ```bash
   git checkout -b hotfix/nom-bug
   ```

2. **Corregir el bug**:
   - Provar localment amb DEV
   - Verificar que funciona

3. **Merge ràpid a main**:
   ```bash
   git checkout main
   git merge hotfix/nom-bug
   git push origin main
   ```

4. **Verificar a PROD**:
   - Obrir `freedoliapp.vercel.app`
   - Verificar que el bug està corregit

5. **Cleanup**:
   - Eliminar branch hotfix
   - Documentar el que ha passat

### Vols resetar DEV

1. Anar a Supabase DEV Dashboard
2. SQL Editor → Executar:
   ```sql
   -- Eliminar totes les dades (CUIDAT!)
   TRUNCATE projects, suppliers, purchase_orders CASCADE;
   ```
3. Opcional: Executar seed data

### Vols provar una feature a PROD sense deployar

**NO FER AIXÒ**. Utilitza sempre Preview amb DEV.

---

## ✅ Checklist Abans de Merge a Main

- [ ] Feature provada a Preview (DEV)
- [ ] Smoke test 60s passat
- [ ] `npm run build` OK
- [ ] `npm run lint` OK
- [ ] No errors a consola
- [ ] Funcionalitat completa i testada

---

## 📚 Scripts Disponibles

```bash
# Desenvolupament local
npm run dev          # Arrenca servidor local (utilitza .env)

# Build i verificació
npm run build        # Build de producció
npm run lint         # Verificar errors de codi
npm run smoke        # Smoke test (60s)

# Deploy
git push origin main # Deploy automàtic a PROD via Vercel
```

---

## 🔐 Seguretat

### Mai Fer:

- ❌ Canvis directes a PROD sense provar a DEV
- ❌ Executar seed data a PROD
- ❌ Eliminar dades de PROD
- ❌ Compartir credencials de PROD

### Sempre Fer:

- ✅ Provar tot a Preview (DEV) abans de merge
- ✅ Utilitzar branches per features
- ✅ Verificar badge DEV/PROD abans de fer canvis
- ✅ Fer smoke test abans de merge

---

## 📞 Suport

Si tens dubtes sobre el workflow:
1. Revisa aquest document
2. Verifica les variables d'entorn
3. Comprova que el badge DEV/PROD és correcte

---

**Última actualització**: Gener 2025

