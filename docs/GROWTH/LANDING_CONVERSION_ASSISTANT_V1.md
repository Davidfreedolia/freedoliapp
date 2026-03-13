# FREEDOLIAPP — Landing Conversion Assistant V1

## Status
Planned

## Goal

Provide a conversational assistant on the landing page that:

- qualifies visitors
- explains the product
- guides them toward starting a trial

The assistant is designed as a **conversion tool**, not a generic support bot.

---

# 1 — Assistant role

The assistant appears on the **public landing page** and helps visitors quickly understand whether FREEDOLIAPP is relevant for them.

Main tasks:

- **identify visitor type**
- **understand main pain point**
- **guide the user to the correct CTA** (primàriament: Start free trial)

The assistant is **not**:

- a full helpdesk,
- a bug report system,
- a channel for support tickets o incidències tècniques.

---

# 2 — Conversation model

The assistant uses a **hybrid architecture**:

- **Guided flow (primary)**  
  Fluxe de preguntes predefinides, optimitzat per conversió.
- **AI fallback (optional)**  
  Capacitat de respondre preguntes obertes quan l’usuari escriu text lliure.

L’objectiu és mantenir la major part d’interaccions dins del **flow guiat**, utilitzant l’AI només quan realment aporta claredat i sempre redirigint cap al trial.

---

## 2.1 Guided flow (primary)

El flow guiat comença amb una salutació curta i una pregunta de segmentació.

Exemple d’obertura:

> Hi 👋 I'm the Freedoliapp assistant.  
> What best describes you?

Opcions:

1. Amazon FBA seller  
2. Starting a new brand  
3. Agency / team  
4. Just exploring

Segons la resposta, el flow continua amb una o dues preguntes addicionals per:

- entendre la **mida** i **complexitat** (unitats, SKU, mercats),
- identificar el **principal problema operatiu**,
- validar que la persona encaixa amb l’ICP de Freedoliapp.

Objectiu del flow:

- identificar clarament el **main need** de l’usuari abans de proposar la CTA.

---

## 2.2 Example follow-up question

Un cop identificat el tipus de visitant, el bot fa una segona pregunta orientada a **pain**:

> What is your biggest challenge today?

Opcions (exemple):

- Too many spreadsheets  
- Managing suppliers  
- Tracking profitability  
- Scaling operations

En funció de la resposta, el bot:

- pot mostrar una breu frase que connecta el problema amb Freedoliapp (“We help you move your supplier and PO workflow out of spreadsheets into a single workspace.”),
- reforça que el producte està pensat exactament per aquest tipus de dolor.

---

## 2.3 Final step (CTA)

Després de 1–2 preguntes, el flow culmina en una recomanació clara:

> You can start using Freedoliapp in less than 2 minutes.  
>  
> **Start free trial**  
> **See how it works**

Comportament:

- **Start free trial**  
  - obre o navega cap a `/trial`.
- **See how it works**  
  - pot fer scroll a la secció “How it works” / “Screenshots” de la landing, o obrir un petit walkthrough.

Regla:

- el bot sempre intenta acabar amb **com a mínim una CTA clara**,
- evita converses infinites.

---

# 3 — AI fallback

Si l’usuari escriu una pregunta en text lliure (en lloc de triar opcions), l’assistent pot opcionalment cridar un model d’AI.

Exemples de preguntes:

- “Can I import my supplier list?”  
- “Do you support multiple marketplaces?”  
- “Can I connect Gmail?”

Requisits de la resposta AI:

- **concisió**:
  - una o dues frases màxim.
- **respectar l’abast del producte**:
  - no prometre funcionalitats inexistents,
  - no sortir de l’àmbit Amazon ops / sourcing / finances.
- **redirigir cap al trial**:
  - cada resposta ha d’acabar suggerint una acció:
    - “You can test this by starting a free trial.”  
    - “You can connect Amazon and see your real data during the trial.”

L’AI fallback mai ha de:

- donar consell legal o fiscal,
- actuar com a suport tècnic avançat,
- exposar detalls interns d’arquitectura.

---

# 4 — Data collection

El Landing Conversion Assistant V1 recull **dades anònimes d’interacció** per millorar el funnel.

Dades guardades (sense PII):

- tipus de visitant seleccionat:
  - Amazon FBA seller
  - Starting a new brand
  - Agency / team
  - Just exploring
- pain principal seleccionat:
  - Too many spreadsheets
  - Managing suppliers
  - Tracking profitability
  - Scaling operations
- CTA clicada:
  - Start free trial
  - See how it works
  - Cap (es tanca el bot)
- si l’usuari ha arribat realment a iniciar un trial:
  - sí / no (detectat via event posterior, no directament pel bot).

Principi:

- no es guarden emails ni dades personals dins del bot,
- les dades d’interacció serveixen per:
  - mesurar quins segments converteixen millor,
  - entendre quins pains són més freqüents,
  - ajustar el copy de landing i del flow guiat.

---

# 5 — Design principles

El Landing Conversion Assistant V1 ha de complir:

- **simple**:
  - interfície clara, sense menús complexos.
- **evitar converses llargues**:
  - 1–3 preguntes màxim abans de recomanar una acció.
- **evitar chat obert per defecte**:
  - l’entrada principal és per botons / opcions guiades.
- **guia ràpida cap a acció**:
  - tot el disseny està orientat a portar l’usuari cap a:
    - Start free trial
    - o, en segon terme, “See how it works”.

Target de durada:

- conversa **< 60 segons** per a la majoria de visitants.

---

# 6 — Future evolution

Versions futures del Landing Conversion Assistant poden incloure:

- **deeper product explanations**
  - respostes més riques sobre casos d’ús,
  - comparatives amb workflows actuals (Excel, eines disperses).
- **demo walkthroughs**
  - guiar l’usuari per una demo guiada del Dashboard, Projects, Orders, etc.
- **integració amb l’assistent in‑app**
  - reutilitzar el mateix “perfil” d’assistent quan l’usuari entra a l’aplicació,
  - mantenir el context bàsic (tipus d’usuari, pain principal) per adaptar recomanacions internes.

Visió a llarg termini:

- tenir un **assistant coherent** tant a la landing com dins de l’app,
- que entengui:
  - en quin punt del cicle de vida es troba l’usuari,
  - quins són els seus objectius operatius,
  - i pugui recomanar el següent pas adequat tant en mode “pre‑trial” com “post‑trial”.

---

# 7 — Assistant Identity

**Name:** Freedoli

Freedoli is the conversational assistant used both:

- on the landing page (conversion assistant)
- inside the application (onboarding assistant)

The assistant provides a consistent personality across the product.

---

## Avatar

Style guidelines:

- minimal and professional
- circular avatar
- simple friendly expression
- consistent with the Freedoliapp visual identity

Avoid:

- cartoon characters
- overly futuristic robots
- complex illustrations

---

## Personality

Freedoli must sound:

- friendly
- concise
- confident
- action-oriented

Example tone:

> "Great. Freedoliapp helps Amazon sellers manage suppliers,
> orders and inventory from a single workspace.
>
> Would you like to see how it works?"

---

## First message (Landing)

> Hi 👋 I'm Freedoli.
>
> I can help you see if Freedoliapp fits your Amazon business.
>
> What best describes you?

---

## First message (In-app)

> Hi 👋 I'm Freedoli.
>
> Welcome to Freedoliapp.
>
> Let's set up your workspace.

---

# 8 — Assistant Entry Triggers

Freedoli should appear on the landing page under specific conditions
to avoid being intrusive while still helping visitors.

**Triggers:**

- 15 seconds after landing page load
- when user scrolls past 40% of the page
- when user stays idle for 20 seconds
- when user clicks the chat icon

The assistant must **never block the interface**.

**Default state:**

Collapsed chat bubble in the bottom-right corner.

**When opened:**

- Freedoli avatar
- first greeting message
- guided conversation options.
