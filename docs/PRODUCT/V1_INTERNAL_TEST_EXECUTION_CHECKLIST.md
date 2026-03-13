# FREEDOLIAPP — V1 Internal Test Execution Checklist

## Status
Draft

## Goal
Provide a practical execution checklist for running the V1 internal validation.

## Instructions
Each test must be marked as:

- **PASS**
- **FAIL**
- **NOT TESTED**

For every item marked **FAIL**, create or link a bug entry using the internal bug format:

- Area  
- Steps to reproduce  
- Expected  
- Actual  
- Severity  
- Screenshot/video  
- Status  

and record the bug ID/reference next to the checklist item.

---

## 1. Entry Funnel

**1.1 Landing**
- [ ] Landing page `/` loads without errors (desktop)
- [ ] Landing page `/` loads without errors (mobile viewport)
- [ ] Main hero text is visible and readable
- [ ] Primary CTA “Start free trial” is visible
- [ ] Secondary CTA “Sign in” is visible
- [ ] Footer links (Features, Pricing, About, Help) do not break or redirect incorrectly
- [ ] Legal links (Privacy, Terms, Cookies, DPA) point to public legal pages and load

**1.2 Trial**
- [ ] “Start free trial” CTA from landing navigates to `/trial`
- [ ] Trial page loads without console errors
- [ ] Email field validation works (invalid email blocked, valid email accepted)
- [ ] Marketing consent checkbox is optional (trial can continue unchecked)
- [ ] Successful submission shows a clear “check inbox / magic link sent” message

**1.3 Login**
- [ ] “Sign in” CTA from landing navigates to `/login`
- [ ] Login page loads without errors
- [ ] Email/password login works for a valid user
- [ ] Magic link login flow works end-to-end (request + follow link)
- [ ] “Continue with Google” works (with test credentials)
- [ ] “Continue with Apple” works (with test credentials)

**1.4 Activation & App entry**
- [ ] After trial + magic link, activation route (`/activation`) is reachable
- [ ] Activation wizard progresses through steps without blocking errors
- [ ] Activation in “Setup mode” (sense Amazon) completes correctament
- [ ] After activation, user is routed into `/app` (Dashboard) sense crash

---

## 2. Workspace

**2.1 Workspace name**
- [ ] Topbar mostra el nom del workspace actual
- [ ] El label de workspace no es talla ni desmaqueta amb noms moderadament llargs

**2.2 Workspace selector**
- [ ] Amb múltiples workspaces, el botó de selector mostra el workspace actual
- [ ] En fer clic s’obre el menú amb la llista de workspaces
- [ ] Cada entrada mostra nom i rol
- [ ] Clicar un workspace diferent canvia efectivament l’org activa

**2.3 Single-workspace mode**
- [ ] Amb un únic workspace, NO apareix dropdown (nom estàtic només)

**2.4 Persistència**
- [ ] Després de canviar workspace, fer refresh conserva l’org activa
- [ ] Navegació entre pàgines manté el mateix workspace sense inconsistències

---

## 3. Dashboard

- [ ] Dashboard (`/app`) carrega sense crashes ni errors visibles
- [ ] El banner de “first value” apareix per a usuaris nous sense dades
- [ ] El CTA del banner (“Create first product / project”) obre el flux de creació de projecte o porta a la vista correcta
- [ ] Amb dades reals (projectes, comandes, alertes), els KPIs es mostren sense valors “undefined” o NaN
- [ ] Amb poques o cap dada, els widgets mostren missatges d’empty / no data en lloc de pantalles trencades
- [ ] L’executive dashboard (si s’activa) mostra loading i error states clars, sense crashes

---

## 4. Core Modules

**4.1 Projects**
- [ ] `/app/projects` carrega sense errors
- [ ] El llistat mostra projectes existents (si n’hi ha)
- [ ] El botó “Create project” obre el modal / flux de creació
- [ ] Es pot crear un projecte nou sense errors crítics
- [ ] Amb 0 projectes, l’empty state es mostra correctament amb CTA funcional

**4.2 Suppliers**
- [ ] `/app/suppliers` carrega sense errors
- [ ] El llistat mostra proveïdors existents (si n’hi ha)
- [ ] El botó “Create supplier” obre el flux de creació/edició
- [ ] Es pot crear un proveïdor nou sense errors crítics
- [ ] Amb 0 proveïdors, l’empty state es mostra correctament amb CTA funcional

**4.3 Orders**
- [ ] `/app/orders` carrega sense errors
- [ ] El llistat mostra comandes existents (si n’hi ha)
- [ ] El botó “Create order” obre el flux de creació de PO
- [ ] Es pot crear una comanda nova lligada a un projecte/proveïdor
- [ ] El modal de detall d’una comanda obre i carrega bé
- [ ] Amb 0 comandes (i sense filtres), l’empty state es mostra amb CTA funcional
- [ ] Amb filtres que no retornen resultats, la UI mostra missatge de “no results” sense trencar-se

---

## 5. Billing

- [ ] La pàgina de Billing (`/app/billing`) carrega sense errors
- [ ] L’estat de trial / subscripció es mostra coherent amb la configuració de proves
- [ ] En estat de billing bloquejat, la pantalla indica clarament el motiu i el que s’ha de fer
- [ ] En estat d’over-seat, la pantalla indica clarament el problema i les opcions (upgrade / gestionar membres)
- [ ] Els botons de “Upgrade / Manage subscription” són visibles on toca
- [ ] En organitzacions actives, el gating de billing no impedeix l’accés normal a l’app

---

## 6. Language

- [ ] Amb idioma EN seleccionat, les pantalles principals (Landing, Trial, Login, Dashboard, Projects, Suppliers, Orders, Billing) es mostren completament en anglès
- [ ] Amb idioma ES seleccionat, les mateixes superfícies es mostren coherents en castellà
- [ ] Amb idioma CAT seleccionat, les mateixes superfícies es mostren coherents en català
- [ ] No hi ha pantalles crítiques amb barreja visible de múltiples idiomes (per ex. EN+CAT al mateix header)
- [ ] Canviar l’idioma des de la UI actualitza els textos sense requerir refresh manual

---

## 7. UI States

- [ ] Empty states de Dashboard, Projects, Suppliers i Orders es renderitzen correctament quan no hi ha dades
- [ ] Loading states mostren “Loading…” / equivalents de `common.loading` i no deixen pantalles en blanc
- [ ] Error states mostren missatge humà +, si aplica, un botó de Retry
- [ ] Els botons de Retry (Projects, Orders, Dashboard exec, etc.) criden realment la recàrrega i no produeixen errors addicionals
- [ ] Quan falten dades opcionals (per ex. `supplier.email`, `order.delivery_contact`), la UI mostra “—” o text neutral, no “undefined”
- [ ] Cap taula ni modal peta per accedir a propietats de `null` / `undefined` (relacions opcionals)

---

## 8. Final Decision

**Critical issues found**  
_(llista o enllaços als bugs de severitat “blocker”)_

**Important issues found**  
_(llista o enllaços als bugs de severitat “high” / “medium”)_

**Recommendation**

Marcar una sola opció:

- [ ] **READY FOR EXTERNAL TEST**  
  - Tots els blockers resolts  
  - Els fluxos d’onboarding, workspace i billing són utilitzables sense errors crítics

- [ ] **NOT READY FOR EXTERNAL TEST**  
  - Encara hi ha blockers oberts en:
    - entrada (Landing / Trial / Login / Activation), o
    - workspace switching, o
    - billing lock / access.

