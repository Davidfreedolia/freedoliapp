# 🚀 Deploy a Producció — FREEDOLIAPP

## Ruta oficial (ÚNICA): Git → Vercel

FREEDOLIAPP es desplega automàticament a PRODUCCIÓ mitjançant la integració GitHub → Vercel.

### 🔑 Regla clau
- **Branca de producció:** `master`
- **Acció:** qualsevol `git push` a `master`
- **Resultat:** deploy automàtic a producció a Vercel

⚠️ **PROHIBIT** desplegar producció amb:
- `vercel --prod`
- tokens locals (`VERCEL_TOKEN`)
- Vercel CLI per prod

### 🧠 Per què funciona així
- Evita problemes de tokens
- Evita configuracions locals inconsistents
- Assegura un deploy estable, traçable i auditable

### ⚙️ Configuració actual
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables gestionades exclusivament a Vercel
- Domini de producció: https://freedoliapp.vercel.app/

### 🧪 Preview deploys
- Qualsevol branca diferent de `master` genera un **Preview Deployment** automàtic
- Útil per QA abans de fer merge a producció

### 📋 Checklist abans de fer push a `master`
- [ ] Codi compila en local
- [ ] No hi ha canvis de BD no aplicats
- [ ] Canvis validats funcionalment

### ❓ Notes
Si el deploy no es produeix després d’un push:
- Verifica que has fet push a `master`
- Revisa Vercel → Deployments
- NO intentis arreglar-ho amb CLI
