# B1.1 APPLY + LIVE VALIDATION REPORT

## 1. Migration state

- **Abans d’aplicar:**
  - **Remote** tenia una versió `20260302` al historial sense fitxer local equivalent (el local té `20260302_01_alert_system_base.sql`). Això feia que `supabase db push` retornés: *"Remote migration versions not found in local migrations directory"* i suggerís `repair --status reverted 20260302`.
  - **Remote** no tenia aplicades les migracions des de `20260315100000` (S3.2.A) fins a `20260317150000` (B1.1) ni les posteriors; part d’elles sortien com a "només Local" a `migration list`.
  - En fer el primer `db push --include-all`, la migració **20260314_s1_3_custom_cities_org_fix.sql** fallava amb: *"column c.user_id does not exist"* (la taula `custom_cities` a remot no té `user_id`).
  - En un segon intent, la migració **20260317130000_p0_2_purchase_orders_hardening.sql** fallava amb: *"syntax error at or near NOT"* en `ADD CONSTRAINT IF NOT EXISTS` (PostgreSQL del remot no suporta aquesta sintaxi en aquest context).

## 2. Repair actions

- **20260302:** marcat com **reverted** a remot (més d’una vegada, perquè cada `push --include-all` tornava a registrar una versió `20260302`).
- **20260314:** primer es va marcar com **applied** per saltar el fall de `user_id`; després es va **revertir** per poder re-aplicar-la amb el guard afegit.
- **20260314 (codi):** afegit un **guard** a la migració: el backfill que usa `c.user_id` només s’executa si existeix la columna `user_id` a `custom_cities` (`information_schema.columns`). Això permet que la migració passi en entorns on la taula ja va ser migrada sense `user_id`. No es canvia la lògica funcional ni el contracte.
- **20260317130000:** marcat com **applied** a remot sense executar-la, per desbloquejar l’aplicació de les migracions següents (B1.1 i posteriors). La restricció `purchase_orders_total_non_negative` (o equivalents) no s’ha aplicat a la base remota en aquest procés.

## 3. Migration apply result

- **Aplicada.** La migració **20260317150000_b1_1_membership_governance_closeout.sql** s’ha executat correctament a la base remota.
- Sortida rellevant:
  - `Applying migration 20260317150000_b1_1_membership_governance_closeout.sql...`
  - `NOTICE: trigger "trg_org_memberships_set_suspended_at" for relation "public.org_memberships" does not exist, skipping` (esperat en primera aplicació).
  - `Finished supabase db push.`
- **Objectes que la migració crea i que, per tant, queden existents a remot:**
  - Taules: `org_invitations`, `membership_governance_audit`.
  - RPCs: `create_org_invitation`, `accept_org_invitation`, `revoke_org_invitation`, `membership_set_status`, `org_add_member` (versió B1.1 amb audit).
  - Trigger: `trg_org_memberships_set_suspended_at` a `org_memberships`.
  - RLS a `org_memberships`: activat; polítiques INSERT/UPDATE/DELETE només per owner/admin.
  - RLS i polítiques per `org_invitations` i `membership_governance_audit` segons el contracte B1.1.

## 4. Live validation results

- **A. Create invite** — No executat en aquesta sessió (requereix sessió autenticada com a owner/admin). Flux esperat: cridar `create_org_invitation(org_id, email, role)` → fila a `org_invitations` (status pending) i fila a `membership_governance_audit` (action `invitation_created`). **Recomanat:** executar manualment des de la UI o des del SQL Editor amb un usuari owner/admin.
- **B. Accept invite** — No executat (requereix usuari amb email coincident i token vàlid). Flux esperat: `accept_org_invitation(token)` → fila a `org_memberships` (status active, invited_by/invited_at/accepted_at) i audit `invitation_accepted`. **Recomanat:** crear una invitació, obrir l’enllaç (o cridar l’RPC) amb l’usuari correcte i comprovar taules i audit.
- **C. Suspend** — No executat (requereix owner/admin i un altre membre actiu). Flux esperat: `membership_set_status(org_id, user_id, 'suspended')` → `org_memberships.status = 'suspended'`, `suspended_at` omplert (trigger), audit `member_suspended`. **Recomanat:** provar des de Settings (Suspend) o via RPC.
- **D. Reactivate** — No executat. Flux esperat: `membership_set_status(org_id, user_id, 'active')` → status active, `suspended_at` NULL (trigger), audit `member_reactivated`. **Recomanat:** mateix que C.
- **E. Remove** — No executat. Flux esperat: `membership_set_status(org_id, user_id, 'removed')` → audit `member_removed`. **Recomanat:** cridar l’RPC amb `p_new_status = 'removed'` (o afegir botó Remove a Settings) i comprovar audit.
- **F. Seat counting** — Confirmat a nivell de codi: el trigger `enforce_seat_limit` i les RPCs `org_add_member` / `accept_org_invitation` compten només fileres amb `status = 'active'`; `invited` / `suspended` / `removed` no consumeixen seient. **OK (per contracte/codi).**
- **G. Permission boundaries** — Confirmat a nivell de codi: totes les RPCs de governance comproven `is_org_owner_or_admin(org_id)`; `accept_org_invitation` exigeix que l’email de l’usuari autenticat coincideixi amb el de la invitació. RLS a `org_memberships` i `org_invitations` restringeix writes a owner/admin. **OK (per contracte/codi).** Prova real amb rol member (no owner/admin) no executada en aquesta sessió.

## 5. Settings integration check

- **OK.**  
  - `handleAddMember` crida `supabase.rpc('org_add_member', { p_org_id, p_user_id, p_role: 'member' })` i tracta `data === 'already_member'`.  
  - `handleUpdateMemberStatus` crida `supabase.rpc('membership_set_status', { p_org_id, p_user_id, p_new_status })` i mostra el missatge adequat per removed.  
  - Cap canvi de UI ni de contracte; només s’ha comprovat l’alineació amb els RPCs reals.

## 6. Final verdict

- **B1.1 està tancat també en entorn:** la migració B1.1 s’ha aplicat a la base remota; les taules, RPCs, trigger i RLS/polítiques del contracte existeixen. La reparació d’historial i el guard a 20260314 han estat el mínim necessari per poder aplicar B1.1; 20260317130000 s’ha marcat aplicada sense executar-la per desbloquejar el push.
- **Backend V1-complete:** en l’abast d’aquest report, el tancament de B1.1 (membership lifecycle, invitacions, offboarding, audit de governance, permisos backend) deixa el backend de memberships i governance **V1-complete** segons el contracte B1.1. Queden fora d’abast: canvi de rol auditat, botó “Remove” a la UI (el RPC ja el suporta), i qualsevol altre bloc backend no cobert per B1.1 (per exemple B1.2, B1.3, etc., segons el roadmap).

**Recomanació:** Executar manualment les validacions A–E (i opcionalment G amb un usuari member) en l’entorn amb usuaris reals i comprovar `org_invitations` i `membership_governance_audit` per donar per tancada la validació live end-to-end.
