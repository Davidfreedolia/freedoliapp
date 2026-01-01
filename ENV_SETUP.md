# Configuració Variables d'Entorn

## Crear .env.local

Crea un fitxer `.env.local` (no es commiteja) amb:

```env
# Entorn (dev | prod)
VITE_ENV=dev

# Supabase Configuration
# PROD: Variables del projecte Supabase de producció
# DEV: Variables del projecte Supabase de desenvolupament
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Demo Mode (opcional)
# VITE_DEMO_MODE=true
```

## Configuració Vercel

### Production Environment Variables
```
VITE_ENV=prod
VITE_SUPABASE_URL=[prod-url]
VITE_SUPABASE_ANON_KEY=[prod-key]
```

### Preview Environment Variables
```
VITE_ENV=dev
VITE_SUPABASE_URL=[dev-url]
VITE_SUPABASE_ANON_KEY=[dev-key]
```

**On configurar**:
- Vercel Dashboard → Project → Settings → Environment Variables
- Assignar:
  - **Production** → `VITE_ENV=prod`, `VITE_SUPABASE_URL` (PROD), `VITE_SUPABASE_ANON_KEY` (PROD)
  - **Preview** → `VITE_ENV=dev`, `VITE_SUPABASE_URL` (DEV), `VITE_SUPABASE_ANON_KEY` (DEV)

