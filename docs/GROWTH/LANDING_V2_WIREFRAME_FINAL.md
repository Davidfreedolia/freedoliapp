# FREEDOLIAPP — LANDING V2 WIREFRAME FINAL

Status: Draft  
Owner: Product / Growth  
Scope: Marketing landing layout  
Related docs:
- LANDING_V2_IMPLEMENTATION_MAP.md
- LANDING_V2_CONTENT_OUTLINE.md
- VISUAL_IDENTITY_SYSTEM_V1.md

Goal:

Define the final visual structure of the landing page before UI design and implementation.

Landing style:

Hybrid SaaS landing  
Minimal hero + structured product explanation.

---

# Landing Structure

NAVBAR  
HERO  
TRUST  
PROBLEM  
SOLUTION  
PRODUCT MODULES  
HOW IT WORKS  
SCREENSHOTS  
ASSISTANT  
RESOURCES  
FINAL CTA  
FOOTER

---

# 1 — NAVBAR

Layout

[Logo] Freedoliapp

Product  
How it works  
Pricing  
Resources

           Login   |   Start Free Trial

Reuse:

LandingHeader.jsx  
Button.jsx

Rules:

- sticky header
- CTA always visible

---

# 2 — HERO

Goal

Explain the product in seconds.

Layout

Run your Amazon operations from one place

The operating system for Amazon sellers

Suppliers, purchase orders, inventory and profit  
in a single operational platform.

[ Start Free Trial ] [ See how it works ]

            [ DASHBOARD SCREENSHOT ]

Visual rules

- screenshot centered
- large whitespace
- assistant bubble visible

---

# 3 — TRUST

Purpose

Reduce skepticism.

Layout

Built for serious Amazon operators

FBA workflows  
Supplier management  
Inventory visibility  
Profit tracking

Components

Card  
Badge

---

# 4 — PROBLEM

Purpose

Make the visitor recognize operational chaos.

Layout

Running an Amazon business shouldn't  
require 10 different tools.

Excel  
WhatsApp suppliers  
Shipping documents  
Email threads  
Inventory spreadsheets

Visual idea

chaos → system diagram.

---

# 5 — SOLUTION

Purpose

Introduce Freedoliapp system concept.

Layout

The Amazon operations control tower

Manage suppliers  
Track orders  
Monitor inventory  
Understand profit  
Make decisions

Visual

system diagram.

---

# 6 — PRODUCT MODULES

Purpose

Show product capabilities.

Layout

Everything your Amazon business needs

[ Suppliers ]  
Manage suppliers and quotes

[ Purchase Orders ]  
Track manufacturing and orders

[ Inventory ]  
Monitor stock and coverage

[ Profit ]  
Understand real profitability

[ Decisions ]  
Operational intelligence

Components

Card  
Badge

---

# 7 — HOW IT WORKS

Purpose

Explain the operational flow.

Layout

How Freedoliapp works

1 Connect suppliers  
2 Create purchase orders  
3 Track inventory  
4 Understand profit  
5 Make better decisions

Component

Stepper.jsx

---

# 8 — SCREENSHOTS

Purpose

Show product value without exposing unfinished UI.

Layout

A control center for your Amazon business

[ dashboard screenshot ]

Approved screenshots

- dashboard
- suppliers
- purchase order
- decision alert

Rules

- cropped
- fake data
- partial UI

---

# 9 — FREEDOLI ASSISTANT

Purpose

Introduce assistant layer.

Layout

Meet Freedoli

Your operational assistant.

Helps you understand your business  
and make better decisions.

Bubble

bottom-right.

---

# 10 — RESOURCES

Purpose

Connect SEO content.

Layout

Resources for Amazon sellers

Guides  
Templates  
Tools

Components

Card  
Button

---

# 11 — FINAL CTA

Purpose

Convert visitor.

Layout

Ready to run your Amazon  
operations from one place?

[ Start Free Trial ]

---

# 12 — FOOTER

Reuse

LandingFooter.jsx

Content

Product  
Resources  
Pricing  
Legal

---

# Responsive Rules

Mobile layout

Hero  
Screenshot  
Modules stacked  
Steps stacked  
Assistant bubble persistent  
CTA visible

Breakpoints

Use existing landing breakpoint (768px).

---

# Design Principles

- minimal hero
- whitespace heavy layout
- card-based sections
- product-first visuals
- assistant presence

---

# Implementation Constraint

Landing must:

- reuse components/ui/*
- reuse CSS tokens
- keep styles under `.landing-*`
- not affect `/app/*`

