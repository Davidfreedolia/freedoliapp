# D22 — Operations Planning Views

Status: DRAFT

## 1. Objectiu

Crear vistes operatives perquè el seller pugui planificar reposicions i operacions utilitzant:

- Inventory Intelligence
- Reorder Intelligence
- Cashflow Forecast

Sense duplicar engines.

Només UI + agregació.

---

## 2. Vistes previstes

Definir tres vistes:

### Reorder Planning View

Basada en:
getReorderCandidates()

Mostra:

- product / ASIN
- stock actual
- coverageDays
- daysUntilStockout
- reorderUnits
- leadTime
- demandDuringLeadTime
- confidence
- issues

Ordenació per defecte:

daysUntilStockout ASC

---

### Stock Risk View

Basada en:

detectStockoutRisk()

Mostra:

- product
- unitsAvailable
- daysOfCover
- predictedStockoutDate
- severity

---

### Cash Impact View

Basada en:

getCashflowForecast()

Mostra:

- cash today
- projected cash
- reorder cost estimation
- impact on next 30 days

---

## 3. Contracte de dades

Cap engine nou.

Només consumir:

src/lib/inventory/getReorderCandidates.js  
src/lib/inventory/detectStockoutRisk.js  
src/lib/finance/getCashflowForecast.js

---

## 4. Regles arquitectòniques

No duplicar càlculs.

UI només consumeix engines.

Cap lògica de negoci nova.

---

## 5. Definition of done

Document creat.

Vistes definides.

Fonts de dades definides.

Sense implementació UI encara.

---

## 6. UI Data Contract

Definir l'estructura exacta de dades que la UI consumirà per cada vista.

### Reorder Planning View — data shape

Font:
getReorderCandidates()

Cada fila ha de tenir:

{
  asin: string,
  productName: string | null,
  unitsAvailable: number,
  coverageDays: number | null,
  daysUntilStockout: number | null,
  reorderUnits: number,
  demandDuringLeadTime: number | null,
  leadTimeDays: number | null,
  leadTimeSource: string | null,
  confidence: 'high' | 'medium' | 'low',
  issues: string[]
}

Ordenació esperada:

daysUntilStockout ASC  
confidence DESC

---

### Stock Risk View — data shape

Font:
detectStockoutRisk()

Cada fila:

{
  asin: string,
  productName: string | null,
  unitsAvailable: number,
  daysOfCover: number | null,
  predictedStockoutDate: string | null,
  severity: 'low' | 'medium' | 'high'
}

Ordenació:

severity DESC  
daysOfCover ASC

---

### Cash Impact View — data shape

Font:
getCashflowForecast()

Resposta esperada:

{
  cashToday: number,
  cashIn30Days: number,
  timeseries: [
    {
      date: string,
      cashBalance: number
    }
  ]
}

---

## 7. Performance constraints

Les vistes han de:

- suportar 500+ ASIN sense bloqueig UI
- evitar recalcular engines al client
- carregar via async

---

## 8. UI behaviour rules

- loading states obligatoris
- empty states clars
- errors recuperables

---

### Current implementation status

- pàgina `src/pages/OperationsPlanning.jsx` creada
- ruta `/app/operations` activa
- entrada de sidebar afegida
- Reorder Planning View connectada a `getReorderCandidates()`
- Stock Risk View connectada a `detectStockoutRisk()`
- Cash Impact View connectada a `getCashflowForecast()`
- cap engine nou creat
- cap lògica de negoci duplicada al frontend

---

### Implemented Contract

#### Page scope

D22 implementa una única pàgina agregadora:

- `src/pages/OperationsPlanning.jsx`

Aquesta pàgina consumeix només engines existents.

#### Reorder Planning View

- font: `src/lib/inventory/getReorderCandidates.js`
- columnes mostrades:
  - Product / ASIN
  - Units
  - Coverage
  - Stockout
  - Reorder
  - Lead time
  - Confidence
  - Issues
- l'ordre visual respecta l'ordre retornat per engine
- sense càlculs nous al client

#### Stock Risk View

- font: `src/lib/inventory/detectStockoutRisk.js`
- columnes mostrades:
  - Product / ASIN
  - Units
  - Days of cover
  - Predicted stockout
  - Severity
- sense càlculs nous al client

#### Cash Impact View

- font: `src/lib/finance/getCashflowForecast.js`
- forecast a 30 dies
- KPIs mostrats:
  - Cash today
  - Cash in 30 days
- taula simple basada en `timeseries`
- sense gràfic nou dins D22
- sense estimació de reorder cost en aquesta fase

---

### UI behaviour implemented

- loading state de pàgina / seccions
- empty states clars
- errors recuperables
- sense tabs
- sense filtres
- sense accions massives
- sense kanban
- sense gantt

---

### Definition of done

Completats:

- document de contracte
- data contract
- pàgina base
- Reorder Planning View
- Stock Risk View
- Cash Impact View
- routing
- sidebar
- sense duplicar engines
