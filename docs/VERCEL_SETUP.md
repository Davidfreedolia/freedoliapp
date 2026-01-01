# Configuració Vercel per Prod/Dev Workflow

## 📋 Canvis Necessaris a Vercel

### 1. Environment Variables

Anar a: **Vercel Dashboard → Project → Settings → Environment Variables**

#### Production Environment Variables
Aquestes variables s'utilitzen quan es deploya el branch `main`:

```
VITE_ENV=prod
VITE_SUPABASE_URL=https://[prod-project].supabase.co
VITE_SUPABASE_ANON_KEY=[prod-anon-key]
```

**Assignar a**: `Production` (només)

#### Preview Environment Variables
Aquestes variables s'utilitzen per tots els Preview Deployments (branches feature/*):

```
VITE_ENV=dev
VITE_SUPABASE_URL=https://[dev-project].supabase.co
VITE_SUPABASE_ANON_KEY=[dev-anon-key]
```

**Assignar a**: `Preview` (només)

### 2. Branch Configuration

Assegurar que:
- **Production Branch**: `main`
- **Preview Deployments**: Activat per tots els branches

### 3. Verificació

Després de configurar:

1. **Deploy a Production**:
   - Fer push a `main`
   - Verificar que la URL de producció utilitza PROD DB
   - Badge DEV no hauria d'aparèixer

2. **Deploy a Preview**:
   - Crear branch `feature/test`
   - Fer push
   - Verificar que el Preview utilitza DEV DB
   - Badge DEV hauria d'aparèixer

---

## 🔍 Com Verificar que Funciona

### Production (main branch)
1. Obrir `freedoliapp.vercel.app`
2. **NO** hauria d'aparèixer badge "DEV"
3. Dades reals de producció

### Preview (feature branch)
1. Obrir URL de Preview (ex: `freedoliapp-abc123.vercel.app`)
2. **SÍ** hauria d'aparèixer badge "DEV" (cantonada inferior esquerra)
3. Dades de DEV (pot ser buit o seed data)

---

## ⚠️ Importante

- **NO** assignar les mateixes variables a Production i Preview
- **NO** utilitzar PROD credentials a Preview
- **SÍ** verificar sempre el badge DEV abans de fer canvis

---

## 📝 Notes

- Les variables d'entorn es carreguen en build time
- Si canvies variables, cal fer redeploy
- El badge DEV es mostra basant-se en `VITE_ENV`

