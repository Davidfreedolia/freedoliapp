# R0.4 IN-APP ASSISTANT AUDIT REPORT

## 1. Executive verdict

Avui **no hi ha assistent in-app conversacional ni chatbot**. Hi ha un **Help modal** (manual navegable amb cerca), **HelpIcon** (tooltip/popover per camps) i **NextStepCard** (R0.3: guidance per pantalla). La landing parla d’“assistent operatiu” però dins de l’app no hi ha cap peça que es digui “assistent” ni cap xat. El repo té **OpenAI** només a una edge function (asin-enrich) i **Anthropic** al package per a generació de prompts de market research (descàrrega/còpia), no per a un assistent d’ús diari. Per tancar R0.4 cal definir una **feature real**: un assistent in-app que pugui respondre preguntes útils i orientar, sense ser una targeta decorativa ni prometre màgia que no existeix.

## 2. Current in-app assistant reality

### Què hi ha avui de debò

- **HelpModal (TopNavbar → icona Help):** Modal “Help & Documentation” amb cerca i seccions expandibles. Contingut = `getAllSections()` de `helpContent.js` (profitability, amazon_ready, purchase_orders, research, finances, dashboard). Cerca per text en títols i descripcions. **No és xat:** no hi ha conversa, no hi ha context de pantalla, no hi ha “assistent”.
- **Pàgina /app/help:** Mateix contingut que el modal; manual navegable. No és un assistent.
- **HelpIcon:** Icona ? al costat de camps concrets (ex. ProfitabilityCalculator, IdentifiersSection); tooltip + popover amb text del manual. **Ajuda contextual per camp**, no flux ni “quin és el següent pas”.
- **NextStepCard (R0.3):** Cards a Dashboard, Projects, Orders i línia “Recomanat” a ProjectDetail. **Guidance de següent pas**; no és un lloc on l’usuari pregunti.
- **Drawers existents:** BusinessAlertsBadge (drawer d’alertes), ShipmentDetailDrawer (logística). Cap d’ells és un assistent.
- **Backend:** Cap endpoint ni taula per a “assistent” o “chat”. `asin-enrich` (Supabase Edge) usa OpenAI per a resum opcional d’ASIN; `generateClaudeResearchPrompt` / `marketResearchPrompt` generen un document per a Claude (market research) per descarregar/copiar, no per a conversa in-app.

### Què és reutilitzable

- **helpContent.js** i les traduccions (help.*): base de respostes temàtiques (profitabilitat, PO, Amazon readiness, finances, dashboard, research).
- **Estructura de seccions** (title, short, long, fields): es pot reutilitzar per a respostes d’assistent (per tema o per “intent”).
- **Context de pantalla:** la app ja sap ruta (`/app/dashboard`, `/app/projects`, `/app/orders`, `/app/projects/:id`, etc.) i en moltes pàgines té dades (projecte, fase, PO). Es pot inyectar com a context sense backend.
- **NextStepCard / guidance:** la lògica “quin és el següent pas” ja existeix al client; es pot exposar també dins d’un panel d’assistent.

### Què és només ajuda estàtica

- Tot el HelpModal i /app/help: manual estàtic. L’usuari ha de buscar i expandir; no pot preguntar “què puc fer aquí?” i rebre una resposta única.

### Què és només narrativa

- La landing que diu “Fes servir l’assistent per explorar el producte…”: dins de l’app no existeix cap “assistent” amb el qual interactuar.

## 3. V1 in-app assistant contract

L’**assistent in-app V1** ha de ser una **peça única i visible** dins de l’app, amb la qual l’usuari pugui **fer preguntes o consultar el següent pas** i rebre **respostes útils i coherents**, sense ser un chatbot “de cartró” ni un segon manual sense valor afegit.

- **Tipus viable a V1:** **Assistant panel (drawer o side panel)** amb:
  1. **Context visible:** on ets (pantalla, opcionalment entitat: projecte, PO) i què pots fer aquí (accions principals).
  2. **Entrada de consulta:** camp de text (o botons ràpids) per preguntes com “què puc fer aquí?”, “quin és el següent pas?”, “on trobo les comandes?”, “què significa aquest estat?”.
  3. **Respostes:** generades per **match amb contingut estructurat** (FAQ / intents / helpContent) i **context de pantalla**. No cal que sigui un LLM; pot ser **rule-based + FAQ** si el contingut i el matching són bons.
  4. **Opcional (fase posterior):** una crida a un **sol endpoint LLM** per a preguntes obertes no cobertes per FAQ, amb context (pantalla + snippets del manual) per no inventar.

- **On apareix:** accessible des de la **navbar** (icona o botó “Assistent” / “Ajuda”) que obre el **panel** (drawer per la dreta o modal gran). Ha de ser el mateix punt d’entrada des de qualsevol pantalla.
- **Com s’obre:** un sol clic a la icona; el panel es superposa o desplaça el contingut. No cal que sigui flotant permanent; ha de poder tancar-se.
- **Què pot respondre o fer:** veure apartat 4.
- **Què NO farà encara (V1):** no executarà accions a nom de l’usuari (no crearà PO ni canviarà fase); no tindrà memòria de conversa entre sessions; no serà un “agent” autònom. Pot tenir historial de la sessió actual (opcional) per no semblar un formulari buit.
- **Com evita semblar inútil:** (1) mostrant sempre el context (“Estàs a Projecte X, fase PO”) i accions recomanades; (2) respostes concretes per a intents clars (següent pas, on trobo X, què significa Y); (3) si hi ha matching, no respondre genèric; (4) si no hi ha match, dir-ho i oferir enllaços al manual o a la pantalla rellevant.

## 4. Minimum viable assistant capabilities

L’assistent ha de poder **ajudar de veritat** en almenys aquests tipus de consulta (respostes amb contingut real, no genèriques):

| Tipus | Exemple | Font de la resposta |
|-------|--------|----------------------|
| Què puc fer aquí? | “Què puc fer en aquesta pantalla?” | Context de ruta + llista d’accions principals (crear projecte, obrir comandes, etc.) |
| Següent pas | “Quin és el següent pas?” | Reutilitzar lògica de NextStepCard / pipeline; resposta per pantalla (Dashboard → crear projecte o PO; ProjectDetail → acció de fase) |
| On trobo X? | “On trobo les comandes?” / “On està la viabilitat?” | FAQ + enllaç a ruta (Orders, ProjectDetail → tab Viabilitat) |
| Significat d’estat/secció | “Què significa PO confirmat?” / “Què és el FNSKU?” | helpContent (purchase_orders.status, amazon_ready.fnsku, etc.) |
| Flow general | “Com segueixo el flow projecte → PO → inventari?” | Una o més entrades FAQ que expliquen el flux; enllaços a Projects, Orders, Inventory |
| PO bloquejada | “Què he de revisar si una PO està bloquejada?” | FAQ o regles simples (estat, Amazon readiness, enviaments, tasques) |
| Què falta per fase | “Què em falta per passar de fase?” | Regles basades en phase gates / readiness (ja existeixen al producte); resposta textual resumint els punts que falten |

**Implementació mínima sense LLM:** intents/FAQ amb paraules clau o frases tipus (“següent pas”, “on trobo”, “què significa”, “flow”, “bloquejada”, “què falta”) que retornin el bloc de text i enllaços adequats. Context (ruta, project id, phase) es passa al client i determina quina “plantilla” de resposta o quin bloc de helpContent es mostra.

**Amb LLM (opcional):** preguntes obertes es poden enviar a un sol endpoint amb context (pantalla + trossos del manual); la resposta ha d’estar delimitada al producte i no inventar funcionalitats.

## 5. Technical requirements

- **Per fer-ho sense LLM (V1 mínim):**
  - **Context de pantalla:** a la app (client): ruta actual, opcionalment `projectId`, `phaseId`, `orderId`. Es passa al component del panel.
  - **Contingut estructurat:** ampliar o reutilitzar `helpContent` (o una estructura paral·lela) amb entrades per a “intents” d’assistent: següent pas, on trobo X, flow, PO bloquejada, què falta per fase. Text i enllaços; traduccions a i18n.
  - **Matching:** al client (o una funció edge molt simple): normalitzar la pregunta (minúscules, sense accents opcional), comparar amb paraules clau o intents predefinits; retornar la clau de resposta i el bloc (títol, cos, enllaç). No cal vector DB ni embeddings.
  - **UI:** un sol component **AssistantPanel** (drawer o panel) amb: (1) capçalera amb context (“Dashboard” / “Projecte: X, Fase PO”), (2) accions ràpides o botons (“Què puc fer aquí?”, “Següent pas”), (3) camp de text + llista de respostes (bombolles o línies). Integració a la navbar.
  - **No cal:** nous taules, nous RPC, embeddings, ni crides a OpenAI/Anthropic per al flux principal.

- **Si s’afegeix LLM (fase opcional):**
  - **Un endpoint:** p.ex. Supabase Edge Function `assistant-query` que rep: `{ query, route, projectId?, phaseId? }`. Construcció d’un prompt amb (a) instruccions (“Respon només sobre el producte FREEDOLIAPP…”), (b) context (pantalla, fase, snippets del manual rellevants), (c) la pregunta. Una crida a OpenAI o Anthropic; resposta en text.
  - **Seguretat i cost:** API key en variable d’entorn; límit de longitud; no guardar converses a BD per V1 (opcional guardar per analytics).

- **Honestedat:** Es pot fer un assistent **útil a V1 sense LLM** si les preguntes freqüents estan ben cobertes per FAQ + context. Un LLM millora les preguntes obertes i el to natural, però no és estrictament necessari per tancar R0.4 com a feature real.

## 6. Recommended implementation order

1. **Contracte i contingut**  
   - Definir la llista d’intents/FAQ (següent pas, on trobo X, què significa Y, flow, PO bloquejada, què falta per fase).  
   - Afegir o etiquetar el text i enllaços a i18n / helpContent (o fitxer `assistantIntents.js` amb claus i18n).

2. **UI: AssistantPanel**  
   - Component que es obre des de la navbar (drawer o panel lateral).  
   - Mostra context (ruta + entitat si n’hi ha).  
   - Botons ràpids (“Què puc fer aquí?”, “Següent pas”) + camp de text.  
   - Àrea de respostes (una o més respostes en format llegible, amb enllaços).

3. **Matching (client)**  
   - Funció que rep `(query, route, context)` i retorna `{ intent, answerKey, payload }` (o directament el text i enllaços).  
   - Implementar regles per a intents clau (paraules clau, frases tipus).  
   - Integrar la lògica de “següent pas” existent (com NextStepCard) per a la intent “següent pas”.

4. **Integració**  
   - Afegir icona/botó “Assistent” a la TopNavbar; obrir/ tancar el panel.  
   - Assegurar que el context (ruta, projectId, phaseId) es passa al panel des del router / pàgina actual.

5. **Proves i copy**  
   - Comprovar que cada intent retorna una resposta útil i no genèrica.  
   - Ajustar copy i enllaços.

6. **(Opcional) Endpoint LLM**  
   - Si es vol suport per a preguntes obertes: implementar edge function, prompt amb context i snippets, crida a model; mostrar resposta al panel amb avís “Resposta generada” o similar.

## 7. Final verdict

**Sí: hi ha definició prou bona per passar a implementació.**  
L’assistent in-app V1 queda definit com a **panel d’assistent** (no un segon manual): un sol lloc on l’usuari pot consultar context, següent pas, on trobar coses, significat d’estats i flow, i què revisar quan una PO està bloquejada o què falta per avançar de fase. Es pot implementar amb **contingut estructurat + context de pantalla + matching senzill**, sense LLM, i ser una feature real i útil. L’opció d’afegir un endpoint LLM per a preguntes obertes queda com a extensió posterior. R0.4 queda tancat a nivell d’auditoria i contracte de producte; la implementació ha de seguir l’ordre recomanat sense obrir P2 ni inventar backend innecesari.
