# FREEDOLIAPP — PROJECT TIMELINE SYSTEM

Status: Core UI component  
Scope: Visual representation of the product lifecycle inside Project Detail.

---

## 1. Purpose

The Project Timeline visually represents the operational stage of a product.

It allows users to immediately understand:

- where the product is
- what has been completed
- what is missing
- what the next step is

The timeline is the **visual representation of the Product Lifecycle Model**.

---

## 2. Position in the UI

The timeline is displayed inside **ProjectDetail** at the top of the page.

It acts as the operational header of the project.

---

## 3. Lifecycle Phases

The timeline reflects the product lifecycle phases:

- IDEA
- SUPPLIER
- SAMPLES
- PRODUCTION
- PO
- SHIPPING
- INVENTORY
- LAUNCH

Each phase represents a milestone in the operational workflow.

---

## 4. Visual Structure

The timeline is displayed as a **horizontal progress flow**.

Example:

**IDEA → SUPPLIER → SAMPLES → PRODUCTION → PO → SHIPPING → INVENTORY → LAUNCH**

Each node in the timeline represents a lifecycle stage.

---

## 5. Phase States

Each phase can have three states:

| State      | Color          | Meaning                    |
|-----------|----------------|----------------------------|
| completed | green          | Phase finished.            |
| active    | yellow / amber | Current phase in progress.  |
| pending   | grey           | Phase not started yet.     |

---

## 6. Data Source

The timeline state is derived from:

- `project_phases`
- `project_status`
- related entities

Examples:

- **Supplier** phase complete when: `supplier_selected = true`
- **PO** phase complete when: `purchase_order_created = true`
- **Shipping** phase active when: `shipment_in_transit = true`

---

## 7. UX Goals

The timeline should answer two questions instantly:

1. **Where is my product?**
2. **What should I do next?**

The component should be readable in less than 2 seconds.

---

## 8. Interaction Model

Each phase should be **clickable**.

Clicking a phase navigates to the relevant section.

Examples:

- SUPPLIER → Suppliers module
- PO → Purchase Orders
- SHIPPING → Shipments

---

## 9. Future Enhancements

Possible extensions:

- progress percentage
- blocking tasks
- alerts
- automation triggers

Example:

- Low stock → highlight INVENTORY phase
- Shipment delay → highlight SHIPPING phase

---

## 10. Strategic Role

The timeline is one of the key UX differentiators of FREEDOLIAPP.

Most Amazon tools show data tables.

**FREEDOLIAPP shows the operational flow.**

---

## 11. Architecture: Lifecycle → Events → Decisions → Automations

Conceptually, **Decision Dashboard**, **Decisions**, and **Automations** all derive from the product lifecycle.

The recommended architecture is:

```
Project lifecycle
        ↓
Events
        ↓
Decisions
        ↓
Automations
```

- **Project lifecycle** (and its visual timeline) is the source of truth for where the product is.
- **Events** are generated from lifecycle state changes (e.g. low stock, PO created, shipment delayed).
- **Decisions** are the suggested or required actions that respond to those events.
- **Automations** execute or propose those decisions (e.g. reorder, alert, trigger).

The UI modules (Decision Dashboard, Decisions inbox, Automations) should be designed as **layers on top of lifecycle events**, not as separate silos. This keeps the product coherent and makes it clear that every decision and automation is rooted in the operational flow.
