# FREEDOLIAPP — V1 Internal Test Plan

## Status
Draft

## Goal
Define the internal test flow for validating V1 before showing it to real customers.

## Scope
This plan only covers the currently implemented V1 product.  
It does **not** include post‑V1 roadmap items or modules that are still documented‑only.

Core areas included:

- public entry (Landing, Trial, Login)
- activation / onboarding
- workspace selection and switching
- main application shell (Topbar + Sidebar)
- core operational modules (Dashboard, Projects, Suppliers, Orders)
- billing access / lock flows already implemented
- language behavior for EN / ES / CAT
- empty / loading / error states on the main surfaces

---

## 1. Test Areas

The following product areas must be exercised during internal V1 testing:

- **Landing**
  - Root public page (`/`) with hero, CTAs i enllaços de peu de pàgina.
- **Trial**
  - Trial page (`/trial`) amb formulari d’email i consentiment de màrqueting opcional.
- **Login**
  - Login d’usuaris existents (`/login`) amb:
    - email/password
    - magic link
    - Google OAuth
    - Apple OAuth
- **Activation**
  - Activation Wizard (`/activation`) amb:
    - selecció de workspace
    - camí Amazon vs. setup
    - connexió Amazon (si es prova en entorn amb SP‑API)
    - snapshot inicial i entrada a l’app.
- **Workspace selection**
  - Selector de workspace al Topbar amb:
    - nom dinàmic del workspace
    - llista de workspaces disponibles
    - canvi d’org actiu sense errors.
- **Dashboard**
  - Home / Dashboard (`/app`) amb:
    - banner de first‑value
    - KPIs principals
    - panell d’alertes
    - widgets de performance i operations
    - widgets de decisions/reorder.
- **Projects**
  - Llista de projectes (`/app/projects`) i detalls:
    - llista, filtres, vista de targetes
    - modal de nou projecte
    - navegació a detail view.
- **Suppliers**
  - Llista de proveïdors (`/app/suppliers`) amb:
    - stats
    - filtres
    - targetes de proveïdor
    - modal d’edició/creació
    - empty state.
- **Orders**
  - Llista de comandes / purchase orders (`/app/orders`) amb:
    - stats
    - filtres
    - targetes o taula
    - modal de nova comanda
    - modal de detall.
- **Billing access / lock flows**
  - Comportament d’accés segons estat de billing:
    - accés normal a funcionalitat quan l’org està activa
    - redirecció a pantalles de bloqueig quan el billing no està actiu o hi ha over‑seat.
- **Language behavior**
  - Comportament de l’idioma de la UI per:
    - EN
    - ES
    - CAT
  - Especialment en:
    - Landing / Trial / Login
    - Dashboard
    - Topbar / Sidebar
    - Billing.
- **Empty / loading / error states**
  - Empty state a:
    - Dashboard (sense dades)
    - Projects (sense projectes)
    - Suppliers (sense proveïdors)
    - Orders (sense comandes, amb i sense filtres)
  - Loading states consistents (ús de `common.loading`)
  - Error states amb missatge clar i botó de retry on existeixi.

---

## 2. Test Profiles

Internal testing s’ha de fer amb diversos perfils per cobrir casos reals:

- **New user starting from zero**
  - No té cap workspace previ.
  - Entra via landing → trial → magic link → activació → home.
- **Existing org user**
  - Ja té workspace actiu.
  - Entra directament per `/login`.
  - Ha de saltar l’activació si ja està completada i arribar al Dashboard.
- **User with incomplete data**
  - Workspace creat però:
    - pocs o cap projecte
    - cap proveïdor
    - poques o cap comanda
  - Exercita empty states i primeres creacions de dades.
- **User with billing locked state**
  - Org en estat de billing que bloqueja l’accés complet.
  - Hauria de veure pantalles de lock / avisos clars i camins per resoldre (per ex., anar a Billing).
- **User with multiple workspaces**
  - Mateix usuari assignat a més d’una org.
  - Pot canviar de workspace des del Topbar i veure:
    - canvis coherents en llistats / dades
    - cap error ni fuga de dades entre orgs.

---

## 3. Test Scenarios

A continuació es defineixen escenaris agrupats per àrea. Cada escenari inclou **acció** i **resultat esperat**.

### 3.1 Landing

- **Acció**: Obrir `/` en navegador nou.  
  **Resultat esperat**: Hero visible, CTA principal “Start free trial”, CTA secundari “Sign in”, enllaços legals i de peu de pàgina funcionals.

- **Acció**: Fer clic a “Start free trial”.  
  **Resultat esperat**: Navegació a `/trial` sense errors de consola.

### 3.2 Trial

- **Acció**: A `/trial`, introduir email vàlid i enviar el formulari.  
  **Resultat esperat**: No hi ha validacions inesperades; es mostra missatge d’èxit indicant que s’ha enviat un magic link.

- **Acció**: Deixar el checkbox de màrqueting desmarcat i enviar.  
  **Resultat esperat**: El flux no es bloqueja; el trial es registra igualment.

- **Acció**: Fer clic a l’enllaç “Already have an account? Sign in”.  
  **Resultat esperat**: Navegació a `/login`.

### 3.3 Login

- **Acció**: Provar login amb email/password correcte.  
  **Resultat esperat**: Inici de sessió exitós, redirecció cap al flux d’activació o directament a `/app` segons estat.

- **Acció**: Activar mode magic link i enviar un email vàlid.  
  **Resultat esperat**: Missatge de “magic link enviat”; en seguir l’enllaç, la sessió queda activa i es continua el flux.

- **Acció**: Provar “Continue with Google” i “Continue with Apple” amb configuració de proves.  
  **Resultat esperat**: Redirecció correcta via Supabase, retorn a `/`, sessió activa i accés a l’app sense loops ni errors.

### 3.4 Activation

- **Acció**: Accedir a `/activation` com usuari nou amb org pendent.  
  **Resultat esperat**: Es mostren passos d’activació, es pot confirmar workspace i escollir camí (Amazon vs setup).

- **Acció**: Completar activació en mode Setup (sense connectar Amazon).  
  **Resultat esperat**: Llençament cap al Dashboard, sense errors ni pantalles trencades, amb estat de dades inicial coherent (pocs o cap projecte).

### 3.5 Workspace selection

- **Acció**: Amb usuari que té 2+ workspaces, fer clic al selector de workspace al Topbar.  
  **Resultat esperat**: Dropdown mostra llista de workspaces amb nom i rol, el workspace actual marcat com actiu.

- **Acció**: Canviar de workspace.  
  **Resultat esperat**: Es tanca el menú; les dades de Dashboard / Projects / Suppliers / Orders reflecteixen la nova org; no hi ha errors ni dades barrejades.

### 3.6 Dashboard

- **Acció**: Obrir `/app` amb org sense dades (cap projecte ni comandes).  
  **Resultat esperat**: Banner de “first value” visible, KPIs i widgets no peten; on no hi ha dades es mostren missatges de “no data” o empty states.

- **Acció**: Obrir `/app` amb org amb dades (projectes, comandes, alertes).  
  **Resultat esperat**: KPIs omplerts, panells d’alertes plens, widgets de performance i operations funcionant; cap crash.

### 3.7 Projects

- **Acció**: Obrir `/app/projects` amb zero projectes.  
  **Resultat esperat**: Empty state coherent (“No projects yet” / variants), CTA “Create project” operatiu.

- **Acció**: Crear el primer projecte via NewProjectModal.  
  **Resultat esperat**: El projecte apareix a la llista; es pot obrir el detall sense errors.

- **Acció**: Provar filtres (per fase, marketplaces, descartats) amb combinacions que retornin 0 resultats.  
  **Resultat esperat**: Cap crash; el missatge d’empty + CTA segueix sent usable.

### 3.8 Suppliers

- **Acció**: Obrir `/app/suppliers` sense proveïdors.  
  **Resultat esperat**: Empty state amb missatge i CTA “Create supplier”; cap error.

- **Acció**: Crear un proveïdor bàsic i comprovar que:
  - es mostra targeta coherent,
  - els camps opcionals (telèfon, notes, incoterm) poden estar buits sense trencar la UI.

### 3.9 Orders

- **Acció**: Obrir `/app/orders` sense comandes.  
  **Resultat esperat**: Empty state amb text i CTA “Create order”; cap crash.

- **Acció**: Crear una comanda lligada a un projecte i proveïdor.  
  **Resultat esperat**: La llista mostra files correctament, el modal de detall carrega sense errors.

- **Acció**: Obrir modal de detall d’una comanda amb relacions parcials o nul·les (per exemple, sense `supplier` carregat).  
  **Resultat esperat**: Cap accés a `undefined`; els camps mostren `-` on falti informació.

### 3.10 Billing access / lock flows

- **Acció**: Entrar amb org en estat actiu.  
  **Resultat esperat**: L’app es pot fer servir normalment; secció de Billing accessible.

- **Acció**: Entrar amb org en estat que bloqueja funcionalitat (lock / over‑seat).  
  **Resultat esperat**: L’usuari veu les pantalles de bloqueig corresponents, amb missatge clar i enllaços d’acció (per exemple, anar a Billing); no hi ha loops infinits.

### 3.11 Language behavior

- **Acció**: Canviar idioma de la UI a EN i recórrer Landing, Trial, Login, Dashboard, Projects, Suppliers, Orders, Billing.  
  **Resultat esperat**: Cap pantalla barrejant idiomes de forma crítica; etiquetes principals, botons i missatges d’error/loading consistentment en anglès.

- **Acció**: Repetir prova en ES i CAT.  
  **Resultat esperat**: Mateix criteri; es permet alguna cadena puntual pendent, però no als fluxos crítics (entrada, dashboard, billing).

### 3.12 Empty / loading / error states

- **Acció**: Forçar carregues lentes (per exemple, throttling de xarxa) i comprovar `common.loading` en:
  - Dashboard (exec dashboard, homeData)
  - Projects
  - Suppliers
  - Orders.  
  **Resultat esperat**: Spinners / missatges de loading clars, sense parpelleigs estranys ni errors.

- **Acció**: Simular errors de càrrega (per ex., tall de xarxa local) en llistes principals.  
  **Resultat esperat**: Es veu missatge d’error llegible + botó de “Retry” (`common.retry`), sense pantalla en blanc.

---

## 4. Go / No-Go Checks

Abans de convidar usuaris externs, s’han de complir com a mínim aquests criteris interns:

- **No screen crashes**
  - Cap ruta de V1 (`/`, `/trial`, `/login`, `/activation`, `/app/*`) ha de produir errors fatals ni pantalles en blanc.

- **No mixed-language critical screens**
  - Landing, Trial, Login, Dashboard, Topbar/Sidebar i Billing no han de barrejar idiomes de manera visible en el mateix screen per a un idioma seleccionat.

- **Core flows reachable**
  - Des de `/` es pot arribar a:
    - Trial
    - Login
    - Activation
    - Dashboard
    - Projects / Suppliers / Orders
  sense enllaços trencats ni rutes “sense sortida”.

- **Billing lock understandable**
  - En estat de lock, l’usuari veu missatges clars que expliquen:
    - per què està bloquejat
    - què pot fer (anar a Billing, gestionar subscripció, etc.).

- **Workspace switching stable**
  - Canviar de workspace no provoca:
    - errors de JS
    - dades inconsistents
    - UI en estat intermedi trencat.

---

## 5. Bug Logging Format

Els bugs interns s’han de registrar amb el format mínim següent:

- **Area**: exemple, “Projects”, “Dashboard”, “Billing lock”.
- **Steps to reproduce**: llista clara de passos (1, 2, 3…).
- **Expected**: què s’esperava que passés.
- **Actual**: què passa realment.
- **Severity**:
  - `blocker` (impedeix flux crític o provoca crash)
  - `high` (impacte fort però amb workaround)
  - `medium` (error visible però no bloquejant)
  - `low` (polish / copy / petits detalls visuals).
- **Screenshot/video**: captura o clip curt que mostri el problema.
- **Status**:
  - `open`
  - `in_progress`
  - `fixed`
  - `won't_fix` (amb justificació).

---

## 6. Exit Criteria

La fase de testing intern de V1 es pot considerar completa quan:

- **Tots els blockers estan resolts**
  - Cap bug amb severitat `blocker` resta obert.

- **No hi ha bloquejos al camí d’onboarding**
  - Un usuari nou pot:
    - arribar a la landing,
    - iniciar un trial,
    - autenticar-se,
    - passar per l’activació,
    - entrar a l’app i crear el seu primer projecte.

- **No hi ha bloquejos al flux de workspace**
  - Un usuari amb múltiples workspaces pot canviar entre orgs sense errors ni confusió.

- **No hi ha bloquejos al flux d’accés per billing**
  - Les orgs actives poden utilitzar l’app.
  - Les orgs bloquejades veuen missatges clars i camins per resoldre-ho.

- **Els principals empty / loading / error states s’han validat**
  - I es comporten segons l’especificació (no hi ha pantalles “trencades” quan falta informació).

Quan tots aquests criteris es compleixen, FREEDOLIAPP V1 està preparada per passar de testing intern a proves amb un primer grup reduït d’usuaris reals.

