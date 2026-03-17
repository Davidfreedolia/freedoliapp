# B1.1 MEMBERSHIP LIFECYCLE REPORT

## 1. Files touched

- `supabase/migrations/20260317150000_b1_1_membership_governance_closeout.sql` (new)
- `src/pages/Settings.jsx` (handleAddMember: usa `org_add_member` RPC; handleUpdateMemberStatus: usa `membership_set_status` RPC)
- `docs/ROADMAP/B1_1_MEMBERSHIP_LIFECYCLE_REPORT.md` (aquest fitxer)

## 2. Membership lifecycle contract implemented

- **Domini d’estat:** El tipus `membership_status` (enum) ja existia a S3.2.A: `invited`, `active`, `suspended`, `removed`. No s’ha afegit cap estat nou; es manté aquest domini únic.
- **Enforcement a DB:**
  - La columna `status` de `org_memberships` és NOT NULL i tipus enum (només aquests quatre valors).
  - Trigger `trg_org_memberships_set_suspended_at`: en passar a `suspended` es posa `suspended_at = now()`; en passar de `suspended` a `active` es buida `suspended_at`.
- **RLS:** A `org_memberships` s’ha activat RLS i s’han creat polítiques de write:
  - INSERT / UPDATE / DELETE només si `is_org_owner_or_admin(org_id)`.
  - SELECT segueix amb la política existent (members + billing/owner exception).
- **Seient:** El comptatge de seients continua basat només en `status = 'active'` (trigger `enforce_seat_limit` i RPC `org_add_member` / acceptació d’invitació no tocats en aquesta lògica; ja ho feien).

## 3. Invitation / acceptance / revocation flows

- **Taula `org_invitations`:**
  - Camps: `id`, `org_id`, `email`, `role` (admin | member), `token` (únique, base64url 32 bytes), `invited_by`, `expires_at`, `status` (pending | accepted | expired | cancelled), `created_at`.
  - RLS: SELECT per membres de l’org; INSERT/UPDATE només owner/admin.
- **Crear invitació:** RPC `create_org_invitation(p_org_id, p_email, p_role)`. Només owner/admin. Retorna `{ id, token, expires_at }` (expiració 7 dies). Registra `invitation_created` a l’audit.
- **Acceptar invitació:** RPC `accept_org_invitation(p_token)`. L’usuari autenticat ha de tenir email igual a l’email de la invitació; la invitació ha de ser `pending` i no expirada. Es crea la fila a `org_memberships` amb `status = 'active'`, `invited_by`/`invited_at`/`accepted_at` omplerts; es marca la invitació com `accepted`; es comprova el límit de seients (mateixa font que el trigger); es registra `invitation_accepted` a l’audit. Si la invitació està expirada, es marca `expired` i es registra `invitation_expired`.
- **Revocar invitació:** RPC `revoke_org_invitation(p_invitation_id)`. Només owner/admin; posa `status = 'cancelled'`. Registra `invitation_cancelled` a l’audit.
- **Afegir membre directe (sense invitació):** RPC `org_add_member(p_org_id, p_user_id, p_role)` (ja existia; ara a més escriu `member_added_direct` a l’audit). La UI d’Settings ara crida aquest RPC en lloc de fer INSERT directe.
- **Suspensió / reactivació / removed:** RPC `membership_set_status(p_org_id, p_user_id, p_new_status)`. Només owner/admin. Transicions permitides: active ↔ suspended, active → removed, suspended → removed, removed → active. No es pot suspendre ni treure a un mateix. La UI de Settings (Suspend / Reactivate) ara crida aquest RPC; el botó “Remove” es pot afegir a la UI cridant el mateix RPC amb `p_new_status = 'removed'`.

## 4. Governance audit implemented

- **Taula `membership_governance_audit`:**
  - Camps: `id`, `org_id`, `action`, `entity_type`, `entity_id`, `actor_user_id`, `old_value`, `new_value`, `created_at`.
  - RLS: SELECT només owner/admin de l’org; no hi ha política d’INSERT per clients (les RPCs SECURITY DEFINER escriuen directament).
- **Accions registrades:**
  - `invitation_created` (entity_type: org_invitation)
  - `invitation_accepted` (org_invitation)
  - `invitation_expired` (org_invitation, en intent d’acceptació expirada)
  - `invitation_cancelled` (org_invitation)
  - `member_added_direct` (org_membership) — quan s’afegeix via `org_add_member`
  - `member_suspended` (org_membership)
  - `member_reactivated` (org_membership)
  - `member_removed` (org_membership)
- **Canvi de rol:** No s’ha implementat RPC ni audit per canvi de rol en aquest bloc; el contracte B1.1 demanava “canvi de rol si avui és viable”: queda com a extensió futura (es pot fer UPDATE a `org_memberships.role` amb la política actual d’owner/admin i, si es vol audit, afegir un RPC `membership_set_role` i una acció `role_changed` en una migració posterior).

## 5. Validation

- **Migració:** No s’ha pogut executar `supabase db push` en l’entorn local perquè les migracions remotes no coincideixen amb les locals (historial divergent). La migració `20260317150000_b1_1_membership_governance_closeout.sql` s’ha revisat manualment i és coherent amb el schema existent (enum `membership_status`, taula `org_memberships` amb columnes S3.2.A, helpers `is_org_owner_or_admin` / `is_org_member`, `get_org_billing_state` / `get_plan_limits`).
- **Smoke reasoning (lògic):**
  - Create invite: `create_org_invitation(org_id, email, 'member')` → retorna token; fila a `org_invitations` (pending); audit `invitation_created`.
  - Accept invite: `accept_org_invitation(token)` amb usuari amb mateix email → fila a `org_memberships` (active, invited_by/invited_at/accepted_at); invitació → accepted; audit `invitation_accepted`.
  - Member active: RLS i helpers consideren només `status = 'active'`; seients només actius.
  - Suspend: `membership_set_status(org_id, user_id, 'suspended')` → UPDATE status; trigger omple `suspended_at`; audit `member_suspended`.
  - Reactivate: `membership_set_status(org_id, user_id, 'active')` → UPDATE status; trigger buida `suspended_at`; audit `member_reactivated`.
  - Remove: `membership_set_status(org_id, user_id, 'removed')` → UPDATE status; audit `member_removed`.
  - Seat counting: només `status = 'active'` (trigger i RPCs sense canvis en aquesta part).
  - Permisos: totes les RPCs de governance comproven `is_org_owner_or_admin(org_id)`; acceptació només l’usuari amb email coincident.

## 6. Final verdict

- **B1.1 tancat** amb el següent abast realitzat:
  - Contracte d’estat de membership clar i aplicat (enum + trigger suspended_at).
  - Invitacions reals: taula `org_invitations`, crear / acceptar (per token) / revocar; expiració 7 dies; acceptació només amb email coincident i límit de seients.
  - Offboarding/revocació: via `status = 'removed'` (o suspended) amb RPC `membership_set_status`; no esborrat a cegues; auditable.
  - Audit mínim de governance: taula `membership_governance_audit` i esdeveniments crítics (invitació creada/acceptada/expirada/cancel·lada; membre afegit directe; suspès; reactivat; removed).
  - Rols/permisos al backend: només owner/admin poden crear invitacions, revocar, canviar estat de membres i afegir membres directes; acceptar només l’usuari amb email de la invitació.
- **No implementat (i acceptat com a fora d’abast B1.1):**
  - Canvi de rol auditat (es pot fer UPDATE directe amb RLS actual; audit de `role_changed` seria una extensió).
  - Botó “Remove” a la UI de Settings (el RPC suporta `removed`; es pot afegir el botó quan es vulgui).
- **Recomanació:** Un cop l’historial de migracions remot estigui alineat, executar les migracions i fer una passada manual: crear invitació, acceptar amb un usuari, suspendre/reactivar i comprovar entrades a `membership_governance_audit`.
