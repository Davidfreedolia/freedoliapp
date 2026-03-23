# R0.4 IN-APP ASSISTANT IMPLEMENTATION REPORT

## 1. Files touched

- `src/lib/assistant/assistantIntents.js` (new)
- `src/components/assistant/AssistantPanel.jsx` (new)
- `src/components/TopNavbar.jsx` (modified: entry point + AssistantPanel)
- `src/i18n/locales/ca.json` (modified: `assistant.*`)
- `src/i18n/locales/en.json` (modified: `assistant.*`)
- `src/i18n/locales/es.json` (modified: `assistant.*`)

## 2. Assistant panel implemented

- **Component:** `src/components/assistant/AssistantPanel.jsx`
- **Comportament:** Panel/drawer des de la dreta (max-width 380px), overlay per tancar, capçalera amb títol "Assistent" i botó tancar, línia de context (pantalla actual + projectId si aplica), quatre botons ràpids ("Què puc fer aquí?", "Quin és el següent pas?", "On trobo les comandes?", "Flow projecte → PO → inventari"), camp de text + botó enviar, àrea de resposta amb text i enllaços/CTA quan la intent té destinació (Orders, Projects o següent pas amb dos enllaços).
- **Props:** `isOpen`, `onClose`, `pathname` (per derivar `screen` i `projectId`).
- **Estil:** CSS variables de l’app (`--page-bg`, `--border-1`, `--text-1`, etc.), sense mida desproporcionada.

## 3. Intent / answer system implemented

- **Intents:** Definits a `src/lib/assistant/assistantIntents.js`: `what_can_i_do`, `next_step`, `where_orders`, `where_viability`, `where_projects`, `what_means_state`, `flow_project_po`, `po_blocked`, `what_missing_phase`.
- **Matching:** Funció `matchIntent(query)`: normalització (minúscules, trim, NFD sense accents) i coincidència per paraules clau per intent. Retorna la clau d’intent o `null`.
- **Respostes:** Text per intent a i18n (`assistant.answers.<intent>`); enllaços opcionals via `INTENT_LINKS` (orders → `/app/orders`, projects → `/app/projects`); per `next_step` el panel mostra dos CTAs (Obrir Comandes, Obrir Projectes).
- **Sense duplicar:** Respostes noves a i18n; no s’ha tocat `helpContent.js`; la lògica de “següent pas” al panel és textual (recomanació genèrica per pantalla), coherent amb el que explica NextStepCard sense reutilitzar directament les dades de Dashboard/Orders (la navbar no té accés a `stats` ni llistes).

## 4. Context-awareness implemented

- **Deriva de la ruta:** `getScreenFromPath(pathname)` a `assistantIntents.js`: retorna `{ screen, projectId? }` on `screen` és `dashboard`, `projects`, `projectDetail`, `orders` o `app` segons el path.
- **Ús al panel:** Es mostra la etiqueta de context (`assistant.context.dashboard`, etc.) i, si hi ha `projectId` (detall de projecte), els primers caràcters. Els botons ràpids i el valor per defecte en enviar sense text proven de `getDefaultIntentForScreen(screen)` (per exemple dashboard → next_step, projects → what_can_i_do).
- **Respostes:** Les respostes són les mateixes per totes les pantalles; la “consciència de context” es limita a (1) etiqueta de pantalla visible, (2) intent per defecte segons pantalla, (3) enllaços útils (Orders/Projects) a la resposta. No s’ha afegit heurística complexa ni backend.

## 5. Validation

- **Build:** `npm run build` executat; ha acabat correctament (`✓ built in 32.77s`). Només warnings preexistents (dynamic/static imports), cap error nou.
- **Imports:** No s’han afegit imports morts; linter sense errors als fitxers nous/modificats.
- **Panel des de la navbar:** Botó "Assistent" (icona MessageCircle + text en desktop) a la TopNavbar; obre el panel; tancament per overlay o botó X.
- **Respostes útils:** Les intents cobreixen: què puc fer aquí, següent pas, on trobo comandes/viabilitat/projectes, què significa estat, flow projecte→PO→inventari, PO bloquejada, què falta per passar de fase. Respostes en ca/en/es amb enllaços quan toca. Manual d’ajuda i HelpModal no s’han tocats.

## 6. Final verdict

- **R0.4 tancat.** L’assistent in-app V1 està implementat dins del producte: panel visible des de la navbar, context de pantalla, intents/FAQ amb matching client-side, respostes útils i enllaços, sense LLM, sense backend nou, sense accions automàtiques ni memòria. El contracte de l’auditoria (R0_4_IN_APP_ASSISTANT_AUDIT_REPORT.md) es compleix; no s’ha obert P2 ni refactors massius.
