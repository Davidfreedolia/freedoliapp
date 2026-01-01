# DEMO DATA - Instruccions d'execució

## 📋 Passos per generar dades DEMO

### 1. Executar `demo-seed-setup.sql` (PRIMER)
Aquest script afegeix la columna `is_demo` a les taules necessàries.

**On executar:** Supabase Dashboard > SQL Editor > New Query

**Què fa:**
- Afegeix columna `is_demo` a: projects, suppliers, gtin_pool, sticky_notes, product_identifiers, supplier_quotes, purchase_orders, tasks, po_shipments, po_amazon_readiness

### 2. Executar `demo_mode_setup.sql` (SEGON)
Aquest script afegeix el flag `demo_mode` a `company_settings`.

**On executar:** Supabase Dashboard > SQL Editor > New Query

**Què fa:**
- Afegeix columna `demo_mode` a `company_settings`
- Estableix `demo_mode = true` per defecte

### 3. Executar `demo_seed.sql` (TERCER)
Aquest script genera 10 projectes complets amb dades demo.

**On executar:** Supabase Dashboard > SQL Editor > New Query

**Què fa:**
- Neteja dades demo existents (si n'hi ha)
- Crea 8 suppliers demo
- Crea 10 projectes demo (3 Research, 2 Sourcing, 2 Production, 2 In Transit, 1 Live)
- Crea GTINs, quotes, POs, shipments, tasks, sticky notes, etc.

## ⚠️ IMPORTANT

- **NO executis** `demoSeed.js` al SQL Editor (és codi JavaScript per l'app)
- **SÍ executis** `demo_seed.sql` al SQL Editor (és codi SQL)
- Executa els scripts en l'ordre indicat
- Assegura't d'estar autenticat a Supabase abans d'executar

## 🔄 Alternativa: Usar el botó "Regenerar Dades Demo"

Si prefereixes no executar SQL manualment, pots:
1. Anar a **Settings** > **Dades Demo**
2. Clicar a **"Regenerar Dades Demo"**
3. Això executarà `generateDemoData()` des de l'app (més fàcil!)

## ✅ Verificació

Després d'executar els scripts, verifica:
- Dashboard ple de dades
- 10 projectes visibles
- Widgets actius amb dades
- Cap vista buida


