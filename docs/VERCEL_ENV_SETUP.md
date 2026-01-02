# 🔧 Configuració Variables d'Entorn a Vercel

Aquest document explica com configurar les variables d'entorn a Vercel per separar PROD i DEV.

---

## 📋 Resum

- **Production**: Utilitza Supabase PROD
- **Preview**: Utilitza Supabase DEV
- **Development**: Utilitza Supabase DEV (local)

---

## 🚀 Pas 1: Accedir a Vercel Dashboard

1. Anar a [vercel.com](https://vercel.com)
2. Iniciar sessió
3. Seleccionar projecte **Freedoliapp**

---

## ⚙️ Pas 2: Configurar Environment Variables

### 2.1 Accedir a Settings

1. Vés a **Settings** (menú lateral)
2. Clica **Environment Variables** (secció esquerra)

### 2.2 Configurar Production Variables

Per **Production** (branch `main`):

1. Clicar **Add New**
2. Afegir cada variable:

```
Key: VITE_ENV
Value: prod
Environment: Production
```

```
Key: VITE_SUPABASE_URL
Value: https://[prod-project-id].supabase.co
Environment: Production
```

```
Key: VITE_SUPABASE_ANON_KEY
Value: [prod-anon-key]
Environment: Production
```

```
Key: VITE_DEMO_MODE
Value: false
Environment: Production
```

### 2.3 Configurar Preview Variables

Per **Preview** (branches `feature/*`):

1. Clicar **Add New**
2. Afegir cada variable:

```
Key: VITE_ENV
Value: dev
Environment: Preview
```

```
Key: VITE_SUPABASE_URL
Value: https://[dev-project-id].supabase.co
Environment: Preview
```

```
Key: VITE_SUPABASE_ANON_KEY
Value: [dev-anon-key]
Environment: Preview
```

```
Key: VITE_DEMO_MODE
Value: false
Environment: Preview
```

**Nota**: Opcionalment, pots activar `VITE_DEMO_MODE=true` a Preview per tenir dades fictícies.

---

## ✅ Pas 3: Verificar Configuració

Després de configurar:

1. **Production Deploy**:
   - Fer push a `main`
   - Verificar que el deploy utilitza variables PROD
   - Comprovar badge: **NO hauria d'aparèixer badge "DEV"**

2. **Preview Deploy**:
   - Crear branch `feature/test`
   - Fer push
   - Verificar que el Preview utilitza variables DEV
   - Comprovar badge: **Hauria d'aparèixer badge "DEV"**

---

## 🔍 Com Verificar Quines Variables S'Estan Utilitzant

### Opció 1: Badge Visual

- Si veus badge **"DEV"** a la cantonada inferior esquerra → estàs a DEV
- Si **NO** veus badge → estàs a PROD

### Opció 2: Console del Navegador

Obrir DevTools (F12) i executar:

```javascript
console.log('Environment:', import.meta.env.VITE_ENV)
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
```

---

## 🛡️ Proteccions

### Mai Fer:

- ❌ Configurar variables PROD a Preview
- ❌ Configurar variables DEV a Production
- ❌ Compartir credencials de PROD

### Sempre Fer:

- ✅ Verificar badge DEV/PROD abans de fer canvis
- ✅ Provar tot a Preview abans de merge a main
- ✅ Mantenir credencials segures

---

## 📝 Exemple de Configuració Completa

### Production Environment Variables

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_ENV` | `prod` | Production |
| `VITE_SUPABASE_URL` | `https://abc123.supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | Production |
| `VITE_DEMO_MODE` | `false` | Production |

### Preview Environment Variables

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_ENV` | `dev` | Preview |
| `VITE_SUPABASE_URL` | `https://xyz789.supabase.co` | Preview |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | Preview |
| `VITE_DEMO_MODE` | `false` | Preview |

---

## 🔄 Actualitzar Variables

Si necessites canviar una variable:

1. Vés a **Settings** → **Environment Variables**
2. Troba la variable
3. Clicar **Edit**
4. Canviar el valor
5. **Important**: Vercel requereix un nou deploy per aplicar canvis

---

## 🆘 Troubleshooting

### El badge "DEV" no apareix a Preview

- Verificar que `VITE_ENV=dev` està configurat a Preview
- Fer un nou deploy del Preview
- Netejar cache del navegador

### El badge "DEV" apareix a Production

- **PROBLEMA CRÍTIC**: Les variables estan mal configurades
- Verificar que Production té `VITE_ENV=prod`
- Fer un nou deploy immediatament

### Errors de connexió a Supabase

- Verificar que les URLs i keys són correctes
- Comprovar que el projecte Supabase està actiu
- Verificar que les variables estan assignades al entorn correcte

---

**Última actualització**: Gener 2025



