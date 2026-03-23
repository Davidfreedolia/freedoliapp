# FREEDOLIAPP — Política d’idioma de producte (Track B — B3)

**Estat:** font de veritat de planificació i auditoria (documentació).  
**Bloc:** Track B — **B3 — Canonització d’idioma de l’app** (política + governança + auditoria de repo).  
**No és:** implementació del selector (B4), refactor massiu de copy, harmonització visual (B6), superfície UX de l’assistent (B5), Amazon/SP-API.

**Documents relacionats:** `docs/ROADMAP/TRACK_B_CANONICAL_PLAN.md` (ordre B2–B7); `docs/PRODUCT/CANONICAL_UI_SYSTEM.md` (B2).

---

## 1. Política d’idioma canònica

### 1.1 Idioma font (source of truth)

| Rol | Idioma | Ús |
|-----|--------|-----|
| **Copy de producte UI** (etiquetes, botons, missatges d’error/èxit de sistema, buits, navegació) | **Català** | Text **canònic** que defineix significat i to; és el que s’escriu **primer** en crear o canviar claus. |
| **Traduccions** | **Castellà (es)** i **Anglès (en)** | Han de **seguir el català** com a referència semàntica, no inventar producte paral·lel. |

### 1.2 Separació: copy de sistema vs dades de l’usuari

| Tipus | Tractament |
|-------|------------|
| **UI de producte** (fixada al repo) | Claus i18n; català font; es/en com a traduccions. |
| **Contingut introduït per l’usuari** (noms de projecte, notes, descripcions PO, etc.) | **No** es tradueix automàticament; es mostra tal qual (amb format local opcional: dates/importos). |
| **Valors enumerats persistits** (p. ex. `status` de comanda a BD) | El codi ha de **mapear** a claus de text traduïble de forma **consistent** entre locales; la mateixa clau o mateix conjunt de claus per al mateix estat. |
| **Textos d’API / errors tècnics raw** | Idealment embolcallats amb missatge de producte (clau); si es mostra text brut, tractar-ho com a deute conegut. |

---

## 2. Regles de governança (execució futura)

1. **Cap copy nova d’UI hardcoded** al JSX excepte justificació excepcional (p. ex. string tècnic temporal amb ticket de migració).
2. **Ordre de treball:** afegir/actualitzar **primer** `ca.json` (o estructura equivalent), després alinear **es** i **en** al mateix arbre de claus.
3. **Estabilitat semàntica de claus:** canviar el **nom** de la clau només quan canvia el **concepte**; canvis de redacció fan servir la mateixa clau.
4. **Sense duplicats paral·lels** per al mateix concepte (p. ex. `save` vs `common.save` sense motiu); consolidar sota un namespace coherent (`common.*`, `orders.*`, etc.).
5. **Completitud:** quan s’afegeix una clau a `ca`, s’han d’afegir **placeholders idèntics** (`{{name}}`) a es/en; evitar claus només en un locale en estat “fet”.
6. **Estats operatius:** els mateixos estats de negoci han de tenir **el mateix significat** a tots els idiomes (no canviar el to legal/operatiu entre locales).
7. **Revisió:** canvis de copy que afectin compliance, billing o permisos han de ser **conscients** (fora d’abast d’aquest doc, però vinculats a qualitat).

---

## 3. Límits d’abast (B3 vs altres blocs)

| Inclòs a B3 | Exclòs (altres blocs o treball posterior) |
|-------------|------------------------------------------|
| Política canònica i regles | **B4:** selector in-app, persistència unificada, `changeLanguage`, UX (**implementat al repo:** vegeu §4.7) |
| Aquesta auditoria de repo | **Implementació:** migrar pantalles senceres a i18n (tall per tall) |
| Referències a estructures existents | **B6:** polish visual |
| | **B5:** UX assistent (alineada amb B2 + política d’idioma, però no aquí) |

**No es reclama** consistència lingüística completa a producció: el repo encara barreja hardcoded, i18n i sistemes paral·lels (vegeu §4).

---

## 4. Auditoria de repo (estat real al moment de B3)

*Mètode: revisió de `src/i18n`, mostreig de pàgines/components, comparació automatitzada de claus plana `ca` vs `en` vs `es`, i verificació de parse JSON.*

### 4.1 On ja hi ha i18n (react-i18next)

- **Fitxers de locale:** `src/i18n/locales/ca.json`, `en.json`, `es.json` — estructura nested per dominis (`activation`, `dashboard`, `nav`, `tasks`, `help`, etc.).
- **Inicialització:** `src/i18n/index.js` — `fallbackLng: 'ca'`; **`lng` inicial** des de `resolveInitialLanguage()` (`src/i18n/languageStorage.js`): clau canònica `freedoliapp.lang`, migració des de `freedoli_lang` i `freedolia_language` si cal; **per defecte `ca`** si no hi ha valor vàlid. Canvis via `i18n.changeLanguage` persisteixen amb la mateixa clau (esborrant legats).
- **Ús al codi:** `useTranslation` / `useT()` en un subconjunt de pàgines i components (p. ex. Dashboard, Settings, Sidebar, TaskInbox, Billing, Help, components `dataStates`, part de l’assistent, etc.).

### 4.2 Sistema paral·lel (deute)

- **`src/i18n/messages.js`:** mapes `en` / `ca` / `es` amb claus tipus `billingLocked_title`; marcat **DEPRECATED** però encara usat per **BillingLocked** / **BillingOverSeat** (duplicació conceptual respecte `billing.*` als JSON si es consolidés).
- **B4 (repo):** una sola clau de persistència UI: **`freedoliapp.lang`**. `useLang()` s’alinea amb **i18next**; legats `freedoli_lang` / `freedolia_language` es llegeixen un cop per migrar i es netejen en persistir. Selector compacte: `AppLanguageControl` a la barra superior dins l’app i a pantalles billing sense topbar.

### 4.3 Alineació estructural dels JSON (claus plana)

- Recompte aproximat de claus plana: **ca ~731**, **en ~619**, **es ~630** — **no alineats**; hi ha desenes de claus presents només en un o dos fitxers.
- Exemples de claus que apareixen a `en`/`es` però no a `ca` en el flatten comparat: diverses sota `billing.*` (p. ex. `billing.pageTitle`, `billing.section.*`) — **vegeu §4.5**.
- Exemples de claus només a `ca` (mostra): parts de `dashboard.ordersInProgress.*`, `dashboard.posNotReady.*`, `help.amazon_ready.*`, etc. — traduccions enrere o buides a es/en.

### 4.4 **Problema crític: clau duplicada `billing` a `ca.json`**

Al fitxer `ca.json` hi ha **dues propietats arrel `billing`**. En JSON estàndard, la darrera **sobreescriu** la primera en parsejar.

- **Efecte verificat amb Node:** `Object.keys(ca.billing)` només retorna `[ 'banner' ]`; **`pageTitle`, `section`, `errors`, etc. no existeixen** en l’objecte carregat encara que apareguin al text del fitxer abans del segon bloc.
- **`en.json` i `es.json`:** en la mateixa revisió, `billing` parsejat inclou `pageTitle`, `loading`, `section`, `actions`, `errors`, etc.

**Conclusió:** el català efectiu per a moltes claus `billing.*` està **trencat** en runtime; això és **bug de dades**, no només “falta de traducció”. La correcció és treball d’implementació **posterior** a B3 (no part de la política, però bloqueja confiança en “ca com a font” fins que es fusioni un sol objecte `billing`).

### 4.5 Hardcoded i barreja d’idiomes (mostreig)

- **`Orders.jsx`:** **no** usa `useT`/`useTranslation`; strings barrejats **català** (“Proveïdor”, “Tots els estats”, `toLocaleDateString('ca-ES')`) amb **anglès** (“Total POs”, “Quote Ref”, etiquetes de taula). Confirmació `confirm(\`Segur que…\`)` en català.
- **`Suppliers.jsx`:** sense `useT` / `useTranslation` al grep — patró probable de copy inline (cal migració futura).
- **`ActivationWizard.jsx`:** toasts amb strings **catalanes** hardcoded (`showToast('Connexió Amazon…')`) barrejats amb `t('activation…')` — inconsistent amb política “tot UI via claus”.
- Altres pàgines grans (automations, decisions, SEO, legal, etc.): **no auditades exhaustivament**; s’espera el mateix tipus de deute (hardcoded + barreja).

### 4.6 Naming i completitud

- Dominis barrejats (`common`, `nav`, noms de mòdul); en general coherent però amb **forats entre locales** i el **duplicat `billing`** a ca.
- No s’ha provat equivalència semàntica string-per-string entre es/en i ca per a tot el fitxer (731+ claus); **B3 no reclama prova lingüística**, només estructura i política.

### 4.7 B4 (implementació repo) — selector i persistència

- **Clau canònica:** `localStorage['freedoliapp.lang']` amb valors `ca` | `en` | `es`.
- **Migració:** lectura única de `freedoli_lang` i `freedolia_language` si la canònica no és vàlida; en escriure s’eliminen les claus legades.
- **Inicialització i18n:** `src/i18n/index.js` + `src/i18n/languageStorage.js`; `fallbackLng: 'ca'`; sense negociació automàtica amb el navegador.
- **UI:** `AppLanguageControl` a `TopNavbar` (rutes amb layout principal) i cantonada fixa a `BillingLocked` / `BillingOverSeat` (sense topbar).
- **`useLang()`:** reflecteix `i18n.resolvedLanguage` / `i18n.language` per a codi que encara usa `t(lang, key)` amb `messages.js`.

### 4.8 Hardening runtime (Track B, post-B4)

- **`src/i18n/index.js`:** `lng` inicial des de `resolveInitialLanguage()`; `fallbackLng` alineat amb `DEFAULT_UI_LANG` (`ca`); `load: 'languageOnly'`; `react.bindI18n: 'languageChanged'` per re-renders coherents; comentaris de producte «català primer» al fitxer.
- **Superfícies shell:** claus `shell.*` (404 dins `/app`, error de chunk lazy, textos base) i ampliació de `topbar.*` (theme pill, DEMO/LIVE) per evitar copy hardcoded en camins crítics.
- **Configuració:** secció d’idioma a Settings usa `settings.languageSectionTitle` / `languageSelectLabel` i `UI_LANGUAGE_OPTIONS` (mateixa llista que el selector del topbar).

---

## 5. Checklist per a treball posterior (fora de B3)

- Fusionar `billing` en un sol objecte a `ca.json` i verificar que `t('billing.*')` resol bé en català.
- Esborrar o migrar `messages.js` cap a claus JSON úniques.
- ~~Unificar storage d’idioma~~ **Fet a B4** (`freedoliapp.lang` + migració legats).
- Inventariar pàgines sense `useT` i planificar talls de migració (no fer-ho en B3).

---

## 6. Tancament B3

**B3 queda tancat a nivell documentació** amb: política **català = font**, **es/en = traduccions**, regles de governança, límits respecte B4+, i **auditoria de repo** amb limitacions explícites. La **consistència a producció** dependrà d’implementació i revisió humana posterior.
