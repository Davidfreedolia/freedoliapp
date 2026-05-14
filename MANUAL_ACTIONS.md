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

### Stripe live mode (depèn de l'alta)
- [ ] Quan tinguis l'alta, ves a Stripe Dashboard → Account Status → activar pagaments en viu
- [ ] Verificar identitat (DNI/escriptura SL)
- [ ] Configurar Stripe Tax (Settings → Tax → Activate)
- [ ] Pujar les claus live (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`) a Vercel + Supabase Functions
- [ ] Re-crear el webhook de Stripe apuntant a la URL live de la funció `stripe_webhook`

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
