# FASE 4.3.D — TASK LIFECYCLE SEMANTICS CLEANUP

Implementació acotada. Repo real; tracker: `docs/ROADMAP/IMPLEMENTATION_STATUS.md`.

---

## 1. Scope implemented

- **Simplificació del contracte de status de `tasks`:**
  - El contracte canònic passa a ser només **dos estats funcionals**: `open` i `done`.
  - `snoozed` deixa de formar part del contracte canònic actiu (ja no és permès pel CHECK constraint).
- **Neteja de dades defensiva:**
  - Qualsevol fila existent amb `status = 'snoozed'` es normalitza a `status = 'open'` abans d’ajustar el constraint (migració defensiva; en la pràctica no n’hi havia).
- **Allineació d’índex de dedupe i helper d’origen:**
  - L’índex parcial `idx_tasks_origin_open` es recrea per considerar exclusivament `status = 'open'` com a “actiu” per a dedupe d’origen.
  - El helper `findOpenTaskByOrigin` ara busca només tasques amb `status = 'open'` (ja no contempla `snoozed`).

---

## 2. Files modified / added

| Fitxer | Canvi |
|--------|-------|
| `supabase/migrations/20260317120000_f4_3_d_tasks_status_cleanup.sql` | **Nou.** Migració DB per normalitzar `snoozed`, reescriure el CHECK de status i alinear l’índex de dedupe. |
| `src/lib/supabase.js` | `findOpenTaskByOrigin`: comentari actualitzat i filtre de status simplificat a `.eq('status', 'open')`. |
| `docs/ROADMAP/IMPLEMENTATION_STATUS.md` | Afegida secció i fila per FASE 4.3.D; actualitzat l’estat de 4.3.C/4.3.D. |
| `docs/ROADMAP/FASE_4_3_D_TASK_LIFECYCLE_SEMANTICS_CLEANUP.md` | **Nou.** Aquest document d’implementació. |

---

## 3. Lifecycle contract after cleanup

### Contracte final de status per `tasks`

- **Permès a DB (CHECK canònic):**
  - `status IN ('open', 'done')`
- **Semàntica:**
  - `open`: tasques actives, pendents o ajornades (via due_date).
  - `done`: tasques completades.
  - **Snooze:** continuarà sent **“tasca open amb due_date futura”**. No hi ha estat `snoozed` separat.

### Comportament de snooze (després del cleanup)

- `snoozeTask(id, days)`:
  - Llegeix la `due_date` actual.
  - Calcula una nova `due_date` +N dies.
  - Escriu `status: 'open'` i `due_date: newDueDate`.
- `bulkSnoozeTasks(taskIds, days)`:
  - Calcula noves `due_date` per a cada tasca.
  - Escriu `status: 'open'` i `updated_at = now()` per cada fila.
- **No canvis de comportament** respecte a abans de 4.3.D; només s’ha netejat el contracte de schema i dedupe per reflectir el que ja passava a codi.

---

## 4. Data / index / helper alignment

### 4.1 Migració de dades i CHECK de status

Migració `20260317120000_f4_3_d_tasks_status_cleanup.sql`:

- **Normalització de dades:**
  - `UPDATE public.tasks SET status = 'open' WHERE status = 'snoozed';`
  - Executat només si existeix la columna `status` a `public.tasks`.
- **Eliminació de CHECKs antics de status:**
  - Cerca tots els `CHECK` (`contype = 'c'`) sobre `public.tasks` on la definició del constraint (`pg_get_constraintdef`) conté `status`.
  - Elimina cadascun amb `ALTER TABLE public.tasks DROP CONSTRAINT <conname>`.
- **Nou CHECK canònic:**
  - `ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('open', 'done'));`

Resultat: l’únic contracte de status a DB és ara `open` / `done`. Qualsevol intent futur d’escriure `snoozed` viuria rebutjat pel CHECK.

### 4.2 Índex de dedupe per origen

- Abans: `idx_tasks_origin_open` amb condició `status IN ('open', 'snoozed')`.
- Després:
  - `DROP INDEX IF EXISTS public.idx_tasks_origin_open;`
  - `CREATE INDEX IF NOT EXISTS idx_tasks_origin_open ON public.tasks(org_id, source, source_ref_type, source_ref_id) WHERE source_ref_type IS NOT NULL AND source_ref_id IS NOT NULL AND status = 'open';`
- Ara només les tasques `open` participen a la dedupe d’origen.

### 4.3 Helper `findOpenTaskByOrigin`

- Abans: `.in('status', ['open', 'snoozed'])`.
- Després: `.eq('status', 'open')`.
- Comentari actualitzat per reflectir el retorn: “existing open task or null”.

---

## 5. Out of scope intentionally preserved

- **RLS:** Cap canvi. La política “Users can manage own tasks” (auth.uid() = user_id) es manté intacta.
- **Snooze UX:** Cap canvi de comportament. Continuen existint Snooze +1d/+3d al TasksWidget i TaskInbox, amb el mateix copy i toasts.
- **completed_at:** No s’ha tocat; continua sense ser omplert a mark done.
- **Altres sistemes:** No s’ha tocat billing, alerts engine, decisions engine, `project_tasks`, `/app/calendar`, ni altres parts de `supabase.js` fora del helper de dedupe.

---

## 6. Risks / controlled debt remaining

- **completed_at sense ús:** El camp existeix però segueix sense formar part del contracte. Podria ser utilitzat en una fase futura per millorar traçabilitat (no és necessari per a la correcció actual).
- **Històric potencial de snoozed a docs/demo:** Alguns docs i dades de demo (DEMO_SEED.md, demo seed) continuen mencionant “snoozed” com a estat conceptual; però a DB/contracte actiu ja no és vàlid. Aquest és deute documental/seed menor, no funcional.

---

## 7. Tracker / docs updated

- **`docs/ROADMAP/IMPLEMENTATION_STATUS.md`:**
  - Afegida fila a la taula canònica per **FASE 4.3.D — Task lifecycle semantics cleanup** (CLOSED).
  - Actualitzada secció detallada de FASE 4.3.C per reflectir que 4.3.D ha estat implementada.
  - Nova subsecció “FASE 4.3.D — Task lifecycle semantics cleanup” que descriu la migració i el nou contracte de status.
- **Aquest document:** `docs/ROADMAP/FASE_4_3_D_TASK_LIFECYCLE_SEMANTICS_CLEANUP.md` com a font de veritat per a la implementació de 4.3.D.

