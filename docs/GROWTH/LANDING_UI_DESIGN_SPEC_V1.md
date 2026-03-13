# FREEDOLIAPP — LANDING UI DESIGN SPEC V1

Status: Draft  
Owner: Product / Design  
Scope: Landing UI design rules  
Related docs:

- VISUAL_IDENTITY_SYSTEM_V1.md
- LANDING_V2_IMPLEMENTATION_MAP.md
- LANDING_V2_CONTENT_OUTLINE.md
- LANDING_V2_WIREFRAME_FINAL.md

Goal:

Define the visual design system for the landing page before implementation.

The landing must feel like a premium SaaS product while remaining coherent with the existing application UI.

---

# 1 — Visual Style

Landing style: Hybrid SaaS

Characteristics:

- minimal hero
- product-driven visuals
- card-based sections
- high whitespace
- structured information flow

Visual inspiration:

- Asana
- Stripe
- Linear

But adapted to the Freedoliapp identity.

---

# 2 — Color System Application

Landing uses the Freedolia palette with restrained usage.

## Background Layers

Primary background

White

Section alternate background

Very light neutral (soft gray / light teal tint)

Example rhythm:

Hero → white  
Trust → light background  
Problem → white  
Solution → light background  
Modules → white  

Goal:

Create visual rhythm without heavy blocks.

---

## Accent Colors

Primary accent:

Deep teal

Used for:

- primary CTA
- important highlights

Secondary accents:

- coral
- soft yellow
- mint teal

Used sparingly for icons, highlights or tags.

---

# 3 — Typography Application

Font system:

Apple system font stack / Helvetica Neue style.

## Hero Headline

Size:

48–56px desktop

Weight:

600–700

Style:

short, direct, operator language.

---

## Section Titles

Size:

32–36px

Weight:

600

---

## Body Text

Size:

16–18px

Weight:

400

Line width:

max 600px for readability.

---

## CTA Labels

Weight:

500–600

Short phrases only.

Example:

Start free trial  
See how it works

---

# 4 — Layout System

Landing layout follows existing spacing tokens.

## Container

Max width:

1100px

Centered layout.

---

## Section Spacing

Desktop:

Top / bottom padding:

96px

Mobile:

48px

---

## Grid

Feature sections:

2–3 columns desktop  
1 column mobile

Breakpoint:

768px

---

# 5 — Hero Composition

Hero structure:

Headline  
Tagline  
Supporting text  
CTA buttons  
Dashboard screenshot

Screenshot placement:

Centered below headline.

Assistant bubble:

Bottom-right corner.

---

# 6 — Screenshot Design

Screenshots must communicate product value without exposing unfinished UI.

Rules:

- cropped compositions
- fake data only
- partial UI views
- subtle shadow or frame
- consistent background

Preferred visuals:

Dashboard overview  
Supplier list  
Purchase order view  
Operational alert

---

# 7 — Card Design

Cards used for:

- modules
- features
- resources

Style:

- soft radius
- subtle border
- light shadow
- generous padding

Cards must reuse existing `Card` component.

---

# 8 — Icon System

Icons:

lucide-react (already used in the project).

Style:

line icons  
consistent stroke  
neutral color with accent on hover.

---

# 9 — Assistant Visual

Freedoli assistant appearance:

Floating bubble.

Position:

Bottom-right corner.

Bubble style:

- circular
- subtle gradient or accent color
- minimal animation

Assistant introduction example:

Hi — I'm Freedoli.  
Want a quick tour of the platform?

Quick actions:

Show me the product  
How it works  
Start trial

---

# 10 — Motion Rules

Motion must remain subtle.

## Button Hover

Small elevation + color shift.

## Card Hover

Light shadow increase.

## Assistant

Gentle pulse animation.

## Logo

Optional micro rotation / gradient flow.

---

# 11 — Responsive Rules

Mobile layout:

Hero text stacked  
Screenshot below hero text  
Modules stacked vertically  
Cards become single column

Assistant bubble remains visible.

---

# 12 — Design Principles

Landing must prioritize:

Clarity  
Whitespace  
Product visibility  
Conversion

Avoid:

visual noise  
heavy illustrations  
excessive gradients.

---

# Final Goal

The landing should feel like the public face of the same product users will enter after signup.

Consistency between landing and application UI is critical.

