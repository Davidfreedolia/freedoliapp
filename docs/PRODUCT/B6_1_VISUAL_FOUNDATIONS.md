# FREEDOLIAPP — B6.1 Visual Foundations

**Status:** Canonical definition at repo/documentation level.  
**Block:** Track B — **B6.1 — Visual Foundations**.  
**Type:** Definition only.  
**Does not claim:** implementation, rollout screen by screen, or production verification.

**Purpose:** Fix the visual base of the product as a **source of truth** before any later harmonization work.

**Dependencies / relationship**

- **B2** (`docs/PRODUCT/CANONICAL_UI_SYSTEM.md`) defines shell, layout patterns, interaction principles, and screen families.
- **This document (B6.1)** fixes the **canonical visual foundations** to apply later across the app.
- **B6.2** is the later implementation/harmonization rollout and is **explicitly out of scope here**.
- If this document conflicts with `docs/PRODUCT/VISUAL_IDENTITY_SYSTEM_V1.md` for **application UI**, **B6.1 prevails**.

---

## 1. Canonical context to fix

### General direction

FREEDOLIAPP UI must feel:

- softer
- friendlier
- cleaner
- more breathable
- less hard / less severe enterprise

The visual base must live mainly in:

- light neutrals
- soft mint
- controlled functional accents

We do **not** want a saturated UI or a product tinted with brand colors everywhere.

---

## 2. Canonical B6.1 decisions

### 2.1 Palette

#### Brand principal

- **Mint Teal** = `#6ECBC3`

#### Accent funcional principal

- **Turquoise** = `#2FA4A9`

#### Hover funcional

- **Turquoise Hover** = `#1E8A8F`

#### Suport estructural profund

- **Deep Teal** = `#1F5F63`

#### Accent càlid restringit

- **Coral** = `#F26C6C`

#### Warning / highlight puntual

- **Soft Yellow** = `#F4E27A`
- **Yellow accent** = `#F2D94E`

#### Base clara

- **Warm White** = `#F6F8F3`

#### Text

- **Text Primary** = `#243333`
- **Text Secondary** = `#5F7476`

#### Borders

- **Border base** = `#D8E1DE`

#### Canonical palette usage rule

- **Mint Teal** = main emotional tone and soft highlights.
- **Turquoise** = real action, focus, and primary CTA.
- **Deep Teal** = structural support, not the protagonist.
- **Coral** = danger, tension, and punctual action alerts.
- **Yellow** = very restricted warning.
- The UI must live mostly in **light neutrals + soft mint**.
- **Turquoise must be reserved for real action**.
- **Do not literally reproduce the logo across the whole UI**.
- **No default gradients**.
- **No modules tinted each with a different color**.

### 2.2 Buttons

#### Primary

- background: `#2FA4A9`
- hover: `#1E8A8F`
- text: light
- use: real primary CTA

#### Secondary

- background: `#F6F8F3`
- border: `#D8E1DE`
- text: `#243333`
- hover: very soft
- must feel **valid**, not disabled

#### Ghost

- transparent background
- neutral text/icon
- soft hover

#### Danger

- background: `#F26C6C`
- text: light

#### Warning

- background: `#F2D94E`
- text: dark
- very restricted use

#### Button rule

- **No important button without color**.
- **Not everything should be primary**.
- Do not improvise new variants.

### 2.3 Cards

#### Canonical mother card

There must be **one single base card**, and the rest must derive from it.

#### Base

- light background
- subtle border `#D8E1DE`
- minimal shadow
- soft radius
- clean text

#### Minimal derivatives

- default
- interactive
- data/highlight
- alert

#### Card rule

- prioritize **subtle border** over strong shadows
- minimal shadows
- avoid four unrelated visual families
- alert cards should not paint the entire card with aggressive color; use accent, border, or badge instead

### 2.4 Inputs / fields

#### Base

- clear / warm white background
- border `#D8E1DE`
- text `#243333`
- soft placeholder inside the family of `#5F7476`
- focus with `#2FA4A9`
- error with `#E55353`

#### Family

- input
- select
- textarea

All must belong to the same visual family.

#### Labels / helper / error

- label: `#243333`
- helper: `#5F7476`
- error: `#E55353`

#### Input rule

- focus must be elegant, thin, and discreet
- no fluorescent focus
- no placeholders acting as labels
- no different inputs per page

### 2.5 Radius

Canonical scale:

- **radius-sm = 10px**
- **radius-md = 14px**
- **radius-lg = 18px**

Usage:

- buttons / inputs / badges = 10px
- usual cards / panels = 14px
- large panels / standout shells = 18px

### 2.6 Shadows

Only three levels:

- **base**
- **interactive**
- **overlay**

Shadow rule:

- all soft
- all discreet
- more structure than spectacle
- prioritize border before shadow

We do not want:

- floating cards like spaceships
- exaggerated blur
- strong blacks
- hard shadows

### 2.7 Icons

#### Canonical library

- **Tabler Icons**

#### Sizes

- `16px`
- `18px`
- `20px`
- `24px`

#### Icon rule

- functional use
- consistent sizes
- do not mix packs
- no ornamental icons

### 2.8 Breakpoints

Canonical breakpoints:

- `576`
- `768`
- `992`
- `1200`
- `1440`

Breakpoint rule:

- simple responsive model, inspired by Bootstrap
- no migration to Bootstrap
- no absurd micro-breakpoints
- same base behavior across the app

### 2.9 Shell base

#### Direction

The user must feel that they are always inside the same app.

#### Base

- clear and soft background
- clean and light topbar
- unified page header
- consistent container
- coherent spacing
- clear layering

#### Sidebar

The sidebar must feel **more like an inset tab/panel**.

Specific rule:

- it must have **radius only on the inner corners**
- it must not feel like a full floating card
- active state must be very sober:
- very soft mint/turquoise background
- firmer text
- icon slightly more present
- no giant pill or aggressive block

---

## 3. Accepted extra adjustments

These rules are explicitly canonical within B6.1:

1. **Coral even more restricted**: danger, action alerts, punctual tension only.
2. **Mint must be more present than turquoise on surfaces**: soft highlights, positive badges, subtle active backgrounds, and subtle selected states.
3. **Borders are never pure black**: always soft gray; they structure without hardening.
4. **Secondary buttons must not look disabled**.
5. **Input focus must be elegant and discreet**.
6. **The UI must not try to reproduce the logo everywhere**.

---

## 4. Intentional exclusions

This document intentionally leaves out:

- screen-by-screen redesign
- concrete screen compositions
- detailed CSS implementation
- token rollout in code
- refactors across current screens
- B6.2 visual harmonization work
- any work from B6.3 or beyond

---

## 5. Limits

- This is a **definition/documentation** closure only.
- It is valid at **repo level**, not as proof of visual implementation.
- Existing screens may still diverge until a later implementation block applies these rules.
- `B2` remains the source of truth for layout, shell behavior, and screen-family patterns; `B6.1` does not reopen those product decisions.

---

## 6. Risks

- Some legacy visual documents may still contain broader or older language; for **application UI**, this document is the priority reference.
- If B6.2 starts without respecting this file, the rollout can fragment into local visual decisions again.
- Without a later implementation pass, the product can remain visually inconsistent despite having the canonical base documented.

---

## 7. Closure statement

`B6.1 Visual Foundations` is now defined as the **canonical visual base at repo/documentation level**.

This does **not** mean:

- production verified
- implemented in code
- harmonized across screens

Those claims require later implementation and verification work outside this document.
