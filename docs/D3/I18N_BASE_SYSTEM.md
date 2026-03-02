# Sistema i18n base (FASE 2 CBA)

**Versió:** 1.0  
**Àmbit:** Frontend — traduccions per a les pantalles de billing (PAS 5) sense afegir llibreries i18n.

---

## 1. Context

Les pantalles noves de billing (BillingLocked, BillingOverSeat) i els textos del gate (loading) han de ser traduïbles. S’ha implementat un sistema mínim amb objectes de missatges (en, ca, es), una funció `t(lang, key, vars)` i un hook `useLang()` que llegeix el idioma de localStorage. Això no substitueix el sistema existent (react-i18next) en la resta de l’app; només cobreix els textos nous del PAS 5 i deixa la porta oberta per ampliar.

---

## 2. Decisions tancades

| # | Decisió | Detall |
|---|---------|--------|
| 1 | **Sense llibreries noves** | No s’afegeix react-i18next ni cap altre paquet per aquests textos; es fa amb fitxers propis. |
| 2 | **Idiomes** | ca (català), en (anglès), es (castellà). Default: ca. |
| 3 | **Storage lang** | Clau `freedoli_lang` a localStorage. Valors: 'ca', 'en', 'es'. |
| 4 | **Fallback** | Si la key no existeix al locale escollit, es prova en; si tampoc, es retorna la key. |
| 5 | **Interpolació** | `t(lang, key, { varName: value })` substituïx `{varName}` al missatge. |
| 6 | **Àmbit** | Tots els textos visibles nous de BillingLocked, BillingOverSeat i del gate (loading) passen per `t()`. No es requereix (en aquesta fase) selector d’idioma a la UI. |

---

## 3. Contractes de dades

### 3.1 Fitxers

| Fitxer | Propòsit |
|--------|----------|
| `src/i18n/messages.js` | Exporta objectes `en`, `ca`, `es`; cada un amb keys en flat (ex: `billingLocked_title`, `common_loading`). |
| `src/i18n/t.js` | Funció `t(lang, key, vars?)`. Locale = messages[lang] \|\| messages.en; str = locale[key] ?? en[key] ?? key; substitució {var}. |
| `src/i18n/useLang.js` | Hook `useLang()` retorna `{ lang, setLang }`. lang inicial de localStorage `freedoli_lang` (default 'ca'); setLang persisteix. |

### 3.2 Keys (PAS 5)

- **common:** common_loading, common_backToApp, common_workspaceNotFound.
- **billingLocked_***: title, status, statusPastDue, statusCanceled, statusInactive, messagePastDue, messageInactive, manageSubscription, startSubscription, opening, contactOwner.
- **billingOverSeat_***: title, seatsCount, message, openPortal, opening, goToSettings, backToApp, contactOwner.
- **billing_toast***: billing_toastPortalUnavailable, billing_toastCheckoutUnavailable.

Keys amb variables: billingLocked_status `{status}`, billingOverSeat_seatsCount `{seatsUsed}`, `{seatLimit}`.

### 3.3 useLang

- `SUPPORTED = ['ca', 'en', 'es']`.
- `setLang(l)` només actualitza si l ∈ SUPPORTED i persisteix a `freedoli_lang`.

---

## 4. Fluxos

### 4.1 Obtenir un text traduït

```
Component: const { lang } = useLang(); ... t(lang, 'billingLocked_title')
    |
    v
t(lang, key):
  locale = messages[lang] || messages.en
  str = locale[key] ?? messages.en[key] ?? key
  Per cada k a vars: str = str.replace(/\{k\}/g, vars[k])
  return str
```

### 4.2 Canvi d’idioma (manual)

```
localStorage.setItem('freedoli_lang', 'en')
Refresh
    |
    v
useLang() llegeix getStoredLang() -> 'en'
    |
    v
Components que criden t(lang, key) reben lang='en' -> textos en anglès.
```

(En aquesta fase no hi ha botó de canvi; es pot fer des de consola o des d’un futur selector.)

---

## 5. Edge cases

| Cas | Comportament |
|-----|--------------|
| key inexistent | Retorn de la key literal (fallback en també absent). |
| lang no suportat | messages[lang] undefined -> s’usa messages.en. |
| vars amb valor undefined | String(undefined) = 'undefined'; es recomana passar sempre strings o números. |
| BillingLocked/OverSeat sense useLang | Cal cridar useLang() al component; si no, lang pot ser undefined i t() farà fallback a en. |
| App.jsx gate | AppContent fa useLang() i passa t(lang, 'common_loading') al spinner i al Suspense fallback. |

---

## 6. Definition of Done

- [x] messages.js amb en, ca, es i totes les keys del PAS 5.
- [x] t.js: t(lang, key, vars), fallback en, interpolació {var}.
- [x] useLang.js: lang (default ca), setLang, persistència freedoli_lang; SUPPORTED ca, en, es.
- [x] BillingLocked i BillingOverSeat: cap string visible hardcoded; tot via t(lang, key[, vars]).
- [x] AppContent: textos de loading via t(lang, 'common_loading').
- [x] Toasts d’error de billing: t(lang, 'billing_toastPortalUnavailable') etc.

---

## 7. Relació amb altres documents

- **BILLING_GATING_UI** (D3): pantalles que consumeixen t().
- **FASE2_CBA_ARCHITECTURE_FINAL** (D0): decisió d’idiomes i storage.
- **FASE2_CBA_QA_FINAL** (D0): checklist i18n (cap hardcoded; canvi freedoli_lang canvia textos).
