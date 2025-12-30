# Freedoliapp - Management Hub

Aplicació web completa per gestionar tot el cicle de vida dels productes Freedolia a Amazon.

## 🚀 Funcionalitats

- **7 Fases de Projecte**: Recerca → Viabilitat → Proveïdors → Mostres → Producció → Listing → Live
- **Purchase Orders**: Generació automàtica amb PDFs corporatius
- **Proveïdors**: Base de dades amb historial
- **Finances**: Control de despeses i beneficis per projecte
- **Documents**: Sincronització amb Google Drive
- **Mode Dia/Nit** i **Responsive**

## 🛠️ Instal·lació

```bash
npm install
cp .env.example .env
# Configurar credencials a .env
npm run dev
```

## 🚀 Deploy a Vercel

```bash
npx vercel
```

## 📋 Configuració Supabase

1. Crear projecte a supabase.com
2. Executar SQL de `src/lib/supabase.js`
3. Copiar credencials a `.env`

## 📝 Dades Legals

```
Freedolia (marca comercial)
David Castellà Gil
NIF: 52626358N
C/Josep Camprecios, 1, 1º-2ª
08950 Esplugues de Llobregat, Barcelona
```

---
Freedoliapp © David Castellà Gil
