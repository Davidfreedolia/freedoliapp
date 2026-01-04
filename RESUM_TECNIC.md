# Resum Tècnic - Freedoliapp

## 🛠️ Stack Tecnològic

- **Frontend**: React 18 + Vite 5
- **Router**: React Router DOM v6
- **Backend/BD**: Supabase (PostgreSQL + Auth + Storage)
- **Autenticació**: Supabase Auth (Email/Password + Magic Link)
- **Integració**: Google Drive API v3 (OAuth2)
- **PDFs**: jsPDF + jspdf-autotable
- **UI**: Lucide React (icons) + CSS-in-JS inline
- **Deploy**: Vercel
- **Llenguatge**: JavaScript (ES6+)

---

## 🏗️ Arquitectura

### Estructura de Carpetes
```
src/
├── components/        # Components reutilitzables (modals, widgets, etc.)
├── pages/            # Pàgines principals (Dashboard, Projects, Orders...)
├── lib/              # Lògica de negoci (supabase, googleDrive, auditLog...)
└── context/          # React Context (AppContext per estat global)
```

### Base de Dades (Supabase PostgreSQL)

**Taules Principals:**
- `projects` - Projectes amb 7 fases (Recerca → Live)
- `purchase_orders` - Comandes amb tracking logístic
- `suppliers` - Proveïdors
- `documents` - Referències a fitxers de Google Drive
- `expenses` / `incomes` - Finances per projecte
- `dashboard_preferences` - Configuració de widgets per usuari
- `audit_log` - Registre d'esdeveniments (opcional)

**Seguretat:**
- ✅ **RLS (Row Level Security)** activat a totes les taules
- ✅ Policies: cada usuari només veu/modifica les seves dades
- ✅ `user_id` assignat automàticament amb `auth.uid()`

---

## 🔐 Autenticació i Seguretat

- **Supabase Auth**: Email/Password + Magic Link
- **Protected Routes**: Totes les rutes (excepte `/login`) requereixen autenticació
- **RLS Policies**: SELECT/INSERT/UPDATE/DELETE amb `user_id = auth.uid()`
- **Client-side**: Eliminació de `user_id` del payload per seguretat

---

## 📦 Funcionalitats Principals

### 1. Gestió de Projectes
- 7 fases amb timelina visual
- Codi automàtic (PR-FRDL250001)
- Redirecció al Dashboard després de crear/editar

### 2. Dashboard Personalitzable
- Widgets configurables per usuari:
  - `logistics_tracking` - Tracking de comandes per projecte
  - `finance_chart` - Gràfiques de finances
  - `orders_in_progress` - Llista de comandes actives
  - `activity_feed` - Activitat recent (opcional)
- Preferències guardades a `dashboard_preferences` (JSONB)

### 3. Tracking Logístic
- Camps a `purchase_orders`: `tracking_number`, `logistics_status`
- Flux estàndard: `production` → `pickup` → `in_transit` → `customs` → `amazon_fba` → `delivered`
- Widget al Dashboard amb barra de progrés visual

### 4. Purchase Orders (POs)
- Generació automàtica de números (PO-FRDL250001-001)
- PDFs corporatius amb jsPDF
- Tracking logístic integrat
- Formulari complet amb múltiples camps (incoterms, dates, adreces...)

### 5. Integració Google Drive
- OAuth2 per autenticació
- Creació idempotent de carpetes per projecte
- Upload de documents amb detecció de duplicats
- Gestió robusta de tokens (refresh automàtic, detecció d'expiració)

### 6. Finances
- Despeses i ingressos per projecte
- Categorització
- Visualització amb gràfiques

### 7. Observabilitat (Opcional)
- Audit log per esdeveniments crítics
- Error handling centralitzat
- Logging estructurat

---

## 🔄 Fluxos Principals

### Crear Projecte
1. Usuari crea projecte → `createProject()` (user_id auto-assignat)
2. Es generen carpetes a Drive (si connectat) → `ensureProjectDriveFolders()`
3. Redirecció al Dashboard

### Crear PO amb Tracking
1. Usuari omple formulari PO (inclou tracking_number i logistics_status)
2. Es guarda a `purchase_orders`
3. Widget de tracking al Dashboard mostra estat actual

### Upload Document a Drive
1. Selecció de fitxers → Upload a Google Drive
2. Validació de duplicats per `drive_file_id` o `name + project_id`
3. Guardar referència a `documents` (Supabase)
4. Audit log de l'acció

---

## 📊 Estat Actual

### Desplegat a Producció
- **URL**: https://freedoliapp.vercel.app
- **Build**: Vite (producció optimitzat)
- **Variables d'entorn**: Vercel Dashboard (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

### SQL Scripts Necessaris
1. `supabase-auth-setup-v3.sql` - Auth + RLS (obligatori)
2. `dashboard-improvements.sql` - Tracking + widgets (obligatori)
3. `observability-setup.sql` - Audit log (opcional)
4. `dashboard-test-data.sql` - Dades de test (opcional)

### Configuració Supabase
- Auth activat (Email provider)
- Redirect URLs configurades (localhost + producció)
- RLS policies activades a totes les taules

---

## 🎯 Decisions Tècniques Clau

1. **No user_id al client**: Eliminació al client per seguretat (s'assigna a BD)
2. **Idempotència**: Funcions Drive i SQL scripts idempotents
3. **Error Handling**: Try/catch + audit log + notificacions usuari
4. **RLS First**: Seguretat a nivell de base de dades, no només frontend
5. **CSS-in-JS**: Estils inline per evitar dependències externes
6. **Componentització**: Components petits i reutilitzables

---

## 📝 Notes Importants

- **Versió**: 2.0.0
- **Node**: Compatible amb Node 18+
- **Browser**: Modern browsers (ES6+)
- **Responsive**: Desktop-first, compatible amb tablets
- **Dark Mode**: Suportat globalment
- **Idioma**: Català (hardcoded, sense i18n)

---

**Última actualització**: Desplegament Dashboard improvements + tracking logístic












