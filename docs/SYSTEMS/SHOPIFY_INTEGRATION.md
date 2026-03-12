# Shopify Integration — Strategic Architecture Stub

Status: Active roadmap (not implemented)  
Scope: Native integration between FREEDOLIAPP and Shopify stores.

## Purpose

Enable FREEDOLIAPP to connect to **Shopify** as a first external commerce channel, syncing products, orders, and inventory so operators can manage multi-channel operations from a single system.

## Why it matters

- Many target customers operate DTC storefronts on Shopify.  
- Decisions, automation, and analytics are more powerful when they have **full-funnel data** (orders, catalog, inventory) across channels.  
- A clean integration architecture enables future connectors (WooCommerce, TikTok Shop, etc.).

## Scope

- Store connection (OAuth or API key) and secure credential storage.  
- **Product sync**: import products/variants and map them to internal projects.  
- **Order sync**: pull orders for profit and cashflow analysis.  
- **Inventory sync**: align stock signals between Shopify and FREEDOLIAPP.  
- Minimal reconciliation and health checks (e.g., last sync time, error status).

## Key capabilities

- **Connector configuration** per org/workspace (multi-tenant safe).  
- Incremental sync for products and orders to avoid heavy full reloads.  
- Clear mapping between Shopify entities (products, variants, orders) and FREEDOLIAPP data model.  
- Basic observability: logs and metrics around sync success/failure.

## Non-goals

- Implementing every Shopify API feature (discounts, themes, etc.) in early phases.  
- Acting as a full OMS or WMS — FREEDOLIAPP focuses on intelligence and operations, not replacing all back-office systems.  
- Handling marketplace-specific tax/legal logic beyond what Shopify already enforces.

## Connections to FREEDOLIAPP

- **Listing Intelligence**: Shopify product content and media can feed listing research and drafting.  
- **Decision engine**: decisions may use Shopify signals (low stock, margin issues, slow movers) as inputs.  
- **Automation system**: future automation may propose or execute actions that depend on Shopify data (e.g., reorder suggestions).  
- **Financial layer**: Shopify orders and payouts contribute to profit and cashflow metrics.

