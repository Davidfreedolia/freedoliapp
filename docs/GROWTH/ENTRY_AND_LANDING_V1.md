# FREEDOLIAPP — Entry Experience & Landing V1

## Status
Planned

## Goal

Define the full public entry experience of FREEDOLIAPP V1:

- Landing page
- Login / Trial entry
- Activation wizard
- Initial service connections
- First assistant interaction

The objective is to allow a new user to go from landing page to dashboard in **under 2 minutes**.

---

# 1 — Entry flow (global)

Full journey for a **new user**:

Landing  
→ Start free trial  
→ Login / Magic link  
→ Activation wizard  
→ Connect services  
→ Dashboard

Journey for an **existing user**:

Landing  
→ Log in  
→ Dashboard

Entry rules:

- The landing page és el punt d’entrada per a tots els usuaris.
- El trial és el camí recomanat per a nous usuaris (no cal crear contrasenya).
- Login està reservat per a:
  - usuaris que ja han iniciat un trial
  - usuaris interns / existents.

---

# 2 — Landing page (one page)

La landing ha de ser una **one‑page** senzilla, clara i orientada a conversió a trial.

## 2.1 Sections

La pàgina conté aquestes seccions principals:

1. **Hero**  
2. **Problem**  
3. **Solution**  
4. **How it works**  
5. **Product screenshots**  
6. **Pricing (high level)**  
7. **Final CTA**

## 2.2 Hero

**Headline**

> “The control tower for Amazon sellers”

**Subheadline**

> “Manage sourcing, suppliers, inventory, orders and profit  
> from a single workspace.”

**Primary CTA**

- **Start free trial**  
  - porta a `/trial`
  - és el botó destacat en desktop i mobile.

**Secondary CTA**

- **Log in**  
  - porta a `/login`
  - per a usuaris existents.

## 2.3 Problem

Objectiu: explicar el **mal de cap actual** del seller:

- massa fulls de càlcul
- eines disperses (Amazon, Excel, eines de shipping, finance…)
- manca de visibilitat operativa (què passa ara? què està bloquejat?).

El text ha de:

- parlar des del punt de vista de l’operador/seller,
- evitar tecnicismes,
- fer evident que el problema és la **fragmentació**.

## 2.4 Solution

Objectiu: explicar el concepte FREEDOLIAPP com **solució centralitzada**.

Missatge clau:

> Freedoliapp centralizes Amazon operations.

Punts a destacar:

- gestió de **suppliers**
- seguiment de **producció**
- **purchase orders**
- **shipments**
- **inventory**
- **profit** i marge.

Tot visible des d’una única **control tower**:

- un sol workspace,
- una sola visió de la situació actual,
- decisions operatives clares.

## 2.5 How it works

Explicar el funcionament en **3 passos simples**:

1. **Connect Amazon**  
   - l’usuari connecta el seu compte Amazon Seller Central.
2. **Add suppliers and products**  
   - es registren proveïdors i projectes / productes.
3. **Track operations and profit**  
   - es segueixen comandes, enviaments, inventari i resultats.

Objectiu: transmetre que l’entrada és ràpida i que el sistema no requereix una configuració llarga.

## 2.6 Screenshots

Mostrar captures de les pantalles clau del producte:

- **Dashboard**
  - visió de situació general, KPIs bàsics, alertes.
- **Projects**
  - pipeline de producte / projecte.
- **Orders**
  - llista de POs i estat.
- **Profit analytics**
  - visió simple de beneficis i marges.

Aquestes imatges han de:

- ser clares i llegibles,
- reforçar la idea de control operatiu,
- no saturar l’usuari amb massa detall.

## 2.7 Pricing

Secció de **Pricing** minimalista:

- explicar que hi ha un pla de pagament (sense requerir seleccionar‑lo en aquest moment),
- deixar clar que hi ha un **trial** abans de compromís,
- opcionalment, indicar si el pricing és “simple” (per org, per seat, etc.) sense entrar en taules complexes.

## 2.8 Final CTA

Al final de la pàgina:

- repetició del missatge principal,
- **CTA final**:
  - **Start free trial**

La idea és que, en arribar al final, l’usuari tingui un únic següent pas clar.

---

# 3 — Login / Entry

L’entrada d’identitat ha de ser **simple** i coherent amb la landing.

## 3.1 Authentication options

Opcions suportades a V1:

- **Google login** (OAuth via Supabase)
- **Magic link (email)**  
  - l’usuari introdueix email i rep un enllaç per entrar

Per simplicitat, **passwords es minimitzen o s’eviten** en l’entrada principal de V1.

## 3.2 Entry page

La pàgina d’entrada (Login) ha de contenir:

- enllaç / CTA cap a **Start free trial** (per nous usuaris)
- controls per:
  - **Log in** amb Google
  - **Log in** amb magic link (email)

Regla:

- nous usuaris haurien de ser empesos cap a `/trial`,
- `/login` és principalment per a:
  - usuaris que tornen
  - usuaris interns.

---

# 4 — Activation wizard

El **Activation Wizard** s’inspira en fluxos d’onboarding de:

- Asana
- Notion
- Stripe

Requisit clau: ha de ser **extremadament simple**.

## 4.1 V1 steps

Passos mínims per V1:

1. **Workspace name**
   - L’usuari confirma o escull el nom del seu workspace.
2. **Connect Amazon**
   - Pas per connectar Amazon Seller Central (o ometre i continuar en mode Setup).
3. **Done**
   - Confirmació que l’espai està llest.
   - CTA per entrar al Dashboard.

Els textos han de ser clars i evitar tecnicismes.

## 4.2 Optional later steps

Passos futurs (no per V1 inicial):

- **Invite team**
  - convidar altres usuaris al workspace.
- **Import data**
  - importar dades existents (per ex., POs, productes, proves).

Aquests passos es poden afegir després sense trencar l’esquelet principal de l’onboarding.

---

# 5 — Connect services

Després de crear el workspace i completar els passos bàsics d’activació, l’usuari veu una pantalla de **connexió de serveis**.

Elements mostrats:

- **Connect Amazon Seller Central** (crític per V1)
- **Connect Gmail (optional)** (futur / opcional)
- **Import existing data (future)**:
  - import de CSV,
  - import des d’altres sistemes (post‑V1).

Regla per V1:

- només la connexió **Amazon** és considerada **crítica** per captar valor.
- la UI ha de permetre que l’usuari n’entengui la importància, però també suportar cas “encara no el vull connectar” (Setup mode).

---

# 6 — First dashboard experience

Quan l’usuari entra per primera vegada al Dashboard:

La UI ha de:

- mostrar un **first‑value banner**,
- presentar un **assistant / helper d’onboarding** (mínimament),
- reduir la sensació de “pantalla buida”.

## 6.1 First‑value banner

Exemple de missatge:

> “Welcome to Freedoliapp 👋  
> Let’s set up your workspace.”

Accions suggerides:

- **Connect Amazon**
- **Create first product / project**
- **Add supplier**

El banner:

- apareix només al principi (o fins que l’usuari el tanqui / compleixi el primer pas),
- no bloqueja la resta del Dashboard,
- és clar i orientat a l’acció.

## 6.2 Onboarding assistant

L’assistent no és encara un agent d’IA complet, sinó un **helper GUI**:

- pot aparèixer com a:
  - panell lateral,
  - modal lleuger,
  - widget al Dashboard.
- Rol:
  - explicar els **propers passos**,
  - enllaçar ràpidament a:
    - Projects
    - Suppliers
    - Orders
    - Billing (si és rellevant).

---

# 7 — Virtual assistant (V1)

La versió V1 de l’assistent és **d’onboarding**, no un agent general.

Funcions:

- **Explain next actions**
  - “Connecta Amazon per veure dades reals”
  - “Crea el teu primer projecte”
  - “Afegeix un proveïdor”
- **Guide user to core modules**
  - botons / enllaços que porten a les seccions clau.
- **Reduce empty dashboard confusion**
  - explicant què es veurà un cop hi hagi dades,
  - evitant que l’usuari es quedi sense saber què fer.

No fa:

- decisions automatitzades,
- edició directa de dades,
- automatitzacions complexes.

---

# 8 — Design principles

La **entry experience** ha de seguir aquests principis:

- **extremely low friction**
  - pocs passos,
  - pocs camps obligatoris,
  - mínim de decisions per pantalla.
- **no complex forms**
  - evitar formularis llargs o amb molts detalls abans de mostrar valor.
- **no technical terminology**
  - parlar el llenguatge del seller, no el del desenvolupador.
- **clear path to first value**
  - sempre hi ha un següent pas clar (“Connecta Amazon”, “Crea projecte”, “Afegeix proveïdor”).

**Target**:

- un usuari nou ha de poder arribar al Dashboard en **menys de 2 minuts**:
  - llegir el Hero,
  - clicar “Start free trial”,
  - completar trial/login,
  - passar per l’Activation Wizard,
  - entrar al Dashboard amb una invitació clara al següent pas.

