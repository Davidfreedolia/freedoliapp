# D22 — Operations Planning Views

**Status:** PLANNED  
**Owner:** Product / Architecture

## Objectiu

Permetre que l'usuari visualitzi la planificació operativa amb la vista que prefereixi segons el cas d'ús.

## Vistes previstes

- Table
- Kanban
- Gantt

## Fonts de dades previstes

- D16 Inventory Intelligence
- D17 Cashflow Forecast
- D19 Reorder Intelligence
- purchase_orders / incoming supply data
- project / sourcing flow si aplica

## Casos d'ús

- veure productes que requeriran recompra
- prioritzar accions
- visualitzar finestra de cobertura d'estoc
- visualitzar lead time i arribades previstes
- entendre risc de stockout en el temps

## Vista Kanban

Columnes orientatives:

- Healthy
- Monitor
- Reorder Soon
- Urgent
- Ordered

## Vista Gantt

Elements temporals orientatius:

- today
- coverage window
- expected stockout date
- reorder window
- PO creation / supplier confirmation
- expected arrival

## Regla funcional important

La vista ha de ser **seleccionable per l'usuari**.  
No s'ha d'imposar una sola representació.

## Dependències

Aquesta fase depèn de tenir D19 consolidat i estable.

## Fora d'abast actual

- cap implementació UI
- cap selector de vista encara
- cap refactor de Home

## Nota de roadmap

Aquesta fase queda registrada per ser considerada després de consolidar reorder alerts i la capa operativa.
