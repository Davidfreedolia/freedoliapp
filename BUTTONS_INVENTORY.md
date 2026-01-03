# 📋 Inventari de Botons - Freedolia App

Aquest document llista tots els botons de la interfície organitzats per pàgina/component.

---

## 🏠 Dashboard (`src/pages/Dashboard.jsx`)

### Header Actions
1. **Nou Projecte** 
   - Text: "Nou Projecte"
   - Icona: Plus + FolderKanban
   - Acció: `setShowNewProjectModal(true)`
   - Color: #4f46e5

2. **Nou Proveïdor**
   - Text: "Nou Proveïdor"
   - Icona: Plus + Users
   - Acció: `navigate('/suppliers')`
   - Color: #22c55e

3. **Nou Transitari**
   - Text: "Nou Transitari"
   - Icona: Plus + Truck
   - Acció: `navigate('/forwarders')`
   - Color: #f59e0b

4. **Nou Magatzem**
   - Text: "Nou Magatzem"
   - Icona: Plus + Warehouse
   - Acció: `navigate('/warehouses')`
   - Color: #3b82f6

### Header Right Actions
5. **Personalitzar Dashboard**
   - Icona: Settings
   - Acció: `setShowCustomizeModal(true)`
   - Tipus: Icon button

6. **Notificacions**
   - Icona: Bell
   - Acció: (pendent)
   - Tipus: Icon button

7. **Toggle Dark Mode**
   - Icona: Sun/Moon (alterna)
   - Acció: `setDarkMode(!darkMode)`
   - Tipus: Icon button

### Widget Actions
8. **Veure totes** (Comandes en curs)
   - Text: "Veure totes" + ArrowRight
   - Acció: `navigate('/orders')`
   - Estil: Link button

9. **Veure totes** (POs no llestes)
   - Text: "Veure totes" + ArrowRight
   - Acció: `navigate('/orders')`
   - Estil: Link button

---

## 📁 Projects (`src/pages/Projects.jsx`)

1. **Nou Projecte**
   - Text: "Nou Projecte"
   - Icona: Plus
   - Acció: Obre modal `NewProjectModal`
   - Color: Primary

2. **Veure Detall** (per projecte)
   - Icona: Eye
   - Acció: `navigate(\`/projects/${project.id}\`)`

3. **Editar** (per projecte)
   - Icona: Edit
   - Acció: Editar projecte

---

## 📄 Project Detail (`src/pages/ProjectDetail.jsx`)

### Accions del Projecte
1. **Briefing del Producte**
   - Text: "Briefing del Producte"
   - Icona: ClipboardList
   - Acció: `navigate(\`/projects/${id}/briefing\`)`
   - Condició: `project.current_phase >= 3`
   - Color: #8b5cf6

2. **Crear Comanda (PO)**
   - Text: "Crear Comanda (PO)"
   - Icona: ShoppingCart
   - Acció: `navigate(\`/orders?project=${id}\`)`
   - Condició: `project.current_phase >= 3`
   - Color: #4f46e5

3. **Gestionar Stock**
   - Text: "Gestionar Stock"
   - Icona: Package
   - Acció: `navigate(\`/inventory?project=${id}\`)`
   - Condició: `project.current_phase === 7`
   - Color: #22c55e

---

## 🛒 Orders (`src/pages/Orders.jsx`)

### Header
1. **Nova Comanda**
   - Text: "Nova Comanda"
   - Icona: Plus
   - Acció: `setShowNewPOModal(true)`

2. **Filtrar per Projecte**
   - Dropdown/Select
   - Acció: Filtra comandes

3. **Filtrar per Estat**
   - Dropdown/Select
   - Acció: Filtra comandes

### Per cada PO (llistat)
4. **Veure detall**
   - Icona: Eye
   - Acció: `handleViewOrder(order)`

5. **Descarregar PDF**
   - Icona: FileText / Loader
   - Acció: `handleDownloadPdf(order)`

6. **Menu Actions** (3 dots)
   - Icona: MoreVertical
   - Acció: Obre menú contextual
   - Opcions:
     - Editar
     - Duplicar
     - Cancel·lar

### Modal Detall PO
7. **Generar Etiquetes FNSKU**
   - Text: "Generar Etiquetes FNSKU"
   - Acció: `setShowLabelsModal(true)`
   - Color: #4f46e5

8. **Tancar Modal**
   - Icona: X
   - Acció: `setShowDetailModal(false)`

### Modal Generar Etiquetes
9. **Generar PDF**
   - Text: "Generar PDF"
   - Acció: `handleGenerateLabels()`

10. **Cancel·lar**
    - Text: "Cancel·lar"
    - Acció: `setShowLabelsModal(false)`

---

## 🔐 Login (`src/pages/Login.jsx`)

1. **Iniciar Sessió**
   - Text: "Iniciar Sessió"
   - Acció: `handleLogin()`
   - Tipus: Submit button

---

## 💰 Finances (`src/pages/Finances.jsx`)

1. **Nova Despesa**
   - Text: "Nova Despesa"
   - Icona: Plus
   - Acció: Obre modal nova despesa

2. **Nou Ingrés**
   - Text: "Nou Ingrés"
   - Icona: Plus
   - Acció: Obre modal nou ingrés

3. **Editar** (per despesa/ingrés)
   - Icona: Edit
   - Acció: Editar registre

4. **Eliminar** (per despesa/ingrés)
   - Icona: Trash
   - Acció: Eliminar registre

---

## 📦 Inventory (`src/pages/Inventory.jsx`)

1. **Nou Moviment**
   - Text: "Nou Moviment"
   - Icona: Plus
   - Acció: Obre modal nou moviment

2. **Editar** (per moviment)
   - Icona: Edit
   - Acció: Editar moviment

3. **Eliminar** (per moviment)
   - Icona: Trash
   - Acció: Eliminar moviment

---

## 🏢 Suppliers (`src/pages/Suppliers.jsx`)

1. **Nou Proveïdor**
   - Text: "Nou Proveïdor"
   - Icona: Plus
   - Acció: Obre modal nou proveïdor

2. **Editar** (per proveïdor)
   - Icona: Edit
   - Acció: Editar proveïdor

3. **Eliminar** (per proveïdor)
   - Icona: Trash
   - Acció: Eliminar proveïdor

---

## 🚚 Forwarders (`src/pages/Forwarders.jsx`)

1. **Nou Transitari**
   - Text: "Nou Transitari"
   - Icona: Plus
   - Acció: Obre modal nou transitari

2. **Editar** (per transitari)
   - Icona: Edit
   - Acció: Editar transitari

3. **Eliminar** (per transitari)
   - Icona: Trash
   - Acció: Eliminar transitari

---

## 🏭 Warehouses (`src/pages/Warehouses.jsx`)

1. **Nou Magatzem**
   - Text: "Nou Magatzem"
   - Icona: Plus
   - Acció: Obre modal nou magatzem

2. **Editar** (per magatzem)
   - Icona: Edit
   - Acció: Editar magatzem

3. **Eliminar** (per magatzem)
   - Icona: Trash
   - Acció: Eliminar magatzem

---

## 📊 Analytics (`src/pages/Analytics.jsx`)

1. **Filtre per Rango de Dates**
   - Select/Dropdown
   - Acció: Filtra dades

2. **Filtre per Projecte**
   - Select/Dropdown
   - Acció: Filtra dades

---

## ⚙️ Settings (`src/pages/Settings.jsx`)

1. **Guardar Configuració**
   - Text: "Guardar"
   - Acció: Guarda configuració

2. **Restaurar per defecte**
   - Text: "Restaurar"
   - Acció: Restaura valors per defecte

---

## 📝 Briefing (`src/pages/Briefing.jsx`)

1. **Guardar Briefing**
   - Text: "Guardar Briefing"
   - Acció: Guarda formulari briefing

2. **Cancel·lar**
   - Text: "Cancel·lar"
   - Acció: Tanca formulari

---

## 🧩 Components

### Header (`src/components/Header.jsx`)

1. **Toggle Sidebar**
   - Icona: Menu / X
   - Acció: `setSidebarCollapsed()`

2. **Navegació a pàgines**
   - Múltiples botons de navegació

### Sidebar (`src/components/Sidebar.jsx`)

1. **Items de navegació**
   - Dashboard
   - Projects
   - Orders
   - Finances
   - Inventory
   - Analytics
   - Settings

### NewProjectModal (`src/components/NewProjectModal.jsx`)

1. **Cancel·lar**
   - Text: "Cancel·lar"
   - Acció: `handleClose()`
   - Color: Secondary

2. **Crear Projecte**
   - Text: "Crear Projecte" / "Creant..." / "Creant carpetes..."
   - Acció: `handleSubmit()`
   - Estat: Loading state amb Loader icon
   - Color: Primary
   - Disabled: Si `loading || generatingCode || !projectCodes.projectCode`

### NewPOModal (`src/components/NewPOModal.jsx`)

1. **Cancel·lar**
   - Text: "Cancel·lar"
   - Acció: Tanca modal

2. **Crear Comanda**
   - Text: "Crear Comanda"
   - Acció: Crea PO
   - Estat: Loading state

### DriveStatus (`src/components/DriveStatus.jsx`)

1. **Connectar / Reconnectar**
   - Text: "Connectar" / "Reconnectar" / "Connectant..."
   - Icona: LogIn
   - Acció: `handleConnect()`
   - Estat: Loading state
   - Color: #4f46e5

2. **Desconnectar**
   - Icona: LogOut
   - Acció: `handleDisconnect()`
   - Tipus: Icon button

3. **Reintentar** (si init failed)
   - Text: "Reintentar"
   - Icona: RefreshCw
   - Acció: `handleRetry()`
   - Color: #f59e0b

### IdentifiersSection (`src/components/IdentifiersSection.jsx`)

1. **Assignar del pool**
   - Text: "Assignar del pool (X)"
   - Acció: Obre modal d'assignació

2. **Guardar Identificadors**
   - Text: "Guardar"
   - Acció: `handleSave()`

3. **Cancel·lar** (modal pool)
   - Text: "Cancel·lar"
   - Acció: Tanca modal

4. **Assignar** (GTIN del pool)
   - Text: "Assignar"
   - Acció: Assigna GTIN al projecte

### AmazonReadySection (`src/components/AmazonReadySection.jsx`)

1. **Guardar**
   - Text: "Guardar"
   - Acció: `onUpdate(data)`
   - Color: Primary

2. **Toggle mostrar/ocultar**
   - Text: "Mostrar" / "Ocultar"
   - Acció: `setShowAmazonReadySection()`

### LogisticsTrackingWidget (`src/components/LogisticsTrackingWidget.jsx`)

1. **Actualitzar Estat**
   - Icona: RefreshCw
   - Acció: Actualitza estat logístic

2. **Veure Detall**
   - Text: "Veure detall"
   - Acció: Obre modal detall

### CustomizeDashboardModal (`src/components/CustomizeDashboardModal.jsx`)

1. **Cancel·lar**
   - Text: "Cancel·lar"
   - Acció: Tanca modal

2. **Guardar Preferències**
   - Text: "Guardar"
   - Acció: `onSave(newWidgets)`

### FileUploader (`src/components/FileUploader.jsx`)

1. **Seleccionar Fitxer**
   - Text: "Seleccionar Fitxer"
   - Acció: Obre file picker

2. **Pujar Fitxer**
   - Text: "Pujar"
   - Acció: `handleUpload()`

### FileBrowser (`src/components/FileBrowser.jsx`)

1. **Pujar Fitxer**
   - Icona: Upload
   - Acció: Obre uploader

2. **Actualitzar**
   - Icona: RefreshCw
   - Acció: Refresca llista

### LogisticsFlow (`src/components/LogisticsFlow.jsx`)

1. **Actualitzar Fase**
   - Botons per cada fase
   - Acció: Actualitza fase logística

---

## 📈 Resum per Tipus

### Per Acció:
- **Crear/Nou**: 15+ botons
- **Editar**: 10+ botons
- **Eliminar**: 6+ botons
- **Guardar**: 8+ botons
- **Cancel·lar**: 8+ botons
- **Navegar**: 15+ botons
- **Toggle**: 3 botons (Dark Mode, Sidebar, etc.)
- **Icon buttons**: 20+ botons

### Per Color:
- **Primary (#4f46e5)**: Crear, Connectar, Guardar principal
- **Success (#22c55e)**: Confirmacions, Stock, Proveïdors
- **Warning (#f59e0b)**: Transitari, Reintentar
- **Danger (#ef4444)**: Eliminar, Desconnectar
- **Info (#3b82f6)**: Magatzems
- **Purple (#8b5cf6)**: Briefing

---

*Última actualització: Generat automàticament*










