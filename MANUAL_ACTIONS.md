# Manual actions — David

Llista viva de coses que **només pots fer tu** (no es poden fer des de codi). Conforme les facis, marca-les amb `[x]`.

Última actualització: 2026-05-14.

---

## 🔴 Crítiques — abans del primer client de pagament

### Alta com a autònom (o SL)
- [ ] Decidir entre **autònom** (tarifa plana primer any ~80€/mes) o **SL** (alta ~3.000€ + 1.500€ capital). Per a un SaaS amb intenció de créixer, **SL recomanada** — separa el risc personal.
- [ ] Alta a Hisenda: model 036/037 amb epígraf adequat (IAE 845.9 "Servicios de procesamiento de datos" o similar)
- [ ] Alta a la Seguretat Social com a autònom (si autònom)
- [ ] Compte bancari de negoci separat del personal
- [ ] Registrar-se al règim **OSS** (One-Stop Shop) per cobrar VAT a clients UE: https://sede.agenciatributaria.gob.es/Sede/iva/regimen-especial-ventanilla-unica.html
- [ ] Avisar-me un cop fet — activaré Stripe `automatic_tax` i Stripe live mode

> Mentrestant: 5-10 beta testers gratis ≠ activitat econòmica. **Cap pagament real** fins a aquí.

### Re-deploy Supabase Edge Functions (rate limiting + Stripe tax pre-wire)
Necessari **immediatament** perquè el codi nou de rate-limiting + el flag de Stripe automatic_tax estigui actiu. Vercel només desplega el frontend; les Functions són un deploy a part.

Opció A — via Supabase CLI (instal·lat? `npm i -g supabase`):
```
supabase login
supabase link --project-ref edjwsrkcxcktnbbskpjy
supabase functions deploy stripe-checkout-session
supabase functions deploy stripe-portal-session
supabase functions deploy ai-research-analyst
supabase functions deploy asin-enrich
supabase functions deploy ai-quote-analyst
```

Opció B — manualment al dashboard de Supabase:
- Edge Functions → cada una de les 5 → "Deploy" amb el codi més recent

Després verifica que cap usuari diu que les seves crides fallen amb 429 inesperat — els límits són:
- Stripe checkout: 5/min/user
- Stripe portal: 10/min/user
- AI research: 6/min/user (cost per crida $$$)
- ASIN enrich: 20/min/user

Si trobes que algun és massa restrictiu, edita `supabase/functions/_shared/rateLimit.ts` o el `capacity`/`refillPerSecond` de la funció concreta.

### Stripe live mode — checklist exacta

> ⚠️ **Lectura abans de fer-ho**: Stripe acceptarà l'alta amb el teu DNI personal. PERÒ Hisenda diferencia entre el que Stripe permet i el que la llei permet. Cobrar SaaS recurrent sense alta autonom és **activitat econòmica encoberta**: si la quantia és petita i puntual ningú es queixa, però:
> - Quan acumulis >3.000-5.000€/any és quasi segur que t'inspeccionin
> - Si un client demana factura amb IVA, no la pots emetre legalment
> - La RGPD demana "responsable del tractament identificat" — si no hi ha empresa, el responsable ets tu personalment amb totes les conseqüències
>
> El **codi ja està live-ready**: només cal flipar config. La decisió de fer-ho és teva — això són les passes mecàniques.

**Pas 1 — Stripe Dashboard (https://dashboard.stripe.com/)**

- [ ] Settings → Account details → completar dades (DNI/NIE, adreça, IBAN per pagaments)
- [ ] Settings → Account → Activate payments → completar identity verification
- [ ] Quan estigui aprovat, top-left switcher: **Test mode → Live mode**
- [ ] Settings → Subscriptions:
  - [ ] Smart Retries → ON
  - [ ] Dunning emails → totes les notificacions ON
  - [ ] Cancel subscription after failed attempts → 4 intents
- [ ] (Opcional, quan tinguis l'alta) Settings → Tax → Activate → afegir país Spain

**Pas 2 — Crear preus en mode live**

Els 3 preus actuals (Starter €29, Growth €79, Scale €199) estan creats en test mode. Has de recrear-los en live:

- [ ] Stripe (live mode) → Products → crear 3 productes:
  - "Freedoliapp Starter" — recurrent mensual 29 EUR + anual 348 EUR (o el que decideixis)
  - "Freedoliapp Growth" — 79 EUR mes
  - "Freedoliapp Scale" — 199 EUR mes
- [ ] Copia els `price_id` de cadascun (comencen amb `price_...`)

**Pas 3 — Secrets a Supabase Functions**

URL: https://supabase.com/dashboard/project/edjwsrkcxcktnbbskpjy/functions

Per cada funció (`stripe-checkout-session`, `stripe-portal-session`, `stripe_webhook`):
- [ ] Settings → Secrets → afegir/actualitzar:
  - `STRIPE_SECRET_KEY` = clau **live** (`sk_live_...`) — Stripe Dashboard → Developers → API keys
  - `STRIPE_PRICE_GROWTH` = `price_xxx` (live)
  - `STRIPE_PRICE_PRO` = `price_xxx` (live)
  - `STRIPE_PRICE_AGENCY` = `price_xxx` (live)
  - `SITE_URL` = `https://freedoliapp.com` (ja per defecte; només confirma)
- [ ] **`STRIPE_ENABLE_AUTOMATIC_TAX=true`** quan tinguis alta + Stripe Tax activat. Mentrestant deixa-ho a `false` o no l'afegeixis — sense això Stripe rebutjaria la sessió per falta de tax setup.

**Pas 4 — Webhook live**

- [ ] Stripe Dashboard (live) → Developers → Webhooks → "Add endpoint"
- [ ] URL: `https://edjwsrkcxcktnbbskpjy.supabase.co/functions/v1/stripe_webhook`
- [ ] Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`
- [ ] Copia el "Signing secret" (`whsec_...`)
- [ ] Supabase → Edge Functions → `stripe_webhook` → Secrets → `STRIPE_WEBHOOK_SECRET` = `whsec_...` (live)

**Pas 5 — Vercel env vars**

- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_live_...` (Stripe → Developers → API keys → Publishable key)
- [ ] Production scope. **No** afegir a Preview/Dev — manté el test mode per al dev workflow.
- [ ] Re-deploy Vercel (Settings → Deployments → re-deploy)

**Pas 6 — Re-deploy Edge Functions**

Veure secció "Re-deploy Supabase Edge Functions" més avall.

**Pas 7 — Smoke test**

- [ ] Crear un usuari de prova nou (correu real)
- [ ] Fer signup → trial → upgrade flow amb la teva **targeta real**, ~30€
- [ ] Verificar:
  - Subscription apareix a Stripe Dashboard (live)
  - `billing_subscriptions` table té la row al Supabase
  - Customer Portal funciona (botó "Manage billing")
- [ ] Cancel·lar la subscripció i reembossar-te (Stripe → refund)

**Si fas tax automatic_tax abans de l'alta**, Stripe Checkout dirà error tipus "tax_origin_not_configured" — això és el bloqueig que t'estalvia el flag. Mantén `STRIPE_ENABLE_AUTOMATIC_TAX` a `false` fins que tinguis alta + Stripe Tax activat.

---

## 🟡 Importants — gratis, 5-10 minuts

### Supabase Dashboard
URL: https://supabase.com/dashboard/project/edjwsrkcxcktnbbskpjy/

- [ ] **Authentication → Policies** → activar "**Leaked Password Protection**"
  - Filtra contrasenyes que apareixen a leaks coneguts (Have I Been Pwned)
  - Gratis, recomanat per GDPR
  - 30 segons

- [ ] **Settings → Auth → Database connections** → canviar de "**Absolute**" → "**Percentage**" (25% recomanat)
  - Permet que l'Auth server escali amb la mida de la instància
  - Sense això, mai passarà de 10 connexions encara que apuges de plan

- [ ] **Settings → API → JWT settings** → verificar que JWT expiry ≥ 3600s (1h) per a UX raonable

- [ ] **Settings → Auth → URL Configuration** → verificar que les URL de "Site URL" i "Redirect URLs" inclouen:
  - `https://freedoliapp.com`
  - `https://freedoliapp.com/login`
  - `http://localhost:5173` (per a dev)

### Stripe Dashboard (mode test, vàlid abans de l'alta)
URL: https://dashboard.stripe.com/

- [ ] **Settings → Subscriptions → Smart Retries** → activar (recovery automàtic de pagaments fallits)
- [ ] **Settings → Subscriptions → Dunning emails** → activar tots els recordatoris
- [ ] **Settings → Subscriptions → Cancel after failed attempts** → 4 intents abans de cancel·lar
- [ ] **Webhooks** → verificar que la signatura `STRIPE_WEBHOOK_SECRET` està a Supabase Functions (Edge Functions → stripe_webhook → Secrets)

### Vercel Dashboard
URL: https://vercel.com/freedolias-projects-77c959bb/freedoliapp

- [ ] **Settings → Security → Vercel BotID** → activar al pla Pro (si encara no)
  - Protecció anti-bot a `/trial` i `/login`
  - Gratis a Pro

- [ ] **Settings → Speed Insights** → activar
  - Real User Metrics gratis al pla Pro
  - Sap si els clients tenen lag

- [ ] **Analytics → Web Analytics** → activar
  - Page views, bounce rate, top pages — gratis al Pro

---

## 🟠 Moderades — mig temps

### Imatges del marketing (regenerar 2 PNGs)
Captures velles amb keys i18n no resoltes i Decision Dashboard antic (cards negres).

- [ ] Logar-te al producte un cop desplegat
- [ ] Fer screenshots de:
  - Dashboard amb el botó "Crear producte" — substitueix `public/images/landing/landing-hero-dashboard.png`
  - Decision Dashboard amb cards blanques — substitueix `public/images/landing/landing-decisions-dashboard.png`
- [ ] Idealment passar a WebP per estalviar ~50% pes

### Política de privacitat (revisió legal)
- [ ] Pagar revisió a un advocat de tecnologia / RGPD (1 vegada, ~200-500€)
- [ ] Actualitzar `src/pages/legal/Privacy.jsx` amb el text revisat
- [ ] Mateix amb Terms i DPA (uns 300€ pack si els fas alhora)
- [ ] Subprocessor list pública: enumerar Supabase, Vercel, Stripe, Anthropic, Google Drive, etc.

---

## 🟢 Opcionals — quan tinguis temps

- [ ] **Status page** ([instatus.com](https://instatus.com) o [statuspage.io](https://statuspage.io)) — uns 20€/mes. Quan caigui un servei, els clients ho veuen sense escriure'te.
- [ ] **Help center / docs** públics (eg [GitBook](https://gitbook.com), [Notion](https://notion.com)) — onboarding self-service
- [ ] **Vídeo onboarding** de 2-3 min (Loom) per posar al primer email de benvinguda
- [ ] **Live chat** ([Intercom](https://intercom.com), [Crisp](https://crisp.chat) gratis fins a 2 agents) — clients beta es queixaran d'alguna cosa, és inevitable
- [ ] **Domini d'email** professional configurat amb SPF/DKIM/DMARC: hello@freedoliapp.com, support@freedoliapp.com
- [ ] **Newsletter** ([Resend](https://resend.com) per a transactional + [Beehiiv](https://beehiiv.com) per a marketing)

---

## 🤖 Coses fetes pel codi (per a referència)

Marcadas com a `[x]` perquè ja són a producció.

- [x] Auditoria de seguretat completa (super-admin model, trial_registrations RLS, etc.)
- [x] i18n complet a ca/es/en a totes les superfícies del beta
- [x] Disseny modern unificat (cards, modals, toasts, focus rings)
- [x] FK indexes a 69 taules (Wave 1)
- [x] Security headers a vercel.json (HSTS, X-Frame-Options, etc.)
- [x] llms.txt per a crawlers d'IA
- [x] Lighthouse: a11y 93, best-practices 96, SEO 100
- [x] 0 ERRORs al Supabase advisor (eren 24)
- [x] 0 bugs `no-undef` a producció (eren 15+)
