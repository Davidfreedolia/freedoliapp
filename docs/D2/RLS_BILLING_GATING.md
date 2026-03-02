# RLS i billing gating (FASE 2 CBA)

**Versió:** 1.0  
**Àmbit:** Polítiques RLS que condicionen l'accés a dades tenant segons l'estat de billing de l'org.

---

## 1. Context

A part de ser membre de l'org (`is_org_member(org_id)`), l'accés a les dades tenant requereix que l'org tingui billing "billable". Si l'org està en `past_due` o `canceled`, els membres no poden llegir ni modificar dades tenant, **excepte** l'owner (i admin) que poden llegir `orgs` i `org_memberships` per poder anar a billing i recuperar la subscripció.

---

## 2. Decisions tancades

| # | Decisió | Detall |
|---|---------|--------|
| 1 | **Funció booleana** | `org_billing_allows_access(p_org_id uuid)` retorna true només si `billing_status IN ('trialing', 'active')`. |
| 2 | **SELECT tenant-data** | Policy: `is_org_member(org_id) AND (org_billing_allows_access(org_id) OR is_org_owner_or_admin(org_id))` — owner pot veure encara que billing bloquejat. |
| 3 | **INSERT/UPDATE/DELETE tenant-data** | Policy: `is_org_member(org_id) AND org_billing_allows_access(org_id)` — sense excepció owner; no es poden crear/editar dades si billing no és billable. |
| 4 | **Taules orgs i org_memberships** | SELECT amb excepció owner/admin (per recuperació); la resta de policies (INSERT/UPDATE/DELETE) no donen accés a billing bloquejat. |
| 5 | **Over-seat** | No es resol a RLS. RLS no compta places; el bloqueig de nous membres es fa a RPC `org_add_member`. |

---

## 3. Contractes de dades

### 3.1 Funció `org_billing_allows_access(p_org_id uuid) RETURNS boolean`

- **Implementació:** `EXISTS (SELECT 1 FROM public.orgs o WHERE o.id = p_org_id AND o.billing_status IN ('trialing', 'active'))`.
- **Seguretat:** `SECURITY DEFINER`, `SET search_path = public`.
- **Estabilitat:** `STABLE` (resultat consistent dins la transacció).
- **Retorn:** false si org_id és NULL, org no existeix o billing_status no és trialing/active.

### 3.2 Patró de policies per taules tenant

Per cada taula tenant (projects, suppliers, purchase_orders, etc.):

- **SELECT:**  
  `USING (is_org_member(org_id) AND (org_billing_allows_access(org_id) OR is_org_owner_or_admin(org_id)))`
- **INSERT:**  
  `WITH CHECK (is_org_member(org_id) AND org_billing_allows_access(org_id))`
- **UPDATE:**  
  `USING` i `WITH CHECK` iguals que INSERT (member + billing).
- **DELETE:**  
  `USING (is_org_member(org_id) AND org_billing_allows_access(org_id))`

### 3.3 Taules amb excepció owner (SELECT)

- **orgs:** SELECT permet member si billing ok **o** si és owner/admin (per veure la org i anar a billing).
- **org_memberships:** Mateix criteri (per veure membres i gestionar-los en pantalles de recuperació).

---

## 4. Fluxos

### 4.1 Accés a dades tenant

```
Request SELECT/INSERT/UPDATE/DELETE
    |
    v
RLS: is_org_member(org_id)?
    | NO -> 0 rows / deny
    | YES
    v
Per SELECT: org_billing_allows_access(org_id) OR is_org_owner_or_admin(org_id)?
    | NO -> 0 rows (member sense billing i no owner)
    | YES -> permit
Per INSERT/UPDATE/DELETE: org_billing_allows_access(org_id)?
    | NO -> deny
    | YES -> permit
```

### 4.2 Recuperació (owner amb billing bloquejat)

1. Owner entra a l'app; RLS li permet SELECT a `orgs` i `org_memberships` (excepció).
2. UI redirigeix a `/app/billing/locked` (gate a AppContent).
3. Owner clica "Manage subscription" -> portal Stripe; paga o reactiva.
4. Webhook actualitza `billing_status` -> RLS torna a permetre tot als membres.

---

## 5. Edge cases

| Cas | Comportament |
|-----|--------------|
| Member, org past_due | SELECT a projects/suppliers/etc. -> 0 rows. No pot desbloquejar; ha de contactar l'owner. |
| Owner, org past_due | SELECT a orgs i org_memberships -> permès. SELECT a projects -> 0 rows (no excepció). INSERT project -> deny. |
| Org active | Tots els membres amb billing ok poden SELECT/INSERT/UPDATE/DELETE segons policies existents. |
| Funció org_billing_allows_access amb org_id NULL | Retorna false; policies que la criden no donen accés. |
| Taules sense org_id (health, reference) | No es toquen per billing gating; resten amb les seves policies (o revoke). |

---

## 6. Definition of Done

- [x] Funció `org_billing_allows_access` creada i estable.
- [x] Policies tenant actualitzades: SELECT amb excepció owner; INSERT/UPDATE/DELETE amb billing obligatori.
- [x] Policies a `orgs` i `org_memberships` amb excepció owner per SELECT.
- [x] Migració idempotent (DROP POLICY IF EXISTS abans de CREATE).

---

## 7. Relació amb altres documents

- **FASE2_CBA_ARCHITECTURE_FINAL** (D0): decisions RLS i excepció owner.
- **BILLING_MODEL** (D2): valors de `billing_status` i significat.
- **BILLING_GATING_UI** (D3): redirect a locked quan RLS efectivament bloqueja (frontend comprova billing_status).
