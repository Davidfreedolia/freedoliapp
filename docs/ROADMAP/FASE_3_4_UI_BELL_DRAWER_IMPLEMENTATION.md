# FASE 3.4 — UI Bell + Drawer — Implementació

## 1. Fitxers modificats

- `src/components/alerts/BusinessAlertsBadge.jsx` (nou)
- `src/components/TopNavbar.jsx` (import + render de `BusinessAlertsBadge`)

## 2. Què s'ha implementat

- **On s'ha posat la Bell:** Al TopNavbar, dins `rightSection`, davant de `DecisionBadge`. S'utilitza la icona **AlertTriangle** (lucide-react) per diferenciar-la de la Bell de decisions i etiquetar-la com a "Business alerts".
- **Comptador:** Badge numèric sobre la icona quan `count > 0` (fins a "99+"). Color `var(--warning-1)`. El count ve del hook `useBusinessAlerts(activeOrgId).count`.
- **Drawer/panel:** En clicar la icona s'obre un panell absolut (dropdown) amb:
  - Capçalera: "Business alerts" + botó "Close".
  - Cos: llista scrollable d’alertes (límit 25); cada fila mostra títol, message truncat a 80 caràcters, punt de severity (critical/high/medium/low) i dos botons: **Acknowledge** i **Resolve**.
- **Accions:** Acknowledge crida `acknowledge(alert.id)`; Resolve crida `resolve(alert.id)`. El hook fa refetch després de cada acció correcta; el panell es refresca automàticament.
- **Estats:** Loading ("Loading…"), error (missatge d’error), buit ("No business alerts."). En obrir el panell es crida `refetch()` per tenir dades actualitzades.

## 3. Integració amb 3.3

- **Hook/helper:** Es consumeix únicament `useBusinessAlerts(activeOrgId, { listLimit: 25 })` des de `BusinessAlertsBadge`. No s’utilitza cap altre origen d’alertes.
- **Refresc:** El hook ja refetcha en montar i en canvi d’`orgId`. Addicionalment, en obrir el drawer (`open === true`) es crida `refetch()` per actualitzar la llista. Després d’`acknowledge(id)` o `resolve(id)`, el hook fa refetch intern i la UI es torna a renderitzar amb les dades noves.
- **Evitar barreja:** Les dades venen exclusivament de l’API 3.3 (`getBusinessAlerts` amb filtre `dedupe_key LIKE 'biz:%'` i `status IN ('open','acknowledged')`). No es barregen amb alertes OPS, SHIPMENT ni cap font no persistida.

## 4. Decisions d’implementació

- **Fet:** Component autocontingut (badge + drawer) al directori `src/components/alerts/`. Icona AlertTriangle per distingir de DecisionBadge (Bell). Refetch en obrir el drawer. Botó Acknowledge desactivat si `status === 'acknowledged'`. Tancament del drawer en clic fora (useRef + mousedown/touchstart).
- **Deixat fora:** Run "Run engine" des de la UI (opcional per 3.5 o fase posterior). Traduccions i18n (text en anglès hardcoded per ara). Navegació a entitat (entity_type/entity_id). Redisseny ampli del TopNavbar. Unificació amb altres tipus d’alertes.

## 5. Validació

- **Com s’ha verificat:** Revisió de codi; linter sense errors; integració al TopNavbar sense tocar la resta de seccions.
- **Comprovat:** Consum de `useBusinessAlerts`; filtre implícit biz: via API 3.3; accions acknowledge/resolve i refetch; estats loading/error/empty; tancament en clic fora.
- **No provat encara:** E2E o proves amb backend real; accesibilitat completa (aria); i18n.

## 6. Impacte al tracker

- A `IMPLEMENTATION_STATUS.md`: fila **FASE 3.4** afegida amb estat **CLOSED**; resum de FASE 3 actualitzat (3.1–3.4 tancats; 3.5 doc pendent); secció detallada "FASE 3.4 — UI Bell + comptador + Drawer" afegida.
- Estat de la subfase: **COMPLETE**.
