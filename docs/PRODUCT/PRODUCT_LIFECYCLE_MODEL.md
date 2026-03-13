# FREEDOLIAPP — PRODUCT LIFECYCLE MODEL

Status: Core Product Model  
Scope: Defines the operational lifecycle of a product inside FREEDOLIAPP.

---

## 1. PURPOSE

The Product Lifecycle Model defines the operational flow that Amazon sellers follow when developing and launching products.

FREEDOLIAPP is built around this lifecycle.

The system should guide users through the entire process.

---

## 2. CORE CONCEPT

Each **Project** represents a product being developed or managed.

A project progresses through operational phases:

- Idea  
  ↓  
- Supplier  
  ↓  
- Samples  
  ↓  
- Production  
  ↓  
- Purchase Order  
  ↓  
- Shipping  
  ↓  
- Inventory  
  ↓  
- Launch  
  ↓  
- Sales  
  ↓  
- Profit  
  ↓  
- Decisions  

The UI and data model should reflect this lifecycle.

---

## 3. PHASE DEFINITIONS

### 1. IDEA

**Goal:** Validate the product idea.

**Typical data:**

- product concept
- ASIN references
- estimated price
- estimated margin
- competitor notes

**Modules involved:** Projects, Product research, Viability calculator

**Output:** Decision to search for suppliers.

---

### 2. SUPPLIER

**Goal:** Find manufacturers capable of producing the product.

**Data:** supplier list, quotes, MOQ, lead time, certifications

**Modules:** Suppliers, Quotes, Supplier communication

**Output:** Selected supplier.

---

### 3. SAMPLES

**Goal:** Validate product quality.

**Data:** sample requests, sample cost, delivery tracking, evaluation notes

**Modules:** Sample requests, Supplier communication

**Output:** Approved sample.

---

### 4. PRODUCTION

**Goal:** Prepare manufacturing.

**Data:** final product specs, packaging, carton configuration, production lead time

**Modules:** Project detail, Packaging, Product specs

**Output:** Production ready.

---

### 5. PURCHASE ORDER

**Goal:** Create the production order.

**Data:** PO number, quantity, carton count, cost per unit, production schedule

**Modules:** Purchase Orders, Manufacturer packs, Carton labels

**Output:** Order confirmed.

---

### 6. SHIPPING

**Goal:** Transport goods to warehouse or Amazon.

**Data:** forwarder, tracking, shipping documents, expected arrival

**Modules:** Forwarders, Shipments, Tracking

**Output:** Goods in transit.

---

### 7. INVENTORY

**Goal:** Track available stock.

**Data:** units available, warehouse location, Amazon stock, reserved units

**Modules:** Inventory, Warehouses

**Output:** Stock ready for sale.

---

### 8. LAUNCH

**Goal:** Product goes live.

**Data:** listing status, price, marketing plan, advertising

**Modules:** Projects, Launch checklist

**Output:** Active product.

---

### 9. SALES

**Goal:** Monitor performance.

**Data:** sales, revenue, units sold, advertising cost

**Modules:** Analytics, Finance

**Output:** Profitability data.

---

### 10. PROFIT

**Goal:** Understand financial performance.

**Data:** COGS, Amazon fees, logistics cost, net margin

**Modules:** Profit, Cashflow, Finances

**Output:** Financial insight.

---

### 11. DECISIONS

**Goal:** Take operational actions.

**Examples:** reorder, increase price, reduce ads, discontinue product

**Modules:** Decision Dashboard, Automations, Alerts

**Output:** Operational decision.

---

## 4. LIFECYCLE VISUALIZATION

The lifecycle should be visible in the UI as:

- **Progress timeline**  
  or  
- **Phase progress bar**

**Example:** IDEA → SUPPLIER → SAMPLES → PRODUCTION → PO → SHIPPING → INVENTORY → LAUNCH

Each phase should have:

- status
- completion percentage
- blocking tasks

---

## 5. AUTOMATION OPPORTUNITIES

The lifecycle enables automation.

**Examples:**

- Low stock → reorder suggestion
- Shipment delayed → alert
- Profit margin drop → decision alert

Automations should connect lifecycle phases with operational actions.

---

## 6. DATA MODEL IMPLICATIONS

The database must support:

- projects
- project_phases
- suppliers
- purchase_orders
- shipments
- inventory
- financial_events
- decisions

Each entity must be linked to **org_id** and **project_id** to maintain tenant isolation.

---

## 7. UI PRINCIPLES

The lifecycle must be:

- visible
- intuitive
- action-oriented

Users should always understand:

- **Where is my product now?**
- **What is the next step?**

---

## 8. STRATEGIC IMPORTANCE

This lifecycle model is the core differentiator of FREEDOLIAPP.

Most Amazon tools focus on: analytics, product research.

FREEDOLIAPP focuses on: **operations**.

This makes it an **Amazon Operations OS**.

---

## 9. FUTURE EXTENSIONS

Possible future phases:

- Brand building
- Multi-marketplace expansion
- Product portfolio management

---

## 10. SUMMARY

The Product Lifecycle Model defines the operational backbone of the platform.

All modules should support this lifecycle.

The UI should guide users through it.
