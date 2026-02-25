# Landing Plan — Amazon-first (proposta)

**Objectiu:** `/` = landing pública | `/app` = app (login + producte).  
**Ara:** només documentar. No canviar rutes ni codi fins a activació.

---

## Copy v1

- **Headline:** Stop managing Amazon launches in spreadsheets.
- **Subheadline:** (proposta) *Freedoliapp centralitza projectes, POs, proveïdors i finances per a brands que venen a Amazon — sense fulls de càlcul.*
- **CTA principal:** Start free trial / Començar
- **CTA secundari:** (opcional) Veure com funciona / Demos

---

## Seccions previstes

1. **Hero** — Headline + subheadline + CTA(s) + imatge o mockup.
2. **Pain** — Problemes que resol (launches en Excel, POs dispersos, falta de visibilitat de costos/ROI).
3. **Solution** — Què és Freedoliapp: un sol lloc per projectes, comandes, proveïdors i facturació.
4. **Modules** — Blocs breus: Projects, Purchase orders, Suppliers, Finances, Billing (Stripe).
5. **Pricing** — Pla Core **29€/mes** (o equivalent); link a “Manage billing” / trial.
6. **FAQ** — Preguntes freqüents (preu, trial, cancel·lació, suport).
7. **Footer** — Legal (Terms, Privacy), contacte, xarxes si cal.

---

## Requisits tècnics (quan s’activi)

- **Routes**
  - `GET /` → Landing (pàgina estática o SPA landing).
  - `GET /app`, `GET /app/*` → App actual (redirect a `/` + login si no autenticat, o muntar router app a `/app`).
  - Mantenir `/login`, `/settings`, etc. dins de l’app (p.ex. sota `/app` o com ara segons decidit).

- **Stripe return_url**
  - Success/cancel/return han d’apuntar a l’app, no a la landing:
    - Exemple: `APP_BASE_URL` = `https://freedoliapp.com` → return a `/app/settings` (o `/settings` si l’app segueix a root) segons arquitectura final.
  - Documentar a Edge Functions: `success_url`, `cancel_url`, `return_url` amb la base correcta.

- **Redirects**
  - Si l’app es mou a `/app`: usuaris amb bookmark a `https://freedoliapp.com/` → landing; a `https://freedoliapp.com/app` → app.
  - Redirect 301 opcional: `/dashboard` → `/app` (si s’abandonen rutes antigues).

---

## Checklist d’activació (quan la UI estigui madura)

- [ ] Component o pàgina Landing (Hero, Pain, Solution, Modules, Pricing, FAQ, Footer) implementada.
- [ ] Routes: `/` serveix landing; `/app` (o ruta acordada) serveix app.
- [ ] Links de la landing a “Començar” / “Pricing” apunten a signup o `/app` + login.
- [ ] Stripe (Checkout/Portal) return_url actualitzats si l’app canvia de base path.
- [ ] Redirects Vercel (o app) configurats si cal (p.ex. `/dashboard` → `/app`).
- [ ] Copy i legal (Terms, Privacy) revisats.
- [ ] Preu Core 29€ reflectit a Pricing i a Stripe (producte/price).

---

*Document creat com a pla; cap canvi de rutes ni de codi fins que es dugui a terme la implementació de la landing.*
